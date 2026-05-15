# Implementation Plan: 선택적 인증 (Optional Auth)

## Overview

기존 채팅방 애플리케이션에 선택적 회원가입/로그인 시스템, 운영자 대화방 관리, 게스트 경고 문구, 비활성 게스트 정리 기능을 추가한다. 백엔드(TypeScript/Express/SQLite)에 인증 서비스와 미들웨어를 구현하고, 프론트엔드(React/TypeScript)에 로그인/회원가입 페이지와 권한 기반 UI를 구현한다.

## Tasks

- [x] 1. 데이터 모델 및 타입 정의
  - [x] 1.1 users 테이블 마이그레이션 추가
    - `server/src/db/migrate.ts`에 users 테이블 CREATE TABLE IF NOT EXISTS 추가
    - 컬럼: id (TEXT PK), username (TEXT NOT NULL UNIQUE), password_hash (TEXT NOT NULL), display_name (TEXT NOT NULL), role (TEXT NOT NULL DEFAULT 'user'), created_at (TEXT NOT NULL DEFAULT datetime('now'))
    - _Requirements: 3.2, 6.1_
  - [x] 1.2 공유 TypeScript 타입 정의 추가
    - `shared/types/models.ts`에 UserAccount, AuthPayload, AuthUser, AuthResponse 인터페이스 추가
    - `shared/types/events.ts`에 `room:deleted` 이벤트 타입 추가
    - `shared/types/services.ts`에 AuthService, GuestCleanupService 인터페이스 추가, RoomService에 deleteRoom 메서드 추가
    - _Requirements: 3.2, 4.3, 5.2, 8.1_

- [x] 2. 백엔드 인증 서비스 구현
  - [x] 2.1 AuthService 구현
    - `server/src/services/auth.service.ts` 생성
    - register: username 중복 검사, bcrypt 해싱, users INSERT, JWT 발급
    - login: username 조회, bcrypt.compare, JWT 발급
    - verifyToken: jwt.verify로 토큰 검증
    - ensureAdminExists: admin 계정 존재 여부 확인 후 없으면 생성 (비밀번호: ADMIN_PASSWORD 환경변수 또는 기본값 "admin1234")
    - 의존성: bcrypt, jsonwebtoken 패키지 설치 필요
    - _Requirements: 1.2, 1.3, 3.2, 3.4, 5.1, 5.2, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 2.2 Property test: 회원가입-로그인 라운드트립
    - **Property 1: 회원가입-로그인 라운드트립**
    - **Validates: Requirements 1.2, 3.3, 5.1, 5.2**

  - [ ]* 2.3 Property test: 비밀번호 해싱 저장
    - **Property 2: 비밀번호 해싱 저장**
    - **Validates: Requirements 3.2**

  - [ ]* 2.4 Property test: 잘못된 자격 증명 거부
    - **Property 3: 잘못된 자격 증명 거부**
    - **Validates: Requirements 1.3**

  - [ ]* 2.5 Property test: 중복 아이디 거부
    - **Property 4: 중복 아이디 거부**
    - **Validates: Requirements 3.4**

  - [ ]* 2.6 Property test: 운영자 계정 생성 멱등성
    - **Property 9: 운영자 계정 생성 멱등성**
    - **Validates: Requirements 6.1, 6.3, 6.4**

- [x] 3. JWT 미들웨어 및 Auth 라우터 구현
  - [x] 3.1 JWT 인증 미들웨어 구현
    - `server/src/middleware/auth.ts` 생성
    - optionalAuth: Authorization 헤더에 토큰이 있으면 검증하여 req.user에 설정, 없으면 통과 (게스트 허용)
    - requireAdmin: optionalAuth 통과 후 req.user.role이 'admin'이 아니면 403 반환
    - _Requirements: 5.4, 4.5_

  - [ ]* 3.2 Property test: 유효하지 않은 토큰 거부
    - **Property 8: 유효하지 않은 토큰 거부**
    - **Validates: Requirements 5.4**

  - [x] 3.3 Auth API 라우터 구현
    - `server/src/routes/auth.ts` 생성
    - POST /api/auth/register: 회원가입 (username, password, confirmPassword, displayName)
    - POST /api/auth/login: 로그인 (username, password)
    - 입력 검증: 빈 필드 → 400, 비밀번호 불일치 → 400, 중복 아이디 → 409, 잘못된 자격 증명 → 401
    - _Requirements: 1.2, 1.3, 1.4, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 3.4 Property test: 비밀번호 확인 불일치 거부
    - **Property 5: 비밀번호 확인 불일치 거부**
    - **Validates: Requirements 3.5**

- [x] 4. Checkpoint - 인증 백엔드 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. 대화방 삭제 및 게스트 정리 구현
  - [x] 5.1 RoomService에 deleteRoom 메서드 추가
    - `server/src/services/room.service.ts` 수정
    - 트랜잭션 내에서 participants → messages → chat_rooms 순서로 삭제
    - _Requirements: 4.3_

  - [ ]* 5.2 Property test: 대화방 삭제 캐스케이드
    - **Property 6: 대화방 삭제 캐스케이드**
    - **Validates: Requirements 4.3**

  - [ ]* 5.3 Property test: 비관리자 삭제 금지
    - **Property 7: 비관리자 삭제 금지**
    - **Validates: Requirements 4.5**

  - [x] 5.4 Room 라우터에 DELETE 엔드포인트 추가
    - `server/src/routes/rooms.ts` 수정
    - DELETE /api/rooms/:roomId에 requireAdmin 미들웨어 적용
    - 삭제 후 Socket.IO로 room:deleted 이벤트 브로드캐스트
    - _Requirements: 4.3, 4.5, 4.6_

  - [x] 5.5 GuestCleanupService 구현
    - `server/src/services/guest-cleanup.service.ts` 생성
    - cleanupInactiveGuests: users 테이블에 없는 user_id를 가진 participants 중 joined_at이 30일 이상 경과한 레코드 삭제
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 5.6 Property test: 비활성 게스트 참여자 정리
    - **Property 10: 비활성 게스트 참여자 정리**
    - **Validates: Requirements 8.1, 8.2**

- [x] 6. 서버 시작 로직 통합
  - [x] 6.1 server/src/index.ts 수정
    - AuthService 인스턴스 생성 및 ensureAdminExists() 호출
    - GuestCleanupService 인스턴스 생성 및 cleanupInactiveGuests() 호출
    - Auth 라우터 마운트 (/api/auth)
    - Room 라우터에 deleteRoom용 미들웨어 연결
    - services/index.ts에 AuthService, GuestCleanupService export 추가
    - _Requirements: 6.1, 6.4, 8.3_

- [x] 7. Checkpoint - 백엔드 전체 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. 프론트엔드 인증 상태 관리
  - [x] 8.1 useAuth 훅 구현
    - `client/src/hooks/useAuth.ts` 생성 (기존 useUserInfo 대체)
    - 상태: isAuthenticated, isGuest, userId, userName, role, token
    - 메서드: login, register, loginAsGuest, logout
    - 회원: localStorage에 JWT 토큰 저장, 토큰에서 사용자 정보 디코딩
    - 게스트: 기존 localStorage 방식 유지 (userId, userName)
    - _Requirements: 1.5, 2.2, 5.1, 5.3, 5.5, 7.1, 7.2_

  - [x] 8.2 API 유틸리티에 인증 헤더 추가
    - `client/src/utils/api.ts` 수정
    - request 함수에서 localStorage의 토큰이 있으면 Authorization: Bearer 헤더 추가
    - deleteRoom API 함수 추가
    - _Requirements: 5.4_

- [x] 9. 프론트엔드 페이지 구현
  - [x] 9.1 LoginPage 구현
    - `client/src/pages/LoginPage.tsx` 생성
    - 아이디/비밀번호 입력 필드, 로그인 버튼, 회원가입 링크, "게스트로 이용하기" 버튼
    - 입력 검증: 빈 필드 오류 메시지, 잘못된 자격 증명 오류 메시지
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 9.2 RegisterPage 구현
    - `client/src/pages/RegisterPage.tsx` 생성
    - 아이디, 비밀번호, 비밀번호 확인, 표시 이름 입력 필드
    - 입력 검증: 빈 필드, 비밀번호 불일치, 중복 아이디 오류 메시지
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 9.3 게스트 닉네임 입력 화면에 경고 문구 추가
    - 기존 `UserNamePrompt` 컴포넌트를 게스트 전용으로 수정하거나 새 컴포넌트 생성
    - 경고 문구 표시: "게스트 계정은 현재 사용 중인 브라우저에서만 유지됩니다. 브라우저의 인터넷 사용 기록을 삭제하면 이전에 참여했던 대화방을 다시 찾을 수 없습니다. 대화 기록을 안전하게 보관하려면 회원가입을 권장합니다."
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 10. 프론트엔드 권한 기반 UI
  - [x] 10.1 App.tsx 라우팅 수정
    - 기존 UserNamePrompt 대신 LoginPage를 기본 진입점으로 설정
    - 유효한 토큰 보유 시 로그인 페이지 건너뛰기
    - /register 라우트 추가
    - 로그아웃 버튼 (헤더 또는 네비게이션에 추가)
    - _Requirements: 1.1, 1.5, 5.3_

  - [x] 10.2 RoomCard에 Admin 삭제 버튼 추가
    - `client/src/components/RoomCard.tsx` 수정
    - role이 'admin'일 때만 삭제 버튼 표시
    - 삭제 확인 대화 상자 (confirm) 표시 후 DELETE API 호출
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 10.3 ChatRoomPage에 room:deleted 이벤트 핸들러 추가
    - `client/src/pages/ChatRoomPage.tsx` 수정
    - room:deleted 이벤트 수신 시 알림 표시 후 대화방 목록 페이지로 이동
    - _Requirements: 4.6_

  - [x] 10.4 RoomListPage에 인증 정보 전달
    - `client/src/pages/RoomListPage.tsx` 수정
    - useAuth 훅에서 role 정보를 RoomCard에 전달
    - 삭제 성공 시 목록 갱신
    - _Requirements: 4.1, 4.4_

- [x] 11. Checkpoint - 프론트엔드 통합 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Socket.IO 이벤트 통합
  - [x] 12.1 Socket.IO 서버에 room:deleted 이벤트 발송 로직 추가
    - `server/src/socket/index.ts` 수정
    - 대화방 삭제 시 해당 room에 room:deleted 이벤트 브로드캐스트
    - Socket.IO 서버 인스턴스를 라우터에서 접근 가능하도록 공유
    - _Requirements: 4.6_

- [x] 13. Final checkpoint - 전체 통합 검증
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- 기존 게스트 채팅 기능은 변경 없이 유지되어야 한다 (Requirements 2.4)
