---
name: Gestión de Cupos
description: Panel B2B de asignación de cupos aéreos/paquetes para agencias de viaje
colors:
  ink: "#0f172a"
  surface: "#ffffff"
  canvas: "#f8fafc"
  border: "#e2e8f0"
  border-strong: "#cbd5e1"
  text-muted: "#64748b"
  text-faint: "#94a3b8"
  accent: "#2563eb"
  success: "#059669"
  warning: "#d97706"
  danger: "#dc2626"
typography:
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  heading:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    letterSpacing: "-0.02em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.75rem"
  xl: "1rem"
  2xl: "1rem"
  3xl: "1.5rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
    rounded: "{rounded.2xl}"
    padding: "0.5rem 1rem"
  button-primary-hover:
    backgroundColor: "#1e293b"
  button-secondary:
    backgroundColor: "#f1f5f9"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
  button-destructive:
    backgroundColor: "#ef4444"
    textColor: "#ffffff"
    rounded: "{rounded.2xl}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.3xl}"
---

# Design System: Gestión de Cupos

## Overview

Un panel operativo (modo **Operate**, no Persuade): agentes de agencias de viaje pasan el día ahí adentro reservando cupos aéreos, gestionando pasajeros y emitiendo tickets. La familiaridad es la característica, no la sorpresa — la interfaz tiene que desaparecer detrás de la tarea. El sistema es deliberadamente restringido: una sola familia tipográfica, una escala de grises con sesgo azulado (`slate`, no `gray` puro), y color reservado casi enteramente para estado (éxito/alerta/error) — nunca decoración.

Dos superficies conviven con reglas distintas: las **pantallas de gestión** (`Gestion*.jsx` — tablas, formularios, modales) siguen el kit propio documentado acá al pie de la letra; y el **hero oscuro** (`StatsHero`/bienvenida) es la única superficie que se permite un acento visual más marcado (degradado slate→índigo), usado con moderación — aparece una vez por página, nunca dos apilados.

**Key Characteristics:**
- Paleta `slate` como base neutra (nunca `gray` genérico) — ya tiene un sesgo azulado que la hace sentir elegida, no heredada.
- Un componente por concepto: `ActionIconButton` para toda acción de tabla, `ActionsOverflow` cuando son más de 2-3 acciones por fila, `Badge` para todo estado, nunca un `<span>` a mano.
- Estados semánticos (éxito/alerta/error/info) separados del acento de marca (`accent`, azul) — el acento es para navegación/foco, el semántico es para estado.
- Densidad alta permitida y esperada (tablas de hasta 30 columnas) — la legibilidad se protege con `sticky` en la columna de acciones, no reduciendo columnas.

## Colors

Restrained, no Committed: el color decora poco y comunica mucho.

### Primary
- **Ink** (`#0f172a`, slate-900): botones primarios, texto de mayor jerarquía, fondo del hero oscuro y del sidebar.

### Secondary
- **Accent** (`#2563eb`, blue-600): navegación activa, enlaces, barras de gráficos, focus rings. Nunca para "éxito" — ese rol es de `success`.

### Neutral
- **Canvas** (`#f8fafc`, slate-50): fondo de página (`Layout.jsx` `<main>`).
- **Surface** (`#ffffff`): fondo de `Card`, inputs, modales.
- **Border** (`#e2e8f0`, slate-200) / **Border fuerte** (`#cbd5e1`, slate-300): división de filas/columnas vs. bordes de input con foco.
- **Texto silenciado** (`#64748b`, slate-500): metadatos, labels de campo.
- **Texto tenue** (`#94a3b8`, slate-400): placeholders, valores ausentes (`—`).

### Semánticos (estado, no marca)
- **Success** (`#059669`, emerald-600 / fondo `emerald-50` texto `emerald-700` en `Badge`).
- **Warning** (`#d97706`, amber-600 / fondo `amber-50` texto `amber-700`).
- **Danger** (`#dc2626`, red-600 / `ActionIconButton variant="danger"` usa `red-500`; unificar a `red-600` es la dirección, ver Do's and Don'ts).

### Paleta de dominio (Badge, filtros)
`Badge.jsx` define 10 variantes pastel adicionales para distinguir dominios en filtros (`product`=sky, `request`=violet, `reservation`=rose, `agency`=indigo, `user`=cyan, `setting`=orange, `report`=teal, `pending`=yellow, `active`=lime, `inactive`=gray). Son identidad de filtro, no estado — no reusar `danger`/`warning`/`success` para esto y viceversa.

**La Regla del Semáforo Único.** Un color semántico (éxito/alerta/error) significa lo mismo en cualquier parte de la app donde aparezca — un badge, un ícono de acción, un gráfico de torta. `DashboardCharts.jsx` mapea sus colores de "Confirmadas/Pendientes/Canceladas" a los mismos hex que `Badge` `success`/`warning`/`danger`, no a un array de colores arbitrario.

## Typography

**Body/Heading Font:** Inter (con `ui-sans-serif, system-ui` de fallback)
**Mono Font:** JetBrains Mono (con `ui-monospace` de fallback)

**Character:** Una sola familia para todo — títulos, tablas, botones, datos. Es Operate mode: la mezcla display/body de un sitio de marca no aplica, y una escala fluida (`clamp()`) tampoco — los usuarios ven esto a DPI consistente en un dashboard, no en un hero de marketing.

### Hierarchy
- **H1** (600, 2rem, -0.03em): título de página, vive en `PageHeader`.
- **H2** (600, 1.75rem, -0.025em): encabezado de sección/card.
- **Body** (400, 0.875rem / `text-sm`): texto base de tablas y formularios.
- **Meta** (400, 0.75rem / `text-xs`): metadatos, descripciones bajo un título, labels de columna.
- **Micro** (500, 0.6875rem–0.625rem / `text-[10px]`–`text-[11px]`): labels en mayúscula dentro de stat chips, badges muy chicos.
- **Código/ID** (mono, `text-xs font-medium`): número de ticket, PNR, código de cupo — siempre `font-mono`, nunca la fuente base.

**La Regla de las 65-75ch no aplica acá.** Es contenido tabular denso, no prosa — una tabla de 30 columnas corriendo a 120ch+ de ancho es correcto en Operate mode, no un error de layout.

## Layout

Sidebar fijo de 240px (64px colapsado, `SidebarProvider`), contenido en `<main>` con `p-3 sm:p-6`. Cada página raíz es un `<div className="space-y-6">` — nunca padding/max-width propio ahí (`Layout.jsx` ya lo aplica; duplicarlo fue un bug real, ver Historial de Bugs Resueltos).

Estructura estándar de una pantalla de gestión: `PageHeader` (título+ícono+acción) → hero de stats opcional (`StatsHero`) → barra de filtros (`div` plano, nunca `Card`) → tabla (envuelta en `Card`) → modales al final. El 90% de las pantallas de este repo son variaciones de este mismo esqueleto — no inventar uno nuevo.

Responsive: el sidebar colapsa a drawer off-canvas por debajo de `md`, nunca el toggle de colapso-a-riel (ese es solo de escritorio). Las tablas anchas scrollean horizontal dentro de su propio contenedor (`Table.jsx`), nunca desbordan la página.

## Elevation & Depth

Sistema mayormente plano con sombra sutil (`shadow-sm`) en `Card` — no hay una escala de elevación de múltiples niveles. El hero oscuro (`StatsHero`) usa profundidad tonal (capas translúcidas `bg-white/5` sobre el degradado) en vez de sombra — es la excepción, no la regla.

**La Regla del Reposo Plano.** Las superficies están planas en reposo; una sombra solo aparece como respuesta a un estado (hover en un stat chip clickeable, foco en un input) — nunca como decoración fija en una card estática.

## Shapes

- `rounded-3xl` (`Card` genérico, hero oscuro): el contenedor de mayor jerarquía.
- `rounded-2xl` (botones, inputs, stat chips, modales).
- `rounded-xl` (paneles internos, celdas de detalle).
- `rounded-lg` (botones de ícono, ítems de menú desplegable).
- `rounded-md` (badges — más angular que el resto a propósito, para que un badge nunca se confunda visualmente con un botón).

## Components

### Buttons (`Button.jsx`)
- **Shape:** `rounded-2xl`, altura fija por tamaño (`h-9`/`h-10`/`h-12`).
- **Primary:** fondo `ink` (slate-900), texto blanco — la acción principal de la pantalla (una sola por vista).
- **Secondary:** fondo `slate-100`, texto `ink` — acción secundaria/neutral (refrescar, cancelar).
- **Outline / Ghost:** transparente con borde o solo hover — acciones terciarias.
- **Destructive:** fondo `red-500` — reservado a texto+ícono, nunca combinado con `variant="danger"` de `ActionIconButton` en el mismo flujo sin razón.
- **Estados:** `hover`/`active`/`disabled` (opacity 50 + pointer-events-none) ya definidos; falta `:focus-visible` explícito más allá del ring genérico en algunos usos puntuales.

### ActionIconButton (`ActionIconButton.jsx`)
Botón de ícono solo para la columna "Acciones" de toda tabla — **el único patrón válido**, nunca un `Button variant="ghost"` a mano (bug sistémico real, corregido 2026-08-14 en Agencias/Roles/Usuarios/Permisos/Grupos/Temporadas). `variant="danger"` para destructivo (`text-red-500`); acciones positivas no-destructivas via `className` puntual (`text-emerald-600 hover:bg-emerald-50...`), nunca un variant nuevo sin necesidad.

### ActionsOverflow (`ActionsOverflow.jsx`, nuevo)
Menú "···" (`MoreHorizontal`) para filas con más de 2-3 acciones — antes se apilaban hasta 7 `ActionIconButton` sueltos en una celda (`GestionProductos.jsx`), ilegible y con hit-targets de 24px pegados unos a otros. Deja **máximo 2 acciones inline** (la más frecuente + la destructiva) y el resto en el menú. Tema claro explícito (`bg-white border-slate-200`) — el `DropdownMenu` compartido es oscuro por default (pensado para el menú de perfil del sidebar), así que todo uso en una fila de tabla clara necesita este override.

### Badges (`Badge.jsx`)
15 variantes fijas (ver Colors). **Nunca** un nombre inventado que no esté en esta lista — pasó con `error` en `BandejaTickets.jsx` (bug real, el badge quedaba sin color aplicado, silenciosamente).

### Cards (`Card.jsx`)
- **Corner:** `rounded-3xl`.
- **Background:** blanco, borde `slate-200`, `shadow-sm`.
- **Nunca** un acento de borde grueso de un solo lado (`border-l-4`) para señalar una sección especial — es la marca más reconocible de UI genérica-de-IA; usar un borde uniforme más suave (`border-amber-200`) en su lugar, como ya hace `BlockedReservationsWidget`.

### Tables (`Table.jsx`)
- Columna "Acciones" siempre primera.
- `sticky` (columna Acciones + checkbox) solo en tablas genuinamente anchas (~20+ columnas) — criterio por ancho real, no por costumbre de copiar la pantalla vecina.
- Montos/números alineados a la derecha, `font-mono`, para que se puedan escanear en columna.
- Estados vacío/carga: siempre `EmptyState` (ícono emoji) / `SkeletonTable` — nunca un div de spinner o texto plano a mano.

### Stat Hero (`StatsHero.jsx`)
Degradado `slate-900 → slate-800 → indigo-950`, cards translúcidas (`bg-white/5 border-white/10`). Acepta `onClick` opcional por stat (chevron aparece en hover) — úsalo cuando el número tenga una pantalla de destino obvia (no lo agregues si no hay a dónde navegar).

### Navigation (`Sidebar.jsx`)
Ítems agrupados por dominio (Cupos y Reservas / Catálogo / Sistema / Ajustes y Usuarios), el grupo de la ruta activa se auto-expande al entrar. Un ícono por concepto — nunca reciclar el mismo ícono (`Users`) para dos conceptos distintos (Nóminas vs. Gestión de usuarios) en el mismo menú.

## Do's and Don'ts

### Do:
- **Do** usar siempre el kit propio (`Button`/`Card`/`Badge`/`Table`/`ActionIconButton`/`ActionsOverflow`/`PageHeader`) — nunca los archivos `shadcn-*`, que son legado exclusivo de `Settings.jsx`/`Notificaciones.jsx`/`ReportFilters.jsx`.
- **Do** expresar todo color/tamaño/espaciado en una clase Tailwind — un `style={{ color: '#2563eb' }}` en una página es casi siempre una señal de que no se miró cómo lo resuelve el resto de la app.
- **Do** usar `svg.lucide { stroke-width: 1.75 }` (ya seteado global en `index.css`) — no pisarlo con un `stroke-width` puntual salvo necesidad real.
- **Do** dejar inline solo las acciones universales de la fila (editar + la destructiva) y colapsar en `ActionsOverflow` las situacionales/condicionales (enviar, confirmar, aprobar/rechazar, etc.) — no es una regla de conteo fijo, es sobre qué tan frecuente/universal es cada acción. Una pantalla donde 3-4 acciones son igual de centrales al flujo (ej. Roles: gestionar permisos + ver usuarios) puede dejarlas todas inline.

### Don't:
- **Don't** usar `border-l-4`/`border-r-4` de acento en una `Card` — borde uniforme y sutil en su lugar.
- **Don't** inventar un variant de `Badge` que no exista en `Badge.jsx`.
- **Don't** reciclar un ícono de `lucide-react` para dos conceptos distintos en el mismo contexto (menú, tabla) — cada concepto, su propio ícono, consistente en toda la app.
- **Don't** mezclar dos tonos de rojo para "destructivo" (`red-500` vs `red-600`) ni dos hex para el mismo `confirmButtonColor` de SweetAlert — un solo rojo (`#dc2626`) en toda la app.
