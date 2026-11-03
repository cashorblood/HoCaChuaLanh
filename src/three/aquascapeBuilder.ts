import * as THREE from 'three';
import { PlacedProp } from '../types/aquarium';
import { glbRegistry } from './glbModelRegistry';

export const TANK_WIDTH = 4.8;
export const TANK_HEIGHT = 2.65;
export const TANK_DEPTH = 2.5;
export const WATER_LEVEL_BASE = 2.38;

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
  bumpTexture: THREE.Texture;
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
 * Builds photorealistic PBR / GLB-backed aquascape hardscape and flora groups.
 */
export function buildAquascapePropMesh(
  prop: PlacedProp,
  assets: SharedPropAssets,
  _selected: boolean
): THREE.Group {
  const group = new THREE.Group();
  group.name = `prop-${prop.id}`;
  group.userData = { propId: prop.id, propType: prop.type };

  const seed = hashId(prop.id);

  // Check if user loaded a custom sculpted .glb model for this category!
  if (prop.type === 'seiryu_rock_large' || prop.type === 'seiryu_rock_cluster') {
    const customRock = glbRegistry.instantiateSlot('rock');
    if (customRock) {
      const s = prop.type === 'seiryu_rock_cluster' ? 0.65 : 1.0;
      customRock.root.scale.multiplyScalar(s);
      group.add(customRock.root);
      return group;
    }
  } else if (prop.type === 'bonsai_driftwood' || prop.type === 'branch_twig') {
    const customWood = glbRegistry.instantiateSlot('driftwood');
    if (customWood) {
      const s = prop.type === 'branch_twig' ? 0.72 : 1.0;
      customWood.root.scale.multiplyScalar(s);
      group.add(customWood.root);
      return group;
    }
  } else if (
    prop.type === 'java_fern' ||
    prop.type === 'anubias_nana' ||
    prop.type === 'vallisneria_tall'
  ) {
    const customPlant = glbRegistry.instantiateSlot('plant');
    if (customPlant) {
      const s = prop.type === 'anubias_nana' ? 0.55 : prop.type === 'java_fern' ? 0.8 : 1.1;
      customPlant.root.scale.multiplyScalar(s);
      group.add(customPlant.root);
      return group;
    }
  }

  switch (prop.type) {
    case 'seiryu_rock_large': {
      const rockMat = new THREE.MeshStandardMaterial({
        map: assets.stoneTexture,
        bumpMap: assets.bumpTexture,
        bumpScale: 0.025,
        color: 0xdbe4ee,
        roughness: 0.52, // Wet submerged slate sheen
        metalness: 0.08,
      });
      const subMat = new THREE.MeshStandardMaterial({
        map: assets.stoneTexture,
        bumpMap: assets.bumpTexture,
        bumpScale: 0.022,
        color: 0xbac7d6,
        roughness: 0.58,
        metalness: 0.06,
      });

      const mainGeo = createHighDetailSeiryuGeometry(0.48, 0.92, 0.4, seed);
      const mainRock = new THREE.Mesh(mainGeo, rockMat);
      mainRock.position.set(0, 0.34, 0);
      mainRock.rotation.z = -0.22;
      mainRock.castShadow = true;
      mainRock.receiveShadow = true;
      group.add(mainRock);

      const leftShoulder = new THREE.Mesh(
        createHighDetailSeiryuGeometry(0.32, 0.5, 0.3, seed + 11),
        subMat
      );
      leftShoulder.position.set(-0.28, 0.16, 0.12);
      leftShoulder.rotation.set(0.15, 0.6, 0.2);
      leftShoulder.castShadow = true;
      leftShoulder.receiveShadow = true;
      group.add(leftShoulder);

      const rightFoot = new THREE.Mesh(
        createHighDetailSeiryuGeometry(0.25, 0.34, 0.26, seed + 23),
        subMat
      );
      rightFoot.position.set(0.26, 0.11, 0.14);
      rightFoot.rotation.y = -0.7;
      rightFoot.castShadow = true;
      rightFoot.receiveShadow = true;
      group.add(rightFoot);

      addFeatheryMossCushion(group, -0.1, 0.31, 0.17, 0.14, assets.swayTimeUniform);
      break;
    }

    case 'seiryu_rock_cluster': {
      const rockMat = new THREE.MeshStandardMaterial({
        map: assets.stoneTexture,
        bumpMap: assets.bumpTexture,
        bumpScale: 0.022,
        color: 0xcbd5e1,
        roughness: 0.56,
        metalness: 0.06,
      });
      const offsets = [
        { x: -0.16, y: 0.15, z: 0.04, r: 0.25, h: 0.4 },
        { x: 0.15, y: 0.11, z: -0.06, r: 0.21, h: 0.3 },
        { x: 0.02, y: 0.08, z: 0.16, r: 0.16, h: 0.22 },
        { x: -0.05, y: 0.07, z: -0.16, r: 0.15, h: 0.19 },
      ];
      offsets.forEach((o, idx) => {
        const m = new THREE.Mesh(
          createHighDetailSeiryuGeometry(o.r, o.h, o.r * 0.9, seed + idx * 7),
          rockMat
        );
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
        bumpMap: assets.bumpTexture,
        bumpScale: 0.028,
        color: 0xd6c3b3,
        roughness: 0.68,
        metalness: 0.04,
      });

      // Tapered organic gnarled trunk + root flares + sweeping limbs
      const trunkCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.03, 0),
        new THREE.Vector3(-0.09, 0.28, 0.06),
        new THREE.Vector3(0.06, 0.62, -0.04),
        new THREE.Vector3(0.24, 0.88, 0.06),
      ]);
      const trunk = new THREE.Mesh(createTaperedBranchGeometry(trunkCurve, 28, 0.11, 0.045), woodMat);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      group.add(trunk);

      const branchSpecs: Array<{ pts: THREE.Vector3[]; r0: number; r1: number }> = [
        {
          pts: [
            new THREE.Vector3(-0.04, 0.42, 0.02),
            new THREE.Vector3(-0.34, 0.65, 0.16),
            new THREE.Vector3(-0.58, 0.79, 0.22),
          ],
          r0: 0.058,
          r1: 0.02,
        },
        {
          pts: [
            new THREE.Vector3(0.05, 0.58, -0.02),
            new THREE.Vector3(0.38, 0.76, -0.18),
            new THREE.Vector3(0.64, 0.93, -0.22),
          ],
          r0: 0.055,
          r1: 0.018,
        },
        {
          pts: [
            new THREE.Vector3(-0.03, 0.2, 0.04),
            new THREE.Vector3(0.24, 0.09, 0.24),
            new THREE.Vector3(0.46, 0.01, 0.36),
          ],
          r0: 0.052,
          r1: 0.014,
        },
        {
          pts: [
            new THREE.Vector3(-0.05, 0.18, -0.02),
            new THREE.Vector3(-0.28, 0.07, -0.22),
            new THREE.Vector3(-0.44, 0.01, -0.32),
          ],
          r0: 0.048,
          r1: 0.012,
        },
      ];

      branchSpecs.forEach((b) => {
        const c = new THREE.CatmullRomCurve3(b.pts);
        const mesh = new THREE.Mesh(createTaperedBranchGeometry(c, 20, b.r0, b.r1), woodMat);
        mesh.castShadow = true;
        group.add(mesh);
      });

      // Multi-layered feathery Java moss canopies
      addFeatheryMossCushion(group, 0.25, 0.91, 0.06, 0.32, assets.swayTimeUniform);
      addFeatheryMossCushion(group, -0.55, 0.81, 0.22, 0.26, assets.swayTimeUniform);
      addFeatheryMossCushion(group, 0.61, 0.95, -0.22, 0.28, assets.swayTimeUniform);
      addFeatheryMossCushion(group, -0.22, 0.68, 0.14, 0.2, assets.swayTimeUniform);
      break;
    }

    case 'branch_twig': {
      const woodMat = new THREE.MeshStandardMaterial({
        map: assets.woodTexture,
        bumpMap: assets.bumpTexture,
        bumpScale: 0.025,
        color: 0xcbb5a2,
        roughness: 0.72,
        metalness: 0.03,
      });
      const mainBranch = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.36, 0.01, 0.18),
        new THREE.Vector3(-0.08, 0.24, 0.02),
        new THREE.Vector3(0.28, 0.52, -0.1),
        new THREE.Vector3(0.64, 0.8, -0.18),
      ]);
      const mesh1 = new THREE.Mesh(createTaperedBranchGeometry(mainBranch, 22, 0.05, 0.012), woodMat);
      mesh1.castShadow = true;
      group.add(mesh1);

      const fork1 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.05, 0.34, -0.02),
        new THREE.Vector3(-0.18, 0.58, -0.16),
        new THREE.Vector3(-0.36, 0.77, -0.25),
      ]);
      const mesh2 = new THREE.Mesh(createTaperedBranchGeometry(fork1, 16, 0.028, 0.008), woodMat);
      mesh2.castShadow = true;
      group.add(mesh2);

      const fork2 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.22, 0.46, -0.08),
        new THREE.Vector3(0.45, 0.38, 0.14),
        new THREE.Vector3(0.66, 0.45, 0.26),
      ]);
      const mesh3 = new THREE.Mesh(createTaperedBranchGeometry(fork2, 16, 0.024, 0.007), woodMat);
      group.add(mesh3);
      break;
    }

    case 'vallisneria_tall': {
      const bladeMat = new THREE.MeshStandardMaterial({
        color: 0x3b873e,
        roughness: 0.42,
        metalness: 0.04,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
      });
      attachPlantSway(bladeMat, assets.swayTimeUniform, 0.13, 1.45, 1.65);

      const bladeCount = 12;
      for (let i = 0; i < bladeCount; i++) {
        const h = 1.05 + ((seed + i * 19) % 10) * 0.068;
        const bladeGeo = createRibbonLeafGeometry(0.052, h, 10);
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        const angle = (i / bladeCount) * Math.PI * 2;
        const r = 0.025 + (i % 3) * 0.032;
        blade.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
        blade.rotation.y = angle * 0.6;
        blade.rotation.z = (Math.sin(i * 3.1) * 0.5) * 0.16;
        group.add(blade);
      }
      break;
    }

    case 'java_fern': {
      const fernMat = new THREE.MeshStandardMaterial({
        color: 0x458532,
        bumpMap: assets.bumpTexture,
        bumpScale: 0.006,
        roughness: 0.48,
        metalness: 0.03,
        side: THREE.DoubleSide,
      });
      attachPlantSway(fernMat, assets.swayTimeUniform, 0.065, 1.6, 0.85);

      const leafCount = 11;
      for (let i = 0; i < leafCount; i++) {
        const h = 0.45 + (i % 4) * 0.11;
        const leafGeo = createBroadLeafGeometry(0.105, h);
        const leaf = new THREE.Mesh(leafGeo, fernMat);
        const angle = (i / leafCount) * Math.PI * 2 + 0.2;
        leaf.rotation.y = angle;
        leaf.rotation.x = 0.24 + (i % 3) * 0.14;
        leaf.position.y = 0.02;
        leaf.castShadow = true;
        group.add(leaf);
      }
      break;
    }

    case 'anubias_nana': {
      const anubiasMat = new THREE.MeshStandardMaterial({
        color: 0x1c5936,
        roughness: 0.28, // Waxy dark green Anubias sheen underwater
        metalness: 0.06,
        side: THREE.DoubleSide,
      });
      attachPlantSway(anubiasMat, assets.swayTimeUniform, 0.025, 1.4, 0.45);

      const rhizomeMat = new THREE.MeshStandardMaterial({
        color: 0x365314,
        roughness: 0.8,
      });
      const rhizome = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.16, 4, 8), rhizomeMat);
      rhizome.rotation.z = Math.PI * 0.5;
      rhizome.position.y = 0.03;
      group.add(rhizome);

      for (let i = 0; i < 9; i++) {
        const leaf = new THREE.Mesh(createBroadLeafGeometry(0.115, 0.23), anubiasMat);
        const angle = (i / 9) * Math.PI * 2;
        leaf.position.set(Math.cos(angle) * 0.055, 0.045 + (i % 2) * 0.03, Math.sin(angle) * 0.055);
        leaf.rotation.y = angle;
        leaf.rotation.x = 0.52 + (i % 2) * 0.1;
        leaf.castShadow = true;
        group.add(leaf);
      }
      break;
    }

    case 'hairgrass_patch': {
      const grassMat = new THREE.MeshStandardMaterial({
        color: 0x5aa336,
        roughness: 0.58,
        metalness: 0.02,
        side: THREE.DoubleSide,
      });
      attachPlantSway(grassMat, assets.swayTimeUniform, 0.038, 2.0, 0.35);

      for (let i = 0; i < 24; i++) {
        const h = 0.15 + ((seed + i * 13) % 7) * 0.024;
        const blade = new THREE.Mesh(createRibbonLeafGeometry(0.018, h, 5), grassMat);
        const angle = i * 2.39996;
        const dist = Math.sqrt(i / 24) * 0.28;
        blade.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
        blade.rotation.y = angle;
        blade.rotation.x = 0.14 + (i % 3) * 0.09;
        group.add(blade);
      }
      break;
    }

    case 'catappa_leaf': {
      const leafMat = new THREE.MeshStandardMaterial({
        map: assets.woodTexture,
        color: 0x8a4722,
        roughness: 0.78,
        metalness: 0.04,
        side: THREE.DoubleSide,
      });
      const leaf = new THREE.Mesh(createBroadLeafGeometry(0.24, 0.44), leafMat);
      leaf.rotation.x = Math.PI * 0.47;
      leaf.rotation.z = 0.12;
      leaf.position.y = 0.032;
      leaf.receiveShadow = true;
      group.add(leaf);

      const stemMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.1, 6), stemMat);
      stem.rotation.x = Math.PI * 0.5;
      stem.position.set(0, 0.03, -0.03);
      group.add(stem);
      break;
    }

    case 'floating_frogbit': {
      const padMat = new THREE.MeshStandardMaterial({
        color: 0x65a30d,
        roughness: 0.42,
        metalness: 0.02,
      });
      const rootMat = new THREE.MeshStandardMaterial({
        color: 0xd6d3d1,
        roughness: 0.8,
        transparent: true,
        opacity: 0.68,
      });
      attachPlantSway(rootMat, assets.swayTimeUniform, 0.055, 1.3, 0.55);

      const padOffsets = [
        { x: 0, z: 0, r: 0.11 },
        { x: 0.13, z: 0.07, r: 0.085 },
        { x: -0.11, z: 0.09, r: 0.09 },
        { x: 0.04, z: -0.12, r: 0.075 },
        { x: -0.09, z: -0.08, r: 0.065 },
      ];
      padOffsets.forEach((p, idx) => {
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r * 0.94, 0.015, 18), padMat);
        pad.position.set(p.x, idx * 0.003, p.z);
        group.add(pad);
      });

      for (let r = 0; r < 8; r++) {
        const len = 0.28 + (r % 3) * 0.12;
        const root = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.0015, len, 6), rootMat);
        root.position.set((r - 3.5) * 0.032, -len * 0.5, ((r * 7) % 5 - 2) * 0.028);
        group.add(root);
      }
      break;
    }
  }

  return group;
}

function addFeatheryMossCushion(
  parent: THREE.Group,
  cx: number,
  cy: number,
  cz: number,
  radius: number,
  swayTimeUniform: { value: number }
): void {
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x2f5e1e,
    roughness: 0.88,
  });
  const frondMat = new THREE.MeshStandardMaterial({
    color: 0x4b8b2b,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  attachPlantSway(frondMat, swayTimeUniform, 0.016, 1.5, 1.2);

  const cushion = new THREE.Group();
  cushion.position.set(cx, cy, cz);

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 2), coreMat);
  core.scale.set(1.05, 0.36, 0.88);
  core.castShadow = true;
  cushion.add(core);

  // Add 18 organic moss frond tufts sprouting from the pad surface
  const frondGeo = createBroadLeafGeometry(0.045, 0.095);
  for (let i = 0; i < 18; i++) {
    const frond = new THREE.Mesh(frondGeo, frondMat);
    const angle = i * 2.39996;
    const dist = Math.sqrt(i / 18) * radius * 0.92;
    frond.position.set(
      Math.cos(angle) * dist,
      0.015 + (1 - dist / radius) * 0.035,
      Math.sin(angle) * dist * 0.82
    );
    frond.rotation.y = angle;
    frond.rotation.x = 0.45 + (i % 3) * 0.22;
    cushion.add(frond);
  }

  parent.add(cushion);
}

/**
 * High-subdivision sculpted sedimentary Seiryu rock geometry (smooth natural strata ridges).
 */
function createHighDetailSeiryuGeometry(
  rx: number,
  ry: number,
  rz: number,
  seed: number
): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 3);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let vx = pos.getX(i);
    let vy = pos.getY(i);
    let vz = pos.getZ(i);

    // Multi-frequency natural rock strata & sharp diagonal cleavage planes
    const strata = Math.sin((vx * 3.8 + vy * 5.2) + seed) * 0.14;
    const crag = Math.cos(vz * 4.6 - vx * 3.1 + seed * 0.7) * 0.12;
    const micro = Math.sin(vx * 9.5 + vy * 8.2 + vz * 9.1) * 0.035;
    const disp = 1 + strata + crag + micro;

    vx *= rx * disp;
    vy = (vy * 0.5 + 0.36) * ry * (1 + strata * 0.65);
    vz *= rz * (1 + crag * 0.75);

    pos.setXYZ(i, vx, Math.max(-0.04, vy), vz);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Organic tapered driftwood branch geometry (thick gnarled base -> slender tip).
 */
function createTaperedBranchGeometry(
  curve: THREE.CatmullRomCurve3,
  tubularSegments: number,
  radiusStart: number,
  radiusEnd: number
): THREE.BufferGeometry {
  const radialSegments = 10;
  const geo = new THREE.TubeGeometry(curve, tubularSegments, 1, radialSegments, false);
  const pos = geo.attributes.position;
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    const radius = THREE.MathUtils.lerp(radiusStart, radiusEnd, Math.pow(t, 0.78));
    curve.getPointAt(t, p);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    for (let j = 0; j <= radialSegments; j++) {
      const idx = i * (radialSegments + 1) + j;
      const v = (j / radialSegments) * Math.PI * 2;
      const barkFlute = 1 + Math.sin(v * 3 + t * 8) * 0.14;
      const sin = Math.sin(v);
      const cos = -Math.cos(v);

      n.x = cos * N.x + sin * B.x;
      n.y = cos * N.y + sin * B.y;
      n.z = cos * N.z + sin * B.z;
      n.normalize();

      pos.setXYZ(
        idx,
        p.x + radius * barkFlute * n.x,
        p.y + radius * barkFlute * n.y,
        p.z + radius * barkFlute * n.z
      );
    }
  }

  geo.computeVertexNormals();
  return geo;
}

function createRibbonLeafGeometry(
  width: number,
  height: number,
  segmentsY: number
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, height, 2, segmentsY);
  geo.translate(0, height * 0.5, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = y / height;
    const taper = Math.sin(t * Math.PI * 0.88 + 0.12);
    pos.setX(i, pos.getX(i) * taper);
    pos.setZ(i, Math.sin(t * Math.PI) * 0.045);
  }
  geo.computeVertexNormals();
  return geo;
}

function createBroadLeafGeometry(width: number, length: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, length, 4, 8);
  geo.translate(0, length * 0.5, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    const t = THREE.MathUtils.clamp(y / length, 0, 1);
    const profile = Math.sin(Math.pow(t, 0.72) * Math.PI);
    pos.setX(i, x * profile * 1.25);
    pos.setZ(i, Math.abs(x) * 0.18 - Math.sin(t * Math.PI) * 0.032);
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
