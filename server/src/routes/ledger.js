import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth.js";
import {
  adminDeposit,
  createAdjustment,
  createWithdrawal,
  decideDeposit,
  deleteEntry,
  forcePaid,
  forceUnpaid,
  forceZeroPaid,
  getBalance,
  getSummary,
  getTransactions,
  requestDeposit,
  updateEntry,
} from "../controllers/ledgerController.js";

const router = Router();

router.get("/summary", authRequired, getSummary);
router.get("/transactions", authRequired, getTransactions);
router.get("/balance", authRequired, getBalance);

router.post("/deposits/request", authRequired, requestDeposit);
router.post("/deposits/admin", authRequired, requireRole("admin"), adminDeposit);
router.post("/deposits/force-paid", authRequired, requireRole("admin"), forcePaid);
router.post("/deposits/force-unpaid", authRequired, requireRole("admin"), forceUnpaid);
router.post("/deposits/force-zero-paid", authRequired, requireRole("admin"), forceZeroPaid);
router.patch("/deposits/:id/decision", authRequired, requireRole("admin"), decideDeposit);

router.patch("/entries/:id", authRequired, requireRole("admin"), updateEntry);
router.delete("/entries/:id", authRequired, requireRole("admin"), deleteEntry);

router.post("/withdrawals", authRequired, requireRole("admin"), createWithdrawal);
router.post("/adjustments", authRequired, requireRole("admin"), createAdjustment);

export default router;
