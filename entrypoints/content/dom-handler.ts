/**
 * Contains pure or near-pure functions for DOM inspection and attribute extraction,
 * extracted from copyAsMarkdown.ts.
 */

import { logger } from "../../utils/logger";

// === Visibility & Style Checks ===

/**
 * Checks if a node is suitable for hover interactions based on its type and computed style.
 * @param {Node} node The node to check.
 * @returns {boolean} True if the element is considered hoverable, false otherwise.
 */
export function isElementHoverable(node: Node): boolean {
  // --- Visibility Check ---
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
      // Allow zero-dimension elements only if they have children (like wrapper divs)
      // Images without dimensions are not hoverable
      if (tagName === 'IMG' || element.children.length === 0) {
        return false;
      }
    }

    // --- User Select Check ---
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
export function getUserSelectValue(element: Element): string {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';
  try {
    const style = window.getComputedStyle(element);
    return (
      style.getPropertyValue('user-select') || style.userSelect || style.webkitUserSelect || ''
    ).trim();
  } catch (err: unknown) {
    logger.warn(
      'CopyAsMarkdown: Error getting userSelect value:',
      {
        error: err instanceof Error ? err.message : err
      }
    );
    return '';
  }
}

// === Language Detection Helpers ===

/**
 * Extracts language identifier (e.g., 'javascript') from a class string.
 * Looks for 'language-xxx' or 'lang-xxx'.
 * @param {string} className The class string to parse.
 * @returns {string} The detected language or an empty string.
 */
export function extractLanguageFromClass(className: string | null | undefined): string {
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
export function findLanguageInParents(element: Element | null, maxDepth: number): string {
  if (!element) {
    return '';
  }
  let currentElement: Element | null = element.parentElement;
  for (let i = 0; i < maxDepth && currentElement; i++) {
    const language = extractLanguageFromClass(currentElement.className);
    if (language) {
      return language;
    }
    if (currentElement === document.body || currentElement === document.documentElement) {
      break;
    }
    currentElement = currentElement.parentElement;
  }
  return '';
}

/**
 * Attempts to detect the programming language by checking the class names of
 * the <pre> element, its ancestors (up to 15 levels), and its first <code> child.
 * Looks for 'language-xxx' or 'lang-xxx'.
 * @param {Element} preNode The <pre> element.
 * @returns {string} The detected language name or an empty string.
 */
export function detectCodeLanguage(preNode: HTMLElement): string {
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
    language = extractLanguageFromClass(codeElement.className);
    return language;
  }

  // 4. Not found anywhere
  return '';
}
