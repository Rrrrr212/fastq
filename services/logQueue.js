const fastq = require('fastq');

// Promise 风格的 worker 任务处理函数
async function worker(logData) {
  // 模拟日志处理逻辑
  console.log('Processing log:', logData);
  return { success: true, data: logData };
}

// 使用 fastq.promise 创建队列，并发度设为 1
const queue = fastq.promise(worker, 1);

/**
 * 将日志推入队列
 * 由于使用了 fastq.promise，queue.push 会直接返回一个 Promise
 * @param {Object} logData - 日志数据
 * @returns {Promise}
 */
function pushLog(logData) {
  return queue.push(logData);
}

module.exports = {
  pushLog
};
