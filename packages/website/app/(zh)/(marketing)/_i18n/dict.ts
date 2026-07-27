import { en } from './en';
import { DEFAULT_LOCALE, type Locale, localizedHref } from './locale';
import type { Dictionary } from './types';
import { zh } from './zh';

const DICTS: Record<Locale, Dictionary> = { zh, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTS[locale];
}

export type { FaqItem, KeyFeature, WorkflowStep } from './types';
export type { Dictionary, Locale };
export { DEFAULT_LOCALE, localizedHref };
