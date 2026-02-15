import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { changePassword, login, me } from "../controllers/authController.js";

const router = Router();

router.post("/login", login);
router.get("/me", authRequired, me);
router.post("/change-password", authRequired, changePassword);

export default router;
