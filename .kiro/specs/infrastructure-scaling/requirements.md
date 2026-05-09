# 요구사항 문서: 인프라 확장 (Infrastructure Scaling)

## 소개

독서토론 사이트를 책 커뮤니티 플랫폼으로 대대적 개편함에 따라, 현재 단일 EC2 인스턴스 기반 인프라를 10만 사용자를 감당할 수 있는 확장 가능한 AWS 인프라로 전환한다. 기존 독서토론 기능은 그대로 유지하면서, 새로운 커뮤니티 기능(게시판, 알림, AI 모더레이션)이 올라갈 수 있는 기반을 마련한다.

## 용어 정의 (Glossary)

- **ASG**: Auto Scaling Group. EC2 인스턴스를 트래픽에 따라 자동으로 증감시키는 AWS 서비스
- **ALB**: Application Load Balancer. 수신 트래픽을 여러 EC2 인스턴스에 분산하는 로드 밸런서
- **RDS_Aurora**: Amazon Aurora MySQL 호환 관계형 데이터베이스 서비스
- **읽기_복제본**: Aurora Reader 인스턴스. 읽기 전용 쿼리를 분산 처리하는 복제본
- **ElastiCache_Redis**: AWS 관리형 Redis 인메모리 캐시 서비스
- **OpenSearch_Service**: AWS 관리형 Elasticsearch 호환 검색 서비스
- **Nori_분석기**: 한국어 형태소 분석기. OpenSearch에서 한국어 텍스트를 토큰화하는 플러그인
- **S3**: Amazon Simple Storage Service. 객체 스토리지 서비스
- **CloudFront**: AWS CDN 서비스. 정적 콘텐츠를 엣지 로케이션에서 제공
- **CI_CD_파이프라인**: GitHub Actions 기반 지속적 통합/배포 파이프라인
- **세션_스토어**: Redis 기반 분산 세션 저장소
- **헬스체크_엔드포인트**: ALB가 인스턴스 상태를 확인하는 API 경로 (/api/health)
- **배포_대상_그룹**: ALB가 트래픽을 라우팅하는 EC2 인스턴스 그룹 (Target Group)
- **롤링_배포**: 인스턴스를 순차적으로 교체하여 무중단 배포를 수행하는 방식

## 요구사항

### 요구사항 1: EC2 Auto Scaling Group 및 ALB 구성

**사용자 스토리:** 운영자로서, 트래픽 증가에 따라 서버가 자동으로 확장되길 원한다. 이를 통해 10만 사용자 동시 접속 시에도 서비스 안정성을 유지할 수 있다.

#### 인수 조건

1. THE ASG SHALL 최소 2개, 최대 8개의 EC2 인스턴스를 유지한다
2. WHEN 평균 CPU 사용률이 70%를 초과하면, THE ASG SHALL 인스턴스를 추가한다
3. WHEN 평균 CPU 사용률이 30% 미만으로 5분간 유지되면, THE ASG SHALL 인스턴스를 축소한다
4. THE ALB SHALL 수신되는 HTTP/HTTPS 요청을 ASG 내 정상 인스턴스에 균등 분배한다
5. WHEN 헬스체크_엔드포인트(/api/health)가 3회 연속 실패하면, THE ALB SHALL 해당 인스턴스를 배포_대상_그룹에서 제외한다
6. THE ALB SHALL HTTPS(443) 트래픽만 허용하고 HTTP(80) 요청을 HTTPS로 리다이렉트한다
7. WHEN 새 인스턴스가 ASG에 추가되면, THE ASG SHALL 시작 템플릿에 정의된 사용자 데이터 스크립트를 실행하여 애플리케이션을 자동 배포한다

### 요구사항 2: RDS Aurora MySQL 마이그레이션

**사용자 스토리:** 운영자로서, 데이터베이스를 고가용성 Aurora MySQL로 마이그레이션하여 데이터 안정성과 읽기 성능을 확보하고 싶다.

#### 인수 조건

1. THE RDS_Aurora SHALL MySQL 8.0 호환 모드로 클러스터를 구성한다
2. THE RDS_Aurora SHALL 1개의 Writer 인스턴스와 최소 1개의 읽기_복제본을 유지한다
3. WHEN 애플리케이션이 읽기 전용 쿼리를 실행하면, THE RDS_Aurora SHALL 읽기_복제본 엔드포인트로 라우팅한다
4. THE RDS_Aurora SHALL 자동 백업을 7일간 보관한다
5. IF Writer 인스턴스에 장애가 발생하면, THEN THE RDS_Aurora SHALL 읽기_복제본을 Writer로 자동 승격한다 (페일오버 시간 30초 이내)
6. THE RDS_Aurora SHALL VPC 프라이빗 서브넷에서만 접근 가능하도록 보안 그룹을 구성한다
7. WHEN 기존 MySQL 데이터를 마이그레이션하면, THE RDS_Aurora SHALL 모든 기존 테이블 스키마와 데이터를 무손실로 이전한다

### 요구사항 3: ElastiCache Redis 세션 및 캐시 관리

**사용자 스토리:** 개발자로서, 분산 환경에서 세션 일관성을 유지하고 인기 데이터를 캐싱하여 응답 속도를 개선하고 싶다.

#### 인수 조건

1. THE ElastiCache_Redis SHALL JWT 리프레시 토큰과 세션 데이터를 중앙 집중식으로 저장한다
2. WHEN 사용자가 로그인하면, THE 세션_스토어 SHALL 세션 데이터를 Redis에 저장하고 TTL을 24시간으로 설정한다
3. WHEN 사용자가 로그아웃하면, THE 세션_스토어 SHALL 해당 세션 데이터를 Redis에서 즉시 삭제한다
4. THE ElastiCache_Redis SHALL 인기 게시글 목록, 그룹 정보 등 핫 데이터를 캐싱한다
5. WHEN 캐싱된 데이터의 원본이 변경되면, THE ElastiCache_Redis SHALL 해당 캐시를 무효화한다
6. THE ElastiCache_Redis SHALL Multi-AZ 복제를 통해 고가용성을 보장한다
7. IF Redis 노드에 장애가 발생하면, THEN THE ElastiCache_Redis SHALL 자동으로 복제본으로 페일오버한다

### 요구사항 4: OpenSearch 전문 검색 서비스

**사용자 스토리:** 사용자로서, 커뮤니티 게시글을 책 제목, 작성자 닉네임, 본문 내용으로 빠르게 검색하고 싶다.

#### 인수 조건

1. THE OpenSearch_Service SHALL 게시글(Discussion), 메모(Memo), 책(Book) 데이터를 인덱싱한다
2. THE OpenSearch_Service SHALL Nori_분석기를 사용하여 한국어 텍스트를 형태소 단위로 분석한다
3. WHEN 사용자가 검색어를 입력하면, THE OpenSearch_Service SHALL 책 제목, 작성자 닉네임, 게시글 제목, 게시글 본문에서 매칭 결과를 반환한다
4. WHEN 새 게시글이 작성되면, THE OpenSearch_Service SHALL 해당 게시글을 5초 이내에 인덱스에 반영한다
5. WHEN 게시글이 수정 또는 삭제되면, THE OpenSearch_Service SHALL 인덱스를 동기화한다
6. THE OpenSearch_Service SHALL 검색 결과를 관련도 점수 기준으로 정렬하여 반환한다
7. THE OpenSearch_Service SHALL VPC 프라이빗 서브넷 내에서만 접근 가능하도록 구성한다

### 요구사항 5: S3 및 CloudFront 정적 파일 관리

**사용자 스토리:** 운영자로서, 이미지와 정적 파일을 안정적으로 저장하고 CDN을 통해 빠르게 제공하고 싶다.

#### 인수 조건

1. THE S3 SHALL 사용자 업로드 이미지(프로필, 게시글 첨부)를 저장한다
2. THE S3 SHALL React 빌드 결과물(정적 파일)을 저장한다
3. WHEN 사용자가 이미지를 업로드하면, THE S3 SHALL 고유한 키를 생성하여 파일을 저장한다
4. THE CloudFront SHALL S3에 저장된 정적 파일과 이미지를 엣지 로케이션에서 제공한다
5. THE CloudFront SHALL 커스텀 도메인과 SSL 인증서를 사용하여 HTTPS로 콘텐츠를 제공한다
6. WHEN 기존 uploads/ 폴더의 이미지를 마이그레이션하면, THE S3 SHALL 모든 기존 파일을 무손실로 이전한다
7. THE S3 SHALL 버킷 정책을 통해 CloudFront OAI(Origin Access Identity)만 직접 접근을 허용한다

### 요구사항 6: CI/CD 파이프라인 구성

**사용자 스토리:** 개발자로서, 코드를 푸시하면 자동으로 테스트와 배포가 실행되어 개발 생산성을 높이고 싶다.

#### 인수 조건

1. WHEN 코드가 main 브랜치에 머지되면, THE CI_CD_파이프라인 SHALL 프로덕션 환경에 자동 배포한다
2. WHEN 코드가 develop 브랜치에 푸시되면, THE CI_CD_파이프라인 SHALL 개발 서버에 자동 배포한다
3. THE CI_CD_파이프라인 SHALL 배포 전에 린트 검사, 타입 체크, 단위 테스트를 실행한다
4. IF 테스트가 실패하면, THEN THE CI_CD_파이프라인 SHALL 배포를 중단하고 실패 알림을 전송한다
5. THE CI_CD_파이프라인 SHALL 롤링_배포 방식으로 무중단 배포를 수행한다
6. THE CI_CD_파이프라인 SHALL 프론트엔드 빌드 결과물을 S3에 업로드하고 CloudFront 캐시를 무효화한다
7. WHEN 배포가 완료되면, THE CI_CD_파이프라인 SHALL 헬스체크_엔드포인트를 호출하여 배포 성공을 확인한다

### 요구사항 7: 네트워크 및 보안 구성

**사용자 스토리:** 운영자로서, 인프라 구성요소 간 안전한 통신을 보장하고 외부 공격으로부터 시스템을 보호하고 싶다.

#### 인수 조건

1. THE ASG SHALL VPC 내 퍼블릭 서브넷(ALB)과 프라이빗 서브넷(EC2)으로 분리 배치한다
2. THE ALB SHALL WAF(Web Application Firewall) 규칙을 적용하여 악성 요청을 차단한다
3. THE RDS_Aurora SHALL EC2 보안 그룹에서만 3306 포트 접근을 허용한다
4. THE ElastiCache_Redis SHALL EC2 보안 그룹에서만 6379 포트 접근을 허용한다
5. THE OpenSearch_Service SHALL EC2 보안 그룹에서만 443 포트 접근을 허용한다
6. THE ASG SHALL 각 EC2 인스턴스에 IAM 역할을 부여하여 S3, CloudWatch 접근 권한을 관리한다
7. THE ALB SHALL SSL/TLS 인증서(ACM)를 사용하여 클라이언트-서버 간 암호화 통신을 보장한다

### 요구사항 8: 모니터링 및 로깅

**사용자 스토리:** 운영자로서, 인프라 상태를 실시간으로 모니터링하고 장애 발생 시 신속하게 대응하고 싶다.

#### 인수 조건

1. THE ASG SHALL CloudWatch 메트릭(CPU, 메모리, 네트워크)을 수집하여 대시보드에 표시한다
2. WHEN CPU 사용률이 80%를 초과하거나 에러율이 5%를 초과하면, THE CloudWatch SHALL SNS를 통해 운영자에게 알림을 전송한다
3. THE ALB SHALL 액세스 로그를 S3 버킷에 저장한다
4. THE RDS_Aurora SHALL 슬로우 쿼리 로그를 CloudWatch Logs에 전송한다
5. THE CI_CD_파이프라인 SHALL 배포 이력을 기록하고 실패 시 롤백 절차를 제공한다
6. THE ElastiCache_Redis SHALL 캐시 히트율, 메모리 사용량 메트릭을 CloudWatch에 전송한다
7. THE OpenSearch_Service SHALL 인덱싱 지연, 검색 지연 메트릭을 CloudWatch에 전송한다

### 요구사항 9: 데이터 마이그레이션 및 하위 호환성

**사용자 스토리:** 운영자로서, 기존 서비스 중단 없이 새 인프라로 전환하고 기존 데이터를 안전하게 이전하고 싶다.

#### 인수 조건

1. WHEN 데이터베이스를 마이그레이션하면, THE RDS_Aurora SHALL 기존 MySQL의 모든 Prisma 스키마 테이블과 데이터를 보존한다
2. WHEN 이미지 파일을 마이그레이션하면, THE S3 SHALL 기존 uploads/ 폴더의 모든 파일을 동일한 URL 경로로 접근 가능하게 이전한다
3. THE 애플리케이션 SHALL 기존 /api/* 엔드포인트의 요청/응답 형식을 변경하지 않는다
4. THE 애플리케이션 SHALL 환경 변수를 통해 로컬 개발 환경과 AWS 환경을 구분하여 동작한다
5. WHEN 마이그레이션 중 오류가 발생하면, THE 마이그레이션_스크립트 SHALL 롤백 절차를 실행하여 원본 데이터를 보존한다
6. THE 애플리케이션 SHALL Prisma ORM 연결 설정을 Aurora 클러스터 엔드포인트(Writer/Reader)로 전환한다
