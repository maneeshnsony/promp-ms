# Starts the Docker Compose stack (api, nginx, web) in detached mode.
# Requires a reachable host PostgreSQL instance — see CLAUDE.md / docs/PLAN.md.
# Any arguments passed to this script are forwarded as-is to `docker compose up`
# (e.g. `.\start.ps1 --build`, `.\start.ps1 --build --force-recreate`).

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

Push-Location $repoRoot
try {
    docker compose up -d @args
} finally {
    Pop-Location
}
