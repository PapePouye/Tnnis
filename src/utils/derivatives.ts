export interface DerivativeMarketsProjection {
  fairDecimalOdds: number;
  minPlayableOdds2PctEv: number;
  strongBuyOdds5PctEv: number;
  singleSetWinProb: number;
  probWin2_0: number;
  fairOdds2_0: number;
  probWin2_1: number;
  fairOdds2_1: number;
  probLose0_2: number;
  fairOdds0_2: number;
  probLose1_2: number;
  fairOdds1_2: number;
  probOver2_5Sets: number;
  fairOddsOver2_5Sets: number;
  probUnder2_5Sets: number;
  fairOddsUnder2_5Sets: number;
  projectedGameHandicap: number;
  projectedTotalGames: number;
}

/**
 * Given a Bo3 match win probability P_match (e.g. 0.58), solves P_match = p^2 * (3 - 2p)
 * for single-set win probability p using Newton-Raphson, then computes exact Bo3 set
 * score probabilities, fair odds, and game spread projections.
 */
export function computeDerivativeMarkets(
  estimatedWinProbPercent: number
): DerivativeMarketsProjection {
  const pMatch = Math.max(0.05, Math.min(0.95, (estimatedWinProbPercent || 50) / 100));

  // Solve p^2 * (3 - 2p) = pMatch for p in (0, 1)
  let p = pMatch;
  for (let i = 0; i < 12; i++) {
    const f = p * p * (3 - 2 * p) - pMatch;
    const df = 6 * p * (1 - p);
    if (Math.abs(df) < 1e-6) break;
    p = Math.max(0.02, Math.min(0.98, p - f / df));
  }

  const q = 1 - p;
  const p20 = p * p;
  const p21 = 2 * p * p * q;
  const p02 = q * q;
  const p12 = 2 * q * q * p;

  const pThreeSets = p21 + p12;
  const pTwoSets = p20 + p02;

  const fairDecimalOdds = Number((1 / pMatch).toFixed(2));
  const minPlayableOdds2PctEv = Number((1.02 / pMatch).toFixed(2));
  const strongBuyOdds5PctEv = Number((1.05 / pMatch).toFixed(2));

  // Expected game differential in Bo3
  const expectedGameSpread = Number(((p - 0.5) * 11.2).toFixed(1));
  const expectedTotalGames = Number((20.2 + pThreeSets * 5.8).toFixed(1));

  return {
    fairDecimalOdds,
    minPlayableOdds2PctEv,
    strongBuyOdds5PctEv,
    singleSetWinProb: Number((p * 100).toFixed(1)),
    probWin2_0: Number((p20 * 100).toFixed(1)),
    fairOdds2_0: Number((1 / Math.max(0.02, p20)).toFixed(2)),
    probWin2_1: Number((p21 * 100).toFixed(1)),
    fairOdds2_1: Number((1 / Math.max(0.02, p21)).toFixed(2)),
    probLose0_2: Number((p02 * 100).toFixed(1)),
    fairOdds0_2: Number((1 / Math.max(0.02, p02)).toFixed(2)),
    probLose1_2: Number((p12 * 100).toFixed(1)),
    fairOdds1_2: Number((1 / Math.max(0.02, p12)).toFixed(2)),
    probOver2_5Sets: Number((pThreeSets * 100).toFixed(1)),
    fairOddsOver2_5Sets: Number((1 / Math.max(0.02, pThreeSets)).toFixed(2)),
    probUnder2_5Sets: Number((pTwoSets * 100).toFixed(1)),
    fairOddsUnder2_5Sets: Number((1 / Math.max(0.02, pTwoSets)).toFixed(2)),
    projectedGameHandicap: -expectedGameSpread,
    projectedTotalGames: expectedTotalGames,
  };
}
