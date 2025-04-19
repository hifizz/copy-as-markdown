import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

export function copyAsMarkdown() {
  console.log('copyAsMarkdown called from copier.ts');
  // --- Configuration ---
  const HOVER_STYLE = '2px solid green';
  const SELECTED_STYLE = '3px solid green';

  // --- State ---
  let selectorActive = false;
  let currentHoverElement: Element | null = null;
  let selectedElement: Element | null = null;
  let copyButton: HTMLButtonElement | null = null;
  const originalStyles = new WeakMap<Element, { outline: string; cursor: string }>(); // Stores original outline/cursor for elements
  let turndownService: TurndownService | null = null;

  // === Visibility Checks ===

  /**
   * Checks if an element should be interactive (hoverable, selectable) in the UI.
   * Performs visibility checks (display, opacity, dimensions etc.) AND
   * checks the 'user-select' property.
   * @param {Node} node The node to check.
   * @returns {boolean} True if the element is hoverable/selectable.
   */
  function isElementHoverable(node) {
    // --- Visibility Check (similar to old isElementVisibleForCopy) ---
    if (!node) return false;

    const nodeType = node.nodeType;
    if (nodeType === Node.COMMENT_NODE) return false;
    if (nodeType !== Node.ELEMENT_NODE && nodeType !== Node.TEXT_NODE) return false;

    if (nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toUpperCase();
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

      const style = window.getComputedStyle(node);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0' ||
        (style.position === 'fixed' && style.clipPath === 'inset(100%)')
      ) {
        return false;
      }

      const rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        if (tagName === 'IMG' || node.children.length === 0) {
          return false;
        }
      }

      // --- User Select Check (Specific to Hoverable) ---
      const userSelect = style.userSelect || style.webkitUserSelect || style.mozUserSelect || style.msUserSelect;
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
  function getUserSelectValue(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';
    try {
      const style = window.getComputedStyle(element);
      return (
        style.getPropertyValue('user-select') ||
        style.userSelect ||
        style.getPropertyValue('-webkit-user-select') ||
        style.getPropertyValue('-moz-user-select') ||
        style.getPropertyValue('-ms-user-select') ||
        ''
      ).trim();
    } catch (err) {
      console.warn('CopyAsMarkdown: Error getting userSelect value:', err);
      return '';
    }
  }

  // === DOM Manipulation & Styling ===

  /**
   * Stores the original outline and cursor style of an element.
   * @param {Element} element The element whose style is to be stored.
   */
  function storeOriginalStyle(element) {
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
  function applyStyle(element, outlineStyle, cursorStyle = 'pointer') {
    storeOriginalStyle(element);
    element.style.outline = outlineStyle;
    element.style.cursor = cursorStyle;
  }

  /**
   * Restores the original outline and cursor style of an element.
   * @param {Element | null} element The element whose style is to be restored.
   */
  function restoreStyle(element) {
    if (!element || !originalStyles.has(element)) return;

    const styles = originalStyles.get(element);
    element.style.outline = styles.outline;
    element.style.cursor = styles.cursor;

    // Clean up inline styles if they were originally empty
    if (!element.style.outline) element.style.removeProperty('outline');
    if (!element.style.cursor) element.style.removeProperty('cursor');

    originalStyles.delete(element);
  }

  // === Turndown Setup & Rules ===

  /**
   * Initializes the global `turndownService` instance with specific rules.
   */
  function initializeTurndownService() {
    if (turndownService) {
      console.log('CopyAsMarkdown: Turndown service already initialized.');
      return;
    }
    console.log('CopyAsMarkdown: Attempting to initialize TurndownService...');
    try {
      // Directly instantiate using the imported module
      turndownService = new TurndownService({
        codeBlockStyle: 'fenced',
        headingStyle: 'atx',
        hr: '---',
        bulletListMarker: '-',
      });
      console.log('CopyAsMarkdown: TurndownService instantiated successfully.');

      // --- Custom Rule for <pre> elements ---
      addPreElementRule(turndownService);

      // --- Custom Rule to skip elements marked during preprocessing ---
      addSkipMarkedElementsRule(turndownService);

      // --- NEW: Custom Rule to skip invisible elements marked during preprocessing ---
      addSkipInvisibleRule(turndownService);

      // --- NEW: Custom Rule for images to ensure absolute URLs ---
      addAbsoluteImageRule(turndownService);

      // --- NEW: Custom Rule for links to ensure absolute URLs ---
      addAbsoluteLinkRule(turndownService);

      // --- Use GFM Plugin (for tables, strikethrough, etc.) ---
      console.log('CopyAsMarkdown: Attempting to apply GFM plugin...');
      // Directly use the imported plugin
      turndownService.use(gfm);
      console.log('CopyAsMarkdown: GFM plugin applied successfully.');
    } catch (initError) {
      console.error('CopyAsMarkdown: Error during TurndownService initialization:', initError);
      turndownService = null; // Ensure service is null if init failed
      throw initError; // Re-throw the error to be caught by the caller
    }
  }

  /**
   * Adds a Turndown rule to handle <pre> elements, attempting to preserve content
   * and detect language, while respecting preprocessing markers.
   * @param {TurndownService} service The Turndown service instance.
   */
  function addPreElementRule(service) {
    service.addRule('preservePreCode', {
      filter: node => node.nodeName === 'PRE',

      replacement: (content, node) => {
        // Helper to check if a node should be processed (not marked as skipped)
        const shouldProcessNode = currentNode => {
          return !(
            currentNode.nodeType === Node.ELEMENT_NODE &&
            currentNode.hasAttribute &&
            currentNode.hasAttribute('data-cam-skip')
          ); // Use specific attribute
        };

        // Helper to recursively get text, skipping marked nodes and adding newlines based on markers
        const getTextFromVisibleNodes = currentNode => {
          let text = '';
          if (!currentNode) return text;

          if (currentNode.nodeType === Node.TEXT_NODE) {
            return currentNode.nodeValue || '';
          }

          if (currentNode.nodeType === Node.ELEMENT_NODE) {
            if (!shouldProcessNode(currentNode)) {
              return ''; // Skip node marked with data-cam-skip
            }

            // Check for line break marker *before* processing children
            // We will add the newline *after* processing children based on this flag
            const hasLineBreakMarker = currentNode.hasAttribute('data-cam-linebreak');
            const isBrTag = currentNode.tagName === 'BR'; // BR tags are special cases

            // Recursively process children
            if (currentNode.childNodes && currentNode.childNodes.length > 0) {
              for (let i = 0; i < currentNode.childNodes.length; i++) {
                text += getTextFromVisibleNodes(currentNode.childNodes[i]);
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
  function addSkipMarkedElementsRule(service) {
    service.addRule('skipMarkedDataCamSkip', {
      filter: node => node.nodeType === Node.ELEMENT_NODE && node.hasAttribute && node.hasAttribute('data-cam-skip'), // Use specific attribute
      // Replacement returns empty string, effectively removing the element
      replacement: () => '',
    });
  }

  /**
   * Adds a Turndown rule to explicitly skip elements that were marked
   * as invisible ('data-cam-invisible') during preprocessing.
   * @param {TurndownService} service The Turndown service instance.
   */
  function addSkipInvisibleRule(service) {
    service.addRule('skipInvisible', {
      filter: node =>
        node.nodeType === Node.ELEMENT_NODE && node.hasAttribute && node.hasAttribute('data-cam-invisible'),
      // Replacement returns empty string, effectively removing the element
      replacement: () => '',
    });
  }

  /**
   * Adds a Turndown rule to handle <img> elements, ensuring their src
   * attribute is converted to an absolute URL in the generated Markdown.
   * @param {TurndownService} service The Turndown service instance.
   */
  function addAbsoluteImageRule(service) {
    service.addRule('absoluteImages', {
      filter: 'img',
      replacement: function (content, node) {
        const alt = node.getAttribute('alt') || '';
        let src = node.getAttribute('src') || '';

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
          } catch (e) {
            console.warn(`CopyAsMarkdown: Could not convert relative src "${src}" to absolute:`, e);
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
  function addAbsoluteLinkRule(service) {
    service.addRule('absoluteLinks', {
      filter: 'a',
      replacement: function (content, node) {
        let href = node.getAttribute('href') || '';
        const title = node.getAttribute('title') || '';

        if (!href) {
          // If there's no href, just return the content (like a span)
          return content;
        }

        // Check for special protocols to leave untouched
        const isSpecialProtocol = /^(mailto|tel|javascript|data):/i.test(href);

        // Check if the href is already absolute
        const isAbsolute = href.startsWith('http:') || href.startsWith('https:') || href.startsWith('//');

        if (!isAbsolute && !isSpecialProtocol) {
          // It's relative and not special, try to convert it
          try {
            const absoluteUrl = new URL(href, document.location.href).href;
            href = absoluteUrl;
          } catch (e) {
            console.warn(`CopyAsMarkdown: Could not convert relative href "${href}" to absolute:`, e);
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
  function extractLanguageFromClass(className) {
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
  function findLanguageInParents(element, maxDepth) {
    // Safety check: If the starting element is null or undefined, return immediately.
    if (!element) {
      return '';
    }
    let currentElement = element.parentElement;
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
  function detectCodeLanguage(preNode) {
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
  function preprocessElement(element) {
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
    const isBlockLike =
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
      Array.from(element.children).forEach(preprocessElement);
    }
    return true; // Indicate children were processed (or element is a leaf)
  }

  /**
   * Removes the preprocessing attributes ('data-cam-skip', 'data-cam-invisible',
   * 'data-cam-linebreak') from an element and its descendants.
   * @param {Element} element The root element to clean up.
   */
  function removePreprocessingMarkers(element) {
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
      Array.from(element.children).forEach(removePreprocessingMarkers);
    }
  }

  /**
   * Converts the selected DOM element to Markdown and copies it to the clipboard.
   * Handles Turndown initialization, preprocessing, conversion, and cleanup.
   * @param {Element} elementToCopy The selected DOM element.
   * @returns {Promise<string>} A promise that resolves with the generated Markdown.
   * @throws {Error} If Turndown fails to load or conversion fails.
   */
  async function copyElementAsMarkdown(elementToCopy: Element) {
    if (!elementToCopy) {
      throw new Error('No element selected for copying.');
    }

    // Ensure Turndown is initialized (no longer async loading)
    if (!turndownService) {
      initializeTurndownService();
    }
    // The check below is still needed in case initialization failed somehow, though unlikely now
    if (!turndownService) {
      throw new Error('Turndown service could not be initialized.');
    }

    // 1. Preprocess the original element (mark nodes to skip and line breaks)
    preprocessElement(elementToCopy);

    let markdown = '';
    try {
      // 2. Convert the element's outerHTML using Turndown
      // Turndown uses the 'data-cam-skip' attribute via the rules
      markdown = turndownService.turndown(elementToCopy.outerHTML);
    } catch (conversionError) {
      console.error('CopyAsMarkdown: Turndown conversion failed:', conversionError);
      throw new Error('Markdown conversion failed.'); // Rethrow or handle
    } finally {
      // 3. Clean up the markers from the original element regardless of success/failure
      removePreprocessingMarkers(elementToCopy);
    }

    // 4. Copy to clipboard
    try {
      await navigator.clipboard.writeText(markdown);
      return markdown; // Resolve with the markdown content
    } catch (clipboardError) {
      console.error('CopyAsMarkdown: Failed to copy to clipboard:', clipboardError);
      throw new Error('Failed to write to clipboard.');
    }
  }

  // === UI & Event Handling ===

  /**
   * Creates and displays the "Copy as Markdown" button near the target element.
   * @param {Element} targetElement The element near which to place the button.
   */
  function createCopyButton(targetElement) {
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
    });

    // Position the button near the top-right corner of the element
    const rect = targetElement.getBoundingClientRect();
    copyButton.style.left = `${window.scrollX + rect.right + 5}px`;
    copyButton.style.top = `${window.scrollY + rect.top}px`;

    // --- Button Click Handler ---
    copyButton.addEventListener('click', async e => {
      e.stopPropagation(); // Prevent click from bubbling up (e.g., deselecting)
      if (!selectedElement) return; // Should not happen if button exists

      const originalText = copyButton.textContent;
      const originalBackground = copyButton.style.background;
      copyButton.textContent = 'Copying...';
      copyButton.disabled = true; // Prevent multiple clicks

      try {
        await copyElementAsMarkdown(selectedElement);
        // Visual feedback for success
        copyButton.textContent = 'Copied!';
        copyButton.style.background = '#45a049'; // Darker green
      } catch (err) {
        console.error('CopyAsMarkdown: Copy process failed:', err);
        copyButton.textContent = 'Error!';
        copyButton.style.background = '#F44336'; // Red
        alert(`Copy failed: ${err.message}`); // Notify user
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
  function removeCopyButton() {
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
  function handleMouseOver(event) {
    if (!selectorActive) return;
    const target = event.target;

    // Ignore irrelevant targets
    if (target === selectedElement || target === document.body || target === copyButton) return;

    // Check if the element is suitable for hovering/selection
    if (!isElementHoverable(target)) {
      // If hovering over a non-hoverable element, remove highlight from previous one
      if (currentHoverElement && currentHoverElement !== selectedElement) {
        restoreStyle(currentHoverElement);
      }
      currentHoverElement = null;
      return;
    }

    // If moved from a different hoverable element, restore its style
    if (currentHoverElement && currentHoverElement !== target && currentHoverElement !== selectedElement) {
      restoreStyle(currentHoverElement);
    }

    // Apply hover style if the target is new
    if (currentHoverElement !== target) {
      currentHoverElement = target;
      applyStyle(currentHoverElement, HOVER_STYLE);
    }
  }

  /**
   * Handles mouseout events during selection mode.
   * Removes highlight unless moving to the copy button or non-hoverable element.
   * @param {MouseEvent} event The mouse event.
   */
  function handleMouseOut(event) {
    if (
      !selectorActive ||
      !currentHoverElement ||
      currentHoverElement === selectedElement ||
      event.target !== currentHoverElement // Ensure event originated from the currently hovered element
    ) {
      return;
    }

    // Don't remove highlight if moving to the copy button or an unhoverable related target
    const relatedTarget = event.relatedTarget;
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
  function handleClick(event) {
    // Ignore clicks on the copy button itself
    if (event.target === copyButton) return;

    // Requires active selection mode and a currently hovered element
    if (!selectorActive || !currentHoverElement) return;

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

    // Deactivate selection mode after a selection is made
    selectorActive = false;
    // console.log('CopyAsMarkdown: Selection complete.');
  }

  /**
   * Handles keydown events, specifically looking for the Escape key.
   * @param {KeyboardEvent} event The keyboard event.
   */
  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      if (selectorActive) {
        // If actively selecting, cancel selection mode
        stopSelectionMode(true); // True clears any current hover highlight
        // console.log('CopyAsMarkdown: Selection mode stopped via Escape.');
      } else if (selectedElement) {
        // If an element is already selected, clear the selection
        restoreStyle(selectedElement);
        removeCopyButton();
        selectedElement = null;
        // console.log('CopyAsMarkdown: Selection cleared via Escape.');
      }
      // Optionally log how to restart if needed
      // console.log('CopyAsMarkdown: Restart selection with: window.elementSelector.start()');
    }
  }

  // === Control Functions ===

  /**
   * Starts the element selection mode.
   * Attaches necessary event listeners.
   */
  function startSelectionMode() {
    if (selectorActive) return; // Prevent starting multiple times
    // console.log('CopyAsMarkdown: Activating selection mode...');

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

    selectorActive = true;
    // Use capture phase (true) for listeners to catch events early
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    // console.log('CopyAsMarkdown: Mode activated.');
  }

  /**
   * Stops the element selection mode.
   * Removes event listeners and optionally clears the current selection.
   * @param {boolean} [clearSelection=true] Whether to clear the currently selected element's style and button.
   */
  function stopSelectionMode(clearSelection = true) {
    // console.log('CopyAsMarkdown: Stopping selection mode...');
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);

    selectorActive = false;

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
    // console.log('CopyAsMarkdown: Mode stopped.');
  }

  // === Initialization ===

  /**
   * Main entry point for the bookmarklet.
   * Cleans up previous instances, sets up the global API, loads Turndown, and starts selection.
   */
  function initialize() {
    // Clean up any previous instance of this bookmarklet
    if ((window as any).elementSelector && (window as any).elementSelector.stop) {
      // console.log('CopyAsMarkdown: Stopping previous instance...');
      (window as any).elementSelector.stop(true); // Stop and clear selection
    }

    // Expose control functions globally (optional, but useful for debugging/restarting)
    (window as any).elementSelector = {
      start: startSelectionMode,
      stop: stopSelectionMode,
      // Expose other potentially useful functions for debugging if needed:
      // isVisible: isElementHoverable,
      // isHoverable: isElementHoverable,
      // copyElement: copyElementAsMarkdown
    };

    // Initialize Turndown synchronously now
    try {
      initializeTurndownService();
      console.log('CopyAsMarkdown: Turndown initialized successfully (called from initialize).');
    } catch (err) {
      // Log the full error object to the console where the script is executed (the webpage console)
      console.error('CopyAsMarkdown: Failed to initialize TurndownService (caught in initialize):', err);
      alert(
        'CopyAsMarkdown Error: Could not initialize Markdown converter. ' +
          'Copy functionality may be broken. Check console for details. ',
      );
      // Decide if you want to proceed without Turndown or stop
      // return; // Example: stop if Turndown fails
    }

    // Directly start selection mode
    startSelectionMode();
  }

  // --- Start Execution ---
  initialize();
}
