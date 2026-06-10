const fastq = require('../queue');
const config = require('../config/queueConfig');

// 模拟的日志处理 worker
async function logWorker(task) {
  // 在此处处理日志
  return Promise.resolve();
}

// 包装 worker 以便在任务完成后检查并发
async function wrappedWorker(task) {
  try {
    return await logWorker(task);
  } finally {
    checkConcurrency();
  }
}

// 创建 promise 队列
const queue = fastq.promise(wrappedWorker, config.defaultConcurrency);

// 动态调整并发数逻辑
function checkConcurrency() {
  const pending = queue.length();
  
  if (pending > config.thresholdHigh && queue.concurrency !== config.highConcurrency) {
    queue.concurrency = config.highConcurrency;
    // console.log(`[logQueue] 任务积压超过 ${config.thresholdHigh}，并发提升至 ${config.highConcurrency}`);
  } else if (pending < config.thresholdLow && queue.concurrency !== config.defaultConcurrency) {
    queue.concurrency = config.defaultConcurrency;
    // console.log(`[logQueue] 任务积压低于 ${config.thresholdLow}，并发恢复至 ${config.defaultConcurrency}`);
  }
}

// 拦截 push 方法，在入队时也能触发检查
const originalPush = queue.push.bind(queue);
queue.push = function(task) {
  const result = originalPush(task);
  checkConcurrency();
  return result;
};

// 拦截 unshift 方法
const originalUnshift = queue.unshift.bind(queue);
queue.unshift = function(task) {
  const result = originalUnshift(task);
  checkConcurrency();
  return result;
};

module.exports = queue;
