#!/bin/bash

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar si el servicio systemd está activo
if systemctl is-active --quiet clientfy-orquesta; then
  echo -e "${YELLOW}Deteniendo servicio systemd...${NC}"
  systemctl stop clientfy-orquesta
  echo -e "${GREEN}Servicio detenido${NC}"
  exit 0
fi

# Si no está corriendo como servicio, verificar el archivo PID
if [ -f "server.pid" ]; then
    PID=$(cat server.pid)
    echo -e "${YELLOW}Deteniendo servidor con PID: $PID${NC}"
    kill $PID
    rm server.pid
    echo -e "${GREEN}Servidor detenido${NC}"
else
    echo -e "${RED}No se encontró un servidor en ejecución${NC}"
fi 