import { describe, it, expect } from 'vitest';
import {
  calculateMaxVisible,
  formatDate,
  formatDuration,
  formatNumber,
  getCharWidth,
  getStringWidth,
  padTextVisual,
  stripAnsi,
  truncateText,
} from './format.js';

describe('formatDuration', () => {
  it('formats milliseconds as mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(1000)).toBe('00:01');
    expect(formatDuration(59_999)).toBe('00:59');
    expect(formatDuration(60_000)).toBe('01:00');
    expect(formatDuration(3_599_000)).toBe('59:59');
  });

  it('does not carry seconds over and keeps minutes growing past an hour', () => {
    expect(formatDuration(60_999)).toBe('01:00');
    expect(formatDuration(3_600_000)).toBe('60:00');
  });
});

describe('formatNumber', () => {
  it('groups thousands with separators', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1_234_567)).toBe('1,234,567');
  });

  it('is locale-independent for the separators we rely on', () => {
    expect(formatNumber(1_234_567)).toBe((1_234_567).toLocaleString('en-US'));
  });
});

describe('formatDate', () => {
  it('formats a UTC instant as YYYY-MM-DD', () => {
    expect(formatDate('2026-10-15T12:00:00Z')).toBe('2026-10-15');
    expect(formatDate('2026-01-02')).toBe('2026-01-02');
  });

  it('converts to UTC before formatting, so an offset can shift the day', () => {
    // Known limitation, pinned here on purpose: a timestamp that is still the
    // previous day in UTC reports that day, whatever the local timezone is.
    expect(formatDate('2026-10-15T00:30:00+08:00')).toBe('2026-10-14');
  });
});

describe('stripAnsi', () => {
  it('removes SGR colour codes', () => {
    expect(stripAnsi('\u001b[31mred\u001b[0m')).toBe('red');
    expect(stripAnsi('\u001b[1;32mbold green\u001b[39m')).toBe('bold green');
  });

  it('leaves plain text untouched', () => {
    expect(stripAnsi('plain')).toBe('plain');
    expect(stripAnsi('')).toBe('');
  });
});

describe('getCharWidth', () => {
  it('counts ASCII as one column', () => {
    expect(getCharWidth('a')).toBe(1);
    expect(getCharWidth(' ')).toBe(1);
    expect(getCharWidth('~')).toBe(1);
  });

  it('counts CJK, fullwidth and CJK punctuation as two columns', () => {
    expect(getCharWidth('你')).toBe(2);
    expect(getCharWidth('Ａ')).toBe(2); // fullwidth forms
    expect(getCharWidth('　')).toBe(2); // ideographic space
    expect(getCharWidth('、')).toBe(2); // CJK punctuation
  });

  it('falls back to one column for scripts it does not model', () => {
    // Known limitation, pinned on purpose: Hangul syllables and emoji are
    // wrong (1 instead of 2), so mixed lines can still drift by one column.
    expect(getCharWidth('한')).toBe(1);
    expect(getCharWidth('🎵')).toBe(1);
    expect(getCharWidth('é')).toBe(1);
  });
});

describe('getStringWidth', () => {
  it('sums the display width of every character', () => {
    expect(getStringWidth('')).toBe(0);
    expect(getStringWidth('abc')).toBe(3);
    expect(getStringWidth('你好')).toBe(4);
    expect(getStringWidth('你好abc')).toBe(7);
    expect(getStringWidth('＞＜')).toBe(4); // fullwidth punctuation forms
  });

  it('ignores ANSI escape codes', () => {
    expect(getStringWidth('\u001b[31m你好\u001b[0m')).toBe(4);
  });

  it('counts a combining mark as an extra column', () => {
    // Known limitation, pinned on purpose: combining marks should take no
    // width, so decomposed accents over-report.
    expect(getStringWidth('a\u0301')).toBe(2);
  });
});

describe('truncateText', () => {
  it('returns short text unchanged', () => {
    expect(truncateText('abc', 5)).toBe('abc');
    expect(truncateText('abc', 3)).toBe('abc');
    expect(truncateText('你好', 4)).toBe('你好');
    expect(truncateText('', 0)).toBe('');
  });

  it('fits exactly within the requested width, ellipsis included', () => {
    expect(truncateText('abcdef', 4)).toBe('abc…');
    expect(truncateText('abcdef', 2)).toBe('a…');
    expect(truncateText('ab', 1)).toBe('…');
  });

  it('counts CJK by display width, not by character count', () => {
    expect(truncateText('你好世界', 5)).toBe('你好…');
    expect(truncateText('你好世界', 4)).toBe('你…');
    expect(truncateText('你好世界', 3)).toBe('你…');
  });

  it('never exceeds the requested width once it has to cut (width >= 2)', () => {
    const samples = ['a', 'abcdef', '你好世界', '你好abc世界', 'abc你好'];

    for (const sample of samples) {
      for (let width = 2; width <= 12; width++) {
        expect(getStringWidth(truncateText(sample, width))).toBeLessThanOrEqual(width);
      }
    }
  });

  it('is the identity for text that already fits', () => {
    expect(truncateText('hello world', 20)).toBe('hello world');
    expect(truncateText('你好世界你好世界', 16)).toBe('你好世界你好世界');
  });
});

describe('padTextVisual', () => {
  it('pads with spaces on the requested side to an exact display width', () => {
    expect(padTextVisual('ab', 5)).toBe('ab   ');
    expect(padTextVisual('ab', 5, 'left')).toBe('ab   ');
    expect(padTextVisual('ab', 5, 'right')).toBe('   ab');
    expect(padTextVisual('你好', 5, 'right')).toBe(' 你好');
    expect(padTextVisual('', 3, 'right')).toBe('   ');
  });

  it('truncates instead when the text is too wide', () => {
    expect(padTextVisual('abcdef', 3)).toBe('ab…');
    expect(padTextVisual('你好世界', 3)).toBe('你…');
  });

  it('always produces exactly the requested display width', () => {
    const samples = ['', 'a', 'abcdef', '你好世界', '你好abc'];

    for (const sample of samples) {
      for (let width = 1; width <= 10; width++) {
        expect(getStringWidth(padTextVisual(sample, width))).toBe(width);
        expect(getStringWidth(padTextVisual(sample, width, 'right'))).toBe(width);
      }
    }
  });
});

describe('calculateMaxVisible', () => {
  it('reserves two rows of chrome by default', () => {
    expect(calculateMaxVisible(16)).toBe(14);
    expect(calculateMaxVisible(10)).toBe(8);
  });

  it('adds the caller-provided reservation', () => {
    expect(calculateMaxVisible(16, 2)).toBe(12);
    expect(calculateMaxVisible(16, 4)).toBe(10);
  });

  it('never drops below three rows, however small the frame is', () => {
    expect(calculateMaxVisible(5)).toBe(3);
    expect(calculateMaxVisible(2)).toBe(3);
    expect(calculateMaxVisible(0)).toBe(3);
    expect(calculateMaxVisible(-10)).toBe(3);
  });
});
