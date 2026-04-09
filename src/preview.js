const LOCALHOST_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const NETLIFY_ORIGIN_RE = /^https:\/\/[a-z0-9-]+(?:--[a-z0-9-]+)*\.(?:netlify\.app|netlify\.live)$/i;
const PREVIEW_HEADER = 'x-ccg-preview-key';
const MAX_PREVIEW_LIMIT = 10;

export function isAllowedPreviewOrigin(origin) {
  if (!origin) {
    return true;
  }

  return LOCALHOST_ORIGIN_RE.test(origin) || NETLIFY_ORIGIN_RE.test(origin);
}

export function buildCorsHeaders(origin) {
  const allowedOrigin = isAllowedPreviewOrigin(origin) ? origin : null;

  return {
    'Access-Control-Allow-Origin': allowedOrigin || 'null',
    'Access-Control-Allow-Headers': 'Content-Type, x-ccg-preview-key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function getPreviewRequestKey(headers = {}) {
  const direct = headers[PREVIEW_HEADER];
  const lower = headers[PREVIEW_HEADER.toLowerCase()];
  const upper = headers[PREVIEW_HEADER.toUpperCase()];

  return direct || lower || upper || '';
}

export function assertPreviewAccess(headers = {}) {
  const expectedKey = process.env.CCG_PREVIEW_KEY;

  if (!expectedKey) {
    const error = new Error('CCG preview key is not configured on the server');
    error.statusCode = 500;
    throw error;
  }

  const providedKey = getPreviewRequestKey(headers);

  if (!providedKey || providedKey !== expectedKey) {
    const error = new Error('Invalid preview key');
    error.statusCode = 401;
    throw error;
  }
}

export function parseJsonBody(body) {
  if (body == null || body === '') {
    const error = new Error('Request body is required');
    error.statusCode = 400;
    throw error;
  }

  if (typeof body === 'object') {
    return body;
  }

  try {
    return JSON.parse(body);
  } catch {
    const error = new Error('Request body must be valid JSON');
    error.statusCode = 400;
    throw error;
  }
}

export function toPreviewPipelineInput(input = {}) {
  const niche = typeof input.niche === 'string' ? input.niche.trim() : '';
  const location = typeof input.location === 'string' ? input.location.trim() : '';
  const requestedLimit = Number.isFinite(Number(input.limit)) ? Number(input.limit) : 20;
  const limit = Math.min(Math.max(requestedLimit || 20, 1), MAX_PREVIEW_LIMIT);

  if (!niche) {
    const error = new Error('niche is required');
    error.statusCode = 400;
    throw error;
  }

  if (!location) {
    const error = new Error('location is required');
    error.statusCode = 400;
    throw error;
  }

  return {
    niche,
    location,
    limit,
    enrichAds: false,
  };
}

export function createJsonResponse(statusCode, body, origin) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(origin),
    },
    body: JSON.stringify(body),
  };
}

export function createOptionsResponse(origin) {
  if (!isAllowedPreviewOrigin(origin)) {
    return createJsonResponse(403, { ok: false, error: 'Origin not allowed' }, origin);
  }

  return {
    statusCode: 204,
    headers: buildCorsHeaders(origin),
    body: '',
  };
}
