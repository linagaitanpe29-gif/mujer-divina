/* Librería compartida de correos (Resend). La usan api/enviar-correo.js,
   api/confirmar-venta.js y api/wompi-webhook.js. NO es una ruta HTTP en sí
   misma (vive fuera de /api), solo funciones que se importan con require(). */

const CAMILA_EMAIL = 'camilagutierrezmentora@gmail.com';
// Correos que reciben el aviso interno de cada pedido. Para agregar a alguien más,
// basta con añadir su correo a este arreglo.
const AVISO_EMAILS = [CAMILA_EMAIL];
const FROM = 'Mujer Divina <hola@mujerdivina.app>';

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fila(label, valor) {
  if (!valor) return '';
  return `<tr>
    <td style="padding:8px 12px;color:#9C6D7A;font-size:13px;border-bottom:1px solid #f0e6ea;white-space:nowrap;vertical-align:top;">${esc(label)}</td>
    <td style="padding:8px 12px;color:#3A1C25;font-size:14px;border-bottom:1px solid #f0e6ea;">${esc(valor)}</td>
  </tr>`;
}

// Correo para Camila (aviso interno con todos los datos del pedido)
function plantillaCamila(p, estado) {
  return `<!doctype html><html><body style="margin:0;background:#FDFDF8;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="text-align:center;padding:18px 0;">
      <span style="font-size:22px;color:#6B3A48;letter-spacing:1px;">Mujer Divina</span>
    </div>
    <div style="background:#FDF7E8;border:1px solid #CDA349;border-radius:12px;padding:16px;text-align:center;margin-bottom:18px;">
      <span style="font-size:16px;font-weight:bold;color:#6B3A48;">${esc(estado || 'Nuevo pedido')}</span>
    </div>
    <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #f0e6ea;border-radius:12px;overflow:hidden;">
      ${fila('Producto', p.producto)}
      ${fila('Precio', p.precio)}
      ${fila('Nombre', p.nombre)}
      ${fila('Correo', p.email_cliente)}
      ${fila('Celular', p.cel)}
      ${fila('Cédula', p.cedula)}
      ${fila('Ciudad', p.ciudad)}
      ${fila('Dirección', p.direccion)}
      ${fila('Barrio', p.barrio)}
      ${fila('Envío', p.envio)}
      ${fila('Indicaciones', p.notas)}
      ${fila('Referencia', p.referencia)}
    </table>
    <p style="color:#9C6D7A;font-size:12px;text-align:center;margin-top:18px;">
      Wompi → Transacciones es la fuente de verdad de los pagos reales.
    </p>
  </div></body></html>`;
}

// Correo para la clienta (confirmación de compra)
function plantillaClienta(p) {
  return `<!doctype html><html><body style="margin:0;background:#FDFDF8;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="text-align:center;padding:22px 0;">
      <span style="font-size:24px;color:#6B3A48;letter-spacing:1px;">Mujer Divina</span>
    </div>
    <div style="background:#fff;border:1px solid #f0e6ea;border-radius:16px;padding:28px;text-align:center;">
      <h1 style="font-size:22px;color:#6B3A48;margin:0 0 10px;">¡Gracias por tu compra, ${esc(p.nombre || '')}! 🌷</h1>
      <p style="color:#9C6D7A;font-size:15px;line-height:1.6;margin:0 0 18px;">
        Tu pedido quedó registrado con todo nuestro cariño. Pronto estará en camino
        para acompañar tu vida devocional. 🤍
      </p>
      <div style="background:#FDF7E8;border-radius:12px;padding:16px;margin:0 auto 18px;max-width:420px;text-align:left;">
        <p style="margin:0 0 6px;color:#3A1C25;font-size:15px;"><strong>Producto:</strong> ${esc(p.producto)}</p>
        <p style="margin:0 0 6px;color:#3A1C25;font-size:15px;"><strong>Total:</strong> ${esc(p.precio)}</p>
        ${p.ciudad ? `<p style="margin:0 0 6px;color:#3A1C25;font-size:15px;"><strong>Ciudad:</strong> ${esc(p.ciudad)}</p>` : ''}
        ${p.direccion ? `<p style="margin:0;color:#3A1C25;font-size:15px;"><strong>Dirección:</strong> ${esc(p.direccion)}</p>` : ''}
      </div>
      <p style="color:#9C6D7A;font-size:14px;line-height:1.6;margin:0;">
        Tu pedido se despacha en <strong>3 días hábiles</strong>.
        Si tienes cualquier duda, respóndenos a este correo. 💛
      </p>
    </div>
    <p style="color:#c9a9b3;font-size:12px;text-align:center;margin-top:18px;">
      Mujer Divina · Tu momento íntimo con Dios
    </p>
  </div></body></html>`;
}

async function enviarResend(apiKey, { to, subject, html }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html, reply_to: CAMILA_EMAIL })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Resend rechazó el envío: ' + JSON.stringify(data));
  return data;
}

// Envía los DOS correos de una venta pagada (aviso a Camila + confirmación a la clienta).
// Usado por api/confirmar-venta.js (retorno del navegador) y api/wompi-webhook.js (servidor).
async function enviarVenta(pedido, estado) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Falta configurar RESEND_API_KEY en Vercel');

  const resultados = await Promise.allSettled([
    enviarResend(apiKey, {
      to: AVISO_EMAILS,
      subject: estado || '✅ VENTA PAGADA — Mujer Divina',
      html: plantillaCamila(pedido, estado || '✅ VENTA PAGADA')
    }),
    pedido.email_cliente
      ? enviarResend(apiKey, {
          to: [pedido.email_cliente],
          subject: '🌷 ¡Gracias por tu compra en Mujer Divina!',
          html: plantillaClienta(pedido)
        })
      : Promise.resolve(null)
  ]);
  return resultados;
}

module.exports = { esc, fila, plantillaCamila, plantillaClienta, enviarResend, enviarVenta, CAMILA_EMAIL, AVISO_EMAILS, FROM };
