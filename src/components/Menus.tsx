import { houseConsumption, isPeak, levelFromXp, toFa, useGame, xpProgress } from "../game/store";
import MapView from "./MapView";
import { audio } from "../game/audio";

export function MainMenu({ onNew, onContinue }: { onNew: () => void; onContinue: () => void }) {
  const hasSave = useGame((s) => s.hasSave);
  const setPanel = useGame((s) => s.setPanel);
  return (
    <div className="absolute inset-0 pointer-events-auto flex flex-col items-center justify-between py-8 fade-in" dir="rtl" style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(0,0,0,0) 30%, rgba(5,20,50,0.55) 100%)" }}>
      <div className="text-center mt-4">
        <div className="text-sm font-bold text-white/90 tracking-wider drop-shadow">خلاقانه</div>
        <h1 className="ss-title text-6xl md:text-7xl leading-tight">بهینه‌ساز برق</h1>
        <div className="mt-1 inline-block bg-white/90 text-blue-900 font-black px-5 py-1.5 rounded-full border-4 border-yellow-300 shadow-lg text-lg">مأموریت بوشهر — جهان ۰۱</div>
        <div className="text-white/90 font-bold mt-3 drop-shadow">شهر به کمک تو نیاز دارد، محمد پارسا! ⚡</div>
      </div>
      <div className="flex flex-col gap-3 items-center w-[min(92vw,360px)]">
        {hasSave && (
          <button className="ss-btn green w-full text-xl" onClick={() => { audio.init(); audio.click(); onContinue(); }}>
            ▶ ادامه بازی
          </button>
        )}
        <button className="ss-btn w-full text-xl" onClick={() => { audio.init(); audio.click(); onNew(); }}>
          ✦ بازی جدید
        </button>
        <div className="grid grid-cols-3 gap-2 w-full">
          <button className="ss-btn blue !px-2 text-sm" onClick={() => { audio.init(); audio.open(); setPanel("missions"); }}>
            مأموریت‌ها
          </button>
          <button className="ss-btn blue !px-2 text-sm" onClick={() => { audio.init(); audio.open(); setPanel("map"); }}>
            نقشه
          </button>
          <button className="ss-btn blue !px-2 text-sm" onClick={() => { audio.init(); audio.open(); setPanel("settings"); }}>
            تنظیمات
          </button>
        </div>
        <button className="ss-btn gray w-full text-sm" onClick={() => { audio.init(); audio.open(); setPanel("help"); }}>
          راهنمای بازی و کنترل‌ها
        </button>
      </div>
      <div className="text-white/80 text-xs text-center font-bold drop-shadow flex items-center gap-2">
        <span>🇮🇷 با هم، برای ایرانی روشن‌تر</span>
        <span className="opacity-60">|</span>
        <span>شرکت توزیع نیروی برق استان بوشهر</span>
      </div>
    </div>
  );
}

export function PauseMenu({ onMenu }: { onMenu: () => void }) {
  const setPhase = useGame((s) => s.setPhase);
  const setPanel = useGame((s) => s.setPanel);
  const save = useGame((s) => s.save);
  return (
    <div className="absolute inset-0 pointer-events-auto flex items-center justify-center bg-black/45 fade-in" dir="rtl">
      <div className="ss-panel p-6 w-[min(92vw,380px)] text-center pop-in">
        <div className="ss-title text-4xl">توقف</div>
        <div className="flex flex-col gap-2 mt-5">
          <button className="ss-btn green" onClick={() => { setPhase("playing"); audio.click(); }}>
            ▶ ادامه
          </button>
          <button className="ss-btn blue" onClick={() => { setPanel("missions"); setPhase("playing"); audio.open(); }}>
            مأموریت‌ها
          </button>
          <button className="ss-btn blue" onClick={() => { setPanel("settings"); setPhase("playing"); audio.open(); }}>
            تنظیمات
          </button>
          <button className="ss-btn" onClick={() => { save(); audio.success(); }}>
            💾 ذخیره بازی
          </button>
          <button className="ss-btn gray" onClick={() => { save(); onMenu(); audio.close(); }}>
            بازگشت به منوی اصلی
          </button>
        </div>
      </div>
    </div>
  );
}

function Frame({ title, icon, children, wide }: { title: string; icon: string; children: React.ReactNode; wide?: boolean }) {
  const setPanel = useGame((s) => s.setPanel);
  return (
    <div className="absolute inset-0 pointer-events-auto flex items-center justify-center bg-black/35 fade-in" dir="rtl" onClick={() => { setPanel(null); audio.close(); }}>
      <div className={`ss-panel p-5 ${wide ? "w-[min(96vw,820px)]" : "w-[min(94vw,600px)]"} max-h-[92vh] overflow-auto pop-in`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-2xl font-black flex items-center gap-2">
            <span className="text-3xl">{icon}</span>
            {title}
          </div>
          <button className="ss-btn gray !px-3 !py-1.5 text-sm" onClick={() => { setPanel(null); audio.close(); }}>
            بستن ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function MapPanel() {
  return (
    <Frame title="نقشه محله — بوشهر" icon="🗺️" wide>
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="rounded-2xl overflow-hidden border-4 border-blue-200 shadow-inner mx-auto">
          <MapView size={380} labels />
        </div>
        <div className="flex-1 text-sm space-y-2">
          <Legend c="#ff3ea5" t="محمد پارسا (تو)" />
          <Legend c="#ffd23a" t="مأموریت فعال" />
          <Legend c="#e9dcc0" t="خانه‌های سنتی بوشهری" />
          <Legend c="#d7d2c8" t="آپارتمان‌های مدرن" />
          <Legend c="#f2c987" t="فروشگاه یار برق" />
          <Legend c="#3f7a4a" t="پست برق محله" />
          <Legend c="#bde8a8" t="خانه‌های بهینه‌شده" />
          <Legend c="#0a63b8" t="خلیج فارس و اسکله" />
          <div className="pt-2 text-xs opacity-80">سکه‌های طلایی در سراسر خیابان نخل، اسکله، ساحل و میدان پخش شده‌اند. آن‌ها را جمع کن تا بتوانی وسایل کم‌مصرف بخری.</div>
        </div>
      </div>
    </Frame>
  );
}
function Legend({ c, t }: { c: string; t: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-4 h-4 rounded border border-black/30" style={{ background: c }} />
      <span>{t}</span>
    </div>
  );
}

export function MissionsPanel() {
  const missions = useGame((s) => s.missions);
  return (
    <Frame title="مأموریت‌های یار برق" icon="⭐">
      <div className="space-y-3">
        {missions.map((m) => (
          <div key={m.id} className={`rounded-2xl border-4 p-3 ${m.state === "active" ? "border-yellow-300 bg-yellow-50" : m.state === "done" ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50 opacity-70"}`}>
            <div className="flex items-center justify-between">
              <div className="font-black">
                {m.state === "done" ? "✅" : m.state === "active" ? "🟡" : "🔒"} مأموریت {toFa(m.id)}: {m.title}
              </div>
              <div className="text-xs ss-chip !bg-white !text-blue-900 !border-blue-200">
                +{toFa(m.rewardCoins)} <span className="coin" style={{ width: 14, height: 14 }} /> · +{toFa(m.rewardXp)} امتیاز
              </div>
            </div>
            <div className="text-xs opacity-80 mt-1">{m.desc}</div>
            <ul className="mt-2 space-y-1 text-sm">
              {m.objectives.map((o) => (
                <li key={o.id} className={`flex items-center gap-2 ${o.done ? "line-through opacity-60" : ""}`}>
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px] ${o.done ? "bg-green-500 border-green-700 text-white" : "border-gray-400"}`}>{o.done ? "✓" : ""}</span>
                  {o.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="rounded-2xl border-4 border-dashed border-blue-200 p-3 text-center text-sm opacity-70">جهان‌های بعدی: تهران، اصفهان، شیراز، یزد، رشت، بندرعباس... (به‌زودی)</div>
      </div>
    </Frame>
  );
}

export function InventoryPanel() {
  const upgrades = useGame((s) => s.upgrades);
  const coins = useGame((s) => s.coins);
  const buy = useGame((s) => s.buyUpgrade);
  const solarLevel = useGame((s) => s.solarLevel);
  const scannerUnlocked = useGame((s) => s.scannerUnlocked);
  const appliances = useGame((s) => s.appliances);
  const fixedCount = appliances.filter((a) => a.fixed).length;
  return (
    <Frame title="کوله‌پشتی و فروشگاه یار برق" icon="🎒" wide>
      <div className="flex items-center justify-between mb-3">
        <div className="ss-chip !bg-yellow-300 !text-yellow-900 !border-yellow-600 text-lg">
          {toFa(coins)} <span className="coin" />
        </div>
        <div className="text-xs opacity-70">آقا رحیم: «هرچی برای صرفه‌جویی لازم داری، اینجاست!»</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
        <Item icon="🧢" name="کلاه یار برق" desc="نشان مأموریت" owned />
        <Item icon="🪪" name="کارت همیار برق" desc="شناسایی رسمی یار برق" owned />
        <Item icon="🔦" name="اسکنر انرژی" desc={scannerUnlocked ? "فعال — با Q" : "بعد از صحبت با فاطمه"} owned={scannerUnlocked} />
        <Item icon="⌚" name="دستبند هوشمند" desc="نمایش زمان و اوج مصرف" owned />
        <Item icon="💡" name="لامپ‌های LED نصب‌شده" desc={`${toFa(fixedCount)} مشکل حل شده`} owned={fixedCount > 0} />
        <Item icon="☀️" name="پنل خورشیدی" desc={solarLevel ? `سطح ${toFa(solarLevel)}` : "روی پشت‌بام نصب کن"} owned={solarLevel > 0} />
      </div>
      <div className="font-black mb-2">🛒 ارتقاها</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {upgrades.map((u) => (
          <div key={u.id} className={`rounded-xl border-2 p-3 flex items-center gap-3 ${u.owned ? "bg-green-50 border-green-300" : "bg-white border-blue-100"}`}>
            <div className="text-3xl">{u.icon}</div>
            <div className="flex-1">
              <div className="font-black text-sm">{u.name}</div>
              <div className="text-xs opacity-80">{u.desc}</div>
              {u.requires === "solar" && !solarLevel && <div className="text-[10px] text-orange-700">نیازمند پنل خورشیدی</div>}
            </div>
            {u.owned ? (
              <span className="text-green-700 font-bold text-sm">دارید ✓</span>
            ) : (
              <button className="ss-btn green !py-1.5 !px-3 text-sm" disabled={coins < u.cost} onClick={() => { buy(u.id); audio.click(); }}>
                {toFa(u.cost)} <span className="coin" style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>
        ))}
      </div>
    </Frame>
  );
}
function Item({ icon, name, desc, owned }: { icon: string; name: string; desc: string; owned?: boolean }) {
  return (
    <div className={`rounded-xl border-2 p-2 text-center ${owned ? "bg-white border-blue-200" : "bg-gray-100 border-gray-200 opacity-60"}`}>
      <div className="text-2xl">{icon}</div>
      <div className="font-black text-xs mt-1">{name}</div>
      <div className="text-[10px] opacity-80">{desc}</div>
    </div>
  );
}

export function StatsPanel() {
  const appliances = useGame((s) => s.appliances);
  const time = useGame((s) => s.time);
  const solarLevel = useGame((s) => s.solarLevel);
  const upgrades = useGame((s) => s.upgrades);
  const xp = useGame((s) => s.xp);
  const neighborhood = useGame((s) => s.neighborhood);
  const cons = houseConsumption({ appliances, solarLevel, time, upgrades });
  const baseline = appliances.reduce((s, a) => s + a.watts, 0);
  const savedPct = Math.round((1 - cons.watts / baseline) * 100);
  const lv = levelFromXp(xp);
  const xpP = xpProgress(xp);
  return (
    <Frame title="آمار انرژی — پست برق محله" icon="📊">
      <div className="grid grid-cols-2 gap-2 text-center">
        <Box t="مصرف فعلی خانه" v={`${toFa(cons.watts)} W`} c="#c0392b" />
        <Box t="تولید خورشیدی" v={`${toFa(cons.solarW)} W`} c="#d68910" />
        <Box t="خرید از شبکه" v={`${toFa(cons.net)} W`} c="#1d4f9a" />
        <Box t="صرفه‌جویی نسبت به اول" v={`${toFa(Math.max(0, savedPct))}٪`} c="#2fb43a" />
      </div>
      <div className="mt-3 rounded-xl border-2 border-blue-100 p-3">
        <div className="font-black text-sm mb-2">مصرف هر وسیله</div>
        {appliances.map((a) => {
          const w = a.on ? (a.efficient ? a.efficientWatts : a.watts) : 0;
          return (
            <div key={a.id} className="flex items-center gap-2 text-xs mb-1.5">
              <span className="w-28 truncate font-bold">{a.name}</span>
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (w / 2000) * 100)}%`, background: w > 500 ? "#ff3b3b" : w > 80 ? "#ff8a1f" : "#2fb43a" }} />
              </div>
              <span className="w-16 text-left persian-num">{toFa(w)} W</span>
              <span>{a.fixed ? "✅" : "⚠️"}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-sky-50 border-2 border-sky-200 p-2 text-sm">
          <div className="font-black">سطح یار برق: {toFa(lv)}</div>
          <div className="h-2 bg-white rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-sky-500" style={{ width: `${xpP.pct * 100}%` }} />
          </div>
          <div className="text-[10px] opacity-70 persian-num">
            {toFa(xp)} / {toFa(xpP.next)} امتیاز
          </div>
        </div>
        <div className="rounded-xl bg-green-50 border-2 border-green-200 p-2 text-sm">
          <div className="font-black">امتیاز محله: {toFa(Math.round(neighborhood))}٪</div>
          <div className="h-2 bg-white rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-green-500" style={{ width: `${neighborhood}%` }} />
          </div>
          <div className="text-[10px] opacity-70">{isPeak(time) ? "الان ساعت اوج مصرف است" : "خارج از اوج مصرف"}</div>
        </div>
      </div>
      <div className="mt-3 text-xs bg-yellow-50 border-2 border-yellow-200 rounded-xl p-2">💡 می‌دانستی؟ در طرح گیمیفای بوشهر، مشترکان به‌طور میانگین ۶٫۳۱٪ مصرف برق خود را کاهش دادند — معادل ۷۸٬۵۷۳ کیلووات‌ساعت انرژی!</div>
    </Frame>
  );
}
function Box({ t, v, c }: { t: string; v: string; c: string }) {
  return (
    <div className="rounded-xl bg-white border-2 border-blue-100 p-2">
      <div className="text-[11px] opacity-70">{t}</div>
      <div className="font-black text-lg persian-num" style={{ color: c }}>
        {v}
      </div>
    </div>
  );
}

export function SettingsPanel() {
  const settings = useGame((s) => s.settings);
  const set = useGame((s) => s.setSettings);
  const weather = useGame((s) => s.weather);
  const setWeather = useGame((s) => s.setWeather);
  return (
    <Frame title="تنظیمات" icon="⚙️">
      <div className="space-y-3">
        <Row label="موسیقی">
          <Toggle v={settings.music} on={() => { set({ music: !settings.music }); audio.setEnabled(!settings.music, settings.sfx); }} />
        </Row>
        <Row label="جلوه‌های صوتی و محیط">
          <Toggle v={settings.sfx} on={() => { set({ sfx: !settings.sfx }); audio.setEnabled(settings.music, !settings.sfx); }} />
        </Row>
        <Row label="حساسیت دوربین">
          <input type="range" min={0.4} max={2} step={0.1} value={settings.sensitivity} onChange={(e) => set({ sensitivity: parseFloat(e.target.value) })} className="w-40" />
        </Row>
        <Row label="کیفیت گرافیک (نیاز به شروع دوباره)">
          <div className="flex gap-1">
            {(["high", "medium"] as const).map((q) => (
              <button key={q} className={`ss-btn !py-1 !px-3 text-xs ${settings.quality === q ? "green" : "gray"}`} onClick={() => set({ quality: q })}>
                {q === "high" ? "بالا" : "متوسط"}
              </button>
            ))}
          </div>
        </Row>
        <Row label="آب‌وهوا">
          <div className="flex gap-1">
            <button className={`ss-btn !py-1 !px-3 text-xs ${weather === "clear" ? "blue" : "gray"}`} onClick={() => setWeather("clear")}>
              صاف
            </button>
            <button className={`ss-btn !py-1 !px-3 text-xs ${weather === "haze" ? "blue" : "gray"}`} onClick={() => setWeather("haze")}>
              شرجی
            </button>
          </div>
        </Row>
      </div>
    </Frame>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between bg-white/70 rounded-xl border-2 border-blue-100 p-3">
      <span className="font-bold text-sm">{label}</span>
      {children}
    </div>
  );
}
function Toggle({ v, on }: { v: boolean; on: () => void }) {
  return (
    <button onClick={on} className={`w-14 h-8 rounded-full border-2 relative transition ${v ? "bg-green-400 border-green-600" : "bg-gray-300 border-gray-400"}`}>
      <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${v ? "right-0.5" : "right-7"}`} />
    </button>
  );
}

export function HelpPanel() {
  return (
    <Frame title="راهنمای یار برق" icon="❔">
      <div className="space-y-3 text-sm">
        <div className="rounded-xl bg-blue-50 border-2 border-blue-100 p-3">
          <div className="font-black mb-1">🎮 کنترل‌ها — صفحه‌کلید و موس</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <span>W A S D — حرکت</span>
            <span>موس — چرخش دوربین</span>
            <span>Shift — دویدن</span>
            <span>Space — پرش</span>
            <span>E — تعامل / صحبت / اسکن</span>
            <span>Q — روشن/خاموش کردن اسکنر</span>
            <span>M — نقشه</span>
            <span>Tab — مأموریت‌ها</span>
            <span>I — کوله‌پشتی و فروشگاه</span>
            <span>Esc — توقف</span>
          </div>
          <div className="font-black mb-1 mt-3">🎯 کنترل‌ها — دسته بازی (Gamepad)</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <span> stick چپ — حرکت</span>
            <span> stick راست — دوربین</span>
            <span> دکمه A — پرش</span>
            <span> دکمه B — تعامل</span>
            <span> دکمه X — اسکنر</span>
            <span> دکمه Y — نقشه</span>
            <span> LB — دویدن</span>
            <span> Start — توقف</span>
            <span> Back — مأموریت‌ها</span>
            <span> D-Pad — حرکت</span>
          </div>
        </div>
        <div className="rounded-xl bg-yellow-50 border-2 border-yellow-200 p-3">
          <div className="font-black mb-1">🔁 چرخه بازی</div>
          <div className="text-xs leading-relaxed">کاوش ← پیدا کردن مشکل ← اسکن ← فهمیدن مشکل انرژی ← انتخاب راه‌حل ← تعمیر ← دیدن کاهش مصرف ← دریافت سکه ← ارتقا ← بهبود محله ← مأموریت بعدی</div>
        </div>
        <div className="rounded-xl bg-green-50 border-2 border-green-200 p-3">
          <div className="font-black mb-1">⚡ ساعت اوج مصرف (۱۳ تا ۱۸)</div>
          <div className="text-xs leading-relaxed">در این ساعت‌ها شبکه برق زیر فشار است. وسایل پرمصرف مثل کولر قدیمی را خاموش کن یا روی ۲۵ درجه بگذار. نوار انرژی سبز = عالی، زرد = هشدار، قرمز = مصرف بیش از حد.</div>
        </div>
        <div className="rounded-xl bg-pink-50 border-2 border-pink-200 p-3">
          <div className="font-black mb-1">🪙 سکه انرژی</div>
          <div className="text-xs leading-relaxed">سکه‌های طلایی روی خیابان، اسکله و پشت‌بام را جمع کن. با حل هر مشکل هم سکه می‌گیری. با سکه‌ها لامپ LED، یخچال A++، کولر اینورتر و پنل خورشیدی بخر.</div>
        </div>
      </div>
    </Frame>
  );
}

export function CinematicOverlay({ text, onSkip }: { text: string; onSkip: () => void }) {
  return (
    <div className="absolute inset-0 pointer-events-none fade-in" dir="rtl">
      <div className="absolute top-0 inset-x-0 h-[11vh] bg-black" />
      <div className="absolute bottom-0 inset-x-0 h-[11vh] bg-black" />
      <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 160px rgba(0,0,0,0.55)" }} />
      <div className="absolute bottom-[14vh] inset-x-0 text-center px-6">
        <div key={text} className="inline-block bg-black/40 text-white text-xl md:text-2xl font-black px-6 py-3 rounded-2xl backdrop-blur fade-in drop-shadow-lg">
          {text}
        </div>
      </div>
      <button className="absolute bottom-[3vh] left-6 pointer-events-auto text-white/80 text-sm font-bold border-2 border-white/40 rounded-full px-4 py-1.5 hover:bg-white/10" onClick={onSkip}>
        رد کردن ▸▸
      </button>
    </div>
  );
}
