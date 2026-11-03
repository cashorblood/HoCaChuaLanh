import { useState } from 'react';
import { Camera, Check, Copy, Download, Upload, X } from 'lucide-react';
import { AquariumState } from '../types/aquarium';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  state: AquariumState;
  onImportState: (nextState: AquariumState) => void;
  onCaptureSnapshot: () => string | null;
}

export function ShareModal({
  open,
  onClose,
  state,
  onImportState,
  onCaptureSnapshot,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  if (!open) return null;

  const encodedLayout = btoa(encodeURIComponent(JSON.stringify(state)));

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(encodedLayout);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
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
    const trimmed = importText.trim();
    if (!trimmed) {
      setImportError('Vui lòng dán mã bố cục bể cá trước khi nạp.');
      return;
    }
    try {
      const parsed = JSON.parse(decodeURIComponent(atob(trimmed))) as AquariumState;
      if (!parsed || !Array.isArray(parsed.fishes) || !Array.isArray(parsed.props)) {
        throw new Error('Invalid format');
      }
      onImportState(parsed);
      setImportText('');
      onClose();
    } catch {
      setImportError('Mã bố cục không hợp lệ. Hãy kiểm tra lại chuỗi mã được chia sẻ.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75"
    >
      <div className="w-full max-w-lg bg-[#0f191d] border border-white/12 rounded-2xl shadow-2xl p-6 text-stone-100 space-y-5">
        <div className="flex items-center justify-between">
          <h2 id="share-modal-title" className="font-display text-2xl font-semibold text-stone-100">
            Lưu ảnh & Chia sẻ bố cục bể
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. High-resolution 3D Tank Snapshot */}
        <div className="space-y-3 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-stone-200">Chụp ảnh kỷ niệm góc bể 3D</p>
              <p className="text-xs text-stone-400">
                Xuất file ảnh PNG sắc nét không dính thanh công cụ để đăng mạng xã hội
              </p>
            </div>
            <button
              type="button"
              onClick={handleTakePhoto}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-400 hover:bg-teal-300 text-stone-950 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Chụp ảnh ngay</span>
            </button>
          </div>

          {snapshotUrl && (
            <div className="space-y-2 pt-1">
              <img
                src={snapshotUrl}
                alt="Ảnh chụp Hồ Thủy Sinh Chữa Lành"
                referrerPolicy="no-referrer"
                className="w-full h-44 object-cover rounded-xl border border-white/10"
              />
              <a
                href={snapshotUrl}
                download="ho-thuy-sinh-chua-lanh.png"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-stone-100 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-teal-300" />
                <span>Tải ảnh PNG về máy</span>
              </a>
            </div>
          )}
        </div>

        {/* 2. Copy Layout Code */}
        <div className="space-y-2 pb-4 border-b border-white/10">
          <p className="text-sm font-medium text-stone-200">Sao chép mã bố cục bể của bạn</p>
          <p className="text-xs text-stone-400">
            Gửi mã này cho bạn bè để họ nạp nguyên vẹn cách xếp đá, lũa và đàn cá của bạn.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={encodedLayout}
              className="flex-1 px-3 py-2 text-xs font-mono-num bg-[#070d0f] border border-white/10 rounded-lg text-stone-300 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-stone-100 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                  <span>Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép mã</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3. Import Friend's Layout Code */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-200">Nạp mã bể cá từ bạn bè</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Dán chuỗi mã bố cục vào đây..."
              className="flex-1 px-3 py-2 text-xs bg-[#070d0f] border border-white/10 rounded-lg text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-teal-400"
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
