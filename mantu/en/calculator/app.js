// Calculator UI, English version. Same logic as ../../skaiciuokle/app.js; the engine (calc.js), prices (data.js) and config are shared.
// Engine labels are translated with window.trEN (i18n-en.js). State is kept in memory only (no cookies, no storage, no network requests).
// KEISTI: a native English speaker should review these texts.
(function () {
  "use strict";
  var CFG = window.CALC_CONFIG, P = window.KAINOS, R = window.RemontoCalc, tr = window.trEN;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- state ----------
  var S = {
    a: R.defaults(CFG),
    step: 0,
    maxStep: 0,
    flags: { worksDone: false, roomsCustom: false, materialsDone: false, matTouched: false, roomsOk: false },
    contact: { name: "", phone: "", email: "", pref: "call", time: "any", address: "", consent: false, marketing: false, website: "" },
    errors: {},
    helper: null,
    sent: null
  };
  var STEPS = ["Property", "Condition", "Level", "Work", "Rooms", "Materials", "Timing", "Result", "Contact"];

  // ---------- formats ----------
  var NB = " ";
  function fmt(v) { var s = Math.round(v).toString(); return s.replace(/\B(?=(\d{3})+(?!\d))/g, NB); }
  function eur(v) { return fmt(v) + " EUR"; }
  function dec(v, d) { return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toString(); }
  function price(v) { return v.toFixed(2) + " EUR"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function vatLbl() { return S.a.vat === "incl" ? "incl. VAT" : "excl. VAT"; }
  function ic(id, cls) { return '<svg class="ic ' + (cls || "") + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function hoursTxt(n) { n = Math.round(+n || 0); return n + " business hour" + (n === 1 ? "" : "s"); }
  function coParts() { var c = CFG.company; return [c.name, c.hours, "Kaunas, working across Lithuania"].filter(Boolean).map(esc).join(", "); }
  function cityLabel(id) { var r = CFG.regions.filter(function (x) { return x.id === id; })[0]; return r ? tr(r.label) : id; }
  function telHref() { return "tel:" + CFG.company.phone.replace(/[^\d+]/g, ""); }
  function accLabel(k) { return tr(R.C.accuracy[k].label); }

  // ---------- terms ----------
  var TERMS = {
    glaistymas: ["Skimming", "Levelling walls or ceilings with a thin layer of filler before painting."],
    gruntavimas: ["Priming", "A first liquid coat so that paint adheres better."],
    hidroizoliacija: ["Waterproofing", "A special protective layer in the bathroom so that water does not get into the walls."],
    seseline: ["Shadow gap", "A narrow dark strip between the wall and the ceiling."],
    potinkinis: ["Concealed WC frame", "A frame inside the wall: only the flush button and the toilet bowl are visible."],
    islyginamasis: ["Levelling layer", "A liquid compound to level the floor before the covering."],
    rezervas: ["Contingency", "Money for unexpected work. Usually 10-15%."]
  };
  var termSeq = 0;
  function term(key) {
    var t = TERMS[key]; if (!t) return "";
    var id = "tip-" + key + "-" + (++termSeq);
    return '<span class="term"><button type="button" class="term-btn" aria-expanded="false" aria-controls="' + id + '" aria-label="What is ' + esc(t[0].toLowerCase()) + '?">' + ic("i-info") + '</button><span class="term-tip" id="' + id + '" role="note" hidden><strong>' + esc(t[0]) + ".</strong> " + esc(t[1]) + "</span></span>";
  }

  // ---------- controls ----------
  function radios(name, legend, opts, value, extra) {
    extra = extra || {};
    var h = '<fieldset class="q' + (extra.cls ? " " + extra.cls : "") + '" id="fs-' + name + '"' + (S.errors[name] ? ' aria-describedby="err-' + name + '"' : "") + '><legend class="q-l">' + legend + (extra.term ? term(extra.term) : "") + "</legend>";
    if (extra.hint) h += '<p class="hint">' + extra.hint + "</p>";
    h += '<div class="opts ' + (extra.cols || "") + '">';
    opts.forEach(function (o) {
      var id = "r-" + name + "-" + String(o.v).replace(/[^a-z0-9]/gi, "_");
      h += '<label class="opt' + (o.icon ? " has-ic" : "") + '" for="' + id + '"><input class="sr-only" type="radio" name="' + name + '" id="' + id + '" value="' + esc(o.v) + '" data-bind="' + (extra.bind || name) + '"' + (String(value) === String(o.v) ? " checked" : "") + '><span class="opt-in">' + (o.icon ? ic(o.icon, "opt-ic") : "") + '<span class="opt-t">' + o.label + "</span>" + (o.desc ? '<span class="opt-d">' + o.desc + "</span>" : "") + "</span></label>";
    });
    h += "</div>";
    if (S.errors[name]) h += '<p class="err" id="err-' + name + '">' + S.errors[name] + "</p>";
    return h + "</fieldset>";
  }
  function toggle(id, label, checked, attrs, sub) {
    return '<label class="tgl" for="' + id + '"><input class="sr-only" type="checkbox" id="' + id + '" ' + (attrs || "") + (checked ? " checked" : "") + '><span class="switch" aria-hidden="true"></span><span class="tgl-t">' + label + (sub ? '<span class="tgl-s">' + sub + "</span>" : "") + "</span></label>";
  }
  function numField(id, label, value, attrs, hint, unit) {
    var err = S.errors[id];
    return '<div class="field"><label class="f-l" for="' + id + '">' + label + '</label><div class="f-row"><input class="inp" type="text" inputmode="decimal" id="' + id + '" value="' + esc(value) + '" ' + (attrs || "") + (err || hint ? ' aria-describedby="' + (hint ? "h-" + id + " " : "") + (err ? "err-" + id : "") + '"' : "") + (err ? ' aria-invalid="true"' : "") + ">" + (unit ? '<span class="unit">' + unit + "</span>" : "") + "</div>" + (hint ? '<p class="hint" id="h-' + id + '">' + hint + "</p>" : "") + (err ? '<p class="err" id="err-' + id + '">' + err + "</p>" : "") + "</div>";
  }
  function navButtons(nextLabel, opts) {
    opts = opts || {};
    return '<div class="step-nav">' + (S.step > 1 ? '<button type="button" class="btn ghost" data-act="back">' + ic("i-left") + "<span>Back</span></button>" : '<button type="button" class="btn ghost" data-act="intro">' + ic("i-left") + "<span>To the start</span></button>") + (opts.extra || "") + '<button type="button" class="btn primary" data-act="next">' + "<span>" + (nextLabel || "Next") + "</span>" + ic("i-right") + "</button></div>";
  }
  function head(title, lead) {
    return '<div class="step-head"><p class="eyebrow">Step ' + S.step + " of 9</p><h2 tabindex=\"-1\" id=\"stepTitle\">" + title + "</h2>" + (lead ? '<p class="lead">' + lead + "</p>" : "") + "</div>";
  }
  function errSummary() {
    var keys = Object.keys(S.errors); if (!keys.length) return "";
    return '<div class="err-sum" role="alert" tabindex="-1" id="errSum"><p><strong>Please check ' + (keys.length === 1 ? "this field" : "these fields") + ":</strong></p><ul>" + keys.map(function (k) { return '<li><a href="#' + (document.getElementById(k) ? k : "fs-" + k) + '">' + S.errors[k] + "</a></li>"; }).join("") + "</ul></div>";
  }

  // ---------- calculation ----------
  function knownShare() {
    var rel = relevantMaterials(); if (!rel.length) return 1;
    return rel.filter(function (k) { return S.a.mat[k] !== 0; }).length / rel.length;
  }
  function currentAccuracy() { return R.accuracyFrom({ worksDone: S.flags.worksDone, roomsCustom: S.flags.roomsCustom, materialsDone: S.flags.materialsDone, knownShare: knownShare() }); }
  function calc(patch) {
    var a = Object.assign({}, S.a, patch || {});
    a.accuracy = currentAccuracy();
    return R.calculate(a, P, CFG);
  }
  function relevantMaterials() {
    var a = S.a, W = R.worksState(a, a.customRooms), out = [];
    if (W.w_paint) out.push("paint");
    if (W.w_wallpaper) out.push("wallpaper");
    if (W.w_floor) { out.push("floor_" + (a.floorDry || "laminate")); if (a.floorWet === "vinyl") { if (out.indexOf("floor_vinyl") < 0) out.push("floor_vinyl"); } }
    if (W.w_skirting) out.push("skirting");
    if (W.w_bath_tile || (W.w_floor && a.floorWet === "tile")) out.push("tile");
    if (W.w_bath_tile) out.push("tile_wall");
    if (W.w_doors) out.push("door_leaf");
    if (W.w_wc) out.push("wc");
    if (W.w_shower) out.push("shower");
    if (W.w_vanity) out.push("vanity");
    if (W.w_shower || W.w_vanity) out.push("faucet");
    if (W.w_el_points || W.w_el_full) out.push("sockets");
    if (W.w_lights) out.push("lights");
    if (W.w_radiators) out.push("radiator");
    if (a.ceiling === "gkp" || W.w_drywall) out.push("gkp");
    return out;
  }

  // ---------- steps ----------
  function stepIntro() {
    var c = CFG.company;
    return '<div class="intro">' +
      '<div class="intro-txt"><p class="eyebrow">' + esc(c.name) + '</p><h2 class="display" tabindex="-1" id="stepTitle">How much will your renovation cost?</h2>' +
      '<p class="lead">Answer a few questions and you will see a preliminary price. No sign-up needed. We only ask for your contact details at the very end, and only if you want a more accurate estimate.</p>' +
      '<div class="cta-row"><button type="button" class="btn primary lg" data-act="start"><span>Start</span>' + ic("i-right") + '</button><a class="btn ghost lg" href="#method">How we calculate</a></div>' +
      '<p class="fine">Prices based on the Lithuanian market in November 2026. Updated every quarter.</p>' +
      '<ul class="perks"><li>' + ic("i-check") + "<span>A price range, not a single number</span></li><li>" + ic("i-check") + "<span>Labour and materials shown separately</span></li><li>" + ic("i-check") + "<span>About 3 minutes, no sign-up</span></li></ul></div>" +
      '<div class="intro-art" aria-hidden="true">' + heroArt() + "</div></div>";
  }
  function heroArt() {
    return '<svg viewBox="0 0 420 360" class="hero-svg" focusable="false">' +
      '<defs><pattern id="hg-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="1"/></pattern><pattern id="hg-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V8" stroke="rgba(255,255,255,.22)" stroke-width="1.6"/></pattern></defs>' +
      '<rect width="420" height="360" fill="url(#hg-grid)"/>' +
      '<g fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="M60 110 210 50 360 110V262L210 322 60 262Z" stroke-opacity=".9"/>' +
      '<path d="M210 50V202M60 262 210 202 360 262" stroke-opacity=".55"/>' +
      '<path d="M240 104 300 128V182L240 158Z" stroke="#ffc400"/><path d="M270 116V170M240 131 300 155" stroke="#ffc400" stroke-width="1.6"/>' +
      '<path d="M100 135 160 111V205L100 229Z"/><path d="M150 168v6" stroke-width="3"/>' +
      '</g>' +
      '<path d="M60 262 210 202 360 262 210 322Z" fill="url(#hg-hatch)"/>' +
      '<g stroke="#ffc400" stroke-width="2" fill="none" stroke-linecap="round"><path d="M250 236 290 220 330 236 290 252Z"/><path d="M250 236V250L290 266 330 250V236M290 252V266"/></g>' +
      '<g stroke="rgba(255,255,255,.55)" stroke-width="1.3" fill="none"><path d="M60 290 210 350M60 284V296M210 344V356"/><path d="M372 110V262M366 110H378M366 262H378"/></g>' +
      "</svg>";
  }
  // Example price chip removed on owner's request (2026-11-16): a price is shown only after the calculator is filled in.

  function step1() {
    var a = S.a, h = head("Property", "Tell us what you are renovating and how big it is.");
    h += errSummary();
    h += radios("type", "What are you renovating?", [{ v: "flat", label: "A flat", icon: "i-flat" }, { v: "house", label: "A house", icon: "i-house" }, { v: "room", label: "A single room", desc: "e.g. bathroom or kitchen", icon: "i-room" }], a.type, { cols: "c3" });
    if (a.type === "room") h += radios("roomKind", "Which one?", [{ v: "bath", label: "Bathroom" }, { v: "kitchen", label: "Kitchen" }, { v: "room", label: "Room" }, { v: "hall", label: "Hallway" }], a.roomKind, { cols: "c4" });
    h += radios("age", "What type of building is it?", [{ v: "new", label: "New build", desc: "unfinished or partly finished" }, { v: "old_pre", label: "Older building", desc: "built before about 1990" }, { v: "old_post", label: "Older building", desc: "built after 1990" }, { v: "unknown", label: "Don't know", desc: "we will assume built after 1990" }], a.age, { cols: "c2" });
    h += '<div class="field"><label class="f-l" for="city">Where is the property?</label><select class="inp" id="city" data-bind="city">' + CFG.regions.map(function (r) { return '<option value="' + r.id + '"' + (a.city === r.id ? " selected" : "") + ">" + esc(tr(r.label)) + "</option>"; }).join("") + "</select></div>";
    var lim = areaLimits();
    h += '<div class="field area-field"><label class="f-l" for="area">' + (a.type === "room" ? "What is the room's floor area?" : "What is the floor area?") + '</label><div class="area-row"><input type="range" id="areaRange" min="' + lim[0] + '" max="' + lim[1] + '" step="1" value="' + Math.min(lim[1], Math.max(lim[0], a.area)) + '" aria-label="Floor area slider, m2" data-bind="area"><div class="f-row sm"><input class="inp" type="text" inputmode="decimal" id="area" value="' + esc(a.area) + '" data-bind="area" aria-describedby="h-area' + (S.errors.area ? " err-area" : "") + '"' + (S.errors.area ? ' aria-invalid="true"' : "") + '><span class="unit">m2</span></div></div><p class="hint" id="h-area">Use the figure from your documents. If you renovate only part, enter the area of that part.</p>' + (S.errors.area ? '<p class="err" id="err-area">' + S.errors.area + "</p>" : "") + "</div>";
    if (a.type !== "room") {
      h += radios("rooms", "How many rooms?", [{ v: 1, label: "1" }, { v: 2, label: "2" }, { v: 3, label: "3" }, { v: 4, label: "4" }, { v: 5, label: "5 or more" }], a.rooms, { cols: "c5", hint: "Count bedrooms and the living room. Kitchen, bathroom and hallway are counted separately." });
      h += radios("baths", "How many bathrooms and WCs?", [{ v: "1", label: "1" }, { v: "2", label: "2" }, { v: "3", label: "3" }, { v: "0", label: "None", desc: "WC only" }], a.baths, { cols: "c4" });
    }
    h += radios("heightOpt", "How high are the ceilings?", [{ v: "2.5", label: "2.5 m" }, { v: "2.6", label: "2.6 m" }, { v: "2.7", label: "2.7 m" }, { v: "3.0", label: "3.0 m or more" }, { v: "unknown", label: "Don't know", desc: "we will use 2.6 m" }], a.heightOpt, { cols: "c5" });
    if (a.heightOpt === "3.0") h += numField("heightExact", "Exact ceiling height", a.heightExact, 'data-bind="heightExact"', "From 3.0 to 5.0 m. Above 3.1 m work costs a little more.", "m");
    if (a.type === "house") h += radios("floors", "How many floors are you renovating?", [{ v: 1, label: "1" }, { v: 2, label: "2" }, { v: 3, label: "3" }], a.floors, { cols: "c3" });
    return h + navButtons();
  }
  function areaLimits() { return S.a.type === "room" ? [2, 80] : [15, 400]; }

  function step2() {
    var a = S.a, h = head("Condition", "The condition changes how much preparation work is needed.");
    h += radios("state", "What is the current condition?", [{ v: "good", label: "Good", desc: "surfaces just need refreshing" }, { v: "medium", label: "Average", desc: "worn surfaces" }, { v: "bad", label: "Poor", desc: "a lot of preparation needed. For example old wiring or pipes, crumbling plaster, swollen floors." }, { v: "shell", label: "New build without finishes" }], a.state, { cols: "c2" });
    h += radios("walls", "Are the walls even?", [{ v: "even", label: "Even" }, { v: "slight", label: "Slightly uneven" }, { v: "very", label: "Very uneven", desc: "need plastering" }, { v: "unknown", label: "Don't know" }], a.walls, { cols: "c4" });
    h += radios("damp", "Is there any damp or mould?", [{ v: "no", label: "No" }, { v: "yes", label: "Yes" }, { v: "unknown", label: "Don't know" }], a.damp, { cols: "c3" });
    if (a.type !== "house") h += radios("lift", "Can materials be brought up by lift?", [{ v: "low", label: "I live on floor 1-2" }, { v: "cargo", label: "There is a goods lift" }, { v: "nolift35", label: "No lift", desc: "floor 3-5" }, { v: "nolift6", label: "No lift", desc: "floor 6 or higher" }], a.lift, { cols: "c4" });
    h += radios("living", "Will you live there during the renovation?", [{ v: "no", label: "No" }, { v: "yes", label: "Yes" }], a.living, { cols: "c2" });
    if (a.state === "bad" || a.damp === "yes") h += '<p class="callout">' + ic("i-info") + "<span>In this case a tradesperson usually needs to see the property. The calculator adds preparation work but cannot assess hidden problems.</span></p>";
    return h + navButtons();
  }

  var LEVEL_INFO = {
    partial: { t: "Partial (cosmetic)", d: "You refresh walls, ceilings and floors. Electrics and plumbing stay as they are.", inc: ["Removing old coverings", "Skimming and painting", "New floor covering and skirting", "Waste removal and cleaning"] },
    standard: { t: "Standard", d: "You refresh walls, ceilings, floors, doors and the bathroom, and replace part of the electrics and plumbing.", inc: ["Everything in partial", "Bathroom tiles and waterproofing", "New sanitary fittings", "Interior doors", "Some new electrical points"] },
    full: { t: "Full (major)", d: "Everything new: from demolition, wiring and pipes to finishing.", inc: ["Demolition, plastering and dry lining", "Floor levelling", "Full electrical installation with distribution board and plumbing", "Radiators, window sills, reveals"] },
    luxury: { t: "Premium", d: "A full renovation with higher-class materials and more complex solutions, e.g. concealed door frames, shadow gaps, large-format tiles.", inc: ["Everything in full", "Higher-class materials", "Shadow gaps, large-format tiles", "Underfloor heating and interior design project"] }
  };
  function step3() {
    var a = S.a, h = head("Renovation level", "The level decides which work is selected in the next step. You can change it there.");
    h += '<fieldset class="q"><legend class="q-l">What kind of renovation do you need?</legend><div class="levels">';
    R.C.levelOrder.forEach(function (lv) {
      var info = LEVEL_INFO[lv];
      var r = lv === a.level ? calc() : calc({ level: lv, works: {}, mat: S.flags.matTouched ? a.mat : matForLevel(lv) });
      var id = "r-level-" + lv;
      h += '<label class="lvl" for="' + id + '"><input class="sr-only" type="radio" name="level" id="' + id + '" value="' + lv + '" data-bind="level"' + (a.level === lv ? " checked" : "") + '><span class="lvl-in"><span class="lvl-top">' + levelArt(lv) + '<span class="lvl-price"><span class="lvl-k">about</span> ' + fmt(r.perM2.mid) + " EUR/m2 <span class=\"lvl-k\">" + vatLbl() + '</span></span></span><span class="lvl-t">' + info.t + '</span><span class="lvl-d">' + info.d + '</span><ul class="ticks">' + info.inc.map(function (x) { return "<li>" + ic("i-check") + "<span>" + x + "</span></li>"; }).join("") + "</ul></span></label>";
    });
    h += "</div></fieldset>";
    h += '<div class="helper"><button type="button" class="btn link" data-act="helper" aria-expanded="' + (S.helper ? "true" : "false") + '" aria-controls="helperBox">I am not sure which to choose</button>';
    if (S.helper) {
      var hp = S.helper;
      h += '<div class="helper-box" id="helperBox">' +
        radios("h_el", "Will you replace the electrical wiring?", [{ v: "yes", label: "Yes" }, { v: "part", label: "Partly" }, { v: "no", label: "No" }], hp.el, { cols: "c3", bind: "helper.el" }) +
        radios("h_pipe", "Will you replace the pipes?", [{ v: "yes", label: "Yes" }, { v: "no", label: "No" }], hp.pipe, { cols: "c2", bind: "helper.pipe" }) +
        radios("h_demo", "Will any partition walls be removed?", [{ v: "yes", label: "Yes" }, { v: "no", label: "No" }], hp.demo, { cols: "c2", bind: "helper.demo" });
      var sug = helperSuggest();
      if (sug) h += '<p class="callout ok">' + ic("i-check") + "<span>We suggest: <strong>" + LEVEL_INFO[sug].t + '</strong>.</span> <button type="button" class="btn sm" data-act="useSuggest" data-v="' + sug + '">Choose</button></p>';
      h += "</div>";
    }
    h += "</div>";
    return h + navButtons();
  }
  function helperSuggest() {
    var hp = S.helper; if (!hp || !hp.el || !hp.pipe || !hp.demo) return null;
    if (hp.demo === "yes" || (hp.el === "yes" && hp.pipe === "yes")) return "full";
    if (hp.el !== "no" || hp.pipe === "yes") return "standard";
    return "partial";
  }
  function matForLevel(lv) { var m = {}; R.MAT_KEYS.forEach(function (k) { m[k] = lv === "luxury" ? 3 : 2; }); return m; }
  function levelArt(lv) {
    var n = R.C.levelOrder.indexOf(lv) + 1, bars = "";
    for (var i = 0; i < 4; i++) bars += '<rect x="' + (4 + i * 11) + '" y="' + (30 - (i + 1) * 6) + '" width="8" height="' + ((i + 1) * 6) + '" rx="2" class="' + (i < n ? "on" : "off") + '"/>';
    return '<svg class="lvl-art" viewBox="0 0 50 34" aria-hidden="true">' + bars + "</svg>";
  }

  var GROUP_ICON = { prep: "i-hammer", walls: "i-brush", floors: "i-floor", bath: "i-drop", doors: "i-door", electric: "i-bolt", plumb: "i-pipe", other: "i-spark" };
  function ceilingRadios(name) {
    return radios(name, "Ceiling finish", [{ v: "painted", label: "Painted ceiling" }, { v: "gkp", label: "Plasterboard ceiling" }, { v: "stretch", label: "Stretch ceiling" }], S.a.ceiling, { cols: "c3", bind: "ceiling" });
  }
  function step4() {
    var a = S.a, W = R.worksState(a, a.customRooms), q = R.quantities(a, a.customRooms && a.customRooms.length ? a.customRooms : R.defaultRooms(a));
    var defs = R.defaultWorks(a, a.customRooms);
    var h = head("Work", "We selected the work for the level “" + LEVEL_INFO[a.level].t + "”. Change it if needed.");
    h += errSummary();
    h += '<div class="groups">';
    h += pkgBlock(a, W, q);
    R.GROUPS.forEach(function (gr) {
      var items = R.WORKS.filter(function (w) { return w.group === gr.id && !w.pkg; });
      h += '<fieldset class="wgroup"><legend class="wg-l">' + ic(GROUP_ICON[gr.id], "wg-ic") + "<span>" + esc(tr(gr.label)) + "</span></legend>";
      items.forEach(function (w) {
        var avail = true, why = "";
        if (w.cond === "wet" && q.wetRooms === 0) { avail = false; why = "No bathroom or WC."; }
        if (w.cond === "bath" && q.baths === 0) { avail = false; why = "No bathroom."; }
        if (w.cond === "wc" && q.wc === 0) { avail = false; why = "No WC."; }
        if (w.cond === "windows" && q.windows === 0) { avail = false; why = "The rooms have no windows."; }
        if (w.id === "w_el_points" && W.w_el_full) { avail = false; why = "Included in the full electrical installation."; }
        if (w.id === "w_pl_points" && W.w_pl_full) { avail = false; why = "Included in the full plumbing installation."; }
        var sub = w.note ? tr(w.note) : "";
        if (!avail) sub = why;
        h += '<div class="witem' + (avail ? "" : " off") + '">' + toggle("w-" + w.id, esc(tr(w.label)), avail && W[w.id], 'data-work="' + w.id + '"' + (avail ? "" : " disabled"), sub) + (w.term ? term(w.term) : "");
        if (w.qty && W[w.id] && avail) {
          var dq = q.defaults[w.qty];
          h += numField("qty-" + w.qty, esc(tr(w.qtyLabel)), a.qty[w.qty] != null ? a.qty[w.qty] : dq, 'data-qty="' + w.qty + '"', "Default: " + dq + ". If you don't know, keep the default, the accuracy will just be lower.", "pcs");
        }
        h += "</div>";
        if (w.id === "w_wallpaper") h += '<div class="witem wide">' + ceilingRadios("ceiling4") + "</div>";
      });
      h += "</fieldset>";
    });
    h += "</div>";
    var changed = Object.keys(a.works).filter(function (k) { return a.works[k] !== defs[k]; }).length;
    var extra = changed ? '<button type="button" class="btn ghost" data-act="resetWorks">' + ic("i-reset") + "<span>Reset to level</span></button>" : "";
    return h + navButtons("Next", { extra: extra });
  }

  function pkgAmount(p) {
    var d = Math.round(p.delta / 10) * 10;
    if (Math.abs(d) < 10) return { txt: "No change to the total for this property", cls: "" };
    if (p.on) return d > 0 ? { txt: "Included: +" + eur(d), cls: " on" } : { txt: "Included: replaces plaster, total lower by " + eur(-d), cls: " on" };
    return d > 0 ? { txt: "If switched on: +" + eur(d), cls: "" } : { txt: "If switched on instead of plaster, the total would drop by " + eur(-d), cls: "" };
  }
  function pkgShort(p) { var d = Math.round(p.delta / 10) * 10; return Math.abs(d) < 10 ? "0 EUR" : (d > 0 ? "+" : "-") + eur(Math.abs(d)); }
  function pkgImpact() { return R.packageImpact(Object.assign({}, S.a, { accuracy: currentAccuracy() }), P, CFG); }
  function pkgBlock(a, W, q) {
    var imp = pkgImpact();
    var h = '<fieldset class="wgroup pkgs"><legend class="wg-l">' + ic("i-spark", "wg-ic") + "<span>Optional work packages</span></legend>" +
      '<p class="hint pk-hint">Amounts include the contingency, ' + vatLbl() + ". Packages are on for the full and premium levels and off for partial and standard.</p>";
    imp.forEach(function (p) {
      var am = pkgAmount(p);
      var sub = esc(tr(p.desc)) + '<span class="pk-amt' + am.cls + '">' + am.txt + '</span><span class="pk-def">By level: ' + (p.def ? "on" : "off") + "</span>";
      h += '<div class="witem pk">' + toggle("w-" + p.id, esc(tr(p.label)), W[p.id], 'data-work="' + p.id + '"', sub);
      if (p.id === "w_el_full" && W.w_el_full) {
        h += numField("qty-el_points", "How many electrical points (sockets)?", a.qty.el_points != null ? a.qty.el_points : q.defaults.el_points, 'data-qty="el_points"', "Default: " + q.defaults.el_points + ". Sockets and cable are calculated from this number.", "pcs");
      }
      h += "</div>";
    });
    return h + "</fieldset>";
  }

  function roomsList() { return Array.isArray(S.a.customRooms) ? S.a.customRooms : null; }
  function roomName(n) { return tr(n); }
  function step5() {
    var a = S.a, rooms = roomsList() || R.defaultRooms(a);
    var h = head("Rooms", "Adjust the rooms. If you prefer, skip this step.");
    h += '<div class="step-tools"><button type="button" class="btn ghost" data-act="skipRooms"><span>Skip, use the standard split</span>' + ic("i-right") + "</button></div>";
    h += errSummary();
    if (S.flags.roomsRescaled && rooms.length) h += '<p class="callout" role="status">' + ic("i-info") + "<span>You changed the total floor area, so we rescaled the room areas proportionally. Please check them.</span></p>";
    if (!rooms.length) h += '<p class="callout warn" id="fs-rooms" tabindex="-1">' + ic("i-info") + "<span>The room list is empty. Add a room, restore the original list or skip the step.</span></p>";
    var sum = rooms.reduce(function (s, r) { return s + (parseFloat(String(r.area).replace(",", ".")) || 0); }, 0);
    h += '<div class="rooms">';
    rooms.forEach(function (r, i) {
      h += '<fieldset class="room"><legend class="sr-only">Room ' + (i + 1) + "</legend>" +
        '<div class="room-h"><span class="room-n" aria-hidden="true">' + (i + 1) + '</span><div class="field grow"><label class="f-l" for="rn-' + i + '">Name</label><input class="inp" id="rn-' + i + '" value="' + esc(roomName(r.name)) + '" data-room="' + i + '" data-k="name" maxlength="40"></div>' +
        '<button type="button" class="btn icon" data-act="delRoom" data-i="' + i + '" aria-label="Remove room ' + esc(roomName(r.name)) + '">' + ic("i-trash") + "</button></div>" +
        '<div class="room-g"><div class="field"><label class="f-l" for="rt-' + i + '">Type</label><select class="inp" id="rt-' + i + '" data-room="' + i + '" data-k="type">' + Object.keys(R.ROOM_TYPES).map(function (k) { return '<option value="' + k + '"' + (r.type === k ? " selected" : "") + ">" + esc(tr(R.ROOM_TYPES[k].label)) + "</option>"; }).join("") + "</select></div>" +
        roomNum(i, "area", "Area", r.area, "m2") + roomNum(i, "windows", "Windows", r.windows, "pcs") + roomNum(i, "doors", "Doors", r.doors, "pcs") +
        '<div class="field">' + toggle("rw-" + i, "Wet area", !!r.wet, 'data-room="' + i + '" data-k="wet"', "bathroom or WC") + "</div></div></fieldset>";
    });
    h += "</div>";
    var diff = a.area > 0 ? Math.abs(sum - a.area) / a.area : 0;
    h += '<div class="rooms-foot"><p class="sum' + (diff > 0.05 ? " warn" : "") + '" id="roomSum">Sum of room areas: <strong>' + dec(sum, 1) + " m2</strong> of " + dec(a.area, 1) + " m2</p>" +
      '<div class="btn-row"><button type="button" class="btn ghost" data-act="addRoom">' + ic("i-plus") + '<span>Add a room</span></button><button type="button" class="btn ghost" data-act="resetRooms">' + ic("i-reset") + "<span>Restore original</span></button></div></div>";
    if (diff > 0.05) h += '<div class="callout warn" role="status">' + ic("i-info") + "<span>The sum of room areas (" + dec(sum, 1) + " m2) differs from the total area (" + dec(a.area, 1) + " m2). Continue anyway? We will calculate from the sum of rooms.</span></div>";
    return h + navButtons(diff > 0.05 ? "Continue anyway" : "Next");
  }
  function roomNum(i, k, label, v, unit) {
    var id = "r" + k[0] + "-" + i + "-" + k, err = S.errors[id];
    return '<div class="field"><label class="f-l" for="' + id + '">' + label + '</label><div class="f-row sm"><input class="inp" type="text" inputmode="decimal" id="' + id + '" value="' + esc(typeof v === "number" ? dec(v, 1) : v) + '" data-room="' + i + '" data-k="' + k + '"' + (err ? ' aria-invalid="true" aria-describedby="err-' + id + '"' : "") + '><span class="unit">' + unit + "</span></div>" + (err ? '<p class="err" id="err-' + id + '">' + err + "</p>" : "") + "</div>";
  }

  function lowConf(key, tierIdx) {
    var t = R.MATERIALS[key].tiers[tierIdx];
    return t && (t.conf === "C" || t.conf === "N");
  }
  var TIER = ["Don't know", "Economy", "Medium", "Higher"];
  function step6() {
    var a = S.a, h = head("Materials", "Choose the materials. Not sure? Leave “Medium”.");
    h += radios("buyer", "Who will buy the materials?", [{ v: "contractor", label: "The contractor", desc: "include in the price" }, { v: "client", label: "I will buy them", desc: "show labour only" }], a.buyer, { cols: "c2" });
    if (a.buyer === "client") h += '<p class="callout">' + ic("i-info") + "<span>Material prices below are for information only. They are not included in the total.</span></p>";
    var W = R.worksState(a, a.customRooms);
    if (W.w_floor) {
      h += radios("floorDry", "Floors: rooms (living room with kitchen, bedrooms)", [{ v: "laminate", label: "Laminate" }, { v: "vinyl", label: "Vinyl" }, { v: "parquet", label: "Engineered wood" }], a.floorDry, { cols: "c3" });
      h += radios("floorWet", "Floors: hallway and separate kitchen", [{ v: "tile", label: "Tiles" }, { v: "vinyl", label: "Vinyl" }], a.floorWet, { cols: "c2", hint: "Bathroom floors are included with the bathroom tiles." });
    }
    h += ceilingRadios("ceiling6");
    if (W.w_bath_tile) h += radios("tileHeight", "Bathroom wall tiles", [{ v: "2.0", label: "Up to 2 m high" }, { v: "ceiling", label: "Up to the ceiling" }], a.tileHeight, { cols: "c2" });
    var rel = relevantMaterials();
    h += '<h3 class="sub-h">Material class</h3><p class="hint">Unit prices, ' + vatLbl() + ". Examples from Lithuanian retail stores (November 2026, regular price without loyalty card). Where two stores are available, their average is shown.</p>";
    rel.forEach(function (key) {
      var m = R.MATERIALS[key], cur = a.mat[key];
      h += '<fieldset class="q mat"><legend class="q-l">' + esc(tr(m.label)) + '</legend><div class="opts c4">';
      [1, 2, 3, 0].forEach(function (t) {
        var id = "m-" + key + "-" + t, tier = t ? m.tiers[t - 1] : null;
        var p = tier ? tier.net * (a.vat === "incl" ? 1 + CFG.vatRate : 1) : null;
        var note = tier && tier.missing ? '<span class="opt-n">No price for this class, the nearest class is used.</span>' : t && lowConf(key, t - 1) ? '<span class="opt-n">Indicative price, we will check it with the supplier.</span>' : "";
        h += '<label class="opt mat-o" for="' + id + '"><input class="sr-only" type="radio" name="mat-' + key + '" id="' + id + '" value="' + t + '" data-mat="' + key + '"' + (cur === t ? " checked" : "") + '><span class="opt-in"><span class="opt-t">' + TIER[t] + "</span>" + (tier ? '<span class="opt-p">' + price(p) + " / " + esc(tr(m.unit)) + '</span><span class="opt-d">' + esc(tr(tier.example)) + "</span>" : '<span class="opt-d">We will use medium, and the range will be wider.</span>') + note + "</span></label>";
      });
      h += "</div></fieldset>";
    });
    h += '<p class="fine">Brand names are only price examples. Windows, furniture, household appliances, boilers and heat pumps are not included in the calculator.</p>';
    return h + navButtons();
  }

  function step7() {
    var a = S.a, h = head("Timing", "Last questions before the result.");
    h += errSummary();
    h += radios("start", "When do you plan to start?", [{ v: "1m", label: "Within a month" }, { v: "1-3", label: "In 1-3 months" }, { v: "3-6", label: "In 3-6 months" }, { v: "later", label: "Not planning yet", desc: "just looking" }], a.start, { cols: "c4" });
    h += radios("deadline", "Is there a date by which it must be finished?", [{ v: "no", label: "No" }, { v: "yes", label: "Yes" }], a.deadline, { cols: "c2" });
    if (a.deadline === "yes") h += '<div class="field"><label class="f-l" for="deadlineDate">Date</label><input class="inp" type="date" id="deadlineDate" value="' + esc(a.deadlineDate) + '" data-bind="deadlineDate"' + (S.errors.deadlineDate ? ' aria-invalid="true" aria-describedby="err-deadlineDate"' : "") + ">" + (S.errors.deadlineDate ? '<p class="err" id="err-deadlineDate">' + S.errors.deadlineDate + "</p>" : "") + "</div>";
    h += radios("plan", "Do you already have an interior design project or plan?", [{ v: "yes", label: "Yes" }, { v: "no", label: "No" }, { v: "want", label: "I would like one" }], a.plan, { cols: "c3" });
    h += '<div class="field"><label class="f-l" for="notes">Anything else important? <span class="opt-mark">(optional)</span></label><p class="hint" id="h-notes">Do not enter passwords or personal ID numbers.</p><textarea class="inp" id="notes" rows="4" maxlength="500" data-bind="notes" aria-describedby="h-notes notesCount">' + esc(a.notes) + '</textarea><p class="hint right" id="notesCount">' + a.notes.length + " / 500</p></div>";
    return h + navButtons("Show result");
  }

  // ---------- result ----------
  function donut(r) {
    var parts = [["Labour", r.split.labour, "#1438c8", "seg-l"], ["Materials", r.split.materials, "url(#pat-stripe)", "seg-m"], ["Contingency", r.split.reserve, "url(#pat-dots)", "seg-r"]];
    if (r.split.design > 0) parts.push(["Design project", r.split.design, "url(#pat-cross)", "seg-d"]);
    var tot = parts.reduce(function (s, p) { return s + p[1]; }, 0) || 1, C = 2 * Math.PI * 52, off = 0, segs = "";
    var pct = parts.map(function (p) { return Math.round(p[1] / tot * 100); });
    parts.forEach(function (p) {
      var len = p[1] / tot * C; if (len <= 0) return;
      segs += '<circle cx="70" cy="70" r="52" fill="none" stroke="' + p[2] + '" stroke-width="22" stroke-dasharray="' + Math.max(0, len - 1.5).toFixed(2) + " " + (C - Math.max(0, len - 1.5)).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 70 70)"/>';
      off += len;
    });
    var alt = "Chart: " + parts.map(function (p, i) { return p[0].toLowerCase() + " " + pct[i] + "%"; }).join(", ");
    var legend = '<table class="legend"><caption class="sr-only">Price parts</caption><thead><tr><th scope="col">Part</th><th scope="col" class="num">Amount</th><th scope="col" class="num">Share</th></tr></thead><tbody>' + parts.map(function (p, i) { return '<tr><th scope="row"><span class="sw ' + p[3] + '" aria-hidden="true"></span>' + p[0] + (p[0] === "Contingency" ? " (" + Math.round(r.reservePct * 100) + "%)" + term("rezervas") : "") + '</th><td class="num">' + eur(p[1]) + '</td><td class="num">' + pct[i] + "%</td></tr>"; }).join("") + "</tbody></table>";
    return '<figure class="donut-fig"><svg class="donut" viewBox="0 0 140 140" role="img" aria-label="' + alt + '"><circle cx="70" cy="70" r="52" fill="none" stroke="#ece6dc" stroke-width="22"/>' + segs + '<text x="70" y="66" text-anchor="middle" class="d-k">about</text><text x="70" y="84" text-anchor="middle" class="d-v">' + shortK(r.total.mid) + "</text></svg>" + '<figcaption class="sr-only">' + alt + '</figcaption><div class="table-wrap">' + legend + "</div></figure>";
  }
  function shortK(v) { return v >= 10000 ? dec(v / 1000, 1) + "k" : fmt(v); }

  function step8() {
    var a = S.a, r = calc(), u = R.uncertainties(Object.assign({}, a, { accuracy: currentAccuracy() }), P, CFG), c = CFG.company;
    var accIdx = { approx: 1, medium: 2, good: 3 }[r.accuracy];
    var accTxt = { approx: "Accuracy: indicative. Refine the work, rooms and materials to get a narrower range.", medium: "Accuracy: medium. Fill in the rooms and materials to get a more accurate range.", good: "Accuracy: good. We will discuss the exact price when we get in touch." }[r.accuracy];
    var h = '<div class="result">';
    h += '<div class="res-hero"><p class="eyebrow">Step 8 of 9</p><h2 tabindex="-1" id="stepTitle">Your preliminary renovation price</h2>' +
      '<p class="big" id="resRange">from <span class="nb">' + eur(r.total.low) + '</span> to <span class="nb">' + eur(r.total.high) + "</span></p>" +
      '<p class="mid">Most likely about <strong>' + eur(r.total.mid) + "</strong> (about " + fmt(r.perM2.mid) + " EUR/m2), " + vatLbl() + ".</p>" +
      '<div class="acc"><div class="acc-bar" aria-hidden="true">' + [1, 2, 3].map(function (i) { return '<span class="' + (i <= accIdx ? "on" : "") + '"></span>'; }).join("") + '</div><p class="acc-t">' + accTxt + "</p>" + (r.accuracy !== "good" ? '<button type="button" class="btn sm ghost" data-act="refine">' + ic("i-edit") + "<span>Refine</span></button>" : "") + "</div>" +
      '<div class="res-vat"><label class="vat-switch"><input type="checkbox" id="vatToggle2" class="sr-only"' + (a.vat === "excl" ? " checked" : "") + '><span class="switch" aria-hidden="true"></span><span>Show prices excluding VAT</span></label></div>';
    if (r.warnings.length) h += r.warnings.map(function (w) { return '<p class="callout warn">' + ic("i-info") + "<span>" + esc(tr(w)) + "</span></p>"; }).join("");
    h += "</div>";

    h += '<div class="res-grid">';
    h += '<section class="card" aria-labelledby="h-split"><h3 id="h-split">Labour, materials and contingency</h3>' + donut(r) + (r.byClient ? '<p class="fine">You will buy the materials yourself. Their cost is not included in the total.</p>' : "") + "</section>";
    h += '<section class="card" aria-labelledby="h-time"><h3 id="h-time">Preliminary duration</h3><p class="weeks">' + ic("i-clock", "big-ic") + "<span><strong>" + r.timeline[0] + "-" + r.timeline[1] + " weeks</strong></span></p><p>About " + r.timeline[0] + "-" + r.timeline[1] + " weeks from the start of work, not counting the time to order materials.</p>" +
      '<h3 class="mt">What could change the price</h3><ul class="chg">' + (u.length ? u.map(function (x) { return "<li><span>" + esc(tr(x.label)) + '</span><strong class="nb">up to +' + eur(x.impact) + "</strong></li>"; }).join("") : "<li><span>We found no major uncertainties.</span></li>") + "</ul></section>";
    h += "</div>";

    var tot = r.raw.mid || 1;
    h += '<section class="card" aria-labelledby="h-groups"><h3 id="h-groups">Breakdown by type of work</h3><p class="hint">Medium scenario, ' + vatLbl() + '. Expand a group to see the lines.</p><div class="glist">';
    r.groups.forEach(function (g) {
      if (g.total <= 0) return;
      var share = g.total / tot * 100, gl = esc(tr(g.label));
      h += '<details class="grp"><summary><span class="g-ic">' + ic(GROUP_ICON[g.id]) + '</span><span class="g-main"><span class="g-t">' + gl + '</span><span class="g-bar" aria-hidden="true"><span class="g-l" style="width:' + (g.labour / tot * 100).toFixed(1) + '%"></span><span class="g-m" style="width:' + (g.materials / tot * 100).toFixed(1) + '%"></span></span></span><span class="g-v"><strong>' + eur(g.total) + "</strong><span>" + dec(share, 0) + "%</span></span></summary>" +
        '<div class="table-wrap"><table class="lines stack"><caption class="sr-only">' + gl + '</caption><thead><tr><th scope="col">Work</th><th scope="col" class="num">Quantity</th><th scope="col" class="num">Labour</th><th scope="col" class="num">Materials</th></tr></thead><tbody>' +
        g.lines.map(function (l) { return '<tr><th scope="row">' + esc(tr(l.label)) + '</th><td class="num' + (l.code ? "" : " empty") + '" data-label="Quantity">' + (l.code ? dec(l.qty, l.qty < 10 ? 1 : 0) + " " + esc(tr(l.unit)) : "") + '</td><td class="num" data-label="Labour">' + eur(l.labour) + '</td><td class="num" data-label="Materials">' + eur(l.materials) + "</td></tr>"; }).join("") +
        '</tbody><tfoot><tr><th scope="row">Total</th><td class="empty"></td><td class="num" data-label="Labour">' + eur(g.labour) + '</td><td class="num" data-label="Materials">' + eur(g.materials) + "</td></tr></tfoot></table></div></details>";
    });
    h += '</div><div class="g-legend" aria-hidden="true"><span><i class="sw seg-l"></i>Labour</span><span><i class="sw seg-m"></i>Materials</span></div>';
    h += '<p class="tot-row"><span>Labour</span><strong>' + eur(r.split.labour) + "</strong></p><p class=\"tot-row\"><span>Materials</span><strong>" + eur(r.split.materials) + '</strong></p><p class="tot-row"><span>Contingency (' + Math.round(r.reservePct * 100) + "%)</span><strong>" + eur(r.split.reserve) + "</strong></p>" + (r.split.design ? '<p class="tot-row"><span>Interior design project</span><strong>' + eur(r.split.design) + "</strong></p>" : "") + '<p class="tot-row sum"><span>Total, medium scenario</span><strong>' + eur(r.raw.mid) + '</strong></p><p class="fine">The same total rounded is shown above: about ' + eur(r.total.mid) + ", " + vatLbl() + ".</p></section>";

    h += '<section class="card" aria-labelledby="h-pkg"><h3 id="h-pkg">Optional work packages</h3><ul class="chg pk-list">' + pkgImpact().map(function (p) { return "<li><span>" + esc(tr(p.label)) + '<span class="pk-st">' + (p.on ? "Included in the total" : "Not included") + '</span></span><strong class="nb">' + pkgShort(p) + "</strong></li>"; }).join("") + '</ul><p class="fine">Amounts include the contingency, ' + vatLbl() + '. Each package\'s effect is calculated separately, leaving your other choices as they are. When both levelling packages are on, dry lining replaces plaster in the rooms. You can change the packages in the “Work” step.</p></section>';

    var ml = materialList(r);
    h += '<section class="card" aria-labelledby="h-mat"><h3 id="h-mat">Materials list</h3>' + (ml.length ? '<div class="table-wrap"><table class="lines stack mats"><caption class="sr-only">Materials list</caption><thead><tr><th scope="col">Material</th><th scope="col">Class</th><th scope="col" class="num">Quantity</th><th scope="col" class="num">Unit price</th><th scope="col" class="num">Amount</th></tr></thead><tbody>' + ml.map(function (m) { return '<tr><th scope="row">' + esc(tr(m.label)) + (m.weak ? ' <span class="weak" title="Indicative price">*</span>' : "") + '</th><td data-label="Class">' + m.tierName + '</td><td class="num" data-label="Quantity">' + dec(m.qty, m.qty < 10 ? 1 : 0) + " " + esc(tr(m.unit)) + '</td><td class="num' + (m.unitPrice != null ? "" : " empty") + '" data-label="Unit price">' + (m.unitPrice != null ? price(m.unitPrice) : "") + '</td><td class="num" data-label="Amount">' + eur(m.cost) + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p>You will buy the materials yourself, so no list was prepared.</p>') + '<p class="fine">Quantities include allowances for waste. Prices ' + vatLbl() + ". " + (r.byClient ? "" : "Amounts are included in the price. ") + (ml.some(function (m) { return m.weak; }) ? "* Indicative price: a single source, a competitor's model or our assumption. We will check it with the supplier." : "") + "</p></section>";

    h += '<div class="res-grid"><section class="card" aria-labelledby="h-ex"><h3 id="h-ex">Not included</h3><ul class="dash">' + r.excluded.map(function (x) { return "<li>" + esc(tr(x)) + "</li>"; }).join("") + r.notes.map(function (x) { return "<li>" + esc(tr(x)) + "</li>"; }).join("") + "</ul></section>";
    h += '<section class="card soft" aria-labelledby="h-read"><h3 id="h-read">How to read the estimate</h3><p>The range shows the likely limits, and “about” is the medium scenario. The contingency covers unexpected work.</p><p>The range is indicative. We will discuss the exact price when we get in touch. This is not an offer.</p><p><a class="inline-link" href="#method">How we calculate</a>. Price sources and date: November 2026.</p></section></div>';

    h += '<section class="card actions" aria-labelledby="h-act"><h3 id="h-act">What to do next</h3><div class="act-grid">' +
      '<button type="button" class="btn primary lg" data-act="toContacts"><span>Get an exact estimate</span>' + ic("i-right") + "</button>" +
      '<button type="button" class="btn ghost" data-act="print">' + ic("i-print") + "<span>Print or save as PDF</span></button>" +
      '<button type="button" class="btn ghost" data-act="csv">' + ic("i-download") + "<span>Download CSV</span></button>" +
      '<a class="btn ghost" href="' + telHref() + '">' + ic("i-phone") + "<span>Call " + esc(c.phone) + "</span></a>" +
      '<button type="button" class="btn ghost" data-act="edit">' + ic("i-edit") + "<span>Change answers</span></button></div>" +
      '<p class="fine">' + coParts() + '. Email <a class="inline-link" href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>." + (c.responseHours ? " We reply within " + hoursTxt(c.responseHours) + "." : "") + "</p></section>";
    return h + "</div>";
  }
  function materialList(r) {
    var map = {}, out = [];
    r.groups.forEach(function (g) { g.lines.forEach(function (l) { l.matParts.forEach(function (m) {
      var k = m.key + "|" + m.unit + "|" + m.tier;
      if (!map[k]) { map[k] = { label: m.label, qty: 0, unit: m.unit, unitPrice: m.unitPrice, cost: 0, tierName: m.tier === 1 ? "Economy" : m.tier === 2 ? "Medium" : m.tier === 3 ? "Higher" : m.tier === 0 ? "Don't know" : "Single price" }; out.push(map[k]); }
      map[k].qty += m.qty; map[k].cost += m.cost;
      if (m.conf === "C" || m.conf === "N" || m.key === "consumables") map[k].weak = true;
    }); }); });
    return out;
  }

  // ---------- contact ----------
  function step9() {
    var ct = S.contact, pv = CFG.privacy, c = CFG.company;
    var h = head("Contact", "Leave your contact details and " + esc(c.name) + " will prepare an exact estimate. Your answers will be added to the email.");
    if (S.sent) return h + sentView();
    h += errSummary();
    h += '<form class="cform" id="cform" novalidate>';
    h += '<div class="hp" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" tabindex="-1" autocomplete="off" value=""></div>';
    h += '<div class="f-grid">' + textField("c_name", "Name", ct.name, 'autocomplete="name" maxlength="60" required', true) +
      textField("c_phone", "Phone number", ct.phone, 'type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="+370 6xx xxxxx" required', true) +
      textField("c_email", "Email", ct.email, 'type="email" inputmode="email" autocomplete="email" maxlength="80"', false, "Optional. Needed if you want a reply by email.") +
      textField("c_addr", "Property address or area", ct.address, 'autocomplete="street-address" maxlength="120"', false, "Optional.") + "</div>";
    h += radios("c_pref", "How should we contact you?", [{ v: "call", label: "Phone call" }, { v: "sms", label: "Text message" }, { v: "email", label: "Email" }], ct.pref, { cols: "c3", bind: "contact.pref" });
    h += radios("c_time", "When is best? <span class=\"opt-mark\">(optional)</span>", [{ v: "morning", label: "Mornings" }, { v: "day", label: "Daytime" }, { v: "evening", label: "Evenings" }, { v: "any", label: "Any time" }], ct.time, { cols: "c4", bind: "contact.time" });
    h += '<div class="privacy"><p class="lawyer">' + ic("i-shield") + "<span><strong>Draft.</strong> A lawyer must review these texts before launch. The company fills in the {{...}} placeholders.</span></p>" +
      "<p>Your data is processed by " + esc(pv.controller) + ", company code 305060463, " + esc(pv.address) + ". We process your name, phone, email (if given), property details and calculator answers. Purpose: to contact you about this enquiry. Legal basis: your consent. We keep the data for " + esc(pv.retention) + ", unless you withdraw earlier. Your calculator answers are not sent anywhere until you press “Send enquiry”. You can withdraw your consent at any time, ask for a copy of your data, or have it corrected or deleted by writing to " + esc(pv.email) + ". You can complain to the State Data Protection Inspectorate of Lithuania. More: " + esc(pv.policyUrl) + ".</p></div>";
    h += '<div class="consents">' + toggleBox("c_consent", "I agree that " + esc(pv.controller) + " may process my name, phone, email and calculator answers to contact me about this enquiry.", ct.consent, true) +
      toggleBox("c_marketing", "I agree to receive offers and news by email or phone. I can unsubscribe at any time. <span class=\"opt-mark\">(optional)</span>", ct.marketing, false) + "</div>";
    h += '<div class="step-nav"><button type="button" class="btn ghost" data-act="back">' + ic("i-left") + '<span>Back to the result</span></button><button type="submit" class="btn primary">' + "<span>Send enquiry</span>" + ic("i-right") + "</button></div>";
    h += '<p class="fine">When you press the button, your email app opens with a ready message. You send it yourself.</p></form>';
    return h;
  }
  function textField(id, label, v, attrs, req, hint) {
    var err = S.errors[id];
    return '<div class="field"><label class="f-l" for="' + id + '">' + label + (req ? ' <span class="req" aria-hidden="true">*</span>' : "") + '</label><input class="inp" id="' + id + '" value="' + esc(v) + '" data-c="' + id + '" ' + attrs + (err || hint ? ' aria-describedby="' + (hint ? "h-" + id + " " : "") + (err ? "err-" + id : "") + '"' : "") + (err ? ' aria-invalid="true"' : "") + ">" + (hint ? '<p class="hint" id="h-' + id + '">' + hint + "</p>" : "") + (err ? '<p class="err" id="err-' + id + '">' + err + "</p>" : "") + "</div>";
  }
  function toggleBox(id, label, checked, req) {
    var err = S.errors[id];
    return '<div class="cbox' + (err ? " bad" : "") + '"><label for="' + id + '"><input type="checkbox" class="sr-only" id="' + id + '" data-c="' + id + '"' + (checked ? " checked" : "") + (err ? ' aria-invalid="true" aria-describedby="err-' + id + '"' : "") + (req ? " required" : "") + '><span class="box" aria-hidden="true">' + ic("i-check") + "</span><span>" + label + "</span></label>" + (err ? '<p class="err" id="err-' + id + '">' + err + "</p>" : "") + "</div>";
  }
  function sentView() {
    var c = CFG.company, href = S.sent.href;
    return '<div class="sent card"><p class="sent-ic">' + ic("i-check", "big-ic") + "</p><h3>Thank you, " + esc(S.contact.name) + ". Your email is ready.</h3><p>Last step: open the email and press “Send” in your email app." + (c.responseHours ? " Once we receive it, we will contact you within " + hoursTxt(c.responseHours) + "." : " Once we receive it, we will contact you.") + "</p>" +
      '<div class="act-grid"><a class="btn primary lg" id="mailtoLink" href="' + esc(href) + '">' + ic("i-mail") + "<span>Open email</span></a>" +
      '<button type="button" class="btn ghost" data-act="csv">' + ic("i-download") + "<span>Download CSV</span></button>" +
      '<button type="button" class="btn ghost" data-act="print">' + ic("i-print") + "<span>Print or save as PDF</span></button>" +
      '<button type="button" class="btn ghost" data-act="toResult">' + ic("i-left") + "<span>Back to the result</span></button></div>" +
      '<p class="fine">If your email app does not open, write to ' + esc(c.email) + " and attach the downloaded CSV file.</p></div>";
  }

  // ---------- summaries (email, CSV, print) ----------
  var TXT = {
    type: { flat: "Flat", house: "House", room: "Single room" },
    roomKind: { bath: "bathroom", kitchen: "kitchen", room: "room", hall: "hallway" },
    age: { new: "New build", old_pre: "Older building (before 1990)", old_post: "Older building (after 1990)", unknown: "Unknown" },
    state: { good: "Good", medium: "Average", bad: "Poor", shell: "New build without finishes" },
    walls: { even: "Even", slight: "Slightly uneven", very: "Very uneven", unknown: "Unknown" },
    damp: { no: "No", yes: "Yes", unknown: "Unknown" },
    start: { "1m": "Within a month", "1-3": "In 1-3 months", "3-6": "In 3-6 months", later: "Not planning yet" },
    plan: { yes: "Has one", no: "Does not have one", want: "Would like one" },
    pref: { call: "Phone call", sms: "Text message", email: "Email" },
    time: { morning: "Mornings", day: "Daytime", evening: "Evenings", any: "Any time" }
  };
  function plain(v) { return fmt(v).replace(/ /g, " "); }
  function summaryLines(r) {
    var a = S.a;
    return [
      "Property: " + TXT.type[a.type] + (a.type === "room" ? " (" + TXT.roomKind[a.roomKind] + ")" : "") + ", " + dec(r.area, 1) + " m2" + (a.type !== "room" ? ", rooms " + a.rooms + ", bathrooms " + (a.baths === "0" ? "0 (WC only)" : a.baths) : "") + ", ceilings " + dec(R.height(a), 2) + " m",
      "City: " + cityLabel(a.city) + ". Building: " + TXT.age[a.age] + ". Condition: " + TXT.state[a.state] + ". Walls: " + TXT.walls[a.walls] + ". Damp: " + TXT.damp[a.damp],
      "Level: " + LEVEL_INFO[r.level].t + ". Materials bought by: " + (a.buyer === "client" ? "client" : "contractor"),
      "Preliminary price (" + vatLbl() + "): from " + plain(r.total.low) + " to " + plain(r.total.high) + " EUR, about " + plain(r.total.mid) + " EUR (" + plain(r.perM2.mid) + " EUR/m2). Accuracy: " + accLabel(r.accuracy),
      "Labour " + plain(r.split.labour) + " EUR, materials " + plain(r.split.materials) + " EUR, contingency " + plain(r.split.reserve) + " EUR" + (r.split.design ? ", design project " + plain(r.split.design) + " EUR" : ""),
      "Duration: about " + r.timeline[0] + "-" + r.timeline[1] + " weeks. Start: " + TXT.start[a.start] + (a.deadline === "yes" && a.deadlineDate ? ". Finish by: " + a.deadlineDate : "") + ". Design project: " + TXT.plan[a.plan]
    ];
  }
  function buildMailto(r) {
    var ct = S.contact, c = CFG.company;
    var lines = ["Hello,", "", "please prepare an exact renovation estimate.", "", "CONTACT", "Name: " + ct.name, "Phone: " + ct.phone];
    if (ct.email) lines.push("Email: " + ct.email);
    lines.push("Contact by: " + TXT.pref[ct.pref] + ", " + TXT.time[ct.time]);
    if (ct.address) lines.push("Address or area: " + ct.address);
    lines.push("", "CALCULATOR RESULT (PRELIMINARY PRICE)");
    lines = lines.concat(summaryLines(r));
    lines.push("", "Groups (about, " + vatLbl() + "):");
    r.groups.forEach(function (g) { if (g.total > 0) lines.push("- " + tr(g.label) + ": " + plain(g.total) + " EUR"); });
    var tail = ["", "Consent to data processing: yes (text version " + CFG.privacy.consentVersion + ", " + new Date().toISOString() + ")", "Marketing consent: " + (ct.marketing ? "yes" : "no"), "Calculator version: " + R.C.version + " (EN)"];
    var subject = "Renovation estimate request: " + LEVEL_INFO[r.level].t + ", " + dec(r.area, 0) + " m2, " + cityLabel(S.a.city);
    var head0 = "mailto:" + c.email + "?subject=" + encodeURIComponent(subject) + "&body=";
    var mk = function (notes) { return head0 + encodeURIComponent(lines.concat(notes ? ["", "Notes: " + notes] : [], tail).join("\n")); };
    var LIMIT = 2000, notes = (S.a.notes || "").slice(0, 500), href = mk(notes);
    if (notes && href.length > LIMIT) {
      var cut = notes.length;
      while (cut > 0 && mk(notes.slice(0, cut) + " ... (shortened, full text in the CSV file)").length > LIMIT) cut -= 10;
      href = mk(cut > 0 ? notes.slice(0, cut) + " ... (shortened, full text in the CSV file)" : "(notes too long for the email, they are in the CSV file)");
    }
    return href;
  }
  function csvText(r) {
    var q = function (v) { var s = String(v == null ? "" : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[";\r\n,]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var n2 = function (v) { return (Math.round(v * 100) / 100).toFixed(2); };
    var V = " (" + vatLbl() + ")";
    var rows = [["Renovation price calculator (preliminary price)", CFG.company.name], ["Date", new Date().toISOString().slice(0, 10)], ["Price version", R.C.version], ["VAT", vatLbl()], []];
    summaryLines(r).forEach(function (l) { rows.push([l]); });
    rows.push([], ["Group", "Line", "Quantity", "Unit", "Labour EUR" + V, "Materials EUR" + V, "Total EUR" + V]);
    r.groups.forEach(function (g) { g.lines.forEach(function (l) { rows.push([tr(g.label), tr(l.label), l.code ? n2(l.qty) : "", tr(l.unit), n2(l.labour), n2(l.materials), n2(l.labour + l.materials)]); }); });
    rows.push(["Contingency", Math.round(r.reservePct * 100) + "%", "", "", "", "", n2(r.split.reserve)]);
    if (r.split.design) rows.push(["Interior design project", "", "", "", "", "", n2(r.split.design)]);
    rows.push(["Total (about)", "", "", "", n2(r.split.labour), n2(r.split.materials), n2(r.raw.mid)], ["Rounded (about)", "", "", "", "", "", n2(r.total.mid)], ["Range EUR" + V, "from " + r.total.low, "to " + r.total.high], []);
    rows.push(["Package", "Status", "Changes total EUR" + V + ", incl. contingency"]);
    pkgImpact().forEach(function (p) { rows.push([tr(p.label), p.on ? "included" : "not included", n2(p.delta)]); });
    rows.push([]);
    rows.push(["Material", "Class", "Quantity", "Unit", "Unit price EUR" + V, "Amount EUR" + V, "Reliability"]);
    materialList(r).forEach(function (m) { rows.push([tr(m.label), m.tierName, n2(m.qty), tr(m.unit), m.unitPrice != null ? n2(m.unitPrice) : "", n2(m.cost), m.weak ? "indicative" : ""]); });
    rows.push([], ["Not included"]); r.excluded.concat(r.notes).forEach(function (x) { rows.push([tr(x)]); });
    if (S.a.notes) rows.push([], ["Notes", S.a.notes.slice(0, 500)]);
    rows.push([], ["This is a preliminary price, not an offer. We will discuss the exact price when we get in touch."]);
    return "﻿" + rows.map(function (rw) { return rw.map(q).join(","); }).join("\r\n");
  }
  function downloadCsv() {
    var r = calc(); var blob = new Blob([csvText(r)], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "renovation-estimate-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function buildPrint() {
    var r = calc(), c = CFG.company, a = S.a;
    var h = '<div class="ps-head">' + (c.logo ? '<img class="ps-logo" src="../../assets/logo-light.svg" alt="" width="60" height="71">' : "") + "<div><p class=\"ps-co\">" + esc(c.name) + '</p><p>Preliminary renovation price, ' + new Date().toISOString().slice(0, 10) + ". Price version " + R.C.version + ".</p></div></div>";
    h += "<h2>Preliminary price</h2><p class=\"ps-big\">from " + eur(r.total.low) + " to " + eur(r.total.high) + "</p><p>Most likely about " + eur(r.total.mid) + " (about " + fmt(r.perM2.mid) + " EUR/m2), " + vatLbl() + ". Accuracy: " + accLabel(r.accuracy) + ".</p>";
    h += "<h3>Main details</h3><ul>" + summaryLines(r).slice(0, 3).map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ul>";
    h += '<h3>By group</h3><table><thead><tr><th>Group</th><th class="num">Labour</th><th class="num">Materials</th><th class="num">Total</th></tr></thead><tbody>' + r.groups.filter(function (g) { return g.total > 0; }).map(function (g) { return "<tr><td>" + esc(tr(g.label)) + '</td><td class="num">' + eur(g.labour) + '</td><td class="num">' + eur(g.materials) + '</td><td class="num">' + eur(g.total) + "</td></tr>"; }).join("") + '<tr><td>Contingency (' + Math.round(r.reservePct * 100) + '%)</td><td></td><td></td><td class="num">' + eur(r.split.reserve) + "</td></tr>" + (r.split.design ? '<tr><td>Interior design project</td><td></td><td></td><td class="num">' + eur(r.split.design) + "</td></tr>" : "") + '<tr class="b"><td>Total, medium scenario</td><td class="num">' + eur(r.split.labour) + '</td><td class="num">' + eur(r.split.materials) + '</td><td class="num">' + eur(r.raw.mid) + "</td></tr></tbody></table><p>Amounts " + vatLbl() + ". Rounded: about " + eur(r.total.mid) + ".</p>";
    var ml = materialList(r);
    if (ml.length) h += '<h3>Selected materials</h3><table><thead><tr><th>Material</th><th>Class</th><th class="num">Quantity</th><th class="num">Unit price</th></tr></thead><tbody>' + ml.map(function (m) { return "<tr><td>" + esc(tr(m.label)) + (m.weak ? " *" : "") + "</td><td>" + m.tierName + '</td><td class="num">' + dec(m.qty, 1) + " " + esc(tr(m.unit)) + '</td><td class="num">' + (m.unitPrice != null ? price(m.unitPrice) : "") + "</td></tr>"; }).join("") + "</tbody></table><p>Prices " + vatLbl() + ". * Indicative price.</p>";
    h += "<h3>Duration</h3><p>About " + r.timeline[0] + "-" + r.timeline[1] + " weeks from the start of work, not counting the time to order materials.</p>";
    h += "<h3>Not included</h3><p>" + r.excluded.concat(r.notes).map(function (x) { return esc(tr(x)); }).join(". ") + ".</p>";
    h += "<h3>Assumptions</h3><p>Regional coefficient " + dec(r.region, 2) + " (" + esc(cityLabel(a.city)) + "), contingency " + Math.round(r.reservePct * 100) + "%, room split " + (S.flags.roomsCustom ? "based on your rooms" : "standard") + ". The full list of assumptions is on the calculator page.</p>";
    h += '<p class="ps-disc">This is a preliminary price, not an offer. We will discuss the exact price when we get in touch.</p>';
    h += "<p>" + esc(c.legalName || c.name) + ", tel. " + esc(c.phone) + ", " + esc(c.email) + (c.hours ? ", " + esc(c.hours) : "") + ".</p>";
    document.getElementById("printSheet").innerHTML = h;
  }

  // ---------- rendering ----------
  var stage, liveTimer = null;
  function render(focusTitle) {
    termSeq = 0;
    var active = document.activeElement, activeId = active && active.id;
    var html = [stepIntro, step1, step2, step3, step4, step5, step6, step7, step8, step9][S.step]();
    stage.innerHTML = '<div class="step-card s' + S.step + (reduceMotion ? "" : " anim") + '">' + html + "</div>";
    document.body.classList.toggle("on-intro", S.step === 0);
    document.body.classList.toggle("on-result", S.step >= 8);
    renderProgress();
    updateLive(true);
    if (focusTitle) { var t = document.getElementById("stepTitle"); if (t) { t.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); } }
    else if (activeId) { var el = document.getElementById(activeId); if (el) el.focus({ preventScroll: true }); }
    var es = document.getElementById("errSum"); if (es && S._focusErr) { es.focus(); S._focusErr = false; }
  }
  function renderProgress() {
    var pa = document.getElementById("progressArea");
    pa.hidden = S.step === 0;
    document.getElementById("live").hidden = S.step === 0 || S.step >= 8;
    document.getElementById("mbar").hidden = S.step === 0 || S.step >= 8;
    if (S.step === 0) return;
    document.getElementById("progressLabel").textContent = "Step " + S.step + " of 9: " + STEPS[S.step - 1];
    document.getElementById("progressFill").style.width = (S.step / 9 * 100) + "%";
    document.getElementById("vatToggle").checked = S.a.vat === "excl";
    var ol = document.getElementById("stepper"), h = "";
    STEPS.forEach(function (name, i) {
      var n = i + 1, cur = n === S.step, done = n <= S.maxStep && !cur;
      var can = n <= S.maxStep && (n !== 9 || S.maxStep >= 9);
      h += '<li class="' + (cur ? "cur" : done ? "done" : "") + '"><button type="button" data-go="' + n + '"' + (cur ? ' aria-current="step"' : "") + (can && !cur ? "" : " disabled") + '><span class="st-name">' + name + "</span></button></li>";
    });
    ol.innerHTML = h;
  }
  function updateLive(now) {
    if (liveTimer) clearTimeout(liveTimer);
    var run = function () {
      var lv = document.getElementById("liveValue"), mb = document.getElementById("mbarValue");
      var bad = !areaValid(parseNum(S.a.area));
      if (S.maxStep < 3 || bad) {
        var lim = areaLimits(), msg = bad ? "Check the floor area" : "Not enough data yet";
        lv.textContent = msg; mb.textContent = msg; lv.removeAttribute("data-txt");
        document.getElementById("liveSub").textContent = bad ? "The area must be from " + lim[0] + " to " + lim[1] + " m2." : "We will show the result after you choose the renovation level.";
        document.getElementById("liveSplit").innerHTML = ""; document.getElementById("liveAcc").innerHTML = ""; return;
      }
      var r = calc();
      var txt = "from " + eur(r.total.low) + " to " + eur(r.total.high);
      lv.innerHTML = '<span class="lv-k">Now:</span> from <span class="nb">' + eur(r.total.low) + '</span> to <span class="nb">' + eur(r.total.high) + "</span>";
      mb.innerHTML = 'from <span class="nb">' + eur(r.total.low) + '</span> to <span class="nb">' + eur(r.total.high) + '</span> <span class="mb-vat">' + vatLbl() + "</span>";
      document.getElementById("liveSub").textContent = "Most likely about " + eur(r.total.mid) + ", " + vatLbl() + ".";
      var accIdx = { approx: 1, medium: 2, good: 3 }[r.accuracy];
      document.getElementById("liveAcc").innerHTML = '<div class="acc-bar sm" aria-hidden="true">' + [1, 2, 3].map(function (i) { return '<span class="' + (i <= accIdx ? "on" : "") + '"></span>'; }).join("") + "</div><span>Accuracy: " + accLabel(r.accuracy) + "</span>";
      document.getElementById("liveSplit").innerHTML = "<li><span>Labour</span><strong>" + eur(r.split.labour) + "</strong></li><li><span>Materials</span><strong>" + eur(r.split.materials) + "</strong></li><li><span>Contingency</span><strong>" + eur(r.split.reserve) + "</strong></li>" + (r.split.design ? "<li><span>Design project</span><strong>" + eur(r.split.design) + "</strong></li>" : "");
      if (S.maxStep >= 4) {
        var pon = pkgImpact().filter(function (p) { return p.on; });
        if (pon.length) document.getElementById("liveSplit").innerHTML += '<li class="lv-pk-h"><span>Of which packages</span></li>' + pon.map(function (p) { return '<li class="lv-pk"><span>' + esc(tr(p.label)) + "</span><strong>" + pkgShort(p) + "</strong></li>"; }).join("");
      }
      lv.setAttribute("data-txt", txt);
    };
    if (now) run(); else liveTimer = setTimeout(run, 300);
  }

  // ---------- validation ----------
  function parseNum(v) { var n = parseFloat(String(v).replace(/\s/g, "").replace(",", ".")); return isFinite(n) ? n : NaN; }
  function validate(step) {
    var e = {}, a = S.a;
    if (step === 1) {
      var lim = areaLimits(), A = parseNum(a.area);
      if (isNaN(A)) e.area = "Enter the area as a number, e.g. 55.";
      else if (A < lim[0] || A > lim[1]) e.area = "The area must be from " + lim[0] + " to " + lim[1] + " m2.";
      if (a.heightOpt === "3.0") { var Hh = parseNum(a.heightExact); if (isNaN(Hh) || Hh < 3 || Hh > 5) e.heightExact = "The ceiling height must be from 3.0 to 5.0 m."; }
    }
    if (step === 4) {
      Object.keys(a.qty).filter(function (k) { return !!document.getElementById("qty-" + k); }).forEach(function (k) { var v = parseNum(a.qty[k]); if (isNaN(v) || v < 0 || v > 300 || Math.round(v) !== v) e["qty-" + k] = "Enter a whole number from 0 to 300."; });
    }
    if (step === 5 && a.customRooms) {
      a.customRooms.forEach(function (r, i) {
        var A2 = parseNum(r.area); if (isNaN(A2) || A2 < 0.5 || A2 > 300) e["ra-" + i + "-area"] = "Room " + (i + 1) + " area must be from 0.5 to 300 m2.";
        ["windows", "doors"].forEach(function (k) { var v = parseNum(r[k]); if (isNaN(v) || v < 0 || v > 20 || Math.round(v) !== v) e["r" + k[0] + "-" + i + "-" + k] = "Room " + (i + 1) + " number of " + k + " must be a whole number from 0 to 20."; });
      });
      if (!a.customRooms.length) e.rooms = "Add at least one room or skip the step.";
    }
    if (step === 7 && a.deadline === "yes" && a.deadlineDate && a.deadlineDate < new Date().toISOString().slice(0, 10)) e.deadlineDate = "This date has passed. Choose a future date.";
    if (step === 9) {
      var ct = S.contact;
      if (!ct.name.trim()) e.c_name = "Enter your name.";
      var ph = ct.phone.replace(/[\s()-]/g, "");
      if (!ph) e.c_phone = "Enter your phone number.";
      else if (!/^(\+370|8|370)\d{8}$/.test(ph)) e.c_phone = "Use the format +370 6xx xxxxx (8 digits after +370).";
      if (ct.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ct.email)) e.c_email = "The email address looks wrong, e.g. name@example.com.";
      if (!ct.consent) e.c_consent = "We cannot prepare an estimate without your consent. Please tick the box.";
    }
    S.errors = e;
    return Object.keys(e).length === 0;
  }

  // ---------- navigation ----------
  function go(n, fromHistory) {
    S.step = n; S.maxStep = Math.max(S.maxStep, n); S.errors = {};
    if (!fromHistory && window.history && history.pushState) { try { if (!history.state || history.state.step !== n) history.pushState({ step: n }, ""); } catch (e) { /* */ } }
    render(true);
  }
  function onPop(e) {
    var st = e.state && typeof e.state.step === "number" ? e.state.step : null;
    if (st === null || st === S.step) return;
    if (st > S.maxStep) st = S.maxStep;
    if (st === 9 && !S.sent && S.step !== 8) st = 8;
    go(st, true);
  }
  function next() {
    var st = S.step;
    if (st === 1) { S.a.area = parseNum(S.a.area); if (S.a.heightOpt === "3.0") S.a.heightExact = parseNum(S.a.heightExact); }
    if (!validate(st)) { S._focusErr = true; render(false); return; }
    if (st === 1 && S.a.customRooms) { S.flags.roomsCustom = false; }
    if (st === 4) S.flags.worksDone = true;
    if (st === 5) {
      S.flags.roomsRescaled = false;
      if (S.a.customRooms) { S.a.customRooms = S.a.customRooms.map(function (r) { return { name: r.name || "Room", type: r.type, area: parseNum(r.area), windows: parseNum(r.windows), doors: parseNum(r.doors), wet: !!r.wet }; }); S.flags.roomsCustom = true; }
    }
    if (st === 6) S.flags.materialsDone = true;
    go(Math.min(9, st + 1));
  }

  // ---------- events ----------
  function setPath(path, v) {
    if (path.indexOf("helper.") === 0) { S.helper[path.slice(7)] = v; return; }
    if (path.indexOf("contact.") === 0) { S.contact[path.slice(8)] = v; return; }
    S.a[path] = v;
  }
  function onChange(e) {
    var t = e.target;
    if (t.id === "vatToggle" || t.id === "vatToggle2") { S.a.vat = t.checked ? "excl" : "incl"; render(false); return; }
    if (t.dataset.bind) {
      var path = t.dataset.bind, v = t.value;
      if (t.type === "radio" && (path === "rooms" || path === "floors")) v = parseInt(v, 10);
      if (path === "level") { S.a.works = {}; if (!S.flags.matTouched) S.a.mat = matForLevel(v); }
      if (path === "type" || path === "rooms" || path === "baths" || path === "roomKind") { S.a.customRooms = null; S.flags.roomsCustom = false; S.a.qty = {}; S.a.works = {}; }
      if (path === "type" && v === "room" && S.a.area > 80) S.a.area = S.a.roomKind === "bath" ? 6 : 12;
      if (path === "type" && v !== "room" && S.a.area < 15) S.a.area = 55;
      if (path === "age" && S.maxStep < 2) S.a.state = v === "new" ? "good" : "medium";
      if (path === "area" && t.type === "range") { S.a.area = parseFloat(v); rescaleRooms(S.a.area); var f = document.getElementById("area"); if (f) f.value = v; updateLive(false); return; }
      if (path === "area" || path === "heightExact" || path === "notes" || path === "deadlineDate") { setPath(path, v); if (path === "area") { var rg = document.getElementById("areaRange"), n = parseNum(v); if (rg && !isNaN(n)) rg.value = n; rescaleRooms(n); } updateLive(false); return; }
      setPath(path, v);
      render(false); return;
    }
    if (t.dataset.work) { S.a.works[t.dataset.work] = t.checked; render(false); return; }
    if (t.dataset.qty) { S.a.qty[t.dataset.qty] = t.value; updateLive(false); return; }
    if (t.dataset.mat) { S.a.mat[t.dataset.mat] = parseInt(t.value, 10); S.flags.matTouched = true; render(false); return; }
    if (t.dataset.room != null) {
      ensureRooms();
      var r = S.a.customRooms[+t.dataset.room], k = t.dataset.k;
      if (k === "wet") r.wet = t.checked;
      else if (k === "type") { r.type = t.value; r.wet = R.ROOM_TYPES[t.value].wet; }
      else r[k] = t.value;
      if (k === "type" || k === "wet" || e.type === "change") { render(false); } else updateRoomSum();
      updateLive(false); return;
    }
    if (t.dataset.c) {
      var key = { c_name: "name", c_phone: "phone", c_email: "email", c_addr: "address", c_consent: "consent", c_marketing: "marketing" }[t.dataset.c];
      S.contact[key] = t.type === "checkbox" ? t.checked : t.value;
      if (t.type === "checkbox" && S.errors[t.dataset.c]) { delete S.errors[t.dataset.c]; render(false); }
    }
  }
  function onInput(e) {
    var t = e.target;
    if (t.dataset.bind === "notes") { S.a.notes = t.value.slice(0, 500); var c = document.getElementById("notesCount"); if (c) c.textContent = S.a.notes.length + " / 500"; return; }
    if (t.type === "range" || t.dataset.bind === "area" || t.dataset.bind === "heightExact" || t.dataset.qty || (t.dataset.room != null && t.tagName === "INPUT" && t.type === "text") || t.dataset.c) onChange({ target: t, type: "input" });
  }
  function areaValid(n) { var lim = areaLimits(); return isFinite(n) && n >= lim[0] && n <= lim[1]; }
  function rescaleRooms(n) {
    var cr = S.a.customRooms; if (!cr || !cr.length || !areaValid(n)) return;
    var sum = cr.reduce(function (s, r) { return s + (parseNum(r.area) || 0); }, 0);
    if (!(sum > 0) || Math.abs(sum - n) < 1e-9) return;
    var f = n / sum;
    cr.forEach(function (r) { var v = parseNum(r.area); if (v > 0) r.area = v * f; });
    S.flags.roomsCustom = false; S.flags.roomsRescaled = true;
  }
  // Default room names are translated when the editable list is created, so the user sees English names.
  function ensureRooms() { if (!S.a.customRooms) S.a.customRooms = R.defaultRooms(S.a).map(function (r) { return { name: tr(r.name), type: r.type, area: Math.round(r.area * 10) / 10, windows: r.windows, doors: r.doors, wet: r.wet }; }); }
  function updateRoomSum() {
    var el = document.getElementById("roomSum"); if (!el) return;
    var sum = S.a.customRooms.reduce(function (s, r) { return s + (parseNum(r.area) || 0); }, 0);
    el.innerHTML = "Sum of room areas: <strong>" + dec(sum, 1) + " m2</strong> of " + dec(S.a.area, 1) + " m2";
    el.classList.toggle("warn", S.a.area > 0 && Math.abs(sum - S.a.area) / S.a.area > 0.05);
  }
  function onClick(e) {
    var b = e.target.closest("[data-act],[data-go],.term-btn");
    if (!b) return;
    if (b.classList.contains("term-btn")) {
      var tip = document.getElementById(b.getAttribute("aria-controls")), open = b.getAttribute("aria-expanded") === "true";
      b.setAttribute("aria-expanded", open ? "false" : "true"); tip.hidden = open; return;
    }
    if (b.dataset.go) { go(+b.dataset.go); return; }
    var act = b.dataset.act;
    switch (act) {
      case "start": go(1); break;
      case "intro": go(0); break;
      case "next": next(); break;
      case "back": go(Math.max(1, S.step - 1)); break;
      case "helper": S.helper = S.helper ? null : { el: null, pipe: null, demo: null }; render(false); break;
      case "useSuggest": S.a.level = b.dataset.v; S.a.works = {}; if (!S.flags.matTouched) S.a.mat = matForLevel(b.dataset.v); S.helper = null; render(false); break;
      case "resetWorks": S.a.works = {}; render(false); break;
      case "skipRooms": S.a.customRooms = null; S.flags.roomsCustom = false; S.errors = {}; go(6); break;
      case "addRoom": ensureRooms(); S.a.customRooms.push({ name: "New room", type: "room", area: 10, windows: 1, doors: 1, wet: false }); render(false); var ins = stage.querySelectorAll(".room"); if (ins.length) { var last = ins[ins.length - 1].querySelector("input"); if (last) last.focus(); } break;
      case "delRoom": ensureRooms(); S.a.customRooms.splice(+b.dataset.i, 1); render(false); break;
      case "resetRooms": S.a.customRooms = null; S.flags.roomsCustom = false; render(false); break;
      case "refine": go(S.flags.worksDone ? (S.flags.roomsCustom ? 6 : 5) : 4); break;
      case "toContacts": go(9); break;
      case "toResult": S.sent = null; go(8); break;
      case "edit": go(1); break;
      case "print": buildPrint(); window.print(); break;
      case "csv": downloadCsv(); break;
    }
  }
  function onSubmit(e) {
    if (e.target.id !== "cform") return;
    e.preventDefault();
    if (document.getElementById("website").value) return;
    if (!validate(9)) { S._focusErr = true; render(false); return; }
    S.sent = { href: buildMailto(calc()), at: new Date().toISOString() };
    render(true);
    var l = document.getElementById("mailtoLink"); if (l) l.focus();
  }

  // ---------- static parts ----------
  function applyConfig() {
    var c = CFG.company, col = CFG.colors, root = document.documentElement.style;
    root.setProperty("--accent", col.accent); root.setProperty("--accent-d", col.accentDark); root.setProperty("--accent-s", col.accentSoft); root.setProperty("--warm", col.warm); root.setProperty("--ink", col.ink); root.setProperty("--bg", col.bg);
    var $ = function (id) { return document.getElementById(id); };
    if ($("ribbon")) $("ribbon").hidden = !CFG.demo;
    ["topTel", "footTel"].forEach(function (id) { var el = $(id); if (el) el.setAttribute("href", telHref()); });
    if ($("footTel")) $("footTel").textContent = c.phone;
    var fm = $("footMail"); if (fm) { fm.setAttribute("href", "mailto:" + c.email); fm.textContent = c.email; }
  }
  // The price table shows the original research data. Item names, statuses and source notes stay in Lithuanian (see caption).
  function priceTable() {
    var conf = { A: "high", B: "medium", C: "low", N: "unverified" }, TY = { retail: "retail", contractor: "contractor", estimate: "estimate" };
    var rows = Object.keys(P.items).map(function (id) {
      var it = P.items[id], n = it.net, g2 = it.gross;
      var f = function (v) { return v == null ? "n/a" : dec(v, 2); };
      var st = it.status + (it.replaces ? " (vietoj " + it.replaces + ")" : "") + (it.confirmed ? " (" + it.confirmed.by + ")" : "");
      var td = function (lbl, v, cls) { return '<td data-label="' + lbl + '"' + (cls ? ' class="' + cls + '"' : "") + ">" + v + "</td>"; };
      return '<tr><th scope="row" class="pt-name" lang="lt">' + esc(it.name) + "</th>" + td("Code", id, "pt-code") + td("Unit", esc(tr(it.unit)), "pt-unit") + td("Excl. VAT", f(n[0]) + " / " + f(n[1]) + " / " + f(n[2]), "num") + td("Incl. VAT", f(g2[0]) + " / " + f(g2[1]) + " / " + f(g2[2]), "num") + td("Type", esc(TY[it.type] || it.type), "pt-type") + '<td data-label="Status" class="pt-st" lang="lt">' + esc(st) + '</td><td data-label="Date" class="pt-date" lang="lt">' + esc(it.date) + "</td>" + td("Sources", esc(it.sources.join(", ") || "none"), "pt-src") + td("Reliability", '<span class="conf c-' + it.conf + '">' + esc(conf[it.conf] || it.conf) + "</span>", "pt-conf") + "</tr>";
    }).join("");
    document.getElementById("priceTable").innerHTML = '<table class="lines ptable stack"><caption>Rates (min / mid / max) excluding and including VAT. We calculate from the price excluding VAT and add VAT at the end. Retail prices are regular prices without a loyalty card. Item names, statuses, dates and source notes are the original research data in Lithuanian.</caption><thead><tr><th scope="col" class="pt-name">Item</th><th scope="col">Code</th><th scope="col">Unit</th><th scope="col" class="num">Excl. VAT</th><th scope="col" class="num">Incl. VAT</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col">Date</th><th scope="col">Sources</th><th scope="col">Reliability</th></tr></thead><tbody>' + rows + "</tbody></table>";
    document.getElementById("sourceList").innerHTML = '<h3>Sources</h3><ul class="srcs">' + Object.keys(P.sources).map(function (k) { var s = P.sources[k]; return "<li><strong>" + k + "</strong> <span>" + esc(s.url) + "</span> <span class=\"muted\" lang=\"lt\">" + esc(s.date) + ". " + esc(s.note) + "</span></li>"; }).join("") + "</ul>";
    var wrapEl = document.getElementById("priceTable"), hint = document.getElementById("scrollHint"), det = document.getElementById("priceDetails");
    var upd = function () { if (!hint) return; var over = wrapEl.scrollWidth > wrapEl.clientWidth + 2; hint.hidden = !over; wrapEl.classList.toggle("can-scroll", over); };
    window.addEventListener("resize", upd); if (det) det.addEventListener("toggle", upd);
    wrapEl.addEventListener("scroll", function () { wrapEl.classList.toggle("scrolled", wrapEl.scrollLeft > 4); });
  }
  var ASSUME = [
    "By default, prices are shown including 21% VAT. Everything is calculated from prices excluding VAT, and VAT is added once at the end. With the “Show prices excluding VAT” switch, all amounts are divided by 1.21. Where a source did not state VAT, a contractor price was treated as excluding VAT and a retail price as including VAT.",
    "Retail prices are regular prices (without a loyalty or club card). Where a material class has several reliable sources (e.g. Moki-Veži and Senukai), their average is used. Calculated Ermitažas prices and “from” ARSAN prices are not included in the average.",
    "The packages “Wall plastering and levelling”, “Dry lining (plasterboard)” and “Full electrical installation with distribution board” are on for the full and premium levels. When both levelling packages are on, rooms are dry-lined with plasterboard, while the bathroom, kitchen and hallway are plastered. The cost of plaster materials is a competitor model estimate (5.5 EUR/m2).",
    "Material quantities without a source (assumptions): primer 0.15 l/m2, plasterboard waste 10%, CD profiles every 0.6 m, skirting waste 7%, wallpaper 10%, per plumbing point 8 m of pipe, 8 fittings and 2 m of drain, 3 hinges per door, distribution board 4 + 2 x rooms circuit breakers, one ceiling light per room, the other lights are LED panels.",
    "@REGIONS",
    "Room split by number of rooms (e.g. 2 rooms: living room and kitchen 35%, bedroom 25, bathroom 10, hallway 30). With more bathrooms, the shares are rescaled proportionally.",
    "Rooms are assumed to be rectangular: rooms 1:1.3, bathroom, kitchen and hallway 1:2. A window is 2.25 m2, a door 1.6 m2.",
    "Default quantities: electrical points 6 + 3 x rooms, plumbing points 2 x bathrooms + 2, doors rooms + bathrooms or WCs + 1, radiators rooms + 1, lights 2 x rooms + bathrooms + 2.",
    "Work packages by level are a proposal based on competitors' packages. At the standard level the bathroom is demolished (10% of the area), and plastering and floor levelling depend only on the condition. When the full electrical or plumbing installation is selected, separate points are not counted.",
    "@RESERVE",
    "Complexity: no lift, floor 3-5 +3%, floor 6 and higher +5, ceilings above 3.1 m +5, living there during renovation +5. Applies to labour only.",
    "Range: the spread of line prices is reduced by a factor k (1.0, 0.8 or 0.6 depending on accuracy), quantity uncertainty 15, 10 or 5%. This is a model, not a statistical probability.",
    "Material waste allowances: paint and filler 5% (filler 10% for very uneven walls), tiles 10, laminate, vinyl and engineered wood 7 (no source).",
    "Small materials (fixings, silicone, tapes) 10% of materials. Plasterboard ceiling framing +100% of the board price.",
    "Full installation sets are for a flat of about 55 m2 and are rescaled by area (area / 55) to the power of 0.7, within 0.6-2.0.",
    "Bathroom tiles up to 2 m high or up to the ceiling. The tiled part of the walls is not skimmed or painted. Waterproofing: floor, a 0.2 m wall strip and an 8 m2 shower zone (only when there is a shower or bath).",
    "Underfloor heating is calculated for the bathroom, kitchen and hallway area. Large tile formats apply to the premium level.",
    "Windows (only the lowest “from” prices are available), technical supervision, floor underlay, RCD, flush-mounted boxes, traps, shower drain and tray, tile trims, wallpaper paste and underfloor heating mats have no price and are not included in the total (shown under “Not included”).",
    "Duration: partial 1-3 weeks, standard 4-8, full 10-16 (new build) or 8-17 (older building), premium x 1.25, rescaled by area. With a design project +2 weeks.",
    "A warning about an unusual EUR/m2 is shown when the average falls outside the level's range both excluding and including VAT, because the VAT status of the range sources varies.",
    "For a single room, the EUR/m2 warning is not shown, and full installation sets are off by default.",
    "Amounts are rounded to 50 EUR (up to 10,000) and to 100 EUR (from 10,000). Prices from November 2026. Prices have not been checked against real estimates."
  ];

  function init() {
    stage = document.getElementById("stage");
    applyConfig();
    priceTable();
    var d2 = function (v) { return v.toFixed(2); }, pc = function (v) { return Math.round(v * 100); }, L = R.C.levels;
    var dyn = {
      "@REGIONS": "Regional coefficients apply to labour only: " + CFG.regions.map(function (x) { return tr(x.label) + " " + d2(x.coef); }).join(", ") + ". No confirming source.",
      "@RESERVE": "Contingency: partial " + pc(L.partial.reserve) + "%, standard " + pc(L.standard.reserve) + ", full " + pc(L.full.reserve) + ", premium " + pc(L.luxury.reserve) + ". For buildings built before 1990, " + pc(R.C.reserveOldBonus) + "% is added."
    };
    var items = ASSUME.map(function (x) { return dyn[x] || x; });
    document.getElementById("assumeList").innerHTML = items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
    document.getElementById("assumeCount").textContent = items.length + " points. Open to read them.";
    document.addEventListener("change", onChange);
    document.addEventListener("input", onInput);
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    window.addEventListener("beforeprint", function () { buildPrint(); });
    window.addEventListener("popstate", onPop);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { var open = stage.querySelector('.term-btn[aria-expanded="true"]'); if (open) { open.setAttribute("aria-expanded", "false"); document.getElementById(open.getAttribute("aria-controls")).hidden = true; open.focus(); } } });
    try { history.replaceState({ step: 0 }, ""); } catch (e) { /* */ }
    render(false);
    // Tests only: lets the QA script check state and the prepared mailto link without opening it.
    window.__calcApp = { state: S, calc: calc, buildPrint: buildPrint, csvText: function () { return csvText(calc()); }, buildMailto: function () { return buildMailto(calc()); } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
