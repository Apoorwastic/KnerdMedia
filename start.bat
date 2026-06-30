@echo off
echo Starting Knerd Media...
start "Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak > nul
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo.
echo Backend: http://localhost:3002
echo Frontend: http://localhost:5174
echo.
echo Login: priya@knerdmedia.com / admin123
