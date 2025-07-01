import { useState, useEffect } from 'react';
import { browser } from 'wxt/browser';
import { i18n, setLanguage, getCurrentLanguage, getSupportedLanguages } from '../../../utils/i18n';
import './Settings.css';

interface SettingsProps {
  onClose: () => void;
}

// 主题配置
const getToolbarThemes = () => [
  { key: 'light', name: i18n('settings.toolbarTheme.light'), description: i18n('settings.toolbarTheme.lightDesc') },
  { key: 'dark', name: i18n('settings.toolbarTheme.dark'), description: i18n('settings.toolbarTheme.darkDesc') },
];

const getSelectionColors = () => [
  { key: 'classic', name: i18n('settings.selectionColor.classic'), description: i18n('settings.selectionColor.classicDesc') },
  { key: 'elegant', name: i18n('settings.selectionColor.elegant'), description: i18n('settings.selectionColor.elegantDesc') },
  { key: 'professional', name: i18n('settings.selectionColor.professional'), description: i18n('settings.selectionColor.professionalDesc') },
  { key: 'warm', name: i18n('settings.selectionColor.warm'), description: i18n('settings.selectionColor.warmDesc') },
  { key: 'modern', name: i18n('settings.selectionColor.modern'), description: i18n('settings.selectionColor.modernDesc') },
  { key: 'neutral', name: i18n('settings.selectionColor.neutral'), description: i18n('settings.selectionColor.neutralDesc') },
];

const getLanguageOptions = () => [
  { key: 'en', name: i18n('settings.language.english'), description: 'English interface' },
  { key: 'zh', name: i18n('settings.language.chinese'), description: '中文界面' },
];

export function Settings({ onClose }: SettingsProps) {
  const [toolbarTheme, setToolbarTheme] = useState('light');
  const [selectionColor, setSelectionColor] = useState('elegant');
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(0);

  // 加载当前设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await browser.storage.sync.get(['toolbarTheme', 'selectionColor', 'language']);
        setToolbarTheme(result.toolbarTheme || 'light');
        setSelectionColor(result.selectionColor || 'elegant');
        setCurrentLanguage(getCurrentLanguage());
      } catch (error) {
        console.error(i18n('error.getTabCountFailed'), error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // 保存工具栏主题设置
  const handleToolbarThemeChange = async (theme: string) => {
    setToolbarTheme(theme);
    try {
      await browser.storage.sync.set({ toolbarTheme: theme });
      // 发送消息到content script应用新主题
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        await browser.tabs.sendMessage(tabs[0].id, {
          type: 'SET_TOOLBAR_THEME',
          theme: theme
        });
      }
    } catch (error) {
      console.error(i18n('state.error'), error);
    }
  };

  // 保存选择配色设置
  const handleSelectionColorChange = async (color: string) => {
    setSelectionColor(color);
    try {
      await browser.storage.sync.set({ selectionColor: color });
      // 发送消息到content script应用新配色
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        await browser.tabs.sendMessage(tabs[0].id, {
          type: 'SET_SELECTION_COLOR',
          color: color
        });
      }
    } catch (error) {
      console.error(i18n('state.error'), error);
    }
  };

  // 保存语言设置
  const handleLanguageChange = async (language: string) => {
    setCurrentLanguage(language);
    await setLanguage(language as 'en' | 'zh');
    setForceUpdate(prev => prev + 1); // 强制更新界面

    // 发送语言变更消息到所有标签页的 content 脚本
    try {
      const tabs = await browser.tabs.query({});
      for (const tab of tabs) {
        if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
          try {
            await browser.tabs.sendMessage(tab.id, {
              type: 'SET_LANGUAGE',
              language: language
            });
          } catch (error) {
            // 某些标签页可能无法接收消息，忽略错误
            console.debug('Could not send language message to tab:', tab.id);
          }
        }
      }
    } catch (error) {
      console.error(i18n('state.error'), error);
    }
  };

  const handleResetToDefaults = async () => {
    setToolbarTheme('light');
    setSelectionColor('elegant');
    setCurrentLanguage('en');
    await browser.storage.sync.set({ toolbarTheme: 'light', selectionColor: 'elegant' });
    await setLanguage('en');
    setForceUpdate(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="settings-overlay">
        <div className="settings-container">
          <div className="settings-loading">{i18n('settings.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-overlay">
      <div className="settings-container">
        {/* 标题栏 */}
        <div className="settings-header">
          <div className="settings-header-left">
            <h3 className="settings-title">{i18n('settings.title')}</h3>
            <button
              className="reset-button"
              onClick={handleResetToDefaults}
              title={i18n('tooltip.resetButton')}
            >
              {i18n('settings.resetDefaults')}
            </button>
          </div>
          <button className="settings-close" onClick={onClose} title={i18n('tooltip.closeSettings')}>
            ✕
          </button>
        </div>

        {/* 设置内容 */}
        <div className="settings-content">
          {/* 语言设置 - 优先显示 */}
          <div className="settings-section">
            <h4 className="settings-section-title">{i18n('settings.language.title')}</h4>
            <p className="settings-section-desc">{i18n('settings.language.description')}</p>

            <div className="color-grid">
              {getLanguageOptions().map((language) => (
                <div
                  key={language.key}
                  className={`color-option ${currentLanguage === language.key ? 'active' : ''}`}
                  onClick={() => handleLanguageChange(language.key)}
                >
                  <div className="color-info">
                    <div className="color-name">{language.name}</div>
                    <div className="color-desc">{language.description}</div>
                  </div>
                  {currentLanguage === language.key && (
                    <div className="color-check">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 选择元素配色 */}
          <div className="settings-section">
            <h4 className="settings-section-title">{i18n('settings.selectionColor.title')}</h4>
            <p className="settings-section-desc">{i18n('settings.selectionColor.description')}</p>

            <div className="color-grid">
              {getSelectionColors().map((color) => (
                <div
                  key={color.key}
                  className={`color-option ${selectionColor === color.key ? 'active' : ''}`}
                  onClick={() => handleSelectionColorChange(color.key)}
                >
                  <div className={`color-preview selection-${color.key}`}></div>
                  <div className="color-info">
                    <div className="color-name">{color.name}</div>
                    <div className="color-desc">{color.description}</div>
                  </div>
                  {selectionColor === color.key && (
                    <div className="color-check">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 工具栏主题 */}
          {/* <div className="settings-section">
            <h4 className="settings-section-title">工具栏主题</h4>
            <p className="settings-section-desc">选择复制工具栏的外观主题</p>

            <div className="theme-grid">
              {TOOLBAR_THEMES.map((theme) => (
                <div
                  key={theme.key}
                  className={`theme-option ${toolbarTheme === theme.key ? 'active' : ''}`}
                  onClick={() => handleToolbarThemeChange(theme.key)}
                >
                  <div className={`theme-preview toolbar-${theme.key}`}></div>
                  <div className="theme-info">
                    <div className="theme-name">{theme.name}</div>
                    <div className="theme-desc">{theme.description}</div>
                  </div>
                  {toolbarTheme === theme.key && (
                    <div className="theme-check">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
