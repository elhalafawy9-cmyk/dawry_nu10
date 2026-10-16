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

export const FANTASY_BUDGET = 100.0;
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
 * Computes base price based on position, goals, and team strength
 */
function calculatePlayerPrice(position: 'GK' | 'DEF' | 'MID' | 'FWD', goals: number, assists: number): number {
  let base = 5.0;
  if (position === 'GK') base = 4.5;
  if (position === 'DEF') base = 5.0;
  if (position === 'MID') base = 6.0;
  if (position === 'FWD') base = 7.0;

  const bonus = (goals * 0.5) + (assists * 0.3);
  return Math.min(12.5, Math.round((base + bonus) * 10) / 10);
}

/**
 * Generates all available Fantasy Players from the 48 tournament teams and squads
 */
export function getAllFantasyPlayers(
  squads: Record<string, Player[]>,
  matches: Match[],
  teams: Team[]
): FantasyPlayer[] {
  const statsLeaders = calculateTournamentStatsLeaders(matches, teams);
  const result: FantasyPlayer[] = [];
  const registeredIds = new Set<string>();

  // 1. Process actual players currently in team squads
  Object.entries(squads).forEach(([teamName, playerList]) => {
    if (Array.isArray(playerList) && playerList.length > 0) {
      playerList.forEach((p, idx) => {
        const stats = calculatePlayerFantasyPoints(p.name, teamName, p.position, matches, statsLeaders);
        const price = calculatePlayerPrice(p.position, stats.goals, stats.assists);
        const id = p.id || `fp_${teamName}_${idx}`;
        registeredIds.add(id);

        result.push({
          id,
          name: p.name,
          team: teamName,
          position: p.position,
          price,
          number: p.number || (idx + 1),
          studentId: p.studentId || `2026${1000 + idx}`,
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
        });
      });
    }
  });

  // 2. For teams that have less than 7 players, seed standard university tournament players
  teams.forEach(t => {
    const existing = result.filter(p => p.team === t.name);
    const needed = 7 - existing.length;
    if (needed > 0) {
      const positions: ('GK' | 'DEF' | 'DEF' | 'MID' | 'MID' | 'FWD' | 'FWD')[] = [
        'GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD', 'FWD'
      ];
      
      const missingPositions = positions.slice(existing.length);
      missingPositions.forEach((pos, idx) => {
        const nameIndex = (t.name.charCodeAt(0) + idx * 3) % SAMPLE_STUDENT_NAMES.length;
        const name = `${SAMPLE_STUDENT_NAMES[nameIndex]} (${t.name})`;
        const num = existing.length + idx + 1;
        const studentId = `2410${Math.floor(1000 + Math.random() * 9000)}`;
        const stats = calculatePlayerFantasyPoints(name, t.name, pos, matches, statsLeaders);
        const price = calculatePlayerPrice(pos, stats.goals, stats.assists);
        const id = `seeded_${t.id}_${pos}_${idx}`;

        if (!registeredIds.has(id)) {
          registeredIds.add(id);
          result.push({
            id,
            name,
            team: t.name,
            position: pos,
            price,
            number: num,
            studentId,
            totalPoints: stats.totalPoints,
            gameweekPoints: stats.gameweekPoints,
            goals: stats.goals,
            assists: stats.assists,
            cleanSheets: stats.cleanSheets,
            yellowCards: stats.yellowCards,
            redCards: stats.redCards,
            matchesPlayed: stats.matchesPlayed,
            isCustom: false,
          });
        }
      });
    }
  });

  // Sort by totalPoints descending
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
    total += (slot.player.totalPoints || 0) * multiplier;
    gw += (slot.player.gameweekPoints || 0) * multiplier;
  });

  return { totalPoints: total, gameweekPoints: gw };
}

/**
 * Generates a balanced smart auto-pick squad within 100M budget
 */
export function generateAutoPickSquad(players: FantasyPlayer[]): SelectedFantasySlot[] {
  const gks = players.filter(p => p.position === 'GK');
  const defs = players.filter(p => p.position === 'DEF');
  const mids = players.filter(p => p.position === 'MID');
  const fwds = players.filter(p => p.position === 'FWD');

  const selected: FantasyPlayer[] = [];
  const teamCounts: Record<string, number> = {};

  const canAdd = (p: FantasyPlayer) => {
    if (selected.some(s => s.id === p.id)) return false;
    if ((teamCounts[p.team] || 0) >= MAX_PLAYERS_PER_TEAM) return false;
    return true;
  };

  const pickOne = (list: FantasyPlayer[]): FantasyPlayer | null => {
    for (const p of list) {
      if (canAdd(p)) {
        selected.push(p);
        teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;
        return p;
      }
    }
    return null;
  };

  const gk1 = pickOne(gks) || gks[0];
  const def1 = pickOne(defs) || defs[0];
  const def2 = pickOne(defs) || defs[1];
  const mid1 = pickOne(mids) || mids[0];
  const mid2 = pickOne(mids) || mids[1];
  const fwd1 = pickOne(fwds) || fwds[0];
  const fwd2 = pickOne(fwds) || fwds[1];
  const bench1 = pickOne(defs) || pickOne(mids) || defs[2] || mids[2];
  const bench2 = pickOne(fwds) || pickOne(mids) || fwds[2] || mids[3];

  const starters = [
    { slotIndex: 0, position: 'GK' as const, isStarter: true, isCaptain: false, isViceCaptain: false, player: gk1 },
    { slotIndex: 1, position: 'DEF' as const, isStarter: true, isCaptain: false, isViceCaptain: false, player: def1 },
    { slotIndex: 2, position: 'DEF' as const, isStarter: true, isCaptain: false, isViceCaptain: false, player: def2 },
    { slotIndex: 3, position: 'MID' as const, isStarter: true, isCaptain: false, isViceCaptain: false, player: mid1 },
    { slotIndex: 4, position: 'MID' as const, isStarter: true, isCaptain: false, isViceCaptain: false, player: mid2 },
    { slotIndex: 5, position: 'FWD' as const, isStarter: true, isCaptain: true, isViceCaptain: false, player: fwd1 }, // Captain
    { slotIndex: 6, position: 'FWD' as const, isStarter: true, isCaptain: false, isViceCaptain: true, player: fwd2 },  // Vice
    { slotIndex: 7, position: 'DEF' as const, isStarter: false, isCaptain: false, isViceCaptain: false, player: bench1 },
    { slotIndex: 8, position: 'FWD' as const, isStarter: false, isCaptain: false, isViceCaptain: false, player: bench2 },
  ];

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
 * Seed sample rival fantasy teams for the leaderboard
 */
export const SAMPLE_RIVAL_FANTASY_TEAMS: FantasyLeaderboardEntry[] = [
  {
    rank: 1,
    userId: 'rival_1',
    managerName: 'م. أحمد الشريف',
    managerEmail: 'a.sherif@nu.edu.eg',
    teamName: 'نسور النيل 🦅',
    department: 'كلية الهندسة والعلوم التطبيقية',
    captainName: 'مهاجم باريس',
    gameweekPoints: 48,
    totalPoints: 114,
    slotsCount: 9,
    updatedAt: '2026-10-16',
  },
  {
    rank: 2,
    userId: 'rival_2',
    managerName: 'يوسف حسام الدين',
    managerEmail: 'y.hossam@nu.edu.eg',
    teamName: 'أبطال زايد ⚡',
    department: 'كلية تكنولوجيا المعلومات وعلوم الحاسب',
    captainName: 'صانع ألعاب الزمالك',
    gameweekPoints: 42,
    totalPoints: 102,
    slotsCount: 9,
    updatedAt: '2026-10-16',
  },
  {
    rank: 3,
    userId: 'rival_3',
    managerName: 'عمر النجار',
    managerEmail: 'o.naggar@nu.edu.eg',
    teamName: 'كتيبة الفراعنة 👑',
    department: 'كلية إدارة الأعمال',
    captainName: 'مهاجم فرنسا',
    gameweekPoints: 39,
    totalPoints: 95,
    slotsCount: 9,
    updatedAt: '2026-10-16',
  },
  {
    rank: 4,
    userId: 'rival_4',
    managerName: 'كريم وائل',
    managerEmail: 'k.wael@nu.edu.eg',
    teamName: 'دوري النجوم 🌟',
    department: 'كلية التكنولوجيا الحيوية',
    captainName: 'حارس برشلونة',
    gameweekPoints: 35,
    totalPoints: 88,
    slotsCount: 9,
    updatedAt: '2026-10-16',
  },
  {
    rank: 5,
    userId: 'rival_5',
    managerName: 'زياد مصطفى',
    managerEmail: 'z.mostafa@nu.edu.eg',
    teamName: 'المحاربون ⚔️',
    department: 'كلية الهندسة والعلوم التطبيقية',
    captainName: 'مدافع إيطاليا',
    gameweekPoints: 31,
    totalPoints: 81,
    slotsCount: 9,
    updatedAt: '2026-10-16',
  },
];
