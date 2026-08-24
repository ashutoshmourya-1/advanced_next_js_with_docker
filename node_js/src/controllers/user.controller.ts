import type { Request, Response } from "express";
import { pool } from "../config/database.js";
import { user_schema, type User } from "../type/index.js";
import z from "zod";

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

      const parse_data = z.array(user_schema).safeParse(result.rows);

      if (!parse_data.success) {
        res.status(500).json({
          ok: false,
          error: {
            message: `Error while parsing: ${parse_data.error.issues.map((e) => e.message).join(", ")}`,
          },
        });
        return;
      }
      res.status(200).json({
        ok: true,
        data: parse_data.data,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: {
          message: `Failed to fetch users ${error}`,
        },
      });
    }
  }

  public async insert_user(
    req: Request<Record<string, never>, unknown, User>,
    res: Response,
  ): Promise<void> {
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

      const parse_data = user_schema.safeParse(result.rows[0]);

      if (!parse_data.success) {
        res.status(500).json({
          ok: false,
          error: {
            message: `Error while parsing: ${parse_data.error.issues.map((e) => e.message).join(", ")}`,
          },
        });
        return;
      }

      res.status(201).json({
        ok: true,
        data: parse_data.data,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: {
          message: `Failed to create user ${error}`,
        },
      });
    }
  }

  public async update_user(
    req: Request<{ id: string }, unknown, User>,
    res: Response,
  ): Promise<void> {
    try {
      const { email, name, next_advance, next_basic, phone_number } = req.body;
      const { id } = req.params;

      const result = await pool.query(
        `
        UPDATE users
        SET
          email = $1,
          name = $2,
          next_advance = $3,
          next_basic = $4,
          phone_number = $5
        WHERE id = $6
        RETURNING *;
      `,
        [email, name, next_advance, next_basic, phone_number, id],
      );

      if (result.rowCount === 0) {
        res.status(404).json({
          ok: false,
          error: {
            message: "User not found",
          },
        });
        return;
      }

      const parse_data = user_schema.safeParse(result.rows[0]);

      if (!parse_data.success) {
        res.status(500).json({
          ok: false,
          error: {
            message: `Error while parsing: ${parse_data.error.issues.map((e) => e.message).join(", ")}`,
          },
        });
        return;
      }

      res.status(200).json({
        ok: true,
        data: parse_data.data,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: {
          message: `Failed to update user: ${error}`,
        },
      });
    }
  }

  public async delete_user(
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        DELETE FROM users
        WHERE id = $1
        RETURNING *;
      `,
        [id],
      );

      if (result.rowCount === 0) {
        res.status(404).json({
          ok: false,
          error: {
            message: "User not found",
          },
        });
        return;
      }

      res.status(200).json({
        ok: true,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: {
          message: `Failed to delete user: ${error}`,
        },
      });
    }
  }
}
