# 구현 계획: 커뮤니티 플랫폼 기능 (Community Platform Features)

## 개요

기존 독서토론 플랫폼을 책 커뮤니티 플랫폼으로 확장하는 구현 계획이다. 데이터 모델 → 백엔드 서비스/API → 프론트엔드 컴포넌트 순서로 점진적으로 구현하며, 기존 기능을 보존하면서 새로운 커뮤니티 기능을 추가한다.

## Tasks

- [x] 1. 데이터베이스 스키마 확장 및 마이그레이션
  - [x] 1.1 Prisma 스키마에 신규 모델 추가
    - `server/prisma/schema.prisma`에 CommunityPost, CommunityComment, CommunityLike, CommunityReport, ReadingStatus, Notification, UserSpoilerSetting 모델 추가
    - User 모델에 신규 관계(communityPosts, communityComments, communityLikes, communityReports, readingStatuses, receivedNotifs, actedNotifs, spoilerSetting) 추가
    - Book 모델에 신규 관계(communityPosts, readingStatuses) 추가
    - 커서 기반 페이지네이션을 위한 복합 인덱스 설정
    - `npx prisma migrate dev` 실행하여 마이그레이션 생성
    - _Requirements: 2.1~2.8, 3.1~3.6, 4.1~4.6, 5.1~5.5, 6.1~6.6, 8.1~8.6, 10.1~10.6, 13.1~13.7_

  - [ ]* 1.2 스키마 마이그레이션 단위 테스트
    - Prisma Client 생성 확인
    - 모델 간 관계 정합성 테스트
    - _Requirements: 2.1, 3.1, 4.1, 5.1_

- [x] 2. 백엔드 공통 유틸리티 및 타입 정의
  - [x] 2.1 커서 기반 페이지네이션 유틸리티 구현
    - `server/src/utils/pagination.ts` 생성
    - `CursorPaginatedResult<T>` 인터페이스 정의
    - Prisma 쿼리에 적용할 커서 페이지네이션 헬퍼 함수 구현
    - _Requirements: 3.5, 7.6_

  - [x] 2.2 공통 타입 및 상수 정의
    - `server/src/types/community.ts` 생성: 카테고리 목록, NotificationType, SpoilerFilterMode 등 타입 정의
    - 카테고리 상수 배열 정의 (korean_novel, western_novel, japanese_novel, essay, self_help, humanities, science, history, poetry, other)
    - _Requirements: 2.4, 2.5, 3.2, 6.1_

- [x] 3. 커뮤니티 게시판 백엔드 - 게시글 CRUD
  - [x] 3.1 게시글 서비스 구현
    - `server/src/services/community-post.service.ts` 생성
    - 게시글 작성 (책 필수, 내용 필수, 페이지 번호 선택, 카테고리 선택)
    - 게시글 목록 조회 (커서 기반 페이지네이션, 카테고리 필터링, 20개 단위)
    - 게시글 상세 조회 (작성자 정보, 댓글 수, 좋아요 수 포함)
    - 게시글 삭제 (작성자 본인만 가능)
    - isHidden=true인 게시글은 목록에서 제외
    - _Requirements: 2.1, 2.2, 2.6, 2.7, 3.1, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 게시글 라우터 구현
    - `server/src/routes/community.routes.ts` 생성
    - POST /api/community/posts (인증 필수)
    - GET /api/community/posts (인증 선택, 커서 페이지네이션)
    - GET /api/community/posts/:id (인증 선택)
    - DELETE /api/community/posts/:id (인증 필수, 작성자 확인)
    - Zod를 사용한 요청 바디 유효성 검사
    - _Requirements: 2.1, 2.6, 2.8, 3.1, 3.6_

  - [ ]* 3.3 게시글 서비스 단위 테스트
    - 게시글 작성 성공/실패 케이스 테스트
    - 커서 기반 페이지네이션 동작 테스트
    - 카테고리 필터링 테스트
    - 작성자 권한 검증 테스트
    - _Requirements: 2.1, 2.6, 3.3, 3.5_

- [x] 4. 커뮤니티 게시판 백엔드 - 댓글/대댓글
  - [x] 4.1 댓글 서비스 구현
    - `server/src/services/community-comment.service.ts` 생성
    - 댓글 작성 (postId, content 필수)
    - 대댓글 작성 (parentId 지정)
    - 댓글 삭제 (작성자 본인만)
    - 게시글별 댓글 목록 조회 (작성 시간 순, 대댓글 포함)
    - 댓글 작성 시 게시글의 commentCount 증가
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

  - [x] 4.2 댓글 라우터 구현
    - POST /api/community/posts/:id/comments (인증 필수)
    - POST /api/community/comments/:id/replies (인증 필수)
    - DELETE /api/community/comments/:id (인증 필수, 작성자 확인)
    - DELETE /api/community/replies/:id (인증 필수, 작성자 확인)
    - 빈 내용 유효성 검사
    - _Requirements: 4.1, 4.2, 4.5, 4.6_

  - [ ]* 4.3 댓글 서비스 단위 테스트
    - 댓글/대댓글 작성 테스트
    - 빈 내용 제출 차단 테스트
    - commentCount 증감 테스트
    - _Requirements: 4.1, 4.2, 4.6_

- [x] 5. 커뮤니티 게시판 백엔드 - 좋아요
  - [x] 5.1 좋아요 서비스 구현
    - `server/src/services/community-like.service.ts` 생성
    - 좋아요 토글 (이미 좋아요 → 취소, 아직 안 함 → 추가)
    - 좋아요 상태 확인 (특정 사용자가 특정 게시글에 좋아요 했는지)
    - 게시글의 likeCount 증감 처리
    - unique 제약조건으로 중복 좋아요 방지
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [x] 5.2 좋아요 라우터 구현
    - POST /api/community/posts/:id/like (인증 필수, 토글)
    - GET /api/community/posts/:id/like (인증 필수, 상태 확인)
    - _Requirements: 5.1, 5.2, 5.4_

  - [ ]* 5.3 좋아요 서비스 단위 테스트
    - 좋아요 토글 동작 테스트
    - 중복 좋아요 방지 테스트
    - likeCount 정합성 테스트
    - _Requirements: 5.1, 5.2, 5.5_

- [x] 6. Checkpoint - 커뮤니티 게시판 핵심 기능 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. AI 서비스 구현 (분류기 + 모더레이터)
  - [x] 7.1 AI 분류기 서비스 구현
    - `server/src/services/ai-classifier.service.ts` 생성
    - OpenAI GPT-4o-mini API를 사용하여 책 정보(제목, 저자)와 글 내용 기반 카테고리 분류
    - 분류 결과에 category, confidence 포함
    - API 호출 실패 시 null 반환 (서비스 차단 없음)
    - 게시글 작성 시 카테고리 미지정인 경우 호출
    - _Requirements: 2.4, 12.4_

  - [x] 7.2 AI 모더레이터 서비스 구현
    - `server/src/services/ai-moderator.service.ts` 생성
    - OpenAI GPT-4o-mini API를 사용하여 게시글 내용 부적절성 검사
    - 검사 결과에 isSuspicious, reason, confidence 포함
    - 부적절 의심 시 관리자 알림 생성 (게시글 숨기지 않음)
    - API 호출 실패 시 오류 로깅만 수행, 게시글 작성 차단하지 않음
    - 비동기로 실행 (게시글 작성 응답 지연 없음)
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 7.3 게시글 서비스에 AI 연동 통합
    - 게시글 작성 플로우에 AI 분류기 호출 추가 (카테고리 미지정 시)
    - 게시글 작성 후 AI 모더레이터 비동기 호출 추가
    - AI 실패 시에도 게시글 정상 저장 보장
    - _Requirements: 2.4, 12.1, 12.2, 12.3, 12.4_

  - [ ]* 7.4 AI 서비스 단위 테스트
    - AI 분류기 성공/실패 케이스 테스트 (모킹)
    - AI 모더레이터 성공/실패 케이스 테스트 (모킹)
    - API 실패 시 서비스 차단 없음 확인
    - _Requirements: 12.4_

- [x] 8. 스포일러 필터 백엔드
  - [x] 8.1 스포일러 필터 서비스 구현
    - `server/src/services/spoiler.service.ts` 생성
    - 사용자 스포일러 설정 조회/변경 (off, hide_completely, hide_content)
    - 사용자의 독서 상태(읽은 책 + 읽고 있는 책) 기반 필터링 로직
    - hide_completely: 읽지 않은 책의 게시글을 쿼리에서 제외
    - hide_content: 읽지 않은 책의 게시글 내용을 마스킹 처리
    - 비회원에게는 필터 미적용
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 8.2 스포일러 설정 라우터 구현
    - GET /api/me/spoiler-setting (인증 필수)
    - PATCH /api/me/spoiler-setting (인증 필수)
    - 게시글 목록 API에 spoilerFilter 쿼리 파라미터 연동
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 8.3 스포일러 필터 단위 테스트
    - 각 필터 모드별 동작 테스트
    - 독서 상태 기반 필터링 정확성 테스트
    - 비회원 필터 미적용 테스트
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 9. 검색 서비스 백엔드
  - [x] 9.1 OpenSearch 검색 서비스 구현
    - `server/src/services/community-search.service.ts` 생성
    - OpenSearch 클라이언트 설정 및 인덱스 매핑 (nori_tokenizer 한국어 형태소 분석)
    - 게시글 인덱싱 함수 (게시글 작성/삭제 시 호출)
    - 검색 함수: 책 제목, 작성자 닉네임, 게시글 내용에서 매칭
    - 관련도 점수 기준 정렬
    - 검색 결과 페이지네이션
    - isHidden=true인 게시글 검색 결과에서 제외
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 9.2 검색 라우터 구현
    - GET /api/community/search?q=검색어&cursor=...&limit=20
    - 검색 결과 없을 시 빈 배열 반환
    - _Requirements: 7.1, 7.5, 7.6_

  - [x] 9.3 게시글 서비스에 검색 인덱싱 연동
    - 게시글 작성 시 OpenSearch 인덱싱 (비동기)
    - 게시글 삭제 시 OpenSearch 문서 삭제
    - 인덱싱 실패 시 게시글 작성 차단하지 않음
    - _Requirements: 7.2, 7.3_

  - [ ]* 9.4 검색 서비스 단위 테스트
    - 검색 쿼리 생성 로직 테스트
    - 인덱싱/삭제 동작 테스트 (모킹)
    - _Requirements: 7.2, 7.4_

- [x] 10. 신고 시스템 백엔드
  - [x] 10.1 신고 서비스 구현
    - `server/src/services/community-report.service.ts` 생성
    - 게시글 신고 (사유 필수, 중복 신고 방지 - unique 제약조건)
    - 신고 횟수 임계값(5회) 도달 시 게시글 자동 숨김 (isHidden=true)
    - 자동 숨김 시 관리자 알림 생성
    - 관리자용 신고 목록 조회
    - 관리자용 게시글 복원 (isHidden=false)
    - 관리자용 게시글 삭제
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 10.2 신고 라우터 구현
    - POST /api/community/posts/:id/report (인증 필수)
    - GET /api/admin/reports (관리자 인증 필수)
    - PATCH /api/admin/posts/:id/restore (관리자 인증 필수)
    - DELETE /api/admin/posts/:id (관리자 인증 필수)
    - _Requirements: 13.1, 13.5, 13.7_

  - [ ]* 10.3 신고 서비스 단위 테스트
    - 중복 신고 방지 테스트
    - 임계값 도달 시 자동 숨김 테스트
    - 관리자 복원/삭제 테스트
    - _Requirements: 13.3, 13.5, 13.6_

- [x] 11. Checkpoint - 백엔드 커뮤니티 기능 전체 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. 독서 상태 관리 백엔드
  - [x] 12.1 독서 상태 서비스 구현
    - `server/src/services/reading-status.service.ts` 생성
    - 독서 상태 목록 조회 (userId, status별 필터링)
    - 책 추가 (userId + bookId unique 제약조건)
    - 상태 변경 (reading, completed, want_to_read)
    - 책 제거
    - 각 상태별 책 수 카운트
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 12.2 독서 상태 라우터 구현
    - GET /api/me/reading-status (인증 필수, status 쿼리 파라미터)
    - POST /api/me/reading-status (인증 필수)
    - PATCH /api/me/reading-status/:id (인증 필수)
    - DELETE /api/me/reading-status/:id (인증 필수)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 12.3 독서토론 그룹 참여 시 독서 상태 자동 추가 연동
    - 기존 그룹 참여 로직에 ReadingStatus 자동 생성 훅 추가
    - 그룹의 bookId를 "reading" 상태로 자동 추가
    - 이미 존재하는 경우 중복 추가 방지
    - _Requirements: 9.1_

  - [ ]* 12.4 독서 상태 서비스 단위 테스트
    - CRUD 동작 테스트
    - 중복 추가 방지 테스트
    - 그룹 참여 시 자동 추가 테스트
    - _Requirements: 8.1, 8.4, 8.5, 9.1_

- [x] 13. 알림 시스템 백엔드
  - [x] 13.1 알림 서비스 구현
    - `server/src/services/notification.service.ts` 생성
    - 알림 생성 (recipientId, type, title, message, linkUrl, actorId)
    - 사용자별 알림 목록 조회 (커서 기반 페이지네이션)
    - 읽지 않은 알림 수 조회
    - 개별 알림 읽음 처리
    - 전체 알림 읽음 처리
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 13.2 알림 라우터 구현
    - GET /api/notifications (인증 필수)
    - GET /api/notifications/unread-count (인증 필수)
    - PATCH /api/notifications/:id/read (인증 필수)
    - PATCH /api/notifications/read-all (인증 필수)
    - _Requirements: 10.4, 10.5, 10.6_

  - [x] 13.3 커뮤니티 활동 알림 트리거 연동
    - 댓글 작성 시 게시글 작성자에게 알림 생성
    - 대댓글 작성 시 댓글 작성자에게 알림 생성
    - 좋아요 시 게시글 작성자에게 알림 생성
    - 자기 자신에게는 알림 미전송
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 13.4 독서토론 일정 알림 구현
    - 토론 일정 D-1 알림 생성 로직 (스케줄러 또는 API 호출 기반)
    - 그룹명, 토론 날짜, 책 제목 포함
    - 해당 그룹 전체 회원에게 알림 전송
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ]* 13.5 알림 서비스 단위 테스트
    - 알림 생성/조회/읽음 처리 테스트
    - 커뮤니티 활동 트리거 테스트
    - 자기 자신 알림 미전송 테스트
    - _Requirements: 10.1, 10.2, 10.3, 10.6_

- [x] 14. Checkpoint - 백엔드 전체 기능 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. 프론트엔드 공통 구조 및 네비게이션
  - [x] 15.1 네비게이션 바 컴포넌트 구현
    - `client/src/components/layout/NavigationBar.tsx` 생성
    - 홈(/), 커뮤니티(/community), 토론(/groups - 기존 그룹 목록), 마이페이지(/mypage) 4개 메뉴
    - 비회원 시 마이페이지 대신 로그인 버튼 표시
    - 알림 배지 표시 영역 포함
    - 현재 활성 메뉴 하이라이트
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 1.9_

  - [x] 15.2 App.tsx 라우팅 구조 개편
    - 신규 라우트 추가: /community, /community/write, /community/:postId
    - 기존 라우트 유지: /groups/*, /discussions/*, /invite/*
    - NavigationBar를 전역 레이아웃으로 적용
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 14.6_

  - [x] 15.3 메인 페이지 개편
    - `client/src/pages/HomePage.tsx` 수정
    - 인기 게시글 미리보기 섹션 UI 레이아웃 (더미 데이터 또는 빈 상태)
    - 인기 책 미리보기 섹션 UI 레이아웃 (더미 데이터 또는 빈 상태)
    - 실제 데이터 로직은 추후 구현 (placeholder 표시)
    - _Requirements: 1.6, 1.7_

  - [x] 15.4 프론트엔드 공통 타입 정의
    - `client/src/types/index.ts`에 커뮤니티 관련 타입 추가
    - CommunityPost, CommunityComment, CommunityLike, Notification, ReadingStatus 등 인터페이스 정의
    - CursorPaginatedResult<T> 제네릭 타입 정의
    - _Requirements: 3.4, 3.5_

- [x] 16. 프론트엔드 API 클라이언트
  - [x] 16.1 커뮤니티 API 클라이언트 구현
    - `client/src/api/community.ts` 생성
    - 게시글 CRUD API 함수 (목록, 상세, 작성, 삭제)
    - 댓글/대댓글 API 함수 (작성, 삭제)
    - 좋아요 토글/상태 확인 API 함수
    - 검색 API 함수
    - 신고 API 함수
    - _Requirements: 2.1, 3.1, 4.1, 5.1, 7.1, 13.1_

  - [x] 16.2 알림 API 클라이언트 구현
    - `client/src/api/notifications.ts` 생성
    - 알림 목록 조회, 읽지 않은 수 조회, 읽음 처리, 전체 읽음 처리 함수
    - _Requirements: 10.4, 10.5, 10.6_

  - [x] 16.3 독서 상태 API 클라이언트 구현
    - `client/src/api/readingStatus.ts` 생성
    - 독서 상태 목록 조회, 책 추가, 상태 변경, 책 제거 함수
    - 스포일러 설정 조회/변경 함수
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 17. 프론트엔드 상태 관리 (Zustand)
  - [x] 17.1 알림 스토어 구현
    - `client/src/stores/notificationStore.ts` 생성
    - 읽지 않은 알림 수 상태 관리
    - 알림 목록 캐싱
    - 폴링 또는 주기적 갱신 로직
    - _Requirements: 10.4_

  - [x] 17.2 스포일러 필터 스토어 구현
    - `client/src/stores/spoilerStore.ts` 생성
    - 현재 스포일러 필터 모드 상태 관리
    - 서버 설정과 동기화
    - _Requirements: 6.1, 6.4_

- [x] 18. 커뮤니티 게시판 프론트엔드 - 목록 및 카테고리
  - [x] 18.1 커뮤니티 페이지 구현
    - `client/src/pages/CommunityPage.tsx` 생성
    - 카테고리 탭 (전체, 한국 소설, 영미 소설, 일본 소설, 에세이, 자기계발, 인문학, 과학, 역사, 시/시집, 기타)
    - 게시글 목록 (PostList + PostCard 컴포넌트)
    - 커서 기반 무한 스크롤 또는 "더 보기" 버튼
    - 검색 바 (SearchBar 컴포넌트)
    - 스포일러 필터 설정 UI
    - 비회원 시 글 작성 버튼 비활성화 + 로그인 안내
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 2.8, 6.1_

  - [x] 18.2 게시글 카드 컴포넌트 구현
    - `client/src/components/community/PostCard.tsx` 생성
    - 책 제목, 작성자 닉네임, 작성일, 좋아요 수, 댓글 수 표시
    - 스포일러 필터 적용 시 내용 마스킹 처리
    - 클릭 시 /community/:postId로 이동
    - _Requirements: 3.4, 3.6, 6.3_

  - [x] 18.3 카테고리 탭 컴포넌트 구현
    - `client/src/components/community/CategoryTabs.tsx` 생성
    - 카테고리 선택 시 게시글 목록 필터링
    - 현재 선택된 카테고리 하이라이트
    - _Requirements: 3.2, 3.3_

  - [x] 18.4 검색 바 컴포넌트 구현
    - `client/src/components/community/SearchBar.tsx` 생성
    - 검색어 입력 필드
    - 검색 실행 시 검색 결과 표시
    - 검색 결과 없을 시 "검색 결과가 없습니다" 메시지
    - _Requirements: 7.1, 7.5_

- [x] 19. 커뮤니티 게시판 프론트엔드 - 글 작성
  - [x] 19.1 글 작성 페이지 구현
    - `client/src/pages/CommunityWritePage.tsx` 생성
    - 책 검색 및 선택 필드 (필수)
    - 글 내용 입력 필드 (필수)
    - 페이지 번호 입력 필드 (선택)
    - 카테고리 선택 드롭다운 (선택)
    - 유효성 검사: 책, 글 내용 비어있으면 오류 메시지 표시 및 제출 차단
    - 작성 성공 시 게시글 목록으로 이동
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7_

  - [x] 19.2 책 검색 모달 컴포넌트 구현
    - `client/src/components/mypage/BookSearchModal.tsx` 생성
    - 기존 book-search.service.ts 활용
    - 검색어 입력 시 책 검색 결과 표시
    - 책 선택 시 부모 컴포넌트에 선택 결과 전달
    - _Requirements: 2.3, 8.2_

- [x] 20. 커뮤니티 게시판 프론트엔드 - 게시글 상세
  - [x] 20.1 게시글 상세 페이지 구현
    - `client/src/pages/CommunityPostPage.tsx` 생성
    - 게시글 내용, 책 정보, 작성자, 작성일 표시
    - 좋아요 버튼 (LikeButton 컴포넌트)
    - 댓글 섹션 (CommentSection 컴포넌트)
    - 신고 버튼 (비회원에게 미표시)
    - 삭제 버튼 (작성자 본인에게만 표시)
    - _Requirements: 3.6, 4.1, 5.1, 13.7_

  - [x] 20.2 좋아요 버튼 컴포넌트 구현
    - `client/src/components/community/LikeButton.tsx` 생성
    - 좋아요 토글 기능
    - 이미 좋아요한 상태 시 활성 표시
    - 비회원 클릭 시 로그인 안내
    - 좋아요 수 실시간 반영
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 20.3 댓글 섹션 컴포넌트 구현
    - `client/src/components/community/CommentSection.tsx` 생성
    - `client/src/components/community/CommentItem.tsx` 생성
    - `client/src/components/community/ReplyItem.tsx` 생성
    - 댓글 목록 표시 (작성 시간 순)
    - 대댓글 들여쓰기 표시
    - 댓글/대댓글 작성 폼
    - 비회원 시 작성 폼 비활성화 + 로그인 안내
    - 빈 내용 제출 차단
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 20.4 신고 모달 컴포넌트 구현
    - `client/src/components/community/ReportModal.tsx` 생성
    - 신고 사유 선택 옵션 제공
    - 제출 시 신고 API 호출
    - 비회원에게 신고 버튼 미표시
    - _Requirements: 13.1, 13.2, 13.7_

- [x] 21. Checkpoint - 커뮤니티 게시판 프론트엔드 확인
  - Ensure all tests pass, ask the user if questions arise.

- [x] 22. 마이페이지 프론트엔드 개편
  - [x] 22.1 마이페이지 독서 상태 탭 구현
    - `client/src/pages/MyPage.tsx` 수정 (기존 내용 보존하며 확장)
    - `client/src/components/mypage/ReadingStatusTabs.tsx` 생성
    - 세 가지 탭: 읽고 있는 책, 읽은 책, 읽고 싶은 책
    - 각 탭별 책 목록 표시
    - 각 카테고리별 책 수 표시
    - 책 추가 버튼 → BookSearchModal 연동
    - 상태 변경 드롭다운
    - 책 제거 버튼
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 22.2 독서 상태 책 카드 컴포넌트 구현
    - `client/src/components/mypage/ReadingBookCard.tsx` 생성
    - 책 표지, 제목, 저자 표시
    - 상태 변경 UI
    - 제거 버튼
    - _Requirements: 8.4, 8.5_

  - [x] 22.3 독서토론 그룹 활동 섹션 구현
    - `client/src/components/mypage/GroupActivitySection.tsx` 생성
    - 참여 중인 독서토론 그룹 목록 표시
    - 그룹별 읽기 진행률 표시
    - 그룹 페이지/메모 페이지 링크 제공
    - _Requirements: 9.2, 9.3, 9.4_

- [x] 23. 알림 프론트엔드
  - [x] 23.1 알림 패널 컴포넌트 구현
    - `client/src/components/notification/NotificationPanel.tsx` 생성
    - `client/src/components/notification/NotificationItem.tsx` 생성
    - 네비게이션 바 알림 아이콘 클릭 시 드롭다운 패널 표시
    - 알림 목록 (최신순)
    - 읽지 않은 알림 수 배지
    - 전체 읽음 처리 버튼
    - _Requirements: 10.4, 10.5, 10.6_

  - [x] 23.2 알림 클릭 시 해당 페이지 이동 구현
    - 알림 클릭 시 linkUrl로 라우팅
    - 클릭 시 해당 알림 읽음 처리
    - 커뮤니티 알림 → 게시글 상세 페이지
    - 토론 일정 알림 → 그룹 상세 페이지
    - _Requirements: 10.5, 10.6, 11.3_

  - [x] 23.3 알림 배지 컴포넌트 구현
    - `client/src/components/layout/NotificationBadge.tsx` 생성
    - 읽지 않은 알림 수 표시
    - 주기적 갱신 (폴링)
    - _Requirements: 10.4_

- [x] 24. 스포일러 필터 프론트엔드
  - [x] 24.1 스포일러 필터 설정 컴포넌트 구현
    - `client/src/components/community/SpoilerFilter.tsx` 생성
    - 필터 옵션: 끄기, 완전 숨김, 내용만 숨김
    - 설정 변경 시 서버 API 호출 및 게시글 목록 갱신
    - 비회원에게 미표시
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

- [x] 25. 기존 기능 보존 확인 및 통합
  - [x] 25.1 기존 독서토론 라우팅 유지 확인
    - /groups/*, /discussions/*, /invite/* 경로 정상 동작 확인
    - 네비게이션 바 "토론" 메뉴에서 기존 그룹 목록 접근 가능 확인
    - 기존 페이지 컴포넌트에 NavigationBar 적용
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [x] 25.2 Express 서버에 신규 라우터 등록
    - `server/src/index.ts`에 community, notifications, reports, reading-status 라우터 등록
    - 기존 라우터(auth, groups, discussions, memos, dashboard 등) 유지
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 26. Final Checkpoint - 전체 통합 확인
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*` 표시된 태스크는 선택 사항이며 빠른 MVP를 위해 건너뛸 수 있습니다
- 각 태스크는 추적 가능성을 위해 특정 요구사항을 참조합니다
- 체크포인트는 점진적 검증을 보장합니다
- 메인 페이지 인기 게시글/책은 UI 레이아웃만 구성하며 실제 로직은 추후 구현합니다
- 인프라(OpenSearch, Redis, S3)는 별도 스펙에서 처리되며, 이 태스크는 애플리케이션 레벨 코드에 집중합니다
- AI 서비스(GPT-4o-mini)는 실패 시에도 서비스를 차단하지 않도록 구현합니다
