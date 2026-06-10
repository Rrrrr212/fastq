FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npm install ioredis

COPY queue.js ./
COPY server.js ./

RUN mkdir -p /app/logs

ENV NODE_ENV=production
ENV PORT=3000
ENV REDIS_URL=redis://redis:6379
ENV LOG_DIR=/app/logs
ENV CONCURRENCY=4

EXPOSE 3000

CMD ["node", "server.js"]
