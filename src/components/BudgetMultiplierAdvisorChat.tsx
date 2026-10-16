import React, { useState, useRef, useEffect } from 'react';
import type {
  BankrollSimulatorConfig,
  BetSlipLeg,
  CandidatePick,
  DailyResearchReport,
} from '../types';

interface Message {
  id: string;
  sender: 'user' | 'advisor';
  text: string;
  timestamp: string;
  plan?: {
    startingAmount: number;
    targetAmount: number;
    targetMultiplier: number;
    currencySymbol: string;
    directCombine?: {
      title: string;
      totalOdds: number;
      potentialPayout: number;
      potentialProfit: number;
      legs: Array<{
        id: string;
        match: string;
        tournament: string;
        surface: string;
        selection: string;
        market: string;
        decimalOdds: number;
        estimatedProbability: number;
        reasoning: string;
        sourceUrl?: string;
      }>;
    };
    ladderSteps?: Array<{
      stepNumber: number;
      stake: number;
      targetOdds: number;
      targetReturn: number;
      match: string;
      tournament: string;
      selection: string;
    }>;
  };
}

interface BudgetMultiplierAdvisorChatProps {
  report: DailyResearchReport | null;
  bankrollConfig: BankrollSimulatorConfig;
  currentSimulatedBankroll: number;
  onAddLegToSlip: (leg: BetSlipLeg) => void;
  onRecordPick?: (pick: CandidatePick, unitMultiplier?: number) => Promise<void>;
  onClose?: () => void;
  isOpenAsDrawer?: boolean;
}

const PRESET_GOALS = [
  { start: 5, target: 50, label: '5€ → 50€ (10x Goal)' },
  { start: 10, target: 20, label: '10€ → 20€ (Double-Up 2x)' },
  { start: 5, target: 25, label: '5€ → 25€ (5x Challenge)' },
  { start: 2, target: 100, label: '2€ → 100€ (50x Century Flyer)' },
  { start: 20, target: 60, label: '20€ → 60€ (3x Value Triple)' },
  { start: 10, target: 50, label: '10€ → 50€ (3-Step Ladder)' },
];

export const BudgetMultiplierAdvisorChat: React.FC<BudgetMultiplierAdvisorChatProps> = ({
  report,
  bankrollConfig,
  currentSimulatedBankroll,
  onAddLegToSlip,
  onRecordPick,
  onClose,
  isOpenAsDrawer = false,
}) => {
  const sym = bankrollConfig.currency || '€';
  const [startInput, setStartInput] = useState<string>('5');
  const [targetInput, setTargetInput] = useState<string>('50');
  const [userInput, setUserInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [addedCombineId, setAddedCombineId] = useState<string | null>(null);

  const initialAdvisorMsg: Message = {
    id: 'welcome-msg',
    sender: 'advisor',
    text: `### Welcome to the CourtEdge Quant Pick Advisor\n\nEnter your starting stake and financial goal (for example: **"I have 5€ and want to make 50€"**), or select a preset challenge above.\n\nThe algorithm cross-references today's verified ATP/WTA draw, de-vigged market consensus, and surface-blended Elo ratings to construct the highest-probability picks and rolling ladder challenges for your budget!`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<Message[]>([initialAdvisorMsg]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const startVal = parseFloat(startInput) || 0;
  const targetVal = parseFloat(targetInput) || 0;
  const currentMultiplier =
    startVal > 0 && targetVal > 0 ? (targetVal / startVal).toFixed(2) : '10.00';

  const sendQuery = async (customMessage?: string, forceStart?: number, forceTarget?: number) => {
    const s = forceStart ?? parseFloat(startInput) ?? 5;
    const t = forceTarget ?? parseFloat(targetInput) ?? 50;
    const query =
      customMessage ||
      userInput.trim() ||
      `I have ${s}${sym} and want to make ${t}${sym}. What picks should I play?`;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setUserInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          startingAmount: s,
          targetAmount: t,
          currencySymbol: sym,
          history: messages.slice(-6).map((m) => ({
            role: m.sender === 'user' ? 'user' : 'model',
            content: m.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const advisorMsg: Message = {
        id: `adv-${Date.now()}`,
        sender: 'advisor',
        text: data.reply || 'Here is your quantitative betting plan.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        plan: data.plan,
      };

      setMessages((prev) => [...prev, advisorMsg]);
    } catch {
      // Offline fallback
      const mult = (t / s).toFixed(2);
      const fallbackMsg: Message = {
        id: `adv-${Date.now()}`,
        sender: 'advisor',
        text: `### Strategy Plan for ${s.toFixed(2)}${sym} → ${t.toFixed(2)}${sym} (@${mult}x Multiplier)\n\nTo hit ${t.toFixed(2)}${sym} from ${s.toFixed(2)}${sym}, you need a **${mult}x payout**.\n\n* **Option 1**: Play a 3-leg parlay combining today's highest Elo value anchors (e.g. Sinner Moneyline + Hurkacz 2-1 + Rybakina -1.5 Sets).\n* **Option 2**: Try a 3-step ladder challenge (${s.toFixed(2)}${sym} → ${(s * 2.15).toFixed(2)}${sym} → ${(s * 4.6).toFixed(2)}${sym} → ${t.toFixed(2)}${sym}) which gives you cashout control after each win!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (start: number, target: number) => {
    setStartInput(String(start));
    setTargetInput(String(target));
    sendQuery(`I have ${start}${sym} and want to make ${target}${sym}. What picks should I play?`, start, target);
  };

  const handleLoadCombineIntoSlip = (planCombine: NonNullable<Message['plan']>['directCombine']) => {
    if (!planCombine || !planCombine.legs) return;
    planCombine.legs.forEach((leg) => {
      onAddLegToSlip({
        id: leg.id || `adv-leg-${Date.now()}-${Math.random()}`,
        match: leg.match,
        tournament: leg.tournament,
        surface: leg.surface,
        selection: leg.selection,
        market: leg.market,
        decimalOdds: leg.decimalOdds,
        estimatedProbability: leg.estimatedProbability,
        edgePercent: Number((leg.estimatedProbability - (100 / leg.decimalOdds)).toFixed(1)),
        sourceUrl: leg.sourceUrl || 'https://www.espn.com/tennis/scoreboard',
      });
    });
    setAddedCombineId(planCombine.title);
    setTimeout(() => setAddedCombineId(null), 3000);
  };

  return (
    <div
      className={`bg-white border border-[#DCD8CE] flex flex-col ${
        isOpenAsDrawer
          ? 'h-full max-h-[90vh] shadow-2xl'
          : 'dossier-card my-6'
      }`}
    >
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[#DCD8CE] bg-[#FAF9F5] flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase tracking-wider text-[#0D5C3A] font-bold">
            <svg
              className="w-3.5 h-3.5 text-[#0D5C3A]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span>Quant Pick Advisor</span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span className="text-[#11161D]">Budget-to-Goal Engine</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-display text-[#11161D] mt-0.5">
            Turn Any Stake into Your Target Financial Goal
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Example: Enter 5{sym} to make 50{sym}, and the advisor formulates exact positive-EV picks and rolling ladder challenges.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-[#11161D] text-lg font-bold px-2 py-1 cursor-pointer"
              title="Close Advisor"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Goal Multiplier Calculator Toolbar */}
      <div className="p-3 sm:p-4 bg-[#F3F1EA] border-b border-[#DCD8CE] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 font-mono-tabular text-xs">
          <div className="flex items-center gap-1 bg-white px-2.5 py-1.5 border border-[#DCD8CE]">
            <span className="text-slate-500">I Have:</span>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              className="w-14 font-bold text-[#11161D] focus:outline-hidden text-right"
            />
            <span className="font-bold text-[#11161D]">{sym}</span>
          </div>

          <span className="text-slate-400 font-bold">→</span>

          <div className="flex items-center gap-1 bg-white px-2.5 py-1.5 border border-[#DCD8CE]">
            <span className="text-slate-500">Goal:</span>
            <input
              type="number"
              min="1"
              step="1"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              className="w-16 font-bold text-[#11161D] focus:outline-hidden text-right"
            />
            <span className="font-bold text-[#11161D]">{sym}</span>
          </div>

          <div className="px-2.5 py-1.5 bg-[#0B1118] text-[#D4A853] font-bold">
            Target: @{currentMultiplier}x
          </div>

          <button
            type="button"
            onClick={() => sendQuery()}
            disabled={loading}
            className="px-3 py-1.5 bg-[#0D5C3A] hover:bg-[#0A472D] text-white font-semibold transition-colors cursor-pointer"
          >
            {loading ? 'Analyzing...' : 'Get Picks Plan →'}
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1">
          {PRESET_GOALS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => handleApplyPreset(p.start, p.target)}
              className="px-2 py-1 text-[11px] font-mono-tabular bg-white hover:bg-[#FAF9F5] border border-[#DCD8CE] text-slate-700 hover:text-[#11161D] transition-colors cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[500px] min-h-[300px] bg-[#FAF9F5]/40">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              <div className="flex items-center gap-2 text-[10px] font-mono-tabular text-slate-400">
                <span>{isUser ? 'You' : 'CourtEdge Quant Advisor'}</span>
                <span>·</span>
                <span>{m.timestamp}</span>
              </div>

              <div
                className={`max-w-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[#0B1118] text-white border border-[#0B1118]'
                    : 'bg-white text-slate-800 border border-[#DCD8CE] shadow-xs'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans space-y-2">
                  {m.text.split('\n\n').map((para, pIdx) => {
                    if (para.startsWith('### ')) {
                      return (
                        <h4
                          key={pIdx}
                          className="text-base font-display font-bold text-[#11161D] mt-2 mb-1"
                        >
                          {para.replace('### ', '')}
                        </h4>
                      );
                    }
                    if (para.startsWith('#### ')) {
                      return (
                        <h5
                          key={pIdx}
                          className="text-sm font-display font-bold text-[#0D5C3A] mt-2 mb-1"
                        >
                          {para.replace('#### ', '')}
                        </h5>
                      );
                    }
                    return (
                      <p key={pIdx} className="leading-relaxed">
                        {para}
                      </p>
                    );
                  })}
                </div>

                {/* Structured Plan Visual Cards */}
                {m.plan && m.plan.directCombine && m.plan.directCombine.legs.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#EAE7DF] space-y-3 font-sans">
                    {/* Strategy 1: Direct Combine Card */}
                    <div className="p-3.5 bg-[#FAF9F5] border border-[#DCD8CE] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 font-mono-tabular">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-[#0D5C3A]">
                            Strategy 1 · Direct Multiplier Ticket
                          </div>
                          <div className="text-sm font-bold text-[#11161D]">
                            {m.plan.directCombine.title}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-[#0D5C3A]">
                            @{m.plan.directCombine.totalOdds.toFixed(2)}x
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            Stake {m.plan.startingAmount.toFixed(2)}
                            {sym} → Return{' '}
                            <strong>
                              {m.plan.directCombine.potentialPayout.toFixed(2)}
                              {sym}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* Legs List */}
                      <div className="space-y-1.5 divide-y divide-[#EAE7DF] text-xs">
                        {m.plan.directCombine.legs.map((leg, lIdx) => (
                          <div key={lIdx} className="pt-1.5 flex items-baseline justify-between gap-2">
                            <div>
                              <span className="font-bold text-[#11161D]">
                                Leg {lIdx + 1}: {leg.selection}
                              </span>
                              <span className="text-slate-500 ml-1">
                                ({leg.match} · {leg.tournament})
                              </span>
                            </div>
                            <div className="font-mono-tabular shrink-0">
                              <span className="font-bold text-[#0D5C3A]">
                                @{leg.decimalOdds.toFixed(2)}
                              </span>
                              <span className="text-slate-500 ml-1">
                                ({leg.estimatedProbability}% Win)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#DCD8CE]">
                        <span className="text-[11px] font-mono-tabular text-slate-600">
                          Net Profit:{' '}
                          <strong className="text-[#0D5C3A]">
                            +{m.plan.directCombine.potentialProfit.toFixed(2)}
                            {sym}
                          </strong>
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleLoadCombineIntoSlip(m.plan!.directCombine!)
                            }
                            className="px-3 py-1.5 text-xs font-mono-tabular font-semibold bg-[#0B1118] text-[#D4A853] hover:bg-[#18222F] transition-colors cursor-pointer"
                          >
                            {addedCombineId === m.plan.directCombine.title
                              ? '✓ Loaded into Bet Slip'
                              : '📥 Load into Bet Slip'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Strategy 2: Ladder Steps Preview */}
                    {m.plan.ladderSteps && m.plan.ladderSteps.length > 0 && (
                      <div className="p-3 bg-white border border-[#DCD8CE] space-y-2">
                        <div className="text-[10px] uppercase font-bold text-[#1A4D7C] font-mono-tabular">
                          Strategy 2 · {m.plan.ladderSteps.length}-Step Rolling Ladder Challenge
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono-tabular">
                          {m.plan.ladderSteps.map((step) => (
                            <div
                              key={step.stepNumber}
                              className="p-2 bg-[#FAF9F5] border border-[#EAE7DF]"
                            >
                              <div className="font-bold text-[#11161D]">
                                Step {step.stepNumber}: @{step.targetOdds.toFixed(2)}
                              </div>
                              <div className="text-slate-600 text-[11px] truncate">
                                {step.selection}
                              </div>
                              <div className="text-[#0D5C3A] font-semibold mt-1">
                                {step.stake.toFixed(2)}
                                {sym} → {step.targetReturn.toFixed(2)}
                                {sym}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono-tabular">
                          💡 Compound each win into the next match. You can cash out anytime along the ladder.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs font-mono-tabular text-slate-500 p-2">
            <span className="w-2 h-2 rounded-full bg-[#0D5C3A] animate-ping" />
            <span>Consulting Tennis Abstract Elo ratings and structuring optimal picks...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading && userInput.trim()) sendQuery();
        }}
        className="p-3 sm:p-4 bg-white border-t border-[#DCD8CE] flex items-center gap-2"
      >
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={`e.g. "I have ${startInput}${sym} and want to make ${targetInput}${sym}, what should I play?"`}
          className="flex-1 px-3 py-2 text-xs sm:text-sm border border-[#DCD8CE] focus:border-[#0B1118] focus:outline-hidden font-sans"
        />

        <button
          type="submit"
          disabled={loading || !userInput.trim()}
          className={`px-4 py-2 text-xs font-mono-tabular font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            loading || !userInput.trim()
              ? 'bg-[#EAE7DF] text-slate-400 cursor-not-allowed'
              : 'bg-[#0B1118] text-[#D4A853] hover:bg-[#18222F]'
          }`}
        >
          Send
        </button>

        <button
          type="button"
          onClick={() => setMessages([initialAdvisorMsg])}
          className="px-2.5 py-2 text-xs font-mono-tabular text-slate-500 hover:text-slate-800 border border-[#DCD8CE] cursor-pointer"
          title="Reset conversation"
        >
          Clear
        </button>
      </form>
    </div>
  );
};
