import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendVerificationEmail, sendWelcomeEmail } from "../services/email.service.js";

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// @desc    Stage 1: Register (basic info only — no gender/dob/docs required)
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      profileCompleted: false,
    });

    const verificationToken = user.generateVerificationToken();
    await user.save();

    try {
      await sendVerificationEmail(user, verificationToken);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    res.status(201).json({
      success: true,
      message: "Registration successful! Please check your email to verify your account.",
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
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ success: false, message: "Validation failed", errors });
    }
    res.status(500).json({ success: false, message: "Server error during registration", error: error.message });
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
      return res.status(400).json({ success: false, message: "Invalid or expired verification token" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

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
    res.status(500).json({ success: false, message: "Server error during verification", error: error.message });
  }
};

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password" });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in.",
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
        profileCompleted: user.profileCompleted, // frontend checks this to redirect to complete-profile page
        contributorProfile: user.contributorProfile,
        participantProfile: user.participantProfile,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error during login", error: error.message });
  }
};

// @desc    Stage 2: Complete profile (enforces required fields here, not at registration)
// @route   PUT /api/auth/complete-profile
// @access  Private
export const completeProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { gender, dateOfBirth, identityDocument, supportingDocument, phoneNumber, contributorProfile, participantProfile } = req.body;

    // Enforce the fields that were optional at registration
    if (!gender || !dateOfBirth || !identityDocument) {
      return res.status(400).json({
        success: false,
        message: "Gender, date of birth, and identity document are required to complete your profile.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Apply the stage-2 personal fields
    user.gender = gender;
    user.dateOfBirth = dateOfBirth;
    user.identityDocument = identityDocument;
    if (supportingDocument) user.supportingDocument = supportingDocument;
    if (phoneNumber) user.phoneNumber = phoneNumber;

    // Apply role-specific profile data
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
    res.status(500).json({ success: false, message: "Error completing profile", error: error.message });
  }
};

// @desc    Update profile (for later edits)
// @route   PUT /api/auth/update-profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const allowedUpdates = ["firstName", "lastName", "phoneNumber", "gender", "contributorProfile", "participantProfile"];
    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) user[key] = updates[key];
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
    res.status(500).json({ success: false, message: "Error updating profile", error: error.message });
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.isVerified) return res.status(400).json({ success: false, message: "Email is already verified" });

    const verificationToken = user.generateVerificationToken();
    await user.save();
    await sendVerificationEmail(user, verificationToken);

    res.status(200).json({ success: true, message: "Verification email sent! Please check your inbox." });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ success: false, message: "Failed to resend verification email", error: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ success: false, message: "Error fetching user profile", error: error.message });
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Public
export const logout = async (req, res) => {
  res.status(200).json({ success: true, message: "Logout successful. Please delete your token on the client side." });
};