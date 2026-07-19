@echo off
REM Builds and starts the Docker Compose stack (api, nginx, web) in detached mode.
REM Requires a reachable host PostgreSQL instance - see CLAUDE.md / docs/PLAN.md.

setlocal
cd /d "%~dp0.."
docker compose up --build -d
endlocal
