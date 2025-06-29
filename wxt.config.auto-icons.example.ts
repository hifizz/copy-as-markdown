import { defineConfig } from 'wxt';

// 方案二：使用 @wxt-dev/auto-icons 模块的配置示例
export default defineConfig({
    modules: [
    '@wxt-dev/module-react',
    '@wxt-dev/auto-icons'  // 添加 auto-icons 模块
  ],

  manifest: {
    name: 'Copy as Markdown',
    // 使用 auto-icons 时，不需要手动配置 icons
    // 模块会自动处理图标生成和配置

    permissions: [
      "contextMenus",
      "tabs",
    ],

    commands: {
      'copy-selection-as-markdown': {
        suggested_key: {
          default: 'Alt+Shift+C',
        },
        description: 'Copy current selection as Markdown',
      },
      'pick-element-as-markdown': {
        suggested_key: {
          default: 'Alt+Shift+E',
        },
        description: 'Pick element to copy as Markdown',
      },
    },
  },

  webExt: {
    startUrls: [
      'https://wxt.dev/',
      'https://tailwindcss.com/docs/hover-focus-and-other-states#styling-based-on-the-descendants-of-a-group',
      'https://g.co/gemini/share/c7b3db1afe67'
    ],
  }
});
