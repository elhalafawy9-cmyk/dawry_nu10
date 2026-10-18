import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Server-side Gemini AI client initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const DATA_DIR = path.resolve(__dirname, 'data');
const USERS_FILE = path.resolve(DATA_DIR, 'users.json');
const SETTINGS_FILE = path.resolve(DATA_DIR, 'settings.json');
const APPLICATIONS_FILE = path.resolve(DATA_DIR, 'applications.json');
const SEASONS_FILE = path.resolve(DATA_DIR, 'seasons.json');
const ARCHIVED_SEASONS_FILE = path.resolve(DATA_DIR, 'archived_seasons.json');

interface AppSettings {
  isPlayerEditingOpen: boolean;
  isRegistrationVisibleToPublic: boolean;
  registrationDeadline?: string;
  activeSeasonId: string;
  currentSeasonName: string;
  currentAcademicYear: string;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  isPlayerEditingOpen: true,
  isRegistrationVisibleToPublic: true, // Visible for registration by default!
  registrationDeadline: '2026-11-30',
  activeSeasonId: 'season_2026',
  currentSeasonName: 'دوري جامعة النيل 2026 - النسخة الخامسة',
  currentAcademicYear: '2025 / 2026',
};

export interface TeamApplication {
  id: string;
  teamName: string;
  faculty: string;
  captainName: string;
  captainStudentId: string;
  email: string;
  phone: string;
  playerCount: number;
  primaryColor: string;
  secondaryColor?: string;
  logoUrl?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface TournamentSeason {
  id: string;
  name: string;
  year: string;
  teamsCount: number;
  status: 'active' | 'archived' | 'upcoming';
  champion?: string;
  runnerUp?: string;
  createdAt: string;
  archivedAt?: string;
}

const DEFAULT_SEASONS: TournamentSeason[] = [
  {
    id: 'season_2026',
    name: 'دوري جامعة النيل 2026 - النسخة الخامسة (48 فريقاً)',
    year: '2025 / 2026',
    teamsCount: 48,
    status: 'active',
    createdAt: '2026-01-01',
  },
];

const DEFAULT_APPLICATIONS: TeamApplication[] = [];

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

function readApplications(): TeamApplication[] {
  ensureDataDir();
  try {
    if (fs.existsSync(APPLICATIONS_FILE)) {
      const raw = fs.readFileSync(APPLICATIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Could not read applications.json', e);
  }
  writeApplications(DEFAULT_APPLICATIONS);
  return DEFAULT_APPLICATIONS;
}

function writeApplications(apps: TeamApplication[]): void {
  ensureDataDir();
  try {
    fs.writeFileSync(APPLICATIONS_FILE, JSON.stringify(apps, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write applications.json', e);
  }
}

function readSeasons(): TournamentSeason[] {
  ensureDataDir();
  try {
    if (fs.existsSync(SEASONS_FILE)) {
      const raw = fs.readFileSync(SEASONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Could not read seasons.json', e);
  }
  writeSeasons(DEFAULT_SEASONS);
  return DEFAULT_SEASONS;
}

function writeSeasons(seasons: TournamentSeason[]): void {
  ensureDataDir();
  try {
    fs.writeFileSync(SEASONS_FILE, JSON.stringify(seasons, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write seasons.json', e);
  }
}

export interface ArchivedSeasonSnapshot {
  id: string;
  seasonId: string;
  seasonName: string;
  year: string;
  archivedAt: string;
  archivedBy?: string;
  champion?: string;
  runnerUp?: string;
  teamsCount: number;
  matchesCount: number;
  teams: any[];
  matches?: any[];
  scorersSummary?: string;
}

function readArchivedSnapshots(): ArchivedSeasonSnapshot[] {
  ensureDataDir();
  try {
    if (fs.existsSync(ARCHIVED_SEASONS_FILE)) {
      const raw = fs.readFileSync(ARCHIVED_SEASONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Could not read archived_seasons.json', e);
  }
  const defaultSnapshots: ArchivedSeasonSnapshot[] = [];
  writeArchivedSnapshots(defaultSnapshots);
  return defaultSnapshots;
}

function writeArchivedSnapshots(snapshots: ArchivedSeasonSnapshot[]): void {
  ensureDataDir();
  try {
    fs.writeFileSync(ARCHIVED_SEASONS_FILE, JSON.stringify(snapshots, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write archived_seasons.json', e);
  }
}

const PERMANENT_ADMIN_EMAIL = 's.mohamed2442@nu.edu.eg';
const PERMANENT_ADMIN_PASSWORD = 'Hv102030';

// Initial default seed users - ONLY user s.mohamed2442@nu.edu.eg as super admin
const DEFAULT_INITIAL_USERS = [
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
    notes: 'المدير الدائم المعتمد والوحيد للنظام - كامل صلاحيات الإدارة',
    lastLoginAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    isOnline: true,
    loginCount: 1,
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
        // Purge old demo admin and users completely
        const cleaned = parsed
          .filter(u => u.email && u.email.toLowerCase() !== 'elhalafawy9@gmail.com')
          .map(u => {
            if (u.email && u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
              return {
                ...u,
                name: 'المدير العام للنظام',
                password: PERMANENT_ADMIN_PASSWORD,
                role: 'admin',
                isPermanentAdmin: true,
              };
            }
            return u;
          });
        if (!cleaned.some(u => u.email && u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase())) {
          cleaned.unshift(DEFAULT_INITIAL_USERS[0]);
        }
        // Compute online status dynamically (active within 3 minutes)
        const now = Date.now();
        return cleaned.map(u => {
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
    // Permanent admin guard & purge old admin
    const sanitized = users
      .filter(u => u.email && u.email.toLowerCase() !== 'elhalafawy9@gmail.com')
      .map(u => {
        if (u.email && u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
          return {
            ...u,
            password: PERMANENT_ADMIN_PASSWORD,
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
  console.log(`[SETTINGS] Updated settings: isPlayerEditingOpen = ${updated.isPlayerEditingOpen}, isRegistrationVisibleToPublic = ${updated.isRegistrationVisibleToPublic}`);
  res.json({ success: true, settings: updated });
});

// 10. GET /api/applications - List all team registration applications
app.get('/api/applications', (_req: Request, res: Response) => {
  const apps = readApplications();
  res.json({ success: true, applications: apps });
});

// 11. POST /api/applications - Submit a new team registration application
app.post('/api/applications', (req: Request, res: Response) => {
  const { 
    teamName, 
    faculty, 
    captainName, 
    captainStudentId, 
    email, 
    phone, 
    playerCount, 
    primaryColor, 
    secondaryColor, 
    logoUrl, 
    notes 
  } = req.body;

  if (!teamName || !captainName || !email) {
    return res.status(400).json({ success: false, error: 'اسم الفريق، اسم الكابتن، والبريد الإلكتروني مطلوبة' });
  }

  const apps = readApplications();
  
  // Check if team name already applied
  const existing = apps.find(a => a.teamName.trim().toLowerCase() === teamName.trim().toLowerCase() && a.status !== 'rejected');
  if (existing) {
    return res.status(400).json({ success: false, error: 'يوجد استمارة تقديم سابقة مسجلة بهذا الاسم بالفعل' });
  }

  const newApp: TeamApplication = {
    id: `app_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    teamName: teamName.trim(),
    faculty: faculty?.trim() || 'كلية عامة / طلاب جامعة النيل',
    captainName: captainName.trim(),
    captainStudentId: captainStudentId?.trim() || '',
    email: email.trim().toLowerCase(),
    phone: phone?.trim() || '',
    playerCount: Number(playerCount) || 12,
    primaryColor: primaryColor || '#10b981',
    secondaryColor: secondaryColor || '#064e3b',
    logoUrl: logoUrl?.trim() || undefined,
    notes: notes?.trim() || '',
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };

  apps.unshift(newApp);
  writeApplications(apps);
  console.log(`[APPLICATION] New team application submitted: ${newApp.teamName} by ${newApp.captainName}`);
  res.json({ success: true, application: newApp, applications: apps });
});

// 12. PATCH /api/applications/:id - Review and update application status (approve/reject)
app.patch('/api/applications/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, reviewNotes } = req.body;

  const apps = readApplications();
  const index = apps.findIndex(a => a.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'الاستمارة غير موجودة' });
  }

  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    apps[index].status = status;
    apps[index].reviewedAt = new Date().toISOString();
    if (reviewNotes !== undefined) {
      apps[index].reviewNotes = reviewNotes;
    }
  }

  writeApplications(apps);
  console.log(`[APPLICATION] Application ${id} (${apps[index].teamName}) updated to status: ${status}`);
  res.json({ success: true, application: apps[index], applications: apps });
});

// 13. GET /api/seasons - List tournament seasons
app.get('/api/seasons', (_req: Request, res: Response) => {
  const seasons = readSeasons();
  const settings = readSettings();
  res.json({ success: true, seasons, activeSeasonId: settings.activeSeasonId });
});

// 14. POST /api/seasons - Create a new tournament season / league edition
app.post('/api/seasons', (req: Request, res: Response) => {
  const { name, year, teamsCount, archivePrevious } = req.body;

  if (!name || !year) {
    return res.status(400).json({ success: false, error: 'اسم الموسم والعام الأكاديمي مطلوبان' });
  }

  const seasons = readSeasons();
  const settings = readSettings();

  // If archiving previous season
  if (archivePrevious) {
    seasons.forEach(s => {
      if (s.id === settings.activeSeasonId) {
        s.status = 'archived';
        s.archivedAt = new Date().toISOString();
      }
    });
  }

  const newSeason: TournamentSeason = {
    id: `season_${Date.now()}`,
    name: name.trim(),
    year: year.trim(),
    teamsCount: Number(teamsCount) || 48,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  seasons.unshift(newSeason);
  writeSeasons(seasons);

  // Update active season in settings
  settings.activeSeasonId = newSeason.id;
  settings.currentSeasonName = newSeason.name;
  settings.currentAcademicYear = newSeason.year;
  writeSettings(settings);

  console.log(`[SEASON] New season launched: ${newSeason.name} (${newSeason.year})`);
  res.json({ success: true, season: newSeason, seasons, settings });
});

// 15. POST /api/seasons/switch - Switch active season
app.post('/api/seasons/switch', (req: Request, res: Response) => {
  const { seasonId } = req.body;
  const seasons = readSeasons();
  const target = seasons.find(s => s.id === seasonId);
  if (!target) {
    return res.status(404).json({ success: false, error: 'الموسم غير موجود' });
  }

  const settings = readSettings();
  settings.activeSeasonId = target.id;
  settings.currentSeasonName = target.name;
  settings.currentAcademicYear = target.year;
  writeSettings(settings);

  res.json({ success: true, activeSeason: target, settings });
});

// 16. GET /api/seasons/archive - Get all archived season snapshots
app.get('/api/seasons/archive', (_req: Request, res: Response) => {
  const snapshots = readArchivedSnapshots();
  res.json({ success: true, snapshots });
});

// 17. POST /api/seasons/archive - Save a complete snapshot of the season in the database
app.post('/api/seasons/archive', (req: Request, res: Response) => {
  const { 
    seasonId, 
    seasonName, 
    year, 
    champion, 
    runnerUp, 
    teams, 
    matches, 
    scorersSummary, 
    archivedBy 
  } = req.body;

  const snapshots = readArchivedSnapshots();
  const newSnapshot: ArchivedSeasonSnapshot = {
    id: `snap_${Date.now()}`,
    seasonId: seasonId || `season_${Date.now()}`,
    seasonName: seasonName || 'موسم مؤرشف',
    year: year || '2025 / 2026',
    archivedAt: new Date().toISOString(),
    archivedBy: archivedBy || 'admin',
    champion: champion || 'لم يحدد بعد',
    runnerUp: runnerUp || 'لم يحدد بعد',
    teamsCount: Array.isArray(teams) ? teams.length : 48,
    matchesCount: Array.isArray(matches) ? matches.length : 152,
    teams: Array.isArray(teams) ? teams : [],
    matches: Array.isArray(matches) ? matches : [],
    scorersSummary: scorersSummary || '',
  };

  snapshots.unshift(newSnapshot);
  writeArchivedSnapshots(snapshots);
  console.log(`[SEASON] Archived snapshot saved for season: ${newSnapshot.seasonName} (${newSnapshot.year})`);
  res.json({ success: true, snapshot: newSnapshot, snapshots });
});

// 18. GET /api/backup - Export complete system backup
app.get('/api/backup', (_req: Request, res: Response) => {
  const users = readUsers();
  const settings = readSettings();
  const applications = readApplications();
  const seasons = readSeasons();
  const archivedSnapshots = readArchivedSnapshots();

  const backupData = {
    version: '1.0',
    appName: 'دوري جامعة النيل — بطولة كرة القدم',
    exportedAt: new Date().toISOString(),
    users,
    settings,
    applications,
    seasons,
    archivedSnapshots,
  };

  res.json({ success: true, backup: backupData });
});

// 19. POST /api/backup/import - Import complete system backup
app.post('/api/backup/import', (req: Request, res: Response) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ success: false, error: 'ملف النسخة الاحتياطية غير صالح' });
  }

  const payload = incoming.backup || incoming;

  if (Array.isArray(payload.users) && payload.users.length > 0) {
    writeUsers(payload.users);
  }
  if (payload.settings && typeof payload.settings === 'object') {
    writeSettings({ ...DEFAULT_SETTINGS, ...payload.settings });
  }
  if (Array.isArray(payload.applications)) {
    writeApplications(payload.applications);
  }
  if (Array.isArray(payload.seasons) && payload.seasons.length > 0) {
    writeSeasons(payload.seasons);
  }
  if (Array.isArray(payload.archivedSnapshots)) {
    writeArchivedSnapshots(payload.archivedSnapshots);
  }

  console.log(`[BACKUP RESTORE] Successfully imported backup from ${payload.exportedAt || payload.timestamp || 'unknown'}`);
  res.json({
    success: true,
    message: 'تم استعادة النسخة الاحتياطية بنجاح على الخادم',
    users: readUsers(),
    settings: readSettings(),
    applications: readApplications(),
    seasons: readSeasons(),
    archivedSnapshots: readArchivedSnapshots(),
  });
});

// 20. POST /api/system/reset-all - Hard reset system to zero & keep only super admin
app.post('/api/system/reset-all', (_req: Request, res: Response) => {
  const freshAdmin = [
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
      notes: 'المدير الدائم المعتمد والوحيد للنظام - كامل صلاحيات الإدارة',
      lastLoginAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      isOnline: true,
      loginCount: 1,
    },
  ];

  writeUsers(freshAdmin);
  writeApplications([]);
  writeArchivedSnapshots([]);
  writeSeasons(DEFAULT_SEASONS);
  writeSettings(DEFAULT_SETTINGS);

  console.log(`[SYSTEM RESET] System hard reset to zero. All users purged except ${PERMANENT_ADMIN_EMAIL}.`);
  res.json({
    success: true,
    message: 'تم تصفير جميع البيانات بنجاح وحذف كافة المستخدمين عدا حساب المدير العام',
    users: freshAdmin,
    settings: DEFAULT_SETTINGS,
    applications: [],
    seasons: DEFAULT_SEASONS,
    archivedSnapshots: [],
  });
});

// -------------------------------------------------------------
// 21. POST /api/gemini/chat - Multi-turn Nile League AI Assistant & Multimodal Image Extraction
// -------------------------------------------------------------
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const { history = [], message = '', image, context = {}, requestedModel } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'لم يتم العثور على مفتاح GEMINI_API_KEY في السيرفر.',
        reply: 'عذراً، مفتاح Gemini API غير مهيأ في بيئة السيرفر. يرجى التأكد من ضبطه.',
      });
    }

    const selectedModel = requestedModel || 'gemini-3.5-flash';

    const systemInstruction = `أنت "المساعد الذكي لدوري جامعة النيل لكرة القدم" (Nile University League AI Copilot).
أنت المساعد الرسمي المعتمد للجنة المنظمة ومديري الفرق والحكام في دوري جامعة النيل لكرة القدم.
تتحدث باللغة العربية بأسلوب راقٍ، مهني، رياضي ومحمس.

سياق البطولة الحالي:
- اسم الموسم: ${context.currentSeason || 'دوري جامعة النيل 2026/2027'}
- العام الأكاديمي: ${context.academicYear || '2026 / 2027'}
- نظام البطولة: 48 فريقاً موزعين على 8 مجموعات من A إلى H (6 فرق في كل مجموعة).
- نظام التأهل: يتأهل أول 4 فرق من كل مجموعة لدور الـ 32 الإقصائي.

قاعدة ذهبية صارمة (توحيد أسماء الفرق بالعربية والإنجليزية - ممنوع إنشاء فريق مكرر):
البطولة تضم 48 فريقاً معتمداً فقط بأسمائها العربية الرسمية:
المجموعة A: برشلونة - انجلترا - ميلان - الزمالك - روما - فرنسا
المجموعة B: الجزائر - مينيرو - فرانكفورت - اليابان - النرويج - ميامي
المجموعة C: سانتوس - انتر ميلان - البرازيل - نيوكاسل - النصر - مصر
المجموعة D: باريس - اسبانيا - نابولي - غزل المحلة - اتلتيكو مدريد - المانيا
المجموعة E: استون فيلا - امريكا - ارسنال - كولومبيا - المغرب - طرابزون
المجموعة F: بروسيا - بايرن - ريال مدريد - ايطاليا - اياكس - تشيلسي
المجموعة G: مان سيتي - اكتوبر - يونايتد - الارجنتين - ليفربول - ليفركوزن
المجموعة H: يوفنتوس - الاهلي - توتنهام - فلسطين - المكسيك - البرتغال

* حاسم جداً: إذا ظهر اسم الفريق باللغة الإنجليزية في الصورة (مثل: 'Atlético Madrid', 'Atletico', 'Barcelona', 'Real Madrid', 'PSG', 'Bayern', 'Man City', 'Chelsea', 'Arsenal', 'Liverpool', 'Juventus', إلخ)، يجب عليك دائماً وبلا استثناء استخدام "الاسم العربي الرسمي" فقط في حقل "name" وحقل "teamName" (مثلاً: اكتب دائماً 'اتلتيكو مدريد' وليس 'Atlético Madrid'، واكتب 'برشلونة' وليس 'Barcelona'، واكتب 'باريس' وليس 'PSG').
* لا تنشئ أبداً اسماً إنجليزياً لفريق له اسم عربي حتى لا يتكرر الفريق مرتين بالعربي والإنجليزي.

المهمة الأساسية والاستثنائية (استخراج الفرق واللاعبين من الصور والكشوفات والبطاقات وبطاقات القيد):
عندما يرسل المستخدم أو الأدمن صورة أو نصاً يحتوي على كشف لاعبين، أسماء أندية أو فرق، قوائم مكتوبة بخط اليد أو مطبوعة، سكرين شوت، بطاقات جامعية، أو صور كارنيهات/بطاقات لاعبين مجمعة:
1. قم بفحص الصورة أو النص بدقة شديدة واستخرج:
   - اسم الفريق الرسمي المعتمد بالعربية (Team Name) - طابقه مع أحد الـ 48 فريقاً أعلاه إن وجد.
   - المجموعة المقترحة (Group A إلى H إن ذُكرت أو اتركها فارغة).
   - اسم الكابتن إن وُجد.
   - قائمة اللاعبين كاملة:
     * اسم اللاعب بالكامل (Full Name)
     * رقم القميص / الفانلة (Shirt Number) إن وجد
     * رقم القيد أو الرقم الجامعي أو الرقم القومي (studentId) المكتوب تحت الاسم أو في الكارنيه
     * المركز الرياضي المقترح: 'GK' (حارس مرمى), 'DEF' (مدافع), 'MID' (خط وسط), 'FWD' (مهاجم)
2. اكتب تحليلاً واضحاً وودياً بالعربية يلخص ما تم قراءته من الكشف بدقة (اسم الفريق، عدد اللاعبين المستخرجين، أسمائهم وأرقامهم).
3. قم دائماً ودون استثناء بتضمين كتلة JSON في نهاية ردك محاطة بـ \`\`\`json و \`\`\` بالهيكل التالي بدقة ليتمكن الأدمن من إضافتها فوراً بنقرة زر واحدة:
\`\`\`json
{
  "action": "add_teams_and_players",
  "summary": "تم استخراج X لاعب لفريق Y بنجاح",
  "teams": [
    {
      "name": "اسم الفريق المستخرج",
      "group": "A",
      "captain": "اسم الكابتن إن وجد"
    }
  ],
  "players": [
    {
      "teamName": "اسم الفريق المستخرج",
      "name": "اسم اللاعب بالكامل",
      "number": 10,
      "position": "FWD",
      "studentId": "20261234"
    }
  ]
}
\`\`\`
ملاحظات هامة:
- إذا كانت الصورة تحتوي على أكثر من لاعب أو بطاقات متعددة، استخرج جميع اللاعبين الموجودين دون تفويت أي لاعب.
- مراكز اللاعبين المعتمدة هي فقط: 'GK', 'DEF', 'MID', 'FWD'.
- إذا لم يُذكر المركز بوضوح، اقترح مركزاً منطقياً حسب ترتيب اللاعبين في القائمة.
- إذا وجه لك المستخدم أي سؤال آخر عن لوائح البطولة، جدول المواعيد، الإحصائيات، أو قوانين كرة القدم، أجب بذكاء واحترافية وبشكل مفيد.`;

    // Construct multi-turn contents
    const contents: any[] = [];

    // Prior history turns (last 10 turns)
    if (Array.isArray(history)) {
      for (const turn of history.slice(-10)) {
        const parts: any[] = [];
        if (turn.image && turn.image.data) {
          parts.push({
            inlineData: {
              mimeType: turn.image.mimeType || 'image/jpeg',
              data: turn.image.data.replace(/^data:[^;]+;base64,/, ''),
            },
          });
        }
        if (turn.text) {
          parts.push({ text: turn.text });
        }
        if (parts.length > 0) {
          contents.push({
            role: turn.role === 'model' ? 'model' : 'user',
            parts,
          });
        }
      }
    }

    // Current turn
    const currentParts: any[] = [];
    if (image && image.data) {
      currentParts.push({
        inlineData: {
          mimeType: image.mimeType || 'image/jpeg',
          data: image.data.replace(/^data:[^;]+;base64,/, ''),
        },
      });
    }

    const promptText = message?.trim() || (image ? 'من فضلك قم بقراءة وتحليل هذه الصورة واستخرج كافة أسماء اللاعبين وأرقام قيدهم وأرقام الفانلات واسم الفريق لإضافتهم مباشرة لقوائم دوري جامعة النيل.' : 'مرحباً، كيف يمكنك مساعدتي في إدارة البطولة؟');
    currentParts.push({ text: promptText });

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    // Attempt generateContent with verified active modern Gemini models
    const candidateModels = Array.from(new Set([
      selectedModel,
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-flash-lite-latest'
    ]));
    let response: any = null;
    let lastError: any = null;

    for (const modelToTry of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelToTry,
          contents,
          config: {
            systemInstruction,
            temperature: 0.25,
          },
        });
        if (response && response.text) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelToTry} attempt failed, trying next candidate...`, err?.message || err);
      }
    }

    if (!response && lastError) {
      throw lastError;
    }

    const reply = response?.text || '';

    // Extract JSON payload if present
    let extractedPayload = null;
    const jsonMatch = reply.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        extractedPayload = JSON.parse(jsonMatch[1]);
      } catch (err) {
        console.warn('Could not parse JSON block from Gemini output:', err);
      }
    }

    res.json({
      success: true,
      reply,
      extractedPayload,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/chat:', error);
    let errorDetail = error?.message || 'حدث خطأ في معالجة طلب الذكاء الاصطناعي';
    try {
      if (typeof errorDetail === 'string' && errorDetail.includes('{')) {
        const jsonStart = errorDetail.indexOf('{');
        const parsed = JSON.parse(errorDetail.slice(jsonStart));
        if (parsed?.error?.message) {
          errorDetail = parsed.error.message;
        } else if (parsed?.message) {
          errorDetail = parsed.message;
        }
      }
    } catch (_) {}

    res.status(500).json({
      success: false,
      error: errorDetail,
      reply: 'عذراً، حدث ضغط مؤقت في خدمة الذكاء الاصطناعي أثناء قراءة الصورة. يرجى إعادة المحاولة الآن.',
    });
  }
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
