import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseHTML } from 'linkedom';

import { capText, extractPage, jobPostingJsonLd, outboundLinks } from '../src/extract/page.ts';

const PARAS = Array.from(
  { length: 8 },
  (_, i) =>
    `<p>Paragraph ${i}: you will build delightful resume tooling with TypeScript and Go, owning features end to end.</p>`,
).join('');

function doc(body: string, head = ''): Document {
  return parseHTML(
    `<!doctype html><html><head><title>Senior Engineer - Acme</title>${head}</head><body>${body}</body></html>`,
  ).document as unknown as Document;
}

describe('页面抽取', () => {
  it('Readability 正文转 markdown，去掉导航和图片', () => {
    const d = doc(`<nav><a href="/">Home</a> | <a href="/about">About</a></nav>
      <article><h1>Senior Engineer</h1><h2>About the role</h2>${PARAS}<ul><li>5+ years</li><li>Remote (EU)</li></ul><img src="x.png"></article>`);
    const page = extractPage(d, 'https://acme.dev/jobs/1');
    assert.match(page.markdown, /About the role/);
    assert.match(page.markdown, /- 5\+ years/);
    assert.doesNotMatch(page.markdown, /x\.png/);
    assert.equal(page.url, 'https://acme.dev/jobs/1');
    assert.ok(page.title.length > 0);
  });

  it('只保留含 JobPosting 的 JSON-LD', () => {
    const d = doc(
      '<p>x</p>',
      `<script type="application/ld+json">{"@type":"BreadcrumbList"}</script>
       <script type="application/ld+json">{"@graph":[{"@type":"JobPosting","title":"A"}]}</script>
       <script type="application/ld+json">{oops</script>`,
    );
    assert.deepEqual(jobPostingJsonLd(d), [{ '@graph': [{ '@type': 'JobPosting', title: 'A' }] }]);
  });

  it('外链：绝对化、去重、去 hash、只要 http(s)', () => {
    const d = doc(`<a href="/jobs/1#apply">Job 1</a><a href="/jobs/1">dup</a><a href="mailto:a@b.c">mail</a>
      <a href="javascript:void 0">js</a><a href="https://jobs.lever.co/x/abc">  Lever   job </a>`);
    assert.deepEqual(outboundLinks(d, 'https://acme.dev/careers'), [
      { url: 'https://acme.dev/jobs/1', text: 'Job 1' },
      { url: 'https://jobs.lever.co/x/abc', text: 'Lever job' },
    ]);
  });

  it('正文按上限截断', () => {
    const text = 'line\n'.repeat(1000);
    const capped = capText(text, 100);
    assert.ok(capped.length < 120);
    assert.match(capped, /已截断/);
    assert.equal(capText('short', 100), 'short');
  });
});
