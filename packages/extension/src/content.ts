import { fromDocument } from './extractors/query.ts';
import { extractCapturedJd, shouldOfferCapture } from './extractors/registry.ts';

const HOST_ID = 'muicv-jd-banner';

function mountBanner(): void {
  if (document.getElementById(HOST_ID)) return;
  const q = fromDocument(document, location.href);
  if (!shouldOfferCapture(q)) return;

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'all:initial;position:fixed;z-index:2147483646;left:12px;right:12px;bottom:12px;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .bar {
        display: flex; align-items: center; gap: 12px;
        font: 14px/1.4 Nunito, "PingFang SC", sans-serif;
        color: #3a2e23; background: #fdfaf2;
        border: 2px solid #3a2e23; border-radius: 6px;
        padding: 10px 12px;
        box-shadow: 0 4px 0 0 #3a2e23;
      }
      .copy { flex: 1; min-width: 0; }
      .eyebrow { font: 700 12px/1.2 ui-monospace, Menlo, monospace; letter-spacing: .12em; text-transform: uppercase; color: #b3851c; margin: 0 0 2px; }
      .title { margin: 0; font-size: 14px; font-weight: 800; }
      .status { margin: 2px 0 0; font-size: 12px; color: #766852; }
      button {
        appearance: none; border: 2px solid #3a2e23; border-radius: 6px;
        background: #e6c34a; color: #3a2e23; font: 700 14px/1 Nunito, sans-serif;
        padding: 8px 12px; cursor: pointer; box-shadow: 0 3px 0 0 #3a2e23; white-space: nowrap;
      }
      button:active { transform: translateY(2px); box-shadow: 0 1px 0 0 #3a2e23; }
      button:disabled { opacity: .55; cursor: default; box-shadow: none; }
      .ghost { background: #fdfaf2; }
    </style>
    <div class="bar">
      <div class="copy">
        <p class="eyebrow">Mui简历</p>
        <p class="title">发现岗位</p>
        <p class="status" id="status">点一下发给桌面端，判断是否适合你投。</p>
      </div>
      <button type="button" id="send">发给 Mui简历</button>
    </div>
  `;
  document.documentElement.appendChild(host);

  const send = shadow.getElementById('send') as HTMLButtonElement | null;
  const status = shadow.getElementById('status');
  send?.addEventListener('click', () => {
    const jd = extractCapturedJd(fromDocument(document, location.href));
    if (!jd) {
      if (status) status.textContent = '这一页没抽到足够的 JD 正文，试试复制粘贴到桌面端。';
      return;
    }
    if (send) send.disabled = true;
    if (status) status.textContent = '正在发给桌面端…';
    chrome.runtime.sendMessage(
      { type: 'capture', jd },
      (res: { ok?: boolean; queued?: boolean; jobId?: string; error?: string; reason?: string }) => {
        if (res?.ok) {
          if (status) status.textContent = '已发给 Mui简历，正在判断是否适合投。';
          if (send) send.textContent = '已发送';
          return;
        }
        if (res?.queued) {
          if (status) status.textContent = '桌面端没开，已排队。打开 Mui简历后会自动送过去。';
          if (send) {
            send.disabled = false;
            send.textContent = '已排队';
          }
          return;
        }
        if (status) status.textContent = res?.error ?? '发送失败，请确认桌面端已打开。';
        if (send) send.disabled = false;
      },
    );
  });
}

chrome.runtime.onMessage.addListener((msg: { type?: string }, _sender, sendResponse) => {
  if (msg.type !== 'extract') return false;
  const q = fromDocument(document, location.href);
  sendResponse({
    offered: shouldOfferCapture(q),
    jd: extractCapturedJd(q),
  });
  return true;
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountBanner, { once: true });
} else {
  mountBanner();
}
