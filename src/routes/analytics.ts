import { Router } from "express";
import { getAnalytics, addMockDataPoint } from "../controllers/analytics.ts";
import { requireAuth } from "../middleware/auth.ts";

const router = Router();

// Retrieve scoped analytics records
router.get("/", requireAuth, getAnalytics);

// Add a mock data point for live visualization simulations
router.post("/mock", requireAuth, addMockDataPoint);

export default router;
