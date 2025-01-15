# Configuración del Proyecto

## Instalación de Redis

### macOS

1. Usando Homebrew:

```bash
# Instalar Homebrew si no lo tienes
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar Redis
brew install redis

# Iniciar Redis
brew services start redis

# Verificar que Redis está corriendo
redis-cli ping
```

2. Para detener Redis:

```bash
brew services stop redis
```

### Windows

#### Opción 1: Usando Memurai (Recomendado para desarrollo)

1. Descarga Memurai desde: https://www.memurai.com/get-memurai
2. Ejecuta el instalador
3. Memurai se iniciará automáticamente como servicio

#### Opción 2: Usando WSL2 (Recomendado para producción)

1. Instala WSL2 desde PowerShell como administrador:

```powershell
wsl --install
```

2. Instala Redis en WSL2:

```bash
wsl
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

## Configuración del Proyecto

1. Instala las dependencias:

```bash
npm install
```

2. Configura el archivo .env:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=clientfy_redis_password
REDIS_DB=0
GMAIL_USER=clientfy0@gmail.com
GMAIL_APP_PASSWORD=tu_password
```

3. Inicia el servidor:

```bash
npm run dev
```

## Pruebas de API

### En macOS/Linux:

```bash
# Generar nueva contraseña
curl -X POST http://localhost:3000/api/password \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@gmail.com"}'

# Consultar historial
curl http://localhost:3000/api/password/history/usuario@gmail.com
```

### En Windows:

```powershell
# Generar nueva contraseña
curl -X POST http://localhost:3000/api/password `
  -H "Content-Type: application/json" `
  -d "{\"email\": \"usuario@gmail.com\"}"

# Consultar historial
curl http://localhost:3000/api/password/history/usuario@gmail.com
```

## Monitoreo de Redis

### macOS

```bash
# Ver logs de Redis
tail -f /usr/local/var/log/redis.log

# Monitorear Redis en tiempo real
redis-cli monitor

# Ver estadísticas
redis-cli info
```
