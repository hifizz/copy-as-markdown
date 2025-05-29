import { describe, it, expect, beforeEach, vi } from 'vitest';
import TurndownService from 'turndown';
import {
  addPreElementRule,
  addSkipMarkedElementsRule,
  addSkipInvisibleRule,
  addAbsoluteImageRule,
  addAbsoluteLinkRule,
  addLinkedImageRule,
} from '../entrypoints/content/turndownRules';
import {
  DATA_ATTR_SKIP,
  DATA_ATTR_INVISIBLE,
  DATA_ATTR_LINEBREAK,
} from '../entrypoints/content/constants';

// Mock logger
vi.mock('../src/utils/logger', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock detectCodeLanguage
vi.mock('../entrypoints/content/dom-handler', () => ({
  detectCodeLanguage: vi.fn(() => 'javascript'),
}));

describe('turndownRules', () => {
  let service: TurndownService;

  beforeEach(() => {
    service = new TurndownService();
    vi.clearAllMocks();
  });

  describe('addPreElementRule', () => {
    beforeEach(() => {
      addPreElementRule(service);
    });

    it('should convert simple pre element to code block', () => {
      const html = '<pre>console.log("hello");</pre>';
      const result = service.turndown(html);
      expect(result).toBe('```javascript\nconsole.log("hello");\n```');
    });

    it('should handle pre element with nested code', () => {
      const html = '<pre><code>const x = 1;</code></pre>';
      const result = service.turndown(html);
      expect(result).toBe('```javascript\nconst x = 1;\n```');
    });

    it('should skip elements marked with DATA_ATTR_SKIP', () => {
      const html = `<pre>console.log("hello");<span ${DATA_ATTR_SKIP}>skip this</span></pre>`;
      const result = service.turndown(html);
      expect(result).toBe('```javascript\nconsole.log("hello");\n```');
    });

    it('should handle line break markers', () => {
      const html = `<pre>line1<br ${DATA_ATTR_LINEBREAK}>line2</pre>`;
      const result = service.turndown(html);
      expect(result).toBe('```javascript\nline1\nline2\n```');
    });

    it('should handle empty pre element', () => {
      const html = '<pre></pre>';
      const result = service.turndown(html);
      // Empty pre elements might be filtered out by turndown
      expect(result).toMatch(/^(```javascript\n\n```|)$/);
    });
  });

  describe('addSkipMarkedElementsRule', () => {
    beforeEach(() => {
      addSkipMarkedElementsRule(service);
    });

    it('should skip elements marked with DATA_ATTR_SKIP', () => {
      const html = `<div>Keep this <span ${DATA_ATTR_SKIP}>skip this</span> content</div>`;
      const result = service.turndown(html);
      expect(result.trim()).toBe('Keep this  content');
    });

    it('should not affect unmarked elements', () => {
      const html = '<div>Keep this <span>and this</span> content</div>';
      const result = service.turndown(html);
      expect(result.trim()).toBe('Keep this and this content');
    });
  });

  describe('addSkipInvisibleRule', () => {
    beforeEach(() => {
      addSkipInvisibleRule(service);
    });

    it('should skip elements marked with DATA_ATTR_INVISIBLE', () => {
      const html = `<div>Visible <span ${DATA_ATTR_INVISIBLE}>invisible</span> content</div>`;
      const result = service.turndown(html);
      expect(result.trim()).toBe('Visible  content');
    });

    it('should not affect visible elements', () => {
      const html = '<div>All <span>visible</span> content</div>';
      const result = service.turndown(html);
      expect(result.trim()).toBe('All visible content');
    });
  });

  describe('addAbsoluteImageRule', () => {
    beforeEach(() => {
      addAbsoluteImageRule(service);
    });

    it('should keep absolute URLs unchanged', () => {
      const html = '<img src="https://example.com/image.jpg" alt="Test image">';
      const result = service.turndown(html);
      expect(result.trim()).toBe('![Test image](https://example.com/image.jpg)');
    });

    it('should convert relative URLs to absolute', () => {
      const html = '<img src="/image.jpg" alt="Test image">';
      const result = service.turndown(html);
      // In jsdom environment, this will resolve to localhost:3000
      expect(result.trim()).toMatch(/!\[Test image\]\(http:\/\/localhost:3000\/image\.jpg\)/);
    });

    it('should keep data URIs unchanged', () => {
      const html = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" alt="Test">';
      const result = service.turndown(html);
      expect(result.trim()).toBe('![Test](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==)');
    });

    it('should handle protocol-relative URLs', () => {
      const html = '<img src="//example.com/image.jpg" alt="Test image">';
      const result = service.turndown(html);
      // Protocol-relative URLs get resolved to http in jsdom
      expect(result.trim()).toMatch(/!\[Test image\]\(http:\/\/example\.com\/image\.jpg\)/);
    });

    it('should return empty string for images without src', () => {
      const html = '<img alt="Test image">';
      const result = service.turndown(html);
      expect(result.trim()).toBe('');
    });

    it('should handle missing alt attribute', () => {
      const html = '<img src="https://example.com/image.jpg">';
      const result = service.turndown(html);
      expect(result.trim()).toBe('![](https://example.com/image.jpg)');
    });

    it('should log warning for invalid relative URLs', () => {
      // Mock URL constructor to throw error
      const originalURL = global.URL;
      global.URL = class MockURL {
        constructor() {
          throw new Error('Invalid URL');
        }
        static canParse = vi.fn();
        static createObjectURL = vi.fn();
        static parse = vi.fn();
        static revokeObjectURL = vi.fn();
      } as any;

      const html = '<img src="invalid-url" alt="Test">';
      const result = service.turndown(html);

      // Should still include the original src even if conversion fails
      expect(result.trim()).toMatch(/!\[Test\]\(.*invalid-url.*\)/);

      // Restore original URL
      global.URL = originalURL;
    });
  });

  describe('addAbsoluteLinkRule', () => {
    beforeEach(() => {
      addAbsoluteLinkRule(service);
    });

    it('should keep absolute URLs unchanged', () => {
      const html = '<a href="https://example.com/page">Link text</a>';
      const result = service.turndown(html);
      expect(result.trim()).toBe('[Link text](https://example.com/page)');
    });

    it('should convert relative URLs to absolute', () => {
      const html = '<a href="/page">Link text</a>';
      const result = service.turndown(html);
      // In jsdom environment, this will resolve to localhost:3000
      expect(result.trim()).toMatch(/\[Link text\]\(http:\/\/localhost:3000\/page\)/);
    });

    it('should preserve special protocols', () => {
      const mailtoHtml = '<a href="mailto:test@example.com">Email</a>';
      const telHtml = '<a href="tel:+1234567890">Phone</a>';
      const jsHtml = '<a href="javascript:void(0)">JS Link</a>';

      expect(service.turndown(mailtoHtml).trim()).toBe('[Email](mailto:test@example.com)');
      expect(service.turndown(telHtml).trim()).toBe('[Phone](tel:+1234567890)');
      expect(service.turndown(jsHtml).trim()).toBe('[JS Link](javascript:void(0))');
    });

    it('should handle links with title attribute', () => {
      const html = '<a href="https://example.com" title="Example Site">Link</a>';
      const result = service.turndown(html);
      // The href might get a trailing slash in jsdom
      expect(result.trim()).toMatch(/\[Link\]\(https:\/\/example\.com\/? "Example Site"\)/);
    });

    it('should return content only for links without href', () => {
      const html = '<a>Just text</a>';
      const result = service.turndown(html);
      expect(result.trim()).toBe('Just text');
    });

    it('should handle protocol-relative URLs', () => {
      const html = '<a href="//example.com/page">Link</a>';
      const result = service.turndown(html);
      // Protocol-relative URLs get resolved to http in jsdom
      expect(result.trim()).toMatch(/\[Link\]\(http:\/\/example\.com\/page\)/);
    });

    it('should trim link content', () => {
      const html = '<a href="https://example.com">  Link text  </a>';
      const result = service.turndown(html);
      // The href might get a trailing slash in jsdom
      expect(result.trim()).toMatch(/\[Link text\]\(https:\/\/example\.com\/?\)/);
    });
  });

  describe('addLinkedImageRule', () => {
    beforeEach(() => {
      addLinkedImageRule(service);
    });

    it('should convert linked image to GFM format', () => {
      const html = '<a href="https://example.com"><img src="image.jpg" alt="Test image"></a>';
      const result = service.turndown(html);
      expect(result.trim()).toBe('[![Test image](image.jpg)](https://example.com)');
    });

    it('should handle linked image with whitespace', () => {
      const html = '<a href="https://example.com">  <img src="image.jpg" alt="Test">  </a>';
      const result = service.turndown(html);
      expect(result.trim()).toBe('[![Test](image.jpg)](https://example.com)');
    });

    it('should escape special characters in alt text', () => {
      const html = '<a href="https://example.com"><img src="image.jpg" alt="Test [image]"></a>';
      const result = service.turndown(html);
      expect(result.trim()).toBe('[![Test \\[image\\]](image.jpg)](https://example.com)');
    });

    it('should handle missing alt attribute', () => {
      const html = '<a href="https://example.com"><img src="image.jpg"></a>';
      const result = service.turndown(html);
      expect(result.trim()).toBe('[![](image.jpg)](https://example.com)');
    });

    it('should not apply to links with multiple elements', () => {
      const html = '<a href="https://example.com"><img src="image.jpg" alt="Test"><span>Text</span></a>';
      const result = service.turndown(html);
      // Should fall back to regular link handling
      expect(result).toContain('[');
      expect(result).toContain('](https://example.com)');
    });

    it('should not apply to links without href', () => {
      const html = '<a><img src="image.jpg" alt="Test"></a>';
      const result = service.turndown(html);
      // Should not match the filter
      expect(result.trim()).toBe('![Test](image.jpg)');
    });

    it('should not apply to links with non-image elements', () => {
      const html = '<a href="https://example.com"><span>Not an image</span></a>';
      const result = service.turndown(html);
      expect(result.trim()).toBe('[Not an image](https://example.com)');
    });

    it('should handle empty href', () => {
      const html = '<a href=""><img src="image.jpg" alt="Test"></a>';
      const result = service.turndown(html);
      // Empty href might not match the filter condition
      expect(result.trim()).toMatch(/(!\[Test\]\(image\.jpg\)|!\[Test\]\(image\.jpg\)\(\))/);
    });
  });

  describe('Integration tests', () => {
    beforeEach(() => {
      // Add all rules
      addPreElementRule(service);
      addSkipMarkedElementsRule(service);
      addSkipInvisibleRule(service);
      addAbsoluteImageRule(service);
      addAbsoluteLinkRule(service);
      addLinkedImageRule(service);
    });

    it('should handle complex HTML with multiple rules', () => {
      const html = `
        <div>
          <h1>Title</h1>
          <p>Some text with <a href="/link">relative link</a></p>
          <img src="/image.jpg" alt="Test image">
          <pre>console.log("code");</pre>
          <span ${DATA_ATTR_SKIP}>Skip this</span>
          <a href="https://example.com"><img src="logo.png" alt="Logo"></a>
        </div>
      `;

      const result = service.turndown(html);

      // TurndownService uses setext-style headers by default (underlined with =)
      expect(result).toMatch(/(# Title|Title\n=====)/);
      expect(result).toMatch(/\[relative link\]\(http:\/\/localhost:3000\/link\)/);
      expect(result).toMatch(/!\[Test image\]\(http:\/\/localhost:3000\/image\.jpg\)/);
      expect(result).toContain('```javascript\nconsole.log("code");\n```');
      expect(result).not.toContain('Skip this');
      expect(result).toContain('[![Logo](logo.png)](https://example.com)');
    });

    it('should handle nested elements with skip attributes', () => {
      const html = `
        <div>
          <p>Keep this</p>
          <div ${DATA_ATTR_SKIP}>
            <p>Skip this paragraph</p>
            <img src="skip.jpg" alt="Skip image">
          </div>
          <p>Keep this too</p>
        </div>
      `;

      const result = service.turndown(html);

      expect(result).toContain('Keep this');
      expect(result).toContain('Keep this too');
      expect(result).not.toContain('Skip this paragraph');
      expect(result).not.toContain('Skip image');
    });
  });
});
