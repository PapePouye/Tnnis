import type { BankrollSimulatorConfig, TrackedResult } from '../types';

export interface SimulatedResultMetrics {
  resultId: string;
  stepNumber: number | null;
  match: string;
  selection: string;
  date: string;
  decimalOdds: number;
  outcome: TrackedResult['outcome'];
  stakeCurrency: number;
  profitCurrency: number;
  potentialProfitCurrency: number;
  bankrollBefore: number;
  bankrollAfter: number;
}

export interface BankrollSimulationSummary {
  startingBankroll: number;
  currentBankroll: number;
  netProfitCurrency: number;
  totalGrowthPercent: number;
  totalStakedCurrency: number;
  roiPercent: number;
  peakBankroll: number;
  maxDrawdownPercent: number;
  pendingExposureCurrency: number;
  potentialBankrollIfPendingWin: number;
  steps: SimulatedResultMetrics[];
  byResultId: Map<string, SimulatedResultMetrics>;
}

/**
 * Calculates the recommended currency stake for a pick given the user's bankroll settings.
 */
export function computeStakeForPick(
  referenceBankroll: number,
  startingBankroll: number,
  config: BankrollSimulatorConfig,
  decimalOdds: number,
  estimatedProbability: number,
  stakeUnits = 1.0
): number {
  const safeStart = Math.max(1, startingBankroll);
  const safeCurrent = Math.max(0, referenceBankroll);
  const unitPct = Math.max(0.5, Math.min(25, config.unitPercent));

  if (config.strategy === 'FLAT_PERCENT') {
    const baseUnit = safeStart * (unitPct / 100);
    return Number(Math.min(safeCurrent, Math.max(0, baseUnit * stakeUnits)).toFixed(2));
  }

  if (config.strategy === 'COMPOUND_PERCENT') {
    const dynamicUnit = safeCurrent * (unitPct / 100);
    return Number(Math.min(safeCurrent, Math.max(0, dynamicUnit * stakeUnits)).toFixed(2));
  }

  // QUARTER_KELLY: f* = 0.25 * ((b * p - q) / b)
  const b = Math.max(0.05, decimalOdds - 1);
  const p = Math.max(0.01, Math.min(0.99, estimatedProbability / 100));
  const q = 1 - p;
  const fullKelly = (b * p - q) / b;

  if (fullKelly <= 0) {
    // Fallback to half of standard unit percent if pick has no positive Kelly fraction
    const fallback = safeCurrent * ((unitPct * 0.5) / 100);
    return Number(Math.min(safeCurrent, Math.max(0, fallback * stakeUnits)).toFixed(2));
  }

  const quarterKellyPct = Math.min(0.12, Math.max(0.01, fullKelly * 0.25));
  const kellyStake = safeCurrent * quarterKellyPct * stakeUnits;
  return Number(Math.min(safeCurrent, Math.max(0, kellyStake)).toFixed(2));
}

/**
 * Simulates growing a starting bankroll (e.g., 100€) chronologically across tracked results.
 */
export function simulateBankrollGrowth(
  results: TrackedResult[],
  config: BankrollSimulatorConfig
): BankrollSimulationSummary {
  const startingBankroll = Math.max(1, Number(config.startingBankroll) || 100);

  // Separate settled vs pending, and order settled oldest-to-newest for chronological compounding
  const settledChronological = [...results]
    .filter((r) => r.outcome === 'WON' || r.outcome === 'LOST' || r.outcome === 'PUSH')
    .sort((a, b) => {
      const tA = new Date(a.settledAt || a.recordedAt || a.date).getTime();
      const tB = new Date(b.settledAt || b.recordedAt || b.date).getTime();
      return tA - tB;
    });

  const pendingList = results.filter((r) => r.outcome === 'PENDING');

  let runningBankroll = startingBankroll;
  let peakBankroll = startingBankroll;
  let maxDrawdownPercent = 0;
  let totalStakedCurrency = 0;

  const steps: SimulatedResultMetrics[] = [];
  const byResultId = new Map<string, SimulatedResultMetrics>();

  settledChronological.forEach((item, idx) => {
    const bankrollBefore = runningBankroll;
    const stakeCurrency = computeStakeForPick(
      runningBankroll,
      startingBankroll,
      config,
      item.decimalOdds,
      item.estimatedProbability,
      item.stakeUnits
    );

    totalStakedCurrency += stakeCurrency;

    let profitCurrency = 0;
    if (item.outcome === 'WON') {
      profitCurrency = Number((stakeCurrency * (item.decimalOdds - 1)).toFixed(2));
    } else if (item.outcome === 'LOST') {
      profitCurrency = Number((-stakeCurrency).toFixed(2));
    }

    const bankrollAfter = Number(Math.max(0, bankrollBefore + profitCurrency).toFixed(2));
    runningBankroll = bankrollAfter;

    if (runningBankroll > peakBankroll) {
      peakBankroll = runningBankroll;
    }
    if (peakBankroll > 0) {
      const dd = ((peakBankroll - runningBankroll) / peakBankroll) * 100;
      if (dd > maxDrawdownPercent) {
        maxDrawdownPercent = dd;
      }
    }

    const metric: SimulatedResultMetrics = {
      resultId: item.id,
      stepNumber: idx + 1,
      match: item.match,
      selection: item.selection,
      date: item.date,
      decimalOdds: item.decimalOdds,
      outcome: item.outcome,
      stakeCurrency,
      profitCurrency,
      potentialProfitCurrency: Number((stakeCurrency * (item.decimalOdds - 1)).toFixed(2)),
      bankrollBefore,
      bankrollAfter,
    };

    steps.push(metric);
    byResultId.set(item.id, metric);
  });

  // Compute metrics for pending picks using the current running bankroll
  let pendingExposureCurrency = 0;
  let potentialPendingProfit = 0;

  pendingList.forEach((item) => {
    const stakeCurrency = computeStakeForPick(
      runningBankroll,
      startingBankroll,
      config,
      item.decimalOdds,
      item.estimatedProbability,
      item.stakeUnits
    );
    const potentialProfitCurrency = Number(
      (stakeCurrency * (item.decimalOdds - 1)).toFixed(2)
    );
    pendingExposureCurrency += stakeCurrency;
    potentialPendingProfit += potentialProfitCurrency;

    byResultId.set(item.id, {
      resultId: item.id,
      stepNumber: null,
      match: item.match,
      selection: item.selection,
      date: item.date,
      decimalOdds: item.decimalOdds,
      outcome: 'PENDING',
      stakeCurrency,
      profitCurrency: 0,
      potentialProfitCurrency,
      bankrollBefore: runningBankroll,
      bankrollAfter: Number((runningBankroll + potentialProfitCurrency).toFixed(2)),
    });
  });

  const netProfitCurrency = Number((runningBankroll - startingBankroll).toFixed(2));
  const totalGrowthPercent = Number(((netProfitCurrency / startingBankroll) * 100).toFixed(2));
  const roiPercent =
    totalStakedCurrency > 0
      ? Number(((netProfitCurrency / totalStakedCurrency) * 100).toFixed(2))
      : 0;

  return {
    startingBankroll,
    currentBankroll: runningBankroll,
    netProfitCurrency,
    totalGrowthPercent,
    totalStakedCurrency: Number(totalStakedCurrency.toFixed(2)),
    roiPercent,
    peakBankroll: Number(peakBankroll.toFixed(2)),
    maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(2)),
    pendingExposureCurrency: Number(pendingExposureCurrency.toFixed(2)),
    potentialBankrollIfPendingWin: Number(
      (runningBankroll + potentialPendingProfit).toFixed(2)
    ),
    steps,
    byResultId,
  };
}

export interface CategoryWinLossSplit {
  label: string;
  wins: number;
  losses: number;
  total: number;
  winRatePercent: number;
  lossRatePercent: number;
}

export interface PickAccuracyEvaluation {
  wins: number;
  losses: number;
  pushes: number;
  pending: number;
  totalDecided: number;
  winningRatePercent: number;
  losingRatePercent: number;
  expectedWinRatePercent: number;
  calibrationDeltaPercent: number;
  averageOdds: number;
  averageWinningOdds: number;
  breakEvenWinRatePercent: number;
  edgeOverBreakEvenPercent: number;
  brierScore: number;
  gradeLabel: string;
  currentStreakText: string;
  lastTenSequence: Array<{ id: string; outcome: 'WON' | 'LOST'; selection: string; odds: number }>;
  splits: {
    preMatch: CategoryWinLossSplit;
    inPlay: CategoryWinLossSplit;
    shortOdds: CategoryWinLossSplit;
    valueOdds: CategoryWinLossSplit;
  };
}

function buildSplit(label: string, items: TrackedResult[]): CategoryWinLossSplit {
  const wins = items.filter((r) => r.outcome === 'WON').length;
  const losses = items.filter((r) => r.outcome === 'LOST').length;
  const total = wins + losses;
  const winRatePercent = total > 0 ? Number(((wins / total) * 100).toFixed(1)) : 0;
  const lossRatePercent = total > 0 ? Number(((losses / total) * 100).toFixed(1)) : 0;
  return {
    label,
    wins,
    losses,
    total,
    winRatePercent,
    lossRatePercent,
  };
}

/**
 * Evaluates the app's Winning % vs. Losing % rate, model calibration, break-even margin,
 * and category splits across all settled picks.
 */
export function evaluatePickAccuracy(results: TrackedResult[]): PickAccuracyEvaluation {
  const decided = [...results]
    .filter((r) => r.outcome === 'WON' || r.outcome === 'LOST')
    .sort((a, b) => {
      const tA = new Date(a.settledAt || a.recordedAt || a.date).getTime();
      const tB = new Date(b.settledAt || b.recordedAt || b.date).getTime();
      return tA - tB;
    });

  const wins = decided.filter((r) => r.outcome === 'WON').length;
  const losses = decided.filter((r) => r.outcome === 'LOST').length;
  const pushes = results.filter((r) => r.outcome === 'PUSH').length;
  const pending = results.filter((r) => r.outcome === 'PENDING').length;
  const totalDecided = wins + losses;

  const winningRatePercent =
    totalDecided > 0 ? Number(((wins / totalDecided) * 100).toFixed(1)) : 0;
  const losingRatePercent =
    totalDecided > 0 ? Number(((losses / totalDecided) * 100).toFixed(1)) : 0;

  const expectedWinRatePercent =
    totalDecided > 0
      ? Number(
          (
            decided.reduce((acc, r) => acc + (r.estimatedProbability || 50), 0) /
            totalDecided
          ).toFixed(1)
        )
      : 0;

  const calibrationDeltaPercent = Number(
    (winningRatePercent - expectedWinRatePercent).toFixed(1)
  );

  const averageOdds =
    totalDecided > 0
      ? Number(
          (decided.reduce((acc, r) => acc + r.decimalOdds, 0) / totalDecided).toFixed(2)
        )
      : 1.85;

  const wonItems = decided.filter((r) => r.outcome === 'WON');
  const averageWinningOdds =
    wonItems.length > 0
      ? Number(
          (wonItems.reduce((acc, r) => acc + r.decimalOdds, 0) / wonItems.length).toFixed(
            2
          )
        )
      : averageOdds;

  const breakEvenWinRatePercent =
    averageOdds > 1 ? Number(((1 / averageOdds) * 100).toFixed(1)) : 54.0;
  const edgeOverBreakEvenPercent = Number(
    (winningRatePercent - breakEvenWinRatePercent).toFixed(1)
  );

  const brierScore =
    totalDecided > 0
      ? Number(
          (
            decided.reduce((acc, r) => {
              const p = Math.max(0.01, Math.min(0.99, (r.estimatedProbability || 50) / 100));
              const y = r.outcome === 'WON' ? 1 : 0;
              return acc + Math.pow(p - y, 2);
            }, 0) / totalDecided
          ).toFixed(3)
        )
      : 0;

  // Compute current streak from newest decided picks
  let streakCount = 0;
  let streakType: 'WON' | 'LOST' | null = null;
  for (let i = decided.length - 1; i >= 0; i--) {
    const out = decided[i].outcome as 'WON' | 'LOST';
    if (!streakType) {
      streakType = out;
      streakCount = 1;
    } else if (out === streakType) {
      streakCount++;
    } else {
      break;
    }
  }

  const currentStreakText =
    streakType === 'WON'
      ? `${streakCount}W Winning Streak`
      : streakType === 'LOST'
      ? `${streakCount}L Losing Streak`
      : 'No Settled Streak';

  let gradeLabel = 'Pending Sample';
  if (totalDecided > 0) {
    if (edgeOverBreakEvenPercent >= 8) gradeLabel = 'A+ Elite Accuracy & Value';
    else if (edgeOverBreakEvenPercent >= 3) gradeLabel = 'A Strong Profitable Hit Rate';
    else if (edgeOverBreakEvenPercent >= 0) gradeLabel = 'B+ Above Break-Even Rate';
    else gradeLabel = 'C Below Break-Even Threshold';
  }

  const lastTenSequence = decided.slice(-10).map((r) => ({
    id: r.id,
    outcome: r.outcome as 'WON' | 'LOST',
    selection: r.selection,
    odds: r.decimalOdds,
  }));

  return {
    wins,
    losses,
    pushes,
    pending,
    totalDecided,
    winningRatePercent,
    losingRatePercent,
    expectedWinRatePercent,
    calibrationDeltaPercent,
    averageOdds,
    averageWinningOdds,
    breakEvenWinRatePercent,
    edgeOverBreakEvenPercent,
    brierScore,
    gradeLabel,
    currentStreakText,
    lastTenSequence,
    splits: {
      preMatch: buildSplit(
        'Pre-Match Picks',
        decided.filter((r) => r.matchStatusAtPick === 'PRE_MATCH')
      ),
      inPlay: buildSplit(
        'Live In-Play Picks',
        decided.filter((r) => r.matchStatusAtPick === 'IN_PROGRESS')
      ),
      shortOdds: buildSplit(
        'High-Prob Favorites (<1.80)',
        decided.filter((r) => r.decimalOdds < 1.8)
      ),
      valueOdds: buildSplit(
        'Plus-Value Odds (≥1.80)',
        decided.filter((r) => r.decimalOdds >= 1.8)
      ),
    },
  };
}

