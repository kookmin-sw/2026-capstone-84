# 구현 계획: 서버 발급 자격증명

## 개요

서버가 랜덤 아이디/비밀번호를 생성하여 발급하는 회원가입 방식으로 전환한다. DB 스키마 변경부터 시작하여 공유 타입, 서버 서비스, API 라우트, 클라이언트 UI 순서로 점진적으로 구현한다.

## Tasks

- [x] 1. DB 스키마 마이그레이션 및 공유 타입 업데이트
  - [x] 1.1 `server/src/db/migrate.ts`에 `users` 테이블 `email` 컬럼 추가
    - `ALTER TABLE users ADD COLUMN email TEXT` 마이그레이션 추가
    - `email`에 UNIQUE 인덱스 생성 (NULL 허용, `WHERE email IS NOT NULL`)
    - 기존 사용자는 `email`이 NULL로 유지
    - _Requirements: 3.3, 3.4_

  - [x] 1.2 `shared/types/models.ts` 타입 확장
    - `UserAccount` 인터페이스에 `email: string | null` 필드 추가
    - `RegisterResponse` 인터페이스 추가 (`token`, `user`, `generatedUsername`, `generatedPassword`)
    - `ConvertResponse` 인터페이스 추가 (RegisterResponse와 동일 구조)
    - _Requirements: 3.1, 3.6, 9.2_

  - [x] 1.3 `shared/types/services.ts` 인터페이스 변경
    - `AuthService.register` 시그니처를 `(displayName: string, email: string)` 으로 변경하고 반환 타입에 `generatedUsername`, `generatedPassword` 추가
    - `AuthService`에 `reissue(email: string): Promise<void>` 메서드 추가
    - `AuthService`에 `convert(guestUserId: string, displayName: string, email: string)` 메서드 추가
    - `EmailService` 인터페이스 추가 (`sendCredentials`, `sendReissuedCredentials`)
    - _Requirements: 3.1, 3.5, 7.1, 9.1_

- [x] 2. CredentialGenerator 모듈 구현
  - [x] 2.1 `server/src/services/credential-generator.ts` 파일 생성
    - `generateUsername(isUnique: (username: string) => boolean): string` 함수 구현
    - `user-` 접두사 + 4자리 랜덤 숫자 형식 (예: `user-3847`)
    - `isUnique` 콜백으로 DB 중복 검사, 최대 10회 재시도
    - `generatePassword(): string` 함수 구현
    - 8자 영문 소문자 + 숫자 조합 랜덤 비밀번호 생성
    - `server/src/services/index.ts`에 export 추가
    - _Requirements: 1.1, 1.2, 2.1_

  - [ ]* 2.2 CredentialGenerator Property 테스트 작성 - 아이디 형식 준수
    - **Property 1: 아이디 형식 준수**
    - `generateUsername`이 반환하는 아이디가 `/^user-\d{4}$/` 정규식에 일치하는지 검증
    - `server/src/services/__tests__/credential-generator.test.ts` 파일에 작성
    - **Validates: Requirements 1.1**

  - [ ]* 2.3 CredentialGenerator Property 테스트 작성 - 아이디 고유성 보장
    - **Property 2: 아이디 고유성 보장**
    - 기존 아이디 집합에 대해 `generateUsername`이 반환하는 아이디가 해당 집합에 포함되지 않는지 검증
    - **Validates: Requirements 1.2**

  - [ ]* 2.4 CredentialGenerator Property 테스트 작성 - 비밀번호 형식 준수
    - **Property 3: 비밀번호 형식 준수**
    - `generatePassword`가 반환하는 비밀번호가 `/^[a-z0-9]{8}$/` 정규식에 일치하는지 검증
    - **Validates: Requirements 2.1**

- [x] 3. EmailService 모듈 구현
  - [x] 3.1 `server/src/services/email.service.ts` 파일 생성
    - `ConsoleEmailService` 클래스 구현 (dev 모드: 콘솔 출력)
    - `SesEmailService` 클래스 구현 (prod 모드: AWS SES)
    - `createEmailService()` 팩토리 함수 구현 (`EMAIL_MODE` 환경변수 기반)
    - `server/src/services/index.ts`에 export 추가
    - _Requirements: 3.7, 7.2, 9.5_

  - [ ]* 3.2 EmailService 단위 테스트 작성
    - `ConsoleEmailService`의 `sendCredentials`, `sendReissuedCredentials` 호출 검증
    - `createEmailService` 팩토리 함수의 환경변수 기반 분기 검증
    - `server/src/services/__tests__/email.service.test.ts` 파일에 작성
    - _Requirements: 3.7_

- [x] 4. AuthService 변경 및 Property 테스트
  - [x] 4.1 `server/src/services/auth.service.ts` 수정
    - 생성자에 `EmailService` 의존성 주입 추가
    - `register` 메서드 시그니처를 `(displayName: string, email: string)`로 변경
    - `register` 내부에서 `CredentialGenerator`로 아이디/비밀번호 생성
    - 이메일 중복 검사 로직 추가
    - 응답에 `generatedUsername`, `generatedPassword` 포함
    - 회원가입 성공 시 `EmailService.sendCredentials` 호출
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 3.4, 3.5, 3.6, 3.7_

  - [x] 4.2 `server/src/services/auth.service.ts`에 `reissue` 메서드 추가
    - 이메일로 사용자 조회
    - 새 비밀번호 생성 및 bcrypt 해싱 후 DB 업데이트
    - `EmailService.sendReissuedCredentials`로 새 자격증명 이메일 발송
    - 미등록 이메일 시 404 에러 throw
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 4.3 `server/src/services/auth.service.ts`에 `convert` 메서드 추가
    - 이메일 중복 검사
    - `CredentialGenerator`로 아이디/비밀번호 생성
    - 트랜잭션 내에서: 새 회원 계정 INSERT, messages/participants의 user_id UPDATE
    - `EmailService.sendCredentials`로 자격증명 이메일 발송
    - JWT 토큰 생성 및 응답 반환
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 4.4 AuthService Property 테스트 작성 - 비밀번호 저장 정확성
    - **Property 4: 비밀번호 저장 정확성**
    - 회원가입 후 DB의 password_hash가 생성된 평문 비밀번호와 bcrypt.compare로 일치하는지 검증
    - DB에 평문 비밀번호가 저장되지 않았는지 검증
    - in-memory SQLite + mock EmailService 사용
    - `server/src/services/__tests__/auth.service.test.ts` 파일에 작성
    - **Validates: Requirements 2.2, 2.3**

  - [ ]* 4.5 AuthService Property 테스트 작성 - 회원가입 응답 완전성
    - **Property 5: 회원가입 응답 완전성**
    - 유효한 displayName과 email로 회원가입 시 응답에 `generatedUsername`, `generatedPassword`, `token`, `user` 필드가 모두 존재하는지 검증
    - **Validates: Requirements 3.1, 3.5, 3.6**

  - [ ]* 4.6 AuthService Property 테스트 작성 - 회원가입 입력 검증
    - **Property 6: 회원가입 입력 검증**
    - 빈 문자열/공백 문자열을 displayName 또는 email로 전송 시 에러가 발생하는지 검증
    - **Validates: Requirements 3.2, 3.3**

  - [ ]* 4.7 AuthService Property 테스트 작성 - 이메일 고유성 강제
    - **Property 7: 이메일 고유성 강제**
    - 이미 등록된 이메일로 다시 회원가입 시 409 에러가 발생하는지 검증
    - **Validates: Requirements 3.4**

  - [ ]* 4.8 AuthService Property 테스트 작성 - 자격증명 재발급 라운드트립
    - **Property 8: 자격증명 재발급 라운드트립**
    - 회원가입 후 해당 이메일로 재발급 요청 시 성공하고, 새 비밀번호로 로그인 가능하며 이전 비밀번호로는 로그인 불가한지 검증
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 4.9 AuthService Property 테스트 작성 - 미등록 이메일 재발급 거부
    - **Property 9: 미등록 이메일 재발급 거부**
    - 등록되지 않은 이메일로 재발급 요청 시 404 에러가 발생하는지 검증
    - **Validates: Requirements 7.3**

  - [ ]* 4.10 AuthService Property 테스트 작성 - 게스트 회원전환 응답 완전성
    - **Property 10: 게스트 회원전환 응답 완전성 및 계정 생성**
    - 유효한 게스트 UUID, displayName, email로 회원전환 시 응답에 모든 필드가 존재하고 DB에 계정이 생성되는지 검증
    - **Validates: Requirements 9.1, 9.2**

  - [ ]* 4.11 AuthService Property 테스트 작성 - 게스트 데이터 마이그레이션 완전성
    - **Property 11: 게스트 데이터 마이그레이션 완전성**
    - 게스트 UUID로 생성된 메시지/참여 기록이 회원전환 후 새 회원 ID로 모두 업데이트되는지 검증
    - 기존 게스트 UUID로 된 레코드가 남아있지 않은지 검증
    - **Validates: Requirements 9.3, 9.4**

- [x] 5. 체크포인트 - 서버 서비스 레이어 검증
  - 모든 테스트가 통과하는지 확인하고, 문제가 있으면 사용자에게 질문합니다.

- [x] 6. Auth Router 변경
  - [x] 6.1 `server/src/routes/auth.ts`의 `POST /api/auth/register` 엔드포인트 수정
    - 요청 본문에서 `displayName`, `email`만 받도록 변경
    - `username`, `password`, `confirmPassword` 필드 제거
    - displayName/email 빈값 검증 (400 에러)
    - `authService.register(displayName, email)` 호출
    - 응답에 `generatedUsername`, `generatedPassword` 포함
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 6.2 `server/src/routes/auth.ts`에 `POST /api/auth/reissue` 엔드포인트 추가
    - 요청 본문에서 `email` 수신
    - `authService.reissue(email)` 호출
    - 성공 시 `{ message: "입력하신 이메일로 새 자격증명을 발송했습니다" }` 응답
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 6.3 `server/src/routes/auth.ts`에 `POST /api/auth/convert` 엔드포인트 추가
    - 요청 본문에서 `guestUserId`, `displayName`, `email` 수신
    - 각 필드 빈값 검증 (400 에러)
    - `authService.convert(guestUserId, displayName, email)` 호출
    - 응답에 `generatedUsername`, `generatedPassword` 포함
    - _Requirements: 9.1, 9.2_

  - [x] 6.4 `server/src/index.ts` 업데이트
    - `EmailService` 초기화 (`createEmailService()` 호출)
    - `AuthService` 생성자에 `EmailService` 인스턴스 주입
    - _Requirements: 3.7_

  - [ ]* 6.5 Auth Router 통합 테스트 작성
    - `server/src/routes/__tests__/auth.test.ts` 파일에 작성
    - 회원가입 → 로그인 전체 흐름 테스트 (supertest)
    - 회원가입 → 재발급 → 새 비밀번호 로그인 전체 흐름 테스트
    - 기존 사용자 로그인 호환성 테스트
    - 게스트 회원전환 → 로그인 전체 흐름 테스트
    - 게스트 회원전환 후 메시지/참여 기록 마이그레이션 검증
    - _Requirements: 3.1, 7.1, 7.2, 8.1, 8.2, 9.1, 9.3, 9.4_

- [x] 7. 체크포인트 - 서버 API 레이어 검증
  - 모든 테스트가 통과하는지 확인하고, 문제가 있으면 사용자에게 질문합니다.

- [x] 8. 클라이언트 useAuth 훅 및 공통 컴포넌트 구현
  - [x] 8.1 `client/src/hooks/useAuth.ts` 수정
    - `register` 함수 시그니처를 `(displayName: string, email: string)` 으로 변경
    - `register` 함수가 `{ generatedUsername, generatedPassword }` 를 반환하도록 변경
    - `convertGuest` 함수 추가: 게스트 userId로 `POST /api/auth/convert` 호출, 성공 시 JWT 저장 및 게스트 localStorage 삭제
    - _Requirements: 3.1, 9.1, 9.8_

  - [x] 8.2 `client/src/components/CredentialDisplay.tsx` 생성
    - `username`, `password`, `onConfirm` props 수신
    - 발급된 아이디/비밀번호 표시
    - 각각의 클립보드 복사 버튼
    - "이 정보는 다시 표시되지 않습니다. 안전한 곳에 보관해주세요." 경고 메시지
    - "확인했습니다" 버튼 (클릭 시 `onConfirm` 호출)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9. 클라이언트 페이지 구현
  - [x] 9.1 `client/src/pages/RegisterPage.tsx` 수정
    - 아이디/비밀번호/비밀번호 확인 입력 필드 제거
    - displayName + email 입력 필드만 표시
    - `step: 'form' | 'credentials'` 상태 관리
    - 회원가입 성공 시 `CredentialDisplay` 컴포넌트로 전환
    - `onRegister` prop 시그니처를 `(displayName: string, email: string) => Promise<{ generatedUsername: string; generatedPassword: string }>` 로 변경
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4_

  - [x] 9.2 `client/src/pages/ReissuePage.tsx` 생성
    - 이메일 입력 필드 + 재발급 요청 버튼
    - `POST /api/auth/reissue`에 이메일 전송
    - 성공 시 "입력하신 이메일로 새 자격증명을 발송했습니다" 안내 메시지 표시
    - 에러 시 서버 오류 메시지 표시
    - _Requirements: 7.4, 7.5, 7.6_

  - [x] 9.3 `client/src/pages/LoginPage.tsx` 수정
    - "자격증명을 잊으셨나요?" 링크 추가 (`/reissue` 페이지로 이동)
    - 기존 로그인 폼과 게스트 로그인 기능은 변경 없이 유지
    - _Requirements: 6.1, 6.2, 6.3, 7.4_

  - [x] 9.4 `client/src/components/GuestConvertForm.tsx` 생성
    - `currentDisplayName`, `onConvert`, `onClose` props 수신
    - displayName 입력 필드 (기존 게스트 닉네임 기본값)
    - email 입력 필드
    - "회원전환" 제출 버튼, "취소" 버튼
    - 전환 성공 시 `CredentialDisplay` 컴포넌트로 전환
    - _Requirements: 9.6, 9.7, 9.8_

- [x] 10. App.tsx 라우팅 및 헤더 변경
  - [x] 10.1 `client/src/App.tsx` 수정
    - `/reissue` 라우트 추가 (`ReissuePage` 연결)
    - 헤더에 게스트 상태일 때 "회원전환" 버튼 추가 (클릭 시 `GuestConvertForm` 모달 표시)
    - `showConvertForm`, `convertCredentials` 상태 관리
    - 회원전환 성공 시 `CredentialDisplay` 표시 후 채팅방 목록으로 이동
    - `RegisterPage`에 전달하는 `onRegister` prop을 새 시그니처에 맞게 변경
    - _Requirements: 4.3, 7.4, 9.6, 9.7, 9.8_

- [x] 11. 최종 체크포인트 - 전체 기능 검증
  - 모든 테스트가 통과하는지 확인하고, 문제가 있으면 사용자에게 질문합니다.

## Notes

- `*` 표시된 태스크는 선택 사항이며 빠른 MVP를 위해 건너뛸 수 있습니다
- 각 태스크는 추적 가능성을 위해 특정 요구사항을 참조합니다
- 체크포인트를 통해 점진적으로 검증합니다
- Property 테스트는 설계 문서의 정확성 속성을 검증합니다
- 단위 테스트는 특정 예시와 엣지 케이스를 검증합니다
