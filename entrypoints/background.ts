// @ts-ignore - WXT types might not be picked up correctly by static analysis
import { defineBackground } from '#imports';

// Define IDs for both menu items
const CONTEXT_MENU_ID_COPY = 'copy-as-markdown-selection';      // For direct copy of selection
const CONTEXT_MENU_ID_PICK = 'pick-element-copy-as-markdown'; // For picking an element

export default defineBackground({
  // permissions: ['contextMenus'], // Use wxt.config.ts
  persistent: false,
  main() {
    console.log('Background script loaded');

    // Create context menus on installation
    chrome.runtime.onInstalled.addListener(() => {
      // Remove potentially existing menus first
      chrome.contextMenus.remove(CONTEXT_MENU_ID_COPY, () => {
        if (chrome.runtime.lastError) {/* Ignore */}
        // Create menu for direct copy (only when selection exists)
        chrome.contextMenus.create({
          id: CONTEXT_MENU_ID_COPY,
          title: 'Copy as Markdown',
          contexts: ['selection'], // << Only shows on selection
        });
      });
      chrome.contextMenus.remove(CONTEXT_MENU_ID_PICK, () => {
        if (chrome.runtime.lastError) {/* Ignore */}
        // Create menu for picking element (shows always)
        chrome.contextMenus.create({
          id: CONTEXT_MENU_ID_PICK,
          title: 'Pick Element to Copy as Markdown',
          contexts: ['page', 'selection'], // << Shows on page and selection
        });
      });
      console.log('Context menus created/updated.');
    });

    // Handle context menu clicks
    chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab | undefined) => {
      if (!tab?.id) return;

      let action: string | null = null;
      // Determine action based on which menu item was clicked
      if (info.menuItemId === CONTEXT_MENU_ID_COPY) {
        action = 'copySelection';
      } else if (info.menuItemId === CONTEXT_MENU_ID_PICK) {
        action = 'startSelection';
      }

      if (action) {
        console.log(`Context menu "${info.menuItemId}" clicked, sending action "${action}" to tab:`, tab.id);
        chrome.tabs.sendMessage(tab.id, { action: action }, (response: any) => {
           if (chrome.runtime.lastError) {
                console.error(`Error sending message for action "${action}":`, chrome.runtime.lastError.message, "Tab URL:", tab.url);
           } else {
                console.log('Message sent, response received:', response);
           }
        });
      } else {
          console.log('Ignoring context menu click:', info, tab);
      }
    });
  },
});
