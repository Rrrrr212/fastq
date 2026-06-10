'use strict'

var fastqueue = require('../queue')

var queue = fastqueue(worker, 1)

queue.error(function (err, task) {
  console.error('[logQueue] Error processing log task:', err.message)
  console.error('[logQueue] Failed task:', JSON.stringify(task))
})

function worker (logEntry, cb) {
  if (!logEntry || !logEntry.message) {
    cb(new Error('Invalid log entry: missing message field'))
    return
  }
  console.log('[' + logEntry.level + '] ' + logEntry.message)
  cb(null, true)
}

queue.drain = function () {
  console.log('[logQueue] All log entries have been processed')
}

module.exports = queue
