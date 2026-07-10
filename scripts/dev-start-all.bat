@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM  dev-start-all.bat  —  Start all 7 microservices locally
REM
REM  USAGE: Double-click or run from project root:  .\scripts\dev-start-all.bat
REM
REM  Windows opened:
REM    1. ai-generator         :3002
REM    2. execution-engine     :3003
REM    3. credential-service   :3004
REM    4. notification-service :3005
REM    5. trigger-service      :3006
REM    6. workflow-crud-service :3007
REM    7. worker (main)        :3001  (logs appear in THIS window)
REM
REM  Prerequisites:
REM    - Redis running: docker run -d --name redis-local -p 6379:6379 redis:alpine
REM      (or after reboot: docker start redis-local)
REM    - All .env files present (included in zip — see TEAMMATE_ONBOARDING.md)
REM    - npm install done inside worker/, ctrl_checks/, and each services/* folder
REM ─────────────────────────────────────────────────────────────────────────────

set ROOT=%~dp0..

echo.
echo ==========================================
echo  CtrlChecks — Full Local Dev Stack
echo ==========================================
echo.

REM ─── 1. ai-generator :3002 ───────────────────────────────────────────────────
echo [1/7] Starting ai-generator (port 3002)...
start "ai-generator :3002" cmd /k "cd /d %ROOT%\services\ai-generator && npm run dev"
timeout /t 3 /nobreak > nul

REM ─── 2. execution-engine :3003 ───────────────────────────────────────────────
echo [2/7] Starting execution-engine (port 3003)...
start "execution-engine :3003" cmd /k "cd /d %ROOT%\services\execution-engine && npm run dev"
timeout /t 3 /nobreak > nul

REM ─── 3. credential-service :3004 ─────────────────────────────────────────────
echo [3/7] Starting credential-service (port 3004)...
start "credential-service :3004" cmd /k "cd /d %ROOT%\services\credential-service && npm run dev"
timeout /t 3 /nobreak > nul

REM ─── 4. notification-service :3005 ───────────────────────────────────────────
echo [4/7] Starting notification-service (port 3005)...
start "notification-service :3005" cmd /k "cd /d %ROOT%\services\notification-service && npm run dev"
timeout /t 3 /nobreak > nul

REM ─── 5. trigger-service :3006 ────────────────────────────────────────────────
echo [5/7] Starting trigger-service (port 3006)...
start "trigger-service :3006" cmd /k "cd /d %ROOT%\services\trigger-service && npm run dev"
timeout /t 3 /nobreak > nul

REM ─── 6. workflow-crud-service :3007 ──────────────────────────────────────────
echo [6/7] Starting workflow-crud-service (port 3007)...
start "workflow-crud-service :3007" cmd /k "cd /d %ROOT%\services\workflow-crud-service && npm run dev"
timeout /t 3 /nobreak > nul

REM ─── 7. Main worker :3001 ────────────────────────────────────────────────────
echo [7/7] Starting worker (port 3001) — logs appear here...
echo.
cd /d "%ROOT%\worker"
npm run dev
