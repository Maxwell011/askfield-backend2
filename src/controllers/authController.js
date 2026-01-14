import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendVerificationEmail, sendWelcomeEmail } from "../services/email.service.js";

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Stage 1: Initial Registration (Basic Info + Documents)
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      gender,
      dateOfBirth,
      identityDocument,
      supportingDocument,
      phoneNumber,
      role 
    } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ 
        success: false,
        message: "User with this email already exists" 
      });
    }

    // Create user with Stage 1 data only
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      gender,
      dateOfBirth,
      identityDocument,
      supportingDocument,
      phoneNumber,
      role,
      profileCompleted: false, // Mark as incomplete
    });

    // Generate verification token
    const verificationToken = user.generateVerificationToken();
    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(user, verificationToken);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    res.status(201).json({
      success: true,
      message: "Registration successful! Please check your email to verify your account before logging in.",
      needsVerification: true,
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: false,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message,
    });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    // Mark user as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    // Send welcome email
    try {
      await sendWelcomeEmail(user);
    } catch (emailError) {
      console.error("Welcome email failed:", emailError);
    }

    res.status(200).json({
      success: true,
      message: "Email verified successfully! You can now log in and complete your profile.",
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during verification",
      error: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in. Check your inbox for the verification link.",
        needsVerification: true,
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        role: user.role,
        isVerified: user.isVerified,
        profileCompleted: user.profileCompleted, // Frontend uses this to redirect
        contributorProfile: user.contributorProfile,
        participantProfile: user.participantProfile,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

// @desc    Stage 2: Complete Profile (After Login)
// @route   PUT /api/auth/complete-profile
// @access  Private (Requires token)
export const completeProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contributorProfile, participantProfile } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update profile based on role
    if (user.role === "contributor" && contributorProfile) {
      user.contributorProfile = contributorProfile;
    } else if (user.role === "participant" && participantProfile) {
      user.participantProfile = participantProfile;
    }

    user.profileCompleted = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile completed successfully!",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profileCompleted: user.profileCompleted,
        contributorProfile: user.contributorProfile,
        participantProfile: user.participantProfile,
      },
    });
  } catch (error) {
    console.error("Complete profile error:", error);
    res.status(500).json({
      success: false,
      message: "Error completing profile",
      error: error.message,
    });
  }
};

// @desc    Update Profile (For editing later)
// @route   PUT /api/auth/update-profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      "firstName", "lastName", "phoneNumber", "gender", 
      "contributorProfile", "participantProfile"
    ];

    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        user[key] = updates[key];
      }
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        role: user.role,
        profileCompleted: user.profileCompleted,
        contributorProfile: user.contributorProfile,
        participantProfile: user.participantProfile,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    const verificationToken = user.generateVerificationToken();
    await user.save();

    await sendVerificationEmail(user, verificationToken);

    res.status(200).json({
      success: true,
      message: "Verification email sent! Please check your inbox.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend verification email",
      error: error.message,
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user profile",
      error: error.message,
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
export const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logout successful. Please delete your token on the client side.",
  });
};