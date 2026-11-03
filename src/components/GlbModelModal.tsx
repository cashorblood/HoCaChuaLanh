import { useEffect, useRef, useState } from 'react';
import { Box, FolderGit2, RotateCcw, Upload, X } from 'lucide-react';
import { glbRegistry, GlbSlotId } from '../three/glbModelRegistry';

interface GlbModelModalProps {
  open: boolean;
  onClose: () => void;
  onNotify: (message: string) => void;
}

const SLOT_CONFIGS: Array<{
  slot: GlbSlotId;
  title: string;
  subtitle: string;
  suggestedFile: string;
}> = [
  {
    slot: 'betta',
    title: 'Cá Betta (Halfmoon / Koi / Alien)',
    subtitle: 'Hỗ trợ cả model có sẵn xương bơi (Rigged Animation) lẫn model tĩnh',
    suggestedFile: 'betta.glb',
  },
  {
    slot: 'guppy',
    title: 'Cá Guppy Bảy Màu',
    subtitle: 'Áp dụng cho toàn bộ đàn Guppy đang bơi trong bể',
    suggestedFile: 'guppy.glb',
  },
  {
    slot: 'shrimp',
    title: 'Tép Cảnh (Fire Red / Tép Ong / Blue Dream)',
    subtitle: 'Áp dụng cho đàn tép cảnh bò nhặt rêu dưới nền cát & rêu',
    suggestedFile: 'shrimp.glb',
  },
  {
    slot: 'rock',
    title: 'Đá Thủy Sinh (Seiryu / Ryuoh)',
    subtitle: 'Thay thế hình khối các cụm đá lớn & đá dăm trên nền bể',
    suggestedFile: 'rock.glb',
  },
  {
    slot: 'driftwood',
    title: 'Gốc Lũa Tự Nhiên (Bonsai / Spiderwood)',
    subtitle: 'Thay thế các nhánh lũa cổ thụ trong bố cục',
    suggestedFile: 'driftwood.glb',
  },
  {
    slot: 'plant',
    title: 'Cây Thủy Sinh (Ráy / Dương Xỉ / Cỏ)',
    subtitle: 'Tự động đung đưa nhẹ theo dòng nước lọc trong hồ',
    suggestedFile: 'plant.glb',
  },
];

export function GlbModelModal({ open, onClose, onNotify }: GlbModelModalProps) {
  const [loadedSlots, setLoadedSlots] = useState<Partial<Record<GlbSlotId, string>>>(() =>
    glbRegistry.getAllLoadedSlots()
  );
  const [loadingSlot, setLoadingSlot] = useState<GlbSlotId | null>(null);
  const [showGithubGuide, setShowGithubGuide] = useState(false);
  const fileInputsRef = useRef<Partial<Record<GlbSlotId, HTMLInputElement | null>>>({});

  useEffect(() => {
    const sync = () => {
      setLoadedSlots(glbRegistry.getAllLoadedSlots());
    };
    sync();
    return glbRegistry.subscribe(sync);
  }, []);

  if (!open) return null;

  const handleFileChange = async (slot: GlbSlotId, file: File | undefined) => {
    if (!file) return;
    setLoadingSlot(slot);
    try {
      await glbRegistry.loadFromFile(slot, file);
      onNotify(`Đã nạp model 3D "${file.name}" vào hồ!`);
    } catch {
      onNotify('Không đọc được file .glb/.gltf này. Hãy chọn file định dạng .glb hợp lệ.');
    } finally {
      setLoadingSlot(null);
      const inputEl = fileInputsRef.current[slot];
      if (inputEl) inputEl.value = '';
    }
  };

  const handleResetSlot = (slot: GlbSlotId, title: string) => {
    glbRegistry.clearSlot(slot);
    onNotify(`Đã khôi phục hình khối PBR mặc định cho ${title}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quản lý mô hình 3D GLB chân thực"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88dvh] overflow-y-auto overscroll-contain custom-scrollbar bg-[#0d1619] border border-white/12 rounded-2xl shadow-2xl p-4 sm:p-5 text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-white/10">
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-teal-950/80 border border-teal-400/30 text-teal-300 shrink-0">
              <Box className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-stone-100">
                Xưởng Mô Hình 3D Chân Thực (.GLB / PBR)
              </h2>
              <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                Hồ đã được nâng cấp sẵn vân đá Seiryu, vỏ lũa, cát suối PBR, nắng xuyên nước & Bloom quang học. Bạn có thể nạp thêm file <strong>.glb</strong> điêu khắc chi tiết bên dưới.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 hover:text-stone-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher: Live Upload vs Permanent GitHub Hosting Guide */}
        <div className="flex items-center justify-between gap-2 my-3">
          <div className="flex items-center gap-1 p-1 bg-[#070d0f] rounded-xl border border-white/8 overflow-x-auto no-scrollbar max-w-full">
            <button
              type="button"
              onClick={() => setShowGithubGuide(false)}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                !showGithubGuide
                  ? 'bg-teal-400 text-stone-950 font-semibold'
                  : 'text-stone-300 hover:text-stone-100'
              }`}
            >
              Nạp thử từ máy (.glb)
            </button>
            <button
              type="button"
              onClick={() => setShowGithubGuide(true)}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                showGithubGuide
                  ? 'bg-teal-400 text-stone-950 font-semibold'
                  : 'text-stone-300 hover:text-stone-100'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>Lưu cố định lên GitHub</span>
            </button>
          </div>

          <span className="hidden sm:inline text-xs text-stone-400 font-mono-num whitespace-nowrap">
            Tự căn kích thước & bóng đổ 3D
          </span>
        </div>

        {!showGithubGuide ? (
          <div className="space-y-2.5">
            {SLOT_CONFIGS.map((item) => {
              const currentFile = loadedSlots[item.slot];
              const isBusy = loadingSlot === item.slot;

              return (
                <div
                  key={item.slot}
                  className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#070d0f] border border-white/10"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-stone-100 truncate">
                        {item.title}
                      </p>
                      {currentFile && (
                        <span className="text-[11px] font-mono-num text-teal-300 truncate">
                          · Đang dùng: {currentFile}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      ref={(el) => {
                        fileInputsRef.current[item.slot] = el;
                      }}
                      type="file"
                      accept=".glb,.gltf"
                      className="hidden"
                      onChange={(e) => handleFileChange(item.slot, e.target.files?.[0])}
                    />

                    {currentFile && (
                      <button
                        type="button"
                        onClick={() => handleResetSlot(item.slot, item.title)}
                        title="Trở về hình khối PBR mặc định"
                        className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-xs text-stone-300 hover:text-rose-200 border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Mặc định</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => fileInputsRef.current[item.slot]?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-400/15 hover:bg-teal-400/25 border border-teal-400/45 text-xs font-medium text-teal-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isBusy ? 'Đang nạp...' : currentFile ? 'Đổi file .glb' : 'Chọn file .glb'}</span>
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 text-xs text-stone-300 leading-relaxed">
              <strong className="text-teal-300">Nguồn tải model .glb miễn phí đẹp như thật:</strong>{' '}
              Tìm từ khóa <code className="text-stone-100">"Betta fish"</code>,{' '}
              <code className="text-stone-100">"Guppy"</code>,{' '}
              <code className="text-stone-100">"Aquarium rock"</code> hoặc{' '}
              <code className="text-stone-100">"Driftwood"</code> trên{' '}
              <strong>Sketchfab.com</strong> (bật lọc Downloadable → tải định dạng <strong>glTF .glb</strong>) hoặc tạo 3D từ 1 tấm ảnh cá thật trên <strong>Tripo3D.ai / Meshy.ai</strong>.
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-stone-300 leading-relaxed">
            <div className="p-3.5 rounded-xl bg-[#070d0f] border border-white/10 space-y-2">
              <p className="text-sm font-medium text-stone-100">
                Để khách mở link GitHub Pages thấy ngay model .glb của bạn:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-stone-300">
                <li>
                  Bỏ các file <code className="text-teal-300">.glb</code> đã tải (nhỏ hơn 15MB/file để web tải nhanh) vào thư mục{' '}
                  <code className="text-teal-300">public/models/</code> trong repo GitHub của bạn.
                </li>
                <li>
                  Mở file <code className="text-teal-300">public/models/manifest.json</code> và khai báo đường dẫn tương đối như mẫu dưới đây:
                </li>
              </ol>

              <pre className="p-3 rounded-lg bg-black/70 border border-white/10 font-mono text-[11px] text-teal-200 overflow-x-auto">
{`{
  "models": {
    "betta": "./models/betta.glb",
    "guppy": "./models/guppy.glb",
    "shrimp": "./models/shrimp.glb",
    "rock": "./models/rock.glb",
    "driftwood": "./models/driftwood.glb",
    "plant": "./models/plant.glb"
  }
}`}
              </pre>

              <p className="text-stone-400">
                Bạn chỉ cần điền những mục bạn có file (ví dụ chỉ điền <code className="text-stone-200">"betta"</code>, các mục còn lại để trống hệ thống sẽ tự động dùng vật liệu PBR mặc định). Sau khi Commit lên GitHub, GitHub Actions sẽ tự động đóng gói ra trang web.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
