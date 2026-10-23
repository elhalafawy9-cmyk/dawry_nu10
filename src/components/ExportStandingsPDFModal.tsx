import React, { useState, useEffect } from 'react';
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
  Check,
  Swords,
  Medal
} from 'lucide-react';
import { Team, Match } from '../App';
import { exportGroupStandingsPDF, exportKnockoutBracketPDF } from '../utils/pdfExport';

export type ExportDocType = 'groups' | 'knockout';

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
  initialDocType?: ExportDocType;
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
  initialDocType = 'groups',
}) => {
  const [docType, setDocType] = useState<ExportDocType>(initialDocType);
  const [exportScope, setExportScope] = useState<'all' | 'single'>('all');
  const [targetGroup, setTargetGroup] = useState<string>(selectedGroup || 'A');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  // Sync initialDocType whenever modal opens or initialDocType changes
  useEffect(() => {
    if (isOpen) {
      setDocType(initialDocType);
      setExportSuccess(false);
      setIsExporting(false);
      setProgressStatus('');
    }
  }, [isOpen, initialDocType]);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    setProgressStatus('جارٍ تهيئة مستند الـ PDF...');

    try {
      if (docType === 'knockout') {
        await exportKnockoutBracketPDF({
          teams,
          matches,
          getGroupStandings,
          seasonName,
          academicYear,
          onProgress: (status) => setProgressStatus(status),
        });
      } else {
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
      }

      setExportSuccess(true);
      confetti({
        particleCount: 80,
        spread: 85,
        origin: { y: 0.6 },
      });

      setTimeout(() => {
        setIsExporting(false);
        setExportSuccess(false);
        onClose();
      }, 1900);
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
        <div className={`p-5 border-b border-slate-800 flex items-center justify-between transition-colors ${
          docType === 'knockout'
            ? 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-rose-950/80'
            : 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${
              docType === 'knockout'
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
            }`}>
              {docType === 'knockout' ? <Trophy className="w-6 h-6" /> : <FileDown className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  {docType === 'knockout' ? 'تصدير جدول الأدوار الإقصائية (PDF)' : 'تصدير سجل المجموعات المعتمد (PDF)'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  docType === 'knockout'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                }`}>
                  وثيقة رسمية معتمدة
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {docType === 'knockout' 
                  ? 'توليد وثيقة PDF رسمية عالية الدقة لشجرة الأدوار الإقصائية من دور 32 حتى النهائي'
                  : 'توليد وثيقة PDF رسمية عالية الدقة لترتيب وإحصائيات مجموعات البطولة'}
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

        {/* Document Type Switcher Tabs */}
        <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDocType('groups')}
            disabled={isExporting}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              docType === 'groups'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/50'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>📋 سجل دور المجموعات (8 مجموعات)</span>
          </button>

          <button
            type="button"
            onClick={() => setDocType('knockout')}
            disabled={isExporting}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              docType === 'knockout'
                ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-md shadow-amber-950/50'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>🌳 شجرة الأدوار الإقصائية (دور 32 - النهائي)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* ================================================================= */}
          {/* TAB 1: GROUPS EXPORT CONTROLS */}
          {/* ================================================================= */}
          {docType === 'groups' && (
            <>
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
            </>
          )}

          {/* ================================================================= */}
          {/* TAB 2: KNOCKOUT EXPORT PREVIEW */}
          {/* ================================================================= */}
          {docType === 'knockout' && (
            <div className="space-y-3.5">
              <div className="bg-gradient-to-br from-amber-950/30 via-slate-950 to-slate-900 p-5 rounded-2xl border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>محتويات ملف الأدوار الإقصائية (صفحتان A4 رسميتان):</span>
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40 font-mono font-bold">
                    32 مباراة إقصائية
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                    <strong className="text-amber-300 font-bold block flex items-center gap-1">
                      <span>📄 الصفحة 1:</span>
                      <span>جدول دور الـ 32 (16 مواجهة)</span>
                    </strong>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      8 مباريات للجناح الأيسر + 8 للجناح الأيمن مع شارات الترتيب الحي (1A, 2B... إلخ)، الملاعب، التواريخ والنتائج.
                    </p>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                    <strong className="text-emerald-300 font-bold block flex items-center gap-1">
                      <span>📄 الصفحة 2:</span>
                      <span>من ثمن النهائي حتى النهائي 🏆</span>
                    </strong>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      دور الـ 16 (8 مباريات)، ربع النهائي (4 مباريات)، نصف النهائي (2)، المركز الثالث، والمباراة النهائية الكبرى.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-500/30 text-[11px] text-amber-200/90 space-y-1 leading-relaxed">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>الربط التلقائي واللوائح المعتمدة:</span>
                  </div>
                  <p>
                    تتغير أطراف مواجهات دور الـ 32 تلقائياً طبقاً للترتيب اللحظي للمجموعات، مع ضمان عدم مواجهة أي فريقين من نفس المجموعة قبل نصف النهائي، بالإضافة إلى مربعات التوقيع الرسمية وختم الاعتماد.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Document Metadata Preview */}
          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/90 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <ShieldCheck className={`w-4 h-4 ${docType === 'knockout' ? 'text-amber-400' : 'text-emerald-400'}`} />
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
                <span className="text-[11px] text-slate-400 block">
                  {docType === 'knockout' ? 'مباريات الإقصائيات:' : 'الفرق والمتأهلون:'}
                </span>
                <strong className={docType === 'knockout' ? 'text-amber-400 font-bold block' : 'text-emerald-400 font-bold block'}>
                  {docType === 'knockout' ? '32 مواجهة (دور 32 - النهائي)' : '48 فريقاً • 32 متأهلاً'}
                </strong>
              </div>
            </div>

            <div className={`text-[11px] p-2.5 rounded-xl flex items-center gap-2 border ${
              docType === 'knockout'
                ? 'bg-amber-950/20 border-amber-500/20 text-slate-300'
                : 'bg-emerald-950/20 border-emerald-500/20 text-slate-400'
            }`}>
              <Sparkles className={`w-3.5 h-3.5 shrink-0 ${docType === 'knockout' ? 'text-amber-400' : 'text-emerald-400'}`} />
              <span>
                {docType === 'knockout'
                  ? 'يتضمن التقرير جدول المباريات الكامل، الملاعب، التوقيت، ركلات الترجيح، ومربعات التوقيع والاعتماد.'
                  : 'الملف يتضمن جدول الترتيب الكامل، الأهداف، الفارق، النقاط، ومربعات التوقيع والاعتماد الرسمية.'}
              </span>
            </div>
          </div>

          {/* Progress / Success Message */}
          {isExporting && (
            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
              docType === 'knockout'
                ? 'bg-amber-950/40 border-amber-500/30'
                : 'bg-emerald-950/40 border-emerald-500/30'
            }`}>
              <Loader2 className={`w-5 h-5 animate-spin shrink-0 ${
                docType === 'knockout' ? 'text-amber-400' : 'text-emerald-400'
              }`} />
              <div className="text-xs">
                <strong className="text-white block font-bold">
                  {progressStatus || 'جارٍ معالجة وتوليد ملف الـ PDF...'}
                </strong>
                <span className={`text-[11px] ${docType === 'knockout' ? 'text-amber-300' : 'text-emerald-300'}`}>
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
            className={`px-6 py-2.5 rounded-xl text-xs font-black text-white shadow-lg flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] ${
              docType === 'knockout'
                ? 'bg-gradient-to-r from-amber-600 via-rose-600 to-amber-600 hover:from-amber-500 hover:to-rose-500 shadow-amber-600/30'
                : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
            }`}
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
                <span>
                  {docType === 'knockout' ? 'تحميل جدول الأدوار الإقصائية (PDF) 📥' : 'تحميل سجل المجموعات (PDF) 📥'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
