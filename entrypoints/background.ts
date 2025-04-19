import { defineBackground } from '#imports';

// Define IDs for both menu items
const CONTEXT_MENU_ID_COPY = 'copy-as-markdown-selection'; // For direct copy of selection
const CONTEXT_MENU_ID_PICK = 'pick-element-copy-as-markdown'; // For picking an element

// Define Command Names (must match manifest)
const COMMAND_COPY_SELECTION = 'copy-selection-as-markdown';
const COMMAND_PICK_ELEMENT = 'pick-element-as-markdown';

// Base keys (Modifier will be determined dynamically)
const BASE_SHORTCUT_COPY_SELECTION = 'Shift+C';
const BASE_SHORTCUT_PICK_ELEMENT = 'Shift+E';
// Base modifier defined in manifest
const MANIFEST_MODIFIER = 'Alt';

export default defineBackground({
  // permissions: ['contextMenus'], // Use wxt.config.ts
  persistent: false,
  main() {
    console.log('Background script loaded');

    // --- Context Menu Setup ---
    chrome.runtime.onInstalled.addListener(async () => {
      console.log('onInstalled event triggered. Getting platform info...');
      try {
        const platformInfo = await chrome.runtime.getPlatformInfo();
        console.log('Platform Info:', platformInfo);
        const isMac = platformInfo.os === 'mac';
        // Use Option for Mac, Alt for others, matching the manifest definition
        const modifierKey = isMac ? 'Option' : 'Alt';

        const shortcutCopy = `${modifierKey}+${BASE_SHORTCUT_COPY_SELECTION}`;
        const shortcutPick = `${modifierKey}+${BASE_SHORTCUT_PICK_ELEMENT}`;

        // Update context menus after getting platform info
        updateContextMenu(CONTEXT_MENU_ID_COPY, `Copy as Markdown (${shortcutCopy})`, [
          'selection' as chrome.contextMenus.ContextType,
        ]);
        updateContextMenu(
          CONTEXT_MENU_ID_PICK,
          `Pick Element to Copy as Markdown (${shortcutPick})`,
          [
            'page' as chrome.contextMenus.ContextType,
            'selection' as chrome.contextMenus.ContextType,
            'image' as chrome.contextMenus.ContextType,
          ]
        );
      } catch (error) {
        console.error('Error getting platform info or updating context menus:', error);
        // Fallback to default titles if platform info fails?
        // For simplicity, we might just log the error for now.
      }
    });

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
          sendMessageToTab(tab.id, action, String(info.menuItemId));
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
        sendMessageToTab(tabId, action, command);
      }
    });

    // --- Helper function to send messages ---
    function sendMessageToTab(tabId: number | undefined, action: string, triggerSource: string) {
      if (tabId === undefined) {
        console.error(
          `Cannot send message for action "${action}" (triggered by ${triggerSource}): Tab ID is undefined.`
        );
        return;
      }
      console.log(`Triggered by "${triggerSource}", sending action "${action}" to tab:`, tabId);
      chrome.tabs.sendMessage(tabId, { action: action }, (response: any) => {
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
