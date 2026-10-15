/**
 * Remove Vietnamese diacritics (and any other combining marks) from a string.
 * Handles đ/Đ explicitly because they are not decomposable via NFD.
 */
export function removeDiacritics(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

/** Lowercase, strip diacritics, collapse whitespace. Keeps letters, digits, spaces. */
export function normalizeText(input: string): string {
  return removeDiacritics(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Compact key used by the address datasets: lowercase, no diacritics, no separators. */
export function compactKey(input: string): string {
  return removeDiacritics(input)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
