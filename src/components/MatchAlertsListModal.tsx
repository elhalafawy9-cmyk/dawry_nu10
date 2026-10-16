import React, { useState } from 'react';
import { 
  Bell, 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Trash2, 
  CheckCheck, 
  Shirt,
  Shield,
  Filter,
  Eye,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppUser } from '../utils/auth';
import { MatchScheduleNotification } from '../utils/notifications';

interface MatchAlertsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: MatchScheduleNotification[];
  currentUser: AppUser | null;
  isAdmin: boolean;
  onAcknowledgeAlert?: (alertId: string) => void;
  onMarkAsRead?: (alertId: string) => void;
  onMarkAllAsRead?: () => void;
  onDeleteAlert?: (alertId: string) => void;
  onComposeNewAlert?: () => void;
}

export const MatchAlertsListModal: React.FC<MatchAlertsListModalProps> = ({
  isOpen,
  onClose,
  alerts,
  currentUser,
  isAdmin,
  onAcknowledgeAlert,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteAlert,
  onComposeNewAlert,
}) => {
  const [activeTab, setActiveTab] = useState<'my_team' | 'all' | 'unread'>('my_team');

  // Filter alerts
  const userTeam = currentUser?.playerTeamName || currentUser?.managedTeamName || '';

  const filteredAlerts = alerts.filter(alert => {
    const isTarget = !userTeam || alert.targetTeams.includes(userTeam) || isAdmin;
    const isUnread = currentUser ? !alert.readByUserIds.includes(currentUser.id) : false;

    if (activeTab === 'my_team') {
      return isAdmin ? true : alert.targetTeams.includes(userTeam);
    }
    if (activeTab === 'unread') {
      return isUnread && (isAdmin || alert.targetTeams.includes(userTeam));
    }
    return true; // 'all'
  });

  const unreadCount = alerts.filter(a => {
    const isTarget = !userTeam || a.targetTeams.includes(userTeam) || isAdmin;
    return isTarget && currentUser && !a.readByUserIds.includes(currentUser.id);
  }).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-5 md:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white shadow-lg shadow-blue-600/20 shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base md:text-lg font-black text-white">
                  مركز تنبيهات المواعيد والملاعب المعتمدة 🔔
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px] animate-pulse">
                    {unreadCount} جديد
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                إخطارات وتنبيهات مباشرة للاعبي الفرق عند اعتماد أو تعديل توقيت وملعب مبارياتهم.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && onComposeNewAlert && (
              <button
                onClick={() => {
                  onClose();
                  onComposeNewAlert();
                }}
                className="hidden sm:flex px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <span>+ إرسال تنبيه</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('my_team')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'my_team'
                  ? 'bg-blue-600 text-white shadow font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAdmin ? 'تنبيهات المباريات' : `تنبيهات فريقي (${userTeam || 'الفريق'})`}
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'unread'
                  ? 'bg-rose-600 text-white shadow font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>غير المقروءة</span>
              {unreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-rose-600 font-mono text-[10px] flex items-center justify-center font-black">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white shadow font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              كل التنبيهات ({alerts.length})
            </button>
          </div>

          {onMarkAllAsRead && unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-700"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>تحديد الكل كمقروء</span>
            </button>
          )}
        </div>

        {/* Alerts List Body */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {filteredAlerts.length === 0 ? (
            <div className="p-10 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
              <Bell className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">لا توجد تنبيهات جديدة في هذا القسم</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                عندما يقوم مسؤولو البطولة باعتماد أو تعديل موعد أو ملعب أي مباراة، ستظهر الإخطارات والتنبيهات هنا فوراً.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const isUnread = currentUser ? !alert.readByUserIds.includes(currentUser.id) : false;
              const hasAcknowledged = currentUser && (alert.acknowledgedPlayers || []).some(p => p.userId === currentUser.id);
              const isPlayerInTargetTeam = currentUser?.role === 'player' && alert.targetTeams.includes(currentUser.playerTeamName || '');

              return (
                <div
                  key={alert.id}
                  className={`p-4 md:p-5 rounded-2xl border transition-all space-y-3 ${
                    isUnread
                      ? 'bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border-blue-500/50 shadow-lg ring-1 ring-blue-500/20'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                  onClick={() => {
                    if (isUnread && onMarkAsRead) {
                      onMarkAsRead(alert.id);
                    }
                  }}
                >
                  {/* Alert Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${
                        alert.urgency === 'high'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                      }`}>
                        {alert.urgency === 'high' ? <AlertTriangle className="w-3 h-3 text-rose-400" /> : <Bell className="w-3 h-3 text-teal-400" />}
                        <span>{alert.urgency === 'high' ? 'عاجل وهام 🚨' : 'إشعار رسمي 📢'}</span>
                      </span>

                      <span className="text-xs font-bold text-slate-300">
                        {alert.stageName}
                      </span>

                      {alert.targetTeams.map(t => (
                        <span key={t} className="px-2 py-0.2 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-bold">
                          {t}
                        </span>
                      ))}

                      {isUnread && (
                        <span className="px-2 py-0.2 rounded bg-rose-500 text-white font-black text-[9px] animate-pulse">
                          جديد
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-mono">{alert.sentAt}</span>
                      {isAdmin && onDeleteAlert && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('هل أنت متأكد من حذف هذا التنبيه؟')) {
                              onDeleteAlert(alert.id);
                            }
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                          title="حذف هذا التنبيه (أدمن)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Match Card Details */}
                  <div className="space-y-2">
                    <h4 className="text-sm md:text-base font-black text-white flex items-center gap-2">
                      <span>{alert.title}</span>
                    </h4>

                    {/* Match Specific Quick Badge */}
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{alert.teamA}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-950 font-mono text-[10px] text-amber-400 font-bold">VS</span>
                        <span className="font-bold text-white text-sm">{alert.teamB}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 font-mono text-slate-300">
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                          <Calendar className="w-3.5 h-3.5" />
                          {alert.date}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-blue-400 font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          {alert.time}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-amber-300 font-sans font-bold">
                          <MapPin className="w-3.5 h-3.5 text-rose-400" />
                          {alert.pitch}
                        </span>
                      </div>
                    </div>

                    {/* Message Body */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                      {alert.message}
                    </div>
                  </div>

                  {/* Footer: Admin Sender & Player Acknowledgment Action */}
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      <span>مرسل بواسطة: <strong className="text-slate-300">{alert.sentBy}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Acknowledged players badge count */}
                      {(alert.acknowledgedPlayers || []).length > 0 && (
                        <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{alert.acknowledgedPlayers?.length} لاعباً أكدوا الجاهزية</span>
                        </span>
                      )}

                      {/* Acknowledge Button for players */}
                      {onAcknowledgeAlert && (
                        hasAcknowledged ? (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>أكدت جاهزيتك للمباراة ✅</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAcknowledgeAlert(alert.id);
                              confetti({ particleCount: 40, spread: 50 });
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5 transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تأكيد الاطلاع والجاهزية للمباراة ⚽</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* List of acknowledged player names */}
                  {(alert.acknowledgedPlayers || []).length > 0 && (
                    <div className="pt-1.5 text-[10px] text-slate-400 flex flex-wrap items-center gap-1 border-t border-slate-900">
                      <span className="font-bold text-slate-300">اللاعبون المؤكدون:</span>
                      {alert.acknowledgedPlayers?.map((p, idx) => (
                        <span key={p.userId} className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 border border-slate-800">
                          {p.userName} ({p.teamName})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
          <span className="text-xs text-slate-500">
            يتم تحديث التنبيهات تلقائياً عند أي تغيير رسمي من لجنة المسابقات.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
