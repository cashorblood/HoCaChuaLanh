import * as THREE from 'three';
import { FISH_CATALOG, FishCatalogItem, FishInstanceData } from '../types/aquarium';
import { createFinSilkTexture, createFishBodyTexture } from './proceduralTextures';
import { groundHeightAt, TANK_DEPTH, TANK_WIDTH } from './aquascapeBuilder';
import { glbRegistry } from './glbModelRegistry';

export interface FishAgent {
  id: string;
  data: FishInstanceData;
  spec: FishCatalogItem;
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  gillLeft: THREE.Mesh | null;
  gillRight: THREE.Mesh | null;
  pectoralLeft: THREE.Mesh | null;
  pectoralRight: THREE.Mesh | null;
  tailMesh: THREE.Mesh | null;
  dorsalMesh: THREE.Mesh | null;
  swimUniform: { value: number };
  speedUniform: { value: number };
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  target: THREE.Vector3;
  retargetTimer: number;
  flareFactor: number;
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

/**
 * Biomechanical S-curve travelling wave along the fish's entire spine (+Z nose to -Z tail peduncle).
 */
function attachBodySpineShader(
  material: THREE.Material,
  swimUniform: { value: number },
  speedUniform: { value: number },
  bodyLength: number
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
        float spineT = clamp((${(bodyLength * 0.52).toFixed(3)} - position.z) / ${bodyLength.toFixed(3)}, 0.0, 1.3);
        float spineAmp = spineT * spineT * 0.042 * (0.45 + uSwimSpeed * 0.7);
        transformed.x += sin(uSwimPhase * 5.2 - spineT * 4.2) * spineAmp;
        `
      );
  };
}

function attachSilkWaveShader(
  material: THREE.MeshPhysicalMaterial,
  swimUniform: { value: number },
  speedUniform: { value: number },
  waveScale: number,
  peduncleOffsetAmplitude: number
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
        float distFromBase = clamp(-position.z * 2.2, 0.0, 1.5);
        float peduncleX = sin(uSwimPhase * 5.2 - 4.2) * ${peduncleOffsetAmplitude.toFixed(4)} * (0.45 + uSwimSpeed * 0.7);
        float amp = distFromBase * distFromBase * ${waveScale.toFixed(3)} * (0.5 + uSwimSpeed * 0.68);
        transformed.x += peduncleX + sin(uSwimPhase * 5.2 - 4.2 - distFromBase * 5.2 + position.y * 2.8) * amp;
        `
      );
  };
}

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

  const startPos = new THREE.Vector3(
    (Math.random() - 0.5) * 2.8,
    0.85 + Math.random() * (waterLevel - 1.15),
    (Math.random() - 0.5) * 1.4
  );

  // 1. Check if a custom sculpted .glb model is registered for 'betta' or 'guppy'!
  const customGlb = glbRegistry.instantiateSlot(isBetta ? 'betta' : 'guppy');
  if (customGlb) {
    const root = new THREE.Group();
    root.name = `fish-${data.id}`;
    root.add(customGlb.root);

    // If the .glb has no embedded skeletal animation, apply gentle GPU spine undulation!
    if (!customGlb.mixer) {
      customGlb.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material) {
          const clonedMat = (obj.material as THREE.Material).clone();
          attachBodySpineShader(clonedMat, swimUniform, speedUniform, isBetta ? 0.6 : 0.4);
          obj.material = clonedMat;
        }
      });
    }

    root.scale.setScalar(data.scale);
    root.position.copy(startPos);

    return {
      id: data.id,
      data,
      spec,
      root,
      mixer: customGlb.mixer,
      gillLeft: null,
      gillRight: null,
      pectoralLeft: null,
      pectoralRight: null,
      tailMesh: null,
      dorsalMesh: null,
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

  // 2. High-Detail Sculpted Anatomical Fish with Full-Spine Wave & Gossamer Silk Rayed Fins
  const root = new THREE.Group();
  root.name = `fish-${data.id}`;

  const bodyTex = createFishBodyTexture(spec, maxAnisotropy);
  const finTex = createFinSilkTexture(spec, maxAnisotropy);

  const bodyLength = isBetta ? 0.43 : 0.27;

  const bodyMat = new THREE.MeshPhysicalMaterial({
    map: bodyTex,
    roughness: 0.2,
    metalness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
    iridescence: isBetta ? 0.68 : 0.48,
    iridescenceIOR: 1.35,
    sheen: 0.4,
    sheenColor: new THREE.Color(spec.accentHex),
  });
  attachBodySpineShader(bodyMat, swimUniform, speedUniform, bodyLength);

  const finMat = new THREE.MeshPhysicalMaterial({
    map: finTex,
    color: 0xffffff,
    roughness: 0.32,
    metalness: 0.04,
    transparent: true,
    opacity: isBetta ? 0.92 : 0.86,
    alphaTest: 0.02,
    side: THREE.DoubleSide,
    depthWrite: false,
    iridescence: 0.52,
    sheen: 0.6,
    sheenColor: new THREE.Color(spec.accentHex),
  });
  attachSilkWaveShader(
    finMat,
    swimUniform,
    speedUniform,
    isBetta ? 0.17 : 0.115,
    0.042
  );

  // High-subdivision anatomical fish body profile (11 control points, 28 radial segs)
  const bodyProfile: THREE.Vector2[] = [
    new THREE.Vector2(0.002, -bodyLength * 0.52),
    new THREE.Vector2(isBetta ? 0.024 : 0.016, -bodyLength * 0.42),
    new THREE.Vector2(isBetta ? 0.042 : 0.028, -bodyLength * 0.26),
    new THREE.Vector2(isBetta ? 0.064 : 0.045, -bodyLength * 0.08),
    new THREE.Vector2(isBetta ? 0.075 : 0.053, bodyLength * 0.12),
    new THREE.Vector2(isBetta ? 0.068 : 0.048, bodyLength * 0.28),
    new THREE.Vector2(isBetta ? 0.048 : 0.035, bodyLength * 0.41),
    new THREE.Vector2(isBetta ? 0.024 : 0.018, bodyLength * 0.49),
    new THREE.Vector2(0.003, bodyLength * 0.53),
  ];
  const bodyGeo = new THREE.LatheGeometry(bodyProfile, 28);
  bodyGeo.rotateX(Math.PI * 0.5);
  bodyGeo.scale(0.58, 1.08, 1.0);

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true;
  root.add(bodyMesh);

  // Operculum / Gill covers
  const gillMat = new THREE.MeshStandardMaterial({
    color: spec.secondaryHex,
    roughness: 0.35,
    metalness: 0.12,
    side: THREE.DoubleSide,
  });
  const gillGeo = new THREE.CircleGeometry(
    isBetta ? 0.052 : 0.028,
    14,
    -Math.PI * 0.45,
    Math.PI * 0.9
  );
  const gillLeft = new THREE.Mesh(gillGeo, gillMat);
  gillLeft.position.set(isBetta ? 0.038 : 0.024, -0.008, bodyLength * 0.24);
  gillLeft.rotation.y = Math.PI * 0.58;
  root.add(gillLeft);

  const gillRight = new THREE.Mesh(gillGeo, gillMat);
  gillRight.position.set(isBetta ? -0.038 : -0.024, -0.008, bodyLength * 0.24);
  gillRight.rotation.y = -Math.PI * 0.58;
  root.add(gillRight);

  // Glossy Eyes (Metallic gold iris ring + deep black pupil)
  const irisMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    roughness: 0.18,
    metalness: 0.5,
  });
  const pupilMat = new THREE.MeshPhysicalMaterial({
    color: 0x050811,
    roughness: 0.04,
    clearcoat: 1.0,
  });
  const eyeRadius = isBetta ? 0.018 : 0.014;
  [-1, 1].forEach((side) => {
    const eyeGroup = new THREE.Group();
    const iris = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius, 12, 12), irisMat);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius * 0.72, 10, 10), pupilMat);
    pupil.position.set(side * eyeRadius * 0.42, 0, eyeRadius * 0.22);
    eyeGroup.add(iris, pupil);
    eyeGroup.position.set(side * (isBetta ? 0.035 : 0.025), 0.015, bodyLength * 0.35);
    root.add(eyeGroup);
  });

  // High-subdivision Silk Caudal Tail Fan (22 radial x 14 length segments)
  const tailGeo = createCaudalFanGeometry(
    isBetta ? 0.45 : 0.24,
    isBetta ? Math.PI * 0.98 : Math.PI * 0.65,
    22,
    14
  );
  const tailMesh = new THREE.Mesh(tailGeo, finMat);
  tailMesh.position.set(0, 0, -bodyLength * 0.45);
  tailMesh.renderOrder = 2;
  root.add(tailMesh);

  // Dorsal & Anal Ribbon Fins
  const dorsalGeo = createDorsalFinGeometry(isBetta ? 0.3 : 0.14, isBetta ? 0.23 : 0.1);
  const dorsalMesh = new THREE.Mesh(dorsalGeo, finMat);
  dorsalMesh.position.set(0, isBetta ? 0.055 : 0.036, isBetta ? -0.04 : -0.02);
  dorsalMesh.renderOrder = 2;
  root.add(dorsalMesh);

  if (isBetta) {
    const analGeo = createDorsalFinGeometry(0.32, 0.21);
    const analMesh = new THREE.Mesh(analGeo, finMat);
    analMesh.scale.y = -1;
    analMesh.position.set(0, -0.05, -0.05);
    analMesh.renderOrder = 2;
    root.add(analMesh);

    // Delicate pair of long ventral "tie" fins under Betta's chest
    const ventralGeo = createRibbonVentralGeometry(0.028, 0.22);
    const vLeft = new THREE.Mesh(ventralGeo, finMat);
    vLeft.position.set(0.014, -0.052, bodyLength * 0.12);
    vLeft.rotation.x = -0.35;
    vLeft.rotation.z = 0.12;
    const vRight = vLeft.clone();
    vRight.position.x = -0.014;
    vRight.rotation.z = -0.12;
    root.add(vLeft, vRight);
  }

  // Pectoral Fins
  const pecRadius = isDumbo ? (isBetta ? 0.14 : 0.088) : isBetta ? 0.078 : 0.048;
  const pecGeo = new THREE.CircleGeometry(pecRadius, 16, -Math.PI * 0.38, Math.PI * 0.76);
  pecGeo.translate(pecRadius * 0.55, 0, 0);
  const pecMat = new THREE.MeshPhysicalMaterial({
    map: isDumbo ? finTex : null,
    color: isDumbo ? 0xffffff : spec.finHex,
    roughness: 0.28,
    transparent: true,
    opacity: isDumbo ? 0.88 : 0.52,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const pectoralLeft = new THREE.Mesh(pecGeo, pecMat);
  pectoralLeft.position.set(isBetta ? 0.039 : 0.026, -0.015, bodyLength * 0.16);
  pectoralLeft.rotation.y = -0.5;
  pectoralLeft.renderOrder = 3;
  root.add(pectoralLeft);

  const pectoralRight = new THREE.Mesh(pecGeo, pecMat);
  pectoralRight.scale.x = -1;
  pectoralRight.position.set(isBetta ? -0.039 : -0.026, -0.015, bodyLength * 0.16);
  pectoralRight.rotation.y = 0.5;
  pectoralRight.renderOrder = 3;
  root.add(pectoralRight);

  const baseScale = data.scale * (isBetta ? 1.05 : 0.95);
  root.scale.setScalar(baseScale);
  root.position.copy(startPos);

  return {
    id: data.id,
    data,
    spec,
    root,
    mixer: null,
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

function createRibbonVentralGeometry(width: number, length: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, length, 2, 6);
  geo.translate(0, -length * 0.5, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = -pos.getY(i);
    const t = y / length;
    pos.setX(i, pos.getX(i) * (1 - t * 0.85));
    pos.setZ(i, -t * t * 0.08);
  }
  geo.computeVertexNormals();
  return geo;
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
    const u = i / lengthSegs;
    const z = -u * length;
    const radiusY = 0.025 + Math.sin(u * Math.PI * 0.65) * length * Math.sin(spreadAngle * 0.5);

    for (let j = 0; j <= radialSegs; j++) {
      const v = j / radialSegs;
      const angle = (v - 0.5) * spreadAngle;
      const y = Math.sin(angle) * radiusY * (0.24 + 0.76 * u);
      const x = Math.sin(v * Math.PI * 5) * 0.015 * u; // Natural silk fin pleating

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
  const segsX = 12;
  const segsY = 6;
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
      const z = zBase - v * height * 0.55;
      const x = Math.sin(u * Math.PI * 3) * 0.009 * v;
      vertices.push(x, y, z);
      uvs.push(v, u);
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
      agent.target.set(
        halfW - 0.14,
        1.25 + Math.sin(elapsed * 1.4 + agent.phaseOffset) * 0.18,
        Math.sin(elapsed * 0.9 + agent.phaseOffset) * 0.25
      );
      if (agent.position.x > halfW - 0.65) {
        wantFlare = 1;
      }
    } else if (tapPoint && tapTimer > 0) {
      agent.target.set(
        THREE.MathUtils.clamp(tapPoint.x + Math.sin(i * 2.1) * 0.24, -halfW, halfW),
        THREE.MathUtils.clamp(tapPoint.y + Math.cos(i * 1.7) * 0.16, 0.55, maxY),
        THREE.MathUtils.clamp(tapPoint.z, -halfD, halfD)
      );
    } else if (agent.retargetTimer <= 0) {
      agent.retargetTimer = isBetta ? 3.2 + Math.random() * 3.5 : 1.6 + Math.random() * 2.2;
      const sipSurface = isBetta && Math.random() < 0.18;
      const tx = (Math.random() - 0.5) * (halfW * 1.85);
      const tz = (Math.random() - 0.5) * (halfD * 1.8);
      const minFloor = groundHeightAt(tx, tz) + (isBetta ? 0.28 : 0.34);
      const ty = sipSurface
        ? maxY - 0.04
        : THREE.MathUtils.lerp(
            minFloor,
            maxY - 0.08,
            isBetta ? Math.random() * 0.85 : 0.35 + Math.random() * 0.6
          );
      agent.target.set(tx, ty, tz);
    }

    _steer.copy(agent.target).sub(agent.position);
    const distToTarget = _steer.length();
    const maxSpeed = chasingFood ? (isBetta ? 1.15 : 1.45) : isBetta ? 0.44 : 0.78;

    if (distToTarget > 0.001) {
      _steer
        .normalize()
        .multiplyScalar(
          distToTarget < 0.45 && !chasingFood ? maxSpeed * (distToTarget / 0.45) : maxSpeed
        );
    }

    if (!isBetta && !chasingFood) {
      let neighbors = 0;
      _schoolCenter.set(0, 0, 0);
      _schoolVel.set(0, 0, 0);

      for (let j = 0; j < agents.length; j++) {
        if (i === j) continue;
        const other = agents[j];
        const d = agent.position.distanceTo(other.position);
        if (d < 0.32 && d > 0.001) {
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
      for (let j = 0; j < agents.length; j++) {
        if (i === j) continue;
        const d = agent.position.distanceTo(agents[j].position);
        if (d < 0.48 && d > 0.001) {
          _diff.copy(agent.position).sub(agents[j].position).normalize().multiplyScalar(0.45);
          _steer.add(_diff);
        }
      }
    }

    const accelLambda = isBetta ? 2.4 : 3.8;
    agent.velocity.x = THREE.MathUtils.damp(agent.velocity.x, _steer.x, accelLambda, dt);
    agent.velocity.y = THREE.MathUtils.damp(agent.velocity.y, _steer.y, accelLambda, dt);
    agent.velocity.z = THREE.MathUtils.damp(agent.velocity.z, _steer.z, accelLambda, dt);

    agent.position.addScaledVector(agent.velocity, dt);

    const floorY = groundHeightAt(agent.position.x, agent.position.z) + 0.22;
    agent.position.x = THREE.MathUtils.clamp(agent.position.x, -halfW, halfW);
    agent.position.z = THREE.MathUtils.clamp(agent.position.z, -halfD, halfD);
    agent.position.y = THREE.MathUtils.clamp(agent.position.y, floorY, maxY);

    const hoverBob = Math.sin(elapsed * 2.1 + agent.phaseOffset) * 0.008;
    agent.root.position.set(agent.position.x, agent.position.y + hoverBob, agent.position.z);

    const speed = agent.velocity.length();
    if (wantFlare > 0.5) {
      _desiredDir
        .set(0.35, 0, Math.cos(elapsed * 0.8 + agent.phaseOffset) >= 0 ? 0.93 : -0.93)
        .normalize();
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

    agent.flareFactor = THREE.MathUtils.damp(agent.flareFactor, wantFlare, 4.5, dt);

    // Update GLTF skeletal AnimationMixer if present
    if (agent.mixer) {
      agent.mixer.timeScale = 0.75 + Math.min(speed / maxSpeed, 1.5);
      agent.mixer.update(dt);
    }

    if (agent.gillLeft && agent.gillRight) {
      agent.gillLeft.rotation.y = Math.PI * 0.58 - agent.flareFactor * 0.52;
      agent.gillRight.rotation.y = -Math.PI * 0.58 + agent.flareFactor * 0.52;
    }
    if (agent.tailMesh && agent.dorsalMesh) {
      agent.tailMesh.scale.set(1, 1 + agent.flareFactor * 0.28, 1 + agent.flareFactor * 0.12);
      agent.dorsalMesh.scale.set(1, 1 + agent.flareFactor * 0.26, 1);
    }

    if (agent.pectoralLeft && agent.pectoralRight) {
      const flutterFreq = isBetta ? 6.5 : 11.0;
      const flutterAmp = 0.35 + Math.min(speed, 1.0) * 0.25;
      agent.pectoralLeft.rotation.y =
        -0.45 + Math.sin(elapsed * flutterFreq + agent.phaseOffset) * flutterAmp;
      agent.pectoralRight.rotation.y =
        0.45 - Math.sin(elapsed * flutterFreq + agent.phaseOffset) * flutterAmp;
    }

    agent.speedUniform.value =
      THREE.MathUtils.clamp(speed / maxSpeed, 0.15, 1.4) + agent.flareFactor * 0.4;
    agent.swimUniform.value += dt * (1.2 + speed * 2.8 + agent.flareFactor * 0.8);
  }
}
