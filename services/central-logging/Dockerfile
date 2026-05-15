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

COPY --from=builder /app/node_modules ./node_modules
COPY . .

RUN mkdir -p /app/data

EXPOSE 3026

CMD ["pm2-runtime", "ecosystem.config.js"]
