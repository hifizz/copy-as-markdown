import { browser } from 'wxt/browser';
import logger from './logger';

/**
 * 标签页信息接口
 */
export interface TabInfo {
  id?: number;
  title?: string;
  url?: string;
}

/**
 * 获取当前活跃的标签页
 */
export async function getCurrentActiveTab(): Promise<TabInfo | null> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (!activeTab) {
      logger.warn('未找到活跃标签页', { component: 'tabs', action: 'getCurrentActiveTab' });
      return null;
    }

    logger.debug('获取到活跃标签页', {
      component: 'tabs',
      action: 'getCurrentActiveTab',
      tabId: activeTab.id,
      title: activeTab.title,
      url: activeTab.url
    });

    return {
      id: activeTab.id,
      title: activeTab.title || '无标题',
      url: activeTab.url || ''
    };
  } catch (error) {
    logger.logError(error, {
      component: 'tabs',
      action: 'getCurrentActiveTab'
    });
    return null;
  }
}

/**
 * 获取当前窗口的所有标签页
 */
export async function getCurrentWindowTabs(): Promise<TabInfo[]> {
  try {
    const tabs = await browser.tabs.query({ currentWindow: true });

    const tabInfos = tabs.map(tab => ({
      id: tab.id,
      title: tab.title || '无标题',
      url: tab.url || ''
    }));

    logger.debug('获取到当前窗口标签页', {
      component: 'tabs',
      action: 'getCurrentWindowTabs',
      tabCount: tabInfos.length
    });

    return tabInfos;
  } catch (error) {
    logger.logError(error, {
      component: 'tabs',
      action: 'getCurrentWindowTabs'
    });
    return [];
  }
}

/**
 * 将标签页信息转换为Markdown链接格式
 */
export function formatTabAsMarkdownLink(tab: TabInfo): string {
  const title = tab.title && tab.title.trim() ? tab.title.trim() : '无标题';
  const url = tab.url || '';

  // 清理标题中的特殊字符，避免破坏Markdown格式
  const cleanTitle = title.replace(/[\[\]]/g, '');

  return `[${cleanTitle}](${url})`;
}

/**
 * 将多个标签页信息转换为Markdown列表格式
 */
export function formatTabsAsMarkdownList(tabs: TabInfo[]): string {
  if (tabs.length === 0) {
    return '';
  }

  return tabs
    .filter(tab => tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://'))
    .map(tab => `- ${formatTabAsMarkdownLink(tab)}`)
    .join('\n');
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    logger.info('文本已复制到剪贴板', {
      component: 'tabs',
      action: 'copyToClipboard',
      textLength: text.length
    });
    return true;
  } catch (error) {
    logger.logError(error, {
      component: 'tabs',
      action: 'copyToClipboard'
    });
    return false;
  }
}
