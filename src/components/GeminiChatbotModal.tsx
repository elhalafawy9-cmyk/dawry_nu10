import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Bot, 
  Sparkles, 
  Send, 
  X, 
  ImagePlus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  User, 
  Shield, 
  Users, 
  Trophy, 
  Zap, 
  ArrowRightLeft, 
  Check, 
  CornerDownLeft,
  ChevronDown,
  Maximize2,
  Minimize2,
  FileText
} from 'lucide-react';
import { Team } from '../App';
import { Player, saveStoredSquads, loadStoredSquads } from '../utils/roster';
import { resolveCanonicalTeamName, isSameTeam, getTeamBilingualInfo } from '../utils/teamAliases';

export interface ExtractedTeamItem {
  name: string;
  group?: string;
  captain?: string;
}

export interface ExtractedPlayerItem {
  teamName: string;
  name: string;
  number?: number;
  position?: 'GK' | 'DEF' | 'MID' | 'FWD' | string;
  studentId?: string;
}

export interface ExtractedPayload {
  action?: string;
  summary?: string;
  teams?: ExtractedTeamItem[];
  players?: ExtractedPlayerItem[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: string;
  image?: {
    data: string;
    mimeType: string;
    name?: string;
  };
  extractedPayload?: ExtractedPayload | null;
  isApplied?: boolean;
}

interface GeminiChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  onUpdateTeams: (newTeams: Team[]) => void;
  squads: Record<string, Player[]>;
  onUpdateSquads: (newSquads: Record<string, Player[]>) => void;
  currentSeasonName: string;
  currentAcademicYear: string;
  isAdmin: boolean;
}

export const GeminiChatbotModal: React.FC<GeminiChatbotModalProps> = ({
  isOpen,
  onClose,
  teams,
  onUpdateTeams,
  squads,
  onUpdateSquads,
  currentSeasonName,
  currentAcademicYear,
  isAdmin,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_msg',
      role: 'model',
      text: `أهلاً بك! أنا **المساعد الذكي لدوري جامعة النيل لكرة القدم** 🤖⚽

يمكنني مساعدتك في:
1. **قراءة وتحليل صور كشوفات اللاعبين وقوائم الفرق** وإضافتها مباشرة إلى البطولة تلقائياً.
2. الإجابة عن أي استفسار يخص إحصائيات البطولة، جدول المباريات، وترتيب المجموعات.
3. المساعدة في صياغة التشكيلات ولوائح المسابقة.

💡 **جرّب إرسال صورة كشف أو قائمة لاعبين الآن باستخدام زر الكاميرا أدناه 📷!**`,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string; name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Common file processor
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (JPEG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      setSelectedImage({
        data: base64Data,
        mimeType: file.type,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
    e.target.value = '';
  };

  // Handle Clipboard Paste (Ctrl+V / Cmd+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          processImageFile(file);
          break;
        }
      }
    }
  };

  // Handle Drag & Drop
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
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file);
    }
  };

  // Handle send message
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputMessage).trim();
    if (!textToSend && !selectedImage) return;

    const userMessageId = `usr_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      image: selectedImage || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    const currentImg = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // Build history for backend
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text,
        image: m.image ? { data: m.image.data, mimeType: m.image.mimeType } : undefined,
      }));

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: historyPayload,
          message: textToSend,
          image: currentImg ? { data: currentImg.data, mimeType: currentImg.mimeType } : undefined,
          context: {
            currentSeason: currentSeasonName,
            academicYear: currentAcademicYear,
            teamsCount: teams.length,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'حدث خطأ في استجابة المساعد الذكي');
      }

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'model',
        text: data.reply || 'تم استلام طلبك ومعالجته بنجاح.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        extractedPayload: data.extractedPayload || null,
        isApplied: false,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'model',
        text: `عذراً، حدث خطأ أثناء المعالجة: ${err?.message || 'تعذر الاتصال بخدمة الذكاء الاصطناعي'}. يرجى المحاولة مرة أخرى.`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply extracted teams and players into state & storage
  const handleApplyExtractedData = (messageId: string, payload: ExtractedPayload) => {
    let teamsAddedCount = 0;
    let playersAddedCount = 0;

    const newTeamsList = [...teams];
    const newSquadsRecord = { ...squads };

    // 1. Process teams (Enforce bilingual canonical mapping - never create English duplicates)
    if (payload.teams && Array.isArray(payload.teams)) {
      payload.teams.forEach((t) => {
        if (!t.name) return;
        const cleanName = t.name.trim();
        const canonical = resolveCanonicalTeamName(cleanName);
        const existing = newTeamsList.find((et) => isSameTeam(et.name, canonical));
        if (!existing) {
          const bilingual = getTeamBilingualInfo(canonical);
          const groupLetter = (t.group && ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].includes(t.group.toUpperCase()))
            ? t.group.toUpperCase()
            : (bilingual?.group || 'A');

          const newTeam: Team = {
            id: `t_ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: canonical,
            group: groupLetter,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            points: 0,
            logoColor: 'from-emerald-600 to-teal-800',
          };
          newTeamsList.push(newTeam);
          teamsAddedCount++;
        }
      });
    }

    // 2. Process players (Always attach to the single canonical Arabic team)
    if (payload.players && Array.isArray(payload.players)) {
      payload.players.forEach((p, idx) => {
        if (!p.name) return;
        const cleanPlayerName = p.name.trim();
        const rawTarget = p.teamName?.trim() || (payload.teams?.[0]?.name?.trim() || 'فريق جديد');
        const teamTarget = resolveCanonicalTeamName(rawTarget);

        // Ensure canonical team squad list exists
        if (!newSquadsRecord[teamTarget]) {
          newSquadsRecord[teamTarget] = [];
        }

        // Avoid adding duplicate player by studentId or normalized name
        const alreadyExists = newSquadsRecord[teamTarget].some(
          (ep) =>
            ep.name.trim().toLowerCase() === cleanPlayerName.toLowerCase() ||
            (p.studentId && ep.studentId && ep.studentId.trim() === p.studentId.trim())
        );

        if (!alreadyExists) {
          // Normalize position
          let normPos: 'GK' | 'DEF' | 'MID' | 'FWD' = 'MID';
          const rawPos = (p.position || '').toUpperCase();
          if (rawPos.includes('GK') || rawPos.includes('حارس')) normPos = 'GK';
          else if (rawPos.includes('DEF') || rawPos.includes('دفاع') || rawPos.includes('مدافع')) normPos = 'DEF';
          else if (rawPos.includes('FWD') || rawPos.includes('هجوم') || rawPos.includes('مهاجم')) normPos = 'FWD';

          const newPlayer: Player = {
            id: `p_ai_${Date.now()}_${idx}`,
            name: cleanPlayerName,
            number: Number(p.number) || (newSquadsRecord[teamTarget].length + 1),
            position: normPos,
            studentId: p.studentId || `2026${String(Math.floor(1000 + Math.random() * 9000))}`,
            isIdentityLocked: false,
          };

          newSquadsRecord[teamTarget].push(newPlayer);
          playersAddedCount++;
        }
      });
    }

    // 3. Update state & persist
    if (teamsAddedCount > 0) {
      onUpdateTeams(newTeamsList);
      try {
        localStorage.setItem('dawry_teams_custom_v2', JSON.stringify(newTeamsList));
        localStorage.setItem('dawry_teams_custom_v1', JSON.stringify(newTeamsList));
      } catch (e) {
        console.warn('Could not save teams locally:', e);
      }
    }

    if (playersAddedCount > 0 || teamsAddedCount > 0) {
      onUpdateSquads(newSquadsRecord);
      saveStoredSquads(newSquadsRecord);
    }

    // Mark message as applied
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isApplied: true } : m))
    );

    // Confetti celebration
    confetti({
      particleCount: 80,
      spread: 90,
      origin: { y: 0.6 },
    });

    // Add a confirmation bot message
    const successBotMsg: ChatMessage = {
      id: `sys_${Date.now()}`,
      role: 'system',
      text: `✅ **تمت الإضافة بنجاح!**
تم تسجيل **${playersAddedCount} لاعب** و **${teamsAddedCount} فريق** في كشوفات البطولة الرسمية وتحديث قاعدة البيانات.`,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, successBotMsg]);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" 
      dir="rtl"
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={`relative w-full bg-slate-900 border ${
          isDragging ? 'border-emerald-400 ring-4 ring-emerald-500/30' : 'border-emerald-500/30'
        } rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isExpanded ? 'max-w-5xl h-[94vh]' : 'max-w-2xl h-[86vh]'
        }`}
      >
        {/* Drag Overlay Hint */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 border-2 border-dashed border-emerald-400 rounded-3xl animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 animate-bounce">
              <ImagePlus className="w-8 h-8" />
            </div>
            <strong className="text-lg font-black text-white">أفلت صورة كشف اللاعبين أو الفرق هنا 📷</strong>
            <p className="text-xs text-emerald-300">سيقوم المساعد الذكي بقراءتها واستخراج اللاعبين مباشرة</p>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-b border-emerald-500/20 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                <Bot className="w-6 h-6" />
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  المساعد الذكي للبطولة (AI Copilot)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Gemini
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                أرسل صورة كشف اللاعبين أو الفرق وسيقوم المساعد بقراءتها وإضافتها بنفسه للبطولة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer hidden sm:block"
              title={isExpanded ? 'تصغير الحجم' : 'تكبير الحجم'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Messages Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-950/40">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSystem = msg.role === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="max-w-md bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-3 text-xs text-emerald-200 text-center shadow-md">
                    {msg.text}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                    isUser
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-br from-teal-600 to-emerald-800 text-emerald-100 border border-emerald-500/40'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Body */}
                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-3xl p-4 shadow-md space-y-2.5 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-none'
                      : 'bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-tl-none'
                  }`}
                >
                  {/* Attached Image if any */}
                  {msg.image && (
                    <div className="rounded-2xl overflow-hidden border border-white/20 max-w-xs shadow-sm bg-black/20">
                      <img
                        src={msg.image.data}
                        alt="Uploaded preview"
                        className="w-full max-h-56 object-cover"
                      />
                      {msg.image.name && (
                        <div className="p-1.5 text-[11px] text-white/80 truncate bg-black/40">
                          📷 {msg.image.name}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Text Content */}
                  <div className="whitespace-pre-wrap break-words font-medium">
                    {/* Render text with basic markdown formatting */}
                    {msg.text.split('\n').map((line, idx) => {
                      if (line.startsWith('### ')) {
                        return <h4 key={idx} className="font-bold text-amber-300 text-sm mt-2 mb-1">{line.replace('### ', '')}</h4>;
                      }
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return <p key={idx} className="font-bold text-white my-1">{line.replace(/\*\*/g, '')}</p>;
                      }
                      return <p key={idx} className="my-0.5">{line}</p>;
                    })}
                  </div>

                  {/* Interactive Extracted Data Card (If image extraction detected teams/players) */}
                  {msg.extractedPayload && !msg.isApplied && (
                    <div className="mt-3 bg-slate-900/95 border border-emerald-500/50 rounded-2xl p-3.5 space-y-3 shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>بيانات مستخرجة جاهزة للإضافة المباشرة للبطولة</span>
                        </div>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          {msg.extractedPayload.players?.length || 0} لاعب • {msg.extractedPayload.teams?.length || 0} فرق
                        </span>
                      </div>

                      {/* Extracted Teams Preview */}
                      {msg.extractedPayload.teams && msg.extractedPayload.teams.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-400 font-semibold block">الفرق المكتشفة:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.extractedPayload.teams.map((t, tidx) => (
                              <span
                                key={tidx}
                                className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-xs font-bold flex items-center gap-1"
                              >
                                <Shield className="w-3 h-3 text-emerald-400" />
                                {t.name}
                                {t.group && <span className="text-[10px] text-amber-300 font-mono">(المجموعة {t.group})</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Extracted Players Preview */}
                      {msg.extractedPayload.players && msg.extractedPayload.players.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-400 font-semibold block">عينة من اللاعبين المستخرجين:</span>
                          <div className="max-h-36 overflow-y-auto space-y-1 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
                            {msg.extractedPayload.players.map((p, pidx) => (
                              <div
                                key={pidx}
                                className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-slate-900 border-b border-slate-900 last:border-none"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] flex items-center justify-center font-bold">
                                    {p.number || pidx + 1}
                                  </span>
                                  <span className="font-bold text-white">{p.name}</span>
                                  <span className="text-[10px] text-slate-400">({p.teamName || 'الفريق'})</span>
                                </div>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                                  {p.position || 'MID'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 1-Click Action Button to Apply directly */}
                      <button
                        type="button"
                        onClick={() => handleApplyExtractedData(msg.id, msg.extractedPayload!)}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <Zap className="w-4 h-4 text-amber-300" />
                        <span>⚡ إضافة واعتماد الفرق واللاعبين في البطولة فوراً</span>
                      </button>
                    </div>
                  )}

                  {/* If already applied */}
                  {msg.isApplied && (
                    <div className="mt-2 p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs font-bold">
                      <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                      <span>تمت إضافة هذه البيانات واعتمادها في البطولة بنجاح ✓</span>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div
                    className={`text-[10px] font-mono mt-1 ${
                      isUser ? 'text-emerald-100/70 text-left' : 'text-slate-400 text-left'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing / Thinking Indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 flex items-center justify-center">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-3xl rounded-tl-none p-3.5 flex items-center gap-2.5 text-xs text-slate-300">
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>المساعد الذكي يحلل البيانات ويستخرج القوائم...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Starters Prompts */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/60 overflow-x-auto flex items-center gap-2 text-xs">
          <span className="text-[11px] text-slate-400 shrink-0 font-bold">اقتراحات سريعة:</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/30 shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            <span>📷 رفع صورة كشف لاعبين لتحليلها</span>
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage('ما هي إحصائيات وأفضل هدافي البطولة حتى الآن؟')}
            className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 shrink-0 transition-colors cursor-pointer"
          >
            ⚽ ملخص الهدافين والإحصائيات
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage('كيف يعمل نظام التأهل لدور الـ 32 من المجموعات؟')}
            className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 shrink-0 transition-colors cursor-pointer"
          >
            🏆 لوائح الصعود والتأهل
          </button>
        </div>

        {/* Selected Image Thumbnail preview in input */}
        {selectedImage && (
          <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-emerald-500/40 relative">
                <img
                  src={selectedImage.data}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-xs">
                <strong className="text-white block font-bold truncate max-w-xs">
                  {selectedImage.name || 'صورة محددة للتحليل'}
                </strong>
                <span className="text-emerald-400 text-[11px]">
                  جاهزة للإرسال مع السؤال أو طلب الإضافة
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 transition-colors cursor-pointer"
              title="إلغاء الصورة"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex items-end gap-2 bg-slate-900 border border-slate-800 focus-within:border-emerald-500/60 rounded-2xl p-2 transition-colors">
            {/* Image Upload Trigger */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                selectedImage
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
              }`}
              title="إرفاق صورة كشف اللاعبين أو الفرق"
            >
              <ImagePlus className="w-5 h-5" />
            </button>

            {/* Textarea Input */}
            <textarea
              ref={inputRef}
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                selectedImage
                  ? 'اكتب تعليمات للمساعد (أو اضغط إرسال لتحليل الصورة واستخراج اللاعبين)...'
                  : 'اسأل المساعد الذكي أو أرسل صورة كشف لاعبين لإضافتهم...'
              }
              className="flex-1 bg-transparent border-none text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none resize-none max-h-32 py-2 px-1"
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0 shadow-md shadow-emerald-600/30"
              title="إرسال"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5 rotate-180" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
