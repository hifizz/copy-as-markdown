import { getUserSelectValue } from './dom-handler';
import {
  DATA_ATTR_SKIP,
  DATA_ATTR_INVISIBLE,
  DATA_ATTR_LINEBREAK,
} from './constants';

/**
 * Preprocesses an element and its descendants before conversion.
 * Adds data attributes based on computed styles:
 * - DATA_ATTR_SKIP: For elements with 'user-select: none'.
 * - DATA_ATTR_INVISIBLE: For elements considered visually hidden for copying.
 * - DATA_ATTR_LINEBREAK: For elements that cause line breaks.
 * These attributes are used by Turndown rules.
 * IMPORTANT: Modifies the passed element directly.
 * @param {Element} element The root element to preprocess.
 * @returns {boolean} Returns true if preprocessing should continue for children, false otherwise.
 */
export function preprocessElement(element: Element): boolean {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

  // --- 1. Skip Check (user-select: none) --- Uses imported function
  const userSelectValue = getUserSelectValue(element);
  if (userSelectValue === 'none') {
    element.setAttribute(DATA_ATTR_SKIP, 'true');
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
    element.setAttribute(DATA_ATTR_INVISIBLE, 'true');
    return false; // Treat as invisible, stop processing this branch
  }

  const style = window.getComputedStyle(element);
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0' ||
    (style.position === 'fixed' && style.clipPath === 'inset(100%)')
  ) {
    element.setAttribute(DATA_ATTR_INVISIBLE, 'true');
    return false; // Invisible, stop processing this branch
  }

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    if (tagName === 'IMG' || element.children.length === 0) {
      element.setAttribute(DATA_ATTR_INVISIBLE, 'true');
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
    element.setAttribute(DATA_ATTR_LINEBREAK, 'true');
  }

  // --- 4. Recurse into Children ---
  if (element.children && element.children.length > 0) {
    Array.from(element.children).forEach(child => preprocessElement(child as Element));
  }
  return true; // Indicate children were processed (or element is a leaf)
}

/**
 * Removes the preprocessing attributes (DATA_ATTR_SKIP, DATA_ATTR_INVISIBLE,
 * DATA_ATTR_LINEBREAK) from an element and its descendants.
 * @param {Element} element The root element to clean up.
 */
export function removePreprocessingMarkers(element: Element): void {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return;

  if (element.hasAttribute(DATA_ATTR_SKIP)) {
    element.removeAttribute(DATA_ATTR_SKIP);
  }
  if (element.hasAttribute(DATA_ATTR_INVISIBLE)) {
    element.removeAttribute(DATA_ATTR_INVISIBLE);
  }
  if (element.hasAttribute(DATA_ATTR_LINEBREAK)) {
    element.removeAttribute(DATA_ATTR_LINEBREAK);
  }

  // Recursively process children
  if (element.children && element.children.length > 0) {
    Array.from(element.children).forEach(child => removePreprocessingMarkers(child as Element));
  }
}
