/* Baut aus index.html + src/*.js eine einzelne HTML-Datei:  dist/pokemon-komplett.html
   Aufruf:  node tools/build.js                                                        */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const bundled = html.replace(/<script src="(src\/[^"]+)"><\/script>\s*/g, (_, file) => {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
  return '<script>\n/* ---- ' + file + ' ---- */\n' + code + '\n</script>\n';
});

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const out = path.join(ROOT, 'dist', 'pokemon-komplett.html');
fs.writeFileSync(out, bundled);
console.log('Gebaut:', out, '(' + (bundled.length / 1024).toFixed(1) + ' KB)');
