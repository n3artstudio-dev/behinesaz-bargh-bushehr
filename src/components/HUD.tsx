import { useEffect, useRef, useState } from "react";
import { formatTime, houseConsumption, isPeak, levelFromXp, meterColor, toFa, useGame, xpProgress } from "../game/store";
import MapView from "./MapView";
import type { Engine } from "../game/Engine";
import { audio } from "../game/audio";
import { PAD_DEFS, WORLD_INFO } from "../game/worlds";
import { worldPadProgress } from "../game/store";

export default function HUD({ engine }: { engine: Engine | null }) {
  const coins = useGame((s) => s.coins);
  const xp = useGame((s) => s.xp);
  const time = useGame((s) => s.time);
  const appliances = useGame((s) => s.appliances);
  const solarLevel = useGame((s) => s.solarLevel);
  const upgrades = useGame((s) => s.upgrades);
  const missions = useGame((s) => s.missions);
  const prompt = useGame((s) => s.prompt);
  const toasts = useGame((s) => s.toasts);
  const scannerActive = useGame((s) => s.scannerActive);
  const scannerUnlocked = useGame((s) => s.scannerUnlocked);
  const inHouse = useGame((s) => s.inHouse);
  const setPanel = useGame((s) => s.setPanel);
  const setPhase = useGame((s) => s.setPhase);
  const neighborhood = useGame((s) => s.neighborhood);
  const cons = houseConsumption({ appliances, solarLevel, time, upgrades });
  const peak = isPeak(time);
  const color = meterColor(cons.score);
  const pct = Math.round((1 - cons.score) * 100);
  const active = missions.find((m) => m.state === "active");
  const nextObj = active?.objectives.find((o) => !o.done);
  const activeWorld = useGame((s) => s.activeWorld);
  const worldPads = useGame((s) => s.worldPads);
  const wProg = activeWorld > 1 ? worldPadProgress(worldPads, activeWorld) : null;
  const nextPad = activeWorld > 1 ? PAD_DEFS.filter((p) => p.world === activeWorld).find((p) => !worldPads.includes(p.id)) : null;
  const lv = levelFromXp(xp);
  const xpP = xpProgress(xp);
  const [coinPop, setCoinPop] = useState(false);
  const prevCoins = useRef(coins);
  useEffect(() => {
    if (coins > prevCoins.current) {
      setCoinPop(true);
      const t = setTimeout(() => setCoinPop(false), 350);
      prevCoins.current = coins;
      return () => clearTimeout(t);
    }
    prevCoins.current = coins;
  }, [coins]);
  const isTouch = typeof window !== "undefined" && matchMedia("(pointer: coarse)").matches;

  return (
    <div className="absolute inset-0 pointer-events-none select-none" dir="rtl">
      {/* Top bar */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-3">
        {/* Right (RTL first): energy meter */}
        <div className="ss-dark px-4 py-2 min-w-[300px] max-w-[380px] flex-1">
          <div className="flex items-center justify-between text-sm font-bold">
            <span className="flex items-center gap-2">
              <span className="text-yellow-300 text-lg">⚡</span> نوار انرژی خانه
            </span>
            <span style={{ color }} className="persian-num">
              {toFa(pct)}٪
            </span>
          </div>
          <div className="mt-1 h-4 rounded-full bg-black/40 border-2 border-white/30 overflow-hidden relative">
            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg,#ff3b3b 0%,#ff8a1f 30%,#ffd12e 55%,#38d452 100%)" }} />
            <div className="absolute top-0 bottom-0 right-0 bg-[#0b1a33]/85 transition-all duration-500" style={{ width: `${100 - pct}%` }} />
            <div className="absolute -top-0.5 bottom-0 w-1 bg-white shadow transition-all duration-500" style={{ left: `calc(${pct}% - 2px)` }} />
          </div>
          <div className="flex items-center justify-between text-[11px] mt-1 opacity-90">
            <span className="persian-num">
              مصرف: {toFa(cons.net)} وات {cons.solarW > 0 && <span className="text-green-300">(☀️ −{toFa(cons.solarW)})</span>}
            </span>
            <span style={{ color }}>{cons.score < 0.3 ? "عالی — بهینه" : cons.score < 0.55 ? "هشدار — مصرف رو به افزایش" : cons.score < 0.75 ? "زیاد!" : "مصرف بیش از حد!"}</span>
          </div>
        </div>

        {/* Center: clock */}
        <div className={`ss-dark px-4 py-2 text-center ${peak ? "border-red-400" : ""}`}>
          <div className="text-2xl font-black persian-num leading-none">{formatTime(time)}</div>
          <div className={`text-[11px] font-bold mt-1 px-2 rounded-full ${peak ? "bg-red-500 text-white animate-pulse" : "bg-green-500/80 text-white"}`}>{peak ? "⚠ ساعت اوج مصرف ۱۳–۱۸" : "خارج از اوج مصرف"}</div>
        </div>

        {/* Left: coins + level */}
        <div className="flex flex-col items-end gap-2">
          <div className={`ss-chip text-lg ${coinPop ? "scale-110" : ""} transition-transform`}>
            <span className="persian-num text-yellow-300 font-black">{toFa(coins)}</span>
            <span className="coin" />
          </div>
          <div className="ss-chip text-xs">
            <span>سطح {toFa(lv)} یار برق</span>
            <span className="w-16 h-2 rounded-full bg-black/40 overflow-hidden">
              <span className="block h-full bg-gradient-to-r from-cyan-300 to-blue-500" style={{ width: `${xpP.pct * 100}%` }} />
            </span>
          </div>
          <div className="ss-chip text-xs">
            <span>محله</span>
            <span className="w-16 h-2 rounded-full bg-black/40 overflow-hidden">
              <span className="block h-full bg-gradient-to-r from-lime-300 to-green-500" style={{ width: `${neighborhood}%` }} />
            </span>
            <span className="persian-num">{toFa(Math.round(neighborhood))}٪</span>
          </div>
        </div>
      </div>

      {/* Mission objective */}
      {activeWorld === 1 && active && (
        <div className="absolute top-[118px] right-3 ss-dark px-4 py-2 max-w-[340px] fade-in">
          <div className="text-[11px] opacity-80">مأموریت {toFa(active.id)}: {active.title}</div>
          <div className="font-bold text-sm mt-0.5 flex items-start gap-2">
            <span className="text-yellow-300">◆</span>
            <span>{nextObj?.text}</span>
          </div>
          <div className="flex gap-1 mt-1.5">
            {active.objectives.map((o) => (
              <span key={o.id} className={`h-1.5 flex-1 rounded-full ${o.done ? "bg-green-400" : "bg-white/25"}`} />
            ))}
          </div>
        </div>
      )}
      {activeWorld > 1 && nextPad && (
        <div className="absolute top-[118px] right-3 ss-dark px-4 py-2 max-w-[340px] fade-in" style={{ borderColor: WORLD_INFO[activeWorld - 1].color }}>
          <div className="text-[11px] opacity-80">
            {WORLD_INFO[activeWorld - 1].icon} جهان {toFa(activeWorld)}: {WORLD_INFO[activeWorld - 1].name}
          </div>
          <div className="font-bold text-sm mt-0.5 flex items-start gap-2">
            <span style={{ color: WORLD_INFO[activeWorld - 1].color }}>◆</span>
            <span>{nextPad.label}</span>
          </div>
          <div className="flex gap-1 mt-1.5">
            {Array.from({ length: wProg!.total }).map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < wProg!.done ? "bg-green-400" : "bg-white/25"}`} />
            ))}
          </div>
        </div>
      )}

      {/* Scanner status */}
      {scannerUnlocked && (
        <div className={`absolute top-[118px] left-3 ss-chip text-xs ${scannerActive ? "border-cyan-300 text-cyan-200 pulse" : ""}`}>
          <span>🔦</span>
          <span>{scannerActive ? "اسکنر انرژی فعال" : "اسکنر خاموش (Q)"}</span>
        </div>
      )}
      {scannerActive && inHouse && (
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 120px rgba(60,232,255,0.35)", border: "3px solid rgba(60,232,255,0.5)" }}>
          <div className="absolute left-0 right-0 h-[2px] bg-cyan-300/70" style={{ animation: "scanline 2.2s linear infinite" }} />
          <style>{`@keyframes scanline{0%{top:0}100%{top:100%}}`}</style>
        </div>
      )}

      {/* Mini-map */}
      <div className="absolute bottom-3 left-3 ss-dark p-1.5 pointer-events-auto cursor-pointer" onClick={() => { setPanel("map"); audio.open(); }}>
        <div className="rounded-xl overflow-hidden" style={{ width: 150, height: 150 }}>
          <div style={{ transform: "translateY(-45px)" }}>
            <MapView size={150} region={activeWorld} />
          </div>
        </div>
        <div className="text-[10px] text-center mt-1 opacity-80">{WORLD_INFO[activeWorld - 1].name.split("—")[0]} — نقشه (M)</div>
      </div>

      {/* Bottom-right menu buttons */}
      <div className="absolute bottom-3 right-3 flex gap-2 pointer-events-auto">
        {[
          ["worlds", "🌍", "جهان‌ها"],
          ["missions", "⭐", "مأموریت‌ها"],
          ["inventory", "🎒", "فروشگاه"],
          ["stats", "📊", "آمار انرژی"],
          ["help", "❔", "راهنما"],
        ].map(([p, ic, l]) => (
          <button key={p} className="ss-dark px-3 py-2 text-xs font-bold hover:brightness-125 flex flex-col items-center gap-0.5 min-w-[62px]" onClick={() => { setPanel(p as never); audio.open(); }}>
            <span className="text-lg">{ic}</span>
            {l}
          </button>
        ))}
        <button className="ss-dark px-3 py-2 text-xs font-bold hover:brightness-125 flex flex-col items-center gap-0.5 min-w-[62px]" onClick={() => { setPhase("paused"); audio.click(); document.exitPointerLock?.(); }}>
          <span className="text-lg">⏸</span>
          توقف
        </button>
      </div>

      {/* Interaction prompt */}
      {prompt && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[26%] pop-in">
          <div className="ss-panel px-5 py-2.5 flex items-center gap-3 text-base font-black">
            <span className="w-9 h-9 rounded-lg bg-gradient-to-b from-yellow-300 to-orange-400 text-white flex items-center justify-center shadow border-2 border-white text-lg">E</span>
            <span>{prompt}</span>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="absolute top-[200px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`pop-in px-4 py-2 rounded-2xl font-bold text-sm border-2 shadow-lg ${t.kind === "coin" ? "bg-yellow-300 text-yellow-900 border-white" : t.kind === "success" ? "bg-green-400 text-green-950 border-white" : t.kind === "warn" ? "bg-red-500 text-white border-white" : "bg-sky-500 text-white border-white"}`}>
            {t.text}
          </div>
        ))}
      </div>

      {/* Controls hint */}
      {!isTouch && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 ss-chip text-[11px] opacity-80 gap-3">
          <span>WASD حرکت</span>
          <span>Shift دویدن</span>
          <span>Space پرش</span>
          <span>E تعامل</span>
          <span>Q اسکنر</span>
          <span>موس دوربین</span>
        </div>
      )}

      {isTouch && engine && <TouchControls engine={engine} />}
    </div>
  );
}

function TouchControls({ engine }: { engine: Engine }) {
  const padRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const origin = useRef<{ x: number; y: number } | null>(null);
  const lookId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });
  return (
    <>
      <div
        ref={padRef}
        className="absolute bottom-24 right-6 w-36 h-36 rounded-full bg-white/15 border-2 border-white/40 pointer-events-auto touch-none"
        onPointerDown={(e) => {
          origin.current = { x: e.clientX, y: e.clientY };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!origin.current) return;
          let dx = e.clientX - origin.current.x,
            dy = e.clientY - origin.current.y;
          const l = Math.hypot(dx, dy);
          if (l > 50) {
            dx = (dx / l) * 50;
            dy = (dy / l) * 50;
          }
          setKnob({ x: dx, y: dy });
          engine.setTouch(dx / 50, -dy / 50, l > 42);
        }}
        onPointerUp={() => {
          origin.current = null;
          setKnob({ x: 0, y: 0 });
          engine.setTouch(0, 0, false);
        }}
      >
        <div className="absolute w-14 h-14 rounded-full bg-white/70 border-2 border-white left-1/2 top-1/2" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
      </div>
      <div
        className="absolute left-0 top-0 bottom-0 w-1/2 pointer-events-auto touch-none"
        onPointerDown={(e) => {
          lookId.current = e.pointerId;
          lookLast.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (lookId.current !== e.pointerId) return;
          engine.rotateCamera(e.clientX - lookLast.current.x, e.clientY - lookLast.current.y);
          lookLast.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => (lookId.current = null)}
      />
      <div className="absolute bottom-24 left-6 flex flex-col gap-3 pointer-events-auto">
        <button className="ss-btn blue !px-5 !py-4" onPointerDown={() => engine.touchInteract()}>
          E
        </button>
        <button className="ss-btn !px-5 !py-4" onPointerDown={() => engine.touchJump()}>
          پرش
        </button>
        <button className="ss-btn pink !px-4 !py-3 text-sm" onPointerDown={() => { const s = useGame.getState(); if (s.scannerUnlocked) s.toggleScanner(); }}>
          اسکنر
        </button>
      </div>
    </>
  );
}
