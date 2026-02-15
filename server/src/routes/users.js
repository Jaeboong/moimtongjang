import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth.js";
import { createUser, listUsers, updateMonthlyFee } from "../controllers/userController.js";

const router = Router();

router.get("/", authRequired, listUsers);
router.post("/", authRequired, requireRole("admin"), createUser);
router.patch("/:id/monthly-fee", authRequired, requireRole("admin"), updateMonthlyFee);

export default router;
