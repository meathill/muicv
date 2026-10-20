import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  displayToMicro,
  estimateSubmitHoldMicro,
  JOB_SUBMIT_MIN_HOLD,
  JOB_SUBMIT_REWARD,
  JOB_SUBMIT_REWARD_PER_EXTRA,
  type JobSubmitRequest,
  settleSubmission,
  submitAiCostMicro,
  submitRewardMicro,
} from '@muicv/shared';

import { detectAtsUrl, fetchAtsJob } from '../src/lib/job-submit/ats.ts';
import { jobsFromJsonLd, jsonLdFromHtml } from '../src/lib/job-submit/jsonld.ts';
import { runSubmitPipeline } from '../src/lib/job-submit/pipeline.ts';
import { parseSubmitRequest } from '../src/lib/job-submit/request.ts';
import { safeFetch, toPublicUrl } from '../src/lib/job-submit/safe-fetch.ts';
import type { TextAi } from '../src/lib/job-submit/types.ts';

describe('计费规则 settleSubmission', () => {
  const hold = 5_000_000;
  it('公共 + 识别到 + 有新岗位：不扣费、全退、发奖', () => {
    const s = settleSubmission({
      visibility: 'public',
      found: 2,
      created: 2,
      costMicro: 9999,
      holdMicro: hold,
      rewardCapped: false,
    });
    assert.deepEqual(s, {
      chargeMicro: 0,
      refundMicro: hold,
      rewardMicro: displayToMicro(JOB_SUBMIT_REWARD + JOB_SUBMIT_REWARD_PER_EXTRA),
    });
  });
  it('公共 + 识别到但全是重复 / 入库失败：不扣费、不发奖', () => {
    const s = settleSubmission({
      visibility: 'public',
      found: 3,
      created: 0,
      costMicro: 9999,
      holdMicro: hold,
      rewardCapped: false,
    });
    assert.deepEqual(s, { chargeMicro: 0, refundMicro: hold, rewardMicro: 0 });
  });
  it('公共 + 新岗位但今日奖励已达上限：不扣费、不发奖', () => {
    const s = settleSubmission({
      visibility: 'public',
      found: 1,
      created: 1,
      costMicro: 10,
      holdMicro: hold,
      rewardCapped: true,
    });
    assert.deepEqual(s, { chargeMicro: 0, refundMicro: hold, rewardMicro: 0 });
  });
  it('公共 + 没识别到：按实际 AI 成本扣，多退', () => {
    const s = settleSubmission({
      visibility: 'public',
      found: 0,
      created: 0,
      costMicro: 1234.2,
      holdMicro: hold,
      rewardCapped: false,
    });
    assert.deepEqual(s, { chargeMicro: 1235, refundMicro: hold - 1235, rewardMicro: 0 });
  });
  it('私藏 + 识别到：按实际成本扣、不发奖', () => {
    const s = settleSubmission({
      visibility: 'private',
      found: 2,
      created: 2,
      costMicro: 800,
      holdMicro: hold,
      rewardCapped: false,
    });
    assert.deepEqual(s, { chargeMicro: 800, refundMicro: hold - 800, rewardMicro: 0 });
  });
  it('私藏 + 确定性识别（无 AI 成本）：0 扣费', () => {
    const s = settleSubmission({
      visibility: 'private',
      found: 1,
      created: 1,
      costMicro: 0,
      holdMicro: hold,
      rewardCapped: false,
    });
    assert.deepEqual(s, { chargeMicro: 0, refundMicro: hold, rewardMicro: 0 });
  });
  it('实际成本超过预扣：最多扣预扣额', () => {
    const s = settleSubmission({
      visibility: 'private',
      found: 0,
      created: 0,
      costMicro: hold * 2,
      holdMicro: hold,
      rewardCapped: false,
    });
    assert.deepEqual(s, { chargeMicro: hold, refundMicro: 0, rewardMicro: 0 });
  });
  it('预扣估算随长度增长且有下限；奖励封顶', () => {
    assert.ok(estimateSubmitHoldMicro(0) >= displayToMicro(JOB_SUBMIT_MIN_HOLD));
    assert.ok(estimateSubmitHoldMicro(20_000) > estimateSubmitHoldMicro(1000));
    assert.equal(submitRewardMicro(0), 0);
    assert.equal(submitRewardMicro(50), submitRewardMicro(5));
    assert.equal(submitAiCostMicro(1000, 100), displayToMicro(1000 * 0.01 + 100 * 0.08));
  });
});

describe('SSRF 防护', () => {
  it('拒绝私网 / 回环 / 非常规地址', () => {
    for (const bad of [
      'http://127.0.0.1/x',
      'http://10.1.2.3/',
      'http://192.168.0.1',
      'http://169.254.169.254/latest/meta-data',
      'http://[::1]/',
      'http://[fd00::1]/',
      'http://[::ffff:127.0.0.1]/',
      'http://localhost:8080/',
      'http://intranet.corp/',
      'http://2130706433/',
      'http://0x7f.0.0.1/',
      'https://example.com:8443/',
      'https://user:pw@example.com/',
      'file:///etc/passwd',
      'ftp://example.com/',
    ]) {
      assert.equal(toPublicUrl(bad), null, bad);
    }
    assert.ok(toPublicUrl('https://jobs.example.com/a?b=1'));
    assert.ok(toPublicUrl('http://8.8.8.8/'));
  });

  it('重定向到内网被拦截；正文按字节截断', async () => {
    const calls: string[] = [];
    const fake = (async (url: string) => {
      calls.push(url);
      if (url.startsWith('https://a.example.com'))
        return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/admin' } });
      return new Response('x'.repeat(5000), { status: 200, headers: { 'content-type': 'text/html' } });
    }) as unknown as typeof fetch;
    const blocked = await safeFetch(fake, 'https://a.example.com/job');
    assert.equal(blocked.status, 0);
    assert.deepEqual(calls, ['https://a.example.com/job']);
    const capped = await safeFetch(fake, 'https://b.example.com/job', { maxBytes: 1000 });
    assert.equal(capped.body.length, 1000);
  });
});

describe('确定性识别', () => {
  it('JSON-LD JobPosting（@graph 嵌套、远程、HTML 描述）', () => {
    const jobs = jobsFromJsonLd(
      [
        {
          '@graph': [
            { '@type': 'WebPage' },
            {
              '@type': 'JobPosting',
              title: 'Senior Go Engineer',
              hiringOrganization: { '@type': 'Organization', name: 'Acme' },
              jobLocationType: 'TELECOMMUTE',
              applicantLocationRequirements: { '@type': 'Country', name: 'Germany' },
              description: '<p>Build things</p><ul><li>Go</li></ul>',
              employmentType: ['FULL_TIME'],
            },
          ],
        },
      ],
      'https://acme.dev/jobs/1',
    );
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0]?.company, 'Acme');
    assert.equal(jobs[0]?.location, 'Remote | Germany');
    assert.equal(jobs[0]?.workplaceHint, 'remote');
    assert.match(jobs[0]?.body ?? '', /- Go/);
    assert.equal(jobs[0]?.url, 'https://acme.dev/jobs/1');
  });

  it('从 HTML 里取 JSON-LD，坏 JSON 忽略', () => {
    const html = `<script type="application/ld+json">{bad</script><script type="application/ld+json">{"@type":"JobPosting","title":"T"}</script>`;
    assert.equal(jsonLdFromHtml(html).length, 1);
  });

  it('识别 ATS 链接', () => {
    assert.deepEqual(detectAtsUrl('https://job-boards.greenhouse.io/vercel/jobs/5012345'), {
      kind: 'greenhouse',
      board: 'vercel',
      id: '5012345',
    });
    assert.deepEqual(detectAtsUrl('https://boards.greenhouse.io/embed/job_app?for=stripe&token=123'), {
      kind: 'greenhouse',
      board: 'stripe',
      id: '123',
    });
    assert.equal(detectAtsUrl('https://jobs.lever.co/netflix/0b1c2d3e-0000-4000-8000-123456789abc')?.kind, 'lever');
    assert.equal(
      detectAtsUrl('https://jobs.ashbyhq.com/supabase/0b1c2d3e-0000-4000-8000-123456789abc/application')?.kind,
      'ashby',
    );
    assert.equal(detectAtsUrl('https://example.com/jobs/1'), null);
  });

  it('ATS 单条接口 → 候选岗位（复用采集映射）', async () => {
    const job = await fetchAtsJob(
      async (url) => {
        assert.equal(url, 'https://boards-api.greenhouse.io/v1/boards/vercel/jobs/5');
        return {
          status: 200,
          contentType: 'application/json',
          finalUrl: url,
          body: JSON.stringify({
            id: 5,
            title: 'Frontend Engineer',
            company_name: 'Vercel',
            location: { name: 'Remote - US' },
            content: '&lt;p&gt;Next.js&lt;/p&gt;',
            absolute_url: 'https://vercel.com/careers/5',
          }),
        };
      },
      { kind: 'greenhouse', board: 'vercel', id: '5' },
    );
    assert.equal(job?.company, 'Vercel');
    assert.equal(job?.body, 'Next.js');
  });
});

function req(over: Partial<JobSubmitRequest> = {}): JobSubmitRequest {
  return {
    url: 'https://x.com/remotejobs',
    title: 'Remote Jobs',
    markdown: 'page text',
    jsonLd: [],
    links: [],
    visibility: 'public',
    ...over,
  };
}

function fakeAi(responses: unknown[]): TextAi & { calls: number } {
  const ai = {
    calls: 0,
    async run() {
      const r = responses[ai.calls] ?? { response: '{"hasJobs":false,"jobs":[]}' };
      ai.calls++;
      return r;
    },
  };
  return ai;
}

describe('识别流水线', () => {
  it('JSON-LD 命中时不调用 AI', async () => {
    const ai = fakeAi([]);
    const res = await runSubmitPipeline(
      { ai, fetchLink: async () => assert.fail('不应抓取') },
      req({ jsonLd: [{ '@type': 'JobPosting', title: 'A', hiringOrganization: 'B' }], markdown: 'JD body' }),
    );
    assert.equal(res.method, 'jsonld');
    assert.equal(res.jobs[0]?.body, 'JD body');
    assert.equal(ai.calls, 0);
  });

  it('AI 判定无岗位 → none，计入用量', async () => {
    const ai = fakeAi([
      { response: '{"hasJobs":false,"jobs":[]}', usage: { prompt_tokens: 900, completion_tokens: 20 } },
    ]);
    const res = await runSubmitPipeline({ ai, fetchLink: async () => assert.fail() }, req());
    assert.equal(res.method, 'none');
    assert.deepEqual(res.usage, { inputTokens: 900, outputTokens: 20 });
  });

  it('多岗位页面：只跟进外链列表里的链接，最多 3 条', async () => {
    const links = ['a', 'b', 'c', 'd'].map((k) => ({ url: `https://jobs.example.com/${k}`, text: k }));
    const jobs = ['a', 'b', 'c', 'd'].map((k) => ({
      title: `Job ${k}`,
      company: 'Co',
      location: 'Remote',
      workplace: 'remote',
      url: `https://jobs.example.com/${k}`,
      summary: 's',
    }));
    jobs.push({
      title: 'Evil',
      company: 'Co',
      location: '',
      workplace: 'unknown',
      url: 'http://169.254.169.254/',
      summary: 'x',
    });
    const fetched: string[] = [];
    const ai = fakeAi([
      { response: JSON.stringify({ hasJobs: true, jobs }), usage: { prompt_tokens: 100, completion_tokens: 50 } },
    ]);
    const res = await runSubmitPipeline(
      {
        ai,
        fetchLink: async (url) => {
          fetched.push(url);
          return {
            status: 200,
            contentType: 'text/html',
            finalUrl: url,
            body: `<script type="application/ld+json">{"@type":"JobPosting","title":"Detail ${url}","description":"full"}</script>`,
          };
        },
      },
      req({ links }),
    );
    assert.equal(res.method, 'ai');
    assert.deepEqual(
      fetched,
      links.slice(0, 3).map((l) => l.url),
    );
    assert.equal(res.jobs.length, 5);
    assert.equal(res.jobs[0]?.company, 'Co');
    assert.equal(res.jobs[0]?.body, 'full');
    assert.equal(res.jobs[3]?.body, 's');
    assert.equal(res.jobs[4]?.url, 'https://x.com/remotejobs');
  });

  it('单岗位页面无详情链接：正文用页面 markdown', async () => {
    const ai = fakeAi([
      {
        response:
          '{"hasJobs":true,"jobs":[{"title":"Rust Dev","company":"Oxide","location":"US","workplace":"remote","url":"","summary":"s"}]}',
      },
    ]);
    const res = await runSubmitPipeline(
      { ai, fetchLink: async () => assert.fail() },
      req({ markdown: 'full jd text' }),
    );
    assert.equal(res.jobs[0]?.body, 'full jd text');
    assert.ok(res.usage.inputTokens > 0);
  });

  it('没有 AI 绑定时降级为 none', async () => {
    const res = await runSubmitPipeline({ ai: null, fetchLink: async () => assert.fail() }, req());
    assert.equal(res.method, 'none');
    assert.ok(res.note);
  });
});

describe('请求校验', () => {
  it('拒绝非法 url、超长正文；过滤坏外链；默认公共', () => {
    assert.equal(parseSubmitRequest({ url: 'javascript:alert(1)', markdown: 'x' }).ok, false);
    assert.equal(parseSubmitRequest({ url: 'https://a.com', markdown: 'x'.repeat(30_000) }).ok, false);
    assert.equal(parseSubmitRequest({ url: 'https://a.com' }).ok, false);
    const ok = parseSubmitRequest({
      url: 'https://a.com',
      markdown: 'x',
      links: [{ url: 'mailto:a' }, { url: 'https://b.com', text: 'b' }],
    });
    assert.ok(ok.ok);
    if (ok.ok) {
      assert.equal(ok.value.visibility, 'public');
      assert.deepEqual(ok.value.links, [{ url: 'https://b.com', text: 'b' }]);
    }
  });
});
