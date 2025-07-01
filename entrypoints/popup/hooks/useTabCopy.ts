import { useCallback } from 'react';
import {
  getCurrentActiveTab,
  getCurrentWindowTabs,
  formatTabAsMarkdownLink,
  formatTabsAsMarkdownList
} from '../../../utils/tabs';
import { i18n } from '../../../utils/i18n';
import logger from '../../../utils/logger';

/**
 * 标签页复制功能的自定义Hook
 * 提供复制当前标签页和所有标签页的功能
 */
export const useTabCopy = () => {
  /**
   * 复制当前活跃标签页为Markdown链接
   */
  const copyActiveTab = useCallback(async (): Promise<string> => {
    try {
      logger.info('开始复制活跃标签页', { component: 'popup', action: 'copyActiveTab' });

      const activeTab = await getCurrentActiveTab();

      if (!activeTab) {
        logger.warn(i18n('error.noActiveTab'), { component: 'popup', action: 'copyActiveTab' });
        throw new Error(i18n('error.noActiveTab'));
      }

      if (!activeTab.url || activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
        logger.warn(i18n('error.cannotCopySystemPage'), {
          component: 'popup',
          action: 'copyActiveTab',
          url: activeTab.url
        });
        throw new Error(i18n('error.cannotCopySystemPage'));
      }

      const markdownLink = formatTabAsMarkdownLink(activeTab);

      logger.info('活跃标签页复制成功', {
        component: 'popup',
        action: 'copyActiveTab',
        title: activeTab.title,
        url: activeTab.url,
        markdownLength: markdownLink.length
      });

      return markdownLink;
    } catch (error) {
      logger.logError(error, { component: 'popup', action: 'copyActiveTab' });
      throw error;
    }
  }, []);

  /**
   * 复制当前窗口所有标签页为Markdown列表
   */
  const copyAllTabs = useCallback(async (): Promise<string> => {
    try {
      logger.info('开始复制所有标签页', { component: 'popup', action: 'copyAllTabs' });

      const tabs = await getCurrentWindowTabs();

      if (tabs.length === 0) {
        logger.warn(i18n('error.noTabsFound'), { component: 'popup', action: 'copyAllTabs' });
        throw new Error(i18n('error.noTabsFound'));
      }

      // 过滤掉系统页面
      const validTabs = tabs.filter(tab =>
        tab.url &&
        !tab.url.startsWith('chrome://') &&
        !tab.url.startsWith('chrome-extension://')
      );

      if (validTabs.length === 0) {
        logger.warn(i18n('error.noValidTabs'), {
          component: 'popup',
          action: 'copyAllTabs',
          totalTabs: tabs.length
        });
        throw new Error(i18n('error.noValidTabs'));
      }

      const markdownList = formatTabsAsMarkdownList(validTabs);

      logger.info('所有标签页复制成功', {
        component: 'popup',
        action: 'copyAllTabs',
        totalTabs: tabs.length,
        validTabs: validTabs.length,
        markdownLength: markdownList.length
      });

      return markdownList;
    } catch (error) {
      logger.logError(error, { component: 'popup', action: 'copyAllTabs' });
      throw error;
    }
  }, []);

  return {
    copyActiveTab,
    copyAllTabs,
  };
};
