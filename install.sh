#!/usr/bin/env bash
# Install Unofficial 𝕏 (Twitter) Video Liberator (Linux AppImage)
# from the latest GitHub Release. Review this file before piping to bash.
set -euo pipefail

REPO="${XVW_REPO:-computeralex/x-video-window}"
API_BASE="${XVW_API_BASE:-https://api.github.com}"
INSTALL_DIR="${XVW_INSTALL_DIR:-${HOME}/.local/bin}"
DESKTOP_DIR="${XVW_DESKTOP_DIR:-${XDG_DATA_HOME:-${HOME}/.local/share}/applications}"
BIN_NAME="${XVW_BIN_NAME:-x-video-window}"
PRODUCT_NAME="Unofficial 𝕏 (Twitter) Video Liberator"
WRITE_DESKTOP=1

usage() {
  cat <<EOF
Usage: install.sh [--no-desktop] [--help]

Downloads the latest Linux AppImage from GitHub Releases (${REPO})
and installs it to ${INSTALL_DIR}/${BIN_NAME}.

  --no-desktop   Skip writing a .desktop launcher / xvw: handler
  --help         Show this help

Environment:
  XVW_REPO          GitHub owner/name (default: ${REPO})
  XVW_INSTALL_DIR   Install directory (default: ~/.local/bin)
  XVW_DESKTOP_DIR   .desktop directory (default: ~/.local/share/applications)
  XVW_API_BASE      GitHub API base (override for tests)
  XVW_RELEASE_JSON  Path to a cached release JSON (skip the network)
EOF
}

while [ "${1:-}" != "" ]; do
  case "$1" in
    --no-desktop) WRITE_DESKTOP=0 ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "install.sh: unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "install.sh: missing required command: $1" >&2
    exit 1
  fi
}

need curl
need python3
need mkdir
need chmod
need mktemp

arch_token() {
  case "$(uname -m)" in
    x86_64|amd64) echo "x64|amd64|x86_64" ;;
    aarch64|arm64) echo "arm64|aarch64" ;;
    *) echo "" ;;
  esac
}

fetch_release_json() {
  if [ -n "${XVW_RELEASE_JSON:-}" ]; then
    if [ ! -f "${XVW_RELEASE_JSON}" ]; then
      echo "install.sh: XVW_RELEASE_JSON is not a file: ${XVW_RELEASE_JSON}" >&2
      exit 1
    fi
    cat "${XVW_RELEASE_JSON}"
    return
  fi

  local url="${API_BASE}/repos/${REPO}/releases/latest"
  local code
  local body
  body="$(mktemp)"
  code="$(curl -fsSL --max-time 20 -o "${body}" -w "%{http_code}" -H "Accept: application/vnd.github+json" "${url}" || true)"
  if [ "${code}" != "200" ]; then
    echo "install.sh: no GitHub Release found for ${REPO}." >&2
    echo "  Looked at ${url} (HTTP ${code:-failed})." >&2
    echo "  Publish a tag like v1.0.0 (Release workflow) so an AppImage exists." >&2
    rm -f "${body}"
    exit 1
  fi
  cat "${body}"
  rm -f "${body}"
}

# Print browser_download_url of the best AppImage for this machine.
pick_appimage_url() {
  local json="$1"
  local patterns
  patterns="$(arch_token)"
  if [ -z "${patterns}" ]; then
    echo "install.sh: unsupported CPU $(uname -m). Need x86_64 or arm64." >&2
    exit 1
  fi

  local urls
  urls="$(printf '%s' "${json}" | python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
except Exception as exc:
    sys.stderr.write(f"install.sh: could not parse release JSON: {exc}\n")
    sys.exit(1)
assets = data.get("assets") or []
urls = []
for asset in assets:
    name = (asset.get("name") or "")
    url = asset.get("browser_download_url") or ""
    if name.lower().endswith(".appimage") and url:
        urls.append(url)
if not urls:
    sys.exit(3)
print("\n".join(urls))
' || true)"

  if [ -z "${urls}" ]; then
    echo "install.sh: latest GitHub Release for ${REPO} has no Linux AppImage yet." >&2
    echo "  Tag a v* release (or run the Release workflow) so an AppImage is uploaded." >&2
    exit 1
  fi

  local url
  local picked=""
  while IFS= read -r url; do
    if printf '%s' "${url}" | grep -Eiq "${patterns}"; then
      picked="${url}"
      break
    fi
  done <<EOF
${urls}
EOF

  if [ -z "${picked}" ]; then
    # One AppImage is better than failing on a generic filename.
    picked="$(printf '%s\n' "${urls}" | head -n 1)"
  fi
  printf '%s\n' "${picked}"
}

json="$(fetch_release_json)"
asset_url="$(pick_appimage_url "${json}")"

mkdir -p "${INSTALL_DIR}"
dest="${INSTALL_DIR}/${BIN_NAME}"
tmp="$(mktemp "${TMPDIR:-/tmp}/xvw-XXXXXX.AppImage")"
trap 'rm -f "${tmp}"' EXIT

echo "Downloading ${asset_url}"
if [[ "${asset_url}" == file://* ]]; then
  cp "${asset_url#file://}" "${tmp}"
elif ! curl -fL --retry 2 --max-time 60 -o "${tmp}" "${asset_url}"; then
  echo "install.sh: download failed: ${asset_url}" >&2
  exit 1
fi
if [ ! -s "${tmp}" ]; then
  echo "install.sh: downloaded file is empty: ${asset_url}" >&2
  exit 1
fi

chmod +x "${tmp}"
mv -f "${tmp}" "${dest}"
trap - EXIT
chmod +x "${dest}"
echo "Installed ${PRODUCT_NAME} → ${dest}"

if [ "${WRITE_DESKTOP}" = "1" ]; then
  mkdir -p "${DESKTOP_DIR}"
  desktop_file="${DESKTOP_DIR}/x-video-window.desktop"
  cat > "${desktop_file}" <<EOF
[Desktop Entry]
Type=Application
Name=${PRODUCT_NAME}
Comment=Freely resizable unofficial X / Twitter video window
Exec=${dest} %u
Icon=video-display
Terminal=false
Categories=AudioVideo;Player;Network;
MimeType=x-scheme-handler/xvw;
StartupWMClass=x-video-window
EOF
  echo "Wrote desktop entry → ${desktop_file}"
  if [ "${XVW_SKIP_XDG:-}" != "1" ]; then
    if command -v update-desktop-database >/dev/null 2>&1; then
      update-desktop-database "${DESKTOP_DIR}" >/dev/null 2>&1 || true
    fi
    if command -v xdg-mime >/dev/null 2>&1; then
      xdg-mime default x-video-window.desktop x-scheme-handler/xvw >/dev/null 2>&1 || true
    fi
  fi
fi

echo "Launch with: ${dest}"
echo "Or open a link: xvw:https://x.com/i/status/…"
