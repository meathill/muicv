/**
 * 极简 Markdown 解析与行内 HTML 处理。
 *
 * 纯 TypeScript 实现（无 JSX / React 依赖），方便独立单测与 Node 运行环境测试。
 */

export type Align = 'left' | 'center' | 'right';

export type Block =
  | { type: 'h'; level: 1 | 2 | 3 | 4; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'pre'; lang: string; code: string }
  | { type: 'hr' }
  | { type: 'quote'; text: string }
  | { type: 'frontmatter'; entries: Array<[string, string]> }
  | { type: 'table'; head: string[]; aligns: Align[]; rows: string[][] };

/** `| a | b | c |` → ['a', 'b', 'c']，去掉前后空字段。 */
export function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((c) => c.trim());
}

/** `| --- | :---: | ---: |` → ['left', 'center', 'right']；不是合法分隔行返回 null。 */
export function parseAlignRow(line: string): Align[] | null {
  if (!/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line)) return null;
  return splitTableRow(line).map((c) => {
    const left = c.startsWith(':');
    const right = c.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  });
}

export function parse(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.split('\n');
  let i = 0;

  // YAML frontmatter
  if (lines[0]?.trim() === '---') {
    let end = -1;
    for (let j = 1; j < lines.length; j++) {
      if (lines[j]?.trim() === '---') {
        end = j;
        break;
      }
    }
    if (end > 0) {
      const entries: Array<[string, string]> = [];
      for (let j = 1; j < end; j++) {
        const ln = lines[j] ?? '';
        const m = /^([\w-]+):\s*(.*)$/.exec(ln);
        if (m) entries.push([m[1] ?? '', m[2] ?? '']);
      }
      blocks.push({ type: 'frontmatter', entries });
      i = end + 1;
    }
  }

  while (i < lines.length) {
    const line = lines[i] ?? '';

    if (line.trim() === '') {
      i++;
      continue;
    }

    if (/^---+\s*$/.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ type: 'h', level: h[1]!.length as 1 | 2 | 3 | 4, text: h[2] ?? '' });
      i++;
      continue;
    }

    const fence = /^```(\w*)$/.exec(line);
    if (fence) {
      const lang = fence[1] ?? '';
      const start = i + 1;
      let end = lines.length;
      for (let j = start; j < lines.length; j++) {
        if (/^```\s*$/.test(lines[j] ?? '')) {
          end = j;
          break;
        }
      }
      blocks.push({ type: 'pre', lang, code: lines.slice(start, end).join('\n') });
      i = end + 1;
      continue;
    }

    if (/^>\s+/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s+/.test(lines[i] ?? '')) {
        quoteLines.push((lines[i] ?? '').replace(/^>\s+/, ''));
        i++;
      }
      blocks.push({ type: 'quote', text: quoteLines.join('\n') });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // GFM 表格：首行管道分隔 + 下一行是 `|---|---|` 才认。少了分隔行就 fall through 当段落。
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const aligns = parseAlignRow(lines[i + 1] ?? '');
      if (aligns) {
        const head = splitTableRow(line);
        const rows: string[][] = [];
        let j = i + 2;
        while (j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j] ?? '')) {
          rows.push(splitTableRow(lines[j] ?? ''));
          j++;
        }
        blocks.push({ type: 'table', head, aligns, rows });
        i = j;
        continue;
      }
    }

    const para: string[] = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i] ?? '';
      if (next.trim() === '' || /^(#{1,4}\s|---|>\s|```|\s*[-*]\s|\s*\d+\.\s|\s*\|.*\|\s*$)/.test(next)) break;
      para.push(next);
      i++;
    }
    blocks.push({ type: 'p', text: para.join(' ') });
  }
  return blocks;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * inline code 内容看起来像不像文件路径。命中：含 / 且有已知扩展名，
 * 或以已知 muicv 子目录段开头。
 */
export function looksLikePath(code: string): boolean {
  if (!/[/\\]/.test(code)) return false;
  if (/\.(md|pdf|json|txt|ya?ml|html?)$/i.test(code)) return true;
  if (/^(versions|targets|applications|experience|projects|reports|critiques)\//.test(code)) return true;
  return false;
}

// 占位用 Unicode Private Use Area 字符包裹，避免文本误匹配并保持 UTF-8 文本编码
const PH_OPEN = '\uE000';
const PH_CLOSE = '\uE001';

export function inlineHtml(text: string): string {
  const codes: string[] = [];
  let s = text.replace(/`([^`]+)`/g, (_m, code: string) => {
    if (looksLikePath(code)) {
      codes.push(
        `<button type="button" data-path="${escapeHtml(code)}" class="cursor-pointer rounded bg-fluff px-1 py-0.5 font-mono text-[12px] text-yellow-deep underline decoration-corgi decoration-2 underline-offset-2 hover:bg-yellow/30">${escapeHtml(code)}</button>`,
      );
    } else {
      codes.push(`<code class="rounded bg-fluff px-1 py-0.5 font-mono text-[12px]">${escapeHtml(code)}</code>`);
    }
    return `${PH_OPEN}CODE${codes.length - 1}${PH_CLOSE}`;
  });

  const links: string[] = [];
  // 1. 标准 markdown 链接 [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t: string, url: string) => {
    const trimmed = url.trim();
    const safeUrl = /^https?:\/\//i.test(trimmed) ? trimmed : '#';
    links.push(
      `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer" class="cursor-pointer text-yellow-deep underline decoration-corgi decoration-2 underline-offset-2 break-all">${escapeHtml(t)}</a>`,
    );
    return `${PH_OPEN}LINK${links.length - 1}${PH_CLOSE}`;
  });

  // 2. 裸 URL 自动转换为超链接（仅匹配合法的 ASCII URL 字符，并剥离末尾的英文标点符号）
  s = s.replace(/https?:\/\/[a-zA-Z0-9\-._~:/?#@!$&'*+,;=%]+/g, (fullUrl) => {
    let cleanUrl = fullUrl;
    let trailing = '';
    while (cleanUrl.length > 0 && /[.,:;!?]/.test(cleanUrl.slice(-1))) {
      trailing = cleanUrl.slice(-1) + trailing;
      cleanUrl = cleanUrl.slice(0, -1);
    }
    if (!cleanUrl) return fullUrl;
    links.push(
      `<a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noreferrer" class="cursor-pointer text-yellow-deep underline decoration-corgi decoration-2 underline-offset-2 break-all">${escapeHtml(cleanUrl)}</a>`,
    );
    return `${PH_OPEN}LINK${links.length - 1}${PH_CLOSE}${trailing}`;
  });

  s = escapeHtml(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^\s*][^*]*[^\s*])\*(?!\*)/g, '$1<em>$2</em>');

  s = s.replace(new RegExp(`${PH_OPEN}LINK(\\d+)${PH_CLOSE}`, 'g'), (_m, idx: string) => links[Number(idx)] ?? '');
  s = s.replace(new RegExp(`${PH_OPEN}CODE(\\d+)${PH_CLOSE}`, 'g'), (_m, idx: string) => codes[Number(idx)] ?? '');
  return s;
}
