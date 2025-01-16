#!/bin/bash

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Iniciando setup completo...${NC}"

# Verificar si se está ejecutando como root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Este script debe ejecutarse como root${NC}"
  exit 1
fi

# Instalar dependencias básicas
echo -e "${YELLOW}Instalando dependencias básicas...${NC}"
apt-get update
apt-get install -y curl git build-essential

# Instalar Bun
echo -e "${YELLOW}Instalando Bun...${NC}"
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Verificar instalación de Bun
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: Bun no se instaló correctamente${NC}"
    exit 1
fi

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creando archivo .env...${NC}"
    cat > .env << EOF
PORT=3000
DIGITALOCEAN_TOKEN=your_token_here
DIGITALOCEAN_SSH_PASSWORD=ClientFy0.com
SECRET_KEY=$(bun ksuid)
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=clientfy_redis_password
REDIS_DB=0

# Admin Configuration
ADMIN_PASSWORD=FZ1TdwDKsV4XnxO
REDIS_COMMANDER_PORT=8081
EOF
    echo -e "${GREEN}Archivo .env creado. Por favor, actualiza las credenciales.${NC}"
fi

# Configurar Redis
echo -e "${YELLOW}Configurando Redis...${NC}"
apt-get install -y redis-server

# Backup configuración original de Redis
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Configurar Redis
cat > /etc/redis/redis.conf << EOF
# Red
bind 127.0.0.1
port 6379
protected-mode yes

# Memoria
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistencia
dir /var/lib/redis
appendonly yes
appendfsync everysec

# Políticas de guardado
save 900 1
save 300 10
save 60 100

# Seguridad
requirepass clientfy_redis_password
masterauth clientfy_redis_password

# Deshabilitar comandos peligrosos
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
EOF

# Configurar permisos de Redis
chown redis:redis /etc/redis/redis.conf
chmod 640 /etc/redis/redis.conf

# Reiniciar Redis
systemctl restart redis-server
systemctl enable redis-server

# Configurar Swap
echo -e "${YELLOW}Configurando memoria swap...${NC}"
SWAP_SIZE=4

# Desactivar swap existente
swapoff -a
rm -f /swapfile

# Crear nuevo swap
fallocate -l ${SWAP_SIZE}G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Hacer swap permanente
if ! grep -q "/swapfile" /etc/fstab; then
    echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

# Optimizar parámetros del kernel
echo "vm.swappiness=10" >> /etc/sysctl.conf
echo "vm.vfs_cache_pressure=50" >> /etc/sysctl.conf
sysctl -p

# Instalar dependencias del proyecto
echo -e "${YELLOW}Instalando dependencias del proyecto...${NC}"
bun install

# Construir el proyecto
echo -e "${YELLOW}Construyendo el proyecto...${NC}"
bun run build

# Configurar permisos de scripts
chmod +x start-server.sh stop-server.sh

# Crear servicio systemd
echo -e "${YELLOW}Configurando servicio systemd...${NC}"
cat > /etc/systemd/system/clientfy-orquesta.service << EOF
[Unit]
Description=Clientfy Orquesta Service
After=network.target redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=$(pwd)
ExecStart=$(which bun) run start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Recargar systemd
systemctl daemon-reload
systemctl enable clientfy-orquesta.service

# Añadir después de la sección de instalación de dependencias
echo -e "${YELLOW}Creando directorio public...${NC}"
mkdir -p public

echo -e "${GREEN}Configuración completada${NC}"
echo -e "${YELLOW}Pasos finales:${NC}"
echo "1. Edita el archivo .env con tus credenciales"
echo "2. Inicia el servicio: systemctl start clientfy-orquesta"
echo "3. Verifica el estado: systemctl status clientfy-orquesta"
echo -e "${GREEN}Logs disponibles con: journalctl -u clientfy-orquesta -f${NC}" 