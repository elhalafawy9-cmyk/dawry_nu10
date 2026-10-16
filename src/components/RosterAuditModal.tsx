import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
  Users,
  Copy,
  Trash2,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  RefreshCw,
  FileText,
  UserCheck,
  UserX,
  Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Player } from '../utils/roster';
import { Team } from '../App';
import {
  findDuplicatePlayers,
  checkTeamExistence,
  parseRosterText,
  normalizeArabicText,
} from '../utils/auditDuplicates';
import { TeamLogo } from '../utils/teamLogos';
import { getTeamBilingualInfo } from '../utils/teamAliases';

interface RosterAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  squads: Record<string, Player[]>;
  onUpdateSquads: (squads: Record<string, Player[]>) => void;
  onSelectTeamForView?: (teamName: string) => void;
}

export const RosterAuditModal: React.FC<RosterAuditModalProps> = ({
  isOpen,
  onClose,
  teams,
  squads,
  onUpdateSquads,
  onSelectTeamForView,
}) => {
  const [activeTab, setActiveTab] = useState<'duplicates' | 'teams_check' | 'instant_checker'>('duplicates');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [pastedRosterText, setPastedRosterText] = useState('');
  const [selectedPastedTeam, setSelectedPastedTeam] = useState<string>('');
  const [auditFilterGroup, setAuditFilterGroup] = useState<string>('all');

  // Real-time duplicates audit
  const duplicates: DuplicatePlayerReport[] = useMemo(() => {
    return findDuplicatePlayers(squads);
  }, [squads]);

  // Total registered players
  const totalRegisteredPlayers = useMemo(() => {
    return Object.values(squads).reduce((sum, squad) => sum + (Array.isArray(squad) ? squad.length : 0), 0);
  }, [squads]);

  // 48 Official Expected Tournament Teams check
  const teamsAuditList = useMemo(() => {
    return teams.map((team) => {
      const squad = squads[team.name] || [];
      const hasGK = squad.some((p) => p.position === 'GK');
      const hasCaptain = squad.some((p) => p.isCaptain);
      const isComplete = squad.length >= 7; // typical 7-a-side min squad

      return {
        team,
        playersCount: squad.length,
        hasGK,
        hasCaptain,
        isComplete,
      };
    });
  }, [teams, squads]);

  // Filtered teams list for Teams Check Tab
  const filteredTeamsAudit = useMemo(() => {
    let list = teamsAuditList;
    if (auditFilterGroup !== 'all') {
      list = list.filter((item) => item.team.group === auditFilterGroup);
    }
    if (teamSearchQuery.trim()) {
      const q = normalizeArabicText(teamSearchQuery);
      list = list.filter(
        (item) =>
          normalizeArabicText(item.team.name).includes(q) ||
          item.team.group.toLowerCase().includes(q)
      );
    }
    return list;
  }, [teamsAuditList, auditFilterGroup, teamSearchQuery]);

  // Instant Checker for Pasted Text
  const parsedSheet = useMemo(() => {
    if (!pastedRosterText.trim()) return null;
    return parseRosterText(pastedRosterText, teams, squads);
  }, [pastedRosterText, teams, squads]);

  // Remove player from a specific team
  const handleRemoveFromTeam = (teamName: string, playerId: string, playerName: string) => {
    if (!confirm(`هل أنت متأكد من حذف اللاعب (${playerName}) من قائمة فريق ${teamName} لحل مشكلة الازدواجية؟`)) {
      return;
    }
    const currentList = squads[teamName] || [];
    const updated = currentList.filter((p) => p.id !== playerId);
    onUpdateSquads({ ...squads, [teamName]: updated });
    confetti({ particleCount: 30, spread: 50 });
  };

  // Keep player in ONE team and remove from all other duplicate teams
  const handleKeepOnlyInTeam = (keepTeamName: string, rep: DuplicatePlayerReport) => {
    if (
      !confirm(
        `تأكيد: سيتم إبقاء اللاعب في فريق (${keepTeamName}) فقط وحذفه تلقائياً من الفرق الأخرى المتعارضة. هل تريد المتابعة؟`
      )
    ) {
      return;
    }
    const newSquads = { ...squads };
    rep.occurrences.forEach((occ) => {
      if (occ.teamName !== keepTeamName) {
        newSquads[occ.teamName] = (newSquads[occ.teamName] || []).filter((p) => p.id !== occ.playerId);
      }
    });
    onUpdateSquads(newSquads);
    confetti({ particleCount: 40, spread: 60 });
  };

  // Apply parsed sheet into the target team
  const handleApplyParsedRoster = () => {
    if (!parsedSheet) return;
    const targetTeam = selectedPastedTeam || parsedSheet.detectedTeamName;
    if (!targetTeam) {
      alert('يرجى تحديد الفريق المستهدف لإضافة اللاعبين إليه.');
      return;
    }

    const teamExists = teams.some((t) => t.name === targetTeam);
    if (!teamExists) {
      alert(`الفريق (${targetTeam}) غير موجود في النظام! يرجى اختيار اسم الفريق المعتمد.`);
      return;
    }

    const currentSquad = squads[targetTeam] || [];
    const newPlayers: Player[] = parsedSheet.players.map((p, idx) => ({
      id: `p_${Date.now()}_${idx}`,
      name: p.name,
      number: p.number,
      position: p.position,
      studentId: p.studentId,
      isCaptain: p.isCaptain,
      isIdentityLocked: true,
    }));

    onUpdateSquads({
      ...squads,
      [targetTeam]: [...currentSquad, ...newPlayers],
    });

    confetti({ particleCount: 50, spread: 70 });
    alert(`تمت إضافة ${newPlayers.length} لاعباً إلى قائمة فريق ${targetTeam} بنجاح! 🎉⚽`);
    setPastedRosterText('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-right font-sans">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  فاحص الازدواجية وتدقيق الفرق واللاعبين
                </h2>
                {duplicates.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-black border border-rose-500/30 animate-pulse">
                    {duplicates.length} تكرار مكتشف!
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3 h-3" /> سليم 100%
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                كشف أي لاعب مسجل في أكثر من فريق، والتحقق الفوري من أسماء الفرق الـ 48 المعتمدة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 sm:p-4 bg-slate-950 border-b border-slate-800/80 text-center">
          <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">إجمالي الفرق بالبطولة</span>
            <span className="text-lg font-black text-white">{teams.length} فريقاً</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">إجمالي اللاعبين المقيدين</span>
            <span className="text-lg font-black text-emerald-400">{totalRegisteredPlayers} لاعب</span>
          </div>
          <div
            className={`p-2.5 rounded-2xl border ${
              duplicates.length > 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <span className="text-[11px] block opacity-80">ازدواجية وتكرار لاعبين</span>
            <span className="text-lg font-black">{duplicates.length} لاعب مكرر</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">فرق بدون لاعبين</span>
            <span className="text-lg font-black text-amber-400">
              {teamsAuditList.filter((t) => t.playersCount === 0).length} فريق
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('duplicates')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'duplicates'
                ? 'border-rose-500 text-rose-400 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>كشف تكرار اللاعبين ({duplicates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teams_check')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'teams_check'
                ? 'border-emerald-500 text-emerald-400 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>تدقيق أسماء وقوائم الـ 48 فريقاً</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('instant_checker')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'instant_checker'
                ? 'border-teal-500 text-teal-400 font-black'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>مدقق ولصق كشف أسماء فوري</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: DUPLICATES SCANNER */}
          {activeTab === 'duplicates' && (
            <div className="space-y-4">
              {duplicates.length === 0 ? (
                <div className="py-12 px-4 rounded-3xl bg-emerald-950/20 border border-emerald-500/20 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-black text-white">
                    رائع! لا يوجد أي لاعب مكرر في فريقين
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    تم فحص جميع القوائم والأرقام الجامعية لجميع الفرق. كافة اللاعبين مسجلون في فرقهم بصورة قانونية وبدون أي ازدواجية.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                    <div>
                      <strong className="block font-black text-rose-200">
                        تنبيه: تم رصد {duplicates.length} لاعب مكرر مسجل في أكثر من فريق!
                      </strong>
                      <p className="mt-0.5 text-slate-300 text-[11px] leading-relaxed">
                        وفقاً للائحة دوري جامعة النيل، يمنع قيد أي لاعب في أكثر من فريق. يمكنك إبقاء اللاعب في فريقه المعتمد وحذفه من الفرق الأخرى بنقرة واحدة.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {duplicates.map((rep) => (
                      <div
                        key={rep.key}
                        className="p-4 rounded-2xl bg-slate-950 border border-rose-500/30 hover:border-rose-500/60 transition-all space-y-3 shadow-lg"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                            <strong className="text-sm font-black text-white">
                              {rep.displayNames.join(' / ')}
                            </strong>
                            {rep.studentId && (
                              <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-slate-800 text-teal-400 border border-slate-700">
                                ID: {rep.studentId}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            {rep.type === 'same_student_id'
                              ? 'تكرار بنفس الرقم الجامعي'
                              : rep.type === 'same_name'
                              ? 'تكرار بنفس الاسم'
                              : 'تطابق الاسم والرقم الجامعي'}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <span className="text-xs text-slate-400 font-bold block">
                            الفرق التي تم قيد اللاعب بها ({rep.occurrences.length} فرق):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {rep.occurrences.map((occ) => (
                              <div
                                key={`${occ.teamName}_${occ.playerId}`}
                                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2">
                                  <TeamLogo teamName={occ.teamName} className="w-6 h-6 shrink-0" />
                                  <div>
                                    <strong className="text-xs font-black text-white block">
                                      فريق {occ.teamName}
                                    </strong>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      #{occ.playerNumber} • {occ.position}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleKeepOnlyInTeam(occ.teamName, rep)}
                                    title="إبقاء اللاعب في هذا الفريق وحذفه من الفرق الأخرى"
                                    className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-lg text-[10px] font-black transition-colors cursor-pointer"
                                  >
                                    إبقاء هنا فقط
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFromTeam(occ.teamName, occ.playerId, occ.playerName)}
                                    title="حذف اللاعب من هذا الفريق"
                                    className="p-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 48 TEAMS VALIDATION */}
          {activeTab === 'teams_check' && (
            <div className="space-y-3">
              {/* Search & Group Filter */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="ابحث عن اسم الفريق للتحقق من وجوده..."
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setAuditFilterGroup('all')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      auditFilterGroup === 'all'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    الكل
                  </button>
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((grp) => (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => setAuditFilterGroup(grp)}
                      className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                        auditFilterGroup === grp
                          ? 'bg-emerald-600 text-white font-mono'
                          : 'bg-slate-900 text-slate-400 hover:text-white font-mono'
                      }`}
                    >
                      {grp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Teams Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {filteredTeamsAudit.map((item) => (
                  <div
                    key={item.team.id}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <TeamLogo teamName={item.team.name} className="w-8 h-8 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <strong className="text-xs font-black text-white truncate block">
                            {item.team.name}
                          </strong>
                          {getTeamBilingualInfo(item.team.name)?.englishName && (
                            <span className="text-[9px] text-teal-300 font-bold bg-teal-950/80 px-1 py-0.2 rounded border border-teal-700/50">
                              {getTeamBilingualInfo(item.team.name)?.englishName}
                            </span>
                          )}
                          <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-emerald-400 font-bold">
                            {item.team.group}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <span>{item.playersCount} لاعب</span>
                          {item.hasGK && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded">GK</span>}
                          {item.hasCaptain && <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded">⭐</span>}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {item.playersCount === 0 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          فارغ
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          مسجل
                        </span>
                      )}
                      {onSelectTeamForView && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTeamForView(item.team.name);
                            onClose();
                          }}
                          title="عرض قائمة الفريق"
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: INSTANT TEXT / OCR ROSTER CHECKER */}
          {activeTab === 'instant_checker' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs">
                <strong className="font-black text-teal-200 block">
                  ألصق كشف أسماء اللاعبين أو نص الورقة هنا:
                </strong>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  يمكنك نسخ نص أسماء اللاعبين (أو المكتوب من الكشف/الواتساب). سيقوم النظام فوراً بالتحقق: هل اسم الفريق موجود ضمن فرق البطولة؟ وهل يوجد أي لاعب مسجل في فريق آخر؟
                </p>
              </div>

              <div className="space-y-2">
                <textarea
                  rows={6}
                  placeholder={`مثال لصق كشف ورقة:\nكشف فريق باريس\n1. أحمد محمد - 241001234 - GK (كابتن)\n2. عمر حسن - 241001555 - DEF\n3. يوسف خالد - 241002999 - MID`}
                  value={pastedRosterText}
                  onChange={(e) => setPastedRosterText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-2xl p-3 text-xs text-white placeholder-slate-500 font-mono focus:outline-none"
                  dir="rtl"
                />
              </div>

              {parsedSheet && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  {/* Team Validation Status */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs text-slate-400">الفريق المكتشف بالورقة:</strong>
                      <span className="text-sm font-black text-white">
                        {parsedSheet.detectedTeamName || 'لم يتم التعرف على اسم الفريق تلقائياً'}
                      </span>
                    </div>

                    {parsedSheet.isTeamFound ? (
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          الفريق موجود في البطولة ({parsedSheet.matchedTeam?.name} - المجموعة {parsedSheet.matchedTeam?.group})
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          اسم الفريق غير موجود تماماً في البطولة!
                        </span>
                        {parsedSheet.closestTeams.length > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-slate-400">هل تقصد:</span>
                            {parsedSheet.closestTeams.map((ct) => (
                              <button
                                key={ct.name}
                                type="button"
                                onClick={() => setSelectedPastedTeam(ct.name)}
                                className="px-2 py-0.5 rounded-lg bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-slate-950 font-bold transition-colors cursor-pointer"
                              >
                                {ct.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Duplicate Players Warning */}
                  {parsedSheet.duplicatePlayersFound > 0 && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        تنبيه: يوجد {parsedSheet.duplicatePlayersFound} لاعب في هذا الكشف مسجل مسبقاً في فرق أخرى! (موضحين باللون الأحمر أدناه)
                      </span>
                    </div>
                  )}

                  {/* Players Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">#</th>
                          <th className="p-2.5">اسم اللاعب</th>
                          <th className="p-2.5">الرقم</th>
                          <th className="p-2.5">المركز</th>
                          <th className="p-2.5">الرقم الجامعي</th>
                          <th className="p-2.5">حالة الازدواجية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {parsedSheet.players.map((p, idx) => (
                          <tr
                            key={idx}
                            className={p.isDuplicate ? 'bg-rose-950/20 text-rose-200' : 'hover:bg-slate-900/50 text-slate-300'}
                          >
                            <td className="p-2.5 font-mono text-slate-500">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-white flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.isCaptain && <span className="text-[10px] text-amber-400">⭐ (كابتن)</span>}
                            </td>
                            <td className="p-2.5 font-mono">#{p.number}</td>
                            <td className="p-2.5 font-mono font-bold text-teal-400">{p.position}</td>
                            <td className="p-2.5 font-mono text-slate-400">{p.studentId || '—'}</td>
                            <td className="p-2.5">
                              {p.isDuplicate ? (
                                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[11px] font-bold">
                                  ⚠️ {p.duplicateDetails}
                                </span>
                              ) : (
                                <span className="text-emerald-400 text-[11px] font-bold">✓ متاح وغير مكرر</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-400">
                      تم استخراج {parsedSheet.players.length} لاعب جاهز للتسجيل
                    </span>

                    <button
                      type="button"
                      disabled={parsedSheet.players.length === 0}
                      onClick={handleApplyParsedRoster}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>اعتماد وإضافة القائمة لفريق ({selectedPastedTeam || parsedSheet.detectedTeamName || 'الفريق'})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            فاحص دوري جامعة النيل 2026 • 48 فريقاً موزعين على 8 مجموعات
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
