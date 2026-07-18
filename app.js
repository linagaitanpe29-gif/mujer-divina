/* ── Mujer Divina · app.js ───────────────────────── */

const MD  = window.marked;
const YML = window.jsyaml;

/* ── SUPABASE CONFIG ─────────────────────────────────
   Reemplaza estos valores con los de tu proyecto Supabase:
   Dashboard → Project Settings → API                    */
const SUPABASE_URL  = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_KEY  = 'TU-ANON-PUBLIC-KEY';

/* ── RUTAS PÚBLICAS (sin login) ──────────────────── */
const PUBLIC_ROUTES = ['/', '/ingresar', '/registrarse', '/tienda'];

const App = {
  manifest: [],
  user:     null,
  sb:       null,   /* cliente Supabase */

  /* ── INIT ─────────────────────────────────────────── */
  async init() {
    /* Inicializar Supabase si las credenciales están configuradas */
    if (SUPABASE_URL !== 'https://TU-PROYECTO.supabase.co') {
      this.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    this.bindNav();
    await this.initAuth();
    await this.loadManifest();
    this.route();
    window.addEventListener('hashchange', () => this.route());
    document.getElementById('logo-link').addEventListener('click', () => {
      window.location.hash = '/';
    });
  },

  /* ── AUTH INIT ────────────────────────────────────── */
  async initAuth() {
    if (!this.sb) { this.hideAuthLoading(); return; }

    /* Sesión actual */
    const { data: { session } } = await this.sb.auth.getSession();
    this.user = session?.user ?? null;
    this.updateNavForUser();
    this.hideAuthLoading();

    /* Escuchar cambios de sesión */
    this.sb.auth.onAuthStateChange((event, session) => {
      this.user = session?.user ?? null;
      this.updateNavForUser();
      if (event === 'SIGNED_IN')  { window.location.hash = '/devocional'; }
      if (event === 'SIGNED_OUT') { window.location.hash = '/ingresar'; }
    });
  },

  hideAuthLoading() {
    document.getElementById('auth-loading')?.classList.add('hidden');
  },

  /* ── NAV ─────────────────────────────────────────── */
  bindNav() {
    const ham = document.getElementById('hamburger');
    const mob = document.getElementById('nav-mobile');
    ham.addEventListener('click', () => mob.classList.toggle('open'));
    document.querySelectorAll('.nav-link, .back-link, .btn-outline, .btn-gold[href]')
      .forEach(el => el.addEventListener('click', () => mob.classList.remove('open')));
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      e.preventDefault();
      window.location.hash = a.getAttribute('href').slice(1);
    });
    /* Logout */
    document.getElementById('nav-logout')?.addEventListener('click', () => this.logout());
    document.getElementById('nav-logout-mob')?.addEventListener('click', () => this.logout());
  },

  updateNavForUser() {
    const wrap    = document.getElementById('nav-user-wrap');
    const wrapMob = document.getElementById('nav-user-wrap-mob');
    const nameEl  = document.getElementById('nav-user-name');
    const nameMob = document.getElementById('nav-user-name-mob');

    if (this.user) {
      const nombre = this.user.user_metadata?.nombre
        || this.user.email.split('@')[0];
      if (nameEl)  nameEl.textContent  = nombre;
      if (nameMob) nameMob.textContent = nombre;
      wrap?.classList.remove('hidden');
      wrapMob?.classList.remove('hidden');
      /* Ocultar link "Comenzar" cuando ya hay sesión */
      document.querySelectorAll('.nav-cta').forEach(el => el.classList.add('hidden'));
    } else {
      wrap?.classList.add('hidden');
      wrapMob?.classList.add('hidden');
      document.querySelectorAll('.nav-cta').forEach(el => el.classList.remove('hidden'));
    }
  },

  async logout() {
    if (this.sb) await this.sb.auth.signOut();
    else { this.user = null; window.location.hash = '/ingresar'; }
  },

  /* ── ROUTER ───────────────────────────────────────── */
  route() {
    const hash = window.location.hash.replace('#', '') || '/';

    /* Supabase no configurado → modo demo sin auth */
    const authReady = !!this.sb;

    /* Proteger rutas privadas */
    if (authReady && !this.user && !PUBLIC_ROUTES.includes(hash)) {
      window.location.hash = '/ingresar';
      return;
    }
    /* Si ya hay sesión, no mostrar login/registro */
    if (authReady && this.user && ['/ingresar', '/registrarse'].includes(hash)) {
      window.location.hash = '/devocional';
      return;
    }

    this.hideAll();

    if (hash === '/' || hash === '') {
      this.show('page-tienda');
      this.initTienda();
    } else if (hash === '/devocional') {
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
    } else if (hash === '/ingresar') {
      this.show('page-login');
      this.bindLoginForm();
    } else if (hash === '/registrarse') {
      this.show('page-register');
      this.bindRegisterForm();
    } else if (hash === '/tienda') {
      this.show('page-tienda');
      this.initTienda();
    } else if (hash === '/roadmap') {
      this.show('page-roadmap');
      this.initRoadmap();
    } else {
      this.show('page-tienda');
      this.initTienda();
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  },

  hideAll() {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  },
  show(id) {
    document.getElementById(id)?.classList.remove('hidden');
  },

  /* ── TIENDA ───────────────────────────────────────── */
  initTienda() {
    const slides = document.getElementById('tienda-slides');
    const dotsWrap = document.getElementById('tienda-dots');
    if (!slides || this._tiendaInit) return;
    this._tiendaInit = true;

    const total = slides.children.length;
    let current = 0;

    dotsWrap.innerHTML = Array.from({length: total}, (_, i) =>
      `<div class="tienda-dot${i === 0 ? ' active' : ''}" data-i="${i}"></div>`
    ).join('');

    const go = (n) => {
      current = (n + total) % total;
      slides.style.transform = `translateX(-${current * 100}%)`;
      dotsWrap.querySelectorAll('.tienda-dot').forEach((d, i) =>
        d.classList.toggle('active', i === current)
      );
    };

    document.getElementById('tienda-prev').onclick = () => go(current - 1);
    document.getElementById('tienda-next').onclick = () => go(current + 1);
    dotsWrap.addEventListener('click', e => {
      if (e.target.dataset.i !== undefined) go(+e.target.dataset.i);
    });

    setInterval(() => go(current + 1), 4500);
  },

  /* ── LOGIN ────────────────────────────────────────── */
  bindLoginForm() {
    const form = document.getElementById('login-form');
    if (!form || form._bound) return;
    form._bound = true;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errEl    = document.getElementById('login-error');
      const btn      = form.querySelector('.auth-btn');

      this.authSetLoading(btn, errEl, 'Ingresando...');

      if (!this.sb) {
        this.authShowError(errEl, btn, 'Configura las credenciales de Supabase en app.js', 'Ingresar →');
        return;
      }

      const { error } = await this.sb.auth.signInWithPassword({ email, password });

      if (error) {
        this.authShowError(errEl, btn, this.authMsg(error.message), 'Ingresar →');
      }
      /* Si es correcto: onAuthStateChange redirige automáticamente */
    });
  },

  /* ── REGISTRO ─────────────────────────────────────── */
  bindRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form || form._bound) return;
    form._bound = true;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const nombre   = document.getElementById('register-name').value.trim();
      const email    = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;
      const errEl    = document.getElementById('register-error');
      const okEl     = document.getElementById('register-ok');
      const btn      = form.querySelector('.auth-btn');

      okEl.classList.add('hidden');
      this.authSetLoading(btn, errEl, 'Creando cuenta...');

      if (!this.sb) {
        this.authShowError(errEl, btn, 'Configura las credenciales de Supabase en app.js', 'Crear mi cuenta →');
        return;
      }

      const { data, error } = await this.sb.auth.signUp({
        email, password,
        options: { data: { nombre } }
      });

      if (error) {
        this.authShowError(errEl, btn, this.authMsg(error.message), 'Crear mi cuenta →');
        return;
      }

      /* Confirmación de email activada → mostrar mensaje */
      if (data.user && !data.session) {
        btn.disabled = false;
        btn.textContent = 'Crear mi cuenta →';
        okEl.textContent = '¡Revisa tu correo! Te enviamos un enlace de confirmación ✦';
        okEl.classList.remove('hidden');
      }
      /* Si email confirmation está desactivado → onAuthStateChange redirige */
    });
  },

  /* ── AUTH HELPERS ─────────────────────────────────── */
  authSetLoading(btn, errEl, label) {
    btn.disabled = true;
    btn.textContent = label;
    errEl.classList.add('hidden');
  },
  authShowError(errEl, btn, msg, btnLabel) {
    errEl.textContent = msg;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = btnLabel;
  },
  authMsg(msg) {
    const map = {
      'Invalid login credentials':       'Correo o contraseña incorrectos.',
      'Email not confirmed':             'Confirma tu correo antes de ingresar.',
      'User already registered':         'Este correo ya tiene una cuenta. Inicia sesión.',
      'Password should be at least 6':   'La contraseña debe tener al menos 6 caracteres.',
      'Unable to validate email address': 'Ingresa un correo válido.',
    };
    for (const [k, v] of Object.entries(map)) {
      if (msg.includes(k)) return v;
    }
    return msg;
  },

  /* ── SUSCRIPCIÓN ──────────────────────────────────── */
  bindSubscribe() {},   /* reservado para futuro */

  /* ── MANIFEST ─────────────────────────────────────── */
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

  /* ── HOME ─────────────────────────────────────────── */
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
    const heroCta = document.getElementById('hero-cta');
    if (heroCta) heroCta.setAttribute('href', `#/devocional/${d.slug}`);
    el.innerHTML = `
      <div class="today-editorial">
        <div class="today-ed-inner">
          <div class="today-ed-meta">
            ${d.categoria ? `<span class="today-ed-cat">${d.categoria}</span>` : ''}
            <span class="today-ed-date">${this.dateLong(d.date)}</span>
          </div>
          <h2 class="today-ed-title">${d.title}</h2>
          <div class="today-ed-verse">
            "${d.versiculo}"
            <cite>${d.referencia}</cite>
          </div>
          <a href="#/devocional/${d.slug}" class="btn btn-gold">Leer hoy →</a>
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
        ${d.categoria ? `<span class="card-category">${d.categoria}</span>` : ''}
        <p class="card-date">${this.dateShort(d.date)}</p>
        <h3 class="card-title">${d.title}</h3>
        <div class="card-verse">"${d.versiculo}"</div>
        <p class="card-ref">— ${d.referencia}</p>
      </a>`;
  },

  /* ── DEVOCIONAL INDIVIDUAL ────────────────────────── */
  async renderDevocional(slug) {
    const el = document.getElementById('devo-content');
    if (!el) return;
    el.innerHTML = '<div class="loading">Cargando devocional...</div>';

    const meta = this.manifest.find(d => d.slug === slug);
    if (!meta) { el.innerHTML = '<p class="loading">Devocional no encontrado.</p>'; return; }

    try {
      const res  = await fetch(`${slug}.md`);
      const text = await res.text();
      const { fm, body } = this.parseMD(text);

      const promesa = fm.promesa || meta.promesa || '';
      const oracion = fm.oracion || '';
      const intro   = fm.intro   || meta.intro || '';

      let html = `
        <div class="devo-meta">
          ${meta.categoria ? `<span class="devo-category-chip">${meta.categoria}</span>` : ''}
          <span class="devo-date">${this.dateLong(meta.date)}</span>
        </div>
        <h1 class="devo-title">${meta.title}</h1>
        <div class="devo-verse">
          <p>"${meta.versiculo}"</p>
          <cite>— ${meta.referencia}</cite>
        </div>
        ${intro ? `<p class="devo-intro">${intro}</p>` : ''}
        <div class="devo-body">${MD.parse(body)}</div>`;

      if (promesa) html += `
        <div class="promesa-wrap">
          <p class="promesa-label">Promesa para tu vida</p>
          <p class="promesa-text">${promesa}</p>
        </div>`;

      if (oracion) html += `
        <div class="prayer-wrap">
          <p class="prayer-label">Oración</p>
          <p class="prayer-text">${oracion}</p>
        </div>`;

      html += `
        <div class="closing-wrap">
          <p class="closing-declare">"Yo y mi casa serviremos a Jehová."</p>
          <p class="closing-ref">— Josué 24:15</p>
        </div>`;

      el.innerHTML = html;
    } catch (err) {
      el.innerHTML = '<p class="loading">Error al cargar el devocional.</p>';
      console.error(err);
    }
  },

  /* ── FRONTMATTER PARSER ───────────────────────────── */
  parseMD(text) {
    const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!m) return { fm: {}, body: text };
    let fm = {};
    try { fm = YML.load(m[1]) || {}; } catch { fm = {}; }
    return { fm, body: m[2].trim() };
  },

  /* ── FECHAS ───────────────────────────────────────── */
  dateShort(str) {
    if (!str) return '';
    const d = new Date(str + (str.length === 10 ? 'T12:00:00' : ''));
    return d.toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' }).toUpperCase();
  },
  dateLong(str) {
    if (!str) return '';
    const d = new Date(str + (str.length === 10 ? 'T12:00:00' : ''));
    const dias  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

/* ── CHECKOUT MODAL ───────────────────────────────── */
App._coWompi = '#';

App.openCheckout = function(product, price, wompiUrl) {
  App._coWompi = wompiUrl;
  document.getElementById('co-product-name').textContent = product;
  document.getElementById('co-product-price').textContent = price;
  document.getElementById('co-form').reset();
  const modal = document.getElementById('checkout-modal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

App.closeCheckout = function() {
  document.getElementById('checkout-modal').style.display = 'none';
  document.body.style.overflow = '';
};

App.submitCheckout = function(e) {
  e.preventDefault();
  const nombre    = document.getElementById('co-nombre').value.trim();
  const email     = document.getElementById('co-email').value.trim();
  const cel       = document.getElementById('co-cel').value.trim();
  const ciudad    = document.getElementById('co-ciudad').value.trim();
  const direccion = document.getElementById('co-direccion').value.trim();
  const notas     = document.getElementById('co-notas').value.trim();
  const producto  = document.getElementById('co-product-name').textContent;
  const precio    = document.getElementById('co-product-price').textContent;

  // Enviar datos a Formspree (se activa cuando Lina vincule el endpoint)
  // fetch('https://formspree.io/f/XXXXXXXX', { method:'POST', ... })

  App.closeCheckout();
  if (App._coWompi && App._coWompi !== '#') {
    window.open(App._coWompi, '_blank');
  } else {
    alert('El link de pago estará disponible muy pronto. ¡Gracias por tu interés!');
  }
};

function switchImg(mainId, thumb) {
  document.getElementById(mainId).src = thumb.src;
  thumb.closest('.prod-gallery').querySelectorAll('.prod-thumb')
    .forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
}

/* ── ROADMAP (Sistema CREA) ───────────────────────────── */
App.initRoadmap = function() {
  if (this._roadmapInit) return;
  this._roadmapInit = true;

  /* Fecha */
  const fechaEl = document.getElementById('roadmap-fecha');
  if (fechaEl) {
    const d = new Date();
    const meses = ['enero','febrero','marzo','abril','mayo','junio',
      'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    fechaEl.textContent = `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  }

  /* Navegación CREA */
  document.querySelectorAll('.crea-next-btn').forEach(btn => {
    btn.addEventListener('click', () => App._creaGoto(+btn.dataset.goto));
  });
  document.querySelectorAll('.crea-back-btn').forEach(btn => {
    btn.addEventListener('click', () => App._creaGoto(+btn.dataset.goto));
  });

  /* Persistencia contenteditable */
  document.querySelectorAll('[data-key]').forEach(el => {
    const k = 'crea_' + el.dataset.key;
    const saved = localStorage.getItem(k);
    if (saved) el.textContent = saved;
    el.addEventListener('input', () => localStorage.setItem(k, el.textContent));
  });

  /* Área pivote */
  document.querySelectorAll('.pivot-btn').forEach(btn => {
    const k = 'crea_estructura-area';
    if (localStorage.getItem(k) === btn.dataset.area) btn.classList.add('selected');
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pivot-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      localStorage.setItem(k, btn.dataset.area);
    });
  });

  /* Write-lines */
  document.querySelectorAll('.write-lines').forEach(wrap => {
    const n = +wrap.dataset.lines || 3;
    const k = wrap.dataset.key;
    const saved = JSON.parse(localStorage.getItem('crea_lines_' + k) || '[]');
    wrap.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const div = document.createElement('div');
      div.className = 'write-line';
      div.contentEditable = 'true';
      div.dataset.placeholder = 'Escribe aquí...';
      if (saved[i]) div.textContent = saved[i];
      div.addEventListener('input', () => {
        const vals = [...wrap.querySelectorAll('.write-line')].map(d => d.textContent);
        localStorage.setItem('crea_lines_' + k, JSON.stringify(vals));
      });
      wrap.appendChild(div);
    }
  });

  /* Mapa radial SVG */
  App._initMap();

  /* Tracker NAVI */
  App._initTracker();

  /* Meta anclaje en sección A */
  App._syncTrackerMeta();
};

App._creaGoto = function(step) {
  const ids = ['crea-c','crea-r','crea-e','crea-a'];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', i + 1 !== step);
  });
  document.querySelectorAll('.rp-step').forEach(s => {
    s.classList.toggle('active', +s.dataset.step <= step);
  });
  if (step === 4) App._syncTrackerMeta();
  document.querySelector('.roadmap-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

App._syncTrackerMeta = function() {
  const el = document.getElementById('tracker-meta-display');
  if (!el) return;
  const accion   = localStorage.getItem('crea_meta-accion') || '___';
  const proposito= localStorage.getItem('crea_meta-proposito') || '___';
  el.innerHTML = `En 21 días voy a <strong>${accion}</strong> para que <strong>${proposito}</strong>`;
};

/* ── MAPA RADIAL ─────────────────────────────────────── */
App._initMap = function() {
  const svg = document.getElementById('map-svg');
  if (!svg) return;

  const CX = 300, CY = 300, ARM = 200, N = 5;
  const AREAS = ['Proyecto\nde vida','Negocio','Dinero','Pareja','Cuerpo'];
  const ANGLES = [-90, -18, 54, 126, 198]; // grados

  let mode = 'hoy'; // 'hoy' | 'ella'
  const statesHoy  = JSON.parse(localStorage.getItem('map_hoy')  || '[5,5,5,5,5]');
  const statesElla = JSON.parse(localStorage.getItem('map_ella') || '[9,9,9,9,9]');
  const MAX = 10;

  const toXY = (angle, r) => {
    const rad = (angle * Math.PI) / 180;
    return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
  };

  /* Grid lines */
  svg.innerHTML = '';
  for (let level = 2; level <= 10; level += 2) {
    const pts = ANGLES.map(a => toXY(a, (ARM * level) / MAX));
    const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
    poly.setAttribute('points', pts.map(p => p.join(',')).join(' '));
    poly.setAttribute('class', 'map-grid');
    svg.appendChild(poly);
  }

  /* Arms */
  ANGLES.forEach((a, i) => {
    const [ex, ey] = toXY(a, ARM);
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1', CX); line.setAttribute('y1', CY);
    line.setAttribute('x2', ex); line.setAttribute('y2', ey);
    line.setAttribute('class', 'map-arm');
    svg.appendChild(line);
    /* Label */
    const [lx, ly] = toXY(a, ARM + 28);
    const text = document.createElementNS('http://www.w3.org/2000/svg','text');
    text.setAttribute('x', lx); text.setAttribute('y', ly);
    text.setAttribute('class', 'map-label');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    AREAS[i].split('\n').forEach((line, li) => {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg','tspan');
      tspan.setAttribute('x', lx);
      tspan.setAttribute('dy', li === 0 ? '0' : '1.2em');
      tspan.textContent = line;
      text.appendChild(tspan);
    });
    svg.appendChild(text);
  });

  /* Centro */
  const centerCircle = document.createElementNS('http://www.w3.org/2000/svg','circle');
  centerCircle.setAttribute('cx', CX); centerCircle.setAttribute('cy', CY);
  centerCircle.setAttribute('r', 18); centerCircle.setAttribute('class', 'map-center');
  svg.appendChild(centerCircle);
  const centerText = document.createElementNS('http://www.w3.org/2000/svg','text');
  centerText.setAttribute('x', CX); centerText.setAttribute('y', CY);
  centerText.setAttribute('class', 'map-center-text');
  centerText.setAttribute('text-anchor', 'middle');
  centerText.setAttribute('dominant-baseline', 'middle');
  centerText.textContent = 'Dios';
  svg.appendChild(centerText);

  /* Polígono ella (fondo dorado) */
  const polyElla = document.createElementNS('http://www.w3.org/2000/svg','polygon');
  polyElla.setAttribute('class', 'map-poly-ella');
  svg.appendChild(polyElla);

  /* Polígono hoy (relleno rosa) */
  const polyHoy = document.createElementNS('http://www.w3.org/2000/svg','polygon');
  polyHoy.setAttribute('class', 'map-poly-hoy');
  svg.appendChild(polyHoy);

  /* Puntos arrastrables */
  const dots = ANGLES.map((a, i) => {
    const dot = document.createElementNS('http://www.w3.org/2000/svg','circle');
    dot.setAttribute('r', 10);
    dot.setAttribute('class', 'map-dot map-dot-hoy');
    svg.appendChild(dot);
    return dot;
  });

  const render = () => {
    /* Polígono hoy */
    const ptsHoy = ANGLES.map((a, i) => toXY(a, (ARM * statesHoy[i]) / MAX));
    polyHoy.setAttribute('points', ptsHoy.map(p => p.join(',')).join(' '));
    /* Polígono ella */
    const ptsElla = ANGLES.map((a, i) => toXY(a, (ARM * statesElla[i]) / MAX));
    polyElla.setAttribute('points', ptsElla.map(p => p.join(',')).join(' '));
    /* Dots */
    const states = mode === 'hoy' ? statesHoy : statesElla;
    dots.forEach((dot, i) => {
      const [dx, dy] = toXY(ANGLES[i], (ARM * states[i]) / MAX);
      dot.setAttribute('cx', dx); dot.setAttribute('cy', dy);
      dot.setAttribute('class', mode === 'hoy' ? 'map-dot map-dot-hoy' : 'map-dot map-dot-ella');
    });
  };

  /* Drag en SVG */
  let dragging = null;
  dots.forEach((dot, i) => {
    dot.addEventListener('mousedown', e => { dragging = i; e.preventDefault(); });
    dot.addEventListener('touchstart', e => { dragging = i; e.preventDefault(); }, { passive: false });
  });
  const onMove = (ex, ey) => {
    if (dragging === null) return;
    const rect = svg.getBoundingClientRect();
    const sx = (ex - rect.left) * (600 / rect.width) - CX;
    const sy = (ey - rect.top)  * (600 / rect.height) - CY;
    const arm_angle = ANGLES[dragging] * Math.PI / 180;
    let proj = sx * Math.cos(arm_angle) + sy * Math.sin(arm_angle);
    proj = Math.max(0, Math.min(ARM, proj));
    const val = Math.round((proj / ARM) * MAX);
    if (mode === 'hoy') { statesHoy[dragging] = val; localStorage.setItem('map_hoy', JSON.stringify(statesHoy)); }
    else { statesElla[dragging] = val; localStorage.setItem('map_ella', JSON.stringify(statesElla)); }
    render();
  };
  svg.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
  svg.addEventListener('mouseup', () => { dragging = null; });
  svg.addEventListener('touchmove', e => {
    const t = e.touches[0];
    onMove(t.clientX, t.clientY);
  }, { passive: false });
  svg.addEventListener('touchend', () => { dragging = null; });

  /* Toggle modo */
  document.getElementById('map-btn-hoy')?.addEventListener('click', () => {
    mode = 'hoy';
    document.getElementById('map-btn-hoy').classList.add('active');
    document.getElementById('map-btn-ella').classList.remove('active');
    render();
  });
  document.getElementById('map-btn-ella')?.addEventListener('click', () => {
    mode = 'ella';
    document.getElementById('map-btn-ella').classList.add('active');
    document.getElementById('map-btn-hoy').classList.remove('active');
    render();
  });

  render();
};

/* ── TRACKER NAVI ────────────────────────────────────── */
const HABIT_DEFAULTS = [
  { type: 'conexion',     name: 'Oración y lectura' },
  { type: 'ejecucion',    name: 'Acción de mi meta' },
  { type: 'sostenimiento',name: 'Descanso intencional' },
];

App._trackerData = JSON.parse(localStorage.getItem('navi_habits') || 'null') || HABIT_DEFAULTS.map(h => ({
  ...h, states: Array(21).fill(0)
}));

App._saveTracker = function() {
  localStorage.setItem('navi_habits', JSON.stringify(App._trackerData));
};

App._initTracker = function() {
  const container = document.getElementById('tracker-habits');
  if (!container) return;
  container.innerHTML = '';
  App._trackerData.forEach((habit, hi) => App._renderHabitRow(container, habit, hi));
  App._updateTrackerStats();
};

App._renderHabitRow = function(container, habit, hi) {
  const row = document.createElement('div');
  row.className = `tracker-row tracker-row-${habit.type}`;
  row.dataset.hi = hi;

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'tracker-habit-name';
  nameInput.value = habit.name;
  nameInput.placeholder = 'Nombre del hábito';
  nameInput.addEventListener('input', () => {
    App._trackerData[hi].name = nameInput.value;
    App._saveTracker();
  });

  const circles = document.createElement('div');
  circles.className = 'tracker-circles';

  let clickTimer = null;
  for (let d = 0; d < 21; d++) {
    const c = document.createElement('div');
    c.className = 'tracker-circle';
    App._updateCircleEl(c, habit.states[d]);
    c.addEventListener('click', () => {
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        App._trackerData[hi].states[d] = App._trackerData[hi].states[d] === 1 ? 0 : 1;
        App._updateCircleEl(c, App._trackerData[hi].states[d]);
        App._saveTracker();
        App._updateTrackerStats();
      }, 180);
    });
    c.addEventListener('dblclick', () => {
      clearTimeout(clickTimer);
      App._trackerData[hi].states[d] = App._trackerData[hi].states[d] === 2 ? 0 : 2;
      App._updateCircleEl(c, App._trackerData[hi].states[d]);
      App._saveTracker();
      App._updateTrackerStats();
    });
    circles.appendChild(c);
  }

  row.appendChild(nameInput);
  row.appendChild(circles);
  container.appendChild(row);
};

App._updateCircleEl = function(el, state) {
  el.className = 'tracker-circle';
  if (state === 1) el.classList.add('full');
  if (state === 2) el.classList.add('essential');
};

App._updateTrackerStats = function() {
  const statsEl = document.getElementById('tracker-stats');
  if (!statsEl) return;
  let completas = 0, esenciales = 0, total = 0;
  App._trackerData.forEach(h => h.states.forEach(s => {
    total++;
    if (s === 1) completas++;
    if (s === 2) esenciales++;
  }));
  const pct = total ? Math.round(((completas + esenciales) / total) * 100) : 0;
  statsEl.innerHTML = `
    <span class="stat-item"><strong>${completas}</strong> Completas</span>
    <span class="stat-item essential"><strong>${esenciales}</strong> Esenciales</span>
    <span class="stat-item pct"><strong>${pct}%</strong> Avance</span>`;
};

App.addHabit = function(type) {
  App._trackerData.push({ type, name: '', states: Array(21).fill(0) });
  App._saveTracker();
  const container = document.getElementById('tracker-habits');
  App._renderHabitRow(container, App._trackerData[App._trackerData.length - 1], App._trackerData.length - 1);
};
