/* Mantu Statyba v2. Vanilla JS, be bibliotekų, be slapukų, be sekimo. Bendras LT ir EN puslapiams ir skaičiuoklei. */
(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");
  var EN = root.lang === "en";
  var T = EN
    ? { menu: "Menu", close: "Close", subject: "Website enquiry: ", none: "Not specified", msg: "Opening your email app. If nothing opened, write directly to ", need: "Please enter your name and phone number.", consent: "Please tick the consent box." }
    : { menu: "Meniu", close: "Uždaryti", subject: "Užklausa iš svetainės: ", none: "Nenurodyta", msg: "Atidarome jūsų el. pašto programą. Jei nieko neatsidarė, parašykite tiesiai adresu ", need: "Įrašykite vardą ir telefono numerį.", consent: "Pažymėkite sutikimą dėl duomenų naudojimo." };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 1. Mobilus meniu */
  var btn = document.querySelector(".menu-btn");
  var nav = document.getElementById("mnav");
  if (btn && nav) {
    var label = btn.querySelector(".mtxt");
    var setOpen = function (open) {
      nav.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (label) label.textContent = open ? T.close : T.menu;
    };
    btn.addEventListener("click", function () { setOpen(!nav.classList.contains("is-open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); btn.focus(); }
    });
  }

  /* 2. Atsiradimas slenkant */
  var els = document.querySelectorAll(".rv, .rv-up");
  if (reduce || !("IntersectionObserver" in window)) {
    els.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* 3. Aukščio liniuotė: slenkant puslapiu žymeklis kyla nuo pamatų (-1.20) iki kraigo (+9.60) */
  var mark = document.querySelector(".rail-m");
  if (mark) {
    var rail = mark.parentElement, tick = false;
    var maxY = function () { return Math.max(0, root.scrollHeight - window.innerHeight); };
    var upd = function () {
      tick = false;
      var max = maxY();
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      var v = -1.2 + p * 10.8;
      var txt = (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2);
      mark.style.top = (14 + p * (rail.clientHeight - 28)) + "px";
      mark.textContent = txt;
      rail.setAttribute("aria-valuenow", String(Math.round(p * 100)));
      rail.setAttribute("aria-valuetext", txt + " m");
    };
    window.addEventListener("scroll", function () { if (!tick) { tick = true; window.requestAnimationFrame(upd); } }, { passive: true });
    window.addEventListener("resize", upd);
    upd();

    /* Liniuotė kaip slankiklis: žymę galima tempti, paspaudimas ant juostos nušoka, veikia klaviatūra */
    var go = function (y, smooth) {
      y = Math.min(maxY(), Math.max(0, y));
      window.scrollTo({ top: y, left: window.scrollX, behavior: smooth && !reduce ? "smooth" : "auto" });
    };
    /* y koordinatė liniuotėje (nuo jos viršaus) paverčiama slinkimo dalimi 0..1 */
    var frac = function (cy) {
      var r = rail.getBoundingClientRect(), span = r.height - 28;
      return span > 0 ? Math.min(1, Math.max(0, (cy - r.top - 14) / span)) : 0;
    };
    var drag = null;
    rail.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      if (e.target === mark || mark.contains(e.target)) {
        var mr = mark.getBoundingClientRect();
        drag = { id: e.pointerId, off: e.clientY - (mr.top + mr.height / 2) };
        rail.classList.add("is-drag");
        try { rail.setPointerCapture(e.pointerId); } catch (err) { /* nieko */ }
      } else {
        go(frac(e.clientY) * maxY(), true);
      }
    });
    rail.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      e.preventDefault();
      go(frac(e.clientY - drag.off) * maxY(), false);
    });
    var stop = function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      rail.classList.remove("is-drag");
      try { rail.releasePointerCapture(e.pointerId); } catch (err) { /* nieko */ }
    };
    rail.addEventListener("pointerup", stop);
    rail.addEventListener("pointercancel", stop);
    rail.addEventListener("lostpointercapture", stop);
    rail.addEventListener("keydown", function (e) {
      var y = window.scrollY, page = window.innerHeight * 0.9, line = 60, to = null, smooth = true;
      switch (e.key) {
        case "ArrowDown": case "ArrowRight": to = y + line; smooth = false; break;
        case "ArrowUp": case "ArrowLeft": to = y - line; smooth = false; break;
        case "PageDown": to = y + page; break;
        case "PageUp": to = y - page; break;
        case "Home": to = 0; break;
        case "End": to = maxY(); break;
      }
      if (to === null) return;
      e.preventDefault();
      go(to, smooth);
    });
  }

  /* 4. Pastato pjūvis: paslaugų sąrašas ir brėžinio zonos susieti */
  var pj = document.querySelector(".pj");
  if (pj) {
    var svg = pj.querySelector(".pj-svg");
    var items = pj.querySelectorAll(".pj-list li");
    var zones = svg ? svg.querySelectorAll(".z") : [];
    var select = function (li) {
      items.forEach(function (it) {
        var on = it === li;
        it.classList.toggle("on", on);
        it.querySelector(".pj-btn").setAttribute("aria-expanded", on ? "true" : "false");
      });
      var want = li ? (li.getAttribute("data-z") || "").split(" ") : [];
      if (svg) svg.classList.toggle("has-on", want.length > 0);
      zones.forEach(function (z) { z.classList.toggle("on", want.indexOf(z.getAttribute("data-z")) !== -1); });
    };
    items.forEach(function (li) {
      var b = li.querySelector(".pj-btn");
      b.addEventListener("click", function () { select(li); });
      if (window.matchMedia && window.matchMedia("(hover: hover)").matches) b.addEventListener("mouseenter", function () { select(li); });
    });
    zones.forEach(function (z) {
      z.addEventListener("click", function () {
        var k = z.getAttribute("data-z");
        for (var i = 0; i < items.length; i++) if (items[i].getAttribute("data-z") === k) { select(items[i]); break; }
      });
    });
    if (items.length) select(items[0]);
  }

  /* 5. Užklausos forma: sudaro mailto nuorodą ir atidaro el. pašto programą. Nieko nesiunčiama į serverį. */
  var form = document.getElementById("uzklausa");
  var msg = document.getElementById("form-msg");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var hp = form.querySelector('[name="website"]');
      if (hp && hp.value) return; /* šlamšto spąstai */
      var name = form.querySelector('[name="vardas"],[name="name"]');
      var tel = form.querySelector('[name="telefonas"],[name="phone"]');
      if ((name && !name.value.trim()) || (tel && !tel.value.trim())) {
        if (msg) msg.textContent = T.need;
        (name && !name.value.trim() ? name : tel).focus();
        return;
      }
      var ok = form.querySelector('[name="sutikimas"]');
      if (ok && !ok.checked) { if (msg) msg.textContent = T.consent; ok.focus(); return; }
      var to = (form.getAttribute("action") || "").replace(/^mailto:/i, "");
      var service = "";
      var lines = [];
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.name === "website" || el.name === "sutikimas" || el.type === "submit" || el.type === "button") return;
        var value = String(el.value || "").trim();
        if (el.name === "paslauga" || el.name === "service") service = value;
        lines.push((el.getAttribute("data-label") || el.name) + ": " + (value || T.none));
      });
      var href = "mailto:" + to + "?subject=" + encodeURIComponent(T.subject + (service || T.none)) + "&body=" + encodeURIComponent(lines.join("\r\n"));
      form.setAttribute("data-mailto", href);
      if (msg) msg.textContent = T.msg + to + ".";
      /* data-dry-run naudojamas tik automatinėje patikroje: nuoroda sudaroma, bet pašto programa neatidaroma */
      if (!form.hasAttribute("data-dry-run")) window.location.href = href;
    });
  }
})();
