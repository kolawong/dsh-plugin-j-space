import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, test } from "node:test";

const originalDshHome = process.env.DSH_HOME;
const dshHome = mkdtempSync(join(tmpdir(), "j-space-test-"));
const settingsFile = join(dshHome, "settings.yaml");
let handler;

before(async () => {
  process.env.DSH_HOME = dshHome;
  const { apply } = await import("../index.js");
  apply({
    logger: { info() {} },
    webServer: {
      register(route) {
        handler = route.handler;
      },
    },
  });
});

after(() => {
  if (originalDshHome === undefined) delete process.env.DSH_HOME;
  else process.env.DSH_HOME = originalDshHome;
  rmSync(dshHome, { recursive: true, force: true });
});

beforeEach(() => {
  for (const entry of readdirSync(dshHome)) {
    rmSync(join(dshHome, entry), { force: true, recursive: true });
  }
});

function requestRaw(method, body, requestOptions = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.headers = requestOptions.headers ?? { host: "127.0.0.1:3000" };
  req.socket = { remoteAddress: requestOptions.remoteAddress ?? "127.0.0.1" };
  req.resume = () => {};

  return new Promise((resolve) => {
    const response = { status: 0, headers: {}, body: "" };
    const res = {
      writeHead(status, headers) {
        response.status = status;
        response.headers = headers;
      },
      end(body = "") {
        response.body = body;
        res.writableEnded = true;
        resolve(response);
      },
      destroyed: false,
      writableEnded: false,
    };

    handler(req, res);
    if (body !== undefined) req.emit("data", Buffer.from(body));
    req.emit("end");
  });
}

function request(method, payload) {
  return requestRaw(method, payload === undefined ? undefined : JSON.stringify(payload));
}

test("stores and reads a valid mode under DSH_HOME", async () => {
  const post = await request("POST", { mode: "always-on" });

  assert.equal(post.status, 200);
  assert.equal(existsSync(settingsFile), true);
  assert.match(readFileSync(settingsFile, "utf8"), /mode: always-on/);

  const get = await request("GET");
  assert.equal(get.status, 200);
  assert.deepEqual(JSON.parse(get.body), { ok: true, mode: "always-on" });
});

test("rejects values that could inject YAML", async () => {
  writeFileSync(settingsFile, "j-space:\n  mode: always-on\n", "utf8");
  const beforeContent = readFileSync(settingsFile, "utf8");
  const response = await request("POST", { mode: "off\nmalicious: true" });

  assert.equal(response.status, 400);
  assert.deepEqual(JSON.parse(response.body), { ok: false, error: "Invalid mode" });
  assert.equal(readFileSync(settingsFile, "utf8"), beforeContent);
});

test("rejects a missing mode instead of silently changing it", async () => {
  writeFileSync(settingsFile, "j-space:\n  mode: always-on\n", "utf8");
  const response = await request("POST", {});

  assert.equal(response.status, 400);
  assert.equal(readFileSync(settingsFile, "utf8").includes("always-on"), true);
});

test("updates only the direct mode in an existing top-level block", async () => {
  writeFileSync(
    settingsFile,
    [
      "other:",
      "  j-space:",
      "    mode: nested",
      "j-space:",
      "  metadata:",
      "    mode: nested-child",
      "  enabled: true",
      "  # keep this setting",
      "  mode: auto # previous value",
      "tail: true",
      "",
    ].join("\n"),
    "utf8",
  );

  const response = await request("POST", { mode: "off" });
  const content = readFileSync(settingsFile, "utf8");

  assert.equal(response.status, 200);
  assert.equal(content.match(/^j-space:/gm)?.length, 1);
  assert.match(content, /    mode: nested-child/);
  assert.match(content, /  enabled: true/);
  assert.match(content, /  mode: off/);
  assert.match(content, /tail: true/);
});

test("inserts mode into a CRLF block without adding a duplicate key", async () => {
  writeFileSync(settingsFile, "alpha: 1\r\nj-space:\r\n  enabled: true\r\nomega: 2\r\n", "utf8");

  const response = await request("POST", { mode: "auto" });
  const content = readFileSync(settingsFile, "utf8");

  assert.equal(response.status, 200);
  assert.equal(content.match(/^j-space:/gm)?.length, 1);
  assert.match(content, /j-space:\r\n  mode: auto\r\n  enabled: true/);
  assert.equal(/(?<!\r)\n/.test(content), false);
});

test("does not normalize embedded quotes into an allowed persisted mode", async () => {
  writeFileSync(settingsFile, "j-space:\n  mode: o\"ff\n", "utf8");

  const response = await request("GET");

  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), { ok: true, mode: "on-demand" });
});

test("does not treat an attached hash as a YAML comment", async () => {
  writeFileSync(settingsFile, "j-space:\n  mode: off#suffix\n", "utf8");

  const response = await request("GET");

  assert.deepEqual(JSON.parse(response.body), { ok: true, mode: "on-demand" });
});

test("updates a symlink target without replacing the link", { skip: process.platform === "win32" }, async () => {
  const target = join(dshHome, "actual-settings.yaml");
  writeFileSync(target, "j-space:\n  mode: auto\n", "utf8");
  symlinkSync(target, settingsFile);

  const response = await request("POST", { mode: "off" });

  assert.equal(response.status, 200);
  assert.equal(lstatSync(settingsFile).isSymbolicLink(), true);
  assert.match(readFileSync(target, "utf8"), /mode: off/);
});

test("creates a dangling symlink target without replacing the link", { skip: process.platform === "win32" }, async () => {
  const target = join(dshHome, "missing", "actual-settings.yaml");
  symlinkSync(target, settingsFile);

  const response = await request("POST", { mode: "off" });

  assert.equal(response.status, 200);
  assert.equal(lstatSync(settingsFile).isSymbolicLink(), true);
  assert.match(readFileSync(target, "utf8"), /mode: off/);
});

test("rejects oversized request bodies and leaves no settings artifacts", async () => {
  const response = await requestRaw("POST", "x".repeat(8 * 1024 + 1));

  assert.equal(response.status, 413);
  assert.deepEqual(JSON.parse(response.body), { ok: false, error: "Request body too large" });
  assert.deepEqual(readdirSync(dshHome), []);
});

test("absorbs stream errors while draining an oversized request", async () => {
  const req = new EventEmitter();
  req.method = "POST";
  req.headers = { host: "127.0.0.1:3000" };
  req.socket = { remoteAddress: "127.0.0.1" };
  req.resume = () => req.emit("error", new Error("reset while draining"));

  const response = await new Promise((resolve) => {
    const res = {
      destroyed: false,
      writableEnded: false,
      writeHead(status) {
        this.status = status;
      },
      end(body) {
        this.writableEnded = true;
        resolve({ status: this.status, body });
      },
    };
    handler(req, res);
    req.emit("data", Buffer.alloc(8 * 1024 + 1));
  });

  assert.equal(response.status, 413);
});

test("handles request stream errors without writing settings", async () => {
  const req = new EventEmitter();
  req.method = "POST";
  req.headers = { host: "127.0.0.1:3000" };
  req.socket = { remoteAddress: "127.0.0.1" };

  const response = await new Promise((resolve) => {
    const res = {
      destroyed: false,
      writableEnded: false,
      writeHead(status) {
        this.status = status;
      },
      end(body) {
        this.writableEnded = true;
        resolve({ status: this.status, body });
      },
    };
    handler(req, res);
    req.emit("error", new Error("connection reset"));
  });

  assert.equal(response.status, 400);
  assert.equal(existsSync(settingsFile), false);
});

test("rejects remote and cross-origin requests", async () => {
  const remote = await requestRaw("GET", undefined, { remoteAddress: "192.168.1.10" });
  const crossOrigin = await requestRaw("GET", undefined, {
    headers: { host: "127.0.0.1:3000", origin: "https://example.com" },
  });
  const rebound = await requestRaw("GET", undefined, {
    headers: { host: "attacker.example:3000", origin: "http://attacker.example:3000" },
  });
  const disguisedLocalhost = await requestRaw("GET", undefined, {
    headers: { host: "evil@localhost" },
  });
  const abbreviatedLoopback = await requestRaw("GET", undefined, {
    headers: { host: "127.1" },
  });

  assert.equal(remote.status, 403);
  assert.equal(crossOrigin.status, 403);
  assert.equal(rebound.status, 403);
  assert.equal(disguisedLocalhost.status, 403);
  assert.equal(abbreviatedLoopback.status, 403);
});
