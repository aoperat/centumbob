# 백엔드 Dockerfile
FROM node:20-slim

# Puppeteer를 위한 의존성 설치
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치 (개발 의존성 포함 - puppeteer 등)
RUN npm ci

# 소스 코드 복사
COPY . .

# 필요한 디렉토리 생성
RUN mkdir -p uploads db _posts/assets/images

# 포트 노출
EXPOSE 9101

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=9101

# 서버 실행
CMD ["node", "server.js"]

