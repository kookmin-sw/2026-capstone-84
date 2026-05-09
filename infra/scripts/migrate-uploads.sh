#!/usr/bin/env bash
#
# 로컬 uploads → S3 마이그레이션 스크립트
#
# 이 스크립트는 기존 로컬 uploads/ 폴더의 파일을 Amazon S3 버킷으로 마이그레이션합니다.
# aws s3 sync 명령을 사용하여 디렉토리 구조를 보존하면서 파일을 이전합니다.
#
# 사용법:
#   ./migrate-uploads.sh [옵션]
#
# 옵션:
#   --dry-run       실제 업로드를 수행하지 않고 동기화될 파일 목록만 출력
#   --skip-confirm  확인 프롬프트 건너뛰기 (CI 환경용)
#   --help          도움말 출력
#
# 환경 변수 (필수):
#   S3_BUCKET         대상 S3 버킷 이름 (예: bookclub-uploads)
#   UPLOADS_DIR       로컬 uploads 디렉토리 경로 (예: /opt/app/uploads)
#
# 환경 변수 (선택):
#   S3_REGION         AWS 리전 (기본값: ap-northeast-2)
#   S3_PREFIX         S3 키 접두사 (기본값: uploads)
#   AWS_PROFILE       AWS CLI 프로파일 (기본값: default)
#
# 키 구조:
#   로컬: uploads/{userId}/{filename}
#   S3:   s3://{bucket}/uploads/{userId}/{filename}
#
#   기존 URL 경로(/uploads/...)와 동일한 키 구조를 유지하여
#   CloudFront를 통해 동일한 경로로 접근 가능합니다.
#
# ============================================================================
# 롤백 절차 (Rollback Procedure)
# ============================================================================
#
# 이 스크립트는 원본 로컬 파일을 수정하거나 삭제하지 않습니다.
# S3에 업로드된 파일만 추가됩니다.
#
# 롤백이 필요한 경우:
#   1. 애플리케이션의 스토리지 설정을 로컬 파일시스템으로 되돌립니다.
#   2. S3에 업로드된 파일을 삭제합니다:
#      aws s3 rm s3://${S3_BUCKET}/${S3_PREFIX}/ --recursive
#   3. 애플리케이션을 재시작합니다.
#
# 원본 로컬 파일이 그대로 보존되므로, 롤백은 단순히 스토리지 설정을
# 로컬 모드로 되돌리는 것으로 완료됩니다.
# ============================================================================

set -euo pipefail

# ============================================================================
# 상수 및 기본값
# ============================================================================

SCRIPT_NAME="$(basename "$0")"

DRY_RUN=false
SKIP_CONFIRM=false

# 기본값
S3_REGION="${S3_REGION:-ap-northeast-2}"
S3_PREFIX="${S3_PREFIX:-uploads}"

# ============================================================================
# 유틸리티 함수
# ============================================================================

log_info() {
  echo "[INFO]  $(date '+%Y-%m-%d %H:%M:%S') $*"
}

log_warn() {
  echo "[WARN]  $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
}

log_error() {
  echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
}

log_step() {
  echo ""
  echo "========================================"
  echo "  $*"
  echo "========================================"
  echo ""
}

show_help() {
  echo "사용법: ${SCRIPT_NAME} [옵션]"
  echo ""
  echo "로컬 uploads → S3 마이그레이션 스크립트"
  echo ""
  echo "옵션:"
  echo "  --dry-run       실제 업로드를 수행하지 않고 동기화될 파일 목록만 출력"
  echo "  --skip-confirm  확인 프롬프트 건너뛰기 (CI 환경용)"
  echo "  --help          이 도움말 출력"
  echo ""
  echo "필수 환경 변수:"
  echo "  S3_BUCKET       대상 S3 버킷 이름 (예: bookclub-uploads)"
  echo "  UPLOADS_DIR     로컬 uploads 디렉토리 경로 (예: /opt/app/uploads)"
  echo ""
  echo "선택 환경 변수:"
  echo "  S3_REGION       AWS 리전 (기본값: ap-northeast-2)"
  echo "  S3_PREFIX       S3 키 접두사 (기본값: uploads)"
  echo "  AWS_PROFILE     AWS CLI 프로파일 (기본값: default)"
  echo ""
  echo "키 구조 예시:"
  echo "  로컬: /opt/app/uploads/user123/photo.jpg"
  echo "  S3:   s3://bookclub-uploads/uploads/user123/photo.jpg"
  echo ""
  echo "  기존 URL 경로(/uploads/user123/photo.jpg)와 동일한 키 구조를 유지합니다."
}

# ============================================================================
# 인자 파싱
# ============================================================================

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-confirm)
      SKIP_CONFIRM=true
      shift
      ;;
    --help)
      show_help
      exit 0
      ;;
    *)
      log_error "알 수 없는 옵션: $1"
      show_help
      exit 1
      ;;
  esac
done

# ============================================================================
# 환경 변수 검증
# ============================================================================

validate_env() {
  local missing=()

  [[ -z "${S3_BUCKET:-}" ]] && missing+=("S3_BUCKET")
  [[ -z "${UPLOADS_DIR:-}" ]] && missing+=("UPLOADS_DIR")

  if [[ ${#missing[@]} -gt 0 ]]; then
    log_error "다음 환경 변수가 설정되지 않았습니다:"
    for var in "${missing[@]}"; do
      log_error "  - ${var}"
    done
    exit 1
  fi

  # 로컬 디렉토리 존재 확인
  if [[ ! -d "${UPLOADS_DIR}" ]]; then
    log_error "로컬 uploads 디렉토리가 존재하지 않습니다: ${UPLOADS_DIR}"
    exit 1
  fi

  log_info "환경 변수 검증 완료"
}

# ============================================================================
# AWS CLI 확인
# ============================================================================

check_aws_cli() {
  if ! command -v aws &> /dev/null; then
    log_error "AWS CLI가 설치되어 있지 않습니다."
    log_error "설치 방법: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
  fi

  # AWS 자격 증명 확인
  if ! aws sts get-caller-identity --region "${S3_REGION}" > /dev/null 2>&1; then
    log_error "AWS 자격 증명이 유효하지 않습니다. aws configure를 실행하세요."
    exit 1
  fi

  log_info "AWS CLI 확인 완료"
}

# ============================================================================
# S3 버킷 접근 확인
# ============================================================================

check_s3_bucket() {
  log_info "S3 버킷 접근 확인 중: ${S3_BUCKET}"

  if ! aws s3api head-bucket --bucket "${S3_BUCKET}" --region "${S3_REGION}" 2>/dev/null; then
    log_error "S3 버킷에 접근할 수 없습니다: ${S3_BUCKET}"
    log_error "버킷이 존재하는지, 접근 권한이 있는지 확인하세요."
    exit 1
  fi

  log_info "S3 버킷 접근 확인 완료"
}

# ============================================================================
# Content-Type 매핑
# ============================================================================

get_content_type_args() {
  # aws s3 sync는 기본적으로 확장자 기반 content-type을 설정하지만,
  # 명시적으로 주요 이미지/파일 타입에 대한 매핑을 보장하기 위해
  # --content-type 옵션 대신 개별 확장자별 include/exclude 패턴을 사용합니다.
  # aws s3 sync는 자동으로 MIME 타입을 감지하므로 별도 설정 불필요.
  # 단, 감지 실패 시를 대비해 후처리로 content-type을 보정합니다.
  :
}

# ============================================================================
# 로컬 파일 카운트
# ============================================================================

count_local_files() {
  local dir="$1"
  find "${dir}" -type f | wc -l | tr -d ' '
}

# ============================================================================
# S3 객체 카운트
# ============================================================================

count_s3_objects() {
  local bucket="$1"
  local prefix="$2"

  aws s3api list-objects-v2 \
    --bucket "${bucket}" \
    --prefix "${prefix}/" \
    --region "${S3_REGION}" \
    --query "KeyCount" \
    --output text 2>/dev/null || echo "0"
}

# ============================================================================
# Content-Type 보정
# ============================================================================

fix_content_types() {
  log_info "Content-Type 보정 중..."

  # 주요 파일 확장자별 Content-Type 매핑
  declare -A CONTENT_TYPES=(
    ["jpg"]="image/jpeg"
    ["jpeg"]="image/jpeg"
    ["png"]="image/png"
    ["gif"]="image/gif"
    ["webp"]="image/webp"
    ["svg"]="image/svg+xml"
    ["pdf"]="application/pdf"
    ["mp4"]="video/mp4"
    ["mp3"]="audio/mpeg"
    ["txt"]="text/plain"
    ["html"]="text/html"
    ["css"]="text/css"
    ["js"]="application/javascript"
    ["json"]="application/json"
  )

  for ext in "${!CONTENT_TYPES[@]}"; do
    local content_type="${CONTENT_TYPES[$ext]}"

    # 해당 확장자 파일이 있는지 확인 후 메타데이터 복사
    local count
    count=$(aws s3api list-objects-v2 \
      --bucket "${S3_BUCKET}" \
      --prefix "${S3_PREFIX}/" \
      --region "${S3_REGION}" \
      --query "length(Contents[?ends_with(Key, '.${ext}')])" \
      --output text 2>/dev/null || echo "0")

    if [[ "${count}" != "0" && "${count}" != "None" ]]; then
      log_info "  .${ext} 파일 Content-Type 설정: ${content_type} (${count}개)"

      aws s3 cp \
        "s3://${S3_BUCKET}/${S3_PREFIX}/" \
        "s3://${S3_BUCKET}/${S3_PREFIX}/" \
        --recursive \
        --exclude "*" \
        --include "*.${ext}" \
        --content-type "${content_type}" \
        --metadata-directive REPLACE \
        --region "${S3_REGION}" \
        --quiet 2>/dev/null || true
    fi
  done

  log_info "Content-Type 보정 완료"
}

# ============================================================================
# S3 동기화 실행
# ============================================================================

sync_to_s3() {
  local source_dir="${UPLOADS_DIR}"
  local target="s3://${S3_BUCKET}/${S3_PREFIX}/"

  log_info "S3 동기화 시작..."
  log_info "  원본: ${source_dir}"
  log_info "  대상: ${target}"

  local sync_args=(
    "${source_dir}/"
    "${target}"
    --region "${S3_REGION}"
    --no-progress
  )

  if [[ "${DRY_RUN}" == "true" ]]; then
    sync_args+=(--dryrun)
    log_warn "[DRY-RUN] 실제 업로드를 수행하지 않습니다."
  fi

  echo ""
  aws s3 sync "${sync_args[@]}"
  echo ""

  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY-RUN] 위 목록은 동기화될 파일입니다."
  else
    log_info "S3 동기화 완료"
  fi
}

# ============================================================================
# 파일 수 검증
# ============================================================================

verify_migration() {
  log_info "마이그레이션 검증 시작..."

  local local_count
  local_count=$(count_local_files "${UPLOADS_DIR}")

  local s3_count
  s3_count=$(count_s3_objects "${S3_BUCKET}" "${S3_PREFIX}")

  echo ""
  printf "%-20s %s\n" "로컬 파일 수:" "${local_count}"
  printf "%-20s %s\n" "S3 객체 수:" "${s3_count}"
  echo ""

  if [[ "${local_count}" -eq "${s3_count}" ]]; then
    log_info "✅ 검증 성공: 로컬 파일 수(${local_count})와 S3 객체 수(${s3_count})가 일치합니다."
    return 0
  else
    log_warn "⚠️  파일 수 불일치: 로컬(${local_count}) ≠ S3(${s3_count})"
    log_warn "   일부 파일이 숨김 파일이거나 동기화에서 제외되었을 수 있습니다."
    log_warn "   aws s3 ls s3://${S3_BUCKET}/${S3_PREFIX}/ --recursive 로 확인하세요."
    return 1
  fi
}

# ============================================================================
# 메인 실행
# ============================================================================

main() {
  log_step "로컬 uploads → S3 마이그레이션"

  if [[ "${DRY_RUN}" == "true" ]]; then
    log_warn "DRY-RUN 모드: 실제 업로드를 수행하지 않습니다."
    echo ""
  fi

  # 1. 환경 변수 검증
  log_step "1단계: 환경 변수 검증"
  validate_env

  # 2. AWS CLI 확인
  log_step "2단계: AWS CLI 및 자격 증명 확인"
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY-RUN] AWS CLI 확인 건너뜀"
  else
    check_aws_cli
  fi

  # 3. S3 버킷 접근 확인
  log_step "3단계: S3 버킷 접근 확인"
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY-RUN] S3 버킷 접근 확인 건너뜀"
  else
    check_s3_bucket
  fi

  # 4. 마이그레이션 정보 출력
  log_step "4단계: 마이그레이션 정보 확인"

  local local_count
  local_count=$(count_local_files "${UPLOADS_DIR}")

  echo "  원본 (Source):"
  echo "    디렉토리: ${UPLOADS_DIR}"
  echo "    파일 수: ${local_count}"
  echo ""
  echo "  대상 (Target):"
  echo "    버킷: ${S3_BUCKET}"
  echo "    접두사: ${S3_PREFIX}/"
  echo "    리전: ${S3_REGION}"
  echo ""
  echo "  키 구조:"
  echo "    로컬: ${UPLOADS_DIR}/{userId}/{filename}"
  echo "    S3:   s3://${S3_BUCKET}/${S3_PREFIX}/{userId}/{filename}"
  echo ""
  echo "  기존 URL 경로(/uploads/...)와 동일한 키 구조를 유지합니다."
  echo "  CloudFront를 통해 동일한 경로로 접근 가능합니다."
  echo ""

  if [[ "${DRY_RUN}" == "true" ]]; then
    log_step "5단계: S3 동기화 (DRY-RUN)"
    sync_to_s3
    echo ""
    log_info "[DRY-RUN] 마이그레이션 시뮬레이션 완료"
    echo ""
    echo "실제 마이그레이션을 수행하려면 --dry-run 옵션을 제거하고 다시 실행하세요."
    exit 0
  fi

  # 확인 프롬프트
  if [[ "${SKIP_CONFIRM}" != "true" ]]; then
    echo ""
    read -r -p "마이그레이션을 진행하시겠습니까? (yes/no): " confirm
    if [[ "${confirm}" != "yes" ]]; then
      log_info "마이그레이션이 취소되었습니다."
      exit 0
    fi
  fi

  # 5. S3 동기화 실행
  log_step "5단계: S3 동기화 실행"
  sync_to_s3

  # 6. Content-Type 보정
  log_step "6단계: Content-Type 보정"
  fix_content_types

  # 7. 파일 수 검증
  log_step "7단계: 마이그레이션 검증"
  if verify_migration; then
    log_step "마이그레이션 완료"
    log_info "모든 파일이 성공적으로 S3로 이전되었습니다."
    echo ""
    echo "다음 단계:"
    echo "  1. 애플리케이션의 S3_BUCKET_UPLOADS 환경 변수를 설정하세요."
    echo "     export S3_BUCKET_UPLOADS=${S3_BUCKET}"
    echo "  2. CLOUDFRONT_DOMAIN 환경 변수를 CloudFront 도메인으로 설정하세요."
    echo "  3. 애플리케이션을 재시작하세요."
    echo "  4. 기존 이미지 URL이 CloudFront를 통해 정상 접근되는지 확인하세요."
    echo ""
    echo "롤백이 필요한 경우:"
    echo "  - S3_BUCKET_UPLOADS 환경 변수를 제거하고 애플리케이션을 재시작하세요."
    echo "  - 로컬 파일시스템 모드로 자동 전환됩니다."
    echo "  - S3 파일 삭제: aws s3 rm s3://${S3_BUCKET}/${S3_PREFIX}/ --recursive"
    echo ""
    echo "원본 로컬 파일은 이 스크립트에 의해 변경되지 않았습니다."
    exit 0
  else
    log_warn "파일 수 불일치가 발견되었지만, 동기화 자체는 완료되었습니다."
    log_warn "수동으로 확인 후 진행하세요."
    exit 1
  fi
}

main "$@"
