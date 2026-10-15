# Provider adapters (skeleton status)

All adapters implement `EInvoiceProvider` (`createInvoice`, `getInvoice`, `cancelInvoice`, optional `listInvoices`).
In this version only `MockProvider` works. The three real adapters validate configuration and throw `NotImplementedError`;
they exist so that integrations can be wired against a stable interface. Contributions must keep the sandbox-only rule.

| Provider          | Class                     | Env vars (sandbox only)                                                                                                                       |
| ----------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| MISA meInvoice    | `MisaMeInvoiceProvider`   | `VN_EINVOICE_MISA_BASE_URL`, `VN_EINVOICE_MISA_APP_ID`, `VN_EINVOICE_MISA_TAX_CODE`, `VN_EINVOICE_MISA_USERNAME`, `VN_EINVOICE_MISA_PASSWORD` |
| Viettel S-Invoice | `ViettelSInvoiceProvider` | `VN_EINVOICE_VIETTEL_BASE_URL`, `VN_EINVOICE_VIETTEL_USERNAME`, `VN_EINVOICE_VIETTEL_PASSWORD`, `VN_EINVOICE_VIETTEL_SUPPLIER_TAX_CODE`       |
| VNPT Invoice      | `VnptInvoiceProvider`     | `VN_EINVOICE_VNPT_BASE_URL`, `VN_EINVOICE_VNPT_ACCOUNT`, `VN_EINVOICE_VNPT_AC_PASS`, `VN_EINVOICE_VNPT_USERNAME`, `VN_EINVOICE_VNPT_PASSWORD` |

## MISA meInvoice

- Auth: `POST /api/integration/auth/token` with app id + tax code + username/password → bearer token.
- Create: `POST /api/integration/invoice/create` (batch of invoices in MISA's `InvoiceData` shape).
- Sandbox base URL is provided by MISA per customer; never hard-code production.

## Viettel S-Invoice

- Auth: `POST /auth/login` → `access_token`.
- Create: `POST /InvoiceAPI/InvoiceWS/createInvoice/{supplierTaxCode}` with `generalInvoiceInfo`, `buyerInfo`, `sellerInfo`, `itemInfo[]`, `taxBreakdowns[]`.

## VNPT Invoice (SOAP)

- `ImportAndPublishInv` on `PublishService.asmx` with account/ACpass/username/pass and an XML `Invoices` body.

The field names above are from public developer documentation and are provided for orientation only; verify against
the contract/doc version you receive from the provider.
