import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    // Explicitly add permissions here if auto-detection fails
    permissions: [
      "contextMenus",
      // Add other necessary permissions if needed, e.g., "storage"
      // WXT usually adds "scripting" automatically for content scripts
    ],
  },
});
