# Builds and starts the Docker Compose stack (api, nginx, web) in detached mode.
# Requires a reachable host PostgreSQL instance — see CLAUDE.md / docs/PLAN.md.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

Push-Location $repoRoot
try {
    docker compose up --build -d
} finally {
    Pop-Location
}
