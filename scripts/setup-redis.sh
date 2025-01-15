#!/bin/bash

# Actualizar el sistema
apt-get update
apt-get upgrade -y

# Instalar Redis
apt-get install redis-server -y

# Hacer backup del archivo de configuración original
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Configurar Redis
cat > /etc/redis/redis.conf << EOF
# Red
bind 127.0.0.1
port 6379
protected-mode yes
requirepass ${REDIS_PASSWORD}

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
EOF

# Configurar systemd para Redis
cat > /etc/systemd/system/redis.service << EOF
[Unit]
Description=Redis In-Memory Data Store
After=network.target

[Service]
User=redis
Group=redis
ExecStart=/usr/bin/redis-server /etc/redis/redis.conf
ExecStop=/usr/bin/redis-cli shutdown
Restart=always
Type=notify
RuntimeDirectory=redis
RuntimeDirectoryMode=0755

[Install]
WantedBy=multi-user.target
EOF

# Crear directorio de datos si no existe
mkdir -p /var/lib/redis
chown redis:redis /var/lib/redis
chmod 770 /var/lib/redis

# Reiniciar Redis con la nueva configuración
systemctl daemon-reload
systemctl restart redis
systemctl enable redis

# Verificar estado
systemctl status redis

echo "Instalación de Redis completada. Verificar el estado arriba." 