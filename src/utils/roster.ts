export interface Player {
  id: string;
  name: string;
  number: number;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  isCaptain?: boolean;
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
      
      players.push({
        id: `p_${tIdx}_${i + 1}`,
        name,
        number: i === 0 ? 1 : i === 5 ? 10 : i === 6 ? 9 : i === 3 ? 8 : i + 2,
        position: positions[i] || 'MID',
        isCaptain: i === 3,
      });
    }

    squads[teamName] = players;
  });

  return squads;
}
