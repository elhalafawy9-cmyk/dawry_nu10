import React, { useState, useRef, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Users, 
  Shield, 
  Trash2, 
  Layers, 
  Sparkles, 
  Check, 
  Search,
  Shirt,
  Info,
  ArrowRight,
  Filter
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Team } from '../App';
import { Player } from '../utils/roster';
import { getTeamLogoUrl } from '../utils/teamLogos';

export interface CsvParsedRow {
  teamName: string;
  group?: string;
  playerName?: string;
  playerNumber?: number;
  position?: 'GK' | 'DEF' | 'MID' | 'FWD';
  studentId?: string;
  isCaptain?: boolean;
}

export interface CsvImportResult {
  teams: Team[];
  squads: Record<string, Player[]>;
  mode: 'replace' | 'merge';
  regenerateMatches: boolean;
}

interface CsvTournamentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTeams: Team[];
  currentSquads: Record<string, Player[]>;
  onApplyImport: (result: CsvImportResult) => void;
}

const COLOR_GRADIENTS = [
  'from-emerald-600 to-teal-800',
  'from-red-600 to-rose-900',
  'from-blue-600 to-indigo-900',
  'from-amber-500 to-orange-800',
  'from-purple-600 to-violet-900',
  'from-cyan-600 to-blue-800',
  'from-yellow-500 to-amber-700',
  'from-fuchsia-600 to-pink-800',
];

export const CsvTournamentUploadModal: React.FC<CsvTournamentUploadModalProps> = ({
  isOpen,
  onClose,
  currentTeams,
  currentSquads,
  onApplyImport,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<CsvParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<'all' | string>('all');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [regenerateMatches, setRegenerateMatches] = useState(true);
  const [previewTab, setPreviewTab] = useState<'by_team' | 'flat_table'>('by_team');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV text with robust delimiter detection & quote handling
  const parseCsv = (csvContent: string) => {
    try {
      setParseError(null);
      // Remove UTF-8 BOM if present
      const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();
      if (!cleanContent) {
        setParsedRows([]);
        return;
      }

      // Split lines (handling \r\n and \n)
      const lines = cleanContent.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        setParseError('الملف يحتوي على صف واحد فقط، يرجى التأكد من وجود صف العناوين وبيانات الفرق واللاعبين.');
        return;
      }

      // Detect delimiter (, or ;)
      const firstLine = lines[0];
      const delimiter = firstLine.includes(';') && (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';

      // Parse line into tokens with quotes support
      const parseLine = (line: string): string[] => {
        const tokens: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            tokens.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        tokens.push(current.trim());
        return tokens.map(t => t.replace(/^["']|["']$/g, '').trim());
      };

      const headers = parseLine(lines[0]).map(h => h.toLowerCase());

      // Helper to match column indices
      const findCol = (keywords: string[]) => {
        return headers.findIndex(h => keywords.some(k => h.includes(k.toLowerCase())));
      };

      const teamCol = findCol(['team', 'فريق', 'النادي', 'اسم الفريق', 'club']);
      const groupCol = findCol(['group', 'مجموعة', 'المجموعة']);
      const playerCol = findCol(['player', 'لاعب', 'اللاعب', 'اسم اللاعب', 'name', 'الاسم']);
      const numberCol = findCol(['number', 'رقم', 'shirt', 'القميص', 'الفانلة', 'no']);
      const posCol = findCol(['position', 'مركز', 'المركز', 'pos']);
      const studentIdCol = findCol(['student', 'id', 'جامعي', 'قيد', 'الرقم الجامعي', 'رقم القيد', 'academic']);
      const captainCol = findCol(['captain', 'كابتن', 'قائد']);

      if (teamCol === -1) {
        setParseError('لم يتم العثور على عمود اسم الفريق في رأس الملف (تأكد من وجود عنوان: الفريق أو Team).');
        return;
      }

      const rows: CsvParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const tokens = parseLine(lines[i]);
        const teamName = tokens[teamCol]?.trim();
        if (!teamName) continue; // Skip empty rows

        let rawGroup = groupCol !== -1 ? tokens[groupCol]?.trim().toUpperCase() : '';
        if (rawGroup && !['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].includes(rawGroup)) {
          // If group is like "Group A" or "المجموعة أ"
          const matchLetter = rawGroup.match(/[A-Ha-h]/);
          rawGroup = matchLetter ? matchLetter[0].toUpperCase() : '';
        }

        const playerName = playerCol !== -1 ? tokens[playerCol]?.trim() : undefined;
        const rawNumber = numberCol !== -1 ? parseInt(tokens[numberCol], 10) : undefined;
        const playerNumber = !isNaN(rawNumber as number) ? rawNumber : undefined;

        // Normalize position
        let position: 'GK' | 'DEF' | 'MID' | 'FWD' | undefined = undefined;
        if (posCol !== -1) {
          const rawPos = (tokens[posCol] || '').toUpperCase();
          if (rawPos.includes('GK') || rawPos.includes('حارس')) position = 'GK';
          else if (rawPos.includes('DEF') || rawPos.includes('دفاع') || rawPos.includes('مدافع')) position = 'DEF';
          else if (rawPos.includes('FWD') || rawPos.includes('هجوم') || rawPos.includes('مهاجم')) position = 'FWD';
          else if (rawPos.includes('MID') || rawPos.includes('وسط') || rawPos.includes('نصف')) position = 'MID';
          else if (rawPos) position = 'MID';
        }

        const studentId = studentIdCol !== -1 ? tokens[studentIdCol]?.trim() : undefined;
        
        let isCaptain = false;
        if (captainCol !== -1) {
          const cVal = (tokens[captainCol] || '').toLowerCase();
          isCaptain = cVal === 'true' || cVal === 'yes' || cVal === '1' || cVal.includes('نعم') || cVal.includes('كابتن');
        }

        rows.push({
          teamName,
          group: rawGroup || undefined,
          playerName: playerName || undefined,
          playerNumber,
          position,
          studentId: studentId || undefined,
          isCaptain,
        });
      }

      if (rows.length === 0) {
        setParseError('لم يتم العثور على أي بيانات صالحة في ملف الـ CSV.');
        return;
      }

      setParsedRows(rows);
    } catch (err: any) {
      console.error('Error parsing CSV:', err);
      setParseError(`حدث خطأ أثناء قراءة الملف: ${err?.message || 'تنسيق غير مدعوم'}`);
    }
  };

  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.txt')) {
      setParseError('يرجى اختيار ملف بصيغة CSV (.csv).');
      return;
    }
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawCsvText(text);
      parseCsv(text);
    };
    reader.readAsText(selectedFile, 'UTF-8');
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  // Download official CSV template
  const handleDownloadTemplate = () => {
    const csvHeader = 'الفريق,المجموعة,اللاعب,الرقم,المركز,الرقم_الجامعي,كابتن\n';
    const sampleRows = [
      'الأهلي,A,محمد الشناوي,1,GK,20241001,نعم',
      'الأهلي,A,محمد هاني,2,DEF,20241002,لا',
      'الأهلي,A,إمام عاشور,8,MID,20241003,لا',
      'الأهلي,A,وسام أبو علي,9,FWD,20241004,لا',
      'الزمالك,A,محمد عواد,1,GK,20242001,لا',
      'الزمالك,A,حمزة المثلوثي,2,DEF,20242002,لا',
      'الزمالك,A,عبد الله السعيد,19,MID,20242003,نعم',
      'الزمالك,A,أحمد سيد زيزو,25,FWD,20242004,لا',
      'برشلونة,B,مارك أندريه تير شتيغن,1,GK,20243001,نعم',
      'برشلونة,B,رونالد أراوخو,4,DEF,20243002,لا',
      'برشلونة,B,بيدري غونزاليس,8,MID,20243003,لا',
      'برشلونة,B,روبرت ليفاندوفسكي,9,FWD,20243004,لا',
      'ريال مدريد,B,تيبو كورتوا,1,GK,20244001,لا',
      'ريال مدريد,B,أنطونيو روديغر,22,DEF,20244002,لا',
      'ريال مدريد,B,فيديريكو فالفيردي,8,MID,20244003,لا',
      'ريال مدريد,B,كيليان مبابي,9,FWD,20244004,نعم',
    ].join('\n');

    // Add UTF-8 BOM so Excel opens Arabic correctly
    const blob = new Blob(['\uFEFF' + csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'نموذج_كشوفات_دوري_جامعة_النيل.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Structured extraction from parsedRows
  const extractedStructure = useMemo(() => {
    const teamsMap = new Map<string, { group?: string; captain?: string }>();
    const squadsMap: Record<string, Player[]> = {};

    const availableGroups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    let groupAssignIndex = 0;

    parsedRows.forEach((r) => {
      if (!teamsMap.has(r.teamName)) {
        teamsMap.set(r.teamName, {
          group: r.group,
          captain: r.isCaptain ? r.playerName : undefined,
        });
        squadsMap[r.teamName] = [];
      } else {
        const existing = teamsMap.get(r.teamName)!;
        if (!existing.group && r.group) existing.group = r.group;
        if (r.isCaptain && r.playerName) existing.captain = r.playerName;
      }

      if (r.playerName) {
        const currentSquad = squadsMap[r.teamName];
        // avoid exact duplicates inside same team
        if (!currentSquad.some(p => p.name.toLowerCase() === r.playerName!.toLowerCase())) {
          currentSquad.push({
            id: `p_csv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: r.playerName,
            number: r.playerNumber || (currentSquad.length + 1),
            position: r.position || 'MID',
            studentId: r.studentId || `2026${String(Math.floor(1000 + Math.random() * 9000))}`,
            isCaptain: !!r.isCaptain,
            isIdentityLocked: false,
          });
        }
      }
    });

    // Build Team objects
    const builtTeams: Team[] = [];
    let colorIdx = 0;

    teamsMap.forEach((info, teamName) => {
      // If no group was specified, assign round-robin across A-H
      const assignedGroup = info.group && availableGroups.includes(info.group)
        ? info.group
        : availableGroups[groupAssignIndex % availableGroups.length];
      
      if (!info.group) {
        groupAssignIndex++;
      }

      const teamObj: Team = {
        id: `t_csv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: teamName,
        group: assignedGroup,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0,
        logoColor: COLOR_GRADIENTS[colorIdx % COLOR_GRADIENTS.length],
        logoUrl: getTeamLogoUrl(teamName) || undefined,
      };

      builtTeams.push(teamObj);
      colorIdx++;
    });

    const totalPlayers = Object.values(squadsMap).reduce((acc, sq) => acc + sq.length, 0);

    return {
      teams: builtTeams,
      squads: squadsMap,
      totalTeams: builtTeams.length,
      totalPlayers,
    };
  }, [parsedRows]);

  // Filtered rows for Flat Table
  const filteredRows = useMemo(() => {
    return parsedRows.filter(r => {
      if (selectedGroupFilter !== 'all' && r.group !== selectedGroupFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTeam = r.teamName.toLowerCase().includes(q);
        const matchesPlayer = (r.playerName || '').toLowerCase().includes(q);
        const matchesId = (r.studentId || '').toLowerCase().includes(q);
        if (!matchesTeam && !matchesPlayer && !matchesId) return false;
      }
      return true;
    });
  }, [parsedRows, selectedGroupFilter, searchQuery]);

  // Group breakdown stats
  const groupStats = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0 };
    extractedStructure.teams.forEach(t => {
      if (counts[t.group] !== undefined) counts[t.group]++;
    });
    return counts;
  }, [extractedStructure.teams]);

  // Handle Apply Import
  const handleConfirmApply = () => {
    if (extractedStructure.teams.length === 0) {
      alert('لا توجد فرق أو لاعبين مستخرجين لتطبيقهم.');
      return;
    }

    let finalTeams: Team[] = [];
    let finalSquads: Record<string, Player[]> = {};

    if (importMode === 'replace') {
      finalTeams = extractedStructure.teams;
      finalSquads = extractedStructure.squads;
    } else {
      // Merge mode
      finalTeams = [...currentTeams];
      finalSquads = { ...currentSquads };

      extractedStructure.teams.forEach(newTeam => {
        const existingIdx = finalTeams.findIndex(t => t.name.toLowerCase() === newTeam.name.toLowerCase());
        if (existingIdx !== -1) {
          // Update group if specified
          if (newTeam.group) finalTeams[existingIdx].group = newTeam.group;
        } else {
          finalTeams.push(newTeam);
        }
      });

      Object.entries(extractedStructure.squads).forEach(([tName, players]) => {
        if (!finalSquads[tName]) {
          finalSquads[tName] = [];
        }
        players.forEach(p => {
          if (!finalSquads[tName].some(ep => ep.name.toLowerCase() === p.name.toLowerCase())) {
            finalSquads[tName].push(p);
          }
        });
      });
    }

    onApplyImport({
      teams: finalTeams,
      squads: finalSquads,
      mode: importMode,
      regenerateMatches,
    });

    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.6 },
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-5 md:p-7 shadow-2xl space-y-6 my-auto max-h-[94vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 font-black shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-black text-white">
                  استيراد هيكل البطولة وقوائم الفرق عبر ملف CSV (Excel)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                  تلقائي وسريع ⚡
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ارفع ملف كشوفات الفرق واللاعبين لتأسيس وتحديث البطولة دفعة واحدة دون الحاجة للإدخال اليدوي.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="space-y-5 overflow-y-auto flex-1 pr-1 pl-1">
          
          {/* Quick Guide & Download Sample Button */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Info className="w-4 h-4 text-teal-400" />
                <span>صيغة الأعمدة المدعومة في الملف:</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                الفريق (Team) • المجموعة (Group A..H) • اللاعب (Player) • الرقم (Number) • المركز (GK, DEF, MID, FWD) • الرقم الجامعي (StudentID) • كابتن (IsCaptain)
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white font-bold text-xs flex items-center gap-2 border border-teal-500/30 transition-all cursor-pointer shrink-0 shadow-sm"
              title="تحميل ملف إكسل CSV تجريبي معبأ مسبقاً"
            >
              <Download className="w-4 h-4 text-teal-400" />
              <span>تحميل نموذج CSV جاهز 📥</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 md:p-8 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-emerald-400 bg-emerald-500/10'
                : file
                ? 'border-teal-500/60 bg-teal-950/20'
                : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileChange(f);
              }}
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <UploadCloud className="w-7 h-7" />
            </div>

            {file ? (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2 text-sm font-black text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>الملف المحدد: {file.name}</span>
                  <span className="text-xs text-slate-400 font-mono">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <p className="text-xs text-emerald-400">
                  تمت قراءة البيانات بنجاح! اضغط لاختيار ملف آخر إذا أردت.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <strong className="text-sm font-black text-white block">
                  اسحب ملف الـ CSV وأفلته هنا، أو اضغط للاختيار من جهازك
                </strong>
                <p className="text-xs text-slate-400">
                  يدعم ملفات Excel (.csv) المشفرة بـ UTF-8 مع كامل الأسماء العربية.
                </p>
              </div>
            )}
          </div>

          {/* Parse Error Display */}
          {parseError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Parsed Structure Preview & Stats */}
          {parsedRows.length > 0 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Summary Stats Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-black">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-bold">الفرق المستخرجة</span>
                    <strong className="text-base font-black text-white">{extractedStructure.totalTeams} فريق</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-bold">إجمالي اللاعبين</span>
                    <strong className="text-base font-black text-white">{extractedStructure.totalPlayers} لاعب</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-black">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-bold">المجموعات المحددة</span>
                    <strong className="text-base font-black text-white">
                      {Object.values(groupStats).filter(c => c > 0).length} / 8 مجموعات
                    </strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-black">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-bold">إجمالي السطور</span>
                    <strong className="text-base font-black text-white">{parsedRows.length} سطر</strong>
                  </div>
                </div>
              </div>

              {/* Group Distribution Bar */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto text-xs">
                <span className="text-slate-400 text-[11px] font-bold shrink-0 ml-1">توزيع المجموعات:</span>
                <div className="flex items-center gap-2">
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(g => (
                    <span 
                      key={g} 
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 border ${
                        groupStats[g] > 0 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      {g}: {groupStats[g]} فرق
                    </span>
                  ))}
                </div>
              </div>

              {/* View Switcher & Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('by_team')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      previewTab === 'by_team'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    عرض حسب الفرق ({extractedStructure.teams.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('flat_table')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      previewTab === 'flat_table'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    الجدول الكامل للأسماء ({filteredRows.length})
                  </button>
                </div>

                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن فريق، لاعب، أو ID..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* PREVIEW TAB 1: BY TEAM CARDS */}
              {previewTab === 'by_team' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
                  {extractedStructure.teams
                    .filter(t => !searchQuery.trim() || t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((team) => {
                      const squad = extractedStructure.squads[team.name] || [];
                      return (
                        <div key={team.name} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black text-xs">
                                {team.group}
                              </span>
                              <strong className="text-white text-xs font-black">{team.name}</strong>
                            </div>
                            <span className="text-[11px] text-teal-400 font-bold bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">
                              {squad.length} لاعبين
                            </span>
                          </div>

                          {squad.length > 0 ? (
                            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                              {squad.map((p, pIdx) => (
                                <div key={p.id || pIdx} className="flex items-center justify-between text-[11px] text-slate-300 py-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-emerald-400 font-bold text-[10px]">#{p.number}</span>
                                    <span>{p.name}</span>
                                    {p.isCaptain && (
                                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-bold">
                                        كابتن
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-mono text-slate-500">ID: {p.studentId}</span>
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                                      p.position === 'GK' ? 'bg-amber-500/20 text-amber-300' :
                                      p.position === 'DEF' ? 'bg-blue-500/20 text-blue-300' :
                                      p.position === 'FWD' ? 'bg-rose-500/20 text-rose-300' :
                                      'bg-emerald-500/20 text-emerald-300'
                                    }`}>
                                      {p.position}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-500 italic py-1">
                              لا يوجد لاعبون مسجلون لهذا الفريق في الملف (تم إنشاء الفريق فارغاً).
                            </p>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* PREVIEW TAB 2: FLAT TABLE */}
              {previewTab === 'flat_table' && (
                <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">الفريق</th>
                        <th className="py-2.5 px-3">المجموعة</th>
                        <th className="py-2.5 px-3">اللاعب</th>
                        <th className="py-2.5 px-3">الرقم</th>
                        <th className="py-2.5 px-3">المركز</th>
                        <th className="py-2.5 px-3">الرقم الجامعي</th>
                        <th className="py-2.5 px-3">كابتن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {filteredRows.slice(0, 100).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 text-slate-300">
                          <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-white">{row.teamName}</td>
                          <td className="py-2 px-3">
                            <span className="font-mono font-bold text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded">
                              {row.group || '—'}
                            </span>
                          </td>
                          <td className="py-2 px-3">{row.playerName || '—'}</td>
                          <td className="py-2 px-3 font-mono">{row.playerNumber !== undefined ? `#${row.playerNumber}` : '—'}</td>
                          <td className="py-2 px-3">
                            {row.position ? (
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                                row.position === 'GK' ? 'bg-amber-500/20 text-amber-300' :
                                row.position === 'DEF' ? 'bg-blue-500/20 text-blue-300' :
                                row.position === 'FWD' ? 'bg-rose-500/20 text-rose-300' :
                                'bg-emerald-500/20 text-emerald-300'
                              }`}>
                                {row.position}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-400">{row.studentId || '—'}</td>
                          <td className="py-2 px-3">
                            {row.isCaptain ? (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                                نعم ⭐
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredRows.length > 100 && (
                    <div className="p-2 text-center text-xs text-slate-500 bg-slate-950 border-t border-slate-800">
                      يتم عرض أول 100 سجل من إجمالي {filteredRows.length} سجل في المعاينة.
                    </div>
                  )}
                </div>
              )}

              {/* Import Mode Selection */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-white block">طريقة تطبيق واعتماد الملف:</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    importMode === 'replace'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-1 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div className="space-y-0.5">
                      <strong className="text-xs font-black text-white block">
                        استبدال هيكل البطولة بالكامل (تأسيس نظيف) 🔄
                      </strong>
                      <p className="text-[11px] text-slate-400">
                        استبدال كافة الفرق الحالية بالفرق الجديدة في الملف، وحفظ قوائم لاعبيها، وتوليد مباريات المجموعات بناءً عليها.
                      </p>
                    </div>
                  </label>

                  <label className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    importMode === 'merge'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-1 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div className="space-y-0.5">
                      <strong className="text-xs font-black text-white block">
                        دمج وإضافة للفرق الحالية (Merge & Append) ➕
                      </strong>
                      <p className="text-[11px] text-slate-400">
                        إضافة الفرق واللاعبين الجدد دون حذف أو التأثير على الفرق الحالية في البطولة.
                      </p>
                    </div>
                  </label>
                </div>

                {importMode === 'replace' && (
                  <label className="flex items-center gap-2 pt-1 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regenerateMatches}
                      onChange={(e) => setRegenerateMatches(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>إعادة توليد وتحديث جدول مباريات دور المجموعات لتتطابق تلقائياً مع الفرق الجديدة المستوردة</span>
                  </label>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            disabled={parsedRows.length === 0}
            onClick={handleConfirmApply}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/30 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02]"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>
              اعتماد واستيراد الهيكل ({extractedStructure.totalTeams} فريق • {extractedStructure.totalPlayers} لاعب)
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
