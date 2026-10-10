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
  ArrowRightLeft
} from 'lucide-react';
import { Match, Team } from '../App';
import { Player } from '../utils/roster';

interface SpectatorPortalPageProps {
  matches: Match[];
  teams: Team[];
  squads: Record<string, Player[]>;
  onSelectTeamForSquadView?: (teamName: string) => void;
  onSelectTeamForMatches?: (teamName: string) => void;
}

export const SpectatorPortalPage: React.FC<SpectatorPortalPageProps> = ({
  matches,
  teams,
  squads,
  onSelectTeamForSquadView,
  onSelectTeamForMatches,
}) => {
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming' | 'finished'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
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

                  {/* Middle Match Body: Teams & Score */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      
                      {/* Team A */}
                      <div className="flex-1 text-center space-y-1.5">
                        <div className={`w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr ${teamAObj?.logoColor || 'from-blue-600 to-indigo-600'} flex items-center justify-center text-white font-black text-sm shadow-md`}>
                          {match.teamA.slice(0, 2)}
                        </div>
                        <strong className="text-sm font-black text-white block truncate" title={match.teamA}>
                          {match.teamA}
                        </strong>
                      </div>

                      {/* Score or VS */}
                      <div className="shrink-0 text-center px-2">
                        {match.status === 'finished' || match.status === 'live' ? (
                          <div className="px-4 py-2 bg-slate-950 rounded-2xl border border-slate-800 font-mono font-black text-2xl text-emerald-400 shadow-inner">
                            {match.scoreA ?? 0} - {match.scoreB ?? 0}
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center font-black text-xs text-slate-400 shadow-inner">
                            VS
                          </div>
                        )}
                      </div>

                      {/* Team B */}
                      <div className="flex-1 text-center space-y-1.5">
                        <div className={`w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr ${teamBObj?.logoColor || 'from-emerald-600 to-teal-600'} flex items-center justify-center text-white font-black text-sm shadow-md`}>
                          {match.teamB.slice(0, 2)}
                        </div>
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

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
