// English labels for the shared calculator engine (../../skaiciuokle/calc.js, data.js, config.js).
// Numbers and logic stay shared: this file only maps Lithuanian labels produced by the engine to English.
// window.trEN(s) returns the English text; anything missing is recorded in window.__trMiss (checked by tools/qa-calc-en.mjs).
// KEISTI: a native English speaker should review these texts.
(function (g) {
  "use strict";
  var D = {
    // levels and accuracy
    "Dalinis (kosmetinis)": "Partial (cosmetic)", "Standartinis": "Standard", "Pilnas (kapitalinis)": "Full (major)", "Prabangus": "Premium",
    "orientacinis": "indicative", "vidutinis": "medium", "geras": "good",
    // room types
    "Svetainė ir virtuvė": "Living room and kitchen", "Miegamasis": "Bedroom", "Kitas kambarys": "Other room", "Virtuvė": "Kitchen", "Vonia ir WC": "Bathroom and WC", "Koridorius": "Hallway", "WC": "WC", "Nauja patalpa": "New room", "Patalpa": "Room",
    // regions
    "Vilnius": "Vilnius", "Kaunas": "Kaunas", "Klaipėda": "Klaipėda", "Šiauliai": "Šiauliai", "Panevėžys": "Panevėžys", "Kitas miestas": "Other city", "Miestelis ar kaimas": "Small town or village",
    // groups
    "Paruošimas ir griovimas": "Preparation and demolition", "Sienos ir lubos": "Walls and ceilings", "Grindys": "Floors", "Durys ir langai": "Doors and windows", "Elektra": "Electrical", "Santechnika ir šildymas": "Plumbing and heating", "Kita": "Other",
    // work items
    "Senų dangų, dažų ar tapetų nuėmimas": "Removing old coverings, paint or wallpaper", "Griovimas (pertvaros, plytelės)": "Demolition (partitions, tiles)", "Atliekų išvežimas": "Waste removal",
    "Sienų tinkavimas ir lyginimas": "Wall plastering and levelling", "Sausas lyginimas (gipso kartonas)": "Dry lining (plasterboard)",
    "Tinkas ir lyginimas visoms sienoms. Kartu su sausu lyginimu tinkuojamos tik vonia, virtuvė ir koridorius.": "Plaster and levelling for all walls. Together with dry lining, only the bathroom, kitchen and hallway are plastered.",
    "Sienos apkalamos gipso kartonu ant profilių. Kartu su tinkavimu: kambariuose vietoj tinko.": "Walls are clad with plasterboard on metal studs. Together with plastering: used in rooms instead of plaster.",
    "Sienų ir lubų lyginimas glaistu": "Skimming walls and ceilings", "Gruntavimas ir dažymas": "Priming and painting", "Tapetai (vietoj sienų dažymo)": "Wallpaper (instead of painting walls)", "Tapetų klijų kainos šaltinio nėra.": "No price source for wallpaper paste.",
    "Grindų išlyginimas": "Floor levelling", "Grindų danga (laminatas, vinilas, parketlentės, plytelės)": "Floor covering (laminate, vinyl, engineered wood, tiles)", "Grindjuostės": "Skirting boards",
    "Plytelės sienoms ir grindims": "Wall and floor tiles", "Hidroizoliacija": "Waterproofing", "Dušo trapas ir nuolydis": "Shower drain and fall", "Klozetas": "Toilet", "Dušas ar vonia": "Shower or bath", "Praustuvas ir spintelė": "Washbasin and vanity unit",
    "Vidaus durys": "Interior doors", "Kiek durų?": "How many doors?", "Palangės": "Window sills", "Angokraščių formavimas": "Forming window and door reveals", "Langų keitimas": "Window replacement", "Kainą nurodysime po apžiūros. Į sumą neįtraukta.": "We will quote the price after a site visit. Not included in the total.",
    "Pilna elektros instaliacija su skydeliu": "Full electrical installation with distribution board", "Nauji laidai, rozetės, jungikliai, skydelis ir automatiniai išjungikliai. Atskiri taškai tada neskaičiuojami.": "New wiring, sockets, switches, distribution board and circuit breakers. Separate points are then not counted.",
    "Atskiri nauji taškai": "Separate new points", "Kiek naujų elektros taškų?": "How many new electrical points?", "Šviestuvų montavimas": "Light fitting installation", "Kiek šviestuvų?": "How many lights?",
    "Visa santechnikos instaliacija": "Full plumbing installation", "Kiek santechnikos taškų?": "How many plumbing points?", "Radiatorių keitimas": "Radiator replacement", "Kiek radiatorių?": "How many radiators?",
    "Valymas po remonto": "Cleaning after renovation", "Interjero projektas": "Interior design project", "Techninė priežiūra": "Technical supervision", "Kainos šaltinio nėra. Į sumą neįtraukta.": "No price source. Not included in the total.",
    // result lines
    "Senų dažų ir tapetų nuėmimas": "Removing old paint and wallpaper", "Atliekų išvežimas (konteineris 8-10 m3)": "Waste removal (8-10 m3 skip)", "Sausas lyginimas gipso kartonu (sienos)": "Dry lining with plasterboard (walls)",
    "Sienų glaistymas ir šlifavimas": "Wall skimming and sanding", "Lubų glaistymas": "Ceiling skimming", "Gruntavimas ir dažymas (2 sluoksniai)": "Priming and painting (2 coats)", "Tapetų klijavimas": "Wallpapering",
    "Gipso kartono lubos": "Plasterboard ceiling", "Įtempiamos lubos (su plėvele)": "Stretch ceiling (with membrane)", "Šešėlinės siūlės": "Shadow gaps", "Laminato klojimas": "Laying laminate", "Vinilo klojimas": "Laying vinyl", "Parketlenčių klojimas": "Laying engineered wood", "Grindų plytelės": "Floor tiles",
    "Grindjuosčių montavimas": "Fitting skirting boards", "Plytelės vonioje ir WC (sienos ir grindys)": "Tiles in bathroom and WC (walls and floor)", "Dušo trapas": "Shower drain", "Klozeto montavimas": "Toilet installation", "Dušo kabinos ar stiklo montavimas": "Shower enclosure or screen installation",
    "Praustuvo su spintele montavimas": "Washbasin and vanity unit installation", "Vidaus durų montavimas": "Interior door installation", "Palangių montavimas": "Window sill installation", "Pilna elektros instaliacija (komplektas)": "Full electrical installation (set)", "Elektros skydelio surinkimas": "Distribution board assembly",
    "Nauji elektros taškai": "New electrical points", "Visa santechnikos instaliacija (komplektas)": "Full plumbing installation (set)", "Nauji santechnikos taškai": "New plumbing points", "Šildomos grindys": "Underfloor heating",
    "Smulkios medžiagos (tvirtinimo detalės, silikonas, juostos)": "Small materials (fixings, silicone, tapes)", "Smulkios medžiagos, 10 proc. nuo medžiagų": "Small materials, 10% of materials", "Gipso kartonas ir karkasas (+100 proc. priedas)": "Plasterboard and framing (+100% allowance)",
    // materials
    "Sienų dažai": "Wall paint", "Lubų dažai": "Ceiling paint", "Giluminis gruntas": "Deep primer", "Tapetai (flizelino pagrindu)": "Wallpaper (non-woven)", "Laminatas": "Laminate", "Vinilas, SPC": "Vinyl, SPC", "Parketlentės": "Engineered wood boards",
    "Sienų plytelės (vonia)": "Wall tiles (bathroom)", "Vidaus durų varčia": "Interior door leaf", "Durų rankena": "Door handle", "Durų vyriai": "Door hinges", "Dušo kabina": "Shower enclosure", "Praustuvas su spintele": "Washbasin with vanity unit",
    "Praustuvo maišytuvas": "Basin mixer tap", "Dušo ar vonios maišytuvas": "Shower or bath mixer", "Rozetės": "Sockets", "Jungikliai": "Switches", "Elektros skydelis (12 mod., aukšt. 36 mod.)": "Distribution board (12 mod., upper class 36 mod.)",
    "Automatiniai išjungikliai 1P": "Circuit breakers 1P", "Lubiniai šviestuvai": "Ceiling lights", "Įleidžiamos LED panelės": "Recessed LED panels", "Plieniniai radiatoriai": "Steel radiators", "Gipso kartonas 12,5 mm": "Plasterboard 12.5 mm",
    "Glaistas (Weber LR+, 20 kg)": "Filler (Weber LR+, 20 kg)", "Savaime išsilyginantis mišinys (Mira 6700)": "Self-levelling compound (Mira 6700)", "Durų staktos komplektas": "Door frame set", "Kabelis NYM-J 3x1,5 (apšvietimas)": "Cable NYM-J 3x1.5 (lighting)",
    "Kabelis NYM-J 3x2,5 (rozetės)": "Cable NYM-J 3x2.5 (sockets)", "Plytelių klijai, 25 kg": "Tile adhesive, 25 kg", "Fuga, 2 kg": "Grout, 2 kg", "Hidroizoliacija, skystoji plėvelė": "Waterproofing, liquid membrane", "Hidroizoliacinė juosta": "Waterproofing tape",
    "PPR vamzdis d20": "PPR pipe d20", "PPR jungtys": "PPR fittings", "Nuotekų vamzdis": "Drain pipe", "Tinkavimo medžiagos (modelio įvertis)": "Plastering materials (model estimate)", "Profilis CD 60/27, 3 m": "Profile CD 60/27, 3 m", "Profilis UD 28/27, 4 m (ekon. kaina)": "Profile UD 28/27, 4 m (economy price)",
    // material examples (brand names stay as they are)
    "Pigiausias 5 l": "Cheapest 5 l", "Pigesnės (10 proc. riba)": "Cheaper (10th percentile)", "Vidutinė kaina (mediana)": "Median price", "Brangesnės (90 proc. riba)": "More expensive (90th percentile)", "Marchetti Napoleon (masyvas)": "Marchetti Napoleon (solid wood)",
    "Pastatomas klozetas": "Floor-standing toilet", "Potinkinis rėmas ir klozetas": "Concealed frame and toilet", "Aukštesnis komplektas": "Higher-end set", "Aukštesnės klasės kainos nėra": "No price for the higher class", "Paprasta serija": "Basic range", "Vidutinė serija": "Mid range", "Aukštesnė serija": "Upper range",
    "Pigiausia panelė": "Cheapest panel", "22 tipas, mažesnis": "Type 22, smaller", "22 tipas, vidutinis": "Type 22, medium", "22 tipas, didesnis": "Type 22, larger", "Drėgmei atsparus": "Moisture resistant", "Akustinis": "Acoustic", "Vento komplektas, Hansgrohe Logis": "Vento set, Hansgrohe Logis",
    // units
    "vnt.": "pcs", "kompl.": "set", "maiš.": "bags", "pak.": "packs", "vnt": "pcs",
    "EUR/vnt": "EUR/pc", "EUR/vnt.": "EUR/pc", "EUR/maišas": "EUR/bag", "proc. nuo sąmatos": "% of the estimate",
    "Šildomos grindys (vonia, virtuvė, koridorius)": "Underfloor heating (bathroom, kitchen, hallway)", "Šildymo kilimėlių kainos šaltinio nėra, skaičiuojamas tik darbas.": "No price source for heating mats, only labour is calculated.",
    // warnings, notes, exclusions, uncertainties
    "Drėgmė ar pelėsis: priežastį ir sutvarkymo kainą nustatys meistras apžiūros metu. Į sumą neįtraukta.": "Damp or mould: the cause and the repair cost will be assessed by a tradesperson on site. Not included in the total.",
    "Nežinoma, ar yra drėgmės. Jei bus, sutvarkymas į sumą neįtrauktas.": "It is not known whether there is damp. If there is, the repair is not included in the total.",
    "Lubų aukštis nežinomas, naudojame 2,6 m.": "Ceiling height unknown, we use 2.6 m.",
    "Baldai ir buitinė technika": "Furniture and household appliances", "Techninė priežiūra (pažymėjote, kainą nustato rangovas)": "Technical supervision (you selected it, the contractor sets the price)", "Leidimai ir projektai statybai": "Building permits and construction projects",
    "Bendrų stovų keitimas": "Replacing shared risers", "Netikėti darbai virš rezervo": "Unexpected work beyond the contingency", "Drėgmės ar pelėsio šalinimas": "Removing damp or mould",
    "Tapetų klijai (kainos šaltinio nėra)": "Wallpaper paste (no price source)", "Grindų paklotas po laminatu, vinilu ar parketlentėmis (kainos šaltinio nėra)": "Underlay for laminate, vinyl or engineered wood (no price source)", "Plytelių profiliai ir kampai (kainos šaltinio nėra)": "Tile trims and corners (no price source)",
    "Dušo trapas ir padėklas kaip prekė (kainos šaltinio nėra, įtrauktas tik montavimas)": "Shower drain and tray as products (no price source, installation only)", "Sifonai, lanksčios žarnelės ir ventiliai (kainos šaltinio nėra)": "Traps, flexible hoses and valves (no price source)",
    "Nuotėkio relė (RCD) ir potinkinės dėžutės (kainos šaltinio nėra)": "RCD and flush-mounted boxes (no price source)", "Potinkinės dėžutės (kainos šaltinio nėra)": "Flush-mounted boxes (no price source)", "Šildomų grindų kilimėliai ir termostatas (kainos šaltinio nėra, įtrauktas tik darbas)": "Underfloor heating mats and thermostat (no price source, labour only)",
    "Jei būklė bloga (seni laidai, vamzdžiai, trupantis tinkas)": "If the condition is poor (old wiring, pipes, crumbling plaster)", "Jei sienos labai nelygios ir reikia tinkuoti": "If the walls are very uneven and need plastering", "Sienų būklė nežinoma. Jei sienos labai nelygios": "Wall condition unknown. If the walls are very uneven",
    "Jei rinksitės aukštesnės klasės medžiagas": "If you choose higher-class materials", "Jei pastatas statytas iki 1990 m. (didesnis rezervas)": "If the building was built before 1990 (larger contingency)", "Jei vonioje plytelės iki lubų": "If bathroom tiles go up to the ceiling", "Jei gyvensite remonto metu": "If you live there during the renovation"
  };
  var RX = [
    [/^Akmens masė; (.+)$/, function (m) { return "Porcelain stoneware; " + m[1]; }],
    [/^Keramika; (.+)$/, function (m) { return "Ceramic; " + m[1]; }],
    [/^Rezultatas neįprastas šiam lygiui \(įprastai (\d+)-(\d+) EUR\/m2\)\. Patikrinkite pasirinkimus\.$/, function (m) { return "The result is unusual for this level (usually " + m[1] + "-" + m[2] + " EUR/m2). Please check your choices."; }],
    [/^Langai \(turime tik mažiausias kainas(.*)\)$/, function (m) { return "Windows (we only have the lowest prices" + win(m[1]) + ")"; }],
    [/^Langų keitimas \(pažymėjote, kainą nurodysime po apžiūros(.*)\)$/, function (m) { return "Window replacement (you selected it, we will quote after a site visit" + win(m[1]) + ")"; }],
    [/^(.+) (\d+)$/, function (m) { var b = D[m[1]]; return b ? b + " " + m[2] : null; }]
  ];
  function win(s) {
    var m = /^, pvz\. PVC langas 1400x1200 mm nuo ([\d,]+) EUR (su|be) PVM be montavimo$/.exec(s || "");
    return m ? ", e.g. a 1400x1200 mm PVC window from " + m[1].replace(",", ".") + " EUR " + (m[2] === "su" ? "incl. VAT" : "excl. VAT") + ", without installation" : s;
  }
  var miss = g.__trMiss = {};
  g.trEN = function (s) {
    if (s == null || s === "") return s;
    s = String(s);
    if (Object.prototype.hasOwnProperty.call(D, s)) return D[s];
    for (var i = 0; i < RX.length; i++) { var m = RX[i][0].exec(s); if (m) { var r = RX[i][1](m); if (r != null) return r; } }
    if (/[ąčęėįšųūžĄČĘĖĮŠŲŪŽ]/.test(s) || /\b(ir|su|be|nuo|iki|vnt)\b/.test(s)) miss[s] = (miss[s] || 0) + 1;
    return s;
  };
})(window);
