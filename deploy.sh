#!/bin/bash
# =============================================================================
# POS JAGAD — Frontend Deploy Script
# Jalankan di VPS: bash deploy.sh
# APK WebView otomatis mengikuti — tidak perlu rebuild APK
# =============================================================================
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
info() { echo -e "${YELLOW}[..] $1${NC}"; }
fail() { echo -e "${RED}[!!] $1${NC}"; exit 1; }

echo ""
echo "============================================="
echo "  POS JAGAD Frontend Deploy"
echo "  Dir: $APP_DIR"
echo "  APK load dari server — no rebuild needed"
echo "============================================="

cd "$APP_DIR"

# ── 0. Git pull ───────────────────────────────────────────────────────────────
info "[1/4] Git pull latest code..."
git pull
ok "Code updated"

# ── 1. npm install ───────────────────────────────────────────────────────────
info "[2/4] npm install..."
npm install
ok "Dependencies installed"

# ── 2. Build ─────────────────────────────────────────────────────────────────
info "[3/4] Building frontend..."
npm run build
ok "Build complete → dist/"

# ── 3. Copy dist ke nginx web root (sesuaikan path jika beda) ────────────────
NGINX_ROOT="/var/www/pos-jagad"
if [ -d "$NGINX_ROOT" ]; then
  info "[4/4] Copying dist/ → $NGINX_ROOT..."
  cp -r dist/. "$NGINX_ROOT/"
  ok "Files copied to $NGINX_ROOT"
else
  info "[4/4] $NGINX_ROOT tidak ditemukan — skip copy"
  info "      Pastikan nginx root mengarah ke: $APP_DIR/dist"
  info "      Atau set NGINX_ROOT di atas sesuai server kamu"
fi

echo ""
echo "============================================="
echo -e "  ${GREEN}Deploy FE selesai!${NC}"
echo "  APK WebView akan auto-load versi terbaru"
echo "============================================="
echo ""
