import { contextBridge, ipcRenderer } from 'electron';

import type {
  AgentChunk,
  AppConfig,
  AttachmentSaveResult,
  AttachmentUploadInput,
  AudioAttachOutcome,
  AudioFailedRecording,
  AudioRecordOutcome,
  AudioRecordingPayload,
  AudioRecordingRequest,
  AudioTranscodeRequest,
  AudioTranscodedPayload,
  ChatMessage,
  Conversation,
  ConversationSummary,
  ConversationType,
  CreatePreviewInput,
  CreatePreviewResult,
  DefaultTemplateChangedPayload,
  FeedbackCommentOutcome,
  FeedbackRateOutcome,
  MediaDeleteAllResult,
  MuirouterLinkResult,
  PhotoHistoryResult,
  PhotoUploadInput,
  PhotoUploadResult,
  Profile,
  RendererApi,
  SessionCheckResult,
  SttPreference,
  UpdaterStatus,
  WhisperEngineStatus,
  WhisperInstallOutcome,
  WhisperModelName,
  WhisperProgressEvent,
} from '../shared/types.ts';

ipcRenderer.on('agent:chunk', (_e, channelId: string, payload: AgentChunk) => {
  window.dispatchEvent(new CustomEvent(`muicv:agent:chunk:${channelId}`, { detail: payload }));
});

type ProfileResult = { ok: boolean; profile?: Profile; message?: string };

const api: RendererApi = {
  config: {
    get: () => ipcRenderer.invoke('config:get') as Promise<AppConfig>,
    set: (patch) => ipcRenderer.invoke('config:set', patch) as Promise<AppConfig>,
  },
  profile: {
    create: (opts) => ipcRenderer.invoke('profile:create', opts) as Promise<ProfileResult>,
    createInDocuments: (name) => ipcRenderer.invoke('profile:createInDocuments', name) as Promise<ProfileResult>,
    pickFolder: (name) => ipcRenderer.invoke('profile:pickFolder', name) as Promise<ProfileResult>,
    switchTo: (id) => ipcRenderer.invoke('profile:switchTo', id) as Promise<AppConfig>,
    rename: (id, name) => ipcRenderer.invoke('profile:rename', id, name) as Promise<AppConfig>,
    remove: (id) => ipcRenderer.invoke('profile:remove', id) as Promise<AppConfig>,
    openInFinder: (id) => ipcRenderer.invoke('profile:openInFinder', id) as Promise<void>,
    ensureDefault: () => ipcRenderer.invoke('profile:ensureDefault') as Promise<AppConfig>,
    setDefaultTemplate: (profileId, template) =>
      ipcRenderer.invoke('profile:setDefaultTemplate', profileId, template) as Promise<AppConfig>,
    onDefaultTemplateChanged: (handler) => {
      const listener = (_e: Electron.IpcRendererEvent, payload: DefaultTemplateChangedPayload) => handler(payload);
      ipcRenderer.on('defaults:templateChanged', listener);
      return () => ipcRenderer.removeListener('defaults:templateChanged', listener);
    },
  },
  session: {
    check: () => ipcRenderer.invoke('session:check') as Promise<SessionCheckResult>,
    verify: (candidateKey: string) => ipcRenderer.invoke('session:verify', candidateKey) as Promise<SessionCheckResult>,
    login: (candidateKey: string) => ipcRenderer.invoke('session:login', candidateKey) as Promise<SessionCheckResult>,
    logout: () => ipcRenderer.invoke('session:logout') as Promise<void>,
    beginConnect: () => ipcRenderer.invoke('session:beginConnect') as Promise<{ ok: boolean; message?: string }>,
    onAutoLogin: (handler: (result: SessionCheckResult) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, result: SessionCheckResult) => handler(result);
      ipcRenderer.on('session:autoLogin', listener);
      return () => ipcRenderer.removeListener('session:autoLogin', listener);
    },
    beginLinkMuirouter: () =>
      ipcRenderer.invoke('session:beginLinkMuirouter') as Promise<{ ok: boolean; message?: string }>,
    onMuirouterLinked: (handler: (result: MuirouterLinkResult) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, result: MuirouterLinkResult) => handler(result);
      ipcRenderer.on('muirouter:linked', listener);
      return () => ipcRenderer.removeListener('muirouter:linked', listener);
    },
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url) as Promise<void>,
    openWorkspace: () => ipcRenderer.invoke('shell:openWorkspace') as Promise<void>,
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<string>,
  },
  agent: {
    chat: (opts) => ipcRenderer.invoke('agent:chat', opts) as Promise<{ channelId: string }>,
    abort: (channelId: string) => ipcRenderer.invoke('agent:abort', channelId) as Promise<void>,
  },
  conversation: {
    list: (profileId) => ipcRenderer.invoke('conversation:list', profileId) as Promise<ConversationSummary[]>,
    get: (profileId, convId) =>
      ipcRenderer.invoke('conversation:get', profileId, convId) as Promise<Conversation | null>,
    create: (opts) => ipcRenderer.invoke('conversation:create', opts) as Promise<Conversation>,
    rename: (profileId, convId, title) =>
      ipcRenderer.invoke('conversation:rename', profileId, convId, title) as Promise<void>,
    remove: (profileId, convId) => ipcRenderer.invoke('conversation:remove', profileId, convId) as Promise<void>,
    setMessageFeedback: (profileId, convId, messageId, patch) =>
      ipcRenderer.invoke('conversation:setMessageFeedback', profileId, convId, messageId, patch) as Promise<boolean>,
  },
  fs: {
    read: (path) => ipcRenderer.invoke('fs:read', path) as Promise<string | null>,
    listDir: (path) =>
      ipcRenderer.invoke('fs:listDir', path) as Promise<Array<{
        name: string;
        path: string;
        isDirectory: boolean;
      }> | null>,
    showInFolder: (path) => ipcRenderer.invoke('fs:showInFolder', path) as Promise<void>,
    readAsDataUrl: (path) => ipcRenderer.invoke('fs:readAsDataUrl', path) as Promise<string | null>,
    write: (path, content) =>
      ipcRenderer.invoke('fs:write', path, content) as Promise<{ ok: true } | { ok: false; error: string }>,
  },
  attachments: {
    save: (profileId: string, file: AttachmentUploadInput) =>
      ipcRenderer.invoke('attachments:save', profileId, file) as Promise<AttachmentSaveResult>,
  },
  preview: {
    uploadPhoto: (input: PhotoUploadInput) =>
      ipcRenderer.invoke('preview:uploadPhoto', input) as Promise<PhotoUploadResult>,
    listPhotos: (limit?: number) => ipcRenderer.invoke('preview:listPhotos', limit) as Promise<PhotoHistoryResult>,
    create: (input: CreatePreviewInput) => ipcRenderer.invoke('preview:create', input) as Promise<CreatePreviewResult>,
  },
  media: {
    deleteAll: () => ipcRenderer.invoke('media:deleteAll') as Promise<MediaDeleteAllResult>,
  },
  skills: {
    catalog: () => ipcRenderer.invoke('skills:catalog') as ReturnType<RendererApi['skills']['catalog']>,
  },
  chatInput: {
    showContextMenu: (opts) => ipcRenderer.send('chatInput:showContextMenu', opts ?? {}),
  },
  feedback: {
    rate: (args) => ipcRenderer.invoke('feedback:rate', args) as Promise<FeedbackRateOutcome>,
    comment: (args) => ipcRenderer.invoke('feedback:comment', args) as Promise<FeedbackCommentOutcome>,
  },
  audio: {
    onRecordingRequest: (handler: (req: AudioRecordingRequest) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, req: AudioRecordingRequest) => handler(req);
      ipcRenderer.on('audio:recording-request', listener);
      return () => ipcRenderer.removeListener('audio:recording-request', listener);
    },
    complete: (requestId: string, payload: AudioRecordingPayload) =>
      ipcRenderer.invoke('audio:complete', requestId, payload) as Promise<void>,
    cancel: (requestId: string, reason: string) =>
      ipcRenderer.invoke('audio:cancel', requestId, reason) as Promise<void>,
    recordAndTranscribe: (opts: { durationLimitSec?: number }) =>
      ipcRenderer.invoke('audio:recordAndTranscribe', opts) as Promise<AudioRecordOutcome>,
    recordAndAttach: (opts: { profileId: string; durationLimitSec?: number }) =>
      ipcRenderer.invoke('audio:recordAndAttach', opts) as Promise<AudioAttachOutcome>,
    retranscribe: (audio: AudioFailedRecording) =>
      ipcRenderer.invoke('audio:retranscribe', audio) as Promise<AudioRecordOutcome>,
    onTranscodeRequest: (handler: (req: AudioTranscodeRequest) => void | Promise<void>) => {
      const listener = (_e: Electron.IpcRendererEvent, req: AudioTranscodeRequest) => {
        void handler(req);
      };
      ipcRenderer.on('audio:transcode-request', listener);
      return () => ipcRenderer.removeListener('audio:transcode-request', listener);
    },
    transcodeComplete: (requestId: string, payload: AudioTranscodedPayload) =>
      ipcRenderer.invoke('audio:transcode-complete', requestId, payload) as Promise<void>,
    transcodeError: (requestId: string, message: string) =>
      ipcRenderer.invoke('audio:transcode-error', requestId, message) as Promise<void>,
  },
  updater: {
    getStatus: () => ipcRenderer.invoke('updater:getStatus') as Promise<UpdaterStatus>,
    checkNow: () => ipcRenderer.invoke('updater:checkNow') as Promise<UpdaterStatus>,
    quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall') as Promise<void>,
    onStatus: (handler: (status: UpdaterStatus) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, status: UpdaterStatus) => handler(status);
      ipcRenderer.on('updater:status', listener);
      return () => ipcRenderer.removeListener('updater:status', listener);
    },
  },
  whisperEngine: {
    status: () => ipcRenderer.invoke('whisperEngine:status') as Promise<WhisperEngineStatus>,
    setPreference: (pref: SttPreference) =>
      ipcRenderer.invoke('whisperEngine:setPreference', pref) as Promise<WhisperEngineStatus>,
    setDefaultModel: (name: WhisperModelName) =>
      ipcRenderer.invoke('whisperEngine:setDefaultModel', name) as Promise<WhisperEngineStatus>,
    installEngine: (engineVersion: string) =>
      ipcRenderer.invoke('whisperEngine:installEngine', engineVersion) as Promise<WhisperInstallOutcome>,
    installModel: (name: WhisperModelName) =>
      ipcRenderer.invoke('whisperEngine:installModel', name) as Promise<WhisperInstallOutcome>,
    uninstallEngine: () => ipcRenderer.invoke('whisperEngine:uninstallEngine') as Promise<WhisperEngineStatus>,
    uninstallModel: (name: WhisperModelName) =>
      ipcRenderer.invoke('whisperEngine:uninstallModel', name) as Promise<WhisperEngineStatus>,
    uninstallAll: () => ipcRenderer.invoke('whisperEngine:uninstallAll') as Promise<WhisperEngineStatus>,
    onProgress: (handler: (e: WhisperProgressEvent) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, ev: WhisperProgressEvent) => handler(ev);
      ipcRenderer.on('whisperEngine:progress', listener);
      return () => ipcRenderer.removeListener('whisperEngine:progress', listener);
    },
  },
};

contextBridge.exposeInMainWorld('muicv', api);

declare global {
  interface Window {
    muicv: RendererApi;
  }
}
