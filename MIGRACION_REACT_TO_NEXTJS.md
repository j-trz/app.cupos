# Guía de Migración: React a Next.js

## Introducción

Esta guía detalla el proceso de migración del frontend actual basado en React a Next.js, aprovechando las ventajas de renderizado del lado del servidor (SSR), generación de sitios estáticos (SSG), enrutamiento integrado y otras características avanzadas de Next.js.

## Ventajas de Migrar a Next.js

### 1. Rendimiento Mejorado
- **Server-Side Rendering (SSR)**: Contenido disponible inmediatamente, mejor rendimiento percibido
- **Static Site Generation (SSG)**: Páginas preconstruidas para velocidad máxima
- **Incremental Static Regeneration (ISR)**: Actualización de páginas estáticas sin reconstrucción completa
- **Client-Side Rendering (CSR)**: Para secciones altamente interactivas

### 2. SEO Optimizado
- Contenido renderizado en el servidor es indexado correctamente por motores de búsqueda
- Soporte nativo para metadatos dinámicos
- Mejor clasificación en resultados de búsqueda

### 3. Enrutamiento Integrado
- Sistema de enrutamiento basado en archivos
- Prefetching automático de rutas
- Soporte para rutas dinámicas y anidadas

### 4. Despliegue Simplificado
- Soporte nativo para Vercel y otros proveedores
- Optimización automática de recursos
- Manejo eficiente de microservicios

## Plan de Migración Paso a Paso

### Fase 1: Preparación del Entorno

#### 1.1. Configuración Inicial
```bash
# Navegar al directorio frontend
cd frontend

# Instalar Next.js
npx create-next-app@latest next-app --typescript --eslint --app --tailwind --src-dir --import-alias "@/*"

# Copiar archivos importantes
cp -r src/** next-app/src/
```

#### 1.2. Estructura de Carpetas
```
frontend/
├── next-app/
│   ├── app/              # Rutas basadas en la carpeta app (App Router)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/       # Componentes reutilizables
│   ├── lib/             # Utilidades y lógica de negocio
│   ├── public/          # Recursos estáticos
│   ├── styles/          # Hojas de estilo globales
│   └── types/           # Definiciones de tipos TypeScript
```

### Fase 2: Adaptación de Componentes Existentes

#### 2.1. Componentes de Página
React Original:
```jsx
// pages/Dashboard.jsx
import React from 'react';

const Dashboard = () => {
  return <div>Bienvenido al Dashboard</div>;
};

export default Dashboard;
```

Next.js (App Router):
```tsx
// app/dashboard/page.tsx
const DashboardPage = () => {
  return <div>Bienvenido al Dashboard</div>;
};

export default DashboardPage;
```

#### 2.2. Componentes Reutilizables
Los componentes UI pueden mantenerse mayormente igual, solo ajustando imports:
```tsx
// components/Header.tsx
'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/contexts/I18nContext';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const { theme } = useTheme();
  const { t } = useI18n();

  return (
    <header className={`bg-${theme}-primary text-${theme}-text`}>
      <h1>{t(title)}</h1>
    </header>
  );
};

export default Header;
```

#### 2.3. Contextos y Estado Global
Los contextos de React funcionan igual en Next.js:
```tsx
// contexts/AppProvider.tsx
'use client';

import React from 'react';
import { ThemeProvider } from './ThemeContext';
import { I18nProvider } from './I18nContext';

interface AppProviderProps {
  children: React.ReactNode;
}

const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <I18nProvider>
        {children}
      </I18nProvider>
    </ThemeProvider>
  );
};

export default AppProvider;
```

### Fase 3: Implementación del Enrutamiento

#### 3.1. Conversión de Rutas
De la estructura de React Router a App Router de Next.js:

Antes (React Router):
```jsx
// App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';

const App = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/products" element={<Products />} />
    </Routes>
  </Router>
);
```

Ahora (Next.js App Router):
```
app/
├── layout.tsx          # Layout raíz
├── page.tsx           # Página principal (equivalente a "/")
├── dashboard/
│   └── page.tsx       # Equivalente a "/dashboard"
└── products/
    └── page.tsx       # Equivalente a "/products"
```

#### 3.2. Layout Raíz
```tsx
// app/layout.tsx
import AppProvider from '@/contexts/AppProvider';
import '@/styles/globals.css';

export const metadata = {
  title: 'Formulario Cupos',
  description: 'Sistema de gestión de cupos y reservas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
```

### Fase 4: Manejo de Datos y API Calls

#### 4.1. Client Components vs Server Components
- **Server Components**: Para renderizar datos que vienen del servidor
- **Client Components**: Para interactividad del lado del cliente

Server Component (datos desde el servidor):
```tsx
// app/products/page.tsx
import { fetchProducts } from '@/lib/products';

// Este componente se ejecuta en el servidor
const ProductsPage = async () => {
  const products = await fetchProducts();
  
  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export default ProductsPage;
```

Client Component (interacción del cliente):
```tsx
// components/ProductCard.tsx
'use client';

import { useState } from 'react';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div onClick={() => setExpanded(!expanded)}>
      <h3>{product.name}</h3>
      {expanded && <p>{product.description}</p>}
    </div>
  );
};

export default ProductCard;
```

#### 4.2. Llamadas a la API
```tsx
// lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api';

export const apiCall = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// hooks/useApi.ts
import { useState, useEffect } from 'react';
import { apiCall } from '@/lib/api';

export const useApi = <T>(endpoint: string) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await apiCall<T>(endpoint);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint]);

  return { data, loading, error };
};
```

### Fase 5: Optimización de Imágenes y Recursos

#### 5.1. Componente Image de Next.js
```tsx
// components/ProductImage.tsx
import Image from 'next/image';

interface ProductImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

const ProductImage: React.FC<ProductImageProps> = ({ 
  src, 
  alt, 
  width = 300, 
  height = 200 
}) => {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className="rounded-lg object-cover"
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  );
};

export default ProductImage;
```

#### 5.2. Optimización de CSS
```css
/* styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Variables CSS para temas */
  --color-primary: #3b82f6;
  --color-secondary: #64748b;
}

@layer base {
  body {
    @apply bg-background text-foreground;
  }
}
```

### Fase 6: Manejo de Temas y Idiomas

#### 6.1. Proveedor de Temas en el Layout
```tsx
// app/providers.tsx
'use client';

import { ThemeProvider } from 'next-themes';
import { I18nProvider } from '@/contexts/I18nContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <I18nProvider>
        {children}
      </I18nProvider>
    </ThemeProvider>
  );
}
```

#### 6.2. Actualizar Layout Principal
```tsx
// app/layout.tsx
import { Providers } from './providers';
import '@/styles/globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Fase 7: Configuración de Next.js

#### 7.1. next.config.js
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  images: {
    domains: ['localhost', 'your-api-domain.com'],
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
```

#### 7.2. tsconfig.json
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Fase 8: Implementación de Características Avanzadas

#### 8.1. Server Actions (Next.js 14)
```tsx
// actions/products.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function createProduct(formData: FormData) {
  const product = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
  };

  // Lógica para crear producto
  await saveProduct(product);

  // Revalidar cache
  revalidatePath('/products');
  
  return { success: true };
}
```

#### 8.2. Formularios con Server Actions
```tsx
// app/products/new/page.tsx
import { createProduct } from '@/actions/products';

const NewProductPage = () => {
  return (
    <form action={createProduct}>
      <input name="name" placeholder="Nombre del producto" required />
      <textarea name="description" placeholder="Descripción" />
      <button type="submit">Crear Producto</button>
    </form>
  );
};

export default NewProductPage;
```

### Fase 9: Pruebas y Validación

#### 9.1. Pruebas de Rendimiento
```bash
# Analizar bundle
npm run build
npx @next/bundle-analyzer analyze

# Pruebas de rendimiento
npx lighthouse-ci https://tu-dominio.vercel.app
```

#### 9.2. Validación de Funcionalidades
- Verificar que todas las rutas funcionen correctamente
- Probar la navegación entre páginas
- Validar que los contextos de tema e idioma sigan funcionando
- Comprobar que las llamadas a la API continúen operativas
- Verificar que los componentes interactivos respondan correctamente

### Fase 10: Despliegue

#### 10.1. Configuración de Vercel
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next",
      "config": {
        "zeroConfig": true
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "$1"
    }
  ]
}
```

#### 10.2. Variables de Entorno en Vercel
- NEXT_PUBLIC_API_BASE_URL: URL del backend
- Otros secrets necesarios para la aplicación

## Consideraciones Específicas para el Proyecto

### 1. Componentes Actuales a Migrar
- [ ] ThemeContext y ThemeToggle
- [ ] I18nContext y LanguageSelector
- [ ] GlobalSearch y AdvancedFilters
- [ ] KeyboardShortcuts y OnboardingGuide
- [ ] Layout y otros componentes UI

### 2. Integraciones a Mantener
- Autenticación con Supabase/JWT
- Configuración de temas personalizados
- Sistema de logs y auditoría
- Funcionalidades de exportación masiva

### 3. Consideraciones de API
- Las rutas API del backend deben mantenerse compatibles
- Considerar implementar API routes en Next.js para ciertas funcionalidades
- Mantener consistencia en la estructura de datos

## Recomendaciones de Buenas Prácticas

### 1. Estructura de Proyectos
- Usar App Router para nuevas aplicaciones
- Organizar componentes por funcionalidad
- Separar Client Components de Server Components apropiadamente

### 2. Rendimiento
- Usar lazy loading para componentes pesados
- Implementar skeleton screens durante carga
- Optimize imágenes con el componente Image de Next.js

### 3. SEO
- Definir metadata para cada página
- Usar structured data donde aplique
- Implementar canonical URLs

## Cronograma Sugerido

| Semana | Actividad |
|--------|-----------|
| 1 | Configuración del entorno y estructura base |
| 2 | Migración de componentes básicos y enrutamiento |
| 3 | Implementación de data fetching y API calls |
| 4 | Optimización de rendimiento y pruebas |
| 5 | Implementación de características avanzadas y despliegue |

## Conclusión

La migración de React a Next.js proporcionará beneficios significativos en términos de rendimiento, SEO y experiencia de desarrollo. Con una planificación cuidadosa y ejecución gradual, se puede realizar esta transición manteniendo la funcionalidad existente mientras se aprovechan las nuevas capacidades de Next.js.