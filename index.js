import { readFileSync, writeFileSync, existsSync } from "node:fs";

const SETTINGS_FILE = "/root/.dsh/settings.yaml";

export const name = "j-space";
export const inject = ["webServer"];

function getMode() {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const content = readFileSync(SETTINGS_FILE, "utf8");
      const match = content.match(/j-space:\s*\n\s*mode:\s*([^\s\n]+)/);
      if (match) return match[1].replace(/['"]/g, "");
    }
  } catch {}
  return "on-demand";
}

function setMode(mode) {
  try {
    let content = existsSync(SETTINGS_FILE) ? readFileSync(SETTINGS_FILE, "utf8") : "";
    if (/j-space:\s*\n\s*mode:/.test(content)) {
      content = content.replace(/(j-space:\s*\n\s*mode:\s*)([^\s\n]+)/, `$1${mode}`);
    } else {
      content += `\nj-space:\n  mode: ${mode}\n`;
    }
    writeFileSync(SETTINGS_FILE, content, "utf8");
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
        if (req.method === "GET") {
          const mode = getMode();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, mode }));
          return;
        }
        if (req.method === "POST") {
          let body = "";
          req.on("data", (c) => { body += c; });
          req.on("end", () => {
            try {
              const data = JSON.parse(body || "{}");
              const mode = data.mode || "on-demand";
              setMode(mode);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ ok: true, mode }));
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ ok: false, error: err.message }));
            }
          });
          return;
        }
        res.writeHead(405, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
      }
    });
  }
}
