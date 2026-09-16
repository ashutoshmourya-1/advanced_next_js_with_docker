import { Router } from "express";
import UserController from "../controllers/user.controller.js";
import {
  insert_update_limiter,
  delete_limiter,
  fetch_limiter,
} from "../middlewares/ratelimiting.middleware.js";

const router = Router();

const user_controller = new UserController();

router.get("/", fetch_limiter, user_controller.get_users);
router.post("/", insert_update_limiter, user_controller.insert_user);
router.patch("/:id", insert_update_limiter, user_controller.update_user);
router.delete("/:id", delete_limiter, user_controller.delete_user);

export default router;
