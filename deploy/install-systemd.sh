#!/usr/bin/env bash
# Install the AFFiNE Fumadocs publisher as a systemd user or system service.
#
# Usage (from the consumer app root that has package.json + scripts/affine-publisher-service.ts):
#   bash path/to/affine-fumadocs-publisher/deploy/install-systemd.sh
#   bash path/to/affine-fumadocs-publisher/deploy/install-systemd.sh --system
#
# Prerequisites: Node 22+, pnpm, affine-mcp on PATH, filled .env.publisher

set -euo pipefail

MODE="user"
ROOT="$(pwd)"
UNIT_SRC=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --system) MODE="system"; shift ;;
    --root) ROOT="$(cd "$2" && pwd)"; shift 2 ;;
    --unit) UNIT_SRC="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

UNIT_SRC="${UNIT_SRC:-$SCRIPT_DIR/systemd/affine-publisher.service}"
if [[ ! -f "$ROOT/package.json" || ! -f "$ROOT/scripts/affine-publisher-service.ts" ]]; then
  echo "Run this from the consumer app root (needs package.json and scripts/affine-publisher-service.ts)." >&2
  echo "Or pass --root /path/to/app" >&2
  exit 1
fi
if [[ ! -f "$ROOT/.env.publisher" ]]; then
  echo "Missing $ROOT/.env.publisher — copy .env.publisher.example and fill secrets first." >&2
  exit 1
fi
if [[ ! -f "$UNIT_SRC" ]]; then
  echo "Unit template not found: $UNIT_SRC" >&2
  exit 1
fi

NODE_BIN="$(command -v node)"
PNPM_BIN="$(command -v pnpm || true)"
MCP_BIN="$(command -v affine-mcp || true)"
if [[ -z "$NODE_BIN" ]]; then echo "node not found on PATH" >&2; exit 1; fi
if [[ -z "$PNPM_BIN" ]]; then echo "pnpm not found on PATH (needed for builds/releases)" >&2; exit 1; fi
if [[ -z "$MCP_BIN" ]]; then
  echo "warning: affine-mcp not found on PATH. Install: npm install -g affine-mcp-server" >&2
fi

PUBLISHER_USER="$(id -un)"
PUBLISHER_GROUP="$(id -gn)"
PUBLISHER_PATH="$(dirname "$NODE_BIN"):$(dirname "$PNPM_BIN"):/usr/local/bin:/usr/bin:/bin"
if [[ -n "$MCP_BIN" ]]; then
  PUBLISHER_PATH="$(dirname "$MCP_BIN"):$PUBLISHER_PATH"
fi

mkdir -p "$ROOT/.affine-publisher/logs"
chmod 700 "$ROOT/.affine-publisher" "$ROOT/.affine-publisher/logs" || true
chmod 600 "$ROOT/.env.publisher" || true

RENDERED="$(mktemp)"
cleanup() { rm -f "$RENDERED"; }
trap cleanup EXIT

sed \
  -e "s|__PUBLISHER_USER__|$PUBLISHER_USER|g" \
  -e "s|__PUBLISHER_GROUP__|$PUBLISHER_GROUP|g" \
  -e "s|__PUBLISHER_ROOT__|$ROOT|g" \
  -e "s|__PUBLISHER_PATH__|$PUBLISHER_PATH|g" \
  -e "s|__PUBLISHER_NODE__|$NODE_BIN|g" \
  "$UNIT_SRC" > "$RENDERED"

UNIT_NAME="affine-publisher.service"

if [[ "$MODE" == "system" ]]; then
  if [[ "$(id -u)" -ne 0 ]]; then
    echo "system mode requires root (sudo)." >&2
    exit 1
  fi
  install -m 0644 "$RENDERED" "/etc/systemd/system/$UNIT_NAME"
  systemctl daemon-reload
  systemctl enable --now "$UNIT_NAME"
  systemctl --no-pager --full status "$UNIT_NAME" || true
  echo "Installed system unit: systemctl status $UNIT_NAME"
  echo "Logs: journalctl -u $UNIT_NAME -f"
else
  # User units already run as the installing user; User=/Group= cause status=217/USER.
  # WantedBy=multi-user.target is system-only; user sessions use default.target.
  USER_RENDERED="$(mktemp)"
  sed \
    -e '/^User=/d' \
    -e '/^Group=/d' \
    -e 's|^WantedBy=multi-user.target$|WantedBy=default.target|' \
    "$RENDERED" > "$USER_RENDERED"
  mv "$USER_RENDERED" "$RENDERED"
  mkdir -p "$HOME/.config/systemd/user"
  install -m 0644 "$RENDERED" "$HOME/.config/systemd/user/$UNIT_NAME"
  systemctl --user daemon-reload
  systemctl --user enable --now "$UNIT_NAME"
  # Linger so the user service survives logout on a VPS.
  if command -v loginctl >/dev/null 2>&1; then
    loginctl enable-linger "$PUBLISHER_USER" 2>/dev/null || true
  fi
  systemctl --user --no-pager --full status "$UNIT_NAME" || true
  echo "Installed user unit: systemctl --user status $UNIT_NAME"
  echo "Logs: journalctl --user -u $UNIT_NAME -f"
  echo "File logs: $ROOT/.affine-publisher/logs/"
fi
