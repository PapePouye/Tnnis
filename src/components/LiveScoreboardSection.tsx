import React, { useState, useEffect } from 'react';
import type { CandidatePick, LiveScoreboardMatch } from '../types';

interface LiveScoreboardSectionProps {
  matches: LiveScoreboardMatch[];
  feedActive: boolean;
  feedStatusText: string;
  checkedAt?: string;
  onRefreshScoreboard: () => Promise<void>;
  refreshing: boolean;
  onResearchMatch: (query: string) => Promise<void>;
  researching: boolean;
  onRecordLivePronostic: (pick: CandidatePick) => Promise<void>;
  recordedMatches: Set<string>;
  onFinishMatch?: (match: string, winnerName: string, score?: string) => Promise<void>;
  settlingMatch?: boolean;
}

export const LiveScoreboardSection: React.FC<LiveScoreboardSectionProps> = ({
  matches,
  feedActive,
  feedStatusText,
  checkedAt,
  onRefreshScoreboard,
  refreshing,
  onResearchMatch,
  researching,
  onRecordLivePronostic,
  recordedMatches,
  onFinishMatch,
  settlingMatch = false,
}) => {
  const inProgressCount = matches.filter((m) => m.status === 'IN_PROGRESS').length;
  const preMatchCount = matches.filter((m) => m.status === 'PRE_MATCH').length;
  const completedCount = matches.filter((m) => m.status === 'COMPLETED').length;

  const [statusFilter, setStatusFilter] = useState<'IN_PROGRESS' | 'PRE_MATCH' | 'COMPLETED' | 'ALL'>(
    'IN_PROGRESS'
  );
  const [autoRefreshLive, setAutoRefreshLive] = useState<boolean>(true);

  useEffect(() => {
    if (!autoRefreshLive) return;
    const timer = setInterval(() => {
      onRefreshScoreboard();
    }, 15000);
    return () => clearInterval(timer);
  }, [autoRefreshLive, onRefreshScoreboard]);

  const effectiveFilter =
    statusFilter === 'IN_PROGRESS' && inProgressCount === 0 ? 'ALL' : statusFilter;

  const displayedMatches = matches.filter((m) => {
    if (effectiveFilter === 'IN_PROGRESS') return m.status === 'IN_PROGRESS';
    if (effectiveFilter === 'PRE_MATCH') return m.status === 'PRE_MATCH';
    if (effectiveFilter === 'COMPLETED') return m.status === 'COMPLETED';
    return true;
  });

  const handleTrackMatchPronostic = async (m: LiveScoreboardMatch) => {
    if (!m.pronostic || !m.pronostic.decimalOdds) return;
    const p = m.pronostic;
    const candidatePick: CandidatePick = {
      id: `live-sb-${m.id}`,
      match: `${m.playerA} vs. ${m.playerB}`,
      playerA: m.playerA,
      playerB: m.playerB,
      tournament: m.tournament,
      round: m.round,
      surface: m.surface,
      matchStatus: m.status,
      liveScore: m.scoreSummary,
      selection: p.recommendedPick,
      market: p.market,
      decimalOdds: p.decimalOdds,
      americanOdds: p.americanOdds,
      bookmaker: 'Unibet / Kambi Live Feed',
      oddsCheckedAt: m.checkedAt,
      impliedProbability: p.impliedProbability,
      estimatedProbability: p.estimatedProbability,
      edgePercent: p.edgePercent,
      expectedValuePercent: p.expectedValuePercent,
      reasoning: p.liveMomentumNote,
      selectionMethodology: 'Live Scoreline State + Surface Elo + Live Market Model',
      sourceConsensus: `Projected Winner: ${p.projectedWinner} (${p.projectedWinnerProb}%)`,
      sourceDisagreement: p.eloSummary,
      mainRisks: ['In-play break point volatility'],
      factors: {
        recentForm: p.eloSummary,
        surfaceAnalysis: m.surface,
        headToHead: `${m.playerA} ${p.winProbPlayerA}% vs. ${m.playerB} ${p.winProbPlayerB}%`,
        injuriesAndFitness: 'Active on court',
        matchConditions: m.scoreSummary,
      },
      sourceUrls: [m.sourceUrl],
    };
    await onRecordLivePronostic(candidatePick);
  };

  return (
    <section id="live-matches" className="py-8 border-b border-[#DCD8CE]">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-slate-500 font-mono-tabular uppercase tracking-wider">
            Section 04 · Real-Time In-Play Winner Pronostics & Tour Scoreboard
          </p>
          <h2 className="text-2xl sm:text-3xl font-display text-[#11161D] mt-1">
            Live Games In Progress — Winner Pronostics & In-Play Value
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Every match currently <strong className="font-semibold text-[#11161D]">In Progress</strong> includes a real-time{' '}
            <strong className="font-semibold text-[#11161D]">Projected Winner Pronostic</strong>, live win probability bar, live bookmaker odds, and expected value edge calculated from the current set/game score and surface Elo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono-tabular">
          <div className="flex items-center gap-1 p-1 bg-[#EAE7DF] border border-[#DCD8CE]">
            <button
              type="button"
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                effectiveFilter === 'IN_PROGRESS'
                  ? 'bg-[#0B1118] text-[#D4A853]'
                  : 'text-slate-700 hover:text-[#11161D]'
              }`}
            >
              ● In Progress ({inProgressCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PRE_MATCH')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                effectiveFilter === 'PRE_MATCH'
                  ? 'bg-[#0B1118] text-[#D4A853]'
                  : 'text-slate-700 hover:text-[#11161D]'
              }`}
            >
              Pre-Match ({preMatchCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                effectiveFilter === 'COMPLETED'
                  ? 'bg-[#0B1118] text-[#D4A853]'
                  : 'text-slate-700 hover:text-[#11161D]'
              }`}
            >
              Completed ({completedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                effectiveFilter === 'ALL'
                  ? 'bg-[#0B1118] text-[#D4A853]'
                  : 'text-slate-700 hover:text-[#11161D]'
              }`}
            >
              All ({matches.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAutoRefreshLive(!autoRefreshLive)}
            className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider border transition-colors whitespace-nowrap cursor-pointer ${
              autoRefreshLive
                ? 'bg-[#0D5C3A] text-white border-[#0D5C3A]'
                : 'bg-white text-[#11161D] border-[#DCD8CE] hover:bg-[#FAF9F5]'
            }`}
          >
            {autoRefreshLive ? '● Fast Live Sync (15s)' : 'Sync Paused'}
          </button>

          <button
            type="button"
            onClick={onRefreshScoreboard}
            disabled={refreshing}
            className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider bg-[#0B1118] text-[#D4A853] hover:bg-[#18222F] disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {refreshing ? 'Syncing...' : 'Refresh Live'}
          </button>
        </div>
      </div>

      {/* Feed Status & Transparency Bar */}
      <div className="mb-4 px-4 py-3 dossier-card flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 font-mono-tabular">
        <div>
          <span className="font-semibold text-[#11161D]">Live Tour & Odds Feed: </span>
          <span>{feedStatusText}</span>
        </div>
        {checkedAt && (
          <div className="text-slate-500 shrink-0">
            Last checked:{' '}
            {new Date(checkedAt).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZoneName: 'short',
            })}
          </div>
        )}
      </div>

      {displayedMatches.length === 0 ? (
        <div className="dossier-card p-8 text-center">
          <p className="text-sm font-medium text-[#11161D]">
            {feedActive
              ? 'No matches match the current filter.'
              : 'Live tour scoreboard could not be reached right now.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {displayedMatches.slice(0, 16).map((m) => {
            const p = m.pronostic;
            const matchTitle = `${m.playerA} vs. ${m.playerB}`;
            const isRecorded = recordedMatches.has(matchTitle);
            const isPositiveEv =
              p?.expectedValuePercent !== null &&
              p?.expectedValuePercent !== undefined &&
              p.expectedValuePercent >= 1.5;

            return (
              <div
                key={m.id}
                className="dossier-card p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {/* Top Row: Status + Tour + Surface + Score */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 font-mono-tabular">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={
                          m.status === 'IN_PROGRESS'
                            ? 'font-bold text-[#0D5C3A]'
                            : 'font-semibold text-slate-700'
                        }
                      >
                        {m.status === 'IN_PROGRESS'
                          ? '● LIVE IN PROGRESS'
                          : m.status === 'COMPLETED'
                          ? 'COMPLETED'
                          : 'UPCOMING'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-[#11161D]">{m.tour}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate max-w-[170px]">{m.tournament}</span>
                      <span aria-hidden="true">·</span>
                      <span>{m.surface}</span>
                    </div>
                    <span className="text-slate-500 shrink-0">{m.round}</span>
                  </div>

                  {/* Players & Live Scoreline */}
                  <div className="flex items-baseline justify-between gap-4 border-b border-[#EAE7DF] pb-3">
                    <div>
                      <div className="text-xl font-display text-[#11161D]">
                        {m.playerA}{' '}
                        {p?.servingPlayer === 'A' && (
                          <span
                            title="Currently Serving"
                            className="inline-block text-[10px] font-mono-tabular text-[#0D5C3A] font-bold align-middle ml-1"
                          >
                            [SRV]
                          </span>
                        )}{' '}
                        <span className="text-slate-400 font-sans font-normal text-xs">vs.</span>{' '}
                        {m.playerB}
                        {p?.servingPlayer === 'B' && (
                          <span
                            title="Currently Serving"
                            className="inline-block text-[10px] font-mono-tabular text-[#0D5C3A] font-bold align-middle ml-1"
                          >
                            [SRV]
                          </span>
                        )}
                      </div>
                      {p && (
                        <div className="text-xs text-slate-500 font-mono-tabular mt-1">
                          {p.eloSummary}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-400 font-mono-tabular uppercase">
                        {m.status === 'IN_PROGRESS' ? 'Live Score' : 'Scheduled'}
                      </div>
                      <div className="text-sm font-mono-tabular font-bold text-[#11161D] mt-0.5">
                        {m.scoreSummary}
                      </div>
                    </div>
                  </div>

                  {/* LIVE PRONOSTIC & WIN PROBABILITY PANEL */}
                  {p && (
                    <div className="bg-[#FAF9F5] border border-[#DCD8CE] p-3.5 space-y-3">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">Projected Winner: </span>
                          <span className="font-bold text-[#11161D]">{p.projectedWinner}</span>{' '}
                          <span className="font-mono-tabular font-semibold text-[#0D5C3A]">
                            ({p.projectedWinnerProb}% Win Prob)
                          </span>
                        </div>
                        {p.oddsPlayerA && p.oddsPlayerB && (
                          <div className="font-mono-tabular text-slate-600 text-[11px]">
                            Lines: {p.oddsPlayerA.toFixed(2)} / {p.oddsPlayerB.toFixed(2)}
                          </div>
                        )}
                      </div>

                      {/* Win Probability Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] font-mono-tabular text-slate-600 mb-1">
                          <span>
                            {m.playerA}: <strong>{p.winProbPlayerA}%</strong>
                          </span>
                          <span>
                            {m.playerB}: <strong>{p.winProbPlayerB}%</strong>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#EAE7DF] flex overflow-hidden">
                          <div
                            className="bg-[#0B1118] h-full"
                            style={{ width: `${p.winProbPlayerA}%` }}
                          />
                          <div
                            className="bg-[#0D5C3A] h-full"
                            style={{ width: `${p.winProbPlayerB}%` }}
                          />
                        </div>
                      </div>

                      {/* Recommended In-Play / Match Pick & EV */}
                      <div className="pt-2 border-t border-[#DCD8CE] flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">Pronostic: </span>
                          <span className="font-semibold text-[#11161D]">
                            {p.recommendedPick}
                          </span>
                          {p.decimalOdds && (
                            <span className="font-mono-tabular text-slate-700 ml-1">
                              @ {p.decimalOdds.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {p.expectedValuePercent !== null && (
                          <div className="font-mono-tabular">
                            <span
                              className={`font-semibold ${
                                isPositiveEv
                                  ? 'text-[#0D5C3A]'
                                  : p.expectedValuePercent < 0
                                  ? 'text-slate-500'
                                  : 'text-slate-700'
                              }`}
                            >
                              {p.expectedValuePercent > 0 ? '+' : ''}
                              {p.expectedValuePercent.toFixed(1)}% EV
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {p.liveMomentumNote}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div className="pt-3 border-t border-[#EAE7DF] flex flex-col gap-2 text-xs font-mono-tabular">
                  {/* Quick Finish / Result Bar */}
                  {m.status === 'COMPLETED' ? (
                    <div className="flex items-center justify-between text-[11px] text-[#0D5C3A] bg-[#EBF7EE] px-2.5 py-1">
                      <span className="font-bold">✓ FINAL RESULT SETTLED</span>
                      <span>{m.statusDetail || m.scoreSummary}</span>
                    </div>
                  ) : onFinishMatch ? (
                    <div className="flex items-center justify-between gap-1 text-[11px] bg-[#FAF9F5] border border-[#EAE7DF] px-2 py-1">
                      <span className="text-slate-500 font-medium">⚡ Set Final Winner:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={settlingMatch}
                          onClick={() => onFinishMatch(`${m.playerA} vs. ${m.playerB}`, m.playerA, m.scoreSummary || '6-4, 6-3 (Final)')}
                          className="px-2 py-0.5 font-semibold text-[#0D5C3A] bg-white border border-[#0D5C3A]/40 hover:bg-[#0D5C3A] hover:text-white transition-colors cursor-pointer"
                          title={`Set ${m.playerA} as winner & roll next pick`}
                        >
                          {m.playerA.split(' ').pop()} Won
                        </button>
                        <button
                          type="button"
                          disabled={settlingMatch}
                          onClick={() => onFinishMatch(`${m.playerA} vs. ${m.playerB}`, m.playerB, m.scoreSummary || '6-4, 6-3 (Final)')}
                          className="px-2 py-0.5 font-semibold text-[#C2492A] bg-white border border-[#C2492A]/40 hover:bg-[#C2492A] hover:text-white transition-colors cursor-pointer"
                          title={`Set ${m.playerB} as winner & roll next pick`}
                        >
                          {m.playerB.split(' ').pop()} Won
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={researching}
                        onClick={() => onResearchMatch(`${m.playerA} ${m.playerB}`)}
                        className="font-semibold text-[#11161D] hover:text-[#0D5C3A] disabled:opacity-50 cursor-pointer underline underline-offset-4"
                      >
                        Focus Match →
                      </button>

                      <a
                        href={m.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-[#11161D] underline"
                      >
                        Scoreboard ↗
                      </a>
                    </div>

                    {p && p.decimalOdds && (
                      <button
                        type="button"
                        onClick={() => handleTrackMatchPronostic(m)}
                        disabled={isRecorded}
                        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider bg-[#0B1118] text-[#D4A853] hover:bg-[#18222F] disabled:opacity-50 cursor-pointer"
                      >
                        {isRecorded ? '✓ Tracked' : 'Stake Pronostic'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
