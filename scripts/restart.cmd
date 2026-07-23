@echo off
REM Stops and restarts the Docker Compose stack (api, nginx, web) in detached mode.
REM Any arguments passed to this script are forwarded as-is to `docker compose up`
REM (e.g. `restart.cmd --build`, `restart.cmd --build --force-recreate`).

setlocal
cd /d "%~dp0.."
docker compose down
docker compose up -d %*
endlocal
