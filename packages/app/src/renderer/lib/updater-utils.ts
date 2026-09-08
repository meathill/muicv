/**
 * 将 electron-updater 抛出的底层原始错误格式化为用户友好的简要提示。
 * 规避堆栈、HTTP 响应头、完整 URL 撑爆侧边栏布局。
 */
export function formatUpdaterError(raw?: string): string {
  if (!raw) return '检查更新失败，请稍后重试';
  const lower = raw.toLowerCase();

  // 404 / 缺少更新描述清单（GitHub Releases 尚未发布该版本资产）
  if (
    lower.includes('404') ||
    lower.includes('cannot find') ||
    lower.includes('latest-mac.yml') ||
    lower.includes('latest.yml') ||
    lower.includes('latest-linux.yml')
  ) {
    return '未检测到新发布版本';
  }

  // 网络异常 / 超时 / 离线
  if (
    lower.includes('err_internet_disconnected') ||
    lower.includes('enotfound') ||
    lower.includes('net::') ||
    lower.includes('timeout') ||
    lower.includes('timedout') ||
    lower.includes('timed out') ||
    lower.includes('fetch failed') ||
    lower.includes('econnrefused') ||
    lower.includes('network')
  ) {
    return '网络连接异常，请检查网络设置';
  }

  // 权限问题
  if (lower.includes('eacces') || lower.includes('eperm') || lower.includes('permission')) {
    return '更新安装权限不足';
  }

  // 提取首行并去除 URL 与 HTTP 响应状态码等脏串
  const firstLine = raw.split('\n')[0]?.trim() ?? '';
  const cleaned = firstLine
    .replace(/https?:\/\/\S+/g, '')
    .replace(/HttpError:\s*\d+/gi, '')
    .replace(/[{}":]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned && cleaned.length <= 50 ? cleaned : '检查更新失败，请稍后重试';
}
