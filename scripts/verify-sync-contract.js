#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const syncHandler = require(path.join(repoRoot, "api", "sync.js"));
const internals = syncHandler._internals;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeReq({ method = "GET", url = "/api/sync?owner=rony", headers = {}, body = "" } = {}) {
  const listeners = {};
  return {
    method,
    url,
    headers: { host: "dieta-rony.vercel.app", ...headers },
    on(event, cb) {
      listeners[event] = cb;
      if (event === "data" && body) setImmediate(() => cb(Buffer.from(body)));
      if (event === "end") setImmediate(cb);
      return this;
    },
    destroy() {}
  };
}

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    end(body = "") {
      this.body = String(body);
      this.finished = true;
    }
  };
}

async function callHandler(reqOptions) {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL;
  delete process.env.NEON_DATABASE_URL;
  const req = makeReq(reqOptions);
  const res = makeRes();
  await syncHandler(req, res);
  if (previous !== undefined) process.env.DATABASE_URL = previous;
  return {
    status: res.statusCode,
    headers: res.headers,
    json: JSON.parse(res.body || "{}")
  };
}

async function main() {
  const noDb = await callHandler();
  assert(noDb.status === 200, "GET sin DATABASE_URL debe responder 200 para no romper deploy.");
  assert(noDb.json.ok === true && noDb.json.configured === false, "GET sin DATABASE_URL debe indicar configured:false.");
  assert(noDb.headers["cache-control"] === "no-store", "La API debe responder no-store.");

  const blockedOrigin = await callHandler({
    method: "GET",
    headers: { origin: "https://evil.example" }
  });
  assert(blockedOrigin.status === 403, "La API debe bloquear Origin cruzado de navegador.");

  assert(internals.parseRequestBody("") && typeof internals.parseRequestBody("") === "object", "Body vacio debe parsear a objeto.");
  let invalidJsonFailed = false;
  try {
    internals.parseRequestBody("{bad");
  } catch (error) {
    invalidJsonFailed = error.message === "invalid_json" && error.statusCode === 400;
  }
  assert(invalidJsonFailed, "JSON invalido debe fallar como invalid_json.");

  const validState = internals.normalizeState({
    "rony-dieta-water": { date: "2026-06-24", count: 6 },
    "rony-dieta-shopping-panel": "open",
    "rony-dieta-plan-week": "2:2026-06-22",
    "rony-dieta-shopping": ["pollo", "papa"],
    "not-allowed": "x"
  });
  assert(Object.keys(validState).length === 4, "normalizeState debe aceptar solo claves validas.");
  assert(!("not-allowed" in validState), "normalizeState no debe aceptar claves desconocidas.");

  const invalidState = internals.normalizeState({
    "rony-dieta-water": { date: "bad", count: 999 },
    "rony-dieta-shopping-panel": "half-open",
    "rony-dieta-plan-week": "semana vieja",
    "rony-dieta-weight": [{ date: "2026-06-24", weight: 900 }]
  });
  assert(Object.keys(invalidState).length === 0, "normalizeState debe descartar shapes invalidos.");

  const sw = fs.readFileSync(path.join(repoRoot, "sw.js"), "utf8");
  assert(/url\.pathname\.startsWith\("\/api\/"\)/.test(sw), "El SW debe excluir /api/ del cache.");
  assert(/wantsNoStore/.test(sw), "El SW debe respetar requests no-store/reload.");

  const app = fs.readFileSync(path.join(repoRoot, "script.js"), "utf8");
  assert(/!response\.ok \|\| data\.ok === false/.test(app), "El cliente debe tratar errores HTTP de sync como errores reales.");
  assert(/CLOUD_SYNC_KEEPALIVE_LIMIT_BYTES/.test(app), "El cliente debe limitar payload keepalive.");
  assert(/updateCloudSyncStatus/.test(app), "La app debe exponer estado de sync cloud al usuario.");
  assert(/function\s+pullCloudSync\s*\(/.test(app), "La app debe traer cambios desde Neon sin recargar.");
  assert(/requestCloudPull\("visible"/.test(app), "La app debe hacer pull al volver de background.");
  assert(/requestCloudPull\("focus"/.test(app), "La app debe hacer pull al recuperar foco.");
  assert(/CLOUD_SYNC_FOREGROUND_PULL_INTERVAL_MS/.test(app), "La app debe tener polling foreground para sync entre dispositivos abiertos.");
  assert(/updatedAt:\s*new Date\(\)\.toISOString\(\)/.test(app), "Las marcas de comidas deben tener timestamp para resolver conflictos entre dispositivos.");

  console.log("SYNC CONTRACT OK");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
