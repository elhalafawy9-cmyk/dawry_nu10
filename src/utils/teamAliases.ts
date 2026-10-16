/**
 * Canonical Team Resolver & Bilingual (Arabic <-> English) Dictionary
 * Ensures teams like "اتلتيكو مدريد" and "Atlético Madrid" or "برشلونة" and "FC Barcelona"
 * are unified into ONE single official tournament team.
 */

export interface TeamBilingualInfo {
  canonicalName: string; // The official Arabic name in the tournament
  englishName: string;   // Standard English name
  group: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
  aliases: string[];     // All Arabic & English aliases, variations, common abbreviations
}

export const TOURNAMENT_TEAMS_BILINGUAL: TeamBilingualInfo[] = [
  // ================= Group A =================
  {
    canonicalName: 'برشلونة',
    englishName: 'Barcelona',
    group: 'A',
    aliases: ['برشلونة', 'برشلونه', 'البارسا', 'بارسا', 'barcelona', 'fc barcelona', 'fcb', 'barca', 'barça'],
  },
  {
    canonicalName: 'انجلترا',
    englishName: 'England',
    group: 'A',
    aliases: ['انجلترا', 'إنجلترا', 'انكلترا', 'منتخب انجلترا', 'england', 'three lions', 'eng'],
  },
  {
    canonicalName: 'ميلان',
    englishName: 'AC Milan',
    group: 'A',
    aliases: ['ميلان', 'الميلان', 'ايه سي ميلان', 'اي سي ميلان', 'ac milan', 'milan', 'acm', 'rossoneri'],
  },
  {
    canonicalName: 'الزمالك',
    englishName: 'Zamalek',
    group: 'A',
    aliases: ['الزمالك', 'زمالك', 'نادي الزمالك', 'zamalek', 'zamalek sc', 'zsc'],
  },
  {
    canonicalName: 'روما',
    englishName: 'AS Roma',
    group: 'A',
    aliases: ['روما', 'نادي روما', 'ذئاب روما', 'roma', 'as roma', 'asr', 'giallorossi'],
  },
  {
    canonicalName: 'فرنسا',
    englishName: 'France',
    group: 'A',
    aliases: ['فرنسا', 'منتخب فرنسا', 'الديوك', 'france', 'french', 'fra', 'les bleus'],
  },

  // ================= Group B =================
  {
    canonicalName: 'الجزائر',
    englishName: 'Algeria',
    group: 'B',
    aliases: ['الجزائر', 'منتخب الجزائر', 'محاربو الصحراء', 'algeria', 'algérie', 'alg', 'les fennecs'],
  },
  {
    canonicalName: 'مينيرو',
    englishName: 'Atletico Mineiro',
    group: 'B',
    aliases: ['مينيرو', 'اتلتيكو مينيرو', 'اتليتكو مينيرو', 'mineiro', 'atletico mineiro', 'atlético mineiro', 'cam', 'galo'],
  },
  {
    canonicalName: 'فرانكفورت',
    englishName: 'Frankfurt',
    group: 'B',
    aliases: ['فرانكفورت', 'اينتراخت فرانكفورت', 'آينتراخت فرانكفورت', 'frankfurt', 'eintracht frankfurt', 'eintracht', 'sge'],
  },
  {
    canonicalName: 'اليابان',
    englishName: 'Japan',
    group: 'B',
    aliases: ['اليابان', 'منتخب اليابان', 'الساموراي', 'japan', 'jpn', 'samurai blue'],
  },
  {
    canonicalName: 'النرويج',
    englishName: 'Norway',
    group: 'B',
    aliases: ['النرويج', 'منتخب النرويج', 'norway', 'norge', 'nor'],
  },
  {
    canonicalName: 'ميامي',
    englishName: 'Inter Miami',
    group: 'B',
    aliases: ['ميامي', 'انتر ميامي', 'إنتر ميامي', 'انترميامي', 'miami', 'inter miami', 'inter miami cf'],
  },

  // ================= Group C =================
  {
    canonicalName: 'سانتوس',
    englishName: 'Santos',
    group: 'C',
    aliases: ['سانتوس', 'نادي سانتوس', 'santos', 'santos fc', 'peixe'],
  },
  {
    canonicalName: 'انتر ميلان',
    englishName: 'Inter Milan',
    group: 'C',
    aliases: ['انتر ميلان', 'إنتر ميلان', 'الانتر', 'إنتر', 'انتر', 'inter milan', 'inter', 'fc inter', 'nerazzurri', 'internazionale'],
  },
  {
    canonicalName: 'البرازيل',
    englishName: 'Brazil',
    group: 'C',
    aliases: ['البرازيل', 'منتخب البرازيل', 'السيلساو', 'brazil', 'brasil', 'bra', 'selecao'],
  },
  {
    canonicalName: 'نيوكاسل',
    englishName: 'Newcastle',
    group: 'C',
    aliases: ['نيوكاسل', 'نيوكاسيل', 'نيوكاسل يونايتد', 'newcastle', 'newcastle united', 'nufc', 'magpies'],
  },
  {
    canonicalName: 'النصر',
    englishName: 'Al Nassr',
    group: 'C',
    aliases: ['النصر', 'نصر', 'نادي النصر', 'العالمي', 'al nassr', 'alnassr', 'al-nassr', 'nassr'],
  },
  {
    canonicalName: 'مصر',
    englishName: 'Egypt',
    group: 'C',
    aliases: ['مصر', 'منتخب مصر', 'الفراعنة', 'egypt', 'pharaohs', 'egy'],
  },

  // ================= Group D =================
  {
    canonicalName: 'باريس',
    englishName: 'Paris Saint-Germain',
    group: 'D',
    aliases: ['باريس', 'باريس سان جيرمان', 'باريس سانجيرمان', 'بي اس جي', 'paris', 'paris saint-germain', 'paris sg', 'psg'],
  },
  {
    canonicalName: 'اسبانيا',
    englishName: 'Spain',
    group: 'D',
    aliases: ['اسبانيا', 'إسبانيا', 'منتخب اسبانيا', 'الماتادور', 'spain', 'españa', 'esp', 'la roja'],
  },
  {
    canonicalName: 'نابولي',
    englishName: 'Napoli',
    group: 'D',
    aliases: ['نابولي', 'نادي نابولي', 'napoli', 'ssc napoli', 'nap'],
  },
  {
    canonicalName: 'غزل المحلة',
    englishName: 'Ghazl El Mahalla',
    group: 'D',
    aliases: ['غزل المحلة', 'غزل المحله', 'المحلة', 'المحله', 'زعيم الفلاحين', 'ghazl el mahalla', 'el mahalla', 'mahalla'],
  },
  {
    canonicalName: 'اتلتيكو مدريد',
    englishName: 'Atlético Madrid',
    group: 'D',
    aliases: [
      'اتلتيكو مدريد',
      'اتلتيكو',
      'اتليتكو مدريد',
      'اتليتكو',
      'اتليتيكو مدريد',
      'اتليتيكو',
      'اتلتكو',
      'الاتلتيكو',
      'الاتليتكو',
      'الروخيبلانكوس',
      'atletico madrid',
      'atlético madrid',
      'atletico',
      'atlético',
      'atleti',
      'atm',
      'club atletico de madrid',
      'atletico de madrid',
    ],
  },
  {
    canonicalName: 'المانيا',
    englishName: 'Germany',
    group: 'D',
    aliases: ['المانيا', 'ألمانيا', 'منتخب المانيا', 'الماكينات', 'germany', 'deutschland', 'ger', 'dfb'],
  },

  // ================= Group E =================
  {
    canonicalName: 'استون فيلا',
    englishName: 'Aston Villa',
    group: 'E',
    aliases: ['استون فيلا', 'أستون فيلا', 'فيلا', 'aston villa', 'avfc', 'villa', 'villans'],
  },
  {
    canonicalName: 'امريكا',
    englishName: 'USA',
    group: 'E',
    aliases: ['امريكا', 'أمريكا', 'الولايات المتحدة', 'منتخب امريكا', 'usa', 'united states', 'usmnt', 'us'],
  },
  {
    canonicalName: 'ارسنال',
    englishName: 'Arsenal',
    group: 'E',
    aliases: ['ارسنال', 'أرسنال', 'المدفعجية', 'الجانرز', 'arsenal', 'afc', 'gunners', 'arsenal fc'],
  },
  {
    canonicalName: 'كولومبيا',
    englishName: 'Colombia',
    group: 'E',
    aliases: ['كولومبيا', 'منتخب كولومبيا', 'colombia', 'col', 'los cafeteros'],
  },
  {
    canonicalName: 'المغرب',
    englishName: 'Morocco',
    group: 'E',
    aliases: ['المغرب', 'منتخب المغرب', 'اسود الاطلس', 'أسود الأطلس', 'morocco', 'maroc', 'mar'],
  },
  {
    canonicalName: 'طرابزون',
    englishName: 'Trabzonspor',
    group: 'E',
    aliases: ['طرابزون', 'طرابزون سبور', 'trabzon', 'trabzonspor', 'ts'],
  },

  // ================= Group F =================
  {
    canonicalName: 'بروسيا',
    englishName: 'Borussia Dortmund',
    group: 'F',
    aliases: ['بروسيا', 'بوروسيا', 'بروسيا دورتموند', 'بوروسيا دورتموند', 'دورتموند', 'dortmund', 'borussia dortmund', 'bvb', 'bvb 09'],
  },
  {
    canonicalName: 'بايرن',
    englishName: 'Bayern Munich',
    group: 'F',
    aliases: ['بايرن', 'بايرن ميونخ', 'ميونخ', 'البافاري', 'bayern', 'bayern munich', 'bayern münchen', 'fc bayern', 'fcb'],
  },
  {
    canonicalName: 'ريال مدريد',
    englishName: 'Real Madrid',
    group: 'F',
    aliases: ['ريال مدريد', 'الريال', 'مدريد', 'الملكي', 'الميرينغي', 'real madrid', 'real', 'rmcf', 'rma', 'los blancos'],
  },
  {
    canonicalName: 'ايطاليا',
    englishName: 'Italy',
    group: 'F',
    aliases: ['ايطاليا', 'إيطاليا', 'منتخب ايطاليا', 'الازوري', 'الآزوري', 'italy', 'italia', 'ita', 'azzurri'],
  },
  {
    canonicalName: 'اياكس',
    englishName: 'Ajax',
    group: 'F',
    aliases: ['اياكس', 'أياكس', 'أياكس أمستردام', 'اياكس امستردام', 'ajax', 'afc ajax', 'amsterdam'],
  },
  {
    canonicalName: 'تشيلسي',
    englishName: 'Chelsea',
    group: 'F',
    aliases: ['تشيلسي', 'تشيلسى', 'البلوز', 'chelsea', 'chelsea fc', 'cfc', 'blues'],
  },

  // ================= Group G =================
  {
    canonicalName: 'مان سيتي',
    englishName: 'Manchester City',
    group: 'G',
    aliases: ['مان سيتي', 'مانشستر سيتي', 'السيتي', 'مانشستر سيتى', 'man city', 'manchester city', 'mcfc', 'city', 'citizens'],
  },
  {
    canonicalName: 'اكتوبر',
    englishName: 'October',
    group: 'G',
    aliases: ['اكتوبر', 'أكتوبر', '6 اكتوبر', 'السادس من اكتوبر', 'october', '6th of october', 'october team'],
  },
  {
    canonicalName: 'يونايتد',
    englishName: 'Manchester United',
    group: 'G',
    aliases: ['يونايتد', 'مانشستر يونايتد', 'مان يونايتد', 'الشياطين الحمر', 'manchester united', 'man united', 'united', 'mufc', 'red devils'],
  },
  {
    canonicalName: 'الارجنتين',
    englishName: 'Argentina',
    group: 'G',
    aliases: ['الارجنتين', 'الأرجنتين', 'منتخب الارجنتين', 'التانغو', 'argentina', 'arg', 'albiceleste'],
  },
  {
    canonicalName: 'ليفربول',
    englishName: 'Liverpool',
    group: 'G',
    aliases: ['ليفربول', 'الريدز', 'liverpool', 'liverpool fc', 'lfc', 'reds'],
  },
  {
    canonicalName: 'ليفركوزن',
    englishName: 'Bayer Leverkusen',
    group: 'G',
    aliases: ['ليفركوزن', 'باير ليفركوزن', 'leverkusen', 'bayer leverkusen', 'b04', 'werkself'],
  },

  // ================= Group H =================
  {
    canonicalName: 'يوفنتوس',
    englishName: 'Juventus',
    group: 'H',
    aliases: ['يوفنتوس', 'اليوفي', 'السيدة العجوز', 'juventus', 'juve', 'juve fc', 'bianconeri'],
  },
  {
    canonicalName: 'الاهلي',
    englishName: 'Al Ahly',
    group: 'H',
    aliases: ['الاهلي', 'الأهلي', 'النادي الاهلي', 'الشياطين الحمر', 'al ahly', 'alahly', 'ahly', 'asc'],
  },
  {
    canonicalName: 'توتنهام',
    englishName: 'Tottenham',
    group: 'H',
    aliases: ['توتنهام', 'توتنهام هوتسبير', 'السبيرز', 'tottenham', 'tottenham hotspur', 'spurs', 'thfc'],
  },
  {
    canonicalName: 'فلسطين',
    englishName: 'Palestine',
    group: 'H',
    aliases: ['فلسطين', 'منتخب فلسطين', 'الفدائي', 'palestine', 'pal', 'pse'],
  },
  {
    canonicalName: 'المكسيك',
    englishName: 'Mexico',
    group: 'H',
    aliases: ['المكسيك', 'منتخب المكسيك', 'mexico', 'mex', 'el tri'],
  },
  {
    canonicalName: 'البرتغال',
    englishName: 'Portugal',
    group: 'H',
    aliases: ['البرتغال', 'منتخب البرتغال', 'برازيل اوروبا', 'portugal', 'por', 'selecao das quinas'],
  },
];

/**
 * Normalizes text for clean fuzzy/alias matching:
 * - strips diacritics, accents (é -> e, etc.)
 * - normalizes Arabic letters (أ/إ/آ -> ا, ة -> ه, ى -> ي)
 * - removes punctuation, dashes, quotes, dots, "fc", "sc", "club"
 */
export function cleanTeamString(str: any): string {
  if (str === null || str === undefined) return '';
  let s = typeof str === 'string' ? str : String(str);

  // Normalize Unicode (NFD) to separate accents and letters
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return s
    .toLowerCase()
    .trim()
    // Remove Arabic diacritics / tashkeel
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize alefs
    .replace(/[أإآ]/g, 'ا')
    // Normalize ta marbouta
    .replace(/ة/g, 'ه')
    // Normalize alif maqsura
    .replace(/ى/g, 'ي')
    // Strip common filler noise words
    .replace(/\b(fc|sc|club|cf|team|فريق|نادي|كشف|فرقة|منتخب)\b/gi, ' ')
    // Replace punctuation with spaces
    .replace(/[-_.,/:;()'"*#+!?]/g, ' ')
    // Squeeze multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// Fast lookup map cache
const ALIAS_LOOKUP_MAP = new Map<string, TeamBilingualInfo>();

TOURNAMENT_TEAMS_BILINGUAL.forEach((info) => {
  // Map canonical name
  ALIAS_LOOKUP_MAP.set(cleanTeamString(info.canonicalName), info);
  // Map English name
  ALIAS_LOOKUP_MAP.set(cleanTeamString(info.englishName), info);
  // Map all aliases
  info.aliases.forEach((alias) => {
    const cleaned = cleanTeamString(alias);
    if (cleaned) {
      ALIAS_LOOKUP_MAP.set(cleaned, info);
    }
  });
});

/**
 * Resolves any team name (whether Arabic or English or typo/alias)
 * to its single canonical official Arabic tournament name.
 * e.g.:
 * "Atlético Madrid" -> "اتلتيكو مدريد"
 * "atletico" -> "اتلتيكو مدريد"
 * "اتليتكو" -> "اتلتيكو مدريد"
 * "FC Barcelona" -> "برشلونة"
 * "PSG" -> "باريس"
 */
export function resolveCanonicalTeamName(rawName: string): string {
  if (!rawName || typeof rawName !== 'string') return '';
  const cleaned = cleanTeamString(rawName);
  if (!cleaned) return rawName.trim();

  // 1. Direct exact lookup
  if (ALIAS_LOOKUP_MAP.has(cleaned)) {
    return ALIAS_LOOKUP_MAP.get(cleaned)!.canonicalName;
  }

  // 2. Substring or inclusion match in aliases
  for (const [aliasKey, info] of ALIAS_LOOKUP_MAP.entries()) {
    if (aliasKey.length >= 3 && (cleaned === aliasKey || cleaned.startsWith(aliasKey) || aliasKey.startsWith(cleaned))) {
      return info.canonicalName;
    }
  }

  // 3. Check Levenshtein distance against canonical and English names
  let bestMatch: TeamBilingualInfo | null = null;
  let bestScore = 0;

  for (const info of TOURNAMENT_TEAMS_BILINGUAL) {
    const cleanCanon = cleanTeamString(info.canonicalName);
    const cleanEng = cleanTeamString(info.englishName);

    if (cleaned.includes(cleanCanon) || cleanCanon.includes(cleaned)) {
      return info.canonicalName;
    }
    if (cleaned.includes(cleanEng) || cleanEng.includes(cleaned)) {
      return info.canonicalName;
    }

    // Similarity score
    const simC = calcStringSimilarity(cleaned, cleanCanon);
    const simE = calcStringSimilarity(cleaned, cleanEng);
    const maxSim = Math.max(simC, simE);

    if (maxSim > bestScore && maxSim >= 0.65) {
      bestScore = maxSim;
      bestMatch = info;
    }
  }

  if (bestMatch) {
    return bestMatch.canonicalName;
  }

  return rawName.trim();
}

/**
 * Returns true if two team names refer to the exact same team
 * (e.g. isSameTeam("Atlético Madrid", "اتلتيكو مدريد") === true)
 */
export function isSameTeam(teamA: string, teamB: string): boolean {
  if (!teamA || !teamB) return false;
  if (teamA.trim().toLowerCase() === teamB.trim().toLowerCase()) return true;
  const canA = resolveCanonicalTeamName(teamA);
  const canB = resolveCanonicalTeamName(teamB);
  return Boolean(canA && canB && canA === canB);
}

/**
 * Gets the English name or bilingual display for a canonical team
 */
export function getTeamBilingualInfo(name: string): TeamBilingualInfo | undefined {
  const canonical = resolveCanonicalTeamName(name);
  return TOURNAMENT_TEAMS_BILINGUAL.find((t) => t.canonicalName === canonical);
}

function calcStringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  
  // Levenshtein distance
  const costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longerLength - costs[shorter.length]) / longerLength;
}

/**
 * Deleted teams storage helpers
 */
const DELETED_TEAMS_KEY = 'dawry_deleted_teams_v1';

export function getDeletedTeamNames(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_TEAMS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function addDeletedTeamName(name: string): void {
  try {
    const current = getDeletedTeamNames();
    const canonical = resolveCanonicalTeamName(name);
    const updated = Array.from(new Set([...current, name, canonical]));
    localStorage.setItem(DELETED_TEAMS_KEY, JSON.stringify(updated));
  } catch {}
}

export function clearDeletedTeamNames(): void {
  try {
    localStorage.removeItem(DELETED_TEAMS_KEY);
  } catch {}
}

/**
 * Sanitizes teams list:
 * - Respects explicitly deleted teams by the admin
 * - Unifies English/Arabic duplicates
 * - Preserves stats, groups, and custom logos
 */
export function sanitizeTeamsList(
  inputTeams: any[],
  officialDefaultTeams: any[]
): any[] {
  const deletedSet = new Set(getDeletedTeamNames().map(n => resolveCanonicalTeamName(n)));
  const canonicalMap = new Map<string, any>();

  if (Array.isArray(inputTeams) && inputTeams.length > 0) {
    inputTeams.forEach((team) => {
      if (!team || !team.name) return;
      const canonical = resolveCanonicalTeamName(team.name);
      if (deletedSet.has(canonical)) return;

      const defaultTemplate = officialDefaultTeams.find(
        (t) => resolveCanonicalTeamName(t.name) === canonical
      );

      canonicalMap.set(canonical, {
        ...(defaultTemplate || {}),
        ...team,
        name: defaultTemplate ? defaultTemplate.name : team.name,
      });
    });
    return Array.from(canonicalMap.values());
  }

  // Fallback to official default teams minus explicitly deleted ones
  return officialDefaultTeams.filter(t => !deletedSet.has(resolveCanonicalTeamName(t.name)));
}

/**
 * Sanitizes squads:
 * - Removes non-official / English team keys (e.g. "Atlético Madrid")
 * - Cleans any newly added AI dummy players if requested
 * - Ensures all official 48 teams exist in the squads record
 */
export function sanitizeSquads(
  inputSquads: Record<string, any[]>,
  officialTeamNames: string[],
  purgeNewlyAdded = true
): Record<string, any[]> {
  const cleanSquads: Record<string, any[]> = {};

  // Initialize every official team with empty array
  officialTeamNames.forEach((name) => {
    cleanSquads[name] = [];
  });

  if (!inputSquads || typeof inputSquads !== 'object') {
    return cleanSquads;
  }

  Object.entries(inputSquads).forEach(([rawTeamKey, players]) => {
    if (!Array.isArray(players)) return;
    const canonical = resolveCanonicalTeamName(rawTeamKey);

    // Only accept players if the team resolves to one of the 48 official teams
    if (cleanSquads[canonical]) {
      players.forEach((p) => {
        if (!p || !p.name) return;
        // If purgeNewlyAdded is requested and player was generated by AI (p_ai_), discard
        if (purgeNewlyAdded && typeof p.id === 'string' && p.id.startsWith('p_ai_')) {
          return;
        }
        // Avoid duplicate by id or name within the same canonical squad
        const already = cleanSquads[canonical].some(
          (ep: any) => ep.id === p.id || ep.name.trim().toLowerCase() === p.name.trim().toLowerCase()
        );
        if (!already) {
          cleanSquads[canonical].push(p);
        }
      });
    }
  });

  return cleanSquads;
}

