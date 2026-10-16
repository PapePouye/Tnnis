import React, { useState, useMemo } from 'react';
import type {
  CombineCategory,
  CombineCategoryStats,
  CombineHistoryRecord,
  TrackedResult,
} from '../types';
import {
  COMBINE_CATEGORY_CONFIG,
  calculateCombineCategoryStats,
  getAllCombineRecords,
} from '../utils/combineStats';

interface CombinePerformanceGraphicProps {
  results: TrackedResult[];
  currencySymbol?: string;
  initialCategory?: CombineCategory | 'ALL' | 'CUSTOM';
}

type TabCategory = 'ALL' | CombineCategory | 'CUSTOM';

export const CombinePerformanceGraphic: React.FC<CombinePerformanceGraphicProps> = ({
  results,
  currencySymbol = '€',
  initialCategory = 'ALL',
}) => {
  const [selectedCat, setSelectedCat] = useState<TabCategory>(initialCategory);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  // Merge seed data with user-staked combines in real time
  const allRecords = useMemo(() => getAllCombineRecords(results), [results]);

  // Compute stats for all categories
  const statsMap = useMemo(() => calculateCombineCategoryStats(allRecords), [allRecords]);

  const activeStats: CombineCategoryStats = statsMap[selectedCat];

  // Records filtered by selected category
  const filteredRecords = useMemo(() => {
    if (selectedCat === 'ALL') return allRecords;
    return allRecords.filter((r) => r.category === selectedCat);
  }, [allRecords, selectedCat]);

  // Categories to display in comparative bars
  const compareCategories: CombineCategory[] = [
    'TODAY_SURE',
    'ODDS_2',
    'ODDS_5',
    'ODDS_10',
    'ODDS_100',
    'LIVE_SURE',
  ];

  // Compute running cumulative profit trajectory for SVG curve
  const cumulativeData = useMemo(() => {
    let running = 0;
    const sortedChronological = [...filteredRecords]
      .filter((r) => r.outcome !== 'PENDING')
      .reverse();

    return sortedChronological.map((r, i) => {
      running = Number((running + r.profitUnits).toFixed(2));
      return {
        index: i,
        date: r.date,
        profit: r.profitUnits,
        cumulative: running,
        outcome: r.outcome,
        odds: r.totalDecimalOdds,
      };
    });
  }, [filteredRecords]);

  // Helper for SVG line chart scaling
  const chartHeight = 140;
  const chartWidth = 560;
  const paddingX = 30;
  const paddingY = 20;

  const { minVal, maxVal, svgPoints, zeroY } = useMemo(() => {
    if (cumulativeData.length === 0) {
      return { minVal: 0, maxVal: 1, svgPoints: '', zeroY: chartHeight / 2 };
    }
    const values = cumulativeData.map((d) => d.cumulative);
    const min = Math.min(0, ...values);
    const max = Math.max(1, ...values);
    const range = max - min || 1;

    const scaleY = (v: number) =>
      chartHeight - paddingY - ((v - min) / range) * (chartHeight - 2 * paddingY);

    const zero = scaleY(0);

    const stepX =
      cumulativeData.length > 1
        ? (chartWidth - 2 * paddingX) / (cumulativeData.length - 1)
        : chartWidth / 2;

    const points = cumulativeData
      .map((d, i) => {
        const x = paddingX + i * stepX;
        const y = scaleY(d.cumulative);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return { minVal: min, maxVal: max, svgPoints: points, zeroY: zero };
  }, [cumulativeData]);

  return (
    <div className="dossier-card border border-[#DCD8CE] bg-white p-5 sm:p-7 space-y-7 shadow-xs">
      {/* ------------------------------------------------------------- */}
      {/* Header Block with Title & High-Level Telemetry               */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#EAE7DF] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-[#0D5C3A]" />
            <span className="text-xs text-[#0D5C3A] font-mono-tabular uppercase tracking-wider font-semibold">
              Combine Analytics Engine · Win / Loss Rate Tracker
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-display text-[#11161D] mt-1 tracking-tight">
            Combine Performance & Win/Loss Statistics
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Inspect the audited performance of each multi-leg combine tier <strong className="text-[#11161D]">one by one</strong>. Every ticket tracks total decimal odds, joint hit frequency, 1-leg heartbreak misses, and cumulative bankroll yield.
          </p>
        </div>

        {/* Global Summary Badge Matrix */}
        <div className="flex items-center gap-4 shrink-0 font-mono-tabular text-right bg-[#FAF9F5] p-3 border border-[#DCD8CE]">
          <div>
            <div className="text-[10px] uppercase text-slate-500 font-medium">All Combines</div>
            <div className="text-lg font-bold text-[#11161D]">
              {statsMap.ALL.winRatePercent}% <span className="text-xs text-slate-500 font-normal">Win</span>
            </div>
          </div>
          <div className="h-8 w-px bg-[#DCD8CE]" />
          <div>
            <div className="text-[10px] uppercase text-slate-500 font-medium">Total Tickets</div>
            <div className="text-lg font-bold text-[#11161D]">
              {statsMap.ALL.wonCount}W / {statsMap.ALL.lostCount}L
            </div>
          </div>
          <div className="h-8 w-px bg-[#DCD8CE]" />
          <div>
            <div className="text-[10px] uppercase text-slate-500 font-medium">Net Yield</div>
            <div
              className={`text-lg font-bold ${
                statsMap.ALL.totalProfitUnits >= 0 ? 'text-[#0D5C3A]' : 'text-[#C2492A]'
              }`}
            >
              {statsMap.ALL.totalProfitUnits >= 0 ? '+' : ''}
              {statsMap.ALL.totalProfitUnits.toFixed(2)}u
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Category Tab Bar ("One by One" selector)                     */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F3F1EA] border border-[#DCD8CE] font-mono-tabular">
        <button
          type="button"
          onClick={() => setSelectedCat('ALL')}
          className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            selectedCat === 'ALL'
              ? 'bg-[#0B1118] text-[#D4A853]'
              : 'text-slate-700 hover:text-[#11161D]'
          }`}
        >
          All Categories Overview
        </button>

        {compareCategories.map((cat) => {
          const cfg = COMBINE_CATEGORY_CONFIG[cat];
          const st = statsMap[cat];
          const isSelected = selectedCat === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#0B1118] text-[#D4A853]'
                  : 'text-slate-700 hover:text-[#11161D]'
              }`}
            >
              <span>{cfg.label.replace(' Combine', '')}</span>
              <span
                className={`text-[10px] px-1 py-0.2 border ${
                  isSelected
                    ? 'border-[#D4A853] text-[#D4A853]'
                    : st.winRatePercent >= 60
                    ? 'border-[#0D5C3A] text-[#0D5C3A]'
                    : 'border-slate-400 text-slate-600'
                }`}
              >
                {st.winRatePercent}%
              </span>
            </button>
          );
        })}

        {statsMap.CUSTOM.totalTickets > 0 && (
          <button
            type="button"
            onClick={() => setSelectedCat('CUSTOM')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              selectedCat === 'CUSTOM'
                ? 'bg-[#0B1118] text-[#D4A853]'
                : 'text-slate-700 hover:text-[#11161D]'
            }`}
          >
            Custom Parlays ({statsMap.CUSTOM.totalTickets})
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GRAPHIC A: Side-by-Side Win Rate vs Loss Rate Bar Comparison   */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3 bg-[#FAF9F5] p-5 border border-[#DCD8CE]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider font-mono-tabular text-[#11161D]">
              Tier-by-Tier Win Rate (%) vs. Loss Rate (%) Comparative Graphic
            </h4>
            <p className="text-xs text-slate-500 font-mono-tabular">
              Proportional win (Turf Green) vs. loss (Terracotta Red) rates across each multiplier bracket.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono-tabular">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#0D5C3A] inline-block" /> Win Rate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#C2492A] inline-block" /> Loss Rate
            </span>
          </div>
        </div>

        {/* 5 Stacked Visual Bars */}
        <div className="space-y-3 pt-2">
          {compareCategories.map((cat) => {
            const cfg = COMBINE_CATEGORY_CONFIG[cat];
            const st = statsMap[cat];
            const isHighlighted = selectedCat === 'ALL' || selectedCat === cat;

            return (
              <div
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`group p-2.5 rounded-none border transition-colors cursor-pointer ${
                  isHighlighted
                    ? 'border-[#0B1118] bg-white shadow-xs'
                    : 'border-[#EAE7DF] bg-[#FAF9F5] opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-xs font-mono-tabular mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-1.5 py-0.5 text-[10px] font-bold text-white uppercase"
                      style={{ backgroundColor: cfg.badgeColor }}
                    >
                      {cat.replace('_', ' ')}
                    </span>
                    <span className="font-bold text-[#11161D]">{cfg.label}</span>
                    <span className="text-slate-500">· {cfg.targetOdds}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <span className="font-semibold text-[#0D5C3A]">
                      {st.winRatePercent}% Win ({st.wonCount}W)
                    </span>
                    <span>/</span>
                    <span className="text-[#C2492A]">
                      {st.lossRatePercent}% Loss ({st.lostCount}L)
                    </span>
                    <span className="hidden md:inline text-slate-400">·</span>
                    <span
                      className={`font-semibold hidden md:inline ${
                        st.totalProfitUnits >= 0 ? 'text-[#0D5C3A]' : 'text-[#C2492A]'
                      }`}
                    >
                      {st.totalProfitUnits >= 0 ? '+' : ''}
                      {st.totalProfitUnits.toFixed(2)}u ({st.roiYieldPercent >= 0 ? '+' : ''}
                      {st.roiYieldPercent}%)
                    </span>
                  </div>
                </div>

                {/* Segmented Dual Bar Graphic */}
                <div className="w-full h-4 bg-[#EAE7DF] flex items-stretch overflow-hidden border border-[#DCD8CE]">
                  <div
                    style={{ width: `${Math.max(0, st.winRatePercent)}%` }}
                    className="bg-[#0D5C3A] transition-all duration-500 flex items-center justify-end pr-1 text-[9px] font-mono-tabular text-white font-bold"
                    title={`Win Rate: ${st.winRatePercent}% (${st.wonCount} Won)`}
                  >
                    {st.winRatePercent >= 15 ? `${st.winRatePercent}%` : ''}
                  </div>
                  <div
                    style={{ width: `${Math.max(0, st.lossRatePercent)}%` }}
                    className="bg-[#C2492A] transition-all duration-500 flex items-center justify-start pl-1 text-[9px] font-mono-tabular text-white font-bold"
                    title={`Loss Rate: ${st.lossRatePercent}% (${st.lostCount} Lost)`}
                  >
                    {st.lossRatePercent >= 15 ? `${st.lossRatePercent}%` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GRAPHIC B: Active Selected Tier Deep Dive ("One-by-One")       */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Radial Win/Loss Donut & Key Telemetry */}
        <div className="dossier-card border border-[#DCD8CE] p-5 space-y-4 bg-white flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-500 font-mono-tabular uppercase tracking-wider">
              One-by-One Diagnostic
            </div>
            <h4 className="text-xl font-display text-[#11161D] mt-0.5">
              {activeStats.label}
            </h4>
            <p className="text-xs text-slate-600 mt-1 font-mono-tabular">
              {activeStats.targetOdds} · Avg Closing Odds: @{activeStats.avgOdds.toFixed(2)}
            </p>
          </div>

          {/* Circular Graphic SVG */}
          <div className="flex items-center justify-center py-2">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#EAE7DF"
                  strokeWidth="12"
                  fill="transparent"
                />
                {/* Loss Arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#C2492A"
                  strokeWidth="12"
                  strokeDasharray={`${(activeStats.lossRatePercent / 100) * 251.2} 251.2`}
                  strokeDashoffset="0"
                  fill="transparent"
                />
                {/* Win Arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#0D5C3A"
                  strokeWidth="12"
                  strokeDasharray={`${(activeStats.winRatePercent / 100) * 251.2} 251.2`}
                  strokeDashoffset={`-${(activeStats.lossRatePercent / 100) * 251.2}`}
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center font-mono-tabular">
                <span className="text-2xl font-bold text-[#11161D]">
                  {activeStats.winRatePercent}%
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Win Rate
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Mini-Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono-tabular border-t border-[#EAE7DF] pt-3">
            <div className="bg-[#FAF9F5] p-2 border border-[#EAE7DF]">
              <div className="text-[10px] text-slate-500 uppercase">Settled Tickets</div>
              <div className="text-sm font-bold text-[#11161D]">
                {activeStats.wonCount}W · {activeStats.lostCount}L
              </div>
            </div>
            <div className="bg-[#FAF9F5] p-2 border border-[#EAE7DF]">
              <div className="text-[10px] text-slate-500 uppercase">Total Profit</div>
              <div
                className={`text-sm font-bold ${
                  activeStats.totalProfitUnits >= 0 ? 'text-[#0D5C3A]' : 'text-[#C2492A]'
                }`}
              >
                {activeStats.totalProfitUnits >= 0 ? '+' : ''}
                {activeStats.totalProfitUnits.toFixed(2)}u
              </div>
            </div>
          </div>
        </div>

        {/* Center: Cumulative Unit Profit Trajectory Curve */}
        <div className="dossier-card border border-[#DCD8CE] p-5 space-y-3 bg-white lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 font-mono-tabular uppercase tracking-wider">
                  Bankroll Growth Curve
                </div>
                <h4 className="text-lg font-display text-[#11161D]">
                  Cumulative Profit & Yield Trajectory ({activeStats.label})
                </h4>
              </div>
              <div className="text-right font-mono-tabular">
                <span className="text-xs text-slate-500">Yield / ROI: </span>
                <span
                  className={`text-sm font-bold ${
                    activeStats.roiYieldPercent >= 0 ? 'text-[#0D5C3A]' : 'text-[#C2492A]'
                  }`}
                >
                  {activeStats.roiYieldPercent >= 0 ? '+' : ''}
                  {activeStats.roiYieldPercent}%
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-mono-tabular mt-0.5">
              Net unit accumulation over the settled combine sequence.
            </p>
          </div>

          {/* SVG Line / Area Graph */}
          <div className="relative w-full h-[150px] bg-[#FAF9F5] border border-[#EAE7DF] flex items-center justify-center p-2">
            {cumulativeData.length > 0 ? (
              <svg
                className="w-full h-full overflow-visible"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="none"
              >
                {/* Zero Reference Baseline */}
                <line
                  x1={paddingX}
                  y1={zeroY}
                  x2={chartWidth - paddingX}
                  y2={zeroY}
                  stroke="#DCD8CE"
                  strokeDasharray="4 4"
                  strokeWidth="1.5"
                />

                {/* Trajectory Polyline */}
                {svgPoints && (
                  <polyline
                    fill="none"
                    stroke={activeStats.totalProfitUnits >= 0 ? '#0D5C3A' : '#C2492A'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={svgPoints}
                  />
                )}

                {/* Data Points */}
                {cumulativeData.map((d, i) => {
                  const stepX =
                    cumulativeData.length > 1
                      ? (chartWidth - 2 * paddingX) / (cumulativeData.length - 1)
                      : chartWidth / 2;
                  const x = paddingX + i * stepX;
                  const range = maxVal - minVal || 1;
                  const y =
                    chartHeight -
                    paddingY -
                    ((d.cumulative - minVal) / range) * (chartHeight - 2 * paddingY);

                  return (
                    <g key={i}>
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        fill={d.outcome === 'WON' ? '#0D5C3A' : '#C2492A'}
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="text-xs text-slate-400 font-mono-tabular">
                No settled combine history in this category yet.
              </div>
            )}
          </div>

          {/* Bottom Diagnostic Metrics: Leg Reliability & Heartbreak 1-Leg Miss */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono-tabular">
            <div className="p-2.5 bg-[#FAF9F5] border border-[#EAE7DF] flex items-center justify-between">
              <div>
                <span className="text-slate-500 uppercase text-[10px] block font-semibold">
                  Individual Leg Hit Rate
                </span>
                <span className="text-sm font-bold text-[#11161D]">
                  {activeStats.legWinRatePercent}%
                </span>{' '}
                <span className="text-slate-500 text-[11px]">
                  ({activeStats.wonLegs} of {activeStats.totalLegs} legs hit)
                </span>
              </div>
              <span className="text-xs text-[#0D5C3A] font-bold">✓ Strong Legs</span>
            </div>

            <div className="p-2.5 bg-[#FAF9F5] border border-[#EAE7DF] flex items-center justify-between">
              <div>
                <span className="text-slate-500 uppercase text-[10px] block font-semibold">
                  Heartbreak 1-Leg Miss Rate
                </span>
                <span className="text-sm font-bold text-[#C2492A]">
                  {activeStats.missedByOneRatePercent}%
                </span>{' '}
                <span className="text-slate-500 text-[11px]">
                  ({activeStats.missedByOneCount} of {activeStats.lostCount} losses)
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium">Off by 1 Match</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TICKET-BY-TICKET AUDIT LEDGER ("One by One" Leg Inspection)   */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAE7DF] pb-3">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider font-mono-tabular text-[#11161D]">
              Individual Ticket Audit Ledger ({filteredRecords.length} Tickets)
            </h4>
            <p className="text-xs text-slate-500 font-mono-tabular">
              Click any ticket below to expand and inspect each individual leg's result, selection, and final score.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono-tabular">
            Showing {selectedCat === 'ALL' ? 'All Combines' : activeStats.label}
          </span>
        </div>

        <div className="space-y-2.5">
          {filteredRecords.map((ticket) => {
            const isWon = ticket.outcome === 'WON';
            const isPending = ticket.outcome === 'PENDING';
            const isExpanded = expandedTicketId === ticket.id;

            return (
              <div
                key={ticket.id}
                className={`border transition-all duration-150 ${
                  isExpanded
                    ? 'border-[#0B1118] bg-[#FAF9F5] shadow-xs'
                    : 'border-[#DCD8CE] bg-white hover:border-[#11161D]'
                }`}
              >
                {/* Ticket Header Row */}
                <button
                  type="button"
                  onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                  className="w-full text-left p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex flex-wrap items-center gap-2.5 font-mono-tabular text-xs">
                    {/* Outcome Badge */}
                    <span
                      className={`px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white ${
                        isWon
                          ? 'bg-[#0D5C3A]'
                          : isPending
                          ? 'bg-amber-600'
                          : 'bg-[#C2492A]'
                      }`}
                    >
                      {ticket.outcome}
                    </span>

                    {/* Category Label */}
                    <span className="font-bold text-[#11161D]">{ticket.categoryTitle}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">{ticket.date}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600">{ticket.legs.length} Legs</span>
                    {ticket.tournamentSummary && (
                      <>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 hidden md:inline truncate max-w-xs">
                          {ticket.tournamentSummary}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-4 font-mono-tabular text-xs shrink-0 self-end sm:self-auto">
                    <span className="font-bold text-sm text-[#11161D]">
                      @{ticket.totalDecimalOdds.toFixed(2)}
                    </span>
                    <span className="text-slate-500">
                      Stake: {ticket.stakeUnits.toFixed(2)}u
                    </span>
                    <span
                      className={`font-bold text-sm ${
                        isWon
                          ? 'text-[#0D5C3A]'
                          : isPending
                          ? 'text-amber-600'
                          : 'text-[#C2492A]'
                      }`}
                    >
                      {ticket.profitUnits >= 0 ? '+' : ''}
                      {ticket.profitUnits.toFixed(2)}u
                    </span>
                    <span className="text-xs text-slate-400 font-bold ml-1">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </button>

                {/* Expanded Leg-by-Leg Inspection Panel */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-[#EAE7DF] bg-white space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-500 uppercase tracking-wider">
                      <span>Leg Breakdown ({ticket.legs.length} Selections)</span>
                      <span>
                        {ticket.missedByLegs === 0
                          ? 'All Legs Cleared ✓'
                          : `Missed by ${ticket.missedByLegs} Leg(s)`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {ticket.legs.map((leg, lIdx) => {
                        const legWon = leg.outcome === 'WON';
                        const legLost = leg.outcome === 'LOST';

                        return (
                          <div
                            key={lIdx}
                            className={`p-3 border flex items-start justify-between gap-3 text-xs font-mono-tabular ${
                              legWon
                                ? 'border-[#D2E7DA] bg-[#F7FBF8]'
                                : legLost
                                ? 'border-[#F8D7D0] bg-[#FFF8F6]'
                                : 'border-[#EAE7DF] bg-[#FAF9F5]'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-4 h-4 flex items-center justify-center text-[10px] font-bold text-white ${
                                    legWon
                                      ? 'bg-[#0D5C3A]'
                                      : legLost
                                      ? 'bg-[#C2492A]'
                                      : 'bg-slate-400'
                                  }`}
                                >
                                  {legWon ? '✓' : legLost ? '✗' : '·'}
                                </span>
                                <span className="font-semibold text-[#11161D]">
                                  {leg.match}
                                </span>
                              </div>
                              <div className="text-slate-700 pl-6">
                                Pick: <strong className="text-[#11161D]">{leg.selection}</strong>
                              </div>
                              {leg.score && (
                                <div className="text-[11px] text-slate-500 pl-6">
                                  Final Score: {leg.score}
                                </div>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-bold text-[#11161D]">
                                @{leg.odds.toFixed(2)}
                              </span>
                              <div
                                className={`text-[10px] uppercase font-bold mt-1 ${
                                  legWon
                                    ? 'text-[#0D5C3A]'
                                    : legLost
                                    ? 'text-[#C2492A]'
                                    : 'text-slate-500'
                                }`}
                              >
                                {leg.outcome}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
