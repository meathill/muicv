/**
 * main 和 renderer 共用的类型。preload 把同形 API 暴露给 window.muicv。
 */

import {
  DEFAULT_LLM_MODEL,
  type SkillAppAvailability,
  type SkillDistributionMode,
  type SkillPublisherType,
} from '@muicv/shared';

/**
 * 一份"简历"的元数据。每份 profile 对应硬盘上的一个独立资料夹，
 * 里面 .claude/muicv/ 是真实素材库。同一账号支持多份 profile，
 * 解决"夫妻共用账号"、"求职 / 跳槽两套素材"等场景。
 */
export type Profile = {
  id: string;
  /** 用户给的名字，例如 "默认"、"求职 2026"、"老婆的"。 */
  name: string;
  /** 资料夹绝对路径。 */
  dir: string;
  /** 创建时间（unix ms）。 */
  createdAt: number;
  /**
   * 默认简历模板。null = 未设置，AI 导出/换模板时走网页预览让用户挑；
   * 非 null（如 't4-tech'）= AI 跳过预览直接渲染 PDF。
   *
   * 用户在对话里说"以后都用 X 模板"或在网页预览页点"设为默认"时写入。
   * 旧版 Profile JSON 没有该字段，读出来当 null。
   */
  defaultTemplate: string | null;
};

export type AppConfig = {
  /** 当前用户已创建的所有 profile。空数组 = 还没初始化（首次登录会自动建一份默认）。 */
  profiles: Profile[];
  /** 当前激活的 profile id；null = 还没激活任何 profile。 */
  activeProfileId: string | null;
  /**
   * 当前激活 profile 的资料夹绝对路径（由 main 进程根据 activeProfileId 推导出来）。
   * 给 agent runtime / 老代码用的派生字段，本身不可写。
   */
  workspaceDir: string | null;
  /** muicv 账号 API key（mui_...）。桌面端唯一身份凭证。 */
  muicvApiKey: string | null;
  /** muicv API base URL（高级配置）。 */
  muicvApiBase: string;
  /** 默认模型 id。 */
  defaultModel: string;
  /**
   * 用户自带 LLM endpoint（OpenAI 兼容）。例如：
   *   - https://api.openai.com/v1
   *   - https://api.muirouter.com/v1
   *   - 自部署 llama.cpp / ollama 等
   * 留空 = 走 muicv 平台代理（默认）。
   */
  customLlmBase: string | null;
  /** 自带 LLM endpoint 的 API key。和 customLlmBase 配套使用。 */
  customLlmKey: string | null;
  /** 本设备是否已完成首次引导。只存在本地，不上传服务器。 */
  onboardingCompleted: boolean;
};

export const DEFAULT_CONFIG: AppConfig = {
  profiles: [],
  activeProfileId: null,
  workspaceDir: null,
  muicvApiKey: null,
  muicvApiBase: 'https://api.muicv.com',
  defaultModel: DEFAULT_LLM_MODEL,
  customLlmBase: null,
  customLlmKey: null,
  onboardingCompleted: false,
};

/**
 * 登录后从 muicv API GET /me 拿到的信息。null 表示未登录 / key 失效。
 */
export type SessionInfo = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  /**
   * 订阅档位。server 根据 subscription.stripePriceId + status 推导。
   * 老 server 可能没补这个字段；client 兜底当 'free'。
   */
  plan?: 'free' | 'pro' | 'max';
  /** 当前 token 余额（显示 token；server 已 microToDisplay 过）。可能是小数。 */
  balance: number;
  /** 是否在 dashboard 绑过 muirouter；muicv 余额耗尽且 hasBYOK=false 时 LLM 调不通 */
  hasBYOK: boolean;
  /** muirouter 绑定的快照——dashboard 改了模型 / 余额变化都在这里反映。null 表示未绑定。 */
  muirouter: MuirouterInfo | null;
};

/** /api/me 返回的 muirouter 字段。来自 D1 muirouterLink 表，dashboard / app 共享同一份。 */
export type MuirouterInfo = {
  email: string | null;
  defaultModel: string;
  currency: string | null;
  balanceCents: number | null;
  /** balance 快照更新时间，Unix ms。 */
  balanceUpdatedAt: number | null;
};

export type AppSkillCatalogItem = {
  slug: string;
  title: string;
  publisher: string;
  publisherType: SkillPublisherType;
  sourceUrl: string | null;
  sourceLabel: string | null;
  sourceNote: string | null;
  distributionMode: SkillDistributionMode;
  appAvailability: SkillAppAvailability;
  summary: string;
  useCases: string[];
  tags: string[];
  updatedAt: string;
  detailUrl: string;
  disclaimer: string | null;
};

export type SkillsCatalogResult =
  | {
      ok: true;
      manifestVersion: number;
      generatedAt: string;
      skills: AppSkillCatalogItem[];
    }
  | {
      ok: false;
      message: string;
    };

/**
 * `muirouter:linked` 事件 payload —— main 进程把 deep-link 校验结果推给 renderer。
 *
 * 'ok'：服务端已写入 muirouterLink，renderer 应当重拉 /api/me 同步状态。
 * 'state-mismatch'：深链 app_state 跟内存 pending 不匹配（过期 / CSRF 失败）。
 * 'failed'：服务端汇报失败（用户拒绝授权 / token 端点错），reason 是错误码。
 */
export type MuirouterLinkResult =
  | { status: 'ok' }
  | { status: 'state-mismatch' }
  | { status: 'failed'; reason: string };

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export type ToolCallRecord = {
  id: string;
  name: string;
  input: unknown;
  output?: unknown;
  error?: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  /** 文本内容（assistant 回复 / 用户输入 / tool result 摘要）。 */
  content: string;
  /**
   * thinking-mode 模型（mimo / DeepSeek 系）的推理过程文本，
   * 仅 role === 'assistant' 时有意义；运行中流式拼接，UI 用来显示"思考中"区块。
   * **不**持久化到 conversation 文件（runtime flushConversation 不写入）——
   * 只活在 in-memory store，切对话或重启后消失。
   */
  reasoning?: string;
  /** 如果是 assistant 调了 tool，记录工具名和输入。 */
  toolCalls?: ToolCallRecord[];
  /** assistant 完成时附带的 artifact 卡片（用户写的文件 / 读的关键资料）。 */
  artifacts?: ArtifactRef[];
  /** 用户消息附带的上传附件（落到 inbox/，agent 用 read_file 读）。 */
  attachments?: AttachmentRef[];
  /**
   * 用户对这条 assistant 消息的反馈状态缓存。云端 D1 是 source of truth，
   * 这里只为 UI 做按钮选中态恢复（重启 / 切对话回来仍能看到自己点过 👍/👎）。
   * 仅 role === 'assistant' 时有意义。
   */
  feedback?: ChatMessageFeedback;
  createdAt: number;
};

/**
 * 单条消息的本地反馈缓存。两个字段都显式接受 undefined：
 * 因为开了 exactOptionalPropertyTypes，rollback 时要能传 `{ rating: undefined }` 清空。
 */
export type ChatMessageFeedback = {
  /** 当前评分；切换 praise ↔ dislike 时直接覆盖；undefined = 未评分。 */
  rating?: 'praise' | 'dislike' | undefined;
  /** 是否至少一次 ≥50 字的有效评论拿过奖励（避免 UI 反复"恭喜"）。 */
  rewardedComment?: boolean | undefined;
};

/**
 * `feedback:rate` IPC 返回值。失败时 `ok: false`，message 中文可直接给 toast。
 * 成功时返回 server 反馈（已折算成显示 token）。
 */
export type FeedbackRateOutcome =
  | {
      ok: true;
      data: {
        feedbackId: string;
        rating: 'praise' | 'dislike';
        /** 这次新增的显示 token；切换或重放为 0。 */
        awarded: number;
        alreadyRewarded: boolean;
        /** 入账后的最新余额（显示 token）。 */
        balance: number;
      };
    }
  | {
      ok: false;
      error: 'no-api-key' | 'network-error' | 'invalid-key' | 'bad-request' | 'server-error';
      message: string;
    };

export type FeedbackCommentOutcome =
  | {
      ok: true;
      data: {
        feedbackId: string;
        charCount: number;
        /** 这次新增的显示 token；<minChars 时为 0。 */
        awarded: number;
        balance: number;
        minChars: number;
        maxChars: number;
      };
    }
  | {
      ok: false;
      error: 'no-api-key' | 'network-error' | 'invalid-key' | 'bad-request' | 'server-error';
      message: string;
    };

/** 附件支持的文件种类。新增类型时同步更新 main/attachments.ts 的白名单。 */
export type AttachmentKind = 'pdf' | 'docx' | 'markdown' | 'text' | 'image' | 'audio';

/**
 * 附件引用 —— 由 main 进程在 'attachments:save' 中写盘后返给 renderer。
 *
 * `path` 是相对工作目录的路径（如 `inbox/20260506-143022-resume.pdf`），
 * 跟 agent 工具调用看到的路径同一坐标系，可以直接拼到 user message footer
 * 里给 agent。`textPath`：PDF / DOCX 解析出来的 .txt sidecar，agent 用现有
 * `read_file` 读它就拿到纯文本，不用单独 parse 工具。
 */
export type AttachmentRef = {
  path: string;
  name: string;
  kind: AttachmentKind;
  mimeType: string;
  size: number;
  textPath?: string;
  /** 云端公开 URL。上传失败或未登录时为空，本地 path 仍然可用。 */
  url?: string;
  /** R2 object key，用于排查 / 后续清理；用户侧通常只展示 url。 */
  r2Key?: string;
  /** mediaUpload 审计行 id。旧记录或审计写入失败时可能为空。 */
  mediaId?: number;
};

export type AttachmentSaveFailureReason =
  | 'too-large'
  | 'unsupported'
  | 'parse-failed'
  | 'parse-empty'
  | 'workspace-missing'
  | 'profile-mismatch'
  | 'io-error';

export type AttachmentSaveResult =
  | { ok: true; ref: AttachmentRef }
  | { ok: false; reason: AttachmentSaveFailureReason; message: string };

/** 上传 IPC 单文件 payload —— renderer 把 File 拆成 ArrayBuffer 传过去。 */
export type AttachmentUploadInput = {
  name: string;
  mimeType: string;
  bytes: ArrayBuffer;
};

/**
 * 对话类型：每种类型对应一个主线 skill。新建对话时选类型，
 * agent 拿到 focusType 后在 system prompt 里加一句"本次主线是 X"，
 * 让 agent 优先按对应 skill 的章节工作。所有 skill 仍然全量加载，
 * 类型只决定侧重，不锁工具。
 */
export type ConversationType =
  | 'core' // 记录职业生涯（素材整理）—— muicv-core
  | 'generate' // 针对岗位生成简历 —— muicv-generate
  | 'critique' // 简历评审 —— muicv-critique
  | 'jobs' // JD 抓取与匹配 —— muicv-jobs
  | 'interview' // 模拟面试 —— muicv-interview
  | 'coaching'; // 就业辅导 —— muicv-coaching

export const CONVERSATION_TYPE_META: Record<
  ConversationType,
  { label: string; emoji: string; tagline: string; placeholder: string }
> = {
  core: {
    label: '记录职业生涯',
    emoji: '📝',
    tagline: '记录工作经历、项目、技能、亮点',
    placeholder: '比如：「我 2023 年在 ACME 做高级前端，做了 X 项目，业务量提升 30%」',
  },
  generate: {
    label: '针对岗位生成简历',
    emoji: '📄',
    tagline: '基于素材库，生成适合特定 JD 的简历版本',
    placeholder: '比如：「针对 Google L5 的岗位生成一份简历」',
  },
  critique: {
    label: '简历评审',
    emoji: '🔍',
    tagline: 'STAR 结构、量化、关键词、长度全方位检查',
    placeholder: '比如：「评审我最近生成的 google-l5 简历」',
  },
  jobs: {
    label: 'JD 抓取与匹配',
    emoji: '🎯',
    tagline: '从招聘链接抓 JD，分析与你素材的匹配度',
    placeholder: '比如：粘一个招聘链接，或者「分析一下 openai-swe 这个岗位」',
  },
  interview: {
    label: '模拟面试',
    emoji: '🎤',
    tagline: '行为题 / 技术题角色扮演 + 反馈',
    placeholder: '比如：「针对 google-l5 模拟一轮 behavioral 面试」',
  },
  coaching: {
    label: '就业辅导',
    emoji: '🧭',
    tagline: '职业方向、薪资协商、跳槽时机等',
    placeholder: '比如：「我现在该不该跳槽？」',
  },
};

/** 工件类型 —— renderer 拿到 artifact chunk 后按 kind 选 icon / 文案。 */
export type ArtifactKind =
  | 'profile'
  | 'experience'
  | 'project'
  | 'jd-target'
  | 'resume-version'
  | 'resume-preview'
  | 'critique-report'
  | 'cover-letter'
  | 'other';

/** 一次工件引用 —— 路径 + 类型 + 标题（标题给卡片显示用，path 是绝对路径或相对于 workspace 的路径）。 */
export type ArtifactRef = {
  kind: ArtifactKind;
  /** 绝对路径，方便右栏直接 fs.read。 */
  path: string;
  /** 显示用文件名（basename）。 */
  title: string;
  /**
   * 这次 artifact 是 agent 读出来的参考资料（read_file）还是写出来的产物
   * （write_file / edit_file / render_resume_pdf / fetch_jd）。
   * read 类是过程信息（折叠到工具调用组里），write 类是产物（显眼卡片
   * + 自动打开右栏预览）。
   */
  source: 'read' | 'write';
};

/** 一份对话的元数据 + 消息历史。持久化到 <profile.dir>/.claude/muicv/conversations/<id>.json。 */
export type Conversation = {
  id: string;
  profileId: string;
  type: ConversationType;
  /** 用户改 / 默认按类型 + 创建日期生成。 */
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
};

/** 列表用的轻量 summary（不含 messages，省 IO）。 */
export type ConversationSummary = Omit<Conversation, 'messages'> & {
  messageCount: number;
};

/**
 * main → renderer 通过 'agent:chunk' IPC 转发的事件类型。
 * 包了 OpenAI Agents SDK 的 RunStreamEvent，做扁平化让 renderer 直接消费。
 */
export type AgentChunk =
  /** assistant 文字流增量（model 边输出边给）。 */
  | { type: 'text-delta'; delta: string }
  /**
   * thinking-mode 模型 (mimo / DeepSeek 系) 的推理过程增量。
   * 不进 ChatMessage 持久化——只用于"思考中"区块的实时展示，
   * 在 message-completed / finish 时被丢弃。
   */
  | { type: 'reasoning-delta'; delta: string }
  /** 一段完整 message_output_item 已确认（用于纠错 / 完整文本）。 */
  | { type: 'message-completed'; text: string }
  /** 工具调用开始：name + 输入参数（JSON 字符串） */
  | { type: 'tool-called'; toolCallId: string; toolName: string; argsJson: string }
  /** 工具调用结束：output 字符串（截断 to ~2KB） */
  | { type: 'tool-output'; toolCallId: string; output: string }
  /** 整个 run 结束（reason: 'completed' / 'error' / 'aborted'） */
  | { type: 'finish'; reason: string }
  /** 出错（network / api / parse）。 */
  | { type: 'error'; message: string }
  /**
   * Agent 调 read/write_file 落到约定路径时（versions/* / targets/* / applications/*），
   * runtime 主动推一个 artifact chunk，renderer 在消息流里渲染卡片，
   * 点卡片或后续 agent 再访问该路径都会切右栏到这个文件。
   * source: read（过程参考）/ write（最终产物，会自动开右栏）。
   */
  | { type: 'artifact'; kind: ArtifactKind; path: string; title: string; source: 'read' | 'write' };

/**
 * 录音 IPC 数据契约（issue #1 M2）。
 * main 端 agent tool 触发录音 → renderer RecordPanel 接收 → 录完回传。
 */
export type AudioRecordingRequest = {
  requestId: string;
  durationLimitSec: number;
};

export type AudioRecordingPayload = {
  /** webm/opus blob 转 base64（不含 data: 前缀）。 */
  audioBase64: string;
  mimeType: string;
  durationMs: number;
  /** 静音段时间戳（毫秒），由 renderer 实时算出，后端不绕一圈再算。 */
  pauses: Array<[number, number]>;
};

export type AudioTranscribeResult = {
  transcript: string;
  durationMs: number;
  language: string;
  fillerCount: number;
  pauseCount: number;
  /** 实际走的 provider；UI 据此区分提示（如本地兜底成功 → 轻量提示「已用本地模型」）。 */
  provider: 'cloud' | 'local' | 'local-fallback';
};

/**
 * 录音失败时把已经录好的 16k mono WAV 一起带回 renderer，
 * 让 UI 提供「重试转写 / 下载录音 / 安装本地模型」三条后路（issue #6）。
 */
export type AudioFailedRecording = {
  /** 16k mono WAV bytes。Electron structured clone 原生支持 Uint8Array，零拷贝。 */
  wav: Uint8Array;
  mimeType: string;
  durationMs: number;
  pauses: Array<[number, number]>;
};

export type AudioRecordOutcome =
  | { ok: true; result: AudioTranscribeResult }
  | { ok: false; reason: 'mic-denied' | 'cancel'; message: string }
  | {
      ok: false;
      reason: 'error';
      message: string;
      /** 录音 OK 但转写失败时存在；mic-denied / cancel 没录到音频，没这个字段。 */
      lastAudio?: AudioFailedRecording;
      /** 本地引擎是否已装好默认模型。renderer 据此决定是否提示「安装本地模型再试」。 */
      localReady?: boolean;
    };

/**
 * mimo-v2.5 全模态分支：录音直接落盘当 audio 附件，跳过 STT 的回执。
 * 成功 = 拿到 AttachmentRef（kind='audio'），renderer push 到 pendingAttachments。
 * 失败比 AudioRecordOutcome 多 'recording-error'，区别于"录音 OK 但转写失败"。
 */
export type AudioAttachOutcome =
  | AttachmentSaveResult
  | { ok: false; reason: 'mic-denied' | 'cancel' | 'recording-error'; message: string };

/**
 * 文件转码 IPC（issue #1 M4）：main 端 transcribe_audio_file 工具读完文件
 * 把字节交给 renderer，renderer 用 OfflineAudioContext 转 16k mono WAV 回传。
 */
export type AudioTranscodeRequest = {
  requestId: string;
  /** 原音频 bytes 的 base64（不含 data: 前缀）。 */
  audioBase64: string;
  /** 原 mime（按文件扩展名推断；让 OfflineAudioContext.decodeAudioData 用）。 */
  mimeType: string;
};

export type AudioTranscodedPayload = {
  /** 转完的 16k mono PCM WAV bytes 的 base64。 */
  wavBase64: string;
  /** 解码后的实际音频时长。 */
  durationMs: number;
};

/**
 * 本地 whisper.cpp 引擎插件状态（issue #1 M3）。
 * 引擎 + 模型按需下载，存 <userData>/whisper-engine/，跟主 app 解耦升版。
 */
export type WhisperModelName = 'base' | 'small';

export type SttPreference = 'cloud' | 'local-preferred' | 'always-ask';

export type WhisperEngineStatus = {
  engine: { installed: boolean; version: string | null; binPath: string | null };
  models: Array<{ name: WhisperModelName; installed: boolean; bytes: number; path: string | null }>;
  preference: SttPreference;
  defaultModel: WhisperModelName;
};

export type WhisperProgressEvent = {
  kind: 'engine' | 'model';
  target: string;
  event: {
    phase: 'download' | 'extract' | 'verify' | 'done';
    fraction: number;
    receivedBytes?: number;
    totalBytes?: number;
  };
};

export type WhisperInstallOutcome = { ok: true; status: WhisperEngineStatus } | { ok: false; message: string };

export type SessionCheckResult =
  | { status: 'ok'; session: SessionInfo }
  | { status: 'no-key' }
  | { status: 'invalid-key'; message: string }
  | { status: 'network-error'; message: string };

/**
 * 自动更新状态机（基于 electron-updater 事件）。
 * - idle：空闲（启动初值 / 检查完发现已是最新 / dev 模式）。
 * - checking：正在请求 latest-*.yml manifest。
 * - downloading：找到新版本，正在拉 zip / nsis / AppImage。
 * - ready：已下载完，等用户点重启安装。
 * - error：网络 / 签名校验等错误。
 */
export type UpdaterPhase = 'idle' | 'checking' | 'downloading' | 'ready' | 'error';

export type UpdaterStatus = {
  phase: UpdaterPhase;
  /** 目标新版本号（downloading / ready 时有）。 */
  version?: string;
  /** 下载进度 0–100。 */
  percent?: number;
  transferredBytes?: number;
  totalBytes?: number;
  /** error phase 的错误描述。 */
  message?: string;
  /** idle 时——上一次检查到的最新版本（可能等于当前已安装版本）。 */
  latestVersion?: string;
  /** 上一次完成检查的时间，Unix ms。 */
  lastCheckedAt?: number;
  /** 未打包（dev）模式下整体跳过更新；renderer 看到 true 直接不渲染卡片。 */
  skipped?: boolean;
};

/**
 * `muicv://set-default-template?template=X` 处理结果。
 * 成功时带 profileId/Name + 写入的 template；失败时给原因，让 renderer 提示用户。
 */
export type DefaultTemplateChangedPayload =
  | { ok: true; profileId: string; profileName: string; template: string }
  | { ok: false; reason: 'invalid-template' | 'no-active-profile' };

/** preload 注入到 window.muicv 的 API 形状。 */
export type PhotoUploadInput = {
  name: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type PreviewApiFailure = { ok: false; status: number; message: string };

export type PhotoUploadResult =
  | { ok: true; url: string; key: string; contentType: string; size: number; createdAt: number }
  | PreviewApiFailure;

export type PhotoHistoryItem = {
  id: number;
  r2Key: string;
  url: string;
  contentType: string;
  sizeBytes: number;
  originalName: string | null;
  createdAt: number;
};

export type PhotoHistoryResult = { ok: true; items: PhotoHistoryItem[] } | PreviewApiFailure;

export type MediaDeleteAllResult =
  | { ok: true; deletedMedia: number; deletedPhotos: number; deletedObjects: number }
  | PreviewApiFailure;

export type CreatePreviewInput = {
  /** TemplateResumeData JSON（双语结构化） */
  resumeJson: unknown;
  /** t1-classic / t2-minimal / t3-sidebar / t4-tech / t5-timeline / t6-academic */
  template: string;
  lang?: 'zh' | 'en';
  accent?: string;
  shareMode?: 'link' | 'public';
  ttlDays?: 1 | 7 | 30;
};

export type CreatePreviewResult =
  | {
      ok: true;
      token: string;
      url: string;
      template: string;
      lang: 'zh' | 'en';
      shareMode: 'link' | 'public';
      expiresAt: number;
    }
  | PreviewApiFailure;

export type RendererApi = {
  config: {
    get(): Promise<AppConfig>;
    set(
      patch: Partial<
        Pick<
          AppConfig,
          'muicvApiBase' | 'defaultModel' | 'muicvApiKey' | 'customLlmBase' | 'customLlmKey' | 'onboardingCompleted'
        >
      >,
    ): Promise<AppConfig>;
  };
  profile: {
    /** 创建一份新的 profile。如果不传 dir 会让用户挑（dialog）；传了就用那个目录。 */
    create(opts: { name: string; dir?: string }): Promise<{ ok: boolean; profile?: Profile; message?: string }>;
    /** 让 main 进程在 ~/Documents/Mui简历/<name> 下自动建一个目录并创建 profile。 */
    createInDocuments(name: string): Promise<{ ok: boolean; profile?: Profile; message?: string }>;
    /** 让用户选目录后，把它挂成一份 profile。dialog 取消则返回 ok:false。 */
    pickFolder(name: string): Promise<{ ok: boolean; profile?: Profile; message?: string }>;
    /** 切换激活 profile。 */
    switchTo(id: string): Promise<AppConfig>;
    /** 重命名（只改 metadata，不动磁盘）。 */
    rename(id: string, name: string): Promise<AppConfig>;
    /** 从 app 里移除（不删盘上文件）；如果是激活的，会切到列表里下一个。 */
    remove(id: string): Promise<AppConfig>;
    /** 在文件管理器里打开某个 profile 的目录。 */
    openInFinder(id: string): Promise<void>;
    /** 登录后调一次：如果还没任何 profile，就在 ~/Documents/Mui简历/默认/ 自动建一份。 */
    ensureDefault(): Promise<AppConfig>;
    /**
     * 设置某个 profile 的默认简历模板。null = 清除，AI 重新走预览流程；
     * 非 null = AI 渲染 PDF 时直接用该模板。模板 ID 由调用方校验。
     */
    setDefaultTemplate(profileId: string, template: string | null): Promise<AppConfig>;
    /**
     * 网页预览页通过 `muicv://set-default-template?template=X` 深链改了默认模板时，
     * main 进程推这个事件。renderer 应该重拉 config.get() 同步状态 + 弹 toast 提示。
     */
    onDefaultTemplateChanged(handler: (payload: DefaultTemplateChangedPayload) => void): () => void;
  };
  session: {
    /** 用当前 muicvApiKey 调 GET /me 验证，结果区分网络错 vs key 无效 */
    check(): Promise<SessionCheckResult>;
    /** 用一个候选 mui_ key 试登录（不写 store；成功后调 login 才存） */
    verify(candidateKey: string): Promise<SessionCheckResult>;
    /** 验证通过后存 mui_ key + 返回 session */
    login(candidateKey: string): Promise<SessionCheckResult>;
    /** 清 mui_ key + 任何缓存的 session */
    logout(): Promise<void>;
    /**
     * OAuth-style 自动登录：main 进程生成随机 state，记到内存里，
     * 打开浏览器 https://muicv.com/connect?state=...&redirect=muicv://callback。
     * 用户在网页授权后会通过 muicv:// scheme 唤起 app，main 验证 state 后
     * 自动 loginWithKey + 推送 session:autoLogin 事件给 renderer。
     */
    beginConnect(): Promise<{ ok: boolean; message?: string }>;
    /** 订阅自动登录结果（成功 / 失败）。返回 unsubscribe。 */
    onAutoLogin(handler: (result: SessionCheckResult) => void): () => void;
    /**
     * OAuth-style muirouter 关联：main 生成 app_state，打开浏览器到
     * /api/muirouter/oauth/start?from=app&app_state=...。muicv 服务端透传到 muirouter，
     * 授权完成后服务端 302 到 muicv://muirouter-linked，main 校验后推
     * `muirouter:linked` 事件。renderer 收到后应重拉 /api/me 获取最新状态。
     */
    beginLinkMuirouter(): Promise<{ ok: boolean; message?: string }>;
    /** 订阅 muirouter 关联结果（成功 / state 失配 / 服务端失败）。返回 unsubscribe。 */
    onMuirouterLinked(handler: (result: MuirouterLinkResult) => void): () => void;
  };
  shell: {
    openExternal(url: string): Promise<void>;
    openWorkspace(): Promise<void>;
  };
  app: {
    /** Electron app.getVersion()，用于在设置页 footer 显示版本号方便排查问题。 */
    getVersion(): Promise<string>;
  };
  agent: {
    /**
     * 发起一次 chat（流式）。
     *
     * conv: 关联的 conversation —— runtime 用 conv.type 选 focus skill，
     * 用 conv.id + profileId 在 finish 后 flush 整份对话到磁盘。
     * messages 是当前对话的全部历史 + 刚 push 的 user msg。
     *
     * 返回 channelId，渲染层订阅 'muicv:agent:chunk:<id>' 拿增量。
     */
    chat(opts: {
      profileId: string;
      convId: string;
      type: ConversationType;
      messages: ChatMessage[];
    }): Promise<{ channelId: string }>;
    /** 中断当前 chat。 */
    abort(channelId: string): Promise<void>;
  };
  conversation: {
    /** 列出当前 profile 下所有对话（不含 messages，按 updatedAt 倒序）。 */
    list(profileId: string): Promise<ConversationSummary[]>;
    /** 加载一份对话（含 messages）。 */
    get(profileId: string, convId: string): Promise<Conversation | null>;
    /** 新建。type 决定默认 title 和 system prompt focus。 */
    create(opts: { profileId: string; type: ConversationType; title?: string }): Promise<Conversation>;
    rename(profileId: string, convId: string, title: string): Promise<void>;
    remove(profileId: string, convId: string): Promise<void>;
    /**
     * 给某条消息的 feedback 缓存做浅 patch 并写盘。云端 D1 是 source of truth，
     * 这份本地缓存只为 UI 按钮选中态恢复。找不到 conv / message 时静默返回 false。
     */
    setMessageFeedback(
      profileId: string,
      convId: string,
      messageId: string,
      patch: Partial<ChatMessageFeedback>,
    ): Promise<boolean>;
  };
  fs: {
    /** 读一个文件（utf8）。给右栏文件预览 / 编辑器用。失败返回 null。 */
    read(path: string): Promise<string | null>;
    /** 列目录（仅当前 workspace 内）。返回 null = 路径越界 / 读不到。 */
    listDir(path: string): Promise<Array<{ name: string; path: string; isDirectory: boolean }> | null>;
    /** 在文件管理器里打开。 */
    showInFolder(path: string): Promise<void>;
    /**
     * 读图像文件并返回 `data:<mime>;base64,...`。仅支持 PNG / JPG / WEBP / GIF，
     * 其它扩展返 null。给附件预览 dialog 在 `<img src>` 里直接展示。
     */
    readAsDataUrl(path: string): Promise<string | null>;
    /**
     * 写文件（utf8）。仅允许 workspace 内的 .md / .markdown，且不在 .claude/ 子树。
     * 1MB 上限。原子写（tmp + rename），失败不留半成品。
     */
    write(path: string, content: string): Promise<{ ok: true } | { ok: false; error: string }>;
  };
  attachments: {
    /**
     * 把 chat box 里上传 / 拖入的文件落到 `<workspace>/inbox/`，PDF / DOCX 同时
     * 在 main 进程提取文本写到同名 `.txt` sidecar，agent 直接 `read_file` 读 sidecar。
     */
    save(profileId: string, file: AttachmentUploadInput): Promise<AttachmentSaveResult>;
  };
  preview: {
    /**
     * 上传证件照到 R2（i.muicv.com）。失败统一返回 `{ ok: false, status, message }`。
     * 文件类型限 jpeg/png/webp，≤ 2MB，客户端先压到 600×800 内更经济。
     */
    uploadPhoto(input: PhotoUploadInput): Promise<PhotoUploadResult>;
    /** 当前账号最近上传过的照片，按时间倒序。 */
    listPhotos(limit?: number): Promise<PhotoHistoryResult>;
    /**
     * 把一份 TemplateResumeData + 模板名提交到 muicv 后端，得到一个可分享的 https URL。
     * 第一次有人在预览页点「下载 PDF」时由 owner 扣 PDF_RENDER_COST 解锁公开下载。
     */
    create(input: CreatePreviewInput): Promise<CreatePreviewResult>;
  };
  media: {
    /** 删除当前账号所有云端媒体文件（通用附件 + 旧证件照），不删除本地 inbox/。 */
    deleteAll(): Promise<MediaDeleteAllResult>;
  };
  skills: {
    /** 公开 skill 目录：内置 skill、第三方官方来源、未来可安装扩展。 */
    catalog(): Promise<SkillsCatalogResult>;
  };
  chatInput: {
    /**
     * 由 renderer 在 chat textarea / 消息气泡区域 onContextMenu 里调，主进程弹
     * 一个 role-based 的原生编辑菜单。role 自动跟焦点状态联动，不用 renderer
     * 维护可点性。
     *
     * - `editable: true`（默认）→ 编辑菜单（撤销/重做/剪切/复制/粘贴/删除/全选）
     * - `editable: false` → 只读菜单（只有复制 / 全选），用于消息气泡等场合
     *
     * 其它任何位置都不接此调用，维持默认行为。
     */
    showContextMenu(opts?: { editable?: boolean }): void;
  };
  feedback: {
    /**
     * 给一条 AI 消息打分（赞 / 踩）。同一条消息只奖励一次（首次发 1000 显示 token），
     * 切换 praise↔dislike 仅更新状态，不重复发奖。
     */
    rate(args: {
      messageId: string;
      conversationId: string;
      rating: 'praise' | 'dislike';
    }): Promise<FeedbackRateOutcome>;
    /**
     * 给一条 AI 消息留文字反馈。不限次数；text 长度 ≥ minChars 才发奖（50,000 显示 token）。
     */
    comment(args: { messageId: string; conversationId: string; text: string }): Promise<FeedbackCommentOutcome>;
  };
  audio: {
    /** 监听 main 端 agent tool 发起的录音请求。返回 unsubscribe。 */
    onRecordingRequest(handler: (req: AudioRecordingRequest) => void): () => void;
    /** 录音完成回传。 */
    complete(requestId: string, payload: AudioRecordingPayload): Promise<void>;
    /** 录音取消（用户取消 / 设备错误 / 权限拒绝）。 */
    cancel(requestId: string, reason: string): Promise<void>;
    /** chatbox 麦克风按钮：renderer 主动触发一次录音 → 转写。 */
    recordAndTranscribe(opts: { durationLimitSec?: number }): Promise<AudioRecordOutcome>;
    /**
     * mimo-v2.5 全模态分支：录一段 → 直接落 inbox/ 当 audio 附件（不做 Whisper STT）。
     * 成功时返回的 AttachmentRef.kind === 'audio'，调用方应推入 pendingAttachments，
     * 让发送时走 input_audio content block。
     */
    recordAndAttach(opts: { profileId: string; durationLimitSec?: number }): Promise<AudioAttachOutcome>;
    /**
     * 用上一次失败保留的 wav 重新走转写（issue #6 手动重试）。
     * 不再录音，直接复用 `lastAudio`。失败仍返回 lastAudio，可继续尝试。
     */
    retranscribe(audio: AudioFailedRecording): Promise<AudioRecordOutcome>;
    /** 监听 main 端 transcribe_audio_file 工具发起的转码请求。返回 unsubscribe。 */
    onTranscodeRequest(handler: (req: AudioTranscodeRequest) => void | Promise<void>): () => void;
    /** 转码完成回传 wav。 */
    transcodeComplete(requestId: string, payload: AudioTranscodedPayload): Promise<void>;
    /** 转码失败回传错误信息。 */
    transcodeError(requestId: string, message: string): Promise<void>;
  };
  updater: {
    /** 拉取主进程持有的最新一次状态（renderer 后挂载也能拿到当前状态）。 */
    getStatus(): Promise<UpdaterStatus>;
    /** 用户手动点「检查更新」。错误会被转成 error phase 状态返回，不抛。 */
    checkNow(): Promise<UpdaterStatus>;
    /** 仅在 phase === 'ready' 时调用：app 退出 + 安装新版本 + 重启。 */
    quitAndInstall(): Promise<void>;
    /** 订阅状态变更（每次 autoUpdater 事件都会推一次）。返回 unsubscribe。 */
    onStatus(handler: (status: UpdaterStatus) => void): () => void;
  };
  whisperEngine: {
    status(): Promise<WhisperEngineStatus>;
    setPreference(pref: SttPreference): Promise<WhisperEngineStatus>;
    setDefaultModel(name: WhisperModelName): Promise<WhisperEngineStatus>;
    installEngine(engineVersion: string): Promise<WhisperInstallOutcome>;
    installModel(name: WhisperModelName): Promise<WhisperInstallOutcome>;
    uninstallEngine(): Promise<WhisperEngineStatus>;
    uninstallModel(name: WhisperModelName): Promise<WhisperEngineStatus>;
    uninstallAll(): Promise<WhisperEngineStatus>;
    /** 订阅安装进度。返回 unsubscribe。 */
    onProgress(handler: (e: WhisperProgressEvent) => void): () => void;
  };
};
