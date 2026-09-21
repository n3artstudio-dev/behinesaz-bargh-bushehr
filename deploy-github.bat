@echo off
chcp 65001 >nul
title استقال پروژه روی گیت‌هاب - بهینه ساز برق
color 0B

echo ============================================
echo    ارسال بازی به گیت‌هاب
echo ============================================
echo.

REM --- بررسی نصب بودن Git ---
where git >nul 2>nul
if errorlevel 1 (
  echo [خطا] Git روی سیستم نصب نیست.
  echo از این آدرس دانلود و نصب کن:
  echo https://git-scm.com/download/win
  echo.
  pause
  exit /b
)

echo [۱/۶] در حال آماده‌سازی مخزن...
git init
git branch -M main

echo [۲/۶] افزودن فایل‌ها...
git add .

echo [۳/۶] ثبت تغییرات...
git commit -m "بهینه ساز برق - ماموریت بوشهر (PWA + Gamepad)"

echo [۴/۶] اتصال به مخزن گیت‌هاب...
git remote remove origin >nul 2>nul
git remote add origin https://github.com/n3artstudio-dev/behinesaz-bargh-bushehr.git

echo [۵/۶] ارسال به گیت‌هاب...
git push -u origin main

if errorlevel 1 (
  echo.
  echo [توجه] اگر پنجره ورود به گیت‌هاب باز شد، لاگین کن.
  echo سپس دوباره همین فایل را اجرا کن.
  echo.
  pause
  exit /b
)

echo.
echo [۶/۶] تمام شد!
echo.
echo حالا در سایت گیت‌هاب برو به:
echo   Settings  ^>  Pages  ^>  Source = GitHub Actions
echo خودش بازی را می‌سازد و لینک می‌دهد.
echo.
pause
