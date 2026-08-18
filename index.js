import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import Schema from "@deepseek-ai/schemastery";

const SETTINGS_FILE = "/root/.dsh/settings.yaml";

export const name = "j-space";
export const inject = ["webServer"];

export const Config = Schema.object({
  mode: Schema.union(["on-demand", "always-on", "auto", "off"]).default("on-demand").description("J-Space 认知控制激活模式"),
});

function getMode() {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const doc = yaml.load(readFileSync(SETTINGS_FILE, "utf8")) || {};
      return doc["j-space"]?.mode || "on-demand";
    }
  } catch {}
  return "on-demand";
}

function setMode(mode) {
  try {
    let doc = {};
    if (existsSync(SETTINGS_FILE)) {
      doc = yaml.load(readFileSync(SETTINGS_FILE, "utf8")) || {};
    }
    if (!doc["j-space"]) doc["j-space"] = {};
    doc["j-space"].mode = mode;
    writeFileSync(SETTINGS_FILE, yaml.dump(doc), "utf8");
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
