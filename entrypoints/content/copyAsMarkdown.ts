import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { getUserSelectValue, isElementHoverable } from './dom-handler';
import { UIManager, setBodyCursor, restoreBodyCursor } from './ui';
import {
  addPreElementRule,
  addSkipMarkedElementsRule,
  addSkipInvisibleRule,
  addAbsoluteImageRule,
  addAbsoluteLinkRule,
  addLinkedImageRule,
} from './turndownRules';
import { preprocessElement, removePreprocessingMarkers } from './preprocessElement';

// Create a scope for state and functions
const markdownCopier = (() => {
  // --- State ---
  let selectorActive = false;
  let currentHoverElement: HTMLElement | null = null;
  let selectedElement: HTMLElement | null = null;
  let turndownService: TurndownService | null = null;
  let isTurndownInitialized = false;
  let originalBodyCursor: string | null = null;
  let boundHandleMouseOver: ((event: MouseEvent) => void) | null = null;
  let boundHandleMouseOut: ((event: MouseEvent) => void) | null = null;
  let boundHandleClick: ((event: MouseEvent) => void) | null = null;
  let boundHandleKeyDown: ((event: KeyboardEvent) => void) | null = null;

  // Instantiate the UI Manager - Will be initialized after copyElementAsMarkdown is defined
  let uiManager: UIManager | null = null;

  // === Turndown Setup & Rules (Internal Helpers) ===
  function initializeTurndownService(): boolean {
    if (isTurndownInitialized) {
      // console.log('CopyAsMarkdown: Turndown service already initialized.');
      return true;
    }
    console.log('CopyAsMarkdown: Attempting to initialize TurndownService...');
    try {
      turndownService = new TurndownService({
        codeBlockStyle: 'fenced',
        headingStyle: 'atx',
        hr: '---',
        bulletListMarker: '-',
      });
      console.log('CopyAsMarkdown: TurndownService instantiated successfully.');

      // Add rules by calling imported functions
      addPreElementRule(turndownService);
      addSkipMarkedElementsRule(turndownService);
      addSkipInvisibleRule(turndownService);
      addAbsoluteImageRule(turndownService);
      addAbsoluteLinkRule(turndownService);
      turndownService.use(gfm);
      addLinkedImageRule(turndownService);

      console.log('CopyAsMarkdown: Turndown rules and GFM plugin applied successfully.');
      isTurndownInitialized = true;
      return true;
    } catch (initError: unknown) {
      console.error(
        'CopyAsMarkdown: Error during TurndownService initialization:',
        initError instanceof Error ? initError.message : initError
      );
      turndownService = null;
      isTurndownInitialized = false;
      return false; // Indicate initialization failure
    }
  }

  /**
   * Converts the selected DOM element to Markdown and copies it to the clipboard.
   * Handles Turndown initialization, preprocessing, conversion, and cleanup.
   * @param {Element} elementToCopy The selected DOM element.
   * @returns {Promise<string>} A promise that resolves with the generated Markdown.
   * @throws {Error} If Turndown fails to load or conversion fails.
   */
  async function copyElementAsMarkdown(elementToCopy: Element): Promise<string> {
    if (!elementToCopy) {
      throw new Error('No element selected for copying.');
    }

    // Ensure Turndown is initialized
    if (!isTurndownInitialized) {
      if (!initializeTurndownService()) {
        throw new Error('Turndown service could not be initialized.');
      }
    }
    if (!turndownService) {
      // Check again after init attempt
      throw new Error('Turndown service is not available after initialization attempt.');
    }

    // 1. Preprocess the original element using imported function
    preprocessElement(elementToCopy);

    let markdown = '';
    try {
      // 2. Convert the element's outerHTML using Turndown
      // Turndown uses the 'data-cam-skip' attribute via the rules
      markdown = turndownService.turndown(elementToCopy.outerHTML);
    } catch (conversionError: unknown) {
      console.error(
        'CopyAsMarkdown: Turndown conversion failed:',
        conversionError instanceof Error ? conversionError.message : conversionError
      );
      throw new Error('Markdown conversion failed.'); // Rethrow or handle
    } finally {
      // 3. Clean up the markers from the original element using imported function
      removePreprocessingMarkers(elementToCopy);
    }

    // 4. Copy to clipboard
    try {
      await navigator.clipboard.writeText(markdown);
      return markdown; // Resolve with the markdown content
    } catch (clipboardError: unknown) {
      console.error(
        'CopyAsMarkdown: Failed to copy to clipboard:',
        clipboardError instanceof Error ? clipboardError.message : clipboardError
      );
      throw new Error('Failed to write to clipboard.');
    }
  }

  // Initialize the UI Manager *after* copyElementAsMarkdown is defined.
  uiManager = new UIManager(copyElementAsMarkdown);

  // === UI & Event Handling ===

  /**
   * Handles mouseover events during selection mode.
   * Highlights hoverable elements using UIManager.
   * @param {MouseEvent} event The mouse event.
   */
  function handleMouseOver(event: MouseEvent): void {
    if (!selectorActive || !uiManager) return;
    const target = event.target as Node | null;

    // Ignore irrelevant targets (including the copy button managed by UIManager, ideally checked via a method if needed)
    if (
      !target ||
      target === selectedElement ||
      target === document.body /* || target === uiManager.getButtonElement() */
    )
      return;

    // Check if the element is suitable for hovering/selection using imported function
    if (!isElementHoverable(target)) {
      // If hovering over a non-hoverable element, remove highlight from previous one using UIManager
      if (currentHoverElement && currentHoverElement !== selectedElement) {
        uiManager.restoreStyle(currentHoverElement);
      }
      currentHoverElement = null;
      return;
    }

    // Target is hoverable, ensure it's an HTMLElement for styling
    const targetElement = target as HTMLElement;

    // If moved from a different hoverable element, restore its style using UIManager
    if (
      currentHoverElement &&
      currentHoverElement !== targetElement &&
      currentHoverElement !== selectedElement
    ) {
      uiManager.restoreStyle(currentHoverElement);
    }

    // Apply hover style using UIManager if the target is new
    if (currentHoverElement !== targetElement) {
      currentHoverElement = targetElement;
      uiManager.applyStyle(currentHoverElement, 'hover');
    }
  }

  /**
   * Handles mouseout events during selection mode.
   * Removes highlight using UIManager.
   * @param {MouseEvent} event The mouse event.
   */
  function handleMouseOut(event: MouseEvent): void {
    if (
      !selectorActive ||
      !currentHoverElement ||
      currentHoverElement === selectedElement ||
      event.target !== currentHoverElement || // Ensure event originated from the currently hovered element
      !uiManager
    ) {
      return;
    }

    // Don't remove highlight if moving to the copy button or an unhoverable related target
    const relatedTarget = event.relatedTarget as Node | null;
    // Ideally check button via uiManager.isButtonTarget(relatedTarget) or similar if needed.
    if (
      /* uiManager.isButtonTarget(relatedTarget) || */ relatedTarget &&
      !isElementHoverable(relatedTarget)
    ) {
      return;
    }

    // Otherwise, restore style using UIManager and clear hover state
    uiManager.restoreStyle(currentHoverElement);
    currentHoverElement = null;
  }

  /**
   * Handles click events during selection mode.
   * Finalizes the selection, applies selected style, and shows the copy button using UIManager.
   * @param {MouseEvent} event The mouse event.
   */
  function handleClick(event: MouseEvent): void {
    // Ignore clicks on the copy button itself (handled internally by UIManager)
    // if (uiManager && uiManager.isButtonTarget(event.target as Node)) return;

    // Requires active selection mode and a currently hovered element
    if (!selectorActive || !currentHoverElement || !uiManager) return;

    // Ensure currentHoverElement is an HTMLElement before proceeding
    if (!(currentHoverElement instanceof HTMLElement)) return;

    event.preventDefault();
    event.stopPropagation(); // Prevent triggering other click listeners

    // Clear previous selection styling and button using UIManager
    if (selectedElement) {
      uiManager.clearSelectionUI(selectedElement); // Handles restoreStyle and removeButton
    }

    // Set the new selected element
    selectedElement = currentHoverElement;
    uiManager.applyStyle(selectedElement, 'selected', 'default'); // Apply selected style via UIManager
    currentHoverElement = null; // Clear hover state

    uiManager.createCopyButton(selectedElement); // Show the copy button via UIManager

    // Deactivate selection mode *state*
    selectorActive = false;
    console.log('[copyAsMarkdown] Selection complete. selectorActive set to false.');

    // Remove only the listeners related to element picking/hovering,
    // KEEP the keydown listener active for Escape to clear selection.
    console.log('[copyAsMarkdown] Removing mouse/click listeners after selection...');
    removePickModeEventListeners(); // Removes mouseover, mouseout, click
  }

  /**
   * Handles keydown events, specifically looking for the Escape key.
   * Uses UIManager for cleanup.
   * @param {KeyboardEvent} event The keyboard event.
   */
  function handleKeyDown(event: KeyboardEvent): void {
    console.log(
      '[copyAsMarkdown] handleKeyDown triggered. Key:',
      event.key,
      'selectorActive:',
      selectorActive
    );
    if (event.key === 'Escape') {
      if (selectorActive) {
        // If actively picking, stop the mode completely (removes all listeners)
        console.log('[copyAsMarkdown] Escape pressed during active selection. Stopping mode...');
        stopSelectionMode(true); // Calls removePickModeEventListeners and removes keydown internally
      } else if (selectedElement && uiManager) {
        // If an element is already selected (not actively picking), just clear the selection UI
        console.log('[copyAsMarkdown] Escape pressed with element selected. Clearing selection...');
        uiManager.clearSelectionUI(selectedElement); // Use UI Manager to clear style and button
        selectedElement = null;
      }
    }
  }

  // Helper to add event listeners for pick mode
  function addPickModeEventListeners(): void {
    console.log('[copyAsMarkdown] Adding pick mode event listeners...');
    // Add non-click listeners immediately
    boundHandleMouseOver = handleMouseOver.bind(null);
    boundHandleMouseOut = handleMouseOut.bind(null);
    boundHandleKeyDown = handleKeyDown.bind(null); // Keydown always added here

    document.addEventListener('mouseover', boundHandleMouseOver, true);
    document.addEventListener('mouseout', boundHandleMouseOut, true);
    document.addEventListener('keydown', boundHandleKeyDown, true);
    // Delay adding the click listener
    setTimeout(() => {
      if (selectorActive) {
        console.log('[copyAsMarkdown] Adding click listener after timeout...');
        boundHandleClick = handleClick.bind(null);
        document.addEventListener('click', boundHandleClick, true);
      }
    }, 0);
  }

  // Helper to remove ONLY mouse/click pick mode event listeners
  function removePickModeEventListeners(): void {
    console.log('[copyAsMarkdown] Removing mouse/click pick mode event listeners...');
    if (boundHandleMouseOver) document.removeEventListener('mouseover', boundHandleMouseOver, true);
    if (boundHandleMouseOut) document.removeEventListener('mouseout', boundHandleMouseOut, true);
    if (boundHandleClick) document.removeEventListener('click', boundHandleClick, true);
    // Reset only mouse/click bound handlers
    boundHandleMouseOver = null;
    boundHandleMouseOut = null;
    boundHandleClick = null;
  }

  // === Public API ===

  /**
   * Starts the element selection mode.
   */
  function startSelectionMode(): void {
    if (!isTurndownInitialized) {
      console.warn('CopyAsMarkdown: Turndown not initialized. Attempting init...');
      if (!initializeTurndownService()) {
        alert(
          'CopyAsMarkdown Error: Could not initialize Markdown converter. Cannot start selection mode.'
        );
        return;
      }
    }
    // Ensure UI manager is initialized
    if (!uiManager) {
      console.error('CopyAsMarkdown Error: UI Manager not initialized.');
      alert('CopyAsMarkdown Error: Internal UI component failed to initialize.');
      return;
    }

    if (selectorActive) {
      console.log('CopyAsMarkdown: Selection mode already active.');
      return; // Prevent starting multiple times
    }
    console.log('CopyAsMarkdown: Activating selection mode...');

    // Clear any previous selection state before starting using UIManager
    if (selectedElement) {
      uiManager.clearSelectionUI(selectedElement);
      selectedElement = null;
    }
    // Explicitly ensure button is removed via UIManager as well
    uiManager.removeCopyButton();
    if (currentHoverElement) {
      uiManager.restoreStyle(currentHoverElement);
      currentHoverElement = null;
    }

    selectorActive = true;

    // --- Apply initial hover near viewport center ---
    try {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const initialElement = document.elementFromPoint(centerX, centerY);

      console.log('[copyAsMarkdown] Initial element:', initialElement);

      // Check if element is valid, hoverable, not body, and an HTMLElement
      if (
        initialElement &&
        initialElement instanceof HTMLElement &&
        isElementHoverable(initialElement) &&
        initialElement !== document.body
      ) {
        if (uiManager) {
          // Ensure UI Manager is ready
          console.log(
            '[copyAsMarkdown] Applying initial hover to element near viewport center:',
            initialElement
          );
          uiManager.applyStyle(initialElement, 'hover');
          currentHoverElement = initialElement; // Set as current hover for subsequent logic
        }
      } else {
        console.log(
          '[copyAsMarkdown] No suitable initial hover element found near viewport center.'
        );
      }
    } catch (e) {
      console.warn('[copyAsMarkdown] Error finding or styling initial hover element:', e);
    }
    // --- End initial hover ---

    addPickModeEventListeners();
    // console.log('CopyAsMarkdown: Mode activated.');
  }

  /**
   * Stops the element selection mode COMPLETELY, typically due to cancellation (e.g., pressing Escape).
   * Uses UIManager for cleanup.
   */
  function stopSelectionMode(clearSelection = true): void {
    console.log(`[copyAsMarkdown] Stopping selection mode (clearSelection: ${clearSelection})...`);
    removePickModeEventListeners(); // Remove mouse/click listeners

    // Explicitly remove keydown listener here as this is a full stop
    if (boundHandleKeyDown) {
      console.log('[copyAsMarkdown] Removing keydown listener in stopSelectionMode...');
      document.removeEventListener('keydown', boundHandleKeyDown, true);
      boundHandleKeyDown = null; // Reset bound handler
    }

    selectorActive = false;

    // Clear hover highlight if any, using UIManager
    if (currentHoverElement && uiManager) {
      uiManager.restoreStyle(currentHoverElement);
      currentHoverElement = null;
    }

    // Clear selection highlight and button using UIManager if requested
    if (clearSelection && selectedElement && uiManager) {
      uiManager.clearSelectionUI(selectedElement); // Handles restoreStyle and removeButton
      selectedElement = null;
    }
    console.log('[copyAsMarkdown] Mode stopped.');
  }

  /**
   * NEW: Converts an HTML string to Markdown and copies it to the clipboard.
   * @param {string} htmlString The HTML content to convert.
   * @returns {Promise<void>} A promise that resolves when copy is complete or rejects on error.
   * @throws {Error} If Turndown fails to load or conversion/copy fails.
   */
  async function copyHtmlAsMarkdown(htmlString: string): Promise<void> {
    if (!isTurndownInitialized) {
      console.warn('CopyAsMarkdown: Turndown not initialized. Attempting init...');
      if (!initializeTurndownService()) {
        throw new Error('Turndown service could not be initialized for direct copy.');
      }
    }
    if (!turndownService) {
      // Check again after init attempt
      throw new Error('Turndown service is not available after initialization attempt.');
    }

    console.log('CopyAsMarkdown: Converting provided HTML...');
    let markdown = '';
    try {
      // No preprocessing needed for direct HTML string
      markdown = turndownService.turndown(htmlString);
    } catch (conversionError: unknown) {
      console.error(
        'CopyAsMarkdown: Turndown conversion failed for HTML string:',
        conversionError instanceof Error ? conversionError.message : conversionError
      );
      throw new Error('Markdown conversion failed.');
    }

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(markdown);
      console.log('CopyAsMarkdown: HTML successfully copied as Markdown.');
      // Optionally: Show a brief success notification (e.g., using a temporary overlay)
    } catch (clipboardError: unknown) {
      console.error(
        'CopyAsMarkdown: Failed to copy HTML to clipboard:',
        clipboardError instanceof Error ? clipboardError.message : clipboardError
      );
      throw new Error('Failed to write to clipboard.');
    }
  }

  // Add functions to expose state and actions to the public API
  function getSelectedElement(): HTMLElement | null {
    return selectedElement;
  }

  function showToast(message: string, type: 'success' | 'error'): void {
    if (uiManager) {
      uiManager.showToast(message, type);
    } else {
      // Fallback if UI manager somehow not ready (shouldn't happen in normal flow)
      console.warn('UIManager not available for toast:', message);
      alert(message); // Basic alert fallback
    }
  }

  // NEW: Method to pass shortcut string to UIManager
  function setCopyShortcutString(shortcut: string): void {
    if (uiManager) {
      uiManager.setCopyShortcutString(shortcut);
    } else {
      console.warn('UIManager not ready to receive shortcut string.');
    }
  }

  // Return the public API
  return {
    init: initializeTurndownService, // Expose init function
    startSelectionMode,
    stopSelectionMode,
    copyHtmlAsMarkdown,
    copyElementAsMarkdown, // Expose this core function
    getSelectedElement, // Expose getter for selected element
    showToast, // Expose toast function
    setCopyShortcutString, // Expose the new method
  };
})();

// Export the public API object
export const markdownUtils = markdownCopier;
