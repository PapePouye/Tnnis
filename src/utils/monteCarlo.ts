import type { MonteCarloSimulationResult } from '../types';

export interface SurfaceCpiInfo {
  cpi: number;
  speedLabel: 'FAST' | 'MEDIUM_FAST' | 'MEDIUM' | 'MEDIUM_SLOW' | 'SLOW';
  serveDominanceFactor: number;
  rallyLengthAvg: string;
}

export function getSurfaceCpi(surface: string): SurfaceCpiInfo {
  const s = (surface || '').toLowerCase();
  if (s.includes('grass')) {
    return {
      cpi: 44,
      speedLabel: 'FAST',
      serveDominanceFactor: 1.12,
      rallyLengthAvg: '3.4 shots',
    };
  }
  if (s.includes('indoor') || s.includes('carpet')) {
    return {
      cpi: 41,
      speedLabel: 'FAST',
      serveDominanceFactor: 1.09,
      rallyLengthAvg: '3.9 shots',
    };
  }
  if (s.includes('clay')) {
    return {
      cpi: 24,
      speedLabel: 'SLOW',
      serveDominanceFactor: 0.88,
      rallyLengthAvg: '6.8 shots',
    };
  }
  if (s.includes('hard')) {
    return {
      cpi: 37,
      speedLabel: 'MEDIUM_FAST',
      serveDominanceFactor: 1.02,
      rallyLengthAvg: '4.7 shots',
    };
  }
  return {
    cpi: 35,
    speedLabel: 'MEDIUM',
    serveDominanceFactor: 1.0,
    rallyLengthAvg: '5.0 shots',
  };
}

/**
 * Runs 10,000 Monte Carlo iterations of a Best-of-3 tennis match based on estimated
 * win expectancy and surface Court Pace Index (CPI).
 */
export function runMonteCarloMatchSimulation(
  playerAName: string,
  playerBName: string,
  winProbA: number,
  surface: string,
  iterations = 10000
): MonteCarloSimulationResult {
  const cpiInfo = getSurfaceCpi(surface);
  const pA = Math.max(0.05, Math.min(0.95, winProbA / 100));

  // Base point-win-on-serve probabilities calibrated by win expectancy and surface CPI
  const baseServeA = 0.635 + (pA - 0.5) * 0.09 * cpiInfo.serveDominanceFactor;
  const baseServeB = 0.635 - (pA - 0.5) * 0.09 * cpiInfo.serveDominanceFactor;

  // Single game hold probabilities using Markov chain exact formula for 40-40 deuce
  function getHoldProb(pServe: number): number {
    const q = 1 - pServe;
    const pHoldNoDeuce =
      Math.pow(pServe, 4) +
      4 * Math.pow(pServe, 4) * q +
      10 * Math.pow(pServe, 4) * Math.pow(q, 2);
    const pDeuce = 20 * Math.pow(pServe, 3) * Math.pow(q, 3);
    const pWinFromDeuce = Math.pow(pServe, 2) / (Math.pow(pServe, 2) + Math.pow(q, 2));
    return pHoldNoDeuce + pDeuce * pWinFromDeuce;
  }

  const holdProbA = Math.max(0.4, Math.min(0.96, getHoldProb(baseServeA)));
  const holdProbB = Math.max(0.4, Math.min(0.96, getHoldProb(baseServeB)));

  let winsA = 0;
  let winsB = 0;
  let twoZeroA = 0;
  let twoOneA = 0;
  let twoZeroB = 0;
  let twoOneB = 0;
  let firstSetWinsA = 0;
  let matchesWithTiebreak = 0;

  let totalGamesAcc = 0;
  let gamesUnder19_5 = 0;
  let games20_22 = 0;
  let games23_25 = 0;
  let gamesOver25_5 = 0;

  for (let it = 0; it < iterations; it++) {
    let setsA = 0;
    let setsB = 0;
    let totalMatchGames = 0;
    let hadTiebreak = false;
    let isFirstSet = true;

    while (setsA < 2 && setsB < 2) {
      let gamesA = 0;
      let gamesB = 0;
      let serverIsA = (setsA + setsB + gamesA + gamesB) % 2 === 0;

      while (true) {
        // Tiebreak at 6-6
        if (gamesA === 6 && gamesB === 6) {
          hadTiebreak = true;
          totalMatchGames += 1;
          // Tiebreak win prob roughly equals single point win advantage
          const tbProbA = 0.5 + (pA - 0.5) * 0.45;
          if (Math.random() < tbProbA) {
            gamesA++;
            setsA++;
          } else {
            gamesB++;
            setsB++;
          }
          break;
        }

        // Standard game
        const serverWinsGame = Math.random() < (serverIsA ? holdProbA : holdProbB);
        if (serverIsA) {
          if (serverWinsGame) gamesA++;
          else gamesB++;
        } else {
          if (serverWinsGame) gamesB++;
          else gamesA++;
        }
        totalMatchGames++;
        serverIsA = !serverIsA;

        // Check set win
        if (gamesA >= 6 && gamesA - gamesB >= 2) {
          setsA++;
          break;
        }
        if (gamesB >= 6 && gamesB - gamesA >= 2) {
          setsB++;
          break;
        }
      }

      if (isFirstSet) {
        if (setsA === 1) firstSetWinsA++;
        isFirstSet = false;
      }
    }

    if (hadTiebreak) matchesWithTiebreak++;
    totalGamesAcc += totalMatchGames;

    if (totalMatchGames < 20) gamesUnder19_5++;
    else if (totalMatchGames <= 22) games20_22++;
    else if (totalMatchGames <= 25) games23_25++;
    else gamesOver25_5++;

    if (setsA === 2) {
      winsA++;
      if (setsB === 0) twoZeroA++;
      else twoOneA++;
    } else {
      winsB++;
      if (setsA === 0) twoZeroB++;
      else twoOneB++;
    }
  }

  return {
    iterations,
    playerAName,
    playerBName,
    winProbA: Number(((winsA / iterations) * 100).toFixed(1)),
    winProbB: Number(((winsB / iterations) * 100).toFixed(1)),
    setsDistribution: {
      twoZeroA: Number(((twoZeroA / iterations) * 100).toFixed(1)),
      twoOneA: Number(((twoOneA / iterations) * 100).toFixed(1)),
      twoZeroB: Number(((twoZeroB / iterations) * 100).toFixed(1)),
      twoOneB: Number(((twoOneB / iterations) * 100).toFixed(1)),
    },
    totalGamesDistribution: {
      under19_5: Number(((gamesUnder19_5 / iterations) * 100).toFixed(1)),
      range20_22: Number(((games20_22 / iterations) * 100).toFixed(1)),
      range23_25: Number(((games23_25 / iterations) * 100).toFixed(1)),
      over25_5: Number(((gamesOver25_5 / iterations) * 100).toFixed(1)),
      meanGames: Number((totalGamesAcc / iterations).toFixed(1)),
    },
    tiebreakProbability: Number(((matchesWithTiebreak / iterations) * 100).toFixed(1)),
    firstSetWinnerProbA: Number(((firstSetWinsA / iterations) * 100).toFixed(1)),
    courtPaceIndex: cpiInfo,
  };
}
