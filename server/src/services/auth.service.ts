import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { profanityService } from './profanity.service';

const prisma = new PrismaClient();

type User = Awaited<ReturnType<typeof prisma.user.create>>;

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key';
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const authService = {
  async signup(nickname: string): Promise<User> {
    // 닉네임 욕설 필터링
    const nicknameCheck = profanityService.check(nickname);
    if (!nicknameCheck.isClean) {
      throw new AppError(400, 'PROFANITY_DETECTED', '부적절한 표현이 포함되어 있습니다. 수정 후 다시 시도해주세요.');
    }

    const existingNickname = await prisma.user.findUnique({ where: { nickname } });
    if (existingNickname) {
      throw new AppError(409, 'DUPLICATE_NICKNAME', '이미 사용 중인 닉네임입니다');
    }

    const email = `expo_${crypto.randomUUID()}@expo.local`;
    const user = await prisma.user.create({
      data: { email, nickname, provider: 'expo' },
    });

    return user;
  },

  async login(nickname: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await prisma.user.findUnique({ where: { nickname } });
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', '등록되지 않은 닉네임입니다');
    }

    const payload: TokenPayload = { userId: user.id, email: user.email };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

    return { accessToken, refreshToken };
  },

  async kakaoLogin(kakaoAccessToken: string): Promise<{ accessToken: string; refreshToken: string; isNew: boolean }> {
    // 카카오 사용자 정보 조회
    const axios = (await import('axios')).default;
    const { data: kakaoUser } = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${kakaoAccessToken}` },
    });

    const kakaoId = String(kakaoUser.id);
    const email = kakaoUser.kakao_account?.email || `kakao_${kakaoId}@kakao.local`;
    const nickname = kakaoUser.kakao_account?.profile?.nickname || `카카오유저${kakaoId.slice(-4)}`;

    // 기존 카카오 계정 찾기
    let user = await prisma.user.findUnique({ where: { kakaoId } });
    let isNew = false;

    if (!user) {
      // 같은 이메일로 가입된 계정이 있는지 확인
      const existingByEmail = await prisma.user.findUnique({ where: { email } });
      if (existingByEmail) {
        // 기존 계정에 카카오 연동
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: { kakaoId, provider: 'kakao' },
        });
      } else {
        // 새 계정 생성
        user = await prisma.user.create({
          data: { email, nickname, kakaoId, provider: 'kakao' },
        });
        isNew = true;
      }
    }

    const payload: TokenPayload = { userId: user.id, email: user.email };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

    return { accessToken, refreshToken, isNew };
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as TokenPayload;
      const payload: TokenPayload = { userId: decoded.userId, email: decoded.email };
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
      return { accessToken };
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AppError(401, 'TOKEN_EXPIRED', '인증 토큰이 만료되었습니다');
      }
      throw new AppError(401, 'INVALID_TOKEN', '유효하지 않은 토큰입니다');
    }
  },

  async validateToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      return { userId: decoded.userId, email: decoded.email };
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AppError(401, 'TOKEN_EXPIRED', '인증 토큰이 만료되었습니다');
      }
      throw new AppError(401, 'INVALID_TOKEN', '유효하지 않은 토큰입니다');
    }
  },
};
