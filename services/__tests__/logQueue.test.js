'use strict'

const { beforeEach, describe, expect, jest, test } = require('@jest/globals')

jest.mock('fs', function () {
  return {
    appendFile: jest.fn()
  }
})

describe('services/logQueue', function () {
  let fs
  let pushLog
  let queue
  let setErrorHandler

  beforeEach(function () {
    jest.resetModules()
    fs = require('fs')
    fs.appendFile.mockReset()
    ;({ pushLog, queue, setErrorHandler } = require('../logQueue'))
  })

  test('pushLog 正常写入文件', async function () {
    fs.appendFile.mockImplementation(function (filePath, content, callback) {
      expect(filePath).toBe('/tmp/app.log')
      expect(content).toBe('hello jest\n')
      setImmediate(callback, null)
    })

    const drained = new Promise(function (resolve) {
      queue.drain = resolve
    })

    pushLog('hello jest', '/tmp/app.log')

    await drained

    expect(fs.appendFile).toHaveBeenCalledTimes(1)
    expect(fs.appendFile).toHaveBeenCalledWith('/tmp/app.log', 'hello jest\n', expect.any(Function))
  })

  test('任务抛出异常时错误处理器被调用', async function () {
    const error = new Error('write failed')
    const handler = jest.fn()

    fs.appendFile.mockImplementation(function () {
      throw error
    })

    setErrorHandler(handler)

    const drained = new Promise(function (resolve) {
      queue.drain = resolve
    })

    pushLog('boom', '/tmp/error.log')

    await drained

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(error, {
      filePath: '/tmp/error.log',
      message: 'boom'
    })
  })

  test('queue.drain 在所有任务完成后触发', async function () {
    const events = []

    fs.appendFile.mockImplementation(function (filePath, content, callback) {
      expect(filePath).toBe('/tmp/queue.log')
      setImmediate(function () {
        events.push(`write:${content.trim()}`)
        callback(null)
      })
    })

    const drained = new Promise(function (resolve) {
      queue.drain = function () {
        events.push('drain')
        resolve()
      }
    })

    pushLog('first', '/tmp/queue.log')
    pushLog('second', '/tmp/queue.log')

    await drained

    expect(events).toEqual(['write:first', 'write:second', 'drain'])
    expect(fs.appendFile).toHaveBeenCalledTimes(2)
  })
})
