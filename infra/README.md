# 인프라 (Infrastructure)

독서토론 플랫폼의 AWS 인프라 구성 파일을 관리하는 디렉토리입니다.

## 디렉토리 구조

```
infra/
├── templates/   # CloudFormation 템플릿 (VPC, ALB, ASG, Aurora, Redis, OpenSearch, S3 등)
├── scripts/     # 마이그레이션 및 배포 스크립트
└── README.md
```

## templates/

AWS CloudFormation 템플릿을 저장합니다.

- VPC 및 네트워크 구성
- 보안 그룹
- ALB 및 Auto Scaling Group
- RDS Aurora MySQL 클러스터
- ElastiCache Redis
- OpenSearch 도메인
- S3 버킷 및 CloudFront
- CloudWatch 모니터링 및 알람

## scripts/

데이터 마이그레이션 및 운영 스크립트를 저장합니다.

- `migrate-database.sh` - MySQL → Aurora 데이터 마이그레이션
- `migrate-uploads.sh` - 로컬 uploads/ → S3 파일 마이그레이션
- `bulk-index.ts` - OpenSearch 벌크 인덱싱
