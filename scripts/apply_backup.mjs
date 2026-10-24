import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const backupData = REPLACE_WITH_BACKUP;

const dataDir = path.resolve(rootDir, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const srcDataDir = path.resolve(rootDir, 'src', 'data');
if (!fs.existsSync(srcDataDir)) {
  fs.mkdirSync(srcDataDir, { recursive: true });
}

// 1. Matches
fs.writeFileSync(path.resolve(dataDir, 'matches.json'), JSON.stringify(backupData.matches, null, 2), 'utf-8');
fs.writeFileSync(path.resolve(srcDataDir, 'official_matches.json'), JSON.stringify(backupData.matches, null, 2), 'utf-8');

// 2. Teams
fs.writeFileSync(path.resolve(dataDir, 'teams.json'), JSON.stringify(backupData.teams, null, 2), 'utf-8');
fs.writeFileSync(path.resolve(srcDataDir, 'official_teams.json'), JSON.stringify(backupData.teams, null, 2), 'utf-8');

// 3. Squads
fs.writeFileSync(path.resolve(dataDir, 'squads.json'), JSON.stringify(backupData.squads, null, 2), 'utf-8');
fs.writeFileSync(path.resolve(srcDataDir, 'official_squads.json'), JSON.stringify(backupData.squads, null, 2), 'utf-8');

// 4. Users
fs.writeFileSync(path.resolve(dataDir, 'users.json'), JSON.stringify(backupData.users, null, 2), 'utf-8');

// 5. Settings
const settings = {
  isPlayerEditingOpen: true,
  isRegistrationVisibleToPublic: true,
  isRegistrationOpen: true,
  registrationDeadline: '2026-11-30',
  activeSeasonId: backupData.activeSeasonId || 'season_2026',
  currentSeasonName: backupData.currentSeasonName || 'دوري جامعة النيل 2026 - النسخة الخامسة (48 فريقاً)',
  currentAcademicYear: backupData.currentAcademicYear || '2025 / 2026',
  updatedAt: new Date().toISOString(),
  updatedBy: backupData.exportedBy || 's.mohamed2442@nu.edu.eg',
};
fs.writeFileSync(path.resolve(dataDir, 'settings.json'), JSON.stringify(settings, null, 2), 'utf-8');

// 6. Seasons
fs.writeFileSync(path.resolve(dataDir, 'seasons.json'), JSON.stringify(backupData.seasons || [], null, 2), 'utf-8');

// 7. Full verified backup archive
fs.writeFileSync(path.resolve(dataDir, 'backup_full_verified.json'), JSON.stringify(backupData, null, 2), 'utf-8');
fs.writeFileSync(path.resolve(srcDataDir, 'backup_full_verified.json'), JSON.stringify(backupData, null, 2), 'utf-8');

console.log('✅ All verified backup data written successfully!');
