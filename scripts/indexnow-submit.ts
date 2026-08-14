// 一次性把 sitemap 里的全部 URL 提交到 IndexNow（Bing 收录提速）。
// 用法：部署完成后执行 `node scripts/indexnow-submit.ts`（node >= 24 直接跑 TS）。
// key 文件已随 website 构建发布：https://muicv.com/bc2eb41d1912423a92517feef62292e5.txt

const KEY = 'bc2eb41d1912423a92517feef62292e5';
const SITE = 'https://muicv.com';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

async function main() {
  const res = await fetch(`${SITE}/sitemap.xml`);
  if (!res.ok) {
    throw new Error(`sitemap 抓取失败：${res.status} ${res.statusText}`);
  }
  const sitemap = await res.text();
  const urlList = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1] ?? '');
  if (urlList.length === 0) {
    throw new Error('sitemap 里没有解析到任何 URL');
  }

  console.log(`提交 ${urlList.length} 个 URL 到 IndexNow…`);
  const submit = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: 'muicv.com',
      key: KEY,
      keyLocation: `${SITE}/${KEY}.txt`,
      urlList,
    }),
  });

  if (!submit.ok) {
    const body = await submit.text();
    throw new Error(`IndexNow 提交失败：${submit.status} ${submit.statusText}\n${body}`);
  }
  console.log(`IndexNow 已接受，共 ${urlList.length} 个 URL。`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
