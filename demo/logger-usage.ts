/**
 * Logger 使用示例
 *
 * 这个文件展示了如何在项目的不同模块中使用新的 logger 系统
 */

import logger, { Logger, LogLevel } from '../utils/logger';

// 示例1: 基本日志记录
function basicLoggingExample() {
  logger.info('应用启动', {
    component: 'app',
    action: 'startup',
    version: '1.0.0'
  });

  logger.debug('调试信息', {
    component: 'debugger',
    data: { userId: '123', sessionId: 'abc' }
  });

  logger.warn('警告：配置项缺失', {
    component: 'config',
    action: 'validation',
    missingKeys: ['apiKey', 'endpoint']
  });
}

// 示例2: 错误处理
async function errorHandlingExample() {
  try {
    // 模拟一个可能失败的操作
    await riskyOperation();
  } catch (error) {
    // 使用便捷方法记录错误
    logger.logError(error, {
      component: 'dataProcessor',
      action: 'processUserData',
      userId: 'user123'
    });
  }
}

async function riskyOperation() {
  throw new Error('网络连接失败');
}

// 示例3: 性能监控
function performanceMonitoringExample() {
  const startTime = Date.now();

  // 执行一些耗时操作
  processLargeDataset();

  const duration = Date.now() - startTime;

  // 记录性能指标
  logger.logPerformance('datasetProcessing', duration, {
    component: 'dataProcessor',
    recordCount: 10000,
    memoryUsage: typeof process !== 'undefined' ? process.memoryUsage?.()?.heapUsed || 0 : 0
  });
}

function processLargeDataset() {
  // 模拟数据处理
  for (let i = 0; i < 10000; i++) {
    // 处理数据
  }
}

// 示例4: 用户行为追踪
function userActionTrackingExample() {
  // 用户点击复制按钮
  logger.logUserAction('copyToClipboard', {
    component: 'ui',
    elementType: 'codeBlock',
    contentLength: 256,
    language: 'javascript'
  });

  // 用户选择元素
  logger.logUserAction('selectElement', {
    component: 'selector',
    elementTag: 'pre',
    hasChildren: true,
    depth: 3
  });

  // 用户更改设置
  logger.logUserAction('updateSettings', {
    component: 'settings',
    settingKey: 'theme',
    oldValue: 'light',
    newValue: 'dark'
  });
}

// 示例5: 条件日志记录
function conditionalLoggingExample(isDebugMode: boolean) {
  // 只在调试模式下记录详细信息
  if (isDebugMode) {
    logger.debug('详细调试信息', {
      component: 'debugger',
      stackTrace: new Error().stack,
      variables: {
        x: 1,
        y: 2,
        result: 3
      }
    });
  }

  // 总是记录重要事件
  logger.info('重要操作完成', {
    component: 'core',
    action: 'processComplete',
    success: true
  });
}

// 示例6: 自定义 Logger 配置
function customLoggerExample() {
  // 为特定模块创建自定义配置的 logger
  const apiLogger = new Logger({
    level: LogLevel.INFO,
    enableConsole: true,
    enableRemote: true,
    remoteEndpoint: 'https://api.example.com/logs',
    maxRetries: 5,
    retryDelay: 2000
  });

  apiLogger.info('API 请求开始', {
    component: 'api',
    action: 'request',
    endpoint: '/users',
    method: 'GET'
  });

  // 模拟 API 响应
  setTimeout(() => {
    apiLogger.info('API 请求完成', {
      component: 'api',
      action: 'response',
      endpoint: '/users',
      statusCode: 200,
      responseTime: 150
    });
  }, 150);
}

// 示例7: 批量操作日志记录
function batchOperationExample() {
  const items = ['item1', 'item2', 'item3', 'item4', 'item5'];

  logger.info('批量操作开始', {
    component: 'batchProcessor',
    action: 'start',
    itemCount: items.length
  });

  let successCount = 0;
  let errorCount = 0;

  items.forEach((item, index) => {
    try {
      // 模拟处理每个项目
      processItem(item);
      successCount++;

      logger.debug('项目处理成功', {
        component: 'batchProcessor',
        action: 'processItem',
        item,
        index,
        progress: `${index + 1}/${items.length}`
      });
    } catch (error) {
      errorCount++;
      logger.logError(error, {
        component: 'batchProcessor',
        action: 'processItem',
        item,
        index
      });
    }
  });

  logger.info('批量操作完成', {
    component: 'batchProcessor',
    action: 'complete',
    totalItems: items.length,
    successCount,
    errorCount,
    successRate: (successCount / items.length) * 100
  });
}

function processItem(item: string) {
  // 模拟随机失败
  if (Math.random() < 0.2) {
    throw new Error(`处理 ${item} 失败`);
  }
}

// 示例8: 上下文传递
class UserService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async getUserData() {
    const context = {
      component: 'UserService',
      action: 'getUserData',
      userId: this.userId
    };

    logger.info('开始获取用户数据', context);

    try {
      // 模拟数据库查询
      const userData = await this.queryDatabase();

      logger.info('用户数据获取成功', {
        ...context,
        dataSize: JSON.stringify(userData).length
      });

      return userData;
    } catch (error) {
      logger.logError(error, context);
      throw error;
    }
  }

  private async queryDatabase() {
    // 模拟数据库查询
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: this.userId,
          name: 'John Doe',
          email: 'john@example.com'
        });
      }, 100);
    });
  }
}

// 运行示例
export function runLoggerExamples() {
  console.log('=== Logger 使用示例 ===\n');

  basicLoggingExample();
  errorHandlingExample();
  performanceMonitoringExample();
  userActionTrackingExample();
  conditionalLoggingExample(true);
  customLoggerExample();
  batchOperationExample();

  // 用户服务示例
  const userService = new UserService('user123');
  userService.getUserData();

  console.log('\n=== 示例完成 ===');
  console.log('查看控制台输出以了解 logger 的工作方式');
}

// 如果直接运行此文件
if (typeof require !== 'undefined' && require.main === module) {
  runLoggerExamples();
}
