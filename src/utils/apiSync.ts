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
  updatedAt?: string;
  updatedBy?: string;
}

const SETTINGS_STORAGE_KEY = 'nu_tournament_settings_v1';

export function getLocalSettings(): TournamentSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse local tournament settings', e);
  }
  return { isPlayerEditingOpen: true };
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
