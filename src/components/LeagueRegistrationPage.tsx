import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Shield,
  Send,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  Users,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  PlusCircle,
  Smartphone,
  Copy,
  Check,
  Building,
  RefreshCw,
  SlidersHorizontal,
  Archive,
  Trash2,
  Plus,
  Shirt,
  UserCheck,
  FileText,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  TeamApplication,
  TournamentSeason,
  ArchivedSeasonSnapshot,
  submitServerApplication,
  updateServerApplicationStatus,
  createServerSeason,
  switchServerSeason,
  archiveSeasonOnServer,
} from '../utils/apiSync';
import { AppUser } from '../utils/auth';
import { Player } from '../utils/roster';
import { TeamLogo } from '../utils/teamLogos';

interface LeagueRegistrationPageProps {
  currentUser: AppUser | null;
  isAdmin: boolean;
  isLeagueRegistrationVisible: boolean;
  onToggleRegistrationVisible: (nextState?: boolean) => void;
  isLeagueRegistrationOpen: boolean;
  onToggleRegistrationOpen: (nextState?: boolean) => void;
  applications: TeamApplication[];
  onRefreshApplications: () => Promise<void>;
  seasons: TournamentSeason[];
  activeSeasonId: string;
  onRefreshSeasons: () => Promise<void>;
  currentSeasonName: string;
  currentAcademicYear: string;
  teams?: { id: string; name: string; group: string; logoColor?: string }[];
  squads?: Record<string, Player[]>;
  users?: AppUser[];
  archivedSnapshots?: ArchivedSeasonSnapshot[];
  onRefreshArchivedSnapshots?: () => Promise<void>;
  onAddTeamToTournament?: (teamData: { name: string; group: string; logoColor?: string }) => void;
  onAssignTeamManager?: (userEmail: string, teamName: string) => void;
  onUpdateSquad?: (teamName: string, updatedSquad: Player[]) => void;
  onStartNewSeasonZeroPoints?: (seasonData: {
    name: string;
    year: string;
    teamsCount: number;
    archivePrevious: boolean;
    champion?: string;
    runnerUp?: string;
  }) => Promise<void>;
}

const FACULTIES_LIST = [
  'كلية تكنولوجيا المعلومات وعلوم الحاسب (ITCS)',
  'كلية الهندسة والعلوم التطبيقية (EAS)',
  'كلية إدارة الأعمال والمالية (SOB)',
  'كلية التكنولوجيا الحيوية (Biotechnology)',
  'قسم الدراسات العليا والماجستير',
  'منتخب أعضاء هيئة التدريس والعاملين',
  'فريق حر / دفعات خريجين',
  'أخرى (تحدد في الملاحظات)',
];

const PRESET_KIT_COLORS = [
  { label: 'أزرق ملكي / كحلي', primary: '#1d4ed8', secondary: '#1e3a8a' },
  { label: 'أحمر ناري / أبيض', primary: '#dc2626', secondary: '#ffffff' },
  { label: 'أخضر زمردي / أبيض', primary: '#059669', secondary: '#ecfdf5' },
  { label: 'أسود فحمي / ذهبي', primary: '#18181b', secondary: '#eab308' },
  { label: 'أصفر مشرق / أزرق', primary: '#eab308', secondary: '#2563eb' },
  { label: 'بنفسجي داكن / سماوي', primary: '#581c87', secondary: '#38bdf8' },
  { label: 'سماوي / كحلي', primary: '#0284c7', secondary: '#0f172a' },
  { label: 'برتقالي / أسود', primary: '#ea580c', secondary: '#09090b' },
];

export const LeagueRegistrationPage: React.FC<LeagueRegistrationPageProps> = ({
  currentUser,
  isAdmin,
  isLeagueRegistrationVisible,
  onToggleRegistrationVisible,
  isLeagueRegistrationOpen,
  onToggleRegistrationOpen,
  applications,
  onRefreshApplications,
  seasons,
  activeSeasonId,
  onRefreshSeasons,
  currentSeasonName,
  currentAcademicYear,
  teams = [],
  squads = {},
  users = [],
  archivedSnapshots = [],
  onRefreshArchivedSnapshots,
  onAddTeamToTournament,
  onAssignTeamManager,
  onUpdateSquad,
  onStartNewSeasonZeroPoints,
}) => {
  // Navigation tabs inside the registration portal
  const [activeTab, setActiveTab] = useState<'form' | 'track' | 'admin'>(
    !isLeagueRegistrationOpen && !isAdmin ? 'track' : 'form'
  );

  // Set of teams that already have a registered manager or an active registration application
  const takenLeagueTeams = useMemo(() => {
    const set = new Set<string>();
    // Taken by an existing manager user
    users.forEach((u) => {
      if (u.role === 'team_manager' && u.managedTeamName) {
        set.add(u.managedTeamName.trim().toLowerCase());
      }
      if (u.requestedTeamName && u.managerApprovalStatus === 'pending') {
        set.add(u.requestedTeamName.trim().toLowerCase());
      }
    });
    // Taken by an active application
    applications.forEach((a) => {
      if (a.status !== 'rejected') {
        set.add(a.teamName.trim().toLowerCase());
      }
    });
    return set;
  }, [users, applications]);

  // Selected team from the 48 teams
  const [selectedTeamName, setSelectedTeamName] = useState<string>('');
  const [teamSearchQuery, setTeamSearchQuery] = useState<string>('');

  // Editable Player Roster State ("بس انا بغير اللاعيبه والاسماء")
  const [editableSquad, setEditableSquad] = useState<
    Array<{ id: string; name: string; number: number; position: 'حارس' | 'دفاع' | 'وسط' | 'هجوم'; studentId: string; isCaptain?: boolean }>
  >([]);

  // Application Form State
  const [formData, setFormData] = useState({
    faculty: FACULTIES_LIST[0],
    captainName: currentUser?.name || '',
    captainStudentId: currentUser?.studentId || '',
    email: currentUser?.email || '',
    phone: '',
    whatsapp: '',
    primaryColor: '#059669',
    secondaryColor: '#ffffff',
    logoUrl: '',
    notes: '',
    fairPlayAgreed: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<TeamApplication | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Tracking State
  const [searchQuery, setSearchQuery] = useState('');
  const [trackedApplication, setTrackedApplication] = useState<TeamApplication | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Admin Controls State
  const [adminFilter, setAdminFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [reviewModalApp, setReviewModalApp] = useState<TeamApplication | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'need_info'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [assignedGroup, setAssignedGroup] = useState('A');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Admin: New Season & Archive Modal State
  const [isNewSeasonModalOpen, setIsNewSeasonModalOpen] = useState(false);
  const [isArchiveViewerModalOpen, setIsArchiveViewerModalOpen] = useState(false);
  const [newSeasonForm, setNewSeasonForm] = useState({
    name: `دوري جامعة النيل ${new Date().getFullYear() + 1} - النسخة السادسة`,
    year: `${new Date().getFullYear()} / ${new Date().getFullYear() + 1}`,
    teamsCount: 48,
    archivePrevious: true,
    champion: '',
    runnerUp: '',
  });
  const [isStartingNewSeason, setIsStartingNewSeason] = useState(false);

  // When a team is selected, pre-load existing players from squads or default roster
  const handleSelectTeam = (teamName: string) => {
    setSelectedTeamName(teamName);
    const existing = squads[teamName];
    if (existing && existing.length > 0) {
      setEditableSquad(
        existing.map((p) => ({
          id: p.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          name: p.name,
          number: p.number || 10,
          position: p.position || 'وسط',
          studentId: p.studentId || '',
          isCaptain: p.isCaptain || false,
        }))
      );
    } else {
      // Default 12 players ready to be customized
      const defaultPositions: Array<'حارس' | 'دفاع' | 'وسط' | 'هجوم'> = [
        'حارس', 'دفاع', 'دفاع', 'دفاع', 'دفاع',
        'وسط', 'وسط', 'وسط', 'وسط',
        'هجوم', 'هجوم', 'حارس'
      ];
      const defaults = defaultPositions.map((pos, idx) => ({
        id: `p_new_${idx + 1}`,
        name: idx === 0 ? `كابتن ${teamName}` : `لاعب ${idx + 1} (${teamName})`,
        number: idx === 0 ? 1 : idx + 1,
        position: pos,
        studentId: '',
        isCaptain: idx === 0,
      }));
      setEditableSquad(defaults);
    }
  };

  // Player editing handlers
  const handlePlayerChange = (index: number, field: string, value: any) => {
    setEditableSquad((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddPlayerToSquad = () => {
    setEditableSquad((prev) => [
      ...prev,
      {
        id: `p_${Date.now()}_${prev.length + 1}`,
        name: `لاعب جديد ${prev.length + 1}`,
        number: prev.length + 1,
        position: 'وسط',
        studentId: '',
        isCaptain: false,
      },
    ]);
  };

  const handleRemovePlayerFromSquad = (index: number) => {
    setEditableSquad((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Application
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isLeagueRegistrationOpen && !isAdmin) {
      setFormError('عذراً، باب التقديم في الدوري مغلق حالياً بقرار من إدارة المسابقات.');
      return;
    }

    if (!selectedTeamName) {
      setFormError('يرجى اختيار الفريق التابع له من قائمة الفرق المتاحة');
      return;
    }

    if (takenLeagueTeams.has(selectedTeamName.trim().toLowerCase())) {
      setFormError(`عذراً، فريق [${selectedTeamName}] محجوز بالفعل لمسؤول آخر! لا يمكن اختيار نفس الفريق لمسؤولَين.`);
      return;
    }

    if (!formData.captainName.trim()) {
      setFormError('يرجى إدخال اسم كابتن أو مسؤول الفريق');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFormError('يرجى إدخال بريد إلكتروني صالح للتواصل');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('يرجى إدخال رقم هاتف مسؤول الفريق للتنسيق');
      return;
    }
    if (!formData.fairPlayAgreed) {
      setFormError('يجب الموافقة على الالتزام بلوائح البطولة وميثاق الروح الرياضية');
      return;
    }

    setIsSubmitting(true);
    try {
      // Build roster summary
      const rosterSummary = editableSquad.map((p) => `${p.number}. ${p.name} (${p.position})`).join(' · ');

      const finalNotes = [
        formData.notes.trim(),
        `[قائمة اللاعبين المحدثة (${editableSquad.length} لاعباً)]: ${rosterSummary}`,
        formData.whatsapp.trim() ? `[واتساب]: ${formData.whatsapp.trim()}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const res = await submitServerApplication({
        teamName: selectedTeamName.trim(),
        faculty: formData.faculty,
        captainName: formData.captainName.trim(),
        captainStudentId: formData.captainStudentId.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        playerCount: editableSquad.length,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        logoUrl: formData.logoUrl.trim() || undefined,
        notes: finalNotes,
      });

      if (res.success && res.application) {
        setSubmittedApp(res.application);
        confetti({ particleCount: 70, spread: 60 });
        await onRefreshApplications();

        // Save updated squad players locally if onUpdateSquad is provided
        if (onUpdateSquad && editableSquad.length > 0) {
          const formattedPlayers: Player[] = editableSquad.map((p) => ({
            id: p.id,
            name: p.name.trim(),
            number: Number(p.number) || 10,
            position: p.position,
            studentId: p.studentId.trim() || undefined,
            isCaptain: p.isCaptain || false,
            isIdentityLocked: true,
          }));
          onUpdateSquad(selectedTeamName, formattedPlayers);
        }
      } else {
        setFormError(res.error || 'حدث خطأ أثناء تسجيل الاستمارة');
      }
    } catch {
      setFormError('تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Search for Track
  const handleSearchTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setHasSearched(true);
    const q = searchQuery.trim().toLowerCase();
    const found = applications.find(
      (a) =>
        a.id.toLowerCase() === q ||
        a.teamName.toLowerCase().includes(q) ||
        a.captainName.toLowerCase().includes(q) ||
        a.phone.includes(q) ||
        a.email.toLowerCase().includes(q)
    );
    setTrackedApplication(found || null);
  };

  // Admin: Update Application Status
  const handleSaveReview = async () => {
    if (!reviewModalApp) return;
    setIsUpdatingStatus(true);
    try {
      const res = await updateServerApplicationStatus(
        reviewModalApp.id,
        reviewStatus,
        reviewNotes.trim() || undefined
      );

      if (res.success) {
        if (reviewStatus === 'approved' && onAddTeamToTournament) {
          onAddTeamToTournament({
            name: reviewModalApp.teamName,
            group: assignedGroup,
            logoColor: `from-[${reviewModalApp.primaryColor}] to-[${reviewModalApp.secondaryColor || '#ffffff'}]`,
          });
        }

        if (reviewStatus === 'approved' && onAssignTeamManager && reviewModalApp.email) {
          onAssignTeamManager(reviewModalApp.email, reviewModalApp.teamName);
        }

        await onRefreshApplications();
        setReviewModalApp(null);
        confetti({ particleCount: 40, spread: 50 });
      } else {
        alert(res.error || 'فشل تحديث حالة الاستمارة');
      }
    } catch {
      alert('حدث خطأ أثناء حفظ القرار');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Admin: Start New Season with Zero Points & Archive Current
  const handleStartNewSeasonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonForm.name.trim() || !newSeasonForm.year.trim()) return;

    setIsStartingNewSeason(true);
    try {
      if (onStartNewSeasonZeroPoints) {
        await onStartNewSeasonZeroPoints({
          name: newSeasonForm.name.trim(),
          year: newSeasonForm.year.trim(),
          teamsCount: Number(newSeasonForm.teamsCount) || 48,
          archivePrevious: newSeasonForm.archivePrevious,
          champion: newSeasonForm.champion.trim() || undefined,
          runnerUp: newSeasonForm.runnerUp.trim() || undefined,
        });
      } else {
        // Fallback server call
        await createServerSeason({
          name: newSeasonForm.name.trim(),
          year: newSeasonForm.year.trim(),
          teamsCount: Number(newSeasonForm.teamsCount) || 48,
          archivePrevious: newSeasonForm.archivePrevious,
        });
      }

      await onRefreshSeasons();
      if (onRefreshArchivedSnapshots) await onRefreshArchivedSnapshots();

      setIsNewSeasonModalOpen(false);
      confetti({ particleCount: 100, spread: 80 });
      alert(`تم إطلاق ${newSeasonForm.name} بنجاح بصفر نقاط لجميع الفرق! 🏆⚡`);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء إطلاق الموسم الجديد');
    } finally {
      setIsStartingNewSeason(false);
    }
  };

  const handleSwitchSeason = async (seasonId: string) => {
    try {
      const res = await switchServerSeason(seasonId);
      if (res.success) {
        await onRefreshSeasons();
        confetti({ particleCount: 30, spread: 40 });
      }
    } catch (e) {
      console.warn('Failed to switch season:', e);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filtered teams list based on search query
  const filteredTeams = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
      `المجموعة ${t.group}`.includes(teamSearchQuery)
  );

  // Available vs taken counts
  const availableTeamsCount = teams.filter((t) => !takenLeagueTeams.has(t.name.trim().toLowerCase())).length;

  const filteredApps = applications.filter((a) => {
    if (adminFilter === 'all') return true;
    return a.status === adminFilter;
  });

  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* HERO SECTION: CHAMPIONSHIP REGISTRATION PORTAL */}
      {/* ------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 md:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            {/* Unboxed clean metadata (Zero-pill discipline) */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-medium">
              <span className="text-emerald-400 font-bold">{currentSeasonName}</span>
              <span aria-hidden="true">·</span>
              <span>الموسم {currentAcademicYear}</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400 font-bold">48 فريقاً موزعين على 8 مجموعات</span>
              <span aria-hidden="true">·</span>
              <span>جامعة النيل الأهلية</span>
            </div>

            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <span className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shrink-0">
                <Trophy className="w-5 h-5 md:w-6 md:h-6" />
              </span>
              <span>بوابة اختيار الفريق وتسجيل القوائم في الدوري</span>
            </h1>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              اختر فريقك المتاح من بين الـ 48 فريقاً في البطولة. لا يمكن لأكثر من مسؤول اختيار نفس الفريق لمنع التضارب.
              بمجرد اختيار الفريق، يمكنك تغيير وتعديل أسماء وبيانات وقوائم اللاعبين بحرية كاملة!
            </p>

            {/* Status & Visibility Banners */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  isLeagueRegistrationOpen
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                }`}
              >
                {isLeagueRegistrationOpen ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>باب التسجيل واختيار الفرق مفتوح حالياً ({availableTeamsCount} فريقاً متاحاً)</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    <span>باب التسجيل مغلق حالياً بقرار الإدارة</span>
                  </>
                )}
              </div>

              {!isLeagueRegistrationVisible && (
                <div className="px-3 py-1.5 rounded-xl border bg-amber-500/15 border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>مخفي عن الجمهور العام (معاينة خاصة للمشرفين فقط)</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics / Stats Widget */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 shrink-0">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-center">
              <span className="text-[11px] text-emerald-400 block mb-1">الفرق المتاحة</span>
              <strong className="text-xl font-black text-emerald-400">{availableTeamsCount}</strong>
              <span className="text-[10px] text-slate-500 block">من أصل 48 فريق</span>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-center">
              <span className="text-[11px] text-amber-400 block mb-1">الفرق المحجوزة</span>
              <strong className="text-xl font-black text-amber-400">{takenLeagueTeams.size}</strong>
              <span className="text-[10px] text-slate-500 block">لها مسؤول رسمي</span>
            </div>
            <div className="col-span-2 sm:col-span-1 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">طلبات التقديم</span>
              <strong className="text-xl font-black text-white">{applications.length}</strong>
              <span className="text-[10px] text-slate-500 block">استمارة مسجلة</span>
            </div>
          </div>
        </div>

        {/* Top Navigation Tabs */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'form'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>اختيار الفريق وتعديل اللاعبين ⚽</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('track')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'track'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>متابعة حالة استمارة سابقة 📋</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                    : 'bg-slate-950 hover:bg-slate-800 text-amber-400 border border-amber-500/30'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>إدارة التقديم والمواسم (Admin) ⚡</span>
                {pendingCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-black">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Admin Quick Visibility & Season Action Buttons */}
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleRegistrationVisible()}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isLeagueRegistrationVisible
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                }`}
                title="تحديد إذا كانت هذه الصفحة تظهر في القائمة العامة لجميع الزوار أو تختفي"
              >
                {isLeagueRegistrationVisible ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ظاهرة للجمهور في القائمة</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    <span>مخفية عن الجمهور</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onToggleRegistrationOpen()}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isLeagueRegistrationOpen
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                }`}
                title="فتح أو غلق استقبال الطلبات الجديدة"
              >
                {isLeagueRegistrationOpen ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    <span>إغلاق باب التقديم</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>فتح باب التقديم</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsNewSeasonModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-amber-500/20"
                title="إنشاء موسم جديد وتصفير النقاط مع خيار الأرشفة"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>موسم جديد بصفر نقاط ⚡</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: TEAM SELECTION & EDITABLE PLAYER ROSTER FORM */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form (2 cols) */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <span>استمارة اختيار الفريق وتعديل تشكيلة اللاعبين</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  اختر فريقك المتاح من بين الـ 48 فرقة (لا يمكن اختيار نفس الفريق لمسؤولَين). ثم قم بتعديل أسماء اللاعبين ومراكزهم بحرية!
                </p>
              </div>
            </div>

            {/* Submission Successful Card */}
            {submittedApp ? (
              <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      تم تسجيل واعتماد بيانات فريق ({submittedApp.teamName}) وقائمته بنجاح! 🏆
                    </h3>
                    <p className="text-xs text-emerald-300/80">
                      طلبكم مسجل رسميًا، وتم تحديث قائمة اللاعبين والأسماء في سجلات البطولة. احتفظ برقم المتابعة التالي:
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block">كود متابعة الاستمارة (Application ID)</span>
                    <strong className="text-lg font-mono font-black text-amber-400">
                      {submittedApp.id}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(submittedApp.id, submittedApp.id)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedId === submittedApp.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>نسخ الكود</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTrackedApplication(submittedApp);
                      setActiveTab('track');
                      setSubmittedApp(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-colors cursor-pointer"
                  >
                    الانتقال لصفحة متابعة الطلب ➔
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedApp(null);
                      setSelectedTeamName('');
                      setEditableSquad([]);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    تسجيل استمارة أخرى
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitForm} className="space-y-6">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* 1. Team Picker from 48 Teams */}
                <div className="space-y-3 p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div>
                      <label className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span>اختر الفريق التابع له (من بين فرق البطولة الـ 48) *</span>
                      </label>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        🔒 لا يمكن اختيار نفس الفريق لمسؤولَين (الفرق المحجوزة مقفلة تلقائياً).
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="بحث في أسماء الفرق..."
                        value={teamSearchQuery}
                        onChange={(e) => setTeamSearchQuery(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 max-w-[160px]"
                      />
                    </div>
                  </div>

                  {/* 48 Teams Grid with status */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-800/80 rounded-xl bg-slate-900/40">
                    {filteredTeams.map((t) => {
                      const isTaken = takenLeagueTeams.has(t.name.trim().toLowerCase());
                      const isSelected = selectedTeamName === t.name;

                      if (isTaken) {
                        return (
                          <div
                            key={t.id || t.name}
                            className="p-2.5 rounded-xl text-xs font-bold text-right flex items-center justify-between bg-slate-950/70 border border-slate-800 text-slate-500 opacity-60 cursor-not-allowed select-none"
                            title="هذا الفريق محجوز بالفعل لمسؤول آخر ولا يمكن اختياره مرتين"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <TeamLogo teamName={t.name} size="xs" />
                              <span className="truncate line-through">{t.name}</span>
                            </div>
                            <span className="text-[9px] text-rose-400 font-mono bg-rose-500/10 px-1 py-0.5 rounded shrink-0">
                              محجوز 🔒
                            </span>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={t.id || t.name}
                          type="button"
                          onClick={() => handleSelectTeam(t.name)}
                          className={`p-2.5 rounded-xl text-xs font-bold text-right flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 font-black'
                              : 'bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <TeamLogo teamName={t.name} size="xs" />
                            <span className="truncate">{t.name}</span>
                          </div>
                          <span className={`text-[9px] shrink-0 ${isSelected ? 'text-emerald-100 font-black' : 'text-emerald-400'}`}>
                            متاح 🟢
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="text-slate-400 flex items-center gap-2">
                      <span>الفريق المختار:</span>
                      {selectedTeamName ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-black text-sm">
                          <TeamLogo teamName={selectedTeamName} size="xs" />
                          <span>{selectedTeamName}</span>
                        </span>
                      ) : (
                        <strong className="text-slate-500 font-normal text-xs">يرجى اختيار فريق من القائمة أعلاه</strong>
                      )}
                    </div>
                    <span className="text-amber-400/90 font-mono text-[11px]">
                      {availableTeamsCount} فريقاً متاحاً للتسجيل
                    </span>
                  </div>
                </div>

                {/* 2. Editable Player Roster ("بس انا بغير اللاعيبه والاسماء") */}
                {selectedTeamName && (
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-950 border border-amber-500/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div>
                        <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                          <Shirt className="w-4 h-4 text-emerald-400" />
                          <span>تعديل وتغيير أسماء وبيانات لاعبي فريق ({selectedTeamName})</span>
                        </h3>
                        <span className="text-[11px] text-emerald-300 block mt-0.5">
                          ⚡ يمكنك تغيير أسماء اللاعبين، وأرقام القمصان، ومراكزهم بالكامل قبل إرسال الاستمارة!
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddPlayerToSquad}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors border border-emerald-500/40 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة لاعب +</span>
                      </button>
                    </div>

                    {/* Editable Players Table */}
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {editableSquad.map((player, idx) => (
                        <div
                          key={player.id || idx}
                          className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-xs"
                        >
                          {/* Number */}
                          <div className="col-span-2 sm:col-span-1">
                            <input
                              type="number"
                              min="1"
                              max="99"
                              value={player.number}
                              onChange={(e) => handlePlayerChange(idx, 'number', Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-1.5 text-center text-amber-400 font-mono font-black"
                              title="رقم القميص"
                            />
                          </div>

                          {/* Name */}
                          <div className="col-span-6 sm:col-span-5">
                            <input
                              type="text"
                              value={player.name}
                              onChange={(e) => handlePlayerChange(idx, 'name', e.target.value)}
                              placeholder="اسم اللاعب الكامل..."
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2.5 text-white font-bold placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          {/* Position */}
                          <div className="col-span-3 sm:col-span-3">
                            <select
                              value={player.position}
                              onChange={(e) => handlePlayerChange(idx, 'position', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-1.5 text-slate-300 font-bold focus:outline-none focus:border-emerald-500"
                            >
                              <option value="حارس">🧤 حارس</option>
                              <option value="دفاع">🛡️ دفاع</option>
                              <option value="وسط">⚡ وسط</option>
                              <option value="هجوم">⚽ هجوم</option>
                            </select>
                          </div>

                          {/* Action (Delete) */}
                          <div className="col-span-1 sm:col-span-3 flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleRemovePlayerFromSquad(idx)}
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                              title="حذف هذا اللاعب"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                      <span>إجمالي اللاعبين بالقائمة: <strong className="text-white">{editableSquad.length}</strong> لاعباً</span>
                      <span className="text-emerald-400 font-medium">سيتم تسجيل هذه الأسماء فوراً لفريقك ⚽</span>
                    </div>
                  </div>
                )}

                {/* 3. Section: Manager Details */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>بيانات كابتن ومسؤول الفريق (Team Manager) والكلية</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        الكلية أو القسم التابع له الفريق <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={formData.faculty}
                        onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                      >
                        {FACULTIES_LIST.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        اسم الكابتن / مسؤول التواصل <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.captainName}
                        onChange={(e) => setFormData({ ...formData, captainName: e.target.value })}
                        placeholder="الاسم الرباعي الرسمي للكابتن"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        البريد الإلكتروني الجامعي للتواصل <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="username@nu.edu.eg أو بريد نشط"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        رقم الهاتف للتواصل وتنسيق المباريات <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="01xxxxxxxxx للتواصل الفوري"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-bold"
                      />
                    </div>
                  </div>

                  {/* Kit Colors Picker */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      ألوان قميص الفريق المفضلة
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {PRESET_KIT_COLORS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              primaryColor: preset.primary,
                              secondaryColor: preset.secondary,
                            })
                          }
                          className={`p-2 rounded-xl border text-right transition-all flex items-center gap-2 cursor-pointer ${
                            formData.primaryColor === preset.primary
                              ? 'bg-slate-800 border-emerald-400 shadow-sm'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-full border border-white/20 shrink-0"
                            style={{
                              background: `linear-gradient(135deg, ${preset.primary} 50%, ${preset.secondary} 50%)`,
                            }}
                          />
                          <span className="text-[11px] text-slate-300 truncate">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes & Fair Play */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      ملاحظات أو مواعيد تفريغ المحاضرات (اختياري)
                    </label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="أي طلبات بخصوص أوقات الملاعب أو المحاضرات"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>

                  <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.fairPlayAgreed}
                      onChange={(e) => setFormData({ ...formData, fairPlayAgreed: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700 mt-0.5 cursor-pointer"
                    />
                    <div className="text-xs text-slate-300 leading-relaxed font-sans">
                      <strong className="text-white font-bold block mb-0.5">
                        التعهد بميثاق الشرف الرياضي ولوائح البطولة
                      </strong>
                      أتعهد بصفتي ممثلاً للفريق بالالتزام بقرارات الحكام واللجنة المنظمة، وإحضار كارنيهات
                      اللاعبين قبل كل مباراة، والالتزام بالروح الرياضية داخل وخارج المستطيل الأخضر.
                    </div>
                  </label>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedTeamName}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري حفظ الاستمارة وتحديث أسماء وقوائم الفريق...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          {selectedTeamName
                            ? `تأكيد تسجيل فريق (${selectedTeamName}) واعتماد قائمته 🏆`
                            : 'يرجى اختيار فريق من القائمة أولاً'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Sidebar Guidelines & Perks (1 col) */}
          <div className="space-y-6">
            {/* Tournament Rules & Specs Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>ضوابط اختيار الفرق وتسجيل اللاعبين</span>
              </h3>

              <ul className="space-y-2.5 text-xs text-slate-300 font-sans leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-white">منع التكرار:</strong> لا يمكن لأكثر من شخص اختيار نفس الفريق، بمجرد تسجيل الفريق يصبح محجوزاً فوراً لمسؤوله.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-white">تعديل اللاعبين والأسماء:</strong> يمكنك فور اختيار الفريق تعديل وتغيير أسماء جميع اللاعبين ومراكزهم وأرقامهم بحرية كاملة.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-amber-400">سعة البطولة 48 فريقاً:</strong> مقسمين على 8 مجموعات (A حتى H)، بمعدل 6 فرق بكل مجموعة، ويصعد أول 4 فرق لدور الـ 32.
                  </span>
                </li>
              </ul>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-bold text-slate-200 block">📞 للتواصل مع لجنة المسابقات:</span>
                <span>المبنى الرياضي - مكتب الأنشطة الطلابية، جامعة النيل</span>
              </div>
            </div>

            {/* Quick Track Application Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-400" />
                <span>قدمت طلباً سابقاً وتريد الاستعلام؟</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                يمكنك إدخال كود المتابعة أو رقم الهاتف لمعرفة قرار اللجنة والمجموعة المحددة لفريقك.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('track')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>الانتقال لشاشة الاستعلام ➔</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: TRACK APPLICATION STATUS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'track' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
            <div>
              <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-emerald-400" />
                <span>الاستعلام ومتابعة حالة استمارة الفريق</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                ابحث باستخدام كود المتابعة (مثال: app_101) أو اسم الفريق أو رقم هاتف الكابتن.
              </p>
            </div>

            {/* Search Input Bar */}
            <form onSubmit={handleSearchTrack} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="أدخل كود المتابعة أو اسم الفريق أو رقم الهاتف..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pr-10 pl-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>
              <button
                type="submit"
                className="py-3 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors shrink-0 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Search className="w-4 h-4" />
                <span>بحث واستعلام</span>
              </button>
            </form>

            {/* Search Results Display */}
            {hasSearched && (
              <div className="pt-2">
                {trackedApplication ? (
                  <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-5">
                    {/* Header: Team & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-4 h-4 rounded-full border border-white/20"
                            style={{
                              background: `linear-gradient(135deg, ${trackedApplication.primaryColor} 50%, ${trackedApplication.secondaryColor || '#fff'} 50%)`,
                            }}
                          />
                          <h3 className="text-base font-black text-white">
                            {trackedApplication.teamName}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>{trackedApplication.faculty}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">كود: {trackedApplication.id}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {trackedApplication.status === 'approved' && (
                          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center gap-1.5 shadow-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>تم القبول والاعتماد في الدوري 🏆</span>
                          </div>
                        )}
                        {trackedApplication.status === 'pending' && (
                          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center gap-1.5 shadow-sm">
                            <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                            <span>قيد المراجعة والتدقيق ⏳</span>
                          </div>
                        )}
                        {trackedApplication.status === 'rejected' && (
                          <div className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black flex items-center gap-1.5 shadow-sm">
                            <XCircle className="w-4 h-4 text-rose-400" />
                            <span>تم الاعتذار عن قبول الطلب ❌</span>
                          </div>
                        )}
                        {trackedApplication.status === 'need_info' && (
                          <div className="px-3.5 py-1.5 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-black flex items-center gap-1.5 shadow-sm">
                            <AlertCircle className="w-4 h-4 text-sky-400" />
                            <span>مطلوب استكمال بيانات ⚠️</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800/80 space-y-1">
                        <span className="text-[11px] text-slate-400 block">كابتن / مسؤول الفريق:</span>
                        <strong className="text-white font-bold block">{trackedApplication.captainName}</strong>
                        {trackedApplication.captainStudentId && (
                          <span className="text-slate-400 block font-mono text-[11px]">
                            رقم القيد: {trackedApplication.captainStudentId}
                          </span>
                        )}
                      </div>

                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800/80 space-y-1">
                        <span className="text-[11px] text-slate-400 block">بيانات الاتصال المسجلة:</span>
                        <strong className="text-white font-bold block font-mono">{trackedApplication.phone}</strong>
                        <span className="text-slate-400 block text-[11px]">{trackedApplication.email}</span>
                      </div>
                    </div>

                    {/* Review Notes from Admin if present */}
                    {trackedApplication.reviewNotes && (
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                        <span className="text-[11px] font-bold text-amber-400 block">
                          📝 قرار وملاحظات اللجنة المنظمة:
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {trackedApplication.reviewNotes}
                        </p>
                      </div>
                    )}

                    {/* Direct Contact Button via WhatsApp */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
                      <span className="text-[11px] text-slate-400">
                        تاريخ التقديم: {new Date(trackedApplication.submittedAt).toLocaleDateString('ar-EG')}
                      </span>

                      <a
                        href={`https://wa.me/201023456789?text=${encodeURIComponent(
                          `مرحباً، أستعلم بخصوص طلب انضمام فريق: ${trackedApplication.teamName} (كود: ${trackedApplication.id})`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>مراسلة لجنة المسابقات عبر واتساب 💬</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800/80 space-y-2">
                    <Search className="w-8 h-8 text-slate-600 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-300">لم يتم العثور على استمارة مطابقة</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      تأكد من إدخال كود المتابعة أو رقم الهاتف المسجل في الاستمارة بشكل صحيح.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: ADMIN CONTROL & MULTI-YEAR SEASON MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'admin' && isAdmin && (
        <div className="space-y-6">
          {/* Top Quick Settings Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Toggle 1: Public Navbar Visibility */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">ظهور صفحة التقديم للعامة</span>
                {isLeagueRegistrationVisible ? (
                  <Eye className="w-4 h-4 text-emerald-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-black text-white">
                  {isLeagueRegistrationVisible ? 'ظاهرة للجميع في القائمة 🟢' : 'مخفية عن الزوار والجمهور 🔒'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {isLeagueRegistrationVisible
                    ? 'يستطيع أي طالب أو زائر رؤية تبويب التقديم والدخول إليه بحرية.'
                    : 'الصفحة محجوبة عن شريط التنقل للزوار، وتظهر فقط في حسابات المشرفين.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggleRegistrationVisible()}
                className={`w-full py-2.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                  isLeagueRegistrationVisible
                    ? 'bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/20'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                }`}
              >
                {isLeagueRegistrationVisible ? 'إخفاء الصفحة عن الجمهور 👁️' : 'إظهار الصفحة للجمهور في القائمة 🟢'}
              </button>
            </div>

            {/* Toggle 2: Open/Close Submissions */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">استقبال استمارات الفرق</span>
                {isLeagueRegistrationOpen ? (
                  <Unlock className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Lock className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-black text-white">
                  {isLeagueRegistrationOpen ? 'باب التقديم مفتوح حالياً ⚡' : 'باب التقديم مقفل مؤقتاً 🔒'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {isLeagueRegistrationOpen
                    ? 'يتم قبول تسجيل استمارات الفرق واختيار الفرق المتاحة.'
                    : 'لا يمكن اختيار فرق جديدة، وتظهر رسالة رسمية للفرق بالمواعيد القادمة.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggleRegistrationOpen()}
                className={`w-full py-2.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                  isLeagueRegistrationOpen
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                }`}
              >
                {isLeagueRegistrationOpen ? 'إغلاق باب التقديم الآن 🔒' : 'فتح باب التقديم فوراً 🟢'}
              </button>
            </div>

            {/* New Season & Zero Points Action */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400">المواسم السنوية وتصفير النقاط</span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">
                  إنشاء موسم جديد كلياً بصفر نقاط ⚡
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  أرشفة الموسم الحالي كاملاً في قاعدة البيانات وبدء موسم جديد بصفر نقاط لجميع الفرق الـ 48.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewSeasonModalOpen(true)}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>بدء موسم جديد 🏆</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsArchiveViewerModalOpen(true)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
                  title="استعراض الأرشيف وسجل البطولات السابقة"
                >
                  <Archive className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active & Past Seasons Manager */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>المواسم وبطولات الدوري السنوية المسجلة</span>
                </h3>
                <span className="text-xs text-slate-400">
                  يمكنك التبديل بين الموسم النشط واستعراض أرشيف البطولات السابقة
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsArchiveViewerModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5 text-amber-400" />
                <span>سجل وأرشيف المواسم ({archivedSnapshots.length})</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {seasons.map((s) => {
                const isActive = s.id === activeSeasonId;
                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-emerald-950/30 border-emerald-500/50 ring-1 ring-emerald-500/30'
                        : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <strong className="text-sm font-black text-white block">{s.name}</strong>
                        <span className="text-xs text-slate-400">{s.year}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {isActive ? 'الموسم النشط 🏆' : 'مؤرشف 📦'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                      <span>السعة: <strong className="text-white">{s.teamsCount || 48} فريقاً</strong></span>
                      {s.champion && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-400 font-bold">البطل: {s.champion}</span>
                        </>
                      )}
                    </div>

                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => handleSwitchSeason(s.id)}
                        className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                      >
                        تفعيل هذا الموسم
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Applications Review Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>طلبات الفرق المتقدمة للمشاركة ({filteredApps.length})</span>
                </h3>
                <span className="text-xs text-slate-400">
                  راجع الاستمارات، واعتمد الفرق ليتم إدراجها فوراً في مجموعات الدوري وتعيين مسؤوليها.
                </span>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAdminFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    adminFilter === 'all'
                      ? 'bg-slate-800 text-white font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الكل ({applications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    adminFilter === 'pending'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  قيد المراجعة ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    adminFilter === 'approved'
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  المقبولة ({approvedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminFilter('rejected')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    adminFilter === 'rejected'
                      ? 'bg-rose-500 text-white font-black'
                      : 'text-rose-400 hover:text-rose-300'
                  }`}
                >
                  المرفوضة
                </button>
              </div>
            </div>

            {/* Applications List */}
            {filteredApps.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                لا توجد طلبات تطابق الفلتر الحالي.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredApps.map((app) => (
                  <div
                    key={app.id}
                    className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                            style={{
                              background: `linear-gradient(135deg, ${app.primaryColor} 50%, ${app.secondaryColor || '#fff'} 50%)`,
                            }}
                          />
                          <h4 className="text-sm font-black text-white">{app.teamName}</h4>
                        </div>
                        <span className="text-xs text-slate-400 block">{app.faculty}</span>
                      </div>

                      {/* Status indicator */}
                      <div>
                        {app.status === 'approved' && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            معتمد 🏆
                          </span>
                        )}
                        {app.status === 'pending' && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            قيد المراجعة ⏳
                          </span>
                        )}
                        {app.status === 'rejected' && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            مرفوض ❌
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900 p-3 rounded-xl border border-slate-800/80">
                      <div>
                        <span className="text-[10px] text-slate-400 block">الكابتن:</span>
                        <strong className="text-white block truncate">{app.captainName}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">الهاتف:</span>
                        <span className="text-emerald-400 font-mono block truncate">{app.phone}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">البريد:</span>
                        <span className="text-slate-300 block truncate">{app.email}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">عدد اللاعبين:</span>
                        <span className="text-amber-400 font-bold block">{app.playerCount || 14} لاعباً</span>
                      </div>
                    </div>

                    {app.notes && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                        {app.notes}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          setReviewModalApp(app);
                          setReviewStatus('approved');
                          setReviewNotes(app.reviewNotes || '');
                        }}
                        className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>مراجعة واعتماد الفريق ⚡</span>
                      </button>

                      <a
                        href={`https://wa.me/20${app.phone.replace(/^0+/, '')}?text=${encodeURIComponent(
                          `مرحباً كابتن ${app.captainName}، بخصوص طلب انضمام فريقكم (${app.teamName}) في بطولة دوري جامعة النيل:`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors border border-slate-700 cursor-pointer"
                        title="محادثة واتساب سريعة"
                      >
                        <Smartphone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADMIN APPLICATION REVIEW & GROUP ASSIGNMENT */}
      {/* ------------------------------------------------------------- */}
      {reviewModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>قرار اعتماد طلب الفريق: {reviewModalApp.teamName}</span>
                </h3>
                <span className="text-xs text-slate-400">كابتن: {reviewModalApp.captainName} · {reviewModalApp.faculty}</span>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalApp(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  حالة الطلب الرسمية
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatus('approved')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      reviewStatus === 'approved'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    قبول واعتماد 🏆
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewStatus('need_info')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      reviewStatus === 'need_info'
                        ? 'bg-sky-500 text-slate-950 border-sky-400 font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    استكمال بيانات ⚠️
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewStatus('rejected')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      reviewStatus === 'rejected'
                        ? 'bg-rose-600 text-white border-rose-500 font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    اعتذار ورفض ❌
                  </button>
                </div>
              </div>

              {/* Group Assignment when Approved */}
              {reviewStatus === 'approved' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    تخصيص مجموعة الدوري (A حتى H)
                  </label>
                  <select
                    value={assignedGroup}
                    onChange={(e) => setAssignedGroup(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((g) => (
                      <option key={g} value={g}>
                        المجموعة {g} (ضمن الـ 48 فريقاً)
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-emerald-400 mt-1 block">
                    ⚡ عند الاعتماد، سيتم إدراج الفريق مباشرة في جدول المجموعات وتعيين الكابتن كمسؤول للفريق.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  ملاحظات أو توجيهات للكابتن (تظهر في صفحة الاستعلام)
                </label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="مثال: تم قبول الفريق واعتماده في المجموعة C، يرجى تجهيز كارنيهات اللاعبين..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReviewModalApp(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleSaveReview}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              >
                {isUpdatingStatus ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>حفظ القرار واعتماد الفريق</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE BRAND NEW SEASON WITH ZERO POINTS & ARCHIVE */}
      {/* ------------------------------------------------------------- */}
      {isNewSeasonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    إنشاء موسم جديد كلياً وبدء التنافس بصفر نقاط
                  </h3>
                  <span className="text-xs text-slate-400">
                    أرشفة نتائج وترتيب الموسم الحالي في قاعدة البيانات والبدء من جديد
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSeasonModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStartNewSeasonSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  اسم الموسم الجديد <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newSeasonForm.name}
                  onChange={(e) => setNewSeasonForm({ ...newSeasonForm, name: e.target.value })}
                  placeholder="مثال: دوري جامعة النيل 2027 - النسخة السادسة"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    العام الأكاديمي <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newSeasonForm.year}
                    onChange={(e) => setNewSeasonForm({ ...newSeasonForm, year: e.target.value })}
                    placeholder="مثال: 2026 / 2027"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    سعة البطولة المعتمدة
                  </label>
                  <select
                    value={newSeasonForm.teamsCount}
                    onChange={(e) =>
                      setNewSeasonForm({ ...newSeasonForm, teamsCount: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value={48}>48 فريقاً (8 مجموعات × 6)</option>
                    <option value={32}>32 فريقاً (8 مجموعات × 4)</option>
                    <option value={24}>24 فريقاً (6 مجموعات × 4)</option>
                    <option value={16}>16 فريقاً (4 مجموعات × 4)</option>
                  </select>
                </div>
              </div>

              {/* Archive Snapshot Settings */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSeasonForm.archivePrevious}
                    onChange={(e) =>
                      setNewSeasonForm({ ...newSeasonForm, archivePrevious: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                  <span className="text-xs font-black text-amber-300">
                    أرشفة نتائج وترتيب وفرق الموسم الحالي كاملاً في قاعدة البيانات التاريخية 📦
                  </span>
                </label>

                {newSeasonForm.archivePrevious && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        بطل الموسم الحالي (للتسجيل بالأرشيف)
                      </label>
                      <input
                        type="text"
                        value={newSeasonForm.champion}
                        onChange={(e) => setNewSeasonForm({ ...newSeasonForm, champion: e.target.value })}
                        placeholder="مثال: برشلونة (هندسة)"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        وصيف الموسم الحالي
                      </label>
                      <input
                        type="text"
                        value={newSeasonForm.runnerUp}
                        onChange={(e) => setNewSeasonForm({ ...newSeasonForm, runnerUp: e.target.value })}
                        placeholder="مثال: الأهلي (حاسبات)"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notice of zero points reset */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 leading-relaxed font-sans">
                ⚡ <strong>تصفير النقاط والمباريات:</strong> سيتم بدء الموسم الجديد برصيد <strong>0 نقاط</strong> لجميع الفرق الـ 48 وتصفير سجل الأهداف والمباريات والهدافين لبدء منافسة جديدة وعادلة، مع حفظ كل تفاصيل الموسم المنتهي في الأرشيف!
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewSeasonModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isStartingNewSeason}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isStartingNewSeason ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري أرشفة الموسم والبدء بصفر نقاط...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>أرشفة الموسم وإطلاق الموسم الجديد بصفر نقاط 🏆</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ARCHIVED SEASONS VIEWER (أرشيف وسجل البطولات السابقة) */}
      {/* ------------------------------------------------------------- */}
      {isArchiveViewerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    سجل وأرشيف المواسم والبطولات السابقة
                  </h3>
                  <span className="text-xs text-slate-400">
                    النتائج المحفوظة وقوائم الفرق والأبطال للمواسم السابقة في قاعدة البيانات
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsArchiveViewerModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {archivedSnapshots.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  لا توجد مواسم مؤرشفة بعد في قاعدة البيانات.
                </div>
              ) : (
                archivedSnapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-400" />
                          <span>{snap.seasonName}</span>
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>العام: {snap.year}</span>
                          <span aria-hidden="true">·</span>
                          <span>السعة: {snap.teamsCount} فريقاً</span>
                          <span aria-hidden="true">·</span>
                          <span>المباريات: {snap.matchesCount} مباراة</span>
                        </div>
                      </div>

                      <span className="text-[11px] text-slate-400">
                        أرشف بتاريخ: {new Date(snap.archivedAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>

                    {/* Champion & Runner up */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <span className="text-[10px] text-amber-300 font-bold block">🏆 بطل الموسم واللقب:</span>
                        <strong className="text-white text-sm block mt-0.5">{snap.champion || 'غير محدد'}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold block">🥈 وصيف البطولة:</span>
                        <strong className="text-slate-200 text-sm block mt-0.5">{snap.runnerUp || 'غير محدد'}</strong>
                      </div>
                    </div>

                    {snap.scorersSummary && (
                      <p className="text-[11px] text-emerald-400 bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/20">
                        {snap.scorersSummary}
                      </p>
                    )}

                    {/* Top Teams Standings Preview */}
                    {Array.isArray(snap.teams) && snap.teams.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 block">
                          أبرز فرق الترتيب النهائي للموسم:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                          {snap.teams.slice(0, 4).map((t, i) => (
                            <div key={i} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                              <span className="font-bold text-white truncate">{t.name}</span>
                              <span className="text-amber-400 font-mono font-bold text-[11px]">{t.points ?? 0} ن</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsArchiveViewerModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
              >
                إغلاق الأرشيف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
