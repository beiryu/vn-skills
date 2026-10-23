import { describe, expect, it } from 'vitest';
import { initials, slugifyName, sortNames, splitName } from '@vn-skills/core';
import { loadGolden, title } from './golden.js';

function split(input: string) {
  const r = splitName(input);
  if (!r.ok) throw new Error(r.error.message);
  return r;
}

describe('splitName', () => {
  it.each([
    ['Nguyễn Văn An', 'Nguyễn', 'Văn', 'An'],
    ['Trần Thị Bích Ngọc', 'Trần', 'Thị Bích', 'Ngọc'],
    ['Lê Hoàng', 'Lê', '', 'Hoàng'],
    ['  Phạm   Minh   Tuấn  ', 'Phạm', 'Minh', 'Tuấn'],
    ['nguyễn văn an', 'nguyễn', 'văn', 'an'],
  ])('%s', (input, family, middle, given) => {
    const r = split(input);
    expect(r.family).toBe(family);
    expect(r.middle).toBe(middle);
    expect(r.given).toBe(given);
  });

  it('handles compound surname Tôn Thất', () => {
    const r = split('Tôn Thất Tùng');
    expect(r.family).toBe('Tôn Thất');
    expect(r.middle).toBe('');
    expect(r.given).toBe('Tùng');
  });

  it('handles compound surname Tôn Thất with a middle name', () => {
    const r = split('Tôn Thất Minh Khoa');
    expect(r.family).toBe('Tôn Thất');
    expect(r.middle).toBe('Minh');
    expect(r.given).toBe('Khoa');
  });

  it('handles compound surname Nguyễn Phúc', () => {
    const r = split('Nguyễn Phúc Bảo Long');
    expect(r.family).toBe('Nguyễn Phúc');
    expect(r.middle).toBe('Bảo');
    expect(r.given).toBe('Long');
  });

  it('handles single-word names as given name only', () => {
    const r = split('Madonna');
    expect(r.given).toBe('Madonna');
    expect(r.family).toBe('');
    expect(r.middle).toBe('');
  });

  it('rejects empty input', () => {
    expect(splitName('').ok).toBe(false);
    expect(splitName('   ').ok).toBe(false);
  });
});

describe('slugifyName', () => {
  it.each([
    ['Nguyễn Văn An', 'nguyen-van-an'],
    ['Đặng Thị Ánh', 'dang-thi-anh'],
    ['  Lê   Hoàng ', 'le-hoang'],
    ['Tôn Thất Tùng', 'ton-that-tung'],
    ['Madonna', 'madonna'],
  ])('%s', (input, expected) => {
    expect(slugifyName(input)).toBe(expected);
  });
});

describe('initials', () => {
  it.each([
    ['Nguyễn Văn An', 'NVA'],
    ['Đặng Thị Ánh', 'ĐTA'],
    ['Lê Hoàng', 'LH'],
    ['Madonna', 'M'],
  ])('%s', (input, expected) => {
    expect(initials(input)).toBe(expected);
  });

  it('can strip diacritics', () => {
    expect(initials('Đặng Thị Ánh', { ascii: true })).toBe('DTA');
  });
});

describe('sortNames', () => {
  it('sorts by given name first', () => {
    expect(sortNames(['Nguyễn Văn Cường', 'Trần Thị An', 'Lê Văn Bình'])).toEqual([
      'Trần Thị An',
      'Lê Văn Bình',
      'Nguyễn Văn Cường',
    ]);
  });

  it('breaks ties on middle name then family name', () => {
    expect(sortNames(['Trần Văn An', 'Lê Thị An', 'Nguyễn Văn An'])).toEqual([
      'Lê Thị An',
      'Nguyễn Văn An',
      'Trần Văn An',
    ]);
  });

  it('uses Vietnamese collation: a < ă < â < b', () => {
    expect(sortNames(['Lê Bình', 'Lê Ân', 'Lê Ăn', 'Lê An'])).toEqual([
      'Lê An',
      'Lê Ăn',
      'Lê Ân',
      'Lê Bình',
    ]);
  });

  it('sorts d before đ before e', () => {
    expect(sortNames(['Lê Em', 'Lê Đạt', 'Lê Dũng'])).toEqual(['Lê Dũng', 'Lê Đạt', 'Lê Em']);
  });

  it('does not mutate the input', () => {
    const input = ['B', 'A'];
    sortNames(input);
    expect(input).toEqual(['B', 'A']);
  });

  it('handles single-word names and empty list', () => {
    expect(sortNames(['Bình', 'An'])).toEqual(['An', 'Bình']);
    expect(sortNames([])).toEqual([]);
  });
});

const golden = loadGolden<{
  split: { input: string; expected: { family: string; middle: string; given: string } }[];
  splitError: { name: string; input: unknown; expected: string }[];
  slug: { input: string; expected: string }[];
  initials: { input: string; expected: string }[];
}>('vn-name');

describe('vn-name (golden)', () => {
  it.each(golden.split.map((c) => [title(c), c] as const))('split %s', (_, c) => {
    expect(split(c.input)).toMatchObject(c.expected);
  });
  it.each(golden.splitError.map((c) => [title(c), c] as const))('split error: %s', (_, c) => {
    const r = splitName(c.input as string);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe(c.expected);
  });
  it.each(golden.slug.map((c) => [title(c), c] as const))('slug %s', (_, c) => {
    expect(slugifyName(c.input)).toBe(c.expected);
  });
  it.each(golden.initials.map((c) => [title(c), c] as const))('initials %s', (_, c) => {
    expect(initials(c.input)).toBe(c.expected);
  });
});

describe('non-string input does not throw', () => {
  const bad: [string, unknown][] = [
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
    ['an object', { name: 'An' }],
  ];

  it.each(bad)('splitName returns ok:false for %s', (_, v) => {
    const r = splitName(v as string);
    expect(r.ok).toBe(false);
  });

  it('splitName returns EMPTY_NAME for null, undefined and whitespace', () => {
    for (const v of [null, undefined, '   ']) {
      const r = splitName(v as unknown as string);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('EMPTY_NAME');
    }
  });

  it.each(bad)('slugifyName returns empty string for %s', (_, v) => {
    expect(slugifyName(v as string)).toBe('');
  });

  it.each(bad)('initials returns empty string for %s', (_, v) => {
    expect(initials(v as string)).toBe('');
  });

  it.each(bad)('sortNames drops %s entries', (_, v) => {
    const input = ['Trần Thị Bích Ngọc', v, 'Nguyễn Văn An'] as string[];
    let out: string[] = [];
    expect(() => {
      out = sortNames(input);
    }).not.toThrow();
    expect(out).toHaveLength(2);
    expect(out).toContain('Nguyễn Văn An');
    expect(out).toContain('Trần Thị Bích Ngọc');
  });
});
