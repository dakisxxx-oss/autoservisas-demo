/* Pavyzdinis grožio salonas, DEMO šablonas. Vanilla JS, be bibliotekų, be slapukų, be sekimo. */
(function () {
  "use strict";

  /* 1. Mobilus meniu */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("nav");
  if (toggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "Uždaryti" : "Meniu";
    };
    toggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("is-open"));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* 2. "Dabar atidaryta / uždaryta" pagal lentelę #darbo-laikas (Europe/Vilnius laikas) */
  var statusEls = document.querySelectorAll("[data-status]");
  var rows = document.querySelectorAll("#darbo-laikas tbody tr[data-day]");
  var dayNames = ["", "pirmadienį", "antradienį", "trečiadienį", "ketvirtadienį", "penktadienį", "šeštadienį", "sekmadienį"];
  var weekdayIndex = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

  function toMinutes(text) {
    var p = (text || "").split(":");
    if (p.length !== 2) return null;
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  function vilniusNow() {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Vilnius", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date());
    var out = {};
    parts.forEach(function (p) { out[p.type] = p.value; });
    return { day: weekdayIndex[out.weekday], minutes: parseInt(out.hour, 10) * 60 + parseInt(out.minute, 10) };
  }

  function updateStatus() {
    if (!statusEls.length || !rows.length) return;
    var schedule = {};
    rows.forEach(function (row) {
      schedule[row.getAttribute("data-day")] = {
        open: toMinutes(row.getAttribute("data-open")),
        close: toMinutes(row.getAttribute("data-close")),
        openText: row.getAttribute("data-open"),
        closeText: row.getAttribute("data-close"),
        row: row
      };
    });
    var now = vilniusNow();
    if (!now.day) return;

    rows.forEach(function (row) { row.classList.remove("is-today"); });
    if (schedule[now.day]) schedule[now.day].row.classList.add("is-today");

    var today = schedule[now.day];
    var text;
    var state;
    if (today && today.open !== null && now.minutes >= today.open && now.minutes < today.close) {
      state = "is-open";
      text = "Dabar atidaryta, dirbame iki " + today.closeText;
    } else {
      state = "is-closed";
      text = "Dabar uždaryta";
      for (var i = 0; i <= 7; i++) {
        var d = ((now.day - 1 + i) % 7) + 1;
        var s = schedule[d];
        if (!s || s.open === null) continue;
        if (i === 0 && now.minutes >= s.open) continue;
        var when = i === 0 ? "šiandien" : (i === 1 ? "rytoj" : dayNames[d]);
        text += ". Atidarysime " + when + " " + s.openText;
        break;
      }
    }
    statusEls.forEach(function (el) {
      el.textContent = text;
      el.classList.remove("is-open", "is-closed");
      el.classList.add("is-set", state);
    });
  }
  updateStatus();

  /* 3. Kontaktų forma: sudaro mailto nuorodą ir atidaro el. pašto programą. Nieko nesiunčiama į serverį.
        Laiško eilutės sudaromos iš laukų su atributu data-label, todėl laukus galima keisti be JavaScript pakeitimų. */
  var form = document.getElementById("uzklausa");
  var msg = document.getElementById("form-msg");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var to = (form.getAttribute("action") || "").replace(/^mailto:/i, "");
      var service = "";
      var lines = [];
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.type === "submit" || el.type === "button") return;
        var value = String(el.value || "").trim();
        if (el.name === "paslauga") service = value;
        lines.push((el.getAttribute("data-label") || el.name) + ": " + (value || "Nenurodyta"));
      });
      var subjectService = service || "Nenurodyta";
      var href = "mailto:" + to +
        "?subject=" + encodeURIComponent("Užklausa iš svetainės: " + subjectService) +
        "&body=" + encodeURIComponent(lines.join("\r\n"));
      form.setAttribute("data-mailto", href);
      if (msg) {
        msg.textContent = "Atidarome jūsų el. pašto programą. Jei nieko neatsidarė, parašykite tiesiai adresu " + to + ".";
      }
      /* data-dry-run naudojamas tik automatinėje patikroje: nuoroda sudaroma, bet pašto programa neatidaroma */
      if (!form.hasAttribute("data-dry-run")) window.location.href = href;
    });
  }
})();
