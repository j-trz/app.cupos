# Prueba manual — Travelcompositor Contract API (Transport)

Colección de [Thunder Client](https://marketplace.visualstudio.com/items?itemName=rangav.vscode-thunder-client) (extensión de VS Code) para probar de punta a punta el alta de un producto de transporte propio en Travelcompositor — la API real para "cargar productos con gestión de inventario" (no la de búsqueda/reserva). Contexto completo en `app-cupos/011 - Integración Travelcompositor/API Contrato de Proveedor (Alta y Gestión de Inventario).md`.

## Instalar y cargar

1. Instalar la extensión **Thunder Client** en VS Code (ícono de rayo en la barra lateral).
2. Pestaña **Collections** → botón `...` → **Import** → elegir `Travelcompositor - Contract Transport.thunder-collection.json`.
3. Pestaña **Env** → `...` → **Import** → elegir `Travelcompositor - Test.thunder-environment.json`.
4. Arriba a la derecha, seleccionar el environment **"Travelcompositor - Test"** (si no, las variables `{{...}}` no se resuelven).

## Completar credenciales (nunca subir esto a git)

Abrir el environment importado (pestaña Env) y completar a mano:
- `username` / `password` / `micrositeId` — los que te dio el account manager de Travelcompositor.

El resto de las variables (`authToken`, `supplierId`, `transportId`) se van completando manualmente a medida que se corre cada request (ver abajo) — **no hay scripting automático**, es intencional: para una prueba puntual de una vez alcanza con copiar el valor de la respuesta al campo del environment, sin depender de que el formato exacto de post-request-script de Thunder Client no cambie entre versiones.

## Orden de ejecución

1. **1 - Authenticate** → correr. De la respuesta, copiar el valor de `"token"` y pegarlo en la variable de environment `authToken` (sin el prefijo `Bearer`, va tal cual — el header que espera la API es literalmente `auth-token: <token>`, confirmado contra el spec OpenAPI, no `Authorization: Bearer`). Dura 120 minutos — si tarda en volver a correr todo, repetir este paso.
2. **2 - Crear Supplier** (solo la primera vez, salteable si ya tenés un `supplierId`) → correr. De la respuesta, copiar el `id` numérico a la variable `supplierId`.
3. **3 - Crear Transporte (contrato / ruta)** → correr. Body de prueba ya cargado (aerolínea `XX`, ruta MVD→GRU ficticia, tarifas de prueba) — **ajustar según lo que quieras probar**. De la respuesta, copiar el `id` a la variable `transportId`.
4. **4 - Crear Option (tarifa + inventario/stock)** → correr. Este es el que manda el stock real (`inventories: [{ inventoryDate: {start, end}, quantity }]`) — el `code` ya viene de la variable `optionCode` (`TEST-OPT-01` por default).
5. **5 - Ver Transporte creado** y **6 - Ver Option por código** → correr para confirmar que quedó todo guardado como se esperaba, en particular que el array `inventories` de la Option persistió.
6. **7 - Listar Transportes del Supplier** → opcional, para ver todo lo cargado bajo ese `supplierId`.

## Qué mirar si algo falla

- **401 en cualquier request que no sea Authenticate**: `authToken` vacío, vencido (120 min), o mal pegado en el environment.
- **400 con detalle de validación**: los enums de prueba (`transportType: PLANE`, `operationalDays: MONDAY/WEDNESDAY/FRIDAY`, `currency: USD`) son una suposición razonable, no vinieron confirmados 1:1 contra el spec en la exploración inicial — si la API rechaza alguno, el mensaje de error debería decir el valor válido esperado; anotar el resultado real en el vault (`Checklist y Estado.md`) para no tener que volver a adivinar.
- **Cualquier resultado (éxito o error)**: vale la pena volcarlo en `app-cupos/011 - Integración Travelcompositor/Checklist y Estado.md` — es exactamente el tipo de confirmación que esa nota está esperando antes de escribir el código real de la integración.
