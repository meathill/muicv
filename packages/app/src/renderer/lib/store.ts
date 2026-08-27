import { create } from 'zustand';

import type {
  AppConfig,
  ArtifactRef,
  ChatMessage,
  ChatMessageFeedback,
  Conversation,
  ConversationSummary,
  ConversationType,
  Profile,
  SessionInfo,
  ToolCallRecord,
  UpdaterStatus,
} from '../../shared/types.ts';
import { DEFAULT_CONFIG } from '../../shared/types.ts';

type View = 'login' | 'onboarding' | 'chat' | 'settings';

export type OnboardingStart = 'resume' | 'experience' | 'blank';

type AppStore = {
  view: View;
  setView: (v: View) => void;

  /** 启动期，等 loadConfig + checkSession + ensureDefaultProfile 跑完前 true */
  bootstrapping: boolean;

  config: AppConfig;
  loadConfig: () => Promise<void>;
  patchConfig: (
    patch: Partial<
      Pick<
        AppConfig,
        | 'muicvApiBase'
        | 'defaultModel'
        | 'llmReasoningEffort'
        | 'muicvApiKey'
        | 'customLlmBase'
        | 'customLlmKey'
        | 'onboardingCompleted'
      >
    >,
  ) => Promise<void>;

  /** 当前激活的 profile（派生）。 */
  activeProfile: Profile | null;
  createProfileInDocuments: (name: string) => Promise<{ ok: boolean; message?: string | undefined }>;
  createProfilePickFolder: (name: string) => Promise<{ ok: boolean; message?: string | undefined }>;
  switchProfile: (id: string) => Promise<void>;
  renameProfile: (id: string, name: string) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
  openProfileInFinder: (id: string) => Promise<void>;

  /** 已登录的 session，未登录 / 未验证 = null */
  session: SessionInfo | null;
  setSession: (s: SessionInfo | null) => void;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;

  // -------------------- Conversations --------------------

  /** 当前 profile 下的对话列表（轻量 summary，不含 messages）。 */
  conversations: ConversationSummary[];
  /** 当前激活的 conversation（含 messages）。 */
  activeConversation: Conversation | null;
  /** 加载当前 profile 的对话列表（左栏渲染用）。 */
  loadConversations: () => Promise<void>;
  /** 切到某个 conversation：拉它的完整内容。 */
  switchConversation: (convId: string) => Promise<void>;
  /** 新建对话；自动切到这个新对话。 */
  createConversation: (type: ConversationType, title?: string) => Promise<Conversation>;
  renameConversation: (convId: string, title: string) => Promise<void>;
  removeConversation: (convId: string) => Promise<void>;

  // 对话流操作（作用于 activeConversation.messages）
  pushMessage: (m: ChatMessage) => void;
  appendAssistantText: (id: string, delta: string) => void;
  appendReasoningText: (id: string, delta: string) => void;
  attachToolCall: (id: string, call: ToolCallRecord) => void;
  updateToolOutput: (id: string, toolCallId: string, output: string) => void;
  attachArtifact: (id: string, artifact: ArtifactRef) => void;
  /** 清空当前 activeConversation 的消息（不删 conversation 本身）。 */
  resetMessages: () => void;
  /**
   * 给某条消息的 feedback 缓存做浅 patch（内存 + 异步写盘）。
   * 写盘失败不抛——云端 D1 是 source of truth，本地只是 UI 按钮选中态。
   */
  patchMessageFeedback: (messageId: string, patch: Partial<ChatMessageFeedback>) => void;
  /**
   * 直接覆盖 session.balance（显示 token）。点完赞 / 踩 / 意见建议后用 server 返回的最新余额刷一下，
   * Settings 的 PlanCard 自动反映。
   */
  applyBalance: (balance: number) => void;

  /** 首次引导写入 chatbox 的一次性草稿。 */
  onboardingDraft: string | null;
  completeOnboarding: (start: OnboardingStart) => Promise<void>;
  skipOnboarding: () => Promise<void>;
  clearOnboardingDraft: () => void;

  /** 当前 streaming 的 channelId，none 表示空闲。 */
  activeChannel: string | null;
  setActiveChannel: (c: string | null) => void;

  // -------------------- 三栏 UI 状态 --------------------

  leftCollapsed: boolean;
  rightCollapsed: boolean;
  /**
   * 右栏 tree / preview 是两个**独立**通道，不互斥：
   *   - rightPanelTreeRoot：文件树根目录（null = 树没开）
   *   - rightPanelPreviewPath：当前预览的文件（null = 没在预览）
   *
   * Preview 以 overlay 形式盖在 tree 上面，关掉 preview 后树状态原封不动
   * （expand 的目录 / 已加载的子项都还在内存里）。
   */
  rightPanelTreeRoot: string | null;
  rightPanelPreviewPath: string | null;
  /** 右栏宽度（像素），可拖拽调整，localStorage 持久化。 */
  rightPanelWidth: number;
  toggleLeft: () => void;
  toggleRight: () => void;
  /** 打开文件树（path 缺省时用当前 profile 的 workspaceDir）。 */
  openFileTree: (path?: string) => void;
  /** 打开文件预览（被工件卡片 / 文件树点击调用）。 */
  openRightPanel: (path: string) => void;
  /** 只关 preview overlay，保留树。 */
  closePreview: () => void;
  /** 关掉整个右栏（树 + preview 全清）。 */
  closeRightPanel: () => void;
  /** 拖拽 resize handle 时调用，自动 clamp + 写 localStorage。 */
  setRightPanelWidth: (w: number) => void;

  // -------------------- Editor view (issue #3) --------------------

  /** 当前打开的简历素材文件绝对路径；null = 还没选文件。 */
  editorOpenPath: string | null;
  /** 编辑器当前内容（CodeMirror 双向同步）。 */
  editorBuffer: string;
  /** 上次 load / save 后的快照，用来算 dirty。 */
  editorOriginal: string;
  /** 正在保存中（disable 按钮 + 状态文案）。 */
  editorSaving: boolean;
  /** 上次成功保存的时间戳，null = 没保存过。 */
  editorLastSavedAt: number | null;
  /** 最近一次错误（保存 / 加载失败的中文提示），null = 无。 */
  editorError: string | null;

  /** 打开一个文件到编辑器。会清掉之前的 buffer / dirty / 错误。 */
  openEditorFile: (path: string) => Promise<void>;
  /** CodeMirror onChange 写回 buffer。 */
  setEditorBuffer: (text: string) => void;
  /** 显式保存当前 buffer。返回 ok 让调用方决定 UI 反馈。 */
  saveEditor: () => Promise<{ ok: boolean }>;
  /** 关掉当前文件，清状态（不带 dirty 检查，调用方应先确认）。 */
  closeEditorFile: () => void;

  // -------------------- Auto updater --------------------

  /** electron-updater 推过来的最新状态。dev 模式下 skipped=true，UI 不渲染。 */
  updaterStatus: UpdaterStatus;
  setUpdaterStatus: (status: UpdaterStatus) => void;
};

/** 路由：未登录 → login；已登录首次 → onboarding；之后保持用户所在视图。 */
export function routeFor(session: SessionInfo | null, current: View, onboardingCompleted: boolean): View {
  if (!session) return 'login';
  if (!onboardingCompleted) return 'onboarding';
  if (current === 'login') return 'chat';
  if (current === 'onboarding') return 'chat';
  return current;
}

/** fs:write 错误码翻译表（与 main/fs-edit.ts 的 WriteError 对齐）。 */
const WRITE_ERROR_MESSAGES: Record<string, string> = {
  'bad-input': '参数无效',
  'no-workspace': '没有激活的职业档案',
  'out-of-workspace': '路径不在工作目录内',
  'protected-dir': '不能编辑 .claude/ 内的文件',
  'unsupported-ext': '只支持 .md / .markdown 文件',
  'too-large': '文件超过 1MB 上限',
  'io-error': '写入失败，请检查文件是否被占用',
};

function translateWriteError(code: string): string {
  return WRITE_ERROR_MESSAGES[code] ?? `写入失败：${code}`;
}

// 右栏宽度持久化：localStorage 简单存数字，带边界 clamp。
const RIGHT_WIDTH_KEY = 'muicv:rightPanelWidth';
const RIGHT_WIDTH_MIN = 320;
const RIGHT_WIDTH_MAX = 900;
const RIGHT_WIDTH_DEFAULT = 440;

function loadRightWidth(): number {
  try {
    const raw = localStorage.getItem(RIGHT_WIDTH_KEY);
    const n = raw ? Number(raw) : Number.NaN;
    if (Number.isFinite(n) && n >= RIGHT_WIDTH_MIN && n <= RIGHT_WIDTH_MAX) return n;
  } catch {}
  return RIGHT_WIDTH_DEFAULT;
}

function clampRightWidth(w: number): number {
  return Math.max(RIGHT_WIDTH_MIN, Math.min(RIGHT_WIDTH_MAX, w));
}

function deriveActiveProfile(cfg: AppConfig): Profile | null {
  if (!cfg.activeProfileId) return null;
  return cfg.profiles.find((p) => p.id === cfg.activeProfileId) ?? null;
}

/** 把一份 conversation 的元数据折叠成 summary（用于更新左栏列表里的某行）。 */
function toSummary(conv: Conversation): ConversationSummary {
  return {
    id: conv.id,
    profileId: conv.profileId,
    type: conv.type,
    title: conv.title,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
    messageCount: conv.messages.length,
  };
}

function onboardingTitle(start: OnboardingStart): string {
  if (start === 'resume') return '从现有简历整理素材';
  if (start === 'experience') return '记录第一段工作经历';
  return '从零整理职业素材';
}

function onboardingDraftFor(start: OnboardingStart): string {
  if (start === 'resume') {
    return '我想先导入一份现有简历，请帮我解析成可复用的职业素材。';
  }
  if (start === 'experience') {
    return '我先讲一段经历，请帮我追问细节，并整理成适合写进简历的素材。';
  }
  return '我想从零整理职业素材，请一步一步问我需要补充哪些经历、项目和技能。';
}

export const useAppStore = create<AppStore>((set, get) => ({
  view: 'login',
  setView: (v) => set({ view: v }),

  bootstrapping: true,

  config: DEFAULT_CONFIG,
  activeProfile: null,
  loadConfig: async () => {
    const cfg = await window.muicv.config.get();
    set({ config: cfg, activeProfile: deriveActiveProfile(cfg) });
  },
  patchConfig: async (patch) => {
    const next = await window.muicv.config.set(patch);
    set({ config: next, activeProfile: deriveActiveProfile(next) });
  },
  createProfileInDocuments: async (name) => {
    const r = await window.muicv.profile.createInDocuments(name);
    if (r.ok) {
      await get().loadConfig();
      await get().loadConversations();
    }
    return { ok: r.ok, message: r.message };
  },
  createProfilePickFolder: async (name) => {
    const r = await window.muicv.profile.pickFolder(name);
    if (r.ok) {
      await get().loadConfig();
      await get().loadConversations();
    }
    return { ok: r.ok, message: r.message };
  },
  switchProfile: async (id) => {
    const next = await window.muicv.profile.switchTo(id);
    set({ config: next, activeProfile: deriveActiveProfile(next), activeConversation: null });
    await get().loadConversations();
  },
  renameProfile: async (id, name) => {
    const next = await window.muicv.profile.rename(id, name);
    set({ config: next, activeProfile: deriveActiveProfile(next) });
  },
  removeProfile: async (id) => {
    const next = await window.muicv.profile.remove(id);
    set({ config: next, activeProfile: deriveActiveProfile(next), activeConversation: null });
    await get().loadConversations();
  },
  openProfileInFinder: (id) => window.muicv.profile.openInFinder(id),

  session: null,
  setSession: (s) => {
    set({ session: s });
    set((st) => ({ view: routeFor(s, st.view, st.config.onboardingCompleted) }));
  },
  refreshSession: async () => {
    await get().loadConfig();
    const result = await window.muicv.session.check();
    if (result.status === 'ok') {
      get().setSession(result.session);
    } else {
      get().setSession(null);
    }
  },
  logout: async () => {
    await window.muicv.session.logout();
    await get().loadConfig();
    get().setSession(null);
    set({ activeConversation: null, conversations: [] });
  },

  // -------------------- Conversations --------------------

  conversations: [],
  activeConversation: null,
  loadConversations: async () => {
    const profileId = get().activeProfile?.id;
    if (!profileId) {
      set({ conversations: [] });
      return;
    }
    const list = await window.muicv.conversation.list(profileId);
    set({ conversations: list });
  },
  switchConversation: async (convId) => {
    const profileId = get().activeProfile?.id;
    if (!profileId) return;
    const conv = await window.muicv.conversation.get(profileId, convId);
    // 切对话 = 用户想聊天了，自动从 settings/其他 view 拉回 chat
    set({ activeConversation: conv, view: 'chat' });
  },
  createConversation: async (type, title) => {
    const profileId = get().activeProfile?.id;
    if (!profileId) throw new Error('no-active-profile');
    const conv = await window.muicv.conversation.create({ profileId, type, ...(title ? { title } : {}) });
    // 新建对话 = 用户已经选好类型要开始了，自动切到 chat
    set((st) => ({
      conversations: [toSummary(conv), ...st.conversations],
      activeConversation: conv,
      view: 'chat',
    }));
    return conv;
  },
  renameConversation: async (convId, title) => {
    const profileId = get().activeProfile?.id;
    if (!profileId) return;
    await window.muicv.conversation.rename(profileId, convId, title);
    set((st) => ({
      conversations: st.conversations.map((c) => (c.id === convId ? { ...c, title } : c)),
      activeConversation:
        st.activeConversation?.id === convId ? { ...st.activeConversation, title } : st.activeConversation,
    }));
  },
  removeConversation: async (convId) => {
    const profileId = get().activeProfile?.id;
    if (!profileId) return;
    await window.muicv.conversation.remove(profileId, convId);
    set((st) => ({
      conversations: st.conversations.filter((c) => c.id !== convId),
      activeConversation: st.activeConversation?.id === convId ? null : st.activeConversation,
    }));
  },

  pushMessage: (m) =>
    set((s) => {
      if (!s.activeConversation) return {};
      return {
        activeConversation: { ...s.activeConversation, messages: [...s.activeConversation.messages, m] },
      };
    }),
  appendAssistantText: (id, delta) =>
    set((s) => {
      if (!s.activeConversation) return {};
      return {
        activeConversation: {
          ...s.activeConversation,
          messages: s.activeConversation.messages.map((m) => (m.id === id ? { ...m, content: m.content + delta } : m)),
        },
      };
    }),
  appendReasoningText: (id, delta) =>
    set((s) => {
      if (!s.activeConversation) return {};
      return {
        activeConversation: {
          ...s.activeConversation,
          messages: s.activeConversation.messages.map((m) =>
            m.id === id ? { ...m, reasoning: (m.reasoning ?? '') + delta } : m,
          ),
        },
      };
    }),
  attachToolCall: (id, call) =>
    set((s) => {
      if (!s.activeConversation) return {};
      return {
        activeConversation: {
          ...s.activeConversation,
          messages: s.activeConversation.messages.map((m) =>
            m.id === id ? { ...m, toolCalls: [...(m.toolCalls ?? []), call] } : m,
          ),
        },
      };
    }),
  updateToolOutput: (id, toolCallId, output) =>
    set((s) => {
      if (!s.activeConversation) return {};
      return {
        activeConversation: {
          ...s.activeConversation,
          messages: s.activeConversation.messages.map((m) =>
            m.id === id
              ? {
                  ...m,
                  toolCalls: (m.toolCalls ?? []).map((c) => (c.id === toolCallId ? { ...c, output } : c)),
                }
              : m,
          ),
        },
      };
    }),
  attachArtifact: (id, artifact) =>
    set((s) => {
      if (!s.activeConversation) return {};
      return {
        activeConversation: {
          ...s.activeConversation,
          messages: s.activeConversation.messages.map((m) =>
            m.id === id ? { ...m, artifacts: [...(m.artifacts ?? []), artifact] } : m,
          ),
        },
      };
    }),
  resetMessages: () =>
    set((s) => (s.activeConversation ? { activeConversation: { ...s.activeConversation, messages: [] } } : {})),
  patchMessageFeedback: (messageId, patch) => {
    const state = get();
    const conv = state.activeConversation;
    if (!conv) return;
    set({
      activeConversation: {
        ...conv,
        messages: conv.messages.map((m) =>
          m.id === messageId ? { ...m, feedback: { ...(m.feedback ?? {}), ...patch } } : m,
        ),
      },
    });
    // 异步写盘；本地缓存丢失也不影响业务，所以失败静默
    const profileId = state.activeProfile?.id;
    if (!profileId) return;
    void window.muicv.conversation.setMessageFeedback(profileId, conv.id, messageId, patch).catch(() => {});
  },
  applyBalance: (balance) => set((s) => (s.session ? { session: { ...s.session, balance } } : {})),

  onboardingDraft: null,
  completeOnboarding: async (start) => {
    const profileId = get().activeProfile?.id;
    const conversation = profileId ? await get().createConversation('core', onboardingTitle(start)) : null;
    const next = await window.muicv.config.set({ onboardingCompleted: true });
    set({
      config: next,
      activeProfile: deriveActiveProfile(next),
      onboardingDraft: onboardingDraftFor(start),
      view: 'chat',
      ...(conversation ? { activeConversation: conversation } : {}),
    });
  },
  skipOnboarding: async () => {
    const next = await window.muicv.config.set({ onboardingCompleted: true });
    set({ config: next, activeProfile: deriveActiveProfile(next), onboardingDraft: null, view: 'chat' });
  },
  clearOnboardingDraft: () => set({ onboardingDraft: null }),

  activeChannel: null,
  setActiveChannel: (c) => set({ activeChannel: c }),

  // -------------------- 三栏 UI --------------------

  leftCollapsed: false,
  rightCollapsed: true,
  rightPanelTreeRoot: null,
  rightPanelPreviewPath: null,
  rightPanelWidth: loadRightWidth(),
  toggleLeft: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
  toggleRight: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),
  openFileTree: (path) => {
    const root = path ?? get().activeProfile?.dir;
    if (!root) return;
    set({ rightPanelTreeRoot: root, rightCollapsed: false });
  },
  openRightPanel: (path) => set({ rightPanelPreviewPath: path }),
  closePreview: () => set({ rightPanelPreviewPath: null }),
  closeRightPanel: () => set({ rightPanelTreeRoot: null, rightPanelPreviewPath: null, rightCollapsed: true }),
  setRightPanelWidth: (w) => {
    const clamped = clampRightWidth(w);
    set({ rightPanelWidth: clamped });
    try {
      localStorage.setItem(RIGHT_WIDTH_KEY, String(clamped));
    } catch {}
  },

  // -------------------- Editor view --------------------

  editorOpenPath: null,
  editorBuffer: '',
  editorOriginal: '',
  editorSaving: false,
  editorLastSavedAt: null,
  editorError: null,

  openEditorFile: async (path) => {
    set({ editorError: null });
    const content = await window.muicv.fs.read(path);
    if (content === null) {
      set({
        editorOpenPath: path,
        editorBuffer: '',
        editorOriginal: '',
        editorError: '文件读取失败（可能已被外部移动 / 删除）',
      });
      return;
    }
    set({
      editorOpenPath: path,
      editorBuffer: content,
      editorOriginal: content,
      editorLastSavedAt: null,
    });
  },

  setEditorBuffer: (text) => set({ editorBuffer: text }),

  saveEditor: async () => {
    const { editorOpenPath, editorBuffer } = get();
    if (!editorOpenPath) return { ok: false };
    set({ editorSaving: true, editorError: null });
    const result = await window.muicv.fs.write(editorOpenPath, editorBuffer);
    if (result.ok) {
      set({
        editorOriginal: editorBuffer,
        editorSaving: false,
        editorLastSavedAt: Date.now(),
        editorError: null,
      });
      return { ok: true };
    }
    set({
      editorSaving: false,
      editorError: translateWriteError(result.error),
    });
    return { ok: false };
  },

  closeEditorFile: () =>
    set({
      editorOpenPath: null,
      editorBuffer: '',
      editorOriginal: '',
      editorLastSavedAt: null,
      editorError: null,
    }),

  updaterStatus: { phase: 'idle' },
  setUpdaterStatus: (status) => set({ updaterStatus: status }),
}));

/**
 * 登录态变化后保证有一份 profile + 加载对话列表。
 */
async function ensureProfileAfterLogin(): Promise<void> {
  const cfg = await window.muicv.profile.ensureDefault();
  useAppStore.setState({ config: cfg, activeProfile: deriveActiveProfile(cfg) });
  await useAppStore.getState().loadConversations();
}

export async function bootstrap(): Promise<void> {
  const s = useAppStore.getState();
  await s.refreshSession();
  if (useAppStore.getState().session) {
    await ensureProfileAfterLogin();
  }

  window.muicv.session.onAutoLogin(async (result) => {
    if (result.status === 'ok') {
      await useAppStore.getState().loadConfig();
      useAppStore.getState().setSession(result.session);
      await ensureProfileAfterLogin();
    } else if (result.status !== 'no-key') {
      console.warn('[auto-login] failed', result);
    }
  });

  window.muicv.session.onMuirouterLinked(async (result) => {
    if (result.status === 'ok') {
      await useAppStore.getState().refreshSession();
    } else {
      console.warn('[muirouter-linked] failed', result);
    }
  });

  // 自动更新：先订阅推送，再拉一次当前快照——dev 模式下 skipped=true 让卡片不渲染。
  window.muicv.updater.onStatus((status) => {
    useAppStore.getState().setUpdaterStatus(status);
  });
  void window.muicv.updater.getStatus().then((status) => {
    useAppStore.getState().setUpdaterStatus(status);
  });

  useAppStore.setState({ bootstrapping: false });
}
