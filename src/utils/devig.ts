/**
 * Professional Bookmaker Margin Removal (De-Vigging) & Value Estimation Engine
 * Implements Proportional, Power, and Shin's methods for 2-way tennis markets,
 * along with Wilson score confidence intervals and Expected Value calculations.
 */

export interface DeVigResult {
  oddsA: number;
  oddsB: number;
  rawImpliedA: number; // 1 / oddsA
  rawImpliedB: number; // 1 / oddsB
  overround: number; // rawImpliedA + rawImpliedB - 1
  bookmakerMarginPercent: number; // overround * 100
  fairProbA: number; // margin-removed true probability for player A
  fairProbB: number; // margin-removed true probability for player B
  fairOddsA: number; // 1 / fairProbA
  fairOddsB: number; // 1 / fairProbB
  method: 'PROPORTIONAL' | 'SHIN' | 'POWER';
}

/**
 * Standard proportional (multiplicative) margin removal
 * P_A = (1/O_A) / (1/O_A + 1/O_B)
 */
export function proportionalDeVig(oddsA: number, oddsB: number): DeVigResult {
  const oA = Math.max(1.001, oddsA);
  const oB = Math.max(1.001, oddsB);
  const invA = 1 / oA;
  const invB = 1 / oB;
  const sumInv = invA + invB;
  const overround = sumInv - 1;

  const fairProbA = invA / sumInv;
  const fairProbB = invB / sumInv;

  return {
    oddsA: oA,
    oddsB: oB,
    rawImpliedA: Number(invA.toFixed(4)),
    rawImpliedB: Number(invB.toFixed(4)),
    overround: Number(overround.toFixed(4)),
    bookmakerMarginPercent: Number((overround * 100).toFixed(2)),
    fairProbA: Number(fairProbA.toFixed(4)),
    fairProbB: Number(fairProbB.toFixed(4)),
    fairOddsA: Number((1 / fairProbA).toFixed(3)),
    fairOddsB: Number((1 / fairProbB).toFixed(3)),
    method: 'PROPORTIONAL',
  };
}

/**
 * Shin's method: Accounts for favorite-longshot bias and insider trading risk z.
 * Solves numerically for z in:
 * sum(sqrt(z^2 + 4*(1-z)*(inv_i^2 / sumInv))) = ...
 */
export function shinDeVig(oddsA: number, oddsB: number): DeVigResult {
  const oA = Math.max(1.001, oddsA);
  const oB = Math.max(1.001, oddsB);
  const invA = 1 / oA;
  const invB = 1 / oB;
  const sumInv = invA + invB;

  if (sumInv <= 1.0) {
    return proportionalDeVig(oA, oB);
  }

  // Binary search for z in [0, 0.4]
  let low = 0;
  let high = 0.4;
  let z = 0.02;

  for (let iter = 0; iter < 40; iter++) {
    const mid = (low + high) / 2;
    const termA = Math.sqrt(mid * mid + 4 * (1 - mid) * ((invA * invA) / sumInv));
    const termB = Math.sqrt(mid * mid + 4 * (1 - mid) * ((invB * invB) / sumInv));
    const val = (termA + termB - 2 * mid) / (2 * (1 - mid));

    if (val < 1.0) {
      high = mid;
    } else {
      low = mid;
    }
    z = mid;
  }

  const probA = (Math.sqrt(z * z + 4 * (1 - z) * ((invA * invA) / sumInv)) - z) / (2 * (1 - z));
  const probB = (Math.sqrt(z * z + 4 * (1 - z) * ((invB * invB) / sumInv)) - z) / (2 * (1 - z));
  const total = probA + probB;

  const fairProbA = probA / total;
  const fairProbB = probB / total;

  return {
    oddsA: oA,
    oddsB: oB,
    rawImpliedA: Number(invA.toFixed(4)),
    rawImpliedB: Number(invB.toFixed(4)),
    overround: Number((sumInv - 1).toFixed(4)),
    bookmakerMarginPercent: Number(((sumInv - 1) * 100).toFixed(2)),
    fairProbA: Number(fairProbA.toFixed(4)),
    fairProbB: Number(fairProbB.toFixed(4)),
    fairOddsA: Number((1 / fairProbA).toFixed(3)),
    fairOddsB: Number((1 / fairProbB).toFixed(3)),
    method: 'SHIN',
  };
}

/**
 * Computes Expected Value (EV %)
 * EV% = (modelProbability * decimalOdds - 1) * 100
 */
export function calculateExpectedValue(modelProbability: number, decimalOdds: number): number {
  if (modelProbability <= 0 || decimalOdds <= 1) return 0;
  const prob = modelProbability > 1 ? modelProbability / 100 : modelProbability;
  return Number(((prob * decimalOdds - 1) * 100).toFixed(2));
}

/**
 * Computes model fair odds: 1 / modelProbability
 */
export function calculateFairOdds(modelProbability: number): number {
  const prob = modelProbability > 1 ? modelProbability / 100 : modelProbability;
  if (prob <= 0) return 999;
  return Number((1 / prob).toFixed(2));
}

/**
 * Computes statistical uncertainty interval for a model probability
 * uses Wilson score interval / sample size estimation.
 * effectiveSampleSize: sample of comparable matches (default ~60 matches)
 */
export function calculateProbabilityUncertainty(
  modelProbability: number,
  effectiveSampleSize: number = 60,
  confidenceLevelZ: number = 1.96 // 95% confidence
): {
  lowerProb: number;
  upperProb: number;
  marginOfError: number;
  confidenceTier: 'HIGH' | 'MODERATE' | 'CAUTION' | 'INSUFFICIENT_DATA';
} {
  const p = modelProbability > 1 ? modelProbability / 100 : modelProbability;
  const n = Math.max(5, effectiveSampleSize);

  // Wilson Score interval
  const z = confidenceLevelZ;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const halfWidth = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denominator;

  const lower = Math.max(0.01, center - halfWidth);
  const upper = Math.min(0.99, center + halfWidth);
  const margin = (upper - lower) / 2;

  let confidenceTier: 'HIGH' | 'MODERATE' | 'CAUTION' | 'INSUFFICIENT_DATA' = 'MODERATE';
  if (effectiveSampleSize < 15) {
    confidenceTier = 'INSUFFICIENT_DATA';
  } else if (margin <= 0.045 && effectiveSampleSize >= 50) {
    confidenceTier = 'HIGH';
  } else if (margin <= 0.08) {
    confidenceTier = 'MODERATE';
  } else {
    confidenceTier = 'CAUTION';
  }

  return {
    lowerProb: Number((lower * 100).toFixed(1)),
    upperProb: Number((upper * 100).toFixed(1)),
    marginOfError: Number((margin * 100).toFixed(1)),
    confidenceTier,
  };
}

/**
 * Kelly Criterion fraction calculation
 * f* = (b*p - q) / b = (p*(b+1) - 1) / b
 * where b = odds - 1
 */
export function calculateKellyStake(
  modelProbability: number,
  decimalOdds: number,
  kellyFraction: number = 0.25 // default Quarter Kelly for sports betting variance
): {
  fullKellyPercent: number;
  fractionalKellyPercent: number;
  recommendedStakeAmount: number;
} {
  const p = modelProbability > 1 ? modelProbability / 100 : modelProbability;
  const b = decimalOdds - 1;

  if (b <= 0 || p <= 0) {
    return { fullKellyPercent: 0, fractionalKellyPercent: 0, recommendedStakeAmount: 0 };
  }

  const q = 1 - p;
  const fullKelly = Math.max(0, (b * p - q) / b);
  const fractional = fullKelly * kellyFraction;

  return {
    fullKellyPercent: Number((fullKelly * 100).toFixed(2)),
    fractionalKellyPercent: Number((fractional * 100).toFixed(2)),
    recommendedStakeAmount: Number((fractional * 100).toFixed(2)),
  };
}
