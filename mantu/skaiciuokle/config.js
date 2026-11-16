// ============================================================================
// KONFIGŪRACIJA: Mantu Statyba (MB Mantų statyba).
// Čia keičiama viskas, kas susiję su įmone. Skaičiavimo logika ir kainos yra calc.js ir data.js.
// Šį failą naudoja ir lietuviška, ir angliška skaičiuoklė (en/calculator/).
// ============================================================================
(function (g) {
  g.CALC_CONFIG = {
    // false: DEMO juostelė nerodoma. Rezultatai visada vadinami preliminaria kaina.
    // KEISTI: kol svetainė juodraštis, index.html palikta eilutė <meta name="robots" content="noindex, nofollow">.
    demo: false,

    company: {
      name: "Mantu Statyba",
      legalName: "MB Mantų statyba",
      logoText: "MS",
      logo: "../assets/logo-light.svg",       // spausdinimo lapui
      phone: "+370 640 30007",
      email: "info@pavyzdys.example",         // KEISTI: tikras el. paštas nežinomas, čia laikinas adresas
      hours: "",                              // KEISTI: darbo laikas (pvz. "I-V 8:00-17:00"). Tuščias nerodomas.
      city: "Kaunas, dirbame visoje Lietuvoje",
      responseHours: null                     // KEISTI: per kiek darbo valandų atsakote. null: tekstas nerodomas.
    },

    // Prekės ženklo spalvos. Tekstui ir mygtukams laikomasi AA kontrasto (4,5:1) su baltu fonu.
    colors: {
      accent: "#1438c8",
      accentDark: "#0c2590",
      accentSoft: "#e3e8fa",
      warm: "#0c2590",
      ink: "#10182b",
      bg: "#eef0ea"
    },

    // Kainos rodomos su PVM ("incl") arba be PVM ("excl"). Lankytojas gali perjungti.
    displayVat: "incl",
    vatRate: 0.21,

    // Regioniniai darbo kainos koeficientai (taikomi tik darbui).
    // PRIELAIDA iš specifikacijos (04, 2.1 skyrius), patvirtinimo šaltinio nėra.
    regions: [
      { id: "vilnius",    label: "Vilnius",                 coef: 1.00 },
      { id: "kaunas",     label: "Kaunas",                  coef: 0.95 },
      { id: "klaipeda",   label: "Klaipėda",                coef: 0.95 },
      { id: "siauliai",   label: "Šiauliai",                coef: 0.90 },
      { id: "panevezys",  label: "Panevėžys",               coef: 0.90 },
      { id: "other_city", label: "Kitas miestas",           coef: 0.90 },
      { id: "rural",      label: "Miestelis ar kaimas",     coef: 0.85 }
    ],
    defaultCity: "kaunas",

    // Privatumo tekstai. TEISININKAS TURI PERŽIŪRĖTI prieš paleidimą.
    // {{...}} žymenis užpildo savininkas.
    privacy: {
      controller: "MB Mantų statyba",
      code: "įmonės kodas 305060463",
      address: "Jonavos g. 20, LT-44262 Kaunas",
      retention: "{{SAUGOJIMO_LAIKOTARPIS}}",
      email: "info@pavyzdys.example",          // KEISTI kartu su company.email
      policyUrl: "{{NUORODA_Į_PRIVATUMO_POLITIKĄ}}",
      consentVersion: "2026-11-16-juodrastis"
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
