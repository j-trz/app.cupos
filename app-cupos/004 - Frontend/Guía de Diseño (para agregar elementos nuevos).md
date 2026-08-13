Checklist práctico para cualquier IA (o persona) que agregue una página, modal o componente nuevo al frontend. Nace del hallazgo del 2026-08-13: `BandejaTickets.jsx` (`/tickets`) se había construido íntegramente con `style={{}}` inline y colores hex arbitrarios, sin usar el kit de componentes ni la paleta del resto de la app — quedó normalizado ese mismo día (ver [[Historial de Bugs Resueltos]]). Esta nota existe para que no vuelva a pasar.

**Regla de oro única, si solo lees una línea de acá**: si el valor (color, tamaño, espaciado) se puede expresar con una clase de Tailwind, se expresa con una clase de Tailwind — nunca `style={{ color: '#2563eb' }}`. Un `style={{}}` inline en un componente de página es casi siempre una señal de que no se miró cómo lo resuelve el resto de la app.

## Antes de escribir una línea de JSX

Abrí una página `Gestion*.jsx` comparable (`GestionProductos.jsx` para tablas anchas con filtros, `GestionOportunidades.jsx` para un flujo con badges de estado + acciones masivas) y calcá su estructura. Casi nunca hace falta inventar un patrón nuevo — el 90% de las pantallas de gestión de este repo son variaciones del mismo esqueleto.

## Estructura de página estándar

```jsx
export default function MiPagina() {
  // ...hooks (queries, mutations, useState)...

  // Guard de permiso SIEMPRE después de TODOS los hooks (regla 5 de
  // Gotchas y Reglas de Oro) — nunca antes, rompe las reglas de hooks de React.
  if (!can('MODULO_VIEW')) {
    return (/* Acceso restringido, ver cualquier Gestion*.jsx para el bloque exacto */);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="..." description="..." icon={MiIcono} action={<Button>...</Button>} />

      {/* Barra de búsqueda/filtros: div plano, NO envuelto en Card */}
      <div className="flex flex-wrap items-center gap-3">...</div>

      {/* Tabla: SÍ envuelta en Card */}
      <Card>
        <TableComponent>...</TableComponent>
      </Card>

      {/* Modales: al final, siempre usando components/Modal.jsx */}
      <MiModal ... />
    </div>
  );
}
```

- El `<div className="space-y-6">` raíz **nunca** lleva `padding`/`maxWidth` propio — `Layout.jsx`'s `<main>` ya aplica `p-3 sm:p-6`. Ponerle padding propio duplica el espaciado (exactamente el bug que tenía `BandejaTickets.jsx`: `style={{ padding: '1.5rem' }}` sobre un `<main>` que ya venía con el suyo).
- `PageHeader` no renderiza nada visible por sí solo — empuja `{title, description, icon, action}` a `HeaderContext`, que `Layout.jsx` pinta en el topbar real. Si una página nunca llama a `<PageHeader>`, el topbar cae a un título genérico sin ícono (bug ya visto y corregido una vez este mismo mes).

## Kit de componentes — usar SIEMPRE estos, nunca los `shadcn-*`

Los componentes propios de `frontend/src/components/ui/` son el kit real de la app: `Button.jsx`, `Card.jsx`, `Input.jsx`, `Label.jsx`, `Table.jsx` (`TableComponent`/`TableHeader`/`TableRow`/`TableHead`/`TableBody`/`TableCell`), `Badge.jsx`, `ActionIconButton.jsx`, `PageHeader.jsx`, más `SkeletonTable.jsx`/`EmptyState.jsx` (`components/`) y `Modal.jsx` (`components/`).

Los archivos prefijados `shadcn-*` (`shadcn-button.jsx`, `shadcn-dialog.jsx`, etc.) son **legado**, usados únicamente por `Settings.jsx`/`Notificaciones.jsx`/`ReportFilters.jsx` — no se usan en código nuevo. Si una tarea no menciona explícitamente esas 3 pantallas, el componente correcto siempre es el propio (sin prefijo), no el `shadcn-*`.

## Paleta de color — Tailwind slate + los variants ya definidos en `Badge.jsx`

- Texto/fondos neutros: escala `slate` (`text-slate-900` para valores, `text-slate-500`/`text-slate-400` para meta/labels/placeholders, `border-slate-200`/`border-slate-300` para bordes, `bg-slate-50` para fondos sutiles).
- Estados semánticos (éxito/error/advertencia/info): usar los **variants ya definidos** en `Badge.jsx` (`success`, `danger`, `warning`, `info`, más los pastel por dominio: `product`, `request`, `confirmation`, `availability`, `reservation`, `agency`, `user`, `setting`, `report`, `pending`, `active`, `inactive`) — **no inventar un variant nuevo sin mirar primero si ya existe uno que sirva**, y nunca usar un nombre que no está en `Badge.jsx` (`error` no es un variant real; pasó en `BandejaTickets.jsx` y el badge quedaba sin ningún color aplicado, silenciosamente).
- Si hace falta un color puntual fuera de un `Badge` (ej. un ícono de acción positiva tipo "Aprobar"), usar clases Tailwind del palette estándar de ese semantic: verde `emerald-*` (éxito), rojo `red-*` (destructivo/peligro), ámbar `amber-*` (advertencia/pendiente), azul `blue-*` (info/neutro-destacado) — nunca un hex arbitrario.

## Tamaños y tipografía

- Texto base de tablas/formularios: `text-sm`. Meta/labels pequeños: `text-xs` (o `text-[11px]` si hace falta algo más chico, como labels de campo en mayúscula). Valores destacados: `font-semibold`/`font-medium` + `text-slate-900`.
- Códigos/identificadores (ticket, PNR, código de cupo): `font-mono text-xs font-medium`.
- Iconos de `lucide-react`: `h-4 w-4` en botones de acción y elementos inline de texto; `h-3.5 w-3.5`/`h-3 w-3` para iconos pequeños dentro de stat cards o labels.
- Bordes redondeados: `rounded-xl`/`rounded-2xl` para cards/inputs/modales, `rounded-lg` para botones de ícono e ítems de menú, `rounded-3xl` para el `Card` genérico (ya viene así por default).

## Tablas

- Columna "Acciones" siempre primero, con `ActionIconButton` (nunca un `<button style={{}}>` a mano) — `variant="danger"` para destructivo, `className` con color puntual (ej. `text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700`) para una acción positiva no-destructiva como "Aprobar"/"Sincronizar".
- Solo usar columnas/header `sticky` (via el prop `containerClassName` de `Table.jsx`) en tablas genuinamente anchas (~20+ columnas, ver `GestionProductos.jsx`) — no es el default, la mayoría de las tablas de la app no lo necesitan.
- Estados vacíos: `EmptyState` (ícono como string emoji, ej. `icon="🎫"` — no un componente de lucide-react, para consistencia con el resto). Loading: `SkeletonTable`.

## Modales

- Siempre `components/Modal.jsx` (`title`, `open`, `onClose`, `size`) — **nunca** construir un modal a mano ni pasar `title=""` para "esconder" el header e intentar un look full-bleed custom: `Modal.jsx` igual renderiza la barra de título (vacía) + botón de cerrar, así que un header custom "de borde a borde" queda con un padding extra encima y una barra vacía arriba (bug real que tenía el modal de detalle de ticket). Si se quiere un elemento visual destacado (ej. un panel con gradiente), va **dentro** del área de contenido del modal como una card/panel más, con el título real del modal en el prop `title`.

## Filtros

- Barra de búsqueda + selects de filtro: `<div className="flex flex-wrap items-center gap-3">`, **no** envuelta en `Card`.
- `<Input>` con ícono de búsqueda: `<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />` + `className="pl-9"` en el input (o `left-2`/`pl-8`, ambos coexisten hoy en el repo — cualquiera de los dos es aceptable, lo importante es no reinventar el posicionamiento a mano con `style={{}}`).
- `<select>` de filtro: `className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"` (ver `GestionOportunidades.jsx`) o la variante `rounded-lg ... focus:ring-blue-500` de `GestionProductos.jsx` — cualquiera de las dos, no un `<select style={{}}>` a mano.

## Antes de dar por terminada una pantalla nueva

- ¿Quedó algún `style={{...}}` que se pueda expresar en Tailwind? Si sí, convertirlo.
- ¿Hay algún import sin usar (ícono, hook, variable)? `npm run lint` los marca — limpiarlos antes de terminar, no dejarlos "por si acaso".
- ¿El guard de permiso (si aplica) está después de TODOS los hooks?
- ¿El wrapper raíz es `<div className="space-y-6">` sin padding propio?
- `npm run build` y `npm run lint` limpios antes de considerar terminado.
