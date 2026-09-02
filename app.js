/* ── Mujer Divina · app.js ───────────────────────── */

const MD  = window.marked;
const YML = window.jsyaml;

/* ── SUPABASE CONFIG ─────────────────────────────────
   Reemplaza estos valores con los de tu proyecto Supabase:
   Dashboard → Project Settings → API                    */
const SUPABASE_URL  = 'https://jrkauaukgvcdnmaslsvb.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impya2F1YXVrZ3ZjZG5tYXNsc3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNjM0NDIsImV4cCI6MjA5OTkzOTQ0Mn0.Z3EeRrx0w6vVciW7gwcjhkJr41rTE90BYuNNoHFN6S8';

/* ── WOMPI (cobro del total del carrito) ─────────────
   La llave pública es segura para el frontend. El secreto de integridad va
   en Vercel (WOMPI_INTEGRITY_SECRET) y solo lo usa /api/wompi-firma. */
const WOMPI_PUBLIC_KEY = 'pub_prod_QV1Tx9canrUStOWLfqcaAj9gJxi2yiWZ';

/* ── RUTAS PÚBLICAS (sin login) ──────────────────── */
/* Solo /roadmap requiere login — todo lo demás es público */
const PUBLIC_ROUTES = ['/', '/ingresar', '/registrarse', '/tienda', '/devocional', '/archivo', '/gracias', '/curso'];

/* ── CORREOS APROBADOS para El Mapa de Ella ──────── */
const APPROVED_EMAILS = [
  'valentinalzate1@gmail.com',
  'estefanip345@gmail.com',
  'anadeliapatinobotero@gmail.com',
  'korague.97@outlook.com',
  'ylpaez@hotmail.com',
  'luz.fr94@gmail.com',
  'yeslie-galvan@hotmail.com',
  'sstvanessagiraldoj@gmail.com',
  'julianitaosorio92@gmail.com',
  'lizbenjumea@gmail.com',
  'kiana.acevedo@gmail.com',
  'kalimupica@gmail.com',
  'luciafonseca.expo@gmail.com',
  'mariacristinaort@gmail.com',
  'natarethc@gmail.com',
  'luzdmoreno2026@gmail.com',
  'vs4744042@gmail.com',
  'linagaitanpe29@gmail.com',
];

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
    this.checkWompiReturn();   // ¿volvemos de un pago Wompi? (?id=... en la URL)
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
      if (event === 'SIGNED_IN')  { window.location.hash = '/roadmap'; }
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
      const href = a.getAttribute('href');
      if (!href.startsWith('#/')) return; // scroll anchors (e.g. #tienda-productos) pass through
      e.preventDefault();
      window.location.hash = href.slice(1);
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
    document.title = 'Mujer Divina — Devocional Diario';

    /* Supabase no configurado → modo demo sin auth */
    const authReady = !!this.sb;

    /* Proteger rutas privadas — solo /roadmap requiere login */
    const isPublic = PUBLIC_ROUTES.includes(hash)
      || hash.startsWith('/devocional/') || hash.startsWith('/producto/');
    if (authReady && !this.user && !isPublic) {
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
    } else if (hash.startsWith('/producto/')) {
      const slug = hash.replace('/producto/', '');
      this.show('page-producto');
      this.renderProducto(slug);
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
    } else if (hash === '/curso') {
      this.show('page-curso');
    } else if (hash === '/gracias') {
      this.show('page-gracias');
      this.confirmarPago();
      if (this._wompiReturnId) {
        this.verificarPagoWompi(this._wompiReturnId);
      } else if (this._wompiPagoReturn) {
        // Regreso del link de un producto: se muestra "¡Gracias!" + aviso de spam
        // y se envía la confirmación (Wompi solo redirige al completar el pago).
        this._wompiPagoReturn = false;
        this.confirmarPagoAuto();
      }
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
    this.decorarTienda();
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

      /* Verificar que el correo esté en la lista aprobada */
      if (!APPROVED_EMAILS.includes(email.toLowerCase())) {
        this.authShowError(errEl, btn, 'Tu correo no está registrado para este evento. Escríbele a Lina para verificar.', 'Crear mi cuenta →');
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

/* Tarifas de envío (COP) por CATEGORÍA de destino (campo `z` en ciudades.js) × TAMAÑO
   del paquete. tamaño = '2kg' si el pedido lleva Kit; si no, '1kg' (Biblia/Caja/Índices).
   Tarifas reales tomadas de guías de Interrapidísimo (jul 2026). El envío se SUMA
   al total y se cobra en línea junto con el producto. */
const ENVIO_TARIFAS = {
  metro:         { '1kg': 15000, '2kg': 15000, op: 'Domiciliario propio' },
  regional:      { '1kg': 12500, '2kg': 16900, op: 'Interrapidísimo' },
  metropolitano: { '1kg': 18500, '2kg': 23400, op: 'Interrapidísimo' },
  municipal:     { '1kg': 20900, '2kg': 25800, op: 'Interrapidísimo' },
};

// ¿El pedido actual (producto único o carrito) lleva Kit? → define el tamaño (2kg)
App.pedidoTieneKit = function() {
  if (App._carritoMode) return App.cart.get().some(i => /kit/i.test(i.slug));
  const nameEl = document.getElementById('co-product-name');
  return /kit/i.test(nameEl ? nameEl.textContent : '');
};

// Calcula el envío según la categoría de la ciudad y si el pedido lleva Kit
App.calcularEnvio = function(zona, tieneKit) {
  const t = ENVIO_TARIFAS[zona] || ENVIO_TARIFAS.municipal;
  if (typeof tieneKit === 'undefined') tieneKit = App.pedidoTieneKit();
  return { valor: t[tieneKit ? '2kg' : '1kg'], op: t.op };
};

// Quita tildes y pasa a minúsculas para buscar sin importar acentos
function _normCiudad(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// Buscador de ciudad con autocompletado sobre el listado completo de municipios
App.filtrarCiudades = function() {
  const input = document.getElementById('co-ciudad-input');
  const list  = document.getElementById('co-ciudad-list');
  const q = _normCiudad(input.value);
  // Al escribir se anula cualquier selección previa hasta elegir de la lista
  document.getElementById('co-ciudad').value = '';
  document.getElementById('co-envio-info').style.display = 'none';

  if (typeof CIUDADES_CO === 'undefined') { list.style.display = 'none'; return; }
  if (q.length < 2) { list.style.display = 'none'; return; }

  // Prioriza las que empiezan por lo escrito, luego las que lo contienen
  const empiezan = [], contienen = [];
  for (const c of CIUDADES_CO) {
    const n = _normCiudad(c.n);
    if (n.startsWith(q)) empiezan.push(c);
    else if (n.includes(q)) contienen.push(c);
    if (empiezan.length >= 40) break;
  }
  const res = empiezan.concat(contienen).slice(0, 40);

  if (!res.length) {
    list.innerHTML = '<li class="co-ac-empty">No encontramos esa ciudad</li>';
    list.style.display = 'block';
    return;
  }
  list.innerHTML = res.map(c =>
    `<li class="co-ac-item" onmousedown="App.seleccionarCiudad('${
      encodeURIComponent(c.n)}','${encodeURIComponent(c.d)}','${c.z}')">` +
    `<span class="co-ac-city">${c.n}</span> <span class="co-ac-dep">${c.d}</span></li>`
  ).join('');
  list.style.display = 'block';
};

App.seleccionarCiudad = function(nEnc, dEnc, zona) {
  const n = decodeURIComponent(nEnc), d = decodeURIComponent(dEnc);
  document.getElementById('co-ciudad-input').value = `${n}, ${d}`;
  document.getElementById('co-ciudad').value = `${n}, ${d}|${zona}`;
  document.getElementById('co-ciudad-list').style.display = 'none';
  App.updateEnvio();
};

App.updateEnvio = function() {
  const val = document.getElementById('co-ciudad').value;
  const info = document.getElementById('co-envio-info');
  const precioEl = document.getElementById('co-envio-precio');
  const labelEl = document.querySelector('#co-envio-info .co-envio-label');
  if (!val) {
    info.style.display = 'none';
    App._coEnvioValor = undefined;
    App.actualizarTotalPagar();
    return;
  }
  const zona = val.split('|')[1];
  const e = App.calcularEnvio(zona);
  App._coEnvioValor = e.valor;
  if (labelEl) labelEl.textContent = `Envío (${e.op}):`;
  precioEl.textContent = `${App.formatCOP(e.valor)} · incluido en tu pago`;
  info.style.display = 'flex';
  App.actualizarTotalPagar();
};

// Total real a pagar: producto(s) + complemento (si lo agregó) + envío (si ya eligió ciudad)
App.actualizarTotalPagar = function() {
  const totalRow = document.getElementById('co-total-row');
  const totalEl = document.getElementById('co-total');
  if (!totalRow || !totalEl) return;
  if (typeof App._coEnvioValor === 'undefined') { totalRow.style.display = 'none'; return; }
  let base = App._coBaseCents || 0;
  const upCb = document.getElementById('co-upsell');
  if (upCb && upCb.checked && App._coUpsell) base += App._coUpsell.precio * 100;
  totalEl.textContent = App.formatCOP(base / 100 + App._coEnvioValor);
  totalRow.style.display = 'flex';
};

App.openCheckout = function(product, price, wompiUrl) {
  App._carritoMode = false;
  App._coWompi = wompiUrl;
  document.getElementById('co-product-name').textContent = product;
  document.getElementById('co-product-price').textContent = price;
  document.getElementById('co-form').reset();
  document.getElementById('co-envio-info').style.display = 'none';
  App._coEnvioValor = undefined;
  const _tr = document.getElementById('co-total-row'); if (_tr) _tr.style.display = 'none';
  document.getElementById('co-ciudad').value = '';
  document.getElementById('co-ciudad-input').value = '';
  const list = document.getElementById('co-ciudad-list');
  if (list) { list.style.display = 'none'; list.innerHTML = ''; }
  // Cross-sell contextual: el complemento depende del producto que se compra
  App._coBaseLabel = price;
  App._coBaseCents = parsePrecio(price) * 100;
  App.setUpsellOffer(App.upsellFor(product), 'a');
  App.setUpsellOffer(App.upsellForB(product), 'b');
  const modal = document.getElementById('checkout-modal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

// Checkout de TODO el carrito (varios productos, un solo total)
App.openCheckoutCarrito = function() {
  const items = App.cart.get();
  if (!items.length) return;
  App._carritoMode = true;
  App._coWompi = '#'; // el cobro del total por Wompi se activa con las llaves (pendiente)
  document.getElementById('co-product-name').textContent = 'Tu pedido';
  document.getElementById('co-product-price').textContent =
    `${App.formatCOP(App.cart.total())} · ${App.cart.count()} producto(s)`;
  document.getElementById('co-form').reset();
  document.getElementById('co-envio-info').style.display = 'none';
  App._coEnvioValor = undefined;
  const _tr2 = document.getElementById('co-total-row'); if (_tr2) _tr2.style.display = 'none';
  document.getElementById('co-ciudad').value = '';
  document.getElementById('co-ciudad-input').value = '';
  const list = document.getElementById('co-ciudad-list');
  if (list) { list.style.display = 'none'; list.innerHTML = ''; }
  // Cross-sell contextual del carrito: ofrece un complemento que aún no esté en el pedido
  App._coBaseLabel = document.getElementById('co-product-price').textContent;
  App._coBaseCents = App.cart.total() * 100;
  App.setUpsellOffer(App.upsellForCart(items), 'a');
  App.setUpsellOffer(App.upsellForCartB(items), 'b');
  const modal = document.getElementById('checkout-modal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

// Catálogo de complementos (cross-sell). precio en pesos.
App.UPSELLS = {
  indices: {
    slug: 'indices-biblicos', nombre: 'Índices Bíblicos', precio: 29000,
    img: 'fotos/productos/stickers-1.jpeg',
    tit: '¿Quieres agregar tus Índices Bíblicos? 📑',
    desc: 'Los stickers con el nombre de cada libro para encontrar tus pasajes al instante en tu Biblia.'
  },
  cuaderno: {
    slug: 'cuaderno-devocional', nombre: 'Cuaderno Devocional', precio: 59000,
    img: 'fotos/productos/cuaderno-portada.jpg',
    tit: '¿Quieres complementarlo con tu Cuaderno Devocional? 📖',
    desc: 'Para que con cada promesa que recibas hagas tu devocional y vivas tu día con la Palabra de Dios.'
  },
  promesas: {
    slug: 'caja-de-promesas', nombre: 'Caja de Promesas', precio: 85000,
    img: 'fotos/productos/promesas-caja.jpg',
    tit: '¿Quieres acompañarlo con tu Caja de Promesas? 🎁',
    desc: 'Para acompañar tus devocionales en la mañana y recibir la Palabra de Dios que Él tiene para ti ese día.'
  },
  lapicero: {
    slug: 'lapicero-md', nombre: 'Lapicero MD', precio: 12000,
    img: 'fotos/productos/lapicero-md.jpg',
    tit: '¿Quieres agregar tu Lapicero MD? ✒️',
    desc: 'El lapicero dorado con grabado "Mujer Divina", perfecto para escribir en tu Cuaderno Devocional.'
  }
};

// Devuelve el complemento principal a ofrecer según el producto (o null) — ranura A
App.upsellFor = function(name) {
  const n = (name || '').toLowerCase();
  if (/[íi]ndices/.test(n)) return null;          // no se ofrece a sí mismo
  if (/promesas/.test(n))   return App.UPSELLS.cuaderno;
  if (/cuaderno/.test(n))   return App.UPSELLS.promesas;
  if (/biblia|kit/.test(n)) return App.UPSELLS.indices;
  return null;
};

// Segundo complemento (ranura B) — por ahora, solo el Lapicero al comprar el Cuaderno
App.upsellForB = function(name) {
  const n = (name || '').toLowerCase();
  if (/cuaderno/.test(n) && !/lapicero/.test(n)) return App.UPSELLS.lapicero;
  return null;
};

// Para el carrito: ofrece el primer complemento que NO esté ya en el pedido (ranura A)
App.upsellForCart = function(items) {
  const has = s => items.some(i => new RegExp(s, 'i').test(i.slug));
  if (has('promesas') && !has('cuaderno')) return App.UPSELLS.cuaderno;
  if (has('cuaderno') && !has('promesas')) return App.UPSELLS.promesas;
  if ((has('biblia') || has('kit')) && !has('indices')) return App.UPSELLS.indices;
  return null;
};

// Segundo complemento del carrito (ranura B) — Lapicero si hay Cuaderno y no lo lleva
App.upsellForCartB = function(items) {
  const has = s => items.some(i => new RegExp(s, 'i').test(i.slug));
  if (has('cuaderno') && !has('lapicero')) return App.UPSELLS.lapicero;
  return null;
};

// Configura la tarjeta del complemento (imagen, textos, precio) y la muestra u oculta.
// slot: 'a' (ranura principal) o 'b' (segunda ranura, ej. Lapicero con el Cuaderno).
App.setUpsellOffer = function(offer, slot) {
  const suf = slot === 'b' ? '-b' : '';
  if (slot === 'b') App._coUpsellB = offer || null; else App._coUpsell = offer || null;
  const wrap = document.getElementById('co-upsell-wrap' + suf);
  const cb   = document.getElementById('co-upsell' + suf);
  const yes  = document.getElementById('co-upsell-yes' + suf);
  const no   = document.getElementById('co-upsell-no' + suf);
  if (cb) cb.checked = false;
  if (yes) yes.classList.remove('active');
  if (no)  no.classList.remove('active');
  const added = document.getElementById('co-upsell-added' + suf);
  if (added) added.style.display = 'none';
  if (!offer) { if (wrap) wrap.style.display = 'none'; return; }
  const img = document.getElementById('co-upsell-img' + suf);
  const tit = document.getElementById('co-upsell-tit' + suf);
  const desc = document.getElementById('co-upsell-desc' + suf);
  if (img)  { img.src = offer.img; img.alt = offer.nombre; }
  if (tit)  tit.textContent = offer.tit;
  if (desc) desc.innerHTML = `${offer.desc} <strong>Por solo ${App.formatCOP(offer.precio)}</strong>`;
  if (yes)  yes.textContent = `Sí, agregar (+${App.formatCOP(offer.precio)})`;
  if (no)   no.textContent = 'No, gracias';
  if (wrap) wrap.style.display = 'flex';
};

// Botones "Sí, agregar" / "No, gracias" del cross-sell (slot: 'a' o 'b')
App.setUpsell = function(v, slot) {
  const suf = slot === 'b' ? '-b' : '';
  const cb  = document.getElementById('co-upsell' + suf);
  const yes = document.getElementById('co-upsell-yes' + suf);
  const no  = document.getElementById('co-upsell-no' + suf);
  const added = document.getElementById('co-upsell-added' + suf);
  const off = slot === 'b' ? App._coUpsellB : App._coUpsell;
  if (cb) cb.checked = v;
  if (yes) yes.classList.toggle('active', v);
  if (no)  no.classList.toggle('active', !v);
  // Confirmación visible junto al botón (para que se note que sí se agregó)
  if (v && off) {
    if (yes) yes.textContent = '✓ Agregado';
    if (added) {
      added.innerHTML = `✓ ¡Listo! Sumamos tu <strong>${off.nombre}</strong> a tu pedido (+${App.formatCOP(off.precio)}).`;
      added.style.display = 'block';
    }
  } else {
    if (yes && off) yes.textContent = `Sí, agregar (+${App.formatCOP(off.precio)})`;
    if (added) added.style.display = 'none';
  }
  App.toggleUpsell();
};

// Al elegir Sí/No en cualquiera de las dos ranuras, recalcula el total mostrado
App.toggleUpsell = function() {
  const priceEl = document.getElementById('co-product-price');
  if (!priceEl) return;
  const cbA = document.getElementById('co-upsell');
  const cbB = document.getElementById('co-upsell-b');
  const extras = [];
  let extraCents = 0;
  if (cbA && cbA.checked && App._coUpsell) {
    extras.push(`${App._coUpsell.nombre} ${App.formatCOP(App._coUpsell.precio)}`);
    extraCents += App._coUpsell.precio * 100;
  }
  if (cbB && cbB.checked && App._coUpsellB) {
    extras.push(`${App._coUpsellB.nombre} ${App.formatCOP(App._coUpsellB.precio)}`);
    extraCents += App._coUpsellB.precio * 100;
  }
  if (extras.length) {
    const total = (App._coBaseCents || 0) + extraCents;
    priceEl.innerHTML = `${App._coBaseLabel} &nbsp;+&nbsp; ${extras.join(' &nbsp;+&nbsp; ')} &nbsp;=&nbsp; <strong>${App.formatCOP(total / 100)}</strong>`;
  } else {
    priceEl.textContent = App._coBaseLabel || '';
  }
  App.actualizarTotalPagar();
};

// Cierra la lista de sugerencias al tocar fuera del campo
document.addEventListener('click', function(e) {
  const field = document.querySelector('.co-ciudad-field');
  const list = document.getElementById('co-ciudad-list');
  if (list && field && !field.contains(e.target)) list.style.display = 'none';
});

App.closeCheckout = function() {
  document.getElementById('checkout-modal').style.display = 'none';
  document.body.style.overflow = '';
  App._carritoMode = false;
};

App.submitCheckout = function(e) {
  e.preventDefault();
  const modoCarrito = App._carritoMode;
  const nombre    = document.getElementById('co-nombre').value.trim();
  const email     = document.getElementById('co-email').value.trim();
  const cel       = document.getElementById('co-cel').value.trim();
  const cedula    = document.getElementById('co-cedula').value.trim();
  const ciudadVal = document.getElementById('co-ciudad').value;
  // La ciudad debe elegirse de la lista (obligatorio)
  if (!ciudadVal) {
    alert('Por favor busca y selecciona tu ciudad de la lista.');
    document.getElementById('co-ciudad-input').focus();
    App.filtrarCiudades();
    return;
  }
  const ciudad = ciudadVal.split('|')[0];
  const zona   = ciudadVal.split('|')[1];

  // Dirección estructurada (nomenclatura colombiana)
  const viaTipo  = document.getElementById('co-via-tipo').value;
  const viaNum   = document.getElementById('co-via-num').value.trim();
  const viaSec   = document.getElementById('co-via-sec').value.trim();
  const viaPlaca = document.getElementById('co-via-placa').value.trim();
  const barrio   = document.getElementById('co-barrio').value.trim();
  const direccion = `${viaTipo} ${viaNum} # ${viaSec}-${viaPlaca}, Barrio ${barrio}`;
  const notas     = document.getElementById('co-notas').value.trim();

  // Producto(s): un solo producto o el carrito completo
  let producto, precio, esKit;
  if (modoCarrito) {
    const items = App.cart.get();
    producto = items.map(i => {
      const p = App.productoInfo(i.slug);
      return `${i.qty}× ${p ? p.nombre : i.slug} (${App.formatCOP(p ? p.precio * i.qty : 0)})`;
    }).join('  +  ');
    precio = `${App.formatCOP(App.cart.total())} (${App.cart.count()} productos)`;
    esKit = items.some(i => /kit/i.test(i.slug));
  } else {
    producto = document.getElementById('co-product-name').textContent;
    precio   = App._coBaseLabel || document.getElementById('co-product-price').textContent;
    esKit    = /kit/i.test(producto);
  }

  const notasFinal = notas;

  // Cross-sell: si eligió agregar algún complemento (ranura A y/o B), se suma al total
  const upWrapA = document.getElementById('co-upsell-wrap');
  const upCbA   = document.getElementById('co-upsell');
  const addUpsellA = !!(upWrapA && upWrapA.style.display !== 'none' && upCbA && upCbA.checked && App._coUpsell);
  const upWrapB = document.getElementById('co-upsell-wrap-b');
  const upCbB   = document.getElementById('co-upsell-b');
  const addUpsellB = !!(upWrapB && upWrapB.style.display !== 'none' && upCbB && upCbB.checked && App._coUpsellB);
  const addUpsell = addUpsellA || addUpsellB;

  let payCents = modoCarrito ? App.cart.total() * 100 : (App._coBaseCents || parsePrecio(precio) * 100);
  const extrasNombres = [];
  if (addUpsellA) { payCents += App._coUpsell.precio * 100; extrasNombres.push(`${App._coUpsell.nombre} (${App.formatCOP(App._coUpsell.precio)})`); }
  if (addUpsellB) { payCents += App._coUpsellB.precio * 100; extrasNombres.push(`${App._coUpsellB.nombre} (${App.formatCOP(App._coUpsellB.precio)})`); }
  if (extrasNombres.length) {
    producto = `${producto}  +  ${extrasNombres.map(x => x.replace(/\s*\(.*\)$/, '')).join('  +  ')}`;
    precio   = `${App.formatCOP(payCents / 100)} — incluye ${extrasNombres.join(', ')}`;
  }

  // Envío: categoría de la ciudad × tamaño (Kit = 2kg) — se SUMA al pago en línea
  const envInfo    = App.calcularEnvio(zona, esKit);
  const envioValor = envInfo.valor;
  payCents += envioValor * 100;
  const envioTxt = `${App.formatCOP(envioValor)} — ${envInfo.op} (incluido en tu pago)`;
  precio = `${precio} + envío ${App.formatCOP(envioValor)} = ${App.formatCOP(payCents / 100)}`;

  const referencia = 'MD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const pedido = { producto, precio, nombre, email_cliente: email, cel, cedula,
    // Alias de la cédula por si la plantilla de EmailJS usa otro nombre de variable
    Cedula: cedula, cédula: cedula, documento: cedula,
    // Barrio como variable aparte (además de ir dentro de la dirección)
    barrio, Barrio: barrio,
    ciudad, direccion, notas: notasFinal, envio: envioTxt, referencia,
    // Alias de la ciudad bajo varios nombres para que la plantilla de EmailJS
    // muestre el nombre de la ciudad sin importar cómo esté escrita la variable.
    city: ciudad, Ciudad: ciudad, ciudad_cliente: ciudad };
  localStorage.setItem('md_pedido_pendiente', JSON.stringify(pedido));

  // Ya NO se manda aviso de "carrito" (lead). El correo a Camila sale SOLO cuando el
  // pago se confirma (VENTA PAGADA), automático al volver de Wompi o con "Ya realicé mi pago".

  App.closeCheckout();

  // TODA compra (un producto, carrito o con complemento) se cobra por Wompi Web
  // Checkout: es el único flujo que CONFIRMA SOLO al volver (?id=...). Los links fijos
  // de cada producto ya no se usan para pagar: dependían de que la clienta volviera a
  // tocar "Ya realicé mi pago", y si cerraba la pestaña de Wompi, la venta se perdía
  // sin dejar rastro (ni correo, ni registro).
  App.pagarCarritoWompi(pedido, payCents, referencia);
};

// Guarda el pedido en Supabase ANTES de ir a pagar (referencia + datos completos).
// Con la llave anon el frontend SOLO puede insertar (RLS), nunca leer pedidos ajenos.
// Esto es lo que permite que el webhook de Wompi (servidor a servidor) encuentre el
// pedido y mande los correos SOLO, sin depender de que la clienta vuelva al navegador.
//
// IMPORTANTE: si esto falla, el webhook de Wompi jamás va a encontrar el pedido (aunque
// el pago se apruebe), así que se manda una alerta por correo con todos los datos como
// último respaldo — para que la venta no se pierda en silencio.
App.guardarPedido = async function(pedido, amountInCents, referencia) {
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/pedidos`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        referencia, estado: 'pendiente',
        monto_centavos: amountInCents,
        email_cliente: pedido.email_cliente || null,
        datos: pedido
      })
    });
    if (!resp.ok) {
      const detalle = await resp.text().catch(() => '');
      console.error('guardarPedido: Supabase respondió error', resp.status, detalle);
      App._alertarFalloGuardado(pedido, referencia, `HTTP ${resp.status}: ${detalle}`);
    }
  } catch (e) {
    console.error('guardarPedido: fetch falló', e);
    App._alertarFalloGuardado(pedido, referencia, e.message || 'fetch falló');
  }
};

// Alerta de respaldo: si el pedido no se pudo guardar en Supabase, el webhook nunca lo
// va a encontrar. Se manda este correo con todos los datos para no perder la venta.
App._alertarFalloGuardado = function(pedido, referencia, detalleError) {
  try {
    fetch('/api/enviar-correo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'camila',
        pedido: Object.assign({}, pedido, { referencia }),
        estado: `⚠️ ALERTA — no se pudo guardar el pedido en Supabase (${detalleError}). Si esta venta se paga, el webhook NO la va a confirmar sola: hay que revisarla manualmente en Wompi → Transacciones con la referencia ${referencia}.`
      })
    }).catch(function () {});
  } catch (e) {}
};

// Redirige a Wompi para cobrar el total del carrito (con firma segura del servidor)
App.pagarCarritoWompi = async function(pedido, amountInCents, referencia) {
  await App.guardarPedido(pedido, amountInCents, referencia);
  try {
    const resp = await fetch('/api/wompi-firma', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: referencia, amountInCents: String(amountInCents), currency: 'COP' })
    });
    if (!resp.ok) throw new Error('firma no disponible');
    const { signature } = await resp.json();
    if (!signature) throw new Error('sin firma');

    const params = new URLSearchParams({
      'public-key': WOMPI_PUBLIC_KEY,
      'currency': 'COP',
      'amount-in-cents': String(amountInCents),
      'reference': referencia,
      'signature:integrity': signature,
      'redirect-url': location.origin + location.pathname, // Wompi agrega ?id=...&env=...
      'customer-data:email': pedido.email_cliente || '',
      'customer-data:full-name': pedido.nombre || '',
      'customer-data:phone-number': (pedido.cel || '').replace(/\D/g, ''),
      'customer-data:legal-id': (pedido.cedula || '').replace(/\D/g, ''),
      'customer-data:legal-id-type': 'CC'
    });
    window.location.href = 'https://checkout.wompi.co/p/?' + params.toString();
  } catch (e) {
    // Si aún no está activo el pago en línea (p. ej. falta el secreto en Vercel),
    // no se pierde el pedido: queda el lead y se usa la confirmación manual.
    alert('Estamos activando el pago en línea. Tu pedido quedó guardado y te contactaremos para completarlo. 🌸');
    window.location.hash = '/gracias';
  }
};

// Inscripción al Programa Mujer Divina → cobra por Wompi Web Checkout
App.inscribirCurso = function(e) {
  e.preventDefault();
  const nombre = document.getElementById('cu-nombre').value.trim();
  const email  = document.getElementById('cu-email').value.trim();
  const cel    = document.getElementById('cu-cel').value.trim();
  const cedula = document.getElementById('cu-cedula').value.trim();

  const referencia = 'MD-CURSO-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const pedido = {
    producto: 'Programa Mujer Divina — Vuelve a ser quien Dios te diseñó',
    precio: '$797.000', nombre, email_cliente: email, email, correo: email,
    cel, cedula, Cedula: cedula, ciudad: '—', direccion: 'Programa online (acceso por correo)',
    envio: 'No aplica (programa online)', referencia,
    city: '—', Ciudad: '—', ciudad_cliente: '—'
  };
  localStorage.setItem('md_pedido_pendiente', JSON.stringify(pedido));

  // Ya NO se manda aviso de inscripción (lead). El correo sale SOLO cuando el pago
  // del Programa se confirma en Wompi (VENTA PAGADA).

  App.pagarCarritoWompi(pedido, 797000 * 100, referencia); // $797.000 → centavos
};

// Al volver de Wompi (redirect con ?id=...), verifica el pago y confirma automáticamente
App.checkWompiReturn = function() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const pago = params.get('pago'); // link de redirección de los pagos de un producto
  if (!id && !pago) return;
  if (id) {
    App._wompiReturnId = id;
    App._wompiEnv = params.get('env');
  } else if (pago) {
    // Volvió del link de pago de un producto (Wompi redirige tras completar el pago)
    App._wompiPagoReturn = true;
  }
  // Limpia la URL y deja a la clienta en /gracias (con el aviso de spam / confirmación)
  history.replaceState(null, '', location.origin + location.pathname + '#/gracias');
};

App.verificarPagoWompi = async function(id) {
  App._wompiReturnId = null; // evita re-verificar
  const btn  = document.getElementById('gracias-confirm-btn');
  const done = document.getElementById('gracias-done');
  const ver  = document.getElementById('gracias-verificando');
  if (btn)  btn.style.display = 'none';
  if (done) done.style.display = 'none';
  if (ver)  ver.style.display = 'block';
  try {
    const base = App._wompiEnv === 'test'
      ? 'https://sandbox.wompi.co/v1/transactions/'
      : 'https://production.wompi.co/v1/transactions/';
    const r = await fetch(base + id);
    const j = await r.json();
    const status = j && j.data && j.data.status;
    if (ver) ver.style.display = 'none';
    if (status === 'APPROVED') {
      App.confirmarPagoAuto();
    } else {
      // Pago no aprobado: el carrito se conserva para reintentar
      if (btn) btn.style.display = 'inline-block';
      const t = document.getElementById('gracias-title');
      if (t) t.textContent = 'Tu pago no se completó';
    }
  } catch (e) {
    if (ver) ver.style.display = 'none';
    if (btn) btn.style.display = 'inline-block'; // cae al flujo manual
  }
};

// Confirma la venta (usado por el retorno automático y por el botón manual).
// Llama a /api/confirmar-venta, que es IDEMPOTENTE: si el webhook de Wompi ya marcó
// el pedido como pagado y mandó los correos, esta llamada no los duplica.
App._enviarVenta = function(p) {
  try {
    fetch('/api/confirmar-venta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referencia: p.referencia, pedido: p })
    }).catch(function () {});
  } catch (e) {}
};

App.confirmarPagoAuto = function() {
  const raw = localStorage.getItem('md_pedido_pendiente');
  if (raw) {
    localStorage.removeItem('md_pedido_pendiente');
    App._enviarVenta(JSON.parse(raw));
  }
  if (App.cart) App.cart.save([]); // vacía el carrito ya pagado
  const done = document.getElementById('gracias-done');
  const btn  = document.getElementById('gracias-confirm-btn');
  if (btn)  btn.style.display = 'none';
  if (done) done.style.display = 'block';
};

// La clienta confirma que ya pagó → recién ahí se registra la VENTA
App.confirmarPagoManual = function() {
  const raw = localStorage.getItem('md_pedido_pendiente');
  if (!raw) return;
  localStorage.removeItem('md_pedido_pendiente');
  App._enviarVenta(JSON.parse(raw));

  // Feedback visual
  const btn = document.getElementById('gracias-confirm-btn');
  const done = document.getElementById('gracias-done');
  if (btn) btn.style.display = 'none';
  if (done) done.style.display = 'block';
};

App.confirmarPago = function() {
  // Reinicia el estado de la página de gracias en cada visita
  const btn = document.getElementById('gracias-confirm-btn');
  const done = document.getElementById('gracias-done');
  const hasPedido = !!localStorage.getItem('md_pedido_pendiente');
  if (btn) btn.style.display = hasPedido ? 'inline-block' : 'none';
  if (done) done.style.display = 'none';
};

function switchImg(mainId, thumb) {
  const gallery = thumb.closest('.prod-gallery');
  // Busca la imagen principal por posición (no por id) para que también
  // funcione en la página individual del producto, que es un clon.
  const main = gallery.querySelector('.prod-gallery-main img')
    || document.getElementById(mainId);
  if (main) main.src = thumb.src;
  gallery.querySelectorAll('.prod-thumb').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
}

/* ── PRODUCTO INDIVIDUAL (link propio por producto) ───── */
// Agrega a cada producto de la tienda su link "Ver página del producto"
App.decorarTienda = function() {
  document.querySelectorAll('#page-tienda [data-slug]').forEach(card => {
    if (card.querySelector('.prod-share-row')) return; // ya decorado
    const slug = card.getAttribute('data-slug');
    const cta = card.querySelector('.prod-cta, .kit-dark-cta');
    if (!cta) return;
    // Botón "Agregar al carrito" (onclick inline para que también funcione en el clon)
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn prod-addcart';
    addBtn.textContent = '🛒 Agregar al carrito';
    addBtn.setAttribute('onclick', `App.cart.add('${slug}')`);
    cta.insertAdjacentElement('afterend', addBtn);

    const row = document.createElement('div');
    row.className = 'prod-share-row';
    row.innerHTML =
      `<a class="prod-verlink" href="#/producto/${slug}">Ver página del producto →</a>`;
    addBtn.insertAdjacentElement('afterend', row);

    // Al dar clic sobre la foto principal o el nombre, se abre la página del producto
    const abrir = () => { window.location.hash = '/producto/' + slug; };
    card.querySelectorAll('.prod-gallery-main, .prod-name, .kit-dark-img, .kit-dark-title')
      .forEach(el => { el.classList.add('prod-clickable'); el.addEventListener('click', abrir); });
  });
};

// Muestra un solo producto (clona su tarjeta de la tienda para no duplicar contenido)
App.renderProducto = function(slug) {
  this.decorarTienda();
  const cont = document.getElementById('producto-detail');
  const src = document.querySelector(`#page-tienda [data-slug="${slug}"]`);
  if (!src || !cont) { window.location.hash = '/tienda'; return; }
  const clone = src.cloneNode(true);
  clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
  // En su propia página ya no tiene sentido "abrir el producto" ni el enlace redundante
  clone.querySelectorAll('.prod-clickable').forEach(el => el.classList.remove('prod-clickable'));
  const ver = clone.querySelector('.prod-verlink');
  if (ver) ver.remove();
  cont.innerHTML = '';
  cont.appendChild(clone);
  const nombre = src.querySelector('.prod-name, .kit-dark-title');
  document.title = nombre ? `${nombre.textContent} · Mujer Divina` : 'Mujer Divina';
};

/* ── CARRITO ─────────────────────────────────────────── */
function parsePrecio(txt) { return parseInt(String(txt).replace(/[^\d]/g, ''), 10) || 0; }
App.formatCOP = function(n) { return '$' + (n || 0).toLocaleString('es-CO'); };

// Info de un producto leída de su tarjeta en la tienda (no duplica datos)
App.productoInfo = function(slug) {
  const card = document.querySelector(`#page-tienda [data-slug="${slug}"]`);
  if (!card) return null;
  const esKit = card.classList.contains('s-kit-dark');
  const nombre = card.querySelector(esKit ? '.kit-dark-title' : '.prod-name')?.textContent.trim() || 'Producto';
  const precioTxt = card.querySelector(esKit ? '.kit-dark-price' : '.prod-price')?.textContent.trim() || '';
  const img = card.querySelector(esKit ? '.kit-dark-img img' : '.prod-gallery-main img')?.getAttribute('src') || '';
  return { slug, nombre, precioTxt, precio: parsePrecio(precioTxt), img };
};

App.cart = {
  KEY: 'md_cart',
  get() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch { return []; } },
  save(items) { localStorage.setItem(this.KEY, JSON.stringify(items)); this.render(); },
  count() { return this.get().reduce((s, i) => s + i.qty, 0); },
  total() { return this.get().reduce((s, i) => { const p = App.productoInfo(i.slug); return s + (p ? p.precio * i.qty : 0); }, 0); },

  add(slug) {
    const items = this.get();
    const f = items.find(i => i.slug === slug);
    if (f) f.qty += 1; else items.push({ slug, qty: 1 });
    this.save(items);
    this.open();
  },
  setQty(slug, qty) {
    let items = this.get();
    if (qty <= 0) items = items.filter(i => i.slug !== slug);
    else { const f = items.find(i => i.slug === slug); if (f) f.qty = qty; }
    this.save(items);
  },
  remove(slug) { this.save(this.get().filter(i => i.slug !== slug)); },

  open() {
    this.render();
    document.getElementById('cart-drawer')?.classList.add('open');
    const ov = document.getElementById('cart-overlay'); if (ov) ov.style.display = 'block';
    document.body.style.overflow = 'hidden';
  },
  close() {
    document.getElementById('cart-drawer')?.classList.remove('open');
    const ov = document.getElementById('cart-overlay'); if (ov) ov.style.display = 'none';
    document.body.style.overflow = '';
  },

  render() {
    const items = this.get();
    const badge = document.getElementById('cart-count');
    const n = this.count();
    if (badge) { badge.textContent = n; badge.hidden = n === 0; }

    const cont = document.getElementById('cart-items');
    const empty = document.getElementById('cart-empty');
    const foot = document.getElementById('cart-foot');
    if (!cont) return;
    if (!items.length) {
      cont.innerHTML = '';
      if (empty) empty.style.display = 'flex';
      if (foot) foot.style.display = 'none';
      return;
    }
    if (empty) empty.style.display = 'none';
    if (foot) foot.style.display = 'block';
    cont.innerHTML = items.map(i => {
      const p = App.productoInfo(i.slug);
      if (!p) return '';
      return `<div class="cart-item">
        <img src="${p.img}" alt="" class="cart-item-img" />
        <div class="cart-item-info">
          <p class="cart-item-name">${p.nombre}</p>
          <p class="cart-item-price">${App.formatCOP(p.precio)}</p>
          <div class="cart-qty">
            <button type="button" onclick="App.cart.setQty('${i.slug}', ${i.qty - 1})" aria-label="Menos">−</button>
            <span>${i.qty}</span>
            <button type="button" onclick="App.cart.setQty('${i.slug}', ${i.qty + 1})" aria-label="Más">+</button>
          </div>
        </div>
        <button type="button" class="cart-item-remove" onclick="App.cart.remove('${i.slug}')" aria-label="Quitar">✕</button>
      </div>`;
    }).join('');
    const totalEl = document.getElementById('cart-total');
    if (totalEl) totalEl.textContent = App.formatCOP(this.total());
  },

  checkout() {
    if (!this.get().length) return;
    this.close();
    App.openCheckoutCarrito();
  },
};

document.addEventListener('DOMContentLoaded', () => App.cart.render());

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

  /* Esferas — persistencia de campos */
  document.querySelectorAll('[data-key^="esf-"]').forEach(el => {
    const k = 'crea_' + el.dataset.key;
    const saved = localStorage.getItem(k);
    if (saved) el.textContent = saved;
    el.addEventListener('input', () => localStorage.setItem(k, el.textContent));
  });

  /* Líneas addables — identidad */
  App._initAddableLines('identidad-es-lines',      'identidad-es',      3);
  App._initAddableLines('identidad-suenos-lines',   'identidad-suenos',  3);
  App._initAddableLines('identidad-acciones-lines', 'identidad-acciones',3);

  /* Metas múltiples */
  App._initMetas();

  /* Líneas soltando/recibiendo */
  App._initAddableLines('soltando-lines', 'rinde-soltando', 3);
  App._initAddableLines('recibiendo-lines', 'rinde-recibiendo', 3);

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
  const svg     = document.getElementById('map-svg');
  const ratingW = document.getElementById('map-rating-wrap');
  if (!svg || !ratingW) return;

  const CX = 300, CY = 300, ARM = 210, N = 5;
  const AREAS  = ['Proyecto de vida','Negocio','Dinero','Relaciones\n& Familia','Cuerpo'];
  const ANGLES = [-90, -18, 54, 126, 198];
  const MAX    = 10;

  let mode = 'hoy';
  const statesHoy  = JSON.parse(localStorage.getItem('map_hoy')  || '[5,5,5,5,5]');
  const statesElla = JSON.parse(localStorage.getItem('map_ella') || '[8,8,8,8,8]');

  const toXY = (angle, r) => {
    const rad = angle * Math.PI / 180;
    return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
  };

  /* ── Construir SVG ── */
  svg.innerHTML = '';
  /* Grid */
  for (let lv = 2; lv <= 10; lv += 2) {
    const pts = ANGLES.map(a => toXY(a, ARM * lv / MAX));
    const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
    poly.setAttribute('points', pts.map(p=>p.join(',')).join(' '));
    poly.setAttribute('class','map-grid');
    svg.appendChild(poly);
  }
  /* Arms + labels */
  ANGLES.forEach((a, i) => {
    const [ex,ey] = toXY(a, ARM);
    const ln = document.createElementNS('http://www.w3.org/2000/svg','line');
    ln.setAttribute('x1',CX); ln.setAttribute('y1',CY);
    ln.setAttribute('x2',ex); ln.setAttribute('y2',ey);
    ln.setAttribute('class','map-arm');
    svg.appendChild(ln);
    const [lx,ly] = toXY(a, ARM + 32);
    const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
    txt.setAttribute('x',lx); txt.setAttribute('y',ly);
    txt.setAttribute('class','map-label');
    txt.setAttribute('text-anchor','middle');
    txt.setAttribute('dominant-baseline','middle');
    AREAS[i].split('\n').forEach((seg,si) => {
      const ts = document.createElementNS('http://www.w3.org/2000/svg','tspan');
      ts.setAttribute('x',lx);
      ts.setAttribute('dy', si === 0 ? '0' : '1.25em');
      ts.textContent = seg;
      txt.appendChild(ts);
    });
    svg.appendChild(txt);
  });
  /* Centro */
  const cc = document.createElementNS('http://www.w3.org/2000/svg','circle');
  cc.setAttribute('cx',CX); cc.setAttribute('cy',CY); cc.setAttribute('r',20);
  cc.setAttribute('class','map-center'); svg.appendChild(cc);
  const ct = document.createElementNS('http://www.w3.org/2000/svg','text');
  ct.setAttribute('x',CX); ct.setAttribute('y',CY);
  ct.setAttribute('class','map-center-text');
  ct.setAttribute('text-anchor','middle'); ct.setAttribute('dominant-baseline','middle');
  ct.textContent='Dios'; svg.appendChild(ct);
  /* Polígonos */
  const polyElla = document.createElementNS('http://www.w3.org/2000/svg','polygon');
  polyElla.setAttribute('class','map-poly-ella'); svg.appendChild(polyElla);
  const polyHoy  = document.createElementNS('http://www.w3.org/2000/svg','polygon');
  polyHoy.setAttribute('class','map-poly-hoy');  svg.appendChild(polyHoy);

  const render = () => {
    const ptsH = ANGLES.map((a,i) => toXY(a, ARM * statesHoy[i]  / MAX));
    const ptsE = ANGLES.map((a,i) => toXY(a, ARM * statesElla[i] / MAX));
    polyHoy.setAttribute('points',  ptsH.map(p=>p.join(',')).join(' '));
    polyElla.setAttribute('points', ptsE.map(p=>p.join(',')).join(' '));
    /* Actualizar rating rows */
    const rw = document.getElementById('map-rating-wrap');
    if (rw) rw.classList.toggle('mode-ella', mode === 'ella');
    document.querySelectorAll('.map-rating-row').forEach((row,i) => {
      const val = mode === 'hoy' ? statesHoy[i] : statesElla[i];
      row.querySelectorAll('.map-score-dot').forEach((dot,di) => {
        dot.classList.toggle('active', di < val);
      });
    });
  };

  /* ── Rating rows ── */
  ratingW.innerHTML = '';
  AREAS.forEach((area, i) => {
    const row = document.createElement('div');
    row.className = 'map-rating-row';
    const label = document.createElement('span');
    label.className = 'map-rating-label';
    label.textContent = area.replace('\n',' ');
    row.appendChild(label);
    const dots = document.createElement('div');
    dots.className = 'map-score-dots';
    for (let d = 1; d <= 10; d++) {
      const dot = document.createElement('button');
      dot.className = 'map-score-dot';
      dot.title = d;
      dot.addEventListener('click', () => {
        const states = mode === 'hoy' ? statesHoy : statesElla;
        states[i] = d;
        localStorage.setItem(mode === 'hoy' ? 'map_hoy' : 'map_ella', JSON.stringify(states));
        render();
      });
      dots.appendChild(dot);
    }
    row.appendChild(dots);
    ratingW.appendChild(row);
  });

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

/* ── METAS MÚLTIPLES ─────────────────────────────────── */
App._initMetas = function() {
  const container = document.getElementById('metas-container');
  const addBtn    = document.getElementById('add-meta-btn');
  if (!container || !addBtn) return;

  const saved = JSON.parse(localStorage.getItem('crea_metas') || 'null')
    || [{ accion:'', proposito:'', gloria:'' }];
  App._metasData = saved;

  const saveAll = () => localStorage.setItem('crea_metas', JSON.stringify(App._metasData));

  const renderMeta = (idx) => {
    const m = App._metasData[idx];
    const wrap = document.createElement('div');
    wrap.className = 'goal-formula meta-block';
    wrap.dataset.idx = idx;
    if (idx > 0) {
      const sep = document.createElement('div');
      sep.className = 'meta-sep';
      sep.textContent = `Meta ${idx + 1}`;
      wrap.appendChild(sep);
    }
    const fields = [
      { key:'accion',    pre:'En 21 días voy a',         ph:'lograr / avanzar en / comenzar...' },
      { key:'proposito', pre:'para que',                  ph:'el propósito más profundo...' },
      { key:'gloria',    pre:'y así glorificar a Dios en',ph:'tu área de impacto...' },
    ];
    fields.forEach(f => {
      const lbl = document.createElement('span');
      lbl.className = 'gf-label'; lbl.textContent = f.pre;
      const inp = document.createElement('div');
      inp.className = 'gf-input';
      inp.contentEditable = 'true';
      inp.dataset.placeholder = f.ph;
      if (m[f.key]) inp.textContent = m[f.key];
      inp.addEventListener('input', () => {
        App._metasData[idx][f.key] = inp.textContent;
        saveAll();
      });
      wrap.appendChild(lbl);
      wrap.appendChild(inp);
    });
    container.appendChild(wrap);
  };

  App._metasData.forEach((_, i) => renderMeta(i));

  addBtn.addEventListener('click', () => {
    App._metasData.push({ accion:'', proposito:'', gloria:'' });
    saveAll();
    renderMeta(App._metasData.length - 1);
  });
};

/* ── LÍNEAS AÑADIBLES ────────────────────────────────── */
App._initAddableLines = function(containerId, storageKey, initialCount) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const saved = JSON.parse(localStorage.getItem('addable_' + storageKey) || '[]');
  const count  = Math.max(initialCount, saved.length);
  for (let i = 0; i < count; i++) {
    App._addLine(containerId, storageKey, saved[i] || '');
  }
};

App._addLine = function(containerId, storageKey, initialValue) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'write-line';
  div.contentEditable = 'true';
  div.dataset.placeholder = 'Escribe aquí...';
  if (initialValue) div.textContent = initialValue;
  div.addEventListener('input', () => {
    const vals = [...container.querySelectorAll('.write-line')].map(d => d.textContent);
    localStorage.setItem('addable_' + storageKey, JSON.stringify(vals));
  });
  container.appendChild(div);
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
