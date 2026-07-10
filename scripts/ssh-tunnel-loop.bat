@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM  ssh-tunnel-loop.bat  —  Auto-reconnecting SSH tunnel for local DB access
REM
REM  Routes: localhost:5433 → EC2:22 → RDS:5432
REM  Reconnects immediately after any disconnect (ISP drop, sleep, etc.)
REM
REM  Run this once (minimised), then npm run dev works from any terminal.
REM ─────────────────────────────────────────────────────────────────────────────

set SSH_KEY=%USERPROFILE%\.ssh\id_ed25519
set JUMP_HOST=root@187.127.185.105
set RDS_HOST=ctrlchecks-db.cxm8gymyysvy.ap-south-1.rds.amazonaws.com
set LOCAL_PORT=5433

title DB Tunnel — localhost:%LOCAL_PORT% ^> RDS (keep open)
echo.
echo  ============================================
echo   CtrlChecks DB Tunnel
echo   localhost:%LOCAL_PORT% --[Hostinger]--> RDS:5432
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
    -L %LOCAL_PORT%:%RDS_HOST%:5432 ^
    %JUMP_HOST%
echo [%TIME%] Tunnel exited (code %ERRORLEVEL%). Reconnecting in 3s...
timeout /t 3 /nobreak > nul
goto loop
