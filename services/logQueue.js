'use strict'

const fastq = require('../')

const CONCURRENCY = 4

const queue = fastq.promise(worker, CONCURRENCY)

async function worker (entry) {
  if (!entry || !entry.level || !entry.message) {
    throw new Error('Invalid log entry: level and message are required')
  }

  const timestamp = entry.timestamp || new Date().toISOString()
  const line = `${timestamp} [${entry.level.toUpperCase()}] ${entry.message}`

  console.log(line)
  return { ok: true, timestamp }
}

function pushLog (entry) {
  return queue.push(entry)
}

function drained () {
  return queue.drained()
}

function idle () {
  return queue.idle()
}

function length () {
  return queue.length()
}

function pause () {
  queue.pause()
}

function resume () {
  queue.resume()
}

queue.error((err, task) => {
  console.error('Log worker error:', err.message, 'task:', task)
})

module.exports = {
  pushLog,
  drained,
  idle,
  length,
  pause,
  resume
}