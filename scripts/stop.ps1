# Stops and removes the Docker Compose stack (api, nginx, web).

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

Push-Location $repoRoot
try {
    docker compose down
} finally {
    Pop-Location
}
