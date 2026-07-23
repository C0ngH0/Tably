#!/bin/bash
set -Eeuo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
/bin/bash "${SCRIPT_DIRECTORY}/../../scripts/install_tls_from_ssm.sh"
