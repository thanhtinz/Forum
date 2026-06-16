#!/usr/bin/env bash
# ============================================================
# Forum AI Platform — Sao lưu DB + (tuỳ chọn) đẩy lên cloud
#
# Dùng:        ./scripts/backup.sh
# Tự động:     thêm vào crontab (xem DEPLOY.md mục Sao lưu)
#
# Biến tuỳ chỉnh (qua môi trường hoặc .env.production):
#   BACKUP_DIR     thư mục lưu backup       (mặc định ./backups)
#   KEEP_DAYS      số ngày giữ backup local (mặc định 7)
#   RCLONE_REMOTE  đích cloud của rclone     (vd "gdrive:forum-backups" hoặc "s3:bucket/path")
#                  -> nếu đặt và đã cài rclone, file backup sẽ được copy lên cloud.
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

# Nạp biến từ .env.production (lấy POSTGRES_USER / POSTGRES_DB …)
if [ -f .env.production ]; then
  set -a; . ./.env.production; set +a
fi

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"
PG_USER="${POSTGRES_USER:-forum}"
PG_DB="${POSTGRES_DB:-forum}"

mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/forum_$(date +%F_%H%M).sql.gz"

echo "==> Sao lưu cơ sở dữ liệu -> $FILE"
$COMPOSE exec -T postgres pg_dump -U "$PG_USER" "$PG_DB" | gzip > "$FILE"

echo "==> Xoá backup cũ hơn ${KEEP_DAYS} ngày"
find "$BACKUP_DIR" -name 'forum_*.sql.gz' -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true

# Đẩy lên cloud nếu cấu hình rclone
if [ -n "${RCLONE_REMOTE:-}" ]; then
  if command -v rclone >/dev/null 2>&1; then
    echo "==> Tải lên cloud: $RCLONE_REMOTE"
    rclone copy "$FILE" "$RCLONE_REMOTE"
  else
    echo "⚠️  Đã đặt RCLONE_REMOTE nhưng chưa cài rclone (https://rclone.org/install). Bỏ qua upload."
  fi
fi

echo "✅ Hoàn tất: $FILE"
