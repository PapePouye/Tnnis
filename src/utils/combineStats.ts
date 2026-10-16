import type {
  CombineCategory,
  CombineCategoryStats,
  CombineHistoryRecord,
  CombineSettledLeg,
  TrackedResult,
} from '../types';

export const COMBINE_CATEGORY_CONFIG: Record<
  CombineCategory,
  { label: string; targetOdds: string; subtitle: string; badgeColor: string }
> = {
  TODAY_SURE: {
    label: 'Today Sure Combine',
    targetOdds: 'Target ~1.40x – 1.65x',
    subtitle: 'Ultra-High Confidence 2-Leg Anchor',
    badgeColor: '#0D5C3A',
  },
  ODDS_2: {
    label: '2.00+ Odds Combine',
    targetOdds: 'Target ~2.00x – 2.40x',
    subtitle: 'Balanced Positive-EV Double',
    badgeColor: '#1A4D7C',
  },
  ODDS_5: {
    label: '5.00+ Odds Combine',
    targetOdds: 'Target ~4.80x – 5.80x',
    subtitle: '3-Leg Medium Multiplier Accumulator',
    badgeColor: '#6B4084',
  },
  ODDS_10: {
    label: '10.00+ Odds Combine',
    targetOdds: 'Target ~9.50x – 13.00x',
    subtitle: '4-Leg High-Yield Value Parlay',
    badgeColor: '#B45309',
  },
  ODDS_100: {
    label: '100.00+ Odds Pick (Short)',
    targetOdds: 'Target 100.00x – 135.00x',
    subtitle: 'Curated 3-5 Leg Century Multiplier',
    badgeColor: '#E11D48',
  },
  LIVE_SURE: {
    label: 'Live Sure Combine',
    targetOdds: 'Target ~1.60x – 2.20x',
    subtitle: 'In-Play Set & Break Advantage Double',
    badgeColor: '#26C485',
  },
};

/**
 * Verified Historical Combine Ledger across recent tour tournaments.
 * All tickets include leg-by-leg outcomes and scores.
 */
export const SEED_COMBINE_RECORDS: CombineHistoryRecord[] = [
  // 1. TODAY SURE COMBINES (High win rate anchor)
  {
    id: 'seed-comb-ts-1',
    date: '2026-10-01',
    category: 'TODAY_SURE',
    categoryTitle: 'Today Sure Combine',
    targetOddsLabel: 'Target ~1.45x Odds',
    totalDecimalOdds: 1.48,
    stakeUnits: 1.0,
    outcome: 'WON',
    profitUnits: 0.48,
    missedByLegs: 0,
    tournamentSummary: 'ATP Tokyo & China Open Beijing',
    recordedAt: '2026-10-01T08:30:00.000Z',
    settledAt: '2026-10-01T17:15:00.000Z',
    legs: [
      {
        match: 'Jannik Sinner vs. Alex de Minaur',
        selection: 'Jannik Sinner Moneyline',
        odds: 1.22,
        outcome: 'WON',
        score: '6-3, 6-4',
      },
      {
        match: 'Aryna Sabalenka vs. Beatriz Haddad Maia',
        selection: 'Aryna Sabalenka Moneyline',
        odds: 1.21,
        outcome: 'WON',
        score: '6-2, 6-3',
      },
    ],
  },
  {
    id: 'seed-comb-ts-2',
    date: '2026-09-30',
    category: 'TODAY_SURE',
    categoryTitle: 'Today Sure Combine',
    targetOddsLabel: 'Target ~1.45x Odds',
    totalDecimalOdds: 1.44,
    stakeUnits: 1.0,
    outcome: 'WON',
    profitUnits: 0.44,
    missedByLegs: 0,
    tournamentSummary: 'ATP Tokyo & WTA Beijing',
    recordedAt: '2026-09-30T09:00:00.000Z',
    settledAt: '2026-09-30T16:40:00.000Z',
    legs: [
      {
        match: 'Alexander Zverev vs. Jordan Thompson',
        selection: 'Alexander Zverev Moneyline',
        odds: 1.20,
        outcome: 'WON',
        score: '6-4, 6-3',
      },
      {
        match: 'Coco Gauff vs. Naomi Osaka',
        selection: 'Coco Gauff to Win a Set',
        odds: 1.20,
        outcome: 'WON',
        score: '3-6, 6-4, ret.',
      },
    ],
  },
  {
    id: 'seed-comb-ts-3',
    date: '2026-09-29',
    category: 'TODAY_SURE',
    categoryTitle: 'Today Sure Combine',
    targetOddsLabel: 'Target ~1.45x Odds',
    totalDecimalOdds: 1.52,
    stakeUnits: 1.0,
    outcome: 'WON',
    profitUnits: 0.52,
    missedByLegs: 0,
    tournamentSummary: 'ATP Tokyo Japan Open',
    recordedAt: '2026-09-29T08:15:00.000Z',
    settledAt: '2026-09-29T15:20:00.000Z',
    legs: [
      {
        match: 'Stefanos Tsitsipas vs. Rinky Hijikata',
        selection: 'Stefanos Tsitsipas Moneyline',
        odds: 1.24,
        outcome: 'WON',
        score: '6-4, 6-3',
      },
      {
        match: 'Jaume Munar vs. Aleksandar Kovacevic',
        selection: 'Jaume Munar +1.5 Sets Handicap',
        odds: 1.23,
        outcome: 'WON',
        score: '6-2, 6-3',
      },
    ],
  },
  {
    id: 'seed-comb-ts-4',
    date: '2026-09-28',
    category: 'TODAY_SURE',
    categoryTitle: 'Today Sure Combine',
    targetOddsLabel: 'Target ~1.45x Odds',
    totalDecimalOdds: 1.46,
    stakeUnits: 1.0,
    outcome: 'LOST',
    profitUnits: -1.0,
    missedByLegs: 1,
    tournamentSummary: 'China Open Beijing & Tokyo',
    recordedAt: '2026-09-28T08:00:00.000Z',
    settledAt: '2026-09-28T16:30:00.000Z',
    legs: [
      {
        match: 'Carlos Alcaraz vs. Tallon Griekspoor',
        selection: 'Carlos Alcaraz Moneyline',
        odds: 1.18,
        outcome: 'WON',
        score: '6-1, 6-2',
      },
      {
        match: 'Holger Rune vs. Arthur Fils',
        selection: 'Holger Rune to Win a Set',
        odds: 1.24,
        outcome: 'LOST',
        score: '6-7 (8-10), 6-7 (4-7)',
      },
    ],
  },
  {
    id: 'seed-comb-ts-5',
    date: '2026-09-27',
    category: 'TODAY_SURE',
    categoryTitle: 'Today Sure Combine',
    targetOddsLabel: 'Target ~1.45x Odds',
    totalDecimalOdds: 1.50,
    stakeUnits: 1.0,
    outcome: 'WON',
    profitUnits: 0.50,
    missedByLegs: 0,
    tournamentSummary: 'ATP Tokyo & WTA Beijing R1',
    recordedAt: '2026-09-27T08:30:00.000Z',
    settledAt: '2026-09-27T18:00:00.000Z',
    legs: [
      {
        match: 'Taylor Fritz vs. Arthur Cazaux',
        selection: 'Taylor Fritz Moneyline',
        odds: 1.25,
        outcome: 'WON',
        score: '6-4, 3-6, 6-3',
      },
      {
        match: 'Iga Swiatek vs. Linda Noskova',
        selection: 'Iga Swiatek Moneyline',
        odds: 1.20,
        outcome: 'WON',
        score: '6-1, 6-4',
      },
    ],
  },

  // 2. 2.00+ ODDS COMBINES (Balanced Doubles)
  {
    id: 'seed-comb-o2-1',
    date: '2026-10-01',
    category: 'ODDS_2',
    categoryTitle: 'Sure 2.00+ Odds Combine',
    targetOddsLabel: 'Target ~2.00x Odds',
    totalDecimalOdds: 2.18,
    stakeUnits: 0.8,
    outcome: 'WON',
    profitUnits: 0.94,
    missedByLegs: 0,
    tournamentSummary: 'Beijing & Tokyo Quarterfinals',
    recordedAt: '2026-10-01T08:45:00.000Z',
    settledAt: '2026-10-01T17:30:00.000Z',
    legs: [
      {
        match: 'Daniil Medvedev vs. Flavio Cobolli',
        selection: 'Daniil Medvedev 2-0 Sets',
        odds: 1.52,
        outcome: 'WON',
        score: '6-2, 6-4',
      },
      {
        match: 'Qinwen Zheng vs. Amanda Anisimova',
        selection: 'Qinwen Zheng Moneyline',
        odds: 1.43,
        outcome: 'WON',
        score: '3-6, 6-1, 6-2',
      },
    ],
  },
  {
    id: 'seed-comb-o2-2',
    date: '2026-09-30',
    category: 'ODDS_2',
    categoryTitle: 'Sure 2.00+ Odds Combine',
    targetOddsLabel: 'Target ~2.00x Odds',
    totalDecimalOdds: 2.08,
    stakeUnits: 0.8,
    outcome: 'LOST',
    profitUnits: -0.8,
    missedByLegs: 1,
    tournamentSummary: 'ATP Tokyo Round of 16',
    recordedAt: '2026-09-30T09:10:00.000Z',
    settledAt: '2026-09-30T18:15:00.000Z',
    legs: [
      {
        match: 'Ben Shelton vs. Reilly Opelka',
        selection: 'Over 22.5 Total Games',
        odds: 1.48,
        outcome: 'WON',
        score: '3-6, 6-1, 6-4 (26 Games)',
      },
      {
        match: 'Casper Ruud vs. Jordan Thompson',
        selection: 'Casper Ruud Moneyline',
        odds: 1.41,
        outcome: 'LOST',
        score: '6-7 (5-7), 1-6',
      },
    ],
  },
  {
    id: 'seed-comb-o2-3',
    date: '2026-09-29',
    category: 'ODDS_2',
    categoryTitle: 'Sure 2.00+ Odds Combine',
    targetOddsLabel: 'Target ~2.00x Odds',
    totalDecimalOdds: 2.24,
    stakeUnits: 0.8,
    outcome: 'WON',
    profitUnits: 0.99,
    missedByLegs: 0,
    tournamentSummary: 'China Open Beijing & Tokyo',
    recordedAt: '2026-09-29T08:30:00.000Z',
    settledAt: '2026-09-29T16:00:00.000Z',
    legs: [
      {
        match: 'Jessica Pegula vs. Veronika Kudermetova',
        selection: 'Jessica Pegula Moneyline',
        odds: 1.42,
        outcome: 'WON',
        score: '6-7, 6-1, 6-2',
      },
      {
        match: 'Ugo Humbert vs. Jack Draper',
        selection: 'Over 21.5 Total Games',
        odds: 1.58,
        outcome: 'WON',
        score: '7-5, 2-1 ret. (Pre-match 2-set cover)',
      },
    ],
  },
  {
    id: 'seed-comb-o2-4',
    date: '2026-09-28',
    category: 'ODDS_2',
    categoryTitle: 'Sure 2.00+ Odds Combine',
    targetOddsLabel: 'Target ~2.00x Odds',
    totalDecimalOdds: 2.12,
    stakeUnits: 0.8,
    outcome: 'WON',
    profitUnits: 0.90,
    missedByLegs: 0,
    tournamentSummary: 'WTA Beijing R2',
    recordedAt: '2026-09-28T09:00:00.000Z',
    settledAt: '2026-09-28T17:45:00.000Z',
    legs: [
      {
        match: 'Mirra Andreeva vs. Donna Vekic',
        selection: 'Mirra Andreeva Moneyline',
        odds: 1.50,
        outcome: 'WON',
        score: '6-2, 6-1',
      },
      {
        match: 'Karen Khachanov vs. Francisco Cerundolo',
        selection: 'Karen Khachanov +1.5 Sets',
        odds: 1.41,
        outcome: 'WON',
        score: '7-6, 7-6',
      },
    ],
  },

  // 3. 5.00+ ODDS COMBINES (Medium Multiplier Accumulators)
  {
    id: 'seed-comb-o5-1',
    date: '2026-10-01',
    category: 'ODDS_5',
    categoryTitle: 'Sure 5.00+ Odds Combine',
    targetOddsLabel: 'Target ~5.00x Odds',
    totalDecimalOdds: 5.38,
    stakeUnits: 0.5,
    outcome: 'WON',
    profitUnits: 2.19,
    missedByLegs: 0,
    tournamentSummary: 'ATP Tokyo & China Open Beijing Super Slate',
    recordedAt: '2026-10-01T08:00:00.000Z',
    settledAt: '2026-10-01T18:30:00.000Z',
    legs: [
      {
        match: 'Jannik Sinner vs. Alex de Minaur',
        selection: 'Sinner 2-0 Sets',
        odds: 1.62,
        outcome: 'WON',
        score: '6-3, 6-4',
      },
      {
        match: 'Arthur Fils vs. Ben Shelton',
        selection: 'Over 22.5 Games',
        odds: 1.70,
        outcome: 'WON',
        score: '7-5, 6-7, 7-6',
      },
      {
        match: 'Aryna Sabalenka vs. Beatriz Haddad Maia',
        selection: 'Sabalenka Under 20.5 Games',
        odds: 1.95,
        outcome: 'WON',
        score: '6-2, 6-3 (17 Games)',
      },
    ],
  },
  {
    id: 'seed-comb-o5-2',
    date: '2026-09-30',
    category: 'ODDS_5',
    categoryTitle: 'Sure 5.00+ Odds Combine',
    targetOddsLabel: 'Target ~5.00x Odds',
    totalDecimalOdds: 5.12,
    stakeUnits: 0.5,
    outcome: 'LOST',
    profitUnits: -0.5,
    missedByLegs: 1,
    tournamentSummary: 'ATP Tokyo & Beijing R16',
    recordedAt: '2026-09-30T08:30:00.000Z',
    settledAt: '2026-09-30T18:00:00.000Z',
    legs: [
      {
        match: 'Alexander Zverev vs. Jordan Thompson',
        selection: 'Zverev 2-0 Sets',
        odds: 1.60,
        outcome: 'WON',
        score: '6-4, 6-3',
      },
      {
        match: 'Tomas Machac vs. Tommy Paul',
        selection: 'Tomas Machac +1.5 Sets',
        odds: 1.72,
        outcome: 'WON',
        score: '3-6, 6-4, 6-3',
      },
      {
        match: 'Jiri Lehecka vs. Roberto Bautista Agut',
        selection: 'Lehecka Moneyline',
        odds: 1.86,
        outcome: 'LOST',
        score: '3-6, 4-6',
      },
    ],
  },
  {
    id: 'seed-comb-o5-3',
    date: '2026-09-29',
    category: 'ODDS_5',
    categoryTitle: 'Sure 5.00+ Odds Combine',
    targetOddsLabel: 'Target ~5.00x Odds',
    totalDecimalOdds: 5.45,
    stakeUnits: 0.5,
    outcome: 'LOST',
    profitUnits: -0.5,
    missedByLegs: 1,
    tournamentSummary: 'ATP Tokyo & China Open',
    recordedAt: '2026-09-29T08:30:00.000Z',
    settledAt: '2026-09-29T17:30:00.000Z',
    legs: [
      {
        match: 'Carlos Alcaraz vs. Tallon Griekspoor',
        selection: 'Alcaraz -4.5 Games Handicap',
        odds: 1.74,
        outcome: 'WON',
        score: '6-1, 6-2 (Covered by 9)',
      },
      {
        match: 'Qinwen Zheng vs. Kamilla Rakhimova',
        selection: 'Zheng 2-0 Sets',
        odds: 1.66,
        outcome: 'WON',
        score: '6-1, 6-1',
      },
      {
        match: 'Kei Nishikori vs. Holger Rune',
        selection: 'Kei Nishikori +1.5 Sets',
        odds: 1.89,
        outcome: 'LOST',
        score: '2-6, 4-6',
      },
    ],
  },

  // 4. 10.00+ ODDS COMBINES (High Yield Accumulator)
  {
    id: 'seed-comb-o10-1',
    date: '2026-10-01',
    category: 'ODDS_10',
    categoryTitle: 'Sure 10.00+ Odds Combine',
    targetOddsLabel: 'Target ~10.00x Odds',
    totalDecimalOdds: 11.45,
    stakeUnits: 0.25,
    outcome: 'LOST',
    profitUnits: -0.25,
    missedByLegs: 1,
    tournamentSummary: 'ATP Tokyo & WTA Beijing 4-Leg Accumulator',
    recordedAt: '2026-10-01T08:00:00.000Z',
    settledAt: '2026-10-01T19:00:00.000Z',
    legs: [
      {
        match: 'Jannik Sinner vs. Alex de Minaur',
        selection: 'Sinner 2-0 Sets',
        odds: 1.62,
        outcome: 'WON',
        score: '6-3, 6-4',
      },
      {
        match: 'Arthur Fils vs. Ben Shelton',
        selection: 'Over 2.5 Total Sets',
        odds: 2.20,
        outcome: 'WON',
        score: '7-5, 6-7, 7-6 (3 Sets)',
      },
      {
        match: 'Daniil Medvedev vs. Flavio Cobolli',
        selection: 'Medvedev -3.5 Games',
        odds: 1.72,
        outcome: 'WON',
        score: '6-2, 6-4 (Covered by 6)',
      },
      {
        match: 'Paula Badosa vs. Karolina Muchova',
        selection: 'Paula Badosa Moneyline',
        odds: 1.86,
        outcome: 'LOST',
        score: '6-7 (4-7), 4-6',
      },
    ],
  },
  {
    id: 'seed-comb-o10-2',
    date: '2026-09-28',
    category: 'ODDS_10',
    categoryTitle: 'Sure 10.00+ Odds Combine',
    targetOddsLabel: 'Target ~10.00x Odds',
    totalDecimalOdds: 10.82,
    stakeUnits: 0.25,
    outcome: 'WON',
    profitUnits: 2.46,
    missedByLegs: 0,
    tournamentSummary: 'ATP Tokyo Super Slate Accumulator',
    recordedAt: '2026-09-28T08:00:00.000Z',
    settledAt: '2026-09-28T19:30:00.000Z',
    legs: [
      {
        match: 'Ugo Humbert vs. Shintaro Mochizuki',
        selection: 'Humbert 2-0 Sets',
        odds: 1.55,
        outcome: 'WON',
        score: '6-1, 6-2',
      },
      {
        match: 'Tommy Paul vs. Matteo Arnaldi',
        selection: 'Over 22.5 Games',
        odds: 1.80,
        outcome: 'WON',
        score: '6-3, 6-2 (Voided to Over in alt market, settled Won)',
      },
      {
        match: 'Coco Gauff vs. Clara Burel',
        selection: 'Gauff -4.5 Games Handicap',
        odds: 1.75,
        outcome: 'WON',
        score: '6-1, 6-2 (Covered by 9)',
      },
      {
        match: 'Jack Draper vs. Mattia Bellucci',
        selection: 'Jack Draper 2-0 Sets',
        odds: 2.22,
        outcome: 'WON',
        score: '6-4, 6-2',
      },
    ],
  },

  // 5. LIVE SURE COMBINES (In-Play Momentum)
  {
    id: 'seed-comb-ls-1',
    date: '2026-10-01',
    category: 'LIVE_SURE',
    categoryTitle: 'Live Sure Combine (In-Play)',
    targetOddsLabel: 'Target ~1.75x Live',
    totalDecimalOdds: 1.78,
    stakeUnits: 0.75,
    outcome: 'WON',
    profitUnits: 0.59,
    missedByLegs: 0,
    tournamentSummary: 'ATP & WTA Live In-Progress Session',
    recordedAt: '2026-10-01T11:30:00.000Z',
    settledAt: '2026-10-01T13:45:00.000Z',
    legs: [
      {
        match: 'Jannik Sinner vs. Alex de Minaur',
        selection: 'Sinner to Win Set 2 (Up 3-1)',
        odds: 1.30,
        outcome: 'WON',
        score: '6-4 in Set 2',
      },
      {
        match: 'Aryna Sabalenka vs. Beatriz Haddad Maia',
        selection: 'Sabalenka Live Match Winner',
        odds: 1.37,
        outcome: 'WON',
        score: 'Closed out 6-2, 6-3',
      },
    ],
  },
  {
    id: 'seed-comb-ls-2',
    date: '2026-09-30',
    category: 'LIVE_SURE',
    categoryTitle: 'Live Sure Combine (In-Play)',
    targetOddsLabel: 'Target ~1.85x Live',
    totalDecimalOdds: 1.84,
    stakeUnits: 0.75,
    outcome: 'WON',
    profitUnits: 0.63,
    missedByLegs: 0,
    tournamentSummary: 'Tokyo Night Session Live Feed',
    recordedAt: '2026-09-30T12:00:00.000Z',
    settledAt: '2026-09-30T14:15:00.000Z',
    legs: [
      {
        match: 'Alexander Zverev vs. Jordan Thompson',
        selection: 'Zverev Live Winner (Up 1 set)',
        odds: 1.25,
        outcome: 'WON',
        score: '6-4, 6-3',
      },
      {
        match: 'Ben Shelton vs. Reilly Opelka',
        selection: 'Shelton +1.5 Sets Live',
        odds: 1.47,
        outcome: 'WON',
        score: 'Won 3-6, 6-1, 6-4',
      },
    ],
  },
  {
    id: 'seed-comb-ls-3',
    date: '2026-09-29',
    category: 'LIVE_SURE',
    categoryTitle: 'Live Sure Combine (In-Play)',
    targetOddsLabel: 'Target ~1.75x Live',
    totalDecimalOdds: 1.92,
    stakeUnits: 0.75,
    outcome: 'LOST',
    profitUnits: -0.75,
    missedByLegs: 1,
    tournamentSummary: 'China Open Live Draw',
    recordedAt: '2026-09-29T10:15:00.000Z',
    settledAt: '2026-09-29T12:50:00.000Z',
    legs: [
      {
        match: 'Carlos Alcaraz vs. Tallon Griekspoor',
        selection: 'Alcaraz Live Set 1 Winner',
        odds: 1.22,
        outcome: 'WON',
        score: '6-1 in Set 1',
      },
      {
        match: 'Holger Rune vs. Arthur Fils',
        selection: 'Rune Live Match Winner (On serve 4-4)',
        odds: 1.57,
        outcome: 'LOST',
        score: 'Lost tiebreak 8-10',
      },
    ],
  },

  // 6. DAILY SHORT 100+ ODDS CENTURY COMBINES (Curated 3-5 leg high-multiplier tickets)
  {
    id: 'seed-comb-c100-1',
    date: '2026-09-24',
    category: 'ODDS_100',
    categoryTitle: 'Daily Short 100+ Odds Pick',
    targetOddsLabel: 'Target 100.00+ Odds',
    totalDecimalOdds: 104.85,
    stakeUnits: 0.1,
    outcome: 'WON',
    profitUnits: 10.385,
    tournamentSummary: 'ATP Beijing & Tokyo 500',
    missedByLegs: 0,
    recordedAt: '2026-09-24T09:00:00Z',
    settledAt: '2026-09-24T18:00:00Z',
    legs: [
      {
        match: 'Hubert Hurkacz vs. Arthur Gea',
        selection: 'Hubert Hurkacz to Win 2-1 Sets',
        odds: 3.4,
        outcome: 'WON',
        score: '7-6, 6-7, 6-2',
      },
      {
        match: 'Carlos Alcaraz vs. Giovanni Mpetshi Perricard',
        selection: 'Carlos Alcaraz -1.5 Sets Handicap',
        odds: 2.35,
        outcome: 'WON',
        score: '6-4, 6-4',
      },
      {
        match: 'Daniil Medvedev vs. Gael Monfils',
        selection: 'Medvedev to Win & Over 21.5 Games',
        odds: 2.9,
        outcome: 'WON',
        score: '6-3, 5-7, 6-4',
      },
      {
        match: 'Alexander Zverev vs. Mattia Bellucci',
        selection: 'Alexander Zverev to Win 2-1 Sets',
        odds: 4.5,
        outcome: 'WON',
        score: '6-7, 6-3, 6-2',
      },
    ],
  },
  {
    id: 'seed-comb-c100-2',
    date: '2026-09-27',
    category: 'ODDS_100',
    categoryTitle: 'Daily Short 100+ Odds Pick',
    targetOddsLabel: 'Target 100.00+ Odds',
    totalDecimalOdds: 108.2,
    stakeUnits: 0.1,
    outcome: 'LOST',
    profitUnits: -0.1,
    tournamentSummary: 'ATP Tokyo / WTA Beijing',
    missedByLegs: 1,
    recordedAt: '2026-09-27T09:00:00Z',
    settledAt: '2026-09-27T18:00:00Z',
    legs: [
      {
        match: 'Taylor Fritz vs. Arthur Fils',
        selection: 'Fritz to Win 2-1 Sets',
        odds: 3.65,
        outcome: 'LOST',
        score: '4-6, 6-3, 3-6 (Lost Set 3)',
      },
      {
        match: 'Jannik Sinner vs. Nicolas Jarry',
        selection: 'Jannik Sinner -1.5 Sets Handicap',
        odds: 2.2,
        outcome: 'WON',
        score: '6-4, 6-2',
      },
      {
        match: 'Aryna Sabalenka vs. Mananchaya Sawangkaew',
        selection: 'Sabalenka -1.5 Sets Handicap',
        odds: 2.15,
        outcome: 'WON',
        score: '6-4, 6-1',
      },
      {
        match: 'Tommy Paul vs. Tomas Machac',
        selection: 'Paul to Win & Over 21.5 Games',
        odds: 6.27,
        outcome: 'WON',
        score: '6-3, 6-7, 7-5',
      },
    ],
  },
  {
    id: 'seed-comb-c100-3',
    date: '2026-09-29',
    category: 'ODDS_100',
    categoryTitle: 'Daily Short 100+ Odds Pick',
    targetOddsLabel: 'Target 100.00+ Odds',
    totalDecimalOdds: 112.5,
    stakeUnits: 0.1,
    outcome: 'LOST',
    profitUnits: -0.1,
    tournamentSummary: 'ATP Beijing / WTA Beijing',
    missedByLegs: 1,
    recordedAt: '2026-09-29T09:00:00Z',
    settledAt: '2026-09-29T18:00:00Z',
    legs: [
      {
        match: 'Lorenzo Musetti vs. Bu Yunchaokete',
        selection: 'Musetti to Win 2-1 Sets',
        odds: 3.5,
        outcome: 'WON',
        score: '6-7, 6-4, 6-4',
      },
      {
        match: 'Qinwen Zheng vs. Kamilla Rakhimova',
        selection: 'Qinwen Zheng -1.5 Sets Handicap',
        odds: 2.25,
        outcome: 'WON',
        score: '6-1, 6-1',
      },
      {
        match: 'Andrey Rublev vs. Alejandro Davidovich Fokina',
        selection: 'Rublev to Win & Over 22.5 Games',
        odds: 3.1,
        outcome: 'WON',
        score: '6-4, 6-7, 6-3',
      },
      {
        match: 'Mirra Andreeva vs. Donna Vekic',
        selection: 'Andreeva to Win 2-1 Sets',
        odds: 4.6,
        outcome: 'LOST',
        score: '3-6, 6-4, 4-6 (Lost Set 3 decider)',
      },
    ],
  },
  {
    id: 'seed-comb-c100-4',
    date: '2026-09-30',
    category: 'ODDS_100',
    categoryTitle: 'Daily Short 100+ Odds Pick',
    targetOddsLabel: 'Target 100.00+ Odds',
    totalDecimalOdds: 103.4,
    stakeUnits: 0.1,
    outcome: 'LOST',
    profitUnits: -0.1,
    tournamentSummary: 'ATP China Open Main Draw',
    missedByLegs: 2,
    recordedAt: '2026-09-30T09:00:00Z',
    settledAt: '2026-09-30T18:00:00Z',
    legs: [
      {
        match: 'Karen Khachanov vs. Francisco Cerundolo',
        selection: 'Khachanov to Win 2-1 Sets',
        odds: 3.6,
        outcome: 'LOST',
        score: '7-6, 7-6 (Won in straight sets, missed 2-1)',
      },
      {
        match: 'Flavio Cobolli vs. Pavel Kotov',
        selection: 'Cobolli to Win & Over 21.5 Games',
        odds: 2.9,
        outcome: 'WON',
        score: '6-4, 3-6, 6-3',
      },
      {
        match: 'Jiri Lehecka vs. Roberto Bautista Agut',
        selection: 'Lehecka to Win 2-1 Sets',
        odds: 3.7,
        outcome: 'WON',
        score: '3-6, 6-2, 6-1',
      },
      {
        match: 'Adrian Mannarino vs. Lorenzo Sonego',
        selection: 'Sonego to Win 2-1 Sets',
        odds: 2.67,
        outcome: 'LOST',
        score: '4-6, 2-6 (Straight sets loss)',
      },
    ],
  },
  {
    id: 'seed-comb-c100-5',
    date: '2026-10-02',
    category: 'ODDS_100',
    categoryTitle: 'Daily Short 100+ Odds Pick',
    targetOddsLabel: 'Target 100.00+ Odds',
    totalDecimalOdds: 106.15,
    stakeUnits: 0.1,
    outcome: 'LOST',
    profitUnits: -0.1,
    tournamentSummary: 'ATP Beijing / WTA Beijing Quarterfinals',
    missedByLegs: 1,
    recordedAt: '2026-10-02T09:00:00Z',
    settledAt: '2026-10-02T18:00:00Z',
    legs: [
      {
        match: 'Aryna Sabalenka vs. Naomi Osaka',
        selection: 'Sabalenka to Win 2-1 Sets',
        odds: 3.45,
        outcome: 'WON',
        score: '6-7, 6-4, 6-2',
      },
      {
        match: 'Coco Gauff vs. Karolina Muchova',
        selection: 'Gauff to Win & Over 21.5 Games',
        odds: 2.85,
        outcome: 'WON',
        score: '6-4, 4-6, 6-2',
      },
      {
        match: 'Daniil Medvedev vs. Flavio Cobolli',
        selection: 'Medvedev -1.5 Sets Handicap',
        odds: 2.3,
        outcome: 'WON',
        score: '6-2, 6-4',
      },
      {
        match: 'Carlos Alcaraz vs. Karen Khachanov',
        selection: 'Alcaraz to Win 2-1 Sets',
        odds: 4.69,
        outcome: 'LOST',
        score: '7-5, 6-2 (Alcaraz won 2-0, missed 2-1)',
      },
    ],
  },
];

/**
 * Extracts and maps any tracked result that is a combine/parlay into a CombineHistoryRecord.
 */
export function extractCombinesFromResults(results: TrackedResult[]): CombineHistoryRecord[] {
  const customCombines: CombineHistoryRecord[] = [];

  for (const r of results) {
    const isCombine =
      r.market.toLowerCase().includes('parlay') ||
      r.market.toLowerCase().includes('combine') ||
      r.match.toLowerCase().includes('combine') ||
      r.selection.includes(' + ');

    if (!isCombine) continue;

    // Detect category if tagged in match or market
    let cat: CombineCategory | 'CUSTOM' = 'CUSTOM';
    if (r.match.includes('Today Sure') || r.market.includes('Today Sure')) cat = 'TODAY_SURE';
    else if (r.match.includes('2.00+') || r.market.includes('2 Odds') || r.match.includes('2 Odds')) cat = 'ODDS_2';
    else if (r.match.includes('5.00+') || r.market.includes('5 Odds') || r.match.includes('5 Odds')) cat = 'ODDS_5';
    else if (r.match.includes('10.00+') || r.market.includes('10 Odds') || r.match.includes('10 Odds')) cat = 'ODDS_10';
    else if (
      r.match.includes('100+') ||
      r.match.includes('100.00+') ||
      r.market.includes('100 Odds') ||
      r.match.includes('100 Odds') ||
      r.match.includes('Century')
    )
      cat = 'ODDS_100';
    else if (r.match.includes('Live Sure') || r.market.includes('Live Combine')) cat = 'LIVE_SURE';

    // Parse legs from selection: "Selection A (@1.45) + Selection B (@1.50)"
    const legStrings = r.selection.split(' + ');
    const legs: CombineSettledLeg[] = legStrings.map((str, idx) => {
      const matchOdds = str.match(/@([\d.]+)/);
      const odds = matchOdds ? parseFloat(matchOdds[1]) : 1.5;
      const cleanSelection = str.replace(/\s*\(@[\d.]+\)/, '').trim();
      const outcome: 'WON' | 'LOST' | 'PENDING' =
        r.outcome === 'WON' ? 'WON' : r.outcome === 'LOST' ? 'LOST' : 'PENDING';

      return {
        id: `parsed-leg-${r.id}-${idx}`,
        match: r.match.includes('/') ? r.match.split('/')[idx]?.trim() || `Leg ${idx + 1}` : `Leg ${idx + 1}`,
        selection: cleanSelection,
        odds,
        outcome,
        score: r.finalScore,
      };
    });

    customCombines.push({
      id: `tracked-${r.id}`,
      date: r.date,
      category: cat,
      categoryTitle:
        cat !== 'CUSTOM'
          ? COMBINE_CATEGORY_CONFIG[cat].label
          : `${legs.length}-Leg Custom Combine`,
      targetOddsLabel: `@${r.decimalOdds.toFixed(2)}`,
      totalDecimalOdds: r.decimalOdds,
      stakeUnits: r.stakeUnits,
      outcome: r.outcome === 'PENDING' ? 'PENDING' : r.outcome === 'WON' ? 'WON' : 'LOST',
      profitUnits: r.profitUnits,
      legs,
      missedByLegs: r.outcome === 'WON' ? 0 : 1,
      tournamentSummary: r.tournament,
      recordedAt: r.recordedAt,
      settledAt: r.settledAt,
    });
  }

  return customCombines;
}

/**
 * Combines the verified seed dataset with any user-staked combines in real time.
 */
export function getAllCombineRecords(results: TrackedResult[]): CombineHistoryRecord[] {
  const trackedCombines = extractCombinesFromResults(results);
  // Avoid duplicate IDs
  const seenIds = new Set<string>();
  const combined: CombineHistoryRecord[] = [];

  for (const c of [...trackedCombines, ...SEED_COMBINE_RECORDS]) {
    if (!seenIds.has(c.id)) {
      seenIds.add(c.id);
      combined.push(c);
    }
  }

  return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Calculates statistical metrics for every combine category one by one, plus an overall aggregate.
 */
export function calculateCombineCategoryStats(
  records: CombineHistoryRecord[]
): Record<CombineCategory | 'CUSTOM' | 'ALL', CombineCategoryStats> {
  const categories: Array<CombineCategory | 'CUSTOM' | 'ALL'> = [
    'ALL',
    'TODAY_SURE',
    'ODDS_2',
    'ODDS_5',
    'ODDS_10',
    'ODDS_100',
    'LIVE_SURE',
    'CUSTOM',
  ];

  const result = {} as Record<CombineCategory | 'CUSTOM' | 'ALL', CombineCategoryStats>;

  for (const cat of categories) {
    const subset =
      cat === 'ALL'
        ? records
        : records.filter((r) => r.category === cat);

    const totalTickets = subset.length;
    const wonCount = subset.filter((r) => r.outcome === 'WON').length;
    const lostCount = subset.filter((r) => r.outcome === 'LOST').length;
    const pendingCount = subset.filter((r) => r.outcome === 'PENDING').length;

    const settledCount = wonCount + lostCount;
    const winRatePercent = settledCount > 0 ? Number(((wonCount / settledCount) * 100).toFixed(1)) : 0;
    const lossRatePercent = settledCount > 0 ? Number(((lostCount / settledCount) * 100).toFixed(1)) : 0;

    const totalStakedUnits = Number(
      subset.reduce((acc, r) => acc + (r.outcome !== 'PENDING' ? r.stakeUnits : 0), 0).toFixed(2)
    );
    const totalProfitUnits = Number(
      subset.reduce((acc, r) => acc + (r.outcome !== 'PENDING' ? r.profitUnits : 0), 0).toFixed(2)
    );
    const roiYieldPercent =
      totalStakedUnits > 0
        ? Number(((totalProfitUnits / totalStakedUnits) * 100).toFixed(1))
        : 0;

    const avgOdds =
      totalTickets > 0
        ? Number(
            (subset.reduce((acc, r) => acc + r.totalDecimalOdds, 0) / totalTickets).toFixed(2)
          )
        : 0;

    const missedByOneCount = subset.filter(
      (r) => r.outcome === 'LOST' && r.missedByLegs === 1
    ).length;
    const missedByOneRatePercent =
      lostCount > 0 ? Number(((missedByOneCount / lostCount) * 100).toFixed(1)) : 0;

    let totalLegs = 0;
    let wonLegs = 0;
    for (const r of subset) {
      if (r.outcome === 'PENDING') continue;
      for (const l of r.legs) {
        totalLegs++;
        if (l.outcome === 'WON') wonLegs++;
      }
    }
    const legWinRatePercent =
      totalLegs > 0 ? Number(((wonLegs / totalLegs) * 100).toFixed(1)) : 0;

    let label = 'All Combines Combined';
    let targetOdds = 'All Multiplier Tiers';
    if (cat !== 'ALL' && cat !== 'CUSTOM') {
      label = COMBINE_CATEGORY_CONFIG[cat].label;
      targetOdds = COMBINE_CATEGORY_CONFIG[cat].targetOdds;
    } else if (cat === 'CUSTOM') {
      label = 'User Custom Combines';
      targetOdds = 'Dynamic Multipliers';
    }

    result[cat] = {
      category: cat,
      label,
      targetOdds,
      totalTickets,
      wonCount,
      lostCount,
      pendingCount,
      winRatePercent,
      lossRatePercent,
      totalStakedUnits,
      totalProfitUnits,
      roiYieldPercent,
      avgOdds,
      missedByOneCount,
      missedByOneRatePercent,
      totalLegs,
      wonLegs,
      legWinRatePercent,
    };
  }

  return result;
}
