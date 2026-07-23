@echo off
REM Stops and removes the Docker Compose stack (api, nginx, web).

setlocal
cd /d "%~dp0.."
docker compose down
endlocal
