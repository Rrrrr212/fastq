'use strict'

const fs = require('fs')
const path = require('path')
const fastq = require('../queue')

function createLogQueue (logFilePath, options) {
  options = options || {}
  const concurrency = options.concurrency || 1
  const errorHandler = options.errorHandler || null

  const queue = fastq(function (message, cb) {
    const line = `[${new Date().toISOString()}] ${message}\n`
    fs.appendFile(logFilePath, line, 'utf8', cb)
  }, concurrency)

  if (typeof errorHandler === 'function') {
    queue.error(errorHandler)
  }

  function pushLog (message) {
    queue.push(message)
  }

  function onDrain (handler) {
    queue.drain = handler
  }

  return {
    pushLog,
    onDrain,
    queue
  }
}

module.exports = createLogQueue
