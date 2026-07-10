import { Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma.ts";
import { AuthRequest } from "../middleware/auth.ts";

/**
 * List all users in the admin's organization.
 */
export const getMembers = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { organizationId } = req.user;

  try {
    // Strict Tenant Isolation: Retrieve only users in the current organization
    const members = await prisma.user.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Also get active pending invites for this org
    const pendingInvites = await prisma.invite.findMany({
      where: {
        organizationId,
        accepted: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        token: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      members,
      pendingInvites,
    });
  } catch (error) {
    console.error("Fetch members error:", error);
    return res.status(500).json({ error: "Internal server error fetching members" });
  }
};

/**
 * Invite a user by email. Creates a mock invite token.
 */
export const inviteMember = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { organizationId } = req.user;
  const { email, role } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Missing email for invitation" });
  }

  const targetRole = role === "ADMIN" ? "ADMIN" : "MEMBER";

  try {
    // Check if the user is already in the organization
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ error: "A user with this email is already registered" });
    }

    // Generate secure unique token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    // Check if a pending invite already exists for this email in this org, and delete it to recreate
    await prisma.invite.deleteMany({
      where: {
        organizationId,
        email: email.toLowerCase(),
        accepted: false,
      },
    });

    const invite = await prisma.invite.create({
      data: {
        email: email.toLowerCase(),
        role: targetRole,
        token,
        organizationId,
        expiresAt,
      },
    });

    // Build the mock invite link using APP_URL if available, otherwise fallback to standard host
    const appUrl = process.env.APP_URL || `http://localhost:3000`;
    const inviteLink = `${appUrl}/signup?invite=${token}`;

    return res.status(201).json({
      message: "Invitation generated successfully",
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        token: invite.token,
        expiresAt: invite.expiresAt,
        inviteLink,
      },
    });
  } catch (error) {
    console.error("Invite member error:", error);
    return res.status(500).json({ error: "Internal server error sending invite" });
  }
};

/**
 * Cancel a pending invitation.
 */
export const cancelInvite = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { organizationId } = req.user;
  const { inviteId } = req.params;

  try {
    // Confirm invite exists and is scoped to this organization (isolation)
    const invite = await prisma.invite.findFirst({
      where: {
        id: inviteId,
        organizationId,
      },
    });

    if (!invite) {
      return res.status(404).json({ error: "Invitation not found or belongs to another organization" });
    }

    await prisma.invite.delete({
      where: { id: inviteId },
    });

    return res.json({ message: "Invitation cancelled successfully" });
  } catch (error) {
    console.error("Cancel invite error:", error);
    return res.status(500).json({ error: "Internal server error cancelling invitation" });
  }
};

/**
 * Remove a user from the organization.
 */
export const removeMember = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { organizationId, userId: adminUserId } = req.user;
  const { memberId } = req.params;

  if (memberId === adminUserId) {
    return res.status(400).json({ error: "You cannot remove yourself from the organization" });
  }

  try {
    // Confirm member exists and is scoped to this organization (isolation)
    const member = await prisma.user.findFirst({
      where: {
        id: memberId,
        organizationId,
      },
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found or belongs to another organization" });
    }

    // In a multi-tenant environment, deleting the user or disassociating them is critical.
    // Here we hard-delete the user (this cascades to their RefreshTokens)
    await prisma.user.delete({
      where: { id: memberId },
    });

    return res.json({ message: "Member successfully removed from the organization" });
  } catch (error) {
    console.error("Remove member error:", error);
    return res.status(500).json({ error: "Internal server error removing member" });
  }
};
