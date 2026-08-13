import { Router } from "express";
import UserController from "../controllers/user.controller.js";

const router = Router();

const user_controller = new UserController();

router.query?.("/", user_controller.get_users.bind(user_controller));
router.post("/", user_controller.insert_user.bind(user_controller));

export default router;
