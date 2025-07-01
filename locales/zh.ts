import { LanguagePackage } from '../utils/i18n';

export const zhLanguagePackage: LanguagePackage = {
  app: {
    title: 'Copy as Markdown',
    commonFeatures: '常用功能',
    otherOptions: '其他选项',
  },

  button: {
    copyAllTabs: '复制所有标签页链接 ({{count}})',
    copyCurrentTab: '复制当前标签页链接',
    copyAllTitles: '复制所有标签页标题 ({{count}})',
    copyAllUrls: '复制所有标签页URL ({{count}})',
    copyCurrentTitle: '复制当前标签页标题',
    copyCurrentUrl: '复制当前标签页URL',
  },

  description: {
    markdownFormat: '- [页面标题](URL) 格式',
    singleLineFormat: '[页面标题](URL) 单行格式',
    multiLineFormat: '- 页面标题1 （多行格式）',
    urlFormat: '- https://example.com （多行格式）',
    plainTitle: '纯标题文本',
    plainUrl: 'https://example.com',
  },

  state: {
    copying: '复制中...',
    copied: '已复制!',
    failed: '复制失败',
    error: '操作失败',
  },

  error: {
    noTitle: '无标题',
    getTabCountFailed: '获取标签页数量失败:',
    getTabTitleFailed: '获取标签页标题失败:',
    getTabUrlFailed: '获取标签页URL失败:',
    noActiveTab: '未找到活跃标签页',
    cannotCopySystemPage: '无法复制系统页面',
    noTabsFound: '未找到标签页',
    noValidTabs: '没有有效的标签页可复制',
  },

  settings: {
    title: '主题设置',
    resetDefaults: '恢复默认设置',
    loading: '加载中...',
    selectionColor: {
      title: '选择元素配色',
      description: '选择元素高亮时的颜色方案',
      classic: '经典绿色',
      classicDesc: '传统的绿色选择高亮',
      elegant: '优雅绿色',
      elegantDesc: '现代化翠绿色，更柔和',
      professional: '专业蓝色',
      professionalDesc: '与工具栏主题一致',
      warm: '温和橙色',
      warmDesc: '高可见性，不刺眼',
      modern: '现代紫色',
      modernDesc: '富有创新感',
      neutral: '中性灰色',
      neutralDesc: '最低调优雅',
    },
    toolbarTheme: {
      title: '工具栏主题',
      description: '选择复制工具栏的外观主题',
      light: '经典白色',
      lightDesc: '纯白背景，深灰文字',
      dark: '经典深色',
      darkDesc: '深灰背景，白色文字',
    },
    language: {
      title: '语言设置',
      description: '选择界面显示语言',
      auto: '自动检测',
      english: 'English',
      chinese: '中文',
    },
  },

  tooltip: {
    settingsButton: '主题设置',
    closeSettings: '关闭设置',
    resetButton: '🔄 恢复默认设置',
  },

  // Content 脚本相关文案
  content: {
    toolbar: {
      copy: '复制',
      copying: '复制中...',
      copied: '已复制!',
      error: '错误!',
      repick: '重新选择',
      cancel: '取消选择',
    },
    toast: {
      success: '成功!',
      error: '错误!',
      copiedToClipboard: '已复制到剪贴板!',
      copyFailed: '复制失败',
    },
    selectionSchemes: {
      classic: {
        name: '经典绿色',
        description: '传统的绿色选择高亮，表示确认和选择',
      },
      elegant: {
        name: '优雅绿色',
        description: '现代化的翠绿色，更柔和优雅',
      },
      professional: {
        name: '专业蓝色',
        description: '专业的蓝色，与工具栏主题保持一致',
      },
      warm: {
        name: '温和橙色',
        description: '温暖的橙色，高可见性且不刺眼',
      },
      modern: {
        name: '现代紫色',
        description: '现代的紫色，富有创新感',
      },
      neutral: {
        name: '中性灰色',
        description: '最低调的灰色，极简优雅',
      },
    },
    themes: {
      light: {
        description: '纯白背景',
      },
      dark: {
        description: '深灰背景',
      },
    },
  },
};
