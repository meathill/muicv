import { useEffect, useState } from 'react';
import { useAppStore } from '../lib/store';
import { toast } from '../lib/toast';
import { ConfirmDialog } from './confirm-dialog';

/** 浏览器扩展配对确认 + 收到 JD 后切到对应对话。 */
export function ExtensionBridgeHost() {
  const [nonce, setNonce] = useState<string | null>(null);
  const switchConversation = useAppStore((s) => s.switchConversation);
  const loadConversations = useAppStore((s) => s.loadConversations);

  useEffect(() => {
    const offPair = window.muicv.extension.onPairRequest((payload) => {
      setNonce(payload.nonce);
    });
    const offJob = window.muicv.extension.onJob((payload) => {
      if (payload.status === 'queued' && payload.targetPath) {
        toast.info(`${payload.company ?? ''} ${payload.title ?? ''}`.trim() || '已保存岗位', '浏览器扩展');
      }
      if (payload.status === 'suitable') {
        toast.success(payload.match?.reason ?? '匹配度不错，正在生成针对性简历。', '适合投');
      }
      if (payload.status === 'weak') {
        toast.warning(payload.match?.reason ?? '有缺口。可在对话里让我仍然生成。', '部分匹配');
      }
      if (payload.status === 'ready' && payload.conversationId) {
        toast.success('针对性简历已生成。', 'Mui简历');
        void loadConversations().then(() => switchConversation(payload.conversationId ?? ''));
      }
      if (payload.status === 'error') {
        toast.error(payload.error ?? '处理岗位失败', '浏览器扩展');
      }
      if (payload.conversationId && payload.status === 'generating') {
        void loadConversations().then(() => switchConversation(payload.conversationId ?? ''));
      }
    });
    return () => {
      offPair();
      offJob();
    };
  }, [loadConversations, switchConversation]);

  return (
    <ConfirmDialog
      open={nonce !== null}
      title="浏览器扩展想连接"
      description="允许后，招聘页上点「发给 Mui简历」会把 JD 送到这个窗口。"
      confirmLabel="允许"
      cancelLabel="拒绝"
      onConfirm={() => {
        if (nonce) void window.muicv.extension.pairDecide(nonce, true);
        setNonce(null);
      }}
      onCancel={() => {
        if (nonce) void window.muicv.extension.pairDecide(nonce, false);
        setNonce(null);
      }}
    />
  );
}
