'use strict'

const fastq = require('../queue.js').promise

async function logWorker (logEntry) {
  await simulateLogWrite(logEntry)
  return { success: true, timestamp: Date.now() }
}

function simulateLogWrite (logEntry) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, 10)
  })
}

const queue = fastq(logWorker, 2)

queue.error(function (err, task) {
  console.error('Log processing failed:', err.message, 'for task:', task)
})

function pushLog (logEntry) {
  return queue.push(logEntry)
}

function getPendingCount () {
  return queue.length()
}

function getRunningCount () {
  return queue.running()
}

function isIdle () {
  return queue.idle()
}

async function waitForDrain () {
  return queue.drained()
}

module.exports = {
  pushLog,
  getPendingCount,
  getRunningCount,
  isIdle,
  waitForDrain
}
