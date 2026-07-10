import { Router } from "express";
import { getMembers, inviteMember, cancelInvite, removeMember } from "../controllers/admin.ts";
import { requireAuth, requireRole } from "../middleware/auth.ts";

const router = Router();

// Retrieve list of members and invites (Admin role only)
router.get("/members", requireAuth, requireRole(["ADMIN"]), getMembers);

// Invite a member (Admin role only)
router.post("/invite", requireAuth, requireRole(["ADMIN"]), inviteMember);

// Cancel a pending invitation (Admin role only)
router.delete("/invite/:inviteId", requireAuth, requireRole(["ADMIN"]), cancelInvite);

// Remove a member from the organization (Admin role only)
router.delete("/members/:memberId", requireAuth, requireRole(["ADMIN"]), removeMember);

export default router;
