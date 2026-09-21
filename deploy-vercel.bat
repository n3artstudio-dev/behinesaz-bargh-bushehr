@echo off
chcp 65001 >nul
title استقرار روی Vercel - بهینه ساز برق
color 0E

echo ============================================
echo    استقرار خودکار بازی روی Vercel
echo ============================================
echo.

REM --- بررسی نصب بودن Node.js ---
where node >nul 2>nul
if errorlevel 1 (
  echo [خطا] Node.js نصب نیست.
  echo از https://nodejs.org نسخه LTS را دانلود و نصب کن.
  echo بعد دوباره این فایل را اجرا کن.
  echo.
  pause
  exit /b
)

echo [۱/۴] نصب وابستگی‌ها (چند دقیقه طول می‌کشد)...
call npm install

echo [۲/۴] ساخت نسخه نهایی بازی...
call npm run build

echo [۳/۴] اتصال به Vercel (بار اول مرورگر برای لاگین باز می‌شود)...
echo اگر اکانت نداری، روی Continue with GitHub بزن.
echo.
npx vercel --prod --yes

echo.
echo [۴/۴] تمام شد!
echo لینک بازی در بالا نمایش داده می‌شود:
echo   https://behinesaz-bargh-bushehr.vercel.app
echo.
pause
