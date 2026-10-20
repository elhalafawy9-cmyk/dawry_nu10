export type UserRole = 'admin' | 'team_manager' | 'player' | 'spectator';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  managedTeamName?: string; // If team_manager
  playerTeamName?: string;  // If player
  studentId?: string;       // Nile University Student ID
  avatarUrl?: string;
  isPermanentAdmin?: boolean; // Locked permanent super admin
  mustChangePassword?: boolean; // Force change password on first login
  registeredAt: string;
  department?: string;
  notes?: string;
  managerApprovalStatus?: 'approved' | 'pending' | 'rejected'; // Approval status for team managers
  requestedTeamName?: string; // Team requested when approval is pending
  lastLoginAt?: string;       // Timestamp when user logged in / entered the site
  lastActiveAt?: string;      // Timestamp of last heartbeat/action
  isOnline?: boolean;         // Currently online flag
  loginCount?: number;        // Number of sessions/logins
}

export const PERMANENT_ADMIN_EMAIL = 's.mohamed2442@nu.edu.eg';
export const PERMANENT_ADMIN_PASSWORD = 'Hv102030';

export const FIXED_ADMIN_EMAIL_AHSABER = 'ahsaber@nu.edu.eg';
export const FIXED_ADMIN_PASSWORD_AHSABER_DEFAULT = '123456';

/**
 * Validates that the email is a Nile University address or the system administrator
 */
export function isValidNileUniversityEmail(email: string): boolean {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();
  if (trimmed === PERMANENT_ADMIN_EMAIL.toLowerCase()) return true;
  if (trimmed === FIXED_ADMIN_EMAIL_AHSABER.toLowerCase()) return true;
  return trimmed.endsWith('@nu.edu.eg') || (trimmed.includes('@') && trimmed.includes('.'));
}

/**
 * Seed users list - Super Admin and Ahmed Saber admin account
 */
export const INITIAL_USERS: AppUser[] = [
  {
    id: 'user_super_admin',
    name: 'المدير العام للنظام',
    email: PERMANENT_ADMIN_EMAIL,
    password: PERMANENT_ADMIN_PASSWORD,
    role: 'admin',
    isPermanentAdmin: true,
    studentId: '241000442',
    department: 'إدارة بطولة دوري النيل',
    registeredAt: '2026-01-01',
    notes: 'المدير الدائم المعتمد للنظام - كامل صلاحيات الإدارة',
    lastLoginAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    isOnline: true,
    loginCount: 1,
  },
  {
    id: 'user_ahsaber_admin',
    name: 'أحمد صابر (إدارة البطولة)',
    email: FIXED_ADMIN_EMAIL_AHSABER,
    password: FIXED_ADMIN_PASSWORD_AHSABER_DEFAULT,
    role: 'admin',
    isPermanentAdmin: true,
    mustChangePassword: true,
    studentId: '241000999',
    department: 'إدارة بطولة دوري النيل',
    registeredAt: '2026-01-01',
    notes: 'حساب إداري معتمد - يجب تغيير كلمة المرور عند أول تسجيل دخول',
    loginCount: 0,
  },
];

const USERS_STORAGE_KEY = 'nu_football_tournament_users_v3';
const ACTIVE_USER_STORAGE_KEY = 'nu_football_tournament_active_user_v3';

export function loadStoredUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const parsed: AppUser[] = JSON.parse(raw);
    
    // Purge old demo users if present (keeping new permanent admin intact)
    const isOldDemoData = parsed.some(u => 
      u.email.toLowerCase() === 'a.sherif@nu.edu.eg' ||
      u.email.toLowerCase() === 'm.reda@nu.edu.eg' ||
      u.email.toLowerCase() === 'elhalafawy9@gmail.com'
    );
    if (isOldDemoData) {
      const cleaned = [INITIAL_USERS[0], ...parsed.filter(u => 
        u.email.toLowerCase() !== 's.mohamed2442@nu.edu.eg' && 
        u.email.toLowerCase() !== 'a.sherif@nu.edu.eg' &&
        u.email.toLowerCase() !== 'm.reda@nu.edu.eg' &&
        u.email.toLowerCase() !== 't.hossam@nu.edu.eg' &&
        u.email.toLowerCase() !== 'o.nabil@nu.edu.eg' &&
        u.email.toLowerCase() !== 'z.khaled@nu.edu.eg' &&
        u.email.toLowerCase() !== 'y.ashraf@nu.edu.eg' &&
        u.email.toLowerCase() !== 'h.mostafa@nu.edu.eg' &&
        u.email.toLowerCase() !== 'y.alattar@nu.edu.eg' &&
        u.email.toLowerCase() !== 'k.elgohary@nu.edu.eg' &&
        u.email.toLowerCase() !== 's.maged@nu.edu.eg' &&
        u.email.toLowerCase() !== 'm.adel@nu.edu.eg' &&
        u.email.toLowerCase() !== 'b.tamer@nu.edu.eg' &&
        u.email.toLowerCase() !== 'n.sameh@nu.edu.eg' &&
        u.email.toLowerCase() !== 's.ibrahim@nu.edu.eg' &&
        u.email.toLowerCase() !== 'elhalafawy9@gmail.com'
      )];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(cleaned));
      return cleaned;
    }

    let resultList = parsed.map(u => {
      if (u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase() || u.email.toLowerCase() === 'elhalafawy9@gmail.com') {
        return {
          ...u,
          name: 'المدير العام للنظام',
          email: PERMANENT_ADMIN_EMAIL,
          password: PERMANENT_ADMIN_PASSWORD,
          role: 'admin' as UserRole,
          isPermanentAdmin: true,
          studentId: '241000442',
        };
      }
      return u;
    });

    // Ensure ahsaber is also present
    const hasAhsaber = resultList.some(u => u.email.toLowerCase() === FIXED_ADMIN_EMAIL_AHSABER.toLowerCase());
    if (!hasAhsaber) {
      resultList.push(INITIAL_USERS[1]);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(resultList));
    }

    const hasPerm = resultList.some(u => u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase());
    if (!hasPerm) {
      resultList.unshift(INITIAL_USERS[0]);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(resultList));
    }

    return resultList;
  } catch (e) {
    console.error('Error loading stored users:', e);
    return INITIAL_USERS;
  }
}

export function saveStoredUsers(users: AppUser[]): void {
  try {
    const sanitized = users.map(u => {
      if (u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
        return {
          ...u,
          name: 'المدير العام للنظام',
          password: PERMANENT_ADMIN_PASSWORD,
          role: 'admin' as UserRole,
          isPermanentAdmin: true,
          studentId: '241000442',
        };
      }
      return u;
    });

    const hasPerm = sanitized.some(u => u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase());
    if (!hasPerm) {
      sanitized.unshift(INITIAL_USERS[0]);
    }

    const hasAhsaber = sanitized.some(u => u.email.toLowerCase() === FIXED_ADMIN_EMAIL_AHSABER.toLowerCase());
    if (!hasAhsaber) {
      sanitized.push(INITIAL_USERS[1]);
    }

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (e) {
    console.error('Error saving stored users:', e);
  }
}

export function loadActiveUser(allUsers: AppUser[]): AppUser | null {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.email?.toLowerCase() === 'elhalafawy9@gmail.com') {
        parsed.email = PERMANENT_ADMIN_EMAIL;
      }
      const match = allUsers.find(u => u.id === parsed.id || u.email.toLowerCase() === parsed.email?.toLowerCase());
      if (match) {
        if (match.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
          return {
            ...match,
            name: 'المدير العام للنظام',
            role: 'admin',
            isPermanentAdmin: true,
          };
        }
        return match;
      }
    }
  } catch (e) {
    console.error('Error loading active user:', e);
  }
  const defaultAdmin = allUsers.find(u => u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) || allUsers[0] || INITIAL_USERS[0];
  if (defaultAdmin && defaultAdmin.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
    return {
      ...defaultAdmin,
      name: 'المدير العام للنظام',
      role: 'admin',
      isPermanentAdmin: true,
    };
  }
  return defaultAdmin || null;
}

export function saveActiveUser(user: AppUser | null): void {
  try {
    if (!user) {
      localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
    } else {
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(user));
    }
  } catch (e) {
    console.error('Error saving active user:', e);
  }
}
