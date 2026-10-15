/**
 * Format milliseconds to mm:ss string
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format number with locale separators (e.g., 1,234,567)
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format a date string (YYYY-MM-DD)
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

/**
 * Strip ANSI escape codes from string
 */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Get display width of a single character (CJK characters take 2 columns)
 */
export function getCharWidth(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  // CJK Unified Ideographs
  if (code >= 0x4e00 && code <= 0x9fff) return 2;
  // CJK Symbols and Punctuation
  if (code >= 0x3000 && code <= 0x303f) return 2;
  // Fullwidth Forms
  if (code >= 0xff00 && code <= 0xffef) return 2;
  // CJK Compatibility
  if (code >= 0xf900 && code <= 0xfaff) return 2;
  // CJK Extension A
  if (code >= 0x3400 && code <= 0x4dbf) return 2;
  return 1;
}

/**
 * Get visual width of string (accounting for CJK characters)
 */
export function getStringWidth(str: string): number {
  const cleaned = stripAnsi(str);
  let width = 0;
  for (const char of cleaned) {
    width += getCharWidth(char);
  }
  return width;
}

/**
 * Truncate text to fit within visual width, adding ellipsis if needed
 */
export function truncateText(text: string, maxWidth: number): string {
  const currentWidth = getStringWidth(text);
  if (currentWidth <= maxWidth) return text;

  let width = 0;
  let result = '';
  for (const char of text) {
    const charWidth = getCharWidth(char);
    // Reserve 1 width for ellipsis character
    if (width + charWidth > maxWidth - 1) break;
    result += char;
    width += charWidth;
  }
  return result + '…';
}

/**
 * Pad text to exact visual width, truncating or padding with spaces
 * Handles CJK characters correctly
 */
export function padTextVisual(text: string, visualWidth: number, align: 'left' | 'right' = 'left'): string {
  const truncated = truncateText(text, visualWidth);
  const currentWidth = getStringWidth(truncated);
  const padding = Math.max(0, visualWidth - currentWidth);
  const spaces = ' '.repeat(padding);

  if (align === 'right') {
    return spaces + truncated;
  }
  return truncated + spaces;
}

/**
 * Calculate max visible items based on available height
 * Subtracts space for header, separator, pagination info, and mode bar
 */
export function calculateMaxVisible(availableHeight: number, extraReserved: number = 0): number {
  // Reserve: pagination info(1) + small buffer(1) + extra
  const reserved = 2 + extraReserved;
  return Math.max(3, availableHeight - reserved);
}
