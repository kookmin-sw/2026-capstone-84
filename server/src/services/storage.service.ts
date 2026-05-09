import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';
import { extname } from 'path';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { AppError } from './auth.service';

// ============================================================
// S3 스토리지 서비스 모듈
// - 파일 업로드 (S3 PutObject)
// - 파일 삭제 (S3 DeleteObject)
// - CloudFront 도메인 기반 공개 URL 반환
// - 환경 변수 미설정 시 로컬 파일시스템 폴백
// ============================================================

interface StorageServiceInterface {
  isEnabled(): boolean;
  generateKey(userId: string, originalFilename: string): string;
  uploadFile(buffer: Buffer, userId: string, originalFilename: string, mimeType: string): Promise<string>;
  deleteFile(fileUrl: string): Promise<void>;
  getPublicUrl(key: string): string;
}

class StorageService implements StorageServiceInterface {
  private s3Client: S3Client | null = null;
  private bucketName: string | null = null;
  private cloudfrontDomain: string | null = null;
  private region: string;
  private enabled: boolean = false;

  constructor() {
    this.bucketName = process.env.S3_BUCKET_NAME || null;
    this.cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN || null;
    this.region = process.env.S3_REGION || 'ap-northeast-2';

    if (!this.bucketName) {
      console.log('[Storage] S3_BUCKET_NAME 미설정 - 로컬 파일시스템 모드 (기존 multer 동작 유지)');
      this.enabled = false;
      return;
    }

    try {
      this.s3Client = new S3Client({ region: this.region });
      this.enabled = true;
      console.log(`[Storage] S3 모드 활성화 - 버킷: ${this.bucketName}, 리전: ${this.region}`);
    } catch (err) {
      console.error('[Storage] S3 클라이언트 초기화 실패:', err);
      this.enabled = false;
    }
  }

  /**
   * S3 모드가 활성화되어 있는지 반환
   */
  isEnabled(): boolean {
    return this.enabled && this.s3Client !== null;
  }

  /**
   * 고유한 S3 키 생성
   * 형식: uploads/{userId}/{timestamp}-{randomId}.{ext}
   */
  generateKey(userId: string, originalFilename: string): string {
    const timestamp = Date.now();
    const randomId = randomBytes(8).toString('hex');
    const ext = extname(originalFilename).replace('.', '');
    return `uploads/${userId}/${timestamp}-${randomId}.${ext}`;
  }

  /**
   * 파일 업로드
   * - S3 모드: S3 PutObject로 업로드
   * - 로컬 모드: 로컬 파일시스템에 저장
   * @returns 공개 URL
   */
  async uploadFile(
    buffer: Buffer,
    userId: string,
    originalFilename: string,
    mimeType: string,
  ): Promise<string> {
    const key = this.generateKey(userId, originalFilename);

    if (this.isEnabled()) {
      return this.uploadToS3(buffer, key, mimeType);
    }

    return this.uploadToLocal(buffer, key);
  }

  /**
   * 파일 삭제
   * - S3 모드: URL에서 키를 추출하여 S3 DeleteObject
   * - 로컬 모드: 로컬 파일시스템에서 삭제
   */
  async deleteFile(fileUrl: string): Promise<void> {
    const key = this.extractKeyFromUrl(fileUrl);
    if (!key) return;

    if (this.isEnabled()) {
      await this.deleteFromS3(key);
    } else {
      await this.deleteFromLocal(key);
    }
  }

  /**
   * 공개 URL 반환
   * - S3 모드: https://{CLOUDFRONT_DOMAIN}/{key}
   * - 로컬 모드: /uploads/{relative_path} (상대 경로)
   */
  getPublicUrl(key: string): string {
    if (this.isEnabled() && this.cloudfrontDomain) {
      return `https://${this.cloudfrontDomain}/${key}`;
    }

    // 로컬 모드: key가 이미 uploads/로 시작하면 그대로, 아니면 앞에 추가
    if (key.startsWith('uploads/')) {
      return `/${key}`;
    }
    return `/uploads/${key}`;
  }

  // ============================================================
  // Private: S3 업로드/삭제
  // ============================================================

  private async uploadToS3(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName!,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      });

      await this.s3Client!.send(command);
      return this.getPublicUrl(key);
    } catch (err) {
      console.error('[Storage] S3 업로드 실패:', err);
      throw new AppError(500, 'UPLOAD_FAILED', '파일 업로드에 실패했습니다');
    }
  }

  private async deleteFromS3(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName!,
        Key: key,
      });

      await this.s3Client!.send(command);
    } catch (err) {
      console.error('[Storage] S3 삭제 실패:', err);
      // 삭제 실패는 치명적이지 않으므로 에러를 던지지 않음
    }
  }

  // ============================================================
  // Private: 로컬 파일시스템 업로드/삭제
  // ============================================================

  private async uploadToLocal(buffer: Buffer, key: string): Promise<string> {
    try {
      const filePath = join(process.cwd(), key);
      const dirPath = join(process.cwd(), key.substring(0, key.lastIndexOf('/')));

      await mkdir(dirPath, { recursive: true });
      await writeFile(filePath, buffer);

      return this.getPublicUrl(key);
    } catch (err) {
      console.error('[Storage] 로컬 파일 저장 실패:', err);
      throw new AppError(500, 'UPLOAD_FAILED', '파일 업로드에 실패했습니다');
    }
  }

  private async deleteFromLocal(key: string): Promise<void> {
    try {
      const filePath = join(process.cwd(), key);
      await unlink(filePath);
    } catch (err) {
      // 파일이 존재하지 않는 경우 무시
      console.error('[Storage] 로컬 파일 삭제 실패:', err);
    }
  }

  // ============================================================
  // Private: URL에서 키 추출
  // ============================================================

  private extractKeyFromUrl(fileUrl: string): string | null {
    if (!fileUrl) return null;

    // CloudFront URL: https://{domain}/uploads/{userId}/{filename}
    if (this.cloudfrontDomain && fileUrl.includes(this.cloudfrontDomain)) {
      const url = new URL(fileUrl);
      // 앞의 '/' 제거
      return url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
    }

    // 로컬 URL: /uploads/{userId}/{filename}
    if (fileUrl.startsWith('/uploads/')) {
      return fileUrl.slice(1); // 앞의 '/' 제거 → uploads/...
    }

    // uploads/로 시작하는 키 자체가 전달된 경우
    if (fileUrl.startsWith('uploads/')) {
      return fileUrl;
    }

    return null;
  }
}

// 싱글톤 인스턴스 export
export const storageService = new StorageService();
