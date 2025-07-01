import { browser } from 'wxt/browser';

// 支持的语言类型
export type SupportedLanguage = 'en' | 'zh';

// 语言包类型定义
export interface LanguagePackage {
  [key: string]: string | LanguagePackage;
}

// 当前语言状态
let currentLanguage: SupportedLanguage = 'en';
let languagePackages: Record<SupportedLanguage, LanguagePackage> = {} as any;

/**
 * 检测用户首选语言
 * 优先级：存储的用户设置 > 浏览器语言 > 默认英文
 */
export async function detectLanguage(): Promise<SupportedLanguage> {
  try {
    // 首先尝试从存储中获取用户设置
    const result = await browser.storage.sync.get(['language']);
    if (result.language && (result.language === 'en' || result.language === 'zh')) {
      return result.language as SupportedLanguage;
    }
  } catch (error) {
    console.warn('Failed to get language from storage:', error);
  }

  // 检测浏览器语言
  const browserLang = navigator.language || navigator.languages?.[0] || 'en';

  // 简化的语言检测：如果包含 'zh' 则使用中文，否则使用英文
  if (browserLang.toLowerCase().includes('zh')) {
    return 'zh';
  }

  return 'en'; // 默认英文
}

/**
 * 设置当前语言
 */
export async function setLanguage(language: SupportedLanguage): Promise<void> {
  currentLanguage = language;

  try {
    // 保存到存储
    await browser.storage.sync.set({ language });
  } catch (error) {
    console.warn('Failed to save language to storage:', error);
  }
}

/**
 * 获取当前语言
 */
export function getCurrentLanguage(): SupportedLanguage {
  return currentLanguage;
}

/**
 * 注册语言包
 */
export function registerLanguagePackage(language: SupportedLanguage, pkg: LanguagePackage): void {
  languagePackages[language] = pkg;
}

/**
 * 从嵌套对象中获取值
 * 支持 'app.title' 这样的路径
 */
function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined;
  }, obj);
}

/**
 * 处理字符串插值
 * 将 'Hello {{name}}' 和 {name: 'World'} 转换为 'Hello World'
 */
function interpolate(template: string, params: Record<string, any> = {}): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

/**
 * 主要的国际化函数
 * @param key 文案键，支持嵌套如 'app.title'
 * @param params 插值参数，如 {name: 'value'}
 * @returns 本地化的文案
 */
export function i18n(key: string, params: Record<string, any> = {}): string {
  const languagePkg = languagePackages[currentLanguage];

  if (!languagePkg) {
    console.warn(`Language package not found for: ${currentLanguage}`);
    return key;
  }

  const value = getNestedValue(languagePkg, key);

  if (typeof value !== 'string') {
    console.warn(`Translation not found for key: ${key} in language: ${currentLanguage}`);
    return key;
  }

  return interpolate(value, params);
}

/**
 * 初始化多语言系统
 */
export async function initI18n(): Promise<void> {
  const detectedLanguage = await detectLanguage();
  await setLanguage(detectedLanguage);
}

/**
 * 获取所有支持的语言
 */
export function getSupportedLanguages(): SupportedLanguage[] {
  return ['en', 'zh'];
}
