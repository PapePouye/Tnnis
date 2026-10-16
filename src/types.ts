export type MatchStatus = 'PRE_MATCH' | 'IN_PROGRESS' | 'COMPLETED';

export interface SourceCitation {
  id: string;
  title: string;
  publisher: string;
  url: string;
  checkedAt: string;
  type: 'PREDICTION_SITE' | 'OFFICIAL_TOUR' | 'ODDS_FEED' | 'STATS_DATABASE';
  summary?: string;
}

export interface MatchFactors {
  recentForm: string;
  surfaceAnalysis: string;
  headToHead: string;
  injuriesAndFitness: string;
  matchConditions: string;
}

export interface CandidatePick {
  id: string;
  match: string;
  playerA: string;
  playerB: string;
  tournament: string;
  round: string;
  surface: string;
  matchStatus: MatchStatus;
  liveScore?: string;
  scheduledTime?: string;
  selection: string;
  market: string;
  decimalOdds: number | null;
  americanOdds: string | null;
  bookmaker: string;
  oddsCheckedAt: string;
  impliedProbability: number | null;
  estimatedProbability: number | null;
  edgePercent: number | null;
  expectedValuePercent: number | null;
  reasoning: string;
  selectionMethodology: string;
  sourceConsensus: string;
  sourceDisagreement: string;
  mainRisks: string[];
  factors: MatchFactors;
  sourceUrls: string[];
  rejectionReason?: string;
  isSettled?: boolean;
  settledOutcome?: 'WON' | 'LOST' | 'PUSH';
  finalScore?: string;
  settledAt?: string;
}

export interface SettledPickRecord {
  id: string;
  match: string;
  selection: string;
  decimalOdds: number;
  outcome: 'WON' | 'LOST' | 'PUSH';
  finalScore: string;
  settledAt: string;
  reasoning?: string;
  profitUnits?: number;
}

export interface LiveMatchPronostic {
  projectedWinner: string;
  projectedWinnerProb: number;
  winProbPlayerA: number;
  winProbPlayerB: number;
  oddsPlayerA: number | null;
  oddsPlayerB: number | null;
  recommendedPick: string;
  market: string;
  decimalOdds: number | null;
  americanOdds: string | null;
  impliedProbability: number | null;
  estimatedProbability: number;
  edgePercent: number | null;
  expectedValuePercent: number | null;
  confidenceLabel: string;
  liveMomentumNote: string;
  eloSummary: string;
  servingPlayer?: 'A' | 'B' | null;
}

export interface LiveScoreboardMatch {
  id: string;
  tour: 'ATP' | 'WTA';
  tournament: string;
  round: string;
  surface: string;
  playerA: string;
  playerB: string;
  status: MatchStatus;
  statusDetail: string;
  scoreSummary: string;
  startTime: string;
  sourceUrl: string;
  checkedAt: string;
  pronostic?: LiveMatchPronostic;
}

export interface DataFeedStatus {
  geminiSearchGrounding: {
    active: boolean;
    statusText: string;
    checkedAt: string;
  };
  publicTourScoreboard: {
    active: boolean;
    matchesFound: number;
    statusText: string;
    checkedAt: string;
  };
  liveBookmakerFeed: {
    active: boolean;
    configured: boolean;
    statusText: string;
    checkedAt: string;
  };
}

export interface DailyResearchReport {
  date: string;
  researchedAt: string;
  decision: 'RECOMMENDED_PICK' | 'NO_PICK_TODAY';
  noPickReason: string | null;
  finalPick: CandidatePick | null;
  bestLivePick: CandidatePick | null;
  recentlySettledPicks?: SettledPickRecord[];
  combines?: CombineTicket[];
  otherPicksConsidered: CandidatePick[];
  sources: SourceCitation[];
  liveAndUpcomingMatches: LiveScoreboardMatch[];
  dataFeedStatus: DataFeedStatus;
  methodologySummary: string;
}

export type CombineCategory =
  | 'TODAY_SURE'
  | 'ODDS_2'
  | 'ODDS_5'
  | 'ODDS_10'
  | 'ODDS_100'
  | 'LIVE_SURE';

export interface CombineLeg {
  id: string;
  match: string;
  tournament: string;
  surface: string;
  matchStatus: MatchStatus;
  liveScore?: string;
  selection: string;
  market: string;
  decimalOdds: number;
  estimatedProbability: number;
  edgePercent: number;
  reasoningShort: string;
  sourceUrl: string;
}

export interface CombineTicket {
  id: string;
  category: CombineCategory;
  title: string;
  subtitle: string;
  targetOddsLabel: string;
  legs: CombineLeg[];
  totalDecimalOdds: number;
  americanOdds: string;
  combinedEstimatedProbability: number;
  combinedImpliedProbability: number;
  combinedExpectedValuePercent: number;
  confidenceNote: string;
  riskNote: string;
  checkedAt: string;
}

export interface CombineSettledLeg {
  id?: string;
  match: string;
  selection: string;
  odds: number;
  outcome: 'WON' | 'LOST' | 'VOID' | 'PENDING';
  score?: string;
}

export interface CombineHistoryRecord {
  id: string;
  date: string;
  category: CombineCategory | 'CUSTOM';
  categoryTitle: string;
  targetOddsLabel: string;
  totalDecimalOdds: number;
  stakeUnits: number;
  outcome: 'WON' | 'LOST' | 'PUSH' | 'PENDING';
  profitUnits: number;
  legs: CombineSettledLeg[];
  missedByLegs: number; // 0 if won, 1 if missed by 1 leg, etc.
  tournamentSummary?: string;
  recordedAt: string;
  settledAt?: string;
}

export interface CombineCategoryStats {
  category: CombineCategory | 'CUSTOM' | 'ALL';
  label: string;
  targetOdds: string;
  totalTickets: number;
  wonCount: number;
  lostCount: number;
  pendingCount: number;
  winRatePercent: number;
  lossRatePercent: number;
  totalStakedUnits: number;
  totalProfitUnits: number;
  roiYieldPercent: number;
  avgOdds: number;
  missedByOneCount: number;
  missedByOneRatePercent: number;
  totalLegs: number;
  wonLegs: number;
  legWinRatePercent: number;
}


export interface TrackedResult {
  id: string;
  date: string;
  match: string;
  tournament: string;
  surface: string;
  matchStatusAtPick: 'PRE_MATCH' | 'IN_PROGRESS';
  market: string;
  selection: string;
  decimalOdds: number;
  estimatedProbability: number;
  expectedValuePercent: number;
  stakeUnits: number;
  outcome: 'WON' | 'LOST' | 'PUSH' | 'PENDING';
  finalScore?: string;
  profitUnits: number;
  sourceUrls: string[];
  recordedAt: string;
  settledAt?: string;
}

export type StakingStrategy = 'FLAT_PERCENT' | 'COMPOUND_PERCENT' | 'QUARTER_KELLY';

export interface BetSlipLeg {
  id: string;
  match: string;
  selection: string;
  market: string;
  decimalOdds: number;
  estimatedProbability: number;
  edgePercent?: number;
  tournament?: string;
  surface?: string;
  matchStatus?: MatchStatus;
  sourceUrl?: string;
}

export interface MonteCarloSimulationResult {
  iterations: number;
  playerAName: string;
  playerBName: string;
  winProbA: number;
  winProbB: number;
  setsDistribution: {
    twoZeroA: number;
    twoOneA: number;
    twoZeroB: number;
    twoOneB: number;
  };
  totalGamesDistribution: {
    under19_5: number;
    range20_22: number;
    range23_25: number;
    over25_5: number;
    meanGames: number;
  };
  tiebreakProbability: number;
  firstSetWinnerProbA: number;
  courtPaceIndex: {
    cpi: number;
    speedLabel: 'FAST' | 'MEDIUM_FAST' | 'MEDIUM' | 'MEDIUM_SLOW' | 'SLOW';
    serveDominanceFactor: number;
  };
}

export interface BankrollSimulatorConfig {
  startingBankroll: number;
  currency: '€' | '$' | '£';
  unitPercent: number;
  strategy: StakingStrategy;
}


