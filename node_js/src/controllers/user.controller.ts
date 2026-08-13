import type { Request, Response } from "express";
import { pool } from "../config/database.js";

export default class UserController {
  public async get_users(_req: Request, res: Response): Promise<void> {
    try {
      const result = await pool.query(`
      SELECT
        id,
        name,
        email,
        phone_number,
        next_advance,
        next_basic,
        created_at
      FROM users
      ORDER BY id DESC;
    `);

      res.status(200).json({
        ok: true,
        data: result.rows,
      });
    } catch (error) {
      console.error("Failed to fetch users:", error);

      res.status(500).json({
        ok: false,
        error: {
          message: "Failed to fetch users",
        },
      });
    }
  }

  public async insert_user(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, phone_number, next_advance, next_basic } = req.body;

      const result = await pool.query(
        `
          INSERT INTO users (
            name,
            email,
            phone_number,
            next_advance,
            next_basic
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *;
        `,
        [name, email, phone_number, next_advance, next_basic],
      );

      res.status(201).json({
        ok: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Failed to insert user:", error);

      res.status(500).json({
        ok: false,
        error: {
          message: "Failed to create user",
        },
      });
    }
  }
}
