import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto, OAuthLoginDto } from './auth.dto';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ──────────────────────────────────────────────
  // REGISTER
  // ──────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      if (existing.email === dto.email)
        throw new ConflictException('Email đã được sử dụng');
      throw new ConflictException('Tên đăng nhập đã tồn tại');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          passwordHash,
          displayName: dto.displayName ?? dto.username,
        },
      });
      // Tạo gem wallet
      await tx.gemWallet.create({ data: { userId: u.id } });
      return u;
    });

    return this.issueTokens(user.id, user.username, user.role);
  }

  // ──────────────────────────────────────────────
  // LOGIN
  // ──────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash)
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    if (user.status === 'BANNED')
      throw new UnauthorizedException(`Tài khoản đã bị khoá: ${user.banReason ?? ''}`);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    });

    return this.issueTokens(user.id, user.username, user.role);
  }

  // ──────────────────────────────────────────────
  // OAUTH (Google / Discord / Zalo)
  // ──────────────────────────────────────────────
  async oauthLogin(dto: OAuthLoginDto) {
    // Tìm theo oauth provider
    let oauth = await this.prisma.oAuthProvider.findUnique({
      where: { provider_providerId: { provider: dto.provider, providerId: dto.providerId } },
      include: { user: true },
    });

    let user;
    if (oauth) {
      user = oauth.user;
    } else {
      // Kiểm tra email đã tồn tại → link
      let existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });

      if (existingUser) {
        await this.prisma.oAuthProvider.create({
          data: { userId: existingUser.id, provider: dto.provider, providerId: dto.providerId },
        });
        user = existingUser;
      } else {
        // Tạo user mới
        const username = await this.generateUniqueUsername(dto.username);
        user = await this.prisma.$transaction(async (tx) => {
          const u = await tx.user.create({
            data: {
              username,
              email: dto.email,
              displayName: dto.displayName ?? username,
              avatar: dto.avatar,
              isVerified: true,
            },
          });
          await tx.oAuthProvider.create({
            data: { userId: u.id, provider: dto.provider, providerId: dto.providerId },
          });
          await tx.gemWallet.create({ data: { userId: u.id } });
          return u;
        });
      }
    }

    return this.issueTokens(user.id, user.username, user.role);
  }

  // ──────────────────────────────────────────────
  // REFRESH TOKEN
  // ──────────────────────────────────────────────
  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException();
      return this.issueTokens(user.id, user.username, user.role);
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }

  // ──────────────────────────────────────────────
  // VALIDATE (cho JWT strategy)
  // ──────────────────────────────────────────────
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, username: true, displayName: true, email: true,
        avatar: true, role: true, status: true, gemBalance: true,
      },
    });
    if (!user || user.status === 'BANNED') return null;
    return user;
  }

  // ──────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────
  private async issueTokens(userId: string, username: string, role: string) {
    const payload = { sub: userId, username, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '7d'),
      }),
    ]);
    return { accessToken, refreshToken, user: { id: userId, username, role } };
  }

  private async generateUniqueUsername(base: string): Promise<string> {
    let username = base.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'user';
    let candidate = username;
    let i = 0;
    while (await this.prisma.user.findUnique({ where: { username: candidate } })) {
      i++;
      candidate = `${username}${i}`;
    }
    return candidate;
  }
}
