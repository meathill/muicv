import type { ExtractedPage } from '../extract/page.ts';
import type { PopupState } from './view.ts';

/** 脱离扩展环境（直接打开 popup.html?state=…&lang=…）时的示例数据，用于预览 / 商店截图。 */

function page(zh: boolean): ExtractedPage {
  return {
    url: 'https://x.com/remotejobsweekly',
    title: zh ? '远程岗位周刊 (@remotejobsweekly) / X' : 'Remote Jobs Weekly (@remotejobsweekly) / X',
    markdown: 'x'.repeat(6000),
    jsonLd: [],
    links: [],
  };
}

const JSONLD_PAGE: ExtractedPage = {
  url: 'https://jobs.ashbyhq.com/supabase/1f2e',
  title: 'Senior Backend Engineer (Go) – Supabase',
  markdown: 'x'.repeat(4000),
  jsonLd: [{ '@type': 'JobPosting' }],
  links: [],
};

export function mockState(name: string | null, locale = 'zh_CN'): PopupState {
  const zh = locale.startsWith('zh');
  const PAGE = page(zh);
  if (name === 'ready') return { kind: 'ready', page: PAGE, visibility: 'public', balance: 128_400 };
  if (name === 'private') return { kind: 'ready', page: JSONLD_PAGE, visibility: 'private', balance: 128_400 };
  if (name === 'submitting') return { kind: 'submitting', page: PAGE, visibility: 'public', step: 1 };
  if (name === 'queued') return { kind: 'submitting', page: PAGE, visibility: 'public', step: 1, queued: true };
  if (name === 'key') return { kind: 'needs-key' };
  if (name === 'error') {
    return {
      kind: 'error',
      page: PAGE,
      message: zh ? '余额不足，请到 muicv.com/dashboard 充值' : 'Not enough balance. Top up at muicv.com/dashboard.',
      needsTopup: true,
    };
  }
  if (name === 'empty') {
    return {
      kind: 'result',
      page: PAGE,
      result: {
        id: 'demo',
        visibility: 'public',
        method: 'none',
        found: 0,
        created: 0,
        duplicates: 0,
        charged: 42,
        rewarded: 0,
        balance: 128_358,
        jobs: [],
      },
    };
  }
  return {
    kind: 'result',
    page: PAGE,
    result: {
      id: 'demo',
      visibility: 'public',
      method: 'ai',
      found: 3,
      created: 2,
      duplicates: 1,
      charged: 0,
      rewarded: 2500,
      balance: 130_900,
      jobs: [
        {
          title: 'Senior Frontend Engineer (Vue)',
          company: 'Linear',
          location: 'Remote – Europe',
          workplace: 'remote',
          url: '',
          status: 'new',
          link: 'https://muicv.com/jobs/demo-1',
          restrictions: '仅限 欧洲 · UTC-1 ~ UTC+3',
        },
        {
          title: 'Backend Engineer, Go',
          company: 'Supabase',
          location: 'Remote – Worldwide',
          workplace: 'remote',
          url: '',
          status: 'new',
          link: 'https://muicv.com/jobs/demo-2',
          restrictions: '全球远程',
        },
        {
          title: 'Staff Product Designer',
          company: 'Vercel',
          location: 'Remote – US',
          workplace: 'remote',
          url: '',
          status: 'duplicate',
          link: 'https://muicv.com/jobs/o/demo-3',
          restrictions: '仅限 美国',
        },
      ],
    },
  };
}
