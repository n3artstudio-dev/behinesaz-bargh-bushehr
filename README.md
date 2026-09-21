# بهینه‌ساز برق — مأموریت بوشهر

یک بازی 3D مرورگری ساخته‌شده با React + Vite + Three.js.

## اجرا

```bash
npm install
npm run dev
```

## بیلد نهایی

```bash
npm install
npm run build
```

خروجی نهایی در پوشه `dist/` ساخته می‌شود.

## استقرار روی GitHub

### روش 1: فقط کد پروژه
1. یک ریپازیتوری جدید در GitHub بسازید.
2. فایل‌های این پروژه را داخل آن push کنید.
3. در محیط محلی:

```bash
git init
git add .
git commit -m "Initial release: Behinesaz Bargh - Bushehr Mission"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### روش 2: خروجی آماده انتشار
بعد از `npm run build`، محتوای `dist/` را می‌توانید روی GitHub Pages / Netlify / Vercel منتشر کنید.

## کنترل‌ها
- `WASD` حرکت
- `Shift` دویدن
- `Space` پرش
- `E` تعامل
- `Q` اسکنر انرژی
- `M` نقشه
- `Tab` مأموریت‌ها
- `I` فروشگاه / کوله‌پشتی
- `Esc` توقف

## نکته
اگر می‌خواهید نسخه GitHub Pages هم با مسیر deploy کامل آماده شود، در مرحله بعد می‌توانم فایل‌های لازم همان نشر را هم برایتان اضافه کنم.
