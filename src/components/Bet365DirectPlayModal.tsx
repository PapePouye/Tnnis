import React, { useState } from 'react';
import type { Bet365SlipPayload } from '../utils/bet365';

interface Bet365DirectPlayModalProps {
  payload: Bet365SlipPayload | null;
  onClose: () => void;
}

export const Bet365DirectPlayModal: React.FC<Bet365DirectPlayModalProps> = ({
  payload,
  onClose,
}) => {
  const [copiedFullSlip, setCopiedFullSlip] = useState(false);
  const [copiedCompact, setCopiedCompact] = useState(false);
  const [copiedLegIdx, setCopiedLegIdx] = useState<number | null>(null);
  const [checkedLegs, setCheckedLegs] = useState<Set<number>>(new Set());

  if (!payload) return null;

  const handleCopyFullSlip = () => {
    navigator.clipboard?.writeText?.(payload.formattedTicketText);
    setCopiedFullSlip(true);
    setTimeout(() => setCopiedFullSlip(false), 2500);
  };

  const handleCopyCompact = () => {
    navigator.clipboard?.writeText?.(payload.compactSearchListText);
    setCopiedCompact(true);
    setTimeout(() => setCopiedCompact(false), 2500);
  };

  const handleCopyLegSearch = (query: string, idx: number) => {
    navigator.clipboard?.writeText?.(query);
    setCopiedLegIdx(idx);
    setTimeout(() => setCopiedLegIdx(null), 2000);
  };

  const toggleCheckedLeg = (idx: number) => {
    setCheckedLegs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const allChecked =
    payload.legs.length > 0 && checkedLegs.size === payload.legs.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bet365-modal-title"
    >
      <div className="w-full max-w-2xl bg-[#1E2623] border-2 border-[#FFDF1B] shadow-2xl overflow-hidden text-white font-sans my-auto">
        {/* Authentic Bet365 Forest Green & Yellow Header Bar */}
        <div className="bg-[#00543C] px-5 py-4 border-b border-[#007A57] flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#FFDF1B]">
              <span className="font-bold text-white">
                bet<span className="text-[#FFDF1B]">365</span>
              </span>
              <span aria-hidden="true" className="text-[#66B29B]">·</span>
              <span>Direct Slip Builder & Play Assistant</span>
            </div>
            <h2
              id="bet365-modal-title"
              className="text-lg sm:text-xl font-display font-semibold text-white leading-tight mt-0.5"
            >
              {payload.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-[#003D2B] hover:bg-[#002B1E] text-slate-200 hover:text-white border border-[#007A57] text-xs font-mono-tabular whitespace-nowrap shrink-0 cursor-pointer"
          >
            ✕ Close
          </button>
        </div>

        {/* Summary Strip: Bet Type, Total Odds, Stake & Return */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#2C3833] border-b border-[#2C3833] font-mono-tabular text-xs">
          <div className="bg-[#161D1A] p-3">
            <span className="text-[10px] uppercase text-slate-400 block">
              Bet365 Slip Type
            </span>
            <span className="text-sm font-bold text-white mt-0.5 block">
              {payload.legs.length > 1
                ? `${payload.legs.length}-Fold Acca`
                : 'Single Selection'}
            </span>
          </div>
          <div className="bg-[#161D1A] p-3">
            <span className="text-[10px] uppercase text-slate-400 block">
              Total Combined Odds
            </span>
            <span className="text-sm font-bold text-[#FFDF1B] mt-0.5 block">
              @{payload.totalDecimalOdds.toFixed(2)}
            </span>
          </div>
          <div className="bg-[#161D1A] p-3">
            <span className="text-[10px] uppercase text-slate-400 block">
              Model Confidence
            </span>
            <span className="text-sm font-bold text-[#26C485] mt-0.5 block">
              {payload.combinedWinProb.toFixed(1)}% Sure
            </span>
          </div>
          <div className="bg-[#161D1A] p-3">
            <span className="text-[10px] uppercase text-slate-400 block">
              {payload.recommendedStake.toFixed(2)}
              {payload.currencySymbol} Stake Return
            </span>
            <span className="text-sm font-bold text-[#FFDF1B] mt-0.5 block">
              {payload.totalReturn.toFixed(2)}
              {payload.currencySymbol} (+{payload.potentialProfit.toFixed(2)}
              {payload.currencySymbol})
            </span>
          </div>
        </div>

        {/* Top Action Bar: Copy Entire Slip & Direct Bet365 Links */}
        <div className="p-4 bg-[#19221E] border-b border-[#2C3833] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyFullSlip}
              className="px-3.5 py-2 bg-[#FFDF1B] hover:bg-[#F5D000] text-[#0B1118] font-mono-tabular font-extrabold text-xs uppercase tracking-wider cursor-pointer transition-colors"
            >
              {copiedFullSlip
                ? '✓ Full Bet365 Slip Copied!'
                : '📋 Copy Full Bet365 Slip'}
            </button>
            <button
              type="button"
              onClick={handleCopyCompact}
              className="px-3 py-2 bg-[#25322C] hover:bg-[#2F4038] text-white border border-[#3B4F46] font-mono-tabular font-semibold text-xs cursor-pointer transition-colors"
            >
              {copiedCompact
                ? '✓ Search List Copied!'
                : '📋 Copy Compact Search List'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://www.bet365.com/#/AC/B13/C1/D50/E2/F163/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-[#007A57] hover:bg-[#00966B] text-white font-mono-tabular font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
            >
              <span>Open Bet365 Tennis</span>
              <span>↗</span>
            </a>
            <a
              href="https://www.bet365.com/#/IP/B13"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-2 bg-[#121815] hover:bg-[#25322C] text-[#FFDF1B] border border-[#FFDF1B]/40 font-mono-tabular font-bold text-xs uppercase tracking-wider"
            >
              In-Play ↗
            </a>
          </div>
        </div>

        {/* Step-by-Step Bet365 Legs Checklist */}
        <div className="p-4 max-h-[52vh] overflow-y-auto space-y-2.5 bg-[#121815]">
          <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-300 pb-1">
            <span>
              HOW TO PLAY FAST ON BET365: Click <strong className="text-[#FFDF1B]">Copy Search</strong> on each leg → Paste into Bet365 Search (🔍) → Select Market below:
            </span>
            <span className="text-[#FFDF1B] font-bold shrink-0 ml-2">
              {checkedLegs.size}/{payload.legs.length} Added
            </span>
          </div>

          {payload.legs.map((leg) => {
            const isChecked = checkedLegs.has(leg.index);
            return (
              <div
                key={leg.index}
                className={`p-3.5 border transition-colors ${
                  isChecked
                    ? 'bg-[#0E241C] border-[#26C485]'
                    : 'bg-[#1B2420] border-[#2E3D36]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#2C3833]">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => toggleCheckedLeg(leg.index)}
                      className={`w-5 h-5 flex items-center justify-center font-mono-tabular text-xs font-bold border cursor-pointer ${
                        isChecked
                          ? 'bg-[#26C485] text-[#0B1118] border-[#26C485]'
                          : 'bg-[#121815] text-slate-400 border-slate-600 hover:border-[#FFDF1B]'
                      }`}
                      title="Mark leg as added to your Bet365 slip"
                    >
                      {isChecked ? '✓' : leg.index}
                    </button>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono-tabular text-slate-300">
                        <span className="text-[#FFDF1B] font-bold">
                          0{leg.index}.
                        </span>
                        <span>{leg.tournament}</span>
                        <span aria-hidden="true">·</span>
                        <span>{leg.surface}</span>
                        {leg.matchStatus === 'IN_PROGRESS' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#26C485] font-semibold">
                              In-Play {leg.liveScore ? `(${leg.liveScore})` : ''}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {leg.match}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyLegSearch(leg.bet365SearchQuery, leg.index)
                      }
                      className="px-2.5 py-1 bg-[#283630] hover:bg-[#35473F] text-[#FFDF1B] border border-[#FFDF1B]/40 text-[11px] font-mono-tabular font-bold cursor-pointer"
                      title="Copy match search query for Bet365 search bar"
                    >
                      {copiedLegIdx === leg.index
                        ? '✓ Search Copied!'
                        : `🔍 Copy "${leg.bet365SearchQuery}"`}
                    </button>
                    <a
                      href={leg.bet365EventSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        navigator.clipboard?.writeText?.(leg.bet365SearchQuery);
                      }}
                      className="px-2.5 py-1 bg-[#00543C] hover:bg-[#007A57] text-white border border-[#00966B] text-[11px] font-mono-tabular font-bold"
                      title="Copy search query and open Bet365 search"
                    >
                      Find on Bet365 ↗
                    </a>
                  </div>
                </div>

                {/* Exact Bet365 Tab, Market & Selection Box */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 text-xs font-mono-tabular">
                  <div className="p-2 bg-[#121815] border border-[#283630]">
                    <span className="text-[10px] text-slate-400 uppercase block">
                      1. Bet365 Tab & Market
                    </span>
                    <span className="text-white font-bold mt-0.5 block">
                      [{leg.bet365Tab} Tab] → {leg.bet365MarketTitle}
                    </span>
                  </div>

                  <div className="p-2 bg-[#121815] border border-[#283630] sm:col-span-2 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">
                        2. Exact Bet365 Selection to Click
                      </span>
                      <span className="text-[#FFDF1B] font-extrabold text-sm mt-0.5 block">
                        {leg.bet365SelectionText}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-base font-extrabold text-[#FFDF1B] block">
                        @{leg.decimalOdds.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-[#26C485] block">
                        {leg.estimatedProbability.toFixed(1)}% Win
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Strip */}
        <div className="p-4 bg-[#161D1A] border-t border-[#2C3833] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono-tabular">
          <div className="text-slate-300">
            {allChecked ? (
              <span className="text-[#26C485] font-bold">
                ✓ All {payload.legs.length} selections checked! Enter{' '}
                {payload.recommendedStake.toFixed(2)}
                {payload.currencySymbol} stake in your Bet365 Bet Slip.
              </span>
            ) : (
              <span>
                Recommended Bet365 Stake:{' '}
                <strong className="text-[#FFDF1B]">
                  {payload.recommendedStake.toFixed(2)}
                  {payload.currencySymbol}
                </strong>{' '}
                → Potential Return:{' '}
                <strong className="text-[#26C485]">
                  {payload.totalReturn.toFixed(2)}
                  {payload.currencySymbol}
                </strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyFullSlip}
              className="px-3 py-1.5 bg-[#FFDF1B] hover:bg-[#F5D000] text-[#0B1118] font-bold uppercase cursor-pointer"
            >
              {copiedFullSlip ? '✓ Copied' : 'Copy Bet365 Ticket'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-[#283630] hover:bg-[#35473F] text-white cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
