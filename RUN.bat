@echo off
chcp 65001 >nul
title Toofan City - شهر طوفان
echo ============================================
echo    شهر طوفان — Toofan City
echo    راه‌اندازی سرور محلی بازی...
echo ============================================
echo.

cd /d "%~dp0"

:: اگر پورت اشغال بود، پورت بعدی
set PORT=8422

:: تلاش با Python
where py >nul 2>nul
if %errorlevel%==0 (
  echo [1/2] اجرای سرور با Python روی پورت %PORT% ...
  start "" http://localhost:%PORT%/index.html
  py -3 -m http.server %PORT% --bind 127.0.0.1
  goto :end
)

where python >nul 2>nul
if %errorlevel%==0 (
  echo [1/2] اجرای سرور با Python روی پورت %PORT% ...
  start "" http://localhost:%PORT%/index.html
  python -m http.server %PORT% --bind 127.0.0.1
  goto :end
)

:: تلاش با Node.js
where node >nul 2>nul
if %errorlevel%==0 (
  echo [1/2] اجرای سرور با Node.js روی پورت %PORT% ...
  start "" http://localhost:%PORT%/index.html
  node -e "const http=require('http'),fs=require('fs'),path=require('path');const M={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.json':'application/json'};http.createServer((q,s)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(__dirname,p);fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);s.end('Not found');return}s.writeHead(200,{'Content-Type':M[path.extname(f)]||'application/octet-stream'});s.end(d)})}).listen(%PORT%,'127.0.0.1',()=>console.log('Server on http://localhost:%PORT%'))"
  goto :end
)

:: بدون Python و Node: باز کردن مستقیم فایل
echo [!] Python یا Node.js پیدا نشد.
echo     بازی مستقیماً در مرورگر باز می‌شود.
echo     (اگر صفحه سفید ماند، Python را نصب کنید تا سرور محلی اجرا شود)
start "" "%~dp0index.html"

:end
echo.
echo [2/2] بازی در مرورگر باز شد. این پنجره را باز نگه دارید.
echo برای بستن بازی، این پنجره را ببندید (Ctrl+C هم کار می‌کند).
pause >nul
