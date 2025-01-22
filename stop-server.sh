#!/bin/bash

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Desactivar y eliminar el servicio systemd si existe
if systemctl list-unit-files | grep -q clientfy-orquesta; then
    echo -e "${YELLOW}Eliminando servicio systemd...${NC}"
    systemctl stop clientfy-orquesta
    systemctl disable clientfy-orquesta
    rm /etc/systemd/system/clientfy-orquesta.service
    systemctl daemon-reload
    echo -e "${GREEN}Servicio systemd eliminado${NC}"
fi

# Detener screen si está ejecutándose
if screen -list | grep -q "clientfy"; then
    echo -e "${YELLOW}Deteniendo screen clientfy...${NC}"
    screen -S clientfy -X quit
    echo -e "${GREEN}Screen detenido${NC}"
fi

# Eliminar archivo PID si existe
if [ -f "server.pid" ]; then
    rm server.pid
fi

echo -e "${GREEN}Servidor detenido completamente${NC}" 