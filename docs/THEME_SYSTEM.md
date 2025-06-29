# Toolbar 主题系统文档

## 概述

新的主题系统允许你轻松管理和切换 Copy as Markdown 工具栏的多种主题。系统支持内置主题、自定义主题以及自动主题检测。

## 内置主题

系统预设了以下专业配色主题，专为效率软件设计：

### 经典配色
- **light**: 纯白背景 + 深灰文字 (仿照 Notion 风格)
- **dark**: 深灰背景 + 白色文字 (经典深色模式)

### 专业蓝灰色系
- **professional**: 极浅蓝灰背景 + 深蓝灰文字 (仿照 Linear 风格)
- **midnight**: 深蓝灰背景 + 浅蓝灰文字 (仿照 Raycast 风格)

### 创新紫色系
- **purple**: 浅灰白背景 + 深灰文字 + 紫色边框 (现代简约风格)
- **violet**: 深紫背景 + 浅紫文字 (仿照 Discord 风格)

## 使用方法

### 基本用法

```typescript
import { themeManager } from './entrypoints/content/ui';

// 设置为特定主题
themeManager.setTheme('dark');
themeManager.setTheme('professional');
themeManager.setTheme('midnight');
themeManager.setTheme('violet');

// 设置为自动主题（根据系统主题切换）
themeManager.setTheme('auto');

// 获取当前主题名称
const currentTheme = themeManager.getCurrentThemeName();
console.log('当前主题:', currentTheme);
```

### 添加自定义主题

```typescript
import { ThemeManager } from './entrypoints/content/ui';

// 添加自定义主题
ThemeManager.addTheme('ocean', {
  toolbarBg: '#0F172A',        // 深海蓝背景
  toolbarText: '#7DD3FC',      // 浅蓝色文字
  buttonHover: 'rgba(125, 211, 252, 0.15)', // 按钮悬停效果
  toolbarShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
  toolbarBorder: '1px solid rgba(56, 189, 248, 0.3)',
});

// 使用自定义主题
themeManager.setTheme('ocean');
```

### 管理主题

```typescript
// 获取所有可用主题
const themes = ThemeManager.getAvailableThemes();
console.log('所有主题:', themes); // ['light', 'dark', 'professional', 'midnight', 'purple', 'violet']

// 检查主题是否存在
const hasTheme = ThemeManager.hasTheme('ocean');
console.log('Ocean主题存在:', hasTheme); // true
```

## 主题配色方案

每个主题包含以下颜色配置：

```typescript
interface ThemeColors {
  toolbarBg: string;      // 工具栏背景色
  toolbarText: string;    // 工具栏文字颜色
  buttonHover: string;    // 按钮悬停效果
  toolbarShadow: string;  // 工具栏阴影
  toolbarBorder: string;  // 工具栏边框
}
```

## 最佳实践

1. **颜色对比度**: 确保文字和背景有足够的对比度以保证可读性
2. **一致性**: 保持与应用整体设计风格的一致性
3. **可访问性**: 考虑色盲用户的需求，避免仅依赖颜色传达信息
4. **测试**: 在不同环境下测试主题效果

## 示例：创建自定义主题

```typescript
// 创建一个仿照 GitHub 风格的主题
ThemeManager.addTheme('github', {
  toolbarBg: '#F6F8FA',
  toolbarText: '#24292F',
  buttonHover: 'rgba(36, 41, 47, 0.04)',
  toolbarShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
  toolbarBorder: '1px solid #D1D9E0',
});

// 创建一个橙色主题
ThemeManager.addTheme('orange', {
  toolbarBg: '#FFF7ED',
  toolbarText: '#9A3412',
  buttonHover: 'rgba(154, 52, 18, 0.06)',
  toolbarShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  toolbarBorder: '1px solid rgba(234, 88, 12, 0.2)',
});

// 使用自定义主题
themeManager.setTheme('github');
```
