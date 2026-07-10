import { Request, Response } from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma.ts";
import { AuthRequest } from "../middleware/auth.ts";

let stripeClient: Stripe | null = null;

/**
 * Lazy initializer for Stripe Client.
 * Prevents app crashes at module loading time if keys are not present.
 */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return null;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2023-10-16" as any,
    });
  }
  return stripeClient;
}

/**
 * Create a Stripe Checkout Session for upgrading to Pro.
 */
export const createCheckoutSession = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { organizationId, email } = req.user;
  const stripe = getStripe();

  // Handle case where Stripe is not yet configured by the user
  if (!stripe) {
    return res.status(400).json({
      error: "Stripe is not configured on this instance.",
      isUnconfigured: true,
      message: "Please define STRIPE_SECRET_KEY and STRIPE_PRICE_ID in your environment variables to test real Stripe Checkout. Click 'Simulate Pro Upgrade' below to bypass this for testing.",
    });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return res.status(400).json({
      error: "Stripe Price ID is missing in environment variables.",
      isUnconfigured: true,
      message: "Please define STRIPE_PRICE_ID in your environment variables.",
    });
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const appUrl = process.env.APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer_email: email,
      client_reference_id: organizationId, // Link this Checkout Session to the org
      success_url: `${appUrl}/admin?session_id={CHECKOUT_SESSION_ID}&upgrade=success`,
      cancel_url: `${appUrl}/admin?upgrade=cancel`,
    });

    return res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout error:", error);
    return res.status(500).json({ error: "Internal error creating Stripe session: " + error.message });
  }
};

/**
 * Webhook endpoint for Stripe events.
 * Handles checkout.session.completed and customer.subscription.deleted.
 * Supports both verified signature mode (production) and direct payload mode (for local testing if secret missing).
 */
export const stripeWebhook = async (req: Request, res: Response) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(400).json({ error: "Stripe is unconfigured" });
  }

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && sig) {
      // Real verified signature check
      const rawBody = (req as any).rawBody || req.body;
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      // Fallback for development if webhook secret is not set yet
      console.warn("STRIPE_WEBHOOK_SECRET is missing. Proceeding with unverified webhook payload for development testing.");
      event = req.body;
    }
  } catch (err: any) {
    console.error(`Webhook Signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId = session.client_reference_id;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (organizationId) {
          // Update organization plan to PRO in database
          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              plan: "PRO",
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
            },
          });
          console.log(`Organization ${organizationId} successfully upgraded to PRO via Stripe Checkout.`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const org = await prisma.organization.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (org) {
          await prisma.organization.update({
            where: { id: org.id },
            data: {
              plan: "FREE",
              stripeSubscriptionId: null,
            },
          });
          console.log(`Organization ${org.id} downgraded to FREE due to subscription cancellation.`);
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ error: "Internal server error processing webhook" });
  }
};

/**
 * DEV-ONLY: Simulate Pro Upgrade helper
 * Allows users to test PRO dashboard and PRO features without active Stripe credentials.
 */
export const simulateUpgrade = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { organizationId } = req.user;

  try {
    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        plan: "PRO",
      },
    });

    return res.json({
      message: "Simulation successful: organization upgraded to PRO!",
      org: updatedOrg,
    });
  } catch (error) {
    console.error("Simulation upgrade error:", error);
    return res.status(500).json({ error: "Failed to simulate upgrade" });
  }
};

/**
 * DEV-ONLY: Simulate Pro Downgrade helper
 */
export const simulateDowngrade = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { organizationId } = req.user;

  try {
    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        plan: "FREE",
        stripeSubscriptionId: null,
      },
    });

    return res.json({
      message: "Simulation successful: organization downgraded to FREE!",
      org: updatedOrg,
    });
  } catch (error) {
    console.error("Simulation downgrade error:", error);
    return res.status(500).json({ error: "Failed to simulate downgrade" });
  }
};
