import React from 'react';
import type { DataFeedStatus, SourceCitation } from '../types';

interface SourcesSectionProps {
  sources: SourceCitation[];
  feedStatus?: DataFeedStatus;
  onOpenSetupGuide: () => void;
}

function formatCheckTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return iso;
  }
}

function formatTypeLabel(type: SourceCitation['type']): string {
  switch (type) {
    case 'PREDICTION_SITE':
      return 'Prediction & Analysis';
    case 'OFFICIAL_TOUR':
      return 'Official Tour Source';
    case 'ODDS_FEED':
      return 'Odds Comparison';
    case 'STATS_DATABASE':
      return 'Statistical Database';
    default:
      return 'Verified Web Citation';
  }
}

export const SourcesSection: React.FC<SourcesSectionProps> = ({
  sources,
  feedStatus,
  onOpenSetupGuide,
}) => {
  return (
    <section id="sources" className="py-8 border-b border-[#DCD8CE]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-slate-500 font-mono-tabular uppercase tracking-wider">
            Section 06 · Citation Audit & Compliant Data Feeds
          </p>
          <h2 className="text-2xl sm:text-3xl font-display text-[#11161D] mt-1">
            Sources & Verification Timestamps
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Every source consulted during the current research run is linked below along with the exact timestamp when the page and odds were checked. We never invent citations or extrapolate unverified lines.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenSetupGuide}
          className="px-3.5 py-2 text-xs font-mono-tabular font-semibold uppercase tracking-wider bg-white border border-[#DCD8CE] text-[#11161D] hover:bg-[#FAF9F5] self-start sm:self-auto whitespace-nowrap cursor-pointer"
        >
          Data Feeds & API Architecture →
        </button>
      </div>

      {/* Compliant Data Feeds Status Grid */}
      {feedStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px dossier-grid-hairline mb-6">
          <div className="bg-white p-4">
            <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-500">
              <span>TENNIS ABSTRACT ELO FEED</span>
              <span className="font-bold text-[#0D5C3A]">
                {feedStatus.geminiSearchGrounding.active ? '● CONNECTED' : 'INACTIVE'}
              </span>
            </div>
            <p className="text-xs text-slate-800 mt-1.5 leading-relaxed">
              {feedStatus.geminiSearchGrounding.statusText}
            </p>
            <div className="text-[11px] text-slate-400 font-mono-tabular mt-2">
              Checked: {formatCheckTimestamp(feedStatus.geminiSearchGrounding.checkedAt)}
            </div>
          </div>

          <div className="bg-white p-4">
            <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-500">
              <span>ATP / WTA SCOREBOARD API</span>
              <span
                className={`font-bold ${
                  feedStatus.publicTourScoreboard.active ? 'text-[#0D5C3A]' : 'text-[#C2492A]'
                }`}
              >
                {feedStatus.publicTourScoreboard.active ? '● CONNECTED' : 'FALLBACK'}
              </span>
            </div>
            <p className="text-xs text-slate-800 mt-1.5 leading-relaxed">
              {feedStatus.publicTourScoreboard.statusText}
            </p>
            <div className="text-[11px] text-slate-400 font-mono-tabular mt-2">
              Checked: {formatCheckTimestamp(feedStatus.publicTourScoreboard.checkedAt)}
            </div>
          </div>

          <div className="bg-white p-4">
            <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-500">
              <span>REGULATED BOOKMAKER FEED</span>
              <span
                className={`font-bold ${
                  feedStatus.liveBookmakerFeed.active ? 'text-[#0D5C3A]' : 'text-slate-600'
                }`}
              >
                {feedStatus.liveBookmakerFeed.active
                  ? '● DIRECT API'
                  : 'WEB MODE'}
              </span>
            </div>
            <p className="text-xs text-slate-800 mt-1.5 leading-relaxed">
              {feedStatus.liveBookmakerFeed.statusText}
            </p>
            <div className="text-[11px] text-slate-400 font-mono-tabular mt-2">
              Checked: {formatCheckTimestamp(feedStatus.liveBookmakerFeed.checkedAt)}
            </div>
          </div>
        </div>
      )}

      {/* Verified Source Links Table */}
      {sources.length === 0 ? (
        <div className="dossier-card p-6 text-center">
          <p className="text-sm font-medium text-[#11161D]">
            No external source citations were verified in this scan.
          </p>
        </div>
      ) : (
        <div className="dossier-card divide-y divide-[#DCD8CE]">
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-[#FAF9F5] text-[11px] font-mono-tabular font-semibold uppercase tracking-wider text-slate-500">
            <div className="col-span-3">Publisher & Category</div>
            <div className="col-span-5">Source Document / Page Title</div>
            <div className="col-span-2">Checked Timestamp</div>
            <div className="col-span-2 text-right">Direct Citation</div>
          </div>

          {sources.map((src) => (
            <div
              key={src.id}
              className="p-4 sm:px-6 sm:py-3.5 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center text-xs sm:text-sm hover:bg-[#FAF9F5]/80 transition-colors"
            >
              <div className="md:col-span-3">
                <div className="font-semibold text-[#11161D] truncate">
                  {src.publisher}
                </div>
                <div className="text-xs text-slate-500 font-mono-tabular mt-0.5">
                  {formatTypeLabel(src.type)}
                </div>
              </div>

              <div className="md:col-span-5 text-slate-700 truncate" title={src.title}>
                {src.title}
              </div>

              <div className="md:col-span-2 text-xs text-slate-500 font-mono-tabular">
                {formatCheckTimestamp(src.checkedAt)}
              </div>

              <div className="md:col-span-2 md:text-right font-mono-tabular">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[#11161D] hover:text-[#0D5C3A] underline"
                >
                  Verify Source ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
