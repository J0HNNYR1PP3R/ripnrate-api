import dotenv from 'dotenv';

import { loadApifyApiKey } from './config.js';
import { printSummaryTable, runLeadPullPipeline, saveResults } from './pipeline.js';

dotenv.config();

async function main() {
  const niche = process.argv[2];
  const location = process.argv[3];

  if (!niche || !location) {
    console.error('Usage: node src/index.js "landscaper" "Phoenix AZ"');
    process.exit(1);
  }

  try {
    const apiKey = await loadApifyApiKey();
    const scoredLeads = await runLeadPullPipeline({
      niche,
      location,
      limit: 20,
      enrichAds: true,
      apiKey,
    });

    printSummaryTable(scoredLeads);

    const outputPath = await saveResults(niche, location, scoredLeads);
    console.log(`Saved ${scoredLeads.length} scored leads to ${outputPath}`);
  } catch (error) {
    console.error('Pipeline failed:', error.message);
    process.exit(1);
  }
}

main();
