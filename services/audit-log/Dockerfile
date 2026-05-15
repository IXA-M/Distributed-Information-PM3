# ── Build Stage ───────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --production

# ── Production Stage ──────────────────────────────────────────
FROM node:20-alpine

# Install PM2 globally
RUN npm install -g pm2

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3025

# Use PM2 to run the service (handles restarts, logs)
CMD ["pm2-runtime", "ecosystem.config.js"]
