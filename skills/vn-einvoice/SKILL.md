---
name: vn-einvoice
description: Vietnamese e-invoice (hóa đơn điện tử) helper - validate invoice data against Decree 123/2020 and Circular 78/2021 (series/ký hiệu, seller/buyer tax IDs, VAT rates 0/5/8/10/KCT/KKKNT), compute line amounts, VAT per rate, totals and "số tiền bằng chữ", and issue through a MOCK provider. Provider adapters for MISA meInvoice, Viettel S-Invoice and VNPT Invoice are interface-only skeletons (sandbox credentials from env, no real API calls yet). Use when building or testing invoice integrations, "xuất hóa đơn", "tính thuế GTGT", or validating invoice JSON.
license: MIT
compatibility: Requires Node.js 18+ (runs npx -y @vn-skills/cli). Mock provider only; no network.
metadata:
  author: vn-skills
  version: '0.1.0'
---

# Vietnamese e-invoices (hóa đơn điện tử)

A provider-neutral invoice model plus validation, totals and a mock issuer. It lets you build and test the
integration layer without a provider account. **It does not sign, transmit or register invoices with the tax authority**,
and it is not tax advice. See [references/schema.md](references/schema.md) and [references/providers.md](references/providers.md).

## When to use

- Designing an invoice payload for MISA / Viettel / VNPT and wanting a sane, validated shape first.
- "Tính tổng tiền, thuế GTGT và số tiền bằng chữ cho hóa đơn này".
- Unit tests or demos that need a fake issuing service.

## How to do it

Inside this repo use `pnpm vn-skills` instead of `npx -y @vn-skills/cli`.

1. Start from the example and edit it:

   ```bash
   npx -y @vn-skills/cli einvoice example > invoice.json
   ```

2. Validate (exit code 1 and `errors[]` when invalid; `warnings[]` are non-blocking):

   ```bash
   npx -y @vn-skills/cli einvoice validate invoice.json
   ```

3. Totals, VAT per rate, amount in words:

   ```bash
   npx -y @vn-skills/cli einvoice totals invoice.json
   ```

   ```json
   { "ok": true, "subtotal": 7000000, "vatTotal": 660000, "grandTotal": 7660000,
     "byRate": [ { "rate": 10, "taxable": 5000000, "vat": 500000 }, { "rate": 8, "taxable": 2000000, "vat": 160000 } ],
     "totalInWords": "Bảy triệu sáu trăm sáu mươi nghìn đồng", "lines": [ ... ] }
   ```

4. Issue through the mock provider (in-memory; number is sequential per series):

   ```bash
   npx -y @vn-skills/cli einvoice create invoice.json --provider mock
   ```

   `--provider misa|viettel|vnpt` only checks that the sandbox env vars exist and then reports `NotImplementedError`.
   Tell the user plainly that real provider calls are not implemented in this version.

Library: `validateInvoice`, `computeTotals`, `MockProvider`, `createProvider`, `EInvoiceProvider` from `@vn-skills/core`.

## Rules and gotchas

- Amounts are integer VND; VAT is rounded per line (half away from zero). `KCT` (không chịu thuế) and `KKKNT` (không kê khai) lines carry 0 VAT but are reported separately.
- The seller **must** have a valid tax ID (checked with the `vn-tax-id` rules). Retail buyers may omit it (warning only).
- `series` follows TT78: `1C25TAA` = form 1 (VAT), type C (with tax-authority code), year 25, TAA (enterprise-chosen). Mismatch is a warning, not an error.
- Never put real credentials in files or chat. Adapters read `VN_EINVOICE_<PROVIDER>_*` env vars and must point to **sandbox** endpoints.
- Do not scrape `hoadondientu.gdt.gov.vn` or provider portals.

## Common mistakes to avoid

- Computing VAT on the invoice total instead of per line/rate (rounding differs; providers reject mismatches).
- Mixing 8 % and 10 % goods without a per-rate breakdown (required on the invoice).
- Treating the mock `taxAuthorityCode` as a real code.
