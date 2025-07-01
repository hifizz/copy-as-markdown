import { useState, useEffect } from 'react';
import { browser } from 'wxt/browser';
import { MenuButton } from './components/MenuButton';
import { Settings } from './components/Settings';
import { useTabCopy } from './hooks/useTabCopy';
import { i18n, initI18n } from '../../utils/i18n';
import { registerAllLanguagePackages } from '../../locales';
import './App.css';

function App() {
  const { copyActiveTab, copyAllTabs } = useTabCopy();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [tabCount, setTabCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isI18nReady, setIsI18nReady] = useState(false);

  // 初始化多语言系统
  useEffect(() => {
    const initLanguage = async () => {
      registerAllLanguagePackages();
      await initI18n();
      setIsI18nReady(true);
    };

    initLanguage();
  }, []);

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
        console.error(i18n('error.getTabCountFailed'), error);
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
      return activeTab?.title || i18n('error.noTitle');
    } catch (error) {
      console.error(i18n('error.getTabTitleFailed'), error);
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
      console.error(i18n('error.getTabUrlFailed'), error);
      return '';
    }
  };

  // 复制所有标签页标题
  const handleCopyAllTabsTitles = async () => {
    try {
      const tabs = await browser.tabs.query({ currentWindow: true });
      const titles = tabs
        .filter(tab => tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://'))
        .map(tab => tab.title || i18n('error.noTitle'))
        .map(title => `- ${title}`)
        .join('\n');
      return titles;
    } catch (error) {
      console.error(i18n('error.getTabTitleFailed'), error);
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
      console.error(i18n('error.getTabUrlFailed'), error);
      return '';
    }
  };

  // 如果多语言还未准备好，显示加载状态
  if (!isI18nReady) {
    return (
      <div className={`popup-container ${isDarkMode ? 'dark' : 'light'}`}>
        <div className="popup-menu">
          <div className="menu-section">
            <div className="section-label">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`popup-container ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="popup-menu">
        {/* 设置按钮 */}
        <div className="menu-section">
          <div className="popup-header">
            <div className="section-label">{i18n('app.title')}</div>
            <button
              className="settings-button"
              onClick={() => setShowSettings(true)}
              title={i18n('tooltip.settingsButton')}
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* 高频功能区 */}
        <div className="menu-section">
          <div className="section-label">{i18n('app.commonFeatures')}</div>

          <MenuButton
            icon="●"
            label={i18n('button.copyAllTabs', { count: tabCount })}
            description={i18n('description.markdownFormat')}
            onAction={handleCopyAllTabsLinks}
            variant="primary"
          />

          <MenuButton
            icon="○"
            label={i18n('button.copyCurrentTab')}
            description={i18n('description.singleLineFormat')}
            onAction={handleCopyCurrentTabLink}
            variant="primary"
          />
        </div>

        {/* 分隔线 */}
        <div className="menu-divider"></div>

        {/* 低频功能区 */}
        <div className="menu-section">
          <div className="section-label">{i18n('app.otherOptions')}</div>

          <MenuButton
            icon="■"
            label={i18n('button.copyAllTitles', { count: tabCount })}
            description={i18n('description.multiLineFormat')}
            onAction={handleCopyAllTabsTitles}
            variant="secondary"
          />

          <MenuButton
            icon="□"
            label={i18n('button.copyAllUrls', { count: tabCount })}
            description={i18n('description.urlFormat')}
            onAction={handleCopyAllTabsUrls}
            variant="secondary"
          />

          <MenuButton
            icon="▲"
            label={i18n('button.copyCurrentTitle')}
            description={i18n('description.plainTitle')}
            onAction={handleCopyCurrentTabTitle}
            variant="secondary"
          />

          <MenuButton
            icon="△"
            label={i18n('button.copyCurrentUrl')}
            description={i18n('description.plainUrl')}
            onAction={handleCopyCurrentTabUrl}
            variant="secondary"
          />
        </div>
      </div>

      {/* 设置页面 */}
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

export default App;
