/* ============================================================
   touch.js – Touch-Steuerung für Handy & Tablet
   Virtuelles Steuerkreuz (8 Richtungen) + A/B/Menü/Rennen
   ============================================================ */
(function (global) {

  const isTouch = /[?&]touch=1/.test(location.search) ||
    ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const DIRS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

  const el = {
    root: document.getElementById('touch'),
    pad: document.getElementById('pad'),
    stick: document.getElementById('stick'),
    a: document.getElementById('btnA'),
    bb: document.getElementById('btnB'),
    menu: document.getElementById('btnMenu'),
    run: document.getElementById('btnRun'),
    full: document.getElementById('btnFull')
  };

  if (!el.root) return;
  if (!isTouch) { el.root.style.display = 'none'; return; }

  /* ---------- Kein Zoom durch Doppeltippen oder Aufziehen ----------
     iOS ignoriert "user-scalable=no" im Viewport, darum wird das Zoomen
     hier zusätzlich abgefangen: zweimal schnell auf A (oder irgendwo
     sonst) tippen soll spielen und nicht die Seite heranzoomen.
     Knöpfe, die einen echten Klick brauchen (z. B. Vollbild), bleiben
     ausgenommen – sonst käme deren click-Ereignis nicht mehr an.        */
  function blockZoomGestures() {
    const NEEDS_CLICK = 'button, a, input, select, textarea';
    const DOUBLE_TAP_MS = 350;
    let lastTouchEnd = 0;

    document.addEventListener('touchend', e => {
      const now = Date.now();
      const keepsClick = e.target && e.target.closest && e.target.closest(NEEDS_CLICK);
      if (now - lastTouchEnd < DOUBLE_TAP_MS && !keepsClick) e.preventDefault();
      lastTouchEnd = now;
    }, { passive: false });

    // Nachzügler: Doppelklick (Maus wie synthetischer Touch-Klick)
    document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });

    // Safari: Aufziehen mit zwei Fingern
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(type => {
      document.addEventListener(type, e => e.preventDefault(), { passive: false });
    });

    // alle anderen: Pinch-Zoom ist immer ein Zwei-Finger-Wisch
    document.addEventListener('touchmove', e => {
      if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
  }

  blockZoomGestures();

  const active = { up: false, down: false, left: false, right: false };

  function setDir(d, on) {
    if (active[d] === on) return;
    active[d] = on;
    if (on) INPUT.press(DIRS[d]); else INPUT.release(DIRS[d]);
    el.pad.classList.toggle('d-' + d, on);
  }
  function clearDirs() { Object.keys(DIRS).forEach(d => setDir(d, false)); }

  /* ---------- Steuerkreuz: Richtung aus der Fingerposition ---------- */
  let padPointer = null;

  function updateFromPoint(clientX, clientY) {
    const r = el.pad.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = clientX - cx, dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    const dead = r.width * 0.16;

    if (len < dead) { clearDirs(); moveStick(0, 0); return; }

    // Winkel in 8 Sektoren: erlaubt saubere Diagonalen
    const ang = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    const sector = Math.round(ang / 45) % 8;
    const map = [
      ['right'], ['right', 'down'], ['down'], ['left', 'down'],
      ['left'], ['left', 'up'], ['up'], ['right', 'up']
    ][sector];
    Object.keys(DIRS).forEach(d => setDir(d, map.includes(d)));

    const max = r.width * 0.30;
    const k = Math.min(1, len / max);
    moveStick(dx / len * max * k, dy / len * max * k);
  }
  function moveStick(x, y) {
    el.stick.style.transform = 'translate(-50%,-50%) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
  }

  el.pad.addEventListener('pointerdown', e => {
    padPointer = e.pointerId;
    try { el.pad.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
    updateFromPoint(e.clientX, e.clientY);
    e.preventDefault();
  });
  el.pad.addEventListener('pointermove', e => {
    if (padPointer !== e.pointerId) return;
    updateFromPoint(e.clientX, e.clientY);
    e.preventDefault();
  });
  const padEnd = e => {
    if (padPointer !== e.pointerId) return;
    padPointer = null; clearDirs(); moveStick(0, 0);
  };
  el.pad.addEventListener('pointerup', padEnd);
  el.pad.addEventListener('pointercancel', padEnd);
  el.pad.addEventListener('lostpointercapture', padEnd);

  /* ---------- Aktionstasten ---------- */
  function bindButton(node, code, opts) {
    if (!node) return;
    opts = opts || {};
    node.addEventListener('pointerdown', e => {
      e.preventDefault();
      node.classList.add('down');
      if (opts.toggle) {
        const on = !node.classList.contains('on');
        node.classList.toggle('on', on);
        if (on) INPUT.press(code); else INPUT.release(code);
      } else {
        INPUT.press(code);
      }
      if (navigator.vibrate) navigator.vibrate(8);
    });
    const up = e => {
      if (e) e.preventDefault();
      node.classList.remove('down');
      if (!opts.toggle) INPUT.release(code);
    };
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    node.addEventListener('pointerleave', up);
  }

  bindButton(el.a, 'Enter');
  bindButton(el.bb, 'Escape');
  bindButton(el.menu, 'Escape');
  bindButton(el.run, 'ShiftLeft', { toggle: true });

  /* ---------- Tippen aufs Spielfeld = OK ---------- */
  const cv = document.getElementById('game');
  let tapStart = null;
  cv.addEventListener('pointerdown', e => { tapStart = { x: e.clientX, y: e.clientY, t: Date.now() }; });
  cv.addEventListener('pointerup', e => {
    if (!tapStart) return;
    const moved = Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y);
    const quick = Date.now() - tapStart.t < 400;
    tapStart = null;
    if (moved < 14 && quick) {
      INPUT.press('Enter');
      setTimeout(() => INPUT.release('Enter'), 60);
    }
  });

  /* ---------- Vollbild ---------- */
  if (el.full) {
    el.full.addEventListener('click', () => {
      const d = document.documentElement;
      if (!document.fullscreenElement) {
        (d.requestFullscreen || d.webkitRequestFullscreen || function () {}).call(d);
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => {});
        }
      } else {
        (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
      }
    });
  }

  // Sicherheitsnetz: verlässt der Finger die Seite, keine hängenden Tasten
  window.addEventListener('blur', () => { clearDirs(); INPUT.releaseAll(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearDirs(); INPUT.releaseAll(); }
  });

  // Layout neu berechnen, jetzt wo die Steuerung existiert
  setTimeout(() => window.dispatchEvent(new Event('resize')), 0);

  global.TOUCH = {
    layout(cssW, cssH, mode) {
      el.root.classList.toggle('side', mode === 'side');
      document.body.classList.toggle('sidemode', mode === 'side');
      el.root.style.setProperty('--gameW', cssW + 'px');
      el.root.style.setProperty('--gameH', cssH + 'px');
    }
  };

})(window);
