#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");
const appScriptPath = path.join(repoRoot, "script.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function createStorage() {
  const data = new Map();
  return {
    get length() {
      return data.size;
    },
    key(index) {
      return Array.from(data.keys())[index] || null;
    },
    getItem(key) {
      return data.has(String(key)) ? data.get(String(key)) : null;
    },
    setItem(key, value) {
      data.set(String(key), String(value));
    },
    removeItem(key) {
      data.delete(String(key));
    },
    clear() {
      data.clear();
    },
    dump() {
      return Object.fromEntries(data.entries());
    }
  };
}

function createClassList() {
  const tokens = new Set();
  return {
    add(...items) {
      items.forEach((item) => tokens.add(String(item)));
    },
    remove(...items) {
      items.forEach((item) => tokens.delete(String(item)));
    },
    contains(item) {
      return tokens.has(String(item));
    },
    toggle(item, force) {
      const key = String(item);
      const next = force === undefined ? !tokens.has(key) : Boolean(force);
      if (next) tokens.add(key);
      else tokens.delete(key);
      return next;
    },
    toString() {
      return Array.from(tokens).join(" ");
    }
  };
}

function createElement(tagName = "div") {
  const element = {
    tagName: String(tagName).toUpperCase(),
    children: [],
    attributes: {},
    dataset: {},
    style: {},
    classList: createClassList(),
    className: "",
    innerHTML: "",
    textContent: "",
    value: "",
    checked: false,
    disabled: false,
    hidden: false,
    parentNode: null,
    _listeners: new Map(),
    get firstChild() {
      return element.children[0] || null;
    },
    appendChild(child) {
      child.parentNode = element;
      element.children.push(child);
      return child;
    },
    insertBefore(child, reference) {
      child.parentNode = element;
      if (!reference) {
        element.children.push(child);
        return child;
      }
      const index = element.children.indexOf(reference);
      if (index === -1) element.children.push(child);
      else element.children.splice(index, 0, child);
      return child;
    },
    removeChild(child) {
      element.children = element.children.filter((item) => item !== child);
      child.parentNode = null;
      return child;
    },
    remove() {
      if (element.parentNode) element.parentNode.removeChild(element);
    },
    setAttribute(name, value) {
      const key = String(name);
      element.attributes[key] = String(value);
      if (key.startsWith("data-")) {
        const dataKey = key
          .slice(5)
          .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        element.dataset[dataKey] = String(value);
      }
    },
    removeAttribute(name) {
      delete element.attributes[String(name)];
    },
    getAttribute(name) {
      return element.attributes[String(name)] || null;
    },
    addEventListener(type, handler) {
      if (!element._listeners.has(type)) element._listeners.set(type, []);
      element._listeners.get(type).push(handler);
    },
    removeEventListener(type, handler) {
      const handlers = element._listeners.get(type) || [];
      element._listeners.set(type, handlers.filter((item) => item !== handler));
    },
    querySelector() {
      return createElement("div");
    },
    querySelectorAll() {
      return [];
    },
    closest() {
      return createElement("div");
    },
    getBoundingClientRect() {
      return { top: 0, right: 100, bottom: 100, left: 0, width: 100, height: 100 };
    },
    scrollIntoView() {},
    focus() {},
    blur() {},
    select() {},
    click() {}
  };
  return element;
}

function pushHandler(map, type, handler) {
  if (!map.has(type)) map.set(type, []);
  map.get(type).push(handler);
}

function createFakeDateController(initialIso) {
  const RealDate = Date;
  let current = new RealDate(initialIso);

  function FakeDate(...args) {
    if (this instanceof FakeDate) {
      return args.length ? new RealDate(...args) : new RealDate(current.getTime());
    }
    return args.length ? RealDate(...args) : current.toString();
  }

  Object.setPrototypeOf(FakeDate, RealDate);
  FakeDate.UTC = RealDate.UTC;
  FakeDate.parse = RealDate.parse;
  FakeDate.now = () => current.getTime();
  FakeDate.prototype = RealDate.prototype;

  return {
    Date: FakeDate,
    setNow(iso) {
      current = new RealDate(iso);
    }
  };
}

function createAppHarness(initialIso) {
  const documentHandlers = new Map();
  const windowHandlers = new Map();
  const elementCache = new Map();
  const fakeDate = createFakeDateController(initialIso);
  const localStorage = createStorage();
  const document = {
    hidden: false,
    activeElement: null,
    body: createElement("body"),
    documentElement: createElement("html"),
    createElement,
    querySelector(selector) {
      const key = String(selector);
      if (!elementCache.has(key)) elementCache.set(key, createElement("div"));
      return elementCache.get(key);
    },
    querySelectorAll() {
      return [];
    },
    getElementById(id) {
      const key = `#${id}`;
      if (!elementCache.has(key)) elementCache.set(key, createElement("div"));
      return elementCache.get(key);
    },
    addEventListener(type, handler) {
      pushHandler(documentHandlers, type, handler);
    },
    removeEventListener(type, handler) {
      const handlers = documentHandlers.get(type) || [];
      documentHandlers.set(type, handlers.filter((item) => item !== handler));
    },
    execCommand() {
      return true;
    }
  };

  const sandbox = {
    console,
    Date: fakeDate.Date,
    Intl,
    localStorage,
    sessionStorage: createStorage(),
    document,
    navigator: {
      userAgent: "node-weekly-rotation-check",
      clipboard: null,
      share: null,
      serviceWorker: undefined
    },
    location: {
      protocol: "http:",
      hostname: "localhost",
      origin: "http://localhost",
      pathname: "/",
      search: "",
      href: "http://localhost/"
    },
    history: {
      replaceState() {}
    },
    isSecureContext: true,
    MSStream: false,
    innerHeight: 844,
    innerWidth: 390,
    scrollY: 0,
    scrollTo() {},
    matchMedia() {
      return {
        matches: false,
        addEventListener() {},
        removeEventListener() {}
      };
    },
    addEventListener(type, handler) {
      pushHandler(windowHandlers, type, handler);
    },
    removeEventListener(type, handler) {
      const handlers = windowHandlers.get(type) || [];
      windowHandlers.set(type, handlers.filter((item) => item !== handler));
    },
    setTimeout() {
      return 1;
    },
    clearTimeout() {},
    setInterval() {
      return 1;
    },
    clearInterval() {},
    requestAnimationFrame() {
      return 1;
    },
    cancelAnimationFrame() {},
    alert() {},
    confirm() {
      return true;
    },
    URLSearchParams,
    Blob,
    URL
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;

  const context = vm.createContext(sandbox);
  const source = fs.readFileSync(appScriptPath, "utf8");
  vm.runInContext(source, context, { filename: "script.js", timeout: 20000 });

  function evalInApp(expression) {
    return vm.runInContext(expression, context, { filename: "weekly-rotation-check.vm.js", timeout: 10000 });
  }

  function snapshot(label) {
    return evalInApp(`(() => {
      const day = getTodayDayObject();
      const lunch = day.meals.find((meal) => /almuerzo/i.test(displayText(meal.label))) || {};
      const dinner = day.meals.find((meal) => /cena/i.test(displayText(meal.label))) || {};
      return {
        label: ${JSON.stringify(label)},
        todayKey: getTodayKey(),
        weekIndex,
        currentWeekName: displayText(currentWeekName),
        activeDay,
        dayId: day.id,
        lunch: displayText(lunch.name || ""),
        lunchAlt: displayText((lunch.alt && lunch.alt.name) || ""),
        dinner: displayText(dinner.name || ""),
        dinnerAlt: displayText((dinner.alt && dinner.alt.name) || ""),
        planWeek: localStorage.getItem(STORAGE.planWeek)
      };
    })()`);
  }

  function fireWindow(type) {
    (windowHandlers.get(type) || []).forEach((handler) => handler({ type }));
  }

  function fireDocument(type) {
    (documentHandlers.get(type) || []).forEach((handler) => handler({ type }));
  }

  return {
    setNow: fakeDate.setNow,
    snapshot,
    fireWindow,
    fireDocument,
    setHidden(value) {
      document.hidden = Boolean(value);
    },
    handlerCount(scope, type) {
      const map = scope === "document" ? documentHandlers : windowHandlers;
      return (map.get(type) || []).length;
    }
  };
}

function assertSnapshot(actual, expected) {
  assert(actual.weekIndex === expected.weekIndex, `${actual.label}: weekIndex esperado ${expected.weekIndex}, recibido ${actual.weekIndex}.`);
  assert(actual.planWeek === expected.planWeek, `${actual.label}: planWeek esperado ${expected.planWeek}, recibido ${actual.planWeek}.`);
  assert(actual.currentWeekName.includes(expected.weekName), `${actual.label}: nombre de semana incorrecto: ${actual.currentWeekName}.`);
  assert(normalize(actual.lunch).includes(normalize(expected.lunchNeedle)), `${actual.label}: almuerzo inesperado: ${actual.lunch}.`);
}

function assertNoRiceLunch(actual) {
  const text = normalize(`${actual.lunch} ${actual.lunchAlt}`);
  assert(!/\barroz\b/.test(text), `${actual.label}: el almuerzo visible no debe mostrar arroz. Recibido: ${actual.lunch} / ${actual.lunchAlt}.`);
}

function main() {
  const app = createAppHarness("2026-06-10T12:00:00-03:00");

  assert(app.handlerCount("document", "visibilitychange") >= 1, "Falta handler visibilitychange para refrescar la semana al volver de background.");
  assert(app.handlerCount("window", "focus") >= 1, "Falta handler focus para refrescar la semana al volver a la app.");
  assert(app.handlerCount("window", "pageshow") >= 1, "Falta handler pageshow para refrescar la semana restaurada por el navegador.");

  const june10 = app.snapshot("2026-06-10 initial");
  assertSnapshot(june10, {
    weekIndex: 3,
    weekName: "Semana 4",
    planWeek: "3:2026-06-08",
    lunchNeedle: "salpicon de pollo"
  });

  const june17CleanApp = createAppHarness("2026-06-17T12:00:00-03:00");
  const june17Clean = june17CleanApp.snapshot("2026-06-17 clean-load");
  assertSnapshot(june17Clean, {
    weekIndex: 0,
    weekName: "Semana 1",
    planWeek: "0:2026-06-15",
    lunchNeedle: "tortilla de papa"
  });
  assertNoRiceLunch(june17Clean);

  app.setNow("2026-06-17T12:00:00-03:00");
  app.fireWindow("focus");
  const june17Focus = app.snapshot("2026-06-17 focus");
  assertSnapshot(june17Focus, {
    weekIndex: 0,
    weekName: "Semana 1",
    planWeek: "0:2026-06-15",
    lunchNeedle: "hamburguesas caseras"
  });

  app.setNow("2026-06-24T12:00:00-03:00");
  app.fireWindow("pageshow");
  const june24Pageshow = app.snapshot("2026-06-24 pageshow");
  assertSnapshot(june24Pageshow, {
    weekIndex: 1,
    weekName: "Semana 2",
    planWeek: "1:2026-06-22",
    lunchNeedle: "pollo con batata"
  });

  app.setNow("2026-07-01T12:00:00-03:00");
  app.setHidden(false);
  app.fireDocument("visibilitychange");
  const july01Visible = app.snapshot("2026-07-01 visible");
  assertSnapshot(july01Visible, {
    weekIndex: 2,
    weekName: "Semana 3",
    planWeek: "2:2026-06-29",
    lunchNeedle: "empanadas de carne"
  });

  const uniqueWeeks = new Set([june10.weekIndex, june17Focus.weekIndex, june24Pageshow.weekIndex, july01Visible.weekIndex]);
  const uniqueLunches = new Set([june10.lunch, june17Focus.lunch, june24Pageshow.lunch, july01Visible.lunch]);
  assert(uniqueWeeks.size === 4, "La rotacion no recorrio las 4 semanas esperadas.");
  assert(uniqueLunches.size === 4, "Los almuerzos de miercoles no cambiaron entre semanas.");

  const source = fs.readFileSync(appScriptPath, "utf8");
  assert(/syncCurrentPlanDate\("initial"\)/.test(source), "Falta sincronizacion inicial del menu.");
  assert(/syncCurrentPlanDate\("visible"\)/.test(source), "Falta sincronizacion al volver de background.");
  assert(/syncCurrentPlanDate\("focus"\)/.test(source), "Falta sincronizacion al recuperar foco.");
  assert(/syncCurrentPlanDate\("pageshow"\)/.test(source), "Falta sincronizacion al restaurar pagina.");

  console.log("WEEKLY ROTATION OK");
  [june10, june17Clean, june17Focus, june24Pageshow, july01Visible].forEach((item) => {
    console.log(`${item.label}: ${item.currentWeekName} | ${item.planWeek} | almuerzo: ${item.lunch} | opcion B: ${item.lunchAlt}`);
  });
}

main();
