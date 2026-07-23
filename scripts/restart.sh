#!/usr/bin/env bash
# Stops and restarts the Docker Compose stack (api, nginx, web) in detached mode.
# Any arguments passed to this script are forwarded as-is to `docker compose up`
# (e.g. `./restart.sh --build`, `./restart.sh --build --force-recreate`).

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

docker compose down
docker compose up -d "$@"
