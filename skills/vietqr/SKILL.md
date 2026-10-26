---
name: vietqr
description: Generate or decode VietQR bank-transfer QR codes (NAPAS 247 / EMVCo) for Vietnamese banks, with CRC16 validation and PNG/SVG output. Use when the user asks for a payment QR, "QR thanh toán", "mã QR chuyển khoản", "tạo QR VietQR", "quét mã chuyển tiền", needs to parse a VietQR string, look up a bank BIN (Vietcombank 970436, MB 970422, ...), or integrate Vietnamese bank-transfer payments.
license: MIT
compatibility: Requires Node.js 22+ (runs npx -y @vn-skills/cli). No network access needed.
metadata:
  author: vn-skills
  version: '0.1.0'
---

# VietQR

Build and parse **VietQR** payloads: the EMVCo merchant-presented QR format used by every Vietnamese bank app for
inter-bank transfers (NAPAS 247 service `QRIBFTTA`). Everything runs offline; the bank BIN list ships with the CLI.

## When to use

- "Tạo mã QR chuyển 500k vào Vietcombank số tài khoản X, nội dung Y"
- "Generate a payment QR for invoice #123"
- "What bank/account/amount is in this QR string?" (decode + CRC check)
- "Which BIN is Techcombank?"

## How to do it

All commands print JSON when piped (or with `--json`). Inside this repo use `pnpm vn-skills` instead of `npx -y @vn-skills/cli`.

1. **Build a QR** (dynamic QR with amount + note):

   ```bash
   npx -y @vn-skills/cli vietqr build --bank VCB --account 0011001234567 --amount 500000 --note "Thanh toan don 123" --out qr.png
   ```

   Output (JSON):

   ```json
   {
     "ok": true,
     "payload": "00020101021238540010A0000007270124000697043601100011001234567 ...6304XXXX",
     "bank": { "bin": "970436", "code": "VCB", "shortName": "Vietcombank" },
     "amount": 500000,
     "note": "Thanh toan don 123",
     "file": "qr.png",
     "warnings": []
   }
   ```

   - `--bank` accepts a BIN (`970436`), a code (`VCB`), a short name (`Vietcombank`) or a common alias (`MB`, `Vietin`).
   - Omit `--amount` for a **static** QR (payer types the amount). Add `--static` to force it.
   - `--out file.svg` writes SVG; `--ascii` prints the QR in the terminal; `--data-url` adds a base64 PNG to the JSON.
   - Show the user the payload **and** the image path. Never retype the payload by hand; copy it from the output.

2. **Decode a QR string** (after scanning the image with any QR reader):

   ```bash
   npx -y @vn-skills/cli vietqr parse "00020101021238530010A000000727012300069704230109mynamebvh0208QRIBFTTA53037045405500005802VN62080804test6304AB76"
   ```

   Check `crcValid` and `isVietQR` before trusting `bank`, `account`, `amount`, `note`.

   **From an image** (PNG only): `npx -y @vn-skills/cli vietqr decode qr.png` reads the QR and prints the same fields
   plus `payload`. It fails with `no QR code found` when the image has no readable QR; ask the user for a sharper,
   uncropped PNG (convert screenshots or JPEGs to PNG first).

3. **Find a bank**: `npx -y @vn-skills/cli vietqr banks techcom` (empty query lists all 58 banks with BIN/code/name).

Library use (TypeScript): `import { buildVietQR, parseVietQR, findBank } from '@vn-skills/core'`.

## Rules and gotchas

- **Amount is integer VND.** "500k" means 500000; "1,5 triệu" means 1500000. The CLI rejects decimals.
- **Note is sanitized**: diacritics removed, only `A-Z a-z 0-9` and spaces, max 25 characters. Tell the user if it was changed (see `warnings`).
- **Do not invent BINs.** If the bank is unknown, run `vietqr banks <query>` and ask the user to pick.
- The CRC (tag 63) is CRC-16/CCITT-FALSE over the payload up to and including `6304`. The tool computes it; do not edit the payload after building.
- A QR for a card number uses service `QRIBFTTC` (`--card`); account transfers use `QRIBFTTA` (default).
- The payload format follows NAPAS "QR Switching v1.5.2" / EMVCo MPQR; see [references/vietqr-spec.md](references/vietqr-spec.md) for the field layout.

## Common mistakes to avoid

- Writing the note with Vietnamese diacritics (many bank apps garble it).
- Using the SWIFT code or the bank's 3-letter code as the BIN. The BIN is 6 digits starting with 9704/5460/4225/4587/9633.
- Typing spaces inside the account number: they are removed (grouped numbers like `0011 0012 34567` are fine) and a warning shows both values; check the account.
- Passing an amount with `,` separators such as `"1,000"`. It is accepted as 1000 VND, but in Vietnamese `,` is the decimal mark, so `buildVietQR` adds a warning naming the input and the value it was read as. Pass plain digits (`1000`) to avoid ambiguity.
- Putting the amount in the note instead of tag 54.
- Trusting a scanned payload without checking `crcValid`.
- Promising payment confirmation. This skill only builds/validates QR offline; it is not a cổng thanh toán, so it cannot xác nhận (confirm) that a transfer arrived.
