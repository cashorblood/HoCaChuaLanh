import * as THREE from 'three';
import { AquascapePropType, PlacedProp } from '../types/aquarium';

export const TANK_WIDTH = 4.8;
export const TANK_HEIGHT = 2.65;
export const TANK_DEPTH = 2.5;
export const WATER_LEVEL_BASE = 2.38;

/**
 * Deterministic substrate surface height inside the tank so every stone, driftwood,
 * and plant sits flush on the substrate without floating or Z-fighting.
 */
export function groundHeightAt(x: number, z: number): number {
  const moundLeft = Math.exp(-((x + 0.85) * (x + 0.85) * 0.8 + (z + 0.2) * (z + 0.2) * 1.1)) * 0.22;
  const moundRight = Math.exp(-((x - 1.05) * (x - 1.05) * 0.9 + (z + 0.15) * (z + 0.15) * 1.2)) * 0.17;
  const backSlope = THREE.MathUtils.clamp((0.9 - z) * 0.085, 0, 0.18);
  const ripple = Math.sin(x * 2.4) * Math.cos(z * 2.8) * 0.018;
  return 0.16 + moundLeft + moundRight + backSlope + ripple;
}

export interface SharedPropAssets {
  stoneTexture: THREE.Texture;
  woodTexture: THREE.Texture;
  swayTimeUniform: { value: number };
}

function attachPlantSway(
  material: THREE.MeshStandardMaterial,
  swayTimeUniform: { value: number },
  amplitude: number,
  speed: number,
  maxHeight: number
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSwayTime = swayTimeUniform;
    shader.vertexShader =
      `uniform float uSwayTime;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float hFactor = clamp(position.y / ${maxHeight.toFixed(2)}, 0.0, 1.0);
        float sway = sin(uSwayTime * ${speed.toFixed(2)} + position.y * 2.6 + position.x * 3.1) * ${amplitude.toFixed(3)} * hFactor * hFactor;
        transformed.x += sway;
        transformed.z += cos(uSwayTime * ${(speed * 0.8).toFixed(2)} + position.y * 2.1) * ${(amplitude * 0.55).toFixed(3)} * hFactor;
        `
      );
  };
}

/**
 * Builds a composite 3–12 part THREE.Group for each aquascape hardscape or plant item.
 */
export function buildAquascapePropMesh(
  prop: PlacedProp,
  assets: SharedPropAssets,
  selected: boolean
): THREE.Group {
  const group = new THREE.Group();
  group.name = `prop-${prop.id}`;
  group.userData = { propId: prop.id, propType: prop.type };

  const seed = hashId(prop.id);

  switch (prop.type) {
    case 'seiryu_rock_large': {
      const rockMat = new THREE.MeshStandardMaterial({
        map: assets.stoneTexture,
        color: selected ? 0x99f6e4 : 0x94a3b8,
        roughness: 0.78,
        metalness: 0.08,
        flatShading: true,
      });
      const subMat = new THREE.MeshStandardMaterial({
        map: assets.stoneTexture,
        color: selected ? 0x5eead4 : 0x64748b,
        roughness: 0.88,
        metalness: 0.05,
        flatShading: true,
      });

      // Main Oyaishi peak + 3 supporting faceted shoulders + moss accent
      const mainGeo = createFacetedRockGeometry(0.46, 0.88, 0.38, seed);
      const mainRock = new THREE.Mesh(mainGeo, rockMat);
      mainRock.position.set(0, 0.36, 0);
      mainRock.rotation.z = -0.22;
      mainRock.castShadow = true;
      mainRock.receiveShadow = true;
      group.add(mainRock);

      const leftShoulder = new THREE.Mesh(createFacetedRockGeometry(0.3, 0.48, 0.28, seed + 11), subMat);
      leftShoulder.position.set(-0.28, 0.18, 0.12);
      leftShoulder.rotation.set(0.15, 0.6, 0.2);
      leftShoulder.castShadow = true;
      leftShoulder.receiveShadow = true;
      group.add(leftShoulder);

      const rightFoot = new THREE.Mesh(createFacetedRockGeometry(0.24, 0.32, 0.25, seed + 23), subMat);
      rightFoot.position.set(0.26, 0.12, 0.14);
      rightFoot.rotation.y = -0.7;
      rightFoot.castShadow = true;
      rightFoot.receiveShadow = true;
      group.add(rightFoot);

      const mossMat = new THREE.MeshStandardMaterial({
        color: 0x3f6212,
        roughness: 0.92,
        metalness: 0.0,
      });
      const moss = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 1), mossMat);
      moss.scale.set(1.4, 0.45, 1.1);
      moss.position.set(-0.1, 0.32, 0.16);
      group.add(moss);
      break;
    }

    case 'seiryu_rock_cluster': {
      const rockMat = new THREE.MeshStandardMaterial({
        map: assets.stoneTexture,
        color: selected ? 0x99f6e4 : 0x7c8b9e,
        roughness: 0.82,
        metalness: 0.06,
        flatShading: true,
      });
      const offsets = [
        { x: -0.16, y: 0.16, z: 0.04, r: 0.24, h: 0.38 },
        { x: 0.14, y: 0.12, z: -0.06, r: 0.2, h: 0.28 },
        { x: 0.02, y: 0.09, z: 0.16, r: 0.15, h: 0.2 },
        { x: -0.05, y: 0.08, z: -0.16, r: 0.14, h: 0.18 },
      ];
      offsets.forEach((o, idx) => {
        const m = new THREE.Mesh(createFacetedRockGeometry(o.r, o.h, o.r * 0.9, seed + idx * 7), rockMat);
        m.position.set(o.x, o.y, o.z);
        m.rotation.set((idx - 1) * 0.15, idx * 0.9, (idx % 2 === 0 ? 1 : -1) * 0.18);
        m.castShadow = true;
        m.receiveShadow = true;
        group.add(m);
      });
      break;
    }

    case 'bonsai_driftwood': {
      const woodMat = new THREE.MeshStandardMaterial({
        map: assets.woodTexture,
        color: selected ? 0x5eead4 : 0x785032,
        roughness: 0.86,
        metalness: 0.04,
      });
      const mossMat = new THREE.MeshStandardMaterial({
        color: selected ? 0x34d399 : 0x3f7a28,
        roughness: 0.92,
        metalness: 0.02,
      });
      attachPlantSway(mossMat, assets.swayTimeUniform, 0.015, 1.3, 1.3);

      // Gnarled trunk + 3 sweeping branches + lush Java moss pads
      const trunkCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.04, 0),
        new THREE.Vector3(-0.08, 0.28, 0.05),
        new THREE.Vector3(0.06, 0.62, -0.04),
        new THREE.Vector3(0.24, 0.88, 0.06),
      ]);
      const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 20, 0.085, 8, false), woodMat);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      group.add(trunk);

      const branchSpecs = [
        [
          new THREE.Vector3(-0.04, 0.42, 0.02),
          new THREE.Vector3(-0.34, 0.65, 0.16),
          new THREE.Vector3(-0.56, 0.78, 0.22),
        ],
        [
          new THREE.Vector3(0.05, 0.58, -0.02),
          new THREE.Vector3(0.38, 0.76, -0.18),
          new THREE.Vector3(0.62, 0.92, -0.22),
        ],
        [
          new THREE.Vector3(-0.05, 0.18, 0.04),
          new THREE.Vector3(0.28, 0.08, 0.24),
          new THREE.Vector3(0.45, 0.02, 0.34),
        ],
      ];

      branchSpecs.forEach((pts, idx) => {
        const c = new THREE.CatmullRomCurve3(pts);
        const b = new THREE.Mesh(
          new THREE.TubeGeometry(c, 14, idx === 2 ? 0.038 : 0.048, 7, false),
          woodMat
        );
        b.castShadow = true;
        group.add(b);
      });

      const canopyPads = [
        { x: 0.25, y: 0.91, z: 0.06, sx: 0.34, sy: 0.11, sz: 0.28 },
        { x: -0.54, y: 0.81, z: 0.22, sx: 0.28, sy: 0.1, sz: 0.24 },
        { x: 0.6, y: 0.95, z: -0.22, sx: 0.3, sy: 0.1, sz: 0.25 },
        { x: -0.2, y: 0.68, z: 0.14, sx: 0.2, sy: 0.08, sz: 0.18 },
      ];
      canopyPads.forEach((pad) => {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mossMat);
        m.scale.set(pad.sx, pad.sy, pad.sz);
        m.position.set(pad.x, pad.y, pad.z);
        m.castShadow = true;
        group.add(m);
      });
      break;
    }

    case 'branch_twig': {
      const woodMat = new THREE.MeshStandardMaterial({
        map: assets.woodTexture,
        color: selected ? 0x5eead4 : 0x6b442a,
        roughness: 0.88,
        metalness: 0.03,
      });
      const mainBranch = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.35, 0.02, 0.18),
        new THREE.Vector3(-0.08, 0.24, 0.02),
        new THREE.Vector3(0.28, 0.52, -0.1),
        new THREE.Vector3(0.62, 0.78, -0.18),
      ]);
      const mesh1 = new THREE.Mesh(new THREE.TubeGeometry(mainBranch, 18, 0.036, 7, false), woodMat);
      mesh1.castShadow = true;
      group.add(mesh1);

      const fork1 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.05, 0.34, -0.02),
        new THREE.Vector3(-0.18, 0.58, -0.16),
        new THREE.Vector3(-0.35, 0.76, -0.25),
      ]);
      const mesh2 = new THREE.Mesh(new THREE.TubeGeometry(fork1, 12, 0.022, 6, false), woodMat);
      mesh2.castShadow = true;
      group.add(mesh2);

      const fork2 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.22, 0.46, -0.08),
        new THREE.Vector3(0.45, 0.38, 0.14),
        new THREE.Vector3(0.64, 0.44, 0.26),
      ]);
      const mesh3 = new THREE.Mesh(new THREE.TubeGeometry(fork2, 12, 0.018, 6, false), woodMat);
      group.add(mesh3);
      break;
    }

    case 'vallisneria_tall': {
      const bladeMat = new THREE.MeshStandardMaterial({
        color: selected ? 0x6ee7b7 : 0x3b873e,
        roughness: 0.55,
        metalness: 0.04,
        side: THREE.DoubleSide,
      });
      attachPlantSway(bladeMat, assets.swayTimeUniform, 0.12, 1.45, 1.65);

      const bladeCount = 9;
      for (let i = 0; i < bladeCount; i++) {
        const h = 1.05 + ((seed + i * 19) % 10) * 0.065;
        const bladeGeo = createRibbonLeafGeometry(0.055, h, 8);
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        const angle = (i / bladeCount) * Math.PI * 2;
        const r = 0.03 + (i % 3) * 0.035;
        blade.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
        blade.rotation.y = angle * 0.6;
        blade.rotation.z = (Math.random() - 0.5) * 0.14;
        group.add(blade);
      }
      break;
    }

    case 'java_fern': {
      const fernMat = new THREE.MeshStandardMaterial({
        color: selected ? 0x6ee7b7 : 0x4d8c3a,
        roughness: 0.62,
        metalness: 0.03,
        side: THREE.DoubleSide,
      });
      attachPlantSway(fernMat, assets.swayTimeUniform, 0.06, 1.6, 0.85);

      const leafCount = 8;
      for (let i = 0; i < leafCount; i++) {
        const h = 0.48 + (i % 3) * 0.12;
        const leafGeo = createBroadLeafGeometry(0.11, h);
        const leaf = new THREE.Mesh(leafGeo, fernMat);
        const angle = (i / leafCount) * Math.PI * 2 + 0.2;
        leaf.rotation.y = angle;
        leaf.rotation.x = 0.28 + (i % 2) * 0.16;
        leaf.position.y = 0.02;
        leaf.castShadow = true;
        group.add(leaf);
      }
      break;
    }

    case 'anubias_nana': {
      const anubiasMat = new THREE.MeshStandardMaterial({
        color: selected ? 0x6ee7b7 : 0x1f5f3b,
        roughness: 0.36, // Glossy dark green Anubias leaves
        metalness: 0.06,
        side: THREE.DoubleSide,
      });
      attachPlantSway(anubiasMat, assets.swayTimeUniform, 0.025, 1.4, 0.45);

      const rhizomeMat = new THREE.MeshStandardMaterial({
        color: 0x365314,
        roughness: 0.8,
      });
      const rhizome = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.16, 4, 6), rhizomeMat);
      rhizome.rotation.z = Math.PI * 0.5;
      rhizome.position.y = 0.03;
      group.add(rhizome);

      for (let i = 0; i < 7; i++) {
        const leaf = new THREE.Mesh(createBroadLeafGeometry(0.12, 0.24), anubiasMat);
        const angle = (i / 7) * Math.PI * 2;
        leaf.position.set(Math.cos(angle) * 0.05, 0.05 + (i % 2) * 0.03, Math.sin(angle) * 0.05);
        leaf.rotation.y = angle;
        leaf.rotation.x = 0.55;
        leaf.castShadow = true;
        group.add(leaf);
      }
      break;
    }

    case 'hairgrass_patch': {
      const grassMat = new THREE.MeshStandardMaterial({
        color: selected ? 0x86efac : 0x5da338,
        roughness: 0.68,
        metalness: 0.02,
        side: THREE.DoubleSide,
      });
      attachPlantSway(grassMat, assets.swayTimeUniform, 0.035, 2.0, 0.35);

      for (let i = 0; i < 16; i++) {
        const h = 0.16 + ((seed + i * 13) % 7) * 0.022;
        const blade = new THREE.Mesh(createRibbonLeafGeometry(0.022, h, 4), grassMat);
        const angle = i * 2.39996; // Golden angle distribution
        const dist = Math.sqrt(i / 16) * 0.26;
        blade.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
        blade.rotation.y = angle;
        blade.rotation.x = 0.12 + (i % 3) * 0.08;
        group.add(blade);
      }
      break;
    }

    case 'catappa_leaf': {
      const leafMat = new THREE.MeshStandardMaterial({
        color: selected ? 0xfdba74 : 0x7c3f1d,
        roughness: 0.85,
        metalness: 0.04,
        side: THREE.DoubleSide,
      });
      const leaf = new THREE.Mesh(createBroadLeafGeometry(0.22, 0.42), leafMat);
      leaf.rotation.x = Math.PI * 0.47;
      leaf.rotation.z = 0.12;
      leaf.position.y = 0.035;
      leaf.receiveShadow = true;
      group.add(leaf);

      const stemMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.1, 5), stemMat);
      stem.rotation.x = Math.PI * 0.5;
      stem.position.set(0, 0.03, -0.03);
      group.add(stem);
      break;
    }

    case 'floating_frogbit': {
      const padMat = new THREE.MeshStandardMaterial({
        color: selected ? 0x86efac : 0x65a30d,
        roughness: 0.55,
        metalness: 0.02,
      });
      const rootMat = new THREE.MeshStandardMaterial({
        color: 0xd6d3d1,
        roughness: 0.8,
        transparent: true,
        opacity: 0.72,
      });
      attachPlantSway(rootMat, assets.swayTimeUniform, 0.05, 1.3, 0.55);

      const padOffsets = [
        { x: 0, z: 0, r: 0.11 },
        { x: 0.13, z: 0.07, r: 0.085 },
        { x: -0.11, z: 0.09, r: 0.09 },
        { x: 0.04, z: -0.12, r: 0.075 },
        { x: -0.09, z: -0.08, r: 0.065 },
      ];
      padOffsets.forEach((p, idx) => {
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r * 0.92, 0.018, 12), padMat);
        pad.position.set(p.x, idx * 0.003, p.z);
        group.add(pad);
      });

      for (let r = 0; r < 6; r++) {
        const len = 0.28 + (r % 3) * 0.11;
        const root = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.002, len, 5), rootMat);
        root.position.set((r - 2.5) * 0.04, -len * 0.5, ((r * 7) % 5 - 2) * 0.03);
        group.add(root);
      }
      break;
    }
  }

  return group;
}

function createFacetedRockGeometry(
  rx: number,
  ry: number,
  rz: number,
  seed: number
): THREE.BufferGeometry {
  const geo = new THREE.DodecahedronGeometry(1, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let vx = pos.getX(i);
    let vy = pos.getY(i);
    let vz = pos.getZ(i);

    const n = Math.sin(vx * 3.7 + seed) * Math.cos(vy * 4.1 + seed * 0.5) * 0.22;
    vx *= rx * (1 + n);
    vy = (vy * 0.5 + 0.35) * ry * (1 + n * 0.6);
    vz *= rz * (1 - n * 0.5);

    pos.setXYZ(i, vx, Math.max(-0.04, vy), vz);
  }
  geo.computeVertexNormals();
  return geo;
}

function createRibbonLeafGeometry(
  width: number,
  height: number,
  segmentsY: number
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, height, 1, segmentsY);
  geo.translate(0, height * 0.5, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = y / height;
    const taper = Math.sin(t * Math.PI * 0.88 + 0.12);
    pos.setX(i, pos.getX(i) * taper);
    pos.setZ(i, Math.sin(t * Math.PI) * 0.04);
  }
  geo.computeVertexNormals();
  return geo;
}

function createBroadLeafGeometry(width: number, length: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, length, 2, 6);
  geo.translate(0, length * 0.5, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    const t = THREE.MathUtils.clamp(y / length, 0, 1);
    const profile = Math.sin(Math.pow(t, 0.75) * Math.PI);
    pos.setX(i, x * profile * 1.25);
    pos.setZ(i, Math.abs(x) * 0.22 - Math.sin(t * Math.PI) * 0.03);
  }
  geo.computeVertexNormals();
  return geo;
}

function hashId(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h % 97);
}
