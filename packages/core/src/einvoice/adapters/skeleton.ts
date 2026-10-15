import type { Invoice } from '../schema.js';
import {
  ConfigError,
  NotImplementedError,
  type EInvoiceProvider,
  type IssuedInvoice,
  type ProviderCapabilities,
} from '../provider.js';

export interface SkeletonConfig {
  /** Environment variable names this adapter reads. Values are never logged. */
  envKeys: readonly string[];
  /** Sandbox base URL env key; production endpoints are intentionally not shipped. */
  docsUrl: string;
}

/**
 * Base class for real provider adapters (MISA meInvoice, Viettel S-Invoice, VNPT Invoice).
 * It only validates that configuration is present; every API method throws NotImplementedError.
 * Credentials are read from environment variables and must point to a sandbox account.
 */
export abstract class SkeletonProvider implements EInvoiceProvider {
  abstract readonly name: string;
  readonly capabilities: ProviderCapabilities = {
    create: false,
    get: false,
    cancel: false,
    list: false,
    mock: false,
  };
  protected readonly config: Record<string, string>;

  constructor(
    protected readonly meta: SkeletonConfig,
    env: Record<string, string | undefined> = process.env,
  ) {
    const missing = meta.envKeys.filter((k) => !env[k]);
    if (missing.length) {
      throw new ConfigError(
        `Missing environment variables: ${missing.join(', ')}. See ${meta.docsUrl}. Use SANDBOX credentials only.`,
      );
    }
    this.config = Object.fromEntries(meta.envKeys.map((k) => [k, env[k] as string]));
  }

  async createInvoice(_invoice: Invoice): Promise<IssuedInvoice> {
    throw new NotImplementedError(this.name, 'createInvoice');
  }
  async getInvoice(_id: string): Promise<IssuedInvoice | undefined> {
    throw new NotImplementedError(this.name, 'getInvoice');
  }
  async cancelInvoice(_id: string, _reason: string): Promise<IssuedInvoice> {
    throw new NotImplementedError(this.name, 'cancelInvoice');
  }
}

export class MisaMeInvoiceProvider extends SkeletonProvider {
  readonly name = 'misa';
  constructor(env?: Record<string, string | undefined>) {
    super(
      {
        envKeys: [
          'VN_EINVOICE_MISA_BASE_URL',
          'VN_EINVOICE_MISA_APP_ID',
          'VN_EINVOICE_MISA_TAX_CODE',
          'VN_EINVOICE_MISA_USERNAME',
          'VN_EINVOICE_MISA_PASSWORD',
        ],
        docsUrl: 'skills/vn-einvoice/references/providers.md#misa-meinvoice',
      },
      env,
    );
  }
}

export class ViettelSInvoiceProvider extends SkeletonProvider {
  readonly name = 'viettel';
  constructor(env?: Record<string, string | undefined>) {
    super(
      {
        envKeys: [
          'VN_EINVOICE_VIETTEL_BASE_URL',
          'VN_EINVOICE_VIETTEL_USERNAME',
          'VN_EINVOICE_VIETTEL_PASSWORD',
          'VN_EINVOICE_VIETTEL_SUPPLIER_TAX_CODE',
        ],
        docsUrl: 'skills/vn-einvoice/references/providers.md#viettel-s-invoice',
      },
      env,
    );
  }
}

export class VnptInvoiceProvider extends SkeletonProvider {
  readonly name = 'vnpt';
  constructor(env?: Record<string, string | undefined>) {
    super(
      {
        envKeys: [
          'VN_EINVOICE_VNPT_BASE_URL',
          'VN_EINVOICE_VNPT_ACCOUNT',
          'VN_EINVOICE_VNPT_AC_PASS',
          'VN_EINVOICE_VNPT_USERNAME',
          'VN_EINVOICE_VNPT_PASSWORD',
        ],
        docsUrl: 'skills/vn-einvoice/references/providers.md#vnpt-invoice',
      },
      env,
    );
  }
}
