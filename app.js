'use strict'

const http = require('http')
const fs = require('fs')
const path = require('path')
const fastq = require('./queue')
const { createClient } = require('redis')

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const REDIS_KEY = process.env.REDIS_KEY || 'fastq:log:queue'
const PORT = process.env.PORT || 3000
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, 'logs')
const LOG_FILE = path.join(LOG_DIR, 'app.log')
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '5', 10)

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

let redis

async function writeLog (task) {
  const line = JSON.stringify({
    id: task.id,
    timestamp: task.timestamp,
    level: task.level || 'info',
    message: task.message,
    meta: task.meta || {}
  }) + '\n'
  await fs.promises.appendFile(LOG_FILE, line, 'utf8')
}

async function worker (task, cb) {
  try {
    await writeLog(task)
    await redis.lRem(REDIS_KEY, 1, JSON.stringify(task))
    cb(null)
  } catch (err) {
    console.error('Failed to process log task:', err)
    cb(err)
  }
}

const queue = fastq(worker, CONCURRENCY)

queue.error((err, task) => {
  console.error('Task failed:', err, task)
})

queue.drain = () => {
  console.log('Queue drained, all pending log tasks processed.')
}

async function restoreFromRedis () {
  try {
    const items = await redis.lRange(REDIS_KEY, 0, -1)
    if (items.length > 0) {
      console.log(`Restoring ${items.length} pending log tasks from Redis...`)
      for (const raw of items) {
        try {
          const task = JSON.parse(raw)
          queue.push(task)
        } catch (e) {
          console.error('Bad task payload in redis:', raw)
        }
      }
    } else {
      console.log('No pending tasks in Redis. Starting fresh.')
    }
  } catch (err) {
    console.error('Failed to restore from Redis:', err)
  }
}

async function enqueue (task) {
  const payload = JSON.stringify(task)
  await redis.rPush(REDIS_KEY, payload)
  queue.push(task)
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/log') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const data = JSON.parse(body)
        if (!data.message) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'message is required' }))
          return
        }
        const task = {
          id: (data.id || Date.now() + '-' + Math.random().toString(36).slice(2, 8)),
          timestamp: data.timestamp || new Date().toISOString(),
          level: data.level || 'info',
          message: data.message,
          meta: data.meta || {}
        }
        await enqueue(task)
        res.statusCode = 202
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true, id: task.id, pending: queue.length() }))
      } catch (err) {
        console.error(err)
        res.statusCode = 500
        res.end(JSON.stringify({ error: 'failed to enqueue' }))
      }
    })
  } else if (req.method === 'GET' && req.url === '/status') {
    try {
      const pending = await redis.lLen(REDIS_KEY)
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        running: queue.running(),
        inMemory: queue.length(),
        persisted: pending,
        concurrency: queue.concurrency
      }))
    } catch (err) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: err.message }))
    }
  } else {
    res.statusCode = 404
    res.end('Not Found')
  }
})

async function start () {
  redis = createClient({ url: REDIS_URL })
  redis.on('error', err => console.error('Redis Client Error', err))
  await redis.connect()
  console.log('Connected to Redis at', REDIS_URL)

  await restoreFromRedis()

  server.listen(PORT, () => {
    console.log(`fastq log service listening on port ${PORT}`)
    console.log(`Logs dir: ${LOG_DIR}`)
  })
}

start().catch(err => {
  console.error('Startup failed:', err)
  process.exit(1)
})
