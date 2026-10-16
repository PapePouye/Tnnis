import React, { useState, useEffect, useCallback } from 'react';
import type { BankrollSimulatorConfig, BetSlipLeg, CandidatePick } from '../types';
import { computeDerivativeMarkets } from '../utils/derivatives';
import { computeStakeForPick } from '../utils/bankroll';
import { runMonteCarloMatchSimulation, getSurfaceCpi } from '../utils/monteCarlo';

interface PlayerMatchupAnalyzerProps {
  bankrollConfig: BankrollSimulatorConfig;
  currentSimulatedBankroll: number;
  onRecordPick: (pick: CandidatePick) => Promise<void>;
  recordingPick: boolean;
  onToggleSlipLeg?: (leg: BetSlipLeg) => void;
  activeSlipLegIds?: Set<string>;
}

interface MatchupPlayerStats {
  name: string;
  tour: 'ATP' | 'WTA';
  eloRank: number;
  officialRank: number | null;
  age: number;
  elo: number;
  hElo: number;
  cElo: number;
  gElo: number;
  peakElo: number;
  url: string;
  surfaceElo: number;
  blendedSurfaceElo: number;
  eloWinProb: number;
  ensembleWinProb: number;
  fairDecimalOdds: number;
  minValueOdds2PctEv: number;
  marketOdds: number | null;
  expectedValuePercent: number | null;
}

interface MatchupResponse {
  surface: string;
  playerA: MatchupPlayerStats;
  playerB: MatchupPlayerStats;
  eloDifferential: number;
  checkedAt: string;
}

const QUICK_MATCHUP_PRESETS = [
  { label: 'Sinner vs. Alcaraz (Hard)', a: 'Jannik Sinner', b: 'Carlos Alcaraz', s: 'Hard (Outdoor)', oA: '1.85', oB: '2.02' },
  { label: 'Sabalenka vs. Swiatek (Hard)', a: 'Aryna Sabalenka', b: 'Iga Swiatek', s: 'Hard (Outdoor)', oA: '1.80', oB: '2.08' },
  { label: 'Zverev vs. Fritz (Indoor)', a: 'Alexander Zverev', b: 'Taylor Fritz', s: 'Hard (Indoor)', oA: '1.74', oB: '2.15' },
  { label: 'Gauff vs. Zheng (Hard)', a: 'Coco Gauff', b: 'Qinwen Zheng', s: 'Hard (Outdoor)', oA: '1.78', oB: '2.10' },
];

export const PlayerMatchupAnalyzer: React.FC<PlayerMatchupAnalyzerProps> = ({
  bankrollConfig,
  currentSimulatedBankroll,
  onRecordPick,
  recordingPick,
  onToggleSlipLeg,
  activeSlipLegIds,
}) => {
  const [playerAInput, setPlayerAInput] = useState('Jannik Sinner');
  const [playerBInput, setPlayerBInput] = useState('Carlos Alcaraz');
  const [surface, setSurface] = useState('Hard (Outdoor)');
  const [oddsAInput, setOddsAInput] = useState('1.85');
  const [oddsBInput, setOddsBInput] = useState('2.02');

  const [matchupData, setMatchupData] = useState<MatchupResponse | null>(null);
  const [playerDirectory, setPlayerDirectory] = useState<Array<{ name: string; tour: string; elo: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Monte Carlo state
  const [showMonteCarlo, setShowMonteCarlo] = useState(false);
  const [monteCarloSim, setMonteCarloSim] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    fetch('/api/players')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.players)) {
          setPlayerDirectory(d.players);
        }
      })
      .catch(() => {});
  }, []);

  const runComparison = useCallback(
    async (a: string, b: string, surf: string, oA: string, oB: string) => {
      if (!a.trim() || !b.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          playerA: a.trim(),
          playerB: b.trim(),
          surface: surf,
        });
        const numOA = parseFloat(oA);
        const numOB = parseFloat(oB);
        if (!isNaN(numOA) && numOA > 1) params.set('oddsA', String(numOA));
        if (!isNaN(numOB) && numOB > 1) params.set('oddsB', String(numOB));

        const res = await fetch(`/api/matchup?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Could not compare players.');
        }
        setMatchupData(data);
      } catch (err: any) {
        setError(err?.message || 'Comparison failed.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    runComparison('Jannik Sinner', 'Carlos Alcaraz', 'Hard (Outdoor)', '1.85', '2.02');
  }, [runComparison]);

  const handleSwapPlayers = () => {
    const nextA = playerBInput;
    const nextB = playerAInput;
    const nextOA = oddsBInput;
    const nextOB = oddsAInput;
    setPlayerAInput(nextA);
    setPlayerBInput(nextB);
    setOddsAInput(nextOA);
    setOddsBInput(nextOB);
    runComparison(nextA, nextB, surface, nextOA, nextOB);
  };

  const sym = bankrollConfig.currency;
  const pA = matchupData?.playerA;
  const pB = matchupData?.playerB;

  const favoredPlayer =
    pA && pB ? (pA.ensembleWinProb >= pB.ensembleWinProb ? pA : pB) : null;
  const derivatives = favoredPlayer
    ? computeDerivativeMarkets(favoredPlayer.ensembleWinProb)
    : null;

  const bestSide =
    pA && pB
      ? (pA.expectedValuePercent ?? -99) >= (pB.expectedValuePercent ?? -99)
        ? pA
        : pB
      : null;

  const recommendedStake =
    bestSide && bestSide.marketOdds
      ? computeStakeForPick(
          currentSimulatedBankroll,
          bankrollConfig.startingBankroll,
          bankrollConfig,
          bestSide.marketOdds,
          bestSide.ensembleWinProb,
          1.0
        )
      : 0;

  const handleStakeMatchupPick = async () => {
    if (!matchupData || !bestSide || !bestSide.marketOdds) return;
    const candidate: CandidatePick = {
      id: `matchup-${Date.now()}`,
      match: `${matchupData.playerA.name} vs. ${matchupData.playerB.name}`,
      playerA: matchupData.playerA.name,
      playerB: matchupData.playerB.name,
      tournament: `${bestSide.tour} Custom Matchup Analysis`,
      round: matchupData.surface,
      surface: matchupData.surface,
      matchStatus: 'PRE_MATCH',
      selection: `${bestSide.name} Moneyline`,
      market: 'Match Winner (Moneyline)',
      decimalOdds: bestSide.marketOdds,
      americanOdds: null,
      bookmaker: 'Verified Market Line',
      oddsCheckedAt: matchupData.checkedAt,
      impliedProbability: Number(((1 / bestSide.marketOdds) * 100).toFixed(1)),
      estimatedProbability: bestSide.ensembleWinProb,
      edgePercent: Number(
        (bestSide.ensembleWinProb - (1 / bestSide.marketOdds) * 100).toFixed(1)
      ),
      expectedValuePercent: bestSide.expectedValuePercent,
      reasoning: `Head-to-Head Surface Elo Simulation on ${matchupData.surface}: ${bestSide.name} holds a ${bestSide.blendedSurfaceElo} blended surface Elo (${bestSide.ensembleWinProb}% win probability, fair odds @${bestSide.fairDecimalOdds.toFixed(2)}).`,
      selectionMethodology: '55% Tennis Abstract Surface-Blended Elo + 45% De-Vigged Market Line',
      sourceConsensus: `Fair Odds @${bestSide.fairDecimalOdds.toFixed(2)} vs. Market @${bestSide.marketOdds.toFixed(2)}`,
      sourceDisagreement: `Minimum playable +2% EV line: @${bestSide.minValueOdds2PctEv.toFixed(2)}`,
      mainRisks: ['Surface speed and day-of-match serve percentage variance.'],
      factors: {
        recentForm: `${bestSide.name} Overall Elo ${bestSide.elo} (Peak ${bestSide.peakElo})`,
        surfaceAnalysis: `${matchupData.surface} Surface Elo: ${bestSide.surfaceElo}`,
        headToHead: `Elo Differential: ${matchupData.eloDifferential > 0 ? '+' : ''}${matchupData.eloDifferential} pts`,
        injuriesAndFitness: 'Active Tour Profile',
        matchConditions: matchupData.surface,
      },
      sourceUrls: [matchupData.playerA.url, matchupData.playerB.url],
    };
    await onRecordPick(candidate);
  };

  return (
    <section id="matchup-analyzer" className="py-8 border-b border-[#DCD8CE]">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-slate-500 font-mono-tabular uppercase tracking-wider">
            Section 05 · Quantitative Head-to-Head Simulator · 950+ Indexed ATP & WTA Profiles
          </p>
          <h2 className="text-2xl sm:text-3xl font-display text-[#11161D] mt-1">
            Head-to-Head Surface Elo & Fair-Odds Line Analyzer
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Compare any two ATP or WTA players across <strong className="font-semibold text-[#11161D]">Hard, Indoor, Clay, or Grass</strong> using live Tennis Abstract surface-specific Elo ratings (`hElo`, `cElo`, `gElo`). Enter your bookmaker’s odds to instantly calculate No-Vig Fair Odds, minimum `+2.0% EV` target lines, and exact `2-0` / `2-1` set score probabilities.
          </p>
        </div>

        {/* Quick Preset Matchups */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono-tabular">
          {QUICK_MATCHUP_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setPlayerAInput(preset.a);
                setPlayerBInput(preset.b);
                setSurface(preset.s);
                setOddsAInput(preset.oA);
                setOddsBInput(preset.oB);
                runComparison(preset.a, preset.b, preset.s, preset.oA, preset.oB);
              }}
              className="px-2.5 py-1.5 text-xs font-medium bg-white border border-[#DCD8CE] text-[#11161D] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Search & Odds Input Form */}
      <div className="dossier-card p-5 sm:p-6">
        <datalist id="tour-players-datalist">
          {playerDirectory.map((p) => (
            <option key={`${p.tour}-${p.name}`} value={p.name}>
              {p.tour} · Elo {p.elo}
            </option>
          ))}
        </datalist>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runComparison(playerAInput, playerBInput, surface, oddsAInput, oddsBInput);
          }}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-3">
            <label className="block text-xs font-mono-tabular uppercase tracking-wider text-slate-600 mb-1">
              Player A (ATP / WTA)
            </label>
            <input
              type="text"
              list="tour-players-datalist"
              value={playerAInput}
              onChange={(e) => setPlayerAInput(e.target.value)}
              placeholder="e.g. Jannik Sinner"
              className="w-full px-3 py-2 text-sm border border-[#C7C2B6] bg-[#FAF9F5] text-[#11161D] focus:outline-none focus:border-[#11161D]"
            />
          </div>

          <div className="md:col-span-1 flex justify-center">
            <button
              type="button"
              onClick={handleSwapPlayers}
              title="Swap Player A & B"
              className="px-3 py-2 text-xs font-mono-tabular border border-[#C7C2B6] bg-[#FAF9F5] hover:bg-[#EAE7DF] text-[#11161D] cursor-pointer"
            >
              ⇄
            </button>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-mono-tabular uppercase tracking-wider text-slate-600 mb-1">
              Player B (ATP / WTA)
            </label>
            <input
              type="text"
              list="tour-players-datalist"
              value={playerBInput}
              onChange={(e) => setPlayerBInput(e.target.value)}
              placeholder="e.g. Carlos Alcaraz"
              className="w-full px-3 py-2 text-sm border border-[#C7C2B6] bg-[#FAF9F5] text-[#11161D] focus:outline-none focus:border-[#11161D]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-mono-tabular uppercase tracking-wider text-slate-600 mb-1">
              Court Surface
            </label>
            <select
              value={surface}
              onChange={(e) => {
                setSurface(e.target.value);
                runComparison(playerAInput, playerBInput, e.target.value, oddsAInput, oddsBInput);
              }}
              className="w-full px-3 py-2 text-sm border border-[#C7C2B6] bg-[#FAF9F5] text-[#11161D] focus:outline-none focus:border-[#11161D] cursor-pointer"
            >
              <option value="Hard (Outdoor)">Hard (Outdoor)</option>
              <option value="Hard (Indoor)">Hard (Indoor)</option>
              <option value="Clay">Clay (cElo)</option>
              <option value="Grass">Grass (gElo)</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-mono-tabular uppercase tracking-wider text-slate-600 mb-1">
              Odds A
            </label>
            <input
              type="number"
              step="0.01"
              min="1.01"
              value={oddsAInput}
              onChange={(e) => setOddsAInput(e.target.value)}
              className="w-full px-2.5 py-2 text-sm font-mono-tabular border border-[#C7C2B6] bg-[#FAF9F5] text-[#11161D] focus:outline-none focus:border-[#11161D]"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-mono-tabular uppercase tracking-wider text-slate-600 mb-1">
              Odds B
            </label>
            <input
              type="number"
              step="0.01"
              min="1.01"
              value={oddsBInput}
              onChange={(e) => setOddsBInput(e.target.value)}
              className="w-full px-2.5 py-2 text-sm font-mono-tabular border border-[#C7C2B6] bg-[#FAF9F5] text-[#11161D] focus:outline-none focus:border-[#11161D]"
            />
          </div>

          <div className="md:col-span-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-3 text-xs font-mono-tabular font-semibold uppercase tracking-wider bg-[#0B1118] hover:bg-[#18222F] text-[#D4A853] transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? '...' : 'Compare'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-[#FFF5F3] border border-[#C2492A] text-xs text-[#7A2713]">
            {error}
          </div>
        )}

        {/* Comparison Results Matrix */}
        {pA && pB && matchupData && (
          <div className="mt-6 pt-6 border-t border-[#DCD8CE] space-y-6">
            {/* Win Probability Split Bar */}
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <div className="text-lg font-display text-[#11161D]">
                  {pA.name}{' '}
                  <span className="font-mono-tabular font-bold text-[#0D5C3A]">
                    {pA.ensembleWinProb.toFixed(1)}%
                  </span>{' '}
                  <span className="text-xs font-sans font-normal text-slate-500 font-mono-tabular">
                    (Fair @{pA.fairDecimalOdds.toFixed(2)} · Min +2% EV @{pA.minValueOdds2PctEv.toFixed(2)})
                  </span>
                </div>
                <div className="text-xs font-mono-tabular text-slate-500">
                  Surface Elo Differential:{' '}
                  <strong className="text-[#11161D]">
                    {matchupData.eloDifferential >= 0 ? pA.name : pB.name} +
                    {Math.abs(matchupData.eloDifferential).toFixed(1)} pts
                  </strong>{' '}
                  on {matchupData.surface}
                </div>
                <div className="text-lg font-display text-[#11161D] text-right">
                  <span className="text-xs font-sans font-normal text-slate-500 font-mono-tabular">
                    (Fair @{pB.fairDecimalOdds.toFixed(2)} · Min +2% EV @{pB.minValueOdds2PctEv.toFixed(2)})
                  </span>{' '}
                  <span className="font-mono-tabular font-bold text-[#0D5C3A]">
                    {pB.ensembleWinProb.toFixed(1)}%
                  </span>{' '}
                  {pB.name}
                </div>
              </div>

              <div className="w-full h-2.5 bg-[#EAE7DF] flex overflow-hidden">
                <div
                  className="bg-[#0B1118] h-full transition-all duration-300"
                  style={{ width: `${pA.ensembleWinProb}%` }}
                />
                <div
                  className="bg-[#0D5C3A] h-full transition-all duration-300"
                  style={{ width: `${pB.ensembleWinProb}%` }}
                />
              </div>
            </div>

            {/* Side-by-Side Quantitative Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 border border-[#DCD8CE] divide-y divide-[#EAE7DF] text-xs">
                <div className="grid grid-cols-3 bg-[#FAF9F5] px-4 py-2.5 font-mono-tabular font-semibold uppercase tracking-wider text-[#11161D]">
                  <div>{pA.name}</div>
                  <div className="text-center text-slate-500">Metric</div>
                  <div className="text-right">{pB.name}</div>
                </div>

                <div className="grid grid-cols-3 px-4 py-2.5 font-mono-tabular">
                  <div className="font-semibold text-[#11161D]">
                    #{pA.eloRank}{' '}
                    <span className="text-slate-400 font-normal">
                      ({pA.officialRank ? `Tour #${pA.officialRank}` : pA.tour})
                    </span>
                  </div>
                  <div className="text-center font-sans text-slate-500">Elo / Tour Rank</div>
                  <div className="text-right font-semibold text-[#11161D]">
                    <span className="text-slate-400 font-normal">
                      ({pB.officialRank ? `Tour #${pB.officialRank}` : pB.tour})
                    </span>{' '}
                    #{pB.eloRank}
                  </div>
                </div>

                <div className="grid grid-cols-3 px-4 py-2.5 font-mono-tabular">
                  <div className="font-semibold text-[#11161D]">{pA.elo.toFixed(1)}</div>
                  <div className="text-center font-sans text-slate-500">Overall Tour Elo</div>
                  <div className="text-right font-semibold text-[#11161D]">
                    {pB.elo.toFixed(1)}
                  </div>
                </div>

                <div className="grid grid-cols-3 px-4 py-2.5 font-mono-tabular bg-[#FAF9F5]">
                  <div className="font-semibold text-[#0D5C3A]">
                    {pA.surfaceElo.toFixed(1)} (Blended {pA.blendedSurfaceElo.toFixed(1)})
                  </div>
                  <div className="text-center font-sans text-[#11161D] font-medium">
                    {matchupData.surface} Elo
                  </div>
                  <div className="text-right font-semibold text-[#0D5C3A]">
                    {pB.surfaceElo.toFixed(1)} (Blended {pB.blendedSurfaceElo.toFixed(1)})
                  </div>
                </div>

                <div className="grid grid-cols-3 px-4 py-2.5 font-mono-tabular">
                  <div className="text-slate-700">
                    {pA.hElo.toFixed(0)} / {pA.cElo.toFixed(0)} / {pA.gElo.toFixed(0)}
                  </div>
                  <div className="text-center font-sans text-slate-500">
                    Hard / Clay / Grass Splits
                  </div>
                  <div className="text-right text-slate-700">
                    {pB.hElo.toFixed(0)} / {pB.cElo.toFixed(0)} / {pB.gElo.toFixed(0)}
                  </div>
                </div>

                <div className="grid grid-cols-3 px-4 py-2.5 font-mono-tabular">
                  <div className="text-slate-700">{pA.peakElo.toFixed(1)}</div>
                  <div className="text-center font-sans text-slate-500">Career Peak Elo</div>
                  <div className="text-right text-slate-700">{pB.peakElo.toFixed(1)}</div>
                </div>

                <div className="grid grid-cols-3 px-4 py-2.5 font-mono-tabular bg-[#FAF9F5]">
                  <div
                    className={`font-semibold ${
                      (pA.expectedValuePercent ?? -1) >= 2.0
                        ? 'text-[#0D5C3A]'
                        : (pA.expectedValuePercent ?? 0) < 0
                        ? 'text-[#C2492A]'
                        : 'text-[#11161D]'
                    }`}
                  >
                    {pA.marketOdds ? `@${pA.marketOdds.toFixed(2)} ` : 'No Odds '}
                    {pA.expectedValuePercent !== null
                      ? `(${pA.expectedValuePercent >= 0 ? '+' : ''}${pA.expectedValuePercent.toFixed(1)}% EV)`
                      : ''}
                  </div>
                  <div className="text-center font-sans text-[#11161D] font-medium">
                    Market Odds & EV %
                  </div>
                  <div
                    className={`text-right font-semibold ${
                      (pB.expectedValuePercent ?? -1) >= 2.0
                        ? 'text-[#0D5C3A]'
                        : (pB.expectedValuePercent ?? 0) < 0
                        ? 'text-[#C2492A]'
                        : 'text-[#11161D]'
                    }`}
                  >
                    {pB.marketOdds ? `@${pB.marketOdds.toFixed(2)} ` : 'No Odds '}
                    {pB.expectedValuePercent !== null
                      ? `(${pB.expectedValuePercent >= 0 ? '+' : ''}${pB.expectedValuePercent.toFixed(1)}% EV)`
                      : ''}
                  </div>
                </div>
              </div>

              {/* Right: Derivative Set Probabilities & Action */}
              <div className="lg:col-span-5 bg-[#FAF9F5] border border-[#DCD8CE] p-4 flex flex-col justify-between space-y-4 text-xs">
                {derivatives && favoredPlayer && (
                  <div className="space-y-3">
                    <div className="font-mono-tabular font-semibold uppercase tracking-wider text-[#11161D] border-b border-[#DCD8CE] pb-2">
                      Set Score & Derivative Projections ({favoredPlayer.name})
                    </div>

                    <div className="grid grid-cols-2 gap-px dossier-grid-hairline font-mono-tabular">
                      <div className="bg-white p-2.5">
                        <span className="text-slate-500 block font-sans text-[11px]">
                          {favoredPlayer.name} Wins 2-0
                        </span>
                        <span className="text-sm font-semibold text-[#11161D]">
                          {derivatives.probWin2_0}%
                        </span>
                        <span className="text-slate-400 ml-1.5">
                          (Fair @{derivatives.fairOdds2_0})
                        </span>
                      </div>

                      <div className="bg-white p-2.5">
                        <span className="text-slate-500 block font-sans text-[11px]">
                          {favoredPlayer.name} Wins 2-1
                        </span>
                        <span className="text-sm font-semibold text-[#11161D]">
                          {derivatives.probWin2_1}%
                        </span>
                        <span className="text-slate-400 ml-1.5">
                          (Fair @{derivatives.fairOdds2_1})
                        </span>
                      </div>

                      <div className="bg-white p-2.5">
                        <span className="text-slate-500 block font-sans text-[11px]">
                          Over 2.5 Sets (3-Setter)
                        </span>
                        <span className="text-sm font-semibold text-[#11161D]">
                          {derivatives.probOver2_5Sets}%
                        </span>
                        <span className="text-slate-400 ml-1.5">
                          (Fair @{derivatives.fairOddsOver2_5Sets})
                        </span>
                      </div>

                      <div className="bg-white p-2.5">
                        <span className="text-slate-500 block font-sans text-[11px]">
                          Expected Total Games
                        </span>
                        <span className="text-sm font-semibold text-[#11161D]">
                          {derivatives.projectedTotalGames} Games
                        </span>
                        <span className="text-slate-400 ml-1.5">
                          ({derivatives.projectedGameHandicap} Spread)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-[#DCD8CE] space-y-2.5 font-mono-tabular">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <a
                        href={pA.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-600 hover:text-[#11161D] underline"
                      >
                        {pA.name} Dossier ↗
                      </a>
                      <a
                        href={pB.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-600 hover:text-[#11161D] underline"
                      >
                        {pB.name} Dossier ↗
                      </a>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSimulating(true);
                        setTimeout(() => {
                          const res = runMonteCarloMatchSimulation(
                            pA.name,
                            pB.name,
                            pA.ensembleWinProb,
                            matchupData.surface,
                            10000
                          );
                          setMonteCarloSim(res);
                          setShowMonteCarlo(true);
                          setSimulating(false);
                        }, 50);
                      }}
                      disabled={simulating}
                      className="text-xs text-[#0D5C3A] hover:underline font-semibold cursor-pointer"
                    >
                      {simulating ? 'Simulating 10k...' : '⚡ Run 10k Monte Carlo'}
                    </button>
                  </div>

                  {/* Monte Carlo Results Drawer */}
                  {showMonteCarlo && monteCarloSim && (
                    <div className="p-3 bg-white border border-[#DCD8CE] space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-[#EAE7DF] pb-1.5 font-mono-tabular">
                        <span className="font-semibold text-[#11161D]">
                          10,000-Match Simulation on {matchupData.surface}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowMonteCarlo(false)}
                          className="text-slate-400 hover:text-[#11161D]"
                        >
                          × Close
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-center font-mono-tabular">
                        <div className="bg-[#FAF9F5] p-1.5">
                          <div className="text-[10px] text-slate-500">2-0 {pA.name.split(' ').pop()}</div>
                          <div className="font-bold text-[#0D5C3A]">{monteCarloSim.setsDistribution.twoZeroA}%</div>
                        </div>
                        <div className="bg-[#FAF9F5] p-1.5">
                          <div className="text-[10px] text-slate-500">2-1 {pA.name.split(' ').pop()}</div>
                          <div className="font-bold text-[#11161D]">{monteCarloSim.setsDistribution.twoOneA}%</div>
                        </div>
                        <div className="bg-[#FAF9F5] p-1.5">
                          <div className="text-[10px] text-slate-500">Mean Games</div>
                          <div className="font-bold text-[#11161D]">{monteCarloSim.totalGamesDistribution.meanGames}</div>
                        </div>
                        <div className="bg-[#FAF9F5] p-1.5">
                          <div className="text-[10px] text-slate-500">Tiebreak %</div>
                          <div className="font-bold text-[#0D5C3A]">{monteCarloSim.tiebreakProbability}%</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {bestSide && bestSide.marketOdds && (
                    <div className="flex items-center gap-2">
                      {onToggleSlipLeg && (
                        <button
                          type="button"
                          onClick={() => {
                            const slipId = `matchup-${bestSide.name}-${Date.now()}`;
                            onToggleSlipLeg({
                              id: slipId,
                              match: `${matchupData.playerA.name} vs. ${matchupData.playerB.name}`,
                              selection: `${bestSide.name} Moneyline`,
                              market: 'Match Winner',
                              decimalOdds: bestSide.marketOdds!,
                              estimatedProbability: bestSide.ensembleWinProb,
                              tournament: `${bestSide.tour} Matchup Simulator`,
                              surface: matchupData.surface,
                              matchStatus: 'PRE_MATCH',
                              sourceUrl: bestSide.url,
                            });
                          }}
                          className="py-2.5 px-3 text-xs font-mono-tabular font-semibold uppercase tracking-wider bg-white hover:bg-[#FAF9F5] text-[#11161D] border border-[#DCD8CE] whitespace-nowrap cursor-pointer"
                        >
                          + Slip
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleStakeMatchupPick}
                        disabled={recordingPick}
                        className="flex-1 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider bg-[#0B1118] hover:bg-[#18222F] text-[#D4A853] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Stake {recommendedStake.toFixed(2)}
                        {sym} on {bestSide.name} (@{bestSide.marketOdds.toFixed(2)})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
