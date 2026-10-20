import type { RawJob } from '../normalize.ts';
import type { SeedCompany } from '../seeds.ts';
import { asRecord, asString, type FetchLike, fetchJson } from './fetch-json.ts';

/** Greenhouse / Lever / Ashby 三家公开岗位板接口（免鉴权）。 */

export async function fetchGreenhouse(fetchImpl: FetchLike, seed: SeedCompany): Promise<RawJob[]> {
  const body = asRecord(
    await fetchJson(fetchImpl, `https://boards-api.greenhouse.io/v1/boards/${seed.token}/jobs?content=true`),
  );
  const jobs = Array.isArray(body.jobs) ? body.jobs : [];
  return jobs.map((item) => {
    const j = asRecord(item);
    return {
      source: 'greenhouse',
      sourceId: asString(j.id),
      title: asString(j.title),
      company: asString(j.company_name) || seed.name,
      location: asString(asRecord(j.location).name),
      extraLocations: Array.isArray(j.offices) ? j.offices.map((o) => asString(asRecord(o).location)) : [],
      html: asString(j.content),
      applyUrl: asString(j.absolute_url),
      postedAt: asString(j.first_published) || asString(j.updated_at),
    };
  });
}

export async function fetchLever(fetchImpl: FetchLike, seed: SeedCompany): Promise<RawJob[]> {
  const body = await fetchJson(fetchImpl, `https://api.lever.co/v0/postings/${seed.token}?mode=json`);
  const jobs = Array.isArray(body) ? body : [];
  return jobs.map((item) => {
    const j = asRecord(item);
    const categories = asRecord(j.categories);
    return {
      source: 'lever',
      sourceId: asString(j.id),
      title: asString(j.text),
      company: seed.name,
      location: asString(categories.location),
      extraLocations: Array.isArray(categories.allLocations) ? categories.allLocations.map(asString) : [],
      workplace: asString(j.workplaceType),
      employmentType: asString(categories.commitment) || undefined,
      plain: asString(j.descriptionPlain),
      applyUrl: asString(j.hostedUrl),
      postedAt: typeof j.createdAt === 'number' ? j.createdAt : asString(j.createdAt),
    } satisfies RawJob;
  });
}

export async function fetchAshby(fetchImpl: FetchLike, seed: SeedCompany): Promise<RawJob[]> {
  const body = asRecord(await fetchJson(fetchImpl, `https://api.ashbyhq.com/posting-api/job-board/${seed.token}`));
  const jobs = Array.isArray(body.jobs) ? body.jobs : [];
  return jobs.flatMap((item) => {
    const j = asRecord(item);
    if (j.isListed === false) return [];
    return [
      {
        source: 'ashby',
        sourceId: asString(j.id),
        title: asString(j.title),
        company: seed.name,
        location: asString(j.location),
        extraLocations: Array.isArray(j.secondaryLocations)
          ? j.secondaryLocations.map((l) => asString(asRecord(l).location))
          : [],
        isRemote: j.isRemote === true,
        workplace: asString(j.workplaceType),
        employmentType: asString(j.employmentType) || undefined,
        plain: asString(j.descriptionPlain),
        applyUrl: asString(j.jobUrl) || asString(j.applyUrl),
        postedAt: asString(j.publishedAt),
      } satisfies RawJob,
    ];
  });
}
