import { useEffect, useRef, useState } from "react";
import { Engine } from "./game/Engine";
import { useGame } from "./game/store";
import HUD from "./components/HUD";
import { CinematicOverlay, HelpPanel, InventoryPanel, MainMenu, MapPanel, MissionsPanel, PauseMenu, SettingsPanel, StatsPanel, WorldsPanel } from "./components/Menus";
import { CryptoPanel, DialogBox, MissionComplete, ScannerPanel, SolarPanelUI } from "./components/Panels";
import { AdminGate, DashboardPanel, LeaderboardPanel, ProfileGate } from "./components/Panels2";
import { audio } from "./game/audio";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [loading, setLoading] = useState(true);
  const phase = useGame((s) => s.phase);
  const panel = useGame((s) => s.panel);
  const cinematicText = useGame((s) => s.cinematicText);
  const setPhase = useGame((s) => s.setPhase);
  const newGame = useGame((s) => s.newGame);
  const load = useGame((s) => s.load);
  const settings = useGame((s) => s.settings);
  const levelUpFlash = useGame((s) => s.levelUpFlash);
  const registered = useGame((s) => s.registered);
  const isNightLocked = useGame((s) => s.isNightLocked);
  const toggleDayNight = useGame((s) => s.toggleDayNight);

  useEffect(() => {
    if (!canvasRef.current) return;
    // small delay so the loading screen paints before heavy world build
    const t = setTimeout(() => {
      const e = new Engine(canvasRef.current!);
      engineRef.current = e;
      setEngine(e);
      setLoading(false);
    }, 60);
    return () => {
      clearTimeout(t);
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    audio.setEnabled(settings.music, settings.sfx);
  }, [settings.music, settings.sfx]);

  const startNew = () => {
    newGame();
    engineRef.current?.resetPads();
    engineRef.current?.travelWorld(1);
    setPhase("cinematic");
    engineRef.current?.startCinematic(() => {
      useGame.getState().setPhase("playing");
      useGame.getState().toast("به بوشهر خوش آمدی! با WASD حرکت کن و با خانم فاطمه صحبت کن", "info");
    });
  };
  const continueGame = () => {
    const ok = load();
    setPhase("playing");
    const eng = engineRef.current;
    if (eng) {
      eng.resetPads();
      if (ok) for (const id of useGame.getState().worldPads) eng.zones.setPad(id, true);
      const w = useGame.getState().activeWorld;
      eng.startPlay();
      if (w !== 1) eng.travelWorld(w);
    }
  };
  const toMenu = () => {
    setPhase("menu");
    if (engineRef.current) engineRef.current.mode = "idle";
  };

  return (
    <div className="relative w-full h-full bg-[#0b1a33] overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1f8fe8] to-[#0b3d7a] text-white" dir="rtl">
          <div className="ss-title text-5xl">بهینه‌ساز برق</div>
          <div className="mt-3 font-bold">در حال ساختن بوشهر... ⚡</div>
          <div className="mt-4 w-64 h-3 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-300 animate-pulse w-2/3" />
          </div>
        </div>
      )}

      {!loading && phase === "menu" && !panel && <MainMenu onNew={startNew} onContinue={continueGame} />}
      {!loading && phase === "menu" && panel && <div className="absolute inset-0 bg-black/30" />}
      {phase === "cinematic" && <CinematicOverlay text={cinematicText} onSkip={() => engineRef.current?.skipCinematic()} />}
      {(phase === "playing" || phase === "paused") && <HUD engine={engine} />}
      {phase === "paused" && <PauseMenu onMenu={toMenu} />}

      {panel === "scanner" && <ScannerPanel />}
      {panel === "dialog" && <DialogBox />}
      {panel === "solar" && <SolarPanelUI />}
      {panel === "crypto" && <CryptoPanel />}
      {panel === "leaderboard" && <LeaderboardPanel />}
      {panel === "admin" && <AdminGate />}
      {panel === "dashboard" && <DashboardPanel />}

      {/* ثبت‌نام / ویرایش نام قهرمان */}
      {(phase === "menu" || phase === "playing") && !registered && panel === null && <ProfileGate />}
      {panel === "profile" && <ProfileGate embedded />}

      {/* دکمه سریع روز/شب */}
      {!loading && panel === null && (
        <button
          onClick={toggleDayNight}
          title="تغییر روز و شب"
          className="fixed top-[78px] left-3 z-40 w-11 h-11 rounded-full shadow-lg border-2 border-white/70 text-xl flex items-center justify-center transition hover:scale-110"
          style={{ background: isNightLocked ? "#16315c" : "#7ec8ff" }}
        >
          {isNightLocked ? "🌙" : "☀️"}
        </button>
      )}
      {panel === "missionComplete" && <MissionComplete />}
      {panel === "map" && <MapPanel />}
      {panel === "worlds" && <WorldsPanel engine={engine} />}
      {panel === "missions" && <MissionsPanel />}
      {panel === "inventory" && <InventoryPanel />}
      {panel === "stats" && <StatsPanel />}
      {panel === "settings" && <SettingsPanel />}
      {panel === "help" && <HelpPanel />}

      {levelUpFlash > 0 && Date.now() - levelUpFlash < 2500 && (
        <div key={levelUpFlash} className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="ss-title text-5xl pop-in">ارتقای سطح! ⚡</div>
        </div>
      )}
    </div>
  );
}
