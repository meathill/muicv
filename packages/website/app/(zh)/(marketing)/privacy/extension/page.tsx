import type { Metadata } from 'next';

import { H2, H3, Lead, Li, P, UL } from '../../_legal-typography';
import { soloPageMetadata } from '../../_page-meta';
import { Footer } from '../../_sections/footer';
import { Header } from '../../_sections/header';

/**
 * 浏览器扩展隐私说明（中英双语），供 Chrome Web Store / Edge Add-ons / Firefox AMO 的隐私政策链接使用。
 * 与 /privacy 主政策一致；这里只写扩展特有的数据处理。
 */

export const metadata: Metadata = soloPageMetadata({
  path: '/privacy/extension',
  title: '浏览器扩展隐私说明 · Browser Extension Privacy',
  description:
    'Mui简历浏览器扩展收集什么、发送到哪里、如何删除。What the Mui Resume browser extension collects and why.',
});

export const revalidate = 604800;

const EFFECTIVE_DATE = '2026-10-21';

export default function ExtensionPrivacyPage() {
  return (
    <div className="relative">
      <Header />

      <section className="relative overflow-hidden border-b border-rule">
        <div className="absolute inset-0 bg-sun" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— 法律 · Legal</p>
          <h1 className="mt-3 text-[clamp(2rem,4.5vw,3rem)] font-extrabold leading-[1.1] tracking-tight text-ink">
            浏览器扩展隐私说明
            <br />
            Browser Extension Privacy
          </h1>
          <p className="mt-5 font-mono text-[12px] uppercase tracking-wider text-mute">
            生效日期 / Effective: {EFFECTIVE_DATE}
          </p>
        </div>
      </section>

      <article className="border-b border-rule">
        <div className="prose-legal mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
          <Lead>
            「Mui简历 · 岗位收藏」扩展只做一件事：在你点击扩展图标时，把当前网页上的招聘信息提交到你的 Mui简历岗位库。
            本说明是 <a href="/privacy">Mui简历隐私政策</a> 的补充。
          </Lead>

          <H2>1. 什么时候读取页面</H2>
          <P>
            扩展只申请 <code>activeTab</code>、<code>scripting</code> 和 <code>storage</code>{' '}
            权限，没有任何「读取所有网站」权限，
            也不在后台运行。只有你在某个标签页上点开扩展弹窗时，才会读取这一个标签页。
          </P>

          <H2>2. 发送什么</H2>
          <UL>
            <Li>页面正文（用 Readability 提取的主要内容，转成 Markdown，最多约 2 万字符）、页面标题与网址；</Li>
            <Li>页面里的 schema.org JobPosting 结构化数据（如果有）；</Li>
            <Li>页面上的外链列表（网址和链接文字，最多 200 条），用于找到岗位详情页；</Li>
            <Li>你选择的可见性（公共岗位池 / 私藏）和你的 muicv API key（用于鉴权）。</Li>
          </UL>
          <P>
            不发送整页 HTML、Cookie、表单内容、浏览历史，也不读取其它标签页。数据只发往 <code>api.muicv.com</code>。
          </P>

          <H2>3. 如何使用</H2>
          <UL>
            <Li>识别页面里是否有岗位，并提取职位、公司、地点与地域限制（可能调用 Cloudflare Workers AI）；</Li>
            <Li>必要时由服务器抓取最多 3 个页面里出现的岗位详情链接；</Li>
            <Li>公共岗位池：岗位信息公开展示在 muicv.com/jobs，并记录贡献者用于发放奖励（不公开展示你的身份）；</Li>
            <Li>私藏：只保存在你的账号下，不进入公开搜索；</Li>
            <Li>按计费规则扣费或发放奖励，并记录在你的 token 流水中。</Li>
          </UL>
          <P>我们不出售数据，不用于广告，也不用这些内容训练模型。</P>

          <H2>4. 本机存储</H2>
          <P>
            API key、你上次选择的可见性和尚未完成的提交编号保存在浏览器的 <code>chrome.storage.local</code>，只在本机。
            卸载扩展即删除。
          </P>

          <H2>5. 保留与删除</H2>
          <P>
            提交记录与私藏岗位随账号保留；你可以随时在 muicv.com 撤销 API key，或发邮件到{' '}
            <a href="mailto:hi@muicv.com">hi@muicv.com</a> 要求删除你的提交与私藏数据。外链抓取缓存 6 小时后失效。
          </P>

          <hr className="my-12 border-rule" />

          <H2>English</H2>
          <H3>When the extension reads a page</H3>
          <P>
            The extension requests only <code>activeTab</code>, <code>scripting</code> and <code>storage</code>. It has
            no access to all websites and does not run in the background. It reads the current tab only when you open
            the extension popup on it.
          </P>
          <H3>What is sent</H3>
          <UL>
            <Li>
              The page&apos;s main content (extracted with Readability, converted to Markdown, capped at ~20,000
              characters), its title and URL;
            </Li>
            <Li>schema.org JobPosting structured data on the page, if any;</Li>
            <Li>The list of outbound links (URL and link text, up to 200), used to find job detail pages;</Li>
            <Li>Your chosen visibility (public pool / private) and your muicv API key for authentication.</Li>
          </UL>
          <P>
            We never send the full HTML, cookies, form data or browsing history, and never read other tabs. Data is sent
            only to <code>api.muicv.com</code>.
          </P>
          <H3>How it is used</H3>
          <P>
            To detect job postings and extract title, company, location and location restrictions (possibly using
            Cloudflare Workers AI); to fetch up to 3 job-detail links found on the page; to publish public submissions
            on muicv.com/jobs (your identity is not shown) or keep private saves in your account only; and to apply
            charges or rewards to your token ledger. We do not sell the data, use it for ads, or train models on it.
          </P>
          <H3>Local storage, retention and deletion</H3>
          <P>
            Your API key, last visibility choice and pending submission ids live in <code>chrome.storage.local</code> on
            your device and are removed when you uninstall. Submissions and private saves stay with your account; revoke
            your API key at muicv.com at any time, or email <a href="mailto:hi@muicv.com">hi@muicv.com</a> to delete
            them. Link-fetch cache expires after 6 hours.
          </P>
        </div>
      </article>

      <Footer />
    </div>
  );
}
