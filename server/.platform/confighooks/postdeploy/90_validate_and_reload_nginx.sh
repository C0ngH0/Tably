#!/bin/bash
set -Eeuo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
/bin/bash "${SCRIPT_DIRECTORY}/../../scripts/validate_and_reload_nginx.sh"
