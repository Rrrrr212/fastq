'use strict'

const fastq = require('../queue')

const logQueue = fastq.promise(async function (task) {
  console.log(`[${new Date().toISOString()}] [${task.level}] ${task.message}`)
  return task
}, 1)

function pushLog (level, message) {
  return logQueue.push({ level, message, timestamp: Date.now() })
}

module.exports = {
  pushLog,
  queue: logQueue
}
