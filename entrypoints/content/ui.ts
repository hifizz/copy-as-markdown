import { TOOLBAR_TEXT_COPY_BASE } from './constants'; // Import base text constant

/**
 * Manages UI elements and interactions for the CopyAsMarkdown feature,
 * including styling, button creation.
 */

// === Constants ===
const HOVER_BG_COLOR = 'rgba(76, 175, 80, 0.2)'; // Light green overlay
const SELECTED_BG_COLOR = 'rgba(76, 175, 80, 0.4)'; // Darker green overlay
const HOVER_OUTLINE = '1px solid rgba(76, 175, 80, 0.6)'; // Thin, semi-transparent outline for hover
const SELECTED_OUTLINE = '2px solid rgba(76, 175, 80, 0.9)'; // Thicker, more solid outline for selected
const VIEWPORT_MARGIN = 10; // Safety margin from viewport edges in pixels

// Toolbar Styles (Tailwind-inspired)
const TOOLBAR_BG = '#2D3748'; // Gray-800
const TOOLBAR_TEXT = '#E2E8F0'; // Gray-300
const TOOLBAR_PADDING = '6px 12px';
const TOOLBAR_RADIUS = '6px';
const TOOLBAR_SHADOW = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
const TOOLBAR_FONT_SIZE = '13px';
const TOOLBAR_TRANSITION = 'opacity 0.2s ease-out, transform 0.2s ease-out';

// === Types ===
type CopyFunction = (element: Element) => Promise<string>;
type StyleRecord = { backgroundColor: string; transition: string; outline: string };

// === UI Manager Class ===

export class UIManager {
  private copyToolbar: HTMLDivElement | null = null;
  private originalStyles = new WeakMap<HTMLElement, StyleRecord>();
  private selectedElementRef: HTMLElement | null = null; // Keep track of the element the button is associated with
  private copyHandler: CopyFunction;
  private scrollListenerAttached = false; // Flag to track scroll listener
  private isScrollUpdatePending = false; // Flag for RAF throttling
  private lastTargetRect: DOMRect | null = null;
  private lastToolbarRect: DOMRect | null = null;
  private toastElement: HTMLDivElement | null = null; // Element for the toast message
  private toastTimeoutId: number | null = null; // Timeout ID for hiding toast
  private copyShortcutString: string = ''; // <-- Add variable to store shortcut

  constructor(copyHandler: CopyFunction) {
    this.copyHandler = copyHandler;
  }

  // Method to receive and store the shortcut string
  setCopyShortcutString(shortcut: string): void {
    console.log('[UIManager] Setting copy shortcut string:', shortcut);
    this.copyShortcutString = shortcut;
  }

  // --- Style Management ---

  private storeStyle(element: HTMLElement): void {
    if (!this.originalStyles.has(element)) {
      this.originalStyles.set(element, {
        backgroundColor: element.style.backgroundColor || '',
        transition: element.style.transition || '',
        outline: element.style.outline || '',
      });
    }
  }

  applyStyle(element: HTMLElement, styleType: 'hover' | 'selected'): void {
    this.storeStyle(element);
    const bgColor = styleType === 'hover' ? HOVER_BG_COLOR : SELECTED_BG_COLOR;
    const outlineStyle = styleType === 'hover' ? HOVER_OUTLINE : SELECTED_OUTLINE;

    element.style.backgroundColor = bgColor;
    element.style.outline = outlineStyle;
    element.style.transition = 'background-color 0.15s ease-in-out, outline 0.15s ease-in-out';
  }

  restoreStyle(element: HTMLElement | null): void {
    if (!element || !this.originalStyles.has(element)) return;

    const styles = this.originalStyles.get(element);
    if (styles) {
      element.style.backgroundColor = styles.backgroundColor;
      element.style.transition = styles.transition;
      element.style.outline = styles.outline;

      if (!element.style.backgroundColor) element.style.removeProperty('background-color');
      if (!element.style.transition) element.style.removeProperty('transition');
      if (!element.style.outline) element.style.removeProperty('outline');

      this.originalStyles.delete(element);
    }
  }

  // --- Button Management ---

  /**
   * Calculates the optimal position for the copy button relative to the target element,
   * ensuring it stays within the viewport.
   * Requires the button element to exist temporarily to measure its dimensions.
   * @param targetRect The ClientRect of the target element.
   * @param button The button element (used for measurement).
   * @returns {{top: number, left: number}} The calculated top and left position for the button.
   */
  private _calculateButtonPosition(
    targetRect: DOMRect,
    toolbar: HTMLDivElement
  ): { top: number; left: number } {
    // Target position: Centered below the element initially
    let desiredTop = 0;
    let desiredLeft = 0;

    // Temporarily append to get toolbar dimensions
    toolbar.style.visibility = 'hidden';
    document.body.appendChild(toolbar);
    const toolbarRect = toolbar.getBoundingClientRect();
    const toolbarWidth = toolbarRect.width;
    const toolbarHeight = toolbarRect.height;
    document.body.removeChild(toolbar); // Clean up immediately
    toolbar.style.visibility = 'visible';

    // Calculate initial desired position (centered BELOW)
    desiredTop = targetRect.bottom + 8; // 8px margin below
    desiredLeft = targetRect.left + targetRect.width / 2 - toolbarWidth / 2;

    // Adjust position to stay within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust top: If placing BELOW goes off bottom edge, try placing it ABOVE
    if (desiredTop + toolbarHeight > viewportHeight - VIEWPORT_MARGIN) {
      desiredTop = targetRect.top - toolbarHeight - 8; // Try 8px margin above
      // If placing ABOVE *still* goes off top edge (tall element), clamp to top margin.
      if (desiredTop < VIEWPORT_MARGIN) {
        desiredTop = VIEWPORT_MARGIN;
      }
      // If placing above fits, keep it there.
    } else if (desiredTop < VIEWPORT_MARGIN) {
      desiredTop = VIEWPORT_MARGIN; // Clamp to top margin just in case
    }

    // Adjust left: Keep it centered as much as possible within bounds
    if (desiredLeft < VIEWPORT_MARGIN) {
      desiredLeft = VIEWPORT_MARGIN;
    } else if (desiredLeft + toolbarWidth > viewportWidth - VIEWPORT_MARGIN) {
      desiredLeft = viewportWidth - toolbarWidth - VIEWPORT_MARGIN;
    }

    return { top: desiredTop, left: desiredLeft };
  }

  /**
   * Updates the button position based on the current position of the selected element.
   * Intended to be called within a throttled scroll handler.
   */
  private _updateButtonPositionOnScroll(): void {
    if (!this.selectedElementRef || !this.copyToolbar) {
      return;
    }

    const targetRect = this.selectedElementRef.getBoundingClientRect();
    const toolbarRect = this.copyToolbar.getBoundingClientRect(); // Get current toolbar dimensions
    const toolbarWidth = toolbarRect.width;
    const toolbarHeight = toolbarRect.height;

    let desiredLeft = targetRect.right + 5;
    let desiredTop = targetRect.top;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust left
    if (desiredLeft + toolbarWidth > viewportWidth) {
      desiredLeft = targetRect.left - toolbarWidth - 5;
      if (desiredLeft < 0) {
        desiredLeft = VIEWPORT_MARGIN;
      }
    } else if (desiredLeft < 0) {
      desiredLeft = VIEWPORT_MARGIN;
    }

    // Adjust top
    if (desiredTop + toolbarHeight > viewportHeight) {
      desiredTop = viewportHeight - toolbarHeight - VIEWPORT_MARGIN;
    } else if (desiredTop < 0) {
      desiredTop = VIEWPORT_MARGIN;
    }

    // Apply the new position
    this.copyToolbar.style.left = `${desiredLeft}px`;
    this.copyToolbar.style.top = `${desiredTop}px`;
  }

  // Scroll handler throttled with requestAnimationFrame
  private handleScroll = () => {
    if (!this.isScrollUpdatePending) {
      this.isScrollUpdatePending = true;
      requestAnimationFrame(() => {
        this._updateButtonPositionOnScroll();
        this.isScrollUpdatePending = false;
      });
    }
  };

  createCopyButton(targetElement: HTMLElement): void {
    this.removeCopyButton(); // Ensure only one toolbar exists
    this.selectedElementRef = targetElement; // Associate button with this element

    this.copyToolbar = document.createElement('div');

    // Construct button text using base constant and stored shortcut
    let buttonText = TOOLBAR_TEXT_COPY_BASE;
    if (this.copyShortcutString) {
      buttonText += ` (${this.copyShortcutString})`;
    }
    this.copyToolbar.textContent = buttonText;

    Object.assign(this.copyToolbar.style, {
      position: 'fixed',
      zIndex: '2147483647',
      padding: TOOLBAR_PADDING,
      background: TOOLBAR_BG,
      color: TOOLBAR_TEXT,
      borderRadius: TOOLBAR_RADIUS,
      boxShadow: TOOLBAR_SHADOW,
      fontSize: TOOLBAR_FONT_SIZE,
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', // Common system font stack
      lineHeight: '1.4', // Adjusted line height
      cursor: 'pointer', // Make the div itself clickable
      opacity: '0',
      transform: 'translateY(5px)',
      transition: TOOLBAR_TRANSITION,
    } as Partial<CSSStyleDeclaration>);

    const rect = targetElement.getBoundingClientRect();
    // Calculate position using the helper method, passing the toolbar div
    const position = this._calculateButtonPosition(rect, this.copyToolbar);

    this.copyToolbar.style.left = `${position.left}px`;
    this.copyToolbar.style.top = `${position.top}px`;

    // Internal click handler for the toolbar div
    this.copyToolbar.addEventListener('click', this.handleButtonClick);

    document.body.appendChild(this.copyToolbar);

    // Trigger the animation (fade-in and move up)
    requestAnimationFrame(() => {
      // Ensures styles are applied before transition starts
      if (this.copyToolbar) {
        // Check if it still exists
        this.copyToolbar.style.opacity = '1';
        this.copyToolbar.style.transform = 'translateY(0)';
      }
    });

    // Add scroll listener if not already attached
    if (!this.scrollListenerAttached) {
      window.addEventListener('scroll', this.handleScroll, { capture: true, passive: true });
      this.scrollListenerAttached = true;
    }
  }

  removeCopyButton(): void {
    if (this.copyToolbar) {
      // Optional: Add fade-out animation before removing
      this.copyToolbar.style.opacity = '0';
      this.copyToolbar.style.transform = 'translateY(5px)';

      // Remove listener first
      this.copyToolbar.removeEventListener('click', this.handleButtonClick);

      // Remove from DOM after transition
      setTimeout(() => {
        if (this.copyToolbar && this.copyToolbar.parentNode) {
          this.copyToolbar.parentNode.removeChild(this.copyToolbar);
        }
        this.copyToolbar = null; // Set to null after removal
      }, 200); // Match transition duration (0.2s)
    } else {
      // If no toolbar exists, just ensure state is clean
      this.copyToolbar = null;
    }
    this.selectedElementRef = null; // Disassociate

    // Remove scroll listener ONLY if no button is active anymore
    // Note: This assumes only one button can exist. If multiple instances
    // of UIManager could exist, this logic needs refinement.
    if (this.scrollListenerAttached) {
      window.removeEventListener('scroll', this.handleScroll, { capture: true });
      this.scrollListenerAttached = false;
      this.isScrollUpdatePending = false; // Reset RAF flag
    }
  }

  // Bound handler to preserve 'this' context
  private handleButtonClick = async (e: MouseEvent): Promise<void> => {
    e.stopPropagation();
    if (!this.selectedElementRef || !this.copyToolbar) return;

    const toolbar = this.copyToolbar;
    // Use the constructed text potentially including the shortcut
    const originalText = toolbar.textContent; // Capture the current text

    this.updateButtonState('copying');

    try {
      await this.copyHandler(this.selectedElementRef);
      this.updateButtonState('copied');
    } catch (err: unknown) {
      console.error(
        'CopyAsMarkdown: Copy process failed via UI:',
        err instanceof Error ? err.message : err
      );
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.updateButtonState('error', `Error!`);
      alert(`Copy failed: ${errorMessage}`);
    } finally {
      // Restore button appearance after a delay
      setTimeout(() => {
        if (this.copyToolbar === toolbar) {
          // Restore the original text (which might include the shortcut)
          this.updateButtonState('idle', originalText ?? undefined);
        }
      }, 1500);
    }
  };

  private updateButtonState(state: 'idle' | 'copying' | 'copied' | 'error', text?: string): void {
    if (!this.copyToolbar) return;

    switch (state) {
      case 'idle':
        this.copyToolbar.textContent =
          text ||
          `${TOOLBAR_TEXT_COPY_BASE}${
            this.copyShortcutString ? ` (${this.copyShortcutString})` : ''
          }`;
        break;
      case 'copying':
        this.copyToolbar.textContent = 'Copying...';
        break;
      case 'copied':
        this.copyToolbar.textContent = 'Copied!';
        break;
      case 'error':
        this.copyToolbar.textContent = text || 'Error!';
        break;
    }
  }

  // --- Toast Notification ---

  /**
   * Displays a short-lived toast message on the screen.
   * @param message The text content of the toast.
   * @param type Controls the background color ('success' or 'error').
   * @param duration How long the toast should be visible in milliseconds.
   */
  showToast(message: string, type: 'success' | 'error', duration: number = 2500): void {
    // Clear any existing toast timeout
    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
      this.toastTimeoutId = null;
    }
    // Remove existing toast element immediately if present
    if (this.toastElement && this.toastElement.parentNode) {
      this.toastElement.parentNode.removeChild(this.toastElement);
      this.toastElement = null;
    }

    // Create the toast element
    this.toastElement = document.createElement('div');
    this.toastElement.textContent = message;

    // Base styles for the toast
    Object.assign(this.toastElement.style, {
      position: 'fixed',
      bottom: '20px', // Position at the bottom center
      left: '50%',
      transform: 'translateX(-50%) translateY(10px)', // Initial position for animation
      padding: '10px 20px',
      borderRadius: '6px',
      color: '#FFFFFF', // White text generally works well
      fontSize: '14px',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      zIndex: '2147483647', // Max z-index
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      opacity: '0', // Start invisible for animation
      transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
      textAlign: 'center',
      maxWidth: '80%', // Prevent overly wide toasts
    } as Partial<CSSStyleDeclaration>);

    // Type-specific background color
    if (type === 'success') {
      this.toastElement.style.backgroundColor = '#2D3748'; // Dark gray (like toolbar)
    } else {
      // error
      this.toastElement.style.backgroundColor = '#C53030'; // Tailwind Red 700
    }

    // Append to body and trigger animation
    document.body.appendChild(this.toastElement);
    requestAnimationFrame(() => {
      if (this.toastElement) {
        this.toastElement.style.opacity = '1';
        this.toastElement.style.transform = 'translateX(-50%) translateY(0)';
      }
    });

    // Set timeout to hide and remove the toast
    this.toastTimeoutId = window.setTimeout(() => {
      if (this.toastElement) {
        this.toastElement.style.opacity = '0';
        this.toastElement.style.transform = 'translateX(-50%) translateY(10px)';
        // Remove from DOM after transition ends
        setTimeout(() => {
          if (this.toastElement && this.toastElement.parentNode) {
            this.toastElement.parentNode.removeChild(this.toastElement);
            this.toastElement = null;
            this.toastTimeoutId = null; // Clear the ID after removal
          }
        }, 300); // Match transition duration
      }
    }, duration); // Use provided duration
  }

  // --- Cleanup ---
  // Convenience method to clear styles and button for a specific element
  clearSelectionUI(element: HTMLElement | null): void {
    this.restoreStyle(element);
    // Only remove the button if it's associated with the element being cleared
    if (element && this.selectedElementRef === element) {
      this.removeCopyButton();
    }
  }
}
