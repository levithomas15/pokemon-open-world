/* ============================================================
   world.js – prozedurale XXL-Regionen, Tiles, Minimap
   ============================================================ */
(function (global) {

  const T = {
    WATER: 0, DEEP: 1, SAND: 2, GROUND: 3, BUSH: 4,
    TREE: 5, ROCK: 6, FLOWER: 7, PATH: 8, SHRINE: 9, GATE: 10
  };
  const SOLID = { 0: 1, 1: 1, 5: 1, 6: 1 };

  const TS = 16;              // Tile-Größe in Pixeln
  const W = 256, H = 256;     // Regionsgröße in Tiles (XXL: 4096x4096 px)

  /* ---------- Zufall / Noise ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function noiseMaker(seed) {
    const rnd = mulberry32(seed);
    const G = 256, g = new Float32Array(G * G);
    for (let i = 0; i < G * G; i++) g[i] = rnd();
    const sm = t => t * t * (3 - 2 * t);
    return function (x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const a = g[(yi & 255) * G + (xi & 255)];
      const b = g[(yi & 255) * G + ((xi + 1) & 255)];
      const c = g[((yi + 1) & 255) * G + (xi & 255)];
      const d = g[((yi + 1) & 255) * G + ((xi + 1) & 255)];
      const u = sm(xf), v = sm(yf);
      return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
    };
  }
  function fbm(n, x, y, oct, freq) {
    let s = 0, amp = 1, f = freq, tot = 0;
    for (let i = 0; i < oct; i++) { s += amp * n(x * f, y * f); tot += amp; f *= 2; amp *= .5; }
    return s / tot;
  }
  function hash2(x, y) {
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967296;
  }

  /* ---------- Themes pro Region ---------- */
  const THEMES = [
    { // 1 – Grünwald
      water: '#3a7bc8', waterHi: '#6aa6e8', deep: '#26538f',
      sand: '#e6d8a0', ground: '#5aa85a', ground2: '#4d9550',
      bush: '#2f7a3c', bushHi: '#57b06a',
      tree: '#2b6b34', treeHi: '#3f8f45', trunk: '#6b4a2a',
      rock: '#8b8b8b', rockHi: '#adadad',
      path: '#c8b48a', flower: '#f0e04a', flower2: '#e85a7a',
      sky1: '#8fd0f0', sky2: '#cfeaf8'
    },
    { // 2 – Aschental
      water: '#3f7fa8', waterHi: '#6ea8cf', deep: '#2a5570',
      sand: '#e0b878', ground: '#c98a4a', ground2: '#b57a3f',
      bush: '#8f7a34', bushHi: '#c0a047',
      tree: '#7a6a2f', treeHi: '#9f8c3e', trunk: '#7a4a22',
      rock: '#a06848', rockHi: '#c2865f',
      path: '#e0c088', flower: '#f0903a', flower2: '#d84a3a',
      sky1: '#f0a860', sky2: '#f8d8a0'
    },
    { // 3 – Kristall-Hochland
      water: '#4fa8d8', waterHi: '#8fd8f0', deep: '#2f6f9f',
      sand: '#dfe8f0', ground: '#e8f0f8', ground2: '#cfdcea',
      bush: '#6f9fc0', bushHi: '#9fd0e0',
      tree: '#3f7f8f', treeHi: '#5fa8b8', trunk: '#5a5f70',
      rock: '#9fb0c8', rockHi: '#c8d8e8',
      path: '#b8c4d4', flower: '#a8e8f0', flower2: '#c8a0f0',
      sky1: '#a8c8e8', sky2: '#e0eef8'
    }
  ];

  /* ---------- Tile-Grafiken bauen ---------- */
  function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }

  function makeTile(draw) {
    const cv = document.createElement('canvas');
    cv.width = TS; cv.height = TS;
    draw(cv.getContext('2d'));
    return cv;
  }

  function buildTiles(theme) {
    const t = theme;
    const set = {};

    const groundBase = (c, variant) => {
      px(c, 0, 0, TS, TS, t.ground);
      const r = mulberry32(1000 + variant * 77);
      for (let i = 0; i < 10; i++) {
        const x = Math.floor(r() * TS), y = Math.floor(r() * TS);
        px(c, x, y, 1, 1, t.ground2);
      }
      for (let i = 0; i < 4; i++) {
        const x = Math.floor(r() * (TS - 2)), y = Math.floor(r() * TS);
        px(c, x, y, 2, 1, SPR.shade(t.ground, .08));
      }
    };

    set[T.GROUND] = [0, 1, 2, 3].map(v => makeTile(c => groundBase(c, v)));

    set[T.SAND] = [0, 1].map(v => makeTile(c => {
      px(c, 0, 0, TS, TS, t.sand);
      const r = mulberry32(300 + v);
      for (let i = 0; i < 12; i++) px(c, Math.floor(r() * TS), Math.floor(r() * TS), 1, 1, SPR.shade(t.sand, -.12));
    }));

    set[T.PATH] = [0, 1].map(v => makeTile(c => {
      px(c, 0, 0, TS, TS, t.path);
      const r = mulberry32(500 + v);
      for (let i = 0; i < 14; i++) px(c, Math.floor(r() * TS), Math.floor(r() * TS), 1, 1, SPR.shade(t.path, -.14));
    }));

    set[T.BUSH] = [0, 1, 2].map(v => makeTile(c => {
      groundBase(c, v);
      const r = mulberry32(700 + v * 13);
      for (let i = 0; i < 9; i++) {
        const x = Math.floor(r() * (TS - 2)) + 1;
        const hgt = 5 + Math.floor(r() * 5);
        const yb = TS - 1 - Math.floor(r() * 3);
        px(c, x, yb - hgt, 1, hgt, t.bush);
        px(c, x, yb - hgt, 1, 2, t.bushHi);
        px(c, x - 1, yb - hgt + 2, 1, 2, t.bush);
      }
    }));

    set[T.FLOWER] = [0, 1].map(v => makeTile(c => {
      groundBase(c, v);
      const r = mulberry32(900 + v);
      for (let i = 0; i < 4; i++) {
        const x = 2 + Math.floor(r() * (TS - 5)), y = 2 + Math.floor(r() * (TS - 5));
        const col = r() < .5 ? t.flower : t.flower2;
        px(c, x + 1, y, 1, 3, col); px(c, x, y + 1, 3, 1, col);
        px(c, x + 1, y + 1, 1, 1, '#ffffff');
      }
    }));

    set[T.TREE] = [0, 1, 2].map(v => makeTile(c => {
      groundBase(c, v);
      px(c, 7, 11, 3, 5, t.trunk);
      px(c, 9, 11, 1, 5, SPR.shade(t.trunk, -.2));
      const r = mulberry32(1100 + v * 31);
      px(c, 3, 1, 11, 10, t.tree);
      px(c, 2, 3, 13, 6, t.tree);
      px(c, 4, 0, 9, 2, t.tree);
      px(c, 4, 1, 6, 4, t.treeHi);
      px(c, 3, 9, 11, 2, SPR.shade(t.tree, -.2));
      for (let i = 0; i < 8; i++) px(c, 3 + Math.floor(r() * 10), 1 + Math.floor(r() * 9), 1, 1, SPR.shade(t.tree, .15));
    }));

    set[T.ROCK] = [0, 1].map(v => makeTile(c => {
      groundBase(c, v);
      px(c, 3, 6, 10, 8, t.rock);
      px(c, 4, 4, 8, 3, t.rock);
      px(c, 5, 3, 5, 2, t.rockHi);
      px(c, 4, 5, 5, 3, t.rockHi);
      px(c, 3, 12, 10, 2, SPR.shade(t.rock, -.28));
      px(c, 2, 8, 1, 5, SPR.shade(t.rock, -.2));
      px(c, 13, 8, 1, 5, SPR.shade(t.rock, -.2));
    }));

    // Wasser: 3 Animationsphasen
    set[T.WATER] = [0, 1, 2].map(f => makeTile(c => {
      px(c, 0, 0, TS, TS, t.water);
      for (let y = 0; y < TS; y += 4) {
        const off = ((f * 3) + y) % TS;
        px(c, off, y + 1, 4, 1, t.waterHi);
        px(c, (off + 8) % TS, y + 3, 3, 1, SPR.shade(t.water, -.12));
      }
    }));
    set[T.DEEP] = [0, 1, 2].map(f => makeTile(c => {
      px(c, 0, 0, TS, TS, t.deep);
      for (let y = 2; y < TS; y += 6) {
        const off = ((f * 4) + y * 2) % TS;
        px(c, off, y, 3, 1, SPR.shade(t.deep, .18));
      }
    }));

    set[T.SHRINE] = [makeTile(c => {
      px(c, 0, 0, TS, TS, t.path);
      px(c, 2, 3, 12, 11, SPR.shade(t.rock, -.1));
      px(c, 3, 2, 10, 2, t.rockHi);
      px(c, 5, 6, 6, 8, SPR.shade(t.rock, -.35));
      px(c, 6, 4, 4, 6, '#f0f8a0');
      px(c, 7, 3, 2, 8, '#ffffff');
      px(c, 6, 10, 4, 1, '#e8e070');
    })];

    set[T.GATE] = [makeTile(c => {
      px(c, 0, 0, TS, TS, t.path);
      px(c, 1, 1, 14, 14, SPR.shade(t.rock, -.3));
      px(c, 3, 3, 10, 12, '#2a2440');
      px(c, 4, 4, 8, 10, '#7a5ad8');
      px(c, 5, 5, 6, 8, '#b09af0');
      px(c, 6, 6, 4, 6, '#e8dcff');
      px(c, 1, 0, 14, 2, SPR.shade(t.rock, .1));
    })];

    return set;
  }

  /* ---------- Region erzeugen ---------- */
  function generate(index, seed) {
    const theme = THEMES[index];
    const cfg = DATA.REGIONS[index];
    const rnd = mulberry32(seed + index * 9871);
    const nElev = noiseMaker(seed + index * 101 + 1);
    const nMoist = noiseMaker(seed + index * 101 + 2);
    const nGrass = noiseMaker(seed + index * 101 + 3);
    const nDetail = noiseMaker(seed + index * 101 + 4);

    const tiles = new Uint8Array(W * H);

    // Regions-Parameter
    const waterLvl = [0.36, 0.28, 0.33][index];
    const treeDens = [0.56, 0.70, 0.66][index];
    const bushDens = [0.52, 0.58, 0.55][index];

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        // Rand der Region = unpassierbares Wasser/Gebirge
        const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
        let e = fbm(nElev, x, y, 4, 0.012);
        if (edge < 6) e -= (6 - edge) * 0.09;

        let tile;
        if (e < waterLvl - 0.06) tile = T.DEEP;
        else if (e < waterLvl) tile = T.WATER;
        else if (e < waterLvl + 0.04) tile = T.SAND;
        else {
          const m = fbm(nMoist, x + 500, y + 500, 3, 0.02);
          const g = fbm(nGrass, x + 900, y + 900, 3, 0.035);
          const d = hash2(x, y);
          tile = T.GROUND;
          if (g > bushDens) tile = T.BUSH;
          if (m > treeDens && d > 0.35) tile = T.TREE;
          if (tile === T.GROUND) {
            if (d > 0.985) tile = T.ROCK;
            else if (d > 0.955) tile = T.FLOWER;
          }
          // Gebirgsrücken
          if (e > 0.72 && d > 0.45) tile = T.ROCK;
        }
        tiles[y * W + x] = tile;
      }
    }

    const solidAt = (x, y) => x < 0 || y < 0 || x >= W || y >= H || !!SOLID[tiles[y * W + x]];

    function findWalkable(cx, cy, maxR) {
      maxR = maxR || 60;
      for (let r = 0; r < maxR; r++) {
        for (let a = 0; a < Math.max(1, r * 8); a++) {
          const ang = (a / Math.max(1, r * 8)) * Math.PI * 2;
          const x = Math.round(cx + Math.cos(ang) * r);
          const y = Math.round(cy + Math.sin(ang) * r);
          if (x > 3 && y > 3 && x < W - 4 && y < H - 4 && !solidAt(x, y)) return { x, y };
        }
      }
      return { x: cx, y: cy };
    }

    function clear(cx, cy, r, tile) {
      for (let y = cy - r; y <= cy + r; y++)
        for (let x = cx - r; x <= cx + r; x++)
          if (x >= 0 && y >= 0 && x < W && y < H) tiles[y * W + x] = tile;
    }

    // Tore: Westen (zurück) und Osten (weiter)
    const gates = [];
    const gw = findWalkable(10, Math.floor(H / 2));
    const ge = findWalkable(W - 11, Math.floor(H / 2));
    clear(gw.x, gw.y, 3, T.PATH); clear(ge.x, ge.y, 3, T.PATH);
    tiles[gw.y * W + gw.x] = T.GATE;
    tiles[ge.y * W + ge.x] = T.GATE;
    gates.push({ x: gw.x, y: gw.y, to: index - 1, side: 'w' });
    gates.push({ x: ge.x, y: ge.y, to: index + 1, side: 'e' });

    // Startpunkt
    const spawn = findWalkable(Math.floor(W * 0.22), Math.floor(H / 2));
    clear(spawn.x, spawn.y, 2, T.GROUND);

    // Heilsteine
    const shrines = [];
    const shrineCount = 14;
    for (let i = 0; i < shrineCount; i++) {
      const p = findWalkable(
        8 + Math.floor(rnd() * (W - 16)),
        8 + Math.floor(rnd() * (H - 16)), 40
      );
      clear(p.x, p.y, 1, T.PATH);
      tiles[p.y * W + p.x] = T.SHRINE;
      shrines.push({ x: p.x, y: p.y });
    }
    // Heilstein direkt am Start + an den Toren
    const sp0 = findWalkable(spawn.x + 3, spawn.y, 10);
    tiles[sp0.y * W + sp0.x] = T.SHRINE; shrines.push({ x: sp0.x, y: sp0.y });
    [gw, ge].forEach(g => {
      const s = findWalkable(g.x, g.y + 3, 8);
      tiles[s.y * W + s.x] = T.SHRINE; shrines.push({ x: s.x, y: s.y });
    });

    // Items in der Welt verteilen
    const items = [];
    const pool = index === 0
      ? ['ball', 'ball', 'ball', 'trank', 'beere', 'superball']
      : index === 1
        ? ['ball', 'superball', 'superball', 'trank', 'supertrank', 'beere']
        : ['superball', 'hyperball', 'hyperball', 'supertrank', 'supertrank', 'beere'];
    for (let i = 0; i < 90; i++) {
      const x = 6 + Math.floor(rnd() * (W - 12));
      const y = 6 + Math.floor(rnd() * (H - 12));
      if (solidAt(x, y) || tiles[y * W + x] === T.GATE || tiles[y * W + x] === T.SHRINE) continue;
      items.push({ x, y, item: pool[Math.floor(rnd() * pool.length)], taken: false });
    }

    const region = {
      index, theme, cfg, tiles, W, H, gates, shrines, items,
      spawn: { x: spawn.x, y: spawn.y },
      tileset: buildTiles(theme),
      minimap: null
    };
    region.minimap = buildMinimap(region);
    return region;
  }

  /* ---------- Minimap (1px pro 2 Tiles) ---------- */
  function buildMinimap(region) {
    const step = 2;
    const mw = Math.floor(W / step), mh = Math.floor(H / step);
    const cv = document.createElement('canvas');
    cv.width = mw; cv.height = mh;
    const c = cv.getContext('2d');
    const t = region.theme;
    const col = {
      [T.WATER]: t.water, [T.DEEP]: t.deep, [T.SAND]: t.sand,
      [T.GROUND]: t.ground, [T.BUSH]: t.bush, [T.TREE]: t.tree,
      [T.ROCK]: t.rock, [T.FLOWER]: t.flower, [T.PATH]: t.path,
      [T.SHRINE]: '#ffffff', [T.GATE]: '#c0a0ff'
    };
    for (let y = 0; y < mh; y++) {
      for (let x = 0; x < mw; x++) {
        c.fillStyle = col[region.tiles[(y * step) * W + x * step]] || '#000';
        c.fillRect(x, y, 1, 1);
      }
    }
    return cv;
  }

  global.WORLD = { T, SOLID, TS, W, H, generate, THEMES, mulberry32 };

})(window);
