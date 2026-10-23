/* Pip & Flicker — landing page behaviour. Vanilla, deferred, optional: the page is complete without it.
   1. Gameplay loops: load only when near, play only while visible, pause button on each,
      no autoplay with Reduce Motion or Save-Data.
   2. Day arc: tells the sticky stage which phase is in the middle of the screen.
   3. Reveal-on-scroll fallback where CSS scroll timelines are missing.
   4. Friends reel previous / next buttons.
   5. Pause the hero's fireflies while the hero is off screen; the hero's pause button stops all the
      page's ambient motion (WCAG 2.2.2), remembered on this device.
   6. Language menu: Escape closes it and gives focus back, a click or focus elsewhere closes it.
   7. Scrolling strips are a tab stop only while they actually scroll.
   (The language-menu part also runs on the Privacy / Support / Terms / Accessibility pages.) */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var noAuto = function () { return mq.matches || saveData; };
  var hasIO = "IntersectionObserver" in window;

  /* 1 ── loops */
  var clips = [].slice.call(document.querySelectorAll(".clip"));
  clips.forEach(function (clip) {
    var v = clip.querySelector("video"), btn = clip.querySelector(".vbtn");
    if (!v || !btn) return;
    var loaded = false, userPaused = false, visible = false;
    function load() {
      if (loaded) return;
      loaded = true;
      (v.getAttribute("data-srcs") || "").split("|").forEach(function (pair) {
        var p = pair.split(" "), s = document.createElement("source");
        s.src = p[0]; s.type = p[1]; v.appendChild(s);
      });
      v.load();
    }
    function show(state) {
      btn.setAttribute("data-state", state);
      btn.setAttribute("aria-pressed", state === "paused" ? "false" : "true");   // a "Play video" toggle: pressed while it plays
    }
    function play() {
      load();
      var pr = v.play();
      if (pr && pr.catch) pr.catch(function () { show("paused"); });
    }
    v.addEventListener("playing", function () { clip.classList.add("playing"); show("playing"); });
    v.addEventListener("pause", function () { show("paused"); });
    btn.hidden = false;
    show("paused");
    btn.addEventListener("click", function () {
      if (v.paused) { userPaused = false; play(); } else { userPaused = true; v.pause(); }
    });
    if (!hasIO) return;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        visible = e.isIntersecting;
        if (visible && !userPaused && !noAuto() && !doc.classList.contains("still")) play();
        else if (!visible && !v.paused) v.pause();
      });
    }, { threshold: 0.35 }).observe(clip);
  });

  /* 1b ── swipe dots under the loops (phone) */
  var strip = document.querySelector(".clips"), dots = [].slice.call(document.querySelectorAll(".swipe-hint i"));
  if (strip && dots.length) {
    strip.addEventListener("scroll", function () {
      var max = strip.scrollWidth - strip.clientWidth, i = max > 0 ? Math.round(strip.scrollLeft / max * (dots.length - 1)) : 0;
      dots.forEach(function (d, k) { d.classList.toggle("on", k === i); });
    }, { passive: true });
  }

  /* 2 ── day arc */
  var stage = document.querySelector(".day-stage");
  var steps = [].slice.call(document.querySelectorAll(".day-step"));
  var ticks = [].slice.call(document.querySelectorAll(".rail li"));
  if (stage && steps.length && hasIO) {
    var setPhase = function (i) {
      stage.style.setProperty("--p", i);
      stage.setAttribute("data-phase", i);
      ticks.concat(steps).forEach(function (t) { var k = ticks.indexOf(t) >= 0 ? ticks.indexOf(t) : steps.indexOf(t); if (k === i) t.setAttribute("aria-current", "step"); else t.removeAttribute("aria-current"); });
    };
    var dio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) setPhase(steps.indexOf(e.target)); });
    }, { rootMargin: "-50% 0px -50% 0px" });
    steps.forEach(function (s) { dio.observe(s); });
  }

  /* 3 ── reveal fallback */
  var cssScroll = window.CSS && CSS.supports && CSS.supports("animation-timeline: view()");
  var reveals = [].slice.call(document.querySelectorAll(".reveal"));
  if (!cssScroll && hasIO && !mq.matches) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (r) { rio.observe(r); });
  } else {
    reveals.forEach(function (r) { r.classList.add("in"); });
  }

  /* 4 ── reel buttons (friends, tricksters) */
  [].slice.call(document.querySelectorAll(".reel-wrap")).forEach(function (wrap) {
  var reel = wrap.querySelector(".reel");
  var prev = wrap.querySelector(".reel-prev"), next = wrap.querySelector(".reel-next");
  if (reel && prev && next) {
    var step = function () { var li = reel.querySelector("li"); return li ? (li.getBoundingClientRect().width + 18) * 2 : 300; };
    var upd = function () {
      prev.disabled = reel.scrollLeft < 8;
      next.disabled = reel.scrollLeft + reel.clientWidth > reel.scrollWidth - 8;
    };
    prev.addEventListener("click", function () { reel.scrollBy({ left: -step(), behavior: mq.matches ? "auto" : "smooth" }); });
    next.addEventListener("click", function () { reel.scrollBy({ left: step(), behavior: mq.matches ? "auto" : "smooth" }); });
    reel.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", upd);
    upd();
  }
  });

  /* 5 ── hero idle when off screen */
  var hero = document.querySelector(".hero");
  if (hero && hasIO) {
    new IntersectionObserver(function (es) { hero.classList.toggle("off", !es[0].isIntersecting); }).observe(hero);
  }
  var still = document.querySelector(".still-btn");
  if (still) {
    var setStill = function (on, save) {
      doc.classList.toggle("still", on);
      still.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) clips.forEach(function (c) { var v = c.querySelector("video"); if (v && !v.paused) v.pause(); });
      if (save) { try { localStorage.setItem("pf-still", on ? "1" : "0"); } catch (e) {} }
    };
    var saved = null;
    try { saved = localStorage.getItem("pf-still"); } catch (e) {}
    setStill(saved === "1", false);
    still.hidden = false;
    still.addEventListener("click", function () { setStill(!doc.classList.contains("still"), true); });
  }

  /* 6 ── language menu */
  [].slice.call(document.querySelectorAll(".langmenu")).forEach(function (d) {
    var sum = d.querySelector("summary");
    d.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && d.open) { d.open = false; sum.focus(); e.preventDefault(); }
    });
    d.addEventListener("focusout", function (e) { if (d.open && e.relatedTarget && !d.contains(e.relatedTarget)) d.open = false; });
    document.addEventListener("click", function (e) { if (d.open && !d.contains(e.target)) d.open = false; });
  });

  /* 7 ── strips: a tab stop (to scroll with the arrow keys) only while they scroll */
  var strips = [].slice.call(document.querySelectorAll(".clips, .reel"));
  var tabs = function () { strips.forEach(function (el) { if (el.scrollWidth > el.clientWidth + 2) el.setAttribute("tabindex", "0"); else el.removeAttribute("tabindex"); }); };
  if (strips.length) { tabs(); window.addEventListener("resize", tabs); }
})();
