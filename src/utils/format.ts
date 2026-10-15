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
 * Format a date string as a calendar date (YYYY-MM-DD)
 *
 * A string that is already a plain `YYYY-MM-DD` date is returned unchanged: it
 * names a calendar date, not an instant, so routing it through `Date` would
 * reinterpret it in the local timezone and shift the day for every timezone
 * west of UTC.
 *
 * For a timestamp the local calendar date is reported. The previous
 * implementation formatted the UTC instant instead, which shows the wrong day
 * for most of the world: east of UTC a local 00:30 lands on the previous UTC
 * day, and west of UTC a late-evening local time lands on the next one.
 */
export function formatDate(dateStr: string): string {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (dateOnly) return dateStr;

  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Strip ANSI escape codes from string
 */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Get display width of a single character, following UAX #11 (East Asian Width)
 * and UAX #29 well enough for the scripts this UI actually renders.
 *
 * Rules, in order:
 *   0 — control characters and zero-width marks (combining marks, variation
 *       selectors, ZWJ/ZWNJ, BOM)
 *   2 — East Asian Wide/Fullwidth: CJK ideographs and punctuation, fullwidth
 *       forms, Hangul syllables and Jamo, and pictographic emoji
 *   1 — everything else
 *
 * Known limitation: a combining mark is treated as zero width, so a decomposed
 * accent stays flush with its base character, but ZWJ emoji sequences are not
 * measured as one grapheme cluster (two joined emoji count as 4 columns even
 * where a terminal renders them as one glyph).
 */
export function getCharWidth(char: string): number {
  const code = char.codePointAt(0) ?? 0;

  // Control characters occupy no cell
  if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return 0;

  // Combining marks, variation selectors and joiners attach to another glyph
  if (code >= 0x0300 && code <= 0x036f) return 0; // combining diacritical marks
  if (code >= 0x1ab0 && code <= 0x1aff) return 0; // combining diacritical marks extended
  if (code >= 0x1dc0 && code <= 0x1dff) return 0; // combining diacritical marks supplement
  if (code >= 0x20d0 && code <= 0x20ff) return 0; // combining marks for symbols
  if (code >= 0xfe00 && code <= 0xfe0f) return 0; // variation selectors
  if (code === 0x200b || code === 0x200c || code === 0x200d) return 0; // ZWSP, ZWNJ, ZWJ
  if (code === 0x2060 || code === 0xfeff) return 0; // word joiner, BOM

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
  // Hangul Jamo (leading consonants and vowels — Jamo Extended-B is code 0xd7b0+)
  if (code >= 0x1100 && code <= 0x115f) return 2;
  if (code >= 0x1160 && code <= 0x11ff) return 2;
  // Hangul syllables — Korean text was measured half its real width before
  if (code >= 0xac00 && code <= 0xd7a3) return 2;
  // Hangul Jamo Extended-A
  if (code >= 0xa960 && code <= 0xa97f) return 2;

  // Pictographic emoji
  if (code >= 0x1f300 && code <= 0x1f5ff) return 2; // symbols and pictographs
  if (code >= 0x1f600 && code <= 0x1f64f) return 2; // emoticons
  if (code >= 0x1f680 && code <= 0x1f6ff) return 2; // transport and map
  if (code >= 0x1f900 && code <= 0x1f9ff) return 2; // supplemental symbols
  if (code >= 0x1fa70 && code <= 0x1faff) return 2; // symbols and pictographs extended-A

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
