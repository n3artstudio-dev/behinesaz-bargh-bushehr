import { useEffect, useState } from "react";
import { houseConsumption, isPeak, toFa, useGame, type Appliance } from "../game/store";
import { audio } from "../game/audio";

const typeIcon: Record<Appliance["type"], string> = { bulb: "💡", fridge: "🧊", ac: "❄️", tv: "📺", light: "🔆" };

export function ScannerPanel() {
  const id = useGame((s) => s.scanTarget);
  const appliances = useGame((s) => s.appliances);
  const coins = useGame((s) => s.coins);
  const time = useGame((s) => s.time);
  const solarLevel = useGame((s) => s.solarLevel);
  const upgrades = useGame((s) => s.upgrades);
  const setPanel = useGame((s) => s.setPanel);
  const toggle = useGame((s) => s.toggleAppliance);
  const replace = useGame((s) => s.replaceAppliance);
  const a = appliances.find((x) => x.id === id);
  const [stage, setStage] = useState<"scan" | "choose" | "installing" | "done">("scan");
  const [progress, setProgress] = useState(0);
  const [beforeW, setBeforeW] = useState(0);
  useEffect(() => {
    setStage("scan");
    setProgress(0);
    const t = setInterval(() => setProgress((p) => Math.min(100, p + 7)), 45);
    return () => clearInterval(t);
  }, [id]);
  if (!a) return null;
  const peak = isPeak(time);
  const cons = houseConsumption({ appliances, solarLevel, time, upgrades });
  const curW = a.on ? (a.efficient ? a.efficientWatts : a.watts) : 0;
  const level = !a.on ? "خاموش" : a.efficient ? "کم" : a.watts > 500 ? "خیلی زیاد" : a.watts > 100 ? "زیاد" : "متوسط";
  const eff = a.efficient ? "بالا (A++)" : a.type === "bulb" ? "خیلی پایین" : a.type === "fridge" ? "پایین (D)" : a.type === "ac" ? "پایین (غیر اینورتر)" : "—";
  const scanning = progress < 100;

  const doInstall = () => {
    setBeforeW(cons.net);
    const ok = replace(a.id);
    if (!ok) return;
    audio.zap();
    setStage("installing");
    setTimeout(() => {
      setStage("done");
      audio.success();
    }, 1400);
  };
  const doSwitch = () => {
    setBeforeW(cons.net);
    toggle(a.id);
    audio.switchClick();
    if (a.on) {
      setStage("done");
      setTimeout(() => audio.success(), 200);
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto" dir="rtl">
      <div className="ss-panel w-[min(94vw,560px)] p-5 pop-in relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-cyan-300/30 blur-2xl" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-cyan-300 to-blue-600 flex items-center justify-center text-3xl shadow-lg border-2 border-white">{typeIcon[a.type]}</div>
            <div>
              <div className="text-xs text-blue-700 font-bold">اسکنر انرژی یار برق</div>
              <div className="text-xl font-black">{a.name}</div>
            </div>
          </div>
          <button className="ss-btn gray !px-3 !py-1.5 text-sm" onClick={() => { setPanel(null); audio.close(); }}>
            بستن ✕
          </button>
        </div>

        {stage === "scan" && (
          <>
            <div className="mt-4 h-3 rounded-full bg-blue-100 overflow-hidden border border-blue-300">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className={`grid grid-cols-2 gap-3 mt-4 transition-opacity ${scanning ? "opacity-30" : "opacity-100"}`}>
              <Stat label="مصرف برق" value={`${level} — ${toFa(curW)} وات`} color={curW > 500 ? "#ff3b3b" : curW > 80 ? "#ff8a1f" : "#2fb43a"} />
              <Stat label="بازدهی" value={eff} color={a.efficient ? "#2fb43a" : "#ff3b3b"} />
              <Stat label="مشکل" value={a.fixed ? "برطرف شده ✅" : a.problem} color={a.fixed ? "#2fb43a" : "#c0392b"} wide />
              <Stat label="راه‌حل پیشنهادی" value={a.solution} color="#1d4f9a" wide />
              {peak && !a.fixed && a.type === "ac" && <div className="col-span-2 bg-red-100 border-2 border-red-300 rounded-xl p-2 text-sm text-red-800 font-bold">⚠ الان ساعت اوج مصرف است! کولر پرمصرف در این ساعت فشار زیادی به شبکه می‌آورد.</div>}
            </div>
            {!scanning && (
              <div className="flex gap-3 mt-5 justify-center flex-wrap">
                {a.fixKind === "replace" && !a.efficient && (
                  <button className="ss-btn green" onClick={() => { setStage("choose"); audio.open(); }}>
                    🔧 باز کردن رابط تعویض
                  </button>
                )}
                {a.on && a.type !== "fridge" && (
                  <button className={`ss-btn ${a.fixKind === "switchOff" ? "" : "blue"}`} onClick={doSwitch}>
                    🔌 خاموش کردن{a.type === "ac" && peak ? " (ساعت اوج)" : ""}
                  </button>
                )}
                {!a.on && (
                  <button className="ss-btn gray" onClick={doSwitch}>
                    روشن کردن
                  </button>
                )}
                {a.type === "fridge" && <div className="w-full text-xs text-center opacity-70">یخچال را نمی‌توان خاموش کرد؛ راه‌حل، تعویض با مدل کم‌مصرف است.</div>}
              </div>
            )}
          </>
        )}

        {stage === "choose" && (
          <div className="mt-4">
            <div className="font-bold text-center mb-3">کدام را انتخاب می‌کنی؟</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border-4 border-red-300 bg-red-50 p-3 text-center opacity-80">
                <div className="text-4xl">{typeIcon[a.type]}</div>
                <div className="font-black mt-1">{a.name}</div>
                <div className="text-sm text-red-700 font-bold persian-num">{toFa(a.watts)} وات</div>
                <div className="text-xs mt-1 bg-red-500 text-white rounded-full inline-block px-2">برچسب انرژی {a.type === "bulb" ? "E" : "D"}</div>
                <div className="text-xs mt-2 text-red-800">قبض بالا، گرما و اتلاف انرژی</div>
              </div>
              <div className="rounded-2xl border-4 border-green-400 bg-green-50 p-3 text-center shadow-lg scale-[1.03]">
                <div className="text-4xl">{a.type === "bulb" ? "💡" : a.type === "fridge" ? "🧊" : "❄️"}</div>
                <div className="font-black mt-1">{a.replaceName}</div>
                <div className="text-sm text-green-700 font-bold persian-num">{toFa(a.efficientWatts)} وات</div>
                <div className="text-xs mt-1 bg-green-500 text-white rounded-full inline-block px-2">برچسب انرژی A++</div>
                <div className="text-xs mt-2 text-green-800 persian-num">صرفه‌جویی {toFa(Math.round((1 - a.efficientWatts / a.watts) * 100))}٪</div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="ss-chip !text-blue-900 !bg-yellow-200 !border-yellow-500">
                قیمت: <b className="persian-num">{toFa(a.replaceCost)}</b> <span className="coin" />
                <span className="text-xs opacity-70 persian-num">(داری: {toFa(coins)})</span>
              </div>
              <div className="flex gap-2">
                <button className="ss-btn gray !py-2 text-sm" onClick={() => setStage("scan")}>
                  بازگشت
                </button>
                <button className="ss-btn green !py-2" disabled={coins < a.replaceCost} onClick={doInstall}>
                  خرید و نصب ⚡
                </button>
              </div>
            </div>
            {coins < a.replaceCost && <div className="text-xs text-red-700 text-center mt-2">سکه کافی نداری — سکه‌های طلایی خیابان و اسکله را جمع کن!</div>}
          </div>
        )}

        {stage === "installing" && (
          <div className="py-10 text-center">
            <div className="text-6xl floaty">🔧</div>
            <div className="font-black text-lg mt-3">محمد پارسا در حال نصب {a.replaceName}...</div>
            <div className="mt-3 h-3 rounded-full bg-blue-100 overflow-hidden mx-10">
              <div className="h-full bg-gradient-to-r from-yellow-300 to-green-500 animate-pulse" style={{ width: "100%" }} />
            </div>
          </div>
        )}

        {stage === "done" && <DoneView before={beforeW} a={a} onClose={() => { setPanel(null); audio.close(); }} />}
      </div>
    </div>
  );
}

function DoneView({ before, a, onClose }: { before: number; a: Appliance; onClose: () => void }) {
  const appliances = useGame((s) => s.appliances);
  const time = useGame((s) => s.time);
  const solarLevel = useGame((s) => s.solarLevel);
  const upgrades = useGame((s) => s.upgrades);
  const after = houseConsumption({ appliances, solarLevel, time, upgrades }).net;
  const saved = Math.max(0, before - after);
  return (
    <div className="py-4 text-center pop-in">
      <div className="text-5xl">✅</div>
      <div className="font-black text-xl mt-2">{a.fixKind === "replace" ? `${a.replaceName} نصب شد!` : `${a.name} خاموش شد!`}</div>
      <div className="grid grid-cols-3 gap-2 mt-4 items-center">
        <div className="bg-red-50 rounded-xl p-2 border-2 border-red-200">
          <div className="text-xs">قبل</div>
          <div className="font-black text-red-600 persian-num text-lg">{toFa(before)} W</div>
        </div>
        <div className="text-2xl">←</div>
        <div className="bg-green-50 rounded-xl p-2 border-2 border-green-300">
          <div className="text-xs">بعد</div>
          <div className="font-black text-green-600 persian-num text-lg">{toFa(after)} W</div>
        </div>
      </div>
      <div className="mt-3 text-sm font-bold text-blue-900 persian-num">کنتور برق خانه {toFa(saved)} وات کمتر شد 📉 — به نوار انرژی بالای صفحه نگاه کن!</div>
      <button className="ss-btn mt-4" onClick={onClose}>
        ادامه
      </button>
    </div>
  );
}

function Stat({ label, value, color, wide }: { label: string; value: string; color: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl bg-white/70 border-2 border-blue-100 p-2.5 ${wide ? "col-span-2" : ""}`}>
      <div className="text-[11px] text-blue-700 font-bold">{label}</div>
      <div className="font-black text-sm mt-0.5" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

export function DialogBox() {
  const d = useGame((s) => s.dialog);
  const next = useGame((s) => s.nextDialog);
  if (!d) return null;
  return (
    <div className="absolute inset-x-0 bottom-10 flex justify-center pointer-events-auto" dir="rtl">
      <div className="ss-panel w-[min(94vw,720px)] p-4 pop-in cursor-pointer" onClick={() => { next(); audio.click(); }}>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-pink-300 to-purple-500 border-2 border-white shadow flex items-center justify-center text-3xl">{/خانم|زهرا/.test(d.speaker) ? "🧕" : /علی/.test(d.speaker) ? "👦" : "🧔"}</div>
          <div className="flex-1">
            <div className="text-xs text-purple-700 font-black">{d.speaker}</div>
            <div className="text-lg font-bold mt-1 leading-relaxed">{d.lines[d.index]}</div>
          </div>
        </div>
        <div className="text-left text-xs opacity-60 mt-2 persian-num">
          {toFa(d.index + 1)}/{toFa(d.lines.length)} — برای ادامه کلیک کن یا E بزن ▸
        </div>
      </div>
    </div>
  );
}

export function SolarPanelUI() {
  const coins = useGame((s) => s.coins);
  const solarLevel = useGame((s) => s.solarLevel);
  const time = useGame((s) => s.time);
  const appliances = useGame((s) => s.appliances);
  const upgrades = useGame((s) => s.upgrades);
  const install = useGame((s) => s.installSolar);
  const buy = useGame((s) => s.buyUpgrade);
  const setPanel = useGame((s) => s.setPanel);
  const [installing, setInstalling] = useState(false);
  const missions = useGame((s) => s.missions);
  const solarLocked = missions[1].state === "locked";
  const cons = houseConsumption({ appliances, solarLevel, time, upgrades });
  const sunPct = Math.round(Math.max(0, Math.sin(((time / 60 - 6) / 12) * Math.PI)) * 100);
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto" dir="rtl">
      <div className="ss-panel w-[min(94vw,540px)] p-5 pop-in">
        <div className="flex items-center justify-between">
          <div className="text-xl font-black flex items-center gap-2">
            <span className="text-3xl">☀️</span> پشت‌بام خانه — انرژی خورشیدی
          </div>
          <button className="ss-btn gray !px-3 !py-1.5 text-sm" onClick={() => { setPanel(null); audio.close(); }}>
            ✕
          </button>
        </div>
        <div className="mt-3 text-sm bg-blue-50 rounded-xl p-3 border-2 border-blue-100">
          بوشهر یکی از آفتابی‌ترین شهرهای ایران است. پنل خورشیدی نور خورشید را مستقیم به برق تبدیل می‌کند؛ بدون دود و بدون هزینه سوخت.
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs">شدت آفتاب الان:</span>
            <div className="flex-1 h-2 bg-white rounded-full overflow-hidden border">
              <div className="h-full bg-gradient-to-r from-yellow-300 to-orange-400" style={{ width: `${sunPct}%` }} />
            </div>
            <span className="text-xs persian-num">{toFa(sunPct)}٪</span>
          </div>
        </div>
        {installing ? (
          <div className="py-8 text-center">
            <div className="text-6xl floaty">🔩</div>
            <div className="font-black mt-2">نصب پنل‌ها روی پشت‌بام...</div>
          </div>
        ) : solarLocked ? (
          <div className="py-6 text-center">
            <div className="text-5xl">🔒</div>
            <div className="font-black mt-2">اول مأموریت ۱ را کامل کن</div>
            <div className="text-xs opacity-70 mt-1">وقتی مصرف خانه بهینه شد، نوبت تولید برق پاک می‌رسد.</div>
          </div>
        ) : solarLevel === 0 ? (
          <div className="mt-4 text-center">
            <div className="rounded-2xl border-4 border-yellow-300 bg-yellow-50 p-4">
              <div className="text-5xl">🔆</div>
              <div className="font-black text-lg">سیستم خورشیدی ۷۰۰ وات (۳ پنل)</div>
              <div className="text-sm mt-1">تولید برق پاک در روز و کاهش مصرف از شبکه</div>
              <div className="ss-chip !text-blue-900 !bg-yellow-200 !border-yellow-500 mt-2">
                قیمت <b className="persian-num">۲۵۰</b> <span className="coin" /> <span className="text-xs opacity-70 persian-num">(داری: {toFa(coins)})</span>
              </div>
            </div>
            <button
              className="ss-btn green mt-4"
              disabled={coins < 250}
              onClick={() => {
                setInstalling(true);
                setTimeout(() => {
                  install();
                  setInstalling(false);
                }, 1500);
              }}
            >
              خرید و نصب پنل خورشیدی ☀️
            </button>
            {coins < 250 && <div className="text-xs text-red-700 mt-2">سکه کم داری — سکه‌های روی پشت‌بام و میدان را جمع کن یا مشکلات بیشتری حل کن.</div>}
          </div>
        ) : (
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-2">
                <div className="text-xs">تولید خورشیدی</div>
                <div className="font-black text-yellow-700 persian-num text-lg">{toFa(cons.solarW)} W</div>
              </div>
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-2">
                <div className="text-xs">مصرف خانه</div>
                <div className="font-black text-red-600 persian-num text-lg">{toFa(cons.watts)} W</div>
              </div>
              <div className="bg-green-50 border-2 border-green-300 rounded-xl p-2">
                <div className="text-xs">خرید از شبکه</div>
                <div className="font-black text-green-700 persian-num text-lg">{toFa(cons.net)} W</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {upgrades
                .filter((u) => ["battery", "solar2", "smartswitch"].includes(u.id))
                .map((u) => (
                  <div key={u.id} className={`rounded-xl border-2 p-2 text-sm ${u.owned ? "bg-green-50 border-green-300" : "bg-white border-blue-100"}`}>
                    <div className="font-black">
                      {u.icon} {u.name}
                    </div>
                    <div className="text-xs opacity-80">{u.desc}</div>
                    {u.owned ? (
                      <div className="text-xs text-green-700 font-bold mt-1">نصب شده ✅</div>
                    ) : (
                      <button className="ss-btn blue !py-1 !px-3 text-xs mt-1" onClick={() => buy(u.id)}>
                        خرید {toFa(u.cost)} <span className="coin" style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MissionComplete() {
  const r = useGame((s) => s.lastMissionReward);
  const clear = useGame((s) => s.clearMissionReward);
  const missions = useGame((s) => s.missions);
  const neighborhood = useGame((s) => s.neighborhood);
  if (!r) return null;
  const next = missions.find((m) => m.state === "active");
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-gradient-to-b from-black/10 to-black/40" dir="rtl">
      <div className="ss-panel w-[min(94vw,520px)] p-6 text-center pop-in relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: "conic-gradient(from 0deg, #ffd23a, #fff, #ffd23a, #fff, #ffd23a)", animation: "spin 8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div className="relative">
          <div className="text-6xl">🏆</div>
          <div className="ss-title text-3xl mt-1">مأموریت کامل شد!</div>
          <div className="font-bold mt-2 text-blue-900">{r.title}</div>
          <div className="flex justify-center gap-3 mt-4">
            <div className="ss-chip !bg-yellow-300 !text-yellow-900 !border-yellow-600 text-lg">
              +{toFa(r.coins)} <span className="coin" />
            </div>
            <div className="ss-chip !bg-sky-400 !border-sky-700 text-lg">+{toFa(r.xp)} امتیاز</div>
          </div>
          <div className="mt-4 text-sm bg-green-50 border-2 border-green-200 rounded-xl p-3">
            پیشرفت محله به <b className="persian-num">{toFa(Math.round(neighborhood))}٪</b> رسید 🌿 — چراغ‌های خیابان به LED تبدیل شدند و همسایه‌ها خوشحال‌ترند!
          </div>
          {next && (
            <div className="mt-3 text-sm">
              مأموریت بعدی: <b>{next.title}</b>
              <div className="text-xs opacity-80">{next.desc}</div>
            </div>
          )}
          <button className="ss-btn mt-5" onClick={() => { clear(); audio.click(); }}>
            ادامه بازی ▶
          </button>
        </div>
      </div>
    </div>
  );
}
