// @ts-ignore - WXT types might not be picked up correctly by static analysis
import { defineContentScript } from '#imports';
import { browser } from 'wxt/browser';
// Import the utility object from the refactored file
import { markdownUtils } from './content/copyAsMarkdown';
import { logger } from '../utils/logger';
import { themeManager, selectionColorManager } from './content/ui';
import { initI18n } from '../utils/i18n';
import { registerAllLanguagePackages } from '../locales';


// Store the shortcut string received from the background script
let currentShortcutCopy = '';

export default defineContentScript({
  matches: ['<all_urls>'], // Modify matches as needed
  async main() {
    logger.info('Content script loaded.');

    // Initialize i18n system
    try {
      registerAllLanguagePackages();
      await initI18n();
      logger.info('i18n system initialized.');
    } catch (error) {
      logger.logError(error, { component: 'ContentScript', action: 'initI18n' });
    }

    // Initialize the markdown utilities (specifically Turndown) once
    markdownUtils.init();
    logger.info('Markdown utils initialized.');

    // Load theme settings from storage
    try {
      const result = await browser.storage.sync.get(['toolbarTheme', 'selectionColor']);
      if (result.toolbarTheme) {
        themeManager.setTheme(result.toolbarTheme);
        logger.info('Loaded toolbar theme:', result.toolbarTheme);
      }
      if (result.selectionColor) {
        selectionColorManager.setScheme(result.selectionColor);
        logger.info('Loaded selection color:', result.selectionColor);
      }
    } catch (error) {
      logger.logError(error, { component: 'ContentScript', action: 'loadThemeSettings' });
    }

    // Listen for messages from the background script
    browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: (response?: any) => void): boolean | undefined => {
      logger.info('Message received in content script:', message);

      // Store/Update the shortcut string if received
      if (message?.shortcutCopy) {
        currentShortcutCopy = message.shortcutCopy;
        // Pass the shortcut string to the UI manager
        markdownUtils.setCopyShortcutString(currentShortcutCopy);
      }

      // Handle 'startSelection'
      if (message && message.action === 'startSelection') {
        logger.info('Starting selection mode via context menu...');
        markdownUtils.startSelectionMode();
        sendResponse({ status: 'selectionModeStarted' });
        return true; // Indicate async response potentially needed (though not used here)

      }
      // Handle 'copySelection' - Now smarter!
      else if (message && message.action === 'copySelection') {
        logger.info('Handling copy action...');

        // --- Check for element selected by Picker first ---
        const selectedPickerElement = markdownUtils.getSelectedElement();
        if (selectedPickerElement) {
          logger.info('Picker element found, copying it...', selectedPickerElement);
          markdownUtils.copyElementAsMarkdown(selectedPickerElement)
            .then((markdown) => {
              logger.info('Picker element copied successfully.');
              markdownUtils.showToast('Copied Element as Markdown', 'success');
              markdownUtils.clearSelection();
              sendResponse({ status: 'elementCopied' });
            })
            .catch((error) => {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error('Failed to copy picker element:', errorMsg);
              markdownUtils.showToast(`✗ Element Copy Failed: ${errorMsg}`, 'error');
              sendResponse({ status: 'copyFailed', error: errorMsg });
            });
          return true; // Indicate async response
        }
        // --- End Picker Element Check ---

        // --- If no Picker element, fallback to text selection ---
        else {
          logger.info('No picker element found, attempting to copy text selection...');
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const container = document.createElement('div');
            container.appendChild(range.cloneContents());
            const selectedHtml = container.innerHTML;

            if (selectedHtml) {
              markdownUtils.copyHtmlAsMarkdown(selectedHtml)
                .then(() => {
                  logger.info('Text selection copied successfully.');
                  markdownUtils.showToast('Copied Selection as Markdown', 'success'); // Use unified toast
                  sendResponse({ status: 'selectionCopied' });
                })
                .catch((error) => {
                  const errorMsg = error instanceof Error ? error.message : String(error);
                  console.error('Failed to copy text selection:', errorMsg);
                  markdownUtils.showToast(`✗ Selection Copy Failed: ${errorMsg}`, 'error'); // Use unified toast
                  sendResponse({ status: 'copyFailed', error: errorMsg });
                });
              return true; // Indicate async response
            } else {
              console.warn('Selection HTML content is empty.');
              markdownUtils.showToast('✗ Nothing to copy (empty selection)', 'error'); // Toast feedback
              sendResponse({ status: 'emptySelection' });
            }
          } else {
            console.warn('No text selection found or rangeCount is 0.');
            markdownUtils.showToast('✗ Nothing to copy (no selection)', 'error'); // Toast feedback
            sendResponse({ status: 'noSelectionFound' });
          }
          return false; // Indicate sync response or no response needed unless promise above runs
        }
      }

      // Handle theme settings
      else if (message && message.type === 'SET_TOOLBAR_THEME') {
        logger.info('Setting toolbar theme:', message.theme);
        themeManager.setTheme(message.theme);
        sendResponse({ status: 'themeUpdated' });
        return false;
      }
      else if (message && message.type === 'SET_SELECTION_COLOR') {
        logger.info('Setting selection color:', message.color);
        selectionColorManager.setScheme(message.color);
        sendResponse({ status: 'colorUpdated' });
        return false;
      }
            // Handle language settings
      else if (message && message.type === 'SET_LANGUAGE') {
        logger.info('Setting language:', message.language);

        // 异步处理语言切换
        (async () => {
          try {
            // 引入 setLanguage 函数
            const { setLanguage } = await import('../utils/i18n');
            await setLanguage(message.language);

            // 语言设置已更新，UI 将在下次创建时使用新语言
            logger.info('Language updated successfully, UI will use new language on next creation');

            sendResponse({ status: 'languageUpdated' });
          } catch (error) {
            logger.logError(error, { component: 'ContentScript', action: 'setLanguage' });
            sendResponse({ status: 'languageUpdateFailed', error: String(error) });
          }
        })();

        return true; // 表示异步响应
      }

      // If message is not handled
      logger.info('Unhandled message action:', message?.action || message?.type);
      return false; // Indicate sync response (or no response)
    });

    logger.info('Message listener added.');
  },
});
