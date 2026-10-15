# vn-skills

> Dạy AI agent của bạn làm việc với VietQR, hóa đơn điện tử, địa chỉ mới 34 tỉnh… chỉ bằng một lệnh.

[English](README.md)

Các coding agent (Claude Code, Codex, Cursor…) hay làm sai nghiệp vụ Việt Nam: bịa mã BIN ngân hàng, dùng 63 tỉnh và
quận/huyện đã bỏ, đọc số tiền bằng chữ sai, nhầm âm lịch Việt Nam với Trung Quốc. **vn-skills** sửa việc đó bằng ba lớp
trên cùng một lõi chạy offline:

| Lớp              | Là gì                                                                      | Cài                                                 |
| ---------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| **Agent Skills** | `skills/*/SKILL.md` theo chuẩn [Agent Skills](https://agentskills.io)      | copy thư mục vào chỗ chứa skill của agent           |
| **CLI**          | `@vn-skills/cli` — `npx -y @vn-skills/cli …` (xuất JSON cho agent)         | không cần cài; skill tự gọi                         |
| **MCP server**   | `@vn-skills/mcp` — cùng bộ hàm, dạng MCP tool                              | `claude mcp add vn-skills -- npx -y @vn-skills/mcp` |
| **Thư viện**     | `@vn-skills/core` — TypeScript thuần, không gọi mạng, dữ liệu đóng gói sẵn | `npm i @vn-skills/core`                             |

<!-- TODO: GIF — agent tạo VietQR + đổi địa chỉ trong 15 giây -->

## Các skill

| Skill                                              | Làm gì                                                                                                   | Ví dụ                                                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [`vietqr`](skills/vietqr/SKILL.md)                 | Tạo/đọc chuỗi VietQR (NAPAS 247, EMVCo), CRC16, xuất PNG/SVG, tra BIN ngân hàng                          | `vn-skills vietqr build --bank VCB --account 0011001234567 --amount 500000 --note "don 123" --out qr.png` |
| [`vn-address`](skills/vn-address/SKILL.md)         | Chuẩn hóa địa chỉ; đổi địa chỉ cũ (63 tỉnh, có huyện) sang mới (34 tỉnh, 2 cấp, từ 01/07/2025)           | `vn-skills address convert "P. Bến Nghé, Q.1, TP.HCM"` → `Phường Sài Gòn, Thành phố Hồ Chí Minh`          |
| [`vn-tax-id`](skills/vn-tax-id/SKILL.md)           | Kiểm tra MST offline (10/13 số, chữ số kiểm tra, hậu tố chi nhánh; CCCD 12 số)                           | `vn-skills taxid validate 0100233488-001`                                                                 |
| [`vn-money-words`](skills/vn-money-words/SKILL.md) | Đọc số tiền bằng chữ (nghìn/ngàn, lẻ/linh, mốt/lăm/tư, tỷ tỷ)                                            | `vn-skills money words 1200000` → `một triệu hai trăm nghìn đồng`                                         |
| [`vn-lunar`](skills/vn-lunar/SKILL.md)             | Dương ↔ âm lịch, tháng nhuận, can chi, Tết, ngày lễ (thuật toán Hồ Ngọc Đức, UTC+7)                      | `vn-skills lunar tet 2027` → `2027-02-06 Đinh Mùi`                                                        |
| [`vn-einvoice`](skills/vn-einvoice/SKILL.md)       | Schema hóa đơn điện tử, tính thuế/tổng, số tiền bằng chữ, provider mock; khung adapter MISA/Viettel/VNPT | `vn-skills einvoice totals invoice.json`                                                                  |

## Cài skill

**Claude Code:**

```bash
git clone https://github.com/beiryu/vn-skills
cp -r vn-skills/skills/vietqr ~/.claude/skills/        # hoặc .claude/skills/ trong project
```

Rồi hỏi: _"tạo QR chuyển 500k vào VCB số tài khoản 0011001234567"_ → Claude chạy skill và trả về `qr.png`.

**Cursor / Codex / agent khác:** copy đúng thư mục đó vào nơi agent tìm `SKILL.md` (`.cursor/skills/`, `.codex/skills/`…).
Skill chỉ cần Node.js 18+ vì gọi `npx -y @vn-skills/cli`.

**Khi làm việc trong repo này** (chưa publish npm) dùng `pnpm vn-skills …` thay cho `npx -y @vn-skills/cli …`.

## MCP server

```bash
claude mcp add vn-skills -- npx -y @vn-skills/mcp
```

Hoặc trong cấu hình MCP bất kỳ:

```json
{ "mcpServers": { "vn-skills": { "command": "npx", "args": ["-y", "@vn-skills/mcp"] } } }
```

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

Sắp tới: `vn-id` (giải mã CCCD), `vn-holidays`, `vn-phone`, `vn-number-format`, lệnh `vn-skills install`, bản Python và
adapter hóa đơn gọi sandbox thật. Danh sách đầy đủ kèm tiêu chí hoàn thành: [ROADMAP.md](ROADMAP.md).

## Cộng đồng

[Đóng góp](CONTRIBUTING.md) · [Quản trị dự án](GOVERNANCE.md) · [Quy tắc ứng xử](CODE_OF_CONDUCT.md) ·
[Bảo mật](SECURITY.md) · [Chính sách tên & thương hiệu](TRADEMARK.md) · [Tài trợ](https://github.com/sponsors/beiryu)

## Lưu ý

Dự án chỉ cung cấp công cụ kỹ thuật, **không thay thế tư vấn thuế / pháp lý / kế toán**, không truy vấn hay scrape hệ thống
của cơ quan nhà nước, và không bảo đảm một MST đã được đăng ký hay một địa chỉ được đơn vị vận chuyển chấp nhận.

## License

MIT. Dữ liệu đóng gói lấy từ các bộ dữ liệu cộng đồng license MIT (xem SOURCES.md); thuật toán âm lịch theo Hồ Ngọc Đức.
