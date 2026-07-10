import { Router } from "express";
import { createCheckoutSession, stripeWebhook, simulateUpgrade, simulateDowngrade } from "../controllers/stripe.ts";
import { requireAuth } from "../middleware/auth.ts";

const router = Router();

// Create Stripe Checkout Session
router.post("/create-checkout-session", requireAuth, createCheckoutSession);

// Stripe Webhook Endpoint (does NOT require user auth as it is called by Stripe servers)
router.post("/webhook", stripeWebhook);

// Dev simulation routes to easily test Pro / Free states without Stripe setup
router.post("/simulate-upgrade", requireAuth, simulateUpgrade);
router.post("/simulate-downgrade", requireAuth, simulateDowngrade);

export default router;
