import React, { useState, useMemo } from 'react';
import { 
  UserCheck, 
  Shield, 
  Mail, 
  Lock, 
  Key, 
  Eye, 
  EyeOff, 
  Check, 
  Copy, 
  Sparkles, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  Shirt, 
  ExternalLink,
  ChevronRight,
  UserPlus,
  Send,
  Building2,
  GraduationCap,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppUser } from '../utils/auth';
import { Team } from '../App';
import { formatTimeAgoArabic } from '../utils/apiSync';

interface AssignTeamManagersPageProps {
  teams: Team[];
  users: AppUser[];
  currentUser: AppUser | null;
  onAssignManager: (data: {
    email: string;
    password?: string;
    teamName: string;
    name?: string;
    studentId?: string;
    department?: string;
  }) => Promise<void> | void;
  onUnassignManager: (userId: string, email: string) => Promise<void> | void;
  onRefreshUsers?: () => void;
  isSyncing?: boolean;
  onNavigateToTeamPortal?: (teamName: string) => void;
}

export const AssignTeamManagersPage: React.FC<AssignTeamManagersPageProps> = ({
  teams,
  users,
  currentUser,
  onAssignManager,
  onUnassignManager,
  onRefreshUsers,
  isSyncing = false,
  onNavigateToTeamPortal,
}) => {
  // Form State
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('NU@2026');
  const [showPassword, setShowPassword] = useState<boolean>(true);
  const [nameInput, setNameInput] = useState<string>('');
  const [studentIdInput, setStudentIdInput] = useState<string>('');
  const [departmentInput, setDepartmentInput] = useState<string>('جامعة النيل');
  const [selectedTeamName, setSelectedTeamName] = useState<string>('');
  const [teamSearchQuery, setTeamSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Success Modal State after assigning
  const [successAssignment, setSuccessAssignment] = useState<{
    managerName: string;
    email: string;
    password: string;
    teamName: string;
    group: string;
  } | null>(null);

  // Filter & Search in teams table
  const [tableSearch, setTableSearch] = useState<string>('');
  const [tableFilterStatus, setTableFilterStatus] = useState<'all' | 'assigned' | 'vacant'>('all');
  const [tableGroupFilter, setTableGroupFilter] = useState<string>('all');

  // Map of teamName -> assigned AppUser(s)
  const teamManagersMap = useMemo(() => {
    const map = new Map<string, AppUser>();
    users.forEach(u => {
      if (u.role === 'team_manager' && u.managedTeamName) {
        map.set(u.managedTeamName, u);
      }
    });
    return map;
  }, [users]);

  // Existing users lookup for auto-suggestions
  const matchedExistingUser = useMemo(() => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return null;
    return users.find(u => u.email.toLowerCase() === trimmed);
  }, [emailInput, users]);

  // Autocomplete matching users list (up to 4)
  const matchingUsersList = useMemo(() => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed || trimmed.length < 2) return [];
    return users
      .filter(u => u.email.toLowerCase().includes(trimmed) || u.name.toLowerCase().includes(trimmed))
      .slice(0, 4);
  }, [emailInput, users]);

  // Statistics
  const stats = useMemo(() => {
    const totalTeams = teams.length;
    let assignedCount = 0;
    teams.forEach(t => {
      if (teamManagersMap.has(t.name)) {
        assignedCount++;
      }
    });
    const vacantCount = totalTeams - assignedCount;
    return {
      total: totalTeams,
      assigned: assignedCount,
      vacant: vacantCount,
      percentage: totalTeams > 0 ? Math.round((assignedCount / totalTeams) * 100) : 0,
    };
  }, [teams, teamManagersMap]);

  // Generate random easy password
  const handleGenerateEasyPassword = () => {
    const prefixes = ['NU', 'Dawry', 'Team', 'Captain', 'Champion'];
    const pfx = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const pass = `${pfx}@${num}`;
    setPasswordInput(pass);
    setShowPassword(true);
  };

  // Add @nu.edu.eg to email if missing
  const handleAppendNuDomain = () => {
    let clean = emailInput.trim();
    if (!clean) {
      setEmailInput('@nu.edu.eg');
      return;
    }
    if (clean.includes('@')) {
      const parts = clean.split('@');
      clean = parts[0];
    }
    setEmailInput(`${clean}@nu.edu.eg`);
  };

  // When clicking an existing user suggestion
  const handleSelectExistingUser = (u: AppUser) => {
    setEmailInput(u.email);
    setNameInput(u.name);
    if (u.studentId) setStudentIdInput(u.studentId);
    if (u.department) setDepartmentInput(u.department);
    if (u.password) setPasswordInput(u.password);
  };

  // Quick select a team to assign from the table
  const handleQuickAssignTeam = (teamName: string) => {
    setSelectedTeamName(teamName);
    // Scroll to form smoothly
    const formEl = document.getElementById('assign-manager-form-card');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Form Submission
  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      alert('يرجى كتابة البريد الإلكتروني للمسؤول!');
      return;
    }
    if (!selectedTeamName) {
      alert('يرجى تحديد الفريق المراد تعيين المسؤول له!');
      return;
    }

    const trimmedEmail = emailInput.trim().toLowerCase();
    const finalPassword = passwordInput.trim() || 'NU@2026';
    const finalName = nameInput.trim() || trimmedEmail.split('@')[0].replace(/[._]/g, ' ');
    const targetTeam = teams.find(t => t.name === selectedTeamName);

    setIsSubmitting(true);
    try {
      await onAssignManager({
        email: trimmedEmail,
        password: finalPassword,
        teamName: selectedTeamName,
        name: finalName,
        studentId: studentIdInput.trim() || undefined,
        department: departmentInput.trim() || undefined,
      });

      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });

      // Open success modal
      setSuccessAssignment({
        managerName: finalName,
        email: trimmedEmail,
        password: finalPassword,
        teamName: selectedTeamName,
        group: targetTeam?.group || 'A',
      });

      // Reset form partially for the next assignment
      setEmailInput('');
      setNameInput('');
      setStudentIdInput('');
      setSelectedTeamName('');
    } catch (err) {
      console.error('Failed to assign manager:', err);
      alert('حدث خطأ أثناء حفظ وتعيين المسؤول، يرجى المحاولة ثانية');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy WhatsApp Welcome Message
  const handleCopyWhatsAppMessage = (data: { managerName: string; email: string; password: string; teamName: string }) => {
    const siteUrl = window.location.origin;
    const msg = `🏆 *دوري جامعة النيل 2026 - بطولة كرة القدم* 🏆\n\nأهلاً يا كابتن *${data.managerName}* 👋\nتم اعتمادك رسمياً كـ *مسؤول فريق (${data.teamName})* في المنظومة الإلكترونية للبطولة! 📋⚽\n\n🔑 *بيانات تسجيل الدخول الخاصة بك:*\n🌐 رابط المنظومة: ${siteUrl}\n📧 البريد: ${data.email}\n🔐 كلمة المرور: ${data.password}\n\n✅ *صلاحياتك كمسؤول فريق:*\n1. تسجيل وتعديل قائمة لاعبي فريقك وقفل الهويات.\n2. رفع صور اللاعبين وشعار الفريق.\n3. اختيار التشكيلة الأساسية والاحتياط والتبديلات قبل كل مباراة.\n\nنتمنى لكم التوفيق في البطولة! 🌟⚽`;

    navigator.clipboard.writeText(msg).then(() => {
      setCopiedKey('whatsapp');
      setTimeout(() => setCopiedKey(null), 3000);
    });
  };

  // Copy Quick Credentials
  const handleCopyCredentials = (email: string, pass: string, team: string) => {
    const text = `فريق: ${team}\nالبريد: ${email}\nكلمة المرور: ${pass}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(`${email}_${team}`);
      setTimeout(() => setCopiedKey(null), 2500);
    });
  };

  // Filtered teams list for table
  const filteredTeams = useMemo(() => {
    return teams.filter(t => {
      // Group filter
      if (tableGroupFilter !== 'all' && t.group !== tableGroupFilter) return false;

      const manager = teamManagersMap.get(t.name);

      // Status filter
      if (tableFilterStatus === 'assigned' && !manager) return false;
      if (tableFilterStatus === 'vacant' && manager) return false;

      // Search query
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const teamMatch = t.name.toLowerCase().includes(q);
        const groupMatch = `المجموعة ${t.group}`.toLowerCase().includes(q);
        const managerMatch = manager ? (
          manager.name.toLowerCase().includes(q) ||
          manager.email.toLowerCase().includes(q) ||
          (manager.studentId && manager.studentId.includes(q))
        ) : false;
        if (!teamMatch && !groupMatch && !managerMatch) return false;
      }

      return true;
    });
  }, [teams, teamManagersMap, tableGroupFilter, tableFilterStatus, tableSearch]);

  // Teams dropdown filter inside form
  const formFilteredTeams = useMemo(() => {
    if (!teamSearchQuery.trim()) return teams;
    const q = teamSearchQuery.toLowerCase();
    return teams.filter(t => t.name.toLowerCase().includes(q) || t.group.toLowerCase().includes(q));
  }, [teams, teamSearchQuery]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* HEADER BANNER */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>لوحة الأدمن الخاصة • تعيين مسؤولي الفرق الرسميين</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
              <span>صفحة تعيين وتوزيع مسؤولي الفرق (48 فريقاً) 👔</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              اكتب فقط <strong className="text-emerald-400">البريد الإلكتروني</strong> و <strong className="text-amber-400">كلمة المرور</strong> وحدد الفريق من القائمة ليتم تفعيل المسؤول فورياً، وحفظ بياناته على السيرفر ليتمكن من تسجيل الدخول من أي هاتف أو جهاز محمول 📱⚡
            </p>
          </div>

          {/* Quick Stats Widget */}
          <div className="flex flex-wrap items-center gap-2.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 self-start md:self-auto shrink-0">
            <div className="text-center px-3 border-l border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block">إجمالي الفرق</span>
              <strong className="text-lg font-black text-white font-mono">{stats.total}</strong>
            </div>
            <div className="text-center px-3 border-l border-slate-800">
              <span className="text-[10px] text-emerald-400 font-bold block">تم التعيين ✓</span>
              <strong className="text-lg font-black text-emerald-400 font-mono">{stats.assigned}</strong>
            </div>
            <div className="text-center px-3">
              <span className="text-[10px] text-amber-400 font-bold block">شاغر بانتظار مسؤول</span>
              <strong className="text-lg font-black text-amber-400 font-mono">{stats.vacant}</strong>
            </div>
            {onRefreshUsers && (
              <button
                onClick={onRefreshUsers}
                disabled={isSyncing}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer transition-colors"
                title="تحديث فوري من السيرفر"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar of Assignment */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
            <span className="text-slate-400">نسبة تغطية مسؤولي الفرق:</span>
            <span className="text-emerald-400 font-mono">{stats.assigned} من {stats.total} ({stats.percentage}%)</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🚀 MAIN ASSIGNMENT FORM CARD */}
      {/* ========================================================================= */}
      <div 
        id="assign-manager-form-card"
        className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-5 md:p-7 shadow-2xl space-y-6 relative"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-black text-white">
                نموذج التعيين السريع والمباشر لمسؤول الفريق
              </h3>
              <p className="text-xs text-slate-400">
                اكتب الإيميل، كلمة المرور، وحدد الفريق ثم اضغط اعتماد ⚡
              </p>
            </div>
          </div>

          {selectedTeamName && (
            <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 self-start sm:self-auto">
              <Shirt className="w-4 h-4 text-emerald-400" />
              <span>الفريق المحدد: <strong className="text-white font-black">{selectedTeamName}</strong></span>
              <button 
                type="button" 
                onClick={() => setSelectedTeamName('')}
                className="text-slate-400 hover:text-white mr-1 cursor-pointer"
                title="إلغاء التحديد"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmitAssignment} className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* 1. Email Field */}
            <div className="lg:col-span-6 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>البريد الإلكتروني للمسؤول (Email) *</span>
                </label>
                <button
                  type="button"
                  onClick={handleAppendNuDomain}
                  className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition-colors cursor-pointer"
                  title="إضافة نطاق جامعة النيل تلقائياً"
                >
                  + @nu.edu.eg
                </button>
              </div>

              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="مثال: ahmed.ali@nu.edu.eg أو ahmed@gmail.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Autocomplete helper if existing user match */}
              {matchingUsersList.length > 0 && !matchedExistingUser && (
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    مستخدمون مسجلون يطابقون بحثك (اضغط للاختيار السريع):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {matchingUsersList.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectExistingUser(u)}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-300 border border-slate-800 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>{u.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({u.email})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {matchedExistingUser && (
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>
                      الحساب مسجل باسم: <strong className="text-white">{matchedExistingUser.name}</strong> ({matchedExistingUser.role === 'team_manager' ? `مسؤول ${matchedExistingUser.managedTeamName || ''}` : matchedExistingUser.role})
                    </span>
                  </div>
                  <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded text-blue-200">
                    سيتم تحديث رتبته وفريقه فوراً
                  </span>
                </div>
              )}
            </div>

            {/* 2. Password Field */}
            <div className="lg:col-span-6 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>كلمة المرور للدخول (Password) *</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateEasyPassword}
                  className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Key className="w-3 h-3 text-amber-400" />
                  توليد كلمة سر سهلة 🔑
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="اكتب كلمة المرور..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pr-4 pl-12 py-3 text-xs md:text-sm text-amber-300 focus:outline-none focus:border-amber-500 font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                سيستخدم المسؤول هذا الباسورد مع الإيميل لتسجيل الدخول والتحكم بفريقه.
              </p>
            </div>

            {/* 3. Name (Optional or auto) */}
            <div className="lg:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                اسم المسؤول (اختياري - يُستخرج تلقائياً من الإيميل):
              </label>
              <input
                type="text"
                placeholder="مثال: كابتن أحمد شريف"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 4. Student ID (Optional) */}
            <div className="lg:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                رقم القيد الجامعي / Student ID (اختياري):
              </label>
              <input
                type="text"
                placeholder="مثال: 20220114"
                value={studentIdInput}
                onChange={(e) => setStudentIdInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* 5. Department (Optional) */}
            <div className="lg:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                الكلية / القسم (اختياري):
              </label>
              <input
                type="text"
                placeholder="مثال: كلية إدارة الأعمال"
                value={departmentInput}
                onChange={(e) => setDepartmentInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 6. TEAM SELECTION PICKER (Super intuitive & visual) */}
          <div className="p-4 md:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-black text-white flex items-center gap-2">
                  <Shirt className="w-4 h-4 text-emerald-400" />
                  <span>تحديد الفريق المراد تعيين المسؤول له (من بين 48 فريقاً) *</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  اضغط على أي فريق أدناه لتحديده مباشرة، أو ابحث بالاسم
                </p>
              </div>

              {/* Quick team search inside form */}
              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث عن اسم الفريق أو المجموعة..."
                  value={teamSearchQuery}
                  onChange={(e) => setTeamSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Teams Quick Selection Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1 border border-slate-900 rounded-xl">
              {formFilteredTeams.map(t => {
                const isSelected = selectedTeamName === t.name;
                const existingManager = teamManagersMap.get(t.name);
                const isVacant = !existingManager;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTeamName(t.name)}
                    className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-tr from-emerald-600/30 to-teal-600/30 border-emerald-400 ring-2 ring-emerald-400/50 shadow-lg'
                        : isVacant
                        ? 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800'
                        : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <div className={`w-5 h-5 rounded-md bg-gradient-to-tr ${t.logoColor} flex items-center justify-center font-black text-[9px] text-white shrink-0`}>
                          {t.name.charAt(0)}
                        </div>
                        <span className={`text-xs font-black truncate ${isSelected ? 'text-emerald-300' : 'text-white'}`}>
                          {t.name}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-950 px-1 py-0.2 rounded border border-slate-800">
                        {t.group}
                      </span>
                    </div>

                    <div className="text-[10px]">
                      {isVacant ? (
                        <span className="text-emerald-400/90 font-bold flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          شاغر (متاح)
                        </span>
                      ) : (
                        <span className="text-slate-400 truncate block font-medium" title={existingManager.name}>
                          مسؤول: {existingManager.name.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedTeamName && (
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs border-t border-slate-900">
                <span className="text-slate-300 font-bold">
                  الفريق المختار: <strong className="text-emerald-400 font-black">{selectedTeamName}</strong> (المجموعة {teams.find(t => t.name === selectedTeamName)?.group})
                </span>
                {teamManagersMap.has(selectedTeamName) && (
                  <span className="text-amber-400 text-[11px] font-bold">
                    ⚠️ هذا الفريق لديه مسؤول حالي ({teamManagersMap.get(selectedTeamName)?.name}). سيتم استبداله بالمسؤول الجديد.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              * بمجرد الحفظ، سيمتلك هذا المسؤول كامل صلاحيات إدارة تشكيلة فريفه ولاعبيه فورياً.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setEmailInput('');
                  setPasswordInput('NU@2026');
                  setNameInput('');
                  setSelectedTeamName('');
                }}
                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                تفريغ الحقول
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !emailInput || !selectedTeamName}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-5 h-5 text-slate-950" />
                <span>{isSubmitting ? 'جارِ الاعتماد والحفظ على السيرفر...' : 'اعتماد وتعيين مسؤول الفريق فوراً ✓'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 📋 TABLE OF ALL 48 TEAMS AND THEIR MANAGERS */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base md:text-lg font-black text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span>دليل الفرق الـ 48 وحالة تعيين مسؤوليها</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              استعرض الفرق الشاغرة وعيّن لها مسؤولاً بنقرة واحدة، أو عدّل بيانات مسؤولي الفرق الحالية
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setTableFilterStatus('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  tableFilterStatus === 'all' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                الكل ({teams.length})
              </button>
              <button
                onClick={() => setTableFilterStatus('assigned')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  tableFilterStatus === 'assigned' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                مُعين ({stats.assigned}) ✓
              </button>
              <button
                onClick={() => setTableFilterStatus('vacant')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  tableFilterStatus === 'vacant' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                شاغر ({stats.vacant}) ⏳
              </button>
            </div>

            {/* Group Filter */}
            <select
              value={tableGroupFilter}
              onChange={(e) => setTableGroupFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer font-bold"
            >
              <option value="all">كل المجموعات (A-H)</option>
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(g => (
                <option key={g} value={g}>المجموعة {g}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input for Table */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث باسم الفريق، أو اسم المسؤول، أو إيميله، أو رقم القيد..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold">
                <th className="p-3.5 pr-5">الفريق والمجموعة</th>
                <th className="p-3.5">مسؤول الفريق المعتمد</th>
                <th className="p-3.5">البريد الإلكتروني (@nu)</th>
                <th className="p-3.5">كلمة المرور المسجلة</th>
                <th className="p-3.5">حالة التواجد والدخول</th>
                <th className="p-3.5 pl-5 text-center">إجراءات التحكم والتعيين</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredTeams.map((team) => {
                const manager = teamManagersMap.get(team.name);
                const hasManager = Boolean(manager);

                return (
                  <tr 
                    key={team.id}
                    className={`transition-colors ${
                      hasManager ? 'hover:bg-slate-800/30' : 'bg-amber-500/5 hover:bg-amber-500/10'
                    }`}
                  >
                    {/* Team Name & Logo */}
                    <td className="p-3.5 pr-5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${team.logoColor} flex items-center justify-center font-black text-xs text-white shadow-sm shrink-0`}>
                          {team.name.charAt(0)}
                        </div>
                        <div>
                          <strong className="text-white text-xs md:text-sm font-black block">{team.name}</strong>
                          <span className="text-[10px] text-slate-400 font-bold bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                            المجموعة {team.group}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Manager Name */}
                    <td className="p-3.5">
                      {manager ? (
                        <div>
                          <strong className="text-emerald-300 font-bold block">{manager.name}</strong>
                          {manager.studentId && (
                            <span className="text-[10px] text-slate-500 font-mono">ID: {manager.studentId}</span>
                          )}
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-black inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          شاغر (بدون مسؤول)
                        </span>
                      )}
                    </td>

                    {/* Email */}
                    <td className="p-3.5">
                      {manager ? (
                        <span className="font-mono text-slate-200 font-bold text-[11px]">{manager.email}</span>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    {/* Password */}
                    <td className="p-3.5">
                      {manager ? (
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-950 text-amber-300 border border-slate-800 text-[11px] font-bold">
                            {manager.password || 'NU@2026'}
                          </span>
                          <button
                            onClick={() => handleCopyCredentials(manager.email, manager.password || 'NU@2026', team.name)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                            title="نسخ بيانات الدخول"
                          >
                            {copiedKey === `${manager.email}_${team.name}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    {/* Presence */}
                    <td className="p-3.5">
                      {manager ? (
                        <div>
                          {manager.isOnline ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              متصل الآن 🟢
                            </span>
                          ) : manager.lastLoginAt ? (
                            <span className="text-[11px] text-slate-300 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatTimeAgoArabic(manager.lastLoginAt)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">لم يدخل بعد</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 pl-5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {manager ? (
                          <>
                            {/* WhatsApp Copy */}
                            <button
                              onClick={() => handleCopyWhatsAppMessage({
                                managerName: manager.name,
                                email: manager.email,
                                password: manager.password || 'NU@2026',
                                teamName: team.name,
                              })}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                              title="نسخ رسالة الترحيب وبيانات الدخول للواتساب"
                            >
                              <Send className="w-3 h-3 text-emerald-400" />
                              <span>واتساب 📱</span>
                            </button>

                            {/* Edit / Reassign button */}
                            <button
                              onClick={() => {
                                handleQuickAssignTeam(team.name);
                                setEmailInput(manager.email);
                                setNameInput(manager.name);
                                setPasswordInput(manager.password || 'NU@2026');
                                if (manager.studentId) setStudentIdInput(manager.studentId);
                              }}
                              className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              title="تعديل بيانات المسؤول"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>تعديل</span>
                            </button>

                            {/* Unassign button */}
                            <button
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من إلغاء تعيين (${manager.name}) كمسؤول لفريق (${team.name})؟`)) {
                                  onUnassignManager(manager.id, manager.email);
                                }
                              }}
                              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 cursor-pointer"
                              title="إلغاء تعيين هذا المسؤول"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          /* Quick Assign Button for Vacant Teams */
                          <button
                            onClick={() => handleQuickAssignTeam(team.name)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition-all"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>+ تعيين مسؤول لهذا الفريق</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🎉 SUCCESS ASSIGNMENT MODAL (مع رسالة الواتساب الجاهزة للنسخ) */}
      {/* ========================================================================= */}
      {successAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">تم تعيين واعتماد المسؤول بنجاح! 👑</h3>
                  <span className="text-xs text-emerald-400 font-bold">تمت المزامنة والحفظ على السيرفر فورياً</span>
                </div>
              </div>
              <button
                onClick={() => setSuccessAssignment(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Credentials Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">الفريق المخصص:</span>
                <strong className="text-emerald-300 font-black text-sm">
                  {successAssignment.teamName} (المجموعة {successAssignment.group})
                </strong>
              </div>
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">اسم المسؤول:</span>
                <strong className="text-white font-bold">{successAssignment.managerName}</strong>
              </div>
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">البريد الإلكتروني:</span>
                <span className="text-slate-200 font-mono font-bold">{successAssignment.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">كلمة المرور المسجلة:</span>
                <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-mono font-black border border-amber-500/40 text-sm">
                  {successAssignment.password}
                </span>
              </div>
            </div>

            {/* Ready WhatsApp Welcome Message Preview */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>رسالة ترحيبية جاهزة مع بيانات الدخول لإرسالها للمسؤول:</span>
              </span>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 font-sans leading-relaxed max-h-32 overflow-y-auto">
                <p>🏆 *دوري جامعة النيل 2026 - بطولة كرة القدم* 🏆</p>
                <p>أهلاً يا كابتن *{successAssignment.managerName}* 👋</p>
                <p>تم اعتمادك رسمياً كـ *مسؤول فريق ({successAssignment.teamName})* في المنظومة الإلكترونية للبطولة! 📋⚽</p>
                <p className="font-mono text-emerald-400 mt-1">📧 البريد: {successAssignment.email}</p>
                <p className="font-mono text-amber-400">🔐 كلمة المرور: {successAssignment.password}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                onClick={() => handleCopyWhatsAppMessage(successAssignment)}
                className="w-full sm:flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer transition-all"
              >
                {copiedKey === 'whatsapp' ? (
                  <>
                    <Check className="w-4 h-4 text-slate-950" />
                    <span>تم نسخ الرسالة للحافظة بنجاح! ✓</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-slate-950" />
                    <span>نسخ رسالة الواتساب الجاهزة للحافظة 📋</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setSuccessAssignment(null)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
