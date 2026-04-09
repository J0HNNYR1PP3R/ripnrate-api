import axios from 'axios';

const APIFY_BASE_URL = 'https://api.apify.com/v2';
const POLL_INTERVAL_MS = 5000;
const DEFAULT_TIMEOUT_MS = 60000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
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
      maxResults: 10,
    };

    const runResponse = await axios.post(
      `${APIFY_BASE_URL}/acts/dz_omar~facebook-ads-scraper-pro/runs`,
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
      },
    });

    const items = Array.isArray(datasetResponse.data) ? datasetResponse.data : [];
    if (items.length === 0) return false;

    // Match by page_name similarity — keyword search can return unrelated results
    const nameLower = businessName.toLowerCase();
    const matched = items.some((item) => {
      const pageName = (item.page_name || item.title || '').toLowerCase();
      return pageName.includes(nameLower) || nameLower.includes(pageName);
    });
    return matched;
  } catch {
    return null;
  }
}
