#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const indexText = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");
const scriptText = fs.readFileSync(path.join(repoRoot, "script.js"), "utf8");
const swText = fs.readFileSync(path.join(repoRoot, "sw.js"), "utf8");
const cssText = fs.readFileSync(path.join(repoRoot, "styles.css"), "utf8");
const syncText = fs.readFileSync(path.join(repoRoot, "api", "sync.js"), "utf8");
const weeklyText = fs.readFileSync(path.join(repoRoot, "api", "weekly-refresh.js"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const appBuild = scriptText.match(/const\s+APP_BUILD\s*=\s*"([^"]+)"/)?.[1];
assert(appBuild, "UI audit: no se encontro APP_BUILD.");

const expectedAssetVersion = appBuild.replace(/^(\d{4})-(\d{2})-(\d{2})-/, "$1$2$3-");
const assetVersions = [
  ...Array.from(indexText.matchAll(/\b(?:styles|script)\.(?:css|js)\?v=([^"']+)/g)).map((m) => m[1]),
  ...Array.from(swText.matchAll(/\b(?:styles|script)\.(?:css|js)\?v=([^"']+)/g)).map((m) => m[1])
];
assert(assetVersions.length === 4, "UI audit: index/sw deben versionar styles.css y script.js.");
assert(assetVersions.every((version) => version === expectedAssetVersion), `UI audit: cache-bust no coincide con APP_BUILD (${assetVersions.join(", ")} vs ${expectedAssetVersion}).`);
assert(new RegExp(`const\\s+VERSION\\s*=\\s*"v\\d+-${appBuild.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(swText), "UI audit: VERSION del service worker no coincide con APP_BUILD.");

assert(indexText.includes('id="cloud-status"'), "UI audit: falta indicador visible de sync cloud/Neon.");
assert(indexText.includes('id="weekly-checkin"'), "UI audit: falta check-in semanal de ajuste nutricional.");
assert(/function\s+updateCloudSyncStatus\s*\(/.test(scriptText), "UI audit: falta updateCloudSyncStatus().");
assert(/function\s+renderWeeklyCheckin\s*\(/.test(scriptText), "UI audit: falta renderWeeklyCheckin().");
assert(/rony-dieta-checkins/.test(scriptText + syncText), "UI audit: el check-in semanal debe estar incluido en cliente y backend.");
assert(/RONY FUEL CONSOLE V2/.test(cssText), "UI audit: falta la capa visual final RONY FUEL CONSOLE V2.");
assert(/\.bento-water,\s*\.week-overview,\s*\.plan-intelligence/.test(cssText), "UI audit: las secciones duplicadas deben quedar ocultas por CSS final.");
assert(/overflow-x:\s*hidden/.test(cssText), "UI audit: falta guardia contra overflow horizontal.");
assert(/grid-template-columns:\s*repeat\(7,\s*minmax\(0,\s*1fr\)\)/.test(cssText), "UI audit: los dias deben quedar en grilla estable de 7 columnas.");
assert(!/Menu\s+\d+\s*\/\s*4|Rotacion\s+\d+\s+de\s+4/i.test(scriptText + indexText), "UI audit: no debe volver copy viejo de Menu X/4 o Rotacion X de 4.");
assert(!/menu fresco/i.test(syncText + weeklyText), "UI audit: el backend no debe volver a guardar weekName con 'menu fresco'.");
assert(/cambia/.test(syncText) && /cambia/.test(weeklyText), "UI audit: el backend debe guardar weekName con proxima rotacion.");

console.log("UI AUDIT OK");
