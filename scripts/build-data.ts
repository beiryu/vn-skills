/**
 * Download + normalise the datasets bundled in @vn-skills/core (packages/core/data).
 *
 *   pnpm build-data            # refresh data from pinned upstream commits
 *   pnpm build-data --check    # rebuild into memory and fail if committed files differ
 *   pnpm build-data --offline  # reuse raw files cached in .scratch/raw (no network)
 *
 * Only this script touches the network. The core library never does.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'packages', 'core', 'data');
const RAW_DIR = join(ROOT, '.scratch', 'raw');
const args = new Set(process.argv.slice(2));
const CHECK = args.has('--check');
const OFFLINE = args.has('--offline');

/** Pinned upstream sources. Bump the SHA deliberately and note the change in SOURCES.md. */
const SOURCES = {
  provinces: {
    repo: 'thanglequoc/vietnamese-provinces-database',
    sha: '8b78ba5118715e1fa81769286724db79346abf52',
    license: 'MIT',
    files: {
      units: 'json/simplified_json_generated_data_vn_units_minified.json',
      meta: 'json/vn_provinces_metadata.json',
    },
    note: '34 provinces / 3,321 ward-level units after the 01/07/2025 rearrangement, incl. later decrees. Source of codes, names, English names, postal codes.',
  },
  adminunits: {
    repo: 'tranngocminhhieu/vietnamadminunits',
    sha: '7fac8c45805aad9916b17237c54baf4502303b93',
    license: 'MIT',
    files: {
      converter: 'vietnamadminunits/data/converter_2025.json',
      legacy: 'vietnamadminunits/data/parser_legacy.json',
      from2025: 'vietnamadminunits/data/parser_from_2025.json',
    },
    note: 'Pre-2025 63-province / district / ward catalogue, search keywords, and the old→new ward mapping (incl. divided wards).',
  },
  banks: {
    repo: 'xuannghia/vietnam-qr-pay',
    sha: '17a05d3f36245c51a4486eba8e21745deea9f232',
    license: 'MIT',
    files: { banks: 'src/constants/banks.ts', codes: 'src/constants/bank-code.ts' },
    note: 'NAPAS BIN list with VietQR support flags and SWIFT codes.',
  },
} as const;

function rawUrl(repo: string, sha: string, path: string): string {
  return `https://raw.githubusercontent.com/${repo}/${sha}/${path}`;
}

/** Upstream JSON was dumped by Python and may contain bare NaN tokens. */
function parseJson<T>(text: string): T {
  return JSON.parse(text.replace(/:\s*NaN\b/g, ': null')) as T;
}

async function fetchText(repo: string, sha: string, path: string): Promise<string> {
  const cache = join(RAW_DIR, repo.replace('/', '__'), sha, path);
  if (existsSync(cache)) return readFileSync(cache, 'utf8');
  if (OFFLINE) throw new Error(`Offline and no cache for ${path}`);
  const url = rawUrl(repo, sha, path);
  process.stderr.write(`GET ${url}\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const text = await res.text();
  mkdirSync(dirname(cache), { recursive: true });
  writeFileSync(cache, text);
  return text;
}

const stripDiacritics = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
const compactKey = (s: string) =>
  stripDiacritics(s)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
const accentedKey = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/* ---------- Output schema (documented in packages/core/data/SOURCES.md) ---------- */
interface WardOut {
  code: string;
  name: string;
  fullName: string;
  nameEn?: string;
  type: string;
  /** compact key, e.g. "phuongbadinh" */
  key: string;
  /** extra search keys: name without prefix, accented key when ambiguous */
  keys: string[];
  postalCode?: string;
}
interface ProvinceOut {
  code: string;
  name: string;
  fullName: string;
  nameEn?: string;
  type: string;
  key: string;
  keys: string[];
  postalPrefix?: string;
  wards: WardOut[];
}
interface LegacyWard {
  code: string;
  name: string;
  fullName: string;
  type: string;
  key: string;
  keys: string[];
}
interface LegacyDistrict {
  code: string;
  name: string;
  fullName: string;
  type: string;
  key: string;
  keys: string[];
  wards: LegacyWard[];
}
interface LegacyProvince {
  code: string;
  name: string;
  fullName: string;
  type: string;
  key: string;
  keys: string[];
  districts: LegacyDistrict[];
}
interface MappingOut {
  /** old province key -> new province key(s) */
  provinces: Record<string, string>;
  /** old ward code -> list of [newWardCode, isDefault] (divided wards have several) */
  wards: Record<string, Array<[string, boolean]>>;
  /** old district code (district-level units with no wards, e.g. huyện đảo) -> new ward code */
  districts: Record<string, string>;
  stats: Record<string, number>;
}

function typeOf(fullName: string, name: string): string {
  const t = fullName.slice(0, Math.max(0, fullName.length - name.length)).trim();
  return t || 'Xã';
}

async function buildProvinces() {
  const S = SOURCES.provinces;
  const units = parseJson<Array<Record<string, unknown>>>(
    await fetchText(S.repo, S.sha, S.files.units),
  );
  const meta = parseJson<Record<string, string>>(await fetchText(S.repo, S.sha, S.files.meta));
  const A = SOURCES.adminunits;
  const from2025 = parseJson<Record<string, Record<string, unknown>>>(
    await fetchText(A.repo, A.sha, A.files.from2025),
  );

  const provKeywordsByCode = new Map<string, string[]>();
  for (const v of Object.values(
    from2025.DICT_PROVINCE as Record<string, Record<string, unknown>>,
  )) {
    provKeywordsByCode.set(String(v.provinceCode), v.provinceKeywords as string[]);
  }
  const wardKeywordsByCode = new Map<string, string[]>();
  const dicts = [
    from2025.DICT_PROVINCE_WARD_NO_ACCENTED,
    from2025.DICT_PROVINCE_WARD_ACCENTED,
    from2025.DICT_PROVINCE_WARD_SHORT_ACCENTED,
  ];
  for (const dict of dicts as Array<Record<string, Record<string, Record<string, unknown>>>>) {
    for (const wards of Object.values(dict)) {
      for (const w of Object.values(wards)) {
        const code = String(w.wardCode);
        const kws = (w.wardKeywords as string[]) ?? [];
        wardKeywordsByCode.set(code, [
          ...new Set([...(wardKeywordsByCode.get(code) ?? []), ...kws]),
        ]);
      }
    }
  }

  let joinedWards = 0;
  const provinces: ProvinceOut[] = units.map((p) => {
    const fullName = String(p.FullName);
    const name = String(p.Name);
    const code = String(p.Code);
    const key = compactKey(fullName);
    const keys = new Set<string>([compactKey(name), ...(provKeywordsByCode.get(code) ?? [])]);
    keys.delete(key);
    const wardsRaw = p.Wards as Array<Record<string, unknown>>;
    // ambiguity: same compact key for different wards in the same province -> add accented keys
    const compactCounts = new Map<string, number>();
    for (const w of wardsRaw) {
      const k = compactKey(String(w.FullName));
      compactCounts.set(k, (compactCounts.get(k) ?? 0) + 1);
    }
    const wards: WardOut[] = wardsRaw.map((w) => {
      const wFull = String(w.FullName);
      const wName = String(w.Name);
      const wCode = String(w.Code);
      const wKey = compactKey(wFull);
      const upstream = wardKeywordsByCode.get(wCode);
      if (upstream) joinedWards++;
      const wKeys = new Set<string>([compactKey(wName), ...(upstream ?? [])]);
      if ((compactCounts.get(wKey) ?? 0) > 1) {
        wKeys.add(accentedKey(wFull));
        wKeys.add(accentedKey(wName));
      }
      wKeys.delete(wKey);
      return {
        code: wCode,
        name: wName,
        fullName: wFull,
        nameEn: w.NameEn ? String(w.NameEn) : undefined,
        type: typeOf(wFull, wName),
        key: wKey,
        keys: [...wKeys],
        postalCode: w.PostalCode ? String(w.PostalCode) : undefined,
      };
    });
    return {
      code,
      name,
      fullName,
      nameEn: p.NameEn ? String(p.NameEn) : undefined,
      type: typeOf(fullName, name),
      key,
      keys: [...keys],
      postalPrefix: p.PostalCodePrefix ? String(p.PostalCodePrefix) : undefined,
      wards,
    };
  });
  const totalWards = provinces.reduce((n, p) => n + p.wards.length, 0);
  return {
    out: {
      version: meta.DatasetVersion,
      decree: meta.LatestDecree,
      generatedAt: meta.GeneratedAt,
      provinces,
    },
    stats: {
      provinces: provinces.length,
      wards: totalWards,
      wardsWithUpstreamKeywords: joinedWards,
    },
  };
}

async function buildLegacy() {
  const A = SOURCES.adminunits;
  const legacy = parseJson<Record<string, Record<string, unknown>>>(
    await fetchText(A.repo, A.sha, A.files.legacy),
  );
  const provDict = legacy.DICT_PROVINCE as Record<string, Record<string, unknown>>;
  const distDict = legacy.DICT_PROVINCE_DISTRICT as Record<
    string,
    Record<string, Record<string, unknown>>
  >;
  const wardDicts = [
    legacy.DICT_PROVINCE_DISTRICT_WARD_NO_ACCENTED,
    legacy.DICT_PROVINCE_DISTRICT_WARD_ACCENTED,
    legacy.DICT_PROVINCE_DISTRICT_WARD_SHORT_ACCENTED,
  ] as Array<Record<string, Record<string, Record<string, Record<string, unknown>>>>>;

  const provinces: LegacyProvince[] = [];
  for (const [pKey, p] of Object.entries(provDict)) {
    const districts: LegacyDistrict[] = [];
    for (const [dKey, d] of Object.entries(distDict[pKey] ?? {})) {
      const wardMap = new Map<string, LegacyWard>();
      for (const dict of wardDicts) {
        for (const [wKeyRaw, w] of Object.entries(dict[pKey]?.[dKey] ?? {})) {
          if (w.ward === null || w.ward === undefined) continue; // district-level unit without wards
          const code = String(w.wardCode);
          const fullName = String(w.ward);
          const key = compactKey(fullName);
          const existing = wardMap.get(code);
          const kws = new Set<string>([
            ...(existing?.keys ?? []),
            compactKey(String(w.wardShort)),
            ...((w.wardKeywords as string[]) ?? []),
          ]);
          if (wKeyRaw !== key) kws.add(wKeyRaw);
          kws.delete(key);
          wardMap.set(code, {
            code,
            name: String(w.wardShort),
            fullName,
            type: String(w.wardType),
            key,
            keys: [...kws],
          });
        }
      }
      const dFull = String(d.district);
      const dk = compactKey(dFull);
      const dKeys = new Set<string>([
        compactKey(String(d.districtShort)),
        ...((d.districtKeywords as string[]) ?? []),
      ]);
      if (dKey !== dk) dKeys.add(dKey);
      dKeys.delete(dk);
      districts.push({
        code: String(d.districtCode),
        name: String(d.districtShort),
        fullName: dFull,
        type: String(d.districtType),
        key: dk,
        keys: [...dKeys],
        wards: [...wardMap.values()].sort((a, b) => a.code.localeCompare(b.code)),
      });
    }
    const pFull = String(p.province);
    const pk = compactKey(pFull);
    const pKeys = new Set<string>([
      compactKey(String(p.provinceShort)),
      ...((p.provinceKeywords as string[]) ?? []),
    ]);
    if (pKey !== pk) pKeys.add(pKey);
    pKeys.delete(pk);
    provinces.push({
      code: String(p.provinceCode),
      name: String(p.provinceShort),
      fullName: pFull,
      type: typeOf(pFull, String(p.provinceShort)),
      key: pk,
      keys: [...pKeys],
      districts: districts.sort((a, b) => a.code.localeCompare(b.code)),
    });
  }
  provinces.sort((a, b) => a.code.localeCompare(b.code));
  const nd = provinces.reduce((n, p) => n + p.districts.length, 0);
  const nw = provinces.reduce((n, p) => n + p.districts.reduce((m, d) => m + d.wards.length, 0), 0);
  return { out: { provinces }, stats: { provinces: provinces.length, districts: nd, wards: nw } };
}

async function buildMapping(provinces2025: ProvinceOut[], legacy: LegacyProvince[]) {
  const A = SOURCES.adminunits;
  const conv = parseJson<Record<string, Record<string, unknown>>>(
    await fetchText(A.repo, A.sha, A.files.converter),
  );
  const from2025 = parseJson<Record<string, Record<string, unknown>>>(
    await fetchText(A.repo, A.sha, A.files.from2025),
  );

  // upstream new-province key -> code (upstream keys predate the 2026 "Thành phố" renames)
  const upstreamProvCode = new Map<string, string>();
  for (const [k, v] of Object.entries(
    from2025.DICT_PROVINCE as Record<string, Record<string, unknown>>,
  )) {
    upstreamProvCode.set(k, String(v.provinceCode));
  }
  // upstream (provinceKey, wardKey) -> wardCode
  const upstreamWardCode = new Map<string, string>();
  for (const dict of [
    from2025.DICT_PROVINCE_WARD_NO_ACCENTED,
    from2025.DICT_PROVINCE_WARD_ACCENTED,
    from2025.DICT_PROVINCE_WARD_SHORT_ACCENTED,
  ] as Array<Record<string, Record<string, Record<string, unknown>>>>) {
    for (const [pk, wards] of Object.entries(dict)) {
      for (const [wk, w] of Object.entries(wards))
        upstreamWardCode.set(`${pk}|${wk}`, String(w.wardCode));
    }
  }
  const canonicalWardCodes = new Set(provinces2025.flatMap((p) => p.wards.map((w) => w.code)));
  const canonicalProvByCode = new Map(provinces2025.map((p) => [p.code, p]));

  // legacy (provinceKey, districtKey, wardKey) -> codes
  const legacyWard = new Map<string, string>();
  const legacyDistrict = new Map<string, string>();
  const legacyProvinceCode = new Map<string, string>();
  for (const p of legacy) {
    legacyProvinceCode.set(p.key, p.code);
    for (const d of p.districts) {
      legacyDistrict.set(`${p.key}|${d.key}`, d.code);
      for (const k of d.keys) legacyDistrict.set(`${p.key}|${k}`, d.code);
      for (const w of d.wards) {
        legacyWard.set(`${p.key}|${d.key}|${w.key}`, w.code);
        for (const k of w.keys) legacyWard.set(`${p.key}|${d.key}|${k}`, w.code);
      }
    }
  }

  const mapping: MappingOut = { provinces: {}, wards: {}, districts: {}, stats: {} };
  let unresolvedOld = 0;
  let unresolvedNew = 0;
  let total = 0;
  const unresolvedSamples: string[] = [];

  for (const [newPk, oldPks] of Object.entries(conv.DICT_PROVINCE as Record<string, string[]>)) {
    const newCode = upstreamProvCode.get(newPk);
    const canon = newCode ? canonicalProvByCode.get(newCode) : undefined;
    if (!canon) throw new Error(`Cannot resolve new province ${newPk}`);
    for (const oldPk of oldPks) mapping.provinces[oldPk] = canon.key;
  }

  const addWard = (oldKey: string, newPk: string, newWk: string, isDefault: boolean) => {
    total++;
    const [op, od, ow] = oldKey.split('_');
    const newCode = upstreamWardCode.get(`${newPk}|${newWk}`);
    if (!newCode || !canonicalWardCodes.has(newCode)) {
      unresolvedNew++;
      if (unresolvedSamples.length < 10) unresolvedSamples.push(`new ${newPk}/${newWk}`);
      return;
    }
    if (!ow) {
      const dCode = legacyDistrict.get(`${op}|${od}`);
      if (!dCode) {
        unresolvedOld++;
        return;
      }
      mapping.districts[dCode] = newCode;
      return;
    }
    const oldCode = legacyWard.get(`${op}|${od}|${ow}`);
    if (!oldCode) {
      unresolvedOld++;
      if (unresolvedSamples.length < 10) unresolvedSamples.push(`old ${oldKey}`);
      return;
    }
    const list = mapping.wards[oldCode] ?? (mapping.wards[oldCode] = []);
    if (!list.some(([c]) => c === newCode)) list.push([newCode, isDefault]);
  };

  for (const [newPk, wards] of Object.entries(
    conv.DICT_PROVINCE_WARD_NO_DIVIDED as Record<string, Record<string, string[]>>,
  )) {
    for (const [newWk, oldKeys] of Object.entries(wards)) {
      for (const oldKey of oldKeys) addWard(oldKey, newPk, newWk, true);
    }
  }
  for (const [newPk, olds] of Object.entries(
    conv.DICT_PROVINCE_WARD_DIVIDED as Record<
      string,
      Record<string, Array<Record<string, unknown>>>
    >,
  )) {
    for (const [oldKey, targets] of Object.entries(olds)) {
      // divided: the non-divided dict already holds the default target; add the others
      for (const t of targets)
        addWard(oldKey, newPk, String(t.newWardKey), Boolean(t.isDefaultNewWard));
    }
  }
  // ensure exactly one default per old ward
  for (const list of Object.values(mapping.wards)) {
    if (!list.some(([, d]) => d)) list[0]![1] = true;
  }
  const divided = Object.values(mapping.wards).filter((l) => l.length > 1).length;
  mapping.stats = {
    oldWardsMapped: Object.keys(mapping.wards).length,
    dividedOldWards: divided,
    districtLevelMapped: Object.keys(mapping.districts).length,
    mappingEntries: total,
    unresolvedOld,
    unresolvedNew,
  };
  if (unresolvedSamples.length)
    process.stderr.write(`unresolved samples: ${unresolvedSamples.join('; ')}\n`);
  return { out: mapping, stats: mapping.stats };
}

async function buildBanks() {
  const S = SOURCES.banks;
  const src = await fetchText(S.repo, S.sha, S.files.banks);
  const codesSrc = await fetchText(S.repo, S.sha, S.files.codes);
  const codes = new Map([...codesSrc.matchAll(/(\w+) = '([^']+)'/g)].map((m) => [m[1]!, m[2]!]));
  const statusMap: Record<string, string> = {
    TRANSFER_SUPPORTED: 'transfer',
    RECEIVE_ONLY: 'receive',
    NOT_SUPPORTED: 'none',
  };
  const banks: Array<Record<string, unknown>> = [];
  for (const m of src.matchAll(/\[BankKey\.(\w+)\]: \{([\s\S]*?)\n {2}\}/g)) {
    const body = m[2]!;
    const g = (f: string) => body.match(new RegExp(`${f}: '([^']*)'`))?.[1];
    const codeKey = body.match(/code: BankCode\.(\w+)/)?.[1] ?? m[1]!;
    const status = body.match(/vietQRStatus: VietQRStatus\.(\w+)/)?.[1] ?? 'NOT_SUPPORTED';
    const bin = g('bin');
    if (!bin) continue;
    const keywords = (g('keywords') ?? '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    const b: Record<string, unknown> = {
      bin,
      code: codes.get(codeKey) ?? codeKey,
      shortName: g('shortName'),
      name: g('name'),
      swift: g('swiftCode') || undefined,
      vietqr: statusMap[status],
      keywords: keywords.length ? keywords : undefined,
      deprecated: body.includes('deprecated: true') ? true : undefined,
    };
    banks.push(Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined)));
  }
  const byBin = new Map<string, Record<string, unknown>>();
  for (const b of banks) {
    const cur = byBin.get(b.bin as string);
    if (!cur || (cur.deprecated && !b.deprecated)) byBin.set(b.bin as string, b);
  }
  const out = [...byBin.values()].sort((a, b) => String(a.bin).localeCompare(String(b.bin)));
  return { out, stats: { banks: out.length } };
}

/** Compact JSON (one line) keeps the bundle small; `banks.json` stays pretty for easy review. */
function stable(obj: unknown, pretty = false): string {
  return JSON.stringify(obj, null, pretty ? 1 : 0) + '\n';
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  const provinces = await buildProvinces();
  const legacy = await buildLegacy();
  const mapping = await buildMapping(provinces.out.provinces, legacy.out.provinces);
  const banks = await buildBanks();

  const files: Record<string, string> = {
    'provinces-2025.json': stable(provinces.out),
    'legacy-63.json': stable(legacy.out),
    'mapping-old-new.json': stable(mapping.out),
    'banks.json': stable(banks.out, true),
  };
  const today = new Date().toISOString().slice(0, 10);
  const sha256 = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);
  const sources = `# Data sources

Generated by \`scripts/build-data.ts\`. Do not edit the JSON files by hand; bump a pinned commit and re-run \`pnpm build-data\`.
All upstream datasets are MIT-licensed; this package redistributes normalised derivatives with attribution.

| File | Upstream | Commit | License | Records |
|---|---|---|---|---|
| provinces-2025.json | [${SOURCES.provinces.repo}](https://github.com/${SOURCES.provinces.repo}) + keywords from [${SOURCES.adminunits.repo}](https://github.com/${SOURCES.adminunits.repo}) | \`${SOURCES.provinces.sha.slice(0, 7)}\` / \`${SOURCES.adminunits.sha.slice(0, 7)}\` | MIT | ${provinces.stats.provinces} provinces, ${provinces.stats.wards} wards (${provinces.stats.wardsWithUpstreamKeywords} with upstream keywords) |
| legacy-63.json | [${SOURCES.adminunits.repo}](https://github.com/${SOURCES.adminunits.repo}) | \`${SOURCES.adminunits.sha.slice(0, 7)}\` | MIT | ${legacy.stats.provinces} provinces, ${legacy.stats.districts} districts, ${legacy.stats.wards} wards |
| mapping-old-new.json | [${SOURCES.adminunits.repo}](https://github.com/${SOURCES.adminunits.repo}) | \`${SOURCES.adminunits.sha.slice(0, 7)}\` | MIT | ${mapping.stats.oldWardsMapped} old wards mapped (${mapping.stats.dividedOldWards} divided), ${mapping.stats.districtLevelMapped} district-level units; unresolved old=${mapping.stats.unresolvedOld}, new=${mapping.stats.unresolvedNew} |
| banks.json | [${SOURCES.banks.repo}](https://github.com/${SOURCES.banks.repo}) | \`${SOURCES.banks.sha.slice(0, 7)}\` | MIT | ${banks.stats.banks} banks |

Upstream dataset version for provinces-2025.json: **${provinces.out.version}** (latest decree ${provinces.out.decree}, generated ${provinces.out.generatedAt}).
Upstream data originates from the National Statistics Office (danhmuchanhchinh.nso.gov.vn) and the national boundary portal (sapnhap.bando.com.vn).

Last refreshed: ${today}

## Notes
- ${SOURCES.provinces.note}
- ${SOURCES.adminunits.note}
- ${SOURCES.banks.note}
- Three provinces (Bắc Ninh, Quảng Ninh, Đồng Nai) became centrally-run cities after the mapping dataset was published; the mapping is joined by GSO code so it survives the rename.
- Divided old wards keep every new candidate; exactly one is flagged default. Street-level disambiguation is not attempted.
- Checksums (sha256, first 16 hex): ${Object.entries(files)
    .map(([f, c]) => `${f}=${sha256(c)}`)
    .join(', ')}
`;
  files['SOURCES.md'] = sources;

  if (CHECK) {
    let dirty = false;
    for (const [name, content] of Object.entries(files)) {
      if (name === 'SOURCES.md') continue; // contains the refresh date
      const path = join(DATA_DIR, name);
      const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
      if (current !== content) {
        dirty = true;
        process.stderr.write(`DIFFERS: ${name}\n`);
      }
    }
    if (dirty) {
      process.stderr.write('Committed data is out of date. Run `pnpm build-data`.\n');
      process.exit(1);
    }
    process.stdout.write('Data is up to date.\n');
    return;
  }
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(DATA_DIR, name), content);
    process.stdout.write(`wrote ${name} (${(content.length / 1024).toFixed(0)} KB)\n`);
  }
  process.stdout.write(
    JSON.stringify(
      {
        provinces: provinces.stats,
        legacy: legacy.stats,
        mapping: mapping.stats,
        banks: banks.stats,
      },
      null,
      2,
    ) + '\n',
  );
}

main().catch((err) => {
  process.stderr.write(
    `build-data failed: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(1);
});
