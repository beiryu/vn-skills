import { defineConfig } from 'tsup';
import { stat, writeFile } from 'node:fs/promises';

const BASE = [
  'VN_TIEN_CHU',
  'VN_SO_THANH_CHU',
  'VN_MST',
  'VN_AM_LICH',
  'VN_NGAY_LAM_VIEC',
  'VN_CONG_NGAY_LAM_VIEC',
];

const DOCS: Record<string, { desc: string; params: [string, string][] }> = {
  VN_TIEN_CHU: {
    desc: 'Đọc số tiền thành chữ (đồng).',
    params: [
      ['amount', 'Số tiền, một ô hoặc một vùng.'],
      ['thousand', 'Tuỳ chọn: "nghìn" (mặc định) hoặc "ngàn".'],
    ],
  },
  VN_SO_THANH_CHU: {
    desc: 'Đọc một số thành chữ.',
    params: [['number', 'Số, một ô hoặc một vùng.']],
  },
  VN_MST: {
    desc: 'Kiểm tra mã số thuế: TRUE/FALSE.',
    params: [['taxId', 'Mã số thuế, một ô hoặc một vùng.']],
  },
  VN_AM_LICH: {
    desc: 'Ngày âm lịch dạng chữ.',
    params: [['date', 'Ngày (ô ngày hoặc dd/mm/yyyy), một ô hoặc một vùng.']],
  },
  VN_NGAY_LAM_VIEC: {
    desc: 'TRUE nếu là ngày làm việc (không phải cuối tuần hoặc ngày nghỉ lễ).',
    params: [['date', 'Ngày (ô ngày hoặc dd/mm/yyyy), một ô hoặc một vùng.']],
  },
  VN_CONG_NGAY_LAM_VIEC: {
    desc: 'Cộng n ngày làm việc vào một ngày.',
    params: [
      ['date', 'Ngày (ô ngày hoặc dd/mm/yyyy), một ô hoặc một vùng.'],
      ['n', 'Số ngày làm việc cần cộng (âm để trừ).'],
    ],
  },
  VN_DIA_CHI_MOI: {
    desc: 'Chuyển địa chỉ cũ (3 cấp) sang địa chỉ mới (2 cấp, sau sáp nhập).',
    params: [['address', 'Địa chỉ, một ô hoặc một vùng.']],
  },
};

// Sheets only sees top-level functions, so each global delegates to the IIFE namespace.
const footer = (names: string[]) =>
  names
    .map((n) => {
      const { desc, params } = DOCS[n]!;
      const tags = params.map(([p, d]) => ` * @param {*} ${p} ${d}`).join('\n');
      const args = params.map(([p]) => p).join(', ');
      return `/**\n * ${desc}\n${tags}\n * @return {*}\n * @customfunction\n */\nfunction ${n}(${args}) {\n  return VnSkills.${n}.apply(null, arguments);\n}`;
    })
    .join('\n');

const variant = (file: string, entry: string, names: string[]) => ({
  entry: { [file]: entry },
  format: ['iife' as const],
  globalName: 'VnSkills',
  outDir: 'dist',
  target: 'es2019',
  clean: false,
  sourcemap: false,
  noExternal: [/.*/],
  loader: { '.json': 'json' as const },
  outExtension: () => ({ js: '.gs' }),
  footer: { js: footer(names) },
  async onSuccess() {
    const { size } = await stat(`dist/${file}.gs`);
    console.log(`${file}.gs: ${(size / 1024).toFixed(0)} KiB (${size} bytes)`);
    const manifest = {
      timeZone: 'Asia/Ho_Chi_Minh',
      exceptionLogging: 'STACKDRIVER',
      runtimeVersion: 'V8',
    };
    await writeFile('dist/appsscript.json', JSON.stringify(manifest, null, 2) + '\n');
  },
});

export default defineConfig([
  variant('vn-skills', 'src/full.ts', [...BASE, 'VN_DIA_CHI_MOI']),
  variant('vn-skills-lite', 'src/lite.ts', BASE),
]);
