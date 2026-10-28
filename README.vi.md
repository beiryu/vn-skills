# vn-skills

> Dạy AI agent của bạn làm việc với VietQR, hóa đơn điện tử, địa chỉ mới 34 tỉnh… chỉ bằng một lệnh.

[English](README.md) · **[Bắt đầu nhanh trong 5 phút](docs/quickstart.vi.md)**

Các coding agent (Claude Code, Codex, Cursor…) hay làm sai nghiệp vụ Việt Nam: bịa mã BIN ngân hàng, dùng 63 tỉnh và
quận/huyện đã bỏ, đọc số tiền bằng chữ sai, nhầm âm lịch Việt Nam với Trung Quốc. **vn-skills** sửa việc đó bằng ba lớp
trên cùng một lõi chạy offline:

| Lớp              | Là gì                                                                      | Cài                                                 |
| ---------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| **Agent Skills** | `skills/*/SKILL.md` theo chuẩn [Agent Skills](https://agentskills.io)      | copy thư mục vào chỗ chứa skill của agent           |
| **CLI**          | `@vn-skills/cli` — `npx -y @vn-skills/cli …` (xuất JSON cho agent)         | không cần cài; skill tự gọi                         |
| **MCP server**   | `@vn-skills/mcp` — cùng bộ hàm, dạng MCP tool                              | `claude mcp add vn-skills -- npx -y @vn-skills/mcp` |
| **Thư viện**     | `@vn-skills/core` — TypeScript thuần, không gọi mạng, dữ liệu đóng gói sẵn | `npm i @vn-skills/core`                             |

**Là gì:** bộ công cụ chạy offline, không cần tài khoản hay API key; tạo, đọc và kiểm tra payload và ảnh VietQR. **Không phải:** cổng thanh toán. vn-skills không thu tiền, không xác nhận giao dịch chuyển khoản và không gọi API của ngân hàng hay NAPAS; hãy dùng kèm một cổng thanh toán cho việc đó.

<!-- TODO: GIF — agent tạo VietQR + đổi địa chỉ trong 15 giây -->

## Các skill

| Skill                                                  | Làm gì                                                                                                             | Ví dụ                                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| [`vietqr`](skills/vietqr/SKILL.md)                     | Tạo/đọc chuỗi VietQR (NAPAS 247, EMVCo), CRC16, xuất PNG/SVG, tra BIN ngân hàng                                    | `vn-skills vietqr build --bank VCB --account 0011001234567 --amount 500000 --note "don 123" --out qr.png` |
| [`vn-address`](skills/vn-address/SKILL.md)             | Chuẩn hóa địa chỉ; đổi địa chỉ cũ (63 tỉnh, có huyện) sang mới (34 tỉnh, 2 cấp, từ 01/07/2025)                     | `vn-skills address convert "P. Bến Nghé, Q.1, TP.HCM"` → `Phường Sài Gòn, Thành phố Hồ Chí Minh`          |
| [`vn-tax-id`](skills/vn-tax-id/SKILL.md)               | Kiểm tra MST offline (10/13 số, chữ số kiểm tra, hậu tố chi nhánh; CCCD 12 số)                                     | `vn-skills taxid validate 0100233488-001`                                                                 |
| [`vn-id`](skills/vn-id/SKILL.md)                       | Kiểm tra/giải mã CCCD 12 số (tỉnh, giới tính, năm sinh) và định dạng CMND 9 số offline                             | `vn-skills id parse 048090123456`                                                                         |
| [`vn-phone`](skills/vn-phone/SKILL.md)                 | Chuẩn hóa số điện thoại (+84, đầu số 11 số cũ), nhà mạng theo đầu số, mã vùng cố định                              | `vn-skills phone 0912345678`                                                                              |
| [`vn-holidays`](skills/vn-holidays/SKILL.md)           | Lịch nghỉ lễ, Tết chính thức từng năm (thông báo, nghỉ bù, hoán đổi), kiểm tra ngày làm việc, cộng N ngày làm việc | `vn-skills holidays add 2026-02-12 3`                                                                     |
| [`vn-money-words`](skills/vn-money-words/SKILL.md)     | Đọc số tiền bằng chữ (nghìn/ngàn, lẻ/linh, mốt/lăm/tư, tỷ tỷ)                                                      | `vn-skills money words 1200000` → `một triệu hai trăm nghìn đồng`                                         |
| [`vn-lunar`](skills/vn-lunar/SKILL.md)                 | Dương ↔ âm lịch, tháng nhuận, can chi, Tết, ngày lễ (thuật toán thiên văn Meeus, UTC+7)                            | `vn-skills lunar tet 2027` → `2027-02-06 Đinh Mùi`                                                        |
| [`vn-einvoice`](skills/vn-einvoice/SKILL.md)           | Schema hóa đơn điện tử, tính thuế/tổng, số tiền bằng chữ, provider mock; khung adapter MISA/Viettel/VNPT           | `vn-skills einvoice example > invoice.json && vn-skills einvoice totals invoice.json`                     |
| [`vn-name`](skills/vn-name/SKILL.md)                   | Tách họ / tên đệm / tên, họ kép, sắp xếp theo tên (collation tiếng Việt), slug không dấu và chữ cái đầu            | `vn-skills name split "Tôn Thất Tùng"`                                                                    |
| [`vn-number-format`](skills/vn-number-format/SKILL.md) | Định dạng/đọc số, tiền ₫, ngày dd/MM/yyyy kiểu Việt Nam; đọc "1tr2", "500k", "1,5 tỷ"                              | `vn-skills numfmt parse "1tr2"` → `1200000`                                                               |

Chuyển hàng loạt địa chỉ đã lưu (mỗi dòng một địa chỉ → NDJSON, hoặc một cột trong file CSV; thoát với mã 2 nếu có dòng lỗi):

```bash
vn-skills address convert-file addresses.txt
vn-skills address convert-file customers.csv --csv --column address > converted.csv
vn-skills address convert-file customers.csv --csv --province-column province --district-column district --ward-column ward > converted.csv
```

## Cài skill

**Plugin Claude Code** (tất cả skill + MCP server, một lệnh):

```text
/plugin marketplace add beiryu/vn-skills
/plugin install vn-skills@vn-skills
```

**Claude Code:**

```bash
git clone https://github.com/beiryu/vn-skills
cp -r vn-skills/skills/vietqr ~/.claude/skills/        # hoặc .claude/skills/ trong project
```

Rồi hỏi: _"tạo QR chuyển 500k vào VCB số tài khoản 0011001234567"_ → Claude chạy skill và trả về `qr.png`.

Hoặc dùng CLI (skill đã được đóng gói sẵn):

```bash
npx -y @vn-skills/cli install vietqr --agent claude        # .claude/skills/vietqr (project)
npx -y @vn-skills/cli install all --agent cursor --global  # ~/.cursor/skills/*
```

`--agent` là `claude`, `cursor`, `codex`, `agents` hoặc `copilot` (`.github/skills/`, hoặc `~/.copilot/skills/` với `--global`). Không ghi đè thư mục có sẵn nếu thiếu `--force`; `--dry-run` chỉ in các bước.

**Cursor / Codex / agent khác:** copy đúng thư mục đó vào nơi agent tìm `SKILL.md` (`.cursor/skills/`, `.codex/skills/`…).
Skill chỉ cần Node.js 22+ vì gọi `npx -y @vn-skills/cli`. `.agents/skills/` được Codex ([docs](https://learn.chatgpt.com/docs/build-skills)), Cursor ([docs](https://cursor.com/docs/skills)), Gemini CLI ([docs](https://geminicli.com/docs/cli/skills/)) và GitHub Copilot trong VS Code, Copilot CLI và cloud agent ([docs](https://docs.github.com/en/copilot/concepts/customizations/agent-skills)) đọc; cài vào đó bằng `--agent agents`. Với Copilot cloud agent, hãy cài ở phạm vi dự án (`--agent agents`, không dùng `--global`), vì cloud agent không nạp skill cá nhân.

**Khi làm việc trong repo này** chạy `node packages/cli/dist/index.js …` thay cho `npx -y @vn-skills/cli …` để có JSON sạch. `pnpm vn-skills …` vẫn chạy được nhưng thêm output của wrapper (dòng lệnh được echo và `[ELIFECYCLE]` khi lỗi).

## MCP server

```bash
claude mcp add vn-skills -- npx -y @vn-skills/mcp
```

Hoặc trong cấu hình MCP bất kỳ:

```json
{ "mcpServers": { "vn-skills": { "command": "npx", "args": ["-y", "@vn-skills/mcp"] } } }
```

Server cung cấp 34 tool, nhóm theo skill. Mọi tool đều được khai báo chỉ đọc và offline (`readOnlyHint: true`, `openWorldHint: false`).

| Skill              | Tool                                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vietqr`           | `vietqr_build`, `vietqr_parse`, `vietqr_decode`, `vietqr_banks`                                                                                                      |
| `vn-address`       | `vn_address_parse`, `vn_address_convert`, `vn_address_convert_batch`, `vn_address_search_wards`, `vn_address_history`, `vn_address_provinces`, `vn_address_province` |
| `vn-tax-id`        | `vn_tax_id_validate`, `vn_tax_id_check_digit`                                                                                                                        |
| `vn-id`            | `vn_id_parse`                                                                                                                                                        |
| `vn-phone`         | `vn_phone`                                                                                                                                                           |
| `vn-holidays`      | `vn_holidays_year`, `vn_holidays_is_working_day`, `vn_holidays_add_working_days`, `vn_holidays_count_working_days`                                                   |
| `vn-money-words`   | `vn_money_to_words`, `vn_money_parse`                                                                                                                                |
| `vn-lunar`         | `vn_lunar_from_solar`, `vn_lunar_to_solar`, `vn_lunar_month`, `vn_lunar_holidays`, `vn_lunar_tet`, `vn_lunar_canchi`                                                 |
| `vn-einvoice`      | `vn_einvoice_validate`, `vn_einvoice_totals`, `vn_einvoice_vat`, `vn_einvoice_mock_issue`, `vn_einvoice_example`                                                     |
| `vn-name`          | `vn_name`                                                                                                                                                            |
| `vn-number-format` | `vn_number_format`                                                                                                                                                   |

Client hỗ trợ MCP Apps (Claude, ChatGPT, VS Code, …) hiển thị kết quả VietQR (tạo với `image: true`) dưới dạng thẻ VietQR gồm ngân hàng, số tài khoản, số tiền và nút sao chép; client khác vẫn thấy JSON và ảnh như cũ.

### Prompts

Server cũng cung cấp prompt mẫu, hiển thị dạng lệnh `/` trong các client hỗ trợ MCP prompts: `tao-vietqr`, `doi-dia-chi-moi`, `kiem-tra-mst`, `doc-cccd`, `so-tien-bang-chu`, `ngay-lam-viec`, `doi-am-duong`, `kiem-tra-hoa-don`.

### Resources

Dữ liệu chỉ đọc mà client có thể đính kèm không cần gọi tool (đều là `application/json`):

### Cài đặt MCP theo client

Cần Node.js 22+. Mỗi client dùng file và cấu trúc riêng; xem tài liệu được liên kết để biết đúng vị trí file.

**[Claude Code](https://docs.claude.com/en/docs/claude-code/mcp):**

```bash
claude mcp add vn-skills -- npx -y @vn-skills/mcp
```

**[Claude Desktop](https://modelcontextprotocol.io/quickstart/user)** — `claude_desktop_config.json`:

```json
{ "mcpServers": { "vn-skills": { "command": "npx", "args": ["-y", "@vn-skills/mcp"] } } }
```

**[Cursor](https://docs.cursor.com/context/model-context-protocol)** — `.cursor/mcp.json` (dự án) hoặc `~/.cursor/mcp.json` (toàn cục), cùng cấu trúc `mcpServers`:

```json
{ "mcpServers": { "vn-skills": { "command": "npx", "args": ["-y", "@vn-skills/mcp"] } } }
```

**[VS Code](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)** — `.vscode/mcp.json` (khóa gốc là `servers`, không phải `mcpServers`):

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

Build image từ repo này (server chạy offline, không cần biến môi trường):

```bash
docker build -t vn-skills-mcp .
```

Sau đó trỏ client tới image (chạy `docker run -i --rm vn-skills-mcp`):

```json
{
  "mcpServers": {
    "vn-skills": { "command": "docker", "args": ["run", "-i", "--rm", "vn-skills-mcp"] }
  }
}
```

Client khác: dùng khối `mcpServers` chung ở trên. Agent AI (ví dụ Cline) có thể làm theo [llms-install.md](llms-install.md).

### Chế độ HTTP

Để dùng chung hoặc từ xa, chạy transport Streamable HTTP (tùy chọn, không lưu session, `POST /mcp`):

```bash
npx -y @vn-skills/mcp --http --port 3000   # http://127.0.0.1:3000/mcp
```

Mặc định chỉ lắng nghe trên `127.0.0.1`; dùng `--host 0.0.0.0` để mở ra ngoài (ví dụ `docker run -p 3000:3000 vn-skills-mcp --http --host 0.0.0.0`). Request có header `Origin` không phải localhost sẽ bị từ chối (403) trừ khi thêm `--allow-origin <origin>` (có thể lặp lại). Không có `--http` thì server dùng stdio.

## Thư viện

```ts
import {
  buildVietQR,
  convertAddress,
  validateTaxId,
  moneyToWords,
  lunarInfo,
} from '@vn-skills/core';
```

Mọi hàm trả về `{ ok: true, ... }` hoặc `{ ok: false, error: { code, message, hint } }`, không ném exception với input sai.

## Phát triển

```bash
pnpm install && pnpm build && pnpm test
pnpm build-data      # tải lại dữ liệu từ commit upstream đã ghim (cần mạng)
```

Nguồn dữ liệu, license và ngày cập nhật: [packages/core/data/SOURCES.md](packages/core/data/SOURCES.md). Xem thêm [CONTRIBUTING.md](CONTRIBUTING.md).

## Lộ trình

Sắp tới: bản Python và
adapter hóa đơn gọi sandbox thật. Danh sách đầy đủ kèm tiêu chí hoàn thành: [ROADMAP.md](ROADMAP.md).

## Cộng đồng

[Đóng góp](CONTRIBUTING.md) · [Quản trị dự án](GOVERNANCE.md) · [Quy tắc ứng xử](CODE_OF_CONDUCT.md) ·
[Bảo mật](SECURITY.md) · [Chính sách tên & thương hiệu](TRADEMARK.md) · [Tài trợ](https://github.com/sponsors/beiryu)

## Lưu ý

Dự án chỉ cung cấp công cụ kỹ thuật, **không thay thế tư vấn thuế / pháp lý / kế toán**, không truy vấn hay scrape hệ thống
của cơ quan nhà nước, và không bảo đảm một MST đã được đăng ký hay một địa chỉ được đơn vị vận chuyển chấp nhận.

VietQR và NAPAS là nhãn hiệu của Công ty Cổ phần Thanh toán Quốc gia Việt Nam (NAPAS); tên ngân hàng thuộc về chủ sở
hữu tương ứng. vn-skills không liên kết, không được bảo trợ hay chứng nhận bởi NAPAS, ngân hàng hay cơ quan nhà nước nào.

## License

MIT. Dữ liệu đóng gói lấy từ các bộ dữ liệu cộng đồng license MIT (xem
[SOURCES.md](packages/core/data/SOURCES.md) và toàn văn license tại
[THIRD_PARTY_NOTICES.md](packages/core/THIRD_PARTY_NOTICES.md)); lịch âm được cài đặt độc lập từ các công thức trong sách _Astronomical Algorithms_ của Jean Meeus.
