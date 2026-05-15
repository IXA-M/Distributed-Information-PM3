FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src
COPY openapi.yaml ./

EXPOSE 3002

CMD ["npm", "start"]
