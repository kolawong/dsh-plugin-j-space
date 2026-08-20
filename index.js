import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MODES = ["on-demand", "always-on", "auto", "off"];
const VALID_MODES = new Set(MODES);

const SKILL_ENTRY = join(
  dirname(fileURLToPath(import.meta.url)),
  "skills",
  "j-space",
  "SKILL.md"
);

// Injected in "auto" mode: a lightweight router that tells the model when to
// load the full skill, without paying the full skill's context cost per turn.
const AUTO_ROUTER = [
  "# J-Space Cognitive Workspace (auto)",
  "",
  'The "j-space" skill is installed. Before acting, classify the task:',
  "- If it needs multi-step or chained reasoning, long-horizon consistency,",
  "  complex debugging, or verified completion — load the j-space skill FIRST,",
  "  then work under its protocols.",
  "- If it is a one-step task you can check at a glance — answer directly.",
  "When in doubt, load it: escalation costs nothing, staying shallow does.",
].join("\n");

export const name = "j-space";
export const inject = ["webServer"];

/**
 * Resolve DSH home directory with cross-platform standard precedence:
 * 1. $JSPACE_SETTINGS_FILE (test override)
 * 2. $DSH_HOME (normalizing ~, ~/, ~\, and custom paths)
 * 3. ~/.dsh (default home on Linux, macOS, and Windows)
 */
function resolveDshHome() {
  const env = process.env.DSH_HOME;
  if (env !== undefined && env.trim().length > 0) {
    const p = env.trim();
    if (p === "~") return homedir();
    if (p.startsWith("~/") || p.startsWith("~\\")) {
      return join(homedir(), p.slice(2));
    }
    return resolve(p);
  }
  return join(homedir(), ".dsh");
}

function resolveSettingsFile() {
  if (process.env.JSPACE_SETTINGS_FILE) {
    return process.env.JSPACE_SETTINGS_FILE;
  }
  return join(resolveDshHome(), "settings.yaml");
}

function getMode() {
  try {
    const settingsPath = resolveSettingsFile();
    if (existsSync(settingsPath)) {
      const content = readFileSync(settingsPath, "utf8");
      const match = content.match(/(?:^|\n)\s*j-space:\s*\n(?:\s*#[^\n]*\n)*\s*mode:\s*([^\s\n#]+)/);
      if (match) {
        const raw = match[1].replace(/['"]/g, "").trim();
        if (VALID_MODES.has(raw)) return raw;
      }
    }
  } catch {}
  return "on-demand";
}

function setMode(mode) {
  if (!VALID_MODES.has(mode)) {
    throw new Error(`Invalid mode "${mode}". Expected one of: ${MODES.join(", ")}`);
  }
  try {
    const settingsPath = resolveSettingsFile();
    const settingsDir = dirname(settingsPath);
    if (!existsSync(settingsDir)) {
      mkdirSync(settingsDir, { recursive: true });
    }

    let content = existsSync(settingsPath) ? readFileSync(settingsPath, "utf8") : "";
    const blockRegex = /(?:^|\n)(\s*j-space:\s*\n(?:\s*#[^\n]*\n)*\s*mode:\s*)[^\s\n#]+/;

    if (blockRegex.test(content)) {
      content = content.replace(blockRegex, (match, prefix) => {
        return match.startsWith("\n") ? `\n${prefix}${mode}` : `${prefix}${mode}`;
      });
    } else if (/(?:^|\n)\s*j-space:\s*(?:\n|$)/.test(content)) {
      content = content.replace(/((?:^|\n)\s*j-space:\s*)/, `$1\n  mode: ${mode}`);
    } else {
      content = content.trimEnd();
      content += (content.length > 0 ? "\n\n" : "") + `j-space:\n  mode: ${mode}\n`;
    }

    writeFileSync(settingsPath, content, "utf8");
    return true;
  } catch (err) {
    console.error("[J-Space] Failed to save mode:", err);
    return false;
  }
}

// Read the skill entry body (frontmatter stripped), cached by mtime so each
// prompt assembly does not re-parse the file unless it changed on disk.
let skillCache = { mtimeMs: -1, text: "" };
function loadSkillBody() {
  try {
    const { mtimeMs } = statSync(SKILL_ENTRY);
    if (mtimeMs !== skillCache.mtimeMs) {
      const raw = readFileSync(SKILL_ENTRY, "utf8");
      const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
      skillCache = { mtimeMs, text: body };
    }
    return skillCache.text;
  } catch {
    return "";
  }
}

// The text actually injected into the system prompt, decided per assembly so
// a mode change via POST /api/jspace.config takes effect without a restart.
// Empty text is dropped by the prompt renderer, so inactive modes inject nothing.
function promptSectionText() {
  const mode = getMode();
  if (mode === "always-on") {
    const body = loadSkillBody();
    return body ? `# J-Space Cognitive Workspace (always-on)\n\n${body}` : "";
  }
  if (mode === "auto") return AUTO_ROUTER;
  return ""; // on-demand / off: the skill catalog handles discovery
}

export function apply(ctx, config) {
  ctx.inject(["settings"], (sctx) => {
    try {
      import("@deepseek-ai/schemastery")
        .then(({ default: Schema }) => {
          sctx.settings.register(
            "j-space",
            Schema.object({
              mode: Schema.union(MODES).default("on-demand"),
            })
          );
        })
        .catch(() => {});
    } catch (e) {
      ctx.logger?.warn?.("[J-Space] Settings registration:", e);
    }
  });

  // The actual context injection: register a system-prompt section whose text
  // is evaluated at every model-step assembly against the current mode.
  ctx.inject(["systemPrompt"], (pctx) => {
    try {
      pctx.systemPrompt.section({
        name: "j-space:workspace",
        order: 50, // after harness identity (-100) and persona (0), before tool guidance
        text: promptSectionText,
      });
      pctx.logger?.info?.("[J-Space] systemPrompt section registered (mode-driven)");
    } catch (e) {
      ctx.logger?.warn?.("[J-Space] systemPrompt registration:", e);
    }
  });

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
          req.on("data", (c) => {
            body += c;
            if (body.length > 64 * 1024) {
              req.destroy();
            }
          });
          req.on("end", () => {
            try {
              const data = JSON.parse(body || "{}");
              const mode = data.mode;
              if (typeof mode !== "string" || !VALID_MODES.has(mode)) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: `invalid mode "${mode}"; expected one of ${MODES.join(", ")}`,
                  })
                );
                return;
              }
              const saved = setMode(mode);
              if (!saved) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: false, error: "Failed to persist settings" }));
                return;
              }
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
      },
    });
  }
}
