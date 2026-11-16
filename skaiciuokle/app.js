// Skaičiuoklės sąsaja. Būsena laikoma tik atmintyje (be slapukų, be naršyklės saugyklos, be tinklo užklausų).
(function () {
  "use strict";
  var CFG = window.CALC_CONFIG, P = window.KAINOS, R = window.RemontoCalc;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- būsena ----------
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
  var STEPS = ["Objektas", "Būklė", "Lygis", "Darbai", "Patalpos", "Medžiagos", "Terminas", "Rezultatas", "Kontaktai"];

  // ---------- formatai ----------
  var NB = " ";
  function fmt(v) { var s = Math.round(v).toString(); return s.replace(/\B(?=(\d{3})+(?!\d))/g, NB); }
  function eur(v) { return fmt(v) + " EUR"; }
  function dec(v, d) { return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toString().replace(".", ","); }
  function price(v) { return v.toFixed(2).replace(".", ",") + " EUR"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function vatLbl() { return S.a.vat === "incl" ? "su PVM" : "be PVM"; }
  function ic(id, cls) { return '<svg class="ic ' + (cls || "") + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function cityLabel(id) { var r = CFG.regions.filter(function (x) { return x.id === id; })[0]; return r ? r.label : id; }
  function telHref() { return "tel:" + CFG.company.phone.replace(/[^\d+]/g, ""); }

  // ---------- terminai (04, 4.5) ----------
  var TERMS = {
    glaistymas: ["Glaistymas", "Sienų ar lubų lyginimas plonu gipso sluoksniu prieš dažant."],
    gruntavimas: ["Gruntavimas", "Pirmas skystas sluoksnis, kad dažai geriau laikytųsi."],
    hidroizoliacija: ["Hidroizoliacija", "Specialus apsauginis sluoksnis vonioje, kad vanduo nepatektų į sienas."],
    seseline: ["Šešėlinė siūlė", "Siaura tamsi juostelė tarp sienos ir lubų."],
    potinkinis: ["Potinkinis WC rėmas", "Rėmas sienoje, matomas tik mygtukas ir klozeto dubuo."],
    islyginamasis: ["Išlyginamasis sluoksnis", "Skystas mišinys grindims išlyginti prieš dangą."],
    rezervas: ["Rezervas", "Pinigai netikėtiems darbams. Dažniausiai 10-15 proc."]
  };
  var termSeq = 0;
  function term(key) {
    var t = TERMS[key]; if (!t) return "";
    var id = "tip-" + key + "-" + (++termSeq);
    return '<span class="term"><button type="button" class="term-btn" aria-expanded="false" aria-controls="' + id + '" aria-label="Kas yra ' + esc(t[0].toLowerCase()) + '?">' + ic("i-info") + '</button><span class="term-tip" id="' + id + '" role="note" hidden><strong>' + esc(t[0]) + ".</strong> " + esc(t[1]) + "</span></span>";
  }

  // ---------- valdikliai ----------
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
    return '<div class="step-nav">' + (S.step > 1 ? '<button type="button" class="btn ghost" data-act="back">' + ic("i-left") + "<span>Atgal</span></button>" : '<button type="button" class="btn ghost" data-act="intro">' + ic("i-left") + "<span>Į pradžią</span></button>") + (opts.extra || "") + '<button type="button" class="btn primary" data-act="next">' + "<span>" + (nextLabel || "Toliau") + "</span>" + ic("i-right") + "</button></div>";
  }
  function head(title, lead) {
    return '<div class="step-head"><p class="eyebrow">Žingsnis ' + S.step + " iš 9</p><h2 tabindex=\"-1\" id=\"stepTitle\">" + title + "</h2>" + (lead ? '<p class="lead">' + lead + "</p>" : "") + "</div>";
  }
  function errSummary() {
    var keys = Object.keys(S.errors); if (!keys.length) return "";
    return '<div class="err-sum" role="alert" tabindex="-1" id="errSum"><p><strong>Patikrinkite ' + (keys.length === 1 ? "laukelį" : "laukelius") + ":</strong></p><ul>" + keys.map(function (k) { return '<li><a href="#' + (document.getElementById(k) ? k : "fs-" + k) + '">' + S.errors[k] + "</a></li>"; }).join("") + "</ul></div>";
  }

  // ---------- skaičiavimas ----------
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
    if (W.w_floor) { out.push("floor_" + (a.floorDry || "laminate")); if (a.floorWet === "vinyl") { if (out.indexOf("floor_vinyl") < 0) out.push("floor_vinyl"); } }
    if (W.w_bath_tile || (W.w_floor && a.floorWet === "tile")) out.push("tile");
    if (W.w_doors) out.push("door_leaf");
    if (W.w_wc) out.push("wc");
    if (W.w_shower) out.push("shower");
    if (W.w_vanity) out.push("vanity");
    if (W.w_el_points || W.w_el_full) out.push("sockets");
    if (W.w_radiators) out.push("radiator");
    if (a.ceiling === "gkp") out.push("gkp");
    return out;
  }

  // ---------- žingsniai ----------
  function stepIntro() {
    var c = CFG.company;
    return '<div class="intro">' +
      '<div class="intro-txt"><p class="eyebrow">' + esc(c.name) + '</p><h2 class="display" tabindex="-1" id="stepTitle">Kiek kainuos jūsų remontas?</h2>' +
      '<p class="lead">Atsakykite į keletą klausimų ir pamatysite preliminarią kainą. Jums nereikia registruotis. Kontaktų prašome tik pačioje pabaigoje ir tik jei norite tikslesnės sąmatos.</p>' +
      '<div class="cta-row"><button type="button" class="btn primary lg" data-act="start"><span>Pradėti</span>' + ic("i-right") + '</button><a class="btn ghost lg" href="#metodika">Kaip skaičiuojame</a></div>' +
      '<p class="fine">Kainos pagal 2026 m. lapkričio rinką. Atnaujiname kas ketvirtį.</p>' +
      '<ul class="perks"><li>' + ic("i-check") + "<span>Kaina intervalu, ne vienas skaičius</span></li><li>" + ic("i-check") + "<span>Darbai ir medžiagos atskirai</span></li><li>" + ic("i-check") + "<span>Apie 3 minutės, be registracijos</span></li></ul></div>" +
      '<div class="intro-art" aria-hidden="true">' + heroArt() + "</div></div>";
  }
  function heroArt() {
    return '<svg viewBox="0 0 420 360" class="hero-svg" focusable="false">' +
      '<defs><linearGradient id="hg-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9e2d6"/><stop offset="1" stop-color="#ddd3c3"/></linearGradient><linearGradient id="hg-floor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c79c6b"/><stop offset="1" stop-color="#a77a4b"/></linearGradient><linearGradient id="hg-win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe3dc"/><stop offset="1" stop-color="#eaf3ef"/></linearGradient></defs>' +
      '<circle cx="300" cy="90" r="70" fill="#e3efe9"/>' +
      '<path d="M60 90 210 30 360 90 360 250 210 310 60 250Z" fill="url(#hg-wall)"/>' +
      '<path d="M210 30 210 190 360 250 360 90Z" fill="#efe9df"/>' +
      '<path d="M60 250 210 190 360 250 210 310Z" fill="url(#hg-floor)"/>' +
      '<g stroke="#b88a5a" stroke-width="1.4" opacity=".7"><path d="M97 235 247 295M135 220 285 280M172 205 322 265M247 205 97 265M285 220 135 280M322 235 172 295"/></g>' +
      '<path d="M240 85 300 108 300 168 240 145Z" fill="url(#hg-win)" stroke="#1f5c4d" stroke-width="3"/><path d="M270 96v60M240 115l60 23" stroke="#1f5c4d" stroke-width="2"/>' +
      '<path d="M100 120 160 96 160 196 100 220Z" fill="#1f5c4d" opacity=".9"/><circle cx="150" cy="160" r="3" fill="#f4f1eb"/>' +
      '<rect x="318" y="150" width="34" height="70" rx="6" fill="#163f35" transform="skewY(22) translate(0 -128)"/>' +
      '<g transform="translate(250 210)"><path d="M0 40 40 24 80 40 40 56Z" fill="#f4f1eb"/><path d="M0 40v12l40 16V56Z" fill="#d9cfbf"/><path d="M80 40v12L40 68V56Z" fill="#c8bca9"/></g>' +
      '<g transform="translate(120 222)"><rect x="0" y="0" width="16" height="44" rx="4" fill="#9a6326"/><rect x="-14" y="-26" width="44" height="28" rx="6" fill="#1b222c"/><rect x="-10" y="-22" width="36" height="20" rx="4" fill="#e3efe9"/></g>' +
      '<g transform="translate(330 176)"><path d="M0 50c0-20 6-32 14-38 8 6 14 18 14 38z" fill="#2f7a66"/><path d="M14 12c-10-8-20-6-24 2 8 0 16 2 24 8M14 12c10-8 20-6 24 2-8 0-16 2-24 8" fill="#3d8f78"/><rect x="2" y="48" width="24" height="18" rx="3" fill="#b07a3b"/></g>' +
      '<g font-family="inherit" font-weight="700"><rect x="20" y="40" width="132" height="50" rx="14" fill="#fff" stroke="#e3dccf"/><text x="36" y="62" font-size="12" fill="#5b6470">Preliminariai</text><text x="36" y="80" font-size="15" fill="#1b222c">nuo 11 iki 21 tūkst.</text></g>' +
      '</svg>';
  }

  function step1() {
    var a = S.a, h = head("Objektas", "Pasakykite, ką remontuojate ir kokio dydžio būstas.");
    h += errSummary();
    h += radios("type", "Ką remontuojate?", [{ v: "flat", label: "Butą", icon: "i-flat" }, { v: "house", label: "Namą", icon: "i-house" }, { v: "room", label: "Atskirą patalpą", desc: "pvz. vonią ar virtuvę", icon: "i-room" }], a.type, { cols: "c3" });
    if (a.type === "room") h += radios("roomKind", "Kurią?", [{ v: "bath", label: "Vonią" }, { v: "kitchen", label: "Virtuvę" }, { v: "room", label: "Kambarį" }, { v: "hall", label: "Koridorių" }], a.roomKind, { cols: "c4" });
    h += radios("age", "Kokios statybos jūsų būstas?", [{ v: "new", label: "Nauja statyba", desc: "be apdailos arba su daline apdaila" }, { v: "old_pre", label: "Sena statyba", desc: "iki apie 1990 m." }, { v: "old_post", label: "Sena statyba", desc: "po 1990 m." }, { v: "unknown", label: "Nežinau", desc: "laikysime senos statybos po 1990 m." }], a.age, { cols: "c2" });
    h += '<div class="field"><label class="f-l" for="city">Kur yra būstas?</label><select class="inp" id="city" data-bind="city">' + CFG.regions.map(function (r) { return '<option value="' + r.id + '"' + (a.city === r.id ? " selected" : "") + ">" + esc(r.label) + "</option>"; }).join("") + "</select></div>";
    var lim = areaLimits();
    h += '<div class="field area-field"><label class="f-l" for="area">' + (a.type === "room" ? "Koks patalpos plotas?" : "Koks būsto plotas?") + '</label><div class="area-row"><input type="range" id="areaRange" min="' + lim[0] + '" max="' + lim[1] + '" step="1" value="' + Math.min(lim[1], Math.max(lim[0], a.area)) + '" aria-label="Plotas slankikliu, m2" data-bind="area"><div class="f-row sm"><input class="inp" type="text" inputmode="decimal" id="area" value="' + esc(a.area) + '" data-bind="area" aria-describedby="h-area' + (S.errors.area ? " err-area" : "") + '"' + (S.errors.area ? ' aria-invalid="true"' : "") + '><span class="unit">m2</span></div></div><p class="hint" id="h-area">Rašykite pagal dokumentus. Jei remontuojate tik dalį, įrašykite tos dalies plotą.</p>' + (S.errors.area ? '<p class="err" id="err-area">' + S.errors.area + "</p>" : "") + "</div>";
    if (a.type !== "room") {
      h += radios("rooms", "Kiek kambarių?", [{ v: 1, label: "1" }, { v: 2, label: "2" }, { v: 3, label: "3" }, { v: 4, label: "4" }, { v: 5, label: "5 ir daugiau" }], a.rooms, { cols: "c5", hint: "Skaičiuokite miegamuosius ir svetainę. Virtuvė, vonia ir koridorius skaičiuojami atskirai." });
      h += radios("baths", "Kiek vonios ir WC patalpų?", [{ v: "1", label: "1" }, { v: "2", label: "2" }, { v: "3", label: "3" }, { v: "0", label: "Nėra", desc: "tik WC" }], a.baths, { cols: "c4" });
    }
    h += radios("heightOpt", "Kokio aukščio lubos?", [{ v: "2.5", label: "2,5 m" }, { v: "2.6", label: "2,6 m" }, { v: "2.7", label: "2,7 m" }, { v: "3.0", label: "3,0 m ir daugiau" }, { v: "unknown", label: "Nežinau", desc: "naudosime 2,6 m" }], a.heightOpt, { cols: "c5" });
    if (a.heightOpt === "3.0") h += numField("heightExact", "Tikslus lubų aukštis", a.heightExact, 'data-bind="heightExact"', "Nuo 3,0 iki 5,0 m. Virš 3,1 m darbai šiek tiek brangesni.", "m");
    if (a.type === "house") h += radios("floors", "Kiek aukštų remontuojate?", [{ v: 1, label: "1" }, { v: 2, label: "2" }, { v: 3, label: "3" }], a.floors, { cols: "c3" });
    return h + navButtons();
  }
  function areaLimits() { return S.a.type === "room" ? [2, 80] : [15, 400]; }

  function step2() {
    var a = S.a, h = head("Būklė", "Būklė keičia paruošimo darbų kiekį ir rezervą.");
    h += radios("state", "Kokia dabartinė būklė?", [{ v: "good", label: "Gera", desc: "reikia tik atnaujinti paviršius" }, { v: "medium", label: "Vidutinė", desc: "nusidėvėję paviršiai" }, { v: "bad", label: "Bloga", desc: "reikia daug paruošimo. Pavyzdžiui, seni laidai ar vamzdžiai, trupantis tinkas, išsipūtusios grindys." }, { v: "shell", label: "Nauja statyba be apdailos" }], a.state, { cols: "c2" });
    h += radios("walls", "Ar sienos lygios?", [{ v: "even", label: "Lygios" }, { v: "slight", label: "Šiek tiek nelygios" }, { v: "very", label: "Labai nelygios", desc: "reikia tinkuoti" }, { v: "unknown", label: "Nežinau" }], a.walls, { cols: "c4" });
    h += radios("damp", "Ar yra drėgmės ar pelėsio?", [{ v: "no", label: "Ne" }, { v: "yes", label: "Taip" }, { v: "unknown", label: "Nežinau" }], a.damp, { cols: "c3" });
    if (a.type !== "house") h += radios("lift", "Ar bute galima įnešti medžiagas liftu?", [{ v: "low", label: "Gyvenu 1-2 aukšte" }, { v: "cargo", label: "Yra krovininis liftas" }, { v: "nolift35", label: "Nėra lifto", desc: "aukštas 3-5" }, { v: "nolift6", label: "Nėra lifto", desc: "6 ir aukštesnis" }], a.lift, { cols: "c4" });
    h += radios("living", "Ar gyvensite remonto metu?", [{ v: "no", label: "Ne" }, { v: "yes", label: "Taip" }], a.living, { cols: "c2" });
    if (a.state === "bad" || a.damp === "yes") h += '<p class="callout">' + ic("i-info") + "<span>Tokiu atveju meistras dažniausiai turi pamatyti būstą. Skaičiuoklė prideda paruošimo darbus, bet paslėptų problemų neįvertina.</span></p>";
    return h + navButtons();
  }

  var LEVEL_INFO = {
    partial: { t: "Dalinis (kosmetinis)", d: "Atnaujinate sienas, lubas ir grindis. Elektra ir santechnika lieka.", inc: ["Senų dangų nuėmimas", "Glaistymas ir dažymas", "Nauja grindų danga ir grindjuostės", "Atliekų išvežimas ir valymas"] },
    standard: { t: "Standartinis", d: "Atnaujinate sienas, lubas, grindis, duris, vonią. Dalį elektros ir santechnikos pakeičiate.", inc: ["Viskas iš dalinio", "Vonios plytelės ir hidroizoliacija", "Nauji santechnikos prietaisai", "Vidaus durys", "Dalis naujų elektros taškų"] },
    full: { t: "Pilnas (kapitalinis)", d: "Viskas iš naujo: nuo griovimo, elektros ir vamzdžių iki apdailos.", inc: ["Griovimas ir tinkavimas pagal būklę", "Grindų išlyginimas", "Visa elektros ir santechnikos instaliacija", "Radiatoriai, palangės, angokraščiai"] },
    luxury: { t: "Prabangus", d: "Pilnas remontas su aukštesnio lygio medžiagomis ir sudėtingesniais sprendimais, pvz. paslėptos durų staktos, šešėlinės siūlės, didelio formato plytelės.", inc: ["Viskas iš pilno", "Aukštesnės klasės medžiagos", "Šešėlinės siūlės, didelio formato plytelės", "Šildomos grindys ir interjero projektas"] }
  };
  function step3() {
    var a = S.a, h = head("Remonto lygis", "Lygis nustato, kurie darbai bus pažymėti kitame žingsnyje. Juos galėsite keisti.");
    h += '<fieldset class="q"><legend class="q-l">Kokio remonto reikia?</legend><div class="levels">';
    R.C.levelOrder.forEach(function (lv) {
      var info = LEVEL_INFO[lv];
      var r = calc({ level: lv, works: {}, mat: S.flags.matTouched ? a.mat : matForLevel(lv) });
      var id = "r-level-" + lv;
      h += '<label class="lvl" for="' + id + '"><input class="sr-only" type="radio" name="level" id="' + id + '" value="' + lv + '" data-bind="level"' + (a.level === lv ? " checked" : "") + '><span class="lvl-in"><span class="lvl-top">' + levelArt(lv) + '<span class="lvl-price"><span class="lvl-k">apie</span> ' + fmt(r.perM2.mid) + " EUR/m2 <span class=\"lvl-k\">" + vatLbl() + '</span></span></span><span class="lvl-t">' + info.t + '</span><span class="lvl-d">' + info.d + '</span><ul class="ticks">' + info.inc.map(function (x) { return "<li>" + ic("i-check") + "<span>" + x + "</span></li>"; }).join("") + "</ul></span></label>";
    });
    h += "</div></fieldset>";
    h += '<div class="helper"><button type="button" class="btn link" data-act="helper" aria-expanded="' + (S.helper ? "true" : "false") + '" aria-controls="helperBox">Nežinau, kurį rinktis</button>';
    if (S.helper) {
      var hp = S.helper;
      h += '<div class="helper-box" id="helperBox">' +
        radios("h_el", "Ar keisite elektros instaliaciją?", [{ v: "yes", label: "Taip" }, { v: "part", label: "Iš dalies" }, { v: "no", label: "Ne" }], hp.el, { cols: "c3", bind: "helper.el" }) +
        radios("h_pipe", "Ar keisite vamzdžius?", [{ v: "yes", label: "Taip" }, { v: "no", label: "Ne" }], hp.pipe, { cols: "c2", bind: "helper.pipe" }) +
        radios("h_demo", "Ar bus griaunamos pertvaros?", [{ v: "yes", label: "Taip" }, { v: "no", label: "Ne" }], hp.demo, { cols: "c2", bind: "helper.demo" });
      var sug = helperSuggest();
      if (sug) h += '<p class="callout ok">' + ic("i-check") + "<span>Siūlome: <strong>" + LEVEL_INFO[sug].t + '</strong>.</span> <button type="button" class="btn sm" data-act="useSuggest" data-v="' + sug + '">Pasirinkti</button></p>';
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
  function matForLevel(lv) { var m = {}; Object.keys(R.MATERIALS).forEach(function (k) { m[k] = lv === "luxury" ? 3 : 2; }); return m; }
  function levelArt(lv) {
    var n = R.C.levelOrder.indexOf(lv) + 1, bars = "";
    for (var i = 0; i < 4; i++) bars += '<rect x="' + (4 + i * 11) + '" y="' + (30 - (i + 1) * 6) + '" width="8" height="' + ((i + 1) * 6) + '" rx="2" class="' + (i < n ? "on" : "off") + '"/>';
    return '<svg class="lvl-art" viewBox="0 0 50 34" aria-hidden="true">' + bars + "</svg>";
  }

  var GROUP_ICON = { prep: "i-hammer", walls: "i-brush", floors: "i-floor", bath: "i-drop", doors: "i-door", electric: "i-bolt", plumb: "i-pipe", other: "i-spark" };
  function ceilingRadios(name) {
    return radios(name, "Lubų apdaila", [{ v: "painted", label: "Dažytos lubos" }, { v: "gkp", label: "Gipso kartono lubos" }, { v: "stretch", label: "Įtempiamos lubos" }], S.a.ceiling, { cols: "c3", bind: "ceiling" });
  }
  function step4() {
    var a = S.a, W = R.worksState(a, a.customRooms), q = R.quantities(a, a.customRooms && a.customRooms.length ? a.customRooms : R.defaultRooms(a));
    var defs = R.defaultWorks(a, a.customRooms);
    var h = head("Darbai", "Pažymėjome darbus pagal lygį „" + LEVEL_INFO[a.level].t + "“. Pakeiskite, jei reikia.");
    h += errSummary();
    h += '<div class="groups">';
    R.GROUPS.forEach(function (gr) {
      var items = R.WORKS.filter(function (w) { return w.group === gr.id; });
      h += '<fieldset class="wgroup"><legend class="wg-l">' + ic(GROUP_ICON[gr.id], "wg-ic") + "<span>" + gr.label + "</span></legend>";
      items.forEach(function (w) {
        var avail = true, why = "";
        if (w.cond === "wet" && q.wetRooms === 0) { avail = false; why = "Nėra vonios ar WC patalpos."; }
        if (w.cond === "bath" && q.baths === 0) { avail = false; why = "Nėra vonios."; }
        if (w.cond === "wc" && q.wc === 0) { avail = false; why = "Nėra WC."; }
        if (w.cond === "windows" && q.windows === 0) { avail = false; why = "Patalpose nėra langų."; }
        var sub = w.note || "";
        if (!avail) sub = why;
        h += '<div class="witem' + (avail ? "" : " off") + '">' + toggle("w-" + w.id, w.label + (w.term ? "" : ""), avail && W[w.id], 'data-work="' + w.id + '"' + (avail ? "" : " disabled"), sub) + (w.term ? term(w.term) : "");
        if (w.qty && W[w.id] && avail) {
          var dq = q.defaults[w.qty];
          h += numField("qty-" + w.qty, w.qtyLabel, a.qty[w.qty] != null ? a.qty[w.qty] : dq, 'data-qty="' + w.qty + '"', "Numatyta: " + dq + ". Jei nežinote, palikite.", "vnt.");
        }
        h += "</div>";
        if (w.id === "w_wallpaper") h += '<div class="witem wide">' + ceilingRadios("ceiling4") + "</div>";
      });
      h += "</fieldset>";
    });
    h += "</div>";
    var changed = Object.keys(a.works).filter(function (k) { return a.works[k] !== defs[k]; }).length;
    var extra = changed ? '<button type="button" class="btn ghost" data-act="resetWorks">' + ic("i-reset") + "<span>Atstatyti pagal lygį</span></button>" : "";
    return h + navButtons("Toliau", { extra: extra });
  }

  function roomsList() { return S.a.customRooms && S.a.customRooms.length ? S.a.customRooms : null; }
  function step5() {
    var a = S.a, rooms = roomsList() || R.defaultRooms(a);
    var h = head("Patalpos", "Patikslinkite patalpas. Jei nenorite, praleiskite.");
    h += '<div class="step-tools"><button type="button" class="btn ghost" data-act="skipRooms"><span>Praleisti, naudoti standartinį paskirstymą</span>' + ic("i-right") + "</button></div>";
    h += errSummary();
    var sum = rooms.reduce(function (s, r) { return s + (parseFloat(String(r.area).replace(",", ".")) || 0); }, 0);
    h += '<div class="rooms">';
    rooms.forEach(function (r, i) {
      h += '<fieldset class="room"><legend class="sr-only">Patalpa ' + (i + 1) + "</legend>" +
        '<div class="room-h"><span class="room-n" aria-hidden="true">' + (i + 1) + '</span><div class="field grow"><label class="f-l" for="rn-' + i + '">Pavadinimas</label><input class="inp" id="rn-' + i + '" value="' + esc(r.name) + '" data-room="' + i + '" data-k="name" maxlength="40"></div>' +
        '<button type="button" class="btn icon" data-act="delRoom" data-i="' + i + '" aria-label="Pašalinti patalpą ' + esc(r.name) + '">' + ic("i-trash") + "</button></div>" +
        '<div class="room-g"><div class="field"><label class="f-l" for="rt-' + i + '">Tipas</label><select class="inp" id="rt-' + i + '" data-room="' + i + '" data-k="type">' + Object.keys(R.ROOM_TYPES).map(function (k) { return '<option value="' + k + '"' + (r.type === k ? " selected" : "") + ">" + R.ROOM_TYPES[k].label + "</option>"; }).join("") + "</select></div>" +
        roomNum(i, "area", "Plotas", r.area, "m2") + roomNum(i, "windows", "Langai", r.windows, "vnt.") + roomNum(i, "doors", "Durys", r.doors, "vnt.") +
        '<div class="field">' + toggle("rw-" + i, "Šlapia zona", !!r.wet, 'data-room="' + i + '" data-k="wet"', "vonia ar WC") + "</div></div></fieldset>";
    });
    h += "</div>";
    var diff = a.area > 0 ? Math.abs(sum - a.area) / a.area : 0;
    h += '<div class="rooms-foot"><p class="sum' + (diff > 0.05 ? " warn" : "") + '" id="roomSum">Patalpų plotų suma: <strong>' + dec(sum, 1) + " m2</strong> iš " + dec(a.area, 1) + " m2</p>" +
      '<div class="btn-row"><button type="button" class="btn ghost" data-act="addRoom">' + ic("i-plus") + '<span>Pridėti patalpą</span></button><button type="button" class="btn ghost" data-act="resetRooms">' + ic("i-reset") + "<span>Atstatyti pradinį</span></button></div></div>";
    if (diff > 0.05) h += '<div class="callout warn" role="status">' + ic("i-info") + "<span>Patalpų plotų suma (" + dec(sum, 1) + " m2) skiriasi nuo bendro ploto (" + dec(a.area, 1) + " m2). Tęsti vis tiek? Skaičiuosime pagal patalpų sumą.</span></div>";
    return h + navButtons(diff > 0.05 ? "Tęsti vis tiek" : "Toliau");
  }
  function roomNum(i, k, label, v, unit) {
    var id = "r" + k[0] + "-" + i + "-" + k, err = S.errors[id];
    return '<div class="field"><label class="f-l" for="' + id + '">' + label + '</label><div class="f-row sm"><input class="inp" type="text" inputmode="decimal" id="' + id + '" value="' + esc(typeof v === "number" ? dec(v, 1) : v) + '" data-room="' + i + '" data-k="' + k + '"' + (err ? ' aria-invalid="true" aria-describedby="err-' + id + '"' : "") + '><span class="unit">' + unit + "</span></div>" + (err ? '<p class="err" id="err-' + id + '">' + err + "</p>" : "") + "</div>";
  }

  function lowConf(key, tierIdx) {
    var m = R.MATERIALS[key]; var ref = m.refs ? m.refs[tierIdx] : m.ref; var it = P.items[ref];
    return it && (it.conf === "C" || it.conf === "N");
  }
  function step6() {
    var a = S.a, h = head("Medžiagos", "Pasirinkite medžiagas. Nežinote? Palikite „Vidutinė“.");
    h += radios("buyer", "Kas pirks medžiagas?", [{ v: "contractor", label: "Pirks rangovas", desc: "įtraukti į kainą" }, { v: "client", label: "Pirksiu pats", desc: "rodyti tik darbus" }], a.buyer, { cols: "c2" });
    if (a.buyer === "client") h += '<p class="callout">' + ic("i-info") + "<span>Medžiagų kainos žemiau rodomos tik informacijai. Į sumą jos neįtraukiamos.</span></p>";
    var W = R.worksState(a, a.customRooms);
    if (W.w_floor) {
      h += radios("floorDry", "Grindys: svetainė ir miegamieji", [{ v: "laminate", label: "Laminatas" }, { v: "vinyl", label: "Vinilas" }, { v: "parquet", label: "Parketlentės" }], a.floorDry, { cols: "c3" });
      h += radios("floorWet", "Grindys: virtuvė ir koridorius", [{ v: "tile", label: "Plytelės" }, { v: "vinyl", label: "Vinilas" }], a.floorWet, { cols: "c2", hint: "Vonios grindys skaičiuojamos kartu su vonios plytelėmis." });
    }
    h += ceilingRadios("ceiling6");
    if (W.w_bath_tile) h += radios("tileHeight", "Plytelės vonios sienose", [{ v: "2.0", label: "Iki 2 m aukščio" }, { v: "ceiling", label: "Iki lubų" }], a.tileHeight, { cols: "c2" });
    var rel = relevantMaterials();
    h += '<h3 class="sub-h">Medžiagų klasė</h3><p class="hint">Kainos už vienetą, ' + vatLbl() + ". Pavyzdžiai iš mažmeninių parduotuvių 2026 m. lapkritį.</p>";
    rel.forEach(function (key) {
      var m = R.MATERIALS[key], cur = a.mat[key];
      h += '<fieldset class="q mat"><legend class="q-l">' + m.label + '</legend><div class="opts c4">';
      [1, 2, 3, 0].forEach(function (t) {
        var id = "m-" + key + "-" + t, tier = t ? m.tiers[t - 1] : null;
        var p = tier ? (a.vat === "incl" ? tier.price : tier.price / 1.21) : null;
        var note = t && lowConf(key, t - 1) ? '<span class="opt-n">Kaina orientacinė, patikrinsime su tiekėju.</span>' : "";
        h += '<label class="opt mat-o" for="' + id + '"><input class="sr-only" type="radio" name="mat-' + key + '" id="' + id + '" value="' + t + '" data-mat="' + key + '"' + (cur === t ? " checked" : "") + '><span class="opt-in"><span class="opt-t">' + (t === 1 ? "Ekonominė" : t === 2 ? "Vidutinė" : t === 3 ? "Aukštesnė" : "Nežinau") + "</span>" + (tier ? '<span class="opt-p">' + price(p) + " / " + m.unit + '</span><span class="opt-d">' + esc(tier.example) + "</span>" : '<span class="opt-d">Skaičiuosime vidutinę, o intervalas bus platesnis.</span>') + note + "</span></label>";
      });
      h += "</div></fieldset>";
    });
    h += '<p class="fine">Prekių ženklai yra tik kainų pavyzdžiai. Langai, baldai, buitinė technika ir šildymo įranga į skaičiuoklę neįtraukti.</p>';
    return h + navButtons();
  }

  function step7() {
    var a = S.a, h = head("Terminas", "Paskutiniai klausimai prieš rezultatą.");
    h += errSummary();
    h += radios("start", "Kada planuojate pradėti?", [{ v: "1m", label: "Per mėnesį" }, { v: "1-3", label: "Per 1-3 mėnesius" }, { v: "3-6", label: "Per 3-6 mėnesius" }, { v: "later", label: "Dar neplanuoju", desc: "tik žiūriu" }], a.start, { cols: "c4" });
    h += radios("deadline", "Ar yra data, iki kurios reikia baigti?", [{ v: "no", label: "Ne" }, { v: "yes", label: "Taip" }], a.deadline, { cols: "c2" });
    if (a.deadline === "yes") h += '<div class="field"><label class="f-l" for="deadlineDate">Data</label><input class="inp" type="date" id="deadlineDate" value="' + esc(a.deadlineDate) + '" data-bind="deadlineDate"' + (S.errors.deadlineDate ? ' aria-invalid="true" aria-describedby="err-deadlineDate"' : "") + ">" + (S.errors.deadlineDate ? '<p class="err" id="err-deadlineDate">' + S.errors.deadlineDate + "</p>" : "") + "</div>";
    h += radios("plan", "Ar jau turite interjero projektą ar planą?", [{ v: "yes", label: "Taip" }, { v: "no", label: "Ne" }, { v: "want", label: "Norėčiau su projektu" }], a.plan, { cols: "c3" });
    h += '<div class="field"><label class="f-l" for="notes">Ar yra dar kas nors svarbaus? <span class="opt-mark">(neprivaloma)</span></label><p class="hint" id="h-notes">Nerašykite slaptažodžių ar asmens kodo.</p><textarea class="inp" id="notes" rows="4" maxlength="500" data-bind="notes" aria-describedby="h-notes notesCount">' + esc(a.notes) + '</textarea><p class="hint right" id="notesCount">' + a.notes.length + " / 500</p></div>";
    return h + navButtons("Rodyti rezultatą");
  }

  // ---------- rezultatas ----------
  function donut(r) {
    var parts = [["Darbai", r.split.labour, "#1f5c4d", "seg-l"], ["Medžiagos", r.split.materials, "url(#pat-stripe)", "seg-m"], ["Rezervas", r.split.reserve, "url(#pat-dots)", "seg-r"]];
    if (r.split.design > 0) parts.push(["Projektas", r.split.design, "url(#pat-cross)", "seg-d"]);
    var tot = parts.reduce(function (s, p) { return s + p[1]; }, 0) || 1, C = 2 * Math.PI * 52, off = 0, segs = "";
    var pct = parts.map(function (p) { return Math.round(p[1] / tot * 100); });
    parts.forEach(function (p) {
      var len = p[1] / tot * C; if (len <= 0) return;
      segs += '<circle cx="70" cy="70" r="52" fill="none" stroke="' + p[2] + '" stroke-width="22" stroke-dasharray="' + Math.max(0, len - 1.5).toFixed(2) + " " + (C - Math.max(0, len - 1.5)).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 70 70)"/>';
      off += len;
    });
    var alt = "Diagrama: " + parts.map(function (p, i) { return p[0].toLowerCase() + " " + pct[i] + " proc."; }).join(", ");
    var legend = '<table class="legend"><caption class="sr-only">Kainos dalys</caption><thead><tr><th scope="col">Dalis</th><th scope="col" class="num">Suma</th><th scope="col" class="num">Dalis</th></tr></thead><tbody>' + parts.map(function (p, i) { return '<tr><th scope="row"><span class="sw ' + p[3] + '" aria-hidden="true"></span>' + p[0] + (p[0] === "Rezervas" ? " (" + Math.round(r.reservePct * 100) + " proc.)" + term("rezervas") : "") + '</th><td class="num">' + eur(p[1]) + '</td><td class="num">' + pct[i] + " proc.</td></tr>"; }).join("") + "</tbody></table>";
    return '<figure class="donut-fig"><svg class="donut" viewBox="0 0 140 140" role="img" aria-label="' + alt + '"><circle cx="70" cy="70" r="52" fill="none" stroke="#ece6dc" stroke-width="22"/>' + segs + '<text x="70" y="66" text-anchor="middle" class="d-k">apie</text><text x="70" y="84" text-anchor="middle" class="d-v">' + shortK(r.total.mid) + "</text></svg>" + '<figcaption class="sr-only">' + alt + "</figcaption>" + legend + "</figure>";
  }
  function shortK(v) { return v >= 10000 ? dec(v / 1000, 1) + " tūkst." : fmt(v); }

  function step8() {
    var a = S.a, r = calc(), u = R.uncertainties(Object.assign({}, a, { accuracy: currentAccuracy() }), P, CFG), c = CFG.company;
    var accIdx = { approx: 1, medium: 2, good: 3 }[r.accuracy];
    var accTxt = { approx: "Tikslumas: orientacinis. Patikslinkite darbus, patalpas ir medžiagas, kad gautumėte siauresnį intervalą.", medium: "Tikslumas: vidutinis. Užpildykite patalpas ir medžiagas, kad gautumėte tikslesnį intervalą.", good: "Tikslumas: geras. Tikslią kainą parodys sąmata po apžiūros." }[r.accuracy];
    var h = '<div class="result">';
    h += '<div class="res-hero"><p class="eyebrow">Žingsnis 8 iš 9</p><h2 tabindex="-1" id="stepTitle">Jūsų remonto kaina</h2>' +
      '<p class="big" id="resRange">nuo <span class="nb">' + eur(r.total.low) + '</span> iki <span class="nb">' + eur(r.total.high) + "</span></p>" +
      '<p class="mid">Dažniausiai apie <strong>' + eur(r.total.mid) + "</strong> (apie " + fmt(r.perM2.mid) + " EUR/m2), " + vatLbl() + ".</p>" +
      '<div class="acc"><div class="acc-bar" aria-hidden="true">' + [1, 2, 3].map(function (i) { return '<span class="' + (i <= accIdx ? "on" : "") + '"></span>'; }).join("") + '</div><p class="acc-t">' + accTxt + "</p>" + (r.accuracy !== "good" ? '<button type="button" class="btn sm ghost" data-act="refine">' + ic("i-edit") + "<span>Patikslinti</span></button>" : "") + "</div>" +
      '<div class="res-vat"><label class="vat-switch"><input type="checkbox" id="vatToggle2" class="sr-only"' + (a.vat === "excl" ? " checked" : "") + '><span class="switch" aria-hidden="true"></span><span>Rodyti kainas be PVM</span></label></div>';
    if (r.warnings.length) h += r.warnings.map(function (w) { return '<p class="callout warn">' + ic("i-info") + "<span>" + esc(w) + "</span></p>"; }).join("");
    h += "</div>";

    h += '<div class="res-grid">';
    h += '<section class="card" aria-labelledby="h-split"><h3 id="h-split">Darbai, medžiagos ir rezervas</h3>' + donut(r) + (r.byClient ? '<p class="fine">Medžiagas pirksite patys. Jų kaina į sumą neįtraukta.</p>' : "") + "</section>";
    h += '<section class="card" aria-labelledby="h-time"><h3 id="h-time">Preliminari trukmė</h3><p class="weeks">' + ic("i-clock", "big-ic") + "<span><strong>" + r.timeline[0] + "-" + r.timeline[1] + " savaičių</strong></span></p><p>Apie " + r.timeline[0] + "-" + r.timeline[1] + " savaičių nuo darbų pradžios, be medžiagų užsakymo laiko.</p>" +
      '<h3 class="mt">Kas gali pakeisti kainą</h3><ul class="chg">' + (u.length ? u.map(function (x) { return "<li><span>" + esc(x.label) + '</span><strong class="nb">iki +' + eur(x.impact) + "</strong></li>"; }).join("") : "<li><span>Didesnių neapibrėžtumų neradome.</span></li>") + "</ul></section>";
    h += "</div>";

    // Grupės
    var tot = r.raw.mid || 1;
    h += '<section class="card" aria-labelledby="h-groups"><h3 id="h-groups">Išskaidymas pagal darbų rūšis</h3><p class="hint">Vidutinis scenarijus, ' + vatLbl() + '. Išskleiskite grupę, kad pamatytumėte eilutes.</p><div class="glist">';
    r.groups.forEach(function (g) {
      if (g.total <= 0) return;
      var share = g.total / tot * 100;
      h += '<details class="grp"><summary><span class="g-ic">' + ic(GROUP_ICON[g.id]) + '</span><span class="g-main"><span class="g-t">' + g.label + '</span><span class="g-bar" aria-hidden="true"><span class="g-l" style="width:' + (g.labour / tot * 100).toFixed(1) + '%"></span><span class="g-m" style="width:' + (g.materials / tot * 100).toFixed(1) + '%"></span></span></span><span class="g-v"><strong>' + eur(g.total) + "</strong><span>" + dec(share, 0) + " proc.</span></span></summary>" +
        '<div class="table-wrap"><table class="lines"><caption class="sr-only">' + g.label + '</caption><thead><tr><th scope="col">Darbas</th><th scope="col" class="num">Kiekis</th><th scope="col" class="num">Darbai</th><th scope="col" class="num">Medžiagos</th></tr></thead><tbody>' +
        g.lines.map(function (l) { return '<tr><th scope="row">' + esc(l.label) + '</th><td class="num">' + (l.code ? dec(l.qty, l.qty < 10 ? 1 : 0) + " " + l.unit : "") + '</td><td class="num">' + eur(l.labour) + '</td><td class="num">' + eur(l.materials) + "</td></tr>"; }).join("") +
        '</tbody><tfoot><tr><th scope="row">Iš viso</th><td></td><td class="num">' + eur(g.labour) + '</td><td class="num">' + eur(g.materials) + "</td></tr></tfoot></table></div></details>";
    });
    h += '</div><div class="g-legend" aria-hidden="true"><span><i class="sw seg-l"></i>Darbai</span><span><i class="sw seg-m"></i>Medžiagos</span></div>';
    h += '<p class="tot-row"><span>Darbai</span><strong>' + eur(r.split.labour) + "</strong></p><p class=\"tot-row\"><span>Medžiagos</span><strong>" + eur(r.split.materials) + '</strong></p><p class="tot-row"><span>Rezervas (' + Math.round(r.reservePct * 100) + " proc.)</span><strong>" + eur(r.split.reserve) + "</strong></p>" + (r.split.design ? '<p class="tot-row"><span>Interjero projektas</span><strong>' + eur(r.split.design) + "</strong></p>" : "") + '<p class="tot-row sum"><span>Iš viso, vidutinis scenarijus</span><strong>' + eur(r.raw.mid) + "</strong></p></section>";

    // Medžiagų sąrašas
    var ml = materialList(r);
    h += '<section class="card" aria-labelledby="h-mat"><h3 id="h-mat">Medžiagų sąrašas</h3>' + (ml.length ? '<div class="table-wrap"><table class="lines"><caption class="sr-only">Medžiagų sąrašas</caption><thead><tr><th scope="col">Medžiaga</th><th scope="col">Klasė</th><th scope="col" class="num">Kiekis</th><th scope="col" class="num">Vnt. kaina</th><th scope="col" class="num">Suma</th></tr></thead><tbody>' + ml.map(function (m) { return '<tr><th scope="row">' + esc(m.label) + "</th><td>" + m.tierName + '</td><td class="num">' + dec(m.qty, m.qty < 10 ? 1 : 0) + " " + m.unit + '</td><td class="num">' + (m.unitPrice != null ? price(m.unitPrice) : "") + '</td><td class="num">' + eur(m.cost) + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p>Medžiagas pirksite patys, todėl sąrašas neparengtas.</p>') + '<p class="fine">Kiekiai su atsargomis nuostoliams. ' + (r.byClient ? "" : "Sumos įtrauktos į kainą.") + "</p></section>";

    // Kas neįeina, kaip skaityti
    h += '<div class="res-grid"><section class="card" aria-labelledby="h-ex"><h3 id="h-ex">Kas neįeina</h3><ul class="dash">' + r.excluded.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + r.notes.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></section>";
    h += '<section class="card soft" aria-labelledby="h-read"><h3 id="h-read">Kaip skaityti įvertį</h3><p>Intervalas rodo tikėtiną ribą, o „apie“ yra vidutinis scenarijus. Rezervas skirtas netikėtiems darbams.</p><p>Intervalas orientacinis. Tikslią kainą parodo sąmata po apžiūros. Tai ne pasiūlymas.</p><p><a class="inline-link" href="#metodika">Kaip skaičiuojame</a>. Kainų šaltiniai ir data: 2026 m. lapkritis.</p></section></div>';

    // Veiksmai
    h += '<section class="card actions" aria-labelledby="h-act"><h3 id="h-act">Ką daryti toliau</h3><div class="act-grid">' +
      '<button type="button" class="btn primary lg" data-act="toContacts"><span>Gauti tikslią sąmatą</span>' + ic("i-right") + "</button>" +
      '<button type="button" class="btn ghost" data-act="print">' + ic("i-print") + "<span>Spausdinti arba išsaugoti PDF</span></button>" +
      '<button type="button" class="btn ghost" data-act="csv">' + ic("i-download") + "<span>Atsisiųsti CSV</span></button>" +
      '<a class="btn ghost" href="' + telHref() + '">' + ic("i-phone") + "<span>Skambinti " + esc(c.phone) + "</span></a>" +
      '<button type="button" class="btn ghost" data-act="edit">' + ic("i-edit") + "<span>Keisti atsakymus</span></button></div>" +
      '<p class="fine">' + esc(c.name) + ", " + esc(c.hours) + ", " + esc(c.city) + ". Atsakome per " + c.responseHours + " darbo valandas.</p></section>";
    return h + "</div>";
  }
  function materialList(r) {
    var map = {}, out = [];
    r.groups.forEach(function (g) { g.lines.forEach(function (l) { l.matParts.forEach(function (m) {
      var k = m.key + "|" + m.unit + "|" + m.tier;
      if (!map[k]) { map[k] = { label: m.label, qty: 0, unit: m.unit, unitPrice: m.unitPrice, cost: 0, tierName: m.tier === 1 ? "Ekonominė" : m.tier === 2 ? "Vidutinė" : m.tier === 3 ? "Aukštesnė" : m.tier === 0 ? "Nežinau" : "Viena kaina" }; out.push(map[k]); }
      map[k].qty += m.qty; map[k].cost += m.cost;
      if (/Rozetės/.test(m.label)) map[k].label = "Rozetės ir jungikliai";
    }); }); });
    return out;
  }

  // ---------- kontaktai ----------
  function step9() {
    var ct = S.contact, pv = CFG.privacy, c = CFG.company;
    var h = head("Kontaktai", "Paliksite kontaktus, ir " + esc(c.name) + " paruoš tikslią sąmatą. Jūsų atsakymai bus perkelti į laišką.");
    if (S.sent) return h + sentView();
    h += errSummary();
    h += '<form class="cform" id="cform" novalidate>';
    h += '<div class="hp" aria-hidden="true"><label for="website">Svetainė</label><input id="website" name="website" tabindex="-1" autocomplete="off" value=""></div>';
    h += '<div class="f-grid">' + textField("c_name", "Vardas", ct.name, 'autocomplete="name" maxlength="60" required', true) +
      textField("c_phone", "Telefono numeris", ct.phone, 'type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="+370 6xx xxxxx" required', true) +
      textField("c_email", "El. paštas", ct.email, 'type="email" inputmode="email" autocomplete="email" maxlength="80"', false, "Neprivaloma. Reikalingas, jei norite atsakymo el. paštu.") +
      textField("c_addr", "Būsto adresas ar rajonas", ct.address, 'autocomplete="street-address" maxlength="120"', false, "Neprivaloma.") + "</div>";
    h += radios("c_pref", "Kaip su jumis susisiekti?", [{ v: "call", label: "Skambutis" }, { v: "sms", label: "Žinutė" }, { v: "email", label: "El. paštas" }], ct.pref, { cols: "c3", bind: "contact.pref" });
    h += radios("c_time", "Kada patogiausia? <span class=\"opt-mark\">(neprivaloma)</span>", [{ v: "morning", label: "Rytais" }, { v: "day", label: "Dieną" }, { v: "evening", label: "Vakarais" }, { v: "any", label: "Bet kada" }], ct.time, { cols: "c4", bind: "contact.time" });
    h += '<div class="privacy"><p class="lawyer">' + ic("i-shield") + "<span><strong>Juodraštis.</strong> Šiuos tekstus prieš paleidimą turi peržiūrėti teisininkas. {{...}} žymenis užpildo įmonė.</span></p>" +
      "<p>Jūsų duomenis tvarko " + esc(pv.controller) + ", " + esc(pv.code) + ", " + esc(pv.address) + ". Tvarkome jūsų vardą, telefoną, el. paštą (jei nurodėte), būsto duomenis ir skaičiuoklės atsakymus. Tikslas: paruošti remonto sąmatą ir susisiekti su jumis dėl šios užklausos. Pagrindas: jūsų sutikimas. Duomenis saugome " + esc(pv.retention) + ", nebent anksčiau atsisakysite. Su skaičiuokle pateikti atsakymai nėra siunčiami niekur, kol nepaspausite „Siųsti užklausą“. Galite bet kada atsiimti sutikimą, paprašyti duomenų kopijos, ištaisyti ar ištrinti duomenis, parašę " + esc(pv.email) + ". Galite skųstis Valstybinei duomenų apsaugos inspekcijai. Daugiau: " + esc(pv.policyUrl) + ".</p></div>";
    h += '<div class="consents"' + (S.errors.c_consent ? "" : "") + ">" + toggleBox("c_consent", "Sutinku, kad " + esc(pv.controller) + " tvarkytų mano vardą, telefoną, el. paštą ir skaičiuoklės atsakymus, kad paruoštų sąmatą ir su manimi susisiektų dėl šios užklausos.", ct.consent, true) +
      toggleBox("c_marketing", "Sutinku gauti pasiūlymus ir naujienas el. paštu ar telefonu. Galiu atsisakyti bet kada. <span class=\"opt-mark\">(neprivaloma)</span>", ct.marketing, false) + "</div>";
    h += '<div class="step-nav"><button type="button" class="btn ghost" data-act="back">' + ic("i-left") + '<span>Atgal į rezultatą</span></button><button type="submit" class="btn primary">' + "<span>Siųsti užklausą</span>" + ic("i-right") + "</button></div>";
    h += '<p class="fine">Paspaudus mygtuką atsidarys jūsų el. pašto programa su paruoštu laišku. Laišką išsiunčiate patys.</p></form>';
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
    return '<div class="sent card"><p class="sent-ic">' + ic("i-check", "big-ic") + "</p><h3>Ačiū, " + esc(S.contact.name) + ". Laiškas paruoštas.</h3><p>Paskutinis žingsnis: atidarykite laišką ir paspauskite „Siųsti“ savo el. pašto programoje. Gavę laišką susisieksime per " + c.responseHours + " darbo valandas.</p>" +
      '<div class="act-grid"><a class="btn primary lg" id="mailtoLink" href="' + esc(href) + '">' + ic("i-mail") + "<span>Atidaryti laišką</span></a>" +
      '<button type="button" class="btn ghost" data-act="csv">' + ic("i-download") + "<span>Atsisiųsti CSV</span></button>" +
      '<button type="button" class="btn ghost" data-act="print">' + ic("i-print") + "<span>Spausdinti arba išsaugoti PDF</span></button>" +
      '<button type="button" class="btn ghost" data-act="toResult">' + ic("i-left") + "<span>Atgal į rezultatą</span></button></div>" +
      '<p class="fine">Jei el. pašto programa neatsidaro, parašykite adresu ' + esc(c.email) + " ir pridėkite atsisiųstą CSV failą.</p></div>";
  }

  // ---------- santraukos (laiškas, CSV, spausdinimas) ----------
  var TXT = {
    type: { flat: "Butas", house: "Namas", room: "Atskira patalpa" },
    roomKind: { bath: "vonia", kitchen: "virtuvė", room: "kambarys", hall: "koridorius" },
    age: { new: "Nauja statyba", old_pre: "Sena statyba iki 1990 m.", old_post: "Sena statyba po 1990 m.", unknown: "Nežinoma" },
    state: { good: "Gera", medium: "Vidutinė", bad: "Bloga", shell: "Nauja statyba be apdailos" },
    walls: { even: "Lygios", slight: "Šiek tiek nelygios", very: "Labai nelygios", unknown: "Nežinoma" },
    damp: { no: "Ne", yes: "Taip", unknown: "Nežinoma" },
    start: { "1m": "Per mėnesį", "1-3": "Per 1-3 mėnesius", "3-6": "Per 3-6 mėnesius", later: "Dar neplanuoja" },
    plan: { yes: "Turi", no: "Neturi", want: "Norėtų su projektu" },
    pref: { call: "Skambutis", sms: "Žinutė", email: "El. paštas" },
    time: { morning: "Rytais", day: "Dieną", evening: "Vakarais", any: "Bet kada" }
  };
  function plain(v) { return fmt(v).replace(/ /g, " "); }
  function summaryLines(r) {
    var a = S.a;
    return [
      "Objektas: " + TXT.type[a.type] + (a.type === "room" ? " (" + TXT.roomKind[a.roomKind] + ")" : "") + ", " + dec(r.area, 1) + " m2" + (a.type !== "room" ? ", kambarių " + a.rooms + ", vonių " + (a.baths === "0" ? "0 (tik WC)" : a.baths) : "") + ", lubos " + dec(R.height(a), 2) + " m",
      "Miestas: " + cityLabel(a.city) + ". Statyba: " + TXT.age[a.age] + ". Būklė: " + TXT.state[a.state] + ". Sienos: " + TXT.walls[a.walls] + ". Drėgmė: " + TXT.damp[a.damp],
      "Lygis: " + LEVEL_INFO[r.level].t + ". Medžiagas perka: " + (a.buyer === "client" ? "klientas" : "rangovas"),
      "Kaina (" + vatLbl() + "): nuo " + plain(r.total.low) + " iki " + plain(r.total.high) + " EUR, apie " + plain(r.total.mid) + " EUR (" + plain(r.perM2.mid) + " EUR/m2). Tikslumas: " + R.C.accuracy[r.accuracy].label,
      "Darbai " + plain(r.split.labour) + " EUR, medžiagos " + plain(r.split.materials) + " EUR, rezervas " + plain(r.split.reserve) + " EUR" + (r.split.design ? ", projektas " + plain(r.split.design) + " EUR" : ""),
      "Trukmė: apie " + r.timeline[0] + "-" + r.timeline[1] + " sav. Pradžia: " + TXT.start[a.start] + (a.deadline === "yes" && a.deadlineDate ? ". Baigti iki: " + a.deadlineDate : "") + ". Projektas: " + TXT.plan[a.plan]
    ];
  }
  function buildMailto(r) {
    var ct = S.contact, c = CFG.company;
    var lines = ["Sveiki,", "", "prašau paruošti tikslią remonto sąmatą.", "", "KONTAKTAI", "Vardas: " + ct.name, "Telefonas: " + ct.phone];
    if (ct.email) lines.push("El. paštas: " + ct.email);
    lines.push("Susisiekti: " + TXT.pref[ct.pref] + ", " + TXT.time[ct.time]);
    if (ct.address) lines.push("Adresas ar rajonas: " + ct.address);
    lines.push("", "SKAIČIUOKLĖS REZULTATAS");
    lines = lines.concat(summaryLines(r));
    lines.push("", "Grupės (apie, " + vatLbl() + "):");
    r.groups.forEach(function (g) { if (g.total > 0) lines.push("- " + g.label + ": " + plain(g.total) + " EUR"); });
    if (S.a.notes) lines.push("", "Pastabos: " + S.a.notes.slice(0, 500));
    lines.push("", "Sutikimas tvarkyti duomenis: taip (teksto versija " + CFG.privacy.consentVersion + ", " + new Date().toISOString() + ")", "Rinkodaros sutikimas: " + (ct.marketing ? "taip" : "ne"), "Skaičiuoklės versija: " + R.C.version);
    var subject = "Remonto sąmatos užklausa: " + LEVEL_INFO[r.level].t + ", " + dec(r.area, 0) + " m2, " + cityLabel(S.a.city);
    return "mailto:" + c.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
  }
  function csvText(r) {
    var q = function (v) { var s = String(v == null ? "" : v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var n2 = function (v) { return (Math.round(v * 100) / 100).toFixed(2).replace(".", ","); };
    var rows = [["Remonto kainos skaičiuoklė", CFG.company.name], ["Data", new Date().toISOString().slice(0, 10)], ["Kainų versija", R.C.version], ["PVM", vatLbl()], []];
    summaryLines(r).forEach(function (l) { rows.push([l]); });
    rows.push([], ["Grupė", "Eilutė", "Kiekis", "Vnt.", "Darbai EUR", "Medžiagos EUR", "Iš viso EUR"]);
    r.groups.forEach(function (g) { g.lines.forEach(function (l) { rows.push([g.label, l.label, l.code ? n2(l.qty) : "", l.unit, n2(l.labour), n2(l.materials), n2(l.labour + l.materials)]); }); });
    rows.push(["Rezervas", Math.round(r.reservePct * 100) + " proc.", "", "", "", "", n2(r.split.reserve)]);
    if (r.split.design) rows.push(["Interjero projektas", "", "", "", "", "", n2(r.split.design)]);
    rows.push(["Iš viso (apie)", "", "", "", n2(r.split.labour), n2(r.split.materials), n2(r.raw.mid)], ["Intervalas", "nuo " + r.total.low, "iki " + r.total.high], []);
    rows.push(["Medžiaga", "Klasė", "Kiekis", "Vnt.", "Vnt. kaina EUR", "Suma EUR"]);
    materialList(r).forEach(function (m) { rows.push([m.label, m.tierName, n2(m.qty), m.unit, m.unitPrice != null ? n2(m.unitPrice) : "", n2(m.cost)]); });
    rows.push([], ["Tai preliminarus įvertis, ne pasiūlymas. Tikslią kainą parodo sąmata po apžiūros."]);
    return "﻿" + rows.map(function (rw) { return rw.map(q).join(";"); }).join("\r\n");
  }
  function downloadCsv() {
    var r = calc(); var blob = new Blob([csvText(r)], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "remonto-samata-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function buildPrint() {
    var r = calc(), c = CFG.company, a = S.a;
    var h = '<div class="ps-head"><span class="logo">' + esc(c.logoText) + "</span><div><p class=\"ps-co\">" + esc(c.name) + '</p><p>Preliminarus remonto įvertis, ' + new Date().toLocaleDateString("lt-LT") + ". Kainų versija " + R.C.version + ".</p></div></div>";
    h += "<h2>Rezultatas</h2><p class=\"ps-big\">nuo " + eur(r.total.low) + " iki " + eur(r.total.high) + "</p><p>Dažniausiai apie " + eur(r.total.mid) + " (apie " + fmt(r.perM2.mid) + " EUR/m2), " + vatLbl() + ". Tikslumas: " + R.C.accuracy[r.accuracy].label + ".</p>";
    h += "<h3>Pagrindiniai duomenys</h3><ul>" + summaryLines(r).slice(0, 3).map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ul>";
    h += '<h3>Pagal grupes</h3><table><thead><tr><th>Grupė</th><th class="num">Darbai</th><th class="num">Medžiagos</th><th class="num">Iš viso</th></tr></thead><tbody>' + r.groups.filter(function (g) { return g.total > 0; }).map(function (g) { return "<tr><td>" + g.label + '</td><td class="num">' + eur(g.labour) + '</td><td class="num">' + eur(g.materials) + '</td><td class="num">' + eur(g.total) + "</td></tr>"; }).join("") + '<tr><td>Rezervas (' + Math.round(r.reservePct * 100) + ' proc.)</td><td></td><td></td><td class="num">' + eur(r.split.reserve) + "</td></tr>" + (r.split.design ? '<tr><td>Interjero projektas</td><td></td><td></td><td class="num">' + eur(r.split.design) + "</td></tr>" : "") + '<tr class="b"><td>Iš viso (apie)</td><td class="num">' + eur(r.split.labour) + '</td><td class="num">' + eur(r.split.materials) + '</td><td class="num">' + eur(r.raw.mid) + "</td></tr></tbody></table>";
    var ml = materialList(r);
    if (ml.length) h += '<h3>Pasirinktos medžiagos</h3><table><thead><tr><th>Medžiaga</th><th>Klasė</th><th class="num">Kiekis</th><th class="num">Vnt. kaina</th></tr></thead><tbody>' + ml.map(function (m) { return "<tr><td>" + esc(m.label) + "</td><td>" + m.tierName + '</td><td class="num">' + dec(m.qty, 1) + " " + m.unit + '</td><td class="num">' + (m.unitPrice != null ? price(m.unitPrice) : "") + "</td></tr>"; }).join("") + "</tbody></table>";
    h += "<h3>Trukmė</h3><p>Apie " + r.timeline[0] + "-" + r.timeline[1] + " savaičių nuo darbų pradžios, be medžiagų užsakymo laiko.</p>";
    h += "<h3>Kas neįeina</h3><p>" + r.excluded.concat(r.notes).map(esc).join(". ") + ".</p>";
    h += "<h3>Prielaidos</h3><p>Regiono koeficientas " + dec(r.region, 2) + " (" + esc(cityLabel(a.city)) + "), rezervas " + Math.round(r.reservePct * 100) + " proc., kambarių paskirstymas " + (S.flags.roomsCustom ? "pagal jūsų patalpas" : "standartinis") + ". Visas prielaidų sąrašas skaičiuoklės puslapyje.</p>";
    h += '<p class="ps-disc">Tai preliminarus įvertis, ne pasiūlymas. Tikslią kainą parodo sąmata po apžiūros.</p>';
    h += "<p>" + esc(c.name) + ", tel. " + esc(c.phone) + ", " + esc(c.email) + ", " + esc(c.hours) + ".</p>";
    document.getElementById("printSheet").innerHTML = h;
  }

  // ---------- atvaizdavimas ----------
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
    document.getElementById("progressLabel").textContent = "Žingsnis " + S.step + " iš 9: " + STEPS[S.step - 1];
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
      if (S.maxStep < 3) { lv.textContent = "Dar nepakanka duomenų"; mb.textContent = "Dar nepakanka duomenų"; document.getElementById("liveSub").textContent = "Rezultatą parodysime po remonto lygio pasirinkimo."; document.getElementById("liveSplit").innerHTML = ""; document.getElementById("liveAcc").innerHTML = ""; return; }
      var r = calc();
      var txt = "nuo " + eur(r.total.low) + " iki " + eur(r.total.high);
      lv.innerHTML = '<span class="lv-k">Dabar:</span> nuo <span class="nb">' + eur(r.total.low) + '</span> iki <span class="nb">' + eur(r.total.high) + "</span>";
      mb.innerHTML = 'nuo <span class="nb">' + eur(r.total.low) + '</span> iki <span class="nb">' + eur(r.total.high) + '</span> <span class="mb-vat">' + vatLbl() + "</span>";
      document.getElementById("liveSub").textContent = "Dažniausiai apie " + eur(r.total.mid) + ", " + vatLbl() + ".";
      var accIdx = { approx: 1, medium: 2, good: 3 }[r.accuracy];
      document.getElementById("liveAcc").innerHTML = '<div class="acc-bar sm" aria-hidden="true">' + [1, 2, 3].map(function (i) { return '<span class="' + (i <= accIdx ? "on" : "") + '"></span>'; }).join("") + "</div><span>Tikslumas: " + R.C.accuracy[r.accuracy].label + "</span>";
      document.getElementById("liveSplit").innerHTML = "<li><span>Darbai</span><strong>" + eur(r.split.labour) + "</strong></li><li><span>Medžiagos</span><strong>" + eur(r.split.materials) + "</strong></li><li><span>Rezervas</span><strong>" + eur(r.split.reserve) + "</strong></li>" + (r.split.design ? "<li><span>Projektas</span><strong>" + eur(r.split.design) + "</strong></li>" : "");
      lv.setAttribute("data-txt", txt);
    };
    if (now) run(); else liveTimer = setTimeout(run, 300);
  }

  // ---------- validacija ----------
  function parseNum(v) { var n = parseFloat(String(v).replace(/\s/g, "").replace(",", ".")); return isFinite(n) ? n : NaN; }
  function validate(step) {
    var e = {}, a = S.a;
    if (step === 1) {
      var lim = areaLimits(), A = parseNum(a.area);
      if (isNaN(A)) e.area = "Įrašykite plotą skaičiumi, pvz. 55.";
      else if (A < lim[0] || A > lim[1]) e.area = "Plotas turi būti nuo " + lim[0] + " iki " + lim[1] + " m2.";
      if (a.heightOpt === "3.0") { var Hh = parseNum(a.heightExact); if (isNaN(Hh) || Hh < 3 || Hh > 5) e.heightExact = "Lubų aukštis turi būti nuo 3,0 iki 5,0 m."; }
    }
    if (step === 4) {
      Object.keys(a.qty).forEach(function (k) { var v = parseNum(a.qty[k]); if (isNaN(v) || v < 0 || v > 300 || Math.round(v) !== v) e["qty-" + k] = "Įrašykite sveiką skaičių nuo 0 iki 300."; });
    }
    if (step === 5 && a.customRooms) {
      a.customRooms.forEach(function (r, i) {
        var A2 = parseNum(r.area); if (isNaN(A2) || A2 <= 0 || A2 > 300) e["ra-" + i + "-area"] = "Patalpos " + (i + 1) + " plotas turi būti nuo 0,5 iki 300 m2.";
        ["windows", "doors"].forEach(function (k) { var v = parseNum(r[k]); if (isNaN(v) || v < 0 || v > 20 || Math.round(v) !== v) e["r" + k[0] + "-" + i + "-" + k] = "Patalpos " + (i + 1) + " " + (k === "windows" ? "langų" : "durų") + " skaičius turi būti sveikas, nuo 0 iki 20."; });
      });
      if (!a.customRooms.length) e.rooms = "Pridėkite bent vieną patalpą arba praleiskite žingsnį.";
    }
    if (step === 7 && a.deadline === "yes" && a.deadlineDate && a.deadlineDate < new Date().toISOString().slice(0, 10)) e.deadlineDate = "Data jau praėjo. Pasirinkite būsimą datą.";
    if (step === 9) {
      var ct = S.contact;
      if (!ct.name.trim()) e.c_name = "Įrašykite vardą.";
      var ph = ct.phone.replace(/[\s()-]/g, "");
      if (!ph) e.c_phone = "Įrašykite telefono numerį.";
      else if (!/^(\+370|8|370)\d{8}$/.test(ph)) e.c_phone = "Numeris turi būti formatu +370 6xx xxxxx (8 skaitmenys po +370).";
      if (ct.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ct.email)) e.c_email = "El. pašto adresas atrodo neteisingas, pvz. vardas@pastas.lt.";
      if (!ct.consent) e.c_consent = "Be sutikimo negalime paruošti sąmatos. Pažymėkite varnelę.";
    }
    S.errors = e;
    return Object.keys(e).length === 0;
  }

  // ---------- navigacija ----------
  function go(n) {
    S.step = n; S.maxStep = Math.max(S.maxStep, n); S.errors = {};
    render(true);
  }
  function next() {
    var st = S.step;
    if (st === 1) { S.a.area = parseNum(S.a.area); if (S.a.heightOpt === "3.0") S.a.heightExact = parseNum(S.a.heightExact); }
    if (!validate(st)) { S._focusErr = true; render(false); return; }
    if (st === 1 && S.a.customRooms) { S.flags.roomsCustom = false; } // plotas pasikeitė: patalpas reikia patikrinti iš naujo
    if (st === 4) S.flags.worksDone = true;
    if (st === 5) {
      if (S.a.customRooms) { S.a.customRooms = S.a.customRooms.map(function (r) { return { name: r.name || "Patalpa", type: r.type, area: parseNum(r.area), windows: parseNum(r.windows), doors: parseNum(r.doors), wet: !!r.wet }; }); S.flags.roomsCustom = true; }
    }
    if (st === 6) S.flags.materialsDone = true;
    go(Math.min(9, st + 1));
  }

  // ---------- įvykiai ----------
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
      if (path === "area" && t.type === "range") { S.a.area = parseFloat(v); var f = document.getElementById("area"); if (f) f.value = v; updateLive(false); return; }
      if (path === "area" || path === "heightExact" || path === "notes" || path === "deadlineDate") { setPath(path, v); updateLive(false); if (path === "area") { var rg = document.getElementById("areaRange"), n = parseNum(v); if (rg && !isNaN(n)) rg.value = n; } return; }
      setPath(path, v);
      if (path === "ceiling" || path === "buyer" || path === "floorDry" || path === "floorWet") { /* matomos kategorijos keičiasi */ }
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
  function ensureRooms() { if (!S.a.customRooms) S.a.customRooms = R.defaultRooms(S.a).map(function (r) { return { name: r.name, type: r.type, area: Math.round(r.area * 10) / 10, windows: r.windows, doors: r.doors, wet: r.wet }; }); }
  function updateRoomSum() {
    var el = document.getElementById("roomSum"); if (!el) return;
    var sum = S.a.customRooms.reduce(function (s, r) { return s + (parseNum(r.area) || 0); }, 0);
    el.innerHTML = "Patalpų plotų suma: <strong>" + dec(sum, 1) + " m2</strong> iš " + dec(S.a.area, 1) + " m2";
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
      case "intro": S.step = 0; render(true); break;
      case "next": next(); break;
      case "back": go(Math.max(1, S.step - 1)); break;
      case "helper": S.helper = S.helper ? null : { el: null, pipe: null, demo: null }; render(false); break;
      case "useSuggest": S.a.level = b.dataset.v; S.a.works = {}; if (!S.flags.matTouched) S.a.mat = matForLevel(b.dataset.v); S.helper = null; render(false); break;
      case "resetWorks": S.a.works = {}; render(false); break;
      case "skipRooms": S.a.customRooms = null; S.flags.roomsCustom = false; S.errors = {}; go(6); break;
      case "addRoom": ensureRooms(); S.a.customRooms.push({ name: "Nauja patalpa", type: "room", area: 10, windows: 1, doors: 1, wet: false }); render(false); var ins = stage.querySelectorAll(".room"); if (ins.length) { var last = ins[ins.length - 1].querySelector("input"); if (last) last.focus(); } break;
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
    if (document.getElementById("website").value) return; // šlamšto spąstai
    if (!validate(9)) { S._focusErr = true; render(false); return; }
    S.sent = { href: buildMailto(calc()), at: new Date().toISOString() };
    render(true);
    var l = document.getElementById("mailtoLink"); if (l) l.focus();
  }

  // ---------- statinės dalys ----------
  function applyConfig() {
    var c = CFG.company, col = CFG.colors, root = document.documentElement.style;
    root.setProperty("--accent", col.accent); root.setProperty("--accent-d", col.accentDark); root.setProperty("--accent-s", col.accentSoft); root.setProperty("--warm", col.warm); root.setProperty("--ink", col.ink); root.setProperty("--bg", col.bg);
    document.getElementById("ribbon").hidden = !CFG.demo;
    document.getElementById("logoText").textContent = c.logoText;
    document.getElementById("brandName").textContent = c.name;
    document.getElementById("footName").textContent = c.name;
    document.getElementById("footHours").textContent = c.hours;
    document.getElementById("footCity").textContent = c.city;
    ["topTel", "footTel"].forEach(function (id) { var el = document.getElementById(id); el.setAttribute("href", telHref()); });
    document.getElementById("topTelTxt").textContent = c.phone;
    document.getElementById("footTel").textContent = c.phone;
    var fm = document.getElementById("footMail"); fm.setAttribute("href", "mailto:" + c.email); fm.textContent = c.email;
    if (CFG.demo && document.title.indexOf("DEMO") < 0) document.title += " | DEMO";
  }
  function priceTable() {
    var used = {};
    R.WORKS.forEach(function () {});
    ["d01", "d02", "d04", "d05", "d06", "d07", "d09", "d11", "d13", "c01", "c03", "f01", "f02", "f03", "f05", "f07", "f08", "f09", "t01", "t02", "t03", "w01", "w02", "w03", "e01", "e03", "e05", "e07", "p01", "p02", "p03", "p05", "p06", "p08", "h01", "h02", "o01", "o02", "o03", "o04", "m01", "m02", "m03", "m04", "m05", "m06", "m07", "m08", "m09", "m10", "m11", "m12", "m13", "m14", "m15", "m16", "m17", "m18", "m19"].forEach(function (id) { used[id] = true; });
    var conf = P.meta.confidence_scale;
    var rows = Object.keys(P.items).filter(function (id) { return used[id]; }).map(function (id) {
      var it = P.items[id], n = it.net;
      var f = function (v) { return v == null ? "nėra" : dec(v, 2); };
      return "<tr><td>" + id + "</td><th scope=\"row\">" + esc(it.name) + "</th><td>" + esc(it.unit) + '</td><td class="num">' + f(n[0]) + " / " + f(n[1]) + " / " + f(n[2]) + "</td><td>" + esc(it.vat_note) + "</td><td>" + esc(it.sources.join(", ") || "nėra") + '</td><td><span class="conf c-' + it.conf + '">' + esc(conf[it.conf]) + "</span></td></tr>";
    }).join("");
    document.getElementById("priceTable").innerHTML = '<table class="lines ptable"><caption>Įkainiai be PVM (maž. / vid. / did.). Mažmenos kainos su PVM perskaičiuotos be PVM.</caption><thead><tr><th scope="col">Kodas</th><th scope="col">Pozicija</th><th scope="col">Vnt.</th><th scope="col" class="num">Be PVM</th><th scope="col">PVM būsena</th><th scope="col">Šaltiniai</th><th scope="col">Patikimumas</th></tr></thead><tbody>' + rows + "</tbody></table>";
    document.getElementById("sourceList").innerHTML = '<h3>Šaltiniai</h3><ul class="srcs">' + Object.keys(P.sources).map(function (k) { var s = P.sources[k]; return "<li><strong>" + k + "</strong> <span>" + esc(s.url) + "</span> <span class=\"muted\">" + esc(s.date) + ". " + esc(s.note) + "</span></li>"; }).join("") + "</ul>";
  }
  var ASSUME = [
    "Kainos rodomos su 21 proc. PVM. Kur šaltinis PVM nenurodė, kaina laikyta be PVM. Mažmenos kainos laikytos su PVM.",
    "Regioniniai koeficientai taikomi tik darbui: Vilnius 1,00, Kaunas 0,95, Klaipėda 0,95, Šiauliai, Panevėžys ir kiti miestai 0,90, miesteliai ir kaimai 0,85. Patvirtinimo šaltinio nėra. Keičiami config.js.",
    "Kambarių paskirstymas pagal kambarių skaičių (pvz. 2 kambariai: svetainė ir virtuvė 35 proc., miegamasis 25, vonia 10, koridorius 30). Kai vonių daugiau, dalys perskaičiuojamos proporcingai.",
    "Patalpos laikomos stačiakampėmis: kambariai 1:1,3, vonia, virtuvė ir koridorius 1:2. Langas 2,25 m2, durys 1,6 m2.",
    "Numatyti kiekiai: elektros taškai 6 + 3 x kambariai, santechnikos taškai 2 x vonios + 2, durys kambariai + vonios + 1, radiatoriai kambariai + 1, šviestuvai 2 x kambariai + vonios + 2.",
    "Darbų paketai pagal lygį yra pasiūlymas pagal konkurentų paketus. Standartiniame lygyje griaunama vonia (10 proc. ploto), tinkuojama ir grindys lyginamos tik pagal būklę.",
    "Rezervas: dalinis 10 proc., standartinis 12, pilnas ir prabangus 15. Senam pastatui iki 1990 m. pridedama 5 proc.",
    "Sudėtingumas: be lifto 3-5 aukštas +3 proc., 6 ir aukščiau +5, lubos virš 3,1 m +5, gyvenama remonto metu +5. Taikoma tik darbui.",
    "Intervalas: eilučių kainų sklaida mažinama koeficientu k (1,0, 0,8 arba 0,6 pagal tikslumą), kiekių netikrumas 15, 10 arba 5 proc. Tai modelis, ne statistinė tikimybė.",
    "Atsargos medžiagoms: dažai ir glaistas 5 proc. (labai nelygioms sienoms glaistas 10), plytelės 10, laminatas, vinilas ir parketlentės 7 (šaltinio nėra).",
    "Smulkios medžiagos (gruntas, juostos, silikonas) 10 proc. nuo medžiagų. Gipso kartono karkasas +100 proc. nuo plokščių kainos.",
    "Visos instaliacijos komplektai skirti apie 55 m2 butui ir perskaičiuojami pagal plotą (plotas / 55) laipsniu 0,7, ribose 0,6-2,0.",
    "Vonios plytelės iki 2 m aukščio. Hidroizoliacija: grindys, 0,2 m sienų juosta ir 8 m2 dušo zona. Vonios sienos skaičiuojamos ir dažymui, kaip numatyta specifikacijoje.",
    "Šildomos grindys skaičiuojamos vonios, virtuvės ir koridoriaus plotui. Dideli plytelių formatai taikomi prabangiam lygiui.",
    "Langai, techninė priežiūra, skydelio medžiagos, tapetai, grindjuostės, hidroizoliacijos ir šildymo medžiagos neturi patikrintos kainos ir į sumą neįtraukti.",
    "Trukmė: dalinis 1-3 sav., standartinis 4-8, pilnas 10-16 (nauja statyba) arba 8-17 (sena), prabangus x 1,25, perskaičiuojama pagal plotą. Su projektu +2 sav.",
    "Įspėjimas apie neįprastą EUR/m2 rodomas, kai vidurkis iškrenta iš lygio koridoriaus ir be PVM, ir su PVM, nes koridoriaus šaltinių PVM būsena nevienoda.",
    "Atskirai patalpai įspėjimas apie EUR/m2 nerodomas, o visos instaliacijos komplektai pagal nutylėjimą išjungti.",
    "Sumos apvalinamos iki 50 EUR (iki 10 000) ir iki 100 EUR (nuo 10 000). Kainos 2026 m. lapkričio. Kainos nepatikrintos realiomis sąmatomis."
  ];

  function init() {
    stage = document.getElementById("stage");
    applyConfig();
    priceTable();
    document.getElementById("assumeList").innerHTML = ASSUME.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
    document.addEventListener("change", onChange);
    document.addEventListener("input", onInput);
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    window.addEventListener("beforeprint", function () { if (!document.getElementById("printSheet").innerHTML) buildPrint(); });
    render(false);
    // Tik testams: leidžia patikrinti būseną ir paruoštą mailto nuorodą, jos neatidarant.
    window.__calcApp = { state: S, calc: calc, buildPrint: buildPrint, csvText: function () { return csvText(calc()); }, buildMailto: function () { return buildMailto(calc()); } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
