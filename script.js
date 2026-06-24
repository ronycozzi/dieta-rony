// =====================================================
// DIETA RONY COZZI · 78-80kg · Ectomorfo
// Plan de mantenimiento + recomposición
// Menús rotativos: 4 semanas distintas, auto-actualiza
// Almuerzo y cena con opción B al toque
// =====================================================

const WATER_GOAL = 10;
const WATER_REMINDER_INTERVAL_MIN = 90;
const WATER_REMINDER_START_MIN = 9 * 60;
const WATER_REMINDER_END_MIN = 21 * 60;
const STORAGE = {
  meals:           "rony-dieta-meals",
  water:           "rony-dieta-water",
  shopping:        "rony-dieta-shopping",
  shoppingPanel:   "rony-dieta-shopping-panel",
  streak:          "rony-dieta-streak",
  weight:          "rony-dieta-weight",
  fridayMode:      "rony-dieta-friday-mode",
  planWeek:        "rony-dieta-plan-week",
  weightSeeded:    "weight-seeded"
};
const APP_BUILD = "2026-06-24-weekshift";
const MENU_ROTATION_CORRECTION_START = "2026-06-15";
const MENU_ROTATION_CORRECTION_OFFSET = 1;

// =====================================================
// HELPERS
// =====================================================
function meal(time, label, name, desc, _kcalLegacy, foods, prep, note, alt) {
  const safeFoods = Array.isArray(foods) ? foods : [];
  const safePrep = Array.isArray(prep) ? prep : [];
  const computedKcal = Math.round(safeFoods.reduce((sum, f) => sum + f.p * 4 + f.c * 4 + f.g * 9, 0));
  return { id: slug(`${time}-${name}`), time, label, name, desc, kcal: computedKcal, foods: safeFoods, prep: safePrep, note: note || null, alt: alt || null };
}

function altMeal(name, desc, foods, prep) {
  const safeFoods = Array.isArray(foods) ? foods : [];
  const safePrep = Array.isArray(prep) ? prep : [];
  const computedKcal = Math.round(safeFoods.reduce((sum, f) => sum + f.p * 4 + f.c * 4 + f.g * 9, 0));
  return { name, desc, kcal: computedKcal, foods: safeFoods, prep: safePrep };
}

function food(name, p, c, g) {
  return { name, p, c, g };
}

function slug(value) {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function formatLocalDateKey(date) {
  const d = date || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTodayKey() {
  return formatLocalDateKey(new Date());
}

function getPlanWeekStart(date = new Date()) {
  const d = new Date(date);
  const dayNumber = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (dayNumber - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMenuRotationCorrection(date = new Date()) {
  const weekStartKey = formatLocalDateKey(getPlanWeekStart(date));
  return weekStartKey >= MENU_ROTATION_CORRECTION_START ? MENU_ROTATION_CORRECTION_OFFSET : 0;
}

function getPlanDayIndex(date = new Date()) {
  const dayIdx = date.getDay();
  return dayIdx === 0 ? 7 : dayIdx;
}

function cleanupOldData() {
  try {
    const today = new Date();
    const cutoff = new Date(today);
    cutoff.setDate(today.getDate() - 60);
    const cutoffKey = formatLocalDateKey(cutoff);
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("goal-celebrated-")) {
        const dateStr = key.slice("goal-celebrated-".length);
        if (dateStr < cutoffKey) keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    const meals = readJsonStorage(STORAGE.meals, {});
    let mealsChanged = false;
    Object.keys(meals).forEach((date) => {
      if (date < cutoffKey) { delete meals[date]; mealsChanged = true; }
    });
    if (mealsChanged) localStorage.setItem(STORAGE.meals, JSON.stringify(meals));
  } catch (e) {}
}

function sumMacros(meals) {
  return meals.reduce((acc, m) => {
    m.foods.forEach((f) => { acc.p += f.p; acc.c += f.c; acc.g += f.g; });
    acc.kcal += m.kcal;
    return acc;
  }, { kcal: 0, p: 0, c: 0, g: 0 });
}

// =====================================================
// SEMANA ROTATIVA · Elige menú según número de semana ISO
// Semana 1 → 2 → 3 → 4 → 1 → 2 → ... automáticamente
// =====================================================
function getISOWeekNumber(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}


// =====================================================
// DATOS · 4 SEMANAS DE MENÚ DISTINTO
// =====================================================
const allWeeks = [

// ╔══════════════════════════════════════╗
// ║  SEMANA 1 · "Mediterránea"           ║
// ╚══════════════════════════════════════╝
[
  // ===== LUNES · PECHO + TRÍCEPS =====
  {
    id: "lun", tab: "Lun", dayIndex: 1, title: "Lunes",
    type: "Día de gym · Pecho + tríceps",
    workout: { name: "Pecho · Tríceps", duration: "60 min", icon: "🏋️", primary: ["Pecho", "Tríceps"] },
    isRestDay: false, kcal: 2900, protein: 170, carbs: 330, fats: 80,
    tags: ["Pecho", "Tríceps", "Mantenimiento"],
    tip: "Día de empuje. Desayuná bien — carbo real (papa, pan, fruta) te da energía sostenida para las series pesadas de pecho. Si terminás el entreno con hambre real, sumá un refuerzo simple antes de dormir.",
    meals: [
      meal("10:00", "Desayuno", "Tostadas integrales con banana, manteca de maní y miel", "2 tostadas integrales · banana · 2 cdas manteca de maní · miel · leche", 0, [
        food("2 tostadas integrales", 7, 40, 4),
        food("1 banana madura", 1, 27, 0),
        food("2 cdas manteca de maní", 8, 6, 16),
        food("1 cda miel", 0, 17, 0),
        food("200ml leche entera", 6, 10, 7)
      ], [
        "Calentá la leche en el microondas 2 min y tostá el pan aparte.",
        "Cortá la banana en rodajas. Poné encima la manteca de maní y bañá con miel. El combo banana+leche+maní da energía sostenida para 3-4 horas de entreno.",
        "Tomá un café negro al lado para el boost de cafeína pre-gym si entrás cerca."
      ], "pan integral = energía de liberación lenta. Ideal para ectomorfos que entrenan al mediodía."),

      meal("11:30", "Media mañana", "Tostadas con queso fresco, tomate seco y orégano", "2 tostadas · queso fresco · tomate seco · orégano", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("60g queso fresco en fetas", 7, 1, 6),
        food("30g tomates secos en aceite", 1, 4, 4),
        food("Té o mate sin azúcar", 0, 0, 0)
      ], [
        "Tostá el pan al gusto. Poné las fetas de queso sobre la tostada caliente para que se ablanden un poco.",
        "Escurrí los tomates secos del aceite y poné encima. Agregá orégano, un hilo de oliva y pimienta negra."
      ], null),

      meal("12:30", "Pre-entreno", "Banana + pasas de uva", "Carbo rápido · cero grasa", 0, [
        food("1 banana madura", 1, 27, 0),
        food("35g pasas de uva", 1, 27, 0)
      ], [
        "Comelo 40-60 min antes del gym. Glucosa rápida de las pasas + carbos sostenidos de la banana.",
        "Nada de grasas ahora — enlentecen la digestión y podés sentir pesadez en el press."
      ], "Glucosa rápida para el press de banca pesado."),

      meal("14:30", "Post-entreno", "Shake proteico + banana + creatina", "1 scoop whey · banana · creatina · leche", 0, [
        food("1 scoop whey protein", 25, 2, 2),
        food("1 banana", 1, 27, 0),
        food("200ml leche entera", 6, 10, 7),
        food("5g creatina monohidrato", 0, 0, 0)
      ], [
        "Licuá whey + banana + leche + creatina. Tomalo dentro de los 45 min post-entreno.",
        "La creatina no tiene efecto sin constancia — tomala TODOS los días aunque no entrenes."
      ], null),

      meal("16:00", "Almuerzo", "Pollo a la mostaza con arroz y brócoli", "200g pechuga · arroz · brócoli al vapor · ensalada", 0, [
        food("200g pechuga de pollo", 62, 0, 6),
        food("1 taza arroz blanco cocido", 4, 50, 0),
        food("150g brócoli al vapor", 4, 7, 0),
        food("1 cda aceite de oliva", 0, 0, 14),
        food("1 cda mostaza de Dijon", 1, 1, 0)
      ], [
        "Salpimentá la pechuga. En sartén con oliva a fuego medio-alto, sellá 4 min por lado hasta dorar.",
        "Mezclá 1 cda mostaza + 1 cda miel + ajo en polvo y bañá el pollo en los últimos 2 min de cocción.",
        "Serví con arroz y brócoli al vapor. La mostaza + miel le da sabor sin sumar grasas."
      ], "Variá la mostaza: granulada, de Dijon o criolla cambian el sabor completamente.",
      altMeal("Milanesa de carne con puré de papa", "180g bife rebozado · puré cremoso · ensalada verde", [
        food("180g bife rebozado al horno", 40, 10, 10),
        food("Puré de papa con oliva", 3, 35, 6),
        food("Ensalada de lechuga y tomate", 2, 6, 0)
      ], [
        "Rebozá el bife con huevo + pan rallado + ajo y perejil. Horneá a 200°C por 18 min dando vuelta a mitad.",
        "Para el puré: papas hervidas pisadas con oliva, sal y pizca de nuez moscada. Sin manteca — igual queda cremoso con oliva."
      ])),

      meal("19:30", "Merienda", "queso untable con granola, banana y miel", "200g queso untable · granola · banana · miel", 0, [
        food("200g queso untable natural", 20, 8, 10),
        food("30g granola sin azúcar", 3, 20, 4),
        food("1 banana", 1, 27, 0),
        food("1 cdita miel", 0, 8, 0)
      ], [
        "Poné el queso untable en el bol. Cortá la banana en rodajas arriba.",
        "Esparcí la granola y rociá con miel. El queso untable tiene el doble de proteína que el queso untable común."
      ], null),

      meal("22:00", "Cena", "Fideos al tuco casero con carne molida", "80g fideos · 150g carne magra · tomate triturado · queso", 0, [
        food("80g fideos secos (tallarines)", 10, 58, 2),
        food("150g carne molida magra", 30, 0, 12),
        food("200ml tomate triturado", 2, 10, 0),
        food("1 cda aceite de oliva", 0, 0, 14),
        food("20g queso rallado", 4, 0, 6)
      ], [
        "Dorá la carne molida con ajo y cebolla picada en un hilo de oliva. Agregá tomate triturado + orégano + sal. Cociná 10 min.",
        "Herví los fideos al dente (1 min menos que lo indicado). Mezclá con el tuco.",
        "Serví con queso rallado encima. Cena diferente al almuerzo: carbo distinto (pasta), proteína mezclada."
      ], null,
      altMeal("Wraps de lechuga con pollo y arroz", "Hojas de lechuga · pollo salteado · arroz · palta · soja", [
        food("160g pechuga en cubos", 50, 0, 5),
        food("3/4 taza arroz cocido", 3, 37, 0),
        food("4 hojas lechuga mantecosa", 1, 3, 0),
        food("1/4 palta", 1, 5, 8),
        food("1 cda salsa de soja", 1, 1, 0)
      ], [
        "Salteá el pollo en cubos con ajo, jengibre rallado y salsa de soja 5 min.",
        "Armá los wraps poniendo arroz + pollo + palta en cada hoja de lechuga. Enrollá y comé de un mordisco."
      ])),

      meal("23:30", "Antes de dormir", "queso untable con miel (opcional)", "100g queso untable · miel · caseína natural", 0, [
        food("100g queso untable", 11, 3, 4),
        food("1 cdita miel", 0, 8, 0)
      ], [
        "Mezclá el queso untable con la miel. El queso untable tiene caseína — proteína de digestión lenta, ideal antes de dormir.",
        "Solo si llegaste corto de proteína en el día. Si ya cumpliste los 170g, podés saltearlo."
      ], "Opcional. Saltealo si llegaste a la proteína del día.")
    ]
  },

  // ===== MARTES · ESPALDA + BÍCEPS =====
  {
    id: "mar", tab: "Mar", dayIndex: 2, title: "Martes",
    type: "Día de gym · Espalda + bíceps",
    workout: { name: "Espalda · Bíceps", duration: "60 min", icon: "🏋️", primary: ["Espalda", "Bíceps"] },
    isRestDay: false, kcal: 2950, protein: 175, carbs: 335, fats: 80,
    tags: ["Espalda", "Bíceps", "Tirón pesado"],
    tip: "Espalda consume mucho glucógeno. Las dominadas y el remo piden energía. Si llegás débil a la barra, faltó carbo en el pre-entreno.",
    meals: [
      meal("10:00", "Desayuno", "Tostadas francesas con canela y banana", "2 rebanadas · 2 huevos · leche · canela · banana · miel", 0, [
        food("2 rebanadas pan integral", 8, 30, 2),
        food("2 huevos enteros", 12, 0, 10),
        food("100ml leche entera", 3, 5, 4),
        food("1 banana", 1, 27, 0),
        food("1 cda miel", 0, 17, 0)
      ], [
        "Batí 2 huevos con 100ml leche, 1 cdita canela y una pizca de sal. Remojá el pan 10 segundos de cada lado.",
        "Cocinalo en sartén con 1 cdita manteca a fuego medio, 2 min por lado hasta dorar.",
        "Serví con banana en rodajas y un hilo de miel."
      ], null),

      meal("11:30", "Media mañana", "Sándwich de atún con palta y tomate", "Pan · atún natural · palta · tomate · limón", 0, [
        food("2 rodajas pan integral", 8, 28, 2),
        food("1 lata atún al natural (170g)", 28, 0, 2),
        food("1/4 palta", 1, 5, 8),
        food("1 tomate mediano", 1, 5, 0)
      ], [
        "Escurrí bien el atún. Pisá la palta con limón y sal hasta que quede tipo crema.",
        "Untá la palta en el pan, poné el atún desmenuzado y las rodajas de tomate."
      ], null),

      meal("12:30", "Pre-entreno", "Banana + miel + tostada", "Carbo rápido reforzado para espalda", 0, [
        food("1 banana", 1, 27, 0),
        food("1 cda miel", 0, 17, 0),
        food("1 tostada integral", 4, 14, 1)
      ], [
        "Espalda pide más carbo que pecho — sumamos la tostada. Comelo 40 min antes.",
        "La miel da glucosa explosiva para las dominadas y el remo."
      ], null),

      meal("14:30", "Post-entreno", "Shake proteico + banana + creatina", "Whey · banana · creatina · leche", 0, [
        food("1 scoop whey", 25, 2, 2),
        food("1 banana", 1, 27, 0),
        food("200ml leche", 6, 10, 7),
        food("5g creatina", 0, 0, 0)
      ], [
        "Shake post-espalda. Tomalo dentro de 45 min.",
        "Podés agregar 1 cdita de cacao amargo si querés sabor diferente."
      ], null),

      meal("16:00", "Almuerzo", "Arroz frito con pollo y verduras (chaufa)", "190g pollo · arroz · choclo · zanahoria · soja", 0, [
        food("190g pechuga en tiras", 59, 0, 6),
        food("1 taza arroz blanco cocido", 4, 50, 0),
        food("1/2 taza choclo", 2, 18, 1),
        food("1/2 zanahoria rallada", 0, 5, 0),
        food("1 cda salsa de soja", 1, 1, 0),
        food("1 cda aceite de girasol", 0, 0, 14)
      ], [
        "En wok o sartén amplia a fuego fuerte, salteá el pollo en tiras con ajo y jengibre 4 min.",
        "Sumá el arroz cocido (del día anterior queda mejor), el choclo y la zanahoria. Salteá 3 min.",
        "Bañá con salsa de soja y un toque de aceite de sésamo si tenés. El arroz frito absorbe los sabores y queda totalmente distinto al arroz hervido."
      ], null,
      altMeal("Cazuela criolla de pollo con papas", "170g pollo · papas · zanahoria · caldo · pimentón", [
        food("170g muslo de pollo deshuesado", 34, 0, 9),
        food("2 papas medianas", 4, 40, 0),
        food("1 zanahoria", 1, 10, 0),
        food("Caldo de verduras", 1, 3, 0)
      ], [
        "Doré el pollo en dados con cebolla y pimentón. Sumá papas en cubos, zanahoria y caldo.",
        "Tapá y cociná 20 min a fuego medio hasta que las papas estén tiernas. Un plato que calienta el cuerpo y repone glucógeno."
      ])),

      meal("19:30", "Merienda", "Pan con manteca de maní, banana y leche", "2 tostadas · manteca de maní · banana · vaso de leche", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("2 cdas manteca de maní", 8, 6, 16),
        food("1 banana", 1, 27, 0),
        food("250ml leche entera", 8, 12, 9)
      ], [
        "Untá la manteca de maní sobre las tostadas. Cortá la banana en rodajas arriba.",
        "Tomá el vaso de leche al lado. Es la merienda más calórica del día — perfecta para el ectomorfo que necesita densidad calórica."
      ], null),

      meal("22:00", "Cena", "Tortilla española con ensalada verde", "3 huevos · 2 papas · cebolla · aceite · ensalada", 0, [
        food("3 huevos enteros", 18, 0, 15),
        food("2 papas medianas hervidas", 4, 40, 0),
        food("1/2 cebolla", 1, 5, 0),
        food("1 cda aceite de oliva", 0, 0, 14),
        food("Ensalada rúcula + tomate", 2, 6, 0)
      ], [
        "Hervite las papas en cubos 10 min hasta que estén tiernas. Escurrí bien.",
        "Sofreí la cebolla en oliva hasta transparente. Batí los huevos, sumá papa y cebolla, salpimentá.",
        "En sartén antiadherente a fuego bajo, volcá la mezcla. Cociná 5 min tapado, deslizá en un plato, invertí y terminá 3 min del otro lado."
      ], null,
      altMeal("Bife al chimichurri con batata asada", "180g bife · batata · chimichurri casero · ensalada", [
        food("180g bife de vacío o cuadrada", 40, 0, 12),
        food("200g batata asada", 4, 48, 0),
        food("Chimichurri casero", 0, 2, 8),
        food("Ensalada verde", 2, 5, 0)
      ], [
        "Asá la batata en el horno a 200°C por 35 min envuelta en papel aluminio.",
        "Grillá el bife 3-4 min por lado. Bañá con chimichurri (perejil + ajo + orégano + oliva + limón) y serví."
      ])),

      meal("23:30", "Antes de dormir", "Shake nocturno o queso untable", "Proteína de digestión lenta", 0, [
        food("1 scoop whey con leche entera o 100g queso untable", 25, 8, 6)
      ], [
        "Si llegaste corto de proteína: shake con leche entera (caseína natural + whey).",
        "Alternativa sin batidora: 100g queso untable con 1 cdita miel. Proteína lenta ideal antes de dormir."
      ], "Opcional según proteína del día.")
    ]
  },

  // ===== MIÉRCOLES · HOMBROS =====
  {
    id: "mie", tab: "Mié", dayIndex: 3, title: "Miércoles",
    type: "Día de gym · Hombros",
    workout: { name: "Hombros · Abdomen", duration: "55 min", icon: "🏋️", primary: ["Hombros"] },
    isRestDay: false, kcal: 2850, protein: 165, carbs: 320, fats: 78,
    tags: ["Hombros", "Abdomen", "Mantenimiento"],
    tip: "Hombros es un grupo relativamente pequeño pero muy técnico. El press militar y los laterales piden buena hidratación. Asegurate de tomar 2-3 vasos antes de ir.",
    meals: [
      meal("10:00", "Desayuno", "panqueques de banana y banana con miel", "2 panqueques · pan integral · banana · huevo · miel · leche", 0, [
        food("2 tostadas integrales", 6, 33, 3),
        food("1 banana madura", 1, 27, 0),
        food("2 huevos", 12, 0, 10),
        food("100ml leche entera", 3, 5, 4),
        food("1 cda miel", 0, 17, 0)
      ], [
        "Licuá banana + leche + 2 huevos + 100ml leche hasta que no queden grumos. Dejá reposar 2 min.",
        "En sartén antiadherente con aceite en aerosol, volcá porciones a fuego medio. 2 min cada lado.",
        "Apilá los panqueques y bañá con miel. Podés agregar banana extra en rodajas arriba."
      ], "Más saciantes que las tostadas comunes. Los panqueques de banana dan energía por horas."),

      meal("11:30", "Media mañana", "Tostadas con palta, huevo duro y semillas", "2 tostadas · palta · huevo duro · semillas de chía", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("1/4 palta", 1, 5, 8),
        food("1 huevo duro", 6, 0, 5),
        food("1 cdita semillas de chía", 1, 2, 2),
        food("Jugo de limón", 0, 1, 0)
      ], [
        "Pisá la palta con limón, sal y pimienta. Untá sobre las tostadas.",
        "Cortá el huevo duro en rodajas encima. Esparcí chía y un toque de pimentón ahumado."
      ], null),

      meal("12:30", "Pre-entreno", "Banana + dátiles", "Glucosa de liberación media", 0, [
        food("1 banana", 1, 27, 0),
        food("30g dátiles (4-5 unidades)", 0, 22, 0)
      ], [
        "Los dátiles son energía concentrada en pequeño volumen. Comelos junto con la banana.",
        "Hidratate bien — 2 vasos grandes de agua antes de salir al gym."
      ], null),

      meal("14:30", "Post-entreno", "Shake proteico + banana + creatina", "Whey · banana · leche · creatina", 0, [
        food("1 scoop whey", 25, 2, 2),
        food("1 banana", 1, 27, 0),
        food("200ml leche", 6, 10, 7),
        food("5g creatina", 0, 0, 0)
      ], ["Shake estándar post-entreno. Tomalo rápido y comé el almuerzo a las 16:00 normalmente."], null),

      meal("16:00", "Almuerzo", "Pollo al horno con batata y morrones", "200g pollo · batata · morrón rojo · cebolla · oliva", 0, [
        food("200g muslo deshuesado o pechuga", 50, 0, 9),
        food("200g batata", 4, 48, 0),
        food("1 morrón rojo", 1, 8, 0),
        food("1/2 cebolla", 1, 5, 0),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "Cortá el pollo, batata en rodajas, morrón y cebolla en trozos. Mezcló todo con oliva, sal, orégano y pimentón.",
        "Volcá en bandeja y horneá a 200°C por 30-35 min hasta que el pollo esté dorado y la batata tierna.",
        "El asado al horno en bandeja es el método más simple — todo junto, sin lavar mil cosas."
      ], "La batata es carbo de absorción lenta, más nutritivo y versátil que la papa.",
      altMeal("Peceto al horno con arroz integral", "180g peceto · arroz integral · zucchini · romero", [
        food("180g peceto", 47, 0, 6),
        food("3/4 taza arroz integral cocido", 3, 37, 1),
        food("1 zucchini", 1, 6, 0),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "Salpimentá el peceto con romero y ajo. Sellá en sartén caliente 3 min y pasá al horno 200°C por 20 min.",
        "Hervite el arroz integral (25-30 min). Salteá el zucchini en rodajas en oliva 4 min."
      ])),

      meal("19:30", "Merienda", "Licuado proteico verde", "Banana · espinaca · leche · whey · miel", 0, [
        food("1 banana", 1, 27, 0),
        food("1 puñado espinaca fresca", 1, 2, 0),
        food("1 scoop whey vainilla", 25, 2, 2),
        food("250ml leche entera", 8, 12, 9),
        food("1 cdita miel", 0, 8, 0)
      ], [
        "Licuá todo junto. La espinaca no se nota en el sabor pero suma hierro y fibra.",
        "Si querés más espesor, sumá unos cubos de hielo."
      ], null),

      meal("22:00", "Cena", "Pizza de masa integral con mozzarella y vegetales", "Masa integral · mozzarella · tomate · morrón · rúcula", 0, [
        food("1 prepizza integral (200g)", 12, 54, 4),
        food("100g mozzarella", 18, 2, 14),
        food("100ml tomate triturado", 1, 5, 0),
        food("1/2 morrón asado", 0, 4, 0),
        food("Rúcula fresca", 1, 2, 0)
      ], [
        "Precalentá el horno a 220°C. Untá la prepizza con tomate triturado condimentado con orégano y ajo.",
        "Cubrí con mozzarella desmenuzada y el morrón. Horneá 12-15 min hasta que los bordes doren.",
        "Al sacarla, poné la rúcula fresca arriba con un toque de oliva — contraste perfecto entre caliente y fresco."
      ], null,
      altMeal("Rigatoni con salsa de queso untable y pollo", "80g pasta · pechuga · queso untable · ajo · perejil", [
        food("80g rigatoni secos", 10, 58, 2),
        food("150g pechuga en tiras", 47, 0, 5),
        food("4 cdas queso untable", 12, 4, 7),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "Herví los rigatoni al dente. Salteá el pollo en tiras con ajo y oliva 5 min.",
        "Mezclá la pasta con el pollo. Apagá el fuego y agregá queso untable + perejil + sal, revolviendo hasta que se integre."
      ])),

      meal("23:30", "Antes de dormir", "queso untable con miel", "Caseína lenta · sueño reparador", 0, [
        food("100g queso untable", 11, 3, 4),
        food("1 cdita miel", 0, 8, 0)
      ], ["Solo si llegaste corto de proteína en el día."], "Opcional.")
    ]
  },

  // ===== JUEVES · PIERNAS =====
  {
    id: "jue", tab: "Jue", dayIndex: 4, title: "Jueves",
    type: "Día de gym · Piernas (día más pesado)",
    workout: { name: "Piernas", duration: "70 min", icon: "🦵", primary: ["Cuádriceps", "Isquios", "Glúteos"] },
    isRestDay: false, kcal: 3100, protein: 180, carbs: 360, fats: 85,
    tags: ["Piernas", "Día más pesado", "+200 kcal"],
    tip: "Piernas es el día más demandante. +200 kcal vs los demás días. Las sentadillas y el peso muerto queman glucógeno en cantidad — si llegás débil a la segunda serie, comiste poco en el pre.",
    meals: [
      meal("10:00", "Desayuno", "Revuelto de huevos con papa, jamón y queso", "3 huevos · papa · jamón natural · queso · tostadas", 0, [
        food("3 huevos enteros", 18, 0, 15),
        food("1 papa mediana hervida en cubos", 2, 20, 0),
        food("60g jamón natural magro", 12, 0, 4),
        food("30g queso rallado", 6, 0, 9),
        food("2 tostadas integrales", 8, 28, 2),
        food("Jugo de naranja 200ml", 2, 22, 0)
      ], [
        "Cortá la papa en cubos chicos y herví 8 min. Doré en sartén con aceite hasta que quede crocante.",
        "Sumá el jamón en tiritas y los huevos batidos. Revolvé a fuego medio hasta casi cuajar, apagá y terminá con el queso rallado.",
        "Serví con tostadas y el jugo. El desayuno más nutritivo de la semana para el día de piernas."
      ], "Máximo combustible para sentadillas y peso muerto."),

      meal("11:30", "Media mañana", "Sándwich de pavita con queso y palta", "Pan · pavita · queso fresco · palta · tomate · mostaza", 0, [
        food("2 rodajas pan integral", 8, 28, 2),
        food("80g pavita o pollo feteado", 19, 0, 2),
        food("40g queso fresco", 5, 1, 4),
        food("1/4 palta", 1, 5, 8),
        food("1 tomate", 1, 5, 0)
      ], [
        "Untá una rodaja con palta pisada y la otra con mostaza.",
        "Armá con pavita + queso + tomate en rodajas. Cortá al medio."
      ], null),

      meal("12:30", "Pre-entreno", "Banana + pasas + miel", "Triple carbo para el día más pesado", 0, [
        food("1 banana grande", 1, 30, 0),
        food("35g pasas de uva", 1, 27, 0),
        food("1 cda miel", 0, 17, 0)
      ], [
        "El triple carbo: banana (sostenido) + pasas (explosivo) + miel (instantáneo).",
        "Comelo 45-60 min antes de las sentadillas. No negociable — piernas vacías = mal entreno."
      ], "Pre-entreno reforzado. Día de piernas exige más glucosa que cualquier otro día."),

      meal("14:30", "Post-entreno", "Shake reforzado post-piernas", "2 scoops whey · banana · leche · creatina · pasas", 0, [
        food("2 scoops whey protein", 50, 4, 4),
        food("1 banana grande", 1, 30, 0),
        food("200ml leche entera", 6, 10, 7),
        food("5g creatina", 0, 0, 0),
        food("20g pasas de uva", 0, 16, 0)
      ], [
        "Post-piernas usamos 2 scoops — el desgaste muscular es mucho mayor que en los días de tren superior.",
        "Licuá con leche, banana y creatina. Si no tenés hambre (es normal después de piernas pesadas), tomá el shake igual — el músculo lo necesita."
      ], "2 scoops solo hoy. El resto de la semana, 1 alcanza."),

      meal("16:00", "Almuerzo", "Lomo al horno con papas rústicas y ensalada", "180g lomo · papas al horno · pimiento asado · ensalada", 0, [
        food("180g lomo de res", 47, 0, 8),
        food("250g papas rústicas al horno", 5, 50, 4),
        food("1 morrón asado", 1, 8, 0),
        food("Ensalada mixta", 2, 6, 0),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "Cortá las papas en gajos sin pelar, condimentá con oliva + sal + romero + ajo. Horneá 25 min a 200°C.",
        "Mientras, sellá el lomo en sartén muy caliente 3 min por lado. Dejá reposar 5 min antes de cortar.",
        "El reposo es clave — los jugos se redistribuyen y la carne queda tierna."
      ], "Lomo + papas al horno: almuerzo de recuperación total para el día más demandante.",
      altMeal("Cazuela de arroz con carne y verduras", "150g carne · arroz · zapallo · zanahoria · caldo", [
        food("150g carne magra en cubos", 39, 0, 12),
        food("1 taza arroz blanco", 4, 50, 0),
        food("100g zapallo", 1, 8, 0),
        food("1 zanahoria", 1, 10, 0),
        food("Caldo de carne bajo sodio", 1, 2, 0)
      ], [
        "Dorá la carne en cubos con cebolla y ajo. Sumá zanahoria, zapallo en cubos y el arroz.",
        "Cubrí con caldo y cociná 20 min tapado a fuego medio hasta que el arroz absorba el caldo."
      ])),

      meal("19:30", "Merienda", "Panqueques con miel y manteca de maní", "2 panqueques · banana · manteca de maní · miel · leche", 0, [
        food("2 panqueques proteicos caseros", 10, 28, 6),
        food("1 banana", 1, 27, 0),
        food("2 cdas manteca de maní", 8, 6, 16),
        food("1 cda miel", 0, 17, 0),
        food("200ml leche entera", 6, 10, 7)
      ], [
        "Merienda densa para el día de piernas — necesitás reponer lo que gastaste.",
        "Hacé los panqueques de banana simples (2 tostadas integrales + 1 huevo + leche) y rellená con manteca de maní y banana."
      ], null),

      meal("22:00", "Cena", "Arroz con pollo cremoso al limón", "180g pollo · arroz · caldo · crema light · limón", 0, [
        food("180g pechuga", 56, 0, 5),
        food("1 taza arroz cocido", 4, 50, 0),
        food("3 cdas crema light", 2, 2, 7),
        food("Jugo de 1 limón", 0, 3, 0),
        food("Caldo de verduras", 1, 2, 0)
      ], [
        "Cortá el pollo en cubos, doré con ajo y cebolla. Agregá el caldo y cociná 10 min.",
        "Incorporá el arroz cocido, la crema light y el jugo de limón. Revolvé 3 min a fuego bajo.",
        "El limón corta la pesadez de la crema y le da un sabor fresco completamente distinto al arroz con pollo de siempre."
      ], null,
      altMeal("Pollo al curry suave con pan de pita", "170g pollo · curry · tomate · queso untable · 2 panes pita", [
        food("170g pechuga", 53, 0, 5),
        food("2 panes de pita", 10, 50, 2),
        food("100g tomate triturado", 1, 5, 0),
        food("2 cdas queso untable", 3, 3, 2),
        food("1 cdita curry en polvo", 0, 1, 0)
      ], [
        "Salteá el pollo en cubos con cebolla, ajo y curry en polvo. Sumá tomate triturado y cociná 12 min.",
        "Apagá, incorporá queso untable y mezclá. Serví con pan de pita cortado para mojar."
      ])),

      meal("23:30", "Antes de dormir", "Shake nocturno (obligatorio hoy)", "Piernas exige proteína nocturna", 0, [
        food("1 scoop whey con leche entera", 25, 10, 9),
        food("O 150g queso untable", 16, 5, 6)
      ], [
        "Después de piernas, el shake nocturno no es opcional — el músculo sigue sintetizando proteína 24-48hs.",
        "Si el shake te cae pesado de noche, usá queso untable con una fruta."
      ], "Hoy es obligatorio.")
    ]
  },

  // ===== VIERNES · FULL BODY OPCIONAL =====
  {
    id: "vie", tab: "Vie", dayIndex: 5, title: "Viernes",
    type: "Full body opcional · Cardio o descanso",
    workout: { name: "Full Body", duration: "50 min", icon: "⚡", optional: true, primary: ["Full body"] },
    isRestDay: false, kcal: 2700, protein: 160, carbs: 305, fats: 75,
    tags: ["Full body", "Opcional", "Cardio"],
    tip: "Viernes es flexible. Si entrenaste bien los 4 días, podés hacer full body liviano o cardio 25 min. Si el cuerpo pide descanso, escuchalo — 4 días de gym ya es suficiente.",
    meals: [
      meal("10:00", "Desayuno", "Omelette de espinaca y queso con tostadas", "3 huevos · espinaca · queso · 2 tostadas · jugo", 0, [
        food("3 huevos enteros", 18, 0, 15),
        food("1 puñado espinaca fresca", 1, 2, 0),
        food("40g queso fresco o mozzarella", 7, 1, 5),
        food("2 tostadas integrales", 8, 28, 2),
        food("Jugo de 1 naranja", 1, 11, 0)
      ], [
        "Batí los huevos. En sartén con oliva, saltate la espinaca 1 min. Volcá los huevos encima.",
        "Cuando la base cuaje, poné el queso en el centro y doblá el omelette a la mitad. Cociná 1 min más.",
        "Servís con tostadas y jugo. Espinaca + huevos es la combinación de hierro + proteína más accesible."
      ], null),

      meal("12:00", "Media mañana", "Tostadas con queso untable, nueces y miel", "2 tostadas · queso untable · nueces · miel · fruta", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("4 cdas queso untable", 12, 4, 7),
        food("20g nueces", 3, 3, 13),
        food("1 cdita miel", 0, 8, 0),
        food("1 manzana", 0, 20, 0)
      ], [
        "Batí la queso untable con la miel hasta que quede cremosa. Untá en las tostadas.",
        "Poné las nueces picadas encima. Comé la manzana al lado."
      ], null),

      meal("13:30", "Almuerzo", "Salmón a la plancha con quinoa y brócoli", "200g salmón · quinoa · brócoli · limón · oliva", 0, [
        food("200g filet de salmón", 50, 0, 26),
        food("3/4 taza quinoa cocida", 6, 30, 3),
        food("150g brócoli al vapor", 4, 7, 0),
        food("1 cda aceite de oliva", 0, 0, 14),
        food("Jugo de limón", 0, 2, 0)
      ], [
        "Salpimentá el salmón y condimentá con eneldo o tomillo si tenés.",
        "En sartén con oliva a fuego medio-alto, cocinalo 4 min por lado (no más — el salmón seco pierde la magia).",
        "Servís con quinoa y brócoli. Exprimí limón sobre todo antes de comer."
      ], "Salmón = Omega 3 real + proteína completa. La proteína de la semana más valiosa.",
      altMeal("Pasta con atún, aceitunas y tomate cherry", "80g pasta · 2 latas atún · aceitunas · cherry · oliva", [
        food("80g pasta seca (penne)", 10, 58, 2),
        food("2 latas atún al natural", 56, 0, 4),
        food("100g tomates cherry", 1, 7, 0),
        food("20g aceitunas negras", 0, 1, 6),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "Herví la pasta al dente. En bowl, mezclá el atún escurrido con cherry cortados, aceitunas y oliva.",
        "Volcá la pasta caliente sobre la mezcla y revolvé. Servís tibio o frío — ambas versiones funcionan."
      ])),

      meal("17:00", "Merienda", "Mate con tostadas y manteca de maní", "Mate + 2 tostadas + manteca de maní", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("2 cdas manteca de maní", 8, 6, 16),
        food("1 banana", 1, 27, 0)
      ], [
        "Mate con tostadas untadas con manteca de maní y banana. Simple, saciante y energético.",
        "Si el viernes fue día de gym, sumá un vaso de leche para llegar mejor a la cena."
      ], null),

      meal("22:00", "Cena", "Bife a la criolla con arroz blanco", "180g vacío · cebolla · morrón · tomate · arroz", 0, [
        food("180g bife de vacío o cuadrada", 40, 0, 12),
        food("1 taza arroz cocido", 4, 50, 0),
        food("1/2 cebolla", 1, 5, 0),
        food("1/2 morrón rojo", 0, 4, 0),
        food("1 tomate", 1, 5, 0),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "Preparala criolla: sofreí cebolla, morrón y tomate en cubos con oliva, sal y comino 10 min.",
        "Grillá el bife 3-4 min por lado según grosor. Poné la criolla encima al servir.",
        "El arroz lo podés hacer más sabroso con caldo en lugar de agua."
      ], null,
      altMeal("Wraps de pollo con hummus y vegetales", "160g pollo · 2 tortillas · hummus · pepino · palta", [
        food("160g pechuga grillada", 50, 0, 5),
        food("2 tortillas de harina", 8, 40, 4),
        food("4 cdas hummus", 4, 8, 6),
        food("1/2 pepino", 0, 4, 0),
        food("1/4 palta", 1, 5, 8)
      ], [
        "Grillá la pechuga y cortá en tiras. Untá las tortillas con hummus.",
        "Armá con pollo + pepino en bastones + palta. Enrollá apretando bien."
      ])),

      meal("23:30", "Antes de dormir", "queso untable con miel o leche", "Proteína lenta", 0, [
        food("100g queso untable", 11, 3, 4),
        food("1 cdita miel", 0, 8, 0)
      ], ["Opcional. Solo si llegaste corto de proteína o tenés hambre real."], "Opcional.")
    ]
  },

  // ===== SÁBADO · DESCANSO =====
  {
    id: "sab", tab: "Sáb", dayIndex: 6, title: "Sábado",
    type: "Día de descanso activo",
    workout: { name: "Descanso", duration: "—", icon: "🚶", primary: [] },
    isRestDay: true, kcal: 2600, protein: 150, carbs: 290, fats: 80,
    tags: ["Descanso", "Recuperación", "Caminar"],
    tip: "Descanso es parte del plan, no falla. El músculo crece cuando descansás. Una caminata de 25-30 min ayuda a la recuperación activa sin fatigar.",
    meals: [
      meal("10:00", "Desayuno", "Brunch de huevos con bondiola y tostadas con palta", "3 huevos · bondiola · tostadas · palta · jugo · café", 0, [
        food("3 huevos fritos o revueltos", 18, 0, 15),
        food("60g bondiola ahumada feteada", 12, 0, 8),
        food("2 tostadas integrales", 8, 28, 2),
        food("1/4 palta", 1, 5, 8),
        food("Jugo de naranja 200ml", 2, 22, 0),
        food("Café con leche", 4, 6, 4)
      ], [
        "El brunch sabatino. Hacete los huevos como más te gusten — fritos en aceite, revueltos o poché.",
        "Untá la tostada con palta pisada con limón. La bondiola va al costado.",
        "Tomate el tiempo — es el desayuno del fin de semana, sin apuros."
      ], "El desayuno más tranquilo de la semana. Disfrutalo."),

      meal("12:30", "Media mañana", "Tostadas con queso y tomate cherry", "2 tostadas · queso fresco · cherry · orégano", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("60g queso fresco", 7, 1, 6),
        food("100g tomates cherry", 1, 7, 0)
      ], [
        "Tostadas con queso fresco y cherry cortados al medio. Oregano, sal y un hilo de oliva."
      ], null),

      meal("14:00", "Almuerzo", "Costillitas de cerdo al horno con ensalada rusa", "300g costillitas · papas · zanahoria · arvejas · mayonesa light", 0, [
        food("300g costillitas de cerdo", 45, 0, 20),
        food("Ensalada rusa (papa + zanahoria + arvejas + mayo light)", 4, 30, 8),
        food("Pan integral x2", 8, 28, 2)
      ], [
        "Condimentá las costillitas con sal gruesa, ajo en polvo, pimentón y miel. Horneá a 180°C por 45 min cubierto con aluminio + 15 min descubierto para que doren.",
        "Para la ensalada rusa: papa + zanahoria hervidas en cubos + arvejas + mayonesa light + sal y limón.",
        "Servís con pan para acompañar."
      ], "Almuerzo de fin de semana. El cerdo bien condimentado y cocido lento es otra categoria.",
      altMeal("Pollo al romero con papas al horno", "250g pollo · papas · ajo · romero · oliva", [
        food("250g muslo de pollo con piel", 50, 0, 18),
        food("300g papas en gajos", 6, 60, 0),
        food("2 cdas aceite de oliva", 0, 0, 28)
      ], [
        "Condimentá el pollo con ajo, romero, sal y oliva. Mezclá las papas igual.",
        "Todo en la misma bandeja a 200°C por 40-45 min. Dales vuelta a mitad. El pollo queda jugoso por dentro y dorado por fuera."
      ])),

      meal("17:30", "Merienda", "Mate con tostadas y manteca de maní", "Mate + tostadas + manteca de maní + banana", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("2 cdas manteca de maní", 8, 6, 16),
        food("1 banana", 1, 27, 0)
      ], ["La merienda del sábado. Mate con tostadas de maní y banana — simple y calórico."], null),

      meal("22:00", "Cena", "Souvlaki de pollo con salsa de pepino y queso crema y arroz", "160g pollo marinado · 2 panes pita · salsa de pepino y queso crema · arroz", 0, [
        food("160g pechuga en brochettes", 50, 0, 5),
        food("2 panes de pita o árabe", 8, 36, 2),
        food("salsa de pepino y queso crema (queso untable + pepino + ajo + eneldo)", 4, 5, 4),
        food("1/2 taza arroz cocido", 2, 25, 0)
      ], [
        "Marinala pechuga en cubos con oliva + limón + ajo + orégano + pimentón, 30 min mínimo.",
        "Pinchá en palitos (si tenés) y grillá en sartén a fuego alto 6-8 min girando.",
        "Para el salsa de pepino y queso crema: queso untable + pepino rallado escurrido + ajo + eneldo + sal. Servís todo junto con el arroz."
      ], "Una cena distinta, con personalidad. Cambia completamente el sabor de la semana.",
      altMeal("Fideos con pesto de albahaca y queso", "80g pasta · pesto casero · queso parmesano", [
        food("80g fideos secos", 10, 58, 2),
        food("Pesto casero (albahaca + ajo + nueces + oliva + parm)", 4, 3, 18),
        food("30g queso parmesano rallado", 9, 0, 9)
      ], [
        "Herví los fideos. Para el pesto exprés: procesá albahaca + ajo + 1 cda nueces + 3 cdas oliva + queso.",
        "Mezclá la pasta con el pesto. Servís con más queso encima. En 15 min tenés una cena con sabor italiano real."
      ])),

      meal("23:30", "Antes de dormir", "leche o queso untable", "Descanso profundo con proteína lenta", 0, [
        food("250ml leche entera", 8, 12, 9)
      ], ["Un vaso de leche antes de dormir. Mejora la calidad del sueño."], "Opcional.")
    ]
  },

  // ===== DOMINGO · DESCANSO =====
  {
    id: "dom", tab: "Dom", dayIndex: 7, title: "Domingo",
    type: "Día de descanso completo",
    workout: { name: "Descanso total", duration: "—", icon: "🛌", primary: [] },
    isRestDay: true, kcal: 2500, protein: 145, carbs: 275, fats: 78,
    tags: ["Descanso total", "Recuperación", "Familia"],
    tip: "Domingo es recarga mental y física. Comé rico, descansá bien. La semana que viene empieza mejor cuando el cuerpo estuvo bien nutrido y descansado.",
    meals: [
      meal("10:00", "Desayuno", "pancakes de banana con frutos rojos y miel", "2 tostadas integrales · 2 huevos · banana · leche · frutos rojos", 0, [
        food("2 tostadas integrales", 6, 33, 3),
        food("2 huevos", 12, 0, 10),
        food("1 banana", 1, 27, 0),
        food("150ml leche entera", 5, 8, 5),
        food("80g frutos rojos o frutillas", 1, 10, 0),
        food("1 cda miel", 0, 17, 0)
      ], [
        "Licuá premezcla de pancakes proteicos + huevos + banana + leche. Dejá reposar 3 min.",
        "Cocinalo en sartén a fuego medio, 2 min por lado. Saldrán 3-4 pancakes.",
        "Servís con frutos rojos y un hilo de miel. Es el desayuno más festivo de la semana — disfrutalo tranquilo."
      ], null),

      meal("13:30", "Almuerzo", "Pastel de carne con papas y queso", "300g carne · papas · huevo · queso · vegetales", 0, [
        food("300g carne molida magra", 60, 0, 24),
        food("2 papas medianas (para puré)", 4, 40, 0),
        food("1 huevo (para ligar)", 6, 0, 5),
        food("40g queso rallado", 8, 0, 12),
        food("1/2 cebolla + 1 zanahoria", 1, 10, 0),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "Sofreí la carne molida con cebolla, zanahoria rallada y condimentá. Poné en un molde engrasado.",
        "Hacé el puré de papas, mezclalo con 1 huevo y cubrí la carne. Esparcí queso rallado encima.",
        "Horneá a 200°C por 25 min hasta que la superficie dore. El pastel de carne es comfort food y nutrición real al mismo tiempo."
      ], null,
      altMeal("Pollo con aceitunas, papas y tomate al horno", "250g pollo · papas · aceitunas · cherry · oliva", [
        food("250g pollo (muslo o pechuga)", 56, 0, 10),
        food("200g papas", 4, 40, 0),
        food("80g aceitunas negras", 0, 4, 15),
        food("100g tomates cherry", 1, 7, 0),
        food("2 cdas aceite de oliva", 0, 0, 28)
      ], [
        "Todo en una bandeja: pollo + papas en gajos + aceitunas + cherry. Rociá con oliva, ajo, sal y orégano.",
        "Horneá a 200°C por 35-40 min. El jugo de las aceitunas y los tomates impregna todo."
      ])),

      meal("17:30", "Merienda", "Mate con sándwich y fruta", "Mate · pan · queso · pavita · banana", 0, [
        food("2 rodajas pan integral", 8, 28, 2),
        food("40g queso fresco", 5, 1, 4),
        food("60g pavita feteada", 14, 0, 1),
        food("1 banana", 1, 27, 0)
      ], ["Mate + sándwich de queso y pavita + banana. La merienda dominguera tranquila."], null),

      meal("22:00", "Cena", "Pollo al limón con cuscús y vegetales salteados", "180g pollo · cuscús · zucchini · zanahoria · limón", 0, [
        food("180g pechuga", 56, 0, 5),
        food("60g cuscús seco (rinde 120g cocido)", 7, 44, 1),
        food("1 zucchini", 1, 6, 0),
        food("1 zanahoria", 1, 10, 0),
        food("1 cda aceite de oliva", 0, 0, 14),
        food("Jugo de 1 limón", 0, 3, 0)
      ], [
        "Para el cuscús: herví agua, volcá sobre el cuscús en ratio 1:1, tapá 5 min y esponjá con tenedor.",
        "Grillá el pollo con limón, ajo y oliva. Salteá el zucchini y zanahoria en tiras.",
        "Armá el plato con cuscús de base, vegetales encima y el pollo. El cuscús cambia completamente la experiencia vs arroz o papa."
      ], null,
      altMeal("Hamburguesas caseras con batata frita al horno", "2 hamburguesas · pan · palta · batata · ensalada", [
        food("2 hamburguesas de carne magra (180g)", 40, 0, 14),
        food("2 panes de hamburguesa integral", 10, 40, 4),
        food("1/4 palta", 1, 5, 8),
        food("200g batata en bastones al horno", 4, 48, 0),
        food("Lechuga + tomate", 2, 5, 0)
      ], [
        "Condimentá la carne con sal, pimienta, ajo en polvo y armá las hamburguesas. Grillá 4 min por lado.",
        "Batata en bastones con oliva y sal a 200°C por 25 min. Armá las hamburguesas con palta y vegetales."
      ])),

      meal("23:30", "Antes de dormir", "Shake o leche", "Proteína nocturna", 0, [
        food("1 scoop whey o 250ml leche entera", 20, 10, 8)
      ], ["Shake con leche entera o leche sola. Cerrá la semana bien."], "Opcional. Que descanses bien.")
    ]
  }
], // fin Semana 1

// ╔══════════════════════════════════════╗
// ║  SEMANA 2 · "Potencia criolla"       ║
// ╚══════════════════════════════════════╝
[
  // ===== LUNES · PECHO + TRÍCEPS =====
  {
    id: "lun", tab: "Lun", dayIndex: 1, title: "Lunes",
    type: "Día de gym · Pecho + tríceps",
    workout: { name: "Pecho · Tríceps", duration: "60 min", icon: "🏋️", primary: ["Pecho", "Tríceps"] },
    isRestDay: false, kcal: 2900, protein: 170, carbs: 330, fats: 80,
    tags: ["Pecho", "Tríceps", "Sabores criollos"],
    tip: "Semana de sabores argentinos renovados. Todo lo que comés esta semana es diferente a la semana pasada.",
    meals: [
      meal("10:00", "Desayuno", "Huevos revueltos con morrón y tostadas con tomate", "3 huevos · morrón · cebolla · 2 tostadas · tomate · café", 0, [
        food("3 huevos enteros", 18, 0, 15),
        food("1/2 morrón rojo", 0, 4, 0),
        food("1/4 cebolla", 0, 3, 0),
        food("2 tostadas integrales", 8, 28, 2),
        food("1 tomate fresco", 1, 5, 0),
        food("Café con leche 200ml", 6, 8, 6)
      ], [
        "Sofreí el morrón y cebolla picados en oliva 3 min. Sumá los huevos batidos y revolvé a fuego bajo.",
        "Serví sobre las tostadas con tomate fresco en rodajas encima. El morrón salteado cambia totalmente el desayuno de huevos."
      ], null),

      meal("11:30", "Media mañana", "Sándwich de lomito con queso y tomate", "Pan francés · 100g lomito · queso · tomate · lechuga", 0, [
        food("1 pan francés o ciabatta", 8, 34, 2),
        food("100g lomito de cerdo o vacuno", 22, 0, 7),
        food("40g queso fresco", 5, 1, 4),
        food("Tomate + lechuga", 1, 5, 0)
      ], [
        "Cortá el lomito en finas láminas. Calentalo 2 min en sartén.",
        "Armá el sándwich con queso, tomate y lechuga. Podés tostar el pan si querés."
      ], null),

      meal("12:30", "Pre-entreno", "Banana + pasas de uva", "Glucosa rápida para pecho", 0, [
        food("1 banana", 1, 27, 0),
        food("35g pasas de uva", 1, 27, 0)
      ], ["Clásico pre-entreno para días de pecho. 40 min antes del gym."], null),

      meal("14:30", "Post-entreno", "Shake proteico + banana + creatina", "Whey · banana · leche · creatina", 0, [
        food("1 scoop whey", 25, 2, 2),
        food("1 banana", 1, 27, 0),
        food("200ml leche entera", 6, 10, 7),
        food("5g creatina", 0, 0, 0)
      ], ["Post-entreno estándar. Tomalo dentro de 45 min."], null),

      meal("16:00", "Almuerzo", "Asado de tira con ensalada mixta y pan", "250g asado de tira · ensalada · pan integral", 0, [
        food("250g asado de tira", 50, 0, 24),
        food("Ensalada mixta (lechuga, tomate, zanahoria)", 2, 8, 0),
        food("2 rodajas pan integral", 8, 28, 2),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "Condimentá el asado con sal gruesa. Cocinalo en asador o plancha a fuego medio 6-8 min por lado.",
        "Dejá reposar 3 min antes de servir. Acompañá con la ensalada y el pan.",
        "El asado de tira tiene más grasa que el lomo pero es sabor puro — una vez por semana está perfecto."
      ], "Una vez por semana, el asado de tira es la proteína más sabrosa de Argentina.",
      altMeal("Pollo a la portuguesa con papas", "200g pollo · papas · morrón · cebolla · tomate · aceitunas", [
        food("200g muslo de pollo", 46, 0, 14),
        food("200g papas", 4, 40, 0),
        food("1/2 morrón + 1/4 cebolla", 1, 6, 0),
        food("100ml tomate triturado", 1, 5, 0),
        food("30g aceitunas", 0, 2, 9)
      ], [
        "Doré el pollo. Sumá cebolla y morrón. Agregá papas en cubos, tomate y aceitunas.",
        "Tapá y cociná 25 min a fuego medio. El tomate y las aceitunas le dan un sabor profundo y diferente."
      ])),

      meal("19:30", "Merienda", "Tostadas con queso untable y fruta", "2 tostadas · queso untable · banana o manzana · leche", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("4 cdas queso untable", 12, 4, 7),
        food("1 banana", 1, 27, 0),
        food("200ml leche entera", 6, 10, 7)
      ], [
        "Batí la queso untable con 1 cdita de vainilla y miel hasta que quede cremosa. Untá en las tostadas con banana."
      ], null),

      meal("22:00", "Cena", "Sopa de pollo con fideos y vegetales", "200g pechuga · fideos cabello · zanahoria · apio · papa", 0, [
        food("200g pechuga en hebras", 62, 0, 6),
        food("60g fideos cabello de ángel", 8, 44, 1),
        food("1 zanahoria", 1, 10, 0),
        food("1 rama apio", 0, 2, 0),
        food("1 papa chica", 2, 20, 0)
      ], [
        "Herví la pechuga entera 20 min con sal, ajo y apio. Retirala, desmenuzala en hebras.",
        "En el mismo caldo, agregá zanahoria y papa en cubos 10 min. Sumá los fideos y cociná 4 min más.",
        "Volvé a poner el pollo desmenuzado. La sopa casera es la cena más reconfortante y diferente al almuerzo."
      ], null,
      altMeal("Sándwich caliente de pollo con queso derretido", "160g pollo · 2 rebanadas pan · queso · tomate · mostaza", [
        food("160g pechuga grillada", 50, 0, 5),
        food("2 rebanadas pan de molde integral", 8, 28, 2),
        food("60g queso mozzarella", 11, 1, 10),
        food("Tomate + mostaza", 1, 5, 0)
      ], [
        "Armá el sándwich con pollo laminado, queso y tomate.",
        "Cocinalo en sartén tapada a fuego bajo 4 min de cada lado hasta que el queso se derrita. Queda tipo panini."
      ])),

      meal("23:30", "Antes de dormir", "queso untable con miel", "Proteína lenta nocturna", 0, [
        food("100g queso untable", 11, 3, 4),
        food("1 cdita miel", 0, 8, 0)
      ], ["Solo si llegaste corto de proteína."], "Opcional.")
    ]
  },

  // ===== MARTES · ESPALDA + BÍCEPS =====
  {
    id: "mar", tab: "Mar", dayIndex: 2, title: "Martes",
    type: "Día de gym · Espalda + bíceps",
    workout: { name: "Espalda · Bíceps", duration: "60 min", icon: "🏋️", primary: ["Espalda", "Bíceps"] },
    isRestDay: false, kcal: 2950, protein: 175, carbs: 335, fats: 80,
    tags: ["Espalda", "Bíceps", "Tirón pesado"],
    tip: "Espalda demanda carbo. Reforzá el pre-entreno y no te saltees la media mañana.",
    meals: [
      meal("10:00", "Desayuno", "pancakes proteicos con banana y nueces", "premezcla de pancakes proteicos - whey - leche - banana - nueces", 0, [
        food("60g premezcla de pancakes proteicos", 4, 48, 1),
        food("1 scoop whey", 24, 3, 2),
        food("250ml leche entera", 8, 12, 8),
        food("1 banana", 1, 27, 0),
        food("15g nueces", 2, 2, 10)
      ], [
        "Prepará la premezcla de pancakes proteicos con la leche 3-4 min, revolviendo.",
        "Retira del fuego, mezcla el whey y termina con banana en rodajas y nueces.",
        "Buen desayuno para espalda: carbo alto, proteina suficiente y grasa moderada."
      ], null),

      meal("11:30", "Media mañana", "Tostadas con palta, jamón y tomate", "2 tostadas · jamón · palta · tomate · orégano", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("60g jamón natural magro", 12, 0, 4),
        food("1/4 palta", 1, 5, 8),
        food("1 tomate", 1, 5, 0)
      ], [
        "Untá las tostadas con palta pisada. Poné el jamón y rodajas de tomate. Orégano y oliva."
      ], null),

      meal("12:30", "Pre-entreno", "Banana + miel + tostada", "Carbo reforzado", 0, [
        food("1 banana", 1, 27, 0),
        food("1 cda miel", 0, 17, 0),
        food("1 tostada integral", 4, 14, 1)
      ], ["Extra de carbo para espalda — las dominadas lo necesitan."], null),

      meal("14:30", "Post-entreno", "Shake proteico + banana + creatina", "Whey · banana · leche · creatina", 0, [
        food("1 scoop whey", 25, 2, 2),
        food("1 banana", 1, 27, 0),
        food("200ml leche entera", 6, 10, 7),
        food("5g creatina", 0, 0, 0)
      ], ["Tomalo dentro de 45 min post-entreno."], null),

      meal("16:00", "Almuerzo", "Carne magra al horno con arvejas, zanahoria y papas", "180g carne · papas · arvejas · zanahoria", 0, [
        food("180g peceto o cuadrada al horno", 47, 0, 8),
        food("2 papas medianas", 4, 40, 0),
        food("1/2 taza arvejas", 4, 13, 0),
        food("1 zanahoria", 1, 10, 0),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "Salpimentá la carne con ajo y tomillo. Ponela en una fuente con las papas en cubos, zanahoria y un chorrito de caldo.",
        "Cubrí con aluminio y horneá a 180°C por 40 min. Destapá 10 min para dorar. Sumá las arvejas los últimos 5 min.",
        "La cocción lenta en el horno hace que la carne quede tierna y absorba todos los sabores."
      ], null,
      altMeal("Milanesa de pollo con arroz a la jardinera", "180g pechuga rebozada · arroz · morrón · arveja · zanahoria", [
        food("180g pechuga rebozada al horno", 44, 8, 8),
        food("1 taza arroz a la jardinera", 4, 52, 2),
        food("Vegetales (morrón + arveja + zanahoria)", 3, 12, 0)
      ], [
        "Rebozá la pechuga y horneá 20 min a 200°C. Para el arroz: sofreí cebolla + morrón + zanahoria + arvejas, sumá arroz y agua."
      ])),

      meal("19:30", "Merienda", "Tostadas con queso untable, banana y manteca de mani", "2 tostadas - queso untable - banana - manteca de mani", 0, [
        food("2 tostadas integrales", 7, 34, 3),
        food("2 cdas queso untable", 4, 3, 7),
        food("1 banana", 1, 27, 0),
        food("1 cda manteca de mani", 4, 3, 8),
        food("200ml leche fria o cafe con leche", 6, 10, 7)
      ], [
        "Unta el queso untable en las tostadas y suma banana en rodajas.",
        "Agrega una cucharada de manteca de mani arriba y acompana con leche fria o cafe con leche."
      ], null),

      meal("22:00", "Cena", "Bowl de pollo, arroz, garbanzos y palta", "180g pollo - arroz - garbanzos - palta - tomate", 0, [
        food("180g pechuga grillada", 47, 0, 5),
        food("1 taza arroz cocido", 4, 50, 0),
        food("1/2 taza garbanzos cocidos", 5, 15, 2),
        food("1/2 palta", 2, 6, 12),
        food("Tomate + limon + condimentos", 1, 6, 0)
      ], [
        "Grilla el pollo con sal, pimienta, ajo y limon.",
        "Arma un bowl con arroz, garbanzos, tomate y palta.",
        "Cena simple, alta en proteina y facil de repetir sin sentir que estas comiendo algo raro."
      ], null,
      altMeal("Arroz primavera con pollo y vegetales", "150g pollo - arroz - arvejas - morron - choclo", [
        food("150g pechuga", 47, 0, 5),
        food("1 taza arroz blanco", 4, 50, 0),
        food("Arvejas + morron + choclo", 4, 18, 0),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "Saltea el pollo en cubos. Suma los vegetales y el arroz ya cocido. Saltea 3-4 min hasta que todo se integre."
      ])),

      meal("23:30", "Antes de dormir", "Shake nocturno", "Proteína de recuperación", 0, [
        food("1 scoop whey con 200ml leche", 25, 10, 9)
      ], ["Después de espalda + bíceps, el shake nocturno ayuda a recuperar."], "Opcional según proteína del día.")
    ]
  },

  // ===== MIÉRCOLES · HOMBROS =====
  {
    id: "mie", tab: "Mié", dayIndex: 3, title: "Miércoles",
    type: "Día de gym · Hombros",
    workout: { name: "Hombros · Abdomen", duration: "55 min", icon: "🏋️", primary: ["Hombros"] },
    isRestDay: false, kcal: 2850, protein: 165, carbs: 320, fats: 78,
    tags: ["Hombros", "Abdomen"],
    tip: "Día de hombros. Menú con estilo casero argentino — todo diferente a la semana pasada.",
    meals: [
      meal("10:00", "Desayuno", "Medialunas con jamón y queso + café con leche", "2 medialunas · jamón · queso · café con leche", 0, [
        food("2 medialunas de manteca", 6, 30, 10),
        food("60g jamón natural", 12, 0, 4),
        food("40g queso fresco", 5, 1, 4),
        food("Café con leche 300ml", 9, 14, 10)
      ], [
        "El desayuno diferente de la semana. Las medialunas rellenas con jamón y queso cambian completamente el ritmo del día.",
        "Tomá el café con leche grande para aumentar calorías y proteína."
      ], "Una vez por semana, el desayuno café + medialunas es totalmente válido."),

      meal("11:30", "Media mañana", "queso untable con frutos secos y miel", "200g queso untable · almendras · nueces · miel", 0, [
        food("200g queso untable natural", 20, 8, 10),
        food("15g almendras", 3, 3, 8),
        food("10g nueces", 2, 2, 7),
        food("1 cda miel", 0, 17, 0)
      ], [
        "queso untable con los frutos secos picados y miel encima. Proteína alta y muy poca preparación."
      ], null),

      meal("12:30", "Pre-entreno", "Banana + dátiles", "Glucosa concentrada", 0, [
        food("1 banana", 1, 27, 0),
        food("35g dátiles", 0, 26, 0)
      ], ["Pre-entreno de hombros. Mismo concepto — carbo natural, sin grasa."], null),

      meal("14:30", "Post-entreno", "Shake proteico + banana + creatina", "Whey · banana · leche · creatina", 0, [
        food("1 scoop whey", 25, 2, 2),
        food("1 banana", 1, 27, 0),
        food("200ml leche entera", 6, 10, 7),
        food("5g creatina", 0, 0, 0)
      ], ["Post-entreno estándar."], null),

      meal("16:00", "Almuerzo", "Peceto al ajo con batata y zucchini asados", "180g peceto · batata · zucchini · ajo · romero", 0, [
        food("180g peceto", 47, 0, 6),
        food("200g batata", 4, 48, 0),
        food("1 zucchini grande", 1, 8, 0),
        food("1 cda aceite de oliva", 0, 0, 14),
        food("Ajo + romero", 0, 2, 0)
      ], [
        "Corte el peceto en medallones de 2cm. Marinalo con ajo machacado, romero, oliva y sal 20 min.",
        "Sellalo en sartén caliente 2-3 min por lado. En la misma bandeja, asá la batata y el zucchini a 200°C por 20 min.",
        "El peceto marinado con ajo y romero tiene un sabor totalmente diferente a la carne sin marinar."
      ], null,
      altMeal("Pollo al horno con morrones y cebolla caramelizada", "200g pollo · morrones · cebolla · tomillo · oliva", [
        food("200g muslo o pechuga", 50, 0, 9),
        food("2 morrones mixtos", 2, 16, 0),
        food("1 cebolla grande", 1, 12, 0),
        food("2 cdas aceite de oliva", 0, 0, 28)
      ], [
        "Caramelizá la cebolla en oliva a fuego bajo 15 min. Poné todo en bandeja con el pollo y los morrones.",
        "Horneá a 200°C por 30 min. La cebolla caramelizada transforma el plato."
      ])),

      meal("19:30", "Merienda", "Tostadas con manteca de maní, banana y leche", "2 tostadas · maní · banana · leche", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("2 cdas manteca de maní", 8, 6, 16),
        food("1 banana", 1, 27, 0),
        food("250ml leche entera", 8, 12, 9)
      ], ["Merienda energética. El clásico maní + banana + leche."], null),

      meal("22:00", "Cena", "Empanadas caseras de carne al horno con ensalada", "3 empanadas · carne magra · cebolla · huevo duro · ensalada", 0, [
        food("3 tapas de empanada al horno", 9, 51, 6),
        food("150g relleno de carne magra + cebolla + especias", 30, 6, 9),
        food("Ensalada verde", 2, 6, 0)
      ], [
        "Para el relleno: sofreí cebolla + carne molida + pimentón + comino + sal. Sumá 1 huevo duro picado.",
        "Rellená las tapas, cerrá en repulgue o con tenedor. Horneá a 200°C por 15-18 min hasta que doren.",
        "3 empanadas al horno es una cena completa con proteína y carbo bien balanceados."
      ], null,
      altMeal("Omelette de carne molida y papas", "3 huevos · 100g carne molida · 1 papa · queso", [
        food("3 huevos", 18, 0, 15),
        food("100g carne molida", 20, 0, 8),
        food("1 papa hervida en cubos", 2, 20, 0),
        food("30g queso rallado", 6, 0, 9)
      ], [
        "Sofreí la carne molida con ajo, papa cocida y condimentos.",
        "Batí los huevos, volcá en sartén con la carne y papa. Tapá y cociná a fuego bajo 5 min. Queso encima al final."
      ])),

      meal("23:30", "Antes de dormir", "queso untable con miel", "Caseína nocturna", 0, [
        food("100g queso untable", 11, 3, 4),
        food("1 cdita miel", 0, 8, 0)
      ], ["Opcional."], "Opcional.")
    ]
  },

  // ===== JUEVES · PIERNAS =====
  {
    id: "jue", tab: "Jue", dayIndex: 4, title: "Jueves",
    type: "Día de gym · Piernas (día más pesado)",
    workout: { name: "Piernas", duration: "70 min", icon: "🦵", primary: ["Cuádriceps", "Isquios", "Glúteos"] },
    isRestDay: false, kcal: 3100, protein: 180, carbs: 360, fats: 85,
    tags: ["Piernas", "Día más pesado", "+200 kcal"],
    tip: "El día más fuerte. Comé bien en todos los momentos del día.",
    meals: [
      meal("10:00", "Desayuno", "Tortilla de zapallitos con jamón y tostadas", "3 huevos · 1 zapallito · jamón · queso · 2 tostadas", 0, [
        food("3 huevos", 18, 0, 15),
        food("1 zapallito rallado", 1, 4, 0),
        food("60g jamón natural", 12, 0, 4),
        food("30g queso rallado", 6, 0, 9),
        food("2 tostadas integrales", 8, 28, 2),
        food("Jugo de naranja 200ml", 2, 22, 0)
      ], [
        "Escurrí el zapallito rallado (salá y dejá 5 min para que suelte agua). Mezclá con los huevos batidos y el jamón.",
        "En sartén a fuego medio, cociná 4 min, deslizá al plato e invertí. Queso rallado encima al final.",
        "Con tostadas y jugo. La tortilla de zapallito es totalmente diferente a la española."
      ], null),

      meal("11:30", "Media mañana", "Sándwich de atún con queso y verduras", "Pan · atún · queso · tomate · pepino · mostaza", 0, [
        food("2 rodajas pan integral", 8, 28, 2),
        food("1 lata atún", 28, 0, 2),
        food("40g queso fresco", 5, 1, 4),
        food("1/2 pepino + tomate", 1, 6, 0)
      ], [
        "Mezcla el atún con mostaza y limón. Armá el sándwich con queso, atún y vegetales."
      ], null),

      meal("12:30", "Pre-entreno", "Banana + pasas + miel (triple carbo)", "Máximo combustible para piernas", 0, [
        food("1 banana grande", 1, 30, 0),
        food("35g pasas", 1, 27, 0),
        food("1 cda miel", 0, 17, 0)
      ], ["Triple carbo para piernas. No te lo salteés."], "Obligatorio para piernas."),

      meal("14:30", "Post-entreno", "Shake reforzado post-piernas", "2 scoops · banana · leche · creatina", 0, [
        food("2 scoops whey", 50, 4, 4),
        food("1 banana", 1, 30, 0),
        food("200ml leche entera", 6, 10, 7),
        food("5g creatina", 0, 0, 0)
      ], ["2 scoops solo para el día de piernas. El desgaste es máximo."], null),

      meal("16:00", "Almuerzo", "Guiso de lentejas con pollo y chorizo", "1 taza lentejas · 150g pollo · chorizo colorado · vegetales", 0, [
        food("1 taza lentejas cocidas", 9, 20, 1),
        food("150g pechuga en cubos", 47, 0, 5),
        food("40g chorizo colorado picado", 5, 2, 9),
        food("Zanahoria + papa + cebolla", 3, 25, 0),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "Sofreí el chorizo con cebolla y ajo. Sumá el pollo y dorá. Agregá zanahoria, papa en cubos y las lentejas.",
        "Cubrí con caldo y cociná 20 min. Las lentejas son proteína vegetal que suma a la animal del pollo.",
        "Un plato único, completo y diferente a todo lo que comiste en la semana anterior."
      ], null,
      altMeal("Puchero liviano de carne y vegetales", "200g carne · papas · zanahoria · choclo · zapallo", [
        food("200g pecho de res o cuadrada", 40, 0, 16),
        food("2 papas", 4, 40, 0),
        food("1 zanahoria + 1 choclo + 100g zapallo", 2, 25, 0),
        food("Caldo de carne", 2, 4, 2)
      ], [
        "Herví la carne con caldo 30 min. Sumá los vegetales en trozos grandes y cociná 20 min más.",
        "Serví con el caldo como sopa primero, luego la carne y vegetales. El puchero alimenta y reconforta."
      ])),

      meal("19:30", "Merienda", "Panqueques rellenos de queso untable y miel", "2 panqueques · queso untable · miel · canela · banana", 0, [
        food("2 panqueques finos (harina + huevo + leche)", 8, 30, 5),
        food("4 cdas queso untable", 12, 4, 7),
        food("1 cda miel", 0, 17, 0),
        food("1 banana", 1, 27, 0)
      ], [
        "Hacé los panqueques finos. Rellená con queso untable con miel y canela.",
        "Dobblalos o enrollalos. Poné banana en rodajas encima."
      ], null),

      meal("22:00", "Cena", "Ravioles de verdura y mozzarella con manteca y salvia", "300g ravioles frescos · queso untable · manteca · salvia · queso", 0, [
        food("300g Ravioles de verdura y mozzarella frescos", 15, 57, 8),
        food("20g manteca para saltear", 0, 0, 16),
        food("Salvia fresca (4 hojas)", 0, 1, 0),
        food("30g queso parmesano rallado", 9, 0, 9)
      ], [
        "Herví los sorrentinos en agua con sal según el paquete (3-4 min si son frescos).",
        "En sartén, derretí la manteca con las hojas de salvia hasta que dore (no queme). Volcá los sorrentinos y saltealos 1 min.",
        "Serví con parmesano rallado. Una cena de pasta con sabor gourmet en 15 min totales."
      ], null,
      altMeal("Ñoquis de papa con tuco de carne", "300g ñoquis frescos · 120g carne molida · tomate · queso", [
        food("300g ñoquis de papa frescos", 6, 54, 3),
        food("120g carne molida magra", 24, 0, 9),
        food("200ml tomate triturado", 2, 10, 0),
        food("20g queso rallado", 4, 0, 6)
      ], [
        "Herví los ñoquis: cuando suben a la superficie ya están listos (2-3 min).",
        "El tuco: sofreí carne con cebolla y ajo, sumá tomate y cociná 15 min. Mezclá con los ñoquis y queso."
      ])),

      meal("23:30", "Antes de dormir", "Shake nocturno (obligatorio hoy)", "Proteína de recuperación muscular", 0, [
        food("1 scoop whey con 200ml leche entera", 25, 10, 9)
      ], ["Piernas exige proteína nocturna. No opcional hoy."], "Obligatorio hoy.")
    ]
  },

  // ===== VIERNES · FULL BODY =====
  {
    id: "vie", tab: "Vie", dayIndex: 5, title: "Viernes",
    type: "Full body opcional · Cardio o descanso",
    workout: { name: "Full Body", duration: "50 min", icon: "⚡", optional: true, primary: ["Full body"] },
    isRestDay: false, kcal: 2700, protein: 160, carbs: 305, fats: 75,
    tags: ["Full body", "Opcional"],
    tip: "Fin de semana de entrenamiento. Flexible — hacé lo que el cuerpo te pida.",
    meals: [
      meal("10:00", "Desayuno", "Huevos pochados con tostadas y palta", "2 huevos poché · 2 tostadas · palta · tomate · café", 0, [
        food("2 huevos pochados", 12, 0, 10),
        food("2 tostadas integrales", 8, 28, 2),
        food("1/3 palta", 1, 7, 11),
        food("1 tomate", 1, 5, 0),
        food("Café con leche 200ml", 6, 8, 6)
      ], [
        "Herví agua con un chorro de vinagre (ayuda a mantener la clara unida). Bajá a fuego suave, hacé un remolino y volcá el huevo. 3-4 min.",
        "Serví sobre las tostadas con palta y tomate. Los huevos pochados son la versión gourmet del desayuno."
      ], null),

      meal("12:00", "Media mañana", "Tostadas con queso fresco y semillas", "2 tostadas · queso fresco · semillas de chía y lino", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("60g queso fresco", 7, 1, 6),
        food("1 cda semillas mixtas (chía + lino)", 2, 4, 4)
      ], ["Queso fresco con semillas encima. Las semillas aportan omega 3 y textura crocante."], null),

      meal("13:30", "Almuerzo", "Trucha o salmón rosado al horno con arroz y espinaca", "200g pescado · arroz · espinaca · ajo · oliva", 0, [
        food("200g trucha o salmón rosado", 46, 0, 18),
        food("1 taza arroz blanco cocido", 4, 50, 0),
        food("100g espinaca salteada", 3, 3, 0),
        food("1 cda aceite de oliva", 0, 0, 14),
        food("Ajo + limón", 0, 2, 0)
      ], [
        "Condimentá el pescado con ajo, limón, oliva y eneldo. Horneá a 200°C por 15-18 min.",
        "Salteá la espinaca con ajo en oliva 2 min. Servís con arroz de base y el pescado encima.",
        "La trucha de río es tan buena como el salmón, a veces más fresca y más barata."
      ], null,
      altMeal("Pasta con salsa de tomate fresco y albahaca", "80g pasta · tomate fresco · ajo · albahaca · oliva · queso", [
        food("80g penne rigate", 10, 58, 2),
        food("3 tomates maduros", 3, 15, 0),
        food("30g queso parmesano", 9, 0, 9),
        food("Albahaca fresca + ajo + oliva", 0, 2, 10)
      ], [
        "Sofreí ajo en oliva, sumá tomate en cubos y cociná 10 min. Apagá y sumá albahaca fresca.",
        "Mezclá con la pasta al dente y el parmesano. La salsa de tomate fresco es completamente diferente a la de lata."
      ])),

      meal("17:00", "Merienda", "Mate con galletitas de arroz y nueces", "Mate + 6-8 galletitas de arroz", 0, [
        food("8 galletitas de arroz (caseras o compradas)", 5, 30, 7),
        food("1 manzana", 0, 20, 0)
      ], ["Mate con galletitas y manzana. Merienda liviana para el viernes."], null),

      meal("22:00", "Cena", "Carne a la parrilla con chimichurri y pan", "180g bife · chimichurri casero · pan · ensalada", 0, [
        food("180g bife de cuadrada", 40, 0, 12),
        food("2 rodajas pan integral", 8, 28, 2),
        food("Chimichurri (perejil + ajo + orégano + oliva)", 0, 2, 8),
        food("Ensalada verde + tomate", 2, 7, 0)
      ], [
        "Grillá la carne a fuego fuerte. Para el chimichurri: perejil picado + ajo + orégano + 3 cdas oliva + vinagre + sal.",
        "Serví con el pan y la ensalada. El chimichurri casero transforma cualquier corte."
      ], null,
      altMeal("Pollo salteado al wok con arroz integral y sésamo", "160g pollo · arroz integral · brócoli · soja · sésamo", [
        food("160g pechuga en tiras", 50, 0, 5),
        food("3/4 taza arroz integral cocido", 3, 37, 1),
        food("150g brócoli", 4, 7, 0),
        food("1 cda salsa de soja · 1 cdita sésamo", 1, 2, 1)
      ], [
        "Wok muy caliente con aceite. Salteá el pollo 4 min. Sumá brócoli y la soja.",
        "Incorporá el arroz integral y el sésamo. Salteá 2 min más."
      ])),

      meal("23:30", "Antes de dormir", "queso untable o leche", "Cierre proteico del día", 0, [
        food("100g queso untable con miel o 250ml leche", 11, 11, 4)
      ], ["Opcional según proteína del día."], "Opcional.")
    ]
  },

  // ===== SÁBADO · DESCANSO =====
  {
    id: "sab", tab: "Sáb", dayIndex: 6, title: "Sábado",
    type: "Día de descanso activo",
    workout: { name: "Descanso", duration: "—", icon: "🚶", primary: [] },
    isRestDay: true, kcal: 2600, protein: 150, carbs: 290, fats: 80,
    tags: ["Descanso", "Criolla", "Fin de semana"],
    tip: "Sábado potencia criolla. El asado es la proteína del fin de semana.",
    meals: [
      meal("10:00", "Desayuno", "Tostadas con queso crema, salmón ahumado y huevo duro", "2 tostadas · queso crema · salmón ahumado · huevo · alcaparras", 0, [
        food("2 tostadas de centeno o integral", 8, 26, 2),
        food("3 cdas queso crema natural", 3, 2, 9),
        food("60g salmón ahumado", 13, 0, 5),
        food("1 huevo duro", 6, 0, 5),
        food("Alcaparras o cebolla morada (opcional)", 0, 2, 0)
      ], [
        "Untá las tostadas con queso crema. Poné el salmón ahumado encima.",
        "Cortá el huevo duro en rodajas y terminá con alcaparras o cebolla morada en pluma fina.",
        "El desayuno más gourmet de las 4 semanas — salmón ahumado en casa es un lujo accesible."
      ], null),

      meal("12:30", "Media mañana", "Bol de frutas con granola y queso untable", "200g queso untable · granola · frutas de estación · miel", 0, [
        food("200g queso untable", 8, 10, 8),
        food("30g granola", 3, 20, 4),
        food("100g frutas variadas (banana, manzana, naranja)", 1, 25, 0),
        food("1 cdita miel", 0, 8, 0)
      ], ["Bol fresco de frutas con granola. El contraste con el desayuno es total."], null),

      meal("14:00", "Almuerzo", "Asado completo con ensaladas", "200g asado vacío · chorizo · morcilla · ensalada · pan", 0, [
        food("200g asado de vacío", 44, 0, 20),
        food("1 chorizo colorado asado", 11, 2, 20),
        food("50g morcilla (pequeña, ocasional)", 5, 2, 14),
        food("Ensalada mixta grande", 3, 12, 0),
        food("1 pan francés", 4, 17, 1)
      ], [
        "El asado del sábado es diferente al asado rápido del lunes — acá tenés tiempo para hacerlo bien.",
        "Fuego indirecto para el asado, cociná 40-50 min. Chorizo a fuego directo 10-15 min.",
        "Las ensaladas equilibran la pesadez del asado completo."
      ], "El asado del sábado es sagrado. Disfrutalo con tiempo.",
      altMeal("Bondiola al horno con papas rústicas", "350g bondiola · papas · ajo · romero · mostaza", [
        food("350g bondiola de cerdo", 50, 0, 28),
        food("300g papas rústicas", 6, 60, 0),
        food("2 cdas aceite de oliva", 0, 0, 28)
      ], [
        "Salpimentá la bondiola, untala con mostaza y ajo. Cubrí con aluminio y horneá a 180°C por 1h.",
        "Los últimos 20 min sin aluminio para que dore. Papas en gajos con oliva al horno también 40 min."
      ])),

      meal("17:30", "Merienda", "Mate con alfajores caseros de pan integral", "Mate + 2 alfajores de maicena y dulce de leche", 0, [
        food("2 alfajores de maicena caseros (o comprados)", 5, 36, 7),
        food("Mate", 0, 0, 0)
      ], ["La merienda criolla del sábado. Mate con alfajores."], null),

      meal("22:00", "Cena", "Fideos al pomodoro con carne molida y parmesano", "80g pasta · 120g carne molida · tomate · parmesano", 0, [
        food("80g penne o tallarines", 10, 58, 2),
        food("120g carne molida magra", 24, 0, 9),
        food("200ml tomate triturado", 2, 10, 0),
        food("1 cda aceite de oliva", 0, 0, 14),
        food("30g parmesano rallado", 9, 0, 9)
      ], [
        "La carne al pomodoro: sofreí la carne con ajo, sumá tomate y cociná 15 min con albahaca.",
        "Mezclá con la pasta al dente y el parmesano encima. La carne al tuco con parmesano es una cena italiana y sencilla."
      ], null,
      altMeal("Pollo grillado con morrones asados y quinoa", "160g pollo · quinoa · morrones · limón · oliva", [
        food("160g pechuga grillada", 50, 0, 5),
        food("3/4 taza quinoa cocida", 6, 30, 3),
        food("2 morrones asados", 2, 16, 0),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "Grillá el pollo con limón y oliva. Asá los morrones en el horno o a la llama.",
        "Armá el plato con quinoa de base, los morrones y el pollo encima."
      ])),

      meal("23:30", "Antes de dormir", "queso untable o leche", "Cierre del sábado", 0, [
        food("250ml leche entera", 8, 12, 9)
      ], ["Opcional. Un vaso de leche cierra bien el sábado."], "Opcional.")
    ]
  },

  // ===== DOMINGO · DESCANSO =====
  {
    id: "dom", tab: "Dom", dayIndex: 7, title: "Domingo",
    type: "Día de descanso completo",
    workout: { name: "Descanso total", duration: "—", icon: "🛌", primary: [] },
    isRestDay: true, kcal: 2500, protein: 145, carbs: 275, fats: 78,
    tags: ["Descanso total", "Criolla", "Domingo"],
    tip: "Domingo criolla. Comida que alimenta el alma.",
    meals: [
      meal("10:00", "Desayuno", "French toast con dulce de leche light y banana", "2 rebanadas · 2 huevos · leche · dulce de leche · banana", 0, [
        food("2 rebanadas pan brioche o lactal", 6, 32, 4),
        food("2 huevos", 12, 0, 10),
        food("100ml leche", 3, 5, 4),
        food("1 cda dulce de leche light", 2, 12, 2),
        food("1 banana", 1, 27, 0)
      ], [
        "Batí los huevos con leche y vainilla. Remojá el pan 10 seg de cada lado y cocinalo en manteca.",
        "Untá con el dulce de leche mientras está caliente y poné la banana en rodajas. Un capricho dominical controlado."
      ], "Un domingo sin excesos pero con placer."),

      meal("13:30", "Almuerzo", "Pollo al disco con papas y vegetales", "250g pollo · papas · morrón · cebolla · vino blanco", 0, [
        food("250g pollo en presas", 56, 0, 14),
        food("2 papas medianas", 4, 40, 0),
        food("1 morrón + 1 cebolla + 2 tomates", 2, 18, 0),
        food("50ml vino blanco (para cocinar)", 0, 2, 0),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "En sartén grande o disco, dorá el pollo a fuego fuerte. Sumá cebolla, morrón, papas en rodajas y tomate.",
        "Bañá con el vino y tapá. Cociná 30-35 min a fuego medio hasta que las papas estén tiernas.",
        "El pollo al disco es el plato criolla definitivo del domingo."
      ], null,
      altMeal("Estofado de carne con papas y zanahorias", "200g carne · papas · zanahoria · pimiento · caldo", [
        food("200g cuadrada o nalga en cubos", 40, 0, 12),
        food("2 papas · 2 zanahorias · 1 pimiento", 4, 46, 0),
        food("200ml caldo de carne", 2, 4, 2)
      ], [
        "Dorá la carne en cubos con cebolla y ajo. Sumá las papas, zanahoria, pimiento y el caldo.",
        "Tapá y cociná a fuego lento 35-40 min hasta que la carne quede tierna. El estofado se hace solo."
      ])),

      meal("17:30", "Merienda", "Mate con sándwich casero de queso y tomate", "Mate + pan integral + queso + tomate + orégano", 0, [
        food("2 rodajas pan integral", 8, 28, 2),
        food("60g queso fresco o en barra", 7, 1, 6),
        food("1 tomate", 1, 5, 0)
      ], ["Sándwich de queso y tomate con mate. La merienda dominguera simple y buena."], null),

      meal("22:00", "Cena", "Pechuga rellena con jamón y queso + ensalada", "180g pechuga · jamón · queso · ensalada · papas noisette", 0, [
        food("180g pechuga rellena", 56, 0, 12),
        food("40g jamón natural", 8, 0, 3),
        food("50g mozzarella", 9, 1, 7),
        food("Ensalada mixta", 2, 7, 0),
        food("100g papas noisette al horno", 2, 20, 4)
      ], [
        "Abrí la pechuga en libro (cortá a la mitad sin separar). Rellená con jamón y mozzarella. Cerrá con palillos.",
        "Sellá en sartén 3 min y terminá en horno a 200°C por 15 min. Papas noisette congeladas al horno son atajo válido.",
        "La pechuga rellena es fácil de hacer y parece plato de restaurante."
      ], null,
      altMeal("Pasta con queso untable y espinaca al limón", "80g pasta · queso untable · espinaca · limón · oliva · queso", [
        food("80g pasta larga (linguini o espagueti)", 10, 58, 2),
        food("5 cdas queso untable", 15, 5, 9),
        food("100g espinaca saltada con ajo", 3, 4, 2),
        food("Limón + oliva + queso parmesano", 2, 2, 10)
      ], [
        "Herví la pasta. Salteá espinaca con ajo en oliva 2 min.",
        "Mezclá pasta caliente con queso untable + espinaca + ralladura de limón + parmesano. Cremoso sin crema real."
      ])),

      meal("23:30", "Antes de dormir", "Shake o leche", "Cierre dominical", 0, [
        food("1 scoop whey con 200ml leche o leche sola", 20, 10, 8)
      ], ["Cerrá la semana 2 con proteína. Que descanses."], "Opcional.")
    ]
  }
], // fin Semana 2

// ╔══════════════════════════════════════╗
// ║  SEMANA 3 · "Internacional Mix"      ║
// ╚══════════════════════════════════════╝
[
  // ===== LUNES · PECHO + TRÍCEPS =====
  {
    id: "lun", tab: "Lun", dayIndex: 1, title: "Lunes",
    type: "Día de gym · Pecho + tríceps",
    workout: { name: "Pecho · Tríceps", duration: "60 min", icon: "🏋️", primary: ["Pecho", "Tríceps"] },
    isRestDay: false, kcal: 2900, protein: 170, carbs: 330, fats: 80,
    tags: ["Pecho", "Tríceps", "Sabores del mundo"],
    tip: "Semana de sabores internacionales. Todo distinto a las semanas anteriores.",
    meals: [
      meal("10:00", "Desayuno", "Licuado proteico con banana y frutos del bosque", "pan integral · banana · leche · whey · frutos rojos · granola", 0, [
        food("2 tostadas integrales", 4, 27, 3),
        food("1 banana congelada", 1, 27, 0),
        food("150ml leche entera", 5, 8, 5),
        food("1/2 scoop whey vainilla", 13, 1, 1),
        food("80g frutos rojos", 1, 10, 0),
        food("20g granola", 2, 13, 3)
      ], [
        "Licuá la banana + leche congelada + leche + whey hasta que quede espesa (textura tipo helado).",
        "Volcá en un bol y poné los frutos rojos y la granola encima. Se come con cuchara — es la versión 'bowl' del licuado."
      ], null),

      meal("11:30", "Media mañana", "Tostadas con hummus y rodajas de pepino y tomate", "2 tostadas · 4 cdas hummus · pepino · tomate · oliva", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("4 cdas hummus (garbanzos + sésamo + limón)", 6, 14, 8),
        food("1/2 pepino + 1 tomate", 1, 8, 0)
      ], [
        "Untá el hummus sobre las tostadas. Poné rodajas de pepino y tomate encima.",
        "El hummus reemplaza la manteca con grasa de calidad (garbanzos + sésamo). Podés comprarlo o hacerlo con lata de garbanzos + tahini + limón + ajo."
      ], null),

      meal("12:30", "Pre-entreno", "Banana + pasas de uva", "Carbo rápido", 0, [
        food("1 banana", 1, 27, 0),
        food("35g pasas de uva", 1, 27, 0)
      ], ["Pre estándar para pecho."], null),

      meal("14:30", "Post-entreno", "Shake proteico + banana + creatina", "Whey · banana · leche · creatina", 0, [
        food("1 scoop whey", 25, 2, 2),
        food("1 banana", 1, 27, 0),
        food("200ml leche entera", 6, 10, 7),
        food("5g creatina", 0, 0, 0)
      ], ["Post-entreno estándar."], null),

      meal("16:00", "Almuerzo", "Bowl de pollo teriyaki con arroz y choclo", "190g pollo · arroz · choclo · zanahoria · salsa teriyaki", 0, [
        food("190g pechuga en tiras", 59, 0, 6),
        food("1 taza arroz blanco cocido", 4, 50, 0),
        food("1/2 choclo en granos", 2, 18, 1),
        food("1/2 zanahoria rallada", 0, 5, 0),
        food("2 cdas salsa teriyaki (soja + miel + jengibre)", 1, 8, 0)
      ], [
        "Salteá el pollo en tiras a fuego fuerte. Cuando dore, bañá con la salsa teriyaki y cocinalo 2 min más hasta que caramelice.",
        "Armá el bowl: arroz de base, pollo teriyaki encima, choclo y zanahoria al costado.",
        "El caramelizado de la salsa teriyaki sobre el pollo es completamente diferente a cualquier aderezo argentino."
      ], null,
      altMeal("Tacos de pollo suaves con palta y salsa", "3 tortillas · 160g pollo · palta · tomate · cebolla · limón", [
        food("3 tortillas de harina chicas", 7, 45, 4),
        food("160g pechuga salteada con comino y pimentón", 50, 0, 5),
        food("1/4 palta", 1, 5, 8),
        food("Tomate + cebolla + cilantro + limón", 1, 7, 0)
      ], [
        "Salteá el pollo en tiras con comino, pimentón y sal. Calentá las tortillas 30 seg en sartén seca.",
        "Armá los tacos con palta, pollo, tomate y cebolla. Exprimí limón encima."
      ])),

      meal("19:30", "Merienda", "queso untable con manteca de maní y banana", "200g queso untable · manteca de maní · banana · miel", 0, [
        food("200g queso untable", 20, 8, 10),
        food("1 cda manteca de maní", 4, 3, 8),
        food("1 banana", 1, 27, 0),
        food("1 cdita miel", 0, 8, 0)
      ], [
        "Mezclá el queso untable con la manteca de maní hasta integrar. Cortá la banana arriba y rociá con miel."
      ], null),

      meal("22:00", "Cena", "Fideos estilo pad thai con pollo y maní", "80g noodles o fideos · 160g pollo · huevo · maní · soja · limón", 0, [
        food("80g fideos de arroz o espagueti", 8, 57, 1),
        food("160g pechuga en tiras", 50, 0, 5),
        food("1 huevo revuelto dentro del plato", 6, 0, 5),
        food("20g maní tostado", 5, 3, 10),
        food("2 cdas salsa de soja + limón", 2, 3, 0)
      ], [
        "Herví los fideos y reservá. En wok caliente, salteá el pollo 4 min. Sumá los fideos, la soja y el huevo revuelto.",
        "Mezclá 2 min a fuego fuerte. Servís con el maní picado encima y rodajas de limón para exprimir.",
        "El maní tostado y el limón al final son lo que define al pad thai — no te los salteés."
      ], null,
      altMeal("Pollo hoisin con arroz y brócoli salteado", "160g pollo · salsa hoisin · arroz · brócoli · sésamo", [
        food("160g pechuga", 50, 0, 5),
        food("1 taza arroz cocido", 4, 50, 0),
        food("150g brócoli salteado", 4, 7, 0),
        food("2 cdas salsa hoisin", 1, 10, 1),
        food("1 cdita sésamo", 1, 1, 3)
      ], [
        "Salteá el pollo en tiras con la salsa hoisin 5 min. Salteá el brócoli aparte.",
        "Servís con arroz, brócoli y el pollo encima con sésamo esparcido."
      ])),

      meal("23:30", "Antes de dormir", "queso untable con miel", "Proteína lenta", 0, [
        food("100g queso untable", 11, 3, 4),
        food("1 cdita miel", 0, 8, 0)
      ], ["Opcional."], "Opcional.")
    ]
  },

  // ===== MARTES · ESPALDA + BÍCEPS =====
  {
    id: "mar", tab: "Mar", dayIndex: 2, title: "Martes",
    type: "Día de gym · Espalda + bíceps",
    workout: { name: "Espalda · Bíceps", duration: "60 min", icon: "🏋️", primary: ["Espalda", "Bíceps"] },
    isRestDay: false, kcal: 2950, protein: 175, carbs: 335, fats: 80,
    tags: ["Espalda", "Bíceps", "Mix internacional"],
    tip: "Espalda + sabores distintos. Esta semana el almuerzo y la cena son completamente diferentes a todo lo anterior.",
    meals: [
      meal("10:00", "Desayuno", "Arepa de maíz con pollo desmenuzado y palta", "2 arepas · pollo · palta · tomate · queso", 0, [
        food("2 arepas de maíz medianas (masa lista o P.A.N.)", 6, 36, 3),
        food("80g pollo desmenuzado sazonado", 25, 0, 3),
        food("1/4 palta", 1, 5, 8),
        food("40g queso fresco", 5, 1, 4),
        food("Café con leche 200ml", 6, 8, 6)
      ], [
        "Mezclá 1 taza de harina de maíz precocida + 1 taza agua tibia + sal. Formá bolas y aplanalás a 1.5cm. Cocinalo en sartén seca 5 min por lado.",
        "Cortá las arepas y rellenálas con el pollo (condimentado con comino + ajo), la palta y el queso.",
        "Las arepas son el pan colombiano/venezolano. Cambian completamente el desayuno."
      ], "Si no conseguís harina P.A.N., usá tortillas de maíz gruesas."),

      meal("11:30", "Media mañana", "Sándwich de pollo con palta y sriracha", "Pan · pechuga · palta · tomate · salsa picante", 0, [
        food("2 rodajas pan integral", 8, 28, 2),
        food("100g pechuga cocida laminada", 31, 0, 3),
        food("1/4 palta", 1, 5, 8),
        food("1 tomate + lechuga", 1, 5, 0),
        food("1 cdita sriracha o picante suave", 0, 1, 0)
      ], [
        "Armá el sándwich con la pechuga laminada, palta, tomate y lechuga.",
        "Un toque de sriracha o salsa picante cambia el sándwich de siempre."
      ], null),

      meal("12:30", "Pre-entreno", "Banana + miel", "Carbo espalda", 0, [
        food("1 banana", 1, 27, 0),
        food("1 cda miel", 0, 17, 0),
        food("1 tostada", 4, 14, 1)
      ], ["Pre para espalda."], null),

      meal("14:30", "Post-entreno", "Shake proteico + banana + creatina", "Whey · banana · leche · creatina", 0, [
        food("1 scoop whey", 25, 2, 2),
        food("1 banana", 1, 27, 0),
        food("200ml leche", 6, 10, 7),
        food("5g creatina", 0, 0, 0)
      ], ["Post-entreno estándar."], null),

      meal("16:00", "Almuerzo", "Risotto de pollo y champiñones", "170g pollo · 80g arroz arbóreo · champiñones · caldo · queso", 0, [
        food("170g pechuga en cubos", 53, 0, 5),
        food("80g arroz arbóreo o blanco", 6, 64, 0),
        food("150g champiñones frescos", 3, 4, 0),
        food("200ml caldo de pollo", 2, 4, 1),
        food("30g parmesano rallado", 9, 0, 9),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "Sofreí el pollo. Reservalo. En la misma sartén, sofreí cebolla + champiñones y el arroz.",
        "Agregá el caldo caliente de a poco, revolviendo. Incorporá más caldo cuando se absorba (15-18 min total).",
        "Al final, el pollo + parmesano + 1 cda manteca. El risotto pide paciencia pero el resultado es un almuerzo gourmet de verdad."
      ], null,
      altMeal("Carne salteada estilo mexicano con arroz", "160g carne · arroz · morrón · cebolla · comino · limón", [
        food("160g carne magra en tiras finas", 32, 0, 10),
        food("1 taza arroz cocido", 4, 50, 0),
        food("1 morrón + 1/2 cebolla", 1, 10, 0),
        food("Comino + pimentón + limón", 0, 2, 0)
      ], [
        "Salteá la carne a fuego muy fuerte con comino y pimentón (sin aceite extra — la carne tiene su grasa).",
        "Sumá morrón y cebolla 3 min más. Exprimí limón al servir sobre el arroz."
      ])),

      meal("19:30", "Merienda", "Tostadas con manteca de maní y miel", "2 tostadas · manteca de maní · miel · banana", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("2 cdas manteca de maní", 8, 6, 16),
        food("1 banana", 1, 27, 0),
        food("1 cdita miel", 0, 8, 0)
      ], ["Clásico seguro para la merienda de martes."], null),

      meal("22:00", "Cena", "Pollo tikka masala liviano con arroz basmati", "170g pollo · queso untable · tomate · curry · garam masala · arroz", 0, [
        food("170g pechuga en cubos", 53, 0, 5),
        food("3/4 taza arroz basmati cocido", 3, 40, 0),
        food("100ml tomate triturado", 1, 5, 0),
        food("4 cdas queso untable", 6, 5, 4),
        food("1 cdita curry + 1/2 cdita garam masala", 0, 2, 1)
      ], [
        "Marinato el pollo en queso untable + curry + sal 20 min. Doré en sartén caliente.",
        "Sumá el tomate y las especias. Cociná 10 min a fuego bajo.",
        "Apagá e incorporá más queso untable para suavizar la salsa. La versión liviana del tikka masala — sin crema pero con todo el sabor."
      ], null,
      altMeal("Burrito de pollo con queso y arroz", "2 tortillas grandes · 150g pollo · arroz · queso · palta", [
        food("2 tortillas de harina grande", 8, 60, 6),
        food("150g pollo sazonado con comino y chile", 47, 0, 5),
        food("1/2 taza arroz cocido", 2, 25, 0),
        food("50g queso rallado", 10, 0, 12),
        food("1/4 palta", 1, 5, 8)
      ], [
        "Calentá las tortillas. Poné arroz, pollo, queso y palta en el centro.",
        "Doblá los extremos y enrollá apretando. Calentalo 1 min en sartén para que el queso se derrita."
      ])),

      meal("23:30", "Antes de dormir", "Shake nocturno", "Proteína nocturna", 0, [
        food("1 scoop whey con 200ml leche", 25, 10, 9)
      ], ["Opcional."], "Opcional.")
    ]
  },

  // ===== MIÉRCOLES · HOMBROS =====
  {
    id: "mie", tab: "Mié", dayIndex: 3, title: "Miércoles",
    type: "Día de gym · Hombros",
    workout: { name: "Hombros · Abdomen", duration: "55 min", icon: "🏋️", primary: ["Hombros"] },
    isRestDay: false, kcal: 2850, protein: 165, carbs: 320, fats: 78,
    tags: ["Hombros", "Mix internacional"],
    tip: "Menú con toques asiáticos y mediterráneos. Sabores completamente nuevos.",
    meals: [
      meal("10:00", "Desayuno", "Pancakes americanos con arándanos y miel", "50g premezcla de pancakes proteicos · 2 huevos · leche · arándanos · miel", 0, [
        food("50g premezcla de pancakes proteicos o pan integral", 6, 33, 3),
        food("2 huevos", 12, 0, 10),
        food("100ml leche entera", 3, 5, 4),
        food("80g arándanos frescos o congelados", 1, 14, 0),
        food("1 cda miel o sirope", 0, 17, 0)
      ], [
        "Mezclá premezcla de pancakes proteicos + huevos + leche + sal hasta que quede lisa. No agites de más.",
        "En sartén a fuego medio con manteca, cocinalo por cucharones. Cuando aparecen burbujas, dalo vuelta (2-3 min por lado).",
        "Apilá los pancakes y poné los arándanos encima con miel. Los pancakes americanos esponjosos son completamente distintos a los finos."
      ], null),

      meal("11:30", "Media mañana", "Tostadas con queso untable, frutillas y canela", "2 tostadas · queso untable · frutillas · miel · canela", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("4 cdas queso untable", 12, 4, 7),
        food("100g frutillas", 1, 8, 0),
        food("1 cdita miel · pizca canela", 0, 8, 0)
      ], [
        "Batí la queso untable con la miel. Poné sobre las tostadas con las frutillas cortadas y canela."
      ], null),

      meal("12:30", "Pre-entreno", "Banana + pasas", "Carbo para hombros", 0, [
        food("1 banana", 1, 27, 0),
        food("30g pasas", 1, 23, 0)
      ], ["Pre estándar."], null),

      meal("14:30", "Post-entreno", "Shake proteico + banana + creatina", "Whey · banana · leche · creatina", 0, [
        food("1 scoop whey", 25, 2, 2),
        food("1 banana", 1, 27, 0),
        food("200ml leche", 6, 10, 7),
        food("5g creatina", 0, 0, 0)
      ], ["Post-entreno estándar."], null),

      meal("16:00", "Almuerzo", "Curry de pollo y garbanzos con arroz basmati", "150g pollo · garbanzos · leche coco light · curry · arroz", 0, [
        food("150g pechuga en cubos", 47, 0, 5),
        food("1/2 taza garbanzos cocidos", 5, 15, 2),
        food("100ml leche de coco light", 1, 3, 5),
        food("100ml tomate triturado", 1, 5, 0),
        food("3/4 taza arroz basmati cocido", 3, 40, 0),
        food("1 cdita curry en polvo", 0, 2, 1)
      ], [
        "Sofreí cebolla + ajo + curry en polvo hasta que aromatice. Sumá el pollo y dorá.",
        "Agregá tomate, leche de coco y garbanzos. Cociná 15 min a fuego medio.",
        "El curry de pollo y garbanzos es el almuerzo más diferente de todas las semanas. Cambia completamente el paladar."
      ], null,
      altMeal("Pollo a la griega con papas al limón", "200g pollo · papas · orégano griego · limón · aceitunas · oliva", [
        food("200g muslo de pollo", 46, 0, 14),
        food("250g papas", 5, 50, 0),
        food("Jugo de 2 limones + orégano + aceitunas", 0, 6, 6),
        food("2 cdas aceite de oliva", 0, 0, 28)
      ], [
        "Macerá el pollo y las papas con limón, orégano, ajo y oliva. Todo en bandeja al horno 180°C por 45 min.",
        "Agregá las aceitunas los últimos 10 min. El limón y el orégano griego son la clave del sabor."
      ])),

      meal("19:30", "Merienda", "Licuado de mango, banana y leche", "1 mango · banana · leche entera · miel", 0, [
        food("1 mango maduro", 1, 25, 0),
        food("1 banana", 1, 27, 0),
        food("200ml leche entera", 6, 10, 7),
        food("1 cdita miel", 0, 8, 0)
      ], [
        "Licuá todo junto hasta que quede cremoso. Tropical y delicioso.",
        "Si el mango es de estación (verano): perfecto. Fuera de estación usá mango congelado."
      ], null),

      meal("22:00", "Cena", "Noodles de arroz con pollo y vegetales salteados", "80g noodles · 150g pollo · brócoli · zanahoria · soja", 0, [
        food("80g fideos de arroz", 8, 57, 1),
        food("150g pollo en tiras", 47, 0, 5),
        food("100g brócoli + 1/2 zanahoria", 3, 9, 0),
        food("2 cdas salsa de soja", 2, 3, 0),
        food("1 cdita aceite de sésamo", 0, 0, 5)
      ], [
        "Remojá los noodles en agua caliente 3 min (si son finos). En wok, salteá el pollo + vegetales + soja.",
        "Incorporá los noodles escurridos y saltea 2 min. El sésamo al final — da un sabor que no existe en ningún plato argentino."
      ], null,
      altMeal("Pizza bianca con pollo, rúcula y parmesano", "1 prepizza · pollo · rúcula · parmesano · oliva · limón", [
        food("1 prepizza integral (200g)", 12, 54, 4),
        food("120g pollo grillado laminado", 38, 0, 4),
        food("60g rúcula fresca", 2, 3, 0),
        food("30g parmesano en láminas", 9, 0, 9),
        food("1 cda aceite de oliva + limón", 0, 1, 14)
      ], [
        "Horneá la prepizza con solo oliva y ajo 10 min a 220°C.",
        "Sacala y poné encima el pollo + rúcula + parmesano + ralladura de limón. Pizza bianca: sin tomate, con carácter."
      ])),

      meal("23:30", "Antes de dormir", "queso untable con miel", "Proteína lenta", 0, [
        food("100g queso untable", 11, 3, 4),
        food("1 cdita miel", 0, 8, 0)
      ], ["Opcional."], "Opcional.")
    ]
  },

  // ===== JUEVES · PIERNAS =====
  {
    id: "jue", tab: "Jue", dayIndex: 4, title: "Jueves",
    type: "Día de gym · Piernas (día más pesado)",
    workout: { name: "Piernas", duration: "70 min", icon: "🦵", primary: ["Cuádriceps", "Isquios", "Glúteos"] },
    isRestDay: false, kcal: 3100, protein: 180, carbs: 360, fats: 85,
    tags: ["Piernas", "Máximo combustible"],
    tip: "El día más pesado. Menú internacional con máxima proteína.",
    meals: [
      meal("10:00", "Desayuno", "Burritos de huevo con queso y salsa", "3 huevos · 1 tortilla · queso · tomate · palta · salsa", 0, [
        food("3 huevos revueltos", 18, 0, 15),
        food("2 tortillas de harina", 8, 40, 4),
        food("50g queso fresco", 6, 1, 5),
        food("1 tomate en cubos", 1, 5, 0),
        food("1/4 palta", 1, 5, 8),
        food("Jugo de naranja 200ml", 2, 22, 0)
      ], [
        "Revolvé los huevos con el queso hasta casi cuajar.",
        "Calentá las tortillas y rellenálas con los huevos, el tomate y la palta. Enrollá.",
        "Los burritos de huevo son el desayuno con más carbo para el día de piernas."
      ], null),

      meal("11:30", "Media mañana", "Sándwich cubano de pollo y jamón", "Pan · pollo · jamón · queso · pepinillos · mostaza", 0, [
        food("1 pan ciabatta o francés", 8, 34, 2),
        food("80g pollo cocido laminado", 25, 0, 3),
        food("60g jamón natural", 12, 0, 4),
        food("40g queso fresco", 5, 1, 4),
        food("Pepinillos + mostaza", 0, 3, 0)
      ], [
        "Armá el sándwich con todas las capas. Aplastalo con algo pesado y cocinalo en sartén 3 min por lado.",
        "El cubano prensado tiene una combinación de sabores única — el pepinillo hace toda la diferencia."
      ], null),

      meal("12:30", "Pre-entreno", "Banana + dátiles + miel", "Máximo combustible piernas", 0, [
        food("1 banana", 1, 30, 0),
        food("35g dátiles", 0, 26, 0),
        food("1 cda miel", 0, 17, 0)
      ], ["Triple carbo. Piernas exige lo máximo."], "Obligatorio."),

      meal("14:30", "Post-entreno", "Shake reforzado post-piernas", "2 scoops · banana · leche · creatina", 0, [
        food("2 scoops whey", 50, 4, 4),
        food("1 banana", 1, 30, 0),
        food("200ml leche entera", 6, 10, 7),
        food("5g creatina", 0, 0, 0)
      ], ["2 scoops solo hoy."], null),

      meal("16:00", "Almuerzo", "Carne agridulce estilo oriental con arroz", "180g carne · arroz · morrón · ananá · salsa agridulce", 0, [
        food("180g carne magra en tiras", 47, 0, 8),
        food("1 taza arroz blanco cocido", 4, 50, 0),
        food("1 morrón rojo", 1, 8, 0),
        food("80g ananá o piña en trozos", 0, 15, 0),
        food("2 cdas salsa agridulce (soja + miel + vinagre)", 1, 10, 0),
        food("1 cda aceite de girasol", 0, 0, 14)
      ], [
        "Salteá la carne a fuego muy fuerte sin aceite extra hasta dorar. Reservá.",
        "Salteá el morrón y el ananá 2 min. Devolvé la carne y bañá con la salsa agridulce.",
        "La combinación carne + ananá + salsa agridulce es el sabor más sorprendente del menú internacional."
      ], null,
      altMeal("Lomo saltado peruano con papas y arroz", "160g lomo · papas fritas · tomate · cebolla · soja · arroz", [
        food("160g lomo o bife en tiras", 32, 0, 8),
        food("200g papas tipo bastones al horno", 4, 40, 0),
        food("1 taza arroz cocido", 4, 50, 0),
        food("1/2 cebolla morada + 1 tomate", 1, 10, 0),
        food("2 cdas soja + ají amarillo o pimentón", 2, 3, 0)
      ], [
        "Salteá la carne a fuego máximo 2 min. Sumá cebolla morada y tomate y saltea 1 min más.",
        "Bañá con soja y sirve sobre el arroz con las papas al costado. El lomo saltado es el plato peruano más adictivo."
      ])),

      meal("19:30", "Merienda", "Tostadas con manteca de maní y banana", "2 tostadas · maní · banana · leche", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("2 cdas manteca de maní", 8, 6, 16),
        food("1 banana", 1, 27, 0),
        food("250ml leche entera", 8, 12, 9)
      ], ["Merienda densa para el día de piernas."], null),

      meal("22:00", "Cena", "Cuscús marroquí con pollo especiado", "170g pollo · 60g cuscús · zanahoria · garbanzos · ras el hanout", 0, [
        food("170g pechuga con especias marroquíes", 53, 0, 5),
        food("60g cuscús seco (rinde 120g)", 7, 44, 1),
        food("1/2 taza garbanzos cocidos", 5, 15, 2),
        food("1 zanahoria en cubos", 1, 10, 0),
        food("1 cdita ras el hanout o curry mixto", 0, 2, 1)
      ], [
        "Marinato el pollo con ras el hanout (mezcla de especias), ajo y oliva. Grillalo.",
        "Para el cuscús: caldo hirviendo sobre el cuscús, tapá 5 min y esponjá con tenedor.",
        "Mezclá los garbanzos y la zanahoria en el cuscús. El ras el hanout da un sabor norteafricano único."
      ], null,
      altMeal("Shawarma de pollo con pan árabe y tahini", "160g pollo marinado · 2 panes árabes · tahini · pepino · tomate", [
        food("160g pechuga en tiras con comino y pimentón", 50, 0, 5),
        food("2 panes árabes", 8, 36, 2),
        food("2 cdas tahini", 4, 6, 10),
        food("Pepino + tomate + lechuga", 1, 8, 0)
      ], [
        "Grillá las tiras de pollo. Untá los panes con tahini (pasta de sésamo).",
        "Armá con el pollo, pepino, tomate y lechuga. Enrollá. El tahini es lo que hace al shawarma diferente de cualquier otro wrap."
      ])),

      meal("23:30", "Antes de dormir", "Shake nocturno (obligatorio hoy)", "Piernas exige proteína nocturna", 0, [
        food("1 scoop whey con 200ml leche", 25, 10, 9)
      ], ["Obligatorio hoy — piernas está en máximo daño muscular."], "Obligatorio.")
    ]
  },

  // ===== VIERNES · FULL BODY =====
  {
    id: "vie", tab: "Vie", dayIndex: 5, title: "Viernes",
    type: "Full body opcional · Cardio o descanso",
    workout: { name: "Full Body", duration: "50 min", icon: "⚡", optional: true, primary: ["Full body"] },
    isRestDay: false, kcal: 2700, protein: 160, carbs: 305, fats: 75,
    tags: ["Full body", "Opcional"],
    tip: "Viernes liviano con el menú más fresco de la semana.",
    meals: [
      meal("10:00", "Desayuno", "pancakes proteicos de banana con maní", "2 waffles · pan integral · huevo · banana · manteca maní", 0, [
        food("2 tostadas integrales", 6, 33, 3),
        food("2 huevos", 12, 0, 10),
        food("100ml leche", 3, 5, 4),
        food("1 banana", 1, 27, 0),
        food("1 cda manteca de maní", 4, 3, 8)
      ], [
        "Licuá premezcla de pancakes proteicos + huevos + leche hasta obtener una mezcla espesa. Cocinalo en wafflera o sartén.",
        "Serví con banana en rodajas y manteca de maní por encima. Los waffles de pan integral son una variación del panqueque con otra textura."
      ], "Si no tenés wafflera, hacélo como panqueques gruesos."),

      meal("12:00", "Media mañana", "Bol de frutas con queso untable y granola", "Frutas variadas · queso untable · granola · miel", 0, [
        food("150g frutas (banana + manzana + naranja)", 1, 35, 0),
        food("150g queso untable", 6, 8, 6),
        food("25g granola", 2, 17, 3),
        food("1 cdita miel", 0, 8, 0)
      ], ["Bol de frutas con queso untable. Fresco y liviano para el viernes."], null),

      meal("13:30", "Almuerzo", "Salmón teriyaki con arroz y brócoli", "200g salmón · salsa teriyaki · arroz · brócoli · sésamo", 0, [
        food("200g filet de salmón", 50, 0, 26),
        food("1 taza arroz blanco cocido", 4, 50, 0),
        food("150g brócoli al vapor", 4, 7, 0),
        food("2 cdas salsa teriyaki", 1, 8, 0),
        food("1 cdita sésamo negro", 1, 1, 3)
      ], [
        "Marinato el salmón con la salsa teriyaki 15 min. Cocinalo en sartén 4 min por lado.",
        "Bañalo con el exceso de la marinada en el último minuto para que caramelice.",
        "Salmón + teriyaki + sésamo = el plato más japonés del menú. El sésamo negro da presentación y sabor a tostado."
      ], null,
      altMeal("Bowl de atún con arroz, palta y sésamo", "2 latas atún · arroz · palta · zanahoria · soja · sésamo", [
        food("2 latas atún al natural", 56, 0, 4),
        food("1 taza arroz cocido", 4, 50, 0),
        food("1/4 palta", 1, 5, 8),
        food("1/2 zanahoria rallada", 0, 5, 0),
        food("2 cdas soja + sésamo", 2, 3, 2)
      ], [
        "Armá el bowl: arroz de base, atún bien escurrido encima, palta en rodajas, zanahoria rallada.",
        "Rociá con soja y sésamo. El poke bowl casero — sin necesidad de pescado crudo."
      ])),

      meal("17:00", "Merienda", "Mate con galletitas de arroz y maní caseras", "Mate + galletitas banana + leche", 0, [
        food("8 galletitas de arroz y maní", 6, 32, 8),
        food("1 banana", 1, 27, 0)
      ], ["Merienda liviana del viernes."], null),

      meal("22:00", "Cena", "Falafel casero con arroz y ensalada", "Falafel de garbanzos · arroz · ensalada · queso untable · limón", 0, [
        food("6 falafeles caseros (garbanzos+especias+harina)", 10, 28, 8),
        food("3/4 taza arroz cocido", 3, 37, 0),
        food("3 cdas queso untable", 5, 4, 3),
        food("Ensalada (pepino+tomate+cebolla+perejil)", 2, 10, 0)
      ], [
        "Para falafel: procesá garbanzos en lata escurridos + ajo + perejil + comino + sal + 2 cdas harina. Formá bolitas y horneá a 200°C por 20 min.",
        "Servís con arroz, ensalada y queso untable condimentado con limón. Los falafeles al horno son crujientes y sanos."
      ], null,
      altMeal("Pollo con especias marroquíes y couscous", "160g pollo · cuscús · zanahoria · garbanzos · canela", [
        food("160g pechuga especiada (comino+canela+pimentón)", 50, 0, 5),
        food("60g cuscús seco", 7, 44, 1),
        food("Garbanzos + zanahoria + oliva", 5, 18, 6)
      ], [
        "Grillá el pollo con las especias. Hidratá el cuscús con caldo hirviendo.",
        "Mezclá el cuscús con los garbanzos y la zanahoria. Servís el pollo encima."
      ])),

      meal("23:30", "Antes de dormir", "queso untable o leche", "Cierre del viernes", 0, [
        food("100g queso untable con miel o leche 250ml", 11, 11, 4)
      ], ["Opcional."], "Opcional.")
    ]
  },

  // ===== SÁBADO · DESCANSO =====
  {
    id: "sab", tab: "Sáb", dayIndex: 6, title: "Sábado",
    type: "Día de descanso activo",
    workout: { name: "Descanso", duration: "—", icon: "🚶", primary: [] },
    isRestDay: true, kcal: 2600, protein: 150, carbs: 290, fats: 80,
    tags: ["Descanso", "Mix internacional"],
    tip: "Sábado internacional. Cenas y almuerzos con carácter.",
    meals: [
      meal("10:00", "Desayuno", "Eggs benedict sin holandesa: huevos poché con jamón y tostadas", "2 huevos poché · jamón · 2 tostadas · espinaca · café", 0, [
        food("2 huevos pochados", 12, 0, 10),
        food("60g jamón natural", 12, 0, 4),
        food("2 tostadas integrales", 8, 28, 2),
        food("Espinaca salteada con ajo", 2, 3, 2),
        food("Café con leche 200ml", 6, 8, 6)
      ], [
        "Hacé los huevos pochados (ver técnica semana 2). Tostand el pan.",
        "Base: tostada + espinaca salteada + jamón + el huevo pochado encima.",
        "Sin holandesa (demasiada grasa) pero con toda la presentación del plato."
      ], null),

      meal("12:30", "Media mañana", "Tostadas con palta y semillas", "2 tostadas · palta · chía · girasol · limón", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("1/3 palta", 1, 7, 11),
        food("2 cditas semillas mixtas", 2, 4, 4)
      ], ["Palta con semillas. Simple."], null),

      meal("14:00", "Almuerzo", "Pollo asado con cinco especias y arroz integral", "250g pollo · 5 especias chinas · arroz integral · pepino", 0, [
        food("250g pollo en presas", 56, 0, 14),
        food("3/4 taza arroz integral cocido", 3, 37, 1),
        food("1/2 pepino en rodajas", 0, 4, 0),
        food("Mezcla 5 especias + soja + miel + ajo", 1, 6, 0),
        food("1 cda aceite de sésamo", 0, 0, 14)
      ], [
        "Marinato el pollo con la mezcla de cinco especias (anís + clavo + canela + pimienta + hinojo), soja y miel. Mínimo 30 min.",
        "Horneá a 200°C por 35-40 min, bañando con la marinada a mitad.",
        "El pollo con cinco especias chinas es el sabor más diferente de las 4 semanas."
      ], null,
      altMeal("Costillitas de cerdo agridulces con ensalada", "350g costillas · miel + soja + ajo + jengibre", [
        food("350g costillitas de cerdo", 45, 0, 20),
        food("Glaze (miel + soja + ajo + jengibre)", 2, 18, 1),
        food("Ensalada coleslaw liviana (repollo + zanahoria + queso untable)", 3, 12, 3)
      ], [
        "Cociná las costillas tapadas con aluminio a 180°C por 45 min. Bañálas con el glaze y destapá 15 min más.",
        "El glaze de miel y soja carameliza y las hace absolutamente distintas a las costillas simples."
      ])),

      meal("17:30", "Merienda", "Mate con sándwich mixto", "Mate + pan + queso + tomate", 0, [
        food("2 rodajas pan integral", 8, 28, 2),
        food("60g queso fresco", 7, 1, 6),
        food("1 tomate", 1, 5, 0)
      ], ["Mate con sándwich de queso y tomate."], null),

      meal("22:00", "Cena", "Gyozas de pollo caseras con arroz", "12 gyozas rellenas de pollo · arroz · salsa de soja", 0, [
        food("12 tapas de wonton o obleas", 6, 42, 2),
        food("150g pollo molido o muy picado con jengibre y soja", 47, 0, 5),
        food("3/4 taza arroz cocido", 3, 37, 0),
        food("Salsa ponzu o soja + limón para mojar", 1, 3, 0)
      ], [
        "Para el relleno: procesá el pollo con jengibre rallado, cebolla de verdeo y soja.",
        "Rellená cada oblea con 1 cdita, mojá los bordes con agua y cerrá en pliegues. Cocinalo en sartén con aceite 3 min y agregá 50ml agua, tapá 5 min.",
        "Las gyozas caseras son un proyecto de cocina diferente — impresionan y saben a restaurante."
      ], null,
      altMeal("Pasta fría con atún, palta y limón", "80g pasta · atún · palta · cherry · limón · oliva", [
        food("80g fusilli cocidos y fríos", 10, 58, 2),
        food("1 lata atún", 28, 0, 2),
        food("1/4 palta", 1, 5, 8),
        food("100g cherry + aceitunas", 1, 8, 4),
        food("Limón + oliva", 0, 2, 10)
      ], [
        "Mezclá la pasta fría con el atún, la palta en cubos, los cherry y las aceitunas.",
        "Aderezá con limón, oliva y sal. La pasta fría en verano es un plato que cambia todo."
      ])),

      meal("23:30", "Antes de dormir", "leche o queso untable", "Cierre del sábado", 0, [
        food("250ml leche entera", 8, 12, 9)
      ], ["Opcional."], "Opcional.")
    ]
  },

  // ===== DOMINGO · DESCANSO =====
  {
    id: "dom", tab: "Dom", dayIndex: 7, title: "Domingo",
    type: "Día de descanso completo",
    workout: { name: "Descanso total", duration: "—", icon: "🛌", primary: [] },
    isRestDay: true, kcal: 2500, protein: 145, carbs: 275, fats: 78,
    tags: ["Descanso", "Domingo especial"],
    tip: "Domingo de recargar energía para la semana que viene.",
    meals: [
      meal("10:00", "Desayuno", "Pancakes de banana con chips de chocolate", "2 tostadas integrales · 2 huevos · banana · 15g chocolate negro · leche", 0, [
        food("2 tostadas integrales", 6, 33, 3),
        food("2 huevos", 12, 0, 10),
        food("1 banana", 1, 27, 0),
        food("100ml leche", 3, 5, 4),
        food("15g chips de chocolate negro", 2, 10, 5),
        food("1 cda miel", 0, 17, 0)
      ], [
        "Licuá premezcla de pancakes proteicos + huevos + banana + leche. Poné los chips de chocolate en la mezcla ya fuera del mixer.",
        "Cocinalo en sartén. Los chips se derriten un poco y crean bolsas de chocolate — el desayuno dominical definitivo."
      ], null),

      meal("13:30", "Almuerzo", "Paella simplificada de pollo y mariscos", "200g pollo · 100g langostinos · arroz · pimentón · azafrán · guisantes", 0, [
        food("200g muslo o pechuga", 46, 0, 10),
        food("100g langostinos o camarones", 18, 0, 1),
        food("1.5 tazas arroz para paella", 6, 75, 0),
        food("1 taza guisantes (arvejas) + morrón", 4, 18, 0),
        food("Azafrán o cúrcuma + pimentón + caldo", 1, 4, 0),
        food("2 cdas aceite de oliva", 0, 0, 28)
      ], [
        "Sofreí el pollo en dados, luego el morrón. Sumá el arroz y el pimentón, sofreí 1 min.",
        "Cubrí con caldo (doble del arroz) y el azafrán. Cociná 18 min a fuego medio sin revolver.",
        "Los últimos 5 min sumá los langostinos y guisantes. Dejá reposar tapado 5 min. El socarrat (fondo tostado) es el tesoro."
      ], "La paella pide paciencia y no mezclar. Una vez por semana vale el esfuerzo.",
      altMeal("Pollo al vino blanco con papas salteadas", "250g pollo · vino blanco · papas · ajo · perejil", [
        food("250g pollo en presas", 56, 0, 14),
        food("200g papas en cubos salteadas", 4, 40, 4),
        food("100ml vino blanco seco", 0, 4, 0),
        food("Ajo + perejil + oliva", 0, 2, 10)
      ], [
        "Dorá el pollo en sartén. Sumá ajo y el vino — dejá que evapore el alcohol 2 min.",
        "Tapá y cociná 25 min. Las papas salteadas aparte en oliva con ajo y perejil."
      ])),

      meal("17:30", "Merienda", "Mate con medialunas o tostadas", "Mate + 2 medialunas o tostadas", 0, [
        food("2 medialunas de manteca", 6, 30, 10),
        food("Mate", 0, 0, 0)
      ], ["La merienda más simple del domingo. Mate y lo que tengas ganas."], null),

      meal("22:00", "Cena", "Pollo con salsa de maní estilo satay + arroz", "160g pollo · salsa satay · arroz · pepino · limón", 0, [
        food("160g pechuga en bastones", 50, 0, 5),
        food("3/4 taza arroz jazmín o blanco", 3, 40, 0),
        food("Salsa satay (manteca maní + soja + limón + jengibre + miel)", 8, 10, 16),
        food("1/2 pepino en juliana", 0, 4, 0)
      ], [
        "Para el satay: 3 cdas manteca de maní + 2 cdas soja + jugo de limón + ralladura de jengibre + 1 cdita miel + agua tibia para aflojar la consistencia.",
        "Pinchá el pollo en palitos y grillalo. Bañalo con la mitad de la salsa al servir.",
        "Poné el pepino fresco al costado como contraste. La salsa de maní satay es única en su sabor."
      ], null,
      altMeal("Hamburguesas de salmón con ensalada fresca", "2 hamburguesas salmón · 2 panes · palta · lechuga · limón", [
        food("2 hamburguesas de salmón (200g salmón+pan rallado+huevo)", 36, 6, 14),
        food("2 panes integrales", 10, 40, 4),
        food("1/4 palta", 1, 5, 8),
        food("Lechuga + tomate + limón", 2, 6, 0)
      ], [
        "Procesá el salmón con pan rallado, huevo, cebolla de verdeo y limón. Formá 2 burgers y grillá 4 min por lado.",
        "Armá con palta, lechuga y tomate. Las hamburguesas de salmón son una versión completamente diferente al clásico."
      ])),

      meal("23:30", "Antes de dormir", "Shake de cierre", "Proteína nocturna semanal", 0, [
        food("1 scoop whey con 200ml leche", 25, 10, 9)
      ], ["Cerrá la semana 3 con proteína. Excelente trabajo."], "Opcional.")
    ]
  }
], // fin Semana 3

// ╔══════════════════════════════════════╗
// ║  SEMANA 4 · "Proteico puro"          ║
// ╚══════════════════════════════════════╝
[
  // ===== LUNES · PECHO + TRÍCEPS =====
  {
    id: "lun", tab: "Lun", dayIndex: 1, title: "Lunes",
    type: "Día de gym · Pecho + tríceps",
    workout: { name: "Pecho · Tríceps", duration: "60 min", icon: "🏋️", primary: ["Pecho", "Tríceps"] },
    isRestDay: false, kcal: 2900, protein: 175, carbs: 325, fats: 78,
    tags: ["Pecho", "Tríceps", "Alto proteína"],
    tip: "Semana 4 — foco en proteína. Cada comida tiene más proteína que en semanas anteriores. Ideal para quien quiere maximizar la recomposición.",
    meals: [
      meal("10:00", "Desayuno", "Omelette blanca con claras, queso y espárragos", "5 claras + 1 huevo · espárragos · queso fresco · jugo · tostadas", 0, [
        food("5 claras de huevo + 1 huevo entero", 26, 0, 5),
        food("80g espárragos salteados", 2, 4, 0),
        food("50g queso fresco bajo en grasas", 9, 1, 4),
        food("2 tostadas integrales", 8, 28, 2),
        food("Jugo de naranja 200ml", 2, 22, 0)
      ], [
        "Batí las claras y el huevo. Salteá los espárragos en oliva 2 min.",
        "Volcá los huevos sobre los espárragos. Cuando casi cuaje, poné el queso y doblá.",
        "El desayuno más proteico: 45g de proteína limpia con poca grasa."
      ], null),

      meal("11:30", "Media mañana", "queso untable con tomate y semillas", "200g queso untable · tomate · pepino · chía · oliva", 0, [
        food("200g queso untable", 22, 6, 8),
        food("1 tomate", 1, 5, 0),
        food("1/2 pepino", 0, 4, 0),
        food("1 cdita chía", 1, 2, 2),
        food("Sal + orégano + oliva", 0, 0, 5)
      ], [
        "Poné el queso untable en un bol. Cortá el tomate y el pepino en cubos encima.",
        "Esparcí la chía, el orégano y un hilo de oliva. El queso untable como snack salado — completamente diferente a usarlo solo dulce."
      ], null),

      meal("12:30", "Pre-entreno", "Banana + pasas de uva", "Carbo rápido para pecho", 0, [
        food("1 banana", 1, 27, 0),
        food("35g pasas", 1, 27, 0)
      ], ["Pre estándar."], null),

      meal("14:30", "Post-entreno", "Shake proteico + banana + creatina", "Whey · banana · leche · creatina", 0, [
        food("1 scoop whey", 25, 2, 2),
        food("1 banana", 1, 27, 0),
        food("200ml leche entera", 6, 10, 7),
        food("5g creatina", 0, 0, 0)
      ], ["Post-entreno estándar."], null),

      meal("16:00", "Almuerzo", "Pechuga doble grillada con batata y espinaca", "200g pechuga · batata · espinaca · ajo · oliva", 0, [
        food("200g pechuga de pollo", 62, 0, 6),
        food("200g batata", 4, 48, 0),
        food("100g espinaca salteada", 3, 3, 0),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "Macerá la pechuga con ajo, orégano, oliva y sal 20 min. Grillala a fuego fuerte 5 min por lado.",
        "Batata al horno a 200°C por 30 min. Espinaca salteada con ajo 2 min.",
        "El plato más proteico del menú — 65g de proteína limpia en un almuerzo."
      ], "62g de proteína + batata que mantiene la glucosa estable.",
      altMeal("Ensalada proteica de atún, huevo y garbanzos", "2 latas atún · 2 huevos duros · garbanzos · mix vegetales · oliva", [
        food("2 latas atún al natural", 56, 0, 4),
        food("2 huevos duros", 12, 0, 10),
        food("1/2 taza garbanzos cocidos", 5, 15, 2),
        food("Lechuga + tomate + oliva + limón", 2, 8, 10)
      ], [
        "Armá la ensalada con todo junto. El atún + huevo + garbanzo es la triada proteica perfecta.",
        "Adereza con oliva y limón. Podés agregar rodajas de pan integral al costado."
      ])),

      meal("19:30", "Merienda", "queso untable natural con nueces y fruta", "200g queso untable · 25g nueces · banana · miel", 0, [
        food("200g queso untable natural", 20, 8, 10),
        food("25g nueces", 4, 4, 16),
        food("1 banana", 1, 27, 0),
        food("1 cdita miel", 0, 8, 0)
      ], ["queso untable con nueces y banana. Alta proteína + grasas buenas."], null),

      meal("22:00", "Cena", "Carne magra al horno con vegetales asados", "180g peceto · zapallito · morrón · zanahoria · ajo · romero", 0, [
        food("180g peceto al horno", 47, 0, 6),
        food("1 zucchini + 1 morrón + 1 zanahoria", 2, 16, 0),
        food("1 papa mediana al horno", 2, 20, 0),
        food("2 cdas aceite de oliva", 0, 0, 28)
      ], [
        "Condimentá el peceto con romero, ajo, sal y oliva. Cubrí con aluminio y horneá 35 min a 180°C.",
        "En la misma bandeja los vegetales. Destapá los últimos 10 min para dorar.",
        "Todo asado en una bandeja = menos platos + máximo sabor."
      ], null,
      altMeal("Pollo al horno con cebolla y papas rústicas", "200g pollo · papas · cebolla · laurel · vino blanco", [
        food("200g muslo deshuesado", 46, 0, 10),
        food("250g papas rústicas", 5, 50, 0),
        food("1 cebolla grande", 1, 12, 0),
        food("50ml vino blanco + laurel + oliva", 0, 2, 10)
      ], [
        "Todo en bandeja con el vino blanco en el fondo. Laurel + ajo + oliva.",
        "Horneá tapado 30 min, destapá 15 min más. El vino se evapora y deja un sabor profundo."
      ])),

      meal("23:30", "Antes de dormir", "Shake proteico nocturno", "Proteína de caseinado lento", 0, [
        food("1 scoop whey con 200ml leche entera", 25, 10, 9)
      ], ["El shake con leche tiene caseína natural — proteína de digestión lenta para la noche."], "Recomendado esta semana.")
    ]
  },

  // ===== MARTES · ESPALDA + BÍCEPS =====
  {
    id: "mar", tab: "Mar", dayIndex: 2, title: "Martes",
    type: "Día de gym · Espalda + bíceps",
    workout: { name: "Espalda · Bíceps", duration: "60 min", icon: "🏋️", primary: ["Espalda", "Bíceps"] },
    isRestDay: false, kcal: 2950, protein: 180, carbs: 335, fats: 78,
    tags: ["Espalda", "Bíceps", "Alto proteína"],
    tip: "Espalda con foco máximo en proteína. Hoy llegamos a 180g.",
    meals: [
      meal("10:00", "Desayuno", "Tostadas con queso untable, whey y banana", "queso untable · whey · pan integral · banana · miel", 0, [
        food("200g queso untable", 20, 8, 10),
        food("1/2 scoop whey vainilla", 13, 1, 1),
        food("2 tostadas integrales", 4, 27, 3),
        food("1 banana", 1, 27, 0),
        food("1 cdita miel", 0, 8, 0)
      ], [
        "Mezclá el queso untable con el whey y la miel hasta que no haya grumos.",
        "Sumá el pan integral y cortá la banana encima. El desayuno más proteico del lunes: 38g en un bol.",
        "El pan integral se digiere bien con el queso untable — no hace falta cocinarlo."
      ], null),

      meal("11:30", "Media mañana", "Sándwich de pechuga con palta y tomate", "2 rodajas pan · 100g pechuga laminada · palta · tomate", 0, [
        food("2 rodajas pan integral", 8, 28, 2),
        food("100g pechuga cocida laminada", 31, 0, 3),
        food("1/4 palta", 1, 5, 8),
        food("1 tomate + lechuga", 1, 5, 0)
      ], [
        "Pechuga laminada fría con palta y tomate. El sándwich más limpio en términos de proteína."
      ], null),

      meal("12:30", "Pre-entreno", "Banana + miel + tostada", "Carbo para espalda", 0, [
        food("1 banana", 1, 27, 0),
        food("1 cda miel", 0, 17, 0),
        food("1 tostada", 4, 14, 1)
      ], ["Pre estándar para espalda."], null),

      meal("14:30", "Post-entreno", "Shake proteico + banana + creatina", "Whey · banana · leche · creatina", 0, [
        food("1 scoop whey", 25, 2, 2),
        food("1 banana", 1, 27, 0),
        food("200ml leche", 6, 10, 7),
        food("5g creatina", 0, 0, 0)
      ], ["Post-entreno estándar."], null),

      meal("16:00", "Almuerzo", "Peceto en salsa de hongos con arroz y brócoli", "180g peceto · champiñones · crema light · arroz · brócoli", 0, [
        food("180g peceto al horno", 47, 0, 6),
        food("150g champiñones frescos", 3, 4, 0),
        food("4 cdas crema light", 3, 2, 8),
        food("1 taza arroz cocido", 4, 50, 0),
        food("150g brócoli", 4, 7, 0)
      ], [
        "Sellá el peceto en sartén caliente y pasalo al horno 20 min a 200°C.",
        "En la misma sartén, sofreí los champiñones con ajo. Sumá la crema light y reducí 3 min.",
        "Cortá el peceto en medallones y serví con la salsa encima, el arroz y el brócoli al vapor."
      ], null,
      altMeal("Pollo al curry liviano con quinoa y vegetales", "180g pollo · quinoa · brócoli · leche coco light · curry", [
        food("180g pechuga", 56, 0, 5),
        food("3/4 taza quinoa cocida", 6, 30, 3),
        food("150g brócoli", 4, 7, 0),
        food("3 cdas leche de coco light", 0, 2, 3),
        food("1 cdita curry", 0, 2, 1)
      ], [
        "Salteá el pollo con cebolla y curry. Sumá la leche de coco y cociná 10 min.",
        "Servís con quinoa y brócoli al vapor. Curry liviano: todo el sabor, sin la pesadez."
      ])),

      meal("19:30", "Merienda", "2 huevos duros con tostadas y palta", "2 huevos duros · 2 tostadas · palta · sal · pimienta", 0, [
        food("2 huevos duros", 12, 0, 10),
        food("2 tostadas integrales", 8, 28, 2),
        food("1/4 palta", 1, 5, 8)
      ], [
        "Huevos duros con palta y tostadas. Merienda alta en proteína y baja en carbo.",
        "Ideal para la tarde de un día de espalda."
      ], null),

      meal("22:00", "Cena", "Wok de carne y vegetales con arroz integral", "160g carne · brócoli · morrón · soja · arroz integral", 0, [
        food("160g carne magra en tiras finas", 32, 0, 10),
        food("150g brócoli + 1 morrón", 4, 15, 0),
        food("3/4 taza arroz integral cocido", 3, 37, 1),
        food("2 cdas salsa de soja", 2, 3, 0),
        food("1 cda aceite de girasol", 0, 0, 14)
      ], [
        "Wok o sartén muy caliente. Carne primero — 3 min a fuego máximo. Reservá.",
        "Salteá el brócoli y morrón 3 min. Devolvé la carne, sumá el arroz integral y la soja.",
        "Mezcla rápida 2 min. El arroz integral en el wok absorbe la soja y queda mucho mejor que hervido."
      ], null,
      altMeal("Cena proteica directa: atún + papa + ensalada", "2 latas atún · 1 papa hervida · tomate · pepino · oliva", [
        food("2 latas atún al natural", 56, 0, 4),
        food("1 papa mediana hervida", 2, 20, 0),
        food("Tomate + pepino + lechuga + oliva", 2, 9, 10)
      ], [
        "Hervite la papa en rodajas. Armá el plato con el atún encima, la ensalada al costado y la papa.",
        "La cena más directa del menú: sin cocción elaborada, máxima proteína limpia."
      ])),

      meal("23:30", "Antes de dormir", "Shake nocturno", "Recuperación espalda", 0, [
        food("1 scoop whey con 200ml leche", 25, 10, 9)
      ], ["Proteína nocturna recomendada después de espalda."], "Recomendado.")
    ]
  },

  // ===== MIÉRCOLES · HOMBROS =====
  {
    id: "mie", tab: "Mié", dayIndex: 3, title: "Miércoles",
    type: "Día de gym · Hombros",
    workout: { name: "Hombros · Abdomen", duration: "55 min", icon: "🏋️", primary: ["Hombros"] },
    isRestDay: false, kcal: 2850, protein: 165, carbs: 315, fats: 78,
    tags: ["Hombros", "Alto proteína"],
    tip: "Hombros con desayuno alto en proteína. El batido de media mañana suma 35g extra.",
    meals: [
      meal("10:00", "Desayuno", "Huevos revueltos (4) con tostadas y jugo de naranja", "4 huevos · 2 tostadas · jugo naranja · café · aceite oliva", 0, [
        food("4 huevos enteros", 24, 0, 20),
        food("2 tostadas integrales", 8, 28, 2),
        food("Jugo de 2 naranjas frescas", 2, 22, 0),
        food("Café con leche 200ml", 6, 8, 6),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "4 huevos revueltos a fuego suave con oliva. Retiralos del fuego cuando todavía estén brillantes — el calor residual termina.",
        "Serví con el jugo y el café con leche. 4 huevos = 24g de proteína solo en el desayuno."
      ], null),

      meal("11:30", "Media mañana", "Batido proteico de frutas (banana, leche, maní, whey)", "Banana · leche · manteca maní · whey · miel", 0, [
        food("1 banana", 1, 27, 0),
        food("250ml leche entera", 8, 12, 9),
        food("2 cdas manteca de maní", 8, 6, 16),
        food("1/2 scoop whey", 13, 1, 1),
        food("1 cdita miel", 0, 8, 0)
      ], [
        "Licuá todo junto. Un batido de media mañana con 30g de proteína — alternativa líquida al sándwich."
      ], null),

      meal("12:30", "Pre-entreno", "Banana + pasas", "Carbo para hombros", 0, [
        food("1 banana", 1, 27, 0),
        food("30g pasas", 1, 23, 0)
      ], ["Pre estándar."], null),

      meal("14:30", "Post-entreno", "Shake proteico + banana + creatina", "Whey · banana · leche · creatina", 0, [
        food("1 scoop whey", 25, 2, 2),
        food("1 banana", 1, 27, 0),
        food("200ml leche", 6, 10, 7),
        food("5g creatina", 0, 0, 0)
      ], ["Post estándar."], null),

      meal("16:00", "Almuerzo", "Carne magra a la plancha con papas al horno y ensalada", "180g bife · papas al horno · ensalada completa · chimichurri", 0, [
        food("180g bife de cuadrada o peceto", 40, 0, 10),
        food("250g papas al horno en gajos", 5, 50, 0),
        food("Ensalada mixta grande (lechuga, tomate, rúcula)", 2, 8, 0),
        food("Chimichurri casero (perejil + oliva + ajo)", 0, 1, 8)
      ], [
        "Papas en gajos con oliva y sal, 25 min a 200°C. Grillá el bife a fuego fuerte.",
        "Chimichurri: perejil + ajo + orégano + oliva + vinagre + sal.",
        "Un plato completo — carbo + proteína + grasas y fibra de la ensalada."
      ], null,
      altMeal("Milanesa de pollo al horno con arroz salteado", "180g pechuga rebozada · arroz con vegetales · ensalada", [
        food("180g pechuga rebozada al horno", 44, 8, 8),
        food("1 taza arroz salteado con oliva y vegetales", 5, 52, 5),
        food("Ensalada verde", 2, 6, 0)
      ], [
        "Milanesa al horno: rebozá + 200°C por 18-20 min. Para el arroz salteado: arroz cocido en sartén con un hilo de oliva y ajo."
      ])),

      meal("19:30", "Merienda", "Pan con manteca de maní, banana y leche", "2 tostadas · maní · banana · 250ml leche", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("2 cdas manteca de maní", 8, 6, 16),
        food("1 banana", 1, 27, 0),
        food("250ml leche entera", 8, 12, 9)
      ], ["El clásico merienda energética."], null),

      meal("22:00", "Cena", "Sopa proteica de pollo con fideos y vegetales", "200g pollo · fideos · zanahoria · apio · espinaca", 0, [
        food("200g pechuga en hebras", 62, 0, 6),
        food("60g fideos cortos o cabello", 8, 44, 1),
        food("1 zanahoria + 1 papa + 1 rama apio", 3, 25, 0),
        food("50g espinaca fresca", 1, 1, 0)
      ], [
        "Herví la pechuga entera con ajo, cebolla, apio y sal 20 min. Sacala y desmenuzala.",
        "Al caldo, agregá zanahoria y papa en cubos 10 min. Sumá fideos y espinaca 4 min.",
        "Devolvé el pollo. La sopa proteica es diferente a la sopa tradicional — se siente como plato completo."
      ], null,
      altMeal("Tarta de pollo y queso al horno", "1 tapa tarta · 160g pollo · queso · huevos · cebolla", [
        food("1 tapa de tarta", 8, 38, 8),
        food("160g pollo cocido y desmenuzado", 50, 0, 5),
        food("60g queso fresco", 7, 1, 6),
        food("2 huevos batidos", 12, 0, 10),
        food("1/2 cebolla salteada", 0, 4, 0)
      ], [
        "Rellená la tapa con la mezcla de pollo + queso + huevos + cebolla. Horneá a 180°C por 25 min."
      ])),

      meal("23:30", "Antes de dormir", "queso untable con miel", "Proteína lenta", 0, [
        food("100g queso untable", 11, 3, 4),
        food("1 cdita miel", 0, 8, 0)
      ], ["Opcional."], "Opcional.")
    ]
  },

  // ===== JUEVES · PIERNAS =====
  {
    id: "jue", tab: "Jue", dayIndex: 4, title: "Jueves",
    type: "Día de gym · Piernas (día más pesado)",
    workout: { name: "Piernas", duration: "70 min", icon: "🦵", primary: ["Cuádriceps", "Isquios", "Glúteos"] },
    isRestDay: false, kcal: 3100, protein: 185, carbs: 360, fats: 85,
    tags: ["Piernas", "Alto proteína", "+200 kcal"],
    tip: "El día más pesado con el menú más proteico. Llegamos a los 185g hoy.",
    meals: [
      meal("10:00", "Desayuno", "Tortilla de 4 huevos con papa y jamón", "4 huevos · 1 papa · jamón · cebolla · queso · jugo", 0, [
        food("4 huevos enteros", 24, 0, 20),
        food("1 papa mediana en cubos cocida", 2, 20, 0),
        food("60g jamón natural", 12, 0, 4),
        food("30g queso rallado", 6, 0, 9),
        food("1/4 cebolla", 0, 3, 0),
        food("Jugo de naranja 200ml", 2, 22, 0)
      ], [
        "Cocina la papa en cubos hervida 8 min. Sofreí con cebolla hasta dorar.",
        "Batí los 4 huevos con sal y pimienta. Mezclá con jamón, papa y cebolla. Cocinalo como tortilla.",
        "Queso rallado encima al final. La tortilla de 4 huevos = 44g de proteína en el desayuno."
      ], null),

      meal("11:30", "Media mañana", "Sándwich de pavita con queso y palta", "Pan · pavita · queso · palta · tomate", 0, [
        food("2 rodajas pan integral", 8, 28, 2),
        food("80g pavita o pollo feteado", 19, 0, 2),
        food("40g queso fresco", 5, 1, 4),
        food("1/4 palta", 1, 5, 8)
      ], ["El sándwich proteico del mediodía."], null),

      meal("12:30", "Pre-entreno", "Banana + pasas + miel (triple carbo)", "Máximo combustible piernas", 0, [
        food("1 banana grande", 1, 30, 0),
        food("35g pasas", 1, 27, 0),
        food("1 cda miel", 0, 17, 0)
      ], ["Triple carbo. No negociable."], "Obligatorio."),

      meal("14:30", "Post-entreno", "Shake doble post-piernas", "2 scoops · banana · leche · creatina", 0, [
        food("2 scoops whey", 50, 4, 4),
        food("1 banana", 1, 30, 0),
        food("200ml leche entera", 6, 10, 7),
        food("5g creatina", 0, 0, 0)
      ], ["2 scoops solo hoy."], null),

      meal("16:00", "Almuerzo", "Lomo al horno con puré de batata y morrón asado", "180g lomo · batata · morrón · ajo · romero", 0, [
        food("180g lomo al horno", 47, 0, 8),
        food("200g puré de batata", 4, 48, 2),
        food("1 morrón asado", 1, 8, 0),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "Condimentá el lomo con romero, ajo y sal. Sellálo en sartén caliente y pasá al horno 180°C por 15-18 min.",
        "Puré de batata: batata hervida + pisada con oliva, sal y pizca de nuez moscada.",
        "El morrón asado directamente en la llama o en el horno — pelalo cuando se enfríe."
      ], "El lomo con puré de batata es una versión elegante del clásico carne+papa.",
      altMeal("Bife con puré de batata y ensalada", "180g bife de vacío · puré batata · ensalada verde", [
        food("180g bife de vacío", 40, 0, 12),
        food("200g puré de batata", 4, 48, 2),
        food("Ensalada verde", 2, 6, 0)
      ], [
        "Grillá el bife 4 min por lado. Puré de batata con oliva.",
        "La batata es la guarnición más nutritiva — fibra, potasio y vitamina A."
      ])),

      meal("19:30", "Merienda", "Licuado doble proteico (leche + banana + whey + pan integral)", "Banana · leche · whey · pan integral · miel", 0, [
        food("1 banana", 1, 27, 0),
        food("250ml leche entera", 8, 12, 9),
        food("1 scoop whey", 25, 2, 2),
        food("1 tostada integral", 3, 20, 2),
        food("1 cdita miel", 0, 8, 0)
      ], [
        "Licuá todo junto. La merienda más calórica y proteica del plan — ideal para el día de piernas.",
        "Si querés espesar: sumá 1 cda de manteca de maní."
      ], null),

      meal("22:00", "Cena", "Pollo al tomillo con arroz y ensalada completa", "180g pollo · arroz · tomillo · ajo · ensalada grande", 0, [
        food("180g pechuga al horno con tomillo", 56, 0, 5),
        food("1 taza arroz blanco cocido", 4, 50, 0),
        food("Ensalada grande (rúcula + cherry + zanahoria)", 2, 10, 0),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "Salpimentá el pollo con tomillo fresco o seco, ajo y oliva. Horneá a 200°C por 25 min.",
        "El tomillo es una hierba subestimada — le da al pollo un sabor aromático completamente diferente al orégano."
      ], null,
      altMeal("Fideos integrales con pechuga al pesto", "80g pasta integral · 160g pechuga · pesto · parmesano", [
        food("80g pasta integral", 10, 54, 2),
        food("160g pechuga grillada", 50, 0, 5),
        food("4 cdas pesto (albahaca + nueces + parmesano + oliva)", 5, 3, 18),
        food("20g parmesano rallado", 6, 0, 6)
      ], [
        "Herví la pasta integral al dente. Cortá la pechuga grillada en tiras.",
        "Mezclá pasta + pesto + pollo. Parmesano encima. Simple, completo y muy proteico."
      ])),

      meal("23:30", "Antes de dormir", "Shake nocturno obligatorio", "Piernas + semana proteica = máxima síntesis nocturna", 0, [
        food("1 scoop whey con 250ml leche entera", 25, 12, 9)
      ], ["Hoy el shake nocturno es obligatorio. El músculo sintetiza proteína hasta 48hs después de piernas."], "Obligatorio.")
    ]
  },

  // ===== VIERNES · FULL BODY =====
  {
    id: "vie", tab: "Vie", dayIndex: 5, title: "Viernes",
    type: "Full body opcional · Cardio o descanso",
    workout: { name: "Full Body", duration: "50 min", icon: "⚡", optional: true, primary: ["Full body"] },
    isRestDay: false, kcal: 2700, protein: 165, carbs: 300, fats: 72,
    tags: ["Full body", "Proteico"],
    tip: "Viernes proteico puro. El menú más limpio y directo de las 4 semanas.",
    meals: [
      meal("10:00", "Desayuno", "pancakes proteicos con whey, fruta y miel", "2 tostadas integrales · 1 scoop whey · leche · banana · miel", 0, [
        food("2 tostadas integrales", 7, 40, 4),
        food("1 scoop whey vainilla", 25, 2, 2),
        food("250ml leche entera", 8, 12, 9),
        food("1 banana", 1, 27, 0),
        food("1 cdita miel", 0, 8, 0)
      ], [
        "Calentá la leche aparte y prepará las tostadas al lado. Retirá del fuego y esperá 1 min.",
        "Incorporá el whey revolviendo (apagá bien el fuego antes — el calor destruye parte de la proteína).",
        "Cortá la banana encima y bañá con miel. El porridge proteico = 40g de proteína en el desayuno."
      ], null),

      meal("12:00", "Media mañana", "Tostadas con queso untable, tomate y jamón", "2 tostadas · queso untable · tomate · jamón · orégano", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("4 cdas queso untable", 12, 4, 7),
        food("60g jamón natural", 12, 0, 4),
        food("1 tomate", 1, 5, 0)
      ], [
        "Untá la queso untable, poné el jamón y el tomate. Orégano encima.",
        "La queso untable + jamón juntos dan 24g de proteína en la media mañana."
      ], null),

      meal("13:30", "Almuerzo", "Salmón con espárragos y quinoa proteica", "200g salmón · quinoa · espárragos · limón · oliva", 0, [
        food("200g salmón al horno", 50, 0, 26),
        food("3/4 taza quinoa cocida", 6, 30, 3),
        food("150g espárragos asados", 4, 6, 0),
        food("1 cda aceite de oliva", 0, 0, 14),
        food("Limón + eneldo", 0, 2, 0)
      ], [
        "Condimentá el salmón con eneldo, limón y oliva. Horneá a 200°C por 15 min.",
        "Espárragos con oliva y sal en el horno los últimos 10 min del salmón.",
        "Quinoa y salmón juntos = los dos alimentos con mejor perfil de aminoácidos completos."
      ], null,
      altMeal("Carne molida con arroz y vegetales salteados", "180g carne magra molida · arroz · zapallito · cebolla · morrón", [
        food("180g carne molida magra", 36, 0, 14),
        food("1 taza arroz cocido", 4, 50, 0),
        food("1 zapallito + 1 morrón + 1/2 cebolla", 2, 12, 0),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "Sofreí la carne molida con cebolla y ajo. Sumá los vegetales y salteá 4 min.",
        "Mezclá con el arroz caliente. Opción práctica y súper proteica para el viernes."
      ])),

      meal("17:00", "Merienda", "Mate con tostadas y manteca de maní", "Mate + 2 tostadas + maní + banana", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("2 cdas manteca de maní", 8, 6, 16),
        food("1 banana", 1, 27, 0)
      ], ["Merienda clásica del viernes."], null),

      meal("22:00", "Cena", "Pechuga grillada con morrones y papas al horno", "180g pechuga · morrones · papas · ajo · oliva", 0, [
        food("180g pechuga al grill", 56, 0, 5),
        food("2 morrones asados", 2, 16, 0),
        food("200g papas al horno", 4, 40, 0),
        food("1 cda aceite de oliva", 0, 0, 14)
      ], [
        "Papas en gajos a 200°C por 25 min con oliva y sal. Grillá la pechuga.",
        "Asá los morrones en el horno o a la llama — pelálos cuando se enfríen para sacar la piel.",
        "La combinación morrón asado + pechuga es simple pero increíblemente sabrosa."
      ], null,
      altMeal("Pasta con atún y crema de queso untable", "80g pasta · 1 lata atún · queso untable · limón · perejil", [
        food("80g pasta larga", 10, 58, 2),
        food("1 lata atún", 28, 0, 2),
        food("5 cdas queso untable", 15, 5, 9),
        food("Limón + perejil + oliva", 0, 2, 10)
      ], [
        "Herví la pasta. Mezclá el atún con queso untable + ralladura de limón + perejil picado.",
        "Incorporá la pasta caliente y revolvé. Cremoso sin crema real — 53g de proteína en una cena de pasta."
      ])),

      meal("23:30", "Antes de dormir", "queso untable con miel", "Cierre proteico del viernes", 0, [
        food("100g queso untable", 11, 3, 4),
        food("1 cdita miel", 0, 8, 0)
      ], ["Hoy el queso untable sí está recomendado — la semana proteica necesita cierre nocturno."], "Recomendado esta semana.")
    ]
  },

  // ===== SÁBADO · DESCANSO =====
  {
    id: "sab", tab: "Sáb", dayIndex: 6, title: "Sábado",
    type: "Día de descanso activo",
    workout: { name: "Descanso", duration: "—", icon: "🚶", primary: [] },
    isRestDay: true, kcal: 2600, protein: 155, carbs: 285, fats: 78,
    tags: ["Descanso", "Alto proteína"],
    tip: "Sábado proteico. El asado sigue siendo el plato rey del fin de semana.",
    meals: [
      meal("10:00", "Desayuno", "Desayuno proteico completo: huevos, jamón, tostadas y fruta", "4 huevos · jamón · 2 tostadas · manzana · café", 0, [
        food("4 huevos revueltos", 24, 0, 20),
        food("80g jamón natural", 16, 0, 5),
        food("2 tostadas integrales", 8, 28, 2),
        food("1 manzana", 0, 20, 0),
        food("Café con leche 200ml", 6, 8, 6)
      ], [
        "Revolvé los 4 huevos con el jamón picado. Queda un revuelto con más sabor y proteína.",
        "El desayuno del sábado más cargado de proteína de las 4 semanas: 54g."
      ], null),

      meal("12:30", "Media mañana", "queso untable con nueces y miel", "200g queso untable · nueces · miel", 0, [
        food("200g queso untable", 20, 8, 10),
        food("25g nueces", 4, 4, 16),
        food("1 cda miel", 0, 17, 0)
      ], ["queso untable con nueces y miel. Simple y alta proteína."], null),

      meal("14:00", "Almuerzo", "Asado proteico de carne magra con ensalada grande", "250g vacío o cuadrada · chorizo pequeño · ensalada · pan", 0, [
        food("250g vacío o cuadrada a la parrilla", 50, 0, 18),
        food("1 chorizo colorado pequeño", 7, 1, 12),
        food("Ensalada grande (lechuga+rúcula+tomate+zanahoria)", 3, 12, 0),
        food("2 rodajas pan integral", 8, 28, 2),
        food("Chimichurri casero", 0, 2, 8)
      ], [
        "La diferencia de la semana 4: elegimos los cortes más magros (vacío, cuadrada, peceto).",
        "Parrilla a fuego medio. Dejá reposar la carne 5 min antes de cortar.",
        "La ensalada grande equilibra el asado y suma fibra y micronutrientes."
      ], null,
      altMeal("Costillitas de cordero al horno con papas", "350g costillitas cordero · papas · ajo · romero", [
        food("350g costillitas de cordero", 55, 0, 22),
        food("250g papas rústicas", 5, 50, 0),
        food("2 cdas aceite de oliva · ajo · romero", 0, 1, 28)
      ], [
        "Condimentá con romero, ajo, oliva y sal. Horneá tapado a 180°C por 50 min, destapá 15 min.",
        "El cordero tiene un sabor completamente diferente a la vaca — vale la pena probarlo."
      ])),

      meal("17:30", "Merienda", "Mate con alfajores de maicena caseros", "Mate + alfajores de maicena", 0, [
        food("2 alfajores de maicena caseros", 5, 36, 7)
      ], ["Mate con alfajores. El cierre dulce del sábado."], null),

      meal("22:00", "Cena", "Pollo relleno con espinaca y queso untable", "180g pechuga rellena · espinaca · queso untable · queso · ensalada", 0, [
        food("180g pechuga rellena", 56, 0, 8),
        food("80g espinaca cocida", 2, 3, 1),
        food("3 cdas queso untable", 9, 3, 5),
        food("40g queso mozzarella", 8, 1, 8),
        food("Ensalada mixta", 2, 7, 0)
      ], [
        "Abrí la pechuga en libro. Rellená con espinaca salteada + queso untable + mozzarella. Cerrá con palillos.",
        "Sellá en sartén 3 min y terminá en horno a 200°C por 15 min.",
        "El relleno de queso untable y espinaca suma proteína y hace que el plato parezca de restaurante."
      ], null,
      altMeal("Pasta con jamón, queso y guisantes", "80g pasta · jamón · queso · arvejas · crema light", [
        food("80g pasta larga", 10, 58, 2),
        food("80g jamón natural", 16, 0, 5),
        food("50g queso fresco", 6, 1, 5),
        food("1/2 taza arvejas", 4, 13, 0),
        food("3 cdas crema light", 2, 2, 7)
      ], [
        "Herví la pasta. Sofreí jamón en cubos 2 min. Sumá arvejas y crema.",
        "Mezclá con la pasta caliente y el queso desmenuzado."
      ])),

      meal("23:30", "Antes de dormir", "queso untable con miel", "Cierre proteico del sábado", 0, [
        food("100g queso untable", 11, 3, 4),
        food("1 cdita miel", 0, 8, 0)
      ], ["Recomendado en la semana proteica."], "Recomendado.")
    ]
  },

  // ===== DOMINGO · DESCANSO =====
  {
    id: "dom", tab: "Dom", dayIndex: 7, title: "Domingo",
    type: "Día de descanso completo",
    workout: { name: "Descanso total", duration: "—", icon: "🛌", primary: [] },
    isRestDay: true, kcal: 2500, protein: 150, carbs: 270, fats: 76,
    tags: ["Descanso", "Proteico puro"],
    tip: "El cierre de la semana proteica. Mañana empieza la semana 1 de nuevo — renovada.",
    meals: [
      meal("10:00", "Desayuno", "Pancakes proteicos de banana y huevo con miel", "2 tostadas integrales · 2 huevos · 1 clara · banana · miel · leche", 0, [
        food("2 tostadas integrales", 6, 33, 3),
        food("2 huevos + 1 clara", 16, 0, 10),
        food("1 banana", 1, 27, 0),
        food("100ml leche", 3, 5, 4),
        food("1 cda miel", 0, 17, 0)
      ], [
        "Licuá premezcla de pancakes proteicos + huevos + clara + banana + leche. Cocinalo en sartén.",
        "Con 3 huevos los pancakes quedan más proteicos y menos elásticos. Miel encima."
      ], null),

      meal("13:30", "Almuerzo", "Pechuga asada al horno con vegetales italianos", "200g pechuga · zapallito · morrón · tomate · albahaca · oliva", 0, [
        food("200g pechuga al horno con hierbas", 62, 0, 6),
        food("1 zapallito + 1 morrón + 2 tomates", 2, 14, 0),
        food("1 taza arroz cocido", 4, 50, 0),
        food("1 cda aceite de oliva + albahaca", 0, 1, 14)
      ], [
        "Condimentá la pechuga con hierbas italianas (orégano + tomillo + albahaca), ajo y oliva.",
        "Ponela en bandeja con los vegetales cortados y horneá a 200°C por 25 min.",
        "Los tomates asados en el horno se transforman — sueltan un jugo dulce que impregna todo."
      ], null,
      altMeal("Peceto con salsa de champiñones y arroz integral", "180g peceto · champiñones · crema light · arroz integral", [
        food("180g peceto sellado y horneado", 47, 0, 6),
        food("150g champiñones", 3, 4, 0),
        food("4 cdas crema light", 3, 2, 8),
        food("3/4 taza arroz integral", 3, 37, 1)
      ], [
        "Sellá el peceto y horneá 20 min. Para la salsa: champiñones salteados + crema + ajo.",
        "Servís en medallones con la salsa encima y el arroz integral al costado."
      ])),

      meal("17:30", "Merienda", "Mate con tostadas y queso untable", "Mate + 2 tostadas + queso untable + miel", 0, [
        food("2 tostadas integrales", 8, 28, 2),
        food("4 cdas queso untable", 12, 4, 7),
        food("1 cdita miel", 0, 8, 0)
      ], ["Cierre tranquilo con queso untable y miel."], null),

      meal("22:00", "Cena", "Hamburguesas dobles de carne magra con palta", "2 hamburguesas · panes integrales · palta · tomate · ensalada", 0, [
        food("2 hamburguesas magras 180g total", 40, 0, 14),
        food("2 panes de hamburguesa integral", 10, 40, 4),
        food("1/4 palta", 1, 5, 8),
        food("Lechuga + tomate + cebolla morada", 2, 8, 0),
        food("1 cda mostaza + 1 cda ketchup suave", 1, 5, 0)
      ], [
        "Condimentá la carne con sal, pimienta, ajo en polvo y 1 cda pan rallado para ligar.",
        "Grillá 4 min por lado a fuego fuerte. Armá con palta, tomate y cebolla morada.",
        "La hamburguesa casera siempre es mejor que la comprada. La cebolla morada en pluma le da el toque final."
      ], null,
      altMeal("Pollo mediterráneo con papas y aceitunas", "200g pollo · papas · aceitunas · cherry · orégano · oliva", [
        food("200g muslo de pollo", 46, 0, 14),
        food("200g papas en cubos", 4, 40, 0),
        food("60g aceitunas mixtas", 0, 3, 12),
        food("100g cherry + orégano + oliva", 1, 8, 10)
      ], [
        "Todo en bandeja con oliva, orégano y ajo. Horneá a 200°C por 35 min.",
        "Las aceitunas y los cherry le dan al plato un sabor mediterráneo que cierra perfectamente la semana."
      ])),

      meal("23:30", "Antes de dormir", "Shake final de semana", "Cierre de las 4 semanas", 0, [
        food("1 scoop whey con 200ml leche entera", 25, 10, 9)
      ], ["El cierre de la semana 4. Mañana empieza la semana 1 de nuevo, renovada. Seguís."], "Recomendado.")
    ]
  }
] // fin Semana 4

]; // fin allWeeks

// =====================================================
// CALIDAD DEL PLAN
// - Sin ingredientes que Rony ya marco como no sostenibles.
// - Todas las comidas tienen opcion B.
// =====================================================
const BANNED_INGREDIENTS_RE = /(yogur|avena|harina de arroz|arroz inflado|cottage|ricota|locro|leche caliente|leche tibia|manzana con manteca de man[ií])/i;
const PLAIN_MENU_BLOCKLIST = [
  "souvlaki", "falafel", "gyoza", "wonton", "satay", "teriyaki",
  "quinoa", "esparrago", "datil", "datiles", "granola", "chia", "lino",
  "sesamo", "ponzu", "jengibre", "eneldo", "arandano", "frutos rojos",
  "tomate seco", "salsa de pepino",
  "arroz inflado", "harina de arroz"
];

function cleanPlanText(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/queso cottage/gi, "queso untable")
    .replace(/cottage/gi, "queso untable")
    .replace(/ricota/gi, "queso untable")
    .replace(/locro/gi, "guiso de lentejas con carne magra")
    .replace(/leche caliente/gi, "leche")
    .replace(/leche entera tibia/gi, "leche entera")
    .replace(/leche tibia/gi, "leche")
    .replace(/manzana con manteca de man[ií]/gi, "banana con queso untable")
    .replace(/yogur griego/gi, "queso untable")
    .replace(/yogur natural entero/gi, "queso untable")
    .replace(/yogur natural/gi, "queso untable")
    .replace(/yogur/gi, "queso untable")
    .replace(/tzatziki/gi, "salsa de pepino y queso crema")
    .replace(/harina de avena|harina avena/gi, "harina comun")
    .replace(/avena en hojuelas|avena cruda|avena licuada|avena/gi, "banana");
}

function cleanPlanItem(item) {
  if (!item) return item;
  Object.keys(item).forEach((key) => {
    if (typeof item[key] === "string") item[key] = cleanPlanText(item[key]);
  });
  if (Array.isArray(item.prep)) item.prep = item.prep.map(cleanPlanText);
  if (Array.isArray(item.foods)) item.foods.forEach((f) => { f.name = cleanPlanText(f.name); });
  item.name = cleanPlanText(item.name);
  item.desc = cleanPlanText(item.desc);
  item.note = cleanPlanText(item.note);
  return item;
}

function plainText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function displayText(value) {
  return String(value || "")
    .replace(/\bAtun\b/g, "Atún")
    .replace(/\batun\b/g, "atún")
    .replace(/\blimon\b/g, "limón")
    .replace(/\bLimon\b/g, "Limón")
    .replace(/\bNoquis\b/g, "\u00d1oquis")
    .replace(/\bnoquis\b/g, "\u00f1oquis")
    .replace(/\bSalmon\b/g, "Salm\u00f3n")
    .replace(/\bsalmon\b/g, "salm\u00f3n")
    .replace(/\binfusion\b/g, "infusi\u00f3n")
    .replace(/\bInfusion\b/g, "Infusi\u00f3n")
    .replace(/\bproteina\b/g, "proteína")
    .replace(/\bProteina\b/g, "Proteína")
    .replace(/\benergia\b/g, "energía")
    .replace(/\bEnergia\b/g, "Energía")
    .replace(/\bcalorias\b/g, "calorías")
    .replace(/\bCalorias\b/g, "Calorías")
    .replace(/\bdia\b/g, "día")
    .replace(/\bDia\b/g, "Día")
    .replace(/\bdias\b/g, "días")
    .replace(/\bDias\b/g, "Días")
    .replace(/\bporcion\b/g, "porción")
    .replace(/\bPorcion\b/g, "Porción")
    .replace(/\bmas\b/g, "más")
    .replace(/\bMas\b/g, "Más")
    .replace(/\bdespues\b/g, "después")
    .replace(/\bDespues\b/g, "Después")
    .replace(/\bcoccion\b/g, "cocción")
    .replace(/\bCoccion\b/g, "Cocción")
    .replace(/\bsarten\b/g, "sartén")
    .replace(/\bSarten\b/g, "Sartén")
    .replace(/\bpimenton\b/g, "pimentón")
    .replace(/\bPimenton\b/g, "Pimentón")
    .replace(/\bmorron\b/g, "morrón")
    .replace(/\bMorron\b/g, "Morrón")
    .replace(/\bjamon\b/g, "jamón")
    .replace(/\bJamon\b/g, "Jamón")
    .replace(/\bpure\b/g, "puré")
    .replace(/\bPure\b/g, "Puré")
    .replace(/\bfrio\b/g, "frío")
    .replace(/\bFrio\b/g, "Frío")
    .replace(/\bliquida\b/g, "líquida")
    .replace(/\besten\b/g, "estén")
    .replace(/\bPone\b/g, "Poné")
    .replace(/\bPrepara\b/g, "Prepará")
    .replace(/\bAgrega\b/g, "Agregá")
    .replace(/\bAcompana\b/g, "Acompañá")
    .replace(/\bSuma\b/g, "Sumá")
    .replace(/\bEvita\b/g, "Evitá")
    .replace(/\bArma\b/g, "Armá")
    .replace(/\bCerra\b/g, "Cerrá")
    .replace(/\bServi\b/g, "Serví")
    .replace(/\bHervi\b/g, "Herví")
    .replace(/\bCocina\b/g, "Cociná")
    .replace(/\bCalenta\b/g, "Calentá")
    .replace(/\bDora\b/g, "Dorá")
    .replace(/\bTermina\b/g, "Terminá")
    .replace(/\bIntegra\b/g, "Integrá")
    .replace(/\bMantene\b/g, "Mantené")
    .replace(/\bMetodo\b/g, "Método");
}

function mealSearchText(item) {
  if (!item) return "";
  return plainText([
    item.name,
    item.desc,
    item.note || "",
    ...(item.foods || []).map((f) => f.name),
    ...(item.prep || [])
  ].join(" "));
}

function mealCoreSearchText(item) {
  if (!item) return "";
  return plainText([
    item.name,
    item.desc,
    ...(item.foods || []).map((f) => f.name)
  ].join(" "));
}

function mealNameKey(value) {
  return plainText(typeof value === "string" ? value : value?.name || "");
}

function isTooSpecialForRony(item) {
  const text = mealSearchText(item);
  return PLAIN_MENU_BLOCKLIST.some((term) => text.includes(term));
}

function macroTotalsForMeal(item) {
  return item.foods.reduce((acc, f) => {
    acc.p += f.p; acc.c += f.c; acc.g += f.g;
    return acc;
  }, { p: 0, c: 0, g: 0 });
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function prepIngredientLine(item) {
  const foods = Array.isArray(item?.foods) ? item.foods : [];
  const coreFoods = foods
    .filter((f) => !/agua|cafe|mate|infusion/i.test(f.name))
    .slice(0, 5)
    .map((f) => f.name);
  return coreFoods.length ? coreFoods.join(" + ") : "los ingredientes del plan";
}

function recipeMetaForMeal(item) {
  const text = mealSearchText(item);
  const label = plainText(item?.label);

  if (/\bwhey\b|creatina|shake/.test(text)) return { time: "2-3 min", method: "Shaker" };
  if (/pre-entreno/.test(label)) return { time: "1-4 min", method: "Sin coccion" };
  if (/pancakes onefit|panqueques/.test(text)) return { time: "8-12 min", method: "Sarten" };
  if (/tostado|sandwich|rolls/.test(text)) return { time: "5-8 min", method: "Plancha o sandwichera" };
  if (/pizza/.test(text)) return { time: "12-18 min", method: "Horno fuerte" };
  if (/hamburguesa/.test(text)) return { time: "20-25 min", method: "Plancha + horno" };
  if (/pastel de papa|tarta|empanada/.test(text)) return { time: "30-45 min", method: "Horno" };
  if (/milanesa/.test(text)) return { time: "22-28 min", method: "Horno" };
  if (/fideo|pasta|noqui|raviol/.test(text)) return { time: "15-25 min", method: "Olla + sarten" };
  if (/guiso|lenteja|garbanzo|poroto/.test(text)) return { time: "25-35 min", method: "Olla" };
  if (/salmon|merluza|pescado/.test(text)) return { time: "16-22 min", method: "Horno o sarten" };
  if (/atun/.test(text)) return { time: "10-18 min", method: "Olla + armado frio" };
  if (/arroz|risotto/.test(text)) return { time: "22-30 min", method: "Olla + sarten" };
  if (/bife|carne|lomo|peceto|churrasco/.test(text)) return { time: "18-30 min", method: "Plancha u horno" };
  if (/pollo|pechuga|muslo/.test(text)) return { time: "20-30 min", method: "Sarten u horno" };
  if (/omelette|tortilla|revuelto|huevo/.test(text)) return { time: "10-18 min", method: "Sarten" };
  if (/leche|banana|fruta|queso untable|tostadas/.test(text)) return { time: "3-6 min", method: "Armado simple" };
  return { time: "15-25 min", method: "Cocina simple" };
}

function addOriginalPrepTip(item, steps) {
  const rawPrep = Array.isArray(item?.prep) ? item.prep : [];
  const usefulTip = rawPrep
    .map((step) => cleanPlanText(step).trim())
    .find((step) => step.length >= 42 && !steps.some((existing) => plainText(existing).includes(plainText(step).slice(0, 24))));
  if (usefulTip && steps.length < 6) steps.push(`Tip del plan: ${usefulTip}`);
  return steps;
}

function buildDetailedPrepSteps(item) {
  const text = mealSearchText(item);
  const label = plainText(item?.label);
  const ingredients = prepIngredientLine(item);
  let steps;

  if (/agua|infusion|mate|cafe/.test(text) && !/(pollo|carne|atun|huevo|papa|arroz|fideo|pasta|tarta|milanesa)/.test(text)) {
    steps = [
      "No requiere coccion.",
      `Prepara solamente lo indicado: ${ingredients}.`,
      "Usalo como cierre liviano si ya cumpliste calorias, proteina y agua del dia.",
      "Si quedaste corto de proteina, suma comida real simple: huevos, atun, queso, leche o carne magra."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/\bwhey\b|creatina|shake/.test(text)) {
    steps = [
      "Pone el whey en el shaker con 250-300 ml de agua. Usa leche solo si el plan lo indica o si necesitas mas calorias ese dia.",
      "Agrega la creatina, cerra bien y agita 20-30 segundos hasta que no queden grumos.",
      "Come la fruta, tostada o pancake indicado aparte. No hace falta meter una comida pesada porque despues viene el almuerzo.",
      "Tomalo apenas termines de entrenar o dentro de la primera hora post-gym."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/pre-entreno/.test(label)) {
    steps = [
      `Prepara solo lo indicado: ${ingredients}.`,
      "Comelo 35-50 minutos antes de entrenar para llegar con energia sin pesadez.",
      "Acompana con agua. Evita sumar grasa extra aca porque enlentece la digestion.",
      "Si estas con poco apetito, prioriza la fruta y deja el pan/tostada para otro pre."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/panqueques?( caseros)?( chicos)? de banana/.test(text)) {
    steps = [
      "Pisa la banana con tenedor hasta hacer un pure. Mezclala con los huevos y la leche.",
      "Calenta una sarten antiadherente a fuego medio y cocina panqueques chicos para que no se rompan.",
      "Dora 2 minutos por lado y retiralos cuando esten firmes.",
      "Termina con queso untable y miel medida si aparece en ingredientes."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/tostado|sandwich|rolls/.test(text)) {
    steps = [
      `Arma la base con ${ingredients}.`,
      "Si es tostado o sandwich caliente, pone pan, jamon y queso en sandwichera o sarten hasta que el queso funda.",
      "Si lleva atun o tomate, escurri bien antes de armarlo para que el pan no se humedezca.",
      "Si el plan incluye fruta en esa comida, comela al lado; si no aparece, no hace falta agregarla."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/licuado/.test(text)) {
    steps = [
      "Pone primero la leche en la licuadora para que no se pegue la fruta.",
      "Agrega banana y manteca de mani medida. Licua 20-30 segundos.",
      "Si queda muy espeso, suma un chorrito de agua o leche. No agregues mas manteca de mani sin registrarlo.",
      "Tomalo como merienda/refuerzo, no como reemplazo fijo de almuerzo o cena."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/pizza/.test(text)) {
    steps = [
      "Precalenta el horno fuerte, 220 grados si tu horno lo permite.",
      "Calenta o cocina el pollo en tiritas con sal, ajo y pimenton. Si ya estaba cocido, solo doralo 2 minutos.",
      "Pone salsa de tomate sobre la prepizza, suma el pollo y cubri con la mozzarella medida.",
      "Horneala 8-12 minutos, hasta que la base este firme y el queso fundido.",
      "Acompana con verdura si tenes hambre: suma volumen sin romper el objetivo."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/hamburguesa/.test(text)) {
    steps = [
      "Forma las hamburguesas con carne magra, sal, pimienta y ajo. Aplastalas parejo para que cocinen igual.",
      "Cocina en plancha caliente 4-5 minutos por lado. Agrega la feta de queso al final para que funda.",
      "Hace las papas al horno en bastones con sal y apenas aceite, 25-30 minutos a 200 grados.",
      "Arma con pan, lechuga y tomate. Mantene la cantidad de pan y papas del plan para no pasarte de calorias."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/pastel de papa/.test(text)) {
    steps = [
      "Hervi la papa hasta que este blanda y pisala con sal. Si queres mas cremosidad, usa un chorrito de leche.",
      "Saltea cebolla, morron y tomate. Suma la carne magra y cocinala hasta que cambie completamente de color.",
      "Agrega huevo duro picado al relleno y pasalo a una fuente chica.",
      "Cubre con el pure, suma la mozzarella medida y lleva al horno hasta dorar.",
      "Dejalo reposar 5 minutos antes de servir para que no se desarme."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/tarta/.test(text)) {
    steps = [
      "Precalenta el horno a 180-200 grados.",
      "Mezcla el pollo cocido con jamon, queso y las verduras que indique el plan. Si usas huevo, batilo y sumalo al relleno.",
      "Pone la mezcla sobre la tapa de tarta en una fuente. Cerra o deja abierta segun la tarta que tengas.",
      "Horneala 25-35 minutos, hasta que la masa este firme y dorada.",
      "Servi con ensalada grande para sumar saciedad sin hacerla pesada."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/empanada/.test(text)) {
    steps = [
      "Saltea cebolla y morron. Suma la carne magra y cocinala hasta que no queden partes rosadas.",
      "Agrega huevo duro picado, condimenta y deja enfriar el relleno unos minutos.",
      "Rellena las tapas, cerra con repulgue y acomoda en placa apenas aceitada.",
      "Hornealas a 200 grados durante 18-25 minutos, hasta que esten doradas.",
      "Acompana con ensalada para que el plato llene mas sin depender de mas tapas."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/milanesa/.test(text)) {
    steps = [
      "Precalenta el horno a 200 grados y prepara una placa apenas aceitada.",
      "Si la milanesa no esta lista, pasa la carne o pechuga por huevo condimentado y pan rallado.",
      "Horneala 18-24 minutos, dandola vuelta a mitad de coccion para que dore de ambos lados.",
      "Mientras tanto, hervi papa para pure o cocina las papas al horno segun indique el plan.",
      "Servi con ensalada. Si queres mas sabor, usa limon, ajo, perejil o mostaza, no mas aceite."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/taco|wrap|burrito/.test(text)) {
    steps = [
      "Dora la carne o pollo en sarten caliente con sal, pimenton, ajo y un poco de limon.",
      "Calenta las tortillas vuelta y vuelta para que no se quiebren.",
      "Pica tomate, lechuga o la verdura indicada. Tene todo listo antes de armar.",
      "Rellena con la proteina, suma queso medido y cerra firme.",
      "Servi con ensalada al lado si necesitas mas volumen."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/fideos frios|pasta fria|atun.*fideo|fideo.*atun/.test(text)) {
    steps = [
      "Hervi los fideos en agua con sal hasta que esten al dente.",
      "Colalos y enfrialos apenas bajo agua para cortar la coccion.",
      "Escurri bien el atun y mezclalo con tomate, huevo duro, limon y el aceite medido.",
      "Integra los fideos y ajusta sal. Dejalo 5 minutos en heladera si lo queres mas fresco."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/fideo|pasta|noqui|raviol/.test(text)) {
    steps = [
      "Pone agua con sal a hervir. Cocina la pasta, noquis o ravioles hasta punto al dente.",
      "En una sarten aparte, cocina la carne, pollo o salsa indicada hasta que quede bien caliente.",
      "Suma tomate, queso untable o condimentos segun el plato. Mantene fuego medio para que no se seque.",
      "Integra la pasta con la salsa 1 minuto en sarten. Si hace falta, usa un chorrito del agua de coccion.",
      "Termina con el queso rallado medido cuando el plato ya esta servido."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/salmon|merluza|pescado/.test(text)) {
    steps = [
      "Seca el pescado con papel, salpimenta y suma limon, ajo o perejil.",
      "Cocinalo al horno a 190-200 grados: salmon 12-16 minutos, merluza 14-18 minutos segun grosor.",
      "Prepara papa, pure o ensalada en paralelo para que todo salga junto.",
      "El pescado esta listo cuando se separa facil con tenedor. No lo pases de coccion para que no quede seco.",
      "Servi con limon fresco y la porcion de carbo indicada."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/atun/.test(text)) {
    steps = [
      "Hervi la papa y el huevo hasta que queden listos. Enfria apenas para poder cortarlos.",
      "Escurri bien el atun para que el plato no quede aguado.",
      "Mezcla atun, papa, huevo, tomate o ensalada. Condimenta con limon, sal y el aceite medido.",
      "Si queres mas sabor, suma pimienta, perejil o un toque de mostaza.",
      "Es un plato frio/templado: practico, alto en proteina y sin complicarlo."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/guiso|lenteja|garbanzo|poroto/.test(text)) {
    steps = [
      "Saltea cebolla, morron, zanahoria o las verduras del plan con una cdita de aceite.",
      "Agrega la carne o pollo y doralo para que el guiso tenga sabor.",
      "Suma lentejas, garbanzos o porotos ya cocidos. Cubre apenas con caldo o agua.",
      "Cocina 15-25 minutos hasta que espese. Revolve cada tanto para que no se pegue.",
      "Servi con el pan o carbo indicado, sin sumar una segunda porcion si ya llegaste bien."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/arroz|risotto/.test(text) && !/pollo al curry|tikka|curry/.test(text)) {
    steps = [
      "Cocina el arroz medido. Como base: 1 parte de arroz por 2 partes de agua, fuego bajo hasta que absorba.",
      "En sarten aparte, dora la proteina con sal, ajo y pimenton o los condimentos del plato.",
      "Suma verduras y cocina hasta que esten tiernas pero no deshechas.",
      "Integra arroz y proteina al final. Si es risotto, agrega caldo de a poco y revolve hasta cremoso.",
      "Servi la porcion indicada y guarda el resto para no repetir arroz fuera del plan."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/pollo al curry|tikka|curry/.test(text)) {
    steps = [
      "Corta el pollo en cubos y condimenta con sal, curry suave, ajo y limon.",
      "Dora el pollo en sarten caliente hasta que selle por fuera.",
      "Suma tomate, queso untable o la salsa indicada y baja el fuego.",
      "Cocina 8-12 minutos hasta que el pollo este hecho por dentro y la salsa cremosa.",
      "Servi con papa, arroz o el carbo que figure en el plan, sin repetir otro carbo extra."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/bife|carne|lomo|peceto|churrasco/.test(text)) {
    steps = [
      "Saca la carne de la heladera 10 minutos antes y salpimenta.",
      "Cocina bife o churrasco en plancha bien caliente 3-5 minutos por lado. Si es carne al horno, usa 190 grados hasta punto jugoso.",
      "Prepara papa, batata, pure o pan medido en paralelo segun el plato.",
      "Deja reposar la carne 3 minutos antes de cortar para que no pierda jugo.",
      "Servi con ensalada o verduras. Usa chimichurri, limon o especias para sabor sin pasarte de grasa."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/pollo|pechuga|muslo/.test(text)) {
    steps = [
      "Condimenta el pollo con sal, ajo, pimenton, limon o la especia del plato.",
      "Cocinalo en sarten a fuego medio-alto o al horno a 200 grados hasta que este dorado y bien hecho.",
      "Prepara papa, batata, pasta, pan o ensalada segun indique el plan.",
      "Si lleva queso, jamon o salsa, sumalo al final para que no se seque.",
      "Servi la porcion completa: la proteina es la base para recuperar del entrenamiento."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/omelette|tortilla|revuelto|huevo/.test(text)) {
    steps = [
      "Si lleva papa, hervila o cocinala en cubos antes de mezclarla con el huevo.",
      "Bati los huevos con sal y pimienta. Suma jamon, queso o verduras segun el plato.",
      "Cocina en sarten antiadherente a fuego medio para que no se queme por fuera.",
      "Cuando cuaje, dobla el omelette o da vuelta la tortilla con plato.",
      "Servi con pan, fruta o ensalada si figura en el plan."
    ];
    return addOriginalPrepTip(item, steps);
  }

  if (/leche|banana|fruta|queso untable|tostadas|medialuna/.test(text)) {
    steps = [
      `Prepara la porcion indicada: ${ingredients}.`,
      "Arma el plato simple, sin agregar extras que no esten contados.",
      "Si lleva tostada, calentala al final para que quede crocante.",
      "Comelo tranquilo. Es una comida de apoyo para llegar a energia y proteina sin cocinar de mas."
    ];
    return addOriginalPrepTip(item, steps);
  }

  steps = [
    `Separa y pesa rapido los ingredientes principales: ${ingredients}.`,
    "Cocina primero el carbo que tarde mas: papa, pasta, arroz, pan o legumbre segun el plato.",
    "Despues cocina la proteina con sal, ajo, limon, pimenton o los condimentos que tengas.",
    "Suma verduras o ensalada para volumen y micronutrientes.",
    "Servi la porcion del plan. Si quedo comida extra, guardala para otro dia en vez de repetir sin medir."
  ];
  return addOriginalPrepTip(item, steps);
}

function renderPrepContent(item) {
  const meta = recipeMetaForMeal(item);
  const steps = buildDetailedPrepSteps(item);
  return `
    <div class="recipe-meta">
      <span>Tiempo: ${meta.time}</span>
      <span>Método: ${displayText(meta.method)}</span>
    </div>
    <div class="prep-steps">
      ${steps.map((step, index) => `
        <div class="prep-step"><div class="prep-num">${index + 1}</div><div class="prep-text">${displayText(step)}</div></div>
      `).join("")}
    </div>
  `;
}

const WHEY = { p: 24, c: 3, g: 2 };
const WAKE_TIME = "09:30";
const TRAINING_TIME = "12:00";
const TRAINING_DAY_TIMES = {
  breakfast: "10:00",
  pre: "11:15",
  post: "14:30",
  lunch: "16:00",
  snack: "19:30",
  dinner: "22:00",
  night: "23:30"
};
const REST_DAY_TIMES = {
  breakfast: "10:00",
  lunch: "13:30",
  snack: "17:30",
  dinner: "21:30",
  night: "23:30"
};

function wheyFood(label = "1 scoop whey con agua") {
  return food(label, WHEY.p, WHEY.c, WHEY.g);
}

function wheyWithBananaAndCreatineTemplate(name = "Whey + banana + creatina") {
  return altMeal(name, "Whey - banana - agua - creatina", [
    wheyFood(),
    food("1 banana", 1, 27, 0),
    food("Creatina 5g", 0, 0, 0)
  ], [
    "Tomalo como parte fija del dia: 1 scoop de whey OneFit con agua y banana.",
    "La creatina va todos los dias; el horario no es magico, lo importante es cumplirla."
  ]);
}

function solidProteinFallbackTemplate(name = "Huevos, tostada y fruta") {
  return altMeal(name, "Huevos - tostada - fruta", [
    food("2 huevos", 12, 1, 10),
    food("1 tostada integral", 4, 17, 2),
    food("1 fruta", 1, 24, 0)
  ], [
    "Comodin de comida real cuando no queres caer en otro batido.",
    "Simple, rapido y facil de sostener en dias de descanso o meriendas apuradas."
  ]);
}

function solidPostWorkoutTemplate() {
  return altMeal("Atun con papa y limon", "Atun - papa - tomate - oliva - creatina", [
    food("1 lata grande de atun", 32, 0, 2),
    food("220g papa hervida", 5, 44, 0),
    food("Tomate + limon", 1, 5, 0),
    food("1 cdita oliva", 0, 0, 5),
    food("Creatina 5g", 0, 0, 0)
  ], [
    "Si ese dia no queres batido, atun + papa es el reemplazo solido.",
    "Sumale 5g de creatina (todos los dias, entrenes o descanses)."
  ]);
}

function metabolismBoosterTemplate(name = "Refuerzo de leche, banana y nueces") {
  return altMeal(name, "Leche - banana - nueces - tostada", [
    food("250ml leche entera", 8, 12, 8),
    food("1 banana", 1, 27, 0),
    food("15g nueces", 2, 2, 10),
    food("1 tostada integral", 3, 17, 1)
  ], [
    "Refuerzo de calorias para metabolismo rapido sin meter otro scoop de whey.",
    "Usalo cuando el dia quedo corto o cuando el entrenamiento te dejo con hambre real."
  ]);
}

function energyFloorTemplate(name = "Refuerzo chico de energia") {
  return altMeal(name, "Leche - banana chica - tostada - queso untable", [
    food("200ml leche entera", 6, 10, 7),
    food("1 banana chica", 1, 20, 0),
    food("1 tostada integral", 4, 17, 2),
    food("1 cda queso untable", 2, 2, 4)
  ], [
    "Refuerzo simple para no quedar bajo de calorias.",
    "Usalo para levantar energia sin complicarte ni caer en un batido."
  ]);
}

function hashString(value) {
  return String(value).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function pickAlt(item, options) {
  return options[hashString(item.id + "-" + item.label) % options.length];
}

function commonMainAltOptions() {
  return [
    altMeal("Pastel de papa con carne magra", "Carne magra - papa - huevo - mozzarella - queso rallado", [
      food("180g carne magra picada", 42, 0, 10),
      food("300g papa pisada", 6, 60, 0),
      food("1 huevo duro", 6, 1, 5),
      food("40g mozzarella", 9, 1, 8),
      food("1 cda queso rallado", 3, 1, 4),
      food("Cebolla + morron + tomate", 2, 12, 0)
    ], [
      "Saltea cebolla, morron y carne magra con pimenton, comino y tomate.",
      "Arma fuente con relleno, huevo duro picado y pure de papa arriba.",
      "Termina con mozzarella y queso rallado; horno fuerte hasta gratinar."
    ]),
    altMeal("Tarta de pollo, jamon y queso", "Tapa de tarta - pollo - jamon - queso en fetas - huevo", [
      food("1 tapa de tarta", 8, 38, 8),
      food("160g pollo desmenuzado", 45, 0, 6),
      food("60g jamon cocido", 12, 1, 4),
      food("60g queso en fetas", 14, 2, 10),
      food("2 huevos", 12, 1, 10),
      food("Cebolla + espinaca", 3, 8, 1)
    ], [
      "Mezcla pollo, jamon, queso, huevos y verduras salteadas.",
      "Va todo a una tapa de tarta y horno 25-30 min.",
      "Queda practica para guardar porciones."
    ]),
    altMeal("Milanesa de pollo al horno con pure", "Pechuga - pan rallado - papa - ensalada", [
      food("200g pechuga rebozada al horno", 48, 10, 8),
      food("300g papa para pure", 6, 60, 0),
      food("1 cdita aceite de oliva", 0, 0, 5),
      food("Ensalada de tomate y hojas", 2, 8, 0)
    ], [
      "Reboza la pechuga y hornea a 200 grados hasta dorar.",
      "Pure simple con papa, sal y un toque de oliva.",
      "Es comida de casa, alta en proteina y facil de cumplir."
    ]),
    altMeal("Fideos con tuco de carne magra", "Pasta - carne magra - tomate - queso rallado", [
      food("90g fideos secos", 11, 65, 2),
      food("150g carne magra picada", 35, 0, 8),
      food("250ml tomate triturado", 3, 14, 0),
      food("1 cda queso rallado", 3, 1, 4)
    ], [
      "Dora carne con ajo y cebolla. Suma tomate y cocina 15 min.",
      "Mezcla con pasta al dente y queso rallado medido.",
      "Ideal para dias de espalda o piernas por el carbo."
    ]),
    altMeal("Tortilla de papa, huevo y queso", "Huevos - papa - queso en fetas - ensalada", [
      food("3 huevos", 18, 1, 15),
      food("280g papa", 6, 56, 0),
      food("50g queso en fetas", 12, 1, 8),
      food("Ensalada mixta", 2, 8, 0)
    ], [
      "Cocina la papa en cubos chicos y mezcla con huevo batido.",
      "Agrega queso en fetas y cocina tapado hasta que firme.",
      "Cena simple, saciante y buena para recuperar."
    ]),
    altMeal("Arroz con atun, huevo y palta", "Arroz - atun - huevo - palta - tomate", [
      food("1 taza arroz cocido", 4, 50, 0),
      food("1 lata grande de atun", 32, 0, 2),
      food("2 huevos duros", 12, 1, 10),
      food("1/2 palta", 2, 6, 12),
      food("Tomate + limon", 1, 6, 0)
    ], [
      "Arma bowl con arroz, atun escurrido, huevo duro, palta y tomate.",
      "Limon, sal y pimienta. Cero raro, mucha proteina."
    ]),
    altMeal("Hamburguesas caseras con papas al horno", "Carne magra - pan - papas - queso - ensalada", [
      food("2 hamburguesas magras caseras", 40, 0, 14),
      food("1 pan de hamburguesa", 5, 28, 3),
      food("250g papas al horno", 5, 50, 0),
      food("1 feta de queso", 6, 1, 5),
      food("Lechuga + tomate", 1, 5, 0)
    ], [
      "Arma hamburguesas con carne magra, sal, pimienta y ajo.",
      "Papas al horno en bastones con poquito aceite.",
      "Mucho mejor que delivery y encaja con recomposicion."
    ]),
    altMeal("Empanadas de carne al horno con ensalada", "Empanadas - carne magra - huevo - ensalada", [
      food("3 tapas de empanada", 9, 51, 6),
      food("150g carne magra", 35, 0, 8),
      food("1 huevo duro", 6, 1, 5),
      food("Ensalada grande", 3, 10, 0)
    ], [
      "Relleno con carne magra, cebolla, morron y huevo duro.",
      "Horno hasta dorar. Ensalada grande al lado para fibra."
    ]),
    altMeal("Pizza casera con mozzarella y pollo", "Prepizza - mozzarella - pollo - tomate - rucula", [
      food("1 prepizza individual", 10, 62, 6),
      food("120g pollo cocido", 34, 0, 4),
      food("70g mozzarella", 16, 2, 14),
      food("Salsa de tomate", 2, 10, 0),
      food("Rucula o tomate fresco", 1, 4, 0)
    ], [
      "Salsa de tomate, pollo, mozzarella medida y horno fuerte.",
      "Rucula o tomate al salir. Rica, normal y controlada."
    ]),
    altMeal("Pollo al horno con papas y queso rallado", "Pollo - papas - zanahoria - queso rallado", [
      food("220g pollo al horno", 50, 0, 12),
      food("280g papas", 6, 56, 0),
      food("Zanahoria + cebolla", 2, 14, 0),
      food("1 cda queso rallado", 3, 1, 4)
    ], [
      "Todo a la bandeja con sal, pimenton, ajo y limon.",
      "Queso rallado al final para sabor sin pasarse."
    ])
  ];
}

function commonSnackAltOptions() {
  return [
    altMeal("Tostado de jamon y queso con fruta", "Pan - jamon - queso en fetas - fruta", [
      food("2 rebanadas pan integral", 7, 34, 3),
      food("70g jamon cocido", 14, 1, 5),
      food("50g queso en fetas", 12, 1, 8),
      food("1 fruta", 1, 24, 0)
    ], ["Tostado clasico y una fruta. Practico y normal."]),
    altMeal("Sandwich de atun, queso y tomate", "Pan - atun - queso en fetas - tomate", [
      food("2 rebanadas pan integral", 7, 34, 3),
      food("1 lata de atun", 24, 0, 1),
      food("40g queso en fetas", 9, 1, 6),
      food("Tomate + hojas verdes", 1, 5, 0)
    ], ["Atun escurrido, queso y tomate. Buena proteina sin cocinar."]),
    altMeal("Jamón, queso y fruta", "Jamon cocido - queso en fetas - fruta", [
      food("70g jamon cocido natural", 14, 1, 5),
      food("40g queso en fetas o mozzarella", 9, 1, 6),
      food("1 fruta", 1, 24, 0)
    ], ["Plato frio simple: jamon, queso y fruta."]),
    altMeal("Huevos duros con fruta", "Huevos - fruta - mate o cafe", [
      food("2 huevos duros", 12, 1, 10),
      food("1 fruta", 1, 24, 0),
      food("Mate o cafe", 0, 0, 0)
    ], ["Deja huevos hervidos listos en la heladera."]),
    altMeal("Panqueques de banana y huevo con miel", "Banana - huevos - leche - miel", [
      food("1 banana", 1, 27, 0),
      food("2 huevos", 12, 1, 10),
      food("150ml leche entera", 5, 8, 5),
      food("1 cdita miel", 0, 8, 0),
      food("Mate o cafe", 0, 0, 0)
    ], [
      "Pisa banana con huevos y cocina panqueques chicos en sarten antiadherente.",
      "Tomalos con leche al lado y un toque de miel. Sin harinas raras."
    ]),
    altMeal("Huevos revueltos con tostada y fruta", "Huevos - tostada - queso untable - fruta", [
      food("2 huevos revueltos", 12, 1, 10),
      food("1 tostada integral", 4, 17, 2),
      food("1 cda queso untable", 2, 2, 4),
      food("1 fruta", 1, 24, 0)
    ], [
      "Resolve una colacion proteica con comida real y cero vueltas.",
      "Si te falta mas energia, suma una segunda tostada o una banana."
    ]),
    altMeal("Tostadas con queso untable y banana", "Tostadas - queso untable - banana - miel", [
      food("2 tostadas integrales", 7, 34, 3),
      food("2 cdas queso untable", 4, 3, 7),
      food("1 banana", 1, 27, 0),
      food("1 cdita miel", 0, 8, 0)
    ], ["Unta el queso, suma banana y un poco de miel si hace falta energia."])
  ];
}

function lightSnackOptions() {
  return [
    altMeal("Rolls de jamon y queso", "Jamon cocido - queso en fetas - tomate", [
      food("80g jamon cocido natural", 16, 1, 5),
      food("40g queso en fetas o mozzarella", 9, 1, 6),
      food("Tomate en rodajas", 1, 4, 0)
    ], [
      "Opcion salada, corta y con proteina real cuando el dia ya viene cargado.",
      "Si queres mas saciedad, acompana con tomate, sal y oregano."
    ]),
    altMeal("Jamón, queso y fruta", "Jamon cocido - queso en fetas - fruta", [
      food("70g jamon cocido natural", 14, 1, 5),
      food("40g queso en fetas o mozzarella", 9, 1, 6),
      food("1 fruta", 1, 24, 0)
    ], [
      "Plato frio simple: jamon, queso y fruta.",
      "Sirve cuando no queres cocinar ni meter mas pan."
    ]),
    altMeal("Huevos duros con fruta", "Huevos - fruta - mate o cafe", [
      food("2 huevos duros", 12, 1, 10),
      food("1 fruta", 1, 24, 0),
      food("Mate o cafe", 0, 0, 0)
    ], [
      "Deja huevos hervidos en la heladera.",
      "Snack normal, barato y alto en saciedad."
    ]),
    altMeal("Tostado chico de jamon y queso", "Pan - jamon - queso en fetas", [
      food("1 rebanada pan integral", 4, 17, 2),
      food("50g jamon cocido", 10, 1, 3),
      food("30g queso en fetas", 7, 1, 5)
    ], ["Opcion salada corta para no quedarte con hambre."])
  ];
}

function nonWheySnackOptions() {
  return [
    altMeal("Jamón, queso y fruta", "Jamon cocido - queso en fetas - fruta", [
      food("70g jamon cocido natural", 14, 1, 5),
      food("40g queso en fetas o mozzarella", 9, 1, 6),
      food("1 fruta", 1, 24, 0)
    ], ["Plato frio simple: jamon, queso y fruta."]),
    altMeal("Sandwich de atun, queso y tomate", "Pan - atun - queso en fetas - tomate", [
      food("2 rebanadas pan integral", 7, 34, 3),
      food("1 lata de atun", 24, 0, 1),
      food("40g queso en fetas", 9, 1, 6),
      food("Tomate + hojas verdes", 1, 5, 0)
    ], ["Atun escurrido, queso y tomate. Buena proteina sin sumar otro scoop."]),
    altMeal("Huevos duros con fruta", "Huevos - fruta - mate o cafe", [
      food("2 huevos duros", 12, 1, 10),
      food("1 fruta", 1, 24, 0),
      food("Mate o cafe", 0, 0, 0)
    ], ["Deja huevos hervidos listos en la heladera."]),
    altMeal("Tostado chico de jamon y queso con fruta", "Pan - jamon - queso en fetas - fruta", [
      food("1 rebanada pan integral", 4, 17, 2),
      food("50g jamon cocido", 10, 1, 3),
      food("30g queso en fetas", 7, 1, 5),
      food("1 fruta", 1, 24, 0)
    ], ["Tostado chico y una fruta. Practico, normal y sin sumar otro scoop."])
  ];
}

function commonBreakfastOptions() {
  return [
    altMeal("Tostadas con queso untable y fruta", "Tostadas - queso untable - fruta - cafe", [
      food("2 tostadas integrales", 7, 34, 3),
      food("2 cdas queso untable", 4, 3, 7),
      food("1 fruta", 1, 24, 0),
      food("Cafe con un chorrito de leche", 3, 5, 3)
    ], [
      "Desayuno simple y sostenible.",
      "Si entrenas fuerte ese dia, podes sumar 1 banana extra o 1 tostada mas."
    ]),
    altMeal("Huevos con palta y tostada", "Huevos - palta - tostada - tomate - cafe", [
      food("2 huevos", 12, 1, 10),
      food("1/4 palta", 1, 3, 6),
      food("1 tostada integral", 4, 17, 2),
      food("Tomate", 1, 4, 0),
      food("Cafe con un chorrito de leche", 3, 5, 3)
    ], [
      "Huevos revueltos o a la plancha y palta medida.",
      "Tostada al lado para sumar carbo sin depender de tostadas todos los dias."
    ]),
    altMeal("Revuelto de huevos con papa, jamon y queso", "Huevos - papa - jamon - queso - fruta - cafe", [
      food("2 huevos", 12, 1, 10),
      food("120g papa hervida o al horno", 3, 24, 0),
      food("50g jamon cocido natural", 10, 1, 3),
      food("30g queso en fetas", 7, 1, 5),
      food("1 fruta", 1, 24, 0),
      food("Cafe con un chorrito de leche", 3, 5, 3)
    ], [
      "Corta la papa en cubos y calentala en sarten o microondas.",
      "Hace los huevos revueltos y suma jamon y queso al final.",
      "Desayuno fuerte, normal y con buen carbo sin depender de tostadas."
    ]),
    altMeal("Tostado de jamon y queso con banana", "Pan - jamon - queso - banana - cafe", [
      food("2 rebanadas pan integral", 7, 34, 3),
      food("50g jamon cocido natural", 10, 1, 3),
      food("40g queso en fetas o mozzarella", 9, 1, 6),
      food("1 banana", 1, 27, 0),
      food("Cafe con un chorrito de leche", 3, 5, 3)
    ], [
      "Arma un tostado grande con jamon y queso.",
      "Banana y leche al lado para completar energia antes de entrenar."
    ]),
    altMeal("Omelette de mozzarella, tomate y palta", "Huevos - mozzarella - tomate - palta - fruta", [
      food("3 huevos", 18, 1, 15),
      food("50g mozzarella o queso en fetas", 12, 1, 9),
      food("1/2 palta", 2, 6, 12),
      food("Tomate + hojas verdes", 1, 6, 0),
      food("1 fruta", 1, 24, 0),
      food("1 cdita aceite de oliva", 0, 0, 5)
    ], [
      "Omelette simple con queso, tomate al costado y palta medida.",
      "Queda alto en proteina y grasas buenas; suma fruta para energia."
    ]),
    altMeal("Tortilla de papa, huevo y queso", "Papa - huevos - queso - jamon - fruta", [
      food("180g papa", 4, 36, 0),
      food("2 huevos", 12, 1, 10),
      food("35g queso en fetas o mozzarella", 8, 1, 6),
      food("40g jamon cocido natural", 8, 1, 2),
      food("1 fruta", 1, 24, 0)
    ], [
      "Cocina papa en cubos y mezclala con huevo batido.",
      "Suma jamon y queso; cocina tapado hasta que firme.",
      "Va muy bien para piernas o espalda porque llena y rinde."
    ]),
    altMeal("Panqueques de banana y huevo con leche", "Banana - huevos - leche - queso untable - miel", [
      food("1 banana grande", 1, 31, 0),
      food("2 huevos", 12, 1, 10),
      food("150ml leche entera", 5, 8, 5),
      food("1 cda queso untable", 2, 2, 4),
      food("1 cdita miel", 0, 8, 0)
    ], [
      "Pisa banana con huevos y cocina panqueques chicos en sarten antiadherente.",
      "Queso untable y miel arriba. Dulce, normal y sin harinas raras."
    ]),
    altMeal("Sandwich de huevo, jamon y mozzarella", "Pan - huevo - jamon - mozzarella - fruta", [
      food("2 rebanadas pan integral", 7, 34, 3),
      food("1 huevo", 6, 1, 5),
      food("50g jamon cocido natural", 10, 1, 3),
      food("30g mozzarella", 7, 1, 5),
      food("1 fruta", 1, 24, 0)
    ], [
      "Hace huevos a la plancha y armalo tipo sandwich caliente.",
      "Es distinto al tostado clasico porque el huevo es el centro."
    ]),
    altMeal("Porcion de tarta de jamon, queso y huevo", "Tarta - jamon - queso - huevo - fruta - leche", [
      food("1 porcion grande de tarta casera", 18, 34, 14),
      food("1 huevo duro extra", 6, 1, 5),
      food("1 fruta", 1, 24, 0),
      food("200ml leche entera", 6, 10, 7)
    ], [
      "Deja tarta hecha del dia anterior y recalenta una porcion.",
      "Huevo duro extra si ese dia queres asegurar proteina."
    ]),
    altMeal("Medialuna con jamon y queso, huevo y leche", "Medialuna - jamon - queso - huevo - leche", [
      food("1 medialuna grande", 3, 24, 9),
      food("60g jamon cocido natural", 12, 1, 4),
      food("50g queso en fetas", 12, 1, 8),
      food("1 huevo duro", 6, 1, 5),
      food("200ml leche entera", 6, 10, 7)
    ], [
      "Rellena las medialunas con jamon y queso y calentarlas apenas.",
      "No es para todos los dias, pero una vez por semana encaja si el resto esta ordenado."
    ]),
    altMeal("Huevos con queso untable, banana y nueces", "Huevos - queso untable - banana - nueces - leche", [
      food("2 huevos", 12, 1, 10),
      food("1 cda queso untable", 2, 2, 4),
      food("1 banana", 1, 27, 0),
      food("10g nueces", 2, 2, 7),
      food("150ml leche entera", 5, 8, 5)
    ], [
      "Huevos revueltos o a la plancha con queso untable al costado.",
      "Banana, nueces y leche completan calorias sin hacer una mezcla rara."
    ])
  ];
}

const allWeeksBase = JSON.parse(JSON.stringify(allWeeks));
let planGenerationDate = new Date();

function resetPlanWeeksToBase() {
  const copy = JSON.parse(JSON.stringify(allWeeksBase));
  allWeeks.splice(0, allWeeks.length, ...copy);
}

function getPlanGenerationDate() {
  return planGenerationDate instanceof Date && !Number.isNaN(planGenerationDate.getTime())
    ? planGenerationDate
    : new Date();
}

// =====================================================
// MENU NUEVO RONY
// - Se regenera con seed semanal.
// - Comidas normales, sostenibles y con opcion B real.
// =====================================================
function freshMenuSeed(date = getPlanGenerationDate()) {
  return date.getFullYear() * 100 + getISOWeekNumber(date) + getMenuRotationCorrection(date) * 37;
}

function pickFreshTemplate(options, seed, predicate = () => true) {
  const start = Math.abs(seed) % options.length;
  for (let i = 0; i < options.length; i++) {
    const option = options[(start + i) % options.length];
    if (predicate(option)) return option;
  }
  return options[start];
}

function mealProteinGroup(item) {
  const text = mealCoreSearchText(item);
  if (/\b(atun|merluza|salmon|pescado)\b/.test(text)) return "pescado";
  if (/\b(pollo|pechuga|muslo)\b/.test(text)) return "pollo";
  if (/\b(carne|bife|churrasco|lomo|peceto|hamburguesa)\b/.test(text)) return "carne";
  if (/\b(huevo|huevos|omelette|tortilla)\b/.test(text)) return "huevo";
  if (/\b(jamon)\b/.test(text)) return "jamon";
  if (/\b(lenteja|lentejas|poroto|porotos|garbanzo|garbanzos)\b/.test(text)) return "legumbre";
  if (/\b(whey)\b/.test(text)) return "whey";
  return "mixto";
}

function breakfastStyleGroup(item) {
  const text = mealCoreSearchText(item);
  if (/\btarta\b/.test(text)) return "tarta";
  if (/\bmedialuna\b/.test(text)) return "medialuna";
  if (/\bpanqueque|pancake\b/.test(text)) return "panqueque";
  if (/\btortilla|papa\b/.test(text)) return "papa-huevo";
  if (/\bomelette\b/.test(text)) return "omelette";
  if (/\bsandwich|tostado\b/.test(text)) return "sandwich";
  if (/\btostada|tostadas\b/.test(text)) return "tostada";
  return "otro";
}

function isBreadHeavyBreakfastGroup(group) {
  return group === "tostada" || group === "sandwich";
}

function pickFreshBreakfastAlt(primary, options, seed) {
  const primaryGroup = breakfastStyleGroup(primary);
  const differentGroup = pickFreshTemplate(options, seed, (option) =>
    option.name !== primary.name && breakfastStyleGroup(option) !== primaryGroup
  );
  return differentGroup || pickFreshAlt(primary, options, seed);
}

function freshBreakfastOptions() {
  return [
    altMeal("Panqueques caseros de banana y huevo", "Banana - huevos - leche", [
      food("1 banana", 1, 27, 0),
      food("2 huevos", 12, 1, 10),
      food("100ml leche entera", 3, 4, 3)
    ], [
      "Pisa banana, mezclala con huevos y un chorrito de leche, y hace panqueques chicos en sarten antiadherente.",
      "Desayuno real y facil de repetir sin depender de mezclas especiales."
    ]),
    altMeal("Tostado de jamon y mozzarella con banana", "Pan - jamon - mozzarella - banana", [
      food("2 rebanadas pan integral", 7, 34, 3),
      food("60g jamon cocido natural", 12, 1, 4),
      food("50g mozzarella o queso en fetas", 12, 1, 8),
      food("1 banana", 1, 27, 0),
      food("Cafe con leche", 3, 5, 3)
    ], [
      "Tostado clasico con jamon y queso.",
      "Banana para energia facil antes del dia de gym."
    ]),
    altMeal("Revuelto de huevos, papa, jamon y queso", "Huevos - papa - jamon - queso - fruta", [
      food("2 huevos", 12, 1, 10),
      food("150g papa cocida", 3, 30, 0),
      food("50g jamon cocido natural", 10, 1, 3),
      food("30g queso en fetas", 7, 1, 5),
      food("1 fruta", 1, 24, 0)
    ], [
      "Calenta papa en cubos y suma huevos batidos.",
      "Termina con jamon y queso para que quede bien sabroso."
    ]),
    altMeal("Sandwich caliente de huevo, jamon y queso", "Pan - huevo - jamon - queso - fruta", [
      food("2 rebanadas pan integral", 7, 34, 3),
      food("1 huevo", 6, 1, 5),
      food("60g jamon cocido", 12, 1, 4),
      food("40g queso en fetas", 9, 1, 6),
      food("1 fruta", 1, 24, 0)
    ], [
      "Huevo a la plancha y sandwich caliente.",
      "Comida normal, proteica y facil de repetir."
    ]),
    altMeal("Tostadas con queso untable, banana y leche", "Tostadas - queso untable - banana - leche", [
      food("2 tostadas integrales", 7, 34, 3),
      food("2 cdas queso untable", 4, 3, 7),
      food("1 banana", 1, 27, 0),
      food("200ml leche entera", 6, 10, 7)
    ], [
      "Unta queso, suma banana en rodajas y listo.",
      "Simple, barato y de buena adherencia."
    ]),
    altMeal("Omelette de mozzarella, tomate y pan", "Huevos - mozzarella - tomate - pan - fruta", [
      food("3 huevos", 18, 1, 15),
      food("50g mozzarella", 12, 1, 9),
      food("Tomate", 1, 4, 0),
      food("1 rebanada pan integral", 4, 17, 2),
      food("1 fruta", 1, 24, 0)
    ], [
      "Omelette con mozzarella y tomate al costado.",
      "Pan y fruta para que no quede bajo en energia."
    ]),
    altMeal("Tortilla chica de papa, huevo y queso", "Papa - huevos - queso - fruta", [
      food("180g papa", 4, 36, 0),
      food("2 huevos", 12, 1, 10),
      food("35g queso en fetas", 8, 1, 6),
      food("1 fruta", 1, 24, 0)
    ], [
      "Tortilla chica en sarten antiadherente.",
      "Muy buena para dias de piernas o espalda."
    ]),
    altMeal("Panqueques de banana y huevo", "Banana - huevos - leche - queso untable", [
      food("1 banana grande", 1, 31, 0),
      food("2 huevos", 12, 1, 10),
      food("150ml leche entera", 5, 8, 5),
      food("1 cda queso untable", 2, 2, 4),
      food("1 cdita miel", 0, 8, 0)
    ], [
      "Pisa banana con huevo y cocina panqueques chicos.",
      "Queso untable y miel arriba. Sin harinas raras."
    ]),
    altMeal("Porcion de tarta de jamon, queso y huevo", "Tarta - jamon - queso - huevo - fruta", [
      food("1 porcion grande de tarta casera", 18, 34, 14),
      food("1 huevo duro", 6, 1, 5),
      food("1 fruta", 1, 24, 0),
      food("200ml leche entera", 6, 10, 7)
    ], [
      "Deja tarta hecha del dia anterior.",
      "Desayuno fuerte para dias de entrenamiento."
    ]),
    altMeal("Medialuna con jamon y queso, huevo y leche", "Medialuna - jamon - queso - huevo - leche", [
      food("1 medialuna grande", 3, 24, 9),
      food("60g jamon cocido", 12, 1, 4),
      food("50g queso en fetas", 12, 1, 8),
      food("1 huevo duro", 6, 1, 5),
      food("200ml leche entera", 6, 10, 7)
    ], [
      "Una vez por semana puede entrar si el resto del dia esta ordenado.",
      "No es premio ni trampa: es adherencia controlada."
    ])
  ];
}

function freshLightBreakfastOptions() {
  return [
    altMeal("Tostado chico de jamon y mozzarella", "Pan - jamon - mozzarella - cafe", [
      food("1 rebanada grande de pan integral", 5, 24, 2),
      food("50g jamon cocido natural", 10, 1, 3),
      food("35g mozzarella o queso en fetas", 8, 1, 6),
      food("Cafe con un chorrito de leche", 3, 5, 3)
    ], [
      "Desayuno corto para levantarte 9:30 y no caer pesado al gym.",
      "Si te quedas con hambre, guarda la fruta para el pre-entreno."
    ]),
    altMeal("Panqueques chicos de banana y huevo", "Banana - huevo - leche", [
      food("1 banana chica", 1, 20, 0),
      food("2 huevos", 12, 1, 10),
      food("120ml leche entera", 4, 5, 4)
    ], [
      "Hace dos o tres panqueques chicos con banana y huevo, sin harinas raras.",
      "Va bien cuando queres algo dulce pero normal antes del gym."
    ]),
    altMeal("Tortilla chica de papa y huevo", "Papa - huevos - queso - cafe", [
      food("130g papa hervida", 3, 26, 0),
      food("2 huevos", 12, 1, 10),
      food("20g mozzarella o queso en fetas", 5, 1, 4),
      food("Cafe con un chorrito de leche", 3, 5, 3)
    ], [
      "Dora la papa ya hervida, suma huevo batido y termina con un poco de queso.",
      "Se siente comida real, pero sigue siendo un desayuno liviano para entrenar al mediodia."
    ]),
    altMeal("Huevos revueltos simples con tostada", "Huevos - tostada - fruta chica", [
      food("2 huevos", 12, 1, 10),
      food("1 tostada integral", 4, 17, 2),
      food("1 fruta chica", 1, 18, 0)
    ], [
      "Huevos revueltos sin hacerlo pesado.",
      "Si estas apurado, deja huevos duros hechos desde la noche anterior."
    ]),
    altMeal("Porcion de tarta casera con cafe con leche", "Tarta - jamon - queso - huevo - cafe", [
      food("1 porcion mediana de tarta casera", 16, 28, 12),
      food("Cafe con leche", 4, 6, 4),
      food("1 fruta chica", 1, 18, 0)
    ], [
      "Deja media tarta hecha de antes y recalenta una porcion.",
      "Te saca de la rutina de tostadas sin meter inventos ni un desayuno gigante."
    ]),
    altMeal("Sandwich chico de huevo, jamon y queso", "Pan - huevo - jamon - queso", [
      food("1 rebanada grande de pan integral", 5, 24, 2),
      food("1 huevo", 6, 1, 5),
      food("40g jamon cocido natural", 8, 1, 3),
      food("25g queso en fetas", 6, 1, 4)
    ], [
      "Huevo a la plancha y sandwich chico.",
      "Proteina real, porcion moderada y buena adherencia."
    ])
  ];
}

function freshSnackOptions() {
  return [
    altMeal("Sandwich de atun, queso y tomate", "Pan - atun - queso - tomate - fruta", [
      food("2 rebanadas pan integral", 7, 34, 3),
      food("1 lata de atun", 24, 0, 1),
      food("35g queso en fetas", 8, 1, 5),
      food("Tomate", 1, 5, 0),
      food("1 fruta", 1, 24, 0)
    ], ["Atun escurrido, queso, tomate y fruta. Practico."]),
    altMeal("Tostado chico de jamon y queso con fruta", "Pan - jamon - queso - fruta", [
      food("1 rebanada pan integral", 4, 17, 2),
      food("60g jamon cocido", 12, 1, 4),
      food("35g queso en fetas", 8, 1, 5),
      food("1 fruta", 1, 24, 0)
    ], ["Snack salado, simple y con proteina real."]),
    altMeal("Huevos duros con banana", "Huevos - banana - mate", [
      food("2 huevos duros", 12, 1, 10),
      food("1 banana", 1, 27, 0),
      food("Mate o cafe", 0, 0, 0)
    ], ["Deja huevos listos. Banana para energia rapida."]),
    altMeal("Rolls de jamon y queso con pan", "Jamon - queso - pan - fruta", [
      food("80g jamon cocido", 16, 1, 5),
      food("40g queso en fetas", 9, 1, 6),
      food("1 rebanada pan integral", 4, 17, 2),
      food("1 fruta", 1, 24, 0)
    ], ["Rolls frios y una rebanada de pan. Cero cocina."]),
    altMeal("Panqueques caseros chicos con leche", "Banana - huevo - leche - fruta", [
      food("1 banana chica", 1, 20, 0),
      food("2 huevos", 12, 1, 10),
      food("120ml leche entera", 4, 5, 4),
      food("1 fruta", 1, 24, 0)
    ], ["Usalo cuando tengas ganas de algo dulce sin inventos raros."]),
    altMeal("Porcion de tarta casera con fruta", "Tarta - jamon - queso - fruta", [
      food("1 porcion mediana de tarta casera", 16, 28, 12),
      food("1 fruta", 1, 24, 0),
      food("Mate o cafe", 0, 0, 0)
    ], ["Tarta hecha de antes y fruta al lado. Merienda real y sostenible."]),
    altMeal("Tostadas con queso untable, jamon y fruta", "Tostadas - queso untable - jamon - fruta", [
      food("2 tostadas integrales", 7, 34, 3),
      food("2 cdas queso untable", 4, 3, 7),
      food("60g jamon cocido natural", 12, 1, 4),
      food("1 fruta", 1, 24, 0)
    ], [
      "Merienda fria, normal y con mas proteina real.",
      "Si quedaste corto de energia, suma una banana o una tercera tostada."
    ])
  ];
}

function freshPreWorkoutOptions() {
  return [
    altMeal("Banana con miel", "Banana - miel - agua", [
      food("1 banana", 1, 27, 0),
      food("1 cdita miel", 0, 8, 0)
    ], ["45 min antes de entrenar. Liviano, barato y efectivo."]),
    altMeal("Tostada con mermelada y banana chica", "Tostada - mermelada - banana", [
      food("1 tostada integral", 4, 17, 2),
      food("1 cda mermelada", 0, 13, 0),
      food("1 banana chica", 1, 20, 0)
    ], ["Carbo rapido sin caer pesado."]),
    altMeal("Pan con miel y cafe", "Pan - miel - cafe - agua", [
      food("1 rebanada pan integral", 4, 17, 2),
      food("1 cda miel", 0, 17, 0),
      food("Cafe", 0, 0, 0)
    ], ["Pre simple cuando ya desayunaste algo salado."]),
    altMeal("Naranja con tostada y miel", "Naranja - tostada - miel", [
      food("1 naranja grande", 1, 22, 0),
      food("1 tostada integral", 4, 17, 2),
      food("1 cdita miel", 0, 8, 0)
    ], ["Buena opcion si queres variar la banana."]),
    altMeal("Mandarinas con pan y mermelada", "Mandarinas - pan - mermelada", [
      food("2 mandarinas", 1, 24, 0),
      food("1 rebanada pan integral", 4, 17, 2),
      food("1 cda mermelada", 0, 13, 0)
    ], ["Fruta facil y carbo liviano para entrenar a las 12."])
  ];
}

function freshPostWorkoutOptions() {
  return [
    altMeal("Whey OneFit, banana y creatina", "Whey - banana - creatina - agua", [
      wheyFood("1 scoop whey OneFit con agua"),
      food("1 banana", 1, 27, 0),
      food("Creatina 5g", 0, 0, 0)
    ], ["Shake directo post-entreno. Simple y consistente."]),
    altMeal("Whey con leche, banana y creatina", "Whey - leche - banana - creatina", [
      wheyFood("1 scoop whey OneFit"),
      food("250ml leche entera", 8, 12, 8),
      food("1 banana", 1, 27, 0),
      food("Creatina 5g", 0, 0, 0)
    ], ["Usalo cuando vengas con hambre o el entreno fue fuerte."]),
    altMeal("Whey, tostadas con mermelada y creatina", "Whey - tostadas - creatina", [
      wheyFood("1 scoop whey OneFit con agua"),
      food("2 tostadas con mermelada", 4, 38, 2),
      food("Creatina 5g", 0, 0, 0)
    ], ["Recuperacion rapida con proteina y carbo facil."]),
    altMeal("Whey con panqueque de banana y creatina", "Whey - banana - huevo - creatina", [
      wheyFood("1 scoop whey OneFit con agua"),
      food("1 banana chica", 1, 20, 0),
      food("1 huevo", 6, 1, 5),
      food("Creatina 5g", 0, 0, 0)
    ], ["Post mas dulce si queres variar, pero con base casera y simple."])
  ];
}

function freshNoonPostWorkoutOptions() {
  return [
    altMeal("Atun con papa y limon", "Atun - papa - tomate - oliva - creatina", [
      food("1 lata grande de atun", 32, 0, 2),
      food("220g papa hervida", 5, 44, 0),
      food("Tomate + limon", 1, 5, 0),
      food("1 cdita oliva", 0, 0, 5),
      food("Creatina 5g", 0, 0, 0)
    ], [
      "Post-entreno real, rapido y facil de repetir.",
      "Atun, papa y creatina para llegar firme al almuerzo sin depender del shaker."
    ]),
    altMeal("Sandwich caliente de jamon y queso + banana", "Pan - jamon - queso - banana - creatina", [
      food("2 rebanadas pan integral", 7, 34, 3),
      food("60g jamon cocido natural", 12, 1, 4),
      food("40g queso en fetas", 9, 1, 6),
      food("1 banana", 1, 27, 0),
      food("Creatina 5g", 0, 0, 0)
    ], [
      "Sandwich normal con carbo rapido y proteina real.",
      "Banana y creatina completan el corte del entrenamiento sin hacer un plato raro."
    ]),
    altMeal("Sandwich de pollo, queso y mandarina", "Pan - pollo - queso - mandarina - creatina", [
      food("2 rebanadas pan integral", 7, 34, 3),
      food("90g pollo cocido", 26, 0, 3),
      food("25g queso en fetas", 6, 1, 4),
      food("1 mandarina", 1, 12, 0),
      food("Creatina 5g", 0, 0, 0)
    ], [
      "Sandwich simple de pollo y queso, con fruta facil de digerir.",
      "Deja el carbo fuerte para almuerzo o cena y evita repetir bases en el mismo bloque."
    ]),
    altMeal("Tortilla de papa chica con fruta", "Papa - huevo - fruta - creatina", [
      food("180g papa hervida", 4, 36, 0),
      food("2 huevos", 12, 1, 10),
      food("1 fruta", 1, 24, 0),
      food("Creatina 5g", 0, 0, 0)
    ], [
      "Tortilla chica hecha de antemano y una fruta para salir del paso.",
      "Se banca perfecto un almuerzo fuerte una hora despues."
    ])
  ];
}

function freshMainOptions() {
  return [
    altMeal("Pollo al horno con papas y ensalada", "Pollo - papas - ensalada", [
      food("220g pollo al horno", 50, 0, 12),
      food("280g papas", 6, 56, 0),
      food("Ensalada grande", 2, 10, 0),
      food("1 cdita aceite de oliva", 0, 0, 5)
    ], ["Bandeja con pollo, papas, sal, ajo, pimenton y limon."]),
    altMeal("Bife con pure de papa y tomate", "Bife - pure - tomate", [
      food("190g bife magro", 44, 0, 12),
      food("300g papa para pure", 6, 60, 0),
      food("Tomate + hojas", 2, 8, 0)
    ], ["Bife a la plancha, pure simple y tomate."]),
    altMeal("Fideos con tuco de carne magra", "Pasta - carne - tomate - queso rallado", [
      food("85g fideos secos", 11, 62, 2),
      food("140g carne magra picada", 33, 0, 8),
      food("Salsa de tomate casera", 2, 10, 0),
      food("1 cdita queso rallado", 1, 0, 2)
    ], ["Tuco simple con carne magra y pasta medida."]),
    altMeal("Milanesa de pollo al horno con pure", "Pollo - pan rallado - papa - ensalada", [
      food("200g pechuga rebozada al horno", 48, 10, 8),
      food("280g papa para pure", 6, 56, 0),
      food("Ensalada mixta", 2, 8, 0)
    ], ["Milanesa al horno, pure y ensalada. Comida de casa."]),
    altMeal("Pastel de papa con carne magra", "Carne - papa - huevo - mozzarella", [
      food("180g carne magra picada", 42, 0, 10),
      food("300g papa pisada", 6, 60, 0),
      food("1 huevo duro", 6, 1, 5),
      food("35g mozzarella", 8, 1, 7),
      food("Cebolla + morron + tomate", 2, 12, 0)
    ], ["Carne con verduras, pure arriba y horno hasta dorar."]),
    altMeal("Tarta de pollo, jamon y queso con ensalada", "Tarta - pollo - jamon - queso - ensalada", [
      food("1 porcion grande de tarta de pollo, jamon y queso", 18, 34, 14),
      food("120g pollo extra", 34, 0, 4),
      food("Ensalada grande", 2, 10, 0)
    ], ["Tarta casera y ensalada grande para completar volumen."]),
    altMeal("Atun con papa, huevo y tomate", "Atun - papa - huevo - tomate", [
      food("1 lata grande de atun", 32, 0, 2),
      food("300g papa hervida", 6, 60, 0),
      food("2 huevos duros", 12, 1, 10),
      food("Tomate + limon", 1, 6, 0)
    ], ["Atun escurrido, papa, huevo, tomate y limon."]),
    altMeal("Hamburguesas caseras con papas", "Carne - pan - papas - queso", [
      food("2 hamburguesas magras caseras", 40, 0, 14),
      food("1 pan de hamburguesa", 5, 28, 3),
      food("250g papas al horno", 5, 50, 0),
      food("1 feta de queso", 6, 1, 5),
      food("Lechuga + tomate", 1, 5, 0)
    ], ["Hamburguesas caseras, papas al horno y verdura."]),
    altMeal("Arroz con pollo y verduras", "Pollo - arroz - verduras", [
      food("200g pollo", 46, 0, 7),
      food("1 taza arroz cocido", 4, 50, 0),
      food("Verduras salteadas", 3, 14, 1),
      food("1 cdita aceite de oliva", 0, 0, 5)
    ], ["Arroz medido con pollo y verduras."]),
    altMeal("Pollo con batata y ensalada", "Pollo - batata - ensalada", [
      food("210g pollo grillado", 48, 0, 7),
      food("280g batata", 5, 56, 0),
      food("Ensalada grande", 2, 10, 0)
    ], ["Pollo simple, batata al horno y ensalada."]),
    altMeal("Carne al horno con batata y verduras", "Carne - batata - verduras", [
      food("190g carne magra al horno", 44, 0, 12),
      food("260g batata", 5, 52, 0),
      food("Zanahoria + cebolla + morron", 3, 16, 0)
    ], ["Carne al horno con verduras y batata."]),
    altMeal("Pollo al curry suave con papas", "Pollo - papa - queso untable - curry", [
      food("200g pollo", 46, 0, 7),
      food("260g papa", 5, 52, 0),
      food("2 cdas queso untable", 4, 3, 7),
      food("Verduras", 2, 10, 0)
    ], ["Curry suave con tomate y queso untable, servido con papa."]),
    altMeal("Tacos de carne con queso y ensalada", "Tortillas - carne - queso - ensalada", [
      food("2 tortillas medianas", 8, 48, 6),
      food("170g carne magra", 40, 0, 10),
      food("40g queso en fetas", 9, 1, 6),
      food("Tomate + lechuga", 2, 8, 0)
    ], ["Tacos simples con carne, queso y ensalada."]),
    altMeal("Guiso de lentejas con carne y pan", "Lentejas - carne - verduras - pan", [
      food("1.5 tazas lentejas cocidas", 27, 60, 2),
      food("120g carne magra", 28, 0, 8),
      food("Verduras para guiso", 3, 16, 0),
      food("1 rebanada pan", 4, 17, 2)
    ], ["Guiso rapido de lentejas y carne, con verduras y pan medido."]),
    altMeal("Pizza casera de pollo y mozzarella", "Prepizza - pollo - mozzarella - tomate", [
      food("1 prepizza individual", 10, 62, 6),
      food("120g pollo", 34, 0, 4),
      food("70g mozzarella", 16, 2, 14),
      food("Salsa de tomate", 2, 10, 0)
    ], ["Pizza casera con proteina real y queso medido."]),
    altMeal("Empanadas de carne al horno con ensalada", "Empanadas - carne - huevo - ensalada", [
      food("3 tapas de empanada", 9, 51, 6),
      food("150g carne magra", 35, 0, 8),
      food("1 huevo duro", 6, 1, 5),
      food("Ensalada grande", 3, 10, 0)
    ], ["Empanadas al horno y ensalada grande."]),
    altMeal("Noquis de papa con carne y tomate", "Noquis - carne - tomate - queso rallado", [
      food("250g noquis de papa", 8, 70, 2),
      food("130g carne magra", 30, 0, 8),
      food("Salsa de tomate", 2, 10, 0),
      food("1 cdita queso rallado", 1, 0, 2)
    ], ["Noquis con salsa de tomate y carne magra."]),
    altMeal("Omelette grande con papa, jamon y queso", "Huevos - papa - jamon - queso", [
      food("3 huevos", 18, 1, 15),
      food("220g papa", 5, 44, 0),
      food("60g jamon cocido", 12, 1, 4),
      food("40g queso en fetas", 9, 1, 6),
      food("Ensalada", 2, 8, 0)
    ], ["Omelette grande con papa y ensalada."]),
    altMeal("Arroz con atun, huevo y palta", "Arroz - atun - huevo - palta", [
      food("1 taza arroz cocido", 4, 50, 0),
      food("1 lata grande de atun", 32, 0, 2),
      food("2 huevos duros", 12, 1, 10),
      food("1/4 palta", 1, 3, 6),
      food("Tomate", 1, 6, 0)
    ], ["Bowl simple de arroz, atun, huevo y palta medida."]),
    altMeal("Salpicon de pollo con papa y huevo", "Pollo - papa - huevo - verduras", [
      food("190g pollo cocido", 44, 0, 6),
      food("260g papa", 5, 52, 0),
      food("2 huevos duros", 12, 1, 10),
      food("Verduras frescas", 3, 12, 0)
    ], ["Salpicon frio con pollo, papa, huevo y verduras."])
  ];
}

function freshFishOptions() {
  return [
    altMeal("Salmon con papa al horno y ensalada", "Salmon - papa - ensalada", [
      food("200g salmon", 44, 0, 22),
      food("260g papa al horno", 5, 52, 0),
      food("Ensalada grande", 2, 10, 0)
    ], ["Salmon simple con limon, papa y ensalada."]),
    altMeal("Merluza con pure, huevo y tomate", "Merluza - papa - huevo - tomate", [
      food("230g merluza", 46, 0, 4),
      food("300g papa para pure", 6, 60, 0),
      food("1 huevo duro", 6, 1, 5),
      food("Tomate", 1, 6, 0)
    ], ["Merluza al horno con limon, pure y huevo."]),
    altMeal("Atun con papa, huevo y ensalada", "Atun - papa - huevo - ensalada", [
      food("1 lata grande de atun", 32, 0, 2),
      food("280g papa hervida", 6, 56, 0),
      food("2 huevos duros", 12, 1, 10),
      food("Ensalada grande", 2, 10, 0)
    ], ["Atun, papa, huevo y ensalada."])
  ];
}

function freshFridayFishAltTemplate() {
  return altMeal("Merluza con fideos, huevo y tomate", "Merluza - fideos - huevo - tomate", [
    food("85g fideos secos", 11, 62, 2),
    food("230g merluza", 46, 0, 4),
    food("1 huevo duro", 6, 1, 5),
    food("Tomate + limon", 1, 6, 0),
    food("1 cdita aceite de oliva", 0, 0, 5)
  ], [
    "Hervi los fideos al dente.",
    "Cocina la merluza al horno o sarten con limon, sal y ajo.",
    "Servi con huevo duro, tomate y oliva. Opcion B de pescado con carbo distinto y preparacion simple."
  ]);
}

function freshNightOptions() {
  return [
    altMeal("Leche con banana chica", "Leche - banana chica", [
      food("200ml leche entera", 6, 10, 7),
      food("1 banana chica", 1, 20, 0)
    ], ["Refuerzo simple si el dia quedo corto."]),
    altMeal("Tostado chico de jamon y queso", "Pan - jamon - queso", [
      food("1 rebanada pan integral", 4, 17, 2),
      food("50g jamon cocido", 10, 1, 3),
      food("30g queso en fetas", 7, 1, 5)
    ], ["Refuerzo salado, chico y normal."]),
    altMeal("Vaso de leche y nueces", "Leche - nueces", [
      food("250ml leche entera", 8, 12, 8),
      food("15g nueces", 2, 2, 10)
    ], ["Cierre simple, con proteina y grasa medida para dormir sin hambre."])
  ];
}

function savoryNightAltTemplate() {
  return altMeal("Tostado chico de jamon y queso", "Pan - jamon - queso", [
    food("1 rebanada pan integral", 4, 17, 2),
    food("50g jamon cocido natural", 10, 1, 3),
    food("30g queso en fetas o mozzarella", 7, 1, 5)
  ], ["Refuerzo salado y simple si no queres algo dulce."]);
}

function pickFreshAlt(primary, options, seed, { main = false } = {}) {
  const primaryCarb = mealCarbGroup(primary);
  const primaryProtein = mealProteinGroup(primary);
  const tryPick = (predicate) => {
    const start = Math.abs(seed) % options.length;
    for (let i = 0; i < options.length; i++) {
      const option = options[(start + i) % options.length];
      if (predicate(option)) return option;
    }
    return null;
  };
  const strict = (option) => option.name !== primary.name
    && (!main || !mealHasRice(option))
    && (!main || primaryCarb === "otro" || mealCarbGroup(option) !== primaryCarb)
    && mealProteinGroup(option) !== primaryProtein;
  const relaxed = (option) => option.name !== primary.name
    && (!main || !mealHasRice(option))
    && (!main || primaryCarb === "otro" || mealCarbGroup(option) !== primaryCarb);
  return tryPick(strict) || tryPick(relaxed) || pickFreshTemplate(options, seed, (option) => option.name !== primary.name) || options[0];
}

function freshMeal(time, label, primary, alt) {
  return mealFromTemplate(time, label, primary, alt);
}

function freshMainTemplate(seed, usedNames = new Set(), { noRice = false, noFish = true } = {}) {
  const options = freshMainOptions().filter((item) => {
    if (usedNames.has(item.name)) return false;
    if (noRice && mealHasRice(item)) return false;
    if (noFish && mealProteinGroup(item) === "pescado") return false;
    return true;
  });
  return pickFreshTemplate(options.length ? options : freshMainOptions(), seed);
}

function pickFreshMainAltAvoiding(primary, seed, forbiddenNames = new Set(), rejectOption = () => false) {
  const options = freshMainOptions();
  const primaryCarb = mealCarbGroup(primary);
  const primaryProtein = mealProteinGroup(primary);
  const forbiddenKeys = new Set(Array.from(forbiddenNames || []).map(mealNameKey));
  const isForbidden = (option) => forbiddenKeys.has(mealNameKey(option));
  const tryPick = (predicate) => {
    const start = Math.abs(seed) % options.length;
    for (let i = 0; i < options.length; i++) {
      const option = options[(start + i) % options.length];
      if (predicate(option)) return option;
    }
    return null;
  };

  return tryPick((option) => option.name !== primary.name
    && !isForbidden(option)
    && !rejectOption(option)
    && !mealHasRice(option)
    && (primaryCarb === "otro" || mealCarbGroup(option) !== primaryCarb)
    && mealProteinGroup(option) !== primaryProtein)
    || tryPick((option) => option.name !== primary.name
      && !isForbidden(option)
      && !rejectOption(option)
      && !mealHasRice(option)
      && (primaryCarb === "otro" || mealCarbGroup(option) !== primaryCarb))
    || tryPick((option) => option.name !== primary.name
      && !rejectOption(option)
      && !mealHasRice(option)
      && (primaryCarb === "otro" || mealCarbGroup(option) !== primaryCarb)
      && mealProteinGroup(option) !== primaryProtein)
    || tryPick((option) => option.name !== primary.name
      && !rejectOption(option)
      && !mealHasRice(option)
      && (primaryCarb === "otro" || mealCarbGroup(option) !== primaryCarb))
    || tryPick((option) => option.name !== primary.name && !isForbidden(option) && !rejectOption(option) && !mealHasRice(option))
    || pickFreshAlt(primary, options, seed, { main: true });
}

function applyRonyFreshWeeklyMenuRules() {
  const seedBase = freshMenuSeed();
  allWeeks.forEach((weekDays, weekNumber) => {
    const weekSeed = seedBase + weekNumber * 101;
    const usedWeekMainNames = new Set();
    const breakfastGroupCounts = new Map();
    let lastBreakfastGroup = null;
    weekDays.forEach((day, dayNumber) => {
      const seed = weekSeed + dayNumber * 17;
      const isFriday = day.id === "vie";
      const isWeekend = day.id === "sab" || day.id === "dom";
      const isGymDay = !isWeekend;
      const usedMainNames = new Set(usedWeekMainNames);

      day.wakeTime = WAKE_TIME;
      day.trainingTime = isGymDay ? TRAINING_TIME : null;
      day.isRestDay = !isGymDay;
      if (isFriday) {
        day.isRestDay = false;
        day.type = "Dia de gym - Full body";
        day.trainingTime = TRAINING_TIME;
        day.tags = ["Full body", "Quinto dia", "Entreno 12:00", "Metabolismo rapido"];
      }
      day.tip = isGymDay
        ? "Entreno fijo 12:00: desayuno liviano 10:00, pre simple 11:15, post real 14:30 con creatina y almuerzo fuerte 16:00. Whey OneFit diario, simple y medido."
        : "Descanso activo: desayuno liviano, creatina diaria, whey diario y comida simple para sostener recuperacion sin pesadez.";
      if (isGymDay && !day.tags.includes("Entreno 12:00")) day.tags = [...day.tags, "Entreno 12:00"];
      if (!day.tags.includes("Comida real base")) day.tags = [...day.tags, "Comida real base"];

      const breakfastOptions = freshLightBreakfastOptions();
      const postOptions = freshNoonPostWorkoutOptions();
      const breadHeavyBreakfastCount = Array.from(breakfastGroupCounts.entries())
        .filter(([group]) => isBreadHeavyBreakfastGroup(group))
        .reduce((total, [, count]) => total + count, 0);
      const breakfast = pickFreshTemplate(
        breakfastOptions,
        seed,
        (item) => {
          const group = breakfastStyleGroup(item);
          if (group === lastBreakfastGroup) return false;
          if ((breakfastGroupCounts.get(group) || 0) >= 2) return false;
          if (isBreadHeavyBreakfastGroup(group) && breadHeavyBreakfastCount >= 2) return false;
          return true;
        }
      );
      const breakfastAlt = pickFreshBreakfastAlt(breakfast, breakfastOptions, seed + 1);
      lastBreakfastGroup = breakfastStyleGroup(breakfast);
      breakfastGroupCounts.set(lastBreakfastGroup, (breakfastGroupCounts.get(lastBreakfastGroup) || 0) + 1);
      const snackA = pickFreshTemplate(freshSnackOptions(), seed + 2);
      const snackB = pickFreshTemplate(freshSnackOptions(), seed + 4, (item) => item.name !== snackA.name);
      const snackBAlt = pickFreshAlt(snackB, freshSnackOptions(), seed + 5);
      const pre = pickFreshTemplate(freshPreWorkoutOptions(), seed + 6);
      const preAlt = pickFreshAlt(pre, freshPreWorkoutOptions(), seed + 7);
      const post = pickFreshTemplate(postOptions, seed + 8);
      const postAlt = pickFreshAlt(post, postOptions, seed + 9);

      let lunch;
      if (isFriday) {
        lunch = freshFishOptions()[0];
      } else {
        lunch = freshMainTemplate(seed + 10, usedMainNames, { noRice: dayNumber > 0 && dayNumber % 2 === 1 });
        if (day.id === "mie" && mealHasRice(lunch)) {
          const postCarbGroup = mealCarbGroup(post);
          lunch = pickRiceFreeMainTemplate(
            { id: `fresh-${weekNumber}-${day.id}-lunch` },
            weekNumber,
            dayNumber,
            seed + 21,
            [postCarbGroup],
            (option) => /tortilla/i.test(mealCoreSearchText(option))
          );
        }
      }
      usedMainNames.add(lunch.name);
      usedWeekMainNames.add(lunch.name);
      const lunchAlt = isFriday ? freshFridayFishAltTemplate() : pickFreshAlt(lunch, freshMainOptions(), seed + 11, { main: true });

      const dinner = freshMainTemplate(seed + 12, usedMainNames, { noRice: mealHasRice(lunch) || isFriday });
      usedMainNames.add(dinner.name);
      usedWeekMainNames.add(dinner.name);
      const dinnerAlt = pickFreshAlt(dinner, freshMainOptions(), seed + 13, { main: true });
      const night = pickFreshTemplate(freshNightOptions(), seed + 14);
      const nightAlt = pickFreshAlt(night, freshNightOptions(), seed + 15);
      const restSnack = pickFreshTemplate(freshSnackOptions(), seed + 16, (item) => item.name !== snackB.name);
      const restSnackAltForNoonSchedule = solidProteinFallbackTemplate("Huevos revueltos con tostada y fruta");

      day.meals = isGymDay
        ? [
          freshMeal(TRAINING_DAY_TIMES.breakfast, "Desayuno liviano", breakfast, breakfastAlt),
          freshMeal(TRAINING_DAY_TIMES.pre, "Pre-entreno", pre, preAlt),
          freshMeal(TRAINING_DAY_TIMES.post, "Post-entreno", post, postAlt),
          freshMeal(TRAINING_DAY_TIMES.lunch, "Almuerzo", lunch, lunchAlt),
          freshMeal(TRAINING_DAY_TIMES.snack, "Merienda", snackB, snackBAlt),
          freshMeal(TRAINING_DAY_TIMES.dinner, "Cena", dinner, dinnerAlt),
          freshMeal(TRAINING_DAY_TIMES.night, "Antes de dormir", night, nightAlt)
        ]
        : [
          freshMeal(REST_DAY_TIMES.breakfast, "Desayuno liviano", breakfast, breakfastAlt),
          freshMeal(REST_DAY_TIMES.lunch, "Almuerzo", lunch, lunchAlt),
          freshMeal(REST_DAY_TIMES.snack, "Merienda", restSnack, restSnackAltForNoonSchedule),
          freshMeal(REST_DAY_TIMES.dinner, "Cena", dinner, dinnerAlt),
          freshMeal(REST_DAY_TIMES.night, "Antes de dormir", night, nightAlt)
        ];
    });
  });
}

function cloneMealTemplate(template) {
  return {
    name: template.name,
    desc: template.desc,
    kcal: template.kcal,
    foods: template.foods.map((f) => ({ ...f })),
    prep: template.prep.slice(),
    note: template.note || null
  };
}

function applyMealTemplate(target, template) {
  const copy = cloneMealTemplate(template);
  if (target.time) target.id = slug(`${target.time}-${copy.name}`);
  target.name = copy.name;
  target.desc = copy.desc;
  target.kcal = copy.kcal;
  target.foods = copy.foods;
  target.prep = copy.prep;
  target.note = copy.note;
}

function pickBreakfastTemplate(item, day, weekNumber, dayNumber, options, offset = 0) {
  const seed = `${item.id}-${day.id}-${day.type}-${weekNumber}-${dayNumber}-${offset}`;
  return options[hashString(seed) % options.length];
}

function compactMainOptions() {
  return [
    altMeal("Pollo con arroz y ensalada", "Pollo - arroz - ensalada - oliva", [
      food("180g pollo grillado", 42, 0, 6),
      food("1 taza arroz cocido", 4, 50, 0),
      food("Ensalada grande", 2, 10, 0),
      food("1 cdita aceite de oliva", 0, 0, 5)
    ], ["Pollo simple, arroz medido y ensalada grande.", "Es la version limpia para controlar calorias sin perder proteina."]),
    altMeal("Carne magra con papa y ensalada", "Carne magra - papa - ensalada", [
      food("180g carne magra", 42, 0, 10),
      food("250g papa al horno", 5, 50, 0),
      food("Ensalada grande", 2, 10, 0),
      food("1 cdita aceite de oliva", 0, 0, 5)
    ], ["Carne magra y papa, sin sumar pan ni salsas pesadas.", "Ideal cuando el menu original venia demasiado cargado."]),
    altMeal("Atun con arroz, huevo y palta medida", "Atun - arroz - huevo - palta - tomate", [
      food("1 lata grande de atun", 32, 0, 2),
      food("1 taza arroz cocido", 4, 50, 0),
      food("1 huevo duro", 6, 1, 5),
      food("1/4 palta", 1, 3, 6),
      food("Tomate + limon", 1, 6, 0)
    ], ["Bowl rapido con atun, arroz y huevo.", "Palta medida para no disparar grasas."]),
    altMeal("Fideos con tuco de carne medido", "Pasta - carne magra - tomate - queso rallado", [
      food("80g fideos secos", 10, 58, 2),
      food("120g carne magra picada", 28, 0, 7),
      food("Salsa de tomate casera", 2, 10, 0),
      food("1 cdita queso rallado", 1, 0, 2)
    ], ["Pasta con porcion medida y carne magra.", "Sirve para dias de gym sin pasar calorias al pedo."])
  ];
}

function simpleFishOptions() {
  return [
    altMeal("Salmon con arroz y ensalada", "Salmon - arroz - ensalada - limon", [
      food("200g salmon a la plancha o al horno", 44, 0, 22),
      food("1 taza arroz cocido", 4, 50, 0),
      food("Ensalada grande", 2, 10, 0),
      food("1 cdita aceite de oliva", 0, 0, 5),
      food("Limon", 0, 1, 0)
    ], [
      "Plancha u horno con sal, limon y ajo. Nada raro.",
      "Arroz medido y ensalada grande para que sea comida completa."
    ]),
    altMeal("Salmon con papa al horno y verduras", "Salmon - papa - verduras - limon", [
      food("200g salmon al horno", 44, 0, 22),
      food("250g papa al horno", 5, 50, 0),
      food("Verduras salteadas o ensalada", 3, 12, 0),
      food("1 cdita aceite de oliva", 0, 0, 5)
    ], [
      "Salmon con papa y verduras. Simple, rico y con omega 3.",
      "Usa limon, sal, pimienta y ajo; no hace falta salsa rara."
    ]),
    altMeal("Merluza con arroz, huevo y ensalada", "Merluza - arroz - huevo - ensalada", [
      food("220g merluza al horno", 44, 0, 4),
      food("1 taza arroz cocido", 4, 50, 0),
      food("1 huevo duro", 6, 1, 5),
      food("Ensalada grande", 2, 10, 0),
      food("1 cdita aceite de oliva", 0, 0, 5)
    ], [
      "Merluza al horno con limon y ajo.",
      "Arroz y huevo para completar energia y proteina."
    ])
  ];
}

function riceFreeMainOptions() {
  return [
    altMeal("Carne magra con papa y ensalada", "Carne magra - papa - ensalada - oliva", [
      food("180g carne magra", 42, 0, 10),
      food("280g papa al horno o hervida", 6, 56, 0),
      food("Ensalada grande", 2, 10, 0),
      food("1 cdita aceite de oliva", 0, 0, 5)
    ], [
      "Carne simple con papa y ensalada grande.",
      "Es el reemplazo directo cuando el plan venia con demasiado arroz."
    ]),
    altMeal("Pollo con papas al horno y tomate", "Pollo - papas - tomate - oliva", [
      food("190g pollo grillado", 44, 0, 6),
      food("260g papas al horno", 5, 52, 0),
      food("Tomate + hojas verdes", 2, 8, 0),
      food("1 cdita aceite de oliva", 0, 0, 5)
    ], [
      "Pollo a la plancha u horno con papas.",
      "Usa limon, ajo, sal y pimienta. Normal y sostenible."
    ]),
    altMeal("Fideos con tuco de carne medido", "Pasta - carne magra - tomate - queso rallado", [
      food("85g fideos secos", 11, 62, 2),
      food("130g carne magra picada", 30, 0, 8),
      food("Salsa de tomate casera", 2, 10, 0),
      food("1 cdita queso rallado", 1, 0, 2)
    ], [
      "Fideos medidos con tuco de carne magra.",
      "Buena carga de carbo para gym sin repetir arroz."
    ]),
    altMeal("Pastel de papa con carne magra", "Carne magra - papa - huevo - mozzarella", [
      food("180g carne magra picada", 42, 0, 10),
      food("300g papa pisada", 6, 60, 0),
      food("1 huevo duro", 6, 1, 5),
      food("35g mozzarella", 8, 1, 7),
      food("Cebolla + morron + tomate", 2, 12, 0)
    ], [
      "Saltea carne con cebolla, morron y tomate.",
      "Arma con pure de papa, huevo y mozzarella. Horno hasta dorar."
    ]),
    altMeal("Atun con papa, huevo y tomate", "Atun - papa - huevo - tomate - oliva", [
      food("1 lata grande de atun al natural", 32, 0, 2),
      food("280g papa hervida", 6, 56, 0),
      food("1 huevo duro", 6, 1, 5),
      food("Tomate + limon", 1, 6, 0),
      food("1 cdita aceite de oliva", 0, 0, 5)
    ], [
      "Atun escurrido con papa y huevo duro.",
      "Opcion rapida, alta en proteina y sin arroz."
    ]),
    altMeal("Tortilla de papa, huevo y mozzarella", "Huevos - papa - mozzarella - ensalada", [
      food("3 huevos", 18, 1, 15),
      food("260g papa", 5, 52, 0),
      food("40g mozzarella", 9, 1, 8),
      food("Ensalada grande", 2, 10, 0)
    ], [
      "Cocina la papa en cubos y mezclala con huevo batido.",
      "Termina con mozzarella y ensalada al costado."
    ])
  ];
}

function mealHasRice(item) {
  const text = mealCoreSearchText(item);
  return /\barroz\b|basmati|jazmin|jasmin|arboreo|risotto|paella|chaufa|fideos de arroz|noodles de arroz/.test(text);
}

function mealCarbGroup(item) {
  const text = mealCoreSearchText(item);
  if (mealHasRice(item)) return "arroz";
  if (/\b(fideo|fideos|pasta|noodle|noodles|espagueti|tallarines)\b/.test(text)) return "pasta";
  if (/\b(papa|papas|pure|batata|pastel de papa)\b/.test(text)) return "papa";
  if (/\b(pan|tostada|tostado|tortilla|wrap|burrito|pizza)\b/.test(text)) return "pan";
  if (/\b(lenteja|lentejas|garbanzo|garbanzos|poroto|porotos)\b/.test(text)) return "legumbre";
  return "otro";
}

function isMainMeal(item) {
  const label = plainText(item?.label);
  return label.includes("almuerzo") || label.includes("cena");
}

function pickRiceFreeMainTemplate(item, weekNumber, dayNumber, offset = 0, avoidGroups = [], rejectOption = () => false) {
  const avoid = new Set(avoidGroups.filter(Boolean));
  const options = riceFreeMainOptions().filter((option) => !mealHasRice(option) && !avoid.has(mealCarbGroup(option)) && !rejectOption(option));
  const fallback = riceFreeMainOptions().filter((option) => !mealHasRice(option) && !rejectOption(option));
  const pool = options.length ? options : fallback.length ? fallback : riceFreeMainOptions().filter((option) => !mealHasRice(option));
  return pool[hashString(`${item.id}-${weekNumber}-${dayNumber}-${offset}`) % pool.length];
}

function setRiceFreeAlt(item, weekNumber, dayNumber, offset = 0) {
  const primaryGroup = mealCarbGroup(item);
  let template = pickRiceFreeMainTemplate(item, weekNumber, dayNumber, offset, [primaryGroup]);
  item.alt = cloneMealTemplate(template);

  if (mealCarbGroup(item.alt) === primaryGroup && primaryGroup !== "otro") {
    template = pickRiceFreeMainTemplate(item, weekNumber, dayNumber, offset + 3, [primaryGroup, mealCarbGroup(item.alt)]);
    item.alt = cloneMealTemplate(template);
  }
}

function collectMainMealSlots() {
  const slots = [];
  allWeeks.forEach((weekDays, weekNumber) => {
    weekDays.forEach((day, dayNumber) => {
      day.meals.forEach((mealItem, mealNumber) => {
        if (isMainMeal(mealItem)) slots.push({ weekNumber, dayNumber, mealNumber, meal: mealItem });
      });
    });
  });
  return slots;
}

function collectDaySlots() {
  const slots = [];
  allWeeks.forEach((weekDays, weekNumber) => {
    weekDays.forEach((day, dayNumber) => {
      slots.push({ weekNumber, dayNumber, day });
    });
  });
  return slots;
}

function dayHasRiceMain(day) {
  return day.meals.some((mealItem) => isMainMeal(mealItem) && mealHasRice(mealItem));
}

function replaceMainMealWithRiceFree(slot, offset = 0) {
  const template = pickRiceFreeMainTemplate(slot.meal, slot.weekNumber, slot.dayNumber, offset);
  applyMealTemplate(slot.meal, template);
  setRiceFreeAlt(slot.meal, slot.weekNumber, slot.dayNumber, offset + 1);
}

function normalizeMainAltCarbs(slot, offset = 0) {
  const mealItem = slot.meal;
  if (!mealItem.alt) return;

  const primaryGroup = mealCarbGroup(mealItem);
  const altGroup = mealCarbGroup(mealItem.alt);
  if (mealHasRice(mealItem.alt) || (primaryGroup !== "otro" && primaryGroup === altGroup)) {
    setRiceFreeAlt(mealItem, slot.weekNumber, slot.dayNumber, offset);
  }
}

function applyRiceRotationRules() {
  const slots = collectMainMealSlots();
  slots.forEach((slot, index) => {
    const previous = slots[index - 1];
    if (previous && mealHasRice(previous.meal) && mealHasRice(slot.meal)) {
      replaceMainMealWithRiceFree(slot, index + 7);
    }

    const currentDayIndex = slot.weekNumber * 7 + slot.dayNumber;
    const previousSameTurn = [...slots].slice(0, index).reverse().find((candidate) => {
      const candidateDayIndex = candidate.weekNumber * 7 + candidate.dayNumber;
      return candidate.meal.label === slot.meal.label && currentDayIndex - candidateDayIndex === 1;
    });
    if (previousSameTurn && mealHasRice(previousSameTurn.meal) && mealHasRice(slot.meal)) {
      replaceMainMealWithRiceFree(slot, index + 17);
    }

    normalizeMainAltCarbs(slot, index + 11);
  });

  collectDaySlots().forEach((daySlot, index, daySlots) => {
    const previousDay = daySlots[index - 1];
    if (!previousDay || !dayHasRiceMain(previousDay.day)) return;

    daySlot.day.meals.forEach((mealItem, mealNumber) => {
      if (!isMainMeal(mealItem) || !mealHasRice(mealItem)) return;
      replaceMainMealWithRiceFree({
        weekNumber: daySlot.weekNumber,
        dayNumber: daySlot.dayNumber,
        mealNumber,
        meal: mealItem
      }, index + mealNumber + 31);
    });
  });

  const finalSlots = collectMainMealSlots();
  finalSlots.forEach((slot, index) => normalizeMainAltCarbs(slot, index + 41));

  if (finalSlots.length > 1 && mealHasRice(finalSlots[finalSlots.length - 1].meal) && mealHasRice(finalSlots[0].meal)) {
    replaceMainMealWithRiceFree(finalSlots[0], 53);
    normalizeMainAltCarbs(finalSlots[0], 59);
  }
}

function applyFreshMainVarietyRules() {
  allWeeks.forEach((weekDays, weekNumber) => {
    const usedNames = new Set();
    weekDays.forEach((day, dayNumber) => {
      const daySupportMealText = day.meals
        .filter((candidate) => !isMainMeal(candidate))
        .map((candidate) => `${mealCoreSearchText(candidate)} ${candidate.alt ? mealCoreSearchText(candidate.alt) : ""}`)
        .join(" ");
      const repeatsSupportToken = (option) => {
        const optionText = mealCoreSearchText(option);
        return (/tortilla/.test(optionText) && /tortilla/.test(daySupportMealText))
          || (/atun/.test(optionText) && /atun/.test(daySupportMealText))
          || (/arroz/.test(optionText) && /arroz/.test(daySupportMealText));
      };
      const usedVisibleNames = new Set();
      day.meals.forEach((candidate) => {
        usedVisibleNames.add(mealNameKey(candidate));
        if (!isMainMeal(candidate) && candidate.alt) usedVisibleNames.add(mealNameKey(candidate.alt));
      });

      day.meals.forEach((mealItem, mealNumber) => {
        if (!isMainMeal(mealItem)) return;

        const isFridayFish = day.id === "vie" && mealItem.label === "Almuerzo" && mealProteinGroup(mealItem) === "pescado";
        const shouldReplace = usedNames.has(mealItem.name)
          || (!isFridayFish && mealProteinGroup(mealItem) === "pescado")
          || (!isFridayFish && repeatsSupportToken(mealItem));

        if (shouldReplace) {
          usedVisibleNames.delete(mealNameKey(mealItem));
          const seed = freshMenuSeed() + weekNumber * 131 + dayNumber * 17 + mealNumber;
          const template = pickFreshTemplate(freshMainOptions(), seed, (option) => {
            if (usedNames.has(option.name)) return false;
            if (mealHasRice(option)) return false;
            if (mealProteinGroup(option) === "pescado") return false;
            if (repeatsSupportToken(option)) return false;
            return true;
          });
          applyMealTemplate(mealItem, template);
          usedVisibleNames.add(mealNameKey(mealItem));
        }

        const forbiddenAltNames = new Set(usedVisibleNames);
        forbiddenAltNames.delete(mealNameKey(mealItem));
        mealItem.alt = isFridayFish && /salmon/i.test(mealCoreSearchText(mealItem))
          ? cloneMealTemplate(freshFridayFishAltTemplate())
          : cloneMealTemplate(pickFreshMainAltAvoiding(mealItem, freshMenuSeed() + weekNumber * 149 + dayNumber * 19 + mealNumber, forbiddenAltNames, repeatsSupportToken));
        usedVisibleNames.add(mealNameKey(mealItem.alt));
        usedNames.add(mealItem.name);
      });
    });
  });
}

function freshOptionsForMealLabel(label) {
  const text = plainText(label);
  if (text.includes("desayuno")) return freshLightBreakfastOptions();
  if (text.includes("pre-entreno")) return freshPreWorkoutOptions();
  if (text.includes("post-entreno")) return freshNoonPostWorkoutOptions();
  if (text.includes("merienda") || text.includes("media manana")) return freshSnackOptions();
  if (text.includes("antes de dormir")) return freshNightOptions();
  return freshSnackOptions();
}

function pickAltAvoidingVisibleNames(primary, options, seed, forbiddenNames = new Set()) {
  const forbiddenKeys = new Set(Array.from(forbiddenNames || []).map(mealNameKey));
  const primaryKey = mealNameKey(primary);
  const primaryCarb = mealCarbGroup(primary);
  const primaryProtein = mealProteinGroup(primary);
  const tryPick = (predicate) => {
    const start = Math.abs(seed) % options.length;
    for (let i = 0; i < options.length; i++) {
      const option = options[(start + i) % options.length];
      if (predicate(option)) return option;
    }
    return null;
  };
  return tryPick((option) => mealNameKey(option) !== primaryKey
    && !forbiddenKeys.has(mealNameKey(option))
    && (primaryCarb === "otro" || mealCarbGroup(option) !== primaryCarb)
    && mealProteinGroup(option) !== primaryProtein)
    || tryPick((option) => mealNameKey(option) !== primaryKey && !forbiddenKeys.has(mealNameKey(option)))
    || pickFreshAlt(primary, options, seed);
}

function applyVisibleDayAltVarietyRules() {
  allWeeks.forEach((weekDays, weekNumber) => {
    weekDays.forEach((day, dayNumber) => {
      const usedVisibleNames = new Set();
      const dayPrimaryNames = new Set(day.meals.map(mealNameKey));
      day.meals.forEach((mealItem, mealNumber) => {
        if (usedVisibleNames.has(mealNameKey(mealItem)) && !isMainMeal(mealItem)) {
          const previousPrimaryKey = mealNameKey(mealItem);
          const seed = freshMenuSeed() + weekNumber * 191 + dayNumber * 29 + mealNumber;
          const options = freshOptionsForMealLabel(mealItem.label);
          const replacement = pickFreshTemplate(options, seed, (option) => !usedVisibleNames.has(mealNameKey(option)));
          applyMealTemplate(mealItem, replacement);
          dayPrimaryNames.delete(previousPrimaryKey);
          dayPrimaryNames.add(mealNameKey(mealItem));
        }
        usedVisibleNames.add(mealNameKey(mealItem));
        if (!mealItem.alt) return;

        const forbiddenForAlt = new Set([...usedVisibleNames, ...dayPrimaryNames]);
        forbiddenForAlt.delete(mealNameKey(mealItem));
        if (forbiddenForAlt.has(mealNameKey(mealItem.alt))) {
          const seed = freshMenuSeed() + weekNumber * 181 + dayNumber * 23 + mealNumber;
          const replacement = isMainMeal(mealItem)
            ? pickFreshMainAltAvoiding(mealItem, seed, forbiddenForAlt)
            : pickAltAvoidingVisibleNames(mealItem, freshOptionsForMealLabel(mealItem.label), seed, forbiddenForAlt);
          mealItem.alt = cloneMealTemplate(replacement);
        }
        usedVisibleNames.add(mealNameKey(mealItem.alt));
      });
    });
  });
}

function applyCrossWeekTurnVarietyRules() {
  const seenByTurn = new Map();
  allWeeks.forEach((weekDays, weekNumber) => {
    weekDays.forEach((day, dayNumber) => {
      const supportText = day.meals
        .filter((candidate) => !isMainMeal(candidate))
        .map((candidate) => `${mealCoreSearchText(candidate)} ${candidate.alt ? mealCoreSearchText(candidate.alt) : ""}`)
        .join(" ");
      const repeatsSupportToken = (option) => {
        const optionText = mealCoreSearchText(option);
        return (/tortilla/.test(optionText) && /tortilla/.test(supportText))
          || (/atun/.test(optionText) && /atun/.test(supportText))
          || (/arroz/.test(optionText) && /arroz/.test(supportText));
      };

      day.meals.forEach((mealItem, mealNumber) => {
        if (!isMainMeal(mealItem)) return;
        const isFridayFish = day.id === "vie" && mealItem.label === "Almuerzo" && mealProteinGroup(mealItem) === "pescado";
        if (isFridayFish) return;

        const turnKey = `${dayNumber}:${plainText(mealItem.label)}`;
        const seenNames = seenByTurn.get(turnKey) || new Set();
        if (seenNames.has(mealNameKey(mealItem))) {
          const seed = freshMenuSeed() + weekNumber * 211 + dayNumber * 31 + mealNumber;
          const currentWeekUsedNames = new Set();
          weekDays.forEach((candidateDay) => {
            candidateDay.meals.forEach((candidateMeal) => {
              if (candidateMeal !== mealItem && isMainMeal(candidateMeal)) {
                currentWeekUsedNames.add(mealNameKey(candidateMeal));
              }
            });
          });
          const template = pickFreshTemplate(freshMainOptions(), seed, (option) => {
            if (seenNames.has(mealNameKey(option))) return false;
            if (currentWeekUsedNames.has(mealNameKey(option))) return false;
            if (mealHasRice(option)) return false;
            if (mealProteinGroup(option) === "pescado") return false;
            if (repeatsSupportToken(option)) return false;
            return true;
          });
          applyMealTemplate(mealItem, template);
          mealItem.alt = cloneMealTemplate(pickFreshMainAltAvoiding(mealItem, seed + 7, seenNames, repeatsSupportToken));
        }
        seenNames.add(mealNameKey(mealItem));
        seenByTurn.set(turnKey, seenNames);
      });
    });
  });
}

function mealFromTemplate(time, label, template, altTemplate) {
  const item = meal(time, label, template.name, template.desc, 0, template.foods.map((f) => ({ ...f })), template.prep.slice(), template.note || null);
  item.alt = cloneMealTemplate(altTemplate);
  item.alt.time = time;
  item.alt.label = label;
  return item;
}

function calculateDayTotals(day) {
  return day.meals.reduce((acc, m) => {
    acc.kcal += m.kcal;
    m.foods.forEach((f) => {
      acc.p += f.p;
      acc.c += f.c;
      acc.g += f.g;
    });
    return acc;
  }, { kcal: 0, p: 0, c: 0, g: 0 });
}

function hasCreatine(mealItem) {
  const text = `${mealItem.name} ${mealItem.desc} ${mealItem.foods.map((f) => f.name).join(" ")} ${mealItem.prep.join(" ")}`;
  return /creatina/i.test(text);
}

function hasWhey(mealItem) {
  const text = `${mealItem.name} ${mealItem.desc} ${mealItem.foods.map((f) => f.name).join(" ")} ${mealItem.prep.join(" ")}`;
  return /\bwhey\b/i.test(text);
}

function getProteinSafetyFloor(day) {
  const target = Number(day?.protein) || 0;
  if (target >= 200) return 185;
  if (target >= 185) return 175;
  if (target >= 170) return 165;
  return day?.isRestDay ? 155 : 165;
}

function dayNeedsWheyTopUp(day) {
  if (!day || !Array.isArray(day.meals)) return false;
  return calculateDayTotals(day).p < getProteinSafetyFloor(day);
}

function addCreatineToMeal(mealItem) {
  if (hasCreatine(mealItem)) return;
  mealItem.foods.push(food("Creatina 5g", 0, 0, 0));
  if (!/creatina/i.test(mealItem.name)) mealItem.name = `${mealItem.name} + creatina`;
  if (!/creatina/i.test(mealItem.desc)) mealItem.desc = `${mealItem.desc} - creatina 5g`;
  mealItem.prep.push("Sumale 5g de creatina. Todos los dias, entrenes o descanses.");
}

function addWheyToMeal(mealItem) {
  if (hasWhey(mealItem)) return;
  mealItem.foods.push(wheyFood("1 scoop whey OneFit con agua"));
  if (!/\bwhey\b/i.test(mealItem.name)) mealItem.name = `${mealItem.name} + whey`;
  if (!/\bwhey\b/i.test(mealItem.desc)) mealItem.desc = `${mealItem.desc} - whey diario`;
  mealItem.prep.push("Toma 1 scoop de whey OneFit con 250-300 ml de agua. Es fijo diario; la comida real sigue siendo la base.");
}

function ensureDailySupplementRules() {
  allWeeks.forEach((weekDays) => {
    weekDays.forEach((day) => {
      const supplementSlot = day.meals.find((m) => /post-entreno/i.test(m.label))
        || day.meals.find((m) => /merienda/i.test(m.label))
        || day.meals.find((m) => /dormir/i.test(m.label))
        || day.meals.find((m) => /desayuno/i.test(m.label))
        || day.meals[0];
      if (!supplementSlot) return;

      if (!day.meals.some(hasCreatine)) addCreatineToMeal(supplementSlot);
      const wheySlot = day.meals.find(hasWhey) || supplementSlot;
      if (!day.meals.some(hasWhey)) addWheyToMeal(wheySlot);
      if (wheySlot.alt && !hasWhey(wheySlot.alt)) addWheyToMeal(wheySlot.alt);
    });
  });
}

function applyProfessionalMenuRules() {
  const breakfastOptions = commonBreakfastOptions();
  const mainOptions = commonMainAltOptions();
  const snackOptions = commonSnackAltOptions();
  allWeeks.forEach((weekDays, weekNumber) => {
    weekDays.forEach((day, dayNumber) => {
      day.meals.forEach((m) => {
        if (m.label === "Desayuno") {
          const template = pickBreakfastTemplate(m, day, weekNumber, dayNumber, breakfastOptions);
          const altTemplate = pickBreakfastTemplate(m, day, weekNumber, dayNumber, breakfastOptions, 5);
          applyMealTemplate(m, template);
          m.alt = cloneMealTemplate(altTemplate.name === template.name
            ? breakfastOptions[(breakfastOptions.indexOf(template) + 1) % breakfastOptions.length]
            : altTemplate);
        }
        if (m.label === "Almuerzo" || m.label === "Cena") {
          m.alt = cloneMealTemplate(pickAlt(m, mainOptions));
        }
        if (m.label === "Merienda" || m.label === "Media mañana") {
          const template = pickBreakfastTemplate(m, day, weekNumber, dayNumber, snackOptions, 2);
          const altTemplate = pickBreakfastTemplate(m, day, weekNumber, dayNumber, snackOptions, 3);
          applyMealTemplate(m, template);
          m.alt = cloneMealTemplate(altTemplate.name === template.name
            ? snackOptions[(snackOptions.indexOf(template) + 1) % snackOptions.length]
            : altTemplate);
        }
      });
    });
  });
}

function applyWholeFoodPriorityRules() {
  const compactMains = compactMainOptions();
  allWeeks.forEach((weekDays, weekNumber) => {
    weekDays.forEach((day, dayNumber) => {
      day.meals.forEach((m) => {
        const fishMeal = /salm[oó]n|trucha|merluza|pescado/i.test(m.name);
        if ((m.label === "Almuerzo" || m.label === "Cena") && !fishMeal && (m.kcal > 700 || (day.isRestDay && m.kcal > 650))) {
          const template = pickBreakfastTemplate(m, day, weekNumber, dayNumber, compactMains, 4);
          applyMealTemplate(m, template);
          m.alt = cloneMealTemplate(compactMains[(compactMains.indexOf(template) + 1) % compactMains.length]);
        }

        if (m.label === "Antes de dormir") {
          applyMealTemplate(m, altMeal("Leche con banana chica", "Leche - banana chica", [
            food("200ml leche entera", 6, 10, 7),
            food("1 banana chica", 1, 20, 0)
          ], [
            "Cierre liviano con calorias reales, sin meter una comida grande.",
            "Si ya estas lleno, toma solo la leche y deja la banana para otro momento."
          ]));
          m.alt = savoryNightAltTemplate();
        }
      });
    });
  });
}

function wholeFoodPostWorkoutOptions() {
  return [
    solidPostWorkoutTemplate(),
    altMeal("Pollo con arroz y tomate", "Pollo - arroz - tomate - oliva - creatina", [
      food("180g pollo grillado", 42, 0, 6),
      food("3/4 taza arroz cocido", 3, 38, 0),
      food("Tomate + limon", 1, 6, 0),
      food("1 cdita aceite de oliva", 0, 0, 5),
      food("Creatina 5g", 0, 0, 0)
    ], [
      "Plato simple: pollo + arroz y tomate. Nada raro.",
      "Sumale 5g de creatina (todos los dias)."
    ]),
    altMeal("Carne magra con papa y ensalada", "Carne magra - papa - ensalada - oliva - creatina", [
      food("160g carne magra", 37, 0, 9),
      food("180g papa", 4, 36, 0),
      food("Ensalada (tomate + hojas)", 1, 6, 0),
      food("1 cdita aceite de oliva", 0, 0, 5),
      food("Creatina 5g", 0, 0, 0)
    ], [
      "Carne magra + papa: recuperas fuerza sin inventar.",
      "Creatina 5g todos los dias (no importa el horario)."
    ])
  ];
}

function applyPostWorkoutWholeFoodRules() {
  const options = wholeFoodPostWorkoutOptions();
  allWeeks.forEach((weekDays, weekNumber) => {
    weekDays.forEach((day, dayNumber) => {
      day.meals.forEach((m) => {
        if (!/post-entreno/i.test(m.label)) return;
        const template = pickBreakfastTemplate(m, day, weekNumber, dayNumber, options, 9);
        applyMealTemplate(m, template);
        m.alt = wheyWithBananaAndCreatineTemplate("Whey + banana + creatina");
      });
    });
  });
}

function applyFiveDayTrainingRules() {
  allWeeks.forEach((weekDays) => {
    const friday = weekDays.find((day) => day.id === "vie");
    if (!friday) return;

    friday.type = "Dia de gym - Full body";
    friday.workout.name = "Full Body";
    friday.workout.duration = "50 min";
    friday.workout.icon = "⚡";
    friday.workout.primary = ["Full body"];
    delete friday.workout.optional;
    friday.tags = ["Full body", "Quinto dia", "Metabolismo rapido"];
    friday.tip = "Viernes cuenta como quinto entrenamiento. Full body controlado, sin matarte: empuje, tiron, piernas liviano y abdomen. Si excepcionalmente descansas, usa el selector y baja un poco carbo.";

  if (!friday.meals.some((m) => m.label === "Post-entreno")) {
      const postSlot = friday.meals.find((m) => m.label === "Merienda") || friday.meals.find((m) => m.label === "Media mañana");
      if (postSlot) {
        postSlot.label = "Post-entreno";
        postSlot.time = postSlot.time < "15:00" ? "17:00" : postSlot.time;
        applyMealTemplate(postSlot, solidPostWorkoutTemplate());
        postSlot.alt = wheyWithBananaAndCreatineTemplate("Whey + banana + creatina");
      }
    }
  });
}

function getPlainReplacement(item, weekNumber, dayNumber, offset = 0) {
  const label = plainText(item.label);
  const itemText = mealSearchText(item);

  if (label.includes("desayuno")) {
    const options = commonBreakfastOptions();
    return options[(weekNumber + dayNumber + offset) % options.length];
  }

  if (label.includes("pre")) {
    const options = [
      altMeal("Banana, miel y tostada", "Banana - miel - tostada", [
        food("1 banana", 1, 27, 0),
        food("1 tostada integral", 4, 14, 1),
        food("1 cdita miel", 0, 8, 0)
      ], ["Comelo 30-60 minutos antes de entrenar.", "Carbo simple, liviano y efectivo."]),
      altMeal("Banana con leche y tostada", "Banana - leche - tostada", [
        food("1 banana", 1, 27, 0),
        food("200ml leche entera", 6, 10, 7),
        food("1 tostada integral", 4, 14, 1)
      ], ["Opcion simple si queres algo mas completo antes del gym."])
    ];
    return options[(weekNumber + dayNumber + offset) % options.length];
  }

  if (label.includes("post")) return solidPostWorkoutTemplate();

  if (label.includes("media") || label.includes("merienda")) {
    const options = nonWheySnackOptions();
    return options[(weekNumber + dayNumber + offset) % options.length];
  }

  if (label.includes("almuerzo") || label.includes("cena")) {
    const fishMeal = /salmon|trucha|merluza|pescado/.test(itemText);
    const options = fishMeal ? simpleFishOptions() : compactMainOptions();
    return options[(weekNumber + dayNumber + offset) % options.length];
  }

  return metabolismBoosterTemplate();
}

function applyPlainMenuRules() {
  allWeeks.forEach((weekDays, weekNumber) => {
    weekDays.forEach((day, dayNumber) => {
      day.meals.forEach((m, mealNumber) => {
        if (isTooSpecialForRony(m)) {
          const replacement = getPlainReplacement(m, weekNumber, dayNumber, mealNumber);
          applyMealTemplate(m, replacement);
          const altReplacement = getPlainReplacement(m, weekNumber, dayNumber, mealNumber + 1);
          m.alt = cloneMealTemplate(altReplacement);
        }

        if (m.alt && isTooSpecialForRony(m.alt)) {
          m.alt = cloneMealTemplate(getPlainReplacement(m, weekNumber, dayNumber, mealNumber + 2));
        }
      });
    });
  });
}

function applyMinimumEnergyFloorRules() {
  allWeeks.forEach((weekDays) => {
    weekDays.forEach((day) => {
      const floor = day.isRestDay ? 2450 : 2650;
      if (calculateDayTotals(day).kcal >= floor) return;

      const night = day.meals.find((m) => /dormir/i.test(m.label));
      if (night) {
        applyMealTemplate(night, energyFloorTemplate());
        night.alt = altMeal("Tostado chico de jamon y queso", "Pan - jamon - queso", [
          food("1 rebanada pan integral", 4, 17, 2),
          food("50g jamon cocido natural", 10, 1, 3),
          food("30g queso en fetas o mozzarella", 7, 1, 5)
        ], ["Refuerzo salado y simple si no queres leche y banana."]);
      } else {
        const insertAt = night ? day.meals.indexOf(night) : day.meals.length;
        day.meals.splice(insertAt, 0, mealFromTemplate(
          "23:00",
          "Refuerzo",
          energyFloorTemplate(),
          altMeal("Tostado chico de jamon y queso", "Pan - jamon - queso", [
            food("1 rebanada pan integral", 4, 17, 2),
            food("50g jamon cocido natural", 10, 1, 3),
            food("30g queso en fetas o mozzarella", 7, 1, 5)
          ], ["Refuerzo salado y simple si no queres leche y banana."])
        ));
      }
    });
  });
}

function lightPreWorkoutTemplate() {
  return altMeal("Banana pre-entreno simple", "Banana - miel - agua", [
    food("1 banana", 1, 27, 0),
    food("1 cdita miel", 0, 8, 0)
  ], [
    "Comelo 30-45 minutos antes de entrenar.",
    "Es suficiente cuando el resto del dia ya viene alto en calorias."
  ]);
}

function trimHighCalorieDaysAfterSupplements() {
  const lighterSnacks = lightSnackOptions();
  allWeeks.forEach((weekDays, weekNumber) => {
    weekDays.forEach((day, dayNumber) => {
      const target = day.isRestDay ? 2600 : 2850;
      const minComfort = day.isRestDay ? 2450 : 2650;
      const maxComfort = target + (day.isRestDay ? 160 : 180);
      const savoryNightAlt = altMeal("Tostado chico de jamon y queso", "Pan - jamon - queso", [
        food("1 rebanada pan integral", 4, 17, 2),
        food("50g jamon cocido natural", 10, 1, 3),
        food("30g queso en fetas o mozzarella", 7, 1, 5)
      ], ["Refuerzo salado y simple si no queres algo dulce."]);
      const night = day.meals.find((m) => /dormir/i.test(m.label));
      if (night) {
        const primaryNightText = `${night.name} ${night.desc} ${(night.foods || []).map((f) => f.name).join(" ")} ${(night.prep || []).join(" ")}`;
        if (/whey/i.test(primaryNightText)) {
          if (calculateDayTotals(day).kcal < minComfort) {
            applyMealTemplate(night, metabolismBoosterTemplate(day.isRestDay ? "Refuerzo de leche, banana y nueces" : "Refuerzo post-dia de gym"));
            night.alt = savoryNightAlt;
          } else {
            const nightOptions = freshNightOptions();
            applyMealTemplate(night, nightOptions[(weekNumber + dayNumber) % nightOptions.length]);
            night.alt = cloneMealTemplate(nightOptions[(weekNumber + dayNumber + 1) % nightOptions.length]);
          }
        }
      }

      if (calculateDayTotals(day).kcal <= maxComfort + 25) return;

      const preWorkout = day.meals.find((m) => /pre-entreno/i.test(m.label) && m.kcal > 180);
      if (preWorkout) {
        applyMealTemplate(preWorkout, lightPreWorkoutTemplate());
        preWorkout.alt = altMeal("Banana y tostada pre-entreno", "Banana - tostada - agua", [
          food("1 banana", 1, 27, 0),
          food("1 tostada integral", 4, 17, 2)
        ], [
          "Opcion simple si queres algo con un poco mas de mordida.",
          "Mantiene energia sin subir demasiado el total del dia."
        ]);
      }

      if (calculateDayTotals(day).kcal <= maxComfort + 25) return;

      const heavyNight = day.meals.find((m) => /dormir/i.test(m.label) && m.kcal > 0);
      if (heavyNight) {
        applyMealTemplate(heavyNight, freshNightOptions()[0]);
        heavyNight.alt = cloneMealTemplate(freshNightOptions()[2]);
      }

      if (calculateDayTotals(day).kcal <= maxComfort + 25) return;

      const heavySupplementSnack = [...day.meals].reverse().find((m) => {
        if (!/(media|merienda)/i.test(m.label)) return false;
        if (!/whey|creatina/i.test(mealSearchText(m))) return false;
        return m.kcal > 320;
      });
      if (heavySupplementSnack) {
        applyMealTemplate(heavySupplementSnack, wheyWithBananaAndCreatineTemplate("Whey + banana + creatina"));
        heavySupplementSnack.alt = altMeal("Whey + tostada + creatina", "Whey - tostada - miel - creatina", [
          wheyFood("1 scoop whey OneFit con agua"),
          food("1 tostada integral", 4, 17, 2),
          food("1 cdita miel", 0, 8, 0),
          food("Creatina 5g", 0, 0, 0)
        ], [
          "Toma el whey con agua y creatina.",
          "Come la tostada con miel aparte si queres algo con mordida."
        ]);
      }

      if (calculateDayTotals(day).kcal <= maxComfort + 25) return;

      const flexibleSnack = [...day.meals].reverse().find((m) => {
        if (!/(media|merienda)/i.test(m.label)) return false;
        if (/whey|creatina/i.test(mealSearchText(m))) return false;
        return m.kcal > 260;
      });
      if (flexibleSnack) {
        const template = lighterSnacks[(weekNumber + dayNumber) % lighterSnacks.length];
        applyMealTemplate(flexibleSnack, template);
        flexibleSnack.alt = cloneMealTemplate(lighterSnacks[(weekNumber + dayNumber + 1) % lighterSnacks.length]);
      }
    });
  });
}

function applyCalorieBalanceRules() {
  const lighterSnacks = lightSnackOptions();
  const fullSnacks = commonSnackAltOptions();
  const compactMains = compactMainOptions();

  allWeeks.forEach((weekDays, weekNumber) => {
    weekDays.forEach((day, dayNumber) => {
      const target = day.isRestDay ? 2600 : 2850;
      const maxComfort = target + (day.isRestDay ? 160 : 180);
      const minComfort = day.isRestDay ? 2450 : 2650;

      if (day.isRestDay && calculateDayTotals(day).kcal < minComfort) {
        const hasMidMorning = day.meals.some((m) => /media/i.test(m.label));
        if (!hasMidMorning) {
          const template = fullSnacks[(weekNumber + dayNumber + 3) % fullSnacks.length];
          const altTemplate = fullSnacks[(weekNumber + dayNumber + 4) % fullSnacks.length];
          const breakfastIndex = day.meals.findIndex((m) => m.label === "Desayuno");
          day.meals.splice(Math.max(1, breakfastIndex + 1), 0, mealFromTemplate("12:30", "Media mañana", template, altTemplate));
        }
      }

      if (day.isRestDay && calculateDayTotals(day).kcal < minComfort) {
        const night = day.meals.find((m) => /dormir/i.test(m.label));
        if (night) {
          applyMealTemplate(night, metabolismBoosterTemplate("Refuerzo de leche, banana y nueces"));
          night.alt = altMeal("Tostado chico de jamon y queso", "Pan - jamon - queso", [
            food("1 rebanada pan integral", 4, 17, 2),
            food("50g jamon cocido natural", 10, 1, 3),
            food("30g queso en fetas o mozzarella", 7, 1, 5)
          ], ["Refuerzo salado y simple si no queres algo dulce."]);
        }
      }

      if (!day.isRestDay && calculateDayTotals(day).kcal < minComfort) {
        const night = day.meals.find((m) => /dormir/i.test(m.label));
        if (night) {
          applyMealTemplate(night, metabolismBoosterTemplate("Refuerzo post-dia de gym"));
          night.alt = altMeal("Tostado chico de jamon y queso", "Pan - jamon - queso", [
            food("1 rebanada pan integral", 4, 17, 2),
            food("50g jamon cocido natural", 10, 1, 3),
            food("30g queso en fetas o mozzarella", 7, 1, 5)
          ], ["Refuerzo salado y simple si no queres algo dulce."]);
        }
      }

      if (calculateDayTotals(day).kcal <= maxComfort) return;

      const flexibleSnack = [...day.meals].reverse().find((m) => /(merienda|media)/i.test(m.label) && m.kcal > 300);
      if (flexibleSnack) {
        const template = lighterSnacks[(weekNumber + dayNumber) % lighterSnacks.length];
        applyMealTemplate(flexibleSnack, template);
        flexibleSnack.alt = cloneMealTemplate(lighterSnacks[(weekNumber + dayNumber + 1) % lighterSnacks.length]);
      }

      if (calculateDayTotals(day).kcal <= maxComfort) return;

      const mainMeal = [...day.meals].reverse().find((m) => {
        const fishMeal = /salm[oó]n|trucha|merluza|pescado/i.test(m.name);
        return /(almuerzo|cena)/i.test(m.label) && !fishMeal && m.kcal > 580;
      });
      if (mainMeal) {
        const template = compactMains[(weekNumber + dayNumber) % compactMains.length];
        applyMealTemplate(mainMeal, template);
        mainMeal.alt = cloneMealTemplate(compactMains[(weekNumber + dayNumber + 1) % compactMains.length]);
      }
    });
  });
}

function applyFinalPlanGuardRules() {
  allWeeks.forEach((weekDays) => {
    weekDays.forEach((day) => {
      const floor = day.isRestDay ? 2450 : 2650;
      const fixNightAlt = () => {
        const nightMeal = day.meals.find((m) => /dormir/i.test(m.label));
        if (!nightMeal) return;
        const usedNames = new Set();
        day.meals.forEach((mealItem) => {
          if (mealItem === nightMeal) return;
          usedNames.add(mealNameKey(mealItem));
          if (mealItem.alt) usedNames.add(mealNameKey(mealItem.alt));
        });
        const nightAltOk = nightMeal.alt
          && mealNameKey(nightMeal.alt) !== mealNameKey(nightMeal)
          && !usedNames.has(mealNameKey(nightMeal.alt));
        if (nightAltOk) return;
        const options = [savoryNightAltTemplate(), ...freshNightOptions(), metabolismBoosterTemplate("Refuerzo nocturno completo")];
        nightMeal.alt = cloneMealTemplate(options.find((option) => {
          const key = mealNameKey(option);
          return key !== mealNameKey(nightMeal) && !usedNames.has(key);
        }) || metabolismBoosterTemplate("Refuerzo nocturno completo"));
      };

      fixNightAlt();
      if (calculateDayTotals(day).kcal >= floor) return;

      const night = day.meals.find((m) => /dormir/i.test(m.label));
      if (night) {
        applyMealTemplate(night, metabolismBoosterTemplate(day.isRestDay ? "Refuerzo de leche, banana y nueces" : "Refuerzo post-dia de gym"));
        night.alt = savoryNightAltTemplate();
      } else {
        day.meals.push(mealFromTemplate(
          "23:30",
          "Antes de dormir",
          metabolismBoosterTemplate(day.isRestDay ? "Refuerzo de leche, banana y nueces" : "Refuerzo post-dia de gym"),
          savoryNightAltTemplate()
        ));
      }
      fixNightAlt();
    });
  });
}

function buildFallbackAlt(item) {
  const label = item.label.toLowerCase();
  const mainOptions = [
    altMeal("Bowl de atun, arroz, palta y tomate", "Atun - arroz - palta - tomate - oliva - limon", [
      food("1 lata grande de atun al natural", 32, 0, 2),
      food("1 taza arroz cocido", 4, 45, 1),
      food("1/2 palta", 2, 6, 12),
      food("Tomate + rucula + limon", 2, 9, 0),
      food("1 cda aceite de oliva", 0, 0, 10)
    ], ["Mezcla arroz con atun escurrido, tomate, rucula y limon.", "Suma palta y oliva al final para meter grasas buenas sin complicarte."]),
    altMeal("Tortilla de papa, huevo y espinaca", "Huevos - papa - espinaca - queso fresco - ensalada", [
      food("3 huevos", 18, 1, 15),
      food("250g papa", 5, 50, 0),
      food("80g espinaca", 3, 3, 0),
      food("50g queso fresco", 9, 2, 7),
      food("Ensalada + oliva", 2, 8, 10)
    ], ["Hervi o saltea la papa en cubos chicos.", "Suma huevos batidos, espinaca y queso; cocina tapado hasta que firme."]),
    altMeal("Pollo, batata y brocoli al plato", "Pollo - batata - brocoli - oliva - limon", [
      food("180g pechuga o muslo sin piel", 42, 0, 7),
      food("250g batata", 4, 50, 0),
      food("150g brocoli", 5, 10, 1),
      food("1 cda aceite de oliva", 0, 0, 10)
    ], ["Hornea batata en cubos con sal y pimenton.", "Grilla el pollo y servi con brocoli al vapor, limon y oliva."]),
    altMeal("Lentejas rapidas con carne magra", "Lentejas - carne - arroz - zanahoria - tomate", [
      food("1 taza lentejas cocidas", 18, 40, 1),
      food("120g carne magra", 28, 0, 8),
      food("1/2 taza arroz cocido", 2, 22, 0),
      food("Zanahoria + tomate + cebolla", 3, 16, 0)
    ], ["Saltea cebolla, tomate y zanahoria.", "Suma carne, lentejas y arroz; calenta todo junto con pimenton."])
  ];

  if (label.includes("desayuno")) {
    return cloneMealTemplate(pickAlt(item, commonBreakfastOptions()));
  }

  if (label.includes("media")) {
    return pickAlt(item, [
      altMeal("Sandwich de atun, queso y tomate", "Pan integral - atun - queso - tomate - fruta", [
        food("2 rebanadas pan integral", 7, 34, 3),
        food("1 lata de atun al natural", 24, 0, 1),
        food("40g queso fresco", 7, 1, 5),
        food("Tomate y hojas verdes", 1, 5, 0),
        food("1 fruta", 1, 24, 0)
      ], ["Arma el sandwich con atun escurrido, queso y tomate.", "Acompana con fruta para completar carbohidratos sin cocinar."]),
      altMeal("Hummus, huevo y tostadas", "Hummus - huevo duro - tostadas - pepino - fruta", [
        food("4 cdas hummus", 8, 18, 10),
        food("2 huevos duros", 12, 1, 10),
        food("2 tostadas", 6, 30, 2),
        food("Pepino y tomate", 1, 6, 0),
        food("1 fruta", 1, 24, 0)
      ], ["Unta hummus en las tostadas.", "Suma huevo duro, pepino, tomate y fruta."]),
      altMeal("queso untable con banana y nueces", "queso untable - banana - nueces - miel - tostadas", [
        food("180g queso untable", 22, 6, 8),
        food("1 banana", 1, 27, 0),
        food("20g nueces", 3, 3, 13),
        food("1 cdita miel", 0, 8, 0),
        food("1 tostada", 3, 15, 1)
      ], ["Mezcla queso untable con miel.", "Suma banana, nueces y una tostada si queres mas energia."])
    ]);
  }

  if (label.includes("pre")) {
    return pickAlt(item, [
      altMeal("Banana, miel y tostada", "Banana - miel - tostada - pasas", [
        food("1 banana", 1, 27, 0),
        food("1 tostada con miel", 3, 28, 1),
        food("20g pasas de uva", 1, 16, 0)
      ], ["Comelo 30-60 minutos antes de entrenar.", "Bajo en grasa para que caiga liviano."]),
      altMeal("Banana con leche y miel", "Banana - leche - miel - pasas", [
        food("1 banana grande", 1, 31, 0),
        food("200ml leche entera", 6, 10, 7),
        food("20g pasas de uva", 1, 16, 0),
        food("1 cdita miel", 0, 8, 0)
      ], ["Ideal si necesitas carbo rapido pero no queres entrenar pesado de estomago.", "Comelo 45 minutos antes."])
    ]);
  }

  if (label.includes("post")) {
    return pickAlt(item, [
      altMeal("Whey, banana y tostadas con mermelada", "Whey - leche - banana - tostadas", [
        food("1 scoop whey", 24, 3, 2),
        food("250ml leche entera", 8, 12, 8),
        food("1 banana", 1, 27, 0),
        food("2 tostadas con mermelada", 4, 38, 2)
      ], ["Toma el whey con leche y creatina.", "Suma tostadas si el entrenamiento fue fuerte."]),
      altMeal("Atun con papa y limon", "Atun - papa - tomate - oliva - fruta", [
        food("1 lata grande de atun", 32, 0, 2),
        food("250g papa hervida", 5, 50, 0),
        food("Tomate + limon", 1, 5, 0),
        food("1 cda oliva", 0, 0, 10),
        food("1 fruta", 1, 24, 0)
      ], ["Pisa la papa con sal y limon.", "Suma atun, tomate y oliva para un post-entreno solido."])
    ]);
  }

  if (label.includes("merienda")) {
    return pickAlt(item, [
      altMeal("Merienda de queso untable, fruta y frutos secos", "queso untable - tostadas - banana - nueces - miel", [
        food("160g queso untable", 18, 6, 9),
        food("2 tostadas", 6, 30, 2),
        food("1 banana", 1, 27, 0),
        food("20g nueces", 3, 3, 13),
        food("1 cda miel", 0, 17, 0)
      ], ["Bati la queso untable con miel para que quede cremosa.", "Comela con tostadas, banana y nueces arriba."]),
      altMeal("Wrap de atun y palta", "Tortilla - atun - palta - tomate - limon", [
        food("1 tortilla grande", 6, 36, 5),
        food("1 lata de atun", 24, 0, 1),
        food("1/2 palta", 2, 6, 12),
        food("Tomate + hojas verdes", 1, 6, 0),
        food("1 fruta", 1, 24, 0)
      ], ["Pisa palta con limon.", "Arma el wrap con atun, tomate y hojas verdes."]),
      altMeal("Huevos duros, tostadas y fruta", "Huevos - tostadas - queso - fruta", [
        food("2 huevos duros", 12, 1, 10),
        food("2 tostadas integrales", 7, 34, 3),
        food("50g queso fresco", 9, 2, 7),
        food("1 fruta", 1, 24, 0)
      ], ["Deja huevos hervidos listos en la heladera.", "Completa con tostadas, queso y fruta."])
    ]);
  }

  if (label.includes("dormir")) {
    return pickAlt(item, [
      altMeal("Cierre nocturno con proteina lenta", "queso untable o queso untable - leche - miel", [
        food("150g queso untable o queso untable", 18, 5, 8),
        food("200ml leche entera", 6, 10, 7),
        food("1 cdita miel", 0, 8, 0)
      ], ["Elegi queso untable o queso untable segun lo que tengas.", "Suma leche si ese dia quedaste corto de calorias."]),
      altMeal("Shake nocturno con nueces", "Whey - leche - nueces - banana chica", [
        food("1 scoop whey", 24, 3, 2),
        food("250ml leche entera", 8, 12, 8),
        food("15g nueces", 2, 2, 10),
        food("1 banana chica", 1, 20, 0)
      ], ["Licua whey con leche.", "Acompana con nueces o banana si faltaron calorias."])
    ]);
  }

  return pickAlt(item, mainOptions);
}

function applyPlanQualityRules() {
  allWeeks.forEach((weekDays, weekNumber) => {
    weekDays.forEach((day, dayNumber) => {
      day.tip = cleanPlanText(day.tip);
      day.type = cleanPlanText(day.type);
      day.meals.forEach((m, mealNumber) => {
        cleanPlanItem(m);
        if (m.alt) cleanPlanItem(m.alt);
        if (!m.alt) m.alt = buildFallbackAlt(m);
        cleanPlanItem(m.alt);

        const visibleText = `${m.name} ${m.desc} ${m.note || ""} ${m.foods.map(f => f.name).join(" ")} ${m.prep.join(" ")} ${m.alt.name} ${m.alt.desc} ${m.alt.foods.map(f => f.name).join(" ")} ${m.alt.prep.join(" ")}`;
        if (!BANNED_INGREDIENTS_RE.test(visibleText)) return;

        console.warn("Ingrediente prohibido detectado; reemplazo aplicado:", m.id, m.name);
        const replacement = getPlainReplacement(m, weekNumber, dayNumber, mealNumber);
        applyMealTemplate(m, replacement);
        m.alt = cloneMealTemplate(getPlainReplacement(m, weekNumber, dayNumber, mealNumber + 1));
        cleanPlanItem(m);
        cleanPlanItem(m.alt);
      });
    });
  });
}

function auditPlanCompliance() {
  const bannedHits = [];
  const specialHits = [];

  const join = (arr, mapFn) => (Array.isArray(arr) ? arr.map(mapFn).join(" ") : "");

  allWeeks.forEach((weekDays, weekNumber) => {
    weekDays.forEach((day, dayNumber) => {
      day.meals.forEach((m, mealNumber) => {
        const alt = m.alt || {};
        const visibleText = [
          m.name,
          m.desc,
          m.note || "",
          join(m.foods, (f) => f.name),
          join(m.prep, (s) => s),
          alt.name || "",
          alt.desc || "",
          join(alt.foods, (f) => f.name),
          join(alt.prep, (s) => s)
        ].join(" ");

        if (BANNED_INGREDIENTS_RE.test(visibleText)) {
          bannedHits.push({ weekNumber, dayNumber, mealNumber, label: m.label, name: m.name });
        }

        if (isTooSpecialForRony(m) || (m.alt && isTooSpecialForRony(m.alt))) {
          specialHits.push({ weekNumber, dayNumber, mealNumber, label: m.label, name: m.name });
        }
      });
    });
  });

  if (bannedHits.length || specialHits.length) {
    console.warn("AUDIT PLAN — issues detected", { bannedHits, specialHits });
    showToast("⚠️ Plan: se detectaron items bloqueados (ver consola).");
  } else {
    console.log("AUDIT PLAN — OK (sin ingredientes bloqueados).");
  }
}

// =====================================================
// SEMANA ACTUAL · Selección automática por semana ISO
// =====================================================
function syncPlanTargetsAndIds() {
  allWeeks.forEach((weekDays, wi) => {
    weekDays.forEach((day) => {
      day.meals.forEach((m) => {
        m.id = `w${wi}-${slug(`${m.time}-${m.name}`)}`;
        if (m.alt) {
          m.alt.time = m.time;
          m.alt.label = m.label;
          m.alt.id = `w${wi}-alt-${slug(m.alt.name)}`;
        }
      });
      const totals = day.meals.reduce((acc, m) => {
        acc.kcal += m.kcal;
        m.foods.forEach((f) => { acc.p += f.p; acc.c += f.c; acc.g += f.g; });
        return acc;
      }, { kcal: 0, p: 0, c: 0, g: 0 });
      day.kcal = totals.kcal;
      day.protein = totals.p;
      day.carbs = totals.c;
      day.fats = totals.g;
    });
  });
}

function rebuildPlanForDate(date = new Date(), { audit = false } = {}) {
  planGenerationDate = new Date(date);
  resetPlanWeeksToBase();
  applyProfessionalMenuRules();
  applyFiveDayTrainingRules();
  applyPlainMenuRules();
  applyWholeFoodPriorityRules();
  applyPostWorkoutWholeFoodRules();
  applyRonyFreshWeeklyMenuRules();
  applyPlanQualityRules();
  applyRiceRotationRules();
  applyFreshMainVarietyRules();
  applyRiceRotationRules();
  applyCalorieBalanceRules();
  applyCalorieBalanceRules();
  applyRiceRotationRules();
  applyFreshMainVarietyRules();
  applyRiceRotationRules();
  applyMinimumEnergyFloorRules();
  applyRiceRotationRules();
  applyFreshMainVarietyRules();
  applyRiceRotationRules();
  ensureDailySupplementRules();
  trimHighCalorieDaysAfterSupplements();
  applyMinimumEnergyFloorRules();
  applyRiceRotationRules();
  applyFreshMainVarietyRules();
  applyCrossWeekTurnVarietyRules();
  applyVisibleDayAltVarietyRules();
  applyFinalPlanGuardRules();
  ensureDailySupplementRules();
  trimHighCalorieDaysAfterSupplements();
  syncPlanTargetsAndIds();
  weekIndex = getWeekIndex(date);
  days = allWeeks[weekIndex];
  currentWeekName = getCurrentWeekName();
  if (audit) auditPlanCompliance();
}

function getWeekIndex(date = new Date()) {
  const baseIndex = (getISOWeekNumber(date) - 1) % allWeeks.length;
  const correction = getMenuRotationCorrection(date);
  return (baseIndex + correction + allWeeks.length) % allWeeks.length;
}
function getNextMenuRefreshDate(from = new Date()) {
  const d = new Date(from);
  const daysUntilMonday = (8 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}
function getMenuRefreshLabel() {
  return getNextMenuRefreshDate().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" });
}
let weekIndex = getWeekIndex();
let days = allWeeks[weekIndex];
const weekNames = ["Semana 1 · Mediterránea", "Semana 2 · Potencia criolla", "Semana 3 · Internacional mix", "Semana 4 · Proteico puro"];
function getCurrentWeekName() {
  return `${weekNames[weekIndex]} · cambia ${getMenuRefreshLabel()}`;
}
let currentWeekName = getCurrentWeekName();


// SUPLEMENTOS
// =====================================================
const supplementsBase = [
  {
    name: "Creatina monohidrato",
    detail: "3-5g por día, todos los días. No se cicla y no depende de entrenar ese día; funciona por saturación y constancia.",
    when: "Con cualquier comida (o con el post-entreno). La clave es cumplirla todos los días."
  },
  {
    name: "Whey protein OneFit",
    detail: "1 scoop diario con agua. Alta evidencia para llegar facil a la proteina diaria cuando entrenas 5 veces por semana y tenes metabolismo rapido.",
    when: "Post-entreno o merienda. En descanso, con la comida que te resulte mas comoda."
  },
];

const supplementsOptional = [
  {
    name: "Omega 3 (EPA + DHA)",
    detail: "1-2g por día con almuerzo o cena. Reduce inflamación, mejora la recuperación post-gym y la salud cardiovascular. Más útil si comés poco pescado.",
    when: "Con comida que contenga grasa (mejor absorción)"
  },
  {
    name: "NAC (N-Acetyl Cysteine)",
    detail: "600mg. Opcional: apoyo antioxidante y respiratorio por su rol como precursor de glutatión. Para ganar músculo o rendimiento la evidencia es limitada, así que no reemplaza comida, whey ni creatina.",
    when: "1 cápsula con almuerzo o cena. Evitalo si usás nitroglicerina; consultá antes si tenés asma sensible, úlceras/reflujo fuerte, tratamientos médicos o cirugía próxima."
  },
  {
    name: "Vitamina D3",
    detail: "1000-2000 UI por día con desayuno o almuerzo. Importante en otoño/invierno o si no tomás sol todos los días. Influye en la testosterona y la fuerza.",
    when: "Con comida grasa · una sola toma diaria"
  },
  {
    name: "Magnesio o ZMA",
    detail: "300-400mg de magnesio antes de dormir. Mejora la calidad del sueño, ayuda en la recuperación y previene calambres post-piernas. ZMA suma zinc + B6.",
    when: "30 min antes de dormir, alejado de lácteos"
  },
  {
    name: "Multivitamínico (opcional)",
    detail: "1 al día con desayuno. Cobertura básica si la dieta no es muy variada. No reemplaza comer bien, pero ayuda en huecos.",
    when: "Con la primera comida del día"
  }
];

// =====================================================
// REGLAS
// =====================================================
const rules = [
  ["⚖️", "Mantenimiento 78-80kg", "Pesate cada lunes en ayunas. Si pasás de 80kg, achicá 1 porción de carbo en almuerzo/cena. Si bajás de 77kg, sumá 200 kcal/día. El objetivo es recomposición, no subir."],
  ["🥩", "Proteína primero", "Prioridad: comida real (huevos, pollo, carne magra, atún, pescado, queso y leche) + 1 scoop de whey diario para cerrar el objetivo sin comer de más."],
  ["🥛", "Leche entera si la tolerás", "Densa en calorías y útil. Si te cae pesada, tomá leche fría o usá agua en el whey diario. Para 78-80kg, no hace falta forzar más calorías."],
  ["💧", "Hidratación 3L+", "Mínimo 2.5L. En días de gym (especialmente piernas) o calor: 3-3.5L. La sed es señal tardía. La app te recuerda cada 90 min."],
  ["💊", "Creatina TODOS los días", "3-5g, incluso días de descanso. Lo que importa es que esté siempre presente en el músculo. Saltearla 1 día no rompe nada, pero la constancia es la clave."],
  ["🛌", "Dormir 8-9 horas", "El músculo crece cuando dormís. Con menos de 7h, perdés progreso aunque comas perfecto. Establecé una hora fija."],
  ["🦵", "5 entrenos por semana", "Lunes a viernes quedan como base de gym a las 12:00. Desayuno liviano 10:00, pre simple 11:15, post 14:30 y almuerzo fuerte 16:00."],
  ["🔥", "Metabolismo rápido", "No conviene recortar de más. Los días de gym se mueven cerca de 2800-3000 kcal y los descansos cerca de 2450-2650 kcal, ajustando con el peso semanal."],
  ["📸", "Medí más allá de la balanza", "Balanza + cintura + foto sin remera cada 4 semanas. En recomposición la balanza no se mueve mucho pero el cuerpo cambia: más músculo, menos grasa."],
  ["🥦", "Fibra todos los días", "Frutas y verduras en cada comida principal. Mejora digestión, energía y absorción de proteína. Importante en mantenimiento para sentirte saciado."]
];

// =====================================================
// LISTA DE COMPRAS
// =====================================================
const shopping = {
  "Carnes y proteínas": [
    "Pechuga de pollo · 1kg (varios días)",
    "Muslo de pollo deshuesado · 200g",
    "Carne magra molida · 350g",
    "Carne magra (peceto/cuadrada) · 400g",
    "Bife (cuadrada o vacío) · 400g (lun + sáb)",
    "Lomo · 200g",
    "Asado (vacío o cuadrada) · 250g (domingo)",
    "Pavita o jamón natural · 250g",
    "Bondiola o jamón crudo · 80g (domingo)",
    "Atún al natural · 4 latas",
    "Salmón fresco · 200g (viernes)"
  ],
  "Huevos y lácteos": [
    "Huevos · 2.5 docenas",
    "Leche entera · 3 litros",
    "Queso fresco en fetas · 300g",
    "Queso untable · 550g (2 potes)",
    "Queso rallado · 150g",
    "Manteca · 100g"
  ],
  "Carbohidratos": [
    "Pan integral · 2 paquetes",
    "Pan árabe · 4 unidades (lunes wrap)",
    "Pan hamburguesa · 3 unidades (viernes)",
    "Fideos secos · 500g",
    "Arroz blanco · 500g (rotacion medida, no todos los dias)",
    "Garbanzos · 2 latas (opcional)",
    "Lentejas · 500g (opcional)",
    "Polenta · 250g (martes)",
    "Papas · 2kg",
    "Batatas · 1 mediana (mar/vie)",
    "Calabaza · 1 mediana (lunes puré)",
    "Tapa de tarta · 1",
    "Harina común · 500g",
    "Pan rallado · 250g (milanesas)"
  ],
  "Grasas y almacén": [
    "Aceite de oliva · 500ml",
    "Manteca de maní · 1 frasco grande",
    "Nueces · 200g",
    "Almendras · 150g",
    "Miel · 1 frasco (pre-entrenos)",
    "Mermelada · 1 frasco",
    "Cacao amargo · 1 paquete",
    "Tomate triturado · 3 latas",
    "Curry en polvo · 1 frasco (jueves)",
    "Pimentón dulce · 1 frasco"
  ],
  "Frutas y verduras": [
    "Bananas · 3kg (las usás en casi todas las comidas)",
    "Naranjas · 1.5kg",
    "Manzanas · 1kg",
    "Palta · 3 unidades",
    "Tomates · 1kg",
    "Lechuga · 1 planta",
    "Rúcula · 1 atado (lunes)",
    "Espinaca · 1 atado",
    "Brócoli · 1 cabeza",
    "Zucchini · 2 unidades (domingo)",
    "Cebolla · 1kg",
    "Morrón rojo · 3 (mar/sab)",
    "Champiñones · 100g",
    "Zanahoria · 500g",
    "Arvejas (lata o congeladas) · 1",
    "Limones · 4",
    "Ajo · 1 cabeza"
  ],
  "Suplementos": [
    "Creatina monohidrato · 3-5g diario",
    "Whey protein OneFit · 1 scoop diario",
    "NAC Swanson 600mg · opcional, 1 cápsula con comida",
    "Omega 3 (opcional pero recomendado)",
    "Vitamina D3 (opcional)",
    "Magnesio o ZMA (opcional)"
  ]
};

// =====================================================
// ESTADO Y STORAGE
// =====================================================
let activeDay = days[0].id;
let scheduledNotifs = [];

function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    localStorage.removeItem(key);
    return fallback;
  }
}

function normalizeMealStateEntry(entry) {
  if (entry && typeof entry === "object") {
    return {
      done: Boolean(entry.done),
      variant: entry.variant === "alt" ? "alt" : "primary"
    };
  }
  return { done: Boolean(entry), variant: "primary" };
}

function getMealIdSetForDay(day) {
  return new Set((day?.meals || []).map((mealItem) => mealItem.id));
}

function pruneMealStateForIds(state, allowedIds) {
  if (!allowedIds) return state || {};
  const clean = {};
  Object.entries(state || {}).forEach(([id, entry]) => {
    if (allowedIds.has(id)) clean[id] = entry;
  });
  return clean;
}

function countDoneMealsFromState(state, allowedIds = null) {
  const cleanState = pruneMealStateForIds(state || {}, allowedIds);
  return Object.values(cleanState).filter((entry) => normalizeMealStateEntry(entry).done).length;
}

function setMealDoneInState(state, mealId, done) {
  const current = normalizeMealStateEntry(state[mealId]);
  if (!done) {
    delete state[mealId];
    return;
  }
  state[mealId] = { done: true, variant: current.variant };
}

function getMealVariant(mealId) {
  return normalizeMealStateEntry(getDayState()[mealId]).variant;
}

function getSelectedMeal(item) {
  return item.alt && getMealVariant(item.id) === "alt" ? item.alt : item;
}

function getDayStateForKey(key) {
  const all = readJsonStorage(STORAGE.meals, {});
  return all[key] || {};
}

function getDayState() {
  const all = readJsonStorage(STORAGE.meals, {});
  const key = getTodayKey();
  const rawState = all[key] || {};
  const cleanState = pruneMealStateForIds(rawState, getMealIdSetForDay(getTodayDayObject()));
  if (Object.keys(cleanState).length !== Object.keys(rawState).length) {
    all[key] = cleanState;
    localStorage.setItem(STORAGE.meals, JSON.stringify(all));
  }
  return cleanState;
}

function getActiveDayKey() {
  // When viewing a non-today tab use today's date for state
  // (meals can only be marked for the current date)
  return getTodayKey();
}

function saveDayState(state) {
  const all = readJsonStorage(STORAGE.meals, {});
  all[getTodayKey()] = pruneMealStateForIds(state, getMealIdSetForDay(getTodayDayObject()));
  localStorage.setItem(STORAGE.meals, JSON.stringify(all));
}

function isDone(id) {
  return normalizeMealStateEntry(getDayState()[id]).done;
}

function toggleMealCheck(button, mealId) {
  const state = getDayState();
  const wasMarked = normalizeMealStateEntry(state[mealId]).done;
  setMealDoneInState(state, mealId, !wasMarked);
  saveDayState(state);

  // Detectar si recién llegamos a 4 comidas marcadas (goal del día)
  const newCount = countDoneMealsFromState(state);
  // FIX: solo celebrar la PRIMERA vez del día, no cada vez que oscilás entre 3 y 4
  const goalCelebratedKey = `goal-celebrated-${getTodayKey()}`;
  const alreadyCelebrated = localStorage.getItem(goalCelebratedKey) === "1";
  const justHitGoal = !wasMarked && newCount === 4 && !alreadyCelebrated;
  if (justHitGoal) localStorage.setItem(goalCelebratedKey, "1");

  renderActiveDay();
  renderWeekOverview();
  updateStreak();
  updateFabBadge();

  if (justHitGoal) {
    celebrateGoal();
  } else if (!wasMarked) {
    // pequeño pulso al marcar
    triggerCheckPulse(mealId);
  }
}

function triggerCheckPulse(mealId) {
  // Buscar el meal-check del id y agregarle clase de pulso
  const checkBtn = document.querySelector(`[onclick*="toggleMealCheck"][onclick*="'${mealId}'"]`);
  if (!checkBtn) return;
  checkBtn.classList.add("pulse-once");
  setTimeout(() => checkBtn.classList.remove("pulse-once"), 600);
}

function celebrateGoal() {
  // Confetti emoji aparece y desaparece
  const confetti = document.createElement("div");
  confetti.className = "confetti-burst";
  confetti.innerHTML = "🎉 💪 🔥 ⭐️ 🎯 ✨";
  document.body.appendChild(confetti);
  setTimeout(() => confetti.remove(), 1800);
  showToast("🎯 ¡4 comidas marcadas! Día cumpliendo el objetivo.");
}

function toggleMeal(head) {
  const meal = head.closest(".meal");
  if (!meal) return;
  const isOpen = meal.classList.toggle("open");
  head.setAttribute("aria-expanded", String(isOpen));
  const detail = meal.querySelector(".meal-detail");
  if (detail) detail.setAttribute("aria-hidden", String(!isOpen));
}

function handleMealHeadKeydown(event, head) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  toggleMeal(head);
}

// =====================================================
// QUICK ACTION · marcar la comida más cercana a la hora actual
// =====================================================
function quickCheckCurrentMeal() {
  // FIX: usar SIEMPRE el día actual real (no el activo). Si el usuario está mirando otro día,
  // cambiar primero al de hoy. Antes marcaba la comida del día equivocado.
  const todayObj = getTodayDayObject();
  if (activeDay !== todayObj.id) {
    setActiveDay(todayObj.id);
  }
  const day = todayObj;
  if (!day) return;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let closest = null;
  let closestDiff = Infinity;
  day.meals.forEach((m) => {
    const [h, mn] = m.time.split(":").map(Number);
    const diff = Math.abs(h * 60 + mn - nowMin);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = m;
    }
  });
  if (!closest) return;

  const state = getDayState();
  if (normalizeMealStateEntry(state[closest.id]).done) {
    showToast(`Ya tenías marcado: ${displayText(closest.label)}`);
    return;
  }

  setMealDoneInState(state, closest.id, true);
  saveDayState(state);

  const newCount = countDoneMealsFromState(state);
  const goalCelebratedKey = `goal-celebrated-${getTodayKey()}`;
  const alreadyCelebrated = localStorage.getItem(goalCelebratedKey) === "1";
  const justHitGoal = newCount === 4 && !alreadyCelebrated;
  if (justHitGoal) localStorage.setItem(goalCelebratedKey, "1");

  renderActiveDay();
  renderWeekOverview();
  updateStreak();
  updateFabBadge();

  if (justHitGoal) {
    celebrateGoal();
  }
  showToast(`✓ ${displayText(closest.label)} marcado: ${displayText(closest.name)}`);
}

// =====================================================
// TOAST
// =====================================================
function ensureToastA11y(toast) {
  toast.setAttribute("aria-live", "polite");
  toast.setAttribute("aria-atomic", "true");
  if (!toast.getAttribute("role")) toast.setAttribute("role", "status");
}

function showToast(text) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.onclick = null;
  toast.onkeydown = null;
  toast.removeAttribute("tabindex");
  toast.removeAttribute("aria-label");
  toast.classList.remove("action");
  toast.setAttribute("role", "status");
  ensureToastA11y(toast);
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

function showActionToast(text, onClick, durationMs = 9000) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  ensureToastA11y(toast);

  toast.textContent = text;
  toast.classList.add("show", "action");
  toast.setAttribute("role", "button");
  toast.setAttribute("tabindex", "0");
  toast.setAttribute("aria-label", text);

  const clear = () => {
    toast.onclick = null;
    toast.onkeydown = null;
    toast.removeAttribute("tabindex");
    toast.removeAttribute("aria-label");
    toast.setAttribute("role", "status");
    toast.classList.remove("show", "action");
  };
  toast.onclick = () => { clear(); try { onClick && onClick(); } catch (e) {} };
  toast.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toast.click();
    }
  };
  setTimeout(clear, durationMs);
}

// =====================================================
// RENDER
// =====================================================
function renderTabs() {
  // Show current week name above the tabs
  const tabsEl = document.querySelector("#week-tabs");
  const weekLabelEl = document.querySelector("#current-week-label");
  const todayPlanDayIndex = getPlanDayIndex();
  if (weekLabelEl) weekLabelEl.textContent = currentWeekName;
  tabsEl.innerHTML = days.map((day) => {
    const isToday = day.dayIndex === todayPlanDayIndex;
    return `
      <button class="tab-btn ${day.id === activeDay ? "active" : ""} ${isToday ? "is-today" : ""} ${day.isRestDay ? "rest-tab" : ""}" type="button" onclick="setActiveDay('${day.id}')">
        ${day.tab}
        ${isToday ? '<span class="today-dot"></span>' : ""}
      </button>
    `;
  }).join("");
}

function setActiveDay(dayId) {
  activeDay = dayId;
  renderTabs();
  renderActiveDay();
  updateNextMeal();
  // FIX: scrollear al tope del panel al cambiar de tab
  setTimeout(() => {
    const dayContainer = document.querySelector("#day-container");
    if (dayContainer) {
      const top = dayContainer.getBoundingClientRect().top + window.scrollY - 12;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, 50);
}

function renderProgressBar(label, current, target, color) {
  const numCurrent = parseInt(String(current));
  const numTarget = parseInt(String(target));
  const rawPct = Math.round((numCurrent / numTarget) * 100);
  const pct = Math.min(100, rawPct);
  let stage = "low";
  if (rawPct > 115) stage = "over";
  else if (rawPct >= 95 && rawPct <= 115) stage = "complete";
  else if (rawPct >= 60) stage = "high";
  else if (rawPct >= 30) stage = "mid";
  const overTag = rawPct > 115 ? `<span class="over-tag">+${rawPct - 100}%</span>` : "";
  const pctLabel = rawPct > 0 ? `<span class="prog-pct ${stage}">${Math.min(rawPct, 999)}%</span>` : "";
  return `
    <div class="prog-bar-row" data-stage="${stage}">
      <div class="prog-bar-head">
        <span class="prog-bar-label">${label}</span>
        <span class="prog-bar-value">${current}<span class="prog-bar-target"> / ${target}</span>${overTag}</span>
        ${pctLabel}
      </div>
      <div class="prog-bar-track">
        <div class="prog-bar-fill animating" style="width: ${pct}%; background: ${color};"></div>
      </div>
    </div>
  `;
}

function renderOperationalBrief(day, consumed, adjustedKcal, proteinTarget) {
  const proteinGap = Math.max(0, proteinTarget - consumed.p);
  const kcalGap = Math.max(0, adjustedKcal - consumed.kcal);
  const cadence = day.isRestDay
    ? [
      `${REST_DAY_TIMES.breakfast} desayuno`,
      `${REST_DAY_TIMES.lunch} almuerzo`,
      `${REST_DAY_TIMES.snack} merienda`,
      `${REST_DAY_TIMES.dinner} cena`
    ]
    : [
      `${TRAINING_DAY_TIMES.breakfast} desayuno`,
      `${TRAINING_DAY_TIMES.pre} pre`,
      `${TRAINING_DAY_TIMES.post} post`,
      `${TRAINING_DAY_TIMES.lunch} almuerzo`
    ];
  const cadenceLabel = day.isRestDay ? "Ritmo descanso" : "Cadencia gym 12:00";
  const focusText = day.isRestDay
    ? "Proteína real repartida y carbo medido. Día para sostener, no para picotear."
    : "Llegá liviano al mediodía, meté carbo simple en el pre y dejá el plato fuerte para después del gym.";
  let closeoutText;
  if (proteinGap <= 0 && kcalGap <= 120) {
    closeoutText = "Vas en rango. Mantené comida real, creatina diaria y 1 scoop de whey OneFit todos los dias.";
  } else if (proteinGap > 0) {
    closeoutText = `Todavia faltan ${proteinGap}g de proteina ademas del whey diario. Priorizá huevos, pollo, carne, atun, queso o leche.`;
  } else {
    closeoutText = `Todavía faltan ~${kcalGap} kcal. Sumá una porción simple de arroz, papa, pan o fruta sin recargar grasas al pedo.`;
  }

  return `
    <section class="day-brief" aria-label="Brief operativo del día">
      <article class="day-brief-card day-brief-card-cadence">
        <div class="day-brief-kicker">${cadenceLabel}</div>
        <div class="day-brief-value">${cadence.join(" · ")}</div>
      </article>
      <article class="day-brief-card">
        <div class="day-brief-kicker">Foco del día</div>
        <div class="day-brief-copy">${focusText}</div>
      </article>
      <article class="day-brief-card">
        <div class="day-brief-kicker">Cierre inteligente</div>
        <div class="day-brief-copy">${closeoutText}</div>
      </article>
    </section>
  `;
}

function renderActiveDay() {
  // FIX: preservar estado abierto/cerrado de comidas y preparaciones antes de re-renderizar
  const openMealIds = Array.from(document.querySelectorAll(".meal.open"))
    .map((m) => m.dataset.mealId)
    .filter(Boolean);
  const openPrepMealIds = Array.from(document.querySelectorAll(".prep-body.open"))
    .map((p) => p.id)
    .filter(Boolean);

  const day = days.find((item) => item.id === activeDay);
  const doneMeals = day.meals.filter((item) => isDone(item.id)).map(getSelectedMeal);
  const consumed = sumMacros(doneMeals);
  const todayObj = getTodayDayObject();
  const isViewingToday = day.id === todayObj.id;

  const isFridayWithoutGym = day.id === "vie" && getFridayModeForDay(day.id) === "rest";
  const adjustedKcal = isFridayWithoutGym ? day.kcal - 200 : day.kcal;
  const proteinTarget = isFridayWithoutGym ? Math.round(day.protein * 0.92) : day.protein;

  document.querySelector("#day-container").innerHTML = `
    <section class="panel active">
      <div class="day-header">
        <div class="day-context-strip ${isViewingToday ? "is-today" : "is-planning"}" role="status" aria-live="polite">
          <div>
            <span class="day-context-kicker">${isViewingToday ? "Hoy real" : "Planificación"}</span>
            <strong>${isViewingToday ? "Estás viendo el día operativo de hoy." : `Estás viendo ${displayText(day.title)}. Hoy real es ${displayText(todayObj.title)}.`}</strong>
          </div>
          ${isViewingToday ? "" : `<button class="day-context-action" type="button" onclick="scrollToTodayPanel()">Volver a hoy</button>`}
        </div>
        <div class="day-header-top">
          <div class="day-icon ${day.isRestDay ? "rest" : ""}">${day.workout.icon}</div>
          <div>
            <div class="day-label">${displayText(day.title)}</div>
            <div class="day-type">${displayText(day.type)} · <span>~${adjustedKcal} kcal</span></div>
          </div>
        </div>
        ${day.workout.duration !== "—" ? `
          <div class="workout-info">
            <strong>🏋️ ${displayText(day.workout.name)}</strong> · ${displayText(day.workout.duration)}
            ${day.trainingTime ? ` · Entreno ${day.trainingTime}` : ""}
            ${day.workout.optional ? '<span class="opt-label">opcional</span>' : ""}
          </div>` : ""}
        ${day.id === "vie" ? `
          <div class="friday-toggle">
            <label class="toggle-row">
              <span>Viernes base: quinto gym</span>
              <select id="friday-mode-select" onchange="setFridayMode(this.value)">
                <option value="gym" ${!isFridayWithoutGym ? "selected" : ""}>Full body 5x/semana (${day.kcal} kcal)</option>
                <option value="rest" ${isFridayWithoutGym ? "selected" : ""}>Descanso excepcional (${day.kcal - 200} kcal)</option>
              </select>
            </label>
          </div>` : ""}
        <div class="workout-tags">${day.tags.map((tag) => `<span class="workout-tag">${displayText(tag)}</span>`).join("")}</div>
      </div>

      <div class="day-total">
        <div class="dt-title">Progreso del día</div>
        ${renderProgressBar("kcal", consumed.kcal, adjustedKcal, "linear-gradient(90deg, #f4b84a, #ffe08a)")}
        ${renderProgressBar("proteína", consumed.p + "g", proteinTarget + "g", "linear-gradient(90deg, #ff6b5f, #ff9588)")}
        ${renderProgressBar("carbos", consumed.c + "g", (isFridayWithoutGym ? Math.round(day.carbs * 0.93) : day.carbs) + "g", "linear-gradient(90deg, #f4b84a, #ffe08a)")}
        ${renderProgressBar("grasas", consumed.g + "g", day.fats + "g", "linear-gradient(90deg, #61a8ff, #8fc6ff)")}
      </div>

      ${renderOperationalBrief(day, consumed, adjustedKcal, proteinTarget)}

      <div class="tip-card"><div class="tip-icon">💡</div><div class="tip-text">${displayText(day.tip)}</div></div>

      <div class="quick-actions">
        <button class="quick-btn" type="button" onclick="quickCheckCurrentMeal()">⚡ Marcar comida actual</button>
      </div>

      ${day.meals.map(renderMeal).join("")}
    </section>
  `;

  // FIX: trigger shimmer animation on progress bar fills
  setTimeout(() => {
    document.querySelectorAll(".prog-bar-fill").forEach(el => {
      el.classList.remove("animating");
      void el.offsetWidth; // force reflow
      el.classList.add("animating");
    });
  }, 100);

  // FIX: restaurar estado abierto de comidas y preparaciones después del re-render
  openMealIds.forEach((id) => {
    const meal = document.querySelector(`.meal[data-meal-id="${id}"]`);
    if (meal) {
      meal.classList.add("open");
      const head = meal.querySelector(".meal-open-btn");
      const detail = meal.querySelector(".meal-detail");
      if (head) head.setAttribute("aria-expanded", "true");
      if (detail) detail.setAttribute("aria-hidden", "false");
    }
  });
  openPrepMealIds.forEach((id) => {
    const prepBody = document.getElementById(id);
    const prepToggle = prepBody?.previousElementSibling;
    if (prepBody && prepToggle?.classList.contains("prep-toggle")) {
      prepBody.classList.add("open");
      prepToggle.classList.add("open");
      prepToggle.setAttribute("aria-expanded", "true");
      prepBody.setAttribute("aria-hidden", "false");
      const label = prepToggle.querySelector(".prep-label");
      if (label) label.textContent = "Ocultar preparación";
    }
  });
}

function setFridayMode(mode) {
  writeFridayModeForDay("vie", mode);
  renderActiveDay();
}

function isUpcomingMeal(item, day) {
  // Solo se considera "próxima" si estamos viendo el día actual y la comida es la siguiente
  const todayObj = getTodayDayObject();
  if (day.id !== todayObj.id) return false;
  if (isDone(item.id)) return false;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [h, mn] = item.time.split(":").map(Number);
  const targetMin = h * 60 + mn;

  // Es "próxima" si está dentro de los próximos 60 min, o si está en curso (faltan menos de 30 min para que pase)
  const diff = targetMin - nowMin;
  return diff >= -30 && diff <= 60;
}



// =====================================================
// OPCIÓN B · Mostrar/ocultar alternativa en almuerzo y cena
// =====================================================
// OPCION B + PREPARACION + TARJETA DE COMIDA
// =====================================================
function toggleAltMeal(mealId) {
  const state = getDayState();
  const current = normalizeMealStateEntry(state[mealId]);
  const nextVariant = current.variant === "alt" ? "primary" : "alt";
  state[mealId] = { done: current.done, variant: nextVariant };
  if (!state[mealId].done && nextVariant === "primary") delete state[mealId];
  saveDayState(state);
  renderActiveDay();
  renderWeekOverview();
  updateFabBadge();
  showToast(nextVariant === "alt" ? "Opcion B elegida para macros" : "Volviste a la opcion principal");
}
window.toggleAltMeal = toggleAltMeal;

function togglePrep(button) {
  const body = button.nextElementSibling;
  if (!body) return;
  const isOpen = body.classList.toggle("open");
  button.classList.toggle("open", isOpen);
  button.setAttribute("aria-expanded", String(isOpen));
  body.setAttribute("aria-hidden", String(!isOpen));
  const label = button.querySelector(".prep-label");
  if (label) label.textContent = isOpen ? "Ocultar preparación" : "Ver preparación";
}
function renderMeal(item) {
  const done = isDone(item.id);
  const day = days.find((d) => d.id === activeDay);
  const isUpcoming = day ? isUpcomingMeal(item, day) : false;
  const todayObj = getTodayDayObject();
  const isToday = day && day.id === todayObj.id;
  const detailId = `meal-detail-${item.id}`;
  const prepId = `meal-prep-${item.id}`;
  const altId = `meal-alt-${item.id}`;
  const altPrepId = `meal-alt-prep-${item.id}`;
  const note = item.note ? `<div class="meal-note">Nota: ${displayText(item.note)}</div>` : "";
  const totalP = item.foods.reduce((s, f) => s + f.p, 0);
  const totalC = item.foods.reduce((s, f) => s + f.c, 0);
  const totalG = item.foods.reduce((s, f) => s + f.g, 0);
  const hasAlt = Boolean(item.alt);
  const selectedAlt = hasAlt && getMealVariant(item.id) === "alt";

  const renderDetailGrid = (mealItem, bodyId, isAlt = false) => `
    <div class="meal-detail-grid ${isAlt ? "alt-detail-grid" : ""}">
      <div class="ingredient-sheet">
        <div class="detail-kicker">Ingredientes medidos</div>
        <div class="food-list">${mealItem.foods.map(renderFood).join("")}</div>
      </div>
      <div class="recipe-sheet">
        <div class="detail-kicker">Cocina paso a paso</div>
        <button class="prep-toggle ${isAlt ? "alt-prep-toggle" : ""}" type="button" onclick="togglePrep(this)" aria-expanded="false" aria-controls="${bodyId}">
          <span class="prep-label">Ver preparación</span>
        </button>
        <div class="prep-body" id="${bodyId}" aria-hidden="true">
          ${renderPrepContent(mealItem)}
        </div>
      </div>
    </div>
  `;

  const altPanel = hasAlt ? `
    <div class="alt-meal-panel ${selectedAlt ? "open selected" : ""}" id="${altId}" data-alt-for="${item.id}" aria-hidden="${selectedAlt ? "false" : "true"}">
      <div class="alt-meal-header">
        <span class="alt-badge">${selectedAlt ? "Opcion B elegida" : "Opcion B"}</span>
        <span class="alt-kcal">${item.alt.kcal} kcal</span>
      </div>
      <div class="alt-meal-name">${displayText(item.alt.name)}</div>
      <div class="alt-meal-desc">${displayText(item.alt.desc)}</div>
      <div class="alt-macro-row">
        <span class="mm p">${item.alt.foods.reduce((s, f) => s + f.p, 0)}g P</span>
        <span class="mm c">${item.alt.foods.reduce((s, f) => s + f.c, 0)}g C</span>
        <span class="mm g">${item.alt.foods.reduce((s, f) => s + f.g, 0)}g G</span>
      </div>
      ${renderDetailGrid(item.alt, altPrepId, true)}
    </div>
  ` : "";

  const altBtn = hasAlt ? `
    <button class="alt-meal-btn ${selectedAlt ? "active" : ""}" type="button" data-alt-btn="${item.id}" onclick="event.stopPropagation(); toggleAltMeal('${item.id}')" aria-expanded="${selectedAlt ? "true" : "false"}" aria-controls="${altId}">
      ${selectedAlt ? '<span class="alt-btn-icon">A</span> Volver a opcion principal' : '<span class="alt-btn-icon">B</span> Elegir opcion B'}
    </button>
  ` : "";

  const typeSlug = slug(item.label);
  return `
    <article class="meal ${done ? "done" : ""} ${isUpcoming ? "is-upcoming" : ""}" data-type="${typeSlug}" data-meal-id="${item.id}">
      <div class="meal-type-stripe"></div>
      ${isUpcoming ? '<div class="upcoming-tag">Toca ahora</div>' : ""}
      <div class="meal-head">
        <button class="meal-open-btn" type="button" aria-expanded="false" aria-controls="${detailId}" onclick="toggleMeal(this)" aria-label="Abrir detalle de ${displayText(item.label)}: ${displayText(item.name)}">
          <div class="meal-time-col">
            <div class="meal-time">${item.time}</div>
          </div>
          <div class="meal-info-col">
            <div class="meal-label-chip">${displayText(item.label)}</div>
            <div class="meal-name">${displayText(item.name)}</div>
            <div class="meal-desc">${displayText(item.desc)}</div>
            <div class="meal-mini-macros">
              <span class="mm p">${totalP}g P</span>
              <span class="mm c">${totalC}g C</span>
              <span class="mm g">${totalG}g G</span>
            </div>
          </div>
          <div class="meal-kcal">
            <div class="meal-kcal-val">${item.kcal}</div>
            <div class="meal-kcal-lbl">kcal</div>
          </div>
        </button>
        <button class="meal-check ${done ? "checked" : ""} ${isToday ? "" : "disabled-day"}" type="button" ${isToday ? `onclick="event.stopPropagation(); toggleMealCheck(this, '${item.id}')"` : 'disabled title="Solo podés marcar el día de hoy"'} aria-label="${done ? "Desmarcar comida" : "Marcar comida"}">
          <span class="mc-dot"></span>
        </button>
      </div>
      <div class="meal-detail" id="${detailId}" aria-hidden="true">
        ${note}
        ${renderDetailGrid(item, prepId)}
        ${altBtn}
        ${altPanel}
      </div>
    </article>
  `;
}

function renderFood(item) {
  return `
    <div class="food-item">
      <span class="food-name">${displayText(item.name)}</span>
      <div class="food-macros">
        <span class="fm p">${item.p}g P</span>
        <span class="fm c">${item.c}g C</span>
        <span class="fm g">${item.g}g G</span>
      </div>
    </div>
  `;
}

const SUPP_ICONS = {
  "Whey protein": "🥛",
  "Whey protein diario": "🥛",
  "Creatina monohidrato": "⚡",
  "Omega 3 (EPA + DHA)": "🐟",
  "NAC (N-Acetyl Cysteine)": "🛡️",
  "Vitamina D3": "☀️",
  "Magnesio o ZMA": "🌙",
  "Multivitamínico (opcional)": "💊"
};

function renderSupplements() {
  const baseEl = document.querySelector("#supp-base-row");
  const extraEl = document.querySelector("#supp-extra-row");
  if (baseEl) {
    baseEl.innerHTML = supplementsBase.map((s) => `
      <article class="supp-card">
        <div class="supp-icon">${SUPP_ICONS[s.name] || "💊"}</div>
        <div class="supp-body">
          <div class="supp-name">${displayText(s.name)}</div>
          <div class="supp-detail">${displayText(s.detail)}</div>
          <div class="supp-when"><span class="supp-when-icon">⏰</span>${displayText(s.when)}</div>
        </div>
      </article>
    `).join("");
  }
  if (extraEl) {
    extraEl.innerHTML = supplementsOptional.map((s) => `
      <article class="supp-card supp-card-optional">
        <div class="supp-icon">${SUPP_ICONS[s.name] || "💊"}</div>
        <div class="supp-body">
          <div class="supp-name">${displayText(s.name)}</div>
          <div class="supp-detail">${displayText(s.detail)}</div>
          <div class="supp-when"><span class="supp-when-icon">⏰</span>${displayText(s.when)}</div>
        </div>
      </article>
    `).join("");
  }
}

function renderRules() {
  document.querySelector("#rules-grid").innerHTML = rules.map(([icon, title, text]) => `
    <article class="rule"><div class="rule-icon">${icon}</div><div><div class="rule-title">${title}</div><div class="rule-text">${text}</div></div></article>
  `).join("");
}

const SHOP_CAT_ICONS = {
  "Carnes y proteínas": "🥩",
  "Huevos y lácteos": "🥚",
  "Carbohidratos": "🍞",
  "Grasas y almacén": "🫙",
  "Frutas y verduras": "🥦",
  "Suplementos": "💊"
};

const SHOPPING_FOCUS_GROUPS = {
  breakfast: [
    { label: "huevos y tortillas", terms: ["huevo", "omelette", "revuelto", "tortilla", "pocha", "pochado"] },
    { label: "pan, tostadas y sandwiches", terms: ["tostada", "pan integral", "sandwich", "tostado", "french toast", "medialuna", "arepa"] },
    { label: "banana y fruta simple", terms: ["banana", "fruta", "naranja", "frutilla", "arandano", "frutos rojos", "mango"] },
    { label: "jamon, queso y mozzarella", terms: ["jamon", "pavita", "queso", "mozzarella"] },
    { label: "papa, tarta y base casera", terms: ["papa", "tarta", "zapallito", "batata"] }
  ],
  proteins: [
    { label: "pollo", terms: ["pollo", "pechuga", "muslo"] },
    { label: "carne magra", terms: ["carne", "bife", "lomo", "peceto", "asado", "vacio", "lomito"] },
    { label: "atun y pescado", terms: ["atun", "salmon", "merluza", "trucha", "pescado"] },
    { label: "huevos como apoyo", terms: ["huevo", "tortilla", "omelette"] },
    { label: "lentejas y garbanzos", terms: ["lenteja", "garbanzo"] }
  ],
  carbs: [
    { label: "papa y batata", terms: ["papa", "papas", "pure", "batata", "noisette"] },
    { label: "pasta y fideos", terms: ["fideo", "pasta", "raviol", "tallar", "noodle", "cuscus"] },
    { label: "arroz medido", terms: ["arroz", "chaufa", "risotto", "basmati"] },
    { label: "pan, wraps y tacos", terms: ["pan", "wrap", "pita", "taco", "sandwich", "empanada"] },
    { label: "legumbres", terms: ["lenteja", "garbanzo"] }
  ],
  produce: [
    { label: "banana", terms: ["banana"] },
    { label: "tomate y hojas verdes", terms: ["tomate", "lechuga", "rucula", "espinaca"] },
    { label: "palta", terms: ["palta"] },
    { label: "brocoli y verdes de plato", terms: ["brocoli", "espinaca", "zucchini", "morron", "zanahoria"] }
  ],
  recovery: [
    { label: "banana y leche para pre/post", terms: ["banana", "leche"] },
    { label: "creatina diaria", terms: ["creatina"] },
    { label: "whey diario", terms: ["whey"] }
  ]
};

function summarizeShoppingSignals(texts, configs, limit = 3) {
  return configs
    .map((config) => ({
      label: config.label,
      hits: texts.reduce((total, text) => total + (includesAny(text, config.terms) ? 1 : 0), 0)
    }))
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.label.localeCompare(b.label, "es"))
    .slice(0, limit);
}

function joinShoppingLabels(entries, fallback) {
  const labels = entries.map((entry) => entry.label);
  if (!labels.length) return fallback;
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} y ${labels[1]}`;
  return `${labels[0]}, ${labels[1]} y ${labels[2]}`;
}

function getWeekBreakfastMeals() {
  return days
    .map((day) => day.meals.find((mealItem) => /desayuno/i.test(plainText(mealItem.label))))
    .filter(Boolean);
}

function getWeekMainMeals(includeAlt = false) {
  return days.flatMap((day) => day.meals
    .filter((mealItem) => isMainMeal(mealItem))
    .map((mealItem) => (includeAlt ? mealItem.alt : mealItem))
    .filter(Boolean));
}

function buildShoppingWeekFocusData() {
  const breakfasts = getWeekBreakfastMeals();
  const primaryMains = getWeekMainMeals(false);
  const altMains = getWeekMainMeals(true);
  const allMeals = days.flatMap((day) => day.meals);

  const breakfastSignals = summarizeShoppingSignals(breakfasts.map(mealSearchText), SHOPPING_FOCUS_GROUPS.breakfast);
  const proteinSignals = summarizeShoppingSignals(primaryMains.map(mealSearchText), SHOPPING_FOCUS_GROUPS.proteins);
  const carbSignals = summarizeShoppingSignals(primaryMains.map(mealSearchText), SHOPPING_FOCUS_GROUPS.carbs);
  const produceSignals = summarizeShoppingSignals(allMeals.map(mealSearchText), SHOPPING_FOCUS_GROUPS.produce, 2);
  const recoverySignals = summarizeShoppingSignals(allMeals.map(mealSearchText), SHOPPING_FOCUS_GROUPS.recovery, 3);
  const altSignals = summarizeShoppingSignals(altMains.map(mealSearchText), [
    ...SHOPPING_FOCUS_GROUPS.proteins,
    ...SHOPPING_FOCUS_GROUPS.carbs
  ]);

  return {
    weekName: displayText(weekNames[weekIndex]),
    breakfastSummary: joinShoppingLabels(breakfastSignals, "desayunos simples y sostenibles"),
    proteinSummary: joinShoppingLabels(proteinSignals, "pollo, carne magra y huevos"),
    carbSummary: joinShoppingLabels(carbSignals, "papa, arroz y pasta"),
    produceSummary: joinShoppingLabels(produceSignals, "banana y verduras de base"),
    recoverySummary: joinShoppingLabels(recoverySignals, "banana, leche y creatina"),
    altSummary: joinShoppingLabels(altSignals, "proteina real + carbo simple"),
    stats: [
      { value: breakfasts.length, label: "desayunos resueltos" },
      { value: primaryMains.length, label: "platos fuertes" },
      { value: altMains.length, label: "opciones B listas" }
    ]
  };
}

function renderShoppingWeekFocus() {
  const node = document.querySelector("#shopping-week-focus");
  if (!node) return;
  const focus = buildShoppingWeekFocusData();
  node.innerHTML = `
    <article class="shopping-focus-card" aria-label="Prioridades de compra de la semana activa">
      <div class="shopping-focus-head">
        <div>
          <div class="shopping-focus-kicker">Compra primero para ${focus.weekName}</div>
          <h3>La semana pide ${focus.proteinSummary} con ${focus.carbSummary}.</h3>
          <p>Desayunos apoyados en ${focus.breakfastSummary}; verduras y fruta con foco en ${focus.produceSummary}. El pre/post queda cubierto con ${focus.recoverySummary}.</p>
        </div>
        <div class="shopping-focus-stats">
          ${focus.stats.map((stat) => `
            <div class="shopping-focus-stat">
              <strong>${stat.value}</strong>
              <span>${stat.label}</span>
            </div>
          `).join("")}
        </div>
      </div>
      <div class="shopping-focus-rail">
        <span class="shopping-focus-chip">Base semanal: ${focus.breakfastSummary}</span>
        <span class="shopping-focus-chip">Platos fuertes: ${focus.proteinSummary}</span>
        <span class="shopping-focus-chip">Opcion B: ${focus.altSummary}</span>
      </div>
    </article>
  `;
}

function renderShopping() {
  renderShoppingWeekFocus();
  document.querySelector("#shopping-content").innerHTML = Object.entries(shopping).map(([category, items]) => `
    <div class="sl-category">
      <div class="sl-cat-title">
        <span class="sl-cat-icon">${SHOP_CAT_ICONS[category] || "🛒"}</span>
        ${displayText(category)}
        <span class="sl-cat-count">${items.length}</span>
      </div>
      <div class="sl-items-grid">
        ${items.map((item) => {
          const [name, ...rest] = item.split(" · ");
          const qty = rest.join(" · ");
          return `<div class="sl-item" onclick="toggleShop(this)">
            <div class="sl-check"><span class="sl-check-icon">✓</span></div>
            <div class="sl-info">
              <span class="sl-name">${displayText(name)}</span>
              ${qty ? `<span class="sl-qty">${displayText(qty)}</span>` : ""}
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>
  `).join("");
  enhanceShoppingItems();
  restoreShoppingState();
  syncShoppingPanelUI();
}

function getShoppingState() {
  return JSON.parse(localStorage.getItem("rony-dieta-shopping") || "[]");
}

function enhanceShoppingItems() {
  document.querySelectorAll(".sl-item").forEach((item) => {
    const name = item.querySelector(".sl-name")?.textContent?.trim() || "item";
    item.dataset.itemName = name;
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");
    if (!item.querySelector(".sl-state")) {
      const state = document.createElement("span");
      state.className = "sl-state";
      item.appendChild(state);
    }
    item.onkeydown = (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleShop(item);
    };
  });
}

function setShoppingItemDone(item, done) {
  item.classList.toggle("done", done);
  item.setAttribute("aria-pressed", String(done));
  const name = item.dataset.itemName || item.querySelector(".sl-name")?.textContent?.trim() || "item";
  item.setAttribute("aria-label", done ? `${name} marcado como comprado` : `Marcar ${name} como comprado`);
  const state = item.querySelector(".sl-state");
  if (state) state.textContent = done ? "Comprado" : "Pendiente";
}

function saveShoppingState() {
  const done = Array.from(document.querySelectorAll(".sl-item.done"))
    .map((el) => el.dataset.itemName || el.querySelector(".sl-name")?.textContent?.trim())
    .filter(Boolean);
  localStorage.setItem("rony-dieta-shopping", JSON.stringify(done));
}

function restoreShoppingState() {
  const done = getShoppingState();
  document.querySelectorAll(".sl-item").forEach((item) => {
    const name = item.dataset.itemName || item.querySelector(".sl-name")?.textContent?.trim();
    setShoppingItemDone(item, Boolean(name && done.includes(name)));
  });
  updateShoppingProgress();
}

function toggleShop(item) {
  setShoppingItemDone(item, !item.classList.contains("done"));
  saveShoppingState();
  updateShoppingProgress();
}

function resetShopping() {
  document.querySelectorAll(".sl-item").forEach((item) => setShoppingItemDone(item, false));
  localStorage.removeItem("rony-dieta-shopping");
  updateShoppingProgress();
}

function updateShoppingProgress() {
  const total = document.querySelectorAll(".sl-item").length;
  const done = document.querySelectorAll(".sl-item.done").length;
  document.querySelector("#sl-count").textContent = done;
  document.querySelector("#sl-total").textContent = total;
  document.querySelector("#sl-fill").style.width = total ? `${(done / total) * 100}%` : "0%";
  syncShoppingPreview(total, done);
}

function isShoppingPanelExpanded() {
  return localStorage.getItem(STORAGE.shoppingPanel) === "open";
}

function setShoppingPanelExpanded(expanded, options = {}) {
  localStorage.setItem(STORAGE.shoppingPanel, expanded ? "open" : "closed");
  syncShoppingPanelUI();
  if (expanded && options.scrollIntoView) {
    document.querySelector("#shopping-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function syncShoppingPreview(total, done) {
  const preview = document.querySelector("#shopping-preview");
  if (!preview) return;
  const remaining = Math.max(0, total - done);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const doneItems = new Set(getShoppingState());
  const categories = Object.entries(shopping)
    .slice(0, 3)
    .map(([category, items]) => `${displayText(category)} · ${items.length}`)
    .join("  ·  ");
  const leadCategory = Object.entries(shopping)
    .map(([category, items]) => ({
      category: displayText(category),
      pending: items.filter((item) => !doneItems.has(item.split(" · ")[0])).length
    }))
    .sort((a, b) => b.pending - a.pending)
    .find((entry) => entry.pending > 0);
  preview.innerHTML = `
    <div class="shopping-preview-copy">
      <strong>${remaining} pendientes</strong> de ${total} items para dejar la semana lista.
      <div class="shopping-preview-progress">${done} listos · ${pct}% cerrado</div>
    </div>
    <div class="shopping-preview-meta">
      ${leadCategory ? `<strong>Prioridad:</strong> ${leadCategory.category} · ${leadCategory.pending} faltan<br />` : "<strong>Semana cerrada.</strong><br />"}
      ${categories}
    </div>
  `;
}

function syncShoppingPanelUI() {
  const section = document.querySelector("#shopping-list");
  const content = document.querySelector("#shopping-content");
  const button = document.querySelector("#shopping-btn");
  const preview = document.querySelector("#shopping-preview");
  if (!section || !content || !button || !preview) return;

  const expanded = isShoppingPanelExpanded();
  section.classList.toggle("shopping-collapsed", !expanded);
  content.hidden = !expanded;
  preview.hidden = expanded;
  button.textContent = expanded ? "Ocultar compras" : "Mostrar compras";
  button.setAttribute("aria-expanded", String(expanded));
}

function exportShopping() {
  const lines = ["🛒 LISTA DE COMPRAS · DIETA RONY (78-80kg)", ""];
  Object.entries(shopping).forEach(([category, items]) => {
    lines.push(`*${displayText(category)}*`);
    items.forEach((item) => lines.push(`• ${displayText(item)}`));
    lines.push("");
  });
  const text = lines.join("\n");

  if (navigator.share) {
    navigator.share({ title: "Lista de compras", text }).catch(() => copyToClipboard(text));
  } else {
    copyToClipboard(text);
  }
}

function copyToClipboard(text, successMessage = "Lista copiada — pegala en WhatsApp") {
  // FIX: navigator.clipboard requiere HTTPS. En HTTP usamos execCommand como fallback.
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMessage);
    }).catch(() => copyToClipboardFallback(text, successMessage));
  } else {
    copyToClipboardFallback(text, successMessage);
  }
}

function copyToClipboardFallback(text, successMessage = "Lista copiada — pegala en WhatsApp") {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand("copy");
    showToast(successMessage);
  } catch {
    showToast("No se pudo copiar. Copiá manualmente.");
  }
  document.body.removeChild(ta);
}

function syncShoppingPreview(total, done) {
  const preview = document.querySelector("#shopping-preview");
  if (!preview) return;
  const focus = buildShoppingWeekFocusData();
  const remaining = Math.max(0, total - done);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const doneItems = new Set(getShoppingState());
  const categories = Object.entries(shopping)
    .slice(0, 3)
    .map(([category, items]) => `${displayText(category)} · ${items.length}`)
    .join("  ·  ");
  const leadCategory = Object.entries(shopping)
    .map(([category, items]) => ({
      category: displayText(category),
      pending: items.filter((item) => !doneItems.has(item.split(" · ")[0])).length
    }))
    .sort((a, b) => b.pending - a.pending)
    .find((entry) => entry.pending > 0);
  preview.innerHTML = `
    <div class="shopping-preview-copy">
      <strong>${remaining} pendientes</strong> de ${total} items para dejar la semana lista.
      <div class="shopping-preview-progress">${focus.weekName} · ${done} listos · ${pct}% cerrado</div>
    </div>
    <div class="shopping-preview-meta">
      ${leadCategory ? `<strong>Prioridad:</strong> ${leadCategory.category} · ${leadCategory.pending} faltan<br />` : "<strong>Semana cerrada.</strong><br />"}
      ${categories}<br />
      <strong>Base:</strong> ${focus.proteinSummary} + ${focus.carbSummary}
    </div>
  `;
}

function exportShopping() {
  const focus = buildShoppingWeekFocusData();
  const lines = [
    "🛒 LISTA DE COMPRAS · DIETA RONY (78-80kg)",
    `${focus.weekName} · base semanal: ${focus.breakfastSummary}`,
    `Proteina clave: ${focus.proteinSummary} | Carbos clave: ${focus.carbSummary}`,
    `Opciones B cubiertas con: ${focus.altSummary}`,
    ""
  ];
  Object.entries(shopping).forEach(([category, items]) => {
    lines.push(`*${displayText(category)}*`);
    items.forEach((item) => lines.push(`• ${displayText(item)}`));
    lines.push("");
  });
  const text = lines.join("\n");

  if (navigator.share) {
    navigator.share({ title: "Lista de compras", text }).catch(() => copyToClipboard(text));
  } else {
    copyToClipboard(text);
  }
}

// =====================================================
// CLOCK Y BANNER
// =====================================================
function updateClock() {
  // FIX: solo actualiza el reloj. updateGreeting se llama cada minuto, no cada segundo.
  const now = new Date();
  const clockEl = document.querySelector("#live-clock");
  const dateEl = document.querySelector("#clock-date");
  if (clockEl) clockEl.textContent = now.toLocaleTimeString("es-AR", { hour12: false });
  if (dateEl) dateEl.textContent = now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

function updateGreeting() {
  const h = new Date().getHours();
  let greeting;
  if (h >= 5 && h < 13) greeting = "Buenos días, Rony 👋";
  else if (h >= 13 && h < 20) greeting = "Buenas tardes, Rony ☀️";
  else greeting = "Buenas noches, Rony 🌙";
  const el = document.querySelector("#hero-greeting");
  if (el && el.textContent !== greeting) el.textContent = greeting;
}

function getTodayDayObject() {
  const dayIdx = getPlanDayIndex();
  return days.find((d) => d.dayIndex === dayIdx) || days[0];
}

function updateGymBanner() {
  const day = getTodayDayObject();
  const banner = document.querySelector("#gym-banner-dieta");
  if (!banner) return;

  const isFridayRest = day.id === "vie" && getFridayModeForDay(day.id) === "rest";
  const preMeal = day.meals.find((m) => /pre-?entreno/i.test(m.label));
  const trainingTime = day.trainingTime || TRAINING_TIME;

  if (day.isRestDay || isFridayRest) {
    const kcal = isFridayRest ? day.kcal - 200 : day.kcal;
    banner.innerHTML = `
      <div class="gym-banner-inner gym-banner-rest">
        <div class="gym-banner-left">
          <div class="gym-banner-icon">😴</div>
          <div>
            <div class="gym-banner-title">Día de descanso · ${displayText(day.title)}</div>
            <div class="gym-banner-sub">Caminata 20 min recomendada · Recargá energía</div>
          </div>
        </div>
        <div class="gym-banner-stats">
          <div class="gym-stat"><span class="gym-stat-val">${kcal}</span><span class="gym-stat-lbl">kcal</span></div>
          <div class="gym-stat"><span class="gym-stat-val">${day.protein}g</span><span class="gym-stat-lbl">proteína</span></div>
        </div>
      </div>`;
    return;
  }

  banner.innerHTML = `
    <div class="gym-banner-inner">
      <div class="gym-banner-left">
        <div class="gym-banner-icon">${day.workout.icon}</div>
        <div>
          <div class="gym-banner-title">${displayText(day.workout.name)}</div>
          <div class="gym-banner-sub">Entreno ${trainingTime}${preMeal ? " · Pre-entreno " + preMeal.time : ""} · ${displayText(day.title)}</div>
        </div>
      </div>
      <div class="gym-banner-stats">
        <div class="gym-stat"><span class="gym-stat-val">${day.kcal}</span><span class="gym-stat-lbl">kcal</span></div>
        <div class="gym-stat"><span class="gym-stat-val">${day.protein}g</span><span class="gym-stat-lbl">proteína</span></div>
        <div class="gym-stat"><span class="gym-stat-val">${day.carbs}g</span><span class="gym-stat-lbl">carbos</span></div>
      </div>
    </div>`;
}

function updateNextMeal() {
  const now = new Date();
  const todayObj = getTodayDayObject();
  const viewedDay = days.find((item) => item.id === activeDay) || todayObj;
  const scheduleDay = todayObj || viewedDay;
  const next = scheduleDay.meals.find((item) => {
    const [hour, minute] = item.time.split(":").map(Number);
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    return target > now;
  });
  const el = document.querySelector("#next-meal");
  const labelEl = document.querySelector("#next-meal-label");
  if (labelEl) {
    labelEl.textContent = viewedDay.id === scheduleDay.id
      ? "⏰ Hoy · próxima comida"
      : `⏰ Hoy real · viendo ${displayText(viewedDay.title)}`;
  }
  if (el) {
    if (next) {
      const [h, mn] = next.time.split(":").map(Number);
      const target = new Date();
      target.setHours(h, mn, 0, 0);
      const diffMin = Math.round((target - now) / 60000);
      const hoursLeft = Math.floor(diffMin / 60);
      const minsLeft = diffMin % 60;
      const timeLeft = hoursLeft > 0 ? `en ${hoursLeft}h ${minsLeft}min` : `en ${minsLeft} min`;
      const context = viewedDay.id === scheduleDay.id
        ? ""
        : `<span class="next-meal-context">La tarjeta sigue anclada a hoy para no mezclar horarios ficticios.</span>`;
      el.innerHTML = `Próxima: <strong>${next.time}</strong> · ${displayText(next.name)} <span class="next-meal-time">${timeLeft}</span>${context}`;
    } else {
      const suffix = viewedDay.id === scheduleDay.id
        ? "Ya no quedan comidas para hoy. Descansá bien."
        : `Hoy ya cerró. Seguís viendo ${displayText(viewedDay.title)}.`;
      el.textContent = suffix;
    }
  }
  // FIX: actualizar la clase is-upcoming sin re-renderizar todo el día (preserva estado abierto/cerrado)
  updateUpcomingClass();
  updateFabBadge();
}

function updateUpcomingClass() {
  const day = days.find((d) => d.id === activeDay);
  if (!day) return;
  const todayObj = getTodayDayObject();
  const isViewingToday = day.id === todayObj.id;

  // Limpiar clases viejas
  document.querySelectorAll(".meal.is-upcoming").forEach((m) => m.classList.remove("is-upcoming"));
  document.querySelectorAll(".upcoming-tag").forEach((t) => t.remove());

  if (!isViewingToday) return;

  day.meals.forEach((m) => {
    if (isUpcomingMeal(m, day)) {
      // Buscar la card de esta meal en el DOM
      const checkBtn = document.querySelector(`[onclick*="toggleMealCheck"][onclick*="'${m.id}'"]`);
      const meal = checkBtn?.closest(".meal");
      if (meal && !meal.classList.contains("is-upcoming")) {
        meal.classList.add("is-upcoming");
        // Insertar el tag visual al principio
        const tag = document.createElement("div");
        tag.className = "upcoming-tag";
        tag.textContent = "⏰ Toca ahora";
        meal.insertBefore(tag, meal.firstChild);
      }
    }
  });
}

// =====================================================
// AGUA (10 vasos · 2.5L)
// =====================================================
function getWaterState() {
  const saved = readJsonStorage(STORAGE.water, {});
  return saved.date === getTodayKey() ? saved.count : 0;
}

function setWater(count) {
  const prevCount = getWaterState();
  localStorage.setItem(STORAGE.water, JSON.stringify({ date: getTodayKey(), count }));
  renderWater();
  if (count === WATER_GOAL && prevCount < WATER_GOAL) {
    celebrateWaterGoal();
  } else if (count > prevCount) {
    // Mini animación al llenar vaso
    const dots = document.querySelectorAll(".water-dot.active");
    const lastDot = dots[dots.length - 1];
    if (lastDot) {
      lastDot.classList.add("just-filled");
      setTimeout(() => lastDot.classList.remove("just-filled"), 500);
    }
  }
}

function celebrateWaterGoal() {
  const confetti = document.createElement("div");
  confetti.className = "confetti-burst water-burst";
  confetti.innerHTML = "💧 💧 💧 ✨ ⭐️";
  document.body.appendChild(confetti);
  setTimeout(() => confetti.remove(), 1800);
  showToast("💧 ¡10 vasos cumplidos! Bien hidratado.");
}

function renderWater() {
  const count = getWaterState();
  const labelEl = document.querySelector("#water-label");
  const dotsEl = document.querySelector("#water-dots");
  if (labelEl) labelEl.textContent = `${count}/${WATER_GOAL} vasos`;
  if (dotsEl) {
    dotsEl.innerHTML = Array.from({ length: WATER_GOAL }, (_, index) => {
      const filled = index < count;
      const onClick = filled && index === count - 1 ? `setWater(${index})` : `setWater(${index + 1})`;
      const action = filled && index === count - 1 ? "quitar" : "marcar";
      return `<button class="water-dot ${filled ? "active" : ""}" type="button" onclick="${onClick}" aria-pressed="${filled}" aria-label="${action} vaso ${index + 1} de ${WATER_GOAL}">${index + 1}</button>`;
    }).join("");
  }
}

// =====================================================
// RESET DÍA
// =====================================================
function resetDay() {
  if (!confirm("¿Resetear todas las marcas y el agua del día?")) return;
  saveDayState({});
  localStorage.removeItem(`goal-celebrated-${getTodayKey()}`);
  setWater(0);
  renderActiveDay();
  renderWeekOverview();
  updateStreak();
  updateFabBadge();
  showToast("Día reseteado");
}

// =====================================================
// STREAK
// =====================================================
function getStreakEmoji(count) {
  if (count >= 30) return "🔥🔥🔥";
  if (count >= 14) return "🔥🔥";
  if (count >= 7) return "🔥";
  if (count >= 3) return "✨";
  return "";
}

function updateStreak() {
  const today = getTodayKey();
  const streak = readJsonStorage(STORAGE.streak, {});
  const todayDoneCount = countDoneMealsFromState(getDayState());
  const todayQualifies = todayDoneCount >= 4;

  // Si hoy NO califica pero el last era hoy, lo sacamos del registro
  // (significa que destildaste hasta bajar de 4 — el día de hoy ya no cuenta)
  if (!todayQualifies && streak.last === today) {
    // Buscamos cuál era el streak antes de marcarlo hoy
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatLocalDateKey(yesterday);
    if (streak.previousLast === yesterdayKey) {
      streak.count = streak.previousCount || 0;
      streak.last = streak.previousLast;
    } else {
      streak.count = 0;
      streak.last = null;
    }
  } else if (todayQualifies && streak.last !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatLocalDateKey(yesterday);

    // Guardamos el estado anterior para poder revertir si desmarca
    streak.previousLast = streak.last;
    streak.previousCount = streak.count || 0;

    if (streak.last === yesterdayKey) {
      streak.count = (streak.count || 0) + 1;
    } else {
      streak.count = 1;
    }
    streak.last = today;

    // Si llegó a un milestone, lo celebramos
    if ([3, 7, 14, 30, 60, 90].includes(streak.count)) {
      celebrateStreak(streak.count);
    }
  }

  localStorage.setItem(STORAGE.streak, JSON.stringify(streak));
  const count = streak.count || 0;
  const badge = document.querySelector("#streak-badge");
  if (badge) {
    const emoji = getStreakEmoji(count);
    const level = count >= 30 ? "gold" : count >= 14 ? "silver" : count >= 7 ? "fire" : count >= 3 ? "warm" : "cold";
    badge.className = `sb-streak streak-${level}`;
    badge.innerHTML = `<span class="streak-num">${count}</span><span class="streak-label">días seguidos${emoji ? " " + emoji : ""}</span>`;
    // Mirror to topbar
    const mirror = document.querySelector("#topbar-streak-mirror");
    if (mirror) mirror.innerHTML = badge.innerHTML;
  }
}

function celebrateStreak(count) {
  showToast(`🎉 ¡${count} días seguidos! Seguís firme.`);
}

// =====================================================
// TRACKER DE PESO
// =====================================================
function getWeightHistory() {
  return readJsonStorage(STORAGE.weight, []);
}

// Compatibilidad: antes se precargaba 78kg. Desde ahora el primer peso lo carga Rony.
function seedInitialWeight() {
  if (localStorage.getItem(STORAGE.weightSeeded) === "1") return;
  const history = getWeightHistory();
  if (history.length > 0) {
    localStorage.setItem(STORAGE.weightSeeded, "1");
    return;
  }
  localStorage.setItem(STORAGE.weightSeeded, "1");
}

function saveWeight() {
  const input = document.querySelector("#weight-input");
  // FIX: aceptar coma como separador decimal (Argentina usa coma, ej: "78,5")
  const rawValue = String(input.value).replace(",", ".").trim();
  const val = parseFloat(rawValue);
  if (!val || val < 30 || val > 200 || isNaN(val)) {
    showToast("Ingresá un peso válido (kg)");
    return;
  }
  const history = getWeightHistory();
  const today = getTodayKey();
  const existing = history.findIndex((h) => h.date === today);
  if (existing >= 0) {
    history[existing].kg = val;
  } else {
    history.push({ date: today, kg: val });
  }
  history.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(STORAGE.weight, JSON.stringify(history));
  input.value = "";
  renderWeightTracker();
  showToast(`Peso guardado: ${val} kg`);
}

function renderWeightTracker() {
  const history = getWeightHistory();
  const wrap = document.querySelector("#weight-history");
  if (!wrap) return;

  if (history.length === 0) {
    wrap.innerHTML = '<p class="weight-empty">Todavía no registraste pesos. Pesate cada lunes en ayunas.</p>';
    return;
  }

  const recent = history.slice(-6);
  const first = history[0];
  const last = history[history.length - 1];
  const diff = (last.kg - first.kg).toFixed(1);
  const diffSign = diff >= 0 ? "+" : "";
  const weeks = Math.max(1, Math.floor((new Date(last.date) - new Date(first.date)) / (7 * 86400000)));

  // Lógica para mantenimiento 78-80kg
  let suggestion = "";
  const currentKg = last.kg;
  if (currentKg > 80) {
    suggestion = `<div class="weight-alert">⚠️ Pasaste tu límite (80kg). <strong>Achicá 1 porción de carbo</strong> en el almuerzo o cena (½ papa, ½ taza arroz, sacá 1 tostada) hasta volver al rango 78-80kg.</div>`;
  } else if (currentKg < 77) {
    suggestion = `<div class="weight-alert">⚠️ Bajaste del rango (78-80kg). <strong>Sumá 200 kcal/día</strong>: agregá una merienda real o reforzá una comida base con 2 tostadas con jamón y queso, 1 porción chica de tortilla/tarta casera o ½ taza extra de arroz/papa en el almuerzo.</div>`;
  } else if (currentKg >= 78 && currentKg <= 80) {
    suggestion = `<div class="weight-good">✓ Mantenimiento perfecto. Estás en ${currentKg}kg, dentro del rango 78-80kg.</div>`;
  } else if (currentKg >= 77 && currentKg < 78) {
    suggestion = `<div class="weight-good">⚪ Casi en rango. ${currentKg}kg — sumá una merienda extra esta semana para volver a 78-80kg.</div>`;
  }

  // SVG chart — últimos 8 registros
  const chartData = history.slice(-8);
  const W = 340, H = 120, PAD = { t: 14, r: 10, b: 28, l: 36 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  // Rango: incluir siempre la zona 78-80 en el eje Y
  const allKg = chartData.map(h => h.kg);
  const yMin = Math.min(Math.min(...allKg) - 0.5, 77.5);
  const yMax = Math.max(Math.max(...allKg) + 0.5, 80.5);
  const yRange = yMax - yMin;

  const toX = (i) => PAD.l + (i / Math.max(chartData.length - 1, 1)) * innerW;
  const toY = (kg) => PAD.t + innerH - ((kg - yMin) / yRange) * innerH;

  // Zona verde 78-80 kg
  const zoneY1 = toY(80); const zoneY2 = toY(78);

  // Línea principal
  const points = chartData.map((h, i) => `${toX(i).toFixed(1)},${toY(h.kg).toFixed(1)}`).join(" ");

  // Área bajo la línea (gradiente)
  const areaPoints = [
    `${toX(0).toFixed(1)},${(PAD.t + innerH).toFixed(1)}`,
    ...chartData.map((h, i) => `${toX(i).toFixed(1)},${toY(h.kg).toFixed(1)}`),
    `${toX(chartData.length - 1).toFixed(1)},${(PAD.t + innerH).toFixed(1)}`
  ].join(" ");

  // Labels Y (78, 79, 80)
  const yLabels = [78, 79, 80].map(kg => `
    <text x="${PAD.l - 5}" y="${toY(kg).toFixed(1)}" text-anchor="end" dominant-baseline="middle"
      fill="rgba(100,120,160,0.7)" font-size="8" font-family="sans-serif">${kg}</text>
    <line x1="${PAD.l}" y1="${toY(kg).toFixed(1)}" x2="${W - PAD.r}" y2="${toY(kg).toFixed(1)}"
      stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
  `).join("");

  // Puntos y etiquetas
  const dotEls = chartData.map((h, i) => {
    const cx = toX(i).toFixed(1), cy = toY(h.kg).toFixed(1);
    const isLast = i === chartData.length - 1;
    const inZone = h.kg >= 78 && h.kg <= 80;
    const dotColor = inZone ? "#00e5a0" : (h.kg > 80 ? "#ff6b5f" : "#f59e0b");
    const [, , d] = h.date.split("-").map(Number);
    const [,mon] = h.date.split("-").map(Number);
    return `
      <circle cx="${cx}" cy="${cy}" r="${isLast ? 5 : 3.5}" fill="${dotColor}"
        stroke="${isLast ? 'rgba(255,255,255,0.3)' : 'none'}" stroke-width="${isLast ? 2 : 0}"/>
      ${isLast ? `<circle cx="${cx}" cy="${cy}" r="9" fill="${dotColor}" opacity="0.18"/>` : ''}
      <text x="${cx}" y="${(PAD.t + innerH + 16).toFixed(1)}" text-anchor="middle"
        fill="rgba(100,120,160,0.8)" font-size="7.5" font-family="sans-serif">${d}/${mon}</text>
      ${isLast ? `<text x="${cx}" y="${(+cy - 10).toFixed(1)}" text-anchor="middle"
        fill="${dotColor}" font-size="9" font-weight="700" font-family="sans-serif">${h.kg}</text>` : ''}
    `;
  }).join("");

  const svgChart = `
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="overflow:visible;display:block;margin-top:12px">
      <defs>
        <linearGradient id="wgArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(79,139,255,0.25)"/>
          <stop offset="100%" stop-color="rgba(79,139,255,0)"/>
        </linearGradient>
      </defs>
      <!-- Zona 78-80 kg -->
      <rect x="${PAD.l}" y="${zoneY1.toFixed(1)}" width="${innerW}" height="${(zoneY2 - zoneY1).toFixed(1)}"
        fill="rgba(0,229,160,0.08)" rx="2"/>
      <text x="${(W - PAD.r - 2)}" y="${((zoneY1 + zoneY2) / 2).toFixed(1)}"
        text-anchor="end" dominant-baseline="middle"
        fill="rgba(0,229,160,0.55)" font-size="7.5" font-family="sans-serif" font-weight="600">78–80</text>
      <!-- Grid Y -->
      ${yLabels}
      <!-- Área -->
      <polygon points="${areaPoints}" fill="url(#wgArea)"/>
      <!-- Línea -->
      <polyline points="${points}" fill="none" stroke="#4f8bff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <!-- Puntos -->
      ${dotEls}
    </svg>
  `;

  wrap.innerHTML = `
    <div class="weight-summary">
      <div class="ws-current">
        <div class="ws-val">${last.kg} <span class="ws-unit">kg</span></div>
        <div class="ws-lbl">peso actual</div>
      </div>
      <div class="ws-change ${diff >= 0 ? "up" : "down"}">
        <div class="ws-val">${diffSign}${diff} <span class="ws-unit">kg</span></div>
        <div class="ws-lbl">en ${weeks} sem</div>
      </div>
      <div class="ws-range">
        <div class="ws-val ${last.kg >= 78 && last.kg <= 80 ? 'in-range' : 'out-range'}">
          ${last.kg >= 78 && last.kg <= 80 ? '✓' : '↑↓'} 78–80
        </div>
        <div class="ws-lbl">objetivo</div>
      </div>
    </div>
    ${suggestion}
    ${svgChart}
  `;
}

// =====================================================
// NOTIFICACIONES
// =====================================================
function clearScheduledNotifs() {
  scheduledNotifs.forEach((id) => clearTimeout(id));
  scheduledNotifs = [];
}

function scheduleMealNotifs() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  clearScheduledNotifs();

  const day = getTodayDayObject();
  const now = new Date();

  day.meals.forEach((m) => {
    const [h, mn] = m.time.split(":").map(Number);
    const target = new Date();
    target.setHours(h, mn, 0, 0);
    const diff = target - now;
    if (diff <= 0) return;
    const id = setTimeout(() => {
      new Notification(`${displayText(m.label)} · ${m.time}`, {
        body: `${displayText(m.name)} · ${m.kcal} kcal`,
        tag: `meal-${m.id}`
      });
      updateNextMeal();
    }, diff);
    scheduledNotifs.push(id);
  });

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let reminderMinute = WATER_REMINDER_START_MIN;
  if (nowMinutes >= WATER_REMINDER_START_MIN) {
    const blocks = Math.floor((nowMinutes - WATER_REMINDER_START_MIN) / WATER_REMINDER_INTERVAL_MIN) + 1;
    reminderMinute = WATER_REMINDER_START_MIN + blocks * WATER_REMINDER_INTERVAL_MIN;
  }
  while (reminderMinute <= WATER_REMINDER_END_MIN) {
    const waterTime = new Date();
    waterTime.setHours(Math.floor(reminderMinute / 60), reminderMinute % 60, 0, 0);
    const diff = waterTime - now;
    if (diff > 0) {
      const id = setTimeout(() => {
        new Notification("💧 Hora de tomar agua", { body: "Acordate de hidratarte", tag: "water" });
      }, diff);
      scheduledNotifs.push(id);
    }
    reminderMinute += WATER_REMINDER_INTERVAL_MIN;
  }
}

function activarNotificaciones() {
  // iOS Safari: las notificaciones solo funcionan si está instalada como PWA
  if (isIOS() && !isStandalone()) {
    alert(
      "📱 En iPhone primero tenés que instalar la app:\n\n" +
      "1. Tocá el botón Compartir (⎙) de Safari\n" +
      "2. Bajá y elegí 'Agregar a pantalla de inicio'\n" +
      "3. Abrí la app desde el ícono y volvé a tocar 'Activar notificaciones'\n\n" +
      "Después sí van a funcionar las alarmas de comidas."
    );
    return;
  }

  if (!("Notification" in window)) {
    showToast("Tu navegador no permite notificaciones.");
    return;
  }

  if (Notification.permission === "granted") {
    scheduleMealNotifs();
    showToast("Notificaciones activas");
    document.querySelector("#notif-btn").textContent = "🔔 Notificaciones activas ✓";
    return;
  }

  if (Notification.permission === "denied") {
    showToast("Notificaciones bloqueadas. Habilitalas en el navegador.");
    return;
  }

  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      scheduleMealNotifs();
      new Notification("Dieta activada", { body: "Te aviso en cada comida y para tomar agua." });
      document.querySelector("#notif-btn").textContent = "🔔 Notificaciones activas ✓";
    }
  });
}

// =====================================================
// iOS DETECTION & PWA INSTALL BANNER
// =====================================================
function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) && !window.MSStream;
}

function isStandalone() {
  return ("standalone" in window.navigator && window.navigator.standalone) ||
    window.matchMedia("(display-mode: standalone)").matches;
}

// iOS install banner removed — no longer shown

// =====================================================
// FAB · botón flotante "Ir al día de hoy"
// =====================================================
function setupDayFab() {
  const fab = document.querySelector("#day-fab");
  if (!fab) return;

  function checkVisibility() {
    const dayContainer = document.querySelector("#day-container");
    if (!dayContainer) return;
    const rect = dayContainer.getBoundingClientRect();
    const panelTopVisible = rect.top >= 0 && rect.top < window.innerHeight * 0.4;
    fab.classList.toggle("show", !panelTopVisible);
  }

  window.addEventListener("scroll", checkVisibility, { passive: true });

  // Update sidebar nav active item on scroll
  const navSections = [
    { id: "plan-section",   href: "#plan-section" },
    { id: "supp-section",   href: "#supp-section" },
    { id: "weight-section", href: "#weight-section" },
    { id: "shopping-list",  href: "#shopping-list" },
    { id: "review-section", href: "#review-section" }
  ];
  function updateSidebarNav() {
    const scrollY = window.scrollY + 120;
    let current = navSections[0].href;
    for (const s of navSections) {
      const el = document.getElementById(s.id);
      if (el && el.offsetTop <= scrollY) current = s.href;
    }
    document.querySelectorAll(".sb-nav-item").forEach(a => {
      a.classList.toggle("sb-nav-active", a.getAttribute("href") === current);
    });
  }
  window.addEventListener("scroll", updateSidebarNav, { passive: true });

  // FIX: ignorar resize cuando hay input enfocado (teclado iOS dispara resize y causaba flicker)
  let resizeTimeout;
  window.addEventListener("resize", () => {
    if (document.activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(checkVisibility, 200);
  });
  checkVisibility();
}

function updateFabBadge() {
  const fab = document.querySelector("#day-fab");
  if (!fab) return;
  const todayObj = getTodayDayObject();
  const allMeals = readJsonStorage(STORAGE.meals, {});
  const todayState = allMeals[getTodayKey()] || {};
  const doneCount = countDoneMealsFromState(todayState, getMealIdSetForDay(todayObj));
  const totalCount = todayObj.meals.length;
  const remaining = totalCount - doneCount;

  let badge = fab.querySelector(".day-fab-badge");
  if (remaining > 0 && doneCount > 0 && doneCount < totalCount) {
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "day-fab-badge";
      fab.appendChild(badge);
    }
    badge.textContent = remaining;
  } else if (badge) {
    badge.remove();
  }
}

function scrollToTodayPanel() {
  const todayObj = getTodayDayObject();
  // Si el día activo no es el de hoy, cambiarlo
  if (todayObj.id !== activeDay) {
    setActiveDay(todayObj.id);
  }
  // Scrollear al panel después del re-render
  setTimeout(() => {
    const dayContainer = document.querySelector("#day-container");
    if (dayContainer) {
      const headerOffset = 12;
      const elementPosition = dayContainer.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - headerOffset,
        behavior: "smooth"
      });
    }
  }, 80);
}
window.scrollToTodayPanel = scrollToTodayPanel;

// =====================================================
// WEEK OVERVIEW · resumen semanal con cumplimiento por día
// =====================================================
function getDayStateForDate(dateKey, allMealsCache) {
  const all = allMealsCache || readJsonStorage(STORAGE.meals, {});
  return all[dateKey] || {};
}

function getWeekDates() {
  // Lunes a domingo de la semana actual
  const today = new Date();
  const todayDay = today.getDay() === 0 ? 7 : today.getDay(); // Mon=1...Sun=7
  const monday = new Date(today);
  monday.setDate(today.getDate() - (todayDay - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return formatLocalDateKey(d);
  });
}

function getDateKeyForDayId(dayId) {
  const dayOrder = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];
  const index = dayOrder.indexOf(dayId);
  return getWeekDates()[index] || getTodayKey();
}

function readFridayModes() {
  const raw = localStorage.getItem(STORAGE.fridayMode);
  if (!raw) return {};
  if (raw === "rest") return { [getTodayKey()]: "rest" };
  if (raw === "gym") return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    localStorage.removeItem(STORAGE.fridayMode);
    return {};
  }
}

function getFridayModeForDay(dayId = "vie") {
  if (dayId !== "vie") return "gym";
  return readFridayModes()[getDateKeyForDayId(dayId)] === "rest" ? "rest" : "gym";
}

function writeFridayModeForDay(dayId, mode) {
  const modes = readFridayModes();
  const dateKey = getDateKeyForDayId(dayId);
  if (mode === "rest") modes[dateKey] = "rest";
  else delete modes[dateKey];
  localStorage.setItem(STORAGE.fridayMode, JSON.stringify(modes));
}

function renderWeekOverview() {
  const grid = document.querySelector("#week-overview-grid");
  if (!grid) return;
  const weekDates = getWeekDates();
  const todayKey = getTodayKey();
  const dayOrder = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];

  // FIX: leer el localStorage UNA sola vez, no 7 veces (uno por día)
  const allMealsCache = readJsonStorage(STORAGE.meals, {});

  grid.innerHTML = dayOrder.map((dayId, i) => {
    const dayDef = days.find((d) => d.id === dayId);
    const dateKey = weekDates[i];
    const state = getDayStateForDate(dateKey, allMealsCache);
    const doneCount = countDoneMealsFromState(state, getMealIdSetForDay(dayDef));
    const totalMeals = dayDef.meals.length;
    const isToday = dateKey === todayKey;
    const isComplete = doneCount >= 4;
    const dots = Array.from({ length: totalMeals }, (_, idx) =>
      `<span class="wo-dot ${idx < doneCount ? "done" : ""}"></span>`
    ).join("");

    // SVG ring progress
    const R = 18, CIRC = 2 * Math.PI * R;
    const pct = totalMeals > 0 ? doneCount / totalMeals : 0;
    const dash = (pct * CIRC).toFixed(2);
    const ringColor = isComplete ? "#00e5a0" : isToday ? "#4f8bff" : "rgba(79,139,255,0.45)";
    const trackColor = "rgba(255,255,255,0.07)";
    const ringEl = `
      <svg width="44" height="44" viewBox="0 0 44 44" class="wo-ring">
        <circle cx="22" cy="22" r="${R}" fill="none" stroke="${trackColor}" stroke-width="3.5"/>
        <circle cx="22" cy="22" r="${R}" fill="none" stroke="${ringColor}" stroke-width="3.5"
          stroke-dasharray="${dash} ${CIRC.toFixed(2)}"
          stroke-dashoffset="0" stroke-linecap="round"
          transform="rotate(-90 22 22)"
          class="wo-ring-fill"/>
        <text x="22" y="22" text-anchor="middle" dominant-baseline="middle"
          fill="${ringColor}" font-size="9.5" font-weight="800" font-family="sans-serif">${doneCount}/${totalMeals}</text>
      </svg>
    `;

    return `
      <button class="wo-day ${isToday ? "is-today" : ""} ${isComplete ? "complete" : ""} ${dayDef.isRestDay ? "rest-day" : ""}" type="button" onclick="setActiveDay('${dayId}')" aria-label="Ver ${displayText(dayDef.title)}: ${doneCount} de ${totalMeals} comidas">
        <div class="wo-tab">${dayDef.tab}</div>
        <div class="wo-icon">${dayDef.workout.icon}</div>
        ${ringEl}
      </button>
    `;
  }).join("");
}

// =====================================================
// EXPORTAR A CALENDARIO (.ics) · notificaciones reales en iPhone
// =====================================================
const ICS_RRULE_DAY = { 1: "MO", 2: "TU", 3: "WE", 4: "TH", 5: "FR", 6: "SA", 7: "SU" };

function pad2(n) { return String(n).padStart(2, "0"); }

function formatICSLocal(date) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}T${pad2(date.getHours())}${pad2(date.getMinutes())}00`;
}

function nextOccurrenceOfDay(targetDayIndex) {
  // targetDayIndex: 0=dom, 1=lun, ..., 6=sab
  const today = new Date();
  let diff = targetDayIndex - today.getDay();
  if (diff < 0) diff += 7;
  const next = new Date(today);
  next.setDate(today.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getCurrentPlanWeekStart() {
  return getPlanWeekStart(new Date());
}

function escapeICS(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function generateICS() {
  const TZ = "America/Argentina/Buenos_Aires";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rony Cozzi//Dieta Gym//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Dieta Rony · Comidas",
    `X-WR-TIMEZONE:${TZ}`
  ];

  // Eventos de comidas (semanales recurrentes) — las 4 semanas del menú rotativo
  // RRULE exporta solo la semana correspondiente usando BYDAY. Para menus rotativos
  // usamos el lunes de la semana actual como ancla para no mezclar semanas al importar a mitad de semana.
  const currentPlanWeekStart = getCurrentPlanWeekStart();
  allWeeks.forEach((weekDays, wi) => {
    weekDays.forEach((day) => {
      day.meals.forEach((m) => {
        const [h, mn] = m.time.split(":").map(Number);
        // FIX: cada semana del menú rotativo queda como bloque lunes-domingo.
        const startDate = new Date(currentPlanWeekStart);
        startDate.setDate(currentPlanWeekStart.getDate() + wi * 7 + (day.dayIndex - 1));
        startDate.setHours(h, mn, 0, 0);
        const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
        // UID único por semana para evitar colisiones entre semanas del menú
        const uid = `${m.id}-${day.id}@dieta-rony`;

        lines.push(
          "BEGIN:VEVENT",
          `UID:${uid}`,
          `SUMMARY:🍽️ [S${wi+1}] ${escapeICS(displayText(m.label))}: ${escapeICS(displayText(m.name))}`,
          `DESCRIPTION:${escapeICS("Semana " + (wi+1) + " · " + m.kcal + " kcal · " + displayText(m.desc))}`,
          `DTSTART;TZID=${TZ}:${formatICSLocal(startDate)}`,
          `DTEND;TZID=${TZ}:${formatICSLocal(endDate)}`,
          `RRULE:FREQ=WEEKLY;INTERVAL=4;BYDAY=${ICS_RRULE_DAY[day.dayIndex]}`,
          "BEGIN:VALARM",
          "TRIGGER:-PT5M",
          "ACTION:DISPLAY",
          `DESCRIPTION:${escapeICS(displayText(m.label) + ": " + displayText(m.name))}`,
          "END:VALARM",
          "END:VEVENT"
        );
      });
    });
  });

  // Recordatorios de agua diarios cada 90 minutos (9:00 a 21:00)
  for (let minute = WATER_REMINDER_START_MIN; minute <= WATER_REMINDER_END_MIN; minute += WATER_REMINDER_INTERVAL_MIN) {
    const h = Math.floor(minute / 60);
    const min = minute % 60;
    const start = nextOccurrenceOfDay(new Date().getDay());
    start.setHours(h, min, 0, 0);
    const end = new Date(start.getTime() + 5 * 60 * 1000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:water-${h}-${String(min).padStart(2, "0")}@dieta-rony`,
      "SUMMARY:💧 Tomar agua",
      "DESCRIPTION:Acordate de hidratarte. Meta diaria: 10 vasos (2.5L).",
      `DTSTART;TZID=${TZ}:${formatICSLocal(start)}`,
      `DTEND;TZID=${TZ}:${formatICSLocal(end)}`,
      "RRULE:FREQ=DAILY",
      "BEGIN:VALARM",
      "TRIGGER:PT0M",
      "ACTION:DISPLAY",
      "DESCRIPTION:💧 Hora de tomar agua",
      "END:VALARM",
      "END:VEVENT"
    );
  }

  // Recordatorio de pesarse los lunes a las 9:00
  const monday = nextOccurrenceOfDay(1);
  monday.setHours(9, 0, 0, 0);
  const mondayEnd = new Date(monday.getTime() + 5 * 60 * 1000);
  lines.push(
    "BEGIN:VEVENT",
    "UID:weigh-monday@dieta-rony",
    "SUMMARY:⚖️ Pesarte (en ayunas)",
    "DESCRIPTION:Pesate antes de desayunar. Después abrí la app y guardalo en el tracker.",
    `DTSTART;TZID=${TZ}:${formatICSLocal(monday)}`,
    `DTEND;TZID=${TZ}:${formatICSLocal(mondayEnd)}`,
    "RRULE:FREQ=WEEKLY;BYDAY=MO",
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    "DESCRIPTION:⚖️ Pesarte hoy",
    "END:VALARM",
    "END:VEVENT"
  );

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function downloadICS() {
  const ics = generateICS();
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dieta-rony.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("📅 Calendario descargado · Tocalo para importar");
}

function showCalendarHelp() {
  const isIOSDevice = isIOS();
  let message;
  if (isIOSDevice) {
    message =
      "📅 PARA IPHONE:\n\n" +
      "1. Tocá 'Descargar calendario' abajo\n" +
      "2. iOS te va a preguntar dónde abrir el archivo\n" +
      "3. Elegí 'Calendario'\n" +
      "4. Tocá 'Aceptar' y 'OK'\n\n" +
      "Listo: a partir de ahora vas a recibir notificaciones nativas del iPhone para cada comida (5 min antes), agua cada 90 min y pesarte los lunes — TODO funciona aunque la app esté cerrada.\n\n" +
      "Si después modificamos el plan, volvés a descargar y los eventos se actualizan automáticamente (mismos IDs).";
  } else {
    message =
      "📅 ARCHIVO DE CALENDARIO\n\n" +
      "Tocá 'Descargar' y se baja un archivo .ics que podés importar a:\n" +
      "• Calendario de iPhone (lo mejor)\n" +
      "• Google Calendar\n" +
      "• Outlook\n\n" +
      "Vas a recibir notificaciones nativas del sistema sin necesidad de abrir esta app.";
  }
  if (confirm(message + "\n\n¿Descargar ahora?")) {
    downloadICS();
  }
}
window.showCalendarHelp = showCalendarHelp;
window.downloadICS = downloadICS;

// =====================================================
// COMPARTIR EL DÍA · WhatsApp / Share API
// =====================================================
function shareDay() {
  const day = days.find((d) => d.id === activeDay);
  if (!day) return;

  const lines = [];
  lines.push(`🍽️ DIETA · ${displayText(day.title).toUpperCase()}`);
  lines.push(`${day.workout.icon} ${displayText(day.type)}`);
  lines.push(`📊 ${day.kcal} kcal · ${day.protein}g P · ${day.carbs}g C · ${day.fats}g G`);
  lines.push("");

  day.meals.forEach((m) => {
    const selected = getSelectedMeal(m);
    const selectedLabel = selected === m ? "" : " [Opcion B elegida]";
    lines.push(`*${m.time}* — ${displayText(m.label)}`);
    lines.push(`▸ ${displayText(selected.name)}${selectedLabel} (${selected.kcal} kcal)`);
    lines.push(`  ${displayText(selected.desc)}`);
    lines.push("");
  });

  lines.push(`💡 ${displayText(day.tip)}`);

  const text = lines.join("\n");

  if (navigator.share) {
    navigator.share({
      title: `Dieta · ${displayText(day.title)}`,
      text
    }).catch(() => copyToClipboard(text));
  } else {
    copyToClipboard(text);
  }
}

// =====================================================
// INIT
// =====================================================
const notifBtn = document.querySelector("#notif-btn");
if (notifBtn) notifBtn.addEventListener("click", activarNotificaciones);
const resetBtn = document.querySelector("#reset-btn");
if (resetBtn) resetBtn.addEventListener("click", resetDay);
const shareDayBtn = document.querySelector("#share-day-btn");
if (shareDayBtn) shareDayBtn.addEventListener("click", shareDay);
const shoppingBtn = document.querySelector("#shopping-btn");
if (shoppingBtn) shoppingBtn.addEventListener("click", () => {
  setShoppingPanelExpanded(!isShoppingPanelExpanded(), { scrollIntoView: true });
});

const weightBtn = document.querySelector("#weight-save-btn");
if (weightBtn) weightBtn.addEventListener("click", saveWeight);

window.setActiveDay = setActiveDay;
window.toggleMeal = toggleMeal;
window.toggleMealCheck = toggleMealCheck;
window.togglePrep = togglePrep;
window.toggleShop = toggleShop;
window.setWater = setWater;
window.resetShopping = resetShopping;
window.exportShopping = exportShopping;
window.setFridayMode = setFridayMode;
window.quickCheckCurrentMeal = quickCheckCurrentMeal;
window.saveWeight = saveWeight;

// Cleanup de localStorage viejo antes que nada
cleanupOldData();
rebuildPlanForDate(new Date(), { audit: true });
// Segundo pase: algunos días quedan por arriba del maxComfort recién después de ajustes del primer pase.

// FIX BUG NUTRICIONAL: sincronizar los targets del día con la suma REAL de los foods.
// Antes los targets (kcal/protein/carbs/fats del header del día) estaban hardcoded
// y NO coincidían con la suma de los foods. Eso causaba que el progress bar mostrara
// menos kcal de las que el usuario realmente consumía si seguía las cantidades del plan.
// Ahora los targets reflejan exactamente lo que sumás si seguís el plan al pie de la letra.

// FIX: Sincronizar targets + prefixar IDs de comidas con índice de semana
// Esto evita colisiones en localStorage cuando la misma comida aparece en varias semanas


const todayObj = getTodayDayObject();
activeDay = todayObj.id;

// Set greeting/time-of-day antes que nada para evitar flicker
updateGreeting();

renderTabs();
renderActiveDay();
renderWater();
renderRules();
renderShopping();
renderSupplements();
seedInitialWeight();
renderWeightTracker();
renderWeekOverview();
setupDayFab();
updateClock();
updateNextMeal();
updateGymBanner();
updateStreak();
// Intervals con manejo de visibilidad: pausan cuando la página está en background (ahorra batería en mobile)
let clockInterval = null;
let nextMealInterval = null;
let greetingInterval = null;
let dayChangeInterval = null;
let lastCheckedDayKey = getTodayKey();

function syncCurrentPlanDate(reason = "timer") {
  // La PWA puede quedar suspendida varios dias; al volver sincronizamos dia y semana real.
  const currentKey = getTodayKey();
  const now = new Date();
  const newWeekIndex = getWeekIndex(now);
  const newWeekKey = `${newWeekIndex}:${formatLocalDateKey(getCurrentPlanWeekStart())}`;
  const storedWeek = localStorage.getItem(STORAGE.planWeek);
  const dayChanged = currentKey !== lastCheckedDayKey;
  const weekChanged = newWeekIndex !== weekIndex || storedWeek !== newWeekKey;

  if (!dayChanged && !weekChanged) return false;

  lastCheckedDayKey = currentKey;
  rebuildPlanForDate(now);
  localStorage.setItem(STORAGE.planWeek, newWeekKey);

  currentWeekName = getCurrentWeekName();
  const todayObj = getTodayDayObject();
  activeDay = todayObj.id;

  renderTabs();
  renderActiveDay();
  renderWeekOverview();
  renderShopping();
  updateNextMeal();
  updateGymBanner();
  updateFabBadge();

  if ("Notification" in window && Notification.permission === "granted") {
    scheduleMealNotifs();
  }

  if (weekChanged && reason !== "initial") {
    showToast(`Menú actualizado: ${displayText(weekNames[weekIndex])}`);
  }
  return true;
}

function checkDayChange() {
  if (syncCurrentPlanDate("timer")) return;
  // FIX: si la app queda abierta de un día al siguiente (pasó medianoche),
  // actualizamos todo: día activo, banner, notifs, weekly overview.
  const currentKey = getTodayKey();
  if (currentKey !== lastCheckedDayKey) {
    lastCheckedDayKey = currentKey;
    // FIX: recalcular weekIndex y days en caso de que cambió la semana ISO
    const newWeekIndex = getWeekIndex();
    if (newWeekIndex !== weekIndex) {
      weekIndex = newWeekIndex;
      days = allWeeks[weekIndex];
    }
    currentWeekName = getCurrentWeekName();
    const todayObj = getTodayDayObject();
    activeDay = todayObj.id;
    renderTabs();
    renderActiveDay();
    renderWeekOverview();
    renderShopping();
    updateGymBanner();
    updateFabBadge();
    if ("Notification" in window && Notification.permission === "granted") {
      scheduleMealNotifs();
    }
  }
}

syncCurrentPlanDate("initial");

function startIntervals() {
  if (!clockInterval) clockInterval = setInterval(updateClock, 1000);
  if (!nextMealInterval) nextMealInterval = setInterval(updateNextMeal, 60000);
  // Greeting/timeOfDay: cada minuto alcanza (no necesita actualizarse cada segundo)
  if (!greetingInterval) greetingInterval = setInterval(() => {
    updateGreeting();
  }, 60000);
  // Detectar cambio de día (medianoche): cada 2 minutos
  if (!dayChangeInterval) dayChangeInterval = setInterval(checkDayChange, 2 * 60000);
}
function stopIntervals() {
  if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
  if (nextMealInterval) { clearInterval(nextMealInterval); nextMealInterval = null; }
  if (greetingInterval) { clearInterval(greetingInterval); greetingInterval = null; }
  if (dayChangeInterval) { clearInterval(dayChangeInterval); dayChangeInterval = null; }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopIntervals();
  } else {
    syncCurrentPlanDate("visible");
    updateClock();
    updateNextMeal();
    startIntervals();
  }
});

window.addEventListener("focus", () => {
  syncCurrentPlanDate("focus");
});

window.addEventListener("pageshow", () => {
  syncCurrentPlanDate("pageshow");
});

// =====================================================
// SWIPE ENTRE DÍAS + TECLADO (desktop)
// =====================================================
(function setupInteraction() {
  const DAY_ORDER = ["lun","mar","mie","jue","vie","sab","dom"];
  const THRESHOLD = 55;
  let startX = 0, startY = 0, dragging = false;

  // Touch swipe
  document.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dragging = true;
  }, { passive: true });

  document.addEventListener("touchend", (e) => {
    if (!dragging) return;
    dragging = false;
    const target = e.target;
    if (target.closest("input,select,textarea,.prep-body,.alt-meal-panel")) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = Math.abs(e.changedTouches[0].clientY - startY);
    if (Math.abs(dx) < THRESHOLD || dy > Math.abs(dx) * 0.9) return;
    const idx = DAY_ORDER.indexOf(activeDay);
    if (dx < 0 && idx < DAY_ORDER.length - 1) setActiveDay(DAY_ORDER[idx + 1]);
    else if (dx > 0 && idx > 0) setActiveDay(DAY_ORDER[idx - 1]);
  }, { passive: true });

  // Keyboard left/right arrow to switch days
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input,select,textarea")) return;
    const idx = DAY_ORDER.indexOf(activeDay);
    if ((e.key === "ArrowRight" || e.key === "ArrowDown") && idx < DAY_ORDER.length - 1) {
      e.preventDefault();
      setActiveDay(DAY_ORDER[idx + 1]);
    } else if ((e.key === "ArrowLeft" || e.key === "ArrowUp") && idx > 0) {
      e.preventDefault();
      setActiveDay(DAY_ORDER[idx - 1]);
    }
  });
})();

// Active bottom nav highlight on scroll
(function setupBottomNavHighlight() {
  const sections = [
    { id: "plan-section",    nav: 'a[href="#plan-section"]' },
    { id: "weight-section",  nav: 'a[href="#weight-section"]' },
    { id: "supp-section",    nav: 'a[href="#supp-section"]' },
    { id: "shopping-list",   nav: 'a[href="#shopping-list"]' }
  ];
  function update() {
    let active = sections[0];
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el && el.getBoundingClientRect().top <= 120) active = s;
    }
    document.querySelectorAll(".bn-item").forEach(a => a.classList.remove("bn-active"));
    const activeEl = document.querySelector(active.nav);
    if (activeEl) activeEl.classList.add("bn-active");
  }
  window.addEventListener("scroll", update, { passive: true });
  update();
})();

// =====================================================
// APPLE WATCH / SIRI SHORTCUTS INTEGRATION
// =====================================================

// URL scheme: ?action=water|meal|weight|today — disparado por Siri Shortcuts
(function handleURLActions() {
  const params = new URLSearchParams(window.location.search);
  const action = params.get("action");
  if (!action) return;

  // Limpiar la URL sin recargar
  const clean = window.location.pathname;
  window.history.replaceState({}, "", clean);

  // Ejecutar la acción después de que la app cargue
  setTimeout(() => {
    if (action === "water") {
      // Agrega un vaso de agua y muestra confirmación
      const dots = document.querySelectorAll(".water-dot:not(.active)");
      if (dots.length > 0) {
        dots[0].click();
        showToast("💧 Vaso de agua registrado desde el Watch");
      } else {
        showToast("💧 ¡Ya completaste los 10 vasos de hoy!");
      }
    } else if (action === "meal") {
      // Marca la comida más cercana al horario actual
      setActiveDay(getTodayDayObject().id);
      setTimeout(() => {
        quickCheckCurrentMeal();
      }, 300);
    } else if (action === "weight") {
      // Scroll a la sección de peso y foca el input
      const el = document.querySelector("#weight-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => document.querySelector("#weight-input")?.focus(), 600);
      }
    } else if (action === "today") {
      setActiveDay(getTodayDayObject().id);
      setTimeout(scrollToTodayPanel, 300);
    }
  }, 800);
})();

// Genera la URL para el shortcut dado el action
function getShortcutURL(action) {
  return window.location.origin + window.location.pathname + "?action=" + action;
}

// Instalar atajo — abre la app Atajos de Apple con el atajo pre-configurado
function installShortcut(action) {
  const url = getShortcutURL(action);
  const names = { water: "Agua Dieta", meal: "Marcar Comida", weight: "Registrar Peso", today: "Ver Plan Hoy" };
  const icons = { water: "💧", meal: "✅", weight: "⚖️", today: "📊" };
  const siriPhrases = { water: "Agua dieta", meal: "Marcar comida dieta", weight: "Peso dieta", today: "Ver dieta" };
  const name = names[action] || action;
  const icon = icons[action] || "⚡";
  const siriPhrase = siriPhrases[action] || name;

  // 1. Copiar URL al portapapeles automáticamente
  copyToClipboard(url, "URL del atajo copiada");

  // 2. Mostrar mini-panel dentro del modal (no confirm feo)
  // Eliminar panel previo si existe
  const old = document.getElementById("shortcut-install-panel");
  if (old) old.remove();

  const panel = document.createElement("div");
  panel.id = "shortcut-install-panel";
  panel.innerHTML = `
    <div class="sip-header">
      <span class="sip-icon">${icon}</span>
      <div>
        <div class="sip-title">${icon} ${name}</div>
        <div class="sip-sub">URL copiada al portapapeles ✓</div>
      </div>
      <button class="sip-close" onclick="document.getElementById('shortcut-install-panel').remove()">✕</button>
    </div>
    <div class="sip-url">${url}</div>
    <ol class="sip-steps">
      <li>Tocá <strong>Abrir Atajos</strong> abajo → se abre la app</li>
      <li>Tocá <strong>"+"</strong> (arriba a la derecha)</li>
      <li>Tocá <strong>"Añadir acción"</strong> → buscá <strong>"Abrir URLs"</strong></li>
      <li>Tocá el campo de URL → <strong>Pegar</strong> (ya está en el clipboard)</li>
      <li>Tocá el nombre del atajo arriba → escribí <strong>"${name}"</strong></li>
      <li>Tocá <strong>"···"</strong> → activá <strong>"Mostrar en Apple Watch"</strong></li>
    </ol>
    <div class="sip-siri">💬 Después podés decirle a Siri: <em>"${siriPhrase}"</em></div>
    <div class="sip-actions">
      <button class="sip-btn-primary" onclick="window.location.href='shortcuts://'">
        ⚡ Abrir app Atajos ahora
      </button>
      <button class="sip-btn-secondary" onclick="copyToClipboard('${url}', 'URL copiada')">
        Copiar URL de nuevo
      </button>
    </div>
  `;

  // Insertar dentro del watch-modal, después del shortcuts-grid
  const grid = document.querySelector(".watch-shortcuts-grid");
  if (grid) {
    grid.after(panel);
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } else {
    document.body.appendChild(panel);
  }
}
window.installShortcut = installShortcut;

let lastWatchModalTrigger = null;

function showWatchModal() {
  const modal = document.querySelector("#watch-modal");
  if (modal) {
    lastWatchModalTrigger = document.activeElement && typeof document.activeElement.focus === "function" ? document.activeElement : null;
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
    setTimeout(() => modal.querySelector("button")?.focus(), 0);
  }
}
window.showWatchModal = showWatchModal;

function closeWatchModal(event) {
  if (event && event.target !== document.querySelector("#watch-modal")) return;
  const modal = document.querySelector("#watch-modal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "";
    if (lastWatchModalTrigger && document.body.contains(lastWatchModalTrigger)) {
      lastWatchModalTrigger.focus();
    }
  }
}
window.closeWatchModal = closeWatchModal;

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeWatchModal();
});

function requestNotifications() {
  activarNotificaciones();
}
window.requestNotifications = requestNotifications;

// =====================================================
// PWA · Service Worker (offline + auto-update)
// =====================================================
(function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (window.location.protocol === "file:") return;
  if (!window.isSecureContext && window.location.hostname !== "localhost") return;

  window.addEventListener("load", () => {
    const swUrl = new URL("./sw.js", window.location.href);
    swUrl.searchParams.set("v", APP_BUILD);
    navigator.serviceWorker.register(swUrl.pathname + swUrl.search, { scope: "./", updateViaCache: "none" })
      .then((registration) => {
        let updateApplied = false;
        const applyWaitingUpdate = () => {
          if (updateApplied) return;
          if (!registration.waiting) return;
          if (!navigator.serviceWorker.controller) return;
          updateApplied = true;
          showToast("Actualizando app y menú semanal...");
          registration.waiting.postMessage("SKIP_WAITING");
        };

        // Update check on launch
        registration.update?.();

        if (registration.waiting) applyWaitingUpdate();

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") applyWaitingUpdate();
          });
        });

        const checkForAppUpdate = () => registration.update?.();
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) checkForAppUpdate();
        });
        window.addEventListener("focus", checkForAppUpdate);
        setInterval(checkForAppUpdate, 60 * 60 * 1000);

        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      })
      .catch((err) => console.warn("SW register failed:", err));
  });
})();
