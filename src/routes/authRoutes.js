import express from "express";
import { 
  register, 
  login, 
  getMe, 
  logout, 
  verifyEmail, 
  resendVerification 
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", resendVerification);

// Protected routes (require authentication)
router.get("/me", protect, getMe);

export default router;