# Multi-stage build per backend ottimizzato
FROM node:18-alpine AS base

# Installa dipendenze per moduli nativi
RUN apk add --no-cache python3 make g++ curl postgresql-client

WORKDIR /app

# Copia file di configurazione
COPY package*.json ./
COPY prisma/ ./prisma/

# Stage di sviluppo
FROM base AS development
RUN npm ci
COPY . .
RUN npx prisma generate
EXPOSE 4001 4002 4003
CMD ["npm", "start"]

# Stage di staging
FROM base AS staging
RUN npm ci --only=production
COPY . .
RUN npx prisma generate

# Crea utente non-root
RUN addgroup -g 1001 -S backend-user
RUN adduser -S backend-user -u 1001 -G backend-user

# Cambia ownership
RUN chown -R backend-user:backend-user /app

USER backend-user

EXPOSE 4001 4002 4003
CMD ["npm", "start"]

# Stage di produzione
FROM base AS production

# Installa solo dipendenze di produzione
RUN npm ci --only=production && npm cache clean --force

# Copia applicazione
COPY . .

# Genera client Prisma
RUN npx prisma generate

# Crea utente non-root per sicurezza
RUN addgroup -g 1001 -S backend-user
RUN adduser -S backend-user -u 1001 -G backend-user

# Crea directory per logs e uploads
RUN mkdir -p /app/logs /app/uploads /app/backups
RUN chown -R backend-user:backend-user /app

# Health check per tutti i server
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:4003/healthz && \
      curl -f http://localhost:4001/health && \
      curl -f http://localhost:4002/health || exit 1

# Esponi porte dei tre server
EXPOSE 4001 4002 4003

# Usa utente non-root
USER backend-user

# Script di avvio che gestisce tutti i server
CMD ["npm", "start"]