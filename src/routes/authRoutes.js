import express from "express";
import { 
  register, 
  login, 
  getMe, 
  logout, 
  verifyEmail, 
  resendVerification,
  completeProfile,
  updateProfile
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
router.put("/complete-profile", protect, completeProfile);  // Stage 2: Complete profile
router.put("/update-profile", protect, updateProfile); // Update profile later

export default router;