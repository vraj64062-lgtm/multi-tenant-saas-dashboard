import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import authRoutes from "./src/routes/auth.ts";
import analyticsRoutes from "./src/routes/analytics.ts";
import adminRoutes from "./src/routes/admin.ts";
import stripeRoutes from "./src/routes/stripe.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe webhook signature verification requires the raw request body.
  // We capture the raw body specifically for the stripe webhook endpoint.
  app.use(
    express.json({
      verify: (req: any, res, buf) => {
        if (req.originalUrl && req.originalUrl.includes("/webhook")) {
          req.rawBody = buf;
        }
      },
    })
  );

  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/stripe", stripeRoutes);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date() });
  });

  // Serve Frontend with Vite Middleware in Dev or Static files in Prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production assets from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Unified SaaS server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start unified SaaS server:", error);
});
