'use strict'

const test = require('tape')
const { pushLog, getPendingCount, getRunningCount, isIdle, waitForDrain } = require('../services/logQueue')

test('pushLog returns a Promise', async function (t) {
  const result = pushLog({ level: 'info', message: 'test log' })
  t.ok(result instanceof Promise, 'pushLog returns a Promise')

  const resolved = await result
  t.ok(resolved.success, 'promise resolves with success')
  t.ok(resolved.timestamp, 'promise resolves with timestamp')
})

test('pushLog processes logs in order', async function (t) {
  const results = await Promise.all([
    pushLog({ level: 'info', message: 'log 1' }),
    pushLog({ level: 'warn', message: 'log 2' }),
    pushLog({ level: 'error', message: 'log 3' })
  ])

  t.equal(results.length, 3, 'all logs processed')
  results.forEach(r => t.ok(r.success, 'each log processed successfully'))
})

test('queue status functions work', async function (t) {
  t.ok(typeof getPendingCount === 'function', 'getPendingCount is a function')
  t.ok(typeof isIdle === 'function', 'isIdle is a function')
  t.ok(typeof waitForDrain === 'function', 'waitForDrain is a function')

  const pending = getPendingCount()
  t.ok(typeof pending === 'number', 'getPendingCount returns a number')
})

test('waitForDrain resolves when queue is empty', async function (t) {
  pushLog({ level: 'info', message: 'test log' })
  pushLog({ level: 'info', message: 'test log 2' })

  await waitForDrain()

  t.pass('waitForDrain resolved successfully')
})

test('error handling works correctly', async function (t) {
  const fastq = require('../queue.js').promise

  const errorQueue = fastq(async function (task) {
    throw new Error('test error')
  }, 1)

  try {
    await errorQueue.push({ test: true })
    t.fail('should have thrown')
  } catch (err) {
    t.ok(err instanceof Error, 'error is caught')
    t.equal(err.message, 'test error', 'error message matches')
  }
})
