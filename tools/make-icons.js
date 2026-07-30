/* Erzeugt die App-Icons (Pixel-Pokéball) als echte PNG-Dateien – ohne Abhängigkeiten.
   Aufruf:  node tools/make-icons.js                                                 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ---------- Mini-PNG-Encoder ---------- */
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return buf => {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };
})();

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(td));
  return Buffer.concat([len, td, crc]);
}

function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;                       // Filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---------- 32x32-Pixelvorlage: Pokéball ---------- */
const PAL = {
  '.': [26, 31, 51, 255],     // Hintergrund
  'r': [224, 72, 72, 255],    // rot
  'R': [160, 40, 44, 255],    // rot dunkel
  'w': [244, 244, 248, 255],  // weiß
  'W': [196, 200, 214, 255],  // weiß schattiert
  'k': [26, 22, 38, 255],     // Umriss
  'h': [255, 255, 255, 255]   // Glanz
};

const ART = [
  '................................',
  '................................',
  '..........kkkkkkkkkk............',
  '........kkrrrrrrrrrrkk..........',
  '.......krrrrrrrrrrrrrrk.........',
  '......krrhhrrrrrrrrrrrrk........',
  '.....krrhhhrrrrrrrrrrrrrk.......',
  '....krrhhhrrrrrrrrrrrrrrrk......',
  '....krrhrrrrrrrrrrrrrrrrrk......',
  '...krrrrrrrrrrrrrrrrrrrrrrk.....',
  '...krrrrrrrrrrrrrrrrrrrrrrk.....',
  '..krrrrrrrrrrrrrrrrrrrrrrrrk....',
  '..krrrrrrrrrrrrrrrrrrrrrrrrk....',
  '..kRRRRRRRRRRRRRRRRRRRRRRRRk....',
  '.kkkkkkkkkkkkkkkkkkkkkkkkkkkk...',
  '.kkkkkkkkkkkkkkkkkkkkkkkkkkkk...',
  '..kwwwwwwwwwwkkkkwwwwwwwwwwwk...',
  '..kwwwwwwwwwkwwwwkwwwwwwwwwwk...',
  '..kwwwwwwwwkwwhhwwkwwwwwwwwwk...',
  '...kwwwwwwwkwwhhwwkwwwwwwwwk....',
  '...kwwwwwwwkwwwwwwkwwwwwwwwk....',
  '....kwwwwwwwkwwwwkwwwwwwwwk.....',
  '....kwwwwwwwwkkkkwwwwwwwwwk.....',
  '.....kwwwwwwwwwwwwwwwwwwwk......',
  '......kwwwwwwwwwwwwwwwwwk.......',
  '.......kWWWWWWWWWWWWWWWk........',
  '........kkWWWWWWWWWWkk..........',
  '..........kkkkkkkkkk............',
  '................................',
  '................................',
  '................................',
  '................................'
];

function render(size) {
  const src = 32;
  const px = Buffer.alloc(size * size * 4);
  const s = size / src;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = PAL[ART[Math.floor(y / s)][Math.floor(x / s)]] || PAL['.'];
      const o = (y * size + x) * 4;
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = c[3];
    }
  }
  return encodePNG(size, size, px);
}

const outDir = path.resolve(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });
[64, 192, 512].forEach(s => {
  const file = path.join(outDir, 'icon-' + s + '.png');
  fs.writeFileSync(file, render(s));
  console.log('geschrieben:', file);
});
