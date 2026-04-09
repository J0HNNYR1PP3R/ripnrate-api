import fs from 'node:fs/promises';
import path from 'node:path';

import { OUTPUT_DIR, sanitizeForFilename } from './config.js';
import { scrapeLeads } from './scraper.js';
import { checkMetaAds } from './enricher.js';
import { scoreLead } from './scorer.js';

export function validatePullLeadInput(input = {}) {
  const niche = typeof input.niche === 'string' ? input.niche.trim() : '';
  const location = typeof input.location === 'string' ? input.location.trim() : '';
  const limit = Number.isFinite(Number(input.limit)) ? Math.min(Math.max(Number(input.limit), 1), 50) : 20;
  const enrichAds = typeof input.enrichAds === 'boolean' ? input.enrichAds : false;

  if (!niche) {
    throw new Error('niche is required');
  }

  if (!location) {
    throw new Error('location is required');
  }

  return { niche, location, limit, enrichAds };
}

export function normalizeLeadForFrontend(lead) {
  return {
    ...lead,
    businessName: lead.businessName || lead.title || 'Unknown Business',
    rating: Number(lead.rating ?? lead.totalScore ?? 0),
  };
}

async function enrichLeadsWithAds(leads, apiKey, country = 'US') {
  const CONCURRENCY = 4;
  const enriched = [];

  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const batch = leads.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (lead) => {
        let metaAdsActive = null;
        try {
          metaAdsActive = await checkMetaAds(lead.title, country, apiKey);
        } catch {
          metaAdsActive = null;
        }

        return { lead, metaAdsActive };
      }),
    );

    enriched.push(...results);
  }

  return enriched;
}

export async function runLeadPullPipeline({ niche, location, limit = 20, enrichAds = false, apiKey }) {
  const rawLeads = await scrapeLeads(niche, location, limit, apiKey);

  const enriched = enrichAds
    ? await enrichLeadsWithAds(rawLeads, apiKey)
    : rawLeads.map((lead) => ({ lead, metaAdsActive: null }));

  const scoredLeads = enriched
    .map(({ lead, metaAdsActive }) => scoreLead(lead, metaAdsActive))
    .filter(Boolean)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .map(normalizeLeadForFrontend);

  return scoredLeads;
}

export function printSummaryTable(scoredLeads) {
  const rows = scoredLeads.map((lead) => ({
    Business: lead.businessName,
    Score: lead.opportunityScore,
    Tier: lead.rarityTier,
    Rating: lead.rating,
    Reviews: lead.reviewsCount,
    MetaAds: lead.metaAdsActive === null ? 'Unknown' : lead.metaAdsActive ? 'Active' : 'None',
    Phone: lead.phone,
    Website: lead.website || '—',
  }));

  console.table(rows);
}

export async function saveResults(niche, location, results) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `results_${sanitizeForFilename(niche)}_${sanitizeForFilename(location)}_${timestamp}.json`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  await fs.writeFile(outputPath, JSON.stringify(results, null, 2), 'utf8');
  return outputPath;
}
