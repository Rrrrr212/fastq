'use strict'

process.on('uncaughtException', function (err) {
  console.log('uncaughtException:', err.message)
  process.exit(1)
})

var fastq = require('./queue.js')

var handled = []
var cbErrors = []
var queue = fastq(1, function worker (task, cb) {
  if (task === 42) {
    throw new Error('sync boom')
  }
  cb(null, task * 2)
})

queue.error(function (err, task) {
  handled.push({ err: err.message, task: task })
})

queue.push(42, function (err) {
  if (err) cbErrors.push(err.message)
})
queue.push(5, function (err, res) {
  console.log('task 5 result:', res)
})
queue.unshift(99, function (err) {
  if (err) cbErrors.push(err.message)
})

setTimeout(function () {
  console.log('handled errors:', handled)
  console.log('callback errors:', cbErrors)
  console.log('idle:', queue.idle())
  console.log('process alive - OK')
}, 50)
