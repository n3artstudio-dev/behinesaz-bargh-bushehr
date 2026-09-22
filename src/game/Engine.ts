import * as THREE from "three";
import { buildWorld, type AABB, type Interactable, type World } from "./world";
import { Character, npcPreset } from "./characters";
import { houseConsumption, isGliderUnlocked, isWorldUnlocked, isPeak, meterColor, sunFactor, useGame } from "./store";
import { audio } from "./audio";
import { buildExtraWorlds, makeBicycle, makeMoped, WORLD_SPAWNS, type ExtraZones } from "./worlds";

interface Npc {
  char: Character;
  path: THREE.Vector3[];
  idx: number;
  speed: number;
  facing?: number;
  id: string;
  wait: number;
}
interface Vehicle {
  g: THREE.Group;
  speed: number;
  dir: number;
  x: number;
  z0: number;
  z1: number;
  wheels: THREE.Object3D[];
  lastDing: number;
}

/* باران */
class Rain {
  lines: THREE.LineSegments;
  private pos: Float32Array;
  private count = 1100;
  constructor(scene: THREE.Scene) {
    this.pos = new Float32Array(this.count * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    const m = new THREE.LineBasicMaterial({ color: "#bcd6f5", transparent: true, opacity: 0.4 });
    this.lines = new THREE.LineSegments(geo, m);
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    for (let i = 0; i < this.count; i++) {
      this.pos[i * 6] = (Math.random() - 0.5) * 60;
      this.pos[i * 6 + 1] = Math.random() * 40;
      this.pos[i * 6 + 2] = (Math.random() - 0.5) * 60;
      this.pos[i * 6 + 3] = this.pos[i * 6] - 0.15;
      this.pos[i * 6 + 4] = this.pos[i * 6 + 1] - 1;
      this.pos[i * 6 + 5] = this.pos[i * 6 + 2] + 0.1;
    }
    scene.add(this.lines);
  }
  update(dt: number, active: boolean, center: THREE.Vector3) {
    this.lines.visible = active;
    if (!active) return;
    const arr = this.pos;
    for (let i = 0; i < this.count; i++) {
      arr[i * 6 + 1] -= dt * 26;
      arr[i * 6 + 4] -= dt * 26;
      if (arr[i * 6 + 1] < 0) {
        const rx = center.x + (Math.random() - 0.5) * 60;
        const rz = center.z + (Math.random() - 0.5) * 60;
        const y = 30 + Math.random() * 15;
        arr[i * 6] = rx;
        arr[i * 6 + 2] = rz;
        arr[i * 6 + 1] = y;
        arr[i * 6 + 3] = rx - 0.15;
        arr[i * 6 + 4] = y - 1;
        arr[i * 6 + 5] = rz + 0.1;
      }
    }
    (this.lines.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  }
}

// Characters walk slightly above the visual ground surfaces (sidewalks, promenade, etc.)
const GROUND_Y = 0.12;
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const M4 = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);
const P = new THREE.Vector3();
const S1 = new THREE.Vector3(1, 1, 1);
const S0 = new THREE.Vector3(0.001, 0.001, 0.001);

/* سیستم ذرات جایزه (جرقه دور کاراکتر موقع سکه‌خوردن) */
class ParticleBurst {
  mesh: THREE.InstancedMesh;
  private vel: Float32Array;
  private pos: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private cursor = 0;
  private n: number;
  private dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene, n = 180) {
    this.n = n;
    const geo = new THREE.OctahedronGeometry(0.075, 0);
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(geo, m, n);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.vel = new Float32Array(n * 3);
    this.pos = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.maxLife = new Float32Array(n);
    const c = new THREE.Color("#ffd23a");
    for (let i = 0; i < n; i++) {
      this.mesh.setColorAt(i, c);
      this.dummy.position.set(0, -999, 0);
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  burst(origin: THREE.Vector3, count = 10, color = "#ffd23a") {
    const c = new THREE.Color(color);
    for (let k = 0; k < count; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.n;
      this.pos[i * 3] = origin.x + (Math.random() - 0.5) * 0.6;
      this.pos[i * 3 + 1] = origin.y + 0.8 + Math.random() * 0.5;
      this.pos[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.6;
      const a = Math.random() * Math.PI * 2;
      const r = 1.4 + Math.random() * 2.8;
      this.vel[i * 3] = Math.cos(a) * r;
      this.vel[i * 3 + 1] = 2.2 + Math.random() * 3;
      this.vel[i * 3 + 2] = Math.sin(a) * r;
      this.life[i] = this.maxLife[i] = 0.7 + Math.random() * 0.6;
      this.mesh.setColorAt(i, c);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      this.vel[i * 3 + 1] -= 9 * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const s = Math.max(0, this.life[i] / this.maxLife[i]);
      this.dummy.position.set(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]);
      this.dummy.rotation.set(this.life[i] * 10, this.life[i] * 7, 0);
      this.dummy.scale.setScalar(0.35 + s * 0.55);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export class Engine {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  clock = new THREE.Clock();
  world: World;
  zones!: ExtraZones;
  hero: Character;
  npcs: Npc[] = [];
  vehicles: Vehicle[] = [];
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  moon: THREE.PointLight;
  keys = new Set<string>();
  yaw = Math.PI;
  pitch = 0.32;
  camDist = 5.6;
  camPos = new THREE.Vector3();
  camLook = new THREE.Vector3();
  pos = new THREE.Vector3(0, GROUND_Y, -10);
  vel = new THREE.Vector3();
  vy = 0;
  grounded = true;
  heading = 0;
  running = false;
  mode: "idle" | "cinematic" | "play" = "idle";
  cineT = 0;
  cineDur = 24;
  cinePath!: THREE.CatmullRomCurve3;
  cineLook!: THREE.CatmullRomCurve3;
  onCineDone?: () => void;
  nearest: Interactable | null = null;
  raf = 0;
  posSyncT = 0;
  saveT = 0;
  touch = { x: 0, y: 0, run: false };
  particles!: ParticleBurst;
  rain!: Rain;
  activeNpcId: string | null = null;
  fireworkT = -10;
  medalStarted = false;
  syncedPads = new Set<string>();
  glide: "none" | "up" | "fly" | "down" = "none";
  glideStart = new THREE.Vector3();
  glideTarget = 50;
  gliderWasUnlocked = false;
  celebrated = false;
  peakAnnounced = false;
  prevSolar = 0;
  prevNeighborhood = 0;
  lastPanel: string | null = null;
  disposed = false;
  pointerDown = false;
  lastPointer = { x: 0, y: 0 };
  sinceStart = 0;
  glowMats = new Map<THREE.Mesh, THREE.MeshStandardMaterial>();
  // gamepad state
  gpAxes = [0, 0, 0, 0]; // leftX, leftY, rightX, rightY
  gpButtons: boolean[] = [];
  gpPrevButtons: boolean[] = [];

  constructor(public canvas: HTMLCanvasElement) {
    const q = useGame.getState().settings.quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q === "high" ? 2 : 1));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500);
    this.scene.fog = new THREE.FogExp2("#cfeaff", 0.0038);

    this.hemi = new THREE.HemisphereLight("#bfe3ff", "#d9c39a", 0.75);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight("#fff2d6", 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(q === "high" ? 1536 : 768, q === "high" ? 1536 : 768);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 220;
    const s = 30;
    this.sun.shadow.camera.left = -s;
    this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s;
    this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);
    this.moon = new THREE.PointLight("#9db8ff", 0, 40);
    this.scene.add(this.moon);

    this.world = buildWorld();
    this.scene.add(this.world.group);
    this.zones = buildExtraWorlds(this.world);
    this.particles = new ParticleBurst(this.scene);
    this.rain = new Rain(this.scene);
    // restore completed world pads from save
    for (const id of useGame.getState().worldPads) this.zones.setPad(id, true);

    // unique materials for toggled emissive meshes
    const uniq = (m: THREE.Mesh) => {
      const mm = (m.material as THREE.MeshStandardMaterial).clone();
      m.material = mm;
      this.glowMats.set(m, mm);
      return mm;
    };
    for (const a of Object.values(this.world.appliances)) a.glow.forEach(uniq);
    this.world.lamps.forEach(uniq);
    this.world.windows.forEach(uniq);
    uniq(this.world.smartMeter);

    // hero
    const gold = useGame.getState().upgrades.find((u) => u.id === "cap_gold")?.owned;
    this.hero = new Character({ kind: "hero", skin: "#f0c7a1", shirt: "#f0b820", pants: "#1e4f9a", goldCap: gold });
    this.hero.root.position.copy(this.pos);
    this.scene.add(this.hero.root);

    // NPCs
    this.world.npcSpawns.forEach((sp, i) => {
      const c = new Character(npcPreset(sp.kind, i));
      c.root.position.set(sp.path[0].x, GROUND_Y, sp.path[0].z);
      if (sp.facing !== undefined) c.root.rotation.y = sp.facing;
      this.scene.add(c.root);
      this.npcs.push({ char: c, path: sp.path, idx: 0, speed: sp.speed, facing: sp.facing, id: sp.id, wait: 0 });
    });

    // دوچرخه‌سوارها و موتورسوارها در خیابان
    const bikeDefs: [number, number, number, number][] = [
      [-3.2, 7.5, 1, 40],
      [3.2, 7.0, -1, 150],
      [-3.2, 11.5, 1, 280],
      [3.2, 11.0, -1, 400],
      [-3.2, 9.0, 1, 560],
      [3.2, 8.5, -1, 620],
    ];
    bikeDefs.forEach(([x, speed, dir, z0], i) => {
      const isBike = i < 2;
      const g = isBike ? makeBicycle(i === 0 ? "#1e88d6" : "#2f9e44", i === 0 ? "#f0b820" : "#e85d3a") : makeMoped(i === 2 ? "#c0392b" : "#2c3e80", i === 2 ? "#1e4f9a" : "#c0392b");
      g.position.set(x, GROUND_Y, z0);
      if (dir < 0) g.rotation.y = Math.PI;
      this.scene.add(g);
      const wheels = (g.userData.wheels as THREE.Mesh[]) ?? [];
      this.vehicles.push({ g, speed, dir, x, z0: 2, z1: dir > 0 ? 740 : 740, wheels, lastDing: 0 });
      g.position.z = Math.min(740, Math.max(2, g.position.z));
    });

    this.prevSolar = useGame.getState().solarLevel;
    this.prevNeighborhood = useGame.getState().neighborhood;

    this.bind();
    this.loop();
  }

  /* ---------------- input ---------------- */
  private onKeyDown = (e: KeyboardEvent) => {
    const st = useGame.getState();
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === "escape") {
      if (st.panel) {
        st.setPanel(null);
        audio.close();
      } else if (st.phase === "playing") {
        st.setPhase("paused");
        document.exitPointerLock?.();
      } else if (st.phase === "paused") st.setPhase("playing");
      return;
    }
    if (st.phase === "cinematic" && (k === " " || k === "enter")) {
      this.skipCinematic();
      return;
    }
    if (st.phase !== "playing") return;
    if (st.panel) {
      if (st.panel === "dialog" && (k === "e" || k === " " || k === "enter")) {
        st.nextDialog();
        audio.click();
      }
      return;
    }
    this.keys.add(k);
    if (k === "e" || k === "enter") this.interact();
    if (k === "f") this.toggleGlider();
    if (k === "q") {
      if (!st.scannerUnlocked) st.toast("اول باید مأموریت را از خانم فاطمه بگیری", "warn");
      else {
        st.toggleScanner();
        audio.scan();
      }
    }
    if (k === "m") {
      st.setPanel("map");
      audio.open();
    }
    if (k === "tab") {
      e.preventDefault();
      st.setPanel("missions");
      audio.open();
    }
    if (k === "i") {
      st.setPanel("inventory");
      audio.open();
    }
    if (k === " ") e.preventDefault();
  };
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
  private onMouseMove = (e: MouseEvent) => {
    const st = useGame.getState();
    if (st.phase !== "playing" || st.panel) return;
    const sens = 0.0024 * st.settings.sensitivity;
    if (document.pointerLockElement === this.canvas) {
      this.yaw -= e.movementX * sens;
      this.pitch = THREE.MathUtils.clamp(this.pitch + e.movementY * sens, -0.35, 1.1);
    } else if (this.pointerDown) {
      this.yaw -= (e.clientX - this.lastPointer.x) * sens * 1.4;
      this.pitch = THREE.MathUtils.clamp(this.pitch + (e.clientY - this.lastPointer.y) * sens * 1.4, -0.35, 1.1);
      this.lastPointer = { x: e.clientX, y: e.clientY };
    }
  };
  private onPointerDown = (e: PointerEvent) => {
    const st = useGame.getState();
    if (st.phase !== "playing" || st.panel) return;
    if (e.pointerType === "mouse") {
      try {
        const p = this.canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
        p?.catch?.(() => {});
      } catch {
        /* pointer lock unavailable — fall back to drag look */
      }
      this.pointerDown = true;
      this.lastPointer = { x: e.clientX, y: e.clientY };
    }
  };
  private onPointerUp = () => (this.pointerDown = false);
  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };
  private onBlur = () => this.keys.clear();

  private bind() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("blur", this.onBlur);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("blur", this.onBlur);
    this.renderer.dispose();
  }

  /* ---------------- touch API (mobile HUD) ---------------- */
  setTouch(x: number, y: number, run = false) {
    this.touch = { x, y, run };
  }
  touchJump() {
    this.jump();
  }
  touchInteract() {
    this.interact();
  }
  rotateCamera(dx: number, dy: number) {
    this.yaw -= dx * 0.005;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.005, -0.35, 1.1);
  }

  /* ---------------- cinematic ---------------- */
  startCinematic(onDone: () => void) {
    this.mode = "cinematic";
    this.cineT = 0;
    this.onCineDone = onDone;
    this.pos.set(0, GROUND_Y, -10);
    this.heading = 0;
    this.hero.root.position.copy(this.pos);
    this.hero.root.rotation.y = 0;
    this.cinePath = new THREE.CatmullRomCurve3(
      [new THREE.Vector3(70, 45, -190), new THREE.Vector3(24, 26, -90), new THREE.Vector3(-4, 15, -36), new THREE.Vector3(-5, 6.5, 2), new THREE.Vector3(-3, 3.2, 12), new THREE.Vector3(0, 2.3, -15.6)],
      false,
      "centripetal",
    );
    this.cineLook = new THREE.CatmullRomCurve3(
      [new THREE.Vector3(0, 8, -40), new THREE.Vector3(-6, 6, -8), new THREE.Vector3(-14, 6, 14), new THREE.Vector3(-16, 4.5, 16), new THREE.Vector3(0, 1.4, -8), new THREE.Vector3(0, 1.3, -9.5)],
      false,
      "centripetal",
    );
    useGame.getState().setCinematicText("خلیج فارس — بوشهر");
  }
  skipCinematic() {
    if (this.mode !== "cinematic") return;
    this.finishCinematic();
  }
  private finishCinematic() {
    this.mode = "play";
    this.yaw = Math.PI;
    this.pitch = 0.3;
    this.updateCamera(1, true);
    useGame.getState().setCinematicText("");
    this.onCineDone?.();
  }
  startPlay() {
    this.mode = "play";
    this.yaw = Math.PI;
    this.pitch = 0.3;
    this.pos.set(0, GROUND_Y, -10);
    this.vy = 0;
    this.heading = 0;
    this.hero.root.position.copy(this.pos);
    this.updateCamera(1, true);
  }

  /* ---------------- interaction ---------------- */
  private interact() {
    const st = useGame.getState();
    const it = this.nearest;
    if (!it) return;
    audio.click();
    switch (it.kind) {
      case "npc": {
        const id = it.id.replace("npc_", "");
        const sp = this.world.npcSpawns.find((n) => n.id === id)!;
        const npc = this.npcs.find((n) => n.id === id);
        this.activeNpcId = id;
        if (npc) {
          const d = tmpV.subVectors(this.pos, npc.char.root.position);
          npc.char.root.rotation.y = Math.atan2(d.x, d.z);
          this.heading = Math.atan2(-d.x, -d.z);
        }
        const done1 = st.missions[0].objectives[0].done;
        let lines = sp.lines;
        let onEnd: string | undefined;
        if (id === "fatemeh") {
          onEnd = "talk";
          lines = done1 ? (st.missions[0].state === "done" ? [`خیلی ممنون ${st.playerName}! قبض برق ما نصف شد.`, "حالا برو پشت‌بام و پنل خورشیدی رو نصب کن تا برق پاک تولید کنیم."] : ["برو داخل و با Q اسکنر رو روشن کن. مشکل‌ها رو پیدا کن!"]) : sp.lines;
        }
        if (id === "ceo") {
          const allDone =
            st.missions[0].state === "done" &&
            ["solar_a", "solar_b", "solar_c", "wind_a", "wind_b", "wind_c", "plant_control", "plant_cooling", "plant_dome", "safety_kid", "safety_flag", "crypto_door", "crypto_owner", "miner_1", "miner_2", "miner_3", "miner_4", "led_1", "led_2", "led_3", "led_4", "led_5"].every((p) => st.worldPads.includes(p));
          if (st.medalGiven) {
            lines = ["تبریک می‌گویم همیار برق! تو یک الگو برای کودکان و شهروندان بوشهر هستی.", "هر وقت نکته‌ی تازه‌ای یاد گرفتی، بیا پیش ما تا با هم به مردم آموزش بدهیم."];
          } else if (!allDone) {
            lines = [
              "به ساختمان شرکت توزیع نیروی برق خوش آمدی همیار برق!",
              "هنوز مأموریت‌هایی در شهرهای انرژی و شهرک ایمنی باقی مانده؛ برو کاملشان کن و بعد برگرد.",
              "کارشناسان ما همیشه آماده‌اند نکات ایمنی و مدیریت مصرف را به تو آموزش دهند.",
            ];
          } else {
            onEnd = "hq_medal";
            lines = [
              "همیار برق عزیز! از تو صمیمانه سپاسگزارم.",
              "تو در کاهش مصرف برق در استان و کشور با ما سهیم شدی و نکات ارزشمندی درباره ایمنی، مدیریت مصرف و خطر دستگاه‌های رمز ارز غیرمجاز به شهروندان آموختی.",
              "ما به همیاران برق خود افتخار می‌کنیم؛ این مدال افتخار طلایی و تندیس برق از طرف شرکت توزیع نیروی برق استان بوشهر به تو اهدا می‌شود.",
            ];
          }
        }
        if (id === "cryptoowner") {
          if (!st.worldPads.includes("crypto_door")) {
            lines = ["به ساختمان من کاری نداشته باش جوان!", "می‌گن دستگاه‌های تو شبانه‌روز روشنه؟ اول با اسکنرت درِ ویلا رو بررسی کن..."];
          } else if (!st.worldPads.includes("crypto_owner")) {
            onEnd = "cryptoowner";
            lines = [
              "آقا جان! اسکنر من ۴ دستگاه استخراج رمز ارز توی این ویلا پیدا کرده؛ هر کدوم حدود ۳ هزار وات!",
              "می‌دونی در ساعت اوج مصرف داری به شبکه‌ی برق محله آسیب می‌زنی و قبض‌ها را بالا می‌بری؟",
              "داشتن دستگاه رمز ارز بدون مجوز قانونی نیست و شرکت برق می‌تواند جریمه‌های سنگینی برایت بزند.",
              "بیا درستش کنیم: دستگاه‌ها را با من جمع می‌کنیم و به‌جایش لامپ‌های کم‌مصرف محله را نصب می‌کنیم.",
            ];
          } else {
            const left = [1, 2, 3, 4].filter((n) => !st.worldPads.includes(`miner_${n}`)).length;
            lines = left > 0 ? [`هنوز ${left} دستگاه مانده؛ با E یکی‌یکی جمع‌شان کن.`] : ["آفرین! نگاه به تابلوی هوشمند محله بنداز؛ مصرف چقدر پایین آمد."];
          }
        }
        st.openDialog({ speaker: sp.label, lines, index: 0, onEnd });
        break;
      }
      case "appliance": {
        if (!st.scannerActive) {
          st.toast(st.scannerUnlocked ? "اسکنر انرژی را با Q فعال کن" : "اول با خانم فاطمه صحبت کن", "warn");
          audio.warn();
          return;
        }
        const id = it.id.replace("app_", "");
        st.setScanTarget(id);
        st.setPanel("scanner");
        audio.scan();
        break;
      }
      case "ladder": {
        st.setOnRoof(true);
        this.pos.copy(this.world.roofEntryPos);
        this.vy = 0;
        st.completeObjective(2, "roof");
        audio.door();
        break;
      }
      case "roofdown": {
        st.setOnRoof(false);
        this.pos.copy(this.world.roofDownPos);
        this.vy = 0;
        audio.door();
        break;
      }
      case "solar":
        st.setPanel("solar");
        audio.open();
        break;
      case "shop":
        st.setPanel("inventory");
        audio.open();
        break;
      case "station":
        st.setPanel("stats");
        audio.open();
        break;
      case "worldgate": {
        const n = parseInt(it.id.replace("gate_", ""), 10);
        const gateZ = [108, 250, 392, 536, 628][n - 2];
        const goingForward = this.pos.z < gateZ;
        if (goingForward) {
          if (!isWorldUnlocked(st.missions, st.worldPads, n)) {
            const lockMsg: Record<number, string> = {
              2: "اول مأموریت بوشهر را کامل کن",
              3: "اول مأموریت خورشیدی و مأموریت ایمنی کنار مسجد را کامل کن",
              4: "اول مأموریت انرژی بادی را کامل کن",
              5: "اول بازدید نیروگاه اتمی را کامل کن",
            };
            st.toast(lockMsg[n] ?? "اول مأموریت قبلی را کامل کن", "warn");
            audio.warn();
          } else this.travelWorld(n);
        } else {
          this.travelWorld(n - 1);
        }
        break;
      }
      case "pad": {
        if (st.worldPads.includes(it.id)) {
          st.toast("این مرحله قبلاً انجام شده ✓", "info");
          break;
        }
        // گیتینگ مرحله رمز ارز
        if (it.id.startsWith("miner_")) {
          if (!st.worldPads.includes("crypto_owner")) {
            st.toast("اول باید به صاحب‌خانه اخطار بدهی", "warn");
            audio.warn();
            break;
          }
        }
        if (it.id.startsWith("led_")) {
          const minersAll = [1, 2, 3, 4].every((n) => st.worldPads.includes(`miner_${n}`));
          if (!minersAll) {
            st.toast("اول هر ۴ دستگاه غیرمجاز را جمع کن", "warn");
            audio.warn();
            break;
          }
        }
        if (it.id === "crypto_door") {
          st.completePad(it.id);
          this.zones.setPad(it.id, true);
          st.setPanel("crypto");
          audio.scan();
          this.particles.burst(this.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 20, "#ff5a4d");
          break;
        }
        if (it.id === "safety_kid") {
          if (st.worldPads.includes(it.id)) {
            st.toast("این نکته ایمنی را قبلاً یاد دادی ✓", "info");
            break;
          }
          this.activeNpcId = "safety_boy";
          st.openDialog({
            speaker: `${st.playerName} (همیار برق)`,
            lines: [
              "پسر جان! صبر کن، به سیم لخت تیر برق دست نزن!",
              "تیرهای برق و سیم‌های آن‌ها ولتاژ بالایی دارند؛ به‌خصوص در روزهای بارانی که هوا مرطوب است، برق به راحتی از آب عبور می‌کند و باعث برق‌گرفتگی می‌شود.",
              "اگر سیم افتاده یا آسیب‌دیده دیدی، هرگز نزدیک نشو و فوراً با شماره ۱۲۱ شرکت توزیع برق تماس بگیر.",
            ],
            index: 0,
            onEnd: "safety_kid",
          });
          break;
        }
        if (it.id === "safety_flag") {
          if (st.worldPads.includes(it.id)) {
            st.toast("پرچم‌ها با فاصله ایمن نصب شده‌اند ✓", "info");
            break;
          }
          this.activeNpcId = "flagman1";
          st.openDialog({
            speaker: `${st.playerName} (همیار برق)`,
            lines: [
              "آقایان! لطفاً پرچم‌ها را این‌قدر نزدیک سیم‌های برق نصب نکنید.",
              "پایه پرچم و میله‌های بلند باید حداقل ۳ متر از سیم‌های برق فاصله داشته باشند؛ برخورد میله با سیم باعث خطر برق‌گرفتگی، آتش‌سوزی و قطعی برق محله می‌شود.",
              "برای نصب داربست، چهارپایه و پرچم همیشه فاصله ایمن را رعایت کنید؛ مخصوصاً نزدیک مسجد و محل رفت‌وآمد مردم.",
            ],
            index: 0,
            onEnd: "safety_flag",
          });
          break;
        }
        st.completePad(it.id);
        this.zones.setPad(it.id, true);
        const col = it.id.startsWith("led_") ? "#2fd04a" : it.id.startsWith("miner_") ? "#ff5a4d" : "#ffd23a";
        this.particles.burst(this.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 22, col);
        audio.zap();
        setTimeout(() => audio.success(), 250);
        if (it.id === "crypto_owner") this.hero.celebrate();
        break;
      }
    }
  }

  resetPads() {
    this.zones.reset();
    this.medalStarted = false;
    this.hero.setMedal(false);
    audio.rain(false);
  }

  travelWorld(n: number) {
    const sp = WORLD_SPAWNS[n];
    if (!sp) return;
    if (this.glide !== "none") {
      this.glide = "none";
      this.hero.setGlider(false);
      useGame.getState().setGliding(false);
    }
    this.pos.set(sp.x, sp.y, sp.z);
    this.vel.set(0, 0, 0);
    this.vy = 0;
    this.heading = Math.PI;
    this.yaw = Math.PI;
    this.pitch = 0.3;
    const st = useGame.getState();
    st.setActiveWorld(n);
    st.setOnRoof(false);
    st.setInHouse(false);
    st.toast(n === 1 ? "بازگشت به بوشهر" : n === 2 ? "به شهر خورشیدی خوش آمدی ☀️" : n === 3 ? "به منطقه انرژی بادی خوش آمدی 💨" : n === 4 ? "به شهر انرژی پیشرفته خوش آمدی ⚛️" : "به محله تابلوی هوشمند خوش آمدی 🪧", "info");
    audio.open();
    this.updateCamera(1, true);
  }

  private jump() {
    if (this.grounded && this.mode === "play" && this.glide === "none") {
      this.vy = 6.2;
      this.grounded = false;
      audio.jump();
    }
  }

  toggleGlider() {
    const st = useGame.getState();
    if (st.phase !== "playing" || st.panel) return;
    if (st.onRoof || st.inHouse) {
      st.toast("چتر فقط در فضای باز کار می‌کند", "warn");
      return;
    }
    if (this.glide === "none") {
      if (!isGliderUnlocked(st.worldPads)) {
        st.toast("چتر پرواز بعد از کامل‌کردن منطقه انرژی بادی باز می‌شود 💨", "warn");
        return;
      }
      this.glide = "up";
      this.glideStart.copy(this.pos);
      this.hero.setGlider(true);
      st.setGliding(true);
      audio.jump();
      st.toast("چتر باز شد! با WASD پرواز کن، دوباره F بزن تا سر جایت فرود بیایی", "info");
    } else if (this.glide === "up" || this.glide === "fly") {
      this.glide = "down";
      st.toast("در حال فرود سر جای اول...", "info");
    }
  }

  /* ---------------- physics ---------------- */
  private resolveCollisions() {
    const r = 0.38;
    const st = useGame.getState();
    if (st.onRoof) {
      const b = this.world.roofBounds;
      this.pos.x = THREE.MathUtils.clamp(this.pos.x, b.minX + r, b.maxX - r);
      this.pos.z = THREE.MathUtils.clamp(this.pos.z, b.minZ + r, b.maxZ - r);
      return;
    }
    for (let iter = 0; iter < 2; iter++) {
      for (const c of this.world.colliders) {
        const cx = THREE.MathUtils.clamp(this.pos.x, c.minX, c.maxX);
        const cz = THREE.MathUtils.clamp(this.pos.z, c.minZ, c.maxZ);
        const dx = this.pos.x - cx;
        const dz = this.pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          if (d2 > 1e-6) {
            const d = Math.sqrt(d2);
            this.pos.x += (dx / d) * (r - d);
            this.pos.z += (dz / d) * (r - d);
          } else {
            // inside box: push out along smallest penetration
            const pl = this.pos.x - c.minX,
              pr = c.maxX - this.pos.x,
              pt = this.pos.z - c.minZ,
              pb = c.maxZ - this.pos.z;
            const m = Math.min(pl, pr, pt, pb);
            if (m === pl) this.pos.x = c.minX - r;
            else if (m === pr) this.pos.x = c.maxX + r;
            else if (m === pt) this.pos.z = c.minZ - r;
            else this.pos.z = c.maxZ + r;
          }
        }
      }
    }
    // world bounds
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, -60, 60);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, -44, 615);
  }

  private inAABB(b: AABB, x: number, z: number) {
    return x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ;
  }

  /* ---------------- gamepad ---------------- */
  private pollGamepad() {
    const gamepads = navigator.getGamepads?.() ?? [];
    const gp = gamepads[0]; // first connected controller
    if (!gp) {
      this.gpAxes = [0, 0, 0, 0];
      this.gpPrevButtons = this.gpButtons.slice();
      this.gpButtons = [];
      return;
    }
    // axes: 0=leftX, 1=leftY, 2=rightX, 3=rightY
    const dead = 0.15;
    this.gpAxes[0] = Math.abs(gp.axes[0]) < dead ? 0 : gp.axes[0];
    this.gpAxes[1] = Math.abs(gp.axes[1]) < dead ? 0 : gp.axes[1];
    this.gpAxes[2] = Math.abs(gp.axes[2]) < dead ? 0 : gp.axes[2];
    this.gpAxes[3] = Math.abs(gp.axes[3]) < dead ? 0 : gp.axes[3];
    // buttons: 0=A, 1=B, 2=X, 3=Y, 4=LB, 5=RB, 8=back, 9=start, 12=dpadUp, 13=dpadDown, 14=dpadLeft, 15=dpadRight
    this.gpPrevButtons = this.gpButtons.slice();
    this.gpButtons = gp.buttons.map((b) => b.pressed || b.touched);
  }
  private gpJustPressed(idx: number) {
    return this.gpButtons[idx] && !this.gpPrevButtons[idx];
  }
  private gpDown(idx: number) {
    return this.gpButtons[idx];
  }

  private updatePlayer(dt: number) {
    const st = useGame.getState();
    const locked = st.panel !== null || st.phase !== "playing";
    let ix = 0,
      iz = 0;
    if (!locked) {
      if (this.keys.has("w") || this.keys.has("arrowup")) iz += 1;
      if (this.keys.has("s") || this.keys.has("arrowdown")) iz -= 1;
      if (this.keys.has("a") || this.keys.has("arrowleft")) ix -= 1;
      if (this.keys.has("d") || this.keys.has("arrowright")) ix += 1;
      ix += this.touch.x;
      iz += this.touch.y;
      // gamepad: left stick = movement
      if (this.gpAxes[1] !== 0) iz -= this.gpAxes[1]; // up on stick = forward (negative y)
      if (this.gpAxes[0] !== 0) ix += this.gpAxes[0]; // right on stick = right
      // D-pad movement
      if (this.gpDown(12)) iz += 1; // dpad up
      if (this.gpDown(13)) iz -= 1; // dpad down
      if (this.gpDown(14)) ix -= 1; // dpad left
      if (this.gpDown(15)) ix += 1; // dpad right
      // A button = jump
      if (this.gpJustPressed(0)) this.jump();
      // B button = interact (E)
      if (this.gpJustPressed(1)) this.interact();
      // X button = scanner (Q)
      if (this.gpJustPressed(2)) {
        if (!st.scannerUnlocked) st.toast("اول باید مأموریت را از خانم فاطمه بگیری", "warn");
        else { st.toggleScanner(); audio.scan(); }
      }
      // Y button = map (M)
      if (this.gpJustPressed(3)) { st.setPanel("map"); audio.open(); }
      // Start = pause
      if (this.gpJustPressed(9)) { st.setPhase("paused"); document.exitPointerLock?.(); }
      // Back = missions
      if (this.gpJustPressed(8)) { st.setPanel("missions"); audio.open(); }
      // LB = run (sprint), RB = glider
      if (this.gpDown(4)) this.keys.add("shift");
      else this.keys.delete("shift");
      if (this.gpJustPressed(5)) this.toggleGlider();
      // right stick = camera
      if (this.gpAxes[2] !== 0) this.yaw -= this.gpAxes[2] * dt * 3.5;
      if (this.gpAxes[3] !== 0) this.pitch = THREE.MathUtils.clamp(this.pitch + this.gpAxes[3] * dt * 2.5, -0.35, 1.1);
      if (this.keys.has(" ")) this.jump();
    }
    const len = Math.hypot(ix, iz);
    if (len > 1) {
      ix /= len;
      iz /= len;
    }
    this.running = !locked && (this.keys.has("shift") || this.touch.run);
    const gliding = this.glide !== "none";
    const maxSpeed = gliding ? 13 : this.running ? 9.5 : 4.8;
    // forward = camera look direction toward player
    const fx = -Math.sin(this.yaw),
      fz = -Math.cos(this.yaw);
    // right = cross(forward, worldUp) — camera's right side
    const rx = Math.cos(this.yaw),
      rz = -Math.sin(this.yaw);
    const tx = (fx * iz + rx * ix) * maxSpeed;
    const tz = (fz * iz + rz * ix) * maxSpeed;
    const accel = len > 0 ? 17 : 13;
    this.vel.x += (tx - this.vel.x) * Math.min(1, dt * accel);
    this.vel.z += (tz - this.vel.z) * Math.min(1, dt * accel);
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    // ---- پرواز با چتر ----
    if (gliding) {
      const glideAlt = this.glideStart.y + this.glideTarget;
      if (this.glide === "up") {
        this.pos.y += dt * 13;
        if (this.pos.y >= glideAlt) {
          this.pos.y = glideAlt;
          this.glide = "fly";
          this.particles.burst(this.pos.clone().add(new THREE.Vector3(0, 1, 0)), 18, "#7fd0ff");
        }
      } else if (this.glide === "fly") {
        this.pos.y = glideAlt + Math.sin(this.sinceStart * 1.4) * 0.6;
        this.grounded = false;
      } else if (this.glide === "down") {
        // فرود در همین مکانی که پرواز می‌کند
        this.pos.y -= dt * 14;
        const landY = st.onRoof ? this.world.roofY : GROUND_Y;
        if (this.pos.y <= landY) {
          this.pos.y = landY;
          this.glide = "none";
          this.hero.setGlider(false);
          this.grounded = true;
          this.vy = 0;
          useGame.getState().setGliding(false);
          audio.switchClick();
          this.particles.burst(this.pos.clone().add(new THREE.Vector3(0, 0.4, 0)), 20, "#ffd23a");
          this.resolveCollisions();
          this.pushOutOfPeople();
        }
      }
      // مرزهای هوایی
      this.pos.x = THREE.MathUtils.clamp(this.pos.x, -55, 55);
      this.pos.z = THREE.MathUtils.clamp(this.pos.z, -44, 615);
    } else {
      // gravity
      const groundY = st.onRoof ? this.world.roofY : GROUND_Y;
      this.vy -= 16 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= groundY) {
        this.pos.y = groundY;
        this.vy = 0;
        this.grounded = true;
      } else this.grounded = false;
      this.resolveCollisions();
      this.pushOutOfPeople();
    }
    // heading
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp > 0.3) {
      const target = Math.atan2(this.vel.x, this.vel.z);
      let d = target - this.heading;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.heading += d * Math.min(1, dt * 12);
    }
    this.hero.root.position.copy(this.pos);
    this.hero.root.rotation.y = this.heading;
    this.hero.update(dt, Math.min(1, sp / 5.5), !this.grounded, this.sinceStart, gliding);
    if (this.grounded && sp > 0.8 && !gliding) audio.footstep(this.running);

    // house / prompt
    const inHouse = !st.onRoof && this.inAABB(this.world.houseInterior, this.pos.x, this.pos.z);
    if (inHouse !== st.inHouse) st.setInHouse(inHouse);
    // nearest interactable
    let best: Interactable | null = null;
    let bestD = 1e9;
    if (!gliding) {
      for (const it of this.world.interactables) {
        if (!!it.roofOnly !== st.onRoof) continue;
        if (it.kind === "appliance" && !inHouse) continue;
        const d = Math.hypot(it.pos.x - this.pos.x, it.pos.z - this.pos.z);
        if (d < it.radius && d < bestD) {
          best = it;
          bestD = d;
        }
      }
    }
    this.nearest = best;
    let prompt: string | null = null;
    if (best && !locked && !gliding) {
      if (best.kind === "appliance") prompt = st.scannerActive ? `اسکن ${best.label}` : st.scannerUnlocked ? `اسکنر را فعال کن (Q)` : best.label;
      else prompt = best.label;
    }
    st.setPrompt(prompt);
    // coins
    const coll = st.worldCoinsCollected;
    this.world.coinPositions.forEach((c, i) => {
      if (coll.includes(i)) return;
      const dy = c.y - this.pos.y;
      if (dy > -0.5 && dy < 2.2 && Math.hypot(c.x - this.pos.x, c.z - this.pos.z) < 0.95) {
        st.collectWorldCoin(i);
        audio.coin();
        this.particles.burst(this.pos.clone().add(new THREE.Vector3(0, 1, 0)), 14, "#ffd23a");
        // چند جرقه سفردریایی
        this.particles.burst(this.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 6, "#fff3b0");
      }
    });
    audio.setSeaDistance(Math.max(0, this.pos.z + 18));
  }

  /* ---------------- camera ---------------- */
  private updateCamera(dt: number, snap = false) {
    const st = useGame.getState();
    const targetDist = this.glide !== "none" ? 9 : st.inHouse ? 3.4 : st.panel === "scanner" ? 3.0 : 5.6 + (this.running ? 0.8 : 0);
    this.camDist += (targetDist - this.camDist) * Math.min(1, dt * 4);
    const look = tmpV.set(this.pos.x, this.pos.y + 1.15, this.pos.z);
    const cp = tmpV2.set(look.x + Math.sin(this.yaw) * Math.cos(this.pitch) * this.camDist, look.y + Math.sin(this.pitch) * this.camDist + 0.4, look.z + Math.cos(this.yaw) * Math.cos(this.pitch) * this.camDist);
    // keep camera inside the house when indoors
    if (st.inHouse) {
      const b = this.world.houseInterior;
      cp.x = THREE.MathUtils.clamp(cp.x, b.minX + 0.4, b.maxX - 0.4);
      cp.z = THREE.MathUtils.clamp(cp.z, b.minZ + 0.4, b.maxZ - 0.4);
      cp.y = Math.min(cp.y, 3.5);
    }
    if (this.glide !== "none") cp.y = Math.max(cp.y, this.pos.y + 0.5);
    else cp.y = Math.max(cp.y, (st.onRoof ? this.world.roofY : GROUND_Y) + 0.5);
    // avoid camera penetrating building colliders (outdoor)
    if (!st.inHouse && !st.onRoof) {
      for (const c of this.world.colliders) {
        if (c.maxX - c.minX < 1.5 || c.maxZ - c.minZ < 1.5) continue;
        if (this.inAABB(c, cp.x, cp.z) && cp.y < 9) {
          // pull camera toward player until outside
          for (let k = 0; k < 8 && this.inAABB(c, cp.x, cp.z); k++) cp.lerp(look, 0.15);
        }
      }
    }
    if (snap) {
      this.camPos.copy(cp);
      this.camLook.copy(look);
    } else {
      this.camPos.lerp(cp, Math.min(1, dt * 9));
      this.camLook.lerp(look, Math.min(1, dt * 12));
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    // subtle run FOV kick
    const fovT = this.glide !== "none" ? 72 : this.running && Math.hypot(this.vel.x, this.vel.z) > 4 ? 66 : 60;
    this.camera.fov += (fovT - this.camera.fov) * Math.min(1, dt * 4);
    this.camera.updateProjectionMatrix();
  }

  private updateCinematic(dt: number) {
    this.cineT += dt;
    const t = THREE.MathUtils.clamp(this.cineT / this.cineDur, 0, 1);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const p = this.cinePath.getPointAt(e);
    const l = this.cineLook.getPointAt(e);
    this.camera.position.copy(p);
    this.camera.lookAt(l);
    this.camPos.copy(p);
    this.camLook.copy(l);
    const st = useGame.getState();
    const heroName = useGame.getState().playerName;
    const cap = this.cineT < 5 ? "خلیج فارس — بوشهر، شهر انرژی‌های پاک" : this.cineT < 11 ? "کوچه‌های شناشیر، خانه‌هایی که با باد و سایه خنک می‌شدند..." : this.cineT < 17 ? "اما امروز، مصرف برق در ساعت اوج (۱۳ تا ۱۸) شبکه را زیر فشار می‌برد" : `شهر به کمک تو نیاز دارد، ${heroName}! تو «یار برق» محله‌ای`;
    if (st.cinematicText !== cap) st.setCinematicText(cap);
    this.hero.update(dt, 0, false, this.sinceStart);
    this.hero.root.rotation.y = this.cineT > 17 ? 0 : Math.PI * 0.85;
    if (this.cineT >= this.cineDur) this.finishCinematic();
  }

  /* ---------------- NPCs ---------------- */
  private updateNpcs(dt: number) {
    const st0 = useGame.getState();
    const inDialog = st0.panel === "dialog";
    for (const n of this.npcs) {
      const c = n.char;
      let speedNorm = 0;
      // موقع صحبت، همه بایستند و گوینده رو به محمد پارسا کند
      if (inDialog) {
        if (n.id === this.activeNpcId) {
          const d = tmpV.subVectors(this.pos, c.root.position);
          const th = Math.atan2(d.x, d.z);
          let dh = th - c.root.rotation.y;
          while (dh > Math.PI) dh -= Math.PI * 2;
          while (dh < -Math.PI) dh += Math.PI * 2;
          c.root.rotation.y += dh * Math.min(1, dt * 8);
        }
        c.update(dt, 0, false, this.sinceStart);
        continue;
      }
      if (n.speed > 0 && n.path.length > 1) {
        const target = n.path[n.idx];
        const d = tmpV.subVectors(target, c.root.position);
        d.y = 0;
        const dist = d.length();
        if (n.wait > 0) {
          n.wait -= dt;
        } else if (dist < 0.3) {
          n.idx = (n.idx + 1) % n.path.length;
          n.wait = 0.8 + Math.random() * 1.5;
        } else {
          d.normalize();
          // avoid the player a bit
          const toP = tmpV2.subVectors(c.root.position, this.pos);
          const pd = toP.length();
          if (pd < 1.3 && pd > 0.01) d.addScaledVector(toP.normalize(), 0.8).normalize();
          c.root.position.addScaledVector(d, n.speed * dt);
          c.root.position.y = GROUND_Y; // lock to ground
          const targetH = Math.atan2(d.x, d.z);
          let dh = targetH - c.root.rotation.y;
          while (dh > Math.PI) dh -= Math.PI * 2;
          while (dh < -Math.PI) dh += Math.PI * 2;
          c.root.rotation.y += dh * Math.min(1, dt * 6);
          speedNorm = Math.min(1, n.speed / 2.8);
        }
      } else {
        // stationary: look at the player when near
        const dx = this.pos.x - c.root.position.x,
          dz = this.pos.z - c.root.position.z;
        if (Math.hypot(dx, dz) < 4) {
          const th = Math.atan2(dx, dz);
          let dh = th - c.root.rotation.y;
          while (dh > Math.PI) dh -= Math.PI * 2;
          while (dh < -Math.PI) dh += Math.PI * 2;
          c.root.rotation.y += dh * Math.min(1, dt * 4);
        } else if (n.facing !== undefined) {
          let dh = n.facing - c.root.rotation.y;
          while (dh > Math.PI) dh -= Math.PI * 2;
          while (dh < -Math.PI) dh += Math.PI * 2;
          c.root.rotation.y += dh * Math.min(1, dt * 2);
        }
      }
      c.update(dt, speedNorm, false, this.sinceStart);
      // موقعیت نقطه تعامل NPC همراهش حرکت کند
      const it = this.world.interactables.find((x) => x.id === `npc_${n.id}`);
      if (it) it.pos.set(c.root.position.x, c.root.position.y, c.root.position.z);
    }
    // وسایل نقلیه در خیابان
    for (const v of this.vehicles) {
      v.g.position.z += v.speed * v.dir * dt;
      // فقط روی آسفالت؛ هرگز وارد دریا یا پیاده‌رو نشوند
      v.g.position.x = v.x;
      if (v.dir > 0 && v.g.position.z > v.z1) v.g.position.z = v.z0;
      if (v.dir < 0 && v.g.position.z < v.z0) v.g.position.z = v.z1;
      const spin = (v.speed * v.dir * dt) / 0.42;
      for (const w of v.wheels) w.rotation.z -= spin;
      const rider = v.g.getObjectByName("rider");
      if (rider) rider.position.y = Math.abs(Math.sin(this.sinceStart * 9 + v.x)) * 0.03;
      // برخورد با بازیکن
      if (this.glide === "none") {
        const dx = this.pos.x - v.g.position.x;
        const dz = this.pos.z - v.g.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 1.0 && d > 0.001) {
          this.pos.x += (dx / d) * (1.0 - d);
          this.pos.z += (dz / d) * (1.0 - d);
          if (this.sinceStart - v.lastDing > 1.5) {
            v.lastDing = this.sinceStart;
            audio.click();
          }
        }
      }
    }
  }

  private cullDistantLights() {
    const lights = this.scene.children;
    for (const root of lights) {
      root.traverse((o) => {
        const l = o as THREE.PointLight;
        if (!l.isPointLight || l.distance <= 0) return;
        if (l.userData.base === undefined) l.userData.base = l.intensity;
        const desired = l.userData.cur ?? l.userData.base;
        const d = l.position.distanceTo(this.pos);
        l.intensity = d > l.distance + 8 || (l.distance < 40 && d > 45) ? 0 : desired;
      });
    }
  }

  /* بازیکن نباید از بدن مردم رد شود */
  private pushOutOfPeople() {
    for (const n of this.npcs) {
      const p = n.char.root.position;
      const dx = this.pos.x - p.x;
      const dz = this.pos.z - p.z;
      const d = Math.hypot(dx, dz);
      const r = n.char.opts.kind === "hero" || n.char.opts.kind === "boy" || n.char.opts.kind === "girl" ? 0.45 : 0.55;
      if (d < r && d > 0.001) {
        this.pos.x += (dx / d) * (r - d);
        this.pos.z += (dz / d) * (r - d);
      }
    }
  }

  /* ---------------- world/time ---------------- */
  private updateWorld(dt: number) {
    const st = useGame.getState();
    const t = this.sinceStart;
    const w = this.world;
    // time of day — پیش‌فرض روی روز قفل است؛ با دکمه روز/شب عوض می‌شود
    if (this.mode === "play" && st.phase === "playing" && !st.panel && !st.timeLocked) st.tickTime(dt * 0.6);
    const time = st.time;
    const h = (time % 1440) / 60;
    const dayT = THREE.MathUtils.clamp((h - 6) / 12, -0.2, 1.2);
    const sunAlt = Math.sin(Math.PI * THREE.MathUtils.clamp(dayT, 0, 1)); // 0..1
    const sunDir = new THREE.Vector3(Math.cos(Math.PI * dayT), Math.max(-0.2, sunAlt) * 0.95 + 0.05, -0.45).normalize();
    const night = 1 - THREE.MathUtils.smoothstep(sunAlt, -0.02, 0.18);
    const dusk = 1 - THREE.MathUtils.smoothstep(sunAlt, 0.05, 0.45);
    const sunColor = new THREE.Color("#fff3da").lerp(new THREE.Color("#ff9a3c"), dusk);
    this.sun.color.copy(sunColor);
    this.sun.intensity = 2.5 * THREE.MathUtils.smoothstep(sunAlt, 0, 0.25) * (1 - night);
    this.sun.position.copy(this.pos).addScaledVector(sunDir, 80);
    this.sun.target.position.copy(this.pos);
    this.sun.target.updateMatrixWorld();
    this.hemi.intensity = 0.8 * (1 - night) + 0.45;
    this.hemi.color.set("#bfe3ff").lerp(new THREE.Color("#22304f"), night);
    this.hemi.groundColor.set("#d9c39a").lerp(new THREE.Color("#0f1424"), night);
    this.moon.intensity = night * 45;
    this.moon.distance = 200;
    this.moon.decay = 1.2;
    this.moon.position.set(this.pos.x, 18, this.pos.z);
    const haze = 1 - st.neighborhood / 200;
    const safetyDone = ["safety_kid", "safety_flag"].every((p) => st.worldPads.includes(p));
    const safetyZone = !safetyDone && this.pos.z > 66 && this.pos.z < 108;
    const horizon = new THREE.Color("#cbeaff").lerp(new THREE.Color("#7f8fa6"), st.weather === "rain" || safetyZone ? 0.6 : 0).lerp(new THREE.Color("#ffb46b"), dusk * 0.85).lerp(new THREE.Color("#0b1330"), night);
    const top = new THREE.Color("#1e8ee8").lerp(new THREE.Color("#3a4a9a"), dusk * 0.6).lerp(new THREE.Color("#02040d"), night);
    w.sky.uniforms.uTop.value.copy(top);
    w.sky.uniforms.uHorizon.value.copy(horizon);
    w.sky.uniforms.uSunDir.value.copy(sunDir);
    w.sky.uniforms.uSunColor.value.copy(sunColor);
    w.sky.uniforms.uNight.value = night;
    w.sky.uniforms.uTime.value = t;
    (this.scene.fog as THREE.FogExp2).color.copy(horizon);
    (this.scene.fog as THREE.FogExp2).density = 0.003 + 0.0016 * haze + (st.weather === "haze" ? 0.002 : 0) + (st.weather === "rain" || safetyZone ? 0.005 : 0);
    w.water.uniforms.uTime.value = t;
    w.water.uniforms.uSunDir.value.copy(sunDir);
    w.water.uniforms.uNight.value = night;
    w.water.uniforms.uFogColor.value.copy(horizon);
    w.sunSprite.position.copy(this.camera.position).addScaledVector(sunDir, 800);
    w.sunSprite.lookAt(this.camera.position);
    (w.sunSprite.material as THREE.MeshBasicMaterial).color.copy(sunColor);
    w.sunSprite.visible = sunAlt > -0.05;
    this.renderer.toneMappingExposure = 1.05 - dusk * 0.1 + night * 0.35;

    // lamps / windows at night; neighbourhood progress changes lamp tech
    const lampOn = night > 0.35 || dusk > 0.75;
    const led = st.neighborhood >= 48;
    for (const l of w.lamps) {
      const m = this.glowMats.get(l)!;
      m.emissive.set(led ? "#dff6ff" : "#ff9f2e");
      m.emissiveIntensity = lampOn ? 3 : 0;
    }
    // چراغ‌های LED دو طرف خیابان (همیشه LED)
    for (const l of w.nightLamps) {
      const m = l.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = lampOn ? 5 : 0.15;
    }
    for (const pl of w.streetLights) {
      const desired = lampOn ? 55 : 0;
      const far = pl.position.distanceTo(this.pos) > 34;
      pl.intensity = far ? 0 : desired;
    }
    // ماه کامل در آسمان شب
    {
      const moonDir = new THREE.Vector3(-sunDir.x, 0.55, -sunDir.z).normalize();
      w.moonMesh.position.copy(this.camera.position).addScaledVector(moonDir, 700);
      w.moonMesh.lookAt(this.camera.position);
      w.moonMesh.visible = night > 0.25;
      (w.moonMesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.95, night);
    }
    w.windows.forEach((win, i) => {
      const m = this.glowMats.get(win)!;
      m.emissiveIntensity = lampOn ? (i % 3 === 0 ? 0.2 : 1.4) : 0;
    });
    w.progressFlags.visible = st.neighborhood >= 70;

    // boats, gulls, clouds, palms
    for (const b of w.boats) {
      b.mesh.position.y = b.base.y + Math.sin(t * 0.9 + b.phase) * 0.14;
      b.mesh.rotation.z = Math.sin(t * 0.7 + b.phase) * 0.04;
      b.mesh.rotation.x = Math.sin(t * 0.5 + b.phase) * 0.03;
      if (b.drift > 0) b.mesh.position.x = b.base.x + Math.sin(t * 0.05 + b.phase) * 20 * b.drift;
    }
    // دسته مرغ‌های دریایی (Instanced)
    {
      const d4 = M4,
        qq = Q;
      const scaleW = new THREE.Vector3();
      for (let i = 0; i < w.flock.count; i++) {
        const f = w.flockData[i];
        f.a += dt * f.spd;
        const x = f.cx + Math.cos(f.a) * f.r;
        const z = f.cz + Math.sin(f.a) * f.r;
        const y = f.h + Math.sin(f.a * 2) * 1.6 + Math.sin(t * 2 + i) * 0.4;
        qq.setFromAxisAngle(UP, -f.a + Math.PI / 2);
        const flap = 1 + Math.sin(t * 10 + i * 0.7) * 0.25;
        scaleW.set(f.s, f.s * flap, f.s);
        d4.compose(P.set(x, y, z), qq, scaleW);
        w.flock.setMatrixAt(i, d4);
      }
      w.flock.instanceMatrix.needsUpdate = true;
    }
    // پاشش موج روی سنگفرش ساحل
    for (const s of w.splashes) {
      const ph = 0.5 + 0.5 * Math.sin(t * 1.8 + s.userData.ph);
      (s.material as THREE.MeshBasicMaterial).opacity = 0.12 + ph * 0.45;
      const sc = 0.7 + ph * 0.7;
      s.scale.set(sc, sc, sc);
    }
    for (const c of w.clouds) {
      c.position.x += dt * 0.8;
      if (c.position.x > 260) c.position.x = -260;
    }
    w.palms.forEach((p, i) => {
      const crown = p.children[1];
      if (crown) crown.rotation.z = Math.sin(t * 1.3 + i) * 0.05;
    });
    // coins spin
    const m4 = M4;
    const q = Q;
    w.coinPositions.forEach((c, i) => {
      const taken = st.worldCoinsCollected.includes(i);
      q.setFromAxisAngle(UP, t * 2.5 + i * 0.4);
      const y = c.y + Math.sin(t * 2 + i) * 0.08;
      m4.compose(P.set(c.x, y, c.z), q, taken ? S0 : S1);
      w.coinMesh.setMatrixAt(i, m4);
      w.coinInner.setMatrixAt(i, m4);
    });
    w.coinMesh.instanceMatrix.needsUpdate = true;
    w.coinInner.instanceMatrix.needsUpdate = true;

    // door swing
    const dd = Math.hypot(this.pos.x - w.doorPos.x, this.pos.z - w.doorPos.z);
    const doorTarget = dd < 3.2 && !st.onRoof ? -1.5 : 0;
    const before = w.door.rotation.y;
    w.door.rotation.y += (doorTarget - w.door.rotation.y) * Math.min(1, dt * 3);
    if (Math.abs(before) < 0.02 && Math.abs(w.door.rotation.y) >= 0.02) audio.door();

    // appliances sync
    for (const a of st.appliances) {
      const v = w.appliances[a.id];
      if (!v) continue;
      v.old.visible = !a.efficient;
      v.neu.visible = a.efficient;
      for (const gm of v.glow) {
        const m = this.glowMats.get(gm)!;
        const base = a.type === "bulb" ? (a.efficient ? 2.2 : 1.8) : a.type === "tv" ? 1.2 : a.type === "ac" ? 1.2 : 1.5;
        m.emissiveIntensity = a.on ? base : 0;
        if (a.type === "ac") gm.visible = a.on;
      }
        if (v.light) {
        const li = a.on ? (a.type === "bulb" ? (a.efficient ? 12 : 14) : a.type === "tv" ? 3 : 6) : 0;
        v.light.intensity = li;
        v.light.userData.cur = li;
        if (a.type === "bulb") v.light.color.set(a.efficient ? "#f4f8ff" : "#ffb347");
      }
      const show = st.scannerActive && st.inHouse && !a.fixed;
      v.highlight.visible = show;
      if (show) {
        const s = 1 + Math.sin(t * 5) * 0.12;
        v.highlight.scale.set(s, s, s);
        (v.highlight.material as THREE.MeshBasicMaterial).opacity = 0.6 + Math.sin(t * 5) * 0.3;
      }
    }
    // AC breeze animation
    const ac = w.appliances["ac"];
    if (ac) ac.glow[0].position.x = 0.5 + Math.sin(t * 3) * 0.1;
    // solar
    w.solarGroup.visible = st.solarLevel >= 1;
    w.solarGroup2.visible = st.solarLevel >= 2;
    w.solarMarker.visible = st.solarLevel === 0 && st.missions[1].state === "active";
    if (st.solarLevel > this.prevSolar) {
      this.prevSolar = st.solarLevel;
      audio.zap();
      setTimeout(() => audio.success(), 300);
      this.hero.celebrate();
    }
    if (st.neighborhood > this.prevNeighborhood) this.prevNeighborhood = st.neighborhood;
    // smart meter
    const cons = houseConsumption(st);
    const sm = this.glowMats.get(w.smartMeter)!;
    sm.emissive.set(meterColor(cons.score));
    sm.emissiveIntensity = 0.6 + Math.sin(t * 6) * 0.2;
    // scanner in hand
    this.hero.setScannerVisible(st.scannerActive);
    // خاموش‌کردن نورهای نقطه‌ای دور (سبک‌سازی)
    this.cullDistantLights();
    // همگام‌سازی مأموریت‌ها (مثل کدهای تقلب) با صحنه
    for (const id of st.worldPads) {
      if (!this.syncedPads.has(id)) {
        this.zones.setPad(id, true);
        this.syncedPads.add(id);
      }
    }
    if (st.medalGiven) this.hero.setMedal(true);
    // مخفی‌کردن نشانگرهای ایمنی پس از تکمیل دیالوگ
    for (const id of ["safety_kid", "safety_flag"]) if (st.worldPads.includes(id)) this.zones.setPad(id, true);
    // تابلوی هوشمند کنار خانه فاطمه
    if (w.houseBoard) {
      const hc = houseConsumption(st);
      w.houseBoard.set(Math.max(0, hc.net) / 1000, 2.6, dt);
    }
    // چراغ هشدار قرمز شهرک ایمنی
    {
      const warnLamp = w.group.getObjectByName("warnLamp") as THREE.Mesh | null;
      if (warnLamp) (warnLamp.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(t * 6) > 0 ? 3 : 0.1;
    }
    // باران: تنظیمات یا هنگام مأموریت ایمنی کنار مسجد (شهر اول، دو خیابان بالاتر)
    const rainOn = st.weather === "rain" || (!safetyDone && this.pos.z > 66 && this.pos.z < 108);
    this.rain.update(dt, rainOn, this.pos);
    audio.rain(rainOn && st.phase === "playing" && st.settings.sfx);

    // extra worlds (solar city, wind, nuclear, crypto, safety) animations
    this.zones.update(dt, t, st.activeWorld, st.worldPads);

    // مدال افتخار و نورافشانی پایانی
    if (st.medalGiven && !this.medalStarted) {
      this.medalStarted = true;
      this.hero.setMedal(true);
      this.hero.celebrate();
      audio.applause(6);
      this.fireworkT = 0;
    }
    if (this.fireworkT >= 0) {
      this.fireworkT += dt;
      for (let k = 0; k < 3; k++) {
        if (Math.random() < dt * 6) {
          const colors = ["#ffd23a", "#ff5a8a", "#5ad0ff", "#8aff7a", "#c08aff"];
          this.particles.burst(this.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 14, 14 + Math.random() * 12, (Math.random() - 0.5) * 10)), 26, colors[Math.floor(Math.random() * colors.length)]);
        }
      }
      if (this.fireworkT > 7) this.fireworkT = -1;
    }
    // unlock glider after wind world
    const gliderNow = isGliderUnlocked(st.worldPads);
    if (gliderNow && !this.gliderWasUnlocked) {
      st.toast("🎁 جایزه! چتر پرواز باز شد — با F به ارتفاع ۵۰ متر پرواز کن", "success");
      audio.fanfare();
    }
    this.gliderWasUnlocked = gliderNow;
    // peak announcement
    if (isPeak(time) && !this.peakAnnounced && st.phase === "playing") {
      this.peakAnnounced = true;
      st.toast("⚠️ ساعت اوج مصرف شروع شد (۱۳ تا ۱۸)", "warn");
      audio.warn();
    }
    if (!isPeak(time)) this.peakAnnounced = false;
    // mission complete celebration
    if (st.panel === "missionComplete") {
      if (this.lastPanel !== "missionComplete") {
        this.hero.celebrate();
        audio.fanfare();
      }
      this.yaw += dt * 0.6;
    }
    if (this.lastPanel === "dialog" && st.panel !== "dialog") this.activeNpcId = null;
    this.lastPanel = st.panel;
    void sunFactor;
  }

  /* ---------------- main loop ---------------- */
  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.sinceStart += dt;
    this.pollGamepad();
    const st = useGame.getState();
    // release the mouse whenever UI needs it
    if ((st.panel !== null || st.phase !== "playing") && document.pointerLockElement === this.canvas) {
      document.exitPointerLock?.();
      this.keys.clear();
    }
    this.particles.update(dt);
    if (this.mode === "cinematic") {
      this.updateCinematic(dt);
      this.updateNpcs(dt);
      this.updateWorld(dt);
    } else if (this.mode === "play") {
      if (st.phase !== "paused") {
        this.updatePlayer(dt);
        this.updateNpcs(dt);
        this.updateWorld(dt);
        this.updateCamera(dt);
        this.posSyncT += dt;
        if (this.posSyncT > 0.12) {
          this.posSyncT = 0;
          st.setPlayerPos(this.pos.x, this.pos.z, this.heading);
        }
        this.saveT += dt;
        if (this.saveT > 25) {
          this.saveT = 0;
          st.save();
          st.recordProgress();
        }
      }
    } else {
      // menu: slow orbit over the coast
      const a = this.sinceStart * 0.05;
      this.camera.position.set(Math.sin(a) * 30, 12, -20 + Math.cos(a) * 30);
      this.camera.lookAt(-8, 4, 10);
      this.hero.root.position.set(0, GROUND_Y, -10);
      this.hero.update(dt, 0, false, this.sinceStart);
      this.updateNpcs(dt);
      this.updateWorld(dt);
    }
    this.renderer.render(this.scene, this.camera);
  };
}
