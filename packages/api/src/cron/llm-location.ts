import { countryInfo, isOneOf, LOCATION_REGIONS, type OpportunityInput, restrictionSentences } from '@muicv/shared';

/**
 * 规则没解析出任何地域限制、但正文里有「限制句」的 remote 岗，交给 Workers AI 小模型兜底抽取。
 * 每个岗位只在首次入库时处理一次（dedupeKey 幂等），所以不需要额外缓存；单次运行有上限控制成本。
 */

export const LOCATION_LLM_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

export type TextGenerator = { run(model: string, input: Record<string, unknown>): Promise<unknown> };

export function needsLlm(doc: OpportunityInput): boolean {
  return (
    doc.workplace === 'remote' &&
    doc.allowedCountries.length === 0 &&
    doc.allowedRegions.length === 0 &&
    doc.utcOffsetMin === null &&
    restrictionSentences(doc.descriptionMarkdown).length > 0
  );
}

const PROMPT = `Extract candidate location restrictions for this remote job. Reply with JSON only:
{"countries":[ISO 3166-1 alpha-2],"regions":[subset of ${LOCATION_REGIONS.join('|')}],"utcMin":number|null,"utcMax":number|null}
Use empty arrays / null when the text does not restrict. Do not guess.`;

export async function extractWithLlm(ai: TextGenerator, doc: OpportunityInput): Promise<OpportunityInput> {
  const text = `${doc.location}\n${restrictionSentences(doc.descriptionMarkdown)}`.slice(0, 2000);
  const result = (await ai.run(LOCATION_LLM_MODEL, {
    messages: [
      { role: 'system', content: PROMPT },
      { role: 'user', content: text },
    ],
    max_tokens: 200,
  })) as { response?: unknown };
  const raw = typeof result.response === 'string' ? result.response : JSON.stringify(result.response ?? {});
  const json = /\{[\s\S]*\}/.exec(raw)?.[0];
  if (!json) return doc;
  const parsed = JSON.parse(json) as { countries?: unknown; regions?: unknown; utcMin?: unknown; utcMax?: unknown };
  const countries = Array.isArray(parsed.countries)
    ? parsed.countries
        .filter((c): c is string => typeof c === 'string' && countryInfo(c.toUpperCase()) !== undefined)
        .map((c) => c.toUpperCase())
    : [];
  const regions = Array.isArray(parsed.regions) ? parsed.regions.filter((r) => isOneOf(LOCATION_REGIONS, r)) : [];
  const utcMin = typeof parsed.utcMin === 'number' ? parsed.utcMin : null;
  const utcMax = typeof parsed.utcMax === 'number' ? parsed.utcMax : utcMin;
  return {
    ...doc,
    allowedCountries: countries,
    allowedRegions: regions,
    utcOffsetMin: utcMin !== null && utcMax !== null ? Math.min(utcMin, utcMax) : null,
    utcOffsetMax: utcMin !== null && utcMax !== null ? Math.max(utcMin, utcMax) : null,
  };
}
