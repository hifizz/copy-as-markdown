import { registerLanguagePackage, SupportedLanguage } from '../utils/i18n';
import { enLanguagePackage } from './en';
import { zhLanguagePackage } from './zh';

// 注册所有语言包
export function registerAllLanguagePackages(): void {
  registerLanguagePackage('en', enLanguagePackage);
  registerLanguagePackage('zh', zhLanguagePackage);
}

// 导出语言包供其他地方使用
export { enLanguagePackage, zhLanguagePackage };
export type { SupportedLanguage };
