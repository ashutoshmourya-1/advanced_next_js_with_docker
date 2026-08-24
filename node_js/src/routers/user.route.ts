import { Router } from "express";
import UserController from "../controllers/user.controller.js";

const router = Router();

const user_controller = new UserController();

router.get("/", user_controller.get_users);
router.post("/", user_controller.insert_user);
router.patch("/:id",user_controller.update_user);
router.delete("/:id",user_controller.delete_user);

export default router;
