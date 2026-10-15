# Check-digit algorithm for Vietnamese tax IDs

```
digits d1..d9, weights w = [31, 29, 23, 19, 17, 13, 7, 5, 3]
sum   = Σ di * wi
check = 10 - (sum mod 11)
```

- `check` in 0..9 → must equal d10.
- `check == 10` (sum mod 11 == 0) → no valid 10th digit; the number is invalid.

Worked example `0100233488`: digits `0 1 0 0 2 3 3 4 8` →
`0·31 + 1·29 + 0·23 + 0·19 + 2·17 + 3·13 + 3·7 + 4·5 + 8·3 = 167`, `167 mod 11 = 2`, `10 − 2 = 8` ✓.

Any single-digit substitution in a valid ID changes the checksum (weights are coprime with 11), so typos are caught.

The same algorithm is used by `python-stdnum` (`stdnum.vn.mst`).

## Other structural rules

| Rule                              | Reason                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------- |
| Sequence (digits 3–9) ≠ `0000000` | reserved                                                                     |
| Branch suffix ≠ `000`             | branches start at 001                                                        |
| Keep leading zeros                | IDs are strings                                                              |
| 12-digit = CCCD (personal)        | Circular 86/2024/TT-BTC: personal ID replaces individual MST from 01/07/2025 |
