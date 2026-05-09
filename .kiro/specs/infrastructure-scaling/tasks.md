# 구현 계획: 인프라 확장 (Infrastructure Scaling)

## 개요

단일 EC2 인스턴스 기반 독서토론 플랫폼을 10만 사용자를 지원하는 확장 가능한 AWS 인프라로 전환한다. 기존 API 인터페이스와 데이터를 보존하면서, IaC(Infrastructure as Code) 및 애플리케이션 코드 변경을 통해 수평 확장 아키텍처를 구축한다.

## Tasks

- [x] 1. 프로젝트 구조 설정 및 의존성 추가
  - [x] 1.1 서버 의존성 추가 (ioredis, @opensearch-project/opensearch, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner)
    - `server/package.json`에 AWS SDK, Redis, OpenSearch 클라이언트 패키지 추가
    - _Requirements: 3.1, 4.1, 5.1_

  - [x] 1.2 환경 변수 설정 파일 업데이트
    - `server/.env.example`에 Aurora Writer/Reader URL, Redis, OpenSearch, S3, CloudFront 환경 변수 추가
    - 로컬 개발 환경과 AWS 환경을 구분하는 조건부 설정 주석 추가
    - _Requirements: 9.4_

  - [x] 1.3 인프라 디렉토리 구조 생성
    - `infra/` 디렉토리 생성 (CloudFormation 또는 CDK 템플릿 저장용)
    - `infra/templates/`, `infra/scripts/` 하위 디렉토리 구성
    - _Requirements: 1.7, 7.1_

- [x] 2. VPC 및 네트워크 인프라 구성
  - [x] 2.1 VPC CloudFormation 템플릿 작성
    - 2개 AZ에 걸친 퍼블릭/프라이빗 서브넷 구성 (애플리케이션, 데이터 계층 분리)
    - NAT Gateway, Internet Gateway, 라우팅 테이블 정의
    - CIDR 블록: VPC 10.0.0.0/16, 서브넷별 /24 할당
    - _Requirements: 7.1_

  - [x] 2.2 보안 그룹 CloudFormation 템플릿 작성
    - SG-ALB: 인바운드 443/80 (0.0.0.0/0)
    - SG-EC2: 인바운드 3000 (SG-ALB에서만)
    - SG-Aurora: 인바운드 3306 (SG-EC2에서만)
    - SG-Redis: 인바운드 6379 (SG-EC2에서만)
    - SG-OpenSearch: 인바운드 443 (SG-EC2에서만)
    - _Requirements: 7.3, 7.4, 7.5_

- [x] 3. ALB 및 Auto Scaling Group 구성
  - [x] 3.1 ALB CloudFormation 템플릿 작성
    - HTTPS 리스너 (ACM 인증서 연결), HTTP→HTTPS 리다이렉트 규칙
    - 대상 그룹: 포트 3000, 헬스체크 경로 /api/health, 간격 30초, 비정상 임계값 3회
    - WAF WebACL 연결 (SQL Injection, XSS, Rate Limiting 규칙)
    - _Requirements: 1.4, 1.5, 1.6, 7.2, 7.7_

  - [x] 3.2 ASG 및 시작 템플릿 CloudFormation 작성
    - 인스턴스 타입: t3.medium, 최소 2 / 최대 8 / 기본 2
    - 사용자 데이터 스크립트: S3에서 아티팩트 다운로드, npm ci, prisma generate, PM2 시작
    - IAM 인스턴스 프로파일: S3 읽기, CloudWatch 메트릭 전송 권한
    - _Requirements: 1.1, 1.7, 7.6_

  - [x] 3.3 Auto Scaling 정책 CloudFormation 작성
    - Scale-out: CPU 70% 초과 시 인스턴스 추가 (평가 기간 2회, 쿨다운 300초)
    - Scale-in: CPU 30% 미만 5분 유지 시 인스턴스 축소 (평가 기간 5회, 쿨다운 300초)
    - _Requirements: 1.2, 1.3_

- [x] 4. 체크포인트 - 네트워크/컴퓨팅 인프라 검증
  - 모든 CloudFormation 템플릿의 문법 검증 (`aws cloudformation validate-template`)
  - 보안 그룹 간 참조 관계가 올바른지 확인, 질문이 있으면 사용자에게 문의

- [x] 5. RDS Aurora MySQL 구성
  - [x] 5.1 Aurora 클러스터 CloudFormation 템플릿 작성
    - 엔진: Aurora MySQL 8.0 호환, Writer 1개 + Reader 1개 (db.r6g.large)
    - 프라이빗 서브넷 그룹, 파라미터 그룹 (utf8mb4_unicode_ci)
    - 자동 백업 7일, KMS 암호화, Multi-AZ 페일오버
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.6_

  - [x] 5.2 Prisma 읽기/쓰기 분리 구현
    - `server/src/lib/prisma.ts` 생성: writerPrisma (DATABASE_WRITER_URL), readerPrisma (DATABASE_READER_URL)
    - 환경 변수 미설정 시 기존 DATABASE_URL로 폴백하는 로직 추가
    - _Requirements: 2.3, 9.4, 9.6_

  - [x] 5.3 기존 서비스 파일에서 Prisma 인스턴스 교체
    - 읽기 전용 쿼리(목록 조회, 검색)는 readerPrisma 사용
    - 쓰기 쿼리(생성, 수정, 삭제)는 writerPrisma 사용
    - 기존 API 응답 형식은 변경하지 않음
    - _Requirements: 2.3, 9.3_

  - [ ]* 5.4 Prisma 읽기/쓰기 분리 단위 테스트 작성
    - 환경 변수에 따른 올바른 인스턴스 선택 검증
    - 폴백 로직 테스트
    - _Requirements: 2.3, 9.4_

- [x] 6. ElastiCache Redis 세션 및 캐시 구현
  - [x] 6.1 Redis 클러스터 CloudFormation 템플릿 작성
    - 노드 타입: cache.r6g.large, 복제본 1개 (Multi-AZ)
    - TLS 활성화, AUTH 토큰, allkeys-lru 정책
    - 프라이빗 서브넷 배치
    - _Requirements: 3.6, 3.7, 7.4_

  - [x] 6.2 Redis 서비스 모듈 구현
    - `server/src/services/redis.service.ts` 생성
    - 연결 관리: ioredis 클라이언트 초기화, TLS 옵션, 재연결 로직
    - 세션 관리: setSession, getSession, deleteSession (TTL 24시간)
    - 캐시 관리: setCache, getCache, invalidateCache (패턴 기반 삭제)
    - 헬스체크: ping() 메서드
    - 환경 변수 미설정 시 Redis 비활성화 (로컬 개발 지원)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.4_

  - [x] 6.3 기존 서비스에 캐시 레이어 적용
    - discussion.service.ts: 인기 게시글 목록 캐싱, 게시글 CUD 시 캐시 무효화
    - group.service.ts: 그룹 정보 캐싱, 그룹 변경 시 캐시 무효화
    - 캐시 키 규칙: `bookclub:cache:{entity}:{id}` 형식
    - _Requirements: 3.4, 3.5_

  - [ ]* 6.4 Redis 서비스 단위 테스트 작성
    - 세션 CRUD 동작 검증
    - 캐시 무효화 패턴 매칭 검증
    - Redis 미연결 시 그레이스풀 폴백 검증
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 7. 체크포인트 - 데이터 계층 검증
  - Prisma 읽기/쓰기 분리 및 Redis 서비스 코드 컴파일 확인
  - 기존 테스트가 통과하는지 확인, 질문이 있으면 사용자에게 문의

- [x] 8. OpenSearch 전문 검색 서비스 구현
  - [x] 8.1 OpenSearch 도메인 CloudFormation 템플릿 작성
    - 프라이빗 서브넷 배치, VPC 엔드포인트
    - Nori 분석기 플러그인 활성화
    - 인스턴스 타입 및 스토리지 설정
    - _Requirements: 4.2, 4.7_

  - [x] 8.2 OpenSearch 검색 서비스 모듈 구현
    - `server/src/services/search.service.ts` 생성
    - 인덱스 매핑 정의: title, content, authorNickname, bookTitle (Nori 분석기)
    - indexDocument, updateDocument, deleteDocument 메서드
    - search 메서드: 멀티필드 검색, 관련도 정렬, 페이지네이션
    - bulkIndex 메서드 (마이그레이션용)
    - 환경 변수 미설정 시 검색 비활성화 (로컬 개발 지원)
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 9.4_

  - [x] 8.3 기존 서비스에 검색 인덱싱 연동
    - discussion.service.ts: 게시글 생성/수정/삭제 시 OpenSearch 인덱스 비동기 업데이트
    - memo.service.ts: 메모 생성/수정/삭제 시 인덱스 업데이트
    - 검색 API 엔드포인트 추가: `GET /api/search?q={query}&type={type}`
    - _Requirements: 4.4, 4.5_

  - [ ]* 8.4 OpenSearch 서비스 단위 테스트 작성
    - 인덱싱 문서 형식 검증
    - 검색 쿼리 빌더 로직 검증
    - _Requirements: 4.1, 4.3_

- [x] 9. S3 파일 업로드 및 CloudFront 구성
  - [x] 9.1 S3 버킷 및 CloudFront CloudFormation 템플릿 작성
    - S3 버킷 2개: bookclub-uploads (이미지), bookclub-assets (정적 파일)
    - CloudFront 배포: OAI를 통한 S3 접근, 커스텀 도메인, ACM 인증서
    - 버킷 정책: CloudFront OAI만 직접 접근 허용
    - _Requirements: 5.2, 5.4, 5.5, 5.7_

  - [x] 9.2 S3 스토리지 서비스 모듈 구현
    - `server/src/services/storage.service.ts` 생성
    - uploadFile: Buffer → S3 PutObject, 키 생성 규칙 `uploads/{userId}/{timestamp}-{randomId}.{ext}`
    - deleteFile: S3 DeleteObject
    - getPublicUrl: CloudFront 도메인 기반 URL 반환
    - 환경 변수 미설정 시 로컬 파일시스템 폴백 (기존 multer 동작 유지)
    - _Requirements: 5.1, 5.3, 9.4_

  - [x] 9.3 기존 파일 업로드 로직을 S3로 전환
    - 기존 multer 로컬 저장 로직을 S3 업로드로 교체
    - 이미지 URL 응답 형식을 CloudFront URL로 변경
    - 로컬 개발 시 기존 로컬 저장 방식 유지 (환경 변수 분기)
    - _Requirements: 5.1, 5.3, 9.3, 9.4_

  - [ ]* 9.4 스토리지 서비스 단위 테스트 작성
    - 키 생성 규칙 검증
    - 환경 변수에 따른 로컬/S3 분기 검증
    - _Requirements: 5.1, 5.3_

- [x] 10. 체크포인트 - 애플리케이션 서비스 검증
  - 모든 새 서비스 모듈 컴파일 확인
  - 기존 테스트 통과 확인, 질문이 있으면 사용자에게 문의

- [x] 11. 헬스체크 엔드포인트 확장
  - [x] 11.1 종합 헬스체크 엔드포인트 구현
    - `GET /api/health` 확장: Aurora, Redis, OpenSearch 연결 상태 확인
    - 모든 서비스 정상 시 200, 일부 장애 시 503 (degraded) 응답
    - 응답 형식: `{ status, checks: { database, redis, opensearch }, timestamp }`
    - _Requirements: 1.5, 9.3_

  - [ ]* 11.2 헬스체크 단위 테스트 작성
    - 정상/비정상 상태별 응답 코드 검증
    - _Requirements: 1.5_

- [x] 12. CI/CD 파이프라인 구성
  - [x] 12.1 GitHub Actions CI 워크플로우 작성
    - `.github/workflows/ci.yml` 생성
    - 트리거: feature/* 브랜치 PR, develop/main 푸시
    - 단계: checkout → Node.js 설정 → 의존성 설치 → 린트 → 타입 체크 → 테스트 → 빌드
    - 테스트 실패 시 워크플로우 중단
    - _Requirements: 6.3, 6.4_

  - [x] 12.2 GitHub Actions 백엔드 CD 워크플로우 작성
    - `.github/workflows/deploy-backend.yml` 생성
    - 트리거: main 머지 (프로덕션), develop 푸시 (개발)
    - 단계: 빌드 → 아티팩트 패키징 → S3 업로드 → ASG 인스턴스 리프레시 (최소 정상 비율 50%)
    - 배포 후 헬스체크 확인 스텝
    - _Requirements: 6.1, 6.2, 6.5, 6.7_

  - [x] 12.3 GitHub Actions 프론트엔드 CD 워크플로우 작성
    - `.github/workflows/deploy-frontend.yml` 생성
    - 트리거: main 머지 시 client/ 변경 감지
    - 단계: React 빌드 → S3 정적 파일 업로드 → CloudFront 캐시 무효화
    - _Requirements: 6.6_

- [x] 13. 모니터링 및 알림 구성
  - [x] 13.1 CloudWatch 대시보드 및 알람 CloudFormation 작성
    - 대시보드: ASG CPU/메모리/네트워크, ALB 요청수/에러율, Aurora 연결수/지연
    - 알람: CPU > 80% 또는 에러율 > 5% → SNS 알림
    - ALB 액세스 로그 → S3 버킷 저장
    - Aurora 슬로우 쿼리 로그 → CloudWatch Logs
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 13.2 Redis 및 OpenSearch 모니터링 설정
    - Redis: 캐시 히트율, 메모리 사용량 메트릭 CloudWatch 전송
    - OpenSearch: 인덱싱 지연, 검색 지연 메트릭 CloudWatch 전송
    - _Requirements: 8.6, 8.7_

- [x] 14. 데이터 마이그레이션 스크립트 작성
  - [x] 14.1 MySQL → Aurora 마이그레이션 스크립트 작성
    - `infra/scripts/migrate-database.sh` 생성
    - mysqldump를 통한 데이터 내보내기 및 Aurora 복원
    - 마이그레이션 전후 레코드 수 검증 로직
    - 롤백 절차 문서화 (원본 MySQL 유지)
    - _Requirements: 2.7, 9.1, 9.5_

  - [x] 14.2 로컬 uploads → S3 마이그레이션 스크립트 작성
    - `infra/scripts/migrate-uploads.sh` 생성
    - `aws s3 sync` 명령으로 기존 uploads/ 폴더를 S3로 이전
    - 기존 URL 경로와 동일하게 접근 가능하도록 키 구조 설정
    - _Requirements: 5.6, 9.2_

  - [x] 14.3 OpenSearch 벌크 인덱싱 스크립트 작성
    - `infra/scripts/bulk-index.ts` 생성
    - 기존 Discussion, Memo, Book 데이터를 OpenSearch에 벌크 인덱싱
    - 진행률 표시 및 에러 핸들링
    - _Requirements: 4.1, 4.4_

- [x] 15. 통합 및 최종 연결
  - [x] 15.1 ecosystem.config.js 업데이트
    - PM2 설정에 클러스터 모드 적용 (인스턴스 수: CPU 코어 수)
    - 환경 변수 로딩 설정 추가
    - _Requirements: 1.7_

  - [x] 15.2 서버 진입점(index.ts)에 새 서비스 초기화 연결
    - Redis 서비스 초기화 및 연결
    - OpenSearch 서비스 초기화
    - 검색 API 라우트 등록
    - 그레이스풀 셧다운 시 연결 정리 로직 추가
    - _Requirements: 3.1, 4.1, 9.3_

  - [ ]* 15.3 통합 테스트 작성
    - 헬스체크 엔드포인트 통합 테스트
    - 검색 API 엔드포인트 통합 테스트
    - 파일 업로드 → S3 저장 흐름 통합 테스트
    - _Requirements: 1.5, 4.3, 5.3_

- [x] 16. 최종 체크포인트 - 전체 빌드 및 테스트 통과 확인
  - 전체 프로젝트 빌드 성공 확인 (`npm run build`)
  - 모든 기존 테스트 통과 확인 (`npm run test`)
  - 새로 추가된 테스트 통과 확인
  - 질문이 있으면 사용자에게 문의

## Notes

- `*` 표시된 태스크는 선택사항이며 빠른 MVP를 위해 건너뛸 수 있음
- 각 태스크는 특정 요구사항을 참조하여 추적 가능성을 보장
- 체크포인트를 통해 점진적 검증 수행
- 로컬 개발 환경 호환성을 유지하기 위해 모든 AWS 서비스 연동에 환경 변수 분기 처리 포함
- CloudFormation 템플릿은 `infra/templates/` 디렉토리에 저장
- 마이그레이션 스크립트는 `infra/scripts/` 디렉토리에 저장
