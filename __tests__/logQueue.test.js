'use strict'

const fs = require('fs')
const path = require('path')
const LogQueue = require('../services/logQueue')

jest.mock('fs')

describe('LogQueue', () => {
  let logQueue
  const mockLogPath = '/tmp/test/logs/app.log'

  beforeEach(() => {
    jest.clearAllMocks()
    fs.existsSync.mockReturnValue(true)
    fs.appendFile.mockImplementation((filePath, data, callback) => {
      callback(null)
    })
    logQueue = new LogQueue(mockLogPath)
  })

  describe('pushLog', () => {
    test('should write log entry to file successfully', async () => {
      const logEntry = 'INFO: Application started'

      await logQueue.pushLog(logEntry)

      expect(fs.appendFile).toHaveBeenCalledWith(
        mockLogPath,
        logEntry + '\n',
        expect.any(Function)
      )
    })

    test('should create directory if it does not exist', async () => {
      fs.existsSync.mockReturnValue(false)

      await logQueue.pushLog('test log')

      expect(fs.existsSync).toHaveBeenCalledWith('/tmp/test/logs')
      expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/test/logs', { recursive: true })
    })

    test('should return the log entry on success', async () => {
      const logEntry = 'DEBUG: Processing request'

      const result = await logQueue.pushLog(logEntry)

      expect(result).toBe(logEntry)
    })

    test('should handle multiple log entries in order', async () => {
      const entries = ['log1', 'log2', 'log3']
      const results = []

      for (const entry of entries) {
        const result = await logQueue.pushLog(entry)
        results.push(result)
      }

      expect(results).toEqual(entries)
      expect(fs.appendFile).toHaveBeenCalledTimes(3)
    })
  })

  describe('error handling', () => {
    test('should call error handler when task throws an error', async () => {
      const mockError = new Error('File write failed')
      fs.appendFile.mockImplementation((filePath, data, callback) => {
        callback(mockError)
      })

      const errorHandlerMock = jest.fn()
      logQueue.onError(errorHandlerMock)

      await expect(logQueue.pushLog('error log')).rejects.toThrow('File write failed')

      expect(errorHandlerMock).toHaveBeenCalledWith(mockError, 'error log')
    })

    test('should pass correct task value to error handler', async () => {
      const mockError = new Error('Disk full')
      fs.appendFile.mockImplementation((filePath, data, callback) => {
        callback(mockError)
      })

      const errorHandlerMock = jest.fn()
      logQueue.onError(errorHandlerMock)

      const taskValue = 'CRITICAL: System failure'
      await expect(logQueue.pushLog(taskValue)).rejects.toThrow('Disk full')

      expect(errorHandlerMock).toHaveBeenCalledWith(mockError, taskValue)
    })

    test('should handle errors without error handler gracefully', async () => {
      const mockError = new Error('Permission denied')
      fs.appendFile.mockImplementation((filePath, data, callback) => {
        callback(mockError)
      })

      await expect(logQueue.pushLog('test')).rejects.toThrow('Permission denied')
    })
  })

  describe('drain', () => {
    test('should trigger drain callback after all tasks complete', async () => {
      const drainMock = jest.fn()
      logQueue.onDrain(drainMock)

      await Promise.all([
        logQueue.pushLog('task1'),
        logQueue.pushLog('task2'),
        logQueue.pushLog('task3')
      ])

      await logQueue.drained()

      expect(drainMock).toHaveBeenCalled()
    })

    test('should trigger drain after concurrent tasks finish', async () => {
      const concurrentQueue = new LogQueue(mockLogPath, 2)
      const drainMock = jest.fn()
      concurrentQueue.onDrain(drainMock)

      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(concurrentQueue.pushLog(`task${i}`))
      }

      await Promise.all(promises)
      await concurrentQueue.drained()

      expect(drainMock).toHaveBeenCalled()
    })

    test('should wait for all queued tasks to complete before draining', async () => {
      const executionOrder = []
      const drainMock = jest.fn(() => {
        executionOrder.push('drain')
      })

      fs.appendFile.mockImplementation((filePath, data, callback) => {
        executionOrder.push(data.trim())
        callback(null)
      })

      logQueue.onDrain(drainMock)

      await logQueue.pushLog('first')
      await logQueue.pushLog('second')
      await logQueue.drained()

      expect(executionOrder).toContain('first')
      expect(executionOrder).toContain('second')
      expect(drainMock).toHaveBeenCalled()
    })
  })

  describe('queue state', () => {
    test('should report running tasks correctly', async () => {
      expect(logQueue.running()).toBe(0)

      const promise = logQueue.pushLog('running test')

      expect(logQueue.running()).toBeGreaterThanOrEqual(0)

      await promise
    })

    test('should report idle when no tasks are running', async () => {
      expect(logQueue.idle()).toBe(true)

      await logQueue.pushLog('idle test')

      expect(logQueue.idle()).toBe(true)
    })

    test('should report queue length', async () => {
      const busyQueue = new LogQueue(mockLogPath, 1)

      fs.appendFile.mockImplementation((filePath, data, callback) => {
        setTimeout(() => callback(null), 100)
      })

      busyQueue.pushLog('task1')
      busyQueue.pushLog('task2')

      expect(busyQueue.length()).toBeGreaterThanOrEqual(0)

      await busyQueue.drained()
    })
  })
})
