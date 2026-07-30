/* Webhook de Wompi ("Eventos") — Vercel.
   Wompi llama a esta URL DESDE SU PROPIO SERVIDOR cada vez que una transacción
   cambia de estado, sin pasar por el navegador de la clienta. Así, aunque ella
   cierre la pestaña o pierda la señal justo después de pagar, la venta se
   confirma igual.

   Configurar en Wompi → (⚙️) Desarrolladores/Eventos → URL del evento:
     https://mujerdivina.app/api/wompi-webhook
   El "secreto de eventos" (distinto del secreto de integridad) va en Vercel
   como variable de entorno WOMPI_EVENTS_SECRET.

   Verificación de la firma (documentación de Wompi):
   checksum = SHA256( valores de signature.properties en orden + timestamp + secreto ) */

const crypto = require('crypto');
const { obtenerPedido, marcarPagado } = require('../lib/pedidos');
const { enviarVenta } = require('../lib/correos');

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

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function firmaValida(evento, secreto) {
  const props = (evento.signature && evento.signature.properties) || [];
  const checksumRecibido = evento.signature && evento.signature.checksum;
  if (!props.length || !checksumRecibido) return false;
  const cadena = props.map((p) => String(getPath(evento.data, p) ?? '')).join('') + evento.timestamp + secreto;
  const checksumCalculado = crypto.createHash('sha256').update(cadena).digest('hex');
  return checksumCalculado.toLowerCase() === String(checksumRecibido).toLowerCase();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const secreto = process.env.WOMPI_EVENTS_SECRET;
  if (!secreto) {
    console.error('WOMPI_EVENTS_SECRET no está configurado en Vercel');
    res.status(500).json({ error: 'Falta configurar WOMPI_EVENTS_SECRET en Vercel' });
    return;
  }

  let evento;
  try {
    const raw = await leerBody(req);
    evento = raw ? JSON.parse(raw) : {};
  } catch (e) {
    res.status(400).json({ error: 'JSON inválido' });
    return;
  }

  // Log para depurar contra el payload REAL de Wompi (Vercel → Deployments → Logs)
  console.log('Wompi webhook recibido:', JSON.stringify(evento));

  if (!firmaValida(evento, secreto)) {
    console.warn('Wompi webhook: firma inválida, se ignora el evento.');
    res.status(401).json({ error: 'Firma inválida' });
    return;
  }

  const transaction = evento.data && evento.data.transaction;
  if (!transaction) {
    res.status(200).json({ ok: true, ignorado: 'sin transaction' });
    return;
  }

  if (transaction.status !== 'APPROVED') {
    // Solo nos interesa notificar cuando el pago queda aprobado.
    res.status(200).json({ ok: true, ignorado: `status ${transaction.status}` });
    return;
  }

  const referencia = transaction.reference;
  try {
    const pedido = await obtenerPedido(referencia);
    if (!pedido) {
      console.warn('Wompi webhook: no se encontró el pedido para la referencia', referencia);
      res.status(200).json({ ok: true, ignorado: 'pedido no encontrado' });
      return;
    }
    if (pedido.estado === 'pagado') {
      res.status(200).json({ ok: true, already: true });
      return;
    }
    const actualizado = await marcarPagado(referencia);
    if (!actualizado) {
      // Ya lo marcó otra vía (el navegador de la clienta) casi al mismo tiempo.
      res.status(200).json({ ok: true, already: true });
      return;
    }
    await enviarVenta(actualizado.datos, '✅ VENTA PAGADA — confirmada por Wompi (webhook). Verifica en Wompi → Transacciones y despacha.');
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Wompi webhook error:', e.message);
    res.status(500).json({ error: 'Error procesando el evento' });
  }
};
