#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const syncHandler = require(path.join(repoRoot, "api", "sync.js"));
const weeklyRefreshHandler = require(path.join(repoRoot, "api", "weekly-refresh.js"));
const internals = syncHandler._internals;
const weeklyInternals = weeklyRefreshHandler._internals;

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

async function callWeeklyRefreshHandler(reqOptions = {}, env = {}) {
  const previous = {
    DATABASE_URL: process.env.DATABASE_URL,
    POSTGRES_URL: process.env.POSTGRES_URL,
    NEON_DATABASE_URL: process.env.NEON_DATABASE_URL,
    CRON_SECRET: process.env.CRON_SECRET
  };

  delete process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL;
  delete process.env.NEON_DATABASE_URL;
  if (Object.prototype.hasOwnProperty.call(env, "CRON_SECRET")) {
    if (env.CRON_SECRET) process.env.CRON_SECRET = env.CRON_SECRET;
    else delete process.env.CRON_SECRET;
  }

  const req = makeReq({ url: "/api/weekly-refresh?owner=rony", ...reqOptions });
  const res = makeRes();
  await weeklyRefreshHandler(req, res);

  ["DATABASE_URL", "POSTGRES_URL", "NEON_DATABASE_URL", "CRON_SECRET"].forEach((key) => {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  });

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

  const weeklyNoDbOpen = await callWeeklyRefreshHandler({}, { CRON_SECRET: "" });
  assert(weeklyNoDbOpen.status === 200, "weekly-refresh sin DATABASE_URL debe responder 200 si no hay CRON_SECRET.");
  assert(weeklyNoDbOpen.json.ok === true && weeklyNoDbOpen.json.configured === false, "weekly-refresh sin DB debe indicar configured:false.");

  const weeklyBlocked = await callWeeklyRefreshHandler({}, { CRON_SECRET: "test-secret" });
  assert(weeklyBlocked.status === 401, "weekly-refresh debe bloquear si CRON_SECRET existe y falta Authorization.");

  const weeklyAuthorized = await callWeeklyRefreshHandler({
    headers: { authorization: "Bearer test-secret" }
  }, { CRON_SECRET: "test-secret" });
  assert(weeklyAuthorized.status === 200, "weekly-refresh debe aceptar Authorization Bearer correcto.");

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
    "rony-dieta-weight": [{ date: "2026-07-14", kg: 78.6 }],
    "rony-dieta-checkins": {
      "2026-07-13": {
        weekStart: "2026-07-13",
        date: "2026-07-14",
        updatedAt: "2026-07-14T15:00:00.000Z",
        energy: 4,
        hunger: 2,
        performance: 4,
        recovery: 3,
        adherence: 5,
        note: "Semana buena"
      }
    },
    "not-allowed": "x"
  });
  assert(Object.keys(validState).length === 5, "normalizeState debe aceptar solo claves validas de cliente.");
  assert(validState["rony-dieta-weight"][0].kg === 78.6, "normalizeState debe aceptar el formato real de peso con kg.");
  assert(validState["rony-dieta-checkins"]["2026-07-13"].performance === 4, "normalizeState debe aceptar check-in semanal valido.");
  assert(!("not-allowed" in validState), "normalizeState no debe aceptar claves desconocidas.");
  assert(!("rony-dieta-plan-week" in validState), "planWeek debe ser propiedad del servidor, no del cliente.");

  const invalidState = internals.normalizeState({
    "rony-dieta-water": { date: "bad", count: 999 },
    "rony-dieta-shopping-panel": "half-open",
    "rony-dieta-plan-week": "semana vieja",
    "rony-dieta-weight": [{ date: "2026-06-24", weight: 900 }],
    "rony-dieta-checkins": {
      "2026-07-13": {
        weekStart: "2026-07-13",
        date: "2026-07-14",
        updatedAt: "bad",
        energy: 9,
        hunger: 2,
        performance: 4,
        recovery: 3,
        adherence: 5
      }
    }
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
  assert(/CLOUD_SYNC_PUSH_KEYS\s*=\s*CLOUD_SYNC_KEYS\.filter\(\(key\)\s*=>\s*key\s*!==\s*STORAGE\.planWeek\)/.test(app), "El cliente no debe pushear planWeek a Neon.");
  assert(/key === STORAGE\.planWeek/.test(app), "El cliente debe aceptar planWeek server-owned al hacer pull.");
  assert(/requestCloudPull\("visible"/.test(app), "La app debe hacer pull al volver de background.");
  assert(/requestCloudPull\("focus"/.test(app), "La app debe hacer pull al recuperar foco.");
  assert(/CLOUD_SYNC_FOREGROUND_PULL_INTERVAL_MS/.test(app), "La app debe tener polling foreground para sync entre dispositivos abiertos.");
  assert(/updatedAt:\s*new Date\(\)\.toISOString\(\)/.test(app), "Las marcas de comidas deben tener timestamp para resolver conflictos entre dispositivos.");

  assert(weeklyInternals.getPlanWeekStartKey("2026-07-14") === "2026-07-13", "weekly-refresh debe calcular lunes real en America/Buenos_Aires.");
  assert(weeklyInternals.getWeekIndex("2026-07-14") === 1, "weekly-refresh debe coincidir con el indice de semana del cliente para 2026-07-14.");
  assert(internals.getCurrentServerPlanWeek(new Date("2026-07-14T15:00:00Z")).planWeek === "1:2026-07-13", "sync debe calcular planWeek server-owned igual que weekly-refresh.");
  const vercel = fs.readFileSync(path.join(repoRoot, "vercel.json"), "utf8");
  assert(/"path"\s*:\s*"\/api\/weekly-refresh\?owner=rony"/.test(vercel), "Vercel Cron debe llamar weekly-refresh para mantener Neon actualizado.");
  assert(/"schedule"\s*:\s*"0 8 \* \* \*"/.test(vercel), "Vercel Cron debe correr diariamente a primera hora UTC.");

  console.log("SYNC CONTRACT OK");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
