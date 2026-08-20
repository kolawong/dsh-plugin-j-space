import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const MODES = new Set(["on-demand", "always-on", "auto", "off"]);
const MAX_BODY_BYTES = 8 * 1024;
const TOP_LEVEL_KEY = /^(?:j-space|"j-space"|'j-space'):[ \t]*(?:#.*)?$/;
const MODE_KEY = /^(?:mode|"mode"|'mode'):[ \t]*(.*)$/;

function getSettingsFile() {
  const configuredHome = process.env.DSH_HOME?.trim();
  const dshHome = configuredHome ? resolve(configuredHome) : join(homedir(), ".dsh");
  return join(dshHome, "settings.yaml");
}

function splitLines(content) {
  return content.match(/[^\r\n]*(?:\r\n|\n|$)/g)?.filter(Boolean) ?? [];
}

function withoutLineEnding(line) {
  return line.replace(/\r?\n$/, "");
}

function lineEnding(line, fallback) {
  return line.endsWith("\r\n") ? "\r\n" : line.endsWith("\n") ? "\n" : fallback;
}

function findJSpaceBlock(lines) {
  const start = lines.findIndex((line) => TOP_LEVEL_KEY.test(withoutLineEnding(line)));
  if (start === -1) return null;

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const text = withoutLineEnding(lines[index]);
    if (text && !/^[ \t]/.test(text) && !/^#/.test(text)) {
      end = index;
      break;
    }
  }
  return { start, end };
}

function parseModeScalar(value) {
  const match = value.match(/^(?:"([^"]*)"|'([^']*)'|([^\s#]+))(?:[ \t]+#.*|[ \t]*)$/);
  if (!match) return null;
  const mode = match[1] ?? match[2] ?? match[3];
  return MODES.has(mode) ? mode : null;
}

function resolveSettingsTarget(settingsFile) {
  let entry;
  try {
    entry = lstatSync(settingsFile);
  } catch (err) {
    if (err?.code === "ENOENT") return settingsFile;
    throw err;
  }

  if (!entry.isSymbolicLink()) return settingsFile;
  try {
    return realpathSync(settingsFile);
  } catch (err) {
    if (err?.code !== "ENOENT") throw err;
    return resolveSettingsTarget(resolve(dirname(settingsFile), readlinkSync(settingsFile)));
  }
}

function findModeLine(lines, block) {
  const directIndentationLength = lines
    .slice(block.start + 1, block.end)
    .map(withoutLineEnding)
    .filter((line) => /^[ \t]+\S/.test(line) && !/^[ \t]+#/.test(line))
    .reduce((minimum, line) => Math.min(minimum, line.match(/^([ \t]+)/)[1].length), Infinity);

  for (let index = block.start + 1; index < block.end; index += 1) {
    const text = withoutLineEnding(lines[index]);
    const indentation = text.match(/^([ \t]+)/)?.[1];
    if (!indentation || indentation.length !== directIndentationLength) continue;
    const match = text.slice(indentation.length).match(MODE_KEY);
    if (match) return { index, indentation, value: match[1] };
  }
  return null;
}

function updateMode(content, mode) {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = splitLines(content);
  const block = findJSpaceBlock(lines);

  if (!block) {
    const separator = content && !/\r?\n$/.test(content) ? eol : "";
    return `${content}${separator}j-space:${eol}  mode: ${mode}${eol}`;
  }

  const modeLine = findModeLine(lines, block);
  if (modeLine) {
    lines[modeLine.index] = `${modeLine.indentation}mode: ${mode}${lineEnding(lines[modeLine.index], eol)}`;
    return lines.join("");
  }

  const firstChild = lines
    .slice(block.start + 1, block.end)
    .map(withoutLineEnding)
    .find((line) => /^[ \t]+\S/.test(line));
  const indentation = firstChild?.match(/^([ \t]+)/)?.[1] ?? "  ";
  if (!/\r?\n$/.test(lines[block.start])) lines[block.start] += eol;
  lines.splice(block.start + 1, 0, `${indentation}mode: ${mode}${eol}`);
  return lines.join("");
}

function writeAtomically(settingsFile, content) {
  const directory = dirname(settingsFile);
  mkdirSync(directory, { recursive: true });
  const temporaryFile = join(directory, `.${basename(settingsFile)}.${process.pid}.${randomUUID()}.tmp`);
  const mode = existsSync(settingsFile) ? statSync(settingsFile).mode & 0o777 : 0o600;
  let descriptor;

  try {
    descriptor = openSync(temporaryFile, "wx", mode);
    writeFileSync(descriptor, content, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporaryFile, settingsFile);
  } catch (err) {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch (closeError) {
        console.error("[J-Space] Failed to close temporary settings file:", closeError);
      }
    }
    try {
      unlinkSync(temporaryFile);
    } catch (unlinkError) {
      if (existsSync(temporaryFile)) {
        console.error("[J-Space] Failed to remove temporary settings file:", unlinkError);
      }
    }
    throw err;
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function isLoopback(address) {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function isLocalHost(host) {
  const match = host.match(/^(?:localhost|127\.0\.0\.1|\[::1\])(?::([0-9]{1,5}))?$/i);
  if (!match) return false;
  return match[1] === undefined || Number(match[1]) <= 65535;
}

function isAllowedRequest(req) {
  if (!isLoopback(req.socket?.remoteAddress)) return false;
  const host = req.headers?.host;
  if (!host || !isLocalHost(host)) return false;
  const origin = req.headers?.origin;
  if (!origin) return true;

  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

export const name = "j-space";
export const inject = ["webServer"];

function getMode() {
  try {
    const settingsFile = resolveSettingsTarget(getSettingsFile());
    if (existsSync(settingsFile)) {
      const content = readFileSync(settingsFile, "utf8");
      const lines = splitLines(content);
      const block = findJSpaceBlock(lines);
      const modeLine = block && findModeLine(lines, block);
      const mode = modeLine && parseModeScalar(modeLine.value);
      if (mode) return mode;
    }
  } catch (err) {
    console.error("[J-Space] Failed to read mode:", err);
  }
  return "on-demand";
}

function setMode(mode) {
  if (!MODES.has(mode)) return false;

  try {
    const settingsFile = resolveSettingsTarget(getSettingsFile());
    let content = existsSync(settingsFile) ? readFileSync(settingsFile, "utf8") : "";
    content = updateMode(content, mode);
    writeAtomically(settingsFile, content);
    return true;
  } catch (err) {
    console.error("[J-Space] Failed to save mode:", err);
    return false;
  }
}

export function apply(ctx, config) {
  ctx.logger?.info?.(`[J-Space] J-Space Cognition Suite V3.6 loaded (mode: ${config?.mode || getMode()})`);

  if (ctx.webServer) {
    ctx.webServer.register({
      kind: "exact",
      path: "/api/jspace.config",
      handler: async (req, res) => {
        if (!isAllowedRequest(req)) {
          sendJson(res, 403, { ok: false, error: "Local same-origin access only" });
          return;
        }
        if (req.method === "GET") {
          const mode = getMode();
          sendJson(res, 200, { ok: true, mode });
          return;
        }
        if (req.method === "POST") {
          const chunks = [];
          let receivedBytes = 0;
          let settled = false;

          const cleanup = () => {
            req.removeListener("data", onData);
            req.removeListener("end", onEnd);
            req.removeListener("error", onError);
            req.removeListener("aborted", onAborted);
          };
          const finish = (status, payload) => {
            if (settled) return;
            settled = true;
            cleanup();
            if (!res.destroyed && !res.writableEnded) sendJson(res, status, payload);
          };
          const onData = (chunk) => {
            if (settled) return;
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            receivedBytes += buffer.length;
            if (receivedBytes > MAX_BODY_BYTES) {
              finish(413, { ok: false, error: "Request body too large" });
              req.once("error", () => {});
              req.resume?.();
              return;
            }
            chunks.push(buffer);
          };
          const onEnd = () => {
            if (settled) return;
            try {
              const body = Buffer.concat(chunks).toString("utf8");
              const data = JSON.parse(body || "{}");
              const mode = data.mode;
              if (typeof mode !== "string" || !MODES.has(mode)) {
                finish(400, { ok: false, error: "Invalid mode" });
                return;
              }
              if (!setMode(mode)) {
                finish(500, { ok: false, error: "Failed to save mode" });
                return;
              }
              finish(200, { ok: true, mode });
            } catch {
              finish(400, { ok: false, error: "Invalid JSON" });
            }
          };
          const onError = () => {
            finish(400, { ok: false, error: "Request stream error" });
          };
          const onAborted = () => {
            if (settled) return;
            settled = true;
            req.removeListener("data", onData);
            req.removeListener("end", onEnd);
            req.removeListener("aborted", onAborted);
          };

          req.on("data", onData);
          req.once("end", onEnd);
          req.once("error", onError);
          req.once("aborted", onAborted);
          return;
        }
        sendJson(res, 405, { ok: false, error: "Method not allowed" });
      }
    });
  }
}
