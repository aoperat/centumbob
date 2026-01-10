# 뷰어 Dockerfile (개발 서버)
FROM node:20-alpine

WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치 (npm install을 사용하여 package-lock.json이 없거나 동기화되지 않은 경우에도 작동)
RUN npm install

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 9103

# 개발 서버 실행
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

