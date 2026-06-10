'use strict'

const { pushLog, getPendingCount, isIdle, waitForDrain } = require('../services/logQueue')

async function addLog (req, res) {
  try {
    const { level, message, metadata } = req.body

    const logEntry = {
      level: level || 'info',
      message,
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    }

    const result = await pushLog(logEntry)

    res.status(200).json({
      success: true,
      data: result
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
}

async function addLogs (req, res) {
  try {
    const { logs } = req.body

    const results = await Promise.all(
      logs.map(log => pushLog({
        level: log.level || 'info',
        message: log.message,
        metadata: log.metadata || {},
        timestamp: new Date().toISOString()
      }))
    )

    res.status(200).json({
      success: true,
      data: results
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
}

async function getQueueStatus (req, res) {
  res.status(200).json({
    pending: getPendingCount(),
    idle: isIdle()
  })
}

async function flushLogs (req, res) {
  try {
    await waitForDrain()

    res.status(200).json({
      success: true,
      message: 'All logs processed'
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
}

module.exports = {
  addLog,
  addLogs,
  getQueueStatus,
  flushLogs
}
