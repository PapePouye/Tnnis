/**
 * Automated Analytics & Mathematics Verification Test Suite
 * Tests probability models, margin removal (de-vigging), EV calculation,
 * Brier score calibration, tennis scoring Markov models, and backtesting logic.
 */

import { proportionalDeVig, shinDeVig, calculateExpectedValue, calculateFairOdds, calculateProbabilityUncertainty } from '../src/utils/devig.ts';
import { gameWinProbability, tiebreakWinProbability, matchWinProbabilityBo3, matchWinProbabilityBo5, computeBrierScore, computeLogLoss, computeCalibrationBins } from '../src/utils/tennisMath.ts';
import { runWalkForwardBacktest, type BacktestConfig } from '../src/utils/backtest.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${msg}`);
  }
}

console.log('--- Running Professional Tennis Analytics Test Suite ---');

// 1. De-Vigging & Margin Removal Tests
console.log('1. Testing Proportional & Shin De-vigging...');
{
  const devigProp = proportionalDeVig(1.50, 2.70);
  assert(devigProp.fairProbA > 0 && devigProp.fairProbA < 1, 'fairProbA must be strictly within (0, 1)');
  assert(devigProp.fairProbB > 0 && devigProp.fairProbB < 1, 'fairProbB must be strictly within (0, 1)');
  assert(Math.abs((devigProp.fairProbA + devigProp.fairProbB) - 1.0) < 0.001, 'De-vigged probabilities must sum to 1.0');
  assert(devigProp.bookmakerMarginPercent > 0, 'Bookmaker margin must be positive');

  const devigShin = shinDeVig(1.50, 2.70);
  assert(Math.abs((devigShin.fairProbA + devigShin.fairProbB) - 1.0) < 0.001, 'Shin probabilities must sum to 1.0');
  assert(devigShin.fairProbA >= devigProp.fairProbA - 0.05, 'Shin favorite prob is bounded');
  console.log('✓ Margin removal tests passed.');
}

// 2. Expected Value & Fair Odds Tests
console.log('2. Testing Expected Value & Fair Odds...');
{
  const fairOdds = calculateFairOdds(50);
  assert(fairOdds === 2.0, `Fair odds for 50% must be 2.0, got ${fairOdds}`);

  const evZero = calculateExpectedValue(50, 2.0);
  assert(evZero === 0.0, `EV for fair odds must be 0%, got ${evZero}%`);

  const evPositive = calculateExpectedValue(60, 2.0);
  assert(evPositive === 20.0, `EV for 60% @2.0 must be +20%, got ${evPositive}%`);

  const evNegative = calculateExpectedValue(40, 2.0);
  assert(evNegative === -20.0, `EV for 40% @2.0 must be -20%, got ${evNegative}%`);
  console.log('✓ Expected Value & Fair Odds tests passed.');
}

// 3. Uncertainty & Confidence Tier Tests
console.log('3. Testing Uncertainty & Confidence Intervals...');
{
  const unc = calculateProbabilityUncertainty(70, 60);
  assert(unc.lowerProb < 70, 'Lower prob must be below mean');
  assert(unc.upperProb > 70, 'Upper prob must be above mean');
  assert(unc.confidenceTier === 'HIGH' || unc.confidenceTier === 'MODERATE', 'Confidence tier must be valid');

  const uncLowSample = calculateProbabilityUncertainty(70, 10);
  assert(uncLowSample.confidenceTier === 'INSUFFICIENT_DATA', 'Low sample size triggers INSUFFICIENT_DATA');
  console.log('✓ Uncertainty calculation tests passed.');
}

// 4. Tennis Markov Game & Match Win Probabilities
console.log('4. Testing Tennis Markov Closed-Form Equations...');
{
  // 50% point probability must give exactly 50% game win probability
  const game50 = gameWinProbability(0.5);
  assert(Math.abs(game50 - 0.5) < 0.0001, `Game prob for 0.5 must be 0.5, got ${game50}`);

  // Strong server 65% point prob must give ~83% hold prob
  const game65 = gameWinProbability(0.65);
  assert(game65 > 0.80 && game65 < 0.87, `Game hold prob for 0.65 must be ~0.83, got ${game65}`);

  // Edge cases
  assert(gameWinProbability(0) === 0, 'Game prob for p=0 is 0');
  assert(gameWinProbability(1) === 1, 'Game prob for p=1 is 1');

  // Match Bo3 & Bo5
  const matchBo3 = matchWinProbabilityBo3(0.5);
  assert(Math.abs(matchBo3 - 0.5) < 0.0001, 'Bo3 match prob for 0.5 set prob must be 0.5');

  const matchBo5 = matchWinProbabilityBo5(0.5);
  assert(Math.abs(matchBo5 - 0.5) < 0.0001, 'Bo5 match prob for 0.5 set prob must be 0.5');

  // Favorite advantage is amplified in Bo5 vs Bo3
  const bo3Favorite = matchWinProbabilityBo3(0.7);
  const bo5Favorite = matchWinProbabilityBo5(0.7);
  assert(bo5Favorite > bo3Favorite, 'Best-of-5 amplifies favorite edge over Best-of-3');
  console.log('✓ Tennis Markov scoring tests passed.');
}

// 5. Calibration, Brier Score & Log Loss Tests
console.log('5. Testing Brier Score, Log Loss & Calibration Bins...');
{
  const mockPredictions = [
    { probability: 0.80, outcome: 1 },
    { probability: 0.70, outcome: 1 },
    { probability: 0.60, outcome: 0 },
    { probability: 0.90, outcome: 1 },
    { probability: 0.55, outcome: 0 },
  ];

  const brier = computeBrierScore(mockPredictions);
  assert(brier >= 0 && brier <= 1.0, `Brier score must be between 0 and 1, got ${brier}`);

  const logLoss = computeLogLoss(mockPredictions);
  assert(logLoss > 0, `Log loss must be positive, got ${logLoss}`);

  const bins = computeCalibrationBins(mockPredictions);
  assert(bins.length === 5, 'Must produce 5 standard calibration decile bins');
  console.log('✓ Calibration metrics tests passed.');
}

// 6. Historical Backtest Engine Validation
console.log('6. Testing Walk-Forward Historical Backtest...');
{
  const testCfg: BacktestConfig = {
    tour: 'ALL',
    surface: 'ALL',
    minEvPercent: 2.0,
    minOdds: 1.25,
    maxOdds: 3.50,
    stakingStrategy: 'FLAT_1U',
    startingBankroll: 100,
  };

  const res = runWalkForwardBacktest(testCfg);
  assert(res.totalMatchesInDataset > 0, 'Backtest dataset must contain matches');
  assert(res.totalQualifiedBets > 0, 'Must identify qualifying value bets');
  assert(res.winningBets + res.losingBets === res.totalQualifiedBets, 'Wins + Losses must match total bets');
  assert(res.brierScoreModel > 0, 'Model Brier score must be calculated');
  assert(res.equityCurve.length > 0, 'Equity curve must contain data points');
  console.log(`✓ Backtest engine successfully evaluated ${res.totalMatchesInDataset} matches (${res.totalQualifiedBets} qualified bets, Win rate: ${res.winRatePercent}%, ROI: ${res.roiYieldPercent}%).`);
}

console.log('--- ALL ANALYTICS TESTS PASSED SUCCESSFULLY ---');
