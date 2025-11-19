FROM node:18-alpine

# Instalar dependencias del sistema para Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

# Configurar Puppeteer para usar el chromium instalado
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias como root
RUN npm install --omit=dev

# Copiar el resto de la aplicación
COPY . .

# Crear usuario no privilegiado y cambiar permisos
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app

# Cambiar al usuario no privilegiado
USER nodejs

EXPOSE 3030

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3030/ || exit 1

# Usar dumb-init para manejar señales correctamente
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]