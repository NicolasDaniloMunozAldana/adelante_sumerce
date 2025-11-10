#!/bin/bash

# Script para detener los servicios

echo "🛑 Deteniendo servicios..."

# Leer PIDs de los archivos
if [ -f "logs/auth_service.pid" ]; then
    AUTH_PID=$(cat logs/auth_service.pid)
    if ps -p $AUTH_PID > /dev/null; then
        echo "Deteniendo Auth Service (PID: $AUTH_PID)..."
        kill $AUTH_PID
    fi
    rm logs/auth_service.pid
fi

if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null; then
        echo "Deteniendo Frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
    fi
    rm logs/frontend.pid
fi

# Limpiar procesos de Node.js que puedan quedar
pkill -f "node.*auth_service"
pkill -f "node.*indexJWT"

echo "✅ Servicios detenidos"
