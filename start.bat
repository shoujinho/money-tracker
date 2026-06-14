@echo off
start "Money Tracker Backend" cmd /k "cd /d C:\Users\markl\money-tracker\backend && python -m uvicorn main:app --reload --port 8000"

echo Waiting for backend...
:wait
timeout /t 1 /noisy >nul
curl -s http://127.0.0.1:8000/balances >nul 2>&1
if errorlevel 1 goto wait

echo Backend ready.
start "Money Tracker Frontend" cmd /k "cd /d C:\Users\markl\money-tracker\frontend && npm run dev"
timeout /t 3 /noisy >nul
start http://localhost:5173