import React, { useState } from 'react';
import { i18n } from '../../../utils/i18n';
import './MenuButton.css';

export interface MenuButtonProps {
  /** 按钮图标 */
  icon: string;
  /** 按钮主标签 */
  label: string;
  /** 按钮描述文本 */
  description?: string;
  /** 点击时执行的操作 */
  onAction: () => Promise<string>;
  /** 按钮的样式变体 */
  variant?: 'primary' | 'secondary';
  /** 是否禁用按钮 */
  disabled?: boolean;
  /** 自定义CSS类名 */
  className?: string;
}

/**
 * 菜单式按钮组件
 * 提供类似右键菜单的交互体验
 */
export const MenuButton: React.FC<MenuButtonProps> = ({
  icon,
  label,
  description,
  onAction,
  variant = 'primary',
  disabled = false,
  className = '',
}) => {
  const [status, setStatus] = useState<'idle' | 'copying' | 'success' | 'error'>('idle');

  const handleClick = async () => {
    if (disabled || status === 'copying') {
      return;
    }

    setStatus('copying');

    try {
      const text = await onAction();

      if (text) {
        // 复制到剪贴板
        await navigator.clipboard.writeText(text);
        setStatus('success');

        // 1.5秒后重置状态
        setTimeout(() => setStatus('idle'), 1500);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 1500);
      }
    } catch (error) {
      console.error(i18n('state.error'), error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 1500);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'copying':
        return '⟳';
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      default:
        return icon;
    }
  };

  const getButtonClass = () => {
    const baseClass = 'menu-button';
    const variantClass = `menu-button--${variant}`;
    const statusClass = status !== 'idle' ? `menu-button--${status}` : '';

    return [baseClass, variantClass, statusClass, className]
      .filter(Boolean)
      .join(' ');
  };

  return (
    <button
      className={getButtonClass()}
      onClick={handleClick}
      disabled={disabled || status === 'copying'}
      type="button"
    >
      <div className="menu-button__icon">
        {getStatusIcon()}
      </div>

      <div className="menu-button__content">
        <div className="menu-button__label">
          {label}
        </div>
        {description && (
          <div className="menu-button__description">
            {description}
          </div>
        )}
      </div>

      {status === 'copying' && (
        <div className="menu-button__spinner" aria-hidden="true">
          <div className="spinner"></div>
        </div>
      )}
    </button>
  );
};
