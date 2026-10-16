import React, { useState } from 'react';
import type { BankrollSimulatorConfig, BetSlipLeg, CandidatePick } from '../types';
import { computeStakeForPick } from '../utils/bankroll';
import {
  buildBet365PayloadFromSlipLegs,
  mapToBet365Market,
  type Bet365SlipPayload,
} from '../utils/bet365';
import { Bet365DirectPlayModal } from './Bet365DirectPlayModal';

interface ActiveBetSlipDockProps {
  legs: BetSlipLeg[];
  onRemoveLeg: (id: string) => void;
  onClearSlip: () => void;
  bankrollConfig: BankrollSimulatorConfig;
  currentSimulatedBankroll: number;
  onRecordPick: (pick: CandidatePick, unitMultiplier?: number) => Promise<void>;
  recordingPick: boolean;
}

export const ActiveBetSlipDock: React.FC<ActiveBetSlipDockProps> = ({
  legs,
  onRemoveLeg,
  onClearSlip,
  bankrollConfig,
  currentSimulatedBankroll,
  onRecordPick,
  recordingPick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [slipMode, setSlipMode] = useState<'PARLAY' | 'SINGLES'>('PARLAY');
  const [customStake, setCustomStake] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [bet365ModalPayload, setBet365ModalPayload] =
    useState<Bet365SlipPayload | null>(null);

  if (legs.length === 0) return null;

  const sym = bankrollConfig.currency;

  const totalDecimalOdds = Number(
    legs.reduce((acc, l) => acc * l.decimalOdds, 1).toFixed(2)
  );
  const jointWinProb = Number(
    (legs.reduce((acc, l) => acc * (l.estimatedProbability / 100), 1) * 100).toFixed(1)
  );
  const impliedJointProb = totalDecimalOdds > 1 ? Number(((1 / totalDecimalOdds) * 100).toFixed(1)) : 0;
  const combinedEvPercent = Number(
    (((jointWinProb / 100) * totalDecimalOdds - 1) * 100).toFixed(2)
  );

  const defaultRecommendedStake = computeStakeForPick(
    currentSimulatedBankroll,
    bankrollConfig.startingBankroll,
    bankrollConfig,
    totalDecimalOdds,
    jointWinProb,
    legs.length > 2 ? 0.5 : 1.0
  );

  const activeStake = customStake !== '' && !isNaN(parseFloat(customStake))
    ? Math.max(0, parseFloat(customStake))
    : defaultRecommendedStake;

  const potentialNetProfit = Number(
    (activeStake * Math.max(0, totalDecimalOdds - 1)).toFixed(2)
  );
  const projectedBalance = Number((currentSimulatedBankroll + potentialNetProfit).toFixed(2));

  const handlePlaceParlay = async () => {
    if (legs.length === 0) return;
    const parlayCandidate: CandidatePick = {
      id: `parlay-${Date.now()}`,
      match: legs.map((l) => l.match).join(' + '),
      playerA: legs[0]?.match.split(' vs. ')[0] || 'Selection',
      playerB: 'Multiple Opponents',
      tournament: `${legs.length}-Leg Custom Combine Slip`,
      round: 'Multi-Leg Parlay',
      surface: legs.map((l) => l.surface).filter(Boolean).join(', ') || 'Mixed',
      matchStatus: legs.some((l) => l.matchStatus === 'IN_PROGRESS')
        ? 'IN_PROGRESS'
        : 'PRE_MATCH',
      selection: legs.map((l) => `${l.selection} (@${l.decimalOdds.toFixed(2)})`).join(' + '),
      market: 'Multi-Leg Combine Slip',
      decimalOdds: totalDecimalOdds,
      americanOdds:
        totalDecimalOdds >= 2
          ? `+${Math.round((totalDecimalOdds - 1) * 100)}`
          : `${Math.round(-100 / (totalDecimalOdds - 1))}`,
      bookmaker: 'Combined Sportsbook Slip',
      oddsCheckedAt: new Date().toISOString(),
      impliedProbability: impliedJointProb,
      estimatedProbability: jointWinProb,
      edgePercent: Number((jointWinProb - impliedJointProb).toFixed(1)),
      expectedValuePercent: combinedEvPercent,
      reasoning: `User-constructed ${legs.length}-Leg Combine Slip across verified market lines with joint win probability of ${jointWinProb}% and combined EV of ${combinedEvPercent >= 0 ? '+' : ''}${combinedEvPercent}%.`,
      selectionMethodology: 'User Slip Constructor · Surface Elo + De-Vigged Market Consensus',
      sourceConsensus: `Total Combined Odds: @${totalDecimalOdds.toFixed(2)}`,
      sourceDisagreement: `${legs.length} Legs Joint Win Expectancy: ${jointWinProb}%`,
      mainRisks: ['Every leg must win for the multi-leg ticket to return profit.'],
      factors: {
        recentForm: `${legs.length} independent match outcomes`,
        surfaceAnalysis: 'Multi-surface accumulator',
        headToHead: 'Verified Elo selections',
        injuriesAndFitness: 'Active on tournament draws',
        matchConditions: 'Combined slip',
      },
      sourceUrls: legs.map((l) => l.sourceUrl).filter(Boolean) as string[],
    };

    const unitMult = activeStake > 0 && defaultRecommendedStake > 0
      ? Number((activeStake / (defaultRecommendedStake / (legs.length > 2 ? 0.5 : 1.0))).toFixed(2))
      : 1.0;

    await onRecordPick(parlayCandidate, unitMult);
  };

  const handleCopySlipToClipboard = (openBet365Modal: boolean = false) => {
    const payload = buildBet365PayloadFromSlipLegs(
      legs,
      activeStake,
      sym,
      `Active ${legs.length}-Leg Bet365 Slip`
    );

    navigator.clipboard?.writeText?.(payload.formattedTicketText);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
    if (openBet365Modal) {
      setBet365ModalPayload(payload);
    }
  };

  return (
    <div className="fixed bottom-14 md:bottom-4 right-4 z-50 flex flex-col items-end">
      {/* Minimized Quick Dock Pill / Bar */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="bg-[#0B1118] text-white border border-[#222C38] shadow-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-[#D4A853] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 bg-[#D4A853] text-[#0B1118] font-mono-tabular font-bold text-xs flex items-center justify-center">
              {legs.length}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider">
              Active Slip
            </span>
          </div>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <div className="text-xs font-mono-tabular text-[#D4A853] font-bold">
            @{totalDecimalOdds.toFixed(2)}
          </div>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-xs font-mono-tabular text-slate-300">
            {jointWinProb}% Win
          </span>
          <span className="text-xs font-mono-tabular text-slate-400 ml-1">
            ▲ Expand
          </span>
        </button>
      )}

      {/* Expanded Full BetSlip Drawer */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] max-w-[95vw] bg-white border border-[#11161D] shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-[#0B1118] text-white p-4 flex items-center justify-between border-b border-[#222C38]">
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 bg-[#D4A853] text-[#0B1118] font-mono-tabular font-bold text-xs flex items-center justify-center">
                {legs.length}
              </span>
              <div>
                <div className="text-xs font-mono-tabular uppercase tracking-wider text-[#D4A853]">
                  Trading Slip Constructor
                </div>
                <div className="text-sm font-display text-white">
                  Active Ticket ({legs.length} {legs.length === 1 ? 'Leg' : 'Legs'})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono-tabular text-xs">
              <button
                type="button"
                onClick={onClearSlip}
                className="text-slate-400 hover:text-[#C2492A] underline cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-300 hover:text-white px-2 py-0.5 border border-[#283545] cursor-pointer"
              >
                ▼ Minimize
              </button>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 bg-[#FAF9F5] border-b border-[#DCD8CE] text-xs font-mono-tabular font-semibold">
            <button
              type="button"
              onClick={() => setSlipMode('PARLAY')}
              className={`py-2 text-center transition-colors cursor-pointer ${
                slipMode === 'PARLAY'
                  ? 'bg-white text-[#11161D] border-b-2 border-b-[#0D5C3A]'
                  : 'text-slate-600 hover:text-[#11161D]'
              }`}
            >
              Combine Parlay (@{totalDecimalOdds.toFixed(2)})
            </button>
            <button
              type="button"
              onClick={() => setSlipMode('SINGLES')}
              className={`py-2 text-center transition-colors cursor-pointer ${
                slipMode === 'SINGLES'
                  ? 'bg-white text-[#11161D] border-b-2 border-b-[#0D5C3A]'
                  : 'text-slate-600 hover:text-[#11161D]'
              }`}
            >
              Singles Breakdown ({legs.length})
            </button>
          </div>

          {/* Legs List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-[#EAE7DF] p-2 bg-[#FAF9F5]/40">
            {legs.map((leg, idx) => (
              <div
                key={leg.id}
                className="p-2.5 bg-white border border-[#DCD8CE] my-1 flex items-start justify-between gap-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono-tabular">
                    <span className="font-bold text-[#11161D]">#{idx + 1}</span>
                    <span aria-hidden="true">·</span>
                    <span>{leg.tournament || 'Tour'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{leg.surface || 'Court'}</span>
                  </div>
                  <div className="font-semibold text-[#11161D] truncate mt-0.5">
                    {leg.selection}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{leg.match}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono-tabular">
                  <div className="text-right">
                    <div className="font-bold text-[#11161D]">
                      @{leg.decimalOdds.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {leg.estimatedProbability.toFixed(0)}% Win
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveLeg(leg.id)}
                    title="Remove from slip"
                    className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-[#C2492A] hover:bg-[#FAF9F5] border border-transparent hover:border-[#DCD8CE] cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Combined Parlay Quantitative Summary Strip */}
          {slipMode === 'PARLAY' && (
            <div className="p-3.5 bg-[#FAF9F5] border-t border-[#DCD8CE] space-y-3">
              <div className="grid grid-cols-3 gap-px dossier-grid-hairline text-center font-mono-tabular text-xs">
                <div className="bg-white p-2">
                  <div className="text-[10px] text-slate-500 font-sans">Total Odds</div>
                  <div className="text-sm font-bold text-[#0D5C3A] mt-0.5">
                    {totalDecimalOdds.toFixed(2)}x
                  </div>
                </div>
                <div className="bg-white p-2">
                  <div className="text-[10px] text-slate-500 font-sans">Joint Win Prob</div>
                  <div className="text-sm font-semibold text-[#11161D] mt-0.5">
                    {jointWinProb}%
                  </div>
                </div>
                <div className="bg-white p-2">
                  <div className="text-[10px] text-slate-500 font-sans">Combined EV</div>
                  <div
                    className={`text-sm font-semibold mt-0.5 ${
                      combinedEvPercent >= 0 ? 'text-[#0D5C3A]' : 'text-[#C2492A]'
                    }`}
                  >
                    {combinedEvPercent >= 0 ? '+' : ''}
                    {combinedEvPercent}%
                  </div>
                </div>
              </div>

              {/* Stake Sizing Row */}
              <div className="flex items-center justify-between gap-3 text-xs font-mono-tabular">
                <div className="text-slate-600">
                  <span>Stake ({sym}):</span>
                  <div className="flex items-center gap-1 mt-1">
                    {[defaultRecommendedStake, defaultRecommendedStake * 0.5, 10, 25].map((amt) => {
                      const rounded = Math.round(amt);
                      if (rounded <= 0) return null;
                      return (
                        <button
                          key={rounded}
                          type="button"
                          onClick={() => setCustomStake(String(rounded))}
                          className="px-1.5 py-0.5 bg-white border border-[#DCD8CE] text-[10px] hover:border-[#11161D] cursor-pointer"
                        >
                          {rounded}{sym}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="w-24">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={customStake !== '' ? customStake : defaultRecommendedStake.toFixed(0)}
                    onChange={(e) => setCustomStake(e.target.value)}
                    className="w-full px-2 py-1 text-sm font-bold text-right font-mono-tabular border border-[#C7C2B6] bg-white focus:outline-none focus:border-[#11161D]"
                  />
                </div>
              </div>

              {/* Payout Forecast */}
              <div className="pt-2 border-t border-[#DCD8CE] flex justify-between items-baseline text-xs font-mono-tabular">
                <span className="text-slate-600">Net Profit Return:</span>
                <span className="font-bold text-sm text-[#0D5C3A]">
                  +{potentialNetProfit.toFixed(2)}{sym}{' '}
                  <span className="font-normal text-slate-500 text-xs">
                    (Bal: {projectedBalance.toFixed(2)}{sym})
                  </span>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1 font-mono-tabular">
                <button
                  type="button"
                  onClick={() => handleCopySlipToClipboard(true)}
                  className="w-full py-2 px-3 text-xs font-bold uppercase tracking-wider bg-[#00543C] hover:bg-[#007A57] text-[#FFDF1B] border border-[#003D2B] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>bet365 · Copy Slip & Play Directly ↗</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopySlipToClipboard(false)}
                    className="px-3 py-2 text-xs border border-[#DCD8CE] bg-white text-[#11161D] hover:bg-[#FAF9F5] whitespace-nowrap cursor-pointer"
                  >
                    {copiedNotification ? '✓ Copied' : '📋 Copy Text'}
                  </button>

                  <button
                    type="button"
                    onClick={handlePlaceParlay}
                    disabled={recordingPick}
                    className="flex-1 py-2 text-xs font-semibold uppercase tracking-wider bg-[#0B1118] text-[#D4A853] hover:bg-[#18222F] disabled:opacity-50 transition-colors cursor-pointer text-center"
                  >
                    {recordingPick ? 'Staking...' : `Stake ${activeStake.toFixed(2)}${sym} in Ledger`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Singles Mode Actions */}
          {slipMode === 'SINGLES' && (
            <div className="p-3.5 bg-[#FAF9F5] border-t border-[#DCD8CE] space-y-2 text-xs font-mono-tabular">
              <div className="text-slate-600">
                You have {legs.length} individual match selections selected. You can play them on Bet365 or stake them together as a combine above.
              </div>
              <button
                type="button"
                onClick={() => handleCopySlipToClipboard(true)}
                className="w-full py-2 text-xs font-bold uppercase bg-[#00543C] hover:bg-[#007A57] text-[#FFDF1B] cursor-pointer"
              >
                {copiedNotification ? '✓ Bet365 Slip Copied' : 'bet365 · Copy & Play All Selections ↗'}
              </button>
            </div>
          )}
        </div>
      )}

      <Bet365DirectPlayModal
        payload={bet365ModalPayload}
        onClose={() => setBet365ModalPayload(null)}
      />
    </div>
  );
};
