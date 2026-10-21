---
name: devocional
description: Usa este skill cuando Lina pegue o dicte el contenido de uno o varios devocionales nuevos (un día suelto o una semana/serie completa) para publicarlos en Mujer Divina. Convierte su texto al formato .md exacto del sitio, regenera manifest.json, actualiza la franja de serie si aplica, y hace commit + push.
---

# Publicar devocionales en Mujer Divina

Lina pega texto en bruto (a veces dictado por voz, con errores de tipeo) con uno
o varios días de devocional. Tu trabajo es convertirlo en archivos `.md` dentro de
`devocionales/`, regenerar `manifest.json` y publicar — sin pedirle que ella misma
formatee nada.

## 1. Qué esperar como entrada

Normalmente cada día trae, en algún orden, estas piezas (ignora numeración o
encabezados tipo "1. PREPARA TU CORAZÓN" que ella haya dictado — son solo guía):

- Fecha del día (a veces como "4 DE OCTUBRE"; infiere el año del contexto/fecha
  actual si no lo dice).
- Un título corto en mayúsculas (el tema del día).
- Un subtítulo/intro de una frase.
- Si es el primer día de una serie nueva: nombre de la serie y cuántos días dura.
- Un bloque "RECORRIDO DE LA SEMANA" listando los 7 días con sus títulos — esto
  **no se transcribe en el body**, es solo la franja de serie que el sitio ya
  genera solo (ver §4). Ignóralo al armar el markdown, pero úsalo para saber los
  temas de los otros días si los va a dar todos de una vez.
- Secciones de contenido (prepara tu corazón, pasaje a leer, reflexión, puntos
  importantes, versículos clave, frases, preguntas, notas del cuaderno, oración).

Si falta alguna pieza menor (p. ej. "Notas Importantes" o el facto del día),
no inventes contenido nuevo — simplemente omite esa sub-sección, tal como ya
pasa en devocionales publicados anteriormente (no todos los días tienen las
mismas sub-secciones).

**Versículo principal (frontmatter `versiculo`/`referencia`):** si ella no pega
el texto exacto del versículo, usa la cita textual en **RVR1960** (la traducción
de toda la Biblia del sitio, ver §5) del pasaje que ella señale como el central
del día. Si no estás segura de la redacción exacta de un versículo poco común,
dilo explícitamente en vez de inventar la cita.

## 2. Nombre de archivo y frontmatter

Archivo: `devocionales/<slug-del-titulo>-<YYYY-MM-DD>.md`
(minúsculas, sin tildes, espacios → guiones; mismo patrón que los ya publicados).

```yaml
---
title: "Título tal cual, con mayúsculas normales"
date: YYYY-MM-DD
categoria: "Nombre de la serie"   # o una de: Fe · Identidad · Propósito · Familia · Relaciones · Finanzas si no es parte de una serie
versiculo: "Texto exacto del versículo principal (RVR1960)."
referencia: "Libro Capítulo:Versículo"
intro: "La frase corta que va debajo del título en las tarjetas."
oracion: "La oración completa de la sección 'Una oración a Dios', tal cual la escribió ella."
---
```

## 3. Cuerpo del archivo (orden exacto)

Reutiliza SIEMPRE estas clases y esta estructura — el CSS y `MD.parse` del sitio
dependen de ellas. Mira 2-3 archivos recientes en `devocionales/` antes de escribir
el primero de una tanda, para calibrar tono y longitud.

1. **Si es el día 1 de una serie nueva**, abre con este bloque (si NO es una serie
   nueva, omite esto y empieza directo en el paso 2):
   ```html
   <div class="serie-intro">
     <p class="serie-intro-label">Nueva serie · 7 días</p>
     <p class="serie-intro-title">Nombre de la serie</p>
     <p class="serie-intro-sub">Frase que resume el recorrido de la semana.</p>
     <p>Uno o dos párrafos de presentación de la serie.</p>
   </div>
   ```
2. `## Prepara tu Corazón` — párrafos de introducción al tema del día.
3. `---`
4. `📖 **Lee en tu Biblia: <pasaje>**` + instrucciones de lectura + una pregunta en
   cursiva (`*¿...?*` o como cita `> *"..."*`).
5. `---`
6. `## Reflexión del Pasaje` — el desarrollo principal, en párrafos (puede llevar
   subtítulos `###` si el contenido lo pide, no es obligatorio).
7. `---`
8. `## Puntos Importantes para Reflexionar` — lista numerada en negrita:
   ```
   **1. Título corto.**
   Cuerpo del punto en el mismo párrafo (sin línea en blanco entre título y cuerpo).
   ```
9. `---`
10. `## Versículos Clave de la Lectura` — líneas tipo
    `📖 **Libro Cap:Vers** — comentario corto.` separadas por línea en blanco.
11. (Opcional) un "facto del día":
    ```html
    <div class="facto-dia">
      <p class="facto-label">Facto del día</p>
      <p class="facto-text">Una frase memorable.</p>
    </div>
    ```
12. `---`
13. `## Frases para Guardar en el Corazón` — bullets `- **Frase.**`.
14. `---`
15. Bloque de preguntas (siempre estas clases exactas):
    ```html
    <div class="questions-wrap">
      <div class="questions-heading">Preguntas para tu Corazón</div>
      <div class="q-item"><div class="q-num">1</div><div class="q-text"><p>¿Pregunta?</p></div></div>
      ...
    </div>
    ```
16. `---`
17. `## Ahora Toma tu Cuaderno Devocional`, luego:
    - `🤍 Ahora es tu momento con Dios.`
    - `### Tema del Día` + una línea en cursiva.
    - (Opcional) `### Notas Importantes que te Enseñó Este Texto`
    - `### ¿Qué Aprendes sobre Dios?`
    - `### ¿Qué Acciones Tomaré en mi Vida?` (o la variante corta `¿Qué Acciones Tomaré?`)
18. (Opcional, casi siempre presente) acción especial del día:
    ```html
    <div class="accion-especial">
      <p class="accion-label">Acción especial de hoy</p>
      <p class="accion-title">Título corto de la acción</p>
      <p>Instrucción...</p>
      <p class="accion-destacado">"Frase u oración corta destacada".</p>
    </div>
    ```
19. **Si es el último día de la serie**, cierra además con:
    ```html
    <div class="serie-cierre">
      <p class="serie-intro-label">Cierre de la serie</p>
      <p class="serie-intro-title">Nombre de la serie</p>
      <p>Párrafo(s) de cierre, pueden usar <br> para versos cortos en una sola línea.</p>
      <p class="accion-destacado">Frase de cierre.</p>
    </div>
    ```

## 4. Franja de serie (`SERIE_ACTUAL` en `app.js`)

Si Lina trae una serie nueva (aunque sea solo el primer día), actualiza el objeto
`SERIE_ACTUAL` cerca del inicio de `app.js`:

```js
const SERIE_ACTUAL = {
  nombre: 'Nombre de la serie',
  dias: [
    { date: '2026-10-12', tema: 'Título del día 1' },
    { date: '2026-10-13', tema: 'Título del día 2' },
    // ... un objeto por cada día de la serie, en orden
  ]
};
```
Si ya tienes los títulos de los 7 días (ella suele darlos todos en el bloque
"RECORRIDO DE LA SEMANA" del día 1), ponlos todos de una vez aunque los archivos
`.md` de los días siguientes aún no existan — la franja los muestra como "bloqueados"
hasta que ese `.md` se publique. Si es un devocional suelto (no es parte de una serie
nueva), no toques `SERIE_ACTUAL`.

## 5. Traducción de la Biblia

El sitio usa **RVR1960** (Reina-Valera 1960) — así debe citarse cualquier versículo,
tanto en `versiculo`/`referencia` del frontmatter como dentro del cuerpo.

## 6. Pasos para publicar

1. Crea/edita el o los `.md` en `devocionales/`.
2. Si tocaste `SERIE_ACTUAL`, corre `node --check app.js`.
3. Corre `node build.js` para regenerar `manifest.json` (copia también los `.md`
   a la raíz del repo — así los sirve `fetch('slug.md')`). Si falla por falta de
   `js-yaml`, corre `npm install` primero (está en `package.json`, a veces falta
   en `node_modules/`).
4. Revisa el resultado con Playwright contra un servidor local
   (`python3 -m http.server`) antes de subir, igual que para cualquier otro
   cambio visual del sitio — especialmente si tocaste la franja de serie.
5. Commit + push siguiendo el flujo de git de §1/§8 de `CLAUDE.md` (fetch,
   verificar divergencia con `origin/main`, merge, `git push origin main`,
   confirmar con `git rev-parse HEAD origin/main` que coinciden).
6. Avisa que el cambio se verá en mujerdivina.app en ~1 minuto.
