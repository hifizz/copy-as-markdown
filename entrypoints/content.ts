
// --- Start Execution when script is loaded ---
import { copyAsMarkdown } from './content/copyAsMarkdown';

export default defineContentScript({
  matches: ['*://*.wxt.dev/*'],
  main() {
    console.log('copyAsMarkdown before');
    copyAsMarkdown();
    console.log('copyAsMarkdown after');
  },
});
