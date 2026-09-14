import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractGeneric } from '../src/extractors/generic.ts';
import { htmlToMarkdown } from '../src/extractors/html-to-md.ts';
import type { QueryRoot } from '../src/extractors/query.ts';
import { extractCapturedJd, shouldOfferCapture } from '../src/extractors/registry.ts';

function mockQuery(opts: {
  url: string;
  title?: string;
  texts?: Record<string, string>;
  htmls?: Record<string, string>;
  jsonLd?: unknown[];
}): QueryRoot {
  return {
    url: opts.url,
    pageTitle: opts.title ?? '',
    text(selectors) {
      for (const raw of selectors.split(',')) {
        const key = raw.trim();
        if (opts.texts?.[key]) return opts.texts[key] ?? null;
      }
      return null;
    },
    html(selectors) {
      for (const raw of selectors.split(',')) {
        const key = raw.trim();
        if (opts.htmls?.[key]) return opts.htmls[key] ?? null;
      }
      return null;
    },
    jsonLd: () => opts.jsonLd ?? [],
  };
}

describe('htmlToMarkdown', () => {
  it('把列表和标题收成 markdown', () => {
    const md = htmlToMarkdown('<h2>职责</h2><ul><li>写 <strong>TS</strong></li><li>Review</li></ul>');
    assert.match(md, /### 职责/);
    assert.match(md, /- 写 \*\*TS\*\*/);
    assert.match(md, /- Review/);
  });
});

describe('extractGeneric', () => {
  it('吃 JobPosting JSON-LD', () => {
    const q = mockQuery({
      url: 'https://jobs.example.com/role/1',
      jsonLd: [
        {
          '@type': 'JobPosting',
          title: 'Staff Engineer',
          hiringOrganization: { name: 'Acme' },
          description: '<p>Build <b>TypeScript</b> systems. '.repeat(8),
        },
      ],
    });
    const got = extractGeneric(q);
    assert.equal(got?.title, 'Staff Engineer');
    assert.equal(got?.company, 'Acme');
    assert.match(got?.markdown ?? '', /TypeScript/);
  });

  it('文章页没有 JobPosting → null', () => {
    const q = mockQuery({
      url: 'https://example.com/blog/hello',
      jsonLd: [{ '@type': 'BlogPosting', headline: 'hi' }],
    });
    assert.equal(extractGeneric(q), null);
    assert.equal(shouldOfferCapture(q), false);
  });
});

describe('site extractors', () => {
  it('Boss 选择器命中', () => {
    const q = mockQuery({
      url: 'https://www.zhipin.com/job_detail/abc123.html',
      texts: { '.job-title': '高级前端', '.company-info .name': '字节跳动' },
      htmls: { '.job-sec-text': `<p>${'负责 React 和 TypeScript 业务开发。'.repeat(6)}</p>` },
    });
    const jd = extractCapturedJd(q);
    assert.equal(jd?.sourceSite, 'boss');
    assert.equal(jd?.title, '高级前端');
    assert.equal(jd?.company, '字节跳动');
    assert.equal(jd?.canonicalUrl, 'https://zhipin.com/job_detail/abc123.html');
    assert.equal(shouldOfferCapture(q), true);
  });

  it('Greenhouse 选择器命中', () => {
    const q = mockQuery({
      url: 'https://boards.greenhouse.io/acme/jobs/4001',
      texts: { '#header h1': 'Product Designer', '.company-name': 'Acme' },
      htmls: { '#content': `<div>${'Design systems, Figma, and user research. '.repeat(8)}</div>` },
    });
    const jd = extractCapturedJd(q);
    assert.equal(jd?.sourceSite, 'greenhouse');
    assert.equal(jd?.title, 'Product Designer');
    assert.equal(jd?.company, 'Acme');
  });
});
