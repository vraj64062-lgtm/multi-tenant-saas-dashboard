import { Response } from "express";
import { prisma } from "../lib/prisma.ts";
import { AuthRequest } from "../middleware/auth.ts";

/**
 * Fetch analytics data scoped entirely to the logged-in user's organization.
 */
export const getAnalytics = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized: Missing session details" });
  }

  const { organizationId } = req.user;

  try {
    // Strict Tenant Isolation Check:
    // We explicitly query analytics records matching ONLY the user's organizationId.
    // This is verified cryptographically via the JWT token.
    const records = await prisma.analyticsRecord.findMany({
      where: {
        organizationId: organizationId,
      },
      orderBy: {
        date: "asc",
      },
    });

    // If records don't exist for some reason, let's seed or return empty list
    if (records.length === 0) {
      // Return empty or seed some on the fly
      return res.json({
        summary: {
          totalRevenue: 0,
          averageActiveUsers: 0,
          totalPageViews: 0,
          totalSignups: 0,
        },
        records: [],
      });
    }

    // Calculate sum statistics
    const totalRevenue = records.reduce((sum, r) => sum + r.revenue, 0);
    const averageActiveUsers = Math.round(records.reduce((sum, r) => sum + r.activeUsers, 0) / records.length);
    const totalPageViews = records.reduce((sum, r) => sum + r.pageViews, 0);
    const totalSignups = records.reduce((sum, r) => sum + r.signups, 0);

    return res.json({
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        averageActiveUsers,
        totalPageViews,
        totalSignups,
      },
      records: records.map(r => ({
        id: r.id,
        date: r.date.toISOString().split("T")[0],
        activeUsers: r.activeUsers,
        revenue: r.revenue,
        pageViews: r.pageViews,
        signups: r.signups,
      })),
    });
  } catch (error) {
    console.error("Fetch analytics error:", error);
    return res.status(500).json({ error: "Internal server error fetching analytics" });
  }
};

/**
 * Optional endpoint for admins to add randomized data to simulate real-time additions
 */
export const addMockDataPoint = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { organizationId } = req.user;

  try {
    const today = new Date();
    // Check if there's already a record for today
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    const existingRecord = await prisma.analyticsRecord.findFirst({
      where: {
        organizationId,
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    if (existingRecord) {
      // Update it by incrementing mock parameters
      const updated = await prisma.analyticsRecord.update({
        where: { id: existingRecord.id },
        data: {
          activeUsers: existingRecord.activeUsers + Math.floor(Math.random() * 5) + 1,
          revenue: existingRecord.revenue + parseFloat((Math.random() * 25).toFixed(2)),
          pageViews: existingRecord.pageViews + Math.floor(Math.random() * 30) + 10,
          signups: existingRecord.signups + (Math.random() > 0.8 ? 1 : 0),
        },
      });
      return res.json({ message: "Mock data updated for today", record: updated });
    } else {
      // Create a brand new record for today
      const created = await prisma.analyticsRecord.create({
        data: {
          organizationId,
          date: new Date(),
          activeUsers: Math.floor(Math.random() * 30) + 10,
          revenue: parseFloat((Math.random() * 100 + 20).toFixed(2)),
          pageViews: Math.floor(Math.random() * 150) + 50,
          signups: Math.floor(Math.random() * 2),
        },
      });
      return res.status(201).json({ message: "New mock data point created for today", record: created });
    }
  } catch (error) {
    console.error("Add mock data error:", error);
    return res.status(500).json({ error: "Internal server error creating mock data" });
  }
};
