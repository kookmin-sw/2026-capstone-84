# 설계 문서: 인프라 확장 (Infrastructure Scaling)

## 개요

현재 단일 EC2 인스턴스(Node.js + Express + MySQL + Nginx + PM2) 기반의 독서토론 플랫폼을 10만 사용자를 지원하는 확장 가능한 AWS 인프라로 전환한다. 기존 API 인터페이스와 데이터를 완전히 보존하면서, 수평 확장이 가능한 아키텍처를 구축한다.

### 설계 원칙

1. **하위 호환성 우선**: 기존 `/api/*` 엔드포인트의 요청/응답 형식을 변경하지 않는다
2. **점진적 전환**: 각 인프라 구성요소를 독립적으로 마이그레이션할 수 있도록 설계한다
3. **환경 분리**: 환경 변수를 통해 로컬 개발과 AWS 환경을 구분한다
4. **보안 기본값**: 모든 내부 서비스는 프라이빗 서브넷에 배치하고, 최소 권한 원칙을 적용한다

## 아키텍처

### 전체 시스템 아키텍처

```mermaid
graph TB
    subgraph "인터넷"
        User[사용자]
    end

    subgraph "AWS Cloud"
        subgraph "엣지"
            CF[CloudFront CDN]
            WAF[AWS WAF]
        end

        subgraph "VPC"
            subgraph "퍼블릭 서브넷"
                ALB[Application Load Balancer]
                NAT[NAT Gateway]
            end

            subgraph "프라이빗 서브넷 - 애플리케이션"
                ASG[Auto Scaling Group]
                EC2_1[EC2 인스턴스 1]
                EC2_2[EC2 인스턴스 2]
                EC2_N[EC2 인스턴스 N]
            end

            subgraph "프라이빗 서브넷 - 데이터"
                Aurora_W[Aurora Writer]
                Aurora_R[Aurora Reader]
                Redis_P[Redis Primary]
                Redis_R[Redis Replica]
                OS[OpenSearch]
            end
        end

        S3_Assets[S3 - 정적 파일]
        S3_Uploads[S3 - 업로드 이미지]
        CW[CloudWatch]
        SNS[SNS 알림]
    end

    User -->|HTTPS| CF
    User -->|API 요청| WAF
    WAF --> ALB
    CF --> S3_Assets
    CF --> S3_Uploads
    ALB --> ASG
    ASG --> EC2_1
    ASG --> EC2_2
    ASG --> EC2_N
    EC2_1 --> Aurora_W
    EC2_1 --> Aurora_R
    EC2_1 --> Redis_P
    EC2_1 --> OS
    EC2_1 --> S3_Uploads
    Aurora_W --> Aurora_R
    Redis_P --> Redis_R
    ASG --> CW
    CW --> SNS
```

### 요청 흐름

```mermaid
sequenceDiagram
    participant U as 사용자
    participant CF as CloudFront
    participant WAF as WAF
    participant ALB as ALB
    participant EC2 as EC2 (Express)
    participant Redis as Redis
    participant Aurora as Aurora MySQL
    participant OS as OpenSearch
    participant S3 as S3

    Note over U,S3: 정적 파일 요청
    U->>CF: GET /assets/main.js
    CF->>S3: Origin 요청 (캐시 미스 시)
    S3-->>CF: 파일 응답
    CF-->>U: 캐시된 응답

    Note over U,S3: API 요청
    U->>WAF: POST /api/discussions
    WAF->>ALB: 검증 통과
    ALB->>EC2: 라운드 로빈 분배
    EC2->>Redis: 세션/캐시 조회
    Redis-->>EC2: 캐시 데이터
    EC2->>Aurora: DB 쿼리 (Writer/Reader)
    Aurora-->>EC2: 쿼리 결과
    EC2->>OS: 인덱스 업데이트 (비동기)
    EC2-->>ALB: JSON 응답
    ALB-->>U: 응답 전달

    Note over U,S3: 이미지 업로드
    U->>ALB: POST /api/upload (multipart)
    ALB->>EC2: 파일 전달
    EC2->>S3: PutObject
    S3-->>EC2: 업로드 URL
    EC2-->>U: 이미지 URL 응답
```

## 컴포넌트 및 인터페이스

### 1. 네트워크 계층 (VPC)

| 구성요소 | 서브넷 | CIDR 예시 | 용도 |
|---------|--------|-----------|------|
| ALB | 퍼블릭 서브넷 (2 AZ) | 10.0.1.0/24, 10.0.2.0/24 | 외부 트래픽 수신 |
| NAT Gateway | 퍼블릭 서브넷 | - | 프라이빗 서브넷 아웃바운드 |
| EC2 (ASG) | 프라이빗 서브넷 (2 AZ) | 10.0.11.0/24, 10.0.12.0/24 | 애플리케이션 실행 |
| Aurora | 프라이빗 서브넷 (2 AZ) | 10.0.21.0/24, 10.0.22.0/24 | 데이터베이스 |
| Redis | 프라이빗 서브넷 (2 AZ) | 10.0.31.0/24, 10.0.32.0/24 | 캐시/세션 |
| OpenSearch | 프라이빗 서브넷 (2 AZ) | 10.0.41.0/24, 10.0.42.0/24 | 검색 엔진 |

### 2. 보안 그룹 규칙

```mermaid
graph LR
    Internet -->|443| SG_ALB[SG: ALB]
    SG_ALB -->|3000| SG_EC2[SG: EC2]
    SG_EC2 -->|3306| SG_Aurora[SG: Aurora]
    SG_EC2 -->|6379| SG_Redis[SG: Redis]
    SG_EC2 -->|443| SG_OS[SG: OpenSearch]
```

| 보안 그룹 | 인바운드 | 소스 | 포트 |
|-----------|---------|------|------|
| SG-ALB | HTTPS | 0.0.0.0/0 | 443 |
| SG-ALB | HTTP (리다이렉트) | 0.0.0.0/0 | 80 |
| SG-EC2 | Custom TCP | SG-ALB | 3000 |
| SG-Aurora | MySQL | SG-EC2 | 3306 |
| SG-Redis | Custom TCP | SG-EC2 | 6379 |
| SG-OpenSearch | HTTPS | SG-EC2 | 443 |

### 3. Auto Scaling Group 구성

```typescript
// ASG 설정 파라미터
interface ASGConfig {
  minSize: 2;
  maxSize: 8;
  desiredCapacity: 2;
  instanceType: 't3.medium';
  healthCheckType: 'ELB';
  healthCheckGracePeriod: 300; // 초
  scalingPolicies: {
    scaleOut: {
      metric: 'CPUUtilization';
      threshold: 70; // %
      evaluationPeriods: 2;
      cooldown: 300;
    };
    scaleIn: {
      metric: 'CPUUtilization';
      threshold: 30; // %
      evaluationPeriods: 5; // 5분간 유지
      cooldown: 300;
    };
  };
}
```

**시작 템플릿 사용자 데이터 스크립트:**
```bash
#!/bin/bash
# 애플리케이션 배포 스크립트
yum update -y
yum install -y nodejs npm git

# 애플리케이션 코드 배포 (S3에서 아티팩트 다운로드)
aws s3 cp s3://deploy-bucket/latest/app.tar.gz /opt/app/
cd /opt/app && tar -xzf app.tar.gz
npm ci --production
npx prisma generate

# PM2로 애플리케이션 시작
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
```

### 4. ALB 구성

| 설정 | 값 |
|------|-----|
| 리스너 | HTTPS:443 (ACM 인증서) |
| HTTP:80 리다이렉트 | → HTTPS:443 |
| 대상 그룹 포트 | 3000 |
| 헬스체크 경로 | /api/health |
| 헬스체크 간격 | 30초 |
| 비정상 임계값 | 3회 연속 실패 |
| 정상 임계값 | 2회 연속 성공 |
| 라우팅 알고리즘 | 라운드 로빈 |
| 스티키 세션 | 비활성화 (Redis 세션 사용) |

### 5. 애플리케이션 계층 변경사항

#### 5.1 Redis 세션/캐시 서비스

```typescript
// src/services/redis.service.ts
import Redis from 'ioredis';

interface RedisConfig {
  host: string;        // ElastiCache 엔드포인트
  port: number;        // 6379
  password?: string;
  tls?: boolean;
  keyPrefix: string;   // 'bookclub:'
}

interface SessionData {
  userId: string;
  email: string;
  refreshToken: string;
  createdAt: number;
}

interface CacheService {
  // 세션 관리
  setSession(userId: string, data: SessionData, ttlSeconds: number): Promise<void>;
  getSession(userId: string): Promise<SessionData | null>;
  deleteSession(userId: string): Promise<void>;

  // 데이터 캐싱
  setCache(key: string, data: unknown, ttlSeconds: number): Promise<void>;
  getCache<T>(key: string): Promise<T | null>;
  invalidateCache(pattern: string): Promise<void>;

  // 헬스체크
  ping(): Promise<boolean>;
}
```

**캐시 키 네이밍 규칙:**
- 세션: `session:{userId}`
- 인기 게시글: `cache:discussions:popular:{page}`
- 그룹 정보: `cache:group:{groupId}`
- 사용자 프로필: `cache:user:{userId}`

**캐시 무효화 전략:**
- 게시글 작성/수정/삭제 → `cache:discussions:*` 무효화
- 그룹 정보 변경 → `cache:group:{groupId}` 무효화
- 사용자 프로필 변경 → `cache:user:{userId}` 무효화

#### 5.2 OpenSearch 검색 서비스

```typescript
// src/services/search.service.ts
import { Client } from '@opensearch-project/opensearch';

interface SearchableDocument {
  id: string;
  type: 'discussion' | 'memo' | 'book';
  title: string;
  content?: string;
  authorNickname?: string;
  bookTitle?: string;
  groupId?: string;
  createdAt: string;
}

interface SearchResult {
  hits: SearchableDocument[];
  total: number;
  took: number; // ms
}

interface SearchService {
  // 인덱싱
  indexDocument(doc: SearchableDocument): Promise<void>;
  updateDocument(id: string, doc: Partial<SearchableDocument>): Promise<void>;
  deleteDocument(id: string): Promise<void>;

  // 검색
  search(query: string, options?: SearchOptions): Promise<SearchResult>;

  // 벌크 인덱싱 (마이그레이션용)
  bulkIndex(docs: SearchableDocument[]): Promise<void>;
}

interface SearchOptions {
  type?: 'discussion' | 'memo' | 'book';
  groupId?: string;
  page?: number;
  size?: number;
}
```

**OpenSearch 인덱스 매핑 (Nori 분석기):**
```json
{
  "settings": {
    "analysis": {
      "analyzer": {
        "korean": {
          "type": "custom",
          "tokenizer": "nori_tokenizer",
          "filter": ["nori_readingform", "lowercase"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": { "type": "text", "analyzer": "korean" },
      "content": { "type": "text", "analyzer": "korean" },
      "authorNickname": { "type": "text", "analyzer": "korean" },
      "bookTitle": { "type": "text", "analyzer": "korean" },
      "type": { "type": "keyword" },
      "groupId": { "type": "keyword" },
      "createdAt": { "type": "date" }
    }
  }
}
```

#### 5.3 S3 파일 업로드 서비스

```typescript
// src/services/storage.service.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

interface StorageService {
  uploadFile(file: Buffer, key: string, contentType: string): Promise<string>;
  deleteFile(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
}

// 키 생성 규칙: uploads/{userId}/{timestamp}-{randomId}.{ext}
```

#### 5.4 Prisma 읽기/쓰기 분리

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Writer 인스턴스 (INSERT, UPDATE, DELETE)
const writerPrisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_WRITER_URL }
  }
});

// Reader 인스턴스 (SELECT)
const readerPrisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_READER_URL }
  }
});

export { writerPrisma, readerPrisma };
```

#### 5.5 헬스체크 엔드포인트 확장

```typescript
// 기존 /api/health 확장
app.get('/api/health', async (_req, res) => {
  const checks = {
    database: await checkAuroraConnection(),
    redis: await checkRedisConnection(),
    opensearch: await checkOpenSearchConnection(),
  };

  const isHealthy = Object.values(checks).every(c => c === true);
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});
```

### 6. CI/CD 파이프라인 (GitHub Actions)

```mermaid
graph LR
    subgraph "CI 단계"
        Push[코드 푸시] --> Lint[린트 검사]
        Lint --> TypeCheck[타입 체크]
        TypeCheck --> Test[단위 테스트]
        Test --> Build[빌드]
    end

    subgraph "CD 단계 - 백엔드"
        Build --> Package[아티팩트 패키징]
        Package --> S3Deploy[S3 업로드]
        S3Deploy --> Rolling[롤링 배포]
        Rolling --> Health[헬스체크 확인]
    end

    subgraph "CD 단계 - 프론트엔드"
        Build --> FEBuild[React 빌드]
        FEBuild --> S3Static[S3 정적 파일 업로드]
        S3Static --> CFInvalidate[CloudFront 캐시 무효화]
    end
```

**브랜치 전략:**
- `main` → 프로덕션 배포
- `develop` → 개발 서버 배포
- `feature/*` → CI만 실행 (배포 없음)

**롤링 배포 절차:**
1. 새 아티팩트를 S3에 업로드
2. ASG 인스턴스 리프레시 시작 (최소 정상 비율 50%)
3. 각 인스턴스가 순차적으로 새 버전으로 교체
4. 헬스체크 통과 확인 후 다음 인스턴스 교체
5. 모든 인스턴스 교체 완료 후 배포 성공 확인

## 데이터 모델

### 기존 스키마 보존

기존 Prisma 스키마(User, Book, Group, GroupMember, Memo, Discussion, Comment, Reply, Announcement, GroupBan, DiscussionSchedule)는 **변경 없이** Aurora MySQL로 마이그레이션한다.

### 환경 변수 구성

```bash
# === AWS 환경 (production) ===
NODE_ENV=production
PORT=3000

# Aurora MySQL
DATABASE_WRITER_URL=mysql://user:pass@cluster-writer.cluster-xxx.ap-northeast-2.rds.amazonaws.com:3306/bookclub
DATABASE_READER_URL=mysql://user:pass@cluster-reader.cluster-xxx.ap-northeast-2.rds.amazonaws.com:3306/bookclub
DATABASE_URL=${DATABASE_WRITER_URL}  # Prisma 마이그레이션용

# ElastiCache Redis
REDIS_HOST=bookclub-redis.xxx.apne2.cache.amazonaws.com
REDIS_PORT=6379
REDIS_TLS=true

# OpenSearch
OPENSEARCH_ENDPOINT=https://bookclub-search.ap-northeast-2.es.amazonaws.com
OPENSEARCH_REGION=ap-northeast-2

# S3
S3_BUCKET_UPLOADS=bookclub-uploads
S3_BUCKET_ASSETS=bookclub-assets
S3_REGION=ap-northeast-2

# CloudFront
CLOUDFRONT_DOMAIN=cdn.bookclub.example.com

# JWT (기존 유지)
JWT_SECRET=xxx
JWT_REFRESH_SECRET=xxx

# === 로컬 개발 환경 ===
# DATABASE_URL=mysql://root:password@localhost:3306/bookclub
# REDIS_HOST=localhost
# 로컬에서는 S3 대신 로컬 파일시스템 사용
```

### 데이터 마이그레이션 계획

| 단계 | 대상 | 방법 | 롤백 |
|------|------|------|------|
| 1 | MySQL → Aurora | `mysqldump` + Aurora 복원 | 원본 MySQL 유지 |
| 2 | uploads/ → S3 | `aws s3 sync` | S3 객체 삭제 |
| 3 | DNS 전환 | Route 53 가중치 라우팅 | 가중치 원복 |
| 4 | 검색 인덱스 구축 | 벌크 인덱싱 스크립트 | 인덱스 삭제/재생성 |

### Aurora 클러스터 구성

| 설정 | 값 |
|------|-----|
| 엔진 | Aurora MySQL 8.0 호환 |
| Writer 인스턴스 | db.r6g.large × 1 |
| Reader 인스턴스 | db.r6g.large × 1 (최소) |
| 스토리지 | 자동 확장 (10GB ~ 128TB) |
| 백업 보관 | 7일 |
| 페일오버 우선순위 | Reader → Writer 자동 승격 |
| 암호화 | AES-256 (KMS) |
| 파라미터 그룹 | character_set=utf8mb4, collation=utf8mb4_unicode_ci |

### ElastiCache Redis 구성

| 설정 | 값 |
|------|-----|
| 노드 타입 | cache.r6g.large |
| 복제본 수 | 1 (Multi-AZ) |
| 엔진 버전 | Redis 7.x |
| 전송 암호화 | TLS 활성화 |
| 인증 | AUTH 토큰 |
| 최대 메모리 정책 | allkeys-lru |
| 스냅샷 보관 | 1일 |

