import { MockProvider } from './adapters/mock.js';
import {
  MisaMeInvoiceProvider,
  ViettelSInvoiceProvider,
  VnptInvoiceProvider,
} from './adapters/skeleton.js';
import type { EInvoiceProvider } from './provider.js';

export * from './schema.js';
export * from './totals.js';
export * from './vat.js';
export * from './provider.js';
export { exampleInvoice } from './example.js';
export { MockProvider } from './adapters/mock.js';
export {
  SkeletonProvider,
  MisaMeInvoiceProvider,
  ViettelSInvoiceProvider,
  VnptInvoiceProvider,
} from './adapters/skeleton.js';

export type ProviderName = 'mock' | 'misa' | 'viettel' | 'vnpt';
export const PROVIDER_NAMES: readonly ProviderName[] = ['mock', 'misa', 'viettel', 'vnpt'];

/** Factory. Real providers require sandbox credentials in env and currently throw NotImplementedError on use. */
export function createProvider(
  name: ProviderName,
  env: Record<string, string | undefined> = process.env,
): EInvoiceProvider {
  switch (name) {
    case 'mock':
      return new MockProvider();
    case 'misa':
      return new MisaMeInvoiceProvider(env);
    case 'viettel':
      return new ViettelSInvoiceProvider(env);
    case 'vnpt':
      return new VnptInvoiceProvider(env);
    default:
      throw new Error(`Unknown provider "${String(name)}". Known: ${PROVIDER_NAMES.join(', ')}`);
  }
}
