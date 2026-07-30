/* Acceso server-side a la tabla `pedidos` en Supabase, usando la llave secreta
   SUPABASE_SERVICE_KEY (Vercel env var — bypasea RLS). Nunca se expone al frontend;
   el frontend solo puede INSERTAR con la llave anon (ver app.js → guardarPedido). */

const SUPABASE_URL = 'https://jrkauaukgvcdnmaslsvb.supabase.co';

function headers() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('Falta configurar SUPABASE_SERVICE_KEY en Vercel');
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

// Busca un pedido por su referencia. Devuelve la fila o null.
async function obtenerPedido(referencia) {
  const url = `${SUPABASE_URL}/rest/v1/pedidos?referencia=eq.${encodeURIComponent(referencia)}&select=*`;
  const r = await fetch(url, { headers: headers() });
  if (!r.ok) throw new Error('No se pudo consultar el pedido en Supabase');
  const rows = await r.json();
  return rows[0] || null;
}

// Marca el pedido como pagado de forma ATÓMICA: solo actualiza si sigue 'pendiente'.
// Si devuelve null, significa que YA estaba pagado (otra vía ya lo procesó) — evita
// mandar los correos de venta dos veces cuando el webhook y el navegador confirman
// casi al mismo tiempo.
async function marcarPagado(referencia) {
  const url = `${SUPABASE_URL}/rest/v1/pedidos?referencia=eq.${encodeURIComponent(referencia)}&estado=eq.pendiente`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { ...headers(), Prefer: 'return=representation' },
    body: JSON.stringify({ estado: 'pagado', pagado_at: new Date().toISOString() })
  });
  if (!r.ok) throw new Error('No se pudo actualizar el pedido en Supabase');
  const rows = await r.json();
  return rows[0] || null;
}

module.exports = { obtenerPedido, marcarPagado };
