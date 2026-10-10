import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Link as LinkIcon, 
  Sparkles, 
  Trash2, 
  Check, 
  Shield, 
  User, 
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { compressImageFile, PRESET_PLAYER_AVATARS, PRESET_TEAM_CRESTS } from '../utils/roster';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  currentImageUrl?: string;
  onSave: (newImageUrl: string) => void;
  type: 'player' | 'team';
  entityName?: string;
  badgeNumberOrGroup?: string;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  currentImageUrl = '',
  onSave,
  type,
  entityName = '',
  badgeNumberOrGroup = '',
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string>(currentImageUrl);
  const [urlInput, setUrlInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      setPreviewUrl(currentImageUrl);
      setUrlInput(currentImageUrl.startsWith('data:') ? '' : currentImageUrl);
      setErrorMsg('');
      setIsProcessing(false);
    }
  }, [isOpen, currentImageUrl]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setIsProcessing(true);
    try {
      // Compress to 300x300 max dimension
      const compressedDataUrl = await compressImageFile(file, 300, 0.85);
      setPreviewUrl(compressedDataUrl);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تحميل وضغط الصورة');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) {
      setErrorMsg('يرجى إدخال رابط الصورة أولاً');
      return;
    }
    setErrorMsg('');
    setPreviewUrl(urlInput.trim());
  };

  const handleSelectPreset = (presetUrl: string) => {
    setErrorMsg('');
    setPreviewUrl(presetUrl);
  };

  const handleRemovePhoto = () => {
    setPreviewUrl('');
    setUrlInput('');
    setErrorMsg('');
  };

  const handleConfirmSave = () => {
    onSave(previewUrl);
    onClose();
  };

  const presets = type === 'player' ? PRESET_PLAYER_AVATARS : PRESET_TEAM_CRESTS;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
              type === 'team'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-teal-500/15 border-teal-500/30 text-teal-400'
            }`}>
              {type === 'team' ? <Shield className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-white">{title}</h3>
              <p className="text-xs text-slate-400">
                {subtitle || (type === 'team' ? 'تعديل شعار وصورة الفريق في جميع الجداول والمباريات' : 'إضافة أو تعديل الصورة الرسمية للاعب')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 flex-1">

          {/* Interactive Live Preview Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center flex flex-col items-center justify-center gap-3">
            <span className="text-[11px] font-bold text-slate-400">المعاينة المباشرة:</span>
            
            <div className="relative">
              {previewUrl ? (
                <div className={`relative overflow-hidden shadow-xl ring-2 ${
                  type === 'team' 
                    ? 'w-24 h-24 rounded-3xl ring-amber-500/40 bg-slate-900 p-2' 
                    : 'w-24 h-24 rounded-full ring-teal-500/40 bg-slate-900'
                }`}>
                  <img
                    src={previewUrl}
                    alt={entityName || 'Preview'}
                    className={`w-full h-full ${type === 'team' ? 'object-contain' : 'object-cover'}`}
                    onError={() => setErrorMsg('تعذر عرض الصورة من هذا الرابط. يرجى تجربة رابط آخر أو رفع ملف.')}
                  />
                </div>
              ) : (
                <div className={`flex flex-col items-center justify-center bg-slate-900 border-2 border-dashed border-slate-700 text-slate-500 shadow-inner ${
                  type === 'team' ? 'w-24 h-24 rounded-3xl' : 'w-24 h-24 rounded-full'
                }`}>
                  {type === 'team' ? (
                    <Shield className="w-9 h-9 text-slate-600" />
                  ) : (
                    <User className="w-9 h-9 text-slate-600" />
                  )}
                  <span className="text-[10px] text-slate-500 mt-1">بدون صورة</span>
                </div>
              )}

              {badgeNumberOrGroup && (
                <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-[10px] font-mono shadow">
                  {badgeNumberOrGroup}
                </span>
              )}
            </div>

            {entityName && (
              <strong className="text-sm font-black text-white">{entityName}</strong>
            )}

            {previewUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>إزالة الصورة والعودة للشعار الافتراضي</span>
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold text-center">
              {errorMsg}
            </div>
          )}

          {/* Sub-Tabs: Upload vs URL vs Presets */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>رفع من جهازك</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'url'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>رابط صورة (URL)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>نماذج مقترحة</span>
            </button>
          </div>

          {/* Tab 1: File Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors bg-slate-950/60 hover:bg-slate-950 group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-white block">
                    {isProcessing ? 'جارٍ ضغط وتحضير الصورة...' : 'انقر لاختيار صورة من جهازك أو الكاميرا'}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    يدعم JPG, PNG, WEBP (يتم الضغط تلقائياً للحفاظ على الأداء)
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Tab 2: URL Input */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">رابط الصورة المباشر:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono text-left"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    معاينة
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                يمكنك نسخ رابط أي صورة من الإنترنت ووضعها هنا للمعاينة الفورية.
              </p>
            </div>
          )}

          {/* Tab 3: Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-300 block">اختر صورة أو شعاراً جاهزاً:</span>
              <div className="grid grid-cols-4 gap-2.5">
                {presets.map((pUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(pUrl)}
                    className={`relative p-1.5 rounded-2xl border transition-all cursor-pointer bg-slate-950 flex items-center justify-center aspect-square ${
                      previewUrl === pUrl
                        ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-950/20'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <img
                      src={pUrl}
                      alt={`Preset ${idx + 1}`}
                      className={`w-full h-full rounded-xl ${type === 'team' ? 'object-contain' : 'object-cover'}`}
                    />
                    {previewUrl === pUrl && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3 sticky bottom-0 z-10 backdrop-blur-md">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleConfirmSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer hover:scale-105"
          >
            <Check className="w-4 h-4" />
            <span>اعتماد وحفظ الصورة</span>
          </button>
        </div>

      </div>
    </div>
  );
};
