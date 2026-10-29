# vn-skills

> Teach your AI agent to work with VietQR, e-invoices, the new 34-province addresses and more — with one command.

[Tiếng Việt](README.vi.md) · **[5-minute quickstart](docs/quickstart.md)**

Coding agents (Claude Code, Codex, Cursor, …) get Vietnam-specific tasks wrong: they invent bank BINs, use the
pre-2025 provinces and districts, misread amounts in words, or confuse the Chinese and Vietnamese lunar calendars.
**vn-skills** fixes that with three layers built on one offline core:

| Layer            | What                                                                          | Install                                             |
| ---------------- | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| **Agent Skills** | `skills/*/SKILL.md` following the [Agent Skills](https://agentskills.io) spec | copy a folder into your agent's skills directory    |
| **CLI**          | `@vn-skills/cli` — `npx -y @vn-skills/cli …` (JSON output for agents)         | nothing; the skills call it                         |
| **MCP server**   | `@vn-skills/mcp` — the same functions as MCP tools                            | `claude mcp add vn-skills -- npx -y @vn-skills/mcp` |
| **Library**      | `@vn-skills/core` — pure TypeScript, no network, data bundled                 | `npm i @vn-skills/core`                             |

**What it is:** an offline toolkit. No accounts or API keys; it builds, parses and validates VietQR payloads and images. **What it is not:** a payment gateway. It does not collect payments or confirm transfers, and never calls bank or NAPAS APIs; pair it with a payment gateway for that.

<!-- TODO: GIF — agent builds a VietQR and converts an address in 15 seconds -->

## Skills

| Skill                                                  | Does                                                                                                                   | Example                                                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [`vietqr`](skills/vietqr/SKILL.md)                     | Build/parse VietQR (NAPAS 247, EMVCo) payloads, CRC16, PNG/SVG, bank BIN lookup                                        | `vn-skills vietqr build --bank VCB --account 0011001234567 --amount 500000 --note "don 123" --out qr.png` |
| [`vn-address`](skills/vn-address/SKILL.md)             | Parse/normalise addresses; convert 63-province + district addresses to the 34-province, 2-level structure (01/07/2025) | `vn-skills address convert "P. Bến Nghé, Q.1, TP.HCM"` → `Phường Sài Gòn, Thành phố Hồ Chí Minh`          |
| [`vn-tax-id`](skills/vn-tax-id/SKILL.md)               | Validate tax IDs (10 / 13 digits, check digit, branch suffix; 12-digit personal ID) offline                            | `vn-skills taxid validate 0100233488-001`                                                                 |
| [`vn-id`](skills/vn-id/SKILL.md)                       | Validate/decode 12-digit CCCD (province, sex, birth year) and check 9-digit CMND format offline                        | `vn-skills id parse 048090123456`                                                                         |
| [`vn-phone`](skills/vn-phone/SKILL.md)                 | Normalise phone numbers (+84, old 11-digit prefixes), carrier by prefix, landline area codes                           | `vn-skills phone 0912345678`                                                                              |
| [`vn-holidays`](skills/vn-holidays/SKILL.md)           | Official days off per year (announced notices, nghỉ bù, swaps), working-day check and add N working days               | `vn-skills holidays add 2026-02-12 3`                                                                     |
| [`vn-money-words`](skills/vn-money-words/SKILL.md)     | Amount → Vietnamese words (nghìn/ngàn, lẻ/linh, mốt/lăm/tư, tỷ tỷ)                                                     | `vn-skills money words 1200000` → `một triệu hai trăm nghìn đồng`                                         |
| [`vn-lunar`](skills/vn-lunar/SKILL.md)                 | Solar ↔ lunar, leap months, can chi, Tết, holidays (Meeus astronomical algorithms, UTC+7)                              | `vn-skills lunar tet 2027` → `2027-02-06 Đinh Mùi`                                                        |
| [`vn-einvoice`](skills/vn-einvoice/SKILL.md)           | E-invoice schema validation, VAT/totals, amount in words, mock provider; MISA/Viettel/VNPT adapter skeletons           | `vn-skills einvoice example > invoice.json && vn-skills einvoice totals invoice.json`                     |
| [`vn-name`](skills/vn-name/SKILL.md)                   | Split họ / tên đệm / tên, compound surnames, Vietnamese collation sort, unaccented slugs and initials                  | `vn-skills name split "Tôn Thất Tùng"`                                                                    |
| [`vn-number-format`](skills/vn-number-format/SKILL.md) | Format/parse Vietnamese numbers, ₫ amounts and dd/MM/yyyy dates; parse "1tr2", "500k", "1,5 tỷ"                        | `vn-skills numfmt parse "1tr2"` → `1200000`                                                               |

Bulk-convert stored addresses (one per line → NDJSON, or a CSV column; exit code 2 if some rows fail):

```bash
vn-skills address convert-file addresses.txt
vn-skills address convert-file customers.csv --csv --column address > converted.csv
```

## Install the skills

**Claude Code plugin** (all skills + the MCP server, one command):

```text
/plugin marketplace add beiryu/vn-skills
/plugin install vn-skills@vn-skills
```

**Claude Code** (project or user scope):

```bash
git clone https://github.com/beiryu/vn-skills
cp -r vn-skills/skills/vietqr ~/.claude/skills/          # or .claude/skills/ inside your project
```

Then ask: _"tạo QR chuyển 500k vào VCB số tài khoản 0011001234567"_ → Claude runs the skill and returns `qr.png`.

Or use the CLI (skills are bundled in the package):

```bash
npx -y @vn-skills/cli install vietqr --agent claude            # .claude/skills/vietqr (project)
npx -y @vn-skills/cli install all --agent cursor --global      # ~/.cursor/skills/*
```

`--agent` is `claude`, `cursor`, `codex`, `agents` or `copilot` (`.github/skills/`, or `~/.copilot/skills/` with `--global`). Existing folders are not overwritten without `--force`; `--dry-run` prints
the actions only.

**Cursor / Codex / other agents:** copy the same folders into the agent's skills directory
(`.cursor/skills/`, `.codex/skills/`, or wherever your agent discovers `SKILL.md`). The skills only need Node.js 22+ because
they call `npx -y @vn-skills/cli`. `.agents/skills/` is read by Codex ([docs](https://learn.chatgpt.com/docs/build-skills)), Cursor ([docs](https://cursor.com/docs/skills)), Gemini CLI ([docs](https://geminicli.com/docs/cli/skills/)) and GitHub Copilot in VS Code, Copilot CLI and the cloud agent ([docs](https://docs.github.com/en/copilot/concepts/customizations/agent-skills)); install there with `--agent agents`. For the Copilot cloud agent, install in project scope (`--agent agents` without `--global`), because the cloud agent does not load personal skills.

**Inside this repository** run `node packages/cli/dist/index.js …` instead of `npx -y @vn-skills/cli …` to get clean JSON. `pnpm vn-skills …` also works but adds wrapper output (the echoed command and `[ELIFECYCLE]` on failures).

## MCP server

```bash
claude mcp add vn-skills -- npx -y @vn-skills/mcp
```

Setup for other clients is in [MCP client setup](#mcp-client-setup). Or in any MCP client config:

```json
{ "mcpServers": { "vn-skills": { "command": "npx", "args": ["-y", "@vn-skills/mcp"] } } }
```

The server exposes 32 tools, grouped by skill. All tools are declared read-only and offline (`readOnlyHint: true`, `openWorldHint: false`).

| Skill              | Tools                                                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `vietqr`           | `vietqr_build`, `vietqr_parse`, `vietqr_decode`, `vietqr_banks`                                                                                |
| `vn-address`       | `vn_address_parse`, `vn_address_convert`, `vn_address_convert_batch`, `vn_address_search_wards`, `vn_address_provinces`, `vn_address_province` |
| `vn-tax-id`        | `vn_tax_id_validate`, `vn_tax_id_check_digit`                                                                                                  |
| `vn-id`            | `vn_id_parse`                                                                                                                                  |
| `vn-phone`         | `vn_phone`                                                                                                                                     |
| `vn-holidays`      | `vn_holidays_year`, `vn_holidays_ics`, `vn_holidays_is_working_day`, `vn_holidays_add_working_days`, `vn_holidays_count_working_days`          |
| `vn-money-words`   | `vn_money_to_words`                                                                                                                            |
| `vn-lunar`         | `vn_lunar_from_solar`, `vn_lunar_to_solar`, `vn_lunar_month`, `vn_lunar_holidays`, `vn_lunar_tet`, `vn_lunar_canchi`                           |
| `vn-einvoice`      | `vn_einvoice_validate`, `vn_einvoice_totals`, `vn_einvoice_mock_issue`, `vn_einvoice_example`                                                  |
| `vn-name`          | `vn_name`                                                                                                                                      |
| `vn-number-format` | `vn_number_format`                                                                                                                             |

### Prompts

The server also offers prompt templates, shown as `/` commands in clients that support MCP prompts: `tao-vietqr`, `doi-dia-chi-moi`, `kiem-tra-mst`, `doc-cccd`, `so-tien-bang-chu`, `ngay-lam-viec`, `doi-am-duong`, `kiem-tra-hoa-don`.

### MCP client setup

Requires Node.js 22+. Each client has its own file and shape; check the linked docs for the exact location.

**[Claude Code](https://docs.claude.com/en/docs/claude-code/mcp):**

```bash
claude mcp add vn-skills -- npx -y @vn-skills/mcp
```

**[Claude Desktop](https://modelcontextprotocol.io/quickstart/user)** — `claude_desktop_config.json`:

```json
{ "mcpServers": { "vn-skills": { "command": "npx", "args": ["-y", "@vn-skills/mcp"] } } }
```

**[Cursor](https://docs.cursor.com/context/model-context-protocol)** — `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global), same `mcpServers` shape:

```json
{ "mcpServers": { "vn-skills": { "command": "npx", "args": ["-y", "@vn-skills/mcp"] } } }
```

**[VS Code](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)** — `.vscode/mcp.json` (top-level `servers`, not `mcpServers`):

```json
{
  "servers": {
    "vn-skills": { "type": "stdio", "command": "npx", "args": ["-y", "@vn-skills/mcp"] }
  }
}
```

**[Codex](https://developers.openai.com/codex/mcp)** — `~/.codex/config.toml`:

```toml
[mcp_servers.vn-skills]
command = "npx"
args = ["-y", "@vn-skills/mcp"]
```

#### Docker

Build the image from this repository (the server is offline and needs no env vars):

```bash
docker build -t vn-skills-mcp .
```

Then point your client at it (it runs `docker run -i --rm vn-skills-mcp`):

```json
{
  "mcpServers": {
    "vn-skills": { "command": "docker", "args": ["run", "-i", "--rm", "vn-skills-mcp"] }
  }
}
```

Other clients: use the generic `mcpServers` block above. AI agents (e.g. Cline) can follow [llms-install.md](llms-install.md).

### HTTP mode

For a shared or remote server, run the opt-in Streamable HTTP transport (stateless, `POST /mcp`):

```bash
npx -y @vn-skills/mcp --http --port 3000   # http://127.0.0.1:3000/mcp
```

It binds to `127.0.0.1` by default; use `--host 0.0.0.0` to expose it (e.g. `docker run -p 3000:3000 vn-skills-mcp --http --host 0.0.0.0`). Requests with a non-localhost `Origin` header get 403 unless you pass `--allow-origin <origin>` (repeatable). Without `--http` the server uses stdio.

## Library

```ts
import {
  buildVietQR,
  convertAddress,
  validateTaxId,
  moneyToWords,
  lunarInfo,
  computeTotals,
} from '@vn-skills/core';

buildVietQR({ bank: 'VCB', account: '0011001234567', amount: 500000, note: 'don 123' }).payload;
convertAddress('12 Nguyễn Huệ, P. Bến Nghé, Q.1, TP.HCM').new.formatted; // "12 Nguyễn Huệ, Phường Sài Gòn, Thành phố Hồ Chí Minh"
validateTaxId('0100233488-001').kind; // "branch"
moneyToWords(1_200_000).words; // "một triệu hai trăm nghìn đồng"
lunarInfo(29, 1, 2025).text; // "Mùng 1 tháng Giêng năm Ất Tỵ"
```

Every function returns `{ ok: true, ... }` or `{ ok: false, error: { code, message, hint } }` — no exceptions for bad input.

## Development

```bash
pnpm install && pnpm build && pnpm test
pnpm build-data          # refresh bundled datasets from pinned upstream commits (network)
```

Data sources, licenses and dates are listed in [packages/core/data/SOURCES.md](packages/core/data/SOURCES.md).
See [CONTRIBUTING.md](CONTRIBUTING.md).

## Roadmap

Next up: a Python
port and real e-invoice sandbox adapters. Full list with acceptance criteria: [ROADMAP.md](ROADMAP.md).

## Community

[Contributing](CONTRIBUTING.md) · [Governance](GOVERNANCE.md) · [Code of Conduct](CODE_OF_CONDUCT.md) ·
[Security](SECURITY.md) · [Name & brand policy](TRADEMARK.md) · [Sponsor](https://github.com/sponsors/beiryu)

## Disclaimer

This project provides technical tooling only. It is not tax, legal or accounting advice, does not query or scrape any
government system, and does not guarantee that a tax ID is registered or that an address is accepted by a carrier.
Verify with the competent authority where it matters.

VietQR and NAPAS are trademarks of the National Payment Corporation of Vietnam (NAPAS); bank names belong to their
owners. vn-skills is not affiliated with, endorsed by or certified by NAPAS, any bank or any Vietnamese authority.

## License

MIT. Bundled data is derived from MIT-licensed community datasets (see
[SOURCES.md](packages/core/data/SOURCES.md) and their licences in
[THIRD_PARTY_NOTICES.md](packages/core/THIRD_PARTY_NOTICES.md)); the lunar calendar is an independent implementation of the formulas in Jean Meeus, _Astronomical Algorithms_.
