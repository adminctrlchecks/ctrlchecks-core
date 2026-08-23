@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM  ssh-tunnel-loop.bat  —  Auto-reconnecting SSH tunnel for local DB access
REM
REM  UPDATED 2026-08: the database no longer lives on AWS RDS — it was migrated
REM  to run directly on the Hostinger production server. This tunnel now forwards
REM  straight to Postgres on that box (localhost:5432 FROM THE SERVER'S OWN POV),
REM  not through it to a separate RDS host.
REM
REM  Routes: localhost:5433 (your machine) → Hostinger:22 → Hostinger's own
REM          Postgres on 127.0.0.1:5432 (as seen from inside that server)
REM  Reconnects immediately after any disconnect (ISP drop, sleep, etc.)
REM
REM  Run this once (minimised), then set your local worker/.env to:
REM    DATABASE_URL=postgresql://<user>:<pass>@localhost:5433/ctrlchecks
REM  (get <user>/<pass> from whoever manages the Hostinger box — do not point
REM  local dev at the live production DB unless you know what you're doing;
REM  prefer a local Postgres instance for day-to-day dev where possible.)
REM ─────────────────────────────────────────────────────────────────────────────

set SSH_KEY=%USERPROFILE%\.ssh\id_ed25519
set JUMP_HOST=root@187.127.185.105
set REMOTE_DB_HOST=localhost
set REMOTE_DB_PORT=5432
set LOCAL_PORT=5433

title DB Tunnel — localhost:%LOCAL_PORT% ^> Hostinger Postgres (keep open)
echo.
echo  ============================================
echo   CtrlChecks DB Tunnel (Hostinger-hosted Postgres, not AWS RDS)
echo   localhost:%LOCAL_PORT% --[SSH to %JUMP_HOST%]--^> %REMOTE_DB_HOST%:%REMOTE_DB_PORT%
echo   DO NOT CLOSE THIS WINDOW
echo  ============================================
echo.

:loop
echo [%TIME%] Connecting SSH tunnel...
ssh -i "%SSH_KEY%" -N ^
    -o StrictHostKeyChecking=no ^
    -o ServerAliveInterval=10 ^
    -o ServerAliveCountMax=6 ^
    -o ExitOnForwardFailure=no ^
    -o TCPKeepAlive=yes ^
    -L %LOCAL_PORT%:%REMOTE_DB_HOST%:%REMOTE_DB_PORT% ^
    %JUMP_HOST%
echo [%TIME%] Tunnel exited (code %ERRORLEVEL%). Reconnecting in 3s...
timeout /t 3 /nobreak > nul
goto loop
