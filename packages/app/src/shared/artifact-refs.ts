import type { ArtifactRef } from './types.ts';

/** 每条消息中，同一路径的参考资料和写入产物各保留一份。更新引用时保持原有位置。 */
export function dedupeArtifactRefs(artifacts: readonly ArtifactRef[] = []): ArtifactRef[] {
  const unique = new Map<string, ArtifactRef>();
  for (const artifact of artifacts) {
    unique.set(`${artifact.source}:${artifact.path}`, artifact);
  }
  return [...unique.values()];
}
