# Instrucciones para instalar Go en Windows manualmente

## Paso 1: Descargar Go

1. Abre PowerShell como administrador
2. Ejecuta este comando para descargar la última versión de Go:

```powershell
Invoke-WebRequest -Uri "https://dl.google.com/go/go1.21.6.windows-amd64.zip" -OutFile "go1.21.6.windows-amd64.zip"
```

## Paso 2: Extraer el archivo ZIP

1. Crea una carpeta para Go:
```powershell
New-Item -Path "C:\Go" -ItemType "Directory"
```

2. Extrae el contenido del ZIP:
```powershell
Expand-Archive -Path "go1.21.6.windows-amd64.zip" -DestinationPath "C:\Go"
```

## Paso 3: Configurar variables de entorno

1. Agrega Go al PATH:
```powershell
setx PATH "%PATH%;C:\Go\go\bin" -m
```

2. Establece GOROOT:
```powershell
setx GOROOT "C:\Go\go"
```

3. Configura variables adicionales:
```powershell
setx GOPROXY "https://proxy.golang.org,direct"
setx GOSUMDB "sum.golang.org"
```

## Paso 4: Verificar la instalación

1. Reinicia PowerShell
2. Verifica la versión:
```powershell
go version
```

Deberías ver:
```
go version go1.21.6 windows/amd64
```

## Paso 5: Instalar dependencias del proyecto

```powershell
go install github.com/pkg/errors@latest
go install github.com/jackc/pgx/v4@latest
go install github.com/go-sqlite/sqlite@latest
```

## Paso 6: Compilar el proyecto

```powershell
cd backend-go
```

```powershell
go build -o user-server ./cmd/api