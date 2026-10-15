import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Shield, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Save, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  MapPin, 
  Shirt, 
  Star, 
  Plus, 
  X, 
  Sparkles, 
  Share2, 
  Check, 
  Copy,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  GraduationCap,
  Lock,
  UserCheck,
  XCircle,
  Bell,
  AlertTriangle,
  Send,
  Camera,
  Image as ImageIcon,
  Key
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Match, Team } from '../App';
import { Player, MatchSubstitution, MatchCardEvent, CardType, MAX_SUBS_PER_TEAM, PlayerRegistrationRequest } from '../utils/roster';
import { MatchScheduleNotification } from '../utils/notifications';
import { ImageUploadModal } from './ImageUploadModal';

interface TeamManagerPortalPageProps {
  teams: Team[];
  matches: Match[];
  squads: Record<string, Player[]>;
  onUpdateSquads: (updatedSquads: Record<string, Player[]>) => void;
  onUpdateMatchLineups?: (matchId: string, teamName: string, starters: string[], bench: string[], substitutions: MatchSubstitution[], cards?: MatchCardEvent[]) => void;
  isAdmin?: boolean;
  assignedTeamName?: string;
  managerName?: string;
  playerRequests?: PlayerRegistrationRequest[];
  matchAlerts?: MatchScheduleNotification[];
  onOpenAlertComposerForMatch?: (match: Match) => void;
  onRequestAddPlayer?: (req: Omit<PlayerRegistrationRequest, 'id' | 'requestedAt' | 'status'>) => void;
  onRequestEditPlayer?: (req: Omit<PlayerRegistrationRequest, 'id' | 'requestedAt' | 'status'>) => void;
  onOpenApprovalsModal?: () => void;
  onOpenAllAlertsModal?: () => void;
  onUpdateTeamLogo?: (teamName: string, newLogoUrl: string) => void;
  onUpdatePlayerPhoto?: (teamName: string, playerId: string, newPhotoUrl: string) => void;
  onNavigateToAssignManagers?: () => void;
  isPlayerEditingOpen?: boolean;
  onTogglePlayerEditing?: (open: boolean) => void;
}

export const TeamManagerPortalPage: React.FC<TeamManagerPortalPageProps> = ({
  teams,
  matches,
  squads,
  onUpdateSquads,
  onUpdateMatchLineups,
  isAdmin = true,
  assignedTeamName,
  managerName,
  playerRequests = [],
  matchAlerts = [],
  onOpenAlertComposerForMatch,
  onRequestAddPlayer,
  onRequestEditPlayer,
  onOpenApprovalsModal,
  onOpenAllAlertsModal,
  onUpdateTeamLogo,
  onUpdatePlayerPhoto,
  onNavigateToAssignManagers,
  isPlayerEditingOpen = true,
  onTogglePlayerEditing,
}) => {
  // Can direct edit if admin OR player editing window is open
  const canDirectEdit = isAdmin || isPlayerEditingOpen;

  // Currently selected team that the manager is managing (locked to assignedTeamName if not admin)
  const initialTeam = (!isAdmin && assignedTeamName) ? assignedTeamName : (teams[0]?.name || 'برشلونة');
  const [managedTeamName, setManagedTeamName] = useState<string>(initialTeam);

  React.useEffect(() => {
    if (!isAdmin && assignedTeamName) {
      setManagedTeamName(assignedTeamName);
    }
  }, [isAdmin, assignedTeamName]);

  // Sub-tabs: 'squad_builder' | 'match_lineup' | 'bulk_paste' | 'registration_requests' | 'match_alerts'
  const [subTab, setSubTab] = useState<'squad_builder' | 'match_lineup' | 'bulk_paste' | 'registration_requests' | 'match_alerts'>('squad_builder');

  // Photo & Logo Upload Modal Configuration
  const [uploadModalConfig, setUploadModalConfig] = useState<{
    isOpen: boolean;
    type: 'player' | 'team';
    title: string;
    subtitle?: string;
    currentImageUrl?: string;
    entityName: string;
    badgeNumberOrGroup?: string;
    targetPlayerId?: string;
  }>({
    isOpen: false,
    type: 'team',
    title: '',
    entityName: '',
  });

  // Modal / Inline Add Player State
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [playerForm, setPlayerForm] = useState<{
    name: string;
    studentId: string;
    number: number;
    position: 'GK' | 'DEF' | 'MID' | 'FWD';
    isCaptain: boolean;
    photoUrl: string;
    editReason: string;
  }>({
    name: '',
    studentId: '',
    number: 10,
    position: 'MID',
    isCaptain: false,
    photoUrl: '',
    editReason: '',
  });

  // Bulk paste players
  const [bulkText, setBulkText] = useState<string>('');
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Selected match for lineup submission
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  const managedTeam = useMemo(() => {
    return teams.find(t => t.name === managedTeamName) || teams[0];
  }, [teams, managedTeamName]);

  const currentSquad = useMemo(() => {
    return squads[managedTeamName] || [];
  }, [squads, managedTeamName]);

  // Team matches
  const teamMatches = useMemo(() => {
    return matches.filter(m => m.teamA === managedTeamName || m.teamB === managedTeamName);
  }, [matches, managedTeamName]);

  const activeMatch = useMemo(() => {
    if (selectedMatchId) {
      return teamMatches.find(m => m.id === selectedMatchId) || teamMatches[0];
    }
    return teamMatches[0];
  }, [teamMatches, selectedMatchId]);

  const teamPendingRequests = useMemo(() => {
    return (playerRequests || []).filter(r => r.teamName === managedTeamName);
  }, [playerRequests, managedTeamName]);

  const managedTeamAlerts = useMemo(() => {
    return (matchAlerts || []).filter(a => a.targetTeams.includes(managedTeamName));
  }, [matchAlerts, managedTeamName]);

  // Participation local state for active match
  const isTeamA = activeMatch?.teamA === managedTeamName;
  const [starters, setStarters] = useState<string[]>([]);
  const [bench, setBench] = useState<string[]>([]);
  const [substitutions, setSubstitutions] = useState<MatchSubstitution[]>([]);
  const [cards, setCards] = useState<MatchCardEvent[]>([]);

  // Substitution Form inside manager view
  const [newSubForm, setNewSubForm] = useState({
    minute: 60,
    playerOut: '',
    playerIn: '',
  });

  // Card Form inside manager view
  const [newCardForm, setNewCardForm] = useState<{ minute: number; playerName: string; cardType: CardType; reason: string }>({
    minute: 45,
    playerName: '',
    cardType: 'yellow',
    reason: '',
  });

  // Sync lineup when active match or squad changes
  React.useEffect(() => {
    if (activeMatch) {
      const matchLineups = (activeMatch as any).lineups;
      const teamLineup = isTeamA
        ? { starters: matchLineups?.teamAStarters, bench: matchLineups?.teamABench }
        : { starters: matchLineups?.teamBStarters, bench: matchLineups?.teamBBench };

      if (teamLineup?.starters && teamLineup.starters.length > 0) {
        setStarters(teamLineup.starters);
        setBench(teamLineup.bench || []);
      } else {
        // Defaults: first 6 are starters, rest are bench
        const squadNames = currentSquad.map(p => p.name);
        setStarters(squadNames.slice(0, 6));
        setBench(squadNames.slice(6));
      }

      const subs = ((activeMatch as any).substitutions as MatchSubstitution[]) || [];
      const teamSubs = subs.filter(s => s.team === managedTeamName);
      setSubstitutions(teamSubs);

      const matchCards = ((activeMatch as any).cards as MatchCardEvent[]) || [];
      const teamCards = matchCards.filter(c => c.team === managedTeamName);
      setCards(teamCards);
    }
  }, [activeMatch, isTeamA, currentSquad, managedTeamName]);

  // Toggle starter/bench
  const handleToggleStarterBench = (name: string) => {
    if (starters.includes(name)) {
      setStarters(prev => prev.filter(p => p !== name));
      setBench(prev => [...prev, name]);
    } else {
      setBench(prev => prev.filter(p => p !== name));
      setStarters(prev => [...prev, name]);
    }
  };

  // Add sub (بحد أقصى 5 تبديلات)
  const handleAddSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (substitutions.length >= MAX_SUBS_PER_TEAM) {
      alert(`عذراً، وصل الفريق للحد الأقصى للتبديلات (${MAX_SUBS_PER_TEAM} تبديلات فقط لكل فريق وفقاً للوائح البطولة).`);
      return;
    }
    if (!newSubForm.playerOut || !newSubForm.playerIn) {
      alert('يرجى اختيار اللاعب الخارج واللاعب البديل');
      return;
    }
    if (newSubForm.playerOut === newSubForm.playerIn) {
      alert('لا يمكن أن يكون اللاعب الخارج هو نفسه اللاعب البديل');
      return;
    }
    const sub: MatchSubstitution = {
      id: `sub_${Date.now()}`,
      minute: Number(newSubForm.minute),
      playerOut: newSubForm.playerOut,
      playerIn: newSubForm.playerIn,
      team: managedTeamName,
    };
    setSubstitutions(prev => [...prev, sub]);
    setNewSubForm({ minute: 60, playerOut: '', playerIn: '' });
  };

  // Add card
  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardForm.playerName) {
      alert('يرجى اختيار اللاعب الحاصل على البطاقة');
      return;
    }
    let assignedType = newCardForm.cardType;
    const existingYellow = cards.find(c => c.playerName === newCardForm.playerName && c.cardType === 'yellow');
    if (existingYellow && newCardForm.cardType === 'yellow') {
      assignedType = 'second_yellow';
      alert(`تنبيه: اللاعب ${newCardForm.playerName} حاصل على إنذار أصفر سابق! تم تسجيل هذا الإنذار كـ "إنذار ثانٍ ثم طرد بالبطاقة الحمراء 🟨🟥"`);
    }
    const card: MatchCardEvent = {
      id: `card_${Date.now()}`,
      minute: Number(newCardForm.minute) || 45,
      playerName: newCardForm.playerName,
      team: managedTeamName,
      cardType: assignedType,
      reason: newCardForm.reason.trim() || undefined,
    };
    setCards(prev => [...prev, card]);
    setNewCardForm({ minute: 45, playerName: '', cardType: 'yellow', reason: '' });
  };

  const handleSaveLineup = () => {
    if (!activeMatch || !onUpdateMatchLineups) return;
    onUpdateMatchLineups(
      activeMatch.id,
      managedTeamName,
      starters,
      bench,
      substitutions,
      cards
    );
    confetti({ particleCount: 50, spread: 60 });
    alert(`تم اعتماد وحفظ تشكيل وتبديلات وبطاقات ${managedTeamName} لمباراة ${activeMatch.teamA} ضد ${activeMatch.teamB} بنجاح! 📋✨`);
  };

  // Photo Modal Save Handler
  const handleSaveModalImage = (newUrl: string) => {
    if (uploadModalConfig.type === 'team') {
      if (onUpdateTeamLogo) {
        onUpdateTeamLogo(managedTeamName, newUrl);
      } else {
        const updatedTeams = teams.map(t => t.name === managedTeamName ? { ...t, logoUrl: newUrl || undefined } : t);
        try {
          localStorage.setItem('dawry_teams_custom_v1', JSON.stringify(updatedTeams));
        } catch {}
      }
      confetti({ particleCount: 30, spread: 50 });
      alert(`تم تحديث شعار فريق (${managedTeamName}) بنجاح! 🏆✨`);
    } else if (uploadModalConfig.type === 'player' && uploadModalConfig.targetPlayerId) {
      if (onUpdatePlayerPhoto) {
        onUpdatePlayerPhoto(managedTeamName, uploadModalConfig.targetPlayerId, newUrl);
      } else {
        const updated = currentSquad.map(p => p.id === uploadModalConfig.targetPlayerId ? { ...p, photoUrl: newUrl || undefined } : p);
        onUpdateSquads({ ...squads, [managedTeamName]: updated });
      }
      confetti({ particleCount: 30, spread: 50 });
      alert(`تم تحديث صورة اللاعب بنجاح! 📸✅`);
    }
  };

  // Player Save
  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerForm.name.trim()) return;

    if (editingPlayer) {
      if (canDirectEdit) {
        // DIRECT EDIT (Admin or Player Editing Window is Open)
        const updated = currentSquad.map(p => {
          if (p.id === editingPlayer.id) {
            return {
              ...p,
              name: playerForm.name.trim(),
              studentId: playerForm.studentId.trim() || p.studentId,
              number: Number(playerForm.number),
              position: playerForm.position,
              isCaptain: playerForm.isCaptain,
              photoUrl: playerForm.photoUrl || p.photoUrl,
              isIdentityLocked: true,
            };
          }
          return p;
        });
        onUpdateSquads({ ...squads, [managedTeamName]: updated });
        setIsAddingPlayer(false);
        setEditingPlayer(null);
        setPlayerForm({ name: '', studentId: '', number: 10, position: 'MID', isCaptain: false, photoUrl: '', editReason: '' });
        confetti({ particleCount: 30, spread: 40 });
        alert(isAdmin 
          ? `تم تعديل بيانات وصورة اللاعب (${playerForm.name.trim()}) مباشرة بصلاحية الأدمن 👑` 
          : `تم حفظ وتعديل بيانات اللاعب (${playerForm.name.trim()}) في قائمة فريق ${managedTeamName} مباشرة بنجاح! ⚡✅`
        );
      } else {
        // TEAM MANAGER / NON-ADMIN WHEN EDITING IS LOCKED:
        // Must send an Edit Request to Admin for approval!
        if (onRequestEditPlayer) {
          onRequestEditPlayer({
            type: 'edit',
            playerId: editingPlayer.id,
            teamName: managedTeamName,
            playerName: playerForm.name.trim(),
            studentId: playerForm.studentId.trim() || editingPlayer.studentId,
            playerNumber: Number(playerForm.number),
            playerPosition: playerForm.position,
            isCaptain: playerForm.isCaptain,
            photoUrl: playerForm.photoUrl || editingPlayer.photoUrl,
            editReason: playerForm.editReason.trim() || 'طلب تعديل بيانات اللاعب الرسمية',
            originalPlayer: {
              name: editingPlayer.name,
              studentId: editingPlayer.studentId,
              number: editingPlayer.number,
              position: editingPlayer.position,
              isCaptain: editingPlayer.isCaptain,
              photoUrl: editingPlayer.photoUrl,
            },
            requestedBy: managerName || `مسؤول فريق ${managedTeamName}`,
          });
        }
        setIsAddingPlayer(false);
        setEditingPlayer(null);
        setPlayerForm({ name: '', studentId: '', number: 10, position: 'MID', isCaptain: false, photoUrl: '', editReason: '' });
        alert(`تم إرسال طلب تعديل اللاعب (${playerForm.name}) لمدير البطولة (Admin) للموافقة عليه واعتماده ⏳🔒`);
      }
    } else {
      // Adding new player:
      if (!playerForm.studentId.trim()) {
        alert('يرجى إدخال الرقم الجامعي للطالب (Student ID) بشكل صحيح.');
        return;
      }

      if (canDirectEdit) {
        // DIRECT ADD (Admin or Player Editing Window is Open)
        const newP: Player = {
          id: `p_${Date.now()}`,
          name: playerForm.name.trim(),
          studentId: playerForm.studentId.trim(),
          number: Number(playerForm.number),
          position: playerForm.position,
          isCaptain: playerForm.isCaptain,
          photoUrl: playerForm.photoUrl || undefined,
          isIdentityLocked: true,
        };
        onUpdateSquads({ ...squads, [managedTeamName]: [...currentSquad, newP] });
        setIsAddingPlayer(false);
        setEditingPlayer(null);
        setPlayerForm({ name: '', studentId: '', number: currentSquad.length + 2, position: 'MID', isCaptain: false, photoUrl: '', editReason: '' });
        confetti({ particleCount: 40, spread: 50 });
        alert(`تمت إضافة وتسجيل اللاعب (${newP.name}) في قائمة فريق ${managedTeamName} مباشرة بنجاح! 🎉⚽`);
      } else {
        // TEAM MANAGER WHEN EDITING IS LOCKED: Send request to Admin for approval
        if (onRequestAddPlayer) {
          onRequestAddPlayer({
            type: 'add',
            teamName: managedTeamName,
            playerName: playerForm.name.trim(),
            playerNumber: Number(playerForm.number),
            playerPosition: playerForm.position,
            isCaptain: playerForm.isCaptain,
            studentId: playerForm.studentId.trim(),
            photoUrl: playerForm.photoUrl || undefined,
            requestedBy: managerName || `مسؤول فريق ${managedTeamName}`,
          });
        }
        setIsAddingPlayer(false);
        setEditingPlayer(null);
        setPlayerForm({ name: '', studentId: '', number: currentSquad.length + 1, position: 'MID', isCaptain: false, photoUrl: '', editReason: '' });
        alert(`تم إرسال طلب قيد اللاعب (${playerForm.name}) والـ ID (${playerForm.studentId}) لمدير البطولة (Admin) للموافقة عليه واعتماده رسمياً! ⏳🔒`);
      }
    }
  };

  const handleDeletePlayer = (playerId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا اللاعب من قائمة الفريق؟')) {
      const updated = currentSquad.filter(p => p.id !== playerId);
      onUpdateSquads({ ...squads, [managedTeamName]: updated });
    }
  };

  // Bulk add players from multiline text
  const handleBulkAddPlayers = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const existingNames = new Set(currentSquad.map(p => p.name.trim().toLowerCase()));
    const newPlayers: Player[] = [];

    lines.forEach((line, idx) => {
      // Possible formats: "10 - محمد صلاح - 20230114" or "محمد صلاح (10)"
      let name = line;
      let num = currentSquad.length + idx + 1;
      let pos: 'GK' | 'DEF' | 'MID' | 'FWD' = 'MID';
      let studentId = `${2021 + ((idx + currentSquad.length) % 4)}${1000 + currentSquad.length + idx}`;

      const matchId = line.match(/(?:ID|رقم)[:\s]*(\d{7,10})/i);
      if (matchId) {
        studentId = matchId[1];
        line = line.replace(matchId[0], '').trim();
      }

      const matchNum = line.match(/^(\d+)[-.\s]+(.+)$/);
      if (matchNum) {
        num = parseInt(matchNum[1], 10) || num;
        name = matchNum[2].trim();
      } else {
        const matchTrailingNum = line.match(/^(.+?)\s*\((\d+)\)$/);
        if (matchTrailingNum) {
          name = matchTrailingNum[1].trim();
          num = parseInt(matchTrailingNum[2], 10) || num;
        }
      }

      if (idx === 0 && currentSquad.length === 0) pos = 'GK';
      else if (idx <= 3) pos = 'DEF';
      else if (idx <= 6) pos = 'MID';
      else pos = 'FWD';

      if (!existingNames.has(name.toLowerCase())) {
        newPlayers.push({
          id: `p_${Date.now()}_${idx}`,
          name,
          number: num,
          position: pos,
          isCaptain: idx === 0 && currentSquad.length === 0,
          studentId,
          isIdentityLocked: true,
        });
      }
    });

    if (newPlayers.length === 0) {
      alert('جميع الأسماء المكتوبة موجودة بالفعل في قائمة الفريق!');
      return;
    }

    if (!canDirectEdit) {
      newPlayers.forEach(p => {
        if (onRequestAddPlayer) {
          onRequestAddPlayer({
            teamName: managedTeamName,
            playerName: p.name,
            playerNumber: p.number,
            playerPosition: p.position,
            isCaptain: p.isCaptain,
            studentId: p.studentId,
            requestedBy: managerName || `مسؤول فريق ${managedTeamName}`,
          });
        }
      });
      setBulkText('');
      alert(`تم إرسال طلبات قيد (${newPlayers.length}) لاعبين لمدير البطولة (Admin) للمراجعة والموافقة الرسمية! ⏳`);
    } else {
      onUpdateSquads({
        ...squads,
        [managedTeamName]: [...currentSquad, ...newPlayers],
      });
      setBulkText('');
      confetti({ particleCount: 70, spread: 80 });
      alert(`تمت إضافة ${newPlayers.length} لاعبين إلى فريق ${managedTeamName} مباشرة واعتماد بياناتهم بنجاح! 🎉⚡`);
    }
  };

  const copyShareRoster = () => {
    const text = `📋 قائمة لاعبي فريق: ${managedTeamName}\n` +
      `المجموعة: ${managedTeam.group}\n` +
      `عدد اللاعبين المسجلين: ${currentSquad.length}\n\n` +
      currentSquad.map((p, idx) => `${idx + 1}. #${p.number} - ${p.name} (${p.position})${p.isCaptain ? ' 👑 كابتن' : ''}`).join('\n') +
      `\n\nدوري جامعة النيل 2026 🏆`;

    navigator.clipboard.writeText(text);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Manager Control Center Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-emerald-500/40 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              بوابة مسؤولي ومدربي الفرق • تسجيل قوائم اللاعبين
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              صفحة مسؤول الفريق: إضافة وتعديل أسماء لاعبيك وتشكيلات المباريات 📋
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              يمكن لمسؤول كل فرقة الدخول هنا، اختيار فريقه، وإضافة أسماء لاعبيه وأرقام قمصانهم ومراكزهم، أو لصق قائمة الأسماء دفعة واحدة، وتحديد تشكيل من سيلعب أساسياً ومن على الدكة.
            </p>
          </div>

          {/* Quick Share / Export Button */}
          <div className="shrink-0 flex flex-wrap items-center gap-2.5">
            <button
              onClick={copyShareRoster}
              className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg"
              title="نسخ قائمة الفريق لمشاركتها على واتساب"
            >
              {copiedShareLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedShareLink ? 'تم نسخ القائمة!' : 'نسخ قائمة الفريق لواتساب'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Team Selection Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin ? (
            <>
              <label className="text-xs font-black text-slate-300 flex items-center gap-1.5 shrink-0">
                <Shield className="w-4 h-4 text-emerald-400" />
                اختر الفريق الذي تديره (تحكم الأدمن 👑):
              </label>
              <select
                value={managedTeamName}
                onChange={(e) => setManagedTeamName(e.target.value)}
                className="bg-slate-950 border-2 border-emerald-500/40 text-white font-black text-sm rounded-2xl px-4 py-2.5 min-w-[220px] focus:outline-none focus:border-emerald-400 shadow-inner"
              >
                {teams.map(t => (
                  <option key={t.id} value={t.name}>
                    {t.name} (المجموعة {t.group})
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-black text-slate-300 flex items-center gap-1.5 shrink-0">
                <Shield className="w-4 h-4 text-emerald-400" />
                فريقك المعتمد كمسؤول:
              </span>
              <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-black text-sm flex items-center gap-2 shadow-sm">
                <span>{managedTeamName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold">
                  مسؤول الفريق المعتمد 📋
                </span>
              </div>
            </div>
          )}

          {/* Active Team Badge & Change Logo Button */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${managedTeam.logoColor} flex items-center justify-center overflow-hidden shrink-0 border border-white/10 shadow-sm`}>
              {managedTeam.logoUrl ? (
                <img src={managedTeam.logoUrl} alt={managedTeam.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[11px] font-black text-white">{managedTeam.name.charAt(0)}</span>
              )}
            </div>
            <span className="text-slate-400">المجموعة:</span>
            <strong className="text-emerald-400 font-mono">{managedTeam.group}</strong>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">اللاعبين:</span>
            <strong className="text-white font-mono">{currentSquad.length}</strong>
          </div>

          {/* Edit Team Logo Button (Admin or Team Manager can do it!) */}
          <button
            type="button"
            onClick={() => {
              setUploadModalConfig({
                isOpen: true,
                type: 'team',
                title: `شعار وصورة فريق: ${managedTeamName}`,
                subtitle: 'رفع شعار أو صورة رسمية للفريق لعرضها في جداول المباريات وترتيب المجموعات',
                currentImageUrl: managedTeam.logoUrl || '',
                entityName: managedTeamName,
                badgeNumberOrGroup: `المجموعة ${managedTeam.group}`,
              });
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-xs flex items-center gap-1.5 border border-amber-500/40 transition-all cursor-pointer shadow-sm"
            title="إضافة أو تعديل شعار وصورة الفريق"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>شعار الفريق 📷</span>
          </button>

          {/* Quick jump to Assign Team Managers for Admin */}
          {isAdmin && onNavigateToAssignManagers && (
            <button
              type="button"
              onClick={onNavigateToAssignManagers}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer mr-1"
              title="صفحة تعيين وتوزيع مسؤولي الفرق (إيميل + باسورد + فرقة)"
            >
              <Key className="w-3.5 h-3.5 text-slate-950" />
              <span>تعيين وتوزيع مسؤولي الفرق 👔</span>
            </button>
          )}
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
          <button
            onClick={() => setSubTab('squad_builder')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'squad_builder'
                ? 'bg-emerald-600 text-white shadow font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            قائمة اللاعبين ({currentSquad.length})
          </button>

          <button
            onClick={() => setSubTab('bulk_paste')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'bulk_paste'
                ? 'bg-emerald-600 text-white shadow font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            إضافة سريعة باللصق ⚡
          </button>

          <button
            onClick={() => setSubTab('match_lineup')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'match_lineup'
                ? 'bg-emerald-600 text-white shadow font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            تشكيل المباراة ومين لعب ⚽
          </button>

          <button
            onClick={() => setSubTab('registration_requests')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'registration_requests'
                ? 'bg-amber-500 text-slate-950 shadow font-black'
                : 'text-amber-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>طلبات القيد ({teamPendingRequests.length})</span>
            {teamPendingRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setSubTab('match_alerts')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'match_alerts'
                ? 'bg-blue-600 text-white shadow font-black'
                : 'text-blue-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>تنبيهات المواعيد والملاعب ({managedTeamAlerts.length})</span>
          </button>

          {isAdmin && onOpenApprovalsModal && (
            <button
              onClick={onOpenApprovalsModal}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow cursor-pointer mr-auto"
              title="فتح لوحة مراجعة واعتماد طلبات اللاعبين"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>اعتماد الطلبات 👑</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Player Editing Window Banner & Quick Admin Toggle */}
      <div className={`p-4 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg ${
        isPlayerEditingOpen
          ? 'bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/40 border-emerald-500/40'
          : 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 border-amber-500/40'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
            isPlayerEditingOpen
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}>
            {isPlayerEditingOpen ? <Sparkles className="w-5 h-5 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} /> : <Lock className="w-5 h-5 text-amber-400" />}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <strong className="text-xs md:text-sm font-black text-white">
                {isPlayerEditingOpen
                  ? 'فترة تعديل وقيد اللاعبين: مفتوحة حالياً 🟢'
                  : 'فترة تعديل وقيد اللاعبين: مقفلة رسمياً 🔒'}
              </strong>
              <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                isPlayerEditingOpen
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {isPlayerEditingOpen ? 'تعديل وقيد مباشر متاح ⚡' : 'يتطلب اعتماد الأدمن ⏳'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {isPlayerEditingOpen
                ? 'يمكن لمسؤولي ومدربي الفرق إضافة وتعديل أسماء اللاعبين، وأرقام الـ ID، والمراكز، وأرقام القمصان، والصور مباشرة دون انتظار موافقة الإدارة.'
                : 'القوائم مقفلة ومعتمدة. أي إضافة أو تعديل تتطلب تقديم طلب للأدمن لمراجعته واعتماده.'}
            </p>
          </div>
        </div>

        {/* Admin Quick Switch Toggle */}
        {isAdmin && onTogglePlayerEditing && (
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => onTogglePlayerEditing(!isPlayerEditingOpen)}
              className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                isPlayerEditingOpen
                  ? 'bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 shadow-rose-500/10'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-emerald-500/20'
              }`}
              title="تغيير حالة فترة التعديل في أي وقت للأدمن"
            >
              {isPlayerEditingOpen ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>قفل التعديل المباشر 🔒</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>فتح التعديل المباشر للفرق 🟢</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* SUB-TAB 1: SQUAD BUILDER */}
      {subTab === 'squad_builder' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              لاعبي فريق {managedTeamName} ({currentSquad.length} لاعبين)
            </h3>

            <button
              onClick={() => {
                setEditingPlayer(null);
                setPlayerForm({ name: '', studentId: '', number: currentSquad.length + 1, position: 'MID', isCaptain: false, photoUrl: '', editReason: '' });
                setIsAddingPlayer(true);
              }}
              className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              إضافة لاعب جديد
            </button>
          </div>

          {/* Add / Edit Player Modal / Drawer */}
          {isAddingPlayer && (
            <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Shirt className="w-4 h-4 text-emerald-400" />
                  <strong className="text-sm font-black text-emerald-300">
                    {editingPlayer 
                      ? (canDirectEdit 
                          ? (isAdmin ? `تعديل مباشر لبيانات اللاعب: ${editingPlayer.name} (صلاحية الأدمن 👑)` : `تعديل بيانات اللاعب: ${editingPlayer.name} (تعديل مباشر ⚡)`)
                          : `طلب تعديل بيانات اللاعب: ${editingPlayer.name}`)
                      : `إضافة وتسجيل لاعب جديد إلى ${managedTeamName}`}
                  </strong>
                  {editingPlayer?.isIdentityLocked && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      canDirectEdit 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {canDirectEdit ? (
                        <>
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          <span>تعديل مباشر متاح 🟢</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span>معتمد ومقفل — يتطلب موافقة الأدمن للتعديل 🔒</span>
                        </>
                      )}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsAddingPlayer(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Informational Banner for Team Manager */}
              {editingPlayer && (
                canDirectEdit && !isAdmin ? (
                  <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <strong className="text-white block font-black">فترة التعديل المباشر مفتوحة 🟢⚡</strong>
                      <p className="text-[11px] text-slate-300">
                        يمكنك تعديل اسم اللاعب، الرقم الجامعي، رقم القميص، المركز، أو الصورة الشخصية مباشرة وسيتم تطبيقها فوراً في القائمة الرسمية.
                      </p>
                    </div>
                  </div>
                ) : !canDirectEdit ? (
                  <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 text-xs text-indigo-300 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <strong className="text-white block font-black">حماية بيانات وهوية اللاعب 🔒</strong>
                      <p className="text-[11px] text-slate-300">
                        بيانات اللاعب ورقم الـ ID مقفلان رسمياً لمنع التلاعب. عند تعديل أي بيانات هنا وكتابة سبب التعديل، سيصل طلبك مباشرة إلى حساب الأدمن، وسيقوم بمراجعة الفروقات واعتماد التعديل أو رفضه.
                      </p>
                    </div>
                  </div>
                ) : null
              )}

              <form onSubmit={handleSavePlayer} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs text-slate-400 font-bold flex items-center justify-between">
                    <span>اسم اللاعب بالكامل *:</span>
                    {editingPlayer?.isIdentityLocked && !isAdmin && (
                      <span className="text-[10px] text-amber-400 font-mono flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        (مقفل — إرسال طلب للأدمن)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أحمد مصطفى"
                    value={playerForm.name}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs text-slate-400 font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                      الرقم الجامعي للطالب (ID) *:
                    </span>
                    {editingPlayer?.isIdentityLocked && !isAdmin && (
                      <span className="text-[10px] text-amber-400 font-mono flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        (مقفل — إرسال طلب للأدمن)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 20230555"
                    value={playerForm.studentId}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, studentId: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                  {!editingPlayer && (
                    <span className="text-[10px] text-amber-400/90 block font-bold">
                      ⚠️ بمجرد اعتماد اللاعب، يُقفل الاسم والـ ID نهائياً ولا يمكن تغييرهما إلا بطلب للأدمن 🔒
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold">رقم القميص:</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    required
                    value={playerForm.number}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, number: parseInt(e.target.value, 10) || 1 }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold">المركز:</label>
                  <select
                    value={playerForm.position}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, position: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="GK">حارس مرمى (GK)</option>
                    <option value="DEF">مدافع (DEF)</option>
                    <option value="MID">خط وسط (MID)</option>
                    <option value="FWD">مهاجم (FWD)</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-300">
                    <input
                      type="checkbox"
                      checked={playerForm.isCaptain}
                      onChange={(e) => setPlayerForm(prev => ({ ...prev, isCaptain: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span>تعيين هذا اللاعب كقائد للفريق (الكابتن 👑)</span>
                  </label>
                </div>

                {/* Player Photo Section in Form */}
                <div className="md:col-span-4 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-teal-400" />
                      <span>صورة اللاعب الرسمية (اختياري):</span>
                    </label>
                    {playerForm.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPlayerForm(prev => ({ ...prev, photoUrl: '' }))}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                      >
                        إزالة الصورة ✕
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {playerForm.photoUrl ? (
                        <img src={playerForm.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Shirt className="w-6 h-6 text-slate-500" />
                      )}
                    </div>

                    <div className="flex-1 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadModalConfig({
                            isOpen: true,
                            type: 'player',
                            title: `صورة اللاعب: ${playerForm.name || 'لاعب جديد'}`,
                            subtitle: 'رفع صورة شخصية أو اختيار نموذج مقترح',
                            currentImageUrl: playerForm.photoUrl || '',
                            entityName: playerForm.name || 'لاعب جديد',
                            badgeNumberOrGroup: `#${playerForm.number}`,
                            targetPlayerId: '__FORM__',
                          });
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-slate-950 font-bold text-xs flex items-center gap-1.5 border border-teal-500/40 transition-colors cursor-pointer shadow-sm"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{playerForm.photoUrl ? 'تغيير الصورة 📷' : 'رفع / اختيار صورة للاعب 📷'}</span>
                      </button>

                      <input
                        type="url"
                        placeholder="أو الصق رابط صورة (URL) مباشر..."
                        value={playerForm.photoUrl}
                        onChange={(e) => setPlayerForm(prev => ({ ...prev, photoUrl: e.target.value }))}
                        className="flex-1 min-w-[200px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                {/* Reason for modification (Only when editing and direct edit is NOT open) */}
                {editingPlayer && !canDirectEdit && (
                  <div className="md:col-span-4 space-y-1 bg-slate-950/60 p-3 rounded-xl border border-indigo-500/30">
                    <label className="text-xs text-indigo-300 font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
                      سبب طلب التعديل (سيظهر لإدارة البطولة والأدمن للموافقة) *:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: تصحيح خطأ إملائي في اسم الطالب، أو تحديث الرقم الجامعي الرسمي، أو تغيير رقم القميص..."
                      value={playerForm.editReason}
                      onChange={(e) => setPlayerForm(prev => ({ ...prev, editReason: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div className="md:col-span-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                  <div className="text-xs text-slate-400">
                    {canDirectEdit ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span>{isAdmin ? 'صلاحية الأدمن: حفظ وتعديل فوري ومباشر 👑' : 'فترة التعديل مفتوحة: حفظ وتعديل مباشر في القائمة الرسمية ⚡'}</span>
                      </span>
                    ) : (
                      editingPlayer ? (
                        <span className="flex items-center gap-1.5 text-indigo-300">
                          <Clock className="w-4 h-4 text-indigo-400" />
                          سيتم إرسال طلب التعديل للأدمن لمراجعته والموافقة عليه ⏳
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-amber-300">
                          <Clock className="w-4 h-4 text-amber-400" />
                          سيتم إرسال طلب القيد للأدمن للاعتماد والموافقة أولاً قبل نزوله في القائمة ⏳
                        </span>
                      )
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingPlayer(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
                    >
                      {canDirectEdit ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{editingPlayer ? 'حفظ التعديلات مباشرة 💾' : 'إضافة وتسجيل اللاعب فوراً ⚡'}</span>
                        </>
                      ) : (
                        editingPlayer ? (
                          <>
                            <Clock className="w-4 h-4" />
                            <span>إرسال طلب التعديل للأدمن للموافقة 📨</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4" />
                            <span>إرسال طلب القيد للأدمن للموافقة 🚀</span>
                          </>
                        )
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Players Table / Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentSquad.map((player) => {
              const hasPendingEdit = (playerRequests || []).some(
                r => r.type === 'edit' && r.status === 'pending' && (r.playerId === player.id || r.playerName === player.name)
              );

              return (
                <div
                  key={player.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3">
                    {/* Player Photo Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shadow-inner ring-1 ring-slate-800">
                        {player.photoUrl ? (
                          <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-emerald-400 font-mono font-black text-xs">
                            <Shirt className="w-4 h-4 text-emerald-500/60 mb-0.5" />
                            <span>{player.number}</span>
                          </div>
                        )}
                      </div>
                      <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-md bg-emerald-500 text-slate-950 font-mono font-black text-[9px] shadow">
                        #{player.number}
                      </span>
                    </div>

                    <div>
                      <strong className="text-sm font-bold text-white block group-hover:text-emerald-300 transition-colors">
                        {player.name}
                      </strong>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          player.position === 'GK'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            : player.position === 'DEF'
                            ? 'bg-blue-950 text-blue-300 border border-blue-500/30'
                            : player.position === 'MID'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                        }`}>
                          {player.position}
                        </span>
                        {player.isCaptain && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-0.5 border border-amber-500/30">
                            👑 كابتن
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-slate-950 text-emerald-400 text-[10px] font-mono font-bold border border-slate-800 flex items-center gap-1">
                          <GraduationCap className="w-3 h-3 text-emerald-400" />
                          ID: {player.studentId || '—'}
                          {canDirectEdit ? (
                            <span title="تعديل مباشر متاح 🟢"><Check className="w-2.5 h-2.5 text-emerald-400" /></span>
                          ) : (
                            <span title="مقفل ومحمي"><Lock className="w-2.5 h-2.5 text-slate-500" /></span>
                          )}
                        </span>
                        {hasPendingEdit && (
                          <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/40 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-indigo-400" />
                            طلب تعديل قيد المراجعة ⏳
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Quick Player Photo Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setUploadModalConfig({
                          isOpen: true,
                          type: 'player',
                          title: `صورة اللاعب: ${player.name}`,
                          subtitle: `فريق ${managedTeamName} • رقم #${player.number} (${player.position})`,
                          currentImageUrl: player.photoUrl || '',
                          entityName: player.name,
                          badgeNumberOrGroup: `#${player.number}`,
                          targetPlayerId: player.id,
                        });
                      }}
                      className="p-2 rounded-xl text-teal-400 hover:text-white hover:bg-teal-950/50 transition-all cursor-pointer border border-teal-500/20"
                      title="إضافة أو تغيير صورة اللاعب 📷"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        setEditingPlayer(player);
                        setPlayerForm({
                          name: player.name,
                          studentId: player.studentId || '',
                          number: player.number,
                          position: player.position,
                          isCaptain: !!player.isCaptain,
                          photoUrl: player.photoUrl || '',
                          editReason: '',
                        });
                        setIsAddingPlayer(true);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                      title={canDirectEdit ? "تعديل اللاعب مباشرة ⚡" : "طلب تعديل اللاعب 🔒"}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {canDirectEdit && (
                      <button
                        onClick={() => handleDeletePlayer(player.id)}
                        className="p-2 rounded-xl text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition-all cursor-pointer"
                        title="حذف اللاعب من قائمة الفريق"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {currentSquad.length === 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">لم يتم تسجيل أي لاعبين في هذا الفريق حتى الآن</p>
              <button
                onClick={() => {
                  setEditingPlayer(null);
                  setPlayerForm({ name: '', studentId: '', number: 1, position: 'GK', isCaptain: true, photoUrl: '', editReason: '' });
                  setIsAddingPlayer(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs cursor-pointer inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                سجل أول لاعب الآن
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: BULK PASTE PLAYERS */}
      {subTab === 'bulk_paste' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              لصق قائمة لاعبي {managedTeamName} دفعة واحدة
            </h3>
            <p className="text-xs text-slate-400">
              اكتب أو الصق أسماء اللاعبين سطراً بسطر. يمكنك كتابة الاسم فقط، أو الرقم والاسم مثل: <code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded">10 - أحمد مصطفى</code>
            </p>
          </div>

          <textarea
            rows={8}
            placeholder={`مثال:\n1 - محمد الشناوي\n4 - أحمد حجازي\n7 - طارق حامد\n10 - محمد صلاح\n9 - مصطفى محمد`}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
          />

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400 font-mono">
              عدد الأسطر المكتوبة: {bulkText.split('\n').filter(l => l.trim()).length} لاعب
            </span>
            <button
              onClick={handleBulkAddPlayers}
              className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              إضافة جميع هؤلاء اللاعبين للفريق
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MATCH LINEUP PARTICIPATION */}
      {subTab === 'match_lineup' && (
        <div className="space-y-5">
          {/* Match selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-300 shrink-0">اختر المباراة:</label>
              <select
                value={activeMatch?.id || ''}
                onChange={(e) => setSelectedMatchId(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white text-xs font-bold rounded-xl px-3 py-2 w-full max-w-md focus:outline-none focus:border-emerald-500"
              >
                {teamMatches.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.teamA} ضد {m.teamB} — {m.stageName} {m.date ? `(${m.date})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSaveLineup}
              className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              <Save className="w-4 h-4" />
              حفظ التشكيل والتبديلات لهذه المباراة
            </button>
          </div>

          {activeMatch ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* Starters: مين لعب أساسي */}
              <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <strong className="text-sm font-black text-white">
                      التشكيل الأساسي (مين لعب)
                    </strong>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30">
                      {starters.length} لاعبين
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">انقر على اللاعب لنقله للاحتياط</span>
                </div>

                <div className="space-y-2">
                  {starters.map((pName) => {
                    const playerObj = currentSquad.find(p => p.name === pName);
                    return (
                      <div
                        key={pName}
                        onClick={() => handleToggleStarterBench(pName)}
                        className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 flex items-center justify-between cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs flex items-center justify-center">
                            #{playerObj?.number || '—'}
                          </span>
                          <strong className="text-xs font-bold text-white">{pName}</strong>
                        </div>
                        <span className="text-[10px] text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-500/20">
                          نقل للدكة ←
                        </span>
                      </div>
                    );
                  })}
                  {starters.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">لا يوجد لاعبين أساسيين محددين</p>
                  )}
                </div>
              </div>

              {/* Bench: دكة البدلاء (مين ملعبش) */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-600" />
                    <strong className="text-sm font-black text-white">
                      دكة البدلاء (مين ملعبش)
                    </strong>
                    <span className="px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 text-xs font-mono font-bold border border-slate-800">
                      {bench.length} لاعبين
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">انقر على اللاعب لنقله للأساسي</span>
                </div>

                <div className="space-y-2">
                  {bench.map((pName) => {
                    const playerObj = currentSquad.find(p => p.name === pName);
                    return (
                      <div
                        key={pName}
                        onClick={() => handleToggleStarterBench(pName)}
                        className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 font-mono font-bold text-xs flex items-center justify-center">
                            #{playerObj?.number || '—'}
                          </span>
                          <strong className="text-xs font-bold text-slate-300">{pName}</strong>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                          نقل للأساسي ←
                        </span>
                      </div>
                    );
                  })}
                  {bench.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">لا يوجد لاعبين في الدكة</p>
                  )}
                </div>
              </div>

              {/* Substitutions */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-black text-white">
                      التبديلات المسجلة في المباراة
                    </strong>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black border ${
                      substitutions.length >= MAX_SUBS_PER_TEAM
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {substitutions.length} / {MAX_SUBS_PER_TEAM} تبديلات
                    </span>
                  </div>
                  {substitutions.length >= MAX_SUBS_PER_TEAM && (
                    <span className="text-[11px] text-rose-400 font-bold">
                      ⚠️ تم استنفاد الحد الأقصى للتبديلات المسموح بها ({MAX_SUBS_PER_TEAM} تبديلات)
                    </span>
                  )}
                </div>

                {/* Add Sub form */}
                {substitutions.length < MAX_SUBS_PER_TEAM ? (
                  <form onSubmit={handleAddSub} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-bold">الدقيقة:</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={newSubForm.minute}
                        onChange={(e) => setNewSubForm(prev => ({ ...prev, minute: parseInt(e.target.value, 10) || 1 }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-rose-400 font-bold">اللاعب الخارج (استبدال):</label>
                      <select
                        value={newSubForm.playerOut}
                        onChange={(e) => setNewSubForm(prev => ({ ...prev, playerOut: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      >
                        <option value="">اختر اللاعب الخارج</option>
                        {currentSquad.map(p => (
                          <option key={p.id} value={p.name}>#{p.number} - {p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-emerald-400 font-bold">اللاعب البديل (دخول):</label>
                      <select
                        value={newSubForm.playerIn}
                        onChange={(e) => setNewSubForm(prev => ({ ...prev, playerIn: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      >
                        <option value="">اختر اللاعب البديل</option>
                        {currentSquad.map(p => (
                          <option key={p.id} value={p.name}>#{p.number} - {p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer transition-colors"
                      >
                        + تسجيل التبديل
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-3 bg-rose-950/30 rounded-2xl border border-rose-500/30 text-center text-xs text-rose-300 font-bold">
                    تم استنفاد الحد الأقصى للتبديلات ({MAX_SUBS_PER_TEAM} تبديلات فقط لكل فريق وفقاً للوائح).
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {substitutions.map(sub => (
                    <div key={sub.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono text-emerald-400 font-bold mr-1">د {sub.minute}' : </span>
                        <span className="text-emerald-300 font-bold">دخول {sub.playerIn}</span>
                        <span className="text-slate-500 mx-1">⮂</span>
                        <span className="text-rose-400">خروج {sub.playerOut}</span>
                      </div>
                      <button
                        onClick={() => setSubstitutions(prev => prev.filter(s => s.id !== sub.id))}
                        className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                        title="حذف هذا التبديل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cards (الإنذارات والبطاقات الحمراء والطرود) */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-black text-white">
                      🟨🟥 الإنذارات والبطاقات الحمراء (الطرود) المسجلة للفريق
                    </strong>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-950 text-rose-300 text-xs font-mono font-bold border border-slate-800">
                      {cards.length} بطاقة
                    </span>
                  </div>
                </div>

                {/* Add Card Form */}
                <form onSubmit={handleAddCard} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-bold">الدقيقة:</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={newCardForm.minute}
                      onChange={(e) => setNewCardForm(prev => ({ ...prev, minute: parseInt(e.target.value, 10) || 1 }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300 font-bold">اللاعب الحاصل على البطاقة:</label>
                    <select
                      value={newCardForm.playerName}
                      onChange={(e) => setNewCardForm(prev => ({ ...prev, playerName: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    >
                      <option value="">اختر اللاعب</option>
                      {currentSquad.map(p => (
                        <option key={p.id} value={p.name}>#{p.number} - {p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300 font-bold">نوع البطاقة:</label>
                    <select
                      value={newCardForm.cardType}
                      onChange={(e) => setNewCardForm(prev => ({ ...prev, cardType: e.target.value as CardType }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
                    >
                      <option value="yellow">🟨 إنذار أصفر</option>
                      <option value="red">🟥 كارت أحمر مباشر (طرد)</option>
                      <option value="second_yellow">🟨🟥 إنذار ثانٍ وطرد</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow cursor-pointer transition-colors"
                    >
                      + تسجيل البطاقة
                    </button>
                  </div>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cards.map(card => (
                    <div key={card.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          card.cardType === 'yellow'
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                            : card.cardType === 'red'
                            ? 'bg-rose-600/30 text-rose-300 border border-rose-600/40'
                            : 'bg-rose-600/40 text-rose-200 border border-amber-400/40'
                        }`}>
                          {card.cardType === 'yellow' && '🟨 إنذار أصفر'}
                          {card.cardType === 'red' && '🟥 طرد مباشر (أحمر)'}
                          {card.cardType === 'second_yellow' && '🟨🟥 إنذار ثانٍ وطرد'}
                        </span>
                        <span className="font-mono text-slate-400 font-bold">د{card.minute}'</span>
                        <strong className="text-white">{card.playerName}</strong>
                      </div>
                      <button
                        onClick={() => setCards(prev => prev.filter(c => c.id !== card.id))}
                        className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                        title="حذف هذه البطاقة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <p className="text-xs text-slate-500 col-span-2 text-center py-2">لا توجد بطاقات أو إنذارات مسجلة لهذا الفريق في هذه المباراة</p>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <p className="text-xs text-slate-400">لا توجد مباريات لهذا الفريق</p>
          )}
        </div>
      )}

      {/* SUB-TAB 4: REGISTRATION REQUESTS (طلبات قيد وتسجيل اللاعبين) */}
      {subTab === 'registration_requests' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-black text-white">
                    طلبات قيد لاعبي فريق {managedTeamName} ({teamPendingRequests.length})
                  </h3>
                </div>
                <p className="text-xs text-slate-300">
                  جميع طلبات قيد اللاعبين التي يرفعها مسؤول الفريق تمر بموافقة واعتماد مدير البطولة (Admin) رسمياً أولاً 🔒.
                </p>
              </div>

              {isAdmin && onOpenApprovalsModal && (
                <button
                  onClick={onOpenApprovalsModal}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer self-start sm:self-auto"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>فتح نافذة الاعتمادات الرسمية (Admin) 👑</span>
                </button>
              )}
            </div>

            {/* List of Requests */}
            {teamPendingRequests.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">لا توجد طلبات قيد مسجلة لفريق {managedTeamName}</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  يمكنك رفع طلب إضافة لاعب جديد من تبويب «قائمة اللاعبين»، وسيظهر هنا فوراً حتى يعتمده الأدمن.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                {teamPendingRequests.map(req => (
                  <div
                    key={req.id}
                    className={`p-4 rounded-2xl border space-y-2.5 transition-all shadow-md ${
                      req.status === 'pending'
                        ? 'bg-slate-950 border-amber-500/40'
                        : req.status === 'approved'
                        ? 'bg-slate-950/80 border-emerald-500/30'
                        : 'bg-slate-950/40 border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <strong className="text-white font-black text-sm">{req.playerName}</strong>
                        {req.type === 'edit' ? (
                          <span className="px-2 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40 text-[10px]">
                            🔄 طلب تعديل
                          </span>
                        ) : (
                          <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 text-[10px]">
                            ➕ طلب قيد جديد
                          </span>
                        )}
                      </div>

                      {req.status === 'pending' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          بانتظار موافقة الأدمن ⏳
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 text-[10px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          تم الاعتماد رسمياً ✅
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 text-[10px] flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          تم رفض الطلب ❌
                        </span>
                      )}
                    </div>

                    {req.editReason && (
                      <div className="text-[11px] text-indigo-300 bg-indigo-950/30 p-2 rounded-lg border border-indigo-500/30">
                        سبب طلب التعديل: <strong className="text-white">{req.editReason}</strong>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-400 text-[10px] block">الرقم الجامعي (ID):</span>
                        <strong className="text-emerald-400 flex items-center gap-1">
                          <GraduationCap className="w-3 h-3 text-emerald-400" />
                          {req.studentId || '—'}
                          <Lock className="w-2.5 h-2.5 text-slate-500" />
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">القميص والمركز:</span>
                        <span className="text-white font-bold">#{req.playerNumber} • {req.playerPosition}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">وقت الطلب:</span>
                        <span className="text-slate-400 text-[10px]">{req.requestedAt}</span>
                      </div>
                    </div>

                    {req.status === 'rejected' && req.rejectionReason && (
                      <div className="text-[11px] text-rose-300 bg-rose-950/30 p-2 rounded-lg border border-rose-500/20">
                        سبب الرفض: <strong>{req.rejectionReason}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: MATCH SCHEDULE ALERTS & NOTIFICATIONS */}
      {subTab === 'match_alerts' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>إخطارات وتنبيهات المواعيد والملاعب المعتمدة ({managedTeamName})</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white font-mono text-xs">
                      {managedTeamAlerts.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    هذه التنبيهات تصل لجميع لاعبي وإداريي فريق {managedTeamName} في واجهة المستخدم لإخطارهم بالمواعيد والملاعب الرسمية.
                  </p>
                </div>
              </div>

              {onOpenAllAlertsModal && (
                <button
                  type="button"
                  onClick={onOpenAllAlertsModal}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span>فتح مركز التنبيهات العام</span>
                </button>
              )}
            </div>

            {/* Alerts List */}
            {managedTeamAlerts.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 space-y-2">
                <Bell className="w-8 h-8 text-slate-600 mx-auto" />
                <strong className="text-sm font-bold text-slate-300 block">لا توجد تنبيهات مرسلة لهذا الفريق حالياً</strong>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  عندما يتم اعتماد موعد أو ملعب لمباراة {managedTeamName} من قبل مسؤولي البطولة وإرسال التنبيه، سيظهر هنا مع قائمة اللاعبين المؤكدين للجاهزية.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {managedTeamAlerts.map((alert) => {
                  const opponent = alert.teamA === managedTeamName ? alert.teamB : alert.teamA;
                  const ackPlayers = alert.acknowledgedPlayers || [];

                  return (
                    <div
                      key={alert.id}
                      className="p-4 md:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${
                            alert.urgency === 'high'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                          }`}>
                            <Bell className="w-3 h-3" />
                            <span>{alert.urgency === 'high' ? 'عاجل وهام' : 'رسمي معتمد'}</span>
                          </span>
                          <strong className="text-xs font-bold text-white">
                            مباراة ضد {opponent} ({alert.stageName})
                          </strong>
                        </div>

                        <span className="text-[11px] text-slate-400 font-mono">
                          {alert.sentAt} • بواسطة: {alert.sentBy}
                        </span>
                      </div>

                      {/* Details Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-400 block">التاريخ المعتمد</span>
                            <strong className="text-white font-mono">{alert.date}</strong>
                          </div>
                        </div>
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-400 block">توقيت الانطلاق</span>
                            <strong className="text-white font-mono">{alert.time}</strong>
                          </div>
                        </div>
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-400 block">الملعب</span>
                            <strong className="text-amber-300">{alert.pitch}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Message Content */}
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                        {alert.message}
                      </div>

                      {/* Acknowledged Players Badge and List */}
                      <div className="pt-2 border-t border-slate-900 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تأكيدات حضور اللاعبين: {ackPlayers.length} لاعباً</span>
                        </div>

                        {ackPlayers.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            {ackPlayers.map((p) => (
                              <span key={p.userId} className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                                ✓ {p.userName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Team's Scheduled Matches Overview & Send Alert Trigger */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-black text-slate-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>حالة مباريات فريق {managedTeamName} والجدول:</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {teamMatches.map((m) => {
                  const opponent = m.teamA === managedTeamName ? m.teamB : m.teamA;
                  const hasAlert = managedTeamAlerts.some(a => a.matchId === m.id);

                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-white font-bold">{m.stageName}</strong>
                          <span className="text-slate-400">ضد</span>
                          <strong className="text-emerald-400">{opponent}</strong>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {m.isScheduled ? `${m.date} • ${m.time} • ${m.pitch}` : 'لم يحدد الموعد بعد'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {hasAlert ? (
                          <span className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>تم إرسال تنبيه</span>
                          </span>
                        ) : (
                          isAdmin && onOpenAlertComposerForMatch && (
                            <button
                              type="button"
                              onClick={() => onOpenAlertComposerForMatch(m)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-black text-[10px] transition-all cursor-pointer flex items-center gap-1 border border-amber-500/40"
                              title="إرسال تنبيه للمباراة"
                            >
                              <Send className="w-3 h-3" />
                              <span>إرسال تنبيه للاعبين 📢</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo & Logo Upload Modal (For Team Logo or Player Photo) */}
      <ImageUploadModal
        isOpen={uploadModalConfig.isOpen}
        onClose={() => setUploadModalConfig(prev => ({ ...prev, isOpen: false }))}
        type={uploadModalConfig.type}
        title={uploadModalConfig.title}
        subtitle={uploadModalConfig.subtitle}
        currentImageUrl={uploadModalConfig.currentImageUrl}
        entityName={uploadModalConfig.entityName}
        badgeNumberOrGroup={uploadModalConfig.badgeNumberOrGroup}
        onSave={(newUrl) => {
          if (uploadModalConfig.targetPlayerId === '__FORM__') {
            setPlayerForm(prev => ({ ...prev, photoUrl: newUrl }));
          } else {
            handleSaveModalImage(newUrl);
          }
        }}
      />

    </div>
  );
};

export default TeamManagerPortalPage;
