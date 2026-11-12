# Integración con WhatsApp oficial

El webhook Wompi de la tienda conserva firma, venta y correos existentes. Después reenvía el evento completo al receptor n8n, que verifica nuevamente firma y consulta Wompi con llave privada.

La variable servidor MD_AUTOMATION_WEBHOOK_URL habilita el reenvío. Destino previsto:
https://n8n.srv1197567.hstgr.cloud/webhook/md-wompi

Dejarla sin configurar hasta que el Supabase correcto, credenciales y flujo n8n estén publicados y probados. Nunca configurarla en frontend. No cambiar la URL Wompi de la tienda.

Si el reenvío falla, la venta/correo ya procesados se conservan y el webhook responde 500 para que Wompi reintente. La rama already también reenvía, sin repetir el correo. El receptor n8n es idempotente por transacción/pedido. La retención/reintentos Wompi son limitados: revisar pendientes si el destino permanece caído.

Rollback: retirar la variable servidor; la tienda deja de reenviar y conserva su comportamiento anterior. No se cambia la confirmación manual del checkout en esta integración: el bot mantiene un registro separado de pagos verificados.

Pruebas: node --test tests/whatsapp-relay.test.cjs

Para la configuración y revisión del despliegue recomiendo instalar la CLI oficial con npm i -g vercel; permite gestionar entorno y logs. No está instalada en el equipo de preparación. También puede configurarse la variable desde el dashboard. No activar el reenvío antes de completar la preparación de n8n/Supabase.
