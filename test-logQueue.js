const queue = require('./services/logQueue');

async function test() {
  console.log('Initial concurrency:', queue.concurrency);
  
  // Push 105 tasks
  for (let i = 0; i < 105; i++) {
    queue.push({ id: i });
  }
  
  console.log('After pushing 105 tasks, concurrency:', queue.concurrency);
  console.log('Pending tasks:', queue.length());
  
  // Wait for tasks to drain
  await queue.drained();
  
  console.log('After draining, concurrency:', queue.concurrency);
  console.log('Pending tasks:', queue.length());
}

test().catch(console.error);
