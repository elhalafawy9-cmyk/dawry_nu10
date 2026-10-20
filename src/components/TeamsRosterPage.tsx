import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Shield, 
  Search, 
  UserPlus, 
  ArrowRightLeft, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Shirt, 
  Star, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  AlertCircle, 
  X,
  Eye,
  Lock,
  GraduationCap,
  Check,
  Camera,
  Image as ImageIcon,
  Bot,
  ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Match, Team } from '../App';
import { AppUser } from '../utils/auth';
import { Player, MatchSubstitution, MatchCardEvent, CardType, MAX_SUBS_PER_TEAM, PlayerRegistrationRequest, clearAllSquads, saveStoredSquads } from '../utils/roster';
import { ImageUploadModal } from './ImageUploadModal';
import { TeamLogo } from '../utils/teamLogos';
import { getTeamBilingualInfo, resolveCanonicalTeamName, isSameTeam } from '../utils/teamAliases';

interface TeamsRosterPageProps {
  teams: Team[];
  matches: Match[];
  squads: Record<string, Player[]>;
  onUpdateSquads: (updatedSquads: Record<string, Player[]>) => void;
  onUpdateMatchLineups?: (matchId: string, teamName: string, starters: string[], bench: string[], substitutions: MatchSubstitution[], cards?: MatchCardEvent[]) => void;
  currentUser?: AppUser | null;
  onRequestAddPlayer?: (req: Omit<PlayerRegistrationRequest, 'id' | 'requestedAt' | 'status'>) => void;
  onRequestEditPlayer?: (req: Omit<PlayerRegistrationRequest, 'id' | 'requestedAt' | 'status'>) => void;
  playerRequests?: PlayerRegistrationRequest[];
  onOpenApprovalsModal?: () => void;
  onUpdateTeamLogo?: (teamName: string, newLogoUrl: string) => void;
  onUpdatePlayerPhoto?: (teamName: string, playerId: string, newPhotoUrl: string) => void;
  isPlayerEditingOpen?: boolean;
  onOpenAiCopilot?: () => void;
  onOpenAuditModal?: () => void;
  onDeleteTeam?: (teamNameOrId: string) => void;
  onEditTeam?: (team: Team) => void;
}

export const TeamsRosterPage: React.FC<TeamsRosterPageProps> = ({
  teams,
  matches,
  squads,
  onUpdateSquads,
  onUpdateMatchLineups,
  currentUser,
  onRequestAddPlayer,
  onRequestEditPlayer,
  playerRequests = [],
  onOpenApprovalsModal,
  onUpdateTeamLogo,
  onUpdatePlayerPhoto,
  isPlayerEditingOpen = true,
  onOpenAiCopilot,
  onOpenAuditModal,
  onDeleteTeam,
  onEditTeam,
}) => {
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [searchTeamQuery, setSearchTeamQuery] = useState<string>('');
  const [activeTeamName, setActiveTeamName] = useState<string>(teams[0]?.name || 'برشلونة');

  // In-App Confirmation Modals (Zero window.confirm bugs)
  const [isConfirmClearAllOpen, setIsConfirmClearAllOpen] = useState(false);
  const [confirmClearTeamTarget, setConfirmClearTeamTarget] = useState<string | null>(null);
  const [confirmDeleteTeamTarget, setConfirmDeleteTeamTarget] = useState<Team | null>(null);

  // Permission calculation: Admin can edit any team, Team Manager can edit ONLY their managed team, Players/Spectators are read-only
  const canEditCurrentTeam = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'team_manager' && currentUser.managedTeamName === activeTeamName) return true;
    return false;
  }, [currentUser, activeTeamName]);

  const canDirectEdit = (currentUser?.role === 'admin') || isPlayerEditingOpen;

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

  // Sub-tab inside team view: 'squad' (قائمة اللاعبين) | 'match_participation' (مين لعب ومين ملعبش والتبديلات)
  const [teamViewSubTab, setTeamViewSubTab] = useState<'squad' | 'match_participation'>('squad');

  // Selected match for participation view
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  // Add / Edit Player modal state
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

  // Substitution Form
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [subForm, setSubForm] = useState<{
    minute: number;
    playerOut: string;
    playerIn: string;
  }>({
    minute: 60,
    playerOut: '',
    playerIn: '',
  });

  // Filtered teams list with bilingual search (Arabic & English)
  const filteredTeams = useMemo(() => {
    return teams.filter(t => {
      if (selectedGroupFilter !== 'all' && t.group !== selectedGroupFilter) return false;
      if (searchTeamQuery.trim()) {
        const q = searchTeamQuery.toLowerCase().trim();
        const bInfo = getTeamBilingualInfo(t.name);
        const englishName = bInfo?.englishName?.toLowerCase() || '';
        const aliases = (bInfo?.aliases || []).map(a => a.toLowerCase());
        const matchArabic = t.name.toLowerCase().includes(q);
        const matchEnglish = englishName.includes(q);
        const matchAlias = aliases.some(a => a.includes(q));
        if (!matchArabic && !matchEnglish && !matchAlias) return false;
      }
      return true;
    });
  }, [teams, selectedGroupFilter, searchTeamQuery]);

  const activeTeam = useMemo(() => {
    return teams.find(t => t.name === activeTeamName) || teams[0];
  }, [teams, activeTeamName]);

  const currentSquad = useMemo(() => {
    return squads[activeTeamName] || [];
  }, [squads, activeTeamName]);

  // Matches for active team
  const teamMatches = useMemo(() => {
    return matches.filter(m => m.teamA === activeTeamName || m.teamB === activeTeamName);
  }, [matches, activeTeamName]);

  // Active match for participation tracking
  const activeMatch = useMemo(() => {
    if (selectedMatchId) {
      return teamMatches.find(m => m.id === selectedMatchId) || teamMatches[0];
    }
    return teamMatches[0];
  }, [teamMatches, selectedMatchId]);

  // Local state for Starters & Bench in active match
  const isTeamAInActiveMatch = activeMatch?.teamA === activeTeamName;

  // Starters (مين لعب) and Bench (مين ملعبش)
  const defaultStarters = useMemo(() => {
    return currentSquad.slice(0, 6).map(p => p.name);
  }, [currentSquad]);

  const defaultBench = useMemo(() => {
    return currentSquad.slice(6).map(p => p.name);
  }, [currentSquad]);

  const [activeStarters, setActiveStarters] = useState<string[]>([]);
  const [activeBench, setActiveBench] = useState<string[]>([]);
  const [activeSubstitutions, setActiveSubstitutions] = useState<MatchSubstitution[]>([]);
  const [activeCards, setActiveCards] = useState<MatchCardEvent[]>([]);
  const [cardForm, setCardForm] = useState<{ minute: number; playerName: string; cardType: CardType; reason: string }>({
    minute: 45,
    playerName: '',
    cardType: 'yellow',
    reason: '',
  });
  const [isAddingCard, setIsAddingCard] = useState(false);

  // Synchronize lineup when active match changes
  React.useEffect(() => {
    if (activeMatch) {
      const matchLineups = (activeMatch as any).lineups;
      const teamLineup = isTeamAInActiveMatch
        ? { starters: matchLineups?.teamAStarters, bench: matchLineups?.teamABench }
        : { starters: matchLineups?.teamBStarters, bench: matchLineups?.teamBBench };

      if (teamLineup?.starters && teamLineup.starters.length > 0) {
        setActiveStarters(teamLineup.starters);
        setActiveBench(teamLineup.bench || []);
      } else {
        // Defaults: first 6 are starters (who played), rest are bench (did not play)
        setActiveStarters(defaultStarters);
        setActiveBench(defaultBench);
      }

      // Subs
      const subs = ((activeMatch as any).substitutions as MatchSubstitution[]) || [];
      const teamSubs = subs.filter(s => s.team === activeTeamName);
      setActiveSubstitutions(teamSubs);

      // Cards
      const cards = ((activeMatch as any).cards as MatchCardEvent[]) || [];
      const teamCards = cards.filter(c => c.team === activeTeamName);
      setActiveCards(teamCards);
    }
  }, [activeMatch, isTeamAInActiveMatch, defaultStarters, defaultBench, activeTeamName]);

  // Move player from Starters to Bench or vice versa
  const handleTogglePlayerStatus = (playerName: string) => {
    if (!canEditCurrentTeam) return;
    if (activeStarters.includes(playerName)) {
      setActiveStarters(prev => prev.filter(p => p !== playerName));
      setActiveBench(prev => [...prev, playerName]);
    } else {
      setActiveBench(prev => prev.filter(p => p !== playerName));
      setActiveStarters(prev => [...prev, playerName]);
    }
  };

  // Add substitution (بحد أقصى 5 تبديلات)
  const handleAddSubstitution = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeSubstitutions.length >= MAX_SUBS_PER_TEAM) {
      alert(`عذراً، وصل الفريق للحد الأقصى للتبديلات (${MAX_SUBS_PER_TEAM} تبديلات فقط لكل فريق وفقاً للوائح البطولة).`);
      return;
    }
    if (!subForm.playerOut || !subForm.playerIn) {
      alert('يرجى اختيار اللاعب الخارج واللاعب النازل!');
      return;
    }
    if (subForm.playerOut === subForm.playerIn) {
      alert('لا يمكن أن يكون اللاعب الخارج هو نفسه اللاعب البديل');
      return;
    }

    const newSub: MatchSubstitution = {
      id: `sub_${Date.now()}`,
      minute: Number(subForm.minute),
      playerOut: subForm.playerOut,
      playerIn: subForm.playerIn,
      team: activeTeamName,
    };

    setActiveSubstitutions(prev => [...prev, newSub]);
    setIsAddingSub(false);
    confetti({ particleCount: 40, spread: 50 });
  };

  const handleRemoveSubstitution = (subId: string) => {
    setActiveSubstitutions(prev => prev.filter(s => s.id !== subId));
  };

  // Add Card
  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.playerName) {
      alert('يرجى اختيار اللاعب الحاصل على البطاقة');
      return;
    }
    let assignedType = cardForm.cardType;
    const existingYellow = activeCards.find(c => c.playerName === cardForm.playerName && c.cardType === 'yellow');
    if (existingYellow && cardForm.cardType === 'yellow') {
      assignedType = 'second_yellow';
      alert(`تنبيه: اللاعب ${cardForm.playerName} حاصل على إنذار أصفر سابق! تم تسجيل هذا الإنذار كـ "إنذار ثانٍ ثم طرد بالبطاقة الحمراء 🟨🟥"`);
    }

    const newCard: MatchCardEvent = {
      id: `card_${Date.now()}`,
      minute: Number(cardForm.minute) || 45,
      playerName: cardForm.playerName,
      team: activeTeamName,
      cardType: assignedType,
      reason: cardForm.reason.trim() || undefined,
    };

    setActiveCards(prev => [...prev, newCard]);
    setIsAddingCard(false);
    setCardForm({ minute: 45, playerName: '', cardType: 'yellow', reason: '' });
    confetti({ particleCount: 30, spread: 40 });
  };

  const handleRemoveCard = (cardId: string) => {
    setActiveCards(prev => prev.filter(c => c.id !== cardId));
  };

  // Save Lineup & Participation for this match
  const handleSaveMatchLineup = () => {
    if (!activeMatch) return;

    if (onUpdateMatchLineups) {
      onUpdateMatchLineups(
        activeMatch.id,
        activeTeamName,
        activeStarters,
        activeBench,
        activeSubstitutions,
        activeCards
      );
    }

    confetti({ particleCount: 60, spread: 70 });
    alert(`تم حفظ قائمة المشاركين والبدلاء والتبديلات والبطاقات لمباراة (${activeMatch.teamA} ضد ${activeMatch.teamB}) بنجاح! 📋✨`);
  };

  // Photo Modal Save Handler
  const handleSaveModalImage = (newUrl: string) => {
    if (uploadModalConfig.type === 'team') {
      if (onUpdateTeamLogo) {
        onUpdateTeamLogo(activeTeamName, newUrl);
      } else {
        const updatedTeams = teams.map(t => t.name === activeTeamName ? { ...t, logoUrl: newUrl || undefined } : t);
        try {
          localStorage.setItem('dawry_teams_custom_v1', JSON.stringify(updatedTeams));
        } catch {}
      }
      confetti({ particleCount: 30, spread: 50 });
      alert(`تم تحديث شعار فريق (${activeTeamName}) بنجاح! 🏆✨`);
    } else if (uploadModalConfig.type === 'player' && uploadModalConfig.targetPlayerId) {
      if (onUpdatePlayerPhoto) {
        onUpdatePlayerPhoto(activeTeamName, uploadModalConfig.targetPlayerId, newUrl);
      } else {
        const updated = currentSquad.map(p => p.id === uploadModalConfig.targetPlayerId ? { ...p, photoUrl: newUrl || undefined } : p);
        onUpdateSquads({ ...squads, [activeTeamName]: updated });
      }
      confetti({ particleCount: 30, spread: 50 });
      alert(`تم تحديث صورة اللاعب بنجاح! 📸✅`);
    }
  };

  // Player Squad Management Handlers
  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerForm.name.trim()) return;

    // Cross-team duplicate detection (by studentId or name)
    const checkId = playerForm.studentId.trim();
    const checkName = playerForm.name.trim().toLowerCase();
    let duplicateConflict: { teamName: string; playerName: string; studentId: string } | null = null;

    for (const [tName, squadPlayers] of Object.entries(squads)) {
      if (tName === activeTeamName && !editingPlayer) continue;
      for (const sp of squadPlayers) {
        if (editingPlayer && sp.id === editingPlayer.id) continue;
        const sameId = Boolean(checkId && sp.studentId && sp.studentId.trim().toLowerCase() === checkId.toLowerCase());
        const sameName = Boolean(checkName && sp.name.trim().toLowerCase() === checkName);
        if (sameId || sameName) {
          duplicateConflict = { teamName: tName, playerName: sp.name, studentId: sp.studentId };
          break;
        }
      }
      if (duplicateConflict) break;
    }

    if (duplicateConflict) {
      if (canDirectEdit) {
        // Admin or unlocked: allow updating name directly without blocking
      } else {
        const msg = `⚠️ تحذير ازدواجية وتكرار!\nاللاعب (${playerForm.name.trim()}) أو الرقم الجامعي (${checkId || '—'}) مسجل بالفعل في فريق [${duplicateConflict.teamName}] باسم (${duplicateConflict.playerName})!\n\nوفقاً للائحة دوري جامعة النيل، يمنع تسجيل اللاعب في أكثر من فريق.`;
        alert(`${msg}\n\nلا يمكن إرسال طلب القيد لوجود ازدواجية.`);
        return;
      }
    }

    if (editingPlayer) {
      if (canDirectEdit) {
        // DIRECT EDIT: (Admin or Player Editing Window is Open)
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
        onUpdateSquads({ ...squads, [activeTeamName]: updated });
        setIsAddingPlayer(false);
        setEditingPlayer(null);
        setPlayerForm({ name: '', studentId: '', number: 10, position: 'MID', isCaptain: false, photoUrl: '', editReason: '' });
        confetti({ particleCount: 30, spread: 50 });
        alert(currentUser?.role === 'admin'
          ? `تم تعديل بيانات وصورة اللاعب (${playerForm.name.trim()}) مباشرة بصلاحية الأدمن 👑`
          : `تم حفظ وتعديل بيانات اللاعب (${playerForm.name.trim()}) في قائمة فريق ${activeTeamName} مباشرة بنجاح! ⚡✅`
        );
      } else {
        // NON-ADMIN / TEAM MANAGER WHEN LOCKED: Send edit request to Admin!
        if (onRequestEditPlayer) {
          onRequestEditPlayer({
            type: 'edit',
            playerId: editingPlayer.id,
            teamName: activeTeamName,
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
            requestedBy: currentUser?.name || `مسؤول فريق ${activeTeamName}`,
          });
        }
        setIsAddingPlayer(false);
        setEditingPlayer(null);
        setPlayerForm({ name: '', studentId: '', number: 10, position: 'MID', isCaptain: false, photoUrl: '', editReason: '' });
        alert(`تم إرسال طلب تعديل اللاعب (${playerForm.name}) لمدير البطولة (Admin) للمراجعة والاعتماد ⏳🔒`);
      }
    } else {
      // Add
      if (!playerForm.studentId.trim()) {
        alert('يرجى إدخال الرقم الجامعي للطالب (Student ID) بشكل صحيح.');
        return;
      }

      if (canDirectEdit) {
        // Direct add
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
        onUpdateSquads({ ...squads, [activeTeamName]: [...currentSquad, newP] });
        setIsAddingPlayer(false);
        setEditingPlayer(null);
        setPlayerForm({ name: '', studentId: '', number: currentSquad.length + 2, position: 'MID', isCaptain: false, photoUrl: '', editReason: '' });
        confetti({ particleCount: 40, spread: 60 });
        alert(`تمت إضافة وتسجيل اللاعب (${newP.name}) في قائمة فريق ${activeTeamName} مباشرة بنجاح! 🎉⚽`);
      } else {
        // Send request to Admin for approval
        if (onRequestAddPlayer) {
          onRequestAddPlayer({
            type: 'add',
            teamName: activeTeamName,
            playerName: playerForm.name.trim(),
            playerNumber: Number(playerForm.number),
            playerPosition: playerForm.position,
            isCaptain: playerForm.isCaptain,
            studentId: playerForm.studentId.trim(),
            photoUrl: playerForm.photoUrl || undefined,
            requestedBy: currentUser?.name || `مسؤول فريق ${activeTeamName}`,
          });
        }
        setIsAddingPlayer(false);
        setEditingPlayer(null);
        setPlayerForm({ name: '', studentId: '', number: currentSquad.length + 1, position: 'MID', isCaptain: false, photoUrl: '', editReason: '' });
        alert(`تم إرسال طلب تسجيل اللاعب (${playerForm.name}) والـ ID (${playerForm.studentId}) لمدير البطولة (Admin) للموافقة عليه واعتماده رسمياً! ⏳🔒`);
      }
    }
  };

  const handleDeletePlayer = (playerId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا اللاعب من قائمة الفريق؟')) {
      const updated = currentSquad.filter(p => p.id !== playerId);
      onUpdateSquads({ ...squads, [activeTeamName]: updated });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-950/60 via-slate-900 to-emerald-950/60 border border-teal-500/30 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold mb-2 border border-teal-500/30">
            <Users className="w-3.5 h-3.5 text-teal-400" />
            <span>قوائم الفرق ومشاركات المباريات</span>
          </div>
          <h2 className="text-xl md:text-3xl font-black text-white mb-2">
            الفرق واللاعبون: مين لعب، مين ملعبش، والتبديلات ⚽
          </h2>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
            استعرض لاعبي كل فريق من الفرق الـ 48، وحدد في كل مباراة مَن شارك أساسياً ومَن بقي على دكة البدلاء وسجل كافة وقائع التبديلات بدقة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">


          {currentUser?.role === 'admin' && onOpenAiCopilot && (
            <button
              type="button"
              onClick={onOpenAiCopilot}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/30 border border-emerald-400/30"
              title="إضافة لاعبين وفرق من صورة بالذكاء الاصطناعي (Gemini AI)"
            >
              <Bot className="w-4 h-4 text-emerald-200" />
              <span>إضافة من صورة (AI) 📷</span>
            </button>
          )}

          {onOpenAuditModal && (
            <button
              type="button"
              onClick={onOpenAuditModal}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-600/20 border border-rose-400/30"
              title="فاحص الازدواجية وتدقيق الفرق واللاعبين المكررين"
            >
              <ShieldAlert className="w-4 h-4 text-amber-200" />
              <span>فاحص الازدواجية ⚠️</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingPlayer(null);
              setPlayerForm({ name: '', studentId: '', number: currentSquad.length + 1, position: 'MID', isCaptain: false, photoUrl: '', editReason: '' });
              setIsAddingPlayer(true);
            }}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-500/20"
          >
            <UserPlus className="w-4 h-4" />
            إضافة لاعب لفريق {activeTeam?.name}
          </button>
        </div>
      </div>

      {/* Main Grid: Teams Selector on Right (or Sidebar) + Main Team View on Left */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Teams List Sidebar (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-black text-sm text-white flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                اختر الفريق ({filteredTeams.length})
              </span>
              <span className="text-[11px] text-slate-500">دوري 48 فريق</span>
            </div>

            {/* Group Filter */}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setSelectedGroupFilter('all')}
                className={`px-2 py-1 rounded-lg text-xs font-bold ${
                  selectedGroupFilter === 'all' ? 'bg-teal-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                الكل
              </button>
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(g => (
                <button
                  key={g}
                  onClick={() => setSelectedGroupFilter(g)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                    selectedGroupFilter === g ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* Search Team Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث عن اسم أي فريق..."
                value={searchTeamQuery}
                onChange={(e) => setSearchTeamQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 pr-8 text-xs text-white focus:outline-none focus:border-teal-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>

            {/* Teams Scrollable List */}
            <div className="max-h-[500px] overflow-y-auto space-y-1.5 pr-1">
              {filteredTeams.map(t => {
                const isActive = t.name === activeTeamName;
                const squadCount = (squads[t.name] || []).length;

                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTeamName(t.name);
                      setSelectedMatchId('');
                    }}
                    className={`w-full p-2.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-teal-950 to-slate-900 border-teal-500/60 ring-1 ring-teal-500/30'
                        : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <TeamLogo teamName={t.name} logoUrl={t.logoUrl} size="md" />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <strong className="text-xs md:text-sm font-bold text-white block">{t.name}</strong>
                          {getTeamBilingualInfo(t.name)?.englishName && (
                            <span className="text-[10px] text-teal-300 font-semibold bg-teal-950/80 px-1.5 py-0.2 rounded border border-teal-700/50">
                              {getTeamBilingualInfo(t.name)?.englishName}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">المجموعة {t.group} • {squadCount} لاعبين</span>
                      </div>
                    </div>

                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Team Details & Participation Sheet (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Active Team Header Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <TeamLogo teamName={activeTeam?.name || ''} logoUrl={activeTeam?.logoUrl} size="xl" className="ring-2 ring-white/10" />
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
                    المجموعة {activeTeam?.group}
                  </span>
                  <span className="text-xs text-slate-400">
                    {currentSquad.length} لاعبين مسجلين
                  </span>
                  {canEditCurrentTeam && activeTeam && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadModalConfig({
                          isOpen: true,
                          type: 'team',
                          title: `شعار وصورة فريق: ${activeTeam.name}`,
                          subtitle: 'رفع شعار أو صورة رسمية للفريق لعرضها في جداول المباريات وترتيب المجموعات',
                          currentImageUrl: activeTeam.logoUrl || '',
                          entityName: activeTeam.name,
                          badgeNumberOrGroup: `المجموعة ${activeTeam.group}`,
                        });
                      }}
                      className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-[10px] flex items-center gap-1 border border-amber-500/40 transition-all cursor-pointer shadow-sm"
                      title="إضافة أو تعديل شعار الفريق"
                    >
                      <Camera className="w-3 h-3" />
                      <span>تعديل الشعار 📷</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-xl md:text-2xl font-black text-white">
                    فريق: {activeTeam?.name}
                  </h3>
                  {getTeamBilingualInfo(activeTeam?.name || '')?.englishName && (
                    <span className="text-xs font-bold text-teal-300 bg-teal-950/90 px-2.5 py-1 rounded-xl border border-teal-500/40">
                      {getTeamBilingualInfo(activeTeam?.name || '')?.englishName}
                    </span>
                  )}
                  {currentUser?.role === 'admin' && onEditTeam && activeTeam && (
                    <button
                      type="button"
                      onClick={() => onEditTeam(activeTeam)}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-200 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                      title={`تعديل اسم فريق ${activeTeam.name} ومجموعته كـ أدمن`}
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>تعديل اسم الفريق ✏️</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sub-tab switcher */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={() => setTeamViewSubTab('squad')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  teamViewSubTab === 'squad'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shirt className="w-3.5 h-3.5" />
                قائمة اللاعبين ({currentSquad.length})
              </button>
              <button
                onClick={() => setTeamViewSubTab('match_participation')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  teamViewSubTab === 'match_participation'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                مشاركات المباريات والتبديلات
              </button>
            </div>
          </div>

          {/* VIEW 1: SQUAD LIST (قائمة اللاعبين) */}
          {teamViewSubTab === 'squad' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-black text-white text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-400" />
                    قائمة لاعبي {activeTeam?.name}
                  </h4>
                  <p className="text-xs text-slate-400">
                    يمكنك تعديل أرقام اللاعبين ومراكزهم أو إضافة لاعبين جدد
                  </p>
                </div>

                {canEditCurrentTeam ? (
                  <div className="flex items-center gap-2">

                    {currentUser?.role === 'admin' && onDeleteTeam && activeTeam && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteTeamTarget(activeTeam)}
                        className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/80 border border-rose-500/40 hover:border-rose-400 text-rose-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        title={`مسح وحذف فريق ${activeTeam.name} نهائياً من البطولة`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>حذف الفريق 🗑️</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingPlayer(null);
                        setPlayerForm({ name: '', studentId: '', number: currentSquad.length + 1, position: 'MID', isCaptain: false, photoUrl: '', editReason: '' });
                        setIsAddingPlayer(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-teal-600 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة لاعب
                    </button>
                  </div>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-bold flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-teal-400" />
                    استعراض القائمة (للتعديل يلزم مسؤول {activeTeam?.name} أو أدمن)
                  </span>
                )}
              </div>

              {/* Players Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentSquad.map((player) => (
                  <div
                    key={player.id}
                    className="bg-slate-950 border border-slate-800/80 hover:border-teal-500/40 rounded-2xl p-3.5 space-y-2 transition-all shadow group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {/* Player Photo Avatar */}
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shadow-inner ring-1 ring-slate-800">
                            {player.photoUrl ? (
                              <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-teal-400 font-mono font-black text-xs">
                                <Shirt className="w-4 h-4 text-teal-500/70 mb-0.5" />
                                <span>#{player.number}</span>
                              </div>
                            )}
                          </div>
                          <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-md bg-teal-500 text-slate-950 font-mono font-black text-[9px] shadow">
                            #{player.number}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          player.position === 'GK' ? 'bg-amber-500/20 text-amber-300' :
                          player.position === 'DEF' ? 'bg-blue-500/20 text-blue-300' :
                          player.position === 'MID' ? 'bg-emerald-500/20 text-emerald-300' :
                          'bg-rose-500/20 text-rose-300'
                        }`}>
                          {player.position}
                        </span>
                        {player.isCaptain && (
                          <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-[10px] font-black flex items-center gap-0.5" title="كابتن الفريق">
                            <Star className="w-3 h-3 fill-yellow-400" />
                            C
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-1 flex flex-wrap items-center justify-between gap-1.5">
                      <strong className="text-sm font-bold text-white block truncate">{player.name}</strong>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-teal-300 font-mono font-bold flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 shrink-0">
                          <GraduationCap className="w-3 h-3 text-teal-400" />
                          ID: {player.studentId || '—'}
                          <span title="مقفل ومحمي"><Lock className="w-2.5 h-2.5 text-slate-500" /></span>
                        </span>
                        {player.faculty && (
                          <span className="text-[10px] text-amber-300 font-bold bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md shrink-0">
                            🏛️ {player.faculty}
                          </span>
                        )}
                        {player.academicYear && (
                          <span className="text-[10px] text-sky-300 font-bold bg-sky-950/60 border border-sky-500/30 px-2 py-0.5 rounded-md shrink-0">
                            سنة {player.academicYear}
                          </span>
                        )}
                        {playerRequests.some(r => r.type === 'edit' && r.status === 'pending' && (r.playerId === player.id || r.playerName === player.name)) && (
                          <span className="text-[10px] text-indigo-300 font-bold bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-indigo-400" />
                            طلب تعديل ⏳
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {canEditCurrentTeam && (
                      <div className="pt-2 border-t border-slate-900 flex items-center justify-end gap-1.5">
                        {/* Quick Photo Upload Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setUploadModalConfig({
                              isOpen: true,
                              type: 'player',
                              title: `صورة اللاعب: ${player.name}`,
                              subtitle: `فريق ${activeTeamName} • رقم #${player.number} (${player.position})`,
                              currentImageUrl: player.photoUrl || '',
                              entityName: player.name,
                              badgeNumberOrGroup: `#${player.number}`,
                              targetPlayerId: player.id,
                            });
                          }}
                          className="p-1.5 rounded-lg text-teal-400 hover:text-white hover:bg-teal-950/40 transition-colors cursor-pointer border border-teal-500/20"
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
                              isCaptain: Boolean(player.isCaptain),
                              photoUrl: player.photoUrl || '',
                              editReason: '',
                            });
                            setIsAddingPlayer(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          title={currentUser?.role === 'admin' ? "تعديل اللاعب كـ أدمن" : "طلب تعديل بيانات اللاعب"}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {currentUser?.role === 'admin' && (
                          <button
                            onClick={() => handleDeletePlayer(player.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="حذف اللاعب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Empty Squad State */}
              {currentSquad.length === 0 && (
                <div className="p-8 text-center bg-slate-950/70 rounded-2xl border border-dashed border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto border border-teal-500/20">
                    <Shirt className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-white text-sm">قائمة فريق {activeTeam?.name} خالية تماماً حالياً ⚽</h5>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      تم تفريغ القائمة بنجاح لتتمكن من إضافة كشوفاتك الرسمية من الصفر دون الحاجة لمسح أي لاعبين قدامى.
                    </p>
                  </div>
                  {canEditCurrentTeam && (
                    <div className="flex items-center justify-center gap-2.5 pt-2 flex-wrap">
                      <button
                        onClick={() => {
                          setEditingPlayer(null);
                          setPlayerForm({ name: '', studentId: '', number: 1, position: 'GK', isCaptain: false, photoUrl: '', editReason: '' });
                          setIsAddingPlayer(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                      >
                        <Plus className="w-4 h-4" />
                        إضافة أول لاعب يدوي
                      </button>
                      {onOpenAiCopilot && (
                        <button
                          type="button"
                          onClick={onOpenAiCopilot}
                          className="px-4 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                        >
                          <Bot className="w-4 h-4" />
                          استخراج من صورة الكشف (AI) 📷
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: MATCH PARTICIPATION & SUBS (مين لعب ومين ملعبش والتبديلات) */}
          {teamViewSubTab === 'match_participation' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-5">
              
              {/* Match Selector */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    اختر المباراة لتوثيق المشاركات والتبديلات:
                  </label>
                  <span className="text-slate-500 text-[11px] font-mono">
                    {teamMatches.length} مباريات في البطولة
                  </span>
                </div>

                <select
                  value={activeMatch?.id || ''}
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                >
                  {teamMatches.map(m => {
                    const isTeamA = m.teamA === activeTeamName;
                    const opp = isTeamA ? m.teamB : m.teamA;
                    const score = m.scoreA !== null ? `${m.scoreA} - ${m.scoreB}` : 'لم تُلعب بعد';
                    return (
                      <option key={m.id} value={m.id}>
                        {m.stageName} | ضد {opp} ({score}) {m.isScheduled ? `• ${m.date}` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Match Summary Bar */}
              {activeMatch && (
                <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{activeMatch.stageName}</span>
                    <span className="text-slate-400">ضد {activeMatch.teamA === activeTeamName ? activeMatch.teamB : activeMatch.teamA}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEditCurrentTeam ? (
                      <button
                        onClick={handleSaveMatchLineup}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        حفظ واعتماد التشكيل والتبديلات
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        التشكيل المعتمد رسمياً (صلاحيات القراءة)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Who Played (مين لعب) vs Who Didn't Play (مين ملعبش) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. STARTERS / PLAYED (مين لعب - الأساسيون) */}
                <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <strong className="text-sm font-bold text-white">الأساسيون (مين لعب)</strong>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold">
                      {activeStarters.length} لاعبين
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {canEditCurrentTeam 
                      ? 'اضغط على أي لاعب لنقله إلى دكة البدلاء (مين ملعبش):' 
                      : 'قائمة اللاعبين الأساسيين الذين شاركوا في المباراة:'}
                  </p>

                  <div className="space-y-1.5 min-h-[140px]">
                    {activeStarters.map((pName) => {
                      const pObj = currentSquad.find(p => p.name === pName);
                      return (
                        <div
                          key={pName}
                          onClick={() => handleTogglePlayerStatus(pName)}
                          className={`p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between text-xs transition-colors group ${
                            canEditCurrentTeam ? 'hover:bg-emerald-950/40 cursor-pointer' : 'cursor-default'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-emerald-400 font-bold text-[11px]">#{pObj?.number || '—'}</span>
                            <span className="font-bold text-white group-hover:text-emerald-300">{pName}</span>
                            {pObj?.isCaptain && <span className="text-[10px] text-amber-400 font-bold">⭐ C</span>}
                          </div>
                          {canEditCurrentTeam ? (
                            <span className="text-[10px] text-slate-400 group-hover:text-amber-400 flex items-center gap-1">
                              انقل للدكة ⇄
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-bold">
                              أساسي ✓
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {activeStarters.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-500">
                        لم يتم تحديد أي لاعبين أساسيين بعد
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. BENCH / DID NOT PLAY (مين ملعبش - دكة البدلاء) */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                      <strong className="text-sm font-bold text-slate-300">البدلاء / الاحتياط (مين ملعبش)</strong>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-mono font-bold">
                      {activeBench.length} لاعبين
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {canEditCurrentTeam 
                      ? 'اضغط على أي لاعب لنقله للتشكيل الأساسي (مين لعب):' 
                      : 'قائمة اللاعبين البدلاء / الاحتياط في هذه المباراة:'}
                  </p>

                  <div className="space-y-1.5 min-h-[140px]">
                    {activeBench.map((pName) => {
                      const pObj = currentSquad.find(p => p.name === pName);
                      return (
                        <div
                          key={pName}
                          onClick={() => handleTogglePlayerStatus(pName)}
                          className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs transition-colors group ${
                            canEditCurrentTeam ? 'hover:bg-slate-800 cursor-pointer' : 'cursor-default'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400 font-bold text-[11px]">#{pObj?.number || '—'}</span>
                            <span className="font-bold text-slate-300 group-hover:text-emerald-300">{pName}</span>
                          </div>
                          {canEditCurrentTeam ? (
                            <span className="text-[10px] text-slate-500 group-hover:text-emerald-400 flex items-center gap-1">
                              انقل للأساسيين ⇄
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-bold">
                              بديل
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {activeBench.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-500">
                        جميع اللاعبين في التشكيل الأساسي
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* 3. SUBSTITUTIONS (التبديلات بحد أقصى 5) */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                    <strong className="text-sm font-black text-white">التبديلات في المباراة (Substitutions)</strong>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black border ${
                      activeSubstitutions.length >= MAX_SUBS_PER_TEAM
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}>
                      {activeSubstitutions.length} / {MAX_SUBS_PER_TEAM} تبديلات
                    </span>
                  </div>

                  {canEditCurrentTeam && (activeSubstitutions.length < MAX_SUBS_PER_TEAM ? (
                    <button
                      onClick={() => {
                        setSubForm({
                          minute: 65,
                          playerOut: activeStarters[0] || '',
                          playerIn: activeBench[0] || '',
                        });
                        setIsAddingSub(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-xs font-bold border border-amber-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      تسجيل تبديل جديد
                    </button>
                  ) : (
                    <span className="text-[11px] text-rose-400 font-bold">
                      ⚠️ تم استنفاد الحد الأقصى ({MAX_SUBS_PER_TEAM} تبديلات)
                    </span>
                  ))}
                </div>

                {activeSubstitutions.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-3">
                    لم يتم تسجيل أي تبديلات في هذه المباراة بعد
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeSubstitutions.map((sub, sIdx) => (
                      <div
                        key={sub.id || sIdx}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-bold text-[11px] border border-amber-500/30">
                            د{sub.minute}'
                          </span>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                              <span>🔴 خروج:</span>
                              <span className="text-white">{sub.playerOut}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                              <span>🟢 دخول:</span>
                              <span className="text-white">{sub.playerIn}</span>
                            </div>
                          </div>
                        </div>

                        {canEditCurrentTeam && (
                          <button
                            onClick={() => handleRemoveSubstitution(sub.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                            title="حذف هذا التبديل"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. CARDS & EJECTIONS (الإنذارات والبطاقات الحمراء والطرود) */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-black text-white">🟨🟥 الإنذارات والبطاقات الحمراء (الطرود)</strong>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-rose-300 text-xs font-mono font-bold border border-slate-700">
                      {activeCards.length} بطاقة
                    </span>
                  </div>

                  {canEditCurrentTeam && (
                    <button
                      onClick={() => {
                        setCardForm({
                          minute: 45,
                          playerName: currentSquad[0]?.name || '',
                          cardType: 'yellow',
                          reason: '',
                        });
                        setIsAddingCard(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold border border-rose-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      تسجيل بطاقة جديدة
                    </button>
                  )}
                </div>

                {activeCards.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-3">
                    لا توجد بطاقات أو إنذارات مسجلة لهذا الفريق في هذه المباراة
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeCards.map(c => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.cardType === 'yellow'
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              : c.cardType === 'red'
                              ? 'bg-rose-600/30 text-rose-300 border border-rose-600/40'
                              : 'bg-rose-600/40 text-rose-200 border border-amber-400/40'
                          }`}>
                            {c.cardType === 'yellow' && '🟨 إنذار أصفر'}
                            {c.cardType === 'red' && '🟥 طرد مباشر (أحمر)'}
                            {c.cardType === 'second_yellow' && '🟨🟥 إنذار ثانٍ وطرد'}
                          </span>
                          <span className="font-mono text-slate-400 font-bold">د{c.minute}'</span>
                          <strong className="text-white">{c.playerName}</strong>
                          {c.reason && <span className="text-slate-400 text-[11px]">({c.reason})</span>}
                        </div>

                        {canEditCurrentTeam && (
                          <button
                            onClick={() => handleRemoveCard(c.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                            title="حذف هذه البطاقة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* MODAL: ADD / EDIT PLAYER */}
      {isAddingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Shirt className="w-4 h-4 text-teal-400" />
                {editingPlayer 
                  ? (currentUser?.role === 'admin' ? `تعديل اللاعب كـ أدمن: ${editingPlayer.name} 👑` : `طلب تعديل بيانات اللاعب: ${editingPlayer.name}`)
                  : `إضافة لاعب جديد لفريق ${activeTeam?.name}`}
              </h3>
              <button
                onClick={() => setIsAddingPlayer(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Informational Banner */}
            {editingPlayer && (
              currentUser?.role === 'admin' ? (
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>صلاحية الأدمن: يمكنك تعديل الاسم والـ ID وبيانات اللاعب وتطبيقها مباشرة في القائمة الرسمية.</span>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 text-xs text-indigo-300 flex items-start gap-2">
                  <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    بيانات اللاعب والـ ID مقفلة لحماية النزاهة. عند حفظ التعديلات هنا، سيتم إرسال طلب تعديل رسمي للأدمن لمراجعتها والموافقة عليها.
                  </p>
                </div>
              )
            )}

            <form onSubmit={handleSavePlayer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>اسم اللاعب بالكامل *</span>
                  {editingPlayer?.isIdentityLocked && currentUser?.role !== 'admin' && (
                    <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      مقفل ومحمي (طلب تعديل للأدمن)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: محمد صلاح"
                  value={playerForm.name}
                  onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-teal-400" />
                    الرقم الجامعي للطالب (Student ID) *
                  </span>
                  {editingPlayer?.isIdentityLocked && currentUser?.role !== 'admin' && (
                    <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      مقفل ومحمي (طلب تعديل للأدمن)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 20230555"
                  value={playerForm.studentId}
                  onChange={(e) => setPlayerForm({ ...playerForm, studentId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2 text-xs font-mono focus:outline-none focus:border-teal-500"
                />
                {!editingPlayer && (
                  <p className="text-[10px] text-amber-400 font-bold mt-1">
                    🔒 حماية النزاهة: بمجرد تسجيل اللاعب واعتماده، يتم قفل الاسم والـ ID نهائياً لمنع أي تلاعب أو تغيير.
                  </p>
                )}
                {currentUser?.role !== 'admin' && !editingPlayer && (
                  <p className="text-[10px] text-teal-300 font-bold mt-0.5">
                    ⏳ تنبيه: طلب الإضافة سيرسل لمدير البطولة (Admin) للمراجعة والموافقة عليه أولاً.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">رقم القميص (#)</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={playerForm.number}
                    onChange={(e) => setPlayerForm({ ...playerForm, number: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">المركز</label>
                  <select
                    value={playerForm.position}
                    onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="GK">حارس مرمى (GK)</option>
                    <option value="DEF">مدافع (DEF)</option>
                    <option value="MID">خط وسط (MID)</option>
                    <option value="FWD">مهاجم (FWD)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="captainCheck"
                  checked={playerForm.isCaptain}
                  onChange={(e) => setPlayerForm({ ...playerForm, isCaptain: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-teal-600 focus:ring-0"
                />
                <label htmlFor="captainCheck" className="text-xs text-slate-300 font-bold cursor-pointer">
                  كابتن الفريق (Captain ⭐)
                </label>
              </div>

              {/* Player Photo Upload Section in Modal */}
              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
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
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border-2 border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {playerForm.photoUrl ? (
                      <img src={playerForm.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Shirt className="w-5 h-5 text-slate-500" />
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
                      className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-slate-950 font-bold text-xs flex items-center gap-1.5 border border-teal-500/40 transition-colors cursor-pointer shadow-sm"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{playerForm.photoUrl ? 'تغيير الصورة 📷' : 'رفع / اختيار صورة 📷'}</span>
                    </button>

                    <input
                      type="url"
                      placeholder="أو الصق رابط صورة (URL)..."
                      value={playerForm.photoUrl}
                      onChange={(e) => setPlayerForm(prev => ({ ...prev, photoUrl: e.target.value }))}
                      className="flex-1 min-w-[160px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Modification Reason field */}
              {editingPlayer && currentUser?.role !== 'admin' && (
                <div className="space-y-1 bg-slate-950/70 p-3 rounded-xl border border-indigo-500/30">
                  <label className="block text-xs font-bold text-indigo-300">
                    سبب طلب التعديل (سيظهر للأدمن) *:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: تصحيح خطأ إملائي، أو تغيير الرقم، أو تعديل المركز..."
                    value={playerForm.editReason}
                    onChange={(e) => setPlayerForm({ ...playerForm, editReason: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingPlayer(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/30 cursor-pointer flex items-center gap-1.5"
                >
                  {editingPlayer ? (
                    currentUser?.role === 'admin' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>حفظ التعديلات كـ أدمن 💾</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>إرسال طلب التعديل للأدمن 📨</span>
                      </>
                    )
                  ) : (
                    currentUser?.role === 'admin' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>إضافة واعتماد اللاعب فوراً 🔒</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>إرسال طلب القيد للأدمن 🚀</span>
                      </>
                    )
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SUBSTITUTION */}
      {isAddingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                تسجيل تبديل جديد في المباراة
              </h3>
              <button
                onClick={() => setIsAddingSub(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubstitution} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">دقيقة التبديل</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  required
                  value={subForm.minute}
                  onChange={(e) => setSubForm({ ...subForm, minute: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-400 mb-1">اللاعب الخارج 🔴 (من الأساسيين)</label>
                <select
                  required
                  value={subForm.playerOut}
                  onChange={(e) => setSubForm({ ...subForm, playerOut: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">اختر اللاعب الخارج...</option>
                  {activeStarters.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-400 mb-1">اللاعب البديل النازل 🟢 (من الدكة)</label>
                <select
                  required
                  value={subForm.playerIn}
                  onChange={(e) => setSubForm({ ...subForm, playerIn: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">اختر اللاعب النازل...</option>
                  {activeBench.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingSub(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 cursor-pointer"
                >
                  إضافة التبديل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CARD */}
      {isAddingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>🟨🟥 تسجيل بطاقة / إنذار / طرد</span>
              </h3>
              <button
                onClick={() => setIsAddingCard(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">دقيقة البطاقة</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  required
                  value={cardForm.minute}
                  onChange={(e) => setCardForm({ ...cardForm, minute: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اللاعب الحاصل على البطاقة</label>
                <select
                  required
                  value={cardForm.playerName}
                  onChange={(e) => setCardForm({ ...cardForm, playerName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">اختر اللاعب...</option>
                  {currentSquad.map(p => (
                    <option key={p.id} value={p.name}>#{p.number} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">نوع البطاقة</label>
                <select
                  value={cardForm.cardType}
                  onChange={(e) => setCardForm({ ...cardForm, cardType: e.target.value as CardType })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                >
                  <option value="yellow">🟨 إنذار أصفر</option>
                  <option value="red">🟥 كارت أحمر مباشر (طرد)</option>
                  <option value="second_yellow">🟨🟥 إنذار ثانٍ ثم طرد</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">سبب البطاقة (اختياري)</label>
                <input
                  type="text"
                  placeholder="تدخل عنيف، اعتراض، تعطيل اللعب..."
                  value={cardForm.reason}
                  onChange={(e) => setCardForm({ ...cardForm, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingCard(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 cursor-pointer"
                >
                  إضافة البطاقة
                </button>
              </div>
            </form>
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



      {/* MODAL 2: CONFIRM CLEAR SINGLE SQUAD (تفريغ قائمة فريق واحد) */}
      {confirmClearTeamTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">تفريغ قائمة فريق {confirmClearTeamTarget}</h3>
                <span className="text-xs text-rose-400 font-bold">
                  عدد اللاعبين: {(squads[confirmClearTeamTarget] || []).length} لاعب
                </span>
              </div>
            </div>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
              هل أنت متأكد من رغبتك في تفريغ ومسح كافة لاعبي فريق <strong className="text-white font-bold">{confirmClearTeamTarget}</strong>؟
              <br /><br />
              ⚠️ سيتم إفراغ قائمة الفريق لتتمكن من إضافة كشف اللاعبين الجديد من البداية.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmClearTeamTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = { ...squads, [confirmClearTeamTarget]: [] };
                  onUpdateSquads(updated);
                  saveStoredSquads(updated);
                  setConfirmClearTeamTarget(null);
                  confetti({ particleCount: 50, spread: 70 });
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>نعم، تفريغ قائمة الفريق 🗑️</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM DELETE TEAM FROM TOURNAMENT (مسح وحذف الفريق نهائياً) */}
      {confirmDeleteTeamTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">مسح وحذف الفريق نهائياً</h3>
                <span className="text-xs text-rose-400 font-bold">
                  فريق: {confirmDeleteTeamTarget.name} (المجموعة {confirmDeleteTeamTarget.group})
                </span>
              </div>
            </div>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
              هل أنت متأكد من مسح وحذف فريق <strong className="text-white font-bold">({confirmDeleteTeamTarget.name})</strong> نهائياً من البطولة؟
              <br /><br />
              ⚠️ سيتم مسح الفريق من ترتيب المجموعة وحذف كافة مبارياته وقائمته من قاعدة البيانات.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDeleteTeamTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetName = confirmDeleteTeamTarget.name;
                  if (onDeleteTeam) {
                    onDeleteTeam(targetName);
                  }
                  // Switch active team to another remaining team
                  const remaining = teams.filter(t => t.name !== targetName);
                  if (remaining.length > 0) {
                    setActiveTeamName(remaining[0].name);
                  }
                  setConfirmDeleteTeamTarget(null);
                  confetti({ particleCount: 60, spread: 80 });
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>نعم، حذف الفريق نهائياً 🗑️</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
