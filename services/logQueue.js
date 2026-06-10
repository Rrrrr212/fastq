'use strict'

const fs = require('fs')
const path = require('path')
const fastq = require('../queue')

class LogQueue {
  constructor(logFilePath, concurrency = 1) {
    this.logFilePath = logFilePath
    this.errorHandler = null
    this.queue = fastq.promise(this._writeLog.bind(this), concurrency)
  }

  async _writeLog(logEntry) {
    const dir = path.dirname(this.logFilePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    return new Promise((resolve, reject) => {
      fs.appendFile(this.logFilePath, logEntry + '\n', (err) => {
        if (err) {
          reject(err)
        } else {
          resolve(logEntry)
        }
      })
    })
  }

  pushLog(logEntry) {
    return this.queue.push(logEntry)
  }

  onError(handler) {
    this.errorHandler = handler
    this.queue.error((err, task) => {
      if (this.errorHandler) {
        this.errorHandler(err, task)
      }
    })
  }

  onDrain(handler) {
    this.queue.drain = handler
  }

  async drained() {
    return this.queue.drained()
  }

  running() {
    return this.queue.running()
  }

  idle() {
    return this.queue.idle()
  }

  length() {
    return this.queue.length()
  }
}

module.exports = LogQueue
