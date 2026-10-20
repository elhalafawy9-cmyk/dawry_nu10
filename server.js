// server.ts
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = Number(process.env.PORT) || 3e3;
var HOST = "0.0.0.0";
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var DATA_DIR = path.resolve(__dirname, "data");
var USERS_FILE = path.resolve(DATA_DIR, "users.json");
var SETTINGS_FILE = path.resolve(DATA_DIR, "settings.json");
var APPLICATIONS_FILE = path.resolve(DATA_DIR, "applications.json");
var SEASONS_FILE = path.resolve(DATA_DIR, "seasons.json");
var ARCHIVED_SEASONS_FILE = path.resolve(DATA_DIR, "archived_seasons.json");
var DEFAULT_SETTINGS = {
  isPlayerEditingOpen: true,
  isRegistrationVisibleToPublic: true,
  // Visible for registration by default!
  registrationDeadline: "2026-11-30",
  activeSeasonId: "season_2026",
  currentSeasonName: "\u062F\u0648\u0631\u064A \u062C\u0627\u0645\u0639\u0629 \u0627\u0644\u0646\u064A\u0644 2026 - \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u062E\u0627\u0645\u0633\u0629",
  currentAcademicYear: "2025 / 2026"
};
var DEFAULT_SEASONS = [
  {
    id: "season_2026",
    name: "\u062F\u0648\u0631\u064A \u062C\u0627\u0645\u0639\u0629 \u0627\u0644\u0646\u064A\u0644 2026 - \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u062E\u0627\u0645\u0633\u0629 (48 \u0641\u0631\u064A\u0642\u0627\u064B)",
    year: "2025 / 2026",
    teamsCount: 48,
    status: "active",
    createdAt: "2026-01-01"
  }
];
var DEFAULT_APPLICATIONS = [];
function readSettings() {
  ensureDataDir();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn("Could not read settings.json, returning default", e);
  }
  return DEFAULT_SETTINGS;
}
function writeSettings(settings) {
  ensureDataDir();
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write settings.json", e);
  }
}
function readApplications() {
  ensureDataDir();
  try {
    if (fs.existsSync(APPLICATIONS_FILE)) {
      const raw = fs.readFileSync(APPLICATIONS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Could not read applications.json", e);
  }
  writeApplications(DEFAULT_APPLICATIONS);
  return DEFAULT_APPLICATIONS;
}
function writeApplications(apps) {
  ensureDataDir();
  try {
    fs.writeFileSync(APPLICATIONS_FILE, JSON.stringify(apps, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write applications.json", e);
  }
}
function readSeasons() {
  ensureDataDir();
  try {
    if (fs.existsSync(SEASONS_FILE)) {
      const raw = fs.readFileSync(SEASONS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Could not read seasons.json", e);
  }
  writeSeasons(DEFAULT_SEASONS);
  return DEFAULT_SEASONS;
}
function writeSeasons(seasons) {
  ensureDataDir();
  try {
    fs.writeFileSync(SEASONS_FILE, JSON.stringify(seasons, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write seasons.json", e);
  }
}
function readArchivedSnapshots() {
  ensureDataDir();
  try {
    if (fs.existsSync(ARCHIVED_SEASONS_FILE)) {
      const raw = fs.readFileSync(ARCHIVED_SEASONS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Could not read archived_seasons.json", e);
  }
  const defaultSnapshots = [];
  writeArchivedSnapshots(defaultSnapshots);
  return defaultSnapshots;
}
function writeArchivedSnapshots(snapshots) {
  ensureDataDir();
  try {
    fs.writeFileSync(ARCHIVED_SEASONS_FILE, JSON.stringify(snapshots, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write archived_seasons.json", e);
  }
}
var PERMANENT_ADMIN_EMAIL = "s.mohamed2442@nu.edu.eg";
var PERMANENT_ADMIN_PASSWORD = "Hv102030";
var DEFAULT_INITIAL_USERS = [
  {
    id: "user_super_admin",
    name: "\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645 \u0644\u0644\u0646\u0638\u0627\u0645",
    email: PERMANENT_ADMIN_EMAIL,
    password: PERMANENT_ADMIN_PASSWORD,
    role: "admin",
    isPermanentAdmin: true,
    studentId: "241000442",
    department: "\u0625\u062F\u0627\u0631\u0629 \u0628\u0637\u0648\u0644\u0629 \u062F\u0648\u0631\u064A \u0627\u0644\u0646\u064A\u0644",
    registeredAt: "2026-01-01",
    notes: "\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u062F\u0627\u0626\u0645 \u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0648\u0627\u0644\u0648\u062D\u064A\u062F \u0644\u0644\u0646\u0638\u0627\u0645 - \u0643\u0627\u0645\u0644 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u0629",
    lastLoginAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastActiveAt: (/* @__PURE__ */ new Date()).toISOString(),
    isOnline: true,
    loginCount: 1
  }
];
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}
function readUsers() {
  ensureDataDir();
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed.filter((u) => u.email && u.email.toLowerCase() !== "elhalafawy9@gmail.com").map((u) => {
          if (u.email && u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
            return {
              ...u,
              name: "\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645 \u0644\u0644\u0646\u0638\u0627\u0645",
              password: PERMANENT_ADMIN_PASSWORD,
              role: "admin",
              isPermanentAdmin: true
            };
          }
          return u;
        });
        if (!cleaned.some((u) => u.email && u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase())) {
          cleaned.unshift(DEFAULT_INITIAL_USERS[0]);
        }
        const now = Date.now();
        return cleaned.map((u) => {
          const lastActive = u.lastActiveAt ? new Date(u.lastActiveAt).getTime() : 0;
          const isRecentlyActive = now - lastActive < 3 * 60 * 1e3;
          return {
            ...u,
            isOnline: isRecentlyActive || Boolean(u.isOnline && now - lastActive < 5 * 60 * 1e3)
          };
        });
      }
    }
  } catch (err) {
    console.error("Error reading users from file:", err);
  }
  writeUsers(DEFAULT_INITIAL_USERS);
  return DEFAULT_INITIAL_USERS;
}
function writeUsers(users) {
  ensureDataDir();
  try {
    const sanitized = users.filter((u) => u.email && u.email.toLowerCase() !== "elhalafawy9@gmail.com").map((u) => {
      if (u.email && u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
        return {
          ...u,
          password: PERMANENT_ADMIN_PASSWORD,
          role: "admin",
          isPermanentAdmin: true
        };
      }
      return u;
    });
    const hasPermAdmin = sanitized.some((u) => u.email && u.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase());
    if (!hasPermAdmin) {
      sanitized.unshift(DEFAULT_INITIAL_USERS[0]);
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(sanitized, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing users to file:", err);
  }
}
app.get("/api/users", (req, res) => {
  const users = readUsers();
  res.json({ success: true, users, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.post("/api/users/enter", (req, res) => {
  const incoming = req.body;
  if (!incoming || !incoming.email && !incoming.id) {
    return res.status(400).json({ success: false, error: "User data required" });
  }
  const users = readUsers();
  const incomingEmail = (incoming.email || "").trim().toLowerCase();
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  let targetIndex = users.findIndex(
    (u) => incomingEmail && u.email.toLowerCase() === incomingEmail || incoming.id && u.id === incoming.id
  );
  let updatedUser;
  if (targetIndex >= 0) {
    const current = users[targetIndex];
    updatedUser = {
      ...current,
      name: incoming.name || current.name,
      role: current.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase() ? "admin" : incoming.role || current.role,
      studentId: incoming.studentId || current.studentId,
      department: incoming.department || current.department,
      managedTeamName: incoming.managedTeamName !== void 0 ? incoming.managedTeamName : current.managedTeamName,
      playerTeamName: incoming.playerTeamName !== void 0 ? incoming.playerTeamName : current.playerTeamName,
      avatarUrl: incoming.avatarUrl || current.avatarUrl,
      lastLoginAt: nowIso,
      lastActiveAt: nowIso,
      isOnline: true,
      loginCount: (current.loginCount || 0) + 1
    };
    users[targetIndex] = updatedUser;
  } else {
    updatedUser = {
      id: incoming.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: incoming.name || "\u0645\u0633\u062A\u062E\u062F\u0645 \u062C\u062F\u064A\u062F",
      email: incomingEmail,
      role: incoming.role || "spectator",
      studentId: incoming.studentId || "",
      department: incoming.department || "\u062C\u0627\u0645\u0639\u0629 \u0627\u0644\u0646\u064A\u0644",
      managedTeamName: incoming.managedTeamName,
      playerTeamName: incoming.playerTeamName,
      avatarUrl: incoming.avatarUrl,
      registeredAt: nowIso.substring(0, 10),
      lastLoginAt: nowIso,
      lastActiveAt: nowIso,
      isOnline: true,
      loginCount: 1
    };
    users.unshift(updatedUser);
  }
  writeUsers(users);
  console.log(`[USER ENTER] ${updatedUser.name} (${updatedUser.email}) logged in/entered. Total users: ${users.length}`);
  res.json({ success: true, user: updatedUser, users });
});
app.post("/api/users/register", (req, res) => {
  const newUser = req.body;
  if (!newUser || !newUser.email || !newUser.name) {
    return res.status(400).json({ success: false, error: "Name and email are required" });
  }
  const users = readUsers();
  const trimmedEmail = newUser.email.trim().toLowerCase();
  const existingIndex = users.findIndex((u) => u.email.toLowerCase() === trimmedEmail);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const userRecord = {
    ...newUser,
    id: newUser.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    email: trimmedEmail,
    registeredAt: newUser.registeredAt || nowIso.substring(0, 10),
    lastLoginAt: nowIso,
    lastActiveAt: nowIso,
    isOnline: true,
    loginCount: 1
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
app.post("/api/users/assign-manager", (req, res) => {
  const { email, password, teamName, name, studentId, department } = req.body;
  if (!email || !teamName) {
    return res.status(400).json({ success: false, error: "Email and teamName are required" });
  }
  const users = readUsers();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedTeam = teamName.trim();
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  let targetIndex = users.findIndex((u) => u.email.toLowerCase() === trimmedEmail);
  let updatedUser;
  if (targetIndex >= 0) {
    const existing = users[targetIndex];
    updatedUser = {
      ...existing,
      name: name?.trim() || existing.name,
      password: password?.trim() || existing.password || "Password123",
      role: existing.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase() ? "admin" : "team_manager",
      managedTeamName: trimmedTeam,
      managerApprovalStatus: "approved",
      studentId: studentId?.trim() || existing.studentId || "",
      department: department?.trim() || existing.department || "\u062C\u0627\u0645\u0639\u0629 \u0627\u0644\u0646\u064A\u0644",
      lastActiveAt: nowIso
    };
    users[targetIndex] = updatedUser;
  } else {
    const rawName = trimmedEmail.split("@")[0].replace(/[._]/g, " ");
    const defaultName = name?.trim() || rawName.charAt(0).toUpperCase() + rawName.slice(1);
    updatedUser = {
      id: `user_tm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: defaultName,
      email: trimmedEmail,
      password: password?.trim() || "Password123",
      role: "team_manager",
      managedTeamName: trimmedTeam,
      managerApprovalStatus: "approved",
      studentId: studentId?.trim() || "",
      department: department?.trim() || "\u062C\u0627\u0645\u0639\u0629 \u0627\u0644\u0646\u064A\u0644",
      registeredAt: nowIso.substring(0, 10),
      lastLoginAt: "",
      lastActiveAt: nowIso,
      isOnline: false,
      loginCount: 0
    };
    users.unshift(updatedUser);
  }
  writeUsers(users);
  console.log(`[ASSIGN MANAGER] Manager ${updatedUser.name} (${updatedUser.email}) assigned to team ${trimmedTeam}`);
  res.json({ success: true, user: updatedUser, users });
});
app.post("/api/users/unassign-manager", (req, res) => {
  const { userId, email } = req.body;
  const users = readUsers();
  const targetIndex = users.findIndex((u) => userId && u.id === userId || email && u.email.toLowerCase() === email.trim().toLowerCase());
  if (targetIndex >= 0) {
    const target = users[targetIndex];
    if (target.email.toLowerCase() !== PERMANENT_ADMIN_EMAIL.toLowerCase()) {
      users[targetIndex] = {
        ...target,
        role: "spectator",
        managedTeamName: void 0,
        managerApprovalStatus: void 0
      };
      writeUsers(users);
    }
  }
  res.json({ success: true, users });
});
app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const users = readUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index < 0) {
    return res.status(404).json({ success: false, error: "User not found" });
  }
  const target = users[index];
  if (target.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
    updates.role = "admin";
    updates.isPermanentAdmin = true;
  }
  users[index] = {
    ...target,
    ...updates,
    lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  writeUsers(users);
  res.json({ success: true, user: users[index], users });
});
app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const users = readUsers();
  const target = users.find((u) => u.id === id);
  if (!target) {
    return res.status(404).json({ success: false, error: "User not found" });
  }
  if (target.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({ success: false, error: "Cannot delete permanent super admin" });
  }
  const filtered = users.filter((u) => u.id !== id);
  writeUsers(filtered);
  res.json({ success: true, users: filtered });
});
app.post("/api/users/sync", (req, res) => {
  const incomingUsers = req.body.users;
  if (!Array.isArray(incomingUsers)) {
    return res.status(400).json({ success: false, error: "Users array required" });
  }
  const currentUsers = readUsers();
  const mapByEmail = /* @__PURE__ */ new Map();
  currentUsers.forEach((u) => mapByEmail.set(u.email.toLowerCase(), u));
  incomingUsers.forEach((u) => {
    if (!u.email) return;
    const email = u.email.toLowerCase();
    if (!mapByEmail.has(email)) {
      mapByEmail.set(email, u);
    } else {
      const existing = mapByEmail.get(email);
      mapByEmail.set(email, {
        ...existing,
        ...u,
        loginCount: Math.max(existing.loginCount || 1, u.loginCount || 1),
        lastLoginAt: existing.lastLoginAt || u.lastLoginAt,
        lastActiveAt: existing.lastActiveAt || u.lastActiveAt
      });
    }
  });
  const merged = Array.from(mapByEmail.values());
  writeUsers(merged);
  res.json({ success: true, users: merged });
});
app.post("/api/users/heartbeat", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.json({ success: false });
  const users = readUsers();
  const target = users.find((u) => u.id === userId);
  if (target) {
    target.lastActiveAt = (/* @__PURE__ */ new Date()).toISOString();
    target.isOnline = true;
    writeUsers(users);
  }
  res.json({ success: true });
});
app.get("/api/settings", (_req, res) => {
  const settings = readSettings();
  res.json({ success: true, settings });
});
app.post("/api/settings", (req, res) => {
  const current = readSettings();
  const updated = {
    ...current,
    ...req.body,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  writeSettings(updated);
  console.log(`[SETTINGS] Updated settings: isPlayerEditingOpen = ${updated.isPlayerEditingOpen}, isRegistrationVisibleToPublic = ${updated.isRegistrationVisibleToPublic}`);
  res.json({ success: true, settings: updated });
});
app.get("/api/applications", (_req, res) => {
  const apps = readApplications();
  res.json({ success: true, applications: apps });
});
app.post("/api/applications", (req, res) => {
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
    return res.status(400).json({ success: false, error: "\u0627\u0633\u0645 \u0627\u0644\u0641\u0631\u064A\u0642\u060C \u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0628\u062A\u0646\u060C \u0648\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0637\u0644\u0648\u0628\u0629" });
  }
  const apps = readApplications();
  const existing = apps.find((a) => a.teamName.trim().toLowerCase() === teamName.trim().toLowerCase() && a.status !== "rejected");
  if (existing) {
    return res.status(400).json({ success: false, error: "\u064A\u0648\u062C\u062F \u0627\u0633\u062A\u0645\u0627\u0631\u0629 \u062A\u0642\u062F\u064A\u0645 \u0633\u0627\u0628\u0642\u0629 \u0645\u0633\u062C\u0644\u0629 \u0628\u0647\u0630\u0627 \u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0641\u0639\u0644" });
  }
  const newApp = {
    id: `app_${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
    teamName: teamName.trim(),
    faculty: faculty?.trim() || "\u0643\u0644\u064A\u0629 \u0639\u0627\u0645\u0629 / \u0637\u0644\u0627\u0628 \u062C\u0627\u0645\u0639\u0629 \u0627\u0644\u0646\u064A\u0644",
    captainName: captainName.trim(),
    captainStudentId: captainStudentId?.trim() || "",
    email: email.trim().toLowerCase(),
    phone: phone?.trim() || "",
    playerCount: Number(playerCount) || 12,
    primaryColor: primaryColor || "#10b981",
    secondaryColor: secondaryColor || "#064e3b",
    logoUrl: logoUrl?.trim() || void 0,
    notes: notes?.trim() || "",
    status: "pending",
    submittedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  apps.unshift(newApp);
  writeApplications(apps);
  console.log(`[APPLICATION] New team application submitted: ${newApp.teamName} by ${newApp.captainName}`);
  res.json({ success: true, application: newApp, applications: apps });
});
app.patch("/api/applications/:id", (req, res) => {
  const { id } = req.params;
  const { status, reviewNotes } = req.body;
  const apps = readApplications();
  const index = apps.findIndex((a) => a.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: "\u0627\u0644\u0627\u0633\u062A\u0645\u0627\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
  }
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    apps[index].status = status;
    apps[index].reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (reviewNotes !== void 0) {
      apps[index].reviewNotes = reviewNotes;
    }
  }
  writeApplications(apps);
  console.log(`[APPLICATION] Application ${id} (${apps[index].teamName}) updated to status: ${status}`);
  res.json({ success: true, application: apps[index], applications: apps });
});
app.get("/api/seasons", (_req, res) => {
  const seasons = readSeasons();
  const settings = readSettings();
  res.json({ success: true, seasons, activeSeasonId: settings.activeSeasonId });
});
app.post("/api/seasons", (req, res) => {
  const { name, year, teamsCount, archivePrevious } = req.body;
  if (!name || !year) {
    return res.status(400).json({ success: false, error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0633\u0645 \u0648\u0627\u0644\u0639\u0627\u0645 \u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
  }
  const seasons = readSeasons();
  const settings = readSettings();
  if (archivePrevious) {
    seasons.forEach((s) => {
      if (s.id === settings.activeSeasonId) {
        s.status = "archived";
        s.archivedAt = (/* @__PURE__ */ new Date()).toISOString();
      }
    });
  }
  const newSeason = {
    id: `season_${Date.now()}`,
    name: name.trim(),
    year: year.trim(),
    teamsCount: Number(teamsCount) || 48,
    status: "active",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  seasons.unshift(newSeason);
  writeSeasons(seasons);
  settings.activeSeasonId = newSeason.id;
  settings.currentSeasonName = newSeason.name;
  settings.currentAcademicYear = newSeason.year;
  writeSettings(settings);
  console.log(`[SEASON] New season launched: ${newSeason.name} (${newSeason.year})`);
  res.json({ success: true, season: newSeason, seasons, settings });
});
app.post("/api/seasons/switch", (req, res) => {
  const { seasonId } = req.body;
  const seasons = readSeasons();
  const target = seasons.find((s) => s.id === seasonId);
  if (!target) {
    return res.status(404).json({ success: false, error: "\u0627\u0644\u0645\u0648\u0633\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  const settings = readSettings();
  settings.activeSeasonId = target.id;
  settings.currentSeasonName = target.name;
  settings.currentAcademicYear = target.year;
  writeSettings(settings);
  res.json({ success: true, activeSeason: target, settings });
});
app.get("/api/seasons/archive", (_req, res) => {
  const snapshots = readArchivedSnapshots();
  res.json({ success: true, snapshots });
});
app.post("/api/seasons/archive", (req, res) => {
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
  const newSnapshot = {
    id: `snap_${Date.now()}`,
    seasonId: seasonId || `season_${Date.now()}`,
    seasonName: seasonName || "\u0645\u0648\u0633\u0645 \u0645\u0624\u0631\u0634\u0641",
    year: year || "2025 / 2026",
    archivedAt: (/* @__PURE__ */ new Date()).toISOString(),
    archivedBy: archivedBy || "admin",
    champion: champion || "\u0644\u0645 \u064A\u062D\u062F\u062F \u0628\u0639\u062F",
    runnerUp: runnerUp || "\u0644\u0645 \u064A\u062D\u062F\u062F \u0628\u0639\u062F",
    teamsCount: Array.isArray(teams) ? teams.length : 48,
    matchesCount: Array.isArray(matches) ? matches.length : 152,
    teams: Array.isArray(teams) ? teams : [],
    matches: Array.isArray(matches) ? matches : [],
    scorersSummary: scorersSummary || ""
  };
  snapshots.unshift(newSnapshot);
  writeArchivedSnapshots(snapshots);
  console.log(`[SEASON] Archived snapshot saved for season: ${newSnapshot.seasonName} (${newSnapshot.year})`);
  res.json({ success: true, snapshot: newSnapshot, snapshots });
});
app.get("/api/backup", (_req, res) => {
  const users = readUsers();
  const settings = readSettings();
  const applications = readApplications();
  const seasons = readSeasons();
  const archivedSnapshots = readArchivedSnapshots();
  const backupData = {
    version: "1.0",
    appName: "\u062F\u0648\u0631\u064A \u062C\u0627\u0645\u0639\u0629 \u0627\u0644\u0646\u064A\u0644 \u2014 \u0628\u0637\u0648\u0644\u0629 \u0643\u0631\u0629 \u0627\u0644\u0642\u062F\u0645",
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    users,
    settings,
    applications,
    seasons,
    archivedSnapshots
  };
  res.json({ success: true, backup: backupData });
});
app.post("/api/backup/import", (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== "object") {
    return res.status(400).json({ success: false, error: "\u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D" });
  }
  const payload = incoming.backup || incoming;
  if (Array.isArray(payload.users) && payload.users.length > 0) {
    writeUsers(payload.users);
  }
  if (payload.settings && typeof payload.settings === "object") {
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
  console.log(`[BACKUP RESTORE] Successfully imported backup from ${payload.exportedAt || payload.timestamp || "unknown"}`);
  res.json({
    success: true,
    message: "\u062A\u0645 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0628\u0646\u062C\u0627\u062D \u0639\u0644\u0649 \u0627\u0644\u062E\u0627\u062F\u0645",
    users: readUsers(),
    settings: readSettings(),
    applications: readApplications(),
    seasons: readSeasons(),
    archivedSnapshots: readArchivedSnapshots()
  });
});
app.post("/api/system/reset-all", (_req, res) => {
  const freshAdmin = [
    {
      id: "user_super_admin",
      name: "\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645 \u0644\u0644\u0646\u0638\u0627\u0645",
      email: PERMANENT_ADMIN_EMAIL,
      password: PERMANENT_ADMIN_PASSWORD,
      role: "admin",
      isPermanentAdmin: true,
      studentId: "241000442",
      department: "\u0625\u062F\u0627\u0631\u0629 \u0628\u0637\u0648\u0644\u0629 \u062F\u0648\u0631\u064A \u0627\u0644\u0646\u064A\u0644",
      registeredAt: "2026-01-01",
      notes: "\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u062F\u0627\u0626\u0645 \u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0648\u0627\u0644\u0648\u062D\u064A\u062F \u0644\u0644\u0646\u0638\u0627\u0645 - \u0643\u0627\u0645\u0644 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u0629",
      lastLoginAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastActiveAt: (/* @__PURE__ */ new Date()).toISOString(),
      isOnline: true,
      loginCount: 1
    }
  ];
  writeUsers(freshAdmin);
  writeApplications([]);
  writeArchivedSnapshots([]);
  writeSeasons(DEFAULT_SEASONS);
  writeSettings(DEFAULT_SETTINGS);
  console.log(`[SYSTEM RESET] System hard reset to zero. All users purged except ${PERMANENT_ADMIN_EMAIL}.`);
  res.json({
    success: true,
    message: "\u062A\u0645 \u062A\u0635\u0641\u064A\u0631 \u062C\u0645\u064A\u0639 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D \u0648\u062D\u0630\u0641 \u0643\u0627\u0641\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0639\u062F\u0627 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645",
    users: freshAdmin,
    settings: DEFAULT_SETTINGS,
    applications: [],
    seasons: DEFAULT_SEASONS,
    archivedSnapshots: []
  });
});
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { history = [], message = "", image, context = {}, requestedModel } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0641\u062A\u0627\u062D GEMINI_API_KEY \u0641\u064A \u0627\u0644\u0633\u064A\u0631\u0641\u0631.",
        reply: "\u0639\u0630\u0631\u0627\u064B\u060C \u0645\u0641\u062A\u0627\u062D Gemini API \u063A\u064A\u0631 \u0645\u0647\u064A\u0623 \u0641\u064A \u0628\u064A\u0626\u0629 \u0627\u0644\u0633\u064A\u0631\u0641\u0631. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0636\u0628\u0637\u0647."
      });
    }
    const selectedModel = requestedModel || "gemini-3.5-flash";
    const systemInstruction = `\u0623\u0646\u062A "\u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0630\u0643\u064A \u0644\u062F\u0648\u0631\u064A \u062C\u0627\u0645\u0639\u0629 \u0627\u0644\u0646\u064A\u0644 \u0644\u0643\u0631\u0629 \u0627\u0644\u0642\u062F\u0645" (Nile University League AI Copilot).
\u0623\u0646\u062A \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0631\u0633\u0645\u064A \u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0644\u0644\u062C\u0646\u0629 \u0627\u0644\u0645\u0646\u0638\u0645\u0629 \u0648\u0645\u062F\u064A\u0631\u064A \u0627\u0644\u0641\u0631\u0642 \u0648\u0627\u0644\u062D\u0643\u0627\u0645 \u0641\u064A \u062F\u0648\u0631\u064A \u062C\u0627\u0645\u0639\u0629 \u0627\u0644\u0646\u064A\u0644 \u0644\u0643\u0631\u0629 \u0627\u0644\u0642\u062F\u0645.
\u062A\u062A\u062D\u062F\u062B \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0628\u0623\u0633\u0644\u0648\u0628 \u0631\u0627\u0642\u064D\u060C \u0645\u0647\u0646\u064A\u060C \u0631\u064A\u0627\u0636\u064A \u0648\u0645\u062D\u0645\u0633.

\u0633\u064A\u0627\u0642 \u0627\u0644\u0628\u0637\u0648\u0644\u0629 \u0627\u0644\u062D\u0627\u0644\u064A:
- \u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0633\u0645: ${context.currentSeason || "\u062F\u0648\u0631\u064A \u062C\u0627\u0645\u0639\u0629 \u0627\u0644\u0646\u064A\u0644 2026/2027"}
- \u0627\u0644\u0639\u0627\u0645 \u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A: ${context.academicYear || "2026 / 2027"}
- \u0646\u0638\u0627\u0645 \u0627\u0644\u0628\u0637\u0648\u0644\u0629: 48 \u0641\u0631\u064A\u0642\u0627\u064B \u0645\u0648\u0632\u0639\u064A\u0646 \u0639\u0644\u0649 8 \u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0645\u0646 A \u0625\u0644\u0649 H (6 \u0641\u0631\u0642 \u0641\u064A \u0643\u0644 \u0645\u062C\u0645\u0648\u0639\u0629).
- \u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0623\u0647\u0644: \u064A\u062A\u0623\u0647\u0644 \u0623\u0648\u0644 4 \u0641\u0631\u0642 \u0645\u0646 \u0643\u0644 \u0645\u062C\u0645\u0648\u0639\u0629 \u0644\u062F\u0648\u0631 \u0627\u0644\u0640 32 \u0627\u0644\u0625\u0642\u0635\u0627\u0626\u064A.

\u0642\u0627\u0639\u062F\u0629 \u0630\u0647\u0628\u064A\u0629 \u0635\u0627\u0631\u0645\u0629 (\u062A\u0648\u062D\u064A\u062F \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0641\u0631\u0642 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0648\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629 - \u0645\u0645\u0646\u0648\u0639 \u0625\u0646\u0634\u0627\u0621 \u0641\u0631\u064A\u0642 \u0645\u0643\u0631\u0631):
\u0627\u0644\u0628\u0637\u0648\u0644\u0629 \u062A\u0636\u0645 48 \u0641\u0631\u064A\u0642\u0627\u064B \u0645\u0639\u062A\u0645\u062F\u0627\u064B \u0641\u0642\u0637 \u0628\u0623\u0633\u0645\u0627\u0626\u0647\u0627 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0631\u0633\u0645\u064A\u0629:
\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 A: \u0628\u0631\u0634\u0644\u0648\u0646\u0629 - \u0627\u0646\u062C\u0644\u062A\u0631\u0627 - \u0645\u064A\u0644\u0627\u0646 - \u0627\u0644\u0632\u0645\u0627\u0644\u0643 - \u0631\u0648\u0645\u0627 - \u0641\u0631\u0646\u0633\u0627
\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 B: \u0627\u0644\u062C\u0632\u0627\u0626\u0631 - \u0645\u064A\u0646\u064A\u0631\u0648 - \u0641\u0631\u0627\u0646\u0643\u0641\u0648\u0631\u062A - \u0627\u0644\u064A\u0627\u0628\u0627\u0646 - \u0627\u0644\u0646\u0631\u0648\u064A\u062C - \u0645\u064A\u0627\u0645\u064A
\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 C: \u0633\u0627\u0646\u062A\u0648\u0633 - \u0627\u0646\u062A\u0631 \u0645\u064A\u0644\u0627\u0646 - \u0627\u0644\u0628\u0631\u0627\u0632\u064A\u0644 - \u0646\u064A\u0648\u0643\u0627\u0633\u0644 - \u0627\u0644\u0646\u0635\u0631 - \u0645\u0635\u0631
\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 D: \u0628\u0627\u0631\u064A\u0633 - \u0627\u0633\u0628\u0627\u0646\u064A\u0627 - \u0646\u0627\u0628\u0648\u0644\u064A - \u063A\u0632\u0644 \u0627\u0644\u0645\u062D\u0644\u0629 - \u0627\u062A\u0644\u062A\u064A\u0643\u0648 \u0645\u062F\u0631\u064A\u062F - \u0627\u0644\u0645\u0627\u0646\u064A\u0627
\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 E: \u0627\u0633\u062A\u0648\u0646 \u0641\u064A\u0644\u0627 - \u0627\u0645\u0631\u064A\u0643\u0627 - \u0627\u0631\u0633\u0646\u0627\u0644 - \u0643\u0648\u0644\u0648\u0645\u0628\u064A\u0627 - \u0627\u0644\u0645\u063A\u0631\u0628 - \u0637\u0631\u0627\u0628\u0632\u0648\u0646
\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 F: \u0628\u0631\u0648\u0633\u064A\u0627 - \u0628\u0627\u064A\u0631\u0646 - \u0631\u064A\u0627\u0644 \u0645\u062F\u0631\u064A\u062F - \u0627\u064A\u0637\u0627\u0644\u064A\u0627 - \u0627\u064A\u0627\u0643\u0633 - \u062A\u0634\u064A\u0644\u0633\u064A
\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 G: \u0645\u0627\u0646 \u0633\u064A\u062A\u064A - \u0627\u0643\u062A\u0648\u0628\u0631 - \u064A\u0648\u0646\u0627\u064A\u062A\u062F - \u0627\u0644\u0627\u0631\u062C\u0646\u062A\u064A\u0646 - \u0644\u064A\u0641\u0631\u0628\u0648\u0644 - \u0644\u064A\u0641\u0631\u0643\u0648\u0632\u0646
\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 H: \u064A\u0648\u0641\u0646\u062A\u0648\u0633 - \u0627\u0644\u0627\u0647\u0644\u064A - \u062A\u0648\u062A\u0646\u0647\u0627\u0645 - \u0641\u0644\u0633\u0637\u064A\u0646 - \u0627\u0644\u0645\u0643\u0633\u064A\u0643 - \u0627\u0644\u0628\u0631\u062A\u063A\u0627\u0644

* \u062D\u0627\u0633\u0645 \u062C\u062F\u0627\u064B: \u0625\u0630\u0627 \u0638\u0647\u0631 \u0627\u0633\u0645 \u0627\u0644\u0641\u0631\u064A\u0642 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629 \u0641\u064A \u0627\u0644\u0635\u0648\u0631\u0629 (\u0645\u062B\u0644: 'Atl\xE9tico Madrid', 'Atletico', 'Barcelona', 'Real Madrid', 'PSG', 'Bayern', 'Man City', 'Chelsea', 'Arsenal', 'Liverpool', 'Juventus', \u0625\u0644\u062E)\u060C \u064A\u062C\u0628 \u0639\u0644\u064A\u0643 \u062F\u0627\u0626\u0645\u0627\u064B \u0648\u0628\u0644\u0627 \u0627\u0633\u062A\u062B\u0646\u0627\u0621 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0631\u0628\u064A \u0627\u0644\u0631\u0633\u0645\u064A" \u0641\u0642\u0637 \u0641\u064A \u062D\u0642\u0644 "name" \u0648\u062D\u0642\u0644 "teamName" (\u0645\u062B\u0644\u0627\u064B: \u0627\u0643\u062A\u0628 \u062F\u0627\u0626\u0645\u0627\u064B '\u0627\u062A\u0644\u062A\u064A\u0643\u0648 \u0645\u062F\u0631\u064A\u062F' \u0648\u0644\u064A\u0633 'Atl\xE9tico Madrid'\u060C \u0648\u0627\u0643\u062A\u0628 '\u0628\u0631\u0634\u0644\u0648\u0646\u0629' \u0648\u0644\u064A\u0633 'Barcelona'\u060C \u0648\u0627\u0643\u062A\u0628 '\u0628\u0627\u0631\u064A\u0633' \u0648\u0644\u064A\u0633 'PSG').
* \u0644\u0627 \u062A\u0646\u0634\u0626 \u0623\u0628\u062F\u0627\u064B \u0627\u0633\u0645\u0627\u064B \u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0627\u064B \u0644\u0641\u0631\u064A\u0642 \u0644\u0647 \u0627\u0633\u0645 \u0639\u0631\u0628\u064A \u062D\u062A\u0649 \u0644\u0627 \u064A\u062A\u0643\u0631\u0631 \u0627\u0644\u0641\u0631\u064A\u0642 \u0645\u0631\u062A\u064A\u0646 \u0628\u0627\u0644\u0639\u0631\u0628\u064A \u0648\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A.

\u0627\u0644\u0645\u0647\u0645\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0648\u0627\u0644\u0627\u0633\u062A\u062B\u0646\u0627\u0626\u064A\u0629 (\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0641\u0631\u0642 \u0648\u0627\u0644\u0644\u0627\u0639\u0628\u064A\u0646 \u0645\u0646 \u0627\u0644\u0635\u0648\u0631 \u0648\u0627\u0644\u0643\u0634\u0648\u0641\u0627\u062A \u0648\u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062A \u0648\u0628\u0637\u0627\u0642\u0627\u062A \u0627\u0644\u0642\u064A\u062F):
\u0639\u0646\u062F\u0645\u0627 \u064A\u0631\u0633\u0644 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0627\u0644\u0623\u062F\u0645\u0646 \u0635\u0648\u0631\u0629 \u0623\u0648 \u0646\u0635\u0627\u064B \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0643\u0634\u0641 \u0644\u0627\u0639\u0628\u064A\u0646\u060C \u0623\u0633\u0645\u0627\u0621 \u0623\u0646\u062F\u064A\u0629 \u0623\u0648 \u0641\u0631\u0642\u060C \u0642\u0648\u0627\u0626\u0645 \u0645\u0643\u062A\u0648\u0628\u0629 \u0628\u062E\u0637 \u0627\u0644\u064A\u062F \u0623\u0648 \u0645\u0637\u0628\u0648\u0639\u0629\u060C \u0633\u0643\u0631\u064A\u0646 \u0634\u0648\u062A\u060C \u0628\u0637\u0627\u0642\u0627\u062A \u062C\u0627\u0645\u0639\u064A\u0629\u060C \u0623\u0648 \u0635\u0648\u0631 \u0643\u0627\u0631\u0646\u064A\u0647\u0627\u062A/\u0628\u0637\u0627\u0642\u0627\u062A \u0644\u0627\u0639\u0628\u064A\u0646 \u0645\u062C\u0645\u0639\u0629:
1. \u0642\u0645 \u0628\u0641\u062D\u0635 \u0627\u0644\u0635\u0648\u0631\u0629 \u0623\u0648 \u0627\u0644\u0646\u0635 \u0628\u062F\u0642\u0629 \u0634\u062F\u064A\u062F\u0629 \u0648\u0627\u0633\u062A\u062E\u0631\u062C:
   - \u0627\u0633\u0645 \u0627\u0644\u0641\u0631\u064A\u0642 \u0627\u0644\u0631\u0633\u0645\u064A \u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 (Team Name) - \u0637\u0627\u0628\u0642\u0647 \u0645\u0639 \u0623\u062D\u062F \u0627\u0644\u0640 48 \u0641\u0631\u064A\u0642\u0627\u064B \u0623\u0639\u0644\u0627\u0647 \u0625\u0646 \u0648\u062C\u062F.
   - \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0645\u0642\u062A\u0631\u062D\u0629 (Group A \u0625\u0644\u0649 H \u0625\u0646 \u0630\u064F\u0643\u0631\u062A \u0623\u0648 \u0627\u062A\u0631\u0643\u0647\u0627 \u0641\u0627\u0631\u063A\u0629).
   - \u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0628\u062A\u0646 \u0625\u0646 \u0648\u064F\u062C\u062F.
   - \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0644\u0627\u0639\u0628\u064A\u0646 \u0643\u0627\u0645\u0644\u0629:
     * \u0627\u0633\u0645 \u0627\u0644\u0644\u0627\u0639\u0628 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 (Full Name)
     * \u0631\u0642\u0645 \u0627\u0644\u0642\u0645\u064A\u0635 / \u0627\u0644\u0641\u0627\u0646\u0644\u0629 (Shirt Number) \u0625\u0646 \u0648\u062C\u062F
     * \u0631\u0642\u0645 \u0627\u0644\u0642\u064A\u062F \u0623\u0648 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u062C\u0627\u0645\u0639\u064A \u0623\u0648 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0642\u0648\u0645\u064A (studentId) \u0627\u0644\u0645\u0643\u062A\u0648\u0628 \u062A\u062D\u062A \u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0641\u064A \u0627\u0644\u0643\u0627\u0631\u0646\u064A\u0647
     * \u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u0631\u064A\u0627\u0636\u064A \u0627\u0644\u0645\u0642\u062A\u0631\u062D: 'GK' (\u062D\u0627\u0631\u0633 \u0645\u0631\u0645\u0649), 'DEF' (\u0645\u062F\u0627\u0641\u0639), 'MID' (\u062E\u0637 \u0648\u0633\u0637), 'FWD' (\u0645\u0647\u0627\u062C\u0645)
2. \u0627\u0643\u062A\u0628 \u062A\u062D\u0644\u064A\u0644\u0627\u064B \u0648\u0627\u0636\u062D\u0627\u064B \u0648\u0648\u062F\u064A\u0627\u064B \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u064A\u0644\u062E\u0635 \u0645\u0627 \u062A\u0645 \u0642\u0631\u0627\u0621\u062A\u0647 \u0645\u0646 \u0627\u0644\u0643\u0634\u0641 \u0628\u062F\u0642\u0629 (\u0627\u0633\u0645 \u0627\u0644\u0641\u0631\u064A\u0642\u060C \u0639\u062F\u062F \u0627\u0644\u0644\u0627\u0639\u0628\u064A\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u0631\u062C\u064A\u0646\u060C \u0623\u0633\u0645\u0627\u0626\u0647\u0645 \u0648\u0623\u0631\u0642\u0627\u0645\u0647\u0645).
3. \u0642\u0645 \u062F\u0627\u0626\u0645\u0627\u064B \u0648\u062F\u0648\u0646 \u0627\u0633\u062A\u062B\u0646\u0627\u0621 \u0628\u062A\u0636\u0645\u064A\u0646 \u0643\u062A\u0644\u0629 JSON \u0641\u064A \u0646\u0647\u0627\u064A\u0629 \u0631\u062F\u0643 \u0645\u062D\u0627\u0637\u0629 \u0628\u0640 \`\`\`json \u0648 \`\`\` \u0628\u0627\u0644\u0647\u064A\u0643\u0644 \u0627\u0644\u062A\u0627\u0644\u064A \u0628\u062F\u0642\u0629 \u0644\u064A\u062A\u0645\u0643\u0646 \u0627\u0644\u0623\u062F\u0645\u0646 \u0645\u0646 \u0625\u0636\u0627\u0641\u062A\u0647\u0627 \u0641\u0648\u0631\u0627\u064B \u0628\u0646\u0642\u0631\u0629 \u0632\u0631 \u0648\u0627\u062D\u062F\u0629:
\`\`\`json
{
  "action": "add_teams_and_players",
  "summary": "\u062A\u0645 \u0627\u0633\u062A\u062E\u0631\u0627\u062C X \u0644\u0627\u0639\u0628 \u0644\u0641\u0631\u064A\u0642 Y \u0628\u0646\u062C\u0627\u062D",
  "teams": [
    {
      "name": "\u0627\u0633\u0645 \u0627\u0644\u0641\u0631\u064A\u0642 \u0627\u0644\u0645\u0633\u062A\u062E\u0631\u062C",
      "group": "A",
      "captain": "\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0628\u062A\u0646 \u0625\u0646 \u0648\u062C\u062F"
    }
  ],
  "players": [
    {
      "teamName": "\u0627\u0633\u0645 \u0627\u0644\u0641\u0631\u064A\u0642 \u0627\u0644\u0645\u0633\u062A\u062E\u0631\u062C",
      "name": "\u0627\u0633\u0645 \u0627\u0644\u0644\u0627\u0639\u0628 \u0628\u0627\u0644\u0643\u0627\u0645\u0644",
      "number": 10,
      "position": "FWD",
      "studentId": "20261234"
    }
  ]
}
\`\`\`
\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0647\u0627\u0645\u0629:
- \u0625\u0630\u0627 \u0643\u0627\u0646\u062A \u0627\u0644\u0635\u0648\u0631\u0629 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0623\u0643\u062B\u0631 \u0645\u0646 \u0644\u0627\u0639\u0628 \u0623\u0648 \u0628\u0637\u0627\u0642\u0627\u062A \u0645\u062A\u0639\u062F\u062F\u0629\u060C \u0627\u0633\u062A\u062E\u0631\u062C \u062C\u0645\u064A\u0639 \u0627\u0644\u0644\u0627\u0639\u0628\u064A\u0646 \u0627\u0644\u0645\u0648\u062C\u0648\u062F\u064A\u0646 \u062F\u0648\u0646 \u062A\u0641\u0648\u064A\u062A \u0623\u064A \u0644\u0627\u0639\u0628.
- \u0645\u0631\u0627\u0643\u0632 \u0627\u0644\u0644\u0627\u0639\u0628\u064A\u0646 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \u0647\u064A \u0641\u0642\u0637: 'GK', 'DEF', 'MID', 'FWD'.
- \u0625\u0630\u0627 \u0644\u0645 \u064A\u064F\u0630\u0643\u0631 \u0627\u0644\u0645\u0631\u0643\u0632 \u0628\u0648\u0636\u0648\u062D\u060C \u0627\u0642\u062A\u0631\u062D \u0645\u0631\u0643\u0632\u0627\u064B \u0645\u0646\u0637\u0642\u064A\u0627\u064B \u062D\u0633\u0628 \u062A\u0631\u062A\u064A\u0628 \u0627\u0644\u0644\u0627\u0639\u0628\u064A\u0646 \u0641\u064A \u0627\u0644\u0642\u0627\u0626\u0645\u0629.
- \u0625\u0630\u0627 \u0648\u062C\u0647 \u0644\u0643 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u064A \u0633\u0624\u0627\u0644 \u0622\u062E\u0631 \u0639\u0646 \u0644\u0648\u0627\u0626\u062D \u0627\u0644\u0628\u0637\u0648\u0644\u0629\u060C \u062C\u062F\u0648\u0644 \u0627\u0644\u0645\u0648\u0627\u0639\u064A\u062F\u060C \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A\u060C \u0623\u0648 \u0642\u0648\u0627\u0646\u064A\u0646 \u0643\u0631\u0629 \u0627\u0644\u0642\u062F\u0645\u060C \u0623\u062C\u0628 \u0628\u0630\u0643\u0627\u0621 \u0648\u0627\u062D\u062A\u0631\u0627\u0641\u064A\u0629 \u0648\u0628\u0634\u0643\u0644 \u0645\u0641\u064A\u062F.`;
    const contents = [];
    if (Array.isArray(history)) {
      for (const turn of history.slice(-10)) {
        const parts = [];
        if (turn.image && turn.image.data) {
          parts.push({
            inlineData: {
              mimeType: turn.image.mimeType || "image/jpeg",
              data: turn.image.data.replace(/^data:[^;]+;base64,/, "")
            }
          });
        }
        if (turn.text) {
          parts.push({ text: turn.text });
        }
        if (parts.length > 0) {
          contents.push({
            role: turn.role === "model" ? "model" : "user",
            parts
          });
        }
      }
    }
    const currentParts = [];
    if (image && image.data) {
      currentParts.push({
        inlineData: {
          mimeType: image.mimeType || "image/jpeg",
          data: image.data.replace(/^data:[^;]+;base64,/, "")
        }
      });
    }
    const promptText = message?.trim() || (image ? "\u0645\u0646 \u0641\u0636\u0644\u0643 \u0642\u0645 \u0628\u0642\u0631\u0627\u0621\u0629 \u0648\u062A\u062D\u0644\u064A\u0644 \u0647\u0630\u0647 \u0627\u0644\u0635\u0648\u0631\u0629 \u0648\u0627\u0633\u062A\u062E\u0631\u062C \u0643\u0627\u0641\u0629 \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0644\u0627\u0639\u0628\u064A\u0646 \u0648\u0623\u0631\u0642\u0627\u0645 \u0642\u064A\u062F\u0647\u0645 \u0648\u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u0641\u0627\u0646\u0644\u0627\u062A \u0648\u0627\u0633\u0645 \u0627\u0644\u0641\u0631\u064A\u0642 \u0644\u0625\u0636\u0627\u0641\u062A\u0647\u0645 \u0645\u0628\u0627\u0634\u0631\u0629 \u0644\u0642\u0648\u0627\u0626\u0645 \u062F\u0648\u0631\u064A \u062C\u0627\u0645\u0639\u0629 \u0627\u0644\u0646\u064A\u0644." : "\u0645\u0631\u062D\u0628\u0627\u064B\u060C \u0643\u064A\u0641 \u064A\u0645\u0643\u0646\u0643 \u0645\u0633\u0627\u0639\u062F\u062A\u064A \u0641\u064A \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0628\u0637\u0648\u0644\u0629\u061F");
    currentParts.push({ text: promptText });
    contents.push({
      role: "user",
      parts: currentParts
    });
    const candidateModels = Array.from(/* @__PURE__ */ new Set([
      selectedModel,
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-flash-lite-latest"
    ]));
    let response = null;
    let lastError = null;
    for (const modelToTry of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelToTry,
          contents,
          config: {
            systemInstruction,
            temperature: 0.25
          }
        });
        if (response && response.text) {
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelToTry} attempt failed, trying next candidate...`, err?.message || err);
      }
    }
    if (!response && lastError) {
      throw lastError;
    }
    const reply = response?.text || "";
    let extractedPayload = null;
    const jsonMatch = reply.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        extractedPayload = JSON.parse(jsonMatch[1]);
      } catch (err) {
        console.warn("Could not parse JSON block from Gemini output:", err);
      }
    }
    res.json({
      success: true,
      reply,
      extractedPayload
    });
  } catch (error) {
    console.error("Error in /api/gemini/chat:", error);
    let errorDetail = error?.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0645\u0639\u0627\u0644\u062C\u0629 \u0637\u0644\u0628 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A";
    try {
      if (typeof errorDetail === "string" && errorDetail.includes("{")) {
        const jsonStart = errorDetail.indexOf("{");
        const parsed = JSON.parse(errorDetail.slice(jsonStart));
        if (parsed?.error?.message) {
          errorDetail = parsed.error.message;
        } else if (parsed?.message) {
          errorDetail = parsed.message;
        }
      }
    } catch (_) {
    }
    res.status(500).json({
      success: false,
      error: errorDetail,
      reply: "\u0639\u0630\u0631\u0627\u064B\u060C \u062D\u062F\u062B \u0636\u063A\u0637 \u0645\u0624\u0642\u062A \u0641\u064A \u062E\u062F\u0645\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0623\u062B\u0646\u0627\u0621 \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0635\u0648\u0631\u0629. \u064A\u0631\u062C\u0649 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0627\u0644\u0622\u0646."
    });
  }
});
async function startServer() {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: HOST,
        port: PORT,
        hmr: process.env.DISABLE_HMR !== "true"
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
  app.listen(PORT, HOST, () => {
    console.log(`\u{1F3C6} Nile University Tournament Server running on http://${HOST}:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
