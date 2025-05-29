# Logger 和测试系统文档

## Logger 系统

### 概述

项目已升级为使用自定义的浏览器兼容 logger 系统，替代了原有的 `console.log` 调用。新的 logger 专为浏览器扩展环境设计，提供了结构化日志记录、远程日志上报、性能监控等功能。

### 技术架构

- **浏览器兼容**: 专为浏览器环境设计，无需Node.js依赖
- **轻量级**: 移除了Winston依赖，减少了包体积
- **高性能**: 优化的日志处理和远程上报机制
- **类型安全**: 完整的TypeScript支持

### 特性

- **结构化日志**: 支持上下文信息和元数据
- **多级别日志**: ERROR, WARN, INFO, DEBUG
- **远程上报**: 支持将日志发送到远程服务器
- **重试机制**: 远程日志上报失败时自动重试
- **性能监控**: 内置性能指标记录
- **用户行为追踪**: 记录用户操作
- **会话管理**: 自动生成会话ID
- **级别过滤**: 根据配置动态过滤日志输出
- **环境感知**: 自动检测开发/生产环境，智能调整日志行为

### 环境检测与配置

Logger系统具有智能的环境检测功能，能够自动识别当前运行环境并调整日志行为：

#### 自动环境检测

系统会按以下优先级检测环境：

1. **手动设置** - 通过`setProductionMode()`手动指定
2. **process.env.NODE_ENV** - 检查Node.js环境变量
3. **浏览器扩展manifest** - 检查扩展的manifest配置
4. **URL域名** - 基于域名启发式判断
5. **全局变量** - 检查`window.__PRODUCTION__`标志

#### 环境配置差异

**开发环境 (Development)**:
- 日志级别: `DEBUG` (显示所有日志)
- Console输出: `启用` (在浏览器控制台显示)
- 远程上报: `禁用` (默认)

**生产环境 (Production)**:
- 日志级别: `WARN` (只显示警告和错误)
- Console输出: `禁用` (不在控制台显示，避免泄露信息)
- 远程上报: `禁用` (默认，可手动启用)

#### 手动控制环境

```typescript
import { setProductionMode, resetEnvironmentDetection, isProductionEnvironment } from '../../src/utils/logger';

// 手动设置为生产环境
setProductionMode(true);

// 手动设置为开发环境
setProductionMode(false);

// 重置为自动检测
resetEnvironmentDetection();

// 检查当前环境
console.log('是否为生产环境:', isProductionEnvironment());
```

### 使用方法

#### 基本用法

```typescript
import logger from '../../src/utils/logger';

// 基本日志记录
logger.info('操作完成');
logger.warn('警告信息');
logger.error('错误信息');
logger.debug('调试信息');

// 带上下文的日志记录
logger.info('用户操作', {
  component: 'turndownRules',
  action: 'convertImage',
  userId: 'user123',
  imageUrl: 'https://example.com/image.jpg'
});
```

#### 便捷方法

```typescript
// 记录错误对象
try {
  // 一些操作
} catch (error) {
  logger.logError(error, {
    component: 'copyAsMarkdown',
    action: 'processElement'
  });
}

// 记录性能指标
const startTime = Date.now();
// 执行操作
const duration = Date.now() - startTime;
logger.logPerformance('elementProcessing', duration, {
  component: 'turndownRules',
  elementType: 'image'
});

// 记录用户操作
logger.logUserAction('copyToClipboard', {
  component: 'ui',
  elementType: 'pre',
  contentLength: 1024
});
```

#### 配置

```typescript
import { Logger, LogLevel } from '../../src/utils/logger';

// 创建自定义配置的 logger
const customLogger = new Logger({
  level: LogLevel.INFO,
  enableConsole: true,
  enableRemote: true,
  remoteEndpoint: 'https://your-log-server.com/api/logs',
  maxRetries: 5,
  retryDelay: 2000
});

// 更新现有 logger 配置
logger.updateConfig({
  enableRemote: true,
  remoteEndpoint: 'https://your-log-server.com/api/logs'
});
```

### 日志上下文接口

```typescript
interface LogContext {
  component?: string;      // 组件名称
  action?: string;         // 操作名称
  userId?: string;         // 用户ID
  sessionId?: string;      // 会话ID（自动生成）
  [key: string]: any;      // 其他自定义字段
}
```

### 迁移指南

原有的 `console.log` 调用已被替换：

```typescript
// 旧代码
console.warn(`CopyAsMarkdown: Could not convert relative src "${src}" to absolute:`, error);

// 新代码
logger.warn(`Could not convert relative src to absolute`, {
  component: 'turndownRules',
  action: 'addAbsoluteImageRule',
  originalSrc: src,
  error: error instanceof Error ? error.message : String(error),
});
```

### 浏览器兼容性

新的logger系统专为浏览器环境设计：

- **无Node.js依赖**: 不依赖process、fs等Node.js模块
- **轻量级**: 相比Winston减少了大量依赖
- **原生支持**: 使用浏览器原生API（fetch、console等）
- **扩展友好**: 针对浏览器扩展环境优化

## 测试系统

### 概述

项目使用 Vitest 作为测试框架，配置了 jsdom 环境来模拟浏览器环境。测试覆盖了logger系统和turndownRules模块。

### 测试配置

- **测试框架**: Vitest
- **环境**: jsdom (模拟浏览器)
- **UI**: @vitest/ui (可视化测试界面)
- **覆盖率**: 内置支持

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 启动可视化测试界面
pnpm test:ui

# 运行测试一次（CI模式）
pnpm test:run
```

### 测试结构

```
test/
├── setup.ts              # 测试环境设置
├── logger.test.ts         # Logger 系统测试
└── turndownRules.test.ts  # turndownRules 模块测试
```

### 测试用例覆盖

#### logger.test.ts (24个测试用例)

- **基本日志功能**: 测试各级别日志记录
- **日志级别过滤**: 测试级别过滤机制
- **上下文信息**: 测试上下文和元数据处理
- **便捷方法**: 测试logError、logPerformance、logUserAction
- **配置管理**: 测试配置更新和获取
- **会话管理**: 测试会话ID生成
- **远程日志**: 测试远程上报功能
- **环境检测**: 测试自动环境检测和手动控制功能

#### turndownRules.test.ts (33个测试用例)

- **addPreElementRule**: 测试 `<pre>` 元素转换为代码块
- **addSkipMarkedElementsRule**: 测试跳过标记元素
- **addSkipInvisibleRule**: 测试跳过不可见元素
- **addAbsoluteImageRule**: 测试图片URL绝对化
- **addAbsoluteLinkRule**: 测试链接URL绝对化
- **addLinkedImageRule**: 测试链接图片的GFM格式转换
- **Integration tests**: 测试多个规则的集成场景

### 编写测试

#### 基本测试结构

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('模块名称', () => {
  beforeEach(() => {
    // 每个测试前的设置
    vi.clearAllMocks();
  });

  it('应该执行某个功能', () => {
    // 准备
    const input = '<div>test</div>';

    // 执行
    const result = someFunction(input);

    // 断言
    expect(result).toBe('expected output');
  });
});
```

#### Mock 使用

```typescript
// Mock 外部依赖
vi.mock('../src/utils/logger', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock 函数
vi.mock('../entrypoints/content/dom-handler', () => ({
  detectCodeLanguage: vi.fn(() => 'javascript'),
}));
```

### 测试环境设置

`test/setup.ts` 文件配置了测试环境：

- Mock 浏览器 APIs (window, document, navigator)
- Mock fetch 用于远程日志测试
- 设置全局变量和常量

### 最佳实践

1. **测试隔离**: 每个测试应该独立，不依赖其他测试的状态
2. **Mock 清理**: 在 `beforeEach` 中清理 mock 状态
3. **描述性命名**: 测试名称应该清楚描述测试的功能
4. **边界测试**: 测试正常情况、边界情况和错误情况
5. **集成测试**: 除了单元测试，还要有集成测试验证模块间协作

### 持续集成

测试可以集成到 CI/CD 流程中：

```yaml
# GitHub Actions 示例
- name: Run tests
  run: pnpm test:run

- name: Generate coverage
  run: pnpm test:coverage
```

## 性能优化

### Logger性能特点

1. **异步处理**: 远程日志上报不阻塞主线程
2. **批量重试**: 失败的日志请求会进入重试队列
3. **内存管理**: 合理的队列大小限制
4. **级别过滤**: 在记录前就过滤不需要的日志

### 最佳实践

1. **合理设置日志级别**: 生产环境使用WARN或ERROR级别
2. **避免大量调试日志**: 在性能敏感的代码中谨慎使用DEBUG级别
3. **结构化上下文**: 使用结构化的上下文信息便于分析
4. **错误处理**: 使用logError方法记录完整的错误信息

## 总结

新的 logger 系统和测试框架为项目提供了：

1. **浏览器兼容的日志管理**: 专为浏览器扩展环境设计，无Node.js依赖
2. **智能环境检测**: 自动识别开发/生产环境，智能调整日志行为
3. **全面的测试覆盖**: 57个测试用例确保代码质量
4. **开发体验提升**: 更好的调试信息和测试反馈
5. **可维护性**: 清晰的日志记录和测试用例便于维护
6. **性能优化**: 轻量级实现，优化的异步处理
7. **安全性**: 生产环境自动禁用console输出，避免信息泄露

这些改进解决了原有Winston在浏览器环境中的兼容性问题，为项目的长期维护和扩展奠定了坚实的基础。
