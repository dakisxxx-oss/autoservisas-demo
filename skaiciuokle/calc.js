// Skaičiavimo variklis. Formulės pagal 03-metodika.md ir 04-specifikacija.md (2.1-2.5, 3.1, 5.1-5.3).
// Grynas kodas be DOM: naudojamas naršyklėje (app.js) ir Node teste (tools/test-calc.mjs).
// Visi vidiniai skaičiavimai be PVM. PVM pridedamas tik pačioje pabaigoje (x 1,21).
(function (g) {
  "use strict";

  // ---------- 2.1 konfigūracija (specifikacijos reikšmės) ----------
  var C = {
    version: "2026-11-16",
    levels: {
      partial:  { label: "Dalinis (kosmetinis)", reserve: 0.10, corridor: [60, 250] },
      standard: { label: "Standartinis",         reserve: 0.12, corridor: [250, 550] },
      full:     { label: "Pilnas (kapitalinis)", reserve: 0.15, corridor: [350, 800] },
      luxury:   { label: "Prabangus",            reserve: 0.15, corridor: [600, 1200] }
    },
    levelOrder: ["partial", "standard", "full", "luxury"],
    reserveOldBonus: 0.05,
    complexity: { nolift35: 0.03, nolift6: 0.05, ceilingOver31: 0.05, living: 0.05 },
    accuracy: {
      approx: { k: 1.00, u: 0.15, label: "orientacinis" },
      medium: { k: 0.80, u: 0.10, label: "vidutinis" },
      good:   { k: 0.60, u: 0.05, label: "geras" }
    },
    waste: { paint: 0.05, putty: 0.05, puttyUneven: 0.10, tile: 0.10, floorClick: 0.07 },
    cons: { paintM2PerL: 10, paintCoats: 2, puttyStart: 1.1, puttyFinish: 0.5, tileGlueKgM2: 4, tileGlueBagKg: 25, groutKgM2: 0.29, groutBagKg: 2, levelingKgM2Mm: 1.7, levelingMm: 5 },
    geo: { windowM2: 2.25, doorM2: 1.6, openingIgnoreBelow: 1.0, windowRevealM: 6.0, doorRevealM: 4.8, doorWidthM: 0.8, bathTileH: 2.0, waterproofSkirtH: 0.2, showerZoneM2: 8, sillPerWindowM: 1.2 },
    rounding: { under10000: 50, from10000: 100 },
    consumablesPct: 0.10,
    scaleRef: 55, scaleExp: 0.7, scaleMin: 0.6, scaleMax: 2.0,
    designWeeks: 2
  };

  // ---------- 2.2 kambarių šablonai ----------
  var ROOM_TYPES = {
    living_kitchen: { label: "Svetainė ir virtuvė", ratio: 1.3, windows: 1, doors: 1, wet: false, zone: "dry" },
    bedroom:        { label: "Miegamasis",          ratio: 1.3, windows: 1, doors: 1, wet: false, zone: "dry" },
    room:           { label: "Kitas kambarys",      ratio: 1.3, windows: 1, doors: 1, wet: false, zone: "dry" },
    kitchen:        { label: "Virtuvė",             ratio: 2.0, windows: 1, doors: 1, wet: false, zone: "wet" },
    bath:           { label: "Vonia ir WC",         ratio: 2.0, windows: 0, doors: 1, wet: true,  zone: "bath" },
    hall:           { label: "Koridorius",          ratio: 2.0, windows: 0, doors: 0, wet: false, zone: "wet" }
  };
  // 4 kambarių šablone "room" 0,26 reiškia du kambarius, todėl dalijama į 2 x 0,13 (langų ir durų skaičiui).
  var TEMPLATES = {
    1: [["living_kitchen", 0.55], ["bath", 0.12], ["hall", 0.33]],
    2: [["living_kitchen", 0.35], ["bedroom", 0.25], ["bath", 0.10], ["hall", 0.30]],
    3: [["living_kitchen", 0.28], ["bedroom", 0.20], ["room", 0.17], ["bath", 0.09], ["hall", 0.26]],
    4: [["living_kitchen", 0.24], ["bedroom", 0.17], ["room", 0.13], ["room", 0.13], ["bath", 0.08], ["hall", 0.25]]
  };

  // ---------- 2.4 medžiagos (kainos su PVM iš JSON, perskaičiuojamos be PVM) ----------
  var MATERIALS = {
    paint: { label: "Sienų ir lubų dažai", unit: "l", ref: "m08", tiers: [
      { example: "Color Plus 7, 10 l", price: 1.40 }, { example: "Topcolor Premium 7, 10 l", price: 4.00 }, { example: "Sadolin Easycare, 9 l", price: 7.00 }] },
    floor_laminate: { label: "Laminatas", unit: "m2", ref: "m01", tiers: [
      { example: "7,5-8 mm, AC4", price: 6.49 }, { example: "8-10 mm, AC4-AC5", price: 9.99 }, { example: "10-12 mm, AC5", price: 16.99 }] },
    floor_vinyl: { label: "Vinilas, SPC", unit: "m2", ref: "m02", tiers: [
      { example: "SPC click, 4 mm", price: 13.49 }, { example: "SPC click, 4 mm, tankesnis", price: 17.99 }, { example: "Dizaino vinilas", price: 34.99 }] },
    floor_parquet: { label: "Parketlentės", unit: "m2", ref: "m03", tiers: [
      { example: "Ąžuolo, paprastesnė", price: 43 }, { example: "Ąžuolo, vidutinė", price: 50 }, { example: "Ąžuolo, aukštesnė", price: 81 }] },
    tile: { label: "Plytelės", unit: "m2", ref: "m04", refs: ["m04", "m04", "m05"], tiers: [
      { example: "Akmens masės plytelės", price: 8.19 }, { example: "Akmens masės plytelės", price: 11.99 }, { example: "Dizaino plytelės", price: 35 }] },
    door_leaf: { label: "Vidaus durų varčia", unit: "vnt.", ref: "m12", tiers: [
      { example: "Paprasta varčia", price: 52.99 }, { example: "Vidutinė varčia", price: 67.99 }, { example: "Aukštesnės klasės varčia", price: 130 }] },
    wc: { label: "Klozetas", unit: "vnt.", ref: "m14", refs: ["m14", "m15", "m15"], tiers: [
      { example: "Pastatomas klozetas", price: 87.90 }, { example: "Potinkinis rėmas ir klozetas", price: 299 }, { example: "Aukštesnis komplektas", price: 519 }] },
    shower: { label: "Dušo kabina ar stiklas", unit: "vnt.", ref: "m16", tiers: [
      { example: "Dušo kabina", price: 430 }, { example: "Dušo stiklas", price: 650 }, { example: "Aukštesnės klasės stiklas", price: 1000 }] },
    vanity: { label: "Praustuvas su spintele", unit: "kompl.", ref: "m17", tiers: [
      { example: "Paprasta spintelė", price: 250 }, { example: "Vidutinė spintelė", price: 350 }, { example: "Aukštesnės klasės", price: 500 }] },
    sockets: { label: "Rozetės ir jungikliai", unit: "vnt.", ref: "m19", tiers: [
      { example: "Paprasta serija", price: 2.49 }, { example: "Vidutinė serija", price: 3.59 }, { example: "Aukštesnė serija", price: 6.29 }] },
    radiator: { label: "Plieniniai radiatoriai", unit: "vnt.", ref: "h02", tiers: [
      { example: "22 tipas, mažesnis", price: 51.95 }, { example: "22 tipas, vidutinis", price: 69.95 }, { example: "22 tipas, didesnis", price: 87.90 }] },
    gkp: { label: "Gipso kartonas 12,5 mm", unit: "m2", ref: "m09", tiers: [
      { example: "Standartinis", price: 2.44 }, { example: "Drėgmei atsparus", price: 3.22 }, { example: "Akustinis", price: 4.88 }] }
  };
  var SINGLE = {
    putty: { label: "Glaistas (Weber LR+, 20 kg)", unit: "kg", price: 0.66, ref: "m11" },
    leveling: { label: "Savaime išsilyginantis mišinys (Mira 6700)", unit: "kg", price: 0.64, ref: "m10" },
    door_frame: { label: "Durų staktos komplektas", unit: "vnt.", price: 79.99, ref: "m13" },
    cable: { label: "Kabelis NYM 3x1,5", unit: "m", price: 1.00, ref: "m18", perPoint: 8 },
    adhesive: { label: "Plytelių klijai, 25 kg", unit: "maiš.", price: 11.99, ref: "m06" },
    grout: { label: "Fuga, 2 kg", unit: "pak.", price: 5.89, ref: "m07" }
  };

  var GROUPS = [
    { id: "prep", label: "Paruošimas ir griovimas" },
    { id: "walls", label: "Sienos ir lubos" },
    { id: "floors", label: "Grindys" },
    { id: "bath", label: "Vonia ir WC" },
    { id: "doors", label: "Durys ir langai" },
    { id: "electric", label: "Elektra" },
    { id: "plumb", label: "Santechnika ir šildymas" },
    { id: "other", label: "Kita" }
  ];

  // ---------- 2.3 darbų eilutės (žingsnio 4 jungikliai) ----------
  // def: kuriuose lygiuose įjungta pagal nutylėjimą (03 metodikos 3 skyrius ir 04, 2.3).
  var WORKS = [
    { id: "w_strip", group: "prep", label: "Senų dangų, dažų ar tapetų nuėmimas", def: ["partial", "standard", "full", "luxury"] },
    { id: "w_demo", group: "prep", label: "Griovimas (pertvaros, plytelės)", def: ["standard", "full", "luxury"] },
    { id: "w_waste", group: "prep", label: "Atliekų išvežimas", def: ["partial", "standard", "full", "luxury"] },
    { id: "w_plaster", group: "walls", label: "Sienų tinkavimas", def: ["standard", "full", "luxury"], cond: "plaster" },
    { id: "w_putty", group: "walls", label: "Sienų ir lubų lyginimas glaistu", term: "glaistymas", def: ["partial", "standard", "full", "luxury"] },
    { id: "w_paint", group: "walls", label: "Gruntavimas ir dažymas", term: "gruntavimas", def: ["partial", "standard", "full", "luxury"] },
    { id: "w_wallpaper", group: "walls", label: "Tapetai (vietoje sienų dažymo)", def: [], note: "Tapetų kainos šaltinio nėra, skaičiuojamas tik darbas." },
    { id: "w_shadow", group: "walls", label: "Šešėlinės siūlės", term: "seseline", def: ["luxury"] },
    { id: "w_screed", group: "floors", label: "Grindų išlyginimas", term: "islyginamasis", def: ["full", "luxury"], cond: "screed" },
    { id: "w_floor", group: "floors", label: "Grindų danga (laminatas, vinilas, parketlentės, plytelės)", def: ["partial", "standard", "full", "luxury"] },
    { id: "w_skirting", group: "floors", label: "Grindjuostės", def: ["partial", "standard", "full", "luxury"], note: "Grindjuosčių medžiagos kainos šaltinio nėra." },
    { id: "w_underfloor", group: "floors", label: "Šildomos grindys (vonia, virtuvė, koridorius)", def: ["luxury"], note: "Šildymo kilimėlių kainos šaltinio nėra, skaičiuojamas darbas." },
    { id: "w_bath_tile", group: "bath", label: "Plytelės sienoms ir grindims", def: ["standard", "full", "luxury"], cond: "wet" },
    { id: "w_waterproof", group: "bath", label: "Hidroizoliacija", term: "hidroizoliacija", def: ["standard", "full", "luxury"], cond: "wet", note: "Hidroizoliacijos medžiagos kainos nėra." },
    { id: "w_drain", group: "bath", label: "Dušo trapas ir nuolydis", def: ["standard", "full", "luxury"], cond: "bath" },
    { id: "w_wc", group: "bath", label: "Klozetas", term: "potinkinis", def: ["standard", "full", "luxury"], cond: "wc" },
    { id: "w_shower", group: "bath", label: "Dušas ar vonia", def: ["standard", "full", "luxury"], cond: "bath" },
    { id: "w_vanity", group: "bath", label: "Praustuvas ir spintelė", def: ["standard", "full", "luxury"], cond: "bath" },
    { id: "w_doors", group: "doors", label: "Vidaus durys", def: ["standard", "full", "luxury"], qty: "doors", qtyLabel: "Kiek durų?" },
    { id: "w_sills", group: "doors", label: "Palangės", def: ["full", "luxury"], cond: "windows" },
    { id: "w_reveals", group: "doors", label: "Angokraščių formavimas", def: ["full", "luxury"] },
    { id: "w_windows", group: "doors", label: "Langų keitimas", def: [], noPrice: true, note: "Kainą nurodysime po apžiūros. Į sumą neįtraukta." },
    { id: "w_el_full", group: "electric", label: "Visa elektros instaliacija", def: ["full", "luxury"], notSingle: true },
    { id: "w_el_points", group: "electric", label: "Atskiri nauji taškai", def: ["standard"], singleDef: ["standard", "full", "luxury"], qty: "el_points", qtyLabel: "Kiek naujų elektros taškų?" },
    { id: "w_el_panel", group: "electric", label: "Elektros skydelis", def: ["full", "luxury"], notSingle: true },
    { id: "w_lights", group: "electric", label: "Šviestuvų montavimas", def: ["standard", "full", "luxury"], qty: "lights", qtyLabel: "Kiek šviestuvų?" },
    { id: "w_pl_full", group: "plumb", label: "Visa santechnikos instaliacija", def: ["full", "luxury"], notSingle: true },
    { id: "w_pl_points", group: "plumb", label: "Atskiri nauji taškai", def: ["standard"], singleDef: ["standard", "full", "luxury"], qty: "pl_points", qtyLabel: "Kiek santechnikos taškų?", cond: "plpoints" },
    { id: "w_radiators", group: "plumb", label: "Radiatorių keitimas", def: ["full", "luxury"], qty: "radiators", qtyLabel: "Kiek radiatorių?" },
    { id: "w_clean", group: "other", label: "Valymas po remonto", def: ["partial", "standard", "full", "luxury"] },
    { id: "w_design", group: "other", label: "Interjero projektas", def: ["luxury"] },
    { id: "w_supervision", group: "other", label: "Techninė priežiūra", def: [], noPrice: true, note: "Kainos šaltinio nėra. Į sumą neįtraukta." }
  ];

  // ---------- pagalbinės ----------
  function num(v, d) { var n = typeof v === "number" ? v : parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : d; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function net(p) { return p / 1.21; } // mažmenos kaina su PVM -> be PVM
  function roundStep(v) { var s = Math.abs(v) < 10000 ? C.rounding.under10000 : C.rounding.from10000; return Math.round(v / s) * s; }
  function prices(P, id) {
    var it = P.items[id]; if (!it) throw new Error("Nėra kainos " + id);
    var n = it.net; var mid = n[1]; var low = n[0] == null ? mid : n[0]; var high = n[2] == null ? mid : n[2];
    return { low: low, mid: mid, high: high, item: it };
  }

  function height(a) {
    if (a.heightOpt === "unknown" || a.heightOpt == null) return 2.6;
    if (a.heightOpt === "3.0") return clamp(num(a.heightExact, 3.0), 3.0, 5.0);
    return num(a.heightOpt, 2.6);
  }
  function bathsCount(a) { if (a.type === "room") return a.roomKind === "bath" ? 1 : 0; return a.baths === "0" ? 0 : num(a.baths, 1); }
  function wcCount(a) { if (a.type === "room") return a.roomKind === "bath" ? 1 : 0; return a.baths === "0" ? 1 : num(a.baths, 1); }
  function roomsCount(a) { if (a.type === "room") return 1; return clamp(Math.round(num(a.rooms, 2)), 1, 5); }

  // Numatytasis kambarių paskirstymas (03, 2.4; 04, 2.2). Prielaida.
  function defaultRooms(a) {
    var area = num(a.area, 55);
    if (a.type === "room") {
      var t = ROOM_TYPES[a.roomKind] || ROOM_TYPES.room;
      return [{ name: t.label, type: a.roomKind || "room", area: area, windows: t.windows, doors: 1, wet: t.wet }];
    }
    var n = roomsCount(a);
    var tpl = TEMPLATES[Math.min(n, 4)].slice();
    for (var x = 4; x < n; x++) tpl.push(["room", 0.13]);             // 5+: papildomi kambariai
    var baths = Math.max(1, bathsCount(a));                              // "tik WC" palieka vieną šlapią patalpą (WC)
    var list = [];
    tpl.forEach(function (e) {
      if (e[0] === "bath") { for (var b = 0; b < baths; b++) list.push(e); }
      else list.push(e);
    });
    var sum = list.reduce(function (s, e) { return s + e[1]; }, 0);  // normalizuojama iki 1
    var counters = {};
    return list.map(function (e) {
      var t = ROOM_TYPES[e[0]];
      counters[e[0]] = (counters[e[0]] || 0) + 1;
      var label = t.label;
      if (e[0] === "bath" && bathsCount(a) === 0) label = "WC";
      if (counters[e[0]] > 1 || (e[0] === "room" && list.filter(function (z) { return z[0] === "room"; }).length > 1)) label += " " + counters[e[0]];
      return { name: label, type: e[0], area: area * e[1] / sum, windows: t.windows, doors: t.doors, wet: t.wet };
    });
  }

  // 2.5 kiekių išvedimas
  function quantities(a, rooms) {
    var H = height(a), G = C.geo;
    var q = { floor: 0, walls: 0, perimeter: 0, skirting: 0, bathTile: 0, waterproof: 0, windows: 0, zoneDry: 0, zoneWet: 0, zoneBathFloor: 0, wetRooms: 0, wetFloor: 0 };
    rooms.forEach(function (r) {
      var t = ROOM_TYPES[r.type] || ROOM_TYPES.room;
      var A = Math.max(0, num(r.area, 0));
      var ratio = t.ratio;
      var aa = Math.sqrt(A / ratio), bb = ratio * aa, P = 2 * (aa + bb);
      var win = Math.max(0, Math.round(num(r.windows, 0))), drs = Math.max(0, Math.round(num(r.doors, 0)));
      var wOpen = G.windowM2 >= G.openingIgnoreBelow ? win * G.windowM2 : 0;
      var dOpen = G.doorM2 >= G.openingIgnoreBelow ? drs * G.doorM2 : 0;
      var gross = P * H;
      var wallsNet = Math.max(0, gross - wOpen - dOpen);
      q.floor += A; q.walls += wallsNet; q.perimeter += P; q.windows += win;
      q.skirting += Math.max(0, P - drs * G.doorWidthM);
      if (r.wet) {
        var tileH = a.tileHeight === "ceiling" ? H : G.bathTileH;
        q.bathTile += Math.max(0, P * tileH - wOpen - dOpen) + A;
        q.waterproof += A + P * G.waterproofSkirtH + G.showerZoneM2;
        q.wetRooms += 1; q.zoneBathFloor += A;
      } else if (t.zone === "wet") q.zoneWet += A;
      else q.zoneDry += A;
    });
    var n = roomsCount(a), baths = bathsCount(a);
    var single = a.type === "room";
    var kind = a.roomKind;
    var dq = single ? {
      el_points: kind === "kitchen" ? 8 : kind === "room" ? 6 : 4,
      pl_points: kind === "bath" ? 4 : kind === "kitchen" ? 2 : 0,
      doors: 1, radiators: kind === "hall" ? 0 : 1, lights: 2
    } : {
      el_points: 6 + 3 * n,
      pl_points: 2 * baths + 2,
      doors: n + baths + 1,
      radiators: n + 1,
      lights: n * 2 + baths + 2
    };
    q.defaults = dq;
    var uq = a.qty || {};
    q.el_points = Math.max(0, Math.round(num(uq.el_points, dq.el_points)));
    q.pl_points = Math.max(0, Math.round(num(uq.pl_points, dq.pl_points)));
    q.doors = Math.max(0, Math.round(num(uq.doors, dq.doors)));
    q.radiators = Math.max(0, Math.round(num(uq.radiators, dq.radiators)));
    q.lights = Math.max(0, Math.round(num(uq.lights, dq.lights)));
    q.baths = baths; q.wc = wcCount(a); q.rooms = n; q.H = H;
    return q;
  }

  function condOk(w, a, q) {
    switch (w.cond) {
      case "plaster": return a.walls === "very" || a.state === "bad" || a.state === "shell" || a.age === "new";
      case "screed": return a.state !== "good";
      case "wet": return q.wetRooms > 0;
      case "bath": return q.baths > 0;
      case "wc": return q.wc > 0;
      case "windows": return q.windows > 0;
      case "plpoints": return q.pl_points > 0;
      default: return true;
    }
  }
  // Pagal nutylėjimą įjungti darbai. Standartiniam lygiui tinkavimas ir grindų lyginimas "pagal būklę" (03, 3 sk.).
  function defaultWorks(a, rooms) {
    rooms = rooms || (a.customRooms && a.customRooms.length ? a.customRooms : defaultRooms(a));
    var q = quantities(a, rooms), lv = a.level || "standard", out = {};
    WORKS.forEach(function (w) {
      var list = (a.type === "room" && w.singleDef) ? w.singleDef : w.def;
      var on = list.indexOf(lv) >= 0;
      if (a.type === "room" && w.notSingle) on = false;
      if (w.id === "w_strip" && (a.state === "good" || a.state === "shell")) on = false;
      if (w.id === "w_demo" && lv === "standard") on = q.wetRooms > 0 && a.state !== "shell"; // standartinis: griovimas "pagal vonią" (03, 3 sk.), dalis 0,10
      if (w.id === "w_screed" && lv === "standard") on = a.state === "bad" || a.state === "shell";
      if (w.id === "w_design" && a.plan === "want") on = true;
      if (!condOk(w, a, q)) on = false;
      out[w.id] = on;
    });
    return out;
  }
  function worksState(a, rooms) {
    var d = defaultWorks(a, rooms), o = a.works || {}, out = {};
    Object.keys(d).forEach(function (k) { out[k] = typeof o[k] === "boolean" ? o[k] : d[k]; });
    return out;
  }

  // Medžiagos kaina: { low, mid, high } be PVM pagal pasirinktą lygį (0 = nežinau: mid vidutinė, low ekonominė, high aukštesnė)
  function tierCost(key, a, qty) {
    var m = MATERIALS[key], t = (a.mat && a.mat[key] != null) ? a.mat[key] : 2;
    var p = m.tiers.map(function (x) { return net(x.price); });
    if (t === 0) return { low: p[0] * qty, mid: p[1] * qty, high: p[2] * qty, tier: 0, unitPrice: m.tiers[1].price };
    var v = p[t - 1] * qty; return { low: v, mid: v, high: v, tier: t, unitPrice: m.tiers[t - 1].price };
  }
  function fixed(v) { return { low: v, mid: v, high: v }; }
  function addM(x, y) { return { low: x.low + y.low, mid: x.mid + y.mid, high: x.high + y.high }; }

  // ---------- 5.1 pagrindinis skaičiavimas ----------
  function calculate(a, P, cfg) {
    P = P || g.KAINOS; cfg = cfg || g.CALC_CONFIG || {};
    var level = C.levels[a.level] ? a.level : "standard";
    var lv = C.levels[level];
    var regions = cfg.regions || [];
    var reg = regions.filter(function (r) { return r.id === a.city; })[0];
    var region = reg ? reg.coef : 1;
    var custom = a.customRooms && a.customRooms.length ? a.customRooms : null;
    var rooms = custom || defaultRooms(a);
    var q = quantities(a, rooms);
    var H = q.H;
    var flags = [];
    var cx = 1;
    if (a.type !== "house") { // lifto klausimas namui nerodomas
      if (a.lift === "nolift35") { cx += C.complexity.nolift35; flags.push("nolift35"); }
      if (a.lift === "nolift6") { cx += C.complexity.nolift6; flags.push("nolift6"); }
    }
    if (H > 3.1) { cx += C.complexity.ceilingOver31; flags.push("ceilingOver31"); }
    if (a.living === "yes") { cx += C.complexity.living; flags.push("living"); }

    var W = worksState(a, rooms);
    var byClient = a.buyer === "client";
    var acc = C.accuracy[a.accuracy] ? a.accuracy : "approx";
    var k = C.accuracy[acc].k, u = C.accuracy[acc].u;
    var lines = [], excluded = [], notes = [];
    var walls = q.walls, ceil = q.floor;
    var ceilType = a.ceiling || "painted";
    var ceilPainted = ceilType === "stretch" ? 0 : ceil;  // GKP lubos taip pat glaistomos ir dažomos (c01 be glaistymo)
    var wallsPainted = W.w_wallpaper ? 0 : walls;
    var single = a.type === "room";

    function labourLine(id, group, label, qty, unit, code, opt) {
      opt = opt || {};
      var pr = prices(P, code);
      var mult = opt.noRegion ? 1 : region * cx;
      var sc = opt.scale || 1;
      var L = { low: qty * pr.low * mult * sc, mid: qty * pr.mid * mult * sc, high: qty * pr.high * mult * sc };
      var line = { id: id, group: group, label: label, qty: qty, unit: unit, code: code, labour: L, mat: fixed(0), matParts: [], conf: pr.item.conf };
      lines.push(line);
      return line;
    }
    function addMat(line, key, qty, unit, label) {
      if (byClient) return;
      var c;
      if (MATERIALS[key]) {
        c = tierCost(key, a, qty);
        line.matParts.push({ key: key, label: label || MATERIALS[key].label, qty: qty, unit: unit || MATERIALS[key].unit, tier: c.tier, unitPriceIncl: c.unitPrice, ref: MATERIALS[key].ref, cost: { low: c.low, mid: c.mid, high: c.high } });
      } else {
        var s = SINGLE[key]; var v = net(s.price) * qty;
        c = fixed(v);
        line.matParts.push({ key: key, label: label || s.label, qty: qty, unit: unit || s.unit, tier: null, unitPriceIncl: s.price, ref: s.ref, cost: c });
      }
      line.mat = addM(line.mat, c);
    }

    var area = q.floor;
    // Paruošimas
    if (W.w_strip) labourLine("w_strip", "prep", "Senų dažų ir tapetų nuėmimas", walls, "m2", "d02");
    if (W.w_demo) { var share = level === "full" || level === "luxury" ? 0.40 : 0.10; labourLine("w_demo", "prep", "Griovimas (pertvaros, plytelės)", area * share, "m2", "d01"); }
    if (W.w_waste) { var cont = Math.ceil(area / (level === "full" || level === "luxury" ? 25 : 40)); labourLine("w_waste", "prep", "Atliekų išvežimas (konteineris 8-10 m3)", cont, "vnt.", "o01"); }
    // Sienos ir lubos
    if (W.w_plaster) labourLine("w_plaster", "walls", "Sienų tinkavimas", walls, "m2", "d04");
    if (W.w_putty) {
      var pw = (a.walls === "very") ? C.waste.puttyUneven : C.waste.putty;
      var l1 = labourLine("w_putty", "walls", "Sienų glaistymas ir šlifavimas", walls, "m2", "d05");
      addMat(l1, "putty", walls * (C.cons.puttyStart + C.cons.puttyFinish) * (1 + pw));
      if (ceilPainted > 0) {
        var l2 = labourLine("w_putty_ceil", "walls", "Lubų glaistymas", ceilPainted, "m2", "d06");
        addMat(l2, "putty", ceilPainted * (C.cons.puttyStart + C.cons.puttyFinish) * (1 + pw));
      }
    }
    var paintArea = wallsPainted + ceilPainted;
    if (W.w_paint && paintArea > 0) {
      var lp = labourLine("w_paint", "walls", "Gruntavimas ir dažymas (2 sluoksniai)", paintArea, "m2", "d07");
      addMat(lp, "paint", paintArea * C.cons.paintCoats / C.cons.paintM2PerL * (1 + C.waste.paint));
    }
    if (W.w_wallpaper) { labourLine("w_wallpaper", "walls", "Tapetų klijavimas", walls, "m2", "d09"); notes.push("Tapetų medžiagų kaina neįtraukta (šaltinio nėra)."); }
    if (ceilType === "gkp") {
      var lg = labourLine("w_gkp", "walls", "Gipso kartono lubos", ceil, "m2", "c01");
      if (!byClient) {
        var gc = tierCost("gkp", a, ceil);
        var gx = { low: gc.low * 2, mid: gc.mid * 2, high: gc.high * 2 }; // + 100 proc. karkasui (prielaida)
        lg.matParts.push({ key: "gkp", label: "Gipso kartonas ir karkasas (+100 proc. priedas)", qty: ceil, unit: "m2", tier: gc.tier, unitPriceIncl: gc.unitPrice, ref: "m09", cost: gx });
        lg.mat = addM(lg.mat, gx);
      }
    }
    if (ceilType === "stretch") labourLine("w_stretch", "walls", "Įtempiamos lubos (su plėvele)", ceil, "m2", "c03");
    if (W.w_shadow) labourLine("w_shadow", "walls", "Šešėlinės siūlės", q.perimeter, "m", "d11");
    // Grindys
    if (W.w_screed) {
      var ls = labourLine("w_screed", "floors", "Grindų išlyginimas", area, "m2", "f01");
      addMat(ls, "leveling", area * C.cons.levelingKgM2Mm * C.cons.levelingMm);
    }
    if (W.w_floor) {
      var dry = a.floorDry || "laminate", wet = a.floorWet || "tile";
      var zones = {};
      zones[dry] = (zones[dry] || 0) + q.zoneDry;
      zones[wet] = (zones[wet] || 0) + q.zoneWet;
      var FL = { laminate: ["w_floor_laminate", "Laminato klojimas", "f02", "floor_laminate"], vinyl: ["w_floor_vinyl", "Vinilo klojimas", "f03", "floor_vinyl"], parquet: ["w_floor_parquet", "Parketlenčių klojimas", "f05", "floor_parquet"], tile: ["w_floor_tile", "Grindų plytelės", level === "luxury" ? "t02" : "t01", "tile"] };
      ["laminate", "vinyl", "parquet", "tile"].forEach(function (key) {
        var A = zones[key]; if (!A) return;
        var d = FL[key]; var lf = labourLine(d[0], "floors", d[1], A, "m2", d[2]);
        if (key === "tile") tileMats(lf, A);
        else addMat(lf, d[3], A * (1 + C.waste.floorClick));
      });
    }
    if (W.w_skirting) labourLine("w_skirting", "floors", "Grindjuostės", q.skirting, "m", "f07");
    if (W.w_underfloor) { var ua = q.zoneBathFloor + q.zoneWet; if (ua > 0) labourLine("w_underfloor", "floors", "Šildomos grindys", ua, "m2", "f09"); }
    // Vonia
    function tileMats(line, A) {
      addMat(line, "tile", A * (1 + C.waste.tile));
      addMat(line, "adhesive", Math.ceil(A * C.cons.tileGlueKgM2 / C.cons.tileGlueBagKg));
      addMat(line, "grout", Math.ceil(A * C.cons.groutKgM2 / C.cons.groutBagKg));
    }
    if (W.w_bath_tile && q.wetRooms > 0) { var lt = labourLine("w_bath_tile", "bath", "Plytelės vonioje ir WC (sienos ir grindys)", q.bathTile, "m2", level === "luxury" ? "t02" : "t01"); tileMats(lt, q.bathTile); }
    if (W.w_waterproof && q.wetRooms > 0) labourLine("w_waterproof", "bath", "Hidroizoliacija", q.waterproof, "m2", "t03");
    if (W.w_drain && q.baths > 0) labourLine("w_drain", "bath", "Dušo trapas", q.baths, "vnt.", "p03");
    if (W.w_wc && q.wc > 0) { var lw = labourLine("w_wc", "bath", "Klozeto montavimas", q.wc, "vnt.", "p02"); addMat(lw, "wc", q.wc); }
    if (W.w_shower && q.baths > 0) { var lsh = labourLine("w_shower", "bath", "Dušo kabinos ar stiklo montavimas", q.baths, "vnt.", "p06"); addMat(lsh, "shower", q.baths); }
    if (W.w_vanity && q.baths > 0) { var lv2 = labourLine("w_vanity", "bath", "Praustuvo su spintele montavimas", q.baths, "vnt.", "p05"); addMat(lv2, "vanity", q.baths); }
    // Durys ir langai
    if (W.w_doors && q.doors > 0) { var ld = labourLine("w_doors", "doors", "Vidaus durų montavimas", q.doors, "vnt.", "w01"); addMat(ld, "door_leaf", q.doors); addMat(ld, "door_frame", q.doors); }
    if (W.w_sills && q.windows > 0) labourLine("w_sills", "doors", "Palangių montavimas", q.windows * C.geo.sillPerWindowM, "m", "f08");
    if (W.w_reveals) { var rv = q.windows * C.geo.windowRevealM + (W.w_doors ? q.doors : 0) * C.geo.doorRevealM; if (rv > 0) labourLine("w_reveals", "doors", "Angokraščių formavimas", rv, "m", "d13"); }
    if (W.w_windows) excluded.push("Langų keitimas (kainą nurodysime po apžiūros)");
    // Elektra
    var scale = clamp(Math.pow(area / C.scaleRef, C.scaleExp), C.scaleMin, C.scaleMax);
    if (W.w_el_full) {
      var le = labourLine("w_el_full", "electric", "Visa elektros instaliacija (komplektas)", 1, "kompl.", "e07", { scale: scale });
      addMat(le, "sockets", q.el_points, "vnt.", "Rozetės ir jungikliai (" + q.el_points + " taškai)");
      addMat(le, "cable", q.el_points * SINGLE.cable.perPoint);
      notes.push("Skydelio medžiagų kaina nepatikrinta, neįtraukta.");
    }
    if (W.w_el_points && q.el_points > 0) { var lep = labourLine("w_el_points", "electric", "Nauji elektros taškai", q.el_points, "vnt.", "e01"); addMat(lep, "sockets", q.el_points); addMat(lep, "cable", q.el_points * SINGLE.cable.perPoint); }
    if (W.w_el_panel) labourLine("w_el_panel", "electric", "Elektros skydelio surinkimas", 1, "vnt.", "e03");
    if (W.w_lights && q.lights > 0) labourLine("w_lights", "electric", "Šviestuvų montavimas", q.lights, "vnt.", "e05");
    // Santechnika ir šildymas
    if (W.w_pl_full) labourLine("w_pl_full", "plumb", "Visa santechnikos instaliacija (komplektas)", 1, "kompl.", "p08", { scale: scale });
    if (W.w_pl_points && q.pl_points > 0) labourLine("w_pl_points", "plumb", "Nauji santechnikos taškai", q.pl_points, "vnt.", "p01");
    if (W.w_radiators && q.radiators > 0) { var lr = labourLine("w_radiators", "plumb", "Radiatorių keitimas", q.radiators, "vnt.", "h01"); addMat(lr, "radiator", q.radiators); }
    // Kita
    if (W.w_clean) labourLine("w_clean", "other", "Valymas po remonto", area, "m2", "o02");
    if (W.w_supervision) excluded.push("Techninė priežiūra (kainą nustato rangovas)");

    // Smulkios medžiagos 10 proc. nuo medžiagų (prielaida)
    var matSum = lines.reduce(function (s, l) { return addM(s, l.mat); }, fixed(0));
    if (!byClient && matSum.mid > 0) {
      var cons = { id: "w_consumables", group: "other", label: "Smulkios medžiagos (gruntas, juostos, silikonas)", qty: 1, unit: "kompl.", code: null, labour: fixed(0), mat: { low: matSum.low * C.consumablesPct, mid: matSum.mid * C.consumablesPct, high: matSum.high * C.consumablesPct }, matParts: [], conf: "N" };
      cons.matParts.push({ key: "consumables", label: "Smulkios medžiagos, 10 proc. nuo medžiagų", qty: 1, unit: "kompl.", tier: null, unitPriceIncl: null, ref: null, cost: cons.mat });
      lines.push(cons);
    }

    // Sumos (vid.)
    var labourMid = 0, labourLowEil = 0, labourHighEil = 0, matMid = 0, matLow = 0, matHigh = 0;
    lines.forEach(function (l) {
      labourMid += l.labour.mid;
      labourLowEil += l.labour.mid - k * (l.labour.mid - l.labour.low);
      labourHighEil += l.labour.mid + k * (l.labour.high - l.labour.mid);
      matMid += l.mat.mid; matLow += l.mat.low; matHigh += l.mat.high;
    });
    var subtotal = labourMid + matMid;
    var oldBuilding = a.age === "old_pre";
    var reservePct = lv.reserve + (oldBuilding ? C.reserveOldBonus : 0);
    var reserve = subtotal * reservePct;
    var design = 0;
    if (W.w_design) { design = area * prices(P, "o03").mid; }
    var mid = subtotal + reserve + design;
    var low = (labourLowEil + matLow + reserve + design) * (1 - u);
    var high = (labourHighEil + matHigh + reserve + design) * (1 + u);

    // Įspėjimai
    var warnings = [];
    var perM2net = area > 0 ? mid / area : 0;
    // Koridoriaus šaltinių PVM būsena nevienoda, todėl įspėjame tik kai vid. iškrenta ir be PVM, ir su PVM (prielaida).
    var perM2gross = perM2net * 1.21;
    if (!single && !byClient && (perM2gross < lv.corridor[0] || perM2net > lv.corridor[1])) warnings.push("Rezultatas neįprastas šiam lygiui (įprastai " + lv.corridor[0] + "-" + lv.corridor[1] + " EUR/m2). Patikrinkite pasirinkimus.");
    if (a.damp === "yes") warnings.push("Drėgmė ar pelėsis: priežastį ir sutvarkymo kainą nustatys meistras apžiūros metu. Į sumą neįtraukta.");
    if (a.damp === "unknown") warnings.push("Nežinoma, ar yra drėgmės. Jei bus, sutvarkymas į sumą neįtrauktas.");
    if (a.heightOpt === "unknown") warnings.push("Lubų aukštis nežinomas, naudojame 2,6 m.");

    // Trukmė (3.1). Prielaida.
    var tl;
    if (level === "partial") tl = [1, 3];
    else if (level === "standard") tl = [4, 8];
    else { tl = a.age === "new" ? [10, 16] : [8, 17]; if (level === "luxury") tl = [tl[0] * 1.25, tl[1] * 1.25]; }
    var ts = clamp(area / 60, 0.6, 2.0);
    tl = [tl[0] * ts, tl[1] * ts];
    if (W.w_design && a.plan === "want") tl = [tl[0] + C.designWeeks, tl[1] + C.designWeeks];
    tl = [Math.max(1, Math.round(tl[0])), Math.max(1, Math.round(tl[1]))];
    if (tl[1] <= tl[0]) tl[1] = tl[0] + 1;

    // Grupės
    var groups = GROUPS.map(function (gr) {
      var ls2 = lines.filter(function (l) { return l.group === gr.id; });
      var lab = ls2.reduce(function (s, l) { return s + l.labour.mid; }, 0);
      var mat = ls2.reduce(function (s, l) { return s + l.mat.mid; }, 0);
      return { id: gr.id, label: gr.label, labour: lab, materials: mat, total: lab + mat, lines: ls2 };
    });

    // PVM ir apvalinimas
    var vat = a.vat === "excl" ? "excl" : "incl";
    var f = vat === "incl" ? 1 + (cfg.vatRate || 0.21) : 1;
    var raw = { low: low * f, mid: mid * f, high: high * f };
    var total = { low: roundStep(raw.low), mid: roundStep(raw.mid), high: roundStep(raw.high) };
    if (total.low > total.mid) total.low = total.mid;
    if (total.high < total.mid) total.high = total.mid;
    var per = function (v) { return area > 0 ? Math.round(v / area / 10) * 10 : 0; };

    excluded = excluded.concat(["Baldai ir buitinė technika", "Langai (kol nėra patikrintos kainos)", "Techninė priežiūra", "Leidimai ir projektai statybai", "Bendrų stovų keitimas", "Netikėti darbai virš rezervo"]);
    excluded = excluded.filter(function (x, i) { return excluded.indexOf(x) === i; });

    return {
      version: C.version, vat: vat, factor: f, level: level, accuracy: acc, region: region, complexity: cx, flags: flags,
      area: area, rooms: rooms, q: q, works: W,
      raw: raw, total: total,
      perM2: { low: per(raw.low), mid: per(raw.mid), high: per(raw.high) },
      split: { labour: labourMid * f, materials: matMid * f, reserve: reserve * f, design: design * f },
      reservePct: reservePct,
      net: { labourMid: labourMid, matMid: matMid, subtotal: subtotal, reserve: reserve, design: design, mid: mid, low: low, high: high },
      groups: groups.map(function (gr) { return { id: gr.id, label: gr.label, labour: gr.labour * f, materials: gr.materials * f, total: gr.total * f, lines: gr.lines.map(function (l) { return { id: l.id, label: l.label, qty: l.qty, unit: l.unit, code: l.code, conf: l.conf, labour: l.labour.mid * f, materials: l.mat.mid * f, matParts: l.matParts.map(function (m) { return { key: m.key, label: m.label, qty: m.qty, unit: m.unit, tier: m.tier, unitPrice: m.unitPriceIncl == null ? null : (vat === "incl" ? m.unitPriceIncl : m.unitPriceIncl / 1.21), ref: m.ref, cost: m.cost.mid * f }; }) }; }) }; }),
      timeline: tl, warnings: warnings, notes: notes, excluded: excluded, byClient: byClient, priceDate: "2026-11"
    };
  }

  // "Kas gali pakeisti kainą": skirtumas tarp dabartinio ir blogesnio atsakymo (04, 2.6)
  function uncertainties(a, P, cfg) {
    var base = calculate(a, P, cfg).raw.mid;
    var c = [];
    function alt(label, patch) {
      var b = JSON.parse(JSON.stringify(a)); Object.keys(patch).forEach(function (k2) { b[k2] = patch[k2]; });
      if (patch.works === undefined && b.works) { /* paliekame vartotojo darbų pasirinkimus */ }
      var d = calculate(b, P, cfg).raw.mid - base;
      if (d > 1) c.push({ label: label, impact: roundStep(d) || 50 });
    }
    if (a.walls !== "very") alt(a.walls === "unknown" ? "Sienų būklė nežinoma. Jei sienos labai nelygios" : "Jei sienos labai nelygios ir reikia tinkuoti", { walls: "very" });
    if (a.state !== "bad" && a.state !== "shell") alt("Jei būklė bloga (seni laidai, vamzdžiai, trupantis tinkas)", { state: "bad" });
    if (a.buyer !== "client") {
      var m = {}; Object.keys(MATERIALS).forEach(function (k3) { m[k3] = 3; });
      alt("Jei rinksitės aukštesnės klasės medžiagas", { mat: m });
    }
    if (a.age === "unknown" || a.age === "old_post") alt("Jei pastatas statytas iki 1990 m. (didesnis rezervas)", { age: "old_pre" });
    if (a.tileHeight !== "ceiling") alt("Jei vonioje plytelės iki lubų", { tileHeight: "ceiling" });
    if (a.living !== "yes") alt("Jei gyvensite remonto metu", { living: "yes" });
    c.sort(function (x, y) { return y.impact - x.impact; });
    return c.slice(0, 3);
  }

  // Tikslumo lygis (5.2)
  function accuracyFrom(p) {
    if (p.roomsCustom && p.materialsDone && p.knownShare >= 0.7) return "good";
    if (p.worksDone || p.roomsCustom) return "medium";
    return "approx";
  }

  // Numatytieji atsakymai (04, 1 skyrius)
  function defaults(cfg) {
    cfg = cfg || g.CALC_CONFIG || {};
    var mat = {}; Object.keys(MATERIALS).forEach(function (k4) { mat[k4] = 2; });
    return {
      type: "flat", roomKind: "bath", age: "unknown", city: cfg.defaultCity || "kaunas", area: 55, rooms: 2, baths: "1",
      heightOpt: "2.6", heightExact: 3.0, floors: 1,
      state: "medium", walls: "slight", damp: "no", lift: "low", living: "no",
      level: "standard", works: {}, qty: {}, ceiling: "painted", customRooms: null,
      buyer: "contractor", floorDry: "laminate", floorWet: "tile", tileHeight: "2.0", mat: mat,
      start: "1-3", deadline: "no", deadlineDate: "", plan: "no", notes: "",
      vat: cfg.displayVat === "excl" ? "excl" : "incl", accuracy: "approx"
    };
  }

  var api = { C: C, defaults: defaults, ROOM_TYPES: ROOM_TYPES, TEMPLATES: TEMPLATES, MATERIALS: MATERIALS, SINGLE: SINGLE, GROUPS: GROUPS, WORKS: WORKS,
    defaultRooms: defaultRooms, quantities: quantities, defaultWorks: defaultWorks, worksState: worksState,
    calculate: calculate, uncertainties: uncertainties, accuracyFrom: accuracyFrom, roundStep: roundStep, height: height };
  g.RemontoCalc = api;
})(typeof window !== "undefined" ? window : globalThis);
