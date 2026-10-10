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
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Match, Team } from '../App';
import { Player, MatchSubstitution, MatchCardEvent, CardType, MAX_SUBS_PER_TEAM } from '../utils/roster';

interface TeamManagerPortalPageProps {
  teams: Team[];
  matches: Match[];
  squads: Record<string, Player[]>;
  onUpdateSquads: (updatedSquads: Record<string, Player[]>) => void;
  onUpdateMatchLineups?: (matchId: string, teamName: string, starters: string[], bench: string[], substitutions: MatchSubstitution[], cards?: MatchCardEvent[]) => void;
  isAdmin?: boolean;
}

export const TeamManagerPortalPage: React.FC<TeamManagerPortalPageProps> = ({
  teams,
  matches,
  squads,
  onUpdateSquads,
  onUpdateMatchLineups,
  isAdmin = true,
}) => {
  // Currently selected team that the manager is managing
  const [managedTeamName, setManagedTeamName] = useState<string>(teams[0]?.name || 'برشلونة');

  // Sub-tabs: 'squad_builder' (قائمة الفريق وإضافة اللاعبين) | 'match_lineup' (تشكيل الماتش مين لعب ومين ملعبش) | 'bulk_paste' (إضافة جماعية سريعة)
  const [subTab, setSubTab] = useState<'squad_builder' | 'match_lineup' | 'bulk_paste'>('squad_builder');

  // Modal / Inline Add Player State
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [playerForm, setPlayerForm] = useState<{
    name: string;
    number: number;
    position: 'GK' | 'DEF' | 'MID' | 'FWD';
    isCaptain: boolean;
  }>({
    name: '',
    number: 10,
    position: 'MID',
    isCaptain: false,
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

  // Player Save
  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerForm.name.trim()) return;

    if (editingPlayer) {
      const updated = currentSquad.map(p => {
        if (p.id === editingPlayer.id) {
          return {
            ...p,
            name: playerForm.name.trim(),
            number: Number(playerForm.number),
            position: playerForm.position,
            isCaptain: playerForm.isCaptain,
          };
        }
        return p;
      });
      onUpdateSquads({ ...squads, [managedTeamName]: updated });
    } else {
      const newP: Player = {
        id: `p_${Date.now()}`,
        name: playerForm.name.trim(),
        number: Number(playerForm.number),
        position: playerForm.position,
        isCaptain: playerForm.isCaptain,
      };
      onUpdateSquads({ ...squads, [managedTeamName]: [...currentSquad, newP] });
    }

    setIsAddingPlayer(false);
    setEditingPlayer(null);
    setPlayerForm({ name: '', number: 10, position: 'MID', isCaptain: false });
    confetti({ particleCount: 40, spread: 50 });
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
      // Possible formats: "10 - محمد صلاح" or "محمد صلاح (10)" or just "محمد صلاح"
      let name = line;
      let num = currentSquad.length + idx + 1;
      let pos: 'GK' | 'DEF' | 'MID' | 'FWD' = 'MID';

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
        });
      }
    });

    if (newPlayers.length === 0) {
      alert('جميع الأسماء المكتوبة موجودة بالفعل في قائمة الفريق!');
      return;
    }

    onUpdateSquads({
      ...squads,
      [managedTeamName]: [...currentSquad, ...newPlayers],
    });
    setBulkText('');
    confetti({ particleCount: 70, spread: 80 });
    alert(`تمت إضافة ${newPlayers.length} لاعبين إلى فريق ${managedTeamName} بنجاح! 🎉`);
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
          <label className="text-xs font-black text-slate-300 flex items-center gap-1.5 shrink-0">
            <Shield className="w-4 h-4 text-emerald-400" />
            اختر الفريق الذي تديره:
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

          {/* Active Team Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr ${managedTeam.logoColor}`} />
            <span className="text-slate-400">المجموعة:</span>
            <strong className="text-emerald-400 font-mono">{managedTeam.group}</strong>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">اللاعبين المسجلين:</span>
            <strong className="text-white font-mono">{currentSquad.length}</strong>
          </div>
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
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
        </div>
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
                setPlayerForm({ name: '', number: currentSquad.length + 1, position: 'MID', isCaptain: false });
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
                <strong className="text-sm font-black text-emerald-300">
                  {editingPlayer ? `تعديل بيانات اللاعب: ${editingPlayer.name}` : `إضافة لاعب جديد إلى ${managedTeamName}`}
                </strong>
                <button
                  onClick={() => setIsAddingPlayer(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePlayer} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs text-slate-400 font-bold">اسم اللاعب بالكامل:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أحمد مصطفى"
                    value={playerForm.name}
                    onChange={(e) => setPlayerForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
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

                <div className="md:col-span-4 flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-300">
                    <input
                      type="checkbox"
                      checked={playerForm.isCaptain}
                      onChange={(e) => setPlayerForm(prev => ({ ...prev, isCaptain: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span>تعيين هذا اللاعب كقائد للفريق (الكابتن 👑)</span>
                  </label>

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
                      className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                      حفظ اللاعب
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Players Table / Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentSquad.map((player, idx) => (
              <div
                key={player.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-mono font-black text-emerald-400 text-base shadow-inner">
                    {player.number}
                  </div>
                  <div>
                    <strong className="text-sm font-bold text-white block group-hover:text-emerald-300 transition-colors">
                      {player.name}
                    </strong>
                    <div className="flex items-center gap-1.5 mt-0.5">
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
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingPlayer(player);
                      setPlayerForm({
                        name: player.name,
                        number: player.number,
                        position: player.position,
                        isCaptain: !!player.isCaptain,
                      });
                      setIsAddingPlayer(true);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                    title="تعديل اللاعب"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeletePlayer(player.id)}
                    className="p-2 rounded-xl text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition-all cursor-pointer"
                    title="حذف اللاعب"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {currentSquad.length === 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">لم يتم تسجيل أي لاعبين في هذا الفريق حتى الآن</p>
              <button
                onClick={() => {
                  setEditingPlayer(null);
                  setPlayerForm({ name: '', number: 1, position: 'GK', isCaptain: true });
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

    </div>
  );
};
