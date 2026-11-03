import * as THREE from 'three';
import { FishCatalogItem, SubstrateType } from '../types/aquarium';

import seiryuStoneUrl from '../assets/images/tex_seiryu_stone_1793677137678.jpg';
import driftwoodBarkUrl from '../assets/images/tex_driftwood_bark_1793677139863.jpg';
import riverSandUrl from '../assets/images/tex_river_sand_1793677140817.jpg';
import aquasoilGranulesUrl from '../assets/images/tex_aquasoil_granules_1793677139364.jpg';

const textureLoader = new THREE.TextureLoader();

function loadPbrPhotoTexture(
  url: string,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.Texture {
  const tex = textureLoader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.MirroredRepeatWrapping;
  tex.wrapT = THREE.MirroredRepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

export function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  if (repeatX > 1 || repeatY > 1) {
    tex.wrapS = THREE.MirroredRepeatWrapping;
    tex.wrapT = THREE.MirroredRepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a linear-space micro-relief bump map for wet mineral/organic surfaces.
 */
export function createOrganicBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 1 + Math.random() * 3.5;
    const v = Math.floor(90 + Math.random() * 145);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.MirroredRepeatWrapping;
  tex.wrapT = THREE.MirroredRepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export function createPlanktonGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.45, 'rgba(186, 230, 253, 0.45)');
  grad.addColorStop(1, 'rgba(186, 230, 253, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWalnutWoodTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#241710';
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 2) {
    const wave = Math.sin(y * 0.03) * 16 + Math.cos(y * 0.08) * 6;
    const tone = 24 + ((y + wave) % 22);
    ctx.fillStyle = `rgba(${tone + 28}, ${tone + 12}, ${tone + 2}, 0.32)`;
    ctx.fillRect(0, y, 512, 2);
  }

  for (let i = 0; i < 220; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const w = 60 + Math.random() * 200;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(12, 6, 3, 0.28)' : 'rgba(98, 66, 44, 0.16)';
    ctx.lineWidth = 1 + Math.random() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + w * 0.3, y + 3, x + w * 0.7, y - 3, x + w, y + 1);
    ctx.stroke();
  }

  return finalizeColorTexture(canvas, maxAnisotropy, 2, 2);
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 24, 128, 128, 124);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.38)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSubstrateTexture(
  type: SubstrateType,
  maxAnisotropy: number
): THREE.Texture {
  if (type === 'aqua_soil') {
    return loadPbrPhotoTexture(aquasoilGranulesUrl, maxAnisotropy, 3, 2);
  }
  if (type === 'river_sand') {
    return loadPbrPhotoTexture(riverSandUrl, maxAnisotropy, 3, 2);
  }
  // Golden river pebbles uses riverSandUrl with larger pebble scale
  return loadPbrPhotoTexture(riverSandUrl, maxAnisotropy, 1.8, 1.2);
}

export function createSeiryuStoneTexture(maxAnisotropy: number): THREE.Texture {
  return loadPbrPhotoTexture(seiryuStoneUrl, maxAnisotropy, 1.4, 1.4);
}

export function createDriftwoodTexture(maxAnisotropy: number): THREE.Texture {
  return loadPbrPhotoTexture(driftwoodBarkUrl, maxAnisotropy, 1.5, 1.5);
}

export function createFishBodyTexture(
  spec: FishCatalogItem,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Natural dorsal-dark to ventral-silver biological countershading
  const baseGrad = ctx.createLinearGradient(0, 0, 512, 256);
  baseGrad.addColorStop(0, spec.bodyHex);
  baseGrad.addColorStop(0.6, spec.secondaryHex);
  baseGrad.addColorStop(1, spec.finHex);
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 512, 256);

  if (spec.pattern === 'koi') {
    ctx.fillStyle = '#f5f0eb';
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = i % 3 === 0 ? '#111827' : spec.secondaryHex;
      ctx.beginPath();
      ctx.ellipse(
        50 + Math.random() * 412,
        25 + Math.random() * 206,
        24 + Math.random() * 46,
        18 + Math.random() * 32,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    // Iridescent cyan/pearl galaxy metallic scales
    for (let i = 0; i < 85; i++) {
      ctx.fillStyle = spec.accentHex;
      ctx.globalAlpha = 0.55 + Math.random() * 0.45;
      ctx.beginPath();
      ctx.arc(60 + Math.random() * 390, 30 + Math.random() * 196, 3.2 + Math.random() * 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (spec.pattern === 'mosaic') {
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#0f172a' : spec.accentHex;
      ctx.beginPath();
      ctx.arc(180 + Math.random() * 310, 20 + Math.random() * 216, 6 + Math.random() * 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Soft dorsal shadow & belly pearlescence
  const bellyOverlay = ctx.createLinearGradient(0, 0, 0, 256);
  bellyOverlay.addColorStop(0, 'rgba(0, 0, 0, 0.28)');
  bellyOverlay.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
  bellyOverlay.addColorStop(1, 'rgba(255, 255, 255, 0.25)');
  ctx.fillStyle = bellyOverlay;
  ctx.fillRect(0, 0, 512, 256);

  // Fine overlapping scale arcs
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1.1;
  for (let x = 8; x < 504; x += 14) {
    for (let y = 8; y < 248; y += 12) {
      ctx.beginPath();
      ctx.arc(x + (y % 24 === 0 ? 7 : 0), y, 6.5, -Math.PI * 0.46, Math.PI * 0.46);
      ctx.stroke();
    }
  }

  return finalizeColorTexture(canvas, maxAnisotropy, 1, 1);
}

/**
 * Generates gossamer silk fin texture with alpha-feathered scalloped outer fringe
 * so Betta Halfmoon & Guppy Delta tails look wispy & translucent rather than polygon-cut.
 */
export function createFinSilkTexture(
  spec: FishCatalogItem,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 512);

  // Draw 46 individual feathered fin rays from peduncle (x=0) out to scalloped margin (x~490)
  const rayCount = 46;
  for (let i = 0; i < rayCount; i++) {
    const t = i / (rayCount - 1);
    const yEnd = 18 + t * 476;
    const yStart = 256 + (yEnd - 256) * 0.26;
    const scallopLen = 468 + Math.sin(i * 1.9) * 26;

    const rayGrad = ctx.createLinearGradient(0, yStart, scallopLen, yEnd);
    rayGrad.addColorStop(0, spec.bodyHex);
    rayGrad.addColorStop(0.38, spec.secondaryHex);
    rayGrad.addColorStop(0.75, spec.finHex);
    rayGrad.addColorStop(0.92, spec.accentHex);
    rayGrad.addColorStop(1, 'rgba(255,255,255,0)');

    // Soft translucent webbing between rays
    ctx.strokeStyle = rayGrad;
    ctx.lineWidth = 14;
    ctx.globalAlpha = 0.72;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, yStart);
    ctx.quadraticCurveTo(scallopLen * 0.5, (yStart + yEnd) * 0.5, scallopLen, yEnd);
    ctx.stroke();

    // Crisp cartilage fin-ray spine
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.34)';
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.moveTo(0, yStart);
    ctx.quadraticCurveTo(scallopLen * 0.5, (yStart + yEnd) * 0.5, scallopLen * 0.96, yEnd);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  if (spec.pattern === 'mosaic' || spec.pattern === 'koi') {
    ctx.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 36; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(15, 23, 42, 0.62)' : spec.secondaryHex;
      ctx.beginPath();
      ctx.arc(60 + Math.random() * 340, 35 + Math.random() * 442, 8 + Math.random() * 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  return finalizeColorTexture(canvas, maxAnisotropy, 1, 1);
}

/**
 * Generates glossy chitin carapace textures for Neocaridina & Caridina dwarf shrimp
 * (Crystal Red PRL alternating bands, Golden Back dorsal stripe, Fire Red & Blue Dream).
 */
export function createShrimpShellTexture(
  spec: FishCatalogItem,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  if (spec.pattern === 'shrimp_band') {
    // Crisp porcelain white base with 4 crimson Caridina bee bands along length (x axis)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 256, 128);

    const bands = [
      { x: 0, w: 38 },
      { x: 74, w: 36 },
      { x: 146, w: 34 },
      { x: 214, w: 42 },
    ];
    ctx.fillStyle = spec.secondaryHex;
    for (const b of bands) {
      ctx.fillRect(b.x, 0, b.w, 128);
    }
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, spec.bodyHex);
    grad.addColorStop(0.55, spec.secondaryHex);
    grad.addColorStop(1, spec.finHex);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);

    if (spec.pattern === 'shrimp_stripe') {
      // Bright golden-cream dorsal racing stripe along top ridge (y near 0 and 128 in Lathe UV)
      ctx.fillStyle = spec.accentHex;
      ctx.fillRect(0, 0, 256, 22);
      ctx.fillRect(0, 106, 256, 22);
    }
  }

  // Subtle chitin segment seam lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.5;
  for (let x = 36; x < 230; x += 34) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 128);
    ctx.stroke();
  }

  return finalizeColorTexture(canvas, maxAnisotropy, 1, 1);
}

