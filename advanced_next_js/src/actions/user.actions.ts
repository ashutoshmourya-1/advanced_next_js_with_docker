"use server";

import { UserRepository } from "@repositories/index";
import { type User, type Result } from "@type/index";

const user_repository = new UserRepository();

export async function insert_user_action(args: User): Promise<Result<User>> {
  const res = await user_repository.insert_user_details(args);

  if (!res.ok) {
    return { ok: false, error: res.error };
  }

  return { ok: true, data: res.data };
}

export async function update_user_action(args: User): Promise<Result<User>> {
  const res = await user_repository.update_user_details(args);

  if (!res.ok) {
    return { ok: false, error: res.error };
  }

  return { ok: true, data: res.data };
}

export async function delete_user_action(args: User): Promise<Result<void>> {
  const res = await user_repository.delete_user_details(args);

  if (!res.ok) {
    return { ok: false, error: res.error };
  }

  return { ok: true, data: undefined };
}
