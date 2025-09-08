# 🔗 Guía de Usuario: Sistema de Conexiones API

## ¿Qué es el Sistema de Conexiones API?

El Sistema de Conexiones API te permite **cambiar la fuente de datos** de las páginas de Solicitudes y Confirmaciones. En lugar de estar limitado solo a Power Automate, ahora puedes conectar tu aplicación a diferentes fuentes de datos como:

- ⚡ **Power Automate** (actual)
- 🗄️ **Supabase** (base de datos)
- 📊 **Smartsheet** (hojas de cálculo)
- 🍃 **MongoDB** (base de datos NoSQL)

## 🔍 Ver la Fuente de Datos Actual

En las páginas de **Solicitudes** y **Confirmaciones**, ahora verás un indicador debajo del título que muestra:

```
📊 Fuente de datos: ⚡ Power Automate (Por defecto) [Por defecto] ⚙️
```

- **Icono**: Identifica el tipo de conexión
- **Nombre**: Nombre descriptivo de la conexión
- **Estado**: Indica si la conexión está funcionando
- **Botón ⚙️**: Te lleva a configurar conexiones

## 🔧 Configurar Nueva Fuente de Datos

### Paso 1: Acceder a Gestión de Conexiones

1. Haz clic en el icono ⚙️ junto a la fuente de datos actual
2. O navega desde el sidebar: **Conexiones API**

### Paso 2: Crear Nueva Conexión

1. Haz clic en **"Nueva Conexión"**
2. Selecciona el tipo de API que quieres conectar
3. Completa los campos requeridos:

#### Para Power Automate:

- **URL del Flow**: La URL completa de tu Flow de Power Automate

#### Para Supabase:

- **URL del Proyecto**: La URL de tu proyecto Supabase
- **API Key**: Tu clave API de Supabase

#### Para Smartsheet:

- **Token de API**: Tu token de acceso de Smartsheet

#### Para MongoDB:

- **Connection String**: Tu cadena de conexión MongoDB
- **Base de Datos**: Nombre de la base de datos

### Paso 3: Establecer Contraseña de Seguridad

⚠️ **IMPORTANTE**: Debes crear una contraseña maestra para encriptar tus credenciales

- Mínimo 12 caracteres
- Incluir mayúsculas, minúsculas y números
- **Nunca olvides esta contraseña** - sin ella no podrás acceder a tus conexiones

### Paso 4: Probar la Conexión

1. Una vez guardada, haz clic en el botón ▶️ para probar
2. Ingresa tu contraseña maestra
3. El sistema verificará que la conexión funcione

### Paso 5: Mapear Columnas (Opcional)

Si tu fuente de datos usa nombres de campos diferentes, puedes mapearlos:

1. Selecciona tu conexión activa
2. El sistema mostrará los campos disponibles
3. Mapea cada campo externo al campo interno correspondiente:
   - **Nombre Completo** → Campo de nombres en tu fuente
   - **Cédula** → Campo de identificación
   - **Email** → Campo de correo electrónico
   - **Fecha de Salida** → Campo de fecha del vuelo
   - Y así sucesivamente...

## 🔄 Cambiar Fuente de Datos

### Opción 1: Crear Nueva Conexión

1. Crea una nueva conexión siguiendo los pasos anteriores
2. Actívala marcándola como "Activa para Solicitudes"

### Opción 2: Activar Conexión Existente

1. Ve a **Conexiones API**
2. Encuentra la conexión que quieres usar
3. Haz clic en **"Configurar como Activa"**

Una vez cambiada, las páginas de Solicitudes y Confirmaciones **automáticamente** usarán la nueva fuente de datos.

## 🔒 Seguridad y Respaldos

### Encriptación Zero-Knowledge

- Tus credenciales se encriptan **antes** de enviarse al servidor
- Solo tú conoces la contraseña para desencriptarlas
- El servidor **nunca** puede ver tus credenciales en texto plano

### Crear Respaldos

1. Ve a **Conexiones API**
2. Haz clic en 📥 junto a la conexión
3. Ingresa tu contraseña maestra
4. Se descargará un archivo `.json` encriptado

### Restaurar desde Respaldo

1. Haz clic en **"Importar"**
2. Selecciona tu archivo de respaldo
3. Ingresa la contraseña usada para crear el respaldo
4. La conexión se restaurará

## ❓ Preguntas Frecuentes

### ¿Qué pasa si olvido mi contraseña maestra?

⚠️ **No hay forma de recuperarla**. Debes crear nuevas conexiones con una nueva contraseña.

### ¿Puedo tener múltiples conexiones del mismo tipo?

✅ Sí, puedes tener varias conexiones de Power Automate, Supabase, etc.

### ¿Los datos se sincronizan automáticamente?

✅ Sí, las páginas se actualizan cada 30 segundos automáticamente.

### ¿Puedo volver a Power Automate?

✅ Sí, siempre puedes crear una nueva conexión de Power Automate o reactivar una existente.

### ¿Qué pasa si una conexión falla?

🔍 El sistema mostrará el estado "Error" y continuará usando la conexión por defecto hasta que se resuelva.

## 🚀 Casos de Uso Comunes

### Migrar de Power Automate a Supabase

1. Crear conexión Supabase
2. Mapear las columnas correctamente
3. Probar que los datos se cargan bien
4. Activar la nueva conexión

### Usar Smartsheet como fuente principal

1. Obtener token de API de Smartsheet
2. Crear conexión en el sistema
3. Mapear campos de la hoja de cálculo
4. Activar para reemplazar Power Automate

### Respaldo antes de cambios importantes

1. Exportar conexión actual
2. Guardar archivo en lugar seguro
3. Hacer cambios necesarios
4. Restaurar si algo sale mal

## 🔧 Soporte Técnico

Si tienes problemas:

1. **Verificar estado de conexión**: Mira el indicador en Solicitudes/Confirmaciones
2. **Probar conexión**: Usa el botón ▶️ en Gestión de Conexiones
3. **Revisar mapeo**: Asegúrate que los campos estén mapeados correctamente
4. **Crear respaldo**: Antes de hacer cambios importantes

---

**💡 Consejo**: Comienza creando una conexión de prueba y probándola antes de cambiar tu fuente de datos principal.
