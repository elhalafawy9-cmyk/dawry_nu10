export interface Player {
  id: string;
  name: string;
  number: number;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  isCaptain?: boolean;
  studentId: string; // الرقم الجامعي للطالب في جامعة النيل
  isIdentityLocked?: boolean; // مقفل ومحمي - لا يمكن تعديل الاسم أو الـ ID بعد إدخاله
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

// Generate default squad for 48 teams
export function generateInitialSquads(teamNames: string[]): Record<string, Player[]> {
  const commonFirstNames = [
    'أحمد', 'محمد', 'علي', 'عمر', 'كريم', 'يوسف', 'محمود', 'إبراهيم', 
    'حسن', 'طارق', 'زياد', 'خالد', 'سامر', 'حازم', 'مصطفى', 'ياسين'
  ];
  const commonLastNames = [
    'صلاح', 'رمضان', 'سعيد', 'الشناوي', 'مرموش', 'حجازي', 'عاشور', 
    'فتحي', 'إمام', 'شريف', 'حمدي', 'سليمان', 'نجيب', 'زكي', 'سالم'
  ];

  const squads: Record<string, Player[]> = {};

  teamNames.forEach((teamName, tIdx) => {
    const players: Player[] = [];
    const positions: ('GK' | 'DEF' | 'DEF' | 'MID' | 'MID' | 'FWD' | 'FWD' | 'MID' | 'DEF')[] = [
      'GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD', 'FWD', 'MID', 'DEF'
    ];

    for (let i = 0; i < 9; i++) {
      const fName = commonFirstNames[(tIdx * 3 + i) % commonFirstNames.length];
      const lName = commonLastNames[(tIdx * 2 + i * 3) % commonLastNames.length];
      const name = `${fName} ${lName}`;
      const year = 2021 + ((tIdx + i) % 4);
      const seq = 1000 + (tIdx * 9) + i;
      const studentId = `${year}${seq}`;
      
      players.push({
        id: `p_${tIdx}_${i + 1}`,
        name,
        number: i === 0 ? 1 : i === 5 ? 10 : i === 6 ? 9 : i === 3 ? 8 : i + 2,
        position: positions[i] || 'MID',
        isCaptain: i === 3,
        studentId,
        isIdentityLocked: true, // محمي ومقفل
      });
    }

    squads[teamName] = players;
  });

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
  editReason?: string; // سبب طلب التعديل (مثل: تصحيح خطأ بالاسم، تحديث الرقم الجامعي، تغيير رقم القميص)
  originalPlayer?: {
    name: string;
    studentId: string;
    number: number;
    position: 'GK' | 'DEF' | 'MID' | 'FWD';
    isCaptain?: boolean;
  };
  requestedBy: string; // اسم مسؤول الفريق
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export const INITIAL_PLAYER_REQUESTS: PlayerRegistrationRequest[] = [
  {
    id: 'req_seed_1',
    type: 'add',
    teamName: 'برشلونة',
    playerName: 'عمر الفاروق عبد الرحمن',
    playerNumber: 14,
    playerPosition: 'MID',
    isCaptain: false,
    studentId: '20230812',
    department: 'كلية الهندسة',
    requestedBy: 'كابتن محمود رضا (مسؤول برشلونة)',
    requestedAt: '2026-10-09 14:30',
    status: 'pending',
  },
  {
    id: 'req_seed_2',
    type: 'add',
    teamName: 'الاهلي',
    playerName: 'عبد الله خالد السعيد',
    playerNumber: 22,
    playerPosition: 'FWD',
    isCaptain: false,
    studentId: '20220944',
    department: 'كلية علوم الحاسب',
    requestedBy: 'طارق حسام الدين (مسؤول الاهلي)',
    requestedAt: '2026-10-09 16:15',
    status: 'pending',
  },
  {
    id: 'req_seed_3',
    type: 'edit',
    playerId: 'p_0_1',
    teamName: 'برشلونة',
    playerName: 'أحمد صلاح الدين', // تصحيح الاسم
    playerNumber: 10,
    playerPosition: 'FWD',
    isCaptain: true,
    studentId: '20211000',
    department: 'كلية إدارة الأعمال',
    editReason: 'تصحيح الاسم الثلاثي الرسمي للطالب حسب الكارنيه الجامعي وتغيير المركز إلى هجوم FWD',
    originalPlayer: {
      name: 'أحمد صلاح',
      studentId: '20211000',
      number: 1,
      position: 'GK',
      isCaptain: false,
    },
    requestedBy: 'كابتن محمود رضا (مسؤول برشلونة)',
    requestedAt: '2026-10-10 09:40',
    status: 'pending',
  },
];

const PLAYER_REQUESTS_KEY = 'dawry_player_requests_v1';

export function loadStoredPlayerRequests(): PlayerRegistrationRequest[] {
  try {
    const raw = localStorage.getItem(PLAYER_REQUESTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
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

