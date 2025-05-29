import { vi } from 'vitest';

// Mock browser APIs
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://example.com/test',
    origin: 'https://example.com',
  },
  writable: true,
  configurable: true,
});

// Mock document.location for URL resolution
try {
  Object.defineProperty(document, 'location', {
    value: {
      href: 'https://example.com/test',
      origin: 'https://example.com',
    },
    writable: true,
    configurable: true,
  });
} catch (e) {
  // If document.location already exists and can't be redefined, just assign
  (document as any).location = {
    href: 'https://example.com/test',
    origin: 'https://example.com',
  };
}

// Mock fetch for remote logging tests
global.fetch = vi.fn();

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Test Environment)',
  },
  writable: true,
  configurable: true,
});

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};
