import type { LoginAttemptState } from "@/modules/auth/domain/login-rate-limit";

export interface OwnerRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OwnerView {
  id: string;
  email: string;
  createdAt: Date;
}

export interface SessionOwnerRecord {
  sessionId: string;
  expiresAt: Date;
  owner: OwnerRecord;
}

export interface LoginAttemptKey {
  identityHash: string;
  ipHash: string;
}

export interface AuthRepository {
  hasOwner(): Promise<boolean>;
  createOwner(input: {
    email: string;
    passwordHash: string;
  }): Promise<OwnerRecord>;
  findOwnerByEmail(email: string): Promise<OwnerRecord | null>;
  createSession(input: {
    ownerId: string;
    tokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<void>;
  findOwnerByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<SessionOwnerRecord | null>;
  revokeSession(tokenHash: string, now: Date): Promise<void>;
  revokeAllOwnerSessions(ownerId: string, now: Date): Promise<void>;
  updatePasswordAndRevokeSessions(input: {
    ownerId: string;
    passwordHash: string;
    now: Date;
  }): Promise<void>;
  getLoginAttempt(key: LoginAttemptKey): Promise<LoginAttemptState | null>;
  recordLoginFailure(
    key: LoginAttemptKey,
    now: Date,
  ): Promise<LoginAttemptState>;
  clearLoginAttempt(key: LoginAttemptKey): Promise<void>;
}

export function toOwnerView(owner: OwnerRecord): OwnerView {
  return {
    id: owner.id,
    email: owner.email,
    createdAt: owner.createdAt,
  };
}
