import React, { useMemo } from 'react';
import { 
  Shirt, 
  Trophy, 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  Shield, 
  Star, 
  CheckCircle2, 
  AlertCircle,
  GraduationCap,
  Eye,
  ArrowRightLeft,
  Lock
} from 'lucide-react';
import { AppUser } from '../utils/auth';
import { Match, Team } from '../App';
import { Player } from '../utils/roster';

interface PlayerTeamPortalPageProps {
  currentUser: AppUser;
  teams: Team[];
  matches: Match[];
  squads: Record<string, Player[]>;
  onSelectTeamForMatches?: (teamName: string) => void;
  onNavigateToSpectatorPortal?: () => void;
  onNavigateToGroups?: () => void;
}

export const PlayerTeamPortalPage: React.FC<PlayerTeamPortalPageProps> = ({
  currentUser,
  teams,
  matches,
  squads,
  onSelectTeamForMatches,
  onNavigateToSpectatorPortal,
  onNavigateToGroups,
}) => {
  // Team name the player belongs to
  const playerTeamName = currentUser.playerTeamName || teams[0]?.name || 'برشلونة';

  const myTeam = useMemo(() => {
    return teams.find(t => t.name === playerTeamName) || teams[0];
  }, [teams, playerTeamName]);

  const mySquad = useMemo(() => {
    return squads[playerTeamName] || [];
  }, [squads, playerTeamName]);

  // Find if this player is in the squad
  const playerInSquad = useMemo(() => {
    const qName = currentUser.name.trim().toLowerCase();
    return mySquad.find(p => p.name.trim().toLowerCase().includes(qName) || qName.includes(p.name.trim().toLowerCase()));
  }, [mySquad, currentUser.name]);

  // Player's team matches (5 group matches)
  const myTeamMatches = useMemo(() => {
    return matches.filter(m => m.teamA === playerTeamName || m.teamB === playerTeamName);
  }, [matches, playerTeamName]);

  // Latest / next match
  const nextMatch = useMemo(() => {
    return myTeamMatches.find(m => m.status === 'upcoming') || myTeamMatches[0];
  }, [myTeamMatches]);

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Player Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/40 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
              <Shirt className="w-3.5 h-3.5 text-blue-400" />
              <span>بوابة اللاعب الرسمي • دوري جامعة النيل 2026</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              مرحباً كابتن {currentUser.name} ⚽
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              هذه الصفحة مخصصة لك كلاعب في فريق <strong className="text-blue-300 font-bold">{playerTeamName}</strong>. يمكنك من هنا متابعة ترتيب فريقك في المجموعة، قائمة زملائك، مواعيد وملاعب مبارياتك القادمة، والنتائج المعتمدة من اللجنة المنظمة.
            </p>
          </div>

          {/* Quick Player Identity Badge */}
          <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-4 shadow-xl shrink-0 space-y-2 min-w-[240px]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-lg text-white shadow-lg shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <strong className="text-white text-sm font-black block">{currentUser.name}</strong>
                <span className="text-[11px] text-blue-300 font-bold flex items-center gap-1">
                  <Shirt className="w-3 h-3" />
                  لاعب في: {playerTeamName}
                </span>
                {currentUser.studentId && (
                  <span className="text-[10px] text-slate-400 font-mono block">
                    ID: {currentUser.studentId}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>الكلية:</span>
              <strong className="text-slate-200">{currentUser.department || 'جامعة النيل'}</strong>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>حالة القيد:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                لاعب معتمد بالبطولة
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Team Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Team Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${myTeam.logoColor} flex items-center justify-center font-black text-lg text-white shadow-md shrink-0`}>
            {myTeam.name.charAt(0)}
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">فريقك</span>
            <strong className="text-white text-base font-black">{myTeam.name}</strong>
            <span className="text-[10px] text-emerald-400 font-bold block">المجموعة {myTeam.group}</span>
          </div>
        </div>

        {/* Group Position & Points */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-lg shadow-md shrink-0 border border-amber-500/30">
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">رصيد النقاط</span>
            <div className="flex items-baseline gap-1.5">
              <strong className="text-white text-2xl font-mono font-black">{myTeam.points}</strong>
              <span className="text-xs text-amber-300 font-bold">نقطة</span>
            </div>
            <span className="text-[10px] text-slate-400">لعب {myTeam.played} • فاز {myTeam.won} • تعادل {myTeam.drawn}</span>
          </div>
        </div>

        {/* Goals Record */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-black text-lg shadow-md shrink-0 border border-teal-500/30">
            ⚽
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">سجل الأهداف</span>
            <div className="flex items-baseline gap-1.5 font-mono">
              <strong className="text-emerald-400 text-lg font-black">{myTeam.gf} له</strong>
              <span className="text-slate-500">/</span>
              <strong className="text-rose-400 text-lg font-black">{myTeam.ga} عليه</strong>
            </div>
            <span className="text-[10px] text-slate-400">فارق الأهداف: {myTeam.gd > 0 ? `+${myTeam.gd}` : myTeam.gd}</span>
          </div>
        </div>

        {/* Squad Count */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-lg shadow-md shrink-0 border border-purple-500/30">
            <Users className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">قائمة اللاعبين</span>
            <div className="flex items-baseline gap-1.5">
              <strong className="text-white text-2xl font-mono font-black">{mySquad.length}</strong>
              <span className="text-xs text-purple-300 font-bold">لاعب</span>
            </div>
            <span className="text-[10px] text-slate-400">مسجلين في المنظومة</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section: Matches & Teammates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): My Team Matches */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              <h3 className="font-black text-white text-base">
                جدول مباريات فريق {playerTeamName} (5 مباريات)
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              المجموعة {myTeam.group}
            </span>
          </div>

          <div className="space-y-3">
            {myTeamMatches.map((m, idx) => {
              const isTeamA = m.teamA === playerTeamName;
              const opponent = isTeamA ? m.teamB : m.teamA;
              const myScore = isTeamA ? m.scoreA : m.scoreB;
              const oppScore = isTeamA ? m.scoreB : m.scoreA;

              return (
                <div
                  key={m.id}
                  className="bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-4 transition-all shadow-lg space-y-3"
                >
                  {/* Top info */}
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-300 font-black text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-200">{m.stageName}</span>
                    </div>

                    <div>
                      {m.status === 'finished' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                          انتهت المباراة FT
                        </span>
                      ) : m.status === 'live' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/40 animate-pulse">
                          مباشر ({m.minute}')
                        </span>
                      ) : m.isScheduled ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                          مجدولة ومعتمدة ⏱️
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                          لم يُحدد الموعد بعد
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Match Teams and Score */}
                  <div className="flex items-center justify-between py-1 px-2">
                    {/* My Team */}
                    <div className="flex-1 flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${myTeam.logoColor} flex items-center justify-center font-black text-xs text-white shrink-0`}>
                        {playerTeamName.charAt(0)}
                      </div>
                      <div>
                        <strong className="text-white text-sm font-black block">{playerTeamName}</strong>
                        <span className="text-[10px] text-blue-400 font-bold">فريقك ⚽</span>
                      </div>
                    </div>

                    {/* Score / VS Box */}
                    <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-center min-w-[85px] shadow-inner mx-3">
                      {m.scoreA !== null && m.scoreB !== null ? (
                        <span className="font-mono text-xl font-black text-emerald-400">
                          {m.scoreA} - {m.scoreB}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-mono font-bold">ضد</span>
                      )}
                    </div>

                    {/* Opponent Team */}
                    <div className="flex-1 flex items-center justify-end gap-2 text-left">
                      <div>
                        <strong className="text-white text-sm font-black block">{opponent}</strong>
                        <span className="text-[10px] text-slate-400 font-medium">المنافس</span>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-black text-xs text-slate-300 shrink-0">
                        {opponent.charAt(0)}
                      </div>
                    </div>
                  </div>

                  {/* Date, Time & Pitch */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400 font-mono">
                    {m.isScheduled ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-emerald-400">
                            <Calendar className="w-3.5 h-3.5" />
                            {m.date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-300">
                            <Clock className="w-3.5 h-3.5" />
                            {m.time}
                          </span>
                        </div>
                        <span className="flex items-center gap-1 text-slate-300 font-sans">
                          <MapPin className="w-3.5 h-3.5 text-blue-400" />
                          {m.pitch}
                        </span>
                      </>
                    ) : (
                      <span className="text-amber-400/90 text-xs flex items-center gap-1 font-sans">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        بانتظار تحديد موعد وتوقيت المباراة من لجنة المسابقات
                      </span>
                    )}
                  </div>

                  {/* Scorers notes if available */}
                  {m.scorersSummary && (
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                      <strong className="text-amber-400 block mb-0.5">⚽ أهداف وأحداث المباراة:</strong>
                      <span>{m.scorersSummary}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (1 Col): Teammates List */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <h3 className="font-black text-white text-sm">
                  قائمة زملائك ({mySquad.length} لاعبين)
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md">
                فريق {playerTeamName}
              </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {mySquad.map((player) => {
                const isMe = currentUser.name.trim().toLowerCase().includes(player.name.trim().toLowerCase()) ||
                             player.name.trim().toLowerCase().includes(currentUser.name.trim().toLowerCase());

                return (
                  <div
                    key={player.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                      isMe
                        ? 'bg-blue-600/20 border-blue-500/60 text-white shadow-md'
                        : 'bg-slate-950/80 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-blue-400 font-mono font-black text-xs flex items-center justify-center">
                        #{player.number}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <strong className="font-bold text-white text-xs">{player.name}</strong>
                          {player.isCaptain && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                              👑 كابتن
                            </span>
                          )}
                          {isMe && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500 text-white font-bold">
                              أنت 👤
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>المركز: {player.position}</span>
                          <span>•</span>
                          <span className="text-teal-300 font-bold flex items-center gap-0.5">
                            <GraduationCap className="w-2.5 h-2.5 text-teal-400" />
                            ID: {player.studentId || '—'}
                            <span title="مقفل ومحمي"><Lock className="w-2 h-2 text-slate-500" /></span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      player.position === 'GK' ? 'bg-amber-500/20 text-amber-300' :
                      player.position === 'DEF' ? 'bg-blue-500/20 text-blue-300' :
                      player.position === 'MID' ? 'bg-emerald-500/20 text-emerald-300' :
                      'bg-rose-500/20 text-rose-300'
                    }`}>
                      {player.position}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Notice Card */}
          <div className="bg-gradient-to-br from-slate-900 to-blue-950/40 border border-blue-500/20 rounded-2xl p-4 shadow-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 text-blue-300 font-bold">
              <Shield className="w-4 h-4 text-blue-400" />
              <span>تعليمات اللاعبين:</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              • التواجد بالملعب قبل انطلاق المباراة بـ 20 دقيقة على الأقل.<br />
              • إحضار بطاقة الرقم القومي أو كارنيه جامعة النيل للتحقق.<br />
              • الالتزام بالزي الرياضي الموحد وتعليمات طاقم التحكيم واللجنة المنظمة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
