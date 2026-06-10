FROM node:20-alpine

ENV NODE_ENV=production \
    PORT=3000 \
    REDIS_URL=redis://redis:6379 \
    LOG_DIR=/app/logs \
    CONCURRENCY=5

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production || npm install --omit=dev

COPY . .

RUN mkdir -p /app/logs

EXPOSE 3000

CMD ["node", "app.js"]
