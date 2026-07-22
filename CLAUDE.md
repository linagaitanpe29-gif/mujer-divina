# Mujer Divina — Guía del Proyecto

> **Para Claude:** Este archivo contiene todo el contexto para continuar el trabajo en este proyecto desde cualquier dispositivo. Léelo completo antes de hacer cambios.

Mujer Divina es una plataforma devocional cristiana para mujeres (20–40 años), con
una **tienda** de productos físicos y una sección de crecimiento espiritual
("El Mapa de Ella"). Todo en español, tono íntimo y pastoral.

---

## 1. Qué es y dónde vive

- **Sitio en producción:** https://mujerdivina.app y https://devocional.mujerdivina.app
  (ambos dominios sirven la MISMA app desde el mismo proyecto de Vercel).
- **Hosting:** Vercel (proyecto `mujer-divina`). Cada `git push` a `main` despliega
  automáticamente en ~1 minuto.
- **Dominio:** `mujerdivina.app` comprado en GoDaddy, apuntando a Vercel.
- **Repositorio:** `git@github.com:linagaitanpe29-gif/mujer-divina.git`

### Cómo se despliega (push con la llave SSH del proyecto)
```bash
cd /Users/lina/Documents/mujer-divina
git add .
git commit -m "descripción del cambio"
GIT_SSH_COMMAND="ssh -i /Users/lina/.ssh/mujer_divina_key -o StrictHostKeyChecking=no" git push origin main
```
> La llave `mujer_divina_key` está en `~/.ssh/` del computador de Lina. Sin ella el push falla.

---

## 2. Arquitectura (sencilla a propósito)

- **SPA en HTML/CSS/JS puro** — sin frameworks. Ruteo por hash (`#/...`).
- Archivos clave:
  - `index.html` — todas las páginas (secciones `<section class="page">`).
  - `app.js` — lógica: router, auth, tienda/checkout, roadmap, devocionales.
  - `styles.css` — todos los estilos.
  - `build.js` — genera `manifest.json` a partir de los `.md` de `devocionales/`.
  - `devocionales/*.md` — devocionales (frontmatter + markdown). Ver skill `devocional`.

### Rutas (hash routing)
| Ruta | Página | Requiere login |
|------|--------|----------------|
| `#/` y `#/tienda` | Tienda (inicio) | No |
| `#/devocional` | Devocional del día | No |
| `#/archivo` | Archivo de devocionales | No |
| `#/devocional/<slug>` | Devocional específico | No |
| `#/producto/<slug>` | Página propia de un producto (link compartible) | No |
| `#/gracias` | Página post-pago | No |
| `#/roadmap` | El Mapa de Ella (Sistema CREA) | **Sí** |
| `#/ingresar`, `#/registrarse` | Login / registro | No |

Solo `#/roadmap` es privada. La lista está en `PUBLIC_ROUTES` (arriba de `app.js`).

**Páginas propias por producto:** cada producto tiene su link compartible
`#/producto/<slug>` (slugs: `caja-de-promesas`, `la-santa-biblia`,
`cuaderno-devocional`, `indices-biblicos`, `kit-mujer-divina`). No se duplica
contenido: `App.renderProducto` **clona** la tarjeta del producto de la tienda
(identificada con `data-slug`) y la muestra sola. `App.decorarTienda` inyecta en
cada producto los enlaces "Ver página del producto →" y "🔗 Copiar enlace"
(`App.copiarLink`). Para agregar/quitar un producto: basta con ponerle
`data-slug` a su tarjeta en `index.html`.

### Diseño / marca
- Fuentes: Marcellus (`--f-title`), Italiana (`--f-script`), Jost (`--f-sans`).
- Paleta (variables CSS en `styles.css`):
  `--rose #D7AAB5` · `--gold #CDA349` · `--gold-faint #FDF7E8` · `--cream #FDFDF8`
  `--text #6B3A48` · `--text-mid #9C6D7A` · `--dark #3A1C25`

---

## 3. Autenticación (Supabase)

- Solo se usa **Auth** (no hay tablas de base de datos). Las usuarias se registran solas.
- Solo `#/roadmap` requiere login. Todo lo demás es abierto.
- **Lista blanca de correos** en `app.js` (`APPROVED_EMAILS`): solo esos correos pueden
  registrarse. Para dar acceso a alguien nueva, se agrega su correo a ese array.
- Config en Supabase: proveedor **Email activado**, **Confirm email desactivado**
  (las usuarias entran de una con correo + contraseña + cómo quieren ser llamadas).
- **Credenciales en el código** (`app.js`): solo la `anon key` (pública, segura para el
  frontend). ⚠️ **NUNCA** poner la `service_role key` en el código del frontend.

---

## 4. Tienda y flujo de compra (IMPORTANTE)

### Productos y precios (precio de lanzamiento vs. normal tachado)
| Producto | Precio normal (tachado) | Lanzamiento | Link de pago Wompi |
|----------|-------------------------|-------------|--------------------|
| Caja de Promesas | $99.000 | **$85.000** | `checkout.wompi.co/l/Ner44D` |
| La Santa Biblia | $130.000 | **$99.000** | `checkout.wompi.co/l/BMLVay` |
| Cuaderno Devocional | $85.000 | **$60.000** | `checkout.wompi.co/l/sdzyIS` |
| Índices Bíblicos | $38.000 | **$30.000** | `checkout.wompi.co/l/OQFMxx` |
| Kit Mujer Divina | $310.000 | **$230.000** | `checkout.wompi.co/l/Liqs7Z` |

### Envío (contra entrega, con Interrapidísimo)
La clienta elige su ciudad en el checkout y se le muestra el costo, pero **el envío se
paga al recibir** (no se cobra en línea). Zonas (`ENVIO_LINKS` en `app.js`, solo se usa
la etiqueta de precio; los links de Wompi de envío ya no se abren):
- **Medellín** → $8.000
- **Área Metropolitana** (Bello, Itagüí, Envigado, Sabaneta, La Estrella, Caldas,
  Copacabana, Girardota, Barbosa) → $10.000
- **Nacional principales** (Bogotá, Cali, Barranquilla, Cartagena, Bucaramanga, Pereira,
  Manizales, Armenia, Santa Marta, Cúcuta, Ibagué, Villavicencio, Pasto, Montería,
  Valledupar) → $15.000
- **Resto de Colombia** → $22.000

> **Buscador de ciudad:** el checkout tiene un campo con autocompletado sobre los
> **1.104 municipios de Colombia** (archivo `ciudades.js`, fuente DANE). Cada municipio
> trae su zona (`z`) y se muestra como "Municipio, Departamento" para desambiguar nombres
> repetidos (ej. Armenia/Antioquia vs Armenia/Quindío). Es obligatorio elegir de la lista.
> Para regenerar `ciudades.js`, ver el script en el commit que lo creó (asigna las zonas).

> **Dirección estructurada:** la clienta arma la dirección con campos separados
> (tipo de vía · número · # · placa · barrio) y `submitCheckout` los une en un solo texto
> ("Carrera 20B # 15-43, Barrio La Ford"). Así no falta nomenclatura. El apto/torre va en
> "Indicaciones adicionales" (`notas`).

### El flujo de checkout paso a paso (`App.submitCheckout` en `app.js`)
1. La clienta llena el formulario (nombre, correo, celular, **ciudad**, dirección, notas)
   y da "Continuar al pago".
2. Se abre el **link de Wompi del producto** en una pestaña nueva (solo el producto).
3. La app la lleva a `#/gracias` → página "Un último paso".
4. **En ese momento** se manda a Camila un correo **"🛒 CARRITO"** (aún NO es venta —
   la clienta todavía no ha pagado). Sirve como *lead* para seguimiento de abandono.
5. Si la clienta paga y hace clic en **"✅ Ya realicé mi pago"** (`App.confirmarPagoManual`):
   - Se manda a Camila **"✅ VENTA PAGADA"**.
   - Se manda a la clienta su **correo de confirmación**.
6. Si abandona sin pagar → nunca hace clic → **solo queda el "🛒 CARRITO"** con sus datos.

**Regla para Lina:** llegó "🛒 CARRITO" pero **no** llegó "✅ VENTA PAGADA" y **no**
aparece en **Wompi → Transacciones** = **abandono de carrito** → contactarla.
Wompi → Transacciones es la **fuente de verdad** de los pagos reales.

> Nota técnica: los links de pago genéricos de Wompi **no** ofrecen URL de redirección
> en el panel, por eso NO se puede detectar el pago automáticamente. Por eso existe el
> botón manual "Ya realicé mi pago" + la verificación en Transacciones.

---

## 5. Correos automáticos (EmailJS)

Cuenta EmailJS de **Camila** (camilagutierrezmentora@gmail.com). Se carga por CDN en
`index.html` y se inicializa con la **Public Key** (segura para frontend).

| Dato | Valor |
|------|-------|
| Public Key | `vFOQaTaipCJHPeW79` |
| Service ID (Gmail) | `service_zptlabd` |
| Template — aviso a Camila | `template_6fwpfzf` (usa variable `{{estado}}`) |
| Template — confirmación a la clienta | `template_1ypsbzc` |

### Variables que reciben las plantillas
`producto`, `precio`, `nombre`, `email_cliente`, `cel`, `ciudad`, `direccion`,
`notas`, `envio`, y **`estado`** (solo la de Camila: dice "🛒 CARRITO" o "✅ VENTA PAGADA").

### ✅ Pendiente de configurar en EmailJS (hazlo en dashboard.emailjs.com)
En la plantilla **`template_6fwpfzf`** (la de Camila):
- **Tema (asunto):** ponerlo como `{{estado}}` para ver de un vistazo si es carrito o venta.
- **Cuerpo:** agregar `{{estado}}` en la primera línea.
El destino ("Para enviar un correo") debe ser `camilagutierrezmentora@gmail.com`.

En la plantilla **`template_1ypsbzc`** (la de la clienta):
- "Para enviar un correo" debe ser `{{email_cliente}}`.
- Tiempo de envío: dice "entre 2 y 5 días hábiles".

---

## 6. Devocionales

Hay un **skill `devocional`** que genera y publica devocionales con el formato correcto.
- Carpeta: `devocionales/`
- Categorías: Fe · Identidad · Propósito · Familia · Relaciones · Finanzas
- Tras crear un `.md`: `node build.js` (regenera `manifest.json`), luego commit + push.

---

## 7. Estado actual y próximos pasos

**Hecho:**
- Dominio `mujerdivina.app` apuntando a Vercel.
- Auth con lista blanca; solo `/roadmap` privada.
- Precios de lanzamiento con precio normal tachado.
- Envío contra entrega con selector de ciudad.
- Correos automáticos con EmailJS (Camila + clienta).
- Separación carrito (lead) vs. venta pagada (botón "Ya realicé mi pago").

**Pendiente / por verificar:**
- [ ] Ajustar en EmailJS el asunto y cuerpo de `template_6fwpfzf` con `{{estado}}` (ver §5).
- [ ] Prueba real de punta a punta: comprar y verificar que lleguen los 2 correos correctos.
- [ ] (Opcional) Logo de Mujer Divina en los correos de EmailJS.

---

## 8. Reglas para trabajar en este repo

- Después de cualquier cambio de código: commit + push con la llave SSH (ver §1).
- No exponer secretos en el frontend (service_role de Supabase, secretos de integridad
  de Wompi). Las llaves públicas (Supabase anon, EmailJS public) sí van en el frontend.
- Mantener el tono de marca: íntimo, pastoral, femenino; respetar la paleta y fuentes.
- Los cambios se ven en https://mujerdivina.app ~1 minuto después del push.
