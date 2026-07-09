# Auditoría de Arquitectura, UX/UI y Plan de Acción Técnico

Este documento presenta una auditoría técnica completa del sistema, abarcando tanto el **Frontend (React con Vite)** como el **Backend de Go (`backend-go` utilizando Gin y GORM)**. A continuación, se detalla un análisis profundo del estado actual del software y un **Plan de Acción Mega Detallado** para la implementación de las mejoras solicitadas.

---

## 1. Auditoría del Backend en Go (`/backend-go`)

### 1.1 Estructura del Proyecto y Modularidad
* **Estado Actual:** El backend está escrito en Go utilizando un patrón clásico con Gin y GORM. El código se divide de forma limpia en `pkg/database`, `pkg/models`, `pkg/services`, `pkg/middleware` y `pkg/handlers`.
* **Fortalezas:**
  - Uso de Gin para enrutamiento rápido.
  - Abstracción de modelos y persistencia mediante GORM.
  - Migraciones automáticas integradas en `InitDB()`.
* **Oportunidades de Mejora:**
  - **Manejo de errores:** Algunos manejadores retornan errores 500 directos sin logging estructurado.
  - **Sincronización de Base de Datos (Mantenimiento de Stock):** En el endpoint `/ai/chat`, la creación de reservas mediante `executeTool` ("crear_reserva") reduce la disponibilidad utilizando una consulta simple (`UpdateColumn`). En escenarios de alta concurrencia o reservas masivas, se podrían producir condiciones de carrera (Race Conditions). Es recomendable encapsular esto en transacciones nativas de base de datos con bloqueo (`SELECT FOR UPDATE`).

### 1.2 Seguridad, Roles y Control de Acceso (RBAC)
* **Estado Actual:** El sistema cuenta con un control de acceso granular mediante roles (`admin`, `agency_admin`, `agency_user`/`user`) y permisos mapeados por base de datos.
* **Fortalezas:**
  - En los servicios de IA, se valida estrictamente el rol para evitar que usuarios comunes accedan a reservas globales o a los precios netos (`neto_1`).
* **Oportunidades de Mejora:**
  - El campo `Password` fue removido con éxito de la tabla `profiles` mediante un ALTER TABLE para delegar la autenticación de forma segura a través de tokens firmados. No obstante, se debe garantizar que todas las rutas sensibles que retornan perfiles u órdenes omitan información confidencial del usuario.

### 1.3 Asistente IA, Tool Calling y Adjuntos
* **Estado Actual:** El chat de IA (`ai_handler.go`) es compatible con múltiples proveedores (OpenAI, Anthropic y Google Gemini). Soporta de forma integrada llamadas a funciones (*tool calling*) para automatizar tareas (búsqueda de productos, creación y cancelación de reservas, etc.).
* **Limitaciones Críticas Actuales:**
  - **Limitación de Adjunto Único:** Los campos `ImageBase64` e `ImageMime` están limitados a un solo archivo. Si el usuario sube múltiples documentos (DNI, pasaporte) para crear reservas masivas, el backend actual solo procesará el primero.
  - **Flujo de Reservas Masivas:** El prompt del sistema actual no contempla instrucciones claras para el procesamiento secuencial e individual de múltiples pasajeros cuando se adjuntan múltiples documentos. El modelo necesita reglas de control para:
    1. Extraer datos de todos los adjuntos provistos.
    2. Presentar un resumen consolidado de los pasajeros detectados.
    3. Solicitar confirmación explícita (el "OK").
    4. Realizar llamadas consecutivas a `crear_reserva` por cada pasajero verificado, respetando que cada uno consume exactamente un (1) cupo.

---

## 2. Auditoría del Frontend (`/frontend`)

### 2.1 Estructura Visual y Consistencia de Diseño (UX/UI)
* **Estado Actual:** El frontend adopta un diseño minimalista y moderno, inspirado en Vercel, con una paleta de colores oscuros/zinc, bordes suaves y tipografía limpia.
* **Deficiencias de Duplicación en Cabeceras:**
  - **Problema:** En el flujo actual, cada vista de la app renderiza un componente `<PageHeader>` en su parte superior con un título, una descripción y un icono. Al mismo tiempo, el componente de estructura global (`Layout.jsx`) renderiza su propio título fijo en la barra superior (`header`), calculado mediante una función laxa (`getTitleByPath`).
  - **Impacto:** Esto genera una duplicación visual innecesaria de títulos en todas las páginas, reduciendo drásticamente el espacio vertical disponible (el "Viewport") para el contenido principal (como tablas de reservas, gráficos o formularios).
* **Sidebar y Responsividad:**
  - **Problema:** El sidebar utiliza la clase Tailwind `w-58`. Dicha clase **no existe** en la escala de anchos por defecto de Tailwind CSS. Esto causa inconsistencias de renderizado en el navegador, ya que el sidebar no tiene un ancho fijo predecible y se adapta de forma laxa al contenido interno.
  - **Impacto:** Al expandir el sidebar, el contenedor de la derecha se deforma o el contenido principal se ve cortado en el extremo derecho de la pantalla por la falta de un cálculo dinámico adecuado.

### 2.2 Canal del Asistente IA (Chat)
* **Estado Actual:** El componente `AIChatInput.jsx` solo permite adjuntar una única imagen mediante un lector de archivos básico (`FileReader`). No hay carrusel de previsualización para múltiples adjuntos, ni validaciones adecuadas de lote.
* **Oportunidad:** Convertir la entrada de archivos en un arreglo de adjuntos dinámicos para habilitar la carga masiva de documentos en una sola interacción con el agente inteligente.

### 2.3 Página de Documentación (`Documentacion.jsx`)
* **Estado Actual:** Se identificó que la página `/documentacion` renderiza un componente en `frontend/src/pages/Documentacion.jsx`. No obstante, su diseño se desvía del estándar visual del resto del sistema: utiliza estilos basados en azules intensos fijos, no hereda de forma óptima los colores configurables de la Marca Blanca (White Label) y la estructura de su acordeón es demasiado rústica en comparación con las tarjetas unificadas del panel de control.
* **Oportunidad:** Rediseñar la página para unificar su interfaz utilizando la tipografía global, colores dinámicos del White Label y un diseño de acordeones y badges impecable.

---

## 3. Plan de Acción Mega Detallado

A continuación, se define el plan paso a paso con las modificaciones exactas a aplicar en el código para implementar cada una de las mejoras solicitadas de manera segura y sin efectos colaterales.

### Fase 1: Implementar Topbar Dinámico (Eliminar Duplicidad de Cabeceras)
1. **Crear `HeaderContext`:**
   - Crear un archivo `frontend/src/contexts/HeaderContext.jsx` para gestionar el estado de la cabecera actual:
     ```javascript
     { title: "", description: "", icon: null, badge: "", action: null }
     ```
2. **Integrar el Proveedor en la App:**
   - Envolver el enrutador en `App.jsx` o dentro de `Layout.jsx` con el `HeaderProvider`.
3. **Modificar `PageHeader.jsx`:**
   - En lugar de renderizar componentes HTML en el cuerpo de la página, utilizar un efecto (`useEffect`) que envíe sus propiedades (`title`, `description`, `icon`, `badge`, `action`) al `HeaderContext` en cada montaje, limpiando el estado al desmontar.
4. **Actualizar `Layout.jsx`:**
   - Modificar la barra superior (`header`) para leer los datos del `HeaderContext`.
   - Mostrar el icono de la página, el título y el subtítulo en formato compacto.
   - Mostrar en el extremo derecho los botones de acción (`action`) y los badges dinámicos recibidos, logrando un diseño sumamente profesional y maximizando el espacio de visualización para las tablas y gráficos de la sección `main`.

### Fase 2: Corrección y Cálculo Dinámico del Ancho del Sidebar
1. **Unificar Contexto de Sidebar:**
   - Envolver el `Layout` en el proveedor global `SidebarProvider` dentro de `App.jsx`.
2. **Corregir `Sidebar.jsx`:**
   - Eliminar el valor erróneo `w-58`.
   - Configurar el ancho dinámicamente mediante estilos inline enlazados a la configuración de Marca Blanca (`config.sidebar.width` para expandido, y `collapsed_width` para colapsado), o en su defecto, establecer valores predecibles de Tailwind (como `w-64` y `w-16`).
3. **Evitar Contenido Cortado en `Layout.jsx`:**
   - Añadir la propiedad `min-w-0` y `overflow-hidden` al contenedor flexible del contenido principal:
     ```javascript
     <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
     ```
   - Esto evita desbordamientos horizontales de las tablas y gráficos, obligándolos a adaptarse dinámicamente al espacio restante calculado por flexbox.

### Fase 3: Soporte de Múltiples Adjuntos en el Chat de IA (Masivo)
1. **Frontend - Rediseño de Entrada de Archivos (`AIChatInput.jsx`):**
   - Modificar el estado local de una única previsualización a un arreglo de adjuntos:
     ```javascript
     const [attachments, setAttachments] = useState([]); // { id, name, base64, mime, dataUrl }
     ```
   - Permitir la selección múltiple en el input HTML: `<input type="file" multiple ... />`.
   - Renderizar un contenedor de previsualización horizontal con miniaturas y un botón de eliminación para cada archivo.
   - Enviar el lote completo en un arreglo llamado `images` a la función `onSendMessage`.
2. **Frontend - Actualizar Envío de Datos (`aiService.js`):**
   - Modificar `sendMessage` para recibir el lote de adjuntos y estructurar el payload como `images: [{ base64: "...", mime: "..." }]`.
3. **Backend Go - Actualizar Endpoint de IA (`ai_handler.go`):**
   - Modificar el struct `ChatRequest` para admitir la colección de imágenes:
     ```go
     type ImageAttachment struct {
         Base64 string `json:"base64"`
         Mime   string `json:"mime"`
         Name   string `json:"name"`
     }
     type ChatRequest struct {
         ...
         Images []ImageAttachment `json:"images"`
     }
     ```
   - Modificar la construcción del mensaje del usuario (`userContent`) para mapear recursivamente todas las imágenes y adjuntarlas al contexto del prompt, soportando OpenAI, Claude y Gemini de forma transparente.
4. **Ajuste del System Prompt de la IA:**
   - Instruir a la IA para que, ante la presencia de múltiples adjuntos de identificación (DNI o pasaporte):
     1. Extraiga y consolide los datos de todos los pasajeros en un listado estructurado.
     2. Solicite explícitamente el "OK" o validación del operador humano antes de proceder.
     3. Tras la validación, realice iteraciones consecutivas (llamadas a la herramienta `crear_reserva`) para registrar a cada pasajero individualmente en un cupo único, garantizando la consistencia del inventario.

### Fase 4: Rediseño Visual de la Página de Documentación
1. **Mejorar `Documentacion.jsx`:**
   - Unificar los estilos de la sección de inicio de la guía con las tarjetas predefinidas de la app.
   - Eliminar los fondos azules intensos fijos y utilizar variables dinámicas de color primario/secundario del contexto `WhiteLabel`.
   - Refactorizar las secciones de tipo acordeón para brindar una interacción suave, con bordes redondeados consistentes y sombreados discretos (`shadow-sm` y `shadow-md`), alineados al estilo Vercel.

---

*Fin del Reporte de Auditoría y Plan de Acción.*
