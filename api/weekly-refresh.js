"use strict";

const OWNER_DEFAULT = "rony";
const PLAN_WEEK_KEY = "rony-dieta-plan-week";
const APP_BUILD = "2026-07-14-fuel-console-checkin-sync";
const MENU_ROTATION_CORRECTION_START = "2026-06-15";
const MENU_ROTATION_CORRECTION_OFFSET = 1;
const TZ = "America/Argentina/Buenos_Aires";

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

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return true;
  return req.headers.authorization === `Bearer ${secret}`;
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

function getWeekLabel(weekStart, weekIndex) {
  const date = new Date(`${weekStart}T12:00:00Z`);
  const label = date.toLocaleDateString("es-AR", { timeZone: "UTC", day: "numeric", month: "short" });
  const next = new Date(`${addDays(weekStart, 7)}T12:00:00Z`);
  const nextLabel = next.toLocaleDateString("es-AR", { timeZone: "UTC", day: "numeric", month: "short" });
  return `Semana ${label} - cambia ${nextLabel}`;
}

async function refreshWeek(sql, ownerId, now = new Date()) {
  const todayKey = getBuenosAiresDateKey(now);
  const weekStart = getPlanWeekStartKey(todayKey);
  const weekIndex = getWeekIndex(todayKey);
  const planWeek = `${weekIndex}:${weekStart}`;
  const weekName = getWeekLabel(weekStart, weekIndex);
  const menuSignature = `server-weekly-refresh:${weekStart}:${weekIndex}`;

  await sql`
    INSERT INTO rony_dieta_sync (owner_id, key, value, updated_at)
    VALUES (${ownerId}, ${PLAN_WEEK_KEY}, ${JSON.stringify(planWeek)}::jsonb, now())
    ON CONFLICT (owner_id, key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;

  await sql`
    INSERT INTO rony_dieta_menu_history
      (owner_id, week_start, week_index, week_name, menu_signature, app_build, updated_at)
    VALUES
      (${ownerId}, ${weekStart}::date, ${weekIndex}, ${weekName}, ${menuSignature}, ${APP_BUILD}, now())
    ON CONFLICT (owner_id, week_start)
    DO UPDATE SET
      week_index = EXCLUDED.week_index,
      week_name = EXCLUDED.week_name,
      menu_signature = EXCLUDED.menu_signature,
      app_build = EXCLUDED.app_build,
      updated_at = now()
  `;

  return { todayKey, weekStart, weekIndex, weekName, planWeek };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }
  if (!isAuthorized(req)) {
    sendJson(res, 401, { ok: false, error: "unauthorized" });
    return;
  }

  try {
    const sql = await getSqlClient();
    if (!sql) {
      sendJson(res, 200, { ok: true, configured: false, reason: "missing_DATABASE_URL" });
      return;
    }

    await ensureSchemaOnce(sql);
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const ownerId = sanitizeOwner(url.searchParams.get("owner") || req.headers["x-rony-owner"]);
    const result = await refreshWeek(sql, ownerId);
    sendJson(res, 200, { ok: true, configured: true, ownerId, ...result });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: "weekly_refresh_failed" });
  }
};

module.exports._internals = {
  getBuenosAiresDateKey,
  getPlanWeekStartKey,
  getISOWeekNumberFromDateKey,
  getWeekIndex,
  getWeekLabel,
  sanitizeOwner
};
