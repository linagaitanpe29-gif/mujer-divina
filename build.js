// build.js — genera data/manifest.json desde los archivos markdown
const fs   = require('fs');
const path = require('path');

const DEVO_DIR     = path.join(__dirname, 'devocionales');
const DATA_DIR     = path.join(__dirname, 'data');
const MANIFEST     = path.join(DATA_DIR, 'manifest.json');

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const data = {};
  const lines = m[1].split('\n');
  for (const line of lines) {
    if (!line.trim() || line.startsWith(' ') || line.startsWith('-')) continue;
    const ci = line.indexOf(':');
    if (ci < 1) continue;
    const key = line.slice(0, ci).trim();
    const val = line.slice(ci + 1).trim().replace(/^["']|["']$/g, '');
    data[key] = val;
  }
  return data;
}

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DEVO_DIR)) {
  fs.mkdirSync(DEVO_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST, '[]');
  console.log('Carpeta devocionales creada. Manifest vacío generado.');
  process.exit(0);
}

const files = fs.readdirSync(DEVO_DIR).filter(f => f.endsWith('.md'));

const manifest = files.map(filename => {
  const slug    = filename.replace('.md', '');
  const content = fs.readFileSync(path.join(DEVO_DIR, filename), 'utf8');
  const data    = parseFrontmatter(content);
  return {
    slug,
    title:      data.title      || slug,
    date:       data.date       || '',
    versiculo:  data.versiculo  || '',
    referencia: data.referencia || '',
    categoria:  data.categoria  || '',
    intro:      data.intro      || ''
  };
}).sort((a, b) => new Date(b.date) - new Date(a.date));

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
console.log(`✓ manifest.json generado con ${manifest.length} devocional(es).`);
