'use strict'

var fastqueue = require('../queue')
var config = require('../config/queueConfig')

var queue = fastqueue(logWorker, config.baseConcurrency)

var scaledUp = false

function logWorker (task, cb) {
  cb(null, task)
}

function adjustConcurrency () {
  var pending = queue.length()

  if (!scaledUp && pending > config.scaleUpThreshold) {
    queue.concurrency = config.highConcurrency
    scaledUp = true
  } else if (scaledUp && pending < config.scaleDownThreshold) {
    queue.concurrency = config.baseConcurrency
    scaledUp = false
  }
}

var originalPush = queue.push
queue.push = function pushWithAdjust (value, done) {
  originalPush.call(queue, value, done)
  adjustConcurrency()
}

var originalUnshift = queue.unshift
queue.unshift = function unshiftWithAdjust (value, done) {
  originalUnshift.call(queue, value, done)
  adjustConcurrency()
}

var originalDrain = queue.drain
queue.drain = function drainWithAdjust () {
  if (typeof originalDrain === 'function') originalDrain()
  adjustConcurrency()
}

module.exports = queue
