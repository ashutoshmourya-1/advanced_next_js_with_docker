import z from "zod";

export const user_schema = z.object({
  name: z.string(),
  email: z.email(),
  phone_number: z.string(),
  next_basic: z.boolean(),
  next_advance: z.boolean(),
});

export type User = z.infer<typeof user_schema>