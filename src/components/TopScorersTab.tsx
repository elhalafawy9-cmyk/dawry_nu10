import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Target, 
  Search, 
  Flame, 
  Award, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  Plus, 
  RotateCcw,
  ExternalLink,
  ShieldAlert,
  Info
} from 'lucide-react';
import { Match, Team } from '../App';
import { calculateTournamentTopScorers, PlayerScorer } from '../utils/scorers';
import { TeamLogo } from '../utils/teamLogos';

interface TopScorersTabProps {
  matches: Match[];
  teams: Team[];
  onOpenRecordResult: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  onSeedDemoScorers?: () => void;
}

export const TopScorersTab: React.FC<TopScorersTabProps> = ({
  matches,
  teams,
  onOpenRecordResult,
  onSelectTeam,
  onSeedDemoScorers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  const [minGoalsFilter, setMinGoalsFilter] = useState<number>(0);
  const [expandedPlayerName, setExpandedPlayerName] = useState<string | null>(null);

  // Compute scorers
  const { scorers, totalTournamentGoals, totalMatchesWithScorers } = useMemo(() => {
    return calculateTournamentTopScorers(matches, teams);
  }, [matches, teams]);

  // Filtered scorers list
  const filteredScorers = useMemo(() => {
    return scorers.filter(player => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = player.name.toLowerCase().includes(q);
        const matchesTeam = player.team.toLowerCase().includes(q);
        if (!matchesName && !matchesTeam) return false;
      }

      // Team filter
      if (selectedTeamFilter !== 'all' && player.team !== selectedTeamFilter) {
        return false;
      }

      // Min goals
      if (minGoalsFilter > 0 && player.totalGoals < minGoalsFilter) {
        return false;
      }

      return true;
    });
  }, [scorers, searchQuery, selectedTeamFilter, minGoalsFilter]);

  const topScorer = scorers.length > 0 ? scorers[0] : null;

  // Unique teams list among scorers
  const teamsWithScorers = useMemo(() => {
    const set = new Set<string>();
    scorers.forEach(s => {
      if (s.team) set.add(s.team);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [scorers]);

  return (
    <div className="space-y-6">
      
      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-emerald-950/60 border border-amber-500/30 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-2 border border-amber-500/30">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            جائزة الحذاء الذهبي • دوري جامعة النيل 2026
          </div>
          <h2 className="text-xl md:text-3xl font-black text-white mb-2 flex items-center gap-2.5">
            <span>قائمة هدافي البطولة</span>
            <span className="text-amber-400">⚽</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
            يتم حساب وترتيب الهدافين تلقائياً وفورياً من ملاحظات ومسجلي الأهداف في كل مباراة. يمكنك إضافة أهداف أي ماتش عند تسجيل النتيجة.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {scorers.length === 0 && onSeedDemoScorers && (
            <button
              onClick={onSeedDemoScorers}
              className="px-4 py-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 font-bold text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg"
              title="إضافة عينة من نتائج ومسجلي الأهداف لتجربة لوحة الهدافين"
            >
              <Sparkles className="w-4 h-4" />
              تجربة بيانات أهداف نموذجية
            </button>
          )}

          <div className="bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-slate-800 text-xs text-slate-400">
            <span>عدد المسجلين: </span>
            <strong className="text-amber-400 font-bold font-mono text-sm">{scorers.length}</strong> لاعب
          </div>
        </div>
      </div>

      {/* Tournament Scoring Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>إجمالي الأهداف المسجلة</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-white font-mono">
            {totalTournamentGoals}
            <span className="text-xs font-sans text-amber-400 font-normal mr-1.5">هدفاً</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">موثقة عبر ملاحظات المباريات</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>عدد الهدافين</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-white font-mono">
            {scorers.length}
            <span className="text-xs font-sans text-emerald-400 font-normal mr-1.5">لاعباً</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">سجلوا أهدافاً حتى الآن</span>
        </div>

        <div className="bg-gradient-to-tr from-amber-950/40 to-slate-900 border border-amber-500/30 p-4 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-300 text-xs mb-1">
            <span>الهدّاف الحالي (المركز 1)</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg md:text-xl font-black text-amber-300 truncate">
            {topScorer ? topScorer.name : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            {topScorer ? (
              <>
                <span className="text-white font-bold">{topScorer.totalGoals} أهداف</span>
                <span>• {topScorer.team}</span>
              </>
            ) : (
              <span>بانتظار تسجيل أول أهداف البطولة</span>
            )}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>مباريات موثق هدافوها</span>
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-white font-mono">
            {totalMatchesWithScorers}
            <span className="text-xs font-sans text-teal-400 font-normal mr-1.5">مباراة</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">تتضمن تفاصيل مسجلي الأهداف</span>
        </div>
      </div>

      {/* TOP 3 PODIUM (منصة التتويج) */}
      {scorers.length >= 2 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="font-black text-white text-base md:text-lg">منصة التتويج لهدافي البطولة</h3>
            </div>
            <span className="text-xs text-slate-400">أفضل 3 هدافين في صدارة الترتيب</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* 1st Place - Gold */}
            {scorers[0] && (
              <div className="bg-gradient-to-b from-amber-500/15 via-slate-950 to-slate-950 border-2 border-amber-500/50 rounded-2xl p-5 text-center relative shadow-xl shadow-amber-500/10 order-1 md:order-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black text-xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30 ring-4 ring-amber-400/20 mb-3">
                  🥇
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-black border border-amber-500/30 mb-2">
                  المركز الأول • الحذاء الذهبي
                </div>
                <h4 className="text-lg font-black text-white hover:text-amber-300 transition-colors cursor-pointer" onClick={() => setExpandedPlayerName(scorers[0].name)}>
                  {scorers[0].name}
                </h4>
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-0.5">
                  <TeamLogo teamName={scorers[0].team} size="xs" />
                  <span>{scorers[0].team}</span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-around">
                  <div>
                    <span className="text-[10px] text-slate-500 block">الأهداف</span>
                    <strong className="text-2xl font-black text-amber-400 font-mono">{scorers[0].totalGoals}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">المباريات</span>
                    <strong className="text-sm font-black text-slate-300 font-mono">{scorers[0].matchesPlayedWithGoals}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* 2nd Place - Silver */}
            {scorers[1] && (
              <div className="bg-gradient-to-b from-slate-400/10 via-slate-950 to-slate-950 border border-slate-400/40 rounded-2xl p-5 text-center relative shadow-lg order-2 md:order-1">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-950 font-black text-lg flex items-center justify-center mx-auto shadow-md ring-4 ring-slate-400/20 mb-3">
                  🥈
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-slate-400/15 text-slate-300 text-[11px] font-black border border-slate-400/20 mb-2">
                  المركز الثاني • الحذاء الفضي
                </div>
                <h4 className="text-base font-black text-white hover:text-emerald-300 transition-colors cursor-pointer" onClick={() => setExpandedPlayerName(scorers[1].name)}>
                  {scorers[1].name}
                </h4>
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-0.5">
                  <TeamLogo teamName={scorers[1].team} size="xs" />
                  <span>{scorers[1].team}</span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-around">
                  <div>
                    <span className="text-[10px] text-slate-500 block">الأهداف</span>
                    <strong className="text-2xl font-black text-slate-200 font-mono">{scorers[1].totalGoals}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">المباريات</span>
                    <strong className="text-sm font-black text-slate-400 font-mono">{scorers[1].matchesPlayedWithGoals}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place - Bronze */}
            {scorers[2] && (
              <div className="bg-gradient-to-b from-amber-700/15 via-slate-950 to-slate-950 border border-amber-700/40 rounded-2xl p-5 text-center relative shadow-lg order-3 md:order-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 text-slate-950 font-black text-lg flex items-center justify-center mx-auto shadow-md ring-4 ring-amber-600/20 mb-3">
                  🥉
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-700/20 text-amber-400 text-[11px] font-black border border-amber-700/30 mb-2">
                  المركز الثالث • الحذاء البرونزي
                </div>
                <h4 className="text-base font-black text-white hover:text-amber-300 transition-colors cursor-pointer" onClick={() => setExpandedPlayerName(scorers[2].name)}>
                  {scorers[2].name}
                </h4>
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-0.5">
                  <TeamLogo teamName={scorers[2].team} size="xs" />
                  <span>{scorers[2].team}</span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-around">
                  <div>
                    <span className="text-[10px] text-slate-500 block">الأهداف</span>
                    <strong className="text-2xl font-black text-amber-500 font-mono">{scorers[2].totalGoals}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">المباريات</span>
                    <strong className="text-sm font-black text-slate-400 font-mono">{scorers[2].matchesPlayedWithGoals}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="text"
            placeholder="ابحث بالاسم أو الفريق..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 pr-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        {/* Filter by Team */}
        {teamsWithScorers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold">الفريق:</span>
            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">كل الفرق ({teamsWithScorers.length})</option>
              {teamsWithScorers.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        {/* Filter by min goals */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-bold">الأهداف:</span>
          <button
            onClick={() => setMinGoalsFilter(0)}
            className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              minGoalsFilter === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setMinGoalsFilter(2)}
            className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              minGoalsFilter === 2 ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            +2 أهداف
          </button>
          <button
            onClick={() => setMinGoalsFilter(3)}
            className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              minGoalsFilter === 3 ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            +3 أهداف
          </button>
        </div>
      </div>

      {/* Guide Note Box */}
      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-200">
            💡 كيف يعمل نظام الهدافين التلقائي؟
          </p>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            عند الضغط على <strong className="text-emerald-300">«تسجيل النتيجة»</strong> لأي مباراة، اكتب أسماء مسجلي الأهداف في خانة الملاحظات بأي صيغة طبيعية (مثلاً: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">أحمد (2)، علي (د15)</code> أو <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">محمد صلاح: 3</code> أو <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">ليفاندوفسكي (هدفين)</code>) وسيتم استخراج اللاعبين والأهداف تلقائياً وإضافتهم لترتيب الهدافين!
          </p>
        </div>
      </div>

      {/* Empty State */}
      {scorers.length === 0 && (
        <div className="text-center py-16 px-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-white">لم يتم تسجيل أي أهداف في البطولة بعد</h3>
          <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            لتظهر أسماء الهدافين هنا، قم بفتح أي مباراة من تبويب <strong className="text-emerald-400">«المباريات وجدول المواعيد»</strong>، واضغط على «تسجيل النتيجة»، ثم أدخل أسماء مسجلي الأهداف في حقل الملاحظات.
          </p>

          {onSeedDemoScorers && (
            <div className="pt-2">
              <button
                onClick={onSeedDemoScorers}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs md:text-sm shadow-xl shadow-amber-500/20 hover:scale-105 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                تحميل عينة نتائج وأهداف نموذجية للتجربة فوراً
              </button>
            </div>
          )}
        </div>
      )}

      {/* Complete Rankings Table */}
      {scorers.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></span>
              <h3 className="font-black text-white text-base">جدول ترتيب الهدافين الكامل</h3>
              <span className="text-xs text-slate-400">({filteredScorers.length} لاعب معروض)</span>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              المتصدر: {topScorer ? `${topScorer.name} (${topScorer.totalGoals} أهداف)` : '—'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs md:text-sm">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3 px-4 text-center">الترتيب</th>
                  <th className="py-3 px-4">اسم اللاعب</th>
                  <th className="py-3 px-3">الفريق</th>
                  <th className="py-3 px-3 text-center">عدد المباريات المسجل بها</th>
                  <th className="py-3 px-3 text-center">المراحل</th>
                  <th className="py-3 px-4 text-center font-black text-amber-400 text-sm">مجموع الأهداف ⚽</th>
                  <th className="py-3 px-4 text-center">تفاصيل الأهداف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredScorers.map((player, idx) => {
                  const rank = idx + 1;
                  const isTopThree = rank <= 3;
                  const isExpanded = expandedPlayerName === player.name;

                  return (
                    <React.Fragment key={player.normalizedName}>
                      <tr
                        className={`transition-colors ${
                          rank === 1
                            ? 'bg-amber-500/10 hover:bg-amber-500/15 border-r-4 border-r-amber-400'
                            : rank === 2
                            ? 'bg-slate-400/5 hover:bg-slate-400/10 border-r-4 border-r-slate-300'
                            : rank === 3
                            ? 'bg-amber-700/5 hover:bg-amber-700/10 border-r-4 border-r-amber-600'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs ${
                              rank === 1
                                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                                : rank === 2
                                ? 'bg-slate-300 text-slate-950 shadow-sm'
                                : rank === 3
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                          </span>
                        </td>

                        {/* Player Name */}
                        <td className="py-3.5 px-4 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm">{player.name}</span>
                            {rank === 1 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                متصدر الهدافين
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Team */}
                        <td className="py-3.5 px-3">
                          <button
                            onClick={() => onSelectTeam(player.team)}
                            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-emerald-300 font-medium transition-colors cursor-pointer group"
                            title={`عرض مباريات فريق ${player.team}`}
                          >
                            <TeamLogo teamName={player.team} size="xs" />
                            <span className="group-hover:underline underline-offset-4">{player.team}</span>
                          </button>
                        </td>

                        {/* Matches Played with Goals */}
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-300">
                          {player.matchesPlayedWithGoals}
                        </td>

                        {/* Stages */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {player.stages.slice(0, 2).map((st, sIdx) => (
                              <span key={sIdx} className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-medium">
                                {st}
                              </span>
                            ))}
                            {player.stages.length > 2 && (
                              <span className="text-[10px] text-slate-500">+{player.stages.length - 2}</span>
                            )}
                          </div>
                        </td>

                        {/* Total Goals */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center px-3.5 py-1 rounded-xl font-mono font-black text-base ${
                              rank === 1
                                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                                : rank <= 3
                                ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-950 text-emerald-400 border border-slate-800'
                            }`}
                          >
                            {player.totalGoals}
                          </span>
                        </td>

                        {/* Expandable Goals Details Button */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setExpandedPlayerName(isExpanded ? null : player.name)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <span>تفاصيل الأهداف ({player.goalsBreakdown.length})</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Row: Goal Breakdown */}
                      {isExpanded && (
                        <tr className="bg-slate-950/90 border-b border-slate-800">
                          <td colSpan={7} className="p-4">
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                                  <Flame className="w-4 h-4 text-amber-400" />
                                  سجل أهداف {player.name} بالتفصيل:
                                </span>
                                <span className="text-slate-400">
                                  مجموع: <strong className="text-white">{player.totalGoals}</strong> أهداف في <strong className="text-white">{player.matchesPlayedWithGoals}</strong> مباريات
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {player.goalsBreakdown.map((g, gIdx) => {
                                  const matchingMatch = matches.find(m => m.id === g.matchId);

                                  return (
                                    <div
                                      key={gIdx}
                                      className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                                    >
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-white">{g.stageName}</span>
                                          <span className="text-[10px] text-slate-400">ضد {g.opponent}</span>
                                        </div>
                                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                          <span className="text-emerald-400 font-mono font-bold">النتيجة: {g.matchScore}</span>
                                          {g.minuteDetails && (
                                            <span className="text-amber-300 font-mono">({g.minuteDetails})</span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-black text-xs border border-amber-500/30">
                                          +{g.goalsCount} {g.goalsCount > 1 ? 'أهداف' : 'هدف'}
                                        </span>

                                        {matchingMatch && (
                                          <button
                                            onClick={() => onOpenRecordResult(matchingMatch)}
                                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                            title="فتح تفاصيل هذه المباراة"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
