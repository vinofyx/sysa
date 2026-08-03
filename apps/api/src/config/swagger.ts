import type { OpenAPIV3 } from 'openapi-types';

import { env } from '@config/env';

/**
 * Hand-authored OpenAPI 3.0 document (rather than JSDoc-comment extraction) so the
 * spec is guaranteed to match the actual Zod validation schemas and route behavior —
 * see design/13-API-Architecture.md for the architectural contract this documents.
 * Served via swagger-ui-express at /api/v1/docs (see src/app.ts).
 */

const errorResponse: OpenAPIV3.ResponseObject = {
  description: 'Error response',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              fields: {
                type: 'object',
                additionalProperties: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  },
};

const cookieAuth: OpenAPIV3.SecuritySchemeObject = {
  type: 'apiKey',
  in: 'cookie',
  name: 'sysa_access_token',
};

const bearerAuth: OpenAPIV3.SecuritySchemeObject = {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
};

const userSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    roleId: { type: 'string', format: 'uuid' },
    roleName: { type: 'string' },
    active: { type: 'boolean' },
    emailVerified: { type: 'boolean' },
    lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const roleSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    permissions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          code: { type: 'string' },
          description: { type: 'string', nullable: true },
        },
      },
    },
  },
};

const sessionSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    userAgent: { type: 'string', nullable: true },
    ipAddress: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    lastUsedAt: { type: 'string', format: 'date-time' },
    expiresAt: { type: 'string', format: 'date-time' },
    current: { type: 'boolean' },
  },
};

export const openApiDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Sai Yadadri Seva Ashram Platform API',
    version: '0.1.0',
    description:
      'Core application framework API (Phase 4): authentication, RBAC (users/roles/permissions), and profile. ' +
      'Business-domain endpoints (donations, content, volunteers, events, gallery, etc.) are added in the feature-development phase — ' +
      'see documentation/13-API-Requirements.md for the full planned catalogue.',
  },
  servers: [{ url: `${env.API_URL}/api/v1`, description: 'Current environment' }],
  tags: [
    { name: 'Health', description: 'Liveness/readiness' },
    { name: 'Auth', description: 'Authentication, sessions, password & email verification' },
    { name: 'Users', description: 'Admin user management (Super Admin / users:* permissions)' },
    { name: 'Roles', description: 'Configurable RBAC roles' },
    { name: 'Permissions', description: 'Read-only permission catalogue' },
    { name: 'Profile', description: "The authenticated caller's own profile" },
  ],
  components: {
    securitySchemes: { cookieAuth, bearerAuth },
    schemas: { User: userSchema, Role: roleSchema, Session: sessionSchema },
    responses: { Error: errorResponse },
  },
  security: [{ cookieAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'API + database health check',
        security: [],
        responses: {
          '200': { description: 'Healthy' },
          '503': { description: 'Degraded (database unreachable)' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in with email + password',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful — sets httpOnly access/refresh cookies',
            content: {
              'application/json': { schema: { type: 'object', properties: { user: userSchema } } },
            },
          },
          '401': errorResponse,
          '403': errorResponse,
          '423': {
            description: 'Account locked',
            content: {
              'application/json': { schema: errorResponse.content!['application/json'].schema },
            },
          },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate the refresh token and issue a new access token',
        security: [],
        responses: { '200': { description: 'Refreshed' }, '401': errorResponse },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out of the current device/session',
        responses: { '200': { description: 'Logged out' }, '401': errorResponse },
      },
    },
    '/auth/logout-all': {
      post: {
        tags: ['Auth'],
        summary: 'Log out of all devices (revokes every active session)',
        responses: { '200': { description: 'All sessions revoked' }, '401': errorResponse },
      },
    },
    '/auth/sessions': {
      get: {
        tags: ['Auth'],
        summary: "List the caller's active login sessions",
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { sessions: { type: 'array', items: sessionSchema } },
                },
              },
            },
          },
          '401': errorResponse,
        },
      },
    },
    '/auth/sessions/{sessionId}': {
      delete: {
        tags: ['Auth'],
        summary: 'Revoke a specific session (sign out one device)',
        parameters: [
          {
            name: 'sessionId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: { '200': { description: 'Revoked' }, '404': errorResponse },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset email',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Generic success response (anti-enumeration)' } },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password using a token from the forgot-password email',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'newPassword'],
                properties: {
                  token: { type: 'string' },
                  newPassword: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Password reset' }, '400': errorResponse },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change password while authenticated',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Password changed' }, '400': errorResponse },
      },
    },
    '/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verify email using a token from the verification email',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: { token: { type: 'string' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Email verified' }, '400': errorResponse },
      },
    },
    '/auth/resend-verification': {
      post: {
        tags: ['Auth'],
        summary: 'Resend the email verification link',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Generic success response (anti-enumeration)' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the authenticated identity + permissions for the current session',
        responses: { '200': { description: 'OK' }, '401': errorResponse },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List admin users (requires users:view)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'roleId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'active', in: 'query', schema: { type: 'boolean' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'OK' }, '401': errorResponse, '403': errorResponse },
      },
      post: {
        tags: ['Users'],
        summary:
          'Create a new admin user (requires users:manage) — sends an email-verification link',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'roleId'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  roleId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' }, '409': errorResponse },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get a single admin user (requires users:view)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' }, '404': errorResponse },
      },
      patch: {
        tags: ['Users'],
        summary: "Update a user's name, role, or active status (requires users:manage)",
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'Updated' }, '404': errorResponse },
      },
    },
    '/roles': {
      get: {
        tags: ['Roles'],
        summary: 'List all roles with their permissions (requires roles:view)',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { roles: { type: 'array', items: roleSchema } },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Roles'],
        summary: 'Create a custom role (requires roles:manage)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  permissionCodes: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' }, '409': errorResponse },
      },
    },
    '/roles/{id}': {
      get: {
        tags: ['Roles'],
        summary: 'Get a single role (requires roles:view)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' }, '404': errorResponse },
      },
      patch: {
        tags: ['Roles'],
        summary: "Update a role's name/description/permissions (requires roles:manage)",
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'Updated' }, '403': errorResponse },
      },
      delete: {
        tags: ['Roles'],
        summary:
          'Delete a role — blocked if any user still holds it, or if protected (requires roles:manage)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'Deleted' }, '409': errorResponse },
      },
    },
    '/permissions': {
      get: {
        tags: ['Permissions'],
        summary: 'List the full permission catalogue (requires permissions:view)',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/profile': {
      get: {
        tags: ['Profile'],
        summary: "Get the caller's own profile",
        responses: { '200': { description: 'OK' } },
      },
      patch: {
        tags: ['Profile'],
        summary: "Update the caller's own display name",
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Updated' } },
      },
    },
  },
};
