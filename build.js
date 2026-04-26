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
    date:       String(data.date || ''),
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
