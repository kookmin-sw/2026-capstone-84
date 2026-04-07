# 구현 계획: 대화방 (Chat Rooms)

## 개요

React + TypeScript 프론트엔드와 Node.js + Express + Socket.IO 백엔드, SQLite(better-sqlite3) 데이터베이스를 사용하는 실시간 채팅방 애플리케이션을 단계적으로 구현한다. 각 단계는 이전 단계를 기반으로 하며, 최종적으로 모든 컴포넌트를 연결하여 완성한다.

## Tasks

- [ ] 1. 프로젝트 구조 설정 및 핵심 타입 정의
  - [ ] 1.1 프로젝트 초기화 및 디렉토리 구조 생성
    - 백엔드(`server/`) 및 프론트엔드(`client/`) 디렉토리 구조 생성
    - `package.json` 설정 (express, socket.io, better-sqlite3, uuid, cors 등 의존성)
    - TypeScript 설정 (`tsconfig.json`) 구성
    - Jest + fast-check 테스트 환경 설정
    - _Requirements: 1.5, 2.1_

  - [ ] 1.2 공유 TypeScript 타입 및 인터페이스 정의
    - `ChatRoom`, `ChatRoomSummary`, `Message`, `Participant` 인터페이스 정의
    - `RoomService`, `MessageService`, `ParticipantService` 서비스 인터페이스 정의
    - Socket.IO 이벤트 타입 정의
    - _Requirements: 1.5, 2.2, 4.2_

- [ ] 2. 데이터베이스 계층 구현
  - [ ] 2.1 SQLite 데이터베이스 초기화 및 스키마 생성
    - `better-sqlite3`를 사용한 데이터베이스 연결 모듈 구현
    - `chat_rooms`, `messages`, `participants` 테이블 생성 마이그레이션 작성
    - WAL 모드 설정 및 외래키 제약 활성화
    - _Requirements: 1.5, 4.3_

- [ ] 3. 백엔드 서비스 계층 구현
  - [ ] 3.1 RoomService 구현
    - `createRoom`: 대화방 생성 (UUID 생성, 입력 검증, 생성자 자동 참여 포함)
    - `getRooms`: 대화방 목록 조회 (최신순 정렬, 참여자 수 포함)
    - `getRoomById`: 대화방 상세 조회
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.2, 2.3_

  - [ ]* 3.2 RoomService 속성 기반 테스트 작성
    - **Property 1: 대화방 생성 라운드트립**
    - **Validates: Requirements 1.2, 1.5, 2.2**

  - [ ]* 3.3 RoomService 속성 기반 테스트 작성 - 생성자 자동 참여
    - **Property 2: 생성자 자동 참여**
    - **Validates: Requirements 1.3**

  - [ ]* 3.4 RoomService 속성 기반 테스트 작성 - 입력 검증
    - **Property 3: 대화방 생성 입력 검증**
    - **Validates: Requirements 1.4**

  - [ ]* 3.5 RoomService 속성 기반 테스트 작성 - 최신순 정렬
    - **Property 4: 대화방 목록 최신순 정렬**
    - **Validates: Requirements 2.3**

  - [ ] 3.6 MessageService 구현
    - `sendMessage`: 메시지 전송 (UUID 생성, 입력 검증, SQLite 저장)
    - `getMessagesByRoom`: 대화방별 메시지 이력 조회 (시간순 정렬)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 3.7 MessageService 속성 기반 테스트 작성 - 메시지 영속화
    - **Property 6: 메시지 영속화 라운드트립**
    - **Validates: Requirements 3.3, 4.2, 4.3**

  - [ ]* 3.8 MessageService 속성 기반 테스트 작성 - 입력 검증
    - **Property 7: 메시지 입력 검증**
    - **Validates: Requirements 4.4**

  - [ ] 3.9 ParticipantService 구현
    - `joinRoom`: 대화방 참여 (중복 참여 멱등성 보장)
    - `leaveRoom`: 대화방 퇴장
    - `getParticipants`: 참여자 목록 조회
    - `getParticipantCount`: 참여자 수 조회
    - _Requirements: 3.2, 5.1_

  - [ ]* 3.10 ParticipantService 속성 기반 테스트 작성
    - **Property 5: 참여/퇴장 참여자 수 라운드트립**
    - **Validates: Requirements 3.2, 5.1**

- [ ] 4. 체크포인트 - 서비스 계층 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의한다.

- [ ] 5. REST API 라우터 구현
  - [ ] 5.1 대화방 관련 REST API 라우터 구현
    - `POST /api/rooms`: 대화방 생성 엔드포인트 (입력 검증, 400 응답 처리)
    - `GET /api/rooms`: 대화방 목록 조회 엔드포인트
    - `GET /api/rooms/:roomId`: 대화방 상세 조회 엔드포인트 (404 처리)
    - `GET /api/rooms/:roomId/messages`: 메시지 이력 조회 엔드포인트
    - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 2.3, 2.4, 3.3_

  - [ ]* 5.2 REST API 단위 테스트 작성
    - 대화방 생성 성공/실패 케이스 테스트
    - 대화방 목록 조회 및 빈 목록 케이스 테스트
    - 존재하지 않는 대화방 접근 시 404 응답 테스트
    - _Requirements: 1.4, 2.4_

- [ ] 6. Socket.IO 이벤트 핸들러 구현
  - [ ] 6.1 Socket.IO 서버 설정 및 이벤트 핸들러 구현
    - Socket.IO 서버 초기화 및 Express 서버와 통합
    - `room:join` 이벤트: 대화방 입장 처리 및 `room:user-joined` 브로드캐스트
    - `room:leave` 이벤트: 대화방 퇴장 처리 및 `room:user-left` 브로드캐스트
    - `message:send` 이벤트: 메시지 저장 및 `message:new` 브로드캐스트
    - `disconnect` 이벤트: 연결 끊김 시 참여 중인 방에서 자동 퇴장 처리
    - _Requirements: 3.2, 3.4, 4.1, 5.1, 5.2_

  - [ ]* 6.2 Socket.IO 통합 테스트 작성
    - 대화방 입장 시 다른 참여자에게 알림 전달 테스트
    - 메시지 전송 시 같은 대화방의 모든 참여자에게 실시간 전달 테스트
    - 대화방 퇴장 시 다른 참여자에게 알림 전달 테스트
    - _Requirements: 3.4, 4.1, 5.2_

- [ ] 7. Express 서버 엔트리포인트 구현
  - Express 앱 생성 및 미들웨어 설정 (CORS, JSON 파싱)
  - REST API 라우터 마운트
  - Socket.IO 서버 연결
  - React 빌드 결과물 정적 파일 서빙 설정 (`express.static`)
  - SPA 라우팅을 위한 폴백 핸들러 설정
  - _Requirements: 2.1, 3.1_

- [ ] 8. 체크포인트 - 백엔드 전체 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의한다.

- [ ] 9. 프론트엔드 구현 - 대화방 목록 페이지
  - [ ] 9.1 React 프로젝트 설정 및 라우팅 구성
    - React + TypeScript 프로젝트 설정 (Vite 또는 CRA)
    - React Router 설정 (`RoomListPage`, `ChatRoomPage` 라우트)
    - API 클라이언트 유틸리티 구현 (fetch 래퍼)
    - Socket.IO 클라이언트 연결 훅 구현
    - _Requirements: 2.1, 3.1_

  - [ ] 9.2 RoomListPage 및 하위 컴포넌트 구현
    - `RoomListPage`: 대화방 목록 페이지 레이아웃
    - `RoomList`: 대화방 목록 렌더링 (제목, 주제, 생성자, 참여자 수 표시)
    - `RoomCard`: 개별 대화방 카드 컴포넌트 (클릭 시 대화방 이동)
    - `RoomCreateForm`: 대화방 생성 양식 (제목, 주제 입력, 유효성 검사)
    - 대화방이 없을 때 안내 메시지 표시
    - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1_

- [ ] 10. 프론트엔드 구현 - 대화방 화면
  - [ ] 10.1 ChatRoomPage 및 하위 컴포넌트 구현
    - `ChatRoomPage`: 대화방 화면 레이아웃 (Socket.IO 연결 관리)
    - `MessageList`: 메시지 목록 렌더링 (이력 로드 + 실시간 수신)
    - `MessageItem`: 개별 메시지 표시 (전송자 이름, 전송 시각)
    - `MessageInput`: 메시지 입력 및 전송 (빈 메시지 전송 차단)
    - `ParticipantList`: 현재 참여자 목록 표시
    - 새 메시지 수신 시 자동 스크롤 구현
    - 퇴장 버튼 및 퇴장 시 목록 페이지 이동 처리
    - 입장/퇴장 알림 메시지 표시
    - _Requirements: 3.2, 3.3, 3.4, 4.1, 4.2, 4.4, 4.5, 5.1, 5.2, 5.3_

- [ ] 11. 프론트엔드와 백엔드 연동
  - [ ] 11.1 전체 연동 및 사용자 식별 처리
    - 사용자 이름 입력/저장 처리 (localStorage 활용)
    - 프론트엔드 빌드 스크립트 설정 (Express 정적 서빙 경로에 출력)
    - 존재하지 않는 대화방 접근 시 목록 페이지로 리다이렉트 처리
    - WebSocket 재연결 시 자동 재입장 처리
    - _Requirements: 3.1, 5.3_

- [ ] 12. 최종 체크포인트 - 전체 시스템 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의한다.

## Notes

- `*` 표시된 태스크는 선택 사항이며, 빠른 MVP를 위해 건너뛸 수 있다
- 각 태스크는 추적 가능성을 위해 특정 요구사항을 참조한다
- 체크포인트를 통해 단계별 검증을 수행한다
- 속성 기반 테스트는 설계 문서의 정확성 속성을 검증한다
- 단위 테스트는 특정 예제와 엣지 케이스를 검증한다
