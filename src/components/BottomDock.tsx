import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Droplets,
  Volume2,
  VolumeX,
  RotateCw,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  CopyPlus,
  Eraser,
  MousePointerClick,
  Box,
} from 'lucide-react';
import {
  AquariumState,
  AquascapePropType,
  AudioMixState,
  CameraPreset,
  FISH_CATALOG,
  FishMorphId,
  FoodType,
  LightingPreset,
  PRESET_LAYOUTS,
  PresetLayoutId,
  PROP_CATALOG,
  SubstrateType,
} from '../types/aquarium';
import { DockTab } from './TopBar';

interface BottomDockProps {
  state: AquariumState;
  activePresetId: PresetLayoutId | 'custom_empty';
  activeTab: DockTab;
  onSelectTab: (tab: DockTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  clickFeedMode: boolean;
  onToggleClickFeed: () => void;
  onFeedNow: () => void;
  onSelectFood: (food: FoodType) => void;
  onWaterChange: () => void;
  waterChanging: boolean;
  onCleanGlass: () => void;
  onToggleMirror: () => void;
  onAddFish: (morph: FishMorphId) => void;
  onRemoveFish: (id: string) => void;
  onClearAllFishes: () => void;
  onApplyPresetLayout: (preset: PresetLayoutId) => void;
  onStartEmptyDIY: () => void;
  onChangeSubstrate: (sub: SubstrateType) => void;
  placingPropType: AquascapePropType | null;
  onSelectPlacingPropType: (type: AquascapePropType | null) => void;
  onAddPropCenter: (type: AquascapePropType) => void;
  onClearAllProps: () => void;
  selectedPropId: string | null;
  onRotateSelectedProp: (exactRadians?: number) => void;
  onScaleSelectedProp: (delta: number) => void;
  onDuplicateSelectedProp: () => void;
  onDeleteSelectedProp: () => void;
  onChangeLighting: (light: LightingPreset) => void;
  audioMix: AudioMixState;
  onChangeAudioMix: (next: AudioMixState) => void;
  pomodoroSeconds: number;
  pomodoroRunning: boolean;
  onTogglePomodoro: () => void;
  onResetPomodoro: () => void;
  activeCamera: CameraPreset;
  onSelectCamera: (preset: CameraPreset) => void;
  onOpenGlbModal: () => void;
}

const FOOD_OPTIONS: Array<{ id: FoodType; label: string; desc: string }> = [
  { id: 'pellets', label: 'Cám hạt nổi', desc: 'Giàu đạm, giữ nước sạch lâu' },
  { id: 'bloodworms', label: 'Trùn chỉ sấy', desc: 'Món khoái khẩu kích màu Betta' },
  { id: 'artemia', label: 'Artemia tươi', desc: 'Hạt mịn cho đàn Guppy sung sức' },
];

const SUBSTRATE_OPTIONS: Array<{ id: SubstrateType; label: string }> = [
  { id: 'aqua_soil', label: 'Phân nền ADA' },
  { id: 'river_sand', label: 'Cát trắng suối' },
  { id: 'golden_pebbles', label: 'Sỏi cuội vàng' },
];

const LIGHTING_OPTIONS: Array<{ id: LightingPreset; label: string }> = [
  { id: 'wrgb_vivid', label: 'Đèn WRGB' },
  { id: 'morning_sun', label: 'Nắng sớm' },
  { id: 'golden_dusk', label: 'Hoàng hôn' },
  { id: 'blackwater_amber', label: 'Nước trà lá bàng' },
  { id: 'moonlight', label: 'Ánh trăng' },
];

export function BottomDock({
  state,
  activePresetId,
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  clickFeedMode,
  onToggleClickFeed,
  onFeedNow,
  onSelectFood,
  onWaterChange,
  waterChanging,
  onCleanGlass,
  onToggleMirror,
  onAddFish,
  onRemoveFish,
  onClearAllFishes,
  onApplyPresetLayout,
  onStartEmptyDIY,
  onChangeSubstrate,
  placingPropType,
  onSelectPlacingPropType,
  onAddPropCenter,
  onClearAllProps,
  selectedPropId,
  onRotateSelectedProp,
  onScaleSelectedProp,
  onDuplicateSelectedProp,
  onDeleteSelectedProp,
  onChangeLighting,
  audioMix,
  onChangeAudioMix,
  pomodoroSeconds,
  pomodoroRunning,
  onTogglePomodoro,
  onResetPomodoro,
  activeCamera,
  onSelectCamera,
  onOpenGlbModal,
}: BottomDockProps) {
  const [propFilter, setPropFilter] = useState<'all' | 'hardscape' | 'plant' | 'botanical'>('all');
  const [speciesFilter, setSpeciesFilter] = useState<'all' | 'shrimp' | 'betta' | 'guppy'>('all');

  const bettaCount = state.fishes.filter((f) => f.species === 'betta').length;
  const shrimpCount = state.fishes.filter((f) => f.species === 'shrimp').length;
  const filteredCatalog =
    speciesFilter === 'all'
      ? FISH_CATALOG
      : FISH_CATALOG.filter((c) => c.species === speciesFilter);
  const selectedProp = state.props.find((p) => p.id === selectedPropId) || null;
  const selectedPropSpec = selectedProp
    ? PROP_CATALOG.find((c) => c.type === selectedProp.type)
    : null;
  const placingSpec = placingPropType
    ? PROP_CATALOG.find((c) => c.type === placingPropType)
    : null;

  const filteredProps =
    propFilter === 'all'
      ? PROP_CATALOG
      : PROP_CATALOG.filter((item) => item.category === propFilter);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const clarityStateLabel =
    state.waterClarity >= 85
      ? 'Trong vắt'
      : state.waterClarity >= 65
        ? 'Ổn định'
        : 'Cần thay nước';

  return (
    <div className="fixed bottom-[max(0.5rem,env(safe-area-inset-bottom))] sm:bottom-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100vw-1rem)] sm:w-[min(960px,95vw)]">
      {/* Collapse / Zen Cinema Mode Toggle Handle */}
      <div className="flex items-center justify-center mb-1.5">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-medium text-stone-200 bg-[#0d1619]/95 hover:bg-[#142227] border border-white/12 rounded-lg shadow-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
        >
          {collapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-teal-400" />
              <span>Mở xưởng thiết kế & chăm cá</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              <span>Ẩn công cụ ngắm bể</span>
            </>
          )}
        </button>
      </div>

      {/* Main Consolidated Bottom Studio Dock */}
      {!collapsed && (
        <section
          aria-label="Xưởng thiết kế và chăm sóc hồ thủy sinh"
          className="max-h-[45dvh] sm:max-h-[52dvh] overflow-y-auto overscroll-contain custom-scrollbar bg-[#0d1619]/96 border border-white/12 rounded-2xl shadow-2xl p-2.5 sm:p-4 text-stone-100"
        >
          {/* Top Header inside Dock: Scrollable Workflow Tabs + Compact Camera/GLB/ASMR Strip */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-white/10">
            <div className="flex items-center gap-1 p-1 bg-[#070d0f] rounded-xl overflow-x-auto no-scrollbar max-w-full">
              {(
                [
                  { id: 'presets', label: '1. Layout Mẫu' },
                  { id: 'builder', label: '2. Tự Build Bể' },
                  { id: 'fish', label: '3. Cá & Tép' },
                  { id: 'care', label: '4. Chăm Hồ' },
                  { id: 'ambience', label: '5. Đèn & ASMR' },
                ] as Array<{ id: DockTab; label: string }>
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-teal-400 text-stone-950'
                      : 'text-stone-300 hover:text-stone-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Camera Angles + GLB + ASMR (Single scrollable strip on narrow screens) */}
            <div className="flex items-center justify-between lg:justify-end gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar max-w-full">
              <div className="flex items-center gap-0.5 sm:gap-1 bg-[#070d0f] p-1 rounded-lg border border-white/8 shrink-0">
                {(
                  [
                    { id: 'front', label: 'Chính diện' },
                    { id: 'angle', label: 'Góc 45°' },
                    { id: 'top', label: 'Mặt nước' },
                    { id: 'closeup', label: 'Cận cảnh' },
                  ] as Array<{ id: CameraPreset; label: string }>
                ).map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => onSelectCamera(cam.id)}
                    className={`px-2 py-1 text-[11px] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeCamera === cam.id
                        ? 'bg-white/15 text-teal-300 font-medium'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>

              <div className="hidden xl:flex items-center gap-2 text-xs text-stone-300 font-mono-num whitespace-nowrap shrink-0">
                <span>
                  Nước {Math.round(state.waterClarity)}% ({clarityStateLabel})
                </span>
                <span aria-hidden="true" className="text-stone-600">
                  ·
                </span>
                <span>
                  {state.fishes.length - shrimpCount} cá · {shrimpCount} tép
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onOpenGlbModal}
                  title="Nạp mô hình 3D .GLB cho cá, đá, lũa, cây"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-400/15 hover:bg-teal-400/25 border border-teal-400/35 text-teal-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Box className="w-3.5 h-3.5 text-teal-300" />
                  <span className="text-xs font-medium">.GLB</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onChangeAudioMix({ ...audioMix, muted: !audioMix.muted })
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {audioMix.muted ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-stone-400" />
                      <span className="text-xs">ASMR</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                      <span className="text-xs text-teal-300">ASMR</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* =====================================================================
              TAB 1: CHỌN LAYOUT CÓ SẴN HOẶC KHỞI TẠO BỂ TRỐNG TỰ BUILD
             ===================================================================== */}
          {activeTab === 'presets' && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-300">
                <span className="hidden sm:inline">
                  Chọn 1 trong 3 bố cục dựng sẵn hoặc mở <strong>Bể Trống</strong> để tự xếp đá, lũa:
                </span>
                <span className="sm:hidden text-stone-400">
                  Vuốt ngang để chọn layout mẫu hoặc tự build:
                </span>
                <span className="text-stone-400 font-mono-num whitespace-nowrap">
                  {state.props.length} vật phẩm · {state.fishes.length} cá
                </span>
              </div>

              {/* Horizontal swipe carousel on mobile/tablet; 4-col grid on desktop */}
              <div className="flex lg:grid lg:grid-cols-4 gap-2.5 overflow-x-auto lg:overflow-visible no-scrollbar snap-x snap-mandatory pb-0.5">
                {(Object.keys(PRESET_LAYOUTS) as PresetLayoutId[]).map((presetKey) => {
                  const preset = PRESET_LAYOUTS[presetKey];
                  const isCurrent = activePresetId === presetKey;
                  return (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => onApplyPresetLayout(presetKey)}
                      className={`min-w-[232px] sm:min-w-[255px] lg:min-w-0 shrink-0 snap-start flex flex-col justify-between p-3 sm:p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-teal-950/65 border-teal-400/70'
                          : 'bg-[#070d0f] border-white/10 hover:border-teal-400/45 hover:bg-white/5'
                      }`}
                    >
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-stone-100">
                          {preset.title}
                        </p>
                        <p className="text-[11px] sm:text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                          {preset.subtitle}
                        </p>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-white/8 flex items-center justify-between text-[11px] text-teal-300 font-medium">
                        <span>{preset.props.length} chi tiết</span>
                        <span>{isCurrent ? 'Đang dùng' : 'Áp dụng →'}</span>
                      </div>
                    </button>
                  );
                })}

                {/* 4th Card: Empty Tank Scratch Builder */}
                <button
                  type="button"
                  onClick={onStartEmptyDIY}
                  className={`min-w-[232px] sm:min-w-[255px] lg:min-w-0 shrink-0 snap-start flex flex-col justify-between p-3 sm:p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    activePresetId === 'custom_empty'
                      ? 'bg-amber-950/50 border-amber-400/70'
                      : 'bg-[#070d0f] border-dashed border-teal-400/45 hover:bg-teal-950/35'
                  }`}
                >
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-teal-200">
                      Tự Build Từ Bể Trống
                    </p>
                    <p className="text-[11px] sm:text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                      Làm trống hồ, bật lưới tỷ lệ vàng 3D để tự chọn nền cát, đặt từng tảng đá, lũa & cây.
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-white/8 flex items-center justify-between text-[11px] text-amber-300 font-medium">
                    <span>Chế độ DIY</span>
                    <span>Bắt đầu →</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 2: TỰ BUILD BỂ THỦY SINH (CUSTOM 3D AQUASCAPE STUDIO)
             ===================================================================== */}
          {activeTab === 'builder' && (
            <div className="space-y-2.5">
              {/* Row A: Substrate + Category Filter + Clear Tank */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-xs text-stone-400 mr-0.5 whitespace-nowrap shrink-0">
                    Nền:
                  </span>
                  {SUBSTRATE_OPTIONS.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => onChangeSubstrate(sub.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        state.substrate === sub.id
                          ? 'bg-teal-950/80 border-teal-400/60 text-teal-200'
                          : 'bg-[#070d0f] border-white/10 text-stone-300 hover:border-white/25'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {(
                    [
                      { id: 'all', label: 'Tất cả' },
                      { id: 'hardscape', label: 'Đá & Lũa' },
                      { id: 'plant', label: 'Cây' },
                      { id: 'botanical', label: 'Lá & Bèo' },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPropFilter(cat.id)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        propFilter === cat.id
                          ? 'bg-white/15 text-stone-100 font-medium'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={onClearAllProps}
                    className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-rose-500/15 hover:bg-rose-500/30 text-rose-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>Dọn bể</span>
                  </button>
                </div>
              </div>

              {/* Row B: Hardscape & Plant Palette */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                {filteredProps.map((item) => {
                  const isBrushActive = placingPropType === item.type;
                  return (
                    <div
                      key={item.type}
                      className={`inline-flex items-center rounded-lg border transition-colors shrink-0 ${
                        isBrushActive
                          ? 'bg-teal-950/90 border-teal-400 text-teal-100'
                          : 'bg-[#070d0f] border-white/10 text-stone-200 hover:border-white/25'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onSelectPlacingPropType(isBrushActive ? null : item.type)
                        }
                        title="Bấm để chọn rồi chạm vào mặt cát trong bể nơi muốn đặt"
                        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-medium whitespace-nowrap cursor-pointer"
                      >
                        <MousePointerClick
                          className={`w-3.5 h-3.5 ${
                            isBrushActive ? 'text-teal-300' : 'text-stone-400'
                          }`}
                        />
                        <span>{item.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddPropCenter(item.type)}
                        title="Thả nhanh vào giữa bể"
                        className="px-2 py-1.5 sm:py-2 border-l border-white/10 hover:bg-white/10 text-teal-300 rounded-r-lg cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Row C: Active Placement Guidance OR Selected 3D Prop Transform Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs">
                {placingSpec ? (
                  <>
                    <span className="text-teal-300 font-medium leading-snug">
                      Đang cầm [{placingSpec.name}]: Chạm vào mặt nền cát trong bể để đặt!
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectPlacingPropType(null)}
                      className="self-start sm:self-auto px-3 py-1.5 rounded-md bg-amber-400/20 border border-amber-400/50 text-amber-200 font-medium whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Xong / Kéo chỉnh vị trí
                    </button>
                  </>
                ) : selectedProp && selectedPropSpec ? (
                  <>
                    <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0">
                      <span className="text-teal-300 font-medium truncate">
                        Đang chọn: {selectedPropSpec.name}
                      </span>
                      <div className="hidden md:flex items-center gap-2 shrink-0">
                        <span className="text-stone-400 whitespace-nowrap">Xoay:</span>
                        <input
                          type="range"
                          min={0}
                          max={6.28}
                          step={0.05}
                          value={((selectedProp.rotationY % 6.283) + 6.283) % 6.283}
                          onChange={(e) =>
                            onRotateSelectedProp(parseFloat(e.target.value))
                          }
                          className="w-24 zen-slider"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      <button
                        type="button"
                        onClick={() => onRotateSelectedProp()}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-stone-100 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Xoay 45°</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onScaleSelectedProp(-0.1)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-stone-100 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                        <span>Nhỏ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onScaleSelectedProp(0.1)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-stone-100 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>To</span>
                      </button>
                      <button
                        type="button"
                        onClick={onDuplicateSelectedProp}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-stone-100 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <CopyPlus className="w-3.5 h-3.5 text-teal-300" />
                        <span>Nhân đôi</span>
                      </button>
                      <button
                        type="button"
                        onClick={onDeleteSelectedProp}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="text-stone-300 leading-snug">
                    Chọn đá/lũa/cây ở trên để đặt vào nền cát, hoặc chạm trực tiếp vào vật thể trong bể để kéo đổi chỗ.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 3: CHỌN ĐÀN CÁ & TÉP CẢNH (BETTA, GUPPY & DWARF SHRIMP)
             ===================================================================== */}
          {activeTab === 'fish' && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {(
                    [
                      { id: 'all', label: 'Tất cả' },
                      { id: 'shrimp', label: 'Tép Cảnh' },
                      { id: 'betta', label: 'Cá Betta' },
                      { id: 'guppy', label: 'Cá Guppy' },
                    ] as const
                  ).map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => setSpeciesFilter(sp.id)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        speciesFilter === sp.id
                          ? 'bg-teal-400/20 border border-teal-400/50 text-teal-200 font-medium'
                          : 'bg-[#070d0f] border border-white/8 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar">
                  <span className="font-mono-num text-stone-400 whitespace-nowrap">
                    {state.fishes.length}/24 cá & tép
                  </span>
                  {bettaCount > 1 && (
                    <span className="hidden md:inline text-amber-300 whitespace-nowrap">
                      · Betta trống nên nuôi 1 chú/hồ
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={onOpenGlbModal}
                    className="text-teal-300 hover:text-teal-200 underline underline-offset-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Nạp file .GLB riêng →
                  </button>
                </div>
              </div>

              {/* 2-row horizontal swipe grid on phones; 3/4-col grid on tablet/PC */}
              <div className="grid grid-rows-2 grid-flow-col auto-cols-[185px] sm:grid-rows-none sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-3 lg:grid-cols-4 gap-2 overflow-x-auto sm:overflow-visible no-scrollbar pb-0.5">
                {filteredCatalog.map((fish) => {
                  const countInTank = state.fishes.filter((f) => f.morph === fish.id).length;
                  return (
                    <button
                      key={fish.id}
                      type="button"
                      disabled={state.fishes.length >= 24}
                      onClick={() => onAddFish(fish.id)}
                      className="group flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#070d0f] hover:bg-white/8 border border-white/10 text-left transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: fish.secondaryHex }}
                          />
                          <p className="text-xs font-semibold text-stone-100 truncate">
                            {fish.name}
                          </p>
                        </div>
                        <p className="text-[11px] text-stone-400 truncate mt-0.5">
                          {fish.subtitle} · Có {countInTank}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-teal-400 shrink-0 opacity-80 group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>

              {state.fishes.length > 0 && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0">
                    <span className="text-xs text-stone-400 whitespace-nowrap shrink-0">
                      Trong hồ (chạm để vớt):
                    </span>
                    {state.fishes.map((f) => {
                      const spec = FISH_CATALOG.find((c) => c.id === f.morph);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => onRemoveFish(f.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#070d0f] hover:bg-rose-950/60 border border-white/10 hover:border-rose-400/50 rounded-md text-stone-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: spec?.secondaryHex || '#2dd4bf' }}
                          />
                          <span>
                            {spec?.name
                              .replace('Betta ', '')
                              .replace('Guppy ', '')
                              .replace('Tép ', '')}
                          </span>
                          <span className="text-stone-500">×</span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={onClearAllFishes}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-rose-500/15 hover:bg-rose-500/30 text-rose-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Vớt hết</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              TAB 4: CHĂM SÓC HỒ CÁ (CHO ĂN, THAY NƯỚC, KÈ GƯƠNG, LAU KÍNH)
             ===================================================================== */}
          {activeTab === 'care' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center">
              <div className="md:col-span-5 lg:col-span-6 space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs text-stone-400">
                  <span className="whitespace-nowrap">Loại thức ăn</span>
                  <span className="text-stone-500 truncate">
                    {FOOD_OPTIONS.find((f) => f.id === state.selectedFood)?.desc}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {FOOD_OPTIONS.map((food) => (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => onSelectFood(food.id)}
                      className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        state.selectedFood === food.id
                          ? 'bg-teal-950/80 border-teal-400/60 text-teal-200'
                          : 'bg-[#070d0f] border-white/10 text-stone-300 hover:border-white/25'
                      }`}
                    >
                      {food.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-7 lg:col-span-6 flex items-center md:flex-wrap md:justify-end gap-1.5 sm:gap-2 overflow-x-auto md:overflow-visible no-scrollbar pb-0.5">
                <button
                  type="button"
                  onClick={onFeedNow}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold bg-teal-400 hover:bg-teal-300 text-stone-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Rắc thức ăn
                </button>

                <button
                  type="button"
                  onClick={onToggleClickFeed}
                  className={`px-3 py-2 sm:py-2.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    clickFeedMode
                      ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                      : 'bg-[#070d0f] border-white/10 text-stone-300 hover:border-white/25'
                  }`}
                >
                  {clickFeedMode ? 'Đang bật chạm thả mồi' : 'Chạm mặt nước thả mồi'}
                </button>

                <button
                  type="button"
                  onClick={onWaterChange}
                  disabled={waterChanging}
                  className="inline-flex items-center gap-1.5 px-3 py-2 sm:py-2.5 text-xs font-medium bg-[#070d0f] hover:bg-white/10 border border-white/10 rounded-lg text-stone-200 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Droplets className="w-3.5 h-3.5 text-sky-400" />
                  <span>{waterChanging ? 'Đang châm nước...' : 'Thay 30% nước'}</span>
                </button>

                <button
                  type="button"
                  onClick={onCleanGlass}
                  className="inline-flex items-center gap-1.5 px-3 py-2 sm:py-2.5 text-xs font-medium bg-[#070d0f] hover:bg-white/10 border border-white/10 rounded-lg text-stone-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                  <span>Lau kính</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleMirror}
                  className={`px-3 py-2 sm:py-2.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    state.mirrorActive
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-[#070d0f] border-white/10 text-stone-300 hover:border-white/25'
                  }`}
                >
                  {state.mirrorActive ? 'Cất gương kè' : 'Kè gương Betta'}
                </button>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 5: ÁNH SÁNG ĐÈN, ÂM THANH ASMR & ĐỒNG HỒ POMODORO
             ===================================================================== */}
          {activeTab === 'ambience' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-center">
              <div className="lg:col-span-5 space-y-1.5">
                <span className="block text-xs text-stone-400">Chế độ đèn thủy sinh</span>
                <div className="flex items-center lg:flex-wrap gap-1.5 overflow-x-auto lg:overflow-visible no-scrollbar pb-0.5">
                  {LIGHTING_OPTIONS.map((light) => (
                    <button
                      key={light.id}
                      type="button"
                      onClick={() => onChangeLighting(light.id)}
                      className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        state.lighting === light.id
                          ? 'bg-teal-950/80 border-teal-400/60 text-teal-200'
                          : 'bg-[#070d0f] border-white/10 text-stone-300 hover:border-white/25'
                      }`}
                    >
                      {light.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4 grid grid-cols-3 gap-2.5 sm:gap-3">
                <div className="min-w-0">
                  <label className="block text-[11px] text-stone-400 mb-1.5 truncate">
                    Thác {Math.round(audioMix.streamVolume * 100)}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={audioMix.streamVolume}
                    onChange={(e) =>
                      onChangeAudioMix({
                        ...audioMix,
                        muted: false,
                        streamVolume: parseFloat(e.target.value),
                      })
                    }
                    className="w-full zen-slider"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[11px] text-stone-400 mb-1.5 truncate">
                    Sủi {Math.round(audioMix.bubblesVolume * 100)}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={audioMix.bubblesVolume}
                    onChange={(e) =>
                      onChangeAudioMix({
                        ...audioMix,
                        muted: false,
                        bubblesVolume: parseFloat(e.target.value),
                      })
                    }
                    className="w-full zen-slider"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[11px] text-stone-400 mb-1.5 truncate">
                    Mưa {Math.round(audioMix.rainVolume * 100)}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={audioMix.rainVolume}
                    onChange={(e) =>
                      onChangeAudioMix({
                        ...audioMix,
                        muted: false,
                        rainVolume: parseFloat(e.target.value),
                      })
                    }
                    className="w-full zen-slider"
                  />
                </div>
              </div>

              <div className="lg:col-span-3 flex items-center justify-between lg:justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10">
                <div className="text-left lg:text-right mr-1">
                  <span className="block text-[11px] text-stone-400">Hẹn giờ tập trung</span>
                  <span className="text-sm font-semibold font-mono-num text-stone-100">
                    {formatTimer(pomodoroSeconds)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onTogglePomodoro}
                    className="inline-flex items-center gap-1 px-3 py-1.5 sm:py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-stone-100 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {pomodoroRunning ? (
                      <>
                        <Pause className="w-3.5 h-3.5 text-amber-300" />
                        <span>Dừng</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-teal-300" />
                        <span>Chạy</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onResetPomodoro}
                    title="Đặt lại 25 phút"
                    className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-stone-300 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
