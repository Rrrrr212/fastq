'use strict'

const fs = require('fs')
const path = require('path')
const fastq = require('../queue')

const LOG_DIR = path.join(__dirname, '..', 'logs')
const LOG_FILE = path.join(LOG_DIR, 'app.log')

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

function writeLog (message, cb) {
  const content = `[${new Date().toISOString()}] ${message}\n`
  fs.appendFile(LOG_FILE, content, 'utf8', cb)
}

const queue = fastq(writeLog, 3)

function pushLog (message) {
  const start = Date.now()
  queue.push(message, function (err) {
    const elapsed = Date.now() - start
    if (err) {
      console.error(`任务失败: ${err.message}`)
      return
    }
    console.log(`任务完成，耗时: ${elapsed}ms`)
  })
}

module.exports = {
  pushLog
}
