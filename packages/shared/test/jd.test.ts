import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildTargetMarkdown,
  canonicalizeUrl,
  isLikelyJobUrl,
  parseMatchJson,
  siteIdForHost,
  slugifyJd,
  targetSlugFor,
} from '../src/jd.ts';

describe('canonicalizeUrl', () => {
  it('去掉 utm / fragment / www，host 小写', () => {
    assert.equal(
      canonicalizeUrl('https://WWW.Example.com/jobs/42/?utm_source=x&utm_medium=y#section'),
      'https://example.com/jobs/42',
    );
  });

  it('LinkedIn 收到 job id 规范路径', () => {
    assert.equal(
      canonicalizeUrl('https://www.linkedin.com/jobs/view/4291001234/?refId=abc&trackingId=zzz'),
      'https://linkedin.com/jobs/view/4291001234',
    );
  });

  it('Boss 直聘收到 job_detail id', () => {
    assert.equal(
      canonicalizeUrl('https://www.zhipin.com/job_detail/abc123xyz.html?ka=search&lid=1'),
      'https://zhipin.com/job_detail/abc123xyz.html',
    );
  });

  it('Indeed 用 jk 做 canonical', () => {
    assert.equal(
      canonicalizeUrl('https://www.indeed.com/viewjob?jk=ff00aa11&from=searchonhp'),
      'https://indeed.com/viewjob?jk=ff00aa11',
    );
  });
});

describe('isLikelyJobUrl / siteIdForHost', () => {
  it('识别第一波站点的岗位路径', () => {
    assert.equal(isLikelyJobUrl('https://www.zhipin.com/job_detail/abc.html'), true);
    assert.equal(isLikelyJobUrl('https://www.linkedin.com/jobs/view/1'), true);
    assert.equal(isLikelyJobUrl('https://boards.greenhouse.io/acme/jobs/123'), true);
    assert.equal(isLikelyJobUrl('https://jobs.ashbyhq.com/acme/123-role'), true);
  });

  it('同站非岗位页不弹', () => {
    assert.equal(isLikelyJobUrl('https://www.zhipin.com/web/geek/job'), false);
    assert.equal(isLikelyJobUrl('https://www.linkedin.com/feed/'), false);
    assert.equal(isLikelyJobUrl('https://example.com/blog/hello'), false);
  });

  it('host → site id', () => {
    assert.equal(siteIdForHost('www.zhipin.com'), 'boss');
    assert.equal(siteIdForHost('job-boards.greenhouse.io'), 'greenhouse');
    assert.equal(siteIdForHost('muicv.com'), 'generic');
  });
});

describe('target markdown', () => {
  it('slugify 保留中文、去掉符号', () => {
    assert.equal(slugifyJd('Google / SWE L5!!'), 'google-swe-l5');
    assert.equal(slugifyJd('字节跳动-前端'), '字节跳动-前端');
  });

  it('拼出带 frontmatter 的 targets 文件', () => {
    const built = buildTargetMarkdown({
      url: 'https://www.zhipin.com/job_detail/abc.html?ka=x',
      canonicalUrl: 'https://zhipin.com/job_detail/abc.html',
      sourceSite: 'boss',
      title: '高级前端',
      company: 'Acme',
      location: '北京',
      employmentType: '全职',
      markdown: '负责 TypeScript 和 React。',
      extractedAt: '2026-09-13T00:00:00.000Z',
    });
    assert.equal(built.relPath, 'targets/acme-高级前端.md');
    assert.match(built.content, /^---\ntype: target\ncompany: Acme\n/m);
    assert.match(built.content, /source_url: "?https:\/\/zhipin\.com\/job_detail\/abc\.html"?/);
    assert.match(built.content, /## JD 正文/);
    assert.match(built.content, /TypeScript/);
  });

  it('缺公司名时 slug 兜底', () => {
    assert.equal(targetSlugFor({ company: null, title: 'Intern' }), 'company-intern');
  });
});

describe('parseMatchJson', () => {
  it('吃干净 JSON', () => {
    const r = parseMatchJson('{"verdict":"suitable","score":82,"covered":["TS"],"gaps":["K8s"],"reason":"匹配前端栈"}');
    assert.deepEqual(r, {
      verdict: 'suitable',
      score: 82,
      covered: ['TS'],
      gaps: ['K8s'],
      reason: '匹配前端栈',
    });
  });

  it('吃 markdown 围栏和前后废话', () => {
    const r = parseMatchJson(
      '好的\n```json\n{"verdict":"poor","score":10,"covered":[],"gaps":["Go"],"reason":"缺语言"}\n```\n',
    );
    assert.equal(r?.verdict, 'poor');
    assert.equal(r?.score, 10);
  });

  it('非法 verdict / 非 JSON 返回 null', () => {
    assert.equal(parseMatchJson('{"verdict":"maybe","score":1}'), null);
    assert.equal(parseMatchJson('not json'), null);
  });

  it('score 夹到 0–100', () => {
    assert.equal(parseMatchJson('{"verdict":"weak","score":999,"reason":"x"}')?.score, 100);
    assert.equal(parseMatchJson('{"verdict":"weak","score":-4,"reason":"x"}')?.score, 0);
  });
});
