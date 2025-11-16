FROM node:18-alpine

# Instalar dependencias para Puppeteer (generación de PDFs)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    wget \
    dumb-init

# Configurar Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/lib/chromium/

# Variables de entorno para optimizar Chrome en Docker
ENV CHROME_DEVEL_SANDBOX=0
ENV NODE_OPTIONS="--max-old-space-size=2048"

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias como root
RUN npm ci --only=production

# Copiar el resto de la aplicación
COPY . .

# Crear directorio de logs y asignar permisos
RUN mkdir -p /app/logs && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app

# Cambiar al usuario no privilegiado
USER nodejs

EXPOSE 3002

# Health check básico (el servicio es un consumer de Kafka, no tiene endpoint HTTP)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD pgrep -f "node src/index.js" || exit 1

# Usar dumb-init para manejar señales correctamente
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]