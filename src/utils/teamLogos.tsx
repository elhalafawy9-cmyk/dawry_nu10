import React, { useState } from 'react';

// Team logo metadata: Primary logo URL, fallback colors, and club/nation type
export interface TeamLogoData {
  name: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  shortName: string;
  isNationalTeam?: boolean;
}

export const TEAM_LOGOS_MAP: Record<string, TeamLogoData> = {
  // --- Group A ---
  'برشلونة': {
    name: 'برشلونة',
    shortName: 'FCB',
    primaryColor: '#004d98',
    secondaryColor: '#a50044',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg',
  },
  'انجلترا': {
    name: 'انجلترا',
    shortName: 'ENG',
    primaryColor: '#ffffff',
    secondaryColor: '#ce1124',
    isNationalTeam: true,
    logoUrl: 'https://flagcdn.com/w160/gb-eng.png',
  },
  'ميلان': {
    name: 'ميلان',
    shortName: 'ACM',
    primaryColor: '#fb090b',
    secondaryColor: '#000000',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg',
  },
  'الزمالك': {
    name: 'الزمالك',
    shortName: 'ZSC',
    primaryColor: '#ffffff',
    secondaryColor: '#e11d48',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Zamalek_logo.svg',
  },
  'روما': {
    name: 'روما',
    shortName: 'ASR',
    primaryColor: '#8e1f2f',
    secondaryColor: '#f0bc42',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg',
  },
  'فرنسا': {
    name: 'فرنسا',
    shortName: 'FRA',
    primaryColor: '#002654',
    secondaryColor: '#ed2939',
    isNationalTeam: true,
    logoUrl: 'https://flagcdn.com/w160/fr.png',
  },

  // --- Group B ---
  'الجزائر': {
    name: 'الجزائر',
    shortName: 'ALG',
    primaryColor: '#006633',
    secondaryColor: '#d21034',
    isNationalTeam: true,
    logoUrl: 'https://flagcdn.com/w160/dz.png',
  },
  'مينيرو': {
    name: 'مينيرو',
    shortName: 'CAM',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Clube_Atl%C3%A9tico_Mineiro_logo.svg',
  },
  'فرانكفورت': {
    name: 'فرانكفورت',
    shortName: 'SGE',
    primaryColor: '#e1000f',
    secondaryColor: '#000000',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/de/0/04/Eintracht_Frankfurt_Logo.svg',
  },
  'اليابان': {
    name: 'اليابان',
    shortName: 'JPN',
    primaryColor: '#ffffff',
    secondaryColor: '#bc002d',
    isNationalTeam: true,
    logoUrl: 'https://flagcdn.com/w160/jp.png',
  },
  'النرويج': {
    name: 'النرويج',
    shortName: 'NOR',
    primaryColor: '#ba0c2f',
    secondaryColor: '#00205b',
    isNationalTeam: true,
    logoUrl: 'https://flagcdn.com/w160/no.png',
  },
  'ميامي': {
    name: 'ميامي',
    shortName: 'MIA',
    primaryColor: '#f7b5cd',
    secondaryColor: '#231f20',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/5c/Inter_Miami_CF_logo.svg',
  },

  // --- Group C ---
  'سانتوس': {
    name: 'سانتوس',
    shortName: 'SAN',
    primaryColor: '#ffffff',
    secondaryColor: '#000000',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/35/Santos_logo.svg',
  },
  'انتر ميلان': {
    name: 'انتر ميلان',
    shortName: 'INT',
    primaryColor: '#00579c',
    secondaryColor: '#000000',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
  },
  'البرازيل': {
    name: 'البرازيل',
    shortName: 'BRA',
    primaryColor: '#fedf00',
    secondaryColor: '#009739',
    isNationalTeam: true,
    logoUrl: 'https://flagcdn.com/w160/br.png',
  },
  'نيوكاسل': {
    name: 'نيوكاسل',
    shortName: 'NEW',
    primaryColor: '#241f20',
    secondaryColor: '#ffffff',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg',
  },
  'النصر': {
    name: 'النصر',
    shortName: 'NAS',
    primaryColor: '#ffd700',
    secondaryColor: '#0047bb',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Al_Nassr_FC_logo.svg',
  },
  'مصر': {
    name: 'مصر',
    shortName: 'EGY',
    primaryColor: '#c8102e',
    secondaryColor: '#000000',
    isNationalTeam: true,
    logoUrl: 'https://flagcdn.com/w160/eg.png',
  },

  // --- Group D ---
  'باريس': {
    name: 'باريس',
    shortName: 'PSG',
    primaryColor: '#004170',
    secondaryColor: '#da291c',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
  },
  'اسبانيا': {
    name: 'اسبانيا',
    shortName: 'ESP',
    primaryColor: '#aa151b',
    secondaryColor: '#f1bf00',
    isNationalTeam: true,
    logoUrl: 'https://flagcdn.com/w160/es.png',
  },
  'نابولي': {
    name: 'نابولي',
    shortName: 'NAP',
    primaryColor: '#003366',
    secondaryColor: '#0080ff',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/00/SSC_Napoli_2024_%28deep_blue_navy%29.svg',
  },
  'غزل المحلة': {
    name: 'غزل المحلة',
    shortName: 'MAH',
    primaryColor: '#00bcd4',
    secondaryColor: '#000000',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/61/Ghazl_El_Mahalla_SC_logo.svg',
  },
  'اتلتيكو مدريد': {
    name: 'اتلتيكو مدريد',
    shortName: 'ATM',
    primaryColor: '#cb3524',
    secondaryColor: '#272e61',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Atletico_Madrid_Logo_2024.svg',
  },
  'المانيا': {
    name: 'المانيا',
    shortName: 'GER',
    primaryColor: '#000000',
    secondaryColor: '#dd0000',
    isNationalTeam: true,
    logoUrl: 'https://flagcdn.com/w160/de.png',
  },

  // --- Group E ---
  'استون فيلا': {
    name: 'استون فيلا',
    shortName: 'AVL',
    primaryColor: '#670e36',
    secondaryColor: '#95bfe5',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f9/Aston_Villa_FC_crest_%282016%29.svg',
  },
  'امريكا': {
    name: 'امريكا',
    shortName: 'USA',
    primaryColor: '#002868',
    secondaryColor: '#bf0a30',
    isNationalTeam: true,
    logoUrl: 'https://flagcdn.com/w160/us.png',
  },
  'ارسنال': {
    name: 'ارسنال',
    shortName: 'ARS',
    primaryColor: '#ef0107',
    secondaryColor: '#ffffff',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
  },
  'كولومبيا': {
    name: 'كولومبيا',
    shortName: 'COL',
    primaryColor: '#fcd116',
    secondaryColor: '#003893',
    isNationalTeam: true,
    logoUrl: 'https://flagcdn.com/w160/co.png',
  },
  'المغرب': {
    name: 'المغرب',
    shortName: 'MAR',
    primaryColor: '#c1272d',
    secondaryColor: '#006233',
    isNationalTeam: true,
    logoUrl: 'https://flagcdn.com/w160/ma.png',
  },
  'طرابزون': {
    name: 'طرابزون',
    shortName: 'TS',
    primaryColor: '#800020',
    secondaryColor: '#5bc0de',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Trabzonspor_logo.svg',
  },

  // --- Group F ---
  'بروسيا': {
    name: 'بروسيا',
    shortName: 'BVB',
    primaryColor: '#fde100',
    secondaryColor: '#000000',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg',
  },
  'بايرن': {
    name: 'بايرن',
    shortName: 'FCB',
    primaryColor: '#dc052d',
    secondaryColor: '#0066b2',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg',
  },
  'ريال مدريد': {
    name: 'ريال مدريد',
    shortName: 'RMA',
    primaryColor: '#ffffff',
    secondaryColor: '#00529f',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
  },
  'ايطاليا': {
    name: 'ايطاليا',
    shortName: 'ITA',
    primaryColor: '#0064aa',
    secondaryColor: '#ffffff',
    isNationalTeam: true,
    logoUrl: 'https://flagcdn.com/w160/it.png',
  },
  'اياكس': {
    name: 'اياكس',
    shortName: 'AJX',
    primaryColor: '#d2122e',
    secondaryColor: '#ffffff',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/7/79/Ajax_Amsterdam.svg',
  },
  'تشيلسي': {
    name: 'تشيلسي',
    shortName: 'CFC',
    primaryColor: '#034694',
    secondaryColor: '#ffffff',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg',
  },

  // --- Group G ---
  'مان سيتي': {
    name: 'مان سيتي',
    shortName: 'MCI',
    primaryColor: '#6cabdd',
    secondaryColor: '#1c2c5b',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
  },
  'اكتوبر': {
    name: 'اكتوبر',
    shortName: 'OCT',
    primaryColor: '#059669',
    secondaryColor: '#d97706',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Nile_University_Logo.png',
  },
  'يونايتد': {
    name: 'يونايتد',
    shortName: 'MUN',
    primaryColor: '#da291c',
    secondaryColor: '#fbe122',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
  },
  'الارجنتين': {
    name: 'الارجنتين',
    shortName: 'ARG',
    primaryColor: '#75aadb',
    secondaryColor: '#ffffff',
    isNationalTeam: true,
    logoUrl: 'https://flagcdn.com/w160/ar.png',
  },
  'ليفربول': {
    name: 'ليفربول',
    shortName: 'LIV',
    primaryColor: '#c8102e',
    secondaryColor: '#00b2a9',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg',
  },
  'ليفركوزن': {
    name: 'ليفركوزن',
    shortName: 'B04',
    primaryColor: '#e32221',
    secondaryColor: '#000000',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg',
  },

  // --- Group H ---
  'يوفنتوس': {
    name: 'يوفنتوس',
    shortName: 'JUV',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_logo.svg',
  },
  'الاهلي': {
    name: 'الاهلي',
    shortName: 'ASC',
    primaryColor: '#d00000',
    secondaryColor: '#ffd700',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Al_Ahly_SC_logo_2023.svg',
  },
  'توتنهام': {
    name: 'توتنهام',
    shortName: 'TOT',
    primaryColor: '#132257',
    secondaryColor: '#ffffff',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg',
  },
  'فلسطين': {
    name: 'فلسطين',
    shortName: 'PAL',
    primaryColor: '#000000',
    secondaryColor: '#007a3d',
    isNationalTeam: true,
    logoUrl: 'https://flagcdn.com/w160/ps.png',
  },
  'المكسيك': {
    name: 'المكسيك',
    shortName: 'MEX',
    primaryColor: '#006847',
    secondaryColor: '#ce1126',
    isNationalTeam: true,
    logoUrl: 'https://flagcdn.com/w160/mx.png',
  },
  'البرتغال': {
    name: 'البرتغال',
    shortName: 'POR',
    primaryColor: '#006600',
    secondaryColor: '#ff0000',
    isNationalTeam: true,
    logoUrl: 'https://flagcdn.com/w160/pt.png',
  },
};

// Aliases lookup to match different user inputs
const ALIASES: Record<string, string> = {
  'الاهلي المصري': 'الاهلي',
  'الأهلي': 'الاهلي',
  'نادي القرن': 'الاهلي',
  'زمالك': 'الزمالك',
  'نادي الزمالك': 'الزمالك',
  'مانشستر سيتي': 'مان سيتي',
  'السيتي': 'مان سيتي',
  'مانشستر يونايتد': 'يونايتد',
  'المان يونايتد': 'يونايتد',
  'باريس سان جيرمان': 'باريس',
  'بي اس جي': 'باريس',
  'بايرن ميونخ': 'بايرن',
  'البافاري': 'بايرن',
  'بروسيا دورتموند': 'بروسيا',
  'دورتموند': 'بروسيا',
  'انتر': 'انتر ميلان',
  'إنتر ميلان': 'انتر ميلان',
  'أياكس': 'اياكس',
  'أياكس أمستردام': 'اياكس',
  'أتلتيكو مدريد': 'اتلتيكو مدريد',
  'اتلتيكو': 'اتلتيكو مدريد',
  'أستون فيلا': 'استون فيلا',
  'إنجلترا': 'انجلترا',
  'ألمانيا': 'المانيا',
  'أمريكا': 'امريكا',
  'الولايات المتحدة': 'امريكا',
  'الأرجنتين': 'الارجنتين',
  'إيطاليا': 'ايطاليا',
  'إسبانيا': 'اسبانيا',
  'أكتوبر': 'اكتوبر',
  'مدينة 6 اكتوبر': 'اكتوبر',
  'جامعة النيل': 'اكتوبر',
  'باير ليفركوزن': 'ليفركوزن',
  'إنتر ميامي': 'ميامي',
  'اتلتيكو مينيرو': 'مينيرو',
  'طرابزون سبور': 'طرابزون',
};

export function getTeamLogoData(teamName?: string): TeamLogoData | null {
  if (!teamName) return null;
  const clean = teamName.trim();
  if (TEAM_LOGOS_MAP[clean]) return TEAM_LOGOS_MAP[clean];
  if (ALIASES[clean] && TEAM_LOGOS_MAP[ALIASES[clean]]) {
    return TEAM_LOGOS_MAP[ALIASES[clean]];
  }

  // Partial match search
  const foundKey = Object.keys(TEAM_LOGOS_MAP).find(
    (k) => clean.includes(k) || k.includes(clean)
  );
  if (foundKey) return TEAM_LOGOS_MAP[foundKey];

  return null;
}

export function getTeamLogoUrl(teamName?: string): string | null {
  const data = getTeamLogoData(teamName);
  return data ? data.logoUrl : null;
}

interface TeamLogoProps {
  teamName: string;
  logoUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  alt?: string;
  showFallbackBadge?: boolean;
}

const SIZE_CLASSES = {
  xs: 'w-4 h-4 text-[9px]',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-11 h-11 text-sm',
  xl: 'w-14 h-14 text-base',
  '2xl': 'w-20 h-20 text-xl',
};

const IMG_SIZE_CLASSES = {
  xs: 'w-4 h-4',
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-13 h-13',
  '2xl': 'w-18 h-18',
};

export const TeamLogo: React.FC<TeamLogoProps> = ({
  teamName,
  logoUrl,
  size = 'md',
  className = '',
  alt,
  showFallbackBadge = true,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const data = getTeamLogoData(teamName);

  const effectiveUrl = logoUrl || data?.logoUrl;
  const primaryColor = data?.primaryColor || '#059669';
  const secondaryColor = data?.secondaryColor || '#ffffff';
  const shortText = data?.shortName || teamName.substring(0, 3).toUpperCase();

  // If there's an effective logo URL and it hasn't failed, render the image
  if (effectiveUrl && !imageFailed) {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 ${SIZE_CLASSES[size]} ${className}`}
      >
        <img
          src={effectiveUrl}
          alt={alt || teamName}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className={`${IMG_SIZE_CLASSES[size]} object-contain drop-shadow-md select-none transition-transform hover:scale-105`}
        />
      </div>
    );
  }

  // Graceful authentic SVG shield badge fallback
  if (!showFallbackBadge) return null;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-xl overflow-hidden shadow-md shrink-0 border border-white/20 select-none ${SIZE_CLASSES[size]} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
      }}
      title={teamName}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[0.5px] flex items-center justify-center">
        <span className="font-black text-white drop-shadow font-mono tracking-wider">
          {shortText}
        </span>
      </div>
    </div>
  );
};
