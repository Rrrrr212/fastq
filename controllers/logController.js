'use strict'

const { pushLog, queue } = require('../services/logQueue')

const logController = {
  async createLog (req, res) {
    const { level = 'info', message } = req.body || {}

    if (!message) {
      return res.status(400).json({ error: 'message is required' })
    }

    try {
      const task = await pushLog(level, message)
      return res.status(201).json({ status: 'queued', task })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  },

  async createLogs (req, res) {
    const logs = (req.body && req.body.logs) || []

    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ error: 'logs must be a non-empty array' })
    }

    try {
      const tasks = await Promise.all(logs.map(log => pushLog(log.level || 'info', log.message)))
      return res.status(201).json({ status: 'queued', count: tasks.length, tasks })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  },

  async drain (req, res) {
    try {
      await queue.drained()
      return res.status(200).json({ status: 'drained', idle: queue.idle() })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  },

  status (req, res) {
    return res.status(200).json({
      running: queue.running(),
      length: queue.length(),
      idle: queue.idle(),
      paused: queue.paused,
      concurrency: queue.concurrency
    })
  }
}

module.exports = logController
