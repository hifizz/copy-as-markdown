import TurndownService from 'turndown';
import { detectCodeLanguage } from './dom-handler'; // Needed for pre rule

/**
 * Adds a Turndown rule to handle <pre> elements, attempting to preserve content
 * and detect language, while respecting preprocessing markers.
 * @param {TurndownService} service The Turndown service instance.
 */
export function addPreElementRule(service: TurndownService): void {
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

          const hasLineBreakMarker = element.hasAttribute('data-cam-linebreak');
          const isBrTag = element.tagName === 'BR';

          if (element.childNodes && element.childNodes.length > 0) {
            for (let i = 0; i < element.childNodes.length; i++) {
              text += getTextFromVisibleNodes(element.childNodes[i]);
            }
          }

          if (hasLineBreakMarker) {
            if (isBrTag) {
              text += '\n';
            } else {
              if (text.length > 0 && !text.endsWith('\n')) {
                text += '\n';
              }
            }
          }
        }
        return text;
      };

      let codeContent = getTextFromVisibleNodes(node);
      const trimmedContent = `\n${codeContent.trim()}\n`;
      const language = detectCodeLanguage(node); // Uses imported function

      return `\`\`\`${language}${trimmedContent}\`\`\``;
    },
  });
}

/**
 * Adds a Turndown rule to explicitly skip elements that were marked
 * with the 'data-cam-skip' attribute during preprocessing.
 * @param {TurndownService} service The Turndown service instance.
 */
export function addSkipMarkedElementsRule(service: TurndownService): void {
  service.addRule('skipMarkedDataCamSkip', {
    filter: (node): boolean => node.nodeType === Node.ELEMENT_NODE && (node as Element).hasAttribute && (node as Element).hasAttribute('data-cam-skip'),
    replacement: (): string => '',
  });
}

/**
 * Adds a Turndown rule to explicitly skip elements that were marked
 * as invisible ('data-cam-invisible') during preprocessing.
 * @param {TurndownService} service The Turndown service instance.
 */
export function addSkipInvisibleRule(service: TurndownService): void {
  service.addRule('skipInvisible', {
    filter: (node): boolean => node.nodeType === Node.ELEMENT_NODE && (node as Element).hasAttribute && (node as Element).hasAttribute('data-cam-invisible'),
    replacement: (): string => '',
  });
}

/**
 * Adds a Turndown rule to handle <img> elements, ensuring their src
 * attribute is converted to an absolute URL in the generated Markdown.
 * @param {TurndownService} service The Turndown service instance.
 */
export function addAbsoluteImageRule(service: TurndownService): void {
  service.addRule('absoluteImages', {
    filter: 'img',
    replacement: function (content: string, nodeUntyped: unknown): string {
      const node = nodeUntyped as HTMLImageElement;
      const alt = node.alt || '';
      let src = node.src || '';

      if (!src) return '';

      const isAbsolute = src.startsWith('http:') || src.startsWith('https:') || src.startsWith('//');
      const isDataUri = src.startsWith('data:');

      if (!isAbsolute && !isDataUri) {
        try {
          const absoluteUrl = new URL(src, document.location.href).href;
          src = absoluteUrl;
        } catch (e: unknown) {
          console.warn(`CopyAsMarkdown: Could not convert relative src "${src}" to absolute:`, e instanceof Error ? e.message : e);
        }
      }
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
export function addAbsoluteLinkRule(service: TurndownService): void {
  service.addRule('absoluteLinks', {
    filter: 'a',
    replacement: function (content: string, nodeUntyped: unknown): string {
      const node = nodeUntyped as HTMLAnchorElement;
      let href = node.href || '';
      const title = node.title || '';

      if (!href) return content;

      const isSpecialProtocol = /^(mailto|tel|javascript|data):/i.test(node.protocol);
      const isAbsolute = href.startsWith('http:') || href.startsWith('https:') || href.startsWith('//');

      if (!isAbsolute && !isSpecialProtocol) {
        try {
          const absoluteUrl = new URL(href, document.location.href).href;
          href = absoluteUrl;
        } catch (e: unknown) {
          console.warn(`CopyAsMarkdown: Could not convert relative href "${href}" to absolute:`, e instanceof Error ? e.message : e);
        }
      }

      const titlePart = title ? ` "${title}"` : '';
      return `[${content}](${href}${titlePart})`;
    },
  });
}

/**
 * Adds a custom Turndown rule to handle <a> elements that only contain an <img>.
 * Converts them to the GFM format: [![alt](src)](href)
 * @param {TurndownService} service The Turndown service instance.
 */
export function addLinkedImageRule(service: TurndownService): void {
  service.addRule('linkedImage', {
    filter: (node, options) => {
      if (node.nodeName !== 'A' || !node.getAttribute('href')) {
        return false;
      }
      // Check children: exactly one element child, which is an IMG,
      // and all other children are whitespace text nodes.
      const children = Array.from(node.childNodes);
      const elementChildren = children.filter(child => child.nodeType === Node.ELEMENT_NODE);
      if (elementChildren.length !== 1 || elementChildren[0].nodeName !== 'IMG') {
        return false;
      }
      const nonElementChildren = children.filter(child => child.nodeType !== Node.ELEMENT_NODE);
      return nonElementChildren.every(child => !child.textContent?.trim());
    },
    replacement: (content, node, options) => {
      const anchor = node as HTMLAnchorElement;
      const img = anchor.querySelector('img'); // Should exist due to filter

      if (!img) return ''; // Should not happen based on filter logic

      const href = anchor.getAttribute('href') || '';
      const alt = img.getAttribute('alt') || '';
      let src = img.getAttribute('src') || ''; // Raw src

      // Note: Assumes existing rules/config handle making src absolute if needed.
      // Consider if absolute URL conversion logic from addAbsoluteImageRule is needed here.

      const escapedAlt = alt.replace(/([\\\[\]])/g, '\\$1'); // Escape \, [ and ] in alt text

      // Construct the GFM linked image format
      return `[![${escapedAlt}](${src})](${href})`;
    }
  });
}
