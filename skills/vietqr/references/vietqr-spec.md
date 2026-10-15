# VietQR payload layout (NAPAS 247, EMVCo MPQR)

TLV encoding: `ID(2) + LEN(2, decimal) + VALUE`. Nested templates use the same encoding inside their value.

| Tag   | Name                                 | Value                                                               |
| ----- | ------------------------------------ | ------------------------------------------------------------------- |
| 00    | Payload Format Indicator             | `01`                                                                |
| 01    | Point of Initiation Method           | `11` static (payer enters amount), `12` dynamic (one transaction)   |
| 38    | Merchant Account Information (NAPAS) | template, see below                                                 |
| 38.00 | GUID                                 | `A000000727`                                                        |
| 38.01 | Beneficiary                          | template: `00` = bank BIN (6 digits), `01` = account or card number |
| 38.02 | Service code                         | `QRIBFTTA` (to account) or `QRIBFTTC` (to card)                     |
| 52    | Merchant category code               | optional, usually omitted for P2P                                   |
| 53    | Transaction currency                 | `704` (VND)                                                         |
| 54    | Transaction amount                   | integer VND as text, omitted for static QR                          |
| 58    | Country code                         | `VN`                                                                |
| 59    | Merchant name                        | optional                                                            |
| 60    | Merchant city                        | optional                                                            |
| 62    | Additional data                      | template: `08` = purpose of transaction (note)                      |
| 63    | CRC                                  | 4 hex digits, uppercase                                             |

## CRC

CRC-16/CCITT-FALSE: polynomial `0x1021`, init `0xFFFF`, no reflection, no final XOR, over the UTF-8 bytes of the
payload **up to and including** `6304`. Append as 4 uppercase hex digits.

Reference vector: payload `00020101021238530010A000000727012300069704230109mynamebvh0208QRIBFTTA53037045405500005802VN62080804test6304` → CRC `AB76`.

## Bank identifiers

Bank BINs are issued by NAPAS (6 digits). The bundled list (`banks.json`) comes from the open-source
`vietnam-qr-pay` project (MIT) and includes each bank's VietQR support status. BINs never change when a bank rebrands
(LienVietPostBank → LPBank keeps 970449).

## Limits used by this skill

- Account/card: 1–19 alphanumeric characters.
- Amount: 1–13 digits, integer.
- Note: 25 characters after sanitising (EMVCo allows 99 inside tag 62, but bank apps truncate).
