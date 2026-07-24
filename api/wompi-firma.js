/* Función serverless (Vercel) — genera la FIRMA DE INTEGRIDAD de Wompi.
   El secreto de integridad vive SOLO aquí, como variable de entorno en Vercel
   (WOMPI_INTEGRITY_SECRET). Nunca se expone en el frontend ni en el repositorio.

   Firma = SHA256( referencia + monto_en_centavos + moneda + secreto_integridad )
   (concatenación en ese orden exacto, hash hexadecimal). */

const crypto = require('crypto');

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

  const secret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'Falta configurar WOMPI_INTEGRITY_SECRET en Vercel' });
    return;
  }

  try {
    const raw = await leerBody(req);
    const body = raw ? JSON.parse(raw) : {};
    const reference = String(body.reference || '');
    const amountInCents = String(body.amountInCents || '');
    const currency = String(body.currency || 'COP');

    if (!reference || !amountInCents) {
      res.status(400).json({ error: 'Faltan reference o amountInCents' });
      return;
    }

    const cadena = `${reference}${amountInCents}${currency}${secret}`;
    const signature = crypto.createHash('sha256').update(cadena).digest('hex');

    res.status(200).json({ signature });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo generar la firma' });
  }
};
