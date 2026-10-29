import { defineConfig } from 'tsup';
import { stat, writeFile } from 'node:fs/promises';

interface Doc {
  desc: string;
  params: { name: string; desc: string; matrix?: boolean; optional?: boolean }[];
}

const DOCS: Record<string, Doc> = {
  TIEN_CHU: {
    desc: 'Đọc số tiền thành chữ (đồng).',
    params: [
      { name: 'amount', desc: 'Số tiền, một ô hoặc một vùng.', matrix: true },
      { name: 'thousand', desc: 'Tuỳ chọn: "nghìn" (mặc định) hoặc "ngàn".', optional: true },
    ],
  },
  SO_THANH_CHU: {
    desc: 'Đọc một số thành chữ.',
    params: [{ name: 'number', desc: 'Số, một ô hoặc một vùng.', matrix: true }],
  },
  MST: {
    desc: 'Kiểm tra mã số thuế: TRUE/FALSE.',
    params: [{ name: 'taxId', desc: 'Mã số thuế, một ô hoặc một vùng.', matrix: true }],
  },
  AM_LICH: {
    desc: 'Ngày âm lịch dạng chữ.',
    params: [
      { name: 'date', desc: 'Ngày (ô ngày hoặc dd/mm/yyyy), một ô hoặc một vùng.', matrix: true },
    ],
  },
  NGAY_LAM_VIEC: {
    desc: 'TRUE nếu là ngày làm việc (không phải cuối tuần hoặc ngày nghỉ lễ).',
    params: [
      { name: 'date', desc: 'Ngày (ô ngày hoặc dd/mm/yyyy), một ô hoặc một vùng.', matrix: true },
    ],
  },
  CONG_NGAY_LAM_VIEC: {
    desc: 'Cộng n ngày làm việc vào một ngày.',
    params: [
      { name: 'date', desc: 'Ngày (ô ngày hoặc dd/mm/yyyy), một ô hoặc một vùng.', matrix: true },
      { name: 'n', desc: 'Số ngày làm việc cần cộng (âm để trừ).' },
    ],
  },
  DIA_CHI_MOI: {
    desc: 'Chuyển địa chỉ cũ (3 cấp) sang địa chỉ mới (2 cấp, sau sáp nhập).',
    params: [{ name: 'address', desc: 'Địa chỉ, một ô hoặc một vùng.', matrix: true }],
  },
  SDT: {
    desc: 'Chuẩn hoá số điện thoại Việt Nam.',
    params: [
      { name: 'phone', desc: 'Số điện thoại, một ô hoặc một vùng.', matrix: true },
      {
        name: 'format',
        desc: 'Tuỳ chọn: "formatted" (mặc định), "e164" hoặc "carrier" (nhà mạng).',
        optional: true,
      },
    ],
  },
  TACH_TEN: {
    desc: 'Tách họ tên thành họ, tên đệm hoặc tên.',
    params: [
      { name: 'name', desc: 'Họ và tên, một ô hoặc một vùng.', matrix: true },
      { name: 'part', desc: '"ho" (họ), "dem" (tên đệm) hoặc "ten" (tên).' },
    ],
  },
  CCCD: {
    desc: 'Kiểm tra và đọc thông tin từ số CCCD (12 số) hoặc CMND (9 số).',
    params: [
      { name: 'id', desc: 'Số CCCD/CMND, một ô hoặc một vùng.', matrix: true },
      {
        name: 'field',
        desc: 'Tuỳ chọn: "hop_le" (mặc định, TRUE/FALSE), "tinh", "tinh_moi", "gioi_tinh" hoặc "nam_sinh".',
        optional: true,
      },
    ],
  },
};

const baseUrl = (process.env.VN_EXCEL_BASE_URL ?? 'https://localhost:3000').replace(/\/+$/, '');

const metadata = {
  functions: Object.entries(DOCS).map(([id, d]) => ({
    id,
    name: id,
    description: d.desc,
    result: { dimensionality: 'matrix' },
    parameters: d.params.map((p) => ({
      name: p.name,
      description: p.desc,
      dimensionality: p.matrix ? 'matrix' : 'scalar',
      ...(p.optional ? { optional: true } : {}),
    })),
  })),
};

const html = `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <script type="text/javascript" src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>
  </head>
  <body>
    <script type="text/javascript" src="functions.js"></script>
  </body>
</html>
`;

const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bt="http://schemas.microsoft.com/office/officeappbasictypes/1.0"
  xmlns:ov="http://schemas.microsoft.com/office/taskpaneappversion/1.0"
  xmlns:ct="http://schemas.microsoft.com/office/customfunctions/1.0"
  xsi:type="TaskPaneApp">
  <Id>6f0c5a3e-5b0e-4a6f-9a57-3b6f0f4d2a11</Id>
  <Version>0.7.0.0</Version>
  <ProviderName>vn-skills</ProviderName>
  <DefaultLocale>vi-VN</DefaultLocale>
  <DisplayName DefaultValue="VN Skills"/>
  <Description DefaultValue="Hàm Excel cho Việt Nam: tiền thành chữ, mã số thuế, âm lịch, ngày làm việc."/>
  <Hosts>
    <Host Name="Workbook"/>
  </Hosts>
  <DefaultSettings>
    <SourceLocation DefaultValue="${baseUrl}/functions.html"/>
  </DefaultSettings>
  <Permissions>ReadWriteDocument</Permissions>
  <VersionOverrides xmlns="http://schemas.microsoft.com/office/taskpaneappversionoverrides" xsi:type="VersionOverridesV1_0">
    <Hosts>
      <Host xsi:type="Workbook">
        <AllFormFactors>
          <ExtensionPoint xsi:type="CustomFunctions">
            <Script>
              <SourceLocation resid="Functions.Script.Url"/>
            </Script>
            <Page>
              <SourceLocation resid="Functions.Page.Url"/>
            </Page>
            <Metadata>
              <SourceLocation resid="Functions.Metadata.Url"/>
            </Metadata>
            <Namespace resid="Functions.Namespace"/>
          </ExtensionPoint>
        </AllFormFactors>
      </Host>
    </Hosts>
    <Resources>
      <bt:Urls>
        <bt:Url id="Functions.Script.Url" DefaultValue="${baseUrl}/functions.js"/>
        <bt:Url id="Functions.Metadata.Url" DefaultValue="${baseUrl}/functions.json"/>
        <bt:Url id="Functions.Page.Url" DefaultValue="${baseUrl}/functions.html"/>
      </bt:Urls>
      <bt:ShortStrings>
        <bt:String id="Functions.Namespace" DefaultValue="VN"/>
      </bt:ShortStrings>
    </Resources>
  </VersionOverrides>
</OfficeApp>
`;

export default defineConfig({
  entry: { functions: 'src/index.ts' },
  format: ['iife'],
  outDir: 'dist',
  target: 'es2019',
  clean: true,
  sourcemap: false,
  noExternal: [/.*/],
  loader: { '.json': 'json' },
  outExtension: () => ({ js: '.js' }),
  async onSuccess() {
    const { size } = await stat('dist/functions.js');
    console.log(`functions.js: ${(size / 1024).toFixed(0)} KiB (${size} bytes)`);
    await writeFile('dist/functions.json', JSON.stringify(metadata, null, 2) + '\n');
    await writeFile('dist/functions.html', html);
    await writeFile('dist/manifest.xml', manifest);
  },
});
