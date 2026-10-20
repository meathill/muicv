import type { JobCategory, JobKind, JobRegion, JobSearchFilters, RemoteType } from './types.ts';

/**
 * Workers AI embedding + Vectorize 的最小结构类型。
 * shared 不依赖 @cloudflare/workers-types，用结构类型让 api / cron 直接传 env.AI / env.JOBS_INDEX，
 * 单测里也能轻松 mock。
 */

/** 多语言（中英）embedding，1024 维，cosine。 */
export const JOB_EMBEDDING_MODEL = '@cf/baai/bge-m3';
export const JOB_EMBEDDING_DIMENSIONS = 1024;

export type EmbeddingRunner = {
  run(model: typeof JOB_EMBEDDING_MODEL, input: { text: string[] }): Promise<unknown>;
};

export type JobVectorMetadata = {
  kind: JobKind;
  refId: string;
  remote: RemoteType | 'unknown';
  region: JobRegion | 'unknown';
  category: JobCategory | 'unknown';
  /** 毫秒时间戳 */
  postedAt: number;
};

export type JobVector = { id: string; values: number[]; metadata: JobVectorMetadata };

export type VectorMatch = { id: string; score: number; metadata?: Record<string, unknown> | null };

export type JobVectorIndex = {
  upsert(vectors: JobVector[]): Promise<unknown>;
  deleteByIds(ids: string[]): Promise<unknown>;
  query(
    vector: number[],
    options: { topK: number; filter?: Record<string, string>; returnMetadata?: 'none' | 'indexed' | 'all' },
  ): Promise<{ matches: VectorMatch[] }>;
};

export type JobSearchEnv = { AI: EmbeddingRunner; JOBS_INDEX: JobVectorIndex };

export function jobVectorId(kind: JobKind, refId: string): string {
  return `${kind}:${refId}`;
}

export function parseJobVectorId(id: string): { kind: JobKind; refId: string } | null {
  const m = /^(collected|community):(.+)$/.exec(id);
  return m ? { kind: m[1] as JobKind, refId: m[2] as string } : null;
}

const EMBED_BATCH = 50;

export async function embedTexts(ai: EmbeddingRunner, texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const result = (await ai.run(JOB_EMBEDDING_MODEL, { text: texts.slice(i, i + EMBED_BATCH) })) as {
      data?: number[][];
    };
    if (!Array.isArray(result.data)) throw new Error('embedding 返回缺少 data');
    out.push(...result.data);
  }
  return out;
}

export type IndexableJob = { id: string; text: string; metadata: JobVectorMetadata };

export async function indexJobs(env: JobSearchEnv, jobs: IndexableJob[]): Promise<number> {
  if (jobs.length === 0) return 0;
  const values = await embedTexts(
    env.AI,
    jobs.map((job) => job.text),
  );
  const vectors = jobs.map((job, i) => ({ id: job.id, values: values[i] ?? [], metadata: job.metadata }));
  for (let i = 0; i < vectors.length; i += 500) {
    await env.JOBS_INDEX.upsert(vectors.slice(i, i + 500));
  }
  return vectors.length;
}

/** 结构化过滤 → Vectorize metadata filter（需要先建 metadata index，见 DEPLOYMENT.md）。 */
export function toVectorFilter(filters: JobSearchFilters): Record<string, string> | undefined {
  const filter: Record<string, string> = {};
  if (filters.kind) filter.kind = filters.kind;
  if (filters.remote) filter.remote = filters.remote;
  if (filters.region) filter.region = filters.region;
  if (filters.category) filter.category = filters.category;
  return Object.keys(filter).length ? filter : undefined;
}

export async function queryJobVectors(
  env: JobSearchEnv,
  q: string,
  filters: JobSearchFilters,
  topK: number,
): Promise<VectorMatch[]> {
  const [vector] = await embedTexts(env.AI, [q]);
  if (!vector) return [];
  const filter = toVectorFilter(filters);
  const res = await env.JOBS_INDEX.query(vector, {
    topK,
    returnMetadata: 'indexed',
    ...(filter ? { filter } : {}),
  });
  return res.matches;
}
