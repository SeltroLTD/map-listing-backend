import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { config } from '../config/config';
import { Role } from '../types';
import type { AuthTokens, JwtPayload, UserDto } from '../types';

const SALT_ROUNDS = 12;

export class AuthService {
  // ── Token helpers ────────────────────────────────────────────────────────

  generateTokens(payload: Omit<JwtPayload, 'iat' | 'exp'>): AuthTokens {
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpiresIn,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }

  private toUserDto(user: {
    id: string;
    name: string;
    email: string;
    provider: string;
    role: Role;
    createdAt: Date;
  }): UserDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      provider: user.provider,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  // ── Register ─────────────────────────────────────────────────────────────

  async register(name: string, email: string, password: string, role: Role = Role.CUSTOMER): Promise<{ user: UserDto; tokens: AuthTokens }> {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw Object.assign(new Error('Email already in use'), { statusCode: 409 });
    }

    // Never allow registering as ADMIN via the API
    const safeRole = role === Role.ADMIN ? Role.CUSTOMER : role;

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, provider: 'email', role: safeRole },
    });

    const tokens = this.generateTokens({ sub: user.id, email: user.email, role: user.role });
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, SALT_ROUNDS);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashedRefresh } });

    return { user: this.toUserDto(user), tokens };
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<{ user: UserDto; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    const tokens = this.generateTokens({ sub: user.id, email: user.email, role: user.role });
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, SALT_ROUNDS);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashedRefresh } });

    return { user: this.toUserDto(user), tokens };
  }

  // ── Refresh Token ─────────────────────────────────────────────────────────

  async refreshAccessToken(incomingRefreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = jwt.verify(incomingRefreshToken, config.jwt.refreshSecret) as JwtPayload;
    } catch {
      throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.refreshToken) {
      throw Object.assign(new Error('Refresh token revoked'), { statusCode: 401 });
    }

    const match = await bcrypt.compare(incomingRefreshToken, user.refreshToken);
    if (!match) {
      throw Object.assign(new Error('Refresh token mismatch'), { statusCode: 401 });
    }

    const tokens = this.generateTokens({ sub: user.id, email: user.email, role: user.role });
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, SALT_ROUNDS);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashedRefresh } });

    return tokens;
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async logout(userId: string): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
  }

  // ── Google OAuth upsert ───────────────────────────────────────────────────

  async upsertGoogleUser(profile: {
    id: string;
    displayName: string;
    emails?: Array<{ value: string }>;
  }): Promise<{ user: UserDto; tokens: AuthTokens }> {
    const email = profile.emails?.[0]?.value;
    if (!email) throw new Error('Google profile has no email');

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: profile.displayName,
          email,
          provider: 'google',
          role: Role.CUSTOMER,
        },
      });
    }

    const tokens = this.generateTokens({ sub: user.id, email: user.email, role: user.role });
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, SALT_ROUNDS);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashedRefresh } });

    return { user: this.toUserDto(user), tokens };
  }

  // ── Get user by id ────────────────────────────────────────────────────────

  async getUserById(id: string): Promise<UserDto | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return this.toUserDto(user);
  }
}

export const authService = new AuthService();
