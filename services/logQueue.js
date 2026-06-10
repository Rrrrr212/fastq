'use strict'

const fs = require('fs')
const path = require('path')
const buildQueue = require('../queue')

const defaultLogPath = path.join(process.cwd(), 'logs', 'app.log')

let errorHandler = noop

const queue = buildQueue(writeLog, 1)

queue.error(function onQueueError (err, task) {
  if (err) {
    errorHandler(err, task)
  }
})

function pushLog (message, filePath) {
  queue.push({
    filePath: filePath || defaultLogPath,
    message
  })
}

function setErrorHandler (handler) {
  errorHandler = typeof handler === 'function' ? handler : noop
}

function writeLog (task, done) {
  try {
    fs.appendFile(task.filePath, `${task.message}\n`, done)
  } catch (err) {
    done(err)
  }
}

function noop () {}

module.exports = {
  defaultLogPath,
  pushLog,
  queue,
  setErrorHandler
}
