export interface Player {
  id: string;
  name: string;
  number: number;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  isCaptain?: boolean;
  studentId: string; // الرقم الجامعي للطالب في جامعة النيل
  isIdentityLocked?: boolean; // مقفل ومحمي - لا يمكن تعديل الاسم أو الـ ID بعد إدخاله
  photoUrl?: string; // رابط أو صورة اللاعب الرسمية
}

export const MAX_SUBS_PER_TEAM = 5;

export interface MatchSubstitution {
  id: string;
  minute: number;
  playerOut: string; // اللاعب الخارج (الذي تم استبداله)
  playerIn: string;  // اللاعب البديل (الذي دخل الملعب)
  team: string;
}

export type CardType = 'yellow' | 'red' | 'second_yellow';

export interface MatchCardEvent {
  id: string;
  minute: number;
  playerName: string;
  team: string;
  cardType: CardType; // إنذار أصفر | طرد أحمر مباشر | إنذار ثانٍ ثم طرد
  reason?: string;    // سبب اختياري (مثل: تدخل عنيف، اعتراض، لمس يد)
}

export interface MatchSheet {
  matchId: string;
  teamAStarters: string[]; // مين لعب أساسي
  teamABench: string[];    // مين ملعبش / احتياط
  teamBStarters: string[];
  teamBBench: string[];
  substitutions: MatchSubstitution[]; // التبديلات (بحد أقصى 5 لكل فريق)
  cards?: MatchCardEvent[]; // الإنذارات والكروت الحمراء (الطرود)
}

// Official real squad for Team "باريس" (PSG) based on the official Nile University registration sheet
export const PARIS_OFFICIAL_ROSTER: Player[] = [
  {
    id: 'p_paris_1',
    name: 's. mohamed (س. محمد)',
    number: 1,
    position: 'GK',
    studentId: '241000442',
    isCaptain: true,
    isIdentityLocked: true,
  },
  {
    id: 'p_paris_2',
    name: 'andrew ashraf (أندرو أشرف)',
    number: 2,
    position: 'DEF',
    studentId: '241002028',
    isCaptain: false,
    isIdentityLocked: true,
  },
  {
    id: 'p_paris_3',
    name: 'ahmed samir (أحمد سمير)',
    number: 3,
    position: 'DEF',
    studentId: '241001376',
    isCaptain: false,
    isIdentityLocked: true,
  },
  {
    id: 'p_paris_4',
    name: 'mohamed amer (محمد عامر)',
    number: 4,
    position: 'DEF',
    studentId: '241002229',
    isCaptain: false,
    isIdentityLocked: true,
  },
  {
    id: 'p_paris_5',
    name: 'mohamed galal (محمد جلال)',
    number: 5,
    position: 'MID',
    studentId: '231001145',
    isCaptain: false,
    isIdentityLocked: true,
  },
  {
    id: 'p_paris_6',
    name: 'youssef zaghloul (يوسف زغلول)',
    number: 6,
    position: 'MID',
    studentId: '221001650',
    isCaptain: false,
    isIdentityLocked: true,
  },
  {
    id: 'p_paris_7',
    name: 'saifelden mahmoud (سيف الدين محمود)',
    number: 7,
    position: 'MID',
    studentId: '241001341',
    isCaptain: false,
    isIdentityLocked: true,
  },
  {
    id: 'p_paris_8',
    name: 'abdelrahman emad (عبد الرحمن عماد)',
    number: 8,
    position: 'FWD',
    studentId: '241001687',
    isCaptain: false,
    isIdentityLocked: true,
  },
  {
    id: 'p_paris_9',
    name: 'ziad Eissa (زياد عيسى)',
    number: 9,
    position: 'FWD',
    studentId: '241001897',
    isCaptain: false,
    isIdentityLocked: true,
  },
  {
    id: 'p_paris_10',
    name: 'moataz hany (معتز هاني)',
    number: 10,
    position: 'FWD',
    studentId: '221001683',
    isCaptain: false,
    isIdentityLocked: true,
  },
];

// Generate empty squads for all teams so admin can add real players cleanly
export function generateInitialSquads(teamNames: string[]): Record<string, Player[]> {
  const squads: Record<string, Player[]> = {};
  teamNames.forEach((teamName) => {
    squads[teamName] = [];
  });
  return squads;
}

// Clear all players from all teams
export function clearAllSquads(teamNames: string[]): Record<string, Player[]> {
  const squads: Record<string, Player[]> = {};
  teamNames.forEach((teamName) => {
    squads[teamName] = [];
  });
  saveStoredSquads(squads);
  return squads;
}

export type PlayerRequestType = 'add' | 'edit';

export interface PlayerRegistrationRequest {
  id: string;
  type?: PlayerRequestType; // 'add' (طلب قيد لاعب جديد) | 'edit' (طلب تعديل بيانات لاعب معتمد ومقفل)
  playerId?: string; // معرّف اللاعب المطلوب تعديله في حال كان طلب تعديل
  teamName: string;
  playerName: string;
  playerNumber: number;
  playerPosition: 'GK' | 'DEF' | 'MID' | 'FWD';
  isCaptain?: boolean;
  studentId?: string;
  department?: string;
  photoUrl?: string; // رابط أو صورة اللاعب الرسمية
  editReason?: string; // سبب طلب التعديل (مثل: تصحيح خطأ بالاسم، تحديث الرقم الجامعي، تغيير رقم القميص)
  originalPlayer?: {
    name: string;
    studentId: string;
    number: number;
    position: 'GK' | 'DEF' | 'MID' | 'FWD';
    isCaptain?: boolean;
    photoUrl?: string;
  };
  requestedBy: string; // اسم مسؤول الفريق
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export const INITIAL_PLAYER_REQUESTS: PlayerRegistrationRequest[] = [];

const PLAYER_REQUESTS_KEY = 'dawry_player_requests_v2';

export function loadStoredPlayerRequests(): PlayerRegistrationRequest[] {
  try {
    const raw = localStorage.getItem(PLAYER_REQUESTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load player registration requests', err);
  }
  return INITIAL_PLAYER_REQUESTS;
}

export function saveStoredPlayerRequests(requests: PlayerRegistrationRequest[]): void {
  try {
    localStorage.setItem(PLAYER_REQUESTS_KEY, JSON.stringify(requests));
  } catch (err) {
    console.warn('Failed to save player registration requests', err);
  }
}

const SQUADS_STORAGE_KEY = 'dawry_squads_data_v3';

export function loadStoredSquads(defaultTeamNames: string[]): Record<string, Player[]> {
  try {
    // Clear old versions with mock data
    localStorage.removeItem('dawry_squads_data_v1');
    localStorage.removeItem('dawry_squads_data_v2');

    const raw = localStorage.getItem(SQUADS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        // Ensure every default team exists in the record as an array
        defaultTeamNames.forEach((name) => {
          if (!parsed[name]) parsed[name] = [];
        });
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load squads from storage', err);
  }
  const cleanInitial = generateInitialSquads(defaultTeamNames);
  saveStoredSquads(cleanInitial);
  return cleanInitial;
}

export function saveStoredSquads(squads: Record<string, Player[]>): void {
  try {
    localStorage.setItem(SQUADS_STORAGE_KEY, JSON.stringify(squads));
  } catch (err) {
    console.warn('Failed to save squads to storage', err);
  }
}

/**
 * Resizes and compresses an image file to a lightweight data URL (e.g. 256x256 max)
 * to prevent localStorage quota issues and ensure fast load times.
 */
export function compressImageFile(file: File, maxDimension = 300, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('الملف المختار ليس صورة'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string || '');
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('فشل قراءة الصورة'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('فشل تحميل الملف'));
    reader.readAsDataURL(file);
  });
}

// Preset avatars for players (stylized clean SVG data URLs)
export const PRESET_PLAYER_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
];

// Preset crests for teams (clean SVG / icons)
export const PRESET_TEAM_CRESTS = [
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=150&auto=format&fit=crop&q=80',
];

