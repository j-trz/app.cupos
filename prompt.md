# Prompt: Flujo de reservas con bloqueo temporal, precios congelados y alertas de cupo

## Contexto técnico / arquitectura existente

El sistema corre sobre un backend Node/Express (`index.js`) con acceso a Postgres
vía `pg` (`db.js`), pensado para funcionar tanto sobre Supabase como sobre
Postgres genérico (Neon, RDS, local) según la variable `DB_PROVIDER`. El
esquema de base de datos vive en un script SQL consolidado
(`schema.sql`) que ya define, entre otras, estas tablas
reutilizables para esta implementación:

- `public.profiles` (usuarios, con `role`: `admin` / `agency_admin` / `agency_user`,
  y `agencia`).
- `public.agencies` (catálogo de agencias/clientes).
- `products` y `reservations` (definidas actualmente en `db.js`): son la base
  de cupos y reservas sobre la que hay que **agregar** las columnas de precios
  congelados, estados de bloqueo, etc. — no crear tablas paralelas nuevas.
- `public.notifications` + `public.user_notification_states`: sistema de
  notificaciones in-app ya existente, con soporte de destinatario por usuario
  o por rol (`target_user_id` / `target_role`). Las alertas in-app de las
  secciones 3 y 4 de este prompt deberían apoyarse en este sistema en vez de
  crear uno nuevo desde cero, salvo que no alcance para el caso de uso (por
  ejemplo, si se necesita el cálculo de cuenta regresiva en el front, que no
  requiere tabla nueva, solo el timestamp).
- `public.user_security_status`, `public.user_sessions`: seguridad/2FA y
  sesiones, no relacionadas directamente con este flujo pero parte del mismo
  esquema.

### Fuera de alcance explícito: conexiones a APIs externas

La gestión de conexiones a APIs externas y sus credenciales
(`data_connections`, `api_credentials`, `service_credentials`,
`connection_data_types`, y las rutas `/api/connections` del backend) remover 
del esquema y del servidor Express. Ese dominio se maneja en un
backend separado ya existente y **no debe reintroducirse, referenciarse ni
recrearse** como parte de la implementación de este prompt (precios
congelados, bloqueo temporal, alertas de cupo, emails). Si en algún punto
pareciera necesario tocar algo de conexiones/credenciales de API para
cumplir un requisito de este documento, es señal de que ese requisito está
mal interpretado — hay que resolverlo dentro del dominio de reservas/cupos,
no ahí.

## Contexto

Sistema de gestión de cupos (reservas de viajes/turismo). Actualmente el flujo es
`solicitud → reserva`. Necesito extender el modelo y la lógica de negocio para
soportar precios congelados por reserva, un paso intermedio de bloqueo temporal,
un módulo de alertas asociado a ese bloqueo, y un mecanismo de control de cupo
por umbral. Implementalo sobre la base de datos y backend existentes, sin romper
los flujos actuales de solicitud/confirmación.

## 1. Precios congelados por reserva

- Cada reserva debe almacenar **dos precios en el momento en que se crea**:
  - `precio_venta`: precio visible para el usuario final (front).
  - `neto_1`: costo neto interno. **Nunca debe exponerse en el front para el
    usuario final**, solo debe ser visible en el panel de administrador. Sí debe
    viajar en las respuestas del backend (para que el admin lo consuma), pero el
    front de usuario debe filtrarlo/omitirlo explícitamente antes de renderizar.
  - Ambos precios deben quedar **fijos ("congelados") al momento de crear la
    reserva**, tomando el valor vigente del cupo en ese instante. Si el precio del
    cupo cambia después, las reservas ya existentes NO deben verse afectadas.
- Implicación de modelo de datos: la tabla de reservas necesita sus propias
  columnas `precio_venta` y `neto_1` (no un JOIN en vivo contra la tabla de
  cupos/precios), justamente para preservar el valor histórico.
- Regla de autorización: cualquier endpoint/query que devuelva reservas a un rol
  no-admin debe excluir o anonimizar `neto_1` a nivel de serialización (no confiar
  solo en el front para ocultarlo).

## 2. Nuevo paso intermedio: bloqueo temporal

Flujo actual: `solicitud → reserva`
Flujo nuevo:

```
solicitud → bloqueo temporal → admin confirma → bloqueo permanente (reserva confirmada)
```

- Al pasar de `solicitud` a `bloqueo_temporal`, el cupo correspondiente debe
  descontarse/reservarse (para que no lo tome otro usuario), pero el estado debe
  quedar marcado como temporal, no como confirmado.
- El **tiempo de duración del bloqueo temporal es configurable por producto/cupo**.
  Modelo de datos:
  - Columna `bloqueo_temporal_minutos` (nullable) en la tabla de productos/cupos.
  - Si el producto no tiene un valor propio configurado (`null`), se usa un
    **default global de 60 minutos (1h)**, definido en `system_settings` o
    equivalente. El default global también debe ser editable por el admin.
  - Al resolver cuánto dura el bloqueo de una reserva puntual: usar el valor del
    producto si existe, si no, el default global.
- Si el admin confirma dentro del plazo → la reserva pasa a `bloqueo_permanente`
  / `confirmada`, y el cupo queda definitivamente descontado.
- Si el plazo vence sin confirmación → la reserva debe expirar automáticamente
  vía el **barrido periódico** descripto abajo, liberando el cupo bloqueado y
  quedando en un estado tipo `expirada` o `cancelada_por_tiempo` (a definir
  naming).

### Mecanismo de expiración del bloqueo temporal (agnóstico de infraestructura)

Requisito clave: el mecanismo **no debe depender de dónde se aloje la app**
(Supabase, VPS propio, Vercel, etc.). Un job individual por registro (ej.
`pg_cron` por fila, colas con Redis) ata la solución a una infraestructura
puntual y se rompe si cambia el hosting. Por eso el mecanismo principal debe
ser un **barrido periódico vía endpoint HTTP**, no un timer por fila:

- Implementar un endpoint (ej. `POST /internal/cron/expirar-bloqueos`) que:
  1. Busca todas las reservas en `bloqueo_temporal` cuyo `bloqueo_expira_at`
     ya venció.
  2. Las pasa a `expirada`, libera el cupo bloqueado, y dispara la
     notificación correspondiente (in-app + email si aplica).
  3. Debe ser **idempotente**: correrlo dos veces seguidas no debe duplicar
     liberaciones de cupo ni notificaciones.
- Ese endpoint se invoca cada **1 minuto** mediante lo que el hosting elegido
  ofrezca para cron (Vercel Cron, cron-job.org, GitHub Actions, crontab, tarea
  programada de Supabase, etc.). La lógica de negocio vive en el endpoint, no
  en el disparador — así cambiar de hosting solo implica reconfigurar quién
  llama al endpoint, no reescribir la lógica.
- Este endpoint debe protegerse (ej. header secreto / token) para que no sea
  invocable públicamente por cualquiera.
- Trade-off aceptado: la expiración puede demorar hasta ~1 minuto respecto al
  vencimiento exacto (el intervalo del barrido). Es aceptable para este caso
  de uso; si en el futuro se necesita precisión al segundo, se puede
  complementar con un job por fila como optimización, pero no reemplaza este
  mecanismo base.

### Estados sugeridos para la reserva

```
solicitud
  → bloqueo_temporal   (cupo reservado, plazo corriendo)
    → bloqueo_permanente / confirmada   (admin confirmó a tiempo)
    → expirada                          (venció el plazo sin confirmación → libera cupo)
  → cancelada                           (cancelación manual en cualquier punto)
```

## 3. Módulo de alertas para reservas en bloqueo temporal

- Para cada reserva en estado `bloqueo_temporal`, el sistema debe poder informar
  al usuario **cuánto tiempo falta antes de que expire el bloqueo** (ej. "Tu
  reserva se cancelará en 12 minutos si no se confirma").
- **Canal in-app: siempre activo, no configurable.** Todo usuario con una
  reserva en `bloqueo_temporal` debe poder ver el tiempo restante en la UI,
  calculado en el front contra `bloqueo_expira_at` (no requiere estado
  adicional, solo el timestamp de creación/expiración del bloqueo).
- **Canal email: configurable.** El admin debe poder activar/desactivar el
  envío de email de aviso de vencimiento próximo (ej. checkbox en
  `system_settings` o por producto). Si está activo, definir al menos un
  umbral de aviso (ej. "avisar por email cuando falten X minutos").

## 4. Control de cupo por umbral (alertas de disponibilidad)

- Necesito una función/trigger que, cuando el cupo disponible de un producto
  llegue a **X lugares restantes** (umbral configurable por el admin, por
  producto, definido como **número absoluto de lugares**, no porcentaje),
  dispare una o más acciones configurables.
- **Destinatarios de la alerta**: admin y agencia (ambos).
- **Canal**: al igual que en la sección 3, in-app siempre activo; email
  configurable (puede ser el mismo flag global o uno específico por regla, a
  criterio de implementación, pero debe existir un on/off).
- **Acciones a contemplar en el diseño** (multi-selección por regla, no
  excluyentes entre sí):
  - v1 (implementar ya):
    - Enviar **email** a admin y agencia.
    - Mostrar **alerta/badge in-app** en el panel (ej. "quedan 3 lugares").
    - **Bloquear la venta** del cupo (impedir nuevas solicitudes aunque
      técnicamente resten lugares).
  - Futuro (dejar el modelo de datos preparado para agregarlas sin migrar de
    nuevo, pero no implementarlas todavía):
    - **Webhook / integración externa** (Slack, Telegram, CRM).
    - **Ajuste automático de precio** (revenue management al quedar pocos
      lugares).
- El listado de acciones debe modelarse como algo extensible (ej. columna
  `acciones: string[]` o tabla de relación `regla_alerta_accion`), no como
  columnas booleanas fijas tipo `envia_email boolean`, `bloquea_venta boolean`,
  para no tener que migrar cada vez que se agregue una acción nueva.
- Sugerencia de diseño: un registro de "reglas de alerta de cupo" por producto
  (`cupo_id`, `umbral_lugares`, `acciones: string[]`, `activo: boolean`), evaluado
  cada vez que se descuenta stock del cupo (al pasar a `bloqueo_temporal` o al
  confirmarse), en vez de un cron que recorra todo periódicamente.
- Evitar disparar la misma alerta repetidamente por cada unidad vendida una vez
  cruzado el umbral (idealmente se dispara una sola vez al cruzar el umbral hacia
  abajo, con posibilidad de reset si el cupo se recompone).

## 5. Sistema de emails transaccionales al usuario final

Además de las alertas administrativas (secciones 3 y 4), se necesita un
sistema de emails dirigidos al **usuario que hizo la reserva**, disparados por
distintos eventos del flujo. Debe diseñarse como un sistema de plantillas
extensible, no como envíos de email hardcodeados en cada punto del código.

- **Eventos que deben disparar email al usuario** (lista inicial, extensible):
  - Confirmación de que su reserva quedó en `bloqueo_temporal` (con el tiempo
    límite para que se confirme).
  - Confirmación de que su reserva pasó a `bloqueo_permanente`/`confirmada`.
  - Aviso de que el bloqueo expiró sin confirmarse (`expirada`).
  - Envío del detalle de la reserva/vuelos a su email (a demanda, ej. botón
    "reenviar por email" o automático al confirmarse).
- **Diseño sugerido**:
  - Un sistema de plantillas de email por tipo de evento (ej. tabla
    `email_templates` con `codigo_evento`, `asunto`, `cuerpo_html`,
    variables/placeholders tipo `{{nombre_usuario}}`, `{{fecha_vuelo}}`, etc.),
    para que el contenido se pueda editar sin tocar código.
  - Un servicio único de envío (`EmailService.send(codigoEvento, destinatario,
    datos)`) que todos los puntos del flujo (creación de bloqueo, confirmación,
    expiración, reenvío manual) invocan, en vez de construir el email inline
    en cada lugar.
  - Registro de envíos (`email_log` o similar) con estado (enviado, fallido,
    reintentado) para poder auditar si un usuario reclama no haber recibido un
    email.
- Esta sección es independiente del flag de "email configurable" de las
  secciones 3 y 4 (esos son avisos operativos hacia admin/agencia); los emails
  de esta sección 5 son transaccionales hacia el cliente final y, salvo que se
  indique lo contrario, **no deberían ser opcionales** (un usuario siempre
  debe poder confirmar por email que su reserva existe/se confirmó).

## Entregables esperados

1. Cambios de esquema (migraciones) para:
   - Columnas `precio_venta` y `neto_1` en la tabla de reservas.
   - Estados nuevos de reserva (`bloqueo_temporal`, `bloqueo_permanente`/`confirmada`,
     `expirada`).
   - Columna `bloqueo_temporal_minutos` en productos/cupos + default global en
     `system_settings`.
   - Tabla de reglas de alerta de cupo por umbral (número absoluto de lugares).
   - Tabla `email_templates` y `email_log` para el sistema de emails
     transaccionales.
2. Lógica de backend:
   - Creación de reserva con precios congelados.
   - Endpoint `POST /internal/cron/expirar-bloqueos` (protegido por token) para
     el barrido periódico de expiración.
   - Endpoint(s) de admin para configurar minutos de bloqueo, reglas de umbral,
     y flags de email configurable (secciones 3 y 4).
   - Serialización que oculta `neto_1` a usuarios no-admin.
   - Trigger/evaluación de umbral de cupo con acciones configurables.
   - `EmailService` centralizado para los emails transaccionales al usuario
     (sección 5).
3. Frontend:
   - Contador de tiempo restante in-app para reservas en `bloqueo_temporal`.
   - Badge/alerta in-app de cupo bajo umbral (admin/agencia).
4. Tests o casos de prueba cubriendo:
   - Reserva conserva su precio aunque el precio del cupo cambie después.
   - El endpoint de cron expira correctamente reservas vencidas y es
     idempotente si se llama dos veces.
   - `neto_1` nunca aparece en respuestas dirigidas a usuario final.
   - Alerta de umbral se dispara una sola vez al cruzar el límite.
   - Emails transaccionales se disparan en cada evento del flujo (bloqueo,
     confirmación, expiración, reenvío manual).

## Decisiones ya tomadas (no reabrir sin razón)

- Bloqueo temporal: configurable **por producto/cupo**; si el producto no
  define un valor, usar **default global de 60 minutos**.
- Expiración del bloqueo temporal: mediante **endpoint HTTP de barrido
  periódico** invocado por cron externo (agnóstico de hosting), no por job
  individual por fila atado a una infraestructura específica.
- Umbral de cupo bajo: **número absoluto** de lugares restantes (no
  porcentaje).
- Destinatarios de alerta de umbral: **admin y agencia**.
- Acciones de umbral en v1: **email + alerta in-app + bloqueo de venta**.
  Webhook, ajuste de precio y pausa de ads quedan modelados pero no
  implementados en esta primera versión.
- Notificaciones operativas (secciones 3 y 4, hacia admin/agencia): **in-app
  siempre activo, email configurable** (on/off por admin).
- Emails transaccionales al usuario final (sección 5): confirmación de
  bloqueo, confirmación de reserva, aviso de expiración, y reenvío de detalle
  de vuelos — vía sistema de plantillas, **no opcionales** salvo indicación
  contraria.

## Preguntas que siguen abiertas

- Para el sistema de plantillas de email (sección 5): ¿ya existe un proveedor
  de envío configurado en el proyecto (ej. Resend, SendGrid, SES, SMTP propio),
  o hay que definirlo desde cero? Esto condiciona cómo se implementa
  `EmailService`.