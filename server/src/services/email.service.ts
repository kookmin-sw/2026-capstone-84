import { EmailService } from '../../../shared/types/services';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

/**
 * 개발 모드용 이메일 서비스 - 콘솔에 출력
 */
export class ConsoleEmailService implements EmailService {
  async sendCredentials(to: string, username: string, password: string): Promise<void> {
    console.log('\n========================================');
    console.log('📧 [EMAIL] 자격증명 발송');
    console.log('----------------------------------------');
    console.log(`수신: ${to}`);
    console.log(`아이디: ${username}`);
    console.log(`비밀번호: ${password}`);
    console.log('========================================\n');
  }

  async sendReissuedCredentials(to: string, username: string, newPassword: string): Promise<void> {
    console.log('\n========================================');
    console.log('📧 [EMAIL] 재발급 자격증명 발송');
    console.log('----------------------------------------');
    console.log(`수신: ${to}`);
    console.log(`아이디: ${username}`);
    console.log(`새 비밀번호: ${newPassword}`);
    console.log('========================================\n');
  }
}

/**
 * 프로덕션 모드용 이메일 서비스 - AWS SES 사용
 */
export class SesEmailService implements EmailService {
  private client: SESClient;
  private fromEmail: string;

  constructor() {
    this.client = new SESClient({
      region: process.env.AWS_REGION || 'ap-northeast-2',
    });
    this.fromEmail = process.env.SES_FROM_EMAIL || 'noreply@example.com';
  }

  async sendCredentials(to: string, username: string, password: string): Promise<void> {
    const command = new SendEmailCommand({
      Source: this.fromEmail,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: '회원가입 자격증명 안내' },
        Body: {
          Text: {
            Data: [
              '회원가입이 완료되었습니다.',
              '',
              `아이디: ${username}`,
              `비밀번호: ${password}`,
              '',
              '이 정보를 안전한 곳에 보관해주세요.',
            ].join('\n'),
          },
        },
      },
    });

    await this.client.send(command);
  }

  async sendReissuedCredentials(to: string, username: string, newPassword: string): Promise<void> {
    const command = new SendEmailCommand({
      Source: this.fromEmail,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: '자격증명 재발급 안내' },
        Body: {
          Text: {
            Data: [
              '자격증명이 재발급되었습니다.',
              '',
              `아이디: ${username}`,
              `새 비밀번호: ${newPassword}`,
              '',
              '이 정보를 안전한 곳에 보관해주세요.',
            ].join('\n'),
          },
        },
      },
    });

    await this.client.send(command);
  }
}

/**
 * 환경변수 EMAIL_MODE에 따라 적절한 EmailService 인스턴스를 생성
 * - EMAIL_MODE=ses → SesEmailService
 * - 그 외 (기본값) → ConsoleEmailService
 */
export function createEmailService(): EmailService {
  if (process.env.EMAIL_MODE === 'ses') {
    return new SesEmailService();
  }
  return new ConsoleEmailService();
}
