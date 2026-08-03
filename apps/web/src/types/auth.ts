/**
 * Shapes mirror the backend response bodies exactly (apps/api/src/services/*.service.ts
 * `toPublic*`/`toProfile` mappers) — kept in one place so every hook/component agrees.
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

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
