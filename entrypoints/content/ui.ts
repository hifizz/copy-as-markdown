/**
 * Manages UI elements and interactions for the CopyAsMarkdown feature,
 * including styling, button creation, and cursor changes.
 */

// === Constants ===
const HOVER_STYLE = '2px solid green';
const SELECTED_STYLE = '3px solid green';
const VIEWPORT_MARGIN = 10; // Safety margin from viewport edges in pixels

// === Types ===
type CopyFunction = (element: Element) => Promise<string>;
type StyleRecord = { outline: string; cursor: string };

// === UI Manager Class ===

export class UIManager {
  private copyButton: HTMLButtonElement | null = null;
  private originalStyles = new WeakMap<HTMLElement, StyleRecord>();
  private selectedElementRef: HTMLElement | null = null; // Keep track of the element the button is associated with
  private copyHandler: CopyFunction;

  constructor(copyHandler: CopyFunction) {
    this.copyHandler = copyHandler;
  }

  // --- Style Management ---

  private storeStyle(element: HTMLElement): void {
    if (!this.originalStyles.has(element)) {
      this.originalStyles.set(element, {
        outline: element.style.outline || '',
        cursor: element.style.cursor || '',
      });
    }
  }

  applyStyle(element: HTMLElement, styleType: 'hover' | 'selected', cursorStyle = 'pointer'): void {
    this.storeStyle(element);
    const outlineStyle = styleType === 'hover' ? HOVER_STYLE : SELECTED_STYLE;
    element.style.outline = outlineStyle;
    element.style.cursor = cursorStyle;
  }

  restoreStyle(element: HTMLElement | null): void {
    if (!element || !this.originalStyles.has(element)) return;

    const styles = this.originalStyles.get(element);
    if (styles) {
      element.style.outline = styles.outline;
      element.style.cursor = styles.cursor;

      // Clean up inline styles if they were originally empty
      if (!element.style.outline) element.style.removeProperty('outline');
      if (!element.style.cursor) element.style.removeProperty('cursor');

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
    button: HTMLButtonElement
  ): { top: number; left: number } {
    let desiredLeft = targetRect.right + 5;
    let desiredTop = targetRect.top;

    // Temporarily append to get button dimensions
    button.style.visibility = 'hidden';
    document.body.appendChild(button);
    const buttonRect = button.getBoundingClientRect();
    const buttonWidth = buttonRect.width;
    const buttonHeight = buttonRect.height;
    document.body.removeChild(button); // Clean up immediately
    button.style.visibility = 'visible';

    // Adjust position to stay within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust left
    if (desiredLeft + buttonWidth > viewportWidth) {
      desiredLeft = targetRect.left - buttonWidth - 5;
      if (desiredLeft < 0) {
        desiredLeft = VIEWPORT_MARGIN; // Use margin
      }
    } else if (desiredLeft < 0) {
      desiredLeft = VIEWPORT_MARGIN; // Use margin
    }

    // Adjust top
    if (desiredTop + buttonHeight > viewportHeight) {
      desiredTop = viewportHeight - buttonHeight - VIEWPORT_MARGIN; // Use margin
    } else if (desiredTop < 0) {
      desiredTop = VIEWPORT_MARGIN; // Use margin
    }

    return { top: desiredTop, left: desiredLeft };
  }

  createCopyButton(targetElement: HTMLElement): void {
    this.removeCopyButton(); // Ensure only one button exists
    this.selectedElementRef = targetElement; // Associate button with this element

    this.copyButton = document.createElement('button');
    this.copyButton.textContent = 'Copy as Markdown';
    Object.assign(this.copyButton.style, {
      position: 'fixed',
      zIndex: '2147483647',
      padding: '5px 10px',
      background: '#4CAF50',
      color: 'white',
      border: 'none',
      borderRadius: '3px',
      cursor: 'pointer',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      fontSize: '12px',
      fontFamily: 'sans-serif',
      lineHeight: '1.2',
    } as Partial<CSSStyleDeclaration>);

    const rect = targetElement.getBoundingClientRect();
    // Calculate position using the helper method
    const position = this._calculateButtonPosition(rect, this.copyButton);

    this.copyButton.style.left = `${position.left}px`;
    this.copyButton.style.top = `${position.top}px`;

    // Internal click handler for the button
    this.copyButton.addEventListener('click', this.handleButtonClick);

    document.body.appendChild(this.copyButton);
  }

  removeCopyButton(): void {
    if (this.copyButton) {
      this.copyButton.removeEventListener('click', this.handleButtonClick);
      if (this.copyButton.parentNode) {
        this.copyButton.parentNode.removeChild(this.copyButton);
      }
      this.copyButton = null;
    }
    this.selectedElementRef = null; // Disassociate
  }

  // Bound handler to preserve 'this' context
  private handleButtonClick = async (e: MouseEvent): Promise<void> => {
    e.stopPropagation();
    if (!this.selectedElementRef || !this.copyButton) return;

    const button = this.copyButton;
    const originalText = button.textContent;
    const originalBackground = button.style.background;

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
        // Check if the button still exists and wasn't removed/replaced
        if (this.copyButton === button) {
          this.updateButtonState('idle', originalText ?? undefined, originalBackground);
        }
      }, 1500);
    }
  };

  private updateButtonState(
    state: 'idle' | 'copying' | 'copied' | 'error',
    text?: string,
    background?: string
  ): void {
    if (!this.copyButton) return;

    switch (state) {
      case 'idle':
        this.copyButton.textContent = text || 'Copy as markdown';
        this.copyButton.style.background = background || '#4CAF50';
        this.copyButton.disabled = false;
        break;
      case 'copying':
        this.copyButton.textContent = 'Copying...';
        this.copyButton.disabled = true;
        break;
      case 'copied':
        this.copyButton.textContent = 'Copied!';
        this.copyButton.style.background = '#45a049'; // Darker green
        this.copyButton.disabled = true; // Keep disabled briefly
        break;
      case 'error':
        this.copyButton.textContent = text || 'Error!';
        this.copyButton.style.background = '#F44336'; // Red
        this.copyButton.disabled = true; // Keep disabled briefly
        break;
    }
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

// === Cursor Helpers ===

export function setBodyCursor(cursor: string): void {
  document.body.style.cursor = cursor;
}

export function restoreBodyCursor(originalCursor: string | null): void {
  if (originalCursor !== null) {
    document.body.style.cursor = originalCursor;
    if (!document.body.style.cursor) {
      // Clean up inline style if the original was empty
      document.body.style.removeProperty('cursor');
    }
  }
}
