# Sistema de IA en el Backend Go — Estado actual

## ✅ Sistema completamente funcional

El backend Go tiene todo configurado en [ai_handler.go](file:///c:/Users/julian.estefan/Desktop/form-cupos/backend-go/pkg/handlers/ai_handler.go).

---

## 📋 Instrucciones (System Prompt)

El system prompt se construye **dinámicamente** por usuario en `buildSystemPrompt()`:

| Bloque | Contenido |
|--------|-----------|
| **Identidad del usuario** | Nombre, email, rol, agencia, ID interno |
| **Reglas de seguridad** | 5 reglas críticas que no se pueden ignorar |
| **Permisos por rol** | Se agrega/quita texto según si es admin, agency_admin o user |
| **Flujo de reserva** | 7 pasos en orden exacto que debe seguir la IA |
| **Búsqueda de productos** | Regla crítica: nunca decir "no hay" si sí hay |
| **Lectura de documentos** | DNI/pasaportes: extraer datos y usarlos sin preguntar de nuevo |
| **Memoria de sesión** | No repetir preguntas ya respondidas |

---

## 🛠️ Acciones (Tools) configuradas por rol

### 👤 Todos los usuarios (user, agency_user, agency_admin, admin)
| Tool | Descripción |
|------|-------------|
| `buscar_productos` | Busca cupos por destino, compañía, tipo, código |
| `mis_reservas` | Ve las reservas **del usuario actual** (con filtro forzado) |
| `crear_reserva` | Crea una nueva reserva con datos del pasajero |
| `detalle_reserva` | Detalle completo de una reserva por ID |

### 🏢 agency_admin + admin (se agregan)
| Tool | Descripción |
|------|-------------|
| `todas_reservas` | Lista TODAS las reservas (con filtros por estado y agencia) |
| `estadisticas` | Estadísticas del sistema |
| `confirmar_reserva` | Cambia estado de reserva a "confirmado" |

### 🔑 Solo admin (se agrega)
| Tool | Descripción |
|------|-------------|
| `buscar_usuarios` | Busca usuarios del sistema por nombre/email |
| `cancelar_reserva` | Cancela/elimina una reserva |

---

## 🔄 Flujo de Tool Calling (Loop automático)

```
Usuario envía mensaje
       ↓
IA llama a tool (ej: buscar_productos)
       ↓
Go ejecuta la query directa a la BD
       ↓
Resultado se inyecta en el historial
       ↓
IA puede llamar otra tool o responder
       ↓
(máx. 5 iteraciones)
       ↓
Si no cerró con texto → "nudge" forzado
       ↓
Respuesta final al usuario
```

---

## 🔒 Seguridad real (no solo en el prompt)

El executor de tools (`executeTool`) **también** aplica seguridad en el código Go:

- `mis_reservas` → filtra por `created_by = userID` para usuarios no-admin
- `todas_reservas` → rechaza si el rol no es admin/agency_admin
- `cancelar_reserva` → solo accesible para admin
- **Precios netos** → se ponen en 0 para usuarios regulares antes de devolver

---

## 📡 Proveedores de IA soportados

| Proveedor | Tipo |
|-----------|------|
| OpenAI | `openai` |
| Anthropic (Claude) | `anthropic` |
| Google (Gemini) | `google` |

Se configuran desde la base de datos (tabla `ai_providers`). La IA usa el que esté marcado como activo/default.

---

## 📸 Soporte multimodal (imágenes)

El frontend puede enviar `imageBase64` + `imageMime` y el backend lo formatea correctamente para cada proveedor:
- **OpenAI/Anthropic** → `image_url` con data URI
- **Google Gemini** → `inlineData` con mimeType

Sirve para adjuntar fotos de DNI/pasaportes y que la IA extraiga los datos del pasajero.
