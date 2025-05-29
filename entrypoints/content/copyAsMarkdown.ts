import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { isElementHoverable } from './dom-handler';
import { logger } from '../../utils/logger';
import { UIManager } from './ui';
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
  let boundHandleMouseOver: ((event: MouseEvent) => void) | null = null;
  let boundHandleMouseOut: ((event: MouseEvent) => void) | null = null;
  let boundHandleClick: ((event: MouseEvent) => void) | null = null;
  let boundHandleKeyDown: ((event: KeyboardEvent) => void) | null = null;
  let boundHandleClickOutside: ((event: MouseEvent) => void) | null = null; // Listener for clicking outside

  // Instantiate the UI Manager
  let uiManager = new UIManager({
    copyHandler: copyElementAsMarkdown,
    onCancelCallback: triggerClearSelection,
    onRepickCallback: triggerRepick,
  });

  // Define the cancellation trigger function
  function triggerClearSelection(): void {
    logger.info('[copyAsMarkdown] Cancellation triggered by UI (X button).');
    clearSelectionAndListeners(); // Call the main cleanup logic
  }

  // Define the repick trigger function
  function triggerRepick(): void {
    logger.info('[copyAsMarkdown] Repick triggered by UI (↺ button).');
    // Clear current selection UI and listeners *before* starting new selection
    clearSelectionAndListeners();
    // Start selection mode again
    startSelectionMode();
  }

  // === Turndown Setup & Rules (Internal Helpers) ===
  function initializeTurndownService(): boolean {
    if (isTurndownInitialized) {
      // logger.info('CopyAsMarkdown: Turndown service already initialized.');
      return true;
    }
    logger.info('CopyAsMarkdown: Attempting to initialize TurndownService...');
    try {
      turndownService = new TurndownService({
        codeBlockStyle: 'fenced',
        headingStyle: 'atx',
        hr: '---',
        bulletListMarker: '-',
      });
      logger.info('CopyAsMarkdown: TurndownService instantiated successfully.');

      // Add rules by calling imported functions
      addPreElementRule(turndownService);
      addSkipMarkedElementsRule(turndownService);
      addSkipInvisibleRule(turndownService);
      addAbsoluteImageRule(turndownService);
      addAbsoluteLinkRule(turndownService);
      turndownService.use(gfm);
      addLinkedImageRule(turndownService);

      logger.info('CopyAsMarkdown: Turndown rules and GFM plugin applied successfully.');
      isTurndownInitialized = true;
      return true;
    } catch (initError: unknown) {
      logger.error(
        'CopyAsMarkdown: Error during TurndownService initialization:',
        {
          error: initError instanceof Error ? initError.message : initError
        }
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
      logger.error(
        'CopyAsMarkdown: Turndown conversion failed:',
        {
          error: conversionError instanceof Error ? conversionError.message : conversionError
        }
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
      logger.error(
        'CopyAsMarkdown: Failed to copy to clipboard:',
        {
          error: clipboardError instanceof Error ? clipboardError.message : clipboardError
        }
      );
      throw new Error('Failed to write to clipboard.');
    }
  }

  // === UI & Event Handling ===

  /**
   * Handles mouseover events during selection mode.
   * Highlights hoverable elements using UIManager.
   * @param {MouseEvent} event The mouse event.
   */
  function handleMouseOver(event: MouseEvent): void {
    if (!selectorActive) return;
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
      event.target !== currentHoverElement
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
   * Finalizes the selection, applies selected style, shows the copy button,
   * and adds a listener to handle clicks outside the selection.
   * @param {MouseEvent} event The mouse event.
   */
  function handleClick(event: MouseEvent): void {
    const uiToolbar = uiManager?.getToolbarElement();
    // Ignore clicks on the copy button itself (handled internally by UIManager)
    if (uiToolbar && uiToolbar.contains(event.target as Node)) return;

    // Requires active selection mode and a currently hovered element
    if (!selectorActive || !currentHoverElement) return;

    // Ensure currentHoverElement is an HTMLElement before proceeding
    if (!(currentHoverElement instanceof HTMLElement)) return;

    event.preventDefault();
    event.stopPropagation(); // Prevent triggering other click listeners

    // --- Clear previous selection and listeners ---
    clearSelectionAndListeners(); // Clear any previous selection + outside click listener

    // --- Set new selection ---
    selectedElement = currentHoverElement;
    uiManager.applyStyle(selectedElement, 'selected'); // Apply selected style via UIManager (cursor removed)
    currentHoverElement = null; // Clear hover state

    uiManager.createCopyButton(selectedElement); // Show the copy button via UIManager

    // Deactivate selection mode *state*
    selectorActive = false;
    logger.info('[copyAsMarkdown] Selection complete. selectorActive set to false.');

    // Remove only the listeners related to element picking/hovering
    removePickModeEventListeners(); // Removes mouseover, mouseout, click

    // --- Add listener for clicking outside the new selection ---
    // Use setTimeout to ensure this listener is added *after* the current click event bubbles up
    setTimeout(() => {
      // Define the click outside handler
      const handleClickOutside = (e: MouseEvent) => {
        const clickedToolbar = uiManager?.getToolbarElement();
        // Check if the click target is outside the selected element AND outside the toolbar
        if (
          selectedElement && // Must have a selection
          !selectedElement.contains(e.target as Node) && // Click is not inside selected element
          (!clickedToolbar || !clickedToolbar.contains(e.target as Node)) // Click is not inside the toolbar
        ) {
          logger.info('[copyAsMarkdown] Click outside detected. Clearing selection.');
          clearSelectionAndListeners(); // Clean up UI, listeners, and state
        }
      };

      boundHandleClickOutside = handleClickOutside.bind(null);
      document.addEventListener('click', boundHandleClickOutside, true);
      logger.info('[copyAsMarkdown] Added click outside listener.');
    }, 0);
  }

  /**
   * Handles keydown events, specifically looking for the Escape key.
   * Uses cleanup helper for clearing selection.
   * @param {KeyboardEvent} event The keyboard event.
   */
  function handleKeyDown(event: KeyboardEvent): void {
    logger.info(
      '[copyAsMarkdown] handleKeyDown triggered.',
      {
        key: event.key,
        selectorActive: selectorActive
      }
    );
    /**
     * Handle Escape key to stop selection mode
     */
    if (event.key === 'Escape') {
      if (selectorActive) {
        // If actively picking, stop the mode completely
        logger.info('[copyAsMarkdown] Escape pressed during active selection. Stopping mode...');
        stopSelectionMode(true); // Calls removePickModeEventListeners, removes keydown, calls clearSelectionAndListeners
      } else if (selectedElement) {
        // If an element is already selected (not actively picking), just clear the selection and listeners
        logger.info('[copyAsMarkdown] Escape pressed with element selected. Clearing selection...');
        clearSelectionAndListeners(); // Use the helper
      }
    }
  }

  // Helper to add event listeners for pick mode
  function addPickModeEventListeners(): void {
    logger.info('[copyAsMarkdown] Adding pick mode event listeners...');
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
        logger.info('[copyAsMarkdown] Adding click listener after timeout...');
        boundHandleClick = handleClick.bind(null);
        document.addEventListener('click', boundHandleClick, true);
      }
    }, 0);
  }

  // Helper to remove ONLY mouse/click pick mode event listeners
  function removePickModeEventListeners(): void {
    logger.info('[copyAsMarkdown] Removing mouse/click pick mode event listeners...');
    if (boundHandleMouseOver) document.removeEventListener('mouseover', boundHandleMouseOver, true);
    if (boundHandleMouseOut) document.removeEventListener('mouseout', boundHandleMouseOut, true);
    if (boundHandleClick) document.removeEventListener('click', boundHandleClick, true);
    // Reset only mouse/click bound handlers
    boundHandleMouseOver = null;
    boundHandleMouseOut = null;
    boundHandleClick = null;
  }

  // --- NEW: Helper Functions for Cleanup ---

  /**
   * Removes the click outside listener if it exists.
   */
  function removeClickOutsideListener(): void {
    if (boundHandleClickOutside) {
      logger.info('[copyAsMarkdown] Removing click outside listener.');
      document.removeEventListener('click', boundHandleClickOutside, true);
      boundHandleClickOutside = null;
    }
  }

  /**
   * Clears the current selection UI (highlight, button),
   * removes the click outside listener, and resets the selectedElement state.
   */
  function clearSelectionAndListeners(): void {
    if (selectedElement && uiManager) {
      logger.info('[copyAsMarkdown] Clearing selection UI and listeners for:', selectedElement);
      uiManager.clearSelectionUI(selectedElement); // Handles restoreStyle and removeButton
    }
    removeClickOutsideListener(); // Ensure listener is removed
    selectedElement = null; // Reset state variable
  }

  // === Public API ===

  /**
   * Starts the element selection mode.
   */
  function startSelectionMode(): void {
    if (!isTurndownInitialized) {
      logger.warn('CopyAsMarkdown: Turndown not initialized. Attempting init...');
      if (!initializeTurndownService()) {
        alert(
          'CopyAsMarkdown Error: Could not initialize Markdown converter. Cannot start selection mode.'
        );
        return;
      }
    }

    if (selectorActive) {
      logger.info('CopyAsMarkdown: Selection mode already active.');
      return; // Prevent starting multiple times
    }
    logger.info('CopyAsMarkdown: Activating selection mode...');

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
    tryToAutoHoverElement();
    // --- End initial hover ---

    addPickModeEventListeners();
    // logger.info('CopyAsMarkdown: Mode activated.');
  }

  /**
   * Stops the element selection mode COMPLETELY, typically due to cancellation (e.g., pressing Escape).
   * Uses cleanup helpers.
   */
  function stopSelectionMode(clearSelection = true): void {
    logger.info(`[copyAsMarkdown] Stopping selection mode (clearSelection: ${clearSelection})...`);
    removePickModeEventListeners(); // Remove mouse/click listeners

    // Explicitly remove keydown listener here as this is a full stop
    if (boundHandleKeyDown) {
      logger.info('[copyAsMarkdown] Removing keydown listener in stopSelectionMode...');
      document.removeEventListener('keydown', boundHandleKeyDown, true);
      boundHandleKeyDown = null; // Reset bound handler
    }

    selectorActive = false;

    // Restore body cursor - (Removed cursor logic previously)

    // Clear hover highlight if any, using UIManager
    if (currentHoverElement && uiManager) {
      uiManager.restoreStyle(currentHoverElement);
      currentHoverElement = null;
    }

    // Use the cleanup helper if selection needs clearing
    if (clearSelection) {
      clearSelectionAndListeners();
    }
    logger.info('[copyAsMarkdown] Mode stopped.');
  }

  /**
   * NEW: Converts an HTML string to Markdown and copies it to the clipboard.
   * @param {string} htmlString The HTML content to convert.
   * @returns {Promise<void>} A promise that resolves when copy is complete or rejects on error.
   * @throws {Error} If Turndown fails to load or conversion/copy fails.
   */
  async function copyHtmlAsMarkdown(htmlString: string): Promise<void> {
    if (!isTurndownInitialized) {
      logger.warn('CopyAsMarkdown: Turndown not initialized. Attempting init...');
      if (!initializeTurndownService()) {
        throw new Error('Turndown service could not be initialized for direct copy.');
      }
    }
    if (!turndownService) {
      // Check again after init attempt
      throw new Error('Turndown service is not available after initialization attempt.');
    }

    logger.info('CopyAsMarkdown: Converting provided HTML...');
    let markdown = '';
    try {
      // No preprocessing needed for direct HTML string
      markdown = turndownService.turndown(htmlString);
    } catch (conversionError: unknown) {
      logger.error(
        'CopyAsMarkdown: Turndown conversion failed for HTML string:',
        {
          error: conversionError instanceof Error ? conversionError.message : conversionError
        }
      );
      throw new Error('Markdown conversion failed.');
    }

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(markdown);
      logger.info('CopyAsMarkdown: HTML successfully copied as Markdown.');
      // Optionally: Show a brief success notification (e.g., using a temporary overlay)
    } catch (clipboardError: unknown) {
      logger.error(
        'CopyAsMarkdown: Failed to copy HTML to clipboard:',
        {
          error: clipboardError instanceof Error ? clipboardError.message : clipboardError
        }
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
      logger.warn('UIManager not available for toast:', {message});
      alert(message); // Basic alert fallback
    }
  }

  // NEW: Method to pass shortcut string to UIManager
  function setCopyShortcutString(shortcut: string): void {
    uiManager.setCopyShortcutString(shortcut);
  }

  function clearSelection(): void {
    clearSelectionAndListeners();
  }

  /**
   * Attempts to find an element near the viewport center and apply
   * an initial hover style if it's suitable.
   */
  function tryToAutoHoverElement(): void {
    try {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const initialElement = document.elementFromPoint(centerX, centerY);

      if (
        initialElement &&
        initialElement instanceof HTMLElement &&
        isElementHoverable(initialElement) && // Assuming isElementHoverable is accessible
        initialElement !== document.body
      ) {
          logger.info(
            '[copyAsMarkdown] Applying initial hover via auto-hover:',
            initialElement
          );
          uiManager?.applyStyle(initialElement, 'hover');
          currentHoverElement = initialElement; // Update the class property
      } else {
        logger.info(
          '[copyAsMarkdown] No suitable initial element found for auto-hover near viewport center.'
        );
      }
    } catch (e) {
      logger.warn('[copyAsMarkdown] Error during auto-hover attempt:', {error: e});
    }
  }

  // Return the public API
  return {
    init: initializeTurndownService,
    startSelectionMode,
    stopSelectionMode,
    copyHtmlAsMarkdown,
    copyElementAsMarkdown,
    getSelectedElement,
    showToast,
    setCopyShortcutString,
    clearSelection,
  };
})();

// Export the public API object
export const markdownUtils = markdownCopier;
