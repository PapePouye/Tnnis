import React, { useState, useEffect } from 'react';
import {
  loadProspectivePredictions,
  saveProspectivePredictions,
  type ProspectivePrediction,
} from '../utils/predictionsLedger';

export const PredictionTrackerSection: React.FC = () => {
  const [predictions, setPredictions] = useState<ProspectivePrediction[]>([]);
  const [filterTour, setFilterTour] = useState<'ALL' | 'ATP' | 'WTA' | 'CHALLENGER'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SETTLED' | 'SCHEDULED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setPredictions(loadProspectivePredictions());
  }, []);

  const filteredPredictions = predictions.filter((p) => {
    if (filterTour !== 'ALL' && p.tour !== filterTour) return false;
    if (filterStatus === 'SETTLED' && p.status !== 'SETTLED') return false;
    if (filterStatus === 'SCHEDULED' && p.status === 'SETTLED') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !p.playerA.toLowerCase().includes(q) &&
        !p.playerB.toLowerCase().includes(q) &&
        !p.tournament.toLowerCase().includes(q) &&
        !p.selection.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const settled = predictions.filter((p) => p.status === 'SETTLED');
  const wonCount = settled.filter((p) => p.outcome === 'WON').length;
  const lostCount = settled.filter((p) => p.outcome === 'LOST').length;
  const winRate = settled.length > 0 ? Number(((wonCount / settled.length) * 100).toFixed(1)) : 0;
  const totalProfit = Number(
    settled.reduce((acc, p) => acc + (p.profitUnits || 0), 0).toFixed(2)
  );

  return (
    <section id="prediction-tracker-station" className="py-8 border-b border-[#E2E8F0]">
      {/* Header Desk */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono-tabular tracking-wider text-[#0A5C36]">
            <span>MODULE 06 · IMMUTABLE PRE-MATCH PREDICTION LEDGER</span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span>PROSPECTIVE PAPER-TRADING VERIFICATION</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-semibold text-[#0F172A] mt-1">
            Verified Prediction Tracker
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Every model prediction is cryptographically timestamped and committed prior to first serve. Completed matches are auto-graded with losses and voids permanently documented to prevent selective survivorship bias.
          </p>
        </div>

        {/* Paper Trading Scoreboard */}
        <div className="flex items-center gap-2 font-mono-tabular">
          <div className="p-3 bg-white border border-[#E2E8F0] text-center">
            <span className="text-[10px] text-slate-500 block">Prospective Record</span>
            <span className="text-base font-bold text-[#0A5C36]">
              {wonCount}W – {lostCount}L ({winRate}%)
            </span>
          </div>
          <div className="p-3 bg-white border border-[#E2E8F0] text-center">
            <span className="text-[10px] text-slate-500 block">Model P/L</span>
            <span className={`text-base font-bold ${totalProfit >= 0 ? 'text-[#0A5C36]' : 'text-[#DC2626]'}`}>
              {totalProfit >= 0 ? '+' : ''}{totalProfit}u
            </span>
          </div>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="p-3 bg-white border border-[#E2E8F0] mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono-tabular">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <span className="text-slate-400">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prospective prediction..."
            className="w-full bg-transparent border-none text-[#0F172A] focus:outline-none text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            {(['ALL', 'ATP', 'WTA', 'CHALLENGER'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterTour(t)}
                className={`px-2.5 py-1 text-xs cursor-pointer ${
                  filterTour === t ? 'bg-[#0B1118] text-[#D4A853] font-bold' : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="border-l border-[#E2E8F0] pl-2 flex items-center gap-1">
            {(['ALL', 'SETTLED', 'SCHEDULED'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 text-xs cursor-pointer ${
                  filterStatus === s ? 'bg-[#0A5C36] text-white font-bold' : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Prediction Ledger Table */}
      <div className="bg-white border border-[#E2E8F0] overflow-x-auto text-xs font-mono-tabular">
        <table className="w-full text-left">
          <thead className="bg-[#F1F5F9] text-slate-600 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="p-3">Prediction ID & Timestamp</th>
              <th className="p-3">Matchup & Tournament</th>
              <th className="p-3">Selection</th>
              <th className="p-3 text-right">Odds Taken</th>
              <th className="p-3 text-right">Model Win %</th>
              <th className="p-3 text-right">EV %</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Outcome</th>
              <th className="p-3 text-right">Score</th>
              <th className="p-3 text-right">P/L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {filteredPredictions.map((pred) => (
              <tr key={pred.predictionId} className="hover:bg-[#F8F9FA]">
                <td className="p-3 whitespace-nowrap">
                  <div className="font-bold text-[#0F172A]">{pred.predictionId}</div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(pred.timestampCreated).toLocaleDateString()} · {new Date(pred.timestampCreated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </td>
                <td className="p-3 max-w-[220px]">
                  <div className="font-semibold text-[#0F172A] truncate">
                    {pred.playerA} vs. {pred.playerB}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {pred.tour} · {pred.tournament} ({pred.surface})
                  </div>
                </td>
                <td className="p-3 font-semibold text-[#0A5C36]">
                  {pred.selection}
                </td>
                <td className="p-3 text-right font-bold tabular-nums">
                  @{pred.bookmakerOdds.toFixed(2)}
                </td>
                <td className="p-3 text-right tabular-nums">
                  <span className="font-bold text-[#0F172A]">{pred.modelProbA}%</span>
                  <span className="text-[10px] text-slate-400 block">±{pred.uncertaintyMargin}%</span>
                </td>
                <td className="p-3 text-right font-semibold text-[#0A5C36] tabular-nums">
                  +{pred.expectedValuePercent.toFixed(1)}%
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 bg-[#F1F5F9] text-slate-700 text-[10px] font-bold">
                    {pred.status}
                  </span>
                </td>
                <td className="p-3 text-center">
                  {pred.outcome === 'WON' && (
                    <span className="px-2 py-0.5 bg-[#DCFCE7] text-[#166534] text-[10px] font-bold">
                      ✓ WON
                    </span>
                  )}
                  {pred.outcome === 'LOST' && (
                    <span className="px-2 py-0.5 bg-[#FEE2E2] text-[#991B1B] text-[10px] font-bold">
                      ✗ LOST
                    </span>
                  )}
                  {pred.outcome === 'PENDING' && (
                    <span className="px-2 py-0.5 bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold">
                      PENDING
                    </span>
                  )}
                </td>
                <td className="p-3 text-right text-slate-600 font-mono-tabular">
                  {pred.finalScore || '—'}
                </td>
                <td
                  className={`p-3 text-right font-bold tabular-nums ${
                    (pred.profitUnits || 0) >= 0 ? 'text-[#0A5C36]' : 'text-[#DC2626]'
                  }`}
                >
                  {pred.profitUnits !== undefined
                    ? `${pred.profitUnits >= 0 ? '+' : ''}${pred.profitUnits.toFixed(2)}u`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
