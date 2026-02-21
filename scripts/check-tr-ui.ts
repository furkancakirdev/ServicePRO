import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

type Finding = {
  file: string;
  line: number;
  rule: string;
  text: string;
};

const ROOT = process.cwd();

const TARGET_PATHS = [
  'app/layout.tsx',
  'app/page.tsx',
  'app/operasyon',
  'app/is-emirleri',
  'app/servisler',
  'app/jobs',
  'app/talepler',
  'app/leads',
  'app/takvim',
  'app/calls',
  'app/dispatch',
  'app/pricebook',
  'app/templates',
  'app/services',
  'app/ayarlar',
  'app/tekneler',
  'app/personel',
  'app/notifications',
  'components/layout',
  'components/is-emirleri',
  'components/talepler',
  'components/takvim',
  'components/notifications',
  'components/ui/page-task-hint-bar.tsx',
] as const;

const FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mdx']);
const EXCLUDED_SEGMENTS = new Set([
  'node_modules',
  '.next',
  'dist',
  'docs',
  'prisma',
  'public',
]);

const ENGLISH_BLACKLIST = [
  'Job',
  'Jobs',
  'Call',
  'Calls',
  'Lead',
  'Leads',
  'Dispatch',
  'Today',
  'Technician',
  'Queue',
  'Template',
  'Pricebook',
  'Lane',
  'Notification',
  'Alert',
  'Admin',
  'Profile',
  'Comfortable',
  'Compact',
];

const ASCII_TURKISH_MAP: Record<string, string> = {
  Gun: 'Gün',
  Is: 'İş',
  Isim: 'İsim',
  Tum: 'Tüm',
  Onceki: 'Önceki',
  Planlanmamis: 'Planlanmamış',
  Aciklama: 'Açıklama',
  Donustur: 'Dönüştür',
  Don: 'Dön',
  Yukleniyor: 'Yükleniyor',
  Yuksek: 'Yüksek',
  Dusuk: 'Düşük',
  Gecmis: 'Geçmiş',
  Arsiv: 'Arşiv',
  Musait: 'Müsait',
  Yogun: 'Yoğun',
  Baslik: 'Başlık',
  Kayit: 'Kayıt',
  Olustur: 'Oluştur',
  Ac: 'Aç',
  Dis: 'Dış',
};

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const MOJIBAKE = /Ã|Ä|Å|�/;

function shouldSkipLine(line: string): boolean {
  return (
    /^\s*import\s/.test(line) ||
    /^\s*export\s+\{\s*default\s+\}\s+from\s+['"]/.test(line) ||
    /data-testid=/.test(line) ||
    /entityTipi:\s*['"]/.test(line) ||
    /pathname\.startsWith\(\s*['"]\//.test(line) ||
    /redirect\(\s*['"]\//.test(line) ||
    /permanentRedirect\(\s*['"]\//.test(line) ||
    /router\.push\(\s*['"]\//.test(line) ||
    /\/api\//.test(line) ||
    /from\s+['"][^'"]+['"]/.test(line) ||
    /href:\s*['"]\//.test(line) ||
    /path:\s*['"]\//.test(line) ||
    /source:\s*['"]\//.test(line) ||
    /destination:\s*['"]\//.test(line)
  );
}

function isCodeLikeLiteral(value: string): boolean {
  const text = value.trim();
  if (!text) return true;
  if (text.startsWith('/')) return true;
  if (/^[A-Z0-9_]+$/.test(text)) return true;
  if (/^[a-z0-9_/-]+$/.test(text)) return true;
  if (text.includes('-') && !text.includes(' ')) return true;
  if (/^[a-z][a-z0-9]*$/.test(text)) return true;
  if (text.includes('${')) return true;
  return false;
}

function extractStringLiterals(line: string): string[] {
  const literals: string[] = [];
  const regex = /'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"|`([^`\\]*(?:\\.[^`\\]*)*)`/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    const literal = match[1] ?? match[2] ?? match[3] ?? '';
    literals.push(literal);
  }
  return literals;
}

function extractJsxText(line: string): string[] {
  const texts: string[] = [];
  const regex = />\s*([^<>{][^<>{}]*)\s*</g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    const raw = (match[1] ?? '').trim();
    if (!raw) continue;
    texts.push(raw);
  }
  return texts;
}

function isTargetFile(pathname: string): boolean {
  return FILE_EXTENSIONS.has(extname(pathname));
}

function walk(pathname: string, list: string[]): void {
  const stat = statSync(pathname);
  if (stat.isFile()) {
    if (isTargetFile(pathname)) {
      list.push(pathname);
    }
    return;
  }

  for (const entry of readdirSync(pathname)) {
    if (EXCLUDED_SEGMENTS.has(entry)) continue;
    walk(join(pathname, entry), list);
  }
}

function collectFiles(): string[] {
  const files: string[] = [];
  for (const target of TARGET_PATHS) {
    const full = join(ROOT, target);
    if (!existsSync(full)) continue;
    walk(full, files);
  }
  return Array.from(new Set(files));
}

function addFinding(
  findings: Finding[],
  file: string,
  line: number,
  rule: string,
  text: string
): void {
  findings.push({
    file: relative(ROOT, file).split(sep).join('/'),
    line,
    rule,
    text: text.trim(),
  });
}

function runChecks(file: string, findings: Finding[]): void {
  const buffer = readFileSync(file);
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(BOM)) {
    addFinding(findings, file, 1, 'BOM', 'Dosya UTF-8 BOM içeriyor.');
  }

  const text = buffer.toString('utf8');
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (shouldSkipLine(line)) continue;

    if (MOJIBAKE.test(line)) {
      addFinding(findings, file, i + 1, 'MOJIBAKE', line);
    }

    if (/\.toUpperCase\(/.test(line)) {
      addFinding(
        findings,
        file,
        i + 1,
        'BUYUK_HARF_TR',
        `${line.trim()} -> Öneri: toLocaleUpperCase('tr-TR')`
      );
    }

    const candidates = [...extractStringLiterals(line), ...extractJsxText(line)];
    for (const literal of candidates) {
      if (isCodeLikeLiteral(literal)) continue;

      for (const word of ENGLISH_BLACKLIST) {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (regex.test(literal)) {
          addFinding(findings, file, i + 1, `İNGİLİZCE:${word}`, line);
        }
      }

      for (const [asciiWord, turkishWord] of Object.entries(ASCII_TURKISH_MAP)) {
        const regex = new RegExp(`\\b${asciiWord}\\b`, 'i');
        if (regex.test(literal)) {
          addFinding(
            findings,
            file,
            i + 1,
            `ASCII_TÜRKÇE:${asciiWord}`,
            `${line.trim()} -> Öneri: ${turkishWord}`
          );
        }
      }
    }
  }
}

function main(): void {
  const files = collectFiles();
  const findings: Finding[] = [];

  for (const file of files) {
    runChecks(file, findings);
  }

  if (findings.length === 0) {
    console.log(`TR UI denetimi başarılı. ${files.length} dosya kontrol edildi.`);
    return;
  }

  console.error(`TR UI denetimi başarısız. ${findings.length} sorun bulundu.\n`);
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} [${finding.rule}] ${finding.text}`);
  }

  process.exit(1);
}

main();
