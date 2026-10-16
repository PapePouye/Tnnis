import React, { useState, useMemo } from 'react';
import type {
  BankrollSimulatorConfig,
  CandidatePick,
  CombineCategory,
  CombineLeg,
  CombineTicket,
  DailyResearchReport,
  TrackedResult,
} from '../types';
import { computeStakeForPick } from '../utils/bankroll';
import {
  buildCombinesFromReport,
  combineTicketToCandidatePick,
} from '../utils/combines';
import {
  buildBet365PayloadFromCombine,
  buildBet365PayloadFromSlipLegs,
  mapToBet365Market,
  type Bet365SlipPayload,
} from '../utils/bet365';
import { Bet365DirectPlayModal } from './Bet365DirectPlayModal';
import { CombinePerformanceGraphic } from './CombinePerformanceGraphic';

interface DailyCombinesSectionProps {
  report: DailyResearchReport | null;
  loading: boolean;
  bankrollConfig: BankrollSimulatorConfig;
  currentSimulatedBankroll: number;
  onRecordCombinePick: (pick: CandidatePick, unitMultiplier?: number) => Promise<void>;
  recordedMatches: Set<string>;
  recordingPick: boolean;
  results?: TrackedResult[];
  onRefreshCombines?: () => Promise<void>;
}

const UNIT_MULTIPLIER_BY_CATEGORY: Record<CombineCategory, number> = {
  TODAY_SURE: 1.0,
  ODDS_2: 0.8,
  ODDS_5: 0.5,
  ODDS_10: 0.25,
  ODDS_100: 0.1,
  LIVE_SURE: 0.75,
};

export const DailyCombinesSection: React.FC<DailyCombinesSectionProps> = ({
  report,
  loading,
  bankrollConfig,
  currentSimulatedBankroll,
  onRecordCombinePick,
  recordedMatches,
  recordingPick,
  results = [],
  onRefreshCombines,
}) => {
  const [selectedTab, setSelectedTab] = useState<
    'ALL' | CombineCategory | 'CUSTOM' | 'GRAPHS'
  >('ALL');
  const [graphicFocusedCategory, setGraphicFocusedCategory] = useState<
    CombineCategory | 'ALL' | 'CUSTOM'
  >('ALL');
  const [customLegIds, setCustomLegIds] = useState<string[]>([]);
  const [customUnitMultiplier, setCustomUnitMultiplier] = useState<number>(0.5);
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);
  const [centuryRotationOffset, setCenturyRotationOffset] = useState<number>(0);
  const [centuryBet365Mode, setCenturyBet365Mode] = useState<
    'SET_2_0' | 'TO_WIN_MATCH'
  >('SET_2_0');
  const [copiedLegSearchId, setCopiedLegSearchId] = useState<string | null>(
    null
  );
  const [updatingCentury, setUpdatingCentury] = useState<boolean>(false);
  const [bet365ModalPayload, setBet365ModalPayload] =
    useState<Bet365SlipPayload | null>(null);

  const handleActualizar100Odds = async () => {
    setUpdatingCentury(true);
    try {
      if (onRefreshCombines) {
        await onRefreshCombines();
      }
      setCenturyRotationOffset((prev) => prev + 1);
    } finally {
      setUpdatingCentury(false);
    }
  };

  const handleCopySlip = (ticket: CombineTicket, openBet365Modal: boolean = false) => {
    const unitMult = UNIT_MULTIPLIER_BY_CATEGORY[ticket.category] || 0.5;
    const stake = computeStakeForPick(
      currentSimulatedBankroll,
      bankrollConfig.startingBankroll,
      bankrollConfig,
      ticket.totalDecimalOdds,
      ticket.combinedEstimatedProbability,
      unitMult
    );
    const payload = buildBet365PayloadFromCombine(
      ticket,
      stake,
      bankrollConfig.currency
    );
    navigator.clipboard?.writeText?.(payload.formattedTicketText);
    setCopiedTicketId(ticket.id);
    setTimeout(() => setCopiedTicketId(null), 2500);
    if (openBet365Modal) {
      setBet365ModalPayload(payload);
    }
  };

  const combines: CombineTicket[] = useMemo(
    () =>
      report
        ? buildCombinesFromReport(
            report,
            true,
            centuryRotationOffset,
            centuryBet365Mode
          )
        : [],
    [report, centuryRotationOffset, centuryBet365Mode]
  );

  const allAvailableLegs: CombineLeg[] = useMemo(() => {
    if (!report) return [];
    const map = new Map<string, CombineLeg>();
    for (const c of combines) {
      for (const leg of c.legs) {
        if (!map.has(leg.match)) {
          map.set(leg.match, leg);
        }
      }
    }
    for (const cand of report.otherPicksConsidered || []) {
      if (!cand.decimalOdds || !cand.estimatedProbability) continue;
      if (!map.has(cand.match)) {
        map.set(cand.match, {
          id: cand.id,
          match: cand.match,
          tournament: cand.tournament,
          surface: cand.surface,
          matchStatus: cand.matchStatus,
          liveScore: cand.liveScore,
          selection: cand.selection,
          market: cand.market,
          decimalOdds: cand.decimalOdds,
          estimatedProbability: cand.estimatedProbability,
          edgePercent: cand.edgePercent || 0,
          reasoningShort: cand.reasoning.split('. ')[0] + '.',
          sourceUrl: cand.sourceUrls?.[0] || 'https://www.espn.com/tennis/scoreboard',
        });
      }
    }
    return Array.from(map.values());
  }, [report, combines]);

  if (loading && !report) {
    return (
      <section id="daily-combines" className="py-8 border-b border-[#DCD8CE]">
        <div className="dossier-card p-6 animate-pulse space-y-4">
          <div className="h-4 w-56 bg-[#EAE7DF]" />
          <div className="h-7 w-96 bg-[#EAE7DF]" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            <div className="h-48 bg-[#FAF9F5]" />
            <div className="h-48 bg-[#FAF9F5]" />
          </div>
        </div>
      </section>
    );
  }

  if (!report) return null;

  const sym = bankrollConfig.currency;

  const activeCustomLegs =
    customLegIds.length > 0
      ? allAvailableLegs.filter((l) => customLegIds.includes(l.id))
      : allAvailableLegs.slice(0, 2);

  const toggleCustomLeg = (id: string) => {
    setCustomLegIds((prev) => {
      const seed = prev.length > 0 ? prev : allAvailableLegs.slice(0, 2).map((l) => l.id);
      if (seed.includes(id)) {
        return seed.filter((item) => item !== id);
      }
      return [...seed, id];
    });
  };

  const customTotalOdds = Number(
    activeCustomLegs.reduce((acc, l) => acc * l.decimalOdds, 1).toFixed(2)
  );
  const customJointProb = Number(
    (
      activeCustomLegs.reduce((acc, l) => acc * (l.estimatedProbability / 100), 1) * 100
    ).toFixed(1)
  );
  const customImpliedProb =
    customTotalOdds > 1 ? Number(((1 / customTotalOdds) * 100).toFixed(1)) : 0;
  const customEvPercent = Number(
    (((customJointProb / 100) * customTotalOdds - 1) * 100).toFixed(2)
  );

  const customStakeCurrency = computeStakeForPick(
    currentSimulatedBankroll,
    bankrollConfig.startingBankroll,
    bankrollConfig,
    customTotalOdds,
    customJointProb,
    customUnitMultiplier
  );
  const customPotentialProfit = Number(
    (customStakeCurrency * Math.max(0, customTotalOdds - 1)).toFixed(2)
  );

  const handleStakeCustomCombine = async () => {
    if (activeCustomLegs.length === 0) return;
    const customTicket: CombineTicket = {
      id: `custom-combine-${Date.now()}`,
      category: 'TODAY_SURE',
      title: `Custom ${activeCustomLegs.length}-Leg Combine`,
      subtitle: 'User-Constructed Multi-Leg Parlay',
      targetOddsLabel: `Custom @${customTotalOdds.toFixed(2)}`,
      legs: activeCustomLegs,
      totalDecimalOdds: customTotalOdds,
      americanOdds:
        customTotalOdds >= 2
          ? `+${Math.round((customTotalOdds - 1) * 100)}`
          : `${Math.round(-100 / (customTotalOdds - 1))}`,
      combinedEstimatedProbability: customJointProb,
      combinedImpliedProbability: customImpliedProb,
      combinedExpectedValuePercent: customEvPercent,
      confidenceNote: 'Custom multi-leg ticket evaluated via surface Elo & live market model.',
      riskNote: 'All legs must win for the custom combine to settle as Won.',
      checkedAt: new Date().toISOString(),
    };
    const cand = combineTicketToCandidatePick(customTicket);
    await onRecordCombinePick(cand, customUnitMultiplier);
  };

  const displayedCombines =
    selectedTab === 'ALL' || selectedTab === 'CUSTOM'
      ? combines
      : combines.filter((c) => c.category === selectedTab);

  return (
    <section id="daily-combines" className="py-8 border-b border-[#DCD8CE]">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-slate-500 font-mono-tabular uppercase tracking-wider">
            Section 02 · Multi-Leg Value Accumulators · Pre-Match & Live In-Play
          </p>
          <h2 className="text-2xl sm:text-3xl font-display text-[#11161D] mt-1">
            Daily Sure Combines & Century Accumulators
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Curated multi-tier parlays calibrated by surface-Elo joint probabilities — featuring 2.00x, 5.00x, 10.00x, and the dedicated{' '}
            <strong className="font-semibold text-[#11161D]">Daily Short 100+ Odds Century Pick (3–5 legs)</strong>, plus an interactive{' '}
            <strong className="font-semibold text-[#11161D]">Custom Combine Slip Builder</strong>. Stakes are tailored to your{' '}
            <strong className="font-semibold text-[#11161D]">
              {currentSimulatedBankroll.toFixed(2)}
              {sym}
            </strong>{' '}
            simulated bankroll.
          </p>
        </div>

        {/* Architectural Filter Strip */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#E2E8F0] border border-[#CBD5E1] font-mono-tabular">
          {(
            [
              { id: 'ALL', label: 'All Combines' },
              { id: 'TODAY_SURE', label: 'Today Sure' },
              { id: 'ODDS_2', label: '2.00+ Odds' },
              { id: 'ODDS_5', label: '5.00+ Odds' },
              { id: 'ODDS_10', label: '10.00+ Odds' },
              { id: 'ODDS_100', label: 'Short 100+ Odds (Bet365)' },
              { id: 'LIVE_SURE', label: 'Live Combine' },
              { id: 'CUSTOM', label: '+ Custom Builder' },
              { id: 'GRAPHS', label: 'Win/Loss Graphs' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTab(tab.id)}
              className={`px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedTab === tab.id
                  ? tab.id === 'ODDS_100'
                    ? 'bg-[#00543C] text-[#FFDF1B]'
                    : 'bg-[#0B1118] text-[#D4A853]'
                  : tab.id === 'ODDS_100'
                  ? 'text-[#00543C] hover:bg-white'
                  : 'text-slate-700 hover:text-[#0F172A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Multi-Tier Overview Strip (Up to 6 Tiers) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px dossier-grid-hairline mb-6">
        {combines.map((c) => {
          const isLive = c.category === 'LIVE_SURE';
          const isCentury = c.category === 'ODDS_100';
          const isActive = selectedTab === c.category;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() =>
                setSelectedTab(selectedTab === c.category ? 'ALL' : c.category)
              }
              className={`p-4 text-left transition-colors cursor-pointer ${
                isActive
                  ? isCentury
                    ? 'bg-[#F1F5F9] border-t-2 border-t-[#00543C]'
                    : 'bg-[#F1F5F9] border-t-2 border-t-[#0A5C36]'
                  : 'bg-white hover:bg-[#F8F9FA]'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono-tabular">
                <span
                  className={
                    isCentury
                      ? 'text-[#00543C] font-bold'
                      : isLive
                      ? 'text-[#0A5C36] font-bold'
                      : ''
                  }
                >
                  {isCentury ? '100+ ODDS' : c.targetOddsLabel}
                </span>
                <span>{c.legs.length} Legs</span>
              </div>
              <div className="text-sm font-display font-semibold text-[#0F172A] mt-1 truncate">
                {c.title}
              </div>
              <div className="mt-1.5 flex items-baseline justify-between font-mono-tabular">
                <span
                  className={`text-lg font-bold tabular-nums ${
                    isCentury ? 'text-[#00543C]' : 'text-[#0A5C36]'
                  }`}
                >
                  @{c.totalDecimalOdds.toFixed(2)}
                </span>
                <span className="text-[11px] text-slate-600 tabular-nums">
                  {c.combinedEstimatedProbability.toFixed(1)}% Win
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[10px] text-slate-500 font-mono-tabular">
                <span
                  className="text-[#0A5C36] hover:underline font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGraphicFocusedCategory(c.category);
                    setSelectedTab('GRAPHS');
                  }}
                >
                  Win/Loss Graph →
                </span>
                <span className="text-[10px] text-slate-400">
                  {isCentury ? 'Bet365 Ready' : 'Audited'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Custom Combine Builder Drawer */}
      {selectedTab === 'CUSTOM' && (
        <div className="dossier-card border-t-2 border-t-[#0B1118] p-5 sm:p-6 mb-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DCD8CE] pb-4">
            <div>
              <div className="text-xs font-mono-tabular font-semibold uppercase tracking-wider text-[#0D5C3A]">
                Custom Multi-Leg Ticket Constructor
              </div>
              <h3 className="text-xl font-display text-[#11161D] mt-0.5">
                Interactive Custom Combine Slip Builder
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Select any combination of verified pre-match or live legs below to calculate real-time combined decimal odds, joint win probability, combined EV %, and exact Bankroll Simulator payout.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTab('ALL')}
              className="text-xs font-mono-tabular text-slate-600 hover:text-[#11161D] underline self-start sm:self-auto cursor-pointer"
            >
              Return to Standard 5 Combines
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Leg Picker Pool */}
            <div className="lg:col-span-7 space-y-2">
              <div className="text-xs font-mono-tabular font-semibold uppercase tracking-wider text-[#11161D] mb-2">
                Select Matches to Combine ({activeCustomLegs.length} Legs Active):
              </div>
              <div className="max-h-80 overflow-y-auto border border-[#DCD8CE] divide-y divide-[#EAE7DF]">
                {allAvailableLegs.map((leg) => {
                  const isSelected = activeCustomLegs.some((l) => l.id === leg.id);
                  return (
                    <button
                      key={leg.id}
                      type="button"
                      onClick={() => toggleCustomLeg(leg.id)}
                      className={`w-full p-3 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#FAF9F5]' : 'bg-white hover:bg-[#FAF9F5]/60'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] text-slate-500 font-mono-tabular truncate">
                          {leg.matchStatus === 'IN_PROGRESS' ? (
                            <span className="text-[#0D5C3A] font-bold">
                              ● LIVE ({leg.liveScore || 'In Play'})
                            </span>
                          ) : (
                            <span>PRE-MATCH</span>
                          )}{' '}
                          · {leg.tournament} · {leg.surface}
                        </div>
                        <div className="text-xs sm:text-sm font-semibold text-[#11161D] truncate">
                          {leg.selection}{' '}
                          <span className="font-normal text-slate-500 text-xs">
                            ({leg.match})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 font-mono-tabular">
                        <div className="text-right">
                          <div className="text-xs font-bold text-[#11161D]">
                            @{leg.decimalOdds.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {leg.estimatedProbability.toFixed(1)}% Win
                          </div>
                        </div>
                        <div
                          className={`w-6 h-6 flex items-center justify-center text-xs font-bold border ${
                            isSelected
                              ? 'bg-[#0B1118] text-[#D4A853] border-[#0B1118]'
                              : 'bg-white text-slate-500 border-[#C7C2B6]'
                          }`}
                        >
                          {isSelected ? '✓' : '+'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Live Custom Combine Ticket Summary */}
            <div className="lg:col-span-5 bg-[#FAF9F5] border border-[#DCD8CE] p-4 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-baseline justify-between border-b border-[#DCD8CE] pb-2">
                  <span className="text-sm font-display text-[#11161D]">
                    Custom {activeCustomLegs.length}-Leg Combine
                  </span>
                  <span className="text-xl font-mono-tabular font-bold text-[#0D5C3A]">
                    {customTotalOdds.toFixed(2)}x
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-px dossier-grid-hairline font-mono-tabular text-xs">
                  <div className="bg-white p-2.5">
                    <span className="text-slate-500 block font-sans text-[10px]">
                      Joint Win Prob
                    </span>
                    <span className="font-semibold text-[#11161D]">
                      {customJointProb.toFixed(1)}%
                    </span>
                  </div>
                  <div className="bg-white p-2.5">
                    <span className="text-slate-500 block font-sans text-[10px]">
                      Break-Even
                    </span>
                    <span className="font-semibold text-[#11161D]">
                      {customImpliedProb.toFixed(1)}%
                    </span>
                  </div>
                  <div className="bg-white p-2.5">
                    <span className="text-slate-500 block font-sans text-[10px]">
                      Combined EV
                    </span>
                    <span
                      className={`font-semibold ${
                        customEvPercent >= 0 ? 'text-[#0D5C3A]' : 'text-[#C2492A]'
                      }`}
                    >
                      {customEvPercent >= 0 ? '+' : ''}
                      {customEvPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Selected Legs List */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {activeCustomLegs.map((l, i) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between text-xs bg-white border border-[#DCD8CE] px-2.5 py-1.5"
                    >
                      <span className="truncate font-medium text-[#11161D]">
                        {i + 1}. {l.selection}
                      </span>
                      <div className="flex items-center gap-2 shrink-0 font-mono-tabular">
                        <span className="text-[#11161D] font-semibold">
                          @{l.decimalOdds.toFixed(2)}
                        </span>
                        {activeCustomLegs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => toggleCustomLeg(l.id)}
                            className="text-slate-400 hover:text-[#C2492A] cursor-pointer px-1"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Unit Multiplier Selector */}
                <div className="pt-2 border-t border-[#DCD8CE] flex items-center justify-between text-xs">
                  <span className="text-slate-600">Unit Stake Multiplier:</span>
                  <div className="flex items-center gap-1 font-mono-tabular">
                    {[0.25, 0.5, 1.0].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setCustomUnitMultiplier(u)}
                        className={`px-2 py-0.5 border cursor-pointer ${
                          customUnitMultiplier === u
                            ? 'bg-[#0B1118] text-[#D4A853] border-[#0B1118]'
                            : 'bg-white text-slate-700 border-[#C7C2B6]'
                        }`}
                      >
                        {u}u
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#DCD8CE] space-y-2">
                <div className="flex justify-between text-xs font-mono-tabular">
                  <span className="text-slate-600">
                    Simulator Stake ({customStakeCurrency.toFixed(2)}
                    {sym}):
                  </span>
                  <span className="font-semibold text-[#0D5C3A]">
                    Win +{customPotentialProfit.toFixed(2)}
                    {sym} (Bal:{' '}
                    {(currentSimulatedBankroll + customPotentialProfit).toFixed(2)}
                    {sym})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const payload = buildBet365PayloadFromSlipLegs(
                        activeCustomLegs,
                        customStakeCurrency,
                        sym,
                        `Custom ${activeCustomLegs.length}-Leg Combine`
                      );
                      navigator.clipboard?.writeText?.(payload.formattedTicketText);
                      setBet365ModalPayload(payload);
                    }}
                    disabled={activeCustomLegs.length === 0}
                    className="w-full py-2.5 px-3 text-xs font-mono-tabular font-bold uppercase tracking-wider bg-[#00543C] hover:bg-[#007A57] text-[#FFDF1B] border border-[#FFDF1B]/50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    bet365 · Copy & Play Slip ↗
                  </button>
                  <button
                    type="button"
                    onClick={handleStakeCustomCombine}
                    disabled={recordingPick || activeCustomLegs.length === 0}
                    className="w-full py-2.5 px-3 text-xs font-mono-tabular font-semibold uppercase tracking-wider bg-[#0B1118] hover:bg-[#18222F] text-[#D4A853] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Stake {customStakeCurrency.toFixed(2)}
                    {sym} in Simulator
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Combine Tickets Grid or Direct Graphic View */}
      {selectedTab === 'GRAPHS' ? (
        <div className="space-y-6">
          <CombinePerformanceGraphic
            results={results}
            currencySymbol={sym}
            initialCategory={graphicFocusedCategory}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {displayedCombines.map((ticket, tIdx) => {
          const candidatePick = combineTicketToCandidatePick(ticket);
          const isRecorded = recordedMatches.has(candidatePick.match);
          const unitMult = UNIT_MULTIPLIER_BY_CATEGORY[ticket.category] || 0.5;

          const recommendedStake = computeStakeForPick(
            currentSimulatedBankroll,
            bankrollConfig.startingBankroll,
            bankrollConfig,
            ticket.totalDecimalOdds,
            ticket.combinedEstimatedProbability,
            unitMult
          );
          const potentialNetProfit = Number(
            (recommendedStake * (ticket.totalDecimalOdds - 1)).toFixed(2)
          );
          const totalPayout = Number((recommendedStake + potentialNetProfit).toFixed(2));
          const isLiveCombine = ticket.category === 'LIVE_SURE';
          const isCentury = ticket.category === 'ODDS_100';

          return (
            <div
              key={ticket.id}
              className={`dossier-card flex flex-col justify-between ${
                isCentury
                  ? 'border border-[#00543C] border-t-3 border-t-[#00543C]'
                  : ticket.category === 'ODDS_10' && displayedCombines.length === 5
                  ? 'lg:col-span-2'
                  : ''
              }`}
            >
              <div>
                {/* Special 100+ Odds Banner (Unboxed Kicker + Interactive Controls) */}
                {isCentury && (
                  <div className="bg-[#00543C] border-b border-[#007A57] px-4 sm:px-5 py-3 text-xs font-mono-tabular text-white space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white">
                          bet<span className="text-[#FFDF1B]">365</span> Ready 100+ Sure Odds
                        </span>
                        <span aria-hidden="true" className="text-[#66B29B]">·</span>
                        <span className="text-slate-100">
                          {ticket.legs.length} Active Legs
                        </span>
                        <span aria-hidden="true" className="text-[#66B29B]">·</span>
                        <span className="text-[#FFDF1B] font-semibold">
                          Auto-Actualizado
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleActualizar100Odds}
                        disabled={updatingCentury}
                        className="px-3 py-1 bg-[#FFDF1B] hover:bg-[#F5D000] text-[#0B1118] font-mono-tabular font-bold text-xs tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        title="Actualizar 100x Sure Odds with the highest-winning-potential active Bet365 matches"
                      >
                        {updatingCentury
                          ? 'Actualizando 100x...'
                          : 'Actualizar 100x Sure Picks'}
                      </button>
                    </div>

                    {/* Bet365 Market Style Switcher for 100+ Odds */}
                    <div className="pt-2 border-t border-[#007A57] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <span className="text-slate-200 font-medium">
                        Bet365 Easy-Play Format:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCenturyBet365Mode('SET_2_0')}
                          className={`px-2.5 py-1 font-mono-tabular font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            centuryBet365Mode === 'SET_2_0'
                              ? 'bg-[#FFDF1B] text-[#0B1118] border-[#FFDF1B]'
                              : 'bg-[#003D2B] text-slate-200 border-[#007A57] hover:text-white'
                          }`}
                        >
                          5-Leg Set Betting (2-0)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCenturyBet365Mode('TO_WIN_MATCH')}
                          className={`px-2.5 py-1 font-mono-tabular font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            centuryBet365Mode === 'TO_WIN_MATCH'
                              ? 'bg-[#FFDF1B] text-[#0B1118] border-[#FFDF1B]'
                              : 'bg-[#003D2B] text-slate-200 border-[#007A57] hover:text-white'
                          }`}
                        >
                          6-Leg 1-Click "To Win Match"
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ticket Header */}
                <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8F9FA]">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono-tabular text-slate-600">
                      <span
                        className={
                          isCentury
                            ? 'font-bold text-[#00543C]'
                            : isLiveCombine
                            ? 'font-bold text-[#0A5C36]'
                            : 'font-bold text-[#0F172A]'
                        }
                      >
                        {isCentury
                          ? '100+ Odds Short Pick (Daily Special)'
                          : isLiveCombine
                          ? 'Live In-Play Combine'
                          : `0${tIdx + 1}. ${ticket.targetOddsLabel}`}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{ticket.legs.length} Verified Selections</span>
                    </div>
                    <h3 className="text-2xl font-display font-semibold text-[#0F172A] mt-1">
                      {ticket.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{ticket.subtitle}</p>
                  </div>

                  <div className="sm:text-right font-mono-tabular shrink-0">
                    <div className="text-[11px] text-slate-500">
                      Combined Price
                    </div>
                    <div
                      className={`text-2xl font-bold tabular-nums ${
                        isCentury ? 'text-[#00543C]' : 'text-[#0A5C36]'
                      }`}
                    >
                      {ticket.totalDecimalOdds.toFixed(2)}x{' '}
                      <span className="text-xs font-normal text-slate-500">
                        ({ticket.americanOdds})
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopySlip(ticket, true)}
                        className="text-xs font-mono-tabular font-bold px-2.5 py-1 bg-[#00543C] hover:bg-[#007A57] text-[#FFDF1B] border border-[#003D2B] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center justify-center gap-1"
                        title="Copy Bet365 formatted slip and open Direct Bet365 Play Builder"
                      >
                        <span>bet365 Slip ↗</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopySlip(ticket, false)}
                        className="text-xs font-mono-tabular font-medium px-2 py-1 border border-[#CBD5E1] bg-white hover:bg-[#F8F9FA] text-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center justify-center gap-1"
                        title="Copy Bet365 slip lines to clipboard"
                      >
                        {copiedTicketId === ticket.id ? (
                          <span className="text-[#0A5C36] font-bold">✓ Copied</span>
                        ) : (
                          <span>Copy</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4-Metric Quantitative Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px dossier-grid-hairline border-b border-[#E2E8F0] text-xs font-mono-tabular">
                  <div className="bg-white p-3">
                    <span className="text-slate-500 block font-sans text-[11px]">
                      Joint Win Prob.
                    </span>
                    <span className="text-sm font-semibold text-[#0F172A] mt-0.5 block tabular-nums">
                      {ticket.combinedEstimatedProbability.toFixed(1)}%
                    </span>
                  </div>
                  <div className="bg-white p-3">
                    <span className="text-slate-500 block font-sans text-[11px]">
                      Break-Even Implied
                    </span>
                    <span className="text-sm font-semibold text-[#0F172A] mt-0.5 block tabular-nums">
                      {ticket.combinedImpliedProbability.toFixed(1)}%
                    </span>
                  </div>
                  <div className="bg-white p-3">
                    <span className="text-slate-500 block font-sans text-[11px]">
                      Combined EV
                    </span>
                    <span
                      className={`text-sm font-semibold mt-0.5 block tabular-nums ${
                        ticket.combinedExpectedValuePercent >= 0
                          ? 'text-[#0A5C36]'
                          : 'text-slate-700'
                      }`}
                    >
                      {ticket.combinedExpectedValuePercent >= 0 ? '+' : ''}
                      {ticket.combinedExpectedValuePercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="bg-white p-3">
                    <span className="text-slate-500 block font-sans text-[11px]">
                      {recommendedStake.toFixed(2)}
                      {sym} Stake Return
                    </span>
                    <span className="text-sm font-semibold text-[#0A5C36] mt-0.5 block tabular-nums">
                      {totalPayout.toFixed(2)}
                      {sym} (+{potentialNetProfit.toFixed(2)}
                      {sym})
                    </span>
                  </div>
                </div>

                {/* Individual Combine Legs List */}
                <div className="divide-y divide-[#E2E8F0]">
                  {ticket.legs.map((leg, idx) => {
                    const b365 = mapToBet365Market(
                      leg.match,
                      leg.selection,
                      leg.market,
                      leg.matchStatus
                    );
                    const legUniqueKey = `${ticket.id}-${leg.id}-${idx}`;
                    return (
                    <div key={legUniqueKey} className="p-4 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500 font-mono-tabular mb-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-[#0F172A]">
                            0{idx + 1}.
                          </span>
                          <span>{leg.tournament}</span>
                          <span aria-hidden="true">·</span>
                          <span>{leg.surface}</span>
                          <span aria-hidden="true">·</span>
                          {leg.matchStatus === 'IN_PROGRESS' ? (
                            <span className="text-[#0A5C36] font-semibold">
                              Live ({leg.liveScore || 'In Play'})
                            </span>
                          ) : (
                            <span>Pre-Match</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText?.(b365.bet365SearchQuery);
                              setCopiedLegSearchId(legUniqueKey);
                              setTimeout(() => setCopiedLegSearchId(null), 2000);
                            }}
                            className="px-2 py-0.5 bg-[#00543C] text-[#FFDF1B] font-mono-tabular font-bold text-[11px] hover:bg-[#007A57] whitespace-nowrap shrink-0 cursor-pointer"
                            title={`Copy "${b365.bet365SearchQuery}" to paste in Bet365 search bar`}
                          >
                            {copiedLegSearchId === legUniqueKey
                              ? '✓ Search Copied!'
                              : `Copy "${b365.bet365SearchQuery}"`}
                          </button>
                          <a
                            href={`https://www.bet365.com/#/AX/K%5E${encodeURIComponent(
                              b365.bet365SearchQuery
                            )}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              navigator.clipboard?.writeText?.(b365.bet365SearchQuery);
                            }}
                            className="px-2 py-0.5 bg-[#0B1118] text-white font-mono-tabular font-semibold text-[11px] hover:bg-[#1E293B] whitespace-nowrap shrink-0"
                            title={`Open "${b365.bet365SearchQuery}" on Bet365`}
                          >
                            Find on bet365 ↗
                          </a>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                        <div>
                          <span className="font-semibold text-[#0F172A] text-sm">
                            {leg.selection}
                          </span>{' '}
                          <span className="text-slate-500">({leg.match})</span>
                        </div>
                        <div className="font-mono-tabular shrink-0 tabular-nums">
                          <span className="font-bold text-[#0F172A]">
                            @{leg.decimalOdds.toFixed(2)}
                          </span>
                          <span className="text-slate-500 ml-1.5">
                            ({leg.estimatedProbability.toFixed(1)}% Est. Win)
                          </span>
                        </div>
                      </div>

                      {/* Direct Bet365 Step-by-Step Navigation Strip (Clean Unboxed Text) */}
                      <div className="mt-2 pt-2 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 font-mono-tabular text-[11px] text-slate-600">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-[#00543C]">
                            bet365 Path:
                          </span>
                          <span>
                            1. Search <strong className="text-[#0F172A]">"{b365.bet365SearchQuery}"</strong>
                          </span>
                          <span aria-hidden="true">→</span>
                          <span>
                            2. <strong className="text-[#0F172A]">{b365.bet365MarketTitle}</strong>
                          </span>
                          <span aria-hidden="true">→</span>
                          <span>
                            3. Tap <strong className="text-[#0A5C36]">{b365.bet365SelectionText}</strong>
                          </span>
                        </div>
                        <a
                          href={leg.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-[#0F172A] underline text-[11px]"
                        >
                          Citation ↗
                        </a>
                      </div>

                      <p className="text-slate-600 mt-1.5 leading-relaxed">
                        {leg.reasoningShort}
                      </p>
                    </div>
                  );
                  })}
                </div>
              </div>

              {/* Ticket Footer: Bankroll Simulator Stake & Action */}
              <div className="p-4 bg-[#F8F9FA] border-t border-[#E2E8F0] space-y-3">
                <div className="text-xs text-slate-600">
                  <strong className="font-semibold text-[#0F172A]">Thesis:</strong>{' '}
                  {ticket.confidenceNote}
                </div>

                <div className="pt-2.5 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs font-mono-tabular text-slate-700 tabular-nums">
                    <div>
                      Simulator Stake ({unitMult}u):{' '}
                      <strong className="text-[#0F172A]">
                        {recommendedStake.toFixed(2)}
                        {sym}
                      </strong>{' '}
                      → Net Profit:{' '}
                      <strong className="text-[#0A5C36]">
                        +{potentialNetProfit.toFixed(2)}
                        {sym}
                      </strong>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Bankroll if Won:{' '}
                      {(currentSimulatedBankroll + potentialNetProfit).toFixed(2)}
                      {sym}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopySlip(ticket, true)}
                      className="px-3 py-2 text-xs font-mono-tabular font-bold bg-[#00543C] hover:bg-[#007A57] text-[#FFDF1B] border border-[#003D2B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      title="Copy Bet365 slip and launch Direct Play Assistant"
                    >
                      {copiedTicketId === ticket.id
                        ? '✓ Bet365 Slip Copied'
                        : 'bet365 · Copy & Play Directly ↗'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRecordCombinePick(candidatePick, unitMult)}
                      disabled={isRecorded || recordingPick}
                      className={`px-4 py-2 text-xs font-mono-tabular font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isRecorded
                          ? 'bg-white text-slate-500 border border-[#E2E8F0] cursor-default'
                          : 'bg-[#0B1118] text-[#D4A853] hover:bg-[#18222F]'
                      }`}
                    >
                      {isRecorded
                        ? '✓ Staked in Bankroll & Results'
                        : `Stake ${recommendedStake.toFixed(2)}${sym} in Simulator`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Statistical Graphics Section Below Combines */}
      <div className="mt-10 pt-8 border-t border-[#DCD8CE]">
        <CombinePerformanceGraphic
          results={results}
          currencySymbol={sym}
          initialCategory="ALL"
        />
      </div>
        </>
      )}

      {/* Bet365 Direct Play & Slip Builder Modal */}
      <Bet365DirectPlayModal
        payload={bet365ModalPayload}
        onClose={() => setBet365ModalPayload(null)}
      />
    </section>
);
};
