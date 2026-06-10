const { pushLog } = require('../services/logQueue');

/**
 * 日志处理控制器
 * 简化了调用代码，直接使用 async/await 处理 Promise
 */
async function handleLogRequest(req, res) {
  try {
    const logData = req.body;
    
    // 使用 await 直接等待 Promise 结果，避免了回调地狱
    const result = await pushLog(logData);
    
    res.status(200).json({ 
      message: 'Log processed successfully', 
      result 
    });
  } catch (error) {
    console.error('Error processing log:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = {
  handleLogRequest
};
