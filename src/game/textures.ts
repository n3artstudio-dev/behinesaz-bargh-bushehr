import * as THREE from "three";

function canvas(size: number) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return { c, ctx: c.getContext("2d")! };
}

function rnd(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function finish(c: HTMLCanvasElement, repeat: [number, number], aniso = 4) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const cache = new Map<string, THREE.Texture>();

export function plasterTex(base = "#efe6d2", repeat: [number, number] = [2, 2], seed = 1) {
  const key = `plaster-${base}-${repeat}-${seed}`;
  if (cache.has(key)) return cache.get(key)!;
  const { c, ctx } = canvas(512);
  const r = rnd(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  // grain
  for (let i = 0; i < 14000; i++) {
    const a = r() * 0.08;
    ctx.fillStyle = r() > 0.5 ? `rgba(90,70,40,${a})` : `rgba(255,255,255,${a})`;
    ctx.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1 + r() * 2);
  }
  // stains & weathering streaks
  for (let i = 0; i < 18; i++) {
    const x = r() * 512;
    const y = r() * 512;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 40 + r() * 90);
    g.addColorStop(0, `rgba(120,95,60,${0.06 + r() * 0.1})`);
    g.addColorStop(1, "rgba(120,95,60,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
  }
  for (let i = 0; i < 10; i++) {
    const x = r() * 512;
    ctx.fillStyle = `rgba(80,70,60,${0.03 + r() * 0.05})`;
    ctx.fillRect(x, 0, 2 + r() * 6, 200 + r() * 312);
  }
  // cracks
  ctx.strokeStyle = "rgba(70,55,40,0.25)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    let x = r() * 512,
      y = r() * 512;
    ctx.moveTo(x, y);
    for (let k = 0; k < 8; k++) {
      x += (r() - 0.5) * 40;
      y += r() * 30;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const t = finish(c, repeat);
  cache.set(key, t);
  return t;
}

export function stoneTex(repeat: [number, number] = [4, 4]) {
  const key = `stone-${repeat}`;
  if (cache.has(key)) return cache.get(key)!;
  const { c, ctx } = canvas(512);
  const r = rnd(7);
  ctx.fillStyle = "#b9a98c";
  ctx.fillRect(0, 0, 512, 512);
  const rows = 8;
  for (let j = 0; j < rows; j++) {
    const h = 512 / rows;
    let x = j % 2 ? -30 : 0;
    while (x < 512) {
      const w = 40 + r() * 50;
      const shade = 170 + r() * 50;
      ctx.fillStyle = `rgb(${shade + 10},${shade - 5},${shade - 35})`;
      ctx.fillRect(x + 2, j * h + 2, w - 4, h - 4);
      ctx.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.08})`;
      ctx.fillRect(x + 4, j * h + 4, w - 8, 3);
      x += w;
    }
  }
  for (let i = 0; i < 6000; i++) {
    ctx.fillStyle = `rgba(60,50,30,${r() * 0.12})`;
    ctx.fillRect(r() * 512, r() * 512, 2, 2);
  }
  const t = finish(c, repeat);
  cache.set(key, t);
  return t;
}

export function cobbleTex(repeat: [number, number] = [8, 8]) {
  const key = `cobble-${repeat}`;
  if (cache.has(key)) return cache.get(key)!;
  const { c, ctx } = canvas(512);
  const r = rnd(3);
  ctx.fillStyle = "#8d8272";
  ctx.fillRect(0, 0, 512, 512);
  const n = 14;
  const s = 512 / n;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const off = j % 2 ? s / 2 : 0;
      const sh = 150 + r() * 60;
      ctx.fillStyle = `rgb(${sh + 8},${sh},${sh - 18})`;
      ctx.beginPath();
      ctx.roundRect(i * s + off + 2, j * s + 2, s - 4, s - 4, 8);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.06})`;
      ctx.beginPath();
      ctx.roundRect(i * s + off + 4, j * s + 4, s - 8, s / 3, 6);
      ctx.fill();
    }
  const t = finish(c, repeat);
  cache.set(key, t);
  return t;
}

export function asphaltTex(repeat: [number, number] = [4, 20]) {
  const key = `asphalt-${repeat}`;
  if (cache.has(key)) return cache.get(key)!;
  const { c, ctx } = canvas(512);
  const r = rnd(11);
  ctx.fillStyle = "#6e6f72";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 20000; i++) {
    const a = r() * 0.18;
    ctx.fillStyle = r() > 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 0.6})`;
    ctx.fillRect(r() * 512, r() * 512, 2, 2);
  }
  const t = finish(c, repeat);
  cache.set(key, t);
  return t;
}

export function tileFloorTex(repeat: [number, number] = [6, 6]) {
  // black & white diamond tiles like historic Bushehr interiors
  const key = `tile-${repeat}`;
  if (cache.has(key)) return cache.get(key)!;
  const { c, ctx } = canvas(512);
  ctx.fillStyle = "#efe9dc";
  ctx.fillRect(0, 0, 512, 512);
  const s = 128;
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 2;
  for (let j = 0; j < 4; j++)
    for (let i = 0; i < 4; i++) {
      ctx.strokeRect(i * s, j * s, s, s);
      ctx.fillStyle = "#1f2430";
      ctx.beginPath();
      ctx.moveTo(i * s + s / 2, j * s + s / 2 - 22);
      ctx.lineTo(i * s + s / 2 + 22, j * s + s / 2);
      ctx.lineTo(i * s + s / 2, j * s + s / 2 + 22);
      ctx.lineTo(i * s + s / 2 - 22, j * s + s / 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#1f2430";
      ctx.beginPath();
      ctx.moveTo(i * s, j * s + 14);
      ctx.lineTo(i * s + 14, j * s);
      ctx.lineTo(i * s - 14, j * s);
      ctx.closePath();
      ctx.fill();
    }
  const t = finish(c, repeat);
  cache.set(key, t);
  return t;
}

export function woodTex(base = "#7a4a27", repeat: [number, number] = [1, 1]) {
  const key = `wood-${base}-${repeat}`;
  if (cache.has(key)) return cache.get(key)!;
  const { c, ctx } = canvas(256);
  const r = rnd(5);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(${r() > 0.5 ? "0,0,0" : "255,220,160"},${0.04 + r() * 0.1})`;
    ctx.fillRect(0, r() * 256, 256, 1 + r() * 3);
  }
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, i * 42, 256, 2);
  }
  const t = finish(c, repeat);
  cache.set(key, t);
  return t;
}

export function sandTex(repeat: [number, number] = [30, 30]) {
  const key = `sand-${repeat}`;
  if (cache.has(key)) return cache.get(key)!;
  const { c, ctx } = canvas(256);
  const r = rnd(9);
  ctx.fillStyle = "#dfcfa8";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(${r() > 0.5 ? "120,95,60" : "255,250,230"},${r() * 0.14})`;
    ctx.fillRect(r() * 256, r() * 256, 2, 2);
  }
  const t = finish(c, repeat);
  cache.set(key, t);
  return t;
}

export function solarTex() {
  const key = `solar`;
  if (cache.has(key)) return cache.get(key)!;
  const { c, ctx } = canvas(256);
  ctx.fillStyle = "#0e1f4d";
  ctx.fillRect(0, 0, 256, 256);
  const n = 6;
  const s = 256 / n;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const g = ctx.createLinearGradient(i * s, j * s, i * s + s, j * s + s);
      g.addColorStop(0, "#1a3a8f");
      g.addColorStop(1, "#0c1f55");
      ctx.fillStyle = g;
      ctx.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(i * s + 3, j * s + 3, s - 6, 3);
    }
  ctx.strokeStyle = "#c9d3e8";
  ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, 254, 254);
  const t = finish(c, [1, 1]);
  cache.set(key, t);
  return t;
}
