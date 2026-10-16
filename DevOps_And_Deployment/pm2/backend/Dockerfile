FROM node:20-alpine

WORKDIR /app

# Cài đặt PM2 toàn cục
RUN npm install -g pm2

COPY backend/package*.json ./
RUN npm install --production

COPY backend/src ./src
COPY ecosystem.config.js ./ecosystem.config.js

EXPOSE 3000

# pm2-runtime được tối ưu hóa cho Docker (chạy foreground và chuyển tiếp logs ra stdout/stderr)
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]
