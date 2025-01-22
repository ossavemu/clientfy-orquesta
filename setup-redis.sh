#!/bin/bash

# Actualizar el sistema
apt-get update
apt-get upgrade -y

# Instalar Redis
apt-get install redis-server -y

# Detener el servicio Redis existente
systemctl stop redis-server

# Hacer backup del archivo de configuración original
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Configurar Redis
cat > /etc/redis/redis.conf << EOF
# Red
bind 127.0.0.1
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
save 60 100

# Seguridad
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""

# Notificaciones
notify-keyspace-events KEA
EOF

# No crear un nuevo archivo de servicio, usar el existente
# Eliminar la sección que crea /etc/systemd/system/redis.service

# Asegurar permisos correctos
chown -R redis:redis /etc/redis/
chmod 750 /etc/redis/
chown -R redis:redis /var/lib/redis
chmod 750 /var/lib/redis

# Recargar y reiniciar servicios
systemctl daemon-reload
systemctl restart redis-server
systemctl enable redis-server

# Verificar estado
systemctl status redis-server

echo "Instalación de Redis completada. Verificar el estado arriba." 