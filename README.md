# Rip N Rate — API

Backend scraping and scoring engine for Rip N Rate, the gamified lead generation tool.

This repo now supports a guarded Netlify preview deployment for temporary public demos.

## What it does

- Scrapes Google Maps business leads through the Apify actor `compass/crawler-google-places`
- Optionally checks whether each business appears to have active Meta ads
- Applies hard filters, opportunity scoring, and rarity tiers
- Exposes a lightweight API for the frontend
- Preserves the original script flow for one-off pulls
- Saves scored results to `output/`

## Requirements

- Node.js 18+
- `APIFY_API_KEY` for the scraper backend
- `CCG_PREVIEW_KEY` for the guarded preview API

You can provide `APIFY_API_KEY` either as an environment variable or by storing it in:

```text
C:\Users\Fang\.openclaw\workspace\config\apify.json
```

Expected shape:

```json
{
  "apiKey": "your_apify_key"
}
```

For Netlify preview deployment, set both of these environment variables in the backend site:

```text
APIFY_API_KEY=your_apify_key
CCG_PREVIEW_KEY=your_shared_preview_secret
```

## Install

```bash
npm install
```

## Run the API

```bash
npm run dev:api
```

or

```bash
npm run api
```

API endpoints:

- `GET /api/health`
- `POST /api/pull-leads`

For local Express usage, those routes stay available under `src/server.js`.

Example request body:

```json
{
  "niche": "landscaper",
  "location": "Phoenix AZ",
  "limit": 20,
  "enrichAds": false
}
```

## Netlify preview deployment

Netlify Functions entrypoints live under `netlify/functions/`:

- `health.js`
- `pull-leads.js`

The preview function layer adds these guardrails:

- requires `x-ccg-preview-key` to match `CCG_PREVIEW_KEY`
- forces fast mode (`enrichAds: false`)
- caps `limit` to 10 even if the caller requests more
- allows CORS for localhost and Netlify preview/prod domains
- keeps `APIFY_API_KEY` server-side only

Use the backend site base URL plus `/api`, for example:

```text
https://your-backend-site.netlify.app/api
```

Example preview request:

```bash
curl -X POST https://your-backend-site.netlify.app/api/pull-leads \
  -H "Content-Type: application/json" \
  -H "x-ccg-preview-key: your_shared_preview_secret" \
  -d '{"niche":"landscaper","location":"Phoenix AZ","limit":20,"enrichAds":true}'
```

Even in that request, preview mode still forces `enrichAds` off and clamps `limit` to 10.

## Run the original script

```bash
node src/index.js "landscaper" "Phoenix AZ"
```

Note: the script keeps the original richer flow and runs Meta ads enrichment by default.

## Notes

- Uses ESM modules (`type: module`)
- Local Express API defaults to Fast Mode: scrape + score first, no ads enrichment unless requested
- Netlify preview always forces Fast Mode
- Runtime key loading is done from `APIFY_API_KEY` first, then `config/apify.json`
- Meta ads enrichment falls back to `null` on timeout or request failure so the pipeline can continue
- Output files are written as timestamped JSON files under `output/`
