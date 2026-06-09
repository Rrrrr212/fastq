'use strict'

const fs = require('fs')
const path = require('path')
const fastq = require('../')

const logDir = path.join(__dirname, '..', 'logs')
const logPath = path.join(logDir, 'app.log')

fs.mkdirSync(logDir, { recursive: true })

function writeLog(message, cb) {
  const start = Date.now()
  const line = `[${new Date().toISOString()}] ${message}\n`

  fs.appendFile(logPath, line, (err) => {
    const elapsed = Date.now() - start
    console.log(`log task completed in ${elapsed}ms`)
    cb(err)
  })
}

const queue = fastq(writeLog, 3)

function pushLog(message) {
  queue.push(message, (err) => {
    if (err) {
      console.error('write log error:', err)
    }
  })
}

module.exports = { pushLog }