# 요구사항 문서

## 소개

채팅방 기반 웹사이트 기능으로, 사용자가 특정 주제에 대한 대화방을 생성하고, 다른 사용자가 대화방 목록을 탐색하며, 대화방에 참여하여 실시간으로 메시지를 주고받을 수 있는 기능을 제공한다.

## 용어 정의

- **Chat_Room_System**: 대화방의 생성, 목록 조회, 참여, 메시지 송수신을 관리하는 전체 시스템
- **Room_Creator**: 새로운 대화방을 생성하는 인증된 사용자
- **Room_Browser**: 대화방 목록을 탐색하고 조회하는 사용자
- **Room_Participant**: 특정 대화방에 참여하여 메시지를 주고받는 사용자
- **Chat_Room**: 특정 주제에 대해 사용자들이 대화를 나눌 수 있는 공간
- **Message**: 대화방 내에서 사용자가 전송하는 텍스트 내용
- **Room_List**: 현재 존재하는 대화방들의 목록

## 요구사항

### 요구사항 1: 대화방 생성

**사용자 스토리:** 사용자로서, 특정 주제에 대한 대화방을 생성하고 싶다. 그래야 해당 주제에 관심 있는 다른 사용자들과 대화를 나눌 수 있다.

#### 인수 조건

1. WHEN Room_Creator가 대화방 생성을 요청하면, THE Chat_Room_System SHALL 대화방 제목과 주제를 입력받는 생성 양식을 표시한다
2. WHEN Room_Creator가 유효한 제목과 주제를 입력하고 생성을 확인하면, THE Chat_Room_System SHALL 새로운 Chat_Room을 생성하고 Room_List에 추가한다
3. WHEN 새로운 Chat_Room이 생성되면, THE Chat_Room_System SHALL Room_Creator를 해당 Chat_Room의 첫 번째 Room_Participant로 자동 등록한다
4. IF Room_Creator가 제목 또는 주제를 비워둔 채 생성을 시도하면, THEN THE Chat_Room_System SHALL 필수 입력 항목을 안내하는 오류 메시지를 표시한다
5. THE Chat_Room_System SHALL 각 Chat_Room에 고유 식별자, 제목, 주제, 생성자 정보, 생성 시각을 저장한다

### 요구사항 2: 대화방 목록 조회

**사용자 스토리:** 사용자로서, 현재 존재하는 대화방 목록을 볼 수 있어야 한다. 그래야 관심 있는 주제의 대화방을 찾아 참여할 수 있다.

#### 인수 조건

1. WHEN Room_Browser가 대화방 목록 페이지에 접근하면, THE Chat_Room_System SHALL 현재 존재하는 모든 Chat_Room의 목록을 표시한다
2. THE Chat_Room_System SHALL 각 Chat_Room 항목에 제목, 주제, 생성자 이름, 현재 참여자 수를 표시한다
3. WHEN Room_Browser가 대화방 목록을 조회하면, THE Chat_Room_System SHALL 가장 최근에 생성된 Chat_Room을 목록 상단에 표시한다
4. IF 생성된 Chat_Room이 하나도 없으면, THEN THE Chat_Room_System SHALL 대화방이 없음을 안내하는 메시지를 표시한다

### 요구사항 3: 대화방 참여

**사용자 스토리:** 사용자로서, 관심 있는 대화방에 참여하고 싶다. 그래야 해당 주제에 대해 다른 사용자들과 대화를 나눌 수 있다.

#### 인수 조건

1. WHEN Room_Browser가 특정 Chat_Room을 선택하면, THE Chat_Room_System SHALL 해당 Chat_Room의 대화 화면으로 이동시킨다
2. WHEN 사용자가 Chat_Room에 입장하면, THE Chat_Room_System SHALL 해당 사용자를 Room_Participant로 등록하고 참여자 수를 갱신한다
3. WHEN Room_Participant가 Chat_Room에 입장하면, THE Chat_Room_System SHALL 이전에 전송된 Message 이력을 표시한다
4. WHEN 새로운 Room_Participant가 Chat_Room에 입장하면, THE Chat_Room_System SHALL 다른 Room_Participant에게 입장 알림을 표시한다

### 요구사항 4: 메시지 송수신

**사용자 스토리:** 대화방 참여자로서, 다른 참여자들과 실시간으로 메시지를 주고받고 싶다. 그래야 원활한 대화가 가능하다.

#### 인수 조건

1. WHEN Room_Participant가 메시지를 입력하고 전송하면, THE Chat_Room_System SHALL 해당 Message를 같은 Chat_Room의 모든 Room_Participant에게 실시간으로 전달한다
2. THE Chat_Room_System SHALL 각 Message에 전송자 이름과 전송 시각을 함께 표시한다
3. WHEN Room_Participant가 Message를 전송하면, THE Chat_Room_System SHALL 해당 Message를 저장하여 이후 입장하는 Room_Participant도 조회할 수 있도록 한다
4. IF Room_Participant가 빈 메시지를 전송하려고 하면, THEN THE Chat_Room_System SHALL 전송을 차단하고 메시지 입력을 안내한다
5. WHEN 새로운 Message가 수신되면, THE Chat_Room_System SHALL 대화 화면을 자동으로 최신 Message 위치로 스크롤한다

### 요구사항 5: 대화방 퇴장

**사용자 스토리:** 대화방 참여자로서, 대화방을 나갈 수 있어야 한다. 그래야 더 이상 관심 없는 대화방에서 자유롭게 빠져나올 수 있다.

#### 인수 조건

1. WHEN Room_Participant가 대화방 퇴장을 요청하면, THE Chat_Room_System SHALL 해당 사용자를 Room_Participant 목록에서 제거하고 참여자 수를 갱신한다
2. WHEN Room_Participant가 Chat_Room에서 퇴장하면, THE Chat_Room_System SHALL 나머지 Room_Participant에게 퇴장 알림을 표시한다
3. WHEN Room_Participant가 퇴장하면, THE Chat_Room_System SHALL 해당 사용자를 Room_List 페이지로 이동시킨다
