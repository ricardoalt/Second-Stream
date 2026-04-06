#!/bin/bash
set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para esperar a que un servicio esté disponible
wait_for() {
    local host=$1
    local port=$2
    local service_name=$3
    
    echo -e "${YELLOW}⏳ Esperando a que $service_name ($host:$port) esté disponible...${NC}"
    
    local max_attempts=30
    local attempt=0
    
    until nc -z -v -w30 "$host" "$port" > /dev/null 2>&1; do
        attempt=$((attempt + 1))
        
        if [ $attempt -ge $max_attempts ]; then
            echo -e "❌ Error: $service_name no está disponible después de $max_attempts intentos"
            exit 1
        fi
        
        echo "⏳ Reintentando conexión a $service_name en 2 segundos... (intento $attempt/$max_attempts)"
        sleep 2
    done
    
    echo -e "${GREEN}✅ $service_name está disponible!${NC}"
}

validate_aws_shared_config() {
    if [ "${AWS_SDK_LOAD_CONFIG:-0}" != "1" ]; then
        return 0
    fi

    local aws_dir="${HOME}/.aws"

    echo -e "\n${YELLOW}🔐 Verificando configuración AWS compartida...${NC}"
    echo "AWS_PROFILE=${AWS_PROFILE:-default}"
    echo "AWS_REGION=${AWS_REGION:-unset}"

    if [ ! -d "$aws_dir" ]; then
        echo "❌ Error: no existe $aws_dir dentro del contenedor"
        echo "   Verificá el mount de \\${HOME}/.aws en docker-compose.override.yml"
        exit 1
    fi

    if [ ! -f "$aws_dir/config" ] && [ ! -f "$aws_dir/credentials" ]; then
        echo "❌ Error: $aws_dir no contiene config ni credentials"
        echo "   Configurá AWS CLI en el host con 'aws configure' o 'aws configure sso'"
        exit 1
    fi

    echo -e "${GREEN}✅ Configuración AWS compartida detectada${NC}"
}

# Banner
echo "=================================="
echo "🌊 H2O Allegiant Backend"
echo "=================================="

# Verificar variables de entorno críticas
echo -e "\n${YELLOW}🔍 Verificando configuración...${NC}"
echo "POSTGRES_SERVER=${POSTGRES_SERVER:-postgres}"
echo "POSTGRES_PORT=${POSTGRES_PORT:-5432}"
echo "POSTGRES_DB=${POSTGRES_DB}"
echo "REDIS_HOST=${REDIS_HOST:-redis}"
echo "REDIS_PORT=${REDIS_PORT:-6379}"
echo "ENVIRONMENT=${ENVIRONMENT}"

# Verificar AWS shared config cuando el servicio depende del SDK config chain
validate_aws_shared_config

# Esperar por PostgreSQL
wait_for "${POSTGRES_SERVER:-postgres}" "${POSTGRES_PORT:-5432}" "PostgreSQL"

# Esperar por Redis
wait_for "${REDIS_HOST:-redis}" "${REDIS_PORT:-6379}" "Redis"

echo -e "\n${GREEN}✅ Todos los servicios están listos${NC}"

# Ejecutar migraciones en desarrollo si está habilitado
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo -e "\n${YELLOW}🔄 Ejecutando migraciones de base de datos...${NC}"
    alembic upgrade head || echo "⚠️  Migraciones fallaron o no hay cambios"
fi

# Iniciar aplicación
echo -e "\n${GREEN}🚀 Iniciando H2O Allegiant Backend...${NC}"
echo "Comando: $@"
echo "=================================="

exec "$@"
