import React, { useState } from 'react';
import type {
  BankrollSimulatorConfig,
  CandidatePick,
  StakingStrategy,
  TrackedResult,
} from '../types';
import {
  computeStakeForPick,
  evaluatePickAccuracy,
  simulateBankrollGrowth,
} from '../utils/bankroll';
import { CombinePerformanceGraphic } from './CombinePerformanceGraphic';

interface PastResultsSectionProps {
  results: TrackedResult[];
  bankrollConfig: BankrollSimulatorConfig;
  onUpdateBankrollConfig: (next: BankrollSimulatorConfig) => void;
  finalPick?: CandidatePick | null;
  bestLivePick?: CandidatePick | null;
  onRecordCandidatePick: (pick: CandidatePick) => Promise<void>;
  recordedMatches: Set<string>;
  recordingPick: boolean;
  onAddManualResult: (entry: Partial<TrackedResult>) => Promise<void>;
  onUpdateOutcome: (
    id: string,
    outcome: 'WON' | 'LOST' | 'PUSH' | 'PENDING',
    finalScore?: string
  ) => Promise<void>;
  onVerifyOutcome: (id: string) => Promise<string>;
  onVerifyAllPending?: () => Promise<string>;
  onDeleteResult: (id: string) => Promise<void>;
}

const BANKROLL_PRESETS = [50, 100, 250, 500, 1000];
const UNIT_PERCENT_PRESETS = [2, 5, 10];

export const PastResultsSection: React.FC<PastResultsSectionProps> = ({
  results,
  bankrollConfig,
  onUpdateBankrollConfig,
  finalPick,
  bestLivePick,
  onRecordCandidatePick,
  recordedMatches,
  recordingPick,
  onAddManualResult,
  onUpdateOutcome,
  onVerifyOutcome,
  onVerifyAllPending,
  onDeleteResult,
}) => {
  const [viewMode, setViewMode] = useState<'BANKROLL_LEDGER' | 'COMBINES_GRAPHIC'>('BANKROLL_LEDGER');
  const [filterOutcome, setFilterOutcome] = useState<'ALL' | 'SETTLED' | 'PENDING'>('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyingAll, setVerifyingAll] = useState<boolean>(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  // Add Form State
  const [match, setMatch] = useState('');
  const [tournament, setTournament] = useState('');
  const [surface, setSurface] = useState('Hard');
  const [matchStatusAtPick, setMatchStatusAtPick] = useState<'PRE_MATCH' | 'IN_PROGRESS'>(
    'PRE_MATCH'
  );
  const [selection, setSelection] = useState('');
  const [market, setMarket] = useState('Match Winner');
  const [decimalOdds, setDecimalOdds] = useState('2.10');
  const [estimatedProbability, setEstimatedProbability] = useState('52.0');
  const [stakeUnits, setStakeUnits] = useState('1.0');
  const [outcome, setOutcome] = useState<'PENDING' | 'WON' | 'LOST' | 'PUSH'>('PENDING');
  const [finalScore, setFinalScore] = useState('');

  // Interactive EV / ROI Calculator State
  const [calcOdds, setCalcOdds] = useState('2.05');
  const [calcEstProb, setCalcEstProb] = useState('53.5');
  const [calcStake, setCalcStake] = useState('100');

  const sym = bankrollConfig.currency;
  const simulation = simulateBankrollGrowth(results, bankrollConfig);
  const accuracy = evaluatePickAccuracy(results);

  const settledResults = results.filter(
    (r) => r.outcome === 'WON' || r.outcome === 'LOST' || r.outcome === 'PUSH'
  );
  const pendingResults = results.filter((r) => r.outcome === 'PENDING');

  const wins = settledResults.filter((r) => r.outcome === 'WON').length;
  const losses = settledResults.filter((r) => r.outcome === 'LOST').length;
  const pushes = settledResults.filter((r) => r.outcome === 'PUSH').length;

  const totalStakedUnits = settledResults.reduce((acc, r) => acc + r.stakeUnits, 0);
  const netProfitUnits = settledResults.reduce((acc, r) => acc + r.profitUnits, 0);
  const actualRoiPercent =
    totalStakedUnits > 0 ? (netProfitUnits / totalStakedUnits) * 100 : 0;

  const isVerifiedProfitable = settledResults.length > 0 && netProfitUnits > 0;

  const filteredList = results.filter((r) => {
    if (filterOutcome === 'SETTLED') return r.outcome !== 'PENDING';
    if (filterOutcome === 'PENDING') return r.outcome === 'PENDING';
    return true;
  });

  // Next pick projection helper
  const nextTargetPick = finalPick || bestLivePick || null;
  const nextPickStake =
    nextTargetPick && nextTargetPick.decimalOdds
      ? computeStakeForPick(
          simulation.currentBankroll,
          simulation.startingBankroll,
          bankrollConfig,
          nextTargetPick.decimalOdds,
          nextTargetPick.estimatedProbability || 50,
          1.0
        )
      : computeStakeForPick(
          simulation.currentBankroll,
          simulation.startingBankroll,
          bankrollConfig,
          1.95,
          54.0,
          1.0
        );

  const nextPickWinProfit =
    nextTargetPick && nextTargetPick.decimalOdds
      ? Number((nextPickStake * (nextTargetPick.decimalOdds - 1)).toFixed(2))
      : Number((nextPickStake * 0.95).toFixed(2));

  const isNextTargetRecorded = nextTargetPick
    ? recordedMatches.has(nextTargetPick.match)
    : false;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match.trim() || !selection.trim()) return;
    await onAddManualResult({
      match: match.trim(),
      tournament: tournament.trim() || 'Tour Event',
      surface,
      matchStatusAtPick,
      selection: selection.trim(),
      market: market.trim() || 'Match Winner',
      decimalOdds: parseFloat(decimalOdds),
      estimatedProbability: parseFloat(estimatedProbability),
      stakeUnits: parseFloat(stakeUnits) || 1,
      outcome,
      finalScore: finalScore.trim() || undefined,
    });
    setMatch('');
    setSelection('');
    setFinalScore('');
    setShowAddForm(false);
  };

  const handleVerifyClick = async (id: string) => {
    setVerifyingId(id);
    setVerifyMessage(null);
    try {
      const msg = await onVerifyOutcome(id);
      setVerifyMessage(msg);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleVerifyAllClick = async () => {
    if (!onVerifyAllPending) return;
    setVerifyingAll(true);
    setVerifyMessage(null);
    try {
      const msg = await onVerifyAllPending();
      setVerifyMessage(msg);
    } finally {
      setVerifyingAll(false);
    }
  };

  const handleExportCsv = () => {
    if (results.length === 0) return;
    const headers = [
      'Date',
      'Match',
      'Tournament',
      'Surface',
      'StatusAtPick',
      'Selection',
      'Market',
      'DecimalOdds',
      'EstWinProb%',
      'EV%',
      'StakeUnits',
      `SimStake(${sym})`,
      'Outcome',
      'ProfitUnits',
      `SimProfit(${sym})`,
      `SimBankrollAfter(${sym})`,
      'FinalScore',
    ];
    const rows = results.map((r) => {
      const sim = simulation.byResultId.get(r.id);
      return [
        r.date,
        `"${r.match.replace(/"/g, '""')}"`,
        `"${r.tournament.replace(/"/g, '""')}"`,
        r.surface,
        r.matchStatusAtPick,
        `"${r.selection.replace(/"/g, '""')}"`,
        `"${r.market.replace(/"/g, '""')}"`,
        r.decimalOdds.toFixed(2),
        r.estimatedProbability.toFixed(1),
        r.expectedValuePercent.toFixed(2),
        r.stakeUnits.toFixed(2),
        sim ? sim.stakeCurrency.toFixed(2) : '0.00',
        r.outcome,
        r.profitUnits.toFixed(2),
        sim ? sim.profitCurrency.toFixed(2) : '0.00',
        sim ? sim.bankrollAfter.toFixed(2) : simulation.currentBankroll.toFixed(2),
        `"${(r.finalScore || '').replace(/"/g, '""')}"`,
      ];
    });
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `courtedge_bankroll_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculator math
  const parsedCalcOdds = parseFloat(calcOdds) || 0;
  const parsedCalcProb = parseFloat(calcEstProb) || 0;
  const parsedCalcStake = parseFloat(calcStake) || 0;
  const calcImplied = parsedCalcOdds > 1 ? (1 / parsedCalcOdds) * 100 : 0;
  const calcEvPercent =
    parsedCalcOdds > 1 && parsedCalcProb > 0
      ? ((parsedCalcProb / 100) * parsedCalcOdds - 1) * 100
      : 0;
  const calcExpectedProfit = (calcEvPercent / 100) * parsedCalcStake;

  // Chart scaling for step trajectory
  const allBalances = [
    simulation.startingBankroll,
    ...simulation.steps.map((s) => s.bankrollAfter),
  ];
  const minBalance = Math.min(...allBalances) * 0.92;
  const maxBalance = Math.max(...allBalances, simulation.startingBankroll * 1.15);

  return (
    <section id="past-results" className="py-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-slate-500 font-mono-tabular">
            07. Bankroll Growth Simulator · Win/Loss Accuracy Audit & Verified Results Ledger
          </p>
          <h2
            className="text-2xl sm:text-3xl font-display text-[#11161D] mt-1"
            style={{ textWrap: 'balance' }}
          >
            Bankroll Simulator (e.g. 100{sym}) & Pick Accuracy Evaluation
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Enter your starting capital (for example{' '}
            <strong className="font-semibold text-[#11161D]">
              100{sym}
            </strong>
            ) to simulate growing your bankroll step-by-step with our verified picks, recommended stake sizing, and settled winning vs. losing rate audit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono-tabular">
          {pendingResults.length > 0 && onVerifyAllPending && (
            <button
              type="button"
              onClick={handleVerifyAllClick}
              disabled={verifyingAll}
              className="px-3.5 py-2 text-xs font-semibold bg-[#0D5C3A] text-white hover:bg-[#0A482D] whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              {verifyingAll
                ? 'Checking Official Scores...'
                : `Auto-Settle Pending (${pendingResults.length})`}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowCalculator(!showCalculator)}
            className="px-3.5 py-2 text-xs font-semibold bg-white border border-[#DCD8CE] text-[#11161D] hover:bg-[#FAF9F5] whitespace-nowrap cursor-pointer"
          >
            {showCalculator ? 'Hide EV Calculator' : 'EV & Odds Calculator'}
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3.5 py-2 text-xs font-semibold bg-[#0B1118] text-[#D4A853] hover:bg-[#18222F] whitespace-nowrap cursor-pointer"
          >
            {showAddForm ? 'Close Entry Form' : '+ Log Verified Pick'}
          </button>

          {results.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2 text-xs font-semibold bg-white border border-[#DCD8CE] text-[#11161D] hover:bg-[#FAF9F5] whitespace-nowrap cursor-pointer"
            >
              Export CSV ↓
            </button>
          )}
        </div>
      </div>

      {/* Station Sub-Navigation: Single Picks Ledger vs Combines Graphic */}
      <div className="flex flex-wrap items-center gap-2 mb-6 font-mono-tabular">
        <button
          type="button"
          onClick={() => setViewMode('BANKROLL_LEDGER')}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border transition-colors cursor-pointer ${
            viewMode === 'BANKROLL_LEDGER'
              ? 'bg-[#0B1118] text-[#D4A853] border-[#0B1118]'
              : 'bg-white text-slate-700 border-[#DCD8CE] hover:text-[#11161D]'
          }`}
        >
          Single Picks Bankroll Ledger & Accuracy
        </button>
        <button
          type="button"
          onClick={() => setViewMode('COMBINES_GRAPHIC')}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border transition-colors cursor-pointer flex items-center gap-1.5 ${
            viewMode === 'COMBINES_GRAPHIC'
              ? 'bg-[#0B1118] text-[#D4A853] border-[#0B1118]'
              : 'bg-white text-slate-700 border-[#DCD8CE] hover:text-[#11161D]'
          }`}
        >
          <span>📊 Multi-Leg Combines Win/Loss Graphic</span>
          <span className="text-[10px] px-1 py-0.2 bg-[#0D5C3A] text-white font-bold">Audited</span>
        </button>
      </div>

      {viewMode === 'COMBINES_GRAPHIC' ? (
        <div className="space-y-6">
          <CombinePerformanceGraphic results={results} currencySymbol={sym} />
        </div>
      ) : (
        <>
          {/* ===================================================================== */}
          {/* INTERACTIVE BANKROLL GROWTH SIMULATOR (e.g. 100€ -> Grow with Picks)  */}
          {/* ===================================================================== */}
          <div className="dossier-card mb-6">
        {/* Top Configuration Bar */}
        <div className="p-5 sm:p-6 border-b border-[#DCD8CE]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-lg font-display text-[#11161D]">
                Interactive Bankroll Growth Simulator
              </div>
              <p className="text-xs text-slate-600">
                Set your starting capital and staking discipline. Every settled pick in the results table below compounds or updates your simulated bankroll chronologically.
              </p>
            </div>

            {/* Quick Starting Bankroll Presets */}
            <div className="flex flex-wrap items-center gap-1.5 font-mono-tabular">
              <span className="text-xs text-slate-500 mr-1">Quick Capital:</span>
              {BANKROLL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    onUpdateBankrollConfig({
                      ...bankrollConfig,
                      startingBankroll: preset,
                    })
                  }
                  className={`px-2.5 py-1 text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                    bankrollConfig.startingBankroll === preset
                      ? 'bg-[#0B1118] text-[#D4A853] border-[#0B1118]'
                      : 'bg-[#FAF9F5] text-[#11161D] border-[#C7C2B6] hover:bg-[#EAE7DF]'
                  }`}
                >
                  {preset}
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* 3-Column Simulator Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-[#EAE7DF]">
            {/* 1. Starting Capital & Currency */}
            <div>
              <label className="block text-xs font-mono-tabular text-slate-600 mb-1.5">
                Starting Bankroll Capital
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="10"
                    step="10"
                    value={bankrollConfig.startingBankroll}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onUpdateBankrollConfig({
                        ...bankrollConfig,
                        startingBankroll: isNaN(val) ? 100 : Math.max(1, val),
                      });
                    }}
                    className="w-full px-3 py-2 text-sm font-mono-tabular font-semibold border border-[#C7C2B6] bg-[#FAF9F5] text-[#11161D] focus:outline-none focus:border-[#11161D]"
                  />
                </div>
                <select
                  aria-label="Currency"
                  value={bankrollConfig.currency}
                  onChange={(e) =>
                    onUpdateBankrollConfig({
                      ...bankrollConfig,
                      currency: e.target.value as '€' | '$' | '£',
                    })
                  }
                  className="px-3 py-2 text-sm font-mono-tabular font-semibold border border-[#C7C2B6] bg-[#FAF9F5] text-[#11161D] focus:outline-none focus:border-[#11161D] cursor-pointer"
                >
                  <option value="€">€ (EUR)</option>
                  <option value="$">$ (USD)</option>
                  <option value="£">£ (GBP)</option>
                </select>
              </div>
            </div>

            {/* 2. Staking Strategy */}
            <div>
              <label className="block text-xs font-mono-tabular text-slate-600 mb-1.5">
                Money Management Strategy
              </label>
              <select
                value={bankrollConfig.strategy}
                onChange={(e) =>
                  onUpdateBankrollConfig({
                    ...bankrollConfig,
                    strategy: e.target.value as StakingStrategy,
                  })
                }
                className="w-full px-3 py-2 text-xs sm:text-sm border border-[#C7C2B6] bg-[#FAF9F5] text-[#11161D] focus:outline-none focus:border-[#11161D] cursor-pointer"
              >
                <option value="COMPOUND_PERCENT">
                  Compounding (% of Current Bankroll — Grow Faster)
                </option>
                <option value="FLAT_PERCENT">
                  Flat Stake (% of Starting {bankrollConfig.startingBankroll}
                  {sym} Bankroll)
                </option>
                <option value="QUARTER_KELLY">
                  Quarter-Kelly Criterion (Scale Stake by Pick EV Edge)
                </option>
              </select>
            </div>

            {/* 3. Unit Risk % per Pick */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono-tabular text-slate-600">
                  Stake Size per 1u Pick ({bankrollConfig.unitPercent}%)
                </label>
                <div className="flex items-center gap-1 font-mono-tabular">
                  {UNIT_PERCENT_PRESETS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() =>
                        onUpdateBankrollConfig({
                          ...bankrollConfig,
                          unitPercent: pct,
                        })
                      }
                      className={`px-2 py-0.5 text-[11px] border whitespace-nowrap cursor-pointer ${
                        bankrollConfig.unitPercent === pct
                          ? 'bg-[#0B1118] text-[#D4A853] border-[#0B1118]'
                          : 'bg-[#FAF9F5] text-slate-700 border-[#C7C2B6] hover:bg-[#EAE7DF]'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={bankrollConfig.unitPercent}
                onChange={(e) =>
                  onUpdateBankrollConfig({
                    ...bankrollConfig,
                    unitPercent: parseFloat(e.target.value) || 5,
                  })
                }
                className="w-full accent-[#0D5C3A] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono-tabular">
                <span>Conservative (2%)</span>
                <span>
                  1u ={' '}
                  {(
                    (bankrollConfig.strategy === 'FLAT_PERCENT'
                      ? simulation.startingBankroll
                      : simulation.currentBankroll) *
                    (bankrollConfig.unitPercent / 100)
                  ).toFixed(2)}
                  {sym}
                </span>
                <span>Aggressive (15%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5-Column Simulated Bankroll Performance Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px dossier-grid-hairline border-b border-[#DCD8CE]">
          <div className="bg-[#FAF9F5] p-4">
            <div className="text-xs text-slate-500 font-mono-tabular">Starting Bankroll</div>
            <div className="text-lg sm:text-xl font-semibold text-[#11161D] font-mono-tabular mt-1">
              {simulation.startingBankroll.toFixed(2)}
              {sym}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Initial deposit</div>
          </div>

          <div className="bg-[#FAF9F5] p-4">
            <div className="text-xs text-slate-500 font-mono-tabular">Current Bankroll</div>
            <div
              className={`text-lg sm:text-xl font-semibold font-mono-tabular mt-1 ${
                simulation.currentBankroll > simulation.startingBankroll
                  ? 'text-[#0D5C3A]'
                  : simulation.currentBankroll < simulation.startingBankroll
                  ? 'text-[#C2492A]'
                  : 'text-[#11161D]'
              }`}
            >
              {simulation.currentBankroll.toFixed(2)}
              {sym}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              After {settledResults.length} settled picks
            </div>
          </div>

          <div className="bg-[#FAF9F5] p-4">
            <div className="text-xs text-slate-500 font-mono-tabular">Simulated Net Profit</div>
            <div
              className={`text-lg sm:text-xl font-semibold font-mono-tabular mt-1 ${
                simulation.netProfitCurrency > 0
                  ? 'text-[#0D5C3A]'
                  : simulation.netProfitCurrency < 0
                  ? 'text-[#C2492A]'
                  : 'text-[#11161D]'
              }`}
            >
              {simulation.netProfitCurrency > 0 ? '+' : ''}
              {simulation.netProfitCurrency.toFixed(2)}
              {sym}{' '}
              <span className="text-xs font-normal">
                ({simulation.totalGrowthPercent > 0 ? '+' : ''}
                {simulation.totalGrowthPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono-tabular mt-0.5">
              Yield / ROI: {simulation.roiPercent > 0 ? '+' : ''}
              {simulation.roiPercent.toFixed(2)}%
            </div>
          </div>

          <div className="bg-[#FAF9F5] p-4">
            <div className="text-xs text-slate-500 font-mono-tabular">Next Pick Stake</div>
            <div className="text-lg sm:text-xl font-semibold text-[#11161D] font-mono-tabular mt-1">
              {nextPickStake.toFixed(2)}
              {sym}
            </div>
            <div className="text-[11px] text-[#0D5C3A] font-mono-tabular mt-0.5">
              Win target: +
              {nextPickWinProfit.toFixed(2)}
              {sym}
            </div>
          </div>

          <div className="bg-[#FAF9F5] p-4 col-span-2 sm:col-span-1">
            <div className="text-xs text-slate-500 font-mono-tabular">Peak & Drawdown</div>
            <div className="text-lg sm:text-xl font-semibold text-[#11161D] font-mono-tabular mt-1">
              {simulation.peakBankroll.toFixed(2)}
              {sym}
            </div>
            <div className="text-[11px] text-slate-500 font-mono-tabular mt-0.5">
              Max DD: -{simulation.maxDrawdownPercent.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Visual Step-by-Step Bankroll Progression Chart */}
        {simulation.steps.length > 0 && (
          <div className="p-5 sm:p-6 border-b border-[#DCD8CE]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="text-xs font-mono-tabular font-semibold text-[#11161D]">
                Chronological Bankroll Growth Curve ({simulation.startingBankroll.toFixed(2)}
                {sym} → {simulation.currentBankroll.toFixed(2)}
                {sym})
              </div>
              <div className="text-xs text-slate-500 font-mono-tabular">
                {wins}W – {losses}L ({pushes}P) · Total Staked:{' '}
                {simulation.totalStakedCurrency.toFixed(2)}
                {sym}
              </div>
            </div>

            {/* Step Bar Progression */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2 items-end pt-2">
              {/* Step 0: Starting Bankroll */}
              <div className="bg-[#FAF9F5] border border-[#DCD8CE] p-2.5 flex flex-col justify-between">
                <div className="text-[11px] text-slate-500 font-mono-tabular">Start</div>
                <div className="my-2 h-16 flex items-end">
                  <div
                    className="w-full bg-[#0B1118]"
                    style={{
                      height: `${Math.max(
                        18,
                        Math.min(
                          100,
                          ((simulation.startingBankroll - minBalance) /
                            Math.max(1, maxBalance - minBalance)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
                <div className="text-xs font-mono-tabular font-semibold text-[#11161D]">
                  {simulation.startingBankroll.toFixed(2)}
                  {sym}
                </div>
                <div className="text-[10px] text-slate-400 truncate">Initial Capital</div>
              </div>

              {/* Chronological Pick Steps */}
              {simulation.steps.slice(-8).map((step) => {
                const heightPct = Math.max(
                  18,
                  Math.min(
                    100,
                    ((step.bankrollAfter - minBalance) /
                      Math.max(1, maxBalance - minBalance)) *
                      100
                  )
                );
                const isWin = step.outcome === 'WON';
                const isLoss = step.outcome === 'LOST';

                return (
                  <div
                    key={step.resultId}
                    className="bg-[#FAF9F5] border border-[#DCD8CE] p-2.5 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono-tabular">
                      <span className="text-slate-500">Pick #{step.stepNumber}</span>
                      <span
                        className={`font-semibold ${
                          isWin
                            ? 'text-[#0D5C3A]'
                            : isLoss
                            ? 'text-[#C2492A]'
                            : 'text-slate-500'
                        }`}
                      >
                        {step.profitCurrency > 0 ? '+' : ''}
                        {step.profitCurrency.toFixed(2)}
                        {sym}
                      </span>
                    </div>

                    <div className="my-2 h-16 flex items-end">
                      <div
                        className={`w-full transition-all ${
                          isWin
                            ? 'bg-[#0D5C3A]'
                            : isLoss
                            ? 'bg-[#C2492A]'
                            : 'bg-slate-400'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>

                    <div className="text-xs font-mono-tabular font-semibold text-[#11161D]">
                      {step.bankrollAfter.toFixed(2)}
                      {sym}
                    </div>
                    <div
                      className="text-[10px] text-slate-500 truncate"
                      title={`${step.selection} (@${step.decimalOdds.toFixed(2)})`}
                    >
                      {step.selection.replace(' Moneyline', '')} @{step.decimalOdds.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Next Pick Actionable Bankroll Projection Bar */}
        {nextTargetPick && nextTargetPick.decimalOdds && (
          <div className="px-5 py-4 bg-[#FAF9F5] flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <div className="font-semibold text-[#11161D]">
                Grow Your Bankroll with Today’s Recommended Pick:{' '}
                <span className="text-[#0D5C3A]">
                  {nextTargetPick.selection} (@{nextTargetPick.decimalOdds.toFixed(2)})
                </span>
              </div>
              <div className="text-slate-600 font-mono-tabular">
                Recommended Stake:{' '}
                <strong className="text-[#11161D]">
                  {nextPickStake.toFixed(2)}
                  {sym}
                </strong>{' '}
                · If Won: Bankroll grows to{' '}
                <strong className="text-[#0D5C3A]">
                  {(simulation.currentBankroll + nextPickWinProfit).toFixed(2)}
                  {sym} (+{nextPickWinProfit.toFixed(2)}
                  {sym})
                </strong>{' '}
                · If Lost: Bankroll becomes{' '}
                <span className="text-slate-700">
                  {Math.max(0, simulation.currentBankroll - nextPickStake).toFixed(2)}
                  {sym}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 font-mono-tabular">
              {pendingResults.length > 0 && (
                <span className="text-slate-500">
                  Pending Stake: {simulation.pendingExposureCurrency.toFixed(2)}
                  {sym} (Proj:{' '}
                  {simulation.potentialBankrollIfPendingWin.toFixed(2)}
                  {sym})
                </span>
              )}
              <button
                type="button"
                onClick={() => onRecordCandidatePick(nextTargetPick)}
                disabled={isNextTargetRecorded || recordingPick}
                className={`px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  isNextTargetRecorded
                    ? 'bg-white text-slate-500 border border-[#DCD8CE] cursor-default'
                    : 'bg-[#0B1118] text-[#D4A853] hover:bg-[#18222F]'
                }`}
              >
                {isNextTargetRecorded
                  ? '✓ Pick Staked in Results Below'
                  : `Stake ${nextPickStake.toFixed(2)}${sym} on ${nextTargetPick.selection}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* APP WINNING & LOSING RATE EVALUATION (HIT RATE vs. LOSS RATE AUDIT)    */}
      {/* ===================================================================== */}
      <div className="dossier-card mb-6">
        {/* Architectural Obsidian Header Strip */}
        <div className="bg-[#0B1118] text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-mono-tabular text-[#D4A853]">
              Quantitative Pick Accuracy & Win / Loss Rate Evaluation
            </div>
            <div className="text-lg font-display text-white mt-0.5">
              Settled Winning Rate % vs. Losing Rate % & Calibration Audit
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono-tabular text-xs text-slate-300 shrink-0">
            <span>
              Grade: <strong className="text-[#D4A853]">{accuracy.gradeLabel}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-white">{accuracy.currentStreakText}</span>
          </div>
        </div>

        {/* Visual Win % vs. Loss % Split Bar */}
        <div className="p-5 border-b border-[#DCD8CE]">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-mono-tabular font-semibold text-[#0D5C3A]">
                Winning Rate
              </span>
              <span className="text-2xl sm:text-3xl font-mono-tabular font-bold text-[#0D5C3A]">
                {accuracy.winningRatePercent.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500 font-mono-tabular">
                ({accuracy.wins} Won / {accuracy.totalDecided} Decided)
              </span>
            </div>

            <div className="text-xs font-mono-tabular text-slate-600">
              Required Break-Even Win Rate (@{accuracy.averageOdds.toFixed(2)} avg odds):{' '}
              <strong className="text-[#11161D]">
                {accuracy.breakEvenWinRatePercent.toFixed(1)}%
              </strong>{' '}
              (
              <span
                className={
                  accuracy.edgeOverBreakEvenPercent >= 0
                    ? 'text-[#0D5C3A] font-bold'
                    : 'text-[#C2492A] font-bold'
                }
              >
                {accuracy.edgeOverBreakEvenPercent >= 0 ? '+' : ''}
                {accuracy.edgeOverBreakEvenPercent.toFixed(1)}% vs. Break-Even
              </span>
              )
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-xs text-slate-500 font-mono-tabular">
                ({accuracy.losses} Lost / {accuracy.totalDecided} Decided)
              </span>
              <span className="text-2xl sm:text-3xl font-mono-tabular font-bold text-[#C2492A]">
                {accuracy.losingRatePercent.toFixed(1)}%
              </span>
              <span className="text-xs font-mono-tabular font-semibold text-[#C2492A]">
                Losing Rate
              </span>
            </div>
          </div>

          {/* Dual Progress Bar */}
          <div className="w-full h-3 bg-[#EAE7DF] flex overflow-hidden">
            <div
              className="bg-[#0D5C3A] h-full transition-all duration-300"
              style={{
                width: `${accuracy.totalDecided > 0 ? accuracy.winningRatePercent : 50}%`,
              }}
              title={`Winning Rate: ${accuracy.winningRatePercent.toFixed(1)}%`}
            />
            <div
              className="bg-[#C2492A] h-full transition-all duration-300"
              style={{
                width: `${accuracy.totalDecided > 0 ? accuracy.losingRatePercent : 50}%`,
              }}
              title={`Losing Rate: ${accuracy.losingRatePercent.toFixed(1)}%`}
            />
          </div>

          {/* Last 10 Settled Picks Sequence Strip */}
          {accuracy.lastTenSequence.length > 0 && (
            <div className="mt-3.5 pt-3 border-t border-[#EAE7DF] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-500 font-medium mr-1">
                  Recent Settled Sequence (Oldest → Newest):
                </span>
                {accuracy.lastTenSequence.map((item) => (
                  <span
                    key={item.id}
                    title={`${item.selection} (@${item.odds.toFixed(2)}) — ${item.outcome}`}
                    className={`w-6 h-6 inline-flex items-center justify-center font-mono-tabular font-bold text-[11px] text-white ${
                      item.outcome === 'WON' ? 'bg-[#0D5C3A]' : 'bg-[#C2492A]'
                    }`}
                  >
                    {item.outcome === 'WON' ? 'W' : 'L'}
                  </span>
                ))}
              </div>
              <div className="font-mono-tabular text-slate-500">
                Model Expected Win Rate:{' '}
                <strong className="text-[#11161D]">
                  {accuracy.expectedWinRatePercent.toFixed(1)}%
                </strong>{' '}
                · Actual:{' '}
                <strong className="text-[#0D5C3A]">
                  {accuracy.winningRatePercent.toFixed(1)}%
                </strong>{' '}
                ({accuracy.calibrationDeltaPercent >= 0 ? '+' : ''}
                {accuracy.calibrationDeltaPercent.toFixed(1)}% Calibration)
              </div>
            </div>
          )}
        </div>

        {/* 4-Column Category Win% / Loss% Splits */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px dossier-grid-hairline border-b border-[#DCD8CE] text-xs">
          {[
            accuracy.splits.preMatch,
            accuracy.splits.inPlay,
            accuracy.splits.shortOdds,
            accuracy.splits.valueOdds,
          ].map((sp) => (
            <div key={sp.label} className="bg-[#FAF9F5] p-4">
              <div className="font-semibold text-[#11161D]">{sp.label}</div>
              <div className="mt-1.5 flex items-baseline justify-between font-mono-tabular">
                <div>
                  <span className="text-base font-bold text-[#0D5C3A]">
                    {sp.winRatePercent.toFixed(1)}% W
                  </span>
                  <span className="text-slate-400 mx-1">/</span>
                  <span className="text-xs font-semibold text-[#C2492A]">
                    {sp.lossRatePercent.toFixed(1)}% L
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  ({sp.wins}W–{sp.losses}L)
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#EAE7DF] flex overflow-hidden mt-2">
                <div
                  className="bg-[#0D5C3A] h-full"
                  style={{ width: `${sp.total > 0 ? sp.winRatePercent : 50}%` }}
                />
                <div
                  className="bg-[#C2492A] h-full"
                  style={{ width: `${sp.total > 0 ? sp.lossRatePercent : 50}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Profitability Audit Status Footer */}
        <div className="px-5 py-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-semibold text-[#11161D]">Profitability Audit Status: </span>
            {settledResults.length === 0 ? (
              <span className="text-slate-600">
                No settled picks recorded yet (0 settled, {pendingResults.length} pending). Profitability cannot be claimed until tracked picks settle.
              </span>
            ) : isVerifiedProfitable ? (
              <span className="text-[#0D5C3A] font-medium">
                Tracked record is profitable (+{netProfitUnits.toFixed(2)}u / +
                {simulation.netProfitCurrency.toFixed(2)}
                {sym} net profit across {settledResults.length} settled picks).
              </span>
            ) : (
              <span className="text-[#C2492A] font-medium">
                Tracked record is not currently profitable ({netProfitUnits > 0 ? '+' : ''}
                {netProfitUnits.toFixed(2)}u across {settledResults.length} settled picks).
              </span>
            )}
          </div>
          <div className="font-mono-tabular text-slate-500 shrink-0">
            Unit Yield / ROI: {actualRoiPercent > 0 ? '+' : ''}
            {actualRoiPercent.toFixed(2)}% · Brier Score: {accuracy.brierScore}
          </div>
        </div>
      </div>

      {/* Optional Interactive EV & ROI Calculator */}
      {showCalculator && (
        <div className="dossier-card p-6 mb-6">
          <h3 className="text-lg font-display text-[#11161D] mb-1">
            Interactive Expected Value (EV) & Break-Even ROI Calculator
          </h3>
          <p className="text-xs text-slate-600 mb-4">
            Test any market decimal odds against your estimated win probability to verify whether a pick offers genuine positive expected value before staking.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-mono-tabular text-slate-600 mb-1">
                Bookmaker Decimal Odds
              </label>
              <input
                type="number"
                step="0.01"
                min="1.01"
                value={calcOdds}
                onChange={(e) => setCalcOdds(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#C7C2B6] bg-[#FAF9F5] font-mono-tabular focus:outline-none focus:border-[#11161D]"
              />
            </div>
            <div>
              <label className="block text-xs font-mono-tabular text-slate-600 mb-1">
                Estimated Win Probability (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="99"
                value={calcEstProb}
                onChange={(e) => setCalcEstProb(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#C7C2B6] bg-[#FAF9F5] font-mono-tabular focus:outline-none focus:border-[#11161D]"
              />
            </div>
            <div>
              <label className="block text-xs font-mono-tabular text-slate-600 mb-1">
                Hypothetical Stake ({sym})
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={calcStake}
                onChange={(e) => setCalcStake(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#C7C2B6] bg-[#FAF9F5] font-mono-tabular focus:outline-none focus:border-[#11161D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px dossier-grid-hairline text-xs font-mono-tabular">
            <div className="bg-[#FAF9F5] p-3">
              <span className="text-slate-500 block font-sans">Break-Even Implied Prob.</span>
              <span className="text-sm font-semibold text-[#11161D] mt-0.5 block">
                {calcImplied.toFixed(1)}%
              </span>
            </div>
            <div className="bg-[#FAF9F5] p-3">
              <span className="text-slate-500 block font-sans">Probability Edge</span>
              <span
                className={`text-sm font-semibold mt-0.5 block ${
                  parsedCalcProb - calcImplied >= 1.5 ? 'text-[#0D5C3A]' : 'text-[#11161D]'
                }`}
              >
                {parsedCalcProb - calcImplied > 0 ? '+' : ''}
                {(parsedCalcProb - calcImplied).toFixed(1)}%
              </span>
            </div>
            <div className="bg-[#FAF9F5] p-3">
              <span className="text-slate-500 block font-sans">Expected Value (EV %)</span>
              <span
                className={`text-sm font-semibold mt-0.5 block ${
                  calcEvPercent >= 2.0
                    ? 'text-[#0D5C3A]'
                    : calcEvPercent < 0
                    ? 'text-[#C2492A]'
                    : 'text-[#11161D]'
                }`}
              >
                {calcEvPercent > 0 ? '+' : ''}
                {calcEvPercent.toFixed(2)}%
              </span>
            </div>
            <div className="bg-[#FAF9F5] p-3">
              <span className="text-slate-500 block font-sans">Expected Return per Stake</span>
              <span
                className={`text-sm font-semibold mt-0.5 block ${
                  calcExpectedProfit > 0 ? 'text-[#0D5C3A]' : 'text-[#C2492A]'
                }`}
              >
                {calcExpectedProfit > 0 ? '+' : ''}
                {calcExpectedProfit.toFixed(2)}
                {sym}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Manual Pick Logging Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="dossier-card p-6 mb-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#DCD8CE] pb-3">
            <h3 className="text-lg font-display text-[#11161D]">
              Log a Pick into Bankroll Simulator & Results Ledger
            </h3>
            <span className="text-xs text-slate-500 font-mono-tabular">
              All logged picks automatically calculate {sym} stake and bankroll impact.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono-tabular text-slate-600 mb-1">
                Match (Player A vs. Player B) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Carlos Alcaraz vs. Daniil Medvedev"
                value={match}
                onChange={(e) => setMatch(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#C7C2B6] bg-[#FAF9F5] focus:outline-none focus:border-[#11161D]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono-tabular text-slate-600 mb-1">
                Tournament
              </label>
              <input
                type="text"
                placeholder="e.g. ATP China Open"
                value={tournament}
                onChange={(e) => setTournament(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#C7C2B6] bg-[#FAF9F5] focus:outline-none focus:border-[#11161D]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-mono-tabular text-slate-600 mb-1">
                  Surface
                </label>
                <select
                  value={surface}
                  onChange={(e) => setSurface(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#C7C2B6] bg-[#FAF9F5] focus:outline-none focus:border-[#11161D]"
                >
                  <option value="Hard">Hard</option>
                  <option value="Clay">Clay</option>
                  <option value="Grass">Grass</option>
                  <option value="Indoor Hard">Indoor Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono-tabular text-slate-600 mb-1">
                  Timing
                </label>
                <select
                  value={matchStatusAtPick}
                  onChange={(e) =>
                    setMatchStatusAtPick(e.target.value as 'PRE_MATCH' | 'IN_PROGRESS')
                  }
                  className="w-full px-3 py-2 text-sm border border-[#C7C2B6] bg-[#FAF9F5] focus:outline-none focus:border-[#11161D]"
                >
                  <option value="PRE_MATCH">Pre-Match</option>
                  <option value="IN_PROGRESS">In Progress</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-mono-tabular text-slate-600 mb-1">
                Selection *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Alcaraz Moneyline"
                value={selection}
                onChange={(e) => setSelection(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#C7C2B6] bg-[#FAF9F5] focus:outline-none focus:border-[#11161D]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono-tabular text-slate-600 mb-1">
                Market
              </label>
              <input
                type="text"
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#C7C2B6] bg-[#FAF9F5] focus:outline-none focus:border-[#11161D]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono-tabular text-slate-600 mb-1">
                Decimal Odds *
              </label>
              <input
                type="number"
                step="0.01"
                min="1.01"
                required
                value={decimalOdds}
                onChange={(e) => setDecimalOdds(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#C7C2B6] bg-[#FAF9F5] font-mono-tabular focus:outline-none focus:border-[#11161D]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono-tabular text-slate-600 mb-1">
                Estimated Win Prob (%) *
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="99"
                required
                value={estimatedProbability}
                onChange={(e) => setEstimatedProbability(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#C7C2B6] bg-[#FAF9F5] font-mono-tabular focus:outline-none focus:border-[#11161D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-mono-tabular text-slate-600 mb-1">
                Stake Multiplier (Units)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={stakeUnits}
                onChange={(e) => setStakeUnits(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#C7C2B6] bg-[#FAF9F5] font-mono-tabular focus:outline-none focus:border-[#11161D]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono-tabular text-slate-600 mb-1">
                Initial Outcome Status
              </label>
              <select
                value={outcome}
                onChange={(e) =>
                  setOutcome(e.target.value as 'PENDING' | 'WON' | 'LOST' | 'PUSH')
                }
                className="w-full px-3 py-2 text-sm border border-[#C7C2B6] bg-[#FAF9F5] focus:outline-none focus:border-[#11161D]"
              >
                <option value="PENDING">Pending (Unsettled)</option>
                <option value="WON">Won</option>
                <option value="LOST">Lost</option>
                <option value="PUSH">Push / Void</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono-tabular text-slate-600 mb-1">
                Final Score (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 6-4, 6-3"
                value={finalScore}
                onChange={(e) => setFinalScore(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#C7C2B6] bg-[#FAF9F5] font-mono-tabular focus:outline-none focus:border-[#11161D]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 font-mono-tabular">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-[#11161D] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-[#0B1118] text-[#D4A853] hover:bg-[#18222F] cursor-pointer"
            >
              Save Pick to Simulator & Ledger
            </button>
          </div>
        </form>
      )}

      {verifyMessage && (
        <div className="mb-4 px-4 py-3 bg-[#FAF9F5] border border-[#DCD8CE] text-xs text-[#11161D] font-mono-tabular flex items-center justify-between">
          <span>{verifyMessage}</span>
          <button
            type="button"
            onClick={() => setVerifyMessage(null)}
            className="text-slate-500 hover:text-[#11161D] underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1 p-1 bg-[#EAE7DF] border border-[#DCD8CE] font-mono-tabular self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterOutcome('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              filterOutcome === 'ALL'
                ? 'bg-[#0B1118] text-[#D4A853]'
                : 'text-slate-700 hover:text-[#11161D]'
            }`}
          >
            All Tracked ({results.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterOutcome('SETTLED')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              filterOutcome === 'SETTLED'
                ? 'bg-[#0B1118] text-[#D4A853]'
                : 'text-slate-700 hover:text-[#11161D]'
            }`}
          >
            Settled ({settledResults.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterOutcome('PENDING')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              filterOutcome === 'PENDING'
                ? 'bg-[#0B1118] text-[#D4A853]'
                : 'text-slate-700 hover:text-[#11161D]'
            }`}
          >
            Pending ({pendingResults.length})
          </button>
        </div>

        <div className="text-xs text-slate-600 font-mono-tabular">
          Showing simulated stakes & running balance from{' '}
          <strong className="text-[#11161D]">
            {simulation.startingBankroll.toFixed(2)}
            {sym}
          </strong>{' '}
          starting bankroll
        </div>
      </div>

      {/* Results History & Simulated Bankroll Ledger Table */}
      {filteredList.length === 0 ? (
        <div className="dossier-card p-8 text-center">
          <p className="text-sm font-medium text-[#11161D]">
            No tracked picks in this view yet.
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
            Click "Stake in Simulator" on Today’s Final Pick or Live Pronostics to track picks and grow your simulated bankroll over time.
          </p>
        </div>
      ) : (
        <div className="dossier-card divide-y divide-[#DCD8CE]">
          <div className="hidden lg:grid lg:grid-cols-12 gap-3 px-6 py-3 bg-[#FAF9F5] text-[11px] font-mono-tabular font-semibold text-slate-500">
            <div className="col-span-3">Date & Match</div>
            <div className="col-span-2">Selection</div>
            <div className="col-span-1 text-right">Odds / EV</div>
            <div className="col-span-1 text-right">Sim. Stake</div>
            <div className="col-span-1 text-right">Net Profit</div>
            <div className="col-span-1 text-right">Bankroll</div>
            <div className="col-span-3 text-right">Outcome & Verification</div>
          </div>

          {filteredList.map((item) => {
            const sim = simulation.byResultId.get(item.id);
            const stakeCurr = sim ? sim.stakeCurrency : 0;
            const profitCurr = sim ? sim.profitCurrency : 0;
            const potentialCurr = sim ? sim.potentialProfitCurrency : 0;
            const balanceAfter = sim ? sim.bankrollAfter : simulation.currentBankroll;

            return (
              <div
                key={item.id}
                className="p-4 sm:px-6 sm:py-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center text-xs sm:text-sm hover:bg-[#FAF9F5]/60 transition-colors"
              >
                <div className="lg:col-span-3">
                  <div className="text-xs text-slate-500 font-mono-tabular">
                    {sim?.stepNumber ? `#${sim.stepNumber} · ` : ''}
                    {item.date} · {item.tournament} ·{' '}
                    {item.matchStatusAtPick === 'IN_PROGRESS' ? 'In-Play' : 'Pre-Match'}
                  </div>
                  <div className="font-semibold text-[#11161D] mt-0.5">{item.match}</div>
                  {item.finalScore && (
                    <div className="text-xs text-slate-500 font-mono-tabular mt-0.5">
                      Final: {item.finalScore}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-2">
                  <div className="font-medium text-[#11161D]">{item.selection}</div>
                  <div className="text-xs text-slate-500">
                    {item.market} · {item.surface}
                  </div>
                </div>

                <div className="lg:col-span-1 lg:text-right font-mono-tabular text-xs">
                  <div className="font-semibold text-[#11161D] text-sm">
                    {item.decimalOdds.toFixed(2)}
                  </div>
                  <div className="text-[#0D5C3A]">
                    {item.expectedValuePercent > 0 ? '+' : ''}
                    {item.expectedValuePercent.toFixed(1)}% EV
                  </div>
                </div>

                <div className="lg:col-span-1 lg:text-right font-mono-tabular">
                  <span className="lg:hidden text-xs text-slate-400 mr-1">Sim Stake:</span>
                  <div className="font-semibold text-[#11161D]">
                    {stakeCurr.toFixed(2)}
                    {sym}
                  </div>
                  <div className="text-[11px] text-slate-400">{item.stakeUnits.toFixed(1)}u</div>
                </div>

                <div
                  className={`lg:col-span-1 lg:text-right font-mono-tabular font-semibold ${
                    item.outcome === 'WON'
                      ? 'text-[#0D5C3A]'
                      : item.outcome === 'LOST'
                      ? 'text-[#C2492A]'
                      : 'text-slate-600'
                  }`}
                >
                  <span className="lg:hidden text-xs text-slate-400 mr-1">Net P/L:</span>
                  {item.outcome === 'PENDING' ? (
                    <div>
                      <div className="text-xs text-[#11161D]">Pending</div>
                      <div className="text-[11px] text-[#0D5C3A] font-normal">
                        Win: +{potentialCurr.toFixed(2)}
                        {sym}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div>
                        {profitCurr > 0 ? '+' : ''}
                        {profitCurr.toFixed(2)}
                        {sym}
                      </div>
                      <div className="text-[11px] font-normal text-slate-400">
                        {item.profitUnits > 0 ? '+' : ''}
                        {item.profitUnits.toFixed(2)}u
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-1 lg:text-right font-mono-tabular">
                  <span className="lg:hidden text-xs text-slate-400 mr-1">Bankroll:</span>
                  <div className="font-semibold text-[#11161D]">
                    {balanceAfter.toFixed(2)}
                    {sym}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {item.outcome === 'PENDING' ? 'If Won' : 'Balance'}
                  </div>
                </div>

                <div className="lg:col-span-3 flex flex-wrap items-center lg:justify-end gap-2 font-mono-tabular">
                  <select
                    aria-label="Settle outcome"
                    value={item.outcome}
                    onChange={(e) =>
                      onUpdateOutcome(
                        item.id,
                        e.target.value as 'WON' | 'LOST' | 'PUSH' | 'PENDING'
                      )
                    }
                    className="px-2.5 py-1 text-xs font-semibold border border-[#C7C2B6] bg-[#FAF9F5] text-[#11161D] focus:outline-none cursor-pointer"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="WON">Won</option>
                    <option value="LOST">Lost</option>
                    <option value="PUSH">Push / Void</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleVerifyClick(item.id)}
                    disabled={verifyingId === item.id}
                    title="Verify official match result"
                    className="px-2.5 py-1 text-xs font-semibold bg-[#FAF9F5] border border-[#DCD8CE] hover:border-[#11161D] text-[#11161D] whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    {verifyingId === item.id ? 'Checking...' : 'Auto-Verify'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteResult(item.id)}
                    title="Delete entry"
                    className="px-2 py-1 text-xs text-slate-400 hover:text-[#C2492A] cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </section>
  );
};
