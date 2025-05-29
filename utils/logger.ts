// 定义日志级别
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

// 定义日志上下文接口
export interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

// 定义日志配置接口
interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  maxRetries: number;
  retryDelay: number;
}

// 日志级别优先级映射
const LOG_LEVELS = {
  [LogLevel.ERROR]: 0,
  [LogLevel.WARN]: 1,
  [LogLevel.INFO]: 2,
  [LogLevel.DEBUG]: 3,
};

// 简化的环境检测 - 只检查最可靠的指标
function isProductionEnvironment(): boolean {
  // 1. 优先检查 NODE_ENV (最可靠的方式)
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    return true;
  }

  // 2. 检查 Vite/构建工具的环境变量
  if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
    return true;
  }

  // 3. 检查全局变量 (可以在构建时通过 define 设置)
  if (typeof globalThis !== 'undefined' && (globalThis as any).__PROD__) {
    return true;
  }

  // 默认为开发环境
  return false;
}

// 默认配置函数（动态计算）
function getDefaultConfig(): LoggerConfig {
  const isProduction = isProductionEnvironment();
  return {
    level: isProduction ? LogLevel.WARN : LogLevel.DEBUG,
    enableConsole: !isProduction,
    enableRemote: false,
    maxRetries: 3,
    retryDelay: 1000,
  };
}

// 远程日志上报队列
class RemoteLogger {
  private config: LoggerConfig;
  private retryQueue: Array<{ info: any; retryCount: number }> = [];
  private isProcessing = false;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  async sendLog(info: any): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) {
      return;
    }

    try {
      await this.doSendLog(info);
    } catch (error) {
      this.addToRetryQueue(info);
    }
  }

  private async doSendLog(info: any): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    const response = await fetch(this.config.remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...info,
        source: 'copy-as-markdown-extension',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      }),
    });

    if (!response.ok) {
      throw new Error(`Remote logging failed: ${response.status}`);
    }
  }

  private addToRetryQueue(info: any): void {
    this.retryQueue.push({ info, retryCount: 0 });
    if (!this.isProcessing) {
      this.processRetryQueue();
    }
  }

  private async processRetryQueue(): Promise<void> {
    if (this.isProcessing || this.retryQueue.length === 0) return;

    this.isProcessing = true;

    while (this.retryQueue.length > 0) {
      const item = this.retryQueue.shift();
      if (!item) break;

      try {
        await this.doSendLog(item.info);
      } catch (error) {
        if (item.retryCount < this.config.maxRetries) {
          item.retryCount++;
          setTimeout(() => {
            this.retryQueue.push(item);
          }, this.config.retryDelay * Math.pow(2, item.retryCount));
        }
      }

      // 避免阻塞，给其他任务执行机会
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isProcessing = false;
  }
}

// 浏览器Console Logger
class ConsoleLogger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = context?.component ? `[${context.component}]` : '[CopyAsMarkdown]';
    const actionSuffix = context?.action ? ` (${context.action})` : '';
    const logMessage = `${timestamp} ${prefix}${actionSuffix} ${message}`;

    // 准备元数据
    const meta = { ...context };
    delete meta.component;
    delete meta.action;

    const hasMetadata = Object.keys(meta).length > 0;

    switch (level) {
      case LogLevel.ERROR:
        if (hasMetadata) {
          console.error(logMessage, meta);
        } else {
          console.error(logMessage);
        }
        break;
      case LogLevel.WARN:
        if (hasMetadata) {
          console.warn(logMessage, meta);
        } else {
          console.warn(logMessage);
        }
        break;
      case LogLevel.INFO:
        if (hasMetadata) {
          console.info(logMessage, meta);
        } else {
          console.info(logMessage);
        }
        break;
      case LogLevel.DEBUG:
        if (hasMetadata) {
          console.log(logMessage, meta);
        } else {
          console.log(logMessage);
        }
        break;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.config.level];
  }
}

// Logger类
export class Logger {
  private config: LoggerConfig;
  private sessionId: string;
  private remoteLogger: RemoteLogger;
  private consoleLogger: ConsoleLogger;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...getDefaultConfig(), ...config };
    this.sessionId = this.generateSessionId();
    this.remoteLogger = new RemoteLogger(this.config);
    this.consoleLogger = new ConsoleLogger(this.config);
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatMessage(message: string, context?: LogContext): any {
    return {
      message,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      ...context,
    };
  }

  private async logWithRemote(level: LogLevel, message: string, context?: LogContext): Promise<void> {
    const logData = this.formatMessage(message, context);

    // 本地日志
    if (this.config.enableConsole) {
      this.consoleLogger.log(level, message, context);
    }

    // 远程日志
    if (this.config.enableRemote) {
      await this.remoteLogger.sendLog({ level, ...logData });
    }
  }

  error(message: string, context?: LogContext): void {
    this.logWithRemote(LogLevel.ERROR, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.logWithRemote(LogLevel.WARN, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.logWithRemote(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.logWithRemote(LogLevel.DEBUG, message, context);
  }

  // 便捷方法：记录错误对象
  logError(error: Error | unknown, context?: LogContext): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.error(errorMessage, {
      ...context,
      stack: errorStack,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
    });
  }

  // 便捷方法：记录性能指标
  logPerformance(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation} completed`, {
      ...context,
      operation,
      duration,
      performanceMetric: true,
    });
  }

  // 便捷方法：记录用户操作
  logUserAction(action: string, context?: LogContext): void {
    this.info(`User action: ${action}`, {
      ...context,
      action,
      userAction: true,
    });
  }

  // 更新配置
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.remoteLogger = new RemoteLogger(this.config);
    this.consoleLogger = new ConsoleLogger(this.config);
  }

  // 获取当前配置
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  // 获取当前环境信息
  getEnvironmentInfo(): { isProduction: boolean; source: string } {
    const isProduction = isProductionEnvironment();
    let source = 'default';

    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
      source = 'NODE_ENV';
    } else if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
      source = 'import.meta.env.PROD';
    } else if (typeof globalThis !== 'undefined' && (globalThis as any).__PROD__) {
      source = 'globalThis.__PROD__';
    }

    return { isProduction, source };
  }
}

// 创建全局logger实例
const logger = new Logger();

// 导出logger实例和相关类型、工具函数
export {
  logger,
  isProductionEnvironment
};
export default logger;
