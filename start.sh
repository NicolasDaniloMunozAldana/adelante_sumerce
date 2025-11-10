#!/bin/bash

# Script para iniciar ambos servicios en modo desarrollo

echo "🚀 Iniciando Adelante Sumercé con JWT Auth Service"
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -d "auth_service" ] || [ ! -d "adelante_sumerce" ]; then
    echo "❌ Error: Este script debe ejecutarse desde el directorio raíz del proyecto"
    exit 1
fi

# Función para verificar si un puerto está en uso
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Puerto $1 ya está en uso"
        return 1
    fi
    return 0
}

# Verificar puertos
echo "🔍 Verificando puertos..."
check_port 3001
AUTH_PORT_OK=$?
check_port 3030
FRONTEND_PORT_OK=$?

if [ $AUTH_PORT_OK -ne 0 ] || [ $FRONTEND_PORT_OK -ne 0 ]; then
    echo ""
    echo "❌ Por favor, libera los puertos antes de continuar"
    exit 1
fi

echo -e "${GREEN}✅ Puertos disponibles${NC}"
echo ""

# Verificar instalación de dependencias
echo "📦 Verificando dependencias..."

if [ ! -d "auth_service/node_modules" ]; then
    echo -e "${YELLOW}Instalando dependencias de auth_service...${NC}"
    cd auth_service && npm install && cd ..
fi

if [ ! -d "adelante_sumerce/node_modules" ]; then
    echo -e "${YELLOW}Instalando dependencias de adelante_sumerce...${NC}"
    cd adelante_sumerce && npm install && cd ..
fi

echo -e "${GREEN}✅ Dependencias listas${NC}"
echo ""

# Verificar archivos .env
echo "⚙️  Verificando configuración..."

if [ ! -f "auth_service/.env" ]; then
    echo -e "${YELLOW}⚠️  No existe auth_service/.env, copiando desde .env.example${NC}"
    cp auth_service/.env.example auth_service/.env
    echo "📝 Por favor, configura auth_service/.env con tus credenciales"
fi

if [ ! -f "adelante_sumerce/.env" ]; then
    if [ -f "adelante_sumerce/.env.jwt" ]; then
        echo -e "${YELLOW}⚠️  No existe adelante_sumerce/.env, copiando desde .env.jwt${NC}"
        cp adelante_sumerce/.env.jwt adelante_sumerce/.env
    fi
    echo "📝 Por favor, configura adelante_sumerce/.env con tus credenciales"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}   Iniciando servicios...${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Crear directorio para logs si no existe
mkdir -p logs

# Iniciar Auth Service en background
echo -e "${GREEN}🔐 Iniciando Auth Service (puerto 3001)...${NC}"
cd auth_service
npm run dev > ../logs/auth_service.log 2>&1 &
AUTH_PID=$!
cd ..
echo "   PID: $AUTH_PID"
echo ""

# Esperar a que el auth service esté listo
echo "⏳ Esperando a que Auth Service esté listo..."
sleep 5

# Verificar que el auth service esté corriendo
if ! ps -p $AUTH_PID > /dev/null; then
    echo -e "${YELLOW}❌ Auth Service no pudo iniciar. Revisa logs/auth_service.log${NC}"
    exit 1
fi

# Iniciar Frontend en background
echo -e "${GREEN}🌐 Iniciando Frontend (puerto 3030)...${NC}"
cd adelante_sumerce
npm run dev:jwt > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo "   PID: $FRONTEND_PID"
echo ""

# Esperar a que el frontend esté listo
sleep 3

# Verificar que el frontend esté corriendo
if ! ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${YELLOW}❌ Frontend no pudo iniciar. Revisa logs/frontend.log${NC}"
    kill $AUTH_PID
    exit 1
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ Servicios iniciados exitosamente${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}🔐 Auth Service:${NC}   http://localhost:3001"
echo -e "${BLUE}🌐 Frontend:${NC}       http://localhost:3030"
echo ""
echo -e "${YELLOW}📋 Logs:${NC}"
echo "   Auth Service: logs/auth_service.log"
echo "   Frontend: logs/frontend.log"
echo ""
echo -e "${YELLOW}⚠️  Para detener los servicios:${NC}"
echo "   kill $AUTH_PID $FRONTEND_PID"
echo "   o ejecuta: ./stop.sh"
echo ""

# Guardar PIDs para poder detenerlos después
echo "$AUTH_PID" > logs/auth_service.pid
echo "$FRONTEND_PID" > logs/frontend.pid

# Seguir los logs
echo -e "${BLUE}📊 Mostrando logs (Ctrl+C para salir)...${NC}"
echo ""
tail -f logs/auth_service.log logs/frontend.log
