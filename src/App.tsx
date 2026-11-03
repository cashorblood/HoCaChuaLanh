/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { BottomDock } from './components/BottomDock';
import { GlbModelModal } from './components/GlbModelModal';
import { ShareModal } from './components/ShareModal';
import { DockTab, TopBar } from './components/TopBar';
import { AquariumSceneManager } from './three/AquariumSceneManager';
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
  SubstrateType,
} from './types/aquarium';
import { zenAudio } from './utils/audioEngine';

const STORAGE_KEY = 'ho_thuy_sinh_chua_lanh_v1';

function parseSharedTankFromHash(): AquariumState | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  if (!hash.startsWith('#tank=')) return null;
  const raw = hash.slice(6).trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(atob(raw))) as AquariumState;
    if (parsed && Array.isArray(parsed.fishes) && Array.isArray(parsed.props)) {
      return { ...parsed, mirrorActive: false };
    }
  } catch {
    // Ignore malformed hash
  }
  return null;
}

function buildInitialState(): AquariumState {
  if (typeof window !== 'undefined') {
    const sharedFromUrl = parseSharedTankFromHash();
    if (sharedFromUrl) {
      return sharedFromUrl;
    }

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AquariumState;
        if (parsed && Array.isArray(parsed.fishes) && Array.isArray(parsed.props)) {
          return { ...parsed, mirrorActive: false };
        }
      }
    } catch {
      // Fall back to curated Nature Forest aquascape
    }
  }

  const preset = PRESET_LAYOUTS.nature_forest;
  return {
    tankTitle: 'Hồ Thủy Sinh Chữa Lành',
    substrate: preset.substrate,
    lighting: preset.lighting,
    waterClarity: 96,
    temperature: 26.5,
    filterActive: true,
    airStoneActive: true,
    selectedFood: 'pellets',
    mirrorActive: false,
    fishes: preset.recommendedFishes.map((f) => ({ ...f })),
    props: preset.props.map((p) => ({ ...p })),
  };
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneManagerRef = useRef<AquariumSceneManager | null>(null);

  const [state, setState] = useState<AquariumState>(buildInitialState);
  const stateRef = useRef<AquariumState>(state);
  stateRef.current = state;

  // Start right on 'presets' so user immediately sees Preset Layouts & DIY Tank Builder!
  const [activeTab, setActiveTab] = useState<DockTab>('presets');
  const [activePresetId, setActivePresetId] = useState<PresetLayoutId | 'custom_empty'>('nature_forest');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [activeCamera, setActiveCamera] = useState<CameraPreset>('front');
  const [clickFeedMode, setClickFeedMode] = useState(false);
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [placingPropType, setPlacingPropType] = useState<AquascapePropType | null>(null);
  const [waterChanging, setWaterChanging] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [glbModalOpen, setGlbModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [audioMix, setAudioMix] = useState<AudioMixState>({
    muted: true,
    streamVolume: 0.45,
    bubblesVolume: 0.35,
    rainVolume: 0.0,
  });

  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 2800);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#tank=')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setToastMessage(
        'Đang xem bể được chia sẻ! Bạn có thể chỉnh sửa tiếp hoặc chọn "Tự Build Từ Bể Trống" để tạo hồ riêng.'
      );
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  // Initialize isolated Three.js WebGL scene once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const manager = new AquariumSceneManager(container, stateRef.current, {
      onSelectProp: (propId) => {
        setSelectedPropId(propId);
      },
      onMoveProp: (propId, x, z) => {
        setState((prev) => ({
          ...prev,
          props: prev.props.map((p) => (p.id === propId ? { ...p, x, z } : p)),
        }));
      },
      onPlaceNewPropAt: (type, x, z) => {
        const newId = `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setState((prev) => ({
          ...prev,
          props: [
            ...prev.props,
            {
              id: newId,
              type,
              x,
              z,
              rotationY: Number((Math.random() * Math.PI * 2).toFixed(2)),
              scale: 1.0,
            },
          ],
        }));
        setSelectedPropId(newId);
        zenAudio.playGlassTap();
      },
      onGlassTap: () => {
        zenAudio.playGlassTap();
      },
      onFoodDroppedByClick: () => {
        zenAudio.playFoodDrop();
        setState((prev) => ({
          ...prev,
          waterClarity: Math.max(40, Number((prev.waterClarity - 0.6).toFixed(1))),
        }));
      },
    });

    sceneManagerRef.current = manager;

    return () => {
      manager.dispose();
      sceneManagerRef.current = null;
      zenAudio.dispose();
    };
  }, []);

  useEffect(() => {
    sceneManagerRef.current?.syncState(state, false);
  }, [state]);

  useEffect(() => {
    const inBuilder = activeTab === 'builder';
    sceneManagerRef.current?.setDesignMode(inBuilder);
    if (!inBuilder) {
      setSelectedPropId(null);
      setPlacingPropType(null);
      sceneManagerRef.current?.setSelectedProp(null, stateRef.current.props);
    }
  }, [activeTab]);

  useEffect(() => {
    sceneManagerRef.current?.setPlacingPropType(placingPropType);
  }, [placingPropType]);

  useEffect(() => {
    sceneManagerRef.current?.setSelectedProp(selectedPropId, stateRef.current.props);
  }, [selectedPropId]);

  useEffect(() => {
    sceneManagerRef.current?.setClickFeedMode(clickFeedMode && activeTab !== 'builder');
  }, [clickFeedMode, activeTab]);

  useEffect(() => {
    sceneManagerRef.current?.setDockCollapsed(dockCollapsed);
  }, [dockCollapsed]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setState((prev) => {
        const drop = prev.filterActive ? 0.25 : 0.6;
        const nextClarity = Math.max(42, Number((prev.waterClarity - drop).toFixed(1)));
        return nextClarity === prev.waterClarity ? prev : { ...prev, waterClarity: nextClarity };
      });
    }, 25000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!state.mirrorActive) return;
    const t = window.setTimeout(() => {
      setState((prev) => ({ ...prev, mirrorActive: false }));
      showToast('Đã cất gương để cá Betta nghỉ ngơi');
    }, 14000);
    return () => window.clearTimeout(t);
  }, [state.mirrorActive, showToast]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape' && placingPropType) {
        setPlacingPropType(null);
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [placingPropType]);

  useEffect(() => {
    if (!pomodoroRunning) return;
    const timer = window.setInterval(() => {
      setPomodoroSeconds((prev) => {
        if (prev <= 1) {
          setPomodoroRunning(false);
          zenAudio.playGlassTap();
          showToast('Đã hoàn thành 25 phút tập trung! Hãy ngắm cá thư giãn đôi mắt nhé.');
          return 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pomodoroRunning, showToast]);

  const handleSelectTab = (tab: DockTab) => {
    setDockCollapsed(false);
    setActiveTab(tab);
    if (tab === 'builder' && activeCamera === 'front') {
      // Gently angle camera slightly higher so substrate placement grid is easy to see & click
      setActiveCamera('angle');
      sceneManagerRef.current?.setCameraPreset('angle');
    }
  };

  const handleSelectCamera = (preset: CameraPreset) => {
    setActiveCamera(preset);
    sceneManagerRef.current?.setCameraPreset(preset);
  };

  const handleFeedNow = () => {
    sceneManagerRef.current?.dropFood(state.selectedFood);
    zenAudio.playFoodDrop();
    setState((prev) => ({
      ...prev,
      waterClarity: Math.max(40, Number((prev.waterClarity - 0.8).toFixed(1))),
    }));
  };

  const handleSelectFood = (food: FoodType) => {
    setState((prev) => ({ ...prev, selectedFood: food }));
  };

  const handleWaterChange = () => {
    if (waterChanging) return;
    setWaterChanging(true);
    sceneManagerRef.current?.triggerWaterChange();
    zenAudio.playWaterRefill();
    showToast('Đang thay 30% nước mới mát lành — cây bắt đầu sủi tăm oxy');

    window.setTimeout(() => {
      setState((prev) => ({
        ...prev,
        waterClarity: 100,
        temperature: 26.2,
      }));
      setWaterChanging(false);
    }, 2400);
  };

  const handleCleanGlass = () => {
    zenAudio.playGlassTap();
    setState((prev) => ({
      ...prev,
      waterClarity: Math.min(100, Number((prev.waterClarity + 8).toFixed(1))),
    }));
    showToast('Mặt kính đã được lau sáng trong');
  };

  const handleToggleMirror = () => {
    const hasBetta = state.fishes.some((f) => f.species === 'betta');
    if (!hasBetta && !state.mirrorActive) {
      showToast('Hãy thả ít nhất 1 chú cá Betta để xem cá xòe vây kè gương nhé!');
    }
    setState((prev) => ({ ...prev, mirrorActive: !prev.mirrorActive }));
  };

  const handleAddFish = (morph: FishMorphId) => {
    const spec = FISH_CATALOG.find((c) => c.id === morph);
    if (!spec || state.fishes.length >= 24) return;
    const newFish = {
      id: `fish-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      morph,
      species: spec.species,
      customName: spec.name,
      scale: 0.92 + Math.random() * 0.18,
    };
    setState((prev) => ({
      ...prev,
      fishes: [...prev.fishes, newFish],
    }));
    zenAudio.playFoodDrop();
  };

  const handleRemoveFish = (id: string) => {
    setState((prev) => ({
      ...prev,
      fishes: prev.fishes.filter((f) => f.id !== id),
    }));
  };

  const handleClearAllFishes = () => {
    setState((prev) => ({ ...prev, fishes: [] }));
    showToast('Đã vớt toàn bộ cá & tép ra khỏi hồ');
  };

  const handleCreateFreshTank = () => {
    setActivePresetId('custom_empty');
    setSelectedPropId(null);
    setPlacingPropType('seiryu_rock_large');
    setState((prev) => ({
      ...prev,
      substrate: 'river_sand',
      lighting: 'wrgb_vivid',
      waterClarity: 100,
      fishes: [],
      props: [],
      mirrorActive: false,
    }));
    setActiveTab('builder');
    setDockCollapsed(false);
    setActiveCamera('angle');
    sceneManagerRef.current?.setCameraPreset('angle');
    showToast('Đã tạo một bể mới hoàn toàn trống! Hãy chọn nền, xếp đá lũa và thả cá/tép theo ý bạn.');
  };

  const handleApplyPresetLayout = (presetId: PresetLayoutId) => {
    const preset = PRESET_LAYOUTS[presetId];
    setActivePresetId(presetId);
    setSelectedPropId(null);
    setPlacingPropType(null);
    setState((prev) => ({
      ...prev,
      substrate: preset.substrate,
      lighting: preset.lighting,
      waterClarity: 98,
      fishes: preset.recommendedFishes.map((f) => ({
        ...f,
        id: `${f.id}-${Date.now().toString(36)}`,
      })),
      props: preset.props.map((p) => ({
        ...p,
        id: `${p.id}-${Date.now().toString(36)}`,
      })),
    }));
    setActiveCamera('front');
    sceneManagerRef.current?.setCameraPreset('front');
    showToast(`Đã áp dụng bố cục mẫu: ${preset.title}`);
  };

  const handleStartEmptyDIY = () => {
    setActivePresetId('custom_empty');
    setSelectedPropId(null);
    setPlacingPropType('seiryu_rock_large');
    setState((prev) => ({
      ...prev,
      substrate: 'river_sand',
      lighting: 'morning_sun',
      waterClarity: 100,
      props: [],
    }));
    setActiveTab('builder');
    setActiveCamera('angle');
    sceneManagerRef.current?.setCameraPreset('angle');
    showToast('Đã dọn trống bể! Hãy bấm lên nền cát để đặt viên đá đầu tiên.');
  };

  const handleChangeSubstrate = (substrate: SubstrateType) => {
    setState((prev) => ({ ...prev, substrate }));
  };

  const handleAddPropCenter = (type: AquascapePropType) => {
    setPlacingPropType(null);
    const newId = `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const x = Number(((Math.random() - 0.5) * 1.6).toFixed(2));
    const z = Number(((Math.random() - 0.5) * 0.85).toFixed(2));
    setState((prev) => ({
      ...prev,
      props: [
        ...prev.props,
        {
          id: newId,
          type,
          x,
          z,
          rotationY: Number((Math.random() * Math.PI).toFixed(2)),
          scale: 1.0,
        },
      ],
    }));
    setSelectedPropId(newId);
    zenAudio.playGlassTap();
  };

  const handleClearAllProps = () => {
    setSelectedPropId(null);
    setPlacingPropType(null);
    setActivePresetId('custom_empty');
    setState((prev) => ({ ...prev, props: [] }));
    showToast('Đã làm trống toàn bộ đá, lũa và cây trong bể');
  };

  const handleRotateSelectedProp = (exactRadians?: number) => {
    if (!selectedPropId) return;
    setState((prev) => ({
      ...prev,
      props: prev.props.map((p) =>
        p.id === selectedPropId
          ? {
              ...p,
              rotationY:
                exactRadians !== undefined
                  ? Number(exactRadians.toFixed(3))
                  : Number((p.rotationY + Math.PI * 0.25).toFixed(3)),
            }
          : p
      ),
    }));
  };

  const handleScaleSelectedProp = (delta: number) => {
    if (!selectedPropId) return;
    setState((prev) => ({
      ...prev,
      props: prev.props.map((p) =>
        p.id === selectedPropId
          ? {
              ...p,
              scale: Number(Math.min(1.6, Math.max(0.55, p.scale + delta)).toFixed(2)),
            }
          : p
      ),
    }));
  };

  const handleDuplicateSelectedProp = () => {
    if (!selectedPropId) return;
    const orig = state.props.find((p) => p.id === selectedPropId);
    if (!orig) return;
    const newId = `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nx = Number(Math.min(2.0, Math.max(-2.0, orig.x + 0.32)).toFixed(2));
    const nz = Number(Math.min(0.95, Math.max(-0.95, orig.z + 0.18)).toFixed(2));
    setState((prev) => ({
      ...prev,
      props: [
        ...prev.props,
        {
          ...orig,
          id: newId,
          x: nx,
          z: nz,
          rotationY: Number((orig.rotationY + 0.5).toFixed(2)),
        },
      ],
    }));
    setSelectedPropId(newId);
  };

  const handleDeleteSelectedProp = () => {
    if (!selectedPropId) return;
    const targetId = selectedPropId;
    setSelectedPropId(null);
    setState((prev) => ({
      ...prev,
      props: prev.props.filter((p) => p.id !== targetId),
    }));
  };

  const handleChangeLighting = (lighting: LightingPreset) => {
    setState((prev) => ({ ...prev, lighting }));
  };

  const handleChangeAudioMix = (nextMix: AudioMixState) => {
    setAudioMix(nextMix);
    zenAudio.updateMix(nextMix);
  };

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#0b1214] select-none">
      {/* Isolated Three.js 3D Viewport Container */}
      <div
        ref={canvasMountRef}
        className={`absolute inset-0 w-full h-full ${
          placingPropType || clickFeedMode
            ? 'cursor-crosshair'
            : activeTab === 'builder'
              ? 'cursor-move'
              : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Top Navigation Bar (Strict 3-Zone Contract with Workflow Links) */}
      <TopBar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenShare={() => setShareOpen(true)}
        zenHidden={dockCollapsed}
      />

      {/* Quiet Non-Intrusive Feedback Toast */}
      {toastMessage && (
        <div
          role="status"
          className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-30 max-w-[92vw] px-3.5 sm:px-4 py-2 rounded-lg bg-[#0d1619]/95 border border-white/12 text-xs font-medium text-teal-200 text-center leading-snug shadow-lg pointer-events-none"
        >
          {toastMessage}
        </div>
      )}

      {/* Unified Collapsible Bottom Studio Dock */}
      <BottomDock
        state={state}
        activePresetId={activePresetId}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        collapsed={dockCollapsed}
        onToggleCollapse={() => setDockCollapsed((prev) => !prev)}
        clickFeedMode={clickFeedMode}
        onToggleClickFeed={() => setClickFeedMode((prev) => !prev)}
        onFeedNow={handleFeedNow}
        onSelectFood={handleSelectFood}
        onWaterChange={handleWaterChange}
        waterChanging={waterChanging}
        onCleanGlass={handleCleanGlass}
        onToggleMirror={handleToggleMirror}
        onAddFish={handleAddFish}
        onRemoveFish={handleRemoveFish}
        onClearAllFishes={handleClearAllFishes}
        onApplyPresetLayout={handleApplyPresetLayout}
        onStartEmptyDIY={handleStartEmptyDIY}
        onChangeSubstrate={handleChangeSubstrate}
        placingPropType={placingPropType}
        onSelectPlacingPropType={(type) => {
          setPlacingPropType(type);
          if (type) setSelectedPropId(null);
        }}
        onAddPropCenter={handleAddPropCenter}
        onClearAllProps={handleClearAllProps}
        selectedPropId={selectedPropId}
        onRotateSelectedProp={handleRotateSelectedProp}
        onScaleSelectedProp={handleScaleSelectedProp}
        onDuplicateSelectedProp={handleDuplicateSelectedProp}
        onDeleteSelectedProp={handleDeleteSelectedProp}
        onChangeLighting={handleChangeLighting}
        audioMix={audioMix}
        onChangeAudioMix={handleChangeAudioMix}
        pomodoroSeconds={pomodoroSeconds}
        pomodoroRunning={pomodoroRunning}
        onTogglePomodoro={() => setPomodoroRunning((prev) => !prev)}
        onResetPomodoro={() => {
          setPomodoroRunning(false);
          setPomodoroSeconds(25 * 60);
        }}
        activeCamera={activeCamera}
        onSelectCamera={handleSelectCamera}
        onOpenGlbModal={() => setGlbModalOpen(true)}
      />

      {/* Custom 3D .GLB Model Loader & GitHub Manifest Guide Modal */}
      <GlbModelModal
        open={glbModalOpen}
        onClose={() => setGlbModalOpen(false)}
        onNotify={showToast}
      />

      {/* Share & Snapshot Modal */}
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        state={state}
        onImportState={(imported) => {
          setSelectedPropId(null);
          setPlacingPropType(null);
          setState({ ...imported, mirrorActive: false });
          showToast('Đã nạp thành công hồ thủy sinh được chia sẻ!');
        }}
        onCreateFreshTank={handleCreateFreshTank}
        onCaptureSnapshot={() => sceneManagerRef.current?.captureSnapshot() || null}
      />
    </main>
  );
}
