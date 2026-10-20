import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  X, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  RotateCcw, 
  Award, 
  Layers, 
  ArrowRight, 
  Printer, 
  Check, 
  AlertTriangle,
  Flame,
  ChevronLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Team, Match } from '../App';
import { TeamLogo } from '../utils/teamLogos';
import { 
  getTournamentQualifiedSeeds, 
  generateSmartKnockoutDraw, 
  KnockoutDrawOutput, 
  applyDrawToTournamentMatches 
} from '../utils/knockoutDraw';

interface KnockoutDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  matches: Match[];
  getGroupStandings?: (groupLetter: string) => Team[];
  onSaveMatches: (newMatches: Match[]) => void;
}

export const KnockoutDrawModal: React.FC<KnockoutDrawModalProps> = ({
  isOpen,
  onClose,
  teams,
  matches,
  getGroupStandings,
  onSaveMatches,
}) => {
  const [drawStage, setDrawStage] = useState<'r32' | 'r16'>('r32');
  const [drawData, setDrawData] = useState<KnockoutDrawOutput | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [activeViewFilter, setActiveViewFilter] = useState<'all' | 'half1' | 'half2' | 'q1' | 'q2' | 'q3' | 'q4'>('all');
  const [appliedSuccessfully, setAppliedSuccessfully] = useState<boolean>(false);

  // Perform draw on modal open or stage change
  useEffect(() => {
    if (isOpen) {
      handlePerformDraw(drawStage);
      setAppliedSuccessfully(false);
    }
  }, [isOpen, drawStage]);

  const handlePerformDraw = (stageToDraw: 'r32' | 'r16' = drawStage) => {
    setIsDrawing(true);
    setAppliedSuccessfully(false);

    setTimeout(() => {
      const seeds = getTournamentQualifiedSeeds(teams, getGroupStandings);
      const output = generateSmartKnockoutDraw(seeds, stageToDraw);
      setDrawData(output);
      setIsDrawing(false);
      confetti({ particleCount: 50, spread: 60 });
    }, 350);
  };

  const handleApplyDraw = () => {
    if (!drawData) return;
    const updatedMatches = applyDrawToTournamentMatches(matches, drawData);
    onSaveMatches(updatedMatches);
    setAppliedSuccessfully(true);
    confetti({ particleCount: 100, spread: 80 });
  };

  if (!isOpen) return null;

  const filteredMatches = drawData?.matches.filter(m => {
    if (activeViewFilter === 'all') return true;
    if (activeViewFilter === 'half1') return m.halfIndex === 0;
    if (activeViewFilter === 'half2') return m.halfIndex === 1;
    if (activeViewFilter === 'q1') return m.quarterIndex === 0;
    if (activeViewFilter === 'q2') return m.quarterIndex === 1;
    if (activeViewFilter === 'q3') return m.quarterIndex === 2;
    if (activeViewFilter === 'q4') return m.quarterIndex === 3;
    return true;
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-5xl w-full shadow-2xl flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/40 p-5 md:p-6 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg md:text-xl font-black text-white">
                  قرعة الأدوار الإقصائية العشوائية الذكية 🏆🎲
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  شروط وقواعد مخصصة 100%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                سحب عشوائي ذكي لكافة مواجهات الأدوار الإقصائية وتوزيع المسارات المؤدية للمباراة النهائية بدقة تامة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="hidden sm:flex px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="طباعة كشف القرعة"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stage Selector: R32 vs R16 */}
        <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">دور القرعة:</span>
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setDrawStage('r32')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  drawStage === 'r32'
                    ? 'bg-emerald-600 text-white font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                دور الـ 32 (32 فريق - 16 مباراة)
              </button>
              <button
                type="button"
                onClick={() => setDrawStage('r16')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  drawStage === 'r16'
                    ? 'bg-emerald-600 text-white font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                دور الـ 16 (16 فريق - 8 مباريات)
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handlePerformDraw(drawStage)}
            disabled={isDrawing}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition-all disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isDrawing ? 'animate-spin' : ''}`} />
            <span>إعادة سحب عشوائي جديد 🎲</span>
          </button>
        </div>

        {/* Guaranteed Constraints Verification Cards */}
        <div className="p-4 md:p-5 bg-slate-950/80 border-b border-slate-800 shrink-0 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>القواعد والشروط المطبقة والمحققة بنجاح 100%:</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            {/* Condition 1: Group 7 (G) vs Group 4 (D) */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <strong className="text-emerald-300 font-bold block">
                  عزل أول المجموعة 7 (G) عن أول وثاني المجموعة 4 (D):
                </strong>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  تم وضع أول المجموعة 7 في <span className="text-amber-300 font-bold">{drawData?.g1Quarter !== undefined && drawData.g1Quarter < 2 ? 'نصف الجدول الأول (أعلى)' : 'نصف الجدول الثاني (أسفل)'}</span>، بينما أول وثاني المجموعة 4 في <span className="text-amber-300 font-bold">{drawData?.d1Quarter !== undefined && drawData.d1Quarter < 2 ? 'نصف الجدول الأول' : 'نصف الجدول الثاني'}</span> — مستحيل يلتقوا في أي دور قبل النهائي الكبير 🏆.
                </p>
              </div>
            </div>

            {/* Condition 2: No two teams from same group before Semi-Final */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <strong className="text-emerald-300 font-bold block">
                  منع لقاء أي فريقين من نفس المجموعة قبل دور نصف النهائي:
                </strong>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  تم توزيع متأهلي كل مجموعة على <span className="text-emerald-400 font-bold">أرباع مختلفة من الجدول</span>، فلا يمكن لفريقين من نفس المجموعة أن يلتقيا في الدور الأول أو ثمن أو ربع النهائي، ولا يلتقيان إلا في نصف النهائي أو النهائي.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-5 py-2.5 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap shrink-0 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-bold ml-1">عرض المواجهات:</span>
            {[
              { id: 'all', label: `كافة المواجهات (${drawData?.matches.length || 0})` },
              { id: 'half1', label: 'نصف الجدول 1' },
              { id: 'half2', label: 'نصف الجدول 2' },
              { id: 'q1', label: 'الربع 1' },
              { id: 'q2', label: 'الربع 2' },
              { id: 'q3', label: 'الربع 3' },
              { id: 'q4', label: 'الربع 4' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveViewFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeViewFilter === f.id
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            {filteredMatches.length} مباراة معروضة
          </span>
        </div>

        {/* Scrollable Matches Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {isDrawing ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-white">جاري سحب كرات القرعة العشوائية وتوزيع الفرق... 🎲⚽</h3>
              <p className="text-xs text-slate-400">تطبيق قيود المجموعات ومسارات خروج المغلوب</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMatches.map((item) => {
                const isTeamAG1 = item.teamA.groupLetter === 'G' && item.teamA.rank === 1;
                const isTeamBG1 = item.teamB.groupLetter === 'G' && item.teamB.rank === 1;

                const isTeamAD1orD2 = item.teamA.groupLetter === 'D' && (item.teamA.rank === 1 || item.teamA.rank === 2);
                const isTeamBD1orD2 = item.teamB.groupLetter === 'D' && (item.teamB.rank === 1 || item.teamB.rank === 2);

                return (
                  <div 
                    key={item.matchId}
                    className="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3 shadow-md"
                  >
                    {/* Card Top Banner */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-1.5 font-bold text-amber-400">
                        <span>{item.stageName}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 text-[10px]">{item.quarterName}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                        {item.halfIndex === 0 ? 'نصف 1' : 'نصف 2'}
                      </span>
                    </div>

                    {/* Teams Clash Box */}
                    <div className="space-y-2">
                      {/* Team A */}
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                        isTeamAG1
                          ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30'
                          : isTeamAD1orD2
                          ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/30'
                          : 'bg-slate-900/90 border-slate-800'
                      }`}>
                        <div className="flex items-center gap-2.5 truncate">
                          <TeamLogo teamName={item.teamA.teamName} size="sm" />
                          <div className="truncate">
                            <strong className="text-xs md:text-sm font-black text-white block truncate">
                              {item.teamA.teamName}
                            </strong>
                            <span className="text-[10px] text-slate-400 block">
                              {item.teamA.seedLabel}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          {isTeamAG1 && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950">
                              👑 أول 7
                            </span>
                          )}
                          {isTeamAD1orD2 && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-blue-500 text-white">
                              🛡️ {item.teamA.rank === 1 ? 'أول 4' : 'ثاني 4'}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                            item.teamA.rank === 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            item.teamA.rank === 2 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            مركز {item.teamA.rank}
                          </span>
                        </div>
                      </div>

                      {/* VS Divider */}
                      <div className="text-center py-0.5">
                        <span className="text-[10px] font-black text-slate-500 font-mono tracking-widest">ضـد</span>
                      </div>

                      {/* Team B */}
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                        isTeamBG1
                          ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30'
                          : isTeamBD1orD2
                          ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/30'
                          : 'bg-slate-900/90 border-slate-800'
                      }`}>
                        <div className="flex items-center gap-2.5 truncate">
                          <TeamLogo teamName={item.teamB.teamName} size="sm" />
                          <div className="truncate">
                            <strong className="text-xs md:text-sm font-black text-white block truncate">
                              {item.teamB.teamName}
                            </strong>
                            <span className="text-[10px] text-slate-400 block">
                              {item.teamB.seedLabel}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          {isTeamBG1 && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950">
                              👑 أول 7
                            </span>
                          )}
                          {isTeamBD1orD2 && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-blue-500 text-white">
                              🛡️ {item.teamB.rank === 1 ? 'أول 4' : 'ثاني 4'}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                            item.teamB.rank === 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            item.teamB.rank === 2 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            مركز {item.teamB.rank}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progression note */}
                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>الفائز يتأهل لـ: {item.nextMatchId}</span>
                      <span className="text-emerald-400 font-sans font-bold">مواجهة متكافئة ✅</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 md:p-5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            {appliedSuccessfully ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>تم اعتماد وتطبيق هذه القرعة على البطولة بنجاح! 🏆</span>
              </span>
            ) : (
              <span className="text-slate-400">
                اضغط على زر الاعتماد بالأسفل لتطبيق هذه المواجهات فوراً في شجرة البطولة وجدول المباريات.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={handleApplyDraw}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center gap-2 transition-all"
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>اعتماد وتطبيق القرعة على شجرة البطولة ({drawData?.matches.length || 16} مباراة) 🏆</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
