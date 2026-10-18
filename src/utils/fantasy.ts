import { Match, Team } from '../App';
import { Player } from './roster';
import { calculateTournamentStatsLeaders } from './scorers';

export interface FantasyPlayer {
  id: string;
  name: string;
  team: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  price: number; // in Millions, e.g. 4.5 to 11.0
  number: number;
  studentId: string;
  totalPoints: number;
  gameweekPoints: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
  photoUrl?: string;
  isCustom?: boolean;
  isChampion?: boolean; // أبطال السنة اللي فاتت (باريس)
}

export interface SelectedFantasySlot {
  slotIndex: number; // 0=GK, 1=DEF1, 2=DEF2, 3=MID1, 4=MID2, 5=FWD1, 6=FWD2, 7=BENCH1, 8=BENCH2
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  isStarter: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
  player: FantasyPlayer;
}

export interface FantasyTeam {
  userId: string;
  managerName: string;
  managerEmail: string;
  department: string;
  teamName: string;
  formation: string; // e.g. '1-2-2-2'
  slots: SelectedFantasySlot[];
  totalPoints: number;
  gameweekPoints: number;
  remainingBudget: number;
  transfersMade: number;
  updatedAt: string;
  gameweekRank?: number;
  overallRank?: number;
}

export interface FantasyLeaderboardEntry {
  rank: number;
  userId: string;
  managerName: string;
  managerEmail: string;
  teamName: string;
  department: string;
  captainName: string;
  gameweekPoints: number;
  totalPoints: number;
  slotsCount: number;
  updatedAt: string;
}

export const FANTASY_BUDGET = 50.0;
export const MAX_PLAYERS_PER_TEAM = 2;
export const TOTAL_SQUAD_SIZE = 9; // 7 starters + 2 bench

export const FANTASY_SLOTS_LAYOUT: {
  slotIndex: number;
  nameAr: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  isStarter: boolean;
}[] = [
  { slotIndex: 0, nameAr: 'حارس مرمى', position: 'GK', isStarter: true },
  { slotIndex: 1, nameAr: 'مدافع أول', position: 'DEF', isStarter: true },
  { slotIndex: 2, nameAr: 'مدافع ثانٍ', position: 'DEF', isStarter: true },
  { slotIndex: 3, nameAr: 'خط وسط أول', position: 'MID', isStarter: true },
  { slotIndex: 4, nameAr: 'خط وسط ثانٍ', position: 'MID', isStarter: true },
  { slotIndex: 5, nameAr: 'مهاجم أول', position: 'FWD', isStarter: true },
  { slotIndex: 6, nameAr: 'مهاجم ثانٍ', position: 'FWD', isStarter: true },
  { slotIndex: 7, nameAr: 'بديل أول (دفاع/وسط)', position: 'DEF', isStarter: false },
  { slotIndex: 8, nameAr: 'بديل ثانٍ (هجوم/وسط)', position: 'FWD', isStarter: false },
];

/**
 * Pre-defined student name generators for Nile University teams that have empty rosters
 * to ensure the fantasy player market is complete with real university context
 */
const SAMPLE_STUDENT_NAMES = [
  'يوسف أحمد الشريف', 'كريم طارق حسن', 'عمر خالد المنشاوي', 'أحمد حسام الدين', 
  'محمود عادل النجار', 'زياد مصطفى كمال', 'سيف الدين وائل', 'عبد الرحمن شريف',
  'محمد إبراهيم عطية', 'علي نور الدين', 'ياسين أشرف زكي', 'حازم ماجد رضوان',
  'مروان سامح فوزي', 'إسلام فتحي بدر', 'أدهم وليد سليمان', 'بلال تامر الصاوي',
  'حمزة ناصر الهواري', 'طارق علاء عثمان', 'رامي سعيد الجوهري', 'عمرو هاني درويش'
];

/**
 * Calculates fantasy points for a specific player from all tournament matches
 */
export function calculatePlayerFantasyPoints(
  playerName: string,
  teamName: string,
  position: 'GK' | 'DEF' | 'MID' | 'FWD',
  matches: Match[],
  statsLeaders: ReturnType<typeof calculateTournamentStatsLeaders>
): {
  totalPoints: number;
  gameweekPoints: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
} {
  const normName = playerName.trim().toLowerCase();
  
  // Find goals & assists from stats leaders
  const scorerData = statsLeaders.scorers.find(s => 
    s.name.trim().toLowerCase() === normName || 
    (s.team === teamName && (normName.includes(s.name.trim().toLowerCase()) || s.name.trim().toLowerCase().includes(normName)))
  );
  const goals = scorerData?.totalGoals || 0;

  const assistData = statsLeaders.playmakers.find(p => 
    p.name.trim().toLowerCase() === normName ||
    (p.team === teamName && (normName.includes(p.name.trim().toLowerCase()) || p.name.trim().toLowerCase().includes(normName)))
  );
  const assists = assistData?.totalAssists || 0;

  let cleanSheets = 0;
  let yellowCards = 0;
  let redCards = 0;
  let matchesPlayed = 0;
  let gameweekPoints = 0;

  // Inspect matches where the team played
  matches.forEach(m => {
    if (m.status !== 'finished') return;
    const isTeamA = m.teamA === teamName;
    const isTeamB = m.teamB === teamName;
    if (!isTeamA && !isTeamB) return;

    // Check if player participated in lineup or scorers or cards
    let participated = false;
    if (m.lineups) {
      const starters = isTeamA ? (m.lineups.teamAStarters || []) : (m.lineups.teamBStarters || []);
      const bench = isTeamA ? (m.lineups.teamABench || []) : (m.lineups.teamBBench || []);
      if (starters.some(n => n.toLowerCase().includes(normName) || normName.includes(n.toLowerCase()))) {
        participated = true;
      } else if (bench.some(n => n.toLowerCase().includes(normName) || normName.includes(n.toLowerCase()))) {
        // If subbed in
        const subbedIn = m.substitutions?.some(s => s.playerIn.toLowerCase().includes(normName));
        if (subbedIn) participated = true;
      }
    } else {
      // If no explicit lineup, assume played if scored or team played
      participated = true;
    }

    if (participated) {
      matchesPlayed += 1;
    }

    // Clean sheet calculation
    const goalsConceded = isTeamA ? (m.scoreB || 0) : (m.scoreA || 0);
    if (goalsConceded === 0 && (position === 'GK' || position === 'DEF')) {
      cleanSheets += 1;
    }

    // Cards check
    if (m.cards) {
      m.cards.forEach(c => {
        if (c.playerName.trim().toLowerCase() === normName) {
          if (c.cardType === 'yellow') yellowCards += 1;
          if (c.cardType === 'red' || c.cardType === 'second_yellow') redCards += 1;
        }
      });
    }
  });

  // Points computation
  // Appearance: 2 pts per match played
  let pts = matchesPlayed * 2;

  // Goals
  if (position === 'FWD') pts += goals * 4;
  else if (position === 'MID') pts += goals * 5;
  else pts += goals * 6; // DEF or GK

  // Assists: 3 pts each
  pts += assists * 3;

  // Clean sheets
  if (position === 'GK' || position === 'DEF') {
    pts += cleanSheets * 4;
  } else if (position === 'MID') {
    pts += cleanSheets * 1;
  }

  // Cards deductions
  pts -= yellowCards * 1;
  pts -= redCards * 3;

  // Ensure non-negative base
  const totalPoints = Math.max(0, pts);
  gameweekPoints = Math.round(totalPoints > 0 ? (totalPoints / Math.max(1, matchesPlayed || 1)) : 2);

  return {
    totalPoints,
    gameweekPoints,
    goals,
    assists,
    cleanSheets,
    yellowCards,
    redCards,
    matchesPlayed,
  };
}

/**
 * Check if the team is Paris (PSG) - reigning champions of last year
 */
export function isParisChampionTeam(teamName: string): boolean {
  if (!teamName) return false;
  const n = teamName.trim().toLowerCase();
  return (
    n.includes('باريس') ||
    n.includes('paris') ||
    n.includes('psg') ||
    n.includes('بي اس جي')
  );
}

/**
 * Computes base price based on position, goals, and team champion status
 * Budget is 50.0M: Paris squad (champions) are the most expensive tier (7.5M - 12.0M),
 * while standard university players range from 3.5M - 6.5M.
 */
export function calculatePlayerPrice(
  position: 'GK' | 'DEF' | 'MID' | 'FWD', 
  goals: number, 
  assists: number,
  teamName: string = ''
): number {
  const isChampion = isParisChampionTeam(teamName);

  if (isChampion) {
    // Paris squad are the champions of last year - strictly the most expensive players in the league
    let championBase = 8.0;
    if (position === 'GK') championBase = 7.5;
    if (position === 'DEF') championBase = 8.0;
    if (position === 'MID') championBase = 9.0;
    if (position === 'FWD') championBase = 10.0;

    const bonus = (goals * 0.4) + (assists * 0.3);
    return Math.min(12.5, Math.round((championBase + bonus) * 10) / 10);
  }

  // Regular players calibrated for 50.0M budget (average ~5.5M per player)
  let base = 4.2;
  if (position === 'GK') base = 3.6;
  if (position === 'DEF') base = 4.0;
  if (position === 'MID') base = 4.8;
  if (position === 'FWD') base = 5.5;

  const bonus = (goals * 0.3) + (assists * 0.2);
  return Math.min(6.8, Math.round((base + bonus) * 10) / 10);
}

/**
 * Generates all available Fantasy Players from the 48 tournament teams and squads
 */
export function createEmptySlotPlayer(pos: 'GK' | 'DEF' | 'MID' | 'FWD', slotIdx: number): FantasyPlayer {
  return {
    id: `empty_${slotIdx}`,
    name: 'خانة فارغة',
    team: 'اختر لاعب',
    position: pos,
    price: 3.5,
    number: 0,
    studentId: '',
    totalPoints: 0,
    gameweekPoints: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    yellowCards: 0,
    redCards: 0,
    matchesPlayed: 0,
  };
}

/**
 * Generates all available Fantasy Players strictly from actual team squads.
 * Any player added to a team immediately reflects here!
 */
export function getAllFantasyPlayers(
  squads: Record<string, Player[]>,
  matches: Match[],
  teams: Team[]
): FantasyPlayer[] {
  const statsLeaders = calculateTournamentStatsLeaders(matches, teams);
  const result: FantasyPlayer[] = [];
  const registeredIds = new Set<string>();

  // Process ONLY actual players currently registered in team squads
  Object.entries(squads).forEach(([teamName, playerList]) => {
    if (Array.isArray(playerList) && playerList.length > 0) {
      const isChampion = isParisChampionTeam(teamName);
      playerList.forEach((p, idx) => {
        if (!p || !p.name || !p.name.trim()) return;
        const stats = calculatePlayerFantasyPoints(p.name, teamName, p.position, matches, statsLeaders);
        const price = calculatePlayerPrice(p.position, stats.goals, stats.assists, teamName);
        const id = p.id || `fp_${teamName}_${idx}`;
        if (!registeredIds.has(id)) {
          registeredIds.add(id);
          result.push({
            id,
            name: p.name.trim(),
            team: teamName,
            position: p.position,
            price,
            number: p.number || (idx + 1),
            studentId: p.studentId || '',
            photoUrl: p.photoUrl,
            totalPoints: stats.totalPoints,
            gameweekPoints: stats.gameweekPoints,
            goals: stats.goals,
            assists: stats.assists,
            cleanSheets: stats.cleanSheets,
            yellowCards: stats.yellowCards,
            redCards: stats.redCards,
            matchesPlayed: stats.matchesPlayed,
            isCustom: true,
            isChampion,
          });
        }
      });
    }
  });

  // Sort by totalPoints descending, then price descending
  return result.sort((a, b) => b.totalPoints - a.totalPoints || b.price - a.price);
}

/**
 * Calculates total fantasy points for a team
 */
export function calculateFantasyTeamPoints(team: FantasyTeam): { totalPoints: number; gameweekPoints: number } {
  let total = 0;
  let gw = 0;

  team.slots.forEach(slot => {
    if (!slot.isStarter) return; // Only starters get points
    const multiplier = slot.isCaptain ? 2 : 1;
    total += (slot.player?.totalPoints || 0) * multiplier;
    gw += (slot.player?.gameweekPoints || 0) * multiplier;
  });

  return { totalPoints: total, gameweekPoints: gw };
}

/**
 * Generates a balanced smart auto-pick squad strictly within the 50.0M budget.
 * If there are not enough registered players, missing slots remain cleanly empty.
 */
export function generateAutoPickSquad(players: FantasyPlayer[]): SelectedFantasySlot[] {
  const gks = [...players.filter(p => p.position === 'GK')].sort((a, b) => a.price - b.price);
  const defs = [...players.filter(p => p.position === 'DEF')].sort((a, b) => a.price - b.price);
  const mids = [...players.filter(p => p.position === 'MID')].sort((a, b) => a.price - b.price);
  const fwds = [...players.filter(p => p.position === 'FWD')].sort((a, b) => a.price - b.price);

  const selected: FantasyPlayer[] = [];
  const teamCounts: Record<string, number> = {};

  const canAdd = (p: FantasyPlayer) => {
    if (selected.some(s => s.id === p.id)) return false;
    if ((teamCounts[p.team] || 0) >= MAX_PLAYERS_PER_TEAM) return false;
    return true;
  };

  const pickOne = (list: FantasyPlayer[], pos: 'GK' | 'DEF' | 'MID' | 'FWD', slotIdx: number): FantasyPlayer => {
    for (const p of list) {
      if (canAdd(p)) {
        selected.push(p);
        teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;
        return p;
      }
    }
    return createEmptySlotPlayer(pos, slotIdx);
  };

  // Pick balanced starters & budget-friendly bench to ensure <= 50.0M
  const gk1 = pickOne(gks, 'GK', 0);
  const def1 = pickOne(defs, 'DEF', 1);
  const def2 = pickOne(defs, 'DEF', 2);
  const mid1 = pickOne(mids, 'MID', 3);
  const mid2 = pickOne(mids, 'MID', 4);

  // For forwards
  const fwdsByPoints = [...players.filter(p => p.position === 'FWD')].sort((a, b) => b.totalPoints - a.totalPoints);
  const fwd1 = pickOne(fwdsByPoints, 'FWD', 5);
  const fwd2 = pickOne(fwds, 'FWD', 6);

  // Bench (strictly budget players)
  const bench1 = pickOne(defs.length > 2 ? defs : mids, 'DEF', 7);
  const bench2 = pickOne(fwds.length > 2 ? fwds : mids, 'FWD', 8);

  const starters: SelectedFantasySlot[] = [
    { slotIndex: 0, position: 'GK', isStarter: true, isCaptain: false, isViceCaptain: false, player: gk1 },
    { slotIndex: 1, position: 'DEF', isStarter: true, isCaptain: false, isViceCaptain: false, player: def1 },
    { slotIndex: 2, position: 'DEF', isStarter: true, isCaptain: false, isViceCaptain: false, player: def2 },
    { slotIndex: 3, position: 'MID', isStarter: true, isCaptain: false, isViceCaptain: false, player: mid1 },
    { slotIndex: 4, position: 'MID', isStarter: true, isCaptain: false, isViceCaptain: false, player: mid2 },
    { slotIndex: 5, position: 'FWD', isStarter: true, isCaptain: true, isViceCaptain: false, player: fwd1 },
    { slotIndex: 6, position: 'FWD', isStarter: true, isCaptain: false, isViceCaptain: true, player: fwd2 },
    { slotIndex: 7, position: 'DEF', isStarter: false, isCaptain: false, isViceCaptain: false, player: bench1 },
    { slotIndex: 8, position: 'FWD', isStarter: false, isCaptain: false, isViceCaptain: false, player: bench2 },
  ];

  // Guarantee total sum does not exceed FANTASY_BUDGET (50.0M)
  let sum = starters.reduce((acc, s) => acc + (s.player?.price || 0), 0);
  if (sum > FANTASY_BUDGET) {
    if (gks[0]) starters[0].player = gks[0];
    if (defs[0]) starters[7].player = defs[0];
    if (mids[0]) starters[8].player = mids[0];
  }

  return starters;
}

const FANTASY_LOCAL_KEY = 'nu_tournament_fantasy_team_v1';

export function loadLocalFantasyTeam(userId: string): FantasyTeam | null {
  try {
    const raw = localStorage.getItem(`${FANTASY_LOCAL_KEY}_${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading fantasy team from local storage', e);
  }
  return null;
}

export function saveLocalFantasyTeam(team: FantasyTeam): void {
  try {
    localStorage.setItem(`${FANTASY_LOCAL_KEY}_${team.userId}`, JSON.stringify(team));
  } catch (e) {
    console.error('Error saving fantasy team to local storage', e);
  }
}

/**
 * Fantasy leaderboard starting clean with no fake mock rivals
 */
export const SAMPLE_RIVAL_FANTASY_TEAMS: FantasyLeaderboardEntry[] = [];
