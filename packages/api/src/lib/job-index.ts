import {
  buildEmbeddingText,
  classifyCategory,
  classifyRegion,
  classifyRemote,
  type IndexableJob,
  jobVectorId,
  type Opportunity,
} from '@muicv/shared';

import type { CommunityJdRow } from './community-jd.ts';

/** 把两类岗位转成 Vectorize 条目（metadata 与 cron 采集侧保持同一套口径）。 */

export function communityIndexable(
  row: Pick<CommunityJdRow, 'id' | 'title' | 'company' | 'location' | 'markdown' | 'createdAt'>,
): IndexableJob {
  const title = row.title ?? '';
  const location = row.location ?? '';
  const category = classifyCategory(title);
  return {
    id: jobVectorId('community', row.id),
    text: buildEmbeddingText({ title, company: row.company ?? '', location, body: row.markdown }),
    metadata: {
      kind: 'community',
      refId: row.id,
      remote: classifyRemote(`${location} ${title}`),
      region: classifyRegion(location),
      category,
      postedAt: row.createdAt,
    },
  };
}

export function opportunityIndexable(doc: Opportunity): IndexableJob {
  return {
    id: jobVectorId('collected', doc.id),
    text: buildEmbeddingText({
      title: doc.title,
      company: doc.company,
      location: doc.location,
      body: doc.descriptionMarkdown,
    }),
    metadata: {
      kind: 'collected',
      refId: doc.id,
      remote: doc.remote,
      region: doc.region,
      category: doc.category,
      postedAt: new Date(doc.postedAt).getTime(),
    },
  };
}
