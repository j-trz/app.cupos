# Guía de deploy — form-cupos

Este proyecto son **dos aplicaciones independientes** que se despliegan por separado:

- `/frontend` — SPA en React + Vite. Se compila a archivos estáticos (`npm run build` → carpeta `dist/`).
- `/backend-go` — API en Go + Gin + GORM (Postgres). Tiene **dos entrypoints distintos**:
  - `api/index.go` — handler serverless, pensado exclusivamente para **Vercel** (`@vercel/go`).
  - `cmd/api/main.go` — servidor tradicional (`net/http` de larga duración), para **cualquier otro lugar** (Azure, un VPS, Docker, Railway, Render, etc.).

Esto importa porque varias cosas del backend están condicionadas al modelo serverless de Vercel (ver [Notas sobre serverless vs. servidor tradicional](#notas-sobre-serverless-vs-servidor-tradicional) más abajo). Si te movés a Azure u otro hosting con proceso persistente, algunas de esas limitaciones **dejan de aplicar** y se pueden mejorar.

---

## 1. Variables de entorno

### Backend (`backend-go`)

| Variable | Obligatoria | Ejemplo | Notas |
|---|---|---|---|
| `DATABASE_URL` | Sí | `postgresql://user:pass@host:5432/dbname?sslmode=require` | Postgres. En proveedores cloud (Neon, Supabase, Azure Database for PostgreSQL) casi siempre necesitás `sslmode=require`. |
| `JWT_SECRET` | Sí | cadena random larga | Si falta, `cmd/api/main.go`/algunos flujos caen a un secreto por defecto inseguro — **nunca lo dejes vacío en producción**. |
| `URL_FRONTEND` | Sí | `https://tu-frontend.vercel.app` | Único origen permitido por CORS. **Sin barra final** (ver [Troubleshooting](#troubleshooting)). |
| `PORT` | No (solo `cmd/api/main.go`) | `8080` | Vercel ignora esto (usa su propio runtime serverless). Lo usan Azure/Docker/VPS. |
| `CRON_SECRET` | Sí, si usás el cron | cadena random | Header `X-Cron-Secret` que debe mandar quien dispare `GET /api/cron/expire-reservations`. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | No | — | Fallback global de email si ninguna agencia tiene su propia config SMTP cargada desde `/email-config`. |

### Frontend (`frontend`)

| Variable | Obligatoria | Ejemplo | Notas |
|---|---|---|---|
| `VITE_API_URL` | Sí | `https://tu-backend.vercel.app/api` | **Tiene que incluir `/api`** (todas las rutas del backend cuelgan de ese prefijo) y **sin barra final**. |

⚠️ **Las variables `VITE_*` se "hornean" (bake) dentro del JS en el momento del `build`**, no en runtime. Si cambiás `VITE_API_URL` en el dashboard de Vercel/Azure/etc. después de deployar, **tenés que forzar un redeploy** (no alcanza con guardar la variable) para que el nuevo valor quede reflejado en el bundle.

---

## 2. Checklist antes de cualquier deploy

- [ ] `DATABASE_URL` apunta a una base accesible desde donde vayas a correr el backend (revisá reglas de firewall/IP allowlist si tu proveedor de Postgres las tiene).
- [ ] `JWT_SECRET` y `CRON_SECRET` están seteados con valores random reales, no de ejemplo.
- [ ] `URL_FRONTEND` (backend) = la URL pública real del frontend, **sin `/` al final**.
- [ ] `VITE_API_URL` (frontend) = la URL pública real del backend **+ `/api`**, **sin `/` al final**.
- [ ] Si usás el cron de expiración de reservas, tenés algo (cron-job.org, GitHub Actions, Azure Scheduler, etc.) apuntando a `GET <backend>/api/cron/expire-reservations` con el header `X-Cron-Secret: <CRON_SECRET>`.

---

## 3. Vercel (el setup actual del proyecto)

Se despliegan **dos proyectos de Vercel separados**, uno por carpeta.

### 3.1 Backend

1. Importar el repo en Vercel, "Root Directory" → `backend-go`.
2. Vercel detecta `backend-go/vercel.json` (usa `@vercel/go` sobre `api/index.go`) — no hace falta build command custom.
3. Environment Variables del proyecto: `DATABASE_URL`, `JWT_SECRET`, `URL_FRONTEND`, `CRON_SECRET`, y las de SMTP si aplica.
4. Deploy. Anotá la URL que te da Vercel (ej. `https://tu-backend.vercel.app`).

### 3.2 Frontend

1. Importar el mismo repo en Vercel (o el mismo proyecto de otra forma), "Root Directory" → `frontend`.
2. Framework preset: Vite. Build command `npm run build`, output `dist`.
3. Environment Variables: `VITE_API_URL` = `https://tu-backend.vercel.app/api` (la URL del paso anterior + `/api`).
4. Deploy.
5. Volvé al proyecto del **backend** y actualizá `URL_FRONTEND` con la URL real que te dio Vercel para el frontend (paso 4), si no la sabías de antes. Redeploy del backend si la cambiaste.

### 3.3 Si movés el proyecto a otra cuenta de Vercel (o creás uno nuevo)

Esto es exactamente lo que rompe el login con un error de CORS si no se hace en orden:

1. Deployá primero el que puedas (da igual el orden), anotá su nueva URL.
2. Actualizá la variable de entorno correspondiente en el OTRO proyecto (`URL_FRONTEND` en el backend, o `VITE_API_URL` en el frontend) con la URL nueva.
3. **Redeployá el proyecto cuya variable tocaste** — Vercel no reconstruye solo por cambiar una env var, hay que disparar un nuevo deploy (botón "Redeploy" o un nuevo push).
4. Repetí si tocaste ambas puntas.

---

## 4. Azure

Azure App Service **no tiene runtime nativo de Go** (a diferencia de Node/.NET/Python), así que el backend se despliega como **contenedor**. El repo ya incluye `backend-go/Dockerfile` para esto (usa `cmd/api/main.go`, el servidor tradicional — no el handler de Vercel).

### 4.1 Backend — Azure Container Apps (recomendado) o App Service (contenedor Linux)

1. Build y push de la imagen a un registry (Azure Container Registry, Docker Hub, etc.):
   ```bash
   cd backend-go
   docker build -t <tu-registry>/form-cupos-backend:latest .
   docker push <tu-registry>/form-cupos-backend:latest
   ```
2. Creá el recurso (Container App o App Service → "Docker Container") apuntando a esa imagen.
3. Configurá las **Application Settings / Environment Variables** con la misma tabla de la sección 1 (`DATABASE_URL`, `JWT_SECRET`, `URL_FRONTEND`, `PORT=8080`, `CRON_SECRET`, SMTP si aplica).
4. Exponé el puerto 8080 (coincide con el `EXPOSE`/`ENV PORT` del Dockerfile).
5. Anotá la URL pública que te da Azure (ej. `https://form-cupos-backend.azurewebsites.net` o el dominio de Container Apps).

### 4.2 Frontend — Azure Static Web Apps (recomendado para una SPA de Vite)

1. Creá un recurso "Static Web App", conectado a tu repo, con:
   - App location: `frontend`
   - Output location: `dist`
   - Build command: `npm run build`
2. En "Configuration" (Static Web Apps) o "Application Settings" (si usás App Service en su lugar), seteá `VITE_API_URL` = `https://<tu-backend-azure>/api`. Como con Vercel, esto se hornea en build time — cualquier cambio requiere un nuevo build/deploy.
3. Volvé al backend y actualizá `URL_FRONTEND` con la URL que te dio Azure para el frontend. Redeployá el backend.

### 4.3 Ventajas de Azure (o cualquier hosting con proceso persistente) sobre Vercel serverless

Como `cmd/api/main.go` corre como servidor de larga duración (no una función que se apaga entre requests), en Azure/Docker/VPS **podrías**:
- Reactivar SSE real para notificaciones en tiempo real (hoy deshabilitado a propósito porque Vercel no soporta conexiones largas — ver `notification_handler.go`/`useSSE` si lo reintroducís).
- Correr el cron de expiración de reservas como un `time.Ticker` interno en Go en vez de depender de un servicio externo que llame al endpoint HTTP.

Ninguna de las dos está implementada así hoy (el código actual asume serverless), pero son mejoras válidas a futuro si el hosting cambia definitivamente a algo persistente.

---

## 5. Otros hosting (Railway, Render, un VPS propio, etc.)

El patrón es el mismo en todos:
- **Backend**: correr `go run ./cmd/api` (o el binario compilado, o la imagen Docker) con las env vars de la sección 1. Railway/Render detectan el `Dockerfile` automáticamente si lo apuntás a `backend-go`.
- **Frontend**: `npm run build` dentro de `frontend`, servir la carpeta `dist/` como sitio estático (o usar el hosting estático nativo del proveedor).
- Mismo checklist de la sección 2, mismas dos variables cruzadas (`URL_FRONTEND` ↔ `VITE_API_URL`) apuntándose una a la otra.

---

## Troubleshooting

### "blocked by CORS policy: Redirect is not allowed for a preflight request" + URL con doble barra (`//auth/login`)

Causa real (nos pasó): `VITE_API_URL` quedó mal seteada — sin el `/api`, o con una `/` al final. Al concatenar con el endpoint (`/auth/login`) queda `https://tu-backend.vercel.app//auth/login` (doble barra), la plataforma redirige esa URL a la versión sin doble barra, y los navegadores **prohíben seguir redirects en un preflight (OPTIONS) de CORS** — por eso el error aparenta ser de CORS pero el problema de fondo es la URL mal armada.

Arreglo aplicado en el código (`frontend/src/services/apiClient.js`): la base URL ahora se normaliza sacando cualquier barra final, así que un typo con `/` de más ya no rompe nada. Aun así, seteá bien la variable:
```
VITE_API_URL=https://tu-backend.vercel.app/api
```
(sin barra al final) y **redeployá el frontend** después de corregirla.

### El login/cualquier request da error de CORS "no Access-Control-Allow-Origin"

`URL_FRONTEND` en el backend no coincide con el origen real del frontend. Revisá que sea exactamente el dominio (protocolo + host, sin path ni barra final) que ves en la barra de direcciones del navegador, y redeployá el backend tras corregirlo.

### Cambié una variable de entorno y no pasó nada

Para el frontend (Vite): las `VITE_*` se compilan al bundle en build time. Cambiarlas en el dashboard no alcanza — hay que disparar un nuevo build/deploy.

Para el backend en Vercel: las funciones serverless sí releen env vars en cada invocación fría, pero Vercel igual recomienda un redeploy si acabás de cambiar algo para evitar servir de una instancia "caliente" con el valor viejo en memoria.

### El cron de expiración de reservas nunca corre

No hay ningún cron nativo corriendo solo — necesitás un disparador externo (cron-job.org, GitHub Actions con `schedule`, Azure Logic Apps/Scheduler, etc.) pegándole a `GET <backend>/api/cron/expire-reservations` cada 5–15 min con el header `X-Cron-Secret`. Sin eso, las reservas bloqueadas nunca expiran solas.

### Emails no se envían / "no hay configuración SMTP para la agencia X"

El sistema resuelve la config SMTP por agencia (código o nombre) y, si no encuentra ninguna, cae a una config "global" guardada en base y por último a las variables `SMTP_HOST`/etc. Si ves este error, o falta cargar la config SMTP de esa agencia en `/email-config`, o el campo "agencia" del usuario no coincide con ninguna `Agency` real (código ni nombre).

---

## Notas sobre serverless vs. servidor tradicional

Cosas del backend que están así **porque hoy corre en Vercel serverless**, y que documentamos acá para que si migrás a Azure/Docker no se pierdan de vista como posibles mejoras (no son bugs, son decisiones de diseño atadas a la plataforma actual):

- **SSE deshabilitado**: `SSEHandler` cierra el stream inmediatamente porque una función serverless no puede mantener una conexión abierta. El frontend usa polling (cada 20s) para notificaciones en su lugar.
- **Cron externo por HTTP**: no hay ningún proceso en background corriendo dentro del backend; `GET /api/cron/expire-reservations` depende de que algo externo lo llame periódicamente.
- **Emails síncronos**: el envío de SMTP se hace en el mismo request (no en background), porque una goroutine lanzada en una función serverless no tiene garantía de terminar después de que la respuesta ya se mandó.

Si en algún momento el backend pasa a correr de forma persistente (Azure Container Apps, un VPS, etc. usando `cmd/api/main.go`), estas tres cosas se pueden reimplementar de forma más simple usando mecanismos nativos de un servidor de larga duración.
