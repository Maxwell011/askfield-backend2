import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    // ─── Stage 1: Registration (required) ───────────────────────────────────
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: {
      type: String,
      enum: ["contributor", "participant"],
      required: [true, "Role is required"],
    },

    // ─── Stage 2: Profile Completion (optional at registration) ─────────────
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say"],
    },
    dateOfBirth: {
      type: Date,
    },
    identityDocument: {
      type: String,
    },
    supportingDocument: {
      type: String,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },

    // ─── Verification ────────────────────────────────────────────────────────
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
    },
    verificationTokenExpiry: {
      type: Date,
    },

    // ─── Profile completion tracking ─────────────────────────────────────────
    profileCompleted: {
      type: Boolean,
      default: false,
    },

    // ─── Stage 2 detailed profiles ───────────────────────────────────────────
    contributorProfile: {
      expertise:          { type: String },
      bio:                { type: String },
      countryOfResidence: { type: String },
      organizationName:   { type: String },
      jobTitle:           { type: String },
      organizationType:   { type: String },
    },

    participantProfile: {
      interests:                 [{ type: String }],
      about:                     { type: String },
      goals:                     { type: String },
      countryOfResidence:        { type: String },
      countryOfBirth:            { type: String },
      placeOfBirth:              { type: String },
      ethnicGroup:               { type: String },
      language:                  { type: String },
      languageFluent:            [{ type: String }],
      regionalDialect:           { type: String },
      educationLevel:            { type: String },
      educationCurrentStatus:    { type: String },
      educationFieldOfStudy:     { type: String },
      educationYearCompleted:    { type: String },
      employmentStatus:          { type: String },
      employmentYearsExperience: { type: Number },
      employmentSector:          { type: String },
      employmentIndustry:        { type: String },
      employmentJobTitle:        { type: String },
      linkedInProfile:           { type: String },
      availabilityToParticipate: { type: String },
      participateHoursPerWeek:   { type: Number },
      currency:                  { type: String },
    },
  },
  { timestamps: true }
);

// ✅ Fix: async pre-save hooks in modern Mongoose should NOT use next()
// Just return a promise (async/await handles it automatically)
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateVerificationToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.verificationToken = crypto.createHash("sha256").update(token).digest("hex");
  this.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

const User = mongoose.model("User", userSchema);
export default User;