import type { CmsArticlePayload } from './article-input.ts';
import type { CmsChangelogPayload } from './changelog-input.ts';
import type { CmsPostPayload } from './post-input.ts';
import type { CmsSkillPayload } from './skill-input.ts';

export type CmsArticleDocument = {
  id: number | string;
  site: string;
  locale: string;
  title: string;
  slug: string;
  status: string;
  summary: string;
  bodyMarkdown: string;
  tags?: Array<{ value: string }>;
  keywords?: Array<{ value: string }>;
  author: string;
  publishedAt: string;
  seoTitle: string;
  seoDescription: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CmsPostDocument = CmsPostPayload & {
  id: number | string;
  createdAt?: string;
  updatedAt?: string;
};

export type CmsSkillDocument = CmsSkillPayload & {
  id: number | string;
  createdAt?: string;
  updatedAt?: string;
};

export type CmsChangelogDocument = CmsChangelogPayload & {
  id: number | string;
  createdAt?: string;
  updatedAt?: string;
};

type PayloadListResponse<T> = {
  docs?: T[];
};

type PayloadLoginResponse = {
  token?: string;
};

type PayloadMutationResponse<T> =
  | T
  | {
      doc?: T;
      message?: string;
    };

type PayloadErrorResponse = {
  message?: string;
  errors?: Array<{ message?: string }>;
};

type CmsClientOptions = {
  baseUrl?: string;
  apiKey?: string;
  token?: string;
  email?: string;
  password?: string;
  fetchImpl?: typeof fetch;
};

export class CmsAuthError extends Error {
  constructor() {
    super(
      '缺少 CMS 鉴权。请设置 MUICV_CMS_API_KEY，或设置 MUICV_CMS_TOKEN，或设置 MUICV_CMS_EMAIL / MUICV_CMS_PASSWORD。',
    );
  }
}

export class CmsClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly email: string | undefined;
  private readonly password: string | undefined;
  private readonly fetchImpl: typeof fetch;
  private token: string | undefined;

  constructor(options: CmsClientOptions = {}) {
    this.baseUrl = trimTrailingSlash(options.baseUrl ?? process.env.MUICV_CMS_URL ?? 'https://cms.muicv.com');
    this.apiKey = options.apiKey ?? process.env.MUICV_CMS_API_KEY ?? process.env.PAYLOAD_API_KEY;
    this.token = options.token ?? process.env.MUICV_CMS_TOKEN ?? process.env.PAYLOAD_TOKEN;
    this.email = options.email ?? process.env.MUICV_CMS_EMAIL;
    this.password = options.password ?? process.env.MUICV_CMS_PASSWORD;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async findPostBySlug(slug: string): Promise<CmsPostDocument | null> {
    const params = new URLSearchParams({
      depth: '0',
      limit: '1',
      'where[slug][equals]': slug,
    });
    const result = await this.request<PayloadListResponse<CmsPostDocument>>(`/api/posts?${params.toString()}`);
    return result.docs?.[0] ?? null;
  }

  async createPost(payload: CmsPostPayload): Promise<CmsPostDocument> {
    return unwrapMutationDocument(
      await this.request<PayloadMutationResponse<CmsPostDocument>>('/api/posts', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
  }

  async updatePost(id: number | string, payload: CmsPostPayload): Promise<CmsPostDocument> {
    return unwrapMutationDocument(
      await this.request<PayloadMutationResponse<CmsPostDocument>>(`/api/posts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    );
  }

  async findArticleBySlug(site: string, locale: string, slug: string): Promise<CmsArticleDocument | null> {
    const params = new URLSearchParams({
      depth: '0',
      limit: '1',
      'where[site][equals]': site,
      'where[locale][equals]': locale,
      'where[slug][equals]': slug,
    });
    const result = await this.request<PayloadListResponse<CmsArticleDocument>>(`/api/articles?${params.toString()}`);
    return result.docs?.[0] ?? null;
  }

  async createArticle(payload: CmsArticlePayload): Promise<CmsArticleDocument> {
    return unwrapMutationDocument(
      await this.request<PayloadMutationResponse<CmsArticleDocument>>('/api/articles', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
  }

  async updateArticle(id: number | string, payload: CmsArticlePayload): Promise<CmsArticleDocument> {
    return unwrapMutationDocument(
      await this.request<PayloadMutationResponse<CmsArticleDocument>>(`/api/articles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    );
  }

  async findSkillBySlug(slug: string): Promise<CmsSkillDocument | null> {
    const params = new URLSearchParams({
      depth: '0',
      limit: '1',
      'where[slug][equals]': slug,
    });
    const result = await this.request<PayloadListResponse<CmsSkillDocument>>(
      `/api/skillExtensions?${params.toString()}`,
    );
    return result.docs?.[0] ?? null;
  }

  async createSkill(payload: CmsSkillPayload): Promise<CmsSkillDocument> {
    return unwrapMutationDocument(
      await this.request<PayloadMutationResponse<CmsSkillDocument>>('/api/skillExtensions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
  }

  async updateSkill(id: number | string, payload: CmsSkillPayload): Promise<CmsSkillDocument> {
    return unwrapMutationDocument(
      await this.request<PayloadMutationResponse<CmsSkillDocument>>(`/api/skillExtensions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    );
  }

  async findChangelogBySlug(slug: string): Promise<CmsChangelogDocument | null> {
    const params = new URLSearchParams({
      depth: '0',
      limit: '1',
      'where[slug][equals]': slug,
    });
    const result = await this.request<PayloadListResponse<CmsChangelogDocument>>(`/api/changelog?${params.toString()}`);
    return result.docs?.[0] ?? null;
  }

  async createChangelog(payload: CmsChangelogPayload): Promise<CmsChangelogDocument> {
    return unwrapMutationDocument(
      await this.request<PayloadMutationResponse<CmsChangelogDocument>>('/api/changelog', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
  }

  async updateChangelog(id: number | string, payload: CmsChangelogPayload): Promise<CmsChangelogDocument> {
    return unwrapMutationDocument(
      await this.request<PayloadMutationResponse<CmsChangelogDocument>>(`/api/changelog/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    );
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const authHeader = await this.getAuthorizationHeader();
    headers.set('Authorization', authHeader);

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    const bodyText = await response.text();
    const json = parseJson(bodyText);

    if (!response.ok) {
      throw new Error(`CMS API ${response.status}: ${extractErrorMessage(json)}`);
    }

    return json as T;
  }

  private async getAuthorizationHeader(): Promise<string> {
    if (this.apiKey) {
      return `users API-Key ${this.apiKey}`;
    }

    if (this.token) {
      return `Bearer ${this.token}`;
    }

    if (!this.email || !this.password) {
      throw new CmsAuthError();
    }

    const response = await this.fetchImpl(`${this.baseUrl}/api/users/login`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: this.email,
        password: this.password,
      }),
    });

    const bodyText = await response.text();
    const json = parseJson(bodyText);

    if (!response.ok) {
      throw new Error(`CMS 登录失败 ${response.status}: ${extractErrorMessage(json)}`);
    }

    const token = (json as PayloadLoginResponse).token;
    if (!token) {
      throw new Error('CMS 登录成功但没有返回 token。');
    }

    this.token = token;
    return `Bearer ${token}`;
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/g, '');
}

function parseJson(value: string): unknown {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function unwrapMutationDocument<T>(value: PayloadMutationResponse<T>): T {
  if (isRecord(value) && isRecord(value.doc)) {
    return value.doc as T;
  }

  return value as T;
}

function extractErrorMessage(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return 'unknown error';
  }

  const error = value as PayloadErrorResponse;
  const firstMessage = error.errors?.find((item) => typeof item.message === 'string')?.message;
  return firstMessage ?? error.message ?? JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
