# Frontend - Sistema de Gestión de Cupos 🎨

Este es el frontend para el Sistema de Gestión de Cupos. Se trata de una aplicación web moderna del tipo **Single Page Application (SPA)** construida con tecnologías de última generación para ofrecer una interfaz responsiva, accesible, interactiva y con un diseño estético premium de primer nivel.

---

## 🚀 Tecnologías y Librerías Principales

- **Biblioteca Principal**: [React v19](https://react.dev/)
- **Entorno de Compilación**: [Vite](https://vitejs.dev/)
- **Estilos y Layout**: [Tailwind CSS v4](https://tailwindcss.com/) (para una compilación de estilos veloz y moderna)
- **Componentes Accesibles**: [Radix UI](https://www.radix-ui.com/) (Accordion, Dialog, Select, Dropdown, Tabs, Switch, etc.)
- **Gestión de Formularios**: [React Hook Form](https://react-hook-form.com/) en combinación con [Zod](https://zod.dev/) para validaciones estrictas y seguras del lado del cliente.
- **Estado de Servidor**: [TanStack React Query v5](https://tanstack.com/query/latest) para fetching eficiente, almacenamiento en caché inteligente y sincronización fluida de datos.
- **Animaciones**: [Framer Motion](https://www.framer.com/motion/) para transiciones y micro-animaciones fluidas de interfaz.
- **Gráficos**: [Chart.js](https://www.chartjs.org/) y [Recharts](https://recharts.org/) para el dashboard y visualizaciones analíticas.
- **Internacionalización**: [i18next](https://www.i18next.com/) para soporte nativo multi-idioma (i18n).
- **Exportación de Datos**: `xlsx` (SheetJS) y `jspdf` / `jspdf-autotable` para generación de reportes descargables en Excel y PDF.
- **Iconografía**: [Lucide React](https://lucide.dev/) y [Heroicons](https://heroicons.com/).

---

## 📁 Estructura del Proyecto

La estructura de código en `/src` es modular y sigue las mejores prácticas de desarrollo en React:

```text
frontend/
├── dist/                 # Carpeta de salida para compilación de producción
├── src/
│   ├── components/       # Componentes visuales reutilizables y atómicos
│   ├── contexts/         # Contextos globales de React (ej: Autenticación, Marca Blanca)
│   ├── hooks/            # Hooks de React personalizados (custom hooks)
│   ├── i18n/             # Configuración e idiomas para internacionalización
│   ├── lib/              # Inicializaciones de librerías (ej. Axios, utilidades tailwind merge)
│   ├── pages/            # Vistas/Páginas completas asociadas a las rutas del sistema
│   ├── schemas/          # Schemas de validación de Zod para formularios
│   ├── services/         # Servicios de integración HTTP para conectar con la API de Go
│   ├── styles/           # Archivos CSS globales y utilidades adicionales
│   ├── App.jsx           # Enrutamiento principal (React Router DOM) y providers
│   ├── index.css         # Archivo de entrada de estilos de Tailwind CSS
│   └── main.jsx          # Punto de entrada de renderizado de React en el DOM
├── index.html            # Archivo HTML base de la aplicación
├── tailwind.config.js    # Configuración del entorno de Tailwind CSS
├── vite.config.js        # Configuración del bundler Vite y sus plugins
├── vercel.json           # Configuración de redirección de rutas SPA para Vercel
└── package.json          # Script de automatización y lista de dependencias
```

---

## 🛠️ Configuración y Desarrollo Local

### 1. Prerrequisitos
- Tener instalado **Node.js v18.x o superior**.
- Tener corriendo localmente la API de Go (ej. en `http://localhost:5002`).

### 2. Instalación de Dependencias
Navega a la carpeta del frontend e instala los paquetes necesarios:
```bash
cd frontend
npm install
```

### 3. Configurar Variables de Entorno
Por defecto, el frontend utiliza el archivo `.env.local` para el desarrollo local. Si requieres configurarlo de forma personalizada, puedes crear o editar dicho archivo en la raíz del frontend:

```env
VITE_API_URL=http://localhost:5002/api
```

> [!NOTE]  
> Todas las variables del lado del cliente expuestas a Vite deben comenzar con el prefijo `VITE_`.

### 4. Iniciar el Servidor de Desarrollo
Para levantar el servidor local con soporte de recarga rápida (HMR):
```bash
npm run dev
```
La aplicación estará disponible de forma local en `http://localhost:5173`.

---

## 📦 Scripts Disponibles

En el archivo `package.json` dispones de las siguientes tareas programadas:

* `npm run dev`: Inicia el servidor de desarrollo local de Vite expuesto en red local.
* `npm run build`: Compila y optimiza la aplicación de React para producción en el directorio `/dist`.
* `npm run preview`: Previsualiza de forma local la compilación estática generada en `/dist`.
* `npm run lint`: Ejecuta el análisis de calidad de código con ESLint.
* `npm run format`: Formatea el código fuente del frontend automáticamente con Prettier.

---

## 📦 Despliegue en Producción

Este frontend está configurado y listo para ser desplegado en plataformas como **Vercel** o **Netlify**. 

El archivo `vercel.json` en la raíz de la carpeta frontend asegura que todas las peticiones a rutas dinámicas sean redirigidas a `index.html` (comportamiento requerido para el correcto enrutamiento del lado del cliente con `react-router-dom`):

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
