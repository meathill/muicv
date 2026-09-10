/**
 * 附件 footer 的跨进程格式约定。renderer 负责生成（拼进 user message content），
 * main 与 renderer 都要剥离（气泡展示、回滚重新编辑），所以格式定义放 shared，
 * 避免两进程各写一份字面量后漂移。
 *
 * 格式：正文 + `\n\n` + HEADER + 每行一条附件。
 * 「只发附件不打字」的消息会去掉前导 `\n\n`，content 直接以 HEADER 开头——
 * 生成端（use-agent-dispatch）与剥离端都要容忍这两种形态。
 */
export const ATTACHMENT_FOOTER_HEADER = '---\n[附件]\n';

/**
 * 剥掉 content 末尾的附件 footer，只留用户正文。
 * - 找不到 footer 时原样返回（不 trim，避免误伤用户正文的空白）
 * - 纯附件消息（以 HEADER 开头）返回空串
 * - 正文 + footer 的情况，剥完去掉残留的换行
 */
export function stripAttachmentFooter(content: string): string {
  const idx = content.indexOf(ATTACHMENT_FOOTER_HEADER);
  if (idx === -1) return content;
  return content.slice(0, idx).replace(/\n+$/, '');
}
