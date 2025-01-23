#!/bin/bash

# Habilitar modo de depuración
set -x

echo "=== Iniciando limpieza completa de Redis ==="

# Verificar si se está ejecutando como root
if [ "$EUID" -ne 0 ]; then 
    echo "Este script debe ejecutarse como root"
    exit 1
fi

# Verificar si redis-server está instalado
if ! command -v redis-server &> /dev/null; then
    echo "Redis no está instalado. Instalando..."
    apt-get update
    apt-get install -y redis-server
fi

# Detener el servicio Redis
echo "Deteniendo servicios Redis..."
systemctl stop redis-server || true
service redis-server stop || true

# Buscar y matar procesos de Redis
echo "Buscando procesos Redis..."
pkill -f redis || true
sleep 2
if pgrep -f redis > /dev/null; then
    echo "Forzando cierre de procesos Redis..."
    pkill -9 -f redis || true
fi

# Verificar puertos en uso
echo "Verificando puerto Redis (6379)..."
netstat -tuln | grep ":6379 " || echo "Puerto 6379 libre"
if netstat -tuln | grep ":6379 " > /dev/null; then
    echo "Puerto 6379 en uso. Identificando proceso..."
    lsof -i :6379 || true
    echo "Intentando liberar puerto 6379..."
    fuser -k 6379/tcp || true
fi

# Crear usuario redis si no existe
if ! id -u redis &>/dev/null; then
    echo "Creando usuario redis..."
    useradd -r -s /bin/false redis
fi

# Resto del script con manejo de errores
echo "Preparando directorios..."
{
    # Limpiar archivos del servicio y configuración
    rm -f /etc/systemd/system/redis.service
    rm -f /etc/systemd/system/redis-server.service
    rm -f /etc/init.d/redis-server

    # Limpiar y crear directorios
    rm -rf /etc/redis
    mkdir -p /etc/redis
    rm -rf /var/log/redis
    mkdir -p /var/log/redis
    mkdir -p /var/lib/redis

    # Asignar permisos
    chown -R redis:redis /var/log/redis
    chmod 750 /var/log/redis
    chown -R redis:redis /var/lib/redis
    chmod 750 /var/lib/redis
} || {
    echo "Error al preparar directorios y permisos"
    exit 1
}

# Desactivar modo de depuración
set +x

echo "=== Limpieza completada ==="

# Hacer backup del archivo de configuración original
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Crear archivo de servicio personalizado
echo "Creando archivo de servicio..."
cat > /lib/systemd/system/redis-server.service << EOF
[Unit]
Description=Redis In-Memory Data Store
After=network.target
Documentation=https://redis.io/documentation

[Service]
Type=simple
User=redis
Group=redis
ExecStart=/usr/bin/redis-server /etc/redis/redis.conf --supervised systemd
ExecStop=/usr/bin/redis-cli shutdown
Restart=always
TimeoutStartSec=180
TimeoutStopSec=60
LimitNOFILE=65535

# Hardening
PrivateTmp=yes
ProtectHome=yes
ProtectSystem=full
ReadWritePaths=-/var/lib/redis
ReadWritePaths=-/var/log/redis
ReadWritePaths=-/var/run/redis

[Install]
WantedBy=multi-user.target
EOF

# Asegurarse que el directorio para el pid existe
mkdir -p /var/run/redis
chown redis:redis /var/run/redis
chmod 750 /var/run/redis

# Configurar Redis
cat > /etc/redis/redis.conf << EOF
# Red
bind 0.0.0.0
port 6379
protected-mode yes
requirepass "clientfy_redis_password"

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
save 60 10000

# Notificaciones (requerido para el negocio)
notify-keyspace-events KEA

# Timeout settings
timeout 0

# Ajustes de rendimiento
tcp-keepalive 300
databases 16

# Logs
logfile /var/log/redis/redis-server.log
loglevel notice
EOF

# Asegurar permisos correctos y directorios
mkdir -p /var/lib/redis
chown -R redis:redis /etc/redis/
chmod 750 /etc/redis/
chown -R redis:redis /var/lib/redis
chmod 750 /var/lib/redis

# Limpiar archivos de persistencia antiguos
echo "Limpiando archivos de persistencia antiguos..."
rm -f /var/lib/redis/dump.rdb
rm -f /var/lib/redis/appendonly.aof

# Recargar y reiniciar servicios
systemctl daemon-reload
echo "Iniciando Redis..."
systemctl start redis-server

# Esperar y verificar el inicio (máximo 90 segundos)
echo "Esperando que Redis inicie..."
for i in {1..18}; do
    if systemctl is-active --quiet redis-server; then
        echo "Redis iniciado correctamente"
        break
    fi
    echo "Intentando iniciar Redis... intento $i"
    sleep 5
done

# Verificar estado y logs
echo "Estado del servicio Redis:"
systemctl status redis-server
echo "Últimas líneas del log de Redis:"
tail -n 20 /var/log/redis/redis-server.log || true

# Habilitar inicio automático
systemctl enable redis-server

echo "Instalación de Redis completada. Verificar el estado arriba." 