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

const paginationParams: OpenAPIV3.ParameterObject[] = [
  { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
  { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
];

const idPathParam: OpenAPIV3.ParameterObject = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};

/**
 * Every "simple content" module (Hero Banners, Testimonials, Social Links,
 * Navigation, Activities, Committee, Event Categories) is built on the
 * generic `buildSimpleCrudRouter` factory (src/lib/simple-crud-router.ts),
 * so its documented shape — list/get/create/update/delete(+reorder) — is
 * identical across modules. Generating the path objects here mirrors that
 * one-factory-many-routers design instead of hand-duplicating six near
 * identical path blocks.
 */
function simpleCrudPaths(
  basePath: string,
  tag: string,
  entityName: string,
  options: { supportsReorder?: boolean } = {},
): OpenAPIV3.PathsObject {
  const paths: OpenAPIV3.PathsObject = {
    [basePath]: {
      get: {
        tags: [tag],
        summary: `List ${entityName} (paginated)`,
        parameters: paginationParams,
        responses: { '200': { description: 'OK' }, '401': errorResponse, '403': errorResponse },
      },
      post: {
        tags: [tag],
        summary: `Create a ${entityName}`,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: {
          '201': { description: 'Created' },
          '400': errorResponse,
          '403': errorResponse,
        },
      },
    },
    [`${basePath}/{id}`]: {
      get: {
        tags: [tag],
        summary: `Get a single ${entityName}`,
        parameters: [idPathParam],
        responses: { '200': { description: 'OK' }, '404': errorResponse },
      },
      patch: {
        tags: [tag],
        summary: `Update a ${entityName}`,
        parameters: [idPathParam],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: { '200': { description: 'Updated' }, '404': errorResponse },
      },
      delete: {
        tags: [tag],
        summary: `Soft-delete a ${entityName}`,
        parameters: [idPathParam],
        responses: { '200': { description: 'Deleted' }, '404': errorResponse },
      },
    },
  };

  if (options.supportsReorder) {
    paths[`${basePath}/bulk/reorder`] = {
      patch: {
        tags: [tag],
        summary: `Reorder ${entityName} by displayOrder`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: {
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        displayOrder: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Reordered' }, '400': errorResponse },
      },
    };
  }

  return paths;
}

const phase5Paths: OpenAPIV3.PathsObject = {
  ...simpleCrudPaths('/hero-banners', 'Hero Banners', 'hero banner', { supportsReorder: true }),
  ...simpleCrudPaths('/testimonials', 'Testimonials', 'testimonial', { supportsReorder: true }),
  ...simpleCrudPaths('/social-links', 'Social Links', 'social media link', {
    supportsReorder: true,
  }),
  ...simpleCrudPaths('/navigation', 'Navigation', 'navigation menu item', {
    supportsReorder: true,
  }),
  ...simpleCrudPaths('/activities', 'Activities', 'activity', { supportsReorder: true }),
  ...simpleCrudPaths('/committee', 'Committee', 'committee member', { supportsReorder: true }),
  ...simpleCrudPaths('/event-categories', 'Event Categories', 'event category'),

  '/site-settings/public': {
    get: {
      tags: ['Site Settings'],
      summary: 'Get site-wide settings (public — contact info, SEO defaults, social links)',
      security: [],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/site-settings': {
    get: {
      tags: ['Site Settings'],
      summary: 'Get site-wide settings (requires settings:view)',
      responses: { '200': { description: 'OK' }, '403': errorResponse },
    },
    patch: {
      tags: ['Site Settings'],
      summary: 'Update site-wide settings (requires settings:manage)',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { '200': { description: 'Updated' }, '403': errorResponse },
    },
  },

  '/page-content/public/{pageKey}': {
    get: {
      tags: ['Page Content'],
      summary: 'Get published page content by key (public)',
      security: [],
      parameters: [
        {
          name: 'pageKey',
          in: 'path',
          required: true,
          schema: { type: 'string', enum: ['home', 'about', 'contact'] },
        },
      ],
      responses: { '200': { description: 'OK' }, '404': errorResponse },
    },
  },
  '/page-content': {
    get: {
      tags: ['Page Content'],
      summary: 'List all page content blocks (requires content:view)',
      responses: { '200': { description: 'OK' }, '403': errorResponse },
    },
  },
  '/page-content/{pageKey}': {
    get: {
      tags: ['Page Content'],
      summary: 'Get a page content block by key (requires content:view)',
      parameters: [
        {
          name: 'pageKey',
          in: 'path',
          required: true,
          schema: { type: 'string', enum: ['home', 'about', 'contact'] },
        },
      ],
      responses: { '200': { description: 'OK' }, '404': errorResponse },
    },
    patch: {
      tags: ['Page Content'],
      summary: 'Update a page content block (requires content:edit)',
      parameters: [
        {
          name: 'pageKey',
          in: 'path',
          required: true,
          schema: { type: 'string', enum: ['home', 'about', 'contact'] },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['blocksEn'],
              properties: {
                blocksEn: { type: 'object' },
                blocksTe: { type: 'object' },
              },
            },
          },
        },
      },
      responses: { '200': { description: 'Updated' }, '403': errorResponse },
    },
  },

  '/donation-categories/public': {
    get: {
      tags: ['Donation Categories'],
      summary: 'List active donation categories (public — donation checkout flow)',
      security: [],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/donation-categories': {
    get: {
      tags: ['Donation Categories'],
      summary: 'List donation categories (requires donations:view)',
      parameters: paginationParams,
      responses: { '200': { description: 'OK' }, '403': errorResponse },
    },
    post: {
      tags: ['Donation Categories'],
      summary: 'Create a donation category (requires donations:manage)',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { '201': { description: 'Created' }, '403': errorResponse },
    },
  },
  '/donation-categories/{id}': {
    get: {
      tags: ['Donation Categories'],
      summary: 'Get a donation category (requires donations:view)',
      parameters: [idPathParam],
      responses: { '200': { description: 'OK' }, '404': errorResponse },
    },
    patch: {
      tags: ['Donation Categories'],
      summary: 'Update a donation category (requires donations:manage)',
      parameters: [idPathParam],
      responses: { '200': { description: 'Updated' }, '404': errorResponse },
    },
    delete: {
      tags: ['Donation Categories'],
      summary: 'Deactivate a donation category (requires donations:manage)',
      parameters: [idPathParam],
      responses: { '200': { description: 'Deactivated' }, '404': errorResponse },
    },
  },

  '/appeals/public': {
    get: {
      tags: ['Appeals'],
      summary: 'List active fundraising appeals (public)',
      security: [],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/appeals': {
    get: {
      tags: ['Appeals'],
      summary: 'List appeals (requires appeals:view)',
      parameters: [
        ...paginationParams,
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['active', 'completed', 'archived'] },
        },
      ],
      responses: { '200': { description: 'OK' }, '403': errorResponse },
    },
    post: {
      tags: ['Appeals'],
      summary: 'Create an appeal (requires appeals:manage)',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { '201': { description: 'Created' }, '403': errorResponse },
    },
  },
  '/appeals/{id}': {
    get: {
      tags: ['Appeals'],
      summary: 'Get an appeal, including raised-amount cache (requires appeals:view)',
      parameters: [idPathParam],
      responses: { '200': { description: 'OK' }, '404': errorResponse },
    },
    patch: {
      tags: ['Appeals'],
      summary: 'Update an appeal (requires appeals:manage)',
      parameters: [idPathParam],
      responses: { '200': { description: 'Updated' }, '404': errorResponse },
    },
    delete: {
      tags: ['Appeals'],
      summary: 'Archive an appeal (requires appeals:manage)',
      parameters: [idPathParam],
      responses: { '200': { description: 'Archived' }, '404': errorResponse },
    },
  },

  '/donations': {
    get: {
      tags: ['Donations'],
      summary: 'List donations with filters (requires donations:view)',
      parameters: [
        ...paginationParams,
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'frequency', in: 'query', schema: { type: 'string' } },
        { name: 'categoryId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date' } },
      ],
      responses: { '200': { description: 'OK' }, '403': errorResponse },
    },
  },
  '/donations/analytics': {
    get: {
      tags: ['Donations'],
      summary: 'Donation analytics — totals by category/status/month (requires donations:view)',
      parameters: [
        { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date' } },
      ],
      responses: { '200': { description: 'OK' }, '403': errorResponse },
    },
  },
  '/donations/export': {
    get: {
      tags: ['Donations'],
      summary: 'Export filtered donations as CSV (requires donations:export)',
      responses: {
        '200': { description: 'CSV file', content: { 'text/csv': { schema: { type: 'string' } } } },
        '403': errorResponse,
      },
    },
  },
  '/donations/{id}': {
    get: {
      tags: ['Donations'],
      summary: 'Get a single donation (requires donations:view)',
      parameters: [idPathParam],
      responses: { '200': { description: 'OK' }, '404': errorResponse },
    },
  },
  '/donations/manual': {
    post: {
      tags: ['Donations'],
      summary:
        'Record a manual (cash/in-person) donation — creates donor + receipt (requires donations:create_manual)',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { '201': { description: 'Created' }, '403': errorResponse },
    },
  },
  '/donations/{id}/status': {
    patch: {
      tags: ['Donations'],
      summary: 'Change a donation status, e.g. flag refund (requires donations:flag_refund)',
      parameters: [idPathParam],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { '200': { description: 'Updated' }, '403': errorResponse },
    },
  },

  '/bank-transfers/public': {
    post: {
      tags: ['Bank Transfers'],
      summary: "Submit a bank-transfer claim ('I've made a transfer' form, public, rate-limited)",
      security: [],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: {
        '201': { description: 'Submitted, pending verification' },
        '429': errorResponse,
      },
    },
  },
  '/bank-transfers': {
    get: {
      tags: ['Bank Transfers'],
      summary: 'List bank-transfer claims (requires bank_transfers:view)',
      parameters: [
        ...paginationParams,
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['unverified', 'verified', 'rejected'] },
        },
      ],
      responses: { '200': { description: 'OK' }, '403': errorResponse },
    },
  },
  '/bank-transfers/{id}': {
    get: {
      tags: ['Bank Transfers'],
      summary: 'Get a bank-transfer claim (requires bank_transfers:view)',
      parameters: [idPathParam],
      responses: { '200': { description: 'OK' }, '404': errorResponse },
    },
  },
  '/bank-transfers/{id}/verify': {
    post: {
      tags: ['Bank Transfers'],
      summary:
        'Verify a claim — creates the linked Donation + Receipt (requires bank_transfers:manage)',
      parameters: [idPathParam],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { '200': { description: 'Verified' }, '404': errorResponse },
    },
  },
  '/bank-transfers/{id}/reject': {
    post: {
      tags: ['Bank Transfers'],
      summary: 'Reject a claim with an internal note (requires bank_transfers:manage)',
      parameters: [idPathParam],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { '200': { description: 'Rejected' }, '404': errorResponse },
    },
  },

  '/volunteers/register': {
    post: {
      tags: ['Volunteers'],
      summary: 'Submit a volunteer application (public, rate-limited)',
      security: [],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { '201': { description: 'Submitted' }, '429': errorResponse },
    },
  },
  '/volunteers/applications/list': {
    get: {
      tags: ['Volunteers'],
      summary: 'List volunteer applications (requires volunteers:view)',
      parameters: [
        ...paginationParams,
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
        },
      ],
      responses: { '200': { description: 'OK' }, '403': errorResponse },
    },
  },
  '/volunteers/applications/{id}': {
    get: {
      tags: ['Volunteers'],
      summary: 'Get a volunteer application (requires volunteers:view)',
      parameters: [idPathParam],
      responses: { '200': { description: 'OK' }, '404': errorResponse },
    },
  },
  '/volunteers/applications/{id}/status': {
    patch: {
      tags: ['Volunteers'],
      summary:
        'Approve/reject a volunteer application — approval creates the Volunteer profile and emails the applicant (requires volunteers:manage_status)',
      parameters: [idPathParam],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { '200': { description: 'Updated' }, '404': errorResponse },
    },
  },
  '/volunteers': {
    get: {
      tags: ['Volunteers'],
      summary: 'List approved volunteer profiles (requires volunteers:view)',
      parameters: [
        ...paginationParams,
        { name: 'search', in: 'query', schema: { type: 'string' } },
      ],
      responses: { '200': { description: 'OK' }, '403': errorResponse },
    },
  },
  '/volunteers/{id}': {
    get: {
      tags: ['Volunteers'],
      summary: 'Get a volunteer profile (requires volunteers:view)',
      parameters: [idPathParam],
      responses: { '200': { description: 'OK' }, '404': errorResponse },
    },
  },

  '/volunteer-assignments': {
    get: {
      tags: ['Volunteer Assignments'],
      summary: 'List volunteer task assignments (requires volunteer_assignments:view)',
      parameters: paginationParams,
      responses: { '200': { description: 'OK' }, '403': errorResponse },
    },
    post: {
      tags: ['Volunteer Assignments'],
      summary: 'Assign a task to a volunteer (requires volunteer_assignments:manage)',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { '201': { description: 'Created' }, '403': errorResponse },
    },
  },
  '/volunteer-assignments/{id}': {
    get: {
      tags: ['Volunteer Assignments'],
      summary: 'Get a volunteer assignment (requires volunteer_assignments:view)',
      parameters: [idPathParam],
      responses: { '200': { description: 'OK' }, '404': errorResponse },
    },
    patch: {
      tags: ['Volunteer Assignments'],
      summary: 'Update an assignment status/details (requires volunteer_assignments:manage)',
      parameters: [idPathParam],
      responses: { '200': { description: 'Updated' }, '404': errorResponse },
    },
  },

  '/events/public': {
    get: {
      tags: ['Events'],
      summary: 'List published events (public)',
      security: [],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/events/public/{slug}': {
    get: {
      tags: ['Events'],
      summary: 'Get a published event by slug (public)',
      security: [],
      parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'OK' }, '404': errorResponse },
    },
  },
  '/events': {
    get: {
      tags: ['Events'],
      summary: 'List events, any status (requires events:view)',
      parameters: paginationParams,
      responses: { '200': { description: 'OK' }, '403': errorResponse },
    },
    post: {
      tags: ['Events'],
      summary: 'Create an event (requires events:manage)',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { '201': { description: 'Created' }, '403': errorResponse },
    },
  },
  '/events/{id}': {
    get: {
      tags: ['Events'],
      summary: 'Get an event (requires events:view)',
      parameters: [idPathParam],
      responses: { '200': { description: 'OK' }, '404': errorResponse },
    },
    patch: {
      tags: ['Events'],
      summary: 'Update an event (requires events:manage)',
      parameters: [idPathParam],
      responses: { '200': { description: 'Updated' }, '404': errorResponse },
    },
    delete: {
      tags: ['Events'],
      summary: 'Soft-delete an event (requires events:manage)',
      parameters: [idPathParam],
      responses: { '200': { description: 'Deleted' }, '404': errorResponse },
    },
  },

  '/event-registrations/public': {
    post: {
      tags: ['Event Registrations'],
      summary:
        'Register for an event — waitlists automatically once capacity is reached (public, rate-limited)',
      security: [],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { '201': { description: 'Registered' }, '429': errorResponse },
    },
  },
  '/event-registrations': {
    get: {
      tags: ['Event Registrations'],
      summary: 'List event registrations (requires event_registrations:view)',
      parameters: paginationParams,
      responses: { '200': { description: 'OK' }, '403': errorResponse },
    },
  },
  '/event-registrations/{id}/check-in': {
    post: {
      tags: ['Event Registrations'],
      summary: 'Check in a registrant at the event (requires event_registrations:manage)',
      parameters: [idPathParam],
      responses: { '200': { description: 'Checked in' }, '404': errorResponse },
    },
  },
  '/event-registrations/{id}/cancel': {
    post: {
      tags: ['Event Registrations'],
      summary:
        'Cancel a registration — promotes the next waitlisted registrant (requires event_registrations:manage)',
      parameters: [idPathParam],
      responses: { '200': { description: 'Cancelled' }, '404': errorResponse },
    },
  },

  '/news/public': {
    get: {
      tags: ['News'],
      summary: 'List published news posts (public)',
      security: [],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/news/public/{slug}': {
    get: {
      tags: ['News'],
      summary: 'Get a published news post by slug (public)',
      security: [],
      parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'OK' }, '404': errorResponse },
    },
  },
  '/news': {
    get: {
      tags: ['News'],
      summary: 'List news posts, any status (requires news:view)',
      parameters: paginationParams,
      responses: { '200': { description: 'OK' }, '403': errorResponse },
    },
    post: {
      tags: ['News'],
      summary: 'Create a news post (requires news:manage)',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { '201': { description: 'Created' }, '403': errorResponse },
    },
  },
  '/news/{id}': {
    get: {
      tags: ['News'],
      summary: 'Get a news post (requires news:view)',
      parameters: [idPathParam],
      responses: { '200': { description: 'OK' }, '404': errorResponse },
    },
    patch: {
      tags: ['News'],
      summary: 'Update a news post (requires news:manage)',
      parameters: [idPathParam],
      responses: { '200': { description: 'Updated' }, '404': errorResponse },
    },
    delete: {
      tags: ['News'],
      summary: 'Soft-delete a news post (requires news:manage)',
      parameters: [idPathParam],
      responses: { '200': { description: 'Deleted' }, '404': errorResponse },
    },
  },

  '/gallery/public': {
    get: {
      tags: ['Gallery'],
      summary: 'List gallery albums with their items (public)',
      security: [],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/gallery/albums': {
    get: {
      tags: ['Gallery'],
      summary: 'List gallery albums (requires gallery:view)',
      parameters: [
        ...paginationParams,
        { name: 'category', in: 'query', schema: { type: 'string' } },
      ],
      responses: { '200': { description: 'OK' }, '403': errorResponse },
    },
    post: {
      tags: ['Gallery'],
      summary: 'Create a gallery album (requires gallery:manage)',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { '201': { description: 'Created' }, '403': errorResponse },
    },
  },
  '/gallery/albums/{id}': {
    get: {
      tags: ['Gallery'],
      summary: 'Get an album with its items (requires gallery:view)',
      parameters: [idPathParam],
      responses: { '200': { description: 'OK' }, '404': errorResponse },
    },
    patch: {
      tags: ['Gallery'],
      summary: 'Update an album (requires gallery:manage)',
      parameters: [idPathParam],
      responses: { '200': { description: 'Updated' }, '404': errorResponse },
    },
    delete: {
      tags: ['Gallery'],
      summary: 'Delete an album — cleans up all Cloudinary assets in it (requires gallery:manage)',
      parameters: [idPathParam],
      responses: { '200': { description: 'Deleted' }, '404': errorResponse },
    },
  },
  '/gallery/albums/{albumId}/upload': {
    post: {
      tags: ['Gallery'],
      summary:
        'Upload an image into an album via Cloudinary, multipart/form-data field "file" (requires gallery:manage)',
      parameters: [
        { name: 'albumId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                file: { type: 'string', format: 'binary' },
                altTextEn: { type: 'string' },
              },
            },
          },
        },
      },
      responses: { '201': { description: 'Uploaded' }, '404': errorResponse },
    },
  },
  '/gallery/albums/{albumId}/videos': {
    post: {
      tags: ['Gallery'],
      summary:
        'Add a linked video (YouTube/Vimeo/external URL) to an album (requires gallery:manage)',
      parameters: [
        { name: 'albumId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { '201': { description: 'Created' }, '404': errorResponse },
    },
  },
  '/gallery/items/reorder': {
    patch: {
      tags: ['Gallery'],
      summary: 'Reorder items within an album by displayOrder (requires gallery:manage)',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { '200': { description: 'Reordered' } },
    },
  },
  '/gallery/items/{id}': {
    patch: {
      tags: ['Gallery'],
      summary: 'Update a gallery item (alt text, order) (requires gallery:manage)',
      parameters: [idPathParam],
      responses: { '200': { description: 'Updated' }, '404': errorResponse },
    },
    delete: {
      tags: ['Gallery'],
      summary: 'Delete a gallery item — cleans up its Cloudinary asset (requires gallery:manage)',
      parameters: [idPathParam],
      responses: { '200': { description: 'Deleted' }, '404': errorResponse },
    },
  },

  '/documents/public': {
    get: {
      tags: ['Documents'],
      summary: 'Download Centre — list publicly visible documents (public)',
      security: [],
      parameters: [{ name: 'category', in: 'query', schema: { type: 'string' } }],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/documents': {
    get: {
      tags: ['Documents'],
      summary: 'List documents (requires documents:view)',
      parameters: [
        ...paginationParams,
        { name: 'category', in: 'query', schema: { type: 'string' } },
      ],
      responses: { '200': { description: 'OK' }, '403': errorResponse },
    },
    post: {
      tags: ['Documents'],
      summary:
        'Upload a compliance document via Cloudinary, multipart/form-data field "file" (requires documents:upload)',
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                file: { type: 'string', format: 'binary' },
                category: { type: 'string' },
                titleEn: { type: 'string' },
                titleTe: { type: 'string' },
                publishedDate: { type: 'string', format: 'date' },
                publicVisible: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: { '201': { description: 'Uploaded' }, '403': errorResponse },
    },
  },
  '/media/upload': {
    post: {
      tags: ['Media'],
      summary:
        'Upload an image to Cloudinary and get back its hosted URL (any authenticated admin)',
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
          },
        },
      },
      responses: { '201': { description: 'Uploaded' }, '401': errorResponse },
    },
  },
  '/media/upload/resume': {
    post: {
      tags: ['Media'],
      summary: 'Public, rate-limited resume upload for the Volunteer/Internship form (Phase 6)',
      security: [],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
          },
        },
      },
      responses: { '201': { description: 'Uploaded' }, '429': errorResponse },
    },
  },
  '/documents/{id}': {
    get: {
      tags: ['Documents'],
      summary: 'Get a document (requires documents:view)',
      parameters: [idPathParam],
      responses: { '200': { description: 'OK' }, '404': errorResponse },
    },
    patch: {
      tags: ['Documents'],
      summary: 'Update document metadata / toggle public visibility (requires documents:publish)',
      parameters: [idPathParam],
      responses: { '200': { description: 'Updated' }, '404': errorResponse },
    },
    delete: {
      tags: ['Documents'],
      summary: 'Delete a document — cleans up its Cloudinary asset (requires documents:publish)',
      parameters: [idPathParam],
      responses: { '200': { description: 'Deleted' }, '404': errorResponse },
    },
  },
};

const phase6Paths: OpenAPIV3.PathsObject = {
  '/hero-banners/public': {
    get: {
      tags: ['Public Content'],
      summary: 'List active hero banners (public)',
      security: [],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/testimonials/public': {
    get: {
      tags: ['Public Content'],
      summary: 'List active testimonials (public)',
      security: [],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/activities/public': {
    get: {
      tags: ['Public Content'],
      summary: 'List active activities/services (public)',
      security: [],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/activities/public/{slug}': {
    get: {
      tags: ['Public Content'],
      summary: 'Get an active activity by slug (public)',
      security: [],
      parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'OK' }, '404': errorResponse },
    },
  },
  '/committee/public': {
    get: {
      tags: ['Public Content'],
      summary: 'List active committee members (public)',
      security: [],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/social-links/public': {
    get: {
      tags: ['Public Content'],
      summary: 'List active social media links (public)',
      security: [],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/navigation/public': {
    get: {
      tags: ['Public Content'],
      summary: 'Get the header/footer navigation tree (public)',
      security: [],
      responses: { '200': { description: 'OK' } },
    },
  },
  '/contact': {
    post: {
      tags: ['Contact'],
      summary: 'Submit the public contact form (rate-limited)',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'email', 'message'],
              properties: {
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                phone: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      responses: { '201': { description: 'Submitted' }, '429': errorResponse },
    },
  },
  '/contact/newsletter': {
    post: {
      tags: ['Contact'],
      summary: 'Subscribe an email to the newsletter (rate-limited, idempotent by email)',
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
      responses: { '201': { description: 'Subscribed' }, '429': errorResponse },
    },
  },
};

const phase7Paths: OpenAPIV3.PathsObject = {
  '/donations/initiate': {
    post: {
      tags: ['Payments'],
      summary: 'Create a pending donation + Razorpay order (public, guest checkout)',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['donorName', 'donorEmail', 'categoryId', 'amount', 'idempotencyKey'],
              properties: {
                donorName: { type: 'string' },
                donorEmail: { type: 'string', format: 'email' },
                donorPhone: { type: 'string' },
                panNumber: { type: 'string', description: 'Optional, for a future 80G receipt' },
                categoryId: { type: 'string', format: 'uuid' },
                appealId: { type: 'string', format: 'uuid' },
                amount: { type: 'number', minimum: 1 },
                idempotencyKey: { type: 'string', description: 'One per checkout attempt' },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Razorpay checkout session',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      donationId: { type: 'string', format: 'uuid' },
                      razorpayOrderId: { type: 'string' },
                      amount: { type: 'number' },
                      currency: { type: 'string' },
                      keyId: { type: 'string' },
                      statusToken: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        '400': errorResponse,
      },
    },
  },
  '/donations/verify': {
    post: {
      tags: ['Payments'],
      summary: 'Verify Razorpay Checkout signature and complete the donation (public)',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['donationId', 'razorpayOrderId', 'razorpayPaymentId', 'razorpaySignature'],
              properties: {
                donationId: { type: 'string', format: 'uuid' },
                razorpayOrderId: { type: 'string' },
                razorpayPaymentId: { type: 'string' },
                razorpaySignature: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Payment verified and donation completed' },
        '400': errorResponse,
        '409': {
          ...errorResponse,
          description: 'Payment already recorded against another donation',
        },
      },
    },
  },
  '/donations/{id}/retry': {
    post: {
      tags: ['Payments'],
      summary: 'Reopen a failed/pending donation for another payment attempt (public)',
      security: [],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        '200': { description: 'Checkout session to reopen' },
        '404': errorResponse,
        '409': errorResponse,
      },
    },
  },
  '/donations/{id}/status': {
    get: {
      tags: ['Payments'],
      summary: "Poll a donation's payment status (public, token-scoped)",
      security: [],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'token', in: 'query', required: true, schema: { type: 'string' } },
      ],
      responses: { '200': { description: 'Status' }, '401': errorResponse, '404': errorResponse },
    },
  },
  '/donations/{id}/receipt': {
    get: {
      tags: ['Payments'],
      summary: 'Download a donation receipt (token, donor session, or admin)',
      security: [],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'token', in: 'query', required: false, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Receipt PDF URL' },
        '401': errorResponse,
        '404': errorResponse,
      },
    },
  },
  '/webhooks/razorpay': {
    post: {
      tags: ['Webhooks'],
      summary:
        'Razorpay payment webhook receiver (HMAC signature-verified, not user-authenticated)',
      security: [],
      parameters: [
        {
          name: 'X-Razorpay-Signature',
          in: 'header',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        '200': { description: 'Acknowledged' },
        '400': errorResponse,
        '401': errorResponse,
      },
    },
  },
  '/donor-auth/request-otp': {
    post: {
      tags: ['Donor Auth'],
      summary: 'Request a one-time login code for donation history (public, anti-enumeration)',
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
      responses: { '200': { description: 'Code sent if the email has a donation history' } },
    },
  },
  '/donor-auth/verify-otp': {
    post: {
      tags: ['Donor Auth'],
      summary: 'Verify the one-time code and start a donor session (public)',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'otp'],
              properties: {
                email: { type: 'string', format: 'email' },
                otp: { type: 'string', minLength: 6, maxLength: 6 },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Donor session cookie set' },
        '400': errorResponse,
        '429': errorResponse,
      },
    },
  },
  '/donor-auth/logout': {
    post: {
      tags: ['Donor Auth'],
      summary: 'Clear the donor session cookie',
      security: [],
      responses: { '200': { description: 'Logged out' } },
    },
  },
  '/donors/me/donations': {
    get: {
      tags: ['Donor Auth'],
      summary: "The logged-in donor's own donation history (FR-DON-07)",
      security: [],
      description: 'Authenticated via the `sysa_donor_token` cookie set by /donor-auth/verify-otp.',
      responses: { '200': { description: 'Paginated donation history' }, '401': errorResponse },
    },
  },
};

export const openApiDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Sai Yadadri Seva Ashram Platform API',
    version: '0.2.0',
    description:
      'Core application framework (Phase 4: auth, RBAC, profile) plus all Phase 5 business modules — ' +
      'Content Management System, Donations, Volunteers, Events, News, Gallery, and Documents. ' +
      'Endpoints under `/public` on a given resource require no authentication and back the public website; ' +
      'all other endpoints require a session cookie and the listed permission code — ' +
      'see documentation/13-API-Requirements.md and documentation/10-Roles-and-Permissions.md.',
  },
  servers: [{ url: `${env.API_URL}/api/v1`, description: 'Current environment' }],
  tags: [
    { name: 'Health', description: 'Liveness/readiness' },
    { name: 'Auth', description: 'Authentication, sessions, password & email verification' },
    { name: 'Users', description: 'Admin user management (Super Admin / users:* permissions)' },
    { name: 'Roles', description: 'Configurable RBAC roles' },
    { name: 'Permissions', description: 'Read-only permission catalogue' },
    { name: 'Profile', description: "The authenticated caller's own profile" },
    {
      name: 'Site Settings',
      description: 'Singleton site-wide settings (contact info, SEO defaults)',
    },
    { name: 'Page Content', description: 'Home / About / Contact page content blocks' },
    { name: 'Hero Banners', description: 'Homepage hero carousel banners' },
    { name: 'Testimonials', description: 'Donor/volunteer testimonials' },
    { name: 'Social Links', description: 'Footer/header social media links' },
    { name: 'Navigation', description: 'Header/footer navigation menu items' },
    { name: 'Activities', description: 'Ashram programs/activities & services' },
    { name: 'Committee', description: 'Managing committee members' },
    {
      name: 'Donation Categories',
      description: 'Fixed donation categories (e.g. Annadanam, Education)',
    },
    { name: 'Appeals', description: 'Fundraising campaigns/appeals with progress tracking' },
    { name: 'Donations', description: 'Donation records, manual entry, status, analytics, export' },
    {
      name: 'Bank Transfers',
      description: 'Public bank-transfer claim submission + admin verification',
    },
    { name: 'Volunteers', description: 'Volunteer registration, applications, approval' },
    { name: 'Volunteer Assignments', description: 'Task assignments for approved volunteers' },
    { name: 'Event Categories', description: 'Categories used to classify events' },
    { name: 'Events', description: 'Events, publishing, capacity' },
    {
      name: 'Event Registrations',
      description: 'Public event registration, check-in, cancellation',
    },
    { name: 'News', description: 'News/blog posts (EventNewsPost type=news)' },
    { name: 'Gallery', description: 'Photo/video albums (Cloudinary-backed)' },
    {
      name: 'Documents',
      description: '12A/80G/PAN/registration/annual/audit documents + download centre',
    },
    {
      name: 'Media',
      description: 'Generic image-hosting utility for CMS fields that store a plain URL',
    },
    {
      name: 'Public Content',
      description:
        'Public read-only endpoints for Hero Banners, Testimonials, Activities, Committee, Social Links, and Navigation (Phase 6)',
    },
    { name: 'Contact', description: 'Public contact form + newsletter signup (Phase 6)' },
    {
      name: 'Payments',
      description:
        'Razorpay order creation, signature verification, retry, status, receipt (Phase 7)',
    },
    { name: 'Webhooks', description: 'Inbound Razorpay payment webhook (Phase 7)' },
    {
      name: 'Donor Auth',
      description: 'Lightweight OTP login for viewing donation history (Phase 7, FR-DON-07)',
    },
  ],
  components: {
    securitySchemes: { cookieAuth, bearerAuth },
    schemas: { User: userSchema, Role: roleSchema, Session: sessionSchema },
    responses: { Error: errorResponse },
  },
  security: [{ cookieAuth: [] }],
  paths: {
    ...phase5Paths,
    ...phase6Paths,
    ...phase7Paths,
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
