'use strict'

var queue = require('../queue')

var concurrency = 4

var logQueue = queue(worker, concurrency)

function worker (logEntry, cb) {
  process.stdout.write(JSON.stringify(logEntry) + '\n', cb)
}

logQueue.error(function (err, logEntry) {
  console.error('[logQueue] worker error:', err && err.message, 'logEntry:', logEntry)
})

module.exports = logQueue