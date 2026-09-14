import type { CapturedJd } from '@muicv/shared';

import { connect, contributeJob, drainQueue, enqueueJd, postJd, wakeApp } from './lib/bridge.ts';

type CaptureMsg = { type: 'capture'; jd: CapturedJd };
type ContributeMsg = { type: 'contribute'; jobId: string };
type ConnectMsg = { type: 'connect' };
type DrainMsg = { type: 'drain' };

chrome.runtime.onMessage.addListener(
  (msg: CaptureMsg | ContributeMsg | ConnectMsg | DrainMsg, _sender, sendResponse) => {
    void (async () => {
      if (msg.type === 'connect') {
        const conn = await connect();
        sendResponse(conn);
        return;
      }
      if (msg.type === 'drain') {
        const conn = await connect();
        if (!conn.ok) {
          sendResponse({ ok: false, reason: conn.reason });
          return;
        }
        const sent = await drainQueue(conn);
        sendResponse({ ok: true, sent });
        return;
      }
      if (msg.type === 'capture') {
        const conn = await connect();
        if (!conn.ok) {
          await enqueueJd(msg.jd);
          wakeApp();
          sendResponse({ ok: false, queued: true, reason: conn.reason });
          return;
        }
        try {
          const posted = await postJd(conn, msg.jd);
          sendResponse({ ok: true, ...posted });
        } catch (err) {
          await enqueueJd(msg.jd);
          sendResponse({ ok: false, queued: true, error: err instanceof Error ? err.message : String(err) });
        }
        return;
      }
      if (msg.type === 'contribute') {
        const conn = await connect();
        if (!conn.ok) {
          sendResponse({ ok: false, reason: conn.reason });
          return;
        }
        try {
          const result = await contributeJob(conn, msg.jobId);
          sendResponse({ ok: true, ...result });
        } catch (err) {
          sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) });
        }
      }
    })();
    return true;
  },
);

chrome.alarms.create('drain', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'drain') return;
  void (async () => {
    const conn = await connect();
    if (conn.ok) await drainQueue(conn);
  })();
});
