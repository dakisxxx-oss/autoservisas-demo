// ============================================================================
// KONFIGŪRACIJA. Čia keičiama viskas, kas skiriasi tarp įmonių (white label).
// Visi žemiau esantys kontaktai IŠGALVOTI (DEMO). Prieš naudojant pakeiskite.
// ============================================================================
(function (g) {
  g.CALC_CONFIG = {
    // true: rodoma DEMO juostelė. Paleidžiant tikrai įmonei nustatykite false
    // ir index.html ištrinkite eilutę <meta name="robots" content="noindex, nofollow">.
    demo: true,

    company: {
      name: "Pavyzdinė remonto įmonė",          // KEISTI
      logoText: "PR",                            // 1-3 raidės logotipo ženkle, KEISTI
      phone: "+370 600 00000",                   // KEISTI (išgalvotas numeris)
      email: "uzklausos@pavyzdys.example",       // KEISTI: čia ateis užklausos (mailto)
      hours: "I-V 8:00-17:00",                   // KEISTI
      city: "Lietuva",                           // KEISTI: miestas ar regionas
      responseHours: 24                          // KEISTI: per kiek darbo valandų atsakote
    },

    // Spalvos. Tekstui ir mygtukams laikykitės AA kontrasto (4,5:1) su baltu fonu.
    colors: {
      accent: "#1f5c4d",       // pagrindinė (mygtukai, aktyvūs elementai)
      accentDark: "#163f35",
      accentSoft: "#e3efe9",
      warm: "#8a561f",       // antrinė (žymės, medžiagos diagramoje)
      ink: "#1b222c",
      bg: "#f4f1eb"
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
      controller: "{{ĮMONĖS_ARBA_ASMENS_PAVADINIMAS}}",
      code: "{{ĮMONĖS_KODAS_ARBA_ASMENS_KODAS_NEPRIVALOMA}}",
      address: "{{ADRESAS}}",
      retention: "{{SAUGOJIMO_LAIKOTARPIS}}",
      email: "{{EL_PAŠTAS}}",
      policyUrl: "{{NUORODA_Į_PRIVATUMO_POLITIKĄ}}",
      consentVersion: "2026-11-16-juodrastis"
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
