FROM node:18-alpine

# Instalar wget y dumb-init
RUN apk add --no-cache wget dumb-init

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

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Usar dumb-init para manejar señales correctamente
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]