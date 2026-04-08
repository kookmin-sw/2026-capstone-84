# Chat Rooms - 실시간 채팅방 애플리케이션

주제별 대화방을 만들고, 실시간으로 메시지를 주고받을 수 있는 웹 채팅 애플리케이션입니다.

## 사전 요구사항

- Node.js (v18 이상)
- npm
- Git

## 다운로드

```bash
# 프로젝트 클론
git clone <repository-url>

# 프로젝트 디렉토리로 이동
cd chat-rooms
```

## 설치

```bash
# 서버 의존성 설치
npm install

# 클라이언트 의존성 설치
cd client
npm install
cd ..
```

## 실행 방법

### 1. 클라이언트 빌드

```bash
npm run build:client
```

### 2. 서버 실행

```bash
npm run dev:server
```

### 3. 브라우저에서 접속

```
http://localhost:3000
```

채팅 테스트를 하려면 브라우저 탭을 2개 열어서 같은 주소(`http://localhost:3000`)로 접속한 뒤, 각각 다른 사용자 이름을 입력하고 같은 대화방에 참여하면 됩니다.

## 테스트

```bash
npm test
```

## 기술 스택

- 프론트엔드: React, TypeScript, Vite, Socket.IO Client
- 백엔드: Node.js, Express, Socket.IO, SQLite (better-sqlite3)
