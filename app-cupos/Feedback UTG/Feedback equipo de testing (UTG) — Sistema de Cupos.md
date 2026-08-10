

Fuente: mail "COMENTARIOS NUEVO SISTEMA CUPOS", Valentina Recoba (UTG) + equipo, 2026-08-06/07.
Normalizado y agrupado por módulo para planificar el próximo sprint. Incluye decisiones de producto tomadas sobre el feedback original (ver notas "→ decisión").

## 1. Productos / Carga de Cupo

- [x] Campo de **KG por franquicia de equipaje** (carry-on, handbag, checked bag) — puede variar según el producto. → **Implementado 2026-08-10** (`carryon_kg`/`handbag_kg`/`checkedbag_kg`).
- [x] Agregar un lugar para **subir links de los paquetes asociados al producto** (alimenta el modal "Paquetes" de Disponibilidad, ver sección 2). → **Implementado 2026-08-10** (`package_links`, lista de `{url, label}`).
- [x] Agregar campos: **Compañía (cía)** y **Fecha de salida** al alta/edición de producto. → Ya existían en el formulario y el modelo — sin cambios necesarios.
- [x] Aclarar la lógica de generación del **Código de Cupo** (autogenerado, pero no está claro qué reglas sigue). → **Aclarado 2026-08-10** con un texto de ayuda en el formulario (`TIPO-DESTINO-secuencial`); no se cambió el formato del código (evita romper cupos ya generados).
- [x] La ficha asociada a un cupo debería decir explícitamente **"Ficha Operativa"** (confirmar si es ese el concepto). → **Renombrado 2026-08-10**.
- [x] Agregar columna de **Cedidos** (y a quién se cedió) en la vista de producto — ya está en nómina/reservas pero falta acá. → **Implementado 2026-08-10**.
- [ ] → decisión: en el modal de crear producto, la sección de **Precios** debe individualizar **Neto 1** y **OP** por tipo de pasajero (ADT, CHD, INF), no como un valor único mezclado. **Pendiente — Fase 3 del plan, todavía no implementada** (mayor blast radius: reportes, IA, transferencias). Lógica de cálculo:
  - `Neto 1 = Tarifa + Impuestos` (por tipo de pasajero).
  - `Venta (calculada) = Neto 1 + OP` = `Tarifa + Impuestos + OP` (el OP es la ganancia, por eso se suma para armar la venta).
  - Repetir esta fórmula para ADT, CHD e INF por separado.

## 2. Disponibilidad

- [x] Quitar la columna **Tipo** — no aporta valor al usuario. → **Implementado 2026-08-10**.
- [x] Cambiar los iconos de equipaje, por iconos de google icons: handbag = personal_bag / carryon = carry_on_bag / checked bag = travel_luggage_and_bags, en caso de querer usar otro paquete de iconos, por favor que sean igual de representativos que esta sugerencia. → **Implementado 2026-08-10, con una salvedad**: no se pudo traer el SVG oficial exacto de Google Material Symbols en este entorno (la herramienta de descarga devolvió datos incorrectos) — se dibujaron 3 íconos propios (`BaggageFranchise.jsx`) que representan lo mismo (bolso personal / valija de cabina con ruedas / valija despachada), mismo estilo trazo que el resto de la app. Si UTG consigue el SVG real, se reemplaza directo ahí.
- [x] Cambiar labels **Adulto / Bebé / Niño** por **ADT / CHD / INF**. → **Implementado 2026-08-10** (solo esta tabla — el selector de tipo de pasajero del formulario de reserva no se tocó, es un valor persistido en toda la base).
- [x] Mostrar la cantidad de **lugares bloqueados/temporales en la línea del producto** (al lado de la cantidad de disponibles, como un cuadradito de otro color) → decisión: reemplaza el aviso genérico arriba de la tabla, que se pierde cuando hay varios productos con bloqueos. → **Implementado 2026-08-10** (el banner general arriba de la tabla se mantuvo también, no se quitó).
- [x] Mostrar el **detalle del kilaje** al pasar el cursor por encima de cada ícono de equipaje activo. → **Implementado 2026-08-10** (tooltip nativo `title`).
- [x] Agregar columna **Paquetes**: botón igual al de "Ruta" que abra un modal con los paquetes asociados a ese producto (son links → soportar ese tipo de dato). → **Implementado 2026-08-10**.
- [x] → decisión: no crear un filtro para Disponibilidad. En su lugar, permitir **ordenar la tabla** (asc/desc) por columna, incluyendo una columna de **precio**. → **Implementado 2026-08-10** (columnas ordenables: cupo, destino, compañía, disponibilidad, salida, regreso, temporada, precio ADT).

## 3. Reserva de Cupo (formulario)

- [x] Recordar la lógica de negocio: el **infante no ocupa espacio/cupo, pero sí es pasajero** (ligado al bug de cálculo de tipo de pasajero, ver más abajo). → **Implementado 2026-08-10**, end-to-end: no resta `Disponibilidad` al crear/duplicar/agregar un pasajero infante, y tampoco se la devuelve de más al cancelar/eliminar/expirar (9 puntos del backend corregidos, ver [[Modelo de Datos]] §1).
- [x] → decisión: quitar la sección de **Contacto**. El **pasajero 1** pasa a tener dos campos extra: **teléfono** y **email**. → **Implementado 2026-08-10** (se mantiene `Reservation.Contacto*` en el modelo — `contacto_nombre` ahora se deriva del nombre+apellido del pasajero 1 en vez de pedirse a mano).
- [x] En la primera pantalla, aclarar si el cupo/disponibilidad aplica para adultos, CHD e infantes. → **Implementado 2026-08-10**.
- [x] Mejorar el diseño de la **ruta** dentro del formulario (hoy se ve poco legible/"fea"). → **Implementado 2026-08-10** (reusa `ItineraryTable`, el mismo componente ya usado en el modal "Ver Ruta").
- [x] → decisión: **Hotel** y **Traslados** (sí/no + texto libre) van en una nueva sección **"Servicios"** del formulario, en vez de campos sueltos — tiene más sentido y mejora el layout visual. → **Implementado 2026-08-10**.
- [x] Agregar campo **Vencimiento de documento** con opción **"vitalicio"**. → **Implementado 2026-08-10**.
- [x] Convertir en **mandatorios**: la **ficha** y **todos los datos del pasajero**. → **Implementado 2026-08-10** (nombre, apellido, documento, nacimiento, nacionalidad por pasajero + ficha de venta a nivel reserva; también se agregó un input de nacionalidad manual, que antes solo se completaba vía Atlas).
- [x] Bug: el cálculo de tipo de pasajero (adulto/CHD/infante) no se recalcula contra la fecha de **regreso** del viaje — usa solo fecha de salida/nacimiento. Caso de prueba: nacimiento 02/01/2027, regreso 09/01/2027, queda como infante cuando no correspondería. → **Corregido 2026-08-10**, ver [[Historial de Bugs Resueltos]].

## 4. Gestión de Nóminas

- [x] En el resumen "Confirmadas / Pendientes", mostrar **total de PAX**, no total de fichas. → **Implementado 2026-08-10** ("PAX Confirmados" ahora cuenta pasajeros, no fichas).
- [x] Colores por familia/ficha (agrupación visual). → **Implementado 2026-08-10** (tono alternado por grupo de pedido).
- [x] Reordenar columnas: botones de acción al inicio, luego Ficha, Vendedor, Ruta, Localizador/PNR — hoy "No trajo neto" y otros campos van antes. → **Implementado 2026-08-10** parcialmente: Acciones, Ficha y Vendedor ahora van primero — esta tabla no tenía columnas de Ruta/Localizador-PNR para reordenar (existen en la tabla de Reservas, ver sección 6).
- [x] Exportar a Excel: permitir filtrar antes de descargar (no exportar todo crudo). → **Implementado 2026-08-10** (exporta solo lo visible tras aplicar búsqueda/temporada/destino/fechas).
- [ ] Exportar a BO: a validar (estaba en pruebas al momento del mail). → **Sin cambios de código** — pendiente de confirmación de UTG sobre si ya se validó.
- [x] Bug: al confirmar/vender pasajeros no se actualiza el contador **ADT-CHD-INF**. → **Corregido 2026-08-10** (excluye cancelados del conteo), ver [[Historial de Bugs Resueltos]]. Confirmar con UTG si el criterio de "activo" (confirmados+pendientes, no solo confirmados) es lo que esperaban.
- [x] Bug/inconsistencia: en los casos de prueba, las reservas "genuinas" aparecen marcadas como cedidas y viceversa (posiblemente ligado al rol UTG como agencia cedente/receptora — revisar lógica de cedidos por agencia). → **Corregido 2026-08-10** (fix de scoping en backend + badge en frontend), ver [[Historial de Bugs Resueltos]].

## 5. Cupos Solicitados

- [x] Cuando una solicitud "cae sola" (se vence/rechaza automáticamente), la acción debería ser **cancelar** directamente, no "solicitar cancelación". → **Implementado 2026-08-10** — se decidió no ofrecer ninguna acción (ya está resuelta sola), mostrando "Cancelada (venció sola)" en vez del botón.

## 6. Reservas

- [x] Mover **Estado** y **Voucher** más adelante/visibles en la fila (hoy quedan al final). → **Implementado 2026-08-10**: Estado ahora es la primera columna. No existe una columna "Voucher" separada del botón "Generar Itinerario" (que ya cumple ese rol) — se dejó donde está, en Acciones.
- [x] Reordenar columnas: Destino, Cía, Salida, Pasajero, Ficha... (Nº de pedido al final, Agencia al final o directamente ocultarla). → **Implementado 2026-08-10**: Estado, Destino, Cía (columna nueva, no existía), Salida, Nombre, Apellido, Ficha, Documento, Tipo, Ruta, Vencimiento, Cesión, Contacto, Doc.Contable, Ticket, Precio Venta, Neto 1, OP, Vendedor, ID Pedido, Agencia, Acciones.
- [x] Agregar filtro de texto libre (por ficha o texto general). → Ya existía un filtro de texto libre; solo le faltaba buscar por **ficha** — **agregado 2026-08-10**.
- [ ] Confirmar alcance: ¿la grilla debe listar también reservas de viajes ya finalizados/viajados? → **Pregunta abierta, sin cambios de código** — pendiente de confirmar con Julian/UTG.
- [x] En el voucher/itinerario PDF: **no** mostrar el localizador de reserva. → **Implementado 2026-08-10** (`ItineraryPDF.jsx`, componente compartido por Reservas/Confirmaciones — quitado también del `<title>` de la ventana de impresión).
- [x] En el voucher/itinerario PDF: sumar otros datos del pasajero (documento u otro campo). → **Implementado 2026-08-10** (documento de cada pasajero).

## 7. Confirmaciones

- [x] Permitir **agrupar reservas** del mismo producto (ej. checkbox de selección múltiple) y generar **un solo PDF** que sume todos los nombres, en vez de un voucher por pasajero/reserva — hoy es engorroso enviar varios archivos individuales para una misma familia. → **Implementado 2026-08-10** (checkbox por fila + botón "Generar PDF agrupado", habilitado solo si las filas seleccionadas son del mismo producto).

## 8. Avisos

- [x] Notificar al usuario/pasajero de una reserva cuando el **producto asociado sufre cambios** de ruta, fecha de salida o fecha de llegada. → **Implementado 2026-08-10**: se notifica a quien creó cada reserva activa (excluye canceladas/expiradas/holds) sobre ese producto, vía notificación in-app (`product_changed`), al guardar un cambio de ruta/fecha de salida/fecha de regreso desde Gestión de Productos.

## 9. Transversal / General

- [ ] Revisar gestión de roles/permisos de **usuarios para el equipo** (UTG mencionó que esto ya se resolvió — confirmar estado).

---

**Estado (2026-08-10):** Fases 1 y 2 del plan implementadas y verificadas a nivel de código (`go build`/`go vet` + `npm run build`/`npm run lint`, todo limpio en los archivos tocados). **Sin verificación visual en navegador** — no hay entorno de test separado (dev local y producción comparten la misma base), ver `app-cupos/006 - Operación y Mantenimiento/Gotchas y Reglas de Oro.md`. Falta: revisar visualmente el formulario de reserva (Servicios, vencimiento de documento, contacto en pasajero 1) y las tablas reordenadas antes de considerar esto realmente cerrado. **Fase 3 (individualizar Neto1/OP por tipo de pasajero) todavía no arrancó** — es la de mayor blast radius, ver el plan.
