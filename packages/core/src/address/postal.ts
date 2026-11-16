import type { Province, Ward } from './data.js';

export interface PostalAddress {
  '@type': 'PostalAddress';
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry: 'VN';
}

/**
 * Build a schema.org PostalAddress. Mapping ward -> addressLocality and province -> addressRegion is this
 * project's choice for the 2-level layout, not a rule from schema.org or Google.
 * postalCode is only set when the bundled ward has one; it is never derived from the province.
 */
export function toPostalAddress(parts: {
  street?: string;
  ward?: Ward | string;
  province: Province | string;
}): PostalAddress {
  const ward = typeof parts.ward === 'string' ? undefined : parts.ward;
  const locality = typeof parts.ward === 'string' ? parts.ward : parts.ward?.fullName;
  const region = typeof parts.province === 'string' ? parts.province : parts.province.fullName;
  return {
    '@type': 'PostalAddress',
    ...(parts.street ? { streetAddress: parts.street } : {}),
    ...(locality ? { addressLocality: locality } : {}),
    ...(region ? { addressRegion: region } : {}),
    ...(ward?.postalCode ? { postalCode: ward.postalCode } : {}),
    addressCountry: 'VN',
  };
}
