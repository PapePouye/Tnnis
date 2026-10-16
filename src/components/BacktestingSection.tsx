import React, { useState, useMemo } from 'react';
import { runWalkForwardBacktest, type BacktestConfig, type BacktestResult, HISTORICAL_TENNIS_DATASET } from '../utils/backtest';

export const BacktestingSection: React.FC = () => {
  const [tour, setTour] = useState<'ALL' | 'ATP' | 'WTA' | 'CHALLENGER' | 'ITF'>('ALL');
  const [surface, setSurface] = useState<'ALL' | 'HARD' | 'CLAY' | 'GRASS'>('ALL');
  const [minEv, setMinEv] = useState<number>(2.0);
  const [minOdds, setMinOdds] = useState<number>(1.25);
  const [maxOdds, setMaxOdds] = useState<number>(3.50);
  const [staking, setStaking] = useState<'FLAT_1U' | 'QUARTER_KELLY' | 'HALF_KELLY'>('FLAT_1U');
  const [startingBankroll, setStartingBankroll] = useState<number>(100);

  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'CALIBRATION' | 'SEGMENTS' | 'TRADES'>('SUMMARY');

  const backtestResult: BacktestResult = useMemo(() => {
    const cfg: BacktestConfig = {
      tour,
      surface,
      minEvPercent: minEv,
      minOdds,
      maxOdds,
      stakingStrategy: staking,
      startingBankroll,
    };
    return runWalkForwardBacktest(cfg, HISTORICAL_TENNIS_DATASET);
  }, [tour, surface, minEv, minOdds, maxOdds, staking, startingBankroll]);

  return (
    <section id="backtest-station" className="py-8 border-b border-[#E2E8F0]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono-tabular tracking-wider text-[#0A5C36]">
            <span>MODULE 05 · TIME-BASED WALK-FORWARD VALIDATION</span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span>ZERO LOOK-AHEAD BIAS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-semibold text-[#0F172A] mt-1">
            Historical Backtesting Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Evaluates the quantitative model's predictive calibration, Brier score, Log loss, and return on investment across chronological tour matches strictly using pre-match data and closing lines.
          </p>
        </div>

        {/* Responsible Betting Notice */}
        <div className="p-2.5 bg-[#F8F9FA] border border-[#CBD5E1] text-[11px] font-mono-tabular text-slate-600 max-w-sm">
          <span className="font-bold text-[#0F172A]">Methodology Integrity:</span> Simulated walk-forward performance. Historical statistical edges never guarantee future financial profit.
        </div>
      </div>

      {/* Interactive Backtest Parameter Controls */}
      <div className="p-4 bg-white border border-[#E2E8F0] mb-6 space-y-4 text-xs font-mono-tabular">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Tour Filter */}
          <div>
            <label className="block text-slate-500 mb-1">Tour Segment:</label>
            <select
              value={tour}
              onChange={(e) => setTour(e.target.value as any)}
              className="w-full p-2 bg-[#F8F9FA] border border-[#CBD5E1] font-semibold text-[#0F172A]"
            >
              <option value="ALL">All Segments (ATP/WTA/Challenger)</option>
              <option value="ATP">ATP Tour Only</option>
              <option value="WTA">WTA Tour Only</option>
              <option value="CHALLENGER">ATP Challenger Tour</option>
              <option value="ITF">ITF World Tennis Tour</option>
            </select>
          </div>

          {/* Surface Filter */}
          <div>
            <label className="block text-slate-500 mb-1">Court Surface:</label>
            <select
              value={surface}
              onChange={(e) => setSurface(e.target.value as any)}
              className="w-full p-2 bg-[#F8F9FA] border border-[#CBD5E1] font-semibold text-[#0F172A]"
            >
              <option value="ALL">All Surfaces</option>
              <option value="HARD">Hard Courts</option>
              <option value="CLAY">Clay Courts</option>
              <option value="GRASS">Grass Courts</option>
            </select>
          </div>

          {/* Min EV Threshold */}
          <div>
            <label className="block text-slate-500 mb-1">Min. Expected Value (EV):</label>
            <select
              value={minEv}
              onChange={(e) => setMinEv(Number(e.target.value))}
              className="w-full p-2 bg-[#F8F9FA] border border-[#CBD5E1] font-semibold text-[#0F172A]"
            >
              <option value={0}>Any EV (0.0%+)</option>
              <option value={2}>Conservative (+2.0%+)</option>
              <option value={4}>Selective (+4.0%+)</option>
              <option value={6}>Strict Value (+6.0%+)</option>
            </select>
          </div>

          {/* Staking Method */}
          <div>
            <label className="block text-slate-500 mb-1">Staking Strategy:</label>
            <select
              value={staking}
              onChange={(e) => setStaking(e.target.value as any)}
              className="w-full p-2 bg-[#F8F9FA] border border-[#CBD5E1] font-semibold text-[#0F172A]"
            >
              <option value="FLAT_1U">Flat Stake (1 Unit)</option>
              <option value="QUARTER_KELLY">Quarter Kelly (Conservative)</option>
              <option value="HALF_KELLY">Half Kelly (Aggressive)</option>
            </select>
          </div>

          {/* Odds Range */}
          <div>
            <label className="block text-slate-500 mb-1">Odds Range:</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.05"
                min="1.05"
                max="5.0"
                value={minOdds}
                onChange={(e) => setMinOdds(Number(e.target.value))}
                className="w-1/2 p-2 bg-[#F8F9FA] border border-[#CBD5E1] text-[#0F172A]"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                step="0.1"
                min="1.2"
                max="10.0"
                value={maxOdds}
                onChange={(e) => setMaxOdds(Number(e.target.value))}
                className="w-1/2 p-2 bg-[#F8F9FA] border border-[#CBD5E1] text-[#0F172A]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Performance Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[#E2E8F0] border border-[#E2E8F0] mb-6 font-mono-tabular">
        <div className="p-4 bg-white">
          <span className="text-[11px] text-slate-500 block">Total Bets Evaluated</span>
          <span className="text-xl font-bold text-[#0F172A] mt-1 block tabular-nums">
            {backtestResult.totalQualifiedBets}{' '}
            <span className="text-xs font-normal text-slate-400">/ {backtestResult.totalMatchesInDataset}</span>
          </span>
          <span className="text-[10px] text-slate-500">
            {backtestResult.winningBets}W – {backtestResult.losingBets}L
          </span>
        </div>

        <div className="p-4 bg-white">
          <span className="text-[11px] text-slate-500 block">Win Rate</span>
          <span className="text-xl font-bold text-[#0A5C36] mt-1 block tabular-nums">
            {backtestResult.winRatePercent.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-500">
            Avg Odds: @{backtestResult.avgOdds.toFixed(2)}
          </span>
        </div>

        <div className="p-4 bg-white">
          <span className="text-[11px] text-slate-500 block">Net Profit (Units)</span>
          <span
            className={`text-xl font-bold mt-1 block tabular-nums ${
              backtestResult.totalProfitUnits >= 0 ? 'text-[#0A5C36]' : 'text-[#DC2626]'
            }`}
          >
            {backtestResult.totalProfitUnits >= 0 ? '+' : ''}
            {backtestResult.totalProfitUnits.toFixed(2)}u
          </span>
          <span className="text-[10px] text-slate-500">
            Staked: {backtestResult.totalStakedUnits.toFixed(1)}u
          </span>
        </div>

        <div className="p-4 bg-white">
          <span className="text-[11px] text-slate-500 block">Simulated ROI / Yield</span>
          <span
            className={`text-xl font-bold mt-1 block tabular-nums ${
              backtestResult.roiYieldPercent >= 0 ? 'text-[#0A5C36]' : 'text-[#DC2626]'
            }`}
          >
            {backtestResult.roiYieldPercent >= 0 ? '+' : ''}
            {backtestResult.roiYieldPercent.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-500">
            Profit Factor: {backtestResult.profitFactor.toFixed(2)}
          </span>
        </div>

        <div className="p-4 bg-white">
          <span className="text-[11px] text-slate-500 block">Model Brier Score</span>
          <span className="text-xl font-bold text-slate-800 mt-1 block tabular-nums">
            {backtestResult.brierScoreModel.toFixed(4)}
          </span>
          <span className="text-[10px] text-[#0A5C36]">
            vs Market: {backtestResult.brierScoreMarket.toFixed(4)} ({backtestResult.brierScoreModel < backtestResult.brierScoreMarket ? 'Superior' : 'Parity'})
          </span>
        </div>

        <div className="p-4 bg-white">
          <span className="text-[11px] text-slate-500 block">Max Drawdown</span>
          <span className="text-xl font-bold text-[#DC2626] mt-1 block tabular-nums">
            -{backtestResult.maxDrawdownPercent.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-500">
            Avg CLV: +{backtestResult.avgClvPercent.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-[#E2E8F0] mb-4 text-xs font-mono-tabular font-semibold">
        {[
          { id: 'SUMMARY', label: '1. Equity Curve & Overview' },
          { id: 'CALIBRATION', label: '2. Probability Calibration Matrix' },
          { id: 'SEGMENTS', label: '3. Surface & Tour Breakdown' },
          { id: 'TRADES', label: `4. Chronological Trade Log (${backtestResult.trades.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`py-2.5 px-4 border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? 'border-[#0A5C36] text-[#0A5C36] bg-white'
                : 'border-transparent text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SUB TAB 1: EQUITY CURVE */}
      {activeTab === 'SUMMARY' && (
        <div className="space-y-4">
          <div className="p-5 bg-white border border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono-tabular">
              <span className="font-bold text-[#0F172A]">Simulated Equity Progression</span>
              <span className="text-slate-500">
                Starting: {startingBankroll}u → Final: {backtestResult.finalBankroll.toFixed(2)}u
              </span>
            </div>

            {/* Simple Ascii / Bar Equity Graphic */}
            <div className="h-40 bg-[#F8F9FA] border border-[#E2E8F0] p-3 flex items-end gap-1 overflow-x-auto">
              {backtestResult.equityCurve.map((pt, i) => {
                const maxBal = Math.max(...backtestResult.equityCurve.map((p) => p.balance), 110);
                const minBal = Math.min(...backtestResult.equityCurve.map((p) => p.balance), 95);
                const range = maxBal - minBal || 1;
                const heightPct = Math.max(10, Math.min(100, ((pt.balance - minBal) / range) * 100));

                return (
                  <div
                    key={i}
                    className="flex-1 min-w-[12px] flex flex-col items-center justify-end h-full group relative"
                  >
                    <div
                      className={`w-full transition-all ${
                        pt.profit >= 0 ? 'bg-[#0A5C36]' : 'bg-[#DC2626]'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <div className="hidden group-hover:block absolute bottom-full mb-1 z-10 p-1.5 bg-[#0B1118] text-white text-[10px] font-mono-tabular whitespace-nowrap">
                      <div>{pt.date}</div>
                      <div>Balance: {pt.balance.toFixed(2)}u</div>
                      <div>P/L: {pt.profit >= 0 ? '+' : ''}{pt.profit.toFixed(2)}u</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-slate-500 font-mono-tabular flex justify-between">
              <span>{backtestResult.equityCurve[0]?.date}</span>
              <span>Chronological Match Sequence →</span>
              <span>{backtestResult.equityCurve[backtestResult.equityCurve.length - 1]?.date}</span>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 2: CALIBRATION MATRIX */}
      {activeTab === 'CALIBRATION' && (
        <div className="p-5 bg-white border border-[#E2E8F0] space-y-4 text-xs font-mono-tabular">
          <div>
            <div className="font-bold text-[#0F172A] text-sm">
              Empirical Calibration: Predicted Probability vs Observed Win Frequency
            </div>
            <p className="text-slate-500 mt-0.5">
              A well-calibrated model produces an observed win rate that closely matches the predicted probability bin.
            </p>
          </div>

          <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0]">
            <div className="p-2.5 bg-[#F1F5F9] grid grid-cols-5 font-semibold text-slate-600 text-[11px]">
              <div>Predicted Bin</div>
              <div className="text-right">Sample Size</div>
              <div className="text-right">Observed Wins</div>
              <div className="text-right">Observed Win %</div>
              <div className="text-right">Calibration Delta</div>
            </div>

            {backtestResult.calibrationBins.map((bin, i) => (
              <div key={i} className="p-3 grid grid-cols-5 items-center">
                <div className="font-bold text-[#0F172A]">{bin.binLabel}</div>
                <div className="text-right text-slate-600 tabular-nums">{bin.sampleCount} matches</div>
                <div className="text-right text-slate-600 tabular-nums">{bin.winCount} won</div>
                <div className="text-right font-bold text-[#0A5C36] tabular-nums">
                  {bin.observedWinRate.toFixed(1)}%
                </div>
                <div
                  className={`text-right font-semibold tabular-nums ${
                    Math.abs(bin.calibrationError) <= 4.0 ? 'text-[#0A5C36]' : 'text-slate-600'
                  }`}
                >
                  {bin.calibrationError >= 0 ? '+' : ''}{bin.calibrationError.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB TAB 3: SURFACE & TOUR BREAKDOWN */}
      {activeTab === 'SEGMENTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono-tabular">
          {/* Surface Breakdown */}
          <div className="p-4 bg-white border border-[#E2E8F0] space-y-3">
            <div className="font-bold text-[#0F172A] text-sm">Performance by Surface</div>
            <div className="divide-y divide-[#E2E8F0]">
              {Object.entries(backtestResult.bySurface).map(([surf, s]) => (
                <div key={surf} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#0F172A]">{surf}</span>
                    <span className="text-slate-500 ml-2">({s.bets} bets)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#0A5C36] font-bold mr-3">{s.wins}W</span>
                    <span className={`font-bold ${s.profit >= 0 ? 'text-[#0A5C36]' : 'text-[#DC2626]'}`}>
                      {s.profit >= 0 ? '+' : ''}{s.profit.toFixed(2)}u ({s.roi >= 0 ? '+' : ''}{s.roi}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tour Breakdown */}
          <div className="p-4 bg-white border border-[#E2E8F0] space-y-3">
            <div className="font-bold text-[#0F172A] text-sm">Performance by Tour Category</div>
            <div className="divide-y divide-[#E2E8F0]">
              {Object.entries(backtestResult.byTour).map(([tCategory, t]) => (
                <div key={tCategory} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#0F172A]">{tCategory}</span>
                    <span className="text-slate-500 ml-2">({t.bets} bets)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#0A5C36] font-bold mr-3">{t.wins}W</span>
                    <span className={`font-bold ${t.profit >= 0 ? 'text-[#0A5C36]' : 'text-[#DC2626]'}`}>
                      {t.profit >= 0 ? '+' : ''}{t.profit.toFixed(2)}u ({t.roi >= 0 ? '+' : ''}{t.roi}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 4: TRADES LOG */}
      {activeTab === 'TRADES' && (
        <div className="bg-white border border-[#E2E8F0] overflow-x-auto text-xs font-mono-tabular">
          <table className="w-full text-left">
            <thead className="bg-[#F1F5F9] text-slate-600 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Match & Tour</th>
                <th className="p-2.5">Pick</th>
                <th className="p-2.5 text-right">Odds</th>
                <th className="p-2.5 text-right">Closing</th>
                <th className="p-2.5 text-right">EV %</th>
                <th className="p-2.5 text-right">CLV %</th>
                <th className="p-2.5 text-center">Result</th>
                <th className="p-2.5 text-right">Profit</th>
                <th className="p-2.5 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {backtestResult.trades.map((t) => (
                <tr key={t.tradeId} className="hover:bg-[#F8F9FA]">
                  <td className="p-2.5 text-slate-500 whitespace-nowrap">{t.date}</td>
                  <td className="p-2.5 max-w-[220px] truncate" title={t.match}>
                    <span className="font-semibold text-[#0F172A]">{t.match}</span>
                    <span className="text-slate-400 block text-[10px]">{t.tournament} ({t.surface})</span>
                  </td>
                  <td className="p-2.5 font-medium text-[#0A5C36]">{t.selection}</td>
                  <td className="p-2.5 text-right font-bold tabular-nums">@{t.marketOdds.toFixed(2)}</td>
                  <td className="p-2.5 text-right text-slate-500 tabular-nums">@{t.closingOdds.toFixed(2)}</td>
                  <td className="p-2.5 text-right font-semibold text-[#0A5C36] tabular-nums">+{t.expectedValuePercent.toFixed(1)}%</td>
                  <td className="p-2.5 text-right tabular-nums">
                    <span className={t.clvPercent >= 0 ? 'text-[#0A5C36]' : 'text-slate-500'}>
                      {t.clvPercent >= 0 ? '+' : ''}{t.clvPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold ${
                        t.outcome === 'WON' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'
                      }`}
                    >
                      {t.outcome}
                    </span>
                  </td>
                  <td className={`p-2.5 text-right font-bold tabular-nums ${t.profitUnits >= 0 ? 'text-[#0A5C36]' : 'text-[#DC2626]'}`}>
                    {t.profitUnits >= 0 ? '+' : ''}{t.profitUnits.toFixed(2)}u
                  </td>
                  <td className="p-2.5 text-right font-semibold text-slate-800 tabular-nums">
                    {t.runningBankroll.toFixed(2)}u
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
