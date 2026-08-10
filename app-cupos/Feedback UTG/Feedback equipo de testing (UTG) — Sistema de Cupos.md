

Fuente: mail "COMENTARIOS NUEVO SISTEMA CUPOS", Valentina Recoba (UTG) + equipo, 2026-08-06/07.
Normalizado y agrupado por módulo para planificar el próximo sprint. Incluye decisiones de producto tomadas sobre el feedback original (ver notas "→ decisión").

## 1. Productos / Carga de Cupo

- [ ] Campo de **KG por franquicia de equipaje** (carry-on, handbag, checked bag) — puede variar según el producto.
- [ ] Agregar un lugar para **subir links de los paquetes asociados al producto** (alimenta el modal "Paquetes" de Disponibilidad, ver sección 2).
- [ ] Agregar campos: **Compañía (cía)** y **Fecha de salida** al alta/edición de producto.
- [ ] Aclarar la lógica de generación del **Código de Cupo** (autogenerado, pero no está claro qué reglas sigue).
- [ ] La ficha asociada a un cupo debería decir explícitamente **"Ficha Operativa"** (confirmar si es ese el concepto).
- [ ] Agregar columna de **Cedidos** (y a quién se cedió) en la vista de producto — ya está en nómina/reservas pero falta acá.
- [ ] → decisión: en el modal de crear producto, la sección de **Precios** debe individualizar **Neto 1** y **OP** por tipo de pasajero (ADT, CHD, INF), no como un valor único mezclado. Lógica de cálculo:
  - `Neto 1 = Tarifa + Impuestos` (por tipo de pasajero).
  - `Venta (calculada) = Neto 1 + OP` = `Tarifa + Impuestos + OP` (el OP es la ganancia, por eso se suma para armar la venta).
  - Repetir esta fórmula para ADT, CHD e INF por separado.

## 2. Disponibilidad

- [ ] Quitar la columna **Tipo** — no aporta valor al usuario.
- [ ] Cambiar los iconos de equipaje, por iconos de google icons: handbag = personal_bag / carryon = carry_on_bag / checked bag = travel_luggage_and_bags, en caso de querer usar otro paquete de iconos, por favor que sean igual de representativos que esta sugerencia.
- [ ] Cambiar labels **Adulto / Bebé / Niño** por **ADT / CHD / INF**.
- [ ] Mostrar la cantidad de **lugares bloqueados/temporales en la línea del producto** (al lado de la cantidad de disponibles, como un cuadradito de otro color) → decisión: reemplaza el aviso genérico arriba de la tabla, que se pierde cuando hay varios productos con bloqueos.
- [ ] Mostrar el **detalle del kilaje** al pasar el cursor por encima de cada ícono de equipaje activo.
- [ ] Agregar columna **Paquetes**: botón igual al de "Ruta" que abra un modal con los paquetes asociados a ese producto (son links → soportar ese tipo de dato).
- [ ] → decisión: no crear un filtro para Disponibilidad. En su lugar, permitir **ordenar la tabla** (asc/desc) por columna, incluyendo una columna de **precio**.

## 3. Reserva de Cupo (formulario)

- [ ] Recordar la lógica de negocio: el **infante no ocupa espacio/cupo, pero sí es pasajero** (ligado al bug de cálculo de tipo de pasajero, ver más abajo).
- [ ] → decisión: quitar la sección de **Contacto**. El **pasajero 1** pasa a tener dos campos extra: **teléfono** y **email**.
- [ ] En la primera pantalla, aclarar si el cupo/disponibilidad aplica para adultos, CHD e infantes.
- [ ] Mejorar el diseño de la **ruta** dentro del formulario (hoy se ve poco legible/"fea").
- [ ] → decisión: **Hotel** y **Traslados** (sí/no + texto libre) van en una nueva sección **"Servicios"** del formulario, en vez de campos sueltos — tiene más sentido y mejora el layout visual.
- [ ] Agregar campo **Vencimiento de documento** con opción **"vitalicio"**.
- [ ] Convertir en **mandatorios**: la **ficha** y **todos los datos del pasajero**.
- [x] Bug: el cálculo de tipo de pasajero (adulto/CHD/infante) no se recalcula contra la fecha de **regreso** del viaje — usa solo fecha de salida/nacimiento. Caso de prueba: nacimiento 02/01/2027, regreso 09/01/2027, queda como infante cuando no correspondería. → **Corregido 2026-08-10**, ver [[Historial de Bugs Resueltos]].

## 4. Gestión de Nóminas

- [ ] En el resumen "Confirmadas / Pendientes", mostrar **total de PAX**, no total de fichas.
- [ ] Colores por familia/ficha (agrupación visual).
- [ ] Reordenar columnas: botones de acción al inicio, luego Ficha, Vendedor, Ruta, Localizador/PNR — hoy "No trajo neto" y otros campos van antes.
- [ ] Exportar a Excel: permitir filtrar antes de descargar (no exportar todo crudo).
- [ ] Exportar a BO: a validar (estaba en pruebas al momento del mail).
- [x] Bug: al confirmar/vender pasajeros no se actualiza el contador **ADT-CHD-INF**. → **Corregido 2026-08-10** (excluye cancelados del conteo), ver [[Historial de Bugs Resueltos]]. Confirmar con UTG si el criterio de "activo" (confirmados+pendientes, no solo confirmados) es lo que esperaban.
- [x] Bug/inconsistencia: en los casos de prueba, las reservas "genuinas" aparecen marcadas como cedidas y viceversa (posiblemente ligado al rol UTG como agencia cedente/receptora — revisar lógica de cedidos por agencia). → **Corregido 2026-08-10** (fix de scoping en backend + badge en frontend), ver [[Historial de Bugs Resueltos]].

## 5. Cupos Solicitados

- [ ] Cuando una solicitud "cae sola" (se vence/rechaza automáticamente), la acción debería ser **cancelar** directamente, no "solicitar cancelación".

## 6. Reservas

- [ ] Mover **Estado** y **Voucher** más adelante/visibles en la fila (hoy quedan al final).
- [ ] Reordenar columnas: Destino, Cía, Salida, Pasajero, Ficha... (Nº de pedido al final, Agencia al final o directamente ocultarla).
- [ ] Agregar filtro de texto libre (por ficha o texto general).
- [ ] Confirmar alcance: ¿la grilla debe listar también reservas de viajes ya finalizados/viajados?
- [ ] En el voucher/itinerario PDF: **no** mostrar el localizador de reserva.
- [ ] En el voucher/itinerario PDF: sumar otros datos del pasajero (documento u otro campo).

## 7. Confirmaciones

- [ ] Permitir **agrupar reservas** del mismo producto (ej. checkbox de selección múltiple) y generar **un solo PDF** que sume todos los nombres, en vez de un voucher por pasajero/reserva — hoy es engorroso enviar varios archivos individuales para una misma familia.

## 8. Avisos

- [ ] Notificar al usuario/pasajero de una reserva cuando el **producto asociado sufre cambios** de ruta, fecha de salida o fecha de llegada.

## 9. Transversal / General

- [ ] Revisar gestión de roles/permisos de **usuarios para el equipo** (UTG mencionó que esto ya se resolvió — confirmar estado).

---

**Siguiente paso:** priorizar y convertir en tareas para el próximo plan de trabajo.
