@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM  db-tunnel.bat  —  DEPRECATED (2026-08)
REM
REM  This script tunneled to an AWS RDS instance (via an old EC2 jump host,
REM  3.7.115.58, using a .pem key) that no longer exists — the database was
REM  migrated off AWS RDS entirely and now runs directly on the Hostinger
REM  production server. That old EC2 host and RDS instance are gone; this
REM  script will not work.
REM
REM  Use ssh-tunnel-loop.bat instead — it tunnels straight to Postgres on the
REM  current Hostinger server (root@187.127.185.105) using the current SSH key
REM  (~/.ssh/id_ed25519), with auto-reconnect.
REM ─────────────────────────────────────────────────────────────────────────────

echo.
echo  db-tunnel.bat is DEPRECATED — it pointed at an AWS RDS instance that no
echo  longer exists (the database now runs directly on the Hostinger server).
echo.
echo  Use ssh-tunnel-loop.bat instead.
echo.
pause
