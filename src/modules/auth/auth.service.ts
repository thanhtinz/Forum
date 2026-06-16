import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto, OAuthLoginDto } from './auth.dto';
import * as argon2 from 'argon2';
import { generateSecret, verifyTotp, otpauthUrl } from './totp';

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

    // Validate invite code if provided
    let inviteRole: string | undefined;
    let inviteCodeRecord: any;
    if (dto.inviteCode) {
      inviteCodeRecord = await this.prisma.inviteCode.findUnique({
        where: { code: dto.inviteCode },
      });
      if (!inviteCodeRecord) throw new BadRequestException('Mã mời không hợp lệ');
      if (inviteCodeRecord.expiresAt && inviteCodeRecord.expiresAt < new Date()) {
        throw new BadRequestException('Mã mời đã hết hạn');
      }
      if (inviteCodeRecord.maxUses !== null && inviteCodeRecord.uses >= inviteCodeRecord.maxUses) {
        throw new BadRequestException('Mã mời đã hết lượt sử dụng');
      }
      inviteRole = inviteCodeRecord.role;
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          passwordHash,
          displayName: dto.displayName ?? dto.username,
          ...(inviteRole ? { role: inviteRole as any } : {}),
        },
      });
      // Tạo gem wallet
      await tx.gemWallet.create({ data: { userId: u.id } });
      // Record invite code usage
      if (inviteCodeRecord) {
        await tx.inviteCode.update({
          where: { id: inviteCodeRecord.id },
          data: { uses: { increment: 1 } },
        });
        await tx.inviteCodeUse.create({
          data: { inviteCodeId: inviteCodeRecord.id, userId: u.id },
        });
      }
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

    if (user.twoFaEnabled && user.twoFaSecret) {
      if (!dto.code) throw new UnauthorizedException('2FA_REQUIRED');
      if (!verifyTotp(user.twoFaSecret, dto.code)) throw new UnauthorizedException('Mã 2FA không đúng');
    }

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
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) throw new BadRequestException('Mật khẩu mới tối thiểu 6 ký tự');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user?.passwordHash) throw new BadRequestException('Tài khoản không dùng mật khẩu');
    const ok = await argon2.verify(user.passwordHash, oldPassword);
    if (!ok) throw new BadRequestException('Mật khẩu hiện tại không đúng');
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await argon2.hash(newPassword) } });
    return { ok: true };
  }

  // ── 2FA (TOTP) ──
  async twoFaStatus(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { twoFaEnabled: true } });
    return { enabled: !!u?.twoFaEnabled };
  }

  async setup2fa(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { username: true, email: true, twoFaEnabled: true } });
    if (!u) throw new NotFoundException();
    if (u.twoFaEnabled) throw new BadRequestException('2FA đã được bật');
    const secret = generateSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { twoFaSecret: secret } });
    return { secret, otpauth: otpauthUrl(secret, u.email || u.username) };
  }

  async enable2fa(userId: string, code: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { twoFaSecret: true } });
    if (!u?.twoFaSecret) throw new BadRequestException('Hãy thiết lập 2FA trước');
    if (!verifyTotp(u.twoFaSecret, code)) throw new BadRequestException('Mã không đúng');
    await this.prisma.user.update({ where: { id: userId }, data: { twoFaEnabled: true } });
    return { ok: true };
  }

  async disable2fa(userId: string, code: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { twoFaSecret: true, twoFaEnabled: true } });
    if (!u?.twoFaEnabled || !u.twoFaSecret) throw new BadRequestException('2FA chưa bật');
    if (!verifyTotp(u.twoFaSecret, code)) throw new BadRequestException('Mã không đúng');
    await this.prisma.user.update({ where: { id: userId }, data: { twoFaEnabled: false, twoFaSecret: null } });
    return { ok: true };
  }

  async validateUser(userId: string) {    const user = await this.prisma.user.findUnique({
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
