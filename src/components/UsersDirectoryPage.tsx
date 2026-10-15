import React, { useState, useMemo } from 'react';
import { 
  AppUser, 
  PERMANENT_ADMIN_EMAIL, 
  UserRole,
  isValidNileUniversityEmail 
} from '../utils/auth';
import { Team } from '../App';
import { 
  Users, 
  Shield, 
  UserCheck, 
  Eye, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Sparkles, 
  Filter, 
  Plus, 
  X, 
  Shirt, 
  Trophy, 
  GraduationCap, 
  Mail, 
  Building, 
  ArrowUpDown,
  Check,
  Crown,
  Clock,
  RefreshCw,
  LogIn,
  Activity,
  Key
} from 'lucide-react';
import { formatTimeAgoArabic } from '../utils/apiSync';

interface UsersDirectoryPageProps {
  users: AppUser[];
  currentUser: AppUser | null;
  teams: Team[];
  onUpdateUserRole: (userId: string, newRole: UserRole, teamName?: string) => void;
  onUpdateUser: (updatedUser: AppUser) => void;
  onAddUser: (newUser: AppUser) => void;
  onDeleteUser: (userId: string) => void;
  onRefreshUsers?: () => void;
  isSyncing?: boolean;
  lastSyncTime?: string;
  onNavigateToAssignManagers?: () => void;
}

export const UsersDirectoryPage: React.FC<UsersDirectoryPageProps> = ({
  users,
  currentUser,
  teams,
  onUpdateUserRole,
  onUpdateUser,
  onAddUser,
  onDeleteUser,
  onRefreshUsers,
  isSyncing,
  lastSyncTime,
  onNavigateToAssignManagers,
}) => {
  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [presenceFilter, setPresenceFilter] = useState<'all' | 'online' | 'entered'>('all');
  const [sortBy, setSortBy] = useState<'recent_login' | 'online_first' | 'registered' | 'name'>('recent_login');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // Change Role Modal State
  const [selectedUserForRole, setSelectedUserForRole] = useState<AppUser | null>(null);
  const [newRoleSelection, setNewRoleSelection] = useState<UserRole>('spectator');
  const [assignedTeamSelection, setAssignedTeamSelection] = useState<string>('');

  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('Password123');
  const [newUserRole, setNewUserRole] = useState<UserRole>('player');
  const [newUserTeam, setNewUserTeam] = useState(teams[0]?.name || 'برشلونة');
  const [newUserStudentId, setNewUserStudentId] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState('كلية الهندسة والعلوم التطبيقية');
  const [addUserError, setAddUserError] = useState('');
  const [addUserSuccess, setAddUserSuccess] = useState('');

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Delete User Confirmation Modal State (Fixes window.confirm bug)
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

  // Success notification banner
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Pending Manager Requests (Need Admin Approval)
  const pendingManagers = useMemo(() => {
    return users.filter(u => u.managerApprovalStatus === 'pending' && u.requestedTeamName);
  }, [users]);

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    const filtered = users.filter(user => {
      // Presence filter
      if (presenceFilter === 'online' && !user.isOnline) return false;
      if (presenceFilter === 'entered' && !user.lastLoginAt) return false;

      // Role filter
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;

      // Team filter
      if (teamFilter !== 'all') {
        const userTeam = user.managedTeamName || user.playerTeamName;
        if (userTeam !== teamFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchName = user.name.toLowerCase().includes(query);
        const matchEmail = user.email.toLowerCase().includes(query);
        const matchId = user.studentId?.toLowerCase().includes(query) || false;
        const matchTeam = (user.managedTeamName || user.playerTeamName || '').toLowerCase().includes(query);
        return matchName || matchEmail || matchId || matchTeam;
      }

      return true;
    });

    // Sorting
    return [...filtered].sort((a, b) => {
      // Permanent admin always first
      if (a.isPermanentAdmin) return -1;
      if (b.isPermanentAdmin) return 1;

      if (sortBy === 'recent_login') {
        const timeA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
        const timeB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
        if (timeA !== timeB) return timeB - timeA;
      }
      if (sortBy === 'online_first') {
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        const timeA = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const timeB = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        if (timeA !== timeB) return timeB - timeA;
      }
      if (sortBy === 'registered') {
        return (b.registeredAt || '').localeCompare(a.registeredAt || '');
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'ar');
      }
      return 0;
    });
  }, [users, roleFilter, teamFilter, searchQuery, presenceFilter, sortBy]);

  // Statistics
  const onlineCount = useMemo(() => users.filter(u => u.isOnline).length, [users]);
  const stats = useMemo(() => {
    return {
      total: users.length,
      online: onlineCount,
      admins: users.filter(u => u.role === 'admin').length,
      managers: users.filter(u => u.role === 'team_manager').length,
      players: users.filter(u => u.role === 'player').length,
      spectators: users.filter(u => u.role === 'spectator').length,
    };
  }, [users, onlineCount]);

  // Open role change modal
  const handleOpenRoleModal = (user: AppUser) => {
    if (user.isPermanentAdmin || user.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
      showFeedback('تنبيه أمني: هذا الحساب مثبت كمدير دائم للنظام ولا يمكن تغيير رتبته 🛡️');
      return;
    }
    setSelectedUserForRole(user);
    setNewRoleSelection(user.role);
    setAssignedTeamSelection(user.managedTeamName || user.playerTeamName || teams[0]?.name || 'برشلونة');
  };

  // Submit role change
  const handleSaveRoleChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForRole) return;

    if (selectedUserForRole.isPermanentAdmin || selectedUserForRole.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
      showFeedback('عفواً، لا يمكن تعديل صلاحيات المدير الدائم للنظام!');
      setSelectedUserForRole(null);
      return;
    }

    const team = (newRoleSelection === 'team_manager' || newRoleSelection === 'player') 
      ? assignedTeamSelection 
      : undefined;

    onUpdateUserRole(selectedUserForRole.id, newRoleSelection, team);
    showFeedback(`تم تحديث صلاحية [${selectedUserForRole.name}] بنجاح إلى: ${getRoleTitle(newRoleSelection)} ${team ? `(${team})` : ''} ✨`);
    setSelectedUserForRole(null);
  };

  // Quick direct role change button
  const handleQuickSetRole = (user: AppUser, targetRole: UserRole, defaultTeam?: string) => {
    if (user.isPermanentAdmin || user.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
      showFeedback('تنبيه أمني: هذا الحساب مثبت كمدير دائم للنظام ولا يمكن تعديل صلاحيته!');
      return;
    }
    const team = (targetRole === 'team_manager' || targetRole === 'player') 
      ? (defaultTeam || user.managedTeamName || user.playerTeamName || teams[0]?.name || 'برشلونة')
      : undefined;

    onUpdateUserRole(user.id, targetRole, team);
    showFeedback(`تم تغيير صلاحية [${user.name}] فوراً إلى: ${getRoleTitle(targetRole)} ${team ? `(${team})` : ''}`);
  };

  // Submit Add User
  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError('');
    setAddUserSuccess('');

    const trimmedEmail = newUserEmail.trim().toLowerCase();

    if (!isValidNileUniversityEmail(trimmedEmail)) {
      setAddUserError('يجب أن ينتهي البريد الإلكتروني بنطاق جامعة النيل @nu.edu.eg');
      return;
    }

    if (!newUserName.trim()) {
      setAddUserError('يرجى إدخال اسم المستخدم');
      return;
    }

    if (users.some(u => u.email.toLowerCase() === trimmedEmail)) {
      setAddUserError('هذا البريد الجامعي مسجل بالفعل في المنظومة!');
      return;
    }

    const created: AppUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newUserName.trim(),
      email: trimmedEmail,
      password: newUserPassword,
      role: newUserRole,
      managedTeamName: newUserRole === 'team_manager' ? newUserTeam : undefined,
      playerTeamName: newUserRole === 'player' ? newUserTeam : undefined,
      studentId: newUserStudentId.trim() || undefined,
      department: newUserDepartment,
      registeredAt: new Date().toISOString().split('T')[0],
      isPermanentAdmin: false,
    };

    onAddUser(created);
    showFeedback(`تمت إضافة العضو [${created.name}] بنجاح كـ ${getRoleTitle(created.role)}! 🎉`);
    setIsAddUserModalOpen(false);

    // Reset form
    setNewUserName('');
    setNewUserEmail('');
    setNewUserStudentId('');
  };

  // Submit Edit User
  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (editingUser.isPermanentAdmin || editingUser.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
      showFeedback('تنبيه أمني: الحساب الدائم محمي بالكامل من التعديل!');
      setEditingUser(null);
      return;
    }

    onUpdateUser(editingUser);
    showFeedback(`تم حفظ تعديلات بيانات [${editingUser.name}] بنجاح!`);
    setEditingUser(null);
  };

  // Delete user trigger (Opens in-app confirmation modal)
  const handleDeleteUser = (user: AppUser) => {
    if (user.isPermanentAdmin || user.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
      showFeedback('تحذير: لا يمكن حذف حساب المدير الدائم للنظام!');
      return;
    }
    setUserToDelete(user);
  };

  // Confirm delete execution
  const confirmDeleteUser = () => {
    if (!userToDelete) return;
    if (userToDelete.isPermanentAdmin || userToDelete.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
      showFeedback('تحذير: لا يمكن حذف حساب المدير الدائم للنظام!');
      setUserToDelete(null);
      return;
    }
    const targetName = userToDelete.name;
    onDeleteUser(userToDelete.id);
    setUserToDelete(null);
    showFeedback(`تم حذف حساب [${targetName}] نهائياً من قاعدة بيانات البطولة بنجاح! 🗑️`);
  };

  // Approve Pending Manager
  const handleApproveManager = (user: AppUser) => {
    const targetTeam = user.requestedTeamName || user.managedTeamName || teams[0]?.name || 'فريق البطولة';
    const updated: AppUser = {
      ...user,
      role: 'team_manager',
      managedTeamName: targetTeam,
      managerApprovalStatus: 'approved',
      notes: `مسؤول معتمد لفريق ${targetTeam} (تم الاعتماد من الإدارة) ✓`
    };
    onUpdateUser(updated);
    showFeedback(`تم اعتماد [${user.name}] كمسؤول رسمي لفريق [${targetTeam}] بنجاح وتفعيل الصلاحية له! ✓`);
  };

  // Reject Pending Manager
  const handleRejectManager = (user: AppUser) => {
    const updated: AppUser = {
      ...user,
      role: 'spectator',
      managerApprovalStatus: 'rejected',
      requestedTeamName: undefined,
      managedTeamName: undefined,
      notes: `تم رفض طلب المسؤولية من إدارة البطولة - الحساب يعمل كمتفرج`
    };
    onUpdateUser(updated);
    showFeedback(`تم رفض طلب إدارة الفريق للعضو [${user.name}] وإبقاؤه بصلاحية متفرج.`);
  };

  const getRoleTitle = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'أدمن ومدير نظام 🛡️';
      case 'team_manager': return 'مسؤول فريق 📋';
      case 'player': return 'لاعب بالبطولة ⚽';
      case 'spectator': return 'متفرج ومتابع 👁️';
    }
  };

  const getRoleBadge = (user: AppUser) => {
    if (user.isPermanentAdmin || user.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
      return (
        <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black flex items-center gap-1 shadow-sm shadow-amber-500/20">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          أدمن دائم للنظام 👑
        </span>
      );
    }
    if (user.managerApprovalStatus === 'pending' && user.requestedTeamName) {
      return (
        <span className="px-2.5 py-0.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 animate-pulse">
          <Clock className="w-3 h-3 text-amber-400" />
          طلب مسؤول: {user.requestedTeamName} (بانتظار الاعتماد ⏳)
        </span>
      );
    }
    switch (user.role) {
      case 'admin':
        return (
          <span className="px-2.5 py-0.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-bold flex items-center gap-1">
            <Shield className="w-3 h-3 text-purple-400" />
            أدمن ومسؤول 🛡️
          </span>
        );
      case 'team_manager':
        return (
          <span className="px-2.5 py-0.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-emerald-400" />
            مسؤول: {user.managedTeamName || 'فريق'} 📋
          </span>
        );
      case 'player':
        return (
          <span className="px-2.5 py-0.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[11px] font-bold flex items-center gap-1">
            <Shirt className="w-3 h-3 text-blue-400" />
            لاعب: {user.playerTeamName || 'فريق'} ⚽
          </span>
        );
      case 'spectator':
        return (
          <span className="px-2.5 py-0.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1">
            <Eye className="w-3 h-3 text-slate-400" />
            متفرج ومشجع 👁️
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-sm font-bold flex items-center gap-3 animate-fade-in shadow-xl shadow-emerald-950/50">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Permanent Super Admin Protection Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/30 border-2 border-amber-500/40 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/30 shrink-0">
              <Crown className="w-7 h-7 text-slate-950" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-white">
                  المدير الدائم للنظام (Super Admin) 🛡️
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-black flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  حساب محمي نهائياً
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                البريد الإلكتروني المعتمد: <strong className="text-amber-300 font-mono text-sm">{PERMANENT_ADMIN_EMAIL}</strong>
              </p>
              <p className="text-[11px] text-amber-400/90 font-medium">
                🔒 تم تثبيت هذا الحساب كمدير دائم للنظام ولا يملك أي شخص صلاحية حذفه أو تخفيض رتبته.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="px-3.5 py-2 rounded-2xl bg-slate-950/80 border border-amber-500/30 text-amber-200 text-xs font-bold flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              جامعة النيل • دوري 2026
            </span>
          </div>
        </div>
      </div>

      {/* Live Server Synchronization & Online Presence Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-xl shadow-emerald-950/20">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-75" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-white">مزامنة حضور ودخول المستخدمين مع السيرفر</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                متصل الآن: {stats.online} مستخدم 🟢
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold">
                إجمالي الدليل: {stats.total}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              كل من يدخل أو يسجل من أي موبايل أو لابتوب يظهر فورياً هنا في الدليل.
              {lastSyncTime && <span className="mr-2 text-emerald-400/80 font-mono">| آخر تحديث: {lastSyncTime}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {onRefreshUsers && (
            <button
              onClick={onRefreshUsers}
              disabled={isSyncing}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs border border-emerald-500/40 flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'جارِ التحديث...' : 'تحديث فوري من السيرفر 🔄'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Statistics Grid (6 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-bold block">إجمالي المسجلين</span>
            <strong className="text-xl font-black text-white font-mono">{stats.total}</strong>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/40 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-300 font-bold block">متصل الآن 🟢</span>
            <strong className="text-xl font-black text-emerald-400 font-mono">{stats.online}</strong>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-purple-500/30 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-purple-300 font-bold block">مدراء (Admins)</span>
            <strong className="text-xl font-black text-purple-400 font-mono">{stats.admins}</strong>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/30 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-300 font-bold block">مسؤولو الفرق</span>
            <strong className="text-xl font-black text-emerald-400 font-mono">{stats.managers}</strong>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-blue-500/30 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-blue-300 font-bold block">اللاعبون</span>
            <strong className="text-xl font-black text-blue-400 font-mono">{stats.players}</strong>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Shirt className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-bold block">المتفرجون</span>
            <strong className="text-xl font-black text-slate-300 font-mono">{stats.spectators}</strong>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
            <Eye className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Search, Filters, Presence Pills and Add User Button */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
        {/* Presence Pills & Quick Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 ml-1">تصفية التواجد:</span>
            <button
              onClick={() => setPresenceFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                presenceFilter === 'all'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              الكل ({users.length})
            </button>
            <button
              onClick={() => setPresenceFilter('online')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                presenceFilter === 'online'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow'
                  : 'bg-slate-950 text-emerald-400 hover:text-emerald-300 border border-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              متصل الآن ({stats.online}) 🟢
            </button>
            <button
              onClick={() => setPresenceFilter('entered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                presenceFilter === 'entered'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <LogIn className="w-3 h-3 text-amber-400" />
              سجلوا دخولاً للنظام ({users.filter(u => u.lastLoginAt).length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">الترتيب:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-emerald-300 focus:outline-none focus:border-emerald-500 cursor-pointer font-bold"
            >
              <option value="recent_login">الأحدث دخولاً أولاً ⚡</option>
              <option value="online_first">المتصلون الآن أولاً 🟢</option>
              <option value="registered">الأحدث تسجيلاً</option>
              <option value="name">الاسم أبجدياً</option>
            </select>
          </div>
        </div>

        {/* Search & Role / Team Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث بالاسم، أو البريد الجامعي (@nu.edu.eg)، أو رقم القيد، أو الفريق..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Filter controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer font-bold"
            >
              <option value="all">كل الرتب والأدوار</option>
              <option value="admin">مدير نظام (Admin)</option>
              <option value="team_manager">مسؤول فريق (Manager)</option>
              <option value="player">لاعب (Player)</option>
              <option value="spectator">متفرج (Spectator)</option>
            </select>

            {/* Team Filter */}
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer max-w-[150px]"
            >
              <option value="all">كل الفرق (48)</option>
              {teams.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>

            {/* Assign Team Managers Button */}
            {onNavigateToAssignManagers && (
              <button
                onClick={onNavigateToAssignManagers}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer transition-all shrink-0"
                title="صفحة تعيين مسؤولي الفرق (إيميل + باسورد + تحديد الفرقة)"
              >
                <Key className="w-4 h-4 text-slate-950" />
                تعيين مسؤولي الفرق 👔
              </button>
            )}

            {/* Add User Button */}
            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer transition-all shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              إضافة عضو جديد (@nu)
            </button>
          </div>
        </div>
      </div>

      {/* PENDING MANAGER APPROVALS SECTION */}
      {pendingManagers.length > 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 border-2 border-amber-500/50 shadow-2xl space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/30 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <UserCheck className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <span>طلبات تعيين مسؤولي الفرق الجديدة بانتظار موافقتك</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-black shadow">
                    {pendingManagers.length} معلق ⏳
                  </span>
                </h3>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  سجل هؤلاء الأعضاء حسابات جديدة وطلبوا مسؤولية فرق؛ يجب اعتمادك لتفعيل صلاحيات إدارة الفريق لهم:
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {pendingManagers.map(pendingUser => (
              <div
                key={pendingUser.id}
                className="bg-slate-950/95 border border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-xl hover:border-amber-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center font-black text-sm">
                      {pendingUser.name.charAt(0)}
                    </div>
                    <div>
                      <strong className="text-white text-xs sm:text-sm font-black block">{pendingUser.name}</strong>
                      <span className="text-[11px] text-slate-400 font-mono block">{pendingUser.email}</span>
                      {pendingUser.studentId && (
                        <span className="text-[10px] text-slate-500 font-mono">ID: {pendingUser.studentId}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between">
                  <span className="text-slate-400">الفريق المطلوب إدارته:</span>
                  <strong className="text-amber-300 font-black text-sm">{pendingUser.requestedTeamName}</strong>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleApproveManager(pendingUser)}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>اعتماد كمسؤول فريق ✓</span>
                  </button>
                  <button
                    onClick={() => handleRejectManager(pendingUser)}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    title="رفض الطلب وإبقاؤه كمتفرج"
                  >
                    رفض
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Directory Table / Cards View */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="font-black text-white text-sm">
              دليل أعضاء جامعة النيل والصلاحيات ({filteredUsers.length} من {users.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            يمكنك من هنا ترقية أي شخص إلى مسؤول فريق أو أدمن ⚡
          </span>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold">لا يوجد مستخدمين يطابقون خيارات البحث الحالية</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-xs border-b border-slate-800 font-bold">
                  <th className="p-3.5 pr-6">العضو والاسم</th>
                  <th className="p-3.5">البريد الجامعي (@nu.edu.eg)</th>
                  <th className="p-3.5">حالة التواجد وآخر دخول</th>
                  <th className="p-3.5">الرتبة والدور الحالي</th>
                  <th className="p-3.5">الفريق المرتبط</th>
                  <th className="p-3.5">الكلية ورقم القيد</th>
                  <th className="p-3.5 pl-6 text-center">التحكم والإدارة وتغيير الرتبة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {filteredUsers.map((user) => {
                  const isPermanent = user.isPermanentAdmin || user.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase();

                  return (
                    <tr 
                      key={user.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isPermanent ? 'bg-amber-500/5 hover:bg-amber-500/10' : ''
                      }`}
                    >
                      {/* Name & Avatar */}
                      <td className="p-3.5 pr-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shadow-md shrink-0 ${
                            isPermanent
                              ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 ring-2 ring-amber-400/50'
                              : user.role === 'admin'
                              ? 'bg-purple-600 text-white'
                              : user.role === 'team_manager'
                              ? 'bg-emerald-600 text-white'
                              : user.role === 'player'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {isPermanent ? '👑' : user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-white text-sm">{user.name}</span>
                              {isPermanent && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/40">
                                  دائم 🛡️
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              تاريخ التسجيل: {user.registeredAt}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-200 font-bold">{user.email}</span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold border border-emerald-500/20">
                            موثق 🏛️
                          </span>
                        </div>
                      </td>

                      {/* Presence & Last Entry Status */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          {user.isOnline ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black shadow-sm">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              متصل الآن 🟢
                            </span>
                          ) : user.lastLoginAt ? (
                            <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                              <LogIn className="w-3 h-3 text-slate-400" />
                              {formatTimeAgoArabic(user.lastLoginAt)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">لم يسجل دخول بعد</span>
                          )}

                          {user.lastLoginAt && (
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-slate-500" />
                              <span>دخول: {new Date(user.lastLoginAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                              {user.loginCount ? <span className="text-slate-500">({user.loginCount}x)</span> : null}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="p-3.5">
                        {getRoleBadge(user)}
                      </td>

                      {/* Associated Team */}
                      <td className="p-3.5">
                        {user.managedTeamName ? (
                          <span className="font-bold text-emerald-400 flex items-center gap-1">
                            <Shield className="w-3 h-3 text-emerald-400" />
                            مدير: {user.managedTeamName}
                          </span>
                        ) : user.playerTeamName ? (
                          <span className="font-bold text-blue-400 flex items-center gap-1">
                            <Shirt className="w-3 h-3 text-blue-400" />
                            لاعب: {user.playerTeamName}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Department & Student ID */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <div className="text-[11px] text-slate-300 font-medium">
                            {user.department || 'جامعة النيل'}
                          </div>
                          {user.studentId && (
                            <span className="text-[10px] text-slate-400 font-mono block">
                              ID: {user.studentId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pl-6 text-center">
                        {isPermanent ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs" title="هذا الحساب محمي كأدمن دائم رئيسي للنظام ولا يمكن تعديل صلاحيته">
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            <span>محمي نهائياً 🛡️</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                            {/* Quick Approval for Pending Manager Request */}
                            {user.managerApprovalStatus === 'pending' && user.requestedTeamName && (
                              <button
                                onClick={() => handleApproveManager(user)}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md cursor-pointer transition-all animate-bounce"
                                title={`اعتماد فوري كمسؤول لفريق ${user.requestedTeamName}`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>اعتماد كمسؤول ({user.requestedTeamName})</span>
                              </button>
                            )}

                            {/* Main Change Role Button */}
                            <button
                              onClick={() => handleOpenRoleModal(user)}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md shadow-amber-500/20 cursor-pointer transition-all"
                              title="ترقية إلى أدمن أو مسؤول فريق أو لاعب أو متفرج"
                            >
                              <Shield className="w-3.5 h-3.5" />
                              تغيير الصلاحية / الرتبة
                            </button>

                            {/* Quick Promotion to Admin if not admin */}
                            {user.role !== 'admin' && (
                              <button
                                onClick={() => handleQuickSetRole(user, 'admin')}
                                className="px-2.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-bold text-xs cursor-pointer transition-colors"
                                title="ترقية فورية إلى أدمن"
                              >
                                + أدمن
                              </button>
                            )}

                            {/* Quick Promotion to Team Manager if not manager */}
                            {user.role !== 'team_manager' && !user.managerApprovalStatus && (
                              <button
                                onClick={() => handleOpenRoleModal(user)}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-xs cursor-pointer transition-colors"
                                title="تعيين مسؤول فرقة"
                              >
                                + مسؤول فرقة
                              </button>
                            )}

                            {/* Edit details */}
                            <button
                              onClick={() => setEditingUser(user)}
                              className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700 text-xs font-bold flex items-center gap-1"
                              title="تعديل بيانات العضو"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition-all cursor-pointer shadow-sm text-xs font-bold flex items-center gap-1.5 shrink-0"
                              title={`حذف حساب ${user.name} نهائياً من المنظومة`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف 🗑️</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CHANGE ROLE & PERMISSIONS */}
      {/* ========================================================================= */}
      {selectedUserForRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-white text-base">تغيير الصلاحية وتفويض المسؤولية</h3>
              </div>
              <button
                onClick={() => setSelectedUserForRole(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">العضو:</span>
                <strong className="text-xs text-white">{selectedUserForRole.name}</strong>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-400">البريد الجامعي:</span>
                <span className="text-emerald-400">{selectedUserForRole.email}</span>
              </div>
            </div>

            <form onSubmit={handleSaveRoleChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">اختر الرتبة والصلاحية الجديدة *</label>
                <div className="space-y-2">
                  {/* Admin Option */}
                  <label 
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      newRoleSelection === 'admin'
                        ? 'bg-purple-500/20 border-purple-500 text-white font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={newRoleSelection === 'admin'}
                        onChange={() => setNewRoleSelection('admin')}
                        className="accent-purple-500"
                      />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-purple-400" />
                          ترقية إلى مدير نظام (Admin)
                        </div>
                        <p className="text-[10px] text-slate-400">تحكم كامل في كل الفرق والنتائج والجدول والإعدادات</p>
                      </div>
                    </div>
                  </label>

                  {/* Team Manager Option */}
                  <label 
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      newRoleSelection === 'team_manager'
                        ? 'bg-emerald-500/20 border-emerald-500 text-white font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="role"
                        value="team_manager"
                        checked={newRoleSelection === 'team_manager'}
                        onChange={() => setNewRoleSelection('team_manager')}
                        className="accent-emerald-500"
                      />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          تعيين كـ مسؤول فريق (Team Manager)
                        </div>
                        <p className="text-[10px] text-slate-400">إدارة تشكيل ولاعبي وتبديلات فريقه المحدد</p>
                      </div>
                    </div>
                  </label>

                  {/* Player Option */}
                  <label 
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      newRoleSelection === 'player'
                        ? 'bg-blue-500/20 border-blue-500 text-white font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="role"
                        value="player"
                        checked={newRoleSelection === 'player'}
                        onChange={() => setNewRoleSelection('player')}
                        className="accent-blue-500"
                      />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1">
                          <Shirt className="w-3.5 h-3.5 text-blue-400" />
                          تعيين كـ لاعب في فريق
                        </div>
                        <p className="text-[10px] text-slate-400">مسجل كلاعب رسمي في قائمة الفريق</p>
                      </div>
                    </div>
                  </label>

                  {/* Spectator Option */}
                  <label 
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      newRoleSelection === 'spectator'
                        ? 'bg-slate-800 border-slate-600 text-white font-black'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="role"
                        value="spectator"
                        checked={newRoleSelection === 'spectator'}
                        onChange={() => setNewRoleSelection('spectator')}
                        className="accent-slate-400"
                      />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          تحويل إلى متفرج ومشجع
                        </div>
                        <p className="text-[10px] text-slate-400">مشاهدة المواعيد والماتشات والإحصائيات فقط</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* If Team Manager or Player, select which of the 48 teams */}
              {(newRoleSelection === 'team_manager' || newRoleSelection === 'player') && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    {newRoleSelection === 'team_manager' ? 'اختر الفريق الذي يديره *' : 'اختر الفريق الذي يلعب له *'}
                  </label>
                  <select
                    value={assignedTeamSelection}
                    onChange={(e) => setAssignedTeamSelection(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    {teams.map(t => (
                      <option key={t.id} value={t.name}>
                        {t.name} (المجموعة {t.group})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForRole(null)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  حفظ واعتماد الصلاحية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD NEW USER (ENFORCES @nu.edu.eg) */}
      {/* ========================================================================= */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-white text-base">إضافة عضو جديد لمنظومة جامعة النيل</h3>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addUserError && (
              <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{addUserError}</span>
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مروان أحمد السيد"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">البريد الإلكتروني الجامعي (@nu.edu.eg) *</label>
                  <span className="text-[10px] text-emerald-400 font-bold">إلزامي لجامعة النيل</span>
                </div>
                <input
                  type="email"
                  required
                  placeholder="m.ahmed@nu.edu.eg"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
                {!newUserEmail.toLowerCase().endsWith('@nu.edu.eg') && newUserEmail.length > 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      const prefix = newUserEmail.split('@')[0];
                      setNewUserEmail(`${prefix}@nu.edu.eg`);
                    }}
                    className="mt-1 text-[10px] text-emerald-400 underline font-medium cursor-pointer"
                  >
                    إضافة @nu.edu.eg تلقائياً
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">كلمة المرور المؤقتة</label>
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">رقم الطالب (ID)</label>
                  <input
                    type="text"
                    placeholder="مثال: 20240188"
                    value={newUserStudentId}
                    onChange={(e) => setNewUserStudentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الدور والصلاحية *</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold cursor-pointer"
                  >
                    <option value="admin">مدير نظام (Admin) 🛡️</option>
                    <option value="team_manager">مسؤول فريق (Manager) 📋</option>
                    <option value="player">لاعب في البطولة (Player) ⚽</option>
                    <option value="spectator">متفرج ومتابع (Spectator) 👁️</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الكلية</label>
                  <select
                    value={newUserDepartment}
                    onChange={(e) => setNewUserDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="كلية الهندسة والعلوم التطبيقية">الهندسة والعلوم التطبيقية</option>
                    <option value="كلية تكنولوجيا المعلومات وعلوم الحاسب">تكنولوجيا المعلومات وعلوم الحاسب</option>
                    <option value="كلية إدارة الأعمال">إدارة الأعمال</option>
                    <option value="كلية التكنولوجيا الحيوية">التكنولوجيا الحيوية</option>
                  </select>
                </div>
              </div>

              {(newUserRole === 'team_manager' || newUserRole === 'player') && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الفريق المرتبط *</label>
                  <select
                    value={newUserTeam}
                    onChange={(e) => setNewUserTeam(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold cursor-pointer"
                  >
                    {teams.map(t => (
                      <option key={t.id} value={t.name}>
                        {t.name} (المجموعة {t.group})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  إضافة العضو وتثبيته
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT USER DETAILS */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-white text-base">تعديل بيانات العضو</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">البريد الجامعي (غير قابل للتغيير)</label>
                <input
                  type="email"
                  disabled
                  value={editingUser.email}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">رقم الطالب (ID)</label>
                  <input
                    type="text"
                    value={editingUser.studentId || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, studentId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الكلية</label>
                  <input
                    type="text"
                    value={editingUser.department || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: IN-APP DELETE USER CONFIRMATION (حل مشكلة عدم المسح نهائياً) */}
      {/* ========================================================================= */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-red-500/40 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="w-5 h-5 text-rose-500" />
                <h3 className="font-black text-white text-base">تأكيد حذف الحساب نهائياً</h3>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs space-y-2.5">
              <p className="font-bold">هل أنت متأكد من رغبتك في حذف هذا العضو من المنظومة؟</p>
              <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 space-y-1.5 text-slate-300">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">الاسم:</span>
                  <strong className="text-white text-sm">{userToDelete.name}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">البريد الجامعي:</span>
                  <span className="font-mono text-emerald-400">{userToDelete.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">الصلاحية الحالية:</span>
                  <span>{getRoleTitle(userToDelete.role)}</span>
                </div>
                {userToDelete.managedTeamName && (
                  <div className="flex justify-between items-center text-amber-300">
                    <span>الفريق:</span>
                    <strong>{userToDelete.managedTeamName}</strong>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-rose-300/90 leading-relaxed">
                ⚠️ سيتم حذف الحساب بالكامل فوراً ولن يتمكن هذا المستخدم من الدخول للمنظومة مجدداً.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs transition-all shadow-lg shadow-rose-600/30 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>نعم، حذف الحساب 🗑️</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
