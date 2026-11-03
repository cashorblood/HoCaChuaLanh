import { useState } from 'react';
import { Camera, Check, Copy, Download, Link2, Sparkles, Upload, X } from 'lucide-react';
import { AquariumState } from '../types/aquarium';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  state: AquariumState;
  onImportState: (nextState: AquariumState) => void;
  onCreateFreshTank: () => void;
  onCaptureSnapshot: () => string | null;
}

export function ShareModal({
  open,
  onClose,
  state,
  onImportState,
  onCreateFreshTank,
  onCaptureSnapshot,
}: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  if (!open) return null;

  const encodedLayout = btoa(encodeURIComponent(JSON.stringify(state)));
  const shareableTankUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}#tank=${encodedLayout}`
      : encodedLayout;

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableTankUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // Fallback ignored cleanly
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(encodedLayout);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback ignored cleanly
    }
  };

  const handleTakePhoto = () => {
    const dataUrl = onCaptureSnapshot();
    if (dataUrl) {
      setSnapshotUrl(dataUrl);
    }
  };

  const handleImport = () => {
    setImportError('');
    let raw = importText.trim();
    if (!raw) {
      setImportError('Vui lòng dán link hoặc mã bố cục bể cá trước khi nạp.');
      return;
    }
    // Also accept full #tank=... URL if user pasted a link!
    const hashIdx = raw.indexOf('#tank=');
    if (hashIdx !== -1) {
      raw = raw.slice(hashIdx + 6).trim();
    }
    try {
      const parsed = JSON.parse(decodeURIComponent(atob(raw))) as AquariumState;
      if (!parsed || !Array.isArray(parsed.fishes) || !Array.isArray(parsed.props)) {
        throw new Error('Invalid format');
      }
      onImportState(parsed);
      setImportText('');
      onClose();
    } catch {
      setImportError('Mã hoặc link bố cục không hợp lệ. Hãy kiểm tra lại chuỗi được chia sẻ.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/75"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[88dvh] overflow-y-auto overscroll-contain custom-scrollbar bg-[#0f191d] border border-white/12 rounded-2xl shadow-2xl p-4 sm:p-6 text-stone-100 space-y-4 sm:space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            id="share-modal-title"
            className="font-display text-xl sm:text-2xl font-semibold text-stone-100"
          >
            Chia sẻ & Tạo bể cá riêng
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Direct Shareable Tank URL + How Multi-User Works */}
        <div className="space-y-2.5 pb-4 border-b border-white/10">
          <p className="text-sm font-medium text-stone-200">
            Gửi link bể cá bạn đang trang trí cho bạn bè
          </p>
          <p className="text-xs text-stone-400 leading-relaxed">
            Mỗi người mở web sẽ có <strong>hồ riêng lưu độc lập trên thiết bị của họ</strong> (không làm thay đổi hồ của bạn). Gửi link dưới đây để bạn bè ngắm đúng hồ của bạn, hoặc họ tự tạo hồ mới tùy thích:
          </p>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareableTankUrl}
              className="flex-1 min-w-0 px-3 py-2 text-xs font-mono-num bg-[#070d0f] border border-white/10 rounded-lg text-stone-300 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-400 hover:bg-teal-300 text-stone-950 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã chép Link!</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Chép Link bể này</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-stone-300 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                  <span>Đã chép mã ngắn</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Chép mã bố cục</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onCreateFreshTank();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-xs font-medium text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tạo mới 1 bể trống của riêng tôi</span>
            </button>
          </div>
        </div>

        {/* 2. High-resolution 3D Tank Snapshot */}
        <div className="space-y-3 pb-4 border-b border-white/10">
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-stone-200">Chụp ảnh kỷ niệm góc bể 3D</p>
              <p className="text-xs text-stone-400">
                Xuất file ảnh PNG sắc nét không dính thanh công cụ để đăng mạng xã hội
              </p>
            </div>
            <button
              type="button"
              onClick={handleTakePhoto}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-stone-100 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-teal-300" />
              <span>Chụp ảnh PNG</span>
            </button>
          </div>

          {snapshotUrl && (
            <div className="space-y-2 pt-1">
              <img
                src={snapshotUrl}
                alt="Ảnh chụp Hồ Thủy Sinh Chữa Lành"
                referrerPolicy="no-referrer"
                className="w-full h-40 sm:h-44 object-cover rounded-xl border border-white/10"
              />
              <a
                href={snapshotUrl}
                download="ho-thuy-sinh-chua-lanh.png"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-400/20 hover:bg-teal-400/30 border border-teal-400/40 text-xs font-medium text-teal-200 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải ảnh PNG về máy</span>
              </a>
            </div>
          )}
        </div>

        {/* 3. Import Friend's Layout Code or Link */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-200">Nạp link hoặc mã bể cá từ bạn bè</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Dán link #tank=... hoặc mã bố cục..."
              className="flex-1 min-w-0 px-3 py-2 text-xs bg-[#070d0f] border border-white/10 rounded-lg text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-teal-400"
            />
            <button
              type="button"
              onClick={handleImport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-400/20 hover:bg-teal-400/30 border border-teal-400/40 text-xs font-medium text-teal-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Nạp bể</span>
            </button>
          </div>
          {importError && <p className="text-xs text-rose-400">{importError}</p>}
        </div>
      </div>
    </div>
  );
}
