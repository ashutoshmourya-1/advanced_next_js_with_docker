import request from "supertest";
import app from "../app.js";
import { pool } from "../config/database.js";


jest.mock("../config/database.js", () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mocked_pool_query = pool.query as jest.Mock;

// ASSUMPTION: adjust this to match your actual `user_schema` shape in
// src/type/index.ts if it differs (e.g. different field names/types).
const db_user_row = {
  id: 1,
  name: "Aman Verma",
  email: "aman@test.com",
  phone_number: "9876543210",
  next_advance: false,
  next_basic: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /user", () => {
  it("returns 200 with the list of users on success", async () => {
    mocked_pool_query.mockResolvedValue({ rows: [db_user_row] });

    const response = await request(app).get("/user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      data: [db_user_row],
    });
    expect(mocked_pool_query).toHaveBeenCalledTimes(1);
  });

  it("returns an empty array when there are no users", async () => {
    mocked_pool_query.mockResolvedValue({ rows: [] });

    const response = await request(app).get("/user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, data: [] });
  });

  it("returns 500 when a row fails schema validation", async () => {
    mocked_pool_query.mockResolvedValue({
      // missing required fields on purpose
      rows: [{ id: 1, name: "Aman" }],
    });

    const response = await request(app).get("/user");

    expect(response.status).toBe(500);
    expect(response.body.ok).toBe(false);
    expect(response.body.error.message).toContain("Error while parsing");
  });

  it("returns 500 when the database query throws", async () => {
    mocked_pool_query.mockRejectedValue(new Error("Connection refused"));

    const response = await request(app).get("/user");

    expect(response.status).toBe(500);
    expect(response.body.ok).toBe(false);
    expect(response.body.error.message).toContain("Failed to fetch users");
  });
});

describe("POST /user", () => {
  const new_user_payload = {
    name: "Priya Singh",
    email: "priya@test.com",
    phone_number: "9876543211",
    next_advance: true,
    next_basic: false,
  };

  it("returns 201 with the created user on success", async () => {
    mocked_pool_query.mockResolvedValue({
      rows: [
        {
          id: 2,
          ...new_user_payload,
        },
      ],
    });

    const response = await request(app).post("/user").send(new_user_payload);

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toMatchObject(new_user_payload);

    expect(mocked_pool_query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO users"),
      [
        new_user_payload.name,
        new_user_payload.email,
        new_user_payload.phone_number,
        new_user_payload.next_advance,
        new_user_payload.next_basic,
      ],
    );
  });

  it("returns 500 when the inserted row fails schema validation", async () => {
    mocked_pool_query.mockResolvedValue({
      rows: [{ id: 2, name: "Priya" }],
    });

    const response = await request(app).post("/user").send(new_user_payload);

    expect(response.status).toBe(500);
    expect(response.body.ok).toBe(false);
  });

  it("returns 500 when the database insert throws", async () => {
    mocked_pool_query.mockRejectedValue(new Error("Duplicate email"));

    const response = await request(app).post("/user").send(new_user_payload);

    expect(response.status).toBe(500);
    expect(response.body.error.message).toContain("Failed to create user");
  });
});

describe("PATCH /user/:id", () => {
  const update_payload = {
    name: "Aman Verma Updated",
    email: "aman.updated@test.com",
    phone_number: "9999999999",
    next_advance: true,
    next_basic: true,
  };

  it("returns 200 with the updated user on success", async () => {
    mocked_pool_query.mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          id: 1,
          ...update_payload,
        },
      ],
    });

    const response = await request(app).patch("/user/1").send(update_payload);

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toMatchObject(update_payload);

    expect(mocked_pool_query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE users"),
      [
        update_payload.email,
        update_payload.name,
        update_payload.next_advance,
        update_payload.next_basic,
        update_payload.phone_number,
        "1",
      ],
    );
  });

  it("returns 404 when no row matches the id", async () => {
    mocked_pool_query.mockResolvedValue({ rowCount: 0, rows: [] });

    const response = await request(app).patch("/user/999").send(update_payload);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      ok: false,
      error: { message: "User not found" },
    });
  });

  it("returns 500 when the updated row fails schema validation", async () => {
    mocked_pool_query.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 1, name: "Aman" }],
    });

    const response = await request(app).patch("/user/1").send(update_payload);

    expect(response.status).toBe(500);
    expect(response.body.ok).toBe(false);
  });

  it("returns 500 when the database update throws", async () => {
    mocked_pool_query.mockRejectedValue(new Error("Connection lost"));

    const response = await request(app).patch("/user/1").send(update_payload);

    expect(response.status).toBe(500);
    expect(response.body.error.message).toContain("Failed to update user");
  });
});

describe("DELETE /user/:id", () => {
  it("returns 200 when the user is deleted", async () => {
    mocked_pool_query.mockResolvedValue({ rowCount: 1, rows: [] });

    const response = await request(app).delete("/user/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("returns 404 when no row matches the id", async () => {
    mocked_pool_query.mockResolvedValue({ rowCount: 0, rows: [] });

    const response = await request(app).delete("/user/999");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      ok: false,
      error: { message: "User not found" },
    });
  });

  it("returns 500 when the database delete throws", async () => {
    mocked_pool_query.mockRejectedValue(new Error("Connection lost"));

    const response = await request(app).delete("/user/1");

    expect(response.status).toBe(500);
    expect(response.body.error.message).toContain("Failed to delete user");
  });
});
