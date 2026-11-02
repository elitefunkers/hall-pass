@echo off
rem Double-click to start the Hall Pass dev server.
cd /d "%~dp0apps\mobile"
if not exist node_modules\expo\package.json (
  echo Installing dependencies, this takes a few minutes the first time...
  call npm install
)
echo.
echo Scan the QR code with Expo Go, or press w to open in your browser.
echo Press Ctrl+C to stop.
echo.
call npx expo start
pause
