'use strict'

var fastqueue = require('../queue')
var config = require('../config/queueConfig')

var queue = fastqueue(logWorker, config.baseConcurrency)
var currentConcurrency = config.baseConcurrency

queue.drain = adjustConcurrency
queue.saturated = adjustConcurrency

var originalPush = queue.push
queue.push = function wrappedPush (value, done) {
  var result = originalPush.call(queue, value, done)
  adjustConcurrency()
  return result
}

var originalUnshift = queue.unshift
queue.unshift = function wrappedUnshift (value, done) {
  var result = originalUnshift.call(queue, value, done)
  adjustConcurrency()
  return result
}

function adjustConcurrency () {
  var pending = queue.length()

  if (pending > config.scaleUpThreshold && currentConcurrency !== config.highConcurrency) {
    currentConcurrency = config.highConcurrency
    queue.concurrency = config.highConcurrency
  } else if (pending < config.scaleDownThreshold && currentConcurrency !== config.baseConcurrency) {
    currentConcurrency = config.baseConcurrency
    queue.concurrency = config.baseConcurrency
  }
}

function logWorker (task, cb) {
  cb(null, task)
}

module.exports = queue
