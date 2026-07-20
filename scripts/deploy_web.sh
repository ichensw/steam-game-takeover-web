#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DEPLOY_HOST="${DEPLOY_HOST:-47.102.200.211}"
DEPLOY_USER="${DEPLOY_USER:-root}"
WEB_DIR="${WEB_DIR:-/opt/steam-game-takeover-web}"
PUBLIC_URLS="${PUBLIC_URLS:-https://www.rabbits.ink/ https://www.rabbits.ink/reports https://www.rabbits.ink/users}"
DEPLOY_SSH_OPTS="${DEPLOY_SSH_OPTS:-}"

DEFAULT_PASSWORD_FILE="$HOME/.config/steam-game-takeover-web/deploy-password"
if [[ ! -s "$DEFAULT_PASSWORD_FILE" && -s "$HOME/.config/steam-game-takeover-backend/deploy-password" ]]; then
  DEFAULT_PASSWORD_FILE="$HOME/.config/steam-game-takeover-backend/deploy-password"
fi
DEPLOY_PASSWORD_FILE="${DEPLOY_PASSWORD_FILE:-$DEFAULT_PASSWORD_FILE}"

REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"
ARCHIVE_TO_CLEAN=""

if [[ -n "$DEPLOY_SSH_OPTS" ]]; then
  # shellcheck disable=SC2206
  SSH_ARGS=($DEPLOY_SSH_OPTS)
else
  SSH_ARGS=(-o StrictHostKeyChecking=accept-new)
fi

if [[ -n "${DEPLOY_PASSWORD:-}" || -s "$DEPLOY_PASSWORD_FILE" ]]; then
  SSH_ARGS+=(-o PreferredAuthentications=password -o PubkeyAuthentication=no)
fi

log() {
  printf '[%s] %s\n' "$1" "$2"
}

cleanup() {
  if [[ -n "${ARCHIVE_TO_CLEAN:-}" ]]; then
    rm -f "$ARCHIVE_TO_CLEAN"
  fi
}

trap cleanup EXIT

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log ERROR "$1 was not found in PATH."
    exit 1
  fi
}

run_remote() {
  if [[ -z "${DEPLOY_PASSWORD:-}" && ! -s "$DEPLOY_PASSWORD_FILE" ]]; then
    "$@"
    return
  fi

  local askpass exit_code
  askpass="$(mktemp "${TMPDIR:-/tmp}/steam-takeover-web-askpass.XXXXXX")"
  chmod 700 "$askpass"
  if [[ -n "${DEPLOY_PASSWORD:-}" ]]; then
    cat > "$askpass" <<'ASKPASS_SCRIPT'
#!/usr/bin/env bash
printf '%s\n' "$DEPLOY_PASSWORD"
ASKPASS_SCRIPT
  else
    printf '#!/usr/bin/env bash\nexec cat %q\n' "$DEPLOY_PASSWORD_FILE" > "$askpass"
  fi

  set +e
  DISPLAY=:0 SSH_ASKPASS="$askpass" SSH_ASKPASS_REQUIRE=force "$@"
  exit_code=$?
  set -e
  rm -f "$askpass"
  return "$exit_code"
}

ssh_remote() {
  run_remote ssh "${SSH_ARGS[@]}" "$REMOTE" "$@"
}

scp_remote() {
  run_remote scp "${SSH_ARGS[@]}" "$@"
}

verify_public_urls() {
  local url
  for url in $PUBLIC_URLS; do
    curl -fsS --max-time 10 "$url" >/dev/null
    log OK "Public URL available: $url"
  done
}

status() {
  log INFO "Remote: $REMOTE"
  ssh_remote bash -s -- "$WEB_DIR" <<'REMOTE_SCRIPT'
set -u
WEB_DIR="$1"

echo "[INFO] Web dist:"
ls -ld "$WEB_DIR/dist" 2>/dev/null || true
ls -lh "$WEB_DIR/dist/index.html" 2>/dev/null || true

echo
echo "[INFO] Recent backups:"
ls -1dt "$WEB_DIR"/backups/dist.* 2>/dev/null | head -5 || true

echo
echo "[INFO] Nginx config:"
nginx -t
REMOTE_SCRIPT

  echo
  log INFO "Checking public URLs..."
  verify_public_urls
}

deploy() {
  need npm
  need tar
  need ssh
  need scp
  need curl

  cd "$ROOT_DIR"

  if [[ "${SKIP_TESTS:-0}" != "1" ]]; then
    log INFO "Running tests..."
    npm test
  fi

  log INFO "Building frontend..."
  npm run build

  local stamp archive remote_archive
  stamp="$(date +%Y%m%d%H%M%S)"
  archive="$(mktemp "${TMPDIR:-/tmp}/steam-game-takeover-web-dist.XXXXXX").tgz"
  ARCHIVE_TO_CLEAN="$archive"
  remote_archive="/tmp/steam-game-takeover-web-dist.$stamp.tgz"

  log INFO "Packing dist..."
  COPYFILE_DISABLE=1 tar --format ustar -czf "$archive" -C "$ROOT_DIR" dist

  log INFO "Uploading dist archive..."
  scp_remote "$archive" "$REMOTE:$remote_archive"

  log INFO "Installing frontend and reloading nginx..."
  ssh_remote bash -s -- "$WEB_DIR" "$remote_archive" <<'REMOTE_SCRIPT'
set -euo pipefail
WEB_DIR="$1"
REMOTE_ARCHIVE="$2"
STAMP="$(date +%Y%m%d%H%M%S)"

mkdir -p "$WEB_DIR/backups"
if [[ -d "$WEB_DIR/dist" ]]; then
  mv "$WEB_DIR/dist" "$WEB_DIR/backups/dist.$STAMP.bak"
fi

tar -xzf "$REMOTE_ARCHIVE" -C "$WEB_DIR"
chown -R root:root "$WEB_DIR/dist"
rm -f "$REMOTE_ARCHIVE"

test -f "$WEB_DIR/dist/index.html"
nginx -t
systemctl reload nginx
REMOTE_SCRIPT

  log OK "Frontend deployed."
  log INFO "Checking public URLs..."
  verify_public_urls
}

usage() {
  cat <<EOF
Usage:
  $0 status
  $0 deploy

Options by environment variable:
  DEPLOY_HOST          default: $DEPLOY_HOST
  DEPLOY_USER          default: $DEPLOY_USER
  WEB_DIR              default: $WEB_DIR
  PUBLIC_URLS          default: $PUBLIC_URLS
  DEPLOY_SSH_OPTS      optional ssh/scp options, for example "-i ~/.ssh/id_rsa"
  DEPLOY_PASSWORD_FILE local password file, default: $DEPLOY_PASSWORD_FILE
  DEPLOY_PASSWORD      optional SSH password from environment
  SKIP_TESTS           set to 1 to skip npm test during urgent deploys

The password is read from the local private file or environment, never from this repository.
EOF
}

case "${1:-status}" in
  status)
    need ssh
    need curl
    status
    ;;
  deploy)
    deploy
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage
    exit 1
    ;;
esac
