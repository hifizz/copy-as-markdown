import { LanguagePackage } from '../utils/i18n';

export const enLanguagePackage: LanguagePackage = {
  app: {
    title: 'Copy as Markdown',
    commonFeatures: 'Common Features',
    otherOptions: 'Other Options',
  },

  button: {
    copyAllTabs: 'Copy All Tabs Links ({{count}})',
    copyCurrentTab: 'Copy Current Tab Link',
    copyAllTitles: 'Copy All Tabs Titles ({{count}})',
    copyAllUrls: 'Copy All Tabs URLs ({{count}})',
    copyCurrentTitle: 'Copy Current Tab Title',
    copyCurrentUrl: 'Copy Current Tab URL',
  },

  description: {
    markdownFormat: '- [Page Title](URL) format',
    singleLineFormat: '[Page Title](URL) single line format',
    multiLineFormat: '- Page Title 1 (multi-line format)',
    urlFormat: '- https://example.com (multi-line format)',
    plainTitle: 'Plain title text',
    plainUrl: 'https://example.com',
  },

  state: {
    copying: 'Copying...',
    copied: 'Copied!',
    failed: 'Copy Failed',
    error: 'Operation Failed',
  },

  error: {
    noTitle: 'No Title',
    getTabCountFailed: 'Failed to get tab count:',
    getTabTitleFailed: 'Failed to get tab title:',
    getTabUrlFailed: 'Failed to get tab URL:',
    noActiveTab: 'No active tab found',
    cannotCopySystemPage: 'Cannot copy system page',
    noTabsFound: 'No tabs found',
    noValidTabs: 'No valid tabs to copy',
  },

  settings: {
    title: 'Theme Settings',
    resetDefaults: 'Reset to Defaults',
    loading: 'Loading...',
    selectionColor: {
      title: 'Selection Color',
      description: 'Choose color scheme for highlighted elements',
      classic: 'Classic Green',
      classicDesc: 'Traditional green selection highlight',
      elegant: 'Elegant Green',
      elegantDesc: 'Modern emerald green, softer tone',
      professional: 'Professional Blue',
      professionalDesc: 'Consistent with toolbar theme',
      warm: 'Warm Orange',
      warmDesc: 'High visibility, easy on eyes',
      modern: 'Modern Purple',
      modernDesc: 'Innovative and creative',
      neutral: 'Neutral Gray',
      neutralDesc: 'Most subtle and elegant',
    },
    toolbarTheme: {
      title: 'Toolbar Theme',
      description: 'Choose appearance theme for copy toolbar',
      light: 'Classic Light',
      lightDesc: 'Pure white background, dark gray text',
      dark: 'Classic Dark',
      darkDesc: 'Dark gray background, white text',
    },
    language: {
      title: 'Language Settings',
      description: 'Select interface display language',
      auto: 'Auto Detect',
      english: 'English',
      chinese: '中文',
    },
  },

  tooltip: {
    settingsButton: 'Theme Settings',
    closeSettings: 'Close Settings',
    resetButton: '🔄 Reset to Defaults',
  },

  // Content script related text
  content: {
    toolbar: {
      copy: 'Copy',
      copying: 'Copying...',
      copied: 'Copied!',
      error: 'Error!',
      repick: 'Repick element',
      cancel: 'Cancel selection',
    },
    toast: {
      success: 'Success!',
      error: 'Error!',
      copiedToClipboard: 'Copied to clipboard!',
      copyFailed: 'Copy failed',
    },
    selectionSchemes: {
      classic: {
        name: 'Classic Green',
        description: 'Traditional green selection highlight',
      },
      elegant: {
        name: 'Elegant Green',
        description: 'Modern emerald green, softer tone',
      },
      professional: {
        name: 'Professional Blue',
        description: 'Consistent with toolbar theme',
      },
      warm: {
        name: 'Warm Orange',
        description: 'High visibility, easy on eyes',
      },
      modern: {
        name: 'Modern Purple',
        description: 'Innovative and creative',
      },
      neutral: {
        name: 'Neutral Gray',
        description: 'Most subtle and elegant',
      },
    },
    themes: {
      light: {
        description: 'Pure white background',
      },
      dark: {
        description: 'Dark gray background',
      },
    },
  },
};
