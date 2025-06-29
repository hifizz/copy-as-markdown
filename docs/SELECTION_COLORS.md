# 选择元素配色系统

## 概述

新的选择配色系统让你可以自定义元素选择时的高亮颜色，兼顾可见性和效率优雅。系统提供了6种精心设计的配色方案，每种都经过优化以确保在各种背景下都有良好的可见性。

## 内置配色方案

### 🟢 绿色系
- **classic**: 经典绿色 - 传统的绿色选择高亮
- **elegant**: 优雅绿色 - 现代化的翠绿色，更柔和优雅 ⭐ *默认*

### 🔵 蓝色系
- **professional**: 专业蓝色 - 与工具栏主题保持一致的专业蓝色

### 🟠 暖色系
- **warm**: 温和橙色 - 温暖的橙色，高可见性且不刺眼

### 🟣 紫色系
- **modern**: 现代紫色 - 富有创新感的现代紫色

### ⚫ 中性系
- **neutral**: 中性灰色 - 最低调的灰色，极简优雅

## 使用方法

### 基本用法

```typescript
import { selectionColorManager } from './entrypoints/content/ui';

// 设置为专业蓝色
selectionColorManager.setScheme('professional');

// 设置为温和橙色
selectionColorManager.setScheme('warm');

// 设置为现代紫色
selectionColorManager.setScheme('modern');

// 获取当前配色方案名称
const currentScheme = selectionColorManager.getCurrentSchemeName();
console.log('当前配色方案:', currentScheme);
```

### 获取配色信息

```typescript
import { SelectionColorManager } from './entrypoints/content/ui';

// 获取所有可用配色方案
const schemes = SelectionColorManager.getAvailableSchemes();
console.log('所有配色方案:', schemes);

// 获取当前配色方案的详细信息
const currentScheme = selectionColorManager.getCurrentScheme();
console.log('当前配色:', {
  name: currentScheme.name,
  description: currentScheme.description
});
```

### 自定义配色方案

```typescript
// 添加自定义配色方案
SelectionColorManager.addScheme('custom', {
  hoverBg: 'rgba(220, 38, 127, 0.15)',
  selectedBg: 'rgba(220, 38, 127, 0.25)',
  hoverOutline: '1px solid rgba(220, 38, 127, 0.5)',
  selectedOutline: '2px solid rgba(220, 38, 127, 0.8)',
  name: '自定义粉色',
  description: '充满活力的粉色配色'
});

// 使用自定义配色
selectionColorManager.setScheme('custom');
```

## 配色参数说明

每个配色方案包含以下参数：

```typescript
interface SelectionColors {
  hoverBg: string;        // 悬停时的背景色
  selectedBg: string;     // 选中时的背景色
  hoverOutline: string;   // 悬停时的边框
  selectedOutline: string; // 选中时的边框
  name: string;           // 配色方案名称
  description: string;    // 配色方案描述
}
```

## 设计建议

### 推荐配色方案

1. **日常使用**: `elegant` (优雅绿色) - 平衡了可见性和优雅性
2. **专业场景**: `professional` (专业蓝色) - 与工具栏主题一致
3. **高对比度需求**: `warm` (温和橙色) - 最佳可见性
4. **极简主义**: `neutral` (中性灰色) - 最低调优雅

### 自定义配色原则

1. **对比度**: 确保在白色和深色背景上都有足够的对比度
2. **透明度**: 背景色应使用透明度，避免完全遮挡原内容
3. **边框**: 边框应比背景色更深，提供清晰的选择边界
4. **渐进性**: 悬停状态应比选中状态更浅

## 完整示例

```typescript
import { selectionColorManager, SelectionColorManager } from './entrypoints/content/ui';

// 查看所有可用配色
const allSchemes = SelectionColorManager.getAvailableSchemes();
Object.entries(allSchemes).forEach(([key, scheme]) => {
  console.log(`${key}: ${scheme.name} - ${scheme.description}`);
});

// 设置为专业蓝色
selectionColorManager.setScheme('professional');

// 创建自定义配色方案
SelectionColorManager.addScheme('ocean', {
  hoverBg: 'rgba(14, 165, 233, 0.15)',
  selectedBg: 'rgba(14, 165, 233, 0.25)',
  hoverOutline: '1px solid rgba(14, 165, 233, 0.5)',
  selectedOutline: '2px solid rgba(14, 165, 233, 0.8)',
  name: '海洋蓝',
  description: '清新的海洋蓝色'
});

// 使用自定义配色
selectionColorManager.setScheme('ocean');
```
