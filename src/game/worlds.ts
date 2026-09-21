import * as THREE from "three";
import { mat } from "./characters";
import { asphaltTex, plasterTex, sandTex, solarTex } from "./textures";
import type { World } from "./world";

/* دادهٔ جهان‌ها — در نقشه و موتور استفاده می‌شود */
export interface PadDef {
  id: string;
  world: number;
  x: number;
  z: number;
  label: string;
  doneLabel: string;
}

export const WORLD_SPAWNS: Record<number, THREE.Vector3> = {
  1: new THREE.Vector3(0, 0.12, -10),
  2: new THREE.Vector3(0, 0.12, 118),
  3: new THREE.Vector3(0, 0.12, 258),
  4: new THREE.Vector3(0, 0.12, 402),
};

export const WORLD_INFO = [
  { id: 1, name: "بوشهر — خانه‌های هوشمند", icon: "🏘️", color: "#38d452", z0: -48, z1: 96, desc: "شناسایی و رفع مصرف در خانه‌های بوشهری" },
  { id: 2, name: "شهر خورشیدی", icon: "☀️", color: "#ffb400", z0: 106, z1: 240, desc: "نصب و سرویس پنل‌های خورشیدی روی پشت‌بام‌ها" },
  { id: 3, name: "منطقه انرژی بادی", icon: "💨", color: "#39c7e8", z0: 246, z1: 386, desc: "بازرسی و نگهداری توربین‌های بادی" },
  { id: 4, name: "شهر انرژی پیشرفته", icon: "⚛️", color: "#b06bff", z0: 390, z1: 536, desc: "ایمنی و پایش نیروگاه هسته‌ای بوشهر" },
];

export const PAD_DEFS: PadDef[] = [
  { id: "solar_a", world: 2, x: -14, z: 148, label: "نصب ردیف پنل خورشیدی ۱", doneLabel: "ردیف ۱ نصب شد" },
  { id: "solar_b", world: 2, x: 0, z: 178, label: "نصب ردیف پنل خورشیدی ۲", doneLabel: "ردیف ۲ نصب شد" },
  { id: "solar_c", world: 2, x: 14, z: 208, label: "تمیز کردن و سرویس پنل‌ها", doneLabel: "پنل‌ها سرویس شد" },
  { id: "wind_a", world: 3, x: -16, z: 286, label: "بازرسی توربین بادی ۱", doneLabel: "توربین ۱ سالم است" },
  { id: "wind_b", world: 3, x: 12, z: 312, label: "بازرسی توربین بادی ۲", doneLabel: "توربین ۲ سالم است" },
  { id: "wind_c", world: 3, x: -4, z: 346, label: "بازرسی توربین بادی ۳", doneLabel: "توربین ۳ سالم است" },
  { id: "plant_control", world: 4, x: 0, z: 423.2, label: "اتاق کنترل و مانیتورینگ", doneLabel: "پایش سیستم‌ها انجام شد" },
  { id: "plant_cooling", world: 4, x: 18, z: 462.5, label: "بازرسی سامانه خنک‌کننده", doneLabel: "خنک‌کننده نرمال است" },
  { id: "plant_dome", world: 4, x: -14, z: 456, label: "بازدید ایمنی ساختمان راکتور", doneLabel: "ایمنی راکتور تأیید شد" },
];

export interface ExtraZones {
  setPad: (id: string, done: boolean) => void;
  reset: () => void;
  update: (dt: number, t: number, worldActive: number) => void;
}

function textPlane(text: string, bg: string, fg: string, w = 4.5, h = 1.1) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 504, 120);
  ctx.fillStyle = fg;
  ctx.font = "bold 46px Vazirmatn, Tahoma, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";
  ctx.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  return m;
}

export function buildExtraWorlds(w: World): ExtraZones {
  const group = w.group;
  const colliders = w.colliders;
  const interactables = w.interactables;
  const padVisuals: Record<string, { marker: THREE.Group; reward: THREE.Object3D }> = {};
  const spinners: THREE.Group[] = [];
  const steams: { mesh: THREE.Mesh; phase: number }[] = [];
  const portals: THREE.Mesh[] = [];

  /* ----- زمین و جادهٔ طولانی تا جهان چهارم ----- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 720), new THREE.MeshStandardMaterial({ map: sandTex([40, 60]), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.02, 250);
  ground.receiveShadow = true;
  group.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(8, 470), new THREE.MeshStandardMaterial({ map: asphaltTex([2, 60]), roughness: 0.95 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.0, 305);
  road.receiveShadow = true;
  group.add(road);
  // خط‌کشی وسط جاده
  const dashCanvas = document.createElement("canvas");
  dashCanvas.width = 64;
  dashCanvas.height = 256;
  const dctx = dashCanvas.getContext("2d")!;
  dctx.fillStyle = "#f4f0dc";
  for (let y = 10; y < 256; y += 64) dctx.fillRect(26, y, 12, 34);
  const dashTex = new THREE.CanvasTexture(dashCanvas);
  dashTex.wrapS = dashTex.wrapT = THREE.RepeatWrapping;
  dashTex.repeat.set(1, 40);
  const dashes = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 470), new THREE.MeshBasicMaterial({ map: dashTex, transparent: true }));
  dashes.rotation.x = -Math.PI / 2;
  dashes.position.set(0, 0.015, 305);
  group.add(dashes);
  // چند نخل کنار جاده
  for (let z = 90; z < 520; z += 26) {
    for (const sx of [-7.5, 7.5]) {
      if (Math.random() < 0.55) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 5, 7), mat("#8a6a48", 0.95));
        p.position.set(sx, 2.5, z + Math.random() * 6);
        p.rotation.z = (Math.random() - 0.5) * 0.12;
        group.add(p);
        const crown = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.4, 7), mat("#3f9a3a", 0.85));
        crown.position.set(p.position.x, 5.6, p.position.z);
        crown.castShadow = true;
        group.add(crown);
      }
    }
  }

  /* ----- دروازه‌های میان جهان‌ها ----- */
  const gateDefs: { world: number; z: number; color: string; title: string }[] = [
    { world: 2, z: 108, color: "#ffb400", title: "شهر خورشیدی ☀️" },
    { world: 3, z: 250, color: "#39c7e8", title: "منطقه انرژی بادی 💨" },
    { world: 4, z: 392, color: "#b06bff", title: "شهر انرژی پیشرفته ⚛️" },
  ];
  for (const g of gateDefs) {
    const gate = new THREE.Group();
    const pillarM = new THREE.MeshStandardMaterial({ map: plasterTex("#f0e8d6", [1, 1]), roughness: 0.9 });
    for (const sx of [-4.4, 4.4]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, 6.4, 0.9), pillarM);
      p.position.set(sx, 3.2, 0);
      p.castShadow = true;
      gate.add(p);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.2), mat(g.color, 0.5, 0.3, g.color, 0.4));
      cap.position.set(sx, 6.5, 0);
      gate.add(cap);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(9.7, 1.0, 0.9), pillarM);
    beam.position.set(0, 6.6, 0);
    beam.castShadow = true;
    gate.add(beam);
    const sign = textPlane(g.title, g.color, "#10253f", 7.4, 0.9);
    sign.position.set(0, 6.6, 0.46);
    gate.add(sign);
    const portal = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 28),
      new THREE.MeshBasicMaterial({ color: g.color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
    );
    portal.position.set(0, 3.0, 0);
    gate.add(portal);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.1, 8, 32), new THREE.MeshBasicMaterial({ color: g.color }));
    ring.position.set(0, 3.0, 0);
    gate.add(ring);
    portals.push(portal);
    gate.position.set(0, 0, g.z);
    group.add(gate);
    interactables.push({ id: `gate_${g.world}`, pos: new THREE.Vector3(0, 0, g.z - 3), radius: 5.5, kind: "worldgate", label: `عبور از دروازهٔ ${g.title.replace(/[☀️💨⚛️]/g, "").trim()}` });
  }

  /* ================= جهان ۲: شهر خورشیدی ================= */
  const panelMat = new THREE.MeshStandardMaterial({ map: solarTex(), roughness: 0.25, metalness: 0.5 });
  const solarHouses: THREE.Object3D[] = [];
  for (const [hx, hz, flip] of [
    [-13, 130, 1],
    [13, 138, -1],
    [-13, 214, 1],
    [13, 222, -1],
  ] as [number, number, number][]) {
    const house = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(7, 3.4, 7), new THREE.MeshStandardMaterial({ map: plasterTex("#efe6d2", [1.5, 1.5]), roughness: 0.9 }));
    body.position.y = 1.7;
    body.castShadow = body.receiveShadow = true;
    house.add(body);
    // پنل‌های پشت‌بام
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.2), panelMat);
      p.position.set(-2 + i * 2, 3.75, -flip * 0.5);
      p.rotation.x = -0.4;
      p.castShadow = true;
      house.add(p);
    }
    const winMat = mat("#2b4a6b", 0.15, 0.5, "#ffb659", 0.25);
    for (const wx of [-2.2, 2.2]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.4), winMat);
      win.position.set(wx, 1.9, flip * 3.51);
      win.rotation.y = flip > 0 ? 0 : Math.PI;
      house.add(win);
    }
    house.position.set(hx, 0, hz);
    group.add(house);
    solarHouses.push(house);
    colliders.push({ minX: hx - 3.6, maxX: hx + 3.6, minZ: hz - 3.6, maxZ: hz + 3.6 });
  }
  // مزرعه خورشیدی — سه ردیف که با مأموریت نصب می‌شوند
  const makeRack = () => {
    const rack = new THREE.Group();
    const legMat = mat("#8f9aa8", 0.35, 0.8);
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 3; c++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.6), panelMat);
        p.position.set(-3 + c * 3, 1.5, r * 2.2);
        p.rotation.x = -0.5;
        p.castShadow = true;
        rack.add(p);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 0.1), legMat);
        leg.position.set(-3 + c * 3, 0.7, r * 2.2 + 0.5);
        rack.add(leg);
      }
    rack.visible = false;
    return rack;
  };
  for (const pad of PAD_DEFS.filter((p) => p.world === 2)) {
    const rack = pad.id === "solar_c" ? makeRack() : makeRack();
    rack.position.set(pad.x, 0, pad.z);
    group.add(rack);
    const marker = makePadMarker("#ffb400");
    marker.position.set(pad.x, 0, pad.z);
    group.add(marker);
    padVisuals[pad.id] = { marker, reward: rack };
    interactables.push({ id: pad.id, pos: new THREE.Vector3(pad.x, 0, pad.z), radius: 2.4, kind: "pad", label: pad.label });
  }
  // برج چراغ خورشیدی تزئینی
  for (const z of [135, 185, 225]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5, 8), mat("#555", 0.5, 0.7));
    pole.position.set(4.6, 2.5, z);
    group.add(pole);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.3), mat("#fff2c8", 0.3, 0.2, "#ffb347", 0.8));
    lamp.position.set(4.6, 4.9, z);
    group.add(lamp);
    const miniPanel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.5), panelMat);
    miniPanel.position.set(4.6, 5.1, z);
    miniPanel.rotation.x = -0.5;
    group.add(miniPanel);
  }

  /* ================= جهان ۳: توربین‌های بادی ================= */
  function makeTurbine(x: number, z: number, big: boolean, pad?: PadDef) {
    const t = new THREE.Group();
    const h = big ? 26 : 20;
    const white = new THREE.MeshStandardMaterial({ color: "#f5f7fa", roughness: 0.5, metalness: 0.1 });
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.1, h, 12), white);
    tower.position.y = h / 2;
    tower.castShadow = true;
    t.add(tower);
    const nacelle = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 2.4), white);
    nacelle.position.set(0, h, 0.7);
    nacelle.castShadow = true;
    t.add(nacelle);
    const rotor = new THREE.Group();
    rotor.position.set(0, h, 2.0);
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, big ? 9 : 6.5, 0.1), white);
      blade.geometry.translate(0, big ? 4.5 : 3.3, 0);
      const bg = new THREE.Group();
      bg.add(blade);
      bg.rotation.z = (i / 3) * Math.PI * 2;
      rotor.add(bg);
    }
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), mat("#c9d3e0", 0.4, 0.4));
    rotor.add(hub);
    t.add(rotor);
    spinners.push(rotor);
    // چراغ هشدار قرمز روی نوک
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat("#ff3b3b", 0.3, 0, "#ff2020", 2));
    beacon.position.set(0, h + 1.2, -0.2);
    t.add(beacon);
    if (pad) {
      const marker = makePadMarker("#39c7e8");
      marker.position.set(0, 0, 2);
      t.add(marker);
      padVisuals[pad.id] = { marker, reward: new THREE.Object3D() };
    }
    t.position.set(x, 0, z);
    t.rotation.y = (Math.random() - 0.5) * 0.4;
    group.add(t);
    colliders.push({ minX: x - 1, maxX: x + 1, minZ: z - 1, maxZ: z + 1 });
  }
  const windPads = PAD_DEFS.filter((p) => p.world === 3);
  makeTurbine(-16, 286, true, windPads[0]);
  makeTurbine(12, 312, true, windPads[1]);
  makeTurbine(-4, 346, true, windPads[2]);
  makeTurbine(22, 290, false);
  makeTurbine(-24, 330, false);
  makeTurbine(20, 356, false);
  makeTurbine(-18, 370, false);
  for (const pad of windPads) interactables.push({ id: pad.id, pos: new THREE.Vector3(pad.x, 0, pad.z + 2), radius: 2.8, kind: "pad", label: pad.label });
  // پست برق بادی
  const windSub = new THREE.Group();
  const subBox = new THREE.Mesh(new THREE.BoxGeometry(4, 2.6, 2.4), mat("#3f7a4a", 0.6, 0.3));
  subBox.position.y = 1.3;
  windSub.add(subBox);
  const windSign = textPlane("پست انرژی بادی 💨", "#1f6f8b", "#ffffff", 3.6, 0.9);
  windSign.position.set(0, 3.2, 1.3);
  windSub.add(windSign);
  windSub.position.set(-5, 0, 268);
  group.add(windSub);
  colliders.push({ minX: -7.5, maxX: -2.5, minZ: 266, maxZ: 270 });

  /* ================= جهان ۴: شهر انرژی پیشرفته (نیروگاه بوشهر) ================= */
  const plantWhite = new THREE.MeshStandardMaterial({ map: plasterTex("#eef2f7", [1.5, 1.5], 12), roughness: 0.6, metalness: 0.05 });
  // ساختمان راکتور با گنبد
  const dome = new THREE.Mesh(new THREE.SphereGeometry(11, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), plantWhite);
  dome.position.set(-14, 8, 470);
  dome.castShadow = dome.receiveShadow = true;
  group.add(dome);
  const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 8, 28), plantWhite);
  domeBase.position.set(-14, 4, 470);
  domeBase.castShadow = true;
  group.add(domeBase);
  colliders.push({ minX: -25.5, maxX: -2.5, minZ: 458.5, maxZ: 481.5 });
  // تالار توربین
  const hall = new THREE.Mesh(new THREE.BoxGeometry(22, 7, 12), plantWhite);
  hall.position.set(2, 3.5, 462);
  hall.castShadow = hall.receiveShadow = true;
  group.add(hall);
  colliders.push({ minX: -9.2, maxX: 13.2, minZ: 455.5, maxZ: 468.5 });
  // اتاق کنترل
  const ctrl = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 6), new THREE.MeshStandardMaterial({ map: plasterTex("#dfe9f5", [1, 1]), roughness: 0.7 }));
  ctrl.position.set(0, 2.25, 418);
  ctrl.castShadow = true;
  group.add(ctrl);
  const ctrlGlass = new THREE.Mesh(new THREE.PlaneGeometry(6, 2), mat("#12314f", 0.1, 0.5, "#5fd0ff", 0.5));
  ctrlGlass.position.set(0, 2.8, 421.05);
  group.add(ctrlGlass);
  const ctrlSign = textPlane("اتاق کنترل و مانیتورینگ", "#1d4f9a", "#ffffff", 5.5, 0.9);
  ctrlSign.position.set(0, 4.8, 421.1);
  group.add(ctrlSign);
  colliders.push({ minX: -4.2, maxX: 4.2, minZ: 414.8, maxZ: 421.2 });
  // برج خنک‌کننده (هایپربولیک ساده) و بخار
  const cool = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.6, 12, 20, 1, true), plantWhite);
  cool.position.set(18, 6, 470);
  cool.castShadow = true;
  group.add(cool);
  const coolTop = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.25, 8, 24), plantWhite);
  coolTop.rotation.x = Math.PI / 2;
  coolTop.position.set(18, 12, 470);
  group.add(coolTop);
  colliders.push({ minX: 13.5, maxX: 22.5, minZ: 465.5, maxZ: 474.5 });
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(1.6 + i * 0.5, 10, 8), new THREE.MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.55, roughness: 1 }));
    s.position.set(18 + (Math.random() - 0.5) * 2, 13 + i * 1.4, 470 + (Math.random() - 0.5) * 2);
    group.add(s);
    steams.push({ mesh: s, phase: i * 0.9 });
  }
  // دودکش کوتاه
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 16, 14), mat("#dde3ea", 0.7));
  stack.position.set(9, 8, 452);
  stack.castShadow = true;
  group.add(stack);
  // پرچم ایران
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 9, 8), mat("#cfd6df", 0.4, 0.6));
  flagPole.position.set(-26, 4.5, 438);
  group.add(flagPole);
  const flagCanvas = document.createElement("canvas");
  flagCanvas.width = 256;
  flagCanvas.height = 96;
  const fctx = flagCanvas.getContext("2d")!;
  fctx.fillStyle = "#239f40";
  fctx.fillRect(0, 0, 256, 32);
  fctx.fillStyle = "#ffffff";
  fctx.fillRect(0, 32, 256, 32);
  fctx.fillStyle = "#da0000";
  fctx.fillRect(0, 64, 256, 32);
  fctx.fillStyle = "#da0000";
  fctx.font = "bold 30px Tahoma";
  fctx.textAlign = "center";
  fctx.fillText("⚡", 128, 58);
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 1.1),
    new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(flagCanvas), side: THREE.DoubleSide, roughness: 0.8 }),
  );
  flag.position.set(-24.4, 8.2, 438);
  group.add(flag);
  // تابلوی معرفی نیروگاه
  const plantSign = textPlane("نیروگاه اتمی بوشهر — انرژی پاک و پایدار", "#5a3aa0", "#ffffff", 9, 1.1);
  plantSign.position.set(0, 3.4, 405);
  group.add(plantSign);
  for (const pad of PAD_DEFS.filter((p) => p.world === 4)) {
    const marker = makePadMarker("#b06bff");
    marker.position.set(pad.x, 0, pad.z);
    group.add(marker);
    padVisuals[pad.id] = { marker, reward: new THREE.Object3D() };
    interactables.push({ id: pad.id, pos: new THREE.Vector3(pad.x, 0, pad.z), radius: 2.6, kind: "pad", label: pad.label });
  }
  // محوطه سبز و چراغ‌ها
  for (let z = 410; z < 490; z += 14) {
    for (const sx of [-10, 10]) {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), mat("#3f9a3a", 0.9));
      bush.position.set(sx, 0.6, z);
      group.add(bush);
    }
  }

  /* ----- نشانگر هر پد: حلقه چرخان + آذرخش شناور ----- */
  function makePadMarker(color: string) {
    const m = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.09, 8, 28), new THREE.MeshBasicMaterial({ color }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.1;
    m.add(ring);
    const bolt = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 0.9, 4),
      new THREE.MeshBasicMaterial({ color: "#fff3a0" }),
    );
    bolt.position.y = 1.5;
    bolt.name = "bolt";
    m.add(bolt);
    m.userData.color = color;
    return m;
  }

  return {
    setPad(id, done) {
      const v = padVisuals[id];
      if (!v) return;
      v.marker.visible = !done;
      v.reward.visible = done;
    },
    reset() {
      for (const id in padVisuals) {
        const v = padVisuals[id];
        v.marker.visible = true;
        v.reward.visible = false;
      }
    },
    update(dt, t, worldActive) {
      for (const id in padVisuals) {
        const m = padVisuals[id].marker;
        if (!m.visible) continue;
        m.rotation.y += dt * 1.6;
        const bolt = m.getObjectByName("bolt");
        if (bolt) {
          bolt.rotation.y += dt * 2;
          bolt.position.y = 1.5 + Math.sin(t * 3) * 0.18;
        }
      }
      // توربین‌ها هرچه در جهان بادی باشیم تندتر
      const wind = worldActive === 3 ? 1.4 : 0.7;
      spinners.forEach((r, i) => (r.rotation.z += dt * (0.5 + (i % 3) * 0.2) * wind));
      // دروازه‌ها
      portals.forEach((p, i) => {
        const m = p.material as THREE.MeshBasicMaterial;
        m.opacity = 0.12 + Math.sin(t * 2.4 + i) * 0.06;
        p.rotation.z += dt * 0.3;
      });
      // بخار برج خنک‌کننده
      for (const s of steams) {
        s.mesh.position.y += dt * 0.7;
        s.mesh.scale.setScalar(1 + ((s.mesh.position.y - 13) / 8) * 0.6);
        (s.mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.55 - (s.mesh.position.y - 13) / 14);
        if (s.mesh.position.y > 20) {
          s.mesh.position.y = 13;
          s.mesh.scale.setScalar(1);
        }
        void s.phase;
      }
      // پرچم موج
      flag.rotation.y = Math.sin(t * 2) * 0.15;
      void solarHouses;
    },
  };
}
