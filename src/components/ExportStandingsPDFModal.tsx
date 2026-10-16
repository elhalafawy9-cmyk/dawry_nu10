import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  FileDown, 
  X, 
  Layers, 
  CheckCircle2, 
  Trophy, 
  Award, 
  Sparkles, 
  Loader2, 
  FileText,
  Calendar,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Team, Match } from '../App';
import { exportGroupStandingsPDF } from '../utils/pdfExport';

interface ExportStandingsPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  matches: Match[];
  getGroupStandings: (group: string) => Team[];
  selectedGroup: string;
  seasonName: string;
  academicYear: string;
  scheduledMatchesCount: number;
}

export const ExportStandingsPDFModal: React.FC<ExportStandingsPDFModalProps> = ({
  isOpen,
  onClose,
  teams,
  matches,
  getGroupStandings,
  selectedGroup,
  seasonName,
  academicYear,
  scheduledMatchesCount,
}) => {
  const [exportScope, setExportScope] = useState<'all' | 'single'>('all');
  const [targetGroup, setTargetGroup] = useState<string>(selectedGroup || 'A');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    setProgressStatus('جارٍ تهيئة مستند الـ PDF...');

    try {
      await exportGroupStandingsPDF({
        teams,
        matches,
        getGroupStandings,
        seasonName,
        academicYear,
        selectedGroup: exportScope === 'all' ? 'all' : targetGroup,
        scheduledMatchesCount,
        onProgress: (status) => setProgressStatus(status),
      });

      setExportSuccess(true);
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
      });

      setTimeout(() => {
        setIsExporting(false);
        setExportSuccess(false);
        onClose();
      }, 1800);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف الـ PDF. يرجى المحاولة مرة أخرى.');
      setIsExporting(false);
      setProgressStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" dir="rtl">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border-b border-slate-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileDown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">تصدير سجل المجموعات المعتمد (PDF)</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-bold border border-emerald-500/20">
                  سجل رسمي
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                توليد وثيقة PDF رسمية عالية الدقة لترتيب وإحصائيات مجموعات البطولة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/60 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Scope Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-300 block">
              اختر نطاق السجل المراد تصديره:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: All Groups */}
              <button
                type="button"
                onClick={() => setExportScope('all')}
                disabled={isExporting}
                className={`p-4 rounded-2xl border text-right transition-all cursor-pointer relative flex flex-col justify-between ${
                  exportScope === 'all'
                    ? 'bg-emerald-950/40 border-emerald-500/60 ring-2 ring-emerald-500/30 text-white shadow-lg shadow-emerald-950/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                      <Layers className="w-4 h-4" />
                    </span>
                    {exportScope === 'all' && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <strong className="text-sm font-black text-white block">
                    سجل البطولة الكامل (كل المجموعات)
                  </strong>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    جميع المجموعات الـ 8 (من A إلى H)، 48 فريقاً، وقائمة الـ 32 متأهلاً مع إحصائيات البطولة.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                  <span>صفحتان A4 منسقتان</span>
                  <span className="bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">الأشمل ✓</span>
                </div>
              </button>

              {/* Option 2: Single Group */}
              <button
                type="button"
                onClick={() => setExportScope('single')}
                disabled={isExporting}
                className={`p-4 rounded-2xl border text-right transition-all cursor-pointer relative flex flex-col justify-between ${
                  exportScope === 'single'
                    ? 'bg-emerald-950/40 border-emerald-500/60 ring-2 ring-emerald-500/30 text-white shadow-lg shadow-emerald-950/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-sm">
                      <FileText className="w-4 h-4" />
                    </span>
                    {exportScope === 'single' && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <strong className="text-sm font-black text-white block">
                    سجل مجموعة واحدة محددة
                  </strong>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    تقرير تفصيلي لمجموعة واحدة يتضمن جدول الترتيب، أفضل خط هجوم ودفاع، وقائمة المتأهلين.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-teal-400 font-bold">
                  <span>صفحة A4 تفصيلية واحدة</span>
                  <span>المجموعة {targetGroup}</span>
                </div>
              </button>
            </div>
          </div>

          {/* Group Picker if Single is selected */}
          {exportScope === 'single' && (
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 block">حدد المجموعة المراد تصديرها:</span>
              <div className="flex flex-wrap gap-2">
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setTargetGroup(grp)}
                    disabled={isExporting}
                    className={`w-10 h-10 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                      targetGroup === grp
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400'
                        : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    {grp}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Document Metadata Preview */}
          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/90 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>بيانات التقرير المعتمد للبطولة:</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">الموسم:</span>
                <strong className="text-white font-bold block truncate" title={seasonName}>
                  {seasonName}
                </strong>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">العام الأكاديمي:</span>
                <strong className="text-amber-400 font-mono font-bold block">
                  {academicYear}
                </strong>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-400 block">الفرق والمتأهلون:</span>
                <strong className="text-emerald-400 font-bold block">
                  48 فريقاً • 32 متأهلاً
                </strong>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-xl flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                الملف يتضمن جدول الترتيب الكامل، الأهداف، الفارق، النقاط، ومربعات التوقيع والاعتماد الرسمية.
              </span>
            </div>
          </div>

          {/* Progress / Success Message */}
          {isExporting && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
              <div className="text-xs">
                <strong className="text-white block font-bold">
                  {progressStatus || 'جارٍ معالجة وتوليد ملف الـ PDF...'}
                </strong>
                <span className="text-emerald-300 text-[11px]">
                  يرجى الانتظار بضع ثوانٍ حتى يكتمل التحميل
                </span>
              </div>
            </div>
          )}

          {exportSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-900/50 border border-emerald-500/50 flex items-center gap-3 text-emerald-200 text-xs font-bold animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>تم توليد وحفظ ملف الـ PDF بنجاح في جهازك! 🎉</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950/80 border-t border-slate-800 p-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleStartExport}
            disabled={isExporting || exportSuccess}
            className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جارٍ التصدير...</span>
              </>
            ) : exportSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>تم التصدير!</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span>توليد وتحميل ملف الـ PDF 📥</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
