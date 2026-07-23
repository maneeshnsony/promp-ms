#!/usr/bin/env bash
# Stops and removes the Docker Compose stack (api, nginx, web).

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

docker compose down
