import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Copy as Markdown',
    // 图标配置 - 基础方案：使用深色主题图标
    icons: {
      '16': '/icon/dark_16.png',
      '32': '/icon/dark_32.png',
      '48': '/icon/dark_48.png',
      '96': '/icon/dark_96.png',
      '128': '/icon/dark_128.png',
    },
    // Explicitly add permissions here if auto-detection fails
    permissions: [
      "contextMenus",
      "tabs",
      "storage", // Add storage permission for theme settings
      // "commands", // WXT might add this automatically when commands are defined
      // Add other necessary permissions if needed
      // WXT usually adds "scripting" automatically for content scripts
    ],
    // Define keyboard shortcuts
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
