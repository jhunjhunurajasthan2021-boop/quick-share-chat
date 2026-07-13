import { z } from 'zod';
import { insertFileSchema, insertMessageSchema, files, messages } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  files: {
    create: {
      method: 'POST' as const,
      path: '/api/files',
      input: insertFileSchema,
      responses: {
        201: z.custom<typeof files.$inferSelect>(), // Returns the created file record
        400: errorSchemas.validation,
      },
    },
    getByPublicId: {
      method: 'GET' as const,
      path: '/api/files/:publicId',
      responses: {
        200: z.custom<typeof files.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  messages: {
    list: {
      method: 'GET' as const,
      path: '/api/files/:fileId/messages',
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect>()),
        404: errorSchemas.notFound,
      },
    },
    // Note: Creating messages is usually done via Socket.io, but we can have an HTTP fallback or history sync
  },
};

// ============================================
// HELPER
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// ============================================
// TYPES
// ============================================
export type FileInput = z.infer<typeof api.files.create.input>;
export type FileResponse = z.infer<typeof api.files.create.responses[201]>;
