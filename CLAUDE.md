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
cada producto el enlace "Ver página del producto →" y hace clicable la foto y el
título para abrir su página. Para agregar/quitar un producto: basta con ponerle
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
| La Santa Biblia | $130.000 | **$99.000** | `checkout.wompi.co/l/Tmqw7F` |
| Cuaderno Devocional | $85.000 | **$60.000** | `checkout.wompi.co/l/sdzyIS` |
| Índices Bíblicos | $38.000 | **$30.000** | `checkout.wompi.co/l/OQFMxx` |
| Kit Mujer Divina | $310.000 | **$230.000** | `checkout.wompi.co/l/Liqs7Z` |

### Envío (se cobra en línea, con Interrapidísimo)
La clienta elige su ciudad en el checkout y el **costo del envío se SUMA a su pago**
(producto + envío se cobran juntos en Wompi). El monto de cada zona está en
`ENVIO_LINKS` (`app.js`) como `monto`. Zonas:
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
2. **TODA compra** (un solo producto, carrito, con complemento, o el Programa) se cobra
   por **Wompi Web Checkout** (`App.pagarCarritoWompi`) — nunca por los links fijos de
   cada producto. El pedido queda guardado en `md_pedido_pendiente`.
3. **NO se manda ningún correo todavía** (ya no existe el aviso de "🛒 CARRITO").
4. Al completar el pago, Wompi **redirige sola** de vuelta a `#/gracias` con `?id=...`.
   `App.checkWompiReturn` + `App.verificarPagoWompi` consultan la transacción; si está
   **APPROVED**, se envían solos el correo **"✅ VENTA PAGADA"** a Camila y la
   **confirmación** a la clienta (`App.confirmarPagoAuto`).
5. **Respaldo manual:** si por lo que sea la redirección automática no vuelve a disparar
   (bloqueador de anuncios, cierre de pestaña antes de completar), en `/gracias` sigue
   apareciendo el botón **"✅ Ya realicé mi pago"** (`App.confirmarPagoManual`) mientras
   el pedido siga en `md_pedido_pendiente` de ese navegador.

**Regla para Lina:** solo llegan correos de **ventas efectivamente pagadas**.
**Wompi → Transacciones** sigue siendo la **fuente de verdad** de los pagos reales —
revísalo si sospechas que una venta no llegó a generar sus correos.

> ⚠️ **Historial:** hasta el 31 jul 2026, comprar un solo producto (sin carrito ni
> complemento) usaba el link fijo de Wompi, que no tiene redirect configurado — si la
> clienta cerraba esa pestaña sin volver a tocar el botón manual, la venta no dejaba
> ningún rastro (causó al menos una venta perdida). Se corrigió haciendo que TODO pase
> por el Web Checkout dinámico, que confirma sola sin depender de ninguna acción manual.

### Carrito de compras + cobro del total por Wompi (Web Checkout)
- **Carrito propio** (estilo Shopify, sin perder el diseño): ícono en el nav con contador,
  botón "Agregar al carrito" por producto, drawer lateral con cantidades y subtotal.
  Estado en `localStorage` (`md_cart`); la info de cada producto se lee de su tarjeta
  (`App.productoInfo`). Todo en `App.cart` (`app.js`).
- **"Finalizar compra"** abre el checkout en **modo carrito** (`App._carritoMode`): mismo
  formulario (ciudad, dirección, cartica del Kit) pero para todo el pedido junto.
- **Cobro del TOTAL:** al enviar, `App.pagarCarritoWompi` pide la firma a la función
  serverless `api/wompi-firma.js` y redirige a **Wompi Web Checkout**
  (`checkout.wompi.co/p/`). Firma = `SHA256(referencia + montoCentavos + COP + secreto)`.
- **Confirmación automática:** al volver de Wompi (`?id=...` en la URL), `App.checkWompiReturn`
  + `App.verificarPagoWompi` consultan `production.wompi.co/v1/transactions/{id}`; si está
  **APPROVED** se envían solos los correos de VENTA y se vacía el carrito (sin botón manual).
- **Llaves:** la **pública** (`WOMPI_PUBLIC_KEY` en `app.js`) es segura en el frontend.
  El **secreto de integridad** va en Vercel como variable de entorno
  **`WOMPI_INTEGRITY_SECRET`** (Project Settings → Environment Variables) — nunca en el código.
- **Tanto el carrito como "Comprar ahora"** cobran el TOTAL (producto + envío) por
  Wompi Web Checkout (`App.pagarCarritoWompi`) y confirman solos al volver (`?id=`).
  Los links fijos de Wompi de cada producto ya no se usan para el pago.

---

## 5. Correos automáticos (Resend — propio, ya NO EmailJS)

Los correos se envían desde **nuestra propia función serverless** `api/enviar-correo.js`
(Vercel), usando **Resend**. Ya NO se usa EmailJS (se quitó porque el plan gratis de 200
correos/mes se agotaba). Los correos salen desde el dominio propio → menos spam.

- **Remitente:** `Mujer Divina <hola@mujerdivina.app>` (constante `FROM` en la función).
- **Aviso a Camila:** `camilagutierrezmentora@gmail.com` (constante `CAMILA_EMAIL`).
- **Llave secreta:** `RESEND_API_KEY` como variable de entorno en Vercel (nunca en el código).
- **Dominio verificado en Resend:** `mujerdivina.app` (registros DNS agregados en Vercel).

### Cómo se llama (frontend → backend)
`App.enviarCorreo(tipo, pedido, estado)` en `app.js` hace `POST /api/enviar-correo` con:
- `tipo: 'camila'` → aviso interno con todos los datos + `estado` ("🛒 CARRITO", "✅ VENTA
  PAGADA", "🎓 INSCRIPCIÓN CURSO"). El `estado` es también el asunto del correo.
- `tipo: 'clienta'` → confirmación de compra al correo de la clienta (`pedido.email_cliente`).

Las plantillas HTML (marca rosa/dorado) están dentro de `api/enviar-correo.js`
(`plantillaCamila` y `plantillaClienta`). Para cambiar textos/diseño, se editan ahí.

### Plan Resend
Gratis: **3.000 correos/mes** (100/día). Suficiente para el volumen actual. Si algún mes se
acerca al tope, subir al plan de pago de Resend.

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
