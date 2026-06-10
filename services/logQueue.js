'use strict'

var queue = require('../queue')
var config = require('../config/queueConfig')

function createLogQueue (worker) {
  var q = queue(worker, config.concurrency.default)

  function adjustConcurrency () {
    var pending = q.length()
    if (pending > config.threshold.high && q.concurrency !== config.concurrency.high) {
      q.concurrency = config.concurrency.high
    } else if (pending < config.threshold.low && q.concurrency !== config.concurrency.default) {
      q.concurrency = config.concurrency.default
    }
  }

  var _push = q.push.bind(q)
  q.push = function (value, done) {
    _push(value, function (err, result) {
      if (done) { done(err, result) }
      adjustConcurrency()
    })
    adjustConcurrency()
  }

  return q
}

module.exports = createLogQueue