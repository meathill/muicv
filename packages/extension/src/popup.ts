import type { CapturedJd } from '@muicv/shared';

const pairEl = document.getElementById('pair');
const pageEl = document.getElementById('page');
const captureBtn = document.getElementById('capture') as HTMLButtonElement | null;
const contributeBtn = document.getElementById('contribute') as HTMLButtonElement | null;

let lastJobId: string | null = null;

function setPair(text: string): void {
  if (pairEl) pairEl.textContent = text;
}
function setPage(text: string): void {
  if (pageEl) pageEl.textContent = text;
}

async function activeTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

chrome.runtime.sendMessage({ type: 'connect' }, (conn: { ok?: boolean; reason?: string }) => {
  if (conn?.ok) {
    setPair('已连接桌面端。');
    chrome.runtime.sendMessage({ type: 'drain' });
  } else if (conn?.reason === 'rejected') {
    setPair('桌面端拒绝了这次连接。');
  } else if (conn?.reason === 'unpaired') {
    setPair('等待你在桌面端点「允许」。');
  } else {
    setPair('桌面端没开。打开 Mui简历后再试。');
  }
});

void (async () => {
  const tab = await activeTab();
  if (!tab?.id || !tab.url || !/^https?:/i.test(tab.url)) {
    setPage('请打开一个招聘页面。');
    return;
  }
  chrome.tabs.sendMessage(
    tab.id,
    { type: 'extract' },
    (res: { offered?: boolean; jd?: CapturedJd | null } | undefined) => {
      void chrome.runtime.lastError;
      if (res?.jd) {
        setPage(`${res.jd.company ?? '未知公司'} · ${res.jd.title ?? '岗位'}`);
        if (captureBtn) captureBtn.disabled = false;
        return;
      }
      if (res?.offered) {
        setPage('识别到岗位页，但正文还不够，仍可试发。');
        if (captureBtn) captureBtn.disabled = false;
        return;
      }
      setPage('当前页尚未识别为岗位。可在支持的招聘站打开 JD。');
    },
  );
})();

captureBtn?.addEventListener('click', async () => {
  const tab = await activeTab();
  if (!tab?.id) return;
  captureBtn.disabled = true;
  setPage('正在抽取当前页…');
  chrome.tabs.sendMessage(tab.id, { type: 'extract' }, (extracted: { jd?: CapturedJd | null } | undefined) => {
    const jd = extracted?.jd;
    if (!jd) {
      setPage(chrome.runtime.lastError?.message ?? '没抽到足够的 JD 正文。');
      captureBtn.disabled = false;
      return;
    }
    chrome.runtime.sendMessage(
      { type: 'capture', jd },
      (res: { ok?: boolean; jobId?: string; queued?: boolean; error?: string }) => {
        if (res?.ok && res.jobId) {
          lastJobId = res.jobId;
          setPage('已发给桌面端。');
          if (contributeBtn) contributeBtn.disabled = false;
        } else if (res?.queued) {
          setPage('桌面端没开，已排队。');
        } else {
          setPage(res?.error ?? '发送失败。');
        }
        captureBtn.disabled = false;
      },
    );
  });
});

contributeBtn?.addEventListener('click', () => {
  if (!lastJobId) return;
  contributeBtn.disabled = true;
  chrome.runtime.sendMessage(
    { type: 'contribute', jobId: lastJobId },
    (res: { ok?: boolean; awarded?: number; duplicate?: boolean; error?: string }) => {
      if (res?.ok && res.duplicate) setPage('这条 JD 社区里已有，未重复发奖。');
      else if (res?.ok) setPage(`已贡献给社区，奖励 ${res.awarded ?? 0} token。`);
      else setPage(res?.error ?? '贡献失败。');
      contributeBtn.disabled = false;
    },
  );
});
