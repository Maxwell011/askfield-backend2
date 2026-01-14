import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
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
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say"],
      required: [true, "Gender is required"],
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    identityDocument: {
      type: String, 
      required: [true, "Identity document is required"],
    },
    supportingDocument: {
      type: String, 
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    
    // Role selection (required in stage 1)
    role: {
      type: String,
      enum: ["contributor", "participant"],
      required: [true, "Role is required"],
    },
    
    // Verification fields
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
    
    // Profile completion tracking
    profileCompleted: {
      type: Boolean,
      default: false,
    },

    // Stage 2: Detailed Profile Fields (Completed after login)
    contributorProfile: {
      expertise: { type: String },
      bio: { type: String },
      countryOfResidence: { type: String },
      organizationName: { type: String },
      jobTitle: { type: String },
      organizationType: { type: String },
    },

    participantProfile: {
      interests: [{ type: String }],
      about: { type: String },
      goals: { type: String },
      countryOfResidence: { type: String },
      countryOfBirth: { type: String },
      placeOfBirth: { type: String },
      ethnicGroup: { type: String },
      language: { type: String },
      languageFluent: [{ type: String }],
      regionalDialect: { type: String },
      educationLevel: { type: String },
      educationCurrentStatus: { type: String },
      educationFieldOfStudy: { type: String },
      educationYearCompleted: { type: String },
      employmentStatus: { type: String },
      employmentYearsExperience: { type: Number },
      employmentSector: { type: String },
      employmentIndustry: { type: String },
      employmentJobTitle: { type: String },
      linkedInProfile: { type: String },
      availabilityToParticipate: { type: String },
      participateHoursPerWeek: { type: Number },
      currency: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate verification token
userSchema.methods.generateVerificationToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.verificationToken = crypto.createHash("sha256").update(token).digest("hex");
  this.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

const User = mongoose.model("User", userSchema);

export default User;