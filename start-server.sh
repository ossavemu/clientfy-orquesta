#!/bin/bash

# Verificar si ya está corriendo
if [ -f "server.pid" ]; then
    echo "El servidor ya está corriendo. PID: $(cat server.pid)"
    echo "Para reiniciar, ejecuta: ./stop-server.sh y luego ./start-server.sh"
    exit 1
fi

# Iniciar el servidor en segundo plano
echo "Iniciando servidor..."
export PATH="$HOME/.bun/bin:$PATH"
export BUN_INSTALL="$HOME/.bun"
$HOME/.bun/bin/bun run src/app.ts > server.log 2>&1 &

# Guardar el PID
echo $! > server.pid
echo "Servidor iniciado con PID: $!"
echo "Logs disponibles en: server.log" 