# Checklist de Implementación: Marca Blanca + Chat IA

## Estado General: 🚧 En Progreso

**Última actualización:** 2026-07-05

---

## Fase 1: Sistema de Marca Blanca Profesional

### Sprint 1: Base de Datos y Backend (3-4 días)

#### Migraciones de Base de Datos
- [x] Diseñar esquema de tablas
- [ ] `20250101_create_white_label_tables.sql` - Crear `white_label_configs`
- [ ] `20250103_seed_theme_presets.sql` - Insertar temas predefinidos
- [ ] `20250104_seed_font_presets.sql` - Insertar presets de fuentes
- [ ] `20250105_seed_button_presets.sql` - Insertar presets de botones

#### Backend - Controllers y Endpoints
- [ ] `whiteLabelController.js` - Controller principal
  - [ ] `GET /api/white-label` - Listar configs
  - [ ] `GET /api/white-label/:agencyId` - Obtener config de agencia
  - [ ] `POST /api/white-label` - Crear config nueva
  - [ ] `PUT /api/white-label/:id` - Actualizar config
  - [ ] `DELETE /api/white-label/:id` - Eliminar config
  - [ ] `GET /api/white-label/presets` - Obtener presets
  - [ ] `GET /api/white-label/fonts` - Obtener fuentes
  - [ ] `POST /api/white-label/preview` - Generar preview
  - [ ] `POST /api/white-label/export/:id` - Exportar config
  - [ ] `POST /api/white-label/import` - Importar config
- [ ] Registrar rutas en `index.js`

#### Frontend - Servicios
- [ ] `whiteLabelService.js` - Cliente API para white-label
  - [ ] `getConfig(agencyId)`
  - [ ] `createConfig(data)`
  - [ ] `updateConfig(id, data)`
  - [ ] `deleteConfig(id)`
  - [ ] `getPresets()`
  - [ ] `getFonts()`
  - [ ] `exportConfig(id)`
  - [ ] `importConfig(data)`

### Sprint 2: Sistema de Temas (2-3 días)

#### Frontend - Componentes de Configuración
- [ ] `pages/WhiteLabelConfig.jsx` - Página principal con tabs
  - [ ] Tab: Identidad Visual (logo, favicon, nombre, tagline, legal)
  - [ ] Tab: Paleta de Colores (16+ colores con color picker)
  - [ ] Tab: Tipografías (selector de presets + fuentes personalizadas)
  - [ ] Tab: Botones (estilos, radios, sombras, efectos hover)
  - [ ] Tab: Sidebar (colores, ancho, estilo)
  - [ ] Tab: Layout (bordes, sombras, espaciado)
  - [ ] Tab: Emails (header, footer, soporte)
  - [ ] Tab: Preview (vista previa en tiempo real)
  - [ ] Tab: Import/Export (JSON para backup)
- [ ] `components/ThemePreview.jsx` - Preview en tiempo real
- [ ] `components/ColorPicker.jsx` - Selector de colores avanzado
- [ ] `components/FontSelector.jsx` - Selector de fuentes con preview
- [ ] `components/ButtonStyler.jsx` - Configurador de botones
- [ ] `components/ThemeImporter.jsx` - Import/Export de configs

#### Sistema de CSS Variables Dinámicas
- [ ] `hooks/useWhiteLabel.js` - Hook para aplicar CSS variables
- [ ] `providers/ThemeProvider.jsx` - Provider React para temas
- [ ] Integrar CSS variables en `index.css`
- [ ] Extender `tailwind.config.js` con variables CSS
- [ ] Actualizar `Layout.jsx` para usar ThemeProvider
- [ ] Actualizar `Sidebar.jsx` para usar colores dinámicos
- [ ] Registrar ruta en `App.jsx`

---

## Fase 2: Chat IA Integrado

### Sprint 3: Base de Chat IA (3-4 días)

#### Migraciones de Base de Datos
- [ ] `20250102_create_ai_tables.sql` - Crear tablas de IA
  - [ ] `ai_providers` - Proveedores de IA
  - [ ] `ai_chat_sessions` - Sesiones de chat
  - [ ] `ai_chat_messages` - Mensajes
  - [ ] `ai_actions` - Acciones disponibles
- [ ] `20250106_seed_ai_providers.sql` - Insertar proveedores predefinidos
- [ ] `20250107_seed_ai_actions.sql` - Insertar acciones predefinidas

#### Backend - Controllers y Endpoints
- [ ] `aiController.js` - Controller principal
  - [ ] `GET /api/ai/providers` - Listar proveedores
  - [ ] `POST /api/ai/providers` - Configurar proveedor (admin)
  - [ ] `PUT /api/ai/providers/:id` - Actualizar proveedor (admin)
  - [ ] `GET /api/ai/actions` - Listar acciones disponibles
  - [ ] `POST /api/ai/chat` - Enviar mensaje al chat
  - [ ] `POST /api/ai/chat/stream` - Streaming de respuesta
  - [ ] `POST /api/ai/execute` - Ejecutar acción (via tool)
  - [ ] `GET /api/ai/sessions` - Listar sesiones del usuario
  - [ ] `DELETE /api/ai/sessions/:id` - Eliminar sesión
  - [ ] `POST /api/ai/analyze` - Analizar datos (reportes)
- [ ] Registrar rutas en `index.js`

#### Backend - Servicios y Tools
- [ ] `services/aiService.js` - Servicio central de IA
  - [ ] Conectar con OpenAI
  - [ ] Conectar con Anthropic
  - [ ] Conectar con Google AI
  - [ ] Manejar rate limiting
  - [ ] Manejar tokens
- [ ] `tools/reservationTools.js` - Tools para reservas
  - [ ] `list_reservations`
  - [ ] `create_reservation`
  - [ ] `confirm_reservation`
  - [ ] `cancel_reservation`
  - [ ] `get_availability`
- [ ] `tools/userTools.js` - Tools para usuarios
  - [ ] `list_users`
  - [ ] `create_user`
  - [ ] `update_user`
- [ ] `tools/productTools.js` - Tools para productos
  - [ ] `list_products`
  - [ ] `create_product`
  - [ ] `update_product`
- [ ] `tools/agencyTools.js` - Tools para agencias
  - [ ] `list_agencies`
  - [ ] `create_agency`
- [ ] `tools/reportTools.js` - Tools para reportes
  - [ ] `generate_report`

#### Frontend - Servicios
- [ ] `aiService.js` - Cliente API para IA
  - [ ] `sendMessage(messages, options)`
  - [ ] `streamMessage(messages, onChunk, onDone)`
  - [ ] `executeAction(actionName, params)`
  - [ ] `getProviders()`
  - [ ] `getActions()`
  - [ ] `getSessions()`
  - [ ] `getSessionMessages(sessionId)`
  - [ ] `deleteSession(sessionId)`

### Sprint 4: UI de Chat IA (3-4 días)

#### Frontend - Componentes de Chat
- [ ] `components/AIChat/AIChatWidget.jsx` - Widget flotante
  - [ ] Botón flotante (esquina inferior izquierda)
  - [ ] Estados: minimizado, expandido, procesando
  - [ ] Indicador de mensajes nuevos
  - [ ] Animaciones de entrada/salida
- [ ] `components/AIChat/AIChatWindow.jsx` - Ventana de chat
  - [ ] Header con título y controles
  - [ ] Lista de mensajes (scroll)
  - [ ] Input en la parte inferior
  - [ ] Botones de acción rápida
- [ ] `components/AIChat/AIChatInput.jsx` - Input de texto
  - [ ] Textarea con auto-resize
  - [ ] Botón de enviar
  - [ ] Adjuntar archivos (opcional)
  - [ ] Sugerencias de comandos
- [ ] `components/AIChat/AIChatMessage.jsx` - Renderizado de mensajes
  - [ ] Mensajes de usuario
  - [ ] Mensajes de asistente
  - [ ] Markdown support
  - [ ] Code highlighting
  - [ ] Tool results visualization
- [ ] `components/AIChat/AIChatActions.jsx` - Acciones rápidas
  - [ ] "Crear reserva"
  - [ ] "Ver disponibilidad"
  - [ ] "Listar usuarios"
  - [ ] "Generar reporte"

### Sprint 5: Funcionalidades Avanzadas (2-3 días)

#### Sistema de Function Calling
- [ ] Implementar tool calling en `aiService.js`
- [ ] Integrar tools con controllers
- [ ] Manejar confirmaciones para acciones destructivas
- [ ] Mostrar preview de acciones a ejecutar
- [ ] Manejar errores y rollback

#### Streaming de Respuestas
- [ ] Implementar Server-Sent Events en backend
- [ ] Cliente de streaming en frontend
- [ ] Renderizado incremental de mensajes
- [ ] Indicador de "escribiendo..."

### Sprint 6: Configuración de IA (1-2 días)

#### Frontend - Página de Configuración
- [ ] `pages/AIConfig.jsx` - Configuración de proveedores
  - [ ] Listar proveedores disponibles
  - [ ] Configurar API keys (encriptadas)
  - [ ] Test de conexión
  - [ ] Selección de modelo
  - [ ] Ajustes de temperatura, tokens, top_p
  - [ ] Rate limiting por proveedor
- [ ] Registrar ruta en `App.jsx`

---

## Fase 3: Integración y Testing

### Integración Final
- [ ] Integrar ThemeProvider en toda la app
- [ ] Aplicar CSS variables en todos los componentes
- [ ] Testing de marca blanca con múltiples agencias
- [ ] Testing de chat IA con diferentes proveedores
- [ ] Performance testing (CSS variables vs re-renders)
- [ ] Security audit (API keys, permissions, rate limiting)

### Documentación
- [x] Crear plan detallado en `plans/WHITE_LABEL_AI_CHAT_PLAN.md`
- [x] Actualizar `DOCUMENTACION_COMPLETA.md` con sección 12
- [ ] Documentar uso de API de marca blanca
- [ ] Documentar uso de API de chat IA
- [ ] Guía de usuario para configurar marca blanca
- [ ] Guía de usuario para usar chat IA

---

## Progreso General

| Fase | Sprint | Progreso | Estado |
|------|--------|----------|--------|
| 1 | Sprint 1 | 10% | 🚧 En Progreso |
| 1 | Sprint 2 | 0% | ⏳ Pendiente |
| 2 | Sprint 3 | 0% | ⏳ Pendiente |
| 2 | Sprint 4 | 0% | ⏳ Pendiente |
| 2 | Sprint 5 | 0% | ⏳ Pendiente |
| 2 | Sprint 6 | 0% | ⏳ Pendiente |
| 3 | Integración | 0% | ⏳ Pendiente |

**Progreso Total: ~2%**

---

## Notas de Implementación

### Prioridades
1. ✅ Plan y documentación (COMPLETADO)
2. 🚧 Migraciones de base de datos (EN PROGRESO)
3. ⏳ Backend de marca blanca
4. ⏳ Frontend de marca blanca
5. ⏳ Backend de chat IA
6. ⏳ Frontend de chat IA
7. ⏳ Integración y testing

### Bloqueantes
- Ninguno actualmente

### Decisiones Técnicas
- Usar CSS Custom Properties para temas dinámicos (mejor performance que re-renders)
- Encriptar API keys de IA con bcrypt antes de guardar
- Usar Server-Sent Events para streaming (más simple que WebSockets)
- Function calling con confirmación para acciones destructivas
