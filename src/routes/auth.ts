import { Router } from "express";
import { signup, login, logout, refreshToken, me, getInviteDetails } from "../controllers/auth.ts";
import { requireAuth } from "../middleware/auth.ts";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/*refresh-token", refreshToken); // Handle refresh token (matching either /refresh-token or refresh-token)
router.post("/refresh-token", refreshToken);
router.get("/me", requireAuth, me);
router.get("/invite/:token", getInviteDetails);

export default router;
