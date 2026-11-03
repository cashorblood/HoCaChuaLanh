import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export type GlbSlotId = 'betta' | 'guppy' | 'rock' | 'driftwood' | 'plant';

export interface LoadedGlbEntry {
  slot: GlbSlotId;
  fileName: string;
  sceneTemplate: THREE.Group;
  animations: THREE.AnimationClip[];
}

const TARGET_DIMENSIONS: Record<GlbSlotId, { size: number; alignBottom: boolean }> = {
  betta: { size: 0.68, alignBottom: false },
  guppy: { size: 0.42, alignBottom: false },
  rock: { size: 0.92, alignBottom: true },
  driftwood: { size: 1.25, alignBottom: true },
  plant: { size: 0.95, alignBottom: true },
};

class GlbModelRegistry {
  private loader = new GLTFLoader();
  private entries = new Map<GlbSlotId, LoadedGlbEntry>();
  private listeners = new Set<() => void>();
  private manifestLoaded = false;

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public getEntry(slot: GlbSlotId): LoadedGlbEntry | undefined {
    return this.entries.get(slot);
  }

  public getAllLoadedSlots(): Partial<Record<GlbSlotId, string>> {
    const out: Partial<Record<GlbSlotId, string>> = {};
    this.entries.forEach((val, key) => {
      out[key] = val.fileName;
    });
    return out;
  }

  public async loadManifestOnce(): Promise<void> {
    if (this.manifestLoaded || typeof window === 'undefined') return;
    this.manifestLoaded = true;
    try {
      const res = await fetch('./models/manifest.json');
      if (!res.ok) return;
      const data = (await res.json()) as { models?: Partial<Record<GlbSlotId, string>> };
      if (!data?.models) return;

      const slots = Object.keys(data.models) as GlbSlotId[];
      await Promise.all(
        slots.map(async (slot) => {
          const url = data.models?.[slot];
          if (!url) return;
          try {
            const gltf = await this.loader.loadAsync(url);
            const cleanName = url.split('/').pop() || `${slot}.glb`;
            this.registerNormalizedGltf(slot, cleanName, gltf);
          } catch {
            // Skip missing/invalid individual model gracefully
          }
        })
      );
      if (slots.length > 0) {
        this.notify();
      }
    } catch {
      // Manifest optional
    }
  }

  public async loadFromFile(slot: GlbSlotId, file: File): Promise<void> {
    const buffer = await file.arrayBuffer();
    const gltf = await new Promise<GLTF>((resolve, reject) => {
      this.loader.parse(buffer, '', resolve, reject);
    });
    this.registerNormalizedGltf(slot, file.name, gltf);
    this.notify();
  }

  public clearSlot(slot: GlbSlotId): void {
    if (this.entries.has(slot)) {
      this.entries.delete(slot);
      this.notify();
    }
  }

  private registerNormalizedGltf(slot: GlbSlotId, fileName: string, gltf: GLTF): void {
    const wrapper = new THREE.Group();
    const rawRoot = gltf.scene;

    // Enhance PBR properties, color space, and shadows on imported meshes
    rawRoot.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (m instanceof THREE.MeshStandardMaterial) {
            m.envMapIntensity = 1.15;
            if (m.map) {
              m.map.colorSpace = THREE.SRGBColorSpace;
            }
          }
        });
      }
    });

    // Normalize bounding box to fit aquarium coordinate scale
    const box = new THREE.Box3().setFromObject(rawRoot);
    const sizeVec = new THREE.Vector3();
    const centerVec = new THREE.Vector3();
    box.getSize(sizeVec);
    box.getCenter(centerVec);

    const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z, 0.001);
    const spec = TARGET_DIMENSIONS[slot];
    const scaleFactor = spec.size / maxDim;

    rawRoot.scale.multiplyScalar(scaleFactor);

    // Recompute bounds after scaling to center cleanly
    const scaledBox = new THREE.Box3().setFromObject(rawRoot);
    scaledBox.getCenter(centerVec);

    if (spec.alignBottom) {
      rawRoot.position.set(-centerVec.x, -scaledBox.min.y, -centerVec.z);
    } else {
      rawRoot.position.set(-centerVec.x, -centerVec.y, -centerVec.z);
    }

    wrapper.add(rawRoot);

    this.entries.set(slot, {
      slot,
      fileName,
      sceneTemplate: wrapper,
      animations: gltf.animations || [],
    });
  }

  public instantiateSlot(
    slot: GlbSlotId
  ): { root: THREE.Group; mixer: THREE.AnimationMixer | null } | null {
    const entry = this.entries.get(slot);
    if (!entry) return null;

    const cloned = SkeletonUtils.clone(entry.sceneTemplate) as THREE.Group;
    let mixer: THREE.AnimationMixer | null = null;

    if (entry.animations.length > 0) {
      mixer = new THREE.AnimationMixer(cloned);
      const clip = entry.animations[0];
      const action = mixer.clipAction(clip);
      action.time = Math.random() * clip.duration;
      action.play();
    }

    return { root: cloned, mixer };
  }
}

export const glbRegistry = new GlbModelRegistry();
