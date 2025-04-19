import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

// Create a scope for state and functions
const markdownCopier = (() => {
  // --- Configuration ---
  const HOVER_STYLE = '2px solid green';
  const SELECTED_STYLE = '3px solid green';

  // --- State ---
  let selectorActive = false;
  let currentHoverElement: HTMLElement | null = null;
  let selectedElement: HTMLElement | null = null;
  let copyButton: HTMLButtonElement | null = null;
  const originalStyles = new WeakMap<HTMLElement, { outline: string; cursor: string }>();
  let turndownService: TurndownService | null = null;
  let isTurndownInitialized = false;
  let originalBodyCursor: string | null = null;

  // Bound event handlers (needed if we still use event listeners)
  // Need to define the handlers first before binding
  let boundHandleMouseOver: ((event: MouseEvent) => void) | null = null;
  let boundHandleMouseOut: ((event: MouseEvent) => void) | null = null;
  let boundHandleClick: ((event: MouseEvent) => void) | null = null;
  let boundHandleKeyDown: ((event: KeyboardEvent) => void) | null = null;

  // === Visibility Checks (Internal Helper) ===
  function isElementHoverable(node: Node): boolean {
    // --- Visibility Check (similar to old isElementVisibleForCopy) ---
    if (!node) return false;

    const nodeType = node.nodeType;
    if (nodeType === Node.COMMENT_NODE) return false;
    if (nodeType !== Node.ELEMENT_NODE && nodeType !== Node.TEXT_NODE) return false;

    if (nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toUpperCase();
      if (
        tagName === 'SCRIPT' ||
        tagName === 'STYLE' ||
        tagName === 'HEAD' ||
        tagName === 'NOSCRIPT' ||
        tagName === 'META' ||
        tagName === 'LINK'
      ) {
        return false;
      }

      const style = window.getComputedStyle(element);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0' ||
        (style.position === 'fixed' && style.clipPath === 'inset(100%)')
      ) {
        return false;
      }

      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        if (tagName === 'IMG' || element.children.length === 0) {
          return false;
        }
      }

      // --- User Select Check (Specific to Hoverable) ---
      const userSelect = style.userSelect || style.webkitUserSelect;
      if (userSelect === 'none') {
        return false;
      }
    }
    // If all checks pass, it's hoverable
    return true;
  }

  /**
   * Gets the computed user-select value for an element.
   * @param {Element} element The element to check.
   * @returns {string} The computed user-select value (e.g., 'none', 'auto').
   */
  function getUserSelectValue(element: Element): string {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';
    try {
      const style = window.getComputedStyle(element);
      return (
        style.getPropertyValue('user-select') ||
        style.userSelect ||
        style.webkitUserSelect ||
        ''
      ).trim();
    } catch (err: unknown) {
      console.warn('CopyAsMarkdown: Error getting userSelect value:', err instanceof Error ? err.message : err);
      return '';
    }
  }

  // === DOM Manipulation & Styling ===

  /**
   * Stores the original outline and cursor style of an element.
   * @param {Element} element The element whose style is to be stored.
   */
  function storeOriginalStyle(element: HTMLElement): void {
    if (!originalStyles.has(element)) {
      originalStyles.set(element, {
        outline: element.style.outline || '',
        cursor: element.style.cursor || '',
      });
    }
  }

  /**
   * Applies a temporary outline and cursor style to an element.
   * @param {Element} element The element to style.
   * @param {string} outlineStyle The CSS value for the outline.
   * @param {string} [cursorStyle='pointer'] The CSS value for the cursor.
   */
  function applyStyle(element: HTMLElement, outlineStyle: string, cursorStyle = 'pointer'): void {
    storeOriginalStyle(element);
    element.style.outline = outlineStyle;
    element.style.cursor = cursorStyle;
  }

  /**
   * Restores the original outline and cursor style of an element.
   * @param {Element | null} element The element whose style is to be restored.
   */
  function restoreStyle(element: HTMLElement | null): void {
    if (!element || !originalStyles.has(element)) return;

    const styles = originalStyles.get(element);
    if (styles) {
      element.style.outline = styles.outline;
      element.style.cursor = styles.cursor;

      // Clean up inline styles if they were originally empty
      if (!element.style.outline) element.style.removeProperty('outline');
      if (!element.style.cursor) element.style.removeProperty('cursor');

      originalStyles.delete(element);
    }
  }

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

      // Add rules
      addPreElementRule(turndownService);
      addSkipMarkedElementsRule(turndownService);
      addSkipInvisibleRule(turndownService);
      addAbsoluteImageRule(turndownService);
      addAbsoluteLinkRule(turndownService);
      turndownService.use(gfm);

      console.log('CopyAsMarkdown: Turndown rules and GFM plugin applied successfully.');
      isTurndownInitialized = true;
      return true;
    } catch (initError: unknown) {
      console.error('CopyAsMarkdown: Error during TurndownService initialization:', initError instanceof Error ? initError.message : initError);
      turndownService = null;
      isTurndownInitialized = false;
      return false; // Indicate initialization failure
    }
  }

  /**
   * Adds a Turndown rule to handle <pre> elements, attempting to preserve content
   * and detect language, while respecting preprocessing markers.
   * @param {TurndownService} service The Turndown service instance.
   */
  function addPreElementRule(service: TurndownService): void {
    service.addRule('preservePreCode', {
      filter: (node): boolean => (node as HTMLElement).nodeName === 'PRE',

      replacement: (content: string, nodeUntyped: unknown): string => {
        const node = nodeUntyped as HTMLElement;
        // Helper to check if a node should be processed (not marked as skipped)
        const shouldProcessNode = (currentNode: Node): boolean => {
          return !(
            currentNode.nodeType === Node.ELEMENT_NODE &&
            (currentNode as Element).hasAttribute &&
            (currentNode as Element).hasAttribute('data-cam-skip')
          ); // Use specific attribute
        };

        // Helper to recursively get text, skipping marked nodes and adding newlines based on markers
        const getTextFromVisibleNodes = (currentNode: Node | null): string => {
          let text = '';
          if (!currentNode) return text;

          if (currentNode.nodeType === Node.TEXT_NODE) {
            return currentNode.nodeValue || '';
          }

          if (currentNode.nodeType === Node.ELEMENT_NODE) {
            const element = currentNode as HTMLElement;
            if (!shouldProcessNode(element)) {
              return ''; // Skip node marked with data-cam-skip
            }

            // Check for line break marker *before* processing children
            // We will add the newline *after* processing children based on this flag
            const hasLineBreakMarker = element.hasAttribute('data-cam-linebreak');
            const isBrTag = element.tagName === 'BR'; // BR tags are special cases

            // Recursively process children
            if (element.childNodes && element.childNodes.length > 0) {
              for (let i = 0; i < element.childNodes.length; i++) {
                text += getTextFromVisibleNodes(element.childNodes[i]);
              }
            }

            // Add newline AFTER the content if the marker was present
            if (hasLineBreakMarker) {
              // Always add newline for BR tags
              if (isBrTag) {
                text += '\n';
              } else {
                // For other block-like elements, add newline only if content exists
                // and doesn't already end with a newline.
                if (text.length > 0 && !text.endsWith('\n')) {
                  text += '\n';
                }
              }
            }
          }
          return text;
        };

        let codeContent = getTextFromVisibleNodes(node);

        // Collapse multiple consecutive newlines (3 or more) into two
        // codeContent = codeContent.replace(/\n{3,}/g, '\n\n');

        const trimmedContent = `\n${codeContent.trim()}\n`;
        const language = detectCodeLanguage(node);

        // Return as a fenced code block
        return `\`\`\`${language}${trimmedContent}\`\`\``;
      },
    });
  }

  /**
   * Adds a Turndown rule to explicitly skip elements that were marked
   * with the 'data-cam-skip' attribute during preprocessing.
   * @param {TurndownService} service The Turndown service instance.
   */
  function addSkipMarkedElementsRule(service: TurndownService): void {
    service.addRule('skipMarkedDataCamSkip', {
      filter: (node): boolean => node.nodeType === Node.ELEMENT_NODE && (node as Element).hasAttribute && (node as Element).hasAttribute('data-cam-skip'),
      // Replacement returns empty string, effectively removing the element
      replacement: (): string => '',
    });
  }

  /**
   * Adds a Turndown rule to explicitly skip elements that were marked
   * as invisible ('data-cam-invisible') during preprocessing.
   * @param {TurndownService} service The Turndown service instance.
   */
  function addSkipInvisibleRule(service: TurndownService): void {
    service.addRule('skipInvisible', {
      filter: (node): boolean => node.nodeType === Node.ELEMENT_NODE && (node as Element).hasAttribute && (node as Element).hasAttribute('data-cam-invisible'),
      // Replacement returns empty string, effectively removing the element
      replacement: (): string => '',
    });
  }

  /**
   * Adds a Turndown rule to handle <img> elements, ensuring their src
   * attribute is converted to an absolute URL in the generated Markdown.
   * @param {TurndownService} service The Turndown service instance.
   */
  function addAbsoluteImageRule(service: TurndownService): void {
    service.addRule('absoluteImages', {
      filter: 'img',
      replacement: function (content: string, nodeUntyped: unknown): string {
        const node = nodeUntyped as HTMLImageElement;
        const alt = node.alt || '';
        let src = node.src || '';

        if (!src) {
          // If there's no src, don't output an image tag
          return '';
        }

        // Check if the src is already absolute or a data URI
        const isAbsolute = src.startsWith('http:') || src.startsWith('https:') || src.startsWith('//');
        const isDataUri = src.startsWith('data:');

        if (!isAbsolute && !isDataUri) {
          // It's relative, try to convert it to absolute
          try {
            const absoluteUrl = new URL(src, document.location.href).href;
            src = absoluteUrl;
          } catch (e: unknown) {
            console.warn(`CopyAsMarkdown: Could not convert relative src "${src}" to absolute:`, e instanceof Error ? e.message : e);
            // Optionally return something else, or just the original src
            // For now, let's proceed with the original (likely broken) src
            // Or return empty string if conversion fails?
            // return '';
          }
        }
        // else: src is already absolute or a data URI, use as is

        // Return the markdown image tag, potentially as a block element
        // Adding newlines around it often helps rendering
        return `\n\n![${alt}](${src})\n\n`;
      },
    });
  }

  /**
   * Adds a Turndown rule to handle <a> elements (links), ensuring their href
   * attribute is converted to an absolute URL in the generated Markdown.
   * Skips special protocols like mailto:, tel:, javascript:.
   * @param {TurndownService} service The Turndown service instance.
   */
  function addAbsoluteLinkRule(service: TurndownService): void {
    service.addRule('absoluteLinks', {
      filter: 'a',
      replacement: function (content: string, nodeUntyped: unknown): string {
        const node = nodeUntyped as HTMLAnchorElement;
        let href = node.href || '';
        const title = node.title || '';

        if (!href) {
          // If there's no href, just return the content (like a span)
          return content;
        }

        // Check for special protocols to leave untouched
        const isSpecialProtocol = /^(mailto|tel|javascript|data):/i.test(node.protocol);

        // Check if the href is already absolute
        const isAbsolute = href.startsWith('http:') || href.startsWith('https:') || href.startsWith('//');

        if (!isAbsolute && !isSpecialProtocol) {
          // It's relative and not special, try to convert it
          try {
            const absoluteUrl = new URL(href, document.location.href).href;
            href = absoluteUrl;
          } catch (e: unknown) {
            console.warn(`CopyAsMarkdown: Could not convert relative href "${href}" to absolute:`, e instanceof Error ? e.message : e);
            // Proceed with the original (likely broken) href in case of error
          }
        }
        // else: href is absolute or special, use as is

        // Format the link based on Turndown options (default is inline)
        // Add title attribute if present
        const titlePart = title ? ` "${title}"` : '';
        return `[${content}](${href}${titlePart})`;
      },
    });
  }

  /**
   * Extracts language identifier (e.g., 'javascript') from a class string.
   * Looks for 'language-xxx' or 'lang-xxx'.
   * @param {string} className The class string to parse.
   * @returns {string} The detected language or an empty string.
   */
  function extractLanguageFromClass(className: string | null | undefined): string {
    if (!className) return '';
    const match = className.match(/language-(\S+)|lang-(\S+)/);
    return match ? match[1] || match[2] || '' : '';
  }

  /**
   * Searches upwards from the given element for a language class.
   * @param {Element} element The starting element.
   * @param {number} maxDepth The maximum number of parent levels to check.
   * @returns {string} The detected language or an empty string.
   */
  function findLanguageInParents(element: Element | null, maxDepth: number): string {
    // Safety check: If the starting element is null or undefined, return immediately.
    if (!element) {
      return '';
    }
    let currentElement: Element | null = element.parentElement;
    for (let i = 0; i < maxDepth && currentElement; i++) {
      const language = extractLanguageFromClass(currentElement.className);
      if (language) {
        return language;
      }
      // Check if we've reached the top of the document
      if (currentElement === document.body || currentElement === document.documentElement) {
        break; // Stop searching if we hit body or html element
      }
      currentElement = currentElement.parentElement;
    }
    return ''; // Not found in parents within maxDepth
  }

  /**
   * Attempts to detect the programming language by checking the class names of
   * the <pre> element, its ancestors (up to 15 levels), and its first <code> child.
   * Looks for 'language-xxx' or 'lang-xxx'.
   * @param {Element} preNode The <pre> element.
   * @returns {string} The detected language name or an empty string.
   */
  function detectCodeLanguage(preNode: HTMLElement): string {
    // 1. Check <pre> itself
    let language = extractLanguageFromClass(preNode.className);
    if (language) {
      return language;
    }

    // 2. Check parents (up to 15 levels)
    language = findLanguageInParents(preNode, 15);
    if (language) {
      return language;
    }

    // 3. Check <code> child
    const codeElement = preNode.querySelector('code');
    if (codeElement) {
      // Use the result from the <code> tag directly, even if it's empty
      language = extractLanguageFromClass(codeElement.className);
      return language;
    }

    // 4. Not found anywhere
    return '';
  }

  // === Core Copy Logic ===

  /**
   * Preprocesses an element and its descendants before conversion.
   * Adds data attributes based on computed styles:
   * - 'data-cam-skip': For elements with 'user-select: none'.
   * - 'data-cam-invisible': For elements considered visually hidden for copying.
   * - 'data-cam-linebreak': For elements that cause line breaks.
   * These attributes are used by Turndown rules.
   * IMPORTANT: Modifies the passed element directly.
   * @param {Element} element The root element to preprocess.
   * @returns {boolean} Returns true if preprocessing should continue for children, false otherwise.
   */
  function preprocessElement(element: Element): boolean {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    // --- 1. Skip Check (user-select: none) ---
    const userSelectValue = getUserSelectValue(element);
    if (userSelectValue === 'none') {
      element.setAttribute('data-cam-skip', 'true');
      return false; // Don't process children or other checks if skipped
    }

    // --- 2. Invisibility Check (based on old isElementVisibleForCopy logic) ---
    const tagName = element.tagName.toUpperCase();
    // Filter out non-content tags early
    if (
      tagName === 'SCRIPT' ||
      tagName === 'STYLE' ||
      tagName === 'HEAD' ||
      tagName === 'NOSCRIPT' ||
      tagName === 'META' ||
      tagName === 'LINK'
    ) {
      element.setAttribute('data-cam-invisible', 'true');
      return false; // Treat as invisible, stop processing this branch
    }

    const style = window.getComputedStyle(element);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0' ||
      (style.position === 'fixed' && style.clipPath === 'inset(100%)')
    ) {
      element.setAttribute('data-cam-invisible', 'true');
      return false; // Invisible, stop processing this branch
    }

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      if (tagName === 'IMG' || element.children.length === 0) {
        element.setAttribute('data-cam-invisible', 'true');
        return false; // Invisible due to zero dimensions, stop processing
      }
      // Otherwise, allow zero-dimension elements with children (like wrapper divs)
    }

    // --- 3. Line Break Check (only if visible and not skipped) ---
    const display = style.display; // Already have style from above
    const isBlockLike: boolean =
      [
        'block',
        'flex',
        'grid',
        'table',
        'list-item',
        'table-caption',
        'table-row-group',
        'table-header-group',
        'table-footer-group',
        'table-row',
        'table-cell',
      ].includes(display) || ['BR', 'P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE'].includes(tagName);

    if (isBlockLike) {
      element.setAttribute('data-cam-linebreak', 'true');
    }

    // --- 4. Recurse into Children ---
    if (element.children && element.children.length > 0) {
      Array.from(element.children).forEach(child => preprocessElement(child as Element));
    }
    return true; // Indicate children were processed (or element is a leaf)
  }

  /**
   * Removes the preprocessing attributes ('data-cam-skip', 'data-cam-invisible',
   * 'data-cam-linebreak') from an element and its descendants.
   * @param {Element} element The root element to clean up.
   */
  function removePreprocessingMarkers(element: Element): void {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;

    if (element.hasAttribute('data-cam-skip')) {
      element.removeAttribute('data-cam-skip');
    }
    if (element.hasAttribute('data-cam-invisible')) {
      element.removeAttribute('data-cam-invisible');
    }
    if (element.hasAttribute('data-cam-linebreak')) {
      element.removeAttribute('data-cam-linebreak');
    }

    // Recursively process children
    if (element.children && element.children.length > 0) {
      Array.from(element.children).forEach(child => removePreprocessingMarkers(child as Element));
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
    if (!turndownService) { // Check again after init attempt
         throw new Error('Turndown service is not available after initialization attempt.');
    }

    // 1. Preprocess the original element (mark nodes to skip and line breaks)
    preprocessElement(elementToCopy);

    let markdown = '';
    try {
      // 2. Convert the element's outerHTML using Turndown
      // Turndown uses the 'data-cam-skip' attribute via the rules
      markdown = turndownService.turndown(elementToCopy.outerHTML);
    } catch (conversionError: unknown) {
      console.error('CopyAsMarkdown: Turndown conversion failed:', conversionError instanceof Error ? conversionError.message : conversionError);
      throw new Error('Markdown conversion failed.'); // Rethrow or handle
    } finally {
      // 3. Clean up the markers from the original element regardless of success/failure
      removePreprocessingMarkers(elementToCopy);
    }

    // 4. Copy to clipboard
    try {
      await navigator.clipboard.writeText(markdown);
      return markdown; // Resolve with the markdown content
    } catch (clipboardError: unknown) {
      console.error('CopyAsMarkdown: Failed to copy to clipboard:', clipboardError instanceof Error ? clipboardError.message : clipboardError);
      throw new Error('Failed to write to clipboard.');
    }
  }

  // === UI & Event Handling ===

  /**
   * Creates and displays the "Copy as Markdown" button near the target element.
   * @param {Element} targetElement The element near which to place the button.
   */
  function createCopyButton(targetElement: HTMLElement): void {
    removeCopyButton(); // Ensure only one button exists

    copyButton = document.createElement('button');
    copyButton.textContent = 'Copy as Markdown';
    // Apply styles (consider moving to CSS if this were not a bookmarklet)
    Object.assign(copyButton.style, {
      position: 'absolute',
      zIndex: '2147483647', // Max z-index
      padding: '5px 10px',
      background: '#4CAF50', // Green
      color: 'white',
      border: 'none',
      borderRadius: '3px',
      cursor: 'pointer',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      fontSize: '12px',
      fontFamily: 'sans-serif', // Ensure basic font
      lineHeight: '1.2',
    } as Partial<CSSStyleDeclaration>);

    // Position the button near the top-right corner of the element
    const rect = targetElement.getBoundingClientRect();
    copyButton.style.left = `${window.scrollX + rect.right + 5}px`;
    copyButton.style.top = `${window.scrollY + rect.top}px`;

    // --- Button Click Handler ---
    copyButton.addEventListener('click', async (e: MouseEvent) => {
      e.stopPropagation(); // Prevent click from bubbling up (e.g., deselecting)
      if (!selectedElement) return; // Should not happen if button exists
      if (!copyButton) return; // Check if copyButton is null

      const originalText = copyButton.textContent;
      const originalBackground = copyButton.style.background;
      copyButton.textContent = 'Copying...';
      copyButton.disabled = true; // Prevent multiple clicks

      try {
        await copyElementAsMarkdown(selectedElement);
        // Visual feedback for success
        // Need to check copyButton again as it might be removed in the meantime by another action
        if (copyButton) {
          copyButton.textContent = 'Copied!';
          copyButton.style.background = '#45a049'; // Darker green
        }
      } catch (err: unknown) {
        console.error('CopyAsMarkdown: Copy process failed:', err instanceof Error ? err.message : err);
        if (copyButton) {
          copyButton.textContent = 'Error!';
          copyButton.style.background = '#F44336'; // Red
        }
        // Use error message in alert
        const errorMessage = err instanceof Error ? err.message : String(err);
        alert(`Copy failed: ${errorMessage}`); // Notify user
      } finally {
        // Restore button appearance after a delay
        setTimeout(() => {
          if (copyButton) {
            // Check if button still exists
            copyButton.textContent = originalText;
            copyButton.style.background = originalBackground;
            copyButton.disabled = false;
          }
        }, 1500);
      }
    });

    document.body.appendChild(copyButton);
  }

  /**
   * Removes the "Copy as Markdown" button from the DOM if it exists.
   */
  function removeCopyButton(): void {
    if (copyButton && copyButton.parentNode) {
      copyButton.parentNode.removeChild(copyButton);
    }
    copyButton = null;
  }

  /**
   * Handles mouseover events during selection mode.
   * Highlights hoverable elements.
   * @param {MouseEvent} event The mouse event.
   */
  function handleMouseOver(event: MouseEvent): void {
    if (!selectorActive) return;
    // Use event.target which is EventTarget | null, cast to Node or Element when needed
    const target = event.target as Node | null;

    // Ignore irrelevant targets
    if (!target || target === selectedElement || target === document.body || target === copyButton) return;

    // Check if the element is suitable for hovering/selection
    if (!isElementHoverable(target)) {
      // If hovering over a non-hoverable element, remove highlight from previous one
      if (currentHoverElement && currentHoverElement !== selectedElement) {
        restoreStyle(currentHoverElement);
      }
      currentHoverElement = null;
      return;
    }

    // Target is hoverable, ensure it's an HTMLElement for styling
    const targetElement = target as HTMLElement;

    // If moved from a different hoverable element, restore its style
    if (currentHoverElement && currentHoverElement !== targetElement && currentHoverElement !== selectedElement) {
      restoreStyle(currentHoverElement);
    }

    // Apply hover style if the target is new
    if (currentHoverElement !== targetElement) {
      currentHoverElement = targetElement;
      applyStyle(currentHoverElement, HOVER_STYLE);
    }
  }

  /**
   * Handles mouseout events during selection mode.
   * Removes highlight unless moving to the copy button or non-hoverable element.
   * @param {MouseEvent} event The mouse event.
   */
  function handleMouseOut(event: MouseEvent): void {
    if (
      !selectorActive ||
      !currentHoverElement ||
      currentHoverElement === selectedElement ||
      event.target !== currentHoverElement // Ensure event originated from the currently hovered element
    ) {
      return;
    }

    // Don't remove highlight if moving to the copy button or an unhoverable related target
    // event.relatedTarget is EventTarget | null
    const relatedTarget = event.relatedTarget as Node | null; // Cast for isElementHoverable
    if (relatedTarget === copyButton || (relatedTarget && !isElementHoverable(relatedTarget))) {
      return;
    }

    // Otherwise, restore style and clear hover state
    restoreStyle(currentHoverElement);
    currentHoverElement = null;
  }

  /**
   * Handles click events during selection mode.
   * Finalizes the selection, applies selected style, and shows the copy button.
   * @param {MouseEvent} event The mouse event.
   */
  function handleClick(event: MouseEvent): void {
    // Ignore clicks on the copy button itself
    if (event.target === copyButton) return;

    // Requires active selection mode and a currently hovered element
    if (!selectorActive || !currentHoverElement) return;

    // Ensure currentHoverElement is an HTMLElement before proceeding
    if (!(currentHoverElement instanceof HTMLElement)) return;

    event.preventDefault();
    event.stopPropagation(); // Prevent triggering other click listeners

    // Clear previous selection styling and button
    if (selectedElement) {
      restoreStyle(selectedElement);
      removeCopyButton();
    }

    // Set the new selected element
    selectedElement = currentHoverElement;
    applyStyle(selectedElement, SELECTED_STYLE, 'default'); // Apply selected style
    currentHoverElement = null; // Clear hover state

    createCopyButton(selectedElement); // Show the copy button

    // Deactivate selection mode *state*
    selectorActive = false;
    console.log('[copyAsMarkdown] Selection complete. selectorActive set to false.');

    // Remove only the listeners related to element picking/hovering,
    // KEEP the keydown listener active for Escape to clear selection.
    console.log('[copyAsMarkdown] Removing mouse/click listeners after selection...');
    if (boundHandleMouseOver) document.removeEventListener('mouseover', boundHandleMouseOver, true);
    if (boundHandleMouseOut) document.removeEventListener('mouseout', boundHandleMouseOut, true);
    if (boundHandleClick) document.removeEventListener('click', boundHandleClick, true);
    // Reset only these bound handlers
    boundHandleMouseOver = null;
    boundHandleMouseOut = null;
    boundHandleClick = null;
    // DO NOT call removePickModeEventListeners() here
  }

  /**
   * Handles keydown events, specifically looking for the Escape key.
   * @param {KeyboardEvent} event The keyboard event.
   */
  function handleKeyDown(event: KeyboardEvent): void {
    console.log('[copyAsMarkdown] handleKeyDown triggered. Key:', event.key, 'selectorActive:', selectorActive);
    if (event.key === 'Escape') {
      if (selectorActive) {
        // If actively picking, stop the mode completely (removes all listeners)
        console.log('[copyAsMarkdown] Escape pressed during active selection. Stopping mode...');
        stopSelectionMode(true); // Calls removePickModeEventListeners internally
      } else if (selectedElement) {
        // If an element is already selected (not actively picking), just clear the selection
        console.log('[copyAsMarkdown] Escape pressed with element selected. Clearing selection...');
        restoreStyle(selectedElement);
        removeCopyButton();
        selectedElement = null;
        // DO NOT remove keydown listener here, it might be needed later
      }
    }
  }

  // Helper to add event listeners for pick mode
  function addPickModeEventListeners(): void {
    console.log('[copyAsMarkdown] Adding pick mode event listeners...');
    // Add non-click listeners immediately
    boundHandleMouseOver = handleMouseOver.bind(null);
    boundHandleMouseOut = handleMouseOut.bind(null);
    boundHandleKeyDown = handleKeyDown.bind(null);

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
            alert('CopyAsMarkdown Error: Could not initialize Markdown converter. Cannot start selection mode.');
            return;
        }
    }

    if (selectorActive) {
        console.log('CopyAsMarkdown: Selection mode already active.');
        return; // Prevent starting multiple times
    }
    console.log('CopyAsMarkdown: Activating selection mode...');

    // Clear any previous selection state before starting
    if (selectedElement) {
      restoreStyle(selectedElement);
      selectedElement = null;
    }
    removeCopyButton();
    if (currentHoverElement) {
      restoreStyle(currentHoverElement);
      currentHoverElement = null;
    }

    // Store and change body cursor
    const body = document.body;
    if (body && originalBodyCursor === null) { // Store only once per activation cycle
        originalBodyCursor = body.style.cursor || '';
        body.style.cursor = 'crosshair';
        console.log('[copyAsMarkdown] Changed body cursor to crosshair.');
    }

    selectorActive = true;
    addPickModeEventListeners();
    // console.log('CopyAsMarkdown: Mode activated.');
  }

  /**
   * Stops the element selection mode COMPLETELY, typically due to cancellation (e.g., pressing Escape).
   * This function is responsible for:
   * - Removing all active event listeners (mouseover, mouseout, click, keydown).
   * - Restoring the original body cursor.
   * - Clearing any temporary hover styles.
   * - Optionally clearing the current selection and removing the copy button.
   *
   * **IMPORTANT:** This function should ONLY be called when *cancelling* or *exiting* the selection mode
   * entirely (like pressing Esc). It should NOT be called after a successful element selection click,
   * as the `handleClick` function handles the necessary state changes and listener removal for that specific case.
   *
   * @param {boolean} [clearSelection=true] If true, also restores the style of the selected element
   *                                        and removes the copy button. Set to false if you want to stop
   *                                        listeners/cursor but leave the visual selection intact temporarily
   *                                        (though standard cancellation flow usually implies clearing).
   */
  function stopSelectionMode(clearSelection = true): void {
    console.log(`[copyAsMarkdown] Stopping selection mode (clearSelection: ${clearSelection})...`);
    removePickModeEventListeners(); // Remove mouse/click listeners

    // Explicitly remove keydown listener here
    if (boundHandleKeyDown) {
      console.log('[copyAsMarkdown] Removing keydown listener in stopSelectionMode...');
      document.removeEventListener('keydown', boundHandleKeyDown, true);
      boundHandleKeyDown = null; // Reset bound handler
    }

    selectorActive = false;

    // Restore body cursor
    const body = document.body;
    if (body && originalBodyCursor !== null) {
        body.style.cursor = originalBodyCursor;
        if (!body.style.cursor) body.style.removeProperty('cursor'); // Clean up if original was empty
        originalBodyCursor = null; // Reset stored value
        console.log('[copyAsMarkdown] Restored body cursor.');
    }

    // Clear hover highlight if any
    if (currentHoverElement) {
      restoreStyle(currentHoverElement);
      currentHoverElement = null;
    }

    // Clear selection highlight and button if requested
    if (clearSelection && selectedElement) {
      restoreStyle(selectedElement);
      removeCopyButton();
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
    if (!turndownService) { // Check again after init attempt
         throw new Error('Turndown service is not available after initialization attempt.');
    }

    console.log('CopyAsMarkdown: Converting provided HTML...');
    let markdown = '';
    try {
      // No preprocessing needed for direct HTML string
      markdown = turndownService.turndown(htmlString);
    } catch (conversionError: unknown) {
      console.error('CopyAsMarkdown: Turndown conversion failed for HTML string:', conversionError instanceof Error ? conversionError.message : conversionError);
      throw new Error('Markdown conversion failed.');
    }

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(markdown);
      console.log('CopyAsMarkdown: HTML successfully copied as Markdown.');
      // Optionally: Show a brief success notification (e.g., using a temporary overlay)
    } catch (clipboardError: unknown) {
      console.error('CopyAsMarkdown: Failed to copy HTML to clipboard:', clipboardError instanceof Error ? clipboardError.message : clipboardError);
      throw new Error('Failed to write to clipboard.');
    }
  }

  // Return the public API
  return {
    init: initializeTurndownService, // Expose init function
    startSelectionMode,
    stopSelectionMode,
    copyHtmlAsMarkdown,
  };
})();

// Export the public API object
export const markdownUtils = markdownCopier;
