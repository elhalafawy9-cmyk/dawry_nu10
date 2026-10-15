import { AppUser, loadStoredUsers, saveStoredUsers, PERMANENT_ADMIN_EMAIL } from './auth';

/**
 * API Synchronization module for Nile University Tournament.
 * Synchronizes user entries, registrations, presence, and tournament updates across all devices.
 */

const API_BASE = '/api';

/**
 * Fetches all registered users from the backend server.
 * Merges with local storage and updates cache.
 */
export async function fetchServerUsers(): Promise<AppUser[] | null> {
  try {
    const res = await fetch(`${API_BASE}/users`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.users)) {
      saveStoredUsers(data.users);
      return data.users;
    }
  } catch (err) {
    console.warn('Could not fetch users from server, falling back to local storage:', err);
  }
  return null;
}

/**
 * Notifies the backend that a user has entered / logged in to the app.
 * Updates lastLoginAt, lastActiveAt, isOnline=true, and loginCount.
 * Returns the latest complete users list from the server.
 */
export async function recordUserEnter(user: AppUser): Promise<AppUser[] | null> {
  try {
    const res = await fetch(`${API_BASE}/users/enter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        managedTeamName: user.managedTeamName,
        playerTeamName: user.playerTeamName,
        studentId: user.studentId,
        department: user.department,
        avatarUrl: user.avatarUrl,
        isPermanentAdmin: user.isPermanentAdmin,
        managerApprovalStatus: user.managerApprovalStatus,
        requestedTeamName: user.requestedTeamName,
      }),
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.users)) {
      saveStoredUsers(data.users);
      return data.users;
    }
  } catch (err) {
    console.warn('Failed to record user enter on server:', err);
  }
  return null;
}

/**
 * Registers a new user on the server.
 * Returns the updated users list.
 */
export async function registerUserOnServer(newUser: AppUser): Promise<AppUser[] | null> {
  try {
    const res = await fetch(`${API_BASE}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(newUser),
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.users)) {
      saveStoredUsers(data.users);
      return data.users;
    }
  } catch (err) {
    console.warn('Failed to register user on server:', err);
  }
  return null;
}

/**
 * Updates an existing user on the server (e.g. role change, team assignment, approval).
 * Returns the updated users list.
 */
export async function updateUserOnServer(updatedUser: AppUser): Promise<AppUser[] | null> {
  try {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(updatedUser.id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(updatedUser),
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.users)) {
      saveStoredUsers(data.users);
      return data.users;
    }
  } catch (err) {
    console.warn('Failed to update user on server:', err);
  }
  return null;
}

/**
 * Deletes a user from the server (cannot delete permanent admin).
 */
export async function deleteUserOnServer(userId: string): Promise<AppUser[] | null> {
  try {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.users)) {
      saveStoredUsers(data.users);
      return data.users;
    }
  } catch (err) {
    console.warn('Failed to delete user on server:', err);
  }
  return null;
}

/**
 * Syncs all locally stored users to the server so no accounts created offline are lost.
 */
export async function syncLocalUsersToServer(localUsers: AppUser[]): Promise<AppUser[] | null> {
  try {
    const res = await fetch(`${API_BASE}/users/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ users: localUsers }),
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.users)) {
      saveStoredUsers(data.users);
      return data.users;
    }
  } catch (err) {
    console.warn('Failed to sync local users to server:', err);
  }
  return null;
}

/**
 * Heartbeat to maintain online status for the active user.
 */
export async function sendUserHeartbeat(userId: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/users/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  } catch {
    // Ignore heartbeat failures silently
  }
}
/**
 * Assigns or updates a team manager easily by email, password, and teamName.
 * Returns the updated users list from the server.
 */
export async function assignTeamManagerOnServer(params: {
  email: string;
  password?: string;
  teamName: string;
  name?: string;
  studentId?: string;
  department?: string;
}): Promise<AppUser[] | null> {
  try {
    const res = await fetch(`${API_BASE}/users/assign-manager`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.users)) {
      saveStoredUsers(data.users);
      return data.users;
    }
  } catch (err) {
    console.warn('Failed to assign team manager on server:', err);
  }
  return null;
}

/**
 * Unassigns team manager role from a user.
 */
export async function unassignTeamManagerOnServer(params: {
  userId?: string;
  email?: string;
}): Promise<AppUser[] | null> {
  try {
    const res = await fetch(`${API_BASE}/users/unassign-manager`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.users)) {
      saveStoredUsers(data.users);
      return data.users;
    }
  } catch (err) {
    console.warn('Failed to unassign team manager on server:', err);
  }
  return null;
}

/**
 * Helpers to format last active or login time in Arabic
 */
export function formatTimeAgoArabic(isoString?: string): string {
  if (!isoString) return 'لم يسجل دخول بعد';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'متصل الآن 🟢';
    if (diffMins < 5) return `منذ ${diffMins} دقائق (نشط الآن) 🟢`;
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;

    return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'غير معروف';
  }
}

export interface TournamentSettings {
  isPlayerEditingOpen: boolean;
  isRegistrationVisibleToPublic: boolean;
  isRegistrationOpen: boolean;
  activeSeasonId?: string;
  currentSeasonName?: string;
  currentAcademicYear?: string;
  registrationDeadline?: string;
  updatedAt?: string;
  updatedBy?: string;
}

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
  status: 'pending' | 'approved' | 'rejected' | 'need_info';
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

const SETTINGS_STORAGE_KEY = 'nu_tournament_settings_v1';
const APPLICATIONS_STORAGE_KEY = 'nu_tournament_applications_v1';
const SEASONS_STORAGE_KEY = 'nu_tournament_seasons_v1';

export function getLocalSettings(): TournamentSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        isPlayerEditingOpen: true,
        isRegistrationVisibleToPublic: true,
        isRegistrationOpen: true,
        currentSeasonName: 'دوري جامعة النيل 2026/2027 (48 فريقاً)',
        currentAcademicYear: '2026 / 2027',
        ...parsed,
      };
    }
  } catch (e) {
    console.warn('Failed to parse local tournament settings', e);
  }
  return {
    isPlayerEditingOpen: true,
    isRegistrationVisibleToPublic: true,
    isRegistrationOpen: true,
    currentSeasonName: 'دوري جامعة النيل 2026/2027 (48 فريقاً)',
    currentAcademicYear: '2026 / 2027',
  };
}

export function saveLocalSettings(settings: TournamentSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save local tournament settings', e);
  }
}

export async function fetchServerSettings(): Promise<TournamentSettings | null> {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    if (data.settings) {
      saveLocalSettings(data.settings);
      return data.settings;
    }
  } catch (e) {
    console.warn('Failed to fetch settings from server:', e);
  }
  return null;
}

export async function updateServerSettings(updates: Partial<TournamentSettings>): Promise<TournamentSettings | null> {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    if (data.settings) {
      saveLocalSettings(data.settings);
      return data.settings;
    }
  } catch (e) {
    console.warn('Failed to update settings on server:', e);
  }
  return null;
}

// -------------------------------------------------------------
// APPLICATIONS SYNC
// -------------------------------------------------------------
export function getLocalApplications(): TeamApplication[] {
  try {
    const raw = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveLocalApplications(apps: TeamApplication[]): void {
  try {
    localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(apps));
  } catch {}
}

export async function fetchServerApplications(): Promise<TeamApplication[]> {
  try {
    const res = await fetch(`${API_BASE}/applications`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.applications)) {
        saveLocalApplications(data.applications);
        return data.applications;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch applications from server:', e);
  }
  return getLocalApplications();
}

export async function submitServerApplication(
  appData: Omit<TeamApplication, 'id' | 'status' | 'submittedAt'>
): Promise<{ success: boolean; application?: TeamApplication; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(appData),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (data.applications) saveLocalApplications(data.applications);
      return { success: true, application: data.application };
    }
    return { success: false, error: data.error || 'فشل في إرسال استمارة التسجيل' };
  } catch (e: any) {
    console.warn('Failed to submit application to server, falling back locally:', e);
    const localApps = getLocalApplications();
    const newApp: TeamApplication = {
      ...appData,
      id: `app_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    localApps.unshift(newApp);
    saveLocalApplications(localApps);
    return { success: true, application: newApp };
  }
}

export async function updateServerApplicationStatus(
  id: string,
  status: 'pending' | 'approved' | 'rejected' | 'need_info',
  reviewNotes?: string
): Promise<{ success: boolean; application?: TeamApplication; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ status, reviewNotes }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (data.applications) saveLocalApplications(data.applications);
      return { success: true, application: data.application };
    }
    return { success: false, error: data.error || 'فشل في تحديث حالة الطلب' };
  } catch (e: any) {
    console.warn('Failed to patch application on server, updating locally:', e);
    const localApps = getLocalApplications();
    const idx = localApps.findIndex(a => a.id === id);
    if (idx !== -1) {
      localApps[idx].status = status;
      localApps[idx].reviewedAt = new Date().toISOString();
      if (reviewNotes !== undefined) localApps[idx].reviewNotes = reviewNotes;
      saveLocalApplications(localApps);
      return { success: true, application: localApps[idx] };
    }
    return { success: false, error: 'الاستمارة غير موجودة' };
  }
}

// -------------------------------------------------------------
// SEASONS SYNC
// -------------------------------------------------------------
export function getLocalSeasons(): TournamentSeason[] {
  try {
    const raw = localStorage.getItem(SEASONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
      id: 'season_2025',
      name: 'دوري جامعة النيل 2025 - النسخة الرابعة',
      year: '2024 / 2025',
      teamsCount: 32,
      status: 'archived',
      champion: 'برشلونة (هندسة النيل)',
      runnerUp: 'الاهلي (حاسبات ومعلومات)',
      createdAt: '2024-10-01',
      archivedAt: '2025-05-20',
    },
    {
      id: 'season_2026',
      name: 'دوري جامعة النيل 2026/2027 - النسخة الخامسة (48 فريقاً)',
      year: '2026 / 2027',
      teamsCount: 48,
      status: 'active',
      createdAt: '2025-10-01',
    },
  ];
}

export function saveLocalSeasons(seasons: TournamentSeason[]): void {
  try {
    localStorage.setItem(SEASONS_STORAGE_KEY, JSON.stringify(seasons));
  } catch {}
}

export async function fetchServerSeasons(): Promise<{ seasons: TournamentSeason[]; activeSeasonId?: string }> {
  try {
    const res = await fetch(`${API_BASE}/seasons`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.seasons)) {
        saveLocalSeasons(data.seasons);
        return { seasons: data.seasons, activeSeasonId: data.activeSeasonId };
      }
    }
  } catch (e) {
    console.warn('Failed to fetch seasons from server:', e);
  }
  return { seasons: getLocalSeasons(), activeSeasonId: 'season_2026' };
}

export async function createServerSeason(
  seasonData: { name: string; year: string; teamsCount: number; archivePrevious?: boolean }
): Promise<{ success: boolean; season?: TournamentSeason; seasons?: TournamentSeason[]; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/seasons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(seasonData),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (data.seasons) saveLocalSeasons(data.seasons);
      return { success: true, season: data.season, seasons: data.seasons };
    }
    return { success: false, error: data.error || 'فشل في إنشاء الموسم الجديد' };
  } catch (e: any) {
    console.warn('Failed to create season on server, updating locally:', e);
    const local = getLocalSeasons();
    if (seasonData.archivePrevious) {
      local.forEach(s => {
        if (s.status === 'active') {
          s.status = 'archived';
          s.archivedAt = new Date().toISOString();
        }
      });
    }
    const newSeason: TournamentSeason = {
      id: `season_${Date.now()}`,
      name: seasonData.name.trim(),
      year: seasonData.year.trim(),
      teamsCount: Number(seasonData.teamsCount) || 48,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    local.unshift(newSeason);
    saveLocalSeasons(local);
    return { success: true, season: newSeason, seasons: local };
  }
}

export async function switchServerSeason(
  seasonId: string
): Promise<{ success: boolean; activeSeason?: TournamentSeason; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/seasons/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ seasonId }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, activeSeason: data.activeSeason };
    }
    return { success: false, error: data.error || 'فشل في تبديل الموسم' };
  } catch (e: any) {
    console.warn('Failed to switch season on server:', e);
    const local = getLocalSeasons();
    const found = local.find(s => s.id === seasonId);
    if (found) return { success: true, activeSeason: found };
    return { success: false, error: 'الموسم غير موجود محلياً' };
  }
}

// -------------------------------------------------------------
// ARCHIVED SEASON SNAPSHOTS SYNC
// -------------------------------------------------------------
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

const ARCHIVED_SNAPSHOTS_STORAGE_KEY = 'nu_archived_season_snapshots_v1';

export function getLocalArchivedSnapshots(): ArchivedSeasonSnapshot[] {
  try {
    const raw = localStorage.getItem(ARCHIVED_SNAPSHOTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveLocalArchivedSnapshots(snapshots: ArchivedSeasonSnapshot[]): void {
  try {
    localStorage.setItem(ARCHIVED_SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots));
  } catch {}
}

export async function fetchServerArchivedSnapshots(): Promise<ArchivedSeasonSnapshot[]> {
  try {
    const res = await fetch(`${API_BASE}/seasons/archive`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.snapshots)) {
        saveLocalArchivedSnapshots(data.snapshots);
        return data.snapshots;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch archived snapshots from server:', e);
  }
  return getLocalArchivedSnapshots();
}

export async function archiveSeasonOnServer(payload: {
  seasonId: string;
  seasonName: string;
  year: string;
  champion?: string;
  runnerUp?: string;
  teams: any[];
  matches: any[];
  scorersSummary?: string;
  archivedBy?: string;
}): Promise<{ success: boolean; snapshot?: ArchivedSeasonSnapshot; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/seasons/archive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (Array.isArray(data.snapshots)) saveLocalArchivedSnapshots(data.snapshots);
      return { success: true, snapshot: data.snapshot };
    }
    return { success: false, error: data.error || 'فشل في حفظ أرشيف الموسم' };
  } catch (e: any) {
    console.warn('Failed to archive season on server, archiving locally:', e);
    const local = getLocalArchivedSnapshots();
    const newSnap: ArchivedSeasonSnapshot = {
      id: `snap_${Date.now()}`,
      seasonId: payload.seasonId,
      seasonName: payload.seasonName,
      year: payload.year,
      archivedAt: new Date().toISOString(),
      archivedBy: payload.archivedBy || 'admin',
      champion: payload.champion || 'لم يحدد بعد',
      runnerUp: payload.runnerUp || 'لم يحدد بعد',
      teamsCount: payload.teams.length,
      matchesCount: payload.matches.length,
      teams: payload.teams,
      matches: payload.matches,
      scorersSummary: payload.scorersSummary || '',
    };
    local.unshift(newSnap);
    saveLocalArchivedSnapshots(local);
    return { success: true, snapshot: newSnap };
  }
}


