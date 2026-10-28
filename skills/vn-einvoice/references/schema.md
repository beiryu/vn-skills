# Invoice schema (`@vn-skills/core` → `Invoice`)

```ts
interface Invoice {
  series: string; // "1C25TAA" (mẫu số + ký hiệu, TT78/2021)
  number?: string; // assigned on issue (8 digits)
  issueDate: string; // "yyyy-mm-dd"
  currency?: 'VND';
  seller: Party; // name, taxId (required, validated), address (required)
  buyer: Party; // name; taxId or idNumber optional for retail
  lines: InvoiceLine[]; // ≥ 1
  paymentMethod?: string; // "TM/CK", "Chuyển khoản", ...
  note?: string;
  extra?: Record<string, unknown>; // provider-specific pass-through
}
interface Party {
  name: string;
  taxId?: string;
  address: string;
  email?: string;
  phone?: string;
  bankAccount?: string;
  bankName?: string;
  idNumber?: string;
}
interface InvoiceLine {
  no?: number;
  name: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  vatRate: 0 | 5 | 8 | 10 | 'KCT' | 'KKKNT';
  isNote?: boolean;
}
```

## Mandatory contents (Decree 123/2020/NĐ-CP art. 10)

Invoice name/series/number · issue date · seller name, address, tax ID · buyer name, address, tax ID (if any) ·
goods/services: name, unit, quantity, unit price, amount, VAT rate, VAT amount, total · amount in words · digital signature ·
tax-authority code (for coded invoices). This library covers the data items; signing and the authority code are the provider's job.

## Totals (`computeTotals`)

```
line.amount    = round(quantity × unitPrice) − round(discount)
line.vatAmount = round(line.amount × rate / 100)      // KCT, KKKNT → 0
subtotal       = Σ line.amount
vatTotal       = Σ line.vatAmount
grandTotal     = subtotal + vatTotal
totalInWords   = moneyToWords(grandTotal, { capitalize: true })
byRate[]       = { rate, taxable, vat } per distinct rate
```

## VAT-inclusive prices (`splitVatInclusive`, `applyVat`)

```
net = round(gross × 100 / (100 + rate))   // convention of this library, not a legal rule
vat = gross − net                         // leftover đồng goes to VAT; net + vat = gross
applyVat: vat = round(net × rate / 100)   // same as the line formula above
```

## Series pattern (TT78/2021 art. 4)

`N C YY T XX` → `1` form number (1 = VAT invoice, 2 = sales invoice, …), `C`/`K` with/without tax-authority code,
`25` year, `T` type (T = enterprise, D = special, L = per-occurrence, M = cash register, …), `AA` free letters.
