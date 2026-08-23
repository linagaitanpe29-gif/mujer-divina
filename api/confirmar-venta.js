/* Confirma una venta y manda los correos — llamado por el NAVEGADOR cuando vuelve
   de Wompi (automático) o cuando la clienta toca "Ya realicé mi pago" (manual).
   Es IDEMPOTENTE: si el webhook de Wompi (api/wompi-webhook.js) ya marcó el pedido
   como pagado y mandó los correos, esta llamada no los vuelve a mandar.

   Recibe POST { referencia, pedido? }
   - `pedido` es un respaldo: los datos completos guardados en localStorage del
     navegador, por si el pedido no llegó a guardarse en Supabase (poco frecuente). */

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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  try {
    const raw = await leerBody(req);
    const body = raw ? JSON.parse(raw) : {};
    const referencia = body.referencia;
    if (!referencia) {
      res.status(400).json({ error: 'Falta la referencia' });
      return;
    }

    let pedidoDatos = null;
    let viaDB = false;

    try {
      const existente = await obtenerPedido(referencia);
      if (existente) {
        viaDB = true;
        if (existente.estado === 'pagado') {
          // Ya se procesó (probablemente por el webhook). No se manda de nuevo.
          res.status(200).json({ ok: true, already: true });
          return;
        }
        const actualizado = await marcarPagado(referencia);
        if (!actualizado) {
          // Carrera: alguien más (el webhook) lo marcó como pagado justo antes.
          res.status(200).json({ ok: true, already: true });
          return;
        }
        pedidoDatos = actualizado.datos;
      }
    } catch (e) {
      // Si Supabase falla, seguimos con el respaldo de localStorage (si vino) —
      // pero se registra el error para que quede visible en los logs de Vercel.
      console.error('confirmar-venta: fallo consultando Supabase:', e.message);
    }

    if (!pedidoDatos && body.pedido) {
      pedidoDatos = body.pedido; // respaldo: pedido no estaba en la DB
    }

    if (!pedidoDatos) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }

    await enviarVenta(pedidoDatos, '✅ VENTA PAGADA — la clienta pagó en Wompi. Verifica en Wompi → Transacciones y despacha.');
    res.status(200).json({ ok: true, viaDB });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo confirmar la venta' });
  }
};
