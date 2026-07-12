/**
 * Static reference data: cities, known XRPL wallets, and holdings estimates.
 *
 * XRP transactions carry no geography. Everything geographic in this app comes
 * from this file: known exchange / institutional wallets are pinned to the
 * entity's home city, and unidentified wallets are assigned a weighted,
 * deterministic "estimated" city. Update figures here as reserves shift —
 * nothing else in the app needs to change.
 */

export const TOTAL_SUPPLY_B = 99.99; // billions of XRP (100B minus burned fees)

/** Cities that can appear on the globe. weight = share of unidentified-wallet
 *  traffic routed here (rough proxy for regional XRP exchange activity). */
export const CITIES = [
  { id: 'sfo', name: 'San Francisco', country: 'United States',  region: 'North America', lat: 37.7749,  lng: -122.4194, weight: 0.07 },
  { id: 'nyc', name: 'New York',      country: 'United States',  region: 'North America', lat: 40.7128,  lng: -74.006,   weight: 0.08 },
  { id: 'sea', name: 'Seattle',       country: 'United States',  region: 'North America', lat: 47.6062,  lng: -122.3321, weight: 0.02 },
  { id: 'tor', name: 'Toronto',       country: 'Canada',         region: 'North America', lat: 43.6532,  lng: -79.3832,  weight: 0.02 },
  { id: 'mex', name: 'Mexico City',   country: 'Mexico',         region: 'Latin America', lat: 19.4326,  lng: -99.1332,  weight: 0.04 },
  { id: 'sao', name: 'São Paulo',     country: 'Brazil',         region: 'Latin America', lat: -23.5505, lng: -46.6333,  weight: 0.03 },
  { id: 'lon', name: 'London',        country: 'United Kingdom', region: 'Europe',        lat: 51.5074,  lng: -0.1278,   weight: 0.07 },
  { id: 'lux', name: 'Luxembourg',    country: 'Luxembourg',     region: 'Europe',        lat: 49.6116,  lng: 6.1319,    weight: 0.03 },
  { id: 'ams', name: 'Amsterdam',     country: 'Netherlands',    region: 'Europe',        lat: 52.3676,  lng: 4.9041,    weight: 0.03 },
  { id: 'fra', name: 'Frankfurt',     country: 'Germany',        region: 'Europe',        lat: 50.1109,  lng: 8.6821,    weight: 0.03 },
  { id: 'zur', name: 'Zurich',        country: 'Switzerland',    region: 'Europe',        lat: 47.3769,  lng: 8.5417,    weight: 0.02 },
  { id: 'par', name: 'Paris',         country: 'France',         region: 'Europe',        lat: 48.8566,  lng: 2.3522,    weight: 0.02 },
  { id: 'dub', name: 'Dubai',         country: 'UAE',            region: 'Middle East',   lat: 25.2048,  lng: 55.2708,   weight: 0.05 },
  { id: 'mum', name: 'Mumbai',        country: 'India',          region: 'Asia',          lat: 19.076,   lng: 72.8777,   weight: 0.03 },
  { id: 'sin', name: 'Singapore',     country: 'Singapore',      region: 'Asia',          lat: 1.3521,   lng: 103.8198,  weight: 0.08 },
  { id: 'hkg', name: 'Hong Kong',     country: 'Hong Kong',      region: 'Asia',          lat: 22.3193,  lng: 114.1694,  weight: 0.06 },
  { id: 'sel', name: 'Seoul',         country: 'South Korea',    region: 'Asia',          lat: 37.5665,  lng: 126.978,   weight: 0.16 },
  { id: 'tok', name: 'Tokyo',         country: 'Japan',          region: 'Asia',          lat: 35.6762,  lng: 139.6503,  weight: 0.08 },
  { id: 'mnl', name: 'Manila',        country: 'Philippines',    region: 'Asia',          lat: 14.5995,  lng: 120.9842,  weight: 0.03 },
  { id: 'bkk', name: 'Bangkok',       country: 'Thailand',       region: 'Asia',          lat: 13.7563,  lng: 100.5018,  weight: 0.03 },
  { id: 'syd', name: 'Sydney',        country: 'Australia',      region: 'Oceania',       lat: -33.8688, lng: 151.2093,  weight: 0.02 },
  { id: 'mlt', name: 'Valletta',      country: 'Malta',          region: 'Europe',        lat: 35.8989,  lng: 14.5146,   weight: 0.06 },
];

export const CITY_BY_ID = Object.fromEntries(CITIES.map(c => [c.id, c]));

/**
 * Known XRPL account → entity mapping (best-effort, from widely published
 * rich-list attributions; edit freely). Anything not listed is treated as
 * unidentified and geo-estimated.
 */
export const KNOWN_WALLETS = {
  rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh: { entity: 'Binance',  cityId: 'mlt', type: 'exchange' },
  rLNaPoKeeBjZe2qs6x52yVPZpZ8td4dc6w: { entity: 'Binance',  cityId: 'mlt', type: 'exchange' },
  rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B:  { entity: 'Bitstamp', cityId: 'lux', type: 'exchange' },
  rLHzPsX6oXkzU2qL12kHCH8G8cnZv1rBJh: { entity: 'Kraken',   cityId: 'sfo', type: 'exchange' },
  rw2ciyaNshpHe7bCHo4bRWq6pqqynnWKQg: { entity: 'Coinbase', cityId: 'nyc', type: 'exchange' },
  rPVMhWBsfF9iMXYj3aAzJVkPDTFNSyWdKy: { entity: 'Bittrex',  cityId: 'sea', type: 'exchange' },
  rLW9gnQo7BQhU6igk5keqYnH3TVrCxGRzm: { entity: 'Bitfinex', cityId: 'hkg', type: 'exchange' },
};

/**
 * Size cohorts for classifying individual payments. Bounds are XRP amounts;
 * a payment belongs to the first tier whose max it does not exceed. Rough
 * behavioral reading: retail ≈ individuals, mid ≈ active traders / small
 * desks, large ≈ funds & OTC desks, whale ≈ major holders / treasuries.
 */
export const TIERS = [
  { id: 'retail', label: 'Retail',      max: 10_000,    color: 'rgba(57,135,229,0.55)',  head: 'rgba(109,167,236,0.75)' },
  { id: 'mid',    label: 'Mid-size',    max: 100_000,   color: 'rgba(57,135,229,0.85)',  head: 'rgba(140,200,255,0.95)' },
  { id: 'large',  label: 'Large',       max: 1_000_000, color: 'rgba(25,158,112,0.85)',  head: 'rgba(80,220,170,0.95)'  },
  { id: 'whale',  label: 'Whale',       max: Infinity,  color: 'rgba(213,81,129,0.85)',  head: 'rgba(244,140,180,0.95)' },
];

export function classifyAmount(xrp) {
  return TIERS.find(t => xrp < t.max) || TIERS[TIERS.length - 1];
}

/**
 * Estimated holdings by identifiable entity, in billions of XRP.
 * Sources: Ripple's published escrow figure + public rich-list / exchange
 * reserve snapshots (order-of-magnitude; exchange balances move daily).
 */
export const HOLDINGS = [
  { entity: 'Ripple — escrow',      cityId: 'sfo', region: 'North America', billions: 35.8 },
  { entity: 'Ripple — operational', cityId: 'sfo', region: 'North America', billions: 4.6  },
  { entity: 'Upbit',                cityId: 'sel', region: 'Asia',          billions: 5.9  },
  { entity: 'Binance',              cityId: 'mlt', region: 'Europe',        billions: 2.9  },
  { entity: 'Bithumb',              cityId: 'sel', region: 'Asia',          billions: 1.2  },
  { entity: 'Coinbase',             cityId: 'nyc', region: 'North America', billions: 0.9  },
  { entity: 'Kraken',               cityId: 'sfo', region: 'North America', billions: 0.6  },
  { entity: 'Bitso',                cityId: 'mex', region: 'Latin America', billions: 0.4  },
  { entity: 'Bitstamp',             cityId: 'lux', region: 'Europe',        billions: 0.35 },
  { entity: 'SBI VC Trade',         cityId: 'tok', region: 'Asia',          billions: 0.3  },
  { entity: 'Other exchanges',      cityId: null,  region: 'Global',        billions: 2.0  },
];

/** Remainder of supply nobody can place geographically. */
export const UNIDENTIFIED = {
  entity: 'Self-custody & unidentified',
  region: 'Unknown',
  billions: +(TOTAL_SUPPLY_B - HOLDINGS.reduce((s, h) => s + h.billions, 0)).toFixed(2),
};

/** Sum of estimated holdings per city (billions), for globe point sizing. */
export const CITY_HOLDINGS = (() => {
  const map = {};
  for (const h of HOLDINGS) {
    if (!h.cityId) continue;
    map[h.cityId] = (map[h.cityId] || 0) + h.billions;
  }
  return map;
})();

/** Entities per city, for tooltips / the city card. */
export const CITY_ENTITIES = (() => {
  const map = {};
  for (const h of HOLDINGS) {
    if (!h.cityId) continue;
    (map[h.cityId] = map[h.cityId] || []).push(h.entity);
  }
  return map;
})();

/** Deterministic city for an unidentified account: same address always lands
 *  in the same weighted-random city, so repeat actors look consistent. */
export function estimateCity(address) {
  let h = 5381;
  for (let i = 0; i < address.length; i++) h = ((h << 5) + h + address.charCodeAt(i)) >>> 0;
  const total = CITIES.reduce((s, c) => s + c.weight, 0);
  let x = (h % 10000) / 10000 * total;
  for (const c of CITIES) {
    x -= c.weight;
    if (x <= 0) return c;
  }
  return CITIES[CITIES.length - 1];
}

/** Resolve an XRPL address to { city, entity, known }. */
export function locateAccount(address) {
  const known = KNOWN_WALLETS[address];
  if (known) return { city: CITY_BY_ID[known.cityId], entity: known.entity, type: known.type, known: true };
  return { city: estimateCity(address), entity: null, type: null, known: false };
}
