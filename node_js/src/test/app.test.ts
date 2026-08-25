import request from "supertest";
import app from "../app.js";
import { pool } from "../config/database.js";

jest.mock("../config/database.js", () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mocked_pool_query = pool.query as jest.Mock;

describe("GET /", () => {
  it("returns a greeting", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toBe("Hello from express server");
  });
});

describe("GET /health", () => {
  it("returns 200 healthy when the database responds", async () => {
    mocked_pool_query.mockResolvedValue({ rows: [{ "?column?": 1 }] });

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "healthy",
      database: "connected",
    });
  });

  it("returns 503 unhealthy when the database throws", async () => {
    mocked_pool_query.mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await request(app).get("/health");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: "unhealthy",
      database: "disconnected",
    });
  });
});