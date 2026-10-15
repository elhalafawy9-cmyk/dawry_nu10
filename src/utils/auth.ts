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

/**
 * Validates that the email is a Nile University address ending with @nu.edu.eg
 */
export function isValidNileUniversityEmail(email: string): boolean {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();
  return trimmed.endsWith('@nu.edu.eg') && trimmed.length > '@nu.edu.eg'.length;
}

/**
 * Seed users list for Nile University tournament
 */
export const INITIAL_USERS: AppUser[] = [
  {
    id: 'user_super_admin',
    name: 'م. س. محمد (المدير الدائم للنظام)',
    email: PERMANENT_ADMIN_EMAIL,
    password: PERMANENT_ADMIN_PASSWORD,
    role: 'admin',
    isPermanentAdmin: true,
    studentId: '20202442',
    department: 'كلية الهندسة والعلوم التطبيقية',
    registeredAt: '2026-01-01',
    notes: 'المدير الدائم المعتمد للبطولة والنظام - محمي من التعديل'
  },
  {
    id: 'user_admin_2',
    name: 'أحمد شريف (مشرف الأنشطة الرياضية)',
    email: 'a.sherif@nu.edu.eg',
    password: 'Password123',
    role: 'admin',
    studentId: '20210088',
    department: 'رعاية الشباب وإدارة الأنشطة',
    registeredAt: '2026-01-05',
  },
  {
    id: 'user_tm_barca',
    name: 'كابتن محمود رضا',
    email: 'm.reda@nu.edu.eg',
    password: 'Password123',
    role: 'team_manager',
    managedTeamName: 'برشلونة',
    studentId: '20220114',
    department: 'كلية إدارة الأعمال',
    registeredAt: '2026-01-10',
  },
  {
    id: 'user_tm_ahly',
    name: 'طارق حسام الدين',
    email: 't.hossam@nu.edu.eg',
    password: 'Password123',
    role: 'team_manager',
    managedTeamName: 'الاهلي',
    studentId: '20220455',
    department: 'كلية تكنولوجيا المعلومات وعلوم الحاسب',
    registeredAt: '2026-01-11',
  },
  {
    id: 'user_tm_zamalek',
    name: 'عمر نبيل عبد المنعم',
    email: 'o.nabil@nu.edu.eg',
    password: 'Password123',
    role: 'team_manager',
    managedTeamName: 'الزمالك',
    studentId: '20220890',
    department: 'كلية الهندسة',
    registeredAt: '2026-01-12',
  },
  {
    id: 'user_tm_madrid',
    name: 'زياد خالد',
    email: 'z.khaled@nu.edu.eg',
    password: 'Password123',
    role: 'team_manager',
    managedTeamName: 'ريال مدريد',
    studentId: '20230230',
    department: 'كلية التكنولوجيا الحيوية',
    registeredAt: '2026-01-14',
  },
  {
    id: 'user_tm_city',
    name: 'ياسين أشرف',
    email: 'y.ashraf@nu.edu.eg',
    password: 'Password123',
    role: 'team_manager',
    managedTeamName: 'مان سيتي',
    studentId: '20230510',
    department: 'كلية تكنولوجيا المعلومات',
    registeredAt: '2026-01-15',
  },
  {
    id: 'user_player_1',
    name: 'حازم مصطفى (مهاجم)',
    email: 'h.mostafa@nu.edu.eg',
    password: 'Password123',
    role: 'player',
    playerTeamName: 'برشلونة',
    studentId: '20230788',
    department: 'كلية الهندسة',
    registeredAt: '2026-01-20',
  },
  {
    id: 'user_player_2',
    name: 'يوسف العطار (صانع ألعاب)',
    email: 'y.alattar@nu.edu.eg',
    password: 'Password123',
    role: 'player',
    playerTeamName: 'الاهلي',
    studentId: '20240112',
    department: 'كلية علوم الحاسب',
    registeredAt: '2026-01-21',
  },
  {
    id: 'user_player_3',
    name: 'كريم الجوهري (حارس مرمى)',
    email: 'k.elgohary@nu.edu.eg',
    password: 'Password123',
    role: 'player',
    playerTeamName: 'الزمالك',
    studentId: '20230999',
    department: 'كلية إدارة الأعمال',
    registeredAt: '2026-01-22',
  },
  {
    id: 'user_player_4',
    name: 'سيف الدين ماجد',
    email: 's.maged@nu.edu.eg',
    password: 'Password123',
    role: 'player',
    playerTeamName: 'ريال مدريد',
    studentId: '20240344',
    department: 'كلية الهندسة',
    registeredAt: '2026-01-22',
  },
  {
    id: 'user_spec_1',
    name: 'مريم عادل',
    email: 'm.adel@nu.edu.eg',
    password: 'Password123',
    role: 'spectator',
    studentId: '20240981',
    department: 'كلية التكنولوجيا الحيوية',
    registeredAt: '2026-01-25',
  },
  {
    id: 'user_spec_2',
    name: 'بلال تامر فاروق',
    email: 'b.tamer@nu.edu.eg',
    password: 'Password123',
    role: 'spectator',
    studentId: '20220771',
    department: 'كلية إدارة الأعمال',
    registeredAt: '2026-01-26',
  },
  {
    id: 'user_spec_3',
    name: 'نور الدين سامح',
    email: 'n.sameh@nu.edu.eg',
    password: 'Password123',
    role: 'spectator',
    studentId: '20230444',
    department: 'كلية الهندسة',
    registeredAt: '2026-01-27',
  },
  {
    id: 'user_spec_4',
    name: 'سلمى إبراهيم',
    email: 's.ibrahim@nu.edu.eg',
    password: 'Password123',
    role: 'spectator',
    studentId: '20240502',
    department: 'كلية تكنولوجيا المعلومات',
    registeredAt: '2026-01-28',
  },
];

const USERS_STORAGE_KEY = 'nu_football_tournament_users_v2';
const ACTIVE_USER_STORAGE_KEY = 'nu_football_tournament_active_user_v2';

export function loadStoredUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const parsed: AppUser[] = JSON.parse(raw);
    
    // Ensure permanent admin is always present and marked permanent
    const hasPermAdmin = parsed.some(u => u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase());
    if (!hasPermAdmin) {
      const fixed = [INITIAL_USERS[0], ...parsed];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(fixed));
      return fixed;
    }

    // Guarantee that s.mohamed2442@nu.edu.eg role is ALWAYS 'admin' and isPermanentAdmin is true
    const sanitized = parsed.map(u => {
      if (u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
        return {
          ...u,
          role: 'admin' as UserRole,
          isPermanentAdmin: true,
        };
      }
      return u;
    });

    return sanitized;
  } catch (e) {
    console.error('Error loading stored users:', e);
    return INITIAL_USERS;
  }
}

export function saveStoredUsers(users: AppUser[]): void {
  try {
    // Safety check: ensure permanent admin cannot be demoted or removed
    const sanitized = users.map(u => {
      if (u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
        return {
          ...u,
          role: 'admin' as UserRole,
          isPermanentAdmin: true,
        };
      }
      return u;
    });

    const hasPerm = sanitized.some(u => u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase());
    if (!hasPerm) {
      sanitized.unshift(INITIAL_USERS[0]);
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
      const match = allUsers.find(u => u.id === parsed.id || u.email.toLowerCase() === parsed.email?.toLowerCase());
      if (match) return match;
    }
  } catch (e) {
    console.error('Error loading active user:', e);
  }
  return null;
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
