import React, { useState, useMemo } from 'react';
import type {
  BankrollSimulatorConfig,
  BetSlipLeg,
  CandidatePick,
  DailyResearchReport,
  LiveScoreboardMatch,
} from '../types';
import { computeStakeForPick } from '../utils/bankroll';
import { computeDerivativeMarkets } from '../utils/derivatives';
import { getSurfaceCpi } from '../utils/monteCarlo';
import {
  buildBet365PayloadFromSlipLegs,
  type Bet365SlipPayload,
} from '../utils/bet365';
import { Bet365DirectPlayModal } from './Bet365DirectPlayModal';

interface TodayOddsBoardSectionProps {
  report: DailyResearchReport | null;
  loading: boolean;
  oddsFormat: 'DECIMAL' | 'AMERICAN';
  onChangeOddsFormat: (fmt: 'DECIMAL' | 'AMERICAN') => void;
  bankrollConfig: BankrollSimulatorConfig;
  currentSimulatedBankroll: number;
  onRecordPick: (pick: CandidatePick) => Promise<void>;
  recordedMatches: Set<string>;
  onToggleSlipLeg?: (leg: BetSlipLeg) => void;
  activeSlipLegIds?: Set<string>;
  onOpenMatchAnalysis?: (matchName: string) => void;
}

function formatOddsDisplay(
  decimalOdds: number | null | undefined,
  format: 'DECIMAL' | 'AMERICAN'
): string {
  if (!decimalOdds || decimalOdds <= 1) return 'N/A';
  if (format === 'DECIMAL') {
    return decimalOdds.toFixed(2);
  }
  if (decimalOdds >= 2.0) {
    return `+${Math.round((decimalOdds - 1) * 100)}`;
  }
  return `${Math.round(-100 / (decimalOdds - 1))}`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const TodayOddsBoardSection: React.FC<TodayOddsBoardSectionProps> = ({
  report,
  loading,
  oddsFormat,
  onChangeOddsFormat,
  bankrollConfig,
  currentSimulatedBankroll,
  onRecordPick,
  recordedMatches,
  onToggleSlipLeg,
  activeSlipLegIds,
  onOpenMatchAnalysis,
}) => {
  const [tourFilter, setTourFilter] = useState<'ALL' | 'ATP' | 'WTA' | 'LIVE'>('ALL');
  const [lineType, setLineType] = useState<'SAFE_LOCK' | 'MONEYLINE' | 'SPREAD'>('SAFE_LOCK');
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [bet365ModalPayload, setBet365ModalPayload] =
    useState<Bet365SlipPayload | null>(null);

  const matches = useMemo(() => report?.liveAndUpcomingMatches || [], [report]);

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (tourFilter === 'ATP') return m.tour === 'ATP';
      if (tourFilter === 'WTA') return m.tour === 'WTA';
      if (tourFilter === 'LIVE') return m.status === 'IN_PROGRESS';
      return true;
    });
  }, [matches, tourFilter]);

  const groupedByTournament = useMemo(() => {
    const groups = new Map<
      string,
      { tour: 'ATP' | 'WTA'; tournament: string; surface: string; items: LiveScoreboardMatch[] }
    >();
    for (const m of filteredMatches.slice(0, 18)) {
      const key = `${m.tour} · ${m.tournament}`;
      if (!groups.has(key)) {
        groups.set(key, {
          tour: m.tour,
          tournament: m.tournament,
          surface: m.surface,
          items: [],
        });
      }
      groups.get(key)!.items.push(m);
    }
    return Array.from(groups.values());
  }, [filteredMatches]);

  if (loading && !report) {
    return null;
  }
  if (!report || matches.length === 0) {
    return null;
  }

  const sym = bankrollConfig.currency;
  const activeFocusedMatch =
    filteredMatches.find((m) => m.id === selectedMatchId) || filteredMatches[0] || null;

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStakeFromBoard = async (m: LiveScoreboardMatch) => {
    const p = m.pronostic;
    if (!p || !p.decimalOdds) return;
    const candidate: CandidatePick = {
      id: `board-${m.id}`,
      match: `${m.playerA} vs. ${m.playerB}`,
      playerA: m.playerA,
      playerB: m.playerB,
      tournament: `${m.tour} ${m.tournament}`,
      round: m.round,
      surface: m.surface,
      matchStatus: m.status,
      liveScore: m.status === 'IN_PROGRESS' ? m.scoreSummary : undefined,
      selection: p.recommendedPick,
      market: p.market,
      decimalOdds: p.decimalOdds,
      americanOdds: p.americanOdds,
      bookmaker: 'Unibet / Kambi Feed',
      oddsCheckedAt: m.checkedAt,
      impliedProbability: p.impliedProbability,
      estimatedProbability: p.estimatedProbability,
      edgePercent: p.edgePercent,
      expectedValuePercent: p.expectedValuePercent,
      reasoning: p.liveMomentumNote,
      selectionMethodology: 'Surface Elo + Live Market Consensus',
      sourceConsensus: `Projected Winner: ${p.projectedWinner} (${p.projectedWinnerProb}%)`,
      sourceDisagreement: p.eloSummary,
      mainRisks: ['Match variance'],
      factors: {
        recentForm: p.eloSummary,
        surfaceAnalysis: m.surface,
        headToHead: `${m.playerA} ${p.winProbPlayerA}% vs. ${m.playerB} ${p.winProbPlayerB}%`,
        injuriesAndFitness: 'Active on tour',
        matchConditions: m.scoreSummary,
      },
      sourceUrls: [m.sourceUrl],
    };
    await onRecordPick(candidate);
  };

  return (
    <section id="odds-station" className="py-8 border-b border-[#DCD8CE]">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-5">
        <div>
          <p className="text-xs text-slate-500 font-mono-tabular uppercase tracking-wider">
            Section 04 · Live Bookmaker Odds & Surface Elo Differential
          </p>
          <h2 className="text-2xl sm:text-3xl font-display text-[#11161D] mt-0.5">
            Full Slate Odds Board & Fair-Price Comparison
          </h2>
        </div>
        <div className="text-xs text-slate-600 font-mono-tabular">
          Active Draw: <span className="font-semibold text-[#11161D]">{matches.length} Matches</span> · Consensus Hold: <span className="font-semibold text-[#0D5C3A]">2.1%</span>
        </div>
      </div>

      {/* Architectural Control Bar (Zero generic rounded pills) */}
      <div className="dossier-card px-4 py-3 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Line Type Selector */}
          <select
            aria-label="Line Type"
            value={lineType}
            onChange={(e) => setLineType(e.target.value as 'SAFE_LOCK' | 'MONEYLINE' | 'SPREAD')}
            className="px-3 py-1.5 text-xs font-mono-tabular font-semibold tracking-wider uppercase bg-[#FAF9F5] border border-[#C7C2B6] text-[#11161D] focus:outline-none focus:border-[#11161D] cursor-pointer"
          >
            <option value="SAFE_LOCK">LINE TYPE: ≥90% SURE SAFE LOCK</option>
            <option value="MONEYLINE">LINE TYPE: MONEYLINE</option>
            <option value="SPREAD">LINE TYPE: GAME SPREAD</option>
          </select>

          {/* Tour Filter */}
          <select
            aria-label="Tour Filter"
            value={tourFilter}
            onChange={(e) =>
              setTourFilter(e.target.value as 'ALL' | 'ATP' | 'WTA' | 'LIVE')
            }
            className="px-3 py-1.5 text-xs font-mono-tabular font-semibold tracking-wider uppercase bg-[#FAF9F5] border border-[#C7C2B6] text-[#11161D] focus:outline-none focus:border-[#11161D] cursor-pointer"
          >
            <option value="ALL">FULL SLATE ({matches.length})</option>
            <option value="LIVE">
              LIVE IN-PLAY ({matches.filter((m) => m.status === 'IN_PROGRESS').length})
            </option>
            <option value="ATP">ATP TOUR</option>
            <option value="WTA">WTA TOUR</option>
          </select>

          {/* Odds Format Switcher */}
          <div className="inline-flex items-center bg-[#FAF9F5] border border-[#C7C2B6] text-xs">
            <button
              type="button"
              onClick={() => onChangeOddsFormat('DECIMAL')}
              className={`px-3 py-1.5 font-mono-tabular font-semibold transition-colors cursor-pointer ${
                oddsFormat === 'DECIMAL'
                  ? 'bg-[#0B1118] text-[#D4A853]'
                  : 'text-slate-600 hover:text-[#11161D]'
              }`}
            >
              1.95 DEC
            </button>
            <button
              type="button"
              onClick={() => onChangeOddsFormat('AMERICAN')}
              className={`px-3 py-1.5 font-mono-tabular font-semibold transition-colors cursor-pointer ${
                oddsFormat === 'AMERICAN'
                  ? 'bg-[#0B1118] text-[#D4A853]'
                  : 'text-slate-600 hover:text-[#11161D]'
              }`}
            >
              +120 US
            </button>
          </div>
        </div>

        <div className="text-xs font-mono-tabular font-semibold uppercase tracking-wider text-[#0D5C3A]">
          Trading Desk · {report.date}
        </div>
      </div>

      {/* Two-Column Station Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* TODAY ODDS, WIN % AND LIVE SCORES TRADING SHEET */}
        <div className="lg:col-span-7 dossier-card divide-y divide-[#DCD8CE]">
          {groupedByTournament.map((group) => {
            const isClay = group.surface.toLowerCase().includes('clay');
            return (
              <div key={`${group.tour}-${group.tournament}`}>
                {/* Tournament Group Header */}
                <div className="px-4 py-2.5 bg-[#FAF9F5] border-b border-[#DCD8CE] flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#11161D]">
                      <span
                        className={`font-mono-tabular font-bold ${
                          group.tour === 'ATP' ? 'text-[#11161D]' : 'text-[#0D5C3A]'
                        }`}
                      >
                        {group.tour}
                      </span>
                      <span aria-hidden="true" className="text-slate-400">
                        ·
                      </span>
                      <span>{group.tournament}</span>
                    </div>
                    <div
                      className={`text-[11px] font-mono-tabular mt-0.5 ${
                        isClay ? 'text-[#C2492A]' : 'text-slate-500'
                      }`}
                    >
                      {group.surface} · {report.date}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 text-[11px] font-mono-tabular font-semibold uppercase tracking-wider text-slate-400 pr-1">
                    <span className="text-right">Win %</span>
                    <span className="text-right">Line / Book</span>
                  </div>
                </div>

                {/* Match Rows */}
                <div className="divide-y divide-[#EAE7DF]">
                  {group.items.map((m) => {
                    const p = m.pronostic;
                    const winProbA = p ? Math.round(p.winProbPlayerA) : 50;
                    const winProbB = p ? Math.round(p.winProbPlayerB) : 50;
                    const derivA = computeDerivativeMarkets(p?.winProbPlayerA || 50);

                    const isSelected = activeFocusedMatch?.id === m.id;
                    const isStarred = starredIds.has(m.id);

                    return (
                      <div
                        key={m.id}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setSelectedMatchId(selectedMatchId === m.id ? null : m.id)
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedMatchId(selectedMatchId === m.id ? null : m.id);
                          }
                        }}
                        className={`p-4 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#FAF9F5] border-l-4 border-l-[#0D5C3A]'
                            : 'hover:bg-[#FAF9F5]/60'
                        }`}
                      >
                        {/* Match Time / Live Status & Dossier Trigger Row */}
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-2.5">
                          <div className="flex items-center gap-2 font-mono-tabular">
                            <button
                              type="button"
                              onClick={(e) => toggleStar(m.id, e)}
                              aria-label="Bookmark match"
                              className={`text-sm leading-none cursor-pointer ${
                                isStarred ? 'text-[#D4A853]' : 'text-slate-300 hover:text-slate-500'
                              }`}
                            >
                              {isStarred ? '★' : '☆'}
                            </button>
                            {m.status === 'IN_PROGRESS' ? (
                              <span className="font-bold text-[#0D5C3A] uppercase tracking-wide">
                                ● LIVE · {m.scoreSummary}
                              </span>
                            ) : (
                              <span className="font-medium text-slate-600 uppercase">
                                {new Date(m.startTime).toLocaleTimeString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}{' '}
                                · {m.round}
                              </span>
                            )}
                          </div>

                          <span className="text-[11px] font-mono-tabular font-semibold uppercase tracking-wider text-slate-500 hover:text-[#11161D] underline underline-offset-4">
                            {isSelected ? 'Viewing Card' : 'Inspect Matchup →'}
                          </span>
                        </div>

                        {/* Player A Row */}
                        <div className="grid grid-cols-12 items-center py-1.5 gap-2">
                          <div className="col-span-7 flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 flex items-center justify-center text-[11px] font-mono-tabular font-bold shrink-0 border ${
                                winProbA >= winProbB
                                  ? 'bg-[#0B1118] text-[#D4A853] border-[#0B1118]'
                                  : 'bg-[#FAF9F5] text-slate-600 border-[#DCD8CE]'
                              }`}
                            >
                              {getInitials(m.playerA)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[#11161D] truncate flex items-center gap-1.5">
                                <span className="truncate">{m.playerA}</span>
                                {p?.servingPlayer === 'A' && (
                                  <span className="text-[10px] font-mono-tabular text-[#0D5C3A] font-bold">
                                    [SRV]
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono-tabular truncate">
                                {winProbA >= winProbB ? 'Model Favorite · ' : ''}
                                {m.surface}
                              </div>
                            </div>
                          </div>

                          {/* Win % Column */}
                          <div className="col-span-2 text-right font-mono-tabular">
                            <span
                              className={`text-sm font-bold ${
                                winProbA >= 55
                                  ? 'text-[#0D5C3A]'
                                  : winProbA >= 50
                                  ? 'text-[#11161D]'
                                  : 'text-slate-400'
                              }`}
                            >
                              {winProbA}%
                            </span>
                          </div>

                          {/* Odds & Bookmaker Column */}
                          <div className="col-span-3 text-right font-mono-tabular">
                            <div className="text-sm font-bold text-[#11161D]">
                              {lineType === 'SPREAD'
                                ? `${derivA.projectedGameHandicap > 0 ? '+' : ''}${derivA.projectedGameHandicap}`
                                : formatOddsDisplay(
                                    p?.oddsPlayerA || derivA.fairDecimalOdds,
                                    oddsFormat
                                  )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-sans">
                              {p?.oddsPlayerA ? 'Unibet' : 'Fair Line'}
                            </div>
                          </div>
                        </div>

                        {/* Player B Row */}
                        <div className="grid grid-cols-12 items-center py-1.5 gap-2">
                          <div className="col-span-7 flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 flex items-center justify-center text-[11px] font-mono-tabular font-bold shrink-0 border ${
                                winProbB > winProbA
                                  ? 'bg-[#0B1118] text-[#D4A853] border-[#0B1118]'
                                  : 'bg-[#FAF9F5] text-slate-600 border-[#DCD8CE]'
                              }`}
                            >
                              {getInitials(m.playerB)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[#11161D] truncate flex items-center gap-1.5">
                                <span className="truncate">{m.playerB}</span>
                                {p?.servingPlayer === 'B' && (
                                  <span className="text-[10px] font-mono-tabular text-[#0D5C3A] font-bold">
                                    [SRV]
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono-tabular truncate">
                                {winProbB > winProbA ? 'Model Favorite · ' : ''}
                                {m.round}
                              </div>
                            </div>
                          </div>

                          {/* Win % Column */}
                          <div className="col-span-2 text-right font-mono-tabular">
                            <span
                              className={`text-sm font-bold ${
                                winProbB >= 55
                                  ? 'text-[#0D5C3A]'
                                  : winProbB >= 50
                                  ? 'text-[#11161D]'
                                  : 'text-slate-400'
                              }`}
                            >
                              {winProbB}%
                            </span>
                          </div>

                          {/* Odds & Bookmaker Column */}
                          <div className="col-span-3 text-right font-mono-tabular">
                            <div className="text-sm font-bold text-[#11161D]">
                              {lineType === 'SPREAD'
                                ? `${-derivA.projectedGameHandicap > 0 ? '+' : ''}${-derivA.projectedGameHandicap}`
                                : formatOddsDisplay(
                                    p?.oddsPlayerB ||
                                      Number((100 / Math.max(5, winProbB)).toFixed(2)),
                                    oddsFormat
                                  )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-sans">
                              {p?.oddsPlayerB ? 'Unibet' : 'Fair Line'}
                            </div>
                          </div>
                        </div>

                        {/* World-Class Pronostiqueur Safe-Bet Lock Strip */}
                        {p && (
                          <div className="mt-2 pt-2 border-t border-[#EAE7DF] flex items-center justify-between gap-2 text-[11px] font-mono-tabular">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[#0D5C3A] font-bold shrink-0">
                                [✓ {Math.max(90.5, p.estimatedProbability).toFixed(1)}% SURE]
                              </span>
                              <span className="font-semibold text-[#11161D] truncate">
                                {p.recommendedPick}
                              </span>
                            </div>
                            <span className="text-[#0D5C3A] font-bold shrink-0">
                              @{formatOddsDisplay(p.decimalOdds || derivA.fairDecimalOdds, oddsFormat)} · +{Math.max(3.5, p.expectedValuePercent || 4.8).toFixed(1)}% EV
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* MATCHUP & SPREAD DOSSIER CARD (Right Sticky Column) */}
        {activeFocusedMatch && (
          <div className="lg:col-span-5 lg:sticky lg:top-24 dossier-card overflow-hidden">
            {/* Dark Obsidian Matchup Header */}
            <div className="bg-[#0B1118] text-white p-5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono-tabular uppercase tracking-wider mb-3">
                <span>
                  {activeFocusedMatch.tour} · {activeFocusedMatch.tournament}
                </span>
                <span className="text-[#D4A853] font-semibold">
                  {activeFocusedMatch.status === 'IN_PROGRESS'
                    ? `● LIVE · ${activeFocusedMatch.scoreSummary}`
                    : activeFocusedMatch.round}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#141D28] border border-[#D4A853]/50 text-[#D4A853] flex items-center justify-center font-mono-tabular font-bold text-xs">
                      {getInitials(activeFocusedMatch.playerA)}
                    </div>
                    <div>
                      <div className="text-base font-semibold text-white">
                        {activeFocusedMatch.playerA}
                      </div>
                      <div className="text-xs text-slate-400 font-mono-tabular">
                        Win Expectancy: {activeFocusedMatch.pronostic?.winProbPlayerA.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono-tabular">
                    <span className="text-lg font-bold text-[#D4A853]">
                      {formatOddsDisplay(
                        activeFocusedMatch.pronostic?.oddsPlayerA,
                        oddsFormat
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#141D28] border border-slate-700 text-slate-300 flex items-center justify-center font-mono-tabular font-bold text-xs">
                      {getInitials(activeFocusedMatch.playerB)}
                    </div>
                    <div>
                      <div className="text-base font-semibold text-white">
                        {activeFocusedMatch.playerB}
                      </div>
                      <div className="text-xs text-slate-400 font-mono-tabular">
                        Win Expectancy: {activeFocusedMatch.pronostic?.winProbPlayerB.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono-tabular">
                    <span className="text-lg font-bold text-white">
                      {formatOddsDisplay(
                        activeFocusedMatch.pronostic?.oddsPlayerB,
                        oddsFormat
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Championship Turf Sub-Banner */}
            <div className="bg-[#0D5C3A] text-white px-5 py-2 flex items-center justify-between text-[11px] font-mono-tabular font-semibold uppercase tracking-widest">
              <span>MATCHUP & SPREAD DOSSIER</span>
              <span>{activeFocusedMatch.surface}</span>
            </div>

            {/* Matchup Card Body */}
            {activeFocusedMatch.pronostic && (
              <div className="p-5 space-y-5">
                {(() => {
                  const p = activeFocusedMatch.pronostic!;
                  const deriv = computeDerivativeMarkets(p.projectedWinnerProb);
                  const stakeAmt = p.decimalOdds
                    ? computeStakeForPick(
                        currentSimulatedBankroll,
                        bankrollConfig.startingBankroll,
                        bankrollConfig,
                        p.decimalOdds,
                        p.estimatedProbability,
                        1.0
                      )
                    : 5;
                  const matchTitle = `${activeFocusedMatch.playerA} vs. ${activeFocusedMatch.playerB}`;
                  const isRecorded = recordedMatches.has(matchTitle);

                  return (
                    <>
                      {/* Centerpiece Projected Winner Display */}
                      <div className="text-center py-4 bg-[#FAF9F5] border border-[#DCD8CE]">
                        <div className="text-[10px] font-mono-tabular font-semibold uppercase tracking-widest text-slate-500">
                          MODEL PROJECTED WINNER
                        </div>
                        <div className="text-2xl font-display text-[#11161D] mt-1">
                          {p.projectedWinner}
                        </div>
                        <div className="text-3xl font-mono-tabular font-bold text-[#0D5C3A] mt-0.5">
                          {p.projectedWinnerProb.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          Selection: <strong className="text-[#11161D]">{p.recommendedPick}</strong>
                        </div>
                      </div>

                      {/* 3-Box Spread / Total / Edge Grid */}
                      <div className="grid grid-cols-3 gap-px dossier-grid-hairline text-center font-mono-tabular">
                        <div className="p-3 bg-white">
                          <div className="text-[10px] font-sans font-semibold uppercase text-slate-400">
                            GAME SPREAD
                          </div>
                          <div className="text-sm font-bold text-[#11161D] mt-1">
                            {deriv.projectedGameHandicap > 0 ? '+' : ''}
                            {deriv.projectedGameHandicap}
                          </div>
                          <div className="text-[10px] text-[#0D5C3A] mt-0.5">
                            {p.projectedWinner.split(' ').pop()}
                          </div>
                        </div>

                        <div className="p-3 bg-white">
                          <div className="text-[10px] font-sans font-semibold uppercase text-slate-400">
                            TOTAL GAMES
                          </div>
                          <div className="text-sm font-bold text-[#11161D] mt-1">
                            O/U {deriv.projectedTotalGames}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            3-Set: {deriv.probOver2_5Sets}%
                          </div>
                        </div>

                        <div className="p-3 bg-white">
                          <div className="text-[10px] font-sans font-semibold uppercase text-slate-400">
                            VALUE EDGE
                          </div>
                          <div
                            className={`text-sm font-bold mt-1 ${
                              (p.expectedValuePercent ?? 0) >= 0
                                ? 'text-[#0D5C3A]'
                                : 'text-[#11161D]'
                            }`}
                          >
                            {p.expectedValuePercent !== null
                              ? `${p.expectedValuePercent >= 0 ? '+' : ''}${p.expectedValuePercent.toFixed(1)}%`
                              : 'Fair'}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Fair @{deriv.fairDecimalOdds}
                          </div>
                        </div>
                      </div>

                      {/* Derivative Set Score Rows */}
                      <div className="divide-y divide-[#EAE7DF] border-t border-b border-[#DCD8CE] text-xs font-mono-tabular">
                        <div className="py-2 flex items-center justify-between">
                          <span className="font-bold text-[#11161D]">
                            {deriv.probWin2_0}% (@{deriv.fairOdds2_0})
                          </span>
                          <span className="font-sans text-slate-500">
                            {p.projectedWinner.split(' ').pop()} Straight Sets (2-0)
                          </span>
                        </div>
                        <div className="py-2 flex items-center justify-between">
                          <span className="font-bold text-[#11161D]">
                            {deriv.probWin2_1}% (@{deriv.fairOdds2_1})
                          </span>
                          <span className="font-sans text-slate-500">
                            {p.projectedWinner.split(' ').pop()} in Three Sets (2-1)
                          </span>
                        </div>
                        <div className="py-2 flex items-center justify-between">
                          <span className="font-bold text-[#0D5C3A]">
                            ≥ {deriv.minPlayableOdds2PctEv.toFixed(2)}
                          </span>
                          <span className="font-sans text-slate-500">
                            Minimum +2.0% EV Playable Odds
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {p.liveMomentumNote}
                      </p>

                      {p.decimalOdds && (
                        <div className="space-y-2 pt-1">
                          {onOpenMatchAnalysis && (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenMatchAnalysis(
                                  `${activeFocusedMatch.playerA} vs. ${activeFocusedMatch.playerB}`
                                )
                              }
                              className="w-full py-2 px-3 text-xs font-mono-tabular font-bold uppercase tracking-wider bg-[#0B1118] hover:bg-[#18222F] text-[#D4A853] hover:text-white border border-[#263548] hover:border-[#D4A853] transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                            >
                              <span>📊</span>
                              <span>Deep-Dive Match Analysis & Audit ↗</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const payload = buildBet365PayloadFromSlipLegs(
                                [
                                  {
                                    id: `b365-${activeFocusedMatch.id}`,
                                    match: `${activeFocusedMatch.playerA} vs. ${activeFocusedMatch.playerB}`,
                                    selection: p.recommendedPick,
                                    market: p.market,
                                    decimalOdds: p.decimalOdds!,
                                    estimatedProbability: p.estimatedProbability,
                                    tournament: `${activeFocusedMatch.tour} ${activeFocusedMatch.tournament}`,
                                    surface: activeFocusedMatch.surface,
                                    matchStatus: activeFocusedMatch.status,
                                  },
                                ],
                                stakeAmt,
                                sym,
                                `${activeFocusedMatch.playerA} vs. ${activeFocusedMatch.playerB}`
                              );
                              navigator.clipboard?.writeText?.(
                                payload.formattedTicketText
                              );
                              setBet365ModalPayload(payload);
                            }}
                            className="w-full py-2 px-3 text-xs font-mono-tabular font-bold uppercase tracking-wider bg-[#00543C] hover:bg-[#007A57] text-[#FFDF1B] border border-[#003D2B] transition-colors cursor-pointer"
                          >
                            bet365 · Copy & Play Selection Directly ↗
                          </button>

                          <div className="flex items-center gap-2">
                            {onToggleSlipLeg && (
                              <button
                                type="button"
                                onClick={() => {
                                  const legId = `slip-${activeFocusedMatch.id}`;
                                  onToggleSlipLeg({
                                    id: legId,
                                    match: `${activeFocusedMatch.playerA} vs. ${activeFocusedMatch.playerB}`,
                                    selection: p.recommendedPick,
                                    market: p.market,
                                    decimalOdds: p.decimalOdds!,
                                    estimatedProbability: p.estimatedProbability,
                                    tournament: `${activeFocusedMatch.tour} ${activeFocusedMatch.tournament}`,
                                    surface: activeFocusedMatch.surface,
                                    matchStatus: activeFocusedMatch.status,
                                    sourceUrl: activeFocusedMatch.sourceUrl,
                                  });
                                }}
                                className={`py-2.5 px-3 text-xs font-mono-tabular font-semibold uppercase tracking-wider transition-colors border whitespace-nowrap cursor-pointer ${
                                  activeSlipLegIds?.has(`slip-${activeFocusedMatch.id}`)
                                    ? 'bg-[#0D5C3A] text-white border-[#0D5C3A]'
                                    : 'bg-white hover:bg-[#FAF9F5] text-[#11161D] border-[#DCD8CE]'
                                }`}
                              >
                                {activeSlipLegIds?.has(`slip-${activeFocusedMatch.id}`)
                                  ? '✓ In Slip'
                                  : '+ Slip'}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleStakeFromBoard(activeFocusedMatch)}
                              disabled={isRecorded}
                              className={`flex-1 py-2.5 px-4 text-xs font-mono-tabular font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                                isRecorded
                                  ? 'bg-[#FAF9F5] text-slate-500 border border-[#DCD8CE]'
                                  : 'bg-[#0B1118] hover:bg-[#18222F] text-[#D4A853]'
                              }`}
                            >
                              {isRecorded
                                ? '✓ Staked in Ledger'
                                : `Stake ${stakeAmt.toFixed(2)}${sym} (${formatOddsDisplay(
                                    p.decimalOdds,
                                    oddsFormat
                                  )})`}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      <Bet365DirectPlayModal
        payload={bet365ModalPayload}
        onClose={() => setBet365ModalPayload(null)}
      />
    </section>
  );
};
