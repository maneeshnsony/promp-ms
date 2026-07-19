@echo off
REM Starts the Docker Compose stack (api, nginx, web) in detached mode.
REM Requires a reachable host PostgreSQL instance - see CLAUDE.md / docs/PLAN.md.
REM Any arguments passed to this script are forwarded as-is to `docker compose up`
REM (e.g. `start.cmd --build`, `start.cmd --build --force-recreate`).

setlocal
cd /d "%~dp0.."
docker compose up -d %*
endlocal
