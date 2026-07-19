#!/usr/bin/env bash
# Builds and starts the Docker Compose stack (api, nginx, web) in detached mode.
# Requires a reachable host PostgreSQL instance - see CLAUDE.md / docs/PLAN.md.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

docker compose up --build -d
