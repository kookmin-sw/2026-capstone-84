# 요구사항 문서

## 소개

기존 채팅방 애플리케이션에 선택적 회원가입/로그인 및 운영자 권한 기능을 추가한다. 사용자는 사이트 접속 시 로그인 화면을 통해 회원 로그인 또는 게스트 이용을 선택할 수 있으며, 운영자 계정으로 로그인하면 대화방 관리(조회, 삭제) 기능을 사용할 수 있다. 기존의 닉네임 기반 게스트 이용 방식은 그대로 유지된다.

## 용어 정의

- **Auth_System**: 회원가입, 로그인, 세션 관리, 권한 검증을 담당하는 인증/인가 시스템
- **Login_Page**: 사이트 접속 시 표시되는 로그인 화면으로, 아이디/비밀번호 입력 필드와 게스트 이용 옵션을 포함한다
- **Registered_User**: 아이디와 비밀번호로 회원가입을 완료한 사용자
- **Guest_User**: 회원가입 없이 닉네임만 입력하여 채팅방을 이용하는 사용자
- **Admin_User**: 운영자 권한을 가진 Registered_User로, 대화방 관리 기능에 접근할 수 있다
- **User_Account**: 아이디(username), 비밀번호 해시(password_hash), 역할(role)을 포함하는 사용자 계정 정보
- **Auth_Token**: 로그인 성공 시 발급되는 JWT 기반 인증 토큰으로, 사용자 식별 및 권한 검증에 사용된다
- **Chat_Room_System**: 대화방의 생성, 목록 조회, 참여, 메시지 송수신, 삭제를 관리하는 전체 시스템

## 요구사항

### 요구사항 1: 로그인 화면 표시

**사용자 스토리:** 사용자로서, 사이트 접속 시 로그인 화면을 통해 회원 로그인 또는 게스트 이용을 선택하고 싶다. 그래야 원하는 방식으로 채팅방을 이용할 수 있다.

#### 인수 조건

1. WHEN 인증되지 않은 사용자가 사이트에 접속하면, THE Auth_System SHALL 아이디 입력 필드, 비밀번호 입력 필드, 로그인 버튼, 회원가입 링크, "게스트로 이용하기" 버튼을 포함하는 Login_Page를 표시한다
2. WHEN 사용자가 유효한 아이디와 비밀번호를 입력하고 로그인 버튼을 클릭하면, THE Auth_System SHALL 자격 증명을 검증하고 Auth_Token을 발급하여 대화방 목록 페이지로 이동시킨다
3. IF 사용자가 잘못된 아이디 또는 비밀번호로 로그인을 시도하면, THEN THE Auth_System SHALL "아이디 또는 비밀번호가 올바르지 않습니다" 오류 메시지를 표시한다
4. IF 사용자가 아이디 또는 비밀번호를 비워둔 채 로그인을 시도하면, THEN THE Auth_System SHALL 필수 입력 항목을 안내하는 오류 메시지를 표시한다
5. WHILE Registered_User가 유효한 Auth_Token을 보유한 상태에서 사이트에 접속하면, THE Auth_System SHALL Login_Page를 건너뛰고 대화방 목록 페이지로 이동시킨다

### 요구사항 2: 게스트 이용

**사용자 스토리:** 사용자로서, 회원가입 없이 닉네임만 입력하여 채팅방을 이용하고 싶다. 그래야 간편하게 대화에 참여할 수 있다.

#### 인수 조건

1. WHEN 사용자가 Login_Page에서 "게스트로 이용하기" 버튼을 클릭하면, THE Auth_System SHALL 닉네임 입력 화면을 표시한다
2. WHEN Guest_User가 유효한 닉네임을 입력하고 확인하면, THE Auth_System SHALL 해당 닉네임을 localStorage에 저장하고 대화방 목록 페이지로 이동시킨다
3. IF Guest_User가 닉네임을 비워둔 채 확인을 시도하면, THEN THE Auth_System SHALL 닉네임 입력을 안내하는 오류 메시지를 표시한다
4. THE Auth_System SHALL Guest_User에게 대화방 생성, 목록 조회, 참여, 메시지 송수신, 퇴장 기능을 기존과 동일하게 제공한다
5. WHEN 닉네임 입력 화면이 표시되면, THE Auth_System SHALL 다음 경고 문구를 화면에 표시한다: "게스트 계정은 현재 사용 중인 브라우저에서만 유지됩니다. 브라우저의 인터넷 사용 기록을 삭제하면 이전에 참여했던 대화방을 다시 찾을 수 없습니다. 대화 기록을 안전하게 보관하려면 회원가입을 권장합니다."

### 요구사항 3: 회원가입

**사용자 스토리:** 사용자로서, 아이디와 비밀번호로 계정을 만들고 싶다. 그래야 회원 전용 기능을 이용하고 일관된 사용자 정보를 유지할 수 있다.

#### 인수 조건

1. WHEN 사용자가 Login_Page에서 회원가입 링크를 클릭하면, THE Auth_System SHALL 아이디, 비밀번호, 비밀번호 확인, 표시 이름 입력 필드를 포함하는 회원가입 양식을 표시한다
2. WHEN 사용자가 유효한 정보를 입력하고 회원가입을 확인하면, THE Auth_System SHALL 비밀번호를 bcrypt로 해싱하여 User_Account를 생성하고 "user" 역할을 부여한다
3. WHEN 회원가입이 완료되면, THE Auth_System SHALL Auth_Token을 발급하고 대화방 목록 페이지로 이동시킨다
4. IF 사용자가 이미 존재하는 아이디로 회원가입을 시도하면, THEN THE Auth_System SHALL "이미 사용 중인 아이디입니다" 오류 메시지를 표시한다
5. IF 사용자가 비밀번호와 비밀번호 확인이 일치하지 않는 상태로 회원가입을 시도하면, THEN THE Auth_System SHALL "비밀번호가 일치하지 않습니다" 오류 메시지를 표시한다
6. IF 사용자가 필수 입력 항목(아이디, 비밀번호, 표시 이름)을 비워둔 채 회원가입을 시도하면, THEN THE Auth_System SHALL 해당 필수 입력 항목을 안내하는 오류 메시지를 표시한다

### 요구사항 4: 운영자 대화방 관리

**사용자 스토리:** 운영자로서, 대화방 정보를 확인하고 불필요한 대화방을 삭제하고 싶다. 그래야 채팅방 서비스를 효과적으로 관리할 수 있다.

#### 인수 조건

1. WHEN Admin_User가 대화방 목록 페이지에 접근하면, THE Chat_Room_System SHALL 각 대화방 항목에 삭제 버튼을 표시한다
2. WHEN Admin_User가 대화방 삭제 버튼을 클릭하면, THE Chat_Room_System SHALL 삭제 확인 대화 상자를 표시한다
3. WHEN Admin_User가 삭제를 확인하면, THE Chat_Room_System SHALL 해당 대화방과 관련된 모든 메시지 및 참여자 데이터를 삭제하고 대화방 목록을 갱신한다
4. WHILE Guest_User 또는 일반 Registered_User가 대화방 목록 페이지에 접근한 상태에서, THE Chat_Room_System SHALL 삭제 버튼을 표시하지 않는다
5. IF Admin_User가 아닌 사용자가 대화방 삭제 API를 호출하면, THEN THE Chat_Room_System SHALL 403 Forbidden 응답을 반환하고 삭제를 거부한다
6. WHEN 대화방이 삭제되면, THE Chat_Room_System SHALL 해당 대화방에 참여 중인 모든 사용자에게 대화방 삭제 알림을 전송하고 대화방 목록 페이지로 이동시킨다

### 요구사항 5: 인증 토큰 관리

**사용자 스토리:** 회원 사용자로서, 로그인 상태가 유지되고 로그아웃할 수 있어야 한다. 그래야 매번 로그인하지 않아도 되고 필요할 때 안전하게 로그아웃할 수 있다.

#### 인수 조건

1. WHEN Registered_User가 로그인에 성공하면, THE Auth_System SHALL JWT 형식의 Auth_Token을 생성하여 localStorage에 저장한다
2. THE Auth_System SHALL Auth_Token에 사용자 식별자(userId), 아이디(username), 표시 이름(displayName), 역할(role) 정보를 포함한다
3. WHEN Registered_User가 로그아웃 버튼을 클릭하면, THE Auth_System SHALL localStorage에서 Auth_Token을 삭제하고 Login_Page로 이동시킨다
4. WHEN Auth_System이 인증이 필요한 API 요청을 수신하면, THE Auth_System SHALL Authorization 헤더의 Auth_Token을 검증하여 유효하지 않은 경우 401 Unauthorized 응답을 반환한다
5. THE Auth_System SHALL Registered_User의 표시 이름을 채팅방 내 사용자 이름으로 사용한다

### 요구사항 6: 운영자 계정 초기화

**사용자 스토리:** 시스템 관리자로서, 서버 시작 시 기본 운영자 계정이 자동으로 생성되어야 한다. 그래야 별도의 설정 없이 운영자 기능을 사용할 수 있다.

#### 인수 조건

1. WHEN 서버가 시작되면, THE Auth_System SHALL users 테이블에 운영자 계정이 존재하지 않는 경우 기본 운영자 계정(아이디: admin)을 생성한다
2. THE Auth_System SHALL 기본 운영자 계정의 비밀번호를 환경 변수(ADMIN_PASSWORD)에서 읽어오며, 환경 변수가 설정되지 않은 경우 기본값 "admin1234"를 사용한다
3. THE Auth_System SHALL 기본 운영자 계정에 "admin" 역할을 부여한다
4. WHILE 운영자 계정이 이미 존재하는 상태에서 서버가 시작되면, THE Auth_System SHALL 기존 운영자 계정을 유지하고 중복 생성하지 않는다

### 요구사항 7: 게스트/회원 이용 범위 차이

**사용자 스토리:** 회원 사용자로서, 어떤 브라우저에서든 로그인하여 이전에 참여했던 대화방에 접근하고 싶다. 그래야 기기나 브라우저가 바뀌어도 대화 이력을 유지할 수 있다.

#### 인수 조건

1. WHEN Registered_User가 다른 브라우저에서 동일한 아이디와 비밀번호로 로그인하면, THE Auth_System SHALL 해당 사용자의 참여 대화방 이력을 동일하게 제공한다
2. THE Auth_System SHALL Guest_User의 세션을 현재 브라우저의 localStorage에만 유지하며, 다른 브라우저에서는 이전 게스트 세션에 접근할 수 없다

### 요구사항 8: 비활성 게스트 참여자 정리

**사용자 스토리:** 시스템 관리자로서, 오래된 비활성 게스트 참여자 데이터가 자동으로 정리되어야 한다. 그래야 데이터베이스가 불필요한 데이터로 비대해지지 않는다.

#### 인수 조건

1. WHEN 서버가 시작되면, THE Auth_System SHALL participants 테이블에서 게스트 사용자이면서 joined_at이 30일 이상 경과한 참여자 레코드를 자동으로 삭제한다
2. THE Auth_System SHALL 게스트 참여자 정리 시 Registered_User의 참여자 레코드는 삭제하지 않는다
3. THE Auth_System SHALL 게스트 참여자 정리 작업을 서버 시작 시 1회 실행한다
