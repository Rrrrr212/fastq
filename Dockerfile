FROM node:20-alpine

WORKDIR /app

COPY package.json ./

RUN npm install --omit=dev

COPY queue.js ./
COPY server.js ./

RUN mkdir -p /app/logs

VOLUME ["/app/logs"]

EXPOSE 3000

ENV NODE_ENV=production
ENV LOG_DIR=/app/logs
ENV PORT=3000
ENV CONCURRENCY=4

CMD ["node", "server.js"]