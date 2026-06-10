const fs = require('fs/promises');
const fastq = require('../queue');

async function worker(task) {
  if (task.shouldThrow) {
    throw new Error('Task Error');
  }
  
  await fs.appendFile('app.log', task.message + '\n');
}

const queue = fastq.promise(worker, 1);

// Error handler
queue.error((err, task) => {
  if (err) {
    console.error('Error handler caught:', err.message);
  }
});

function pushLog(message, shouldThrow = false) {
  queue.push({ message, shouldThrow });
}

module.exports = {
  queue,
  pushLog
};