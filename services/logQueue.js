'use strict'

const fs = require('fs')
const path = require('path')
const fastq = require('..')

const logFilePath = path.join(__dirname, '..', 'logs', 'app.log')
const queue = fastq(writeLog, 3)

function writeLog (task, cb) {
  const line = String(task.message) + '\n'

  fs.mkdir(path.dirname(logFilePath), { recursive: true }, function (mkdirErr) {
    if (mkdirErr) {
      cb(mkdirErr)
      return
    }

    fs.appendFile(logFilePath, line, function (appendErr) {
      if (appendErr) {
        cb(appendErr)
        return
      }

      cb(null, Date.now() - task.startedAt)
    })
  })
}

function pushLog (message) {
  const task = {
    message,
    startedAt: Date.now()
  }

  queue.push(task, function (err, duration) {
    if (err) {
      console.error('log task failed', err)
      return
    }

    console.log('log task completed in %dms', duration)
  })
}

module.exports = {
  pushLog,
  queue,
  writeLog
}
