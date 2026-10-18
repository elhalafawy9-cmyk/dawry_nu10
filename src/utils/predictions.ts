import { Match } from '../App';

export type MatchVoteOption = 'teamA' | 'draw' | 'teamB';

export interface MatchVoteSummary {
  matchId: string;
  teamAVotes: number;
  drawVotes: number;
  teamBVotes: number;
  totalVotes: number;
  pctA: number;
  pctDraw: number;
  pctB: number;
}

export interface PredictorLeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  email: string;
  faculty: string;
  totalVotes: number;
  correctVotes: number;
  accuracyPct: number;
  points: number;
}

const VOTES_LOCAL_KEY = 'nu_tournament_match_votes_v2';
const COMMUNITY_VOTES_SEED_KEY = 'nu_tournament_community_votes_v1';

/**
 * Generate reproducible seed votes based on match id and team names
 * so every match has a lively initial voting poll count
 */
export function getInitialCommunityVotes(_matches: Match[]): Record<string, { teamA: number; draw: number; teamB: number }> {
  try {
    const raw = localStorage.getItem(COMMUNITY_VOTES_SEED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignore
  }

  // Start with clean 0 votes for all matches
  return {};
}

/**
 * Load user's personal votes from storage
 */
export function loadUserVotes(userId: string): Record<string, MatchVoteOption> {
  try {
    const raw = localStorage.getItem(`${VOTES_LOCAL_KEY}_${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading user votes', e);
  }
  return {};
}

/**
 * Save a single vote by user
 */
export function recordUserVote(
  userId: string,
  matchId: string,
  vote: MatchVoteOption,
  currentCommunityVotes: Record<string, { teamA: number; draw: number; teamB: number }>
): {
  userVotes: Record<string, MatchVoteOption>;
  communityVotes: Record<string, { teamA: number; draw: number; teamB: number }>;
} {
  const currentVotes = loadUserVotes(userId);
  const previousVote = currentVotes[matchId];
  currentVotes[matchId] = vote;

  try {
    localStorage.setItem(`${VOTES_LOCAL_KEY}_${userId}`, JSON.stringify(currentVotes));
  } catch (e) {
    console.error('Error saving user vote', e);
  }

  // Update community counts
  const updatedCommunity = { ...currentCommunityVotes };
  const currentCounts = updatedCommunity[matchId] || { teamA: 10, draw: 5, teamB: 10 };

  // Adjust if user previously voted
  if (previousVote && previousVote !== vote) {
    if (previousVote === 'teamA') currentCounts.teamA = Math.max(0, currentCounts.teamA - 1);
    else if (previousVote === 'draw') currentCounts.draw = Math.max(0, currentCounts.draw - 1);
    else if (previousVote === 'teamB') currentCounts.teamB = Math.max(0, currentCounts.teamB - 1);
  }

  if (previousVote !== vote) {
    if (vote === 'teamA') currentCounts.teamA += 1;
    else if (vote === 'draw') currentCounts.draw += 1;
    else if (vote === 'teamB') currentCounts.teamB += 1;
  }

  updatedCommunity[matchId] = currentCounts;

  try {
    localStorage.setItem(COMMUNITY_VOTES_SEED_KEY, JSON.stringify(updatedCommunity));
  } catch {
    // ignore
  }

  return { userVotes: currentVotes, communityVotes: updatedCommunity };
}

/**
 * Computes voting percentage for a match
 */
export function calculateMatchVoteSummary(
  matchId: string,
  communityVotes: Record<string, { teamA: number; draw: number; teamB: number }>
): MatchVoteSummary {
  const counts = communityVotes[matchId] || { teamA: 12, draw: 6, teamB: 10 };
  const totalVotes = (counts.teamA || 0) + (counts.draw || 0) + (counts.teamB || 0);

  if (totalVotes === 0) {
    return {
      matchId,
      teamAVotes: 0,
      drawVotes: 0,
      teamBVotes: 0,
      totalVotes: 0,
      pctA: 33,
      pctDraw: 34,
      pctB: 33,
    };
  }

  return {
    matchId,
    teamAVotes: counts.teamA,
    drawVotes: counts.draw,
    teamBVotes: counts.teamB,
    totalVotes,
    pctA: Math.round((counts.teamA / totalVotes) * 100),
    pctDraw: Math.round((counts.draw / totalVotes) * 100),
    pctB: Math.round((counts.teamB / totalVotes) * 100),
  };
}

/**
 * Calculates user's prediction score and accuracy based on finished matches
 */
export function calculateUserPredictionStats(
  matches: Match[],
  userVotes: Record<string, MatchVoteOption>
): {
  totalVotes: number;
  finishedEvaluated: number;
  correctVotes: number;
  accuracyPct: number;
  totalPoints: number;
} {
  const matchMap = new Map(matches.map((m) => [m.id, m]));
  let finishedCount = 0;
  let correctCount = 0;

  Object.entries(userVotes).forEach(([matchId, vote]) => {
    const match = matchMap.get(matchId);
    if (!match || match.status !== 'finished') return;

    finishedCount += 1;
    const scoreA = match.scoreA ?? 0;
    const scoreB = match.scoreB ?? 0;

    let actualOutcome: MatchVoteOption = 'draw';
    if (scoreA > scoreB) actualOutcome = 'teamA';
    else if (scoreB > scoreA) actualOutcome = 'teamB';

    if (vote === actualOutcome) {
      correctCount += 1;
    }
  });

  const totalVotes = Object.keys(userVotes).length;
  const accuracyPct = finishedCount > 0 ? Math.round((correctCount / finishedCount) * 100) : 0;
  const totalPoints = correctCount * 3; // 3 points per correct prediction

  return {
    totalVotes,
    finishedEvaluated: finishedCount,
    correctVotes: correctCount,
    accuracyPct,
    totalPoints,
  };
}

/**
 * Predictors leaderboard for Nile University (starts clean with no mock predictions)
 */
export const SAMPLE_PREDICTORS_LEADERBOARD: PredictorLeaderboardEntry[] = [];

/**
 * Determines whether voting is currently open for a match.
 * Voting remains open strictly until the kickoff date and time of the match,
 * or until the match becomes 'live' or 'finished'.
 */
export function getMatchVotingState(match: Match): {
  isOpen: boolean;
  statusBadgeText: string;
  badgeColorClass: string;
  closeNotice: string;
} {
  if (match.status === 'finished') {
    return {
      isOpen: false,
      statusBadgeText: 'انتهت المباراة (التصويت مغلق)',
      badgeColorClass: 'bg-slate-800 text-slate-400 border border-slate-700',
      closeNotice: 'أُغلق التصويت نظراً لنهاية المباراة واعتماد النتيجة النهائية.'
    };
  }

  if (match.status === 'live') {
    return {
      isOpen: false,
      statusBadgeText: 'المباراة جارية الآن (مغلق)',
      badgeColorClass: 'bg-rose-500 text-white font-black animate-pulse shadow-md shadow-rose-500/30',
      closeNotice: 'أُغلق التصويت لانطلاق صافرة بداية المباراة على الملعب.'
    };
  }

  // If match has date & time, compare with current clock
  if (match.date) {
    try {
      let hour = 18;
      let minute = 0;

      if (match.time) {
        const isPM = match.time.includes('م') || match.time.toLowerCase().includes('pm');
        const isAM = match.time.includes('ص') || match.time.toLowerCase().includes('am');
        const cleaned = match.time.replace(/[^\d:]/g, '').trim();
        const parts = cleaned.split(':');
        if (parts.length >= 2) {
          let h = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          if (isPM && h < 12) h += 12;
          if (isAM && h === 12) h = 0;
          hour = h;
          minute = m;
        }
      }

      // Parse match.date (e.g. 2026-10-18)
      const matchKickoff = new Date(match.date);
      matchKickoff.setHours(hour, minute, 0, 0);

      const now = new Date();
      if (!isNaN(matchKickoff.getTime()) && now.getTime() >= matchKickoff.getTime()) {
        return {
          isOpen: false,
          statusBadgeText: 'حان موعد المباراة (مغلق)',
          badgeColorClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
          closeNotice: `أُغلق التصويت بحلول موعد انطلاق المباراة المحدد (${match.time || 'الموعد'}).`
        };
      }

      // Scheduled in the future
      return {
        isOpen: true,
        statusBadgeText: `مفتوح حتى ${match.time || match.date}`,
        badgeColorClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
        closeNotice: `التصويت مفتوح ومتاح للجميع حتى بداية المباراة: ${match.date} ${match.time || ''}`
      };
    } catch {
      // fallback
    }
  }

  // Not yet scheduled with exact date/time
  return {
    isOpen: true,
    statusBadgeText: 'مفتوح للتصويت حتى موعد المباراة',
    badgeColorClass: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    closeNotice: 'التصويت متاح حتى موعد انطلاق المباراة.'
  };
}
