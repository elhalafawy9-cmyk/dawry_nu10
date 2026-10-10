import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { RoundMatchupOrganizerModal } from './components/RoundMatchupOrganizerModal';
import { TeamsRosterPage } from './components/TeamsRosterPage';
import { StatsLeadersPage } from './components/StatsLeadersPage';
import { SpectatorPortalPage } from './components/SpectatorPortalPage';
import { TeamManagerPortalPage } from './components/TeamManagerPortalPage';
import { UsersDirectoryPage } from './components/UsersDirectoryPage';
import { AuthModal } from './components/AuthModal';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { 
  AppUser, 
  UserRole, 
  PERMANENT_ADMIN_EMAIL, 
  PERMANENT_ADMIN_PASSWORD,
  loadStoredUsers, 
  saveStoredUsers, 
  loadActiveUser, 
  saveActiveUser 
} from './utils/auth';
import { 
  calculateTournamentStatsLeaders,
  MatchScorerItem,
  MatchAssistItem,
  buildMatchScorersSummary,
  parseMatchScorers,
  parseMatchAssists
} from './utils/scorers';
import { 
  Player, 
  MatchSubstitution, 
  MatchCardEvent, 
  CardType, 
  MAX_SUBS_PER_TEAM, 
  generateInitialSquads 
} from './utils/roster';
import { 
  Trophy, 
  Calendar, 
  Shield, 
  CheckCircle2, 
  Search, 
  SlidersHorizontal, 
  Swords, 
  Edit3, 
  Plus, 
  Minus,
  Trash2,
  Clock, 
  MapPin, 
  Check, 
  Sparkles, 
  Award, 
  Filter, 
  Layers, 
  Target, 
  ChevronRight, 
  Eye, 
  RotateCcw, 
  X, 
  CalendarDays, 
  AlertCircle,
  Users,
  ArrowRightLeft,
  Flame,
  Zap,
  TrendingUp,
  Shirt,
  UserCheck,
  Compass,
  Crown,
  LogIn,
  LogOut,
  Lock,
  UserPlus
} from 'lucide-react';

// --- TYPES ---
export interface Team {
  id: string;
  name: string;
  group: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  logoColor: string;
}

export interface Match {
  id: string;
  group?: string;
  round?: number; // 1 to 5 for group matches
  stage: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final';
  stageName: string;
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  status: 'upcoming' | 'live' | 'finished';
  minute?: number;
  date: string; // Empty string if not scheduled yet
  time: string; // Empty string if not scheduled yet
  pitch: string; // Empty string if not scheduled yet
  isScheduled: boolean; // True only when the admin has explicitly scheduled it!
  scorersSummary?: string; // Optional notes/scorers
  recordedBy?: string;
  lineups?: {
    teamAStarters?: string[];
    teamABench?: string[];
    teamBStarters?: string[];
    teamBBench?: string[];
  };
  substitutions?: MatchSubstitution[];
  cards?: MatchCardEvent[];
}

export interface Scorekeeper {
  id: string;
  name: string;
  studentId: string;
  role: 'scorekeeper' | 'admin';
  assignedGroups: string[];
  active: boolean;
}

// Initial 48 Teams across 8 groups (A to H) - 6 teams in each group
const INITIAL_TEAMS: Team[] = [
// Group A (المجموعة A)
  { id: 't1', name: 'برشلونة', group: 'A', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-blue-600 to-red-600' },
  { id: 't2', name: 'انجلترا', group: 'A', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-slate-200' },
  { id: 't3', name: 'ميلان', group: 'A', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-700 to-black' },
  { id: 't4', name: 'الزمالك', group: 'A', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-500 to-white' },
  { id: 't5', name: 'روما', group: 'A', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-amber-600 to-red-800' },
  { id: 't6', name: 'فرنسا', group: 'A', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-blue-700 to-blue-500' },

  // Group B (المجموعة B)
  { id: 't7', name: 'الجزائر', group: 'B', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-emerald-600 to-green-500' },
  { id: 't8', name: 'مينيرو', group: 'B', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-zinc-800 to-zinc-600' },
  { id: 't9', name: 'فرانكفورت', group: 'B', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-black' },
  { id: 't10', name: 'اليابان', group: 'B', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-blue-600 to-red-500' },
  { id: 't11', name: 'النرويج', group: 'B', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-blue-600' },
  { id: 't12', name: 'ميامي', group: 'B', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-pink-500 to-black' },

  // Group C (المجموعة C)
  { id: 't13', name: 'سانتوس', group: 'C', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-slate-700 to-white' },
  { id: 't14', name: 'انتر ميلان', group: 'C', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-blue-800 to-black' },
  { id: 't15', name: 'البرازيل', group: 'C', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-yellow-400 to-emerald-600' },
  { id: 't16', name: 'نيوكاسل', group: 'C', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-black to-slate-400' },
  { id: 't17', name: 'النصر', group: 'C', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-yellow-500 to-blue-600' },
  { id: 't18', name: 'مصر', group: 'C', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-black' },

  // Group D (المجموعة D)
  { id: 't19', name: 'باريس', group: 'D', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-blue-900 to-red-600' },
  { id: 't20', name: 'اسبانيا', group: 'D', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-yellow-500' },
  { id: 't21', name: 'نابولي', group: 'D', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-sky-500 to-blue-700' },
  { id: 't22', name: 'غزل المحلة', group: 'D', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-cyan-400 to-black' },
  { id: 't23', name: 'اتلتيكو مدريد', group: 'D', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-blue-800' },
  { id: 't24', name: 'المانيا', group: 'D', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-black to-red-600' },

  // Group E (المجموعة E)
  { id: 't25', name: 'استون فيلا', group: 'E', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-purple-900 to-sky-400' },
  { id: 't26', name: 'امريكا', group: 'E', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-blue-700 to-red-600' },
  { id: 't27', name: 'ارسنال', group: 'E', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-white' },
  { id: 't28', name: 'كولومبيا', group: 'E', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-yellow-400 to-blue-700' },
  { id: 't29', name: 'المغرب', group: 'E', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-emerald-600' },
  { id: 't30', name: 'طرابزون', group: 'E', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-800 to-sky-600' },

  // Group F (المجموعة F)
  { id: 't31', name: 'بروسيا', group: 'F', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-yellow-400 to-black' },
  { id: 't32', name: 'بايرن', group: 'F', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-700 to-red-500' },
  { id: 't33', name: 'ريال مدريد', group: 'F', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-slate-100 to-purple-600' },
  { id: 't34', name: 'ايطاليا', group: 'F', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-blue-600 to-blue-800' },
  { id: 't35', name: 'اياكس', group: 'F', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-white' },
  { id: 't36', name: 'تشيلسي', group: 'F', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-blue-700 to-blue-500' },

  // Group G (المجموعة G)
  { id: 't37', name: 'مان سيتي', group: 'G', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-sky-400 to-white' },
  { id: 't38', name: 'اكتوبر', group: 'G', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-emerald-600 to-amber-500' },
  { id: 't39', name: 'يونايتد', group: 'G', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-yellow-500' },
  { id: 't40', name: 'الارجنتين', group: 'G', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-sky-300 to-white' },
  { id: 't41', name: 'ليفربول', group: 'G', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-red-700' },
  { id: 't42', name: 'ليفركوزن', group: 'G', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-black' },

  // Group H (المجموعة H)
  { id: 't43', name: 'يوفنتوس', group: 'H', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-black to-slate-200' },
  { id: 't44', name: 'الاهلي', group: 'H', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-amber-400' },
  { id: 't45', name: 'توتنهام', group: 'H', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-blue-950 to-white' },
  { id: 't46', name: 'فلسطين', group: 'H', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-emerald-600' },
  { id: 't47', name: 'المكسيك', group: 'H', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-emerald-700 to-red-600' },
  { id: 't48', name: 'البرتغال', group: 'H', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-emerald-600' },
];

// Helper to build all 120 group stage matches (15 matches across 5 rounds for each of the 8 groups)
// Every team plays exactly 5 matches within its group
// ALL MATCHES START UNSCHEDULED (غير محددة الموعد) until the user sets their date/time!
const generateGroupStageMatches = (): Match[] => {
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  // Circle algorithm round-robin pairings for 6 teams (indices 0..5):
  const roundPairings = [
    // Round 1
    [[0, 5], [1, 4], [2, 3]],
    // Round 2
    [[0, 4], [5, 3], [1, 2]],
    // Round 3
    [[0, 3], [4, 2], [5, 1]],
    // Round 4
    [[0, 2], [3, 1], [4, 5]],
    // Round 5
    [[0, 1], [2, 5], [3, 4]],
  ];

  const matchesList: Match[] = [];

  groups.forEach((grp) => {
    const teamsInGroup = INITIAL_TEAMS.filter(t => t.group === grp);

    roundPairings.forEach((roundPairs, rIdx) => {
      const roundNum = rIdx + 1;

      roundPairs.forEach((pair, mIdx) => {
        const teamA = teamsInGroup[pair[0]]?.name || `فريق ${pair[0] + 1} (${grp})`;
        const teamB = teamsInGroup[pair[1]]?.name || `فريق ${pair[1] + 1} (${grp})`;
        const id = `grp_${grp.toLowerCase()}_r${roundNum}_m${mIdx + 1}`;

        const matchObj: Match = {
          id,
          group: grp,
          round: roundNum,
          stage: 'group',
          stageName: `المجموعة ${grp} (الجولة ${roundNum})`,
          teamA,
          teamB,
          scoreA: null,
          scoreB: null,
          status: 'upcoming',
          date: '', // لا يتم تنزيل الماتش حتى يحدد المستخدم معاده
          time: '',
          pitch: '',
          isScheduled: false, // بانتظار تحديد الموعد من الإدارة
        };

        matchesList.push(matchObj);
      });
    });
  });

  return matchesList;
};

// Initial Knockout Bracket Matches (32 matches from Round of 32 down to Grand Final)
// All start unscheduled until reached / scheduled by admin
const INITIAL_KNOCKOUT_MATCHES: Match[] = [
  { id: 'r32_1', stage: 'r32', stageName: 'دور الـ 32 (مباراة 1)', teamA: 'فريق متأهل (1)', teamB: 'فريق متأهل (2)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r32_2', stage: 'r32', stageName: 'دور الـ 32 (مباراة 2)', teamA: 'فريق متأهل (3)', teamB: 'فريق متأهل (4)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r32_3', stage: 'r32', stageName: 'دور الـ 32 (مباراة 3)', teamA: 'فريق متأهل (5)', teamB: 'فريق متأهل (6)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r32_4', stage: 'r32', stageName: 'دور الـ 32 (مباراة 4)', teamA: 'فريق متأهل (7)', teamB: 'فريق متأهل (8)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  
  { id: 'r32_5', stage: 'r32', stageName: 'دور الـ 32 (مباراة 5)', teamA: 'فريق متأهل (9)', teamB: 'فريق متأهل (10)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r32_6', stage: 'r32', stageName: 'دور الـ 32 (مباراة 6)', teamA: 'فريق متأهل (11)', teamB: 'فريق متأهل (12)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r32_7', stage: 'r32', stageName: 'دور الـ 32 (مباراة 7)', teamA: 'فريق متأهل (13)', teamB: 'فريق متأهل (14)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r32_8', stage: 'r32', stageName: 'دور الـ 32 (مباراة 8)', teamA: 'فريق متأهل (15)', teamB: 'فريق متأهل (16)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },

  { id: 'r32_9', stage: 'r32', stageName: 'دور الـ 32 (مباراة 9)', teamA: 'فريق متأهل (17)', teamB: 'فريق متأهل (18)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r32_10', stage: 'r32', stageName: 'دور الـ 32 (مباراة 10)', teamA: 'فريق متأهل (19)', teamB: 'فريق متأهل (20)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r32_11', stage: 'r32', stageName: 'دور الـ 32 (مباراة 11)', teamA: 'فريق متأهل (21)', teamB: 'فريق متأهل (22)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r32_12', stage: 'r32', stageName: 'دور الـ 32 (مباراة 12)', teamA: 'فريق متأهل (23)', teamB: 'فريق متأهل (24)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },

  { id: 'r32_13', stage: 'r32', stageName: 'دور الـ 32 (مباراة 13)', teamA: 'فريق متأهل (25)', teamB: 'فريق متأهل (26)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r32_14', stage: 'r32', stageName: 'دور الـ 32 (مباراة 14)', teamA: 'فريق متأهل (27)', teamB: 'فريق متأهل (28)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r32_15', stage: 'r32', stageName: 'دور الـ 32 (مباراة 15)', teamA: 'فريق متأهل (29)', teamB: 'فريق متأهل (30)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r32_16', stage: 'r32', stageName: 'دور الـ 32 (مباراة 16)', teamA: 'فريق متأهل (31)', teamB: 'فريق متأهل (32)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },

  // --- دور الـ 16 (8 مباريات) ---
  { id: 'r16_1', stage: 'r16', stageName: 'دور الـ 16 (مباراة 1)', teamA: 'الفائز من م1 (دور 32)', teamB: 'الفائز من م2 (دور 32)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r16_2', stage: 'r16', stageName: 'دور الـ 16 (مباراة 2)', teamA: 'الفائز من م3 (دور 32)', teamB: 'الفائز من م4 (دور 32)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r16_3', stage: 'r16', stageName: 'دور الـ 16 (مباراة 3)', teamA: 'الفائز من م5 (دور 32)', teamB: 'الفائز من م6 (دور 32)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r16_4', stage: 'r16', stageName: 'دور الـ 16 (مباراة 4)', teamA: 'الفائز من م7 (دور 32)', teamB: 'الفائز من م8 (دور 32)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r16_5', stage: 'r16', stageName: 'دور الـ 16 (مباراة 5)', teamA: 'الفائز من م9 (دور 32)', teamB: 'الفائز من م10 (دور 32)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r16_6', stage: 'r16', stageName: 'دور الـ 16 (مباراة 6)', teamA: 'الفائز من م11 (دور 32)', teamB: 'الفائز من م12 (دور 32)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r16_7', stage: 'r16', stageName: 'دور الـ 16 (مباراة 7)', teamA: 'الفائز من م13 (دور 32)', teamB: 'الفائز من م14 (دور 32)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'r16_8', stage: 'r16', stageName: 'دور الـ 16 (مباراة 8)', teamA: 'الفائز من م15 (دور 32)', teamB: 'الفائز من م16 (دور 32)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },

  // --- ربع النهائي (4 مباريات) ---
  { id: 'qf1', stage: 'qf', stageName: 'ربع النهائي (1)', teamA: 'المتأهل من دور 16 (1)', teamB: 'المتأهل من دور 16 (2)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'qf2', stage: 'qf', stageName: 'ربع النهائي (2)', teamA: 'المتأهل من دور 16 (3)', teamB: 'المتأهل من دور 16 (4)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'qf3', stage: 'qf', stageName: 'ربع النهائي (3)', teamA: 'المتأهل من دور 16 (5)', teamB: 'المتأهل من دور 16 (6)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'qf4', stage: 'qf', stageName: 'ربع النهائي (4)', teamA: 'المتأهل من دور 16 (7)', teamB: 'المتأهل من دور 16 (8)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },

  // --- نصف النهائي (مباراتان) ---
  { id: 'sf1', stage: 'sf', stageName: 'نصف النهائي (1)', teamA: 'المتأهل من ربع النهائي (1)', teamB: 'المتأهل من ربع النهائي (2)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
  { id: 'sf2', stage: 'sf', stageName: 'نصف النهائي (2)', teamA: 'المتأهل من ربع النهائي (3)', teamB: 'المتأهل من ربع النهائي (4)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },

  // --- مباراة المركز الثالث والرابع ---
  { id: 'third', stage: 'final', stageName: 'مباراة المركز الثالث 🥉', teamA: 'الخاسر من نصف النهائي (1)', teamB: 'الخاسر من نصف النهائي (2)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },

  // --- النهائي الكبير 🏆 ---
  { id: 'fin', stage: 'final', stageName: 'النهائي الكبير 🏆', teamA: 'المتأهل للنهائي (1)', teamB: 'المتأهل للنهائي (2)', scoreA: null, scoreB: null, status: 'upcoming', date: '', time: '', pitch: '', isScheduled: false },
];

// All tournament matches: 120 group stage matches (5 rounds for each group) + 32 knockout matches = 152 matches
const INITIAL_MATCHES: Match[] = [...generateGroupStageMatches(), ...INITIAL_KNOCKOUT_MATCHES];

export const R32_SEED_PAIRS: Record<string, {
  nextMatchId: string; nextSlot: 'teamA' | 'teamB';
}> = {
  r32_1: { nextMatchId: 'r16_1', nextSlot: 'teamA' },
  r32_2: { nextMatchId: 'r16_1', nextSlot: 'teamB' },
  r32_3: { nextMatchId: 'r16_2', nextSlot: 'teamA' },
  r32_4: { nextMatchId: 'r16_2', nextSlot: 'teamB' },
  
  r32_5: { nextMatchId: 'r16_3', nextSlot: 'teamA' },
  r32_6: { nextMatchId: 'r16_3', nextSlot: 'teamB' },
  r32_7: { nextMatchId: 'r16_4', nextSlot: 'teamA' },
  r32_8: { nextMatchId: 'r16_4', nextSlot: 'teamB' },

  r32_9: { nextMatchId: 'r16_5', nextSlot: 'teamA' },
  r32_10: { nextMatchId: 'r16_5', nextSlot: 'teamB' },
  r32_11: { nextMatchId: 'r16_6', nextSlot: 'teamA' },
  r32_12: { nextMatchId: 'r16_6', nextSlot: 'teamB' },

  r32_13: { nextMatchId: 'r16_7', nextSlot: 'teamA' },
  r32_14: { nextMatchId: 'r16_7', nextSlot: 'teamB' },
  r32_15: { nextMatchId: 'r16_8', nextSlot: 'teamA' },
  r32_16: { nextMatchId: 'r16_8', nextSlot: 'teamB' },
};

const INITIAL_SCOREKEEPERS: Scorekeeper[] = [
  { id: 'sk1', name: 'سمير (المدير العام)', studentId: '20210001', role: 'admin', assignedGroups: ['ALL'], active: true },
  { id: 'sk2', name: 'عمر النجار (حكم ومسؤول ملاعب)', studentId: '20220911', role: 'scorekeeper', assignedGroups: ['A', 'B', 'C', 'D'], active: true },
  { id: 'sk3', name: 'كريم وائل (مسجل نتائج)', studentId: '20230112', role: 'scorekeeper', assignedGroups: ['E', 'F', 'G', 'H'], active: true },
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<
    'matches_control' | 'spectator_portal' | 'team_manager' | 'users_directory' | 'groups' | 'bracket' | 'teams_roster' | 'stats_leaders' | 'manage'
  >('matches_control');
  
  // Auth & Nile University Users State
  const [users, setUsers] = useState<AppUser[]>(() => loadStoredUsers());
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => loadActiveUser(loadStoredUsers()));
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Data States
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [matches, setMatches] = useState<Match[]>(INITIAL_MATCHES);
  const [scorekeepers, setScorekeepers] = useState<Scorekeeper[]>(INITIAL_SCOREKEEPERS);

  // Squads State (all 48 teams players)
  const [squads, setSquads] = useState<Record<string, Player[]>>(() => {
    return generateInitialSquads(INITIAL_TEAMS.map(t => t.name));
  });

  // Round Matchup Organizer Modal State
  const [isRoundOrganizerOpen, setIsRoundOrganizerOpen] = useState<boolean>(false);
  const [roundOrganizerConfig, setRoundOrganizerConfig] = useState<{
    group: string;
    round: number;
    stage: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final';
  }>({
    group: 'A',
    round: 1,
    stage: 'group',
  });

  // Single Matchup Quick Edit Modal State
  const [editingMatchPairing, setEditingMatchPairing] = useState<Match | null>(null);
  const [singlePairingForm, setSinglePairingForm] = useState({ teamA: '', teamB: '' });

  // Active Operator
  const [activeOperatorId, setActiveOperatorId] = useState<string>('sk1');

  // Filter States
  const [matchScheduleTab, setMatchScheduleTab] = useState<'scheduled' | 'unscheduled' | 'all'>('scheduled');
  const [matchFilterStatus, setMatchFilterStatus] = useState<'all' | 'upcoming' | 'live' | 'finished'>('all');
  const [matchStageFilter, setMatchStageFilter] = useState<'all' | 'group' | 'r32' | 'r16' | 'finals'>('all');
  const [groupStageRoundFilter, setGroupStageRoundFilter] = useState<'all' | number>('all');
  const [groupStageLetterFilter, setGroupStageLetterFilter] = useState<'all' | string>('all');
  const [manageTeamsGroupFilter, setManageTeamsGroupFilter] = useState<'all' | string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('A');
  const [groupsViewMode, setGroupsViewMode] = useState<'table' | 'fixtures' | 'qualified_32'>('table');
  const [bracketStageFilter, setBracketStageFilter] = useState<'all' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Team for viewing all 5 matches
  const [selectedTeamNameForMatches, setSelectedTeamNameForMatches] = useState<string | null>(null);
  const [teamMatchesModalFilter, setTeamMatchesModalFilter] = useState<'all' | 'scheduled' | 'finished'>('all');

  // Bulk Edit / Import Teams States
  const [isBulkEditingTeams, setIsBulkEditingTeams] = useState<boolean>(false);
  const [bulkEditTab, setBulkEditTab] = useState<'by_group' | 'paste_text'>('by_group');
  const [bulkTeamsByGroup, setBulkTeamsByGroup] = useState<Record<string, string[]>>({});
  const [bulkTeamsText, setBulkTeamsText] = useState<string>('');

  // Modals
  const [schedulingMatch, setSchedulingMatch] = useState<Match | null>(null);
  const [recordingResultMatch, setRecordingResultMatch] = useState<Match | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isAddingMatch, setIsAddingMatch] = useState<boolean>(false);

  // Form states for Match Schedule / Reschedule
  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    time: '04:00 م',
    pitch: 'الملعب الرئيسي (A)',
  });

  // Result Recording Form
  const [resultForm, setResultForm] = useState({
    scoreA: 0,
    scoreB: 0,
    status: 'finished' as 'live' | 'finished',
    minute: 90,
    notes: '',
  });

  // Per-Team Scorers & Assists for Result Recording Modal (كتابة الأهداف والأسيستات لكل فرقة على حدة)
  const [teamAScorers, setTeamAScorers] = useState<MatchScorerItem[]>([]);
  const [teamAAssists, setTeamAAssists] = useState<MatchAssistItem[]>([]);
  const [teamBScorers, setTeamBScorers] = useState<MatchScorerItem[]>([]);
  const [teamBAssists, setTeamBAssists] = useState<MatchAssistItem[]>([]);
  const [manualResultNotes, setManualResultNotes] = useState<string>('');
  const [showManualNotesInput, setShowManualNotesInput] = useState<boolean>(false);
  const [autoSyncScore, setAutoSyncScore] = useState<boolean>(true); // تحديث النتيجة تلقائياً من أهداف اللاعبين المكتوبة بالأسفل

  // Substitutions (max 5 per team) & Cards (Yellow / Red / Ejections) for Result Recording Modal
  const [teamASubs, setTeamASubs] = useState<MatchSubstitution[]>([]);
  const [teamBSubs, setTeamBSubs] = useState<MatchSubstitution[]>([]);
  const [teamACards, setTeamACards] = useState<MatchCardEvent[]>([]);
  const [teamBCards, setTeamBCards] = useState<MatchCardEvent[]>([]);
  const [newSubA, setNewSubA] = useState({ minute: 60, playerOut: '', playerIn: '' });
  const [newSubB, setNewSubB] = useState({ minute: 60, playerOut: '', playerIn: '' });
  const [newCardA, setNewCardA] = useState<{ minute: number; playerName: string; cardType: CardType; reason: string }>({
    minute: 45,
    playerName: '',
    cardType: 'yellow',
    reason: '',
  });
  const [newCardB, setNewCardB] = useState<{ minute: number; playerName: string; cardType: CardType; reason: string }>({
    minute: 45,
    playerName: '',
    cardType: 'yellow',
    reason: '',
  });

  // Add Custom Match Form
  const [newMatchForm, setNewMatchForm] = useState({
    stageName: 'مباراة دور المجموعات',
    stage: 'group' as 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final',
    teamA: INITIAL_TEAMS[0].name,
    teamB: INITIAL_TEAMS[1].name,
    date: '',
    time: '04:00 م',
    pitch: 'الملعب الرئيسي (A)',
  });

  // Manage Sub-tab: teams | scorekeepers
  const [manageSubTab, setManageSubTab] = useState<'teams' | 'scorekeepers'>('teams');

  // New Scorekeeper Form
  const [newScorekeeperForm, setNewScorekeeperForm] = useState({
    name: '',
    studentId: '',
    assignedGroups: 'ALL',
  });

  const currentOperator = useMemo(() => {
    return scorekeepers.find(sk => sk.id === activeOperatorId) || scorekeepers[0];
  }, [scorekeepers, activeOperatorId]);

  // --- تصفير جميع المباريات والنتائج والفرق ---
  const handleResetAllMatches = () => {
    if (confirm('هل أنت متأكد من تصفير جميع المباريات والنتائج؟\nسيتم إعادة جميع الـ 120 مباراة في دور المجموعات ومباريات البطولة إلى حالة (قادمة)، وتصفير أهداف ونقاط كافة الفرق.')) {
      setMatches(prev => prev.map(m => ({
        ...m,
        scoreA: null,
        scoreB: null,
        status: 'upcoming' as const,
        minute: undefined,
        scorersSummary: undefined,
        recordedBy: undefined,
      })));
      setTeams(prev => prev.map(t => ({
        ...t,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0,
      })));
      confetti({ particleCount: 50, spread: 60 });
      alert('تم تصفير جميع الماتشات والنتائج بنجاح! جميع الفرق تبدأ الآن بـ 0 نقاط و0 أهداف.');
    }
  };

  // Tournament Statistics Leaders memo (Scorers & Playmakers / Assists)
  const tournamentStatsData = useMemo(() => {
    return calculateTournamentStatsLeaders(matches, teams);
  }, [matches, teams]);

  // Update Match Lineups (Starters, Bench, Substitutions, Cards)
  const handleUpdateMatchLineups = (
    matchId: string,
    teamName: string,
    starters: string[],
    bench: string[],
    subs: MatchSubstitution[],
    cards?: MatchCardEvent[]
  ) => {
    setMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        const isTeamA = m.teamA === teamName;
        const currentLineups = m.lineups || {};
        const otherSubs = (m.substitutions || []).filter(s => s.team !== teamName);
        const otherCards = (m.cards || []).filter(c => c.team !== teamName);
        const updatedTeamCards = cards !== undefined ? cards : (m.cards || []).filter(c => c.team === teamName);

        return {
          ...m,
          lineups: {
            ...currentLineups,
            ...(isTeamA ? { teamAStarters: starters, teamABench: bench } : { teamBStarters: starters, teamBBench: bench }),
          },
          substitutions: [...otherSubs, ...subs],
          cards: [...otherCards, ...updatedTeamCards],
        };
      }
      return m;
    }));
  };

  // Open Round Matchup Organizer
  const handleOpenRoundOrganizer = (group = 'A', round = 1, stage: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final' = 'group') => {
    setRoundOrganizerConfig({ group, round, stage });
    setIsRoundOrganizerOpen(true);
  };

  // Open Single Matchup Quick Edit
  const handleOpenEditMatchup = (match: Match) => {
    setEditingMatchPairing(match);
    setSinglePairingForm({ teamA: match.teamA, teamB: match.teamB });
  };

  const handleSaveSingleMatchup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatchPairing) return;
    if (!singlePairingForm.teamA.trim() || !singlePairingForm.teamB.trim()) {
      alert('يرجى تحديد طرفي المباراة!');
      return;
    }

    setMatches(prev => prev.map(m => {
      if (m.id === editingMatchPairing.id) {
        return {
          ...m,
          teamA: singlePairingForm.teamA.trim(),
          teamB: singlePairingForm.teamB.trim(),
        };
      }
      return m;
    }));

    setEditingMatchPairing(null);
    confetti({ particleCount: 50, spread: 60 });
    alert('تم تعديل طرفي المباراة بنجاح! ⚔️');
  };

  // Seed demo match scores with rich scorers, assists, and substitutions
  const handleSeedDemoStats = () => {
    setMatches(prev => {
      return prev.map(m => {
        if (m.id === 'grp_a_r1_m1') {
          return {
            ...m,
            scoreA: 3,
            scoreB: 2,
            status: 'finished',
            isScheduled: true,
            date: '2026-05-10',
            time: '04:00 م',
            pitch: 'الملعب الرئيسي (A)',
            scorersSummary: 'برشلونة: ليفاندوفسكي (د14، د65)، يامال (د88)، بيدري (2 أسيست) - فرنسا: مبابي (د30)، جريزمان (د52)، ديمبيلي (أسيست)',
            recordedBy: 'عمر النجار (مسجل نتائج)',
            substitutions: [
              { id: 'sub_1', minute: 70, playerOut: 'أحمد صلاح', playerIn: 'علي سعيد', team: 'برشلونة' },
              { id: 'sub_2', minute: 82, playerOut: 'كريم رمضان', playerIn: 'يوسف حجازي', team: 'فرنسا' },
            ],
          };
        }
        if (m.id === 'grp_a_r1_m2') {
          return {
            ...m,
            scoreA: 1,
            scoreB: 1,
            status: 'finished',
            isScheduled: true,
            date: '2026-05-10',
            time: '06:00 م',
            pitch: 'ملعب النجيل الصناعي (B)',
            scorersSummary: 'انجلترا: كين (د22)، بيلينجهام (أسيست) - روما: ديبالا (د70)',
            recordedBy: 'عمر النجار (مسجل نتائج)',
          };
        }
        if (m.id === 'grp_c_r1_m1') {
          return {
            ...m,
            scoreA: 2,
            scoreB: 3,
            status: 'finished',
            isScheduled: true,
            date: '2026-05-11',
            time: '04:00 م',
            pitch: 'الملعب الرئيسي (A)',
            scorersSummary: 'سانتوس: نيمار (هدفين) - مصر: محمد صلاح (هاتريك 3 أهداف)، تريزيجيه (2 أسيست)',
            recordedBy: 'كريم وائل (مسجل نتائج)',
          };
        }
        if (m.id === 'grp_d_r1_m1') {
          return {
            ...m,
            scoreA: 2,
            scoreB: 1,
            status: 'finished',
            isScheduled: true,
            date: '2026-05-11',
            time: '06:00 م',
            pitch: 'الملعب الرئيسي (A)',
            scorersSummary: 'باريس: ديمبيلي (د18)، باركولا (د75)، حكيمي (أسيست) - اسبانيا: موراتا (د44)',
            recordedBy: 'عمر النجار (مسجل نتائج)',
          };
        }
        if (m.id === 'grp_g_r1_m3') {
          return {
            ...m,
            scoreA: 2,
            scoreB: 2,
            status: 'finished',
            isScheduled: true,
            date: '2026-05-12',
            time: '08:00 م',
            pitch: 'ستاد جامعة النيل الرئيسي',
            scorersSummary: 'مان سيتي: هالاند (2)، دي بروين (2 أسيست) - ليفربول: لويس دياز (1)، محمد صلاح (1)، أرنولد (أسيست)',
            recordedBy: 'كريم وائل (مسجل نتائج)',
          };
        }
        if (m.id === 'grp_h_r1_m2') {
          return {
            ...m,
            scoreA: 1,
            scoreB: 2,
            status: 'finished',
            isScheduled: true,
            date: '2026-05-12',
            time: '06:00 م',
            pitch: 'الملعب الرئيسي (A)',
            scorersSummary: 'يوفنتوس: فلاهوفيتش (د10) - الاهلي: إمام عاشور (د45)، وسام أبو علي (د89)، أفشة (أسيست)',
            recordedBy: 'سمير (المدير العام)',
          };
        }
        return m;
      });
    });
    confetti({ particleCount: 70, spread: 80 });
    alert('تم تحميل وتحديث نتائج وأهداف وأسيست نموذجية بنجاح! تفقد تبويب «الهداف وصناعة اللعب» وتبويب «الفرق واللاعبين» ⚽🎯');
  };

  // --- SCHEDULING HANDLERS ---
  const handleOpenScheduleModal = (match: Match) => {
    setSchedulingMatch(match);
    setScheduleForm({
      date: match.date || '',
      time: match.time || '04:00 م',
      pitch: match.pitch || 'الملعب الرئيسي (A)',
    });
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingMatch) return;
    if (!scheduleForm.date) {
      alert('يرجى اختيار تاريخ ويوم إقامة المباراة أولاً!');
      return;
    }

    setMatches(prev => prev.map(m => {
      if (m.id === schedulingMatch.id) {
        return {
          ...m,
          date: scheduleForm.date,
          time: scheduleForm.time || '04:00 م',
          pitch: scheduleForm.pitch || 'الملعب الرئيسي (A)',
          isScheduled: true, // الآن أصبحت المباراة منزّلة رسمياً في الجدول
          recordedBy: `${currentOperator.name} (تحديد موعد)`,
        };
      }
      return m;
    }));

    setSchedulingMatch(null);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    alert(`تم تحديد ميعاد المباراة (${schedulingMatch.teamA} ضد ${schedulingMatch.teamB}) وتنزيلها في جدول البطولة بنجاح! 📅`);
  };

  const handleUnscheduleMatch = (matchId: string) => {
    if (confirm('هل ترغب في سحب هذه المباراة من الجدول وإلغاء موعدها لتعود لحالة بانتظار تحديد الموعد؟')) {
      setMatches(prev => prev.map(m => {
        if (m.id === matchId) {
          return {
            ...m,
            date: '',
            time: '',
            pitch: '',
            isScheduled: false,
          };
        }
        return m;
      }));
      setSchedulingMatch(null);
      alert('تم سحب المباراة بنجاح وعادت لقائمة بانتظار تحديد الموعد.');
    }
  };

  // --- RESULT RECORDING HANDLERS ---
  const handleOpenResultModal = (match: Match) => {
    setRecordingResultMatch(match);
    const sA = match.scoreA !== null ? match.scoreA : 0;
    const sB = match.scoreB !== null ? match.scoreB : 0;

    // Populate teamA and teamB scorers & assists from existing summary
    const parsedGoals = parseMatchScorers(match.scorersSummary || '', match.teamA, match.teamB);
    const parsedAssists = parseMatchAssists(match.scorersSummary || '', match.teamA, match.teamB);

    const initialScorersA = parsedGoals
      .filter(g => g.team === match.teamA)
      .map((g, idx) => ({ id: `ga_${idx}_${Date.now()}`, playerName: g.playerName, goals: g.count }));

    const initialAssistsA = parsedAssists
      .filter(a => a.team === match.teamA)
      .map((a, idx) => ({ id: `aa_${idx}_${Date.now()}`, playerName: a.playerName, assists: a.count }));

    const initialScorersB = parsedGoals
      .filter(g => g.team === match.teamB)
      .map((g, idx) => ({ id: `gb_${idx}_${Date.now()}`, playerName: g.playerName, goals: g.count }));

    const initialAssistsB = parsedAssists
      .filter(a => a.team === match.teamB)
      .map((a, idx) => ({ id: `ab_${idx}_${Date.now()}`, playerName: a.playerName, assists: a.count }));

    setTeamAScorers(initialScorersA);
    setTeamAAssists(initialAssistsA);
    setTeamBScorers(initialScorersB);
    setTeamBAssists(initialAssistsB);

    const totalGoalsA = initialScorersA.reduce((sum, s) => sum + (Number(s.goals) || 0), 0);
    const totalGoalsB = initialScorersB.reduce((sum, s) => sum + (Number(s.goals) || 0), 0);

    // If scorers already exist, use their sum; otherwise use existing match score
    const finalScoreA = initialScorersA.length > 0 ? totalGoalsA : sA;
    const finalScoreB = initialScorersB.length > 0 ? totalGoalsB : sB;

    setResultForm({
      scoreA: finalScoreA,
      scoreB: finalScoreB,
      status: match.status === 'live' ? 'live' : 'finished',
      minute: match.minute || 90,
      notes: match.scorersSummary || '',
    });

    setAutoSyncScore(true); // الوضع التلقائي مفعل دائماً ليتم احتساب النتيجة من أهداف اللاعبين
    setManualResultNotes('');
    setShowManualNotesInput(false);

    // Initialize substitutions and cards
    const existingSubs = match.substitutions || [];
    setTeamASubs(existingSubs.filter(s => s.team === match.teamA));
    setTeamBSubs(existingSubs.filter(s => s.team === match.teamB));

    const existingCards = match.cards || [];
    setTeamACards(existingCards.filter(c => c.team === match.teamA));
    setTeamBCards(existingCards.filter(c => c.team === match.teamB));

    setNewSubA({ minute: 60, playerOut: '', playerIn: '' });
    setNewSubB({ minute: 60, playerOut: '', playerIn: '' });
    setNewCardA({ minute: 45, playerName: '', cardType: 'yellow', reason: '' });
    setNewCardB({ minute: 45, playerName: '', cardType: 'yellow', reason: '' });
  };

  // Helper functions for per-team scorers & assists (مع التحديث الفوري للنتيجة)
  const handleAddScorer = (team: 'A' | 'B', defaultName = '', defaultGoals = 1) => {
    const newEntry: MatchScorerItem = {
      id: `sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      playerName: defaultName,
      goals: defaultGoals,
    };
    if (team === 'A') {
      setTeamAScorers(prev => {
        const next = [...prev, newEntry];
        if (autoSyncScore) {
          const sum = next.reduce((acc, curr) => acc + (Number(curr.goals) || 0), 0);
          setResultForm(rf => ({ ...rf, scoreA: sum }));
        }
        return next;
      });
    } else {
      setTeamBScorers(prev => {
        const next = [...prev, newEntry];
        if (autoSyncScore) {
          const sum = next.reduce((acc, curr) => acc + (Number(curr.goals) || 0), 0);
          setResultForm(rf => ({ ...rf, scoreB: sum }));
        }
        return next;
      });
    }
  };

  const handleUpdateScorer = (team: 'A' | 'B', id: string, playerName: string, goals: number) => {
    const validGoals = Math.max(0, Number(goals) || 0);
    if (team === 'A') {
      setTeamAScorers(prev => {
        const next = prev.map(item => (item.id === id ? { ...item, playerName, goals: validGoals } : item));
        if (autoSyncScore) {
          const sum = next.reduce((acc, curr) => acc + (Number(curr.goals) || 0), 0);
          setResultForm(rf => ({ ...rf, scoreA: sum }));
        }
        return next;
      });
    } else {
      setTeamBScorers(prev => {
        const next = prev.map(item => (item.id === id ? { ...item, playerName, goals: validGoals } : item));
        if (autoSyncScore) {
          const sum = next.reduce((acc, curr) => acc + (Number(curr.goals) || 0), 0);
          setResultForm(rf => ({ ...rf, scoreB: sum }));
        }
        return next;
      });
    }
  };

  const handleRemoveScorer = (team: 'A' | 'B', id: string) => {
    if (team === 'A') {
      setTeamAScorers(prev => {
        const next = prev.filter(item => item.id !== id);
        if (autoSyncScore) {
          const sum = next.reduce((acc, curr) => acc + (Number(curr.goals) || 0), 0);
          setResultForm(rf => ({ ...rf, scoreA: sum }));
        }
        return next;
      });
    } else {
      setTeamBScorers(prev => {
        const next = prev.filter(item => item.id !== id);
        if (autoSyncScore) {
          const sum = next.reduce((acc, curr) => acc + (Number(curr.goals) || 0), 0);
          setResultForm(rf => ({ ...rf, scoreB: sum }));
        }
        return next;
      });
    }
  };

  const handleAddAssist = (team: 'A' | 'B', defaultName = '', defaultAssists = 1) => {
    const newEntry: MatchAssistItem = {
      id: `as_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      playerName: defaultName,
      assists: defaultAssists,
    };
    if (team === 'A') setTeamAAssists(prev => [...prev, newEntry]);
    else setTeamBAssists(prev => [...prev, newEntry]);
  };

  const handleUpdateAssist = (team: 'A' | 'B', id: string, playerName: string, assists: number) => {
    const validAssists = Math.max(0, Number(assists) || 0);
    const updater = (prev: MatchAssistItem[]) =>
      prev.map(item => (item.id === id ? { ...item, playerName, assists: validAssists } : item));
    if (team === 'A') setTeamAAssists(updater);
    else setTeamBAssists(updater);
  };

  const handleRemoveAssist = (team: 'A' | 'B', id: string) => {
    if (team === 'A') setTeamAAssists(prev => prev.filter(item => item.id !== id));
    else setTeamBAssists(prev => prev.filter(item => item.id !== id));
  };

  // Helper functions for per-team substitutions (بحد أقصى 5 تبديلات لكل فريق)
  const handleAddSubInModal = (team: 'A' | 'B') => {
    if (!recordingResultMatch) return;
    if (team === 'A') {
      if (teamASubs.length >= MAX_SUBS_PER_TEAM) {
        alert(`وصل فريق ${recordingResultMatch.teamA} إلى الحد الأقصى للتبديلات (${MAX_SUBS_PER_TEAM} تبديلات فقط لكل فريق وفقاً للوائح).`);
        return;
      }
      if (!newSubA.playerOut.trim() || !newSubA.playerIn.trim()) {
        alert('يرجى اختيار أو كتابة اللاعب الخارج واللاعب البديل');
        return;
      }
      if (newSubA.playerOut.trim() === newSubA.playerIn.trim()) {
        alert('لا يمكن أن يكون اللاعب الخارج هو نفسه اللاعب البديل');
        return;
      }
      const sub: MatchSubstitution = {
        id: `sub_a_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        minute: Number(newSubA.minute) || 60,
        playerOut: newSubA.playerOut.trim(),
        playerIn: newSubA.playerIn.trim(),
        team: recordingResultMatch.teamA,
      };
      setTeamASubs(prev => [...prev, sub]);
      setNewSubA({ minute: 60, playerOut: '', playerIn: '' });
    } else {
      if (teamBSubs.length >= MAX_SUBS_PER_TEAM) {
        alert(`وصل فريق ${recordingResultMatch.teamB} إلى الحد الأقصى للتبديلات (${MAX_SUBS_PER_TEAM} تبديلات فقط لكل فريق وفقاً للوائح).`);
        return;
      }
      if (!newSubB.playerOut.trim() || !newSubB.playerIn.trim()) {
        alert('يرجى اختيار أو كتابة اللاعب الخارج واللاعب البديل');
        return;
      }
      if (newSubB.playerOut.trim() === newSubB.playerIn.trim()) {
        alert('لا يمكن أن يكون اللاعب الخارج هو نفسه اللاعب البديل');
        return;
      }
      const sub: MatchSubstitution = {
        id: `sub_b_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        minute: Number(newSubB.minute) || 60,
        playerOut: newSubB.playerOut.trim(),
        playerIn: newSubB.playerIn.trim(),
        team: recordingResultMatch.teamB,
      };
      setTeamBSubs(prev => [...prev, sub]);
      setNewSubB({ minute: 60, playerOut: '', playerIn: '' });
    }
  };

  const handleRemoveSubInModal = (team: 'A' | 'B', id: string) => {
    if (team === 'A') setTeamASubs(prev => prev.filter(s => s.id !== id));
    else setTeamBSubs(prev => prev.filter(s => s.id !== id));
  };

  // Helper functions for per-team cards (إنذارات وكروت حمراء وطرود)
  const handleAddCardInModal = (team: 'A' | 'B') => {
    if (!recordingResultMatch) return;
    if (team === 'A') {
      if (!newCardA.playerName.trim()) {
        alert('يرجى اختيار أو كتابة اسم اللاعب الحاصل على البطاقة');
        return;
      }
      let assignedType = newCardA.cardType;
      const existingYellow = teamACards.find(c => c.playerName.trim() === newCardA.playerName.trim() && c.cardType === 'yellow');
      if (existingYellow && newCardA.cardType === 'yellow') {
        assignedType = 'second_yellow';
        alert(`تنبيه: اللاعب ${newCardA.playerName} لديه إنذار أصفر سابق في هذه المباراة! تم قيد هذا الإنذار كـ "إنذار ثانٍ ثم طرد بالبطاقة الحمراء 🟨🟥"`);
      }
      const card: MatchCardEvent = {
        id: `card_a_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        minute: Number(newCardA.minute) || 45,
        playerName: newCardA.playerName.trim(),
        team: recordingResultMatch.teamA,
        cardType: assignedType,
        reason: newCardA.reason.trim() || undefined,
      };
      setTeamACards(prev => [...prev, card]);
      setNewCardA({ minute: 45, playerName: '', cardType: 'yellow', reason: '' });
    } else {
      if (!newCardB.playerName.trim()) {
        alert('يرجى اختيار أو كتابة اسم اللاعب الحاصل على البطاقة');
        return;
      }
      let assignedType = newCardB.cardType;
      const existingYellow = teamBCards.find(c => c.playerName.trim() === newCardB.playerName.trim() && c.cardType === 'yellow');
      if (existingYellow && newCardB.cardType === 'yellow') {
        assignedType = 'second_yellow';
        alert(`تنبيه: اللاعب ${newCardB.playerName} لديه إنذار أصفر سابق في هذه المباراة! تم قيد هذا الإنذار كـ "إنذار ثانٍ ثم طرد بالبطاقة الحمراء 🟨🟥"`);
      }
      const card: MatchCardEvent = {
        id: `card_b_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        minute: Number(newCardB.minute) || 45,
        playerName: newCardB.playerName.trim(),
        team: recordingResultMatch.teamB,
        cardType: assignedType,
        reason: newCardB.reason.trim() || undefined,
      };
      setTeamBCards(prev => [...prev, card]);
      setNewCardB({ minute: 45, playerName: '', cardType: 'yellow', reason: '' });
    }
  };

  const handleRemoveCardInModal = (team: 'A' | 'B', id: string) => {
    if (team === 'A') setTeamACards(prev => prev.filter(c => c.id !== id));
    else setTeamBCards(prev => prev.filter(c => c.id !== id));
  };

  const handleSaveMatchResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingResultMatch) return;

    // حساب مجموع أهداف كل فريق بالأسفل
    const totalGoalsA = teamAScorers.reduce((sum, s) => sum + (Number(s.goals) || 0), 0);
    const totalGoalsB = teamBScorers.reduce((sum, s) => sum + (Number(s.goals) || 0), 0);

    // عندما تكون المزامنة التلقائية مفعلة أو تم إدخال أهداف للاعبين، يتم اعتماد مجموع أهداف اللاعبين تلقائياً دون الحاجة لتغيير النتيجة يدوياً
    const sA = autoSyncScore ? totalGoalsA : Number(resultForm.scoreA);
    const sB = autoSyncScore ? totalGoalsB : Number(resultForm.scoreB);

    // Build the combined summary from structured per-team inputs
    const summary = buildMatchScorersSummary(
      recordingResultMatch.teamA,
      teamAScorers,
      teamAAssists,
      recordingResultMatch.teamB,
      teamBScorers,
      teamBAssists,
      manualResultNotes
    );

    setMatches(prev => prev.map(m => {
      if (m.id === recordingResultMatch.id) {
        return {
          ...m,
          scoreA: sA,
          scoreB: sB,
          status: resultForm.status,
          minute: resultForm.status === 'live' ? Number(resultForm.minute) : undefined,
          scorersSummary: summary.trim() || undefined,
          recordedBy: currentOperator.name,
          substitutions: [...teamASubs, ...teamBSubs],
          cards: [...teamACards, ...teamBCards],
        };
      }
      return m;
    }));

    // Dynamic Knockout Progression
    if (recordingResultMatch.stage === 'r32' && resultForm.status === 'finished' && sA !== sB) {
      const pair = R32_SEED_PAIRS[recordingResultMatch.id];
      if (pair) {
        const winnerName = sA > sB ? recordingResultMatch.teamA : recordingResultMatch.teamB;
        setMatches(prevMatches => prevMatches.map(m => {
          if (m.id === pair.nextMatchId) {
            return {
              ...m,
              [pair.nextSlot]: winnerName,
            };
          }
          return m;
        }));
      }
    }

    setRecordingResultMatch(null);
    confetti({ particleCount: 60, spread: 70 });
    alert('تم اعتماد نتيجة المباراة وتحديث أهداف وأسيستات الفريقين بنجاح! ⚽🎯');
  };

  // Save Team Edit (Single team name & group)
  const handleSaveTeamEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    const oldName = teams.find(t => t.id === editingTeam.id)?.name || editingTeam.name;
    const newName = editingTeam.name.trim();
    if (!newName) return;

    setTeams(prev => prev.map(t => t.id === editingTeam.id ? editingTeam : t));

    if (oldName !== newName) {
      setMatches(prev => prev.map(m => ({
        ...m,
        teamA: m.teamA === oldName ? newName : m.teamA,
        teamB: m.teamB === oldName ? newName : m.teamB,
      })));
    }

    setEditingTeam(null);
    confetti({ particleCount: 50, spread: 60 });
    alert('تم حفظ وتحديث بيانات الفريق بنجاح! ✨');
  };

  // Standings helper: dynamically computes stats from finished matches
  const getGroupStandings = (groupLetter: string) => {
    return teams
      .filter(t => t.group === groupLetter)
      .map(team => {
        const finishedTeamMatches = matches.filter(
          m => m.stage === 'group' && m.group === groupLetter && m.status === 'finished' &&
          (m.teamA === team.name || m.teamB === team.name) &&
          m.scoreA !== null && m.scoreB !== null
        );

        const played = finishedTeamMatches.length;
        let won = 0;
        let drawn = 0;
        let lost = 0;
        let gf = 0;
        let ga = 0;

        finishedTeamMatches.forEach(m => {
          const isA = m.teamA === team.name;
          const myScore = isA ? m.scoreA! : m.scoreB!;
          const oppScore = isA ? m.scoreB! : m.scoreA!;
          gf += myScore;
          ga += oppScore;
          if (myScore > oppScore) won++;
          else if (myScore === oppScore) drawn++;
          else lost++;
        });

        const gd = gf - ga;
        const points = won * 3 + drawn;

        return {
          ...team,
          played,
          won,
          drawn,
          lost,
          gf,
          ga,
          gd,
          points,
        };
      })
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.name.localeCompare(b.name, 'ar');
      });
  };

  // Helper for Round of 32 team names (no rigid group pairs; uses actual match teamA and teamB)
  const resolveR32MatchTeams = (match: Match) => {
    return {
      teamAName: match.teamA,
      teamBName: match.teamB,
      seedA: '',
      seedB: '',
      isProjected: false,
    };
  };

  // Helper to project matchup description (no rigid group pairings)
  const getProjectedR32Matchup = (_groupLetter: string, rank: number) => {
    if (rank <= 4) {
      return 'تأهل مؤكد لدور الـ 32 🏆 (المواجهة تحدد لاحقاً)';
    }
    return 'غير مؤهل لدور الـ 32';
  };

  // Add Match Handler
  const handleAddCustomMatch = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `custom_${Date.now()}`;
    const newM: Match = {
      id: newId,
      stage: newMatchForm.stage,
      stageName: newMatchForm.stageName,
      teamA: newMatchForm.teamA,
      teamB: newMatchForm.teamB,
      scoreA: null,
      scoreB: null,
      status: 'upcoming',
      date: newMatchForm.date,
      time: newMatchForm.time,
      pitch: newMatchForm.pitch,
      isScheduled: Boolean(newMatchForm.date), // Only scheduled if date entered
      recordedBy: currentOperator.name,
    };

    setMatches(prev => [newM, ...prev]);
    setIsAddingMatch(false);
    confetti({ particleCount: 50, spread: 60 });
    alert('تمت إضافة المباراة بنجاح! ⚽');
  };

  // Add Scorekeeper Handler
  const handleAddScorekeeper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScorekeeperForm.name || !newScorekeeperForm.studentId) return;

    const newSK: Scorekeeper = {
      id: `sk_${Date.now()}`,
      name: newScorekeeperForm.name,
      studentId: newScorekeeperForm.studentId,
      role: 'scorekeeper',
      assignedGroups: ['ALL'],
      active: true,
    };

    setScorekeepers(prev => [...prev, newSK]);
    setNewScorekeeperForm({ name: '', studentId: '', assignedGroups: 'ALL' });
    confetti({ particleCount: 40, spread: 60 });
    alert('تم تفويض مسؤول النتائج الجديد بنجاح!');
  };

  // Bulk Edit Handlers
  const handleOpenBulkEditModal = () => {
    const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const map: Record<string, string[]> = {};
    let fullTextLines: string[] = [];

    groups.forEach(grp => {
      const gTeams = teams.filter(t => t.group === grp);
      map[grp] = [];
      fullTextLines.push(`=== المجموعة ${grp} ===`);
      for (let i = 0; i < 6; i++) {
        const tName = gTeams[i]?.name || `فريق ${i + 1} (${grp})`;
        map[grp].push(tName);
        fullTextLines.push(`${i + 1}. ${tName}`);
      }
      fullTextLines.push('');
    });

    setBulkTeamsByGroup(map);
    setBulkTeamsText(fullTextLines.join('\n'));
    setBulkEditTab('by_group');
    setIsBulkEditingTeams(true);
  };

  const handleApplyPastedTeamsText = () => {
    const rawLines = bulkTeamsText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const cleanedNames: string[] = [];

    rawLines.forEach(line => {
      if (line.includes('===') || line.includes('المجموعة') || line.includes('Group')) return;
      let clean = line.replace(/^[0-9]+[\.\-\)\s]+/, '').trim();
      if (clean) cleanedNames.push(clean);
    });

    const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const newMap: Record<string, string[]> = {};
    let cursor = 0;

    groups.forEach(grp => {
      newMap[grp] = [];
      for (let i = 0; i < 6; i++) {
        if (cursor < cleanedNames.length) {
          newMap[grp].push(cleanedNames[cursor]);
          cursor++;
        } else {
          newMap[grp].push(`فريق ${i + 1} (${grp})`);
        }
      }
    });

    setBulkTeamsByGroup(newMap);
    setBulkEditTab('by_group');
  };

  const handleSaveBulkTeams = (updatedByGroup: Record<string, string[]>) => {
    const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const newTeams: Team[] = [];
    const renameMap: Record<string, string> = {};

    groups.forEach(grp => {
      const currentGTeams = teams.filter(t => t.group === grp);
      const newNames = updatedByGroup[grp] || [];

      for (let i = 0; i < 6; i++) {
        const existing = currentGTeams[i];
        const newName = (newNames[i] || '').trim() || (existing ? existing.name : `فريق ${i + 1} (${grp})`);
        const id = existing ? existing.id : `t_${grp.toLowerCase()}_${i + 1}`;
        const logoColor = existing ? existing.logoColor : 'from-emerald-600 to-teal-500';

        if (existing && existing.name !== newName) {
          renameMap[existing.name] = newName;
        }

        newTeams.push({
          id,
          name: newName,
          group: grp,
          played: existing ? existing.played : 0,
          won: existing ? existing.won : 0,
          drawn: existing ? existing.drawn : 0,
          lost: existing ? existing.lost : 0,
          gf: existing ? existing.gf : 0,
          ga: existing ? existing.ga : 0,
          gd: existing ? existing.gd : 0,
          points: existing ? existing.points : 0,
          logoColor,
        });
      }
    });

    setTeams(newTeams);

    if (Object.keys(renameMap).length > 0) {
      setMatches(prev => prev.map(m => ({
        ...m,
        teamA: renameMap[m.teamA] || m.teamA,
        teamB: renameMap[m.teamB] || m.teamB,
      })));
    }

    setIsBulkEditingTeams(false);
    confetti({ particleCount: 60, spread: 70 });
    alert('تم حفظ وتحديث أسماء الفرق والجدول بالكامل! 🏆');
  };

  // User Management & Security Handlers
  const handleUpdateUserRole = (userId: string, newRole: UserRole, teamName?: string) => {
    setUsers(prev => {
      const updated = prev.map(u => {
        // PERMANENT ADMIN PROTECTION: s.mohamed2442@nu.edu.eg cannot be altered or demoted
        if (u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
          return { ...u, role: 'admin' as UserRole, isPermanentAdmin: true };
        }
        if (u.id === userId) {
          return {
            ...u,
            role: newRole,
            managedTeamName: newRole === 'team_manager' ? teamName : undefined,
            playerTeamName: newRole === 'player' ? teamName : undefined,
          };
        }
        return u;
      });
      saveStoredUsers(updated);
      return updated;
    });

    if (currentUser && currentUser.id === userId && currentUser.email.toLowerCase() !== PERMANENT_ADMIN_EMAIL.toLowerCase()) {
      setCurrentUser(prev => {
        if (!prev) return null;
        const next: AppUser = {
          ...prev,
          role: newRole,
          managedTeamName: newRole === 'team_manager' ? teamName : undefined,
          playerTeamName: newRole === 'player' ? teamName : undefined,
        };
        saveActiveUser(next);
        return next;
      });
    }
  };

  const handleUpdateUser = (updatedUser: AppUser) => {
    if (updatedUser.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) return;
    setUsers(prev => {
      const next = prev.map(u => u.id === updatedUser.id ? updatedUser : u);
      saveStoredUsers(next);
      return next;
    });
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
      saveActiveUser(updatedUser);
    }
  };

  const handleAddUser = (newUser: AppUser) => {
    setUsers(prev => {
      const next = [newUser, ...prev];
      saveStoredUsers(next);
      return next;
    });
  };

  const handleDeleteUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target?.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) return;
    setUsers(prev => {
      const next = prev.filter(u => u.id !== userId);
      saveStoredUsers(next);
      return next;
    });
  };

  const handleLogin = (user: AppUser) => {
    setCurrentUser(user);
    saveActiveUser(user);
    if (user.role === 'team_manager') {
      setCurrentTab('team_manager');
    } else if (user.role === 'admin') {
      setCurrentTab('matches_control');
    } else {
      setCurrentTab('spectator_portal');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    saveActiveUser(null);
    setAuthView('login');
  };

  // Filtered Matches based on Schedule status & filters
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      // 1. Schedule Status filter (scheduled vs unscheduled vs all)
      if (matchScheduleTab === 'scheduled' && !m.isScheduled) return false;
      if (matchScheduleTab === 'unscheduled' && m.isScheduled) return false;

      // 2. Status filter
      if (matchFilterStatus !== 'all' && m.status !== matchFilterStatus) return false;

      // 3. Stage filter
      if (matchStageFilter === 'group' && m.stage !== 'group') return false;
      if (matchStageFilter === 'r32' && m.stage !== 'r32') return false;
      if (matchStageFilter === 'r16' && m.stage !== 'r16') return false;
      if (matchStageFilter === 'finals' && !['qf', 'sf', 'final'].includes(m.stage)) return false;

      // 4. Group stage round filter
      if (groupStageRoundFilter !== 'all' && m.round !== groupStageRoundFilter) return false;

      // 5. Group stage letter filter
      if (groupStageLetterFilter !== 'all' && m.group !== groupStageLetterFilter) return false;

      // 6. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const a = m.teamA.toLowerCase();
        const b = m.teamB.toLowerCase();
        const s = m.stageName.toLowerCase();
        if (!a.includes(q) && !b.includes(q) && !s.includes(q)) return false;
      }

      return true;
    });
  }, [matches, matchScheduleTab, matchFilterStatus, matchStageFilter, groupStageRoundFilter, groupStageLetterFilter, searchQuery]);

  const scheduledMatchesCount = useMemo(() => matches.filter(m => m.isScheduled).length, [matches]);
  const unscheduledMatchesCount = useMemo(() => matches.filter(m => !m.isScheduled).length, [matches]);

  // LOCKED APP / AUTH GATE: Must log in first to access tournament
  if (!currentUser) {
    if (authView === 'signup') {
      return (
        <SignupPage
          users={users}
          teams={teams.map(t => ({ name: t.name, group: t.group }))}
          onRegister={(newUser) => {
            handleAddUser(newUser);
            handleLogin(newUser);
          }}
          onNavigateToLogin={() => setAuthView('login')}
        />
      );
    }

    return (
      <LoginPage
        users={users}
        onLogin={handleLogin}
        onNavigateToSignup={() => setAuthView('signup')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white" dir="rtl">
      
      {/* Top Header / App Navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-emerald-950/80 px-4 md:px-8 py-3.5 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          
          {/* Top Bar: Logo & Active User Profile Widget */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Logo & Main Title */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/20 shrink-0">
                <Trophy className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-black text-lg md:text-xl text-white tracking-wide">
                    دوري جامعة النيل 2026
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                    48 فريقاً • 8 مجموعات
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono">
                    @nu.edu.eg
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  بوابة المتفرجين • بوابة مسؤولي الفرق • دليل المستخدمين والصلاحيات • تحكم الأدمن
                </p>
              </div>
            </div>

            {/* Active User Account & Auth Widget */}
            <div className="flex items-center gap-2 self-stretch md:self-auto justify-between md:justify-end bg-slate-900/90 p-1.5 md:p-2 rounded-2xl border border-slate-800 shadow-md">
              <div className="flex items-center gap-2.5 pr-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shadow-inner shrink-0 ${
                  currentUser.isPermanentAdmin || currentUser.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()
                    ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 ring-2 ring-amber-400/40'
                    : currentUser.role === 'admin'
                    ? 'bg-purple-600 text-white'
                    : currentUser.role === 'team_manager'
                    ? 'bg-emerald-600 text-white'
                    : currentUser.role === 'player'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}>
                  {currentUser.isPermanentAdmin || currentUser.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase() ? (
                    <Crown className="w-4 h-4 text-slate-950" />
                  ) : (
                    currentUser.name.charAt(0)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white line-clamp-1">{currentUser.name}</span>
                    {currentUser.isPermanentAdmin || currentUser.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase() ? (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black border border-amber-500/40 flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5 text-amber-400" />
                        أدمن دائم 👑
                      </span>
                    ) : currentUser.role === 'admin' ? (
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-bold border border-purple-500/30">
                        أدمن 🛡️
                      </span>
                    ) : currentUser.role === 'team_manager' ? (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                        مسؤول {currentUser.managedTeamName || 'فريق'} 📋
                      </span>
                    ) : currentUser.role === 'player' ? (
                      <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[9px] font-bold border border-blue-500/30">
                        لاعب ⚽
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px] font-bold">
                        متفرج 👁️
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {currentUser.email}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 border-r border-slate-800 pr-2">
                {/* Logout button */}
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer border border-red-500/20 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  title="تسجيل الخروج وقفل النظام"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            {/* Tab 1: Spectators & Players Portal */}
            <button
              onClick={() => setCurrentTab('spectator_portal')}
              className={`px-3 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'spectator_portal'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30 font-black'
                  : 'bg-slate-900/80 text-sky-300 hover:bg-slate-800 border border-sky-500/30'
              }`}
            >
              <Eye className="w-4 h-4 text-sky-400" />
              صفحة المتفرجين واللاعبين 👁️
            </button>

            {/* Tab 2: Team Manager Portal */}
            <button
              onClick={() => setCurrentTab('team_manager')}
              className={`px-3 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'team_manager'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/30 font-black'
                  : 'bg-slate-900/80 text-emerald-300 hover:bg-slate-800 border border-emerald-500/30'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              صفحة مسؤول كل فرقة 📋
            </button>

            {/* Tab 3: Users Directory & Roles (المستخدمين والأعضاء) */}
            <button
              onClick={() => setCurrentTab('users_directory')}
              className={`px-3 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'users_directory'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 font-black'
                  : 'bg-slate-900/80 text-purple-300 hover:bg-slate-800 border border-purple-500/30'
              }`}
            >
              <Users className="w-4 h-4 text-purple-400" />
              دليل المستخدمين والصلاحيات 👥 ({users.length})
            </button>

            <button
              onClick={() => setCurrentTab('matches_control')}
              className={`px-3 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'matches_control'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              الجدول والمواعيد ({scheduledMatchesCount})
            </button>

            <button
              onClick={() => setCurrentTab('groups')}
              className={`px-3 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'groups'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              المجموعات (32 فريق)
            </button>

            <button
              onClick={() => setCurrentTab('bracket')}
              className={`px-3 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'bracket'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Swords className="w-4 h-4" />
              شجرة البطولة
            </button>

            <button
              onClick={() => setCurrentTab('teams_roster')}
              className={`px-3 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'teams_roster'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-900/80 text-blue-300 hover:bg-slate-800 border border-blue-500/30'
              }`}
            >
              <Users className="w-4 h-4 text-blue-400" />
              الفرق واللاعبين
            </button>

            <button
              onClick={() => setCurrentTab('stats_leaders')}
              className={`px-3 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'stats_leaders' || (currentTab as string) === 'top_scorers'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                  : 'bg-slate-900/80 text-amber-300 hover:bg-slate-800 border border-amber-500/30'
              }`}
            >
              <Target className="w-4 h-4 text-amber-400" />
              الهداف والصانع ({tournamentStatsData.scorers.length + tournamentStatsData.playmakers.length})
            </button>

            <button
              onClick={() => setCurrentTab('manage')}
              className={`px-3 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'manage'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                  : 'bg-slate-900/80 text-amber-400 border border-amber-500/30 hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              لوحة التحكم (Admin) ⚡
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">

        {/* ========================================================================= */}
        {/* TAB: SPECTATORS & PLAYERS PORTAL (صفحة المتفرجين واللاعبين لمعرفة الماتشات) */}
        {/* ========================================================================= */}
        {currentTab === 'spectator_portal' && (
          <SpectatorPortalPage
            matches={matches}
            teams={teams}
            squads={squads}
            onSelectTeamForSquadView={(teamName) => {
              setCurrentTab('teams_roster');
            }}
            onSelectTeamForMatches={(teamName) => {
              setSelectedTeamNameForMatches(teamName);
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB: TEAM MANAGER PORTAL (صفحة مسؤول كل فرقة لإضافة وتعديل اللاعبين) */}
        {/* ========================================================================= */}
        {currentTab === 'team_manager' && (
          <TeamManagerPortalPage
            teams={teams}
            matches={matches}
            squads={squads}
            onUpdateSquads={setSquads}
            onUpdateMatchLineups={handleUpdateMatchLineups}
            isAdmin={currentUser.role === 'admin'}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB: USERS & PERMISSIONS DIRECTORY (دليل المستخدمين واللاعبين والمتفرجين) */}
        {/* ========================================================================= */}
        {currentTab === 'users_directory' && (
          <UsersDirectoryPage
            users={users}
            currentUser={currentUser}
            teams={teams}
            onUpdateUserRole={handleUpdateUserRole}
            onUpdateUser={handleUpdateUser}
            onAddUser={handleAddUser}
            onDeleteUser={handleDeleteUser}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 1: MATCHES & SCHEDULING CONTROL */}
        {/* ========================================================================= */}
        {currentTab === 'matches_control' && (
          <div className="space-y-6">
            
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-[#062411] to-slate-900 border border-emerald-500/30 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-2">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  التحكم في مواعيد وتنزيل المباريات وتسجيل النتائج
                </div>
                <h2 className="text-xl md:text-3xl font-black text-white mb-2">
                  جدول المباريات: لا ينزل أي ماتش إلا بعد تحديد موعده وملعبه
                </h2>
                <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  يمكنك مراجعة المباريات غير المجدولة، وتحديد تاريخ وساعة وملعب كل مباراة لتنزل رسمياً في الجدول، وتسجيل النتائج المباشرة والنهائية وتحديث الترتيب فوراً.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  onClick={() => handleOpenRoundOrganizer(groupStageLetterFilter === 'all' ? 'A' : groupStageLetterFilter, typeof groupStageRoundFilter === 'number' ? groupStageRoundFilter : 1, matchStageFilter === 'r32' ? 'r32' : 'group')}
                  className="px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs md:text-sm shadow-xl shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer"
                  title="تحديد مواجهات كل جولة ودور واختيار مين هيلاعب مين"
                >
                  <Swords className="w-4 h-4" />
                  <span>تحديد مواجهات الجولات (مين هيلاعب مين)</span>
                </button>
                <button
                  onClick={handleResetAllMatches}
                  className="px-4 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 hover:border-rose-600 font-bold text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg"
                  title="تصفير كل الماتشات والنتائج وإعادة النقاط لصفر"
                >
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                  صفر كل الماتشات
                </button>
                <button
                  onClick={() => setIsAddingMatch(true)}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs md:text-sm shadow-xl shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  إضافة مباراة مخصصة
                </button>
              </div>
            </div>

            {/* Main Scheduling Filter Segment (المباريات المنشورة vs بانتظار تحديد الموعد) */}
            <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setMatchScheduleTab('scheduled')}
                  className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    matchScheduleTab === 'scheduled'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 font-black'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>المباريات المنشورة والمحددة الموعد</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-xs border border-emerald-500/30">
                    {scheduledMatchesCount}
                  </span>
                </button>

                <button
                  onClick={() => setMatchScheduleTab('unscheduled')}
                  className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    matchScheduleTab === 'unscheduled'
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 font-black'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>مباريات بانتظار تحديد الموعد</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 text-xs border border-amber-500/30">
                    {unscheduledMatchesCount}
                  </span>
                </button>

                <button
                  onClick={() => setMatchScheduleTab('all')}
                  className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    matchScheduleTab === 'all'
                      ? 'bg-slate-700 text-white shadow font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>جميع المباريات ({matches.length})</span>
                </button>
              </div>

              {/* Status overview chip */}
              <div className="text-xs text-slate-400 font-mono px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800">
                المعروض حالياً: <strong className="text-white">{filteredMatches.length}</strong> مباراة
              </div>
            </div>

            {/* Secondary Filter & Search Bar */}
            <div className="space-y-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-400 font-bold ml-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-emerald-400" />
                    المرحلة:
                  </span>
                  {[
                    { id: 'all', label: 'جميع المراحل' },
                    { id: 'group', label: 'دور المجموعات' },
                    { id: 'r32', label: 'دور الـ 32' },
                    { id: 'r16', label: 'دور الـ 16' },
                    { id: 'finals', label: 'الأدوار النهائية 🏆' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setMatchStageFilter(st.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        matchStageFilter === st.id
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="ابحث عن اسم أي فرقة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 pr-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Sub-Filters for Group Stage */}
              {matchStageFilter === 'group' && (
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-slate-400 font-bold ml-1">المجموعة:</span>
                    <button
                      onClick={() => setGroupStageLetterFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        groupStageLetterFilter === 'all' ? 'bg-teal-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      كل المجموعات
                    </button>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(g => (
                      <button
                        key={g}
                        onClick={() => setGroupStageLetterFilter(g)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                          groupStageLetterFilter === g ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-slate-400 font-bold ml-1">الجولة:</span>
                    <button
                      onClick={() => setGroupStageRoundFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        groupStageRoundFilter === 'all' ? 'bg-teal-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      كل الجولات
                    </button>
                    {[1, 2, 3, 4, 5].map(r => (
                      <button
                        key={r}
                        onClick={() => setGroupStageRoundFilter(r)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                          groupStageRoundFilter === r ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                    <button
                      onClick={() => handleOpenRoundOrganizer(groupStageLetterFilter === 'all' ? 'A' : groupStageLetterFilter, typeof groupStageRoundFilter === 'number' ? groupStageRoundFilter : 1, 'group')}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold border border-amber-500/30 text-xs flex items-center gap-1 transition-all cursor-pointer mr-2"
                      title="تنظيم وتحديد مين هيلاعب مين في هذه الجولة"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>تحديد مواجهات الجولة</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Empty State when in 'scheduled' tab and no matches are scheduled yet */}
            {matchScheduleTab === 'scheduled' && scheduledMatchesCount === 0 && (
              <div className="text-center py-14 px-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                  <Calendar className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-white">لم يتم تنزيل أي مباريات في الجدول الرسمي بعد</h3>
                <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                  وفقاً لتوجيهاتكم، لا ينزل أي ماتش في جدول المباريات حتى تقوم بتحديد موعده وملعبه يدوياً.
                  اضغط على تبويب <strong className="text-amber-400">«مباريات بانتظار تحديد الموعد»</strong> لاختيار أي مباراة وتحديد تاريخها وساعتها لتنزل فوراً!
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setMatchScheduleTab('unscheduled')}
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs md:text-sm shadow-xl shadow-emerald-600/30 hover:scale-105 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    الانتقال للمباريات وتحديد مواعيدها الآن ({unscheduledMatchesCount} ماتش)
                  </button>
                </div>
              </div>
            )}

            {/* Matches Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMatches.map((match) => {
                const r32Info = match.stage === 'r32' ? resolveR32MatchTeams(match) : null;
                const displayTeamA = r32Info ? r32Info.teamAName : match.teamA;
                const displayTeamB = r32Info ? r32Info.teamBName : match.teamB;

                return (
                  <div
                    key={match.id}
                    className={`rounded-2xl border transition-all p-4 flex flex-col justify-between gap-3 shadow-lg ${
                      match.status === 'live'
                        ? 'bg-rose-950/20 border-rose-500/50 ring-1 ring-rose-500/30'
                        : match.status === 'finished'
                        ? 'bg-slate-900/90 border-slate-800'
                        : match.isScheduled
                        ? 'bg-slate-900/90 border-emerald-500/30'
                        : 'bg-slate-950 border-slate-800/80 opacity-90'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 text-[11px] font-bold border border-emerald-500/20">
                          {match.stage === 'group' ? `الجولة ${match.round || 1}` : match.stageName}
                        </span>
                        {match.group && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-bold">
                            المجموعة {match.group}
                          </span>
                        )}
                      </div>

                      {/* Schedule Badge / Status Badge */}
                      {match.isScheduled ? (
                        <div className="flex items-center gap-1 text-[11px]">
                          {match.status === 'finished' ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                              انتهت FT
                            </span>
                          ) : match.status === 'live' ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30 animate-pulse">
                              مباشر د{match.minute || 90}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                              محددة في الجدول
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-bold border border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          لم يُحدد الموعد بعد
                        </span>
                      )}
                    </div>

                    {/* Date, Time & Pitch (or Unscheduled Hint) */}
                    <div className="text-[11px] flex items-center justify-between text-slate-400 font-mono">
                      {match.isScheduled ? (
                        <>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-emerald-400" />
                            {match.date} • {match.time}
                          </span>
                          <span className="flex items-center gap-1 truncate max-w-[130px]">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {match.pitch}
                          </span>
                        </>
                      ) : (
                        <span className="text-amber-400/80 text-[11px] flex items-center gap-1 font-sans">
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          بانتظار تحديد موعد وملعب المباراة
                        </span>
                      )}
                    </div>

                    {/* Teams & Score Box */}
                    <div className="py-2.5 flex items-center justify-between px-1 bg-slate-950/60 rounded-xl border border-slate-800/60">
                      {/* Team A */}
                      <div className="flex-1 text-center font-bold text-white text-xs md:text-sm">
                        <button
                          onClick={() => setSelectedTeamNameForMatches(displayTeamA)}
                          className="hover:text-emerald-300 transition-colors cursor-pointer truncate max-w-full hover:underline font-bold inline-block"
                          title={`اضغط لعرض مباريات ${displayTeamA}`}
                        >
                          {displayTeamA}
                        </button>
                        {r32Info && (
                          <span className="block mt-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 mx-auto w-fit">
                            {r32Info.seedA}
                          </span>
                        )}
                      </div>

                      {/* Score or VS */}
                      <div className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-center min-w-[75px] shadow-inner mx-2">
                        {match.scoreA !== null && match.scoreB !== null ? (
                          <span className="font-mono text-lg font-black text-emerald-400">
                            {match.scoreA} - {match.scoreB}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono font-bold">VS</span>
                        )}
                      </div>

                      {/* Team B */}
                      <div className="flex-1 text-center font-bold text-white text-xs md:text-sm">
                        <button
                          onClick={() => setSelectedTeamNameForMatches(displayTeamB)}
                          className="hover:text-emerald-300 transition-colors cursor-pointer truncate max-w-full hover:underline font-bold inline-block"
                          title={`اضغط لعرض مباريات ${displayTeamB}`}
                        >
                          {displayTeamB}
                        </button>
                        {r32Info && (
                          <span className="block mt-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 mx-auto w-fit">
                            {r32Info.seedB}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Scorers / Notes summary (if any) */}
                    {match.scorersSummary && (
                      <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800/60 text-[11px] text-slate-300">
                        <span className="text-amber-400 font-bold block mb-0.5">⚽ ملاحظات / مسجلو الأهداف:</span>
                        <span>{match.scorersSummary}</span>
                      </div>
                    )}

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenScheduleModal(match)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            match.isScheduled
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                              : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black shadow-md shadow-amber-500/20'
                          }`}
                          title={match.isScheduled ? 'تعديل تاريخ وملعب المباراة' : 'تحديد الموعد والملعب وتنزيل المباراة في الجدول'}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{match.isScheduled ? 'تعديل الميعاد' : 'تحديد الميعاد وتنزيل الماتش'}</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditMatchup(match)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="تعديل طرفي المباراة واختيار مين هيلاعب مين"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                          <span className="hidden sm:inline">مين هيلاعب مين</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenResultModal(match)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                          title="تسجيل أو تعديل نتيجة المباراة"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{match.status === 'finished' ? 'تعديل النتيجة' : 'تسجيل النتيجة'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Substitutions & Cards badges on match card */}
                    {((match.substitutions && match.substitutions.length > 0) || (match.cards && match.cards.length > 0)) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-800/60 text-[10px]">
                        {match.substitutions && match.substitutions.length > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1 font-mono">
                            <ArrowRightLeft className="w-3 h-3 text-emerald-400" />
                            <span>{match.substitutions.length} تبديل</span>
                          </span>
                        )}
                        {match.cards && match.cards.filter(c => c.cardType === 'yellow').length > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1 font-mono font-bold">
                            <span>🟨</span>
                            <span>{match.cards.filter(c => c.cardType === 'yellow').length} إنذار</span>
                          </span>
                        )}
                        {match.cards && match.cards.filter(c => c.cardType === 'red' || c.cardType === 'second_yellow').length > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1 font-mono font-bold">
                            <span>🟥</span>
                            <span>{match.cards.filter(c => c.cardType === 'red' || c.cardType === 'second_yellow').length} طرد</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: GROUPS (48 TEAMS & QUALIFICATION TO ROUND OF 32) */}
        {/* ========================================================================= */}
        {currentTab === 'groups' && (
          <div className="space-y-6">
            {/* Qualification Rules Announcement Banner */}
            <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/30 p-6 rounded-3xl shadow-2xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-2">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>النظام الرسمي للبطولة المعتمد</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                    <span>جدول المجموعات ونظام التأهل لدور الـ 32</span>
                  </h2>
                  <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    يصعد <strong className="text-emerald-300">أول 4 فرق من كل مجموعة</strong> (من المجموعة A وحتى H) مباشرة إلى <strong className="text-amber-300">دور الـ 32 الإقصائي</strong> (إجمالي 32 فريقاً متأهلاً). ويغادر المركزان الخامس والسادس المسابقة.
                  </p>
                </div>

                {/* Switch between Single Group Table, 5-Round Fixtures, and All 32 Qualified Teams View */}
                <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 self-start md:self-auto">
                  <button
                    onClick={() => setGroupsViewMode('table')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      groupsViewMode === 'table'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    جدول الترتيب
                  </button>
                  <button
                    onClick={() => setGroupsViewMode('fixtures')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      groupsViewMode === 'fixtures'
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    مباريات المجموعة (5 جولات)
                  </button>
                  <button
                    onClick={() => setGroupsViewMode('qualified_32')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      groupsViewMode === 'qualified_32'
                        ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    المتأهلون الـ 32 (الكل)
                  </button>
                </div>
              </div>

              {/* Tournament Metric Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">مباريات كل فريق</span>
                  <strong className="text-base font-black text-white">5 مباريات (15 بالمجموعة)</strong>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">المباريات المنشورة</span>
                  <strong className="text-base font-black text-emerald-400">{scheduledMatchesCount} من أصل 120</strong>
                </div>
                <div className="bg-emerald-950/30 p-3 rounded-2xl border border-emerald-500/20">
                  <span className="text-[11px] text-emerald-300 block font-medium">المتأهلون لدور الـ 32</span>
                  <strong className="text-base font-black text-amber-400">32 فريقاً (أول 4 من كل م.)</strong>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block font-medium">أدوار البطولة الإقصائية</span>
                  <strong className="text-base font-black text-teal-300">من دور 32 حتى النهائي 🏆</strong>
                </div>
              </div>
            </div>

            {/* MODE 1: SINGLE GROUP STANDINGS TABLE */}
            {groupsViewMode === 'table' && (
              <div className="space-y-4">
                {/* Group Selector Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">اختر المجموعة:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(grp => (
                        <button
                          key={grp}
                          onClick={() => setSelectedGroup(grp)}
                          className={`w-9 h-9 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                            selectedGroup === grp
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400'
                              : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {grp}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                      <span className="text-slate-300 font-bold">المراكز 1-4: صعود لدور الـ 32</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <span className="text-slate-400">المراكز 5-6: إقصاء</span>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                      <h3 className="font-black text-white text-base">ترتيب المجموعة {selectedGroup}</h3>
                      <span className="text-xs text-slate-400">(6 فرق تتنافس على 4 بطاقات صعود)</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      يصعد أول 4 إلى دور الـ 32
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs md:text-sm">
                      <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px]">
                        <tr>
                          <th className="py-3 px-4 text-center">المركز</th>
                          <th className="py-3 px-4">الفريق (اضغط لعرض مبارياته)</th>
                          <th className="py-3 px-3">حالة التأهل لدور الـ 32</th>
                          <th className="py-3 px-3 text-center">لعب</th>
                          <th className="py-3 px-3 text-center">فاز</th>
                          <th className="py-3 px-3 text-center">تعادل</th>
                          <th className="py-3 px-3 text-center">خسر</th>
                          <th className="py-3 px-3 text-center">له</th>
                          <th className="py-3 px-3 text-center">عليه</th>
                          <th className="py-3 px-3 text-center">الفارق</th>
                          <th className="py-3 px-4 text-center font-black text-emerald-400">النقاط</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {getGroupStandings(selectedGroup).map((team, idx) => {
                          const isQualified = idx < 4;
                          const rank = idx + 1;
                          const projectedMatchup = getProjectedR32Matchup(selectedGroup, rank);

                          return (
                            <tr
                              key={team.id}
                              className={`transition-colors ${
                                isQualified
                                  ? 'bg-emerald-950/10 hover:bg-emerald-950/25 border-r-4 border-r-emerald-500'
                                  : 'hover:bg-slate-800/30 border-r-4 border-r-rose-900/40 opacity-80'
                              }`}
                            >
                              {/* Rank */}
                              <td className="py-3.5 px-4 text-center">
                                <span
                                  className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs ${
                                    isQualified
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {rank}
                                </span>
                              </td>

                              {/* Team Name */}
                              <td className="py-3.5 px-4 font-bold text-white">
                                <button
                                  onClick={() => setSelectedTeamNameForMatches(team.name)}
                                  className="flex items-center gap-2 text-right hover:text-emerald-300 transition-colors cursor-pointer group"
                                  title="اضغط لعرض جميع مباريات هذا الفريق (5 مباريات)"
                                >
                                  <div className={`w-6 h-6 rounded-md bg-gradient-to-tr ${team.logoColor} flex items-center justify-center font-black text-[10px] text-white shrink-0 group-hover:scale-110 transition-transform`}>
                                    {team.name.charAt(0)}
                                  </div>
                                  <span className="group-hover:underline underline-offset-4">{team.name}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 border border-slate-700 flex items-center gap-1 transition-colors">
                                    <Eye className="w-3 h-3" />
                                    الماتشات
                                  </span>
                                  {isQualified && (
                                    <span className="text-[10px] text-amber-400 font-normal">
                                      {rank === 1 && '🥇'}
                                      {rank === 2 && '🥈'}
                                      {rank === 3 && '🥉'}
                                      {rank === 4 && '⭐'}
                                    </span>
                                  )}
                                </button>
                              </td>

                              {/* Qualification Badge & Projected Matchup */}
                              <td className="py-3.5 px-3">
                                {isQualified ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-black border border-emerald-500/40">
                                      <Check className="w-3 h-3" />
                                      صعود لدور الـ 32
                                    </span>
                                    <div className="text-[10px] text-slate-400 font-medium">
                                      {projectedMatchup}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-500">
                                    مغادرة البطولة
                                  </span>
                                )}
                              </td>

                              {/* Standings Numbers */}
                              <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-200">{team.played}</td>
                              <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-400">{team.won}</td>
                              <td className="py-3.5 px-3 text-center font-mono font-bold text-amber-400">{team.drawn}</td>
                              <td className="py-3.5 px-3 text-center font-mono font-bold text-rose-400">{team.lost}</td>
                              <td className="py-3.5 px-3 text-center font-mono text-slate-300">{team.gf}</td>
                              <td className="py-3.5 px-3 text-center font-mono text-slate-400">{team.ga}</td>
                              <td className={`py-3.5 px-3 text-center font-mono font-bold ${team.gd > 0 ? 'text-emerald-400' : team.gd < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                {team.gd > 0 ? `+${team.gd}` : team.gd}
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono font-black text-base text-amber-400 bg-slate-950/40">
                                {team.points}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 2: 5-ROUNDS GROUP FIXTURES */}
            {groupsViewMode === 'fixtures' && (
              <div className="space-y-4">
                {/* Group Selector Bar */}
                <div className="flex items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">اختر المجموعة:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(grp => (
                        <button
                          key={grp}
                          onClick={() => setSelectedGroup(grp)}
                          className={`w-9 h-9 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                            selectedGroup === grp
                              ? 'bg-teal-600 text-white shadow-lg ring-2 ring-teal-400'
                              : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                          }`}
                        >
                          {grp}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 5 Rounds List */}
                <div className="space-y-5">
                  {[1, 2, 3, 4, 5].map(roundNum => {
                    const roundMatches = matches.filter(
                      m => m.stage === 'group' && m.group === selectedGroup && m.round === roundNum
                    );

                    return (
                      <div key={roundNum} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                              {roundNum}
                            </span>
                            <h3 className="font-black text-white text-sm md:text-base">
                              الجولة {roundNum} • المجموعة {selectedGroup}
                            </h3>
                            <span className="text-xs text-slate-400">(3 مباريات يخوض فيها كل فريق مباراته رقم {roundNum})</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {roundMatches.map(m => (
                            <div key={m.id} className="bg-slate-950/80 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-3.5 space-y-2.5 transition-all">
                              <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/60 pb-1.5">
                                {m.isScheduled ? (
                                  <span className="flex items-center gap-1 font-mono text-emerald-400">
                                    <Clock className="w-3 h-3" />
                                    {m.date} • {m.time}
                                  </span>
                                ) : (
                                  <span className="text-amber-400 text-[10px] font-bold">
                                    لم يُحدد الموعد بعد
                                  </span>
                                )}
                                <div>
                                  {m.status === 'finished' ? (
                                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px]">
                                      انتهت FT
                                    </span>
                                  ) : m.status === 'live' ? (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold text-[10px] animate-pulse">
                                      مباشر ({m.minute}')
                                    </span>
                                  ) : m.isScheduled ? (
                                    <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-bold text-[10px]">
                                      مجدولة
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleOpenScheduleModal(m)}
                                      className="px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-[10px] border border-amber-500/30 cursor-pointer transition-colors"
                                    >
                                      تحديد الميعاد
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="py-1 space-y-1">
                                <div className="flex items-center justify-between text-xs font-bold text-white">
                                  <button
                                    onClick={() => setSelectedTeamNameForMatches(m.teamA)}
                                    className="truncate hover:text-emerald-300 transition-colors cursor-pointer hover:underline text-right"
                                    title={`اضغط لعرض مباريات ${m.teamA}`}
                                  >
                                    {m.teamA}
                                  </button>
                                  <span className="font-mono text-emerald-400 text-sm">{m.scoreA !== null ? m.scoreA : '-'}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold text-white">
                                  <button
                                    onClick={() => setSelectedTeamNameForMatches(m.teamB)}
                                    className="truncate hover:text-emerald-300 transition-colors cursor-pointer hover:underline text-right"
                                    title={`اضغط لعرض مباريات ${m.teamB}`}
                                  >
                                    {m.teamB}
                                  </button>
                                  <span className="font-mono text-emerald-400 text-sm">{m.scoreB !== null ? m.scoreB : '-'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MODE 3: ALL 32 QUALIFIED TEAMS VIEW */}
            {groupsViewMode === 'qualified_32' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(grp => {
                    const standings = getGroupStandings(grp);
                    const qualified = standings.slice(0, 4);

                    return (
                      <div key={grp} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <strong className="text-sm font-black text-white">المجموعة {grp}</strong>
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            4 متأهلين
                          </span>
                        </div>

                        <div className="space-y-2">
                          {qualified.map((team, idx) => {
                            const rank = idx + 1;
                            const badgeColor =
                              rank === 1 ? 'text-amber-300 border-amber-500/40 bg-amber-500/10' :
                              rank === 2 ? 'text-slate-200 border-slate-500/40 bg-slate-500/10' :
                              rank === 3 ? 'text-amber-500 border-amber-600/40 bg-amber-600/10' :
                              'text-emerald-300 border-emerald-500/40 bg-emerald-500/10';
                            
                            return (
                              <div
                                key={team.id}
                                onClick={() => setSelectedTeamNameForMatches(team.name)}
                                className="bg-slate-950/70 hover:bg-slate-900/90 hover:border-emerald-500/40 cursor-pointer p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs transition-colors group"
                                title="اضغط لعرض مباريات هذا الفريق بالكامل"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center border ${badgeColor}`}>
                                    {rank}
                                  </span>
                                  <span className="font-bold text-white truncate group-hover:text-emerald-300 transition-colors">{team.name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono font-bold text-emerald-400 text-xs">{team.points} ن</span>
                                  <Eye className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-300 transition-colors" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: KNOCKOUT BRACKET (دور الـ 32 وحتى المباراة النهائية) */}
        {/* ========================================================================= */}
        {currentTab === 'bracket' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-2">
                    <Swords className="w-3.5 h-3.5" />
                    <span>المسار الإقصائي الكامل (Knockout Bracket)</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                    شجرة البطولة: من دور الـ 32 حتى التتويج باللقب 🏆
                  </h2>
                  <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    يتواجه المتأهلون الأربعة من كل مجموعة في <strong className="text-emerald-400">دور الـ 32 (16 مواجهة)</strong>، ويتأهل الفائزون تباعاً لدور الـ 16، وربع النهائي، ونصف النهائي حتى النهائي الحاسم.
                  </p>
                </div>

                {/* Quick Stage Filter Selector */}
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                  {[
                    { key: 'all', label: 'الكل' },
                    { key: 'r32', label: 'دور الـ 32 (16 مباراة)' },
                    { key: 'r16', label: 'دور الـ 16 (8 مباريات)' },
                    { key: 'qf', label: 'ربع النهائي' },
                    { key: 'sf', label: 'نصف النهائي' },
                    { key: 'final', label: 'النهائي 🏆' },
                  ].map((stageItem) => (
                    <button
                      key={stageItem.key}
                      onClick={() => setBracketStageFilter(stageItem.key as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        bracketStageFilter === stageItem.key
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {stageItem.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Round of 32 Flexibility & Organizer Notice */}
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Swords className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs md:text-sm font-black text-amber-300">
                    ملاحظة للمنظم: مواجهات دور الـ 32 قابلة للترتيب والتحديد يدوياً بالكامل
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    المواجهات قيد ترتيبك الخاص — يمكنك تحديد وتعديل طرفي كل مباراة في دور الـ 32 واختيار أي مواجهات تفضلها مباشرة بضغطة زر.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleOpenRoundOrganizer(undefined, undefined, 'r32')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer shrink-0 transition-all"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>تنظيم مواجهات دور الـ 32 (مين هيلاعب مين)</span>
              </button>
            </div>

            {/* Bracket Matches List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {matches
                .filter(m => m.stage !== 'group')
                .filter(m => bracketStageFilter === 'all' ? true : m.stage === bracketStageFilter)
                .map((m) => {
                  const r32Info = m.stage === 'r32' ? resolveR32MatchTeams(m) : null;
                  const tA = r32Info ? r32Info.teamAName : m.teamA;
                  const tB = r32Info ? r32Info.teamBName : m.teamB;

                  return (
                    <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                        <span className="font-bold text-amber-400">{m.stageName}</span>
                        <span>{m.isScheduled ? `${m.date} • ${m.time}` : 'لم يُحدد الموعد بعد'}</span>
                      </div>

                      <div className="space-y-2">
                        <div className="p-2 bg-slate-950 rounded-xl flex items-center justify-between text-xs font-bold text-white">
                          <button onClick={() => setSelectedTeamNameForMatches(tA)} className="hover:text-emerald-300 truncate cursor-pointer">{tA}</button>
                          <span className="font-mono text-emerald-400">{m.scoreA !== null ? m.scoreA : '-'}</span>
                        </div>
                        <div className="p-2 bg-slate-950 rounded-xl flex items-center justify-between text-xs font-bold text-white">
                          <button onClick={() => setSelectedTeamNameForMatches(tB)} className="hover:text-emerald-300 truncate cursor-pointer">{tB}</button>
                          <span className="font-mono text-emerald-400">{m.scoreB !== null ? m.scoreB : '-'}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                        <button
                          onClick={() => handleOpenEditMatchup(m)}
                          className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold border border-amber-500/30 cursor-pointer transition-all"
                          title="تعديل الفريقين وتحديد من يلاعب من"
                        >
                          تحديد الفريقين
                        </button>
                        <button
                          onClick={() => handleOpenScheduleModal(m)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold cursor-pointer"
                        >
                          {m.isScheduled ? 'الميعاد' : 'تحديد موعد'}
                        </button>
                        <button
                          onClick={() => handleOpenResultModal(m)}
                          className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold cursor-pointer"
                        >
                          النتيجة
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: TEAMS & PLAYERS ROSTER (الفرق واللاعبين - مين لعب ومين ملعبش والتبديلات) */}
        {/* ========================================================================= */}
        {currentTab === 'teams_roster' && (
          <TeamsRosterPage
            teams={teams}
            matches={matches}
            squads={squads}
            onUpdateSquads={setSquads}
            onUpdateMatchLineups={handleUpdateMatchLineups}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 5: STATS LEADERS (الهداف وصناعة اللعب - ترتيب الهدافين وصناع اللعب) */}
        {/* ========================================================================= */}
        {(currentTab === 'stats_leaders' || (currentTab as string) === 'top_scorers') && (
          <StatsLeadersPage
            matches={matches}
            teams={teams}
            onOpenRecordResult={(match) => handleOpenResultModal(match)}
            onSelectTeam={(teamName) => setSelectedTeamNameForMatches(teamName)}
            onSeedDemoStats={handleSeedDemoStats}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 5: MANAGE TEAMS, GROUPS & SCOREKEEPERS */}
        {/* ========================================================================= */}
        {currentTab === 'manage' && (
          <div className="space-y-6">
            
            {/* Manage Sub-tab switcher */}
            <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 max-w-md">
              <button
                onClick={() => setManageSubTab('teams')}
                className={`flex-1 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  manageSubTab === 'teams'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
                إدارة الفرق والمجاميع (48 فريق)
              </button>
              <button
                onClick={() => setManageSubTab('scorekeepers')}
                className={`flex-1 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  manageSubTab === 'scorekeepers'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                مسؤولو النتائج
              </button>
            </div>

            {/* Teams Sub-Tab */}
            {manageSubTab === 'teams' && (
              <div className="space-y-4">
                {/* Header Filter & Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl">
                  {/* Group Filter Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-400 font-bold ml-1 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      المجموعة:
                    </span>
                    <button
                      onClick={() => setManageTeamsGroupFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        manageTeamsGroupFilter === 'all'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      الكل (48 فريق)
                    </button>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((grp) => (
                      <button
                        key={grp}
                        onClick={() => setManageTeamsGroupFilter(grp)}
                        className={`w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                          manageTeamsGroupFilter === grp
                            ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-300'
                            : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                        }`}
                      >
                        {grp}
                      </button>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleResetAllMatches}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="تصفير جميع المباريات والنتائج"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      تصفير كل الماتشات
                    </button>
                    <button
                      onClick={handleOpenBulkEditModal}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      تعديل وإدخال أسماء الفرق والمجاميع (Bulk Edit)
                    </button>
                  </div>
                </div>

                {/* Info summary */}
                <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      نظام المجموعات: <strong className="text-white">48 فريقاً</strong> موزعين على <strong className="text-amber-400">8 مجموعات (A حتى H)</strong> • يلعب كل فريق <strong className="text-emerald-300">5 مباريات</strong> مع فرق مجموعته • يصعد أول 4 فرق لدور الـ 32.
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded-xl border border-slate-800">
                    المعروض حالياً: {teams.filter(t => manageTeamsGroupFilter === 'all' ? true : t.group === manageTeamsGroupFilter).length} فرق
                  </span>
                </div>

                {/* Teams Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teams
                    .filter((team) => (manageTeamsGroupFilter === 'all' ? true : team.group === manageTeamsGroupFilter))
                    .map((team) => (
                      <div
                        key={team.id}
                        className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all shadow-md group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div
                            onClick={() => setSelectedTeamNameForMatches(team.name)}
                            className="flex items-center gap-3 truncate cursor-pointer flex-1"
                            title="اضغط لعرض مباريات هذا الفريق بالكامل"
                          >
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${team.logoColor} flex items-center justify-center font-black text-sm text-white shrink-0 shadow-md group-hover:scale-105 transition-transform`}>
                              {team.name.charAt(0)}
                            </div>
                            <div className="truncate">
                              <strong className="text-xs md:text-sm font-bold text-white block truncate group-hover:text-emerald-400 transition-colors">{team.name}</strong>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 text-[10px] font-bold border border-emerald-500/20">
                                  المجموعة {team.group}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => setSelectedTeamNameForMatches(team.name)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-emerald-500/20 shadow-sm"
                              title="عرض مباريات هذا الفريق (5 مباريات)"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              الماتشات (5)
                            </button>
                            <button
                              onClick={() => setEditingTeam(team)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
                              title="تعديل اسم الفريق ومجموعته"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              تعديل
                            </button>
                          </div>
                        </div>

                        {/* Stats Progress Bar */}
                        <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">المباريات:</span>
                            <strong className="text-white font-bold">{team.played} / 5</strong>
                          </div>

                          <div className="flex items-center gap-2">
                            <span>نقاط: <strong className="text-amber-400 font-bold">{team.points}</strong></span>
                            <span>فارق: <strong className="text-emerald-400 font-bold">{team.gd > 0 ? `+${team.gd}` : team.gd}</strong></span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Scorekeepers Sub-Tab */}
            {manageSubTab === 'scorekeepers' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                  <h3 className="text-base font-black text-white pb-3 border-b border-slate-800">
                    تعيين مسؤول جديد لتسجيل نتائج المباريات
                  </h3>
                  <form onSubmit={handleAddScorekeeper} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">اسم المسؤول / الحكم *</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: يوسف حسام"
                        value={newScorekeeperForm.name}
                        onChange={(e) => setNewScorekeeperForm({ ...newScorekeeperForm, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">الرقم التعريفي (ID) *</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: 20230555"
                        value={newScorekeeperForm.studentId}
                        onChange={(e) => setNewScorekeeperForm({ ...newScorekeeperForm, studentId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 cursor-pointer mt-2"
                    >
                      اعتماد وتفويض مسؤول النتائج
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-3">
                  <h3 className="text-base font-black text-white pb-3 border-b border-slate-800">
                    المسؤولون المعتمدون ({scorekeepers.length})
                  </h3>
                  {scorekeepers.map((sk) => (
                    <div
                      key={sk.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        sk.id === activeOperatorId ? 'bg-amber-950/20 border-amber-500/50' : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div>
                        <strong className="text-sm font-bold text-white block">{sk.name}</strong>
                        <span className="text-[11px] text-slate-400 font-mono">ID: {sk.studentId}</span>
                      </div>
                      {sk.id !== activeOperatorId && (
                        <button
                          onClick={() => setActiveOperatorId(sk.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                        >
                          الدخول باسمه
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL: SCHEDULE / RESCHEDULE MATCH (تحديد وتنزيل ميعاد الماتش) */}
      {/* ========================================================================= */}
      {schedulingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-emerald-400" />
                  <span>{schedulingMatch.isScheduled ? 'تعديل ميعاد المباراة' : 'تحديد الموعد وتنزيل المباراة في الجدول'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {schedulingMatch.stageName} • {schedulingMatch.teamA} ضد {schedulingMatch.teamB}
                </p>
              </div>
              <button
                onClick={() => setSchedulingMatch(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">تاريخ ويوم المباراة (Date) *</label>
                <input
                  type="date"
                  required
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">توقيت وساعة انطلاق المباراة (Time) *</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {['02:00 م', '04:00 م', '06:00 م', '08:00 م'].map(t => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setScheduleForm({ ...scheduleForm, time: t })}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        scheduleForm.time === t ? 'bg-emerald-600 text-white shadow' : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  placeholder="أو اكتب التوقيت يدوياً مثل: 04:30 م"
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">الملعب والموقع (Pitch) *</label>
                <select
                  value={scheduleForm.pitch}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, pitch: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="الملعب الرئيسي (A)">الملعب الرئيسي (A)</option>
                  <option value="ملعب النجيل الصناعي (B)">ملعب النجيل الصناعي (B)</option>
                  <option value="الملعب المتعدد (C)">الملعب المتعدد (C)</option>
                  <option value="ستاد جامعة النيل الرئيسي">ستاد جامعة النيل الرئيسي</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                {schedulingMatch.isScheduled && (
                  <button
                    type="button"
                    onClick={() => handleUnscheduleMatch(schedulingMatch.id)}
                    className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold cursor-pointer"
                  >
                    سحب وإلغاء الميعاد
                  </button>
                )}

                <div className="flex items-center gap-2 mr-auto">
                  <button
                    type="button"
                    onClick={() => setSchedulingMatch(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>تثبيت وتنزيل الماتش في الجدول 🚀</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FAST RESULT RECORDING (تسجيل النتيجة المباشرة أو النهائية) */}
      {/* ========================================================================= */}
      {recordingResultMatch && (() => {
        const squadA = squads[recordingResultMatch.teamA] || [];
        const squadB = squads[recordingResultMatch.teamB] || [];
        const totalGoalsA = teamAScorers.reduce((sum, s) => sum + (Number(s.goals) || 0), 0);
        const totalGoalsB = teamBScorers.reduce((sum, s) => sum + (Number(s.goals) || 0), 0);
        const liveSummary = buildMatchScorersSummary(
          recordingResultMatch.teamA,
          teamAScorers,
          teamAAssists,
          recordingResultMatch.teamB,
          teamBScorers,
          teamBAssists,
          manualResultNotes
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full p-5 md:p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
                <div>
                  <h3 className="text-base md:text-lg font-black text-white flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-emerald-400" />
                    <span>تسجيل نتيجة المباراة وأهداف وصناع اللعب لكل فرقة</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {recordingResultMatch.stageName} • {recordingResultMatch.stage === 'group' ? `المجموعة ${recordingResultMatch.group} - الجولة ${recordingResultMatch.round || 1}` : recordingResultMatch.stageName}
                  </p>
                </div>
                <button
                  onClick={() => setRecordingResultMatch(null)}
                  className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleSaveMatchResult} className="flex-1 overflow-y-auto space-y-5 pr-1">
                {/* Score & Status Row */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Score Inputs Box */}
                  <div className="md:col-span-8 p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between gap-4">
                      {/* Team A Score */}
                      <div className="flex-1 text-center space-y-1">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-sm shadow-blue-500"></span>
                          <strong className="text-xs md:text-sm font-black text-white truncate max-w-[140px] inline-block">{recordingResultMatch.teamA}</strong>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="99"
                          required
                          value={resultForm.scoreA}
                          onChange={(e) => {
                            setAutoSyncScore(false);
                            setResultForm({ ...resultForm, scoreA: Number(e.target.value) });
                          }}
                          className={`w-16 md:w-20 text-center text-2xl md:text-3xl font-black rounded-xl py-1.5 font-mono mx-auto block transition-all ${
                            autoSyncScore
                              ? 'bg-blue-950/40 border border-blue-500/50 text-blue-400'
                              : 'bg-slate-900 border border-slate-700 text-emerald-400 focus:outline-none focus:border-emerald-500'
                          }`}
                          title={autoSyncScore ? 'النتيجة محسوبة تلقائياً من أهداف اللاعبين بالأسفل' : 'تعديل النتيجة يدوياً'}
                        />
                        <span className="text-[10px] text-slate-400 font-bold block">
                          ⚽ {totalGoalsA} أهداف مسجلة بالأسفل
                        </span>
                      </div>

                      <div className="text-center shrink-0 px-2 space-y-0.5">
                        <span className="text-slate-600 font-black text-base md:text-lg font-mono block">VS</span>
                        <span className="text-[10px] text-slate-500 font-bold block">النتيجة</span>
                      </div>

                      {/* Team B Score */}
                      <div className="flex-1 text-center space-y-1">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500"></span>
                          <strong className="text-xs md:text-sm font-black text-white truncate max-w-[140px] inline-block">{recordingResultMatch.teamB}</strong>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="99"
                          required
                          value={resultForm.scoreB}
                          onChange={(e) => {
                            setAutoSyncScore(false);
                            setResultForm({ ...resultForm, scoreB: Number(e.target.value) });
                          }}
                          className={`w-16 md:w-20 text-center text-2xl md:text-3xl font-black rounded-xl py-1.5 font-mono mx-auto block transition-all ${
                            autoSyncScore
                              ? 'bg-emerald-950/40 border border-emerald-500/50 text-emerald-400'
                              : 'bg-slate-900 border border-slate-700 text-emerald-400 focus:outline-none focus:border-emerald-500'
                          }`}
                          title={autoSyncScore ? 'النتيجة محسوبة تلقائياً من أهداف اللاعبين بالأسفل' : 'تعديل النتيجة يدوياً'}
                        />
                        <span className="text-[10px] text-slate-400 font-bold block">
                          ⚽ {totalGoalsB} أهداف مسجلة بالأسفل
                        </span>
                      </div>
                    </div>

                    {/* Auto-Sync Score Banner & Controls */}
                    <div className="pt-2 border-t border-slate-900 flex flex-wrap items-center justify-between gap-2 text-[11px] px-1">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <span className={`w-2 h-2 rounded-full ${autoSyncScore ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                        <span className="font-bold">
                          {autoSyncScore
                            ? '⚡ النتيجة تتحدث تلقائياً وبشكل فوري بمجرد كتابة أهداف اللاعبين بالأسفل — لا داعي لتغييرها يدوياً'
                            : '⚠️ وضع التعديل اليدوي للنتيجة نشط'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!autoSyncScore) {
                            setResultForm(rf => ({ ...rf, scoreA: totalGoalsA, scoreB: totalGoalsB }));
                            setAutoSyncScore(true);
                          } else {
                            setAutoSyncScore(false);
                          }
                        }}
                        className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        {autoSyncScore ? 'تعديل النتيجة يدوياً ✎' : '🔄 إعادة الربط التلقائي مع أهداف اللاعبين'}
                      </button>
                    </div>
                  </div>

                  {/* Status & Minute */}
                  <div className="md:col-span-4 p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-300">حالة المباراة</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setResultForm({ ...resultForm, status: 'finished' })}
                        className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          resultForm.status === 'finished' ? 'bg-emerald-600 text-white shadow font-black' : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                      >
                        انتهت FT
                      </button>
                      <button
                        type="button"
                        onClick={() => setResultForm({ ...resultForm, status: 'live' })}
                        className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          resultForm.status === 'live' ? 'bg-rose-600 text-white shadow font-black' : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                      >
                        مباشر الآن
                      </button>
                    </div>

                    {resultForm.status === 'live' && (
                      <div className="pt-1.5 flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">الدقيقة:</span>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={resultForm.minute}
                          onChange={(e) => setResultForm({ ...resultForm, minute: Number(e.target.value) })}
                          className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* HTML5 Datalists for Squad Autocomplete */}
                <datalist id={`datalist-squad-A-${recordingResultMatch.id}`}>
                  {squadA.map(p => (
                    <option key={p.id} value={p.name}>{`#${p.number} • ${p.position}`}</option>
                  ))}
                </datalist>
                <datalist id={`datalist-squad-B-${recordingResultMatch.id}`}>
                  {squadB.map(p => (
                    <option key={p.id} value={p.name}>{`#${p.number} • ${p.position}`}</option>
                  ))}
                </datalist>

                {/* TWO TEAMS DEDICATED SECTIONS: TEAM A vs TEAM B */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* TEAM A CARD */}
                  <div className="bg-slate-950 p-4 rounded-2xl border-2 border-blue-500/30 bg-gradient-to-b from-blue-950/20 to-slate-950 space-y-4 shadow-lg">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-sm text-white shadow-md shadow-blue-500/20">
                          {recordingResultMatch.teamA.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-sm md:text-base font-black text-white">{recordingResultMatch.teamA}</strong>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              الفريق الأول
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">سجل هنا أهداف وصناع اللعب الخاصين بـ {recordingResultMatch.teamA}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-blue-500/10 text-blue-300 border border-blue-500/30 flex items-center gap-1 font-mono">
                          <span>⚽</span>
                          <span>{totalGoalsA} أهداف</span>
                        </span>
                        <span className="px-2 py-1 rounded-xl text-xs font-black bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 font-mono">
                          <span>🎯</span>
                          <span>{teamAAssists.reduce((sum, a) => sum + (Number(a.assists) || 0), 0)} أسيست</span>
                        </span>
                      </div>
                    </div>

                    {/* ======================= */}
                    {/* ⚽ مكان كتابة الأهداف لـ Team A */}
                    {/* ======================= */}
                    <div className="space-y-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                            <span>⚽ أهداف {recordingResultMatch.teamA}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                            {teamAScorers.length} لاعب مسجل
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddScorer('A')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ إضافة لاعب هداف</span>
                        </button>
                      </div>

                      {teamAScorers.length === 0 ? (
                        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-dashed border-slate-800 text-center space-y-1">
                          <p className="text-xs text-slate-400 font-bold">لم تسجل أي أهداف لـ {recordingResultMatch.teamA} بعد</p>
                          <p className="text-[11px] text-slate-500">انقر على الزر أعلاه لإضافة اسم اللاعب وعدد أهدافه وتتحدث النتيجة فوراً</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Column Headers */}
                          <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 px-1">
                            <div className="col-span-6 md:col-span-7">اسم اللاعب الهداف</div>
                            <div className="col-span-4 md:col-span-4 text-center">عدد الأهداف (كتابة)</div>
                            <div className="col-span-2 md:col-span-1 text-center">حذف</div>
                          </div>

                          {teamAScorers.map((scorer) => (
                            <div key={scorer.id} className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition-colors">
                              {/* Player Name Input */}
                              <div className="col-span-6 md:col-span-7">
                                <input
                                  type="text"
                                  list={`datalist-squad-A-${recordingResultMatch.id}`}
                                  placeholder="اكتب اسم اللاعب الهداف..."
                                  value={scorer.playerName}
                                  onChange={(e) => handleUpdateScorer('A', scorer.id, e.target.value, scorer.goals)}
                                  className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold placeholder:text-slate-500"
                                />
                              </div>

                              {/* Goals Input with direct typing and +/- buttons */}
                              <div className="col-span-4 md:col-span-4 flex items-center justify-center gap-1 bg-slate-900 px-1.5 py-1 rounded-lg border border-slate-700">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateScorer('A', scorer.id, scorer.playerName, Math.max(1, scorer.goals - 1))}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-black cursor-pointer"
                                  title="تقليل هدف"
                                >
                                  -
                                </button>

                                <input
                                  type="number"
                                  min="1"
                                  max="50"
                                  value={scorer.goals}
                                  onChange={(e) => handleUpdateScorer('A', scorer.id, scorer.playerName, Math.max(1, Number(e.target.value) || 1))}
                                  className="w-10 text-center font-black text-xs text-emerald-400 bg-slate-950 border border-slate-800 rounded py-0.5 font-mono focus:outline-none focus:border-emerald-500"
                                  title="اكتب عدد الأهداف مباشرة"
                                />

                                <button
                                  type="button"
                                  onClick={() => handleUpdateScorer('A', scorer.id, scorer.playerName, scorer.goals + 1)}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-black cursor-pointer"
                                  title="زيادة هدف"
                                >
                                  +
                                </button>

                                {/* Quick Presets */}
                                <div className="hidden sm:flex items-center gap-0.5 mr-1 border-r border-slate-800 pr-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateScorer('A', scorer.id, scorer.playerName, 1)}
                                    className={`px-1 py-0.5 rounded text-[9px] font-bold cursor-pointer ${scorer.goals === 1 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    title="هدف واحد"
                                  >
                                    1
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateScorer('A', scorer.id, scorer.playerName, 2)}
                                    className={`px-1 py-0.5 rounded text-[9px] font-bold cursor-pointer ${scorer.goals === 2 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    title="هدفين"
                                  >
                                    2
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateScorer('A', scorer.id, scorer.playerName, 3)}
                                    className={`px-1 py-0.5 rounded text-[9px] font-bold cursor-pointer ${scorer.goals === 3 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    title="هاتريك (3)"
                                  >
                                    3
                                  </button>
                                </div>
                              </div>

                              {/* Delete Button */}
                              <div className="col-span-2 md:col-span-1 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveScorer('A', scorer.id)}
                                  className="w-7 h-7 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center cursor-pointer transition-colors"
                                  title="حذف هذا اللاعب"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ======================= */}
                    {/* 🎯 مكان كتابة الأسيست لـ Team A */}
                    {/* ======================= */}
                    <div className="space-y-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-blue-400 flex items-center gap-1.5">
                            <span>🎯 صناعة اللعب (أسيست {recordingResultMatch.teamA})</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                            {teamAAssists.length} صانع مسجل
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddAssist('A')}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ إضافة صانع هدف</span>
                        </button>
                      </div>

                      {teamAAssists.length === 0 ? (
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-dashed border-slate-800 text-center">
                          <p className="text-[11px] text-slate-500">لا يوجد صانعو أهداف مسجلون لـ {recordingResultMatch.teamA}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Column Headers */}
                          <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 px-1">
                            <div className="col-span-6 md:col-span-7">اسم صانع الهدف (الأسيست)</div>
                            <div className="col-span-4 md:col-span-4 text-center">عدد الأسيستات (كتابة)</div>
                            <div className="col-span-2 md:col-span-1 text-center">حذف</div>
                          </div>

                          {teamAAssists.map((assist) => (
                            <div key={assist.id} className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2 rounded-xl border border-slate-800 hover:border-blue-500/40 transition-colors">
                              {/* Assist Player Name Input */}
                              <div className="col-span-6 md:col-span-7">
                                <input
                                  type="text"
                                  list={`datalist-squad-A-${recordingResultMatch.id}`}
                                  placeholder="اكتب اسم صانع الهدف..."
                                  value={assist.playerName}
                                  onChange={(e) => handleUpdateAssist('A', assist.id, e.target.value, assist.assists)}
                                  className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold placeholder:text-slate-500"
                                />
                              </div>

                              {/* Assists Input with direct typing and +/- buttons */}
                              <div className="col-span-4 md:col-span-4 flex items-center justify-center gap-1 bg-slate-900 px-1.5 py-1 rounded-lg border border-slate-700">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAssist('A', assist.id, assist.playerName, Math.max(1, assist.assists - 1))}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-black cursor-pointer"
                                  title="تقليل أسيست"
                                >
                                  -
                                </button>

                                <input
                                  type="number"
                                  min="1"
                                  max="50"
                                  value={assist.assists}
                                  onChange={(e) => handleUpdateAssist('A', assist.id, assist.playerName, Math.max(1, Number(e.target.value) || 1))}
                                  className="w-10 text-center font-black text-xs text-blue-400 bg-slate-950 border border-slate-800 rounded py-0.5 font-mono focus:outline-none focus:border-blue-500"
                                  title="اكتب عدد الأسيستات مباشرة"
                                />

                                <button
                                  type="button"
                                  onClick={() => handleUpdateAssist('A', assist.id, assist.playerName, assist.assists + 1)}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-black cursor-pointer"
                                  title="زيادة أسيست"
                                >
                                  +
                                </button>

                                {/* Quick Presets */}
                                <div className="hidden sm:flex items-center gap-0.5 mr-1 border-r border-slate-800 pr-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateAssist('A', assist.id, assist.playerName, 1)}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${assist.assists === 1 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    title="أسيست واحد"
                                  >
                                    1
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateAssist('A', assist.id, assist.playerName, 2)}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${assist.assists === 2 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    title="2 أسيست"
                                  >
                                    2
                                  </button>
                                </div>
                              </div>

                              {/* Delete Button */}
                              <div className="col-span-2 md:col-span-1 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAssist('A', assist.id)}
                                  className="w-7 h-7 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center cursor-pointer transition-colors"
                                  title="حذف هذا اللاعب"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ======================= */}
                    {/* 🔄 تبديلات Team A (بحد أقصى 5 تبديلات) */}
                    {/* ======================= */}
                    <div className="space-y-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>تبديلات {recordingResultMatch.teamA}</span>
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full font-mono border ${
                            teamASubs.length >= MAX_SUBS_PER_TEAM 
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {teamASubs.length} / {MAX_SUBS_PER_TEAM} تبديلات
                          </span>
                        </div>
                        {teamASubs.length >= MAX_SUBS_PER_TEAM && (
                          <span className="text-[10px] text-rose-400 font-bold">
                            ⚠️ تم الوصول للحد الأقصى
                          </span>
                        )}
                      </div>

                      {/* Add Sub Inputs (only if under max) */}
                      {teamASubs.length < MAX_SUBS_PER_TEAM ? (
                        <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                          <div className="grid grid-cols-12 gap-2 items-center text-xs">
                            <div className="col-span-3 sm:col-span-2">
                              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">الدقيقة:</label>
                              <input
                                type="number"
                                min="1"
                                max="120"
                                value={newSubA.minute}
                                onChange={(e) => setNewSubA(prev => ({ ...prev, minute: Number(e.target.value) || 1 }))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                              />
                            </div>
                            <div className="col-span-9 sm:col-span-4">
                              <label className="text-[10px] font-bold text-rose-400 block mb-0.5">اللاعب الخارج (استبدال):</label>
                              <input
                                type="text"
                                list={`datalist-squad-A-${recordingResultMatch.id}`}
                                placeholder="اختر أو اكتب اللاعب الخارج..."
                                value={newSubA.playerOut}
                                onChange={(e) => setNewSubA(prev => ({ ...prev, playerOut: e.target.value }))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                              />
                            </div>
                            <div className="col-span-8 sm:col-span-4">
                              <label className="text-[10px] font-bold text-emerald-400 block mb-0.5">اللاعب البديل (دخول):</label>
                              <input
                                type="text"
                                list={`datalist-squad-A-${recordingResultMatch.id}`}
                                placeholder="اختر أو اكتب اللاعب البديل..."
                                value={newSubA.playerIn}
                                onChange={(e) => setNewSubA(prev => ({ ...prev, playerIn: e.target.value }))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                              />
                            </div>
                            <div className="col-span-4 sm:col-span-2 flex items-end">
                              <button
                                type="button"
                                onClick={() => handleAddSubInModal('A')}
                                className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] rounded-lg cursor-pointer transition-colors"
                              >
                                + تبديل
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-rose-950/30 rounded-xl border border-rose-500/30 text-center text-xs text-rose-300 font-bold">
                          تم استنفاد الحد الأقصى للتبديلات ({MAX_SUBS_PER_TEAM} تبديلات) لهذا الفريق
                        </div>
                      )}

                      {/* Subs list */}
                      {teamASubs.length > 0 && (
                        <div className="space-y-1.5">
                          {teamASubs.map((sub, sIdx) => (
                            <div key={sub.id} className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-amber-400 font-bold">#{sIdx + 1} د{sub.minute}'</span>
                                <span className="text-slate-500">•</span>
                                <span className="text-emerald-400 font-bold">دخول {sub.playerIn}</span>
                                <span className="text-slate-500 mx-1">⮂</span>
                                <span className="text-rose-400">خروج {sub.playerOut}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSubInModal('A', sub.id)}
                                className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                                title="حذف هذا التبديل"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ======================= */}
                    {/* 🟨🟥 الإنذارات والبطاقات الحمراء والطرود Team A */}
                    {/* ======================= */}
                    <div className="space-y-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-rose-400 flex items-center gap-1.5">
                            <span>🟨🟥 الإنذارات والبطاقات الحمراء (الطرود)</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                            {teamACards.length} بطاقة
                          </span>
                        </div>
                      </div>

                      {/* Add Card inputs */}
                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                        <div className="grid grid-cols-12 gap-2 items-center text-xs">
                          <div className="col-span-3 sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 block mb-0.5">الدقيقة:</label>
                            <input
                              type="number"
                              min="1"
                              max="120"
                              value={newCardA.minute}
                              onChange={(e) => setNewCardA(prev => ({ ...prev, minute: Number(e.target.value) || 1 }))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                            />
                          </div>
                          <div className="col-span-9 sm:col-span-4">
                            <label className="text-[10px] font-bold text-slate-300 block mb-0.5">اسم اللاعب:</label>
                            <input
                              type="text"
                              list={`datalist-squad-A-${recordingResultMatch.id}`}
                              placeholder="اسم اللاعب الحاصل على البطاقة..."
                              value={newCardA.playerName}
                              onChange={(e) => setNewCardA(prev => ({ ...prev, playerName: e.target.value }))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                            />
                          </div>
                          <div className="col-span-7 sm:col-span-3">
                            <label className="text-[10px] font-bold text-slate-300 block mb-0.5">نوع البطاقة:</label>
                            <select
                              value={newCardA.cardType}
                              onChange={(e) => setNewCardA(prev => ({ ...prev, cardType: e.target.value as CardType }))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-bold"
                            >
                              <option value="yellow">🟨 إنذار أصفر</option>
                              <option value="red">🟥 كارت أحمر مباشر (طرد)</option>
                              <option value="second_yellow">🟨🟥 إنذار ثانٍ ثم طرد</option>
                            </select>
                          </div>
                          <div className="col-span-5 sm:col-span-3">
                            <label className="text-[10px] font-bold text-slate-400 block mb-0.5">السبب (اختياري):</label>
                            <input
                              type="text"
                              placeholder="تدخل عنيف، اعتراض..."
                              value={newCardA.reason}
                              onChange={(e) => setNewCardA(prev => ({ ...prev, reason: e.target.value }))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleAddCardInModal('A')}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-lg cursor-pointer transition-colors"
                          >
                            + إضافة البطاقة
                          </button>
                        </div>
                      </div>

                      {/* Cards list */}
                      {teamACards.length > 0 && (
                        <div className="space-y-1.5">
                          {teamACards.map((c) => (
                            <div key={c.id} className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                                  c.cardType === 'yellow'
                                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                    : c.cardType === 'red'
                                    ? 'bg-rose-600/30 text-rose-300 border border-rose-600/40'
                                    : 'bg-rose-600/40 text-rose-200 border border-amber-400/40'
                                }`}>
                                  {c.cardType === 'yellow' && '🟨 إنذار أصفر'}
                                  {c.cardType === 'red' && '🟥 طرد مباشر (أحمر)'}
                                  {c.cardType === 'second_yellow' && '🟨🟥 إنذار ثانٍ وطرد'}
                                </span>
                                <span className="font-mono text-slate-400 font-bold">د{c.minute}'</span>
                                <strong className="text-white">{c.playerName}</strong>
                                {c.reason && <span className="text-slate-400 text-[11px]">({c.reason})</span>}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveCardInModal('A', c.id)}
                                className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                                title="حذف هذه البطاقة"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* TEAM B CARD */}
                  <div className="bg-slate-950 p-4 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-950 space-y-4 shadow-lg">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center font-black text-sm text-white shadow-md shadow-emerald-500/20">
                          {recordingResultMatch.teamB.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-sm md:text-base font-black text-white">{recordingResultMatch.teamB}</strong>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              الفريق الثاني
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">سجل هنا أهداف وصناع اللعب الخاصين بـ {recordingResultMatch.teamB}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono">
                          <span>⚽</span>
                          <span>{totalGoalsB} أهداف</span>
                        </span>
                        <span className="px-2 py-1 rounded-xl text-xs font-black bg-teal-500/10 text-teal-300 border border-teal-500/30 flex items-center gap-1 font-mono">
                          <span>🎯</span>
                          <span>{teamBAssists.reduce((sum, a) => sum + (Number(a.assists) || 0), 0)} أسيست</span>
                        </span>
                      </div>
                    </div>

                    {/* ======================= */}
                    {/* ⚽ مكان كتابة الأهداف لـ Team B */}
                    {/* ======================= */}
                    <div className="space-y-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                            <span>⚽ أهداف {recordingResultMatch.teamB}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                            {teamBScorers.length} لاعب مسجل
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddScorer('B')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ إضافة لاعب هداف</span>
                        </button>
                      </div>

                      {teamBScorers.length === 0 ? (
                        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-dashed border-slate-800 text-center space-y-1">
                          <p className="text-xs text-slate-400 font-bold">لم تسجل أي أهداف لـ {recordingResultMatch.teamB} بعد</p>
                          <p className="text-[11px] text-slate-500">انقر على الزر أعلاه لإضافة اسم اللاعب وعدد أهدافه وتتحدث النتيجة فوراً</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Column Headers */}
                          <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 px-1">
                            <div className="col-span-6 md:col-span-7">اسم اللاعب الهداف</div>
                            <div className="col-span-4 md:col-span-4 text-center">عدد الأهداف (كتابة)</div>
                            <div className="col-span-2 md:col-span-1 text-center">حذف</div>
                          </div>

                          {teamBScorers.map((scorer) => (
                            <div key={scorer.id} className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition-colors">
                              {/* Player Name Input */}
                              <div className="col-span-6 md:col-span-7">
                                <input
                                  type="text"
                                  list={`datalist-squad-B-${recordingResultMatch.id}`}
                                  placeholder="اكتب اسم اللاعب الهداف..."
                                  value={scorer.playerName}
                                  onChange={(e) => handleUpdateScorer('B', scorer.id, e.target.value, scorer.goals)}
                                  className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold placeholder:text-slate-500"
                                />
                              </div>

                              {/* Goals Input with direct typing and +/- buttons */}
                              <div className="col-span-4 md:col-span-4 flex items-center justify-center gap-1 bg-slate-900 px-1.5 py-1 rounded-lg border border-slate-700">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateScorer('B', scorer.id, scorer.playerName, Math.max(1, scorer.goals - 1))}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-black cursor-pointer"
                                  title="تقليل هدف"
                                >
                                  -
                                </button>

                                <input
                                  type="number"
                                  min="1"
                                  max="50"
                                  value={scorer.goals}
                                  onChange={(e) => handleUpdateScorer('B', scorer.id, scorer.playerName, Math.max(1, Number(e.target.value) || 1))}
                                  className="w-10 text-center font-black text-xs text-emerald-400 bg-slate-950 border border-slate-800 rounded py-0.5 font-mono focus:outline-none focus:border-emerald-500"
                                  title="اكتب عدد الأهداف مباشرة"
                                />

                                <button
                                  type="button"
                                  onClick={() => handleUpdateScorer('B', scorer.id, scorer.playerName, scorer.goals + 1)}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-black cursor-pointer"
                                  title="زيادة هدف"
                                >
                                  +
                                </button>

                                {/* Quick Presets */}
                                <div className="hidden sm:flex items-center gap-0.5 mr-1 border-r border-slate-800 pr-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateScorer('B', scorer.id, scorer.playerName, 1)}
                                    className={`px-1 py-0.5 rounded text-[9px] font-bold cursor-pointer ${scorer.goals === 1 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    title="هدف واحد"
                                  >
                                    1
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateScorer('B', scorer.id, scorer.playerName, 2)}
                                    className={`px-1 py-0.5 rounded text-[9px] font-bold cursor-pointer ${scorer.goals === 2 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    title="هدفين"
                                  >
                                    2
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateScorer('B', scorer.id, scorer.playerName, 3)}
                                    className={`px-1 py-0.5 rounded text-[9px] font-bold cursor-pointer ${scorer.goals === 3 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    title="هاتريك (3)"
                                  >
                                    3
                                  </button>
                                </div>
                              </div>

                              {/* Delete Button */}
                              <div className="col-span-2 md:col-span-1 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveScorer('B', scorer.id)}
                                  className="w-7 h-7 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center cursor-pointer transition-colors"
                                  title="حذف هذا اللاعب"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ======================= */}
                    {/* 🎯 مكان كتابة الأسيست لـ Team B */}
                    {/* ======================= */}
                    <div className="space-y-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-blue-400 flex items-center gap-1.5">
                            <span>🎯 صناعة اللعب (أسيست {recordingResultMatch.teamB})</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                            {teamBAssists.length} صانع مسجل
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddAssist('B')}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ إضافة صانع هدف</span>
                        </button>
                      </div>

                      {teamBAssists.length === 0 ? (
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-dashed border-slate-800 text-center">
                          <p className="text-[11px] text-slate-500">لا يوجد صانعو أهداف مسجلون لـ {recordingResultMatch.teamB}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Column Headers */}
                          <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 px-1">
                            <div className="col-span-6 md:col-span-7">اسم صانع الهدف (الأسيست)</div>
                            <div className="col-span-4 md:col-span-4 text-center">عدد الأسيستات (كتابة)</div>
                            <div className="col-span-2 md:col-span-1 text-center">حذف</div>
                          </div>

                          {teamBAssists.map((assist) => (
                            <div key={assist.id} className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2 rounded-xl border border-slate-800 hover:border-blue-500/40 transition-colors">
                              {/* Assist Player Name Input */}
                              <div className="col-span-6 md:col-span-7">
                                <input
                                  type="text"
                                  list={`datalist-squad-B-${recordingResultMatch.id}`}
                                  placeholder="اكتب اسم صانع الهدف..."
                                  value={assist.playerName}
                                  onChange={(e) => handleUpdateAssist('B', assist.id, e.target.value, assist.assists)}
                                  className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold placeholder:text-slate-500"
                                />
                              </div>

                              {/* Assists Input with direct typing and +/- buttons */}
                              <div className="col-span-4 md:col-span-4 flex items-center justify-center gap-1 bg-slate-900 px-1.5 py-1 rounded-lg border border-slate-700">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAssist('B', assist.id, assist.playerName, Math.max(1, assist.assists - 1))}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-black cursor-pointer"
                                  title="تقليل أسيست"
                                >
                                  -
                                </button>

                                <input
                                  type="number"
                                  min="1"
                                  max="50"
                                  value={assist.assists}
                                  onChange={(e) => handleUpdateAssist('B', assist.id, assist.playerName, Math.max(1, Number(e.target.value) || 1))}
                                  className="w-10 text-center font-black text-xs text-blue-400 bg-slate-950 border border-slate-800 rounded py-0.5 font-mono focus:outline-none focus:border-blue-500"
                                  title="اكتب عدد الأسيستات مباشرة"
                                />

                                <button
                                  type="button"
                                  onClick={() => handleUpdateAssist('B', assist.id, assist.playerName, assist.assists + 1)}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-black cursor-pointer"
                                  title="زيادة أسيست"
                                >
                                  +
                                </button>

                                {/* Quick Presets */}
                                <div className="hidden sm:flex items-center gap-0.5 mr-1 border-r border-slate-800 pr-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateAssist('B', assist.id, assist.playerName, 1)}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${assist.assists === 1 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    title="أسيست واحد"
                                  >
                                    1
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateAssist('B', assist.id, assist.playerName, 2)}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${assist.assists === 2 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    title="2 أسيست"
                                  >
                                    2
                                  </button>
                                </div>
                              </div>

                              {/* Delete Button */}
                              <div className="col-span-2 md:col-span-1 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAssist('B', assist.id)}
                                  className="w-7 h-7 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center cursor-pointer transition-colors"
                                  title="حذف هذا اللاعب"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ======================= */}
                    {/* 🔄 تبديلات Team B (بحد أقصى 5 تبديلات) */}
                    {/* ======================= */}
                    <div className="space-y-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>تبديلات {recordingResultMatch.teamB}</span>
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full font-mono border ${
                            teamBSubs.length >= MAX_SUBS_PER_TEAM 
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {teamBSubs.length} / {MAX_SUBS_PER_TEAM} تبديلات
                          </span>
                        </div>
                        {teamBSubs.length >= MAX_SUBS_PER_TEAM && (
                          <span className="text-[10px] text-rose-400 font-bold">
                            ⚠️ تم الوصول للحد الأقصى
                          </span>
                        )}
                      </div>

                      {/* Add Sub Inputs (only if under max) */}
                      {teamBSubs.length < MAX_SUBS_PER_TEAM ? (
                        <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                          <div className="grid grid-cols-12 gap-2 items-center text-xs">
                            <div className="col-span-3 sm:col-span-2">
                              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">الدقيقة:</label>
                              <input
                                type="number"
                                min="1"
                                max="120"
                                value={newSubB.minute}
                                onChange={(e) => setNewSubB(prev => ({ ...prev, minute: Number(e.target.value) || 1 }))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                              />
                            </div>
                            <div className="col-span-9 sm:col-span-4">
                              <label className="text-[10px] font-bold text-rose-400 block mb-0.5">اللاعب الخارج (استبدال):</label>
                              <input
                                type="text"
                                list={`datalist-squad-B-${recordingResultMatch.id}`}
                                placeholder="اختر أو اكتب اللاعب الخارج..."
                                value={newSubB.playerOut}
                                onChange={(e) => setNewSubB(prev => ({ ...prev, playerOut: e.target.value }))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                              />
                            </div>
                            <div className="col-span-8 sm:col-span-4">
                              <label className="text-[10px] font-bold text-emerald-400 block mb-0.5">اللاعب البديل (دخول):</label>
                              <input
                                type="text"
                                list={`datalist-squad-B-${recordingResultMatch.id}`}
                                placeholder="اختر أو اكتب اللاعب البديل..."
                                value={newSubB.playerIn}
                                onChange={(e) => setNewSubB(prev => ({ ...prev, playerIn: e.target.value }))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                              />
                            </div>
                            <div className="col-span-4 sm:col-span-2 flex items-end">
                              <button
                                type="button"
                                onClick={() => handleAddSubInModal('B')}
                                className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] rounded-lg cursor-pointer transition-colors"
                              >
                                + تبديل
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-rose-950/30 rounded-xl border border-rose-500/30 text-center text-xs text-rose-300 font-bold">
                          تم استنفاد الحد الأقصى للتبديلات ({MAX_SUBS_PER_TEAM} تبديلات) لهذا الفريق
                        </div>
                      )}

                      {/* Subs list */}
                      {teamBSubs.length > 0 && (
                        <div className="space-y-1.5">
                          {teamBSubs.map((sub, sIdx) => (
                            <div key={sub.id} className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-amber-400 font-bold">#{sIdx + 1} د{sub.minute}'</span>
                                <span className="text-slate-500">•</span>
                                <span className="text-emerald-400 font-bold">دخول {sub.playerIn}</span>
                                <span className="text-slate-500 mx-1">⮂</span>
                                <span className="text-rose-400">خروج {sub.playerOut}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSubInModal('B', sub.id)}
                                className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                                title="حذف هذا التبديل"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ======================= */}
                    {/* 🟨🟥 الإنذارات والبطاقات الحمراء والطرود Team B */}
                    {/* ======================= */}
                    <div className="space-y-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-rose-400 flex items-center gap-1.5">
                            <span>🟨🟥 الإنذارات والبطاقات الحمراء (الطرود)</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                            {teamBCards.length} بطاقة
                          </span>
                        </div>
                      </div>

                      {/* Add Card inputs */}
                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                        <div className="grid grid-cols-12 gap-2 items-center text-xs">
                          <div className="col-span-3 sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 block mb-0.5">الدقيقة:</label>
                            <input
                              type="number"
                              min="1"
                              max="120"
                              value={newCardB.minute}
                              onChange={(e) => setNewCardB(prev => ({ ...prev, minute: Number(e.target.value) || 1 }))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                            />
                          </div>
                          <div className="col-span-9 sm:col-span-4">
                            <label className="text-[10px] font-bold text-slate-300 block mb-0.5">اسم اللاعب:</label>
                            <input
                              type="text"
                              list={`datalist-squad-B-${recordingResultMatch.id}`}
                              placeholder="اسم اللاعب الحاصل على البطاقة..."
                              value={newCardB.playerName}
                              onChange={(e) => setNewCardB(prev => ({ ...prev, playerName: e.target.value }))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                            />
                          </div>
                          <div className="col-span-7 sm:col-span-3">
                            <label className="text-[10px] font-bold text-slate-300 block mb-0.5">نوع البطاقة:</label>
                            <select
                              value={newCardB.cardType}
                              onChange={(e) => setNewCardB(prev => ({ ...prev, cardType: e.target.value as CardType }))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-bold"
                            >
                              <option value="yellow">🟨 إنذار أصفر</option>
                              <option value="red">🟥 كارت أحمر مباشر (طرد)</option>
                              <option value="second_yellow">🟨🟥 إنذار ثانٍ ثم طرد</option>
                            </select>
                          </div>
                          <div className="col-span-5 sm:col-span-3">
                            <label className="text-[10px] font-bold text-slate-400 block mb-0.5">السبب (اختياري):</label>
                            <input
                              type="text"
                              placeholder="تدخل عنيف، اعتراض..."
                              value={newCardB.reason}
                              onChange={(e) => setNewCardB(prev => ({ ...prev, reason: e.target.value }))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleAddCardInModal('B')}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-lg cursor-pointer transition-colors"
                          >
                            + إضافة البطاقة
                          </button>
                        </div>
                      </div>

                      {/* Cards list */}
                      {teamBCards.length > 0 && (
                        <div className="space-y-1.5">
                          {teamBCards.map((c) => (
                            <div key={c.id} className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                                  c.cardType === 'yellow'
                                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                    : c.cardType === 'red'
                                    ? 'bg-rose-600/30 text-rose-300 border border-rose-600/40'
                                    : 'bg-rose-600/40 text-rose-200 border border-amber-400/40'
                                }`}>
                                  {c.cardType === 'yellow' && '🟨 إنذار أصفر'}
                                  {c.cardType === 'red' && '🟥 طرد مباشر (أحمر)'}
                                  {c.cardType === 'second_yellow' && '🟨🟥 إنذار ثانٍ وطرد'}
                                </span>
                                <span className="font-mono text-slate-400 font-bold">د{c.minute}'</span>
                                <strong className="text-white">{c.playerName}</strong>
                                {c.reason && <span className="text-slate-400 text-[11px]">({c.reason})</span>}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveCardInModal('B', c.id)}
                                className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                                title="حذف هذه البطاقة"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Preview Box & Optional Manual Notes */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      <span>معاينة الملخص المحسوب تلقائياً (لتحديث جدول الهدافين وصناع اللعب):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowManualNotesInput(!showManualNotesInput)}
                      className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      {showManualNotesInput ? 'إخفاء الملاحظات الإضافية' : '+ كتابة ملاحظات إضافية'}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
                    {liveSummary ? liveSummary : <span className="text-slate-500 font-sans">لا توجد أهداف أو أسيستات مدخلة بعد (ستظهر هنا تلقائياً عند إدخال اللاعبين أعلاه)</span>}
                  </div>

                  {showManualNotesInput && (
                    <div className="pt-2">
                      <input
                        type="text"
                        placeholder="أي ملاحظات إضافية (مثل: ركلات ترجيح، بطاقات صفراء، إلخ)..."
                        value={manualResultNotes}
                        onChange={(e) => setManualResultNotes(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setRecordingResultMatch(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>اعتماد وحفظ النتيجة والأهداف</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL: TEAM ALL MATCHES VIEW (عرض ماتشات الفرقة كاملة) */}
      {/* ========================================================================= */}
      {selectedTeamNameForMatches && (() => {
        const teamObj = teams.find(t => t.name === selectedTeamNameForMatches);
        const groupStandings = teamObj ? getGroupStandings(teamObj.group) : [];
        const dynamicTeamData = groupStandings.find(t => t.name === selectedTeamNameForMatches) || teamObj;
        
        const allTeamMatches = matches.filter(
          m => m.teamA === selectedTeamNameForMatches || m.teamB === selectedTeamNameForMatches
        );

        const displayedMatches = allTeamMatches.filter(m => {
          if (teamMatchesModalFilter === 'scheduled') return m.isScheduled;
          if (teamMatchesModalFilter === 'finished') return m.status === 'finished' || m.status === 'live';
          return true;
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/50 p-5 md:p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${dynamicTeamData?.logoColor || 'from-emerald-600 to-teal-500'} flex items-center justify-center font-black text-xl text-white shadow-xl ring-2 ring-white/10 shrink-0`}>
                    {selectedTeamNameForMatches.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-500/30">
                        المجموعة {dynamicTeamData?.group || 'A'}
                      </span>
                      <span className="text-xs text-slate-400">
                        جدول مباريات الفريق الـ 5 كاملة في دور المجموعات
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                      <span>مباريات فريق: {selectedTeamNameForMatches}</span>
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  {dynamicTeamData && (
                    <button
                      onClick={() => setEditingTeam(dynamicTeamData)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      تعديل الفريق
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedTeamNameForMatches(null)}
                    className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="p-4 md:p-5 bg-slate-950/60 border-b border-slate-800/80">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs">
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">لعب</span>
                    <strong className="text-base font-black text-white">{dynamicTeamData?.played || 0} / 5</strong>
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">فاز</span>
                    <strong className="text-base font-black text-emerald-400">{dynamicTeamData?.won || 0}</strong>
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">تعادل</span>
                    <strong className="text-base font-black text-amber-400">{dynamicTeamData?.drawn || 0}</strong>
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">خسر</span>
                    <strong className="text-base font-black text-rose-400">{dynamicTeamData?.lost || 0}</strong>
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">له / عليه</span>
                    <strong className="text-sm font-black text-slate-200">{dynamicTeamData?.gf || 0} / {dynamicTeamData?.ga || 0}</strong>
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">فارق الأهداف</span>
                    <strong className={`text-base font-black ${(dynamicTeamData?.gd || 0) > 0 ? 'text-emerald-400' : (dynamicTeamData?.gd || 0) < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {(dynamicTeamData?.gd || 0) > 0 ? `+${dynamicTeamData?.gd}` : dynamicTeamData?.gd || 0}
                    </strong>
                  </div>
                  <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-emerald-300 block">النقاط</span>
                    <strong className="text-base font-black text-amber-400">{dynamicTeamData?.points || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Sub Filter */}
              <div className="p-4 bg-slate-900 flex items-center justify-between gap-3 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold ml-1">عرض:</span>
                  <button
                    onClick={() => setTeamMatchesModalFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      teamMatchesModalFilter === 'all' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    كل المباريات ({allTeamMatches.length})
                  </button>
                  <button
                    onClick={() => setTeamMatchesModalFilter('scheduled')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      teamMatchesModalFilter === 'scheduled' ? 'bg-teal-600 text-white shadow' : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    المحددة الموعد
                  </button>
                  <button
                    onClick={() => setTeamMatchesModalFilter('finished')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      teamMatchesModalFilter === 'finished' ? 'bg-slate-700 text-white shadow' : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    المنتهية
                  </button>
                </div>
              </div>

              {/* Matches List */}
              <div className="p-4 md:p-6 max-h-[60vh] overflow-y-auto space-y-3">
                {displayedMatches.map((m) => {
                  const isTeamA = m.teamA === selectedTeamNameForMatches;
                  const opponentName = isTeamA ? m.teamB : m.teamA;
                  const myScore = isTeamA ? m.scoreA : m.scoreB;
                  const oppScore = isTeamA ? m.scoreB : m.scoreA;

                  return (
                    <div
                      key={m.id}
                      className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-900 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20 text-[11px]">
                            {m.stage === 'group' ? `الجولة ${m.round}` : m.stageName}
                          </span>
                          {m.isScheduled ? (
                            <span className="text-slate-300 font-mono text-[11px] flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-emerald-400" />
                              {m.date} • {m.time} • {m.pitch}
                            </span>
                          ) : (
                            <span className="text-amber-400 text-[11px] font-bold">
                              لم يُحدد الموعد بعد
                            </span>
                          )}
                        </div>

                        <div>
                          {m.status === 'finished' ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px]">
                              انتهت FT
                            </span>
                          ) : m.status === 'live' ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold text-[10px] animate-pulse">
                              مباشر د{m.minute}
                            </span>
                          ) : m.isScheduled ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px]">
                              مجدولة
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                              بانتظار تحديد الموعد
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Opponents & Score */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-300 font-black text-xs flex items-center justify-center shrink-0 border border-emerald-500/40">
                            {selectedTeamNameForMatches.charAt(0)}
                          </div>
                          <div>
                            <strong className="text-xs md:text-sm font-bold text-white block">{selectedTeamNameForMatches}</strong>
                            <span className="text-[10px] text-emerald-400">فريقك المختار</span>
                          </div>
                        </div>

                        <div className="shrink-0 text-center px-3 py-1 bg-slate-900 rounded-xl border border-slate-800 min-w-[70px]">
                          {m.scoreA !== null && m.scoreB !== null ? (
                            <span className="font-mono text-base font-black text-emerald-400">
                              {m.scoreA} - {m.scoreB}
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-slate-500">VS</span>
                          )}
                        </div>

                        <div className="flex-1 flex items-center justify-end gap-2 text-left">
                          <div className="text-right">
                            <button
                              onClick={() => setSelectedTeamNameForMatches(opponentName)}
                              className="text-xs md:text-sm font-bold text-slate-200 hover:text-emerald-300 transition-colors cursor-pointer block truncate"
                            >
                              {opponentName}
                            </button>
                            <span className="text-[10px] text-slate-400">الخصم (اضغط لعرضه)</span>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 font-black text-xs flex items-center justify-center shrink-0">
                            {opponentName.charAt(0)}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-500">
                          {m.recordedBy ? `سُجلت بواسطة: ${m.recordedBy}` : 'مباراة ضمن البطولة'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenScheduleModal(m)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-bold border border-slate-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{m.isScheduled ? 'تعديل الميعاد' : 'تحديد الميعاد'}</span>
                          </button>
                          <button
                            onClick={() => handleOpenResultModal(m)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>تسجيل النتيجة</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  إجمالي مباريات دور المجموعات لهذا الفريق: <strong className="text-emerald-400">5 مباريات كاملة</strong>
                </span>
                <button
                  onClick={() => setSelectedTeamNameForMatches(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL: EDIT TEAM */}
      {/* ========================================================================= */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                تعديل اسم الفريق ومجموعته
              </h3>
              <button
                onClick={() => setEditingTeam(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTeamEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم الفريق *</label>
                <input
                  type="text"
                  required
                  value={editingTeam.name}
                  onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">المجموعة (A - H) *</label>
                <select
                  value={editingTeam.group}
                  onChange={(e) => setEditingTeam({ ...editingTeam, group: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(g => (
                    <option key={g} value={g}>المجموعة {g}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  حفظ التعديل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BULK EDIT / IMPORT TEAMS ACROSS THE 8 GROUPS */}
      {/* ========================================================================= */}
      {isBulkEditingTeams && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-5xl w-full p-5 md:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-md">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black text-white">
                    تعديل وإدخال أسماء الفرق والمجاميع (Bulk Edit & Paste)
                  </h3>
                  <p className="text-xs text-slate-400">
                    48 فريقاً موزعين على 8 مجموعات (A حتى H) • 6 فرق بكل مجموعة
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsBulkEditingTeams(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
              <button
                onClick={() => setBulkEditTab('by_group')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  bulkEditTab === 'by_group'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                تعديل المجموعات (A إلى H)
              </button>
              <button
                onClick={() => setBulkEditTab('paste_text')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  bulkEditTab === 'paste_text'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                لصق نصي سريع (Paste Text)
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto pr-1">
              {bulkEditTab === 'by_group' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((grp) => (
                    <div key={grp} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <strong className="text-xs font-black text-amber-400">المجموعة {grp}</strong>
                        <span className="text-[10px] text-slate-500">6 فرق</span>
                      </div>
                      <div className="space-y-1.5">
                        {[0, 1, 2, 3, 4, 5].map((idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="w-5 text-[10px] font-mono text-slate-500 shrink-0 text-center">
                              {idx + 1}
                            </span>
                            <input
                              type="text"
                              value={bulkTeamsByGroup[grp]?.[idx] || ''}
                              onChange={(e) => {
                                const updated = { ...bulkTeamsByGroup };
                                if (!updated[grp]) updated[grp] = [];
                                updated[grp][idx] = e.target.value;
                                setBulkTeamsByGroup(updated);
                              }}
                              placeholder={`فريق ${idx + 1}`}
                              className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg px-2.5 py-1 text-xs text-white"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {bulkEditTab === 'paste_text' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                    <p className="font-bold text-amber-300">📋 تعليمات اللصق النصي السريع:</p>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      الصق قائمة الـ 48 فريقاً سطراً بسطر أو مجمعة بأسماء المجموعات وسيتم تحليلها وتوزيعها تلقائياً بالترتيب.
                    </p>
                  </div>

                  <textarea
                    rows={12}
                    value={bulkTeamsText}
                    onChange={(e) => setBulkTeamsText(e.target.value)}
                    placeholder="برشلونة\nانجلترا\nميلان\n..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 leading-relaxed"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      عدد الأسطر: {bulkTeamsText.split('\n').filter(x => x.trim()).length} سطر
                    </span>

                    <button
                      type="button"
                      onClick={handleApplyPastedTeamsText}
                      className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-teal-600/20 cursor-pointer"
                    >
                      <span>تطبيق الأسماء وتحليلها على المجموعات الـ 8</span>
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800 shrink-0">
              <span className="text-xs text-slate-400">
                ⚡ سيتم مزامنة جدول المباريات ودور الـ 32 تلقائياً مع الأسماء الجديدة.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkEditingTeams(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBulkTeams(bulkTeamsByGroup)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  حفظ وتحديث أسماء الفرق والجدول بالكامل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SINGLE MATCHUP QUICK EDIT (مين هيلاعب مين) */}
      {/* ========================================================================= */}
      {editingMatchPairing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    تعديل طرفي المباراة (مين هيلاعب مين)
                  </h3>
                  <span className="text-xs text-slate-400">
                    {editingMatchPairing.stageName} • {editingMatchPairing.stage === 'group' ? `المجموعة ${editingMatchPairing.group} - الجولة ${editingMatchPairing.round}` : editingMatchPairing.stageName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditingMatchPairing(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSingleMatchup} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    الفريق الأول (Team A)
                  </label>
                  <select
                    value={singlePairingForm.teamA}
                    onChange={(e) => setSinglePairingForm({ ...singlePairingForm, teamA: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="">اختر الفريق الأول...</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} (المجموعة {t.group})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    الفريق الثاني (Team B)
                  </label>
                  <select
                    value={singlePairingForm.teamB}
                    onChange={(e) => setSinglePairingForm({ ...singlePairingForm, teamB: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="">اختر الفريق الثاني...</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} (المجموعة {t.group})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setSinglePairingForm({ teamA: singlePairingForm.teamB, teamB: singlePairingForm.teamA })}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span>تبديل طرفي المواجهة</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMatchPairing(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  حفظ طرفي المباراة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ROUND MATCHUP ORGANIZER (مين هيلاعب مين لكل جولة ودور) */}
      {/* ========================================================================= */}
      <RoundMatchupOrganizerModal
        isOpen={isRoundOrganizerOpen}
        onClose={() => setIsRoundOrganizerOpen(false)}
        matches={matches}
        teams={teams}
        onSaveMatches={(updatedMatches) => {
          setMatches(updatedMatches);
          setIsRoundOrganizerOpen(false);
          confetti({ particleCount: 60, spread: 70 });
        }}
        initialGroup={roundOrganizerConfig.group}
        initialRound={roundOrganizerConfig.round}
        initialStage={roundOrganizerConfig.stage}
      />

      {/* ========================================================================= */}
      {/* MODAL: AUTHENTICATION & LOGIN (جامعة النيل @nu.edu.eg) */}
      {/* ========================================================================= */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        users={users}
        onLogin={handleLogin}
        onRegister={handleAddUser}
        onLogout={handleLogout}
        onOpenFullLoginPage={() => {
          setIsAuthModalOpen(false);
          handleLogout();
        }}
        onOpenFullSignupPage={() => {
          setIsAuthModalOpen(false);
          setCurrentUser(null);
          setAuthView('signup');
        }}
      />

      {/* Footer */}
      <footer className="border-t border-emerald-950/80 bg-slate-950/90 py-5 px-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-300">دوري جامعة النيل لكرة القدم 2026</span>
          </div>
          <div>
            نظام بطولة كرة القدم لـ 48 فريقاً • إدارة المواعيد والنتائج والتأهل
          </div>
        </div>
      </footer>

    </div>
  );
}
