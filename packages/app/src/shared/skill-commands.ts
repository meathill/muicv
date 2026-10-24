/**
 * chatbox 斜杠命令清单：用户在输入框开头打 `/` 弹面板时展示的可调用 skill。
 *
 * 维护规则：
 * - label / emoji / tagline 直接 derived 自 `CONVERSATION_TYPE_META`，文案改一处就够
 * - promptTemplate 是选中后整段替换 input 的引导文案，光标停在末尾让用户继续补充上下文
 * - 工具型 skill（muicv-render 等 agent 内部调用、用户不主动选的）不进这个清单
 * - 未来若需要"非 ConversationType 的可调用 skill"，把 slash 字段从 ConversationType 解耦即可
 */

import { CONVERSATION_TYPE_META, type ConversationType } from './types.ts';

export type SkillCommandMeta = {
  /** `/` 后输入的命令名（当前等于 ConversationType 字面量）。 */
  slash: string;
  label: string;
  emoji: string;
  tagline: string;
  /** 选中后整段替换 input 的引导文案；插入后光标移到末尾。 */
  promptTemplate: string;
};

const PROMPT_TEMPLATES: Record<ConversationType, string> = {
  core: '帮我记录一段：',
  generate: '针对岗位生成简历：',
  critique: '请帮我评审：',
  jobs: '分析这条 JD：',
  'job-match': '这轮匹配想调整：',
  interview: '模拟一轮面试：',
  coaching: '我想咨询：',
};

export const SKILL_COMMANDS: SkillCommandMeta[] = (Object.keys(CONVERSATION_TYPE_META) as ConversationType[]).map(
  (slash) => ({
    slash,
    ...CONVERSATION_TYPE_META[slash],
    promptTemplate: PROMPT_TEMPLATES[slash],
  }),
);

/** query 大小写不敏感地匹配 slash / label / tagline 任一字段。 */
export function matchesQuery(cmd: SkillCommandMeta, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    cmd.slash.toLowerCase().includes(q) || cmd.label.toLowerCase().includes(q) || cmd.tagline.toLowerCase().includes(q)
  );
}
