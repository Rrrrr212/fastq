'use strict'

jest.mock('fs')

var createLogQueue = require('../services/logQueue')
var fs = require('fs')

describe('logQueue', function () {
  var logQueue

  beforeEach(function () {
    jest.clearAllMocks()
  })

  test('pushLog should write log entry to file', function (done) {
    fs.appendFile.mockImplementation(function (_filePath, _data, cb) {
      cb(null)
    })

    logQueue = createLogQueue('/tmp/test.log')

    logQueue.pushLog('test message', function (err) {
      expect(err).toBeNull()
      expect(fs.appendFile).toHaveBeenCalledWith(
        '/tmp/test.log',
        'test message\n',
        expect.any(Function)
      )
      done()
    })
  })

  test('error handler should be called when task fails', function (done) {
    var writeError = new Error('write failed')

    fs.appendFile.mockImplementation(function (_filePath, _data, cb) {
      cb(writeError)
    })

    logQueue = createLogQueue('/tmp/test.log')

    logQueue.error(function (err, logEntry) {
      expect(err).toBe(writeError)
      expect(logEntry).toBe('error log')
      done()
    })

    logQueue.pushLog('error log', function (err) {
      expect(err).toBe(writeError)
    })
  })

  test('queue.drain should be triggered after all tasks complete', function (done) {
    fs.appendFile.mockImplementation(function (_filePath, _data, cb) {
      cb(null)
    })

    logQueue = createLogQueue('/tmp/test.log')
    var logs = ['log1', 'log2', 'log3']
    var completed = 0

    logQueue.drain(function () {
      expect(completed).toBe(3)
      done()
    })

    logs.forEach(function (log) {
      logQueue.pushLog(log, function (err) {
        expect(err).toBeNull()
        completed++
      })
    })
  })
})