"use strict";

const OWNER_DEFAULT = "rony";
const MAX_BODY_BYTES = 750_000;
const ALLOWED_KEYS = new Set([
  "rony-dieta-meals",
  "rony-dieta-water",
  "rony-dieta-shopping",
  "rony-dieta-shopping-panel",
  "rony-dieta-streak",
  "rony-dieta-weight",
  "rony-dieta-friday-mode",
  "rony-dieta-plan-week",
  "weight-seeded"
]);

let sqlClientPromise;

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
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

function sanitizeOwner(value) {
  const owner = String(value || OWNER_DEFAULT).trim().toLowerCase();
  return /^[a-z0-9_-]{1,40}$/.test(owner) ? owner : OWNER_DEFAULT;
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

function normalizeState(input) {
  const state = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return state;
  Object.entries(input).forEach(([key, value]) => {
    if (ALLOWED_KEYS.has(key)) state[key] = value === undefined ? null : value;
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

async function handlePost(req, res, sql, ownerId) {
  const raw = await readBody(req);
  const body = raw ? JSON.parse(raw) : {};
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
  if (menuWeek) {
    await sql`
      INSERT INTO rony_dieta_menu_history
        (owner_id, week_start, week_index, week_name, menu_signature, app_build, updated_at)
      VALUES
        (${ownerId}, ${menuWeek.weekStart}::date, ${menuWeek.weekIndex}, ${menuWeek.weekName}, ${menuWeek.menuSignature}, ${menuWeek.appBuild}, now())
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
    savedMenuWeek: Boolean(menuWeek)
  });
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
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

    await ensureSchema(sql);
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const ownerId = sanitizeOwner(url.searchParams.get("owner") || req.headers["x-rony-owner"]);

    if (req.method === "GET") {
      await handleGet(req, res, sql, ownerId);
      return;
    }
    if (req.method === "POST") {
      await handlePost(req, res, sql, ownerId);
      return;
    }

    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
  } catch (error) {
    const message = error && error.message === "payload_too_large" ? "payload_too_large" : "sync_failed";
    sendJson(res, message === "payload_too_large" ? 413 : 500, {
      ok: false,
      error: message
    });
  }
};
