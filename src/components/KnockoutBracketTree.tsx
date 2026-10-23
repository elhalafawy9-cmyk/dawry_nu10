import React, { useState, useMemo } from 'react';
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
  Zap,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileDown
} from 'lucide-react';
import { TeamLogo } from '../utils/teamLogos';
import { getDynamicR32Matchups, DynamicR32MatchInfo } from '../utils/knockoutDraw';
import { Team } from '../App';
import { AppUser, isSamirAlhalfawy } from '../utils/auth';

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

export type { Team };

interface KnockoutBracketTreeProps {
  matches: Match[];
  teams: Team[];
  isAdmin: boolean;
  currentUser?: AppUser | null;
  onOpenScheduleModal: (match: Match) => void;
  onOpenResultModal: (match: Match) => void;
  onOpenEditMatchup: (match: Match) => void;
  onSelectTeam?: (teamName: string) => void;
  onOpenKnockoutDraw?: () => void;
  onOpenRoundOrganizer?: (stage: string) => void;
  onApplyOfficialReadyDraw?: () => void;
  getGroupStandings?: (groupLetter: string) => Team[];
  onExportPdf?: () => void;
}

export const KnockoutBracketTree: React.FC<KnockoutBracketTreeProps> = ({
  matches,
  teams,
  isAdmin,
  currentUser,
  onOpenScheduleModal,
  onOpenResultModal,
  onOpenEditMatchup,
  onSelectTeam,
  onOpenKnockoutDraw,
  onOpenRoundOrganizer,
  onApplyOfficialReadyDraw,
  getGroupStandings,
  onExportPdf,
}) => {
  // 'symmetrical' = 16 teams Left + 16 teams Right converging to Center Final
  // 'sequential'  = Left-to-Right tree
  // 'grid'        = Standard filterable cards
  const [viewMode, setViewMode] = useState<'symmetrical' | 'sequential' | 'grid'>('symmetrical');
  const [activeStageFilter, setActiveStageFilter] = useState<'all' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Manual modifications are exclusively granted to Samir Alhalfawy
  const isSamir = isSamirAlhalfawy(currentUser);

  // Match lookup map by ID
  const matchMap = new Map<string, Match>();
  matches.forEach(m => matchMap.set(m.id, m));

  // Dynamic live R32 matchups calculated directly from the CURRENT standings of all 8 groups!
  const dynamicR32Map = useMemo(() => {
    return getDynamicR32Matchups(teams, getGroupStandings);
  }, [teams, getGroupStandings, matches]);

  const getMatch = (id: string, fallbackStageName: string): Match => {
    const rawMatch = matchMap.get(id);
    const dyn = dynamicR32Map[id];

    // If it's an R32 match that has not finished yet, dynamically bind its teams to the current group standings!
    if (dyn && (!rawMatch || (rawMatch.status !== 'finished' && rawMatch.scoreA === null && rawMatch.scoreB === null))) {
      return {
        ...(rawMatch || {
          id,
          stage: 'r32',
          stageName: fallbackStageName,
          scoreA: null,
          scoreB: null,
          status: 'upcoming',
          date: '',
          time: '',
          pitch: '',
          isScheduled: false,
        }),
        teamA: dyn.teamA,
        teamB: dyn.teamB,
      };
    }

    return rawMatch || {
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
    const dyn = dynamicR32Map[m.id];

    return (
      <div 
        key={m.id}
        dir="rtl"
        className={`w-[280px] sm:w-[305px] shrink-0 bg-slate-900/95 backdrop-blur-md border rounded-2xl transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-[1.01] hover:border-amber-500/70 ${
          isLive 
            ? 'border-rose-500/80 ring-2 ring-rose-500/30' 
            : isCenter
              ? 'border-amber-500/60 shadow-amber-500/15'
              : isFinished 
                ? 'border-slate-800' 
                : m.isScheduled 
                  ? 'border-blue-500/40' 
                  : 'border-slate-800/90'
        } p-3.5 space-y-2.5 select-none`}
      >
        {/* Header: Stage Name & Match Status / Schedule */}
        <div className="flex items-center justify-between text-xs text-slate-300 border-b border-slate-800 pb-2 gap-1.5">
          <span className="font-black text-amber-400 truncate max-w-[160px] flex items-center gap-1.5">
            {isCenter && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
            <span className="truncate">{m.stageName}</span>
          </span>

          <div className="shrink-0 flex items-center gap-1 font-mono text-[10px]">
            {isLive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-black animate-pulse border border-rose-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                د{m.minute || '1'}'
              </span>
            ) : isFinished ? (
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
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
          <div className="flex items-center gap-1.5 text-[10px] text-slate-300 bg-slate-950/70 px-2 py-0.5 rounded truncate">
            <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
            <span className="truncate font-medium">{m.pitch}</span>
          </div>
        )}

        {/* Teams and Scores */}
        <div className="space-y-1.5">
          {/* Team A */}
          <div className={`px-2.5 py-2 rounded-xl flex items-center justify-between text-sm font-black transition-colors ${
            winnerA 
              ? 'bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 shadow-sm' 
              : 'bg-slate-950 border border-slate-800/90 text-white'
          }`}>
            <button
              type="button"
              onClick={() => onSelectTeam && onSelectTeam(m.teamA)}
              className="flex items-center gap-2 hover:text-amber-300 truncate cursor-pointer text-right max-w-[75%]"
              title={m.teamA}
            >
              <TeamLogo teamName={m.teamA} size="sm" className="w-5 h-5 shrink-0" />
              <span className="truncate text-xs sm:text-sm font-black">{m.teamA}</span>
              {dyn && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-900 text-amber-300 border border-amber-500/30 shrink-0">
                  {dyn.seedLabelA}
                </span>
              )}
            </button>
            <div className="flex items-center gap-1 font-mono shrink-0">
              {winnerA && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              <span className={`text-sm px-2 py-0.5 rounded font-mono ${winnerA ? 'font-black text-emerald-300 bg-emerald-900/50 ring-1 ring-emerald-500/40' : 'text-slate-200 bg-slate-900'}`}>
                {sA !== null ? sA : '-'}
              </span>
            </div>
          </div>

          {/* Team B */}
          <div className={`px-2.5 py-2 rounded-xl flex items-center justify-between text-sm font-black transition-colors ${
            winnerB 
              ? 'bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 shadow-sm' 
              : 'bg-slate-950 border border-slate-800/90 text-white'
          }`}>
            <button
              type="button"
              onClick={() => onSelectTeam && onSelectTeam(m.teamB)}
              className="flex items-center gap-2 hover:text-amber-300 truncate cursor-pointer text-right max-w-[75%]"
              title={m.teamB}
            >
              <TeamLogo teamName={m.teamB} size="sm" className="w-5 h-5 shrink-0" />
              <span className="truncate text-xs sm:text-sm font-black">{m.teamB}</span>
              {dyn && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-900 text-amber-300 border border-amber-500/30 shrink-0">
                  {dyn.seedLabelB}
                </span>
              )}
            </button>
            <div className="flex items-center gap-1 font-mono shrink-0">
              {winnerB && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              <span className={`text-sm px-2 py-0.5 rounded font-mono ${winnerB ? 'font-black text-emerald-300 bg-emerald-900/50 ring-1 ring-emerald-500/40' : 'text-slate-200 bg-slate-900'}`}>
                {sB !== null ? sB : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Scorers Summary if present */}
        {m.scorersSummary && (
          <p className="text-[10px] text-slate-300 truncate bg-slate-950/60 px-2 py-1 rounded border border-slate-800/60">
            ⚽ {m.scorersSummary}
          </p>
        )}

        {/* Admin Quick Action Buttons */}
        {isAdmin && (
          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between gap-1.5 text-xs">
            {isSamir && (
              <button
                type="button"
                onClick={() => onOpenEditMatchup(m)}
                className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 cursor-pointer transition-colors"
                title="تعديل طرفي المباراة (حصري للمشرف العام سمير الحلفاوي)"
              >
                الطرفين ⚙️
              </button>
            )}
            <div className={`flex items-center gap-1.5 ${!isSamir ? 'w-full justify-end' : ''}`}>
              <button
                type="button"
                onClick={() => onOpenScheduleModal(m)}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer transition-colors"
                title="تحديد الموعد والملعب"
              >
                {m.isScheduled ? 'الميعاد' : 'موعد'}
              </button>
              <button
                type="button"
                onClick={() => onOpenResultModal(m)}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-sm cursor-pointer transition-colors"
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
      <div className="w-10 flex items-center justify-center shrink-0">
        <svg className="w-full h-full stroke-slate-700" viewBox="0 0 32 100" fill="none" preserveAspectRatio="none">
          {direction === 'left-to-right' ? (
            <>
              {/* Top match line out */}
              <path d="M 0 25 H 16 V 50 H 32" strokeWidth="2.5" strokeLinecap="round" />
              {/* Bottom match line out */}
              <path d="M 0 75 H 16 V 50 H 32" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : (
            <>
              {/* Top match line in from right */}
              <path d="M 32 25 H 16 V 50 H 0" strokeWidth="2.5" strokeLinecap="round" />
              {/* Bottom match line in from right */}
              <path d="M 32 75 H 16 V 50 H 0" strokeWidth="2.5" strokeLinecap="round" />
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
      {/* ========================================================================= */}
      {/* 1. Header Banner & View Mode Selectors */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 p-5 md:p-6 rounded-3xl shadow-xl space-y-4">
        {/* Title and Description full width */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
            <Swords className="w-3.5 h-3.5" />
            <span>الشجرة الإقصائية العالمية المتوازنة (16 فريقاً يميناً و 16 يساراً 🏆)</span>
          </div>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-white flex items-center gap-2.5">
            <span>شجرة البطولة: صعود متطابق ومتوازن نحو النهائي الكبير</span>
            <span className="text-2xl">🏆</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-4xl">
            مسار الأدوار الإقصائية المعتمد: يتأهل <strong className="text-emerald-400">أول 4 فرق من كل مجموعة (32 فريقاً)</strong> وتتغير المواجهات تلقائياً بحسب الترتيب الحالي اللحظي للمجموعات. <strong className="text-amber-400">قاعدة صارمة: لا يلتقي أي فريقين من نفس المجموعة نهائياً قبل دور نصف النهائي 🏆</strong>.
          </p>
        </div>

        {/* View Mode Switcher and Zoom Controls Toolbar */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 shadow-inner">
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

          {/* Export Knockout PDF Button */}
          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs shadow-lg shadow-red-950/40 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] border border-rose-400/30"
              title="تصدير وتحميل جدول الأدوار الإقصائية كملف PDF رسمي معتمد"
            >
              <FileDown className="w-4 h-4 text-amber-200" />
              <span>تحميل جدول الأدوار الإقصائية (PDF) 📄</span>
            </button>
          )}

          {/* Interactive Zoom Level Controls */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-bold ml-1 hidden sm:inline">حجم العرض:</span>
            <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 shadow-inner">
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(70, prev - 10))}
                className="w-7 h-7 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                title="تصغير شجرة الأدوار الإقصائية (-10%)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-black text-amber-300 px-2 min-w-[50px] text-center select-none">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(140, prev + 10))}
                className="w-7 h-7 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                title="تكبير شجرة الأدوار الإقصائية (+10%)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {zoomLevel !== 100 && (
                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className="w-7 h-7 ml-0.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                  title="استعادة الحجم الطبيعي 100%"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
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

          <div 
            dir="ltr" 
            style={{ 
              transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined, 
              transformOrigin: 'center top' 
            }}
            className="w-max min-w-[3400px] flex items-center justify-start xl:justify-center gap-4 py-8 px-10 mx-auto transition-transform duration-150"
          >
            {/* ================================================================= */}
            {/* ⬅️ LEFT HALF (النصف الأيسر: 16 فريقاً / 8 مباريات دور 32 صعوداً لـ SF1) */}
            {/* ================================================================= */}
            <div className="flex items-center gap-4">
              {/* Branch 1 of Left: 8 R32 -> 4 R16 -> 2 QF */}
              <div className="flex flex-col justify-around gap-14">
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
                  <span className="text-xs font-black text-purple-300 bg-purple-950/60 px-3 py-1 rounded-full border border-purple-500/40 shadow-sm">
                    نصف النهائي (1) 🏆
                  </span>
                </div>
                {renderBracketCard(sf1Match, 'left')}
              </div>
            </div>

            {/* Line connecting SF1 to Final */}
            <div className="w-8 flex items-center justify-center shrink-0">
              <svg className="w-full h-5 stroke-amber-500/70" viewBox="0 0 24 16" fill="none">
                <path d="M 0 8 H 24" strokeWidth="2.5" strokeDasharray="3 3" />
              </svg>
            </div>

            {/* ================================================================= */}
            {/* 🏆 CENTER (المنتصف: النهائي الكبير ومباراة المركز الثالث والتتويج) */}
            {/* ================================================================= */}
            <div className="w-[350px] sm:w-[370px] shrink-0 flex flex-col items-center justify-center px-4 space-y-7">
              {/* Final Header Podium Badge */}
              <div className="text-center space-y-1.5">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 p-0.5 shadow-xl shadow-amber-500/40 animate-pulse">
                  <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
                    <Trophy className="w-9 h-9 text-amber-400" />
                  </div>
                </div>
                <h3 className="text-lg font-black text-amber-300 pt-1">
                  المباراة النهائية الكبرى 🏆
                </h3>
                <span className="text-xs text-slate-300 block font-mono">
                  بطل دوري جامعة النيل 2026
                </span>
              </div>

              {/* Grand Final Card */}
              <div className="w-full flex justify-center">
                {renderBracketCard(grandFinal, 'center')}
              </div>

              {/* Third Place Match Card */}
              <div className="w-full pt-4 border-t border-slate-800/80 text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-black text-amber-400">
                  <Medal className="w-4 h-4 text-amber-500" />
                  <span>مباراة تحديد المركز الثالث 🥉</span>
                </div>
                <div className="flex justify-center">
                  {renderBracketCard(thirdPlaceMatch, 'center')}
                </div>
              </div>
            </div>

            {/* Line connecting Final to SF2 */}
            <div className="w-8 flex items-center justify-center shrink-0">
              <svg className="w-full h-5 stroke-amber-500/70" viewBox="0 0 24 16" fill="none">
                <path d="M 0 8 H 24" strokeWidth="2.5" strokeDasharray="3 3" />
              </svg>
            </div>

            {/* ================================================================= */}
            {/* ➡️ RIGHT HALF (النصف الأيمن: 16 فريقاً / 8 مباريات دور 32 صعوداً لـ SF2) */}
            {/* ================================================================= */}
            <div className="flex items-center gap-4">
              {/* Semi-Final 2 (نصف النهائي 2) in exact vertical center of the right half */}
              <div className="flex flex-col justify-center my-auto">
                <div className="text-center pb-2">
                  <span className="text-xs font-black text-purple-300 bg-purple-950/60 px-3 py-1 rounded-full border border-purple-500/40 shadow-sm">
                    نصف النهائي (2) 🏆
                  </span>
                </div>
                {renderBracketCard(sf2Match, 'right')}
              </div>

              {/* Connector from SF2 to QF3 & QF4 */}
              <BracketConnector direction="right-to-left" />

              {/* Branch 2 of Right: 2 QF -> 4 R16 -> 8 R32 */}
              <div className="flex flex-col justify-around gap-14">
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

          <div 
            style={{ 
              transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined, 
              transformOrigin: 'left top' 
            }}
            className="min-w-[1800px] flex items-center gap-3 py-6 transition-transform duration-150"
          >
            {/* Left Half Branch leading to SF1 */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col justify-around gap-10">
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
              <div className="flex flex-col justify-center my-auto space-y-1.5">
                <span className="text-xs font-bold text-purple-400 text-center block">نصف النهائي 1 🏆</span>
                {renderBracketCard(sf1Match, 'center')}
              </div>
            </div>

            {/* Central Connector to Grand Final */}
            <BracketConnector direction="left-to-right" />

            {/* Grand Final & 3rd Place */}
            <div className="w-[340px] shrink-0 flex flex-col items-center justify-center px-3 space-y-6">
              <div className="text-center space-y-1">
                <Trophy className="w-9 h-9 text-amber-400 mx-auto animate-pulse" />
                <h4 className="text-base font-black text-amber-300">النهائي الكبير 🏆</h4>
              </div>
              {renderBracketCard(grandFinal, 'center')}

              <div className="w-full pt-4 border-t border-slate-800 text-center space-y-1">
                <span className="text-xs font-bold text-amber-500 block">المركز الثالث 🥉</span>
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
