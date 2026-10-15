import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.resolve(__dirname, 'data');
const USERS_FILE = path.resolve(DATA_DIR, 'users.json');
const SETTINGS_FILE = path.resolve(DATA_DIR, 'settings.json');

interface AppSettings {
  isPlayerEditingOpen: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  isPlayerEditingOpen: true, // Default open as requested!
};

function readSettings(): AppSettings {
  ensureDataDir();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Could not read settings.json, returning default', e);
  }
  return DEFAULT_SETTINGS;
}

function writeSettings(settings: AppSettings): void {
  ensureDataDir();
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write settings.json', e);
  }
}

const PERMANENT_ADMIN_EMAIL = 's.mohamed2442@nu.edu.eg';

// Initial default seed users
const DEFAULT_INITIAL_USERS = [
  {
    id: 'user_super_admin',
    name: 'م. س. محمد (المدير الدائم للنظام)',
    email: PERMANENT_ADMIN_EMAIL,
    password: 'Password123',
    role: 'admin',
    isPermanentAdmin: true,
    studentId: '20202442',
    department: 'كلية الهندسة والعلوم التطبيقية',
    registeredAt: '2026-01-01',
    notes: 'المدير الدائم المعتمد للبطولة والنظام - محمي من التعديل',
    lastLoginAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    isOnline: true,
    loginCount: 1,
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
    lastLoginAt: '2026-05-10T14:20:00.000Z',
    isOnline: false,
    loginCount: 4,
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
    lastLoginAt: '2026-05-11T09:15:00.000Z',
    isOnline: false,
    loginCount: 3,
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
    lastLoginAt: '2026-05-11T11:45:00.000Z',
    isOnline: false,
    loginCount: 5,
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
    lastLoginAt: '2026-05-10T18:00:00.000Z',
    isOnline: false,
    loginCount: 2,
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
    lastLoginAt: '2026-05-09T16:30:00.000Z',
    isOnline: false,
    loginCount: 2,
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
    lastLoginAt: '2026-05-08T12:00:00.000Z',
    isOnline: false,
    loginCount: 1,
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
    lastLoginAt: '2026-05-11T13:10:00.000Z',
    isOnline: false,
    loginCount: 6,
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
    lastLoginAt: '2026-05-11T15:05:00.000Z',
    isOnline: false,
    loginCount: 4,
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
    lastLoginAt: '2026-05-10T11:20:00.000Z',
    isOnline: false,
    loginCount: 3,
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
    lastLoginAt: '2026-05-09T17:40:00.000Z',
    isOnline: false,
    loginCount: 2,
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
    lastLoginAt: '2026-05-11T10:00:00.000Z',
    isOnline: false,
    loginCount: 2,
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
    lastLoginAt: '2026-05-08T09:30:00.000Z',
    isOnline: false,
    loginCount: 1,
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
    lastLoginAt: '2026-05-07T14:15:00.000Z',
    isOnline: false,
    loginCount: 1,
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
    lastLoginAt: '2026-05-11T16:20:00.000Z',
    isOnline: false,
    loginCount: 3,
  },
];

// Helper to ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Read users from file or default
function readUsers(): any[] {
  ensureDataDir();
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Compute online status dynamically (active within 3 minutes)
        const now = Date.now();
        return parsed.map(u => {
          const lastActive = u.lastActiveAt ? new Date(u.lastActiveAt).getTime() : 0;
          const isRecentlyActive = (now - lastActive) < (3 * 60 * 1000);
          return {
            ...u,
            isOnline: isRecentlyActive || Boolean(u.isOnline && (now - lastActive) < (5 * 60 * 1000)),
          };
        });
      }
    }
  } catch (err) {
    console.error('Error reading users from file:', err);
  }
  // Write default users if not found
  writeUsers(DEFAULT_INITIAL_USERS);
  return DEFAULT_INITIAL_USERS;
}

// Write users to file
function writeUsers(users: any[]) {
  ensureDataDir();
  try {
    // Permanent admin guard
    const sanitized = users.map(u => {
      if (u.email && u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
        return {
          ...u,
          role: 'admin',
          isPermanentAdmin: true,
        };
      }
      return u;
    });

    const hasPermAdmin = sanitized.some(u => u.email && u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase());
    if (!hasPermAdmin) {
      sanitized.unshift(DEFAULT_INITIAL_USERS[0]);
    }

    fs.writeFileSync(USERS_FILE, JSON.stringify(sanitized, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing users to file:', err);
  }
}

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// 1. GET /api/users - Return all registered users
app.get('/api/users', (req: Request, res: Response) => {
  const users = readUsers();
  res.json({ success: true, users, timestamp: new Date().toISOString() });
});

// 2. POST /api/users/enter - Register entry / login of any user across devices
app.post('/api/users/enter', (req: Request, res: Response) => {
  const incoming = req.body;
  if (!incoming || (!incoming.email && !incoming.id)) {
    return res.status(400).json({ success: false, error: 'User data required' });
  }

  const users = readUsers();
  const incomingEmail = (incoming.email || '').trim().toLowerCase();
  const nowIso = new Date().toISOString();

  let targetIndex = users.findIndex(u => 
    (incomingEmail && u.email.toLowerCase() === incomingEmail) || 
    (incoming.id && u.id === incoming.id)
  );

  let updatedUser: any;

  if (targetIndex >= 0) {
    // Existing user entering the app
    const current = users[targetIndex];
    updatedUser = {
      ...current,
      name: incoming.name || current.name,
      role: current.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase() ? 'admin' : (incoming.role || current.role),
      studentId: incoming.studentId || current.studentId,
      department: incoming.department || current.department,
      managedTeamName: incoming.managedTeamName !== undefined ? incoming.managedTeamName : current.managedTeamName,
      playerTeamName: incoming.playerTeamName !== undefined ? incoming.playerTeamName : current.playerTeamName,
      avatarUrl: incoming.avatarUrl || current.avatarUrl,
      lastLoginAt: nowIso,
      lastActiveAt: nowIso,
      isOnline: true,
      loginCount: (current.loginCount || 0) + 1,
    };
    users[targetIndex] = updatedUser;
  } else {
    // New user entering for the first time
    updatedUser = {
      id: incoming.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: incoming.name || 'مستخدم جديد',
      email: incomingEmail,
      role: incoming.role || 'spectator',
      studentId: incoming.studentId || '',
      department: incoming.department || 'جامعة النيل',
      managedTeamName: incoming.managedTeamName,
      playerTeamName: incoming.playerTeamName,
      avatarUrl: incoming.avatarUrl,
      registeredAt: nowIso.substring(0, 10),
      lastLoginAt: nowIso,
      lastActiveAt: nowIso,
      isOnline: true,
      loginCount: 1,
    };
    users.unshift(updatedUser);
  }

  writeUsers(users);
  console.log(`[USER ENTER] ${updatedUser.name} (${updatedUser.email}) logged in/entered. Total users: ${users.length}`);
  res.json({ success: true, user: updatedUser, users });
});

// 3. POST /api/users/register - Register brand new user account
app.post('/api/users/register', (req: Request, res: Response) => {
  const newUser = req.body;
  if (!newUser || !newUser.email || !newUser.name) {
    return res.status(400).json({ success: false, error: 'Name and email are required' });
  }

  const users = readUsers();
  const trimmedEmail = newUser.email.trim().toLowerCase();

  const existingIndex = users.findIndex(u => u.email.toLowerCase() === trimmedEmail);
  const nowIso = new Date().toISOString();

  const userRecord = {
    ...newUser,
    id: newUser.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    email: trimmedEmail,
    registeredAt: newUser.registeredAt || nowIso.substring(0, 10),
    lastLoginAt: nowIso,
    lastActiveAt: nowIso,
    isOnline: true,
    loginCount: 1,
  };

  if (existingIndex >= 0) {
    users[existingIndex] = { ...users[existingIndex], ...userRecord };
  } else {
    users.unshift(userRecord);
  }

  writeUsers(users);
  console.log(`[USER REGISTER] New user created: ${userRecord.name} (${userRecord.email})`);
  res.json({ success: true, user: userRecord, users });
});

// 3.1. POST /api/users/assign-manager - Assign or create a team manager easily
app.post('/api/users/assign-manager', (req: Request, res: Response) => {
  const { email, password, teamName, name, studentId, department } = req.body;
  if (!email || !teamName) {
    return res.status(400).json({ success: false, error: 'Email and teamName are required' });
  }

  const users = readUsers();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedTeam = teamName.trim();
  const nowIso = new Date().toISOString();

  let targetIndex = users.findIndex(u => u.email.toLowerCase() === trimmedEmail);
  let updatedUser: any;

  if (targetIndex >= 0) {
    const existing = users[targetIndex];
    updatedUser = {
      ...existing,
      name: name?.trim() || existing.name,
      password: password?.trim() || existing.password || 'Password123',
      role: existing.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'team_manager',
      managedTeamName: trimmedTeam,
      managerApprovalStatus: 'approved',
      studentId: studentId?.trim() || existing.studentId || '',
      department: department?.trim() || existing.department || 'جامعة النيل',
      lastActiveAt: nowIso,
    };
    users[targetIndex] = updatedUser;
  } else {
    // Generate readable name from email if not given
    const rawName = trimmedEmail.split('@')[0].replace(/[._]/g, ' ');
    const defaultName = name?.trim() || (rawName.charAt(0).toUpperCase() + rawName.slice(1));
    updatedUser = {
      id: `user_tm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: defaultName,
      email: trimmedEmail,
      password: password?.trim() || 'Password123',
      role: 'team_manager',
      managedTeamName: trimmedTeam,
      managerApprovalStatus: 'approved',
      studentId: studentId?.trim() || '',
      department: department?.trim() || 'جامعة النيل',
      registeredAt: nowIso.substring(0, 10),
      lastLoginAt: '',
      lastActiveAt: nowIso,
      isOnline: false,
      loginCount: 0,
    };
    users.unshift(updatedUser);
  }

  writeUsers(users);
  console.log(`[ASSIGN MANAGER] Manager ${updatedUser.name} (${updatedUser.email}) assigned to team ${trimmedTeam}`);
  res.json({ success: true, user: updatedUser, users });
});

// 3.2. POST /api/users/unassign-manager - Remove manager role from user
app.post('/api/users/unassign-manager', (req: Request, res: Response) => {
  const { userId, email } = req.body;
  const users = readUsers();
  const targetIndex = users.findIndex(u => (userId && u.id === userId) || (email && u.email.toLowerCase() === email.trim().toLowerCase()));
  if (targetIndex >= 0) {
    const target = users[targetIndex];
    if (target.email.toLowerCase() !== PERMANENT_ADMIN_EMAIL.toLowerCase()) {
      users[targetIndex] = {
        ...target,
        role: 'spectator',
        managedTeamName: undefined,
        managerApprovalStatus: undefined,
      };
      writeUsers(users);
    }
  }
  res.json({ success: true, users });
});

// 4. PUT /api/users/:id - Update user details or role
app.put('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const users = readUsers();

  const index = users.findIndex(u => u.id === id);
  if (index < 0) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const target = users[index];
  if (target.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
    // Protect permanent admin from role demotion
    updates.role = 'admin';
    updates.isPermanentAdmin = true;
  }

  users[index] = {
    ...target,
    ...updates,
    lastActiveAt: new Date().toISOString(),
  };

  writeUsers(users);
  res.json({ success: true, user: users[index], users });
});

// 5. DELETE /api/users/:id - Delete user
app.delete('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const users = readUsers();

  const target = users.find(u => u.id === id);
  if (!target) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  if (target.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({ success: false, error: 'Cannot delete permanent super admin' });
  }

  const filtered = users.filter(u => u.id !== id);
  writeUsers(filtered);
  res.json({ success: true, users: filtered });
});

// 6. POST /api/users/sync - Multi-client sync / merge
app.post('/api/users/sync', (req: Request, res: Response) => {
  const incomingUsers = req.body.users;
  if (!Array.isArray(incomingUsers)) {
    return res.status(400).json({ success: false, error: 'Users array required' });
  }

  const currentUsers = readUsers();
  const mapByEmail = new Map<string, any>();

  // Add existing server users first
  currentUsers.forEach(u => mapByEmail.set(u.email.toLowerCase(), u));

  // Merge incoming local users (preserve any accounts created on device)
  incomingUsers.forEach(u => {
    if (!u.email) return;
    const email = u.email.toLowerCase();
    if (!mapByEmail.has(email)) {
      mapByEmail.set(email, u);
    } else {
      const existing = mapByEmail.get(email);
      // Keep most recent active info
      mapByEmail.set(email, {
        ...existing,
        ...u,
        loginCount: Math.max(existing.loginCount || 1, u.loginCount || 1),
        lastLoginAt: existing.lastLoginAt || u.lastLoginAt,
        lastActiveAt: existing.lastActiveAt || u.lastActiveAt,
      });
    }
  });

  const merged = Array.from(mapByEmail.values());
  writeUsers(merged);
  res.json({ success: true, users: merged });
});

// 7. POST /api/users/heartbeat - Heartbeat for active users
app.post('/api/users/heartbeat', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) return res.json({ success: false });

  const users = readUsers();
  const target = users.find(u => u.id === userId);
  if (target) {
    target.lastActiveAt = new Date().toISOString();
    target.isOnline = true;
    writeUsers(users);
  }
  res.json({ success: true });
});

// 8. GET /api/settings - Read tournament settings (such as isPlayerEditingOpen)
app.get('/api/settings', (_req: Request, res: Response) => {
  const settings = readSettings();
  res.json({ success: true, settings });
});

// 9. POST /api/settings - Update tournament settings
app.post('/api/settings', (req: Request, res: Response) => {
  const current = readSettings();
  const updated: AppSettings = {
    ...current,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  writeSettings(updated);
  console.log(`[SETTINGS] Updated settings: isPlayerEditingOpen = ${updated.isPlayerEditingOpen}`);
  res.json({ success: true, settings: updated });
});

// -------------------------------------------------------------
// VITE DEV SERVER / STATIC PRODUCTION SERVING
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: HOST,
        port: PORT,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`🏆 Nile University Tournament Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
