#!/bin/bash

if [ -f "server.pid" ]; then
    PID=$(cat server.pid)
    echo "Deteniendo servidor con PID: $PID"
    kill $PID
    rm server.pid
    echo "Servidor detenido"
else
    echo "No se encontró un servidor en ejecución"
fi 