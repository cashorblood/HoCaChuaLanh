import * as THREE from 'three';
import { FISH_CATALOG, FishCatalogItem, FishInstanceData } from '../types/aquarium';
import { createFinSilkTexture, createFishBodyTexture } from './proceduralTextures';
import { groundHeightAt, TANK_DEPTH, TANK_WIDTH } from './aquascapeBuilder';

export interface FishAgent {
  id: string;
  data: FishInstanceData;
  spec: FishCatalogItem;
  root: THREE.Group;
  gillLeft: THREE.Mesh;
  gillRight: THREE.Mesh;
  pectoralLeft: THREE.Mesh;
  pectoralRight: THREE.Mesh;
  tailMesh: THREE.Mesh;
  dorsalMesh: THREE.Mesh;
  swimUniform: { value: number };
  speedUniform: { value: number };
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  target: THREE.Vector3;
  retargetTimer: number;
  flareFactor: number; // 0..1 when Betta flares at mirror
  phaseOffset: number;
}

export interface FoodPellet {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  eaten: boolean;
  age: number;
}

// Reusable scratch vectors outside render loop (zero GC)
const _steer = new THREE.Vector3();
const _diff = new THREE.Vector3();
const _desiredDir = new THREE.Vector3();
const _schoolCenter = new THREE.Vector3();
const _schoolVel = new THREE.Vector3();
const _quatTarget = new THREE.Quaternion();
const _lookMat = new THREE.Matrix4();
const _upVec = new THREE.Vector3(0, 1, 0);
const _zeroVec = new THREE.Vector3(0, 0, 0);

function attachSilkWaveShader(
  material: THREE.MeshPhysicalMaterial,
  swimUniform: { value: number },
  speedUniform: { value: number },
  waveScale: number
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSwimPhase = swimUniform;
    shader.uniforms.uSwimSpeed = speedUniform;
    shader.vertexShader =
      `uniform float uSwimPhase;\nuniform float uSwimSpeed;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float distFromBase = clamp(-position.z * 2.2, 0.0, 1.4);
        float amp = distFromBase * distFromBase * ${waveScale.toFixed(3)} * (0.55 + uSwimSpeed * 0.65);
        transformed.x += sin(uSwimPhase * 5.2 - distFromBase * 5.5 + position.y * 2.4) * amp;
        `
      );
  };
}

/**
 * Builds a 7-part composite 3D fish Group (sculpted body, gill covers, 2 eyes,
 * flowing caudal silk fan, dorsal ribbon, ventral fin, pectoral pair).
 */
export function createFishAgent(
  data: FishInstanceData,
  maxAnisotropy: number,
  waterLevel: number
): FishAgent {
  const spec = FISH_CATALOG.find((c) => c.id === data.morph) || FISH_CATALOG[0];
  const isBetta = data.species === 'betta';
  const isDumbo = data.morph.includes('dumbo');

  const swimUniform = { value: Math.random() * 10 };
  const speedUniform = { value: 0.5 };

  const root = new THREE.Group();
  root.name = `fish-${data.id}`;

  const bodyTex = createFishBodyTexture(spec, maxAnisotropy);
  const finTex = createFinSilkTexture(spec, maxAnisotropy);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    map: bodyTex,
    roughness: 0.26,
    metalness: 0.12,
    clearcoat: 0.85,
    clearcoatRoughness: 0.18,
    iridescence: isBetta ? 0.55 : 0.35,
    iridescenceIOR: 1.33,
  });

  const finMat = new THREE.MeshPhysicalMaterial({
    map: finTex,
    color: 0xffffff,
    roughness: 0.38,
    metalness: 0.05,
    transparent: true,
    opacity: isBetta ? 0.88 : 0.82,
    side: THREE.DoubleSide,
    depthWrite: false,
    iridescence: 0.4,
  });
  attachSilkWaveShader(finMat, swimUniform, speedUniform, isBetta ? 0.16 : 0.11);

  // 1. Primary Silhouette: Streamlined anatomical fish body along +Z (nose at +Z, tail at -Z)
  const bodyLength = isBetta ? 0.42 : 0.26;
  const bodyProfile: THREE.Vector2[] = [
    new THREE.Vector2(0.002, -bodyLength * 0.52),
    new THREE.Vector2(isBetta ? 0.032 : 0.022, -bodyLength * 0.36),
    new THREE.Vector2(isBetta ? 0.068 : 0.048, -bodyLength * 0.08),
    new THREE.Vector2(isBetta ? 0.074 : 0.052, bodyLength * 0.18),
    new THREE.Vector2(isBetta ? 0.048 : 0.034, bodyLength * 0.42),
    new THREE.Vector2(0.004, bodyLength * 0.52),
  ];
  const bodyGeo = new THREE.LatheGeometry(bodyProfile, 18);
  bodyGeo.rotateX(Math.PI * 0.5);
  bodyGeo.scale(0.62, 1.08, 1.0); // Laterally compressed like real Betta/Guppy

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true;
  root.add(bodyMesh);

  // 2. Operculum / Gill covers (flare outward when Betta inspects mirror!)
  const gillMat = new THREE.MeshStandardMaterial({
    color: spec.secondaryHex,
    roughness: 0.4,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const gillGeo = new THREE.CircleGeometry(isBetta ? 0.052 : 0.028, 10, -Math.PI * 0.45, Math.PI * 0.9);
  const gillLeft = new THREE.Mesh(gillGeo, gillMat);
  gillLeft.position.set(isBetta ? 0.038 : 0.024, -0.008, bodyLength * 0.24);
  gillLeft.rotation.y = Math.PI * 0.58;
  root.add(gillLeft);

  const gillRight = new THREE.Mesh(gillGeo, gillMat);
  gillRight.position.set(isBetta ? -0.038 : -0.024, -0.008, bodyLength * 0.24);
  gillRight.rotation.y = -Math.PI * 0.58;
  root.add(gillRight);

  // 3. Glossy Eyes (Sclera + Pupil)
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.08 });
  const eyeRadius = isBetta ? 0.018 : 0.014;
  [-1, 1].forEach((side) => {
    const eyeGroup = new THREE.Group();
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius, 10, 10), eyeWhiteMat);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius * 0.65, 8, 8), pupilMat);
    pupil.position.set(side * eyeRadius * 0.48, 0, eyeRadius * 0.25);
    eyeGroup.add(sclera, pupil);
    eyeGroup.position.set(
      side * (isBetta ? 0.036 : 0.026),
      0.015,
      bodyLength * 0.35
    );
    root.add(eyeGroup);
  });

  // 4. Flowing Silk Caudal Tail Fan (Halfmoon 180-deg for Betta, Delta fan for Guppy)
  const tailGeo = createCaudalFanGeometry(
    isBetta ? 0.42 : 0.23,
    isBetta ? Math.PI * 0.96 : Math.PI * 0.62,
    14,
    10
  );
  const tailMesh = new THREE.Mesh(tailGeo, finMat);
  tailMesh.position.set(0, 0, -bodyLength * 0.46);
  tailMesh.renderOrder = 2;
  root.add(tailMesh);

  // 5. Dorsal Fin & Anal/Ventral Ribbon Fins
  const dorsalGeo = createDorsalFinGeometry(
    isBetta ? 0.28 : 0.13,
    isBetta ? 0.22 : 0.095
  );
  const dorsalMesh = new THREE.Mesh(dorsalGeo, finMat);
  dorsalMesh.position.set(0, isBetta ? 0.055 : 0.036, isBetta ? -0.04 : -0.02);
  dorsalMesh.renderOrder = 2;
  root.add(dorsalMesh);

  if (isBetta) {
    const analGeo = createDorsalFinGeometry(0.3, 0.2);
    const analMesh = new THREE.Mesh(analGeo, finMat);
    analMesh.scale.y = -1;
    analMesh.position.set(0, -0.05, -0.05);
    analMesh.renderOrder = 2;
    root.add(analMesh);
  }

  // 6. Pectoral Fins (extra wide & expressive on Dumbo Ear morphs!)
  const pecRadius = isDumbo ? (isBetta ? 0.135 : 0.085) : isBetta ? 0.075 : 0.045;
  const pecGeo = new THREE.CircleGeometry(pecRadius, 12, -Math.PI * 0.38, Math.PI * 0.76);
  pecGeo.translate(pecRadius * 0.55, 0, 0);
  const pecMat = new THREE.MeshPhysicalMaterial({
    color: isDumbo ? spec.accentHex : spec.finHex,
    roughness: 0.3,
    transparent: true,
    opacity: isDumbo ? 0.85 : 0.58,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const pectoralLeft = new THREE.Mesh(pecGeo, pecMat);
  pectoralLeft.position.set(isBetta ? 0.04 : 0.026, -0.015, bodyLength * 0.16);
  pectoralLeft.rotation.y = -0.5;
  pectoralLeft.renderOrder = 3;
  root.add(pectoralLeft);

  const pectoralRight = new THREE.Mesh(pecGeo, pecMat);
  pectoralRight.scale.x = -1;
  pectoralRight.position.set(isBetta ? -0.04 : -0.026, -0.015, bodyLength * 0.16);
  pectoralRight.rotation.y = 0.5;
  pectoralRight.renderOrder = 3;
  root.add(pectoralRight);

  const baseScale = data.scale * (isBetta ? 1.05 : 0.95);
  root.scale.setScalar(baseScale);

  const startPos = new THREE.Vector3(
    (Math.random() - 0.5) * 2.8,
    0.85 + Math.random() * (waterLevel - 1.15),
    (Math.random() - 0.5) * 1.4
  );
  root.position.copy(startPos);

  return {
    id: data.id,
    data,
    spec,
    root,
    gillLeft,
    gillRight,
    pectoralLeft,
    pectoralRight,
    tailMesh,
    dorsalMesh,
    swimUniform,
    speedUniform,
    position: startPos,
    velocity: new THREE.Vector3((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.3),
    target: startPos.clone(),
    retargetTimer: Math.random() * 2,
    flareFactor: 0,
    phaseOffset: Math.random() * Math.PI * 2,
  };
}

function createCaudalFanGeometry(
  length: number,
  spreadAngle: number,
  radialSegs: number,
  lengthSegs: number
): THREE.BufferGeometry {
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= lengthSegs; i++) {
    const u = i / lengthSegs; // 0 at base, 1 at outer fringe
    const z = -u * length;
    const radiusY = 0.025 + Math.sin(u * Math.PI * 0.65) * length * Math.sin(spreadAngle * 0.5);

    for (let j = 0; j <= radialSegs; j++) {
      const v = j / radialSegs; // 0..1 bottom to top
      const angle = (v - 0.5) * spreadAngle;
      const y = Math.sin(angle) * radiusY * (0.25 + 0.75 * u);
      const x = Math.sin(v * Math.PI * 4) * 0.012 * u; // Subtle natural pleating

      vertices.push(x, y, z);
      uvs.push(u, v);
    }
  }

  const row = radialSegs + 1;
  for (let i = 0; i < lengthSegs; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * row + j;
      const b = (i + 1) * row + j;
      const c = (i + 1) * row + (j + 1);
      const d = i * row + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createDorsalFinGeometry(length: number, height: number): THREE.BufferGeometry {
  const segsX = 8;
  const segsY = 4;
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segsX; i++) {
    const u = i / segsX;
    const zBase = (0.35 - u) * length;
    for (let j = 0; j <= segsY; j++) {
      const v = j / segsY;
      const arch = Math.sin(Math.pow(u, 0.7) * Math.PI);
      const y = v * height * (0.35 + 0.65 * arch);
      const z = zBase - v * height * 0.55; // Sweeps gracefully backward toward tail
      const x = Math.sin(u * Math.PI * 2) * 0.008 * v;
      vertices.push(x, y, z);
      uvs.push(u, v);
    }
  }

  const row = segsY + 1;
  for (let i = 0; i < segsX; i++) {
    for (let j = 0; j < segsY; j++) {
      const a = i * row + j;
      const b = (i + 1) * row + j;
      const c = (i + 1) * row + (j + 1);
      const d = i * row + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Updates autonomous swimming, schooling (Guppy), solitary hovering & mirror flaring (Betta),
 * food chasing, and glass-tap curiosity with zero per-frame allocations.
 */
export function updateFishAgents(
  agents: FishAgent[],
  pellets: FoodPellet[],
  dt: number,
  elapsed: number,
  waterLevel: number,
  mirrorActive: boolean,
  tapPoint: THREE.Vector3 | null,
  tapTimer: number
): void {
  const halfW = TANK_WIDTH * 0.5 - 0.38;
  const halfD = TANK_DEPTH * 0.5 - 0.34;
  const maxY = waterLevel - 0.18;

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const isBetta = agent.data.species === 'betta';
    agent.retargetTimer -= dt;

    // 1. Determine priority target: Food -> Mirror (for Betta) -> Glass Tap -> Schooling/Wander
    let chasingFood = false;
    let nearestFoodDist = 999;
    let nearestPellet: FoodPellet | null = null;

    for (let p = 0; p < pellets.length; p++) {
      const pel = pellets[p];
      if (pel.eaten) continue;
      const d = agent.position.distanceTo(pel.position);
      if (d < nearestFoodDist && d < 2.8) {
        nearestFoodDist = d;
        nearestPellet = pel;
      }
    }

    let wantFlare = 0;

    if (nearestPellet) {
      chasingFood = true;
      agent.target.copy(nearestPellet.position);
      if (nearestFoodDist < 0.18) {
        nearestPellet.eaten = true;
      }
    } else if (isBetta && mirrorActive) {
      // Swim toward the right glass inspection mirror and flare!
      agent.target.set(
        halfW - 0.14,
        1.25 + Math.sin(elapsed * 1.4 + agent.phaseOffset) * 0.18,
        Math.sin(elapsed * 0.9 + agent.phaseOffset) * 0.25
      );
      if (agent.position.x > halfW - 0.65) {
        wantFlare = 1;
      }
    } else if (tapPoint && tapTimer > 0) {
      // Curious reaction to gentle finger tap on glass
      agent.target.set(
        THREE.MathUtils.clamp(tapPoint.x + Math.sin(i * 2.1) * 0.24, -halfW, halfW),
        THREE.MathUtils.clamp(tapPoint.y + Math.cos(i * 1.7) * 0.16, 0.55, maxY),
        THREE.MathUtils.clamp(tapPoint.z, -halfD, halfD)
      );
    } else if (agent.retargetTimer <= 0) {
      agent.retargetTimer = isBetta ? 3.2 + Math.random() * 3.5 : 1.6 + Math.random() * 2.2;
      // Occasional surface air-sipping for Betta (labyrinth organ behavior)
      const sipSurface = isBetta && Math.random() < 0.18;
      const tx = (Math.random() - 0.5) * (halfW * 1.85);
      const tz = (Math.random() - 0.5) * (halfD * 1.8);
      const minFloor = groundHeightAt(tx, tz) + (isBetta ? 0.28 : 0.34);
      const ty = sipSurface
        ? maxY - 0.04
        : THREE.MathUtils.lerp(minFloor, maxY - 0.08, isBetta ? Math.random() * 0.85 : 0.35 + Math.random() * 0.6);
      agent.target.set(tx, ty, tz);
    }

    // 2. Compute steering forces
    _steer.copy(agent.target).sub(agent.position);
    const distToTarget = _steer.length();
    const maxSpeed = chasingFood
      ? isBetta ? 1.15 : 1.45
      : isBetta ? 0.44 : 0.78;

    if (distToTarget > 0.001) {
      _steer.normalize().multiplyScalar(
        distToTarget < 0.45 && !chasingFood ? maxSpeed * (distToTarget / 0.45) : maxSpeed
      );
    }

    // Guppy schooling (cohesion + alignment + separation)
    if (!isBetta && !chasingFood) {
      let neighbors = 0;
      _schoolCenter.set(0, 0, 0);
      _schoolVel.set(0, 0, 0);

      for (let j = 0; j < agents.length; j++) {
        if (i === j) continue;
        const other = agents[j];
        const d = agent.position.distanceTo(other.position);
        if (d < 0.32 && d > 0.001) {
          // Soft separation
          _diff.copy(agent.position).sub(other.position).normalize().multiplyScalar(0.38);
          _steer.add(_diff);
        } else if (other.data.species === 'guppy' && d < 1.35) {
          _schoolCenter.add(other.position);
          _schoolVel.add(other.velocity);
          neighbors++;
        }
      }

      if (neighbors > 0) {
        _schoolCenter.divideScalar(neighbors).sub(agent.position).multiplyScalar(0.32);
        _schoolVel.divideScalar(neighbors).multiplyScalar(0.28);
        _steer.add(_schoolCenter).add(_schoolVel);
      }
    } else if (isBetta) {
      // Keep polite distance from other fish
      for (let j = 0; j < agents.length; j++) {
        if (i === j) continue;
        const d = agent.position.distanceTo(agents[j].position);
        if (d < 0.48 && d > 0.001) {
          _diff.copy(agent.position).sub(agents[j].position).normalize().multiplyScalar(0.45);
          _steer.add(_diff);
        }
      }
    }

    // Smooth exponential velocity damping
    const accelLambda = isBetta ? 2.4 : 3.8;
    agent.velocity.x = THREE.MathUtils.damp(agent.velocity.x, _steer.x, accelLambda, dt);
    agent.velocity.y = THREE.MathUtils.damp(agent.velocity.y, _steer.y, accelLambda, dt);
    agent.velocity.z = THREE.MathUtils.damp(agent.velocity.z, _steer.z, accelLambda, dt);

    agent.position.addScaledVector(agent.velocity, dt);

    // Soft tank boundary & substrate floor clamp
    const floorY = groundHeightAt(agent.position.x, agent.position.z) + 0.22;
    agent.position.x = THREE.MathUtils.clamp(agent.position.x, -halfW, halfW);
    agent.position.z = THREE.MathUtils.clamp(agent.position.z, -halfD, halfD);
    agent.position.y = THREE.MathUtils.clamp(agent.position.y, floorY, maxY);

    // Subtle hovering buoyancy bobbing
    const hoverBob = Math.sin(elapsed * 2.1 + agent.phaseOffset) * 0.008;
    agent.root.position.set(agent.position.x, agent.position.y + hoverBob, agent.position.z);

    // Smooth orientation toward movement direction (or toward mirror when flaring!)
    const speed = agent.velocity.length();
    if (wantFlare > 0.5) {
      _desiredDir.set(0.35, 0, Math.cos(elapsed * 0.8 + agent.phaseOffset) >= 0 ? 0.93 : -0.93).normalize();
    } else if (speed > 0.025) {
      _desiredDir.copy(agent.velocity).normalize();
      _desiredDir.y = THREE.MathUtils.clamp(_desiredDir.y, -0.42, 0.48);
      _desiredDir.normalize();
    } else {
      agent.root.getWorldDirection(_desiredDir);
      _desiredDir.y *= 0.85;
      if (_desiredDir.lengthSq() < 0.01) _desiredDir.set(1, 0, 0);
      _desiredDir.normalize();
    }

    _lookMat.lookAt(_desiredDir, _zeroVec, _upVec);
    _quatTarget.setFromRotationMatrix(_lookMat);
    agent.root.quaternion.slerp(_quatTarget, 1 - Math.exp(-5.2 * dt));

    // Animate Betta mirror flaring (gill covers open + tail & dorsal spread 28% wider!)
    agent.flareFactor = THREE.MathUtils.damp(agent.flareFactor, wantFlare, 4.5, dt);
    const baseScale = agent.data.scale * (isBetta ? 1.05 : 0.95);
    agent.root.scale.setScalar(baseScale);

    agent.gillLeft.rotation.y = Math.PI * 0.58 - agent.flareFactor * 0.52;
    agent.gillRight.rotation.y = -Math.PI * 0.58 + agent.flareFactor * 0.52;
    agent.tailMesh.scale.set(1, 1 + agent.flareFactor * 0.28, 1 + agent.flareFactor * 0.12);
    agent.dorsalMesh.scale.set(1, 1 + agent.flareFactor * 0.26, 1);

    // Pectoral fin flutter
    const flutterFreq = isBetta ? 6.5 : 11.0;
    const flutterAmp = 0.35 + Math.min(speed, 1.0) * 0.25;
    agent.pectoralLeft.rotation.y = -0.45 + Math.sin(elapsed * flutterFreq + agent.phaseOffset) * flutterAmp;
    agent.pectoralRight.rotation.y = 0.45 - Math.sin(elapsed * flutterFreq + agent.phaseOffset) * flutterAmp;

    // Drive GPU silk fin wave shader
    agent.speedUniform.value = THREE.MathUtils.clamp(speed / maxSpeed, 0.15, 1.4) + agent.flareFactor * 0.4;
    agent.swimUniform.value += dt * (1.2 + speed * 2.8 + agent.flareFactor * 0.8);
  }
}
