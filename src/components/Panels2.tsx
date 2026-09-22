import { useState } from "react";
import { loadPlayers, toFa, useGame } from "../game/store";
import { audio } from "../game/audio";

/* ---------- پروفایل بازیکن (نام، موبایل، شناسه قبض) ---------- */
export function ProfileGate({ embedded = false }: { embedded?: boolean }) {
  const setProfile = useGame((s) => s.setProfile);
  const setPanel = useGame((s) => s.setPanel);
  const [name, setName] = useState(useGame.getState().playerName || "");
  const [mobile, setMobile] = useState(useGame.getState().mobile || "");
  const [billId, setBillId] = useState(useGame.getState().billId || "");
  const submit = () => {
    setProfile({ name, mobile, billId });
    audio.success();
    if (embedded) setPanel(null);
  };
  return (
    <div className={`absolute inset-0 z-50 flex items-center justify-center p-4 ${embedded ? "bg-black/40 pointer-events-auto fade-in" : "bg-[#06122c]/85"}`} dir="rtl">
      <div className="ss-panel w-[min(94vw,460px)] p-6 pop-in">
        <div className="text-center">
          <div className="text-5xl mb-2">⚡🧒</div>
          <div className="text-2xl font-black">به بازی «همیار برق» خوش آمدی!</div>
          <div className="text-xs opacity-70 mt-1 leading-relaxed">
            اول اسمت را بنویس تا در داستان جای «محمد پارسا» بنشیند.
            <br />
            موبایل و شماره قبض برق اختیاری است (۱۳ رقم).
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <div>
            <label className="text-xs font-bold">نام قهرمان ⭐</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              maxLength={24}
              placeholder="مثلاً: محمد پارسا"
              className="w-full mt-1 rounded-xl border-2 border-blue-200 bg-white/90 px-3 py-2.5 font-bold text-[#10253f] outline-none focus:border-yellow-400"
            />
          </div>
          <div>
            <label className="text-xs font-bold">شماره موبایل (اختیاری)</label>
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/[^\d]/g, "").slice(0, 11))}
              inputMode="numeric"
              placeholder="09xxxxxxxxx"
              className="w-full mt-1 rounded-xl border-2 border-blue-200 bg-white/90 px-3 py-2.5 text-[#10253f] outline-none focus:border-yellow-400"
            />
          </div>
          <div>
            <label className="text-xs font-bold">شناسه ۱۳ رقمی قبض برق (اختیاری)</label>
            <input
              value={billId}
              onChange={(e) => setBillId(e.target.value.replace(/[^\d]/g, "").slice(0, 13))}
              inputMode="numeric"
              placeholder="1234567890123"
              className="w-full mt-1 rounded-xl border-2 border-blue-200 bg-white/90 px-3 py-2.5 text-[#10253f] outline-none focus:border-yellow-400"
            />
          </div>
        </div>
        <button onClick={submit} className="ss-btn green w-full mt-5 !text-base">
          شروع ماجراجویی ⚡
        </button>
      </div>
    </div>
  );
}

/* ---------- لیدربورد (همه می‌بینند) ---------- */
export function LeaderboardPanel() {
  const setPanel = useGame((s) => s.setPanel);
  const players = loadPlayers();
  const ranked = [...players].sort((a, b) => b.medals - a.medals || b.pads - a.pads);
  const medalists = ranked.filter((p) => p.medals > 0);
  const maskMobile = (m: string) => (m.length >= 7 ? m.slice(0, 4) + "***" + m.slice(-3) : "—");
  return (
    <div className="absolute inset-0 pointer-events-auto flex items-center justify-center bg-black/40 fade-in p-4" dir="rtl">
      <div className="ss-panel w-[min(96vw,620px)] p-5 pop-in max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-2xl font-black flex items-center gap-2">
            <span className="text-3xl">🏆</span> لیدربورد همیاران برق
          </div>
          <button className="ss-btn gray !px-3 !py-1.5 text-sm" onClick={() => { setPanel(null); audio.close(); }}>
            بستن ✕
          </button>
        </div>
        <div className="rounded-xl bg-yellow-50 border-2 border-yellow-200 p-3 text-xs mb-3">
          🏅 برندگان مدال افتخار طلایی مدیرعامل، در قرعه‌کشی جوایز شرکت توزیع نیروی برق شرکت داده می‌شوند.
        </div>
        <div className="mb-4">
          <div className="font-black text-sm mb-2 text-[#8a6a00]">🥇 دریافت‌کنندگان مدال افتخار</div>
          {medalists.length === 0 && <div className="text-xs opacity-60 py-2">هنوز کسی مدال نگرفته — اولین قهرمان تو باش!</div>}
          <div className="space-y-1.5">
            {medalists.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 bg-gradient-to-l from-yellow-100 to-white border border-yellow-300 rounded-xl px-3 py-2">
                <span className="font-black text-yellow-700">{toFa(i + 1)}</span>
                <span className="text-xl">🏅</span>
                <span className="font-black flex-1 truncate">{p.name}</span>
                <span className="text-[10px] opacity-60">{maskMobile(p.mobile)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="font-black text-sm mb-2">همه بازیکنان</div>
        <div className="space-y-1.5">
          {ranked.length === 0 && <div className="text-xs opacity-60 py-2">هنوز بازیکنی ثبت نشده.</div>}
          {ranked.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 bg-white border border-blue-100 rounded-xl px-3 py-2 text-sm">
              <span className="w-6 font-black text-blue-700">{toFa(i + 1)}</span>
              <span className="flex-1 truncate font-bold">{p.name}{p.medals ? " 🏅" : ""}</span>
              <span className="text-[10px] bg-blue-50 text-blue-800 rounded-full px-2 py-0.5">{p.stage}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- پنل ورود مدیریت ---------- */
export function AdminGate() {
  const setPanel = useGame((s) => s.setPanel);
  const adminLogin = useGame((s) => s.adminLogin);
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState(false);
  return (
    <div className="absolute inset-0 pointer-events-auto flex items-center justify-center bg-black/50 fade-in p-4" dir="rtl">
      <div className="ss-panel w-[min(92vw,380px)] p-6 pop-in">
        <div className="text-center">
          <div className="text-4xl">🔐</div>
          <div className="font-black text-xl mt-1">ورود به پنل مدیریت</div>
        </div>
        <div className="mt-4 space-y-3">
          <input
            value={u}
            onChange={(e) => setU(e.target.value)}
            placeholder="نام کاربری"
            className="w-full rounded-xl border-2 border-blue-200 px-3 py-2.5 text-[#10253f] outline-none focus:border-yellow-400"
          />
          <input
            type="password"
            value={p}
            onChange={(e) => setP(e.target.value)}
            placeholder="رمز عبور"
            className="w-full rounded-xl border-2 border-blue-200 px-3 py-2.5 text-[#10253f] outline-none focus:border-yellow-400"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (adminLogin(u, p)) {
                  audio.success();
                  setPanel("dashboard");
                } else setErr(true);
              }
            }}
          />
          {err && <div className="text-xs text-red-600 font-bold">نام کاربری یا رمز اشتباه است.</div>}
        </div>
        <div className="flex gap-2 mt-4">
          <button className="ss-btn gray flex-1" onClick={() => setPanel(null)}>انصراف</button>
          <button
            className="ss-btn blue flex-1"
            onClick={() => {
              if (adminLogin(u, p)) {
                audio.success();
                setPanel("dashboard");
              } else setErr(true);
            }}
          >
            ورود
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- داشبورد مدیریت ---------- */
export function DashboardPanel() {
  const setPanel = useGame((s) => s.setPanel);
  const adminLogout = useGame((s) => s.adminLogout);
  const applyCheat = useGame((s) => s.applyCheat);
  const [cheatMsg, setCheatMsg] = useState("");
  const [code, setCode] = useState("");
  const players = loadPlayers();
  const medalCount = players.filter((p) => p.medals > 0).length;
  const mask = (m: string) => (m ? (m.length >= 7 ? m.slice(0, 4) + "***" + m.slice(-3) : m) : "—");
  const cheats = [
    { c: "BARQ-01", t: "پرش مأموریت بوشهر" },
    { c: "BARQ-02", t: "پرش شهر خورشیدی" },
    { c: "BARQ-03", t: "پرش انرژی بادی (چتر)" },
    { c: "BARQ-04", t: "پرش نیروگاه هسته‌ای" },
    { c: "BARQ-05", t: "پرش رمز ارز" },
    { c: "BARQ-06", t: "همه مراحل + مدال" },
  ];
  return (
    <div className="absolute inset-0 pointer-events-auto flex items-center justify-center bg-black/50 fade-in p-3" dir="rtl">
      <div className="ss-panel w-[min(98vw,860px)] p-5 pop-in max-h-[94vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-black flex items-center gap-2">
            <span className="text-2xl">📊</span> داشبورد مدیریت — شرکت توزیع نیروی برق بوشهر
          </div>
          <button className="ss-btn gray !px-3 !py-1.5 text-sm" onClick={() => { adminLogout(); setPanel(null); audio.close(); }}>
            خروج ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { n: players.length, l: "کل بازیکنان", c: "#1e4f9a" },
            { n: medalCount, l: "مدال‌آوران", c: "#b8860b" },
            { n: players.filter((p) => p.stage.includes("مدال")).length, l: "بازی تمام‌شده", c: "#2f8f44" },
          ].map((x) => (
            <div key={x.l} className="rounded-2xl text-white p-3 text-center" style={{ background: x.c }}>
              <div className="text-3xl font-black">{toFa(x.n)}</div>
              <div className="text-xs opacity-90">{x.l}</div>
            </div>
          ))}
        </div>

        <div className="text-xs bg-blue-50 border border-blue-200 rounded-xl p-2 mb-3">
          آدرس دسترسی: از منوی اصلی بازی ← دکمه 🔐 «مدیریت». رمز فقط در اختیار ادمین است.
        </div>

        <div className="border rounded-xl overflow-hidden mb-4">
          <table className="w-full text-xs">
            <thead className="bg-[#10345f] text-white">
              <tr>
                <th className="p-2 text-right">#</th>
                <th className="p-2 text-right">نام</th>
                <th className="p-2 text-right">موبایل</th>
                <th className="p-2 text-right">شناسه قبض</th>
                <th className="p-2 text-right">مرحله</th>
                <th className="p-2 text-right">مدال</th>
                <th className="p-2 text-right">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id} className={i % 2 ? "bg-blue-50/50" : "bg-white"}>
                  <td className="p-2">{toFa(i + 1)}</td>
                  <td className="p-2 font-bold">{p.name}</td>
                  <td className="p-2" dir="ltr">{mask(p.mobile)}</td>
                  <td className="p-2" dir="ltr">{p.billId ? toFa(p.billId) : "—"}</td>
                  <td className="p-2">{p.stage}</td>
                  <td className="p-2 text-center">{p.medals ? "🏅" : "—"}</td>
                  <td className="p-2">{new Date(p.joinedAt).toLocaleDateString("fa-IR")}</td>
                </tr>
              ))}
              {players.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center opacity-60">هنوز بازیکنی ثبت نشده است.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-2 border-dashed border-orange-300 rounded-xl p-3">
          <div className="font-black text-sm text-orange-800 mb-2">🧪 کدهای تست (تقلب ادمین)</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {cheats.map((c) => (
              <button
                key={c.c}
                className="text-right rounded-lg border border-orange-200 bg-orange-50 px-2 py-1.5 text-[11px] hover:bg-orange-100"
                onClick={() => {
                  const msg = applyCheat(c.c);
                  if (msg) {
                    setCheatMsg(msg);
                    audio.fanfare();
                  }
                }}
              >
                <b>{c.c}</b>
                <div className="opacity-70">{c.t}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="کد را اینجا هم می‌توانی تایپ کنی"
              className="flex-1 rounded-lg border border-orange-200 px-2 py-1.5 text-xs"
            />
            <button
              className="ss-btn !py-1.5 text-xs"
              onClick={() => {
                const msg = applyCheat(code);
                if (msg) {
                  setCheatMsg(msg);
                  audio.fanfare();
                } else if (code.trim()) setCheatMsg("❌ کد نامعتبر است");
              }}
            >
              اجرا
            </button>
          </div>
          {cheatMsg && <div className="mt-2 text-xs font-bold text-green-700">{cheatMsg}</div>}
        </div>
      </div>
    </div>
  );
}
