#!/bin/bash

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Tamaño del swap en GB (modificar según necesidad)
SWAP_SIZE=4

echo -e "${YELLOW}Configurando ${SWAP_SIZE}GB de memoria swap...${NC}"

# Verificar si ya existe swap
if free | grep -q "Swap"; then
    echo "Desactivando swap existente..."
    sudo swapoff -a
    sudo rm -f /swapfile
fi

# Crear archivo swap
echo "Creando archivo swap..."
sudo fallocate -l ${SWAP_SIZE}G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Hacer el swap permanente
if ! grep -q "/swapfile" /etc/fstab; then
    echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
fi

# Configurar parámetros del kernel para optimizar el swap
echo "Configurando parámetros del kernel..."
sudo sysctl vm.swappiness=10
sudo sysctl vm.vfs_cache_pressure=50

# Hacer los parámetros permanentes
if ! grep -q "vm.swappiness" /etc/sysctl.conf; then
    echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
    echo "vm.vfs_cache_pressure=50" | sudo tee -a /etc/sysctl.conf
fi

echo -e "${GREEN}Configuración de swap completada${NC}"
echo "Memoria swap actual:"
free -h 