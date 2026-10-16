import type { BetSlipLeg, CandidatePick, CombineLeg, CombineTicket } from '../types';

export interface Bet365MappedLeg {
  index: number;
  match: string;
  playerA: string;
  playerB: string;
  tournament: string;
  surface: string;
  matchStatus: string;
  liveScore?: string;
  originalSelection: string;
  originalMarket: string;
  bet365Tab: 'Main' | 'Set' | 'Games' | 'Player';
  bet365MarketTitle: string;
  bet365SelectionText: string;
  bet365SearchQuery: string;
  bet365EventSearchUrl: string;
  bet365TennisSectionUrl: string;
  decimalOdds: number;
  estimatedProbability: number;
}

export interface Bet365SlipPayload {
  title: string;
  subtitle: string;
  totalDecimalOdds: number;
  combinedWinProb: number;
  recommendedStake: number;
  currencySymbol: string;
  potentialProfit: number;
  totalReturn: number;
  legs: Bet365MappedLeg[];
  formattedTicketText: string;
  compactSearchListText: string;
}

/**
 * Translates any quantitative tennis market and selection into the exact
 * Bet365 Sportsbook market name, tab, and selection string so a user can
 * find and click it in seconds on Bet365.
 */
export function mapToBet365Market(
  match: string,
  selection: string,
  market: string,
  matchStatus: string = 'PRE_MATCH'
): {
  bet365Tab: 'Main' | 'Set' | 'Games' | 'Player';
  bet365MarketTitle: string;
  bet365SelectionText: string;
  bet365SearchQuery: string;
  playerA: string;
  playerB: string;
} {
  const parts = match.split(/\s+vs\.?\s+/i);
  const playerA = parts[0]?.trim() || match;
  const playerB = parts[1]?.trim() || 'Opponent';

  const selLower = selection.toLowerCase();
  const mktLower = market.toLowerCase();

  // Extract player name from selection
  let targetPlayer = playerA;
  if (
    selLower.includes(playerB.toLowerCase()) ||
    selLower.includes((playerB.split(' ').pop() || '').toLowerCase())
  ) {
    if (
      !selLower.includes(playerA.toLowerCase()) ||
      selLower.indexOf((playerB.split(' ').pop() || '').toLowerCase()) <
        selLower.indexOf((playerA.split(' ').pop() || '___').toLowerCase())
    ) {
      targetPlayer = playerB;
    }
  }

  let bet365Tab: 'Main' | 'Set' | 'Games' | 'Player' = 'Main';
  let bet365MarketTitle = 'To Win Match';
  let bet365SelectionText = `${targetPlayer} — To Win Match`;

  // 1. Set Handicap +1.5 Sets ("To Win a Set" or "Set Handicap +1.5")
  if (selLower.includes('+1.5 set') || mktLower.includes('+1.5 set')) {
    bet365Tab = 'Set';
    bet365MarketTitle = 'Set Handicap / Player To Win a Set';
    bet365SelectionText = `${targetPlayer} +1.5 Sets (or "${targetPlayer} To Win a Set - Yes")`;
  }
  // 2. Straight Sets 2-0 / -1.5 Sets
  else if (
    selLower.includes('2-0') ||
    selLower.includes('-1.5 set') ||
    mktLower.includes('2-0') ||
    mktLower.includes('-1.5 set')
  ) {
    bet365Tab = 'Main';
    bet365MarketTitle = 'Set Betting (Main or Set Tab)';
    bet365SelectionText = `${targetPlayer} to win 2-0`;
  }
  // 3. Set Betting 2-1
  else if (selLower.includes('2-1') || mktLower.includes('2-1')) {
    bet365Tab = 'Set';
    bet365MarketTitle = 'Set Betting';
    bet365SelectionText = `${targetPlayer} to win 2-1`;
  }
  // 4. Game Handicap (+3.5, +2.5, -2.5, -3.5, -4.5 Games)
  else if (
    selLower.includes('games') ||
    mktLower.includes('game handicap') ||
    mktLower.includes('game spread') ||
    /[+-]\d+\.5\s*games/i.test(selection)
  ) {
    bet365Tab = 'Main';
    bet365MarketTitle = 'Match Handicap (Games)';
    const spreadMatch = selection.match(/([+-]\d+\.5)/);
    const spreadVal = spreadMatch ? spreadMatch[1] : '+3.5';
    bet365SelectionText = `${targetPlayer} ${spreadVal} Games`;
  }
  // 5. Total Games Over / Under
  else if (
    selLower.includes('over ') ||
    selLower.includes('under ') ||
    mktLower.includes('total games')
  ) {
    bet365Tab = 'Main';
    bet365MarketTitle = 'Total Games 2-Way';
    bet365SelectionText = selection;
  }
  // 6. Standard Moneyline / Match Winner
  else {
    bet365Tab = 'Main';
    bet365MarketTitle =
      matchStatus === 'IN_PROGRESS' ? 'Match Winner (In-Play)' : 'To Win Match';
    bet365SelectionText = `${targetPlayer}`;
  }

  // Clean search query for Bet365 top search bar (e.g. "Sinner Alcaraz" or "Sinner")
  const lastA = playerA.split(' ').pop() || playerA;
  const lastB = playerB.split(' ').pop() || playerB;
  const bet365SearchQuery =
    playerB !== 'Opponent' && playerB !== 'Multiple Opponents'
      ? `${lastA} v ${lastB}`
      : playerA;

  return {
    bet365Tab,
    bet365MarketTitle,
    bet365SelectionText,
    bet365SearchQuery,
    playerA,
    playerB,
  };
}

export function buildBet365PayloadFromCombine(
  ticket: CombineTicket,
  recommendedStake: number,
  currencySymbol: string
): Bet365SlipPayload {
  const mappedLegs: Bet365MappedLeg[] = ticket.legs.map((leg, idx) => {
    const mapped = mapToBet365Market(
      leg.match,
      leg.selection,
      leg.market,
      leg.matchStatus
    );
    const isLive = leg.matchStatus === 'IN_PROGRESS';
    return {
      index: idx + 1,
      match: leg.match,
      playerA: mapped.playerA,
      playerB: mapped.playerB,
      tournament: leg.tournament,
      surface: leg.surface,
      matchStatus: leg.matchStatus,
      liveScore: leg.liveScore,
      originalSelection: leg.selection,
      originalMarket: leg.market,
      bet365Tab: mapped.bet365Tab,
      bet365MarketTitle: mapped.bet365MarketTitle,
      bet365SelectionText: mapped.bet365SelectionText,
      bet365SearchQuery: mapped.bet365SearchQuery,
      bet365EventSearchUrl: `https://www.bet365.com/#/AX/K%5E${encodeURIComponent(
        mapped.bet365SearchQuery
      )}/`,
      bet365TennisSectionUrl: isLive
        ? 'https://www.bet365.com/#/IP/B13'
        : 'https://www.bet365.com/#/AC/B13/C1/D50/E2/F163/',
      decimalOdds: leg.decimalOdds,
      estimatedProbability: leg.estimatedProbability,
    };
  });

  const potentialProfit = Number(
    (recommendedStake * Math.max(0, ticket.totalDecimalOdds - 1)).toFixed(2)
  );
  const totalReturn = Number((recommendedStake + potentialProfit).toFixed(2));

  const formattedTicketText = [
    `🟩🟨 BET365 DIRECT PLAY SLIP — ${ticket.title.toUpperCase()}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `• Bet Type: ${mappedLegs.length > 1 ? `${mappedLegs.length}-Fold Accumulator (Parlay)` : 'Single'}`,
    `• Combined Odds: @${ticket.totalDecimalOdds.toFixed(2)} (${ticket.americanOdds})`,
    `• Model Win Probability: ${ticket.combinedEstimatedProbability.toFixed(1)}%`,
    `• Recommended Stake: ${recommendedStake.toFixed(2)}${currencySymbol} → Return: ${totalReturn.toFixed(2)}${currencySymbol} (+${potentialProfit.toFixed(2)}${currencySymbol} Profit)`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ...mappedLegs.map(
      (l) =>
        `LEG ${l.index}: ${l.match} [${l.tournament} · ${l.matchStatus === 'IN_PROGRESS' ? `LIVE ${l.liveScore || ''}` : 'Pre-Match'}]\n` +
        `   🔎 Bet365 Search: "${l.bet365SearchQuery}"\n` +
        `   📂 Bet365 Tab/Market: [${l.bet365Tab}] → ${l.bet365MarketTitle}\n` +
        `   ✅ Bet365 Selection: ${l.bet365SelectionText} (@${l.decimalOdds.toFixed(2)})`
    ),
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `⚡ Quick Play: Open https://www.bet365.com/#/AC/B13/C1/D50/E2/F163/ → Search each match above & tap the selection to build your ${mappedLegs.length}-Fold slip.`,
  ].join('\n');

  const compactSearchListText = mappedLegs
    .map(
      (l) =>
        `${l.index}) Search "${l.bet365SearchQuery}" → [${l.bet365MarketTitle}] → ${l.bet365SelectionText} (@${l.decimalOdds.toFixed(2)})`
    )
    .join('\n');

  return {
    title: ticket.title,
    subtitle: `${ticket.targetOddsLabel} · ${mappedLegs.length}-Fold Bet365 Accumulator`,
    totalDecimalOdds: ticket.totalDecimalOdds,
    combinedWinProb: ticket.combinedEstimatedProbability,
    recommendedStake,
    currencySymbol,
    potentialProfit,
    totalReturn,
    legs: mappedLegs,
    formattedTicketText,
    compactSearchListText,
  };
}

export function buildBet365PayloadFromCandidatePick(
  pick: CandidatePick,
  recommendedStake: number,
  currencySymbol: string
): Bet365SlipPayload {
  const mapped = mapToBet365Market(
    pick.match,
    pick.selection,
    pick.market,
    pick.matchStatus
  );
  const odds = pick.decimalOdds || 1.85;
  const prob = pick.estimatedProbability || 91.5;
  const isLive = pick.matchStatus === 'IN_PROGRESS';

  const leg: Bet365MappedLeg = {
    index: 1,
    match: pick.match,
    playerA: mapped.playerA,
    playerB: mapped.playerB,
    tournament: pick.tournament,
    surface: pick.surface,
    matchStatus: pick.matchStatus,
    liveScore: pick.liveScore,
    originalSelection: pick.selection,
    originalMarket: pick.market,
    bet365Tab: mapped.bet365Tab,
    bet365MarketTitle: mapped.bet365MarketTitle,
    bet365SelectionText: mapped.bet365SelectionText,
    bet365SearchQuery: mapped.bet365SearchQuery,
    bet365EventSearchUrl: `https://www.bet365.com/#/AX/K%5E${encodeURIComponent(
      mapped.bet365SearchQuery
    )}/`,
    bet365TennisSectionUrl: isLive
      ? 'https://www.bet365.com/#/IP/B13'
      : 'https://www.bet365.com/#/AC/B13/C1/D50/E2/F163/',
    decimalOdds: odds,
    estimatedProbability: prob,
  };

  const potentialProfit = Number(
    (recommendedStake * Math.max(0, odds - 1)).toFixed(2)
  );
  const totalReturn = Number((recommendedStake + potentialProfit).toFixed(2));

  const formattedTicketText = [
    `🟩🟨 BET365 DIRECT PLAY SLIP — SINGLE VALUE PICK`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `• Match: ${pick.match} (${pick.tournament} · ${pick.surface})`,
    `• Bet365 Search: "${leg.bet365SearchQuery}"`,
    `• Bet365 Market: [${leg.bet365Tab}] → ${leg.bet365MarketTitle}`,
    `• Bet365 Selection: ${leg.bet365SelectionText}`,
    `• Odds: @${odds.toFixed(2)} | Win Confidence: ${prob.toFixed(1)}%`,
    `• Recommended Stake: ${recommendedStake.toFixed(2)}${currencySymbol} → Return: ${totalReturn.toFixed(2)}${currencySymbol} (+${potentialProfit.toFixed(2)}${currencySymbol})`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  ].join('\n');

  return {
    title: `${pick.selection}`,
    subtitle: `${pick.match} · ${pick.tournament}`,
    totalDecimalOdds: odds,
    combinedWinProb: prob,
    recommendedStake,
    currencySymbol,
    potentialProfit,
    totalReturn,
    legs: [leg],
    formattedTicketText,
    compactSearchListText: `Search "${leg.bet365SearchQuery}" → [${leg.bet365MarketTitle}] → ${leg.bet365SelectionText} (@${odds.toFixed(2)})`,
  };
}

export function buildBet365PayloadFromSlipLegs(
  legs: Array<BetSlipLeg | CombineLeg>,
  recommendedStake: number,
  currencySymbol: string,
  title: string = 'Custom Bet365 Accumulator'
): Bet365SlipPayload {
  const totalDecimalOdds = Number(
    legs.reduce((acc, l) => acc * l.decimalOdds, 1).toFixed(2)
  );
  const combinedWinProb = Number(
    (
      legs.reduce((acc, l) => acc * (l.estimatedProbability / 100), 1) * 100
    ).toFixed(1)
  );

  const mappedLegs: Bet365MappedLeg[] = legs.map((leg, idx) => {
    const mapped = mapToBet365Market(
      leg.match,
      leg.selection,
      leg.market,
      leg.matchStatus || 'PRE_MATCH'
    );
    const isLive = leg.matchStatus === 'IN_PROGRESS';
    return {
      index: idx + 1,
      match: leg.match,
      playerA: mapped.playerA,
      playerB: mapped.playerB,
      tournament: leg.tournament || 'ATP/WTA Tour',
      surface: leg.surface || 'Hard',
      matchStatus: leg.matchStatus || 'PRE_MATCH',
      liveScore: 'liveScore' in leg ? leg.liveScore : undefined,
      originalSelection: leg.selection,
      originalMarket: leg.market,
      bet365Tab: mapped.bet365Tab,
      bet365MarketTitle: mapped.bet365MarketTitle,
      bet365SelectionText: mapped.bet365SelectionText,
      bet365SearchQuery: mapped.bet365SearchQuery,
      bet365EventSearchUrl: `https://www.bet365.com/#/AX/K%5E${encodeURIComponent(
        mapped.bet365SearchQuery
      )}/`,
      bet365TennisSectionUrl: isLive
        ? 'https://www.bet365.com/#/IP/B13'
        : 'https://www.bet365.com/#/AC/B13/C1/D50/E2/F163/',
      decimalOdds: leg.decimalOdds,
      estimatedProbability: leg.estimatedProbability,
    };
  });

  const potentialProfit = Number(
    (recommendedStake * Math.max(0, totalDecimalOdds - 1)).toFixed(2)
  );
  const totalReturn = Number((recommendedStake + potentialProfit).toFixed(2));

  const formattedTicketText = [
    `🟩🟨 BET365 DIRECT PLAY SLIP — ${title.toUpperCase()}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `• Bet Type: ${mappedLegs.length > 1 ? `${mappedLegs.length}-Fold Accumulator` : 'Single'}`,
    `• Combined Odds: @${totalDecimalOdds.toFixed(2)} | Win Prob: ${combinedWinProb}%`,
    `• Recommended Stake: ${recommendedStake.toFixed(2)}${currencySymbol} → Return: ${totalReturn.toFixed(2)}${currencySymbol} (+${potentialProfit.toFixed(2)}${currencySymbol})`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ...mappedLegs.map(
      (l) =>
        `LEG ${l.index}: ${l.match} [${l.tournament}]\n` +
        `   🔎 Bet365 Search: "${l.bet365SearchQuery}"\n` +
        `   📂 Bet365 Market: [${l.bet365Tab}] → ${l.bet365MarketTitle}\n` +
        `   ✅ Bet365 Selection: ${l.bet365SelectionText} (@${l.decimalOdds.toFixed(2)})`
    ),
  ].join('\n');

  const compactSearchListText = mappedLegs
    .map(
      (l) =>
        `${l.index}) Search "${l.bet365SearchQuery}" → [${l.bet365MarketTitle}] → ${l.bet365SelectionText} (@${l.decimalOdds.toFixed(2)})`
    )
    .join('\n');

  return {
    title,
    subtitle: `${mappedLegs.length}-Leg Bet365 Slip (@${totalDecimalOdds.toFixed(2)}x)`,
    totalDecimalOdds,
    combinedWinProb,
    recommendedStake,
    currencySymbol,
    potentialProfit,
    totalReturn,
    legs: mappedLegs,
    formattedTicketText,
    compactSearchListText,
  };
}
