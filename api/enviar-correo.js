/* Función serverless (Vercel) — envía UN correo suelto con Resend (usa lib/correos.js).
   Recibe POST { tipo: 'camila' | 'clienta', pedido: {...}, estado?: '...' } */

const { plantillaCamila, plantillaClienta, enviarResend, AVISO_EMAILS } = require('../lib/correos');

function leerBody(req) {
  return new Promise((resolve) => {
    if (req.body) {
      resolve(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      return;
    }
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
  if (!process.env.RESEND_API_KEY) {
    res.status(500).json({ error: 'Falta configurar RESEND_API_KEY en Vercel' });
    return;
  }

  try {
    const raw = await leerBody(req);
    const body = raw ? JSON.parse(raw) : {};
    const tipo = body.tipo === 'clienta' ? 'clienta' : 'camila';
    const pedido = body.pedido || {};
    const estado = body.estado || '';

    let to, subject, html;
    if (tipo === 'clienta') {
      to = pedido.email_cliente ? [pedido.email_cliente] : [];
      subject = '🌷 ¡Gracias por tu compra en Mujer Divina!';
      html = plantillaClienta(pedido);
    } else {
      to = AVISO_EMAILS;
      subject = estado || 'Nuevo pedido — Mujer Divina';
      html = plantillaCamila(pedido, estado);
    }

    if (!to.length) {
      res.status(400).json({ error: 'Falta el destinatario' });
      return;
    }

    const data = await enviarResend(process.env.RESEND_API_KEY, { to, subject, html });
    res.status(200).json({ ok: true, id: data.id });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo enviar el correo' });
  }
};
