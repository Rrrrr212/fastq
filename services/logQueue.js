const fastq = require('../queue');

// Dummy logger for demonstration
const logger = {
  error: (msg, err, task) => console.error(msg, err, task),
  info: (msg) => console.log(msg)
};

// Worker function
function worker(task, cb) {
  try {
    // Process task
    if (task.shouldFail) {
      throw new Error('Worker failed');
    }
    logger.info(`Task processed: ${task.id}`);
    cb(null);
  } catch (err) {
    cb(err);
  }
}

// Create queue
const queue = fastq(worker, 1);

// Add global error handler
queue.error((err, task) => {
  logger.error('Error processing task in logQueue', err, task);
});

module.exports = queue;
