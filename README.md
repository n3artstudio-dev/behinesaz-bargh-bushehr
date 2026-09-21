# بهینه‌ساز برق — مأموریت بوشهر

بازی سه‌بعدی تعاملی آموزش مدیریت مصرف برق برای کودکان و نوجوانان ایرانی.

## ⚡ استقرار یک‌کلیکی (بعد از آپلود کد در گیت‌هاب)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/n3artstudio-dev/behinesaz-bargh-bushehr)
[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/n3artstudio-dev/behinesaz-bargh-bushehr)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/n3artstudio-dev/behinesaz-bargh-bushehr)

> فایل `render.yaml` داخل پروژه هست؛ یعنی Render خودش می‌فهمه که باید `npm run build` بزنه و پوشه `dist` رو منتشر کنه. هیچ تنظیم دستی لازم نیست.

## 🎮 ویژگی‌ها

- **پنج جهان قابل بازی**: ۱) بوشهر و خانه‌های هوشمند ۲) شهر خورشیدی ☀️ ۳) منطقه انرژی بادی 💨 (با چتر پرواز 🪂 برای دید از ارتفاع ۵۰ متری) ۴) شهر انرژی پیشرفته با نیروگاه اتمی بوشهر ⚛️ ۵) مأموریت رمز ارز و تابلوی هوشمند محله 🪧
- **افکت ذرات جایزه** هنگام جمع‌کردن سکه و تکمیل مراحل
- **دنیای سه‌بعدی بوشهر** با خلیج فارس، خانه‌های سنتی شناشیر، بازار و میدان
- **کاراکتر محمد پارسا** با لباس زرد و آبی یار برق
- **دسته بازی (Gamepad)** — کامل پشتیبانی از دسته‌های Xbox/PS
- **مأموریت آموزشی** — شناسایی و رفع مشکلات مصرف برق
- **انرژی خورشیدی** — نصب پنل روی پشت‌بام
- **ساعت اوج مصرف** — مدیریت هوشمند برق
- **رابط فارسی** — تمام منوها و متن‌ها به فارسی

## 🎮 کنترل‌ها

### صفحه‌کلید و موس
| کلید | عمل |
|------|------|
| W A S D | حرکت |
| موس | چرخش دوربین |
| Shift | دویدن |
| Space | پرش |
| E | تعامل / صحبت / اسکن |
| Q | اسکنر انرژی |
| M | نقشه |
| Tab | مأموریت‌ها |
| I | فروشگاه |
| Esc | توقف |

### دسته بازی
| دکمه | عمل |
|-------|------|
| Stick چپ | حرکت |
| Stick راست | دوربین |
| A | پرش |
| B | تعامل |
| X | اسکنر |
| Y | نقشه |
| LB | دویدن |
| Start | توقف |
| Back | مأموریت‌ها |
| D-Pad | حرکت |

## 🚀 اجرا

```bash
npm install
npm run dev
```

## 🌐 ساخت برای GitHub Pages

```bash
npm run build
```

فایل‌های خروجی در پوشه `dist/` ذخیره می‌شوند.

## 📦 استقرار روی GitHub Pages

### روش خودکار (GitHub Actions)
1. کد را در GitHub push کنید
2. در تنظیمات ریپازیتوری، بخش Pages را باز کنید
3. Source را روی **GitHub Actions** بگذارید
4. هر بار که کد push شود، خودکار deploy می‌شود

### روش دستی
```bash
npm run build
# فایل‌های dist/ را در شاخه gh-pages قرار دهید
```

## 🏗️ ساختار پروژه

```
src/
├── game/
│   ├── Engine.ts          # موتور بازی Three.js
│   ├── store.ts           # مدیریت وضعیت بازی (Zustand)
│   ├── world.ts           # ساخت دنیای ۳بعدی بوشهر
│   ├── characters.ts      # کاراکترهای ایرانی
│   ├── textures.ts        # بافت‌های پروسیدورال
│   └── audio.ts           # صداهای محیطی
├── components/
│   ├── HUD.tsx            # رابط بازی
│   ├── Menus.tsx          # منوها
│   ├── Panels.tsx         # پنل‌های گیم‌پلی
│   └── MapView.tsx        # نقشه
└── App.tsx                # نقطه ورود
```

## 🌐 استقرار روی Vercel (پیشنهادی)

### روش ۱: CLI (سریع‌تر)
```bash
npm i -g vercel
vercel login
vercel --prod
```

### روش ۲: Web
1. برو به [vercel.com](https://vercel.com)
2. با گیت‌هاب وارد شو
3. **Add New → Project** → ریپو `behinesaz-bargh-bushehr` رو انتخاب کن
4. تنظیمات:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output: `dist`
5. **Deploy** بزن

لینکت می‌شه: `https://behinesaz-bargh-bushehr.vercel.app`

---

## 📱 PWA (قابل نصب روی گوشی)

بازی به صورت PWA ساخته شده و کاربران می‌تونن:
- روی آیفون: دکمه Share → Add to Home Screen
- روی اندروید: پاپ‌آپ نصب خودکار نمایش داده می‌شه
- روی کامپیوتر: آیکون نصب در نوار آدرس

بدون اینترنت هم کار می‌کنه! (Offline via Service Worker)

---

## 📜 مجوز

بازی «خلاقانه بهینه‌ساز برق» — شرکت توزیع نیروی برق استان بوشهر

🇮🇷 با هم، برای ایرانی روشن‌تر
