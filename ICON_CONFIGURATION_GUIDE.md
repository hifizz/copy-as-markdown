# WXT 图标配置指南

## 当前状态

您的项目已有以下图标文件：

### Dark 主题图标 (当前使用)
- `public/icon/dark_16.png`
- `public/icon/dark_32.png`
- `public/icon/dark_48.png`
- `public/icon/dark_96.png`
- `public/icon/dark_128.png`
- `public/icon/dark_2x.png` (Retina)
- `public/icon/dark_3x.png` (高密度屏幕)

### Light 主题图标 (备用)
- `public/icon/light_16.png`
- `public/icon/light_32.png`
- `public/icon/light_48.png`
- `public/icon/light_96.png`
- `public/icon/light_128.png`
- `public/icon/light_2x.png` (Retina)
- `public/icon/light_3x.png` (高密度屏幕)

## 配置方案

### 方案一：手动配置 (推荐 - 当前使用)

在 `wxt.config.ts` 中直接配置图标：

```typescript
export default defineConfig({
  manifest: {
    icons: {
      '16': '/icon/dark_16.png',
      '32': '/icon/dark_32.png',
      '48': '/icon/dark_48.png',
      '96': '/icon/dark_96.png',
      '128': '/icon/dark_128.png',
    },
    // ... 其他配置
  },
});
```

**优点：**
- 完全控制图标设置
- 配置简单明了
- 适合固定主题的扩展

**缺点：**
- 需要手动管理不同尺寸
- 不支持自动主题切换

### 方案二：动态主题图标配置

支持根据系统主题动态切换图标：

```typescript
export default defineConfig({
  manifest: ({ mode }) => ({
    icons: {
      '16': mode === 'development' ? '/icon/dark_16.png' : '/icon/light_16.png',
      '32': mode === 'development' ? '/icon/dark_32.png' : '/icon/light_32.png',
      '48': mode === 'development' ? '/icon/dark_48.png' : '/icon/light_48.png',
      '96': mode === 'development' ? '/icon/dark_96.png' : '/icon/light_96.png',
      '128': mode === 'development' ? '/icon/dark_128.png' : '/icon/light_128.png',
    },
    // ... 其他配置
  }),
});
```

### 方案三：使用 @wxt-dev/auto-icons 模块

自动化图标处理：

```typescript
export default defineConfig({
  modules: [
    '@wxt-dev/module-react',
    '@wxt-dev/auto-icons'
  ],
  // auto-icons 会自动处理图标配置
});
```

**使用条件：**
- 需要安装 `@wxt-dev/auto-icons`
- 适合需要自动生成多种尺寸的场景

## 图标尺寸说明

| 尺寸 | 用途 | 推荐场景 |
|-----|------|---------|
| 16px | 扩展图标、菜单项 | 浏览器工具栏 |
| 32px | 扩展管理页面 | Chrome扩展管理 |
| 48px | 扩展详情页面 | 扩展商店列表 |
| 96px | 扩展详情页面 | 扩展商店详情 |
| 128px | Chrome 网上应用店 | 商店主图标 |

## 高密度屏幕支持

您的 `2x` 和 `3x` 图标文件可以这样配置：

```typescript
icons: {
  '16': '/icon/dark_16.png',
  '32': '/icon/dark_2x.png',  // 32px = 16px * 2x
  '48': '/icon/dark_48.png',
  '96': '/icon/dark_3x.png',  // 48px * 2x 或其他用途
  '128': '/icon/dark_128.png',
}
```

## 浏览器兼容性

| 浏览器 | 支持尺寸 | 特殊说明 |
|--------|---------|---------|
| Chrome | 16, 32, 48, 128 | 推荐所有尺寸 |
| Firefox | 16, 32, 48, 96 | 不使用128px |
| Safari | 16, 32, 48, 96, 128 | 全尺寸支持 |
| Edge | 16, 32, 48, 128 | 与Chrome相同 |

## 最佳实践

1. **使用PNG格式**：所有主流浏览器都支持
2. **保持透明背景**：适应不同主题
3. **优化文件大小**：影响扩展加载速度
4. **测试不同主题**：确保在亮色/暗色主题下都清晰
5. **提供多种尺寸**：确保在不同场景下显示清晰

## 主题切换实现 (高级)

如果需要运行时主题切换，可以在background script中：

```typescript
// background.ts
browser.action.setIcon({
  path: {
    16: browser.runtime.getURL('icon/light_16.png'),
    32: browser.runtime.getURL('icon/light_32.png'),
    48: browser.runtime.getURL('icon/light_48.png'),
    128: browser.runtime.getURL('icon/light_128.png'),
  }
});
```

## 当前推荐配置

基于您的项目状况，建议继续使用**方案一（手动配置）**，因为：

1. 配置简单直接
2. 完全可控
3. 已有完整的图标集
4. 无需额外依赖

如需切换主题，可以修改配置文件中的图标路径即可。
