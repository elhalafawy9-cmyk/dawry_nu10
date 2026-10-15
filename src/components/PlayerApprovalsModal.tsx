import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Shield, 
  Users, 
  Shirt, 
  Check, 
  X, 
  Search, 
  Filter, 
  AlertCircle, 
  Lock, 
  Sparkles, 
  GraduationCap, 
  Calendar,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
  Edit3,
  RefreshCw,
  ArrowRightLeft,
  Info
} from 'lucide-react';
import { PlayerRegistrationRequest } from '../utils/roster';
import { Team } from '../App';
import { TeamLogo } from '../utils/teamLogos';

interface PlayerApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: PlayerRegistrationRequest[];
  teams: Team[];
  onApproveRequest: (requestId: string) => void;
  onAdminApplyPlayerEdit?: (requestId: string, customData: Partial<PlayerRegistrationRequest>) => void;
  onRejectRequest: (requestId: string, reason?: string) => void;
  onApproveAllPending: () => void;
}

export const PlayerApprovalsModal: React.FC<PlayerApprovalsModalProps> = ({
  isOpen,
  onClose,
  requests,
  teams,
  onApproveRequest,
  onAdminApplyPlayerEdit,
  onRejectRequest,
  onApproveAllPending,
}) => {
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [typeFilter, setTypeFilter] = useState<'all' | 'add' | 'edit'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Admin inline editing state
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    playerName: string;
    studentId: string;
    playerNumber: number;
    playerPosition: 'GK' | 'DEF' | 'MID' | 'FWD';
    isCaptain: boolean;
  }>({
    playerName: '',
    studentId: '',
    playerNumber: 10,
    playerPosition: 'MID',
    isCaptain: false,
  });

  const pendingCount = useMemo(() => requests.filter(r => r.status === 'pending').length, [requests]);
  const approvedCount = useMemo(() => requests.filter(r => r.status === 'approved').length, [requests]);
  const rejectedCount = useMemo(() => requests.filter(r => r.status === 'rejected').length, [requests]);

  const addRequestsCount = useMemo(() => requests.filter(r => (!r.type || r.type === 'add') && r.status === 'pending').length, [requests]);
  const editRequestsCount = useMemo(() => requests.filter(r => r.type === 'edit' && r.status === 'pending').length, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      const rType = r.type || 'add';
      if (typeFilter !== 'all' && rType !== typeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mName = r.playerName.toLowerCase().includes(q);
        const mTeam = r.teamName.toLowerCase().includes(q);
        const mId = (r.studentId || '').toLowerCase().includes(q);
        const mBy = r.requestedBy.toLowerCase().includes(q);
        const mReason = (r.editReason || '').toLowerCase().includes(q);
        if (!mName && !mTeam && !mId && !mBy && !mReason) return false;
      }
      return true;
    });
  }, [requests, filterStatus, typeFilter, searchQuery]);

  if (!isOpen) return null;

  const handleConfirmReject = (requestId: string) => {
    onRejectRequest(requestId, rejectionReasonInput.trim() || 'لم يتم استيفاء شروط القيد الرسمية');
    setRejectingRequestId(null);
    setRejectionReasonInput('');
  };

  const startInlineEdit = (req: PlayerRegistrationRequest) => {
    setEditingRequestId(req.id);
    setEditFormData({
      playerName: req.playerName,
      studentId: req.studentId || '',
      playerNumber: req.playerNumber,
      playerPosition: req.playerPosition,
      isCaptain: !!req.isCaptain,
    });
  };

  const handleSaveInlineEditAndApprove = (requestId: string) => {
    if (!editFormData.playerName.trim()) return;

    if (onAdminApplyPlayerEdit) {
      onAdminApplyPlayerEdit(requestId, {
        playerName: editFormData.playerName.trim(),
        studentId: editFormData.studentId.trim(),
        playerNumber: Number(editFormData.playerNumber),
        playerPosition: editFormData.playerPosition,
        isCaptain: editFormData.isCaptain,
      });
    } else {
      onApproveRequest(requestId);
    }
    setEditingRequestId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 md:p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <UserCheck className="w-5 h-5" />
              </span>
              <h2 className="text-lg md:text-xl font-black text-white">
                مركز اعتمادات وتعديل اللاعبين — حساب الأدمن 👑
              </h2>
              {pendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-black animate-pulse">
                  {pendingCount} بانتظار موافقتك
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300">
              مراجعة طلبات إضافة اللاعبين الجدد وطلبات تعديل اللاعبين المقفلين. بصفتك مدير البطولة (Admin)، يمكنك الموافقة الفورية أو التعديل المباشر أو الرفض 🔒.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and Actions Bar */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 space-y-3">
          
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterStatus === 'pending'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>بانتظار الموافقة ({pendingCount})</span>
              </button>

              <button
                onClick={() => setFilterStatus('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterStatus === 'approved'
                    ? 'bg-emerald-600 text-white font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>المعتمدة ({approvedCount})</span>
              </button>

              <button
                onClick={() => setFilterStatus('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterStatus === 'rejected'
                    ? 'bg-rose-600 text-white font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>المرفوضة ({rejectedCount})</span>
              </button>

              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                الكل ({requests.length})
              </button>
            </div>

            {/* Search Input & Bulk Approve */}
            <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="ابحث بالاسم، الفريق، أو ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 pr-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              </div>

              {pendingCount > 1 && filterStatus === 'pending' && (
                <button
                  onClick={onApproveAllPending}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer shrink-0"
                  title="قبول جميع الطلبات المعلقة دفعة واحدة"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>اعتماد الكل ({pendingCount}) ⚡</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub-Filters: Request Type (Add vs Edit) */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60 text-xs">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" />
              نوع الطلب:
            </span>

            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              جميع الطلبات ({requests.length})
            </button>

            <button
              onClick={() => setTypeFilter('add')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                typeFilter === 'add'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>➕ طلبات القيد والإضافة</span>
              {addRequestsCount > 0 && (
                <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 rounded-full font-black text-[10px]">
                  {addRequestsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setTypeFilter('edit')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                typeFilter === 'edit'
                  ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <RefreshCw className="w-3 h-3 text-indigo-400" />
              <span>🔄 طلبات تعديل اللاعبين</span>
              {editRequestsCount > 0 && (
                <span className="px-1.5 py-0.2 bg-indigo-500 text-white rounded-full font-black text-[10px]">
                  {editRequestsCount}
                </span>
              )}
            </button>
          </div>

        </div>

        {/* Requests List Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3.5">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-950/40 rounded-2xl border border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="text-base font-black text-white">لا توجد طلبات في هذا التبويب</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {filterStatus === 'pending' 
                  ? 'تمت مراجعة واعتماد جميع طلبات تسجيل وتعديل اللاعبين بنجاح! لا توجد طلبات معلقة حالياً.'
                  : 'لم يتم العثور على طلبات مطابقة لمعايير البحث.'}
              </p>
            </div>
          ) : (
            filteredRequests.map((req) => {
              const teamObj = teams.find(t => t.name === req.teamName);
              const isRejectingThis = rejectingRequestId === req.id;
              const isEditingThis = editingRequestId === req.id;
              const isEditRequest = req.type === 'edit';

              return (
                <div
                  key={req.id}
                  className={`p-4 md:p-5 rounded-2xl border transition-all space-y-3.5 shadow-lg ${
                    req.status === 'pending'
                      ? isEditRequest
                        ? 'bg-slate-950 border-indigo-500/40 hover:border-indigo-500/70'
                        : 'bg-slate-950 border-amber-500/40 hover:border-amber-500/70'
                      : req.status === 'approved'
                      ? 'bg-slate-950/60 border-emerald-500/30'
                      : 'bg-slate-950/40 border-rose-500/20 opacity-80'
                  }`}
                >
                  {/* Top Bar of Request Item */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                    {/* Team & Requester Info */}
                    <div className="flex items-center gap-2.5">
                      <TeamLogo teamName={req.teamName} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-white text-sm font-black">{req.teamName}</strong>
                          {teamObj && (
                            <span className="text-[10px] px-2 py-0.2 rounded bg-slate-800 text-emerald-400 font-bold">
                              المجموعة {teamObj.group}
                            </span>
                          )}
                          {isEditRequest ? (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-black flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5 text-indigo-400" />
                              طلب تعديل لاعب
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                              ➕ قيد لاعب جديد
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block">
                          مقدم الطلب: <strong className="text-slate-300">{req.requestedBy}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Status Badge & Timestamp */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {req.requestedAt}
                      </span>
                      {req.status === 'pending' && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          بانتظار موافقتك ⏳
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          تم الاعتماد رسمياً ✅
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-black flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          مرفوض ❌
                        </span>
                      )}
                    </div>
                  </div>

                  {/* If Request is Edit: Show Side-by-Side Comparison */}
                  {isEditRequest && req.originalPlayer && (
                    <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-indigo-500/30 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-300 border-b border-slate-800 pb-2">
                        <span className="flex items-center gap-1.5">
                          <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
                          مقارنة بيانات اللاعب (قبل وبعد التعديل المطلوب):
                        </span>
                        {req.editReason && (
                          <span className="text-[11px] text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            السبب: <strong className="text-amber-300">{req.editReason}</strong>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* Original State */}
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                          <div className="text-[10px] text-slate-400 font-bold flex items-center justify-between">
                            <span>البيانات الحالية (في السيستم):</span>
                            <span className="text-rose-400 font-mono">الحالي</span>
                          </div>
                          <div className="text-sm font-bold text-slate-300">{req.originalPlayer.name}</div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                            <span>ID: {req.originalPlayer.studentId}</span>
                            <span>•</span>
                            <span>#{req.originalPlayer.number}</span>
                            <span>•</span>
                            <span>{req.originalPlayer.position}</span>
                          </div>
                        </div>

                        {/* Requested State */}
                        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-1.5">
                          <div className="text-[10px] text-emerald-400 font-bold flex items-center justify-between">
                            <span>البيانات الجديدة المطلوبة:</span>
                            <span className="text-emerald-300 font-mono">المطلوب</span>
                          </div>
                          <div className="text-sm font-black text-white flex items-center gap-2">
                            <span>{req.playerName}</span>
                            {req.playerName !== req.originalPlayer.name && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                اسم معدل
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-emerald-300 font-mono font-bold">
                            <span>ID: {req.studentId || '—'}</span>
                            {req.studentId !== req.originalPlayer.studentId && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                ID معدل
                              </span>
                            )}
                            <span>•</span>
                            <span>#{req.playerNumber}</span>
                            <span>•</span>
                            <span>{req.playerPosition}</span>
                            {req.isCaptain && <span className="text-amber-400">👑 كابتن</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Standard Player Specs Card (For Add Requests or General View) */}
                  {(!isEditRequest || !req.originalPlayer) && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800/80 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block mb-0.5">اسم اللاعب:</span>
                        <strong className="text-white text-sm font-black block truncate">{req.playerName}</strong>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[10px] block mb-0.5">الرقم الجامعي (ID):</span>
                        <div className="flex items-center gap-1 font-mono text-emerald-300 font-bold">
                          <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{req.studentId || 'غير مدخل'}</span>
                          <span title="مقفل ومحمي"><Lock className="w-2.5 h-2.5 text-slate-500" /></span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[10px] block mb-0.5">رقم القميص والمركز:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 font-mono font-black text-amber-400 border border-slate-800">
                            #{req.playerNumber}
                          </span>
                          <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                            req.playerPosition === 'GK' ? 'bg-amber-500/20 text-amber-300' :
                            req.playerPosition === 'DEF' ? 'bg-blue-500/20 text-blue-300' :
                            req.playerPosition === 'MID' ? 'bg-emerald-500/20 text-emerald-300' :
                            'bg-rose-500/20 text-rose-300'
                          }`}>
                            {req.playerPosition}
                          </span>
                          {req.isCaptain && (
                            <span className="text-[10px] text-amber-400 font-bold">⭐ C</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[10px] block mb-0.5">الكلية / القسم:</span>
                        <span className="text-slate-300 text-xs font-medium">
                          {req.department || 'جامعة النيل'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Rejection Note (if rejected) */}
                  {req.status === 'rejected' && req.rejectionReason && (
                    <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>سبب الرفض: <strong>{req.rejectionReason}</strong></span>
                    </div>
                  )}

                  {/* Review Info (if approved) */}
                  {req.status === 'approved' && req.reviewedBy && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        تم الاعتماد بواسطة: <strong>{req.reviewedBy}</strong>
                      </span>
                      {req.reviewedAt && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          بتاريخ {req.reviewedAt}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Admin Inline Edit Form for Pending Request */}
                  {isEditingThis && req.status === 'pending' && (
                    <div className="p-4 bg-slate-900 border-2 border-emerald-500/50 rounded-2xl space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <strong className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                          <Edit3 className="w-4 h-4 text-emerald-400" />
                          تعديل بيانات اللاعب مباشرة بصلاحية الأدمن قبل الاعتماد ✏️👑
                        </strong>
                        <button
                          onClick={() => setEditingRequestId(null)}
                          className="text-slate-400 hover:text-white text-xs"
                        >
                          إلغاء التعديل
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-300 font-bold">اسم اللاعب:</label>
                          <input
                            type="text"
                            value={editFormData.playerName}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, playerName: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-300 font-bold">الرقم الجامعي (ID):</label>
                          <input
                            type="text"
                            value={editFormData.studentId}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, studentId: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-300 font-bold">رقم القميص:</label>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={editFormData.playerNumber}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, playerNumber: Number(e.target.value) }))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-300 font-bold">المركز:</label>
                          <select
                            value={editFormData.playerPosition}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, playerPosition: e.target.value as any }))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="GK">حارس مرمى (GK)</option>
                            <option value="DEF">مدافع (DEF)</option>
                            <option value="MID">خط وسط (MID)</option>
                            <option value="FWD">مهاجم (FWD)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-300">
                          <input
                            type="checkbox"
                            checked={editFormData.isCaptain}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, isCaptain: e.target.checked }))}
                            className="w-4 h-4 rounded border-slate-700 text-amber-500"
                          />
                          <span>تعيين كقائد للفريق (كابتن)</span>
                        </label>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingRequestId(null)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                          >
                            إلغاء
                          </button>
                          <button
                            onClick={() => handleSaveInlineEditAndApprove(req.id)}
                            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>حفظ وتطبيق التعديل رسمياً كـ أدمن ✅</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Admin Action Buttons for Pending Requests */}
                  {req.status === 'pending' && !isEditingThis && (
                    <div>
                      {isRejectingThis ? (
                        <div className="p-3 bg-slate-900 border border-rose-500/30 rounded-xl space-y-2 animate-fade-in">
                          <label className="text-xs font-bold text-rose-300 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            سبب رفض الطلب (سيظهر لمسؤول فريق {req.teamName}):
                          </label>
                          <input
                            type="text"
                            placeholder="مثال: الرقم الجامعي غير مسجل، أو الاسم غير مطابق للكارنيه..."
                            value={rejectionReasonInput}
                            onChange={(e) => setRejectionReasonInput(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                          />
                          <div className="flex items-center gap-2 justify-end pt-1">
                            <button
                              onClick={() => {
                                setRejectingRequestId(null);
                                setRejectionReasonInput('');
                              }}
                              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                            >
                              إلغاء
                            </button>
                            <button
                              onClick={() => handleConfirmReject(req.id)}
                              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                            >
                              تأكيد الرفض ❌
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                          {/* Reject button */}
                          <button
                            onClick={() => {
                              setRejectingRequestId(req.id);
                              setRejectionReasonInput('');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>رفض الطلب</span>
                          </button>

                          {/* Inline Admin Edit button */}
                          <button
                            onClick={() => startInlineEdit(req)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                            title="تعديل البيانات كـ أدمن قبل الاعتماد"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>تعديل كـ أدمن ✏️</span>
                          </button>

                          {/* Direct Approve button */}
                          <button
                            onClick={() => onApproveRequest(req.id)}
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>
                              {isEditRequest ? 'اعتماد وتطبيق التعديل رسمياً ✅' : 'موافقة واعتماد اللاعب في القائمة ✅'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>نظام النزاهة وحماية الهوية: اسم اللاعب ورقم ID مقفلان ومحميان فور الاعتماد. لا يمكن لأي مسؤول فريق تعديلهما إلا عبر إرسال طلب للأدمن 🔒.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
};
