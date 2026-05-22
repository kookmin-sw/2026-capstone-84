## 팀페이지 주소
[2026년 84조 캡스톤 깃허브](https://github.com/kookmin-sw/2026-capstone-84)

[프로젝트 소개 페이지](https://kookmin-sw.github.io/2026-capstone-84/)


## 1. 프로젝트 소개

같은 책을 읽는 사람들을 연결하고, 독서 과정의 기록을 바탕으로 자연스럽게 책 이야기를 나눌 수 있도록 돕는 AI 독서 토론 커뮤니티 ***buzzy pages***입니다.

> **같은 페이지에서 시작되는 대화** — 함께 읽은 순간이 대화로 이어지는 독서 플랫폼

'**독서 모임 참여자**는 **모임 참여, 독서 준비, 토론 진행, 이후 정리**의 각 과정에서 서로 다른 어려움을 겪어, **독서 토론에 적극적으로 참여하고 의미 있는 대화를 나누기** 어렵다.'라는 문제의식에서 출발해, 시공간의 제약 없이 책 이야기를 나누고 기록이 오래 남는 공간을 만들어가고 있습니다.

### 우리가 풀고자 한 4가지 페인 포인트

| # | Pain Point | 해결 축 |
|---|------------|--------|
| Pain ① | 기록과 독서의 분리 | 함께 머무르기 |
| Pain ② | 진도 격차 · 스포일러 | 함께 머무르기 |
| Pain ③ | 대화의 시작점 부족 | 대화를 잇기 (AI) |
| Pain ④ | 생각과 대화의 휘발 | 기록을 남기기 (AI 인사이트) |

buzzy pages는 **함께 머무르기 → 대화를 잇기 → 기록을 남기기**라는 세 흐름으로 끊어진 독서 경험을 다시 이어 붙입니다.

### 주요 기능

| 카테고리 | 기능 | 설명 |
|---------|------|------|
| 📚 독서 모임 | 모임 생성/참여 | 카카오·네이버 책 검색 API 기반 모임 생성, 공개/비공개(비밀번호) 설정 |
| | 초대 링크 | 방장이 30분 만료 초대 코드를 발급해 멤버를 초대 |
| | 모임 관리 | 방장 대시보드에서 멤버 강퇴, 모임 수정/삭제, 공지 관리, 진행률 모니터링 |
| 📝 진도 기반 메모 | 페이지 구간 메모 | 페이지 범위(p.10~15) 단위로 메모 작성, 진행률에 자동 연동 (**Pain ① 해결**) |
| | 3단계 공개 설정 | 비공개 / 공개 / 스포일러(해당 페이지까지 읽은 사람만 열람)로 같은 흐름의 사람끼리 연결 (**Pain ② 해결**) |
| | 정렬·필터 | 최신순·오래된순·페이지순 정렬과 공개 상태별 필터링 |
| 💬 스레드 토론 | 주제별 독립 스레드 | 직접 작성하거나 메모와 연결해 스레드 개설, 채팅처럼 흐르지 않고 책처럼 쌓이는 구조 |
| | 의견·대댓글 | 의견 + 답글 구조, 종료일·연장, 핀 고정 지원 |
| | 발언권 토큰 | 사용자별 의견 작성 토큰으로 한 주제에 오래 몰입할 수 있는 흐름 설계 |
| 🤖 AI 인사이트 | 토론 주제 자동 추천 | 공개 메모와 책 정보를 Gemini로 분석해 토론 주제 3개를 자동 제안 (**Pain ③ 해결**, 토론 시작 전) |
| | 유사 스레드 감지 | 새 주제가 기존 토론과 겹치지 않는지 사전 감지 |
| | 토론 요약 · 인사이트 카드 | 스레드의 요약 / 키워드 / 핵심 / 한 줄 인사이트를 카드로 정리 (**Pain ④ 해결**, 토론 종료 후) |
| | 외부 공유 | 카카오톡 / 디스코드로 인사이트 공유 |
| 📅 일정 | 캘린더 뷰 | 독서 기간, 토론일, 커스텀 일정을 한 화면에 시각화 |
| | 자동 알림 | 일정 기반 스케줄러로 사전·당일 알림 발송 |
| 👤 마이페이지 | 프로필 관리 | 닉네임 중복 확인, 프로필 이미지, 비밀번호 변경, 회원 탈퇴 |
| | 활동 내역 | 참여 모임 · 작성 메모 · 참여 토론 통합 조회 |
| | 추천 모임 | 참여 모임의 책 정보 기반 유사 모임 추천 |
| 🔔 알림 | 알림 센터 | 댓글, 공지, 일정 등 주요 이벤트 알림 통합 관리 |
| 🚨 신고 | 신고 + AI 보조 검토 | 부적절한 콘텐츠 신고 처리에 AI 검토를 보조 사용 |

## 2. 소개 영상

영상은 추후 추가될 예정입니다.

배포 URL: <http://52.3.83.52/>

## 3. 팀 소개

| Profile | Name | Role |
|--------|-------|------|
| <img src="https://github.com/cho2-0923.png" width="100px"> | [조연지](https://github.com/cho2-0923) | PM / Project Lead |
| <img src="./img/ybg_profile.jpg" width="100px"> | [양병규](https://github.com/qnfdudemr) | FE |
| <img src="https://github.com/williamjeon7.png" width="100px"> | [전석환](https://github.com/williamjeon73) | Infra |
| <img src="https://github.com/yoonjujeonn.png" width="100px"> | [전윤주](https://github.com/yoonjujeonn) | API 데이터 페칭 / 풀스택 |
| <img src="https://github.com/Choiyeonw00.png" width="100px"> | [최연우](https://github.com/Choiyeonw00) | AI |

## 4. 시스템 구조

```
사용자 브라우저
      │
      ▼
   Nginx  ── React 정적 파일(client/dist) 서빙 + /api 프록시
      │
      ▼
EC2 (서비스 실행 서버)
  ├─ client : React / Vite 기반 프론트엔드
  ├─ server : Express / TypeScript 기반 백엔드 API (PM2 관리)
  ├─ Prisma : 백엔드와 MySQL을 연결하는 ORM
  └─ MySQL  : 서비스 데이터 저장소
       │
       ├── S3                  → 이미지 파일 저장 (프로필·스레드·댓글·DB 백업)
       ├── Gemini API / Bedrock → AI 기능 처리 (주제 추천 / 요약 / 인사이트)
       └── Kakao / Naver API   → 책 검색
```

서비스 규모와 비용을 고려해 CloudFront·ALB·RDS는 도입하지 않고, EC2 한 대에서 웹·API·DB를 운영하며 휘발되면 안 되는 업로드 이미지만 S3로 분리했습니다. `FILE_STORAGE_DRIVER=local|s3` 환경변수로 로컬과 운영을 동일 코드로 전환할 수 있습니다.

## 5. 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React 18, TypeScript, Vite, Zustand, React Router v6, marked |
| Backend | Node.js, Express, TypeScript, Zod |
| ORM | Prisma |
| Database | MySQL 8.0 |
| AI | Google Gemini API (주제 추천 / 요약 / 인사이트), AWS Bedrock 점검 스크립트 |
| 외부 API | 카카오 책 검색 API, 네이버 책 검색 API |
| 인증 | JWT (Access + Refresh Token), bcrypt, 카카오 OAuth |
| 파일 저장 | 로컬 디스크 / AWS S3 (드라이버 분리) |
| 테스트 | Vitest, Supertest, fast-check (속성 기반 테스트) |
| 배포 | AWS EC2, Nginx, PM2, S3 |
| DevOps & 협업도구 | GitHub, Notion, Slack |

## 6. 실행 방법

#### 사전 요구사항

- Node.js v18 이상
- npm v9 이상
- MySQL 8.0 이상

---

#### 설치 및 실행

**1. 저장소 클론**

```bash
git clone https://github.com/kookmin-sw/2026-capstone-84.git
cd 2026-capstone-84
```

**2. 서버(Backend) 설정**

```bash
cd server
npm install
```

환경변수 파일 생성:

```bash
cp .env.example .env
```

`.env` 파일을 열어 아래 항목을 본인 환경에 맞게 수정합니다:

| 변수명 | 설명 |
|--------|------|
| `DATABASE_URL` | MySQL 접속 URL (예: `mysql://root:password@localhost:3306/readingclub`) |
| `JWT_SECRET` | JWT 토큰 서명용 시크릿 키 |
| `JWT_REFRESH_SECRET` | JWT 리프레시 토큰 시크릿 키 |
| `KAKAO_API_KEY` | 카카오 책 검색 API 키 |
| `GEMINI_API_KEY` | Google Gemini AI API 키 |

데이터베이스 마이그레이션:

```bash
npx prisma migrate dev
```

서버 실행:

```bash
# 개발 모드
npm run dev

# 또는 프로덕션 빌드 후 실행
npm run build
npm start
```

서버는 기본적으로 `http://localhost:3000`에서 실행됩니다.

**3. 클라이언트(Frontend) 설정**

```bash
cd client
npm install
```

개발 서버 실행:

```bash
npm run dev
```

클라이언트는 기본적으로 `http://localhost:5173`에서 실행됩니다.

프로덕션 빌드:

```bash
npm run build
```

빌드 결과물은 `client/dist` 폴더에 생성됩니다.

---

#### 테스트 실행

```bash
cd server
npm run test           # Vitest 단발 실행
npm run test:pbt       # 속성 기반(Property) 테스트만
```

## 7. 디렉토리 구조

```
2026-capstone-84/
├─ client/                          # React + Vite 프론트엔드
│  ├─ src/
│  │  ├─ api/                       # axios 기반 API 클라이언트 (auth, books, groups, memos, ...)
│  │  ├─ components/                # 공용 UI 컴포넌트 (Markdown, NotificationBell, ReportModal, ...)
│  │  ├─ pages/                     # 라우트 단위 페이지 (Home, GroupDetail, Discussions, MyPage, ...)
│  │  ├─ stores/                    # Zustand 전역 상태 (authStore)
│  │  ├─ types/                     # 공용 타입 정의
│  │  ├─ utils/                     # 날짜·시간 유틸 (timeAgo, readingPeriod)
│  │  ├─ App.tsx                    # 라우팅 진입점
│  │  └─ main.tsx
│  ├─ public/                       # 정적 자산(파비콘, 로고 이미지)
│  └─ vite.config.ts
│
├─ server/                          # Express + TypeScript 백엔드
│  ├─ src/
│  │  ├─ index.ts                   # 앱 엔트리 · 라우터 등록 · 정적 서빙
│  │  ├─ middleware/                # auth, errorHandler 미들웨어
│  │  ├─ routes/                    # 도메인별 라우터
│  │  │  ├─ auth.routes.ts          # 회원가입 · 로그인 · 토큰 · 카카오 OAuth
│  │  │  ├─ book.routes.ts          # 책 검색
│  │  │  ├─ group.routes.ts         # 모임 CRUD · 참여 · 초대
│  │  │  ├─ dashboard.routes.ts     # 방장 대시보드
│  │  │  ├─ memo.routes.ts          # 메모
│  │  │  ├─ discussion.routes.ts    # 스레드 토론
│  │  │  ├─ token.routes.ts         # 발언권 토큰
│  │  │  ├─ insight.routes.ts       # AI 인사이트
│  │  │  ├─ ai.routes.ts            # AI 주제 추천 · 요약
│  │  │  ├─ mypage.routes.ts        # 마이페이지
│  │  │  ├─ notification.routes.ts  # 알림
│  │  │  ├─ ranking.routes.ts       # 활동 랭킹
│  │  │  └─ report.routes.ts        # 신고 + AI 검토
│  │  ├─ services/                  # 비즈니스 로직
│  │  │  ├─ ai-provider.service.ts  # Gemini / Bedrock 추상화
│  │  │  ├─ ai.service.ts           # AI 주제 추천 · 요약
│  │  │  ├─ insight.service.ts      # 독서 회고 인사이트 생성
│  │  │  ├─ similar-thread.service.ts  # 유사 스레드 감지
│  │  │  ├─ group.service.ts / memo.service.ts / discussion.service.ts
│  │  │  ├─ notification.service.ts # 알림 + 스케줄러
│  │  │  ├─ file-storage.service.ts # 로컬 / S3 드라이버 분리
│  │  │  ├─ profanity.service.ts    # 신고 보조 검토
│  │  │  └─ ...
│  │  └─ validators/                # Zod 스키마
│  ├─ prisma/
│  │  ├─ schema.prisma              # 데이터 모델
│  │  └─ migrations/                # 마이그레이션 히스토리
│  ├─ scripts/
│  │  ├─ seed-api-automation.mjs    # 테스트 데이터 자동 생성
│  │  └─ check-bedrock.mjs          # AWS Bedrock 연결 점검
│  └─ uploads/                      # 로컬 저장 모드일 때만 사용
│
├─ docs/                            # 발표·기획 문서
│  ├─ project-overview.md           # 프로젝트 기획 및 구조 정리
│  ├─ evaluation.md                 # 평가 기준
│  ├─ ppt.md / ppt-prompt.md        # 발표 PPT 가이드
│  ├─ deployment-cost-optimization.md
│  └─ api-seed-automation.md
│
├─ nginx/book-discussion.conf       # 운영용 Nginx 설정
├─ ecosystem.config.js              # PM2 프로세스 설정
├─ index.html / index.md            # GitHub Pages 소개 페이지
├─ README.md
└─ package.json
```
