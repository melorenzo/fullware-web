# Reglas del proyecto Fullware

- Idioma de la interfaz y el contenido: español rioplatense (voseo), tono directo y profesional.
- Astro (output static) + TypeScript estricto + Tailwind. React SOLO en islas con `client:load` o `client:visible`.
- Cero dependencias innecesarias. Preguntar antes de agregar una librería nueva.
- Nunca hardcodear secretos, teléfonos ni tokens: todo por variables de entorno (.env, nunca commiteado).
- Todo contenido editable (servicios, proyectos) vive en `src/data/*.ts`, no dentro de los componentes.
- Accesibilidad: HTML semántico, contraste AA, foco visible, `prefers-reduced-motion` respetado.
- Mobile first. Probar a 375px, 768px y 1280px.
- Antes de cada commit: `npm run check` y `npm run build` sin errores.
- No inventar datos del cliente (métricas, testimonios, números). Si falta un dato, dejar `TODO:` visible.

## Desarrollo

Servidor local: `npm run dev` (Astro en `localhost:4321`, con proxy de `/api` a `localhost:3000`).
API local: `cd api && npm run dev`.

## Documentación

- [Rutas y páginas](https://docs.astro.build/en/guides/routing/)
- [Componentes de Astro](https://docs.astro.build/en/basics/astro-components/)
- [Islas de React](https://docs.astro.build/en/guides/framework-components/)
- [Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Estilos y Tailwind](https://docs.astro.build/en/guides/styling/)
