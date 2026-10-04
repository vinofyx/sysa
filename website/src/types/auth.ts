/**
 * Shapes mirror the backend response bodies exactly (api/src/services/*.service.ts
 * `toPublic*`/`toProfile` mappers) — kept in one place so every hook/component agrees.
 *
 * `PaginatedResult` lives in `@/types/pagination` instead, since it's a
 * generic shape also used by public/donor-facing features (donation
 * history) — not auth-specific despite this file's history.
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  sessionId: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  active: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Permission {
  id: string;
  code: string;
  description: string | null;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Session {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
}
