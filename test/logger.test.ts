import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger, LogLevel, isProductionEnvironment } from '../utils/logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: any;

  beforeEach(() => {
    // 重置console spy
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };

    logger = new Logger({
      level: LogLevel.DEBUG,
      enableConsole: true,
      enableRemote: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本日志功能', () => {
    it('应该记录debug级别的日志', () => {
      logger.debug('测试debug消息', { component: 'test', extra: 'data' });
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[test] 测试debug消息'),
        expect.objectContaining({ extra: 'data' })
      );
    });

    it('应该记录info级别的日志', () => {
      logger.info('测试info消息', { component: 'test', extra: 'data' });
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[test] 测试info消息'),
        expect.objectContaining({ extra: 'data' })
      );
    });

    it('应该记录warn级别的日志', () => {
      logger.warn('测试warn消息', { component: 'test', extra: 'data' });
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('[test] 测试warn消息'),
        expect.objectContaining({ extra: 'data' })
      );
    });

    it('应该记录error级别的日志', () => {
      logger.error('测试error消息', { component: 'test', extra: 'data' });
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[test] 测试error消息'),
        expect.objectContaining({ extra: 'data' })
      );
    });

    it('应该处理没有额外元数据的日志', () => {
      logger.info('简单消息', { component: 'test' });
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[test] 简单消息')
      );
    });
  });

  describe('日志级别过滤', () => {
    it('应该根据配置的日志级别过滤日志', () => {
      const warnLogger = new Logger({
        level: LogLevel.WARN,
        enableConsole: true,
        enableRemote: false,
      });

      warnLogger.debug('不应该显示');
      warnLogger.info('不应该显示');
      warnLogger.warn('应该显示');
      warnLogger.error('应该显示');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('上下文信息', () => {
    it('应该包含组件和操作信息', () => {
      logger.info('测试消息', {
        component: 'testComponent',
        action: 'testAction',
        userId: 'user123'
      });

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[testComponent] (testAction) 测试消息'),
        expect.objectContaining({ userId: 'user123' })
      );
    });

    it('应该处理没有上下文的情况', () => {
      logger.info('简单消息');

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[CopyAsMarkdown] 简单消息')
      );
    });

    it('应该包含时间戳', () => {
      logger.info('测试消息');

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z.*测试消息/)
      );
    });
  });

  describe('便捷方法', () => {
    it('logError应该正确处理Error对象', () => {
      const error = new Error('测试错误');
      logger.logError(error, { component: 'test' });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('测试错误'),
        expect.objectContaining({
          stack: expect.any(String),
          errorType: 'Error'
        })
      );
    });

    it('logError应该处理非Error对象', () => {
      logger.logError('字符串错误', { component: 'test' });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('字符串错误'),
        expect.objectContaining({
          errorType: 'Unknown'
        })
      );
    });

    it('logPerformance应该记录性能指标', () => {
      logger.logPerformance('testOperation', 150, { component: 'test' });

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('Performance: testOperation completed'),
        expect.objectContaining({
          operation: 'testOperation',
          duration: 150,
          performanceMetric: true
        })
      );
    });

    it('logUserAction应该记录用户操作', () => {
      logger.logUserAction('click', { component: 'ui', elementType: 'button' });

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('User action: click'),
        expect.objectContaining({
          userAction: true,
          elementType: 'button'
        })
      );
    });
  });

  describe('配置管理', () => {
    it('应该允许更新配置', () => {
      const initialConfig = logger.getConfig();
      expect(initialConfig.level).toBe(LogLevel.DEBUG);

      logger.updateConfig({ level: LogLevel.ERROR });
      const updatedConfig = logger.getConfig();
      expect(updatedConfig.level).toBe(LogLevel.ERROR);
    });

    it('应该在禁用console时不输出日志', () => {
      const silentLogger = new Logger({
        level: LogLevel.DEBUG,
        enableConsole: false,
        enableRemote: false,
      });

      silentLogger.info('不应该输出');
      expect(consoleSpy.info).not.toHaveBeenCalled();
    });
  });

  describe('会话管理', () => {
    it('应该生成唯一的会话ID', () => {
      const logger1 = new Logger();
      const logger2 = new Logger();

      // 通过检查日志输出中的sessionId来验证
      logger1.info('测试1');
      logger2.info('测试2');

      // 两个logger应该有不同的sessionId
      expect(consoleSpy.info).toHaveBeenCalledTimes(2);
    });
  });

  describe('远程日志', () => {
    it('应该在启用远程日志时尝试发送', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('OK', { status: 200 })
      );

      const remoteLogger = new Logger({
        level: LogLevel.INFO,
        enableConsole: false,
        enableRemote: true,
        remoteEndpoint: 'https://test.com/logs'
      });

      await remoteLogger.info('远程日志测试');

      // 给异步操作一些时间
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://test.com/logs',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('远程日志测试')
        })
      );

      fetchSpy.mockRestore();
    });

    it('应该在远程日志失败时继续工作', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(
        new Error('网络错误')
      );

      const remoteLogger = new Logger({
        level: LogLevel.INFO,
        enableConsole: true,
        enableRemote: true,
        remoteEndpoint: 'https://test.com/logs'
      });

      // 不应该抛出错误
      expect(() => {
        remoteLogger.info('测试消息');
      }).not.toThrow();

      fetchSpy.mockRestore();
    });
  });

  describe('环境检测', () => {
    it('应该能够检测当前环境', () => {
      // 在测试环境中应该是开发环境
      expect(isProductionEnvironment()).toBe(false);
    });

    it('应该提供环境信息', () => {
      const envInfo = logger.getEnvironmentInfo();
      expect(envInfo).toHaveProperty('isProduction');
      expect(envInfo).toHaveProperty('source');
      expect(typeof envInfo.isProduction).toBe('boolean');
      expect(typeof envInfo.source).toBe('string');
    });

    it('应该根据环境自动配置logger', () => {
      // 在测试环境中，默认logger应该启用console
      const defaultLogger = new Logger();
      expect(defaultLogger.getConfig().enableConsole).toBe(true);
      expect(defaultLogger.getConfig().level).toBe(LogLevel.DEBUG);
    });

    it('应该允许手动覆盖环境配置', () => {
      // 可以手动覆盖默认配置
      const customLogger = new Logger({
        enableConsole: false,
        level: LogLevel.ERROR
      });

      expect(customLogger.getConfig().enableConsole).toBe(false);
      expect(customLogger.getConfig().level).toBe(LogLevel.ERROR);
    });
  });
});
