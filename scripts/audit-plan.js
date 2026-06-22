#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");
const appScriptPath = path.join(repoRoot, "script.js");
const indexHtmlPath = path.join(repoRoot, "index.html");
const serviceWorkerPath = path.join(repoRoot, "sw.js");
const readmePath = path.join(repoRoot, "README.md");

function readAppScript() {
  return fs.readFileSync(appScriptPath, "utf8");
}

function readTextFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
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
  applyRonyFreshWeeklyMenuRules,
  applyPlanQualityRules,
  applyRiceRotationRules,
  applyFreshMainVarietyRules,
  rebuildPlanForDate,
  applyCalorieBalanceRules,
  applyMinimumEnergyFloorRules,
  ensureDailySupplementRules,
  trimHighCalorieDaysAfterSupplements,
  calculateDayTotals,
  isTooSpecialForRony,
  isMainMeal,
  mealHasRice,
  mealCarbGroup,
  mealNameKey,
  hasWhey,
  hasCreatine,
  mealSearchText,
  getProteinSafetyFloor,
  dayNeedsWheyTopUp,
  cleanPlanText,
  getPlanDayIndex,
  WAKE_TIME,
  TRAINING_TIME,
  TRAINING_DAY_TIMES,
  REST_DAY_TIMES,
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
  if (typeof A.rebuildPlanForDate === "function") {
    A.rebuildPlanForDate(new Date("2026-06-18T12:00:00-03:00"), { audit: false });
    return;
  }
  const ordered = [
    "applyProfessionalMenuRules",
    "applyFiveDayTrainingRules",
    "applyPlainMenuRules",
    "applyWholeFoodPriorityRules",
    "applyPostWorkoutWholeFoodRules",
    "applyRonyFreshWeeklyMenuRules",
    "applyPlanQualityRules",
    "applyRiceRotationRules",
    "applyFreshMainVarietyRules",
    "applyRiceRotationRules",
    "applyCalorieBalanceRules",
    "applyCalorieBalanceRules",
    "applyRiceRotationRules",
    "applyFreshMainVarietyRules",
    "applyRiceRotationRules",
    "applyMinimumEnergyFloorRules",
    "applyRiceRotationRules",
    "applyFreshMainVarietyRules",
    "applyRiceRotationRules",
    "ensureDailySupplementRules",
    "trimHighCalorieDaysAfterSupplements",
    "applyMinimumEnergyFloorRules",
    "applyRiceRotationRules",
    "applyFreshMainVarietyRules"
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

function slugForAudit(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function auditSourceQuality(src) {
  const menuCut = src.indexOf("// CALIDAD DEL PLAN");
  assert(menuCut !== -1, "Audit: no se encontro el corte de calidad del plan.");
  const rawMenuSource = src.slice(0, menuCut).toLowerCase();
  const freshMenuCut = src.indexOf("// MENU NUEVO RONY");
  const stateCut = src.indexOf("// ESTADO Y STORAGE");
  assert(freshMenuCut !== -1 && stateCut !== -1 && stateCut > freshMenuCut, "Audit: no se encontro el bloque del menu fresco.");
  const freshMenuSource = src.slice(freshMenuCut, stateCut).toLowerCase();
  const rawBlockedTerms = [
    "arroz inflado",
    "harina de arroz",
    "avena",
    "yogur",
    "cottage",
    "ricota",
    "locro",
    "leche caliente",
    "leche tibia",
    "manzana con manteca"
  ];
  const rawHits = rawBlockedTerms.filter((term) => rawMenuSource.includes(term));
  assert(rawHits.length === 0, `Audit: el menu crudo conserva ingredientes bloqueados: ${rawHits.join(", ")}.`);

  const freshLayerForbidden = [
    "licuado de leche, banana y manteca de mani",
    "restsnackaltfornoonschedule = wheywithbananaandcreatinetemplate",
    "pancakes onefit",
    "leche, banana chica y queso en fetas",
    "queso untable con tostadas y fruta"
  ];
  const freshLayerHits = freshLayerForbidden.filter((term) => freshMenuSource.includes(term));
  assert(freshLayerHits.length === 0, `Audit: el menu fresco activo recayo en comodines o mezclas flojas: ${freshLayerHits.join(", ")}.`);

  const brokenEncodingHits = src.match(/[A-Za-zÁÉÍÓÚáéíóúÑñ]\?[A-Za-zÁÉÍÓÚáéíóúÑñ]|Ã.|Â.|�/g) || [];
  assert(brokenEncodingHits.length === 0, `Audit: hay textos con encoding roto: ${brokenEncodingHits.slice(0, 10).join(", ")}.`);

  ["togglePrep", "toggleAltMeal", "renderMeal"].forEach((name) => {
    const functionDefs = countMatches(src, new RegExp(`\\bfunction\\s+${name}\\s*\\(`, "g"));
    const functionAssignments = countMatches(src, new RegExp(`\\b${name}\\s*=\\s*function\\b`, "g"));
    assert(functionDefs === 1 && functionAssignments === 0, `Audit: ${name} debe tener una sola definicion canonica.`);
  });

  assert(!/<div class="meal-head"[^>]*role="button"/.test(src), "Audit: meal-head no debe volver a ser un role=button con controles adentro.");
  assert(!/onkeydown="handleMealHeadKeydown/.test(src), "Audit: meal-open-btn es un button nativo; no debe duplicar toggle con onkeydown.");
  assert(/function\s+syncCurrentPlanDate\s*\(/.test(src), "Audit: falta syncCurrentPlanDate para actualizar menú semanal sin recargar.");
  assert(/syncCurrentPlanDate\("visible"\)/.test(src), "Audit: la app debe sincronizar el menú al volver de background.");
  assert(/syncCurrentPlanDate\("focus"\)/.test(src), "Audit: la app debe sincronizar el menú al recuperar foco.");
  assert(/syncCurrentPlanDate\("pageshow"\)/.test(src), "Audit: la app debe sincronizar el menú al restaurarse desde cache del navegador.");
  assert(/const\s+applyWaitingUpdate\s*=/.test(src), "Audit: el Service Worker debe auto-aplicar versiones nuevas.");
  assert(!/promptUpdate/.test(src), "Audit: el update de Service Worker no debe depender de prompt manual para no dejar menús viejos.");

  const forbiddenMandatoryWheyPatterns = [
    /whey diario/i,
    /whey diarios/i,
    /scoop diario/i,
    /whey[^.\n]{0,32}todos los d[ií]as/i,
    /todos los d[ií]as[^.\n]{0,32}whey/i
  ];
  const staleScheduleCopyPatterns = [
    /pre simple 12:30/i,
    /desayuno liviano 09:45, pre simple 11:15, post 13:10 y almuerzo fuerte 14:15/i
  ];
  const collateralFiles = [
    { label: "script.js", text: src },
    { label: "index.html", text: readTextFile(indexHtmlPath) },
    { label: "README.md", text: readTextFile(readmePath) }
  ];
  const staleScheduleHits = [];
  collateralFiles.forEach(({ label, text }) => {
    staleScheduleCopyPatterns.forEach((pattern) => {
      if (pattern.test(text)) staleScheduleHits.push(`${label}:${pattern}`);
    });
  });
  assert(staleScheduleHits.length === 0, `Audit: reapareció copy visible con horarios viejos: ${staleScheduleHits.join(", ")}.`);
  const mandatoryWheyHits = [];
  collateralFiles.forEach(({ label, text }) => {
    forbiddenMandatoryWheyPatterns.forEach((pattern) => {
      if (pattern.test(text)) mandatoryWheyHits.push(`${label}:${pattern}`);
    });
  });
  assert(mandatoryWheyHits.length === 0, `Audit: reapareció copy que vuelve obligatorio el whey: ${mandatoryWheyHits.join(", ")}.`);

  const readmeText = readTextFile(readmePath);
  assert(!/brewco-web\//i.test(readmeText), "Audit: README quedó con nombre de carpeta viejo (brewco-web/).");
  assert(!/09:45|13:10|14:15/.test(readmeText), "Audit: README conserva horarios viejos que ya no coinciden con la app actual.");

  const indexText = readTextFile(indexHtmlPath);
  const swText = readTextFile(serviceWorkerPath);
  const indexAssetVersions = Array.from(indexText.matchAll(/\b(?:styles|script)\.(?:css|js)\?v=([^"']+)/g)).map((match) => match[1]);
  const swAssetVersions = Array.from(swText.matchAll(/\b(?:styles|script)\.(?:css|js)\?v=([^"']+)/g)).map((match) => match[1]);
  const allAssetVersions = new Set([...indexAssetVersions, ...swAssetVersions]);
  assert(indexAssetVersions.length === 2, "Audit: index.html debe cache-bustear styles.css y script.js.");
  assert(swAssetVersions.length === 2, "Audit: sw.js debe precachear styles.css/script.js con cache-bust.");
  assert(allAssetVersions.size === 1, `Audit: index.html y sw.js tienen cache-bust distinto: ${Array.from(allAssetVersions).join(", ")}.`);
  assert(/const\s+VERSION\s*=\s*"v\d+-\d{4}-\d{2}-\d{2}-/.test(swText), "Audit: sw.js debe tener VERSION versionada por fecha.");
}

function auditDayIndexMapping(A) {
  assert(typeof A.getPlanDayIndex === "function", "Audit: falta getPlanDayIndex().");
  const sunday = new Date("2026-06-07T12:00:00");
  const monday = new Date("2026-06-08T12:00:00");
  assert(A.getPlanDayIndex(sunday) === 7, "Audit: domingo debe mapear a dayIndex 7.");
  assert(A.getPlanDayIndex(monday) === 1, "Audit: lunes debe mapear a dayIndex 1.");
  const badSunday = A.allWeeks.flat().find((day) => day.id === "dom" && day.dayIndex !== 7);
  assert(!badSunday, "Audit: los domingos del plan deben usar dayIndex 7.");
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
  const missingProteinTopUp = [];
  const onefitPancakeHits = [];
  const weakFallbackHits = [];
  const riceAltHits = [];
  const sameCarbAltHits = [];
  const riceSequenceHits = [];
  const sameTurnRiceHits = [];
  const nextDayRiceHits = [];
  const missingPrimaryCreatine = [];
  const duplicateMainNameHits = [];
  const sameDayMainAltHits = [];
  const duplicateVisibleNameHits = [];
  const mealIdMismatchHits = [];
  const postLunchVisibleRepeatHits = [];
  const scheduleHits = [];
  const morningLoadHits = [];
  const fridayFishHits = [];
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
      if (/09:45|13:10|14:15/.test(day.tip || "")) {
        scheduleHits.push({ weekNumber, dayNumber, id: day.id, issue: "stale-day-tip", tip: day.tip });
      }

      let hasPrimaryCreatine = false;
      let hasPrimaryWhey = false;
      let hasRiceDay = false;
      const visibleNamesThisDay = new Map();
      const trackVisibleName = (name, slot) => {
        const key = normalizeText(name);
        if (!key) return;
        const previous = visibleNamesThisDay.get(key);
        if (previous) duplicateVisibleNameHits.push({ previous, current: slot });
        else visibleNamesThisDay.set(key, slot);
      };

      day.meals.forEach((meal, mealNumber) => {
        if (!meal.alt || !Array.isArray(meal.alt.foods)) {
          mealsMissingAlt.push({ weekNumber, dayNumber, mealNumber, label: meal.label, name: meal.name });
        }
        const expectedMealId = `w${weekNumber}-${slugForAudit(`${meal.time}-${meal.name}`)}`;
        if (meal.id !== expectedMealId) {
          mealIdMismatchHits.push({ weekNumber, dayNumber, mealNumber, label: meal.label, name: meal.name, id: meal.id, expected: expectedMealId });
        }
        trackVisibleName(meal.name, { weekNumber, dayNumber, mealNumber, label: meal.label, name: meal.name, variant: "primary" });
        if (meal.alt) {
          trackVisibleName(meal.alt.name, { weekNumber, dayNumber, mealNumber, label: meal.label, name: meal.alt.name, variant: "alt" });
        }

        const visible = visibleMealText(meal);
        const mainVisible = visibleMealText({ ...meal, alt: null });
        if (typeof A.hasCreatine === "function" && A.hasCreatine(meal)) hasPrimaryCreatine = true;
        if (typeof A.hasWhey === "function" && A.hasWhey(meal)) hasPrimaryWhey = true;

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

        if (/leche, banana chica y queso en fetas|queso untable con tostadas y fruta/i.test(visible)) {
          weakFallbackHits.push({ weekNumber, dayNumber, mealNumber, label: meal.label, name: meal.name });
        }
        if (/pancakes onefit|pancakes proteicos onefit/i.test(visible)) {
          onefitPancakeHits.push({ weekNumber, dayNumber, mealNumber, label: meal.label, name: meal.name });
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

      const primaryMainNames = new Set(day.meals.filter((meal) => typeof A.isMainMeal === "function" && A.isMainMeal(meal)).map((meal) => normalizeText(meal.name)));
      day.meals.forEach((meal, mealNumber) => {
        if (typeof A.isMainMeal !== "function" || !A.isMainMeal(meal) || !meal.alt) return;
        if (primaryMainNames.has(normalizeText(meal.alt.name))) {
          sameDayMainAltHits.push({ weekNumber, dayNumber, mealNumber, label: meal.label, name: meal.name, alt: meal.alt.name });
        }
      });

      if (!hasPrimaryCreatine) missingPrimaryCreatine.push({ weekNumber, dayNumber, id: day.id, title: day.title });
      const needsWheyTopUp = typeof A.dayNeedsWheyTopUp === "function" ? A.dayNeedsWheyTopUp(day) : false;
      if (needsWheyTopUp && !hasPrimaryWhey) {
        missingProteinTopUp.push({
          weekNumber,
          dayNumber,
          id: day.id,
          title: day.title,
          protein: A.calculateDayTotals(day).p,
          floor: typeof A.getProteinSafetyFloor === "function" ? A.getProteinSafetyFloor(day) : null
        });
      }
      if (day.id === "vie") {
        const fridayLunch = day.meals.find((meal) => /almuerzo/i.test(normalizeText(meal.label)));
        const primaryText = fridayLunch ? visibleMealText({ ...fridayLunch, alt: null }) : "";
        const altText = fridayLunch && fridayLunch.alt ? visibleMealText({ ...fridayLunch.alt, alt: null }) : "";
        if (!fridayLunch || !/salmon|salm[oó]n/i.test(primaryText) || !/atun|at[uú]n|merluza|salmon|salm[oó]n/i.test(altText)) {
          fridayFishHits.push({
            weekNumber,
            dayNumber,
            id: day.id,
            lunch: fridayLunch ? fridayLunch.name : null,
            alt: fridayLunch && fridayLunch.alt ? fridayLunch.alt.name : null
          });
        }
      }
      daySlots.push({ weekNumber, dayNumber, id: day.id, title: day.title, rice: hasRiceDay });

      const totals = A.calculateDayTotals(day);
      const kcal = totals.kcal;
      const isRest = Boolean(day.isRestDay);
      const findMeal = (pattern) => day.meals.find((meal) => pattern.test(normalizeText(meal.label)));
      const breakfast = findMeal(/desayuno/);
      const pre = findMeal(/pre-entreno/);
      const post = findMeal(/post-entreno/);
      const lunch = findMeal(/almuerzo/);
      const snack = findMeal(/merienda/);
      const dinner = findMeal(/cena/);
      const visibleMainBlock = [
        ["post", post],
        ["lunch", lunch],
        ["dinner", dinner]
      ].filter(([, meal]) => meal);
      for (let i = 0; i < visibleMainBlock.length; i++) {
        for (let j = i + 1; j < visibleMainBlock.length; j++) {
          const [leftLabel, leftMeal] = visibleMainBlock[i];
          const [rightLabel, rightMeal] = visibleMainBlock[j];
          const leftVisible = normalizeText(visibleMealText(leftMeal));
          const rightVisible = normalizeText(visibleMealText(rightMeal));
          ["tortilla", "atun", "arroz"].forEach((token) => {
            if (leftVisible.includes(token) && rightVisible.includes(token)) {
              postLunchVisibleRepeatHits.push({
                weekNumber,
                dayNumber,
                id: day.id,
                token,
                leftLabel,
                left: leftMeal.name,
                leftAlt: leftMeal.alt?.name || null,
                rightLabel,
                right: rightMeal.name,
                rightAlt: rightMeal.alt?.name || null
              });
            }
          });
        }
      }

      if (!isRest) {
        const expected = A.TRAINING_DAY_TIMES || {
          breakfast: "09:45",
          pre: "11:15",
          post: "13:10",
          lunch: "14:15",
          snack: "18:00",
          dinner: "21:30",
          night: "23:30"
        };
        if (day.trainingTime !== (A.TRAINING_TIME || "12:00")) {
          scheduleHits.push({ weekNumber, dayNumber, id: day.id, issue: "trainingTime", got: day.trainingTime });
        }
        [
          ["breakfast", breakfast, expected.breakfast],
          ["pre", pre, expected.pre],
          ["post", post, expected.post],
          ["lunch", lunch, expected.lunch],
          ["snack", snack, expected.snack],
          ["dinner", dinner, expected.dinner]
        ].forEach(([slot, meal, time]) => {
          if (!meal || meal.time !== time) {
            scheduleHits.push({ weekNumber, dayNumber, id: day.id, slot, expected: time, got: meal ? meal.time : null });
          }
        });
        const preMorningMeals = day.meals.filter((meal) => meal.time < expected.pre);
        if (preMorningMeals.length !== 1 || !breakfast || breakfast.kcal > 520 || (pre && pre.kcal > 260)) {
          morningLoadHits.push({
            weekNumber,
            dayNumber,
            id: day.id,
            breakfastKcal: breakfast ? breakfast.kcal : null,
            preKcal: pre ? pre.kcal : null,
            preMorningMeals: preMorningMeals.map((meal) => `${meal.time} ${meal.label}`)
          });
        }
      } else {
        const expected = A.REST_DAY_TIMES || {
          breakfast: "10:00",
          lunch: "13:30",
          snack: "17:30",
          dinner: "21:30",
          night: "23:30"
        };
        if (day.trainingTime) scheduleHits.push({ weekNumber, dayNumber, id: day.id, issue: "rest-trainingTime", got: day.trainingTime });
        [
          ["breakfast", breakfast, expected.breakfast],
          ["lunch", lunch, expected.lunch],
          ["snack", snack, expected.snack],
          ["dinner", dinner, expected.dinner]
        ].forEach(([slot, meal, time]) => {
          if (!meal || meal.time !== time) {
            scheduleHits.push({ weekNumber, dayNumber, id: day.id, slot, expected: time, got: meal ? meal.time : null });
          }
        });
      }
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

  const namesByWeek = new Map();
  mainSlots.forEach((slot) => {
    const key = `${slot.weekNumber}:${normalizeText(slot.name)}`;
    const previous = namesByWeek.get(key);
    if (previous) duplicateMainNameHits.push({ previous, current: slot });
    else namesByWeek.set(key, slot);
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
  summarize("missingProteinTopUp", missingProteinTopUp);
  summarize("onefitPancakeHits", onefitPancakeHits);
  summarize("riceAltHits", riceAltHits);
  summarize("sameCarbAltHits", sameCarbAltHits);
  summarize("riceSequenceHits", riceSequenceHits);
  summarize("sameTurnRiceHits", sameTurnRiceHits);
  summarize("nextDayRiceHits", nextDayRiceHits);
  summarize("missingPrimaryCreatine", missingPrimaryCreatine);
  summarize("duplicateMainNameHits", duplicateMainNameHits);
  summarize("sameDayMainAltHits", sameDayMainAltHits);
  summarize("duplicateVisibleNameHits", duplicateVisibleNameHits);
  summarize("mealIdMismatchHits", mealIdMismatchHits);
  summarize("postLunchVisibleRepeatHits", postLunchVisibleRepeatHits);
  summarize("scheduleHits", scheduleHits);
  summarize("morningLoadHits", morningLoadHits);
  summarize("fridayFishHits", fridayFishHits);

  assert(mealsMissingAlt.length === 0, `Audit: faltan opciones B (alt) en ${mealsMissingAlt.length} comidas.`);
  assert(dayTipHits.length === 0, `Audit: hay tips con ingredientes bloqueados (${dayTipHits.length}).`);
  assert(bannedHits.length === 0, `Audit: aparecen ingredientes bloqueados en el menú (${bannedHits.length}).`);
  assert(specialHits.length === 0, `Audit: quedaron comidas "muy especiales" (${specialHits.length}).`);
  assert(missingProteinTopUp.length === 0, `Audit: faltan rescates de whey en días que quedan cortos de proteína (${missingProteinTopUp.length}).`);
  assert(onefitPancakeHits.length === 0, `Audit: el menú renderizado recayó en pancakes OneFit en vez de panqueques caseros (${onefitPancakeHits.length}).`);
  assert(weakFallbackHits.length === 0, `Audit: el menú renderizado dejó fallback flojo en desayuno/merienda (${weakFallbackHits.length}).`);
  assert(riceAltHits.length === 0, `Audit: hay opciones B de almuerzo/cena con arroz (${riceAltHits.length}).`);
  assert(sameCarbAltHits.length === 0, `Audit: hay opciones B con el mismo carbo principal (${sameCarbAltHits.length}).`);
  assert(riceSequenceHits.length === 0, `Audit: hay arroz consecutivo entre almuerzo/cena (${riceSequenceHits.length}).`);
  assert(sameTurnRiceHits.length === 0, `Audit: hay arroz en el mismo turno de días seguidos (${sameTurnRiceHits.length}).`);
  assert(nextDayRiceHits.length === 0, `Audit: hay arroz en almuerzo/cena en días seguidos (${nextDayRiceHits.length}).`);
  assert(missingPrimaryCreatine.length === 0, `Audit: faltan creatinas diarias principales (${missingPrimaryCreatine.length}).`);
  assert(duplicateMainNameHits.length === 0, `Audit: hay platos principales repetidos en la misma semana (${duplicateMainNameHits.length}).`);
  assert(sameDayMainAltHits.length === 0, `Audit: hay opciones B iguales a otro plato principal del mismo dia (${sameDayMainAltHits.length}).`);
  assert(duplicateVisibleNameHits.length === 0, `Audit: hay platos visibles repetidos en el mismo dia (${duplicateVisibleNameHits.length}).`);
  assert(mealIdMismatchHits.length === 0, `Audit: hay IDs de comida desincronizados con nombre/hora (${mealIdMismatchHits.length}).`);
  assert(postLunchVisibleRepeatHits.length === 0, `Audit: post/almuerzo/cena repiten tortilla/atun/arroz visible en el mismo dia (${postLunchVisibleRepeatHits.length}).`);
  assert(scheduleHits.length === 0, `Audit: horarios nuevos de entreno 12:00 fallaron (${scheduleHits.length}).`);
  assert(morningLoadHits.length === 0, `Audit: la manana de gym quedo muy cargada (${morningLoadHits.length}).`);
  assert(fridayFishHits.length === 0, `Audit: el viernes debe tener salmon principal y opcion B de pescado (${fridayFishHits.length}).`);
  assert(kcalOutliers.length === 0, `Audit: hay días fuera del rango kcal confort (${kcalOutliers.length}).`);

  return { kcalOutliers, mealsMissingAlt, bannedHits, specialHits, dayTipHits, missingProteinTopUp, onefitPancakeHits, riceAltHits, sameCarbAltHits, riceSequenceHits, sameTurnRiceHits, nextDayRiceHits, missingPrimaryCreatine, duplicateMainNameHits, sameDayMainAltHits, duplicateVisibleNameHits, mealIdMismatchHits, postLunchVisibleRepeatHits, scheduleHits, morningLoadHits, fridayFishHits };
}

function main() {
  const src = readAppScript();
  auditSourceQuality(src);
  const { prelude, marker } = sliceForAudit(src);
  const code = buildAuditPrelude(prelude);
  const A = runPrelude(code);
  auditDayIndexMapping(A);
  applyRules(A);
  audit(A);

  console.log(`AUDIT OK — menú limpio y balanceado (corte: ${marker})`);
}

main();
