# Documentación Completa del Sistema de Gestión de Cupos Aéreos

Este documento resume todas las funcionalidades implementadas en el sistema de gestión de cupos aéreos.

---

## Índice

1. [Gestión de Reservas](#1-gestión-de-reservas)
2. [Gestión de Productos](#2-gestión-de-productos)
3. [Gestión de Agencias](#3-gestión-de-agencias)
4. [Gestión de Usuarios](#4-gestión-de-usuarios)
5. [Gestión de Roles y Permisos](#5-gestión-de-roles-y-permisos)
6. [Sistema de White Label](#6-sistema-de-white-label)
7. [Configuración de Email](#7-configuración-de-email)
8. [Sistema de Reportes Avanzados](#8-sistema-de-reportes-avanzados)
9. [Sistema de Notificaciones](#9-sistema-de-notificaciones)
10. [Sistema de Transferencias](#10-sistema-de-transferencias)
11. [Disponibilidad y Cupos](#11-disponibilidad-y-cupos)
12. [Panel de Control](#12-panel-de-control)
13. [Logs del Sitio](#13-logs-del-sitio)
14. [Chat IA](#14-chat-ia)
15. [Perfil de Usuario](#15-perfil-de-usuario)
16. [Exportación Masiva de Datos](#16-exportación-masiva-de-datos)
17. [Auditoría y Logs](#17-auditoría-y-logs)
18. [Backup y Restauración](#18-backup-y-restauración)
19. [Modo Oscuro/Claro](#19-modo-oscuroclaro)
20. [Internacionalización (i18n)](#20-internacionalización-i18n)
21. [Búsqueda Global y Filtros](#21-búsqueda-global-y-filtros)
22. [Atajos de Teclado](#22-atajos-de-teclado)
23. [Onboarding Guiado](#23-onboarding-guiado)
24. [Requisitos del Sistema](#24-requisitos-del-sistema)
25. [Consideraciones de Seguridad](#25-consideraciones-de-seguridad)

---

## 1. Gestión de Reservas

Sistema completo para la gestión de reservas de vuelos.

### Funcionalidades

- **Crear Reserva**: Formulario completo con datos de pasajeros, productos y fechas
- **Editar Reserva**: Modificación de reservas existentes con validaciones
- **Confirmar Reserva**: Proceso de confirmación con validación de disponibilidad
- **Eliminar Pasajero**: Eliminación individual de pasajeros de una reserva
- **Solicitar Cancelación**: Flujo de cancelación con documento contable
- **Reenviar Email**: Reenvío de confirmación por email
- **Actualizar Ticket**: Modificación de datos de ticket por pasajero
- **Agregar Documento Contable**: Adjuntar ficha de venta y documentos

### Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/reservations` | Crear nueva reserva |
| GET | `/api/reservations` | Listar todas las reservas |
| GET | `/api/reservations/:id` | Obtener reserva por ID |
| PUT | `/api/reservations/:id` | Actualizar reserva |
| DELETE | `/api/reservations/:id` | Eliminar reserva |
| POST | `/api/reservations/:id/confirm` | Confirmar reserva |
| DELETE | `/api/reservations/:id/passengers/:passengerId` | Eliminar pasajero |
| POST | `/api/reservations/:id/resend-email` | Reenviar email |
| POST | `/api/reservations/:id/request-cancellation` | Solicitar cancelación |
| PUT | `/api/reservations/:id/passengers/:passengerId/ticket` | Actualizar ticket |
| POST | `/api/reservations/:id/doc-contable` | Agregar documento contable |

### Componentes Frontend

- [`GestionReservas.jsx`](frontend/src/pages/GestionReservas.jsx) - Página principal
- [`Modal.jsx`](frontend/src/components/Modal.jsx) - Modal reutilizable
- [`reservationService.js`](frontend/src/services/reservationService.js) - Servicio de API

---

## 2. Gestión de Productos

Administración completa de productos turísticos (vuelos, paquetes, etc.).

### Funcionalidades

- **Crear Producto**: Formulario con datos de destino, fechas, precios y cupos
- **Editar Producto**: Modificación de productos existentes
- **Eliminar Producto**: Eliminación con confirmación
- **Carga Masiva**: Importación de productos desde archivo Excel/CSV
- **Transferencia de Cupos**: Transferir cupos entre agencias

### Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/products` | Listar productos con filtros |
| GET | `/api/products/:id` | Obtener producto por ID |
| POST | `/api/products` | Crear producto |
| PUT | `/api/products/:id` | Actualizar producto |
| DELETE | `/api/products/:id` | Eliminar producto |
| POST | `/api/products/bulk` | Carga masiva de productos |

### Componentes Frontend

- [`GestionProductos.jsx`](frontend/src/pages/GestionProductos.jsx) - Página principal
- [`ProductForm.jsx`](frontend/src/components/ProductForm.jsx) - Formulario de producto
- [`ProductBulkUpload.jsx`](frontend/src/components/ProductBulkUpload.jsx) - Carga masiva
- [`TransferModal.jsx`](frontend/src/components/TransferModal.jsx) - Modal de transferencia
- [`productService.js`](frontend/src/services/productService.js) - Servicio de API
- [`transferService.js`](frontend/src/services/transferService.js) - Servicio de transferencias

---

## 3. Gestión de Agencias

Administración de agencias de turismo asociadas.

### Funcionalidades

- **Crear Agencia**: Registro de nuevas agencias con datos completos
- **Editar Agencia**: Modificación de datos de agencia
- **Eliminar Agencia**: Eliminación con validación de dependencias
- **Listar Agencias**: Vista con filtros y búsqueda

### Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/agencies` | Listar agencias |
| GET | `/api/agencies/:id` | Obtener agencia por ID |
| POST | `/api/agencies` | Crear agencia |
| PUT | `/api/agencies/:id` | Actualizar agencia |
| DELETE | `/api/agencies/:id` | Eliminar agencia |

### Componentes Frontend

- [`GestionAgencias.jsx`](frontend/src/pages/GestionAgencias.jsx) - Página principal
- [`agencyService.js`](frontend/src/services/agencyService.js) - Servicio de API

---

## 4. Gestión de Usuarios

Administración completa de usuarios del sistema.

### Funcionalidades

- **Crear Usuario**: Registro de nuevos usuarios con rol y permisos
- **Editar Usuario**: Modificación de datos y permisos
- **Eliminar Usuario**: Eliminación con confirmación
- **Toggle Estado**: Activar/desactivar usuario
- **Asignar Permisos**: Configuración granular de permisos

### Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/users` | Listar usuarios |
| GET | `/api/users/:id` | Obtener usuario por ID |
| POST | `/api/users` | Crear usuario |
| PUT | `/api/users/:id` | Actualizar usuario |
| DELETE | `/api/users/:id` | Eliminar usuario |
| PATCH | `/api/users/:id/toggle-status` | Toggle estado activo/inactivo |

### Componentes Frontend

- [`GestionUsuarios.jsx`](frontend/src/pages/GestionUsuarios.jsx) - Página principal
- [`UserForm.jsx`](frontend/src/components/UserForm.jsx) - Formulario de usuario
- [`userService.js`](frontend/src/services/userService.js) - Servicio de API

---

## 5. Gestión de Roles y Permisos

Sistema de control de acceso basado en roles (RBAC).

### Funcionalidades

- **Crear Rol**: Definición de nuevos roles con permisos
- **Editar Rol**: Modificación de roles y permisos asociados
- **Eliminar Rol**: Eliminación con validación
- **Asignar Permisos**: Configuración granular de permisos por rol

### Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/roles` | Listar roles |
| GET | `/api/roles/:id` | Obtener rol por ID |
| POST | `/api/roles` | Crear rol |
| PUT | `/api/roles/:id` | Actualizar rol |
| DELETE | `/api/roles/:id` | Eliminar rol |
| GET | `/api/permissions` | Listar permisos |
| POST | `/api/permissions` | Crear permiso |
| PUT | `/api/permissions/:id` | Actualizar permiso |
| DELETE | `/api/permissions/:id` | Eliminar permiso |

### Componentes Frontend

- [`GestionRoles.jsx`](frontend/src/pages/GestionRoles.jsx) - Gestión de roles
- [`GestionPermisos.jsx`](frontend/src/pages/GestionPermisos.jsx) - Gestión de permisos
- [`PermissionSelector.jsx`](frontend/src/components/PermissionSelector.jsx) - Selector de permisos
- [`roleService.js`](frontend/src/services/roleService.js) - Servicio de roles
- [`permissionService.js`](frontend/src/services/permissionService.js) - Servicio de permisos

---

## 6. Sistema de White Label

Sistema completo de personalización de marca para agencias.

### Funcionalidades

- **Configuración de Identidad**: Logo, nombre de agencia, favicon
- **Configuración de Colores**: Paleta de colores personalizable (primary, secondary, accent)
- **Configuración de Fuentes**: Selección de tipografías
- **Configuración de Botones**: Estilos, bordes, sombras
- **Configuración de Sidebar**: Colores y estilos del menú lateral
- **Configuración de Layout**: Anchos, espaciados, bordes
- **Vista Previa**: Preview en tiempo real de los cambios
- **Presets**: Plantillas predefinidas de configuración
- **Exportar/Importar**: Guardar y cargar configuraciones

### Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/white-label` | Obtener configuración |
| POST | `/api/white-label` | Crear configuración |
| PUT | `/api/white-label/:id` | Actualizar configuración |
| DELETE | `/api/white-label/:id` | Eliminar configuración |
| GET | `/api/white-label/presets` | Obtener presets |
| GET | `/api/white-label/fonts` | Obtener fuentes disponibles |
| GET | `/api/white-label/buttons` | Obtener estilos de botones |
| POST | `/api/white-label/export` | Exportar configuración |
| POST | `/api/white-label/import` | Importar configuración |

### Componentes Frontend

- [`WhiteLabelConfig.jsx`](frontend/src/pages/WhiteLabelConfig.jsx) - Página de configuración
- [`WhiteLabelContext.jsx`](frontend/src/contexts/WhiteLabelContext.jsx) - Contexto de white label
- [`WhiteLabelPreviewModal.jsx`](frontend/src/components/WhiteLabelPreviewModal.jsx) - Modal de preview
- [`whiteLabelService.js`](frontend/src/services/whiteLabelService.js) - Servicio de API

---

## 7. Configuración de Email

Sistema de configuración de email SMTP y plantillas.

### Funcionalidades

- **Configuración SMTP**: Host, puerto, usuario, contraseña, encriptación
- **Prueba de Conexión**: Verificar configuración SMTP
- **Email de Prueba**: Envío de email de prueba
- **Plantillas de Email**: Personalización de templates HTML
- **Preview de Plantillas**: Vista previa de emails

### Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/email-config` | Obtener configuración |
| POST | `/api/email-config` | Crear configuración |
| PUT | `/api/email-config/:id` | Actualizar configuración |
| POST | `/api/email-config/test-connection` | Probar conexión SMTP |
| POST | `/api/email-config/send-test` | Enviar email de prueba |
| PUT | `/api/email-config/template` | Actualizar plantilla |
| POST | `/api/email-config/preview-template` | Preview de plantilla |

### Componentes Frontend

- [`EmailConfig.jsx`](frontend/src/pages/EmailConfig.jsx) - Página de configuración
- [`emailConfigService.js`](frontend/src/services/emailConfigService.js) - Servicio de configuración
- [`emailTemplateService.js`](frontend/src/services/emailTemplateService.js) - Servicio de plantillas

---

## 8. Sistema de Reportes Avanzados

Dashboard ejecutivo con métricas y análisis de datos.

### Funcionalidades

- **KPIs Principales**: Ventas totales, reservas, pasajeros, ingresos
- **Ventas por Agencia**: Distribución de ventas entre agencias
- **Evolución de Pasajeros**: Tendencia histórica de pasajeros
- **Destinos Detallados**: Análisis por destino con métricas
- **Evolución de Ingresos**: Tendencia de ingresos en el tiempo
- **Ocupación**: Heatmap de ocupación por producto/fecha
- **Top Productos**: Ranking de productos más vendidos
- **Alertas de Riesgo**: Productos con bajo rendimiento
- **Cancelaciones**: Análisis de cancelaciones

### Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/reports/stats` | Estadísticas generales |
| GET | `/api/reports/evolution-passengers` | Evolución de pasajeros |
| GET | `/api/reports/agency-share` | Participación por agencia |
| GET | `/api/reports/user-metrics` | Métricas de usuario |
| GET | `/api/reports/destinations-detail` | Detalle por destino |
| GET | `/api/reports/evolution-revenue` | Evolución de ingresos |
| GET | `/api/reports/occupancy` | Ocupación |
| GET | `/api/reports/top-products` | Top productos |
| GET | `/api/reports/risk-alerts` | Alertas de riesgo |
| GET | `/api/reports/cancellations` | Cancelaciones |

### Componentes Frontend

- [`Reportes.jsx`](frontend/src/pages/Reportes.jsx) - Página principal de reportes
- [`ReportFilters.jsx`](frontend/src/components/reports/ReportFilters.jsx) - Filtros de reportes
- [`EvolutionChart.jsx`](frontend/src/components/reports/EvolutionChart.jsx) - Gráfico de evolución
- [`AgencyShareChart.jsx`](frontend/src/components/reports/AgencyShareChart.jsx) - Gráfico de agencias
- [`DestinationDetailTable.jsx`](frontend/src/components/reports/DestinationDetailTable.jsx) - Tabla de destinos
- [`OccupancyHeatmap.jsx`](frontend/src/components/reports/OccupancyHeatmap.jsx) - Heatmap de ocupación
- [`TopDestinationsChart.jsx`](frontend/src/components/reports/TopDestinationsChart.jsx) - Top destinos
- [`ProductPerformanceTable.jsx`](frontend/src/components/reports/ProductPerformanceTable.jsx) - Rendimiento productos
- [`RiskAlertsTable.jsx`](frontend/src/components/reports/RiskAlertsTable.jsx) - Tabla de alertas
- [`KPIsRow.jsx`](frontend/src/components/reports/KPIsRow.jsx) - Fila de KPIs
- [`reportService.js`](frontend/src/services/reportService.js) - Servicio de reportes
- [`useReports.js`](frontend/src/hooks/useReports.js) - Hooks de reportes

---

## 9. Sistema de Notificaciones

Sistema de notificaciones en tiempo real.

### Funcionalidades

- **Notificaciones SSE**: Notificaciones en tiempo real vía Server-Sent Events
- **Marcar como Leída**: Gestión de estado de notificaciones
- **Eliminar Notificaciones**: Limpieza de notificaciones antiguas
- **Contador de No Leídas**: Badge con cantidad de notificaciones pendientes

### Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/notifications` | Listar notificaciones |
| POST | `/api/notifications` | Crear notificación |
| PUT | `/api/notifications/:id/read` | Marcar como leída |
| DELETE | `/api/notifications/:id` | Eliminar notificación |
| GET | `/api/notifications/unread-count` | Contador de no leídas |

### Componentes Frontend

- [`Notificaciones.jsx`](frontend/src/pages/Notificaciones.jsx) - Página de notificaciones
- [`notificationService.js`](frontend/src/services/notificationService.js) - Servicio de notificaciones

---

## 10. Sistema de Transferencias

Gestión de transferencias de cupos entre agencias.

### Funcionalidades

- **Crear Transferencia**: Solicitud de transferencia de cupos
- **Listar Transferencias**: Vista de transferencias propias y recibidas
- **Aceptar/Rechazar**: Flujo de aprobación de transferencias

### Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/transfers` | Crear transferencia |
| GET | `/api/transfers` | Listar transferencias |
| GET | `/api/transfers/user` | Transferencias del usuario |

### Componentes Frontend

- [`TransferModal.jsx`](frontend/src/components/TransferModal.jsx) - Modal de transferencia
- [`transferService.js`](frontend/src/services/transferService.js) - Servicio de transferencias

---

## 11. Disponibilidad y Cupos

Gestión de disponibilidad de productos y cupos.

### Funcionalidades

- **Consultar Disponibilidad**: Búsqueda de disponibilidad por producto y fecha
- **Reservar desde Disponibilidad**: Creación directa de reserva desde vista de disponibilidad
- **Cálculo de Tipos de Pasajero**: Cálculo automático según edad y fecha de salida

### Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/availability` | Consultar disponibilidad |

### Componentes Frontend

- [`Availability.jsx`](frontend/src/pages/Availability.jsx) - Página de disponibilidad

---

## 12. Panel de Control

Panel de administración con configuración del sistema.

### Funcionalidades

- **Configuración General**: Parámetros globales del sistema
- **Gestión de Temas**: Administración de temas visuales
- **Logs del Sistema**: Visualización de logs

### Componentes Frontend

- [`PanelControl.jsx`](frontend/src/pages/PanelControl.jsx) - Panel de control
- [`Settings.jsx`](frontend/src/pages/Settings.jsx) - Configuración
- [`GestionTemas.jsx`](frontend/src/pages/GestionTemas.jsx) - Gestión de temas

---

## 13. Logs del Sitio

Visualización y gestión de logs del sistema.

### Funcionalidades

- **Listar Logs**: Vista de logs con filtros
- **Filtros Avanzados**: Por fecha, usuario, tipo de acción
- **Exportar Logs**: Descarga de logs en diferentes formatos

### Componentes Frontend

- [`LogsDelSitio.jsx`](frontend/src/pages/LogsDelSitio.jsx) - Página de logs
- [`logService.js`](frontend/src/services/logService.js) - Servicio de logs

---

## 14. Chat IA

Asistente de inteligencia artificial integrado.

### Funcionalidades

- **Chat Flotante**: Widget de chat flotante en todas las páginas
- **Consultas Naturales**: Preguntas en lenguaje natural
- **Acciones Automatizadas**: Ejecución de acciones desde el chat
- **Historial de Conversaciones**: Registro de chats anteriores

### Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/ai/chat` | Enviar mensaje al chat IA |
| GET | `/api/ai/history` | Obtener historial |

### Componentes Frontend

- [`AIChatWidget.jsx`](frontend/src/components/AIChat/AIChatWidget.jsx) - Widget principal
- [`AIChatWindow.jsx`](frontend/src/components/AIChat/AIChatWindow.jsx) - Ventana de chat
- [`AIChatMessage.jsx`](frontend/src/components/AIChat/AIChatMessage.jsx) - Mensaje individual
- [`AIChatInput.jsx`](frontend/src/components/AIChat/AIChatInput.jsx) - Input de mensaje
- [`AIConfig.jsx`](frontend/src/pages/AIConfig.jsx) - Configuración de IA
- [`aiService.js`](frontend/src/services/aiService.js) - Servicio de IA

---

## 15. Perfil de Usuario

Gestión del perfil de usuario autenticado.

### Funcionalidades

- **Ver Perfil**: Visualización de datos del usuario
- **Editar Perfil**: Modificación de datos personales
- **Cambiar Contraseña**: Actualización de contraseña
- **Preferencias**: Configuración de preferencias personales

### Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/auth/profile` | Obtener perfil |
| PUT | `/api/auth/profile` | Actualizar perfil |

### Componentes Frontend

- [`Profile.jsx`](frontend/src/pages/Profile.jsx) - Página de perfil
- [`AuthContext.jsx`](frontend/src/contexts/AuthContext.jsx) - Contexto de autenticación
- [`authService.js`](frontend/src/services/authService.js) - Servicio de autenticación

---

## 16. Exportación Masiva de Datos

Sistema completo para exportar datos en múltiples formatos.

### Funcionalidades

- **Formatos Soportados**: CSV, Excel y PDF
- **Filtrado Previo**: Exportación de datos filtrados
- **Entidades Soportadas**: Reservas, productos, agencias, usuarios, logs

### Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/export/csv/:entityType` | Exportar a CSV |
| GET | `/api/export/excel/:entityType` | Exportar a Excel |
| GET | `/api/export/pdf/:entityType` | Exportar a PDF |

### Componentes Frontend

- [`ExportButton.jsx`](frontend/src/components/ExportButton.jsx) - Botón de exportación
- [`exportService.js`](frontend/src/services/exportService.js) - Servicio de exportación

---

## 17. Auditoría y Logs

Sistema de auditoría completa de acciones de usuarios.

### Funcionalidades

- **Registro Automático**: Todas las acciones de usuarios se registran
- **Filtros Avanzados**: Por fecha, usuario, tipo de acción
- **Paginación**: Navegación por registros
- **Limpieza**: Eliminación de logs antiguos

### Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/audit` | Obtener logs de auditoría |
| DELETE | `/api/audit/cleanup` | Limpiar logs antiguos |

### Componentes Frontend

- [`LogsDelSitio.jsx`](frontend/src/pages/LogsDelSitio.jsx) - Visualización de logs

---

## 18. Backup y Restauración

Sistema para respaldar y restaurar configuraciones del sistema.

### Funcionalidades

- **Crear Backup**: Generación de backup completo
- **Listar Backups**: Vista de backups disponibles
- **Restaurar**: Restauración desde backup
- **Descargar**: Descarga de archivos de backup
- **Eliminar**: Eliminación de backups antiguos

### Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/backup` | Crear backup |
| GET | `/api/backup` | Listar backups |
| POST | `/api/backup/restore` | Restaurar desde backup |
| DELETE | `/api/backup/:filename` | Eliminar backup |
| GET | `/api/backup/download/:filename` | Descargar backup |

---

## 19. Modo Oscuro/Claro

Sistema de temas con cambio dinámico.

### Funcionalidades

- **Toggle Global**: Cambio entre modo claro y oscuro
- **Persistencia**: Preferencia guardada en localStorage
- **Detección Automática**: Detección de preferencia del sistema
- **Transiciones Suaves**: Animaciones entre modos

### Componentes Frontend

- [`ThemeContext.jsx`](frontend/src/contexts/ThemeContext.jsx) - Contexto de tema
- [`ThemeToggle.jsx`](frontend/src/components/ThemeToggle.jsx) - Componente de toggle

---

## 20. Internacionalización (i18n)

Sistema completo de internacionalización.

### Funcionalidades

- **Soporte Multilenguaje**: Español e inglés
- **Persistencia**: Preferencia guardada en localStorage
- **Detección Automática**: Detección de idioma del navegador
- **Más de 100 Términos**: Traducciones completas

### Componentes Frontend

- [`I18nContext.jsx`](frontend/src/contexts/I18nContext.jsx) - Contexto de i18n
- [`LanguageSelector.jsx`](frontend/src/components/LanguageSelector.jsx) - Selector de idioma
- [`i18n.js`](frontend/src/i18n/i18n.js) - Configuración de traducciones

---

## 21. Búsqueda Global y Filtros

Herramientas de búsqueda y filtrado avanzadas.

### Funcionalidades

- **Búsqueda Global**: Búsqueda en toda la aplicación
- **Atajo de Teclado**: Ctrl+K para abrir búsqueda
- **Filtros Avanzados**: Múltiples tipos de filtros
- **Visualización de Filtros**: Filtros activos visibles

### Componentes Frontend

- [`GlobalSearch.jsx`](frontend/src/components/GlobalSearch.jsx) - Búsqueda global
- [`AdvancedFilters.jsx`](frontend/src/components/AdvancedFilters.jsx) - Filtros avanzados

---

## 22. Atajos de Teclado

Sistema de atajos de teclado para mejorar la productividad.

### Funcionalidades

- **Atajos Comunes**: Ctrl+K (buscar), Ctrl+N (crear), Ctrl+S (guardar)
- **Ventana de Ayuda**: Lista de atajos disponibles
- **Combinaciones Complejas**: Soporte para atajos personalizados

### Componentes Frontend

- [`useKeyboardShortcut.js`](frontend/src/hooks/useKeyboardShortcut.js) - Hook personalizado
- [`KeyboardShortcuts.jsx`](frontend/src/components/KeyboardShortcuts.jsx) - Componente de ayuda

---

## 23. Onboarding Guiado

Guía interactiva para nuevos usuarios.

### Funcionalidades

- **Tutorial Paso a Paso**: 6 pasos explicativos
- **Indicador de Progreso**: Barra de progreso visual
- **Control de Flujo**: Navegación anterior/siguiente
- **Opción de Cancelar**: Salir del onboarding en cualquier momento

### Componentes Frontend

- [`OnboardingGuide.jsx`](frontend/src/components/OnboardingGuide.jsx) - Guía de onboarding

---

## 24. Requisitos del Sistema

### Backend

- **Go** 1.21 o superior
- **PostgreSQL** 14 o superior
- **Variables de Entorno**: Configurar `.env` según `.env.example`

### Frontend

- **Node.js** v18 o superior
- **npm** v9 o superior
- **Dependencias**: React 18, React Router, TanStack Query, TailwindCSS

### Dependencias Adicionales

- `xlsx` - Generación de archivos Excel
- `pdfkit` - Generación de archivos PDF

---

## 25. Consideraciones de Seguridad

### Autenticación

- **JWT Tokens**: Autenticación basada en tokens JWT
- **Refresh Tokens**: Renovación automática de tokens
- **Expiración**: Tokens con tiempo de expiración configurable

### Autorización

- **RBAC**: Control de acceso basado en roles
- **Permisos Granulares**: Permisos a nivel de acción
- **Validación de Permisos**: Verificación en cada endpoint sensible

### Protección de Datos

- **Validación de Entradas**: Sanitización de todos los inputs
- **Protección SQL Injection**: Uso de queries parametrizados
- **CORS Configurado**: Restricción de orígenes permitidos
- **HTTPS**: Recomendado para producción

### Auditoría

- **Logs de Acciones**: Registro de todas las acciones críticas
- **Trazabilidad**: Seguimiento de cambios en datos sensibles
- **Retención Configurable**: Política de retención de logs

---

## Arquitectura del Sistema

### Backend (Go)

```
backend-go/
├── api/              # Rutas y handlers
├── cmd/api/          # Punto de entrada
├── pkg/
│   ├── database/     # Conexión y modelos DB
│   ├── handlers/     # Handlers de HTTP
│   ├── middleware/   # Middleware (auth, audit)
│   └── models/       # Modelos de datos
└── migrations/       # Migraciones SQL
```

### Frontend (React)

```
frontend/src/
├── components/       # Componentes reutilizables
├── contexts/         # Contextos de React
├── hooks/            # Hooks personalizados
├── pages/            # Páginas de la aplicación
├── services/         # Servicios de API
├── i18n/             # Internacionalización
└── styles/           # Estilos globales
```

---

## Documentación Adicional

- [API Reference](documentacion/api.html) - Referencia completa de la API
- [Guía de Instalación](documentacion/instalacion.html) - Instrucciones de instalación
- [Roles y Permisos](documentacion/roles.html) - Descripción de roles del sistema
- [Seguridad](documentacion/seguridad.html) - Detalles de implementación de seguridad

---

*Última actualización: Julio 2026*
*{agency_name} - Todos los derechos reservados*
