import React, { useState, useMemo } from 'react';
import { 
  Swords, 
  X, 
  Check, 
  Plus, 
  Trash2, 
  RotateCw, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Layers,
  ArrowRightLeft,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Match, Team } from '../App';

interface RoundMatchupOrganizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Match[];
  teams: Team[];
  onSaveMatches: (updatedMatches: Match[]) => void;
  initialGroup?: string;
  initialRound?: number;
  initialStage?: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final';
  onOpenKnockoutDraw?: () => void;
}

export const RoundMatchupOrganizerModal: React.FC<RoundMatchupOrganizerModalProps> = ({
  isOpen,
  onClose,
  matches,
  teams,
  onSaveMatches,
  initialGroup = 'A',
  initialRound = 1,
  initialStage = 'group',
  onOpenKnockoutDraw,
}) => {
  const [stageType, setStageType] = useState<'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'>(initialStage);
  const [selectedGroup, setSelectedGroup] = useState<string>(initialGroup);
  const [selectedRound, setSelectedRound] = useState<number>(initialRound);
  const [activeSubTab, setActiveSubTab] = useState<'builder' | 'paste'>('builder');
  const [pasteText, setPasteText] = useState<string>('');

  // Local copy of round matches being edited
  const currentRoundMatches = useMemo(() => {
    if (stageType === 'group') {
      return matches.filter(m => m.stage === 'group' && m.group === selectedGroup && m.round === selectedRound);
    } else {
      return matches.filter(m => m.stage === stageType);
    }
  }, [matches, stageType, selectedGroup, selectedRound]);

  // Working state for the current round matches
  const [roundMatchesState, setRoundMatchesState] = useState<Match[]>([]);

  // Synchronize when round or stage changes
  React.useEffect(() => {
    setRoundMatchesState(currentRoundMatches.map(m => ({ ...m })));
  }, [currentRoundMatches]);

  // Teams available in current scope
  const availableTeams = useMemo(() => {
    if (stageType === 'group') {
      return teams.filter(t => t.group === selectedGroup);
    }
    // For knockout, all 48 teams are available to pick from
    return teams;
  }, [teams, stageType, selectedGroup]);

  // Check which teams in the group are already paired in this round
  const assignedTeamNames = useMemo(() => {
    const set = new Set<string>();
    roundMatchesState.forEach(m => {
      if (m.teamA && !m.teamA.startsWith('فريق متأهل') && !m.teamA.startsWith('طرف المباراة')) {
        set.add(m.teamA);
      }
      if (m.teamB && !m.teamB.startsWith('فريق متأهل') && !m.teamB.startsWith('طرف المباراة')) {
        set.add(m.teamB);
      }
    });
    return set;
  }, [roundMatchesState]);

  if (!isOpen) return null;

  // Handlers for modifying matchups in the current round
  const handleUpdateTeamA = (matchId: string, newTeamA: string) => {
    setRoundMatchesState(prev => prev.map(m => m.id === matchId ? { ...m, teamA: newTeamA } : m));
  };

  const handleUpdateTeamB = (matchId: string, newTeamB: string) => {
    setRoundMatchesState(prev => prev.map(m => m.id === matchId ? { ...m, teamB: newTeamB } : m));
  };

  const handleSwapTeams = (matchId: string) => {
    setRoundMatchesState(prev => prev.map(m => {
      if (m.id === matchId) {
        return { ...m, teamA: m.teamB, teamB: m.teamA };
      }
      return m;
    }));
  };

  const handleAddNewMatchToRound = () => {
    const newId = `round_match_${Date.now()}`;
    const stageName = stageType === 'group' 
      ? `المجموعة ${selectedGroup} (الجولة ${selectedRound})`
      : stageType === 'r32'
      ? `دور الـ 32 (مباراة إضافية)`
      : `مباراة في ${stageType}`;

    const newMatch: Match = {
      id: newId,
      stage: stageType,
      stageName,
      group: stageType === 'group' ? selectedGroup : undefined,
      round: stageType === 'group' ? selectedRound : undefined,
      teamA: availableTeams[0]?.name || 'فريق 1',
      teamB: availableTeams[1]?.name || 'فريق 2',
      scoreA: null,
      scoreB: null,
      status: 'upcoming',
      date: '',
      time: '',
      pitch: '',
      isScheduled: false,
    };

    setRoundMatchesState(prev => [...prev, newMatch]);
  };

  const handleDeleteMatchFromRound = (matchId: string) => {
    setRoundMatchesState(prev => prev.filter(m => m.id !== matchId));
  };

  // Paste Parsing Handler
  const handleApplyPastedMatchups = () => {
    const lines = pasteText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('===') && !l.startsWith('//'));

    if (lines.length === 0) {
      alert('يرجى كتابة أو لصق أطراف المباريات أولاً!');
      return;
    }

    const parsedPairs: { teamA: string; teamB: string }[] = [];

    lines.forEach(line => {
      // Clean numbered prefixes like "1. برشلونة ضد ميلان" or "1 - "
      const cleaned = line.replace(/^[0-9]+[\.\-\)\s]+/, '').trim();
      
      // Split on "ضد" or "vs" or "-" or "—"
      let parts: string[] = [];
      if (cleaned.includes(' ضد ')) {
        parts = cleaned.split(' ضد ');
      } else if (cleaned.toLowerCase().includes(' vs ')) {
        parts = cleaned.split(/ vs /i);
      } else if (cleaned.includes(' - ')) {
        parts = cleaned.split(' - ');
      } else if (cleaned.includes('-')) {
        parts = cleaned.split('-');
      } else if (cleaned.includes('،')) {
        parts = cleaned.split('،');
      } else if (cleaned.includes(',')) {
        parts = cleaned.split(',');
      }

      if (parts.length >= 2) {
        const teamA = parts[0].trim();
        const teamB = parts[1].trim();
        if (teamA && teamB) {
          parsedPairs.push({ teamA, teamB });
        }
      }
    });

    if (parsedPairs.length === 0) {
      alert('لم نتمكن من تحليل الأطراف. يرجى كتابتها بصيغة: فريق 1 ضد فريق 2');
      return;
    }

    // Apply to working round matches
    setRoundMatchesState(prev => {
      const updated = [...prev];
      parsedPairs.forEach((pair, idx) => {
        if (idx < updated.length) {
          updated[idx] = { ...updated[idx], teamA: pair.teamA, teamB: pair.teamB };
        } else {
          // Create new match if more pairs pasted than existing matches
          const newId = `pasted_${Date.now()}_${idx}`;
          const stageName = stageType === 'group' 
            ? `المجموعة ${selectedGroup} (الجولة ${selectedRound})`
            : `مباراة ${idx + 1}`;
          updated.push({
            id: newId,
            stage: stageType,
            stageName,
            group: stageType === 'group' ? selectedGroup : undefined,
            round: stageType === 'group' ? selectedRound : undefined,
            teamA: pair.teamA,
            teamB: pair.teamB,
            scoreA: null,
            scoreB: null,
            status: 'upcoming',
            date: '',
            time: '',
            pitch: '',
            isScheduled: false,
          });
        }
      });
      return updated;
    });

    setActiveSubTab('builder');
    alert(`تم تطبيق ${parsedPairs.length} مواجهات بنجاح في الجولة! اضغط "حفظ المواجهات" لاعتمادها.`);
  };

  // Save all matches
  const handleSaveAll = () => {
    // Map over all tournament matches: replace matches in this round with updated ones
    const currentRoundIds = new Set(roundMatchesState.map(m => m.id));
    const otherMatches = matches.filter(m => {
      if (stageType === 'group') {
        const isThisRound = m.stage === 'group' && m.group === selectedGroup && m.round === selectedRound;
        return !isThisRound;
      } else {
        return m.stage !== stageType;
      }
    });

    const finalMatches = [...otherMatches, ...roundMatchesState];
    onSaveMatches(finalMatches);

    confetti({ particleCount: 60, spread: 70 });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full shadow-2xl flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 p-5 md:p-6 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                <span>ترتيب وتحديد مواجهات الجولات والأدوار</span>
                <span className="text-amber-400 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 font-bold">
                  (مين يلاعب مين)
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                اختر الجولة أو الدور الإقصائي وحدد طرفي كل مباراة بالشكل الذي تريده تماماً.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stage & Round Selector Ribbon */}
        <div className="p-4 md:p-5 bg-slate-950/70 border-b border-slate-800 space-y-3 shrink-0">
          
          {/* Stage Types Selector */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold ml-1">نوع الدور:</span>
            {[
              { id: 'group', label: 'دور المجموعات (5 جولات)' },
              { id: 'r32', label: 'دور الـ 32' },
              { id: 'r16', label: 'دور الـ 16' },
              { id: 'qf', label: 'ربع النهائي' },
              { id: 'sf', label: 'نصف النهائي' },
              { id: 'final', label: 'النهائي 🏆' },
            ].map(st => (
              <button
                key={st.id}
                onClick={() => setStageType(st.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  stageType === st.id
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Group & Round Selectors (when Group Stage is active) */}
          {stageType === 'group' && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">المجموعة:</span>
                <div className="flex flex-wrap gap-1">
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(g => (
                    <button
                      key={g}
                      onClick={() => setSelectedGroup(g)}
                      className={`w-8 h-8 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                        selectedGroup === g
                          ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400'
                          : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">الجولة:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5].map(r => (
                    <button
                      key={r}
                      onClick={() => setSelectedRound(r)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedRound === r
                          ? 'bg-teal-600 text-white shadow-md ring-2 ring-teal-400'
                          : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                      }`}
                    >
                      الجولة {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {stageType !== 'group' && onOpenKnockoutDraw && (
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/30 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300">
                  يمكنك إجراء قرعة عشوائية ذكية مع الشروط المخصصة (عزل أول 7 عن أول وثاني 4، وتفادي التقاء فرق المجموعة قبل نصف النهائي).
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenKnockoutDraw();
                }}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition-all cursor-pointer shrink-0 shadow-md shadow-emerald-600/20"
              >
                فتح قرعة الأدوار الإقصائية 🎲
              </button>
            </div>
          )}

          {/* Tab Switcher: Builder vs Quick Paste */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setActiveSubTab('builder')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'builder'
                  ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              قوائم التحديد والترتيب
            </button>
            <button
              onClick={() => setActiveSubTab('paste')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'paste'
                  ? 'bg-slate-800 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              لصق سريع لمواجهات الجولة (نصياً)
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-4 flex-1">

          {/* TAB 1: BUILDER */}
          {activeSubTab === 'builder' && (
            <div className="space-y-4">
              
              {/* Group Teams Status Ribbon (which teams are paired and which are free) */}
              {stageType === 'group' && (
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">
                      فرق المجموعة {selectedGroup} في هذه الجولة ({selectedRound}):
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {assignedTeamNames.size} من 6 فرق محدد أطراف مبارياتهم
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {availableTeams.map(t => {
                      const isAssigned = assignedTeamNames.has(t.name);
                      return (
                        <span
                          key={t.id}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${
                            isAssigned
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-950/30 text-amber-300 border-amber-500/30 animate-pulse'
                          }`}
                        >
                          {isAssigned ? <Check className="w-3 h-3 text-emerald-400" /> : <AlertCircle className="w-3 h-3 text-amber-400" />}
                          <span>{t.name}</span>
                          <span className="text-[10px] opacity-75">{isAssigned ? '(محدد)' : '(حر)'}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matches List */}
              <div className="space-y-3">
                {roundMatchesState.map((match, mIdx) => (
                  <div
                    key={match.id}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all space-y-3 shadow-md"
                  >
                    <div className="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                          {mIdx + 1}
                        </span>
                        <span className="font-bold text-white">{match.stageName}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {match.isScheduled && (
                          <span className="text-[11px] text-emerald-400 font-mono">
                            {match.date} • {match.time}
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteMatchFromRound(match.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="حذف هذه المباراة من الجولة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Matchup Dropdowns & Swap Button */}
                    <div className="grid grid-cols-1 md:grid-cols-11 gap-2.5 items-center">
                      
                      {/* Team A Select / Input */}
                      <div className="md:col-span-5 space-y-1">
                        <label className="block text-[11px] font-bold text-slate-400">
                          الفريق الأول (طرف المباراة A)
                        </label>
                        <select
                          value={match.teamA}
                          onChange={(e) => handleUpdateTeamA(match.id, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                        >
                          <option value={match.teamA}>{match.teamA} (الحالي)</option>
                          {availableTeams.map(t => (
                            <option key={t.id} value={t.name}>
                              {t.name} {t.group ? `(المجموعة ${t.group})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Swap Button */}
                      <div className="md:col-span-1 flex items-center justify-center pt-4 md:pt-3">
                        <button
                          type="button"
                          onClick={() => handleSwapTeams(match.id)}
                          className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-amber-500 text-slate-300 hover:text-slate-950 border border-slate-800 flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                          title="تبديل طرفي المباراة ⇄"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Team B Select / Input */}
                      <div className="md:col-span-5 space-y-1">
                        <label className="block text-[11px] font-bold text-slate-400">
                          الفريق الثاني (طرف المباراة B)
                        </label>
                        <select
                          value={match.teamB}
                          onChange={(e) => handleUpdateTeamB(match.id, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                        >
                          <option value={match.teamB}>{match.teamB} (الحالي)</option>
                          {availableTeams.map(t => (
                            <option key={t.id} value={t.name}>
                              {t.name} {t.group ? `(المجموعة ${t.group})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Match to this round button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddNewMatchToRound}
                  className="w-full py-2.5 rounded-2xl border border-dashed border-slate-800 hover:border-amber-500/50 bg-slate-950/60 hover:bg-slate-900 text-slate-400 hover:text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  إضافة مباراة أخرى في هذه الجولة
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PASTE TEXT */}
          {activeSubTab === 'paste' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                <p className="font-bold text-amber-300">📋 طريقة اللصق السريع لمواجهات الجولة:</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  اكتب أو الصق المباريات سطر بسطر بصيغة «فريق 1 ضد فريق 2» أو «فريق 1 - فريق 2» وسنقوم بتوزيعها فوراً على مباريات الجولة:
                </p>
                <div className="p-2.5 bg-slate-900 rounded-xl font-mono text-[11px] text-emerald-300 border border-slate-800/80">
                  برشلونة ضد ميلان<br />
                  انجلترا ضد روما<br />
                  الزمالك ضد فرنسا
                </div>
              </div>

              <textarea
                rows={8}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="برشلونة ضد ميلان&#10;انجلترا ضد روما&#10;الزمالك ضد فرنسا"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed"
              />

              <button
                type="button"
                onClick={handleApplyPastedMatchups}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 cursor-pointer"
              >
                <span>تحليل وتطبيق هذه المواجهات على الجولة الحالية</span>
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 md:p-5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-400">
            ⚡ سيتم تحديث جدول المباريات فوراً بمجرد الضغط على حفظ.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/30 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              حفظ واعتماد مواجهات هذه الجولة
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
