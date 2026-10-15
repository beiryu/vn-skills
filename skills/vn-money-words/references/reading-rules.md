# Reading rules for Vietnamese numbers

| Pattern                  | Reading                                    | Example                                 |
| ------------------------ | ------------------------------------------ | --------------------------------------- |
| 1–9                      | một … chín                                 | 5 → năm                                 |
| 10–19                    | mười + unit (15 → mười lăm, 11 → mười một) | 15 → mười lăm                           |
| x0 (x ≥ 2)               | x mươi                                     | 30 → ba mươi                            |
| x1 (x ≥ 2)               | x mươi mốt                                 | 21 → hai mươi mốt                       |
| x4 (x ≥ 2)               | x mươi tư (or bốn)                         | 24 → hai mươi tư                        |
| x5 (x ≥ 1)               | x mươi lăm                                 | 25 → hai mươi lăm                       |
| h0y                      | h trăm lẻ/linh y                           | 105 → một trăm lẻ năm                   |
| 0hy in non-leading group | không trăm …                               | 1.005 → một nghìn không trăm lẻ năm     |
| group = 000              | skipped                                    | 1.000.005 → một triệu không trăm lẻ năm |

Scale words by group index (right to left): `''`, `nghìn`, `triệu`, `tỷ`, `nghìn tỷ`, `triệu tỷ`, `tỷ tỷ`, …

Regional variants: `nghìn` (north) vs `ngàn` (south); `lẻ` (south, common on invoices) vs `linh` (north).

Golden examples (from the test-suite):

| Amount            | Words                                                                                |
| ----------------- | ------------------------------------------------------------------------------------ |
| 0                 | không đồng                                                                           |
| 1 005             | một nghìn không trăm lẻ năm đồng                                                     |
| 1 200 000         | một triệu hai trăm nghìn đồng                                                        |
| 1 234 567 890     | một tỷ hai trăm ba mươi tư triệu năm trăm sáu mươi bảy nghìn tám trăm chín mươi đồng |
| 1 000 000 000 000 | một nghìn tỷ đồng                                                                    |
| 10¹⁸              | một tỷ tỷ đồng                                                                       |
