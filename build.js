// build.js — genera manifest.json y copia .md al root para Vercel
const fs   = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DEVO_DIR = path.join(__dirname, 'devocionales');
const MANIFEST = path.join(__dirname, 'manifest.json'); // raíz — donde lo busca app.js

// Leer frontmatter YAML correctamente (soporta campos multilínea)
function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  try {
    return yaml.load(m[1]) || {};
  } catch (e) {
    console.warn('Error parsing YAML:', e.message);
    return {};
  }
}

// Normaliza la fecha a 'YYYY-MM-DD' (sin corrimiento de zona horaria).
// js-yaml parsea 'date: 2026-08-16' como un Date en UTC medianoche; si se
// convierte con String() se corre un día atrás en Colombia (GMT-5). Tomamos
// siempre la fecha en UTC para que app.js (que le añade 'T12:00:00') la muestre bien.
function toISODate(d) {
  if (d instanceof Date && !isNaN(d)) return d.toISOString().slice(0, 10);
  if (typeof d === 'string') {
    const m = d.match(/^\d{4}-\d{2}-\d{2}/);
    if (m) return m[0];
    const parsed = new Date(d);
    if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);
  }
  return '';
}

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

  // Copiar el .md al root para que app.js pueda fetch('slug.md')
  fs.copyFileSync(
    path.join(DEVO_DIR, filename),
    path.join(__dirname, filename)
  );

  return {
    slug,
    title:      data.title      || slug,
    date:       toISODate(data.date),
    versiculo:  data.versiculo  || '',
    referencia: data.referencia || '',
    categoria:  data.categoria  || '',
    intro:      data.intro      || '',
    promesa:    data.promesa    || ''
  };
}).sort((a, b) => new Date(b.date) - new Date(a.date));

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
console.log(`✓ manifest.json generado con ${manifest.length} devocional(es).`);
manifest.forEach(d => console.log(`  · [${d.categoria}] ${d.date} — ${d.title}`));
