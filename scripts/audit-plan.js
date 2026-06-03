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
  applyRiceRotationRules,
  applyCalorieBalanceRules,
  applyMinimumEnergyFloorRules,
  ensureDailySupplementRules,
  trimHighCalorieDaysAfterSupplements,
  calculateDayTotals,
  isTooSpecialForRony,
  isMainMeal,
  mealHasRice,
  mealCarbGroup,
  hasWhey,
  hasCreatine,
  mealSearchText,
  cleanPlanText,
  getPlanDayIndex,
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
    "applyRiceRotationRules",
    "applyCalorieBalanceRules",
    "applyCalorieBalanceRules",
    "applyRiceRotationRules",
    "applyMinimumEnergyFloorRules",
    "applyRiceRotationRules",
    "ensureDailySupplementRules",
    "trimHighCalorieDaysAfterSupplements"
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

function auditDayIndexMapping(A) {
  assert(typeof A.getPlanDayIndex === "function", "Audit: falta getPlanDayIndex().");
  const sunday = new Date("2026-06-07T12:00:00");
  const monday = new Date("2026-06-08T12:00:00");
  assert(A.getPlanDayIndex(sunday) === 7, "Audit: domingo debe mapear a dayIndex 7.");
  assert(A.getPlanDayIndex(monday) === 1, "Audit: lunes debe mapear a dayIndex 1.");
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
  const riceAltHits = [];
  const sameCarbAltHits = [];
  const riceSequenceHits = [];
  const sameTurnRiceHits = [];
  const nextDayRiceHits = [];
  const missingPrimaryWhey = [];
  const missingPrimaryCreatine = [];
  const mainSlots = [];
  const daySlots = [];

  A.allWeeks.forEach((week, weekNumber) => {
    week.forEach((day, dayNumber) => {
      const tipText = normalizeText(day.tip || "");
      for (const re of bannedRenderTerms) {
        if (re.test(tipText)) {
          dayTipHits.push({ weekNumber, dayNumber, id: day.id, title: day.title, tip: day.tip });
          break;
        }
      }

      let hasPrimaryWhey = false;
      let hasPrimaryCreatine = false;
      let hasRiceDay = false;

      day.meals.forEach((meal, mealNumber) => {
        if (!meal.alt || !Array.isArray(meal.alt.foods)) {
          mealsMissingAlt.push({ weekNumber, dayNumber, mealNumber, label: meal.label, name: meal.name });
        }

        const visible = visibleMealText(meal);
        const mainVisible = visibleMealText({ ...meal, alt: null });
        if (typeof A.hasWhey === "function" && A.hasWhey(meal)) hasPrimaryWhey = true;
        if (typeof A.hasCreatine === "function" && A.hasCreatine(meal)) hasPrimaryCreatine = true;

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

        if (/whey/i.test(mainVisible) && !/(desayuno|media|merienda|post-entreno|antes de dormir|refuerzo)/i.test(meal.label)) {
          wheyMisuseHits.push({ weekNumber, dayNumber, mealNumber, label: meal.label, name: meal.name });
        }

        if (typeof A.isMainMeal === "function" && A.isMainMeal(meal)) {
          const primaryGroup = A.mealCarbGroup(meal);
          const altGroup = meal.alt ? A.mealCarbGroup(meal.alt) : "sin-alt";
          const rice = A.mealHasRice(meal);
          if (rice) hasRiceDay = true;
          mainSlots.push({ weekNumber, dayNumber, mealNumber, label: meal.label, name: meal.name, rice });
          if (meal.alt && A.mealHasRice(meal.alt)) {
            riceAltHits.push({ weekNumber, dayNumber, mealNumber, label: meal.label, name: meal.name, alt: meal.alt.name });
          }
          if (meal.alt && primaryGroup !== "otro" && primaryGroup === altGroup) {
            sameCarbAltHits.push({ weekNumber, dayNumber, mealNumber, label: meal.label, group: primaryGroup, name: meal.name, alt: meal.alt.name });
          }
        }
      });

      if (!hasPrimaryWhey) missingPrimaryWhey.push({ weekNumber, dayNumber, id: day.id, title: day.title });
      if (!hasPrimaryCreatine) missingPrimaryCreatine.push({ weekNumber, dayNumber, id: day.id, title: day.title });
      daySlots.push({ weekNumber, dayNumber, id: day.id, title: day.title, rice: hasRiceDay });

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

  for (let i = 1; i < mainSlots.length; i++) {
    const previous = mainSlots[i - 1];
    const current = mainSlots[i];
    if (previous.rice && current.rice) riceSequenceHits.push({ previous, current });

    const previousSameTurn = mainSlots.slice(0, i).reverse().find((candidate) => {
      const candidateDayIndex = candidate.weekNumber * 7 + candidate.dayNumber;
      const currentDayIndex = current.weekNumber * 7 + current.dayNumber;
      return candidate.label === current.label && currentDayIndex - candidateDayIndex === 1;
    });
    if (previousSameTurn && previousSameTurn.rice && current.rice) sameTurnRiceHits.push({ previous: previousSameTurn, current });
  }

  for (let i = 1; i < daySlots.length; i++) {
    if (daySlots[i - 1].rice && daySlots[i].rice) nextDayRiceHits.push({ previous: daySlots[i - 1], current: daySlots[i] });
  }

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
  summarize("riceAltHits", riceAltHits);
  summarize("sameCarbAltHits", sameCarbAltHits);
  summarize("riceSequenceHits", riceSequenceHits);
  summarize("sameTurnRiceHits", sameTurnRiceHits);
  summarize("nextDayRiceHits", nextDayRiceHits);
  summarize("missingPrimaryWhey", missingPrimaryWhey);
  summarize("missingPrimaryCreatine", missingPrimaryCreatine);

  assert(mealsMissingAlt.length === 0, `Audit: faltan opciones B (alt) en ${mealsMissingAlt.length} comidas.`);
  assert(dayTipHits.length === 0, `Audit: hay tips con ingredientes bloqueados (${dayTipHits.length}).`);
  assert(bannedHits.length === 0, `Audit: aparecen ingredientes bloqueados en el menú (${bannedHits.length}).`);
  assert(specialHits.length === 0, `Audit: quedaron comidas "muy especiales" (${specialHits.length}).`);
  assert(wheyMisuseHits.length === 0, `Audit: whey quedó como comida principal fuera de los slots permitidos (${wheyMisuseHits.length}).`);
  assert(riceAltHits.length === 0, `Audit: hay opciones B de almuerzo/cena con arroz (${riceAltHits.length}).`);
  assert(sameCarbAltHits.length === 0, `Audit: hay opciones B con el mismo carbo principal (${sameCarbAltHits.length}).`);
  assert(riceSequenceHits.length === 0, `Audit: hay arroz consecutivo entre almuerzo/cena (${riceSequenceHits.length}).`);
  assert(sameTurnRiceHits.length === 0, `Audit: hay arroz en el mismo turno de días seguidos (${sameTurnRiceHits.length}).`);
  assert(nextDayRiceHits.length === 0, `Audit: hay arroz en almuerzo/cena en días seguidos (${nextDayRiceHits.length}).`);
  assert(missingPrimaryWhey.length === 0, `Audit: faltan whey diarios principales (${missingPrimaryWhey.length}).`);
  assert(missingPrimaryCreatine.length === 0, `Audit: faltan creatinas diarias principales (${missingPrimaryCreatine.length}).`);
  assert(kcalOutliers.length === 0, `Audit: hay días fuera del rango kcal confort (${kcalOutliers.length}).`);

  return { kcalOutliers, mealsMissingAlt, bannedHits, specialHits, dayTipHits, wheyMisuseHits, riceAltHits, sameCarbAltHits, riceSequenceHits, sameTurnRiceHits, nextDayRiceHits, missingPrimaryWhey, missingPrimaryCreatine };
}

function main() {
  const src = readAppScript();
  const { prelude, marker } = sliceForAudit(src);
  const code = buildAuditPrelude(prelude);
  const A = runPrelude(code);
  auditDayIndexMapping(A);
  applyRules(A);
  audit(A);

  console.log(`AUDIT OK — menú limpio y balanceado (corte: ${marker})`);
}

main();
