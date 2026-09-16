import { rateLimit } from "express-rate-limit";

export const insert_update_limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 3,
  message: { ok: false, error: { message: "Insert/Update rate limit reached" } },
});

export const delete_limiter = rateLimit({
  limit: 1,
  windowMs: 60 * 1000,
  message: { ok: false, error: { message: "Delete rate limit reached" } },
});

export const fetch_limiter = rateLimit({
  limit: 10,
  windowMs: 60 * 1000,
  message: { ok: false, error: { message: "Fetch rate limit reached" } },
});