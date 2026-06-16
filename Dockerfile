# ── Build frontend (Next.js static export -> /fe/out) ──
FROM node:22-alpine AS frontend
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Build backend (NestJS) ──
FROM node:22-alpine AS backend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Runtime: 1 process phục vụ cả API + frontend ──
FROM node:22-alpine
WORKDIR /app
COPY --from=backend /app/node_modules ./node_modules
COPY --from=backend /app/dist ./dist
COPY --from=backend /app/prisma ./prisma
COPY package*.json ./
# Frontend export đặt đúng nơi ServeStaticModule đọc (frontend/out)
COPY --from=frontend /fe/out ./frontend/out
# Thư mục lưu ảnh người dùng tải lên (gắn volume để bền vững)
RUN mkdir -p /app/uploads
EXPOSE 3001
# Đồng bộ schema rồi start. NestJS serve cả /api lẫn frontend tĩnh.
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && node dist/main"]
