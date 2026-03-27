/**
 * Zod validation schemas for import API payloads.
 *
 * Supports up to 5,000 rows per request (vs 100 for grid auto-save).
 */

import { z } from 'zod/v4';

/** Schema for the validate request body */
export const validateRequestSchema = z.object({
  rows: z
    .array(
      z.object({
        rowIndex: z.number(),
        personName: z.string(),
        projectName: z.string(),
        month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM'),
        hours: z.number(),
        department: z.string().optional(),
        discipline: z.string().optional(),
      }),
    )
    .min(1)
    .max(5000),
});

/** Schema for the execute request body */
export const executeRequestSchema = z.object({
  rows: z
    .array(
      z.object({
        rowIndex: z.number(),
        personId: z.uuid(),
        projectId: z.uuid(),
        month: z.string().regex(/^\d{4}-\d{2}$/),
        hours: z.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(5000),
});

/** Upload response schema (for client-side validation) */
export const uploadResponseSchema = z.object({
  headers: z.array(z.string()),
  sampleRows: z.array(z.array(z.unknown())),
  totalRows: z.number(),
  formatInfo: z.object({
    isPivot: z.boolean(),
    monthColumns: z.array(z.number()),
  }),
  sheetName: z.string(),
  encodingWarning: z.string().optional(),
  suggestedMappings: z.array(
    z.object({
      sourceIndex: z.number(),
      sourceHeader: z.string(),
      targetField: z.string().nullable(),
      autoDetected: z.boolean(),
      swedish: z.boolean(),
    }),
  ),
});

export type ValidateRequestInput = z.infer<typeof validateRequestSchema>;
export type ExecuteRequestInput = z.infer<typeof executeRequestSchema>;
export type UploadResponse = z.infer<typeof uploadResponseSchema>;
