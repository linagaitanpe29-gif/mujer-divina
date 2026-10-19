// Reenvío opcional después de verificar el evento Wompi y conservar la venta.
// Sin variable configurada, el comportamiento actual de la tienda no cambia.
async function reenviarEventoVerificado(evento, options = {}) {
  const url = options.url ?? process.env.MD_AUTOMATION_WEBHOOK_URL;
  if (!url) return false;
  const target = new URL(url);
  if (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash) {
    throw new Error('URL de automatización inválida');
  }
  const response = await (options.fetcher || fetch)(target.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evento),
    signal: AbortSignal.timeout(4000)
  });
  if (!response.ok) throw new Error('Automatización no confirmó acuse del evento');
  return true;
}

module.exports = { reenviarEventoVerificado };
