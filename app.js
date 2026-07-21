/* ── Mujer Divina · app.js ───────────────────────── */

const MD  = window.marked;
const YML = window.jsyaml;

/* ── SUPABASE CONFIG ─────────────────────────────────
   Reemplaza estos valores con los de tu proyecto Supabase:
   Dashboard → Project Settings → API                    */
const SUPABASE_URL  = 'https://jrkauaukgvcdnmaslsvb.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impya2F1YXVrZ3ZjZG5tYXNsc3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNjM0NDIsImV4cCI6MjA5OTkzOTQ0Mn0.Z3EeRrx0w6vVciW7gwcjhkJr41rTE90BYuNNoHFN6S8';

/* ── RUTAS PÚBLICAS (sin login) ──────────────────── */
/* Solo /roadmap requiere login — todo lo demás es público */
const PUBLIC_ROUTES = ['/', '/ingresar', '/registrarse', '/tienda', '/devocional', '/archivo', '/gracias'];

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
    } else if (hash === '/gracias') {
      this.show('page-gracias');
      this.confirmarPago();
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

const ENVIO_LINKS = {
  medellin: { label: '$8.000', url: 'https://checkout.wompi.co/l/epJaH2' },
  metro:    { label: '$10.000', url: 'https://checkout.wompi.co/l/yFKej2' },
  nacional: { label: '$15.000', url: 'https://checkout.wompi.co/l/QKt9FC' },
  lejano:   { label: '$22.000', url: 'https://checkout.wompi.co/l/T9t7vH' },
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
  if (!val) { info.style.display = 'none'; return; }
  const zona = val.split('|')[1];
  const envio = ENVIO_LINKS[zona];
  precioEl.textContent = `${envio.label} · se paga al recibir`;
  info.style.display = 'flex';
};

App.openCheckout = function(product, price, wompiUrl) {
  App._coWompi = wompiUrl;
  document.getElementById('co-product-name').textContent = product;
  document.getElementById('co-product-price').textContent = price;
  document.getElementById('co-form').reset();
  document.getElementById('co-envio-info').style.display = 'none';
  // La cartica personalizada solo aplica al Kit Mujer Divina
  const cartaWrap = document.getElementById('co-carta-wrap');
  if (cartaWrap) cartaWrap.style.display = /kit/i.test(product) ? 'block' : 'none';
  document.getElementById('co-ciudad').value = '';
  document.getElementById('co-ciudad-input').value = '';
  const list = document.getElementById('co-ciudad-list');
  if (list) { list.style.display = 'none'; list.innerHTML = ''; }
  const modal = document.getElementById('checkout-modal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
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
};

App.submitCheckout = function(e) {
  e.preventDefault();
  const nombre    = document.getElementById('co-nombre').value.trim();
  const email     = document.getElementById('co-email').value.trim();
  const cel       = document.getElementById('co-cel').value.trim();
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
  const producto  = document.getElementById('co-product-name').textContent;
  const precio    = document.getElementById('co-product-price').textContent;
  const envio     = ENVIO_LINKS[zona];

  const envioTxt = `${envio.label} (se paga contra entrega)`;

  // Cartica personalizada (solo Kit Mujer Divina)
  const esKit = /kit/i.test(producto);
  let carta_nombre = '', carta_nota = '', notasFinal = notas;
  if (esKit) {
    carta_nombre = document.getElementById('co-carta-nombre').value.trim();
    carta_nota   = document.getElementById('co-carta-nota').value.trim();
    const partes = [];
    if (carta_nombre) partes.push(`carta dirigida a: ${carta_nombre}`);
    if (carta_nota)   partes.push(`dedicatoria: ${carta_nota}`);
    if (partes.length) {
      // Se incrusta también en "notas" para que Camila lo vea sí o sí en el correo
      const cartaTxt = `🎁 CARTICA PERSONALIZADA — ${partes.join(' · ')}`;
      notasFinal = [cartaTxt, notas].filter(Boolean).join('  |  ');
    }
  }

  const pedido = { producto, precio, nombre, email_cliente: email, cel,
    ciudad, direccion, notas: notasFinal, envio: envioTxt,
    // Datos de la cartica (por si quieres usarlos como variables aparte en EmailJS)
    carta_nombre, carta_nota,
    // Alias de la ciudad bajo varios nombres para que la plantilla de EmailJS
    // muestre el nombre de la ciudad sin importar cómo esté escrita la variable.
    city: ciudad, Ciudad: ciudad, ciudad_cliente: ciudad };
  localStorage.setItem('md_pedido_pendiente', JSON.stringify(pedido));

  // SOLO aviso de CARRITO (lead). Aún NO es una venta: la clienta todavía no ha pagado.
  emailjs.send('service_zptlabd', 'template_6fwpfzf', Object.assign({}, pedido, {
    estado: '🛒 CARRITO — la clienta llenó sus datos pero AÚN NO ha pagado. Si no te llega un correo de "✅ VENTA PAGADA" para este pedido, es un abandono de carrito: contáctala para cerrar la venta.'
  }));

  App.closeCheckout();
  // Se manda a pagar el producto y se lleva a la página de gracias
  if (App._coWompi && App._coWompi !== '#') {
    window.open(App._coWompi, '_blank');
  }
  window.location.hash = '/gracias';
};

// La clienta confirma que ya pagó → recién ahí se registra la VENTA
App.confirmarPagoManual = function() {
  const raw = localStorage.getItem('md_pedido_pendiente');
  if (!raw) return;
  localStorage.removeItem('md_pedido_pendiente');
  const p = JSON.parse(raw);

  // Aviso a Camila: VENTA PAGADA
  emailjs.send('service_zptlabd', 'template_6fwpfzf', Object.assign({}, p, {
    estado: '✅ VENTA PAGADA — la clienta confirmó que ya pagó el producto en Wompi. Verifica en Wompi → Transacciones y despacha. El envío lo paga contra entrega.'
  }));
  // Confirmación a la clienta
  emailjs.send('service_zptlabd', 'template_1ypsbzc', {
    producto: p.producto, precio: p.precio, nombre: p.nombre,
    email_cliente: p.email_cliente, ciudad: p.ciudad,
    city: p.ciudad, Ciudad: p.ciudad, ciudad_cliente: p.ciudad,
    direccion: p.direccion, envio: p.envio
  });

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
// Agrega a cada producto de la tienda su link "Ver página" y "Copiar enlace"
App.decorarTienda = function() {
  document.querySelectorAll('#page-tienda [data-slug]').forEach(card => {
    if (card.querySelector('.prod-share-row')) return; // ya decorado
    const slug = card.getAttribute('data-slug');
    const cta = card.querySelector('.prod-cta, .kit-dark-cta');
    if (!cta) return;
    const row = document.createElement('div');
    row.className = 'prod-share-row';
    row.innerHTML =
      `<a class="prod-verlink" href="#/producto/${slug}">Ver página del producto →</a>` +
      `<button type="button" class="prod-sharebtn" onclick="App.copiarLink('${slug}', this)">🔗 Copiar enlace</button>`;
    cta.insertAdjacentElement('afterend', row);

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

// Copia al portapapeles el link propio del producto
App.copiarLink = function(slug, btn) {
  const url = `${location.origin}${location.pathname}#/producto/${slug}`;
  const feedback = () => {
    const prev = btn.getAttribute('data-label') || btn.textContent;
    btn.setAttribute('data-label', prev);
    btn.textContent = '✓ ¡Enlace copiado!';
    btn.classList.add('copiado');
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.textContent = prev; btn.classList.remove('copiado'); }, 2200);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(feedback).catch(() => prompt('Copia este enlace:', url));
  } else {
    prompt('Copia este enlace:', url);
  }
};

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
