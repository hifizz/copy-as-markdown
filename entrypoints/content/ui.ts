import butterup from 'butteruptoasts';
// In your CSS or JavaScript file
import 'butteruptoasts/src/butterup.css';
import { TOOLBAR_TEXT_COPY_BASE } from './constants'; // Import base text constant

butterup.options.maxToasts = 1;
butterup.options.toastLife = 3000;

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
const CANCEL_BUTTON_HOVER_BG = 'rgba(255, 255, 255, 0.1)';
const REPICK_BUTTON_HOVER_BG = 'rgba(255, 255, 255, 0.1)'; // Same as cancel for now

// Toolbar Styles (Tailwind-inspired)
const TOOLBAR_BG = '#2D3748'; // Gray-800
const TOOLBAR_TEXT = '#E2E8F0'; // Gray-300
const TOOLBAR_PADDING = '6px 12px';
const TOOLBAR_RADIUS = '4px';
const TOOLBAR_SHADOW = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
const TOOLBAR_FONT_SIZE = '13px';
const TOOLBAR_TRANSITION = 'opacity 0.2s ease-out, transform 0.2s ease-out';
const MAX_Z_INDEX = '2147483647'; // Use constant for z-index

// === Types ===
type CopyFunction = (element: Element) => Promise<string>;
type StyleRecord = { backgroundColor: string; transition: string; outline: string };

// === DOM Creation Helper Function ===

/**
 * Creates the basic DOM structure and applies static styles for the copy toolbar.
 * Does not handle positioning, event listeners, or animations.
 */
function createCopyToolbarDOM(
  baseText: string,
  shortcut: string | null,
  repickTooltip: string,
  cancelTooltip: string
): {
  toolbarDiv: HTMLDivElement;
  textSpan: HTMLSpanElement;
  repickSpan: HTMLSpanElement;
  cancelSpan: HTMLSpanElement;
} {
  const toolbarDiv = document.createElement('div');
  const textSpan = document.createElement('span');
  const repickSpan = document.createElement('span');
  const cancelSpan = document.createElement('span');

  // --- Configure Text Span ---
  textSpan.style.paddingRight = '8px';
  let buttonText = baseText;
  if (shortcut) {
    buttonText += ` (${shortcut})`;
  }
  textSpan.textContent = buttonText;

  // --- Configure RePick Span ---
  repickSpan.textContent = '↺';
  repickSpan.title = repickTooltip;
  Object.assign(repickSpan.style, {
    padding: '2px 6px',
    margin: '0 4px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease-in-out',
  } as Partial<CSSStyleDeclaration>);

  // --- Configure Cancel Span ---
  cancelSpan.textContent = '✕';
  cancelSpan.title = cancelTooltip;
  Object.assign(cancelSpan.style, {
    padding: '2px 6px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease-in-out',
  } as Partial<CSSStyleDeclaration>);

  // --- Configure Toolbar Div ---
  toolbarDiv.appendChild(textSpan);
  toolbarDiv.appendChild(repickSpan);
  toolbarDiv.appendChild(cancelSpan);
  Object.assign(toolbarDiv.style, {
    padding: TOOLBAR_PADDING,
    background: TOOLBAR_BG,
    color: TOOLBAR_TEXT,
    borderRadius: TOOLBAR_RADIUS,
    boxShadow: TOOLBAR_SHADOW,
    fontSize: TOOLBAR_FONT_SIZE,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    lineHeight: '1.4',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  } as Partial<CSSStyleDeclaration>);

  return { toolbarDiv, textSpan, repickSpan, cancelSpan };
}

const noop = () => {};

// === UI Manager Class ===

export class UIManager {
  private copyToolbar: HTMLDivElement | null = null;
  private textSpan: HTMLSpanElement | null = null;
  private repickSpan: HTMLSpanElement | null = null;
  private cancelSpan: HTMLSpanElement | null = null;
  private originalStyles = new WeakMap<HTMLElement, StyleRecord>();
  private selectedElementRef: HTMLElement | null = null;
  private copyHandler: CopyFunction;
  private scrollListenerAttached = false;
  private isScrollUpdatePending = false;
  private copyShortcutString: string = '';
  private onCancelCallback = noop;
  private onRepickCallback = noop;

  constructor({
    copyHandler,
    onCancelCallback,
    onRepickCallback,
  }: {
    copyHandler: CopyFunction;
    onCancelCallback: () => void;
    onRepickCallback: () => void;
  }) {
    this.copyHandler = copyHandler;
    this.onCancelCallback = onCancelCallback;
    this.onRepickCallback = onRepickCallback;
  }

  // Getter for the toolbar element
  getToolbarElement(): HTMLDivElement | null {
    return this.copyToolbar;
  }

  // Method to receive and store the shortcut string
  setCopyShortcutString(shortcut: string): void {
    logger.info('[UIManager] Setting copy shortcut string:', { shortcut });
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
   * NOW expects toolbar dimensions as arguments.
   * @param targetRect The ClientRect of the target element.
   * @param toolbarWidth The measured width of the toolbar.
   * @param toolbarHeight The measured height of the toolbar.
   * @returns {{top: number, left: number}} The calculated top and left position for the button.
   */
  private _calculateButtonPosition(
    targetRect: DOMRect,
    toolbarWidth: number, // Added parameter
    toolbarHeight: number // Added parameter
  ): { top: number; left: number } {
    // Calculate initial desired position (centered BELOW)
    let desiredTop = targetRect.bottom + 8; // 8px margin below
    let desiredLeft = targetRect.left + targetRect.width / 2 - toolbarWidth / 2;

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

  private _updateButtonPositionOnScroll(): void {
    if (!this.selectedElementRef || !this.copyToolbar) {
      return;
    }

    const targetRect = this.selectedElementRef.getBoundingClientRect();
    const toolbarRect = this.copyToolbar.getBoundingClientRect();
    const toolbarWidth = toolbarRect.width;
    const toolbarHeight = toolbarRect.height;

    // Recalculate position using the same logic, but with current rects
    const newPosition = this._calculateButtonPosition(targetRect, toolbarWidth, toolbarHeight);

    // Apply the new position
    this.copyToolbar.style.left = `${newPosition.left}px`;
    this.copyToolbar.style.top = `${newPosition.top}px`;
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
    this.removeCopyButton();
    this.selectedElementRef = targetElement;

    // 1. Create DOM elements using the helper
    const repickTooltip = 'Repick element';
    const cancelTooltip = 'Cancel selection (or press Esc / click outside)';
    const { toolbarDiv, textSpan, repickSpan, cancelSpan } = createCopyToolbarDOM(
      TOOLBAR_TEXT_COPY_BASE,
      this.copyShortcutString,
      repickTooltip,
      cancelTooltip
    );

    // 2. Store references
    this.copyToolbar = toolbarDiv;
    this.textSpan = textSpan;
    this.repickSpan = repickSpan;
    this.cancelSpan = cancelSpan;

    // 3. Measure dimensions (requires temporary DOM add)
    this.copyToolbar.style.visibility = 'hidden'; // Keep it hidden during measurement
    this.copyToolbar.style.position = 'fixed'; // Needed for getBoundingClientRect
    document.body.appendChild(this.copyToolbar);
    const toolbarRect = this.copyToolbar.getBoundingClientRect();
    const toolbarWidth = toolbarRect.width;
    const toolbarHeight = toolbarRect.height;
    document.body.removeChild(this.copyToolbar); // Remove immediately after measuring
    this.copyToolbar.style.visibility = 'visible'; // Make visible for final placement

    // 4. Calculate position using measured dimensions
    const targetRect = targetElement.getBoundingClientRect();
    const position = this._calculateButtonPosition(targetRect, toolbarWidth, toolbarHeight);

    // 5. Add listeners
    this.repickSpan.addEventListener('mouseenter', () => {
      if (this.repickSpan) this.repickSpan.style.backgroundColor = REPICK_BUTTON_HOVER_BG;
    });
    this.repickSpan.addEventListener('mouseleave', () => {
      if (this.repickSpan) this.repickSpan.style.backgroundColor = 'transparent';
    });
    this.repickSpan.addEventListener('click', this.handleRepickButtonClick);

    this.cancelSpan.addEventListener('mouseenter', () => {
      if (this.cancelSpan) this.cancelSpan.style.backgroundColor = CANCEL_BUTTON_HOVER_BG;
    });
    this.cancelSpan.addEventListener('mouseleave', () => {
      if (this.cancelSpan) this.cancelSpan.style.backgroundColor = 'transparent';
    });
    this.cancelSpan.addEventListener('click', this.handleCancelButtonClick);
    this.copyToolbar.addEventListener('click', this.handleMainActionClick);

    // 6. Apply ALL dynamic styles (including position and initial animation state)
    Object.assign(this.copyToolbar.style, {
      position: 'fixed',
      zIndex: MAX_Z_INDEX,
      opacity: '0',
      transform: 'translateY(5px)',
      transition: TOOLBAR_TRANSITION,
      left: `${position.left}px`,
      top: `${position.top}px`,
    } as Partial<CSSStyleDeclaration>);

    // 7. Append to body finally
    document.body.appendChild(this.copyToolbar);

    // 8. Trigger animation
    requestAnimationFrame(() => {
      if (this.copyToolbar) {
        this.copyToolbar.style.opacity = '1';
        this.copyToolbar.style.transform = 'translateY(0)';
      }
    });

    // 9. Attach scroll listener
    if (!this.scrollListenerAttached) {
      window.addEventListener('scroll', this.handleScroll, { capture: true, passive: true });
      this.scrollListenerAttached = true;
    }
  }

  removeCopyButton(): void {
    if (this.copyToolbar) {
      this.copyToolbar.style.opacity = '0';
      this.copyToolbar.style.transform = 'translateY(5px)';

      // Remove listeners
      this.copyToolbar.removeEventListener('click', this.handleMainActionClick);
      if (this.repickSpan) {
        this.repickSpan.removeEventListener('click', this.handleRepickButtonClick);
      }
      if (this.cancelSpan) {
        this.cancelSpan.removeEventListener('click', this.handleCancelButtonClick);
      }

      setTimeout(() => {
        if (this.copyToolbar && this.copyToolbar.parentNode) {
          this.copyToolbar.parentNode.removeChild(this.copyToolbar);
        }
        // Clear references
        this.copyToolbar = null;
        this.textSpan = null;
        this.repickSpan = null;
        this.cancelSpan = null;
      }, 200);
    } else {
      // Ensure references are null if no toolbar existed
      this.copyToolbar = null;
      this.textSpan = null;
      this.repickSpan = null;
      this.cancelSpan = null;
    }
    this.selectedElementRef = null;

    if (this.scrollListenerAttached) {
      window.removeEventListener('scroll', this.handleScroll, { capture: true });
      this.scrollListenerAttached = false;
      this.isScrollUpdatePending = false;
    }
  }

  // Renamed from handleButtonClick to handleMainActionClick
  private handleMainActionClick = async (e: MouseEvent): Promise<void> => {
    // Prevent triggering if clicking on cancel OR repick buttons
    if (
      (this.cancelSpan && this.cancelSpan.contains(e.target as Node)) ||
      (this.repickSpan && this.repickSpan.contains(e.target as Node))
    ) {
      return;
    }

    e.stopPropagation();
    if (!this.selectedElementRef || !this.copyToolbar || !this.textSpan) return;

    const toolbar = this.copyToolbar; // Capture reference
    const originalText = this.textSpan.textContent; // Use textSpan content

    this.updateButtonState('copying');

    try {
      const copiedText = await this.copyHandler(this.selectedElementRef);
      this.updateButtonState('copied');
      this.showToast('Copied to clipboard!', 'success');
    } catch (err: unknown) {
      logger.error(
        'CopyAsMarkdown: Copy process failed via UI:',
        {
          error: err instanceof Error ? err.message : err
        }
      );
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.updateButtonState('error', 'Error!');
      this.showToast(`Copy failed: ${errorMessage}`, 'error');
    } finally {
      setTimeout(() => {
        if (this.copyToolbar === toolbar) {
          this.updateButtonState('idle', originalText ?? undefined);
        }
      }, 1500);
    }
  };

  // Handler for the cancel (X) button click
  private handleCancelButtonClick = (e: MouseEvent): void => {
    e.stopPropagation(); // Prevent triggering main action listener
    logger.info('[UIManager] Cancel button clicked.');
    this.onCancelCallback(); // Trigger the cancellation logic
  };

  // Handler for the repick button click
  private handleRepickButtonClick = (e: MouseEvent): void => {
    e.stopPropagation();
    logger.info('[UIManager] Repick button clicked.');
    this.onRepickCallback(); // Trigger the repick logic
  };

  private updateButtonState(state: 'idle' | 'copying' | 'copied' | 'error', text?: string): void {
    // Target the textSpan for updates
    if (!this.textSpan) return;

    switch (state) {
      case 'idle':
        this.textSpan.textContent =
          text ||
          `${TOOLBAR_TEXT_COPY_BASE}${
            this.copyShortcutString ? ` (${this.copyShortcutString})` : ''
          }`;
        break;
      case 'copying':
        this.textSpan.textContent = 'Copying...';
        break;
      case 'copied':
        this.textSpan.textContent = 'Copied!';
        break;
      case 'error':
        this.textSpan.textContent = text || 'Error!';
        break;
    }
  }

  /**
   * Displays a short-lived toast message on the screen using Butterup.
   * @param message The text content of the toast.
   * @param type Controls the style and icon ('success' or 'error').
   * @param duration How long the toast should be visible in milliseconds. Defaults to 3000ms for success, 5000ms for error.
   */
  showToast(message: string, type: 'success' | 'error', duration?: number): void {
    const defaultDuration = type === 'success' ? 3000 : 5000;
    const toastDuration = duration ?? defaultDuration;

    butterup.toast({
      title: type === 'success' ? 'Success!' : 'Error!',
      message: message,
      location: 'top-right',
      icon: true,
      type: type,
    });
  }

  // --- Cleanup ---
  clearSelectionUI(element: HTMLElement | null): void {
    this.restoreStyle(element);
    if (element && this.selectedElementRef === element) {
      this.removeCopyButton();
    }
  }
}
