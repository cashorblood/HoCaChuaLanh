export type FishSpecies = 'betta' | 'guppy' | 'shrimp';

export type BettaMorph =
  | 'betta_halfmoon_red'
  | 'betta_koi_galaxy'
  | 'betta_dumbo_lavender'
  | 'betta_mustard_gas';

export type GuppyMorph =
  | 'guppy_full_gold'
  | 'guppy_blue_topaz'
  | 'guppy_koi_redear'
  | 'guppy_dumbo_mosaic';

export type ShrimpMorph =
  | 'shrimp_red_cherry'
  | 'shrimp_crystal_red'
  | 'shrimp_blue_dream'
  | 'shrimp_yellow_golden';

export type FishMorphId = BettaMorph | GuppyMorph | ShrimpMorph;

export interface FishCatalogItem {
  id: FishMorphId;
  species: FishSpecies;
  name: string;
  subtitle: string;
  bodyHex: string;
  secondaryHex: string;
  finHex: string;
  accentHex: string;
  pattern: 'solid' | 'koi' | 'gradient' | 'mosaic' | 'shrimp_band' | 'shrimp_stripe';
}

export interface FishInstanceData {
  id: string;
  morph: FishMorphId;
  species: FishSpecies;
  customName: string;
  scale: number;
}

export type SubstrateType = 'river_sand' | 'aqua_soil' | 'golden_pebbles';

export type LightingPreset =
  | 'morning_sun'
  | 'wrgb_vivid'
  | 'golden_dusk'
  | 'moonlight'
  | 'blackwater_amber';

export type CameraPreset = 'front' | 'angle' | 'top' | 'closeup';

export type FoodType = 'pellets' | 'bloodworms' | 'artemia';

export type AquascapePropType =
  | 'seiryu_rock_large'
  | 'seiryu_rock_cluster'
  | 'bonsai_driftwood'
  | 'branch_twig'
  | 'java_fern'
  | 'vallisneria_tall'
  | 'anubias_nana'
  | 'hairgrass_patch'
  | 'catappa_leaf'
  | 'floating_frogbit';

export interface PropCatalogItem {
  type: AquascapePropType;
  name: string;
  category: 'hardscape' | 'plant' | 'botanical';
  hint: string;
}

export interface PlacedProp {
  id: string;
  type: AquascapePropType;
  x: number; // Tank coordinates: -2.2 to +2.2
  z: number; // Tank coordinates: -1.05 to +1.05
  rotationY: number; // Radians
  scale: number; // 0.65 to 1.45
}

export type PresetLayoutId = 'iwagumi' | 'nature_forest' | 'blackwater_zen';

export interface AquariumState {
  tankTitle: string;
  substrate: SubstrateType;
  lighting: LightingPreset;
  waterClarity: number; // 35..100
  temperature: number; // e.g., 26.5
  filterActive: boolean;
  airStoneActive: boolean;
  selectedFood: FoodType;
  mirrorActive: boolean;
  fishes: FishInstanceData[];
  props: PlacedProp[];
}

export interface AudioMixState {
  muted: boolean;
  streamVolume: number; // 0..1
  bubblesVolume: number; // 0..1
  rainVolume: number; // 0..1
}

export const FISH_CATALOG: FishCatalogItem[] = [
  {
    id: 'betta_halfmoon_red',
    species: 'betta',
    name: 'Betta Halfmoon Super Red',
    subtitle: 'Đuôi bán nguyệt lụa đỏ thẫm',
    bodyHex: '#b91c1c',
    secondaryHex: '#ef4444',
    finHex: '#dc2626',
    accentHex: '#fca5a5',
    pattern: 'solid',
  },
  {
    id: 'betta_koi_galaxy',
    species: 'betta',
    name: 'Betta Koi Galaxy',
    subtitle: 'Đốm cẩm thạch cam đen ánh kim',
    bodyHex: '#f8fafc',
    secondaryHex: '#ea580c',
    finHex: '#fb923c',
    accentHex: '#38bdf8',
    pattern: 'koi',
  },
  {
    id: 'betta_dumbo_lavender',
    species: 'betta',
    name: 'Betta Dumbo Lavender',
    subtitle: 'Vây bơi tai voi sắc tím khói',
    bodyHex: '#6d28d9',
    secondaryHex: '#a78bfa',
    finHex: '#c4b5fd',
    accentHex: '#f5d0fe',
    pattern: 'gradient',
  },
  {
    id: 'betta_mustard_gas',
    species: 'betta',
    name: 'Betta Mustard Gas',
    subtitle: 'Thân xanh lam cổ vịt, vây vàng nghệ',
    bodyHex: '#0f766e',
    secondaryHex: '#1d4ed8',
    finHex: '#eab308',
    accentHex: '#fef08a',
    pattern: 'gradient',
  },
  {
    id: 'guppy_full_gold',
    species: 'guppy',
    name: 'Guppy Full Gold',
    subtitle: 'Vàng kim lấp lánh bơi theo đàn',
    bodyHex: '#eab308',
    secondaryHex: '#facc15',
    finHex: '#fde047',
    accentHex: '#fef9c3',
    pattern: 'solid',
  },
  {
    id: 'guppy_blue_topaz',
    species: 'guppy',
    name: 'Guppy Blue Topaz',
    subtitle: 'Xanh ngọc băng thanh thoát',
    bodyHex: '#0284c7',
    secondaryHex: '#38bdf8',
    finHex: '#7dd3fc',
    accentHex: '#e0f2fe',
    pattern: 'gradient',
  },
  {
    id: 'guppy_koi_redear',
    species: 'guppy',
    name: 'Guppy Koi Đỏ Đầu',
    subtitle: 'Thân trắng ngà, mũ & đuôi đỏ cam',
    bodyHex: '#f1f5f9',
    secondaryHex: '#ef4444',
    finHex: '#f97316',
    accentHex: '#fed7aa',
    pattern: 'koi',
  },
  {
    id: 'guppy_dumbo_mosaic',
    species: 'guppy',
    name: 'Guppy Dumbo Mosaic',
    subtitle: 'Đuôi hoa văn xanh cam rực rỡ',
    bodyHex: '#0369a1',
    secondaryHex: '#f97316',
    finHex: '#fb7185',
    accentHex: '#38bdf8',
    pattern: 'mosaic',
  },
  {
    id: 'shrimp_red_cherry',
    species: 'shrimp',
    name: 'Tép Đỏ Fire Red',
    subtitle: 'Đỏ ruby rực rỡ, chăm chỉ nhặt rêu nền',
    bodyHex: '#b91c1c',
    secondaryHex: '#ef4444',
    finHex: '#f87171',
    accentHex: '#fecaca',
    pattern: 'solid',
  },
  {
    id: 'shrimp_crystal_red',
    species: 'shrimp',
    name: 'Tép Ong Đỏ (Crystal Red)',
    subtitle: 'Khoang trắng sứ xen đỏ thẫm cao cấp',
    bodyHex: '#f8fafc',
    secondaryHex: '#dc2626',
    finHex: '#fca5a5',
    accentHex: '#ffffff',
    pattern: 'shrimp_band',
  },
  {
    id: 'shrimp_blue_dream',
    species: 'shrimp',
    name: 'Tép Xanh Blue Dream',
    subtitle: 'Vỏ xanh ngọc bích trong vắt nổi bật trên cát',
    bodyHex: '#1e40af',
    secondaryHex: '#2563eb',
    finHex: '#60a5fa',
    accentHex: '#bae6fd',
    pattern: 'gradient',
  },
  {
    id: 'shrimp_yellow_golden',
    species: 'shrimp',
    name: 'Tép Vàng Sọc Lưng',
    subtitle: 'Vàng chanh óng ánh điểm sọc lưng kim tuyến',
    bodyHex: '#ca8a04',
    secondaryHex: '#facc15',
    finHex: '#fde047',
    accentHex: '#fef9c3',
    pattern: 'shrimp_stripe',
  },
];

export const PROP_CATALOG: PropCatalogItem[] = [
  {
    type: 'seiryu_rock_large',
    name: 'Đá Seiryu Chủ (Oyaishi)',
    category: 'hardscape',
    hint: 'Đá vân trắng tạo điểm nhấn chính',
  },
  {
    type: 'seiryu_rock_cluster',
    name: 'Cụm Đá Seiryu Phụ',
    category: 'hardscape',
    hint: 'Đá chân tạo chiều sâu tự nhiên',
  },
  {
    type: 'bonsai_driftwood',
    name: 'Lũa Bonsai Rêu Java',
    category: 'hardscape',
    hint: 'Tán rêu xanh cho cá trú ẩn',
  },
  {
    type: 'branch_twig',
    name: 'Nhánh Lũa Rừng Mảnh',
    category: 'hardscape',
    hint: 'Nhánh gỗ tự nhiên phong cách suối',
  },
  {
    type: 'vallisneria_tall',
    name: 'Cây Hẹ Nước (Hậu cảnh)',
    category: 'plant',
    hint: 'Lá dài uốn theo dòng nước lọc',
  },
  {
    type: 'java_fern',
    name: 'Dương Xỉ Thủy Sinh',
    category: 'plant',
    hint: 'Bụi lá xanh mướt tầng trung cảnh',
  },
  {
    type: 'anubias_nana',
    name: 'Ráy Nana Petite',
    category: 'plant',
    hint: 'Lá tròn đậm đặt cạnh chân đá/lũa',
  },
  {
    type: 'hairgrass_patch',
    name: 'Thảm Ngưu Mao Chiên',
    category: 'plant',
    hint: 'Cỏ tiền cảnh xanh mướt sủi bọt khí',
  },
  {
    type: 'catappa_leaf',
    name: 'Lá Bàng Khô (Catappa)',
    category: 'botanical',
    hint: 'Tiết tannin dưỡng vây cá Betta',
  },
  {
    type: 'floating_frogbit',
    name: 'Bèo Nhật Thả Nổi',
    category: 'botanical',
    hint: 'Rễ dài rủ từ mặt nước dịu nắng',
  },
];

export const PRESET_LAYOUTS: Record<
  PresetLayoutId,
  {
    title: string;
    subtitle: string;
    substrate: SubstrateType;
    lighting: LightingPreset;
    recommendedFishes: FishInstanceData[];
    props: PlacedProp[];
  }
> = {
  nature_forest: {
    title: 'Rừng Lũa Nhiệt Đới',
    subtitle: 'Lũa bonsai phủ rêu, ráy & dương xỉ xanh mát',
    substrate: 'aqua_soil',
    lighting: 'wrgb_vivid',
    recommendedFishes: [
      {
        id: 'fish-betta-main',
        morph: 'betta_koi_galaxy',
        species: 'betta',
        customName: 'Koi Tinh Tú',
        scale: 1.05,
      },
      {
        id: 'fish-guppy-1',
        morph: 'guppy_blue_topaz',
        species: 'guppy',
        customName: 'Topaz 01',
        scale: 0.95,
      },
      {
        id: 'fish-guppy-2',
        morph: 'guppy_blue_topaz',
        species: 'guppy',
        customName: 'Topaz 02',
        scale: 0.9,
      },
      {
        id: 'fish-guppy-3',
        morph: 'guppy_blue_topaz',
        species: 'guppy',
        customName: 'Topaz 03',
        scale: 1.0,
      },
      {
        id: 'fish-guppy-4',
        morph: 'guppy_full_gold',
        species: 'guppy',
        customName: 'Hoàng Kim 01',
        scale: 0.92,
      },
      {
        id: 'fish-guppy-5',
        morph: 'guppy_full_gold',
        species: 'guppy',
        customName: 'Hoàng Kim 02',
        scale: 0.96,
      },
      {
        id: 'shrimp-nf-1',
        morph: 'shrimp_red_cherry',
        species: 'shrimp',
        customName: 'Fire Red 01',
        scale: 1.0,
      },
      {
        id: 'shrimp-nf-2',
        morph: 'shrimp_red_cherry',
        species: 'shrimp',
        customName: 'Fire Red 02',
        scale: 0.94,
      },
      {
        id: 'shrimp-nf-3',
        morph: 'shrimp_yellow_golden',
        species: 'shrimp',
        customName: 'Golden Back 01',
        scale: 0.98,
      },
    ],
    props: [
      { id: 'p-1', type: 'bonsai_driftwood', x: -0.75, z: -0.1, rotationY: 0.35, scale: 1.15 },
      { id: 'p-2', type: 'seiryu_rock_cluster', x: -0.25, z: 0.35, rotationY: 1.1, scale: 0.95 },
      { id: 'p-3', type: 'seiryu_rock_large', x: 1.15, z: -0.25, rotationY: -0.5, scale: 0.95 },
      { id: 'p-4', type: 'vallisneria_tall', x: -1.85, z: -0.72, rotationY: 0.2, scale: 1.1 },
      { id: 'p-5', type: 'vallisneria_tall', x: -1.35, z: -0.8, rotationY: 0.8, scale: 1.0 },
      { id: 'p-6', type: 'vallisneria_tall', x: 1.75, z: -0.75, rotationY: -0.4, scale: 1.05 },
      { id: 'p-7', type: 'java_fern', x: -0.95, z: -0.45, rotationY: 0.5, scale: 1.05 },
      { id: 'p-8', type: 'java_fern', x: 0.85, z: -0.55, rotationY: -0.6, scale: 0.95 },
      { id: 'p-9', type: 'anubias_nana', x: -0.45, z: 0.22, rotationY: 0.3, scale: 1.0 },
      { id: 'p-10', type: 'anubias_nana', x: 0.95, z: 0.18, rotationY: 2.1, scale: 0.95 },
      { id: 'p-11', type: 'hairgrass_patch', x: 0.25, z: 0.55, rotationY: 0.0, scale: 1.1 },
      { id: 'p-12', type: 'hairgrass_patch', x: -1.3, z: 0.5, rotationY: 0.6, scale: 1.0 },
      { id: 'p-13', type: 'floating_frogbit', x: -1.1, z: 0.1, rotationY: 0.4, scale: 1.0 },
      { id: 'p-14', type: 'floating_frogbit', x: 1.35, z: -0.15, rotationY: 1.7, scale: 0.9 },
    ],
  },
  iwagumi: {
    title: 'Iwagumi Tối Giản',
    subtitle: 'Bố cục đá Seiryu Nhật Bản & thảm cỏ xanh mướt',
    substrate: 'aqua_soil',
    lighting: 'morning_sun',
    recommendedFishes: [
      {
        id: 'iw-g1',
        morph: 'guppy_blue_topaz',
        species: 'guppy',
        customName: 'Lam Ngọc 01',
        scale: 1.0,
      },
      {
        id: 'iw-g2',
        morph: 'guppy_blue_topaz',
        species: 'guppy',
        customName: 'Lam Ngọc 02',
        scale: 0.92,
      },
      {
        id: 'iw-g3',
        morph: 'guppy_blue_topaz',
        species: 'guppy',
        customName: 'Lam Ngọc 03',
        scale: 0.96,
      },
      {
        id: 'iw-g4',
        morph: 'guppy_blue_topaz',
        species: 'guppy',
        customName: 'Lam Ngọc 04',
        scale: 0.88,
      },
      {
        id: 'iw-g5',
        morph: 'guppy_koi_redear',
        species: 'guppy',
        customName: 'Hồng Đầu 01',
        scale: 0.98,
      },
      {
        id: 'iw-g6',
        morph: 'guppy_koi_redear',
        species: 'guppy',
        customName: 'Hồng Đầu 02',
        scale: 0.94,
      },
      {
        id: 'iw-g7',
        morph: 'guppy_koi_redear',
        species: 'guppy',
        customName: 'Hồng Đầu 03',
        scale: 0.9,
      },
      {
        id: 'iw-shrimp-1',
        morph: 'shrimp_crystal_red',
        species: 'shrimp',
        customName: 'Tép Ong PRL 01',
        scale: 1.02,
      },
      {
        id: 'iw-shrimp-2',
        morph: 'shrimp_crystal_red',
        species: 'shrimp',
        customName: 'Tép Ong PRL 02',
        scale: 0.95,
      },
      {
        id: 'iw-shrimp-3',
        morph: 'shrimp_blue_dream',
        species: 'shrimp',
        customName: 'Blue Dream 01',
        scale: 0.98,
      },
    ],
    props: [
      { id: 'iw-1', type: 'seiryu_rock_large', x: -0.55, z: -0.15, rotationY: 0.42, scale: 1.32 },
      { id: 'iw-2', type: 'seiryu_rock_large', x: 0.85, z: -0.05, rotationY: -0.75, scale: 1.02 },
      { id: 'iw-3', type: 'seiryu_rock_cluster', x: -1.15, z: 0.25, rotationY: 1.2, scale: 0.95 },
      { id: 'iw-4', type: 'seiryu_rock_cluster', x: 0.25, z: 0.35, rotationY: 2.4, scale: 0.88 },
      { id: 'iw-5', type: 'seiryu_rock_cluster', x: 1.38, z: 0.3, rotationY: -1.3, scale: 0.82 },
      { id: 'iw-6', type: 'hairgrass_patch', x: -1.65, z: 0.45, rotationY: 0.1, scale: 1.25 },
      { id: 'iw-7', type: 'hairgrass_patch', x: -0.85, z: 0.62, rotationY: 0.7, scale: 1.2 },
      { id: 'iw-8', type: 'hairgrass_patch', x: -0.05, z: 0.65, rotationY: 1.4, scale: 1.25 },
      { id: 'iw-9', type: 'hairgrass_patch', x: 0.78, z: 0.6, rotationY: 0.3, scale: 1.2 },
      { id: 'iw-10', type: 'hairgrass_patch', x: 1.62, z: 0.48, rotationY: -0.5, scale: 1.2 },
      { id: 'iw-11', type: 'hairgrass_patch', x: -1.45, z: -0.55, rotationY: 0.9, scale: 1.15 },
      { id: 'iw-12', type: 'hairgrass_patch', x: 0.15, z: -0.58, rotationY: -0.3, scale: 1.2 },
      { id: 'iw-13', type: 'hairgrass_patch', x: 1.55, z: -0.52, rotationY: 1.1, scale: 1.15 },
    ],
  },
  blackwater_zen: {
    title: 'Blackwater Lá Bàng',
    subtitle: 'Nước trà hổ phách tự nhiên dưỡng cá Betta Halfmoon',
    substrate: 'river_sand',
    lighting: 'blackwater_amber',
    recommendedFishes: [
      {
        id: 'bw-betta',
        morph: 'betta_halfmoon_red',
        species: 'betta',
        customName: 'Hồng Liên',
        scale: 1.12,
      },
    ],
    props: [
      { id: 'bw-1', type: 'branch_twig', x: -0.85, z: -0.18, rotationY: 0.45, scale: 1.25 },
      { id: 'bw-2', type: 'branch_twig', x: 0.75, z: -0.22, rotationY: -0.85, scale: 1.15 },
      { id: 'bw-3', type: 'seiryu_rock_cluster', x: -0.3, z: 0.15, rotationY: 0.8, scale: 0.9 },
      { id: 'bw-4', type: 'catappa_leaf', x: -1.25, z: 0.48, rotationY: 0.5, scale: 1.15 },
      { id: 'bw-5', type: 'catappa_leaf', x: -0.15, z: 0.58, rotationY: 2.1, scale: 1.05 },
      { id: 'bw-6', type: 'catappa_leaf', x: 0.95, z: 0.42, rotationY: -0.9, scale: 1.2 },
      { id: 'bw-7', type: 'catappa_leaf', x: 1.48, z: 0.12, rotationY: 1.4, scale: 0.95 },
      { id: 'bw-8', type: 'anubias_nana', x: -0.68, z: -0.05, rotationY: 0.2, scale: 0.95 },
      { id: 'bw-9', type: 'java_fern', x: 1.25, z: -0.55, rotationY: -0.5, scale: 0.95 },
      { id: 'bw-10', type: 'floating_frogbit', x: -1.15, z: 0.15, rotationY: 0.3, scale: 1.15 },
      { id: 'bw-11', type: 'floating_frogbit', x: 0.15, z: -0.1, rotationY: 1.6, scale: 1.05 },
      { id: 'bw-12', type: 'floating_frogbit', x: 1.2, z: 0.2, rotationY: -0.6, scale: 1.1 },
    ],
  },
};
