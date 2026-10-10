export interface AcknowledgedPlayer {
  userId: string;
  userName: string;
  teamName: string;
  acknowledgedAt: string;
}

export interface MatchScheduleNotification {
  id: string;
  matchId: string;
  teamA: string;
  teamB: string;
  targetTeams: string[]; // e.g. [teamA, teamB]
  stageName: string;
  round?: number;
  group?: string;
  date: string;   // e.g. '2026-05-10'
  time: string;   // e.g. '04:00 م'
  pitch: string;  // e.g. 'الملعب الرئيسي (A)'
  title: string;  // e.g. 'اعتماد موعد وملعب رسمي لمباراة برشلونة وفرنسا'
  message: string; // Detail description
  urgency: 'high' | 'normal';
  sentBy: string;  // Admin name
  sentAt: string;  // '2026-10-10 10:30'
  readByUserIds: string[]; // User IDs who opened/read
  acknowledgedPlayers?: AcknowledgedPlayer[]; // Players who acknowledged readiness
}

const STORAGE_KEY = 'nile_tournament_match_schedule_alerts_v1';

export const INITIAL_MATCH_ALERTS: MatchScheduleNotification[] = [
  {
    id: 'alert_seed_1',
    matchId: 'grp_a_r1_m1',
    teamA: 'برشلونة',
    teamB: 'فرنسا',
    targetTeams: ['برشلونة', 'فرنسا'],
    stageName: 'مباراة دور المجموعات - الجولة 1',
    round: 1,
    group: 'A',
    date: '2026-05-10',
    time: '04:00 م',
    pitch: 'الملعب الرئيسي (A)',
    title: '📢 اعتماد رسمي لموعد وملعب مباراة: برشلونة ضد فرنسا',
    message: 'تعلن اللجنة المنظمة لبطولة جامعة النيل عن تثبيت واعتماد موعد المباراة يوم الأحد 10 مايو 2026 الساعة 04:00 عصراً على الملعب الرئيسي (A). نؤكد على جميع لاعبي الفريقين ضرورة التواجد قبل انطلاق المباراة بنصف ساعة مع إحضار كارنيه الجامعة والالتزام بالزي الرياضي الموحد.',
    urgency: 'high',
    sentBy: 'م. س. محمد (المدير الدائم للنظام)',
    sentAt: '2026-10-09 15:00',
    readByUserIds: [],
    acknowledgedPlayers: [
      {
        userId: 'user_player_1',
        userName: 'حازم مصطفى (مهاجم)',
        teamName: 'برشلونة',
        acknowledgedAt: '2026-10-09 15:20'
      }
    ]
  },
  {
    id: 'alert_seed_2',
    matchId: 'grp_h_r1_m2',
    teamA: 'يوفنتوس',
    teamB: 'الاهلي',
    targetTeams: ['يوفنتوس', 'الاهلي'],
    stageName: 'مباراة دور المجموعات - الجولة 1',
    round: 1,
    group: 'H',
    date: '2026-05-12',
    time: '06:00 م',
    pitch: 'الملعب الرئيسي (A)',
    title: '📢 إخطار رسمي: اعتماد موعد وملعب مباراة يوفنتوس والأهلي',
    message: 'تم تحديد وتنزيل موعد مواجهة يوفنتوس والأهلي رسمياً بجدول البطولة لتقام يوم الثلاثاء 12 مايو 2026 الساعة 06:00 مساءً على أرضية الملعب الرئيسي (A). يرجى من كباتن الفريقين تجهيز القوائم المعتمدة والتأكد من حضور جميع اللاعبين في الوقت المحدد.',
    urgency: 'normal',
    sentBy: 'أحمد شريف (مشرف الأنشطة الرياضية)',
    sentAt: '2026-10-09 17:30',
    readByUserIds: ['user_player_2'],
    acknowledgedPlayers: [
      {
        userId: 'user_player_2',
        userName: 'يوسف العطار (صانع ألعاب)',
        teamName: 'الاهلي',
        acknowledgedAt: '2026-10-09 18:00'
      }
    ]
  }
];

export function loadStoredMatchAlerts(): MatchScheduleNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_MATCH_ALERTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_MATCH_ALERTS;
  } catch (e) {
    console.error('Failed to load stored match alerts', e);
    return INITIAL_MATCH_ALERTS;
  }
}

export function saveStoredMatchAlerts(alerts: MatchScheduleNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch (e) {
    console.error('Failed to save match alerts', e);
  }
}
