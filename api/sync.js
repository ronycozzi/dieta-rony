"use strict";

const OWNER_DEFAULT = "rony";
const MAX_BODY_BYTES = 750_000;
const PLAN_WEEK_KEY = "rony-dieta-plan-week";
const APP_BUILD = "2026-07-14-fuel-console";
const MENU_ROTATION_CORRECTION_START = "2026-06-15";
const MENU_ROTATION_CORRECTION_OFFSET = 1;
const TZ = "America/Argentina/Buenos_Aires";
const ALLOWED_KEYS = new Set([
  "rony-dieta-meals",
  "rony-dieta-water",
  "rony-dieta-shopping",
  "rony-dieta-shopping-panel",
  "rony-dieta-streak",
  "rony-dieta-weight",
  "rony-dieta-friday-mode",
  "weight-seeded"
]);

let sqlClientPromise;
let schemaReadyPromise;

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(payload));
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || "";
}

async function getSqlClient() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;
  if (!sqlClientPromise) {
    sqlClientPromise = import("@neondatabase/serverless").then(({ neon }) => neon(databaseUrl));
  }
  return sqlClientPromise;
}

async function ensureSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS rony_dieta_sync (
      owner_id text NOT NULL,
      key text NOT NULL,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (owner_id, key)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS rony_dieta_menu_history (
      owner_id text NOT NULL,
      week_start date NOT NULL,
      week_index integer NOT NULL,
      week_name text NOT NULL,
      menu_signature text,
      app_build text,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (owner_id, week_start)
    )
  `;
}

async function ensureSchemaOnce(sql) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = ensureSchema(sql).catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }
  return schemaReadyPromise;
}

function sanitizeOwner(value) {
  const owner = String(value || OWNER_DEFAULT).trim().toLowerCase();
  return /^[a-z0-9_-]{1,40}$/.test(owner) ? owner : OWNER_DEFAULT;
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  return origin === `https://${host}` || origin === `http://${host}`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > MAX_BODY_BYTES) {
        reject(new Error("payload_too_large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

function parseRequestBody(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("invalid_json");
    error.statusCode = 400;
    throw error;
  }
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function getBuenosAiresDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function addDays(dateKey, days) {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function getPlanWeekStartKey(dateKey) {
  const d = new Date(`${dateKey}T12:00:00Z`);
  const dayNumber = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  return addDays(dateKey, -(dayNumber - 1));
}

function getISOWeekNumberFromDateKey(dateKey) {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const week1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getUTCDay() + 6) % 7)) / 7);
}

function getWeekIndex(dateKey) {
  const weekStart = getPlanWeekStartKey(dateKey);
  const baseIndex = (getISOWeekNumberFromDateKey(dateKey) - 1) % 4;
  const correction = weekStart >= MENU_ROTATION_CORRECTION_START ? MENU_ROTATION_CORRECTION_OFFSET : 0;
  return (baseIndex + correction + 4) % 4;
}

function getWeekLabel(weekStart) {
  const date = new Date(`${weekStart}T12:00:00Z`);
  const label = date.toLocaleDateString("es-AR", { timeZone: "UTC", day: "numeric", month: "short" });
  const next = new Date(`${addDays(weekStart, 7)}T12:00:00Z`);
  const nextLabel = next.toLocaleDateString("es-AR", { timeZone: "UTC", day: "numeric", month: "short" });
  return `Semana ${label} - cambia ${nextLabel}`;
}

function getCurrentServerPlanWeek(now = new Date()) {
  const todayKey = getBuenosAiresDateKey(now);
  const weekStart = getPlanWeekStartKey(todayKey);
  const weekIndex = getWeekIndex(todayKey);
  return {
    todayKey,
    weekStart,
    weekIndex,
    weekName: getWeekLabel(weekStart),
    planWeek: `${weekIndex}:${weekStart}`
  };
}

async function ensureServerPlanWeek(sql, ownerId, now = new Date()) {
  const current = getCurrentServerPlanWeek(now);
  await sql`
    INSERT INTO rony_dieta_sync (owner_id, key, value, updated_at)
    VALUES (${ownerId}, ${PLAN_WEEK_KEY}, ${JSON.stringify(current.planWeek)}::jsonb, now())
    ON CONFLICT (owner_id, key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
  await sql`
    INSERT INTO rony_dieta_menu_history
      (owner_id, week_start, week_index, week_name, menu_signature, app_build, updated_at)
    VALUES
      (${ownerId}, ${current.weekStart}::date, ${current.weekIndex}, ${current.weekName}, ${`server-sync:${current.weekStart}:${current.weekIndex}`}, ${APP_BUILD}, now())
    ON CONFLICT (owner_id, week_start)
    DO UPDATE SET
      week_index = EXCLUDED.week_index,
      week_name = EXCLUDED.week_name,
      app_build = EXCLUDED.app_build,
      updated_at = now()
  `;
  return current;
}

function isValidMealState(value) {
  if (!isPlainObject(value)) return false;
  return Object.values(value).every((dayState) => {
    if (!isPlainObject(dayState)) return false;
    return Object.values(dayState).every((entry) => {
      if (typeof entry === "boolean") return true;
      return isPlainObject(entry)
        && typeof entry.done === "boolean"
        && (!entry.variant || entry.variant === "primary" || entry.variant === "alt");
    });
  });
}

function isValidFridayMode(value) {
  if (!isPlainObject(value)) return false;
  return Object.entries(value).every(([date, mode]) => isDateKey(date) && mode === "rest");
}

function isValidWater(value) {
  return isPlainObject(value)
    && isDateKey(value.date)
    && Number.isInteger(Number(value.count))
    && Number(value.count) >= 0
    && Number(value.count) <= 20;
}

function isValidWeightHistory(value) {
  return Array.isArray(value) && value.length <= 260 && value.every((entry) => (
    isPlainObject(entry)
    && isDateKey(entry.date)
    && Number(entry.weight) >= 40
    && Number(entry.weight) <= 200
  ));
}

function isValidShopping(value) {
  return Array.isArray(value)
    && value.length <= 500
    && value.every((item) => typeof item === "string" && item.length <= 160);
}

function isValidStreak(value) {
  return isPlainObject(value)
    && Number.isFinite(Number(value.count || 0))
    && Number(value.count || 0) >= 0;
}

function isValidValueForKey(key, value) {
  if (value === null) return true;
  if (key === "rony-dieta-meals") return isValidMealState(value);
  if (key === "rony-dieta-water") return isValidWater(value);
  if (key === "rony-dieta-shopping") return isValidShopping(value);
  if (key === "rony-dieta-shopping-panel") return value === "open" || value === "closed";
  if (key === "rony-dieta-streak") return isValidStreak(value);
  if (key === "rony-dieta-weight") return isValidWeightHistory(value);
  if (key === "rony-dieta-friday-mode") return isValidFridayMode(value);
  if (key === PLAN_WEEK_KEY) return typeof value === "string" && /^[0-9]+:\d{4}-\d{2}-\d{2}$/.test(value);
  if (key === "weight-seeded") return value === 1 || value === "1" || value === true;
  return false;
}

function normalizeState(input) {
  const state = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return state;
  Object.entries(input).forEach(([key, value]) => {
    const normalizedValue = value === undefined ? null : value;
    if (ALLOWED_KEYS.has(key) && isValidValueForKey(key, normalizedValue)) {
      state[key] = normalizedValue;
    }
  });
  return state;
}

function normalizeMenuWeek(input) {
  if (!input || typeof input !== "object") return null;
  const weekStart = String(input.weekStart || "");
  const weekIndex = Number(input.weekIndex);
  const weekName = String(input.weekName || "").slice(0, 120);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return null;
  if (!Number.isInteger(weekIndex) || weekIndex < 0 || weekIndex > 12) return null;
  if (!weekName) return null;
  return {
    weekStart,
    weekIndex,
    weekName,
    menuSignature: String(input.menuSignature || "").slice(0, 4000),
    appBuild: String(input.appBuild || "").slice(0, 80)
  };
}

async function handleGet(req, res, sql, ownerId) {
  const rows = await sql`
    SELECT key, value, updated_at
    FROM rony_dieta_sync
    WHERE owner_id = ${ownerId}
    ORDER BY key
  `;
  const history = await sql`
    SELECT week_start, week_index, week_name, menu_signature, app_build, updated_at
    FROM rony_dieta_menu_history
    WHERE owner_id = ${ownerId}
    ORDER BY week_start DESC
    LIMIT 24
  `;
  const state = {};
  const updatedAt = {};
  rows.forEach((row) => {
    state[row.key] = row.value;
    updatedAt[row.key] = row.updated_at;
  });
  sendJson(res, 200, {
    ok: true,
    configured: true,
    ownerId,
    state,
    updatedAt,
    menuHistory: history.map((row) => ({
      weekStart: row.week_start,
      weekIndex: row.week_index,
      weekName: row.week_name,
      menuSignature: row.menu_signature,
      appBuild: row.app_build,
      updatedAt: row.updated_at
    }))
  });
}

async function handlePost(req, res, sql, ownerId, serverPlanWeek) {
  const raw = await readBody(req);
  const body = parseRequestBody(raw);
  const state = normalizeState(body.state);
  const entries = Object.entries(state);

  for (const [key, value] of entries) {
    if (value === null) {
      await sql`DELETE FROM rony_dieta_sync WHERE owner_id = ${ownerId} AND key = ${key}`;
    } else {
      await sql`
        INSERT INTO rony_dieta_sync (owner_id, key, value, updated_at)
        VALUES (${ownerId}, ${key}, ${JSON.stringify(value)}::jsonb, now())
        ON CONFLICT (owner_id, key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `;
    }
  }

  const menuWeek = normalizeMenuWeek(body.menuWeek);
  const currentMenuWeek = menuWeek
    && menuWeek.weekStart === serverPlanWeek.weekStart
    && menuWeek.weekIndex === serverPlanWeek.weekIndex
      ? menuWeek
      : null;
  if (currentMenuWeek) {
    await sql`
      INSERT INTO rony_dieta_menu_history
        (owner_id, week_start, week_index, week_name, menu_signature, app_build, updated_at)
      VALUES
        (${ownerId}, ${serverPlanWeek.weekStart}::date, ${serverPlanWeek.weekIndex}, ${serverPlanWeek.weekName}, ${currentMenuWeek.menuSignature}, ${currentMenuWeek.appBuild}, now())
      ON CONFLICT (owner_id, week_start)
      DO UPDATE SET
        week_index = EXCLUDED.week_index,
        week_name = EXCLUDED.week_name,
        menu_signature = EXCLUDED.menu_signature,
        app_build = EXCLUDED.app_build,
        updated_at = now()
    `;
  }

  sendJson(res, 200, {
    ok: true,
    configured: true,
    ownerId,
    savedKeys: entries.length,
    savedMenuWeek: Boolean(currentMenuWeek),
    serverPlanWeek: serverPlanWeek.planWeek
  });
}

module.exports = async function handler(req, res) {
  if (!isAllowedOrigin(req)) {
    sendJson(res, 403, { ok: false, error: "forbidden_origin" });
    return;
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    res.setHeader("Cache-Control", "no-store");
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const sql = await getSqlClient();
    if (!sql) {
      sendJson(res, 200, {
        ok: true,
        configured: false,
        reason: "missing_DATABASE_URL"
      });
      return;
    }

    await ensureSchemaOnce(sql);
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const ownerId = sanitizeOwner(url.searchParams.get("owner") || req.headers["x-rony-owner"]);
    const serverPlanWeek = await ensureServerPlanWeek(sql, ownerId);

    if (req.method === "GET") {
      await handleGet(req, res, sql, ownerId);
      return;
    }
    if (req.method === "POST") {
      await handlePost(req, res, sql, ownerId, serverPlanWeek);
      return;
    }

    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
  } catch (error) {
    const known = new Set(["payload_too_large", "invalid_json"]);
    const message = error && known.has(error.message) ? error.message : "sync_failed";
    const status = error?.statusCode || (message === "payload_too_large" ? 413 : message === "invalid_json" ? 400 : 500);
    sendJson(res, status, {
      ok: false,
      error: message
    });
  }
};

module.exports._internals = {
  isAllowedOrigin,
  isValidValueForKey,
  normalizeState,
  normalizeMenuWeek,
  parseRequestBody,
  getCurrentServerPlanWeek,
  getPlanWeekStartKey,
  getWeekIndex,
  sanitizeOwner
};
