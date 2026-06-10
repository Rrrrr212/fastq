'use strict'

var fastqueue = require('../')
var fs = require('fs')

function createLogQueue (filePath, opts) {
  if (!opts) opts = {}
  var concurrency = opts.concurrency >= 1 ? opts.concurrency : 1

  var queue = fastqueue(function worker (logEntry, cb) {
    var line = typeof logEntry === 'object'
      ? JSON.stringify(logEntry) + '\n'
      : String(logEntry) + '\n'

    try {
      fs.appendFile(filePath, line, function (err) {
        cb(err || null)
      })
    } catch (syncErr) {
      cb(syncErr)
    }
  }, concurrency)

  return {
    pushLog: function pushLog (logEntry, done) {
      queue.push(logEntry, done)
    },

    drain: function drain (cb) {
      queue.drain = cb
    },

    error: function error (handler) {
      queue.error(handler)
    },

    get queue () {
      return queue
    }
  }
}

module.exports = createLogQueue