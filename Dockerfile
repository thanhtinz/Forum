FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
EXPOSE 3001
# Repo chưa commit migration -> dùng db push để đồng bộ schema khi khởi động.
# Đổi sang "prisma migrate deploy" nếu sau này dùng migration.
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && node dist/main"]
