'use strict'

var fastqueue = require('./queue')
var Redis = require('ioredis')
var fs = require('fs')
var path = require('path')
var http = require('http')

var REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379'
var LOG_DIR = process.env.LOG_DIR || '/app/logs'
var QUEUE_KEY = 'fastq:pending'
var PROCESSING_KEY = 'fastq:processing'
var CONCURRENCY = parseInt(process.env.CONCURRENCY || '4', 10)
var PORT = parseInt(process.env.PORT || '3000', 10)

var redis = new Redis(REDIS_URL)

fs.mkdirSync(LOG_DIR, { recursive: true })

var queue = fastqueue(worker, CONCURRENCY)

queue.drain = function () {
  console.log('[fastq] all tasks completed')
}

function worker (task, cb) {
  var logFile = path.join(LOG_DIR, task.file || 'app.log')
  var line = task.message + '\n'

  redis.srem(PROCESSING_KEY, JSON.stringify(task), function (err) {
    if (err) console.error('[redis] failed to remove from processing set:', err.message)
  })

  fs.appendFile(logFile, line, function (err) {
    if (err) {
      console.error('[worker] failed to write log:', err.message)
      cb(err)
      return
    }
    console.log('[worker] logged to', task.file || 'app.log', ':', task.message)
    cb(null, { file: task.file, message: task.message })
  })
}

function enqueue (task) {
  var payload = JSON.stringify(task)
  redis.rpush(QUEUE_KEY, payload, function (err) {
    if (err) {
      console.error('[redis] failed to persist task:', err.message)
      return
    }
    redis.sadd(PROCESSING_KEY, payload, function (sErr) {
      if (sErr) console.error('[redis] failed to add to processing set:', sErr.message)
    })
    queue.push(task, function (pushErr, result) {
      if (pushErr) {
        console.error('[fastq] task failed:', pushErr.message)
      }
    })
  })
}

function recoverPendingTasks (callback) {
  redis.smembers(PROCESSING_KEY, function (err, processing) {
    if (err) {
      console.error('[redis] failed to read processing set:', err.message)
      callback(err)
      return
    }

    if (processing && processing.length > 0) {
      console.log('[recover] re-queuing', processing.length, 'processing tasks')
      processing.forEach(function (payload) {
        var task = JSON.parse(payload)
        queue.push(task, function (pushErr) {
          if (pushErr) console.error('[recover] task failed:', pushErr.message)
        })
      })
    }

    redis.llen(QUEUE_KEY, function (lErr, len) {
      if (lErr) {
        console.error('[redis] failed to check queue length:', lErr.message)
        callback(lErr)
        return
      }

      if (len === 0) {
        console.log('[recover] no pending tasks in Redis')
        callback(null)
        return
      }

      console.log('[recover] found', len, 'pending tasks in Redis')
      redis.lrange(QUEUE_KEY, 0, -1, function (lrErr, tasks) {
        if (lrErr) {
          console.error('[redis] failed to read pending tasks:', lrErr.message)
          callback(lrErr)
          return
        }

        tasks.forEach(function (payload) {
          var task = JSON.parse(payload)
          queue.push(task, function (pushErr) {
            if (pushErr) console.error('[recover] task failed:', pushErr.message)
          })
        })

        redis.del(QUEUE_KEY, function (dErr) {
          if (dErr) console.error('[redis] failed to clear queue key:', dErr.message)
          callback(null)
        })
      })
    })
  })
}

var server = http.createServer(function (req, res) {
  if (req.method === 'POST' && req.url === '/log') {
    var body = ''
    req.on('data', function (chunk) { body += chunk })
    req.on('end', function () {
      try {
        var task = JSON.parse(body)
        if (!task.message) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'missing "message" field' }))
          return
        }
        enqueue(task)
        res.writeHead(202, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'queued', message: task.message }))
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'invalid JSON' }))
      }
    })
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      queueLength: queue.length(),
      running: queue.running(),
      idle: queue.idle()
    }))
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'not found' }))
  }
})

redis.ping().then(function () {
  console.log('[redis] connected to', REDIS_URL)
  recoverPendingTasks(function (err) {
    if (err) {
      console.error('[recover] failed to recover tasks, starting anyway')
    }
    server.listen(PORT, function () {
      console.log('[server] listening on port', PORT)
      console.log('[server] concurrency:', CONCURRENCY)
      console.log('[server] log directory:', LOG_DIR)
    })
  })
}).catch(function (err) {
  console.error('[redis] connection failed:', err.message)
  process.exit(1)
})

process.on('SIGTERM', function () {
  console.log('[server] shutting down...')
  server.close(function () {
    redis.quit()
    process.exit(0)
  })
})

process.on('SIGINT', function () {
  console.log('[server] interrupted, shutting down...')
  server.close(function () {
    redis.quit()
    process.exit(0)
  })
})
