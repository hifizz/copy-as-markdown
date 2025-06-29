import { useState, useEffect } from 'react';
import { browser } from 'wxt/browser';
import './Settings.css';

interface SettingsProps {
  onClose: () => void;
}

// 主题配置
const TOOLBAR_THEMES = [
  { key: 'light', name: '经典白色', description: '纯白背景，深灰文字' },
  { key: 'dark', name: '经典深色', description: '深灰背景，白色文字' },
];

const SELECTION_COLORS = [
  { key: 'classic', name: '经典绿色', description: '传统的绿色选择高亮' },
  { key: 'elegant', name: '优雅绿色', description: '现代化翠绿色，更柔和' },
  { key: 'professional', name: '专业蓝色', description: '与工具栏主题一致' },
  { key: 'warm', name: '温和橙色', description: '高可见性，不刺眼' },
  { key: 'modern', name: '现代紫色', description: '富有创新感' },
  { key: 'neutral', name: '中性灰色', description: '最低调优雅' },
];

export function Settings({ onClose }: SettingsProps) {
  const [toolbarTheme, setToolbarTheme] = useState('light');
  const [selectionColor, setSelectionColor] = useState('elegant');
  const [isLoading, setIsLoading] = useState(true);

  // 加载当前设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await browser.storage.sync.get(['toolbarTheme', 'selectionColor']);
        setToolbarTheme(result.toolbarTheme || 'light');
        setSelectionColor(result.selectionColor || 'elegant');
      } catch (error) {
        console.error('加载设置失败:', error);
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
      console.error('保存工具栏主题失败:', error);
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
      console.error('保存选择配色失败:', error);
    }
  };

  const handleResetToDefaults = async () => {
    setToolbarTheme('light');
    setSelectionColor('elegant');
    await browser.storage.sync.set({ toolbarTheme: 'light', selectionColor: 'elegant' });
  };

  if (isLoading) {
    return (
      <div className="settings-overlay">
        <div className="settings-container">
          <div className="settings-loading">加载中...</div>
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
            <h3 className="settings-title">主题设置</h3>
            <button
              className="reset-button"
              onClick={handleResetToDefaults}
            >
              🔄 恢复默认设置
            </button>
          </div>
          <button className="settings-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 设置内容 */}
        <div className="settings-content">
          {/* 选择元素配色 - 优先显示 */}
          <div className="settings-section">
            <h4 className="settings-section-title">选择元素配色</h4>
            <p className="settings-section-desc">选择元素高亮时的颜色方案</p>

            <div className="color-grid">
              {SELECTION_COLORS.map((color) => (
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
