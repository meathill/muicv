import { microToDisplay, type SubmittedJob } from '@muicv/shared';

/**
 * 扩展提交记录 → dashboard 展示结构（纯函数，便于单测）。
 * 金额全部换算成显示 token。refund 不落库：结算后 = hold − charged（见 shared settleSubmission）。
 */

export type SubmissionPhase = 'queued' | 'processing' | 'done' | 'failed';

export type SubmissionRow = {
  id: string;
  url: string;
  visibility: string;
  status: string;
  method: string | null;
  jobsFound: number;
  jobsNew: number;
  holdMicro: number;
  costMicro: number;
  chargedMicro: number;
  rewardMicro: number;
  result: string | null;
  error: string | null;
  createdAt: number;
  settledAt: number | null;
};

export type SubmissionJobView = Pick<SubmittedJob, 'title' | 'company' | 'status' | 'link' | 'url'>;

export type SubmissionView = {
  id: string;
  url: string;
  title: string;
  visibility: 'public' | 'private';
  phase: SubmissionPhase;
  method: string | null;
  createdAt: number;
  settledAt: number | null;
  found: number;
  created: number;
  duplicates: number;
  jobs: SubmissionJobView[];
  note: string | null;
  error: string | null;
  hold: number;
  refund: number;
  charged: number;
  reward: number;
  /** 最终净变化（正 = 入账）；处理中为 −hold（预扣尚未结算） */
  net: number;
};

export function submissionPhase(status: string): SubmissionPhase {
  if (status === 'queued') return 'queued';
  if (status === 'held') return 'processing';
  if (status === 'settled') return 'done';
  return 'failed';
}

function parseResult(raw: string | null): {
  jobs: SubmissionJobView[];
  note: string | null;
  duplicates: number | null;
} {
  if (!raw) return { jobs: [], note: null, duplicates: null };
  try {
    const parsed = JSON.parse(raw) as { jobs?: unknown; note?: unknown; duplicates?: unknown };
    const jobs = Array.isArray(parsed.jobs)
      ? (parsed.jobs as SubmittedJob[]).map((j) => ({
          title: String(j.title ?? ''),
          company: String(j.company ?? ''),
          status: j.status,
          link: j.link ?? null,
          url: String(j.url ?? ''),
        }))
      : [];
    return {
      jobs,
      note: typeof parsed.note === 'string' ? parsed.note : null,
      duplicates: typeof parsed.duplicates === 'number' ? parsed.duplicates : null,
    };
  } catch {
    return { jobs: [], note: null, duplicates: null };
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function toSubmissionView(row: SubmissionRow): SubmissionView {
  const phase = submissionPhase(row.status);
  const { jobs, note, duplicates } = parseResult(row.result);
  const rejected = row.status === 'rejected';
  const hold = rejected ? 0 : microToDisplay(row.holdMicro);
  const settled = row.settledAt != null || row.status === 'settled';
  const charged = microToDisplay(row.chargedMicro);
  const reward = microToDisplay(row.rewardMicro);
  const refund = settled ? Math.max(hold - charged, 0) : 0;
  const net = settled ? reward - charged : rejected ? 0 : -hold;
  let title = jobs[0]?.title ?? '';
  if (!title) {
    try {
      title = new URL(row.url).hostname;
    } catch {
      title = row.url;
    }
  }
  return {
    id: row.id,
    url: row.url,
    title: jobs.length > 1 ? `${title} 等 ${jobs.length} 个岗位` : title,
    visibility: row.visibility === 'private' ? 'private' : 'public',
    phase,
    method: row.method,
    createdAt: row.createdAt,
    settledAt: row.settledAt,
    found: row.jobsFound,
    created: row.jobsNew,
    duplicates: duplicates ?? jobs.filter((j) => j.status === 'duplicate').length,
    jobs,
    note,
    error: row.error,
    hold: round(hold),
    refund: round(refund),
    charged: round(charged),
    reward: round(reward),
    net: round(net),
  };
}
