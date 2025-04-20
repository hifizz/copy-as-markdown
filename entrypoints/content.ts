// @ts-ignore - WXT types might not be picked up correctly by static analysis
import { defineContentScript } from '#imports';
// Import the utility object from the refactored file
import { markdownUtils } from './content/copyAsMarkdown';

// Store the shortcut string received from the background script
let currentShortcutCopy = '';

export default defineContentScript({
  matches: ['<all_urls>'], // Modify matches as needed
  main() {
    console.log('Content script loaded.');

    // Initialize the markdown utilities (specifically Turndown) once
    markdownUtils.init();
    console.log('Markdown utils initialized.');

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean | undefined => {
      console.log('Message received in content script:', message);

      // Store/Update the shortcut string if received
      if (message?.shortcutCopy) {
        currentShortcutCopy = message.shortcutCopy;
        // Pass the shortcut string to the UI manager
        markdownUtils.setCopyShortcutString(currentShortcutCopy);
      }

      // Handle 'startSelection'
      if (message && message.action === 'startSelection') {
        console.log('Starting selection mode via context menu...');
        markdownUtils.startSelectionMode();
        sendResponse({ status: 'selectionModeStarted' });
        return true; // Indicate async response potentially needed (though not used here)

      }
      // Handle 'copySelection' - Now smarter!
      else if (message && message.action === 'copySelection') {
        console.log('Handling copy action...');

        // --- Check for element selected by Picker first ---
        const selectedPickerElement = markdownUtils.getSelectedElement();
        if (selectedPickerElement) {
          console.log('Picker element found, copying it...', selectedPickerElement);
          markdownUtils.copyElementAsMarkdown(selectedPickerElement)
            .then((markdown) => {
              console.log('Picker element copied successfully.');
              markdownUtils.showToast('✓ Copied Element as Markdown', 'success');
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
          console.log('No picker element found, attempting to copy text selection...');
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const container = document.createElement('div');
            container.appendChild(range.cloneContents());
            const selectedHtml = container.innerHTML;

            if (selectedHtml) {
              markdownUtils.copyHtmlAsMarkdown(selectedHtml)
                .then(() => {
                  console.log('Text selection copied successfully.');
                  markdownUtils.showToast('✓ Copied Selection as Markdown', 'success'); // Use unified toast
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

      // If message is not handled
      console.log('Unhandled message action:', message?.action);
      return false; // Indicate sync response (or no response)
    });

    console.log('Message listener added.');
  },
});
