import { FileTextIcon, NotePencilIcon, TargetIcon } from '@phosphor-icons/react';

import { CONVERSATION_TYPE_META, type ConversationType } from '../../shared/types.ts';
import { CONVERSATION_TYPE_ICON } from '../lib/conversation-type-icon';
import { useAppStore } from '../lib/store';
import { CorgiMascot } from './corgi-mascot';

export function CenteredCard({
  title,
  body,
  ctaLabel,
  onCta,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-md rounded-xl border-2 border-ink bg-cream p-7 text-center shadow-[0_4px_0_0_var(--color-ink)]">
        <CorgiMascot className="mx-auto h-16 w-16" />
        <h2 className="mt-3 text-2xl font-extrabold text-ink">{title}</h2>
        <p className="mt-2 text-[14px] text-ink-soft">{body}</p>
        <button
          type="button"
          onClick={onCta}
          className="press mt-5 inline-flex rounded-lg bg-yellow px-5 py-2 text-[14px] font-bold text-ink"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

export function NoConversationCard() {
  const createConversation = useAppStore((s) => s.createConversation);
  const starts = [
    {
      title: '导入现有简历',
      body: '创建整理对话，然后把 PDF / DOCX / Markdown 拖进输入框。',
      Icon: FileTextIcon,
      onClick: () => void createConversation('core', '从现有简历整理素材'),
    },
    {
      title: '记录一段经历',
      body: '先讲一个项目或一段工作，Mui 会追问并整理成简历素材。',
      Icon: NotePencilIcon,
      onClick: () => void createConversation('core', '记录第一段工作经历'),
    },
    {
      title: '针对岗位生成简历',
      body: '已经有素材时，贴岗位链接或描述，生成更对口的简历版本。',
      Icon: TargetIcon,
      onClick: () => void createConversation('generate', '针对岗位生成简历'),
    },
  ];

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-3xl">
        <CorgiMascot className="h-16 w-16" />
        <h2 className="mt-4 text-2xl font-extrabold text-ink">先选一个起点</h2>
        <p className="mt-2 max-w-xl text-[14px] leading-[1.7] text-ink-soft">
          不需要先理解所有对话类型。最常见的开始方式是导入简历、记录经历，或者直接针对一个岗位生成版本。
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {starts.map(({ title, body, Icon, onClick }) => (
            <button
              key={title}
              type="button"
              onClick={onClick}
              className="group flex min-h-[170px] flex-col items-start rounded-xl border-2 border-ink bg-cream p-4 text-left shadow-[0_3px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 hover:bg-fluff"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-yellow text-ink">
                <Icon size={18} weight="bold" />
              </span>
              <span className="mt-4 text-[14px] font-extrabold text-ink">{title}</span>
              <span className="mt-2 text-[12px] leading-[1.6] text-ink-soft">{body}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-mute">熟练以后，也可以继续用左栏的 + 新建选择完整对话类型。</p>
      </div>
    </div>
  );
}

export function EmptyConversation({ type }: { type: ConversationType }) {
  const meta = CONVERSATION_TYPE_META[type];
  const TypeIcon = CONVERSATION_TYPE_ICON[type];
  return (
    <div className="mt-10 flex flex-col items-center text-center">
      <TypeIcon size={48} weight="duotone" className="text-yellow-deep" />
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink">{meta.label}</h2>
      <p className="mt-2 max-w-md text-[14px] leading-[1.7] text-ink-soft">{meta.tagline}</p>
      <p className="mt-4 max-w-md text-[12px] text-mute">下面输入框直接说就行 —— 例：</p>
      <p className="mt-1 max-w-md text-[12px] text-ink-soft">
        "{meta.placeholder.replace(/^比如：/, '').replace(/^「|」$/g, '')}"
      </p>
      {type === 'core' && (
        <p className="mt-4 max-w-md text-[12px] leading-[1.6] text-mute">
          也可以把现成简历（PDF / DOCX / Markdown / 文本）直接拖到这里，我帮你解析后落到素材库。
        </p>
      )}
    </div>
  );
}

export function AiSetupCard({ onGoSettings, onDismiss }: { onGoSettings: () => void; onDismiss: () => void }) {
  return (
    <div className="rounded-xl border-2 border-ink bg-fluff p-5 shadow-[0_4px_0_0_var(--color-ink)]">
      <div className="flex items-start gap-3">
        <CorgiMascot className="h-10 w-10 shrink-0" />
        <div className="flex-1">
          <h3 className="text-[16px] font-extrabold text-ink">AI 服务还没连上</h3>
          <p className="mt-1.5 text-[14px] leading-[1.6] text-ink-soft">
            Mui 需要联网调用 AI 才能帮你写简历。免费版当前需要连一下你自己的 AI 余额（叫
            muirouter，类似话费充值），或升级 Pro 会员后由我们提供。
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onGoSettings}
              className="press inline-flex items-center justify-center rounded-lg bg-yellow px-4 py-2 text-[14px] font-bold text-ink"
            >
              去设置完成 →
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg px-3 py-2 text-[12px] text-mute hover:text-ink"
            >
              先关掉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
