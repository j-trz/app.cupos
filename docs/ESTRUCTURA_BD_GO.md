# Estructura Completa de la Base de Datos (`backend-go`)

Este documento presenta la documentación técnica y el diccionario de datos de la base de datos del backend escrito en Go, mapeado mediante **GORM** hacia PostgreSQL.

La base de datos está organizada de manera modular en las siguientes categorías:
1. **Seguridad, Usuarios y Control de Acceso (RBAC)**
2. **Productos y Gestión de Cupos (Inventario)**
3. **Reservas, Pedidos y Pasajeros**
4. **Organizaciones y Personalización (Agencias y Marca Blanca)**
5. **Configuraciones de Sistema y Comunicaciones (SMTP / Email)**
6. **Auditoría, Notificaciones e Inteligencia Artificial (IA)**

---

## 1. Seguridad, Usuarios y Control de Acceso (RBAC)

### 1.1 Tabla `profiles` (Usuarios del Sistema)
Almacena los perfiles de usuario habilitados para ingresar a la plataforma y operar según sus roles asignados.

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `primaryKey` | Identificador único del usuario. |
| `email` | `string` | `unique; not null` | Correo electrónico y nombre de usuario para el login. |
| `encrypted_password` | `string` | | Hash bcrypt de la contraseña (el campo plano `password` solo se usa en requests y nunca se almacena). |
| `nombre` | `string` | | Nombre del usuario. |
| `apellido` | `string` | | Apellido del usuario. |
| `telefono` | `string` | | Número telefónico de contacto. |
| `agencia` | `string` | | Nombre o código de la agencia vinculada. |
| `admin` | `boolean` | `default:false` | Indica si tiene privilegios de superadministrador. |
| `activo` | `boolean` | `default:true` | Controla si la cuenta está activa (`IsActive`). |
| `role` | `string` | `default:'agency_user'` | Rol asignado al usuario. |
| `created_at` | `timestamp` | | Fecha de creación del registro. |
| `updated_at` | `timestamp` | | Fecha de última actualización. |

### 1.2 Tabla `roles` (Roles de RBAC)
Define las clasificaciones de usuarios en el sistema (ej. `admin`, `agency_admin`, `agency_user`).

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `primaryKey` | Identificador único del rol. |
| `name` | `string` | `not null` | Nombre legible del rol (ej. "Administrador"). |
| `code` | `string` | `unique; not null` | Código único del rol (ej. "admin"). |
| `description` | `string` | | Breve descripción de los privilegios del rol. |
| `is_system` | `boolean` | `default:false` | Si está activo, define si es un rol preestablecido inmutable del sistema. |
| `is_active` | `boolean` | `default:true` | Estado activo/inactivo del rol. |
| `created_at` | `timestamp` | | Fecha de creación. |
| `updated_at` | `timestamp` | | Fecha de última actualización. |

### 1.3 Tabla `permissions` (Permisos Granulares)
Acciones o capacidades atómicas específicas dentro de la plataforma (ej. `confirm_reservation`).

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `primaryKey` | Identificador del permiso. |
| `name` | `string` | `not null` | Nombre legible del permiso. |
| `code` | `string` | `unique; not null` | Código de validación (ej. `view:reservations`). |
| `module` | `string` | `not null` | Módulo de aplicación al que pertenece. |
| `description` | `string` | | Descripción detallada de qué habilita. |
| `is_active` | `boolean` | `default:true` | Estado activo/inactivo. |
| `created_at` | `timestamp` | | Fecha de creación. |
| `updated_at` | `timestamp` | | Fecha de última actualización. |

### 1.4 Tabla `user_roles` (Asignación de Roles a Usuarios)
Mapeo de relación Muchos a Muchos (M:N) entre `profiles` y `roles`.

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `primaryKey` | Identificador de la asignación. |
| `user_id` | `uuid` | `not null` | FK a `profiles.id`. |
| `role_id` | `uuid` | `not null` | FK a `roles.id`. |
| `granted_at` | `timestamp` | | Fecha de otorgamiento. |

### 1.5 Tabla `role_permissions` (Mapeo de Permisos a Roles)
Mapeo de relación Muchos a Muchos (M:N) entre `roles` y `permissions`.

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `primaryKey` | Identificador de la relación. |
| `role_id` | `uuid` | `not null` | FK a `roles.id`. |
| `permission_id`| `uuid` | `not null` | FK a `permissions.id`. |

---

## 2. Productos y Gestión de Cupos (Inventario)

### 2.1 Tabla `products` (Bloqueos y Cupos Aéreos)
Representa los contratos de bloqueo de asientos aéreos adquiridos por el operador para su venta o distribución.

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uint` | `primaryKey` | Identificador autoincremental de la base de datos. |
| `codigo_cupo` | `string` | `not null` | Código unívoco del bloqueo (ej: `MIA-2026-02`). |
| `destino` | `string` | `not null` | Ciudad o aeropuerto destino (ej: `Miami`). |
| `compania` | `string` | `not null` | Aerolínea transportista (ej: `American Airlines`). |
| `disponibilidad`| `int` | `not null` | Stock restante o asientos listos para ser reservados. |
| `cupo` | `int` | | Total de asientos contratados originalmente en el bloqueo. |
| `vendidos` | `int` | | Asientos ya vendidos e individuales confirmados. |
| `fecha_salida` | `timestamp` | | Fecha y hora de salida del vuelo de ida. |
| `fecha_regreso`| `timestamp` | | Fecha y hora del vuelo de retorno. |
| `precio` | `double` | | Tarifa o precio de venta de cara al pasajero/minorista. |
| `neto_1` | `double` | | Costo neto de compra confidencial del operador. |
| `op` | `double` | | Margen u OP asignado. |
| `ruta` | `string` | | Detalle en formato texto o JSON del itinerario con escalas. |
| `pnr` | `string` | | Localizador global de reserva en la aerolínea. |
| `ficha` | `string` | | Ficha descriptiva adicional. |
| `temporada` | `string` | | Clasificación temporal (ej: `Verano 2026`). |
| `tipo_producto`| `string` | | Categoría de cupo (ej: `CUPOS`, `CHARTERS`). |
| `bloqueo_temporal_minutos` | `int` | | Tiempo límite por defecto que dura el bloqueo temporal de una reserva. |
| `carryon` | `boolean` | `default:false` | Indica si el producto incluye equipaje de mano mediano. |
| `handbag` | `boolean` | `default:false` | Indica si el producto incluye cartera/bolso pequeño. |
| `checkedbag` | `boolean` | `default:false` | Indica si el producto incluye maleta pesada despachada en bodega. |
| `inf_fare` | `double` | | Tarifa aplicable a infantes (menores de 2 años). |
| `chd_fare` | `double` | | Tarifa aplicable a niños. |
| `is_blocked_for_sale` | `boolean` | `default:false` | Si es true, oculta el producto para evitar nuevas reservas. |
| `agencia` | `string` | | Código de la agencia dueña del cupo original. |
| `restricted_agency` | `string` | | Código de la agencia destinataria de una cesión. Restringe la visibilidad del producto exclusivamente a ella. |
| `source_agency`| `string` | | Código de la agencia inmediata que cedió el cupo-espejo. |
| `transfer_id` | `uuid` | | FK a `availability_transfers.id` si proviene de una cesión. |
| `created_at` | `timestamp` | | Fecha de creación. |
| `updated_at` | `timestamp` | | Fecha de última actualización. |

### 2.2 Tabla `availability_transfers` (Cesión de Cupos entre Agencias)
Registra las transacciones mediante las cuales una agencia "presta" o cede stock disponible a otra.

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `primaryKey` | Identificador de la cesión de cupo. |
| `product_id` | `int` | `not null` | FK a `products.id` (producto original de donde se resta disponibilidad). |
| `source_agency`| `string` | `not null` | Código de la agencia que cede el stock. |
| `target_agency`| `string` | `not null` | Código de la agencia que recibe el stock. |
| `quantity` | `int` | `not null` | Cantidad de cupos cedidos. |
| `created_by` | `uuid` | `not null` | FK a `profiles.id` (usuario creador). |
| `created_at` | `timestamp` | | Fecha de creación. |
| `updated_at` | `timestamp` | | Fecha de última actualización. |

---

## 3. Reservas, Pedidos y Pasajeros

### 3.1 Tabla `reservations` (Ordenes o Pedidos de Reservas)
Agrupa las órdenes de compra de cupos aéreos para un viaje específico. Puede albergar a uno o varios pasajeros individuales.

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uint` | `primaryKey` | Identificador único de la reserva. |
| `product_id` | `uint` | `not null` | FK a `products.id` (vuelo en el que se reserva). |
| `created_by` | `uuid` | `not null` | FK a `profiles.id` (usuario emisor de la reserva). |
| `estado` | `string` | `default:'bloqueo_temporal'` | Estado general: `bloqueo_temporal`, `confirmada`, `cancelada`, `expirada`. |
| `bloqueo_expira_at` | `timestamp` | | Fecha y hora límite para ingresar el documento contable antes de expirar. |
| `precio_venta` | `double` | | Precio total de venta del pedido. |
| `neto_1` | `double` | | Costo neto total del pedido. |
| `pedido_id` | `string` | `not null` | Código del pedido único estructurado (ej: `PED-2026-F62BA87C`). |
| `agencia` | `string` | | Código de la agencia que emitió la reserva. |
| `transfer_id` | `uuid` | | FK a `availability_transfers.id` si la reserva consumió un cupo cedido. |
| `original_agency` | `string` | | Nombre o código de la agencia original dueña del stock. |
| `contacto_nombre` | `string` | `not null` | Nombre del contacto principal de la reserva. |
| `contacto_email` | `string` | | Email para notificaciones y envíos automatizados del itinerario. |
| `contacto_telefono` | `string` | | Teléfono de contacto. |
| `vuelo_codigo` | `string` | | Copia denormalizada del código del cupo. |
| `vuelo_destino`| `string` | | Copia denormalizada del destino de vuelo. |
| `vuelo_compania`| `string` | | Copia denormalizada de la aerolínea. |
| `vuelo_salida` | `timestamp` | | Copia de la fecha de salida. |
| `vuelo_precio` | `double` | | Copia del precio base unitario del producto al momento de reservar. |
| `vuelo_ruta` | `string` | | Copia del itinerario de vuelos. |
| `nombre_pasajero` | `string` | | Nombre del pasajero principal (compatibilidad legacy). |
| `apellido_pasajero` | `string` | | Apellido del pasajero principal (compatibilidad legacy). |
| `documento_pasajero` | `string` | | Documento de identidad (compatibilidad legacy). |
| `nacimiento_pasajero` | `timestamp` | | Fecha de nacimiento (compatibilidad legacy). |
| `nacionalidad_pasajero` | `string` | | Nacionalidad (compatibilidad legacy). |
| `tipo_pasajero`| `string` | | Adulto, Niño o Infante. |
| `ficha_venta` | `string` | | Datos adicionales de la ficha de venta. |
| `doc_contable` | `string` | | Número de la ficha de venta o documento contable cargado. |
| `doc_contable_expires_at` | `timestamp` | | Fecha de vencimiento de la ficha/documento contable. |
| `expiration_warning_sent_at` | `timestamp` | | Registro para evitar duplicación de notificaciones de expiración. |
| `created_at` | `timestamp` | | Fecha de creación. |
| `updated_at` | `timestamp` | | Fecha de última actualización. |

### 3.2 Tabla `passengers` (Pasajeros Individuales y Tickets)
La unidad de control de cupo. Mapea individualmente a cada pasajero dentro de una orden, facilitando que sigan flujos de emisión y documentación separados.

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uint` | `primaryKey` | Identificador del pasajero. |
| `reservation_id`| `uint` | `not null` | FK a `reservations.id`. Relación M:1 (muchos pasajeros pertenecen a una reserva). |
| `pedido_id` | `string` | | Código del pedido copiado para búsquedas rápidas. |
| `nombre` | `string` | | Nombre del pasajero. |
| `apellido` | `string` | | Apellido del pasajero. |
| `documento` | `string` | | Cédula, DNI o pasaporte. |
| `nacimiento` | `timestamp` | | Fecha de nacimiento del pasajero. |
| `nacionalidad` | `string` | | País de origen del pasajero. |
| `tipo_pasajero`| `string` | | Clasificación: `Adulto`, `Niño`, `Infante`. |
| `nro` | `int` | | Indicador de venta: `1` (cuenta como venta válida de cupo), `0` (acompañante o infante exento). |
| `estado` | `string` | `default:'bloqueo_temporal'` | Estado individual del ticket del pasajero. |
| `numero_ticket`| `string` | | Número de boleto aéreo definitivo una vez emitido por GDS/aerolínea. |
| `precio_venta` | `double` | | Precio unitario final cobrado. |
| `neto_1` | `double` | | Costo unitario neto. |
| `doc_contable` | `string` | | Ficha de venta asociada individualmente. |
| `doc_contable_expires_at` | `timestamp` | | Fecha de vencimiento de su documento contable. |
| `bloqueo_expira_at` | `timestamp` | | Vencimiento del bloqueo temporal. |
| `expiration_warning_sent_at` | `timestamp` | | Timestamp de alerta enviada. |
| `created_at` | `timestamp` | | Fecha de creación. |
| `updated_at` | `timestamp` | | Fecha de última actualización. |

---

## 4. Organizaciones y Personalización (Agencias y Marca Blanca)

### 4.1 Tabla `agencies` (Agencias Registradas)
Representa las organizaciones habilitadas para actuar como operadores secundarios, minoristas o mayoristas.

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `primaryKey` | Identificador único de la agencia. |
| `code` | `string` | `unique; not null` | Código canónico de la agencia (ej: `AG-002`). |
| `name` | `string` | `not null` | Nombre comercial de la empresa. |
| `email` | `string` | | Email corporativo. |
| `phone` | `string` | | Teléfono comercial. |
| `website` | `string` | | Página web oficial. |
| `color` | `string` | `default:'#3b82f6'` | Color representativo de la marca. |
| `is_active` | `boolean` | `default:true` | Define si la agencia se encuentra activa en el sistema. |
| `created_at` | `timestamp` | | Fecha de creación. |
| `updated_at` | `timestamp` | | Fecha de última actualización. |

### 4.2 Tabla `white_label_configs` (Marca Blanca)
Almacena de forma centralizada los parámetros visuales y de identidad corporativa de las agencias.

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `primaryKey` | Identificador único de configuración. |
| `agency_id` | `string` | `not null; uniqueIndex` | Identificador de la agencia. Vincula de forma unívoca 1:1. |
| `config` | `jsonb` | `default:'{}'` | Objeto JSON estructurado que guarda las variables de marca (colores de UI, tipografías, logos, favicon, etc.). |
| `is_active` | `boolean` | `default:true` | Si está habilitada la personalización. |
| `created_at` | `timestamp` | | Fecha de creación. |
| `updated_at` | `timestamp` | | Fecha de última actualización. |

---

## 5. Configuraciones de Sistema y Comunicaciones (SMTP / Email)

### 5.1 Tabla `system_settings` (Ajustes de Sistema)
Guarda pares de valores dinámicos para control administrativo global de la aplicación.

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `key` | `string` | `primaryKey` | Clave identificadora del ajuste (ej: `max_days_lock`). |
| `value` | `jsonb` | `not null` | Estructura JSON con los parámetros configurados. |
| `created_at` | `timestamp` | | Fecha de creación. |
| `updated_at` | `timestamp` | | Fecha de última actualización. |

### 5.2 Tabla `email_smtp_configs` (Configuración de Servidores SMTP)
Permite que el sistema envíe emails transaccionales bajo un servidor propio o global.

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `primaryKey` | Identificador del servidor. |
| `agency_id` | `uuid` | `nullable` | ID de la agencia asociada. Si es null, representa el SMTP global del sistema. |
| `smtp_host` | `string` | | Nombre de host del servidor de correo. |
| `smtp_port` | `int` | | Puerto de red (ej: 587, 465). |
| `smtp_user` | `string` | | Nombre de usuario de autenticación. |
| `smtp_pass` | `string` | | Contraseña encriptada/segura del buzón. |
| `smtp_secure`| `boolean` | `default:false` | Indica si requiere cifrado SSL/TLS. |
| `email_from` | `string` | | Dirección de origen visible en los envíos (Remitente). |
| `is_active` | `boolean` | `default:true` | Controla si la configuración se encuentra activa. |
| `created_at` | `timestamp` | | Fecha de creación. |
| `updated_at` | `timestamp` | | Fecha de última actualización. |

### 5.3 Tabla `email_templates` (Plantillas de Email Transaccionales)
Estructura del cuerpo y asunto de los correos transaccionales del sistema.

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `primaryKey` | Identificador de la plantilla. |
| `code` | `string` | `not null; index` | Código de uso (ej: `reservation_confirmed`). |
| `name` | `string` | | Nombre comercial descriptivo. |
| `subject` | `string` | | Asunto del email compatible con tags dinámicos `{{tag}}`. |
| `body_html` | `string` | | Cuerpo estructurado en HTML con placeholders. |
| `agency_id` | `uuid` | `nullable` | ID de la agencia minorista. Si es null, representa la plantilla por defecto del sistema. |
| `created_at` | `timestamp` | | Fecha de creación. |
| `updated_at` | `timestamp` | | Fecha de última actualización. |

---

## 6. Auditoría, Notificaciones e Inteligencia Artificial (IA)

### 6.1 Tabla `system_logs` (Logs del Sitio)
Registro histórico detallado de transacciones HTTP, fallos, cron y tareas en segundo plano.

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `primaryKey` | ID único del log de auditoría. |
| `level` | `string` | `index; default:'info'`| Nivel de alerta: `info`, `warning`, `error`. |
| `source` | `string` | `index` | Origen del evento: `http`, `cron`, `email`, `ai`. |
| `method` | `string` | | Método HTTP de la petición (ej: `POST`). |
| `path` | `string` | | Ruta de la API consultada. |
| `status_code` | `int` | | Código de respuesta HTTP (ej: 200, 500). |
| `message` | `string` | | Mensaje resumido de la acción. |
| `details` | `string` | | Información técnica del error o payload. |
| `user_id` | `uuid` | | ID del usuario de la sesión (`profiles.id`). |
| `agencia` | `string` | | Agencia del usuario. |
| `duration_ms` | `int64` | | Tiempo de respuesta medido en milisegundos. |
| `created_at` | `timestamp` | `index` | Fecha y hora exacta del log. |

### 6.2 Tabla `notifications` (Notificaciones Internas)
Mensajería interna del sistema dirigida a usuarios o roles.

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `primaryKey` | Identificador de la notificación. |
| `type` | `string` | `not null; default:'info'` | Tipo: `info`, `success`, `warning`, `error`. |
| `title` | `string` | `not null` | Título del aviso. |
| `message` | `string` | `not null` | Cuerpo descriptivo del aviso. |
| `icon` | `string` | `default:'📢'` | Emoji o identificador de icono. |
| `color` | `string` | `default:'blue'` | Color representativo en pantalla. |
| `priority` | `string` | `default:'medium'` | Prioridad: `low`, `medium`, `high`. |
| `target_user_id` | `uuid` | | ID del usuario destinatario (si es privado). |
| `target_role` | `string` | | Rol destinatario (si es grupal). |
| `target_agency` | `string` | | Agencia destinataria. |
| `is_read` | `boolean` | `default:false` | Indica si el usuario ya vio la notificación. |
| `is_hidden` | `boolean` | `default:false` | Oculta la notificación del buzón general. |
| `created_by` | `uuid` | | Creador de la alerta. |
| `created_at` | `timestamp` | | Fecha de creación. |

### 6.3 Tabla `ai_providers` (Proveedores de IA)
Modelos y conectores de Inteligencia Artificial configurados (OpenAI, Claude o Gemini).

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `primaryKey` | Identificador del proveedor de IA. |
| `name` | `string` | `unique; not null` | Identificador unívoco del proveedor (ej. `openai-gpt4`). |
| `display_name` | `string` | | Nombre amigable visible en configuración. |
| `provider_type`| `string` | `default:'openai'` | Motor de API: `openai`, `anthropic`, `google`. |
| `api_key` | `string` | | Credencial secreta de autenticación con el API. |
| `api_endpoint` | `string` | | Host de destino de las llamadas. |
| `base_url` | `string` | | URL base alternativa. |
| `default_model`| `string` | | Nombre técnico del modelo (ej: `gpt-4o`, `claude-3-5-sonnet`). |
| `temperature` | `double` | `default:0.7` | Nivel de creatividad/aleatoriedad de la respuesta. |
| `max_tokens` | `int` | `default:4096` | Límite máximo de salida. |
| `is_active` | `boolean` | `default:true` | Si el proveedor está habilitado. |
| `is_default` | `boolean` | `default:false` | Si es el proveedor por defecto del chat. |
| `created_at` | `timestamp` | | Fecha de creación. |
| `updated_at` | `timestamp` | | Fecha de última actualización. |

### 6.4 Tabla `ai_actions` (Acciones y Tools para Agentes)
Mapeo de llamadas HTTP registradas que el modelo de IA puede invocar de forma automática mediante Function Calling.

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `primaryKey` | Identificador de la acción. |
| `name` | `string` | `unique; not null` | Nombre técnico expuesto a la IA (ej: `buscar_productos`). |
| `description` | `string` | | Explicación minuciosa que asiste a la IA a comprender cuándo invocarla. |
| `action_type` | `string` | `default:'api_call'` | Tipo de ejecución. |
| `endpoint` | `string` | | URL de la API a consultar. |
| `method` | `string` | `default:'GET'` | Verbo HTTP aplicable. |
| `parameters` | `json` | | Estructura JSON con las firmas de parámetros y tipos requeridos. |
| `is_active` | `boolean` | `default:true` | Estado activo/inactivo de la herramienta. |
| `created_at` | `timestamp` | | Fecha de creación. |
| `updated_at` | `timestamp` | | Fecha de última actualización. |

### 6.5 Tabla `ai_sessions` (Sesiones de Chat de la IA)
Agrupa y persiste las conversaciones individuales mantenidas por los usuarios con el asistente virtual.

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `primaryKey` | Identificador de la sesión de chat. |
| `user_id` | `uuid` | | ID del usuario propietario de la conversación (`profiles.id`). |
| `title` | `string` | | Título automático de la conversación. |
| `created_at` | `timestamp` | | Fecha de creación. |
| `updated_at` | `timestamp` | | Fecha de última actualización. |

### 6.6 Tabla `ai_messages` (Mensajes de Conversación de la IA)
Persiste los mensajes individuales (tanto del usuario como del asistente) dentro de una sesión de chat para mantener el contexto conversacional.

| Campo | Tipo GORM / PostgreSQL | Atributos | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `primaryKey` | Identificador único del mensaje. |
| `session_id` | `uuid` | | ID de la sesión a la que pertenece (`ai_sessions.id`). |
| `user_id` | `uuid` | | ID del usuario emisor/receptor. |
| `role` | `string` | | Rol conversacional: `user`, `assistant`. |
| `content` | `string` | | Texto plano con el mensaje transmitido. |
| `token_usage` | `json` | | Registro del consumo de tokens de entrada/salida de la API. |
| `created_at` | `timestamp` | | Fecha y hora exacta del envío del mensaje. |

---

*Fin del documento de Especificación de Estructura de la Base de Datos.*
