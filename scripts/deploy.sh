#!/usr/bin/env bash
# ============================================================
# Forum AI Platform — Script triển khai / cập nhật trên VPS
# Dùng:  ./scripts/deploy.sh
# (Lần đầu cần: chmod +x scripts/deploy.sh)
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

echo "==> Kiểm tra file .env.production"
if [ ! -f .env.production ]; then
  echo "❌ Chưa có .env.production. Hãy chạy: cp .env.production.example .env.production && nano .env.production"
  exit 1
fi

echo "==> Kéo code mới nhất từ git (nhánh main)"
if [ -d .git ]; then
  git pull origin main || echo "⚠️  Bỏ qua git pull (không bắt buộc)."
fi

echo "==> Build & khởi động containers"
$COMPOSE up -d --build

echo "==> Dọn image cũ không dùng"
docker image prune -f >/dev/null 2>&1 || true

echo "==> Trạng thái hiện tại"
$COMPOSE ps

echo ""
echo "✅ Hoàn tất! Mở https://$(grep -E '^DOMAIN=' .env.production | cut -d= -f2)"
echo "   Xem log:  $COMPOSE logs -f app"
