import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Send, 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Shield, 
  AlertTriangle, 
  Users, 
  Sparkles, 
  CheckCircle2,
  Shirt,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Match, Team } from '../App';
import { Player } from '../utils/roster';
import { MatchScheduleNotification } from '../utils/notifications';

interface MatchAlertComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  teams: Team[];
  squads: Record<string, Player[]>;
  adminName: string;
  onSendAlert: (alertData: Omit<MatchScheduleNotification, 'id' | 'sentAt' | 'readByUserIds' | 'acknowledgedPlayers'>) => void;
}

export const MatchAlertComposerModal: React.FC<MatchAlertComposerModalProps> = ({
  isOpen,
  onClose,
  match,
  teams,
  squads,
  adminName,
  onSendAlert,
}) => {
  const squadA = match ? (squads[match.teamA] || []) : [];
  const squadB = match ? (squads[match.teamB] || []) : [];
  const teamAObj = match ? teams.find(t => t.name === match.teamA) : undefined;
  const teamBObj = match ? teams.find(t => t.name === match.teamB) : undefined;

  const [targetType, setTargetType] = useState<'both' | 'teamA' | 'teamB'>('both');
  const [urgency, setUrgency] = useState<'high' | 'normal'>('high');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  // Default prefilled template when match opens
  useEffect(() => {
    if (match) {
      const isNew = !match.isScheduled;
      const titleDefault = isNew
        ? `📢 اعتماد موعد وملعب جديد لمباراة: ${match.teamA} ضد ${match.teamB}`
        : `📢 تحديث رسمي لموعد وملعب مباراة: ${match.teamA} ضد ${match.teamB}`;
      
      const dateText = match.date || 'سيتم تأكيد التاريخ';
      const timeText = match.time || '04:00 م';
      const pitchText = match.pitch || 'الملعب الرئيسي (A)';

      const messageDefault = `تعلن إدارة بطولة دوري جامعة النيل لكرة القدم 2026 عن اعتماد موعد وملعب المباراة رسمياً:\n\n` +
        `• التاريخ المعتمد: ${dateText}\n` +
        `• توقيت الانطلاق: ${timeText}\n` +
        `• الملعب المحدد: ${pitchText}\n\n` +
        `تعليمات هامة للاعبي الفريقين:\n` +
        `1. الحضور والتواجد بأرضية الملعب قبل موعد المباراة بـ 30 دقيقة على الأقل للإحماء.\n` +
        `2. إحضار بطاقة الرقم القومي أو كارنيه جامعة النيل للتحقق الرسمي من القيد.\n` +
        `3. الالتزام بالزي الرياضي الموحد وتعليمات طاقم التحكيم واللجنة المنظمة.\n` +
        `يرجى من جميع اللاعبين الدخول وتأكيد الجاهزية عبر بواباتهم. بالتوفيق للفريقين! ⚽`;

      setTitle(titleDefault);
      setMessage(messageDefault);
      setTargetType('both');
      setUrgency('high');
    }
  }, [match]);

  const handleTemplateSelect = (templateKey: 'schedule' | 'reschedule' | 'reminder') => {
    if (!match) return;
    const dateText = match.date || 'سيتم تأكيد التاريخ';
    const timeText = match.time || '04:00 م';
    const pitchText = match.pitch || 'الملعب الرئيسي (A)';

    if (templateKey === 'schedule') {
      setTitle(`📢 اعتماد رسمي: موعد وملعب مباراة ${match.teamA} ضد ${match.teamB}`);
      setMessage(
        `تعلن اللجنة المنظمة عن تثبيت موعد المباراة رسمياً:\n` +
        `• التاريخ: ${dateText} • الساعة: ${timeText} • الملعب: ${pitchText}.\n` +
        `يرجى التواجد قبل المباراة بنصف ساعة بالزي الرسمي وكارنيه الجامعة.`
      );
      setUrgency('high');
    } else if (templateKey === 'reschedule') {
      setTitle(`⚠️ تنبيه عاجل: تعديل موعد وملعب مباراة ${match.teamA} ضد ${match.teamB}`);
      setMessage(
        `إشعار رسمي من إدارة البطولة:\n` +
        `نظراً لظروف تنظيمية، تم تعديل موعد وملعب المباراة ليصبح رسمياً:\n` +
        `• الموعد الجديد: ${dateText} الساعة ${timeText}\n` +
        `• الملعب الجديد: ${pitchText}\n` +
        `يرجى إخطار كافة اللاعبين بالموعد المعدل وتأكيد الجاهزية.`
      );
      setUrgency('high');
    } else {
      setTitle(`🔔 تذكير هام بموعد انطلاق مباراة ${match.teamA} ضد ${match.teamB}`);
      setMessage(
        `تذكير للاعبي وإداريي الفريقين بمباراتكم القادمة:\n` +
        `• تقام يوم: ${dateText} الساعة ${timeText} على ${pitchText}.\n` +
        `نرجو الحضور المبكر والالتزام بالروح الرياضية والتعليمات المعتمدة.`
      );
      setUrgency('normal');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!match) return;
    if (!title.trim() || !message.trim()) {
      alert('يرجى ملء عنوان التنبيه ونص الرسالة!');
      return;
    }

    const targetTeams = targetType === 'both' 
      ? [match.teamA, match.teamB] 
      : targetType === 'teamA' 
      ? [match.teamA] 
      : [match.teamB];

    onSendAlert({
      matchId: match.id,
      teamA: match.teamA,
      teamB: match.teamB,
      targetTeams,
      stageName: match.stageName,
      round: match.round,
      group: match.group,
      date: match.date || 'غير محدد',
      time: match.time || '04:00 م',
      pitch: match.pitch || 'الملعب الرئيسي (A)',
      title: title.trim(),
      message: message.trim(),
      urgency,
      sentBy: adminName || 'إدارة البطولة',
    });

    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    onClose();
  };

  const recipientCount = targetType === 'both' 
    ? squadA.length + squadB.length 
    : targetType === 'teamA' 
    ? squadA.length 
    : squadB.length;

  if (!isOpen || !match) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-5 md:p-6 shadow-2xl space-y-5 my-auto max-h-[94vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base md:text-lg font-black text-white">
                  إرسال تنبيه رسمي للاعبي الفريقين عبر واجهة المستخدم
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  صلاحية الأدمن 👑
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تنبيه فوري يظهر في لوحة اللاعبين وبوابتهم الرسمية مع إمكانية تأكيد الجاهزية والاطلاع.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Match Snapshot Banner */}
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-900 pb-1.5">
              <span className="font-bold text-amber-300">{match.stageName} {match.group ? `• المجموعة ${match.group}` : ''}</span>
              <span className="font-mono text-[11px] text-slate-400">Match ID: {match.id}</span>
            </div>

            <div className="flex items-center justify-between gap-3 py-1">
              {/* Team A */}
              <div className="flex-1 flex items-center gap-2">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${teamAObj?.logoColor || 'from-blue-600 to-indigo-600'} flex items-center justify-center font-black text-xs text-white shrink-0`}>
                  {match.teamA.charAt(0)}
                </div>
                <div>
                  <strong className="text-white text-sm font-black block">{match.teamA}</strong>
                  <span className="text-[10px] text-blue-400 font-bold">{squadA.length} لاعب مسجل</span>
                </div>
              </div>

              <div className="px-3 py-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono font-bold text-amber-400">
                VS
              </div>

              {/* Team B */}
              <div className="flex-1 flex items-center justify-end gap-2 text-left">
                <div className="text-right">
                  <strong className="text-white text-sm font-black block">{match.teamB}</strong>
                  <span className="text-[10px] text-emerald-400 font-bold">{squadB.length} لاعب مسجل</span>
                </div>
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${teamBObj?.logoColor || 'from-emerald-600 to-teal-600'} flex items-center justify-center font-black text-xs text-white shrink-0`}>
                  {match.teamB.charAt(0)}
                </div>
              </div>
            </div>

            {/* Approved Date & Pitch Pill */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-900 text-xs">
              <div className="flex items-center gap-2 font-mono">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <Calendar className="w-3.5 h-3.5" />
                  {match.date || 'لم يُحدد'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  {match.time || '04:00 م'}
                </span>
              </div>
              <span className="flex items-center gap-1 text-amber-300 font-sans font-bold">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                {match.pitch || 'الملعب الرئيسي (A)'}
              </span>
            </div>
          </div>

          {/* Quick Template Buttons */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>قوالب جاهزة سريعة للصياغة:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTemplateSelect('schedule')}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-xs font-bold text-slate-200 transition-all text-right flex items-center gap-2 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>📅 اعتماد موعد وملعب جديد</span>
              </button>
              <button
                type="button"
                onClick={() => handleTemplateSelect('reschedule')}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-xs font-bold text-slate-200 transition-all text-right flex items-center gap-2 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>⚠️ تعديل موعد أو ملعب</span>
              </button>
              <button
                type="button"
                onClick={() => handleTemplateSelect('reminder')}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-xs font-bold text-slate-200 transition-all text-right flex items-center gap-2 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span>🔔 تذكير وتعليمات الحضور</span>
              </button>
            </div>
          </div>

          {/* Target Recipients Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                الفريق المستهدف بالإشعار:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTargetType('both')}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    targetType === 'both'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  الفريقين معاً 👥
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('teamA')}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    targetType === 'teamA'
                      ? 'bg-blue-600 text-white font-black shadow-md'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  {match.teamA} فقط
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('teamB')}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    targetType === 'teamB'
                      ? 'bg-emerald-600 text-white font-black shadow-md'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  {match.teamB} فقط
                </button>
              </div>
            </div>

            {/* Urgency Level */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                درجة الأهمية والظهور:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setUrgency('high')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    urgency === 'high'
                      ? 'bg-rose-600 text-white font-black shadow-md'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>عاجل وهام 🚨</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('normal')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    urgency === 'normal'
                      ? 'bg-teal-600 text-white font-black shadow-md'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>إشعار رسمي عادي 📢</span>
                </button>
              </div>
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              عنوان التنبيه الرئيسي *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: اعتماد رسمي لموعد وملعب مباراة..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
            />
          </div>

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-300">
                نص التنبيه والتعليمات الموجهة للاعبين *
              </label>
              <span className="text-[10px] text-slate-500">
                سيظهر في بطاقة التنبيهات مع تفاصيل الملعب والميعاد
              </span>
            </div>
            <textarea
              rows={6}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
            />
          </div>

          {/* Notification Recipient Summary */}
          <div className="p-3 bg-blue-950/30 border border-blue-500/30 rounded-xl text-xs text-blue-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                سيتم إرسال هذا التنبيه لـ <strong className="text-white font-black">{recipientCount} لاعباً وإدارياً</strong> في {targetType === 'both' ? `(${match.teamA} و ${match.teamB})` : targetType === 'teamA' ? match.teamA : match.teamB}.
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              بواسطة: {adminName}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 cursor-pointer flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>إرسال التنبيه للاعبين فوراً 📢</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
