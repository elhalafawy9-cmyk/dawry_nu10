import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
  Sparkles, 
  Shield, 
  Target, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  ArrowRightLeft, 
  Coins, 
  Info, 
  X, 
  UserCheck, 
  Flame, 
  Zap, 
  Plus, 
  RotateCcw, 
  Save, 
  Medal, 
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
  Activity,
  Crown,
  Star,
  Lock,
  Clock
} from 'lucide-react';
import { Match, Team } from '../App';
import { Player } from '../utils/roster';
import { AppUser } from '../utils/auth';
import { getRoundLockStatus } from '../utils/roundLock';
import { 
  FantasyPlayer, 
  FantasyTeam, 
  SelectedFantasySlot, 
  FANTASY_BUDGET, 
  TOTAL_SQUAD_SIZE, 
  MAX_PLAYERS_PER_TEAM, 
  FANTASY_SLOTS_LAYOUT,
  getAllFantasyPlayers, 
  calculateFantasyTeamPoints, 
  generateAutoPickSquad, 
  createEmptySlotPlayer,
  loadLocalFantasyTeam, 
  saveLocalFantasyTeam, 
  isParisChampionTeam,
  SAMPLE_RIVAL_FANTASY_TEAMS, 
  FantasyLeaderboardEntry 
} from '../utils/fantasy';

interface FantasyLeaguePageProps {
  currentUser: AppUser | null;
  teams: Team[];
  matches: Match[];
  squads: Record<string, Player[]>;
  onNavigateToRoster?: () => void;
}

export const FantasyLeaguePage: React.FC<FantasyLeaguePageProps> = ({
  currentUser,
  teams,
  matches,
  squads,
  onNavigateToRoster,
}) => {
  // Active Tab: 'pitch' (تشكيلة الملعب) | 'standings' (صفحة المراكز) | 'market' (سوق الانتقالات) | 'rules' (القواعد)
  const [activeTab, setActiveTab] = useState<'pitch' | 'standings' | 'market' | 'rules'>('pitch');
  const [standingsTab, setStandingsTab] = useState<'managers' | 'positions_ranking' | 'champions'>('managers');
  const [positionRankingFilter, setPositionRankingFilter] = useState<'GK' | 'DEF' | 'MID' | 'FWD'>('FWD');

  // Tournament active round lock status: once round kicks off, squad modifications and transfers are locked!
  const roundLock = useMemo(() => {
    return getRoundLockStatus(matches);
  }, [matches]);

  // Compute all available tournament players from real rosters
  const allPlayers = useMemo(() => {
    return getAllFantasyPlayers(squads, matches, teams);
  }, [squads, matches, teams]);

  // Player map for instant lookup
  const playerMap = useMemo(() => {
    const map = new Map<string, FantasyPlayer>();
    allPlayers.forEach(p => map.set(p.id, p));
    return map;
  }, [allPlayers]);

  // Current User Fantasy Team State
  const userId = currentUser?.id || 'guest_user';
  const [fantasyTeam, setFantasyTeam] = useState<FantasyTeam>(() => {
    const saved = loadLocalFantasyTeam(userId);
    if (saved && saved.slots && saved.slots.length > 0) {
      // Re-hydrate slots with freshest player stats, cleanly reverting deleted players to empty slots
      const refreshedSlots: SelectedFantasySlot[] = saved.slots.map(slot => {
        if (slot.player.id.startsWith('empty_')) return slot;
        const freshPlayer = playerMap.get(slot.player.id);
        if (freshPlayer) {
          return { ...slot, player: freshPlayer };
        }
        return {
          ...slot,
          player: createEmptySlotPlayer(slot.position, slot.slotIndex),
        };
      });

      const spent = refreshedSlots.filter(s => !s.player.id.startsWith('empty_')).reduce((sum, s) => sum + s.player.price, 0);
      if (spent <= FANTASY_BUDGET) {
        const { totalPoints, gameweekPoints } = calculateFantasyTeamPoints({ ...saved, slots: refreshedSlots });
        return {
          ...saved,
          slots: refreshedSlots,
          totalPoints,
          gameweekPoints,
          remainingBudget: Math.round((FANTASY_BUDGET - spent) * 10) / 10,
        };
      }
    }

    // Default: generate a smart starting squad within 50.0M (with empty slots if players not yet added)
    const initialSlots = generateAutoPickSquad(allPlayers);
    const spent = initialSlots.filter(s => !s.player.id.startsWith('empty_')).reduce((sum, s) => sum + s.player.price, 0);

    return {
      userId,
      managerName: currentUser?.name || 'مدرب الفانتزي',
      managerEmail: currentUser?.email || 'student@nu.edu.eg',
      department: currentUser?.playerTeamName || 'جامعة النيل الأهلية',
      teamName: currentUser?.name ? `كتيبة ${currentUser.name.split(' ')[0]}` : 'نجوم جامعة النيل',
      formation: '1-2-2-2',
      slots: initialSlots,
      totalPoints: initialSlots.filter(s => s.isStarter && !s.player.id.startsWith('empty_')).reduce((sum, s) => sum + (s.player.totalPoints || 0) * (s.isCaptain ? 2 : 1), 0),
      gameweekPoints: initialSlots.filter(s => s.isStarter && !s.player.id.startsWith('empty_')).reduce((sum, s) => sum + (s.player.gameweekPoints || 0) * (s.isCaptain ? 2 : 1), 0),
      remainingBudget: Math.round((FANTASY_BUDGET - spent) * 10) / 10,
      transfersMade: 0,
      updatedAt: new Date().toISOString(),
    };
  });

  // Keep fantasy team slots synced whenever players are added or modified in squads!
  useEffect(() => {
    setFantasyTeam(prev => {
      let changed = false;
      const updatedSlots = prev.slots.map(slot => {
        if (slot.player.id.startsWith('empty_')) return slot;
        const fresh = playerMap.get(slot.player.id);
        if (fresh && (fresh.name !== slot.player.name || fresh.price !== slot.player.price || fresh.totalPoints !== slot.player.totalPoints)) {
          changed = true;
          return { ...slot, player: fresh };
        } else if (!fresh) {
          // Player no longer exists in squads
          changed = true;
          return { ...slot, player: createEmptySlotPlayer(slot.position, slot.slotIndex) };
        }
        return slot;
      });

      if (!changed) return prev;
      const spent = updatedSlots.filter(s => !s.player.id.startsWith('empty_')).reduce((sum, s) => sum + s.player.price, 0);
      const { totalPoints, gameweekPoints } = calculateFantasyTeamPoints({ ...prev, slots: updatedSlots });
      const nextTeam: FantasyTeam = {
        ...prev,
        slots: updatedSlots,
        totalPoints,
        gameweekPoints,
        remainingBudget: Math.round((FANTASY_BUDGET - spent) * 10) / 10,
        updatedAt: new Date().toISOString(),
      };
      saveLocalFantasyTeam(nextTeam);
      return nextTeam;
    });
  }, [playerMap]);

  // Keep fantasy team synced with current user profile
  useEffect(() => {
    if (currentUser) {
      setFantasyTeam(prev => ({
        ...prev,
        userId: currentUser.id,
        managerName: currentUser.name || prev.managerName,
        managerEmail: currentUser.email || prev.managerEmail,
        department: currentUser.playerTeamName || currentUser.managedTeamName || prev.department,
      }));
    }
  }, [currentUser]);

  // Recalculate team points and budget whenever slots change
  const currentBudgetSpent = useMemo(() => {
    return Math.round(fantasyTeam.slots.filter(s => !s.player.id.startsWith('empty_')).reduce((sum, s) => sum + s.player.price, 0) * 10) / 10;
  }, [fantasyTeam.slots]);

  const remainingBudget = useMemo(() => {
    return Math.round((FANTASY_BUDGET - currentBudgetSpent) * 10) / 10;
  }, [currentBudgetSpent]);

  const { totalPoints, gameweekPoints } = useMemo(() => {
    return calculateFantasyTeamPoints(fantasyTeam);
  }, [fantasyTeam]);

  // Toast Notification Message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // State for Player Selection Modal
  const [replacingSlotIndex, setReplacingSlotIndex] = useState<number | null>(null);
  const [marketSearch, setMarketSearch] = useState<string>('');
  const [marketPositionFilter, setMarketPositionFilter] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'>('ALL');
  const [marketTeamFilter, setMarketTeamFilter] = useState<string>('ALL');
  const [marketSortBy, setMarketSortBy] = useState<'points' | 'price' | 'goals' | 'assists'>('points');

  // Edit Team Name Modal
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState(fantasyTeam.teamName);

  // Selected Player Details Preview
  const [previewPlayer, setPreviewPlayer] = useState<FantasyPlayer | null>(null);

  // Filtered market players
  const filteredMarketPlayers = useMemo(() => {
    return allPlayers.filter(p => {
      // Slot position constraint if opening market to fill a specific slot
      if (replacingSlotIndex !== null) {
        const targetSlot = FANTASY_SLOTS_LAYOUT[replacingSlotIndex];
        if (targetSlot) {
          if (targetSlot.slotIndex === 7) {
            if (p.position !== 'DEF' && p.position !== 'MID') return false;
          } else if (targetSlot.slotIndex === 8) {
            if (p.position !== 'FWD' && p.position !== 'MID') return false;
          } else {
            if (p.position !== targetSlot.position) return false;
          }
        }
      } else if (marketPositionFilter !== 'ALL') {
        if (p.position !== marketPositionFilter) return false;
      }

      // Team filter
      if (marketTeamFilter !== 'ALL' && p.team !== marketTeamFilter) {
        return false;
      }

      // Search
      if (marketSearch.trim()) {
        const query = marketSearch.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(query);
        const matchTeam = p.team.toLowerCase().includes(query);
        const matchId = p.studentId.toLowerCase().includes(query);
        if (!matchName && !matchTeam && !matchId) return false;
      }

      return true;
    }).sort((a, b) => {
      if (marketSortBy === 'points') return b.totalPoints - a.totalPoints || b.price - a.price;
      if (marketSortBy === 'price') return b.price - a.price;
      if (marketSortBy === 'goals') return b.goals - a.goals || b.totalPoints - a.totalPoints;
      if (marketSortBy === 'assists') return b.assists - a.assists || b.totalPoints - a.totalPoints;
      return 0;
    });
  }, [allPlayers, replacingSlotIndex, marketPositionFilter, marketTeamFilter, marketSearch, marketSortBy]);

  // Check if player is already selected in team
  const isPlayerInSquad = (playerId: string) => {
    return fantasyTeam.slots.some(s => s.player.id === playerId);
  };

  // Count players from a specific university team in squad
  const countPlayersFromTeam = (teamName: string, ignorePlayerId?: string) => {
    return fantasyTeam.slots.filter(s => s.player.team === teamName && s.player.id !== ignorePlayerId).length;
  };

  // Handle select / replace player
  const handleSelectPlayerForSlot = (player: FantasyPlayer, targetSlotIndex: number) => {
    if (roundLock.isLocked) {
      showToast(`🔒 التعديل مقفل: بدأت ${roundLock.roundName} رسمياً وتم تجميد التشكيلة وسوق الانتقالات حتى نهاية مباريات الجولة!`);
      return;
    }

    if (isPlayerInSquad(player.id)) {
      showToast(`اللاعب "${player.name}" موجود بالفعل في تشكيلتك!`);
      return;
    }

    const currentInSlot = fantasyTeam.slots.find(s => s.slotIndex === targetSlotIndex);
    const countInTeam = countPlayersFromTeam(player.team, currentInSlot?.player.id);
    if (countInTeam >= MAX_PLAYERS_PER_TEAM) {
      showToast(`لا يمكنك اختيار أكثر من لاعبين اثنين من نفس الفريق (${player.team})!`);
      return;
    }

    const currentPrice = currentInSlot && !currentInSlot.player.id.startsWith('empty_') ? currentInSlot.player.price : 0;
    const priceDiff = player.price - currentPrice;
    if (remainingBudget - priceDiff < 0) {
      showToast(`ميزانيتك لا تكفي! يتبقى لك ${remainingBudget}M وسعر اللاعب ${player.price}M (الميزانية 50.0M)`);
      return;
    }

    const updatedSlots = fantasyTeam.slots.map(s => {
      if (s.slotIndex === targetSlotIndex) {
        return {
          ...s,
          player,
        };
      }
      return s;
    });

    const newTeam: FantasyTeam = {
      ...fantasyTeam,
      slots: updatedSlots,
      transfersMade: fantasyTeam.transfersMade + 1,
      updatedAt: new Date().toISOString(),
    };

    setFantasyTeam(newTeam);
    saveLocalFantasyTeam(newTeam);
    setReplacingSlotIndex(null);
    setActiveTab('pitch');
    showToast(`تمت إضافة "${player.name}" إلى تشكيلتك بنجاح ⚽`);
  };

  // Set Captain
  const handleSetCaptain = (slotIndex: number) => {
    if (roundLock.isLocked) {
      showToast(`🔒 لا يمكن تغيير الكابتن بعد انطلاق ${roundLock.roundName}!`);
      return;
    }

    const updatedSlots = fantasyTeam.slots.map(s => {
      if (s.slotIndex === slotIndex) {
        return { ...s, isCaptain: true, isViceCaptain: false };
      }
      if (s.isCaptain) {
        return { ...s, isCaptain: false };
      }
      return s;
    });

    const newTeam: FantasyTeam = { ...fantasyTeam, slots: updatedSlots };
    setFantasyTeam(newTeam);
    saveLocalFantasyTeam(newTeam);
    showToast('تم تعيين كابتن الفريق بنجاح (مضاعفة النقاط x2) ⭐');
  };

  // Set Vice Captain
  const handleSetViceCaptain = (slotIndex: number) => {
    if (roundLock.isLocked) {
      showToast(`🔒 لا يمكن تغيير نائب الكابتن بعد انطلاق ${roundLock.roundName}!`);
      return;
    }

    const updatedSlots = fantasyTeam.slots.map(s => {
      if (s.slotIndex === slotIndex) {
        return { ...s, isViceCaptain: true, isCaptain: false };
      }
      if (s.isViceCaptain) {
        return { ...s, isViceCaptain: false };
      }
      return s;
    });

    const newTeam: FantasyTeam = { ...fantasyTeam, slots: updatedSlots };
    setFantasyTeam(newTeam);
    saveLocalFantasyTeam(newTeam);
    showToast('تم تعيين نائب الكابتن بنجاح 🛡️');
  };

  // Reset team
  const handleResetTeam = () => {
    if (roundLock.isLocked) {
      showToast(`🔒 لا يمكن تفريغ التشكيلة بعد انطلاق ${roundLock.roundName}!`);
      return;
    }

    if (window.confirm('هل تريد تفريغ التشكيلة لإعادة بنائها ضمن ميزانية 50.0M؟')) {
      const blankSlots: SelectedFantasySlot[] = FANTASY_SLOTS_LAYOUT.map(layout => ({
        slotIndex: layout.slotIndex,
        position: layout.position,
        isStarter: layout.isStarter,
        isCaptain: layout.slotIndex === 5,
        isViceCaptain: layout.slotIndex === 6,
        player: {
          id: `empty_${layout.slotIndex}`,
          name: 'خانة فارغة',
          team: 'اختر لاعب',
          position: layout.position,
          price: 3.5,
          number: 0,
          studentId: '',
          totalPoints: 0,
          gameweekPoints: 0,
          goals: 0,
          assists: 0,
          cleanSheets: 0,
          yellowCards: 0,
          redCards: 0,
          matchesPlayed: 0,
        },
      }));

      const newTeam: FantasyTeam = {
        ...fantasyTeam,
        slots: blankSlots,
        totalPoints: 0,
        gameweekPoints: 0,
        remainingBudget: FANTASY_BUDGET,
      };
      setFantasyTeam(newTeam);
      saveLocalFantasyTeam(newTeam);
      showToast('تم تفريغ التشكيلة. ميزانيتك الآن 50.0M كاملة 🛒');
    }
  };

  // Auto-pick squad within 50.0M
  const handleAutoPick = () => {
    if (roundLock.isLocked) {
      showToast(`🔒 لا يمكن الاختيار التلقائي بعد انطلاق ${roundLock.roundName}!`);
      return;
    }

    const autoSlots = generateAutoPickSquad(allPlayers);
    const spent = autoSlots.reduce((sum, s) => sum + s.player.price, 0);

    const newTeam: FantasyTeam = {
      ...fantasyTeam,
      slots: autoSlots,
      remainingBudget: Math.round((FANTASY_BUDGET - spent) * 10) / 10,
      updatedAt: new Date().toISOString(),
    };

    setFantasyTeam(newTeam);
    saveLocalFantasyTeam(newTeam);
    showToast('تم توليد تشكيلة متوازنة وذكية ضمن ميزانية 50.0M بنجاح ⚡');
  };

  // Save / Confirm Team
  const handleSaveTeam = () => {
    if (roundLock.isLocked) {
      showToast(`🔒 التشكيلة مقفلة للجولة الحالية ولن يُسمح بالحفظ حتى نهاية مباريات الجولة!`);
      return;
    }

    if (remainingBudget < 0) {
      showToast('تجاوزت الميزانية المحددة (50.0M)! يرجى استبدال بعض اللاعبين.');
      return;
    }
    saveLocalFantasyTeam(fantasyTeam);
    showToast('تم حفظ واعتماد تشكيلة الفانتزي الخاصة بك بنجاح! 🏆');
  };

  // Update Team Name
  const handleSaveTeamName = () => {
    if (!teamNameInput.trim()) return;
    const updated = { ...fantasyTeam, teamName: teamNameInput.trim() };
    setFantasyTeam(updated);
    saveLocalFantasyTeam(updated);
    setIsEditingTeamName(false);
    showToast('تم تحديث اسم فريق الفانتزي بنجاح 🏷️');
  };

  // Combined Leaderboard with current user
  const combinedLeaderboard: FantasyLeaderboardEntry[] = useMemo(() => {
    const currentCaptain = fantasyTeam.slots.find(s => s.isCaptain)?.player.name || 'بدون كابتن';
    const userEntry: FantasyLeaderboardEntry = {
      rank: 0,
      userId: fantasyTeam.userId,
      managerName: `${fantasyTeam.managerName} (أنت)`,
      managerEmail: fantasyTeam.managerEmail,
      teamName: fantasyTeam.teamName,
      department: fantasyTeam.department,
      captainName: currentCaptain,
      gameweekPoints,
      totalPoints,
      slotsCount: fantasyTeam.slots.filter(s => !s.player.id.startsWith('empty_')).length,
      updatedAt: 'الآن',
    };

    const rivals = SAMPLE_RIVAL_FANTASY_TEAMS.filter(r => r.userId !== fantasyTeam.userId);
    const all = [userEntry, ...rivals].sort((a, b) => b.totalPoints - a.totalPoints || b.gameweekPoints - a.gameweekPoints);
    
    return all.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }, [fantasyTeam, totalPoints, gameweekPoints]);

  // Paris champion squad players (the most expensive in the tournament)
  const parisPlayers = useMemo(() => {
    return allPlayers.filter(p => isParisChampionTeam(p.team)).sort((a, b) => b.price - a.price);
  }, [allPlayers]);

  // Top players by position for the Standings / المراكز view
  const topPlayersByPosition = useMemo(() => {
    return allPlayers.filter(p => p.position === positionRankingFilter).sort((a, b) => b.totalPoints - a.totalPoints || b.price - a.price);
  }, [allPlayers, positionRankingFilter]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-black px-5 py-3 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-3 animate-slideUp">
          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-[#0a2f16] to-slate-900 border border-emerald-500/30 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>فانتزي دوري جامعة النيل 🌟 (الميزانية: 50.0M)</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <span>فانتزي لاعبي البطولة</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black flex items-center gap-1">
              <Crown className="w-3 h-3 text-slate-950" />
              <span>باريس الأبطال الأغلى 👑</span>
            </span>
          </h1>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            ابنِ فريقك من 7 أساسيين و2 بدلاء بميزانية <strong className="text-amber-300">50 مليون فقط</strong>.
            لاعبي <strong className="text-amber-300">فريق باريس</strong> هم أبطال النسخة السابقة والأعلى سعراً بالبطولة!
          </p>
        </div>

        {/* Quick Manager Profile & Stats Card */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 md:p-5 shadow-xl flex flex-col gap-3 min-w-[270px] w-full md:w-auto">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="text-[11px] text-slate-400 font-bold">اسم الفريق والمدرب:</div>
              <div className="text-sm font-black text-white flex items-center gap-1.5">
                <span>{fantasyTeam.teamName}</span>
                <button
                  onClick={() => setIsEditingTeamName(true)}
                  className="text-emerald-400 hover:text-emerald-300 text-xs underline cursor-pointer"
                  title="تعديل اسم الفريق"
                >
                  ✎
                </button>
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold">{fantasyTeam.managerName}</div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-black shadow-lg">
              <Trophy className="w-5 h-5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold">النقاط الكلية</div>
              <div className="text-xl font-black text-amber-400">{totalPoints}</div>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold">نقاط الجولة</div>
              <div className="text-xl font-black text-emerald-400">+{gameweekPoints}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab 1: Pitch */}
          <button
            onClick={() => setActiveTab('pitch')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'pitch'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-300" />
            <span>ملعب التشكيلة (50M) 🏟️</span>
          </button>

          {/* Tab 2: Standings & Rankings (صفحة المراكز) */}
          <button
            onClick={() => setActiveTab('standings')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'standings'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30 font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Medal className="w-4 h-4 text-amber-400" />
            <span>جدول المراكز وترتيب النجوم 🏆</span>
          </button>

          {/* Tab 3: Transfer Market */}
          <button
            onClick={() => {
              setReplacingSlotIndex(null);
              setActiveTab('market');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'market'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-300" />
            <span>سوق الانتقالات 🛒</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-xs border border-emerald-500/30">
              {allPlayers.length}
            </span>
          </button>

          {/* Tab 4: Rules */}
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-slate-800 text-emerald-300 border border-emerald-500/40 font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Info className="w-4 h-4 text-slate-400" />
            <span>نظام احتساب النقاط 📖</span>
          </button>
        </div>

        {/* Quick Actions (Auto-Pick, Reset, Save) */}
        <div className="flex items-center gap-2">
          {roundLock.isLocked ? (
            <div className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2 shadow-sm">
              <Lock className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>التشكيلة مقفلة للجولة ({roundLock.roundName})</span>
            </div>
          ) : (
            <>
              <button
                onClick={handleAutoPick}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 hover:border-amber-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                title="توليد تشكيلة ذكية متوازنة تلقائياً ضمن 50M"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>تشكيلة ذكية ⚡</span>
              </button>

              <button
                onClick={handleResetTeam}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="تفريغ التشكيلة لإعادة البناء بميزانية 50.0M"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تفريغ 🔄</span>
              </button>

              <button
                onClick={handleSaveTeam}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Save className="w-4 h-4" />
                <span>حفظ واعتماد 💾</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Gameweek Deadline & Round Lock Status Banner */}
      {roundLock.isLocked ? (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 border border-amber-500/50 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
              <Lock className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-sm md:text-base">
                  تم قفل التعديل رسمياً — {roundLock.roundName} بدأت 🔒
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black border border-amber-500/30">
                  تجميد التشكيلة (Locked)
                </span>
              </div>
              <p className="text-xs text-amber-200/90 mt-0.5">
                {roundLock.lockReason} وفقاً لقواعد الفانتزي، لا يُسمح بأي انتقالات، تبديلات، أو تغيير شارة الكابتن حتى نهاية مباريات الجولة واكتمال احتساب النقاط.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-amber-500/30 text-xs font-mono text-amber-300 shadow-sm">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>مباريات الجولة: {roundLock.finishedMatchesCount} من {roundLock.totalMatchesCount} منتهية</span>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-300">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">
              {roundLock.deadlineNotice}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            بمجرد انطلاق أول مباراة في الجولة، سيتم قفل التعديل تلقائياً ⏱️
          </div>
        </div>
      )}

      {/* Budget & Squad Tracker Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold">الميزانية المتبقية (من 50M)</div>
            <div className={`text-lg font-black ${remainingBudget < 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
              {remainingBudget}M / {FANTASY_BUDGET}.0M
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold">اكتمال القائمة</div>
            <div className="text-lg font-black text-white">
              {fantasyTeam.slots.filter(s => !s.player.id.startsWith('empty_')).length} / {TOTAL_SQUAD_SIZE} لاعبين
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold">كابتن الفريق (x2)</div>
            <div className="text-sm font-black text-amber-300 truncate max-w-[140px]">
              {fantasyTeam.slots.find(s => s.isCaptain && !s.player.id.startsWith('empty_'))?.player.name || 'لم يحدد بعد'}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold">الانتقالات المنجزة</div>
            <div className="text-lg font-black text-indigo-300">
              {fantasyTeam.transfersMade} تبديل
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: PITCH / SQUAD BUILDER VIEW */}
      {/* ============================================================== */}
      {activeTab === 'pitch' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Visual Soccer Pitch (7 starters + 2 bench) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#14532d] via-[#166534] to-[#14532d] border-4 border-[#22c55e]/30 shadow-2xl p-4 md:p-6 min-h-[580px] flex flex-col justify-between">
              
              {/* Pitch Visual Markings */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-2 border-white"></div>
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white -translate-y-1/2"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 border-b-2 border-x-2 border-white rounded-b-2xl"></div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-24 border-t-2 border-x-2 border-white rounded-t-2xl"></div>
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_40px,rgba(0,0,0,0.06)_40px,rgba(0,0,0,0.06)_80px)]"></div>
              </div>

              {/* Pitch Header info */}
              <div className="relative z-10 flex items-center justify-between text-white/90 text-xs font-bold px-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>تشكيلة الملعب (1-2-2-2) — الميزانية 50.0M</span>
                </div>
                <div className="text-emerald-200">
                  انقر على أي لاعب لتبديله أو تعيينه كابتن ⭐
                </div>
              </div>

              {/* Pitch Formation Rows */}
              <div className="relative z-10 flex flex-col justify-around gap-6 py-4 flex-1">
                {/* Row 1: Goalkeeper */}
                <div className="flex justify-center items-center">
                  <PitchPlayerCard
                    slot={fantasyTeam.slots[0]}
                    onSelect={() => {
                      if (roundLock.isLocked) {
                        showToast(`🔒 التعديل مقفل: انطلقت ${roundLock.roundName} وتم قفل التشكيلة وسوق الانتقالات!`);
                        return;
                      }
                      setReplacingSlotIndex(0);
                      setActiveTab('market');
                    }}
                    onSetCaptain={() => handleSetCaptain(0)}
                    onSetVice={() => handleSetViceCaptain(0)}
                    onViewStats={(p) => setPreviewPlayer(p)}
                    isLocked={roundLock.isLocked}
                  />
                </div>

                {/* Row 2: Defenders */}
                <div className="flex justify-around items-center px-4 md:px-12">
                  <PitchPlayerCard
                    slot={fantasyTeam.slots[1]}
                    onSelect={() => {
                      if (roundLock.isLocked) {
                        showToast(`🔒 التعديل مقفل: انطلقت ${roundLock.roundName} وتم قفل التشكيلة وسوق الانتقالات!`);
                        return;
                      }
                      setReplacingSlotIndex(1);
                      setActiveTab('market');
                    }}
                    onSetCaptain={() => handleSetCaptain(1)}
                    onSetVice={() => handleSetViceCaptain(1)}
                    onViewStats={(p) => setPreviewPlayer(p)}
                    isLocked={roundLock.isLocked}
                  />
                  <PitchPlayerCard
                    slot={fantasyTeam.slots[2]}
                    onSelect={() => {
                      if (roundLock.isLocked) {
                        showToast(`🔒 التعديل مقفل: انطلقت ${roundLock.roundName} وتم قفل التشكيلة وسوق الانتقالات!`);
                        return;
                      }
                      setReplacingSlotIndex(2);
                      setActiveTab('market');
                    }}
                    onSetCaptain={() => handleSetCaptain(2)}
                    onSetVice={() => handleSetViceCaptain(2)}
                    onViewStats={(p) => setPreviewPlayer(p)}
                    isLocked={roundLock.isLocked}
                  />
                </div>

                {/* Row 3: Midfielders */}
                <div className="flex justify-around items-center px-4 md:px-12">
                  <PitchPlayerCard
                    slot={fantasyTeam.slots[3]}
                    onSelect={() => {
                      if (roundLock.isLocked) {
                        showToast(`🔒 التعديل مقفل: انطلقت ${roundLock.roundName} وتم قفل التشكيلة وسوق الانتقالات!`);
                        return;
                      }
                      setReplacingSlotIndex(3);
                      setActiveTab('market');
                    }}
                    onSetCaptain={() => handleSetCaptain(3)}
                    onSetVice={() => handleSetViceCaptain(3)}
                    onViewStats={(p) => setPreviewPlayer(p)}
                    isLocked={roundLock.isLocked}
                  />
                  <PitchPlayerCard
                    slot={fantasyTeam.slots[4]}
                    onSelect={() => {
                      if (roundLock.isLocked) {
                        showToast(`🔒 التعديل مقفل: انطلقت ${roundLock.roundName} وتم قفل التشكيلة وسوق الانتقالات!`);
                        return;
                      }
                      setReplacingSlotIndex(4);
                      setActiveTab('market');
                    }}
                    onSetCaptain={() => handleSetCaptain(4)}
                    onSetVice={() => handleSetViceCaptain(4)}
                    onViewStats={(p) => setPreviewPlayer(p)}
                    isLocked={roundLock.isLocked}
                  />
                </div>

                {/* Row 4: Forwards */}
                <div className="flex justify-around items-center px-4 md:px-12">
                  <PitchPlayerCard
                    slot={fantasyTeam.slots[5]}
                    onSelect={() => {
                      if (roundLock.isLocked) {
                        showToast(`🔒 التعديل مقفل: انطلقت ${roundLock.roundName} وتم قفل التشكيلة وسوق الانتقالات!`);
                        return;
                      }
                      setReplacingSlotIndex(5);
                      setActiveTab('market');
                    }}
                    onSetCaptain={() => handleSetCaptain(5)}
                    onSetVice={() => handleSetViceCaptain(5)}
                    onViewStats={(p) => setPreviewPlayer(p)}
                    isLocked={roundLock.isLocked}
                  />
                  <PitchPlayerCard
                    slot={fantasyTeam.slots[6]}
                    onSelect={() => {
                      if (roundLock.isLocked) {
                        showToast(`🔒 التعديل مقفل: انطلقت ${roundLock.roundName} وتم قفل التشكيلة وسوق الانتقالات!`);
                        return;
                      }
                      setReplacingSlotIndex(6);
                      setActiveTab('market');
                    }}
                    onSetCaptain={() => handleSetCaptain(6)}
                    onSetVice={() => handleSetViceCaptain(6)}
                    onViewStats={(p) => setPreviewPlayer(p)}
                    isLocked={roundLock.isLocked}
                  />
                </div>
              </div>

              {/* Bench Row */}
              <div className="relative z-10 mt-3 pt-3 border-t-2 border-white/20 bg-slate-950/70 -mx-4 -mb-4 md:-mx-6 md:-mb-6 p-4 rounded-b-2xl">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2 px-1">
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <Users className="w-3.5 h-3.5" />
                    <span>دكة البدلاء (لا يحسبون نقاطاً إلا بالتبديل)</span>
                  </div>
                  <div className="text-[11px] text-slate-400">بديل دفاع/وسط + بديل هجوم/وسط</div>
                </div>

                <div className="flex justify-center items-center gap-6">
                  <PitchPlayerCard
                    slot={fantasyTeam.slots[7]}
                    onSelect={() => {
                      if (roundLock.isLocked) {
                        showToast(`🔒 التعديل مقفل: انطلقت ${roundLock.roundName} وتم قفل التشكيلة وسوق الانتقالات!`);
                        return;
                      }
                      setReplacingSlotIndex(7);
                      setActiveTab('market');
                    }}
                    onSetCaptain={() => handleSetCaptain(7)}
                    onSetVice={() => handleSetViceCaptain(7)}
                    onViewStats={(p) => setPreviewPlayer(p)}
                    isBench
                    isLocked={roundLock.isLocked}
                  />
                  <PitchPlayerCard
                    slot={fantasyTeam.slots[8]}
                    onSelect={() => {
                      if (roundLock.isLocked) {
                        showToast(`🔒 التعديل مقفل: انطلقت ${roundLock.roundName} وتم قفل التشكيلة وسوق الانتقالات!`);
                        return;
                      }
                      setReplacingSlotIndex(8);
                      setActiveTab('market');
                    }}
                    onSetCaptain={() => handleSetCaptain(8)}
                    onSetVice={() => handleSetViceCaptain(8)}
                    onViewStats={(p) => setPreviewPlayer(p)}
                    isBench
                    isLocked={roundLock.isLocked}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel: Team Roster Summary & Controls */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>قائمة لاعبي تشكيلتك</span>
                </h3>
                <span className="text-xs font-bold text-slate-400">
                  {fantasyTeam.slots.filter(s => !s.player.id.startsWith('empty_')).length}/9
                </span>
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {fantasyTeam.slots.map((slot) => {
                  const isEmpty = slot.player.id.startsWith('empty_');
                  return (
                    <div
                      key={slot.slotIndex}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isEmpty 
                          ? 'bg-slate-950/60 border-dashed border-slate-800 hover:border-emerald-500/40 cursor-pointer' 
                          : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                      }`}
                      onClick={() => setReplacingSlotIndex(slot.slotIndex)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                          slot.position === 'GK' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          slot.position === 'DEF' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          slot.position === 'MID' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {slot.position}
                        </span>

                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span>{isEmpty ? `+ إضافة لاعب (${slot.position})` : slot.player.name}</span>
                            {slot.player.isChampion && (
                              <span className="text-[10px]" title="بطل النسخة السابقة">👑</span>
                            )}
                            {slot.isCaptain && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                                C
                              </span>
                            )}
                            {slot.isViceCaptain && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-300 text-slate-950 text-[9px] font-black">
                                V
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {isEmpty ? (slot.isStarter ? 'مركز أساسي' : 'بديل') : `${slot.player.team} • #${slot.player.number}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isEmpty && (
                          <div className="text-right">
                            <div className="text-xs font-black text-amber-400">{slot.player.totalPoints} ن</div>
                            <div className="text-[10px] text-slate-400">{slot.player.price}M</div>
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplacingSlotIndex(slot.slotIndex);
                          }}
                          className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                          title="تغيير اللاعب"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Open Transfer Market Button */}
              <button
                onClick={() => {
                  setReplacingSlotIndex(null);
                  setActiveTab('market');
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all"
              >
                <Users className="w-4 h-4" />
                <span>فتح سوق اللاعبين الكامل 🛒</span>
              </button>
            </div>

            {/* Quick Rules & Paris Champion Notice */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>قواعد الفانتزي والميزانية</span>
              </h4>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>الميزانية الرسمية: <strong className="text-white font-black">50.0M</strong> جنيه/عملة.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>لاعبي <strong className="text-amber-400 font-bold">باريس (PSG)</strong> هم أبطال النسخة السابقة والأعلى سعراً بالدوري (7.5M - 12.0M).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>الحد الأقصى من نفس الفريق: <strong className="text-white font-bold">لاعبان اثنان فقط</strong>.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>كابتن الفريق المختار <strong className="text-amber-400 font-black">(C)</strong> يضاعف النقاط (x2).</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: STANDINGS & RANKINGS (صفحة المراكز وترتيب النجوم) */}
      {/* ============================================================== */}
      {activeTab === 'standings' && (
        <div className="space-y-6">
          {/* Sub-tabs inside المراكز */}
          <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setStandingsTab('managers')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  standingsTab === 'managers'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>مراكز وترتيب المدربين والطلاب 🏆</span>
              </button>

              <button
                onClick={() => setStandingsTab('positions_ranking')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  standingsTab === 'positions_ranking'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Target className="w-4 h-4" />
                <span>المراكز حسب مراكز اللاعبين (GK, DEF, MID, FWD) ⭐</span>
              </button>

              <button
                onClick={() => setStandingsTab('champions')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  standingsTab === 'champions'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Crown className="w-4 h-4 text-amber-400" />
                <span>كتيبة أبطال باريس (الأعلى سعراً) 👑</span>
              </button>
            </div>
          </div>

          {/* VIEW A: MANAGERS STANDINGS */}
          {standingsTab === 'managers' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span>جدول مراكز دوري الفانتزي بجامعة النيل 🏆</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    تنافس مع طلاب وكليات ومدربي جامعة النيل في جمع أكبر عدد من نقاط الفانتزي
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-bold">مشاركين:</span>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/30">
                    {combinedLeaderboard.length} مدرباً
                  </span>
                </div>
              </div>

              {/* Leaderboard Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-black text-slate-400">
                      <th className="py-3 px-3">المركز</th>
                      <th className="py-3 px-3">المدرب وفريق الفانتزي</th>
                      <th className="py-3 px-3">الكلية / الفريق</th>
                      <th className="py-3 px-3">كابتن الفريق</th>
                      <th className="py-3 px-3 text-center">نقاط الجولة</th>
                      <th className="py-3 px-3 text-center">النقاط الإجمالية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {combinedLeaderboard.map((entry) => {
                      const isCurrentUser = entry.userId === fantasyTeam.userId;
                      return (
                        <tr
                          key={entry.userId}
                          className={`transition-colors ${
                            isCurrentUser
                              ? 'bg-emerald-950/40 font-black text-white border-l-4 border-l-emerald-400'
                              : 'hover:bg-slate-800/40 text-slate-300'
                          }`}
                        >
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5">
                              {entry.rank === 1 && <span className="text-lg">🥇</span>}
                              {entry.rank === 2 && <span className="text-lg">🥈</span>}
                              {entry.rank === 3 && <span className="text-lg">🥉</span>}
                              {entry.rank > 3 && (
                                <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-black flex items-center justify-center">
                                  #{entry.rank}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{entry.teamName}</span>
                                {isCurrentUser && (
                                  <span className="px-2 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black">
                                    فريقك
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">{entry.managerName}</div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 text-slate-400">
                            {entry.department}
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="text-amber-300 font-bold flex items-center gap-1">
                              <span>⭐</span>
                              <span>{entry.captainName}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-center font-bold text-emerald-400">
                            +{entry.gameweekPoints}
                          </td>

                          <td className="py-3.5 px-3 text-center font-black text-base text-amber-400">
                            {entry.totalPoints}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW B: PLAYERS RANKINGS BY POSITION */}
          {standingsTab === 'positions_ranking' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-400" />
                    <span>مراكز وترتيب اللاعبين الأكثر حصداً للنقاط 🌟</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    استعرض أفضل اللاعبين في كل مركز (حراس، مدافعون، وسط، مهاجمون) حسب نقاط الفانتزي المحققة
                  </p>
                </div>

                {/* Position Filter Buttons */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                  {(['FWD', 'MID', 'DEF', 'GK'] as const).map(pos => (
                    <button
                      key={pos}
                      onClick={() => setPositionRankingFilter(pos)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        positionRankingFilter === pos
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {pos === 'FWD' ? 'الهجوم (FWD)' :
                       pos === 'MID' ? 'الوسط (MID)' :
                       pos === 'DEF' ? 'الدفاع (DEF)' : 'الحراس (GK)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table of top players in this position */}
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-black text-slate-400">
                      <th className="py-2.5 px-3">المركز</th>
                      <th className="py-2.5 px-3">اللاعب والفريق</th>
                      <th className="py-2.5 px-3 text-center">السعر</th>
                      <th className="py-2.5 px-3 text-center">مباريات</th>
                      <th className="py-2.5 px-3 text-center">أهداف</th>
                      <th className="py-2.5 px-3 text-center">صناعة</th>
                      <th className="py-2.5 px-3 text-center">شباك نظيفة</th>
                      <th className="py-2.5 px-3 text-center font-black text-amber-400">إجمالي النقاط</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {topPlayersByPosition.slice(0, 15).map((player, idx) => (
                      <tr key={player.id} className="hover:bg-slate-800/40 text-slate-300">
                        <td className="py-3 px-3">
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-black flex items-center justify-center">
                            #{idx + 1}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-bold">
                          <div className="flex items-center gap-2">
                            <span className="text-white">{player.name}</span>
                            {player.isChampion && (
                              <span className="px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">
                                👑 بطل السنة الماضية
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-emerald-400">{player.team} • #{player.number}</div>
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-amber-300">
                          {player.price}M
                        </td>

                        <td className="py-3 px-3 text-center">{player.matchesPlayed}</td>
                        <td className="py-3 px-3 text-center text-white font-bold">{player.goals}</td>
                        <td className="py-3 px-3 text-center text-white font-bold">{player.assists}</td>
                        <td className="py-3 px-3 text-center text-emerald-400 font-bold">{player.cleanSheets}</td>
                        <td className="py-3 px-3 text-center font-black text-base text-amber-400">{player.totalPoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW C: PARIS CHAMPIONS SQUAD (أبطال باريس) */}
          {standingsTab === 'champions' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <span>كتيبة أبطال باريس (حاملو اللقب والأعلى سعراً بالبطولة) 👑</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    نظراً لتتويجهم بلقب دوري جامعة النيل الموسم الماضي، يتمتع لاعبو باريس بأعلى أسعار في سوق الفانتزي
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/30">
                  {parisPlayers.length} لاعباً بطلاً
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {parisPlayers.map(p => (
                  <div key={p.id} className="bg-slate-950 border-2 border-amber-500/40 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center font-black text-sm shrink-0">
                        #{p.number}
                      </div>
                      <div>
                        <div className="text-xs font-black text-white truncate">{p.name}</div>
                        <div className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                          <span>{p.position}</span>
                          <span>•</span>
                          <span>👑 بطل الدوري</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-amber-400">{p.price}M</div>
                      <div className="text-[10px] text-slate-400">{p.totalPoints} نقطة</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: TRANSFER MARKET / PLAYER SELECTION VIEW */}
      {/* ============================================================== */}
      {activeTab === 'market' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={marketSearch}
                  onChange={(e) => setMarketSearch(e.target.value)}
                  placeholder="ابحث باسم اللاعب أو فريقه أو الرقم الجامعي..."
                  className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs md:text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
                {marketSearch && (
                  <button
                    onClick={() => setMarketSearch('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Position Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map(pos => (
                  <button
                    key={pos}
                    onClick={() => setMarketPositionFilter(pos)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      marketPositionFilter === pos
                        ? 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-600/30'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {pos === 'ALL' ? 'كل المراكز' :
                     pos === 'GK' ? 'حراس مرمى' :
                     pos === 'DEF' ? 'مدافعون' :
                     pos === 'MID' ? 'خط وسط' : 'مهاجمون'}
                  </button>
                ))}
              </div>

              {/* Team Filter Dropdown */}
              <select
                value={marketTeamFilter}
                onChange={(e) => setMarketTeamFilter(e.target.value)}
                className="px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">جميع الفرق (48 فريق)</option>
                <option value="باريس">👑 باريس (أبطال السنة الماضية)</option>
                {teams.filter(t => !isParisChampionTeam(t.name)).map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>

              {/* Sort By */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-slate-400 font-bold">ترتيب:</span>
                <select
                  value={marketSortBy}
                  onChange={(e) => setMarketSortBy(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 text-xs font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="points">أعلى النقاط</option>
                  <option value="price">أعلى السعر</option>
                  <option value="goals">أكثر الأهداف</option>
                  <option value="assists">أكثر الصناعات</option>
                </select>
              </div>
            </div>

            {/* If opening market for a specific slot replacement */}
            {replacingSlotIndex !== null && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                  <span>
                    أنت تقوم باختيار لاعب للخانة: <strong className="text-white">#{replacingSlotIndex + 1} ({FANTASY_SLOTS_LAYOUT[replacingSlotIndex].nameAr})</strong>
                  </span>
                </div>
                <button
                  onClick={() => setReplacingSlotIndex(null)}
                  className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
                >
                  إلغاء التحديد وتصفح الكل
                </button>
              </div>
            )}
          </div>

          {/* Players Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMarketPlayers.map(player => {
              const inSquad = isPlayerInSquad(player.id);

              return (
                <div
                  key={player.id}
                  className={`bg-slate-900 border rounded-3xl p-4 shadow-xl transition-all flex flex-col justify-between gap-3 ${
                    inSquad 
                      ? 'border-emerald-500/60 ring-2 ring-emerald-500/20 bg-gradient-to-b from-slate-900 to-emerald-950/20' 
                      : player.isChampion
                      ? 'border-amber-500/50 bg-gradient-to-b from-slate-900 to-amber-950/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top: Position & Price & Champion tag */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                        player.position === 'GK' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        player.position === 'DEF' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                        player.position === 'MID' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {player.position}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {player.isChampion && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center gap-0.5 shadow-sm">
                            <Crown className="w-3 h-3" />
                            <span>بطل 2025</span>
                          </span>
                        )}
                        <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          {player.price}M
                        </span>
                      </div>
                    </div>

                    {/* Player Info */}
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black text-white shrink-0 shadow-md border ${
                        player.isChampion 
                          ? 'bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 border-amber-300 text-slate-950' 
                          : 'bg-gradient-to-br from-slate-800 to-slate-950 border-slate-700'
                      }`}>
                        {player.number || '⚽'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-black text-white truncate" title={player.name}>
                          {player.name}
                        </h4>
                        <div className="text-xs text-emerald-400 font-bold truncate">
                          {player.team}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {player.studentId || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Player Stats Mini Grid */}
                  <div className="grid grid-cols-4 gap-1 text-center bg-slate-950/60 p-2 rounded-2xl border border-slate-800/80">
                    <div>
                      <div className="text-[9px] text-slate-400 font-bold">النقاط</div>
                      <div className="text-xs font-black text-amber-400">{player.totalPoints}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400 font-bold">أهداف</div>
                      <div className="text-xs font-black text-white">{player.goals}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400 font-bold">صناعة</div>
                      <div className="text-xs font-black text-white">{player.assists}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400 font-bold">مباريات</div>
                      <div className="text-xs font-black text-slate-300">{player.matchesPlayed}</div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div>
                    {inSquad ? (
                      <div className="w-full py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>موجود بتشكيلتك</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (replacingSlotIndex !== null) {
                            handleSelectPlayerForSlot(player, replacingSlotIndex);
                          } else {
                            const target = fantasyTeam.slots.find(s => {
                              if (!s.player.id.startsWith('empty_')) return false;
                              if (s.slotIndex === 7) return player.position === 'DEF' || player.position === 'MID';
                              if (s.slotIndex === 8) return player.position === 'FWD' || player.position === 'MID';
                              return s.position === player.position;
                            });

                            if (target) {
                              handleSelectPlayerForSlot(player, target.slotIndex);
                            } else {
                              const samePos = fantasyTeam.slots.find(s => s.position === player.position);
                              if (samePos) {
                                handleSelectPlayerForSlot(player, samePos.slotIndex);
                              } else {
                                showToast('لا توجد خانة مناسبة شاغرة لهذا المركز! اختر خانة محددة من التشكيلة.');
                              }
                            }
                          }
                        }}
                        className="w-full py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white border border-slate-700 hover:border-emerald-500 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة للتشكيلة (+{player.price}M)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredMarketPlayers.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl font-black">
                👥
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-white">لا يوجد لاعبون مسجلون يطابقون الفلتر المختار</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  تم تفريغ الأرقام والبيانات القديمة والإبقاء على الفرق فقط. بمجرد إضافة أو قيد أي لاعب في أي فريق، سيظهر في سوق الانتقالات والفانتازي فوراً!
                </p>
              </div>
              {onNavigateToRoster && (
                <button
                  type="button"
                  onClick={onNavigateToRoster}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition-all shadow-lg shadow-emerald-950/40 cursor-pointer inline-flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span>الانتقال لقوائم الفرق لإضافة لاعبين 👥➕</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: RULES & SCORING GUIDE */}
      {/* ============================================================== */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-emerald-400" />
                <span>دليل وقواعد دوري فانتزي جامعة النيل 📖</span>
              </h3>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                الميزانية المعتمدة هي <strong className="text-amber-400">50.0 مليون جنيه</strong>، ولاعبي فريق باريس هم أبطال السنة الماضية وتعتبر قيمتهم السوقية هي الأعلى. تُحسب النقاط تلقائياً وفورياً بعد نهاية كل مباراة:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-500/20 space-y-3">
                <h4 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>النقاط الإيجابية (+)</span>
                </h4>
                <ul className="text-xs text-slate-300 space-y-2 divide-y divide-slate-800">
                  <li className="pt-2 flex justify-between">
                    <span>مشاركة اللاعب في المباراة</span>
                    <strong className="text-emerald-400 font-black">+2 نقطة</strong>
                  </li>
                  <li className="pt-2 flex justify-between">
                    <span>تسجيل هدف بواسطة مهاجم (FWD)</span>
                    <strong className="text-emerald-400 font-black">+4 نقاط</strong>
                  </li>
                  <li className="pt-2 flex justify-between">
                    <span>تسجيل هدف بواسطة لاعب وسط (MID)</span>
                    <strong className="text-emerald-400 font-black">+5 نقاط</strong>
                  </li>
                  <li className="pt-2 flex justify-between">
                    <span>تسجيل هدف بواسطة مدافع (DEF) أو حارس (GK)</span>
                    <strong className="text-emerald-400 font-black">+6 نقاط</strong>
                  </li>
                  <li className="pt-2 flex justify-between">
                    <span>صناعة هدف (أسيست)</span>
                    <strong className="text-emerald-400 font-black">+3 نقاط</strong>
                  </li>
                  <li className="pt-2 flex justify-between">
                    <span>شباك نظيفة للحارس والمدافع</span>
                    <strong className="text-emerald-400 font-black">+4 نقاط</strong>
                  </li>
                  <li className="pt-2 flex justify-between">
                    <span>كابتن الفريق المختار (C)</span>
                    <strong className="text-amber-400 font-black">مضاعفة النقاط x2</strong>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-rose-500/20 space-y-3">
                <h4 className="text-sm font-black text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>الخصومات والحدود (-)</span>
                </h4>
                <ul className="text-xs text-slate-300 space-y-2 divide-y divide-slate-800">
                  <li className="pt-2 flex justify-between">
                    <span>الميزانية الإجمالية المسموحة</span>
                    <strong className="text-amber-400 font-black">50.0M كحد أقصى</strong>
                  </li>
                  <li className="pt-2 flex justify-between">
                    <span>الحصول على بطاقة صفراء 🟨</span>
                    <strong className="text-rose-400 font-black">-1 نقطة</strong>
                  </li>
                  <li className="pt-2 flex justify-between">
                    <span>الحصول على بطاقة حمراء 🟥</span>
                    <strong className="text-rose-400 font-black">-3 نقاط</strong>
                  </li>
                  <li className="pt-2 flex justify-between">
                    <span>الحد الأقصى للاعبين من نفس الفريق</span>
                    <strong className="text-white font-bold">لاعبان اثنان فقط</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Name Modal */}
      {isEditingTeamName && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white">تعديل اسم فريق الفانتزي</h3>
            <input
              type="text"
              value={teamNameInput}
              onChange={(e) => setTeamNameInput(e.target.value)}
              placeholder="مثال: كتيبة الفراعنة، أبطال النيل..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditingTeamName(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveTeamName}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black cursor-pointer shadow-lg"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Details Preview Modal */}
      {previewPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 relative">
            <button
              onClick={() => setPreviewPlayer(null)}
              className="absolute left-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
            <div className="text-center space-y-2">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg text-2xl font-black ${
                previewPlayer.isChampion 
                  ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 border-2 border-amber-300' 
                  : 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white'
              }`}>
                #{previewPlayer.number}
              </div>
              <h3 className="text-base font-black text-white flex items-center justify-center gap-1.5">
                <span>{previewPlayer.name}</span>
                {previewPlayer.isChampion && <Crown className="w-4 h-4 text-amber-400" />}
              </h3>
              <div className="text-xs font-bold text-emerald-400">
                {previewPlayer.team} • {previewPlayer.position}
                {previewPlayer.isChampion && ' (بطل السنة الماضية)'}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">ID: {previewPlayer.studentId}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">إجمالي النقاط:</span>
                <strong className="text-amber-400 font-black text-base">{previewPlayer.totalPoints}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">سعر اللاعب:</span>
                <strong className="text-emerald-400 font-black text-base">{previewPlayer.price}M</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">أهداف مسجلة:</span>
                <strong className="text-white font-black">{previewPlayer.goals}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">تمريرات حاسمة:</span>
                <strong className="text-white font-black">{previewPlayer.assists}</strong>
              </div>
            </div>

            <button
              onClick={() => setPreviewPlayer(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// PITCH PLAYER CARD COMPONENT
// =========================================================================
interface PitchPlayerCardProps {
  slot: SelectedFantasySlot;
  onSelect: () => void;
  onSetCaptain: () => void;
  onSetVice: () => void;
  onViewStats: (player: FantasyPlayer) => void;
  isBench?: boolean;
  isLocked?: boolean;
}

const PitchPlayerCard: React.FC<PitchPlayerCardProps> = ({
  slot,
  onSelect,
  onSetCaptain,
  onSetVice,
  onViewStats,
  isBench = false,
  isLocked = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const isEmpty = slot.player.id.startsWith('empty_');

  if (isEmpty) {
    return (
      <button
        onClick={onSelect}
        className={`flex flex-col items-center justify-center p-2 rounded-2xl border-2 border-dashed transition-all cursor-pointer group ${
          isLocked
            ? 'w-24 md:w-28 h-28 md:h-32 bg-slate-950/40 border-rose-500/30 opacity-70 cursor-not-allowed'
            : isBench 
            ? 'w-24 h-28 bg-slate-900/60 border-slate-700 hover:border-amber-400' 
            : 'w-24 md:w-28 h-28 md:h-32 bg-slate-950/60 border-white/30 hover:border-emerald-400 hover:bg-emerald-950/40'
        }`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 text-sm font-black transition-colors ${
          isLocked ? 'bg-rose-500/20 text-rose-300' : 'bg-white/10 group-hover:bg-emerald-500/20 text-white group-hover:text-emerald-300'
        }`}>
          {isLocked ? '🔒' : '+'}
        </div>
        <span className="text-[10px] font-bold text-white/90">
          {slot.position}
        </span>
        <span className="text-[9px] text-white/60">
          {isLocked ? 'المقعد مقفل' : 'إضافة لاعب'}
        </span>
      </button>
    );
  }

  return (
    <div className="relative group">
      <div
        onClick={() => setShowMenu(!showMenu)}
        className={`w-24 md:w-28 p-2 rounded-2xl flex flex-col items-center justify-between text-center cursor-pointer transition-all border shadow-lg ${
          isBench
            ? 'bg-slate-900/90 border-slate-700 hover:border-amber-400'
            : slot.player.isChampion
            ? 'bg-slate-950/95 border-amber-400/60 hover:border-amber-300 shadow-amber-500/10'
            : 'bg-slate-950/90 border-white/20 hover:border-emerald-400 backdrop-blur-sm'
        } ${isLocked ? 'ring-1 ring-rose-500/20' : ''}`}
      >
        {/* Top Badges */}
        <div className="w-full flex items-center justify-between mb-1">
          <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
            slot.position === 'GK' ? 'bg-amber-500/30 text-amber-300' :
            slot.position === 'DEF' ? 'bg-blue-500/30 text-blue-300' :
            slot.position === 'MID' ? 'bg-emerald-500/30 text-emerald-300' :
            'bg-rose-500/30 text-rose-300'
          }`}>
            {slot.position}
          </span>

          <div className="flex items-center gap-1">
            {isLocked && (
              <span className="text-[10px]" title="مغلق لبدء الجولة">🔒</span>
            )}
            {slot.isCaptain && (
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black flex items-center justify-center shadow">
                C
              </span>
            )}
            {slot.isViceCaptain && (
              <span className="w-4 h-4 rounded-full bg-slate-300 text-slate-950 text-[9px] font-black flex items-center justify-center shadow">
                V
              </span>
            )}
            <span className="text-[10px] font-black text-amber-300">
              {slot.player.price}M
            </span>
          </div>
        </div>

        {/* Player Jersey / Icon */}
        <div className="relative my-0.5">
          <div className={`w-9 h-9 md:w-10 md:h-10 rounded-2xl font-black text-sm flex items-center justify-center shadow-md border ${
            slot.player.isChampion
              ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 border-amber-300 shadow-amber-500/20'
              : 'bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-800 text-white border-white/20'
          }`}>
            {slot.player.number || '⚽'}
          </div>
          {slot.player.isChampion && (
            <span className="absolute -top-1 -left-1 text-[10px]">👑</span>
          )}
          {slot.isCaptain && (
            <span className="absolute -bottom-1 -right-1 text-[10px]">⭐</span>
          )}
        </div>

        {/* Player Name & Team */}
        <div className="w-full">
          <div className="text-[11px] font-black text-white truncate max-w-full" title={slot.player.name}>
            {slot.player.name.split(' ').slice(0, 2).join(' ')}
          </div>
          <div className="text-[9px] text-emerald-300 font-bold truncate max-w-full">
            {slot.player.team}
          </div>
        </div>

        {/* Points Badge */}
        <div className="w-full mt-1 pt-1 border-t border-white/10 flex items-center justify-between text-[10px]">
          <span className="text-slate-400">النقاط:</span>
          <span className="font-black text-amber-400">
            {(slot.player.totalPoints || 0) * (slot.isCaptain ? 2 : 1)}
          </span>
        </div>
      </div>

      {/* Quick Action Popup Menu */}
      {showMenu && (
        <div 
          className="absolute z-30 bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 text-xs animate-scaleUp"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[10px] font-bold text-slate-400 px-2 pb-1 border-b border-slate-800 truncate">
            {slot.player.name}
          </div>

          {isLocked ? (
            <div className="p-2 bg-rose-950/60 border border-rose-500/30 rounded-xl text-rose-300 text-[10px] text-center font-bold">
              🔒 الجولة بدأت! التشكيلة والكابتن مقفلان رسمياً حتى نهاية الجولة
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  onSetCaptain();
                  setShowMenu(false);
                }}
                className="w-full text-right px-2 py-1.5 rounded-xl hover:bg-slate-800 text-amber-300 font-bold flex items-center justify-between cursor-pointer"
              >
                <span>تعيين كابتن (C x2)</span>
                <span>⭐</span>
              </button>

              <button
                onClick={() => {
                  onSetVice();
                  setShowMenu(false);
                }}
                className="w-full text-right px-2 py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 font-bold flex items-center justify-between cursor-pointer"
              >
                <span>تعيين نائب كابتن (V)</span>
                <span>🛡️</span>
              </button>

              <button
                onClick={() => {
                  onSelect();
                  setShowMenu(false);
                }}
                className="w-full text-right px-2 py-1.5 rounded-xl hover:bg-slate-800 text-emerald-300 font-bold flex items-center justify-between cursor-pointer"
              >
                <span>استبدال اللاعب</span>
                <span>🔄</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              onViewStats(slot.player);
              setShowMenu(false);
            }}
            className="w-full text-right px-2 py-1.5 rounded-xl hover:bg-slate-800 text-sky-300 font-bold flex items-center justify-between cursor-pointer"
          >
            <span>عرض تفاصيل وإحصائيات</span>
            <span>📊</span>
          </button>

          <button
            onClick={() => setShowMenu(false)}
            className="w-full text-center py-1 mt-1 border-t border-slate-800 text-slate-400 hover:text-white text-[10px] cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}
    </div>
  );
};
