import React from 'react';
import type { DataFeedStatus } from '../types';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedStatus?: DataFeedStatus;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({
  isOpen,
  onClose,
  feedStatus,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0B1118]/75 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-guide-title"
    >
      <div className="dossier-card max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
        {/* Architectural Obsidian Modal Header */}
        <div className="bg-[#0B1118] text-white px-6 py-4 flex items-start justify-between gap-4 border-b border-[#222C38]">
          <div>
            <p className="text-xs text-[#D4A853] font-mono-tabular">
              Architecture, Data Feeds & Compliance Dossier
            </p>
            <h2
              id="setup-guide-title"
              className="text-2xl font-display text-white mt-0.5"
            >
              Data Feeds, Environment Setup & Value Methodology
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-mono-tabular text-slate-300 border border-[#283545] hover:border-slate-400 hover:text-white cursor-pointer"
            aria-label="Close modal"
          >
            Close [×]
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed overflow-y-auto">
          {/* 1. Data Feeds & API Keys */}
          <div>
            <h3 className="text-base font-display text-[#11161D] mb-1.5">
              01. Configured Data Feeds & Server Architecture
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              All API requests execute strictly on the Express backend server (
              <code className="font-mono-tabular bg-[#FAF9F5] border border-[#DCD8CE] px-1.5 py-0.5">
                /api/*
              </code>
              ) to respect website terms, prevent CORS issues, and keep credentials server-side.
            </p>

            <div className="divide-y divide-[#DCD8CE] border border-[#DCD8CE]">
              <div className="p-4 bg-[#FAF9F5]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-tabular font-semibold text-[#11161D]">
                    Tennis Abstract Surface Elo Engine (Built-In)
                  </span>
                  <span className="text-xs font-mono-tabular text-[#0D5C3A] font-semibold">
                    {feedStatus?.geminiSearchGrounding.active ? '● Connected' : 'Active'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Indexes 950+ live ATP and WTA player profiles with surface-specific Elo ratings (
                  <code className="font-mono-tabular">hElo</code>,{' '}
                  <code className="font-mono-tabular">cElo</code>,{' '}
                  <code className="font-mono-tabular">gElo</code>) and career peak metrics for objective head-to-head win probability modeling.
                </p>
              </div>

              <div className="p-4 bg-white">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-tabular font-semibold text-[#11161D]">
                    ATP / WTA Public Scoreboard API (Built-In)
                  </span>
                  <span className="text-xs font-mono-tabular text-[#0D5C3A] font-semibold">
                    {feedStatus?.publicTourScoreboard.active ? '● Connected' : 'Fallback Mode'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Queries public tour scoreboard endpoints (
                  <code className="font-mono-tabular">
                    site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard
                  </code>{' '}
                  and <code className="font-mono-tabular">wta/scoreboard</code>) to identify whether each match is <strong>Pre-Match</strong> or <strong>In Progress</strong> and retrieve live set/game scores.
                </p>
              </div>

              <div className="p-4 bg-[#FAF9F5]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-tabular font-semibold text-[#11161D]">
                    Regulated Sportsbook Odds Feed (Kambi / Unibet + Optional ODDS_API_KEY)
                  </span>
                  <span className="text-xs font-mono-tabular text-[#0D5C3A] font-semibold">
                    {feedStatus?.liveBookmakerFeed.active
                      ? '● Live Odds Connected'
                      : 'Grounded Mode'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Retrieves live European decimal and American moneyline prices for active ATP and WTA main-draw matches, de-vigging bookmaker margins to compute true market implied probabilities.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Value Selection & Mathematical Gate */}
          <div>
            <h3 className="text-base font-display text-[#11161D] mb-1.5">
              02. Quantitative Value Selection Criteria
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
              <li>
                <strong>Implied Probability:</strong> Calculated from verified decimal odds as{' '}
                <code className="font-mono-tabular">P_implied = (1 / Decimal_Odds) × 100</code>.
              </li>
              <li>
                <strong>
                  Estimated Win Probability (<code className="font-mono-tabular">P_est</code>):
                </strong>{' '}
                Synthesized from objective factors—surface Elo ratings, hold/break percentages, recent tour form, head-to-head history, injury/medical timeout reports, and court speed—never copied blindly because a tipster calls a heavy favorite a “top pick.”
              </li>
              <li>
                <strong>Expected Value (EV %):</strong>{' '}
                <code className="font-mono-tabular">
                  EV% = ((P_est / 100) × Decimal_Odds - 1) × 100
                </code>
                .
              </li>
              <li>
                <strong>Strict “No Pick Today” Gate:</strong> A daily final pick is recommended{' '}
                <em>only</em> when at least one candidate has verified source citations, verified decimal odds, an Expected Value of{' '}
                <code className="font-mono-tabular">≥ +2.0%</code>, and a probability edge of{' '}
                <code className="font-mono-tabular">≥ +1.5%</code>. Otherwise, the system outputs{' '}
                <strong>“No pick today”</strong>.
              </li>
            </ul>
          </div>

          {/* 3. Live Data Limitations & Compliance */}
          <div className="p-4 bg-[#FAF9F5] border border-[#DCD8CE] text-xs text-slate-600 space-y-1">
            <div className="font-mono-tabular font-semibold text-[#11161D]">
              Compliance & Live Data Availability Notice
            </div>
            <p>
              CourtEdge uses compliant public APIs rather than unauthorized scraping. Sub-second point-by-point in-play betting lines fluctuate rapidly during live tennis points; if live in-play odds cannot be verified at check time, the match is marked{' '}
              <em>Odds Unverified</em> and excluded from recommendation.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-[#FAF9F5] border-t border-[#DCD8CE] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-mono-tabular font-semibold bg-[#0B1118] text-[#D4A853] hover:bg-[#18222F] cursor-pointer"
          >
            Close Reference Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
