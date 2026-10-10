import React, { useState } from 'react';
import { 
  AppUser, 
  UserRole, 
  isValidNileUniversityEmail 
} from '../utils/auth';
import { 
  UserPlus, 
  LogIn, 
  Lock, 
  Mail, 
  User, 
  Building, 
  GraduationCap, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  UserCheck, 
  Trophy, 
  Compass, 
  Check
} from 'lucide-react';

interface SignupPageProps {
  users: AppUser[];
  teams: { name: string; group: string }[];
  onRegister: (newUser: AppUser) => void;
  onNavigateToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({
  users,
  teams,
  onRegister,
  onNavigateToLogin,
}) => {
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('كلية الهندسة والعلوم التطبيقية');
  const [role, setRole] = useState<UserRole>('spectator');
  const [selectedTeam, setSelectedTeam] = useState(teams[0]?.name || '');
  const [teamSearch, setTeamSearch] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const departmentsList = [
    'كلية الهندسة والعلوم التطبيقية',
    'كلية إدارة الأعمال',
    'كلية تكنولوجيا المعلومات وعلوم الحاسب',
    'كلية التكنولوجيا الحيوية',
    'إدارة رعاية الشباب والأنشطة الرياضية',
    'هيئة التدريس والموظفين',
  ];

  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(teamSearch.toLowerCase()) || 
    `المجموعة ${t.group}`.includes(teamSearch)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Validation
    if (!trimmedName) {
      setError('يرجى إدخال الاسم الكامل');
      return;
    }

    if (!trimmedEmail) {
      setError('يرجى إدخال البريد الإلكتروني الجامعي');
      return;
    }

    if (!isValidNileUniversityEmail(trimmedEmail)) {
      setError('عفواً، يجب أن ينتهي البريد بنطاق جامعة النيل الرسمي @nu.edu.eg');
      return;
    }

    // Check duplicate email
    const emailExists = users.some(u => u.email.toLowerCase() === trimmedEmail);
    if (emailExists) {
      setError('هذا البريد الجامعي مسجل بالفعل! يمكنك الانتقال إلى تسجيل الدخول.');
      return;
    }

    if (!password) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    if (password.length < 4) {
      setError('كلمة المرور يجب أن تكون 4 أحرف أو أرقام على الأقل');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمة المرور وتأكيد كلمة المرور غير متطابقين');
      return;
    }

    if ((role === 'team_manager' || role === 'player') && !selectedTeam) {
      setError('يرجى اختيار الفريق التابع له');
      return;
    }

    if (!agreedToTerms) {
      setError('يرجى الموافقة على ميثاق الروح الرياضية للبطولة');
      return;
    }

    setIsLoading(true);

    const isManagerReq = role === 'team_manager';

    const newUser: AppUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmedName,
      email: trimmedEmail,
      password: password,
      role: isManagerReq ? 'spectator' : role, // Stays spectator until admin approves!
      managerApprovalStatus: isManagerReq ? 'pending' : 'approved',
      requestedTeamName: isManagerReq ? selectedTeam : undefined,
      managedTeamName: undefined, // Unlocked only when admin approves
      playerTeamName: role === 'player' ? selectedTeam : undefined,
      studentId: studentId.trim() || undefined,
      department: department,
      registeredAt: new Date().toISOString().split('T')[0],
      notes: isManagerReq 
        ? `طلب تولي مسؤولية فريق [${selectedTeam}] (قيد مراجعة واعتماد الإدارة ⏳)` 
        : `حساب جديد (${role === 'player' ? 'لاعب' : 'متفرج'})`
    };

    setTimeout(() => {
      setIsLoading(false);
      if (isManagerReq) {
        setSuccess(`أهلاً بك يا ${trimmedName}! تم تسجيل حسابك، وطلبك لإدارة فريق [${selectedTeam}] بانتظار اعتماد إدارة البطولة ⏳. تتصفح حالياً بصلاحية متفرج لحين اعتماد الأدمن.`);
      } else {
        setSuccess(`تهانينا يا ${trimmedName}! تم إنشاء حسابك بنجاح وجاري فتح البطولة...`);
      }
      setTimeout(() => {
        onRegister(newUser);
      }, 700);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 py-8 relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-white" dir="rtl">
      
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Central Signup Container */}
      <div className="w-full max-w-2xl relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-500/25 ring-4 ring-emerald-500/20">
            <Trophy className="w-7 h-7 text-slate-950" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>جامعة النيل • دوري كرة القدم 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              إنشاء حساب جديد (Sign Up)
            </h1>
            <p className="text-xs text-slate-400">
              سجل بياناتك الرسمية بالبريد الجامعي (<span className="text-emerald-400 font-mono">@nu.edu.eg</span>)
            </p>
          </div>
        </div>

        {/* Signup Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl space-y-5">
          
          {/* Error & Success Feedback Alerts */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-bold">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Role Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                نوع الحساب في البطولة *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('spectator')}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col gap-1 ${
                    role === 'spectator'
                      ? 'bg-slate-800/90 border-emerald-500 text-white ring-1 ring-emerald-500'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs text-white">
                    <div className="flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-sky-400" />
                      <span>متفرج / مشجع</span>
                    </div>
                    {role === 'spectator' && <Check className="w-3 h-3 text-emerald-400" />}
                  </div>
                  <span className="text-[10px] text-slate-400">متابعة الماتشات والترتيب</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('player')}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col gap-1 ${
                    role === 'player'
                      ? 'bg-slate-800/90 border-blue-500 text-white ring-1 ring-blue-500'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs text-white">
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-blue-400" />
                      <span>لاعب في فريق</span>
                    </div>
                    {role === 'player' && <Check className="w-3 h-3 text-blue-400" />}
                  </div>
                  <span className="text-[10px] text-slate-400">مسجل ضمن قائمة فرقة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('team_manager')}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col gap-1 ${
                    role === 'team_manager'
                      ? 'bg-slate-800/90 border-teal-500 text-white ring-1 ring-teal-500'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs text-white">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                      <span>مسؤول فريق</span>
                    </div>
                    {role === 'team_manager' ? (
                      <Check className="w-3.5 h-3.5 text-teal-400" />
                    ) : (
                      <span className="text-[9px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        يتطلب موافقة الأدمن 🔒
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">إدارة التشكيلة والتبديلات (باعتماد الإدارة)</span>
                </button>
              </div>
            </div>

            {/* Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">الاسم الكامل *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="الاسم ثلاثي أو رباعي"
                    className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl pr-10 pl-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">البريد الجامعي (@nu.edu.eg) *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student_id@nu.edu.eg"
                    className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl pr-10 pl-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Student ID & Faculty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">رقم القيد الجامعي / Student ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    dir="ltr"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="مثال: 20240188"
                    className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl pr-10 pl-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">الكلية / الجهة *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                    <Building className="w-4 h-4" />
                  </div>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl pr-10 pl-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none transition-colors cursor-pointer"
                  >
                    {departmentsList.map(dep => (
                      <option key={dep} value={dep} className="bg-slate-900 text-white">
                        {dep}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Team Picker for Player or Team Manager */}
            {(role === 'team_manager' || role === 'player') && (
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>اختر الفريق التابع له (من الـ 48 فريقاً) *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="بحث في الفرق..."
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white max-w-[140px] focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-32 overflow-y-auto p-1 border border-slate-800 rounded-xl">
                  {filteredTeams.map(t => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => setSelectedTeam(t.name)}
                      className={`p-2 rounded-lg text-xs font-bold text-right flex items-center justify-between transition-colors cursor-pointer ${
                        selectedTeam === t.name
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">{t.name}</span>
                      <span className="text-[9px] opacity-70">مج {t.group}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  الفريق المختار: <strong className="text-emerald-400">{selectedTeam}</strong>
                </p>
              </div>
            )}

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">كلمة المرور * (4 خانات فأكثر)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl pr-10 pl-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">تأكيد كلمة المرور *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    dir="ltr"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl pr-10 pl-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="pt-1">
              <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0 cursor-pointer shrink-0"
                />
                <span>أوافق على لوائح وميثاق دوري جامعة النيل 2026 وأتعهد بصحة البيانات.</span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>جاري تسجيل الحساب والدخول...</span>
                </span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>إتمام إنشاء الحساب والدخول للبطولة</span>
                </>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="pt-4 border-t border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-400">لديك حساب مسجل بالفعل؟</p>
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 border border-emerald-500/30 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>الذهاب لصفحة تسجيل الدخول (Login)</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
