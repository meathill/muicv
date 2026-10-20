import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/**
 * 商店素材：用 headless Chrome 把真实 popup（dist/popup.html 的预览模式 + mock 数据）嵌进浏览器窗口样机里截图。
 *   node scripts/store-assets.ts   （先 pnpm build）
 * 输出 store/assets/<locale>/screenshot-1..5.png（1280×800）、promo-small-440x280.png、promo-marquee-1400x560.png
 */

type Caption = {
  brand: string;
  c1: string[];
  c2: string[];
  c3: string[];
  c4: string[];
  c5: string[];
  promo: string;
  marquee: string[];
};

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const out = resolve(root, 'store', 'assets');
const tmp = resolve(root, '.store-tmp');
const chrome = process.env.CHROME_BIN ?? 'google-chrome';
const captions = JSON.parse(await readFile(resolve(import.meta.dirname, 'store-captions.json'), 'utf8')) as Record<
  string,
  Caption
>;

const FONT = `"Nunito","PingFang SC","Noto Sans CJK SC","Noto Sans CJK JP","Noto Sans Thai",sans-serif`;
const BASE_CSS = `*{box-sizing:border-box}body{margin:0;font-family:${FONT};color:#3a2e23}`;

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

function popupSrc(state: string, locale: string): string {
  return `file://${dist}/popup.html?state=${state}&lang=${locale}`;
}

/** 背景页：示意的招聘信息流（不是真实网站截图）。 */
function fakePage(zh: boolean): string {
  const posts = zh
    ? [
        '招聘｜高级前端工程师（Vue），远程，限欧洲时区',
        '我们在招 Go 后端工程师，全球远程',
        '资深产品设计师，远程（仅限美国）',
        '平台工程师，混合办公 · 柏林',
      ]
    : [
        'Hiring: Senior Frontend Engineer (Vue), remote, Europe time zones',
        "We're hiring a Backend Engineer (Go) — remote, worldwide",
        'Staff Product Designer, remote (US only)',
        'Platform Engineer, hybrid · Berlin',
      ];
  return `<div class="feed">${posts
    .map(
      (p, i) =>
        `<div class="post"><div class="avatar a${i}"></div><div><p class="who">Remote Jobs Weekly <span>@remotejobsweekly · ${i + 1}h</span></p><p>${esc(p)}</p><p class="link">→ jobs.example.com/${i + 1}</p></div></div>`,
    )
    .join('')}</div>`;
}

function browserFrame(opts: { url: string; state: string; locale: string; height: number; width: number }): string {
  const zh = opts.locale.startsWith('zh');
  return `<div class="win" style="width:${opts.width}px;height:${opts.height}px">
    <div class="tabs"><span class="dots"><i></i><i></i><i></i></span><span class="tab">${esc(zh ? '远程岗位周刊 / X' : 'Remote Jobs Weekly / X')}</span></div>
    <div class="bar"><span class="url">${esc(opts.url)}</span><img class="ext" src="file://${dist}/icons/icon-32.png"></div>
    <div class="body">${fakePage(zh)}
      <iframe class="popup" src="${popupSrc(opts.state, opts.locale)}"></iframe>
    </div>
  </div>`;
}

const FRAME_CSS = `
.win{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 24px 60px rgba(58,46,35,.28);border:2px solid #3a2e23;position:relative}
.tabs{height:40px;background:#efe5cf;display:flex;align-items:flex-end;gap:12px;padding:0 12px}
.dots{display:flex;gap:6px;align-self:center}.dots i{width:12px;height:12px;border-radius:50%;background:#e8863a;display:block}.dots i+i{background:#e6c34a}.dots i+i+i{background:#9cb87a}
.tab{background:#fff;border-radius:10px 10px 0 0;padding:8px 16px;font-size:14px;max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bar{height:44px;display:flex;align-items:center;gap:12px;padding:0 12px;border-bottom:1px solid #eee3cc}
.url{flex:1;background:#f6f0e2;border-radius:10px;padding:6px 14px;font-size:14px;color:#766852}
.ext{width:24px;height:24px;border-radius:6px;outline:3px solid #e6c34a}
.body{position:relative;height:calc(100% - 84px);background:#fbfaf7}
.feed{width:560px;margin:0 0 0 48px;padding-top:16px}
.post{display:flex;gap:12px;padding:16px;border-bottom:1px solid #eee}.post p{margin:0 0 4px;font-size:15px}
.who{font-weight:800}.who span{font-weight:400;color:#8b8b8b}.link{color:#1d6fb8}
.avatar{width:40px;height:40px;border-radius:50%;background:#3a2e23;flex:none}.a1{background:#e8863a}.a2{background:#4f8a4b}.a3{background:#e6c34a}
.popup{position:absolute;top:4px;right:12px;width:360px;height:calc(100% - 16px);border:0;border-radius:10px;box-shadow:0 12px 32px rgba(58,46,35,.3);background:#fdfaf2}
`;

async function shoot(name: string, html: string, width: number, height: number): Promise<void> {
  const file = join(tmp, `${name.replace(/\//g, '_')}.html`);
  await writeFile(
    file,
    `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}${FRAME_CSS}</style></head><body>${html}</body></html>`,
  );
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--allow-file-access-from-files',
      '--force-device-scale-factor=1',
      `--window-size=${width},${height}`,
      '--virtual-time-budget=3000',
      `--screenshot=${join(out, name)}`,
      `file://${file}`,
    ],
    { stdio: 'ignore' },
  );
}

const SHOTS: Array<{ state: string; caption: keyof Caption; url: string }> = [
  { state: 'ready', caption: 'c1', url: 'x.com/remotejobsweekly' },
  { state: 'result', caption: 'c2', url: 'x.com/remotejobsweekly' },
  { state: 'private', caption: 'c3', url: 'jobs.ashbyhq.com/supabase/1f2e' },
  { state: 'queued', caption: 'c4', url: 'x.com/remotejobsweekly' },
  { state: 'key', caption: 'c5', url: 'muicv.com/dashboard' },
];

await rm(tmp, { recursive: true, force: true });
await mkdir(tmp, { recursive: true });

for (const [locale, cap] of Object.entries(captions)) {
  await mkdir(join(out, locale), { recursive: true });
  for (const [i, shot] of SHOTS.entries()) {
    const [title = '', sub = ''] = cap[shot.caption] as string[];
    const html = `<div style="width:1280px;height:800px;background:#f6ecd4;display:flex;flex-direction:column;align-items:center;padding-top:28px;gap:20px;overflow:hidden">
      <div style="text-align:center"><p style="margin:0;font-size:36px;font-weight:800">${esc(title)}</p><p style="margin:8px 0 0;font-size:20px;color:#766852">${esc(sub)}</p></div>
      ${browserFrame({ url: shot.url, state: shot.state, locale, width: 1120, height: 660 })}
    </div>`;
    await shoot(`${locale}/screenshot-${i + 1}.png`, html, 1280, 800);
  }
  const icon = `file://${resolve(root, 'store-assets', 'icon-256.png')}`;
  await shoot(
    `${locale}/promo-small-440x280.png`,
    `<div style="width:440px;height:280px;background:#e6c34a;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;border:0">
      <img src="${icon}" style="width:112px;height:112px">
      <p style="margin:0;font-size:28px;font-weight:800">${esc(cap.brand)}</p>
      <p style="margin:0;font-size:16px;font-weight:700;color:#5b4a35;padding:0 24px;text-align:center">${esc(cap.promo)}</p></div>`,
    440,
    280,
  );
  const [m1 = '', m2 = ''] = cap.marquee;
  await shoot(
    `${locale}/promo-marquee-1400x560.png`,
    `<div style="width:1400px;height:560px;background:#f6ecd4;display:flex;align-items:center;gap:56px;padding:0 96px;overflow:hidden">
      <div style="flex:1"><img src="${icon}" style="width:120px;height:120px"><p style="margin:24px 0 0;font-size:48px;font-weight:800;line-height:1.2">${esc(m1)}<br>${esc(m2)}</p>
      <p style="margin:16px 0 0;font-size:22px;color:#766852">${esc(cap.brand)} · muicv.com</p></div>
      <iframe src="${popupSrc('result', locale)}" style="width:360px;height:500px;border:0;border-radius:14px;box-shadow:0 24px 60px rgba(58,46,35,.3);background:#fdfaf2;margin-top:60px"></iframe></div>`,
    1400,
    560,
  );
  console.log(`rendered ${locale}`);
}
await rm(tmp, { recursive: true, force: true });
