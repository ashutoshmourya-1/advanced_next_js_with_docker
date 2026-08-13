import { api_client } from "@lib/axios-client";
import {
  type User,
  type Result,
  user_schema,
  api_response_schema,
} from "@type/index";
import z from "zod";

export default class UserRepository {
  public async get_user_details(args?: User): Promise<Result<User[]>> {
    const res = await api_client.query("/user", args);

    const parsed_response = api_response_schema.safeParse(res.data);

    if (!parsed_response.success) {
      return {
        ok: false,
        error: {
          message: parsed_response.error.issues
            .map((e) => e.message)
            .join(", "),
        },
      };
    }

    if (!parsed_response.data?.ok) {
      return {
        ok: false,
        error: {
          message: parsed_response.data.error?.message ?? "Parsing failed",
        },
      };
    }

    const parsed_data = z
      .array(user_schema)
      .safeParse(parsed_response.data.data);

    if (!parsed_data.success) {
      return {
        ok: false,
        error: {
          message: parsed_data.error.issues.map((e) => e.message).join(" ,"),
        },
      };
    }

    return { ok: true, data: parsed_data.data };
  }

  public async insert_user_details(args: User): Promise<Result<User>> {
    const res = await api_client.post("/user", args);

    const parsed_response = api_response_schema.safeParse(res.data);

    if (!parsed_response.success) {
      return {
        ok: false,
        error: {
          message: parsed_response.error.issues
            .map((e) => e.message)
            .join(", "),
        },
      };
    }

    if (!parsed_response.data?.ok) {
      return {
        ok: false,
        error: {
          message: parsed_response.data.error?.message ?? "Parsing failed",
        },
      };
    }

    const parsed_data = user_schema.safeParse(parsed_response.data.data);

    if (!parsed_data.success) {
      return {
        ok: false,
        error: {
          message: parsed_data.error.issues.map((e) => e.message).join(" ,"),
        },
      };
    }

    return { ok: true, data: parsed_data.data };
  }
}
