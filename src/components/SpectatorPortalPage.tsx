import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  Clock, 
  MapPin, 
  Trophy, 
  Shield, 
  Flame, 
  CheckCircle2, 
  Sparkles, 
  Users, 
  ChevronRight, 
  SlidersHorizontal,
  Bell,
  Star,
  Activity,
  ArrowRightLeft,
  Edit3,
  Shirt,
  Lock,
  X,
  Eye,
  Info,
  Vote
} from 'lucide-react';
import { Match, Team } from '../App';
import { Player } from '../utils/roster';
import { MatchScheduleNotification } from '../utils/notifications';
import { TeamLogo } from '../utils/teamLogos';

interface SpectatorPortalPageProps {
  matches: Match[];
  teams: Team[];
  squads: Record<string, Player[]>;
  matchAlerts?: MatchScheduleNotification[];
  onOpenAllAlertsModal?: () => void;
  onSelectTeamForSquadView?: (teamName: string) => void;
  onSelectTeamForMatches?: (teamName: string) => void;
  isAdmin?: boolean;
  onEditResult?: (match: Match) => void;
  onEditSchedule?: (match: Match) => void;
  onEditLineup?: (match: Match) => void;
  onSendAlert?: (match: Match) => void;
  onNavigateToFantasy?: () => void;
  onNavigateToPredictions?: () => void;
  onOpenVoteModal?: (match: Match) => void;
}

export const SpectatorPortalPage: React.FC<SpectatorPortalPageProps> = ({
  matches,
  teams,
  squads,
  matchAlerts = [],
  isAdmin = false,
  onOpenAllAlertsModal,
  onSelectTeamForSquadView,
  onSelectTeamForMatches,
  onEditResult,
  onEditSchedule,
  onEditLineup,
  onSendAlert,
  onNavigateToFantasy,
  onNavigateToPredictions,
  onOpenVoteModal,
}) => {
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming' | 'finished'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [selectedMatchForDetails, setSelectedMatchForDetails] = useState<Match | null>(null);
  const [myFavoriteTeams, setMyFavoriteTeams] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('my_fav_teams');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavoriteTeam = (teamName: string) => {
    setMyFavoriteTeams(prev => {
      const next = prev.includes(teamName) ? prev.filter(t => t !== teamName) : [...prev, teamName];
      try {
        localStorage.setItem('my_fav_teams', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Only consider scheduled matches for fans, or all if searching
  const scheduledMatches = useMemo(() => {
    return matches.filter(m => m.isScheduled);
  }, [matches]);

  const liveMatches = useMemo(() => {
    return matches.filter(m => m.status === 'live');
  }, [matches]);

  const upcomingMatches = useMemo(() => {
    return scheduledMatches.filter(m => m.status === 'upcoming');
  }, [scheduledMatches]);

  const finishedMatches = useMemo(() => {
    return matches.filter(m => m.status === 'finished');
  }, [matches]);

  // Filtered list
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      // Must be scheduled or live/finished
      if (!m.isScheduled && m.status === 'upcoming') return false;

      // Status
      if (statusFilter === 'live' && m.status !== 'live') return false;
      if (statusFilter === 'upcoming' && m.status !== 'upcoming') return false;
      if (statusFilter === 'finished' && m.status !== 'finished') return false;

      // Group
      if (selectedGroupFilter !== 'all' && m.group !== selectedGroupFilter) return false;

      // Team
      if (selectedTeamFilter === 'favorites') {
        if (!myFavoriteTeams.includes(m.teamA) && !myFavoriteTeams.includes(m.teamB)) return false;
      } else if (selectedTeamFilter !== 'all') {
        if (m.teamA !== selectedTeamFilter && m.teamB !== selectedTeamFilter) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTeams = m.teamA.toLowerCase().includes(q) || m.teamB.toLowerCase().includes(q);
        const inStage = m.stageName.toLowerCase().includes(q);
        const inPitch = (m.pitch || '').toLowerCase().includes(q);
        const inDate = (m.date || '').toLowerCase().includes(q);
        if (!inTeams && !inStage && !inPitch && !inDate) return false;
      }

      return true;
    });
  }, [matches, statusFilter, selectedGroupFilter, selectedTeamFilter, myFavoriteTeams, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner for Fans & Players */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-950 via-slate-900 to-emerald-950 border border-sky-500/30 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold border border-sky-500/30">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              بوابة الجماهير واللاعبين • متابعة المواعيد والنتائج المباشرة
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              اعرف مواعيد ماتشاتك، نتائج الفرق، وأماكن الملاعب لحظة بلحظة ⚽
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              هذه الصفحة مخصصة للمتفرجين ولاعبي الفرق لمعرفة توقيت الماتش، الملعب، والنتائج المباشرة بكل سهولة وسرعة وبدون تعقيد. اختر فرقتك المفضلة لتظهر لك مبارياتها فوراً.
            </p>
          </div>

          {/* Quick Stats Widget */}
          <div className="grid grid-cols-3 gap-2.5 bg-slate-950/70 p-4 rounded-2xl border border-slate-800 backdrop-blur-md shrink-0 w-full md:w-auto">
            <div className="text-center px-3">
              <span className="text-[10px] text-emerald-400 block font-bold mb-0.5">مباشر الآن</span>
              <strong className="text-xl md:text-2xl font-black text-white flex items-center justify-center gap-1">
                {liveMatches.length > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
                {liveMatches.length}
              </strong>
            </div>
            <div className="text-center px-3 border-r border-slate-800">
              <span className="text-[10px] text-sky-400 block font-bold mb-0.5">مواعيد مؤكدة</span>
              <strong className="text-xl md:text-2xl font-black text-white">
                {upcomingMatches.length}
              </strong>
            </div>
            <div className="text-center px-3 border-r border-slate-800">
              <span className="text-[10px] text-amber-400 block font-bold mb-0.5">انتهت</span>
              <strong className="text-xl md:text-2xl font-black text-white">
                {finishedMatches.length}
              </strong>
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Exclusive Admin Notice Banner (Only shown to Admin) */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 border-2 border-amber-500/60 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/25 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/40 shadow-inner">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-white font-black text-sm">أنت مسجل بصفتك الأدمن (Admin 👑)</strong>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                  صلاحيات التحكم الكاملة
                </span>
              </div>
              <p className="text-slate-300 mt-1 leading-relaxed text-xs">
                أنت فقط بصفتك الأدمن يمكنك من صفحة المتفرجين الدخول على أي ماتش وتعديل النتيجة، تسجيل الأهداف، وتعديل المواعيد والتشكيلات. المشجعون واللاعبون يرون الصفحة للعرض والمتابعة فقط 🔒
              </p>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold shrink-0">
            🔒 تعديل النتائج حصري للأدمن
          </div>
        </div>
      )}

      {/* Official Schedule & Venue Alerts Announcements for Spectators */}
      {matchAlerts.length > 0 && (
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3.5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-white font-black">{matchAlerts[0].title}</strong>
                <span className="px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                  جديد
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                {matchAlerts[0].date} • {matchAlerts[0].time} • {matchAlerts[0].pitch} ({matchAlerts[0].teamA} ضد {matchAlerts[0].teamB})
              </p>
            </div>
          </div>

          {onOpenAllAlertsModal && (
            <button
              onClick={onOpenAllAlertsModal}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <span>عرض كل الإخطارات ({matchAlerts.length})</span>
            </button>
          )}
        </div>
      )}

      {/* Interactive Spectator Features: Fantasy & Predictions / Voting */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fantasy Card */}
        <div 
          onClick={onNavigateToFantasy}
          className="relative overflow-hidden bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-3xl p-5 shadow-xl hover:border-emerald-400 transition-all cursor-pointer group flex items-center justify-between gap-4"
        >
          <div className="space-y-1 z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>ميزة جديدة وحصرية 🌟</span>
            </div>
            <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">
              فانتزي لاعبي دوري جامعة النيل
            </h3>
            <p className="text-xs text-slate-300 max-w-sm">
              اختر تشكيلتك بميزانية 50.0M مع لاعبي باريس الأبطال الأعلى سعراً وتصدر جدول المراكز!
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-lg group-hover:scale-110 transition-transform">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        {/* Predictions Card */}
        <div 
          onClick={onNavigateToPredictions}
          className="relative overflow-hidden bg-gradient-to-r from-blue-950/80 via-slate-900 to-slate-950 border border-blue-500/40 rounded-3xl p-5 shadow-xl hover:border-blue-400 transition-all cursor-pointer group flex items-center justify-between gap-4"
        >
          <div className="space-y-1 z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-bold">
              <Vote className="w-3 h-3 text-blue-400" />
              <span>تصويت حر ومباشر 🗳️</span>
            </div>
            <h3 className="text-base font-black text-white group-hover:text-blue-300 transition-colors">
              توقعات المباريات (تصويت فقط)
            </h3>
            <p className="text-xs text-slate-300 max-w-sm">
              التصويت متاح حتى موعد انطلاق كل ماتش! صوّت وتابع جدول مراكز المتوقعين وترتيب الفرق.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black shrink-0 shadow-lg group-hover:scale-110 transition-transform">
            <Vote className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Live Matches Special Carousel / Alert Banner */}
      {liveMatches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-black text-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <span>مباريات جارية الآن مباشرة على الملاعب! 🔥</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveMatches.map(m => (
              <div 
                key={m.id}
                className="bg-gradient-to-b from-rose-950/40 via-slate-900 to-slate-950 border-2 border-rose-500/50 rounded-2xl p-4 shadow-xl shadow-rose-950/20 relative overflow-hidden"
              >
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black animate-pulse flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    د {m.minute || 45}'
                  </span>
                  <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-400" />
                    {m.pitch || 'الملعب الرئيسي'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 py-2">
                  <div className="flex-1 text-center font-bold text-white text-sm">
                    {m.teamA}
                  </div>
                  <div className="px-4 py-1.5 bg-slate-950 rounded-xl border border-rose-500/40 font-mono font-black text-xl text-rose-300 shadow-inner">
                    {m.scoreA ?? 0} - {m.scoreB ?? 0}
                  </div>
                  <div className="flex-1 text-center font-bold text-white text-sm">
                    {m.teamB}
                  </div>
                </div>

                {m.scorersSummary && (
                  <p className="text-[11px] text-amber-300/90 text-center mt-2 bg-slate-950/60 py-1 px-2 rounded-lg border border-slate-800 line-clamp-1">
                    ⚽ {m.scorersSummary}
                  </p>
                )}

                {isAdmin && onEditResult && (
                  <button
                    type="button"
                    onClick={() => onEditResult(m)}
                    className="mt-3 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/30 hover:scale-[1.02]"
                    title="تعديل النتيجة المباشرة وتسجيل الأهداف"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل النتيجة المباشرة والأهداف ⚽ (أدمن 👑)</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters Hub */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
        
        {/* Quick Filter: Select Team / Favorites */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Team Dropdown Selector */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-slate-400 font-bold shrink-0 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              فرقتك:
            </span>
            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white text-xs font-bold rounded-xl px-3 py-2 w-full max-w-xs focus:outline-none focus:border-sky-500"
            >
              <option value="all">كل الفرق (عرض عام)</option>
              {myFavoriteTeams.length > 0 && (
                <option value="favorites">⭐ فرقي المفضلة فقط ({myFavoriteTeams.length})</option>
              )}
              <optgroup label="فرق البطولة (48 فرقة)">
                {teams.map(t => (
                  <option key={t.id} value={t.name}>
                    {t.name} (المجموعة {t.group})
                  </option>
                ))}
              </optgroup>
            </select>

            {selectedTeamFilter !== 'all' && selectedTeamFilter !== 'favorites' && (
              <button
                onClick={() => toggleFavoriteTeam(selectedTeamFilter)}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  myFavoriteTeams.includes(selectedTeamFilter)
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
                title="إضافة أو إزالة من الفرق المفضلة"
              >
                <Star className={`w-3.5 h-3.5 ${myFavoriteTeams.includes(selectedTeamFilter) ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="ابحث باسم فرقتك، الملعب، أو اليوم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 pr-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Secondary Tab Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold ml-1">حالة الماتش:</span>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'upcoming', label: 'المواعيد القادمة ⏳' },
              { id: 'live', label: 'مباشر 🔥' },
              { id: 'finished', label: 'النتائج السابقة ✅' },
            ].map(st => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-sky-600 text-white shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Group Filter */}
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="text-slate-400 font-bold ml-1">المجموعة:</span>
            <button
              onClick={() => setSelectedGroupFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold ${
                selectedGroupFilter === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              الكل
            </button>
            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(g => (
              <button
                key={g}
                onClick={() => setSelectedGroupFilter(g)}
                className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center ${
                  selectedGroupFilter === g
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Matches Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>المباريات المعروضة: <strong className="text-white">{filteredMatches.length}</strong> مباراة</span>
          {selectedTeamFilter !== 'all' && (
            <span className="text-sky-400">
              تصفية خاصة بـ: <strong>{selectedTeamFilter}</strong>
            </span>
          )}
        </div>

        {filteredMatches.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-12 text-center space-y-3">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">لا توجد مباريات مطابقة للبحث حالياً</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              جرب تغيير التصفية أو اختيار "كل الفرق" لعرض جدول المواعيد الرسمي بالكامل.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMatches.map(match => {
              const teamAObj = teams.find(t => t.name === match.teamA);
              const teamBObj = teams.find(t => t.name === match.teamB);

              return (
                <div
                  key={match.id}
                  className={`relative rounded-3xl border transition-all overflow-hidden flex flex-col justify-between ${
                    match.status === 'live'
                      ? 'bg-gradient-to-b from-rose-950/30 to-slate-900 border-rose-500/40 shadow-xl'
                      : match.status === 'finished'
                      ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-900 border-slate-800 hover:border-sky-500/40 shadow-lg'
                  }`}
                >
                  {/* Top Bar: Stage & Status */}
                  <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      {match.stageName}
                      {match.group && <span className="text-slate-500 font-mono">(المجموعة {match.group})</span>}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isAdmin && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5 text-amber-400" />
                          <span>تحكم أدمن 👑</span>
                        </span>
                      )}

                      {match.status === 'live' ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold text-[10px] animate-pulse">
                          مباشر {match.minute ? `(${match.minute}')` : ''}
                        </span>
                      ) : match.status === 'finished' ? (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] border border-slate-700">
                          انتهت ✅
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold text-[10px]">
                          مباراة قادمة ⏳
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Match Body: Teams & Score */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      
                      {/* Team A */}
                      <div className="flex-1 text-center space-y-1.5">
                        <TeamLogo teamName={match.teamA} size="xl" className="mx-auto" />
                        <strong className="text-sm font-black text-white block truncate" title={match.teamA}>
                          {match.teamA}
                        </strong>
                      </div>

                      {/* Score or VS */}
                      <div 
                        onClick={() => {
                          if (isAdmin && onEditResult) {
                            onEditResult(match);
                          } else {
                            setSelectedMatchForDetails(match);
                          }
                        }}
                        className="shrink-0 text-center px-2 cursor-pointer group"
                        title={isAdmin ? 'اضغط لتعديل نتيجة المباراة وتسجيل الأهداف كـ Admin 👑' : 'اضغط لعرض تفاصيل المباراة'}
                      >
                        {match.status === 'finished' || match.status === 'live' ? (
                          <div className={`px-4 py-2 bg-slate-950 rounded-2xl border font-mono font-black text-2xl shadow-inner transition-all ${
                            isAdmin 
                              ? 'border-amber-500/60 group-hover:border-emerald-400 group-hover:bg-slate-900 text-emerald-400 ring-1 ring-amber-500/30' 
                              : 'border-slate-800 group-hover:border-sky-500/50 text-emerald-400'
                          }`}>
                            <div>{match.scoreA ?? 0} - {match.scoreB ?? 0}</div>
                            {isAdmin ? (
                              <span className="block text-[9px] text-amber-400 font-sans font-bold group-hover:text-emerald-300">
                                تعديل النتيجة ✎ (أدمن)
                              </span>
                            ) : (
                              <span className="block text-[8px] text-slate-500 font-sans group-hover:text-sky-300">
                                تفاصيل الماتش 👁️
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className={`w-10 h-10 rounded-2xl bg-slate-950 border flex items-center justify-center font-black text-xs shadow-inner transition-all ${
                            isAdmin 
                              ? 'border-amber-500/60 text-amber-400 group-hover:border-emerald-400 group-hover:text-emerald-300 ring-1 ring-amber-500/30' 
                              : 'border-slate-800 text-slate-400 group-hover:border-sky-500/50 group-hover:text-white'
                          }`}>
                            {isAdmin ? '✎' : 'VS'}
                          </div>
                        )}
                      </div>

                      {/* Team B */}
                      <div className="flex-1 text-center space-y-1.5">
                        <TeamLogo teamName={match.teamB} size="xl" className="mx-auto" />
                        <strong className="text-sm font-black text-white block truncate" title={match.teamB}>
                          {match.teamB}
                        </strong>
                      </div>

                    </div>

                    {/* Scorers info if finished */}
                    {match.scorersSummary && (
                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-amber-300 leading-snug font-medium">
                        <div className="font-bold text-slate-400 mb-0.5 flex items-center gap-1">
                          ⚽ مسجلو الأهداف وصناع اللعب:
                        </div>
                        {match.scorersSummary}
                      </div>
                    )}

                    {/* Cards & Substitutions Events */}
                    {((match.cards && match.cards.length > 0) || (match.substitutions && match.substitutions.length > 0)) && (
                      <div className="space-y-2 pt-2 border-t border-slate-800/60">
                        {/* Quick Badges Bar */}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-bold flex items-center gap-1">
                            <span>⚡ أحداث الماتش:</span>
                          </span>
                          <div className="flex items-center gap-1.5 font-mono text-[10px]">
                            {match.substitutions && match.substitutions.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                                <ArrowRightLeft className="w-2.5 h-2.5 text-emerald-400" />
                                <span>{match.substitutions.length} تبديل</span>
                              </span>
                            )}
                            {match.cards && match.cards.filter(c => c.cardType === 'yellow').length > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                                🟨 {match.cards.filter(c => c.cardType === 'yellow').length}
                              </span>
                            )}
                            {match.cards && match.cards.filter(c => c.cardType === 'red' || c.cardType === 'second_yellow').length > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-bold">
                                🟥 {match.cards.filter(c => c.cardType === 'red' || c.cardType === 'second_yellow').length}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Events Details Box */}
                        <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2 text-[11px]">
                          {/* Cards */}
                          {match.cards && match.cards.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-slate-400 font-bold block text-[10px]">الإنذارات والبطاقات:</span>
                              <div className="flex flex-wrap gap-1">
                                {match.cards.map(c => (
                                  <span
                                    key={c.id}
                                    className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 ${
                                      c.cardType === 'yellow'
                                        ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    }`}
                                  >
                                    <span>{c.cardType === 'yellow' ? '🟨' : c.cardType === 'second_yellow' ? '🟨🟥' : '🟥'}</span>
                                    <span>{c.playerName} ({c.team})</span>
                                    <span className="font-mono text-slate-400">د{c.minute}'</span>
                                    {c.reason && <span className="text-slate-400 font-normal text-[9px]">[{c.reason}]</span>}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Substitutions */}
                          {match.substitutions && match.substitutions.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-slate-800/50">
                              <span className="text-slate-400 font-bold block text-[10px]">التبديلات:</span>
                              <div className="space-y-1">
                                {match.substitutions.map(sub => (
                                  <div key={sub.id} className="flex items-center justify-between text-[10px] bg-slate-900/60 px-2 py-1 rounded-lg">
                                    <span className="font-mono text-amber-400 font-bold">د{sub.minute}' ({sub.team})</span>
                                    <div className="flex items-center gap-1 font-bold">
                                      <span className="text-emerald-400">🟢 {sub.playerIn}</span>
                                      <span className="text-slate-500">⮂</span>
                                      <span className="text-rose-400">🔴 {sub.playerOut}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Lineup info if configured */}
                    {match.lineups?.teamAStarters && match.lineups.teamAStarters.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 flex items-center justify-between gap-2 text-[11px] text-purple-300">
                        <div className="flex items-center gap-1.5 truncate">
                          <Shirt className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="font-bold text-slate-300">التشكيل:</span>
                          <span className="font-mono text-emerald-300">{match.teamA}: {match.lineups.teamAStarters.length} أساسي</span>
                          <span className="text-slate-500">•</span>
                          <span className="font-mono text-blue-300">{match.teamB}: {match.lineups.teamBStarters?.length || 0} أساسي</span>
                        </div>
                        {isAdmin && onEditLineup && (
                          <button
                            onClick={() => onEditLineup(match)}
                            className="text-[10px] text-purple-400 hover:text-white font-bold underline cursor-pointer shrink-0 mr-1"
                          >
                            تعديل ✎
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Footer: Match Schedule & Venue */}
                  <div className="p-3.5 bg-slate-950/70 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3 text-slate-300">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-sky-400" />
                        {match.date ? match.date : 'سيحدد لاحقاً'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {match.time ? match.time : '—'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
                      <MapPin className="w-3.5 h-3.5" />
                      {match.pitch || 'الملعب الرئيسي'}
                    </div>
                  </div>

                  {/* EXCLUSIVE ADMIN CONTROLS (Only visible to Admin) */}
                  {isAdmin ? (
                    <div className="p-3 bg-slate-950 border-t border-amber-500/40 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-amber-950/30 via-slate-950 to-slate-950">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black flex items-center gap-1">
                          <Shield className="w-3 h-3 text-amber-400" />
                          <span>تحكم الأدمن:</span>
                        </span>

                        {onEditSchedule && (
                          <button
                            type="button"
                            onClick={() => onEditSchedule(match)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer border border-slate-700 hover:text-white"
                            title="تعديل موعد وتاريخ وملعب المباراة"
                          >
                            <Clock className="w-3 h-3 text-sky-400" />
                            <span>الميعاد</span>
                          </button>
                        )}

                        {onEditLineup && (
                          <button
                            type="button"
                            onClick={() => onEditLineup(match)}
                            className="px-2 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            title="تحديد التشكيل الأساسي والبدلاء"
                          >
                            <Shirt className="w-3 h-3 text-purple-400" />
                            <span>التشكيل</span>
                          </button>
                        )}

                        {onSendAlert && (
                          <button
                            type="button"
                            onClick={() => onSendAlert(match)}
                            className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            title="إرسال تنبيه رسمي للاعبي الفريقين"
                          >
                            <Bell className="w-3 h-3 text-blue-400" />
                            <span>تنبيه 📢</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedMatchForDetails(match)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
                          title="عرض تفاصيل التشكيل والبطاقات والأحداث"
                        >
                          <Eye className="w-3 h-3 text-sky-400" />
                          <span>تفاصيل</span>
                        </button>
                      </div>

                      {onEditResult && (
                        <button
                          type="button"
                          onClick={() => onEditResult(match)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/40 hover:scale-105 ring-1 ring-emerald-400/50"
                          title="الدخول للمباراة وتعديل النتيجة والأهداف"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{match.status === 'finished' ? 'الدخول وتعديل النتيجة ✎ (أدمن 👑)' : 'الدخول وتسجيل النتيجة ⚽ (أدمن 👑)'}</span>
                        </button>
                      )}
                      {onOpenVoteModal && (
                        <button
                          type="button"
                          onClick={() => onOpenVoteModal(match)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          title="التصويت وتوقع نتيجة المباراة (Vote for match)"
                        >
                          <Vote className="w-3.5 h-3.5 text-blue-400" />
                          <span>صوّت 🗳️</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-950/70 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <Lock className="w-3 h-3 text-slate-500" />
                        <span>متابعة المشجعين • معتمدة</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {onOpenVoteModal && (
                          <button
                            type="button"
                            onClick={() => onOpenVoteModal(match)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/20"
                            title="التصويت وتوقع نتيجة المباراة (Vote for match)"
                          >
                            <Vote className="w-3.5 h-3.5 text-amber-300" />
                            <span>صوّت للمباراة 🗳️</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedMatchForDetails(match)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-800"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>عرض تفاصيل الماتش</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MATCH DETAILS MODAL (Available to view for everyone, editable ONLY by Admin) */}
      {selectedMatchForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-black text-white flex items-center gap-2">
                    <span>{selectedMatchForDetails.stageName}</span>
                    {selectedMatchForDetails.group && (
                      <span className="text-xs text-slate-400 font-mono">(المجموعة {selectedMatchForDetails.group})</span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    بطاقة المباراة وتفاصيل التشكيل والنتائج المعتمدة
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMatchForDetails(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5">
              {/* Scoreboard Banner */}
              <div className="bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                <div className="flex items-center justify-around gap-4 py-2">
                  <div className="flex-1 text-center space-y-1.5">
                    <TeamLogo teamName={selectedMatchForDetails.teamA} size="xl" className="mx-auto" />
                    <strong className="text-base font-black text-white block">{selectedMatchForDetails.teamA}</strong>
                    <span className="text-[10px] text-slate-400">الفريق الأول</span>
                  </div>

                  <div className="shrink-0 px-5 py-2.5 bg-slate-950 border border-emerald-500/40 rounded-2xl font-mono font-black text-2xl text-emerald-400 shadow-inner">
                    {selectedMatchForDetails.status === 'upcoming' 
                      ? 'VS' 
                      : `${selectedMatchForDetails.scoreA ?? 0} - ${selectedMatchForDetails.scoreB ?? 0}`}
                  </div>

                  <div className="flex-1 text-center space-y-1.5">
                    <TeamLogo teamName={selectedMatchForDetails.teamB} size="xl" className="mx-auto" />
                    <strong className="text-base font-black text-white block">{selectedMatchForDetails.teamB}</strong>
                    <span className="text-[10px] text-slate-400">الفريق الثاني</span>
                  </div>
                </div>

                {/* Match Status & Timing */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
                  <span className="flex items-center gap-1 text-sky-400 font-bold">
                    <Calendar className="w-3.5 h-3.5" />
                    {selectedMatchForDetails.date || 'سيحدد لاحقاً'}
                  </span>
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    {selectedMatchForDetails.time || '—'}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedMatchForDetails.pitch || 'الملعب الرئيسي'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                    {selectedMatchForDetails.status === 'live' 
                      ? `مباشر (${selectedMatchForDetails.minute || 45}')` 
                      : selectedMatchForDetails.status === 'finished' 
                      ? 'انتهت رسمياً ✅' 
                      : 'قادمة ⏳'}
                  </span>
                </div>
              </div>

              {/* Scorers Summary if any */}
              {selectedMatchForDetails.scorersSummary && (
                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1 text-xs">
                  <strong className="text-amber-400 flex items-center gap-1 font-black">
                    ⚽ مسجلو الأهداف وصناع اللعب:
                  </strong>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    {selectedMatchForDetails.scorersSummary}
                  </p>
                </div>
              )}

              {/* Cards & Substitutions */}
              {((selectedMatchForDetails.cards && selectedMatchForDetails.cards.length > 0) || 
                (selectedMatchForDetails.substitutions && selectedMatchForDetails.substitutions.length > 0)) && (
                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 text-xs">
                  <strong className="text-slate-300 font-black flex items-center gap-1">
                    ⚡ وقائع وأحداث المباراة:
                  </strong>

                  {/* Cards */}
                  {selectedMatchForDetails.cards && selectedMatchForDetails.cards.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] text-slate-400 font-bold">الإنذارات والبطاقات:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedMatchForDetails.cards.map(c => (
                          <span
                            key={c.id}
                            className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${
                              c.cardType === 'yellow'
                                ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            }`}
                          >
                            <span>{c.cardType === 'yellow' ? '🟨' : c.cardType === 'second_yellow' ? '🟨🟥' : '🟥'}</span>
                            <span>{c.playerName} ({c.team})</span>
                            <span className="font-mono text-slate-400">د{c.minute}'</span>
                            {c.reason && <span className="text-slate-400 text-[10px]">[{c.reason}]</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Substitutions */}
                  {selectedMatchForDetails.substitutions && selectedMatchForDetails.substitutions.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                      <span className="text-[11px] text-slate-400 font-bold">التبديلات الرسمية:</span>
                      <div className="space-y-1">
                        {selectedMatchForDetails.substitutions.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between text-xs bg-slate-900/60 px-2.5 py-1.5 rounded-lg">
                            <span className="font-mono text-amber-400 font-bold">د{sub.minute}' ({sub.team})</span>
                            <div className="flex items-center gap-2 font-bold">
                              <span className="text-emerald-400">🟢 {sub.playerIn}</span>
                              <span className="text-slate-500">⮂</span>
                              <span className="text-rose-400">🔴 {sub.playerOut}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Lineups if available */}
              {selectedMatchForDetails.lineups && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Team A Lineup */}
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                    <strong className="text-sky-400 block font-black border-b border-slate-800 pb-1">
                      تشكيل {selectedMatchForDetails.teamA}
                    </strong>
                    <div>
                      <span className="text-[10px] text-emerald-400 font-bold block mb-1">الأساسيون (🟢):</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedMatchForDetails.lineups.teamAStarters?.map(name => (
                          <span key={name} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200 text-[11px]">
                            {name}
                          </span>
                        )) || <span className="text-slate-500 text-[10px]">لم يحدد بعد</span>}
                      </div>
                    </div>
                    {selectedMatchForDetails.lineups.teamABench && selectedMatchForDetails.lineups.teamABench.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-800/60">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">البدلاء (🟡):</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedMatchForDetails.lineups.teamABench.map(name => (
                            <span key={name} className="px-1.5 py-0.5 rounded bg-slate-900/60 text-slate-400 text-[10px]">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Team B Lineup */}
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                    <strong className="text-emerald-400 block font-black border-b border-slate-800 pb-1">
                      تشكيل {selectedMatchForDetails.teamB}
                    </strong>
                    <div>
                      <span className="text-[10px] text-emerald-400 font-bold block mb-1">الأساسيون (🟢):</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedMatchForDetails.lineups.teamBStarters?.map(name => (
                          <span key={name} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200 text-[11px]">
                            {name}
                          </span>
                        )) || <span className="text-slate-500 text-[10px]">لم يحدد بعد</span>}
                      </div>
                    </div>
                    {selectedMatchForDetails.lineups.teamBBench && selectedMatchForDetails.lineups.teamBBench.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-800/60">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">البدلاء (🟡):</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedMatchForDetails.lineups.teamBBench.map(name => (
                            <span key={name} className="px-1.5 py-0.5 rounded bg-slate-900/60 text-slate-400 text-[10px]">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* EXCLUSIVE ADMIN CONTROLS IN MODAL (Only for Admin) */}
              {isAdmin ? (
                <div className="p-4 bg-gradient-to-r from-amber-950/40 via-slate-950 to-amber-950/30 border-2 border-amber-500/50 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-400" />
                      <strong className="text-white text-xs font-black">تحكم الأدمن 👑 (أنت فقط صاحب الصلاحية)</strong>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                      صلاحيات التعديل
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {onEditResult && (
                      <button
                        onClick={() => {
                          const m = selectedMatchForDetails;
                          setSelectedMatchForDetails(null);
                          onEditResult(m);
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>تعديل النتيجة وتسجيل الأهداف ⚽</span>
                      </button>
                    )}

                    {onEditSchedule && (
                      <button
                        onClick={() => {
                          const m = selectedMatchForDetails;
                          setSelectedMatchForDetails(null);
                          onEditSchedule(m);
                        }}
                        className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700"
                      >
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        <span>تعديل الميعاد</span>
                      </button>
                    )}

                    {onEditLineup && (
                      <button
                        onClick={() => {
                          const m = selectedMatchForDetails;
                          setSelectedMatchForDetails(null);
                          onEditLineup(m);
                        }}
                        className="py-2.5 px-3.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-purple-500/30"
                      >
                        <Shirt className="w-3.5 h-3.5 text-purple-400" />
                        <span>التشكيل</span>
                      </button>
                    )}

                    {onSendAlert && (
                      <button
                        onClick={() => {
                          const m = selectedMatchForDetails;
                          setSelectedMatchForDetails(null);
                          onSendAlert(m);
                        }}
                        className="py-2.5 px-3.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-blue-500/30"
                      >
                        <Bell className="w-3.5 h-3.5 text-blue-400" />
                        <span>إرسال تنبيه</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>وضع المشاهدة فقط • تعديل النتائج والأهداف متاح حصرياً للأدمن (Admin 👑)</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-mono">البيانات معتمدة</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              {onOpenVoteModal && (
                <button
                  type="button"
                  onClick={() => {
                    const m = selectedMatchForDetails;
                    setSelectedMatchForDetails(null);
                    onOpenVoteModal(m);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/30"
                >
                  <Vote className="w-3.5 h-3.5 text-amber-300" />
                  <span>صوّت لهذه المباراة 🗳️ (Vote for match)</span>
                </button>
              )}
              <button
                onClick={() => setSelectedMatchForDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer mr-auto"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
