import {
  type ChangelogItem,
  type ContentPost,
  type ContentStatus,
  type PostSection,
  type SkillAppAvailability,
  type SkillCatalogItem,
  type SkillDistributionMode,
  type SkillPublisherType,
  getPostBySlug,
  getPublishedPosts,
} from './content-registry.ts';

const DEFAULT_CMS_BASE_URL = 'https://cms.muicv.com';
const FETCH_LIMIT = '100';

type CmsCacheMode = 'default' | 'force-cache' | 'no-cache' | 'no-store' | 'only-if-cached' | 'reload';

type CmsContentOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  cache?: CmsCacheMode;
};

type PayloadListResponse = {
  docs?: unknown[];
};

export async function fetchCmsPublishedPosts(
  section?: PostSection,
  options: CmsContentOptions = {},
): Promise<ContentPost[]> {
  const fallback = getPublishedPosts(section);
  const params = new URLSearchParams({
    depth: '0',
    limit: FETCH_LIMIT,
    sort: '-publishedAt',
    'where[status][equals]': 'published',
  });

  if (section) {
    params.set('where[section][equals]', section);
  }

  const docs = await fetchPayloadDocs('posts', params, options);
  if (!docs) {
    return fallback;
  }

  const cmsPosts = docs.map(parsePost).filter(isContentPost);
  const cmsSlugs = new Set(cmsPosts.map((p) => p.slug));
  const merged = [...cmsPosts, ...fallback.filter((p) => !cmsSlugs.has(p.slug))];
  return byPublishedAtDesc(merged);
}

export async function fetchCmsPostBySlug(
  section: PostSection,
  slug: string,
  options: CmsContentOptions = {},
): Promise<ContentPost | null> {
  const fallback = getPostBySlug(section, slug);
  const params = new URLSearchParams({
    depth: '0',
    limit: '1',
    'where[status][equals]': 'published',
    'where[section][equals]': section,
    'where[slug][equals]': slug,
  });
  const docs = await fetchPayloadDocs('posts', params, options);
  if (!docs) {
    return fallback;
  }

  return parsePost(docs[0]) ?? fallback;
}

export async function fetchCmsPublishedSkills(options: CmsContentOptions = {}): Promise<SkillCatalogItem[]> {
  const params = new URLSearchParams({
    depth: '0',
    limit: FETCH_LIMIT,
    sort: '-publishedAt',
    'where[status][equals]': 'published',
  });
  const docs = await fetchPayloadDocs('skillExtensions', params, options);
  if (!docs) {
    return [];
  }

  return byPublishedAtDesc(docs.map(parseSkill).filter(isSkillCatalogItem));
}

export async function fetchCmsSkillBySlug(
  slug: string,
  options: CmsContentOptions = {},
): Promise<SkillCatalogItem | null> {
  const params = new URLSearchParams({
    depth: '0',
    limit: '1',
    'where[status][equals]': 'published',
    'where[slug][equals]': slug,
  });
  const docs = await fetchPayloadDocs('skillExtensions', params, options);
  if (!docs) {
    return null;
  }

  return parseSkill(docs[0]) ?? null;
}

export async function fetchCmsPublishedChangelog(options: CmsContentOptions = {}): Promise<ChangelogItem[]> {
  const params = new URLSearchParams({
    depth: '0',
    limit: FETCH_LIMIT,
    sort: '-publishedAt',
    'where[status][equals]': 'published',
  });
  const docs = await fetchPayloadDocs('changelog', params, options);
  if (!docs) {
    return [];
  }

  return byPublishedAtDesc(docs.map(parseChangelog).filter(isChangelogItem));
}

async function fetchPayloadDocs(
  collection: 'posts' | 'skillExtensions' | 'changelog',
  params: URLSearchParams,
  options: CmsContentOptions,
): Promise<unknown[] | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = trimTrailingSlash(options.baseUrl ?? DEFAULT_CMS_BASE_URL);

  try {
    const response = await fetchImpl(`${baseUrl}/api/${collection}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      cache: options.cache ?? 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as PayloadListResponse;
    return Array.isArray(body.docs) ? body.docs : [];
  } catch {
    return null;
  }
}

function parsePost(value: unknown): ContentPost | null {
  if (!isRecord(value)) {
    return null;
  }

  const slug = readString(value.slug);
  const section = parsePostSection(value.section);
  const status = parseContentStatus(value.status);
  const title = readString(value.title);
  const summary = readString(value.summary);
  const bodyMarkdown = readString(value.bodyMarkdown);
  const author = readString(value.author);
  const publishedAt = readString(value.publishedAt);
  const seoTitle = readString(value.seoTitle);
  const seoDescription = readString(value.seoDescription);

  if (
    !slug ||
    !section ||
    !status ||
    !title ||
    !summary ||
    !bodyMarkdown ||
    !author ||
    !publishedAt ||
    !seoTitle ||
    !seoDescription
  ) {
    return null;
  }

  return {
    slug,
    section,
    status,
    title,
    summary,
    bodyMarkdown,
    tags: readValueArray(value.tags),
    keywords: readValueArray(value.keywords),
    author,
    publishedAt,
    updatedAt: readString(value.updatedAt) ?? publishedAt,
    seoTitle,
    seoDescription,
  };
}

function parseChangelog(value: unknown): ChangelogItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const slug = readString(value.slug);
  const status = parseContentStatus(value.status);
  const title = readString(value.title);
  const summary = readString(value.summary);
  const bodyMarkdown = readString(value.bodyMarkdown);
  const publishedAt = readString(value.publishedAt);

  if (!slug || !status || !title || !summary || !bodyMarkdown || !publishedAt) {
    return null;
  }

  return {
    slug,
    status,
    title,
    summary,
    bodyMarkdown,
    ...optionalString('version', value.version),
    publishedAt,
    updatedAt: readString(value.updatedAt) ?? publishedAt,
  };
}

function parseSkill(value: unknown): SkillCatalogItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const slug = readString(value.slug);
  const status = parseContentStatus(value.status);
  const title = readString(value.title);
  const publisher = readString(value.publisher);
  const publisherType = parsePublisherType(value.publisherType);
  const distributionMode = parseDistributionMode(value.distributionMode);
  const appAvailability = parseAppAvailability(value.appAvailability);
  const summary = readString(value.summary);
  const bodyMarkdown = readString(value.bodyMarkdown);
  const publishedAt = readString(value.publishedAt);
  const seoTitle = readString(value.seoTitle);
  const seoDescription = readString(value.seoDescription);

  if (
    !slug ||
    !status ||
    !title ||
    !publisher ||
    !publisherType ||
    !distributionMode ||
    !appAvailability ||
    !summary ||
    !bodyMarkdown ||
    !publishedAt ||
    !seoTitle ||
    !seoDescription
  ) {
    return null;
  }

  return {
    slug,
    status,
    title,
    publisher,
    publisherType,
    ...optionalString('sourceUrl', value.sourceUrl),
    ...optionalString('sourceLabel', value.sourceLabel),
    ...optionalString('sourceNote', value.sourceNote),
    distributionMode,
    appAvailability,
    summary,
    bodyMarkdown,
    useCases: readValueArray(value.useCases),
    tags: readValueArray(value.tags),
    keywords: readValueArray(value.keywords),
    ...optionalString('disclaimer', value.disclaimer),
    publishedAt,
    updatedAt: readString(value.updatedAt) ?? publishedAt,
    seoTitle,
    seoDescription,
  };
}

function readValueArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const text = isRecord(item) ? readString(item.value) : readString(item);
    return text ? [text] : [];
  });
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function optionalString<Key extends 'sourceUrl' | 'sourceLabel' | 'sourceNote' | 'disclaimer' | 'version'>(
  key: Key,
  value: unknown,
): Partial<Record<Key, string>> {
  const text = readString(value);
  return text ? ({ [key]: text } as Record<Key, string>) : {};
}

function parseContentStatus(value: unknown): ContentStatus | null {
  return value === 'draft' || value === 'published' ? value : null;
}

function parsePostSection(value: unknown): PostSection | null {
  return value === 'jobs' || value === 'product' || value === 'guide' ? value : null;
}

function parsePublisherType(value: unknown): SkillPublisherType | null {
  return value === 'muicv' || value === 'official' || value === 'community' ? value : null;
}

function parseDistributionMode(value: unknown): SkillDistributionMode | null {
  return value === 'built_in' || value === 'link_only' || value === 'hosted' || value === 'external_direct'
    ? value
    : null;
}

function parseAppAvailability(value: unknown): SkillAppAvailability | null {
  return value === 'built_in' || value === 'link_only' || value === 'installable' || value === 'coming_soon'
    ? value
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isContentPost(value: ContentPost | null): value is ContentPost {
  return value !== null;
}

function isSkillCatalogItem(value: SkillCatalogItem | null): value is SkillCatalogItem {
  return value !== null;
}

function isChangelogItem(value: ChangelogItem | null): value is ChangelogItem {
  return value !== null;
}

function byPublishedAtDesc<T extends { publishedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/g, '');
}
