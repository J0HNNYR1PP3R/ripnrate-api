import axios from 'axios';

const APIFY_BASE_URL = 'https://api.apify.com/v2';
const POLL_INTERVAL_MS = 3000;
const DEFAULT_TIMEOUT_MS = 20000;
const META_ADS_ACTOR = 'dz_omar~facebook-ads-scraper-pro';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

function normalizeBusinessName(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesLookRelated(businessName, candidateName) {
  const left = normalizeBusinessName(businessName);
  const right = normalizeBusinessName(candidateName);

  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;

  const leftWords = left.split(' ').filter(Boolean);
  const rightWords = right.split(' ').filter(Boolean);
  const overlap = leftWords.filter((word) => rightWords.includes(word));

  return overlap.length >= Math.min(2, leftWords.length, rightWords.length);
}

async function pollActorRun(runId, apiKey, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const { data } = await axios.get(`${APIFY_BASE_URL}/actor-runs/${runId}`, {
      headers: buildHeaders(apiKey),
    });

    const run = data?.data;
    const status = run?.status;

    if (status === 'SUCCEEDED') {
      return run;
    }

    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      return null;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  return null;
}

export async function checkMetaAds(businessName, country = 'US', apiKey, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!apiKey || !businessName) {
    return null;
  }

  try {
    const input = {
      searchQueries: [businessName],
      activeStatus: 'ACTIVE',
      country,
      maxResults: 1,
    };

    const runResponse = await axios.post(
      `${APIFY_BASE_URL}/acts/${META_ADS_ACTOR}/runs`,
      input,
      {
        headers: buildHeaders(apiKey),
      },
    );

    const runId = runResponse?.data?.data?.id;

    if (!runId) {
      return null;
    }

    const run = await pollActorRun(runId, apiKey, timeoutMs);

    if (!run?.defaultDatasetId) {
      return null;
    }

    const datasetResponse = await axios.get(`${APIFY_BASE_URL}/datasets/${run.defaultDatasetId}/items`, {
      headers: buildHeaders(apiKey),
      params: {
        clean: true,
        limit: 1,
      },
    });

    const items = Array.isArray(datasetResponse.data) ? datasetResponse.data : [];
    if (items.length === 0) return false;

    const matched = items.some((item) => {
      const pageName = item.page_name || item.title || item.pageTitle || '';
      return namesLookRelated(businessName, pageName);
    });

    return matched;
  } catch {
    return null;
  }
}
