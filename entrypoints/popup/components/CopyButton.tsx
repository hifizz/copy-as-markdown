import React, { useState } from 'react';
import './CopyButton.css';

export interface CopyButtonProps {
  /** 按钮显示的文本 */
  children: React.ReactNode;
  /** 点击时执行的复制操作 */
  onCopy: () => Promise<string>;
  /** 按钮的样式变体 */
  variant?: 'primary' | 'secondary';
  /** 是否禁用按钮 */
  disabled?: boolean;
  /** 自定义CSS类名 */
  className?: string;
}

/**
 * 可复用的复制按钮组件
 * 提供统一的复制功能和用户反馈
 */
export const CopyButton: React.FC<CopyButtonProps> = ({
  children,
  onCopy,
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
      const text = await onCopy();

      if (text) {
        // 复制到剪贴板
        await navigator.clipboard.writeText(text);
        setStatus('success');

        // 2秒后重置状态
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('复制失败:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'copying':
        return '复制中...';
      case 'success':
        return '已复制!';
      case 'error':
        return '复制失败';
      default:
        return children;
    }
  };

  const getButtonClass = () => {
    const baseClass = 'copy-button';
    const variantClass = `copy-button--${variant}`;
    const statusClass = status !== 'idle' ? `copy-button--${status}` : '';

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
      <span className="copy-button__text">
        {getButtonText()}
      </span>
      {status === 'copying' && (
        <span className="copy-button__spinner" aria-hidden="true">
          ⟳
        </span>
      )}
      {status === 'success' && (
        <span className="copy-button__icon" aria-hidden="true">
          ✓
        </span>
      )}
      {status === 'error' && (
        <span className="copy-button__icon" aria-hidden="true">
          ✗
        </span>
      )}
    </button>
  );
};
