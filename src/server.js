import express from 'express';
import cors from 'cors';

import { loadApifyApiKey } from './config.js';
import { runLeadPullPipeline, validatePullLeadInput } from './pipeline.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://ccg.wingwide.us',
  'https://www.wingwide.us',
  'https://wingwide.us',
  'https://ripnrate.io',
  'https://www.ripnrate.io',
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ccg-api' });
});

app.post('/api/pull-leads', async (req, res) => {
  try {
    const input = validatePullLeadInput(req.body);
    const apiKey = await loadApifyApiKey();
    const leads = await runLeadPullPipeline({ ...input, apiKey });

    res.json({
      ok: true,
      mode: input.enrichAds ? 'full' : 'fast',
      niche: input.niche,
      location: input.location,
      limit: input.limit,
      count: leads.length,
      leads,
    });
  } catch (error) {
    const status = error.message === 'niche is required' || error.message === 'location is required' ? 400 : 500;

    res.status(status).json({
      ok: false,
      error: error.message || 'Failed to pull leads',
    });
  }
});

app.listen(PORT, () => {
  console.log(`CCG API listening on http://localhost:${PORT}`);
});
