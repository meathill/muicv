import { type CapturedJd, canonicalizeUrl, isLikelyJobUrl, type JobSiteId, siteIdForHost } from '@muicv/shared';

import { type ExtractedFields, extractBySelectors, extractGeneric } from './generic.ts';
import type { QueryRoot } from './query.ts';

const SITE_SELECTORS: Record<
  Exclude<JobSiteId, 'generic'>,
  { title: string; company: string; location?: string; body: string }
> = {
  boss: {
    title: '.job-title,.name,h1',
    company: '.company-info .name,.company-text,.company-info a',
    location: '.job-location,.location-name,.text-desc span',
    body: '.job-sec-text,.job-detail-section,.job-sec,.job-detail',
  },
  zhilian: {
    title: 'h1,.job-summary h1,.position-head h1',
    company: '.company-name a,.company-name,.summary-company a',
    location: '.job-address,.location',
    body: '.describtion,.job-detail,.position-detail',
  },
  liepin: {
    title: 'h1,.job-title,.name',
    company: '.company-name,.title-box .company a',
    location: '.job-intro span,.job-location',
    body: '.job-intro,.job-description,.content',
  },
  lagou: {
    title: 'h1,.job-name span,.job-name',
    company: '.company,.company-name a,.job-company',
    location: '.work_addr,.job-request span',
    body: '.job-detail,#job-detail',
  },
  job51: {
    title: 'h1,.job-name,.cn h1',
    company: '.cname a,.cname,.company',
    location: '.lname,.job-area',
    body: '.job-detail,.bmsg,.job_msg',
  },
  linkedin: {
    title: 'h1.t-24,h1',
    company: '.job-details-jobs-unified-top-card__company-name a,.job-details-jobs-unified-top-card__company-name',
    location: '.job-details-jobs-unified-top-card__bullet,.jobs-unified-top-card__bullet',
    body: '.jobs-description,#job-details,.jobs-box__html-content',
  },
  indeed: {
    title: 'h1.jobsearch-JobInfoHeader-title,h1',
    company: '[data-company-name],.jobsearch-InlineCompanyRating a,.jobsearch-CompanyInfoContainer',
    location: '[data-testid="inlineHeader-companyLocation"]',
    body: '#jobDescriptionText,.jobsearch-JobComponent-description',
  },
  greenhouse: {
    title: '#header h1,h1.app-title,h1',
    company: '.company-name,#header .company-name,h2.company-name',
    location: '.location,.app-location',
    body: '#content,#app_body,.content,.job-post',
  },
  lever: {
    title: '.posting-headline h2,h2',
    company: '.main-header-text a,.main-header-logo img[alt]',
    location: '.posting-categories .location,.sort-by-time',
    body: '.section-wrapper,.content,.posting-description',
  },
  ashby: {
    title: 'h1,[class*="title"] h1',
    company: '[class*="company"],header img[alt]',
    location: '[class*="location"]',
    body: 'article,[class*="description"],[class*="JobPosting"]',
  },
};

export function extractCapturedJd(q: QueryRoot, now = new Date()): CapturedJd | null {
  let host = '';
  try {
    host = new URL(q.url).hostname;
  } catch {
    return null;
  }
  const site = siteIdForHost(host);
  let fields: ExtractedFields | null = null;
  if (site !== 'generic') {
    fields = extractBySelectors(q, SITE_SELECTORS[site], site);
  }
  if (!fields || fields.markdown.length < 80) {
    const generic = extractGeneric(q);
    if (generic && generic.markdown.length > (fields?.markdown.length ?? 0)) fields = generic;
  }
  if (!fields) return null;
  return {
    url: q.url,
    canonicalUrl: canonicalizeUrl(q.url),
    sourceSite: fields.sourceSite,
    title: fields.title,
    company: fields.company,
    location: fields.location,
    employmentType: fields.employmentType,
    markdown: fields.markdown,
    extractedAt: now.toISOString(),
  };
}

export function shouldOfferCapture(q: QueryRoot): boolean {
  if (isLikelyJobUrl(q.url)) return true;
  return extractGeneric(q) !== null;
}
