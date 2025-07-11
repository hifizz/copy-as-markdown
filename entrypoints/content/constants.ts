// --- Context Menu IDs ---
export const CONTEXT_MENU_ID_COPY = 'copy-as-markdown-selection';
export const CONTEXT_MENU_ID_PICK = 'pick-element-copy-as-markdown';

// --- Command Names (match manifest.json) ---
export const COMMAND_COPY_SELECTION = 'copy-selection-as-markdown';
export const COMMAND_PICK_ELEMENT = 'pick-element-as-markdown';

// --- Base Shortcuts (without modifier) ---
export const BASE_SHORTCUT_COPY_SELECTION = 'Shift+C';
export const BASE_SHORTCUT_PICK_ELEMENT = 'Shift+E';

// --- Context Menu Base Titles ---
export const TITLE_COPY_SELECTION = 'Copy as Markdown';
export const TITLE_PICK_ELEMENT = 'Pick Element to Copy as Markdown';

// --- Preprocessing Data Attributes ---
const PREPROCESS_PREFIX = 'copy-as-markdown';
export const DATA_ATTR_SKIP = `data-${PREPROCESS_PREFIX}-skip`;
export const DATA_ATTR_INVISIBLE = `data-${PREPROCESS_PREFIX}-invisible`;
export const DATA_ATTR_LINEBREAK = `data-${PREPROCESS_PREFIX}-linebreak`;

