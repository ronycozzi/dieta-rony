#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");
const appScriptPath = path.join(repoRoot, "script.js");

function readAppScript() {
  return fs.readFileSync(appScriptPath, "utf8");
}

function sliceForAudit(src) {
  const markers = [
    "// ESTADO Y STORAGE",
    "// RENDER",
    "// INIT"
  ];
  for (const marker of markers) {
    const idx = src.indexOf(marker);
    if (idx !== -1) return { prelude: src.slice(0, idx), marker };
  }
  throw new Error("No se encontró un marcador de corte para auditoría en script.js");
}

function buildAuditPrelude(prelude) {
  const expose = `
;globalThis.__AUDIT_EXPORT = {
  allWeeks,
  applyProfessionalMenuRules,
  applyFiveDayTrainingRules,
  applyPlainMenuRules,
  applyWholeFoodPriorityRules,
  applyPostWorkoutWholeFoodRules,
  applyPlanQualityRules,
  applyCalorieBalanceRules,
  applyMinimumEnergyFloorRules,
  calculateDayTotals,
  isTooSpecialForRony,
  mealSearchText,
  cleanPlanText,
  BANNED_INGREDIENTS_RE,
  PLAIN_MENU_BLOCKLIST
};
`;
  return `${prelude}\n${expose}`;
}

function runPrelude(preludeCode) {
  const context = vm.createContext(vm.constants.DONT_CONTEXTIFY);
  context.console = console;

  vm.runInContext(preludeCode, context, {
    filename: "script.audit.js",
    timeout: 10000
  });

  if (!context.__AUDIT_EXPORT) {
    throw new Error("No se pudo exportar __AUDIT_EXPORT desde el prelude (scope VM).");
  }
  return context.__AUDIT_EXPORT;
}

function applyRules(A) {
  const ordered = [
    "applyProfessionalMenuRules",
    "applyFiveDayTrainingRules",
    "applyPlainMenuRules",
    "applyWholeFoodPriorityRules",
    "applyPostWorkoutWholeFoodRules",
    "applyPlanQualityRules",
    "applyCalorieBalanceRules",
    "applyCalorieBalanceRules",
    "applyMinimumEnergyFloorRules"
  ];

  for (const fnName of ordered) {
    const fn = A[fnName];
    if (typeof fn !== "function") throw new Error(`Falta función requerida: ${fnName}()`);
    fn();
  }
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function visibleMealText(meal) {
  const join = (arr, mapFn) => (Array.isArray(arr) ? arr.map(mapFn).join(" ") : "");
  const alt = meal.alt || {};
  return [
    meal.name,
    meal.desc,
    meal.note || "",
    join(meal.foods, (f) => f.name),
    join(meal.prep, (s) => s),
    alt.name || "",
    alt.desc || "",
    join(alt.foods, (f) => f.name),
    join(alt.prep, (s) => s)
  ].join(" ");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function audit(A) {
  const bannedRenderTerms = [
    /yogur/i,
    /avena/i,
    /harina de arroz/i,
    /arroz inflado/i,
    /\bcottage\b/i,
    /ricota/i,
    /locro/i,
    /leche tibia/i,
    /leche caliente/i,
    /manzana con manteca de man[ií]/i
  ];

  const kcalOutliers = [];
  const mealsMissingAlt = [];
  const bannedHits = [];
  const specialHits = [];
  const dayTipHits = [];
  const wheyMisuseHits = [];

  A.allWeeks.forEach((week, weekNumber) => {
    week.forEach((day, dayNumber) => {
      const tipText = normalizeText(day.tip || "");
      for (const re of bannedRenderTerms) {
        if (re.test(tipText)) {
          dayTipHits.push({ weekNumber, dayNumber, id: day.id, title: day.title, tip: day.tip });
          break;
        }
      }

      day.meals.forEach((meal, mealNumber) => {
        if (!meal.alt || !Array.isArray(meal.alt.foods)) {
          mealsMissingAlt.push({ weekNumber, dayNumber, mealNumber, label: meal.label, name: meal.name });
        }

        const visible = visibleMealText(meal);
        const mainVisible = visibleMealText({ ...meal, alt: null });
        for (const re of bannedRenderTerms) {
          if (re.test(visible)) {
            bannedHits.push({ weekNumber, dayNumber, mealNumber, label: meal.label, name: meal.name, hit: String(re) });
            break;
          }
        }

        if (A.BANNED_INGREDIENTS_RE && A.BANNED_INGREDIENTS_RE.test(visible)) {
          bannedHits.push({ weekNumber, dayNumber, mealNumber, label: meal.label, name: meal.name, hit: "BANNED_INGREDIENTS_RE" });
        }

        if (typeof A.isTooSpecialForRony === "function") {
          if (A.isTooSpecialForRony(meal) || (meal.alt && A.isTooSpecialForRony(meal.alt))) {
            specialHits.push({ weekNumber, dayNumber, mealNumber, label: meal.label, name: meal.name });
          }
        }

        if (/whey/i.test(mainVisible) && !/(post-entreno|antes de dormir|refuerzo)/i.test(meal.label)) {
          wheyMisuseHits.push({ weekNumber, dayNumber, mealNumber, label: meal.label, name: meal.name });
        }
      });

      const totals = A.calculateDayTotals(day);
      const kcal = totals.kcal;
      const isRest = Boolean(day.isRestDay);
      const target = isRest ? 2600 : 2850;
      const maxComfort = target + (isRest ? 160 : 180);
      const minComfort = isRest ? 2450 : 2650;
      // Epsilon por redondeos (kcal se deriva de macros 4/4/9 y hay varios .round)
      const EPS = 25;
      if (kcal > maxComfort + EPS || kcal < minComfort - EPS) {
        kcalOutliers.push({ weekNumber, dayNumber, id: day.id, title: day.title, kcal, minComfort, maxComfort });
      }
    });
  });

  const summarize = (label, arr) => {
    if (!arr.length) return;
    const preview = arr.slice(0, 8);
    console.error(`${label}: ${arr.length}`);
    console.error(JSON.stringify(preview, null, 2));
  };

  summarize("kcalOutliers", kcalOutliers);
  summarize("mealsMissingAlt", mealsMissingAlt);
  summarize("dayTipHits", dayTipHits);
  summarize("bannedHits", bannedHits);
  summarize("specialHits", specialHits);
  summarize("wheyMisuseHits", wheyMisuseHits);

  assert(mealsMissingAlt.length === 0, `Audit: faltan opciones B (alt) en ${mealsMissingAlt.length} comidas.`);
  assert(dayTipHits.length === 0, `Audit: hay tips con ingredientes bloqueados (${dayTipHits.length}).`);
  assert(bannedHits.length === 0, `Audit: aparecen ingredientes bloqueados en el menú (${bannedHits.length}).`);
  assert(specialHits.length === 0, `Audit: quedaron comidas "muy especiales" (${specialHits.length}).`);
  assert(wheyMisuseHits.length === 0, `Audit: whey quedó como comida principal fuera de los slots permitidos (${wheyMisuseHits.length}).`);
  assert(kcalOutliers.length === 0, `Audit: hay días fuera del rango kcal confort (${kcalOutliers.length}).`);

  return { kcalOutliers, mealsMissingAlt, bannedHits, specialHits, dayTipHits, wheyMisuseHits };
}

function main() {
  const src = readAppScript();
  const { prelude, marker } = sliceForAudit(src);
  const code = buildAuditPrelude(prelude);
  const A = runPrelude(code);
  applyRules(A);
  audit(A);

  console.log(`AUDIT OK — menú limpio y balanceado (corte: ${marker})`);
}

main();
