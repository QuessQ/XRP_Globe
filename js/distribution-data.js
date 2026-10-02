// XRP holder distribution snapshots (source: harvest.finance/xrp-rich-list).
//
// To add a new snapshot: append an object to SNAPSHOTS (keep them in date order).
// `bands` follows the same order as BANDS: [accounts, xrpHeld] per band.
// XRP held is entered as the rounded figure shown on the source (e.g. 1.44bn → 1.44e9).

export const BANDS = [
  '0-1', '1-10', '10-100', '100-500', '500-1k', '1k-5k', '5k-10k',
  '10k-25k', '25k-50k', '50k-100k', '100k-500k', '500k-1M',
  '1M-5M', '5M-10M', '10M-100M', '100M-1bn', '1bn+',
];

// Coarser cohorts used for the over-time chart. Values are BANDS indices.
export const COHORTS = [
  { label: 'Under 10K',  bands: [0, 1, 2, 3, 4, 5, 6] },
  { label: '10K–1M',     bands: [7, 8, 9, 10, 11] },
  { label: '1M–100M',    bands: [12, 13, 14] },
  { label: '100M–1bn',   bands: [15] },
  { label: '1bn+',       bands: [16] },
];

export const SNAPSHOTS = [
  {
    date: '2026-08-15',
    ledger: 106316546,
    totalAccounts: 8062472,
    bands: [
      [9817, 7.6e3], [2428218, 3.84e6], [3514531, 82.40e6], [669708, 157.17e6],
      [263211, 185.07e6], [635149, 1.43e9], [190925, 1.30e9], [195835, 2.92e9],
      [71844, 2.45e9], [40752, 2.68e9], [28407, 5.03e9], [2026, 1.36e9],
      [1371, 2.71e9], [159, 1.12e9], [426, 14.66e9], [84, 22.39e9], [14, 41.51e9],
    ],
  },
  {
    date: '2026-09-16',
    ledger: 107017319,
    totalAccounts: 8138198,
    bands: [
      [10031, 7.8e3], [2500571, 3.94e6], [3508099, 82.41e6], [670967, 157.47e6],
      [264304, 185.86e6], [638131, 1.44e9], [192100, 1.31e9], [196696, 2.93e9],
      [72274, 2.47e9], [40896, 2.69e9], [28469, 5.04e9], [2018, 1.35e9],
      [1448, 2.83e9], [155, 1.07e9], [438, 14.85e9], [85, 23.16e9], [13, 40.42e9],
    ],
  },
];
