/**
 * Logger 功能演示脚本
 *
 * 这个脚本展示了新的浏览器兼容logger系统的各种功能
 */

import logger, { Logger, LogLevel } from '../utils/logger';

console.log('🚀 Logger 功能演示开始\n');

// 1. 基本日志记录
console.log('1. 基本日志记录:');
logger.debug('这是一条调试信息', { component: 'demo', feature: 'basic-logging' });
logger.info('应用启动成功', { component: 'demo', version: '1.0.0' });
logger.warn('这是一个警告', { component: 'demo', issue: 'minor' });
logger.error('这是一个错误', { component: 'demo', severity: 'high' });

console.log('\n2. 错误处理演示:');
try {
  throw new Error('模拟的错误');
} catch (error) {
  logger.logError(error, {
    component: 'demo',
    action: 'errorHandling',
    context: 'try-catch块'
  });
}

// 处理非Error对象
logger.logError('字符串形式的错误', {
  component: 'demo',
  action: 'errorHandling',
  type: 'string-error'
});

console.log('\n3. 性能监控演示:');
const startTime = Date.now();
// 模拟一些工作
for (let i = 0; i < 100000; i++) {
  Math.random();
}
const duration = Date.now() - startTime;

logger.logPerformance('randomNumberGeneration', duration, {
  component: 'demo',
  iterations: 100000,
  avgTimePerIteration: duration / 100000
});

console.log('\n4. 用户行为追踪演示:');
logger.logUserAction('buttonClick', {
  component: 'demo',
  buttonId: 'submit-btn',
  pageUrl: 'https://example.com/form'
});

logger.logUserAction('pageView', {
  component: 'demo',
  page: '/dashboard',
  referrer: '/login'
});

console.log('\n5. 自定义Logger配置演示:');
const customLogger = new Logger({
  level: LogLevel.INFO,
  enableConsole: true,
  enableRemote: false, // 演示中不启用远程日志
  maxRetries: 5,
  retryDelay: 1000
});

customLogger.info('自定义Logger消息', {
  component: 'customDemo',
  config: 'custom'
});

// 这条debug消息不会显示，因为级别设置为INFO
customLogger.debug('这条消息不会显示', {
  component: 'customDemo',
  level: 'debug'
});

console.log('\n6. 日志级别过滤演示:');
const errorOnlyLogger = new Logger({
  level: LogLevel.ERROR,
  enableConsole: true,
  enableRemote: false
});

console.log('   设置为ERROR级别的logger:');
errorOnlyLogger.debug('不会显示 - DEBUG');
errorOnlyLogger.info('不会显示 - INFO');
errorOnlyLogger.warn('不会显示 - WARN');
errorOnlyLogger.error('会显示 - ERROR', { component: 'errorOnlyDemo' });

console.log('\n7. 配置更新演示:');
const dynamicLogger = new Logger({
  level: LogLevel.ERROR,
  enableConsole: true,
  enableRemote: false
});

console.log('   更新前 (ERROR级别):');
dynamicLogger.info('不会显示');

dynamicLogger.updateConfig({ level: LogLevel.DEBUG });
console.log('   更新后 (DEBUG级别):');
dynamicLogger.info('现在会显示了', { component: 'dynamicDemo', updated: true });

console.log('\n8. 复杂上下文演示:');
logger.info('复杂业务操作', {
  component: 'businessLogic',
  action: 'processOrder',
  orderId: 'ORD-12345',
  userId: 'user-789',
  items: [
    { id: 'item-1', quantity: 2, price: 29.99 },
    { id: 'item-2', quantity: 1, price: 15.50 }
  ],
  totalAmount: 75.48,
  paymentMethod: 'credit_card',
  shippingAddress: {
    country: 'CN',
    city: 'Beijing',
    zipCode: '100000'
  }
});

console.log('\n9. 会话管理演示:');
const session1 = new Logger();
const session2 = new Logger();

session1.info('会话1的消息', { component: 'sessionDemo', session: 1 });
session2.info('会话2的消息', { component: 'sessionDemo', session: 2 });

console.log('\n10. 远程日志配置演示 (不会实际发送):');
const remoteLogger = new Logger({
  level: LogLevel.INFO,
  enableConsole: true,
  enableRemote: true,
  remoteEndpoint: 'https://api.example.com/logs',
  maxRetries: 3,
  retryDelay: 1000
});

remoteLogger.info('这条消息会尝试发送到远程服务器', {
  component: 'remoteDemo',
  note: '实际演示中不会发送，因为endpoint不存在'
});

console.log('\n✅ Logger 功能演示完成!');
console.log('\n📊 演示统计:');
console.log('- 展示了10个不同的功能场景');
console.log('- 包含基本日志、错误处理、性能监控、用户行为追踪等');
console.log('- 演示了配置管理和会话管理功能');
console.log('- 所有功能都在浏览器环境中正常工作');

export { }; // 使文件成为模块
