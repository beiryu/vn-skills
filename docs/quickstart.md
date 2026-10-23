# Quickstart (5 minutes)

[Tiếng Việt](quickstart.vi.md)

All three paths below need Node.js 22+ and run the same offline core. Each one turns `1200000` into Vietnamese words.

## 1. CLI

```bash
npx -y @vn-skills/cli money words 1200000 --json
```

Output:

```json
{
  "ok": true,
  "amount": "1200000",
  "words": "một triệu hai trăm nghìn đồng"
}
```

`--json` forces JSON output. Without it, a terminal prints only the plain line `một triệu hai trăm nghìn đồng`; JSON is the default only when the output is piped.

More: address conversion (old to new 34-province address):

```bash
npx -y @vn-skills/cli address convert "P. Bến Nghé, Q.1, TP.HCM" --json
```

Output:

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

Restart Claude Code, then ask: _"đọc số 1200000 thành chữ"_. The agent calls the `vn_money_to_words` tool with
`{ "amount": 1200000 }`, which returns:

```json
{
  "ok": true,
  "amount": "1200000",
  "words": "một triệu hai trăm nghìn đồng"
}
```

For Cursor, VS Code, Claude Desktop, Codex and other clients see [MCP client setup](../README.md#mcp-client-setup).

## 3. Library

```bash
npm i @vn-skills/core
```

```js
import { moneyToWords } from '@vn-skills/core';

console.log(moneyToWords(1_200_000));
```

Output:

```
{
  ok: true,
  words: 'một triệu hai trăm nghìn đồng',
  amount: '1200000',
  negative: false
}
```

## Install the skills into your agent

```bash
npx -y @vn-skills/cli install all --agent claude    # or cursor, codex
```

The binary is named `vn-skills`, so with a global install the same command is `vn-skills install all --agent claude` (replace `claude` with `cursor` or `codex`).

This copies every skill into the agent's skills directory (`.claude/skills/`, `.cursor/skills/` or `.codex/skills/`
in the current project). Add `--global` for your home directory, `--dry-run` to only print the actions and `--force`
to overwrite existing folders.
