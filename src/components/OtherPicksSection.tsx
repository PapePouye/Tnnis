import React, { useState } from 'react';
import type { CandidatePick } from '../types';

interface OtherPicksSectionProps {
  candidates: CandidatePick[];
  loading: boolean;
  onRunCustomResearch: (query: string) => Promise<void>;
  onRecordPick: (pick: CandidatePick) => Promise<void>;
  recordedMatches: Set<string>;
}

type FilterMode = 'ALL' | 'PRE_MATCH' | 'IN_PROGRESS' | 'POSITIVE_EV';

function formatShortTime(iso: string | undefined): string {
  if (!iso) return 'N/A';
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return iso;
  }
}

export const OtherPicksSection: React.FC<OtherPicksSectionProps> = ({
  candidates,
  loading,
  onRunCustomResearch,
  onRecordPick,
  recordedMatches,
}) => {
  const [filter, setFilter] = useState<FilterMode>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState('');

  const filteredCandidates = candidates.filter((c) => {
    if (filter === 'PRE_MATCH') return c.matchStatus === 'PRE_MATCH';
    if (filter === 'IN_PROGRESS') return c.matchStatus === 'IN_PROGRESS';
    if (filter === 'POSITIVE_EV')
      return c.expectedValuePercent !== null && c.expectedValuePercent > 0;
    return true;
  });

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuery.trim() || loading) return;
    await onRunCustomResearch(customQuery.trim());
  };

  return (
    <section id="other-picks" className="py-8 border-b border-[#DCD8CE]">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-slate-500 font-mono-tabular uppercase tracking-wider">
            Section 03 · Comparative Market Screening · Pre-Match & In-Play
          </p>
          <h2 className="text-2xl sm:text-3xl font-display text-[#11161D] mt-1">
            Other Picks Considered
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Every match below was researched across prediction sources and compared against published market odds. Click any row to inspect the full 5-factor breakdown, source disagreements, and why it fell short of Today’s Final Pick.
          </p>
        </div>

        {/* Architectural Segmented Filter Control */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EAE7DF] border border-[#DCD8CE] font-mono-tabular self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              filter === 'ALL'
                ? 'bg-[#0B1118] text-[#D4A853]'
                : 'text-slate-700 hover:text-[#11161D]'
            }`}
          >
            All ({candidates.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('PRE_MATCH')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              filter === 'PRE_MATCH'
                ? 'bg-[#0B1118] text-[#D4A853]'
                : 'text-slate-700 hover:text-[#11161D]'
            }`}
          >
            Pre-Match ({candidates.filter((c) => c.matchStatus === 'PRE_MATCH').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('IN_PROGRESS')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              filter === 'IN_PROGRESS'
                ? 'bg-[#0B1118] text-[#D4A853]'
                : 'text-slate-700 hover:text-[#11161D]'
            }`}
          >
            In Progress ({candidates.filter((c) => c.matchStatus === 'IN_PROGRESS').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('POSITIVE_EV')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              filter === 'POSITIVE_EV'
                ? 'bg-[#0B1118] text-[#D4A853]'
                : 'text-slate-700 hover:text-[#11161D]'
            }`}
          >
            +EV ({candidates.filter((c) => (c.expectedValuePercent ?? -1) > 0).length})
          </button>
        </div>
      </div>

      {/* Custom Match / Tournament Research Bar */}
      <form
        onSubmit={handleCustomSubmit}
        className="mb-6 dossier-card p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <div className="flex items-center gap-2.5 flex-1 px-2">
          <span className="text-xs font-mono-tabular uppercase tracking-wider text-slate-400 shrink-0">
            QUERY:
          </span>
          <input
            type="text"
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            placeholder="Filter or research a specific tennis tournament, surface, or matchup (e.g. 'ATP Beijing' or 'WTA live')..."
            className="w-full text-sm text-[#11161D] placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !customQuery.trim()}
          className="px-4 py-2 text-xs font-mono-tabular font-semibold uppercase tracking-wider bg-[#0B1118] text-[#D4A853] hover:bg-[#18222F] disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
        >
          {loading ? 'Scanning...' : 'Scan Custom Slate'}
        </button>
      </form>

      {filteredCandidates.length === 0 ? (
        <div className="dossier-card p-8 text-center">
          <p className="text-sm font-medium text-[#11161D]">
            No candidate matches match the selected filter ({filter.replace('_', ' ')}).
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Switch back to "All" or run a targeted research scan above.
          </p>
        </div>
      ) : (
        <div className="dossier-card divide-y divide-[#DCD8CE]">
          {/* Desktop Table Header */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-3 bg-[#FAF9F5] text-[11px] font-mono-tabular font-semibold uppercase tracking-wider text-slate-500">
            <div className="col-span-4">Match & Status</div>
            <div className="col-span-2">Selection & Market</div>
            <div className="col-span-1 text-right">Odds</div>
            <div className="col-span-1 text-right">Implied</div>
            <div className="col-span-1 text-right">Est. Win</div>
            <div className="col-span-1 text-right">EV %</div>
            <div className="col-span-2 text-right">Evaluation Note</div>
          </div>

          {filteredCandidates.map((cand) => {
            const isExpanded = expandedId === cand.id;
            const isPositiveEv =
              cand.expectedValuePercent !== null && cand.expectedValuePercent > 0;
            const alreadyRecorded = recordedMatches.has(cand.match);

            return (
              <div key={cand.id} className="transition-colors hover:bg-[#FAF9F5]/80">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(isExpanded ? null : cand.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedId(isExpanded ? null : cand.id);
                    }
                  }}
                  className="p-4 sm:px-6 sm:py-4 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-center cursor-pointer"
                >
                  {/* Match & Status */}
                  <div className="lg:col-span-4">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-mono-tabular mb-1">
                      <span
                        className={
                          cand.matchStatus === 'IN_PROGRESS'
                            ? 'font-bold text-[#0D5C3A]'
                            : 'font-medium text-slate-700'
                        }
                      >
                        {cand.matchStatus === 'IN_PROGRESS' ? '● LIVE' : 'PRE-MATCH'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{cand.tournament}</span>
                      <span aria-hidden="true">·</span>
                      <span>{cand.surface}</span>
                      {cand.liveScore && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-[#11161D]">
                            {cand.liveScore}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-[#11161D]">{cand.match}</div>
                  </div>

                  {/* Selection & Market */}
                  <div className="lg:col-span-2">
                    <div className="text-sm font-medium text-[#11161D]">{cand.selection}</div>
                    <div className="text-xs text-slate-500">
                      {cand.market} · {cand.bookmaker}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-4 gap-2 lg:contents pt-2 lg:pt-0 border-t border-[#EAE7DF] lg:border-0">
                    <div className="lg:col-span-1 lg:text-right font-mono-tabular">
                      <span className="lg:hidden block text-[11px] text-slate-400">Odds</span>
                      <span className="text-sm font-semibold text-[#11161D]">
                        {cand.decimalOdds ? cand.decimalOdds.toFixed(2) : 'Unverified'}
                      </span>
                    </div>

                    <div className="lg:col-span-1 lg:text-right font-mono-tabular">
                      <span className="lg:hidden block text-[11px] text-slate-400">Implied</span>
                      <span className="text-sm text-slate-600">
                        {cand.impliedProbability !== null
                          ? `${cand.impliedProbability.toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>

                    <div className="lg:col-span-1 lg:text-right font-mono-tabular">
                      <span className="lg:hidden block text-[11px] text-slate-400">Est. Win</span>
                      <span className="text-sm font-medium text-[#11161D]">
                        {cand.estimatedProbability !== null
                          ? `${cand.estimatedProbability.toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>

                    <div className="lg:col-span-1 lg:text-right font-mono-tabular">
                      <span className="lg:hidden block text-[11px] text-slate-400">EV %</span>
                      <span
                        className={`text-sm font-bold ${
                          cand.expectedValuePercent === null
                            ? 'text-slate-400'
                            : isPositiveEv
                            ? 'text-[#0D5C3A]'
                            : 'text-[#C2492A]'
                        }`}
                      >
                        {cand.expectedValuePercent !== null
                          ? `${cand.expectedValuePercent > 0 ? '+' : ''}${cand.expectedValuePercent.toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Evaluation Note & Expand */}
                  <div className="lg:col-span-2 flex items-center justify-between lg:justify-end gap-2 font-mono-tabular">
                    <span className="text-xs text-slate-500 lg:text-right line-clamp-2 font-sans">
                      {cand.expectedValuePercent === null
                        ? 'Odds unverified'
                        : cand.expectedValuePercent < 0
                        ? 'Negative EV'
                        : cand.expectedValuePercent < 2.0
                        ? 'Below +2.0% EV gate'
                        : 'Secondary +EV candidate'}
                    </span>
                    <span className="text-xs text-slate-500 shrink-0">
                      {isExpanded ? '−' : '+'}
                    </span>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="px-4 pb-5 pt-3 sm:px-6 bg-[#FAF9F5] border-t border-[#DCD8CE] space-y-4 text-xs sm:text-sm">
                    <div className="p-3 bg-white border border-[#DCD8CE]">
                      <span className="font-semibold text-[#11161D]">
                        Why Not Today’s #1 Pick:{' '}
                      </span>
                      <span className="text-slate-700">
                        {cand.rejectionReason ||
                          'Evaluated below the primary selection on expected value or source verification confidence.'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-mono-tabular font-semibold uppercase tracking-wider text-[#11161D]">
                          Matchup Reasoning & Factors
                        </h4>
                        <p className="text-xs text-slate-700 leading-relaxed">{cand.reasoning}</p>
                        <dl className="divide-y divide-[#EAE7DF] text-xs pt-2">
                          <div className="py-1.5 flex justify-between gap-4">
                            <dt className="text-slate-500 shrink-0">Recent Form:</dt>
                            <dd className="text-[#11161D] text-right">{cand.factors.recentForm}</dd>
                          </div>
                          <div className="py-1.5 flex justify-between gap-4">
                            <dt className="text-slate-500 shrink-0">Surface Profile:</dt>
                            <dd className="text-[#11161D] text-right">
                              {cand.factors.surfaceAnalysis}
                            </dd>
                          </div>
                          <div className="py-1.5 flex justify-between gap-4">
                            <dt className="text-slate-500 shrink-0">Head-to-Head:</dt>
                            <dd className="text-[#11161D] text-right">{cand.factors.headToHead}</dd>
                          </div>
                          <div className="py-1.5 flex justify-between gap-4">
                            <dt className="text-slate-500 shrink-0">Injuries / Fitness:</dt>
                            <dd className="text-[#11161D] text-right">
                              {cand.factors.injuriesAndFitness}
                            </dd>
                          </div>
                          <div className="py-1.5 flex justify-between gap-4">
                            <dt className="text-slate-500 shrink-0">Match Conditions:</dt>
                            <dd className="text-[#11161D] text-right">
                              {cand.factors.matchConditions}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h4 className="text-xs font-mono-tabular font-semibold uppercase tracking-wider text-[#11161D]">
                            Source Consensus & Disagreements
                          </h4>
                          <p className="text-xs text-slate-700 mt-1">
                            <strong className="font-semibold text-[#11161D]">Consensus:</strong>{' '}
                            {cand.sourceConsensus}
                          </p>
                          <p className="text-xs text-slate-700 mt-1">
                            <strong className="font-semibold text-[#11161D]">Disagreement:</strong>{' '}
                            {cand.sourceDisagreement}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-xs font-mono-tabular font-semibold uppercase tracking-wider text-[#C2492A]">
                            Principal Risks
                          </h4>
                          <ul className="list-disc pl-4 mt-1 space-y-1 text-xs text-slate-700">
                            {cand.mainRisks.map((r, idx) => (
                              <li key={idx}>{r}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-[#DCD8CE]">
                          <span className="text-xs text-slate-500 font-mono-tabular">
                            Line checked at {formatShortTime(cand.oddsCheckedAt)}
                          </span>
                          {cand.decimalOdds && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRecordPick(cand);
                              }}
                              disabled={alreadyRecorded}
                              className="px-3.5 py-1.5 text-xs font-mono-tabular font-semibold uppercase tracking-wider bg-[#0B1118] text-[#D4A853] hover:bg-[#18222F] disabled:opacity-50 cursor-pointer"
                            >
                              {alreadyRecorded ? '✓ Recorded' : 'Stake in Simulator'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
