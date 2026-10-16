import { Player } from './roster';
import { resolveCanonicalTeamName, isSameTeam, getTeamBilingualInfo } from './teamAliases';

export interface DuplicateOccurrence {
  teamName: string;
  playerId: string;
  playerName: string;
  playerNumber: number;
  position: string;
  studentId: string;
}

export interface DuplicatePlayerReport {
  key: string; // studentId or normalized name
  type: 'same_student_id' | 'same_name' | 'both';
  studentId?: string;
  normalizedName: string;
  displayNames: string[];
  occurrences: DuplicateOccurrence[];
}

export interface TeamAuditStatus {
  name: string;
  group: string;
  playersCount: number;
  hasCaptain: boolean;
  hasGK: boolean;
  isComplete: boolean;
  missingRequirements: string[];
}

export function normalizeArabicText(str: any): string {
  if (str === null || str === undefined) return '';
  const text = typeof str === 'string' ? str : String(str);
  return text
    .trim()
    .toLowerCase()
    // Remove diacritics / tashkeel
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize alefs
    .replace(/[أإآ]/g, 'ا')
    // Normalize ta marbouta
    .replace(/ة/g, 'ه')
    // Normalize alif maqsura
    .replace(/ى/g, 'ي')
    // Remove repeated spaces
    .replace(/\s+/g, ' ');
}

/**
 * Finds all players that appear in more than one team (by Student ID or Name)
 */
export function findDuplicatePlayers(squads: Record<string, Player[]>): DuplicatePlayerReport[] {
  const duplicatesMap = new Map<string, DuplicatePlayerReport>();

  // Helper map for student IDs
  const studentIdMap = new Map<string, DuplicateOccurrence[]>();
  // Helper map for normalized names
  const nameMap = new Map<string, DuplicateOccurrence[]>();

  Object.entries(squads).forEach(([teamName, players]) => {
    if (!Array.isArray(players)) return;

    players.forEach((p) => {
      const occurrence: DuplicateOccurrence = {
        teamName,
        playerId: p.id,
        playerName: p.name,
        playerNumber: p.number,
        position: p.position,
        studentId: p.studentId || '',
      };

      const cleanId = (p.studentId || '').trim();
      if (cleanId && cleanId.length >= 4) {
        const idKey = cleanId.toLowerCase();
        if (!studentIdMap.has(idKey)) studentIdMap.set(idKey, []);
        studentIdMap.get(idKey)!.push(occurrence);
      }

      const cleanName = normalizeArabicText(p.name);
      if (cleanName && cleanName.length >= 3) {
        if (!nameMap.has(cleanName)) nameMap.set(cleanName, []);
        nameMap.get(cleanName)!.push(occurrence);
      }
    });
  });

  // Check ID duplicates across DIFFERENT teams
  studentIdMap.forEach((occs, idKey) => {
    const uniqueTeams = new Set(occs.map((o) => o.teamName));
    if (uniqueTeams.size > 1) {
      const repKey = `id_${idKey}`;
      duplicatesMap.set(repKey, {
        key: repKey,
        type: 'same_student_id',
        studentId: occs[0].studentId,
        normalizedName: normalizeArabicText(occs[0].playerName),
        displayNames: Array.from(new Set(occs.map((o) => o.playerName))),
        occurrences: occs,
      });
    }
  });

  // Check Name duplicates across DIFFERENT teams
  nameMap.forEach((occs, nKey) => {
    const uniqueTeams = new Set(occs.map((o) => o.teamName));
    if (uniqueTeams.size > 1) {
      // Check if already captured by student ID
      let existingRep: DuplicatePlayerReport | undefined;
      for (const rep of duplicatesMap.values()) {
        if (rep.occurrences.some((o) => occs.some((target) => target.playerId === o.playerId))) {
          existingRep = rep;
          break;
        }
      }

      if (existingRep) {
        existingRep.type = 'both';
      } else {
        const repKey = `name_${nKey}`;
        duplicatesMap.set(repKey, {
          key: repKey,
          type: 'same_name',
          studentId: occs.find((o) => o.studentId)?.studentId,
          normalizedName: nKey,
          displayNames: Array.from(new Set(occs.map((o) => o.playerName))),
          occurrences: occs,
        });
      }
    }
  });

  return Array.from(duplicatesMap.values());
}

/**
 * Validates a team name against a known tournament teams list
 */
export function checkTeamExistence(
  teamName: string,
  availableTeams: { name: string; group?: string }[]
): {
  exists: boolean;
  exactMatch?: { name: string; group?: string };
  closestMatches: { name: string; group?: string; score: number }[];
} {
  const canonical = resolveCanonicalTeamName(teamName);
  const normInput = normalizeArabicText(canonical || teamName);
  if (!normInput) {
    return { exists: false, closestMatches: [] };
  }

  // Exact or normalized or canonical match
  const exact = availableTeams.find((t) => {
    return (
      t.name.trim() === teamName.trim() ||
      t.name.trim() === canonical ||
      isSameTeam(t.name, teamName) ||
      normalizeArabicText(t.name) === normInput
    );
  });

  if (exact) {
    return {
      exists: true,
      exactMatch: exact,
      closestMatches: [
        {
          name: exact.name,
          group: exact.group,
          score: 1,
        },
      ],
    };
  }

  // Substring or fuzzy matching
  const scored = availableTeams.map((t) => {
    const normTarget = normalizeArabicText(t.name);
    let score = 0;
    if (normTarget === normInput) score = 1;
    else if (normTarget.includes(normInput) || normInput.includes(normTarget)) score = 0.8;
    else {
      // Shared tokens
      const inputWords = normInput.split(' ').filter(Boolean);
      const targetWords = normTarget.split(' ').filter(Boolean);
      const common = inputWords.filter((w) => targetWords.includes(w)).length;
      if (common > 0) score = 0.5 + common * 0.2;
    }
    return { name: t.name, group: t.group, score };
  });

  const candidates = scored
    .filter((s) => s.score > 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return {
    exists: false,
    closestMatches: candidates,
  };
}

export interface ParsedRosterPlayer {
  name: string;
  number: number;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  studentId: string;
  isCaptain: boolean;
  isDuplicate?: boolean;
  duplicateDetails?: string;
}

export interface ParsedRosterSheet {
  detectedTeamName: string;
  matchedTeam?: { name: string; group?: string };
  isTeamFound: boolean;
  closestTeams: { name: string; group?: string }[];
  players: ParsedRosterPlayer[];
  rawLineCount: number;
  duplicatePlayersFound: number;
}

/**
 * Intelligent parser for text copied from sheets, WhatsApp rosters, or OCR output
 */
export function parseRosterText(
  rawText: string,
  availableTeams: { name: string; group?: string }[],
  currentSquads: Record<string, Player[]>
): ParsedRosterSheet {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let detectedTeamName = '';
  const players: ParsedRosterPlayer[] = [];

  // First check if first line or headers contain a team name
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    // Strip common labels: "فريق:", "اسم الفريق:", "Team:"
    const clean = line
      .replace(/^(فريق|اسم الفريق|فرقة|Team|كشف فريق)\s*[:\-–]\s*/i, '')
      .replace(/^المجموعة\s*[A-Ha-hأ-ي]\s*[:\-–]?\s*/i, '')
      .trim();

    const check = checkTeamExistence(clean, availableTeams);
    if (check.exists || check.closestMatches.length > 0) {
      if (!detectedTeamName || check.exists) {
        detectedTeamName = clean;
      }
    }
  }

  // If no team detected from prefix, test each line
  if (!detectedTeamName && lines.length > 0) {
    const checkFirst = checkTeamExistence(lines[0], availableTeams);
    if (checkFirst.exists || checkFirst.closestMatches.length > 0) {
      detectedTeamName = lines[0];
    }
  }

  const teamCheck = checkTeamExistence(detectedTeamName || lines[0] || '', availableTeams);

  // Parse lines for player data
  let playerIdx = 0;
  lines.forEach((line) => {
    // Skip team name header line if it matched
    if (detectedTeamName && line.includes(detectedTeamName)) return;
    if (/^(كشف|اسماء|قائمة|جدول|رقم|المركز|الاسم|الرقم الجامعي)/i.test(line)) return;

    // Try extracting Student ID: 7 to 10 digits (e.g. 241000442)
    const idMatch = line.match(/\b(2\d{7,9}|\d{8,10})\b/);
    const studentId = idMatch ? idMatch[1] : '';

    // Try extracting player number: 1 or 2 digits
    let playerNumber = 0;
    const numMatch = line.match(/(?:#|رقم\s*|No\.?\s*|^)(\d{1,2})(?:\s*[\.\-–\)]|\s+)/);
    if (numMatch) {
      playerNumber = parseInt(numMatch[1], 10);
    } else {
      playerNumber = playerIdx + 1;
    }

    // Try extracting position
    let position: 'GK' | 'DEF' | 'MID' | 'FWD' = 'MID';
    if (/حارس|gk|goalkeeper/i.test(line)) position = 'GK';
    else if (/دفاع|مدافع|def|cb|lb|rb/i.test(line)) position = 'DEF';
    else if (/هجوم|مهاجم|fwd|st|cf|lw|rw/i.test(line)) position = 'FWD';
    else if (/وسط|نص|mid|cm|cdm|cam/i.test(line)) position = 'MID';

    // Is Captain
    const isCaptain = /كابتن|قائد|captain|\(c\)|\*|⭐/i.test(line);

    // Clean player name: remove digits, student ID, positions, and markers
    let cleanName = line
      .replace(new RegExp(`\\b${studentId}\\b`, 'g'), '')
      .replace(/(?:#|رقم\s*|No\.?\s*)\d{1,2}/gi, '')
      .replace(/^[0-9]+[\.\-\)\s]+/, '')
      .replace(/\b(GK|DEF|MID|FWD|حارس|دفاع|مدافع|وسط|هجوم|مهاجم|كابتن|قائد|captain)\b/gi, '')
      .replace(/[\*\(\)\[\]\{\}\-\–:\/\\#]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanName.length >= 3) {
      playerIdx++;
      // Check for duplicate in current squads
      let isDuplicate = false;
      let duplicateDetails = '';

      Object.entries(currentSquads).forEach(([tName, squadPlayers]) => {
        squadPlayers.forEach((sp) => {
          const sameId = studentId && sp.studentId && sp.studentId.trim() === studentId;
          const sameName =
            cleanName &&
            normalizeArabicText(sp.name) === normalizeArabicText(cleanName);

          if (sameId || sameName) {
            isDuplicate = true;
            duplicateDetails = `مكرر مع فريق [${tName}] (${sp.name}${sp.studentId ? ` - ID: ${sp.studentId}` : ''})`;
          }
        });
      });

      players.push({
        name: cleanName,
        number: playerNumber > 0 && playerNumber <= 99 ? playerNumber : playerIdx,
        position,
        studentId,
        isCaptain,
        isDuplicate,
        duplicateDetails,
      });
    }
  });

  const duplicatePlayersFound = players.filter((p) => p.isDuplicate).length;

  return {
    detectedTeamName: teamCheck.exactMatch?.name || detectedTeamName,
    matchedTeam: teamCheck.exactMatch,
    isTeamFound: teamCheck.exists,
    closestTeams: teamCheck.closestMatches,
    players,
    rawLineCount: lines.length,
    duplicatePlayersFound,
  };
}
