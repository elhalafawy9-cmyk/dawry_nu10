import React, { useState } from 'react';
import { 
  Trophy, 
  Swords, 
  Calendar, 
  Clock, 
  MapPin, 
  Sparkles, 
  ArrowRightLeft, 
  CheckCircle2, 
  Layers, 
  ChevronRight, 
  ChevronLeft,
  Crown,
  Medal,
  Award,
  Filter,
  Eye,
  Edit3,
  Flame,
  Zap
} from 'lucide-react';
import { TeamLogo } from '../utils/teamLogos';

export interface Match {
  id: string;
  group?: string;
  round?: number;
  stage: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final';
  stageName: string;
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  status: 'upcoming' | 'live' | 'finished';
  minute?: number;
  date: string;
  time: string;
  pitch: string;
  isScheduled: boolean;
  scorersSummary?: string;
  recordedBy?: string;
}

export interface Team {
  id: string;
  name: string;
  group: string;
  logoColor?: string;
  logoUrl?: string;
}

interface KnockoutBracketTreeProps {
  matches: Match[];
  teams: Team[];
  isAdmin: boolean;
  onOpenScheduleModal: (match: Match) => void;
  onOpenResultModal: (match: Match) => void;
  onOpenEditMatchup: (match: Match) => void;
  onSelectTeam?: (teamName: string) => void;
  onOpenKnockoutDraw?: () => void;
  onOpenRoundOrganizer?: (stage: string) => void;
  onApplyOfficialReadyDraw?: () => void;
}

export const KnockoutBracketTree: React.FC<KnockoutBracketTreeProps> = ({
  matches,
  teams,
  isAdmin,
  onOpenScheduleModal,
  onOpenResultModal,
  onOpenEditMatchup,
  onSelectTeam,
  onOpenKnockoutDraw,
  onOpenRoundOrganizer,
  onApplyOfficialReadyDraw,
}) => {
  // 'symmetrical' = 16 teams Left + 16 teams Right converging to Center Final
  // 'sequential'  = Left-to-Right tree
  // 'grid'        = Standard filterable cards
  const [viewMode, setViewMode] = useState<'symmetrical' | 'sequential' | 'grid'>('symmetrical');
  const [activeStageFilter, setActiveStageFilter] = useState<'all' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'>('all');

  // Match lookup map by ID
  const matchMap = new Map<string, Match>();
  matches.forEach(m => matchMap.set(m.id, m));

  const getMatch = (id: string, fallbackStageName: string): Match => {
    return matchMap.get(id) || {
      id,
      stage: id.startsWith('r32') ? 'r32' : id.startsWith('r16') ? 'r16' : id.startsWith('qf') ? 'qf' : id.startsWith('sf') ? 'sf' : 'final',
      stageName: fallbackStageName,
      teamA: 'بانتظار المتأهل',
      teamB: 'بانتظار المتأهل',
      scoreA: null,
      scoreB: null,
      status: 'upcoming',
      date: '',
      time: '',
      pitch: '',
      isScheduled: false,
    };
  };

  // Grand Final and 3rd place
  const grandFinal = getMatch('fin', 'النهائي الكبير 🏆');
  const thirdPlaceMatch = getMatch('third', 'مباراة المركز الثالث 🥉');

  // Determine Champion if final is completed
  let championName: string | null = null;
  let runnerUpName: string | null = null;
  if (grandFinal && grandFinal.status === 'finished' && grandFinal.scoreA !== null && grandFinal.scoreB !== null) {
    if (grandFinal.scoreA > grandFinal.scoreB) {
      championName = grandFinal.teamA;
      runnerUpName = grandFinal.teamB;
    } else if (grandFinal.scoreB > grandFinal.scoreA) {
      championName = grandFinal.teamB;
      runnerUpName = grandFinal.teamA;
    }
  }

  // Determine Third Place winner
  let thirdPlaceName: string | null = null;
  if (thirdPlaceMatch && thirdPlaceMatch.status === 'finished' && thirdPlaceMatch.scoreA !== null && thirdPlaceMatch.scoreB !== null) {
    if (thirdPlaceMatch.scoreA > thirdPlaceMatch.scoreB) {
      thirdPlaceName = thirdPlaceMatch.teamA;
    } else if (thirdPlaceMatch.scoreB > thirdPlaceMatch.scoreA) {
      thirdPlaceName = thirdPlaceMatch.teamB;
    }
  }

  // Render a single sleek match card with uniform dimensions
  const renderBracketCard = (m: Match, side: 'left' | 'right' | 'center' = 'center') => {
    const isFinished = m.status === 'finished';
    const isLive = m.status === 'live';
    const sA = m.scoreA !== null ? m.scoreA : null;
    const sB = m.scoreB !== null ? m.scoreB : null;

    const winnerA = isFinished && sA !== null && sB !== null && sA > sB;
    const winnerB = isFinished && sA !== null && sB !== null && sB > sA;

    const isCenter = side === 'center';

    return (
      <div 
        key={m.id}
        className={`w-[230px] sm:w-[245px] shrink-0 bg-slate-900/95 backdrop-blur-md border rounded-2xl transition-all duration-200 shadow-lg hover:shadow-2xl hover:scale-[1.01] hover:border-amber-500/70 ${
          isLive 
            ? 'border-rose-500/80 ring-2 ring-rose-500/30' 
            : isCenter
              ? 'border-amber-500/50 shadow-amber-500/10'
              : isFinished 
                ? 'border-slate-800' 
                : m.isScheduled 
                  ? 'border-blue-500/40' 
                  : 'border-slate-800/90'
        } p-2.5 space-y-2 select-none`}
      >
        {/* Header: Stage Name & Match Status / Schedule */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1.5 gap-1">
          <span className="font-bold text-amber-400 truncate max-w-[130px] flex items-center gap-1">
            {isCenter && <Trophy className="w-3 h-3 text-amber-400 shrink-0" />}
            <span className="truncate">{m.stageName}</span>
          </span>

          <div className="shrink-0 flex items-center gap-1 font-mono text-[9px]">
            {isLive ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-black animate-pulse border border-rose-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                د{m.minute || '1'}'
              </span>
            ) : isFinished ? (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                FT
              </span>
            ) : m.isScheduled ? (
              <span className="text-slate-300 font-sans truncate">
                {m.time ? `${m.date.slice(5)} • ${m.time}` : m.date}
              </span>
            ) : (
              <span className="text-slate-500 font-sans">بانتظار الموعد</span>
            )}
          </div>
        </div>

        {/* Pitch venue badge if scheduled */}
        {m.pitch && (
          <div className="flex items-center gap-1 text-[9px] text-slate-400 bg-slate-950/70 px-1.5 py-0.5 rounded truncate">
            <MapPin className="w-2.5 h-2.5 text-blue-400 shrink-0" />
            <span className="truncate">{m.pitch}</span>
          </div>
        )}

        {/* Teams and Scores */}
        <div className="space-y-1">
          {/* Team A */}
          <div className={`px-2 py-1.5 rounded-xl flex items-center justify-between text-xs font-bold transition-colors ${
            winnerA 
              ? 'bg-emerald-950/50 border border-emerald-500/50 text-emerald-200' 
              : 'bg-slate-950 border border-slate-800/80 text-white'
          }`}>
            <button
              type="button"
              onClick={() => onSelectTeam && onSelectTeam(m.teamA)}
              className="flex items-center gap-1.5 hover:text-amber-300 truncate cursor-pointer text-right max-w-[70%]"
              title={m.teamA}
            >
              <TeamLogo teamName={m.teamA} size="xs" />
              <span className="truncate">{m.teamA}</span>
            </button>
            <div className="flex items-center gap-1 font-mono shrink-0">
              {winnerA && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
              <span className={`text-xs px-1.5 py-0.5 rounded ${winnerA ? 'font-black text-emerald-400 bg-emerald-900/40' : 'text-slate-300'}`}>
                {sA !== null ? sA : '-'}
              </span>
            </div>
          </div>

          {/* Team B */}
          <div className={`px-2 py-1.5 rounded-xl flex items-center justify-between text-xs font-bold transition-colors ${
            winnerB 
              ? 'bg-emerald-950/50 border border-emerald-500/50 text-emerald-200' 
              : 'bg-slate-950 border border-slate-800/80 text-white'
          }`}>
            <button
              type="button"
              onClick={() => onSelectTeam && onSelectTeam(m.teamB)}
              className="flex items-center gap-1.5 hover:text-amber-300 truncate cursor-pointer text-right max-w-[70%]"
              title={m.teamB}
            >
              <TeamLogo teamName={m.teamB} size="xs" />
              <span className="truncate">{m.teamB}</span>
            </button>
            <div className="flex items-center gap-1 font-mono shrink-0">
              {winnerB && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
              <span className={`text-xs px-1.5 py-0.5 rounded ${winnerB ? 'font-black text-emerald-400 bg-emerald-900/40' : 'text-slate-300'}`}>
                {sB !== null ? sB : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Scorers Summary if present */}
        {m.scorersSummary && (
          <p className="text-[9px] text-slate-400 truncate bg-slate-950/50 px-1.5 py-0.5 rounded border border-slate-800/50">
            ⚽ {m.scorersSummary}
          </p>
        )}

        {/* Admin Quick Action Buttons */}
        {isAdmin && (
          <div className="pt-1 border-t border-slate-800 flex items-center justify-between gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => onOpenEditMatchup(m)}
              className="px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 cursor-pointer transition-colors"
              title="تعديل الفريقين وتحديد من يلاعب من"
            >
              الطرفين
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onOpenScheduleModal(m)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer transition-colors"
                title="تحديد الموعد والملعب"
              >
                {m.isScheduled ? 'الميعاد' : 'موعد'}
              </button>
              <button
                type="button"
                onClick={() => onOpenResultModal(m)}
                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-sm cursor-pointer transition-colors"
                title="رصد واعتماد نتيجة المباراة"
              >
                النتيجة ⚽
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // SVG Connector line component that bridges 2 parent matches into 1 vertically centered child match
  const BracketConnector: React.FC<{ direction: 'left-to-right' | 'right-to-left' }> = ({ direction }) => {
    return (
      <div className="w-8 flex items-center justify-center shrink-0">
        <svg className="w-full h-full stroke-slate-700" viewBox="0 0 32 100" fill="none" preserveAspectRatio="none">
          {direction === 'left-to-right' ? (
            <>
              {/* Top match line out */}
              <path d="M 0 25 H 16 V 50 H 32" strokeWidth="2" strokeLinecap="round" />
              {/* Bottom match line out */}
              <path d="M 0 75 H 16 V 50 H 32" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            <>
              {/* Top match line in from right */}
              <path d="M 32 25 H 16 V 50 H 0" strokeWidth="2" strokeLinecap="round" />
              {/* Bottom match line in from right */}
              <path d="M 32 75 H 16 V 50 H 0" strokeWidth="2" strokeLinecap="round" />
            </>
          )}
        </svg>
      </div>
    );
  };

  // Reusable Bracket Subtree Node (2 R32 matches -> 1 R16 match)
  const renderR32PairToR16 = (
    r32MatchAId: string, 
    r32MatchBId: string, 
    r16MatchId: string,
    direction: 'left-to-right' | 'right-to-left' = 'left-to-right'
  ) => {
    const mA = getMatch(r32MatchAId, 'دور 32');
    const mB = getMatch(r32MatchBId, 'دور 32');
    const m16 = getMatch(r16MatchId, 'دور 16');

    if (direction === 'left-to-right') {
      return (
        <div className="flex items-center gap-2">
          {/* 2 R32 Matches */}
          <div className="flex flex-col justify-around gap-4">
            {renderBracketCard(mA, 'left')}
            {renderBracketCard(mB, 'left')}
          </div>

          {/* Connector to R16 */}
          <BracketConnector direction="left-to-right" />

          {/* 1 R16 Match perfectly vertically centered between them */}
          <div className="flex flex-col justify-center my-auto">
            {renderBracketCard(m16, 'left')}
          </div>
        </div>
      );
    }

    // Right-to-Left (Mirror for right half)
    return (
      <div className="flex items-center gap-2">
        {/* 1 R16 Match perfectly vertically centered */}
        <div className="flex flex-col justify-center my-auto">
          {renderBracketCard(m16, 'right')}
        </div>

        {/* Connector from R32 */}
        <BracketConnector direction="right-to-left" />

        {/* 2 R32 Matches */}
        <div className="flex flex-col justify-around gap-4">
          {renderBracketCard(mA, 'right')}
          {renderBracketCard(mB, 'right')}
        </div>
      </div>
    );
  };

  // Reusable 4-to-1 Quarterfinal Branch:
  // (4 R32 matches -> 2 R16 matches -> 1 QF match in exact center)
  const renderQuarterFinalBranch = (
    r32Ids: [string, string, string, string],
    r16Ids: [string, string],
    qfId: string,
    direction: 'left-to-right' | 'right-to-left' = 'left-to-right'
  ) => {
    const qfMatch = getMatch(qfId, 'ربع النهائي');

    if (direction === 'left-to-right') {
      return (
        <div className="flex items-center gap-2">
          {/* 2 R16 pairs */}
          <div className="flex flex-col justify-around gap-8">
            {renderR32PairToR16(r32Ids[0], r32Ids[1], r16Ids[0], 'left-to-right')}
            {renderR32PairToR16(r32Ids[2], r32Ids[3], r16Ids[1], 'left-to-right')}
          </div>

          {/* Connector to QF */}
          <BracketConnector direction="left-to-right" />

          {/* 1 QF Match in exact center */}
          <div className="flex flex-col justify-center my-auto">
            {renderBracketCard(qfMatch, 'left')}
          </div>
        </div>
      );
    }

    // Right-to-Left
    return (
      <div className="flex items-center gap-2">
        {/* 1 QF Match in exact center */}
        <div className="flex flex-col justify-center my-auto">
          {renderBracketCard(qfMatch, 'right')}
        </div>

        {/* Connector from R16 */}
        <BracketConnector direction="right-to-left" />

        {/* 2 R16 pairs */}
        <div className="flex flex-col justify-around gap-8">
          {renderR32PairToR16(r32Ids[0], r32Ids[1], r16Ids[0], 'right-to-left')}
          {renderR32PairToR16(r32Ids[2], r32Ids[3], r16Ids[1], 'right-to-left')}
        </div>
      </div>
    );
  };

  // Left Semi-Final Branch (8 R32 -> 4 R16 -> 2 QF -> 1 SF1):
  const sf1Match = getMatch('sf1', 'نصف النهائي (1)');
  const sf2Match = getMatch('sf2', 'نصف النهائي (2)');

  return (
    <div className="space-y-6 select-none">
      {/* ========================================================================= */}
      {/* 1. Header Banner & View Mode Selectors */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-2">
              <Swords className="w-3.5 h-3.5" />
              <span>الشجرة الإقصائية العالمية المتوازنة (16 فريقاً يميناً و 16 يساراً 🏆)</span>
            </div>
            <h2 className="text-xl md:text-3xl font-black text-white flex items-center gap-2.5">
              <span>شجرة البطولة: صعود متطابق ومتوازن نحو النهائي الكبير</span>
              <span className="text-2xl">🏆</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              مسار الأدوار الإقصائية المتناظر: <strong className="text-emerald-400">16 فريقاً في المسار الأيسر (8 مواجهات)</strong> مقابل <strong className="text-emerald-400">16 فريقاً في المسار الأيمن (8 مواجهات)</strong>، يتصاعد الفائزون خطوة بخطوة حتى يلتقي بطلا المسارين في <strong className="text-amber-400">النهائي الكبير بالمنتصف 🏆</strong>.
            </p>
          </div>

          {/* Quick Actions & View Mode Toggle */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('symmetrical')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'symmetrical'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="16 فريق شمال و 16 فريق يمين والنهائي في المنتصف"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>شجرة متناظرة (16يمين و 16شمال 🏆)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('sequential')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'sequential'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض متسلسل من دور 32 حتى النهائي"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>متسلسل 🌳</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'grid'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض البطاقات حسب المرحلة"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>بطاقات 📋</span>
              </button>
            </div>

            {/* Smart Draw & Manual Matchup buttons for Admin */}
            {isAdmin && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {onApplyOfficialReadyDraw && (
                  <button
                    type="button"
                    onClick={onApplyOfficialReadyDraw}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/30 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                    title="تطبيق القرعة المعتمدة: أول وثاني المجموعة 4 في الجناح الأيمن وأول وثاني المجموعة 7 في الجناح الأيسر"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>القرعة الجاهزة (م4 يمين & م7 شمال 🎯)</span>
                  </button>
                )}
                {onOpenKnockoutDraw && (
                  <button
                    type="button"
                    onClick={onOpenKnockoutDraw}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>سحب قرعة عشوائية جديدة 🎲</span>
                  </button>
                )}
                {onOpenRoundOrganizer && (
                  <button
                    type="button"
                    onClick={() => onOpenRoundOrganizer('r32')}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-amber-500/30 cursor-pointer transition-all"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>ترتيب يدوي للمواجهات</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Symmetry Stages Visual Flow Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-800/80 text-center text-xs">
          <div className="p-2 rounded-xl bg-slate-950/70 border border-emerald-500/30">
            <span className="text-[10px] text-emerald-400 font-bold block">الجناح الأيسر (شمال ⬅️)</span>
            <strong className="text-white text-xs block">المجموعة 7 (مان سيتي & اكتوبر)</strong>
            <span className="text-[9px] text-emerald-300/80">16 فريقاً (8 مواجهات دور 32)</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-950/70 border border-blue-500/30">
            <span className="text-[10px] text-blue-400 font-bold block">الصعود الأيسر</span>
            <strong className="text-white text-xs block">دور 16 ← ربع النهائي</strong>
            <span className="text-[9px] text-slate-400">المتأهل لنصف النهائي 1</span>
          </div>

          <div className="p-2 rounded-xl bg-amber-950/50 border border-amber-500/40 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-amber-300 font-bold block">قمة الهرم الإقصائي 🏆</span>
            <strong className="text-amber-400 text-xs block">النهائي الكبير والمركز 3</strong>
            <span className="text-[9px] text-amber-300/80">تتويج بطل 2026</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-950/70 border border-purple-500/30">
            <span className="text-[10px] text-purple-400 font-bold block">الصعود الأيمن</span>
            <strong className="text-white text-xs block">دور 16 ← ربع النهائي</strong>
            <span className="text-[9px] text-slate-400">المتأهل لنصف النهائي 2</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-950/70 border border-emerald-500/30 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-emerald-400 font-bold block">الجناح الأيمن (يمين ➡️)</span>
            <strong className="text-white text-xs block">المجموعة 4 (باريس & اسبانيا)</strong>
            <span className="text-[9px] text-emerald-300/80">16 فريقاً (8 مواجهات دور 32)</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Champion Spotlight (if Grand Final is finished) */}
      {/* ========================================================================= */}
      {championName && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-2 border-amber-500/60 p-6 rounded-3xl shadow-2xl text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-black animate-pulse">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>بطل بطولة دوري جامعة النيل لكرة القدم 2026</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
            <h3 className="text-3xl md:text-5xl font-black text-amber-300 drop-shadow-md">
              {championName}
            </h3>
            <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold pt-2">
            <span className="px-3 py-1 rounded-full bg-slate-900 border border-amber-500/30 text-amber-200">
              🥇 البطل المتوج: {championName}
            </span>
            {runnerUpName && (
              <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                🥈 الوصيف: {runnerUpName}
              </span>
            )}
            {thirdPlaceName && (
              <span className="px-3 py-1 rounded-full bg-slate-900 border border-amber-800/40 text-amber-400/90">
                🥉 المركز الثالث: {thirdPlaceName}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VIEW MODE: SYMMETRICAL BRACKET (16 شمال و 16 يمين والنهائي في المنتصف) */}
      {/* ========================================================================= */}
      {viewMode === 'symmetrical' && (
        <div className="bg-slate-950 p-4 md:p-6 rounded-3xl border border-slate-800 shadow-2xl overflow-x-auto">
          {/* Scroll instruction banner */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-4 px-2">
            <span className="flex items-center gap-1.5 font-bold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>الشجرة العالمية: 16 فريقاً يساراً و 16 فريقاً يميناً — كل مباراة في المنتصف تماماً بين مباراتي التأهيل!</span>
            </span>
            <span className="font-mono text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20">
              16 يسار ← النهائي في المنتصف 🏆 → 16 يمين
            </span>
          </div>

          <div className="min-w-[1950px] flex items-center justify-between gap-4 py-6">
            {/* ================================================================= */}
            {/* ⬅️ LEFT HALF (النصف الأيسر: 16 فريقاً / 8 مباريات دور 32 صعوداً لـ SF1) */}
            {/* ================================================================= */}
            <div className="flex items-center gap-3">
              {/* Branch 1 of Left: 8 R32 -> 4 R16 -> 2 QF */}
              <div className="flex flex-col justify-around gap-12">
                {renderQuarterFinalBranch(
                  ['r32_1', 'r32_2', 'r32_3', 'r32_4'],
                  ['r16_1', 'r16_2'],
                  'qf1',
                  'left-to-right'
                )}

                {renderQuarterFinalBranch(
                  ['r32_5', 'r32_6', 'r32_7', 'r32_8'],
                  ['r16_3', 'r16_4'],
                  'qf2',
                  'left-to-right'
                )}
              </div>

              {/* Connector from QF1 & QF2 to SF1 */}
              <BracketConnector direction="left-to-right" />

              {/* Semi-Final 1 (نصف النهائي 1) in exact vertical center of the left half */}
              <div className="flex flex-col justify-center my-auto">
                <div className="text-center pb-2">
                  <span className="text-[10px] font-black text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-500/30">
                    نصف النهائي (1) 🏆
                  </span>
                </div>
                {renderBracketCard(sf1Match, 'left')}
              </div>
            </div>

            {/* ================================================================= */}
            {/* 🏆 CENTER (المنتصف: النهائي الكبير ومباراة المركز الثالث والتتويج) */}
            {/* ================================================================= */}
            <div className="w-[300px] shrink-0 flex flex-col items-center justify-center px-4 space-y-6">
              {/* Final Header Podium Badge */}
              <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 p-0.5 shadow-xl shadow-amber-500/30 animate-pulse">
                  <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-amber-400" />
                  </div>
                </div>
                <h3 className="text-base font-black text-amber-300 pt-1">
                  المباراة النهائية الكبرى 🏆
                </h3>
                <span className="text-[10px] text-slate-400 block font-mono">
                  بطل دوري جامعة النيل 2026
                </span>
              </div>

              {/* Grand Final Card */}
              <div className="w-full flex justify-center">
                {renderBracketCard(grandFinal, 'center')}
              </div>

              {/* Third Place Match Card */}
              <div className="w-full pt-4 border-t border-slate-800/80 text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-black text-amber-500">
                  <Medal className="w-3.5 h-3.5 text-amber-600" />
                  <span>مباراة تحديد المركز الثالث 🥉</span>
                </div>
                <div className="flex justify-center">
                  {renderBracketCard(thirdPlaceMatch, 'center')}
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* ➡️ RIGHT HALF (النصف الأيمن: 16 فريقاً / 8 مباريات دور 32 صعوداً لـ SF2) */}
            {/* ================================================================= */}
            <div className="flex items-center gap-3">
              {/* Semi-Final 2 (نصف النهائي 2) in exact vertical center of the right half */}
              <div className="flex flex-col justify-center my-auto">
                <div className="text-center pb-2">
                  <span className="text-[10px] font-black text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-500/30">
                    نصف النهائي (2) 🏆
                  </span>
                </div>
                {renderBracketCard(sf2Match, 'right')}
              </div>

              {/* Connector from SF2 to QF3 & QF4 */}
              <BracketConnector direction="right-to-left" />

              {/* Branch 2 of Right: 2 QF -> 4 R16 -> 8 R32 */}
              <div className="flex flex-col justify-around gap-12">
                {renderQuarterFinalBranch(
                  ['r32_9', 'r32_10', 'r32_11', 'r32_12'],
                  ['r16_5', 'r16_6'],
                  'qf3',
                  'right-to-left'
                )}

                {renderQuarterFinalBranch(
                  ['r32_13', 'r32_14', 'r32_15', 'r32_16'],
                  ['r16_7', 'r16_8'],
                  'qf4',
                  'right-to-left'
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VIEW MODE: SEQUENTIAL (يسار إلى يمين) */}
      {/* ========================================================================= */}
      {viewMode === 'sequential' && (
        <div className="bg-slate-950 p-4 md:p-6 rounded-3xl border border-slate-800 shadow-2xl overflow-x-auto">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-4 px-2">
            <span className="font-bold text-slate-300">
              المسار المتسلسل: دور الـ 32 ← دور الـ 16 ← ربع النهائي ← نصف النهائي ← النهائي
            </span>
          </div>

          <div className="min-w-[1300px] flex items-center gap-3 py-6">
            {/* Left Half Branch leading to SF1 */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col justify-around gap-8">
                {renderQuarterFinalBranch(
                  ['r32_1', 'r32_2', 'r32_3', 'r32_4'],
                  ['r16_1', 'r16_2'],
                  'qf1',
                  'left-to-right'
                )}
                {renderQuarterFinalBranch(
                  ['r32_5', 'r32_6', 'r32_7', 'r32_8'],
                  ['r16_3', 'r16_4'],
                  'qf2',
                  'left-to-right'
                )}
              </div>
              <BracketConnector direction="left-to-right" />
              <div className="flex flex-col justify-center my-auto space-y-1">
                <span className="text-[10px] font-bold text-purple-400 text-center block">نصف النهائي 1</span>
                {renderBracketCard(sf1Match, 'center')}
              </div>
            </div>

            {/* Central Connector to Grand Final */}
            <BracketConnector direction="left-to-right" />

            {/* Grand Final & 3rd Place */}
            <div className="w-[280px] shrink-0 flex flex-col items-center justify-center px-2 space-y-6">
              <div className="text-center space-y-1">
                <Trophy className="w-8 h-8 text-amber-400 mx-auto" />
                <h4 className="text-sm font-black text-amber-300">النهائي الكبير 🏆</h4>
              </div>
              {renderBracketCard(grandFinal, 'center')}

              <div className="w-full pt-4 border-t border-slate-800 text-center space-y-1">
                <span className="text-[10px] font-bold text-amber-500 block">المركز الثالث 🥉</span>
                {renderBracketCard(thirdPlaceMatch, 'center')}
              </div>
            </div>

            {/* Right Half Branch from SF2 */}
            <BracketConnector direction="left-to-right" />

            <div className="flex items-center gap-2">
              <div className="flex flex-col justify-center my-auto space-y-1">
                <span className="text-[10px] font-bold text-purple-400 text-center block">نصف النهائي 2</span>
                {renderBracketCard(sf2Match, 'center')}
              </div>
              <BracketConnector direction="left-to-right" />
              <div className="flex flex-col justify-around gap-8">
                {renderQuarterFinalBranch(
                  ['r32_9', 'r32_10', 'r32_11', 'r32_12'],
                  ['r16_5', 'r16_6'],
                  'qf3',
                  'left-to-right'
                )}
                {renderQuarterFinalBranch(
                  ['r32_13', 'r32_14', 'r32_15', 'r32_16'],
                  ['r16_7', 'r16_8'],
                  'qf4',
                  'left-to-right'
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. VIEW MODE: GRID (شبكة البطاقات المفلترة) */}
      {/* ========================================================================= */}
      {viewMode === 'grid' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-2 rounded-2xl border border-slate-800">
            {[
              { key: 'all', label: 'جميع المراحل الإقصائية' },
              { key: 'r32', label: 'دور الـ 32 (16 مواجهة)' },
              { key: 'r16', label: 'دور الـ 16 (8 مواجهات)' },
              { key: 'qf', label: 'دور الـ 8 (ربع النهائي)' },
              { key: 'sf', label: 'دور الـ 4 (نصف النهائي)' },
              { key: 'final', label: 'دور الـ 2 (النهائي والمركز 3 🏆)' },
            ].map((stageItem) => (
              <button
                key={stageItem.key}
                type="button"
                onClick={() => setActiveStageFilter(stageItem.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeStageFilter === stageItem.key
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {stageItem.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {matches
              .filter(m => m.stage !== 'group')
              .filter(m => activeStageFilter === 'all' ? true : m.stage === activeStageFilter)
              .map(m => renderBracketCard(m, 'center'))}
          </div>
        </div>
      )}
    </div>
  );
};
