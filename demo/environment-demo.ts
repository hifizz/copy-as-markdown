/**
 * 环境检测功能演示脚本
 *
 * 这个脚本展示了logger系统的简化环境检测功能
 */

import logger, { Logger, LogLevel, isProductionEnvironment } from '../utils/logger';

console.log('🌍 环境检测功能演示开始\n');

// 1. 当前环境检测
console.log('1. 当前环境检测:');
console.log(`当前环境: ${isProductionEnvironment() ? '生产环境' : '开发环境'}`);

// 2. 默认logger配置
console.log('\n2. 默认logger配置:');
const defaultLogger = new Logger();
const defaultConfig = defaultLogger.getConfig();
console.log('默认配置:', {
  level: defaultConfig.level,
  enableConsole: defaultConfig.enableConsole,
  enableRemote: defaultConfig.enableRemote
});

// 3. 环境信息详情
console.log('\n3. 环境信息详情:');
const envInfo = defaultLogger.getEnvironmentInfo();
console.log('环境检测结果:', envInfo);

// 4. 开发环境日志输出测试
console.log('\n4. 开发环境日志输出测试:');
if (!isProductionEnvironment()) {
  console.log('当前是开发环境，以下日志会在控制台显示:');
  defaultLogger.debug('这是开发环境的调试信息', { component: 'envDemo', env: 'development' });
  defaultLogger.info('这是开发环境的信息', { component: 'envDemo', env: 'development' });
  defaultLogger.warn('这是开发环境的警告', { component: 'envDemo', env: 'development' });
  defaultLogger.error('这是开发环境的错误', { component: 'envDemo', env: 'development' });
} else {
  console.log('当前是生产环境，只有WARN和ERROR级别的日志会被记录');
  defaultLogger.debug('这是生产环境的调试信息（不会显示）', { component: 'envDemo', env: 'production' });
  defaultLogger.info('这是生产环境的信息（不会显示）', { component: 'envDemo', env: 'production' });
  defaultLogger.warn('这是生产环境的警告', { component: 'envDemo', env: 'production' });
  defaultLogger.error('这是生产环境的错误', { component: 'envDemo', env: 'production' });
}

// 5. 手动覆盖环境配置
console.log('\n5. 手动覆盖环境配置:');
const customLogger = new Logger({
  enableConsole: true,  // 强制启用console
  level: LogLevel.DEBUG // 强制显示所有级别
});

console.log('自定义logger配置:', {
  level: customLogger.getConfig().level,
  enableConsole: customLogger.getConfig().enableConsole,
  enableRemote: customLogger.getConfig().enableRemote
});

console.log('\n自定义logger日志输出测试:');
customLogger.debug('自定义配置的调试信息（强制显示）', { component: 'envDemo', custom: true });
customLogger.info('自定义配置的信息（强制显示）', { component: 'envDemo', custom: true });

// 6. 环境检测机制说明
console.log('\n6. 环境检测机制说明:');
console.log('检测优先级:');
console.log('1. process.env.NODE_ENV === "production"');
console.log('2. import.meta.env.PROD (Vite构建工具)');
console.log('3. globalThis.__PROD__ (自定义全局变量)');
console.log('4. 默认为开发环境');

// 7. 实际使用建议
console.log('\n7. 实际使用建议:');
console.log('📝 开发阶段 (pnpm dev):');
console.log('  - NODE_ENV 通常不是 "production"');
console.log('  - import.meta.env.PROD 为 false');
console.log('  - 自动启用console输出，显示所有级别日志');
console.log('  - 便于调试和开发');

console.log('\n🚀 生产构建 (pnpm build):');
console.log('  - 构建工具会设置 NODE_ENV=production');
console.log('  - Vite会设置 import.meta.env.PROD=true');
console.log('  - 自动禁用console输出，只记录WARN和ERROR');
console.log('  - 提升性能和安全性');

console.log('\n🔧 特殊需求:');
console.log('  - 通过构造函数参数覆盖默认配置');
console.log('  - 启用远程日志上报收集生产环境日志');
console.log('  - 可以在任何环境强制启用/禁用console');

console.log('\n✅ 环境检测功能演示完成!');
console.log('\n📊 功能特点:');
console.log('- 简单可靠的环境检测，基于标准构建工具');
console.log('- 开发环境详细日志，生产环境安全静默');
console.log('- 灵活的配置覆盖机制');
console.log('- 与 pnpm dev/build 完美集成');

export { }; // 使文件成为模块
