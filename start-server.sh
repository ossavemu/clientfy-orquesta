#!/bin/bash

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar si screen está instalado
if ! command -v screen &> /dev/null; then
    echo -e "${YELLOW}Instalando screen...${NC}"
    apt-get update && apt-get install -y screen
fi

# Verificar si ya está corriendo
if screen -list | grep -q "clientfy"; then
    echo -e "${RED}El servidor ya está corriendo en screen${NC}"
    echo -e "Para ver el screen: ${GREEN}screen -r clientfy${NC}"
    exit 1
fi

# Configurar PATH para bun
export PATH="$HOME/.bun/bin:$PATH"
export BUN_INSTALL="$HOME/.bun"

# Iniciar el servidor en un screen
echo -e "${YELLOW}Iniciando servidor en screen...${NC}"
screen -dmS clientfy bash -c "bun run src/app.ts 2>&1 | tee server.log"

# Esperar un momento para asegurarse que el screen se inició
sleep 2

# Verificar si el screen se inició correctamente
if screen -list | grep -q "clientfy"; then
    echo -e "${GREEN}Servidor iniciado exitosamente en screen${NC}"
    echo -e "Para ver los logs: ${YELLOW}tail -f server.log${NC}"
    echo -e "Para conectar al screen: ${YELLOW}screen -r clientfy${NC}"
    echo -e "Para desconectar del screen (manteniéndolo activo): ${YELLOW}Ctrl+A+D${NC}"
else
    echo -e "${RED}Error al iniciar el servidor${NC}"
fi 