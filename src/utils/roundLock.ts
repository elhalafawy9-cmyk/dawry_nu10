import { Match } from '../App';

/**
 * Parses match date and time string into a valid JavaScript Date object
 */
export function parseMatchKickoff(dateStr?: string, timeStr?: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;

  try {
    let hour = 18;
    let minute = 0;

    if (timeStr && timeStr.trim()) {
      const isPM = timeStr.includes('م') || timeStr.toLowerCase().includes('pm');
      const isAM = timeStr.includes('ص') || timeStr.toLowerCase().includes('am');
      const cleaned = timeStr.replace(/[^\d:]/g, '').trim();
      const parts = cleaned.split(':');
      if (parts.length >= 2) {
        let h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h) && !isNaN(m)) {
          if (isPM && h < 12) h += 12;
          if (isAM && h === 12) h = 0;
          hour = h;
          minute = m;
        }
      }
    }

    const kickoff = new Date(dateStr.trim());
    kickoff.setHours(hour, minute, 0, 0);

    if (isNaN(kickoff.getTime())) return null;
    return kickoff;
  } catch {
    return null;
  }
}

/**
 * Checks whether an individual match has kicked off / started or finished
 */
export function isMatchStarted(match: Match): boolean {
  if (match.status === 'live' || match.status === 'finished') {
    return true;
  }

  if (match.date) {
    const kickoff = parseMatchKickoff(match.date, match.time);
    if (kickoff) {
      const now = new Date();
      if (now.getTime() >= kickoff.getTime()) {
        return true;
      }
    }
  }

  return false;
}

export interface RoundLockStatus {
  currentRound: number;
  roundName: string;
  hasStarted: boolean; // True once the earliest kickoff arrives or any match is live/finished
  isLocked: boolean; // True when modifications must be blocked
  isCompleted: boolean; // True when all matches of the round are finished
  lockReason: string;
  deadlineNotice: string;
  earliestMatch: Match | null;
  earliestKickoff: Date | null;
  finishedMatchesCount: number;
  totalMatchesCount: number;
}

/**
 * Determines whether the active round of the tournament has started
 * and whether modifications (Fantasy squads, transfers, lineups) are locked.
 */
export function getRoundLockStatus(matches: Match[], customRound?: number): RoundLockStatus {
  if (!matches || matches.length === 0) {
    return {
      currentRound: 1,
      roundName: 'الجولة 1',
      hasStarted: false,
      isLocked: false,
      isCompleted: false,
      lockReason: '',
      deadlineNotice: 'لا توجد مباريات مجدولة حالياً',
      earliestMatch: null,
      earliestKickoff: null,
      finishedMatchesCount: 0,
      totalMatchesCount: 0,
    };
  }

  // 1. Identify all distinct rounds present in the tournament
  const groupMatches = matches.filter(m => m.stage === 'group');
  
  // Find the active round: the lowest round number where not all matches are finished
  let targetRound = customRound;
  if (!targetRound) {
    const roundsList = [1, 2, 3, 4, 5];
    for (const r of roundsList) {
      const rMatches = groupMatches.filter(m => (m.round || 1) === r);
      if (rMatches.length > 0) {
        const allFinished = rMatches.every(m => m.status === 'finished');
        if (!allFinished) {
          targetRound = r;
          break;
        }
      }
    }
    // If all group rounds finished, check knockout or fallback to round 5
    if (!targetRound) {
      targetRound = 1;
    }
  }

  // Matches for this round
  const roundMatches = groupMatches.filter(m => (m.round || 1) === targetRound);
  const totalMatchesCount = roundMatches.length;
  const finishedMatchesCount = roundMatches.filter(m => m.status === 'finished').length;
  const liveMatchesCount = roundMatches.filter(m => m.status === 'live').length;
  const isCompleted = totalMatchesCount > 0 && finishedMatchesCount === totalMatchesCount;

  // Find the earliest scheduled kickoff in this round
  let earliestMatch: Match | null = null;
  let earliestKickoff: Date | null = null;

  for (const m of roundMatches) {
    if (m.date) {
      const k = parseMatchKickoff(m.date, m.time);
      if (k) {
        if (!earliestKickoff || k.getTime() < earliestKickoff.getTime()) {
          earliestKickoff = k;
          earliestMatch = m;
        }
      }
    }
  }

  const now = new Date();
  const pastEarliestKickoff = earliestKickoff ? now.getTime() >= earliestKickoff.getTime() : false;

  // The round has started if:
  // 1. Any match in this round is currently live
  // 2. OR any match in this round has already finished
  // 3. OR the earliest match's kickoff time has passed
  const hasStarted = liveMatchesCount > 0 || finishedMatchesCount > 0 || pastEarliestKickoff;
  const isLocked = hasStarted;

  let roundName = `الجولة ${targetRound}`;
  let lockReason = '';
  let deadlineNotice = '';

  if (isCompleted) {
    lockReason = `انتهت جميع مباريات ${roundName} بنجاح واعتُمدت نتائجها.`;
    deadlineNotice = `اكتملت مباريات ${roundName}.`;
  } else if (hasStarted) {
    if (liveMatchesCount > 0) {
      lockReason = `انطلقت مباريات ${roundName} وهي جارية الآن على أرض الملعب!`;
    } else if (finishedMatchesCount > 0) {
      lockReason = `بدأت ${roundName} ولُعبت بعض مبارياتها بالفعل.`;
    } else {
      lockReason = `حلّ موعد انطلاق أولى مباريات ${roundName} (${earliestMatch?.time || earliestMatch?.date || ''}).`;
    }
    deadlineNotice = `🔒 بدأت الجولة! التشكيلة والانتقالات مقفلة رسمياً ولن يُسمح بأي تعديل حتى نهاية الجولة.`;
  } else {
    if (earliestKickoff && earliestMatch) {
      const timeLabel = earliestMatch.time || '';
      const dateLabel = earliestMatch.date || '';
      deadlineNotice = `🟢 التعديل متاح للجولة حتى موعد انطلاق أول مباراة: ${dateLabel} ${timeLabel} (الموعد النهائي / Deadline)`;
    } else {
      deadlineNotice = `🟢 التعديل متاح حتى تحديد موعد انطلاق أولى مباريات ${roundName}.`;
    }
  }

  return {
    currentRound: targetRound,
    roundName,
    hasStarted,
    isLocked,
    isCompleted,
    lockReason,
    deadlineNotice,
    earliestMatch,
    earliestKickoff,
    finishedMatchesCount,
    totalMatchesCount,
  };
}
