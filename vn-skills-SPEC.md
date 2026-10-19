# vn-skills — SPEC (bản nháp để đưa cho coding agent)

> **Prompt cho agent:** Đọc toàn bộ file này. Dựng monorepo `vn-skills` gồm (a) bộ Agent Skills theo chuẩn `SKILL.md` và (b) một thư viện lõi TypeScript + MCP server dùng chung. Mỗi skill phải tự chứa, có script chạy được và có test. Có thể tham khảo/fork cấu trúc từ các repo ở mục 4, nhưng phải kiểm tra license. Hỏi lại tôi trước khi dùng API trả phí hoặc thật của bên thứ ba.

## 1. Mục tiêu
Giúp coding agent (Claude Code, Codex, Cursor…) **làm đúng các nghiệp vụ đặc thù Việt Nam** mà hiện chúng hay làm sai: VietQR, địa chỉ 34 tỉnh, mã số thuế, đọc số tiền bằng chữ, lịch âm, hóa đơn điện tử.

Câu một dòng cho README: *"Dạy AI agent của bạn làm việc với VietQR, hóa đơn điện tử, địa chỉ mới… chỉ bằng một lệnh."*

## 2. Các skill trong MVP
| Skill | Làm gì | Ghi chú triển khai |
|---|---|---|
| `vietqr` | Tạo và parse chuỗi VietQR (EMVCo/NAPAS), xuất PNG/SVG | Có CRC16; danh sách BIN ngân hàng để trong `data/banks.json` |
| `vn-address` | Chuẩn hóa địa chỉ tự do; chuyển **địa chỉ cũ (63 tỉnh, có cấp huyện) → mới (34 tỉnh, 2 cấp)** từ 01/07/2025 | Dữ liệu đơn vị hành chính + bảng ánh xạ cũ→mới; fuzzy match bỏ dấu |
| `vn-tax-id` | Kiểm tra định dạng và chữ số kiểm tra của MST (10 số / 13 số có hậu tố chi nhánh) | **Chỉ kiểm tra offline.** Không scrape trang thuế (có captcha/ToS) |
| `vn-money-words` | Đọc số tiền thành chữ ("một triệu hai trăm nghìn đồng"), có các biến thể nghìn/ngàn, lẻ/linh | Dùng cho hóa đơn, hợp đồng |
| `vn-lunar` | Đổi dương ↔ âm lịch, can chi, ngày lễ Việt Nam | Công thức thiên văn Meeus (cài đặt độc lập), test với các mốc Tết |
| `vn-einvoice` | Interface chung + adapter (MISA meInvoice, Viettel S-Invoice, VNPT) để tạo/tra cứu hóa đơn | MVP: định nghĩa schema + adapter **sandbox/mock**, chưa gọi API thật |

Thêm sau MVP: `vn-id` (validate định dạng CCCD, giải mã tỉnh/giới tính/năm sinh từ 6 số đầu), `vn-holidays`, `vn-bank-statement`, cầu nối sang VietDoc.

## 3. Hình thức phân phối (3 lớp, cùng một lõi)
1. **Agent Skills:** mỗi skill một thư mục có `SKILL.md` (frontmatter `name`, `description`), kèm script và tài liệu tham chiếu. Cài bằng cách copy thư mục hoặc dùng CLI cài skill phổ biến.
2. **Thư viện TS** `@vn-skills/core` (npm) và bản Python `vn-skills` (PyPI) cho các hàm thuần (có thể làm Python sau).
3. **MCP server** `npx @vn-skills/mcp` để expose các hàm thành tools.

## 4. Nền tảng có thể dùng/fork (kiểm tra license + bản mới nhất)
| Mục đích | Ứng viên |
|---|---|
| Format skill | `anthropics/skills` (chuẩn SKILL.md), `addyosmani/agent-skills` (cấu trúc repo nhiều skill) |
| MCP | MCP TypeScript SDK chính thức |
| Dữ liệu hành chính | `thanglequoc/vietnamese-provinces-database`, `sunshine-tech/VietnamProvinces`, `vietmap-company/vietnam_administrative_address` |
| VietQR | Các thư viện trong GitHub topic `vietqr`, tham khảo cách tính CRC/TLV, không cần fork |
| Lịch âm | Jean Meeus, _Astronomical Algorithms_; JPL Horizons để đối chiếu |

**Đề xuất:** tạo repo mới, copy cấu trúc thư mục kiểu `agent-skills`, viết lõi TS từ đầu (các hàm đều nhỏ). Dữ liệu hành chính thì **import có ghi nguồn**, không fork cả repo.

## 5. Cấu trúc repo
```
vn-skills/
  README.md / README.vi.md     # GIF: agent tạo VietQR + đổi địa chỉ trong 15 giây
  LICENSE                      # MIT
  skills/
    vietqr/SKILL.md + scripts/ + reference.md
    vn-address/SKILL.md + scripts/
    vn-tax-id/...
    vn-money-words/...
    vn-lunar/...
    vn-einvoice/...
  packages/
    core/        # @vn-skills/core: hàm thuần, không phụ thuộc mạng
      src/{vietqr,address,taxid,money,lunar,einvoice}/
      data/{banks.json, provinces-2025.json, mapping-old-new.json}
    mcp/         # @vn-skills/mcp: tools = các hàm core
  scripts/build-data.ts        # tải + chuẩn hóa dữ liệu hành chính, ghi nguồn + ngày
  tests/                       # vitest; có golden tests cho từng skill
  .github/workflows/{ci.yml, release.yml}
  pnpm-workspace.yaml
```

## 6. Mẫu `SKILL.md`
```markdown
---
name: vietqr
description: Tạo hoặc đọc mã VietQR chuyển khoản ngân hàng Việt Nam (NAPAS/EMVCo). Dùng khi người dùng cần QR thanh toán, parse chuỗi VietQR, hoặc tích hợp thanh toán chuyển khoản VN.
---
# VietQR
## Khi nào dùng
...
## Cách làm
1. Chạy `scripts/vietqr.ts build --bank <BIN|tên> --account <số> --amount <số> --note "<nội dung>"`
2. ...
## Lỗi hay gặp
- Nội dung chuyển khoản có dấu → bỏ dấu, giới hạn độ dài
- Sai CRC → ...
```

## 7. Milestones
- **W1:** monorepo + CI; `vietqr`, `vn-money-words`, `vn-tax-id` (thuần logic, dễ test).
- **W2:** `vn-address` (dữ liệu 34 tỉnh + bảng ánh xạ + fuzzy match), `vn-lunar`.
- **W3:** MCP server + publish npm; `vn-einvoice` mức schema + mock adapter.
- **W4:** README, GIF demo, hướng dẫn cài cho Claude Code / Codex / Cursor; bài Viblo; launch.

## 8. Tiêu chí hoàn thành
- Mỗi skill có ít nhất 20 test case, gồm cả ca biên (địa chỉ viết tắt/không dấu, MST 13 số, số tiền 0 và số rất lớn, năm nhuận âm lịch).
- Lõi chạy **offline**, không gọi mạng.
- Dữ liệu hành chính có file `SOURCES.md` ghi nguồn, license và ngày cập nhật.
- Cài một skill vào Claude Code và hỏi "tạo QR chuyển 500k vào VCB số tài khoản X" → ra ảnh QR đúng.

## 9. Lưu ý
- Không chứa API key thật trong repo; adapter hóa đơn đọc credential từ biến môi trường và chỉ dùng sandbox.
- Không scrape hệ thống của cơ quan nhà nước.
- Ghi rõ trong README: thông tin chỉ mang tính kỹ thuật, không thay thế tư vấn thuế/pháp lý.
