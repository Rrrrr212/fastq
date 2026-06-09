const fs = require('fs');
const path = require('path');
const fastq = require('../queue');

const logsDir = path.join(__dirname, '../logs');
const logFile = path.join(logsDir, 'app.log');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// worker function
function writeLog(task, cb) {
  const start = Date.now();
  const logMessage = `[${new Date().toISOString()}] ${task.message}\n`;
  
  fs.appendFile(logFile, logMessage, (err) => {
    const elapsed = Date.now() - start;
    console.log(`Task completed in ${elapsed}ms`);
    cb(err, null);
  });
}

// create queue with concurrency of 3
const queue = fastq(writeLog, 3);

// pushLog method for other modules to call
function pushLog(message) {
  queue.push({ message }, (err, result) => {
    if (err) {
      console.error('Failed to write log:', err);
    }
  });
}

module.exports = {
  pushLog,
  queue
};
