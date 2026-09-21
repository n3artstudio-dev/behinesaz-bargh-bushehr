import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mat } from "./characters";
import { asphaltTex, cobbleTex, plasterTex, sandTex, solarTex, stoneTex, tileFloorTex, woodTex } from "./textures";

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
export type InteractKind = "npc" | "appliance" | "ladder" | "solar" | "shop" | "station" | "roofdown" | "worldgate" | "pad";
export interface Interactable {
  id: string;
  pos: THREE.Vector3;
  radius: number;
  kind: InteractKind;
  label: string;
  roofOnly?: boolean;
}
export interface ApplianceVis {
  group: THREE.Group;
  old: THREE.Object3D;
  neu: THREE.Object3D;
  glow: THREE.Mesh[]; // emissive meshes toggled with 'on'
  light?: THREE.PointLight;
  highlight: THREE.Mesh; // scanner ring
}
export interface NpcSpawn {
  id: string;
  kind: "boy" | "girl" | "man" | "woman" | "elder_man" | "elder_woman" | "fisherman" | "electrician" | "shopkeeper" | "teacher";
  path: THREE.Vector3[];
  speed: number;
  label: string;
  lines: string[];
  facing?: number;
}

export interface World {
  group: THREE.Group;
  colliders: AABB[];
  interactables: Interactable[];
  appliances: Record<string, ApplianceVis>;
  npcSpawns: NpcSpawn[];
  coinMesh: THREE.InstancedMesh;
  coinInner: THREE.InstancedMesh;
  coinPositions: THREE.Vector3[];
  boats: { mesh: THREE.Group; base: THREE.Vector3; phase: number; drift: number }[];
  water: THREE.ShaderMaterial;
  sky: THREE.ShaderMaterial;
  door: THREE.Group;
  doorPos: THREE.Vector3;
  palms: THREE.Group[];
  lamps: THREE.Mesh[];
  windows: THREE.Mesh[];
  solarGroup: THREE.Group;
  solarGroup2: THREE.Group;
  houseInterior: AABB;
  roofBounds: AABB;
  roofY: number;
  ladderPos: THREE.Vector3;
  roofDownPos: THREE.Vector3;
  roofEntryPos: THREE.Vector3;
  clouds: THREE.Group[];
  gulls: THREE.Group[];
  sunSprite: THREE.Mesh;
  progressFlags: THREE.Group;
  smartMeter: THREE.Mesh;
  solarMarker: THREE.Mesh;
}

const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildWorld(): World {
  const group = new THREE.Group();
  const colliders: AABB[] = [];
  const interactables: Interactable[] = [];
  const appliances: Record<string, ApplianceVis> = {};
  const npcSpawns: NpcSpawn[] = [];
  const windows: THREE.Mesh[] = [];
  const lamps: THREE.Mesh[] = [];
  const palms: THREE.Group[] = [];
  const clouds: THREE.Group[] = [];
  const gulls: THREE.Group[] = [];

  // ---------------- Materials ----------------
  const plasterM = new THREE.MeshStandardMaterial({ map: plasterTex("#efe6d2", [2, 2]), roughness: 0.92 });
  const plasterWhite = new THREE.MeshStandardMaterial({ map: plasterTex("#f6f1e6", [2, 2], 3), roughness: 0.9 });
  const plasterWarm = new THREE.MeshStandardMaterial({ map: plasterTex("#e9d8b6", [2, 2], 5), roughness: 0.9 });
  const stoneM = new THREE.MeshStandardMaterial({ map: stoneTex([3, 1]), roughness: 0.95 });
  const woodDark = new THREE.MeshStandardMaterial({ map: woodTex("#5a3a22"), roughness: 0.8 });
  const woodPlum = new THREE.MeshStandardMaterial({ map: woodTex("#5e3f4a"), roughness: 0.8 });
  const woodDoor = new THREE.MeshStandardMaterial({ map: woodTex("#8a4b22"), roughness: 0.75 });
  const woodLight = new THREE.MeshStandardMaterial({ map: woodTex("#a8763f"), roughness: 0.8 });
  const glassDark = mat("#1a3a5a", 0.15, 0.6);
  const metalM = mat("#8f9aa8", 0.35, 0.8);
  const concrete = mat("#c9c3b5", 0.9);

  // ---------------- Ground ----------------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 280), new THREE.MeshStandardMaterial({ map: sandTex([40, 28]), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -18 + 140);
  ground.receiveShadow = true;
  group.add(ground);

  // Promenade (cobble) along the coast
  const prom = new THREE.Mesh(new THREE.PlaneGeometry(160, 10), new THREE.MeshStandardMaterial({ map: cobbleTex([40, 3]), roughness: 0.95 }));
  prom.rotation.x = -Math.PI / 2;
  prom.position.set(0, -0.01, -13);
  prom.receiveShadow = true;
  group.add(prom);

  // Main street (asphalt) + sidewalks
  const street = new THREE.Mesh(new THREE.PlaneGeometry(8, 80), new THREE.MeshStandardMaterial({ map: asphaltTex([2, 20]), roughness: 0.95 }));
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, -0.005, 32);
  street.receiveShadow = true;
  group.add(street);
  // lane markings
  for (let z = -6; z < 70; z += 4) {
    const dash = box(0.15, 0.01, 1.8, mat("#f4f0dc", 0.8), 0, 0.045, z, false);
    group.add(dash);
  }
  const sideM = new THREE.MeshStandardMaterial({ map: cobbleTex([1.5, 20]), roughness: 0.95 });
  for (const sx of [-5.5, 5.5]) {
    const sw = box(3, 0.06, 80, sideM, sx, -0.01, 32);
    sw.castShadow = false;
    group.add(sw);
  }
  // Square (circular plaza)
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(13, 40), new THREE.MeshStandardMaterial({ map: cobbleTex([10, 10]), roughness: 0.95 }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, -0.005, 48);
  plaza.receiveShadow = true;
  group.add(plaza);
  // fountain
  const fBase = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.7, 24), stoneM);
  fBase.position.set(0, 0.33, 48);
  fBase.castShadow = fBase.receiveShadow = true;
  group.add(fBase);
  const fWater = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.1, 24), mat("#43c7e0", 0.1, 0.2, "#2aa9c9", 0.3));
  fWater.position.set(0, 0.68, 48);
  group.add(fWater);
  const fPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1.6, 12), stoneM);
  fPillar.position.set(0, 1.38, 48);
  group.add(fPillar);
  const fTop = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, 0.2, 16), stoneM);
  fTop.position.set(0, 2.18, 48);
  group.add(fTop);
  colliders.push({ minX: -2.7, maxX: 2.7, minZ: 45.3, maxZ: 50.7 });

  // ---------------- Sea & quay ----------------
  const water = makeWater();
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 400, 160, 100), water);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.55, -215);
  group.add(sea);
  // quay wall
  const quay = box(200, 1.6, 1.4, stoneM, 0, 0.1, -18.4);
  group.add(quay);
  const quayTop = box(200, 0.12, 1.8, mat("#d8ccb0", 0.9), 0, 0.92, -18.4, false);
  group.add(quayTop);
  colliders.push({ minX: -120, maxX: 6.2, minZ: -80, maxZ: -17.6 });
  colliders.push({ minX: 9.8, maxX: 120, minZ: -80, maxZ: -17.6 });
  colliders.push({ minX: 6.2, maxX: 9.8, minZ: -80, maxZ: -43 });
  // bollards + mooring
  for (let x = -40; x <= 40; x += 8) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.7, 10), mat("#222", 0.5, 0.6));
    b.position.set(x + 4, 1.3, -18.4);
    b.castShadow = true;
    group.add(b);
  }
  // wooden pier
  const pier = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 26), new THREE.MeshStandardMaterial({ map: woodTex("#9a7247", [2, 12]), roughness: 0.85 }));
  deck.position.set(8, 0.0, -30.5);
  deck.receiveShadow = deck.castShadow = true;
  pier.add(deck);
  for (let z = -20; z >= -42; z -= 4)
    for (const x of [6.4, 9.6]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 3.2, 8), woodDark);
      post.position.set(x, -1.3, z);
      pier.add(post);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 6), woodDark);
      rail.position.set(x, 0.6, z);
      pier.add(rail);
    }
  for (const x of [6.4, 9.6]) {
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 24), woodDark);
    top.position.set(x, 1.05, -31);
    pier.add(top);
  }
  group.add(pier);
  // fishing nets / crates at pier end
  const crate = box(0.8, 0.6, 0.8, woodLight, 7, 0.4, -40);
  group.add(crate);
  const crate2 = box(0.7, 0.5, 0.7, woodLight, 9, 0.35, -39);
  group.add(crate2);

  // Boats
  const boats: World["boats"] = [];
  const boatDefs = [
    { x: 3, z: -24, rot: 0.3, drift: 0 },
    { x: 14, z: -28, rot: -0.5, drift: 0 },
    { x: -22, z: -40, rot: 1.2, drift: 0.6 },
    { x: 40, z: -60, rot: 2.4, drift: 0.9 },
    { x: -55, z: -90, rot: 0.8, drift: 1.2 },
  ];
  boatDefs.forEach((b, i) => {
    const boat = makeBoat(i);
    boat.position.set(b.x, -0.95, b.z);
    boat.rotation.y = b.rot;
    group.add(boat);
    boats.push({ mesh: boat, base: V3(b.x, -0.95, b.z), phase: i * 1.3, drift: b.drift });
  });
  // lighthouse on breakwater far away
  const lh = new THREE.Group();
  const lhBody = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 14, 16), plasterWhite);
  lhBody.position.y = 7;
  lh.add(lhBody);
  const lhTop = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2, 12), mat("#c0392b", 0.6));
  lhTop.position.y = 15;
  lh.add(lhTop);
  const lhLight = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), mat("#fff3b0", 0.2, 0, "#ffe680", 2));
  lhLight.position.y = 16.5;
  lh.add(lhLight);
  lh.position.set(-70, -0.5, -120);
  group.add(lh);
  const breakwater = box(90, 2.5, 6, stoneM, -50, 0, -122);
  group.add(breakwater);

  // ---------------- Sky, sun, clouds ----------------
  const sky = makeSky();
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), sky);
  group.add(skyDome);
  const sunSprite = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshBasicMaterial({ color: "#fff6d5", transparent: true, opacity: 0.95, fog: false }));
  group.add(sunSprite);
  for (let i = 0; i < 10; i++) {
    const c = makeCloud(i);
    c.position.set(-200 + Math.random() * 400, 55 + Math.random() * 30, -120 + Math.random() * 300);
    group.add(c);
    clouds.push(c);
  }
  for (let i = 0; i < 6; i++) {
    const g = makeGull();
    g.userData.angle = Math.random() * Math.PI * 2;
    g.userData.r = 12 + Math.random() * 25;
    g.userData.h = 12 + Math.random() * 10;
    g.userData.cx = -10 + Math.random() * 30;
    g.userData.cz = -30 - Math.random() * 20;
    group.add(g);
    gulls.push(g);
  }

  // ---------------- Palms ----------------
  const palmProto = makePalm();
  const palmSpots: [number, number, number][] = [];
  for (let x = -44; x <= 44; x += 8) if (Math.abs(x - 8) > 3) palmSpots.push([x, -10.5, 0.9 + Math.random() * 0.3]);
  for (let z = -2; z < 66; z += 9) {
    palmSpots.push([-7.2, z, 0.85 + Math.random() * 0.3]);
    palmSpots.push([7.4, z + 4.5, 0.85 + Math.random() * 0.3]);
  }
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) palmSpots.push([Math.cos(a) * 9.5, 48 + Math.sin(a) * 9.5, 0.8]);
  for (const [x, z, s] of palmSpots) {
    const p = palmProto.clone();
    p.position.set(x, 0, z);
    p.scale.setScalar(s);
    p.rotation.y = Math.random() * Math.PI * 2;
    group.add(p);
    palms.push(p);
    colliders.push({ minX: x - 0.35, maxX: x + 0.35, minZ: z - 0.35, maxZ: z + 0.35 });
  }
  // benches on promenade & square
  for (const [x, z, r] of [
    [-12, -12, 0],
    [16, -12, 0],
    [-4, 58, Math.PI],
    [4, 38, 0],
  ] as [number, number, number][]) {
    const bench = makeBench(woodLight, metalM);
    bench.position.set(x, 0, z);
    bench.rotation.y = r;
    group.add(bench);
  }

  // ---------------- Buildings ----------------
  // Mission house (traditional Bushehri, hollow interior)
  const houseInterior: AABB = { minX: -22.5, maxX: -9.5, minZ: 10.5, maxZ: 21.5 };
  const { door, doorPos, solarGroup, solarGroup2, smartMeter, solarMarker } = buildMissionHouse(group, colliders, interactables, appliances, windows, {
    plasterM,
    woodPlum,
    woodDoor,
    woodDark,
    glassDark,
    stoneM,
    metalM,
  });

  // Traditional house near the coast (west)
  traditionalHouse(group, colliders, windows, -16, 0, 12, 10, 1, plasterWarm, woodDark, woodDoor, glassDark, stoneM, { shanasheer: false, doorSide: "east" });
  // Houses around square and further
  traditionalHouse(group, colliders, windows, -17, 40, 12, 10, 2, plasterWhite, woodPlum, woodDoor, glassDark, stoneM, { shanasheer: true, doorSide: "east" });
  traditionalHouse(group, colliders, windows, 17, 44, 12, 12, 2, plasterM, woodDark, woodDoor, glassDark, stoneM, { shanasheer: true, doorSide: "west" });
  traditionalHouse(group, colliders, windows, -17, 58, 12, 10, 1, plasterWarm, woodDark, woodDoor, glassDark, stoneM, { shanasheer: false, doorSide: "east" });
  traditionalHouse(group, colliders, windows, -10, 72, 16, 10, 2, plasterM, woodPlum, woodDoor, glassDark, stoneM, { shanasheer: true, doorSide: "south" });
  traditionalHouse(group, colliders, windows, 10, 72, 16, 10, 2, plasterWhite, woodDark, woodDoor, glassDark, stoneM, { shanasheer: false, doorSide: "south" });
  // Back rows for skyline density
  for (let i = 0; i < 6; i++) {
    traditionalHouse(group, colliders, windows, -34 + i * 14, 86, 11, 9, 1 + (i % 2), i % 2 ? plasterWarm : plasterM, woodDark, woodDoor, glassDark, stoneM, { shanasheer: i % 3 === 0, doorSide: "south", lod: true });
  }
  for (let i = 0; i < 4; i++) {
    traditionalHouse(group, colliders, windows, -34, 10 + i * 18, 10, 12, 1 + (i % 2), plasterWhite, woodDark, woodDoor, glassDark, stoneM, { shanasheer: false, doorSide: "east", lod: true });
    traditionalHouse(group, colliders, windows, 34, 14 + i * 18, 10, 12, 1 + ((i + 1) % 2), plasterWarm, woodDark, woodDoor, glassDark, stoneM, { shanasheer: false, doorSide: "west", lod: true });
  }
  // Modern Iranian apartment
  modernHouse(group, colliders, windows, 17, 22, 12, 12, 3, concrete, glassDark, metalM);
  modernHouse(group, colliders, windows, 17, 58, 12, 10, 2, mat("#e5ddd0", 0.9), glassDark, metalM);
  // Shop
  buildShop(group, colliders, interactables, windows, 16, 3, plasterWarm, woodLight, woodDoor);
  // Electrical station
  buildStation(group, colliders, interactables, -14, 48, metalM);

  // ---------------- Electrical poles & wires ----------------
  const poleZs = [-6, 8, 22, 36, 50, 64];
  const wirePts: THREE.Vector3[] = [];
  for (const z of poleZs) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 8.5, 10), concrete);
    pole.position.set(6.6, 4.25, z);
    pole.castShadow = true;
    group.add(pole);
    const cross = box(1.6, 0.12, 0.12, woodDark, 6.6, 8.0, z);
    group.add(cross);
    for (const dx of [-0.6, 0, 0.6]) {
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 8), mat("#dfe9f5", 0.3));
      ins.position.set(6.6 + dx, 8.15, z);
      group.add(ins);
    }
    // street lamp arm + head
    const arm = box(0.08, 0.08, 2.4, metalM, 6.6, 7.0, z);
    arm.rotation.y = Math.PI / 2;
    arm.position.x = 5.5;
    group.add(arm);
    const head = box(0.5, 0.18, 0.3, metalM, 4.4, 6.95, z);
    group.add(head);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.22), mat("#ffd08a", 0.4, 0, "#ff9f2e", 0));
    lamp.position.set(4.4, 6.84, z);
    group.add(lamp);
    lamps.push(lamp);
    colliders.push({ minX: 6.4, maxX: 6.8, minZ: z - 0.2, maxZ: z + 0.2 });
  }
  const wireMat = new THREE.LineBasicMaterial({ color: "#111", transparent: true, opacity: 0.8 });
  for (let i = 0; i < poleZs.length - 1; i++) {
    for (const dx of [-0.6, 0, 0.6]) {
      const a = V3(6.6 + dx, 8.25, poleZs[i]);
      const b = V3(6.6 + dx, 8.25, poleZs[i + 1]);
      const mid = a.clone().lerp(b, 0.5);
      mid.y -= 0.7;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      wirePts.push(...curve.getPoints(12));
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(14));
      group.add(new THREE.Line(geo, wireMat));
    }
  }
  // service drops to houses
  for (const [z, tx] of [
    [22, -9],
    [8, 12],
    [36, -12],
    [50, 12],
  ]) {
    const a = V3(6.6, 8.2, z);
    const b = V3(tx, 6.2, z + 2);
    const mid = a.clone().lerp(b, 0.5);
    mid.y -= 0.8;
    const geo = new THREE.BufferGeometry().setFromPoints(new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(10));
    group.add(new THREE.Line(geo, wireMat));
  }

  // ---------------- Cars ----------------
  const carDefs: [number, number, string, number][] = [
    [-5.9, 30, "#f2f2f2", 0],
    [5.6, 44, "#2d5fa8", Math.PI],
    [-5.9, 58, "#c9c9c9", 0],
    [-5.9, 2, "#b23a2f", 0],
  ];
  for (const [x, z, c, r] of carDefs) {
    const car = makeCar(c, glassDark, metalM);
    car.position.set(x, 0, z);
    car.rotation.y = r;
    group.add(car);
    colliders.push({ minX: x - 1.0, maxX: x + 1.0, minZ: z - 2.2, maxZ: z + 2.2 });
  }
  // motorbike near shop
  const moto = makeMoto(metalM);
  moto.position.set(9.5, 0, 7);
  moto.rotation.y = 0.4;
  group.add(moto);

  // ---------------- Coins ----------------
  const coinPositions: THREE.Vector3[] = [];
  for (let z = -4; z <= 62; z += 5) {
    const lane = [-2, 0, 2][Math.floor(z / 5) % 3];
    coinPositions.push(V3(lane, 1.22, z));
  }
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) coinPositions.push(V3(Math.cos(a) * 6, 1.22, 48 + Math.sin(a) * 6));
  for (let z = -22; z >= -40; z -= 4.5) coinPositions.push(V3(8, 1.32, z));
  for (let x = -30; x <= 30; x += 6) if (Math.abs(x - 8) > 3) coinPositions.push(V3(x, 1.22, -15.5));
  for (let x = -20; x <= -12; x += 4) coinPositions.push(V3(x, 1.22, 7.5));
  coinPositions.push(V3(-16, 8.72, 18), V3(-13, 8.72, 13), V3(-19, 8.72, 20));
  const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 20);
  coinGeo.rotateX(Math.PI / 2);
  const coinMesh = new THREE.InstancedMesh(coinGeo, mat("#e0a11c", 0.3, 0.7, "#ffb400", 0.35), coinPositions.length);
  coinMesh.castShadow = true;
  const innerGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.12, 20);
  innerGeo.rotateX(Math.PI / 2);
  const coinInner = new THREE.InstancedMesh(innerGeo, mat("#ffd84a", 0.25, 0.6, "#ffcf3a", 0.6), coinPositions.length);
  group.add(coinMesh, coinInner);

  // ---------------- NPC spawns ----------------
  npcSpawns.push(
    {
      id: "fatemeh",
      kind: "woman",
      path: [V3(-7.2, 0, 12.5)],
      speed: 0,
      facing: Math.PI / 2,
      label: "خانم فاطمه",
      lines: [
        "سلام محمد پارسا جان! تو همون یار برق محله‌ای، درسته؟",
        "قبض برق خونه‌ی ما این ماه خیلی زیاد شده. نمی‌دونم مشکل از کجاست.",
        "می‌تونی بیای داخل و با اسکنر انرژی‌ات خونه رو بررسی کنی؟",
        "یادت باشه الان نزدیک ساعت اوج مصرفه؛ از ۱۳ تا ۱۸ باید بیشتر مراقب باشیم.",
      ],
    },
    {
      id: "shopkeeper",
      kind: "shopkeeper",
      path: [V3(10.6, 0, 3)],
      speed: 0,
      facing: -Math.PI / 2,
      label: "آقا رحیم، مغازه‌دار",
      lines: ["خوش اومدی! لامپ LED، پنل خورشیدی و کلید هوشمند دارم.", "با سکه‌های انرژی هرچی بخوای می‌تونی بخری. (E برای فروشگاه)"],
    },
    {
      id: "fisherman",
      kind: "fisherman",
      path: [V3(8, 0.1, -38.5), V3(8, 0.1, -24)],
      speed: 0.5,
      label: "ننه‌خدا، صیاد",
      lines: ["دریا امروز آرومه، نسیم خوبی می‌آد.", "قدیم‌ها بابام می‌گفت خونه‌های شناشیر خودشون خنک بودن؛ کولر لازم نداشتن!"],
    },
    {
      id: "electrician",
      kind: "electrician",
      path: [V3(5.2, 0, 31)],
      speed: 0,
      facing: Math.PI,
      label: "مهندس کریمی، تکنسین برق",
      lines: ["توی ساعت اوج مصرف، شبکه‌ی برق زیر فشاره.", "اگه هر خونه فقط یه کولر رو روی ۲۵ درجه بذاره، خاموشی نداریم!"],
    },
    {
      id: "boy",
      kind: "boy",
      path: [V3(-6, 0, 42), V3(6, 0, 40), V3(7, 0, 56), V3(-6, 0, 55)],
      speed: 1.6,
      label: "علی",
      lines: ["کلاهت خیلی باحاله! منم می‌خوام یار برق بشم!"],
    },
    {
      id: "girl",
      kind: "girl",
      path: [V3(5, 0, 55), V3(-7, 0, 54), V3(-5, 0, 41), V3(6, 0, 42)],
      speed: 1.4,
      label: "زهرا",
      lines: ["مامانم می‌گه لامپ‌های LED خونه‌مون رو تو عوض کردی!", "ما هم چراغ اتاق رو موقع بیرون رفتن خاموش می‌کنیم."],
    },
    {
      id: "elder_man",
      kind: "elder_man",
      path: [V3(5.5, 0, 12), V3(5.5, 0, 34), V3(5.5, 0, 12)],
      speed: 0.7,
      label: "حاج عباس",
      lines: ["پسرم، قدیم‌ها بوشهر برق نداشت؛ حالا باید قدرشو بدونیم.", "روی این بادگیر و شناشیرها دقت کن؛ معماری قدیم خودش هوشمند بود."],
    },
    {
      id: "mother",
      kind: "woman",
      path: [V3(-5.5, 0, -12), V3(20, 0, -12), V3(-5.5, 0, -12)],
      speed: 1.1,
      label: "خانم رضایی",
      lines: ["امروز خلیج فارس چه رنگی شده!", "بچه‌ها رو آوردم ساحل تا کولر خونه خاموش باشه؛ صرفه‌جویی هم هست."],
    },
    {
      id: "teacher",
      kind: "teacher",
      path: [V3(-3, 0, 26), V3(-3, 0, 60), V3(-3, 0, 26)],
      speed: 1.0,
      label: "خانم معلم",
      lines: ["برچسب انرژی A++ یعنی کمترین مصرف. توی مدرسه بهشون یاد دادم.", "امتیاز محله‌مون داره بالا می‌ره؛ آفرین یار برق!"],
    },
  );
  for (const n of npcSpawns) {
    if (n.id === "shopkeeper") continue;
    interactables.push({ id: `npc_${n.id}`, pos: n.path[0].clone(), radius: 2.4, kind: "npc", label: `صحبت با ${n.label}` });
  }

  // progress flags (appear as neighbourhood improves)
  const progressFlags = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3, 6), metalM);
    pole.position.set(Math.cos(a) * 11.5, 1.5, 48 + Math.sin(a) * 11.5);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshStandardMaterial({ color: ["#2fb43a", "#ffd23a", "#3ab7ff"][i % 3], side: THREE.DoubleSide, roughness: 0.8 }));
    flag.position.set(0.45, 1.3, 0);
    pole.add(flag);
    progressFlags.add(pole);
  }
  progressFlags.visible = false;
  group.add(progressFlags);

  return {
    group,
    colliders,
    interactables,
    appliances,
    npcSpawns,
    coinMesh,
    coinInner,
    coinPositions,
    boats,
    water,
    sky,
    door,
    doorPos,
    palms,
    lamps,
    windows,
    solarGroup,
    solarGroup2,
    houseInterior,
    roofBounds: { minX: -22.3, maxX: -9.7, minZ: 10.7, maxZ: 21.3 },
    roofY: 7.5,
    ladderPos: V3(-11.2, 0.12, 9.0),
    roofDownPos: V3(-11.2, 0.12, 8.4),
    roofEntryPos: V3(-11.2, 7.5, 12.2),
    solarMarker,
    clouds,
    gulls,
    sunSprite,
    progressFlags,
    smartMeter,
  };
}

/* ======================= Mission house ======================= */
interface Mats {
  plasterM: THREE.Material;
  woodPlum: THREE.Material;
  woodDoor: THREE.Material;
  woodDark: THREE.Material;
  glassDark: THREE.Material;
  stoneM: THREE.Material;
  metalM: THREE.Material;
}

function buildMissionHouse(
  group: THREE.Group,
  colliders: AABB[],
  interactables: Interactable[],
  appliances: Record<string, ApplianceVis>,
  windows: THREE.Mesh[],
  M: Mats,
) {
  const h = new THREE.Group();
  const x0 = -23,
    x1 = -9,
    z0 = 10,
    z1 = 22;
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  const H1 = 3.9; // ground floor ceiling
  const H2 = 7.5; // roof slab
  const t = 0.5;
  const inner = new THREE.MeshStandardMaterial({ map: plasterTex("#f3ecdd", [3, 1.5], 8), roughness: 0.9 });
  // stone plinth
  h.add(box(x1 - x0 + 0.2, 0.9, z1 - z0 + 0.2, M.stoneM, cx, 0.45, cz));
  // walls (outer)
  const wallN = box(x1 - x0, H2, t, M.plasterM, cx, H2 / 2, z0 + t / 2);
  const wallS = box(x1 - x0, H2, t, M.plasterM, cx, H2 / 2, z1 - t / 2);
  const wallW = box(t, H2, z1 - z0, M.plasterM, x0 + t / 2, H2 / 2, cz);
  h.add(wallN, wallS, wallW);
  // east wall with door gap (z 15.2..16.8) on ground floor, full above
  const eA = box(t, H1, 15.2 - z0, M.plasterM, x1 - t / 2, H1 / 2, (z0 + 15.2) / 2);
  const eB = box(t, H1, z1 - 16.8, M.plasterM, x1 - t / 2, H1 / 2, (16.8 + z1) / 2);
  const eTop = box(t, H2 - H1, z1 - z0, M.plasterM, x1 - t / 2, (H1 + H2) / 2, cz);
  const lintel = box(t, H1 - 2.6, 1.6, M.plasterM, x1 - t / 2, (2.6 + H1) / 2, 16);
  h.add(eA, eB, eTop, lintel);
  colliders.push(
    { minX: x0, maxX: x1, minZ: z0, maxZ: z0 + t },
    { minX: x0, maxX: x1, minZ: z1 - t, maxZ: z1 },
    { minX: x0, maxX: x0 + t, minZ: z0, maxZ: z1 },
    { minX: x1 - t, maxX: x1, minZ: z0, maxZ: 15.2 },
    { minX: x1 - t, maxX: x1, minZ: 16.8, maxZ: z1 },
  );
  // inner wall skins (lighter plaster) — thin planes for interior look
  const innerN = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 2 * t, H1), inner);
  innerN.position.set(cx, H1 / 2, z0 + t + 0.01);
  h.add(innerN);
  const innerS = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 2 * t, H1), inner);
  innerS.position.set(cx, H1 / 2, z1 - t - 0.01);
  innerS.rotation.y = Math.PI;
  h.add(innerS);
  const innerW = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0 - 2 * t, H1), inner);
  innerW.position.set(x0 + t + 0.01, H1 / 2, cz);
  innerW.rotation.y = Math.PI / 2;
  h.add(innerW);
  // east inner wall split around the door opening (z 15.2..16.8)
  const innerEa = new THREE.Mesh(new THREE.PlaneGeometry(15.2 - (z0 + t), H1), inner);
  innerEa.position.set(x1 - t - 0.01, H1 / 2, (z0 + t + 15.2) / 2);
  innerEa.rotation.y = -Math.PI / 2;
  const innerEb = new THREE.Mesh(new THREE.PlaneGeometry(z1 - t - 16.8, H1), inner);
  innerEb.position.set(x1 - t - 0.01, H1 / 2, (16.8 + z1 - t) / 2);
  innerEb.rotation.y = -Math.PI / 2;
  const innerEtop = new THREE.Mesh(new THREE.PlaneGeometry(1.6, H1 - 2.6), inner);
  innerEtop.position.set(x1 - t - 0.01, (2.6 + H1) / 2, 16);
  innerEtop.rotation.y = -Math.PI / 2;
  h.add(innerEa, innerEb, innerEtop);
  // floor (Bushehri tiles) and ceiling (wooden beams)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 2 * t, z1 - z0 - 2 * t), new THREE.MeshStandardMaterial({ map: tileFloorTex([5, 4]), roughness: 0.6 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.02, cz);
  floor.receiveShadow = true;
  h.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 2 * t, z1 - z0 - 2 * t), new THREE.MeshStandardMaterial({ map: woodTex("#9a6a3c", [6, 1]), roughness: 0.85 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(cx, H1, cz);
  h.add(ceil);
  for (let z = z0 + 1.5; z < z1 - 1; z += 1.5) h.add(box(x1 - x0 - 2 * t, 0.18, 0.18, M.woodDark, cx, H1 - 0.09, z));
  // slab between floors + roof slab
  h.add(box(x1 - x0, 0.3, z1 - z0, M.plasterM, cx, H1 + 0.15, cz));
  const roof = box(x1 - x0, 0.3, z1 - z0, new THREE.MeshStandardMaterial({ map: plasterTex("#d9cdb2", [3, 3], 4), roughness: 1 }), cx, H2 + 0.15, cz);
  h.add(roof);
  // parapet
  const pH = 0.9;
  h.add(box(x1 - x0, pH, 0.3, M.plasterM, cx, H2 + 0.3 + pH / 2, z0 + 0.15));
  h.add(box(x1 - x0, pH, 0.3, M.plasterM, cx, H2 + 0.3 + pH / 2, z1 - 0.15));
  h.add(box(0.3, pH, z1 - z0, M.plasterM, x0 + 0.15, H2 + 0.3 + pH / 2, cz));
  h.add(box(0.3, pH, z1 - z0, M.plasterM, x1 - 0.15, H2 + 0.3 + pH / 2, cz));
  // rooftop: water tank + stair box + badgir (wind catcher)
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.2, 14), mat("#e8e2d0", 0.8));
  tank.position.set(x0 + 2, H2 + 0.9, z0 + 2);
  tank.castShadow = true;
  h.add(tank);
  const badgir = box(1.6, 3, 1.6, M.plasterM, x0 + 2.2, H2 + 1.8, z1 - 2.2);
  h.add(badgir);
  for (const side of [-1, 1]) {
    const slot = box(0.1, 1.6, 1.0, mat("#2a2a2a", 0.9), x0 + 2.2 + side * 0.8, H2 + 2.2, z1 - 2.2, false);
    h.add(slot);
  }
  // exterior arched windows (street side) & upper floor
  for (const z of [12.4, 19.6]) archWindow(h, windows, x1 + 0.02, 2.1, z, Math.PI / 2, 1.2, 2.0, M.woodDark, "#2e5f8c");
  for (const z of [11.8, 14.6, 17.4, 20.2]) archWindow(h, windows, x1 + 0.02, H1 + 1.9, z, Math.PI / 2, 1.0, 1.9, M.woodDark, "#7aa3c9");
  for (const x of [-20, -16, -12]) archWindow(h, windows, x, H1 + 1.9, z1 + 0.02, 0, 1.0, 1.9, M.woodDark, "#7aa3c9");
  archWindow(h, windows, -13, 2.1, z1 + 0.02, 0, 1.2, 2.0, M.woodDark, "#2e5f8c");
  // interior stained glass fan light above windows (visible inside)
  // Shanasheer: wooden balcony wrapping street (east) and south facades at upper floor
  shanasheer(h, x1, H1 + 0.3, z0 + 1.0, z1 - 1.0, Math.PI / 2, M.woodPlum, M.woodDark);
  shanasheer(h, z1, H1 + 0.3, x0 + 1.0, x1 - 1.0, 0, M.woodPlum, M.woodDark);
  // Door (pivot) at east wall
  const door = new THREE.Group();
  const doorMesh = box(0.1, 2.5, 1.5, M.woodDoor, 0, 1.25, 0.75);
  door.add(doorMesh);
  for (let i = 0; i < 12; i++) {
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mat("#2b2b2b", 0.5, 0.6));
    stud.position.set(-0.06, 0.4 + (i % 4) * 0.6, 0.25 + Math.floor(i / 4) * 0.5);
    door.add(stud);
  }
  const knocker = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 6, 12), mat("#a67c2e", 0.4, 0.8));
  knocker.position.set(-0.07, 1.3, 1.25);
  knocker.rotation.y = Math.PI / 2;
  door.add(knocker);
  door.position.set(x1 - 0.2, 0.05, 15.25);
  h.add(door);
  // fanlight above door
  const fan = new THREE.Mesh(new THREE.CircleGeometry(0.8, 16, 0, Math.PI), mat("#f3d27a", 0.3, 0, "#ffc94a", 0.3));
  fan.position.set(x1 + 0.03, 2.6, 16);
  fan.rotation.y = Math.PI / 2;
  h.add(fan);
  const fanFrame = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.86, 16, 1, 0, Math.PI), M.woodDark);
  fanFrame.position.set(x1 + 0.04, 2.6, 16);
  fanFrame.rotation.y = Math.PI / 2;
  h.add(fanFrame);
  // door frame
  h.add(box(0.15, 2.7, 0.15, M.woodDark, x1 + 0.02, 1.35, 15.15));
  h.add(box(0.15, 2.7, 0.15, M.woodDark, x1 + 0.02, 1.35, 16.85));
  // step
  h.add(box(0.8, 0.18, 2.2, M.stoneM, x1 + 0.4, 0.09, 16));
  // bougainvillea by the door + pots
  const bougM = mat("#e0308a", 0.8);
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.35 + Math.random() * 0.3, 8, 6), bougM);
    b.position.set(x1 + 0.25 + Math.random() * 0.4, 2.2 + Math.random() * 1.6, 13 + Math.random() * 1.6);
    h.add(b);
  }
  const leafM = mat("#2f7d3a", 0.8);
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), leafM);
    b.position.set(x1 + 0.2, 1.9 + i * 0.35, 12.6 + i * 0.3);
    h.add(b);
  }
  for (const z of [14.2, 17.9]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.4, 10), mat("#b0603a", 0.9));
    pot.position.set(x1 + 0.5, 0.38, z);
    pot.castShadow = true;
    h.add(pot);
    const plant = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), leafM);
    plant.position.set(x1 + 0.5, 0.75, z);
    h.add(plant);
  }
  // ladder to roof (north wall exterior, in the shaded alley)
  const ladder = new THREE.Group();
  for (const dx of [-0.25, 0.25]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, H2 + 1.2, 8), M.metalM);
    rail.position.set(dx, (H2 + 1.2) / 2, 0);
    ladder.add(rail);
  }
  for (let y = 0.4; y < H2 + 1; y += 0.4) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), M.metalM);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, y, 0);
    ladder.add(rung);
  }
  ladder.position.set(-11.2, 0, z0 - 0.35);
  h.add(ladder);
  colliders.push({ minX: -11.6, maxX: -10.8, minZ: z0 - 0.6, maxZ: z0 });
  interactables.push({ id: "ladder", pos: V3(-11.2, 0, z0 - 1.0), radius: 1.7, kind: "ladder", label: "بالا رفتن به پشت‌بام" });
  interactables.push({ id: "roofdown", pos: V3(-11.2, H2, z0 + 1.2), radius: 1.7, kind: "roofdown", label: "پایین آمدن از نردبان", roofOnly: true });
  // alley sign pointing to the ladder
  const ladderSign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.4), new THREE.MeshBasicMaterial({ map: textTex("↑ راه پشت‌بام", "#ffffff", "#1d4f9a"), transparent: true }));
  ladderSign.position.set(-11.2, 2.4, z0 - 0.05);
  ladderSign.rotation.y = Math.PI;
  h.add(ladderSign);
  // solar spot on roof
  const solarGroup = new THREE.Group();
  const solarGroup2 = new THREE.Group();
  const panelM = new THREE.MeshStandardMaterial({ map: solarTex(), roughness: 0.25, metalness: 0.5 });
  const makePanelRow = (g: THREE.Group, zz: number) => {
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 1.1), panelM);
      p.position.set(-19 + i * 1.9, 0.75, zz);
      p.rotation.x = -0.45;
      p.castShadow = true;
      g.add(p);
      const leg = box(0.06, 0.6, 0.06, M.metalM, -19 + i * 1.9, 0.3, zz + 0.4);
      g.add(leg);
      const leg2 = box(0.06, 0.25, 0.06, M.metalM, -19 + i * 1.9, 0.12, zz - 0.4);
      g.add(leg2);
    }
  };
  makePanelRow(solarGroup, 14);
  makePanelRow(solarGroup2, 16.4);
  const inverter = box(0.4, 0.5, 0.2, mat("#e5e5e5", 0.5), -21.8, 1.2, 15, false);
  solarGroup.add(inverter);
  solarGroup.position.y = H2 + 0.3;
  solarGroup2.position.y = H2 + 0.3;
  solarGroup.visible = false;
  solarGroup2.visible = false;
  h.add(solarGroup, solarGroup2);
  // roof marker (paint square)
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 24), new THREE.MeshBasicMaterial({ color: "#ffd23a", side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(-17, H2 + 0.32, 15);
  marker.name = "solarMarker";
  h.add(marker);
  interactables.push({ id: "solar", pos: V3(-17, H2, 15), radius: 2.2, kind: "solar", label: "نصب پنل خورشیدی", roofOnly: true });
  // roof parapet colliders
  colliders.push({ minX: x0 + 1.8, maxX: x0 + 2.8, minZ: z1 - 3, maxZ: z1 - 1.4 }); // badgir on roof (only matters when on roof; fine)

  // Smart meter on exterior wall
  const smartMeter = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.28), mat("#3a3a3a", 0.5, 0, "#ff3b3b", 0.8));
  smartMeter.position.set(x1 + 0.05, 1.6, 18.2);
  h.add(smartMeter);

  /* ---------- Interior ---------- */
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 3.6), new THREE.MeshStandardMaterial({ map: rugTex(), roughness: 0.9 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-16.5, 0.03, 15.5);
  rug.receiveShadow = true;
  h.add(rug);
  // sofa
  const sofaM = mat("#7d5a8f", 0.9);
  const sofa = new THREE.Group();
  sofa.add(box(3.2, 0.5, 1.0, sofaM, 0, 0.25, 0));
  sofa.add(box(3.2, 0.7, 0.3, sofaM, 0, 0.75, 0.4));
  sofa.add(box(0.3, 0.6, 1.0, sofaM, -1.6, 0.6, 0));
  sofa.add(box(0.3, 0.6, 1.0, sofaM, 1.6, 0.6, 0));
  for (const dx of [-1.0, 1.0]) sofa.add(box(0.5, 0.45, 0.6, mat("#e6c34a", 0.9), dx, 0.72, 0.15));
  sofa.position.set(-16.5, 0, 18.6);
  sofa.rotation.y = Math.PI;
  h.add(sofa);
  colliders.push({ minX: -18.2, maxX: -14.8, minZ: 18.0, maxZ: 19.3 });
  // coffee table + tea glasses
  const table = new THREE.Group();
  table.add(box(1.4, 0.06, 0.8, M.woodDark, 0, 0.45, 0));
  for (const [dx, dz] of [
    [-0.6, -0.3],
    [0.6, -0.3],
    [-0.6, 0.3],
    [0.6, 0.3],
  ])
    table.add(box(0.06, 0.45, 0.06, M.woodDark, dx, 0.22, dz));
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 12), mat("#c9a24a", 0.3, 0.8));
  tray.position.y = 0.49;
  table.add(tray);
  table.position.set(-16.5, 0, 16.6);
  h.add(table);
  colliders.push({ minX: -17.3, maxX: -15.7, minZ: 16.1, maxZ: 17.1 });
  // TV cabinet & TV (north wall)
  const cab = box(2.0, 0.6, 0.5, M.woodDark, -16.5, 0.3, z0 + t + 0.3);
  h.add(cab);
  colliders.push({ minX: -17.6, maxX: -15.4, minZ: z0, maxZ: z0 + t + 0.6 });
  const tvG = new THREE.Group();
  const tvBody = box(1.5, 0.9, 0.08, mat("#151515", 0.4, 0.3), 0, 1.1, 0);
  tvG.add(tvBody);
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 0.78), mat("#3a6fd8", 0.3, 0, "#5aa5ff", 1.2));
  tvScreen.position.set(0, 1.1, 0.045);
  tvG.add(tvScreen);
  tvG.position.set(-16.5, 0, z0 + t + 0.3);
  h.add(tvG);
  const tvLight = new THREE.PointLight("#5aa5ff", 0.6, 4);
  tvLight.position.set(-16.5, 1.3, z0 + 1.2);
  h.add(tvLight);
  appliances["tv"] = {
    group: tvG,
    old: new THREE.Group(),
    neu: new THREE.Group(),
    glow: [tvScreen],
    light: tvLight,
    highlight: ring(-16.5, 0.06, z0 + 1.2, h),
  };
  interactables.push({ id: "app_tv", pos: V3(-16.5, 0, z0 + 1.3), radius: 1.8, kind: "appliance", label: "تلویزیون" });
  // Fridge (north-west corner): old cream vs new silver
  const fridgeG = new THREE.Group();
  const oldF = new THREE.Group();
  oldF.add(box(0.9, 1.8, 0.8, new THREE.MeshStandardMaterial({ map: plasterTex("#e6dcb8", [1, 1], 21), roughness: 0.7 }), 0, 0.9, 0));
  oldF.add(box(0.92, 0.04, 0.82, mat("#8a7a5a", 0.8), 0, 1.15, 0));
  oldF.add(box(0.06, 0.5, 0.06, mat("#8a7a5a", 0.6, 0.5), 0.38, 1.5, 0.42));
  oldF.add(box(0.06, 0.7, 0.06, mat("#8a7a5a", 0.6, 0.5), 0.38, 0.6, 0.42));
  // rust patch
  oldF.add(box(0.3, 0.2, 0.02, mat("#8b4a1e", 0.9), -0.2, 0.15, 0.4, false));
  const labelOld = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.32), mat("#ff5f3b", 0.6));
  labelOld.position.set(-0.2, 1.45, 0.41);
  oldF.add(labelOld);
  const newF = new THREE.Group();
  newF.add(box(0.9, 1.85, 0.8, mat("#cfd6dd", 0.3, 0.8), 0, 0.925, 0));
  newF.add(box(0.92, 0.03, 0.82, mat("#9aa5b0", 0.4, 0.8), 0, 1.2, 0));
  newF.add(box(0.05, 0.6, 0.05, mat("#3a3f45", 0.4, 0.8), 0.38, 1.55, 0.42));
  newF.add(box(0.05, 0.9, 0.05, mat("#3a3f45", 0.4, 0.8), 0.38, 0.6, 0.42));
  const labelNew = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.32), mat("#2fb43a", 0.6, 0, "#2fb43a", 0.3));
  labelNew.position.set(-0.2, 1.5, 0.41);
  newF.add(labelNew);
  newF.visible = false;
  fridgeG.add(oldF, newF);
  fridgeG.position.set(-21.9, 0, z0 + t + 0.5);
  h.add(fridgeG);
  colliders.push({ minX: -22.5, maxX: -21.3, minZ: z0, maxZ: z0 + 1.5 });
  appliances["fridge"] = { group: fridgeG, old: oldF, neu: newF, glow: [], highlight: ring(-21.9, 0.06, z0 + 1.9, h) };
  interactables.push({ id: "app_fridge", pos: V3(-21.9, 0, z0 + 1.9), radius: 1.8, kind: "appliance", label: "یخچال" });
  // Hanging living-room bulb (center)
  const bulbG = new THREE.Group();
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 6), mat("#222", 0.8));
  cord.position.y = H1 - 0.4;
  bulbG.add(cord);
  const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 10), mat("#444", 0.5, 0.5));
  socket.position.y = H1 - 0.85;
  bulbG.add(socket);
  const oldBulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), mat("#ffd58a", 0.2, 0, "#ffb347", 1.8));
  oldBulb.position.y = H1 - 1.05;
  oldBulb.scale.set(1, 1.25, 1);
  const newBulb = new THREE.Group();
  const ledB = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), mat("#ffffff", 0.3, 0, "#f4f8ff", 2.2));
  ledB.position.y = H1 - 1.02;
  const ledBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.12, 12), mat("#e8e8e8", 0.4));
  ledBase.position.y = H1 - 0.92;
  newBulb.add(ledB, ledBase);
  newBulb.visible = false;
  bulbG.add(oldBulb, newBulb);
  bulbG.position.set(-16.5, 0, 15.2);
  h.add(bulbG);
  const bulbLight = new THREE.PointLight("#ffb347", 1.6, 9, 1.6);
  bulbLight.position.set(-16.5, H1 - 1.2, 15.2);
  h.add(bulbLight);
  appliances["bulb_living"] = { group: bulbG, old: oldBulb, neu: newBulb, glow: [oldBulb, ledB], light: bulbLight, highlight: ring(-16.5, 0.06, 15.2, h) };
  interactables.push({ id: "app_bulb_living", pos: V3(-16.5, 0, 15.2), radius: 1.8, kind: "appliance", label: "لامپ پذیرایی" });
  // Hall light near door
  const hallG = new THREE.Group();
  const hallFixture = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat("#fff1c8", 0.3, 0, "#ffd27a", 1.5));
  hallFixture.rotation.x = Math.PI;
  hallFixture.position.y = H1 - 0.02;
  hallG.add(hallFixture);
  hallG.position.set(-11, 0, 16);
  h.add(hallG);
  const hallLight = new THREE.PointLight("#ffd27a", 1.0, 6, 1.8);
  hallLight.position.set(-11, H1 - 0.5, 16);
  h.add(hallLight);
  // wall switch
  h.add(box(0.03, 0.12, 0.08, mat("#f0f0f0", 0.5), x1 - t - 0.02, 1.3, 14.6, false));
  appliances["light_hall"] = { group: hallG, old: new THREE.Group(), neu: new THREE.Group(), glow: [hallFixture], light: hallLight, highlight: ring(-11, 0.06, 16, h) };
  interactables.push({ id: "app_light_hall", pos: V3(-11, 0, 16), radius: 1.7, kind: "appliance", label: "چراغ راهرو" });
  // AC on west wall
  const acG = new THREE.Group();
  const oldAC = new THREE.Group();
  oldAC.add(box(0.35, 0.5, 1.1, new THREE.MeshStandardMaterial({ map: plasterTex("#d8d2c0", [1, 1], 31), roughness: 0.8 }), 0, 0, 0));
  oldAC.add(box(0.05, 0.3, 0.9, mat("#7a7466", 0.9), 0.19, -0.05, 0, false));
  const newAC = new THREE.Group();
  newAC.add(box(0.3, 0.42, 1.1, mat("#f7f7f7", 0.35), 0, 0, 0));
  const acLed = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.06), mat("#2fd0ff", 0.3, 0, "#2fd0ff", 1.5));
  acLed.position.set(0.16, -0.1, 0.3);
  acLed.rotation.y = Math.PI / 2;
  newAC.add(acLed);
  newAC.visible = false;
  const acBreeze = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.25), new THREE.MeshBasicMaterial({ color: "#bfefff", transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  acBreeze.position.set(0.5, -0.35, 0);
  acBreeze.rotation.y = Math.PI / 2;
  acBreeze.rotation.x = 0.6;
  acG.add(oldAC, newAC, acBreeze);
  acG.position.set(x0 + t + 0.2, 2.9, 18.2);
  h.add(acG);
  appliances["ac"] = { group: acG, old: oldAC, neu: newAC, glow: [acBreeze, acLed], highlight: ring(-21.6, 0.06, 18.2, h) };
  interactables.push({ id: "app_ac", pos: V3(-21.6, 0, 18.2), radius: 1.9, kind: "appliance", label: "کولر گازی" });
  // decorative: samovar shelf, framed photo, bookshelf
  h.add(box(1.2, 1.8, 0.35, M.woodDark, -20.5, 0.9, z1 - t - 0.2));
  for (let i = 0; i < 3; i++) h.add(box(1.0, 0.04, 0.3, M.woodDark, -20.5, 0.5 + i * 0.5, z1 - t - 0.2, false));
  for (let i = 0; i < 9; i++) h.add(box(0.08, 0.28, 0.2, mat(["#c0392b", "#2980b9", "#27ae60", "#f39c12"][i % 4], 0.8), -20.95 + i * 0.11, 0.7 + Math.floor(i / 5) * 0.5, z1 - t - 0.2, false));
  const frame = box(0.6, 0.45, 0.03, mat("#c9a24a", 0.4, 0.6), -13, 2.0, z0 + t + 0.03, false);
  h.add(frame);
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), mat("#3f7fbf", 0.8));
  photo.position.set(-13, 2.0, z0 + t + 0.05);
  h.add(photo);
  const samovar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.5, 12), mat("#c9a24a", 0.3, 0.9));
  samovar.position.set(-20.5, 2.05, z1 - t - 0.2);
  h.add(samovar);
  // interior window panels (stained glass arches seen from inside)
  for (const z of [12.4, 19.6]) stainedArch(h, x1 - t - 0.03, 2.1, z, -Math.PI / 2);

  group.add(h);
  return { door, doorPos: V3(x1, 0, 16), solarGroup, solarGroup2, smartMeter, solarMarker: marker };
}

function ring(x: number, y: number, z: number, parent: THREE.Object3D) {
  const r = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 28), new THREE.MeshBasicMaterial({ color: "#ff3b3b", transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  r.rotation.x = -Math.PI / 2;
  r.position.set(x, y, z);
  r.visible = false;
  parent.add(r);
  return r;
}

function stainedArch(parent: THREE.Object3D, x: number, y: number, z: number, rotY: number) {
  const g = new THREE.Group();
  const cols = ["#e63946", "#2a9d8f", "#264653", "#f4a261", "#8ecae6"];
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.CircleGeometry(0.6, 12, (i / 5) * Math.PI, Math.PI / 5), mat(cols[i], 0.3, 0, cols[i], 0.5));
    seg.position.set(0, 1.0, 0);
    g.add(seg);
  }
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  parent.add(g);
}

function archWindow(parent: THREE.Object3D, windows: THREE.Mesh[], x: number, y: number, z: number, rotY: number, w: number, h: number, frameM: THREE.Material, glass: string) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, h + 0.1, 0.12), frameM);
  frame.position.y = 0;
  g.add(frame);
  const arch = new THREE.Mesh(new THREE.CylinderGeometry(w / 2 + 0.1, w / 2 + 0.1, 0.12, 16, 1, false, 0, Math.PI), frameM);
  arch.rotation.x = Math.PI / 2;
  arch.rotation.z = 0;
  arch.position.y = h / 2;
  g.add(arch);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(glass, 0.15, 0.4, "#ffb659", 0));
  pane.position.z = 0.07;
  g.add(pane);
  windows.push(pane);
  const fan = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 14, 0, Math.PI), mat("#f3d27a", 0.3, 0, "#ffc94a", 0.25));
  fan.position.set(0, h / 2, 0.07);
  g.add(fan);
  // wooden shutters (Bushehri)
  for (const s of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, h * 0.9, 0.05), frameM);
    sh.position.set(s * (w / 2 + w * 0.3), 0, 0.1);
    sh.rotation.y = s * -0.5;
    g.add(sh);
  }
  // sill
  const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.1, 0.3), mat("#d8ccb0", 0.9));
  sill.position.set(0, -h / 2 - 0.05, 0.12);
  g.add(sill);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  parent.add(g);
}

function shanasheer(parent: THREE.Object3D, wallCoord: number, y: number, a0: number, a1: number, rotY: number, woodM: THREE.Material, darkM: THREE.Material) {
  // Wooden projecting balcony along a wall. rotY = PI/2 → wall at x=wallCoord spanning z a0..a1 ; rotY=0 → wall at z=wallCoord spanning x a0..a1
  const g = new THREE.Group();
  const len = a1 - a0;
  const depth = 1.4;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, depth), woodM);
  floor.position.set(0, 0, depth / 2);
  floor.castShadow = floor.receiveShadow = true;
  g.add(floor);
  // decorative fretwork skirt
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, 0.05), darkM);
  skirt.position.set(0, -0.2, depth);
  g.add(skirt);
  for (let i = 0; i < len / 0.35; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 4), darkM);
    tooth.rotation.x = Math.PI;
    tooth.position.set(-len / 2 + 0.17 + i * 0.35, -0.45, depth);
    g.add(tooth);
  }
  // railing balusters (instanced)
  const count = Math.floor(len / 0.22);
  const bal = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), woodM, count);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    m4.setPosition(-len / 2 + 0.11 + i * 0.22, 0.55, depth - 0.08);
    bal.setMatrixAt(i, m4);
  }
  bal.castShadow = true;
  g.add(bal);
  const handrail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.14), darkM);
  handrail.position.set(0, 1.02, depth - 0.08);
  g.add(handrail);
  // columns and roof
  const nCols = Math.max(2, Math.round(len / 2.4));
  for (let i = 0; i < nCols; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 2.6, 8), woodM);
    col.position.set(-len / 2 + 0.15 + (i * (len - 0.3)) / (nCols - 1), 1.3, depth - 0.15);
    col.castShadow = true;
    g.add(col);
    // bracket
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.5), darkM);
    br.position.set(col.position.x, 2.45, depth - 0.35);
    g.add(br);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(len + 0.2, 0.1, depth + 0.3), woodM);
  roof.position.set(0, 2.7, depth / 2 + 0.05);
  roof.rotation.x = 0.08;
  roof.castShadow = true;
  g.add(roof);
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(len + 0.2, 0.25, 0.05), darkM);
  cornice.position.set(0, 2.58, depth + 0.2);
  g.add(cornice);
  g.rotation.y = rotY;
  if (rotY === 0) g.position.set((a0 + a1) / 2, y, wallCoord);
  else g.position.set(wallCoord, y, (a0 + a1) / 2);
  parent.add(g);
}

function traditionalHouse(
  group: THREE.Group,
  colliders: AABB[],
  windows: THREE.Mesh[],
  cx: number,
  cz: number,
  w: number,
  d: number,
  floors: number,
  wallM: THREE.Material,
  woodM: THREE.Material,
  doorM: THREE.Material,
  glassM: THREE.Material,
  stoneM: THREE.Material,
  o: { shanasheer: boolean; doorSide: "east" | "west" | "south" | "north"; lod?: boolean },
) {
  void glassM;
  const g = new THREE.Group();
  const H = floors * 3.6;
  const body = box(w, H, d, wallM, 0, H / 2, 0);
  g.add(body);
  g.add(box(w + 0.2, 0.8, d + 0.2, stoneM, 0, 0.4, 0));
  // parapet
  g.add(box(w + 0.1, 0.7, 0.25, wallM, 0, H + 0.35, -d / 2 + 0.12));
  g.add(box(w + 0.1, 0.7, 0.25, wallM, 0, H + 0.35, d / 2 - 0.12));
  g.add(box(0.25, 0.7, d + 0.1, wallM, -w / 2 + 0.12, H + 0.35, 0));
  g.add(box(0.25, 0.7, d + 0.1, wallM, w / 2 - 0.12, H + 0.35, 0));
  // rooftop props
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.1, 12), mat("#e8e2d0", 0.8));
  tank.position.set(-w / 2 + 1.6, H + 0.55, -d / 2 + 1.6);
  g.add(tank);
  if (floors > 1) {
    const badgir = box(1.4, 2.4, 1.4, wallM, w / 2 - 1.8, H + 1.2, d / 2 - 1.8);
    g.add(badgir);
  }
  // facade side vector
  const side = o.doorSide;
  const facadeRot = side === "east" ? Math.PI / 2 : side === "west" ? -Math.PI / 2 : side === "south" ? 0 : Math.PI;
  const fx = side === "east" ? w / 2 : side === "west" ? -w / 2 : 0;
  const fz = side === "south" ? d / 2 : side === "north" ? -d / 2 : 0;
  const along = side === "east" || side === "west" ? d : w;
  // door
  const door = new THREE.Group();
  door.add(box(0.12, 2.4, 1.4, doorM, 0, 1.2, 0));
  for (let i = 0; i < 8; i++) {
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), mat("#2b2b2b", 0.5, 0.6));
    stud.position.set(0.07, 0.5 + (i % 4) * 0.5, -0.4 + Math.floor(i / 4) * 0.8);
    door.add(stud);
  }
  const fan = new THREE.Mesh(new THREE.CircleGeometry(0.75, 14, 0, Math.PI), mat("#f3d27a", 0.3, 0, "#ffc94a", 0.25));
  fan.position.set(0.08, 2.45, 0);
  fan.rotation.y = Math.PI / 2;
  door.add(fan);
  door.rotation.y = facadeRot - Math.PI / 2;
  door.position.set(fx * 1.01, 0.05, fz * 1.01);
  g.add(door);
  // windows on facade (ground + upper floors)
  const n = Math.max(2, Math.floor(along / 3.2));
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < n; i++) {
      const off = -along / 2 + (i + 0.5) * (along / n);
      if (f === 0 && Math.abs(off) < 1.2) continue;
      const wx = side === "east" || side === "west" ? fx * 1.01 : off;
      const wz = side === "east" || side === "west" ? off : fz * 1.01;
      if (o.lod) {
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.8), mat("#2e5f8c", 0.2, 0.4, "#ffb659", 0));
        pane.position.set(wx, f * 3.6 + 2.0, wz);
        pane.rotation.y = facadeRot;
        g.add(pane);
        windows.push(pane);
      } else archWindow(g, windows, wx, f * 3.6 + 2.0, wz, facadeRot, 1.0, 1.8, woodM, f === 0 ? "#2e5f8c" : "#7aa3c9");
    }
  }
  if (o.shanasheer && floors > 1) {
    if (side === "east") shanasheer(g, w / 2, 3.8, -d / 2 + 1, d / 2 - 1, Math.PI / 2, woodM, woodM);
    else if (side === "west") shanasheer(g, -w / 2, 3.8, -(d / 2 - 1), -(-d / 2 + 1), -Math.PI / 2, woodM, woodM);
    else if (side === "south") shanasheer(g, d / 2, 3.8, -w / 2 + 1, w / 2 - 1, 0, woodM, woodM);
  }
  // bougainvillea on some houses
  if (!o.lod && Math.random() > 0.4) {
    const bougM = mat("#e0308a", 0.8);
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.3, 7, 5), bougM);
      const off = -along / 2 + 1.2 + Math.random() * 1.2;
      const bx = side === "east" || side === "west" ? fx * 1.02 : off;
      const bz = side === "east" || side === "west" ? off : fz * 1.02;
      b.position.set(bx, 2.0 + Math.random() * 1.5, bz);
      g.add(b);
    }
  }
  g.position.set(cx, 0, cz);
  group.add(g);
  colliders.push({ minX: cx - w / 2 - 0.1, maxX: cx + w / 2 + 0.1, minZ: cz - d / 2 - 0.1, maxZ: cz + d / 2 + 0.1 });
}

function modernHouse(group: THREE.Group, colliders: AABB[], windows: THREE.Mesh[], cx: number, cz: number, w: number, d: number, floors: number, wallM: THREE.Material, glassM: THREE.Material, metalM: THREE.Material) {
  const g = new THREE.Group();
  const H = floors * 3.2;
  g.add(box(w, H, d, wallM, 0, H / 2, 0));
  const stoneBand = mat("#b7a58a", 0.9);
  g.add(box(w + 0.1, 1.0, d + 0.1, stoneBand, 0, 0.5, 0));
  for (let f = 0; f < floors; f++) {
    const y = f * 3.2;
    // balcony on west facade (towards street)
    if (f > 0) {
      const bal = box(1.4, 0.2, d - 3, mat("#e8e8e8", 0.7), -w / 2 - 0.7, y + 0.1, 0);
      g.add(bal);
      const rail = box(0.06, 1.0, d - 3, glassM, -w / 2 - 1.35, y + 0.6, 0);
      g.add(rail);
      const railTop = box(0.1, 0.06, d - 3, metalM, -w / 2 - 1.35, y + 1.1, 0);
      g.add(railTop);
    }
    // windows (aluminium)
    for (let i = 0; i < 3; i++) {
      const z = -d / 2 + (i + 0.5) * (d / 3);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.5), mat("#2b4a6b", 0.15, 0.5, "#ffb659", 0));
      pane.position.set(-w / 2 - 0.02, y + 1.9, z);
      pane.rotation.y = -Math.PI / 2;
      g.add(pane);
      windows.push(pane);
      const fr = box(0.06, 1.6, 1.7, metalM, -w / 2 - 0.02, y + 1.9, z, false);
      g.add(fr);
    }
    // AC split units on side wall
    const ac = box(0.9, 0.6, 0.35, mat("#ececec", 0.5), w / 2 - 1.5 - f * 2, y + 2.2, d / 2 + 0.2);
    g.add(ac);
    const grill = box(0.75, 0.45, 0.02, mat("#5b5b5b", 0.6), ac.position.x, ac.position.y, d / 2 + 0.39, false);
    g.add(grill);
  }
  // entrance
  g.add(box(0.1, 2.4, 1.6, mat("#3a3a3a", 0.4, 0.6), -w / 2 - 0.02, 1.2, 0));
  g.add(box(0.5, 0.2, 2.4, stoneBand, -w / 2 - 0.3, 0.1, 0));
  // roof: water tank, satellite dish, parapet
  g.add(box(w + 0.1, 0.6, 0.2, wallM, 0, H + 0.3, -d / 2 + 0.1));
  g.add(box(w + 0.1, 0.6, 0.2, wallM, 0, H + 0.3, d / 2 - 0.1));
  g.add(box(0.2, 0.6, d + 0.1, wallM, -w / 2 + 0.1, H + 0.3, 0));
  g.add(box(0.2, 0.6, d + 0.1, wallM, w / 2 - 0.1, H + 0.3, 0));
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.3, 14), mat("#f0ece2", 0.7));
  tank.position.set(w / 2 - 2, H + 0.65, -d / 2 + 2);
  tank.castShadow = true;
  g.add(tank);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 3), mat("#dcdcdc", 0.5, 0.4));
  dish.position.set(-w / 2 + 1.5, H + 0.8, d / 2 - 1.5);
  dish.rotation.x = -Math.PI / 3;
  g.add(dish);
  g.position.set(cx, 0, cz);
  group.add(g);
  colliders.push({ minX: cx - w / 2 - 1.5, maxX: cx + w / 2 + 0.1, minZ: cz - d / 2 - 0.1, maxZ: cz + d / 2 + 0.6 });
}

function buildShop(group: THREE.Group, colliders: AABB[], interactables: Interactable[], windows: THREE.Mesh[], cx: number, cz: number, wallM: THREE.Material, woodM: THREE.Material, doorM: THREE.Material) {
  const g = new THREE.Group();
  const w = 8,
    d = 6,
    H = 3.6;
  g.add(box(w, H, d, wallM, 0, H / 2, 0));
  g.add(box(w + 0.1, 0.5, 0.2, wallM, 0, H + 0.25, -d / 2 + 0.1));
  g.add(box(w + 0.1, 0.5, 0.2, wallM, 0, H + 0.25, d / 2 - 0.1));
  // shop front opening (west): counter + shutter
  const front = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.4), mat("#26323d", 0.6, 0, "#ffcf7a", 0.15));
  front.position.set(-w / 2 - 0.01, 1.5, 0);
  front.rotation.y = -Math.PI / 2;
  g.add(front);
  windows.push(front);
  g.add(box(0.12, 2.4, 1.2, doorM, -w / 2 - 0.05, 1.2, 2.2));
  // striped awning
  const awn = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const s = box(0.62, 0.05, 1.6, mat(i % 2 ? "#e63946" : "#f8f4e8", 0.85), -2.2 + i * 0.62, 0, 0.8);
    awn.add(s);
  }
  awn.rotation.order = "YXZ";
  awn.rotation.set(0.35, -Math.PI / 2, 0);
  awn.position.set(-w / 2 - 0.02, 3.0, 0);
  g.add(awn);
  // counter with produce crates
  g.add(box(0.8, 0.9, 3.6, woodM, -w / 2 - 0.5, 0.45, 0));
  const fruits = ["#ff8c1a", "#d62828", "#7cc242", "#ffd23a", "#8e44ad"];
  for (let i = 0; i < 5; i++) {
    const crate = box(0.6, 0.25, 0.6, woodM, -w / 2 - 0.5, 1.02, -1.4 + i * 0.7);
    g.add(crate);
    for (let k = 0; k < 5; k++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 6), mat(fruits[i], 0.6));
      f.position.set(-w / 2 - 0.5 + (Math.random() - 0.5) * 0.4, 1.2, -1.4 + i * 0.7 + (Math.random() - 0.5) * 0.4);
      g.add(f);
    }
  }
  // hanging sign
  const sign = box(2.4, 0.6, 0.06, mat("#1d4f9a", 0.6), -w / 2 - 0.9, 3.5, -1.5);
  sign.rotation.y = Math.PI / 2;
  g.add(sign);
  const signText = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.5), new THREE.MeshBasicMaterial({ map: textTex("فروشگاه یار برق ⚡", "#ffd23a", "#1d4f9a"), transparent: true }));
  signText.position.set(-w / 2 - 0.94, 3.5, -1.5);
  signText.rotation.y = -Math.PI / 2;
  g.add(signText);
  // LED bulb display + small solar panel display
  const bulbDisp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), mat("#ffffff", 0.3, 0, "#f4f8ff", 1.5));
  bulbDisp.position.set(-w / 2 - 0.4, 2.2, 1.0);
  g.add(bulbDisp);
  const solarDisp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.5), new THREE.MeshStandardMaterial({ map: solarTex(), roughness: 0.3, metalness: 0.5 }));
  solarDisp.position.set(-w / 2 - 0.5, 1.2, 2.0);
  solarDisp.rotation.x = -0.5;
  g.add(solarDisp);
  g.position.set(cx, 0, cz);
  group.add(g);
  colliders.push({ minX: cx - w / 2 - 1.0, maxX: cx + w / 2 + 0.1, minZ: cz - d / 2 - 0.1, maxZ: cz + d / 2 + 0.1 });
  interactables.push({ id: "shop", pos: V3(cx - w / 2 - 1.8, 0, cz), radius: 2.6, kind: "shop", label: "فروشگاه یار برق" });
}

function buildStation(group: THREE.Group, colliders: AABB[], interactables: Interactable[], cx: number, cz: number, metalM: THREE.Material) {
  const g = new THREE.Group();
  const boxM = mat("#3f7a4a", 0.6, 0.3);
  g.add(box(3, 2.4, 2, boxM, 0, 1.2, 0));
  g.add(box(3.2, 0.15, 2.2, mat("#2c5a34", 0.6, 0.3), 0, 2.45, 0));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), new THREE.MeshBasicMaterial({ map: textTex("⚡ پست برق محله", "#ffd23a", "#b3261e"), transparent: true }));
  sign.position.set(0, 1.6, 1.02);
  g.add(sign);
  // warning triangle
  const tri = new THREE.Mesh(new THREE.CircleGeometry(0.28, 3), mat("#ffd23a", 0.5, 0, "#ffd23a", 0.3));
  tri.position.set(-1.0, 1.0, 1.02);
  tri.rotation.z = Math.PI / 6;
  g.add(tri);
  // fence
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), metalM);
    p.position.set(Math.cos(a) * 2.6, 0.7, Math.sin(a) * 2.2);
    g.add(p);
  }
  const rail = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.02, 6, 32), metalM);
  rail.rotation.x = Math.PI / 2;
  rail.scale.set(1.04, 0.88, 1);
  rail.position.y = 1.35;
  g.add(rail);
  // insulators on top
  for (const dx of [-0.8, 0, 0.8]) {
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 8), mat("#dfe9f5", 0.3));
    ins.position.set(dx, 2.75, 0);
    g.add(ins);
  }
  g.position.set(cx, 0, cz);
  group.add(g);
  colliders.push({ minX: cx - 2.8, maxX: cx + 2.8, minZ: cz - 2.4, maxZ: cz + 2.4 });
  interactables.push({ id: "station", pos: V3(cx + 3.3, 0, cz), radius: 2.4, kind: "station", label: "پست برق — آمار مصرف محله" });
}

/* ======================= props ======================= */
function makePalm() {
  const g = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 6.5, 9, 6);
  const pos = trunkGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const bend = ((y + 3.25) / 6.5) ** 2 * 0.7;
    pos.setX(i, pos.getX(i) + bend);
  }
  trunkGeo.computeVertexNormals();
  const trunk = new THREE.Mesh(trunkGeo, new THREE.MeshStandardMaterial({ map: woodTex("#8a6a48", [2, 6]), roughness: 0.95 }));
  trunk.position.y = 3.25;
  trunk.castShadow = true;
  g.add(trunk);
  // fronds merged
  const fronds: THREE.BufferGeometry[] = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const f = new THREE.PlaneGeometry(0.7, 3.2, 1, 6);
    const p = f.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k);
      const tnorm = (y + 1.6) / 3.2;
      p.setZ(k, -(tnorm ** 2) * 1.6);
      p.setX(k, p.getX(k) * (1 - tnorm * 0.8));
    }
    f.translate(0, 1.6, 0);
    f.rotateX(-0.5 - (i % 3) * 0.25);
    f.rotateY((i / n) * Math.PI * 2);
    fronds.push(f);
  }
  const merged = mergeGeometries(fronds)!;
  merged.computeVertexNormals();
  const crown = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ color: "#3f9a3a", roughness: 0.8, side: THREE.DoubleSide }));
  crown.position.set(0.7, 6.3, 0);
  crown.castShadow = true;
  crown.name = "crown";
  g.add(crown);
  // dates cluster
  const dates = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), mat("#c8742a", 0.8));
  dates.position.set(0.9, 6.0, 0.3);
  g.add(dates);
  return g;
}

function makeBoat(i: number) {
  const g = new THREE.Group();
  const hullC = ["#2f5f9e", "#f2efe4", "#3aa17e", "#c9503a", "#4a4a8a"][i % 5];
  const hullM = mat(hullC, 0.7);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.2, 2.0), hullM);
  hull.position.y = 0.5;
  hull.castShadow = true;
  g.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.2, 4), hullM);
  bow.rotation.z = -Math.PI / 2;
  bow.rotation.x = Math.PI / 4;
  bow.position.set(3.7, 0.55, 0);
  bow.scale.set(1.2, 1, 1);
  g.add(bow);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.52, 0.18, 2.02), mat(i % 2 ? "#e63946" : "#ffffff", 0.7));
  stripe.position.y = 0.95;
  g.add(stripe);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.1, 1.8), new THREE.MeshStandardMaterial({ map: woodTex("#a8763f", [1, 4]), roughness: 0.85 }));
  deck.position.y = 1.12;
  g.add(deck);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.4), mat("#f4f1e8", 0.7));
  cabin.position.set(-1.2, 1.7, 0);
  cabin.castShadow = true;
  g.add(cabin);
  const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 1.7), mat("#2f5f9e", 0.7));
  cabinRoof.position.set(-1.2, 2.3, 0);
  g.add(cabinRoof);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4, 8), mat("#6b4a2a", 0.8));
  mast.position.set(0.6, 3, 0);
  g.add(mast);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshStandardMaterial({ color: "#2fb43a", side: THREE.DoubleSide }));
  flag.position.set(0.95, 4.7, 0);
  g.add(flag);
  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.08, 6, 12), mat("#222", 0.9));
  tire.position.set(0.5, 0.7, 1.02);
  g.add(tire);
  return g;
}

function makeCloud(i: number) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, emissive: "#ffffff", emissiveIntensity: 0.25, fog: false });
  const n = 5 + (i % 4);
  for (let k = 0; k < n; k++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(6 + Math.random() * 7, 10, 8), m);
    s.position.set((k - n / 2) * 8 + Math.random() * 4, Math.random() * 4, Math.random() * 6);
    s.scale.y = 0.55;
    g.add(s);
  }
  return g;
}

function makeGull() {
  const g = new THREE.Group();
  const m = mat("#ffffff", 0.8);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), m);
  body.scale.set(1.6, 0.8, 0.8);
  g.add(body);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.9), m);
    wing.position.set(0, 0.05, s * 0.5);
    wing.name = s < 0 ? "wl" : "wr";
    g.add(wing);
  }
  return g;
}

function makeBench(woodM: THREE.Material, metalM: THREE.Material) {
  const g = new THREE.Group();
  g.add(box(1.8, 0.08, 0.5, woodM, 0, 0.45, 0));
  g.add(box(1.8, 0.4, 0.08, woodM, 0, 0.75, -0.22));
  for (const dx of [-0.75, 0.75]) {
    g.add(box(0.08, 0.45, 0.5, metalM, dx, 0.22, 0));
  }
  return g;
}

function makeCar(color: string, glassM: THREE.Material, metalM: THREE.Material) {
  const g = new THREE.Group();
  const body = mat(color, 0.35, 0.6);
  g.add(box(1.7, 0.55, 3.9, body, 0, 0.55, 0));
  g.add(box(1.5, 0.5, 2.0, body, 0, 1.05, -0.1));
  const glass = box(1.52, 0.4, 1.9, glassM, 0, 1.1, -0.1);
  g.add(glass);
  for (const [x, z] of [
    [-0.8, 1.3],
    [0.8, 1.3],
    [-0.8, -1.3],
    [0.8, -1.3],
  ]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.25, 14), mat("#1a1a1a", 0.8));
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.32, z);
    g.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.27, 10), metalM);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(x, 0.32, z);
    g.add(hub);
  }
  g.add(box(0.3, 0.15, 0.05, mat("#fff6c8", 0.3, 0, "#fff6c8", 0.4), -0.55, 0.6, 1.96, false));
  g.add(box(0.3, 0.15, 0.05, mat("#fff6c8", 0.3, 0, "#fff6c8", 0.4), 0.55, 0.6, 1.96, false));
  g.add(box(0.3, 0.12, 0.05, mat("#d62828", 0.3, 0, "#d62828", 0.4), -0.55, 0.6, -1.96, false));
  g.add(box(0.3, 0.12, 0.05, mat("#d62828", 0.3, 0, "#d62828", 0.4), 0.55, 0.6, -1.96, false));
  // Iranian licence plate (white/blue)
  g.add(box(0.5, 0.12, 0.02, mat("#ffffff", 0.5), 0, 0.4, 1.97, false));
  g.add(box(0.08, 0.12, 0.025, mat("#1d4f9a", 0.5), -0.21, 0.4, 1.975, false));
  return g;
}

function makeMoto(metalM: THREE.Material) {
  const g = new THREE.Group();
  g.add(box(1.2, 0.3, 0.3, mat("#c0392b", 0.4, 0.5), 0, 0.6, 0));
  g.add(box(0.5, 0.1, 0.35, mat("#222", 0.8), -0.1, 0.8, 0));
  for (const x of [-0.6, 0.6]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 8, 14), mat("#1a1a1a", 0.8));
    w.position.set(x, 0.3, 0);
    g.add(w);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), metalM);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(0.5, 0.95, 0);
  g.add(bar);
  return g;
}

function textTex(text: string, color: string, bg: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = color;
  ctx.font = "bold 56px Vazirmatn, Tahoma, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";
  ctx.fillText(text, 256, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function rugTex() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 340;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#8b1e2d";
  ctx.fillRect(0, 0, 512, 340);
  ctx.strokeStyle = "#e8c36a";
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, 480, 308);
  ctx.strokeStyle = "#1f3a5f";
  ctx.lineWidth = 4;
  ctx.strokeRect(34, 34, 444, 272);
  // central medallion
  ctx.fillStyle = "#1f3a5f";
  ctx.beginPath();
  ctx.ellipse(256, 170, 120, 80, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8c36a";
  ctx.beginPath();
  ctx.ellipse(256, 170, 80, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8b1e2d";
  ctx.beginPath();
  ctx.ellipse(256, 170, 40, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  // boteh motifs
  ctx.fillStyle = "#e8c36a";
  for (let i = 0; i < 14; i++) {
    const x = 50 + i * 32;
    ctx.beginPath();
    ctx.arc(x, 50, 6, 0, Math.PI * 2);
    ctx.arc(x, 290, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ======================= Shaders ======================= */
function makeWater() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.5) },
      uDeep: { value: new THREE.Color("#0a4f9c") },
      uShallow: { value: new THREE.Color("#2fd0d4") },
      uSky: { value: new THREE.Color("#bfe9ff") },
      uNight: { value: 0 },
      uFogColor: { value: new THREE.Color("#cfeaff") },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vPos; varying vec3 vNormal; varying float vDist;
      void main(){
        vec3 p = position;
        float w1 = sin(p.x*0.08 + uTime*0.9)*0.35;
        float w2 = sin(p.y*0.12 - uTime*0.7 + p.x*0.03)*0.25;
        float w3 = sin((p.x+p.y)*0.25 + uTime*1.6)*0.08;
        p.z += w1 + w2 + w3;
        // approximate normal via derivatives
        float dx = cos(p.x*0.08 + uTime*0.9)*0.35*0.08 + cos((p.x+p.y)*0.25 + uTime*1.6)*0.08*0.25;
        float dy = cos(p.y*0.12 - uTime*0.7 + p.x*0.03)*0.25*0.12 + cos((p.x+p.y)*0.25 + uTime*1.6)*0.08*0.25;
        vNormal = normalize(vec3(-dx, -dy, 1.0));
        vec4 wp = modelMatrix * vec4(p,1.0);
        vPos = wp.xyz;
        vDist = length(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform vec3 uSunDir; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSky; uniform float uTime; uniform float uNight; uniform vec3 uFogColor;
      varying vec3 vPos; varying vec3 vNormal; varying float vDist;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec3 n = normalize(vec3(vNormal.x, vNormal.z, -vNormal.y));
        vec3 V = normalize(cameraPosition - vPos);
        float shore = clamp((vPos.z + 18.0) / -40.0, 0.0, 1.0); // 0 at shore,1 far
        vec3 base = mix(uShallow, uDeep, shore);
        float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
        vec3 col = mix(base, uSky, fres*0.6);
        vec3 H = normalize(uSunDir + V);
        float spec = pow(max(dot(n, H), 0.0), 180.0) * 1.4;
        float glitter = pow(noise(vPos.xz*2.0 + uTime*0.8), 8.0) * 0.6;
        col += (spec + glitter) * vec3(1.0, 0.95, 0.85) * (1.0-uNight*0.7);
        // foam near shore & pier
        float foam = smoothstep(0.08, 0.0, shore) * (0.5 + 0.5*sin(uTime*2.0 + vPos.x*0.7));
        foam += smoothstep(0.35, 0.0, abs(noise(vPos.xz*0.6 + uTime*0.3) - 0.5)) * 0.08;
        col = mix(col, vec3(0.95,0.98,1.0), clamp(foam,0.0,1.0)*0.6);
        col = mix(col, col*vec3(0.15,0.2,0.35), uNight);
        float fogF = 1.0 - exp(-vDist*0.0035);
        col = mix(col, uFogColor, fogF);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

function makeSky() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color("#1f8fe8") },
      uHorizon: { value: new THREE.Color("#c9ecff") },
      uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.5) },
      uSunColor: { value: new THREE.Color("#fff1c9") },
      uNight: { value: 0 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uNight;
      varying vec3 vDir;
      float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
      void main(){
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 col = mix(uHorizon, uTop, pow(h, 0.55));
        float sd = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
        col += uSunColor * pow(sd, 18.0) * 0.55;
        col += uSunColor * pow(sd, 3.0) * 0.12 * (1.0 - h);
        // night
        vec3 nightCol = mix(vec3(0.08,0.1,0.2), vec3(0.01,0.02,0.06), h);
        float stars = step(0.9985, hash(floor(vDir*300.0))) * h;
        nightCol += stars;
        col = mix(col, nightCol, uNight);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}
