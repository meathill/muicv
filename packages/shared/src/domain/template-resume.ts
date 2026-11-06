/**
 * 模板渲染用的简历数据。
 *
 * 跟 `domain/resume-json.ts` 区分：
 *   - `ResumeJson`（旧）：桌面 app 聊天式建库的"事实数据库"，单语，结构相对扁平。
 *   - `TemplateResumeData`（本文件）：六个新模板（t1~t6）渲染需要的双语视觉资料；
 *     字段命名与设计稿 muicv/project/shared/data.js 的 RESUME_DATA 一一对应，
 *     方便前后端对齐 + skill 半自动从聊天数据迁过来。
 *
 * 字段为字符串的位置，可以是单语（直接 string）或双语（{ zh, en }）。
 * 渲染时通过 `pickLang(node, lang)` 取对应语言。
 */

export type Bilingual<T = string> = T | { zh: T; en: T };

export type TemplateResumeContact = {
  location?: Bilingual;
  email?: string;
  phone?: string;
  web?: string;
  github?: string;
};

export type TemplateResumeExperience = {
  org: Bilingual;
  role: Bilingual;
  period: string;
  location?: Bilingual;
  bullets: Bilingual<string[]>;
};

export type TemplateResumeEducation = {
  school: Bilingual;
  degree: Bilingual;
  period: string;
  detail?: Bilingual;
};

export type TemplateResumeProject = {
  name: Bilingual;
  stack?: string;
  period?: string;
  desc: Bilingual;
};

export type TemplateResumePublication = {
  title: Bilingual;
  venue: string;
  authors: string;
  /** 发表年份，如 "2024"；缺省时模板不渲染年份。 */
  year?: string;
};

export type TemplateResumeSkills = {
  design?: string[];
  code?: string[];
  research?: Bilingual<string[]>;
};

export type TemplateResumeLanguage = {
  name: Bilingual;
  level: Bilingual;
};

export type TemplateResumeAward = {
  year: string;
  title: Bilingual;
};

export type TemplateResumeData = {
  schemaVersion: 1;
  /** 简历主语言，决定模板标题 / 排版语言；缺省按 'zh' 渲染。 */
  lang?: TemplateLang;
  /** R2 上传后拿到的 https URL；空 / undefined 表示不渲染照片。 */
  photoUrl?: string;
  name: Bilingual;
  title: Bilingual;
  tagline?: Bilingual;
  contact: TemplateResumeContact;
  summary: Bilingual;
  experience: TemplateResumeExperience[];
  education: TemplateResumeEducation[];
  projects: TemplateResumeProject[];
  publications?: TemplateResumePublication[];
  skills: TemplateResumeSkills;
  languages?: TemplateResumeLanguage[];
  awards?: TemplateResumeAward[];
  interests?: Bilingual<string[]>;
};

export const TEMPLATE_RESUME_SCHEMA_VERSION = 1 as const;

export type TemplateLang = 'zh' | 'en';

/** 取双语字段对应语言；缺一边自动 fallback 另一边；非对象直接返回。 */
export function pickLang<T>(node: Bilingual<T> | undefined, lang: TemplateLang): T | string {
  if (node == null) return '';
  if (typeof node !== 'object' || Array.isArray(node)) return node as T;
  const obj = node as { zh?: T; en?: T };
  const primary = obj[lang];
  if (primary !== undefined && primary !== null) return primary;
  const fallback = lang === 'zh' ? obj.en : obj.zh;
  if (fallback !== undefined && fallback !== null) return fallback;
  return '';
}

/**
 * 运行时校验：判断未知 input 是不是合法 TemplateResumeData。
 * 不引 zod，是因为本包是零依赖的纯类型 + 工具集合，给 worker / electron / website
 * 都能直接 import；新加 zod 会牵动 bundle / lockfile，这里手写最小校验更克制。
 *
 * 校验失败抛 TemplateResumeValidationError，msg 指向第一处错误的 path。
 */
export class TemplateResumeValidationError extends Error {
  path: string;
  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = 'TemplateResumeValidationError';
    this.path = path;
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function assertBilingual(value: unknown, path: string, allowArray = false): void {
  if (typeof value === 'string') return;
  if (allowArray && Array.isArray(value) && value.every((v) => typeof v === 'string')) return;
  if (isObject(value)) {
    const hasZh = typeof value.zh !== 'undefined';
    const hasEn = typeof value.en !== 'undefined';
    if (!hasZh && !hasEn) {
      throw new TemplateResumeValidationError(path, '双语对象至少要有 zh 或 en 一个字段');
    }
    if (hasZh && allowArray) {
      if (!Array.isArray(value.zh) || !value.zh.every((v) => typeof v === 'string')) {
        throw new TemplateResumeValidationError(`${path}.zh`, '应为 string[]');
      }
    } else if (hasZh && typeof value.zh !== 'string') {
      throw new TemplateResumeValidationError(`${path}.zh`, '应为 string');
    }
    if (hasEn && allowArray) {
      if (!Array.isArray(value.en) || !value.en.every((v) => typeof v === 'string')) {
        throw new TemplateResumeValidationError(`${path}.en`, '应为 string[]');
      }
    } else if (hasEn && typeof value.en !== 'string') {
      throw new TemplateResumeValidationError(`${path}.en`, '应为 string');
    }
    return;
  }
  throw new TemplateResumeValidationError(
    path,
    allowArray ? '应为 string / string[] / 双语对象' : '应为 string / 双语对象',
  );
}

function assertOptionalBilingual(value: unknown, path: string, allowArray = false): void {
  if (value === undefined || value === null) return;
  assertBilingual(value, path, allowArray);
}

export function assertTemplateResumeData(input: unknown): asserts input is TemplateResumeData {
  if (!isObject(input)) throw new TemplateResumeValidationError('$', '应为对象');
  if (input.schemaVersion !== TEMPLATE_RESUME_SCHEMA_VERSION) {
    throw new TemplateResumeValidationError('$.schemaVersion', `必须是 ${TEMPLATE_RESUME_SCHEMA_VERSION}`);
  }
  if (input.lang !== undefined && !isTemplateLang(input.lang)) {
    throw new TemplateResumeValidationError('$.lang', '必须是 "zh" 或 "en"');
  }
  assertBilingual(input.name, '$.name');
  assertBilingual(input.title, '$.title');
  assertOptionalBilingual(input.tagline, '$.tagline');
  if (input.photoUrl !== undefined && typeof input.photoUrl !== 'string') {
    throw new TemplateResumeValidationError('$.photoUrl', '应为 string (https URL)');
  }
  if (!isObject(input.contact)) throw new TemplateResumeValidationError('$.contact', '应为对象');
  assertOptionalBilingual(input.contact.location, '$.contact.location');
  for (const k of ['email', 'phone', 'web', 'github'] as const) {
    const v = (input.contact as Record<string, unknown>)[k];
    if (v !== undefined && typeof v !== 'string') {
      throw new TemplateResumeValidationError(`$.contact.${k}`, '应为 string');
    }
  }
  assertBilingual(input.summary, '$.summary');

  if (!Array.isArray(input.experience)) throw new TemplateResumeValidationError('$.experience', '应为数组');
  input.experience.forEach((e, i) => {
    if (!isObject(e)) throw new TemplateResumeValidationError(`$.experience[${i}]`, '应为对象');
    assertBilingual(e.org, `$.experience[${i}].org`);
    assertBilingual(e.role, `$.experience[${i}].role`);
    if (typeof e.period !== 'string')
      throw new TemplateResumeValidationError(`$.experience[${i}].period`, '应为 string');
    assertOptionalBilingual(e.location, `$.experience[${i}].location`);
    assertBilingual(e.bullets, `$.experience[${i}].bullets`, true);
  });

  if (!Array.isArray(input.education)) throw new TemplateResumeValidationError('$.education', '应为数组');
  input.education.forEach((e, i) => {
    if (!isObject(e)) throw new TemplateResumeValidationError(`$.education[${i}]`, '应为对象');
    assertBilingual(e.school, `$.education[${i}].school`);
    assertBilingual(e.degree, `$.education[${i}].degree`);
    if (typeof e.period !== 'string')
      throw new TemplateResumeValidationError(`$.education[${i}].period`, '应为 string');
    assertOptionalBilingual(e.detail, `$.education[${i}].detail`);
  });

  if (!Array.isArray(input.projects)) throw new TemplateResumeValidationError('$.projects', '应为数组');
  input.projects.forEach((p, i) => {
    if (!isObject(p)) throw new TemplateResumeValidationError(`$.projects[${i}]`, '应为对象');
    assertBilingual(p.name, `$.projects[${i}].name`);
    assertBilingual(p.desc, `$.projects[${i}].desc`);
    if (p.stack !== undefined && typeof p.stack !== 'string') {
      throw new TemplateResumeValidationError(`$.projects[${i}].stack`, '应为 string');
    }
    if (p.period !== undefined && typeof p.period !== 'string') {
      throw new TemplateResumeValidationError(`$.projects[${i}].period`, '应为 string');
    }
  });

  if (input.publications !== undefined) {
    if (!Array.isArray(input.publications)) throw new TemplateResumeValidationError('$.publications', '应为数组');
    input.publications.forEach((p, i) => {
      if (!isObject(p)) throw new TemplateResumeValidationError(`$.publications[${i}]`, '应为对象');
      assertBilingual(p.title, `$.publications[${i}].title`);
      if (typeof p.venue !== 'string')
        throw new TemplateResumeValidationError(`$.publications[${i}].venue`, '应为 string');
      if (typeof p.authors !== 'string')
        throw new TemplateResumeValidationError(`$.publications[${i}].authors`, '应为 string');
      if (p.year !== undefined && typeof p.year !== 'string') {
        throw new TemplateResumeValidationError(`$.publications[${i}].year`, '应为 string');
      }
    });
  }

  if (!isObject(input.skills)) throw new TemplateResumeValidationError('$.skills', '应为对象');
  for (const k of ['design', 'code'] as const) {
    const v = (input.skills as Record<string, unknown>)[k];
    if (v !== undefined && (!Array.isArray(v) || !v.every((s) => typeof s === 'string'))) {
      throw new TemplateResumeValidationError(`$.skills.${k}`, '应为 string[]');
    }
  }
  if (input.skills.research !== undefined) assertBilingual(input.skills.research, '$.skills.research', true);

  if (input.languages !== undefined) {
    if (!Array.isArray(input.languages)) throw new TemplateResumeValidationError('$.languages', '应为数组');
    input.languages.forEach((lg, i) => {
      if (!isObject(lg)) throw new TemplateResumeValidationError(`$.languages[${i}]`, '应为对象');
      assertBilingual(lg.name, `$.languages[${i}].name`);
      assertBilingual(lg.level, `$.languages[${i}].level`);
    });
  }

  if (input.awards !== undefined) {
    if (!Array.isArray(input.awards)) throw new TemplateResumeValidationError('$.awards', '应为数组');
    input.awards.forEach((a, i) => {
      if (!isObject(a)) throw new TemplateResumeValidationError(`$.awards[${i}]`, '应为对象');
      if (typeof a.year !== 'string') throw new TemplateResumeValidationError(`$.awards[${i}].year`, '应为 string');
      assertBilingual(a.title, `$.awards[${i}].title`);
    });
  }

  if (input.interests !== undefined) assertBilingual(input.interests, '$.interests', true);
}

export function isTemplateLang(value: unknown): value is TemplateLang {
  return value === 'zh' || value === 'en';
}

/**
 * 判断简历内容里是否真的写了某种语言（至少一个双语对象带该语言的边）。
 * 单语字符串（如纯英文简历所有字段都是 string）不算——切换渲染语言只会改模板标题，内容不变。
 * 用于预览页「中 / EN」切换器的显示判断。
 */
export function hasBilingualSide(data: TemplateResumeData, lang: TemplateLang): boolean {
  const nodes: unknown[] = [
    data.name,
    data.title,
    data.tagline,
    data.contact.location,
    data.summary,
    ...data.experience.flatMap((e) => [e.org, e.role, e.location, e.bullets]),
    ...data.education.flatMap((e) => [e.school, e.degree, e.detail]),
    ...data.projects.flatMap((p) => [p.name, p.desc]),
    ...(data.publications ?? []).map((p) => p.title),
    data.skills.research,
    ...(data.languages ?? []).flatMap((lg) => [lg.name, lg.level]),
    ...(data.awards ?? []).map((a) => a.title),
    data.interests,
  ];
  return nodes.some((n) => isObject(n) && typeof n[lang] !== 'undefined');
}

/** 模板 id 的字符串字面量集合 —— 给 API / 注册表共用。 */
export const TEMPLATE_IDS = [
  'default',
  't1-classic',
  't2-minimal',
  't3-sidebar',
  't4-tech',
  't5-timeline',
  't6-academic',
] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];
export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === 'string' && (TEMPLATE_IDS as readonly string[]).includes(value);
}
/** 只接受 JSON 数据的新模板 id（不含 default）。 */
export const JSON_TEMPLATE_IDS = TEMPLATE_IDS.filter((id) => id !== 'default') as readonly Exclude<
  TemplateId,
  'default'
>[];
export function isJsonTemplateId(value: unknown): value is Exclude<TemplateId, 'default'> {
  return typeof value === 'string' && (JSON_TEMPLATE_IDS as readonly string[]).includes(value);
}
