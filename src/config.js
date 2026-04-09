import fs from 'node:fs/promises';
import path from 'node:path';

export const PROJECT_ROOT = process.cwd();
export const APIFY_CONFIG_PATH = 'C:\Users\Fang\.openclaw\workspace\config\apify.json';
export const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');

export async function loadApifyApiKey() {
  const envApiKey = process.env.APIFY_API_KEY?.trim();

  if (envApiKey) {
    return envApiKey;
  }

  const raw = await fs.readFile(APIFY_CONFIG_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const apiKey = parsed?.apiKey;

  if (!apiKey) {
    throw new Error(`Missing APIFY_API_KEY env var or apiKey in ${APIFY_CONFIG_PATH}`);
  }

  return apiKey;
}

export function sanitizeForFilename(value) {
  return String(value)
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');
}
