import {
  CompassIcon,
  FileTextIcon,
  type Icon,
  MagnetIcon,
  MagnifyingGlassIcon,
  MicrophoneIcon,
  NotePencilIcon,
  TargetIcon,
} from '@phosphor-icons/react';

import type { ConversationType } from '../../shared/types.ts';

/**
 * ConversationType → Phosphor Icon 组件。
 * shared/types 那边的 emoji 字段还留着给 main 进程拼对话标题 / 写 system prompt 用，
 * UI 渲染统一走这张表。
 */
export const CONVERSATION_TYPE_ICON: Record<ConversationType, Icon> = {
  core: NotePencilIcon,
  generate: FileTextIcon,
  critique: MagnifyingGlassIcon,
  jobs: TargetIcon,
  'job-match': MagnetIcon,
  interview: MicrophoneIcon,
  coaching: CompassIcon,
};
