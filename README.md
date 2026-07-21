# Mujer Divina

Plataforma devocional cristiana para mujeres, con tienda de productos y la sección
"El Mapa de Ella". Sitio: **https://mujerdivina.app**

- **SPA** en HTML/CSS/JS puro (sin frameworks), ruteo por hash.
- **Hosting:** Vercel — cada push a `main` despliega en ~1 minuto.
- **Auth:** Supabase (solo `#/roadmap` requiere login).
- **Pagos:** links de Wompi. **Correos:** EmailJS.

## 📖 Documentación completa

👉 **Todo el contexto para continuar el proyecto está en [`CLAUDE.md`](./CLAUDE.md).**
Ábrelo primero: explica la arquitectura, el flujo de compra, credenciales públicas,
la configuración de EmailJS y Wompi, y los próximos pasos pendientes.

## Desarrollo rápido

```bash
# Publicar cambios (requiere la llave SSH del proyecto en ~/.ssh/)
git add .
git commit -m "descripción"
GIT_SSH_COMMAND="ssh -i ~/.ssh/mujer_divina_key -o StrictHostKeyChecking=no" git push origin main

# Regenerar el índice de devocionales tras agregar un .md
node build.js
```
