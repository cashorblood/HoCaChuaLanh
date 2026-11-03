import * as THREE from 'three';
import { FishCatalogItem, SubstrateType } from '../types/aquarium';

/**
 * Generates zero-404 procedural CanvasTextures with proper SRGBColorSpace and max anisotropy.
 */
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
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export function createWalnutWoodTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2d1e16';
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 2) {
    const wave = Math.sin(y * 0.035) * 14 + Math.cos(y * 0.09) * 6;
    const tone = 30 + ((y + wave) % 24);
    ctx.fillStyle = `rgba(${tone + 26}, ${tone + 10}, ${tone}, 0.28)`;
    ctx.fillRect(0, y, 512, 2);
  }

  for (let i = 0; i < 160; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const w = 50 + Math.random() * 180;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(18, 10, 6, 0.22)' : 'rgba(92, 62, 42, 0.14)';
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
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.36)');
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
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  if (type === 'river_sand') {
    ctx.fillStyle = '#d8cbb3';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 6500; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 0.8 + Math.random() * 1.8;
      const pick = Math.random();
      ctx.fillStyle =
        pick < 0.45
          ? 'rgba(235, 225, 204, 0.65)'
          : pick < 0.85
            ? 'rgba(182, 162, 132, 0.55)'
            : 'rgba(128, 108, 82, 0.45)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'aqua_soil') {
    ctx.fillStyle = '#252321';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4800; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 1.6 + Math.random() * 2.6;
      const shade = 26 + Math.floor(Math.random() * 30);
      ctx.fillStyle = `rgb(${shade + 4}, ${shade + 1}, ${shade - 2})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // golden_pebbles
    ctx.fillStyle = '#9c7f57';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 3200; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const rx = 2 + Math.random() * 4.2;
      const ry = 1.5 + Math.random() * 3.2;
      const pick = Math.random();
      ctx.fillStyle =
        pick < 0.4
          ? '#c7ab7e'
          : pick < 0.75
            ? '#8b6d47'
            : '#5f4930';
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return finalizeColorTexture(canvas, maxAnisotropy, 3, 2);
}

export function createSeiryuStoneTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#4b5563';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const s = 2 + Math.random() * 8;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(55, 65, 81, 0.45)' : 'rgba(107, 114, 128, 0.35)';
    ctx.fillRect(x, y, s, s * 0.6);
  }

  // Signature white calcite veins of Seiryu stone
  for (let v = 0; v < 14; v++) {
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.72)';
    ctx.lineWidth = 1 + Math.random() * 2.2;
    ctx.beginPath();
    let x = Math.random() * 256;
    let y = Math.random() * 256;
    ctx.moveTo(x, y);
    for (let step = 0; step < 5; step++) {
      x += (Math.random() - 0.35) * 45;
      y += (Math.random() - 0.35) * 45;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  return finalizeColorTexture(canvas, maxAnisotropy, 1, 1);
}

export function createDriftwoodTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#5c3d28';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 180; i++) {
    const y = Math.random() * 256;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(38, 22, 12, 0.45)' : 'rgba(120, 83, 55, 0.32)';
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(85, y + 6, 170, y - 6, 256, y + 2);
    ctx.stroke();
  }

  return finalizeColorTexture(canvas, maxAnisotropy, 1, 2);
}

export function createFishBodyTexture(
  spec: FishCatalogItem,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 256, 128);
  grad.addColorStop(0, spec.bodyHex);
  grad.addColorStop(0.65, spec.secondaryHex);
  grad.addColorStop(1, spec.finHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 128);

  if (spec.pattern === 'koi') {
    ctx.fillStyle = spec.bodyHex;
    ctx.fillRect(0, 0, 256, 128);
    // Orange/red patches
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 3 === 0 ? '#1e293b' : spec.secondaryHex;
      ctx.beginPath();
      ctx.ellipse(
        30 + Math.random() * 195,
        15 + Math.random() * 98,
        14 + Math.random() * 24,
        10 + Math.random() * 16,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    // Iridescent galaxy scales
    for (let i = 0; i < 42; i++) {
      ctx.fillStyle = spec.accentHex;
      ctx.beginPath();
      ctx.arc(40 + Math.random() * 180, 20 + Math.random() * 88, 2 + Math.random() * 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (spec.pattern === 'mosaic') {
    for (let i = 0; i < 28; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#0f172a' : spec.accentHex;
      ctx.beginPath();
      ctx.arc(110 + Math.random() * 140, 10 + Math.random() * 108, 4 + Math.random() * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Subtle scale diamond lattice
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 0.8;
  for (let x = 0; x < 256; x += 12) {
    for (let y = 0; y < 128; y += 10) {
      ctx.beginPath();
      ctx.arc(x + (y % 20 === 0 ? 6 : 0), y, 5, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
    }
  }

  return finalizeColorTexture(canvas, maxAnisotropy, 1, 1);
}

export function createFinSilkTexture(
  spec: FishCatalogItem,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 256);
  const grad = ctx.createLinearGradient(0, 128, 256, 128);
  grad.addColorStop(0, spec.secondaryHex);
  grad.addColorStop(0.55, spec.finHex);
  grad.addColorStop(0.92, spec.accentHex);
  grad.addColorStop(1, 'rgba(255,255,255,0.12)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  if (spec.pattern === 'mosaic' || spec.pattern === 'koi') {
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(15, 23, 42, 0.55)' : spec.secondaryHex;
      ctx.beginPath();
      ctx.arc(40 + Math.random() * 185, 20 + Math.random() * 216, 5 + Math.random() * 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Delicate fin rays radiating horizontally
  for (let y = 8; y < 248; y += 7) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 128 + (y - 128) * 0.35);
    ctx.lineTo(252, y);
    ctx.stroke();
  }

  return finalizeColorTexture(canvas, maxAnisotropy, 1, 1);
}
