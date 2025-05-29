import { useState, useEffect } from 'react';
import { browser } from 'wxt/browser';
import { MenuButton } from './components/MenuButton';
import { useTabCopy } from './hooks/useTabCopy';
import './App.css';

function App() {
  const { copyActiveTab, copyAllTabs } = useTabCopy();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [tabCount, setTabCount] = useState(0);

  // 检测系统主题
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 获取标签页数量
  useEffect(() => {
    const getTabCount = async () => {
      try {
        const tabs = await browser.tabs.query({ currentWindow: true });
        const validTabs = tabs.filter(tab =>
          tab.url &&
          !tab.url.startsWith('chrome://') &&
          !tab.url.startsWith('chrome-extension://')
        );
        setTabCount(validTabs.length);
      } catch (error) {
        console.error('获取标签页数量失败:', error);
        setTabCount(0);
      }
    };

    getTabCount();
  }, []);

  // 复制当前标签页链接
  const handleCopyCurrentTabLink = async () => {
    return await copyActiveTab();
  };

  // 复制所有标签页链接
  const handleCopyAllTabsLinks = async () => {
    return await copyAllTabs();
  };

  // 复制当前标签页标题
  const handleCopyCurrentTabTitle = async () => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      return activeTab?.title || '无标题';
    } catch (error) {
      console.error('获取标签页标题失败:', error);
      return '';
    }
  };

  // 复制当前标签页URL
  const handleCopyCurrentTabUrl = async () => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      return activeTab?.url || '';
    } catch (error) {
      console.error('获取标签页URL失败:', error);
      return '';
    }
  };

  // 复制所有标签页标题
  const handleCopyAllTabsTitles = async () => {
    try {
      const tabs = await browser.tabs.query({ currentWindow: true });
      const titles = tabs
        .filter(tab => tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://'))
        .map(tab => tab.title || '无标题')
        .map(title => `- ${title}`)
        .join('\n');
      return titles;
    } catch (error) {
      console.error('获取标签页标题失败:', error);
      return '';
    }
  };

  // 复制所有标签页URL
  const handleCopyAllTabsUrls = async () => {
    try {
      const tabs = await browser.tabs.query({ currentWindow: true });
      const urls = tabs
        .filter(tab => tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://'))
        .map(tab => tab.url)
        .map(url => `- ${url}`)
        .join('\n');
      return urls;
    } catch (error) {
      console.error('获取标签页URL失败:', error);
      return '';
    }
  };

  return (
    <div className={`popup-container ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="popup-menu">
        {/* 高频功能区 */}
        <div className="menu-section">
          <div className="section-label">常用功能</div>

          <MenuButton
            icon="●"
            label={`复制所有标签页链接 (${tabCount})`}
            description="- [页面标题](URL) 格式"
            onAction={handleCopyAllTabsLinks}
            variant="primary"
          />

          <MenuButton
            icon="○"
            label="复制当前标签页链接"
            description="[页面标题](URL) 单行格式"
            onAction={handleCopyCurrentTabLink}
            variant="primary"
          />
        </div>

        {/* 分隔线 */}
        <div className="menu-divider"></div>

        {/* 低频功能区 */}
        <div className="menu-section">
          <div className="section-label">其他选项</div>

          <MenuButton
            icon="■"
            label={`复制所有标签页标题 (${tabCount})`}
            description="- 页面标题1 （多行格式）"
            onAction={handleCopyAllTabsTitles}
            variant="secondary"
          />

          <MenuButton
            icon="□"
            label={`复制所有标签页URL (${tabCount})`}
            description="- https://example.com （多行格式）"
            onAction={handleCopyAllTabsUrls}
            variant="secondary"
          />

          <MenuButton
            icon="▲"
            label="复制当前标签页标题"
            description="纯标题文本"
            onAction={handleCopyCurrentTabTitle}
            variant="secondary"
          />

          <MenuButton
            icon="△"
            label="复制当前标签页URL"
            description="https://example.com"
            onAction={handleCopyCurrentTabUrl}
            variant="secondary"
          />
        </div>
      </div>
    </div>
  );
}

export default App;
