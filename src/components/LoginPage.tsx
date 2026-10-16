import React, { useState } from 'react';
import { 
  AppUser, 
  PERMANENT_ADMIN_EMAIL, 
  PERMANENT_ADMIN_PASSWORD, 
  isValidNileUniversityEmail,
  INITIAL_USERS,
  saveStoredUsers
} from '../utils/auth';
import { fetchServerUsers } from '../utils/apiSync';
import { 
  LogIn, 
  Lock, 
  Mail, 
  UserPlus, 
  Shield, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  GraduationCap, 
  Trophy,
  Crown,
  UserCheck,
  Shirt
} from 'lucide-react';

interface LoginPageProps {
  users: AppUser[];
  onLogin: (user: AppUser) => void;
  onNavigateToSignup: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  users,
  onLogin,
  onNavigateToSignup,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedEmail = email.trim().toLowerCase();

    // Validate email
    if (!trimmedEmail) {
      setError('يرجى إدخال البريد الإلكتروني الجامعي');
      return;
    }

    if (!isValidNileUniversityEmail(trimmedEmail)) {
      setError('عفواً، يجب أن ينتهي البريد بنطاق جامعة النيل الرسمي @nu.edu.eg');
      return;
    }

    if (!password) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    setIsLoading(true);

    // Check Permanent Super Admin credentials
    if (trimmedEmail === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
      if (password !== PERMANENT_ADMIN_PASSWORD) {
        setIsLoading(false);
        setError('كلمة المرور غير صحيحة لحساب المدير العام للنظام!');
        return;
      }

      let adminUser = users.find(u => u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase());
      if (!adminUser) {
        const fresh = await fetchServerUsers();
        adminUser = fresh?.find(u => u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase());
      }
      if (!adminUser) {
        adminUser = INITIAL_USERS[0];
      }

      const resolvedAdmin: AppUser = {
        ...adminUser,
        name: 'المدير العام للنظام',
        email: PERMANENT_ADMIN_EMAIL,
        password: PERMANENT_ADMIN_PASSWORD,
        role: 'admin',
        isPermanentAdmin: true,
      };

      setIsLoading(false);
      setSuccess(`أهلاً بك يا ${resolvedAdmin.name}، تم التحقق بنجاح والدخول بصلاحيات الأدمن الكاملة 👑`);
      setTimeout(() => {
        onLogin(resolvedAdmin);
      }, 400);
      return;
    }

    // Match in registered users (check local users, and if not found, check server)
    let matched = users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (!matched) {
      const serverUsers = await fetchServerUsers();
      matched = serverUsers?.find(u => u.email.toLowerCase() === trimmedEmail);
    }

    if (!matched) {
      setIsLoading(false);
      setError('هذا البريد الجامعي غير مسجل لدينا! اضغط على "إنشاء حساب جديد" بالأسفل للتسجيل.');
      return;
    }

    if (matched.password && matched.password !== password) {
      setIsLoading(false);
      setError('كلمة المرور غير صحيحة، يرجى التأكد والمحاولة مرة أخرى');
      return;
    }

    const userToLogin: AppUser = (matched.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase())
      ? { ...matched, role: 'admin', isPermanentAdmin: true }
      : matched;

    setIsLoading(false);
    setSuccess(`تم تسجيل الدخول بنجاح! مرحباً ${userToLogin.name}`);
    setTimeout(() => {
      onLogin(userToLogin);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-white" dir="rtl">
      
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Central Login Container */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* University Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-500/25 ring-4 ring-emerald-500/20">
            <Trophy className="w-8 h-8 text-slate-950" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>جامعة النيل • دوري كرة القدم 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              تسجيل الدخول
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              المنظومة محمية ومخصصة لمنتسبي جامعة النيل (<span className="text-emerald-400 font-mono">@nu.edu.eg</span>)
            </p>
          </div>
        </div>

        {/* Login Box */}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>البريد الإلكتروني الجامعي (@nu.edu.eg) *</span>
                {email && isValidNileUniversityEmail(email) && (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    نطاق معتمد
                  </span>
                )}
              </label>
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
                  placeholder="name@nu.edu.eg"
                  className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl pr-10 pl-4 py-3 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none transition-colors font-mono"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                كلمة المرور *
              </label>
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
                  className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl pr-10 pl-10 py-3 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span>تذكر تسجيل الدخول</span>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">NU Tournament</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>جاري التحقق والدخول...</span>
                </span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول إلى البطولة</span>
                </>
              )}
            </button>
          </form>


          {/* Switch to Signup */}
          <div className="pt-3 border-t border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-400">
              ليس لديك حساب بعد؟
            </p>
            <button
              type="button"
              onClick={onNavigateToSignup}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 border border-emerald-500/30 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>إنشاء حساب جديد (Sign Up)</span>
            </button>
          </div>

        </div>

        {/* Security Footer Notice */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
            <Shield className="w-3.5 h-3.5 text-emerald-500/70" />
            <span>نظام تسجيل موحد معتمد • جامعة النيل 2026</span>
          </div>
        </div>

      </div>

    </div>
  );
};
