import { create } from "zustand";

export type Phase = "menu" | "cinematic" | "playing" | "paused";
export type Panel =
  | null
  | "map"
  | "missions"
  | "inventory"
  | "stats"
  | "settings"
  | "scanner"
  | "shop"
  | "dialog"
  | "missionComplete"
  | "solar"
  | "help";

export type ApplianceType = "bulb" | "fridge" | "ac" | "tv" | "light";

export interface Appliance {
  id: string;
  name: string;
  type: ApplianceType;
  watts: number; // inefficient consumption
  efficientWatts: number; // after replacement
  on: boolean;
  efficient: boolean;
  fixKind: "replace" | "switchOff";
  replaceCost: number;
  replaceName: string;
  problem: string;
  solution: string;
  fixed: boolean;
}

export interface Objective {
  id: string;
  text: string;
  done: boolean;
}

export interface Mission {
  id: number;
  title: string;
  desc: string;
  objectives: Objective[];
  rewardCoins: number;
  rewardXp: number;
  state: "locked" | "active" | "done";
}

export interface DialogState {
  speaker: string;
  lines: string[];
  index: number;
  onEnd?: string;
}

export interface Toast {
  id: number;
  text: string;
  kind: "coin" | "info" | "success" | "warn";
}

export interface Upgrade {
  id: string;
  name: string;
  desc: string;
  cost: number;
  owned: boolean;
  icon: string;
  requires?: string;
}

interface SaveData {
  coins: number;
  xp: number;
  time: number;
  appliances: Appliance[];
  missions: Mission[];
  solarLevel: number;
  upgrades: Upgrade[];
  scannerUnlocked: boolean;
  neighborhood: number;
  worldCoinsCollected: number[];
  hasSave: boolean;
}

export interface GameState extends SaveData {
  phase: Phase;
  panel: Panel;
  scannerActive: boolean;
  scanTarget: string | null;
  prompt: string | null;
  dialog: DialogState | null;
  toasts: Toast[];
  playerPos: { x: number; z: number; yaw: number };
  inHouse: boolean;
  onRoof: boolean;
  settings: { music: boolean; sfx: boolean; sensitivity: number; quality: "high" | "medium" };
  cinematicText: string;
  lastMissionReward: { coins: number; xp: number; title: string } | null;
  weather: "clear" | "haze";
  levelUpFlash: number;

  // actions
  setPhase: (p: Phase) => void;
  setPanel: (p: Panel) => void;
  setPrompt: (p: string | null) => void;
  setPlayerPos: (x: number, z: number, yaw: number) => void;
  setInHouse: (v: boolean) => void;
  setOnRoof: (v: boolean) => void;
  tickTime: (dtMin: number) => void;
  addCoins: (n: number, silent?: boolean) => void;
  addXp: (n: number) => void;
  collectWorldCoin: (idx: number) => void;
  toggleScanner: (v?: boolean) => void;
  setScanTarget: (id: string | null) => void;
  openDialog: (d: DialogState) => void;
  nextDialog: () => void;
  toast: (text: string, kind?: Toast["kind"]) => void;
  completeObjective: (missionId: number, objId: string) => void;
  toggleAppliance: (id: string) => void;
  replaceAppliance: (id: string) => boolean;
  installSolar: () => boolean;
  buyUpgrade: (id: string) => boolean;
  setSettings: (s: Partial<GameState["settings"]>) => void;
  setCinematicText: (t: string) => void;
  newGame: () => void;
  save: () => void;
  load: () => boolean;
  clearMissionReward: () => void;
  setWeather: (w: GameState["weather"]) => void;
}

const SAVE_KEY = "behinesaz-bushehr-save-v1";

export const LEVEL_XP = [0, 200, 500, 900, 1400, 2000, 2800];
export function levelFromXp(xp: number) {
  let lv = 1;
  for (let i = 1; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) lv = i + 1;
  return lv;
}
export function xpProgress(xp: number) {
  const lv = levelFromXp(xp);
  const cur = LEVEL_XP[lv - 1] ?? 0;
  const next = LEVEL_XP[lv] ?? cur + 1000;
  return { lv, cur, next, pct: Math.min(1, (xp - cur) / (next - cur)) };
}

export const PEAK_START = 13 * 60;
export const PEAK_END = 18 * 60;
export function isPeak(time: number) {
  const m = time % 1440;
  return m >= PEAK_START && m < PEAK_END;
}
export function formatTime(time: number) {
  const m = Math.floor(time % 1440);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${toFa(h.toString().padStart(2, "0"))}:${toFa(mm.toString().padStart(2, "0"))}`;
}
export function toFa(n: number | string) {
  const d = "۰۱۲۳۴۵۶۷۸۹";
  return n.toString().replace(/\d/g, (c) => d[parseInt(c)]);
}

export function sunFactor(time: number) {
  const h = (time % 1440) / 60;
  // 0 at night, 1 at noon
  return Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));
}

function defaultAppliances(): Appliance[] {
  return [
    {
      id: "bulb_living",
      name: "لامپ رشته‌ای پذیرایی",
      type: "bulb",
      watts: 100,
      efficientWatts: 9,
      on: true,
      efficient: false,
      fixKind: "replace",
      replaceCost: 30,
      replaceName: "لامپ LED ۹ وات",
      problem: "لامپ رشته‌ای قدیمی؛ ۹۰٪ انرژی را به گرما تبدیل می‌کند.",
      solution: "تعویض با لامپ LED کم‌مصرف",
      fixed: false,
    },
    {
      id: "light_hall",
      name: "چراغ راهرو",
      type: "light",
      watts: 60,
      efficientWatts: 60,
      on: true,
      efficient: false,
      fixKind: "switchOff",
      replaceCost: 0,
      replaceName: "",
      problem: "چراغ در روز روشن مانده و کسی در راهرو نیست.",
      solution: "خاموش کردن چراغ‌های غیرضروری",
      fixed: false,
    },
    {
      id: "tv",
      name: "تلویزیون",
      type: "tv",
      watts: 120,
      efficientWatts: 120,
      on: true,
      efficient: false,
      fixKind: "switchOff",
      replaceCost: 0,
      replaceName: "",
      problem: "تلویزیون روشن است اما کسی تماشا نمی‌کند.",
      solution: "خاموش کردن دستگاه بدون استفاده",
      fixed: false,
    },
    {
      id: "fridge",
      name: "یخچال قدیمی",
      type: "fridge",
      watts: 260,
      efficientWatts: 90,
      on: true,
      efficient: false,
      fixKind: "replace",
      replaceCost: 120,
      replaceName: "یخچال با برچسب انرژی A++",
      problem: "یخچال ۲۰ ساله با برچسب انرژی D؛ کمپرسور فرسوده.",
      solution: "تعویض با مدل A++ کم‌مصرف",
      fixed: false,
    },
    {
      id: "ac",
      name: "کولر گازی قدیمی",
      type: "ac",
      watts: 2000,
      efficientWatts: 800,
      on: true,
      efficient: false,
      fixKind: "replace",
      replaceCost: 150,
      replaceName: "کولر اینورتر A+ (دمای ۲۵ درجه)",
      problem: "کولر غیر اینورتر روی ۱۸ درجه در ساعت اوج مصرف کار می‌کند.",
      solution: "تعویض با کولر اینورتر و تنظیم روی ۲۵ درجه",
      fixed: false,
    },
  ];
}

function defaultMissions(): Mission[] {
  return [
    {
      id: 1,
      title: "اولین مأموریت مدیریت مصرف برق",
      desc: "خانم فاطمه از قبض برق بالای خانه‌اش نگران است. مشکل را پیدا کن و حل کن.",
      state: "active",
      rewardCoins: 200,
      rewardXp: 220,
      objectives: [
        { id: "talk", text: "با خانم فاطمه کنار خانه سنتی صحبت کن", done: false },
        { id: "enter", text: "وارد خانه شو و اسکنر انرژی را فعال کن (Q)", done: false },
        { id: "bulb", text: "لامپ پرمصرف پذیرایی را با LED تعویض کن", done: false },
        { id: "fixall", text: "چهار مشکل مصرف دیگر خانه را برطرف کن", done: false },
        { id: "green", text: "نوار انرژی خانه را سبز کن", done: false },
      ],
    },
    {
      id: 2,
      title: "انرژی خورشیدی روی پشت‌بام",
      desc: "با نردبان به پشت‌بام برو و پنل خورشیدی نصب کن تا خانه برق پاک تولید کند.",
      state: "locked",
      rewardCoins: 200,
      rewardXp: 300,
      objectives: [
        { id: "roof", text: "از نردبان کوچهٔ کنار خانه (زیر تابلوی «راه پشت‌بام») بالا برو", done: false },
        { id: "solar", text: "پنل خورشیدی بخر و نصب کن (۲۵۰ سکه)", done: false },
      ],
    },
    {
      id: 3,
      title: "محله هوشمند",
      desc: "با ارتقاهای هوشمند (باتری، کلید خودکار) محله را به سطح بعد ببر.",
      state: "locked",
      rewardCoins: 300,
      rewardXp: 400,
      objectives: [
        { id: "battery", text: "باتری ذخیره‌ساز بخر", done: false },
        { id: "smart", text: "کلید هوشمند بخر", done: false },
      ],
    },
  ];
}

function defaultUpgrades(): Upgrade[] {
  return [
    { id: "scanner2", name: "اسکنر پیشرفته", desc: "برد اسکن بیشتر و نمایش دقیق‌تر مصرف", cost: 80, owned: false, icon: "🔦" },
    { id: "backpack2", name: "کوله‌پشتی یار برق", desc: "۱۰٪ سکه بیشتر از هر مأموریت", cost: 100, owned: false, icon: "🎒" },
    { id: "battery", name: "باتری ذخیره‌ساز", desc: "برق خورشیدی روز را برای شب ذخیره می‌کند", cost: 180, owned: false, icon: "🔋", requires: "solar" },
    { id: "smartswitch", name: "کلید هوشمند", desc: "وسایل پرمصرف را در ساعت اوج خودکار خاموش می‌کند", cost: 150, owned: false, icon: "🧠" },
    { id: "solar2", name: "پنل خورشیدی بزرگ‌تر", desc: "تولید برق پاک دو برابر", cost: 300, owned: false, icon: "☀️", requires: "solar" },
    { id: "cap_gold", name: "کلاه طلایی یار برق", desc: "آیتم ظاهری ویژه", cost: 60, owned: false, icon: "🧢" },
  ];
}

let toastId = 1;

export const useGame = create<GameState>((set, get) => ({
  phase: "menu",
  panel: null,
  coins: 40,
  xp: 0,
  time: 12 * 60 + 35,
  appliances: defaultAppliances(),
  missions: defaultMissions(),
  solarLevel: 0,
  upgrades: defaultUpgrades(),
  scannerUnlocked: false,
  scannerActive: false,
  scanTarget: null,
  neighborhood: 22,
  worldCoinsCollected: [],
  hasSave: !!localStorage.getItem(SAVE_KEY),
  prompt: null,
  dialog: null,
  toasts: [],
  playerPos: { x: 0, z: 0, yaw: 0 },
  inHouse: false,
  onRoof: false,
  settings: { music: true, sfx: true, sensitivity: 1, quality: "high" },
  cinematicText: "",
  lastMissionReward: null,
  weather: "clear",
  levelUpFlash: 0,

  setPhase: (phase) => set({ phase }),
  setPanel: (panel) => set({ panel }),
  setPrompt: (prompt) => {
    if (get().prompt !== prompt) set({ prompt });
  },
  setPlayerPos: (x, z, yaw) => set({ playerPos: { x, z, yaw } }),
  setInHouse: (inHouse) => set({ inHouse }),
  setOnRoof: (onRoof) => set({ onRoof }),
  tickTime: (dt) => set((s) => ({ time: (s.time + dt) % 1440 })),
  addCoins: (n, silent) => {
    set((s) => ({ coins: Math.max(0, s.coins + n) }));
    if (!silent && n > 0) get().toast(`+${toFa(n)} سکه انرژی`, "coin");
  },
  addXp: (n) => {
    const before = levelFromXp(get().xp);
    set((s) => ({ xp: s.xp + n }));
    const after = levelFromXp(get().xp);
    if (after > before) {
      set({ levelUpFlash: Date.now() });
      get().toast(`سطح ${toFa(after)} یار برق! 🎉`, "success");
    }
  },
  collectWorldCoin: (idx) => {
    if (get().worldCoinsCollected.includes(idx)) return;
    set((s) => ({ worldCoinsCollected: [...s.worldCoinsCollected, idx], coins: s.coins + 3 }));
  },
  toggleScanner: (v) => {
    if (!get().scannerUnlocked) return;
    const nv = v ?? !get().scannerActive;
    set({ scannerActive: nv });
    if (nv) get().completeObjective(1, "enter");
  },
  setScanTarget: (id) => set({ scanTarget: id }),
  openDialog: (dialog) => set({ dialog, panel: "dialog" }),
  nextDialog: () => {
    const d = get().dialog;
    if (!d) return;
    if (d.index + 1 < d.lines.length) set({ dialog: { ...d, index: d.index + 1 } });
    else {
      set({ dialog: null, panel: null });
      if (d.onEnd === "talk") {
        get().completeObjective(1, "talk");
        set({ scannerUnlocked: true });
        get().toast("اسکنر انرژی فعال شد! داخل خانه Q را بزن", "info");
      }
    }
  },
  toast: (text, kind = "info") => {
    const id = toastId++;
    set((s) => ({ toasts: [...s.toasts.slice(-4), { id, text, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200);
  },
  completeObjective: (missionId, objId) => {
    const s = get();
    const m = s.missions.find((x) => x.id === missionId);
    if (!m || m.state !== "active") return;
    const o = m.objectives.find((x) => x.id === objId);
    if (!o || o.done) return;
    const missions = s.missions.map((mm) =>
      mm.id === missionId ? { ...mm, objectives: mm.objectives.map((oo) => (oo.id === objId ? { ...oo, done: true } : oo)) } : mm,
    );
    set({ missions });
    get().addXp(40);
    // check mission completion
    const updated = missions.find((x) => x.id === missionId)!;
    if (updated.objectives.every((x) => x.done)) {
      const bonus = get().upgrades.find((u) => u.id === "backpack2")?.owned ? 1.1 : 1;
      const coins = Math.round(updated.rewardCoins * bonus);
      set((st) => ({
        missions: st.missions.map((mm) => {
          if (mm.id === missionId) return { ...mm, state: "done" as const };
          if (mm.id === missionId + 1) return { ...mm, state: "active" as const };
          return mm;
        }),
        coins: st.coins + coins,
        neighborhood: Math.min(100, st.neighborhood + 26),
        lastMissionReward: { coins, xp: updated.rewardXp, title: updated.title },
        panel: "missionComplete",
      }));
      get().addXp(updated.rewardXp);
      get().save();
      // reconcile objectives of the newly activated mission with things already owned
      setTimeout(() => {
        const s2 = get();
        if (missionId + 1 === 3) {
          if (s2.upgrades.find((u) => u.id === "battery")?.owned) s2.completeObjective(3, "battery");
          if (s2.upgrades.find((u) => u.id === "smartswitch")?.owned) s2.completeObjective(3, "smart");
        }
      }, 400);
    }
  },
  toggleAppliance: (id) => {
    const wasFixed = get().appliances.find((x) => x.id === id)?.fixed ?? false;
    set((s) => ({
      appliances: s.appliances.map((a) => {
        if (a.id !== id) return a;
        const on = !a.on;
        // switching off an appliance (except the fridge / the bulb that must be replaced) counts as a fix
        const canFixBySwitch = a.type !== "fridge" && a.id !== "bulb_living";
        const fixed = a.fixed || (canFixBySwitch && !on);
        return { ...a, on, fixed };
      }),
    }));
    const a = get().appliances.find((x) => x.id === id)!;
    if (!a.on && a.type !== "fridge" && !wasFixed) {
      get().addCoins(15);
      get().addXp(20);
    }
    checkFixAll();
  },
  replaceAppliance: (id) => {
    const s = get();
    const a = s.appliances.find((x) => x.id === id);
    if (!a || a.efficient) return false;
    if (s.coins < a.replaceCost) {
      get().toast("سکه کافی نداری! سکه‌های طلایی محله را جمع کن", "warn");
      return false;
    }
    set({
      coins: s.coins - a.replaceCost,
      appliances: s.appliances.map((x) => (x.id === id ? { ...x, efficient: true, fixed: true, on: true } : x)),
    });
    get().addCoins(a.type === "bulb" ? 40 : 60);
    get().addXp(60);
    if (id === "bulb_living") get().completeObjective(1, "bulb");
    checkFixAll();
    return true;
  },
  installSolar: () => {
    const s = get();
    if (s.solarLevel > 0) return false;
    if (s.coins < 250) {
      get().toast("برای پنل خورشیدی ۲۵۰ سکه لازم است", "warn");
      return false;
    }
    set({ coins: s.coins - 250, solarLevel: 1 });
    get().completeObjective(2, "solar");
    get().addXp(80);
    return true;
  },
  buyUpgrade: (id) => {
    const s = get();
    const u = s.upgrades.find((x) => x.id === id);
    if (!u || u.owned) return false;
    if (u.requires === "solar" && s.solarLevel === 0) {
      get().toast("اول باید پنل خورشیدی نصب کنی", "warn");
      return false;
    }
    if (s.coins < u.cost) {
      get().toast("سکه کافی نداری", "warn");
      return false;
    }
    set({ coins: s.coins - u.cost, upgrades: s.upgrades.map((x) => (x.id === id ? { ...x, owned: true } : x)) });
    if (id === "solar2") set({ solarLevel: 2 });
    if (id === "battery") get().completeObjective(3, "battery");
    if (id === "smartswitch") get().completeObjective(3, "smart");
    get().addXp(30);
    get().toast(`${u.name} خریداری شد`, "success");
    get().save();
    return true;
  },
  setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
  setCinematicText: (cinematicText) => set({ cinematicText }),
  newGame: () => {
    set({
      coins: 40,
      xp: 0,
      time: 12 * 60 + 35,
      appliances: defaultAppliances(),
      missions: defaultMissions(),
      solarLevel: 0,
      upgrades: defaultUpgrades(),
      scannerUnlocked: false,
      scannerActive: false,
      neighborhood: 22,
      worldCoinsCollected: [],
      panel: null,
      dialog: null,
      lastMissionReward: null,
      inHouse: false,
      onRoof: false,
    });
  },
  save: () => {
    const s = get();
    const data: SaveData = {
      coins: s.coins,
      xp: s.xp,
      time: s.time,
      appliances: s.appliances,
      missions: s.missions,
      solarLevel: s.solarLevel,
      upgrades: s.upgrades,
      scannerUnlocked: s.scannerUnlocked,
      neighborhood: s.neighborhood,
      worldCoinsCollected: s.worldCoinsCollected,
      hasSave: true,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    set({ hasSave: true });
  },
  load: () => {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    try {
      const d = JSON.parse(raw) as SaveData;
      set({ ...d, panel: null, dialog: null, scannerActive: false });
      return true;
    } catch {
      return false;
    }
  },
  clearMissionReward: () => set({ lastMissionReward: null, panel: null }),
  setWeather: (weather) => set({ weather }),
}));

// derived helpers -------------------------------------------------------
export function houseConsumption(s: Pick<GameState, "appliances" | "solarLevel" | "time" | "upgrades">) {
  const peak = isPeak(s.time);
  const smart = s.upgrades.find((u) => u.id === "smartswitch")?.owned;
  let watts = 0;
  for (const a of s.appliances) {
    if (!a.on) continue;
    if (smart && peak && a.type === "ac") continue;
    watts += a.efficient ? a.efficientWatts : a.watts;
  }
  const battery = s.upgrades.find((u) => u.id === "battery")?.owned;
  const solarW = s.solarLevel * 700 * Math.max(battery ? 0.45 : 0, sunFactor(s.time));
  const net = Math.max(0, watts - solarW);
  const mult = peak ? 1.35 : 1;
  const score = Math.min(1, (net * mult) / 2600); // 0 good .. 1 bad
  return { watts, solarW: Math.round(solarW), net: Math.round(net), score, peak };
}

export function meterColor(score: number) {
  if (score < 0.3) return "#38d452";
  if (score < 0.55) return "#ffd12e";
  if (score < 0.75) return "#ff8a1f";
  return "#ff3b3b";
}

export function checkFixAll() {
  const s = useGame.getState();
  const others = s.appliances.filter((a) => a.id !== "bulb_living");
  const fixAllDoneBefore = s.missions[0].objectives.find((o) => o.id === "fixall")?.done;
  if (others.every((a) => a.fixed)) s.completeObjective(1, "fixall");
  const st = useGame.getState();
  const c = houseConsumption(st);
  const fixAllDone = st.missions[0].objectives.find((o) => o.id === "fixall")?.done;
  if (c.score < 0.3 && fixAllDone) st.completeObjective(1, "green");
  else if (fixAllDone && !fixAllDoneBefore && st.missions[0].state === "active") st.toast("عالی! حالا برای سبز شدن نوار، در ساعت اوج کولر را خاموش کن", "info");
}
