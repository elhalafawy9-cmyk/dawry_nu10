import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Vote, 
  CheckCircle2, 
  Clock, 
  Trophy, 
  Sparkles, 
  Calendar, 
  MapPin, 
  AlertCircle, 
  ChevronRight, 
  Award,
  TrendingUp,
  Shield,
  Swords
} from 'lucide-react';
import { Match } from '../App';
import { AppUser } from '../utils/auth';
import { TeamLogo } from '../utils/teamLogos';
import { 
  MatchVoteOption, 
  getMatchVotingState, 
  loadUserVotes, 
  recordUserVote, 
  getInitialCommunityVotes, 
  calculateMatchVoteSummary 
} from '../utils/predictions';

interface MatchVoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMatch: Match | null;
  matches: Match[];
  currentUser: AppUser | null;
  onNavigateToPredictions?: () => void;
}

export const MatchVoteModal: React.FC<MatchVoteModalProps> = ({
  isOpen,
  onClose,
  initialMatch,
  matches,
  currentUser,
  onNavigateToPredictions,
}) => {
  const userId = currentUser?.id || 'guest_voter';

  // Selected match to display & vote on
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  // Votes states
  const [userVotes, setUserVotes] = useState<Record<string, MatchVoteOption>>({});
  const [communityVotes, setCommunityVotes] = useState<Record<string, { teamA: number; draw: number; teamB: number }>>({});
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      setUserVotes(loadUserVotes(userId));
      setCommunityVotes(getInitialCommunityVotes(matches));

      if (initialMatch) {
        setSelectedMatchId(initialMatch.id);
      } else {
        // Pick first scheduled upcoming match that is open for voting
        const upcoming = matches.find(m => m.isScheduled && m.status !== 'finished' && getMatchVotingState(m).isOpen);
        if (upcoming) {
          setSelectedMatchId(upcoming.id);
        } else if (matches.length > 0) {
          setSelectedMatchId(matches[0].id);
        }
      }
    }
  }, [isOpen, initialMatch, userId, matches]);

  // Current active match object
  const currentMatch = useMemo(() => {
    return matches.find(m => m.id === selectedMatchId) || initialMatch || matches[0] || null;
  }, [matches, selectedMatchId, initialMatch]);

  // Voting state for current match (open until kickoff or match finished/live)
  const votingState = useMemo(() => {
    if (!currentMatch) return { isOpen: false, statusBadgeText: '', badgeColorClass: '', closeNotice: '' };
    return getMatchVotingState(currentMatch);
  }, [currentMatch]);

  // Vote summary & percentages
  const voteSummary = useMemo(() => {
    if (!currentMatch) return null;
    return calculateMatchVoteSummary(currentMatch.id, communityVotes);
  }, [currentMatch, communityVotes]);

  // User's current vote on this match
  const currentUserVote = currentMatch ? userVotes[currentMatch.id] : undefined;

  // Handle casting a vote
  const handleCastVote = (option: MatchVoteOption) => {
    if (!currentMatch) return;

    if (!votingState.isOpen) {
      setFeedbackMsg(`التصويت مغلق لهذه المباراة: ${votingState.closeNotice}`);
      return;
    }

    const { userVotes: updatedUserVotes, communityVotes: updatedCommunity } = recordUserVote(
      userId,
      currentMatch.id,
      option,
      communityVotes
    );

    setUserVotes(updatedUserVotes);
    setCommunityVotes(updatedCommunity);

    const teamLabel = option === 'teamA' 
      ? `فوز ${currentMatch.teamA}` 
      : option === 'draw' 
      ? 'التعادل' 
      : `فوز ${currentMatch.teamB}`;

    setFeedbackMsg(`تم تسجيل تصويتك: ${teamLabel} 🎯 (+3 نقاط في حال صحة التوقع)`);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  // List of upcoming matches for quick selector pills
  const upcomingMatches = useMemo(() => {
    return matches
      .filter(m => m.isScheduled && m.status !== 'finished')
      .slice(0, 10);
  }, [matches]);

  if (!isOpen || !currentMatch) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      dir="rtl"
    >
      <div 
        className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
      >
        {/* Header */}
        <div className="p-5 md:p-6 bg-gradient-to-r from-blue-950/90 via-[#071f3a] to-slate-900 border-b border-blue-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
              <Vote className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-black text-white">
                  التصويت لمباريات البطولة (Vote for Match)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                  جامعة النيل 🗳️
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                توقع الفائز قبل موعد انطلاق صافرة البداية واكسب +3 نقاط في الترتيب
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          
          {/* Quick Match Selector Pills (if multiple upcoming matches) */}
          {upcomingMatches.length > 1 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>اختر مباراة قادمة للتصويت عليها:</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {upcomingMatches.map(m => {
                  const isSelected = m.id === currentMatch.id;
                  const hasVoted = !!userVotes[m.id];
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMatchId(m.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <span>{m.teamA} ضد {m.teamB}</span>
                      {hasVoted && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="صوّتت في هذه المباراة" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Feedback / Toast Banner */}
          {feedbackMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2.5 shadow-lg animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* Match Stage & Kickoff Status Card */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 font-black border border-emerald-500/20">
                  {currentMatch.stage === 'group' ? `الجولة ${currentMatch.round || 1}` : currentMatch.stageName}
                </span>
                {currentMatch.group && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-bold">
                    المجموعة {currentMatch.group}
                  </span>
                )}
              </div>

              {/* Voting Window Deadline Badge */}
              <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${votingState.badgeColorClass}`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{votingState.statusBadgeText}</span>
              </div>
            </div>

            {/* Date, Time & Pitch */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 font-mono pt-1 border-t border-slate-800/60">
              <span className="flex items-center gap-1.5 font-sans">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>{currentMatch.date || 'الموعد لم يحدد'} • {currentMatch.time || '—'}</span>
              </span>
              <span className="flex items-center gap-1.5 font-sans text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentMatch.pitch || 'الملعب الرئيسي - جامعة النيل'}</span>
              </span>
            </div>
          </div>

          {/* Teams Visual Showcase Box */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-4">
            {/* Team A */}
            <div className="flex-1 text-center space-y-2">
              <TeamLogo teamName={currentMatch.teamA} size="xl" className="mx-auto drop-shadow-md" />
              <div className="font-black text-white text-sm md:text-base truncate" title={currentMatch.teamA}>
                {currentMatch.teamA}
              </div>
              <span className="text-[10px] text-slate-400 block font-semibold">فريق أ</span>
            </div>

            {/* Score or VS Badge */}
            <div className="text-center px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl min-w-[70px]">
              {currentMatch.status === 'finished' || currentMatch.status === 'live' ? (
                <div className="font-mono text-xl font-black text-emerald-400">
                  {currentMatch.scoreA ?? 0} - {currentMatch.scoreB ?? 0}
                  <span className="block text-[9px] text-slate-400 font-sans mt-0.5">
                    {currentMatch.status === 'finished' ? 'نهائية' : 'مباشر'}
                  </span>
                </div>
              ) : (
                <div>
                  <span className="font-mono font-black text-sm text-amber-400">VS</span>
                  <span className="block text-[9px] text-slate-400 font-sans mt-0.5">تحدي</span>
                </div>
              )}
            </div>

            {/* Team B */}
            <div className="flex-1 text-center space-y-2">
              <TeamLogo teamName={currentMatch.teamB} size="xl" className="mx-auto drop-shadow-md" />
              <div className="font-black text-white text-sm md:text-base truncate" title={currentMatch.teamB}>
                {currentMatch.teamB}
              </div>
              <span className="text-[10px] text-slate-400 block font-semibold">فريق ب</span>
            </div>
          </div>

          {/* Voting Action Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-white flex items-center gap-1.5">
                <Vote className="w-4 h-4 text-blue-400" />
                <span>اختر توقعك للنتيجة:</span>
              </label>

              {currentUserVote && (
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>تم التصويت</span>
                </span>
              )}
            </div>

            {/* 3 Voting Buttons (Team A / Draw / Team B) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option A: Team A Win */}
              <button
                onClick={() => handleCastVote('teamA')}
                disabled={!votingState.isOpen}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col items-center justify-between text-center gap-2 cursor-pointer ${
                  currentUserVote === 'teamA'
                    ? 'bg-blue-600/20 border-blue-400 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                } ${!votingState.isOpen ? 'opacity-80 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-1 text-xs font-black text-white truncate max-w-full">
                  <span>فوز {currentMatch.teamA}</span>
                  {currentUserVote === 'teamA' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                </div>

                {/* Percentage & Vote Count */}
                <div className="w-full space-y-1">
                  <div className="text-base font-black text-blue-300 font-mono">
                    {voteSummary?.pctA || 0}%
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${voteSummary?.pctA || 0}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {voteSummary?.teamAVotes || 0} صوت
                  </div>
                </div>

                {currentUserVote === 'teamA' && (
                  <span className="text-[10px] font-black text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/30">
                    🎯 اختيارك الحالي
                  </span>
                )}
              </button>

              {/* Option Draw: التعادل */}
              <button
                onClick={() => handleCastVote('draw')}
                disabled={!votingState.isOpen}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col items-center justify-between text-center gap-2 cursor-pointer ${
                  currentUserVote === 'draw'
                    ? 'bg-amber-600/20 border-amber-400 ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                } ${!votingState.isOpen ? 'opacity-80 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-1 text-xs font-black text-white">
                  <span>التعادل (Draw)</span>
                  {currentUserVote === 'draw' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                </div>

                {/* Percentage & Vote Count */}
                <div className="w-full space-y-1">
                  <div className="text-base font-black text-amber-300 font-mono">
                    {voteSummary?.pctDraw || 0}%
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${voteSummary?.pctDraw || 0}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {voteSummary?.drawVotes || 0} صوت
                  </div>
                </div>

                {currentUserVote === 'draw' && (
                  <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                    🎯 اختيارك الحالي
                  </span>
                )}
              </button>

              {/* Option B: Team B Win */}
              <button
                onClick={() => handleCastVote('teamB')}
                disabled={!votingState.isOpen}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col items-center justify-between text-center gap-2 cursor-pointer ${
                  currentUserVote === 'teamB'
                    ? 'bg-emerald-600/20 border-emerald-400 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                } ${!votingState.isOpen ? 'opacity-80 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-1 text-xs font-black text-white truncate max-w-full">
                  <span>فوز {currentMatch.teamB}</span>
                  {currentUserVote === 'teamB' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </div>

                {/* Percentage & Vote Count */}
                <div className="w-full space-y-1">
                  <div className="text-base font-black text-emerald-300 font-mono">
                    {voteSummary?.pctB || 0}%
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${voteSummary?.pctB || 0}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {voteSummary?.teamBVotes || 0} صوت
                  </div>
                </div>

                {currentUserVote === 'teamB' && (
                  <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    🎯 اختيارك الحالي
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Voting Rules & Status Notice */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>تعليمات التصويت واحتساب النقاط:</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              • التصويت متاح لجميع طلاب وأعضاء جامعة النيل ومفتوح حتى موعد المباراة.
              <br />
              • يمكنك تغيير تصويتك في أي وقت قبل انطلاق صافرة البداية.
              <br />
              • كل توقع صحيح يمنحك <strong className="text-emerald-400 font-black">+3 نقاط</strong> تضاف فوراً لسجلك في جدول ترتيب المتوقعين والمراكز!
            </p>
          </div>

          {/* Evaluated Outcome (if match is finished) */}
          {currentMatch.status === 'finished' && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>نتيجة المباراة المعتمدة:</span>
                </span>
                <span className="font-mono text-emerald-400 font-black text-sm">
                  {currentMatch.teamA} {currentMatch.scoreA} - {currentMatch.scoreB} {currentMatch.teamB}
                </span>
              </div>

              {currentUserVote ? (
                (() => {
                  const scoreA = currentMatch.scoreA ?? 0;
                  const scoreB = currentMatch.scoreB ?? 0;
                  const actualOutcome = scoreA > scoreB ? 'teamA' : scoreB > scoreA ? 'teamB' : 'draw';
                  const isCorrect = currentUserVote === actualOutcome;

                  return (
                    <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                      isCorrect 
                        ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-300' 
                        : 'bg-slate-800/80 border-slate-700 text-slate-300'
                    }`}>
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>🎯 رائع! توقعك كان صحيحاً وحصلت على +3 نقاط في الترتيب!</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-slate-400" />
                          <span>لم يصب التوقع هذه المرة، حظ أوفر في المباريات القادمة!</span>
                        </>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-[11px] text-slate-400">
                  لم تشارك بالتصويت في هذه المباراة قبل موعد انطلاقها.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 font-mono">
            إجمالي أصوات الجماهير: <strong className="text-white font-bold">{voteSummary?.totalVotes || 0}</strong> صوت
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToPredictions && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToPredictions();
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>صفحة التوقعات والمراكز 🏅</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer border border-slate-700"
            >
              تم / إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
