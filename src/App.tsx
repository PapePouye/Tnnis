/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import type {
  BankrollSimulatorConfig,
  BetSlipLeg,
  CandidatePick,
  DailyResearchReport,
  TrackedResult,
} from './types';
import { FinalPickSection } from './components/FinalPickSection';
import { ValueBetScannerSection } from './components/ValueBetScannerSection';
import { TodayOddsBoardSection } from './components/TodayOddsBoardSection';
import { DailyCombinesSection } from './components/DailyCombinesSection';
import { OtherPicksSection } from './components/OtherPicksSection';
import { LiveScoreboardSection } from './components/LiveScoreboardSection';
import { BacktestingSection } from './components/BacktestingSection';
import { PredictionTrackerSection } from './components/PredictionTrackerSection';
import { PlayerStatsDatabaseSection } from './components/PlayerStatsDatabaseSection';
import { MatchAnalysisModal } from './components/MatchAnalysisModal';
import { PlayerMatchupAnalyzer } from './components/PlayerMatchupAnalyzer';
import { SourcesSection } from './components/SourcesSection';
import { PastResultsSection } from './components/PastResultsSection';
import { SetupGuideModal } from './components/SetupGuideModal';
import { ActiveBetSlipDock } from './components/ActiveBetSlipDock';
import { BudgetMultiplierAdvisorChat } from './components/BudgetMultiplierAdvisorChat';
import {
  evaluatePickAccuracy,
  simulateBankrollGrowth,
} from './utils/bankroll';

const BANKROLL_STORAGE_KEY = 'courtedge_bankroll_config_v1';
const BETSLIP_STORAGE_KEY = 'courtedge_active_betslip_v1';

const DEFAULT_BANKROLL_CONFIG: BankrollSimulatorConfig = {
  startingBankroll: 100,
  currency: '€',
  unitPercent: 5,
  strategy: 'COMPOUND_PERCENT',
};

type StationTab =
  | 'ALL'
  | 'PICKS'
  | 'VALUE_SCANNER'
  | 'COMBINES'
  | 'ODDS'
  | 'LIVE'
  | 'BACKTEST'
  | 'TRACKER'
  | 'PLAYERS'
  | 'ADVISOR'
  | 'BANKROLL';

export default function App() {
  const [report, setReport] = useState<DailyResearchReport | null>(null);
  const [results, setResults] = useState<TrackedResult[]>([]);
  const [loadingReport, setLoadingReport] = useState<boolean>(true);
  const [refreshingScoreboard, setRefreshingScoreboard] = useState<boolean>(false);
  const [recordingPick, setRecordingPick] = useState<boolean>(false);
  const [fastSyncing, setFastSyncing] = useState<boolean>(false);
  const [fastAutoSync, setFastAutoSync] = useState<boolean>(true);
  const [settlingMatch, setSettlingMatch] = useState<boolean>(false);
  const [generatingNextPick, setGeneratingNextPick] = useState<boolean>(false);
  const [lastAutoSyncAt, setLastAutoSyncAt] = useState<string>(() => new Date().toISOString());
  const [syncCountdown, setSyncCountdown] = useState<number>(10);
  const [syncNotification, setSyncNotification] = useState<{ title: string; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [setupModalOpen, setSetupModalOpen] = useState<boolean>(false);
  const [advisorDrawerOpen, setAdvisorDrawerOpen] = useState<boolean>(false);
  const [activeStationTab, setActiveStationTab] = useState<StationTab>('ALL');
  const [oddsFormat, setOddsFormat] = useState<'DECIMAL' | 'AMERICAN'>('DECIMAL');
  const [selectedAnalysisMatch, setSelectedAnalysisMatch] = useState<string | null>(null);

  const [bankrollConfig, setBankrollConfig] = useState<BankrollSimulatorConfig>(() => {
    try {
      const saved = localStorage.getItem(BANKROLL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          startingBankroll: Number(parsed.startingBankroll) || 100,
          currency: ['€', '$', '£'].includes(parsed.currency) ? parsed.currency : '€',
          unitPercent: Number(parsed.unitPercent) || 5,
          strategy: ['FLAT_PERCENT', 'COMPOUND_PERCENT', 'QUARTER_KELLY'].includes(
            parsed.strategy
          )
            ? parsed.strategy
            : 'COMPOUND_PERCENT',
        };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_BANKROLL_CONFIG;
  });

  const [activeSlipLegs, setActiveSlipLegs] = useState<BetSlipLeg[]>(() => {
    try {
      const saved = localStorage.getItem(BETSLIP_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const handleUpdateBankrollConfig = (next: BankrollSimulatorConfig) => {
    setBankrollConfig(next);
    try {
      localStorage.setItem(BANKROLL_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const handleToggleSlipLeg = useCallback((leg: BetSlipLeg) => {
    setActiveSlipLegs((prev) => {
      const exists = prev.some((l) => l.id === leg.id || l.match === leg.match);
      const next = exists
        ? prev.filter((l) => l.id !== leg.id && l.match !== leg.match)
        : [...prev, leg];
      try {
        localStorage.setItem(BETSLIP_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const handleRemoveSlipLeg = useCallback((id: string) => {
    setActiveSlipLegs((prev) => {
      const next = prev.filter((l) => l.id !== id);
      try {
        localStorage.setItem(BETSLIP_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const handleClearSlip = useCallback(() => {
    setActiveSlipLegs([]);
    try {
      localStorage.removeItem(BETSLIP_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }, []);

  // Global hotkeys for professional rapid trading desk navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (e.target as HTMLElement)?.tagName || ''
        )
      ) {
        return;
      }

      if (e.key === '1') {
        setActiveStationTab('ODDS');
      } else if (e.key === '2') {
        setActiveStationTab('PICKS');
      } else if (e.key === '3') {
        setActiveStationTab('COMBINES');
      } else if (e.key === '4') {
        setActiveStationTab('LIVE');
      } else if (e.key === '5') {
        setActiveStationTab('BANKROLL');
      } else if (e.key === '0' || e.key.toLowerCase() === '`') {
        setActiveStationTab('ALL');
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setSetupModalOpen((prev) => !prev);
      } else if (e.key === 'Escape' && setupModalOpen) {
        setSetupModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setupModalOpen]);

  const fetchInitialData = useCallback(async () => {
    setLoadingReport(true);
    setErrorMsg(null);
    let lastError: any = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const [repRes, histRes] = await Promise.all([
          fetch('/api/report'),
          fetch('/api/results'),
        ]);

        if (histRes.ok) {
          const histData = await histRes.json().catch(() => []);
          setResults(Array.isArray(histData) ? histData : []);
        }

        if (!repRes.ok) {
          const errBody = await repRes.json().catch(() => ({}));
          throw new Error(
            errBody.error || `Research endpoint returned status ${repRes.status}`
          );
        }

        const repData: DailyResearchReport = await repRes.json();
        setReport(repData);
        setLoadingReport(false);
        return;
      } catch (err: any) {
        lastError = err;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }
      }
    }

    setErrorMsg(
      lastError?.message ||
        'Unable to complete live tennis prediction research. Check server logs or API key configuration.'
    );
    setLoadingReport(false);
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleRunLiveResearch = async (customQuery?: string) => {
    setLoadingReport(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customQuery ? { query: customQuery } : {}),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Research failed with HTTP ${res.status}`);
      }

      const freshReport: DailyResearchReport = await res.json();
      setReport(freshReport);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to execute live research scan.');
    } finally {
      setLoadingReport(false);
    }
  };

  const executeFastSync = useCallback(async (silent = false) => {
    if (!silent) setFastSyncing(true);
    try {
      const res = await fetch('/api/fast-sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLastAutoSyncAt(data.checkedAt || new Date().toISOString());
        setSyncCountdown(15);
        if (data.report) setReport(data.report);
        if (data.results) setResults(data.results);
        if (data.settledCount > 0 || (data.newlyCompleted && data.newlyCompleted.length > 0)) {
          const first = data.newlyCompleted?.[0];
          setSyncNotification({
            title: 'Auto-Detected Finished Game & Updated',
            message: first
              ? `${first.match} finished (${first.winner} won, ${first.score}). Automatically settled & promoted next active pick!`
              : `${data.settledCount} finished game(s) auto-detected and settled! Active picks & combines updated.`,
          });
        } else if (!silent) {
          setSyncNotification({
            title: 'Live Tour Check Complete',
            message: 'Verified ATP/WTA & Kambi scoreboards — all finished games are up to date.',
          });
        }
      }
    } catch {
      // Ignore transient network errors during background sync
    } finally {
      if (!silent) setFastSyncing(false);
    }
  }, []);

  const handleFinishMatch = async (match: string, winnerName: string, score?: string) => {
    setSettlingMatch(true);
    try {
      const res = await fetch('/api/finish-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match, winnerName, score }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.report) setReport(data.report);
        if (data.results) setResults(data.results);
        setSyncNotification({
          title: 'Game Finished & Settled',
          message: data.message || `Match settled: ${winnerName} won. Next pick promoted!`,
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || 'Failed to finish match.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error finishing match.');
    } finally {
      setSettlingMatch(false);
    }
  };

  const handleGenerateNextPick = async () => {
    setGeneratingNextPick(true);
    try {
      const res = await fetch('/api/generate-next-pick', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.report) setReport(data.report);
        const p = data.promotedPick;
        setSyncNotification({
          title: 'Fresh Daily Pick Activated',
          message: p
            ? `Now featuring: ${p.selection} (${p.match}) @ ${p.decimalOdds?.toFixed(2)}`
            : 'Promoted next positive-EV active match.',
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || 'Failed to generate next pick.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error generating next pick.');
    } finally {
      setGeneratingNextPick(false);
    }
  };

  // Background autonomous finished-game checker & live synchronization (every 15s with 1s countdown)
  useEffect(() => {
    if (!fastAutoSync) return;
    const ticker = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setSyncCountdown((prev) => {
        if (prev <= 1) {
          void executeFastSync(true).catch(() => {});
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(ticker);
  }, [fastAutoSync, executeFastSync]);

  // Auto-dismiss sync notification banner after 8s
  useEffect(() => {
    if (!syncNotification) return;
    const timer = setTimeout(() => {
      setSyncNotification(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [syncNotification]);

  const handleRefreshScoreboard = async () => {
    if (!report) return;
    setRefreshingScoreboard(true);
    try {
      await executeFastSync(false);
    } catch {
      // ignore transient error
    } finally {
      setRefreshingScoreboard(false);
    }
  };

  const handleRecordCandidatePick = async (
    pick: CandidatePick,
    unitMultiplier = 1.0
  ) => {
    if (!pick.decimalOdds) return;
    setRecordingPick(true);
    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: report?.date || new Date().toISOString().split('T')[0],
          match: pick.match,
          tournament: pick.tournament,
          surface: pick.surface,
          matchStatusAtPick:
            pick.matchStatus === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PRE_MATCH',
          market: pick.market,
          selection: pick.selection,
          decimalOdds: pick.decimalOdds,
          estimatedProbability: pick.estimatedProbability || 50,
          stakeUnits: unitMultiplier,
          outcome: 'PENDING',
          sourceUrls: pick.sourceUrls,
        }),
      });

      if (res.ok) {
        const created: TrackedResult = await res.json();
        setResults((prev) => [created, ...prev]);
      }
    } catch {
      // ignore transient error
    } finally {
      setRecordingPick(false);
    }
  };

  const handleAddManualResult = async (entry: Partial<TrackedResult>) => {
    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (res.ok) {
        const created: TrackedResult = await res.json();
        setResults((prev) => [created, ...prev]);
      }
    } catch {
      // ignore transient error
    }
  };

  const handleUpdateOutcome = async (
    id: string,
    outcome: 'WON' | 'LOST' | 'PUSH' | 'PENDING',
    finalScore?: string
  ) => {
    try {
      const res = await fetch(`/api/results/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, finalScore }),
      });
      if (res.ok) {
        const updated: TrackedResult = await res.json();
        setResults((prev) => prev.map((r) => (r.id === id ? updated : r)));
      }
    } catch {
      // ignore transient error
    }
  };

  const handleVerifyOutcome = async (id: string): Promise<string> => {
    try {
      const res = await fetch(`/api/results/${id}/verify`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        return data.error || 'Could not verify match outcome.';
      }
      if (data.updated && data.result) {
        setResults((prev) => prev.map((r) => (r.id === id ? data.result : r)));
      }
      return data.note || 'Verification check complete.';
    } catch {
      return 'Verification temporarily unavailable.';
    }
  };

  const handleVerifyAllPending = async (): Promise<string> => {
    try {
      const res = await fetch('/api/results/verify-all', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        return data.error || 'Could not batch-verify pending picks.';
      }
      if (Array.isArray(data.results)) {
        setResults(data.results);
      }
      return data.note || 'Batch verification complete.';
    } catch {
      return 'Batch verification temporarily unavailable.';
    }
  };

  const handleDeleteResult = async (id: string) => {
    try {
      const res = await fetch(`/api/results/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setResults((prev) => prev.filter((r) => r.id !== id));
      }
    } catch {
      // ignore transient error
    }
  };

  const recordedMatchesSet = new Set(results.map((r) => r.match));
  const bankrollSummary = simulateBankrollGrowth(results, bankrollConfig);
  const pickAccuracy = evaluatePickAccuracy(results);
  const sym = bankrollConfig.currency;

  const navigateStation = (tab: StationTab, anchorId?: string) => {
    setActiveStationTab(tab);
    if (anchorId) {
      setTimeout(() => {
        const el = document.getElementById(anchorId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#0F172A] pb-16 md:pb-0">
      {/* =================================================================== */}
      {/* STRICT 3-ZONE TOP BAR CONTRACT                                      */}
      {/* [Brand Wordmark] — [5 Single-Line Nav Links] — [1 Primary Action]   */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-40 bg-[#0B1118] text-white border-b border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-8">
          {/* Zone 1: Single-Element Editorial Serif Wordmark */}
          <a
            href="#todays-pick"
            onClick={() => setActiveStationTab('ALL')}
            className="text-2xl sm:text-3xl font-display font-semibold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-[#D4A853] transition-colors"
          >
            CourtEdge
          </a>

          {/* Zone 2: Professional Analytics Desk Navigation Links */}
          <nav className="hidden md:flex items-center gap-5 text-xs font-mono-tabular font-medium text-slate-300">
            <button
              type="button"
              onClick={() => navigateStation('PICKS', 'todays-pick')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStationTab === 'PICKS' ? 'text-[#D4A853] font-bold' : ''
              }`}
            >
              Daily Pick
            </button>
            <button
              type="button"
              onClick={() => navigateStation('VALUE_SCANNER', 'value-scanner-station')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStationTab === 'VALUE_SCANNER' ? 'text-[#D4A853] font-bold' : ''
              }`}
            >
              Value Scanner
            </button>
            <button
              type="button"
              onClick={() => navigateStation('COMBINES', 'daily-combines')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStationTab === 'COMBINES' ? 'text-[#D4A853] font-bold' : ''
              }`}
            >
              100x Combines
            </button>
            <button
              type="button"
              onClick={() => navigateStation('ODDS', 'odds-station')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStationTab === 'ODDS' ? 'text-[#D4A853] font-bold' : ''
              }`}
            >
              Odds Slate
            </button>
            <button
              type="button"
              onClick={() => navigateStation('LIVE', 'live-matches')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStationTab === 'LIVE' ? 'text-[#34D399] font-bold' : ''
              }`}
            >
              Live Desk
            </button>
            <button
              type="button"
              onClick={() => navigateStation('BACKTEST', 'backtest-station')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStationTab === 'BACKTEST' ? 'text-[#D4A853] font-bold' : ''
              }`}
            >
              Backtest
            </button>
            <button
              type="button"
              onClick={() => navigateStation('TRACKER', 'prediction-tracker-station')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStationTab === 'TRACKER' ? 'text-[#D4A853] font-bold' : ''
              }`}
            >
              Ledger
            </button>
            <button
              type="button"
              onClick={() => navigateStation('PLAYERS', 'player-stats-station')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStationTab === 'PLAYERS' ? 'text-[#D4A853] font-bold' : ''
              }`}
            >
              Player Elo
            </button>
            <button
              type="button"
              onClick={() => navigateStation('BANKROLL', 'past-results')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStationTab === 'BANKROLL' ? 'text-[#D4A853] font-bold' : ''
              }`}
            >
              Bankroll
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleRunLiveResearch()}
              disabled={loadingReport}
              className="px-4 py-2 text-xs font-semibold tracking-wide text-[#0B1118] bg-[#D4A853] hover:bg-[#E2B964] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {loadingReport ? 'Scanning Markets...' : 'Scan Live Odds'}
            </button>
          </div>
        </div>
      </header>

      {/* =================================================================== */}
      {/* EDITORIAL HERO DESK: TITLE, WORKSPACE CONTROLS & KPI LEDGER         */}
      {/* =================================================================== */}
      <section className="bg-[#0B1118] text-white border-b border-[#1E293B] pt-8 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-7 border-b border-[#1E293B]">
            <div className="max-w-3xl">
              {/* Unboxed Editorial Kicker (Zero Pills, Zero Decorative Dots) */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular tracking-wide text-[#D4A853]">
                <span>Quantitative Tennis Research Desk</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-[#34D399] font-semibold">≥90.0% Sure Safe-Bet Gate</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <a
                  href="https://tennis-predictions.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 hover:text-white underline underline-offset-4"
                >
                  Tennis-Predictions.com Verified ↗
                </a>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={() => setFastAutoSync((prev) => !prev)}
                  className="text-slate-300 hover:text-white underline underline-offset-4 cursor-pointer"
                >
                  {fastAutoSync
                    ? `Auto-Settle Active (${syncCountdown}s)`
                    : 'Auto-Settle Paused (Resume)'}
                </button>
              </div>

              <h1
                className="text-3xl sm:text-5xl font-display font-semibold text-white tracking-tight mt-3 leading-[1.1]"
                style={{ textWrap: 'balance' }}
              >
                Daily Tennis Value Dossier & Direct Bet365 Slip Builder
              </h1>

              <p className="text-sm sm:text-base text-slate-300 mt-3 max-w-2xl leading-relaxed tracking-wide">
                Engineered for high-certainty tennis pronostics using 5-Pillar Safe-Bet Synthesis — combining Moneyline Locks, <span className="text-[#D4A853] font-mono-tabular">+1.5 Sets</span> Handicap Cushions, and <span className="text-[#D4A853] font-mono-tabular">+3.5 Games</span> Spreads with instant Bet365 market translation.
              </p>

              {/* Workspace Secondary Action Toolbar (Below the Hero Headline) */}
              <div className="flex flex-wrap items-center gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => executeFastSync(false)}
                  disabled={fastSyncing}
                  className="px-3.5 py-2 text-xs font-mono-tabular font-medium text-slate-200 bg-[#131C28] border border-[#263548] hover:border-[#34D399] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  title="Autonomous finished-game detector: checks ATP/WTA & Kambi feeds and updates picks automatically"
                >
                  {fastSyncing
                    ? 'Checking Finished Games...'
                    : fastAutoSync
                    ? `Verify Finished Games (${syncCountdown}s)`
                    : 'Verify Finished Games'}
                </button>

                <button
                  type="button"
                  onClick={() => setAdvisorDrawerOpen(true)}
                  className="px-3.5 py-2 text-xs font-mono-tabular font-medium text-[#D4A853] bg-[#131C28] border border-[#D4A853]/40 hover:border-[#D4A853] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  5{sym} → 50{sym} Pick Advisor
                </button>

                <button
                  type="button"
                  onClick={() => setSetupModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-mono-tabular font-medium text-slate-300 bg-[#131C28] border border-[#263548] hover:border-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Data Feeds & API Status
                </button>
              </div>
            </div>

            {/* Desk Quantitative Ledger Strip */}
            <div className="grid grid-cols-3 gap-px bg-[#1E293B] border border-[#1E293B] font-mono-tabular shrink-0 w-full lg:w-auto">
              <div className="p-4 bg-[#111924]">
                <div className="text-[11px] text-slate-400">Verified Win Rate</div>
                <div className="text-xl sm:text-2xl font-bold text-[#34D399] mt-1 tabular-nums">
                  {pickAccuracy.winningRatePercent.toFixed(1)}%
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                  {pickAccuracy.wins}W – {pickAccuracy.losses}L settled
                </div>
              </div>

              <div className="p-4 bg-[#111924]">
                <div className="text-[11px] text-slate-400">Simulated Bankroll</div>
                <div className="text-xl sm:text-2xl font-bold text-[#D4A853] mt-1 tabular-nums">
                  {bankrollSummary.currentBankroll.toFixed(2)}{sym}
                </div>
                <div className={`text-[11px] font-semibold mt-0.5 tabular-nums ${bankrollSummary.netProfitCurrency >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
                  {bankrollSummary.netProfitCurrency >= 0 ? '+' : ''}{bankrollSummary.netProfitCurrency.toFixed(2)}{sym} ({bankrollSummary.roiPercent >= 0 ? '+' : ''}{bankrollSummary.roiPercent.toFixed(1)}%)
                </div>
              </div>

              <div className="p-4 bg-[#111924]">
                <div className="text-[11px] text-slate-400">Active Tour Slate</div>
                <div className="text-xl sm:text-2xl font-bold text-white mt-1 tabular-nums">
                  {report?.liveAndUpcomingMatches?.length || 0} Matches
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                  {report?.liveAndUpcomingMatches?.filter((m) => m.status === 'IN_PROGRESS').length || 0} Live on Court
                </div>
              </div>
            </div>
          </div>

          {/* 4 Quick Jump Architectural Feature Cards (Hairline Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#1E293B] border border-[#1E293B] mt-6">
            {/* 1. Daily Final Pick */}
            <a
              href="#todays-pick"
              onClick={() => setActiveStationTab('ALL')}
              className="p-4 bg-[#111924] hover:bg-[#16202E] transition-colors group block"
            >
              <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-400">
                <span>01. Primary Pick</span>
                <span className="text-[#34D399] font-semibold tabular-nums">
                  +{report?.finalPick?.expectedValuePercent != null ? report.finalPick.expectedValuePercent.toFixed(1) : '2.0'}% EV
                </span>
              </div>
              <div className="text-sm font-semibold text-white mt-1.5 group-hover:text-[#D4A853] transition-colors truncate">
                {report?.finalPick?.selection || 'Daily Top Selection'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 truncate">
                {report?.finalPick?.match || 'Loading daily card...'}
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#1E293B] text-xs text-[#D4A853] font-mono-tabular font-medium flex items-center justify-between">
                <span className="tabular-nums">
                  @{report?.finalPick?.decimalOdds != null ? report.finalPick.decimalOdds.toFixed(2) : '2.00'} Odds
                </span>
                <span className="group-hover:translate-x-0.5 transition-transform">Open Dossier →</span>
              </div>
            </a>

            {/* 2. Short 100+ Odds Pick */}
            <a
              href="#daily-combines"
              onClick={() => setActiveStationTab('COMBINES')}
              className="p-4 bg-[#111924] hover:bg-[#16202E] transition-colors group block"
            >
              <div className="flex items-center justify-between text-xs font-mono-tabular text-[#D4A853]">
                <span>02. Bet365 100+ Odds</span>
                <span className="text-slate-300 font-semibold">5–6 Legs</span>
              </div>
              <div className="text-sm font-semibold text-white mt-1.5 group-hover:text-[#D4A853] transition-colors truncate">
                Century Multiplier Ticket
              </div>
              <div className="text-xs text-slate-400 mt-0.5 tabular-nums">
                Target: 5{sym} → {((report?.combines?.find(c => c.category === 'ODDS_100')?.totalDecimalOdds || 100) * 5).toFixed(0)}{sym}+ Return
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#1E293B] text-xs text-[#34D399] font-mono-tabular font-semibold flex items-center justify-between">
                <span className="tabular-nums">@{(report?.combines?.find(c => c.category === 'ODDS_100')?.totalDecimalOdds || 109.82).toFixed(2)}x</span>
                <span className="group-hover:translate-x-0.5 transition-transform">Play on Bet365 →</span>
              </div>
            </a>

            {/* 3. Budget Advisor */}
            <button
              type="button"
              onClick={() => {
                navigateStation('ADVISOR', 'advisor-station');
              }}
              className="p-4 bg-[#111924] hover:bg-[#16202E] transition-colors group text-left cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-400">
                <span>03. Capital Ladder</span>
                <span className="text-[#34D399] font-semibold">Interactive</span>
              </div>
              <div className="text-sm font-semibold text-white mt-1.5 group-hover:text-[#D4A853] transition-colors truncate">
                Turn 5{sym} into 50{sym} Target
              </div>
              <div className="text-xs text-slate-400 mt-0.5 truncate">
                Compounding steps & custom combines
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#1E293B] text-xs text-[#D4A853] font-mono-tabular font-medium flex items-center justify-between">
                <span>Build Progression</span>
                <span className="group-hover:translate-x-0.5 transition-transform">Launch Advisor →</span>
              </div>
            </button>

            {/* 4. Live In-Play Board */}
            <a
              href="#live-matches"
              onClick={() => setActiveStationTab('LIVE')}
              className="p-4 bg-[#111924] hover:bg-[#16202E] transition-colors group block"
            >
              <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-400">
                <span>04. In-Play Desk</span>
                <span className="text-[#34D399] font-semibold tabular-nums">
                  {report?.liveAndUpcomingMatches?.filter(m => m.status === 'IN_PROGRESS').length || 0} Active
                </span>
              </div>
              <div className="text-sm font-semibold text-white mt-1.5 group-hover:text-[#D4A853] transition-colors truncate">
                Live Scoreboard & Fair Lines
              </div>
              <div className="text-xs text-slate-400 mt-0.5 truncate">
                Real-time set momentum & settlement
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#1E293B] text-xs text-[#D4A853] font-mono-tabular font-medium flex items-center justify-between">
                <span>Point-by-Point</span>
                <span className="group-hover:translate-x-0.5 transition-transform">View Live Desk →</span>
              </div>
            </a>
          </div>

          {/* Station View Tabs Strip */}
          <div className="flex items-center gap-6 overflow-x-auto text-xs font-mono-tabular font-medium pt-5 mt-5 border-t border-[#1E293B]">
            {(
              [
                { id: 'ALL', label: 'Complete Overview', anchor: undefined },
                { id: 'PICKS', label: 'Today’s Final Pick', anchor: 'todays-pick' },
                { id: 'VALUE_SCANNER', label: 'Value Bet Scanner', anchor: 'value-scanner-station' },
                { id: 'COMBINES', label: 'Sure Combines & 100x', anchor: 'daily-combines' },
                { id: 'ODDS', label: 'Odds Slate & Lines', anchor: 'odds-station' },
                { id: 'LIVE', label: 'Live In-Play', anchor: 'live-matches' },
                { id: 'BACKTEST', label: 'Walk-Forward Backtesting', anchor: 'backtest-station' },
                { id: 'TRACKER', label: 'Prediction Ledger', anchor: 'prediction-tracker-station' },
                { id: 'PLAYERS', label: 'Player Elo & H2H', anchor: 'player-stats-station' },
                { id: 'ADVISOR', label: 'Budget Pick Advisor', anchor: 'advisor-station' },
                { id: 'BANKROLL', label: 'Bankroll & Hit Rate', anchor: 'past-results' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigateStation(tab.id, tab.anchor)}
                className={`pb-2.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeStationTab === tab.id
                    ? 'border-[#D4A853] text-[#D4A853] font-semibold'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8">
        {syncNotification && (
          <div className="mt-6 p-4 bg-[#0F291E] border border-[#26C485] text-white flex items-center justify-between gap-4 font-mono-tabular text-xs shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">⚡</span>
              <div>
                <strong className="text-[#26C485] uppercase tracking-wider">{syncNotification.title}:</strong>{' '}
                <span className="text-slate-100">{syncNotification.message}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSyncNotification(null)}
              className="text-slate-400 hover:text-white px-2 py-1 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mt-6 p-4 bg-[#FFF5F3] border border-[#C2492A] flex items-start justify-between gap-4">
            <div className="text-xs sm:text-sm text-[#7A2713]">
              <p className="font-semibold uppercase tracking-wide font-mono-tabular">
                Live Research Notice
              </p>
              <p className="mt-1">{errorMsg}</p>
            </div>
            <button
              type="button"
              onClick={() => handleRunLiveResearch()}
              className="px-3.5 py-1.5 text-xs font-medium bg-white border border-[#C2492A] text-[#7A2713] hover:bg-[#FDECE8] whitespace-nowrap cursor-pointer"
            >
              Retry Scan
            </button>
          </div>
        )}

        {/* 01. Today's Final Pick (FIRST IN ORDER) */}
        {(activeStationTab === 'ALL' || activeStationTab === 'PICKS') && (
          <FinalPickSection
            report={report}
            loading={loadingReport}
            onRecordPick={handleRecordCandidatePick}
            recordedMatches={recordedMatchesSet}
            recordingPick={recordingPick}
            bankrollConfig={bankrollConfig}
            currentSimulatedBankroll={bankrollSummary.currentBankroll}
            onToggleSlipLeg={handleToggleSlipLeg}
            isLegInSlip={Boolean(
              report?.finalPick &&
                activeSlipLegs.some((l) => l.match === report.finalPick?.match)
            )}
            onFinishMatch={handleFinishMatch}
            onGenerateNextPick={handleGenerateNextPick}
            settlingMatch={settlingMatch}
            generatingNextPick={generatingNextPick}
            onOpenMatchAnalysis={(match) => setSelectedAnalysisMatch(match)}
          />
        )}

        {/* 02. Dedicated Value Bet Scanner (Module 02) */}
        {(activeStationTab === 'ALL' || activeStationTab === 'VALUE_SCANNER') && (
          <ValueBetScannerSection
            report={report}
            loading={loadingReport}
            onOpenMatchAnalysis={(match) => setSelectedAnalysisMatch(match)}
            onToggleSlipLeg={handleToggleSlipLeg}
            onRecordPick={handleRecordCandidatePick}
            isLegInSlip={(m) => activeSlipLegs.some((l) => l.match === m)}
          />
        )}

        {/* 03. Daily Sure Combines & Short 100+ Odds Century Pick */}
        {(activeStationTab === 'ALL' ||
          activeStationTab === 'PICKS' ||
          activeStationTab === 'COMBINES') && (
          <DailyCombinesSection
            report={report}
            loading={loadingReport}
            bankrollConfig={bankrollConfig}
            currentSimulatedBankroll={bankrollSummary.currentBankroll}
            onRecordCombinePick={handleRecordCandidatePick}
            recordedMatches={recordedMatchesSet}
            recordingPick={recordingPick}
            results={results}
            onRefreshCombines={() => executeFastSync(false)}
          />
        )}

        {/* 04. Full Slate Odds, Lines & Matchup Board */}
        {(activeStationTab === 'ALL' || activeStationTab === 'ODDS') && (
          <TodayOddsBoardSection
            report={report}
            loading={loadingReport}
            oddsFormat={oddsFormat}
            onChangeOddsFormat={setOddsFormat}
            bankrollConfig={bankrollConfig}
            currentSimulatedBankroll={bankrollSummary.currentBankroll}
            onRecordPick={handleRecordCandidatePick}
            recordedMatches={recordedMatchesSet}
            onToggleSlipLeg={handleToggleSlipLeg}
            activeSlipLegIds={new Set(activeSlipLegs.map((l) => l.id))}
            onOpenMatchAnalysis={(match) => setSelectedAnalysisMatch(match)}
          />
        )}

        {/* 05. Live & Upcoming Tour Scoreboard (Module 07) */}
        {(activeStationTab === 'ALL' || activeStationTab === 'LIVE') && (
          <LiveScoreboardSection
            matches={report?.liveAndUpcomingMatches || []}
            feedActive={report?.dataFeedStatus.publicTourScoreboard.active ?? false}
            feedStatusText={
              report?.dataFeedStatus.publicTourScoreboard.statusText ||
              'Querying public ATP/WTA scoreboard feed...'
            }
            checkedAt={report?.dataFeedStatus.publicTourScoreboard.checkedAt}
            onRefreshScoreboard={handleRefreshScoreboard}
            refreshing={refreshingScoreboard}
            onResearchMatch={handleRunLiveResearch}
            researching={loadingReport}
            onRecordLivePronostic={handleRecordCandidatePick}
            recordedMatches={recordedMatchesSet}
            onFinishMatch={handleFinishMatch}
            settlingMatch={settlingMatch}
          />
        )}

        {/* 06. Historical Backtesting Engine (Module 05) */}
        {(activeStationTab === 'ALL' || activeStationTab === 'BACKTEST') && (
          <BacktestingSection />
        )}

        {/* 07. Verified Prediction Tracker (Module 06) */}
        {(activeStationTab === 'ALL' || activeStationTab === 'TRACKER') && (
          <PredictionTrackerSection />
        )}

        {/* 08. Player Statistics & Surface Elo Database (Module 08) */}
        {(activeStationTab === 'ALL' || activeStationTab === 'PLAYERS') && (
          <PlayerStatsDatabaseSection />
        )}

        {/* 09. Head-to-Head Surface Elo & Fair-Odds Line Analyzer */}
        {(activeStationTab === 'ALL' ||
          activeStationTab === 'ODDS' ||
          activeStationTab === 'PLAYERS' ||
          activeStationTab === 'PICKS') && (
          <PlayerMatchupAnalyzer
            bankrollConfig={bankrollConfig}
            currentSimulatedBankroll={bankrollSummary.currentBankroll}
            onRecordPick={handleRecordCandidatePick}
            recordingPick={recordingPick}
            onToggleSlipLeg={handleToggleSlipLeg}
            activeSlipLegIds={new Set(activeSlipLegs.map((l) => l.id))}
          />
        )}

        {/* 10. Quant Pick Advisor Station (Turn 5€ into 50€) */}
        <div id="advisor-station">
          {(activeStationTab === 'ALL' ||
            activeStationTab === 'ADVISOR' ||
            activeStationTab === 'COMBINES') && (
            <BudgetMultiplierAdvisorChat
              report={report}
              bankrollConfig={bankrollConfig}
              currentSimulatedBankroll={bankrollSummary.currentBankroll}
              onAddLegToSlip={handleToggleSlipLeg}
              onRecordPick={handleRecordCandidatePick}
            />
          )}
        </div>

        {/* 11. Other Picks Considered */}
        {(activeStationTab === 'ALL' || activeStationTab === 'PICKS') && (
          <OtherPicksSection
            candidates={report?.otherPicksConsidered || []}
            loading={loadingReport}
            onRunCustomResearch={handleRunLiveResearch}
            onRecordPick={handleRecordCandidatePick}
            recordedMatches={recordedMatchesSet}
          />
        )}

        {/* 12. Sources & Data Feeds */}
        {activeStationTab === 'ALL' && (
          <SourcesSection
            sources={report?.sources || []}
            feedStatus={report?.dataFeedStatus}
            onOpenSetupGuide={() => setSetupModalOpen(true)}
          />
        )}

        {/* 13. Bankroll Growth Simulator & Past Results History */}
        {(activeStationTab === 'ALL' || activeStationTab === 'BANKROLL') && (
          <PastResultsSection
            results={results}
            bankrollConfig={bankrollConfig}
            onUpdateBankrollConfig={handleUpdateBankrollConfig}
            finalPick={report?.finalPick}
            bestLivePick={report?.bestLivePick}
            onRecordCandidatePick={handleRecordCandidatePick}
            recordedMatches={recordedMatchesSet}
            recordingPick={recordingPick}
            onAddManualResult={handleAddManualResult}
            onUpdateOutcome={handleUpdateOutcome}
            onVerifyOutcome={handleVerifyOutcome}
            onVerifyAllPending={handleVerifyAllPending}
            onDeleteResult={handleDeleteResult}
          />
        )}
      </main>

      {/* Floating Dynamic Combine / Parlay Bet Slip Dock */}
      <ActiveBetSlipDock
        legs={activeSlipLegs}
        onRemoveLeg={handleRemoveSlipLeg}
        onClearSlip={handleClearSlip}
        bankrollConfig={bankrollConfig}
        currentSimulatedBankroll={bankrollSummary.currentBankroll}
        onRecordPick={handleRecordCandidatePick}
        recordingPick={recordingPick}
      />

      {/* Floating Quick Launcher for 5€ → 50€ Pick Advisor */}
      {!advisorDrawerOpen && activeStationTab !== 'ADVISOR' && (
        <button
          type="button"
          onClick={() => setAdvisorDrawerOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-5 md:right-6 z-40 px-4 py-2.5 bg-[#0B1118] text-[#D4A853] hover:text-white border border-[#D4A853] shadow-2xl text-xs font-mono-tabular font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer hover:bg-[#15212E] transition-all"
          title="Open Pick Advisor Chat"
        >
          <svg className="w-4 h-4 text-[#D4A853]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>5{sym} → 50{sym} Advisor</span>
        </button>
      )}

      {/* Slide-over Drawer Modal for Advisor */}
      {advisorDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in">
          <div
            className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col border-l border-[#DCD8CE] animate-in slide-in-from-right duration-200"
            role="dialog"
            aria-modal="true"
          >
            <BudgetMultiplierAdvisorChat
              report={report}
              bankrollConfig={bankrollConfig}
              currentSimulatedBankroll={bankrollSummary.currentBankroll}
              onAddLegToSlip={handleToggleSlipLeg}
              onRecordPick={handleRecordCandidatePick}
              onClose={() => setAdvisorDrawerOpen(false)}
              isOpenAsDrawer={true}
            />
          </div>
        </div>
      )}

      {/* Mobile Bottom Station Dock — Clean Architectural Grid, Zero Generic Icons */}
      <nav
        aria-label="Mobile station dock"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B1118] text-white border-t border-[#222C38] grid grid-cols-6 items-stretch text-[9px] font-mono-tabular uppercase tracking-wider"
      >
        <button
          type="button"
          onClick={() => navigateStation('ODDS', 'odds-station')}
          className={`py-2.5 flex flex-col items-center justify-center border-r border-[#1E2936] cursor-pointer ${
            activeStationTab === 'ODDS' ? 'text-[#D4A853] font-bold' : 'text-slate-400'
          }`}
        >
          <span>Odds</span>
        </button>

        <button
          type="button"
          onClick={() => navigateStation('COMBINES', 'daily-combines')}
          className={`py-2.5 flex flex-col items-center justify-center border-r border-[#1E2936] cursor-pointer ${
            activeStationTab === 'COMBINES' ? 'text-[#D4A853] font-bold' : 'text-slate-400'
          }`}
        >
          <span>Combines</span>
        </button>

        <button
          type="button"
          onClick={() => navigateStation('ADVISOR', 'advisor-station')}
          className={`py-2.5 flex flex-col items-center justify-center border-r border-[#1E2936] cursor-pointer ${
            activeStationTab === 'ADVISOR' ? 'text-[#D4A853] font-bold' : 'text-[#D4A853]/80'
          }`}
        >
          <span>Advisor</span>
        </button>

        <button
          type="button"
          onClick={() => navigateStation('LIVE', 'live-matches')}
          className={`py-2.5 flex flex-col items-center justify-center border-r border-[#1E2936] cursor-pointer ${
            activeStationTab === 'LIVE'
              ? 'bg-[#0D5C3A] text-white font-bold'
              : 'bg-[#141D28] text-[#26C485] font-semibold'
          }`}
        >
          <span>Live</span>
        </button>

        <button
          type="button"
          onClick={() => navigateStation('BANKROLL', 'past-results')}
          className={`py-2.5 flex flex-col items-center justify-center border-r border-[#1E2936] cursor-pointer ${
            activeStationTab === 'BANKROLL' ? 'text-[#D4A853] font-bold' : 'text-slate-400'
          }`}
        >
          <span>Bankroll</span>
        </button>

        <button
          type="button"
          onClick={() => navigateStation('ALL')}
          className={`py-2.5 flex flex-col items-center justify-center cursor-pointer ${
            activeStationTab === 'ALL' ? 'text-[#D4A853] font-bold' : 'text-slate-400'
          }`}
        >
          <span>Dossier</span>
        </button>
      </nav>

      {/* Editorial Colophon Footer */}
      <footer className="mt-16 border-t border-[#E2E8F0] bg-white px-4 sm:px-8 py-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-lg font-display font-semibold text-[#0F172A]">
              CourtEdge
            </span>
            <span>
              Quantitative Tennis Value Research & Oddsmaker Desk · All picks verified against surface Elo and regulated market lines.
            </span>
          </div>
          <div className="flex items-center gap-4 shrink-0 font-mono-tabular text-xs">
            <button
              type="button"
              onClick={() => setSetupModalOpen(true)}
              className="hover:text-[#0F172A] underline cursor-pointer"
            >
              Feeds & API Architecture
            </button>
            <span aria-hidden="true">·</span>
            <a href="#past-results" className="hover:text-[#0F172A] underline">
              Bankroll & Accuracy Ledger
            </a>
          </div>
        </div>
      </footer>

      <SetupGuideModal
        isOpen={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        feedStatus={report?.dataFeedStatus}
      />

      {selectedAnalysisMatch && (
        <MatchAnalysisModal
          matchName={selectedAnalysisMatch}
          onClose={() => setSelectedAnalysisMatch(null)}
          onAddSlipLeg={handleToggleSlipLeg}
          onRecordPick={handleRecordCandidatePick}
        />
      )}
    </div>
  );
}
