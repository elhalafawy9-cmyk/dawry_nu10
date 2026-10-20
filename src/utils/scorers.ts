import { Match, Team } from '../App';

export interface ScoredGoalDetail {
  matchId: string;
  stageName: string;
  team: string;
  opponent: string;
  matchScore: string;
  goalsCount: number;
  minuteDetails?: string;
  rawNote: string;
  date?: string;
}

export interface PlayerScorer {
  name: string;
  normalizedName: string;
  team: string;
  teamLogoColor?: string;
  totalGoals: number;
  matchesPlayedWithGoals: number;
  stages: string[];
  goalsBreakdown: ScoredGoalDetail[];
}

export interface AssistDetail {
  matchId: string;
  stageName: string;
  team: string;
  opponent: string;
  assistsCount: number;
  rawNote: string;
  date?: string;
}

export interface PlayerPlaymaker {
  name: string;
  normalizedName: string;
  team: string;
  teamLogoColor?: string;
  totalAssists: number;
  matchesPlayedWithAssists: number;
  stages: string[];
  assistsBreakdown: AssistDetail[];
}

export interface PlayerContribution {
  name: string;
  normalizedName: string;
  team: string;
  teamLogoColor?: string;
  totalGoals: number;
  totalAssists: number;
  totalContributions: number; // Goals + Assists
}

export interface MatchScorerItem {
  id: string;
  playerName: string;
  goals: number;
}

export interface MatchAssistItem {
  id: string;
  playerName: string;
  assists: number;
}

/**
 * Formats a team's scorers and assists into standard Arabic text
 */
export function formatTeamEventsSummary(
  teamName: string,
  scorers: { playerName: string; goals: number }[],
  assists: { playerName: string; assists: number }[]
): string {
  const parts: string[] = [];

  scorers.forEach(s => {
    const name = s.playerName.trim();
    if (!name) return;
    const g = Number(s.goals) || 1;
    if (g === 1) parts.push(`${name} (1)`);
    else if (g === 2) parts.push(`${name} (هدفين)`);
    else if (g === 3) parts.push(`${name} (هاتريك)`);
    else parts.push(`${name} (${g} أهداف)`);
  });

  assists.forEach(a => {
    const name = a.playerName.trim();
    if (!name) return;
    const count = Number(a.assists) || 1;
    if (count === 1) parts.push(`${name} (أسيست)`);
    else if (count === 2) parts.push(`${name} (2 أسيست)`);
    else if (count === 3) parts.push(`${name} (3 أسيست)`);
    else parts.push(`${name} (${count} أسيست)`);
  });

  if (parts.length === 0) return '';
  return `${teamName}: ${parts.join('، ')}`;
}

/**
 * Builds the complete match scorers & assists summary for both teams
 */
export function buildMatchScorersSummary(
  teamA: string,
  scorersA: { playerName: string; goals: number }[],
  assistsA: { playerName: string; assists: number }[],
  teamB: string,
  scorersB: { playerName: string; goals: number }[],
  assistsB: { playerName: string; assists: number }[],
  additionalNotes?: string
): string {
  const lineA = formatTeamEventsSummary(teamA, scorersA, assistsA);
  const lineB = formatTeamEventsSummary(teamB, scorersB, assistsB);

  const lines: string[] = [];
  if (lineA) lines.push(lineA);
  if (lineB) lines.push(lineB);

  const cleanNotes = additionalNotes?.trim();
  if (cleanNotes) {
    lines.push(cleanNotes);
  }

  return lines.join('\n');
}

/**
 * Normalizes Arabic string for fuzzy matching (alefs, teh marbuta, etc.)
 */
export function normalizeArabicName(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '') // Remove tashkeel/diacritics
    .replace(/\s+/g, ' ');
}

/**
 * Parses scorer text from a single match and returns player goal counts.
 */
export function parseMatchScorers(
  summaryText: string,
  teamA: string,
  teamB: string
): { playerName: string; team: string; count: number; details?: string }[] {
  if (!summaryText || !summaryText.trim()) return [];

  const results: { playerName: string; team: string; count: number; details?: string }[] = [];
  const teamBlocks = splitByTeams(summaryText, teamA, teamB);

  for (const block of teamBlocks) {
    const defaultTeam = block.teamName || '';
    const textToParse = block.content;

    const rawSegments = textToParse
      .split(/[\n,،;؛\-\—•]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const seg of rawSegments) {
      if (/^(الأهداف|اهداف|مسجلو الأهداف|أهداف|المسجلون|نتيجة|ملاحظات|goals|scorers):?$/i.test(seg)) {
        continue;
      }
      if (seg === teamA || seg === teamB) {
        continue;
      }

      const parsed = extractPlayerAndGoals(seg, defaultTeam || teamA);
      if (parsed) {
        results.push(parsed);
      }
    }
  }

  return results;
}

/**
 * Parses assists text from match notes (e.g. "ميسي (2 أسيست)، بيدري (صناعة)")
 */
export function parseMatchAssists(
  summaryText: string,
  teamA: string,
  teamB: string
): { playerName: string; team: string; count: number }[] {
  if (!summaryText || !summaryText.trim()) return [];

  const results: { playerName: string; team: string; count: number }[] = [];
  const teamBlocks = splitByTeams(summaryText, teamA, teamB);

  for (const block of teamBlocks) {
    const defaultTeam = block.teamName || '';
    const textToParse = block.content;

    const rawSegments = textToParse
      .split(/[\n,،;؛\-\—•]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const seg of rawSegments) {
      if (seg === teamA || seg === teamB) continue;

      let count = 0;
      let text = seg;

      // Check if this segment represents an assist/playmaking
      if (/(أسيست|اسيست|صناعة|صنع|تمريرة حاسمة|assists?)/i.test(text)) {
        if (/(2\s*أسيست|2\s*اسيست|صناعتين|2\s*assists?)/i.test(text)) {
          count = 2;
        } else if (/(3\s*أسيست|3\s*اسيست|3\s*assists?)/i.test(text)) {
          count = 3;
        } else {
          // extract number if (2) or (3) or default 1
          const numMatch = text.match(/\(([0-9]+)\)/);
          count = numMatch ? parseInt(numMatch[1], 10) : 1;
        }

        // Clean out assist keywords
        text = text
          .replace(/\(([^)]+)\)/g, '')
          .replace(/(أسيست|اسيست|صناعة|صنع|تمريرة حاسمة|assists?)/gi, '')
          .replace(/[⚽🥅🥇⭐\[\]\{\}:：]/g, '')
          .trim();

        if (text.length >= 2) {
          results.push({
            playerName: text,
            team: defaultTeam || teamA,
            count: Math.max(1, count),
          });
        }
      }
    }
  }

  return results;
}

/**
 * Splits text into blocks if team prefixes are detected (e.g., "الأهلي: ... الزمالك: ...")
 */
function splitByTeams(
  text: string,
  teamA: string,
  teamB: string
): { teamName?: string; content: string }[] {
  const regexA = new RegExp(`(^|[\\n\\|\\-])\\s*${escapeRegExp(teamA)}\\s*[:：]`, 'i');
  const regexB = new RegExp(`(^|[\\n\\|\\-])\\s*${escapeRegExp(teamB)}\\s*[:：]`, 'i');

  if (regexA.test(text) || regexB.test(text)) {
    const blocks: { teamName?: string; content: string }[] = [];
    const normalizedText = text.replace(
      new RegExp(`\\s+[\\-\\—\\|]\\s*(?=${escapeRegExp(teamA)}|${escapeRegExp(teamB)})`, 'gi'),
      '\n'
    );
    const lines = normalizedText.split('\n');
    let currentTeam = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const matchA = line.match(new RegExp(`^\\s*${escapeRegExp(teamA)}\\s*[:：]\\s*(.*)$`, 'i'));
      const matchB = line.match(new RegExp(`^\\s*${escapeRegExp(teamB)}\\s*[:：]\\s*(.*)$`, 'i'));

      if (matchA) {
        if (currentContent.length > 0) {
          blocks.push({ teamName: currentTeam, content: currentContent.join(' ') });
        }
        currentTeam = teamA;
        currentContent = [matchA[1]];
      } else if (matchB) {
        if (currentContent.length > 0) {
          blocks.push({ teamName: currentTeam, content: currentContent.join(' ') });
        }
        currentTeam = teamB;
        currentContent = [matchB[1]];
      } else {
        currentContent.push(line);
      }
    }

    if (currentContent.length > 0) {
      blocks.push({ teamName: currentTeam, content: currentContent.join(' ') });
    }

    if (blocks.length > 0) return blocks;
  }

  return [{ content: text }];
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parses a single item segment like "محمد صلاح (2)" or "أحمد (د15، د88)" or "علي: 3"
 */
function extractPlayerAndGoals(
  segment: string,
  defaultTeam: string
): { playerName: string; team: string; count: number; details?: string } | null {
  let text = segment.trim();
  if (!text) return null;

  text = text.replace(/^[0-9]+[\.\-\)\s]+/, '').trim();

  let count = 1;
  let details = '';

  if (/(سوبر\s*هاتريك|4\s*أهداف|4\s*اهداف)/i.test(text)) {
    count = 4;
    text = text.replace(/(سوبر\s*هاتريك|4\s*أهداف|4\s*اهداف)/gi, '');
  } else if (/(هاتريك|3\s*أهداف|3\s*اهداف|3\s*goals)/i.test(text)) {
    count = 3;
    text = text.replace(/(هاتريك|3\s*أهداف|3\s*اهداف|3\s*goals)/gi, '');
  } else if (/(هدفين|هدفان|2\s*أهداف|2\s*اهداف|2\s*goals)/i.test(text)) {
    count = 2;
    text = text.replace(/(هدفين|هدفان|2\s*أهداف|2\s*اهداف|2\s*goals)/gi, '');
  } else if (/(هدف\s*واحد|1\s*هدف|1\s*goal)/i.test(text)) {
    count = 1;
    text = text.replace(/(هدف\s*واحد|1\s*هدف|1\s*goal)/gi, '');
  }

  const parenMatch = text.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const insideParen = parenMatch[1].trim();
    details = insideParen;

    const numOnlyMatch = insideParen.match(/^([0-9]+)\s*(?:أهداف|اهداف|goals|g)?$/i);
    if (numOnlyMatch) {
      count = parseInt(numOnlyMatch[1], 10);
    } else {
      const minutesFound = insideParen.match(/(?:د\s*|\b)[0-9]{1,3}(?:'|’|\s*د)?/g);
      if (minutesFound && minutesFound.length > 0) {
        count = minutesFound.length;
      }
    }

    text = text.replace(/\([^)]+\)/, ' ').trim();
  }

  const colonNumMatch = text.match(/[:：]\s*([0-9]+)\s*$/);
  if (colonNumMatch) {
    count = parseInt(colonNumMatch[1], 10);
    text = text.replace(/[:：]\s*[0-9]+\s*$/, '').trim();
  }

  const multiplierMatch = text.match(/(?:x|×)\s*([0-9]+)\s*$/i);
  if (multiplierMatch) {
    count = parseInt(multiplierMatch[1], 10);
    text = text.replace(/(?:x|×)\s*[0-9]+\s*$/i, '').trim();
  }

  let playerName = text
    .replace(/[⚽🥅🥇⭐\(\)\[\]\{\}:：]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (playerName.length < 2 || /^(دقيقة|هدف|أهداف|goal|goals|ft|د\d+)$/i.test(playerName)) {
    return null;
  }

  return {
    playerName,
    team: defaultTeam,
    count: Math.max(1, count),
    details: details || undefined,
  };
}

/**
 * Aggregates all statistics: Scorers, Playmakers, and Combined Contributors.
 */
export function calculateTournamentStatsLeaders(
  matches: Match[],
  teams: Team[]
): {
  scorers: PlayerScorer[];
  playmakers: PlayerPlaymaker[];
  contributors: PlayerContribution[];
  totalTournamentGoals: number;
  totalTournamentAssists: number;
  totalMatchesWithScorers: number;
} {
  const scorerMap = new Map<string, PlayerScorer>();
  const playmakerMap = new Map<string, PlayerPlaymaker>();
  let totalTournamentGoals = 0;
  let totalTournamentAssists = 0;
  let matchesWithScorersCount = 0;

  // Count total goals across all recorded matches
  let totalMatchScoresGoals = 0;
  matches.forEach(m => {
    if (m.scoreA !== null && m.scoreA !== undefined) totalMatchScoresGoals += Math.max(0, Number(m.scoreA));
    if (m.scoreB !== null && m.scoreB !== undefined) totalMatchScoresGoals += Math.max(0, Number(m.scoreB));
  });

  const teamColorMap = new Map<string, string>();
  teams.forEach(t => teamColorMap.set(t.name, t.logoColor));

  matches.forEach(m => {
    const rawNote = m.scorersSummary || '';
    if (!rawNote.trim()) return;

    matchesWithScorersCount++;
    const parsedScorers = parseMatchScorers(rawNote, m.teamA, m.teamB);
    const parsedAssists = parseMatchAssists(rawNote, m.teamA, m.teamB);

    const scoreDisplay =
      m.scoreA !== null && m.scoreB !== null ? `${m.scoreA} - ${m.scoreB}` : 'جارية';

    // 1. Process Scorers
    parsedScorers.forEach(sc => {
      const normKey = normalizeArabicName(sc.playerName);
      totalTournamentGoals += sc.count;

      const detail: ScoredGoalDetail = {
        matchId: m.id,
        stageName: m.stage === 'group' ? `المجموعة ${m.group || ''} (الجولة ${m.round || 1})` : m.stageName,
        team: sc.team || m.teamA,
        opponent: sc.team === m.teamA ? m.teamB : m.teamA,
        matchScore: scoreDisplay,
        goalsCount: sc.count,
        minuteDetails: sc.details,
        rawNote,
        date: m.date || 'غير محدد',
      };

      if (!scorerMap.has(normKey)) {
        scorerMap.set(normKey, {
          name: sc.playerName,
          normalizedName: normKey,
          team: sc.team || m.teamA,
          teamLogoColor: teamColorMap.get(sc.team || m.teamA) || 'from-emerald-600 to-teal-500',
          totalGoals: sc.count,
          matchesPlayedWithGoals: 1,
          stages: [m.stageName],
          goalsBreakdown: [detail],
        });
      } else {
        const existing = scorerMap.get(normKey)!;
        existing.totalGoals += sc.count;
        existing.matchesPlayedWithGoals += 1;
        if (!existing.stages.includes(m.stageName)) existing.stages.push(m.stageName);
        existing.goalsBreakdown.push(detail);
      }
    });

    // 2. Process Playmakers / Assists
    parsedAssists.forEach(as => {
      const normKey = normalizeArabicName(as.playerName);
      totalTournamentAssists += as.count;

      const detail: AssistDetail = {
        matchId: m.id,
        stageName: m.stage === 'group' ? `المجموعة ${m.group || ''} (الجولة ${m.round || 1})` : m.stageName,
        team: as.team || m.teamA,
        opponent: as.team === m.teamA ? m.teamB : m.teamA,
        assistsCount: as.count,
        rawNote,
        date: m.date || 'غير محدد',
      };

      if (!playmakerMap.has(normKey)) {
        playmakerMap.set(normKey, {
          name: as.playerName,
          normalizedName: normKey,
          team: as.team || m.teamA,
          teamLogoColor: teamColorMap.get(as.team || m.teamA) || 'from-teal-600 to-cyan-500',
          totalAssists: as.count,
          matchesPlayedWithAssists: 1,
          stages: [m.stageName],
          assistsBreakdown: [detail],
        });
      } else {
        const existing = playmakerMap.get(normKey)!;
        existing.totalAssists += as.count;
        existing.matchesPlayedWithAssists += 1;
        if (!existing.stages.includes(m.stageName)) existing.stages.push(m.stageName);
        existing.assistsBreakdown.push(detail);
      }
    });
  });

  const sortedScorers = Array.from(scorerMap.values()).sort((a, b) => {
    if (b.totalGoals !== a.totalGoals) return b.totalGoals - a.totalGoals;
    return a.matchesPlayedWithGoals - b.matchesPlayedWithGoals;
  });

  const sortedPlaymakers = Array.from(playmakerMap.values()).sort((a, b) => {
    if (b.totalAssists !== a.totalAssists) return b.totalAssists - a.totalAssists;
    return a.matchesPlayedWithAssists - b.matchesPlayedWithAssists;
  });

  // 3. Combined Contributors (Goals + Assists)
  const allPlayerKeys = new Set([...scorerMap.keys(), ...playmakerMap.keys()]);
  const contributors: PlayerContribution[] = [];

  allPlayerKeys.forEach(key => {
    const s = scorerMap.get(key);
    const p = playmakerMap.get(key);
    const name = s ? s.name : p!.name;
    const team = s ? s.team : p!.team;
    const goals = s ? s.totalGoals : 0;
    const assists = p ? p.totalAssists : 0;
    const total = goals + assists;

    contributors.push({
      name,
      normalizedName: key,
      team,
      teamLogoColor: teamColorMap.get(team) || 'from-amber-500 to-emerald-500',
      totalGoals: goals,
      totalAssists: assists,
      totalContributions: total,
    });
  });

  contributors.sort((a, b) => {
    if (b.totalContributions !== a.totalContributions) return b.totalContributions - a.totalContributions;
    if (b.totalGoals !== a.totalGoals) return b.totalGoals - a.totalGoals;
    return b.totalAssists - a.totalAssists;
  });

  return {
    scorers: sortedScorers,
    playmakers: sortedPlaymakers,
    contributors,
    totalTournamentGoals: Math.max(totalTournamentGoals, totalMatchScoresGoals),
    totalTournamentAssists,
    totalMatchesWithScorers: matchesWithScorersCount,
  };
}

// Backward-compatible export
export function calculateTournamentTopScorers(matches: Match[], teams: Team[]) {
  const stats = calculateTournamentStatsLeaders(matches, teams);
  return {
    scorers: stats.scorers,
    totalTournamentGoals: stats.totalTournamentGoals,
    totalMatchesWithScorers: stats.totalMatchesWithScorers,
  };
}
