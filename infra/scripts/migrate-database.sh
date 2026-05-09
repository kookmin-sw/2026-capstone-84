#!/usr/bin/env bash
#
# MySQL → Aurora MySQL 마이그레이션 스크립트
#
# 이 스크립트는 기존 단일 MySQL 인스턴스의 데이터를 Amazon Aurora MySQL 클러스터로
# 마이그레이션합니다. mysqldump를 사용하여 데이터를 내보내고 Aurora에 복원합니다.
#
# 사용법:
#   ./migrate-database.sh [옵션]
#
# 옵션:
#   --dry-run       실제 마이그레이션을 수행하지 않고 단계만 출력
#   --skip-confirm  확인 프롬프트 건너뛰기 (CI 환경용)
#   --help          도움말 출력
#
# 환경 변수 (필수):
#   SOURCE_DB_HOST      원본 MySQL 호스트
#   SOURCE_DB_PORT      원본 MySQL 포트 (기본값: 3306)
#   SOURCE_DB_USER      원본 MySQL 사용자
#   SOURCE_DB_PASSWORD  원본 MySQL 비밀번호
#   SOURCE_DB_NAME      원본 MySQL 데이터베이스 이름
#
#   TARGET_DB_HOST      대상 Aurora 클러스터 Writer 엔드포인트
#   TARGET_DB_PORT      대상 Aurora 포트 (기본값: 3306)
#   TARGET_DB_USER      대상 Aurora 사용자
#   TARGET_DB_PASSWORD  대상 Aurora 비밀번호
#   TARGET_DB_NAME      대상 Aurora 데이터베이스 이름
#
# ============================================================================
# 롤백 절차 (Rollback Procedure)
# ============================================================================
#
# 이 스크립트는 원본 MySQL 데이터베이스를 수정하지 않습니다.
# 마이그레이션 중 원본 DB는 읽기 전용으로 유지됩니다 (--single-transaction 사용).
#
# 롤백이 필요한 경우:
#   1. 애플리케이션의 DATABASE_URL 환경 변수를 원본 MySQL 엔드포인트로 되돌립니다.
#   2. 애플리케이션을 재시작합니다.
#   3. Aurora 클러스터의 데이터는 필요 시 삭제하거나 유지할 수 있습니다.
#
# 롤백 명령 예시:
#   export DATABASE_URL="mysql://user:pass@original-mysql-host:3306/bookclub"
#   export DATABASE_WRITER_URL="$DATABASE_URL"
#   export DATABASE_READER_URL="$DATABASE_URL"
#   pm2 restart all
#
# 원본 MySQL이 그대로 보존되므로, 롤백은 단순히 애플리케이션의 연결 대상을
# 원본 MySQL로 다시 지정하는 것으로 완료됩니다.
# ============================================================================

set -euo pipefail

# ============================================================================
# 상수 및 기본값
# ============================================================================

SCRIPT_NAME="$(basename "$0")"
DUMP_DIR="/tmp/db-migration-$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="${DUMP_DIR}/database_dump.sql"
SOURCE_COUNTS_FILE="${DUMP_DIR}/source_counts.txt"
TARGET_COUNTS_FILE="${DUMP_DIR}/target_counts.txt"

DRY_RUN=false
SKIP_CONFIRM=false

# 기본 포트
SOURCE_DB_PORT="${SOURCE_DB_PORT:-3306}"
TARGET_DB_PORT="${TARGET_DB_PORT:-3306}"

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
  echo "MySQL → Aurora MySQL 마이그레이션 스크립트"
  echo ""
  echo "옵션:"
  echo "  --dry-run       실제 마이그레이션을 수행하지 않고 단계만 출력"
  echo "  --skip-confirm  확인 프롬프트 건너뛰기 (CI 환경용)"
  echo "  --help          이 도움말 출력"
  echo ""
  echo "필수 환경 변수:"
  echo "  SOURCE_DB_HOST, SOURCE_DB_USER, SOURCE_DB_PASSWORD, SOURCE_DB_NAME"
  echo "  TARGET_DB_HOST, TARGET_DB_USER, TARGET_DB_PASSWORD, TARGET_DB_NAME"
  echo ""
  echo "선택 환경 변수:"
  echo "  SOURCE_DB_PORT (기본값: 3306)"
  echo "  TARGET_DB_PORT (기본값: 3306)"
}

cleanup() {
  if [[ -d "${DUMP_DIR}" ]]; then
    log_info "임시 파일 정리: ${DUMP_DIR}"
    rm -rf "${DUMP_DIR}"
  fi
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

  [[ -z "${SOURCE_DB_HOST:-}" ]] && missing+=("SOURCE_DB_HOST")
  [[ -z "${SOURCE_DB_USER:-}" ]] && missing+=("SOURCE_DB_USER")
  [[ -z "${SOURCE_DB_PASSWORD:-}" ]] && missing+=("SOURCE_DB_PASSWORD")
  [[ -z "${SOURCE_DB_NAME:-}" ]] && missing+=("SOURCE_DB_NAME")
  [[ -z "${TARGET_DB_HOST:-}" ]] && missing+=("TARGET_DB_HOST")
  [[ -z "${TARGET_DB_USER:-}" ]] && missing+=("TARGET_DB_USER")
  [[ -z "${TARGET_DB_PASSWORD:-}" ]] && missing+=("TARGET_DB_PASSWORD")
  [[ -z "${TARGET_DB_NAME:-}" ]] && missing+=("TARGET_DB_NAME")

  if [[ ${#missing[@]} -gt 0 ]]; then
    log_error "다음 환경 변수가 설정되지 않았습니다:"
    for var in "${missing[@]}"; do
      log_error "  - ${var}"
    done
    exit 1
  fi

  log_info "환경 변수 검증 완료"
}

# ============================================================================
# 연결 테스트
# ============================================================================

test_connection() {
  local label="$1"
  local host="$2"
  local port="$3"
  local user="$4"
  local password="$5"
  local dbname="$6"

  log_info "${label} 연결 테스트 중... (${host}:${port}/${dbname})"

  if ! mysql -h "${host}" -P "${port}" -u "${user}" -p"${password}" "${dbname}" \
    -e "SELECT 1;" > /dev/null 2>&1; then
    log_error "${label} 연결 실패: ${host}:${port}/${dbname}"
    exit 1
  fi

  log_info "${label} 연결 성공"
}

# ============================================================================
# 레코드 수 카운트
# ============================================================================

count_records() {
  local host="$1"
  local port="$2"
  local user="$3"
  local password="$4"
  local dbname="$5"
  local output_file="$6"

  log_info "테이블별 레코드 수 카운트 중... (${host}:${port}/${dbname})"

  # 모든 테이블 목록 조회
  local tables
  tables=$(mysql -h "${host}" -P "${port}" -u "${user}" -p"${password}" "${dbname}" \
    -N -e "SHOW TABLES;" 2>/dev/null)

  if [[ -z "${tables}" ]]; then
    log_warn "데이터베이스에 테이블이 없습니다."
    echo "" > "${output_file}"
    return
  fi

  # 각 테이블의 레코드 수 카운트
  > "${output_file}"
  while IFS= read -r table; do
    local count
    count=$(mysql -h "${host}" -P "${port}" -u "${user}" -p"${password}" "${dbname}" \
      -N -e "SELECT COUNT(*) FROM \`${table}\`;" 2>/dev/null)
    echo "${table}:${count}" >> "${output_file}"
    log_info "  ${table}: ${count} rows"
  done <<< "${tables}"
}

# ============================================================================
# 데이터 내보내기 (mysqldump)
# ============================================================================

export_database() {
  log_info "mysqldump로 데이터 내보내기 시작..."
  log_info "  원본: ${SOURCE_DB_HOST}:${SOURCE_DB_PORT}/${SOURCE_DB_NAME}"
  log_info "  덤프 파일: ${DUMP_FILE}"

  mysqldump \
    -h "${SOURCE_DB_HOST}" \
    -P "${SOURCE_DB_PORT}" \
    -u "${SOURCE_DB_USER}" \
    -p"${SOURCE_DB_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    --set-gtid-purged=OFF \
    --column-statistics=0 \
    --databases "${SOURCE_DB_NAME}" \
    --no-create-db \
    > "${DUMP_FILE}"

  local dump_size
  dump_size=$(du -h "${DUMP_FILE}" | cut -f1)
  log_info "덤프 완료. 파일 크기: ${dump_size}"
}

# ============================================================================
# 데이터 가져오기 (Aurora 복원)
# ============================================================================

import_database() {
  log_info "Aurora에 데이터 복원 시작..."
  log_info "  대상: ${TARGET_DB_HOST}:${TARGET_DB_PORT}/${TARGET_DB_NAME}"

  # 대상 데이터베이스가 없으면 생성
  mysql -h "${TARGET_DB_HOST}" -P "${TARGET_DB_PORT}" \
    -u "${TARGET_DB_USER}" -p"${TARGET_DB_PASSWORD}" \
    -e "CREATE DATABASE IF NOT EXISTS \`${TARGET_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" \
    2>/dev/null

  # 덤프 파일 복원
  mysql -h "${TARGET_DB_HOST}" -P "${TARGET_DB_PORT}" \
    -u "${TARGET_DB_USER}" -p"${TARGET_DB_PASSWORD}" \
    "${TARGET_DB_NAME}" < "${DUMP_FILE}"

  log_info "Aurora 복원 완료"
}

# ============================================================================
# 레코드 수 검증
# ============================================================================

verify_migration() {
  log_info "마이그레이션 검증 시작..."

  local has_error=false

  if [[ ! -f "${SOURCE_COUNTS_FILE}" ]] || [[ ! -f "${TARGET_COUNTS_FILE}" ]]; then
    log_error "카운트 파일이 존재하지 않습니다."
    return 1
  fi

  echo ""
  printf "%-30s %12s %12s %s\n" "테이블" "원본" "대상" "상태"
  printf "%-30s %12s %12s %s\n" "------------------------------" "------------" "------------" "------"

  while IFS=: read -r table source_count; do
    local target_count
    target_count=$(grep "^${table}:" "${TARGET_COUNTS_FILE}" | cut -d: -f2)

    if [[ -z "${target_count}" ]]; then
      printf "%-30s %12s %12s %s\n" "${table}" "${source_count}" "N/A" "❌ 누락"
      has_error=true
    elif [[ "${source_count}" -ne "${target_count}" ]]; then
      printf "%-30s %12s %12s %s\n" "${table}" "${source_count}" "${target_count}" "❌ 불일치"
      has_error=true
    else
      printf "%-30s %12s %12s %s\n" "${table}" "${source_count}" "${target_count}" "✅ 일치"
    fi
  done < "${SOURCE_COUNTS_FILE}"

  echo ""

  if [[ "${has_error}" == "true" ]]; then
    log_error "마이그레이션 검증 실패! 레코드 수 불일치가 발견되었습니다."
    log_error ""
    log_error "롤백 절차:"
    log_error "  1. 애플리케이션의 DATABASE_URL을 원본 MySQL로 되돌리세요."
    log_error "  2. 애플리케이션을 재시작하세요 (pm2 restart all)."
    log_error "  3. Aurora의 데이터를 확인 후 필요 시 재마이그레이션하세요."
    return 1
  fi

  log_info "마이그레이션 검증 성공! 모든 테이블의 레코드 수가 일치합니다."
  return 0
}

# ============================================================================
# 메인 실행
# ============================================================================

main() {
  log_step "MySQL → Aurora MySQL 마이그레이션"

  if [[ "${DRY_RUN}" == "true" ]]; then
    log_warn "DRY-RUN 모드: 실제 마이그레이션을 수행하지 않습니다."
    echo ""
  fi

  # 1. 환경 변수 검증
  log_step "1단계: 환경 변수 검증"
  validate_env

  # 2. 임시 디렉토리 생성
  mkdir -p "${DUMP_DIR}"
  trap cleanup EXIT

  # 3. 연결 테스트
  log_step "2단계: 데이터베이스 연결 테스트"
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY-RUN] 원본 MySQL 연결 테스트 건너뜀"
    log_info "[DRY-RUN] 대상 Aurora 연결 테스트 건너뜀"
  else
    test_connection "원본 MySQL" \
      "${SOURCE_DB_HOST}" "${SOURCE_DB_PORT}" \
      "${SOURCE_DB_USER}" "${SOURCE_DB_PASSWORD}" "${SOURCE_DB_NAME}"

    test_connection "대상 Aurora" \
      "${TARGET_DB_HOST}" "${TARGET_DB_PORT}" \
      "${TARGET_DB_USER}" "${TARGET_DB_PASSWORD}" "${TARGET_DB_NAME}"
  fi

  # 4. 마이그레이션 정보 출력 및 확인
  log_step "3단계: 마이그레이션 정보 확인"
  echo "  원본 (Source):"
  echo "    호스트: ${SOURCE_DB_HOST}:${SOURCE_DB_PORT}"
  echo "    데이터베이스: ${SOURCE_DB_NAME}"
  echo "    사용자: ${SOURCE_DB_USER}"
  echo ""
  echo "  대상 (Target):"
  echo "    호스트: ${TARGET_DB_HOST}:${TARGET_DB_PORT}"
  echo "    데이터베이스: ${TARGET_DB_NAME}"
  echo "    사용자: ${TARGET_DB_USER}"
  echo ""

  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY-RUN] 이후 단계를 출력만 합니다."
    echo ""
    echo "실행될 단계:"
    echo "  4단계: 원본 DB 레코드 수 카운트 (Pre-migration)"
    echo "  5단계: mysqldump로 데이터 내보내기"
    echo "         옵션: --single-transaction --routines --triggers --set-gtid-purged=OFF"
    echo "  6단계: Aurora에 데이터 복원"
    echo "  7단계: 대상 DB 레코드 수 카운트 (Post-migration)"
    echo "  8단계: 레코드 수 비교 검증"
    echo ""
    log_info "[DRY-RUN] 마이그레이션 시뮬레이션 완료"
    exit 0
  fi

  if [[ "${SKIP_CONFIRM}" != "true" ]]; then
    echo ""
    read -r -p "마이그레이션을 진행하시겠습니까? (yes/no): " confirm
    if [[ "${confirm}" != "yes" ]]; then
      log_info "마이그레이션이 취소되었습니다."
      exit 0
    fi
  fi

  # 5. Pre-migration: 원본 레코드 수 카운트
  log_step "4단계: 원본 DB 레코드 수 카운트 (Pre-migration)"
  count_records \
    "${SOURCE_DB_HOST}" "${SOURCE_DB_PORT}" \
    "${SOURCE_DB_USER}" "${SOURCE_DB_PASSWORD}" "${SOURCE_DB_NAME}" \
    "${SOURCE_COUNTS_FILE}"

  # 6. 데이터 내보내기
  log_step "5단계: mysqldump로 데이터 내보내기"
  export_database

  # 7. Aurora에 데이터 복원
  log_step "6단계: Aurora에 데이터 복원"
  import_database

  # 8. Post-migration: 대상 레코드 수 카운트
  log_step "7단계: 대상 DB 레코드 수 카운트 (Post-migration)"
  count_records \
    "${TARGET_DB_HOST}" "${TARGET_DB_PORT}" \
    "${TARGET_DB_USER}" "${TARGET_DB_PASSWORD}" "${TARGET_DB_NAME}" \
    "${TARGET_COUNTS_FILE}"

  # 9. 검증
  log_step "8단계: 마이그레이션 검증"
  if verify_migration; then
    log_step "마이그레이션 완료"
    log_info "모든 데이터가 성공적으로 Aurora로 이전되었습니다."
    echo ""
    echo "다음 단계:"
    echo "  1. 애플리케이션의 DATABASE_WRITER_URL을 Aurora Writer 엔드포인트로 설정하세요."
    echo "  2. 애플리케이션의 DATABASE_READER_URL을 Aurora Reader 엔드포인트로 설정하세요."
    echo "  3. 애플리케이션을 재시작하세요."
    echo "  4. 정상 동작 확인 후 원본 MySQL은 백업용으로 유지하세요."
    echo ""
    echo "롤백이 필요한 경우:"
    echo "  - DATABASE_URL을 원본 MySQL 엔드포인트로 되돌리고 재시작하세요."
    echo "  - 원본 MySQL 데이터는 이 스크립트에 의해 변경되지 않았습니다."
    exit 0
  else
    exit 1
  fi
}

main "$@"
