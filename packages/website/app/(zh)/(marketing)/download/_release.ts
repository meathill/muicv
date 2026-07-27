// GitHub Releases 拉取 + 安装包分类逻辑。中英下载页共用，只有文案不同。

export const REPO = 'meathill/muicv';

export type GhAsset = {
  id: number;
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
};

export type GhRelease = {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  body: string;
  prerelease: boolean;
  assets: GhAsset[];
};

export async function fetchLatestRelease(): Promise<GhRelease | null> {
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'muicv-website',
  };
  // OpenNext 把 wrangler secret 暴露到 process.env；有 token 时把限流从 60/h 提到 5000/h
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers,
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.error(
        '[download] GitHub releases/latest failed',
        res.status,
        res.statusText,
        'x-ratelimit-remaining:',
        res.headers.get('x-ratelimit-remaining'),
      );
      return null;
    }
    return (await res.json()) as GhRelease;
  } catch (err) {
    console.error('[download] GitHub releases/latest threw', err);
    return null;
  }
}

export type ParsedAsset = {
  url: string;
  name: string;
  size: number;
  platform: 'mac' | 'win' | 'linux' | 'other';
  arch: 'arm64' | 'x64' | 'universal' | 'unknown';
  format: 'dmg' | 'zip' | 'exe' | 'AppImage' | 'deb' | 'other';
};

export function classifyAsset(asset: GhAsset): ParsedAsset {
  const n = asset.name.toLowerCase();
  let platform: ParsedAsset['platform'] = 'other';
  if (/(mac|darwin|osx)/.test(n) || /\.dmg$/.test(n)) platform = 'mac';
  else if (/win|setup|\.exe$/.test(n)) platform = 'win';
  else if (/(linux|appimage|deb)/.test(n)) platform = 'linux';

  let arch: ParsedAsset['arch'] = 'unknown';
  if (/arm64|aarch64|apple-silicon/.test(n)) arch = 'arm64';
  // electron-builder 给 Linux x64 用 `x86_64` 命名（glibc ABI 约定），
  // 与 `x64` 都需要识别成同一种 64-bit Intel/AMD 架构。
  else if (/x64|x86[_-]?64|intel|amd64/.test(n)) arch = 'x64';
  else if (/universal/.test(n)) arch = 'universal';
  // electron-builder 默认命名约定：mac 同时打 arm64+x64 时，arm64 带 -arm64 后缀，
  // x64 默认无 arch 后缀。所以 mac + 未识别 arch 兜底成 x64，不要丢弃。
  else if (platform === 'mac') arch = 'x64';

  let format: ParsedAsset['format'] = 'other';
  if (n.endsWith('.dmg')) format = 'dmg';
  else if (n.endsWith('.zip')) format = 'zip';
  else if (n.endsWith('.exe')) format = 'exe';
  else if (n.endsWith('.appimage')) format = 'AppImage';
  else if (n.endsWith('.deb')) format = 'deb';

  // electron-builder 给 mac 出的 zip 命名为 `MuiCV-<ver>-<arch>.zip`，不带 mac/darwin 字样。
  // 我们的构建链里 zip 仅用于 mac 自动更新，所以 zip + 已识别 arch 的兜底归到 mac。
  if (platform === 'other' && format === 'zip' && (arch === 'arm64' || arch === 'x64')) {
    platform = 'mac';
  }

  return {
    url: asset.browser_download_url,
    name: asset.name,
    size: asset.size,
    platform,
    arch,
    format,
  };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
