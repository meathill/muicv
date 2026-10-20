import { useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { toast } from '../lib/toast';

/** 岗位导入（deep link / 岗位搜索面板）流水线的状态提示：匹配结论、生成完成后切到对应对话。 */
export function JdPipelineHost() {
  const switchConversation = useAppStore((s) => s.switchConversation);
  const loadConversations = useAppStore((s) => s.loadConversations);

  useEffect(() => {
    return window.muicv.jobs.onPipeline((payload) => {
      if (payload.status === 'queued' && payload.targetPath) {
        toast.info(`${payload.company ?? ''} ${payload.title ?? ''}`.trim() || '已保存岗位', '岗位导入');
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
        toast.error(payload.error ?? '处理岗位失败', '岗位导入');
      }
      if (payload.conversationId && payload.status === 'generating') {
        void loadConversations().then(() => switchConversation(payload.conversationId ?? ''));
      }
    });
  }, [loadConversations, switchConversation]);

  return null;
}
