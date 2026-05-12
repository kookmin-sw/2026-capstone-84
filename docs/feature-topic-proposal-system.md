# 토론 주제 제안/개최 시스템 구현

관련 이슈: #16
브랜치: `16-feature-모임장-대시보드-관리기능`

## 개요

기존에 "토론 주제"와 "실제 토론"이 같은 모델(Discussion)에 저장되어 구분이 없던 문제를 해결하기 위해, 별도의 `TopicProposal` 모델을 도입하여 주제 제안과 실제 토론을 분리했습니다.

## 흐름

1. **참여자가 토론 페이지에서 주제를 제안** → `TopicProposal` 테이블에 `status: 'proposed'`로 저장
2. **토론 페이지의 "토론 주제 목록"에서 제안된 주제 확인** → 클릭하면 의견/댓글 작성 가능
3. **모임장이 대시보드 "토론 생성" 탭에서 제안된 주제를 선택** → "토론 개최" 클릭
4. **토론 개최** → `Discussion` 테이블에 실제 토론 생성, 제안의 status가 `opened`로 변경
5. **토론 페이지의 "열린 토론 목록"에서 개최된 토론 확인** → 클릭하면 기존 스레드 페이지로 이동

## DB 스키마 변경

### 새 모델: TopicProposal

| 필드 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| groupId | UUID | FK → Group |
| authorId | UUID | FK → User |
| title | VARCHAR(200) | 주제 제목 |
| content | TEXT | 주제 내용 (선택) |
| memoId | UUID | 연결된 메모 (선택) |
| status | VARCHAR(20) | proposed / opened |
| createdAt | TIMESTAMP | 생성일 |

### Comment 모델 변경
- `discussionId`를 nullable로 변경
- `proposalId` 필드 추가 (nullable)
- Discussion 또는 TopicProposal 둘 중 하나에 연결

### Discussion 모델 변경
- `proposalId` 필드 추가 (개최 시 원본 제안 참조)

## 변경된 파일

### 백엔드
- `server/prisma/schema.prisma` — TopicProposal 모델 추가, Comment에 proposalId 추가
- `server/src/services/proposal.service.ts` (신규) — 제안 CRUD, 토론 개최, 의견/답글 추가
- `server/src/routes/proposal.routes.ts` (신규) — 제안 관련 API 엔드포인트
- `server/src/index.ts` — proposalRouter 등록

### 프론트엔드
- `client/src/api/proposals.ts` (신규) — 제안 API 클라이언트
- `client/src/pages/ProposalThreadPage.tsx` (신규) — 제안 상세 페이지 (의견/댓글 기능)
- `client/src/pages/DiscussionsPage.tsx` — "토론 주제 목록" + "열린 토론 목록" 분리
- `client/src/pages/DashboardPage.tsx` — "토론 생성" 탭에서 제안 선택 → 토론 개최
- `client/src/App.tsx` — `/proposals/:id` 라우트 추가

## API 엔드포인트

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/groups/:groupId/proposals` | 주제 제안 목록 | 로그인 |
| POST | `/api/groups/:groupId/proposals` | 주제 제안 생성 | 참여자 |
| GET | `/api/proposals/:id` | 제안 단건 조회 | 로그인 |
| POST | `/api/proposals/:id/open` | 토론 개최 | 방장 |
| DELETE | `/api/proposals/:id` | 제안 삭제 | 작성자/방장 |
| GET | `/api/proposals/:id/comments` | 제안 의견 목록 | 로그인 |
| POST | `/api/proposals/:id/comments` | 제안에 의견 작성 | 참여자 |
| POST | `/api/proposal-comments/:id/replies` | 제안 의견에 답글 | 참여자 |

## 토론 페이지 구조 변경

### 변경 전
- 토론 주제 목록 (Discussion 데이터, 클릭 시 스레드 이동)

### 변경 후
- **토론 주제 목록** — TopicProposal 데이터, 클릭 시 `/proposals/:id`로 이동 (의견/댓글 가능)
- **열린 토론 목록** — Discussion 데이터 (모임장이 개최한 것만), 클릭 시 `/discussions/:id`로 이동
