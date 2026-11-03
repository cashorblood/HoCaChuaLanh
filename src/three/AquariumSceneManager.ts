import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  AquariumState,
  AquascapePropType,
  CameraPreset,
  FishInstanceData,
  FoodType,
  LightingPreset,
  PlacedProp,
  SubstrateType,
} from '../types/aquarium';
import {
  buildAquascapePropMesh,
  groundHeightAt,
  SharedPropAssets,
  TANK_DEPTH,
  TANK_HEIGHT,
  TANK_WIDTH,
  WATER_LEVEL_BASE,
} from './aquascapeBuilder';
import { createFishAgent, FishAgent, FoodPellet, updateFishAgents } from './fishBuilder';
import { glbRegistry } from './glbModelRegistry';
import {
  createContactShadowTexture,
  createDriftwoodTexture,
  createOrganicBumpTexture,
  createPlanktonGlowTexture,
  createSeiryuStoneTexture,
  createSubstrateTexture,
  createWalnutWoodTexture,
} from './proceduralTextures';

export interface SceneCallbacks {
  onSelectProp: (propId: string | null) => void;
  onMoveProp: (propId: string, x: number, z: number) => void;
  onPlaceNewPropAt: (type: AquascapePropType, x: number, z: number) => void;
  onGlassTap: () => void;
  onFoodDroppedByClick: () => void;
}

interface RippleRing {
  mesh: THREE.Mesh;
  age: number;
  maxAge: number;
}

const LIGHTING_CONFIGS: Record<
  LightingPreset,
  {
    bgHex: number;
    fogHex: number;
    keyHex: number;
    keyIntensity: number;
    hemiSkyHex: number;
    hemiGroundHex: number;
    hemiIntensity: number;
    waterTintHex: number;
    lampGlowHex: number;
    causticStrength: number;
    rayOpacity: number;
    bloomStrength: number;
  }
> = {
  morning_sun: {
    bgHex: 0x0b1417,
    fogHex: 0x0b1417,
    keyHex: 0xfffbeb,
    keyIntensity: 2.9,
    hemiSkyHex: 0xbae6fd,
    hemiGroundHex: 0x334155,
    hemiIntensity: 1.05,
    waterTintHex: 0xe0f7fa,
    lampGlowHex: 0xfef9c3,
    causticStrength: 0.25,
    rayOpacity: 0.085,
    bloomStrength: 0.22,
  },
  wrgb_vivid: {
    bgHex: 0x091013,
    fogHex: 0x091013,
    keyHex: 0xfdf4ff,
    keyIntensity: 3.15,
    hemiSkyHex: 0x7dd3fc,
    hemiGroundHex: 0x1e293b,
    hemiIntensity: 1.15,
    waterTintHex: 0xdbeafe,
    lampGlowHex: 0xf5d0fe,
    causticStrength: 0.28,
    rayOpacity: 0.09,
    bloomStrength: 0.26,
  },
  golden_dusk: {
    bgHex: 0x140f0c,
    fogHex: 0x140f0c,
    keyHex: 0xfdba74,
    keyIntensity: 2.5,
    hemiSkyHex: 0xfed7aa,
    hemiGroundHex: 0x292524,
    hemiIntensity: 0.85,
    waterTintHex: 0xffedd5,
    lampGlowHex: 0xfdba74,
    causticStrength: 0.2,
    rayOpacity: 0.095,
    bloomStrength: 0.24,
  },
  moonlight: {
    bgHex: 0x050911,
    fogHex: 0x050911,
    keyHex: 0x60a5fa,
    keyIntensity: 1.5,
    hemiSkyHex: 0x38bdf8,
    hemiGroundHex: 0x0f172a,
    hemiIntensity: 0.6,
    waterTintHex: 0x93c5fd,
    lampGlowHex: 0x60a5fa,
    causticStrength: 0.14,
    rayOpacity: 0.06,
    bloomStrength: 0.3,
  },
  blackwater_amber: {
    bgHex: 0x110c08,
    fogHex: 0x110c08,
    keyHex: 0xfbbf24,
    keyIntensity: 2.45,
    hemiSkyHex: 0xfde68a,
    hemiGroundHex: 0x271a0c,
    hemiIntensity: 0.82,
    waterTintHex: 0xd97706,
    lampGlowHex: 0xfcd34d,
    causticStrength: 0.19,
    rayOpacity: 0.11,
    bloomStrength: 0.25,
  },
};

const CAMERA_TARGETS: Record<
  CameraPreset,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  front: { pos: [0, 1.48, 5.55], target: [0, 1.15, 0] },
  angle: { pos: [3.55, 2.55, 4.35], target: [0, 1.1, 0] },
  top: { pos: [0.01, 5.25, 1.45], target: [0, 0.95, 0] },
  closeup: { pos: [-0.95, 1.35, 3.25], target: [-0.35, 1.15, 0] },
};

const _dummyObj = new THREE.Object3D();
const _rayMouse = new THREE.Vector2();
const _dragIntersect = new THREE.Vector3();

export class AquariumSceneManager {
  private container: HTMLElement;
  private callbacks: SceneCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private lastKnownState: AquariumState;
  private unsubGlb: () => void = () => {};

  // Lighting refs
  private keyLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private rimLight!: THREE.DirectionalLight;
  private lampDiffuserMat!: THREE.MeshStandardMaterial;

  // Tank, Water, Sunbeams & Plankton refs
  private substrateMesh!: THREE.Mesh;
  private substrateMat!: THREE.MeshStandardMaterial;
  private currentSubstrateType: SubstrateType = 'aqua_soil';
  private waterSurfaceMesh!: THREE.Mesh;
  private waterVolumeMesh!: THREE.Mesh;
  private waterVolumeMat!: THREE.MeshPhysicalMaterial;
  private waterSurfaceMat!: THREE.MeshPhysicalMaterial;
  private godRaysGroup = new THREE.Group();
  private godRayMaterials: THREE.ShaderMaterial[] = [];
  private planktonPoints!: THREE.Points;
  private frontGlassProxy!: THREE.Mesh;
  private currentWaterLevel = WATER_LEVEL_BASE;
  private targetWaterLevel = WATER_LEVEL_BASE;
  private waterChangePhase: 'idle' | 'draining' | 'refilling' = 'idle';
  private waterClarity = 96;

  // Shared shaders & textures
  private maxAnisotropy = 1;
  private timeUniform = { value: 0 };
  private causticStrengthUniform = { value: 0.25 };
  private sharedPropAssets!: SharedPropAssets;

  // Dynamic entities
  private propsGroup = new THREE.Group();
  private fishGroup = new THREE.Group();
  private fishAgents: FishAgent[] = [];
  private pellets: FoodPellet[] = [];
  private ripples: RippleRing[] = [];
  private bubbleInstanced!: THREE.InstancedMesh;
  private bubbleData: Array<{
    x: number;
    y: number;
    z: number;
    speed: number;
    scale: number;
    isFilter: boolean;
  }> = [];
  private bubbleNestGroup = new THREE.Group();
  private mirrorGroup = new THREE.Group();
  private mirrorActive = false;
  private filterActive = true;
  private airStoneActive = true;

  // Aquascape Builder 3D Visual Helpers
  private designGridGroup = new THREE.Group();
  private selectionRingMesh!: THREE.Mesh;
  private placementGhostGroup: THREE.Group | null = null;
  private placingPropType: AquascapePropType | null = null;

  // Interaction state
  private raycaster = new THREE.Raycaster();
  private dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.25);
  private designMode = false;
  private clickFeedMode = false;
  private currentFoodType: FoodType = 'pellets';
  private selectedPropId: string | null = null;
  private draggingPropId: string | null = null;
  private pointerDownPos = { x: 0, y: 0 };
  private tapPoint: THREE.Vector3 | null = null;
  private tapTimer = 0;

  private activeCamTransition: { pos: THREE.Vector3; target: THREE.Vector3 } | null = null;

  constructor(container: HTMLElement, initialState: AquariumState, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.lastKnownState = initialState;

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x091013);
    this.scene.fog = new THREE.FogExp2(0x091013, 0.042);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 60);
    this.camera.position.set(0, 1.55, 5.65);

    // Cinematic Post-Processing Pipeline (Hardware GPUs only)
    if (!this.isSoftwareGl) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width * 0.5, height * 0.5),
        0.24,
        0.55,
        0.82
      );
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(new OutputPass());
    }

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0, 1.15, 0);
    this.controls.minDistance = 2.4;
    this.controls.maxDistance = 9.5;
    this.controls.minPolarAngle = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.enablePan = false;
    this.controls.addEventListener('start', () => {
      this.activeCamTransition = null;
    });

    this.sharedPropAssets = {
      stoneTexture: createSeiryuStoneTexture(this.maxAnisotropy),
      woodTexture: createDriftwoodTexture(this.maxAnisotropy),
      bumpTexture: createOrganicBumpTexture(this.maxAnisotropy),
      swayTimeUniform: this.timeUniform,
    };

    this.buildLighting();
    this.buildDeskAndRimlessTank();
    this.buildSubstrateMesh(initialState.substrate);
    this.buildDesignHelpers();
    this.buildWaterAndBubbles();
    this.buildVolumetricRaysAndPlankton();
    this.buildBubbleNestAndMirror();

    this.scene.add(this.propsGroup);
    this.scene.add(this.fishGroup);

    this.syncState(initialState, true);

    // Subscribe to custom .glb model registry & auto-load public/models/manifest.json
    this.unsubGlb = glbRegistry.subscribe(() => {
      if (!this.disposed) {
        this.syncState(this.lastKnownState, true);
      }
    });
    glbRegistry.loadManifestOnce();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.startLoop();
  }

  private buildLighting(): void {
    this.hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 1.1);
    this.hemiLight.position.set(0, 8, 0);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfffbeb, 2.9);
    this.keyLight.position.set(1.2, 5.8, 1.6);
    this.keyLight.target.position.set(0, 0.6, 0);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 12;
    this.keyLight.shadow.camera.left = -3.2;
    this.keyLight.shadow.camera.right = 3.2;
    this.keyLight.shadow.camera.top = 2.6;
    this.keyLight.shadow.camera.bottom = -2.6;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.rimLight = new THREE.DirectionalLight(0x5eead4, 0.75);
    this.rimLight.position.set(-3.5, 2.8, -3.8);
    this.scene.add(this.rimLight);

    if (!this.isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softbox = new THREE.RectAreaLight(0xffffff, 2.4, TANK_WIDTH * 0.78, 0.45);
      softbox.position.set(0, TANK_HEIGHT + 0.64, 0);
      softbox.lookAt(0, 0.4, 0);
      this.scene.add(softbox);
    }
  }

  private buildDeskAndRimlessTank(): void {
    const tankStructure = new THREE.Group();

    const deskTex = createWalnutWoodTexture(this.maxAnisotropy);
    const deskMat = new THREE.MeshStandardMaterial({
      map: deskTex,
      roughness: 0.58,
      metalness: 0.06,
    });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.24, 6.8), deskMat);
    desk.position.set(0, -0.14, 0);
    desk.receiveShadow = true;
    tankStructure.add(desk);

    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(TANK_WIDTH + 1.5, TANK_DEPTH + 1.4),
      new THREE.MeshBasicMaterial({
        map: createContactShadowTexture(),
        transparent: true,
        depthWrite: false,
        opacity: 0.58,
      })
    );
    contactShadow.rotation.x = -Math.PI * 0.5;
    contactShadow.position.y = 0.002;
    tankStructure.add(contactShadow);

    const evaMat = new THREE.MeshStandardMaterial({
      color: 0x17191c,
      roughness: 0.9,
      metalness: 0.05,
    });
    const levelingPad = new THREE.Mesh(
      new THREE.BoxGeometry(TANK_WIDTH + 0.08, 0.04, TANK_DEPTH + 0.08),
      evaMat
    );
    levelingPad.position.y = 0.025;
    levelingPad.receiveShadow = true;
    tankStructure.add(levelingPad);

    const glassThickness = 0.035;
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xf0fdfa,
      roughness: 0.03,
      metalness: 0.0,
      transmission: this.isSoftwareGl ? 0 : 0.93,
      transparent: true,
      opacity: this.isSoftwareGl ? 0.16 : 1.0,
      ior: 1.52,
      thickness: 0.12,
      clearcoat: 1.0,
      depthWrite: false,
    });

    const edgeTintMat = new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      roughness: 0.16,
      metalness: 0.1,
      transparent: true,
      opacity: 0.5,
    });

    const frontGlass = new THREE.Mesh(
      new THREE.BoxGeometry(TANK_WIDTH, TANK_HEIGHT, glassThickness),
      glassMat
    );
    frontGlass.position.set(0, TANK_HEIGHT * 0.5 + 0.045, TANK_DEPTH * 0.5);
    frontGlass.renderOrder = 12;
    tankStructure.add(frontGlass);

    this.frontGlassProxy = new THREE.Mesh(
      new THREE.PlaneGeometry(TANK_WIDTH, TANK_HEIGHT),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.frontGlassProxy.position.copy(frontGlass.position);
    tankStructure.add(this.frontGlassProxy);

    const backGlass = new THREE.Mesh(
      new THREE.BoxGeometry(TANK_WIDTH, TANK_HEIGHT, glassThickness),
      glassMat
    );
    backGlass.position.set(0, TANK_HEIGHT * 0.5 + 0.045, -TANK_DEPTH * 0.5);
    backGlass.renderOrder = 1;
    tankStructure.add(backGlass);

    const sideGeo = new THREE.BoxGeometry(glassThickness, TANK_HEIGHT, TANK_DEPTH);
    const leftGlass = new THREE.Mesh(sideGeo, glassMat);
    leftGlass.position.set(-TANK_WIDTH * 0.5, TANK_HEIGHT * 0.5 + 0.045, 0);
    leftGlass.renderOrder = 11;
    tankStructure.add(leftGlass);

    const rightGlass = new THREE.Mesh(sideGeo, glassMat);
    rightGlass.position.set(TANK_WIDTH * 0.5, TANK_HEIGHT * 0.5 + 0.045, 0);
    rightGlass.renderOrder = 11;
    tankStructure.add(rightGlass);

    const topRimFB = new THREE.BoxGeometry(TANK_WIDTH + 0.02, 0.012, glassThickness);
    const rimF = new THREE.Mesh(topRimFB, edgeTintMat);
    rimF.position.set(0, TANK_HEIGHT + 0.045, TANK_DEPTH * 0.5);
    const rimB = rimF.clone();
    rimB.position.z = -TANK_DEPTH * 0.5;
    const topRimLR = new THREE.BoxGeometry(glassThickness, 0.012, TANK_DEPTH);
    const rimL = new THREE.Mesh(topRimLR, edgeTintMat);
    rimL.position.set(-TANK_WIDTH * 0.5, TANK_HEIGHT + 0.045, 0);
    const rimR = rimL.clone();
    rimR.position.x = TANK_WIDTH * 0.5;
    tankStructure.add(rimF, rimB, rimL, rimR);

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.24,
      metalness: 0.9,
    });
    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.6,
    });
    this.lampDiffuserMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef9c3,
      emissiveIntensity: 1.65,
      roughness: 0.2,
    });

    [-1, 1].forEach((side) => {
      const standX = side * (TANK_WIDTH * 0.5 - 0.02);
      const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.14), darkTrimMat);
      clamp.position.set(standX, TANK_HEIGHT + 0.02, -0.35);
      tankStructure.add(clamp);

      const riserCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(standX, TANK_HEIGHT + 0.05, -0.35),
        new THREE.Vector3(standX, TANK_HEIGHT + 0.68, -0.35),
        new THREE.Vector3(standX * 0.92, TANK_HEIGHT + 0.72, 0),
      ]);
      const rod = new THREE.Mesh(new THREE.TubeGeometry(riserCurve, 16, 0.02, 8, false), metalMat);
      tankStructure.add(rod);
    });

    const lampHood = new THREE.Mesh(new THREE.BoxGeometry(TANK_WIDTH * 0.84, 0.045, 0.42), metalMat);
    lampHood.position.set(0, TANK_HEIGHT + 0.72, 0);
    lampHood.castShadow = true;
    tankStructure.add(lampHood);

    const diffuser = new THREE.Mesh(
      new THREE.PlaneGeometry(TANK_WIDTH * 0.8, 0.34),
      this.lampDiffuserMat
    );
    diffuser.rotation.x = Math.PI * 0.5;
    diffuser.position.set(0, TANK_HEIGHT + 0.695, 0);
    tankStructure.add(diffuser);

    const lilyCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-TANK_WIDTH * 0.5 - 0.08, TANK_HEIGHT - 0.5, -0.55),
      new THREE.Vector3(-TANK_WIDTH * 0.5 - 0.08, TANK_HEIGHT + 0.14, -0.55),
      new THREE.Vector3(-TANK_WIDTH * 0.5 + 0.12, TANK_HEIGHT + 0.14, -0.55),
      new THREE.Vector3(-TANK_WIDTH * 0.5 + 0.22, WATER_LEVEL_BASE - 0.15, -0.55),
    ]);
    const lilyPipe = new THREE.Mesh(
      new THREE.TubeGeometry(lilyCurve, 24, 0.032, 10, false),
      new THREE.MeshPhysicalMaterial({
        color: 0xe2e8f0,
        roughness: 0.1,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      })
    );
    lilyPipe.renderOrder = 9;
    tankStructure.add(lilyPipe);

    this.scene.add(tankStructure);
  }

  private buildSubstrateMesh(type: SubstrateType): void {
    this.currentSubstrateType = type;
    const segW = 64;
    const segD = 36;
    const innerW = TANK_WIDTH - 0.08;
    const innerD = TANK_DEPTH - 0.08;

    const geo = new THREE.BoxGeometry(innerW, 0.45, innerD, segW, 1, segD);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      if (vy > 0) {
        pos.setY(i, groundHeightAt(vx, vz));
      } else {
        pos.setY(i, 0.048);
      }
    }
    geo.computeVertexNormals();

    const tex = createSubstrateTexture(type, this.maxAnisotropy);
    this.substrateMat = new THREE.MeshStandardMaterial({
      map: tex,
      bumpMap: this.sharedPropAssets.bumpTexture,
      bumpScale: 0.018,
      roughness: 0.86,
      metalness: 0.02,
    });

    this.substrateMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.timeUniform;
      shader.uniforms.uCausticStrength = this.causticStrengthUniform;
      shader.vertexShader =
        `varying vec3 vWorldSubPos;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vWorldSubPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          `
        );
      shader.fragmentShader =
        `uniform float uTime;\nuniform float uCausticStrength;\nvarying vec3 vWorldSubPos;\n` +
        shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `
          float c1 = sin(vWorldSubPos.x * 5.2 + uTime * 1.7) * cos(vWorldSubPos.z * 5.6 - uTime * 1.3);
          float c2 = sin((vWorldSubPos.x + vWorldSubPos.z) * 4.4 - uTime * 2.1);
          float c3 = cos((vWorldSubPos.x - vWorldSubPos.z * 1.3) * 6.8 + uTime * 1.4);
          float caustic = smoothstep(0.36, 0.98, (c1 + c2 + c3 * 0.5) / 2.5 + 0.5);
          float topMask = smoothstep(0.08, 0.16, vWorldSubPos.y);
          gl_FragColor.rgb += vec3(0.88, 0.97, 1.0) * caustic * uCausticStrength * topMask;
          #include <dithering_fragment>
          `
        );
    };

    this.substrateMesh = new THREE.Mesh(geo, this.substrateMat);
    this.substrateMesh.receiveShadow = true;
    this.scene.add(this.substrateMesh);
  }

  private buildVolumetricRaysAndPlankton(): void {
    // 1. Soft Volumetric Underwater Sunbeams (God-Rays) beneath the WRGB lamp
    const rayPositions = [
      { x: -1.15, z: -0.15, rotZ: -0.14, w: 0.95 },
      { x: -0.1, z: 0.1, rotZ: -0.08, w: 1.25 },
      { x: 1.05, z: -0.1, rotZ: -0.12, w: 0.9 },
    ];

    rayPositions.forEach((rp, idx) => {
      const geo = new THREE.PlaneGeometry(rp.w, 2.05);
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: this.timeUniform,
          uColor: { value: new THREE.Color(0xfef9c3) },
          uOpacity: { value: 0.085 },
          uOffset: { value: idx * 2.1 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uOpacity;
          uniform float uOffset;
          varying vec2 vUv;
          void main() {
            float edgeX = sin(vUv.x * 3.14159265);
            edgeX = pow(max(edgeX, 0.0), 1.8);
            float verticalFade = smoothstep(0.0, 0.85, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
            float shimmer = 0.72 + 0.28 * sin(vUv.x * 9.0 + uTime * 0.9 + uOffset);
            float alpha = edgeX * verticalFade * shimmer * uOpacity;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
      });
      this.godRayMaterials.push(mat);

      const beam = new THREE.Mesh(geo, mat);
      beam.position.set(rp.x, 1.32, rp.z);
      beam.rotation.z = rp.rotZ;
      beam.rotation.y = (idx - 1) * 0.22;
      beam.renderOrder = 5;
      this.godRaysGroup.add(beam);
    });
    this.scene.add(this.godRaysGroup);

    // 2. Suspended Illuminated Plankton / Water Motes (Natural Underwater Depth)
    const moteCount = 95;
    const positions = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * (TANK_WIDTH - 0.4);
      positions[i * 3 + 1] = 0.35 + Math.random() * (WATER_LEVEL_BASE - 0.5);
      positions[i * 3 + 2] = (Math.random() - 0.5) * (TANK_DEPTH - 0.4);
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const moteMat = new THREE.PointsMaterial({
      map: createPlanktonGlowTexture(),
      size: 0.032,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.planktonPoints = new THREE.Points(moteGeo, moteMat);
    this.planktonPoints.renderOrder = 6;
    this.scene.add(this.planktonPoints);
  }

  private buildDesignHelpers(): void {
    const linePoints: THREE.Vector3[] = [];
    const halfW = TANK_WIDTH * 0.45;
    const halfD = TANK_DEPTH * 0.43;

    const zDivs = [-halfD, -halfD * 0.33, halfD * 0.33, halfD];
    for (const z of zDivs) {
      const steps = 28;
      for (let i = 0; i < steps; i++) {
        const x1 = THREE.MathUtils.lerp(-halfW, halfW, i / steps);
        const x2 = THREE.MathUtils.lerp(-halfW, halfW, (i + 1) / steps);
        linePoints.push(
          new THREE.Vector3(x1, groundHeightAt(x1, z) + 0.025, z),
          new THREE.Vector3(x2, groundHeightAt(x2, z) + 0.025, z)
        );
      }
    }

    const xDivs = [-halfW, -halfW * 0.5, -halfW * 0.18, halfW * 0.18, halfW * 0.5, halfW];
    for (const x of xDivs) {
      const steps = 16;
      for (let i = 0; i < steps; i++) {
        const z1 = THREE.MathUtils.lerp(-halfD, halfD, i / steps);
        const z2 = THREE.MathUtils.lerp(-halfD, halfD, (i + 1) / steps);
        linePoints.push(
          new THREE.Vector3(x, groundHeightAt(x, z1) + 0.025, z1),
          new THREE.Vector3(x, groundHeightAt(x, z2) + 0.025, z2)
        );
      }
    }

    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    const gridLines = new THREE.LineSegments(lineGeo, lineMat);
    gridLines.renderOrder = 6;
    this.designGridGroup.add(gridLines);
    this.designGridGroup.visible = false;
    this.scene.add(this.designGridGroup);

    const ringGeo = new THREE.RingGeometry(0.32, 0.38, 36);
    ringGeo.rotateX(-Math.PI * 0.5);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.selectionRingMesh = new THREE.Mesh(ringGeo, ringMat);
    this.selectionRingMesh.visible = false;
    this.selectionRingMesh.renderOrder = 7;
    this.scene.add(this.selectionRingMesh);
  }

  private buildWaterAndBubbles(): void {
    const innerW = TANK_WIDTH - 0.09;
    const innerD = TANK_DEPTH - 0.09;

    this.waterVolumeMat = new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      roughness: 0.12,
      metalness: 0.0,
      transparent: true,
      opacity: 0.11,
      depthWrite: false,
      side: THREE.BackSide,
    });
    const volGeo = new THREE.BoxGeometry(innerW, 1, innerD);
    volGeo.translate(0, 0.5, 0);
    this.waterVolumeMesh = new THREE.Mesh(volGeo, this.waterVolumeMat);
    this.waterVolumeMesh.position.y = 0.05;
    this.waterVolumeMesh.scale.y = this.currentWaterLevel - 0.05;
    this.waterVolumeMesh.renderOrder = 4;
    this.scene.add(this.waterVolumeMesh);

    const surfGeo = new THREE.PlaneGeometry(innerW, innerD, 42, 26);
    surfGeo.rotateX(-Math.PI * 0.5);

    this.waterSurfaceMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      roughness: 0.05,
      metalness: 0.08,
      transparent: true,
      opacity: 0.34,
      clearcoat: 1.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.waterSurfaceMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.timeUniform;
      shader.vertexShader =
        `uniform float uTime;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          float wave = sin(position.x * 3.8 + uTime * 2.2) * 0.012
                     + cos(position.z * 4.5 - uTime * 1.8) * 0.009;
          transformed.y += wave;
          `
        );
    };

    this.waterSurfaceMesh = new THREE.Mesh(surfGeo, this.waterSurfaceMat);
    this.waterSurfaceMesh.position.y = this.currentWaterLevel;
    this.waterSurfaceMesh.renderOrder = 8;
    this.scene.add(this.waterSurfaceMesh);

    const bubbleCount = 85;
    const bubbleGeo = new THREE.SphereGeometry(0.015, 8, 8);
    const bubbleMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.05,
      transparent: true,
      opacity: 0.65,
      clearcoat: 1.0,
      depthWrite: false,
    });
    this.bubbleInstanced = new THREE.InstancedMesh(bubbleGeo, bubbleMat, bubbleCount);
    this.bubbleInstanced.frustumCulled = false;
    this.bubbleInstanced.renderOrder = 7;

    for (let i = 0; i < bubbleCount; i++) {
      const isFilter = i < 42;
      this.bubbleData.push({
        x: isFilter
          ? -TANK_WIDTH * 0.5 + 0.25 + (Math.random() - 0.5) * 0.35
          : (Math.random() - 0.5) * (TANK_WIDTH - 0.8),
        y: 0.3 + Math.random() * 1.9,
        z: isFilter
          ? -0.55 + (Math.random() - 0.5) * 0.3
          : (Math.random() - 0.5) * (TANK_DEPTH - 0.7),
        speed: isFilter ? 0.45 + Math.random() * 0.35 : 0.2 + Math.random() * 0.22,
        scale: isFilter ? 0.7 + Math.random() * 0.65 : 0.45 + Math.random() * 0.5,
        isFilter,
      });
    }
    this.scene.add(this.bubbleInstanced);
  }

  private buildBubbleNestAndMirror(): void {
    const nestMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.15,
      transparent: true,
      opacity: 0.78,
      clearcoat: 0.9,
    });
    for (let i = 0; i < 38; i++) {
      const r = 0.014 + Math.random() * 0.016;
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 7), nestMat);
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * 0.22;
      b.position.set(
        TANK_WIDTH * 0.5 - 0.38 + Math.cos(angle) * dist,
        0,
        -TANK_DEPTH * 0.5 + 0.32 + Math.sin(angle) * dist * 0.8
      );
      this.bubbleNestGroup.add(b);
    }
    this.bubbleNestGroup.position.y = this.currentWaterLevel + 0.005;
    this.scene.add(this.bubbleNestGroup);

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.3,
      metalness: 0.75,
    });
    const mirrorSurfaceMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.02,
      metalness: 0.98,
      clearcoat: 1.0,
    });

    const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 28), frameMat);
    frame.rotation.z = Math.PI * 0.5;
    this.mirrorGroup.add(frame);

    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.034, 28),
      mirrorSurfaceMat
    );
    glass.rotation.z = Math.PI * 0.5;
    this.mirrorGroup.add(glass);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 10), frameMat);
    handle.position.set(0, -0.62, 0);
    this.mirrorGroup.add(handle);

    this.mirrorGroup.position.set(TANK_WIDTH * 0.5 + 0.85, 1.25, 0);
    this.mirrorGroup.visible = false;
    this.scene.add(this.mirrorGroup);
  }

  public syncState(state: AquariumState, rebuildAll = false): void {
    this.lastKnownState = state;
    const lightCfg = LIGHTING_CONFIGS[state.lighting];
    this.scene.background = new THREE.Color(lightCfg.bgHex);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(lightCfg.fogHex);
    }
    this.keyLight.color.setHex(lightCfg.keyHex);
    this.keyLight.intensity = lightCfg.keyIntensity;
    this.hemiLight.color.setHex(lightCfg.hemiSkyHex);
    this.hemiLight.groundColor.setHex(lightCfg.hemiGroundHex);
    this.hemiLight.intensity = lightCfg.hemiIntensity;
    this.lampDiffuserMat.emissive.setHex(lightCfg.lampGlowHex);
    this.causticStrengthUniform.value = lightCfg.causticStrength * (state.waterClarity / 100);

    if (this.bloomPass) {
      this.bloomPass.strength = lightCfg.bloomStrength;
    }

    this.godRayMaterials.forEach((m) => {
      m.uniforms.uColor.value.setHex(lightCfg.lampGlowHex);
      m.uniforms.uOpacity.value = lightCfg.rayOpacity * (state.waterClarity / 100);
    });

    this.waterClarity = state.waterClarity;
    const murkiness = (100 - state.waterClarity) / 100;
    const baseWaterColor = new THREE.Color(lightCfg.waterTintHex);
    const algaeMurkColor = new THREE.Color(0x5f7349);
    baseWaterColor.lerp(algaeMurkColor, murkiness * 0.7);
    this.waterVolumeMat.color.copy(baseWaterColor);
    this.waterVolumeMat.opacity =
      (state.lighting === 'blackwater_amber' ? 0.22 : 0.08) + murkiness * 0.24;

    if (state.substrate !== this.currentSubstrateType) {
      this.currentSubstrateType = state.substrate;
      const oldMap = this.substrateMat.map;
      this.substrateMat.map = createSubstrateTexture(state.substrate, this.maxAnisotropy);
      this.substrateMat.color.setHex(state.substrate === 'golden_pebbles' ? 0xd9b88c : 0xffffff);
      this.substrateMat.needsUpdate = true;
      oldMap?.dispose();
    }

    this.filterActive = state.filterActive;
    this.airStoneActive = state.airStoneActive;
    this.currentFoodType = state.selectedFood;
    this.mirrorActive = state.mirrorActive;

    const hasBetta = state.fishes.some((f) => f.species === 'betta');
    this.bubbleNestGroup.visible = hasBetta && state.waterClarity >= 80;

    this.syncFishes(state.fishes, rebuildAll);
    this.rebuildProps(state.props);
    this.updateSelectionRing(state.props);
  }

  private syncFishes(nextFishes: FishInstanceData[], forceRebuild: boolean): void {
    const nextIds = new Set(nextFishes.map((f) => f.id));

    this.fishAgents = this.fishAgents.filter((agent) => {
      if (forceRebuild || !nextIds.has(agent.id)) {
        this.fishGroup.remove(agent.root);
        disposeObject3D(agent.root);
        return false;
      }
      return true;
    });

    const existingIds = new Set(this.fishAgents.map((a) => a.id));
    for (const fishData of nextFishes) {
      if (!existingIds.has(fishData.id)) {
        const agent = createFishAgent(fishData, this.maxAnisotropy, this.currentWaterLevel);
        this.fishAgents.push(agent);
        this.fishGroup.add(agent.root);
      }
    }
  }

  public rebuildProps(props: PlacedProp[]): void {
    while (this.propsGroup.children.length > 0) {
      const child = this.propsGroup.children[0];
      this.propsGroup.remove(child);
      disposeObject3D(child);
    }

    for (const p of props) {
      const isSelected = p.id === this.selectedPropId;
      const meshGroup = buildAquascapePropMesh(p, this.sharedPropAssets, isSelected);
      const yPos =
        p.type === 'floating_frogbit'
          ? this.currentWaterLevel - 0.008
          : groundHeightAt(p.x, p.z) - 0.015;
      meshGroup.position.set(p.x, yPos, p.z);
      meshGroup.rotation.y = p.rotationY;
      meshGroup.scale.setScalar(p.scale);
      this.propsGroup.add(meshGroup);
    }
  }

  private updateSelectionRing(props: PlacedProp[]): void {
    if (!this.designMode || !this.selectedPropId) {
      this.selectionRingMesh.visible = false;
      return;
    }
    const found = props.find((p) => p.id === this.selectedPropId);
    if (!found) {
      this.selectionRingMesh.visible = false;
      return;
    }
    this.selectionRingMesh.visible = true;
    const yPos =
      found.type === 'floating_frogbit'
        ? this.currentWaterLevel + 0.008
        : groundHeightAt(found.x, found.z) + 0.03;
    this.selectionRingMesh.position.set(found.x, yPos, found.z);
    this.selectionRingMesh.scale.setScalar(found.scale);
  }

  public setSelectedProp(propId: string | null, currentProps: PlacedProp[]): void {
    if (this.selectedPropId === propId) return;
    this.selectedPropId = propId;
    this.rebuildProps(currentProps);
    this.updateSelectionRing(currentProps);
  }

  public setDesignMode(enabled: boolean): void {
    this.designMode = enabled;
    this.designGridGroup.visible = enabled;
    if (!enabled) {
      this.draggingPropId = null;
      this.controls.enabled = true;
      this.selectionRingMesh.visible = false;
      this.setPlacingPropType(null);
    }
  }

  public setPlacingPropType(type: AquascapePropType | null): void {
    this.placingPropType = type;
    if (this.placementGhostGroup) {
      this.scene.remove(this.placementGhostGroup);
      disposeObject3D(this.placementGhostGroup);
      this.placementGhostGroup = null;
    }
    if (type) {
      const ghost = buildAquascapePropMesh(
        { id: 'ghost-preview', type, x: 0, z: 0, rotationY: 0, scale: 1 },
        this.sharedPropAssets,
        true
      );
      ghost.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material) {
          const mat = (obj.material as THREE.Material).clone() as THREE.MeshStandardMaterial;
          mat.transparent = true;
          mat.opacity = 0.62;
          obj.material = mat;
        }
      });
      ghost.visible = false;
      this.placementGhostGroup = ghost;
      this.scene.add(ghost);
    }
  }

  public setClickFeedMode(enabled: boolean): void {
    this.clickFeedMode = enabled;
  }

  public setCameraPreset(preset: CameraPreset): void {
    const spec = CAMERA_TARGETS[preset];
    this.activeCamTransition = {
      pos: new THREE.Vector3(...spec.pos),
      target: new THREE.Vector3(...spec.target),
    };
  }

  public dropFood(foodType: FoodType, worldX?: number, worldZ?: number): void {
    const count = foodType === 'artemia' ? 14 : foodType === 'bloodworms' ? 8 : 9;
    const colorHex =
      foodType === 'bloodworms' ? 0x991b1b : foodType === 'artemia' ? 0xfb923c : 0xd97706;

    const baseX = worldX !== undefined ? worldX : (Math.random() - 0.5) * 1.8;
    const baseZ = worldZ !== undefined ? worldZ : (Math.random() - 0.5) * 0.9;

    this.spawnSurfaceRipple(baseX, baseZ);

    for (let i = 0; i < count; i++) {
      const geo =
        foodType === 'bloodworms'
          ? new THREE.CapsuleGeometry(0.009, 0.055, 3, 5)
          : new THREE.SphereGeometry(foodType === 'artemia' ? 0.013 : 0.02, 7, 7);
      const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);

      const px = THREE.MathUtils.clamp(
        baseX + (Math.random() - 0.5) * 0.55,
        -TANK_WIDTH * 0.44,
        TANK_WIDTH * 0.44
      );
      const pz = THREE.MathUtils.clamp(
        baseZ + (Math.random() - 0.5) * 0.45,
        -TANK_DEPTH * 0.42,
        TANK_DEPTH * 0.42
      );
      const py = this.currentWaterLevel - 0.02 - Math.random() * 0.08;

      mesh.position.set(px, py, pz);
      if (foodType === 'bloodworms') {
        mesh.rotation.set(Math.random(), Math.random(), Math.random());
      }
      this.scene.add(mesh);

      this.pellets.push({
        mesh,
        position: mesh.position,
        eaten: false,
        age: 0,
      });
    }
  }

  public triggerWaterChange(): void {
    this.waterChangePhase = 'draining';
    this.targetWaterLevel = WATER_LEVEL_BASE * 0.76;
    this.spawnSurfaceRipple(-1.2, -0.2);
    this.spawnSurfaceRipple(0.8, 0.2);
  }

  private spawnSurfaceRipple(x: number, z: number): void {
    const ringGeo = new THREE.RingGeometry(0.03, 0.055, 28);
    ringGeo.rotateX(-Math.PI * 0.5);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(ringGeo, ringMat);
    mesh.position.set(x, this.currentWaterLevel + 0.006, z);
    mesh.renderOrder = 10;
    this.scene.add(mesh);
    this.ripples.push({ mesh, age: 0, maxAge: 1.35 });
  }

  public captureSnapshot(): string {
    if (this.composer && !this.isSoftwareGl) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    return this.renderer.domElement.toDataURL('image/png');
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;

    const updateRayFromEvent = (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(_rayMouse, this.camera);
    };

    const getTankFloorPoint = (): { x: number; z: number } | null => {
      const subHits = this.raycaster.intersectObject(this.substrateMesh, false);
      if (subHits.length > 0) {
        return {
          x: THREE.MathUtils.clamp(subHits[0].point.x, -TANK_WIDTH * 0.44, TANK_WIDTH * 0.44),
          z: THREE.MathUtils.clamp(subHits[0].point.z, -TANK_DEPTH * 0.42, TANK_DEPTH * 0.42),
        };
      }
      if (this.raycaster.ray.intersectPlane(this.dragPlane, _dragIntersect)) {
        if (
          Math.abs(_dragIntersect.x) <= TANK_WIDTH * 0.48 &&
          Math.abs(_dragIntersect.z) <= TANK_DEPTH * 0.48
        ) {
          return {
            x: THREE.MathUtils.clamp(_dragIntersect.x, -TANK_WIDTH * 0.44, TANK_WIDTH * 0.44),
            z: THREE.MathUtils.clamp(_dragIntersect.z, -TANK_DEPTH * 0.42, TANK_DEPTH * 0.42),
          };
        }
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
      if (!this.designMode || this.placingPropType) return;

      updateRayFromEvent(e);
      const hits = this.raycaster.intersectObjects(this.propsGroup.children, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && !obj.userData?.propId) {
          obj = obj.parent;
        }
        if (obj?.userData?.propId) {
          const id = obj.userData.propId as string;
          this.draggingPropId = id;
          this.controls.enabled = false;
          this.callbacks.onSelectProp(id);
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.designMode) return;

      if (this.placingPropType && this.placementGhostGroup) {
        updateRayFromEvent(e);
        const pt = getTankFloorPoint();
        if (pt) {
          this.placementGhostGroup.visible = true;
          const yPos =
            this.placingPropType === 'floating_frogbit'
              ? this.currentWaterLevel - 0.008
              : groundHeightAt(pt.x, pt.z) - 0.015;
          this.placementGhostGroup.position.set(pt.x, yPos, pt.z);
        } else {
          this.placementGhostGroup.visible = false;
        }
        return;
      }

      if (!this.draggingPropId) return;
      updateRayFromEvent(e);
      if (this.raycaster.ray.intersectPlane(this.dragPlane, _dragIntersect)) {
        const clampedX = THREE.MathUtils.clamp(
          _dragIntersect.x,
          -TANK_WIDTH * 0.44,
          TANK_WIDTH * 0.44
        );
        const clampedZ = THREE.MathUtils.clamp(
          _dragIntersect.z,
          -TANK_DEPTH * 0.42,
          TANK_DEPTH * 0.42
        );

        const group = this.propsGroup.getObjectByName(`prop-${this.draggingPropId}`);
        if (group) {
          const isFloating = group.userData?.propType === 'floating_frogbit';
          const yPos = isFloating
            ? this.currentWaterLevel - 0.008
            : groundHeightAt(clampedX, clampedZ) - 0.015;
          group.position.set(clampedX, yPos, clampedZ);
          this.selectionRingMesh.position.set(clampedX, yPos + 0.04, clampedZ);
        }
        this.callbacks.onMoveProp(
          this.draggingPropId,
          Number(clampedX.toFixed(2)),
          Number(clampedZ.toFixed(2))
        );
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (this.draggingPropId) {
        this.draggingPropId = null;
        this.controls.enabled = true;
        return;
      }

      const movedDist = Math.hypot(
        e.clientX - this.pointerDownPos.x,
        e.clientY - this.pointerDownPos.y
      );
      if (movedDist > 6) return;

      updateRayFromEvent(e);

      if (this.designMode) {
        if (this.placingPropType) {
          const pt = getTankFloorPoint();
          if (pt) {
            this.spawnSurfaceRipple(pt.x, pt.z);
            this.callbacks.onPlaceNewPropAt(
              this.placingPropType,
              Number(pt.x.toFixed(2)),
              Number(pt.z.toFixed(2))
            );
          }
          return;
        }

        const hits = this.raycaster.intersectObjects(this.propsGroup.children, true);
        if (hits.length === 0) {
          this.callbacks.onSelectProp(null);
        }
        return;
      }

      if (this.clickFeedMode) {
        const surfHits = this.raycaster.intersectObject(this.waterSurfaceMesh, false);
        const glassHits = this.raycaster.intersectObject(this.frontGlassProxy, false);
        const hitPt = surfHits[0]?.point || glassHits[0]?.point;
        if (hitPt) {
          this.dropFood(this.currentFoodType, hitPt.x, THREE.MathUtils.clamp(hitPt.z, -0.9, 0.9));
          this.callbacks.onFoodDroppedByClick();
          return;
        }
      }

      const glassHits = this.raycaster.intersectObject(this.frontGlassProxy, false);
      if (glassHits.length > 0) {
        const pt = glassHits[0].point;
        this.tapPoint = pt.clone();
        this.tapPoint.z = THREE.MathUtils.clamp(pt.z - 0.25, -0.8, 0.85);
        this.tapTimer = 3.2;
        this.spawnSurfaceRipple(pt.x, 0.65);
        this.callbacks.onGlassTap();
      }
    };

    const onResize = () => {
      if (this.disposed) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      if (this.composer) {
        this.composer.setSize(w, h);
      }
      if (this.bloomPass) {
        this.bloomPass.resolution.set(w * 0.5, h * 0.5);
      }
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', onResize);

    this.cleanupDomListeners = () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
    };
  }

  private cleanupDomListeners: () => void = () => {};

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.1);
      const elapsed = this.clock.elapsedTime;
      this.timeUniform.value = elapsed;

      if (this.activeCamTransition) {
        this.camera.position.x = THREE.MathUtils.damp(
          this.camera.position.x,
          this.activeCamTransition.pos.x,
          4.2,
          dt
        );
        this.camera.position.y = THREE.MathUtils.damp(
          this.camera.position.y,
          this.activeCamTransition.pos.y,
          4.2,
          dt
        );
        this.camera.position.z = THREE.MathUtils.damp(
          this.camera.position.z,
          this.activeCamTransition.pos.z,
          4.2,
          dt
        );

        this.controls.target.x = THREE.MathUtils.damp(
          this.controls.target.x,
          this.activeCamTransition.target.x,
          4.5,
          dt
        );
        this.controls.target.y = THREE.MathUtils.damp(
          this.controls.target.y,
          this.activeCamTransition.target.y,
          4.5,
          dt
        );
        this.controls.target.z = THREE.MathUtils.damp(
          this.controls.target.z,
          this.activeCamTransition.target.z,
          4.5,
          dt
        );

        if (this.camera.position.distanceTo(this.activeCamTransition.pos) < 0.025) {
          this.activeCamTransition = null;
        }
      }
      this.controls.update();

      // Gentle drift of suspended underwater plankton motes
      const motePos = this.planktonPoints.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < motePos.count; i++) {
        let mx = motePos.getX(i) + Math.sin(elapsed * 0.4 + i) * 0.04 * dt;
        let my = motePos.getY(i) + Math.cos(elapsed * 0.35 + i * 1.3) * 0.025 * dt;
        if (mx > TANK_WIDTH * 0.44) mx = -TANK_WIDTH * 0.44;
        if (my > this.currentWaterLevel - 0.1) my = 0.35;
        motePos.setXY(i, mx, my);
      }
      motePos.needsUpdate = true;

      if (this.waterChangePhase !== 'idle') {
        this.currentWaterLevel = THREE.MathUtils.damp(
          this.currentWaterLevel,
          this.targetWaterLevel,
          this.waterChangePhase === 'draining' ? 3.2 : 2.2,
          dt
        );
        this.waterSurfaceMesh.position.y = this.currentWaterLevel;
        this.waterVolumeMesh.scale.y = this.currentWaterLevel - 0.05;
        this.bubbleNestGroup.position.y = this.currentWaterLevel + 0.005;

        for (const child of this.propsGroup.children) {
          if (child.userData?.propType === 'floating_frogbit') {
            child.position.y = this.currentWaterLevel - 0.008;
          }
        }

        if (
          this.waterChangePhase === 'draining' &&
          Math.abs(this.currentWaterLevel - this.targetWaterLevel) < 0.04
        ) {
          this.waterChangePhase = 'refilling';
          this.targetWaterLevel = WATER_LEVEL_BASE;
        } else if (
          this.waterChangePhase === 'refilling' &&
          Math.abs(this.currentWaterLevel - WATER_LEVEL_BASE) < 0.01
        ) {
          this.currentWaterLevel = WATER_LEVEL_BASE;
          this.waterChangePhase = 'idle';
        }
      }

      const targetMirrorX = this.mirrorActive ? TANK_WIDTH * 0.5 + 0.09 : TANK_WIDTH * 0.5 + 0.85;
      this.mirrorGroup.position.x = THREE.MathUtils.damp(
        this.mirrorGroup.position.x,
        targetMirrorX,
        5.5,
        dt
      );
      this.mirrorGroup.visible = this.mirrorGroup.position.x < TANK_WIDTH * 0.5 + 0.78;

      for (let i = this.pellets.length - 1; i >= 0; i--) {
        const p = this.pellets[i];
        p.age += dt;
        const floor = groundHeightAt(p.position.x, p.position.z) + 0.025;
        if (p.position.y > floor) {
          p.position.y -= dt * 0.24;
          p.position.x += Math.sin(elapsed * 2.5 + i) * dt * 0.04;
        }
        if (p.eaten || p.age > 16) {
          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.Material).dispose();
          this.pellets.splice(i, 1);
        }
      }

      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const r = this.ripples[i];
        r.age += dt;
        const progress = r.age / r.maxAge;
        if (progress >= 1) {
          this.scene.remove(r.mesh);
          r.mesh.geometry.dispose();
          (r.mesh.material as THREE.Material).dispose();
          this.ripples.splice(i, 1);
        } else {
          const s = 1 + progress * 9.5;
          r.mesh.scale.setScalar(s);
          (r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.55;
        }
      }

      const pearlingActive = this.waterClarity >= 75;
      for (let i = 0; i < this.bubbleData.length; i++) {
        const b = this.bubbleData[i];
        const visible = b.isFilter ? this.filterActive || this.airStoneActive : pearlingActive;
        if (visible) {
          b.y += b.speed * dt;
          if (b.y >= this.currentWaterLevel - 0.03) {
            b.y = b.isFilter ? 0.45 + Math.random() * 0.6 : 0.28 + Math.random() * 0.35;
          }
          _dummyObj.position.set(
            b.x + Math.sin(elapsed * 3.2 + i) * 0.018,
            b.y,
            b.z + Math.cos(elapsed * 2.7 + i) * 0.015
          );
          _dummyObj.scale.setScalar(b.scale);
        } else {
          _dummyObj.position.set(0, -10, 0);
          _dummyObj.scale.setScalar(0.001);
        }
        _dummyObj.updateMatrix();
        this.bubbleInstanced.setMatrixAt(i, _dummyObj.matrix);
      }
      this.bubbleInstanced.instanceMatrix.needsUpdate = true;

      if (this.tapTimer > 0) this.tapTimer -= dt;
      updateFishAgents(
        this.fishAgents,
        this.pellets,
        dt,
        elapsed,
        this.currentWaterLevel,
        this.mirrorActive,
        this.tapPoint,
        this.tapTimer
      );

      if (this.composer && !this.isSoftwareGl) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    this.frameId = requestAnimationFrame(tick);
  }

  public dispose(): void {
    this.disposed = true;
    this.unsubGlb();
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.cleanupDomListeners();
    this.controls.dispose();
    this.composer?.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else if (obj.material) {
        obj.material.dispose();
      }
    }
  });
}
