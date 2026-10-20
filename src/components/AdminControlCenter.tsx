import React, { useState, useMemo } from 'react';
import { 
  SlidersHorizontal, 
  Shield, 
  Calendar, 
  Users, 
  Trophy, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  PlusCircle, 
  Archive, 
  Database, 
  Edit3, 
  Eye, 
  Search, 
  Key, 
  Bell, 
  UserCheck, 
  UserPlus, 
  Clock, 
  MapPin, 
  ChevronRight, 
  Layers, 
  Filter, 
  Send, 
  X, 
  Check, 
  Trash2, 
  ExternalLink,
  Crown,
  Zap,
  ArrowRight,
  Bot,
  FileSpreadsheet,
  ShieldAlert
} from 'lucide-react';
import { Team, Match } from '../App';
import { AppUser, UserRole, PERMANENT_ADMIN_EMAIL } from '../utils/auth';
import { TeamApplication, TournamentSeason, ArchivedSeasonSnapshot } from '../utils/apiSync';
import { PlayerRegistrationRequest } from '../utils/roster';
import { TeamLogo } from '../utils/teamLogos';
import { UsersDirectoryPage } from './UsersDirectoryPage';

interface AdminControlCenterProps {
  currentUser: AppUser | null;
  teams: Team[];
  matches: Match[];
  users: AppUser[];
  playerRequests: PlayerRegistrationRequest[];
  applications: TeamApplication[];
  seasons: TournamentSeason[];
  archivedSnapshots: ArchivedSeasonSnapshot[];
  isPlayerEditingOpen: boolean;
  onTogglePlayerEditing: () => void;
  isLeagueRegistrationVisible: boolean;
  onToggleRegistrationVisible: () => void;
  isLeagueRegistrationOpen: boolean;
  onToggleRegistrationOpen: () => void;
  activeSeasonId: string;
  currentSeasonName: string;
  currentAcademicYear: string;
  onOpenApprovalsModal: () => void;
  onOpenRoundOrganizer: () => void;
  onOpenAlertComposer: () => void;
  onOpenBackupModal: () => void;
  onOpenNewSeasonModal: () => void;
  onOpenArchiveModal: () => void;
  onOpenBulkEditModal: () => void;
  onEditTeam: (team: Team) => void;
  onScheduleMatch: (match: Match) => void;
  onResetAllMatches: () => void;
  onSelectTeamForMatches: (teamName: string) => void;
  onAssignManager: (data: {
    email: string;
    password?: string;
    teamName: string;
    name?: string;
    studentId?: string;
    department?: string;
  }) => Promise<void> | void;
  onUnassignManager: (userId: string, email: string) => Promise<void> | void;
  onUpdateUserRole: (userId: string, newRole: UserRole, teamName?: string) => void;
  onUpdateUser: (updatedUser: AppUser) => void;
  onAddUser: (newUser: AppUser) => void;
  onDeleteUser: (userId: string) => void;
  onRefreshUsers?: () => void;
  onRefreshApplications?: () => void;
  onReviewApplication: (id: string, status: 'approved' | 'rejected', reviewNotes?: string) => Promise<void>;
  onNavigateTab: (tab: any) => void;
  onOpenAiCopilot?: () => void;
  onOpenCsvUploadModal?: () => void;
  onOpenAuditModal?: () => void;
  duplicatePlayersCount?: number;
  onPurgeNewTeamsAndUnifyBilingual?: () => void;
  onDeleteTeam?: (teamNameOrId: string) => void;
  onClearAllSquads?: () => void;
  onCleanWipeKeepTeamsOnly?: () => void;
  onRecordResult?: (match: Match) => void;
  onOpenKnockoutDraw?: () => void;
}

export const AdminControlCenter: React.FC<AdminControlCenterProps> = ({
  currentUser,
  teams,
  matches,
  users,
  playerRequests,
  applications,
  seasons,
  archivedSnapshots,
  isPlayerEditingOpen,
  onTogglePlayerEditing,
  isLeagueRegistrationVisible,
  onToggleRegistrationVisible,
  isLeagueRegistrationOpen,
  onToggleRegistrationOpen,
  activeSeasonId,
  currentSeasonName,
  currentAcademicYear,
  onOpenApprovalsModal,
  onOpenRoundOrganizer,
  onOpenAlertComposer,
  onOpenBackupModal,
  onOpenNewSeasonModal,
  onOpenArchiveModal,
  onOpenBulkEditModal,
  onEditTeam,
  onScheduleMatch,
  onResetAllMatches,
  onSelectTeamForMatches,
  onAssignManager,
  onUnassignManager,
  onUpdateUserRole,
  onUpdateUser,
  onAddUser,
  onDeleteUser,
  onRefreshUsers,
  onRefreshApplications,
  onReviewApplication,
  onNavigateTab,
  onOpenAiCopilot,
  onOpenCsvUploadModal,
  onOpenAuditModal,
  duplicatePlayersCount,
  onPurgeNewTeamsAndUnifyBilingual,
  onDeleteTeam,
  onClearAllSquads,
  onCleanWipeKeepTeamsOnly,
  onRecordResult,
  onOpenKnockoutDraw,
}) => {
  // In-App Confirmation & Audit Modals
  const [deleteTeamModalTarget, setDeleteTeamModalTarget] = useState<Team | null>(null);
  const [clearAllSquadsModalOpen, setClearAllSquadsModalOpen] = useState<boolean>(false);
  const [isTeamsAuditModalOpen, setIsTeamsAuditModalOpen] = useState<boolean>(false);
  // Internal tab in Admin Center: 'overview' | 'teams' | 'matches' | 'applications' | 'users'
  const [adminTab, setAdminTab] = useState<'overview' | 'teams' | 'matches' | 'applications' | 'users'>('overview');

  // Teams tab state
  const [teamsSearch, setTeamsSearch] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [managerFilter, setManagerFilter] = useState<'all' | 'assigned' | 'vacant'>('all');

  // Quick Assign Manager Modal State inside Admin
  const [assigningTeam, setAssigningTeam] = useState<Team | null>(null);
  const [assignEmail, setAssignEmail] = useState<string>('');
  const [assignName, setAssignName] = useState<string>('');
  const [assignPassword, setAssignPassword] = useState<string>('NU@2026');
  const [isAssigningSaving, setIsAssigningSaving] = useState<boolean>(false);

  // Matches tab state
  const [matchSearch, setMatchSearch] = useState<string>('');
  const [matchStageFilter, setMatchStageFilter] = useState<string>('all');
  const [matchGroupFilter, setMatchGroupFilter] = useState<string>('all');
  const [onlyUnscheduled, setOnlyUnscheduled] = useState<boolean>(false);

  // Applications tab state
  const [applicationFilter, setApplicationFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [reviewingAppId, setReviewingAppId] = useState<string | null>(null);
  const [reviewNotesInput, setReviewNotesInput] = useState<string>('');

  // Map of teamName -> manager AppUser
  const teamManagersMap = useMemo(() => {
    const map = new Map<string, AppUser>();
    users.forEach(u => {
      if (u.role === 'team_manager' && u.managedTeamName) {
        map.set(u.managedTeamName, u);
      }
    });
    return map;
  }, [users]);

  // Counts & Metrics
  const pendingPlayerRequestsCount = useMemo(() => {
    return playerRequests.filter(r => r.status === 'pending').length;
  }, [playerRequests]);

  const pendingApplicationsCount = useMemo(() => {
    return applications.filter(a => a.status === 'pending').length;
  }, [applications]);

  const scheduledMatchesCount = useMemo(() => {
    return matches.filter(m => m.isScheduled).length;
  }, [matches]);

  const unscheduledMatchesCount = useMemo(() => {
    return matches.length - scheduledMatchesCount;
  }, [matches.length, scheduledMatchesCount]);

  const finishedMatchesCount = useMemo(() => {
    return matches.filter(m => m.status === 'finished').length;
  }, [matches]);

  const teamsWithoutManagerCount = useMemo(() => {
    return teams.filter(t => !teamManagersMap.has(t.name)).length;
  }, [teams, teamManagersMap]);

  // Filtered Teams
  const filteredTeams = useMemo(() => {
    return teams.filter(t => {
      const matchesSearch = !teamsSearch || t.name.toLowerCase().includes(teamsSearch.toLowerCase());
      const matchesGroup = selectedGroup === 'all' || t.group === selectedGroup;
      const isAssigned = teamManagersMap.has(t.name);
      const matchesManager = managerFilter === 'all' || 
        (managerFilter === 'assigned' && isAssigned) || 
        (managerFilter === 'vacant' && !isAssigned);
      return matchesSearch && matchesGroup && matchesManager;
    });
  }, [teams, teamsSearch, selectedGroup, managerFilter, teamManagersMap]);

  // Filtered Matches
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      if (onlyUnscheduled && m.isScheduled) return false;
      if (matchStageFilter !== 'all' && m.stage !== matchStageFilter) return false;
      if (matchGroupFilter !== 'all' && m.group !== matchGroupFilter) return false;
      if (matchSearch) {
        const query = matchSearch.toLowerCase();
        const matchesTeam = m.teamA.toLowerCase().includes(query) || m.teamB.toLowerCase().includes(query);
        const matchesStage = m.stageName.toLowerCase().includes(query);
        if (!matchesTeam && !matchesStage) return false;
      }
      return true;
    });
  }, [matches, onlyUnscheduled, matchStageFilter, matchGroupFilter, matchSearch]);

  // Handle Quick Assign
  const handleQuickAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTeam || !assignEmail.trim()) return;

    setIsAssigningSaving(true);
    try {
      await onAssignManager({
        teamName: assigningTeam.name,
        email: assignEmail.trim().toLowerCase(),
        name: assignName.trim() || undefined,
        password: assignPassword.trim() || 'NU@2026',
      });
      setAssigningTeam(null);
      setAssignEmail('');
      setAssignName('');
    } finally {
      setIsAssigningSaving(false);
    }
  };

  const handleOpenAssignModal = (team: Team) => {
    const existingManager = teamManagersMap.get(team.name);
    setAssigningTeam(team);
    setAssignEmail(existingManager ? existingManager.email : '');
    setAssignName(existingManager ? existingManager.name : '');
    setAssignPassword('NU@2026');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. TOP HERO HEADER & SYSTEM STATUS */}
      {/* ========================================================================= */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Top Brand & Title Header */}
          <div className="flex items-start gap-4 w-full">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-500/30 ring-4 ring-amber-500/20 shrink-0">
              <Crown className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  لوحة تحكم المشرف العام ⚡
                </span>
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-950/80 text-slate-300 border border-slate-800">
                  {currentAcademicYear}
                </span>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  🟢 {currentSeasonName}
                </span>
              </div>

              <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-white tracking-tight">
                مركز إدارة وتحكم بطولة دوري جامعة النيل
              </h1>
              <p className="text-xs md:text-sm text-slate-300 max-w-3xl leading-relaxed">
                لوحة مبسطة وسريعة للتحكم بجميع مفاصل البطولة: الفرق، جدول المباريات، قيد اللاعبين، تعيين المدربين، واستمارات التقديم بنقرة واحدة.
              </p>
            </div>
          </div>

          {/* Quick Global Action Buttons Toolbar */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2.5">
              {onOpenCsvUploadModal && (
                <button
                  type="button"
                  onClick={onOpenCsvUploadModal}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-600/30 border border-teal-400/40 hover:scale-[1.02] active:scale-[0.98]"
                  title="استيراد وتوليد هيكل البطولة والفرق عبر ملف CSV"
                >
                  <FileSpreadsheet className="w-4 h-4 text-teal-200" />
                  <span>استيراد CSV 📊</span>
                </button>
              )}

              {onOpenAiCopilot && (
                <button
                  type="button"
                  onClick={onOpenAiCopilot}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/30 border border-emerald-400/40 hover:scale-[1.02] active:scale-[0.98]"
                  title="إضافة لاعبين وفرق من صورة بالذكاء الاصطناعي (Gemini AI)"
                >
                  <Bot className="w-4 h-4 text-emerald-200" />
                  <span>إضافة من صورة (AI) 📷</span>
                </button>
              )}

              {onOpenAuditModal && (
                <button
                  type="button"
                  onClick={onOpenAuditModal}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-amber-600 to-rose-700 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-600/20 border border-rose-400/40 hover:scale-[1.02] active:scale-[0.98]"
                  title="فاحص الازدواجية وتدقيق الفرق واللاعبين المكررين"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-200" />
                  <span>فاحص الازدواجية والفرق ⚠️</span>
                  {duplicatePlayersCount !== undefined && duplicatePlayersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-white text-rose-600 font-mono text-[10px] font-black">
                      {duplicatePlayersCount}
                    </span>
                  )}
                </button>
              )}

              {onPurgeNewTeamsAndUnifyBilingual && (
                <button
                  type="button"
                  onClick={onPurgeNewTeamsAndUnifyBilingual}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-900/30 border border-purple-400/40 hover:scale-[1.02] active:scale-[0.98]"
                  title="مسح الفرق واللاعبين المضافين الجدد وتوحيد العربي والإنجليزي كفريق واحد"
                >
                  <Sparkles className="w-4 h-4 text-purple-200" />
                  <span>حذف الجدد وتوحيد العربي/الإنجليزي 🧹</span>
                </button>
              )}



              <button
                type="button"
                onClick={() => setIsTeamsAuditModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950/90 hover:bg-slate-800 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md hover:border-teal-400"
                title="فحص صحة الفرق الـ 48 والتأكد من عدم وجود فرق مش شغالة أو مكررة"
              >
                <Shield className="w-4 h-4 text-teal-400" />
                <span>فحص ومراجعة الفرق ({teams.length}) 🛡️</span>
              </button>

              <button
                type="button"
                onClick={onOpenBackupModal}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950/90 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md hover:border-emerald-400"
                title="نسخ احتياطي واستعادة قاعدة البيانات"
              >
                <Database className="w-4 h-4 text-emerald-400" />
                <span>نسخ احتياطي 💾</span>
              </button>

              <button
                type="button"
                onClick={onOpenNewSeasonModal}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/25"
                title="إطلاق موسم جديد بصفر نقاط"
              >
                <PlusCircle className="w-4 h-4" />
                <span>موسم جديد (0 نقاط) 🏆</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick KPI Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 border-t border-slate-800/80 mt-6 relative z-10">
          <div 
            onClick={() => setAdminTab('teams')}
            className="p-3 bg-slate-950/70 hover:bg-slate-950 rounded-2xl border border-slate-800/80 hover:border-emerald-500/40 transition-all cursor-pointer group text-center"
          >
            <span className="text-[11px] text-slate-400 block mb-1 group-hover:text-emerald-300 transition-colors">إجمالي الفرق 🛡️</span>
            <strong className="text-xl md:text-2xl font-black text-white">{teams.length}</strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">8 مجموعات (A-H)</span>
          </div>

          <div 
            onClick={() => setAdminTab('matches')}
            className="p-3 bg-slate-950/70 hover:bg-slate-950 rounded-2xl border border-slate-800/80 hover:border-emerald-500/40 transition-all cursor-pointer group text-center"
          >
            <span className="text-[11px] text-slate-400 block mb-1 group-hover:text-emerald-300 transition-colors">المباريات المجدولة 📅</span>
            <strong className="text-xl md:text-2xl font-black text-emerald-400">{scheduledMatchesCount} / {matches.length}</strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">{finishedMatchesCount} منتهية</span>
          </div>

          <div 
            onClick={onOpenApprovalsModal}
            className="p-3 bg-slate-950/70 hover:bg-slate-950 rounded-2xl border border-slate-800/80 hover:border-amber-500/40 transition-all cursor-pointer group text-center"
          >
            <span className="text-[11px] text-slate-400 block mb-1 group-hover:text-amber-300 transition-colors">طلبات قيد اللاعبين 👥</span>
            <strong className={`text-xl md:text-2xl font-black ${pendingPlayerRequestsCount > 0 ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
              {pendingPlayerRequestsCount}
            </strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {pendingPlayerRequestsCount > 0 ? 'معلقة تتطلب موافقة ⚠️' : 'لا توجد طلبات معلقة'}
            </span>
          </div>

          <div 
            onClick={() => setAdminTab('applications')}
            className="p-3 bg-slate-950/70 hover:bg-slate-950 rounded-2xl border border-slate-800/80 hover:border-amber-500/40 transition-all cursor-pointer group text-center"
          >
            <span className="text-[11px] text-slate-400 block mb-1 group-hover:text-amber-300 transition-colors">استمارات التقديم 🏆</span>
            <strong className={`text-xl md:text-2xl font-black ${pendingApplicationsCount > 0 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
              {pendingApplicationsCount}
            </strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {pendingApplicationsCount > 0 ? 'استمارة جديدة معلقة' : 'محدثة'}
            </span>
          </div>

          <div 
            onClick={() => setAdminTab('users')}
            className="p-3 bg-slate-950/70 hover:bg-slate-950 rounded-2xl border border-slate-800/80 hover:border-purple-500/40 transition-all cursor-pointer group text-center col-span-2 sm:col-span-1"
          >
            <span className="text-[11px] text-slate-400 block mb-1 group-hover:text-purple-300 transition-colors">المستخدمون المسجلون 👤</span>
            <strong className="text-xl md:text-2xl font-black text-purple-400">{users.length}</strong>
            <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
              {users.filter(u => u.isOnline).length} متصل الآن 🟢
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THREE MASTER QUICK TOGGLES (مفاتيح التحكم الفورية في النظام) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Toggle 1: Player Roster Editing */}
        <div className={`p-5 rounded-3xl border transition-all shadow-xl flex flex-col justify-between gap-4 ${
          isPlayerEditingOpen
            ? 'bg-gradient-to-br from-emerald-950/60 to-slate-900 border-emerald-500/40'
            : 'bg-gradient-to-br from-slate-900 to-amber-950/50 border-amber-500/40'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isPlayerEditingOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {isPlayerEditingOpen ? <Sparkles className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <strong className="text-sm font-black text-white block">قيد وتعديل اللاعبين</strong>
                <span className={`text-[11px] font-bold block ${isPlayerEditingOpen ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isPlayerEditingOpen ? '🟢 متاح ومفتوح للفرق' : '🔒 مقفل (يتطلب موافقة الأدمن)'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onTogglePlayerEditing}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md ${
                isPlayerEditingOpen
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              {isPlayerEditingOpen ? 'قفل القوائم 🔒' : 'فتح القوائم 🟢'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isPlayerEditingOpen
              ? 'يمكن للمدربين تعديل تشكيلاتهم وأسماء اللاعبين مباشرة بدون الرجوع للإدارة.'
              : 'القوائم مقفلة. أي إضافة أو تعديل للاعب تصلك كطلب اعتماد للموافقة أولاً.'}
          </p>
        </div>

        {/* Toggle 2: League Registration Visibility */}
        <div className={`p-5 rounded-3xl border transition-all shadow-xl flex flex-col justify-between gap-4 ${
          isLeagueRegistrationVisible
            ? 'bg-gradient-to-br from-sky-950/60 to-slate-900 border-sky-500/40'
            : 'bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isLeagueRegistrationVisible ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'
              }`}>
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <strong className="text-sm font-black text-white block">ظهور صفحة التقديم</strong>
                <span className={`text-[11px] font-bold block ${isLeagueRegistrationVisible ? 'text-sky-400' : 'text-slate-400'}`}>
                  {isLeagueRegistrationVisible ? '🟢 ظاهرة للجمهور بالقائمة' : '🔒 مخفية عن الزوار'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleRegistrationVisible}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md ${
                isLeagueRegistrationVisible
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
              }`}
            >
              {isLeagueRegistrationVisible ? 'إخفاء عن الجمهور 👁️' : 'إظهار للجميع 🟢'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isLeagueRegistrationVisible
              ? 'زر "التقديم في الدوري" ظاهر في الشريط العلوي لجميع الطلاب والزوار.'
              : 'صفحة التقديم مخفية عن الزوار وتظهر فقط لك كأدمن لإدارتها.'}
          </p>
        </div>

        {/* Toggle 3: Submissions Open/Closed */}
        <div className={`p-5 rounded-3xl border transition-all shadow-xl flex flex-col justify-between gap-4 ${
          isLeagueRegistrationOpen
            ? 'bg-gradient-to-br from-teal-950/60 to-slate-900 border-teal-500/40'
            : 'bg-gradient-to-br from-slate-900 to-rose-950/40 border-rose-500/30'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isLeagueRegistrationOpen ? 'bg-teal-500/20 text-teal-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <strong className="text-sm font-black text-white block">باب التقديم واستقبال الفرق</strong>
                <span className={`text-[11px] font-bold block ${isLeagueRegistrationOpen ? 'text-teal-400' : 'text-rose-400'}`}>
                  {isLeagueRegistrationOpen ? '🟢 الاستقبال مفتوح' : '🔒 مقفل مؤقتاً'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleRegistrationOpen}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md ${
                isLeagueRegistrationOpen
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                  : 'bg-teal-500 hover:bg-teal-400 text-slate-950'
              }`}
            >
              {isLeagueRegistrationOpen ? 'إغلاق التقديم 🔒' : 'فتح التقديم ⚡'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isLeagueRegistrationOpen
              ? 'استقبال استمارات تسجيل الفرق متاح ويصل مباشرة إلى لوحة المشرف.'
              : 'تم إيقاف استقبال الطلبات بقرار من إدارة البطولة.'}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. URGENT NOTIFICATIONS / PENDING ACTIONS BANNER */}
      {/* ========================================================================= */}
      {(pendingPlayerRequestsCount > 0 || pendingApplicationsCount > 0 || teamsWithoutManagerCount > 0) && (
        <div className="p-4 md:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 animate-pulse">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-sm font-black text-amber-300 block">مهام إدارية عاجلة تتطلب تدخلك:</strong>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-0.5">
                {pendingPlayerRequestsCount > 0 && (
                  <span>• {pendingPlayerRequestsCount} طلبات قيد لاعبين معلقة</span>
                )}
                {pendingApplicationsCount > 0 && (
                  <span>• {pendingApplicationsCount} استمارات تقديم فرق بانتظار الاعتماد</span>
                )}
                {teamsWithoutManagerCount > 0 && (
                  <span>• {teamsWithoutManagerCount} فرقة لم يُعين لها مسؤول حتى الآن</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pendingPlayerRequestsCount > 0 && (
              <button
                type="button"
                onClick={onOpenApprovalsModal}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-md"
              >
                اعتماد طلبات اللاعبين ➔
              </button>
            )}
            {pendingApplicationsCount > 0 && (
              <button
                type="button"
                onClick={() => setAdminTab('applications')}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 font-bold text-xs transition-colors cursor-pointer"
              >
                مراجعة الاستمارات ➔
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CLEAN ADMIN INTERNAL NAVIGATION TABS */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
        <button
          type="button"
          onClick={() => setAdminTab('overview')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs md:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            adminTab === 'overview'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 ring-1 ring-amber-300'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>التحكم السريع</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('teams')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs md:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            adminTab === 'teams'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 ring-1 ring-emerald-400'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>الفرق والمدربين ({teams.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('matches')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs md:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            adminTab === 'matches'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 ring-1 ring-emerald-400'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>المباريات والجدولة ({scheduledMatchesCount}/{matches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('applications')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs md:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            adminTab === 'applications'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 ring-1 ring-amber-300'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>التقديم والمواسم {pendingApplicationsCount > 0 && `(${pendingApplicationsCount})`}</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('users')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs md:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            adminTab === 'users'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25 ring-1 ring-purple-400'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>المستخدمين والصلاحيات ({users.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 5. TAB 1: OVERVIEW & QUICK ACTIONS (التحكم السريع) */}
      {/* ========================================================================= */}
      {adminTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Action Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Dedicated Card: CSV Tournament & Rosters Import */}
            {onOpenCsvUploadModal && (
              <div className="p-5 rounded-3xl bg-gradient-to-br from-teal-950/70 via-slate-900 to-emerald-950/50 border border-teal-500/40 hover:border-teal-400 transition-all shadow-xl space-y-4 flex flex-col justify-between group">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/25 group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-white">استيراد هيكل البطولة (CSV) 📊</h3>
                      <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold border border-teal-500/30">
                        Excel / Sheets
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      ارفع ملف CSV لتوليد الفرق والمجموعات وقوائم اللاعبين وأرقامهم ومراكزهم دفعة واحدة وتحديث هيكل البطولة تلقائياً.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenCsvUploadModal}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-teal-600/30"
                >
                  <FileSpreadsheet className="w-4 h-4 text-teal-200" />
                  <span>رفع واستيراد ملف CSV 📂</span>
                </button>
              </div>
            )}

            {/* Dedicated Card: AI Image Roster Extraction */}
            {onOpenAiCopilot && (
              <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-950/70 via-slate-900 to-teal-950/50 border border-emerald-500/40 hover:border-emerald-400 transition-all shadow-xl space-y-4 flex flex-col justify-between group">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-white">إضافة من صورة (AI) 📷</h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                        Gemini AI
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      أرسل صورة كشف اللاعبين أو قوائم الفرق وسيقوم المساعد الذكي باستخراج الأسماء والمراكز وإضافتها بنفسه للبطولة فوراً.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenAiCopilot}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/30"
                >
                  <Bot className="w-4 h-4 text-emerald-200" />
                  <span>فتح المساعد وإرسال الصورة 🤖</span>
                </button>
              </div>
            )}

            {/* Card 1: Schedule Round Matchups */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all shadow-xl space-y-4 flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">منظم جولات المجموعات</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    تحديد مواعيد جولات المجموعات (الجولة 1 حتى 5) دفعة واحدة وتوزيع الملاعب والتوقيتات تلقائياً.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenRoundOrganizer}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <Calendar className="w-4 h-4" />
                <span>فتح منظم الجولات 🔄</span>
              </button>
            </div>

            {/* Card 2: Send Match Alert Notification */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all shadow-xl space-y-4 flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">إرسال إشعار للمباراة</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    إرسال تنبيه فوري رسمي للاعبي ومدربي الفريقين بتوقيت وموقع المباراة ورابط الحضور.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenAlertComposer}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>إنشاء وإرسال تنبيه 🔔</span>
              </button>
            </div>

            {/* Card 3: Bulk Edit Teams */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-sky-500/40 transition-all shadow-xl space-y-4 flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">تعديل أسماء ومجاميع الفرق</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    تعديل قائمة أسماء الـ 48 فريق وتوزيعهم على المجموعات الثمانية دفعة واحدة بسهولة.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenBulkEditModal}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-700"
              >
                <Edit3 className="w-4 h-4 text-sky-400" />
                <span>تعديل شامل للفرق (Bulk Edit) ✏️</span>
              </button>
            </div>

            {/* Card 4: Player Approvals */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 transition-all shadow-xl space-y-4 flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">اعتماد وتعديل اللاعبين</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    مراجعة طلبات قيد اللاعبين الجديدة وتعديلات أرقام القمصان والمراكز المقدمة من المدربين.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenApprovalsModal}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <UserCheck className="w-4 h-4" />
                <span>فتح نافذة الاعتماد ({pendingPlayerRequestsCount})</span>
              </button>
            </div>

            {/* Card 5: Seasons & Archive */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all shadow-xl space-y-4 flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Archive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">أرشيف المواسم السابقة</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    سجل البطولات التاريخية ونتائج المواسم المنتهية وأسماء الأبطال والوصيف المحفوظين.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenArchiveModal}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-amber-500/30"
              >
                <Archive className="w-4 h-4 text-amber-400" />
                <span>سجل الأرشيف ({archivedSnapshots.length})</span>
              </button>
            </div>


          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB 2: TEAMS & MANAGERS (الفرق والمدربين) */}
      {/* ========================================================================= */}
      {adminTab === 'teams' && (
        <div className="space-y-4">
          {/* Smart AI Image Extractor Banner */}
          {onOpenAiCopilot && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/60 border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-black text-white">إضافة الفرق واللاعبين من صورة (Gemini AI) 📷</strong>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      جديد وذكي ✨
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    لديك صورة أو كشف ورقي يحتوي على أسماء الفرق أو اللاعبين؟ أرسله للمساعد وسيقوم بإضافتهم للبطولة تلقائياً!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenAiCopilot}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/30 hover:scale-[1.02] shrink-0 self-stretch sm:self-auto justify-center"
              >
                <Bot className="w-4 h-4 text-emerald-200" />
                <span>إرسال صورة كشف للاعبين 🤖</span>
              </button>
            </div>
          )}

          {/* Header Controls & Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={teamsSearch}
                  onChange={(e) => setTeamsSearch(e.target.value)}
                  placeholder="ابحث عن اسم الفريق أو النادي..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                {teamsSearch && (
                  <button
                    onClick={() => setTeamsSearch('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-bold ml-1">حالة المسؤول:</span>
                <button
                  type="button"
                  onClick={() => setManagerFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    managerFilter === 'all'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  الكل ({teams.length})
                </button>
                <button
                  type="button"
                  onClick={() => setManagerFilter('assigned')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    managerFilter === 'assigned'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  معين له مدرب ({teams.length - teamsWithoutManagerCount})
                </button>
                <button
                  type="button"
                  onClick={() => setManagerFilter('vacant')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    managerFilter === 'vacant'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  شاغر بدون مدرب ({teamsWithoutManagerCount})
                </button>

                {onOpenCsvUploadModal && (
                  <button
                    type="button"
                    onClick={onOpenCsvUploadModal}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer mr-auto"
                    title="استيراد وتوليد هيكل الفرق وقوائم اللاعبين من ملف CSV"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                    <span>استيراد CSV (فرق ولاعبين) 📊</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenBulkEditModal}
                  className={`px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-amber-500/30 transition-all cursor-pointer ${!onOpenCsvUploadModal ? 'mr-auto' : ''}`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>تعديل شامل للفرق (Bulk)</span>
                </button>
              </div>
            </div>

            {/* Group Pills (A through H) */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400 font-bold ml-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                المجموعة:
              </span>
              <button
                type="button"
                onClick={() => setSelectedGroup('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedGroup === 'all'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                الكل (48)
              </button>
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((grp) => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setSelectedGroup(grp)}
                  className={`w-7 h-7 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                    selectedGroup === grp
                      ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-300'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  {grp}
                </button>
              ))}
              <span className="text-[11px] text-slate-500 mr-auto font-mono">
                المعروض: {filteredTeams.length} فريق
              </span>
            </div>
          </div>

          {/* Teams Compact Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTeams.map((team) => {
              const manager = teamManagersMap.get(team.name);
              return (
                <div
                  key={team.id}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-md hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 truncate flex-1">
                      <TeamLogo teamName={team.name} size="md" />
                      <div className="truncate">
                        <strong className="text-sm font-bold text-white block truncate">{team.name}</strong>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 text-[10px] font-bold border border-emerald-500/20">
                            المجموعة {team.group}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {team.points} نقطة • {team.played}/5 ماتشات
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditTeam(team)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="تعديل اسم الفريق"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectTeamForMatches(team.name)}
                        className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-600 text-emerald-300 hover:text-white transition-colors cursor-pointer"
                        title="عرض مباريات الفريق الـ 5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {onDeleteTeam && (
                        <button
                          type="button"
                          onClick={() => setDeleteTeamModalTarget(team)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition-colors cursor-pointer"
                          title={`مسح وحذف فريق ${team.name} نهائياً`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Manager Status & 1-click Quick Assign */}
                  <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                    <div className="truncate flex-1">
                      {manager ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold truncate">
                          <UserCheck className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{manager.name} ({manager.email})</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>بدون مسؤول مسجل</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenAssignModal(team)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        manager
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-sm'
                      }`}
                    >
                      {manager ? 'تغيير المدرب 👔' : 'تعيين مدرب ➕'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTeams.length === 0 && (
            <div className="p-10 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <Shield className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-400">لا توجد فرق مطابقة لبحثك</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TAB 3: MATCHES & SCHEDULING (المباريات والجدول) */}
      {/* ========================================================================= */}
      {adminTab === 'matches' && (
        <div className="space-y-4">
          {/* Matches Header Controls */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={matchSearch}
                  onChange={(e) => setMatchSearch(e.target.value)}
                  placeholder="ابحث عن مباراة أو اسم فريق..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {onOpenKnockoutDraw && (
                  <button
                    type="button"
                    onClick={onOpenKnockoutDraw}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                    title="سحب قرعة الأدوار الإقصائية مع تطبيق الشروط المخصصة"
                  >
                    <span>🎲</span>
                    <span>قرعة الأدوار الإقصائية 🏆</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenRoundOrganizer}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>منظم جولات المجموعات 🔄</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenAlertComposer}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال تنبيه بالموعد 🔔</span>
                </button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
              {/* Unscheduled Only Toggle */}
              <button
                type="button"
                onClick={() => setOnlyUnscheduled(!onlyUnscheduled)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  onlyUnscheduled
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>غير المجدولة فقط ({unscheduledMatchesCount})</span>
                {onlyUnscheduled && <Check className="w-3 h-3" />}
              </button>

              <span aria-hidden="true" className="text-slate-700">|</span>

              {/* Stage Filter */}
              <span className="text-slate-400 font-bold">الدور:</span>
              {[
                { id: 'all', label: 'الكل' },
                { id: 'group', label: 'المجموعات' },
                { id: 'r32', label: 'دور الـ 32' },
                { id: 'r16', label: 'دور الـ 16' },
                { id: 'qf', label: 'ربع النهائي' },
                { id: 'sf', label: 'نصف النهائي' },
                { id: 'final', label: 'النهائي' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setMatchStageFilter(st.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    matchStageFilter === st.id
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {st.label}
                </button>
              ))}

              <span className="text-[11px] text-slate-500 mr-auto font-mono">
                المعروض: {filteredMatches.length} مباراة
              </span>
            </div>
          </div>

          {/* Matches List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredMatches.slice(0, 50).map((match) => (
              <div
                key={match.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  match.isScheduled
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-slate-900/60 border-dashed border-amber-500/40 hover:border-amber-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    {match.stageName} {match.group ? `(المجموعة ${match.group})` : ''}
                  </span>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    match.status === 'finished'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : match.status === 'live'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse'
                      : match.isScheduled
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {match.status === 'finished'
                      ? 'منتهية'
                      : match.status === 'live'
                      ? 'مباشر الآن ⚽'
                      : match.isScheduled
                      ? 'مجدولة رسمياً'
                      : 'لم يحدد موعدها بعد'}
                  </span>
                </div>

                {/* Teams Row */}
                <div className="flex items-center justify-between gap-3 py-1">
                  <div className="flex items-center gap-2 truncate flex-1">
                    <TeamLogo teamName={match.teamA} size="sm" />
                    <span className="text-xs md:text-sm font-black text-white truncate">{match.teamA}</span>
                  </div>

                  <div className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 font-mono font-black text-xs md:text-sm text-center shrink-0">
                    {match.scoreA !== null && match.scoreB !== null ? (
                      <span className="text-amber-400">{match.scoreA} - {match.scoreB}</span>
                    ) : (
                      <span className="text-slate-500">ضد</span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 truncate flex-1 text-left">
                    <span className="text-xs md:text-sm font-black text-white truncate">{match.teamB}</span>
                    <TeamLogo teamName={match.teamB} size="sm" />
                  </div>
                </div>

                {/* Footer Scheduling Info & Action */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                    {match.isScheduled ? (
                      <>
                        <span className="flex items-center gap-1 text-slate-300">
                          <Calendar className="w-3 h-3 text-emerald-400" />
                          {match.date}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {match.time}
                        </span>
                        {match.pitch && <span>• {match.pitch}</span>}
                      </>
                    ) : (
                      <span className="text-amber-400 font-sans font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        موعد غير محدد
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onRecordResult && (
                      <button
                        type="button"
                        onClick={() => onRecordResult(match)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold text-xs transition-colors cursor-pointer border border-emerald-500/30 flex items-center gap-1"
                        title="تسجيل أو تعديل نتيجة المباراة واعتمادها في الترتيب"
                      >
                        <span>⚽</span>
                        <span>{match.status === 'finished' ? 'تعديل النتيجة' : 'تسجيل النتيجة'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onScheduleMatch(match)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer border border-slate-700"
                    >
                      {match.isScheduled ? 'الموعد 📅' : 'تحديد الموعد ⚡'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredMatches.length > 50 && (
            <div className="p-4 text-center rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
              يتم عرض أول 50 مباراة لتسهيل التصفح. استخدم البحث أو الفلاتر أعلاه للوصول لمباراة محددة.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. TAB 4: APPLICATIONS & SEASONS (التقديم واستمارات الفرق والمواسم) */}
      {/* ========================================================================= */}
      {adminTab === 'applications' && (
        <div className="space-y-6">
          {/* Applications Header */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>استمارات تسجيل وتقديم الفرق الجديدة ({applications.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  مراجعة واعتماد أو رفض طلبات انضمام الفرق والنوادي للبطولة.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setApplicationFilter(st)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      applicationFilter === st
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {st === 'all' && 'الكل'}
                    {st === 'pending' && `المعلقة (${pendingApplicationsCount})`}
                    {st === 'approved' && 'المقبولة'}
                    {st === 'rejected' && 'المرفوضة'}
                  </button>
                ))}
              </div>
            </div>

            {/* Applications List */}
            {applications.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 space-y-2">
                <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-400">لا توجد استمارات تقديم مسجلة حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-3">
                {applications
                  .filter(a => applicationFilter === 'all' || a.status === applicationFilter)
                  .map((app) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm md:text-base font-black text-white">{app.teamName}</strong>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            app.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : app.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {app.status === 'approved' ? 'مقبول ومقيد' : app.status === 'rejected' ? 'مرفوض' : 'بانتظار المراجعة'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span>👤 الكابتن: {app.captainName}</span>
                          <span>• 📧 {app.email}</span>
                          {app.phone && <span>• 📱 {app.phone}</span>}
                          <span>• 👥 {app.playerCount} لاعب</span>
                          {app.faculty && <span>• 🏛️ {app.faculty}</span>}
                        </div>

                        {app.notes && (
                          <p className="text-xs text-slate-500 bg-slate-900/60 p-2 rounded-xl mt-1 border border-slate-800/80">
                            ملاحظات الفريق: {app.notes}
                          </p>
                        )}
                      </div>

                      {/* Review Buttons */}
                      {app.status === 'pending' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onReviewApplication(app.id, 'approved')}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>قبول واعتماد الفريق 🟢</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onReviewApplication(app.id, 'rejected')}
                            className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-500/30"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>رفض</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Active Season Info Card */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-amber-400">سجل المواسم والبطولات السنوية 🏛️</span>
                <span>•</span>
                <span className="text-xs text-slate-400 font-mono">{archivedSnapshots.length} مواسم مؤرشفة</span>
              </div>
              <h4 className="text-base font-black text-white">إدارة أرشيف المواسم والنسخ السابقة</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                يمكنك الاطلاع على النتائج السابقة للأعوام الماضية أو إنشاء نسخة جديدة مع تصفير النقاط تلقائياً.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenArchiveModal}
                className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 font-bold text-xs flex items-center gap-2 border border-amber-500/30 transition-all cursor-pointer"
              >
                <Archive className="w-4 h-4 text-amber-400" />
                <span>عرض الأرشيف التاريخي 🏛️</span>
              </button>
              <button
                type="button"
                onClick={onOpenNewSeasonModal}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إطلاق موسم جديد ⚡</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. TAB 5: USERS DIRECTORY & ROLES (المستخدمين والصلاحيات) */}
      {/* ========================================================================= */}
      {adminTab === 'users' && (
        <div className="space-y-4">
          <UsersDirectoryPage
            users={users}
            currentUser={currentUser}
            teams={teams}
            onUpdateUserRole={onUpdateUserRole}
            onUpdateUser={onUpdateUser}
            onAddUser={onAddUser}
            onDeleteUser={onDeleteUser}
            onRefreshUsers={onRefreshUsers}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: 1-CLICK QUICK ASSIGN TEAM MANAGER */}
      {/* ========================================================================= */}
      {assigningTeam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <TeamLogo teamName={assigningTeam.name} size="md" />
                <div>
                  <h3 className="text-base font-black text-white">تعيين مسؤول لفريق {assigningTeam.name}</h3>
                  <span className="text-xs text-amber-400 font-bold">المجموعة {assigningTeam.group}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssigningTeam(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">البريد الإلكتروني للمسؤول / المدرب *</label>
                <input
                  type="email"
                  required
                  value={assignEmail}
                  onChange={(e) => setAssignEmail(e.target.value)}
                  placeholder="coach@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">الاسم الكامل (اختياري)</label>
                <input
                  type="text"
                  value={assignName}
                  onChange={(e) => setAssignName(e.target.value)}
                  placeholder="مثال: كابتن أحمد حسن"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">كلمة مرور الحساب</label>
                <input
                  type="text"
                  value={assignPassword}
                  onChange={(e) => setAssignPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  سيتم إنشاء الحساب تلقائياً إن لم يكن مسجلاً، وتعيينه كمسؤول لهذا الفريق مباشرة.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isAssigningSaving}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isAssigningSaving ? 'جارٍ الحفظ...' : 'تأكيد وتعيين المسؤول 👔'}
                </button>
                <button
                  type="button"
                  onClick={() => setAssigningTeam(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL: CONFIRM DELETE TEAM (حذف ومسح الفريق نهائياً) */}
      {deleteTeamModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">تأكيد مسح وحذف الفريق نهائياً</h3>
                <span className="text-xs text-rose-400 font-bold">
                  فريق: {deleteTeamModalTarget.name} (المجموعة {deleteTeamModalTarget.group})
                </span>
              </div>
            </div>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
              هل أنت متأكد من مسح وحذف فريق <strong className="text-white font-bold">({deleteTeamModalTarget.name})</strong> نهائياً من البطولة؟
              <br /><br />
              ⚠️ سيتم مسح الفريق من ترتيب المجموعة وحذف كافة مبارياته وقائمته من قاعدة البيانات.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTeamModalTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteTeam) {
                    onDeleteTeam(deleteTeamModalTarget.name);
                  }
                  setDeleteTeamModalTarget(null);
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

      {/* MODAL: COMPREHENSIVE TEAMS HEALTH & AUDIT CHECKER (فحص ومراجعة الفرق الشامل) */}
      {isTeamsAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full p-5 md:p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center shadow-md">
                  <Shield className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>فاحص ومراجع الفرق الشامل للبطولة</span>
                    <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
                      {teams.length} فريق مسجل
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    مراجعة كافة الفرق عبر المجموعات الـ 8 والتأكد من عدم وجود فرق مش شغالة أو مكررة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTeamsAuditModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 space-y-4">
              {/* Summary Status Banner */}
              <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    اكتمال الفرق: {teams.length === 48 ? 'العدد مكتمل تماماً (48/48 فريق)' : `${teams.length} من 48 فريق`}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    8 مجموعات • 6 فرق في كل مجموعة
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500" 
                    style={{ width: `${Math.min(100, (teams.length / 48) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-300">
                  <strong className="text-white block font-bold">إجراءات سريعة لضبط وتفريغ الفرق:</strong>
                  يمكنك تفريغ الكشوفات لتسجيل اللاعبين الجدد أو حذف أي فرق غير شغالة بضغطة واحدة.
                </div>
                <div className="flex items-center gap-2">

                  {onPurgeNewTeamsAndUnifyBilingual && (
                    <button
                      type="button"
                      onClick={() => {
                        onPurgeNewTeamsAndUnifyBilingual();
                        setIsTeamsAuditModalOpen(false);
                      }}
                      className="px-3 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 border border-purple-500/30 text-purple-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>إعادة ضبط الفرق الرسمية الـ 48 🔄</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 8 Groups Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((grp) => {
                  const grpTeams = teams.filter(t => t.group === grp);
                  return (
                    <div 
                      key={grp}
                      className="bg-slate-950/90 rounded-2xl p-3.5 border border-slate-800/80 space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-black text-amber-400">
                          المجموعة {grp}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          grpTeams.length === 6 
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                        }`}>
                          {grpTeams.length}/6 فرق
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {grpTeams.map((tm) => (
                          <div 
                            key={tm.id}
                            className="flex items-center justify-between gap-1.5 text-xs text-slate-300 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition-colors"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <TeamLogo teamName={tm.name} size="xs" />
                              <span className="truncate font-medium">{tm.name}</span>
                            </div>
                            {onDeleteTeam && (
                              <button
                                type="button"
                                onClick={() => setDeleteTeamModalTarget(tm)}
                                className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors cursor-pointer shrink-0"
                                title={`حذف فريق ${tm.name}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        {grpTeams.length === 0 && (
                          <div className="text-[11px] text-slate-500 py-1 text-center">
                            لا توجد فرق في هذه المجموعة
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsTeamsAuditModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق الفاحص
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
