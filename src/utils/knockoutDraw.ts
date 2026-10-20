import { Match, Team } from '../App';

export interface QualifiedGroupSeed {
  groupLetter: string; // 'A' .. 'H'
  groupIndex: number;  // 1 .. 8
  rank: number;        // 1 .. 4
  teamName: string;
  seedLabel: string;   // e.g. 'أول المجموعة G'
}

export interface KnockoutMatchDrawResult {
  matchId: string;
  stageName: string;
  quarterIndex: number; // 0, 1, 2, 3
  quarterName: string;
  halfIndex: 0 | 1;     // 0 = Top Half (SF1), 1 = Bottom Half (SF2)
  halfName: string;
  teamA: QualifiedGroupSeed;
  teamB: QualifiedGroupSeed;
  nextMatchId: string;
  nextSlot: 'teamA' | 'teamB';
}

export interface KnockoutDrawOutput {
  stage: 'r32' | 'r16';
  matches: KnockoutMatchDrawResult[];
  groupAssignments: Record<string, { rank: number; quarter: number }[]>;
  g1Quarter: number;
  d1Quarter: number;
  d2Quarter: number;
  timestamp: string;
  ruleVerification: {
    g1D1D2SeparatedUntilFinal: boolean;
    sameGroupNotBeforeSemiFinal: boolean;
    allMatchesValid: boolean;
    summary: string;
  };
}

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/**
 * Extracts qualified seeds from teams/standings or fallback teams.
 */
export function getTournamentQualifiedSeeds(
  teams: Team[],
  getGroupStandings?: (groupLetter: string) => Team[]
): Record<string, QualifiedGroupSeed[]> {
  const result: Record<string, QualifiedGroupSeed[]> = {};

  GROUPS.forEach((grp, idx) => {
    const groupNum = idx + 1;
    let groupTeams: Team[] = [];

    if (getGroupStandings) {
      try {
        const standings = getGroupStandings(grp);
        if (standings && standings.length >= 4) {
          groupTeams = standings;
        }
      } catch {
        // fallback
      }
    }

    if (groupTeams.length < 4) {
      groupTeams = teams.filter(t => t.group === grp);
    }

    const rankLabels = ['أول', 'ثاني', 'ثالث', 'رابع'];

    result[grp] = [1, 2, 3, 4].map(rank => {
      const teamObj = groupTeams[rank - 1];
      const defaultName = teamObj?.name || `متأهل ${rank} (المجموعة ${grp})`;
      return {
        groupLetter: grp,
        groupIndex: groupNum,
        rank,
        teamName: defaultName,
        seedLabel: `${rankLabels[rank - 1]} المجموعة ${grp} (${groupNum})`,
      };
    });
  });

  return result;
}

/**
 * Solves and generates a random knockout draw with 100% adherence to all user constraints:
 * 1. 1st of Group 7 (G1) does NOT play against 1st of Group 4 (D1) OR 2nd of Group 4 (D2) before the Final.
 * 2. No two teams from the same group can play against each other before the Semi-Final.
 * 3. Fair R32 matchups (Rank 1 vs Rank 4/3, Rank 2 vs Rank 3/4).
 */
export function generateSmartKnockoutDraw(
  seedsByGroup: Record<string, QualifiedGroupSeed[]>,
  stage: 'r32' | 'r16' = 'r32'
): KnockoutDrawOutput {
  if (stage === 'r16') {
    return generateR16KnockoutDraw(seedsByGroup);
  }
  return generateR32KnockoutDraw(seedsByGroup);
}

function generateR16KnockoutDraw(
  seedsByGroup: Record<string, QualifiedGroupSeed[]>
): KnockoutDrawOutput {
  let groupQ: Record<string, [number, number]> = {};
  let solved = false;

  for (let attempt = 0; attempt < 500; attempt++) {
    const g1InTop = Math.random() < 0.5;
    const topQuarters = g1InTop ? [0, 1] : [2, 3];
    const botQuarters = g1InTop ? [2, 3] : [0, 1];

    groupQ = {};

    // 1. Group G (7): G1 goes to topQuarters, G2 to any quarter different from G1
    const g1Quarter = topQuarters[Math.floor(Math.random() * 2)];
    const otherForG = [0, 1, 2, 3].filter(q => q !== g1Quarter).sort(() => Math.random() - 0.5);
    groupQ['G'] = [g1Quarter, otherForG[0]];

    // 2. Group D (4): D1 and D2 BOTH go to botQuarters, one in each quarter!
    const dBot = Math.random() < 0.5 ? [botQuarters[0], botQuarters[1]] : [botQuarters[1], botQuarters[0]];
    groupQ['D'] = [dBot[0], dBot[1]];

    // Track counts of rank 1 and rank 2 per quarter (target: exactly 2 per quarter for each rank)
    const rankCounts: Record<number, number[]> = {
      1: [0, 0, 0, 0],
      2: [0, 0, 0, 0]
    };

    for (const g of ['G', 'D']) {
      rankCounts[1][groupQ[g][0]]++;
      rankCounts[2][groupQ[g][1]]++;
    }

    const otherGroups = ['A', 'B', 'C', 'E', 'F', 'H'].sort(() => Math.random() - 0.5);
    let success = true;

    for (const g of otherGroups) {
      let foundPair: [number, number] | null = null;
      const candidatesR1 = [0, 1, 2, 3].filter(q => rankCounts[1][q] < 2).sort(() => Math.random() - 0.5);

      for (const q1 of candidatesR1) {
        const candidatesR2 = [0, 1, 2, 3].filter(q => q !== q1 && rankCounts[2][q] < 2).sort(() => Math.random() - 0.5);
        if (candidatesR2.length > 0) {
          foundPair = [q1, candidatesR2[0]];
          rankCounts[1][q1]++;
          rankCounts[2][candidatesR2[0]]++;
          break;
        }
      }

      if (!foundPair) {
        success = false;
        break;
      }
      groupQ[g] = foundPair;
    }

    if (success) {
      let valid = true;
      for (let r = 1; r <= 2; r++) {
        for (let q = 0; q < 4; q++) {
          if (rankCounts[r][q] !== 2) valid = false;
        }
      }
      if (valid) {
        solved = true;
        break;
      }
    }
  }

  if (!solved) {
    groupQ = {
      G: [0, 2],
      D: [2, 3],
      A: [1, 0],
      B: [3, 1],
      C: [0, 3],
      E: [2, 1],
      F: [1, 2],
      H: [3, 0],
    };
  }

  const quarterTeams: QualifiedGroupSeed[][] = [[], [], [], []];
  GROUPS.forEach(g => {
    const [q1, q2] = groupQ[g];
    const s1 = seedsByGroup[g]?.[0] || {
      groupLetter: g,
      groupIndex: GROUPS.indexOf(g) + 1,
      rank: 1,
      teamName: `أول المجموعة ${g}`,
      seedLabel: `أول المجموعة ${g}`,
    };
    const s2 = seedsByGroup[g]?.[1] || {
      groupLetter: g,
      groupIndex: GROUPS.indexOf(g) + 1,
      rank: 2,
      teamName: `ثاني المجموعة ${g}`,
      seedLabel: `ثاني المجموعة ${g}`,
    };
    quarterTeams[q1].push(s1);
    quarterTeams[q2].push(s2);
  });

  const quarterNames = [
    'الربع الأول (مسار نصف النهائي 1)',
    'الربع الثاني (مسار نصف النهائي 1)',
    'الربع الثالث (مسار نصف النهائي 2)',
    'الربع الرابع (مسار نصف النهائي 2)',
  ];

  const r16Next: Record<string, { nextMatchId: string; nextSlot: 'teamA' | 'teamB' }> = {
    r16_1: { nextMatchId: 'qf1', nextSlot: 'teamA' },
    r16_2: { nextMatchId: 'qf1', nextSlot: 'teamB' },
    r16_3: { nextMatchId: 'qf2', nextSlot: 'teamA' },
    r16_4: { nextMatchId: 'qf2', nextSlot: 'teamB' },
    r16_5: { nextMatchId: 'qf3', nextSlot: 'teamA' },
    r16_6: { nextMatchId: 'qf3', nextSlot: 'teamB' },
    r16_7: { nextMatchId: 'qf4', nextSlot: 'teamA' },
    r16_8: { nextMatchId: 'qf4', nextSlot: 'teamB' },
  };

  const drawMatches: KnockoutMatchDrawResult[] = [];

  for (let q = 0; q < 4; q++) {
    const qList = quarterTeams[q];
    const r1 = qList.filter(t => t.rank === 1).sort(() => Math.random() - 0.5);
    const r2 = qList.filter(t => t.rank === 2).sort(() => Math.random() - 0.5);

    // Pair r1 with r2, making sure different group
    let p0_b = r2[0];
    let p1_b = r2[1];
    if (r1[0].groupLetter === p0_b.groupLetter || r1[1].groupLetter === p1_b.groupLetter) {
      p0_b = r2[1];
      p1_b = r2[0];
    }

    const qPairs = [
      { a: r1[0], b: p0_b },
      { a: r1[1], b: p1_b },
    ];

    const matchStartIdx = q * 2 + 1; // 1, 3, 5, 7
    const halfIndex: 0 | 1 = q < 2 ? 0 : 1;
    const halfName = halfIndex === 0 ? 'نصف الجدول الأول (المسار المؤدي للنهائي 1)' : 'نصف الجدول الثاني (المسار المؤدي للنهائي 2)';

    qPairs.forEach((pair, idx) => {
      const matchNum = matchStartIdx + idx;
      const matchId = `r16_${matchNum}`;
      const next = r16Next[matchId] || { nextMatchId: 'qf1', nextSlot: 'teamA' };

      drawMatches.push({
        matchId,
        stageName: `دور الـ 16 (مباراة ${matchNum})`,
        quarterIndex: q,
        quarterName: quarterNames[q],
        halfIndex,
        halfName,
        teamA: pair.a,
        teamB: pair.b,
        nextMatchId: next.nextMatchId,
        nextSlot: next.nextSlot,
      });
    });
  }

  const g1Q = groupQ['G'][0];
  const d1Q = groupQ['D'][0];
  const d2Q = groupQ['D'][1];

  const g1Half = g1Q < 2 ? 0 : 1;
  const d1Half = d1Q < 2 ? 0 : 1;
  const d2Half = d2Q < 2 ? 0 : 1;

  const g1D1D2Separated = g1Half !== d1Half && g1Half !== d2Half;

  let sameGroupNotBeforeSF = true;
  GROUPS.forEach(g => {
    if (groupQ[g][0] === groupQ[g][1]) sameGroupNotBeforeSF = false;
  });

  const formattedAssignments: Record<string, { rank: number; quarter: number }[]> = {};
  GROUPS.forEach(g => {
    formattedAssignments[g] = [
      { rank: 1, quarter: groupQ[g][0] },
      { rank: 2, quarter: groupQ[g][1] },
    ];
  });

  return {
    stage: 'r16',
    matches: drawMatches,
    groupAssignments: formattedAssignments,
    g1Quarter: g1Q,
    d1Quarter: d1Q,
    d2Quarter: d2Q,
    timestamp: new Date().toISOString(),
    ruleVerification: {
      g1D1D2SeparatedUntilFinal: g1D1D2Separated,
      sameGroupNotBeforeSemiFinal: sameGroupNotBeforeSF,
      allMatchesValid: drawMatches.length === 8,
      summary: `✅ تم التحقق (دور الـ 16): أول المجموعة 7 (G) في ${g1Half === 0 ? 'نصف الجدول الأول' : 'نصف الجدول الثاني'} وأول وثاني المجموعة 4 (D) في ${d1Half === 0 ? 'نصف الجدول الأول' : 'نصف الجدول الثاني'} (مستحيل لقاؤهم قبل النهائي الكبير). ولا يلتقي أي فريقين من نفس المجموعة قبل دور نصف النهائي.`,
    },
  };
}

function generateR32KnockoutDraw(
  seedsByGroup: Record<string, QualifiedGroupSeed[]>
): KnockoutDrawOutput {
  let groupQ: Record<string, number[]> = {};
  let solved = false;

  for (let attempt = 0; attempt < 500; attempt++) {
    const g1InTop = Math.random() < 0.5;
    const topQuarters = g1InTop ? [0, 1] : [2, 3];
    const botQuarters = g1InTop ? [2, 3] : [0, 1];

    groupQ = {};

    // 1. Group G (Group 7): G1 goes to a random quarter in topQuarters
    const g1Quarter = topQuarters[Math.floor(Math.random() * 2)];
    const remainingForG = [0, 1, 2, 3].filter(q => q !== g1Quarter).sort(() => Math.random() - 0.5);
    groupQ['G'] = [g1Quarter, remainingForG[0], remainingForG[1], remainingForG[2]];

    // 2. Group D (Group 4): D1 and D2 MUST BOTH go to botQuarters (one in botQuarters[0], one in botQuarters[1])
    const dBotQuarters = Math.random() < 0.5 ? [botQuarters[0], botQuarters[1]] : [botQuarters[1], botQuarters[0]];
    const remainingForD = [0, 1, 2, 3].filter(q => !dBotQuarters.includes(q)).sort(() => Math.random() - 0.5);
    groupQ['D'] = [dBotQuarters[0], dBotQuarters[1], remainingForD[0], remainingForD[1]];

    const rankCounts: Record<number, number[]> = {
      1: [0, 0, 0, 0],
      2: [0, 0, 0, 0],
      3: [0, 0, 0, 0],
      4: [0, 0, 0, 0]
    };

    for (const g of ['G', 'D']) {
      for (let r = 1; r <= 4; r++) {
        const q = groupQ[g][r - 1];
        rankCounts[r][q]++;
      }
    }

    const otherGroups = ['A', 'B', 'C', 'E', 'F', 'H'].sort(() => Math.random() - 0.5);
    let success = true;

    for (const g of otherGroups) {
      let foundPerm: number[] | null = null;
      function permute(rankIdx: number, usedQ: number[], currentPerm: number[]) {
        if (foundPerm) return;
        if (rankIdx === 5) {
          foundPerm = [...currentPerm];
          return;
        }
        const candidates = [0, 1, 2, 3]
          .filter(q => !usedQ.includes(q) && rankCounts[rankIdx][q] < 2)
          .sort(() => Math.random() - 0.5);

        for (const q of candidates) {
          rankCounts[rankIdx][q]++;
          usedQ.push(q);
          currentPerm.push(q);
          permute(rankIdx + 1, usedQ, currentPerm);
          if (foundPerm) return;
          currentPerm.pop();
          usedQ.pop();
          rankCounts[rankIdx][q]--;
        }
      }

      permute(1, [], []);
      if (!foundPerm) {
        success = false;
        break;
      }
      groupQ[g] = foundPerm;
    }

    if (success) {
      let valid = true;
      for (let r = 1; r <= 4; r++) {
        for (let q = 0; q < 4; q++) {
          if (rankCounts[r][q] !== 2) valid = false;
        }
      }
      if (valid) {
        solved = true;
        break;
      }
    }
  }

  if (!solved) {
    groupQ = {
      G: [0, 1, 2, 3],
      D: [2, 3, 0, 1],
      A: [1, 0, 3, 2],
      B: [3, 2, 1, 0],
      C: [0, 2, 1, 3],
      E: [2, 0, 3, 1],
      F: [1, 3, 0, 2],
      H: [3, 1, 2, 0],
    };
  }

  const quarterTeams: QualifiedGroupSeed[][] = [[], [], [], []];
  GROUPS.forEach(g => {
    const qPerm = groupQ[g];
    for (let r = 1; r <= 4; r++) {
      const q = qPerm[r - 1];
      const seed = seedsByGroup[g]?.[r - 1] || {
        groupLetter: g,
        groupIndex: GROUPS.indexOf(g) + 1,
        rank: r,
        teamName: `متأهل ${r} (${g})`,
        seedLabel: `مركز ${r} - مجموعة ${g}`,
      };
      quarterTeams[q].push(seed);
    }
  });

  const quarterNames = [
    'الربع الأول (مسار نصف النهائي 1)',
    'الربع الثاني (مسار نصف النهائي 1)',
    'الربع الثالث (مسار نصف النهائي 2)',
    'الربع الرابع (مسار نصف النهائي 2)',
  ];

  const nextPairings: Record<string, { nextMatchId: string; nextSlot: 'teamA' | 'teamB' }> = {
    r32_1: { nextMatchId: 'r16_1', nextSlot: 'teamA' },
    r32_2: { nextMatchId: 'r16_1', nextSlot: 'teamB' },
    r32_3: { nextMatchId: 'r16_2', nextSlot: 'teamA' },
    r32_4: { nextMatchId: 'r16_2', nextSlot: 'teamB' },

    r32_5: { nextMatchId: 'r16_3', nextSlot: 'teamA' },
    r32_6: { nextMatchId: 'r16_3', nextSlot: 'teamB' },
    r32_7: { nextMatchId: 'r16_4', nextSlot: 'teamA' },
    r32_8: { nextMatchId: 'r16_4', nextSlot: 'teamB' },

    r32_9: { nextMatchId: 'r16_5', nextSlot: 'teamA' },
    r32_10: { nextMatchId: 'r16_5', nextSlot: 'teamB' },
    r32_11: { nextMatchId: 'r16_6', nextSlot: 'teamA' },
    r32_12: { nextMatchId: 'r16_6', nextSlot: 'teamB' },

    r32_13: { nextMatchId: 'r16_7', nextSlot: 'teamA' },
    r32_14: { nextMatchId: 'r16_7', nextSlot: 'teamB' },
    r32_15: { nextMatchId: 'r16_8', nextSlot: 'teamA' },
    r32_16: { nextMatchId: 'r16_8', nextSlot: 'teamB' },
  };

  const drawMatches: KnockoutMatchDrawResult[] = [];

  for (let q = 0; q < 4; q++) {
    const qList = quarterTeams[q];
    const r1 = qList.filter(t => t.rank === 1).sort(() => Math.random() - 0.5);
    const r2 = qList.filter(t => t.rank === 2).sort(() => Math.random() - 0.5);
    const r3 = qList.filter(t => t.rank === 3).sort(() => Math.random() - 0.5);
    const r4 = qList.filter(t => t.rank === 4).sort(() => Math.random() - 0.5);

    const qMatches = [
      { a: r1[0], b: r4[0] },
      { a: r2[0], b: r3[0] },
      { a: r1[1], b: r4[1] },
      { a: r2[1], b: r3[1] },
    ];

    const matchStartIdx = q * 4 + 1;
    const halfIndex: 0 | 1 = q < 2 ? 0 : 1;
    const halfName = halfIndex === 0 ? 'نصف الجدول الأول (المسار المؤدي للنهائي 1)' : 'نصف الجدول الثاني (المسار المؤدي للنهائي 2)';

    qMatches.forEach((pair, idx) => {
      const matchNum = matchStartIdx + idx;
      const matchId = `r32_${matchNum}`;
      const next = nextPairings[matchId] || { nextMatchId: 'r16_1', nextSlot: 'teamA' };

      drawMatches.push({
        matchId,
        stageName: `دور الـ 32 (مباراة ${matchNum})`,
        quarterIndex: q,
        quarterName: quarterNames[q],
        halfIndex,
        halfName,
        teamA: pair.a,
        teamB: pair.b,
        nextMatchId: next.nextMatchId,
        nextSlot: next.nextSlot,
      });
    });
  }

  const g1Q = groupQ['G'][0];
  const d1Q = groupQ['D'][0];
  const d2Q = groupQ['D'][1];

  const g1Half = g1Q < 2 ? 0 : 1;
  const d1Half = d1Q < 2 ? 0 : 1;
  const d2Half = d2Q < 2 ? 0 : 1;

  const g1D1D2Separated = g1Half !== d1Half && g1Half !== d2Half;

  let sameGroupNotBeforeSF = true;
  GROUPS.forEach(g => {
    const qSet = new Set(groupQ[g]);
    if (qSet.size !== 4) sameGroupNotBeforeSF = false;
  });

  const formattedAssignments: Record<string, { rank: number; quarter: number }[]> = {};
  GROUPS.forEach(g => {
    formattedAssignments[g] = [1, 2, 3, 4].map(r => ({
      rank: r,
      quarter: groupQ[g][r - 1],
    }));
  });

  return {
    stage: 'r32',
    matches: drawMatches,
    groupAssignments: formattedAssignments,
    g1Quarter: g1Q,
    d1Quarter: d1Q,
    d2Quarter: d2Q,
    timestamp: new Date().toISOString(),
    ruleVerification: {
      g1D1D2SeparatedUntilFinal: g1D1D2Separated,
      sameGroupNotBeforeSemiFinal: sameGroupNotBeforeSF,
      allMatchesValid: drawMatches.length === 16,
      summary: `✅ تم التحقق (دور الـ 32): أول المجموعة 7 (G) في ${g1Half === 0 ? 'نصف الجدول الأول' : 'نصف الجدول الثاني'} وأول وثاني المجموعة 4 (D) في ${d1Half === 0 ? 'نصف الجدول الأول' : 'نصف الجدول الثاني'} (مستحيل لقاؤهم قبل النهائي). ولا يلتقي أي فريقين من نفس المجموعة قبل دور نصف النهائي.`,
    },
  };
}

/**
 * Applies the generated draw to tournament matches:
 * Updates the 16 matches of Round of 32 (r32_1 to r32_16) OR the 8 matches of Round of 16 (r16_1 to r16_8),
 * and resets their score/status to fresh 'upcoming' while keeping their schedule dates.
 */
export function applyDrawToTournamentMatches(
  existingMatches: Match[],
  drawOutput: KnockoutDrawOutput
): Match[] {
  const drawMap = new Map<string, KnockoutMatchDrawResult>();
  drawOutput.matches.forEach(m => drawMap.set(m.matchId, m));

  return existingMatches.map(m => {
    const drawItem = drawMap.get(m.id);
    if (drawItem) {
      return {
        ...m,
        teamA: drawItem.teamA.teamName,
        teamB: drawItem.teamB.teamName,
        scoreA: null,
        scoreB: null,
        status: 'upcoming',
        minute: undefined,
        scorersSummary: undefined,
        substitutions: [],
        cards: [],
      };
    }
    return m;
  });
}

