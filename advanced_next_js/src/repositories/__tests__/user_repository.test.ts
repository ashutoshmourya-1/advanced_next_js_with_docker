import UserRepository from "../user_repository";
import { api_client } from "@lib/axios-client";

jest.mock("@lib/axios-client", () => ({
  api_client: {
    query: jest.fn(),
    post: jest.fn(),
  },
}));

describe("UserRepository", () => {
  let repository: UserRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    repository = new UserRepository();
  });

  describe("insert_user_details", () => {
    const user = {
      id:1,
      name: "Ashutosh",
      email: "ashutosh@example.com",
      phone_number: "9876543210",
      next_basic: true,
      next_advance: false,
    };

    it("should insert user successfully", async () => {
      (api_client.post as jest.Mock).mockResolvedValue({
        data: {
          ok: true,
          data: user,
        },
      });

      const result = await repository.insert_user_details(user);

      expect(api_client.post).toHaveBeenCalledTimes(1);
      expect(api_client.post).toHaveBeenCalledWith("/user", user);

      expect(result).toEqual({
        ok: true,
        data: user,
      });
    });

    it("should return error when API response is invalid", async () => {
      (api_client.post as jest.Mock).mockResolvedValue({
        data: {
          invalid: "response",
        },
      });

      const result = await repository.insert_user_details(user);

      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.error.message).toBeTruthy();
      }
    });

    it("should return API error when API returns ok false", async () => {
      (api_client.post as jest.Mock).mockResolvedValue({
        data: {
          ok: false,
          error: {
            message: "User already exists",
          },
        },
      });

      const result = await repository.insert_user_details(user);

      expect(result).toEqual({
        ok: false,
        error: {
          message: "User already exists",
        },
      });
    });

    it("should return parsing error when returned user is invalid", async () => {
      (api_client.post as jest.Mock).mockResolvedValue({
        data: {
          ok: true,
          data: {
            name: "Ashutosh",
            email: "invalid-email",
            phone_number: "9876543210",
            next_basic: true,
            next_advance: false,
          },
        },
      });

      const result = await repository.insert_user_details(user);

      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.error.message).toBeTruthy();
      }
    });
  });

  describe("get_user_details", () => {
    const users = [
      {
        id:1,
        name: "Ashutosh",
        email: "ashutosh@example.com",
        phone_number: "9876543210",
        next_basic: true,
        next_advance: false,
      },
      {
        id:2,
        name: "Rahul",
        email: "rahul@example.com",
        phone_number: "9876543211",
        next_basic: false,
        next_advance: true,
      },
    ];

    it("should get users successfully", async () => {
      (api_client.query as jest.Mock).mockResolvedValue({
        data: {
          ok: true,
          data: users,
        },
      });

      const result = await repository.get_user_details();

      expect(api_client.query).toHaveBeenCalledTimes(1);
      expect(api_client.query).toHaveBeenCalledWith("/user", undefined);

      expect(result).toEqual({
        ok: true,
        data: users,
      });
    });

    it("should pass filters to API", async () => {
      const filter = {
        name: "Ashutosh",
        
      };

      (api_client.query as jest.Mock).mockResolvedValue({
        data: {
          ok: true,
          data: users,
        },
      });

      await repository.get_user_details(filter);

      expect(api_client.query).toHaveBeenCalledWith(
        "/user",
        filter,
      );
    });

    it("should return error when API response is invalid", async () => {
      (api_client.query as jest.Mock).mockResolvedValue({
        data: {
          invalid: "response",
        },
      });

      const result = await repository.get_user_details();

      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.error.message).toBeTruthy();
      }
    });

    it("should return API error when API returns ok false", async () => {
      (api_client.query as jest.Mock).mockResolvedValue({
        data: {
          ok: false,
          error: {
            message: "Unable to fetch users",
          },
        },
      });

      const result = await repository.get_user_details();

      expect(result).toEqual({
        ok: false,
        error: {
          message: "Unable to fetch users",
        },
      });
    });

    it("should return parsing error when user array is invalid", async () => {
      (api_client.query as jest.Mock).mockResolvedValue({
        data: {
          ok: true,
          data: [
            {
              id:1,
              name: "Ashutosh",
              email: "invalid-email",
              phone_number: "9876543210",
              next_basic: true,
              next_advance: false,
            },
          ],
        },
      });

      const result = await repository.get_user_details();

      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.error.message).toBeTruthy();
      }
    });
  });
});