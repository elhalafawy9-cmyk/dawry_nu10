import React, { useState } from 'react';
import { 
  AppUser, 
  PERMANENT_ADMIN_EMAIL, 
  PERMANENT_ADMIN_PASSWORD, 
  isValidNileUniversityEmail, 
  UserRole,
  INITIAL_USERS 
} from '../utils/auth';
import { 
  Shield, 
  Lock, 
  Mail, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  LogOut, 
  Sparkles, 
  GraduationCap, 
  UserPlus, 
  LogIn,
  KeyRound,
  Building,
  Check
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  users: AppUser[];
  onLogin: (user: AppUser) => void;
  onRegister: (newUser: AppUser) => void;
  onLogout: () => void;
  onOpenFullLoginPage?: () => void;
  onOpenFullSignupPage?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  onLogin,
  onRegister,
  onLogout,
  onOpenFullLoginPage,
  onOpenFullSignupPage,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regStudentId, setRegStudentId] = useState('');
  const [regDepartment, setRegDepartment] = useState('كلية الهندسة والعلوم التطبيقية');
  const [regRole, setRegRole] = useState<UserRole>('spectator');
  const [regTeam, setRegTeam] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginSuccess('');

    const trimmedEmail = loginEmail.trim().toLowerCase();

    // Check Nile University domain
    if (!isValidNileUniversityEmail(trimmedEmail)) {
      setLoginError('عفواً، يجب إدخال بريد إلكتروني جامعي ينتهي بـ @nu.edu.eg حصراً!');
      return;
    }

    // Check against permanent admin credentials
    if (trimmedEmail === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
      if (loginPassword !== PERMANENT_ADMIN_PASSWORD) {
        setLoginError('كلمة المرور غير صحيحة لحساب المدير العام للنظام!');
        return;
      }
      let adminUser = users.find(u => u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) || INITIAL_USERS[0];
      const resolvedAdmin: AppUser = {
        ...adminUser,
        name: 'المدير العام للنظام',
        email: PERMANENT_ADMIN_EMAIL,
        password: PERMANENT_ADMIN_PASSWORD,
        role: 'admin',
        isPermanentAdmin: true,
      };
      onLogin(resolvedAdmin);
      setLoginSuccess('مرحباً بك، تم تسجيل الدخول بصلاحيات الأدمن الكاملة 👑');
      setTimeout(() => {
        onClose();
        setLoginSuccess('');
      }, 800);
      return;
    }

    // Check against all registered users
    const matchedUser = users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (!matchedUser) {
      setLoginError('هذا البريد الجامعي غير مسجل لدينا. يمكنك إنشاء حساب جديد خلال ثوانٍ!');
      return;
    }

    if (matchedUser.password && matchedUser.password !== loginPassword) {
      setLoginError('كلمة المرور غير صحيحة!');
      return;
    }

    const userToLogin: AppUser = (matchedUser.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase())
      ? { ...matchedUser, role: 'admin', isPermanentAdmin: true }
      : matchedUser;

    onLogin(userToLogin);
    setLoginSuccess(`تم تسجيل الدخول بنجاح! مرحباً ${userToLogin.name}`);
    setTimeout(() => {
      onClose();
      setLoginSuccess('');
    }, 800);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    const trimmedEmail = regEmail.trim().toLowerCase();

    if (!isValidNileUniversityEmail(trimmedEmail)) {
      setRegError('يجب أن ينتهي البريد الإلكتروني بنطاق جامعة النيل الرسمي @nu.edu.eg');
      return;
    }

    if (!regName.trim()) {
      setRegError('يرجى كتابة الاسم الكامل');
      return;
    }

    if (regPassword.length < 4) {
      setRegError('يجب أن تتكون كلمة المرور من 4 أحرف أو أرقام على الأقل');
      return;
    }

    // Admin direct registration/activation
    if (trimmedEmail === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
      const adminAcc: AppUser = {
        id: 'user_super_admin',
        name: regName.trim() || 'المدير العام للنظام',
        email: PERMANENT_ADMIN_EMAIL,
        password: regPassword,
        role: 'admin',
        isPermanentAdmin: true,
        studentId: regStudentId.trim() || '241000442',
        department: regDepartment,
        registeredAt: new Date().toISOString().split('T')[0],
        notes: 'المدير العام للنظام - كامل صلاحيات الإدارة',
        isOnline: true,
      };
      onRegister(adminAcc);
      onLogin(adminAcc);
      setRegSuccess('تم تفعيل حسابك كمدير عام للنظام بنجاح! 👑');
      setTimeout(() => {
        onClose();
        setRegSuccess('');
      }, 800);
      return;
    }

    // Check if email already registered
    const exists = users.some(u => u.email.toLowerCase() === trimmedEmail);
    if (exists) {
      setRegError('هذا البريد الجامعي مسجل بالفعل! يرجى الانتقال إلى تسجيل الدخول');
      return;
    }

    const newUser: AppUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: regName.trim(),
      email: trimmedEmail,
      password: regPassword,
      role: regRole,
      managedTeamName: regRole === 'team_manager' ? regTeam : undefined,
      playerTeamName: regRole === 'player' ? regTeam : undefined,
      studentId: regStudentId.trim() || undefined,
      department: regDepartment,
      registeredAt: new Date().toISOString().split('T')[0],
      isPermanentAdmin: false,
    };

    onRegister(newUser);
    onLogin(newUser);
    setRegSuccess('تم إنشاء الحساب بنجاح وتسجيل الدخول تلقائياً! 🎉');
    setTimeout(() => {
      onClose();
      setRegSuccess('');
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-base">بوابة جامعة النيل الرسمية</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  @nu.edu.eg
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">دوري جامعة النيل 2026 • نظام الهوية والصلاحيات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current User Bar if logged in */}
        {currentUser && (
          <div className="p-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">{currentUser.name}</span>
                  {currentUser.isPermanentAdmin && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5 text-amber-400" />
                      أدمن دائم 👑
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-mono">{currentUser.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                onLogout();
                setLoginSuccess('');
              }}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              خروج
            </button>
          </div>
        )}

        {/* Tabs: Login vs Register */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => { setTab('login'); setLoginError(''); setRegError(''); }}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                tab === 'login'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              تسجيل الدخول
            </button>
            <button
              onClick={() => { setTab('register'); setLoginError(''); setRegError(''); }}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                tab === 'register'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              إنشاء حساب جديد (@nu)
            </button>
          </div>

          {/* Quick link to full dedicated pages */}
          {(onOpenFullLoginPage || onOpenFullSignupPage) && (
            <div className="flex items-center justify-between pt-2 px-1 text-[11px]">
              {onOpenFullLoginPage && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFullLoginPage();
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <LogIn className="w-3 h-3" />
                  <span>فتح صفحة تسجيل الدخول الكاملة ↗</span>
                </button>
              )}
              {onOpenFullSignupPage && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFullSignupPage();
                  }}
                  className="text-teal-400 hover:text-teal-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>فتح صفحة التسجيل الكاملة ↗</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {tab === 'login' && (
            <div className="space-y-4">

              {loginError && (
                <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{loginError}</span>
                </div>
              )}

              {loginSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{loginSuccess}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300">البريد الإلكتروني الجامعي *</label>
                    <span className="text-[10px] text-emerald-400 font-bold">نطاق جامعة النيل فقط</span>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="اسمك@nu.edu.eg"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  {!loginEmail.toLowerCase().endsWith('@nu.edu.eg') && loginEmail.length > 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        const prefix = loginEmail.split('@')[0];
                        setLoginEmail(`${prefix}@nu.edu.eg`);
                      }}
                      className="mt-1 text-[10px] text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
                    >
                      إضافة @nu.edu.eg تلقائياً
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">كلمة المرور *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="كلمة المرور"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all mt-2"
                >
                  <LogIn className="w-4 h-4" />
                  تسجيل الدخول إلى النظام
                </button>
              </form>
            </div>
          )}

          {tab === 'register' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>التسجيل متاح لطلاب وأعضاء جامعة النيل فقط عبر النطاق <strong className="text-emerald-300 font-mono">@nu.edu.eg</strong></span>
              </div>

              {regError && (
                <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{regError}</span>
                </div>
              )}

              {regSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{regSuccess}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الاسم الكامل *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="مثال: يوسف حسام الدين"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300">البريد الإلكتروني الجامعي (@nu.edu.eg) *</label>
                    <span className="text-[10px] text-emerald-400 font-bold">إلزامي</span>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="your.name@nu.edu.eg"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  {!regEmail.toLowerCase().endsWith('@nu.edu.eg') && regEmail.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const prefix = regEmail.split('@')[0];
                        setRegEmail(`${prefix}@nu.edu.eg`);
                      }}
                      className="mt-1 text-[10px] text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
                    >
                      إضافة @nu.edu.eg تلقائياً
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">كلمة المرور *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">رقم الطالب الجامعي (ID)</label>
                    <input
                      type="text"
                      placeholder="مثال: 20240999"
                      value={regStudentId}
                      onChange={(e) => setRegStudentId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">نوع الحساب *</label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="spectator">متفرج ومتابع 👁️</option>
                      <option value="player">لاعب في البطولة ⚽</option>
                      <option value="team_manager">مسؤول فريق 📋</option>
                      <option value="admin">مسؤول نظام / إدارة البطولة (Admin) 👑</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">الكلية</label>
                    <select
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="كلية الهندسة والعلوم التطبيقية">الهندسة والعلوم التطبيقية</option>
                      <option value="كلية تكنولوجيا المعلومات وعلوم الحاسب">تكنولوجيا المعلومات وعلوم الحاسب</option>
                      <option value="كلية إدارة الأعمال">إدارة الأعمال</option>
                      <option value="كلية التكنولوجيا الحيوية">التكنولوجيا الحيوية</option>
                    </select>
                  </div>
                </div>

                {(regRole === 'team_manager' || regRole === 'player') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {regRole === 'team_manager' ? 'اسم الفريق الذي تديره' : 'اسم الفريق الذي تلعب فيه'}
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: برشلونة أو الاهلي أو الزمالك"
                      value={regTeam}
                      onChange={(e) => setRegTeam(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all mt-2"
                >
                  <UserPlus className="w-4 h-4" />
                  إنشاء الحساب والتسجيل بالبطولة
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
