import React, { useState, useRef } from 'react';
import { 
  Download, 
  Upload, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  RefreshCw, 
  X, 
  ShieldAlert, 
  Copy, 
  Check, 
  Trash2, 
  Sparkles,
  Users,
  Trophy,
  Swords,
  Calendar,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppUser } from '../utils/auth';
import { Team, Match } from '../App';
import { Player } from '../utils/roster';
import { 
  fetchServerBackup, 
  importServerBackup, 
  resetSystemOnServer,
  TeamApplication,
  TournamentSeason,
  ArchivedSeasonSnapshot
} from '../utils/apiSync';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  users: AppUser[];
  teams: Team[];
  matches: Match[];
  squads: Record<string, Player[]>;
  applications: TeamApplication[];
  seasons: TournamentSeason[];
  archivedSnapshots: ArchivedSeasonSnapshot[];
  activeSeasonId: string;
  currentSeasonName: string;
  currentAcademicYear: string;
  onRestoreComplete: (restoredData: {
    users?: AppUser[];
    teams?: Team[];
    matches?: Match[];
    squads?: Record<string, Player[]>;
    applications?: TeamApplication[];
    seasons?: TournamentSeason[];
    archivedSnapshots?: ArchivedSeasonSnapshot[];
    activeSeasonId?: string;
    currentSeasonName?: string;
    currentAcademicYear?: string;
  }) => void;
  onResetToZero: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  teams,
  matches,
  squads,
  applications,
  seasons,
  archivedSnapshots,
  activeSeasonId,
  currentSeasonName,
  currentAcademicYear,
  onRestoreComplete,
  onResetToZero,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'reset'>('export');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Import file preview state
  const [importedJsonText, setImportedJsonText] = useState<string>('');
  const [parsedBackup, setParsedBackup] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Build the complete snapshot payload
  const buildFullBackupObject = () => {
    return {
      version: '2.0',
      appName: 'دوري جامعة النيل — بطولة كرة القدم',
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser?.email || 'admin',
      activeSeasonId,
      currentSeasonName,
      currentAcademicYear,
      users,
      teams,
      matches,
      squads,
      applications,
      seasons,
      archivedSnapshots,
      summary: {
        totalUsers: users.length,
        totalTeams: teams.length,
        totalMatches: matches.length,
        totalSquads: Object.keys(squads).length,
        totalApplications: applications.length,
        totalSeasons: seasons.length,
        totalArchivedSnapshots: archivedSnapshots.length,
      },
    };
  };

  // 1. Download Backup as .JSON File
  const handleDownloadBackup = () => {
    setIsExporting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const backupData = buildFullBackupObject();
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10);
      const timePart = now.toTimeString().slice(0, 5).replace(':', '-');
      const filename = `dawry_nile_backup_${datePart}_${timePart}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      confetti({ particleCount: 60, spread: 50 });
      setSuccessMsg(`تم تجهيز وتنزيل ملف النسخة الاحتياطية (${filename}) بنجاح! 💾✨`);
    } catch (e: any) {
      setErrorMsg('حدث خطأ أثناء تصدير النسخة الاحتياطية: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Copy JSON to clipboard
  const handleCopyBackupJson = () => {
    try {
      const backupData = buildFullBackupObject();
      const jsonString = JSON.stringify(backupData, null, 2);
      navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      setSuccessMsg('تم نسخ بيانات النسخة الاحتياطية كاملة إلى الحافظة بنجاح! 📋');
    } catch {
      setErrorMsg('تعذر نسخ البيانات إلى الحافظة');
    }
  };

  // 2. Handle File Selection for Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setErrorMsg('يرجى اختيار ملف بامتداد .json فقط');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setImportedJsonText(text);
        const parsed = JSON.parse(text);
        const actual = parsed.backup || parsed;
        setParsedBackup(actual);
      } catch (err: any) {
        setErrorMsg('الملف غير صالح أو تالف! يرجى التأكد من اختيار ملف JSON صحيح.');
        setParsedBackup(null);
      }
    };
    reader.onerror = () => {
      setErrorMsg('تعذر قراءة الملف المحدد');
    };
    reader.readAsText(file);
  };

  // 3. Confirm and Execute Restore
  const handleExecuteRestore = async () => {
    if (!parsedBackup) {
      setErrorMsg('يرجى تحديد ملف نسخة احتياطية أولاً');
      return;
    }

    if (!confirm('⚠️ تنبيه هام:\nاستعادة هذه النسخة سيقوم بتحديث واستبدال الفرق والمباريات واللاعبين والمستخدمين بالبيانات الموجودة في الملف.\nهل أنت متأكد من المتابعة؟')) {
      return;
    }

    setIsImporting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Send to server
      const serverRes = await importServerBackup(parsedBackup);
      if (!serverRes.success) {
        console.warn('Server restore warning:', serverRes.error);
      }

      // 2. Restore locally in app state and localStorage
      onRestoreComplete({
        users: Array.isArray(parsedBackup.users) ? parsedBackup.users : undefined,
        teams: Array.isArray(parsedBackup.teams) ? parsedBackup.teams : undefined,
        matches: Array.isArray(parsedBackup.matches) ? parsedBackup.matches : undefined,
        squads: parsedBackup.squads && typeof parsedBackup.squads === 'object' ? parsedBackup.squads : undefined,
        applications: Array.isArray(parsedBackup.applications) ? parsedBackup.applications : undefined,
        seasons: Array.isArray(parsedBackup.seasons) ? parsedBackup.seasons : undefined,
        archivedSnapshots: Array.isArray(parsedBackup.archivedSnapshots) ? parsedBackup.archivedSnapshots : undefined,
        activeSeasonId: parsedBackup.activeSeasonId,
        currentSeasonName: parsedBackup.currentSeasonName,
        currentAcademicYear: parsedBackup.currentAcademicYear,
      });

      confetti({ particleCount: 100, spread: 80 });
      setSuccessMsg('تمت استعادة النسخة الاحتياطية بنجاح وتحديث كافة بيانات البطولة! 🏆🎉');
      setParsedBackup(null);
      setImportedJsonText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      setErrorMsg('حدث خطأ أثناء استعادة النسخة الاحتياطية: ' + e.message);
    } finally {
      setIsImporting(false);
    }
  };

  // 4. Hard Reset to Zero points & users
  const handleExecuteReset = async () => {
    const confirmation = prompt('⚠️ تحذير: لتأكيد تصفير كل شيء وحذف كافة الحسابات عدا حسابك الشخصي، اكتب كلمة "صفر" أو "RESET":');
    if (confirmation !== 'صفر' && confirmation !== 'RESET' && confirmation !== 'reset') {
      return;
    }

    setIsResetting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await resetSystemOnServer();
      onResetToZero();
      confetti({ particleCount: 70, spread: 60 });
      setSuccessMsg('تم تصفير جميع النتائج بنجاح وحذف كافة المستخدمين عدا حسابك الشخصي (المدير العام)! ⚡');
    } catch (e: any) {
      setErrorMsg('تعذر تصفير النظام على الخادم: ' + e.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>النسخ الاحتياطي واستعادة البيانات</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Backup & Restore
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تصدير نسخة كاملة من الدوري واستعادتها في أي وقت بنقرة واحدة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-3 gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab('export'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'export'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>سحب نسخة احتياطية (تصدير)</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('import'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'import'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>استيراد واستعادة نسخة (Import)</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('reset'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'reset'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>تصفير كلي للنظام (0 نقاط)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <span className="font-bold text-white block">
                  محتويات النسخة الاحتياطية الحالية التي سيتم حفظها:
                </span>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">الفرق</span>
                    <strong className="text-sm font-black text-white">{teams.length}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">المباريات</span>
                    <strong className="text-sm font-black text-white">{matches.length}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">قوائم الفرق</span>
                    <strong className="text-sm font-black text-white">{Object.keys(squads).length}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">المستخدمين</span>
                    <strong className="text-sm font-black text-white">{users.length}</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                  📦 تشمل النسخة الاحتياطية كافة النتائج، النقاط، الأهداف، التشكيلات، التبديلات، الكروت، الترتيب، واستمارات الفرق، بالإضافة إلى حسابات المستخدمين وإعدادات البطولة.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  disabled={isExporting}
                  className="py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>تنزيل ملف النسخة الاحتياطية (.JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyBackupJson}
                  className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-2 border border-slate-700 cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'تم النسخ!' : 'نسخ كود الـ JSON إلى الحافظة'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <span className="font-bold text-white block">
                  اختر ملف النسخة الاحتياطية (.json) الذي قمت بتنزيله سابقاً:
                </span>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500/20 file:text-amber-300 hover:file:bg-amber-500/30 file:cursor-pointer cursor-pointer"
                />

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  يمكنك استعادة أي نسخة احتياطية تم أخذها من هذا التطبيق سابقاً، وسيتم تحديث كافة الماتشات والفرق والنتائج والمستخدمين فوراً.
                </p>
              </div>

              {/* Preview of Parsed File */}
              {parsedBackup && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                    <span className="font-black text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>معاينة بيانات النسخة المحددة:</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {parsedBackup.exportedAt ? new Date(parsedBackup.exportedAt).toLocaleString('ar-EG') : 'تاريخ غير محدد'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-amber-500/20">
                      <span className="text-[10px] text-slate-400 block">الفرق</span>
                      <strong className="text-amber-300 font-black">
                        {Array.isArray(parsedBackup.teams) ? parsedBackup.teams.length : 0}
                      </strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-amber-500/20">
                      <span className="text-[10px] text-slate-400 block">المباريات</span>
                      <strong className="text-amber-300 font-black">
                        {Array.isArray(parsedBackup.matches) ? parsedBackup.matches.length : 0}
                      </strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-amber-500/20">
                      <span className="text-[10px] text-slate-400 block">المستخدمين</span>
                      <strong className="text-amber-300 font-black">
                        {Array.isArray(parsedBackup.users) ? parsedBackup.users.length : 0}
                      </strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-amber-500/20">
                      <span className="text-[10px] text-slate-400 block">الاستمارات</span>
                      <strong className="text-amber-300 font-black">
                        {Array.isArray(parsedBackup.applications) ? parsedBackup.applications.length : 0}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={isImporting}
                    className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isImporting ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري استعادة البيانات وتحديث الخادم...</span>
                      </span>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>تأكيد استعادة هذه النسخة الاحتياطية الآن ⚡</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RESET TO ZERO */}
          {activeTab === 'reset' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-black">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>تصفير كلي وشامل لنظام البطولة (Reset to Zero):</span>
                </div>

                <ul className="text-xs text-rose-300/90 space-y-1.5 list-disc list-inside leading-relaxed">
                  <li>سيتم إعادة كافة الفرق الـ 48 إلى <strong>0 نقاط، 0 أهداف، و0 مباريات ملعوبة</strong>.</li>
                  <li>سيتم إعادة جميع المباريات إلى حالة (قادمة - Upcoming) وتصفير النتائج.</li>
                  <li>سيتم حذف جميع استمارات التقديم وطلبات القيد.</li>
                  <li>سيتم <strong>حذف كافة حسابات المستخدمين الوهميين والمسجلين والإبقاء حصرياً على حسابك أنت كمدير عام للنظام</strong> (elhalafawy9@gmail.com).</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={isResetting}
                className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer transition-all disabled:opacity-50"
              >
                {isResetting ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري التصفير الشامل...</span>
                  </span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>تصفير كل شيء وحذف كافة الأشخاص عدا حسابي ⚡</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500">
          <span>الحساب الإداري الحالي: <strong className="text-white font-mono">{currentUser?.email || 'elhalafawy9@gmail.com'}</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
