---
name: vn-name
description: Split, sort and slugify Vietnamese full names offline - họ / tên đệm / tên, compound surnames (Tôn Thất, Nguyễn Phúc), sorting by tên with Vietnamese collation, unaccented slugs and initials. Use when a user asks to "tách họ tên", "sắp xếp danh sách tên", "tạo slug từ tên", "viết tắt tên", or needs to order a Vietnamese name list.
license: MIT
compatibility: Requires Node.js 22+ (runs npx -y @vn-skills/cli). No network access.
metadata:
  author: vn-skills
  version: '0.1.0'
---

# Vietnamese names

Inside this repo use `pnpm vn-skills` instead of `npx -y @vn-skills/cli`.

```bash
npx -y @vn-skills/cli name split "Tôn Thất Minh Khoa"   # Tôn Thất | Minh | Khoa
npx -y @vn-skills/cli name slug "Đặng Thị Ánh"          # dang-thi-anh
npx -y @vn-skills/cli name initials "Đặng Thị Ánh" --ascii   # DTA
npx -y @vn-skills/cli name sort "Nguyễn Văn Cường" "Trần Thị An" "Lê Văn Bình"
```

Library: `import { splitName, slugifyName, initials, sortNames } from '@vn-skills/core'`. MCP tool: `vn_name`.

## Rules

- Family name = first word; the last word is the given name (tên); everything between is the middle name.
- Compound surnames recognised: Tôn Thất, Nguyễn Phúc (only when a given name follows). Other compound surnames are not guessed.
- A single word is returned as the given name only.
- Sorting is by tên, then tên đệm, then họ, with order a < ă < â < b … d < đ < e; tones break ties last.

## Common mistakes to avoid

- Sorting by the whole string (puts everyone named Nguyễn together) instead of by tên.
- Using plain `localeCompare` without a Vietnamese locale, which can place đ after d incorrectly.
