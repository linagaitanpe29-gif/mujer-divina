/* ── Mujer Divina · app.js ─────────────────────────── */

const MD  = window.marked;
const YML = window.jsyaml;

const App = {
  manifest: [],

  init() {
    this.bindNav();
    this.bindSubscribe();
    this.loadManifest().then(() => this.route());
    window.addEventListener('hashchange', () => this.route());
    document.getElementById('logo-link').addEventListener('click', () => {
      window.location.hash = '/';
    });
  },

  /* ── NAV ─────────────────────────────────────────── */
  bindNav() {
    const ham  = document.getElementById('hamburger');
    const mob  = document.getElementById('nav-mobile');

    ham.addEventListener('click', () => mob.classList.toggle('open'));

    document.querySelectorAll('.nav-link, .back-link, .btn-outline, .btn-gold[href]')
      .forEach(el => {
        el.addEventListener('click', () => mob.classList.remove('open'));
      });

    // delegated link handler
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      e.preventDefault();
      window.location.hash = a.getAttribute('href').slice(1);
    });
  },

  /* ── SUBSCRIBE (placeholder — reemplazar con Mailchimp) ── */
  bindSubscribe() {
    const form = document.getElementById('sub-form');
    const msg  = document.getElementById('sub-msg');
    if (!form) return;

    form.addEventListener('submit', e => {
      e.preventDefault();
      msg.className = 'sub-msg ok';
      msg.textContent = '¡Gracias! Pronto recibirás el devocional en tu correo. ✦';
      msg.classList.remove('hidden');
      form.reset();
    });
  },

  /* ── ROUTER ──────────────────────────────────────── */
  route() {
    const hash = window.location.hash.replace('#', '') || '/';
    this.hideAll();

    if (hash === '/' || hash === '') {
      this.show('page-home');
      this.renderHome();
    } else if (hash === '/archivo') {
      this.show('page-archive');
      this.renderArchive();
    } else if (hash === '/suscribirse') {
      this.show('page-home');
      this.renderHome();
      setTimeout(() => {
        document.getElementById('suscribirse-section')
          ?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else if (hash.startsWith('/devocional/')) {
      const slug = hash.replace('/devocional/', '');
      this.show('page-devocional');
      this.renderDevocional(slug);
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  },

  hideAll() {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  },
  show(id) {
    document.getElementById(id)?.classList.remove('hidden');
  },

  /* ── MANIFEST ────────────────────────────────────── */
  async loadManifest() {
    try {
      const r = await fetch('manifest.json');
      this.manifest = await r.json();
    } catch {
      this.manifest = [];
    }
  },

  sorted() {
    return [...this.manifest].sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  /* ── HOME ────────────────────────────────────────── */
  renderHome() {
    this.renderToday();
    this.renderRecent();
  },

  renderToday() {
    const el = document.getElementById('today-card');
    if (!el) return;
    const list = this.sorted();
    if (!list.length) { el.innerHTML = '<p class="loading">Próximamente...</p>'; return; }
    const d = list[0];
    el.innerHTML = `
      <div class="today-card">
        <div class="today-card-top">
          <span class="today-card-label">Devocional</span>
          <span class="today-card-date">${this.dateLong(d.date)}</span>
        </div>
        <div class="today-card-body">
          <h2 class="today-card-title">${d.title}</h2>
          <div class="today-verse">
            <p>"${d.versiculo}"</p>
            <cite>— ${d.referencia}</cite>
          </div>
          ${d.intro ? `<p class="today-intro">${d.intro.slice(0,220)}${d.intro.length>220?'…':''}</p>` : ''}
          <div class="today-foot">
            <a href="#/devocional/${d.slug}" class="btn btn-gold">Leer devocional →</a>
          </div>
        </div>
      </div>`;
  },

  renderRecent() {
    const el = document.getElementById('recent-grid');
    if (!el) return;
    const list = this.sorted().slice(1, 5);
    el.innerHTML = list.length
      ? list.map(d => this.cardHTML(d)).join('')
      : '<p class="loading">Más devocionales próximamente.</p>';
  },

  renderArchive() {
    const el = document.getElementById('all-grid');
    if (!el) return;
    const list = this.sorted();
    el.innerHTML = list.length
      ? list.map(d => this.cardHTML(d)).join('')
      : '<p class="loading">Próximamente...</p>';
  },

  cardHTML(d) {
    return `
      <a href="#/devocional/${d.slug}" class="card">
        <p class="card-date">${this.dateShort(d.date)}</p>
        <h3 class="card-title">${d.title}</h3>
        <div class="card-verse">"${d.versiculo}"</div>
        <p class="card-ref">— ${d.referencia}</p>
      </a>`;
  },

  /* ── INDIVIDUAL DEVOTIONAL ───────────────────────── */
  async renderDevocional(slug) {
    const el = document.getElementById('devo-content');
    if (!el) return;
    el.innerHTML = '<div class="loading">Cargando devocional...</div>';

    const meta = this.manifest.find(d => d.slug === slug);
    if (!meta) { el.innerHTML = '<p>Devocional no encontrado.</p>'; return; }

    try {
      const res  = await fetch(`${slug}.md`);
      const text = await res.text();
      const { fm, body } = this.parseMD(text);

      const preguntas = fm.preguntas || [];
      const oracion   = fm.oracion   || '';
      const cierre    = fm.cierre    || '';
      const intro     = fm.intro     || meta.intro || '';

      let html = `
        <div class="devo-meta">
          <span class="devo-chip">${fm.categoria || 'Devocional'}</span>
          <span class="devo-date">${this.dateLong(meta.date)}</span>
        </div>
        <h1 class="devo-title">${meta.title}</h1>
        <div class="devo-verse">
          <p>"${meta.versiculo}"</p>
          <cite>— ${meta.referencia}</cite>
        </div>
        ${intro ? `<p class="devo-intro">${intro}</p>` : ''}
        <div class="devo-body">${MD.parse(body)}</div>
      `;

      if (preguntas.length) {
        html += `
          <div class="questions-wrap">
            <h3 class="questions-heading">Reflexiona</h3>
            ${preguntas.map((q, i) => `
              <div class="q-item">
                <span class="q-num">${i + 1}</span>
                <div class="q-text">
                  <strong>${q.pregunta}</strong>
                  <p>${q.descripcion || ''}</p>
                </div>
              </div>`).join('')}
          </div>`;
      }

      if (oracion) {
        html += `
          <div class="prayer-wrap">
            <p class="prayer-label">Oración</p>
            <p class="prayer-text">${oracion}</p>
          </div>`;
      }

      html += `
        <div class="closing-wrap">
          <p class="closing-declare">"Yo y mi casa serviremos a Jehová."</p>
          <p class="closing-ref">— Josué 24:15</p>
        </div>`;

      if (cierre) {
        html += `<p class="closing-note">${cierre}</p>`;
      }

      el.innerHTML = html;
    } catch (err) {
      el.innerHTML = '<p>Error al cargar el devocional.</p>';
      console.error(err);
    }
  },

  /* ── FRONTMATTER PARSER ──────────────────────────── */
  parseMD(text) {
    const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!m) return { fm: {}, body: text };
    let fm = {};
    try { fm = YML.load(m[1]) || {}; } catch { fm = {}; }
    return { fm, body: m[2].trim() };
  },

  /* ── DATE HELPERS ────────────────────────────────── */
  dateShort(str) {
    if (!str) return '';
    const d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' }).toUpperCase();
  },
  dateLong(str) {
    if (!str) return '';
    const d = new Date(str + 'T12:00:00');
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
