import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Shirt, 
  X, 
  Check, 
  Save, 
  ArrowRightLeft, 
  Shield, 
  Sparkles, 
  Crown, 
  AlertCircle,
  Clock,
  MapPin,
  Calendar,
  RotateCcw,
  Zap,
  CheckCircle2,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Match, Team } from '../App';
import { Player } from '../utils/roster';
import { isMatchStarted } from '../utils/roundLock';

interface MatchLineupModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  teams: Team[];
  squads: Record<string, Player[]>;
  onSaveLineup: (
    matchId: string, 
    lineups: {
      teamAStarters: string[];
      teamABench: string[];
      teamBStarters: string[];
      teamBBench: string[];
    }
  ) => void;
  readOnly?: boolean;
}

export const MatchLineupModal: React.FC<MatchLineupModalProps> = ({
  isOpen,
  onClose,
  match,
  teams,
  squads,
  onSaveLineup,
  readOnly = false,
}) => {
  const [activeTabTeam, setActiveTabTeam] = useState<'both' | 'A' | 'B'>('both');

  // Team A Lineup State
  const [teamAStarters, setTeamAStarters] = useState<string[]>([]);
  const [teamABench, setTeamABench] = useState<string[]>([]);

  // Team B Lineup State
  const [teamBStarters, setTeamBStarters] = useState<string[]>([]);
  const [teamBBench, setTeamBBench] = useState<string[]>([]);

  // Initialize or re-sync when modal opens or match changes
  useEffect(() => {
    if (!match) return;

    const squadA = squads[match.teamA] || [];
    const squadB = squads[match.teamB] || [];

    // Helper to initialize starters/bench
    const initTeam = (squad: Player[], savedStarters?: string[], savedBench?: string[]) => {
      const allNames = squad.map(p => p.name);

      if (savedStarters && savedStarters.length > 0) {
        // Use saved configuration
        const validStarters = savedStarters.filter(n => allNames.includes(n));
        const validBench = (savedBench || []).filter(n => allNames.includes(n) && !validStarters.includes(n));
        // Any remaining players go to bench
        const unassigned = allNames.filter(n => !validStarters.includes(n) && !validBench.includes(n));
        return {
          starters: validStarters,
          bench: [...validBench, ...unassigned]
        };
      } else {
        // Default: first 7 players starters (common 7-a-side format) and rest on bench
        const defaultStarterCount = Math.min(7, squad.length);
        const starters = squad.slice(0, defaultStarterCount).map(p => p.name);
        const bench = squad.slice(defaultStarterCount).map(p => p.name);
        return { starters, bench };
      }
    };

    const teamAConfig = initTeam(squadA, match.lineups?.teamAStarters, match.lineups?.teamABench);
    const teamBConfig = initTeam(squadB, match.lineups?.teamBStarters, match.lineups?.teamBBench);

    setTeamAStarters(teamAConfig.starters);
    setTeamABench(teamAConfig.bench);
    setTeamBStarters(teamBConfig.starters);
    setTeamBBench(teamBConfig.bench);
  }, [match, squads, isOpen]);

  if (!isOpen || !match) return null;

  const matchStarted = match ? isMatchStarted(match) : false;
  const effectiveReadOnly = readOnly || matchStarted;

  const squadA = squads[match.teamA] || [];
  const squadB = squads[match.teamB] || [];
  const teamAObj = teams.find(t => t.name === match.teamA);
  const teamBObj = teams.find(t => t.name === match.teamB);

  // Toggle single player between starter and bench
  const handleTogglePlayer = (team: 'A' | 'B', playerName: string) => {
    if (effectiveReadOnly) return;
    if (team === 'A') {
      if (teamAStarters.includes(playerName)) {
        setTeamAStarters(prev => prev.filter(n => n !== playerName));
        setTeamABench(prev => [...prev, playerName]);
      } else {
        setTeamABench(prev => prev.filter(n => n !== playerName));
        setTeamAStarters(prev => [...prev, playerName]);
      }
    } else {
      if (teamBStarters.includes(playerName)) {
        setTeamBStarters(prev => prev.filter(n => n !== playerName));
        setTeamBBench(prev => [...prev, playerName]);
      } else {
        setTeamBBench(prev => prev.filter(n => n !== playerName));
        setTeamBStarters(prev => [...prev, playerName]);
      }
    }
  };

  // Presets
  const applyPreset = (team: 'A' | 'B', type: 'first7' | 'first9' | 'allStarters' | 'allBench' | 'invert') => {
    if (effectiveReadOnly) return;
    const squad = team === 'A' ? squadA : squadB;
    const allNames = squad.map(p => p.name);

    let newStarters: string[] = [];
    let newBench: string[] = [];

    if (type === 'first7') {
      newStarters = allNames.slice(0, Math.min(7, allNames.length));
      newBench = allNames.slice(Math.min(7, allNames.length));
    } else if (type === 'first9') {
      newStarters = allNames.slice(0, Math.min(9, allNames.length));
      newBench = allNames.slice(Math.min(9, allNames.length));
    } else if (type === 'allStarters') {
      newStarters = [...allNames];
      newBench = [];
    } else if (type === 'allBench') {
      newStarters = [];
      newBench = [...allNames];
    } else if (type === 'invert') {
      const currentStarters = team === 'A' ? teamAStarters : teamBStarters;
      newStarters = allNames.filter(n => !currentStarters.includes(n));
      newBench = allNames.filter(n => currentStarters.includes(n));
    }

    if (team === 'A') {
      setTeamAStarters(newStarters);
      setTeamABench(newBench);
    } else {
      setTeamBStarters(newStarters);
      setTeamBBench(newBench);
    }
  };

  const handleSave = () => {
    onSaveLineup(match.id, {
      teamAStarters,
      teamABench,
      teamBStarters,
      teamBBench,
    });
    confetti({ particleCount: 50, spread: 60 });
    onClose();
  };

  const renderPositionBadge = (pos: Player['position']) => {
    switch (pos) {
      case 'GK':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">حارس</span>;
      case 'DEF':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">مدافع</span>;
      case 'MID':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">وسط</span>;
      case 'FWD':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">مهاجم</span>;
      default:
        return null;
    }
  };

  const renderTeamSection = (
    teamLetter: 'A' | 'B',
    teamName: string,
    teamObj: Team | undefined,
    squad: Player[],
    starters: string[],
    bench: string[]
  ) => {
    const isTeamA = teamLetter === 'A';
    const accentBorder = isTeamA ? 'border-blue-500/40' : 'border-indigo-500/40';
    const accentGrad = isTeamA ? 'from-blue-950/40' : 'from-indigo-950/40';

    return (
      <div className={`space-y-4 bg-slate-950/80 p-4 md:p-5 rounded-3xl border ${accentBorder} bg-gradient-to-b ${accentGrad} to-slate-950 shadow-xl flex flex-col justify-between`}>
        {/* Team Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md border border-white/10"
                style={{ backgroundColor: teamObj?.logoColor || (isTeamA ? '#2563eb' : '#4f46e5') }}
              >
                {teamName.charAt(0)}
              </div>
              <div>
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  <span>{teamName}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    {isTeamA ? 'الفريق الأول (A)' : 'الفريق الثاني (B)'}
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  إجمالي المسجلين في القائمة: <strong className="text-slate-200 font-mono">{squad.length} لاعبين</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                {starters.length} أساسي
              </span>
              <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                {bench.length} بديل
              </span>
            </div>
          </div>

          {/* Quick Presets Bar */}
          {!effectiveReadOnly && (
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-2 rounded-2xl border border-slate-800/80 text-[11px]">
              <span className="text-slate-400 font-bold ml-1 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>إعدادات سريعة:</span>
              </span>
              <button
                type="button"
                onClick={() => applyPreset(teamLetter, 'first7')}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
                title="تحديد أول 7 لاعبين كأساسيين والباقي بدلاء"
              >
                أول 7 أساسيين
              </button>
              <button
                type="button"
                onClick={() => applyPreset(teamLetter, 'first9')}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
                title="تحديد أول 9 لاعبين كأساسيين"
              >
                أول 9 أساسيين
              </button>
              <button
                type="button"
                onClick={() => applyPreset(teamLetter, 'invert')}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold transition-colors cursor-pointer flex items-center gap-1"
                title="عكس التشكيل (تبديل الأساسيين بالبدلاء)"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>عكس التشكيل</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset(teamLetter, 'allBench')}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 font-bold transition-colors cursor-pointer"
                title="تحديد الكل كبدلاء"
              >
                الكل بدلاء
              </button>
            </div>
          )}

          {/* TWO ZONES: STARTERS (أساسي) vs BENCH (بديل) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            
            {/* 🟢 ZONE 1: STARTERS */}
            <div className="p-3.5 bg-slate-900/90 rounded-2xl border-2 border-emerald-500/40 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <strong className="text-xs font-black text-emerald-300">
                    🟢 التشكيل الأساسي ({starters.length})
                  </strong>
                </div>
                <span className="text-[10px] text-slate-400">انقر للتبديل للدكة</span>
              </div>

              {starters.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-slate-800 rounded-xl space-y-1">
                  <p className="text-xs text-slate-500 font-bold">لا يوجد لاعبون أساسيون بعد</p>
                  <p className="text-[10px] text-slate-600">انقر على اللاعبين من قائمة البدلاء أو اختر «أول 7 أساسيين»</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {starters.map((pName) => {
                    const player = squad.find(p => p.name === pName);
                    return (
                      <div
                        key={pName}
                        onClick={() => handleTogglePlayer(teamLetter, pName)}
                        className={`p-2.5 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between gap-2.5 transition-all ${
                          effectiveReadOnly 
                            ? 'cursor-default' 
                            : 'cursor-pointer hover:bg-emerald-950/40 hover:border-emerald-400 hover:shadow-md'
                        }`}
                        title={effectiveReadOnly ? pName : `انقر لنقل ${pName} إلى دكة البدلاء`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-black text-xs flex items-center justify-center shrink-0 border border-emerald-500/30">
                            #{player?.number || '—'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <strong className="text-xs md:text-sm font-bold text-white truncate block">{pName}</strong>
                              {player?.isCaptain && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {player && renderPositionBadge(player.position)}
                            </div>
                          </div>
                        </div>

                        {!effectiveReadOnly && (
                          <span className="px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30 text-[10px] font-bold shrink-0 transition-all flex items-center gap-1">
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>للدكة</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 🟡 ZONE 2: BENCH (دكة البدلاء) */}
            <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  <strong className="text-xs font-black text-slate-300">
                    🟡 دكة البدلاء / الاحتياط ({bench.length})
                  </strong>
                </div>
                <span className="text-[10px] text-slate-400">انقر لنقله للأساسي</span>
              </div>

              {bench.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-slate-800 rounded-xl space-y-1">
                  <p className="text-xs text-slate-500 font-bold">دكة البدلاء فارغة</p>
                  <p className="text-[10px] text-slate-600">جميع لاعبي الفريق مسجلون في التشكيل الأساسي</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {bench.map((pName) => {
                    const player = squad.find(p => p.name === pName);
                    return (
                      <div
                        key={pName}
                        onClick={() => handleTogglePlayer(teamLetter, pName)}
                        className={`p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-2.5 transition-all ${
                          effectiveReadOnly 
                            ? 'cursor-default' 
                            : 'cursor-pointer hover:bg-slate-800 hover:border-emerald-500/50 hover:shadow-md'
                        }`}
                        title={effectiveReadOnly ? pName : `انقر لنقل ${pName} إلى التشكيل الأساسي`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 font-mono font-black text-xs flex items-center justify-center shrink-0">
                            #{player?.number || '—'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <strong className="text-xs md:text-sm font-bold text-slate-200 truncate block">{pName}</strong>
                              {player?.isCaptain && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {player && renderPositionBadge(player.position)}
                            </div>
                          </div>
                        </div>

                        {!effectiveReadOnly && (
                          <span className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/30 text-[10px] font-bold shrink-0 transition-all flex items-center gap-1">
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>للأساسي</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in" dir="rtl">
      <div className="bg-slate-900 border border-emerald-500/30 w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 p-5 md:p-6 border-b border-emerald-500/30">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                  <Shirt className="w-3.5 h-3.5" />
                  <span>تحديد التشكيل والبدلاء لكل مباراة 📋</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {match.stageName} {match.group ? `(المجموعة ${match.group})` : ''}
                </span>
              </div>

              <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                <span className="text-emerald-400">{match.teamA}</span>
                <span className="text-slate-400 text-sm font-mono">ضد</span>
                <span className="text-blue-400">{match.teamB}</span>
              </h3>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{match.date || 'لم يحدد التاريخ بعد'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>{match.time || '—'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>{match.pitch || '—'}</span>
                </span>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer self-end md:self-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Notice / Lock Banner */}
          {matchStarted ? (
            <div className="mt-3 p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
              <Lock className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
              <span>
                🔒 انطلقت المباراة أو حان موعدها رسمياً! تم قفل تعديل التشكيل الأساسي والبدلاء ولا يمكن إجراء أي تعديل بعد انطلاق صافرة البداية (وضع العرض فقط).
              </span>
            </div>
          ) : (
            <div className="mt-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                يمكنك هنا تحديد الأساسيين والبدلاء للمباراة. بمجرد انطلاق المباراة، سيتم قفل التشكيل نهائياً ومنع التعديل.
              </span>
            </div>
          )}
        </div>

        {/* TEAM SWITCHER TABS (FOR MOBILE / RESPONSIVE) */}
        <div className="px-5 pt-4 pb-2 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-900">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTabTeam('both')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTabTeam === 'both' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              عرض الفريقين معاً 👥
            </button>
            <button
              type="button"
              onClick={() => setActiveTabTeam('A')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTabTeam === 'A' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {match.teamA} فقط
            </button>
            <button
              type="button"
              onClick={() => setActiveTabTeam('B')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTabTeam === 'B' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {match.teamB} فقط
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>حفظ تلقائي للمباراة</span>
            </span>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1">
          {activeTabTeam === 'both' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderTeamSection('A', match.teamA, teamAObj, squadA, teamAStarters, teamABench)}
              {renderTeamSection('B', match.teamB, teamBObj, squadB, teamBStarters, teamBBench)}
            </div>
          ) : activeTabTeam === 'A' ? (
            renderTeamSection('A', match.teamA, teamAObj, squadA, teamAStarters, teamABench)
          ) : (
            renderTeamSection('B', match.teamB, teamBObj, squadB, teamBStarters, teamBBench)
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 md:p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>التشكيل المعتمد:</span>
            <span className="font-bold text-white font-mono">{match.teamA}: {teamAStarters.length} أساسي</span>
            <span>•</span>
            <span className="font-bold text-white font-mono">{match.teamB}: {teamBStarters.length} أساسي</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            {!effectiveReadOnly ? (
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs md:text-sm shadow-xl shadow-emerald-600/30 cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <Save className="w-4 h-4" />
                <span>حفظ واعتماد تشكيل المباراة 💾</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 font-bold">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>التشكيل مقفل (انطلقت المباراة)</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
