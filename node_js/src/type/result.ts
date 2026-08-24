import { z } from "zod";

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { message: string } };

export const api_response_schema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z
    .object({
      message: z.string(),
    })
    .optional(),
});

export type ApiResponse = z.infer<typeof api_response_schema>;