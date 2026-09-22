import * as THREE from "three";

const matCache = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: string | number, rough = 0.75, metal = 0, emissive?: string | number, emissiveIntensity = 1) {
  const key = `${color}-${rough}-${metal}-${emissive ?? ""}-${emissiveIntensity}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    if (emissive !== undefined) {
      m.emissive = new THREE.Color(emissive);
      m.emissiveIntensity = emissiveIntensity;
    }
    matCache.set(key, m);
  }
  return m;
}

export interface CharacterOptions {
  kind: "hero" | "boy" | "girl" | "man" | "woman" | "elder_man" | "elder_woman" | "fisherman" | "electrician" | "shopkeeper" | "teacher";
  skin?: string;
  shirt?: string;
  pants?: string;
  scarf?: string;
  hair?: string;
  scale?: number;
  goldCap?: boolean;
}

const SKINS = ["#f0c7a1", "#e2b48c", "#d3a077", "#c48c66", "#b97d5b"];

export class Character {
  root = new THREE.Group();
  body = new THREE.Group();
  head = new THREE.Group();
  armL = new THREE.Group();
  armR = new THREE.Group();
  legL = new THREE.Group();
  legR = new THREE.Group();
  eyeL!: THREE.Mesh;
  eyeR!: THREE.Mesh;
  mouth!: THREE.Mesh;
  scanner?: THREE.Group;
  cap?: THREE.Group;
  glider?: THREE.Group;
  medal?: THREE.Group;
  torsoMesh!: THREE.Mesh;
  phase = 0;
  blinkT = 2 + Math.random() * 3;
  blinking = 0;
  moveFactor = 0;
  jumpFactor = 0;
  celebrateT = 0;
  idleT = Math.random() * 10;
  height: number;
  opts: CharacterOptions;
  isFemale: boolean;

  constructor(opts: CharacterOptions) {
    this.opts = opts;
    this.isFemale = ["girl", "woman", "elder_woman", "teacher"].includes(opts.kind);
    const child = ["hero", "boy", "girl"].includes(opts.kind);
    const s = opts.scale ?? (child ? 0.88 : 1.05);
    this.height = 1.75 * s;
    this.root.add(this.body);
    this.build(opts, child);
    this.body.scale.setScalar(s);
  }

  private build(o: CharacterOptions, child: boolean) {
    const skin = mat(o.skin ?? SKINS[Math.floor(Math.random() * SKINS.length)], 0.55);
    const shirtC = o.shirt ?? "#3f7fd1";
    const pantsC = o.pants ?? "#2c3e63";
    const shirt = mat(shirtC, 0.8);
    const pants = mat(pantsC, 0.85);
    const hairM = mat(o.hair ?? "#1d1410", 0.6);
    const dark = mat("#1a1a1a", 0.4);
    const white = mat("#ffffff", 0.5);
    const shoe = mat(o.kind === "hero" ? "#f2f2f2" : "#3a2a20", 0.7);

    // proportions (Subway-Surfers style: big head, compact body)
    const headR = child ? 0.34 : 0.28;
    const torsoH = child ? 0.5 : 0.62;
    const legH = child ? 0.45 : 0.62;
    const armH = child ? 0.42 : 0.55;
    const hipY = legH;

    // legs
    const legGeo = new THREE.CapsuleGeometry(child ? 0.09 : 0.085, legH - 0.16, 6, 10);
    for (const [grp, x] of [[this.legL, -0.11], [this.legR, 0.11]] as const) {
      grp.position.set(x, hipY, 0);
      const leg = new THREE.Mesh(legGeo, pants);
      leg.position.y = -legH / 2 + 0.05;
      leg.castShadow = true;
      grp.add(leg);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.13, 0.28), shoe);
      foot.position.set(0, -legH + 0.07, 0.05);
      foot.castShadow = true;
      grp.add(foot);
      this.body.add(grp);
    }

    // torso
    const torsoGeo = new THREE.CapsuleGeometry(child ? 0.22 : 0.24, torsoH - 0.3, 6, 12);
    this.torsoMesh = new THREE.Mesh(torsoGeo, shirt);
    this.torsoMesh.position.y = hipY + torsoH / 2;
    this.torsoMesh.castShadow = true;
    this.body.add(this.torsoMesh);

    // female long coat (manteau / chador) covering to ankles
    if (this.isFemale) {
      const coatC = o.kind === "elder_woman" ? "#1c1c24" : shirtC;
      const coat = new THREE.Mesh(new THREE.CylinderGeometry(child ? 0.24 : 0.27, child ? 0.32 : 0.4, hipY + torsoH * 0.6, 14), mat(coatC, 0.85));
      coat.position.y = (hipY + torsoH * 0.6) / 2;
      coat.castShadow = true;
      this.body.add(coat);
    }

    // arms
    const armGeo = new THREE.CapsuleGeometry(child ? 0.075 : 0.07, armH - 0.15, 6, 10);
    for (const [grp, x] of [[this.armL, -(child ? 0.3 : 0.32)], [this.armR, child ? 0.3 : 0.32]] as const) {
      grp.position.set(x, hipY + torsoH - 0.08, 0);
      const arm = new THREE.Mesh(armGeo, shirt);
      arm.position.y = -armH / 2 + 0.05;
      arm.castShadow = true;
      grp.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(child ? 0.075 : 0.07, 10, 8), skin);
      hand.position.y = -armH + 0.02;
      grp.add(hand);
      this.body.add(grp);
    }

    // head
    this.head.position.y = hipY + torsoH + headR * 0.9;
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(headR, 20, 16), skin);
    headMesh.castShadow = true;
    this.head.add(headMesh);
    // neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.14, 8), skin);
    neck.position.y = -headR * 0.9;
    this.head.add(neck);

    // eyes
    const eyeGeo = new THREE.SphereGeometry(headR * 0.17, 10, 8);
    const eyeWhiteGeo = new THREE.SphereGeometry(headR * 0.22, 10, 8);
    for (const side of [-1, 1]) {
      const ew = new THREE.Mesh(eyeWhiteGeo, white);
      ew.position.set(side * headR * 0.36, headR * 0.05, headR * 0.82);
      ew.scale.set(1, 1.1, 0.5);
      this.head.add(ew);
      const e = new THREE.Mesh(eyeGeo, dark);
      e.position.set(side * headR * 0.36, headR * 0.05, headR * 0.92);
      e.scale.set(1, 1.2, 0.5);
      this.head.add(e);
      if (side < 0) this.eyeL = e;
      else this.eyeR = e;
      // brows
      const brow = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.4, headR * 0.06, headR * 0.06), hairM);
      brow.position.set(side * headR * 0.36, headR * 0.35, headR * 0.9);
      brow.rotation.z = side * -0.15;
      this.head.add(brow);
    }
    // nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.11, 8, 6), skin);
    nose.position.set(0, -headR * 0.12, headR * 0.98);
    this.head.add(nose);
    // mouth (smile)
    this.mouth = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.22, headR * 0.035, 6, 12, Math.PI), mat("#8b3a3a", 0.6));
    this.mouth.position.set(0, -headR * 0.35, headR * 0.9);
    this.mouth.rotation.z = Math.PI;
    this.head.add(this.mouth);
    // ears
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.16, 8, 6), skin);
      ear.position.set(side * headR * 0.98, 0, 0);
      ear.scale.set(0.5, 1, 0.8);
      if (!this.isFemale) this.head.add(ear);
    }

    // hair / head covering
    if (this.isFemale) {
      const scarfC = o.scarf ?? (o.kind === "elder_woman" ? "#1c1c24" : "#d9a441");
      const scarf = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.13, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.92), mat(scarfC, 0.85));
      scarf.position.set(0, headR * 0.02, -headR * 0.16);
      scarf.castShadow = true;
      this.head.add(scarf);
      // scarf drape under chin / shoulders
      const drape = new THREE.Mesh(new THREE.ConeGeometry(headR * 1.3, headR * 1.4, 14, 1, true), mat(scarfC, 0.85));
      drape.position.set(0, -headR * 1.2, -headR * 0.15);
      this.head.add(drape);
    } else {
      // short hair cap
      const hair = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.04, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM);
      hair.position.y = headR * 0.1;
      hair.scale.set(1, 1, 1.05);
      this.head.add(hair);
      if (o.kind === "hero" || o.kind === "boy") {
        // fringe tufts
        for (let i = -2; i <= 2; i++) {
          const tuft = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.18, 8, 6), hairM);
          tuft.position.set(i * headR * 0.28, headR * 0.5, headR * 0.75);
          this.head.add(tuft);
        }
      }
      if (o.kind === "elder_man") {
        hair.material = mat("#d8d8d8", 0.7);
      }
      if (o.kind === "man" || o.kind === "elder_man" || o.kind === "fisherman" || o.kind === "shopkeeper" || o.kind === "electrician") {
        const beard = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.75, 14, 10, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), o.kind === "elder_man" ? mat("#cfcfcf", 0.7) : hairM);
        beard.position.set(0, -headR * 0.15, headR * 0.12);
        beard.scale.set(1, 0.9, 1.05);
        this.head.add(beard);
      }
    }

    // outfits by kind
    if (o.kind === "hero") {
      this.cap = new THREE.Group();
      const capC = o.goldCap ? "#f2b632" : "#1e4f9a";
      const capM = mat(capC, 0.7);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.07, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.48), capM);
      crown.castShadow = true;
      this.cap.add(crown);
      const visor = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.95, headR * 0.95, 0.04, 16, 1, false, -Math.PI / 2.4, Math.PI / 1.2), capM);
      visor.position.set(0, headR * 0.06, headR * 0.45);
      visor.scale.set(1, 1, 1.25);
      this.cap.add(visor);
      const bolt = makeBolt(0.12, "#ffd23a");
      bolt.position.set(0, headR * 0.55, headR * 0.86);
      bolt.rotation.x = -0.35;
      this.cap.add(bolt);
      this.cap.position.y = headR * 0.12;
      this.head.add(this.cap);
      // backpack
      const bp = new THREE.Group();
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.2), mat("#1a3a7a", 0.75));
      pack.castShadow = true;
      bp.add(pack);
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.06), mat("#2560b0", 0.7));
      pocket.position.set(0, -0.08, -0.12);
      bp.add(pocket);
      const bolt2 = makeBolt(0.1, "#ffd23a");
      bolt2.position.set(0, 0.08, -0.16);
      bolt2.rotation.y = Math.PI;
      bp.add(bolt2);
      for (const side of [-1, 1]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.26), mat("#0e2a5c", 0.8));
        strap.position.set(side * 0.12, 0, 0.12);
        bp.add(strap);
      }
      bp.position.set(0, hipY + torsoH * 0.55, -0.26);
      this.body.add(bp);
      // badge on chest
      const badge = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), mat("#ffd23a", 0.4, 0.3, "#ffb300", 0.4));
      badge.position.set(-0.1, hipY + torsoH * 0.7, 0.225);
      this.body.add(badge);
      const bBolt = makeBolt(0.06, "#f0b820");
      bBolt.position.set(-0.1, hipY + torsoH * 0.7, 0.232);
      this.body.add(bBolt);
      // smart bracelet
      const brace = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.025, 8, 14), mat("#1e6fd9", 0.4, 0.4, "#2a9dff", 0.6));
      brace.rotation.x = Math.PI / 2;
      brace.position.y = -armH + 0.12;
      this.armL.add(brace);
      // scanner (hidden until active)
      this.scanner = new THREE.Group();
      const sBody = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.2, 0.05), mat("#1b3f8a", 0.4, 0.3));
      this.scanner.add(sBody);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.1), mat("#5df0ff", 0.3, 0, "#3ce8ff", 1.5));
      screen.position.set(0, 0.03, 0.026);
      this.scanner.add(screen);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12), mat("#3ce8ff", 0.2, 0.5, "#3ce8ff", 2));
      lens.rotation.x = Math.PI / 2;
      lens.position.set(0, 0.12, 0);
      this.scanner.add(lens);
      this.scanner.position.set(0, -armH + 0.02, 0.06);
      this.scanner.rotation.x = -Math.PI / 2 + 0.4;
      this.scanner.visible = false;
      this.armR.add(this.scanner);
      // shorts look: pants length is legs; add shirt sleeves color already
    }
    if (o.kind === "fisherman") {
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.95, headR * 0.16, 8, 18), mat("#e9e2cf", 0.9));
      wrap.rotation.x = Math.PI / 2;
      wrap.position.y = headR * 0.45;
      this.head.add(wrap);
      const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.28, torsoH * 0.6, 12, 1, true), mat("#6b4a2a", 0.9));
      vest.position.y = hipY + torsoH * 0.55;
      this.body.add(vest);
    }
    if (o.kind === "electrician") {
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), mat("#ffcc00", 0.5));
      helmet.position.y = headR * 0.1;
      this.head.add(helmet);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.2, headR * 1.2, 0.03, 18), mat("#ffcc00", 0.5));
      brim.position.y = headR * 0.1;
      this.head.add(brim);
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.02, 6, 20), mat("#e8f7ff", 0.3, 0, "#c9f0ff", 0.6));
      stripe.rotation.x = Math.PI / 2;
      stripe.position.y = hipY + torsoH * 0.5;
      this.body.add(stripe);
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 6, 20), mat("#4b3621", 0.9));
      belt.rotation.x = Math.PI / 2;
      belt.position.y = hipY + 0.05;
      this.body.add(belt);
    }
    if (o.kind === "shopkeeper") {
      const apron = new THREE.Mesh(new THREE.BoxGeometry(0.34, torsoH * 0.9, 0.04), mat("#dfe6ee", 0.9));
      apron.position.set(0, hipY + torsoH * 0.4, 0.23);
      this.body.add(apron);
    }
    if (o.kind === "elder_man") {
      const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), mat("#5b3a1e", 0.8));
      cane.position.set(0, -armH - 0.3, 0.05);
      this.armR.add(cane);
    }
    if (o.kind === "girl" && !o.scarf) {
      // young girl: colourful scarf already handled by default color
    }

    // پاراگلایدر / چتر پرواز (پاداش جهان بادی) — جمع‌شده، موقع پرواز باز می‌شود
    const glider = new THREE.Group();
    const canopyGeo = new THREE.SphereGeometry(1.0, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const canopy = new THREE.Mesh(canopyGeo, mat("#f0b820", 0.6));
    canopy.scale.set(1.7, 1.05, 1.15);
    canopy.position.y = 0;
    canopy.castShadow = true;
    glider.add(canopy);
    // نوارهای آبی روی چتر
    for (let i = -2; i <= 2; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 1.5), mat("#1e4f9a", 0.6));
      stripe.position.set(i * 0.55, -0.05, 0);
      stripe.rotation.y = Math.abs(i) * 0.28;
      glider.add(stripe);
    }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 8, 28), mat("#1e4f9a", 0.5));
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(1.7, 1.15, 1);
    rim.position.y = -0.02;
    glider.add(rim);
    // بندها تا دست‌ها
    const ropeMat = mat("#cfd6df", 0.8);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.5, 5), ropeMat);
        rope.position.set(sx * 1.15, -0.8, sz * 0.55);
        rope.rotation.z = -sx * 0.5;
        glider.add(rope);
      }
    }
    glider.position.y = 2.65;
    glider.visible = false;
    this.glider = glider;
    this.body.add(glider);

    // مدال افتخار طلایی با روبان (پایان بازی)
    const medal = new THREE.Group();
    const ribbonL = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.3), new THREE.MeshBasicMaterial({ color: "#1e4f9a", side: THREE.DoubleSide }));
    ribbonL.position.set(-0.06, 0.28, 0.21);
    const ribbonR = ribbonL.clone();
    ribbonR.material = new THREE.MeshBasicMaterial({ color: "#f0b820", side: THREE.DoubleSide });
    ribbonR.position.x = 0.06;
    medal.add(ribbonL, ribbonR);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 18), mat("#ffd23a", 0.25, 0.9, "#ffb300", 0.8));
    disc.rotation.x = Math.PI / 2;
    disc.position.set(0, 0.04, 0.22);
    medal.add(disc);
    const boltM = makeBolt(0.09, "#10345f");
    boltM.position.set(0, 0.04, 0.26);
    medal.add(boltM);
    medal.position.y = 1.15;
    medal.visible = false;
    this.medal = medal;
    this.body.add(medal);

    this.body.add(this.head);
  }

  setScannerVisible(v: boolean) {
    if (this.scanner) this.scanner.visible = v;
  }

  setGlider(v: boolean) {
    if (this.glider) this.glider.visible = v;
  }

  setMedal(v: boolean) {
    if (this.medal) this.medal.visible = v;
  }

  celebrate() {
    this.celebrateT = 2.4;
  }

  update(dt: number, speedNorm: number, airborne: boolean, time: number, gliding = false) {
    // speedNorm: 0 idle .. 1 run
    this.moveFactor += (speedNorm - this.moveFactor) * Math.min(1, dt * 10);
    this.jumpFactor += ((airborne ? 1 : 0) - this.jumpFactor) * Math.min(1, dt * 12);
    this.phase += dt * (7 + speedNorm * 12) * Math.max(0.25, speedNorm);
    this.idleT += dt;
    const mf = this.moveFactor;
    const swing = Math.sin(this.phase) * 1.05 * mf;
    const lean = mf * 0.18;

    this.legL.rotation.x = swing * (1 - this.jumpFactor) + this.jumpFactor * -0.6;
    this.legR.rotation.x = -swing * (1 - this.jumpFactor) + this.jumpFactor * 0.4;
    this.armL.rotation.x = -swing * 1.1 * (1 - this.jumpFactor);
    this.armR.rotation.x = swing * 1.1 * (1 - this.jumpFactor);
    const armOut = 0.12 + this.jumpFactor * 1.4;
    this.armL.rotation.z = armOut + Math.sin(this.idleT * 1.7) * 0.03;
    this.armR.rotation.z = -armOut - Math.sin(this.idleT * 1.7) * 0.03;

    if (this.scanner?.visible) {
      this.armR.rotation.x = -1.35;
      this.armR.rotation.z = -0.25;
    }
    if (gliding) {
      // دست‌ها به بندهای چتر و پاها کمی جمع
      this.armL.rotation.set(-2.1, 0, 0.55);
      this.armR.rotation.set(-2.1, 0, -0.55);
      this.legL.rotation.x = 0.25;
      this.legR.rotation.x = -0.15;
      this.body.rotation.x = 0.28;
      if (this.glider) {
        this.glider.rotation.z = Math.sin(this.idleT * 1.6) * 0.07;
        this.glider.rotation.x = Math.sin(this.idleT * 1.1) * 0.04;
      }
    }

    if (this.celebrateT > 0) {
      this.celebrateT -= dt;
      const c = Math.sin(this.celebrateT * 14);
      this.armL.rotation.x = -2.6 + c * 0.3;
      this.armR.rotation.x = -2.6 - c * 0.3;
      this.armL.rotation.z = 0.5;
      this.armR.rotation.z = -0.5;
      this.body.position.y = Math.abs(Math.sin(this.celebrateT * 7)) * 0.25;
      this.body.rotation.y = Math.sin(this.celebrateT * 3) * 0.3;
      this.mouth.scale.setScalar(1.4);
    } else {
      this.body.position.y = Math.abs(Math.sin(this.phase)) * 0.06 * mf;
      this.body.rotation.y = 0;
      this.mouth.scale.setScalar(1);
    }
    this.body.rotation.x = gliding ? 0.28 : lean;
    this.torsoMesh.scale.set(1, 1 + Math.sin(this.idleT * 2.2) * 0.015, 1);
    this.head.rotation.x = (gliding ? -0.15 : -lean * 0.6) + Math.sin(this.idleT * 0.9) * 0.03;
    this.head.rotation.y = Math.sin(this.idleT * 0.6) * 0.08 * (1 - mf);

    // blinking
    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blinking = 0.13;
      this.blinkT = 2.5 + Math.random() * 3.5;
    }
    if (this.blinking > 0) {
      this.blinking -= dt;
      const s = this.blinking > 0.06 ? 0.1 : 1;
      this.eyeL.scale.y = 1.2 * s;
      this.eyeR.scale.y = 1.2 * s;
    } else {
      this.eyeL.scale.y = 1.2;
      this.eyeR.scale.y = 1.2;
    }
    void time;
  }
}

export function makeBolt(size: number, color: string) {
  const s = new THREE.Shape();
  const p: [number, number][] = [
    [0.2, 1],
    [-0.35, 0.05],
    [0.02, 0.05],
    [-0.2, -1],
    [0.4, 0.15],
    [0.05, 0.15],
  ];
  s.moveTo(p[0][0] * size, p[0][1] * size);
  for (let i = 1; i < p.length; i++) s.lineTo(p[i][0] * size, p[i][1] * size);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: size * 0.15, bevelEnabled: false });
  const m = new THREE.Mesh(g, mat(color, 0.4, 0.2, color, 0.35));
  return m;
}

export function npcPreset(kind: CharacterOptions["kind"], i: number): CharacterOptions {
  const shirts = ["#e8e2d0", "#3a7bd5", "#6fae5c", "#c9552e", "#f0f0f0", "#8a5a44", "#2e8b8b"];
  const scarves = ["#c93a6e", "#3d6fb5", "#2f8f6f", "#d9a441", "#7c4fb0"];
  const skins = SKINS;
  const base: CharacterOptions = { kind, skin: skins[i % skins.length] };
  switch (kind) {
    case "woman":
      return { ...base, shirt: ["#5b4a8a", "#2d5f8b", "#6b3d3d"][i % 3], scarf: scarves[i % scarves.length] };
    case "girl":
      return { ...base, shirt: ["#e06b9c", "#4fa3d9", "#8dc251"][i % 3], scarf: ["#fff0a0", "#ffb3c7", "#bde0ff"][i % 3] };
    case "elder_woman":
      return { ...base, shirt: "#1c1c24", scarf: "#1c1c24" };
    case "teacher":
      return { ...base, shirt: "#2c4a7a", scarf: "#e6e6f0" };
    case "man":
      return { ...base, shirt: shirts[i % shirts.length], pants: ["#2c3e63", "#3b3b3b", "#5a4632"][i % 3] };
    case "elder_man":
      return { ...base, shirt: "#e8e2d0", pants: "#3b3b3b", hair: "#d8d8d8" };
    case "boy":
      return { ...base, shirt: ["#2f9bd8", "#f2a92e", "#4bbf6b"][i % 3], pants: "#37507a" };
    case "fisherman":
      return { ...base, shirt: "#e9e2cf", pants: "#4a5a6a" };
    case "electrician":
      return { ...base, shirt: "#1f6fd1", pants: "#1f3a70" };
    case "shopkeeper":
      return { ...base, shirt: "#8a5a44", pants: "#3b3b3b" };
    default:
      return base;
  }
}
