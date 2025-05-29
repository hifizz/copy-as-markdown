import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Copy as Markdown',
    // Explicitly add permissions here if auto-detection fails
    permissions: [
      "contextMenus",
      "tabs",
      // "commands", // WXT might add this automatically when commands are defined
      // Add other necessary permissions if needed, e.g., "storage"
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
      'https://developer.chrome.com/docs/extensions'
    ],
  }
});
