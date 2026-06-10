'use strict'

const { pushLog } = require('../services/logQueue')

async function handleLog (req, res) {
  try {
    const { level, message, timestamp } = req.body || {}

    const result = await pushLog({ level, message, timestamp })

    res.statusCode = 200
    res.end(JSON.stringify(result))
  } catch (err) {
    res.statusCode = 400
    res.end(JSON.stringify({ error: err.message }))
  }
}

module.exports = { handleLog }