/**
 * JSON 模板（t1~t6）的展示元数据 —— 唯一定义源。
 *
 * 桌面端模板选择器与网站预览页工具栏共用此表，改名只改这里；
 * 营销页 /templates 的 styleLabel 是本地化营销文案，不在此列。
 */
import type { TemplateId } from './template-resume.ts';

export type JsonTemplateId = Exclude<TemplateId, 'default'>;

export type TemplateMeta = {
  /** 模板短名，如 "t1 经典"。 */
  label: string;
  /** 一句话适用场景，如 "深海军蓝 · 大公司 / 传统行业"。 */
  tagline: string;
};

export const TEMPLATE_META: Record<JsonTemplateId, TemplateMeta> = {
  't1-classic': { label: 't1 经典', tagline: '深海军蓝 · 大公司 / 传统行业' },
  't2-minimal': { label: 't2 极简', tagline: '瑞士留白 · 设计 / 产品' },
  't3-sidebar': { label: 't3 双栏', tagline: '深绿侧栏 · 突出技能矩阵' },
  't4-tech': { label: 't4 技术', tagline: '雾青 · 工程 / 开发岗' },
  't5-timeline': { label: 't5 时间线', tagline: '靛蓝 · 经历较多' },
  't6-academic': { label: 't6 学术', tagline: '墨红 · 学术 / 研究' },
};
