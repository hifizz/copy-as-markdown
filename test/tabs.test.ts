import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock browser API - 必须在顶层定义
vi.mock('wxt/browser', () => ({
  browser: {
    tabs: {
      query: vi.fn(),
    },
  },
}));

// 导入需要测试的函数
import {
  formatTabAsMarkdownLink,
  formatTabsAsMarkdownList,
  getCurrentActiveTab,
  getCurrentWindowTabs
} from '../utils/tabs';
import type { TabInfo } from '../utils/tabs';
import { browser, type Browser } from 'wxt/browser';

describe('标签页工具函数', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatTabAsMarkdownLink', () => {
    it('应该正确格式化标签页为Markdown链接', () => {
      const tab: TabInfo = {
        id: 1,
        title: 'GitHub',
        url: 'https://github.com'
      };

      const result = formatTabAsMarkdownLink(tab);
      expect(result).toBe('[GitHub](https://github.com)');
    });

    it('应该处理包含方括号的标题', () => {
      const tab: TabInfo = {
        id: 1,
        title: '[重要] GitHub 文档',
        url: 'https://github.com/docs'
      };

      const result = formatTabAsMarkdownLink(tab);
      expect(result).toBe('[重要 GitHub 文档](https://github.com/docs)');
    });

    it('应该处理空标题', () => {
      const tab: TabInfo = {
        id: 1,
        title: '',
        url: 'https://example.com'
      };

      const result = formatTabAsMarkdownLink(tab);
      expect(result).toBe('[无标题](https://example.com)');
    });

    it('应该处理undefined标题', () => {
      const tab: TabInfo = {
        id: 1,
        url: 'https://example.com'
      };

      const result = formatTabAsMarkdownLink(tab);
      expect(result).toBe('[无标题](https://example.com)');
    });
  });

  describe('formatTabsAsMarkdownList', () => {
    it('应该正确格式化多个标签页为Markdown列表', () => {
      const tabs: TabInfo[] = [
        { id: 1, title: 'GitHub', url: 'https://github.com' },
        { id: 2, title: 'Google', url: 'https://google.com' },
        { id: 3, title: 'Stack Overflow', url: 'https://stackoverflow.com' }
      ];

      const result = formatTabsAsMarkdownList(tabs);
      const expected = [
        '- [GitHub](https://github.com)',
        '- [Google](https://google.com)',
        '- [Stack Overflow](https://stackoverflow.com)'
      ].join('\n');

      expect(result).toBe(expected);
    });

    it('应该过滤掉系统页面', () => {
      const tabs: TabInfo[] = [
        { id: 1, title: 'GitHub', url: 'https://github.com' },
        { id: 2, title: 'Chrome Settings', url: 'chrome://settings/' },
        { id: 3, title: 'Extension', url: 'chrome-extension://abc123/popup.html' },
        { id: 4, title: 'Google', url: 'https://google.com' }
      ];

      const result = formatTabsAsMarkdownList(tabs);
      const expected = [
        '- [GitHub](https://github.com)',
        '- [Google](https://google.com)'
      ].join('\n');

      expect(result).toBe(expected);
    });

    it('应该处理空数组', () => {
      const tabs: TabInfo[] = [];
      const result = formatTabsAsMarkdownList(tabs);
      expect(result).toBe('');
    });

    it('应该处理只有系统页面的情况', () => {
      const tabs: TabInfo[] = [
        { id: 1, title: 'Chrome Settings', url: 'chrome://settings/' },
        { id: 2, title: 'Extension', url: 'chrome-extension://abc123/popup.html' }
      ];

      const result = formatTabsAsMarkdownList(tabs);
      expect(result).toBe('');
    });
  });

  describe('getCurrentActiveTab', () => {
    it('应该返回当前活跃标签页', async () => {
      const mockTab = {
        id: 1,
        title: 'Test Page',
        url: 'https://example.com',
        active: true
      } as Browser.tabs.Tab;

      vi.mocked(browser.tabs.query).mockResolvedValue([mockTab]);

      const result = await getCurrentActiveTab();

      expect(browser.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true
      });
      expect(result).toEqual({
        id: 1,
        title: 'Test Page',
        url: 'https://example.com'
      });
    });

    it('应该处理没有活跃标签页的情况', async () => {
      vi.mocked(browser.tabs.query).mockResolvedValue([]);

      const result = await getCurrentActiveTab();

      expect(result).toBeNull();
    });

    it('应该处理API错误', async () => {
      vi.mocked(browser.tabs.query).mockRejectedValue(new Error('API Error'));

      const result = await getCurrentActiveTab();

      expect(result).toBeNull();
    });
  });

  describe('getCurrentWindowTabs', () => {
    it('应该返回当前窗口的所有标签页', async () => {
      const mockTabs = [
        { id: 1, title: 'Tab 1', url: 'https://example1.com' },
        { id: 2, title: 'Tab 2', url: 'https://example2.com' },
        { id: 3, title: 'Tab 3', url: 'https://example3.com' }
      ] as Browser.tabs.Tab[];

      vi.mocked(browser.tabs.query).mockResolvedValue(mockTabs);

      const result = await getCurrentWindowTabs();

      expect(browser.tabs.query).toHaveBeenCalledWith({
        currentWindow: true
      });
      expect(result).toEqual([
        { id: 1, title: 'Tab 1', url: 'https://example1.com' },
        { id: 2, title: 'Tab 2', url: 'https://example2.com' },
        { id: 3, title: 'Tab 3', url: 'https://example3.com' }
      ]);
    });

    it('应该处理空标签页列表', async () => {
      vi.mocked(browser.tabs.query).mockResolvedValue([]);

      const result = await getCurrentWindowTabs();

      expect(result).toEqual([]);
    });

    it('应该处理API错误', async () => {
      vi.mocked(browser.tabs.query).mockRejectedValue(new Error('API Error'));

      const result = await getCurrentWindowTabs();

      expect(result).toEqual([]);
    });

    it('应该处理缺少标题或URL的标签页', async () => {
      const mockTabs = [
        { id: 1, url: 'https://example1.com' }, // 缺少标题
        { id: 2, title: 'Tab 2' }, // 缺少URL
        { id: 3, title: 'Tab 3', url: 'https://example3.com' }
      ] as Browser.tabs.Tab[];

      vi.mocked(browser.tabs.query).mockResolvedValue(mockTabs);

      const result = await getCurrentWindowTabs();

      expect(result).toEqual([
        { id: 1, title: '无标题', url: 'https://example1.com' },
        { id: 2, title: 'Tab 2', url: '' },
        { id: 3, title: 'Tab 3', url: 'https://example3.com' }
      ]);
    });
  });
});
