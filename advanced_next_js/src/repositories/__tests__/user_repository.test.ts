import UserRepository from "../user_repository";
import { api_client } from "@lib/axios-client";
import type { User } from "@type/index";

jest.mock("@lib/axios-client", () => ({
  api_client: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mocked_get = api_client.get as jest.Mock;
const mocked_post = api_client.post as jest.Mock;
const mocked_patch = api_client.patch as jest.Mock;
const mocked_delete = api_client.delete as jest.Mock;

describe("UserRepository", () => {
  let repository: UserRepository;

  const user: User = {
    id: 1,
    name: "Ashutosh",
    email: "ashutosh@example.com",
    phone_number: "9876543210",
    next_basic: true,
    next_advance: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new UserRepository();
  });

  describe("get_user_details", () => {
    it("should get users successfully", async () => {
      mocked_get.mockResolvedValue({
        data: { ok: true, data: [user] },
      });

      const result = await repository.get_user_details();

      expect(mocked_get).toHaveBeenCalledWith("/user");
      expect(result).toEqual({ ok: true, data: [user] });
    });

    it("should return error when the response envelope fails schema validation", async () => {
      mocked_get.mockResolvedValue({
        data: { invalid: "response" },
      });

      const result = await repository.get_user_details();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBeTruthy();
      }
    });

    it("should return API error when API returns ok:false", async () => {
      mocked_get.mockResolvedValue({
        data: { ok: false, error: { message: "Unable to fetch users" } },
      });

      const result = await repository.get_user_details();

      expect(result).toEqual({
        ok: false,
        error: { message: "Unable to fetch users" },
      });
    });

    it("should return a parsing error when a user in the array is invalid", async () => {
      mocked_get.mockResolvedValue({
        data: {
          ok: true,
          data: [{ ...user, email: "invalid-email" }],
        },
      });

      const result = await repository.get_user_details();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBeTruthy();
      }
    });
  });

  describe("insert_user_details", () => {
    it("should insert a user successfully", async () => {
      mocked_post.mockResolvedValue({
        data: { ok: true, data: user },
      });

      const result = await repository.insert_user_details(user);

      expect(mocked_post).toHaveBeenCalledWith("/user", user);
      expect(result).toEqual({ ok: true, data: user });
    });

    it("should return API error when insert fails", async () => {
      mocked_post.mockResolvedValue({
        data: { ok: false, error: { message: "Duplicate email" } },
      });

      const result = await repository.insert_user_details(user);

      expect(result).toEqual({
        ok: false,
        error: { message: "Duplicate email" },
      });
    });

    it("should return a parsing error when the inserted user is invalid", async () => {
      mocked_post.mockResolvedValue({
        data: { ok: true, data: { ...user, email: "invalid-email" } },
      });

      const result = await repository.insert_user_details(user);

      expect(result.ok).toBe(false);
    });
  });

  describe("update_user_details", () => {
    it("should update a user successfully", async () => {
      mocked_patch.mockResolvedValue({
        data: { ok: true, data: user },
      });

      const result = await repository.update_user_details(user);

      expect(mocked_patch).toHaveBeenCalledWith(`/user/${user.id}`, user);
      expect(result).toEqual({ ok: true, data: user });
    });

    it("should return API error when update fails", async () => {
      mocked_patch.mockResolvedValue({
        data: { ok: false, error: { message: "User not found" } },
      });

      const result = await repository.update_user_details(user);

      expect(result).toEqual({
        ok: false,
        error: { message: "User not found" },
      });
    });
  });

  describe("delete_user_details", () => {
    it("should delete a user successfully", async () => {
      mocked_delete.mockResolvedValue({
        data: { ok: true },
      });

      const result = await repository.delete_user_details(user);

      expect(mocked_delete).toHaveBeenCalledWith(`/user/${user.id}`);
      expect(result).toEqual({ ok: true, data: undefined });
    });

    it("should return API error when delete fails", async () => {
      mocked_delete.mockResolvedValue({
        data: { ok: false, error: { message: "User not found" } },
      });

      const result = await repository.delete_user_details(user);

      expect(result).toEqual({
        ok: false,
        error: { message: "User not found" },
      });
    });
  });
});