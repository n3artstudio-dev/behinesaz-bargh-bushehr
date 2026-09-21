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
  5: new THREE.Vector3(0, 0.12, 550),
};

export const WORLD_INFO = [
  { id: 1, name: "بوشهر — خانه‌های هوشمند", icon: "🏘️", color: "#38d452", z0: -48, z1: 96, desc: "شناسایی و رفع مصرف در خانه‌های بوشهری" },
  { id: 2, name: "شهر خورشیدی", icon: "☀️", color: "#ffb400", z0: 106, z1: 240, desc: "نصب و سرویس پنل‌های خورشیدی روی پشت‌بام‌ها" },
  { id: 3, name: "منطقه انرژی بادی", icon: "💨", color: "#39c7e8", z0: 246, z1: 386, desc: "بازرسی و نگهداری توربین‌های بادی" },
  { id: 4, name: "شهر انرژی پیشرفته", icon: "⚛️", color: "#b06bff", z0: 390, z1: 532, desc: "ایمنی و پایش نیروگاه هسته‌ای بوشهر" },
  { id: 5, name: "محله رمز ارز — تابلوی هوشمند", icon: "🪧", color: "#e8453c", z0: 538, z1: 620, desc: "جمع‌آوری دستگاه‌های غیرمجاز و نصب لامپ کم‌مصرف" },
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
  // جهان ۵ — رمز ارز
  { id: "crypto_door", world: 5, x: -9.6, z: 575, label: "اسکن ساختمان مشکوک", doneLabel: "۴ دستگاه رمز ارز شناسایی شد" },
  { id: "crypto_owner", world: 5, x: -9.0, z: 571, label: "صحبت با صاحب‌خانه و اخطار", doneLabel: "اخطار صادر شد" },
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `miner_${i + 1}`,
    world: 5 as const,
    x: -19.5 + i * 3,
    z: 560,
    label: `جمع‌آوری دستگاه رمز ارز ${i + 1}`,
    doneLabel: "جمع شد",
  })),
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `led_${i + 1}`,
    world: 5 as const,
    x: 4.6,
    z: 548 + i * 9,
    label: `نصب لامپ LED محله ${i + 1}`,
    doneLabel: "نصب شد",
  })),
];

export interface ExtraZones {
  setPad: (id: string, done: boolean) => void;
  reset: () => void;
  update: (dt: number, t: number, worldActive: number, padsDone: string[]) => void;
}

const faDigits = (n: number | string) => n.toString().replace(/\d/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[parseInt(c)]);

/* دوچرخه با راکب */
export function makeBicycle(frameColor = "#1e88d6", shirt = "#f0b820") {
  const g = new THREE.Group();
  const tireM = mat("#1a1a1a", 0.85);
  const spokeM = mat("#cfd6df", 0.4, 0.8);
  const wheels: THREE.Mesh[] = [];
  for (const wz of [-0.55, 0.55]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 18), tireM);
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(0, 0.45, wz);
    g.add(wheel);
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 4), spokeM);
      sp.rotation.x = (i / 6) * Math.PI;
      sp.position.set(0, 0.45, wz);
      wheel.add(sp);
      sp.position.set(0, 0, 0);
    }
    wheels.push(wheel);
  }
  const frameM = mat(frameColor, 0.5, 0.4);
  const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.62), frameM);
  bar1.position.set(0, 0.62, 0);
  g.add(bar1);
  const seatPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), frameM);
  seatPost.position.set(0, 0.85, -0.12);
  g.add(seatPost);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.2), mat("#2b2b2b", 0.7));
  seat.position.set(0, 1.06, -0.12);
  g.add(seat);
  const fork = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), frameM);
  fork.position.set(0, 0.72, 0.5);
  g.add(fork);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.06), mat("#2b2b2b", 0.6));
  handle.position.set(0, 1.0, 0.55);
  g.add(handle);
  // راکب ساده
  const rider = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.3, 4, 8), mat(shirt, 0.8));
  torso.position.y = 1.42;
  rider.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), mat("#e2b48c", 0.6));
  head.position.y = 1.82;
  rider.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat("#1e4f9a", 0.7));
  cap.position.y = 1.86;
  rider.add(cap);
  for (const az of [-0.1, 0.1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.42), mat(shirt, 0.8));
    arm.position.set(az, 1.4, 0.32);
    arm.rotation.x = 0.5;
    rider.add(arm);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), mat("#2c3e63", 0.85));
    leg.position.set(az, 1.05, 0);
    leg.rotation.x = 0.7;
    rider.add(leg);
  }
  rider.name = "rider";
  g.add(rider);
  g.userData.wheels = wheels;
  return g;
}

/* موتورسیکلت با موتورسوار و کلاه ایمنی */
export function makeMoped(frameColor = "#c0392b", shirt = "#1e4f9a") {
  const g = new THREE.Group();
  const wheels: THREE.Mesh[] = [];
  for (const wz of [-0.7, 0.7]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 8, 16), mat("#151515", 0.85));
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(0, 0.32, wz);
    g.add(wheel);
    wheels.push(wheel);
  }
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 1.5), mat(frameColor, 0.5, 0.4));
  body.position.set(0, 0.62, 0);
  g.add(body);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.7), mat("#222", 0.7));
  seat.position.set(0, 0.8, -0.35);
  g.add(seat);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.06), mat("#222", 0.5, 0.6));
  handle.position.set(0, 1.05, 0.75);
  g.add(handle);
  const headLight = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat("#fff6c8", 0.3, 0, "#fff6c8", 0.8));
  headLight.position.set(0, 0.75, 0.82);
  g.add(headLight);
  // راکب
  const rider = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.35, 4, 8), mat(shirt, 0.8));
  torso.position.y = 1.32;
  rider.add(torso);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10), mat("#ffcc00", 0.5));
  helmet.position.y = 1.78;
  rider.add(helmet);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.05), mat("#152233", 0.2, 0.5));
  visor.position.set(0, 1.76, 0.18);
  rider.add(visor);
  for (const az of [-0.1, 0.1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), mat(shirt, 0.8));
    arm.position.set(az, 1.28, 0.42);
    arm.rotation.x = 0.5;
    rider.add(arm);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.42, 0.12), mat("#1a1a2a", 0.85));
    leg.position.set(az, 0.95, 0);
    rider.add(leg);
  }
  rider.name = "rider";
  g.add(rider);
  g.userData.wheels = wheels;
  return g;
}

function drawSmartBoard(canvas: HTMLCanvasElement, loadKw: number, maxKw: number) {
  const ctx = canvas.getContext("2d")!;
  const ratio = Math.max(0, Math.min(1, loadKw / maxKw));
  const color = ratio < 0.25 ? "#2fd04a" : ratio < 0.55 ? "#ffd12e" : ratio < 0.8 ? "#ff8a1f" : "#e8362e";
  const grad = ctx.createLinearGradient(0, 0, 0, 320);
  grad.addColorStop(0, "#0c2350");
  grad.addColorStop(1, "#06122c");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = "#2f5aa0";
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, 500, 308);
  ctx.fillStyle = "#ffd23a";
  ctx.font = "bold 34px Vazirmatn, Tahoma, sans-serif";
  ctx.textAlign = "center";
  ctx.direction = "rtl";
  ctx.fillText("تابلوی هوشمند محله", 256, 52);
  ctx.fillStyle = "#9fc4ff";
  ctx.font = "22px Vazirmatn, Tahoma, sans-serif";
  ctx.fillText("مصرف لحظه‌ای برق محله", 256, 92);
  ctx.fillStyle = color;
  ctx.font = "bold 84px Vazirmatn, Tahoma, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(faDigits(Math.round(loadKw)), 130, 190);
  ctx.fillStyle = "#cfe0ff";
  ctx.font = "bold 30px Vazirmatn, Tahoma, sans-serif";
  ctx.fillText("کیلووات", 330, 182);
  // نوار وضعیت
  ctx.fillStyle = "#11244a";
  ctx.fillRect(50, 220, 412, 34);
  ctx.fillStyle = color;
  ctx.fillRect(50, 220, 412 * (1 - ratio), 34);
  ctx.strokeStyle = "#7fb0ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 220, 412, 34);
  ctx.font = "bold 20px Vazirmatn, Tahoma, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = ratio < 0.25 ? "#2fd04a" : "#fff";
  ctx.fillText(ratio < 0.25 ? "✓ مصرف بهینه و پایدار" : ratio < 0.55 ? "هشدار مصرف" : "⚠ فشار زیاد به شبکه", 256, 292);
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
  let boardTimer = 0;
  const spinners: THREE.Group[] = [];
  const steams: { mesh: THREE.Mesh; phase: number }[] = [];
  const portals: THREE.Mesh[] = [];

  /* ----- زمین و جادهٔ طولانی تا جهان چهارم ----- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 780), new THREE.MeshStandardMaterial({ map: sandTex([40, 66]), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.02, 280);
  ground.receiveShadow = true;
  group.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(8, 560), new THREE.MeshStandardMaterial({ map: asphaltTex([2, 70]), roughness: 0.95 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.05, 330);
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
  const dashes = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 560), new THREE.MeshBasicMaterial({ map: dashTex, transparent: true }));
  dashes.rotation.x = -Math.PI / 2;
  dashes.position.set(0, 0.075, 330);
  group.add(dashes);
  // چند نخل کنار جاده
  for (let z = 90; z < 600; z += 26) {
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

  /* ----- دکل‌های فشار متوسط هر ۱۰ متر کنار جاده (حداکثر ارتفاع ۱۲ متر) ----- */
  const poleH = 10.5;
  const poleX = 6.4;
  const poleZs: number[] = [];
  const poleGeo = new THREE.CylinderGeometry(0.11, 0.18, poleH, 8);
  const armGeo = new THREE.BoxGeometry(2.6, 0.12, 0.12);
  const insGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.25, 8);
  const poleMat = mat("#9aa1a8", 0.6, 0.5);
  const nPoles = Math.floor((600 - 96) / 10);
  const poleMesh = new THREE.InstancedMesh(poleGeo, poleMat, nPoles);
  const armMesh = new THREE.InstancedMesh(armGeo, poleMat, nPoles);
  const insMesh = new THREE.InstancedMesh(insGeo, mat("#e8f0f7", 0.3), nPoles * 3);
  const d4 = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const scl = new THREE.Vector3(1, 1, 1);
  const pos = new THREE.Vector3();
  let pi = 0;
  for (let z = 96; z < 600; z += 10) {
    poleZs.push(z);
    pos.set(poleX, poleH / 2, z);
    d4.compose(pos, q4, scl);
    poleMesh.setMatrixAt(pi, d4);
    pos.set(poleX, poleH - 0.5, z);
    d4.compose(pos, q4, scl);
    armMesh.setMatrixAt(pi, d4);
    for (let k = 0; k < 3; k++) {
      pos.set(poleX - 1 + k, poleH - 0.35, z);
      d4.compose(pos, q4, scl);
      insMesh.setMatrixAt(pi * 3 + k, d4);
    }
    pi++;
  }
  poleMesh.castShadow = true;
  group.add(poleMesh, armMesh, insMesh);
  // سیم‌های سه‌گانه با افت (sag) بین دکل‌ها — یک LineSegments واحد
  const wireVerts: number[] = [];
  const addWire = (a: THREE.Vector3, b: THREE.Vector3) => {
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps,
        t1 = (i + 1) / steps;
      const p0 = a.clone().lerp(b, t0);
      const p1 = a.clone().lerp(b, t1);
      p0.y -= Math.sin(t0 * Math.PI) * 0.55;
      p1.y -= Math.sin(t1 * Math.PI) * 0.55;
      wireVerts.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
    }
  };
  for (let i = 0; i < poleZs.length - 1; i++) {
    for (let k = 0; k < 3; k++) {
      addWire(new THREE.Vector3(poleX - 1 + k, poleH - 0.3, poleZs[i]), new THREE.Vector3(poleX - 1 + k, poleH - 0.3, poleZs[i + 1]));
    }
  }
  const wireGeo = new THREE.BufferGeometry();
  wireGeo.setAttribute("position", new THREE.Float32BufferAttribute(wireVerts, 3));
  const wires = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: "#1b1b1b", transparent: true, opacity: 0.75 }));
  group.add(wires);

  /* ----- دروازه‌های میان جهان‌ها ----- */
  const gateDefs: { world: number; z: number; color: string; title: string }[] = [
    { world: 2, z: 108, color: "#ffb400", title: "شهر خورشیدی ☀️" },
    { world: 3, z: 250, color: "#39c7e8", title: "منطقه انرژی بادی 💨" },
    { world: 4, z: 392, color: "#b06bff", title: "شهر انرژی پیشرفته ⚛️" },
    { world: 5, z: 536, color: "#e8453c", title: "محله رمز ارز 🪧" },
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

  /* ================= جهان ۵: رمز ارز و تابلوی هوشمند محله ================= */
  const luxWhite = new THREE.MeshStandardMaterial({ map: plasterTex("#f4f1ea", [1, 1], 17), roughness: 0.5, metalness: 0.05 });
  const luxGlass = new THREE.MeshStandardMaterial({ color: "#12314f", roughness: 0.08, metalness: 0.6, emissive: "#27517d", emissiveIntensity: 0.25 });
  const lux = new THREE.Group();
  // چهار طبقه شیشه‌ای
  const villa = new THREE.Mesh(new THREE.BoxGeometry(11, 15, 13), luxWhite);
  villa.position.set(-16, 7.5, 575);
  villa.castShadow = villa.receiveShadow = true;
  lux.add(villa);
  colliders.push({ minX: -21.7, maxX: -10.3, minZ: 568.3, maxZ: 581.7 });
  for (let f = 0; f < 4; f++) {
    const y = 2.2 + f * 3.6;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(11.2, 1.6, 0.15), luxGlass);
    strip.position.set(-16, y, 581.6);
    lux.add(strip);
    const sideStrip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.6, 12.6), luxGlass);
    sideStrip.position.set(-10.4, y, 575);
    lux.add(sideStrip);
    // بالکن شیشه‌ای رو به جاده
    const balc = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 1.4), mat("#dfe4ea", 0.4, 0.4));
    balc.position.set(-10.0, y - 1.1, 579);
    lux.add(balc);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 1.4), luxGlass);
    rail.position.set(-8.75, y - 0.6, 579);
    lux.add(rail);
    // تقسیم طبقات
    const band = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.35, 13.2), mat("#c9b98f", 0.7));
    band.position.set(-16, y + 1.75, 575);
    lux.add(band);
  }
  // پشت‌بام: پنت‌هاوس و آنتن
  const pent = new THREE.Mesh(new THREE.BoxGeometry(5, 2.2, 6), luxWhite);
  pent.position.set(-16, 16.1, 575);
  lux.add(pent);
  // سردر لوکس
  const pillarA = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 4, 10), mat("#d8c49a", 0.4, 0.3));
  pillarA.position.set(-21.7, 2, 558);
  const pillarB = pillarA.clone();
  pillarB.position.set(-10.3, 2, 558);
  lux.add(pillarA, pillarB);
  const archBeam = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.7, 0.8), mat("#d8c49a", 0.4, 0.3));
  archBeam.position.set(-16, 4.1, 558);
  lux.add(archBeam);
  const villaSign = textPlane("مجتمع لوکس ساحلی", "#5b4a8a", "#ffffff", 5.5, 0.8);
  villaSign.position.set(-16, 4.1, 558.45);
  lux.add(villaSign);
  group.add(lux);

  // تابلوی هوشمند محله (روی دو پایه، کنار جاده)
  const boardCanvas = document.createElement("canvas");
  boardCanvas.width = 512;
  boardCanvas.height = 320;
  const boardTex = new THREE.CanvasTexture(boardCanvas);
  boardTex.colorSpace = THREE.SRGBColorSpace;
  drawSmartBoard(boardCanvas, 1420, 1420);
  const boardMat = new THREE.MeshBasicMaterial({ map: boardTex });
  const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.25), boardMat);
  boardMesh.position.set(11.5, 4.2, 548);
  boardMesh.rotation.y = -Math.PI / 2;
  boardMesh.castShadow = false;
  group.add(boardMesh);
  for (const dz of [-1.8, 1.8]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.2, 8), mat("#555", 0.5, 0.7));
    pole.position.set(11.6, 1.6, 548 + dz);
    pole.castShadow = true;
    group.add(pole);
  }
  const boardTitle = textPlane("🪧 تابلوی هوشمند محله", "#10345f", "#ffd23a", 3.4, 0.7);
  boardTitle.position.set(11.3, 6.2, 548);
  boardTitle.rotation.y = -Math.PI / 2;
  group.add(boardTitle);

  // ۴ دستگاه ماینر در حیاط (اول مخفی، بعد از اخطار ظاهر می‌شوند)
  const miners: THREE.Group[] = [];
  const minerMarkers: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const def = PAD_DEFS.find((p) => p.id === `miner_${i + 1}`)!;
    const m = new THREE.Group();
    const bodyM = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.75, 2), mat("#3a3f47", 0.5, 0.6));
    bodyM.position.y = 0.45;
    bodyM.castShadow = true;
    m.add(bodyM);
    for (const fy of [0.25, 0.62])
      for (const fx of [-0.3, 0.3]) {
        const fan = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), mat("#111", 0.6));
        fan.position.set(fx, fy, -1.01);
        fan.rotation.y = Math.PI;
        m.add(fan);
        const hub = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), mat("#222", 0.5));
        hub.position.set(fx, fy, -1.02);
        m.add(hub);
      }
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.03), mat("#ff3b3b", 0.3, 0, "#ff2020", 2));
    led.position.set(0, 0.72, -1.03);
    m.add(led);
    // گرمای ساطع‌شده (لکه نور نارنجی)
    const glow = new THREE.PointLight("#ff7a2e", 0.5, 3.5);
    glow.position.set(0, 1, 0.4);
    m.add(glow);
    m.position.set(def.x, 0.12, def.z);
    m.visible = false;
    group.add(m);
    miners.push(m);
    const mk = makePadMarker("#e8453c");
    mk.position.set(def.x, 0, def.z);
    mk.visible = false;
    group.add(mk);
    minerMarkers.push(mk);
    padVisuals[def.id] = { marker: mk, reward: m };
    interactables.push({ id: def.id, pos: new THREE.Vector3(def.x, 0, def.z), radius: 1.9, kind: "pad", label: def.label });
  }

  // ۵ تیر چراغ محله برای نصب لامپ LED
  const ledGroups: { marker: THREE.Group; oldHead: THREE.Mesh; newHead: THREE.Mesh; light: THREE.PointLight }[] = [];
  for (let i = 0; i < 5; i++) {
    const def = PAD_DEFS.find((p) => p.id === `led_${i + 1}`)!;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 6.5, 8), mat("#6b6f76", 0.5, 0.7));
    pole.position.set(def.x, 3.25, def.z);
    pole.castShadow = true;
    group.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), mat("#6b6f76", 0.5, 0.7));
    arm.position.set(def.x - 0.65, 6.3, def.z);
    group.add(arm);
    const oldHead = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.3), mat("#ffd08a", 0.4, 0, "#ff9f2e", 0.9));
    oldHead.position.set(def.x - 1.3, 6.2, def.z);
    group.add(oldHead);
    const newHead = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.3), mat("#dff6ff", 0.3, 0, "#9fe8ff", 1.6));
    newHead.position.copy(oldHead.position);
    newHead.visible = false;
    group.add(newHead);
    const light = new THREE.PointLight("#9fe8ff", 0, 12, 1.8);
    light.position.set(def.x - 1.3, 5.9, def.z);
    group.add(light);
    const mk = makePadMarker("#2fb43a");
    mk.position.set(def.x - 1.3, 0, def.z);
    mk.visible = false;
    group.add(mk);
    ledGroups.push({ marker: mk, oldHead, newHead, light });
    padVisuals[def.id] = { marker: mk, reward: newHead };
    interactables.push({ id: def.id, pos: new THREE.Vector3(def.x - 1.3, 0, def.z), radius: 2.2, kind: "pad", label: def.label });
  }

  // نشانگر اسکن در
  const doorDef = PAD_DEFS.find((p) => p.id === "crypto_door")!;
  const doorMk = makePadMarker("#e8453c");
  doorMk.position.set(doorDef.x, 0, doorDef.z);
  group.add(doorMk);
  padVisuals["crypto_door"] = { marker: doorMk, reward: new THREE.Object3D() };
  interactables.push({ id: "crypto_door", pos: new THREE.Vector3(doorDef.x, 0, doorDef.z), radius: 2.4, kind: "pad", label: doorDef.label });

  // صاحب‌خانه (NPC ثابت جلوی در — توسط Engine از روی npcSpawns ساخته می‌شود)
  w.npcSpawns.push({
    id: "cryptoowner",
    kind: "man",
    path: [new THREE.Vector3(-9.2, 0.12, 571.5)],
    speed: 0,
    facing: Math.PI / 2,
    label: "صاحب ویلا",
    lines: ["به ساختمان من دست نزن جوان!"],
  });
  interactables.push({ id: "npc_cryptoowner", pos: new THREE.Vector3(-9.2, 0, 571.5), radius: 2.6, kind: "npc", label: "صحبت با صاحب ویلا" });

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
    update(dt, t, worldActive, padsDone) {
      for (const id in padVisuals) {
        const m = padVisuals[id].marker;
        // جهان ۵: نشانه‌ها طبق ترتیب داستان ظاهر می‌شوند
        if (id.startsWith("miner_")) {
          const ownerDone = padsDone.includes("crypto_owner");
          const taken = padsDone.includes(id);
          m.visible = ownerDone && !taken;
          const mesh = miners[parseInt(id.split("_")[1]) - 1] as THREE.Group | undefined;
          if (!mesh) continue;
          mesh.visible = ownerDone && !taken;
          if (mesh.visible) {
            const fanLight = mesh.children.find((c) => c instanceof THREE.PointLight) as THREE.PointLight | undefined;
            if (fanLight) fanLight.intensity = 0.4 + Math.sin(t * 8 + mesh.position.x) * 0.15;
          }
          if (!ownerDone || taken) continue;
        }
        if (id.startsWith("led_")) {
          const idx = parseInt(id.split("_")[1]) - 1;
          const g = ledGroups[idx];
          const minersDone = [1, 2, 3, 4].every((n) => padsDone.includes(`miner_${n}`));
          const installed = padsDone.includes(id);
          g.marker.visible = minersDone && !installed;
          g.newHead.visible = installed;
          g.oldHead.visible = !installed;
          g.light.intensity = installed ? 9 + Math.sin(t * 2 + idx) * 0.5 : 0;
          if (!minersDone || installed) continue;
        }
        if (!m.visible) continue;
        m.rotation.y += dt * 1.6;
        const bolt = m.getObjectByName("bolt");
        if (bolt) {
          bolt.rotation.y += dt * 2;
          bolt.position.y = 1.5 + Math.sin(t * 3) * 0.18;
        }
      }
      // تابلوی هوشمند محله
      const minersTaken = [1, 2, 3, 4].filter((n) => padsDone.includes(`miner_${n}`)).length;
      const ledsDone = [1, 2, 3, 4, 5].filter((n) => padsDone.includes(`led_${n}`)).length;
      const load = 1420 - minersTaken * 260 - ledsDone * 24;
      boardTimer -= dt;
      if (boardTimer <= 0) {
        boardTimer = 0.2;
        drawSmartBoard(boardCanvas, load, 1420);
        boardTex.needsUpdate = true;
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
