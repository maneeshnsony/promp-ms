#!/usr/bin/env bash
# Starts the Docker Compose stack (api, nginx, web) in detached mode.
# Requires a reachable host PostgreSQL instance - see CLAUDE.md / docs/PLAN.md.
# Any arguments passed to this script are forwarded as-is to `docker compose up`
# (e.g. `./start.sh --build`, `./start.sh --build --force-recreate`).

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

docker compose up -d "$@"
