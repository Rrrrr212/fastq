const fastq = require('./queue'); // Using the local fastq library
const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
const redis = new Redis(redisUrl);

const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Worker function to process log tasks
const worker = async (task) => {
  const { id, message, timestamp } = task;
  const logEntry = `[${timestamp}] ${message}\n`;
  
  try {
    // Append log to file
    await fs.promises.appendFile(LOG_FILE, logEntry);
    
    // Remove task from Redis after successful processing
    await redis.hdel('log_queue_state', id);
  } catch (error) {
    console.error('Failed to process log task:', error);
    throw error;
  }
};

// Create fastq queue with concurrency 1
const queue = fastq.promise(worker, 1);

// Recover pending tasks from Redis on startup
async function recoverTasks() {
  try {
    const pendingTasks = await redis.hgetall('log_queue_state');
    const taskIds = Object.keys(pendingTasks);
    
    for (const id of taskIds) {
      const task = JSON.parse(pendingTasks[id]);
      queue.push(task);
    }
    
    console.log(`Recovered ${taskIds.length} tasks from Redis.`);
  } catch (error) {
    console.error('Failed to recover tasks from Redis:', error);
  }
}

// Simple HTTP server to receive log messages
const http = require('http');
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/log') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
        const task = { 
          id, 
          message: body || 'Empty log message', 
          timestamp: new Date().toISOString() 
        };
        
        // Persist task to Redis before adding to queue
        await redis.hset('log_queue_state', id, JSON.stringify(task));
        
        // Push task to fastq
        queue.push(task);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, id }));
      } catch (err) {
        console.error('Error handling request:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = process.env.PORT || 3000;

// Initialize and start server
async function start() {
  try {
    // Wait for Redis to be ready
    await new Promise((resolve) => {
      redis.once('ready', resolve);
    });
    console.log('Connected to Redis.');
    
    await recoverTasks();
    
    server.listen(PORT, () => {
      console.log(`Log service listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});
