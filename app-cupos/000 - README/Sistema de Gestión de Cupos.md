
Bienvenido al repositorio del **Sistema de Gestión de Cupos**, una solución moderna, robusta y escalable diseñada para la administración y distribución de cupos/disponibilidad de productos y servicios turísticos o corporativos para agencias aliadas.
  
La aplicación cuenta con un módulo de inteligencia artificial incorporado para asistencia, un panel analítico en tiempo real, un sistema de roles y permisos flexible (RBAC), configuración de marca blanca (White-Label) y flujos automáticos de expiración de reservas.

  
---

## 🏗️ Arquitectura del Proyecto

Este repositorio está estructurado en una arquitectura desacoplada de frontend y backend:

- **[frontend](file:///c:/Users/julian.estefan/Desktop/form-cupos/frontend)**: Aplicación web de tipo SPA (Single Page Application) construida sobre **React 19**, **Vite** y estilizada de forma moderna con **Tailwind CSS v4** y componentes de **Radix UI**.

- **[backend-go](file:///c:/Users/julian.estefan/Desktop/form-cupos/backend-go)**: API de alto rendimiento y baja latencia desarrollada en **Go (Golang)**, utilizando el framework **Gin Gonic** y **GORM** para la capa de persistencia con **PostgreSQL**.

### Estructura de Directorios Principal


```text

form-cupos/

├── backend-go/           # API REST desarrollada en Go (Golang)

├── frontend/             # SPA desarrollada en React + Vite

├── database/             # Scripts o recursos relacionados con la base de datos

├── docs/                 # Documentación técnica adicional

└── README.md             # Este archivo

```


---


## 🛠️ Prerrequisitos

Para poder ejecutar el proyecto localmente en tu máquina, necesitarás contar con:

- **Node.js** (v18.x o superior)

- **Go / Golang** (v1.25 o superior)

- **PostgreSQL** (v14 o superior) activo con una base de datos creada.

---

## 🚀 Guía de Inicio Rápido (Desarrollo Local)

Sigue estos pasos para poner en marcha toda la aplicación localmente en menos de 5 minutos:
  
### 1. Clonar el repositorio y configurar la Base de Datos

Asegúrate de tener corriendo tu instancia de PostgreSQL y de crear una base de datos limpia para el proyecto (por ejemplo, `gestion_cupos`).

### 2. Configurar y levantar el Backend (Go)

1. Navega al directorio del backend:

   ```bash

   cd backend-go

   ```

2. Crea tu archivo de configuración de variables de entorno local a partir del ejemplo:

   ```bash

   cp .env.example .env

   ```

3. Edita el archivo `.env` configurando tu cadena de conexión `DATABASE_URL` y otras variables de entorno según tus credenciales locales.

4. Descarga y sincroniza las dependencias de Go:

   ```bash

   go mod tidy

   ```

5. Inicia el servidor de desarrollo:

   ```bash

   go run cmd/api/main.go

   ```

   *El backend iniciará por defecto en `http://localhost:5002`.*


---

### 3. Configurar y levantar el Frontend (React)

1. Abre una nueva terminal y navega al directorio del frontend:

   ```bash

   cd frontend

   ```

2. Instala las dependencias de Node:

   ```bash

   npm install

   ```

3. Configura el archivo de entorno de desarrollo local. Por defecto, ya cuentas con un `.env.local` apuntando al backend en localhost (`http://localhost:5002/api`). Si necesitas apuntar a otra URL, crea o edita tu archivo `.env.local`:

   ```env

   VITE_API_URL=http://localhost:5002/api

   ```

4. Levanta el servidor de desarrollo local con Vite:

   ```bash

   npm run dev

   ```

   *El frontend iniciará en `http://localhost:5173` (o el primer puerto disponible).*


---

## 📂 Enlaces a Documentación Específica

Para conocer a detalle la configuración avanzada, las variables de entorno, la estructura interna del código o los endpoints específicos, consulta los READMEs individuales:

* 🛡️ **[README del Backend (Go)](file:///c:/Users/julian.estefan/Desktop/form-cupos/backend-go/README.md)**: Información técnica sobre los handlers, base de datos, sistema de cron, Vercel Serverless y más.

* 🎨 **[README del Frontend (React)](file:///c:/Users/julian.estefan/Desktop/form-cupos/frontend/README.md)**: Guía detallada de la arquitectura de la interfaz, componentes UI, internacionalización (i18n), layouts y scripts disponibles.


---

## 📦 Despliegue en Producción


El proyecto está optimizado y listo para ser desplegado en plataformas en la nube. Ambos módulos cuentan con configuraciones nativas de **Vercel** (`vercel.json`):


1. **Frontend**: Se compila estáticamente mediante `npm run build` y se puede conectar directamente al repositorio de GitHub desde el dashboard de Vercel.

2. **Backend**: Utiliza Serverless Functions en Vercel redirigiendo las peticiones a través de `api/index.go`. Puedes desplegarlo directamente usando el CLI de Vercel o la integración Git.

---

## 🧠 Mapa de este vault

> **Última revisión de este mapa contra el código**: 2026-08-10. Ver la convención de "sello de frescura" y el protocolo de actualización en [[Gotchas y Reglas de Oro]] (sección final).

Este vault es la base de conocimiento persistente del proyecto — el objetivo es que cualquier sesión de trabajo (humana o de IA) pueda arrancar leyendo acá en vez de re-derivar todo desde el código o desde una conversación anterior. Notas por carpeta:

- **[000 - README](#)** — este documento: qué es el proyecto, cómo levantarlo local, cómo se despliega.
- **[001 - API](../001%20-%20API/Referencia%20de%20API.md)** — catálogo completo de endpoints REST, convenciones de auth/errores/permisos.
- **[002 - Quickstart](../002%20-%20Quickstart/Quickstart.md)** — primera llamada autenticada, flujo mínimo de reserva por API.
- **[003 - Funcionalidades](../003%20-%20Funcionalidades/Flujos%20de%20Funcionalidades.md)** — cómo funciona cada módulo por dentro, con diagramas (17 secciones: auth, disponibilidad, ciclo de vida de reserva, cesión, grupos, RBAC, IA, cron de expiración, reportes, notificaciones, configuración, API keys, backups, Netviax Atlas).
- **[004 - Frontend](../004%20-%20Frontend/Frontend.md)** — arquitectura de la SPA: stack, rutas, contextos, servicios, hooks, componentes, mobile, i18n, build.
- **[005 - Arquitectura y Datos](../005%20-%20Arquitectura%20y%20Datos/Modelo%20de%20Datos.md)** — catálogo de tablas/modelos (GORM), relaciones y por qué están diseñadas así.
- **[006 - Operación y Mantenimiento](../006%20-%20Operación%20y%20Mantenimiento/Gotchas%20y%20Reglas%20de%20Oro.md)** — invariantes no obvias del repo (dos entrypoints de backend, sin DB de test, RBAC, scoping de agencia) + [historial de bugs ya resueltos](../006%20-%20Operación%20y%20Mantenimiento/Historial%20de%20Bugs%20Resueltos.md), para no re-investigar un síntoma ya conocido.
- **[007 - Integración Netviax Atlas](../007%20-%20Integración%20Netviax%20Atlas/Conexión%20y%20Estructura%20General.md)** — carpeta separada y activamente mantenida sobre la integración con el backoffice Netviax Atlas: conexión/credenciales, los flujos de lectura ya construidos (contactos, fichas) y la fase de escritura pendiente (reportar tickets emitidos) con el checklist de preguntas para Netviax.
- **[Feedback UTG](../Feedback%20UTG/Feedback%20equipo%20de%20testing%20(UTG)%20—%20Sistema%20de%20Cupos.md)** — backlog vivo de feedback del equipo de testing, normalizado por módulo, para el próximo plan de trabajo.

**Convención al agregar una nota nueva**: si documenta *cómo funciona* algo ya construido, va en 003/004/005. Si es una regla operativa o un bug ya cerrado, va en 006. Si es trabajo pendiente/backlog, va junto a Feedback UTG (o una carpeta de Planes nueva, si el volumen lo justifica). Evitar duplicar contenido entre notas — enlazar con Markdown en su lugar.