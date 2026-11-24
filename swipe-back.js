// Свайп вправо от левого края = «Назад» (v0.52).
// Работает на любом экране, где есть кнопка .back-button: экран едет за пальцем,
// после порога нажимается та же кнопка «Назад», что и сверху.
(function () {
  'use strict';
  var EDGE = 60;            // откуда можно начать жест, px от левого края
  var THRESHOLD = 0.33;     // доля ширины экрана, после которой срабатывает «Назад»
  var FLICK = 0.5;          // px/мс: быстрый рывок срабатывает и раньше порога
  var EASE = 'cubic-bezier(.23,1,.32,1)';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var s = null; // состояние жеста

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function backButton() {
    var list = document.querySelectorAll('main.content .back-button');
    for (var i = 0; i < list.length; i++) if (visible(list[i])) return list[i];
    return null;
  }
  function dialogOpen() {
    return !!document.querySelector('.dialog-backdrop, .dialog.panel');
  }
  function haptic() {
    try { window.Telegram.WebApp.HapticFeedback.impactOccurred('light'); } catch (e) {}
  }
  function setPos(el, x, animate) {
    var w = window.innerWidth;
    el.style.transition = animate ? 'transform .28s ' + EASE + ', opacity .28s ' + EASE : 'none';
    el.style.transform = x ? 'translate3d(' + x + 'px,0,0)' : '';
    el.style.opacity = x ? String(1 - 0.35 * Math.min(1, x / w)) : '';
    el.style.boxShadow = x ? '-12px 0 24px rgba(0,0,0,.45)' : '';
  }
  function cleanup(el) {
    el.style.transition = el.style.transform = el.style.opacity = el.style.boxShadow = el.style.willChange = '';
  }

  document.addEventListener('touchstart', function (e) {
    s = null;
    if (e.touches.length !== 1) return;
    var t = e.touches[0];
    if (t.clientX > EDGE || dialogOpen()) return;
    var btn = backButton();
    var page = btn && btn.closest('main.content');
    if (!page) return;
    s = { page: page, btn: btn, x0: t.clientX, y0: t.clientY, t0: Date.now(), dx: 0, locked: false, lastX: t.clientX, lastT: Date.now(), v: 0 };
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!s) return;
    var t = e.touches[0];
    var dx = t.clientX - s.x0, dy = t.clientY - s.y0;
    if (!s.locked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (dx <= 0 || Math.abs(dy) > Math.abs(dx)) { s = null; return; } // это прокрутка, не жест
      s.locked = true;
      s.page.style.willChange = 'transform';
    }
    e.preventDefault();
    var now = Date.now();
    s.v = (t.clientX - s.lastX) / Math.max(1, now - s.lastT);
    s.lastX = t.clientX; s.lastT = now;
    s.dx = Math.max(0, dx);
    if (!reduce) setPos(s.page, s.dx, false);
  }, { passive: false });

  function end() {
    if (!s || !s.locked) { s = null; return; }
    var g = s; s = null;
    var w = window.innerWidth;
    var go = g.dx > w * THRESHOLD || (g.v > FLICK && g.dx > 30);
    if (!go) {
      if (reduce) return cleanup(g.page);
      setPos(g.page, 0, true);
      setTimeout(function () { cleanup(g.page); }, 300);
      return;
    }
    haptic();
    function back() {
      cleanup(g.page);
      g.btn.click();
      if (reduce) return;
      // Новый экран чуть выезжает слева, как в iOS.
      requestAnimationFrame(function () {
        var next = document.querySelector('main.content');
        if (!next) return;
        next.style.transition = 'none';
        next.style.transform = 'translate3d(-24px,0,0)';
        next.style.opacity = '.6';
        requestAnimationFrame(function () {
          next.style.transition = 'transform .24s ' + EASE + ', opacity .24s ' + EASE;
          next.style.transform = '';
          next.style.opacity = '';
          setTimeout(function () { next.style.transition = ''; }, 260);
        });
      });
    }
    if (reduce) return back();
    setPos(g.page, w, true);
    setTimeout(back, 220);
  }
  document.addEventListener('touchend', end, { passive: true });
  document.addEventListener('touchcancel', function () {
    if (s && s.locked) { setPos(s.page, 0, true); var p = s.page; setTimeout(function () { cleanup(p); }, 300); }
    s = null;
  }, { passive: true });
})();
