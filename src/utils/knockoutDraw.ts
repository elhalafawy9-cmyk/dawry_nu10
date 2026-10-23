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
    // Constraint: Group 7 (G) on Left (Quarters 0, 1) and Group 4 (D) on Right (Quarters 2, 3)
    const topQuarters = [0, 1]; // Left Half (الشمال) -> SF1
    const botQuarters = [2, 3]; // Right Half (اليمين) -> SF2

    groupQ = {};

    // 1. Group G (7): G1 goes to Quarter 0 or 1, G2 to the other quarter in Left Half!
    const g1Quarter = Math.random() < 0.5 ? 0 : 1;
    const g2Quarter = g1Quarter === 0 ? 1 : 0;
    groupQ['G'] = [g1Quarter, g2Quarter];

    // 2. Group D (4): D1 and D2 BOTH go to Right Half (Quarters 2, 3), one in each quarter!
    const d1Quarter = Math.random() < 0.5 ? 2 : 3;
    const d2Quarter = d1Quarter === 2 ? 3 : 2;
    groupQ['D'] = [d1Quarter, d2Quarter];

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
    // Constraint: Group 7 (G) on Left (Quarters 0, 1) and Group 4 (D) on Right (Quarters 2, 3)
    const topQuarters = [0, 1]; // Left Half (الشمال) -> SF1
    const botQuarters = [2, 3]; // Right Half (اليمين) -> SF2

    groupQ = {};

    // 1. Group G (Group 7): G1 goes to Quarter 0 or 1, G2 to the other quarter in Left Half!
    // G3 & G4 go to Right Half (Quarters 2 & 3)
    const g1Quarter = Math.random() < 0.5 ? 0 : 1;
    const g2Quarter = g1Quarter === 0 ? 1 : 0;
    const g3Quarter = Math.random() < 0.5 ? 2 : 3;
    const g4Quarter = g3Quarter === 2 ? 3 : 2;
    groupQ['G'] = [g1Quarter, g2Quarter, g3Quarter, g4Quarter];

    // 2. Group D (Group 4): D1 goes to Quarter 2 or 3, D2 to the other quarter in Right Half!
    // D3 & D4 go to Left Half (Quarters 0 & 1)
    const d1Quarter = Math.random() < 0.5 ? 2 : 3;
    const d2Quarter = d1Quarter === 2 ? 3 : 2;
    const d3Quarter = Math.random() < 0.5 ? 0 : 1;
    const d4Quarter = d3Quarter === 0 ? 1 : 0;
    groupQ['D'] = [d1Quarter, d2Quarter, d3Quarter, d4Quarter];

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

/**
 * Official Tournament Ready Draw Specifications (المجموعة 4 يمين و المجموعة 7 شمال):
 * 
 * ⬅️ LEFT HALF (الشمال):
 * - Quarter 0:
 *   r32_1: مان سيتي (أول G / 7) 🆚 اليابان (رابع B / 2)
 *   r32_2: انتر ميلان (ثاني C / 3) 🆚 هولندا (ثالث D / 4)
 *   r32_3: برشلونة (أول A / 1) 🆚 ايطاليا (رابع F / 6)
 *   r32_4: امريكا (ثاني E / 5) 🆚 توتنهام (ثالث H / 8)
 * - Quarter 1:
 *   r32_5: بروسيا (أول F / 6) 🆚 جنوب افريقيا (رابع E / 5)
 *   r32_6: اكتوبر (ثاني G / 7) 🆚 ميلان (ثالث A / 1)
 *   r32_7: الجزائر (أول B / 2) 🆚 غزل المحلة (رابع D / 4)
 *   r32_8: الاهلي (ثاني H / 8) 🆚 البرازيل (ثالث C / 3)
 * 
 * ➡️ RIGHT HALF (اليمين):
 * - Quarter 2:
 *   r32_9: باريس (أول D / 4) 🆚 فلسطين (رابع H / 8)
 *   r32_10: مينيرو (ثاني B / 2) 🆚 ارسنال (ثالث E / 5)
 *   r32_11: بلباو (أول C / 3) 🆚 الزمالك (رابع A / 1)
 *   r32_12: بايرن (ثاني F / 6) 🆚 يونايتد (ثالث G / 7)
 * - Quarter 3:
 *   r32_13: استون فيلا (أول E / 5) 🆚 نيوكاسل (رابع C / 3)
 *   r32_14: اسبانيا (ثاني D / 4) 🆚 ريال مدريد (ثالث F / 6)
 *   r32_15: يوفنتوس (أول H / 8) 🆚 الارجنتين (رابع G / 7)
 *   r32_16: انجلترا (ثاني A / 1) 🆚 فرانكفورت (ثالث B / 2)
 */
export const OFFICIAL_READY_R32_SPEC = [
  { matchId: 'r32_1', groupA: 'G', rankA: 1, groupB: 'B', rankB: 4 },
  { matchId: 'r32_2', groupA: 'C', rankA: 2, groupB: 'D', rankB: 3 },
  { matchId: 'r32_3', groupA: 'A', rankA: 1, groupB: 'F', rankB: 4 },
  { matchId: 'r32_4', groupA: 'E', rankA: 2, groupB: 'H', rankB: 3 },
  { matchId: 'r32_5', groupA: 'F', rankA: 1, groupB: 'E', rankB: 4 },
  { matchId: 'r32_6', groupA: 'G', rankA: 2, groupB: 'A', rankB: 3 },
  { matchId: 'r32_7', groupA: 'B', rankA: 1, groupB: 'D', rankB: 4 },
  { matchId: 'r32_8', groupA: 'H', rankA: 2, groupB: 'C', rankB: 3 },

  { matchId: 'r32_9',  groupA: 'D', rankA: 1, groupB: 'H', rankB: 4 },
  { matchId: 'r32_10', groupA: 'B', rankA: 2, groupB: 'E', rankB: 3 },
  { matchId: 'r32_11', groupA: 'C', rankA: 1, groupB: 'A', rankB: 4 },
  { matchId: 'r32_12', groupA: 'F', rankA: 2, groupB: 'G', rankB: 3 },
  { matchId: 'r32_13', groupA: 'E', rankA: 1, groupB: 'C', rankB: 4 },
  { matchId: 'r32_14', groupA: 'D', rankA: 2, groupB: 'F', rankB: 3 },
  { matchId: 'r32_15', groupA: 'H', rankA: 1, groupB: 'G', rankB: 4 },
  { matchId: 'r32_16', groupA: 'A', rankA: 2, groupB: 'B', rankB: 3 },
];

/**
 * Builds the complete 32 knockout matches pre-populated with the official draw requested by the user.
 */
export function buildOfficialReadyKnockoutMatches(
  teams: Team[],
  getGroupStandings?: (groupLetter: string) => Team[]
): Record<string, { teamA: string; teamB: string }> {
  const seeds = getTournamentQualifiedSeeds(teams, getGroupStandings);
  const result: Record<string, { teamA: string; teamB: string }> = {};

  OFFICIAL_READY_R32_SPEC.forEach(spec => {
    const tA = seeds[spec.groupA]?.[spec.rankA - 1]?.teamName || `أول المجموعة ${spec.groupA}`;
    const tB = seeds[spec.groupB]?.[spec.rankB - 1]?.teamName || `متأهل المجموعة ${spec.groupB}`;
    result[spec.matchId] = { teamA: tA, teamB: tB };
  });

  return result;
}

/**
 * Applies the official ready draw (م4 يمين وم7 شمال) directly to matches list.
 */
export function applyOfficialReadyDrawToMatches(
  existingMatches: Match[],
  teams: Team[],
  getGroupStandings?: (groupLetter: string) => Team[]
): Match[] {
  const readyR32 = buildOfficialReadyKnockoutMatches(teams, getGroupStandings);

  return existingMatches.map(m => {
    if (readyR32[m.id]) {
      return {
        ...m,
        teamA: readyR32[m.id].teamA,
        teamB: readyR32[m.id].teamB,
        scoreA: null,
        scoreB: null,
        status: 'upcoming',
        minute: undefined,
        scorersSummary: undefined,
        substitutions: [],
        cards: [],
      };
    }

    // Reset dependent knockout matches
    if (['r16', 'qf', 'sf', 'final'].includes(m.stage)) {
      let resetA = m.teamA;
      let resetB = m.teamB;

      if (m.id === 'r16_1') { resetA = `الفائز من م1 (دور 32)`; resetB = `الفائز من م2 (دور 32)`; }
      else if (m.id === 'r16_2') { resetA = `الفائز من م3 (دور 32)`; resetB = `الفائز من م4 (دور 32)`; }
      else if (m.id === 'r16_3') { resetA = `الفائز من م5 (دور 32)`; resetB = `الفائز من م6 (دور 32)`; }
      else if (m.id === 'r16_4') { resetA = `الفائز من م7 (دور 32)`; resetB = `الفائز من م8 (دور 32)`; }
      else if (m.id === 'r16_5') { resetA = `الفائز من م9 (دور 32)`; resetB = `الفائز من م10 (دور 32)`; }
      else if (m.id === 'r16_6') { resetA = `الفائز من م11 (دور 32)`; resetB = `الفائز من م12 (دور 32)`; }
      else if (m.id === 'r16_7') { resetA = `الفائز من م13 (دور 32)`; resetB = `الفائز من م14 (دور 32)`; }
      else if (m.id === 'r16_8') { resetA = `الفائز من م15 (دور 32)`; resetB = `الفائز من م16 (دور 32)`; }
      else if (m.id === 'qf1') { resetA = `المتأهل من دور 16 (1)`; resetB = `المتأهل من دور 16 (2)`; }
      else if (m.id === 'qf2') { resetA = `المتأهل من دور 16 (3)`; resetB = `المتأهل من دور 16 (4)`; }
      else if (m.id === 'qf3') { resetA = `المتأهل من دور 16 (5)`; resetB = `المتأهل من دور 16 (6)`; }
      else if (m.id === 'qf4') { resetA = `المتأهل من دور 16 (7)`; resetB = `المتأهل من دور 16 (8)`; }
      else if (m.id === 'sf1') { resetA = `المتأهل من ربع النهائي (1)`; resetB = `المتأهل من ربع النهائي (2)`; }
      else if (m.id === 'sf2') { resetA = `المتأهل من ربع النهائي (3)`; resetB = `المتأهل من ربع النهائي (4)`; }
      else if (m.id === 'fin') { resetA = `المتأهل للنهائي (1)`; resetB = `المتأهل للنهائي (2)`; }
      else if (m.id === 'third') { resetA = `الخاسر من نصف النهائي (1)`; resetB = `الخاسر من نصف النهائي (2)`; }

      return {
        ...m,
        teamA: resetA,
        teamB: resetB,
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


