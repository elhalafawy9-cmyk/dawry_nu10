import React, { useState, useMemo } from 'react';
import { 
  Vote, 
  CheckCircle2, 
  Clock, 
  Trophy, 
  Users, 
  Sparkles, 
  Flame, 
  Target, 
  TrendingUp, 
  Calendar, 
  MapPin, 
  Search, 
  Filter, 
  Medal, 
  HelpCircle, 
  BarChart3,
  Award,
  ChevronRight,
  ShieldAlert,
  RotateCcw,
  Lock,
  History,
  Shield
} from 'lucide-react';
import { Match, Team } from '../App';
import { AppUser } from '../utils/auth';
import { 
  MatchVoteOption, 
  MatchVoteSummary, 
  getInitialCommunityVotes, 
  loadUserVotes, 
  recordUserVote, 
  calculateMatchVoteSummary, 
  calculateUserPredictionStats, 
  getMatchVotingState,
  SAMPLE_PREDICTORS_LEADERBOARD, 
  PredictorLeaderboardEntry 
} from '../utils/predictions';

interface MatchPredictionsPageProps {
  currentUser: AppUser | null;
  matches: Match[];
  teams: Team[];
  onNavigateToMatchesSchedule?: () => void;
}

export const MatchPredictionsPage: React.FC<MatchPredictionsPageProps> = ({
  currentUser,
  matches,
  teams,
  onNavigateToMatchesSchedule,
}) => {
  const userId = currentUser?.id || 'guest_voter';

  // Subpage navigation: 'voting' (المباريات والتصويت) | 'standings' (المراكز والترتيب) | 'history' (سجل تصويتاتي)
  const [activeSubTab, setActiveSubTab] = useState<'voting' | 'standings' | 'history'>('voting');
  const [standingsSubView, setStandingsSubView] = useState<'predictors' | 'tournament_groups'>('predictors');

  // State: Community vote counts
  const [communityVotes, setCommunityVotes] = useState<Record<string, { teamA: number; draw: number; teamB: number }>>(() => {
    return getInitialCommunityVotes(matches);
  });

  // State: User personal votes
  const [userVotes, setUserVotes] = useState<Record<string, MatchVoteOption>>(() => {
    return loadUserVotes(userId);
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'finished'>('open');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroupStandings, setSelectedGroupStandings] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // User Prediction Stats
  const userStats = useMemo(() => {
    return calculateUserPredictionStats(matches, userVotes);
  }, [matches, userVotes]);

  // Handle Casting a Vote (strictly allowed only before kickoff)
  const handleVote = (match: Match, option: MatchVoteOption) => {
    const votingState = getMatchVotingState(match);
    if (!votingState.isOpen) {
      showToast(`التصويت مغلق لهذه المباراة: ${votingState.closeNotice}`);
      return;
    }

    const { userVotes: updatedUserVotes, communityVotes: updatedCommunity } = recordUserVote(
      userId,
      match.id,
      option,
      communityVotes
    );

    setUserVotes(updatedUserVotes);
    setCommunityVotes(updatedCommunity);

    const label = option === 'teamA' ? `فوز ${match.teamA}` : option === 'draw' ? 'التعادل' : `فوز ${match.teamB}`;
    showToast(`تم تسجيل تصويتك: ${label} بنجاح 🗳️`);
  };

  // Filtered Matches
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      const vState = getMatchVotingState(m);

      // Status filter
      if (statusFilter === 'open') {
        if (!vState.isOpen) return false;
      } else if (statusFilter === 'finished') {
        if (m.status !== 'finished') return false;
      }

      // Group filter
      if (groupFilter !== 'all') {
        if (m.group !== groupFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchA = m.teamA.toLowerCase().includes(q);
        const matchB = m.teamB.toLowerCase().includes(q);
        const matchGroup = (m.group || '').toLowerCase().includes(q);
        if (!matchA && !matchB && !matchGroup) return false;
      }

      return true;
    }).sort((a, b) => {
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (b.status === 'live' && a.status !== 'live') return 1;
      if (a.status !== 'finished' && b.status === 'finished') return -1;
      if (b.status !== 'finished' && a.status === 'finished') return 1;
      return (a.round || 1) - (b.round || 1);
    });
  }, [matches, statusFilter, groupFilter, searchQuery]);

  // Unique groups for filter
  const groupsList = useMemo(() => {
    const set = new Set<string>();
    matches.forEach(m => {
      if (m.group) set.add(m.group);
    });
    return Array.from(set).sort();
  }, [matches]);

  // Predictor Leaderboard with current user
  const leaderboard: PredictorLeaderboardEntry[] = useMemo(() => {
    const userEntry: PredictorLeaderboardEntry = {
      rank: 0,
      userId,
      name: `${currentUser?.name || 'أنت (المتوقع)'}`,
      email: currentUser?.email || 'student@nu.edu.eg',
      faculty: currentUser?.playerTeamName || currentUser?.managedTeamName || 'جامعة النيل الأهلية',
      totalVotes: userStats.totalVotes,
      correctVotes: userStats.correctVotes,
      accuracyPct: userStats.accuracyPct,
      points: userStats.totalPoints,
    };

    const rivals = SAMPLE_PREDICTORS_LEADERBOARD.filter(r => r.userId !== userId);
    const combined = [userEntry, ...rivals].sort((a, b) => b.points - a.points || b.accuracyPct - a.accuracyPct);

    return combined.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));
  }, [userId, currentUser, userStats]);

  const userRank = leaderboard.find(e => e.userId === userId)?.rank || 1;

  // Group Standings map for tournament teams
  const groupedTeams = useMemo(() => {
    const map: Record<string, Team[]> = {};
    teams.forEach(t => {
      const g = t.group || 'A';
      if (!map[g]) map[g] = [];
      map[g].push(t);
    });

    Object.keys(map).forEach(g => {
      map[g].sort((a, b) => (b.points || 0) - (a.points || 0) || (b.gd || 0) - (a.gd || 0) || (b.gf || 0) - (a.gf || 0));
    });

    return map;
  }, [teams]);

  // Matches where user voted
  const userVotedMatches = useMemo(() => {
    return matches.filter(m => !!userVotes[m.id]);
  }, [matches, userVotes]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-black px-5 py-3 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-3 animate-slideUp">
          <Vote className="w-5 h-5 text-amber-300 animate-bounce" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-[#071d3a] to-slate-900 border border-blue-500/30 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
            <Vote className="w-3.5 h-3.5 text-blue-400" />
            <span>توقعات وتصويت الجماهير والطلاب 🗳️</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <span>توقعات المباريات (تصويت فقط)</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black">
              يغلق عند موعد المباراة
            </span>
          </h1>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            صوّت للفائز في كل مباراة (فوز فريق أ - تعادل - فوز فريق ب).
            <strong className="text-amber-300 mx-1">يبقى التصويت مفتوحاً حتى موعد انطلاق المباراة بالضبط</strong> ثم يُقفل تلقائياً،
            ويمكنك متابعة جدول المراكز وترتيب أفضل المتوقعين ومراكز الفرق بالجامعة!
          </p>
        </div>

        {/* User Stats Card */}
        <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-4 md:p-5 shadow-xl flex flex-col gap-3 min-w-[270px] w-full md:w-auto">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="text-[11px] text-slate-400 font-bold">ملف المتوقع:</div>
              <div className="text-sm font-black text-white">{currentUser?.name || 'مشارك بالتصويت'}</div>
              <div className="text-[11px] text-blue-400 font-semibold">المركز الجامعي: #{userRank}</div>
            </div>
            <button
              onClick={() => setActiveSubTab('standings')}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-black flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>المراكز</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold">أصواتك</div>
              <div className="text-base font-black text-white">{userStats.totalVotes}</div>
            </div>
            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold">صحيحة 🎯</div>
              <div className="text-base font-black text-emerald-400">{userStats.correctVotes}</div>
            </div>
            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold">النقاط</div>
              <div className="text-base font-black text-amber-400">{userStats.totalPoints}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Subpage Navigation Tabs */}
      <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab 1: Matches & Voting */}
          <button
            onClick={() => setActiveSubTab('voting')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'voting'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Vote className="w-4 h-4 text-blue-300" />
            <span>المباريات والتصويت 🗳️</span>
          </button>

          {/* Tab 2: Standings & Rankings (صفحة المراكز) */}
          <button
            onClick={() => setActiveSubTab('standings')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'standings'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30 font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>جدول المراكز والترتيب 🏆</span>
          </button>

          {/* Tab 3: My Prediction History */}
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <History className="w-4 h-4 text-emerald-300" />
            <span>سجل تصويتاتي ({userStats.totalVotes}) 📋</span>
          </button>
        </div>

        {/* Voting Deadline Notice */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>يُقفل التصويت تلقائياً فور حلول موعد انطلاق كل مباراة ⏱️</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SUBPAGE 1: MATCHES & VOTING (المباريات والتصويت) */}
      {/* ============================================================== */}
      {activeSubTab === 'voting' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Status filter tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setStatusFilter('open')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  statusFilter === 'open'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-blue-300" />
                <span>مفتوح للتصويت الآن</span>
                <span className="px-1.5 py-0.2 rounded-full bg-blue-950 text-blue-300 text-[10px] border border-blue-500/30">
                  {matches.filter(m => getMatchVotingState(m).isOpen).length}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('finished')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  statusFilter === 'finished'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>المباريات المنتهية والنتائج</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 text-[10px] border border-emerald-500/30">
                  {matches.filter(m => m.status === 'finished').length}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-slate-800 text-white font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                جميع المباريات ({matches.length})
              </button>
            </div>

            {/* Group Filter & Search */}
            <div className="flex items-center gap-2">
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="all">جميع المجموعات والأدوار</option>
                {groupsList.map(g => (
                  <option key={g} value={g}>المجموعة {g}</option>
                ))}
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالفريق..."
                  className="pl-3 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 w-36 md:w-48"
                />
              </div>
            </div>
          </div>

          {/* Matches Voting List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMatches.map(match => {
              const voteSummary = calculateMatchVoteSummary(match.id, communityVotes);
              const userVote = userVotes[match.id];
              const isFinished = match.status === 'finished';
              const votingState = getMatchVotingState(match);

              // Determine outcome if finished
              let actualOutcome: MatchVoteOption = 'draw';
              if (isFinished) {
                const sA = match.scoreA ?? 0;
                const sB = match.scoreB ?? 0;
                if (sA > sB) actualOutcome = 'teamA';
                else if (sB > sA) actualOutcome = 'teamB';
              }

              const isUserCorrect = isFinished && userVote && userVote === actualOutcome;

              return (
                <div
                  key={match.id}
                  className={`bg-slate-900 border rounded-3xl p-5 shadow-xl transition-all flex flex-col justify-between gap-4 ${
                    match.status === 'live'
                      ? 'border-rose-500/60 ring-2 ring-rose-500/20'
                      : !votingState.isOpen && !isFinished
                      ? 'border-amber-500/40 bg-slate-900/80'
                      : isFinished
                      ? 'border-slate-800/80 bg-slate-900/70'
                      : 'border-slate-800 hover:border-blue-500/40'
                  }`}
                >
                  {/* Match Header info */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-3 pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 font-bold text-[10px] border border-blue-500/20">
                          {match.group ? `المجموعة ${match.group}` : 'مباراة إقصائية'}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          الجولة {match.round || 1}
                        </span>
                      </div>

                      {/* Voting State Badge */}
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${votingState.badgeColorClass}`}>
                          {votingState.isOpen ? (
                            <Clock className="w-3 h-3 text-emerald-300 animate-pulse" />
                          ) : (
                            <Lock className="w-3 h-3" />
                          )}
                          <span>{votingState.statusBadgeText}</span>
                        </span>
                      </div>
                    </div>

                    {/* Teams VS Display */}
                    <div className="flex items-center justify-between gap-2 py-1">
                      {/* Team A */}
                      <div className="flex-1 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm flex items-center justify-center mx-auto shadow-md mb-1.5">
                          {match.teamA.slice(0, 2)}
                        </div>
                        <div className="text-sm font-black text-white truncate px-1" title={match.teamA}>
                          {match.teamA}
                        </div>
                        {isFinished && (
                          <div className="text-xl font-black text-amber-400 mt-0.5">
                            {match.scoreA ?? 0}
                          </div>
                        )}
                      </div>

                      {/* VS or Score Divider */}
                      <div className="shrink-0 px-2 text-center">
                        {isFinished ? (
                          <span className="px-2.5 py-1 rounded-xl bg-slate-950 text-slate-400 font-black text-xs border border-slate-800">
                            النتيجة النهائية
                          </span>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              VS
                            </span>
                            {match.date && (
                              <span className="text-[10px] text-slate-400 mt-1 font-mono">
                                {match.time || '18:00'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Team B */}
                      <div className="flex-1 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-sm flex items-center justify-center mx-auto shadow-md mb-1.5">
                          {match.teamB.slice(0, 2)}
                        </div>
                        <div className="text-sm font-black text-white truncate px-1" title={match.teamB}>
                          {match.teamB}
                        </div>
                        {isFinished && (
                          <div className="text-xl font-black text-amber-400 mt-0.5">
                            {match.scoreB ?? 0}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Match Date & Pitch */}
                    {(match.date || match.pitch) && (
                      <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 mt-2">
                        {match.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>{match.date}</span>
                          </span>
                        )}
                        {match.pitch && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>{match.pitch}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Voting Section (The 3 Poll Buttons) */}
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                      <span>
                        {votingState.isOpen 
                          ? 'من سيفوز بالمباراة؟ (صوّت قبل بداية المباراة)' 
                          : 'التصويت مغلق لهذه المباراة'}
                      </span>
                      <span className="text-slate-500 font-mono text-[10px]">
                        {voteSummary.totalVotes} صوت
                      </span>
                    </div>

                    {/* 3 Voting Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Button 1: Team A Wins */}
                      <button
                        disabled={!votingState.isOpen}
                        onClick={() => handleVote(match, 'teamA')}
                        title={!votingState.isOpen ? votingState.closeNotice : `صوّت لفوز ${match.teamA}`}
                        className={`p-2.5 rounded-2xl flex flex-col items-center justify-between transition-all ${
                          userVote === 'teamA'
                            ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-600/30 ring-2 ring-blue-400 cursor-pointer'
                            : !votingState.isOpen
                            ? 'bg-slate-950/60 text-slate-500 border border-slate-800/80 cursor-not-allowed opacity-70'
                            : 'bg-slate-950 hover:bg-blue-950/60 text-slate-300 hover:text-blue-200 border border-slate-800 hover:border-blue-500/40 cursor-pointer'
                        }`}
                      >
                        <span className="text-xs font-bold truncate max-w-full">
                          فوز {match.teamA.split(' ')[0]}
                        </span>
                        <span className="text-sm font-black mt-1">
                          {voteSummary.pctA}%
                        </span>
                        {userVote === 'teamA' && (
                          <span className="text-[9px] bg-white text-blue-900 font-black px-1.5 py-0.2 rounded-full mt-1">
                            تصويتك ✓
                          </span>
                        )}
                      </button>

                      {/* Button 2: Draw */}
                      <button
                        disabled={!votingState.isOpen}
                        onClick={() => handleVote(match, 'draw')}
                        title={!votingState.isOpen ? votingState.closeNotice : 'صوّت للتعادل'}
                        className={`p-2.5 rounded-2xl flex flex-col items-center justify-between transition-all ${
                          userVote === 'draw'
                            ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30 ring-2 ring-amber-300 cursor-pointer'
                            : !votingState.isOpen
                            ? 'bg-slate-950/60 text-slate-500 border border-slate-800/80 cursor-not-allowed opacity-70'
                            : 'bg-slate-950 hover:bg-amber-950/60 text-slate-300 hover:text-amber-200 border border-slate-800 hover:border-amber-500/40 cursor-pointer'
                        }`}
                      >
                        <span className="text-xs font-bold">
                          تعادل 🤝
                        </span>
                        <span className="text-sm font-black mt-1">
                          {voteSummary.pctDraw}%
                        </span>
                        {userVote === 'draw' && (
                          <span className="text-[9px] bg-slate-950 text-amber-300 font-black px-1.5 py-0.2 rounded-full mt-1">
                            تصويتك ✓
                          </span>
                        )}
                      </button>

                      {/* Button 3: Team B Wins */}
                      <button
                        disabled={!votingState.isOpen}
                        onClick={() => handleVote(match, 'teamB')}
                        title={!votingState.isOpen ? votingState.closeNotice : `صوّت لفوز ${match.teamB}`}
                        className={`p-2.5 rounded-2xl flex flex-col items-center justify-between transition-all ${
                          userVote === 'teamB'
                            ? 'bg-emerald-600 text-white font-black shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400 cursor-pointer'
                            : !votingState.isOpen
                            ? 'bg-slate-950/60 text-slate-500 border border-slate-800/80 cursor-not-allowed opacity-70'
                            : 'bg-slate-950 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-200 border border-slate-800 hover:border-emerald-500/40 cursor-pointer'
                        }`}
                      >
                        <span className="text-xs font-bold truncate max-w-full">
                          فوز {match.teamB.split(' ')[0]}
                        </span>
                        <span className="text-sm font-black mt-1">
                          {voteSummary.pctB}%
                        </span>
                        {userVote === 'teamB' && (
                          <span className="text-[9px] bg-white text-emerald-900 font-black px-1.5 py-0.2 rounded-full mt-1">
                            تصويتك ✓
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Visual Segmented Percentage Bar */}
                    <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-950 border border-slate-800">
                      <div
                        style={{ width: `${voteSummary.pctA}%` }}
                        className="bg-blue-500 transition-all duration-500"
                        title={`${match.teamA}: ${voteSummary.pctA}%`}
                      ></div>
                      <div
                        style={{ width: `${voteSummary.pctDraw}%` }}
                        className="bg-amber-400 transition-all duration-500"
                        title={`تعادل: ${voteSummary.pctDraw}%`}
                      ></div>
                      <div
                        style={{ width: `${voteSummary.pctB}%` }}
                        className="bg-emerald-500 transition-all duration-500"
                        title={`${match.teamB}: ${voteSummary.pctB}%`}
                      ></div>
                    </div>

                    {/* Notice if voting is closed before kickoff */}
                    {!votingState.isOpen && !isFinished && (
                      <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{votingState.closeNotice}</span>
                        </div>
                        {userVote && (
                          <span className="text-[10px] font-bold bg-amber-500/20 px-2 py-0.5 rounded-full">
                            تم اعتماد تصويتك مسبقاً
                          </span>
                        )}
                      </div>
                    )}

                    {/* If Finished: Result Banner */}
                    {isFinished && (
                      <div className={`p-2.5 rounded-2xl text-xs font-bold flex items-center justify-between ${
                        isUserCorrect
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : userVote
                          ? 'bg-slate-950 text-slate-400 border border-slate-800'
                          : 'bg-slate-950 text-slate-500 border border-slate-800'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          {isUserCorrect ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>🎯 توقعك كان صحيحاً! (+3 نقاط)</span>
                            </>
                          ) : userVote ? (
                            <span>لم يحالفك الحظ في هذا التوقع</span>
                          ) : (
                            <span>لم تشارك بالتصويت في هذا الماتش</span>
                          )}
                        </div>

                        <div className="text-[11px] font-bold text-amber-300">
                          {actualOutcome === 'teamA' ? `فوز ${match.teamA}` : actualOutcome === 'draw' ? 'تعادل' : `فوز ${match.teamB}`}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

          {filteredMatches.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <Vote className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-300">لا توجد مباريات تطابق شروط التصفية الحالية</h4>
              <p className="text-xs text-slate-500">اختر تصفية أخرى أو ابحث باسم فريق آخر.</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBPAGE 2: STANDINGS & RANKINGS (صفحة المراكز والترتيب) */}
      {/* ============================================================== */}
      {activeSubTab === 'standings' && (
        <div className="space-y-6">
          {/* Sub-view switcher within المراكز */}
          <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-xl flex items-center gap-2">
            <button
              onClick={() => setStandingsSubView('predictors')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                standingsSubView === 'predictors'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Medal className="w-4 h-4" />
              <span>مراكز وترتيب المتوقعين 🏅</span>
            </button>

            <button
              onClick={() => setStandingsSubView('tournament_groups')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                standingsSubView === 'tournament_groups'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>مراكز الفرق في المجموعات (48 فريقاً) 📊</span>
            </button>
          </div>

          {/* VIEW A: PREDICTORS STANDINGS */}
          {standingsSubView === 'predictors' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span>جدول مراكز وترتيب المتوقعين في دوري جامعة النيل 🏅</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    يحصل المتوقع على (+3 نقاط) عن كل تصويت صحيح للفائز أو التعادل في المباريات المنتهية
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">إجمالي المتوقعين:</span>
                  <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-black text-xs border border-blue-500/30">
                    {leaderboard.length} متوقعاً
                  </span>
                </div>
              </div>

              {/* Predictors Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-black text-slate-400">
                      <th className="py-3 px-3">المركز</th>
                      <th className="py-3 px-3">المتوقع</th>
                      <th className="py-3 px-3">الكلية / الفريق</th>
                      <th className="py-3 px-3 text-center">إجمالي الأصوات</th>
                      <th className="py-3 px-3 text-center">أصوات صحيحة</th>
                      <th className="py-3 px-3 text-center">نسبة الدقة %</th>
                      <th className="py-3 px-3 text-center">النقاط</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {leaderboard.map((entry) => {
                      const isUser = entry.userId === userId;
                      return (
                        <tr
                          key={entry.userId}
                          className={`transition-colors ${
                            isUser 
                              ? 'bg-blue-950/40 text-white font-black border-l-4 border-l-blue-400' 
                              : 'hover:bg-slate-800/40 text-slate-300'
                          }`}
                        >
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5">
                              {entry.rank === 1 && <span className="text-lg">🥇</span>}
                              {entry.rank === 2 && <span className="text-lg">🥈</span>}
                              {entry.rank === 3 && <span className="text-lg">🥉</span>}
                              {entry.rank > 3 && (
                                <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-black flex items-center justify-center">
                                  #{entry.rank}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-bold">
                            <div className="flex items-center gap-1.5">
                              <span className="text-white">{entry.name}</span>
                              {isUser && (
                                <span className="px-2 py-0.2 rounded-full bg-blue-500 text-white text-[10px] font-black">
                                  أنت
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">{entry.email}</div>
                          </td>

                          <td className="py-3.5 px-3 text-slate-400">
                            {entry.faculty}
                          </td>

                          <td className="py-3.5 px-3 text-center font-bold text-slate-300">
                            {entry.totalVotes}
                          </td>

                          <td className="py-3.5 px-3 text-center font-bold text-emerald-400">
                            {entry.correctVotes}
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-bold text-xs">
                              {entry.accuracyPct}%
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-center font-black text-base text-amber-400">
                            {entry.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW B: TOURNAMENT GROUPS STANDINGS (مراكز الفرق) */}
          {standingsSubView === 'tournament_groups' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div>
                  <h4 className="text-base font-black text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>مراكز الفرق في المجموعات (مرجع تحليلي للتصويت)</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    استعن بمراكز ونقاط وأهداف الفرق لتحسين دقة توقعاتك في المباريات القادمة!
                  </p>
                </div>

                <select
                  value={selectedGroupStandings}
                  onChange={(e) => setSelectedGroupStandings(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">عرض جميع المجموعات (A إلى L)</option>
                  {Object.keys(groupedTeams).sort().map(g => (
                    <option key={g} value={g}>المجموعة {g}</option>
                  ))}
                </select>
              </div>

              {/* Group Standings Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(groupedTeams)
                  .filter(([g]) => selectedGroupStandings === 'all' || g === selectedGroupStandings)
                  .map(([g, teamList]) => (
                    <div key={g} className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-black text-white flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                          <span>المجموعة {g}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">4 فرق</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead>
                            <tr className="text-[10px] text-slate-400 border-b border-slate-800 pb-1">
                              <th className="py-1 px-1">#</th>
                              <th className="py-1 px-1">الفريق</th>
                              <th className="py-1 px-1 text-center">لعب</th>
                              <th className="py-1 px-1 text-center">فاز</th>
                              <th className="py-1 px-1 text-center">تعادل</th>
                              <th className="py-1 px-1 text-center">خسر</th>
                              <th className="py-1 px-1 text-center">فارق</th>
                              <th className="py-1 px-1 text-center font-black text-amber-400">نقاط</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {teamList.map((t, idx) => (
                              <tr key={t.id} className={idx < 2 ? 'text-white font-bold' : 'text-slate-400'}>
                                <td className="py-1.5 px-1">{idx + 1}</td>
                                <td className="py-1.5 px-1 truncate max-w-[120px]">{t.name}</td>
                                <td className="py-1.5 px-1 text-center">{t.played}</td>
                                <td className="py-1.5 px-1 text-center">{t.won}</td>
                                <td className="py-1.5 px-1 text-center">{t.drawn}</td>
                                <td className="py-1.5 px-1 text-center">{t.lost}</td>
                                <td className="py-1.5 px-1 text-center font-mono">
                                  {(t.gd ?? 0) > 0 ? `+${t.gd}` : t.gd ?? 0}
                                </td>
                                <td className="py-1.5 px-1 text-center font-black text-amber-400">{t.points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBPAGE 3: MY VOTING HISTORY (سجل وتاريخ تصويتاتي) */}
      {/* ============================================================== */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-400" />
                  <span>سجل وتاريخ تصويتاتك في المباريات ({userVotedMatches.length})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  استعرض المباريات التي شاركت بالتصويت عليها وتأكد من النتائج والنقاط المكتسبة
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                  الصحيحة: <strong className="text-emerald-400">{userStats.correctVotes}</strong>
                </span>
                <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                  النقاط: <strong className="text-amber-400">+{userStats.totalPoints}</strong>
                </span>
              </div>
            </div>

            {userVotedMatches.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Vote className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm">لم تشارك بالتصويت في أي مباراة حتى الآن.</p>
                <button
                  onClick={() => setActiveSubTab('voting')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-lg"
                >
                  صوّت في مباريات اليوم ➔
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {userVotedMatches.map(m => {
                  const vote = userVotes[m.id];
                  const isFinished = m.status === 'finished';
                  let outcome: MatchVoteOption = 'draw';
                  if (isFinished) {
                    if ((m.scoreA ?? 0) > (m.scoreB ?? 0)) outcome = 'teamA';
                    else if ((m.scoreB ?? 0) > (m.scoreA ?? 0)) outcome = 'teamB';
                  }
                  const isCorrect = isFinished && vote === outcome;

                  return (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-white shrink-0">
                          {m.group ? `G${m.group}` : 'KO'}
                        </div>
                        <div>
                          <div className="font-black text-white text-sm">
                            {m.teamA} {isFinished ? `(${m.scoreA})` : ''} ضد {m.teamB} {isFinished ? `(${m.scoreB})` : ''}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {m.date || 'غير محدد'} • {m.time || '18:00'} • {m.pitch || 'الملعب الرئيسي'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="text-slate-400 text-[11px]">تصويتك:</span>
                        <span className="px-2.5 py-1 rounded-xl bg-blue-600/20 text-blue-300 font-black border border-blue-500/30">
                          {vote === 'teamA' ? `فوز ${m.teamA}` : vote === 'draw' ? 'التعادل 🤝' : `فوز ${m.teamB}`}
                        </span>

                        {isFinished && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isCorrect 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {isCorrect ? '🎯 صائب (+3)' : '❌ غير صائب'}
                          </span>
                        )}
                        {!isFinished && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                            بانتظار النتيجة
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
