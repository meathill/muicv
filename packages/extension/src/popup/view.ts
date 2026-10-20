import {
  estimateSubmitHoldMicro,
  JOB_SUBMIT_REWARD,
  type JobSubmitResponse,
  type JobSubmitVisibility,
  microToDisplay,
  type Workplace,
} from '@muicv/shared';

import type { ExtractedPage } from '../extract/page.ts';
import { type MessageKey, t, uiLocale } from '../i18n.ts';

/** popup 的纯渲染：状态 → HTML 字符串（所有外部文本都转义，文案走 i18n）。 */

/** 页面卡片只需要标题和 URL（排队中的提交从存储恢复时没有完整抽取结果）。 */
export type PageInfo = Pick<ExtractedPage, 'url' | 'title'> & Partial<Pick<ExtractedPage, 'markdown' | 'jsonLd'>>;

export type PopupState =
  | { kind: 'loading' }
  | { kind: 'needs-key'; error?: string }
  | { kind: 'unsupported'; message: string }
  | { kind: 'ready'; page: ExtractedPage; visibility: JobSubmitVisibility; balance: number | null }
  | { kind: 'submitting'; page: PageInfo; visibility: JobSubmitVisibility; step: number; queued?: boolean }
  | { kind: 'result'; page: PageInfo; result: JobSubmitResponse }
  | { kind: 'error'; page: PageInfo | null; message: string; needsTopup?: boolean };

export function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString(uiLocale().replace('_', '-'));
}

const WORKPLACE_KEY: Record<Workplace, MessageKey> = { remote: 'wpRemote', hybrid: 'wpHybrid', onsite: 'wpOnsite' };

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function pageCard(page: PageInfo): string {
  const chip = page.jsonLd?.length ? `<span class="chip">${esc(t('structuredChip'))}</span>` : '';
  return `<section class="page">
    <p class="page-title">${esc(page.title || t('untitledPage'))}</p>
    <p class="page-url">${esc(hostOf(page.url))}${chip}</p>
  </section>`;
}

export function costHint(page: ExtractedPage, visibility: JobSubmitVisibility): string {
  const hold = fmt(microToDisplay(estimateSubmitHoldMicro(page.markdown.length)));
  if (visibility === 'public') {
    return `<p class="hint"><b>${esc(t('hintPublicFree'))}</b>${esc(t('hintPublicRest', fmt(JOB_SUBMIT_REWARD), hold))}</p>`;
  }
  return `<p class="hint">${esc(t('hintPrivate', hold))}</p>`;
}

function toggle(visibility: JobSubmitVisibility, disabled: boolean): string {
  const opt = (value: JobSubmitVisibility, key: MessageKey) =>
    `<button type="button" class="seg${visibility === value ? ' on' : ''}" data-visibility="${value}"${disabled ? ' disabled' : ''}>${esc(t(key))}</button>`;
  return `<div class="segs" role="radiogroup">${opt('public', 'visPublic')}${opt('private', 'visPrivate')}</div>`;
}

const STEPS: MessageKey[] = ['stepRead', 'stepDetect', 'stepStore'];

function progress(step: number): string {
  return `<ol class="steps">${STEPS.map((key, i) => {
    const mark = i < step ? '✓' : i === step ? '<span class="dot"></span>' : '·';
    return `<li class="${i < step ? 'done' : i === step ? 'now' : ''}">${mark} ${esc(t(key))}</li>`;
  }).join('')}</ol>`;
}

/** 服务端的地域描述是中文；非中文界面改用原始 location。 */
function jobMeta(j: JobSubmitResponse['jobs'][number]): string {
  const where = uiLocale().startsWith('zh') ? j.restrictions || j.location : j.location;
  return [j.company, t(WORKPLACE_KEY[j.workplace] ?? 'wpOnsite'), where].filter(Boolean).join(' · ');
}

function resultView(r: JobSubmitResponse): string {
  const unsaved = r.found - r.created - r.duplicates;
  const head =
    r.found === 0
      ? `<p class="big">${esc(t('noJobsTitle'))}</p><p class="muted">${esc(uiLocale().startsWith('zh') && r.note ? r.note : t('noJobsDefault'))}</p>`
      : `<p class="big">${esc(t('foundTitle', r.found))}</p><p class="muted">${esc(
          t('foundSummary', r.created, r.duplicates) +
            (unsaved > 0 ? t('notStored', unsaved) : '') +
            (r.visibility === 'private' ? t('savedPrivately') : ''),
        )}</p>`;
  const money = [
    `<span class="pill">${esc(r.charged > 0 ? t('chargedPill', fmt(r.charged)) : t('freePill'))}</span>`,
    r.rewarded > 0 ? `<span class="pill reward">${esc(t('rewardPill', fmt(r.rewarded)))}</span>` : '',
    `<span class="pill ghost">${esc(t('balancePill', fmt(r.balance)))}</span>`,
  ].join('');
  const jobs = r.jobs
    .slice(0, 6)
    .map((j) => {
      const tag =
        j.status === 'new'
          ? `<span class="tag new">${esc(t('tagNew'))}</span>`
          : j.status === 'duplicate'
            ? `<span class="tag">${esc(t('tagDuplicate'))}</span>`
            : `<span class="tag warn">${esc(t('tagFailed'))}</span>`;
      const title = j.link
        ? `<a href="${esc(j.link)}" target="_blank" rel="noopener">${esc(j.title)}</a>`
        : esc(j.title);
      return `<li>${tag}<div><p class="job-title">${title}</p><p class="job-meta">${esc(jobMeta(j))}</p></div></li>`;
    })
    .join('');
  return `${head}<div class="pills">${money}</div>${jobs ? `<ul class="jobs">${jobs}</ul>` : ''}`;
}

const DASHBOARD = '<a href="https://muicv.com/dashboard" target="_blank" rel="noopener">muicv.com/dashboard</a>';

export function render(state: PopupState): string {
  switch (state.kind) {
    case 'loading':
      return `<p class="muted center">${esc(t('loading'))}</p>`;
    case 'needs-key': {
      const [before = '', after = ''] = t('setupBody', '\u0000').split('\u0000');
      return `<section class="setup">
        <p class="big">${esc(t('setupTitle'))}</p>
        <p class="muted">${esc(before)}${DASHBOARD}${esc(after)}</p>
        <input id="api-key" type="password" placeholder="mui_…" autocomplete="off" spellcheck="false" />
        ${state.error ? `<p class="error">${esc(state.error)}</p>` : ''}
        <button type="button" id="save-key" class="primary">${esc(t('save'))}</button>
      </section>`;
    }
    case 'unsupported':
      return `<p class="muted center">${esc(state.message)}</p>`;
    case 'ready':
      return `${pageCard(state.page)}${toggle(state.visibility, false)}${costHint(state.page, state.visibility)}
        <button type="button" id="submit" class="primary">${esc(t(state.visibility === 'public' ? 'submitPublic' : 'submitPrivate'))}</button>
        ${state.balance !== null ? `<p class="muted small center">${esc(t('balance', fmt(state.balance)))}</p>` : ''}`;
    case 'submitting':
      return `${pageCard(state.page)}${toggle(state.visibility, true)}${progress(state.step)}
        ${state.queued ? `<p class="muted small">${esc(t('queuedNote'))}</p>` : ''}
        <button type="button" class="primary" disabled>${esc(t('processing'))}</button>`;
    case 'result':
      return `${pageCard(state.page)}${resultView(state.result)}
        <div class="row"><a class="secondary" href="https://muicv.com/jobs" target="_blank" rel="noopener">${esc(t('browseJobs'))}</a></div>`;
    case 'error':
      return `${state.page ? pageCard(state.page) : ''}<p class="error">${esc(state.message)}</p>
        <div class="row">${state.needsTopup ? `<a class="secondary" href="https://muicv.com/dashboard" target="_blank" rel="noopener">${esc(t('topUp'))}</a>` : ''}
        <button type="button" id="retry" class="primary">${esc(t('retry'))}</button></div>`;
  }
}
