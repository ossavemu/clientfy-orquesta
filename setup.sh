#!/bin/bash

# Instalar dependencias
echo "Instalando dependencias..."
pnpm install

# Dar permisos de ejecución a los scripts
chmod +x start-server.sh stop-server.sh

echo "Configuración completada"
echo "Para iniciar el servidor ejecuta: ./start-server.sh" 