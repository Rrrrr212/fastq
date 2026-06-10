const fs = require('fs/promises');
const { queue, pushLog } = require('./logQueue');

jest.mock('fs/promises');

describe('logQueue', () => {
  let errorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    fs.appendFile.mockResolvedValue();
    // 清空队列以确保测试独立
    queue.kill();
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  test('pushLog 正常写入文件', async () => {
    pushLog('test log');
    await queue.drained();

    expect(fs.appendFile).toHaveBeenCalledTimes(1);
    expect(fs.appendFile).toHaveBeenCalledWith('app.log', 'test log\n');
  });

  test('任务抛出异常时错误处理器被调用', async () => {
    pushLog('error log', true);
    await queue.drained();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith('Error handler caught:', 'Task Error');
    expect(fs.appendFile).not.toHaveBeenCalled();
  });

  test('queue.drain 在所有任务完成后触发', async () => {
    const drainMock = jest.fn();
    queue.drain = drainMock;

    pushLog('log 1');
    pushLog('log 2');
    pushLog('log 3');

    await queue.drained();

    expect(drainMock).toHaveBeenCalled();
    expect(fs.appendFile).toHaveBeenCalledTimes(3);
  });
});