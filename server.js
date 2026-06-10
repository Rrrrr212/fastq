'use strict'

const fastq = require('./')
const Redis = require('ioredis')
const fs = require('fs')
const path = require('path')

const LOG_DIR = process.env.LOG_DIR || './logs'
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379'
const PORT = process.env.PORT || 3000
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '4', 10)

const REDIS_PENDING_KEY = 'fastq:pending'

const redis = new Redis(REDIS_URL)

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

function writeLogEntry(task, cb) {
  const logFile = path.join(LOG_DIR, `app-${new Date().toISOString().slice(0, 10)}.log`)
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level: task.level || 'info',
    message: task.message,
    meta: task.meta || {}
  }) + '\n'

  fs.appendFile(logFile, line, (err) => {
    if (err) return cb(err)
    redis.lrem(REDIS_PENDING_KEY, 0, JSON.stringify(task), (redisErr) => {
      cb(redisErr)
    })
  })
}

const queue = fastq(writeLogEntry, CONCURRENCY)

function enqueue(task) {
  return new Promise((resolve, reject) => {
    const taskStr = JSON.stringify(task)
    redis.rpush(REDIS_PENDING_KEY, taskStr, (err) => {
      if (err) return reject(err)
      queue.push(task, (workerErr, result) => {
        if (workerErr) return reject(workerErr)
        resolve(result)
      })
    })
  })
}

function recoverPendingTasks() {
  return new Promise((resolve, reject) => {
    redis.lrange(REDIS_PENDING_KEY, 0, -1, (err, items) => {
      if (err) return reject(err)

      if (!items || items.length === 0) {
        console.log('No pending tasks to recover')
        return resolve(0)
      }

      let count = 0
      items.forEach((item) => {
        try {
          const task = JSON.parse(item)
          queue.push(task, (workerErr) => {
            if (workerErr) {
              console.error('Failed to process recovered task:', workerErr.message)
            }
          })
          count++
        } catch (parseErr) {
          console.error('Failed to parse pending task:', parseErr.message)
          redis.lrem(REDIS_PENDING_KEY, 0, item)
        }
      })

      console.log(`Recovered ${count} pending tasks from Redis`)
      resolve(count)
    })
  })
}

const http = require('http')

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      queueLength: queue.length(),
      running: queue.running(),
      idle: queue.idle()
    }))
    return
  }

  if (req.method === 'POST' && req.url === '/logs') {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', async () => {
      try {
        const task = JSON.parse(body)
        await enqueue(task)
        res.writeHead(202, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ accepted: true }))
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'not found' }))
})

recoverPendingTasks()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Log service listening on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to recover pending tasks:', err)
    process.exit(1)
  })

process.on('SIGTERM', () => {
  console.log('SIGTERM received, draining queue...')
  queue.killAndDrain()
  server.close(() => {
    redis.quit()
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, draining queue...')
  queue.killAndDrain()
  server.close(() => {
    redis.quit()
    process.exit(0)
  })
})