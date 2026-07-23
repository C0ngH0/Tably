#!/bin/bash
set -Eeuo pipefail
umask 077

CERT_PARAMETER="/tably/ssl/origin-cert"
KEY_PARAMETER="/tably/ssl/origin-key"
CERT_DIRECTORY="/etc/pki/tls/certs"
KEY_DIRECTORY="/etc/pki/tls/private"
CERT_PATH="${CERT_DIRECTORY}/tably-cloudflare-origin.pem"
KEY_PATH="${KEY_DIRECTORY}/tably-cloudflare-origin.key"
GET_CONFIG="/opt/elasticbeanstalk/bin/get-config"

if ! command -v aws >/dev/null 2>&1; then
  echo "TLS installation failed: AWS CLI is unavailable." >&2
  exit 1
fi

REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-}}"
if [[ -z "${REGION}" && -x "${GET_CONFIG}" ]]; then
  REGION="$("${GET_CONFIG}" environment -k AWS_REGION 2>/dev/null || true)"
fi

if [[ -z "${REGION}" ]]; then
  echo "TLS installation failed: AWS_REGION is not configured." >&2
  exit 1
fi

TEMP_DIRECTORY="$(mktemp -d /run/tably-tls.XXXXXX)"
CERT_STAGE=""
KEY_STAGE=""

cleanup() {
  rm -rf "${TEMP_DIRECTORY}"
  [[ -z "${CERT_STAGE}" ]] || rm -f "${CERT_STAGE}"
  [[ -z "${KEY_STAGE}" ]] || rm -f "${KEY_STAGE}"
}
trap cleanup EXIT

chmod 0700 "${TEMP_DIRECTORY}"

aws ssm get-parameter \
  --region "${REGION}" \
  --name "${CERT_PARAMETER}" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text \
  --no-cli-pager > "${TEMP_DIRECTORY}/certificate.pem"

aws ssm get-parameter \
  --region "${REGION}" \
  --name "${KEY_PARAMETER}" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text \
  --no-cli-pager > "${TEMP_DIRECTORY}/private.key"

if ! grep -q -- "-----BEGIN CERTIFICATE-----" "${TEMP_DIRECTORY}/certificate.pem"; then
  echo "TLS installation failed: the certificate parameter is not PEM encoded." >&2
  exit 1
fi

if ! grep -Eq -- "-----BEGIN (RSA |EC )?PRIVATE KEY-----" "${TEMP_DIRECTORY}/private.key"; then
  echo "TLS installation failed: the private-key parameter is not PEM encoded." >&2
  exit 1
fi

install -d -o root -g root -m 0755 "${CERT_DIRECTORY}"
install -d -o root -g root -m 0700 "${KEY_DIRECTORY}"

CERT_STAGE="$(mktemp "${CERT_DIRECTORY}/.tably-cloudflare-origin.pem.XXXXXX")"
KEY_STAGE="$(mktemp "${KEY_DIRECTORY}/.tably-cloudflare-origin.key.XXXXXX")"

install -o root -g root -m 0644 \
  "${TEMP_DIRECTORY}/certificate.pem" \
  "${CERT_STAGE}"
install -o root -g root -m 0600 \
  "${TEMP_DIRECTORY}/private.key" \
  "${KEY_STAGE}"

mv -f "${KEY_STAGE}" "${KEY_PATH}"
KEY_STAGE=""
mv -f "${CERT_STAGE}" "${CERT_PATH}"
CERT_STAGE=""

echo "TLS certificate and private key installed from SSM Parameter Store."
