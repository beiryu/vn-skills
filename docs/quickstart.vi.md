# Bắt đầu nhanh (5 phút)

[English](quickstart.md)

Cả ba cách dưới đây cần Node.js 22+ và dùng chung một lõi chạy offline. Mỗi cách đều đổi `1200000` thành chữ.

## 1. CLI

```bash
npx -y @vn-skills/cli money words 1200000 --json
```

Kết quả:

```json
{
  "ok": true,
  "amount": "1200000",
  "words": "một triệu hai trăm nghìn đồng"
}
```

`--json` ép xuất JSON. Không có cờ này, terminal chỉ in dòng `một triệu hai trăm nghìn đồng`; JSON là mặc định chỉ khi đầu ra được pipe.

Thêm: chuyển đổi địa chỉ (cũ sang mới, 34 tỉnh):

```bash
npx -y @vn-skills/cli address convert "P. Bến Nghé, Q.1, TP.HCM" --json
```

Kết quả:

```json
{
  "ok": true,
  "input": "P. Bến Nghé, Q.1, TP.HCM",
  "mappingType": "merged",
  "old": {
    "province": "Thành phố Hồ Chí Minh",
    "district": "Quận 1",
    "ward": "Phường Bến Nghé",
    "formatted": "Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh"
  },
  "new": {
    "province": {
      "code": "79",
      "fullName": "Thành phố Hồ Chí Minh"
    },
    "ward": {
      "code": "26740",
      "fullName": "Phường Sài Gòn",
      "postalCode": "71016"
    },
    "formatted": "Phường Sài Gòn, Thành phố Hồ Chí Minh"
  },
  "candidates": [
    {
      "code": "26740",
      "fullName": "Phường Sài Gòn",
      "province": "Thành phố Hồ Chí Minh",
      "isDefault": true
    }
  ],
  "confidence": 0.97,
  "warnings": []
}
```

## 2. MCP server

```bash
claude mcp add vn-skills -- npx -y @vn-skills/mcp
```

Khởi động lại Claude Code rồi hỏi: _"đọc số 1200000 thành chữ"_. Agent gọi tool `vn_money_to_words` với
`{ "amount": 1200000 }` và nhận về:

```json
{
  "ok": true,
  "amount": "1200000",
  "words": "một triệu hai trăm nghìn đồng"
}
```

Với MCP client khác dùng `{ "mcpServers": { "vn-skills": { "command": "npx", "args": ["-y", "@vn-skills/mcp"] } } }`.

## 3. Thư viện

```bash
npm i @vn-skills/core
```

```js
import { moneyToWords } from '@vn-skills/core';

console.log(moneyToWords(1_200_000));
```

Kết quả:

```
{
  ok: true,
  words: 'một triệu hai trăm nghìn đồng',
  amount: '1200000',
  negative: false
}
```

## Cài skill vào agent

```bash
npx -y @vn-skills/cli install all --agent claude    # hoặc cursor, codex
```

Binary tên là `vn-skills`, nên khi cài global lệnh tương đương là `vn-skills install all --agent claude` (thay `claude` bằng `cursor` hoặc `codex`).

Lệnh này chép toàn bộ skill vào thư mục skill của agent (`.claude/skills/`, `.cursor/skills/` hoặc `.codex/skills/`
trong dự án hiện tại). Thêm `--global` để cài vào thư mục home, `--dry-run` để chỉ in các thao tác, `--force` để ghi đè
thư mục đã có.
