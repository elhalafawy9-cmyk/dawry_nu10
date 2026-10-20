import React, { useState, useMemo, useEffect } from 'react';
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
import { PlayerTeamPortalPage } from './components/PlayerTeamPortalPage';
import { PlayerApprovalsModal } from './components/PlayerApprovalsModal';
import { MatchAlertComposerModal } from './components/MatchAlertComposerModal';
import { MatchAlertsListModal } from './components/MatchAlertsListModal';
import { MatchLineupModal } from './components/MatchLineupModal';
import { AssignTeamManagersPage } from './components/AssignTeamManagersPage';
import { LeagueRegistrationPage } from './components/LeagueRegistrationPage';
import { BackupModal } from './components/BackupModal';
import { AdminControlCenter } from './components/AdminControlCenter';
import { ExportStandingsPDFModal } from './components/ExportStandingsPDFModal';
import { GeminiChatbotModal } from './components/GeminiChatbotModal';
import { CsvTournamentUploadModal } from './components/CsvTournamentUploadModal';
import { RosterAuditModal } from './components/RosterAuditModal';
import { FantasyLeaguePage } from './components/FantasyLeaguePage';
import { MatchPredictionsPage } from './components/MatchPredictionsPage';
import { MatchVoteModal } from './components/MatchVoteModal';
import { getMatchVotingState, loadUserVotes, MatchVoteOption } from './utils/predictions';
import { findDuplicatePlayers } from './utils/auditDuplicates';
import { 
  sanitizeTeamsList, 
  sanitizeSquads, 
  resolveCanonicalTeamName, 
  isSameTeam,
  getTeamBilingualInfo,
  addDeletedTeamName,
  clearDeletedTeamNames 
} from './utils/teamAliases';
import { 
  fetchServerUsers, 
  recordUserEnter, 
  registerUserOnServer, 
  updateUserOnServer, 
  deleteUserOnServer, 
  syncLocalUsersToServer, 
  sendUserHeartbeat,
  assignTeamManagerOnServer,
  unassignTeamManagerOnServer,
  getLocalSettings,
  saveLocalSettings,
  fetchServerSettings,
  updateServerSettings,
  getLocalApplications,
  fetchServerApplications,
  getLocalSeasons,
  fetchServerSeasons,
  TeamApplication,
  TournamentSeason,
  ArchivedSeasonSnapshot,
  fetchServerArchivedSnapshots,
  getLocalArchivedSnapshots,
  saveLocalArchivedSnapshots,
  archiveSeasonOnServer,
  createServerSeason,
  updateServerApplicationStatus,
  fetchServerMatches,
  saveServerMatches,
} from './utils/apiSync';
import { TeamLogo, getTeamLogoUrl } from './utils/teamLogos';
import { 
  MatchScheduleNotification, 
  loadStoredMatchAlerts, 
  saveStoredMatchAlerts 
} from './utils/notifications';
import { 
  AppUser, 
  UserRole, 
  PERMANENT_ADMIN_EMAIL, 
  PERMANENT_ADMIN_PASSWORD,
  INITIAL_USERS,
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
  generateInitialSquads,
  clearAllSquads,
  PlayerRegistrationRequest,
  loadStoredPlayerRequests,
  saveStoredPlayerRequests,
  loadStoredSquads,
  saveStoredSquads,
  OFFICIAL_APPROVED_ROSTERS
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
  UserPlus,
  Bell,
  Send,
  Key,
  PlusCircle,
  Archive,
  Database,
  FileDown,
  Bot,
  Vote
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
  logoUrl?: string; // رابط أو صورة شعار الفريق
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
const RAW_INITIAL_TEAMS: Team[] = [
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
  { id: 't13', name: 'بلباو', group: 'C', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-white' },
  { id: 't14', name: 'انتر ميلان', group: 'C', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-blue-800 to-black' },
  { id: 't15', name: 'البرازيل', group: 'C', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-yellow-400 to-emerald-600' },
  { id: 't16', name: 'نيوكاسل', group: 'C', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-black to-slate-400' },
  { id: 't17', name: 'النصر', group: 'C', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-yellow-500 to-blue-600' },
  { id: 't18', name: 'مصر', group: 'C', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-black' },

  // Group D (المجموعة D)
  { id: 't19', name: 'باريس', group: 'D', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-blue-900 to-red-600' },
  { id: 't20', name: 'اسبانيا', group: 'D', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-yellow-500' },
  { id: 't21', name: 'هولندا', group: 'D', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-orange-500 to-amber-600' },
  { id: 't22', name: 'غزل المحلة', group: 'D', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-cyan-400 to-black' },
  { id: 't23', name: 'اتلتيكو مدريد', group: 'D', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-blue-800' },
  { id: 't24', name: 'المانيا', group: 'D', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-black to-red-600' },

  // Group E (المجموعة E)
  { id: 't25', name: 'استون فيلا', group: 'E', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-purple-900 to-sky-400' },
  { id: 't26', name: 'امريكا', group: 'E', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-blue-700 to-red-600' },
  { id: 't27', name: 'ارسنال', group: 'E', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-white' },
  { id: 't28', name: 'جنوب افريقيا', group: 'E', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-emerald-600 to-yellow-500' },
  { id: 't29', name: 'المغرب', group: 'E', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-600 to-emerald-600' },
  { id: 't30', name: 'طرابزون', group: 'E', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-800 to-sky-600' },

  // Group F (المجموعة F)
  { id: 't31', name: 'بروسيا', group: 'F', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-yellow-400 to-black' },
  { id: 't32', name: 'بايرن', group: 'F', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-red-700 to-red-500' },
  { id: 't33', name: 'ريال مدريد', group: 'F', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-slate-100 to-purple-600' },
  { id: 't34', name: 'ايطاليا', group: 'F', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-blue-600 to-blue-800' },
  { id: 't35', name: 'السعودية', group: 'F', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, logoColor: 'from-emerald-700 to-green-600' },
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

export const INITIAL_TEAMS: Team[] = RAW_INITIAL_TEAMS.map(t => ({
  ...t,
  logoUrl: t.logoUrl || getTeamLogoUrl(t.name) || undefined,
}));

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
    'matches_control' | 'spectator_portal' | 'team_manager' | 'my_team' | 'users_directory' | 'assign_managers' | 'groups' | 'bracket' | 'teams_roster' | 'stats_leaders' | 'manage' | 'league_registration' | 'fantasy_league' | 'match_predictions'
  >('matches_control');
  
  // Auth & Nile University Users State - Starts on Login Page directly
  const [users, setUsers] = useState<AppUser[]>(() => loadStoredUsers());
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Role Preview for Admin to test each role's view (معاينة الصلاحيات)
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);

  const effectiveRole: UserRole = (currentUser?.role === 'admin' && previewRole)
    ? previewRole
    : (currentUser?.role || 'spectator');

  const isAdmin = effectiveRole === 'admin';
  const isTeamManager = effectiveRole === 'team_manager';
  const isPlayer = effectiveRole === 'player';
  const isSpectator = effectiveRole === 'spectator';

  // Real-Time Server Sync State
  const [isSyncingUsers, setIsSyncingUsers] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Tournament Player Editing Window State (مفتوح حالياً للفرق ويمكن تغييره في أي وقت من لوحة التحكم)
  const [isPlayerEditingOpen, setIsPlayerEditingOpen] = useState<boolean>(() => {
    return getLocalSettings().isPlayerEditingOpen;
  });

  // League Registration Portal & Annual Season Management State
  const [isLeagueRegistrationVisible, setIsLeagueRegistrationVisible] = useState<boolean>(() => {
    return getLocalSettings().isRegistrationVisibleToPublic !== false;
  });
  const [isLeagueRegistrationOpen, setIsLeagueRegistrationOpen] = useState<boolean>(() => {
    return getLocalSettings().isRegistrationOpen !== false;
  });
  const [applications, setApplications] = useState<TeamApplication[]>(() => getLocalApplications());
  const [seasons, setSeasons] = useState<TournamentSeason[]>(() => getLocalSeasons());
  const [activeSeasonId, setActiveSeasonId] = useState<string>(() => getLocalSettings().activeSeasonId || 'season_2026');
  const [currentSeasonName, setCurrentSeasonName] = useState<string>(() => getLocalSettings().currentSeasonName || 'دوري جامعة النيل 2026/2027 (48 فريقاً)');
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string>(() => getLocalSettings().currentAcademicYear || '2026 / 2027');

  // Archived Seasons Snapshots in Database
  const [archivedSnapshots, setArchivedSnapshots] = useState<ArchivedSeasonSnapshot[]>(() => getLocalArchivedSnapshots());

  // Admin New Season & Archive Modals
  const [isAdminNewSeasonModalOpen, setIsAdminNewSeasonModalOpen] = useState<boolean>(false);
  const [isAdminArchiveModalOpen, setIsAdminArchiveModalOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState<boolean>(false);
  const [isGeminiChatbotOpen, setIsGeminiChatbotOpen] = useState<boolean>(false);

  // Match Voting Modal State (صوّت لمباراة)
  const [isMatchVoteModalOpen, setIsMatchVoteModalOpen] = useState<boolean>(false);
  const [votingSelectedMatch, setVotingSelectedMatch] = useState<Match | null>(null);
  const [globalUserVotes, setGlobalUserVotes] = useState<Record<string, MatchVoteOption>>(() => {
    return loadUserVotes(currentUser?.id || 'guest_voter');
  });

  const handleOpenVoteModal = (match?: Match | null) => {
    if (match) {
      setVotingSelectedMatch(match);
    } else {
      const upcoming = matches.find(m => m.isScheduled && m.status !== 'finished' && getMatchVotingState(m).isOpen) || matches[0] || null;
      setVotingSelectedMatch(upcoming);
    }
    setGlobalUserVotes(loadUserVotes(currentUser?.id || 'guest_voter'));
    setIsMatchVoteModalOpen(true);
  };
  const [adminNewSeasonForm, setAdminNewSeasonForm] = useState({
    name: `دوري جامعة النيل ${new Date().getFullYear() + 1} - النسخة السادسة`,
    year: `${new Date().getFullYear()} / ${new Date().getFullYear() + 1}`,
    teamsCount: 48,
    archivePrevious: true,
    champion: '',
    runnerUp: '',
  });
  const [isStartingSeasonInAdmin, setIsStartingSeasonInAdmin] = useState<boolean>(false);

  const handleTogglePlayerEditing = async (nextState?: boolean) => {
    const updatedValue = typeof nextState === 'boolean' ? nextState : !isPlayerEditingOpen;
    setIsPlayerEditingOpen(updatedValue);
    saveLocalSettings({
      ...getLocalSettings(),
      isPlayerEditingOpen: updatedValue,
      updatedBy: currentUser?.email || 'admin',
      updatedAt: new Date().toISOString(),
    });
    try {
      await updateServerSettings({
        isPlayerEditingOpen: updatedValue,
        updatedBy: currentUser?.email || 'admin',
      });
    } catch (e) {
      console.warn('Failed to sync settings to server', e);
    }
    confetti({ particleCount: 35, spread: 45 });
  };

  const handleToggleRegistrationVisible = async (nextState?: boolean) => {
    const updatedValue = typeof nextState === 'boolean' ? nextState : !isLeagueRegistrationVisible;
    setIsLeagueRegistrationVisible(updatedValue);
    saveLocalSettings({
      ...getLocalSettings(),
      isRegistrationVisibleToPublic: updatedValue,
      updatedBy: currentUser?.email || 'admin',
      updatedAt: new Date().toISOString(),
    });
    try {
      await updateServerSettings({
        isRegistrationVisibleToPublic: updatedValue,
        updatedBy: currentUser?.email || 'admin',
      });
    } catch (e) {
      console.warn('Failed to sync registration visibility to server', e);
    }
    confetti({ particleCount: 35, spread: 45 });
  };

  const handleToggleRegistrationOpen = async (nextState?: boolean) => {
    const updatedValue = typeof nextState === 'boolean' ? nextState : !isLeagueRegistrationOpen;
    setIsLeagueRegistrationOpen(updatedValue);
    saveLocalSettings({
      ...getLocalSettings(),
      isRegistrationOpen: updatedValue,
      updatedBy: currentUser?.email || 'admin',
      updatedAt: new Date().toISOString(),
    });
    try {
      await updateServerSettings({
        isRegistrationOpen: updatedValue,
        updatedBy: currentUser?.email || 'admin',
      });
    } catch (e) {
      console.warn('Failed to sync registration open state to server', e);
    }
    confetti({ particleCount: 35, spread: 45 });
  };

  const handleRefreshApplications = async () => {
    try {
      const serverApps = await fetchServerApplications();
      if (serverApps) setApplications(serverApps);
    } catch (e) {
      console.warn('Failed to refresh applications', e);
    }
  };

  const handleRefreshSeasons = async () => {
    try {
      const res = await fetchServerSeasons();
      if (res && res.seasons) {
        setSeasons(res.seasons);
        if (res.activeSeasonId) setActiveSeasonId(res.activeSeasonId);
      }
    } catch (e) {
      console.warn('Failed to refresh seasons', e);
    }
  };

  const handleAddTeamToTournament = (teamData: { name: string; group: string; logoColor?: string }) => {
    setTeams((prev) => {
      if (prev.some((t) => t.name.trim().toLowerCase() === teamData.name.trim().toLowerCase())) {
        return prev;
      }
      const newTeam: Team = {
        id: `t_${Date.now()}`,
        name: teamData.name.trim(),
        group: teamData.group || 'A',
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0,
        logoColor: teamData.logoColor || 'from-emerald-600 to-teal-500',
      };
      const updated = [...prev, newTeam];
      try {
        localStorage.setItem('dawry_teams_custom_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setSquads((prev) => {
      if (prev[teamData.name]) return prev;
      const updated = {
        ...prev,
        [teamData.name]: [
          {
            id: `p_${Date.now()}_1`,
            name: `كابتن ${teamData.name}`,
            number: 10,
            position: 'وسط' as any,
            studentId: '20240001',
            isCaptain: true,
            isIdentityLocked: true,
          },
        ],
      };
      saveStoredSquads(updated);
      return updated;
    });
  };

  const handleAssignTeamManagerFromApplication = (userEmail: string, teamName: string) => {
    const targetUser = users.find((u) => u.email.toLowerCase() === userEmail.toLowerCase());
    if (targetUser) {
      const updated = users.map((u) =>
        u.id === targetUser.id
          ? { ...u, role: 'team_manager' as UserRole, managedTeamName: teamName }
          : u
      );
      setUsers(updated);
      saveStoredUsers(updated);
      try {
        assignTeamManagerOnServer({ email: targetUser.email, teamName });
      } catch {}
    }
  };

  const handleReviewApplication = async (id: string, status: 'approved' | 'rejected', reviewNotes?: string) => {
    try {
      await updateServerApplicationStatus(id, status, reviewNotes);
      const updated = await fetchServerApplications();
      if (updated) setApplications(updated);
    } catch (e) {
      console.error('Failed to review application', e);
    }
  };

  const handleRefreshArchivedSnapshots = async () => {
    try {
      const serverSnaps = await fetchServerArchivedSnapshots();
      if (serverSnaps) setArchivedSnapshots(serverSnaps);
    } catch (e) {
      console.warn('Failed to refresh archived snapshots', e);
    }
  };

  const handleUpdateSquadFromRegistration = (teamName: string, updatedSquad: Player[]) => {
    setSquads((prev) => {
      const updated = {
        ...prev,
        [teamName]: updatedSquad,
      };
      saveStoredSquads(updated);
      return updated;
    });
  };

  const handleStartNewSeasonZeroPoints = async (seasonData: {
    name: string;
    year: string;
    teamsCount: number;
    archivePrevious: boolean;
    champion?: string;
    runnerUp?: string;
  }) => {
    setIsStartingSeasonInAdmin(true);
    try {
      // 1. If archivePrevious is requested, archive current season
      if (seasonData.archivePrevious) {
        const finalMatch = matches.find(m => m.id === 'fin');
        let detectedChamp = seasonData.champion?.trim();
        let detectedRunner = seasonData.runnerUp?.trim();
        if (!detectedChamp && finalMatch && finalMatch.scoreA !== null && finalMatch.scoreB !== null) {
          if (finalMatch.scoreA > finalMatch.scoreB) {
            detectedChamp = finalMatch.teamA;
            detectedRunner = finalMatch.teamB;
          } else if (finalMatch.scoreB > finalMatch.scoreA) {
            detectedChamp = finalMatch.teamB;
            detectedRunner = finalMatch.teamA;
          }
        }

        try {
          await archiveSeasonOnServer({
            seasonId: activeSeasonId,
            seasonName: currentSeasonName,
            year: currentAcademicYear,
            champion: detectedChamp || 'لم يحدد بعد',
            runnerUp: detectedRunner || 'لم يحدد بعد',
            teams: teams,
            matches: matches,
            scorersSummary: `${tournamentStatsData.scorers.slice(0, 3).map(s => `${s.name} (${s.team}) - ${s.totalGoals} أهداف`).join(' · ')}`,
            archivedBy: currentUser?.email || 'admin',
          });
          await handleRefreshArchivedSnapshots();
        } catch (e) {
          console.warn('Failed to archive season on server', e);
        }
      }

      // 2. Create new season on server
      try {
        const res = await createServerSeason({
          name: seasonData.name,
          year: seasonData.year,
          teamsCount: seasonData.teamsCount,
          archivePrevious: seasonData.archivePrevious,
        });
        if (res && res.season) {
          setActiveSeasonId(res.season.id);
        }
      } catch (e) {
        console.warn('Failed to create server season', e);
      }

      // 3. Update current season name and academic year
      setCurrentSeasonName(seasonData.name);
      setCurrentAcademicYear(seasonData.year);
      saveLocalSettings({
        ...getLocalSettings(),
        activeSeasonId: `season_${Date.now()}`,
        currentSeasonName: seasonData.name,
        currentAcademicYear: seasonData.year,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || 'admin',
      });

      // 4. Reset all teams to ZERO points, 0 wins, 0 draws, 0 losses, 0 goals
      const resetTeamsList: Team[] = teams.map(t => ({
        ...t,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0,
      }));
      setTeams(resetTeamsList);
      try {
        localStorage.setItem('dawry_teams_custom_v1', JSON.stringify(resetTeamsList));
      } catch {}

      // 5. Reset all matches to upcoming and zero/null scores
      const freshMatches: Match[] = INITIAL_MATCHES.map(m => ({
        ...m,
        scoreA: null,
        scoreB: null,
        status: 'upcoming' as const,
        minute: undefined,
        scorersSummary: undefined,
        recordedBy: undefined,
        events: [],
        lineups: undefined,
        substitutions: [],
        cards: [],
      }));
      setMatches(freshMatches);
      try {
        localStorage.setItem('dawry_matches_storage_v1', JSON.stringify(freshMatches));
      } catch {}

      await handleRefreshSeasons();
      setIsAdminNewSeasonModalOpen(false);
      confetti({ particleCount: 100, spread: 80 });
      alert(`تم إطلاق ${seasonData.name} بنجاح بصفر نقاط لجميع الفرق! 🏆⚡`);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء إطلاق الموسم الجديد');
    } finally {
      setIsStartingSeasonInAdmin(false);
    }
  };

  // Explicit sync function
  const handleRefreshUsersFromServer = async () => {
    setIsSyncingUsers(true);
    try {
      const serverUsers = await fetchServerUsers();
      if (serverUsers && Array.isArray(serverUsers)) {
        setUsers(serverUsers);
        saveStoredUsers(serverUsers);
        if (currentUser) {
          const matched = serverUsers.find(u => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase());
          if (matched) {
            setCurrentUser(matched);
            saveActiveUser(matched);
          }
        }
      }
      setLastSyncTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.warn('Sync failed', e);
    } finally {
      setIsSyncingUsers(false);
    }
  };

  // On App mount: sync local accounts to server, load latest users, and record entry
  useEffect(() => {
    let isMounted = true;

    const initSync = async () => {
      // 1. Sync local users to server so any accounts created offline are preserved
      const localUsers = loadStoredUsers();
      await syncLocalUsersToServer(localUsers);

      // 2. Fetch latest server users
      const serverUsers = await fetchServerUsers();
      if (serverUsers && isMounted) {
        setUsers(serverUsers);
      }

      // 3. Only restore session if active in this browser session (so LoginPage opens directly first on new visits)
      const hasSession = typeof window !== 'undefined' && sessionStorage.getItem('nu_football_session_active') === 'true';
      if (hasSession) {
        const active = loadActiveUser(serverUsers || localUsers);
        if (active && isMounted) {
          const updatedUsers = await recordUserEnter(active);
          if (updatedUsers && isMounted) {
            setUsers(updatedUsers);
            const freshActive = updatedUsers.find(u => u.id === active.id || u.email.toLowerCase() === active.email.toLowerCase());
            if (freshActive) {
              setCurrentUser(freshActive);
              saveActiveUser(freshActive);
            }
          }
        }
      }

      // 3.2. Fetch latest saved matches from server and sync
      const serverMatches = await fetchServerMatches();
      if (serverMatches && Array.isArray(serverMatches) && serverMatches.length > 0 && isMounted) {
        setMatches(serverMatches);
        try {
          localStorage.setItem('dawry_matches_storage_v2', JSON.stringify(serverMatches));
        } catch {}
      }

      // 3.5. Fetch tournament settings (isPlayerEditingOpen, isRegistrationVisibleToPublic, isRegistrationOpen)
      const serverSettings = await fetchServerSettings();
      if (serverSettings && isMounted) {
        if (typeof serverSettings.isPlayerEditingOpen === 'boolean') {
          setIsPlayerEditingOpen(serverSettings.isPlayerEditingOpen);
        }
        if (typeof serverSettings.isRegistrationVisibleToPublic === 'boolean') {
          setIsLeagueRegistrationVisible(serverSettings.isRegistrationVisibleToPublic);
        }
        if (typeof serverSettings.isRegistrationOpen === 'boolean') {
          setIsLeagueRegistrationOpen(serverSettings.isRegistrationOpen);
        }
        if (serverSettings.activeSeasonId) setActiveSeasonId(serverSettings.activeSeasonId);
        if (serverSettings.currentSeasonName) setCurrentSeasonName(serverSettings.currentSeasonName);
        if (serverSettings.currentAcademicYear) setCurrentAcademicYear(serverSettings.currentAcademicYear);
      }

      // 3.6. Fetch applications, seasons, and archived snapshots
      try {
        const [apps, seas, snaps] = await Promise.all([
          fetchServerApplications(),
          fetchServerSeasons(),
          fetchServerArchivedSnapshots(),
        ]);
        if (apps && isMounted) setApplications(apps);
        if (seas && seas.seasons && isMounted) {
          setSeasons(seas.seasons);
          if (seas.activeSeasonId) setActiveSeasonId(seas.activeSeasonId);
        }
        if (snaps && isMounted) setArchivedSnapshots(snaps);
      } catch {}

      if (isMounted) {
        setLastSyncTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    };

    initSync();

    // 4. Background polling every 5 seconds so when ANY user enters or registers on another phone/device,
    // they appear immediately in the admin's Users Directory page!
    const pollInterval = setInterval(() => {
      fetchServerUsers().then(latest => {
        if (latest && isMounted) {
          setUsers(latest);
          setLastSyncTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      });
      fetchServerSettings().then(st => {
        if (st && isMounted) {
          if (typeof st.isPlayerEditingOpen === 'boolean') {
            setIsPlayerEditingOpen(st.isPlayerEditingOpen);
          }
          if (typeof st.isRegistrationVisibleToPublic === 'boolean') {
            setIsLeagueRegistrationVisible(st.isRegistrationVisibleToPublic);
          }
          if (typeof st.isRegistrationOpen === 'boolean') {
            setIsLeagueRegistrationOpen(st.isRegistrationOpen);
          }
          if (st.activeSeasonId) setActiveSeasonId(st.activeSeasonId);
          if (st.currentSeasonName) setCurrentSeasonName(st.currentSeasonName);
        }
      });
      fetchServerApplications().then(apps => {
        if (apps && isMounted) setApplications(apps);
      });
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  // Heartbeat effect for active user
  useEffect(() => {
    if (!currentUser) return;
    const hbInterval = setInterval(() => {
      sendUserHeartbeat(currentUser.id);
    }, 20000);
  }, [currentUser?.id]);

  // One-time automatic cleanup to wipe out all numbers and old dummy data, keeping only clean 48 teams
  useEffect(() => {
    try {
      const wipedFlag = localStorage.getItem('dawry_data_wiped_teams_only_v5');
      if (!wipedFlag) {
        // 1. Clean zero teams
        const cleanTeams = INITIAL_TEAMS.map(t => ({
          ...t,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          points: 0,
          logoUrl: t.logoUrl || getTeamLogoUrl(t.name) || undefined,
        }));
        setTeams(cleanTeams);
        localStorage.setItem('dawry_teams_custom_v2', JSON.stringify(cleanTeams));
        localStorage.removeItem('dawry_teams_custom_v1');

        // 2. Clean upcoming matches
        const cleanMatches = INITIAL_MATCHES.map(m => ({
          ...m,
          scoreA: null,
          scoreB: null,
          status: 'upcoming' as const,
          minute: undefined,
          scorersSummary: undefined,
          recordedBy: undefined,
          isScheduled: false,
          lineups: undefined,
          substitutions: [],
          cards: [],
        }));
        setMatches(cleanMatches);
        localStorage.removeItem('dawry_matches_storage_v1');

        // 3. Clean empty squads for all teams so newly added players reflect cleanly
        const cleanSquads = generateInitialSquads(INITIAL_TEAMS.map(t => t.name));
        setSquads(cleanSquads);
        saveStoredSquads(cleanSquads);

        // 4. Wipe fantasy teams, prediction votes, and community votes
        try {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('nu_tournament_fantasy_team') || key.startsWith('nu_tournament_match_votes') || key.startsWith('nu_tournament_community_votes')) {
              localStorage.removeItem(key);
            }
          });
        } catch {}

        // 5. Clean requests and alerts
        setPlayerRequests([]);
        saveStoredPlayerRequests([]);
        setMatchAlerts([]);
        saveStoredMatchAlerts([]);

        localStorage.setItem('dawry_data_wiped_teams_only_v5', 'true');
      }
    } catch (e) {
      console.warn('Auto cleanup migration error:', e);
    }
  }, []);

  // Data States - All 48 teams start with clean 0 points (Sanitized against rogue/duplicate teams)
  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      const raw = localStorage.getItem('dawry_teams_custom_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Rename legacy 'نابولي' -> 'هولندا' and 'اياكس' -> 'السعودية' and 'سانتوس' -> 'بلباو' and 'كولومبيا' -> 'جنوب افريقيا'
          const renamed = parsed.map((t: Team) => {
            if (t.name === 'نابولي' || t.name === 'Napoli') {
              return { ...t, name: 'هولندا', logoColor: 'from-orange-500 to-amber-600', logoUrl: getTeamLogoUrl('هولندا') || undefined };
            }
            if (t.name === 'اياكس' || t.name === 'أياكس' || t.name === 'Ajax') {
              return { ...t, name: 'السعودية', logoColor: 'from-emerald-700 to-green-600', logoUrl: getTeamLogoUrl('السعودية') || undefined };
            }
            if (t.name === 'سانتوس' || t.name === 'Santos') {
              return { ...t, name: 'بلباو', logoColor: 'from-red-600 to-white', logoUrl: getTeamLogoUrl('بلباو') || undefined };
            }
            if (t.name === 'كولومبيا' || t.name === 'Colombia') {
              return { ...t, name: 'جنوب افريقيا', logoColor: 'from-emerald-600 to-yellow-500', logoUrl: getTeamLogoUrl('جنوب افريقيا') || undefined };
            }
            return t;
          });
          const cleaned = sanitizeTeamsList(renamed, INITIAL_TEAMS);
          const finalTeams = cleaned.map((t: Team) => ({
            ...t,
            logoUrl: t.logoUrl || getTeamLogoUrl(t.name) || undefined,
          }));
          localStorage.setItem('dawry_teams_custom_v2', JSON.stringify(finalTeams));
          return finalTeams;
        }
      }
      localStorage.removeItem('dawry_teams_custom_v1');
    } catch {}
    // Clean initial zero teams
    const zeroTeams = INITIAL_TEAMS.map(t => ({
      ...t,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
      logoUrl: t.logoUrl || getTeamLogoUrl(t.name) || undefined,
    }));
    try {
      localStorage.setItem('dawry_teams_custom_v2', JSON.stringify(zeroTeams));
    } catch {}
    return zeroTeams;
  });
  const [matches, setMatches] = useState<Match[]>(() => {
    try {
      const stored = localStorage.getItem('dawry_matches_storage_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_MATCHES.map(m => {
      let tA = m.teamA;
      let tB = m.teamB;
      if (tA === 'نابولي' || tA === 'Napoli') tA = 'هولندا';
      if (tA === 'اياكس' || tA === 'أياكس' || tA === 'Ajax') tA = 'السعودية';
      if (tA === 'سانتوس' || tA === 'Santos') tA = 'بلباو';
      if (tA === 'كولومبيا' || tA === 'Colombia') tA = 'جنوب افريقيا';
      if (tB === 'نابولي' || tB === 'Napoli') tB = 'هولندا';
      if (tB === 'اياكس' || tB === 'أياكس' || tB === 'Ajax') tB = 'السعودية';
      if (tB === 'سانتوس' || tB === 'Santos') tB = 'بلباو';
      if (tB === 'كولومبيا' || tB === 'Colombia') tB = 'جنوب افريقيا';
      return { ...m, teamA: tA, teamB: tB };
    });
  });

  const saveMatches = (newMatches: Match[]) => {
    setMatches(newMatches);
    try {
      localStorage.setItem('dawry_matches_storage_v2', JSON.stringify(newMatches));
    } catch {}
    saveServerMatches(newMatches);
  };
  const [scorekeepers, setScorekeepers] = useState<Scorekeeper[]>(INITIAL_SCOREKEEPERS);

  // Squads State (all 48 teams players) - Starts clean with empty squads for real player registration
  const [squads, setSquads] = useState<Record<string, Player[]>>(() => {
    const defaultTeamNames = INITIAL_TEAMS.map(t => t.name);
    const wipedFlag = localStorage.getItem('dawry_data_wiped_teams_only_v5');
    if (!wipedFlag) {
      const clean = generateInitialSquads(defaultTeamNames);
      saveStoredSquads(clean);
      return clean;
    }
    const loaded = loadStoredSquads(defaultTeamNames);
    if (loaded['نابولي'] && !loaded['هولندا']) {
      loaded['هولندا'] = loaded['نابولي'];
      delete loaded['نابولي'];
    }
    if (loaded['اياكس'] && !loaded['السعودية']) {
      loaded['السعودية'] = loaded['اياكس'];
      delete loaded['اياكس'];
    }
    if (loaded['سانتوس'] && !loaded['بلباو']) {
      loaded['بلباو'] = loaded['سانتوس'];
      delete loaded['سانتوس'];
    }
    if (loaded['كولومبيا'] && !loaded['جنوب افريقيا']) {
      loaded['جنوب افريقيا'] = loaded['كولومبيا'];
      delete loaded['كولومبيا'];
    }
    // Always inject Group A, B, C, D, E official rosters if empty or update Paris with latest page 80 revision
    Object.entries(OFFICIAL_APPROVED_ROSTERS).forEach(([tName, roster]) => {
      if (!loaded[tName] || loaded[tName].length === 0 || tName === 'باريس') {
        loaded[tName] = [...roster];
      }
    });
    const sanitized = sanitizeSquads(loaded, defaultTeamNames, true);
    saveStoredSquads(sanitized);
    return sanitized;
  });

  // Player Registration Requests State (طلبات قيد وتسجيل اللاعبين من مسؤولي الفرق)
  const [playerRequests, setPlayerRequests] = useState<PlayerRegistrationRequest[]>(() => loadStoredPlayerRequests());
  const [isApprovalsModalOpen, setIsApprovalsModalOpen] = useState<boolean>(false);

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
  const [globalDeleteTeamTarget, setGlobalDeleteTeamTarget] = useState<Team | null>(null);
  const [isAddingMatch, setIsAddingMatch] = useState<boolean>(false);

  // Form states for Match Schedule / Reschedule
  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    time: '04:00 م',
    pitch: 'الملعب الرئيسي (A)',
    notifyPlayers: true,
    notifyNote: '',
    notifyUrgency: 'high' as 'high' | 'normal',
  });

  // Match Schedule & Venue Alerts State (تنبيهات المواعيد والملاعب المعتمدة للاعبين)
  const [matchAlerts, setMatchAlerts] = useState<MatchScheduleNotification[]>(() => loadStoredMatchAlerts());
  const [isAlertComposerOpen, setIsAlertComposerOpen] = useState<boolean>(false);
  const [alertComposerMatch, setAlertComposerMatch] = useState<Match | null>(null);
  const [isAlertsListOpen, setIsAlertsListOpen] = useState<boolean>(false);
  const [isRosterAuditModalOpen, setIsRosterAuditModalOpen] = useState<boolean>(false);
  const [isCsvUploadModalOpen, setIsCsvUploadModalOpen] = useState<boolean>(false);

  // Forced Initial Password Change (for accounts like ahsaber@nu.edu.eg on first login)
  const [showFirstLoginPasswordModal, setShowFirstLoginPasswordModal] = useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [passwordChangeError, setPasswordChangeError] = useState<string>('');

  const duplicatePlayersCount = useMemo(() => {
    return findDuplicatePlayers(squads).length;
  }, [squads]);

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

  // Match Lineup Modal State (تحديد الأساسيين والبدلاء للمباراة قبل انطلاقها أو في أي وقت)
  const [editingLineupMatch, setEditingLineupMatch] = useState<Match | null>(null);

  // Lineup states inside the Result Recording Modal (تحديد وتعديل الأساسيين والبدلاء أثناء بدء الماتش أو تسجيل النتيجة)
  const [teamAStartersResult, setTeamAStartersResult] = useState<string[]>([]);
  const [teamABenchResult, setTeamABenchResult] = useState<string[]>([]);
  const [teamBStartersResult, setTeamBStartersResult] = useState<string[]>([]);
  const [teamBBenchResult, setTeamBBenchResult] = useState<string[]>([]);
  const [showLineupsInResultModal, setShowLineupsInResultModal] = useState<boolean>(true);

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

  // Manage Sub-tab: teams | scorekeepers | seasons_archive
  const [manageSubTab, setManageSubTab] = useState<'teams' | 'scorekeepers' | 'seasons_archive'>('teams');

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

  // --- مسح وتصفير كافة الأرقام والبيانات مع الإبقاء على الفرق فقط ---
  const handleCleanWipeKeepTeamsOnly = () => {
    if (!window.confirm('هل أنت متأكد من مسح وتصفير كافة الأرقام والإحصائيات والنتائج السابقة مع الإبقاء على الفرق الـ 48 نظيفة وجاهزة لقيد اللاعبين؟\n\n- سيتم تصفير أهداف ونقاط وترتيب جميع الفرق (0).\n- سيتم إعادة كل المباريات إلى قادمة بدون نتائج.\n- سيتم تفريغ تشكيلات الفرق لتسجيل اللاعبين الفعليين.\n- أي لاعب جديد تضيفه في أي فريق سيظهر فوراً في الفانتازي!')) {
      return;
    }

    const cleanZeroTeams = INITIAL_TEAMS.map(t => ({
      ...t,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
      logoUrl: t.logoUrl || getTeamLogoUrl(t.name) || undefined,
    }));
    setTeams(cleanZeroTeams);
    try {
      localStorage.setItem('dawry_teams_custom_v2', JSON.stringify(cleanZeroTeams));
      localStorage.removeItem('dawry_teams_custom_v1');
    } catch {}

    const freshMatches = INITIAL_MATCHES.map(m => ({
      ...m,
      scoreA: null,
      scoreB: null,
      status: 'upcoming' as const,
      minute: undefined,
      scorersSummary: undefined,
      recordedBy: undefined,
      isScheduled: false,
      lineups: undefined,
      substitutions: [],
      cards: [],
    }));
    setMatches(freshMatches);
    try {
      localStorage.removeItem('dawry_matches_storage_v1');
    } catch {}

    const cleanSquads = generateInitialSquads(INITIAL_TEAMS.map(t => t.name));
    setSquads(cleanSquads);
    saveStoredSquads(cleanSquads);

    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('nu_tournament_fantasy_team') || key.startsWith('nu_tournament_match_votes') || key.startsWith('nu_tournament_community_votes')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem('dawry_data_wiped_teams_only_v5', 'true');
    } catch {}

    setPlayerRequests([]);
    saveStoredPlayerRequests([]);
    setMatchAlerts([]);
    saveStoredMatchAlerts([]);

    confetti({ particleCount: 80, spread: 90 });
    alert('تم مسح وتصفير كافة الأرقام والبيانات بنجاح! تم الإبقاء على الفرق فقط. أي لاعب سيتم إضافته سيظهر تلقائياً وفورياً في الفانتازي! 🧹✨⚽');
  };

  // --- RESTORE BACKUP & RESET TO ZERO HANDLERS ---
  const handleRestoreComplete = (restored: {
    users?: AppUser[];
    teams?: Team[];
    matches?: Match[];
    squads?: Record<string, Player[]>;
    applications?: TeamApplication[];
    seasons?: TournamentSeason[];
    archivedSnapshots?: ArchivedSeasonSnapshot[];
    activeSeasonId?: string;
    currentSeasonName?: string;
    currentAcademicYear?: string;
  }) => {
    if (restored.users && restored.users.length > 0) {
      setUsers(restored.users);
      saveStoredUsers(restored.users);
      const matched = restored.users.find(u => u.id === currentUser?.id || u.email.toLowerCase() === currentUser?.email.toLowerCase()) || restored.users[0];
      if (matched) {
        setCurrentUser(matched);
        saveActiveUser(matched);
      }
    }
    if (restored.teams && restored.teams.length > 0) {
      setTeams(restored.teams);
      try {
        localStorage.setItem('dawry_teams_custom_v2', JSON.stringify(restored.teams));
      } catch {}
    }
    if (restored.matches && restored.matches.length > 0) {
      setMatches(restored.matches);
      try {
        localStorage.setItem('dawry_matches_storage_v1', JSON.stringify(restored.matches));
      } catch {}
    }
    if (restored.squads && typeof restored.squads === 'object') {
      setSquads(restored.squads);
      saveStoredSquads(restored.squads);
    }
    if (restored.applications) {
      setApplications(restored.applications);
    }
    if (restored.seasons) {
      setSeasons(restored.seasons);
    }
    if (restored.archivedSnapshots) {
      setArchivedSnapshots(restored.archivedSnapshots);
    }
    if (restored.activeSeasonId) setActiveSeasonId(restored.activeSeasonId);
    if (restored.currentSeasonName) setCurrentSeasonName(restored.currentSeasonName);
    if (restored.currentAcademicYear) setCurrentAcademicYear(restored.currentAcademicYear);
  };

  const handleResetToZero = () => {
    const zeroTeams = INITIAL_TEAMS.map(t => ({
      ...t,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
    }));
    setTeams(zeroTeams);
    try {
      localStorage.setItem('dawry_teams_custom_v2', JSON.stringify(zeroTeams));
      localStorage.removeItem('dawry_teams_custom_v1');
    } catch {}

    const freshMatches = INITIAL_MATCHES.map(m => ({
      ...m,
      scoreA: null,
      scoreB: null,
      status: 'upcoming' as const,
      minute: undefined,
      scorersSummary: undefined,
      recordedBy: undefined,
      isScheduled: false,
      lineups: undefined,
      substitutions: [],
      cards: [],
    }));
    setMatches(freshMatches);
    try {
      localStorage.removeItem('dawry_matches_storage_v1');
    } catch {}

    setUsers(INITIAL_USERS);
    saveStoredUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    saveActiveUser(INITIAL_USERS[0]);

    setApplications([]);
    setArchivedSnapshots([]);
    setMatchAlerts([]);
    saveStoredMatchAlerts([]);
    setPlayerRequests([]);
    saveStoredPlayerRequests([]);
  };

  // Unified Squads Updater that persists to storage automatically
  const handleUpdateSquads = (updatedSquads: Record<string, Player[]>) => {
    setSquads(updatedSquads);
    saveStoredSquads(updatedSquads);
  };

  // Action to empty all player rosters across all teams (تفريغ جميع الفرق)
  const handleClearAllSquads = () => {
    const empty = clearAllSquads(teams.map(t => t.name));
    setSquads(empty);
    saveStoredSquads(empty);
    confetti({ particleCount: 70, spread: 80 });
  };

  // Action to delete a single team completely from the tournament (مسح / حذف فريق)
  const handleDeleteTeam = (teamNameOrId: string) => {
    const target = teams.find(t => t.id === teamNameOrId || t.name === teamNameOrId);
    if (!target) return;
    const teamName = target.name;

    // 1. Mark as deleted in storage so sanitizer doesn't resurrect it
    addDeletedTeamName(teamName);

    // 2. Remove team from teams state and storage
    const updatedTeams = teams.filter(t => t.id !== target.id && t.name !== teamName);
    setTeams(updatedTeams);
    try {
      localStorage.setItem('dawry_teams_custom_v2', JSON.stringify(updatedTeams));
    } catch {}

    // 3. Remove team squad
    setSquads(prev => {
      const next = { ...prev };
      delete next[teamName];
      saveStoredSquads(next);
      return next;
    });

    // 4. Remove matches involving this team
    setMatches(prev => {
      const next = prev.filter(m => m.teamA !== teamName && m.teamB !== teamName);
      try {
        localStorage.setItem('dawry_matches_storage_v1', JSON.stringify(next));
      } catch {}
      return next;
    });

    // 5. Unassign any manager registered for this team
    setUsers(prev => {
      const next = prev.map(u => u.managedTeamName === teamName ? { ...u, managedTeamName: undefined, role: 'spectator' as const } : u);
      try {
        localStorage.setItem('dawry_users_data_v1', JSON.stringify(next));
      } catch {}
      return next;
    });

    confetti({ particleCount: 50, spread: 70 });
  };

  // Action to purge newly added teams (like "Atlético Madrid") and players, and unify bilingual names
  const handlePurgeNewTeamsAndUnifyBilingual = () => {
    clearDeletedTeamNames();

    // 1. Reset teams strictly to 48 official teams
    const cleanZeroTeams = INITIAL_TEAMS.map(t => ({
      ...t,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
      logoUrl: t.logoUrl || getTeamLogoUrl(t.name) || undefined,
    }));
    setTeams(cleanZeroTeams);
    try {
      localStorage.setItem('dawry_teams_custom_v2', JSON.stringify(cleanZeroTeams));
      localStorage.removeItem('dawry_teams_custom_v1');
    } catch {}

    // 2. Reset squads strictly to clean 48 teams
    const cleanSquads = generateInitialSquads(INITIAL_TEAMS.map(t => t.name));
    setSquads(cleanSquads);
    saveStoredSquads(cleanSquads);

    confetti({ particleCount: 60, spread: 80 });
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

  // --- PLAYER REGISTRATION & MODIFICATION APPROVAL HANDLERS ---
  // 1. Team Manager requests a new player registration (must be approved by Admin)
  const handleRequestAddPlayer = (reqData: Omit<PlayerRegistrationRequest, 'id' | 'requestedAt' | 'status'>) => {
    const newReq: PlayerRegistrationRequest = {
      ...reqData,
      type: 'add',
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      requestedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'pending',
    };

    setPlayerRequests(prev => {
      const updated = [newReq, ...prev];
      saveStoredPlayerRequests(updated);
      return updated;
    });

    confetti({ particleCount: 30, spread: 50 });
  };

  // 2. Team Manager requests to EDIT an existing locked player (sent to Admin for approval)
  const handleRequestEditPlayer = (reqData: Omit<PlayerRegistrationRequest, 'id' | 'requestedAt' | 'status'>) => {
    const newReq: PlayerRegistrationRequest = {
      ...reqData,
      type: 'edit',
      id: `req_edit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      requestedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'pending',
    };

    setPlayerRequests(prev => {
      const updated = [newReq, ...prev];
      saveStoredPlayerRequests(updated);
      return updated;
    });

    confetti({ particleCount: 30, spread: 50 });
    alert(`تم إرسال طلب تعديل بيانات اللاعب (${reqData.playerName}) إلى مدير البطولة (Admin) لمراجعته والموافقة عليه! ⏳📩`);
  };

  // 3. Admin approves request (Add or Edit)
  const handleApprovePlayerRequest = (requestId: string) => {
    const target = playerRequests.find(r => r.id === requestId);
    if (!target) return;

    if (target.type === 'edit') {
      // Apply modification to existing player
      setSquads(prev => {
        const teamSquad = prev[target.teamName] || [];
        const updatedSquad = teamSquad.map(p => {
          const isTargetPlayer = target.playerId ? p.id === target.playerId : (target.originalPlayer?.name ? p.name === target.originalPlayer.name : p.name === target.playerName);
          if (isTargetPlayer) {
            return {
              ...p,
              name: target.playerName,
              studentId: target.studentId || p.studentId,
              number: target.playerNumber,
              position: target.playerPosition,
              isCaptain: target.isCaptain,
              isIdentityLocked: true, // محمي ومقفل رسمياً
            };
          }
          return p;
        });

        return {
          ...prev,
          [target.teamName]: updatedSquad,
        };
      });

      setPlayerRequests(prev => {
        const updated = prev.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'approved' as const,
              reviewedBy: currentUser?.name || 'مدير البطولة (Admin)',
              reviewedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
            };
          }
          return r;
        });
        saveStoredPlayerRequests(updated);
        return updated;
      });

      confetti({ particleCount: 50, spread: 60 });
      alert(`تم اعتماد وتطبيق تعديل بيانات اللاعب (${target.playerName}) في فريق (${target.teamName}) رسمياً! وتم قفل الاسم والـ ID نهائياً 🔒✅`);
    } else {
      // Add new player to squad
      const newPlayer: Player = {
        id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: target.playerName,
        studentId: target.studentId || '',
        number: target.playerNumber,
        position: target.playerPosition,
        isCaptain: target.isCaptain,
        isIdentityLocked: true, // مقفل ومحمي رسمياً بعد الاعتماد
      };

      setSquads(prev => {
        const existing = prev[target.teamName] || [];
        if (existing.some(p => p.name === target.playerName || (p.studentId && p.studentId === target.studentId))) {
          return prev;
        }
        return {
          ...prev,
          [target.teamName]: [...existing, newPlayer],
        };
      });

      setPlayerRequests(prev => {
        const updated = prev.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'approved' as const,
              reviewedBy: currentUser?.name || 'مدير البطولة (Admin)',
              reviewedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
            };
          }
          return r;
        });
        saveStoredPlayerRequests(updated);
        return updated;
      });

      confetti({ particleCount: 50, spread: 60 });
      alert(`تمت الموافقة واعتماد قيد اللاعب (${target.playerName}) في فريق (${target.teamName}) رسمياً! وتم قفل الاسم والـ ID نهائياً 🔒✅`);
    }
  };

  // 4. Admin edits and applies custom changes from Approvals modal
  const handleAdminApplyPlayerEdit = (requestId: string, customData: Partial<PlayerRegistrationRequest>) => {
    const target = playerRequests.find(r => r.id === requestId);
    if (!target) return;

    const finalName = customData.playerName || target.playerName;
    const finalStudentId = customData.studentId !== undefined ? customData.studentId : (target.studentId || '');
    const finalNumber = customData.playerNumber !== undefined ? customData.playerNumber : target.playerNumber;
    const finalPosition = customData.playerPosition || target.playerPosition;
    const finalCaptain = customData.isCaptain !== undefined ? customData.isCaptain : target.isCaptain;

    if (target.type === 'edit') {
      setSquads(prev => {
        const teamSquad = prev[target.teamName] || [];
        const updatedSquad = teamSquad.map(p => {
          const isTargetPlayer = target.playerId ? p.id === target.playerId : (target.originalPlayer?.name ? p.name === target.originalPlayer.name : p.name === target.playerName);
          if (isTargetPlayer) {
            return {
              ...p,
              name: finalName,
              studentId: finalStudentId,
              number: finalNumber,
              position: finalPosition,
              isCaptain: finalCaptain,
              isIdentityLocked: true,
            };
          }
          return p;
        });

        return {
          ...prev,
          [target.teamName]: updatedSquad,
        };
      });
    } else {
      // It was an add request with admin adjustments
      const newPlayer: Player = {
        id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: finalName,
        studentId: finalStudentId,
        number: finalNumber,
        position: finalPosition,
        isCaptain: finalCaptain,
        isIdentityLocked: true,
      };

      setSquads(prev => {
        const existing = prev[target.teamName] || [];
        return {
          ...prev,
          [target.teamName]: [...existing, newPlayer],
        };
      });
    }

    setPlayerRequests(prev => {
      const updated = prev.map(r => {
        if (r.id === requestId) {
          return {
            ...r,
            ...customData,
            status: 'approved' as const,
            reviewedBy: `${currentUser?.name || 'مدير البطولة'} (تعديل واعتماد الأدمن)`,
            reviewedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          };
        }
        return r;
      });
      saveStoredPlayerRequests(updated);
      return updated;
    });

    confetti({ particleCount: 50, spread: 60 });
    alert(`تم تعديل واعتماد اللاعب (${finalName}) في فريق (${target.teamName}) بصلاحية الأدمن رسمياً! 👑🔒✅`);
  };

  // 5. Admin rejects player request (with reason)
  const handleRejectPlayerRequest = (requestId: string, reason?: string) => {
    const target = playerRequests.find(r => r.id === requestId);
    if (!target) return;

    setPlayerRequests(prev => {
      const updated = prev.map(r => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'rejected' as const,
            rejectionReason: reason || 'لم يتم استيفاء شروط القيد الرسمية',
            reviewedBy: currentUser?.name || 'مدير البطولة (Admin)',
            reviewedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          };
        }
        return r;
      });
      saveStoredPlayerRequests(updated);
      return updated;
    });

    alert(`تم رفض الطلب للاعب (${target.playerName}) لفريق (${target.teamName}) مع تسجيل سبب الرفض ❌`);
  };

  // 6. Admin approves all pending requests at once
  const handleApproveAllPending = () => {
    const pending = playerRequests.filter(r => r.status === 'pending');
    if (pending.length === 0) return;

    setSquads(prev => {
      const nextSquads = { ...prev };
      pending.forEach(req => {
        const teamSquad = nextSquads[req.teamName] || [];
        if (req.type === 'edit') {
          nextSquads[req.teamName] = teamSquad.map(p => {
            const isMatch = req.playerId ? p.id === req.playerId : (req.originalPlayer?.name ? p.name === req.originalPlayer.name : p.name === req.playerName);
            if (isMatch) {
              return {
                ...p,
                name: req.playerName,
                studentId: req.studentId || p.studentId,
                number: req.playerNumber,
                position: req.playerPosition,
                isCaptain: req.isCaptain,
                isIdentityLocked: true,
              };
            }
            return p;
          });
        } else {
          if (!teamSquad.some(p => p.name === req.playerName || (p.studentId && p.studentId === req.studentId))) {
            const newPlayer: Player = {
              id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name: req.playerName,
              studentId: req.studentId || '',
              number: req.playerNumber,
              position: req.playerPosition,
              isCaptain: req.isCaptain,
              isIdentityLocked: true,
            };
            nextSquads[req.teamName] = [...teamSquad, newPlayer];
          }
        }
      });
      return nextSquads;
    });

    setPlayerRequests(prev => {
      const updated = prev.map(r => {
        if (r.status === 'pending') {
          return {
            ...r,
            status: 'approved' as const,
            reviewedBy: currentUser?.name || 'مدير البطولة (Admin)',
            reviewedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          };
        }
        return r;
      });
      saveStoredPlayerRequests(updated);
      return updated;
    });

    confetti({ particleCount: 70, spread: 80 });
    alert(`تم اعتماد وقبول جميع الطلبات المعلقة (${pending.length} طلبات) رسمياً مع قفل الهوية والـ ID 🔒🎉`);
  };

  // --- PHOTO & LOGO MANAGEMENT HANDLERS (ADMIN & TEAM MANAGER) ---
  const handleUpdateTeamLogo = (teamName: string, newLogoUrl: string) => {
    setTeams(prev => {
      const updated = prev.map(t => t.name === teamName ? { ...t, logoUrl: newLogoUrl.trim() || undefined } : t);
      try {
        localStorage.setItem('dawry_teams_custom_v1', JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save team logo to storage', err);
      }
      return updated;
    });
    confetti({ particleCount: 40, spread: 60 });
    alert(`تم تحديث شعار وصورة فريق (${teamName}) بنجاح! 🏆✨`);
  };

  const handleUpdatePlayerPhoto = (teamName: string, playerId: string, newPhotoUrl: string) => {
    setSquads(prev => {
      const teamSquad = prev[teamName] || [];
      const updatedSquad = teamSquad.map(p => p.id === playerId ? { ...p, photoUrl: newPhotoUrl.trim() || undefined } : p);
      const next = { ...prev, [teamName]: updatedSquad };
      saveStoredSquads(next);
      return next;
    });
    confetti({ particleCount: 30, spread: 50 });
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
      notifyPlayers: true,
      notifyNote: '',
      notifyUrgency: 'high',
    });
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingMatch) return;
    if (!scheduleForm.date) {
      alert('يرجى اختيار تاريخ ويوم إقامة المباراة أولاً!');
      return;
    }

    const isReschedule = schedulingMatch.isScheduled && (schedulingMatch.date !== scheduleForm.date || schedulingMatch.pitch !== scheduleForm.pitch);

    const updatedScheduledMatches = matches.map(m => {
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
    });
    saveMatches(updatedScheduledMatches);

    // If admin checked notification toggle: automatically send match schedule alert to players of both teams!
    if (scheduleForm.notifyPlayers) {
      const alertTitle = isReschedule
        ? `⚠️ تعديل رسمي لموعد وملعب مباراة: ${schedulingMatch.teamA} ضد ${schedulingMatch.teamB}`
        : `📢 اعتماد رسمي لموعد وملعب مباراة: ${schedulingMatch.teamA} ضد ${schedulingMatch.teamB}`;

      const customNoteSection = scheduleForm.notifyNote.trim()
        ? `\n📌 تعليمات الإدارة: ${scheduleForm.notifyNote.trim()}\n`
        : '\n';

      const alertBody = `تعلن إدارة بطولة دوري جامعة النيل لكرة القدم 2026 عن اعتماد وتثبيت موعد المباراة رسمياً:\n` +
        `• التاريخ المعتمد: ${scheduleForm.date}\n` +
        `• توقيت الانطلاق: ${scheduleForm.time || '04:00 م'}\n` +
        `• الملعب المحدد: ${scheduleForm.pitch || 'الملعب الرئيسي (A)'}\n` +
        customNoteSection +
        `يرجى من جميع اللاعبين الدخول وتأكيد الجاهزية للمباراة، والتواجد بالملعب قبل الموعد بـ 30 دقيقة بكارنيه الجامعة.`;

      const newAlert: MatchScheduleNotification = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        matchId: schedulingMatch.id,
        teamA: schedulingMatch.teamA,
        teamB: schedulingMatch.teamB,
        targetTeams: [schedulingMatch.teamA, schedulingMatch.teamB],
        stageName: schedulingMatch.stageName,
        round: schedulingMatch.round,
        group: schedulingMatch.group,
        date: scheduleForm.date,
        time: scheduleForm.time || '04:00 م',
        pitch: scheduleForm.pitch || 'الملعب الرئيسي (A)',
        title: alertTitle,
        message: alertBody,
        urgency: scheduleForm.notifyUrgency,
        sentBy: `${currentUser?.name || currentOperator.name} (إدارة البطولة)`,
        sentAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        readByUserIds: [],
        acknowledgedPlayers: [],
      };

      setMatchAlerts(prev => {
        const updated = [newAlert, ...prev];
        saveStoredMatchAlerts(updated);
        return updated;
      });
    }

    setSchedulingMatch(null);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    const notifyMsg = scheduleForm.notifyPlayers ? ' وتم إرسال تنبيه فوري للاعبي الفريقين عبر واجهة المستخدم 📢' : '';
    alert(`تم تحديد ميعاد المباراة (${schedulingMatch.teamA} ضد ${schedulingMatch.teamB}) وتنزيلها في جدول البطولة بنجاح!${notifyMsg} 📅`);
  };

  // --- MATCH ALERTS & NOTIFICATION HANDLERS ---
  const handleSendManualAlert = (alertData: Omit<MatchScheduleNotification, 'id' | 'sentAt' | 'readByUserIds' | 'acknowledgedPlayers'>) => {
    const newAlert: MatchScheduleNotification = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sentAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      readByUserIds: [],
      acknowledgedPlayers: [],
    };

    setMatchAlerts(prev => {
      const updated = [newAlert, ...prev];
      saveStoredMatchAlerts(updated);
      return updated;
    });

    confetti({ particleCount: 70, spread: 80 });
    alert(`تم إرسال التنبيه الرسمي بنجاح للاعبي الفريقين (${alertData.targetTeams.join(' و ')}) عبر واجهة المستخدم! 📢⚽`);
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    if (!currentUser) return;
    setMatchAlerts(prev => {
      const updated = prev.map(a => {
        if (a.id === alertId) {
          const existingAcks = a.acknowledgedPlayers || [];
          if (!existingAcks.some(p => p.userId === currentUser.id)) {
            const nextAcks = [
              ...existingAcks,
              {
                userId: currentUser.id,
                userName: currentUser.name,
                teamName: currentUser.playerTeamName || currentUser.managedTeamName || 'فريق الطالب',
                acknowledgedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
              }
            ];
            const nextReads = a.readByUserIds.includes(currentUser.id) ? a.readByUserIds : [...a.readByUserIds, currentUser.id];
            return {
              ...a,
              acknowledgedPlayers: nextAcks,
              readByUserIds: nextReads,
            };
          }
        }
        return a;
      });
      saveStoredMatchAlerts(updated);
      return updated;
    });
    confetti({ particleCount: 50, spread: 60 });
    alert('تم تأكيد جاهزيتك واطلاعك على موعد وملعب المباراة بنجاح! بالتوفيق كابتن ⚽🔥');
  };

  const handleMarkAlertAsRead = (alertId: string) => {
    if (!currentUser) return;
    setMatchAlerts(prev => {
      const updated = prev.map(a => {
        if (a.id === alertId && !a.readByUserIds.includes(currentUser.id)) {
          return {
            ...a,
            readByUserIds: [...a.readByUserIds, currentUser.id],
          };
        }
        return a;
      });
      saveStoredMatchAlerts(updated);
      return updated;
    });
  };

  const handleMarkAllAlertsAsRead = () => {
    if (!currentUser) return;
    setMatchAlerts(prev => {
      const updated = prev.map(a => {
        if (!a.readByUserIds.includes(currentUser.id)) {
          return {
            ...a,
            readByUserIds: [...a.readByUserIds, currentUser.id],
          };
        }
        return a;
      });
      saveStoredMatchAlerts(updated);
      return updated;
    });
  };

  const handleDeleteAlert = (alertId: string) => {
    setMatchAlerts(prev => {
      const updated = prev.filter(a => a.id !== alertId);
      saveStoredMatchAlerts(updated);
      return updated;
    });
  };

  const handleUnscheduleMatch = (matchId: string) => {
    if (confirm('هل ترغب في سحب هذه المباراة من الجدول وإلغاء موعدها لتعود لحالة بانتظار تحديد الموعد؟')) {
      const updated = matches.map(m => {
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
      });
      saveMatches(updated);
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

    // Initialize Lineups (الأساسيون والبدلاء) for both teams in Result Modal
    const sA_squad = squads[match.teamA] || [];
    const sB_squad = squads[match.teamB] || [];
    const allNamesA = sA_squad.map(p => p.name);
    const allNamesB = sB_squad.map(p => p.name);

    if (match.lineups?.teamAStarters && match.lineups.teamAStarters.length > 0) {
      setTeamAStartersResult(match.lineups.teamAStarters.filter(n => allNamesA.includes(n)));
      setTeamABenchResult((match.lineups.teamABench || []).filter(n => allNamesA.includes(n)));
    } else {
      const defaultCountA = Math.min(7, allNamesA.length);
      setTeamAStartersResult(allNamesA.slice(0, defaultCountA));
      setTeamABenchResult(allNamesA.slice(defaultCountA));
    }

    if (match.lineups?.teamBStarters && match.lineups.teamBStarters.length > 0) {
      setTeamBStartersResult(match.lineups.teamBStarters.filter(n => allNamesB.includes(n)));
      setTeamBBenchResult((match.lineups.teamBBench || []).filter(n => allNamesB.includes(n)));
    } else {
      const defaultCountB = Math.min(7, allNamesB.length);
      setTeamBStartersResult(allNamesB.slice(0, defaultCountB));
      setTeamBBenchResult(allNamesB.slice(defaultCountB));
    }
  };

  // Helper functions for Lineups inside Result Recording Modal
  const handleTogglePlayerInResult = (team: 'A' | 'B', playerName: string) => {
    if (team === 'A') {
      if (teamAStartersResult.includes(playerName)) {
        setTeamAStartersResult(prev => prev.filter(n => n !== playerName));
        setTeamABenchResult(prev => [...prev, playerName]);
      } else {
        setTeamABenchResult(prev => prev.filter(n => n !== playerName));
        setTeamAStartersResult(prev => [...prev, playerName]);
      }
    } else {
      if (teamBStartersResult.includes(playerName)) {
        setTeamBStartersResult(prev => prev.filter(n => n !== playerName));
        setTeamBBenchResult(prev => [...prev, playerName]);
      } else {
        setTeamBBenchResult(prev => prev.filter(n => n !== playerName));
        setTeamBStartersResult(prev => [...prev, playerName]);
      }
    }
  };

  const handlePresetLineupInResult = (team: 'A' | 'B', type: 'first7' | 'first9' | 'allBench' | 'invert') => {
    if (!recordingResultMatch) return;
    const squad = squads[team === 'A' ? recordingResultMatch.teamA : recordingResultMatch.teamB] || [];
    const allNames = squad.map(p => p.name);
    let newStarters: string[] = [];
    let newBench: string[] = [];

    if (type === 'first7') {
      newStarters = allNames.slice(0, Math.min(7, allNames.length));
      newBench = allNames.slice(Math.min(7, allNames.length));
    } else if (type === 'first9') {
      newStarters = allNames.slice(0, Math.min(9, allNames.length));
      newBench = allNames.slice(Math.min(9, allNames.length));
    } else if (type === 'allBench') {
      newStarters = [];
      newBench = [...allNames];
    } else if (type === 'invert') {
      const currentStarters = team === 'A' ? teamAStartersResult : teamBStartersResult;
      newStarters = allNames.filter(n => !currentStarters.includes(n));
      newBench = allNames.filter(n => currentStarters.includes(n));
    }

    if (team === 'A') {
      setTeamAStartersResult(newStarters);
      setTeamABenchResult(newBench);
    } else {
      setTeamBStartersResult(newStarters);
      setTeamBBenchResult(newBench);
    }
  };

  // Save Lineup Handler (before match or at any time)
  const handleSaveMatchLineup = (
    matchId: string, 
    lineups: {
      teamAStarters: string[];
      teamABench: string[];
      teamBStarters: string[];
      teamBBench: string[];
    }
  ) => {
    const updated = matches.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          lineups,
        };
      }
      return m;
    });
    saveMatches(updated);
    alert('تم حفظ واعتماد تشكيل المباراة (الأساسيون والبدلاء) لكلا الفريقين بنجاح! 📋⚽');
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

    // إذا كانت المزامنة التلقائية مفعلة وتم إدخال أهداف للاعبين نعتمد مجموع الأهداف، وإلا نعتمد النتيجة المكتوبة في الخانة مباشرة
    const sA = (autoSyncScore && teamAScorers.length > 0) ? totalGoalsA : (resultForm.scoreA !== null && resultForm.scoreA !== undefined ? Number(resultForm.scoreA) : 0);
    const sB = (autoSyncScore && teamBScorers.length > 0) ? totalGoalsB : (resultForm.scoreB !== null && resultForm.scoreB !== undefined ? Number(resultForm.scoreB) : 0);

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

    let nextMatches = matches.map(m => {
      if (m.id === recordingResultMatch.id) {
        return {
          ...m,
          scoreA: sA,
          scoreB: sB,
          status: resultForm.status,
          minute: resultForm.status === 'live' ? Number(resultForm.minute) : undefined,
          scorersSummary: summary.trim() || undefined,
          recordedBy: currentOperator.name,
          lineups: {
            teamAStarters: teamAStartersResult,
            teamABench: teamABenchResult,
            teamBStarters: teamBStartersResult,
            teamBBench: teamBBenchResult,
          },
          substitutions: [...teamASubs, ...teamBSubs],
          cards: [...teamACards, ...teamBCards],
        };
      }
      return m;
    });

    // Dynamic Knockout Progression
    if (recordingResultMatch.stage === 'r32' && resultForm.status === 'finished' && sA !== sB) {
      const pair = R32_SEED_PAIRS[recordingResultMatch.id];
      if (pair) {
        const winnerName = sA > sB ? recordingResultMatch.teamA : recordingResultMatch.teamB;
        nextMatches = nextMatches.map(m => {
          if (m.id === pair.nextMatchId) {
            return {
              ...m,
              [pair.nextSlot]: winnerName,
            };
          }
          return m;
        });
      }
    }

    saveMatches(nextMatches);

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
      // 1. Update matches
      setMatches(prev => prev.map(m => ({
        ...m,
        teamA: m.teamA === oldName ? newName : m.teamA,
        teamB: m.teamB === oldName ? newName : m.teamB,
      })));

      // 2. Update squads so players stay with the renamed team
      setSquads(prev => {
        const next = { ...prev };
        if (next[oldName]) {
          next[newName] = next[oldName];
          delete next[oldName];
        } else if (!next[newName]) {
          next[newName] = [];
        }
        saveStoredSquads(next);
        return next;
      });

      // 3. Update team managers
      setUsers(prev => {
        const next = prev.map(u => u.managedTeamName === oldName ? { ...u, managedTeamName: newName } : u);
        saveStoredUsers(next);
        return next;
      });
    }

    setEditingTeam(null);
    confetti({ particleCount: 50, spread: 60 });
    alert(`تم حفظ وتحديث بيانات الفريق بنجاح! تم نقل القائمة واللاعبين للاسم الجديد (${newName}) تلقائياً ✨`);
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
    let updatedTargetUser: AppUser | undefined;

    setUsers(prev => {
      const updated = prev.map(u => {
        // PERMANENT ADMIN PROTECTION: s.mohamed2442@nu.edu.eg cannot be altered or demoted
        if (u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
          return { ...u, role: 'admin' as UserRole, isPermanentAdmin: true };
        }
        if (u.id === userId) {
          const patched: AppUser = {
            ...u,
            role: newRole,
            managedTeamName: newRole === 'team_manager' ? teamName : undefined,
            playerTeamName: newRole === 'player' ? teamName : undefined,
          };
          updatedTargetUser = patched;
          return patched;
        }
        return u;
      });
      saveStoredUsers(updated);
      return updated;
    });

    if (updatedTargetUser) {
      updateUserOnServer(updatedTargetUser).then(serverUsers => {
        if (serverUsers) setUsers(serverUsers);
      });
    }

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
    updateUserOnServer(updatedUser).then(serverUsers => {
      if (serverUsers) setUsers(serverUsers);
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
    registerUserOnServer(newUser).then(serverUsers => {
      if (serverUsers) setUsers(serverUsers);
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
    deleteUserOnServer(userId).then(serverUsers => {
      if (serverUsers) setUsers(serverUsers);
    });
  };

  const handleAssignTeamManager = async (data: {
    email: string;
    password?: string;
    teamName: string;
    name?: string;
    studentId?: string;
    department?: string;
  }) => {
    const serverUsers = await assignTeamManagerOnServer(data);
    if (serverUsers) {
      setUsers(serverUsers);
      saveStoredUsers(serverUsers);
    } else {
      // Local fallback
      setUsers(prev => {
        const trimmedEmail = data.email.trim().toLowerCase();
        const existingIdx = prev.findIndex(u => u.email.toLowerCase() === trimmedEmail);
        const nowIso = new Date().toISOString();
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = {
            ...next[existingIdx],
            name: data.name || next[existingIdx].name,
            password: data.password || next[existingIdx].password,
            role: 'team_manager' as UserRole,
            managedTeamName: data.teamName,
            managerApprovalStatus: 'approved',
            studentId: data.studentId || next[existingIdx].studentId,
            department: data.department || next[existingIdx].department,
          };
          saveStoredUsers(next);
          return next;
        } else {
          const newUser: AppUser = {
            id: `user_tm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: data.name || trimmedEmail.split('@')[0],
            email: trimmedEmail,
            password: data.password || 'Password123',
            role: 'team_manager' as UserRole,
            managedTeamName: data.teamName,
            managerApprovalStatus: 'approved',
            studentId: data.studentId,
            department: data.department || 'جامعة النيل',
            registeredAt: nowIso.substring(0, 10),
          };
          const next = [newUser, ...prev];
          saveStoredUsers(next);
          return next;
        }
      });
    }
  };

  const handleUnassignTeamManager = async (userId: string, email: string) => {
    const serverUsers = await unassignTeamManagerOnServer({ userId, email });
    if (serverUsers) {
      setUsers(serverUsers);
      saveStoredUsers(serverUsers);
    } else {
      setUsers(prev => {
        const next = prev.map(u => {
          if (u.id === userId || u.email.toLowerCase() === email.toLowerCase()) {
            return {
              ...u,
              role: 'spectator' as UserRole,
              managedTeamName: undefined,
              managerApprovalStatus: undefined,
            };
          }
          return u;
        });
        saveStoredUsers(next);
        return next;
      });
    }
  };

  const handleLogin = (user: AppUser) => {
    setCurrentUser(user);
    saveActiveUser(user);
    try {
      sessionStorage.setItem('nu_football_session_active', 'true');
    } catch {}
    setPreviewRole(null);

    // Broadcast user enter to server immediately so they appear online / entered across all devices!
    recordUserEnter(user).then(serverUsers => {
      if (serverUsers) {
        setUsers(serverUsers);
        const fresh = serverUsers.find(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
        if (fresh) {
          setCurrentUser(fresh);
          saveActiveUser(fresh);
        }
      }
    });

    if (user.role === 'team_manager') {
      setCurrentTab('team_manager');
    } else if (user.role === 'admin') {
      setCurrentTab('matches_control');
    } else if (user.role === 'player') {
      setCurrentTab('my_team');
    } else {
      setCurrentTab('spectator_portal');
    }

    // Check if user is required to change password on first login
    if (user.mustChangePassword) {
      setShowFirstLoginPasswordModal(true);
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setPasswordChangeError('');
    }
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');

    if (!newPasswordInput || newPasswordInput.length < 6) {
      setPasswordChangeError('كلمة المرور الجديدة يجب أن تتكون من 6 أحرف أو أرقام على الأقل');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeError('كلمة المرور غير متطابقة، يرجى كتابتها بدقة مرتين');
      return;
    }

    if (newPasswordInput === '123456') {
      setPasswordChangeError('يرجى اختيار كلمة مرور شخصية قوية ومختلفة عن كلمة المرور المؤقتة (123456)');
      return;
    }

    if (!currentUser) return;

    const updatedUser: AppUser = {
      ...currentUser,
      password: newPasswordInput,
      mustChangePassword: false,
    };

    setCurrentUser(updatedUser);
    saveActiveUser(updatedUser);

    setUsers(prev => {
      const next = prev.map(u => (u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase()) ? updatedUser : u);
      saveStoredUsers(next);
      return next;
    });

    setShowFirstLoginPasswordModal(false);
    confetti({ particleCount: 70, spread: 80 });
    alert('تم تغيير وتعيين كلمة المرور الجديدة بنجاح! تم حفظ حسابك بأمان ولن يُطلب منك تغييرها مرة أخرى. 🔒🎉');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    saveActiveUser(null);
    try {
      sessionStorage.removeItem('nu_football_session_active');
    } catch {}
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

  // Unread Match Schedule Alerts for current user
  const userUnreadAlertsCount = useMemo(() => {
    if (!currentUser) return 0;
    const userTeam = currentUser.playerTeamName || currentUser.managedTeamName || '';
    return matchAlerts.filter(a => {
      const isTarget = !userTeam || a.targetTeams.includes(userTeam) || isAdmin;
      return isTarget && !a.readByUserIds.includes(currentUser.id);
    }).length;
  }, [matchAlerts, currentUser, isAdmin]);

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
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-medium">
                  <h1 className="font-black text-lg md:text-xl text-white tracking-wide">
                    {currentSeasonName}
                  </h1>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-emerald-400 font-bold">48 فريقاً / 8 مجموعات</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-amber-400/90 font-mono text-[11px]">{currentAcademicYear}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  بطولة كرة القدم الرسمية لجامعة النيل الأهلية · المنصة التفاعلية المعتمدة
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
                    ) : effectiveRole === 'admin' ? (
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-bold border border-purple-500/30">
                        أدمن 🛡️
                      </span>
                    ) : effectiveRole === 'team_manager' ? (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                        مسؤول {currentUser.managedTeamName || 'فريق'} 📋
                      </span>
                    ) : effectiveRole === 'player' ? (
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

                {/* Admin Quick Role Testing Switcher */}
                {currentUser.role === 'admin' && (
                  <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-[11px] mr-1">
                    <span className="text-slate-400 text-[10px] font-bold hidden sm:inline">معاينة رتبة:</span>
                    <select
                      value={previewRole || 'admin'}
                      onChange={(e) => {
                        const val = e.target.value as UserRole;
                        if (val === 'admin') {
                          setPreviewRole(null);
                        } else {
                          setPreviewRole(val);
                          if (val === 'team_manager') setCurrentTab('team_manager');
                          else if (val === 'player') setCurrentTab('my_team');
                          else setCurrentTab('spectator_portal');
                        }
                      }}
                      className="bg-slate-900 text-amber-300 font-bold text-[11px] rounded-lg px-2 py-0.5 border border-slate-700 focus:outline-none cursor-pointer"
                      title="تجربة شكل وصلاحيات كل صفحة بحسب الرتبة"
                    >
                      <option value="admin">👑 وضع الأدمن (كامل)</option>
                      <option value="team_manager">📋 مسؤول فريق</option>
                      <option value="player">⚽ لاعب عادي</option>
                      <option value="spectator">👁️ متفرج ومشجع</option>
                    </select>
                    {previewRole && (
                      <button
                        onClick={() => setPreviewRole(null)}
                        className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-[10px] transition-colors cursor-pointer"
                        title="الرجوع لوضع الأدمن"
                      >
                        إنهاء ✕
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 border-r border-slate-800 pr-2">
                {/* Match Schedule & Venue Alerts Bell Button */}
                <button
                  onClick={() => setIsAlertsListOpen(true)}
                  className={`relative px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
                    userUnreadAlertsCount > 0
                      ? 'bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/50 text-blue-300'
                      : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title="تنبيهات المواعيد والملاعب المعتمدة للمباريات"
                >
                  <Bell className={`w-3.5 h-3.5 ${userUnreadAlertsCount > 0 ? 'text-amber-400 animate-bounce' : 'text-slate-300'}`} />
                  <span className="hidden sm:inline">التنبيهات</span>
                  {userUnreadAlertsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black text-[10px] animate-pulse">
                      {userUnreadAlertsCount}
                    </span>
                  )}
                </button>

                {/* Admin Player Approvals Quick Button */}
                {isAdmin && (
                  <button
                    onClick={() => setIsApprovalsModalOpen(true)}
                    className="relative px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                    title="مراجعة واعتماد طلبات قيد اللاعبين رسمياً"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">اعتمادات اللاعبين</span>
                    {playerRequests.filter(r => r.status === 'pending').length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] animate-pulse">
                        {playerRequests.filter(r => r.status === 'pending').length}
                      </span>
                    )}
                  </button>
                )}

                {/* Backup & Restore Button */}
                {isAdmin && (
                  <button
                    onClick={() => setIsBackupModalOpen(true)}
                    className="relative px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 hover:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                    title="سحب أو استيراد نسخة احتياطية من البطولة"
                  >
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">نسخ احتياطي 💾</span>
                  </button>
                )}

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

          {/* Navigation Tabs based on Role */}
          <nav className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            {/* If Player: show dedicated My Team Tab */}
            {isPlayer && (
              <button
                onClick={() => setCurrentTab('my_team')}
                className={`px-3 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTab === 'my_team'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 font-black ring-1 ring-blue-400'
                    : 'bg-slate-900/80 text-blue-300 hover:bg-slate-800 border border-blue-500/30'
                }`}
              >
                <Shirt className="w-4 h-4 text-blue-400" />
                بطاقة فريقي ({currentUser.playerTeamName || 'فريقك'}) ⚽
              </button>
            )}

            {/* If Team Manager: show My Team Manager Tab */}
            {isTeamManager && (
              <button
                onClick={() => setCurrentTab('team_manager')}
                className={`px-3 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTab === 'team_manager'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/30 font-black ring-1 ring-emerald-400'
                    : 'bg-slate-900/80 text-emerald-300 hover:bg-slate-800 border border-emerald-500/30'
                }`}
              >
                <UserCheck className="w-4 h-4 text-emerald-400" />
                إدارة فريقي ({currentUser.managedTeamName || 'الفريق'}) 📋
              </button>
            )}

            {/* Tab: Spectators & Players Portal (Available to all) */}
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

            {/* Admin Control Center - Unified, High-Priority Tab */}
            {isAdmin && (
              <button
                onClick={() => setCurrentTab('manage')}
                className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                  currentTab === 'manage'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/30 ring-2 ring-amber-300'
                    : 'bg-slate-900/90 text-amber-400 border border-amber-500/40 hover:bg-slate-800'
                }`}
              >
                <Crown className="w-4 h-4 text-amber-400" />
                <span>لوحة التحكم الموحدة (Admin) ⚡</span>
                {(playerRequests.filter(r => r.status === 'pending').length + applications.filter(a => a.status === 'pending').length) > 0 && (
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-black animate-pulse">
                    {playerRequests.filter(r => r.status === 'pending').length + applications.filter(a => a.status === 'pending').length}
                  </span>
                )}
              </button>
            )}

            {/* Tab: Matches & Schedule (Full control for Admin, Schedule view for others) */}
            <button
              onClick={() => setCurrentTab('matches_control')}
              className={`px-3 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'matches_control'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              {isAdmin ? `الجدول والتحكم 📅 (${scheduledMatchesCount})` : 'جدول ومواعيد المباريات 📅'}
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
              المجموعات (48 فريق)
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

            {/* Tab: Fantasy League (فانتزي باللاعيبة الموجودة) */}
            <button
              onClick={() => setCurrentTab('fantasy_league')}
              className={`px-3 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'fantasy_league'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-400'
                  : 'bg-slate-900/80 text-emerald-300 hover:bg-slate-800 border border-emerald-500/30'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>فانتزي الدوري 🌟</span>
            </button>

            {/* Tab: Match Predictions & Voting (توقعات الماتشات كـ فوت فقط) */}
            <button
              onClick={() => setCurrentTab('match_predictions')}
              className={`px-3 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'match_predictions'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 font-black ring-1 ring-blue-400'
                  : 'bg-slate-900/80 text-blue-300 hover:bg-slate-800 border border-blue-500/30'
              }`}
            >
              <Vote className="w-4 h-4 text-blue-400" />
              <span>توقعات وتصويت المباريات 🗳️</span>
            </button>

            {/* Tab: AI Copilot Assistant (Admin Only) */}
            {isAdmin && (
              <button
                onClick={() => setIsGeminiChatbotOpen(true)}
                className="px-3 py-2 rounded-xl text-xs md:text-sm font-black flex items-center gap-1.5 transition-all cursor-pointer bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md border border-emerald-400/40 hover:scale-[1.02]"
                title="المساعد الذكي للبطولة — إضافة فرق ولاعبين من صورة (للأدمن فقط)"
              >
                <Bot className="w-4 h-4 text-emerald-200" />
                <span>المساعد الذكي 🤖</span>
              </button>
            )}

            {/* Tab: League Season Application (Visible to all when isLeagueRegistrationVisible, or only Admin when hidden) */}
            {(isLeagueRegistrationVisible || isAdmin) && (
              <button
                onClick={() => setCurrentTab('league_registration')}
                className={`px-3 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTab === 'league_registration'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/30 font-black'
                    : isLeagueRegistrationVisible
                    ? 'bg-slate-900/80 text-emerald-300 hover:bg-slate-800 border border-emerald-500/30'
                    : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 border border-dashed border-amber-500/40'
                }`}
                title={
                  !isLeagueRegistrationVisible
                    ? 'صفحة التقديم في الدوري (مخفية عن الجمهور - تظهر للمشرف فقط)'
                    : 'التقديم في الدوري وتسجيل الفرق'
                }
              >
                <Trophy className="w-4 h-4 text-emerald-400" />
                <span>التقديم في الدوري 🏆</span>
                {!isLeagueRegistrationVisible && (
                  <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">
                    مخفي 👁️
                  </span>
                )}
                {isAdmin && applications.filter(a => a.status === 'pending').length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-black">
                    {applications.filter(a => a.status === 'pending').length}
                  </span>
                )}
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">

        {/* ========================================================================= */}
        {/* TAB: LEAGUE REGISTRATION & ANNUAL SEASON PORTAL (التقديم في الدوري) */}
        {/* ========================================================================= */}
        {currentTab === 'league_registration' && (
          <LeagueRegistrationPage
            currentUser={currentUser}
            isAdmin={isAdmin}
            isLeagueRegistrationVisible={isLeagueRegistrationVisible}
            onToggleRegistrationVisible={handleToggleRegistrationVisible}
            isLeagueRegistrationOpen={isLeagueRegistrationOpen}
            onToggleRegistrationOpen={handleToggleRegistrationOpen}
            applications={applications}
            onRefreshApplications={handleRefreshApplications}
            seasons={seasons}
            activeSeasonId={activeSeasonId}
            onRefreshSeasons={handleRefreshSeasons}
            currentSeasonName={currentSeasonName}
            currentAcademicYear={currentAcademicYear}
            teams={teams}
            squads={squads}
            users={users}
            archivedSnapshots={archivedSnapshots}
            onRefreshArchivedSnapshots={handleRefreshArchivedSnapshots}
            onAddTeamToTournament={handleAddTeamToTournament}
            onAssignTeamManager={handleAssignTeamManagerFromApplication}
            onUpdateSquad={handleUpdateSquadFromRegistration}
            onStartNewSeasonZeroPoints={handleStartNewSeasonZeroPoints}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB: SPECTATORS & PLAYERS PORTAL (صفحة المتفرجين واللاعبين لمعرفة الماتشات) */}
        {/* ========================================================================= */}
        {currentTab === 'spectator_portal' && (
          <SpectatorPortalPage
            matches={matches}
            teams={teams}
            squads={squads}
            matchAlerts={matchAlerts}
            isAdmin={isAdmin}
            onEditResult={(match) => handleOpenResultModal(match)}
            onEditSchedule={(match) => handleOpenScheduleModal(match)}
            onEditLineup={(match) => setEditingLineupMatch(match)}
            onSendAlert={(match) => {
              setAlertComposerMatch(match);
              setIsAlertComposerOpen(true);
            }}
            onOpenAllAlertsModal={() => setIsAlertsListOpen(true)}
            onSelectTeamForSquadView={(teamName) => {
              setCurrentTab('teams_roster');
            }}
            onSelectTeamForMatches={(teamName) => {
              setSelectedTeamNameForMatches(teamName);
            }}
            onNavigateToFantasy={() => setCurrentTab('fantasy_league')}
            onNavigateToPredictions={() => setCurrentTab('match_predictions')}
            onOpenVoteModal={(match) => handleOpenVoteModal(match)}
          />
        )}

        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* TAB: MY TEAM PORTAL (صفحة وبطاقة فريقي الخاصة باللاعب) */}
        {/* ========================================================================= */}
        {currentTab === 'my_team' && (
          <PlayerTeamPortalPage
            currentUser={{ ...currentUser, role: effectiveRole }}
            teams={teams}
            matches={matches}
            squads={squads}
            matchAlerts={matchAlerts}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onOpenAllAlertsModal={() => setIsAlertsListOpen(true)}
            onSelectTeamForMatches={(teamName) => setSelectedTeamNameForMatches(teamName)}
            onNavigateToSpectatorPortal={() => setCurrentTab('spectator_portal')}
            onNavigateToGroups={() => setCurrentTab('groups')}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB: TEAM MANAGER PORTAL (صفحة مسؤول كل فرقة لإضافة وتعديل اللاعبين) */}
        {/* ========================================================================= */}
        {currentTab === 'team_manager' && (
          isAdmin || isTeamManager ? (
            <TeamManagerPortalPage
              teams={teams}
              matches={matches}
              squads={squads}
              onUpdateSquads={handleUpdateSquads}
              onUpdateMatchLineups={handleUpdateMatchLineups}
              isAdmin={isAdmin}
              assignedTeamName={currentUser.managedTeamName}
              managerName={currentUser.name}
              playerRequests={playerRequests}
              matchAlerts={matchAlerts}
              onOpenAlertComposerForMatch={(m) => {
                setAlertComposerMatch(m);
                setIsAlertComposerOpen(true);
              }}
              onRequestAddPlayer={handleRequestAddPlayer}
              onRequestEditPlayer={handleRequestEditPlayer}
              onOpenApprovalsModal={() => setIsApprovalsModalOpen(true)}
              onOpenAllAlertsModal={() => setIsAlertsListOpen(true)}
              onNavigateToAssignManagers={() => setCurrentTab('assign_managers')}
              isPlayerEditingOpen={isPlayerEditingOpen}
              onTogglePlayerEditing={handleTogglePlayerEditing}
            />
          ) : (
            <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 text-center max-w-lg mx-auto my-12 shadow-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">صفحة مسؤولي ومدربي الفرق المعتمدين 📋</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                هذه الصفحة مخصصة لمدربي ومسؤولي الفرق فقط لإدارة قوائم وتشكيلات لاعبيهم. رتبتك الحالية: <strong className="text-emerald-400">{isPlayer ? 'لاعب رسمي ⚽' : 'متفرج ومشجع 👁️'}</strong>. يمكنك متابعة جدول ومباريات البطولة من خلال صفحة المتفرجين أو بطاقة فريقك.
              </p>
              <button
                onClick={() => setCurrentTab(isPlayer ? 'my_team' : 'spectator_portal')}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-colors cursor-pointer shadow-lg"
              >
                العودة إلى صفحتك المعتمدة ➔
              </button>
            </div>
          )
        )}

        {/* ========================================================================= */}
        {/* TAB: USERS & PERMISSIONS DIRECTORY (دليل المستخدمين واللاعبين والمتفرجين - للأدمن فقط) */}
        {/* ========================================================================= */}
        {currentTab === 'users_directory' && (
          isAdmin ? (
            <UsersDirectoryPage
              users={users}
              currentUser={{ ...currentUser, role: effectiveRole }}
              teams={teams}
              onUpdateUserRole={handleUpdateUserRole}
              onUpdateUser={handleUpdateUser}
              onAddUser={handleAddUser}
              onDeleteUser={handleDeleteUser}
              onRefreshUsers={handleRefreshUsersFromServer}
              isSyncing={isSyncingUsers}
              lastSyncTime={lastSyncTime}
              onNavigateToAssignManagers={() => setCurrentTab('assign_managers')}
            />
          ) : (
            <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-8 text-center max-w-lg mx-auto my-12 shadow-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/30">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">صلاحيات مقيدة • دليل المستخدمين للأدمن فقط 👥</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                عذراً، الاطلاع على دليل المستخدمين وتعديل الرتب وتعيين مسؤولي الفرق متاح فقط للمشرفين ومدير النظام (Admin).
              </p>
              <button
                onClick={() => setCurrentTab(isTeamManager ? 'team_manager' : isPlayer ? 'my_team' : 'spectator_portal')}
                className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-colors cursor-pointer shadow-lg"
              >
                العودة إلى صفحتك المعتمدة ➔
              </button>
            </div>
          )
        )}

        {/* ========================================================================= */}
        {/* TAB: ASSIGN TEAM MANAGERS (صفحة تعيين وتوزيع مسؤولي الفرق الـ 48 - للأدمن) */}
        {/* ========================================================================= */}
        {currentTab === 'assign_managers' && (
          isAdmin ? (
            <AssignTeamManagersPage
              teams={teams}
              users={users}
              currentUser={{ ...currentUser, role: effectiveRole }}
              onAssignManager={handleAssignTeamManager}
              onUnassignManager={handleUnassignTeamManager}
              onRefreshUsers={handleRefreshUsersFromServer}
              isSyncing={isSyncingUsers}
              onNavigateToTeamPortal={(teamName) => {
                setCurrentTab('team_manager');
              }}
            />
          ) : (
            <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-8 text-center max-w-lg mx-auto my-12 shadow-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">صفحة تعيين مسؤولي الفرق للأدمن فقط 👔</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                تعيين وتفويض مسؤولي ومدربي الفرق الـ 48 متاح فقط للمدير العام للبطولة.
              </p>
              <button
                onClick={() => setCurrentTab(isTeamManager ? 'team_manager' : isPlayer ? 'my_team' : 'spectator_portal')}
                className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-lg"
              >
                العودة إلى صفحتك المعتمدة ➔
              </button>
            </div>
          )
        )}

        {/* ========================================================================= */}
        {/* TAB 1: MATCHES & SCHEDULING CONTROL */}
        {/* ========================================================================= */}
        {currentTab === 'matches_control' && (
          <div className="space-y-6">
            
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#062013] to-slate-900 border border-emerald-500/25 p-6 md:p-8 shadow-2xl space-y-6">
              {/* Subtle ambient lighting decorations */}
              <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

              {/* Top zone: Title, Badge, Description, and Quick Counter */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="flex-1 min-w-0 space-y-2.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isAdmin ? 'التحكم في مواعيد وتنزيل المباريات وتسجيل النتائج' : 'جدول ومواعيد مباريات البطولة المعتمدة'}</span>
                    {isAdmin && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-400/20 text-emerald-200 text-[10px] font-black border border-emerald-400/30">
                        Admin 👑
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug">
                    {isAdmin ? 'جدول المباريات: لا ينزل أي ماتش إلا بعد تحديد موعده وملعبه' : 'مواعيد وملاعب ونتائج مباريات دوري جامعة النيل'}
                  </h2>
                  <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-3xl">
                    {isAdmin 
                      ? 'يمكنك مراجعة المباريات غير المجدولة، وتحديد تاريخ وساعة وملعب كل مباراة لتنزل رسمياً في الجدول، وتسجيل النتائج المباشرة والنهائية وتحديث الترتيب فوراً.'
                      : 'يمكنك استعراض تواريخ ومواعيد وملاعب المباريات المعتمدة من اللجنة المنظمة، ومتابعة النتائج الحية والنهائية والأهداف المسجلة.'}
                  </p>
                </div>

                {/* Tournament Match Count KPI Strip */}
                <div className="flex items-center gap-3 shrink-0 self-start lg:self-center bg-slate-950/80 border border-slate-800 p-2.5 rounded-2xl">
                  <div className="px-3.5 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-center min-w-[84px]">
                    <div className="text-[11px] text-slate-400 font-medium">مجدولة ورسمية</div>
                    <div className="text-lg font-black text-emerald-400 tabular-nums">{scheduledMatchesCount}</div>
                  </div>
                  <div className="w-px h-8 bg-slate-800" />
                  <div className="px-3.5 py-1.5 rounded-xl bg-amber-950/30 border border-amber-500/20 text-center min-w-[84px]">
                    <div className="text-[11px] text-slate-400 font-medium">بانتظار الموعد</div>
                    <div className="text-lg font-black text-amber-400 tabular-nums">{unscheduledMatchesCount}</div>
                  </div>
                </div>
              </div>

              {/* Action Toolbar Row - Responsive, wraps gracefully, clear priority */}
              <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 relative z-10">
                {/* Primary & Interactive Actions */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsAddingMatch(true)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs md:text-sm shadow-md shadow-emerald-950/60 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      title="إضافة مباراة جديدة يدوياً وتحديد طرفيها وموعدها"
                    >
                      <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
                      <span>إضافة مباراة مخصصة</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleOpenRoundOrganizer(groupStageLetterFilter === 'all' ? 'A' : groupStageLetterFilter, typeof groupStageRoundFilter === 'number' ? groupStageRoundFilter : 1, matchStageFilter === 'r32' ? 'r32' : 'group')}
                      className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-amber-300 border border-amber-500/30 hover:border-amber-400/50 font-bold text-xs md:text-sm shadow-sm flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      title="تحديد مواجهات كل جولة ودور واختيار مين هيلاعب مين"
                    >
                      <Swords className="w-4 h-4 text-amber-400" />
                      <span>تحديد مواجهات الجولات (مين هيلاعب مين)</span>
                    </button>
                  )}

                  {/* Vote for match button in header banner */}
                  <button
                    type="button"
                    onClick={() => handleOpenVoteModal()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs md:text-sm shadow-md shadow-indigo-950/50 flex items-center gap-2 transition-all cursor-pointer border border-indigo-400/30 hover:scale-[1.02] active:scale-[0.98]"
                    title="صوّت وتوقع نتائج مباريات البطولة قبل موعد انطلاقها"
                  >
                    <Vote className="w-4 h-4 text-amber-300" />
                    <span>صوّت لمباراة 🗳️ (Vote for match)</span>
                  </button>
                </div>

                {/* Status Indicator */}
                <div className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-emerald-300 font-semibold text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>جدول المباريات والنتائج الرسمية المعتمدة 📅</span>
                </div>
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
                          className="hover:text-emerald-300 transition-colors cursor-pointer truncate max-w-full hover:underline font-bold inline-flex flex-col items-center justify-center group/team"
                          title={`اضغط لعرض مباريات ${displayTeamA}`}
                        >
                          <TeamLogo teamName={displayTeamA} size="lg" className="mx-auto mb-1.5 group-hover/team:scale-105 transition-transform" />
                          <span className="truncate max-w-[130px]">{displayTeamA}</span>
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
                          className="hover:text-emerald-300 transition-colors cursor-pointer truncate max-w-full hover:underline font-bold inline-flex flex-col items-center justify-center group/team"
                          title={`اضغط لعرض مباريات ${displayTeamB}`}
                        >
                          <TeamLogo teamName={displayTeamB} size="lg" className="mx-auto mb-1.5 group-hover/team:scale-105 transition-transform" />
                          <span className="truncate max-w-[130px]">{displayTeamB}</span>
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
                    {isAdmin ? (
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

                          {/* Admin Send Match Alert button */}
                          <button
                            onClick={() => {
                              setAlertComposerMatch(match);
                              setIsAlertComposerOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                            title="إرسال تنبيه رسمي للاعبي الفريقين عبر واجهة المستخدم"
                          >
                            <Bell className="w-3.5 h-3.5 text-blue-400" />
                            <span>تنبيه للاعبين 📢</span>
                          </button>

                          {/* Match Lineup Button: تحديد الأساسيين والبدلاء قبل كل ماتش */}
                          <button
                            onClick={() => setEditingLineupMatch(match)}
                            className="px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                            title="تحديد الأساسيين والبدلاء لكلا الفريقين قبل المباراة أو في أي وقت (مخصص لكل ماتش)"
                          >
                            <Shirt className="w-3.5 h-3.5 text-purple-400" />
                            <span>
                              {match.lineups?.teamAStarters?.length 
                                ? `التشكيل (${match.lineups.teamAStarters.length} ضد ${match.lineups.teamBStarters?.length || 0}) 📋` 
                                : 'تشكيل المباراة 📋'}
                            </span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenVoteModal(match)}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                            title="التصويت وتوقع نتيجة المباراة (Vote for match)"
                          >
                            <Vote className="w-3.5 h-3.5 text-blue-400" />
                            <span>{globalUserVotes[match.id] ? 'تعديل التصويت 🗳️' : 'صوّت 🗳️'}</span>
                          </button>

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
                    ) : (
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{match.isScheduled ? 'مباراة معتمدة بالجدول' : 'بانتظار اعتماد الموعد'}</span>
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenVoteModal(match)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/20"
                            title="التصويت وتوقع نتيجة المباراة (Vote for match)"
                          >
                            <Vote className="w-3.5 h-3.5 text-amber-300" />
                            <span>{globalUserVotes[match.id] ? 'تعديل التصويت 🗳️' : 'صوّت للمباراة 🗳️ (Vote)'}</span>
                          </button>

                          <button
                            onClick={() => setEditingLineupMatch(match)}
                            className="px-2 py-1 rounded-lg bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            title="عرض التشكيل الأساسي والبدلاء"
                          >
                            <Shirt className="w-3 h-3 text-purple-400" />
                            <span>{match.lineups?.teamAStarters?.length ? 'عرض التشكيل والبدلاء 📋' : 'تشكيل المباراة 📋'}</span>
                          </button>

                          {match.status === 'finished' && (
                            <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              نهائية
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Match Lineup Badge if configured */}
                    {match.lineups?.teamAStarters && match.lineups.teamAStarters.length > 0 && (
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[10px] text-purple-300">
                        <div className="flex items-center gap-1.5 truncate">
                          <Shirt className="w-3 h-3 text-purple-400 shrink-0" />
                          <span className="font-bold text-slate-300">تشكيل الماتش:</span>
                          <span className="font-mono text-emerald-300">{match.teamA}: {match.lineups.teamAStarters.length} أساسي</span>
                          <span className="text-slate-500">•</span>
                          <span className="font-mono text-blue-300">{match.teamB}: {match.lineups.teamBStarters?.length || 0} أساسي</span>
                        </div>
                        <button
                          onClick={() => setEditingLineupMatch(match)}
                          className="text-[10px] text-purple-400 hover:text-white font-bold underline cursor-pointer shrink-0 mr-1"
                        >
                          تعديل ⤢
                        </button>
                      </div>
                    )}

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

                {/* Switch between Single Group Table, 5-Round Fixtures, and All 32 Qualified Teams View + PDF Export Button */}
                <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
                  <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
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

                  <button
                    onClick={() => setIsPdfExportModalOpen(true)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/60 border border-emerald-400/40 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    title="تصدير السجل الرسمي لترتيب المجموعات كملف PDF معتمد للأرشيف"
                  >
                    <FileDown className="w-4 h-4 text-emerald-200" />
                    <span>تصدير السجل الرسمي (PDF) 📄</span>
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
                  <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                      <h3 className="font-black text-white text-base">ترتيب المجموعة {selectedGroup}</h3>
                      <span className="text-xs text-slate-400">(6 فرق تتنافس على 4 بطاقات صعود)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsPdfExportModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-emerald-950 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 transition-all cursor-pointer"
                        title="تصدير السجل والترتيب كملف PDF معتمد"
                      >
                        <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                        <span>تحميل تقرير PDF</span>
                      </button>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        يصعد أول 4 إلى دور الـ 32
                      </span>
                    </div>
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
                                  <TeamLogo teamName={team.name} size="sm" className="group-hover:scale-110 transition-transform" />
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
                                  ) : isAdmin ? (
                                    <button
                                      onClick={() => handleOpenScheduleModal(m)}
                                      className="px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-[10px] border border-amber-500/30 cursor-pointer transition-colors"
                                    >
                                      تحديد الميعاد
                                    </button>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-400/80 font-bold text-[10px]">
                                      لم يُحدد بعد
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="py-1 space-y-1">
                                <div className="flex items-center justify-between text-xs font-bold text-white">
                                  <button
                                    onClick={() => setSelectedTeamNameForMatches(m.teamA)}
                                    className="truncate hover:text-emerald-300 transition-colors cursor-pointer hover:underline text-right flex items-center gap-1.5"
                                    title={`اضغط لعرض مباريات ${m.teamA}`}
                                  >
                                    <TeamLogo teamName={m.teamA} size="xs" />
                                    <span className="truncate">{m.teamA}</span>
                                  </button>
                                  <span className="font-mono text-emerald-400 text-sm">{m.scoreA !== null ? m.scoreA : '-'}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold text-white">
                                  <button
                                    onClick={() => setSelectedTeamNameForMatches(m.teamB)}
                                    className="truncate hover:text-emerald-300 transition-colors cursor-pointer hover:underline text-right flex items-center gap-1.5"
                                    title={`اضغط لعرض مباريات ${m.teamB}`}
                                  >
                                    <TeamLogo teamName={m.teamB} size="xs" />
                                    <span className="truncate">{m.teamB}</span>
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
                                  <TeamLogo teamName={team.name} size="xs" />
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
                          <button onClick={() => setSelectedTeamNameForMatches(tA)} className="hover:text-emerald-300 truncate cursor-pointer flex items-center gap-1.5">
                            <TeamLogo teamName={tA} size="xs" />
                            <span className="truncate">{tA}</span>
                          </button>
                          <span className="font-mono text-emerald-400">{m.scoreA !== null ? m.scoreA : '-'}</span>
                        </div>
                        <div className="p-2 bg-slate-950 rounded-xl flex items-center justify-between text-xs font-bold text-white">
                          <button onClick={() => setSelectedTeamNameForMatches(tB)} className="hover:text-emerald-300 truncate cursor-pointer flex items-center gap-1.5">
                            <TeamLogo teamName={tB} size="xs" />
                            <span className="truncate">{tB}</span>
                          </button>
                          <span className="font-mono text-emerald-400">{m.scoreB !== null ? m.scoreB : '-'}</span>
                        </div>
                      </div>

                      {isAdmin ? (
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
                      ) : (
                        <div className="pt-2 border-t border-slate-800 text-center text-[11px] text-slate-400 font-bold">
                          {m.status === 'finished' ? (
                            <span className="text-emerald-400 font-mono">انتهت النتيجة الرسمية FT</span>
                          ) : m.isScheduled ? (
                            <span className="text-slate-300">{m.date} • {m.time}</span>
                          ) : (
                            <span className="text-amber-400/80">بانتظار اكتمال المتأهلين والموعد</span>
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
        {/* TAB 4: TEAMS & PLAYERS ROSTER (الفرق واللاعبين - مين لعب ومين ملعبش والتبديلات) */}
        {/* ========================================================================= */}
        {currentTab === 'teams_roster' && (
          <TeamsRosterPage
            teams={teams}
            matches={matches}
            squads={squads}
            onUpdateSquads={handleUpdateSquads}
            onUpdateMatchLineups={handleUpdateMatchLineups}
            currentUser={{ ...currentUser, role: effectiveRole }}
            onRequestAddPlayer={handleRequestAddPlayer}
            onRequestEditPlayer={handleRequestEditPlayer}
            playerRequests={playerRequests}
            onOpenApprovalsModal={() => setIsApprovalsModalOpen(true)}
            isPlayerEditingOpen={isPlayerEditingOpen}
            onOpenAiCopilot={() => setIsGeminiChatbotOpen(true)}
            onOpenAuditModal={() => setIsRosterAuditModalOpen(true)}
            onDeleteTeam={handleDeleteTeam}
            onEditTeam={(team) => setEditingTeam(team)}
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
        {/* TAB: FANTASY LEAGUE (فانتزي دوري جامعة النيل باللاعبين الفعليين) */}
        {/* ========================================================================= */}
        {currentTab === 'fantasy_league' && (
          <FantasyLeaguePage
            currentUser={currentUser}
            teams={teams}
            matches={matches}
            squads={squads}
            onNavigateToRoster={() => setCurrentTab('teams_roster')}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB: MATCH PREDICTIONS & VOTING (توقعات وتصويت المباريات كـ فوت فقط) */}
        {/* ========================================================================= */}
        {currentTab === 'match_predictions' && (
          <MatchPredictionsPage
            currentUser={currentUser}
            matches={matches}
            teams={teams}
            onNavigateToMatchesSchedule={() => setCurrentTab('matches_control')}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB: UNIFIED STREAMLINED ADMIN CONTROL CENTER (لوحة التحكم المبسطة) */}
        {/* ========================================================================= */}
        {currentTab === 'manage' && (
          isAdmin ? (
            <AdminControlCenter
              currentUser={currentUser}
              teams={teams}
              matches={matches}
              users={users}
              playerRequests={playerRequests}
              applications={applications}
              seasons={seasons}
              archivedSnapshots={archivedSnapshots}
              isPlayerEditingOpen={isPlayerEditingOpen}
              onTogglePlayerEditing={handleTogglePlayerEditing}
              isLeagueRegistrationVisible={isLeagueRegistrationVisible}
              onToggleRegistrationVisible={handleToggleRegistrationVisible}
              isLeagueRegistrationOpen={isLeagueRegistrationOpen}
              onToggleRegistrationOpen={handleToggleRegistrationOpen}
              activeSeasonId={activeSeasonId}
              currentSeasonName={currentSeasonName}
              currentAcademicYear={currentAcademicYear}
              onOpenApprovalsModal={() => setIsApprovalsModalOpen(true)}
              onOpenRoundOrganizer={() => setIsRoundOrganizerOpen(true)}
              onOpenAlertComposer={() => {
                const defaultMatch = matches.find(m => m.isScheduled) || matches[0];
                setAlertComposerMatch(defaultMatch);
                setIsAlertComposerOpen(true);
              }}
              onOpenBackupModal={() => setIsBackupModalOpen(true)}
              onOpenNewSeasonModal={() => setIsAdminNewSeasonModalOpen(true)}
              onOpenArchiveModal={() => setIsAdminArchiveModalOpen(true)}
              onOpenBulkEditModal={handleOpenBulkEditModal}
              onEditTeam={(team) => setEditingTeam(team)}
              onScheduleMatch={(match) => setSchedulingMatch(match)}
              onResetAllMatches={handleResetAllMatches}
              onSelectTeamForMatches={(teamName) => setSelectedTeamNameForMatches(teamName)}
              onAssignManager={handleAssignTeamManager}
              onUnassignManager={handleUnassignTeamManager}
              onUpdateUserRole={handleUpdateUserRole}
              onUpdateUser={handleUpdateUser}
              onAddUser={handleAddUser}
              onDeleteUser={handleDeleteUser}
              onRefreshUsers={handleRefreshUsersFromServer}
              onRefreshApplications={handleRefreshApplications}
              onReviewApplication={handleReviewApplication}
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onOpenAiCopilot={() => setIsGeminiChatbotOpen(true)}
              onOpenCsvUploadModal={() => setIsCsvUploadModalOpen(true)}
              onOpenAuditModal={() => setIsRosterAuditModalOpen(true)}
              duplicatePlayersCount={duplicatePlayersCount}
              onPurgeNewTeamsAndUnifyBilingual={handlePurgeNewTeamsAndUnifyBilingual}
              onDeleteTeam={handleDeleteTeam}
              onClearAllSquads={handleClearAllSquads}
              onCleanWipeKeepTeamsOnly={handleCleanWipeKeepTeamsOnly}
            />
          ) : (
            <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-8 text-center max-w-lg mx-auto my-12 shadow-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">لوحة تحكم الأدمن محظورة 👑</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                لوحة التحكم وإدارة الفرق ومسؤولي النتائج متاحة فقط لمسؤولي النظام (Admin).
              </p>
              <button
                onClick={() => setCurrentTab(isTeamManager ? 'team_manager' : isPlayer ? 'my_team' : 'spectator_portal')}
                className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-lg"
              >
                العودة إلى صفحتك المعتمدة ➔
              </button>
            </div>
          )
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

              {/* Send Notification to Players Option */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-blue-500/30 space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleForm.notifyPlayers}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, notifyPlayers: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-black text-blue-300 flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span>إرسال تنبيه فوري عبر واجهة المستخدم للاعبي ({schedulingMatch.teamA} و {schedulingMatch.teamB}) 📢</span>
                  </span>
                </label>

                {scheduleForm.notifyPlayers && (
                  <div className="space-y-2 pt-2 border-t border-slate-900 animate-in fade-in duration-150">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        ملاحظات أو تعليمات إضافية في التنبيه (اختياري):
                      </label>
                      <input
                        type="text"
                        placeholder="مثل: الحضور بالزي الرسمي قبل المباراة بنصف ساعة بكارنيه الجامعة..."
                        value={scheduleForm.notifyNote}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, notifyNote: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">درجة الأهمية:</span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="scheduleUrgency"
                            checked={scheduleForm.notifyUrgency === 'high'}
                            onChange={() => setScheduleForm({ ...scheduleForm, notifyUrgency: 'high' })}
                            className="text-rose-600"
                          />
                          <span className="text-rose-400 font-bold">عاجل وهام 🚨</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="scheduleUrgency"
                            checked={scheduleForm.notifyUrgency === 'normal'}
                            onChange={() => setScheduleForm({ ...scheduleForm, notifyUrgency: 'normal' })}
                            className="text-teal-600"
                          />
                          <span className="text-teal-400 font-bold">عادي 📢</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
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

                {/* ========================================================================= */}
                {/* 📋 تشكيل المباراة: الأساسيون والبدلاء لكلا الفريقين أثناء بدء الماتش أو تسجيل النتيجة */}
                {/* ========================================================================= */}
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-purple-500/40 flex flex-wrap items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                      <Shirt className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white flex items-center gap-2">
                        <span>تشكيل المباراة (الأساسيون والبدلاء) لكلا الفريقين</span>
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono text-[10px] border border-purple-500/30">
                          {recordingResultMatch.teamA}: {teamAStartersResult.length} أساسي • {recordingResultMatch.teamB}: {teamBStartersResult.length} أساسي
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        حدد من سيلعب أساسياً ومن على الدكة لهذه المباراة تحديداً؛ تتحدث وتُحفظ تلقائياً مع النتيجة!
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowLineupsInResultModal(!showLineupsInResultModal)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>{showLineupsInResultModal ? 'إخفاء تفاصيل التشكيل' : 'عرض وتعديل التشكيل الأساسي والبدلاء 📋'}</span>
                  </button>
                </div>

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
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 font-mono">
                          <span>🎯</span>
                          <span>{teamAAssists.reduce((sum, a) => sum + (Number(a.assists) || 0), 0)} أسيست</span>
                        </span>
                      </div>
                    </div>

                    {/* ======================= */}
                    {/* 📋 تشكيل فريق A: الأساسيون والبدلاء */}
                    {/* ======================= */}
                    {showLineupsInResultModal && (
                      <div className="space-y-2.5 bg-slate-900/70 p-3 rounded-xl border border-blue-500/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                              <Shirt className="w-3.5 h-3.5" />
                              <span>تشكيل {recordingResultMatch.teamA}</span>
                            </span>
                            <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                              {teamAStartersResult.length} أساسي
                            </span>
                            <span className="text-[10px] text-slate-300 font-bold bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                              {teamABenchResult.length} بديل
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handlePresetLineupInResult('A', 'first7')}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
                              title="تحديد أول 7 لاعبين كأساسيين"
                            >
                              أول 7
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePresetLineupInResult('A', 'invert')}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold transition-colors cursor-pointer flex items-center gap-0.5"
                              title="عكس التشكيل (تبديل الأساسيين بالبدلاء)"
                            >
                              <ArrowRightLeft className="w-2.5 h-2.5" />
                              <span>عكس</span>
                            </button>
                          </div>
                        </div>

                        {/* All Players List categorized into Starters & Bench */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {/* 🟢 Starters Column */}
                          <div className="p-2 bg-slate-950/80 rounded-xl border border-emerald-500/30 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 pb-1 border-b border-emerald-500/20">
                              <span>🟢 الأساسيون ({teamAStartersResult.length})</span>
                              <span className="text-[9px] text-slate-400">انقر للدكة</span>
                            </div>
                            <div className="space-y-1 max-h-[160px] overflow-y-auto pr-0.5">
                              {teamAStartersResult.length === 0 ? (
                                <p className="text-[10px] text-slate-500 py-1 text-center">لا يوجد أساسيون محددون</p>
                              ) : (
                                teamAStartersResult.map(pName => {
                                  const pObj = squadA.find(p => p.name === pName);
                                  return (
                                    <div
                                      key={pName}
                                      onClick={() => handleTogglePlayerInResult('A', pName)}
                                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 hover:border-amber-500/50 flex items-center justify-between cursor-pointer transition-colors"
                                      title="انقر لنقل اللاعب إلى دكة البدلاء"
                                    >
                                      <div className="flex items-center gap-1.5 truncate">
                                        <span className="text-emerald-300 font-mono font-bold text-[10px]">#{pObj?.number || '—'}</span>
                                        <span className="text-white text-xs font-bold truncate">{pName}</span>
                                      </div>
                                      <span className="text-[9px] text-amber-300 bg-amber-950/40 px-1 rounded">دكة ←</span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* 🟡 Bench Column */}
                          <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 pb-1 border-b border-slate-800">
                              <span>🟡 البدلاء ({teamABenchResult.length})</span>
                              <span className="text-[9px] text-slate-400">انقر للأساسي</span>
                            </div>
                            <div className="space-y-1 max-h-[160px] overflow-y-auto pr-0.5">
                              {teamABenchResult.length === 0 ? (
                                <p className="text-[10px] text-slate-500 py-1 text-center">لا يوجد بدلاء</p>
                              ) : (
                                teamABenchResult.map(pName => {
                                  const pObj = squadA.find(p => p.name === pName);
                                  return (
                                    <div
                                      key={pName}
                                      onClick={() => handleTogglePlayerInResult('A', pName)}
                                      className="px-2 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between cursor-pointer transition-colors"
                                      title="انقر لنقل اللاعب إلى التشكيل الأساسي"
                                    >
                                      <div className="flex items-center gap-1.5 truncate">
                                        <span className="text-slate-400 font-mono text-[10px]">#{pObj?.number || '—'}</span>
                                        <span className="text-slate-300 text-xs truncate">{pName}</span>
                                      </div>
                                      <span className="text-[9px] text-emerald-300 bg-emerald-950/40 px-1 rounded">أساسي ←</span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

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
                    {/* 📋 تشكيل فريق B: الأساسيون والبدلاء */}
                    {/* ======================= */}
                    {showLineupsInResultModal && (
                      <div className="space-y-2.5 bg-slate-900/70 p-3 rounded-xl border border-emerald-500/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                              <Shirt className="w-3.5 h-3.5" />
                              <span>تشكيل {recordingResultMatch.teamB}</span>
                            </span>
                            <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                              {teamBStartersResult.length} أساسي
                            </span>
                            <span className="text-[10px] text-slate-300 font-bold bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                              {teamBBenchResult.length} بديل
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handlePresetLineupInResult('B', 'first7')}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
                              title="تحديد أول 7 لاعبين كأساسيين"
                            >
                              أول 7
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePresetLineupInResult('B', 'invert')}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold transition-colors cursor-pointer flex items-center gap-0.5"
                              title="عكس التشكيل (تبديل الأساسيين بالبدلاء)"
                            >
                              <ArrowRightLeft className="w-2.5 h-2.5" />
                              <span>عكس</span>
                            </button>
                          </div>
                        </div>

                        {/* All Players List categorized into Starters & Bench */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {/* 🟢 Starters Column */}
                          <div className="p-2 bg-slate-950/80 rounded-xl border border-emerald-500/30 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 pb-1 border-b border-emerald-500/20">
                              <span>🟢 الأساسيون ({teamBStartersResult.length})</span>
                              <span className="text-[9px] text-slate-400">انقر للدكة</span>
                            </div>
                            <div className="space-y-1 max-h-[160px] overflow-y-auto pr-0.5">
                              {teamBStartersResult.length === 0 ? (
                                <p className="text-[10px] text-slate-500 py-1 text-center">لا يوجد أساسيون محددون</p>
                              ) : (
                                teamBStartersResult.map(pName => {
                                  const pObj = squadB.find(p => p.name === pName);
                                  return (
                                    <div
                                      key={pName}
                                      onClick={() => handleTogglePlayerInResult('B', pName)}
                                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 hover:border-amber-500/50 flex items-center justify-between cursor-pointer transition-colors"
                                      title="انقر لنقل اللاعب إلى دكة البدلاء"
                                    >
                                      <div className="flex items-center gap-1.5 truncate">
                                        <span className="text-emerald-300 font-mono font-bold text-[10px]">#{pObj?.number || '—'}</span>
                                        <span className="text-white text-xs font-bold truncate">{pName}</span>
                                      </div>
                                      <span className="text-[9px] text-amber-300 bg-amber-950/40 px-1 rounded">دكة ←</span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* 🟡 Bench Column */}
                          <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 pb-1 border-b border-slate-800">
                              <span>🟡 البدلاء ({teamBBenchResult.length})</span>
                              <span className="text-[9px] text-slate-400">انقر للأساسي</span>
                            </div>
                            <div className="space-y-1 max-h-[160px] overflow-y-auto pr-0.5">
                              {teamBBenchResult.length === 0 ? (
                                <p className="text-[10px] text-slate-500 py-1 text-center">لا يوجد بدلاء</p>
                              ) : (
                                teamBBenchResult.map(pName => {
                                  const pObj = squadB.find(p => p.name === pName);
                                  return (
                                    <div
                                      key={pName}
                                      onClick={() => handleTogglePlayerInResult('B', pName)}
                                      className="px-2 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between cursor-pointer transition-colors"
                                      title="انقر لنقل اللاعب إلى التشكيل الأساسي"
                                    >
                                      <div className="flex items-center gap-1.5 truncate">
                                        <span className="text-slate-400 font-mono text-[10px]">#{pObj?.number || '—'}</span>
                                        <span className="text-slate-300 text-xs truncate">{pName}</span>
                                      </div>
                                      <span className="text-[9px] text-emerald-300 bg-emerald-950/40 px-1 rounded">أساسي ←</span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

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
                  <TeamLogo teamName={selectedTeamNameForMatches} size="xl" className="shadow-xl ring-2 ring-white/10" />
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
                          <TeamLogo teamName={selectedTeamNameForMatches} size="md" />
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
                          <TeamLogo teamName={opponentName} size="md" />
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

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const toDelete = editingTeam;
                    setEditingTeam(null);
                    setGlobalDeleteTeamTarget(toDelete);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={`حذف فريق ${editingTeam.name} نهائياً`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف الفريق 🗑️</span>
                </button>

                <div className="flex items-center gap-2">
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Delete Team Confirmation Modal */}
      {globalDeleteTeamTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">تأكيد حذف الفريق نهائياً</h3>
                <span className="text-xs text-rose-400 font-bold">فريق: {globalDeleteTeamTarget.name} (المجموعة {globalDeleteTeamTarget.group})</span>
              </div>
            </div>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
              هل أنت متأكد من رغبتك في حذف فريق <strong className="text-white">({globalDeleteTeamTarget.name})</strong> نهائياً من البطولة؟
              <br /><br />
              ⚠️ سيتم مسح الفريق من ترتيب المجموعة وحذف كافة مبارياته وقائمته من قاعدة البيانات.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setGlobalDeleteTeamTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteTeam(globalDeleteTeamTarget.name);
                  setGlobalDeleteTeamTarget(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>نعم، حذف الفريق نهائياً 🗑️</span>
              </button>
            </div>
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
      {/* MODAL: PLAYER REGISTRATION APPROVALS (اعتماد وقيد اللاعبين للأدمن) */}
      {/* ========================================================================= */}
      <PlayerApprovalsModal
        isOpen={isApprovalsModalOpen}
        onClose={() => setIsApprovalsModalOpen(false)}
        requests={playerRequests}
        teams={teams}
        onApproveRequest={handleApprovePlayerRequest}
        onAdminApplyPlayerEdit={handleAdminApplyPlayerEdit}
        onRejectRequest={handleRejectPlayerRequest}
        onApproveAllPending={handleApproveAllPending}
      />

      {/* ========================================================================= */}
      {/* MODAL: MATCH LINEUP (تحديد الأساسيين والبدلاء للمباراة قبل بدئها أو أثنائها) */}
      {/* ========================================================================= */}
      <MatchLineupModal
        isOpen={Boolean(editingLineupMatch)}
        onClose={() => setEditingLineupMatch(null)}
        match={editingLineupMatch}
        teams={teams}
        squads={squads}
        onSaveLineup={handleSaveMatchLineup}
        readOnly={!isAdmin && currentUser?.role !== 'team_manager'}
      />

      {/* ========================================================================= */}
      {/* MODAL: MATCH ALERT COMPOSER (إرسال تنبيه رسمي للاعبين للأدمن) */}
      {/* ========================================================================= */}
      <MatchAlertComposerModal
        isOpen={isAlertComposerOpen}
        onClose={() => {
          setIsAlertComposerOpen(false);
          setAlertComposerMatch(null);
        }}
        match={alertComposerMatch}
        teams={teams}
        squads={squads}
        adminName={currentUser?.name || 'مدير البطولة'}
        onSendAlert={handleSendManualAlert}
      />

      {/* ========================================================================= */}
      {/* MODAL: MATCH ALERTS LIST & NOTIFICATION CENTER (مركز التنبيهات والإشعارات) */}
      {/* ========================================================================= */}
      <MatchAlertsListModal
        isOpen={isAlertsListOpen}
        onClose={() => setIsAlertsListOpen(false)}
        alerts={matchAlerts}
        currentUser={currentUser}
        isAdmin={isAdmin}
        onAcknowledgeAlert={handleAcknowledgeAlert}
        onMarkAsRead={handleMarkAlertAsRead}
        onMarkAllAsRead={handleMarkAllAlertsAsRead}
        onDeleteAlert={handleDeleteAlert}
        onComposeNewAlert={() => {
          const defaultMatch = matches.find(m => m.isScheduled) || matches[0];
          setAlertComposerMatch(defaultMatch);
          setIsAlertComposerOpen(true);
        }}
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

      {/* ========================================================================= */}
      {/* MODAL: FORCE PASSWORD CHANGE ON FIRST LOGIN (ahsaber@nu.edu.eg) */}
      {/* ========================================================================= */}
      {showFirstLoginPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md" dir="rtl">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl shadow-emerald-500/10 space-y-5 relative overflow-hidden">
            {/* Header Glow */}
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
            
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  تعيين كلمة مرور شخصية جديدة 🔒
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  مرحباً بك يا <strong className="text-emerald-300 font-bold">{currentUser?.name || 'كابتن'}</strong>! نظراً لأن هذا أول تسجيل دخول لك بالحساب ({currentUser?.email})، يرجى تعيين كلمة مرور شخصية خاصة بك (لمرة واحدة فقط).
                </p>
              </div>
            </div>

            {passwordChangeError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{passwordChangeError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  كلمة المرور الجديدة *
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="أدخل كلمة مرور جديدة (6 خانات على الأقل)..."
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  تأكيد كلمة المرور الجديدة *
                </label>
                <input
                  type="password"
                  required
                  placeholder="أعد كتابة كلمة المرور للتأكيد..."
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>حفظ كلمة المرور وتفعيل الحساب الآن ⚡</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FULL BACKUP & RESTORE / SYSTEM ZERO RESET */}
      {/* ========================================================================= */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        currentUser={currentUser}
        users={users}
        teams={teams}
        matches={matches}
        squads={squads}
        applications={applications}
        seasons={seasons}
        archivedSnapshots={archivedSnapshots}
        activeSeasonId={activeSeasonId}
        currentSeasonName={currentSeasonName}
        currentAcademicYear={currentAcademicYear}
        onRestoreComplete={handleRestoreComplete}
        onResetToZero={handleResetToZero}
      />

      {/* ========================================================================= */}
      {/* MODAL: EXPORT GROUP STANDINGS & STATS PDF */}
      {/* ========================================================================= */}
      <ExportStandingsPDFModal
        isOpen={isPdfExportModalOpen}
        onClose={() => setIsPdfExportModalOpen(false)}
        teams={teams}
        matches={matches}
        getGroupStandings={getGroupStandings}
        selectedGroup={selectedGroup}
        seasonName={currentSeasonName}
        academicYear={currentAcademicYear}
        scheduledMatchesCount={scheduledMatchesCount}
      />

      {/* ========================================================================= */}
      {/* MODAL: GEMINI AI MULTI-TURN CHATBOT & IMAGE ROSTER EXTRACTION */}
      {/* ========================================================================= */}
      <GeminiChatbotModal
        isOpen={isGeminiChatbotOpen}
        onClose={() => setIsGeminiChatbotOpen(false)}
        teams={teams}
        onUpdateTeams={setTeams}
        squads={squads}
        onUpdateSquads={setSquads}
        currentSeasonName={currentSeasonName}
        currentAcademicYear={currentAcademicYear}
        isAdmin={isAdmin}
      />

      {/* ========================================================================= */}
      {/* MODAL: ROSTER & DUPLICATE PLAYERS AUDIT MODAL */}
      {/* ========================================================================= */}
      <RosterAuditModal
        isOpen={isRosterAuditModalOpen}
        onClose={() => setIsRosterAuditModalOpen(false)}
        teams={teams}
        squads={squads}
        onUpdateSquads={(newSquads) => {
          setSquads(newSquads);
          saveStoredSquads(newSquads);
        }}
        onSelectTeamForView={(teamName) => {
          setSelectedTeamNameForMatches(teamName);
          setCurrentTab('teams_roster');
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL: CSV / BULK TOURNAMENT UPLOAD MODAL */}
      {/* ========================================================================= */}
      <CsvTournamentUploadModal
        isOpen={isCsvUploadModalOpen}
        onClose={() => setIsCsvUploadModalOpen(false)}
        currentTeams={teams}
        currentSquads={squads}
        onApplyImport={({ teams: importedTeams, squads: importedSquads, mode }) => {
          if (mode === 'replace') {
            setTeams(importedTeams);
            setSquads(importedSquads);
            saveStoredSquads(importedSquads);
            try {
              localStorage.setItem('dawry_teams_custom_v1', JSON.stringify(importedTeams));
            } catch {}
          } else {
            const mergedTeams = [...teams];
            importedTeams.forEach(it => {
              if (!mergedTeams.some(t => t.name === it.name)) {
                mergedTeams.push(it);
              }
            });
            setTeams(mergedTeams);
            try {
              localStorage.setItem('dawry_teams_custom_v1', JSON.stringify(mergedTeams));
            } catch {}
            const mergedSquads = { ...squads, ...importedSquads };
            setSquads(mergedSquads);
            saveStoredSquads(mergedSquads);
          }
          setIsCsvUploadModalOpen(false);
          confetti({ particleCount: 50, spread: 70 });
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL: MATCH VOTE & PREDICTIONS MODAL (صوّت لمباراة) */}
      {/* ========================================================================= */}
      <MatchVoteModal
        isOpen={isMatchVoteModalOpen}
        onClose={() => {
          setIsMatchVoteModalOpen(false);
          setGlobalUserVotes(loadUserVotes(currentUser?.id || 'guest_voter'));
        }}
        initialMatch={votingSelectedMatch}
        matches={matches}
        currentUser={currentUser}
        onNavigateToPredictions={() => setCurrentTab('match_predictions')}
      />

      {/* ========================================================================= */}
      {/* MODAL: CREATE BRAND NEW SEASON WITH ZERO POINTS */}
      {/* ========================================================================= */}
      {isAdminNewSeasonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">إطلاق موسم جديد كلياً (0 نقاط) 🏆</h3>
                  <p className="text-xs text-slate-400">بدء دوري جديد مع خيار أرشفة الموسم الحالي</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminNewSeasonModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await handleStartNewSeasonZeroPoints(adminNewSeasonForm);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  اسم الموسم / النسخة الجديدة *
                </label>
                <input
                  type="text"
                  required
                  value={adminNewSeasonForm.name}
                  onChange={(e) => setAdminNewSeasonForm({ ...adminNewSeasonForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                  placeholder="مثال: دوري جامعة النيل 2027 - النسخة السادسة"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    العام الأكاديمي *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminNewSeasonForm.year}
                    onChange={(e) => setAdminNewSeasonForm({ ...adminNewSeasonForm, year: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    placeholder="مثال: 2026 / 2027"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    عدد فرق البطولة
                  </label>
                  <input
                    type="number"
                    value={adminNewSeasonForm.teamsCount}
                    onChange={(e) => setAdminNewSeasonForm({ ...adminNewSeasonForm, teamsCount: Number(e.target.value) || 48 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold text-center"
                  />
                </div>
              </div>

              {/* Archive Previous Season Option */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminNewSeasonForm.archivePrevious}
                    onChange={(e) => setAdminNewSeasonForm({ ...adminNewSeasonForm, archivePrevious: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900"
                  />
                  <span className="text-xs font-black text-amber-300">
                    أرشفة وحفظ نتائج وفرق الموسم الحالي في قاعدة البيانات 📦
                  </span>
                </label>

                {adminNewSeasonForm.archivePrevious && (
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        بطل الموسم الحالي (Champion)
                      </label>
                      <input
                        type="text"
                        value={adminNewSeasonForm.champion}
                        onChange={(e) => setAdminNewSeasonForm({ ...adminNewSeasonForm, champion: e.target.value })}
                        placeholder="مثال: برشلونة (أو يترك فارغاً ليكتشف تلقائياً من النهائي)"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        وصيف البطولة (Runner-up)
                      </label>
                      <input
                        type="text"
                        value={adminNewSeasonForm.runnerUp}
                        onChange={(e) => setAdminNewSeasonForm({ ...adminNewSeasonForm, runnerUp: e.target.value })}
                        placeholder="مثال: الزمالك"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Reset points explanation banner */}
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs leading-relaxed space-y-1">
                <strong className="block font-black text-white">ماذا سيحدث عند الضغط على تأكيد؟</strong>
                <p>
                  1. حفظ أرشيف كامل للموسم الحالي في قاعدة البيانات (الفرق والنتائج والمباريات).
                </p>
                <p>
                  2. تصفير نقاط وجداول جميع الفرق إلى (0 نقاط، 0 لعب، 0 فوز، 0 أهداف).
                </p>
                <p>
                  3. إعادة تهيئة جميع الـ 152 مباراة لتصبح قادمة للموسم الجديد.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isStartingSeasonInAdmin}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isStartingSeasonInAdmin ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>جارٍ أرشفة وتصفير الموسم...</span>
                    </>
                  ) : (
                    <>
                      <Trophy className="w-4 h-4" />
                      <span>تأكيد وإطلاق الموسم الجديد بصفر نقاط 🏆</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsAdminNewSeasonModalOpen(false)}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ARCHIVE VIEWER */}
      {/* ========================================================================= */}
      {isAdminArchiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">سجل وأرشيف المواسم السابقة 🏛️</h3>
                  <p className="text-xs text-slate-400">تاريخ البطولات والنتائج المحفوظة في قاعدة البيانات</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminArchiveModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {archivedSnapshots.length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 space-y-2">
                  <Archive className="w-12 h-12 text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-300">لا توجد مواسم مؤرشفة حتى الآن</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    عند إنشاء موسم جديد كلياً وتفعيل خيار الأرشفة، ستظهر جميع النسخ السابقة هنا.
                  </p>
                </div>
              ) : (
                archivedSnapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div>
                        <span className="text-xs font-black text-amber-400 font-mono block">
                          {snap.year}
                        </span>
                        <strong className="text-base font-black text-white block">
                          {snap.seasonName}
                        </strong>
                      </div>

                      <span className="text-[11px] text-slate-400 font-mono">
                        أرشف في: {new Date(snap.archivedAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block mb-0.5">🏆 البطل الرسمي:</span>
                        <strong className="text-emerald-400 font-black">{snap.champion || 'غير محدد'}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block mb-0.5">🥈 الوصيف:</span>
                        <strong className="text-slate-200 font-black">{snap.runnerUp || 'غير محدد'}</strong>
                      </div>
                    </div>

                    {snap.scorersSummary && (
                      <div className="text-[11px] text-amber-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        ⚽ أبرز الهدافين: {snap.scorersSummary}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>عدد الفرق: {snap.teamsCount || 48} فريقاً</span>
                      <span>عدد المباريات: {snap.matchesCount || 152} مباراة</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsAdminArchiveModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Tournament Copilot Button (Admin Only) */}
      {isAdmin && (
        <button
          type="button"
          onClick={() => setIsGeminiChatbotOpen(true)}
          className="fixed bottom-6 left-6 z-40 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-2xl shadow-emerald-600/50 border border-emerald-400/50 flex items-center gap-2.5 transition-all cursor-pointer hover:scale-105 active:scale-95 group"
          title="المساعد الذكي للبطولة — اسأل بالذكاء الاصطناعي أو أرسل صورة كشف اللاعبين لإضافتها (للأدمن فقط)"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-emerald-100 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 border-2 border-slate-900 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 border-2 border-slate-900 rounded-full" />
          </div>
          <span className="text-xs font-black hidden sm:inline">
            المساعد الذكي (AI) 🤖
          </span>
          <span className="text-[10px] bg-emerald-950/70 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
            إضافة من صورة 📷
          </span>
        </button>
      )}

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
