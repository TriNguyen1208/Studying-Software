FROM node:18-bullseye-slim

# Cài đặt FFmpeg bên trong container
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Tạo thư mục làm việc
WORKDIR /app

# Khởi tạo package.json giả định cho worker (nếu cần tách biệt)
# Tuy nhiên ở demo này ta dùng chung package.json ở thư mục gốc
# Nên ta copy toàn bộ code vào
COPY package*.json ../
RUN npm install

# Copy source code worker và backend (vì worker dùng chung model Mongoose)
COPY . .

# Chạy worker
CMD ["node", "worker/index.js"]
