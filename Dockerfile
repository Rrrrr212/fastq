FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN mkdir -p /usr/src/app/logs

ENV NODE_ENV=production \
    PORT=3000 \
    LOG_DIR=/usr/src/app/logs \
    LOG_FILE=service.log \
    REDIS_URL=redis://redis:6379 \
    REDIS_QUEUE_KEY=fastq:logs:pending \
    REDIS_PROCESSING_KEY=fastq:logs:processing \
    QUEUE_CONCURRENCY=4 \
    QUEUE_PREFETCH=4

EXPOSE 3000

CMD ["npm", "run", "start:log-service"]
