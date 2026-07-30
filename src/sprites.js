/* ============================================================
   sprites.js – Pixel-Sprites (16x16) für alle Pokémon + Helfer
   Zeichen: '.' transparent, 'k' Umriss, '1'/'2'/'3' Palette,
            'e' Auge (dunkel), 'w' weiß
   ============================================================ */
(function (global) {

  const TMPL = {

    // Panzer-Typ (Schiggy, Turtok, Lapras ...)
    turtle: [
      "................",
      ".....kkkkkk.....",
      "....k111111k....",
      "...k11111111k...",
      "...k1e1111e1k...",
      "...k11111111k...",
      "...kk111111kk...",
      "....kk1111kk....",
      "..kk22222222kk..",
      ".k112233332211k.",
      ".k112233332211k.",
      ".k112233332211k.",
      "..kk22222222kk..",
      "...k11k..k11k...",
      "...kkkk..kkkk...",
      "................"
    ],

    // Vierbeiner mit Knospe (Bisasam, Sandan, Ponita ...)
    quad: [
      "................",
      "......kkkk......",
      ".....k3333k.....",
      "....kk3333kk....",
      "...kk111111kk...",
      "...k11111111k...",
      "...k1e1111e1k...",
      "...kk111111kk...",
      "..kk11111111kk..",
      ".k112211112211k.",
      ".k111111111111k.",
      ".k112211112211k.",
      "..kk11111111kk..",
      "...k11k..k11k...",
      "...kkkk..kkkk...",
      "................"
    ],

    // Echse mit Schwanzflamme (Glumanda, Glutexo ...)
    lizard: [
      "................",
      ".....kkkkk......",
      "....k11111k.....",
      "...k1111111k....",
      "...k1e111e1k....",
      "...k1111111k....",
      "...kk11111kk....",
      "....kk111kk..k3k",
      "..kk1111111kk33k",
      ".k111111111k333k",
      ".k1111111111k1k.",
      ".k11111111kk11k.",
      "..kk11111111kk..",
      "...k11k..k11k...",
      "...kkkk..kkkk...",
      "................"
    ],

    // Nager (Rattfratz, Rattikarl, Mauzi ...)
    rat: [
      "..kk......kk....",
      ".k22k....k22k...",
      ".k1122kkkk2211k.",
      "..k1111111111k..",
      "..k1e111111e1k..",
      "..k1111111111k..",
      "..kk11111111kk..",
      "...k11111111k...",
      "..kk11111111kk..",
      ".k111111111111k.",
      ".k111111111111kk",
      ".k11111111111k2k",
      "..kk11111111kk2k",
      "...k11k..k11k2k.",
      "...kkkk..kkkkk..",
      "................"
    ],

    // Vogel (Taubsi, Tauboga ...)
    bird: [
      "................",
      ".....kkkkkk.....",
      "....k111111k....",
      "...k11111111k...",
      "...k1e1111e1k...",
      "...k11133111k...",
      "...kk113311kk...",
      "....kk1111kk....",
      ".kkk11111111kkk.",
      "k22k11111111k22k",
      "k22k11111111k22k",
      ".kk1111111111kk.",
      "..kk11111111kk..",
      "...k33k..k33k...",
      "...kkkk..kkkk...",
      "................"
    ],

    // Raupe (Raupy, Hornliu ...)
    worm: [
      "....k......k....",
      "....k3....3k....",
      ".....kkkkkk.....",
      "....k111111k....",
      "...k11111111k...",
      "...k1e1111e1k...",
      "...k11111111k...",
      "...kk111111kk...",
      "..kk22222222kk..",
      ".k112222222211k.",
      ".k112222222211k.",
      "..kk22222222kk..",
      "...k22222222k...",
      "...kk222222kk...",
      "....kkkkkkkk....",
      "................"
    ],

    // Fledermaus (Zubat ...)
    bat: [
      "................",
      "kk............kk",
      "k22kk......kk22k",
      "k2222k....k2222k",
      "k22222kkkk22222k",
      "k2222k1111k2222k",
      "k222k1e11e1k222k",
      ".k2kk111111kk2k.",
      "..kk11111111kk..",
      "...k11111111k...",
      "...k11111111k...",
      "...kk111111kk...",
      "....kk1111kk....",
      ".....kkkkkk.....",
      "................",
      "................"
    ],

    // Schleim/Blob (Sleima, Relaxo ...)
    blob: [
      "................",
      "................",
      ".....kkkkkk.....",
      "...kk111111kk...",
      "..k1111111111k..",
      "..k1e111111e1k..",
      ".k111111111111k.",
      ".k111122221111k.",
      "k11111111111111k",
      "k11111111111111k",
      "k11221111112211k",
      "k11111111111111k",
      ".k11kk1111kk11k.",
      "..kk..kkkk..kk..",
      "................",
      "................"
    ],

    // Fels (Kleinstein, Onix-artig ...)
    rock: [
      "................",
      "....kkkkkkk.....",
      "...k1111111k....",
      "..k111111111k...",
      "..k1e11111e1k...",
      ".k11111111111k..",
      "kk111112211111kk",
      "k11111122111111k",
      "k11111111111111k",
      "k11221111112211k",
      "kk111111111111kk",
      ".k111111111111k.",
      "..kk11111111kk..",
      "...kkkkkkkkkk...",
      "................",
      "................"
    ],

    // Elektro-Maus (Pikachu ...)
    mouse: [
      "..kk......kk....",
      "..k2k....k2k....",
      "..k1k....k1k....",
      "..k11kkkk11k....",
      "...k111111k.....",
      "..k11111111k....",
      "..k1e1111e1k....",
      "..k13111131k....",
      "..kk111111kk....",
      "...k111111k.k33k",
      "..k11111111k.k3k",
      "..k11111111kk3k.",
      "..kk111111kk3k..",
      "...k11k.k11k....",
      "...kkkk.kkkk....",
      "................"
    ],

    // Geist (Nebulak ...)
    ghost: [
      "................",
      ".....kkkkkk.....",
      "...kk111111kk...",
      "..k1111111111k..",
      "..k1e111111e1k..",
      ".k111111111111k.",
      ".k111111111111k.",
      "k11111111111111k",
      "k11122111122111k",
      "k11111111111111k",
      "k11111111111111k",
      "k11111111111111k",
      ".k11kk1111kk11k.",
      "..kk..kkkk..kk..",
      "................",
      "................"
    ],

    // Drache (Dratini, Aerodactyl ...)
    dragon: [
      "...k......k.....",
      "...k3....3k.....",
      "....kkkkkk......",
      "...k111111k.....",
      "..k1e1111e1k....",
      "..k11111111k....",
      "..kk111111kk....",
      "kk.k111111k..k3k",
      "k2kk11111111kk3k",
      "k22k11111111k33k",
      "k22kk111111kk3k.",
      ".kk.k111111k3k..",
      "....k111111k....",
      "...k11k..k11k...",
      "...kkkk..kkkk...",
      "................"
    ],

    // Fuchs (Evoli, Mauzi-Alternative ...)
    fox: [
      ".kk........kk...",
      ".k2k......k2k...",
      ".k11k....k11k...",
      ".k111kkkk111k...",
      "..k11111111k....",
      "..k1e1111e1k....",
      "..k11111111k....",
      "..kk111111kk....",
      "...k222222k..kk.",
      "..k22222222kk22k",
      "..k11111111kk22k",
      "..k11111111kk22k",
      "..kk111111kkk2k.",
      "...k11k.k11k....",
      "...kkkk.kkkk....",
      "................"
    ]
  };

  /* ---------- Farb-Helfer ---------- */
  function hex2rgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgb2hex(r, g, b) {
    const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }
  function shade(hex, f) {
    const [r, g, b] = hex2rgb(hex);
    if (f >= 0) return rgb2hex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
    return rgb2hex(r * (1 + f), g * (1 + f), b * (1 + f));
  }

  /* ---------- Sprite-Cache ---------- */
  const cache = new Map();

  function buildSprite(tmplName, pal) {
    const key = tmplName + '|' + pal.join(',');
    if (cache.has(key)) return cache.get(key);

    const rows = TMPL[tmplName] || TMPL.blob;
    const cv = document.createElement('canvas');
    cv.width = 16; cv.height = 16;
    const c = cv.getContext('2d');

    const colors = {
      '1': pal[0],
      '2': pal[1] || shade(pal[0], -0.25),
      '3': pal[2] || shade(pal[0], 0.35),
      'k': pal[3] || shade(pal[0], -0.62),
      'e': '#1a1626',
      'w': '#ffffff'
    };

    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const col = colors[ch];
        if (!col) continue;
        c.fillStyle = col;
        c.fillRect(x, y, 1, 1);
      }
    }
    // Glanzlicht: 1px weiß über jedem Auge
    c.fillStyle = '#ffffff';
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        if (row[x] === 'e' && y > 0 && rows[y - 1][x] !== 'e') c.fillRect(x, y - 1, 1, 1);
      }
    }

    cache.set(key, cv);
    return cv;
  }

  /**
   * Zeichnet ein Pokémon-Sprite.
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} tmpl  Template-Name
   * @param {string[]} pal Palette [body, second, accent, outline?]
   * @param {number} x,y   Zielposition (linke obere Ecke)
   * @param {number} s     Skalierung (ganzzahlig!)
   * @param {boolean} flip horizontal spiegeln
   */
  function drawMon(ctx, tmpl, pal, x, y, s, flip) {
    const img = buildSprite(tmpl, pal);
    ctx.save();
    if (flip) {
      ctx.translate(Math.round(x) + 16 * s, Math.round(y));
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, 16, 16, 0, 0, 16 * s, 16 * s);
    } else {
      ctx.drawImage(img, 0, 0, 16, 16, Math.round(x), Math.round(y), 16 * s, 16 * s);
    }
    ctx.restore();
  }

  /* ---------- Trainer-Sprite (prozedural, 16x16) ---------- */
  function drawTrainer(ctx, x, y, dir, step, scale) {
    const s = scale || 1;
    x = Math.round(x); y = Math.round(y);
    const px = (cx, cy, w, h, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(x + cx * s, y + cy * s, w * s, h * s);
    };
    const SKIN = '#f0c088', SKIN_D = '#c99566';
    const HAT = '#e04a4a', HAT_D = '#9c2f2f';
    const SHIRT = '#3a6fd8', SHIRT_D = '#26499a';
    const PANTS = '#2f3350', SHOE = '#22243a';
    const HAIR = '#5a3a24';
    const OUT = '#1a1626';

    // Beine (Laufanimation)
    const a = step === 1 ? 1 : 0, bft = step === 2 ? 1 : 0;
    px(5, 12 + a, 3, 3, PANTS);
    px(8, 12 + bft, 3, 3, PANTS);
    px(5, 14 + a, 3, 1, SHOE);
    px(8, 14 + bft, 3, 1, SHOE);

    // Körper
    px(4, 8, 8, 5, SHIRT);
    px(4, 11, 8, 2, SHIRT_D);
    px(3, 9, 1, 4, OUT);
    px(12, 9, 1, 4, OUT);

    // Arme
    if (dir === 'left') { px(3, 9, 2, 4, SHIRT_D); px(3, 12, 2, 1, SKIN); }
    else if (dir === 'right') { px(11, 9, 2, 4, SHIRT_D); px(11, 12, 2, 1, SKIN); }
    else { px(3, 9, 2, 4, SHIRT_D); px(11, 9, 2, 4, SHIRT_D); px(3, 12, 2, 1, SKIN); px(11, 12, 2, 1, SKIN); }

    // Kopf
    px(4, 3, 8, 6, SKIN);
    px(3, 4, 1, 4, OUT);
    px(12, 4, 1, 4, OUT);
    px(4, 8, 8, 1, SKIN_D);

    // Haare / Gesicht je Richtung
    if (dir === 'up') {
      px(4, 3, 8, 5, HAIR);
    } else if (dir === 'left') {
      px(4, 3, 8, 2, HAIR);
      px(5, 6, 2, 2, '#1a1626');
      px(4, 6, 1, 2, HAIR);
    } else if (dir === 'right') {
      px(4, 3, 8, 2, HAIR);
      px(9, 6, 2, 2, '#1a1626');
      px(11, 6, 1, 2, HAIR);
    } else {
      px(4, 3, 8, 2, HAIR);
      px(5, 6, 2, 2, '#1a1626');
      px(9, 6, 2, 2, '#1a1626');
      px(7, 7, 2, 1, SKIN_D);
    }

    // Mütze
    px(3, 1, 10, 3, HAT);
    px(3, 3, 10, 1, HAT_D);
    px(4, 0, 8, 1, HAT);
    if (dir === 'up') px(2, 3, 12, 1, HAT_D);
    else if (dir === 'left') px(0, 3, 4, 2, HAT_D);
    else if (dir === 'right') px(12, 3, 4, 2, HAT_D);
    else px(2, 4, 12, 1, HAT_D);
    px(6, 1, 4, 1, '#ffffff');
  }

  global.SPR = { TMPL, drawMon, drawTrainer, shade, buildSprite };

})(window);
