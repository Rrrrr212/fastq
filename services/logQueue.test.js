'use strict'

const fs = require('fs')
const createLogQueue = require('./logQueue')

jest.mock('fs')

const TEST_LOG_PATH = '/tmp/test-log-queue.log'

afterEach(() => {
  jest.clearAllMocks()
})

describe('logQueue', () => {
  test('pushLog 正常写入文件', (done) => {
    fs.appendFile.mockImplementation((file, data, encoding, cb) => cb(null))

    const logQueue = createLogQueue(TEST_LOG_PATH)

    logQueue.pushLog('hello world')

    logQueue.onDrain(() => {
      expect(fs.appendFile).toHaveBeenCalledTimes(1)
      const callArgs = fs.appendFile.mock.calls[0]
      expect(callArgs[0]).toBe(TEST_LOG_PATH)
      expect(callArgs[1]).toMatch(/hello world/)
      expect(callArgs[2]).toBe('utf8')
      done()
    })
  })

  test('任务抛出异常时错误处理器被调用', (done) => {
    const writeError = new Error('disk full')
    fs.appendFile.mockImplementation((file, data, encoding, cb) => cb(writeError))

    const errorHandler = jest.fn()
    const logQueue = createLogQueue(TEST_LOG_PATH, {
      errorHandler: (err, task) => {
        errorHandler(err, task)
      }
    })

    logQueue.pushLog('should-fail')

    logQueue.onDrain(() => {
      expect(fs.appendFile).toHaveBeenCalledTimes(1)
      expect(errorHandler).toHaveBeenCalledTimes(1)
      expect(errorHandler).toHaveBeenCalledWith(writeError, 'should-fail')
      done()
    })
  })

  test('queue.drain 在所有任务完成后触发', (done) => {
    fs.appendFile.mockImplementation((file, data, encoding, cb) => cb(null))

    const logQueue = createLogQueue(TEST_LOG_PATH)
    const drainSpy = jest.fn()

    logQueue.onDrain(drainSpy)

    logQueue.pushLog('message-1')
    logQueue.pushLog('message-2')
    logQueue.pushLog('message-3')

    setTimeout(() => {
      expect(fs.appendFile).toHaveBeenCalledTimes(3)
      expect(drainSpy).toHaveBeenCalledTimes(1)
      expect(logQueue.queue.idle()).toBe(true)
      done()
    }, 50)
  })
})
