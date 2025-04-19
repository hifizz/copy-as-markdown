// @ts-ignore - WXT types might not be picked up correctly by static analysis
import { defineContentScript } from '#imports';
// Import the utility object from the refactored file
import { markdownUtils } from './content/copyAsMarkdown';

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

      // Handle 'startSelection'
      if (message && message.action === 'startSelection') {
        console.log('Starting selection mode via context menu...');
        markdownUtils.startSelectionMode();
        sendResponse({ status: 'selectionModeStarted' });
        return true; // Indicate async response potentially needed (though not used here)

      }
      // Handle 'copySelection' (Restore this block)
      else if (message && message.action === 'copySelection') {
        console.log('Copying selection as Markdown...');
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const container = document.createElement('div');
            container.appendChild(range.cloneContents());
            const selectedHtml = container.innerHTML;

            if (selectedHtml) {
                markdownUtils.copyHtmlAsMarkdown(selectedHtml)
                    .then(() => {
                        console.log('Selection copied successfully.');
                        sendResponse({ status: 'selectionCopied' });
                    })
                    .catch((error) => {
                        console.error('Failed to copy selection:', error);
                        sendResponse({ status: 'copyFailed', error: error instanceof Error ? error.message : String(error) });
                        alert('Failed to copy selection as Markdown. See console for details.'); // Notify user
                    });
                return true; // Indicate async response
            } else {
                 console.warn('Selection HTML content is empty.');
                 sendResponse({ status: 'emptySelection' });
            }
        } else {
            console.warn('No selection found or rangeCount is 0.');
            sendResponse({ status: 'noSelectionFound' });
        }
        return false; // Indicate sync response or no response needed unless promise above runs
      }

      // If message is not handled
       console.log('Unhandled message action:', message?.action);
       return false; // Indicate sync response (or no response)
    });

    console.log('Message listener added.');
  },
});
