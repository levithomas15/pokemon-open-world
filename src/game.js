/* ============================================================
   game.js – Spielschleife, Rendering, Overworld, Menüs
   ============================================================ */
(function () {

  const VW = 320, VH = 180;          // interne Pixel-Auflösung
  const TS = WORLD.TS;
  const T = WORLD.T;
  const SAVE_KEY = 'pkmn_openworld_save_v1';

  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d');
  const buf = document.createElement('canvas');
  buf.width = VW; buf.height = VH;
  const b = buf.getContext('2d');
  b.imageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;

  /* ---------------- Layout: Desktop, Handy, Tablet ---------------- */
  // ?touch=1 erzwingt die Touch-Oberfläche (praktisch zum Testen am Desktop)
  const isTouch = /[?&]touch=1/.test(location.search) ||
    ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  document.body.classList.toggle('touch', isTouch);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const portrait = h > w;
    document.body.classList.toggle('portrait', portrait);
    document.body.classList.toggle('landscape', !portrait);

    let cssW, cssH, mode = 'below';
    if (!isTouch) {
      const s = Math.min(w / VW, (h - 22) / VH);
      cssW = VW * s; cssH = VH * s;
    } else if (portrait) {
      // Hochkant: Spielfeld oben, darunter der Platz für die Steuerung
      cssW = w;
      cssH = cssW * VH / VW;
      const maxH = h * 0.52;
      if (cssH > maxH) { cssH = maxH; cssW = cssH * VW / VH; }
    } else {
      // Querformat: bleibt unter dem Bild genug Platz (Tablet), steht die
      // Steuerung darunter – sonst links und rechts daneben (Handy quer).
      const sFull = Math.min(w / VW, h / VH);
      if (h - VH * sFull >= 130) {
        const s = Math.min(w / VW, (h - 150) / VH);
        cssW = VW * s; cssH = VH * s;
      } else {
        mode = 'side';
        const sideW = Math.min(150, Math.max(88, w * 0.17));
        const s = Math.min((w - 2 * sideW) / VW, h / VH);
        cssW = VW * s; cssH = VH * s;
      }
    }
    cssW = Math.floor(cssW); cssH = Math.floor(cssH);

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = cssW + 'px';
    cv.style.height = cssH + 'px';
    cv.width = Math.round(cssW * dpr);
    cv.height = Math.round(cssH * dpr);
    ctx.imageSmoothingEnabled = false;
    if (window.TOUCH && window.TOUCH.layout) window.TOUCH.layout(cssW, cssH, mode);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 120));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);

  /* ---------------- Eingabe ---------------- */
  const keys = {};
  let pressedQueue = [];
  const BLOCK = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Escape', 'Tab'];
  window.addEventListener('keydown', e => {
    if (!keys[e.code]) pressedQueue.push(e.code);
    keys[e.code] = true;
    if (BLOCK.includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  // Schnittstelle für die Touch-Steuerung (src/touch.js)
  window.INPUT = {
    press(code) { if (!keys[code]) pressedQueue.push(code); keys[code] = true; },
    release(code) { keys[code] = false; },
    releaseAll() { for (const k in keys) keys[k] = false; },
    isDown(code) { return !!keys[code]; },
    state() { return G.state; }
  };

  let P = new Set();
  const hit = (...codes) => codes.some(c => P.has(c));
  // Nach einem Bildschirmwechsel darf derselbe Tastendruck nicht erneut wirken
  function clearInput() { P = new Set(); pressedQueue = []; }
  const OK = () => hit('Enter', 'Space', 'KeyE');
  const BACK = () => hit('Escape', 'Backspace', 'KeyQ');
  const UP = () => hit('ArrowUp', 'KeyW');
  const DOWN = () => hit('ArrowDown', 'KeyS');
  const LEFT = () => hit('ArrowLeft', 'KeyA');
  const RIGHT = () => hit('ArrowRight', 'KeyD');

  /* ---------------- Spielzustand ---------------- */
  const G = {
    state: 'title',
    seed: 12345,
    regions: [null, null, null],
    regionIdx: 0,
    x: 0, y: 0, dir: 'down', walkAnim: 0, step: 0, moving: false,
    party: [], box: [], activeIdx: 0,
    bag: {}, dex: {},
    respawn: { region: 0, x: 0, y: 0 },
    takenItems: [[], [], []],
    unlocked: 1,
    ambushT: 0,
    playtime: 0,
    battle: null,
    msg: null,
    menuIdx: 0, subIdx: 0, subScroll: 0,
    starterIdx: 1,
    fade: 0, fadeDir: 0, fadeCb: null,
    time: 0,
    encounterCooldown: 0,
    titleIdx: 0,
    notice: null, noticeT: 0,
    inputLock: 0, stepsSinceBattle: 0
  };
  window.G = G;

  function region() {
    if (!G.regions[G.regionIdx]) G.regions[G.regionIdx] = WORLD.generate(G.regionIdx, G.seed);
    return G.regions[G.regionIdx];
  }
  // billiger Hash für Tile-Varianten (kein Closure pro Tile/Frame)
  function tileHash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function tileAt(tx, ty) {
    const r = region();
    if (tx < 0 || ty < 0 || tx >= r.W || ty >= r.H) return T.DEEP;
    return r.tiles[ty * r.W + tx];
  }
  const solidAt = (tx, ty) => !!WORLD.SOLID[tileAt(tx, ty)];

  /* ---------------- Zeichen-Helfer ---------------- */
  function text(s, x, y, col, size, align) {
    b.font = (size || 8) + 'px "Courier New", monospace';
    b.textBaseline = 'top';
    b.textAlign = align || 'left';
    b.fillStyle = col || '#2a2440';
    b.fillText(s, Math.round(x), Math.round(y));
    b.textAlign = 'left';
  }
  function textW(s, size) {
    b.font = (size || 8) + 'px "Courier New", monospace';
    return b.measureText(s).width;
  }
  function shadowText(s, x, y, col, size, align) {
    text(s, x + 1, y + 1, '#1a1626', size, align);
    text(s, x, y, col, size, align);
  }
  function box(x, y, w, h, fill, border) {
    b.fillStyle = border || '#2a2440';
    b.fillRect(x, y, w, h);
    b.fillStyle = fill || '#f8f4e8';
    b.fillRect(x + 2, y + 2, w - 4, h - 4);
    b.fillStyle = border || '#2a2440';
    b.fillRect(x + 3, y + 3, w - 6, 1);
    b.fillRect(x + 3, y + h - 4, w - 6, 1);
    b.fillRect(x + 3, y + 3, 1, h - 6);
    b.fillRect(x + w - 4, y + 3, 1, h - 6);
    b.fillStyle = fill || '#f8f4e8';
    b.fillRect(x + 4, y + 4, w - 8, h - 8);
  }
  function bar(x, y, w, h, pct, col, bg) {
    b.fillStyle = '#2a2440'; b.fillRect(x - 1, y - 1, w + 2, h + 2);
    b.fillStyle = bg || '#585070'; b.fillRect(x, y, w, h);
    b.fillStyle = col; b.fillRect(x, y, Math.max(0, Math.round(w * pct)), h);
    b.fillStyle = 'rgba(255,255,255,.25)'; b.fillRect(x, y, Math.max(0, Math.round(w * pct)), 1);
  }
  function hpColor(p) { return p > .5 ? '#54d060' : p > .2 ? '#f0c030' : '#e04848'; }

  function wrap(s, maxW, size) {
    const words = s.split(' ');
    const lines = []; let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (textW(test, size) > maxW && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function typeChip(t, x, y) {
    const w = textW(DATA.TYPE_NAME[t], 6) + 6;
    b.fillStyle = DATA.TYPE_COLOR[t]; b.fillRect(x, y, w, 9);
    b.fillStyle = 'rgba(0,0,0,.25)'; b.fillRect(x, y + 7, w, 2);
    text(DATA.TYPE_NAME[t], x + 3, y + 2, '#ffffff', 6);
    return w + 3;
  }

  /* ---------------- Spielstart / Speichern ---------------- */
  function newGame(starterKey) {
    G.seed = Math.floor(Math.random() * 1e9);
    G.regions = [null, null, null];
    G.regionIdx = 0;
    G.party = [BATTLE.makeMon(starterKey, 5)];
    G.box = []; G.activeIdx = 0;
    G.bag = { ball: 10, trank: 3, beere: 2 };
    G.dex = {}; G.dex[starterKey] = 2;
    G.takenItems = [[], [], []];
    G.unlocked = 1;
    G.playtime = 0;
    const r = region();
    G.x = r.spawn.x * TS + TS / 2;
    G.y = r.spawn.y * TS + TS / 2;
    G.respawn = { region: 0, x: r.spawn.x, y: r.spawn.y };
    G.state = 'world';
    showMsg([
      'Willkommen in der offenen Welt!',
      DATA.REGIONS[0].name + ' – ' + DATA.REGIONS[0].hint,
      'Im hohen Gras lauern wilde Pokémon. Halte Abstand ... oder such sie!',
      'Weiße Heilsteine heilen dein Team. Das lila Tor im Osten führt in die nächste Region.'
    ]);
    save();
  }

  function serialize() {
    const smon = m => ({
      k: m.key, l: m.lvl, e: m.exp, h: m.hp, n: m.nick || null,
      s: m.status, mv: m.moves.map(x => [x.name, x.ap])
    });
    return {
      seed: G.seed, region: G.regionIdx, x: G.x, y: G.y, dir: G.dir,
      party: G.party.map(smon), box: G.box.map(smon), active: G.activeIdx,
      bag: G.bag, dex: G.dex, respawn: G.respawn, taken: G.takenItems,
      unlocked: G.unlocked, playtime: G.playtime
    };
  }
  function deserializeMon(o) {
    const m = BATTLE.makeMon(o.k, o.l);
    m.exp = o.e; m.hp = o.h; m.nick = o.n; m.status = o.s || null;
    if (o.mv && o.mv.length) {
      m.moves = o.mv.filter(x => DATA.MOVES[x[0]]).map(x => ({
        name: x[0], ap: x[1], apMax: DATA.MOVES[x[0]].ap
      }));
      if (!m.moves.length) m.moves = [{ name: 'Tackle', ap: 35, apMax: 35 }];
    }
    BATTLE.recalc(m);
    m.hp = Math.min(m.hp, m.maxhp);
    return m;
  }
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(serialize()));
      notify('Spiel gespeichert.');
    } catch (e) { notify('Speichern fehlgeschlagen!'); }
  }
  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!d) return false;
      G.seed = d.seed; G.regions = [null, null, null];
      G.regionIdx = d.region || 0;
      G.party = d.party.map(deserializeMon);
      G.box = (d.box || []).map(deserializeMon);
      G.activeIdx = Math.min(d.active || 0, G.party.length - 1);
      G.bag = d.bag || {}; G.dex = d.dex || {};
      G.respawn = d.respawn || { region: 0, x: 0, y: 0 };
      G.takenItems = d.taken || [[], [], []];
      G.unlocked = d.unlocked || 1;
      G.playtime = d.playtime || 0;
      region();
      G.x = d.x; G.y = d.y; G.dir = d.dir || 'down';
      G.state = 'world';
      return true;
    } catch (e) { return false; }
  }

  function notify(t) { G.notice = t; G.noticeT = 2.2; }

  function showMsg(lines) {
    G.msg = { lines: Array.isArray(lines) ? lines.slice() : [lines], i: 0 };
  }

  /* ---------------- Begegnungen ---------------- */
  function rollWild(kind) {
    const r = region();
    const cfg = r.cfg;
    const roll = Math.random();
    let pool, tier;
    if (roll < cfg.ultraChance) { pool = cfg.ultra; tier = 2; }
    else if (roll < cfg.ultraChance + cfg.rareChance) { pool = cfg.rare; tier = 1; }
    else { pool = cfg.common; tier = 0; }
    const key = pool[Math.floor(Math.random() * pool.length)];
    let lo = cfg.lvl[0], hi = cfg.lvl[1];
    if (kind === 'ambush') hi = Math.min(hi, lo + 3);
    if (tier === 2) { lo += 2; hi += 3; }
    const lvl = lo + Math.floor(Math.random() * (hi - lo + 1));
    return { key, lvl, tier };
  }

  function startEncounter(kind) {
    if (!G.party.some(m => m.hp > 0)) return;
    const w = rollWild(kind);
    const enemy = BATTLE.makeMon(w.key, w.lvl);
    if (!G.dex[w.key]) G.dex[w.key] = 1;
    if (G.party[G.activeIdx].hp <= 0) {
      G.activeIdx = G.party.findIndex(m => m.hp > 0);
    }
    BATTLE.resetStages(G.party[G.activeIdx]);
    const B = BATTLE.newBattle(G, enemy, 'wild');
    B.tier = w.tier;
    B.intro = kind;
    G.battle = B;
    G.state = 'battle';
    G.encounterCooldown = 1.2;

    if (kind === 'ambush') BATTLE.say(B, 'Aus dem Nichts springt dich ein wildes ' + enemy.name + ' an!');
    else if (kind === 'bush') BATTLE.say(B, 'Etwas raschelt im Busch ... ein wildes ' + enemy.name + ' greift an!');
    else BATTLE.say(B, 'Ein wildes ' + enemy.name + ' erscheint!');
    if (w.tier === 1) BATTLE.say(B, 'Das sieht selten aus!');
    if (w.tier === 2) BATTLE.say(B, 'Unglaublich – das ist extrem selten!!');
    BATTLE.say(B, 'Los, ' + G.party[G.activeIdx].name + '!');
    BATTLE.act(B, () => { B.phase = 'menu'; });
    B.phase = 'msg';
    BATTLE.pump(B);
  }

  function blackout() {
    G.party.forEach(m => { m.hp = m.maxhp; m.status = null; m.moves.forEach(mv => mv.ap = mv.apMax); });
    G.regionIdx = G.respawn.region;
    region();
    G.x = G.respawn.x * TS + TS / 2;
    G.y = G.respawn.y * TS + TS / 2;
    G.activeIdx = 0;
    showMsg(['Du hast keine kampffähigen Pokémon mehr ...',
      'Du wachst am letzten Heilstein auf. Dein Team wurde vollständig geheilt.']);
    save();
  }

  /* ---------------- Overworld-Update ---------------- */
  function updateWorld(dt) {
    if (G.msg) {
      if (OK() || BACK()) {
        G.msg.i++;
        if (G.msg.i >= G.msg.lines.length) G.msg = null;
      }
      return;
    }
    if (BACK()) { G.state = 'menu'; G.menuIdx = 0; return; }

    const run = keys.ShiftLeft || keys.ShiftRight;
    const spd = (run ? 112 : 64) * dt;
    let dx = 0, dy = 0;
    if (keys.ArrowLeft || keys.KeyA) dx -= 1;
    if (keys.ArrowRight || keys.KeyD) dx += 1;
    if (keys.ArrowUp || keys.KeyW) dy -= 1;
    if (keys.ArrowDown || keys.KeyS) dy += 1;
    if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }

    G.moving = !!(dx || dy);
    if (dx < 0) G.dir = 'left'; else if (dx > 0) G.dir = 'right';
    else if (dy < 0) G.dir = 'up'; else if (dy > 0) G.dir = 'down';

    const oldTx = Math.floor(G.x / TS), oldTy = Math.floor(G.y / TS);

    // Kollision achsenweise
    const HW = 5, HT = 2, HB = 7;
    function canBe(nx, ny) {
      const pts = [
        [nx - HW, ny - HT], [nx + HW, ny - HT],
        [nx - HW, ny + HB], [nx + HW, ny + HB]
      ];
      return pts.every(p => !solidAt(Math.floor(p[0] / TS), Math.floor(p[1] / TS)));
    }
    if (dx) { const nx = G.x + dx * spd; if (canBe(nx, G.y)) G.x = nx; }
    if (dy) { const ny = G.y + dy * spd; if (canBe(G.x, ny)) G.y = ny; }

    if (G.moving) {
      G.walkAnim += dt * (run ? 11 : 7);
      G.step = (Math.floor(G.walkAnim) % 4);
      G.step = G.step === 1 ? 1 : G.step === 3 ? 2 : 0;
    } else { G.walkAnim = 0; G.step = 0; }

    G.encounterCooldown = Math.max(0, G.encounterCooldown - dt);

    // Zufalls-Überfall: alle 30 Sekunden 1:40
    G.ambushT += dt;
    if (G.ambushT >= 30) {
      G.ambushT = 0;
      if (G.encounterCooldown <= 0 && Math.random() < 1 / 40) { startEncounter('ambush'); return; }
    }

    const tx = Math.floor(G.x / TS), ty = Math.floor(G.y / TS);
    if (tx !== oldTx || ty !== oldTy) onEnterTile(tx, ty);
  }

  function onEnterTile(tx, ty) {
    const r = region();
    const t = tileAt(tx, ty);

    // Item aufsammeln
    for (let i = 0; i < r.items.length; i++) {
      const it = r.items[i];
      if (it.x === tx && it.y === ty && !G.takenItems[G.regionIdx].includes(i)) {
        G.takenItems[G.regionIdx].push(i);
        G.bag[it.item] = (G.bag[it.item] || 0) + 1;
        showMsg(['Du findest ' + DATA.ITEMS[it.item].name + '!']);
        return;
      }
    }

    if (t === T.SHRINE) {
      G.party.forEach(m => { m.hp = m.maxhp; m.status = null; m.moves.forEach(mv => mv.ap = mv.apMax); });
      G.respawn = { region: G.regionIdx, x: tx, y: ty };
      showMsg(['Der Heilstein leuchtet auf.', 'Dein Team ist wieder vollständig geheilt!']);
      save();
      return;
    }

    if (t === T.GATE) {
      const gate = r.gates.find(g => g.x === tx && g.y === ty);
      if (!gate) return;
      if (gate.to < 0) { showMsg(['Hinter dem Tor liegt nur endloser Nebel.']); return; }
      if (gate.to > 2) { showMsg(['Dieses Tor ist versiegelt. Weiter geht es nicht.']); return; }
      travelTo(gate.to, gate.side);
      return;
    }

    if (G.encounterCooldown > 0) return;

    if (t === T.BUSH) {
      if (Math.random() < 0.11) { startEncounter('grass'); return; }
    } else {
      // "zu nah am Busch": Nachbarfelder prüfen
      let near = 0;
      for (let y = -1; y <= 1; y++)
        for (let x = -1; x <= 1; x++)
          if (tileAt(tx + x, ty + y) === T.BUSH) near++;
      if (near > 0 && Math.random() < 0.015 * near) { startEncounter('bush'); return; }
    }
  }

  function travelTo(idx, fromSide) {
    fadeOut(() => {
      G.regionIdx = idx;
      if (G.unlocked < idx + 1) G.unlocked = idx + 1;
      const r = region();
      // von Westen kommend -> beim Westtor der neuen Region starten
      const side = fromSide === 'e' ? 'w' : 'e';
      const gate = r.gates.find(g => g.side === side) || { x: r.spawn.x, y: r.spawn.y };
      G.x = (gate.x + (side === 'w' ? 2 : -2)) * TS + TS / 2;
      G.y = gate.y * TS + TS / 2;
      G.respawn = { region: idx, x: gate.x, y: gate.y + 1 };
      G.encounterCooldown = 2;
      const cfg = DATA.REGIONS[idx];
      showMsg(['Region ' + cfg.num + ': ' + cfg.name,
        cfg.hint,
        'Seltene Pokémon: ' + Math.round((cfg.rareChance + cfg.ultraChance) * 100) + '% Chance pro Begegnung.']);
      save();
    });
  }

  function fadeOut(cb) { G.fadeDir = 1; G.fadeCb = cb; }

  /* ---------------- Overworld-Rendering ---------------- */
  function drawWorld() {
    const r = region();
    const camX = Math.max(0, Math.min(r.W * TS - VW, Math.round(G.x - VW / 2)));
    const camY = Math.max(0, Math.min(r.H * TS - VH, Math.round(G.y - VH / 2)));
    const t0x = Math.floor(camX / TS), t0y = Math.floor(camY / TS);
    const wf = Math.floor(G.time * 3.5) % 3;

    b.fillStyle = r.theme.deep;
    b.fillRect(0, 0, VW, VH);

    for (let ty = t0y; ty <= t0y + Math.ceil(VH / TS); ty++) {
      for (let tx = t0x; tx <= t0x + Math.ceil(VW / TS); tx++) {
        if (tx < 0 || ty < 0 || tx >= r.W || ty >= r.H) continue;
        const id = r.tiles[ty * r.W + tx];
        const set = r.tileset[id];
        if (!set) continue;
        let img;
        if (id === T.WATER || id === T.DEEP) img = set[wf];
        else img = set[Math.floor(tileHash(tx, ty) * set.length) % set.length];
        b.drawImage(img, tx * TS - camX, ty * TS - camY);
      }
    }

    // Items am Boden
    for (let i = 0; i < r.items.length; i++) {
      const it = r.items[i];
      if (G.takenItems[G.regionIdx].includes(i)) continue;
      const sx = it.x * TS - camX, sy = it.y * TS - camY;
      if (sx < -16 || sy < -16 || sx > VW || sy > VH) continue;
      const bob = Math.sin(G.time * 3 + i) * 1;
      drawItemIcon(sx + 4, sy + 4 + bob, it.item);
    }

    // Spieler
    const pxs = Math.round(G.x - 8 - camX), pys = Math.round(G.y - 12 - camY);
    b.fillStyle = 'rgba(0,0,0,.22)';
    b.beginPath(); b.ellipse(pxs + 8, pys + 15, 5, 2.5, 0, 0, 7); b.fill();
    SPR.drawTrainer(b, pxs, pys, G.dir, G.moving ? G.step : 0, 1);

    // Gras vor den Füßen
    const ftx = Math.floor(G.x / TS), fty = Math.floor(G.y / TS);
    if (tileAt(ftx, fty) === T.BUSH) {
      const set = r.tileset[T.BUSH];
      const img = set[Math.floor(WORLD.mulberry32(ftx * 7919 + fty * 104729)() * set.length)];
      b.drawImage(img, 0, 8, 16, 8, ftx * TS - camX, fty * TS - camY + 8, 16, 8);
    }

    drawWorldHUD(r);

    if (G.msg) drawDialog(G.msg.lines[G.msg.i]);
  }

  function drawItemIcon(x, y, key) {
    const it = DATA.ITEMS[key];
    if (it.kind === 'ball') {
      const col = key === 'ball' ? '#e04848' : key === 'superball' ? '#4878e0' : '#f0c030';
      b.fillStyle = '#2a2440'; b.fillRect(x, y + 1, 8, 7);
      b.fillStyle = col; b.fillRect(x + 1, y + 1, 6, 3);
      b.fillStyle = '#f0f0f0'; b.fillRect(x + 1, y + 5, 6, 2);
      b.fillStyle = '#2a2440'; b.fillRect(x + 1, y + 4, 6, 1);
      b.fillStyle = '#f8f8f8'; b.fillRect(x + 3, y + 4, 2, 1);
    } else if (it.kind === 'heal') {
      b.fillStyle = '#2a2440'; b.fillRect(x + 1, y, 6, 9);
      b.fillStyle = key === 'trank' ? '#f0a0c0' : '#f06060'; b.fillRect(x + 2, y + 2, 4, 6);
      b.fillStyle = '#e8e8f0'; b.fillRect(x + 2, y, 4, 2);
    } else {
      b.fillStyle = '#2a2440'; b.fillRect(x + 1, y + 2, 6, 6);
      b.fillStyle = '#e878a0'; b.fillRect(x + 2, y + 3, 4, 4);
      b.fillStyle = '#5fbb4a'; b.fillRect(x + 3, y, 2, 3);
    }
  }

  function drawWorldHUD(r) {
    // Regionsname
    const label = 'REG ' + r.cfg.num + ' · ' + r.cfg.name;
    const w = textW(label, 6) + 10;
    b.fillStyle = 'rgba(26,22,38,.72)'; b.fillRect(3, 3, w, 12);
    text(label, 8, 6, '#f8f4e8', 6);

    // Minimap
    const mm = r.minimap;
    const MW = 54, MH = 54;
    const mx = VW - MW - 4, my = 4;
    b.fillStyle = '#1a1626'; b.fillRect(mx - 2, my - 2, MW + 4, MH + 4);
    const px = G.x / TS / r.W, py = G.y / TS / r.H;
    const srcW = mm.width * (MW / (r.W / 2)) / (MW / MW);
    // Ausschnitt der Minimap um den Spieler (Zoom 2x)
    const viewT = 96;                       // sichtbare Tiles
    const sw = viewT / 2, sh = viewT / 2;   // Minimap-Pixel (1px = 2 Tiles)
    let sx = px * mm.width - sw / 2, sy = py * mm.height - sh / 2;
    sx = Math.max(0, Math.min(mm.width - sw, sx));
    sy = Math.max(0, Math.min(mm.height - sh, sy));
    b.drawImage(mm, sx, sy, sw, sh, mx, my, MW, MH);
    // Spielerpunkt
    const ppx = mx + (px * mm.width - sx) * (MW / sw);
    const ppy = my + (py * mm.height - sy) * (MH / sh);
    b.fillStyle = '#ffffff'; b.fillRect(Math.round(ppx) - 1, Math.round(ppy) - 1, 3, 3);
    b.fillStyle = '#e04848'; b.fillRect(Math.round(ppx), Math.round(ppy), 1, 1);
    b.strokeStyle = '#f8f4e8'; b.lineWidth = 1;
    b.strokeRect(mx - 1.5, my - 1.5, MW + 3, MH + 3);

    // Team-Kurzanzeige
    const py0 = VH - 16;
    for (let i = 0; i < G.party.length; i++) {
      const m = G.party[i];
      const x = 4 + i * 22;
      b.fillStyle = 'rgba(26,22,38,.72)'; b.fillRect(x, py0, 20, 12);
      const p = m.hp / m.maxhp;
      b.fillStyle = m.hp <= 0 ? '#585070' : hpColor(p);
      b.fillRect(x + 2, py0 + 8, Math.round(16 * Math.max(0, p)), 2);
      text(m.name.slice(0, 3).toUpperCase(), x + 3, py0 + 1, i === G.activeIdx ? '#ffe070' : '#f8f4e8', 6);
    }

    if (G.notice && G.noticeT > 0) {
      const nw = textW(G.notice, 6) + 12;
      b.fillStyle = 'rgba(26,22,38,.85)';
      b.fillRect((VW - nw) / 2, VH - 34, nw, 13);
      text(G.notice, VW / 2, VH - 31, '#ffe070', 6, 'center');
    }
  }

  function drawDialog(line) {
    box(4, VH - 50, VW - 8, 46);
    const lines = wrap(line, VW - 28, 8);
    lines.slice(0, 3).forEach((l, i) => text(l, 14, VH - 42 + i * 11, '#2a2440', 8));
    if (Math.floor(G.time * 3) % 2 === 0) text('▼', VW - 18, VH - 16, '#2a2440', 8);
  }

  /* ---------------- Kampf-Rendering ---------------- */
  function drawBattle() {
    const B = G.battle;
    const r = region();
    const me = G.party[G.activeIdx];
    const en = B.enemy;
    const th = r.theme;

    const shakeX = B.shake > 0 ? (Math.random() * 4 - 2) : 0;
    b.save();
    b.translate(Math.round(shakeX), 0);

    // Hintergrund
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      b.fillStyle = SPR.shade(th.sky1, t * .5);
      b.fillRect(0, i * 6, VW, 6);
    }
    b.fillStyle = th.sky2; b.fillRect(0, 72, VW, 12);
    b.fillStyle = th.ground; b.fillRect(0, 84, VW, VH - 84);
    b.fillStyle = th.ground2; b.fillRect(0, 84, VW, 3);
    for (let i = 0; i < 40; i++) {
      const rr = WORLD.mulberry32(i * 313)();
      b.fillStyle = SPR.shade(th.ground, -.1);
      b.fillRect(Math.floor(rr * VW), 88 + Math.floor(WORLD.mulberry32(i * 71)() * 34), 2, 1);
    }
    // Plattformen
    b.fillStyle = SPR.shade(th.ground, -.18);
    b.beginPath(); b.ellipse(248, 82, 46, 10, 0, 0, 7); b.fill();
    b.beginPath(); b.ellipse(74, 124, 54, 12, 0, 0, 7); b.fill();
    b.fillStyle = SPR.shade(th.ground, -.06);
    b.beginPath(); b.ellipse(248, 80, 44, 8, 0, 0, 7); b.fill();
    b.beginPath(); b.ellipse(74, 122, 52, 10, 0, 0, 7); b.fill();

    // Gegner
    const eSp = DATA.SPECIES[en.key];
    const eBob = Math.sin(G.time * 2) * 1.5;
    if (!B.caught || B.ballAnim > 0) {
      b.save();
      if (B.flashEnemy > 0 && Math.floor(G.time * 30) % 2 === 0) b.globalAlpha = .35;
      if (B.caught) b.globalAlpha = Math.max(0, 1 - B.ballAnim * 0);
      SPR.drawMon(b, eSp.tmpl, eSp.pal, 216, 20 + eBob, 4, false);
      b.restore();
    }
    // Eigenes Pokémon
    if (me && me.hp > 0) {
      const mSp = DATA.SPECIES[me.key];
      b.save();
      if (B.flashPlayer > 0 && Math.floor(G.time * 30) % 2 === 0) b.globalAlpha = .35;
      SPR.drawMon(b, mSp.tmpl, mSp.pal, 40, 58, 4, true);
      b.restore();
    }
    // Ball-Animation
    if (B.ballAnim > 0) {
      const t = 1 - B.ballAnim;
      const bx = 60 + (188 - 60) * Math.min(1, t * 2);
      const by = 90 - Math.sin(Math.min(1, t * 2) * Math.PI) * 50 + t * 20;
      drawItemIcon(bx, by, 'ball');
    }

    // Gegner-Statusbox
    box(6, 8, 148, 30);
    text(en.name, 12, 12, '#2a2440', 8);
    text('Lv' + en.lvl, 148 - 4, 12, '#2a2440', 8, 'right');
    bar(12, 26, 118, 4, en.hp / en.maxhp, hpColor(en.hp / en.maxhp));
    if (en.status) {
      b.fillStyle = en.status === 'psn' ? '#a040a0' : '#f0c030';
      b.fillRect(12, 21, 16, 6);
      text(en.status === 'psn' ? 'GFT' : 'PAR', 13, 21, '#ffffff', 6);
    }

    // Eigene Statusbox
    if (me) {
      box(168, 76, 146, 40);
      text(me.name, 174, 80, '#2a2440', 8);
      text('Lv' + me.lvl, 308, 80, '#2a2440', 8, 'right');
      bar(196, 94, 106, 4, me.hp / me.maxhp, hpColor(me.hp / me.maxhp));
      text('KP', 176, 92, '#2a2440', 6);
      text(me.hp + '/' + me.maxhp, 308, 100, '#2a2440', 6, 'right');
      // EP-Balken
      const lo = BATTLE.expFor(me.lvl), hi = BATTLE.expFor(me.lvl + 1);
      const p = Math.max(0, Math.min(1, (me.exp - lo) / (hi - lo)));
      bar(176, 108, 126, 2, p, '#58a8f0', '#3a3550');
      if (me.status) {
        b.fillStyle = me.status === 'psn' ? '#a040a0' : '#f0c030';
        b.fillRect(176, 99, 16, 6);
        text(me.status === 'psn' ? 'GFT' : 'PAR', 177, 99, '#ffffff', 6);
      }
    }

    b.restore();

    // Untere Box
    box(2, 124, VW - 4, VH - 126);
    if (B.waiting || B.phase === 'msg' || B.phase === 'over') {
      const lines = wrap(B.text || '...', VW - 26, 8);
      lines.slice(0, 3).forEach((l, i) => text(l, 12, 134 + i * 11, '#2a2440', 8));
      if (B.waiting && Math.floor(G.time * 3) % 2 === 0) text('▼', VW - 16, VH - 14, '#2a2440', 8);
    } else if (B.phase === 'menu') {
      text('Was soll', 14, 136, '#2a2440', 8);
      text((me ? me.name : '') + ' tun?', 14, 148, '#2a2440', 8);
      const opts = ['KAMPF', 'BEUTEL', 'TEAM', 'FLUCHT'];
      opts.forEach((o, i) => {
        const x = 178 + (i % 2) * 68, y = 134 + Math.floor(i / 2) * 16;
        if (i === B.menuIdx) text('▶', x - 10, y, '#e04848', 8);
        text(o, x, y, '#2a2440', 8);
      });
    } else if (B.phase === 'moves') {
      me.moves.forEach((mv, i) => {
        const x = 14 + (i % 2) * 150, y = 132 + Math.floor(i / 2) * 14;
        if (i === B.moveIdx) text('▶', x - 8, y, '#e04848', 8);
        text(mv.name, x, y, mv.ap > 0 ? '#2a2440' : '#a09aa8', 8);
        text('AP ' + mv.ap + '/' + mv.apMax, x + 132, y + 2, '#585070', 6, 'right');
      });
      const cur = DATA.MOVES[me.moves[B.moveIdx].name];
      typeChip(cur.type, 14, VH - 14);
      text('Stärke ' + (cur.pow || '-') + '  Gen. ' + cur.acc + '%', 90, VH - 13, '#585070', 6);
      text('ESC = zurück', VW - 12, VH - 13, '#585070', 6, 'right');
    } else if (B.phase === 'bag') {
      const list = bagList();
      if (!list.length) text('Dein Beutel ist leer!', 14, 138, '#2a2440', 8);
      list.slice(0, 4).forEach((k, i) => {
        const x = 14 + (i % 2) * 150, y = 132 + Math.floor(i / 2) * 14;
        if (i === B.bagIdx) text('▶', x - 8, y, '#e04848', 8);
        text(DATA.ITEMS[k].name, x, y, '#2a2440', 8);
        text('x' + G.bag[k], x + 132, y + 2, '#585070', 6, 'right');
      });
      text('ESC = zurück', VW - 12, VH - 13, '#585070', 6, 'right');
    } else if (B.phase === 'party') {
      G.party.slice(0, 4).forEach((m, i) => {
        const x = 14 + (i % 2) * 150, y = 130 + Math.floor(i / 2) * 14;
        if (i === B.partyIdx) text('▶', x - 8, y, '#e04848', 8);
        text(m.name + ' Lv' + m.lvl, x, y, m.hp > 0 ? '#2a2440' : '#c05050', 8);
        bar(x + 92, y + 3, 36, 3, m.hp / m.maxhp, hpColor(m.hp / m.maxhp));
      });
      text(B.forceSwitch ? 'Wähle ein Pokémon!' : 'ESC = zurück', VW - 12, VH - 13, '#585070', 6, 'right');
    }
  }

  function bagList() {
    return Object.keys(G.bag).filter(k => G.bag[k] > 0 && DATA.ITEMS[k]);
  }

  /* ---------------- Kampf-Eingabe ---------------- */
  function updateBattle(dt) {
    const B = G.battle;
    B.shake = Math.max(0, B.shake - dt);
    B.flashEnemy = Math.max(0, B.flashEnemy - dt);
    B.flashPlayer = Math.max(0, B.flashPlayer - dt);
    B.ballAnim = Math.max(0, B.ballAnim - dt * 1.4);

    if (B.done) {
      const res = B.result;
      G.party.forEach(m => BATTLE.resetStages(m));
      G.battle = null;
      G.state = 'world';
      G.encounterCooldown = 1.5;
      if (res === 'lose') blackout();
      else if (res === 'catch' || res === 'win') save();
      return;
    }

    if (B.waiting) {
      if (OK()) BATTLE.advance(B);
      return;
    }
    if (B.phase === 'msg' || B.phase === 'over') { BATTLE.pump(B); return; }

    const me = G.party[G.activeIdx];

    if (B.phase === 'menu') {
      if (LEFT() || RIGHT()) B.menuIdx ^= 1;
      if (UP() || DOWN()) B.menuIdx ^= 2;
      if (OK()) {
        if (B.menuIdx === 0) { B.phase = 'moves'; B.moveIdx = 0; }
        else if (B.menuIdx === 1) { B.phase = 'bag'; B.bagIdx = 0; }
        else if (B.menuIdx === 2) { B.phase = 'party'; B.partyIdx = G.activeIdx; }
        else BATTLE.tryFlee(B);
      }
      return;
    }
    if (B.phase === 'moves') {
      const n = me.moves.length;
      if (LEFT()) B.moveIdx = (B.moveIdx + n - 1) % n;
      if (RIGHT()) B.moveIdx = (B.moveIdx + 1) % n;
      if (UP()) B.moveIdx = (B.moveIdx + n - 2) % n;
      if (DOWN()) B.moveIdx = (B.moveIdx + 2) % n;
      if (BACK()) B.phase = 'menu';
      if (OK()) {
        if (!BATTLE.playerMove(B, B.moveIdx)) notify('Keine AP mehr!');
      }
      return;
    }
    if (B.phase === 'bag') {
      const list = bagList();
      if (BACK()) { B.phase = 'menu'; return; }
      if (!list.length) return;
      if (UP() || LEFT()) B.bagIdx = (B.bagIdx + list.length - 1) % list.length;
      if (DOWN() || RIGHT()) B.bagIdx = (B.bagIdx + 1) % list.length;
      if (OK()) {
        if (!BATTLE.useItem(B, list[Math.min(B.bagIdx, list.length - 1)])) notify('Das bringt gerade nichts.');
      }
      return;
    }
    if (B.phase === 'party') {
      const n = G.party.length;
      if (UP() || LEFT()) B.partyIdx = (B.partyIdx + n - 1) % n;
      if (DOWN() || RIGHT()) B.partyIdx = (B.partyIdx + 1) % n;
      if (BACK() && !B.forceSwitch) { B.phase = 'menu'; return; }
      if (OK()) {
        if (G.party[B.partyIdx].hp <= 0) notify('Dieses Pokémon ist kampfunfähig!');
        else if (B.partyIdx === G.activeIdx) notify('Es kämpft bereits!');
        else BATTLE.switchTo(B, B.partyIdx);
      }
    }
  }

  /* ---------------- Titelbildschirm ---------------- */
  function drawTitle() {
    for (let i = 0; i < VH; i++) {
      b.fillStyle = SPR.shade('#2a2f5e', i / VH * .5);
      b.fillRect(0, i, VW, 1);
    }
    // Sterne
    for (let i = 0; i < 50; i++) {
      const rr = WORLD.mulberry32(i * 977)();
      const r2 = WORLD.mulberry32(i * 313)();
      b.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.6 * Math.abs(Math.sin(G.time + i))) + ')';
      b.fillRect(Math.floor(rr * VW), Math.floor(r2 * 90), 1, 1);
    }
    // Boden
    b.fillStyle = '#1f3a2a'; b.fillRect(0, 120, VW, VH - 120);
    b.fillStyle = '#284a34'; b.fillRect(0, 120, VW, 4);

    // Sprites der Starter
    const keys3 = ['bisasam', 'glumanda', 'schiggy'];
    keys3.forEach((k, i) => {
      const sp = DATA.SPECIES[k];
      SPR.drawMon(b, sp.tmpl, sp.pal, 62 + i * 66, 96 + Math.sin(G.time * 2 + i) * 2, 2, i === 2);
    });

    shadowText('POKÉMON', VW / 2, 22, '#ffe070', 26, 'center');
    shadowText('OPEN WORLD', VW / 2, 52, '#8fd0f0', 14, 'center');
    text('3 XXL-Regionen · Pixel-Abenteuer', VW / 2, 70, '#c8c0e0', 8, 'center');

    const opts = hasSave() ? ['Weiterspielen', 'Neues Spiel'] : ['Neues Spiel'];
    opts.forEach((o, i) => {
      const y = 138 + i * 14;
      if (i === G.titleIdx) text('▶', VW / 2 - textW(o, 8) / 2 - 12, y, '#e04848', 8);
      text(o, VW / 2, y, '#f8f4e8', 8, 'center');
    });
  }

  function updateTitle() {
    const opts = hasSave() ? 2 : 1;
    if (UP()) G.titleIdx = (G.titleIdx + opts - 1) % opts;
    if (DOWN()) G.titleIdx = (G.titleIdx + 1) % opts;
    if (OK()) {
      if (hasSave() && G.titleIdx === 0) { if (load()) return; }
      G.state = 'starter'; G.starterIdx = 1;
    }
  }

  /* ---------------- Starterauswahl ---------------- */
  const STARTERS = ['bisasam', 'glumanda', 'schiggy'];

  function drawStarter() {
    b.fillStyle = '#22283f'; b.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 20; i++) {
      b.fillStyle = 'rgba(255,255,255,.03)';
      b.fillRect(0, i * 9, VW, 4);
    }
    text('Wähle dein erstes Pokémon!', VW / 2, 10, '#ffe070', 8, 'center');

    STARTERS.forEach((k, i) => {
      const sp = DATA.SPECIES[k];
      const x = 20 + i * 100, y = 30;
      const sel = i === G.starterIdx;
      // Podest
      b.fillStyle = sel ? '#3d4a80' : '#2c3357';
      b.fillRect(x, y, 84, 92);
      b.fillStyle = sel ? '#5f76c8' : '#3a4370';
      b.fillRect(x, y, 84, 3); b.fillRect(x, y + 89, 84, 3);
      b.fillRect(x, y, 3, 92); b.fillRect(x + 81, y, 3, 92);

      const bob = sel ? Math.sin(G.time * 4) * 2 : 0;
      SPR.drawMon(b, sp.tmpl, sp.pal, x + 10, y + 14 + bob, 4, false);
      text(sp.name, x + 42, y + 78, sel ? '#ffe070' : '#c8c0e0', 8, 'center');

      let cx = x + 6;
      sp.types.forEach(t => { cx += typeChip(t, cx, y + 92 + 3); });
    });

    const sel = DATA.SPECIES[STARTERS[G.starterIdx]];
    box(8, 138, VW - 16, 38);
    const desc = {
      bisasam: 'Ruhig und zäh. Pflanzenattacken sind stark gegen Wasser und Gestein.',
      glumanda: 'Schnell und angriffslustig. Feuer verbrennt Pflanzen und Käfer.',
      schiggy: 'Robuster Panzer. Wasser löscht Feuer und zersetzt Gestein.'
    }[STARTERS[G.starterIdx]];
    wrap(desc, VW - 40, 8).slice(0, 2).forEach((l, i) => text(l, 16, 144 + i * 11, '#2a2440', 8));
    text('KP ' + sel.base.hp + '  ANG ' + sel.base.atk + '  VER ' + sel.base.def + '  INI ' + sel.base.spd,
      16, 166, '#585070', 6);
    text('◀ ▶ wählen · Enter bestätigen', VW - 16, 166, '#585070', 6, 'right');
  }

  function updateStarter() {
    if (LEFT()) G.starterIdx = (G.starterIdx + 2) % 3;
    if (RIGHT()) G.starterIdx = (G.starterIdx + 1) % 3;
    if (OK()) {
      fadeOut(() => newGame(STARTERS[G.starterIdx]));
    }
  }

  /* ---------------- Pausenmenü ---------------- */
  const MENU = ['Team', 'Beutel', 'Pokédex', 'Karte', 'Speichern', 'Zurück'];
  let menuSub = null;   // null | 'team' | 'bag' | 'dex' | 'map'

  function updateMenu() {
    if (menuSub) {
      if (BACK()) { menuSub = null; return; }
      if (menuSub === 'team') {
        const n = G.party.length;
        if (UP()) G.subIdx = (G.subIdx + n - 1) % n;
        if (DOWN()) G.subIdx = (G.subIdx + 1) % n;
        if (OK() && G.party[G.subIdx].hp > 0) {
          G.activeIdx = G.subIdx;
          notify(G.party[G.subIdx].name + ' führt jetzt das Team an.');
        }
      } else if (menuSub === 'bag') {
        const list = bagList();
        if (list.length) {
          if (UP()) G.subIdx = (G.subIdx + list.length - 1) % list.length;
          if (DOWN()) G.subIdx = (G.subIdx + 1) % list.length;
          if (OK()) {
            const k = list[Math.min(G.subIdx, list.length - 1)];
            const it = DATA.ITEMS[k];
            if (it.kind === 'heal') {
              const m = G.party[G.activeIdx];
              if (m.hp >= m.maxhp) notify(m.name + ' ist bereits voll geheilt.');
              else {
                m.hp = Math.min(m.maxhp, m.hp + it.amount);
                G.bag[k]--; if (!G.bag[k]) delete G.bag[k];
                notify(m.name + ' wurde geheilt!');
              }
            } else notify('Das kannst du hier nicht benutzen.');
          }
        }
      } else if (menuSub === 'dex') {
        const total = Object.keys(DATA.SPECIES).length;
        if (UP()) G.subScroll = Math.max(0, G.subScroll - 1);
        if (DOWN()) G.subScroll = Math.min(Math.max(0, Math.ceil(total / 6) - 4), G.subScroll + 1);
      }
      return;
    }
    if (UP()) G.menuIdx = (G.menuIdx + MENU.length - 1) % MENU.length;
    if (DOWN()) G.menuIdx = (G.menuIdx + 1) % MENU.length;
    if (BACK()) { G.state = 'world'; return; }
    if (OK()) {
      const sel = MENU[G.menuIdx];
      if (sel === 'Zurück') G.state = 'world';
      else if (sel === 'Speichern') save();
      else { menuSub = sel === 'Team' ? 'team' : sel === 'Beutel' ? 'bag' : sel === 'Pokédex' ? 'dex' : 'map'; G.subIdx = 0; G.subScroll = 0; }
    }
  }

  function drawMenu() {
    drawWorld();
    b.fillStyle = 'rgba(16,14,26,.72)'; b.fillRect(0, 0, VW, VH);

    if (!menuSub) {
      box(VW - 104, 8, 96, 96);
      MENU.forEach((m, i) => {
        const y = 16 + i * 14;
        if (i === G.menuIdx) text('▶', VW - 98, y, '#e04848', 8);
        text(m, VW - 88, y, '#2a2440', 8);
      });
      box(8, VH - 44, 150, 36);
      text('Zeit ' + fmtTime(G.playtime), 16, VH - 36, '#2a2440', 8);
      text('Gefangen: ' + Object.values(G.dex).filter(v => v === 2).length + ' Arten', 16, VH - 24, '#2a2440', 8);
      return;
    }

    if (menuSub === 'team') {
      box(6, 6, VW - 12, VH - 12);
      text('TEAM', 16, 12, '#2a2440', 8);
      G.party.forEach((m, i) => {
        const y = 26 + i * 24;
        const sp = DATA.SPECIES[m.key];
        if (i === G.subIdx) { b.fillStyle = '#e8e0c8'; b.fillRect(12, y - 2, VW - 24, 22); }
        SPR.drawMon(b, sp.tmpl, sp.pal, 14, y, 1.25, false);
        text(m.name + (i === G.activeIdx ? ' *' : ''), 38, y + 1, '#2a2440', 8);
        text('Lv' + m.lvl, 130, y + 1, '#2a2440', 8);
        bar(160, y + 4, 70, 4, m.hp / m.maxhp, hpColor(m.hp / m.maxhp));
        text(m.hp + '/' + m.maxhp, 240, y + 2, '#585070', 6);
        let cx = 38;
        sp.types.forEach(t => { cx += typeChip(t, cx, y + 11); });
        const mv = m.moves.map(x => x.name).join(', ');
        text(mv.length > 30 ? mv.slice(0, 29) + '…' : mv, 160, y + 12, '#585070', 6);
      });
      text('Enter = an die Spitze  ·  ESC = zurück', VW - 16, VH - 18, '#585070', 6, 'right');
      return;
    }

    if (menuSub === 'bag') {
      box(6, 6, VW - 12, VH - 12);
      text('BEUTEL', 16, 12, '#2a2440', 8);
      const list = bagList();
      if (!list.length) text('Leer.', 16, 30, '#585070', 8);
      list.forEach((k, i) => {
        const y = 28 + i * 14;
        if (i === G.subIdx) text('▶', 14, y, '#e04848', 8);
        text(DATA.ITEMS[k].name, 26, y, '#2a2440', 8);
        text('x' + G.bag[k], 120, y, '#2a2440', 8);
        text(DATA.ITEMS[k].desc, 150, y + 1, '#585070', 6);
      });
      text('ESC = zurück', VW - 16, VH - 18, '#585070', 6, 'right');
      return;
    }

    if (menuSub === 'dex') {
      box(6, 6, VW - 12, VH - 12);
      const caught = Object.values(G.dex).filter(v => v === 2).length;
      const seen = Object.keys(G.dex).length;
      text('POKÉDEX   gesehen ' + seen + ' · gefangen ' + caught, 16, 12, '#2a2440', 8);
      const all = Object.keys(DATA.SPECIES);
      const cols = 6, rowH = 36, cellW = 46, cellH = 32;
      for (let i = 0; i < all.length; i++) {
        const row = Math.floor(i / cols) - G.subScroll;
        if (row < 0 || row > 3) continue;
        const col = i % cols;
        const x = 14 + col * 48, y = 24 + row * rowH;
        const k = all[i], sp = DATA.SPECIES[k], st = G.dex[k] || 0;
        b.fillStyle = st ? '#e8e0c8' : '#dcd4c4'; b.fillRect(x, y, cellW, cellH);
        if (st) {
          SPR.drawMon(b, sp.tmpl, sp.pal, x + 11, y, 1.5, false);
          if (st === 2) { b.fillStyle = '#e04848'; b.fillRect(x + 38, y + 2, 6, 6); b.fillStyle = '#fff'; b.fillRect(x + 39, y + 4, 4, 1); }
          text(sp.name.length > 9 ? sp.name.slice(0, 8) + '.' : sp.name, x + cellW / 2, y + 24, '#2a2440', 6, 'center');
        } else {
          text('?', x + cellW / 2, y + 9, '#b0a8b8', 12, 'center');
        }
      }
      const maxScroll = Math.max(0, Math.ceil(all.length / cols) - 4);
      if (maxScroll > 0) text((G.subScroll + 1) + '/' + (maxScroll + 1), 16, VH - 18, '#585070', 6);
      text('▲▼ blättern · ESC = zurück', VW - 16, VH - 18, '#585070', 6, 'right');
      return;
    }

    if (menuSub === 'map') {
      const r = region();
      box(6, 6, VW - 12, VH - 12);
      text('KARTE – ' + r.cfg.name, 16, 12, '#2a2440', 8);
      const S = 128, mx = (VW - S) / 2, my = 26;
      b.drawImage(r.minimap, 0, 0, r.minimap.width, r.minimap.height, mx, my, S, S);
      b.strokeStyle = '#2a2440'; b.strokeRect(mx - .5, my - .5, S + 1, S + 1);
      r.shrines.forEach(s => {
        b.fillStyle = '#ffffff';
        b.fillRect(mx + s.x / r.W * S - 1, my + s.y / r.H * S - 1, 2, 2);
      });
      r.gates.forEach(g => {
        const ok = g.to >= 0 && g.to <= 2;
        b.fillStyle = ok ? '#c0a0ff' : '#6a6a80';
        b.fillRect(mx + g.x / r.W * S - 3, my + g.y / r.H * S - 3, 6, 6);
        b.fillStyle = '#2a2440';
        b.fillRect(mx + g.x / r.W * S - 1, my + g.y / r.H * S - 1, 2, 2);
      });
      // Spielerposition: blinkendes Fadenkreuz
      const pxm = mx + G.x / TS / r.W * S, pym = my + G.y / TS / r.H * S;
      if (Math.floor(G.time * 2) % 2 === 0) {
        b.fillStyle = '#e04848';
        b.fillRect(pxm - 5, pym - 1, 11, 2);
        b.fillRect(pxm - 1, pym - 5, 2, 11);
        b.fillStyle = '#ffffff';
        b.fillRect(pxm - 1, pym - 1, 2, 2);
      }
      text('Rot = du · Lila = Tor · Weiß = Heilstein', mx, my + S + 4, '#585070', 6);
      text('Region ' + r.cfg.num + '/3 · ' + r.W + 'x' + r.H + ' Felder', VW - 16, my + S + 4, '#585070', 6, 'right');
    }
  }

  function fmtTime(s) {
    const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
    return h + 'h ' + String(m).padStart(2, '0') + 'm';
  }

  /* ---------------- Hauptschleife ---------------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    G.time += dt;
    P = new Set(pressedQueue);
    pressedQueue = [];

    // Kurze Sperre nach einem Bildschirmwechsel: ein Tastendruck darf nicht
    // gleich zwei Menüs weit springen.
    if (G.inputLock > 0) { G.inputLock -= dt; P = new Set(); }
    const snapBefore = G.state + '|' + (G.battle ? G.battle.phase + (G.battle.waiting ? 'W' : '') : '') + '|' + menuSub;

    if (G.noticeT > 0) G.noticeT -= dt;

    // Fade-Übergänge
    if (G.fadeDir === 1) {
      G.fade = Math.min(1, G.fade + dt * 3);
      if (G.fade >= 1) { G.fadeDir = -1; if (G.fadeCb) { G.fadeCb(); G.fadeCb = null; } }
    } else if (G.fadeDir === -1) {
      G.fade = Math.max(0, G.fade - dt * 3);
      if (G.fade <= 0) G.fadeDir = 0;
    }

    const blocked = G.fadeDir !== 0;

    if (G.state === 'title') { if (!blocked) updateTitle(); drawTitle(); }
    else if (G.state === 'starter') { if (!blocked) updateStarter(); drawStarter(); }
    else if (G.state === 'world') {
      G.playtime += dt;
      if (!blocked) updateWorld(dt);
      drawWorld();
    }
    else if (G.state === 'battle') {
      G.playtime += dt;
      if (!blocked) updateBattle(dt);
      if (G.state === 'battle' && G.battle) drawBattle(); else drawWorld();
    }
    else if (G.state === 'menu') { if (!blocked) updateMenu(); drawMenu(); }

    const snapAfter = G.state + '|' + (G.battle ? G.battle.phase + (G.battle.waiting ? 'W' : '') : '') + '|' + menuSub;
    if (snapBefore !== snapAfter) { clearInput(); G.inputLock = 0.13; }

    if (G.fade > 0) {
      b.fillStyle = 'rgba(10,8,16,' + G.fade + ')';
      b.fillRect(0, 0, VW, VH);
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, VW, VH, 0, 0, cv.width, cv.height);
    requestAnimationFrame(frame);
  }

  // Autosave alle 60 Sekunden
  setInterval(() => { if (G.state === 'world') save(); }, 60000);

  resize();
  requestAnimationFrame(frame);

})();
