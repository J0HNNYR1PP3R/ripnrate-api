import axios from 'axios';

const APIFY_BASE_URL = 'https://api.apify.com/v2';
const POLL_INTERVAL_MS = 5000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

function normalizeLead(item = {}) {
  return {
    title: item.title ?? item.name ?? '',
    phone: item.phone ?? item.phoneNumber ?? '',
    totalScore: item.totalScore ?? item.rating ?? item.stars ?? null,
    reviewsCount: item.reviewsCount ?? item.reviews ?? item.reviewsTotal ?? 0,
    address: item.address ?? item.streetAddress ?? '',
    website: item.website ?? item.url ?? '',
    categoryName: item.categoryName ?? item.category ?? '',
    placeId: item.placeId ?? item.cid ?? item.googlePlaceId ?? '',
  };
}

async function pollActorRun(runId, apiKey) {
  while (true) {
    const { data } = await axios.get(`${APIFY_BASE_URL}/actor-runs/${runId}`, {
      headers: buildHeaders(apiKey),
    });

    const run = data?.data;
    const status = run?.status;

    if (status === 'SUCCEEDED') {
      return run;
    }

    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Google Places actor run ended with status: ${status}`);
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

export async function scrapeLeads(niche, location, maxResults = 20, apiKey) {
  if (!apiKey) {
    throw new Error('Apify API key is required for scrapeLeads().');
  }

  if (!niche || !location) {
    throw new Error('Both niche and location are required.');
  }

  const searchString = `${niche} ${location}`;
  const input = {
    searchStringsArray: [searchString],
    maxCrawledPlacesPerSearch: maxResults,
    language: 'en',
    countryCode: 'us',
    includeWebResults: false,
  };

  const runResponse = await axios.post(
    `${APIFY_BASE_URL}/acts/compass~crawler-google-places/runs`,
    input,
    {
      headers: buildHeaders(apiKey),
    },
  );

  const runId = runResponse?.data?.data?.id;

  if (!runId) {
    throw new Error('Failed to start Google Places actor run.');
  }

  const run = await pollActorRun(runId, apiKey);
  const datasetId = run?.defaultDatasetId;

  if (!datasetId) {
    throw new Error('Google Places actor completed without a dataset ID.');
  }

  const datasetResponse = await axios.get(`${APIFY_BASE_URL}/datasets/${datasetId}/items`, {
    headers: buildHeaders(apiKey),
    params: {
      clean: true,
    },
  });

  const items = Array.isArray(datasetResponse.data) ? datasetResponse.data : [];
  return items.map(normalizeLead);
}
