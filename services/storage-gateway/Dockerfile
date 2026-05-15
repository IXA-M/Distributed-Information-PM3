FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY services/storage-gateway/package*.json ./services/storage-gateway/
COPY services/replication-planner/package*.json ./services/replication-planner/
RUN npm install --omit=dev

COPY shared ./shared
COPY services/storage-gateway ./services/storage-gateway

RUN mkdir -p /data/objects
EXPOSE 3000

CMD ["npx", "pm2-runtime", "services/storage-gateway/ecosystem.config.cjs"]
