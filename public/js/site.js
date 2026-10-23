/* Pip & Flicker — landing page behaviour. Vanilla, deferred, optional: the page is complete without it.
   1. Gameplay loops: load only when near, play only while visible, pause button on each,
      no autoplay with Reduce Motion or Save-Data.
   2. Day arc: tells the sticky stage which phase is in the middle of the screen.
   3. Reveal-on-scroll fallback where CSS scroll timelines are missing.
   4. Friends reel previous / next buttons.
   5. Pause the hero's fireflies while the hero is off screen. */
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
    var labels = { pause: btn.getAttribute("data-pause"), play: btn.getAttribute("data-play") };
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
      btn.setAttribute("aria-label", state === "paused" ? labels.play : labels.pause);
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
        if (visible && !userPaused && !noAuto()) play();
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
      ticks.forEach(function (t, k) { if (k === i) t.setAttribute("aria-current", "step"); else t.removeAttribute("aria-current"); });
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

  /* 4 ── reel buttons */
  var reel = document.querySelector(".reel");
  var prev = document.querySelector(".reel-prev"), next = document.querySelector(".reel-next");
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

  /* 5 ── hero idle when off screen */
  var hero = document.querySelector(".hero");
  if (hero && hasIO) {
    new IntersectionObserver(function (es) { hero.classList.toggle("off", !es[0].isIntersecting); }).observe(hero);
  }
})();
