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
  Zap,
  HelpCircle,
  TrendingUp,
  Info
} from 'lucide-react';
import { Match, Team } from '../App';
import { calculateTournamentStatsLeaders, PlayerScorer, PlayerPlaymaker, PlayerContribution } from '../utils/scorers';

interface StatsLeadersPageProps {
  matches: Match[];
  teams: Team[];
  onOpenRecordResult: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  onSeedDemoStats?: () => void;
}

export const StatsLeadersPage: React.FC<StatsLeadersPageProps> = ({
  matches,
  teams,
  onOpenRecordResult,
  onSelectTeam,
  onSeedDemoStats,
}) => {
  const [activeTab, setActiveTab] = useState<'scorers' | 'playmakers' | 'combined'>('scorers');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  const [expandedPlayerName, setExpandedPlayerName] = useState<string | null>(null);

  // Compute all leader stats
  const { 
    scorers, 
    playmakers, 
    contributors, 
    totalTournamentGoals, 
    totalTournamentAssists, 
    totalMatchesWithScorers 
  } = useMemo(() => {
    return calculateTournamentStatsLeaders(matches, teams);
  }, [matches, teams]);

  // Unique teams list among players with stats
  const teamsWithStats = useMemo(() => {
    const set = new Set<string>();
    scorers.forEach(s => s.team && set.add(s.team));
    playmakers.forEach(p => p.team && set.add(p.team));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [scorers, playmakers]);

  // Filtered lists
  const filteredScorers = useMemo(() => {
    return scorers.filter(p => {
      if (selectedTeamFilter !== 'all' && p.team !== selectedTeamFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.team.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [scorers, selectedTeamFilter, searchQuery]);

  const filteredPlaymakers = useMemo(() => {
    return playmakers.filter(p => {
      if (selectedTeamFilter !== 'all' && p.team !== selectedTeamFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.team.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [playmakers, selectedTeamFilter, searchQuery]);

  const filteredContributors = useMemo(() => {
    return contributors.filter(p => {
      if (selectedTeamFilter !== 'all' && p.team !== selectedTeamFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.team.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [contributors, selectedTeamFilter, searchQuery]);

  const topScorer = scorers[0] || null;
  const topPlaymaker = playmakers[0] || null;

  return (
    <div className="space-y-6">
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-teal-950/60 border border-amber-500/30 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-2 border border-amber-500/30">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            جوائز النجوم • الحذاء الذهبي وصانع الألعاب
          </div>
          <h2 className="text-xl md:text-3xl font-black text-white mb-2 flex items-center gap-2.5">
            <span>الهداف وصناعة اللعب</span>
            <span className="text-amber-400">⚽🎯</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
            الترتيب الرسمي لهدافي البطولة وصناع الألعاب (الأسيست والتمريرات الحاسمة) والمساهمات التهديفية الإجمالية في دوري جامعة النيل 2026.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {scorers.length === 0 && onSeedDemoStats && (
            <button
              onClick={onSeedDemoStats}
              className="px-4 py-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 font-bold text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg"
              title="تحميل عينة نتائج وأهداف وأسيست نموذجية"
            >
              <Sparkles className="w-4 h-4" />
              تحميل عينة أهداف وصناعة لعب للتجربة
            </button>
          )}

          {/* Tab Pill Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => { setActiveTab('scorers'); setExpandedPlayerName(null); }}
              className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'scorers'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-4 h-4" />
              الهدافون ({scorers.length})
            </button>

            <button
              onClick={() => { setActiveTab('playmakers'); setExpandedPlayerName(null); }}
              className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'playmakers'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target className="w-4 h-4" />
              صناع اللعب ({playmakers.length})
            </button>

            <button
              onClick={() => { setActiveTab('combined'); setExpandedPlayerName(null); }}
              className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'combined'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              الأكثر مساهمة ({contributors.length})
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>إجمالي الأهداف</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-white font-mono">
            {totalTournamentGoals}
            <span className="text-xs font-sans text-amber-400 font-normal mr-1.5">هدفاً</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">سجلها {scorers.length} لاعبين</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>إجمالي صناعة اللعب</span>
            <Target className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-white font-mono">
            {totalTournamentAssists}
            <span className="text-xs font-sans text-teal-400 font-normal mr-1.5">أسيست</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">صنعها {playmakers.length} صانع ألعاب</span>
        </div>

        <div className="bg-gradient-to-tr from-amber-950/40 to-slate-900 border border-amber-500/30 p-4 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-300 text-xs mb-1">
            <span>الهدّاف الأول (الحذاء الذهبي)</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg md:text-xl font-black text-amber-300 truncate">
            {topScorer ? topScorer.name : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {topScorer ? `${topScorer.totalGoals} أهداف • ${topScorer.team}` : 'بانتظار التسجيل'}
          </div>
        </div>

        <div className="bg-gradient-to-tr from-teal-950/40 to-slate-900 border border-teal-500/30 p-4 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-teal-300 text-xs mb-1">
            <span>أفضل صانع ألعاب (الأكثر أسيست)</span>
            <Zap className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-lg md:text-xl font-black text-teal-300 truncate">
            {topPlaymaker ? topPlaymaker.name : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {topPlaymaker ? `${topPlaymaker.totalAssists} تمريرات حاسمة • ${topPlaymaker.team}` : 'بانتظار التسجيل'}
          </div>
        </div>
      </div>

      {/* Search & Team Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="text"
            placeholder="ابحث عن اسم لاعب أو فريق..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 pr-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        {teamsWithStats.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold">تصفية بالفريق:</span>
            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">كل الفرق</option>
              {teamsWithStats.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Guide Note Box */}
      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-200">
            💡 كيف تسجل الأهداف وصناعة اللعب (الأسيست)؟
          </p>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            عند الضغط على <strong className="text-emerald-300">«تسجيل النتيجة»</strong> لأي مباراة، اكتب أسماء المسجلين وصناع اللعب في الملاحظات (مثال: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">محمد صلاح (2 هدف)، مرموش (1 أسيست)</code> أو <code className="bg-slate-900 px-1.5 py-0.5 rounded text-teal-300">ميسي (صناعة هدفين)</code>) وسيتم تصنيفهم وتحديث ترتيب الهدافين وصناع اللعب آلياً!
          </p>
        </div>
      </div>

      {/* SECTION 1: TOP SCORERS TABLE */}
      {activeTab === 'scorers' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h3 className="font-black text-white text-base">قائمة هدافي البطولة (الحذاء الذهبي)</h3>
              <span className="text-xs text-slate-400">({filteredScorers.length} هداف)</span>
            </div>
            {topScorer && (
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                المتصدر: {topScorer.name} ({topScorer.totalGoals} أهداف)
              </span>
            )}
          </div>

          {filteredScorers.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              لا توجد أهداف مسجلة بعد في البطولة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs md:text-sm">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4 text-center">المركز</th>
                    <th className="py-3 px-4">اسم اللاعب</th>
                    <th className="py-3 px-3">الفريق</th>
                    <th className="py-3 px-3 text-center">المباريات</th>
                    <th className="py-3 px-4 text-center font-black text-amber-400 text-sm">عدد الأهداف ⚽</th>
                    <th className="py-3 px-4 text-center">تفاصيل الأهداف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredScorers.map((player, idx) => {
                    const rank = idx + 1;
                    const isExpanded = expandedPlayerName === player.name;

                    return (
                      <React.Fragment key={player.normalizedName}>
                        <tr className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs ${
                              rank === 1 ? 'bg-amber-400 text-slate-950 font-black shadow' :
                              rank === 2 ? 'bg-slate-300 text-slate-950' :
                              rank === 3 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">
                            {player.name}
                          </td>
                          <td className="py-3.5 px-3">
                            <button
                              onClick={() => onSelectTeam(player.team)}
                              className="text-slate-300 hover:text-emerald-300 hover:underline cursor-pointer"
                            >
                              {player.team}
                            </button>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                            {player.matchesPlayedWithGoals}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-black text-base text-amber-400">
                            {player.totalGoals}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => setExpandedPlayerName(isExpanded ? null : player.name)}
                              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>التفاصيل ({player.goalsBreakdown.length})</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-950/80">
                            <td colSpan={6} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {player.goalsBreakdown.map((g, gIdx) => (
                                  <div key={gIdx} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                                    <div>
                                      <span className="font-bold text-white block">{g.stageName} ضد {g.opponent}</span>
                                      <span className="text-[11px] text-slate-400">النتيجة: {g.matchScore} {g.minuteDetails ? `(${g.minuteDetails})` : ''}</span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold font-mono">
                                      +{g.goalsCount} هدف
                                    </span>
                                  </div>
                                ))}
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
          )}
        </div>
      )}

      {/* SECTION 2: TOP PLAYMAKERS / ASSISTS TABLE */}
      {activeTab === 'playmakers' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-teal-400" />
              <h3 className="font-black text-white text-base">صناع اللعب (الأكثر أسيست وتمريرات حاسمة)</h3>
              <span className="text-xs text-slate-400">({filteredPlaymakers.length} صانع ألعاب)</span>
            </div>
            {topPlaymaker && (
              <span className="text-xs font-bold text-teal-300 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                المتصدر: {topPlaymaker.name} ({topPlaymaker.totalAssists} أسيست)
              </span>
            )}
          </div>

          {filteredPlaymakers.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <p>لم يتم توثيق أي تمريرات حاسمة (أسيست) بعد.</p>
              <p className="text-[11px] text-slate-500">
                يمكنك كتابة اسم صانع الهدف في ملاحظات المباراة مثل: «ميسي (أسيست)» أو «مرموش (صناعة هدف)».
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs md:text-sm">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4 text-center">المركز</th>
                    <th className="py-3 px-4">اسم اللاعب</th>
                    <th className="py-3 px-3">الفريق</th>
                    <th className="py-3 px-3 text-center">المباريات</th>
                    <th className="py-3 px-4 text-center font-black text-teal-300 text-sm">صناعة الأهداف (أسيست) 🎯</th>
                    <th className="py-3 px-4 text-center">تفاصيل الصناعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredPlaymakers.map((player, idx) => {
                    const rank = idx + 1;
                    const isExpanded = expandedPlayerName === player.name;

                    return (
                      <React.Fragment key={player.normalizedName}>
                        <tr className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs ${
                              rank === 1 ? 'bg-teal-400 text-slate-950 font-black shadow' :
                              rank === 2 ? 'bg-slate-300 text-slate-950' :
                              rank === 3 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">
                            {player.name}
                          </td>
                          <td className="py-3.5 px-3">
                            <button
                              onClick={() => onSelectTeam(player.team)}
                              className="text-slate-300 hover:text-teal-300 hover:underline cursor-pointer"
                            >
                              {player.team}
                            </button>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                            {player.matchesPlayedWithAssists}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-black text-base text-teal-300">
                            {player.totalAssists}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => setExpandedPlayerName(isExpanded ? null : player.name)}
                              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>التفاصيل ({player.assistsBreakdown.length})</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-950/80">
                            <td colSpan={6} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {player.assistsBreakdown.map((a, aIdx) => (
                                  <div key={aIdx} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                                    <div>
                                      <span className="font-bold text-white block">{a.stageName} ضد {a.opponent}</span>
                                      <span className="text-[11px] text-slate-400">التاريخ: {a.date}</span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold font-mono">
                                      +{a.assistsCount} أسيست
                                    </span>
                                  </div>
                                ))}
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
          )}
        </div>
      )}

      {/* SECTION 3: COMBINED CONTRIBUTIONS (GOALS + ASSISTS) */}
      {activeTab === 'combined' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="font-black text-white text-base">الأكثر مساهمة هجومية (أهداف + صناعة اللعب)</h3>
              <span className="text-xs text-slate-400">({filteredContributors.length} لاعب مساهم)</span>
            </div>
          </div>

          {filteredContributors.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              لا توجد مساهمات هجومية مسجلة بعد
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs md:text-sm">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4 text-center">المركز</th>
                    <th className="py-3 px-4">اسم اللاعب</th>
                    <th className="py-3 px-3">الفريق</th>
                    <th className="py-3 px-3 text-center text-amber-400">الأهداف ⚽</th>
                    <th className="py-3 px-3 text-center text-teal-300">الأسيست 🎯</th>
                    <th className="py-3 px-4 text-center font-black text-emerald-400 text-sm">إجمالي المساهمات (أهداف + أسيست) 🔥</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredContributors.map((player, idx) => {
                    const rank = idx + 1;

                    return (
                      <tr key={player.normalizedName} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs ${
                            rank === 1 ? 'bg-emerald-400 text-slate-950 font-black shadow' :
                            rank === 2 ? 'bg-slate-300 text-slate-950' :
                            rank === 3 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          {player.name}
                        </td>
                        <td className="py-3.5 px-3">
                          <button
                            onClick={() => onSelectTeam(player.team)}
                            className="text-slate-300 hover:text-emerald-300 hover:underline cursor-pointer"
                          >
                            {player.team}
                          </button>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-amber-400">
                          {player.totalGoals}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-teal-300">
                          {player.totalAssists}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-black text-base text-emerald-400">
                          {player.totalContributions}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
