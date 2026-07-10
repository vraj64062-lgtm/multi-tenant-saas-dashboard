import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.ts";
import { AuthenticatedUser } from "../middleware/auth.ts";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_development_jwt_saas";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// Generate short-lived JWT Access Token
const generateAccessToken = (user: { id: string; email: string; role: string; organizationId: string }) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

// Generate and save long-lived Refresh Token
const generateAndSaveRefreshToken = async (userId: string) => {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` });
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
};

// Set refresh token cookie helper
const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000, // 7 days in ms
  });
};

/**
 * SIGNUP CONTROLLER
 */
export const signup = async (req: Request, res: Response) => {
  const { email, password, name, orgName, inviteToken } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "Missing required fields: email, password, name" });
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let organizationId = "";
    let role = "ADMIN"; // Default to admin for new org creation

    // If signing up via an invite
    if (inviteToken) {
      const invite = await prisma.invite.findUnique({
        where: { token: inviteToken },
        include: { organization: true },
      });

      if (!invite) {
        return res.status(400).json({ error: "Invalid invite token" });
      }

      if (invite.accepted) {
        return res.status(400).json({ error: "This invite has already been accepted" });
      }

      if (invite.expiresAt < new Date()) {
        return res.status(400).json({ error: "This invite link has expired" });
      }

      // Enforce that they must sign up with the invited email
      if (invite.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({ error: `This invite was sent to ${invite.email}` });
      }

      organizationId = invite.organizationId;
      role = invite.role;

      // Create user and mark invite as accepted in a transaction
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: email.toLowerCase(),
            passwordHash,
            name,
            role,
            organizationId,
          },
        });

        await tx.invite.update({
          where: { id: invite.id },
          data: { accepted: true },
        });

        return newUser;
      });

      const accessToken = generateAccessToken(user);
      const refreshToken = await generateAndSaveRefreshToken(user.id);
      setRefreshTokenCookie(res, refreshToken);

      return res.status(201).json({
        message: "Successfully signed up and joined organization",
        accessToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId },
      });
    } else {
      // Normal signup: must specify organization name
      if (!orgName) {
        return res.status(400).json({ error: "Organization name is required to create a new tenant" });
      }

      // Create new Organization and Admin User in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: { name: orgName },
        });

        const user = await tx.user.create({
          data: {
            email: email.toLowerCase(),
            passwordHash,
            name,
            role: "ADMIN",
            organizationId: org.id,
          },
        });

        // Seed some initial mock analytics data for the new organization
        const today = new Date();
        const records = [];
        for (let i = 14; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          records.push({
            organizationId: org.id,
            date,
            activeUsers: Math.floor(Math.random() * 50) + 10 + (14 - i) * 5,
            revenue: parseFloat((Math.random() * 200 + 50 + (14 - i) * 20).toFixed(2)),
            pageViews: Math.floor(Math.random() * 300) + 100 + (14 - i) * 15,
            signups: Math.floor(Math.random() * 5) + (i % 3 === 0 ? 2 : 0),
          });
        }

        await tx.analyticsRecord.createMany({
          data: records,
        });

        return { user, org };
      });

      const accessToken = generateAccessToken(result.user);
      const refreshToken = await generateAndSaveRefreshToken(result.user.id);
      setRefreshTokenCookie(res, refreshToken);

      return res.status(201).json({
        message: "Organization created and account setup complete",
        accessToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          organizationId: result.user.organizationId,
        },
      });
    }
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Internal server error during registration" });
  }
};

/**
 * LOGIN CONTROLLER
 */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { organization: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateAndSaveRefreshToken(user.id);
    setRefreshTokenCookie(res, refreshToken);

    return res.json({
      message: "Successfully logged in",
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        orgName: user.organization.name,
        plan: user.organization.plan,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error during login" });
  }
};

/**
 * LOGOUT CONTROLLER
 */
export const logout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;

  try {
    if (refreshToken) {
      // Delete token from DB
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    // Clear client-side cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.json({ message: "Successfully logged out" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Internal server error during logout" });
  }
};

/**
 * REFRESH TOKEN ROTATION CONTROLLER
 */
export const refreshToken = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No refresh token provided" });
  }

  try {
    // Look up refresh token in DB
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!storedToken) {
      return res.status(401).json({ error: "Unauthorized: Invalid refresh token" });
    }

    if (storedToken.expiresAt < new Date()) {
      // Expired - clean it up
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      return res.status(401).json({ error: "Unauthorized: Refresh token expired" });
    }

    // Delete old token (rotation) and create a new one
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const user = storedToken.user;
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = await generateAndSaveRefreshToken(user.id);
    setRefreshTokenCookie(res, newRefreshToken);

    return res.json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(500).json({ error: "Internal server error during token refresh" });
  }
};

/**
 * GET CURRENT PROFILE CONTROLLER
 */
export const me = async (req: Request & { user?: AuthenticatedUser }, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized: No authenticated user session" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        organization: {
          select: {
            name: true,
            plan: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        orgName: user.organization.name,
        plan: user.organization.plan,
      },
    });
  } catch (error) {
    console.error("Fetch profile error:", error);
    return res.status(500).json({ error: "Internal server error fetching profile" });
  }
};

/**
 * GET INVITE DETAILS CONTROLLER
 */
export const getInviteDetails = async (req: Request, res: Response) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ error: "Missing invitation token" });
  }

  try {
    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!invite) {
      return res.status(404).json({ error: "Invitation not found or invalid" });
    }

    if (invite.accepted) {
      return res.status(400).json({ error: "This invitation has already been accepted" });
    }

    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ error: "This invitation has expired" });
    }

    return res.json({
      invite: {
        email: invite.email,
        role: invite.role,
        orgName: invite.organization.name,
      },
    });
  } catch (error) {
    console.error("Get invite details error:", error);
    return res.status(500).json({ error: "Internal server error fetching invitation details" });
  }
};

