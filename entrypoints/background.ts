import { defineBackground } from '#imports';
import {
  CONTEXT_MENU_ID_COPY,
  CONTEXT_MENU_ID_PICK,
  COMMAND_COPY_SELECTION,
  COMMAND_PICK_ELEMENT,
  BASE_SHORTCUT_COPY_SELECTION,
  BASE_SHORTCUT_PICK_ELEMENT,
  TITLE_COPY_SELECTION,
  TITLE_PICK_ELEMENT,
} from './content/constants'; // Import constants

// Store the determined shortcut string globally in the background script
let dynamicShortcutCopy = '';
let dynamicShortcutPick = '';

export default defineBackground({
  // permissions: ['contextMenus'], // Use wxt.config.ts
  persistent: false,
  main() {
    console.log('Background script loaded');

    // --- Determine Shortcuts and Setup Context Menus --- Function hoisted
    setupShortcutsAndMenus();

    // Hoisted function for initial setup
    async function setupShortcutsAndMenus() {
      console.log('setupShortcutsAndMenus: Getting platform info...');
      try {
        const platformInfo = await chrome.runtime.getPlatformInfo();
        console.log('Platform Info:', platformInfo);
        const isMac = platformInfo.os === 'mac';
        const modifierKey = isMac ? 'Option' : 'Alt';

        // Store the dynamically determined full shortcut strings
        dynamicShortcutCopy = `${modifierKey}+${BASE_SHORTCUT_COPY_SELECTION}`;
        dynamicShortcutPick = `${modifierKey}+${BASE_SHORTCUT_PICK_ELEMENT}`;

        // Update context menus using constants and dynamic shortcuts
        updateContextMenu(CONTEXT_MENU_ID_COPY, `${TITLE_COPY_SELECTION} (${dynamicShortcutCopy})`, [
          'selection' as chrome.contextMenus.ContextType,
        ]);
        updateContextMenu(
          CONTEXT_MENU_ID_PICK,
          `${TITLE_PICK_ELEMENT} (${dynamicShortcutPick})`,
          [
            'page' as chrome.contextMenus.ContextType,
            'selection' as chrome.contextMenus.ContextType,
            'image' as chrome.contextMenus.ContextType,
          ]
        );
      } catch (error) {
        console.error('Error getting platform info or updating context menus:', error);
        // Fallback to base titles if platform info fails
        updateContextMenu(CONTEXT_MENU_ID_COPY, TITLE_COPY_SELECTION, ['selection' as chrome.contextMenus.ContextType]);
        updateContextMenu(CONTEXT_MENU_ID_PICK, TITLE_PICK_ELEMENT, [
          'page' as chrome.contextMenus.ContextType,
          'selection' as chrome.contextMenus.ContextType,
          'image' as chrome.contextMenus.ContextType,
        ]);
      }
    }

    // --- Context Menu Setup (Listener remains) ---
    chrome.runtime.onInstalled.addListener(setupShortcutsAndMenus);

    // Helper function to create/update context menu
    function updateContextMenu(
      id: string,
      title: string,
      contexts: chrome.contextMenus.ContextType[]
    ) {
      chrome.contextMenus.remove(id, () => {
        if (chrome.runtime.lastError) {
          /* Ignore */
        }
        chrome.contextMenus.create(
          {
            id: id,
            title: title,
            contexts: contexts as [
              chrome.contextMenus.ContextType,
              ...chrome.contextMenus.ContextType[]
            ],
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error(
                `Error creating/updating context menu ${id}:`,
                chrome.runtime.lastError.message
              );
            } else {
              console.log(`Context menu "${id}" created/updated with title: "${title}"`);
            }
          }
        );
      });
    }

    // --- Context Menu Click Handler ---
    chrome.contextMenus.onClicked.addListener(
      (info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab | undefined) => {
        if (!tab?.id) return;

        let action: string | null = null;
        // Determine action based on which menu item was clicked
        if (info.menuItemId === CONTEXT_MENU_ID_COPY) {
          action = 'copySelection';
        } else if (info.menuItemId === CONTEXT_MENU_ID_PICK) {
          action = 'startSelection';
        }

        if (action) {
          // Pass the dynamic shortcut for copying (for the UI button)
          sendMessageToTab(tab.id, action, String(info.menuItemId), dynamicShortcutCopy);
        } else {
          console.log('Ignoring context menu click:', info, tab);
        }
      }
    );

    // --- Keyboard Shortcut Handler ---
    chrome.commands.onCommand.addListener(async (command: string, tab: chrome.tabs.Tab) => {
      let tabId = tab?.id;
      if (!tabId) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = activeTab?.id;
      }

      let action: string | null = null;
      if (command === COMMAND_COPY_SELECTION) {
        action = 'copySelection';
      } else if (command === COMMAND_PICK_ELEMENT) {
        action = 'startSelection';
      }

      if (action) {
        // Pass the dynamic shortcut for copying (for the UI button)
        sendMessageToTab(tabId, action, command, dynamicShortcutCopy);
      }
    });

    // --- Helper function to send messages (add shortcut param) ---
    function sendMessageToTab(
      tabId: number | undefined,
      action: string,
      triggerSource: string,
      shortcutCopy?: string // Add optional shortcut string
    ) {
      if (tabId === undefined) {
        console.error(
          `Cannot send message for action "${action}" (triggered by ${triggerSource}): Tab ID is undefined.`
        );
        return;
      }
      console.log(`Triggered by "${triggerSource}", sending action "${action}" to tab:`, tabId);
      // Include shortcutCopy in the message payload
      chrome.tabs.sendMessage(tabId, { action: action, shortcutCopy: shortcutCopy }, (response: any) => {
        if (chrome.runtime.lastError) {
          console.error(
            `Error sending message for action "${action}" (triggered by ${triggerSource}):`,
            chrome.runtime.lastError.message
          );
        } else {
          console.log(
            `Message sent for action "${action}" (triggered by ${triggerSource}), response received:`,
            response
          );
        }
      });
    }
  },
});
