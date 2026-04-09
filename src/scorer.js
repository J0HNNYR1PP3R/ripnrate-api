const FRANCHISE_NAMES = [
  "McDonald's",
  'Subway',
  'Starbucks',
  'Burger King',
  'Taco Bell',
  'Chick-fil-A',
  'Dunkin',
  'Pizza Hut',
  "Domino's",
  'KFC',
  "Wendy's",
  'Sonic',
  'Panda Express',
  'Chipotle',
  'Panera',
  'Five Guys',
  'Popeyes',
];

function isFranchise(name = '') {
  const normalizedName = name.toLowerCase();
  return FRANCHISE_NAMES.some((franchise) => normalizedName.includes(franchise.toLowerCase()));
}

function getReviewPoints(reviewsCount) {
  if (reviewsCount >= 500) return 50;
  if (reviewsCount >= 300) return 45;
  if (reviewsCount >= 150) return 35;
  if (reviewsCount >= 75) return 25;
  if (reviewsCount >= 30) return 15;
  if (reviewsCount >= 15) return 8;
  return 0;
}

function getRatingPoints(rating) {
  if (rating >= 4.8 && rating <= 5.0) return 20;
  if (rating >= 4.5 && rating < 4.8) return 16;
  if (rating >= 4.2 && rating < 4.5) return 12;
  if (rating >= 4.0 && rating < 4.2) return 8;
  return 0;
}

function getMetaAdsPoints(metaAdsActive) {
  if (metaAdsActive === false) return 30;
  if (metaAdsActive === true) return 0;
  return 15;
}

function getRarityTier(opportunityScore) {
  if (opportunityScore >= 85) return 'Legendary 🟠';
  if (opportunityScore >= 65) return 'Epic 🟣';
  if (opportunityScore >= 45) return 'Rare 🔵';
  if (opportunityScore >= 25) return 'Uncommon 🟢';
  return 'Common ⚪';
}

export function scoreLead(rawLead, metaAdsActive) {
  const title = rawLead?.title ?? '';
  const phone = rawLead?.phone ?? '';
  const rating = Number(rawLead?.totalScore ?? 0);
  const reviewsCount = Number(rawLead?.reviewsCount ?? 0);

  if (!phone) return null;
  if (rating < 4.0) return null;
  if (reviewsCount < 15) return null;
  if (isFranchise(title)) return null;

  const opportunityScore =
    getReviewPoints(reviewsCount) +
    getRatingPoints(rating) +
    getMetaAdsPoints(metaAdsActive);

  return {
    ...rawLead,
    metaAdsActive,
    opportunityScore,
    rarityTier: getRarityTier(opportunityScore),
  };
}
