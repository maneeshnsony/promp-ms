# Stops and restarts the Docker Compose stack (api, nginx, web) in detached mode.
# Any arguments passed to this script are forwarded as-is to `docker compose up`
# (e.g. `.\restart.ps1 --build`, `.\restart.ps1 --build --force-recreate`).

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

Push-Location $repoRoot
try {
    docker compose down
    docker compose up -d @args
} finally {
    Pop-Location
}
