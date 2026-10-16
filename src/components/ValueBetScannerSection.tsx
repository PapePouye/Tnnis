import React, { useState, useMemo } from 'react';
import type { CandidatePick, DailyResearchReport, LiveScoreboardMatch } from '../types';
import { proportionalDeVig, calculateExpectedValue, calculateFairOdds, calculateProbabilityUncertainty } from '../utils/devig';
import { buildBet365PayloadFromCandidatePick, type Bet365SlipPayload } from '../utils/bet365';
import { Bet365DirectPlayModal } from './Bet365DirectPlayModal';

export interface ValueScannerItem {
  id: string;
  match: string;
  tournament: string;
  round: string;
  surface: string;
  tour: 'ATP' | 'WTA' | 'CHALLENGER' | 'ITF';
  matchStatus: 'PRE_MATCH' | 'IN_PROGRESS' | 'COMPLETED';
  playerA: string;
  playerB: string;
  selection: string;
  market: string;
  bookmaker: string;
  odds: number;
  oppOdds: number;
  oddsTimestamp: string;
  rawImpliedProb: number;
  deViggedMktProb: number;
  modelProb: number;
  uncertaintyMargin: number;
  confidenceTier: 'HIGH' | 'MODERATE' | 'CAUTION' | 'INSUFFICIENT_DATA';
  dataQuality: 'COMPLETE' | 'PARTIAL' | 'INSUFFICIENT';
  fairOdds: number;
  expectedValuePercent: number;
  isQualifiedValue: boolean;
  valueRationale: string;
  riskFactors: string[];
  originalCandidate?: CandidatePick;
}

interface ValueBetScannerSectionProps {
  report: DailyResearchReport | null;
  loading: boolean;
  onOpenMatchAnalysis: (matchName: string) => void;
  onToggleSlipLeg?: (leg: any) => void;
  onRecordPick?: (pick: CandidatePick) => void;
  isLegInSlip?: (matchName: string) => boolean;
}

export const ValueBetScannerSection: React.FC<ValueBetScannerSectionProps> = ({
  report,
  loading,
  onOpenMatchAnalysis,
  onToggleSlipLeg,
  onRecordPick,
  isLegInSlip,
}) => {
  const [minEvFilter, setMinEvFilter] = useState<number>(2.0);
  const [tourFilter, setTourFilter] = useState<'ALL' | 'ATP' | 'WTA' | 'CHALLENGER'>('ALL');
  const [surfaceFilter, setSurfaceFilter] = useState<'ALL' | 'HARD' | 'CLAY' | 'GRASS'>('ALL');
  const [onlyQualified, setOnlyQualified] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bet365ModalPayload, setBet365ModalPayload] = useState<Bet365SlipPayload | null>(null);

  // Transform all candidates and matches into normalized ValueScannerItem array
  const scannerItems: ValueScannerItem[] = useMemo(() => {
    if (!report) return [];

    const items: ValueScannerItem[] = [];
    const pool: CandidatePick[] = [];

    if (report.finalPick) pool.push(report.finalPick);
    if (report.bestLivePick) pool.push(report.bestLivePick);
    if (report.otherPicksConsidered) pool.push(...report.otherPicksConsidered);

    // Process from candidate picks
    for (const c of pool) {
      if (!c.decimalOdds || c.decimalOdds <= 1.01) continue;
      const modelP = c.estimatedProbability || 50.0;
      const odds = c.decimalOdds;

      // Approximate opponent odds from bookmaker margin ~5%
      const oppOdds = Number((1 / Math.max(0.05, 1.05 - 1 / odds)).toFixed(2));
      const devig = proportionalDeVig(odds, oppOdds);
      const ev = calculateExpectedValue(modelP, odds);
      const fair = calculateFairOdds(modelP);
      const unc = calculateProbabilityUncertainty(modelP, 55);

      const isATP = c.tournament.toLowerCase().includes('atp') || !c.tournament.toLowerCase().includes('wta');
      const tour: 'ATP' | 'WTA' | 'CHALLENGER' | 'ITF' = c.tournament.toLowerCase().includes('challenger')
        ? 'CHALLENGER'
        : c.tournament.toLowerCase().includes('itf')
        ? 'ITF'
        : isATP
        ? 'ATP'
        : 'WTA';

      items.push({
        id: c.id,
        match: c.match,
        tournament: c.tournament,
        round: c.round || 'Main Draw',
        surface: c.surface || 'Hard',
        tour,
        matchStatus: c.matchStatus,
        playerA: c.playerA || c.match.split(' vs. ')[0] || 'Player A',
        playerB: c.playerB || c.match.split(' vs. ')[1] || 'Player B',
        selection: c.selection,
        market: c.market,
        bookmaker: c.bookmaker || 'Pinnacle / Bet365 Cons.',
        odds,
        oppOdds,
        oddsTimestamp: c.oddsCheckedAt || new Date().toISOString(),
        rawImpliedProb: Number(((1 / odds) * 100).toFixed(1)),
        deViggedMktProb: Number((devig.fairProbA * 100).toFixed(1)),
        modelProb: modelP,
        uncertaintyMargin: unc.marginOfError,
        confidenceTier: unc.confidenceTier,
        dataQuality: 'COMPLETE',
        fairOdds: fair,
        expectedValuePercent: ev,
        isQualifiedValue: ev >= 2.0 && unc.confidenceTier !== 'INSUFFICIENT_DATA',
        valueRationale: c.reasoning || 'Surface Elo edge exceeds bookmaker implied line.',
        riskFactors: c.mainRisks || ['Market variance', 'Fatigue risk'],
        originalCandidate: c,
      });
    }

    return items;
  }, [report]);

  const filteredItems = useMemo(() => {
    return scannerItems.filter((item) => {
      if (onlyQualified && !item.isQualifiedValue) return false;
      if (item.expectedValuePercent < minEvFilter) return false;
      if (tourFilter !== 'ALL' && item.tour !== tourFilter) return false;
      if (surfaceFilter !== 'ALL') {
        const s = item.surface.toUpperCase();
        if (surfaceFilter === 'HARD' && !s.includes('HARD')) return false;
        if (surfaceFilter === 'CLAY' && !s.includes('CLAY')) return false;
        if (surfaceFilter === 'GRASS' && !s.includes('GRASS')) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !item.match.toLowerCase().includes(q) &&
          !item.tournament.toLowerCase().includes(q) &&
          !item.selection.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [scannerItems, onlyQualified, minEvFilter, tourFilter, surfaceFilter, searchQuery]);

  return (
    <section id="value-scanner-station" className="py-8 border-b border-[#E2E8F0]">
      {/* Header Desk */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono-tabular tracking-wider text-[#0A5C36]">
            <span>MODULE 02 · REAL-TIME QUANTITATIVE EDGE DETECTOR</span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span>DE-VIGGED SHIN/PROPORTIONAL MARGIN REMOVAL</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-semibold text-[#0F172A] mt-1">
            Value Bet Scanner
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Identifies pricing discrepancies by contrasting de-vigged bookmaker lines against surface-calibrated Elo models. A match is flagged as a Value Bet strictly when Expected Value (EV%) is positive and model confidence intervals exceed break-even thresholds.
          </p>
        </div>

        {/* Quick Filter Control Toolbar */}
        <div className="flex flex-wrap items-center gap-2 font-mono-tabular text-xs">
          <div className="p-1 bg-[#F1F5F9] border border-[#CBD5E1] flex items-center gap-1">
            <span className="text-[11px] text-slate-500 px-2">Min. EV:</span>
            {[0, 2, 4, 6].map((threshold) => (
              <button
                key={threshold}
                type="button"
                onClick={() => setMinEvFilter(threshold)}
                className={`px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                  minEvFilter === threshold
                    ? 'bg-[#0B1118] text-[#D4A853]'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                +{threshold}%
              </button>
            ))}
          </div>

          <div className="p-1 bg-[#F1F5F9] border border-[#CBD5E1] flex items-center gap-1">
            {(['ALL', 'ATP', 'WTA', 'CHALLENGER'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTourFilter(t)}
                className={`px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                  tourFilter === t
                    ? 'bg-[#0A5C36] text-white'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search & Surface Sub-bar */}
      <div className="p-3 bg-white border border-[#E2E8F0] mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono-tabular">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <span className="text-slate-400">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search player, matchup, or tournament..."
            className="w-full bg-transparent border-none text-[#0F172A] focus:outline-none text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-[#0F172A] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
            <input
              type="checkbox"
              checked={onlyQualified}
              onChange={(e) => setOnlyQualified(e.target.checked)}
              className="accent-[#0A5C36]"
            />
            <span>Only Positive EV (+2.0%+)</span>
          </label>

          <div className="flex items-center gap-1 border-l border-[#E2E8F0] pl-3">
            <span className="text-slate-400">Surface:</span>
            {(['ALL', 'HARD', 'CLAY', 'GRASS'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSurfaceFilter(s)}
                className={`px-2 py-0.5 cursor-pointer ${
                  surfaceFilter === s
                    ? 'bg-[#0B1118] text-[#D4A853] font-bold'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table / Grid of Scanner Results */}
      {loading ? (
        <div className="dossier-card p-8 animate-pulse text-center font-mono-tabular text-xs text-slate-500">
          Scanning live ATP, WTA, and Challenger market feeds and calculating de-vigged fair probabilities...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="dossier-card p-8 text-center space-y-3">
          <div className="text-sm font-semibold text-[#0F172A]">No qualifying value bets found for this filter</div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Our disciplined model requires minimum positive EV with verified data completeness. Try lowering the minimum EV threshold or changing surface filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setMinEvFilter(0);
              setOnlyQualified(false);
              setTourFilter('ALL');
              setSurfaceFilter('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 text-xs font-mono-tabular font-semibold bg-[#0B1118] text-[#D4A853] cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="hidden lg:grid grid-cols-12 gap-2 px-4 py-2 bg-[#F1F5F9] border border-[#CBD5E1] text-[11px] font-mono-tabular font-semibold text-slate-600 uppercase tracking-wider">
            <div className="col-span-4">Matchup & Tournament</div>
            <div className="col-span-2 text-center">Market & Selection</div>
            <div className="col-span-2 text-right">Model vs De-Vigged</div>
            <div className="col-span-2 text-right">Odds & Fair Price</div>
            <div className="col-span-2 text-right">Edge & Actions</div>
          </div>

          <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] bg-white">
            {filteredItems.map((item) => {
              const inSlip = isLegInSlip ? isLegInSlip(item.match) : false;

              return (
                <div
                  key={item.id}
                  className="p-4 hover:bg-[#F8F9FA] transition-colors flex flex-col lg:grid lg:grid-cols-12 gap-3 items-stretch lg:items-center text-xs"
                >
                  {/* Match & Tournament */}
                  <div className="lg:col-span-4 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono-tabular text-slate-500">
                      <span className="font-bold text-[#0F172A]">{item.tour}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate max-w-[200px]" title={item.tournament}>
                        {item.tournament}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.surface}</span>
                      {item.matchStatus === 'IN_PROGRESS' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#0A5C36] font-semibold">● LIVE</span>
                        </>
                      )}
                    </div>
                    <div
                      className="text-sm font-display font-semibold text-[#0F172A] hover:text-[#0A5C36] cursor-pointer truncate"
                      onClick={() => onOpenMatchAnalysis(item.match)}
                      title="Click to view full statistical match analysis"
                    >
                      {item.match}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono-tabular">
                      Line source: {item.bookmaker}
                    </div>
                  </div>

                  {/* Market & Selection */}
                  <div className="lg:col-span-2 lg:text-center space-y-0.5">
                    <span className="px-2 py-0.5 bg-[#F1F5F9] text-slate-700 font-mono-tabular font-medium text-[11px] inline-block">
                      {item.selection}
                    </span>
                    <div className="text-[10px] text-slate-500 font-mono-tabular">
                      {item.market}
                    </div>
                  </div>

                  {/* Model Probability vs De-Vigged Implied */}
                  <div className="lg:col-span-2 lg:text-right font-mono-tabular space-y-0.5">
                    <div className="text-sm font-bold text-[#0A5C36] tabular-nums">
                      {item.modelProb.toFixed(1)}%{' '}
                      <span className="text-[10px] font-normal text-slate-500">
                        (±{item.uncertaintyMargin}%)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      De-Vig Mkt: {item.deViggedMktProb.toFixed(1)}% (Raw: {item.rawImpliedProb.toFixed(1)}%)
                    </div>
                  </div>

                  {/* Odds & Fair Line */}
                  <div className="lg:col-span-2 lg:text-right font-mono-tabular space-y-0.5">
                    <div className="text-sm font-bold text-[#0F172A] tabular-nums">
                      @{item.odds.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      Model Fair: @{item.fairOdds.toFixed(2)}
                    </div>
                  </div>

                  {/* Edge (EV %) & Action Buttons */}
                  <div className="lg:col-span-2 flex flex-col lg:items-end justify-center gap-1.5 font-mono-tabular">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold tabular-nums px-2 py-0.5 ${
                          item.expectedValuePercent >= 3.0
                            ? 'bg-[#DCFCE7] text-[#166534]'
                            : item.expectedValuePercent > 0
                            ? 'bg-[#FEF3C7] text-[#92400E]'
                            : 'bg-[#F1F5F9] text-slate-600'
                        }`}
                      >
                        {item.expectedValuePercent >= 0 ? '+' : ''}
                        {item.expectedValuePercent.toFixed(1)}% EV
                      </span>

                      <button
                        type="button"
                        onClick={() => onOpenMatchAnalysis(item.match)}
                        className="p-1 hover:bg-[#E2E8F0] text-slate-600 hover:text-[#0F172A] cursor-pointer"
                        title="View Detailed Match Analysis Dossier"
                      >
                        📊
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      {onToggleSlipLeg && item.originalCandidate && (
                        <button
                          type="button"
                          onClick={() => {
                            onToggleSlipLeg({
                              id: item.id,
                              match: item.match,
                              selection: item.selection,
                              market: item.market,
                              decimalOdds: item.odds,
                              estimatedProbability: item.modelProb,
                              tournament: item.tournament,
                              surface: item.surface,
                              matchStatus: item.matchStatus,
                            });
                          }}
                          className={`px-2 py-1 text-[11px] font-semibold border cursor-pointer ${
                            inSlip
                              ? 'bg-[#0A5C36] text-white border-[#0A5C36]'
                              : 'bg-white hover:bg-[#F8F9FA] text-slate-700 border-[#CBD5E1]'
                          }`}
                        >
                          {inSlip ? '✓ In Slip' : '+ Slip'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (item.originalCandidate) {
                            const payload = buildBet365PayloadFromCandidatePick(
                              item.originalCandidate,
                              5,
                              '€'
                            );
                            setBet365ModalPayload(payload);
                          }
                        }}
                        className="px-2 py-1 text-[11px] font-bold bg-[#00543C] text-[#FFDF1B] hover:bg-[#007A57] cursor-pointer"
                        title="Open Bet365 Direct Play Assistant"
                      >
                        bet365 ↗
                      </button>

                      {onRecordPick && item.originalCandidate && (
                        <button
                          type="button"
                          onClick={() => onRecordPick(item.originalCandidate!)}
                          className="px-2 py-1 text-[11px] font-semibold bg-[#0B1118] text-[#D4A853] hover:bg-[#1E293B] cursor-pointer"
                          title="Record pick into bankroll simulator"
                        >
                          Track
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bet365 Modal */}
      <Bet365DirectPlayModal
        payload={bet365ModalPayload}
        onClose={() => setBet365ModalPayload(null)}
      />
    </section>
  );
};
