import React, { useState, useEffect } from 'react';

interface PlayerProfile {
  name: string;
  eloRank: number;
  officialRank: number | null;
  tour: 'ATP' | 'WTA';
  age: number;
  elo: number;
  hElo: number;
  cElo: number;
  gElo: number;
  peakElo: number;
}

export const PlayerStatsDatabaseSection: React.FC = () => {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [tourFilter, setTourFilter] = useState<'ALL' | 'ATP' | 'WTA'>('ALL');

  // Head-to-Head Simulator
  const [playerA, setPlayerA] = useState<string>('Jannik Sinner');
  const [playerB, setPlayerB] = useState<string>('Carlos Alcaraz');
  const [surface, setSurface] = useState<string>('Hard (Outdoor)');
  const [h2hResult, setH2hResult] = useState<any>(null);
  const [loadingH2h, setLoadingH2h] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/players?tour=ALL')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.players) {
          setPlayers(data.players);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const runH2hCalculation = (pA: string, pB: string, surf: string) => {
    setLoadingH2h(true);
    fetch(`/api/matchup?playerA=${encodeURIComponent(pA)}&playerB=${encodeURIComponent(pB)}&surface=${encodeURIComponent(surf)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setH2hResult(data);
        setLoadingH2h(false);
      })
      .catch(() => setLoadingH2h(false));
  };

  useEffect(() => {
    runH2hCalculation(playerA, playerB, surface);
  }, []);

  const filteredPlayers = players.filter((p) => {
    if (tourFilter !== 'ALL' && p.tour !== tourFilter) return false;
    if (search.trim()) {
      return p.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  return (
    <section id="player-stats-station" className="py-8 border-b border-[#E2E8F0]">
      {/* Header Desk */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono-tabular tracking-wider text-[#0A5C36]">
            <span>MODULE 08 · TENNIS ABSTRACT SURFACE ELO RATINGS & H2H</span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span>HARD · CLAY · GRASS RATINGS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-semibold text-[#0F172A] mt-1">
            Player Statistics & Head-to-Head Database
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Surface-adjusted Elo ratings calibrated by court speed and surface-specific hold/break statistics. Simulate any matchup across Hard, Clay, and Grass to determine theoretical fair odds.
          </p>
        </div>
      </div>

      {/* Head-to-Head Calculator Card */}
      <div className="p-5 bg-white border border-[#E2E8F0] mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
          <div className="text-xs font-mono-tabular font-bold uppercase tracking-wider text-[#0A5C36]">
            Interactive Surface H2H Simulator
          </div>
          <div className="text-xs font-mono-tabular text-slate-500">
            Select two players and surface to compute Markov point probabilities
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono-tabular">
          <div>
            <label className="block text-slate-500 mb-1">Player A:</label>
            <input
              type="text"
              value={playerA}
              onChange={(e) => setPlayerA(e.target.value)}
              className="w-full p-2 bg-[#F8F9FA] border border-[#CBD5E1] text-[#0F172A] font-semibold"
            />
          </div>
          <div>
            <label className="block text-slate-500 mb-1">Player B:</label>
            <input
              type="text"
              value={playerB}
              onChange={(e) => setPlayerB(e.target.value)}
              className="w-full p-2 bg-[#F8F9FA] border border-[#CBD5E1] text-[#0F172A] font-semibold"
            />
          </div>
          <div>
            <label className="block text-slate-500 mb-1">Court Surface:</label>
            <select
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
              className="w-full p-2 bg-[#F8F9FA] border border-[#CBD5E1] text-[#0F172A] font-semibold"
            >
              <option value="Hard (Outdoor)">Hard (Outdoor)</option>
              <option value="Hard (Indoor)">Hard (Indoor)</option>
              <option value="Clay">Clay</option>
              <option value="Grass">Grass</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => runH2hCalculation(playerA, playerB, surface)}
            disabled={loadingH2h}
            className="px-4 py-2 bg-[#0B1118] text-[#D4A853] hover:bg-[#1E293B] text-xs font-mono-tabular font-semibold cursor-pointer disabled:opacity-50"
          >
            {loadingH2h ? 'Computing Matchup...' : 'Simulate Matchup →'}
          </button>
        </div>

        {/* H2H Output Banner */}
        {h2hResult && (
          <div className="p-4 bg-[#F8F9FA] border border-[#E2E8F0] space-y-3 font-mono-tabular text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2">
              <span className="font-bold text-[#0F172A]">
                Simulation: {h2hResult.playerA?.name} vs. {h2hResult.playerB?.name} on {h2hResult.surface}
              </span>
              <span className="text-slate-500">
                Elo Differential: {h2hResult.eloDifferential > 0 ? '+' : ''}{h2hResult.eloDifferential} pts
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white border border-[#E2E8F0] space-y-1">
                <div className="text-sm font-bold text-[#0A5C36]">{h2hResult.playerA?.name}</div>
                <div>Surface Elo: <strong className="text-[#0F172A]">{h2hResult.playerA?.surfaceElo}</strong> (Overall: {h2hResult.playerA?.elo})</div>
                <div>Estimated Win Prob: <strong className="text-[#0A5C36]">{h2hResult.playerA?.ensembleWinProb}%</strong></div>
                <div>Fair Decimal Odds: <strong className="text-[#0F172A]">@{h2hResult.playerA?.fairOdds}</strong></div>
              </div>

              <div className="p-3 bg-white border border-[#E2E8F0] space-y-1">
                <div className="text-sm font-bold text-slate-800">{h2hResult.playerB?.name}</div>
                <div>Surface Elo: <strong className="text-[#0F172A]">{h2hResult.playerB?.surfaceElo}</strong> (Overall: {h2hResult.playerB?.elo})</div>
                <div>Estimated Win Prob: <strong className="text-slate-700">{h2hResult.playerB?.ensembleWinProb}%</strong></div>
                <div>Fair Decimal Odds: <strong className="text-[#0F172A]">@{h2hResult.playerB?.fairOdds}</strong></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search & Tour Filter for Players Table */}
      <div className="p-3 bg-white border border-[#E2E8F0] mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono-tabular">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <span className="text-slate-400">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player in Tennis Abstract database..."
            className="w-full bg-transparent border-none text-[#0F172A] focus:outline-none text-xs"
          />
        </div>

        <div className="flex items-center gap-1">
          {(['ALL', 'ATP', 'WTA'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTourFilter(t)}
              className={`px-3 py-1 cursor-pointer font-semibold ${
                tourFilter === t ? 'bg-[#0A5C36] text-white' : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              {t} Tour
            </button>
          ))}
        </div>
      </div>

      {/* Players Elo Table */}
      <div className="bg-white border border-[#E2E8F0] overflow-x-auto text-xs font-mono-tabular">
        <table className="w-full text-left">
          <thead className="bg-[#F1F5F9] text-slate-600 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="p-2.5">Elo Rank</th>
              <th className="p-2.5">Player</th>
              <th className="p-2.5">Tour</th>
              <th className="p-2.5 text-right">Official Rank</th>
              <th className="p-2.5 text-right">Overall Elo</th>
              <th className="p-2.5 text-right">Hard Elo</th>
              <th className="p-2.5 text-right">Clay Elo</th>
              <th className="p-2.5 text-right">Grass Elo</th>
              <th className="p-2.5 text-right">Peak Elo</th>
              <th className="p-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {filteredPlayers.slice(0, 50).map((p) => (
              <tr key={p.name} className="hover:bg-[#F8F9FA]">
                <td className="p-2.5 font-bold text-slate-400">#{p.eloRank}</td>
                <td className="p-2.5 font-bold text-[#0F172A]">{p.name}</td>
                <td className="p-2.5 text-slate-500">{p.tour}</td>
                <td className="p-2.5 text-right tabular-nums">{p.officialRank ? `#${p.officialRank}` : '—'}</td>
                <td className="p-2.5 text-right font-bold text-[#0A5C36] tabular-nums">{p.elo.toFixed(1)}</td>
                <td className="p-2.5 text-right tabular-nums">{p.hElo.toFixed(1)}</td>
                <td className="p-2.5 text-right tabular-nums">{p.cElo.toFixed(1)}</td>
                <td className="p-2.5 text-right tabular-nums">{p.gElo.toFixed(1)}</td>
                <td className="p-2.5 text-right text-slate-400 tabular-nums">{p.peakElo.toFixed(1)}</td>
                <td className="p-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setPlayerA(p.name);
                      runH2hCalculation(p.name, playerB, surface);
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                    className="px-2 py-0.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-slate-700 text-[10px] cursor-pointer"
                  >
                    Simulate H2H
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
