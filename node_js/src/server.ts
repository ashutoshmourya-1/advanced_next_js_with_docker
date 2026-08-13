import express from "express";
import { configDotenv } from "dotenv";
import cors from "cors";
import { pool } from "./config/database.js";
import user_router from "./routers/user.route.js";

const app = express();

configDotenv();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_, res) => {
  res.send("Hello from express server");
});

app.get("/health", async (_, res) => {
  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      status: "healthy",
      database: "connected",
    });
  } catch {
    res.status(503).json({
      status: "unhealthy",
      database: "disconnected",
    });
  }
});

app.use("/user", user_router);

const server_start = (): void => {
  app.listen(process.env.PORT, () => {
    console.log(`Server is running on port: ${process.env.PORT}`);
  });
};

server_start();