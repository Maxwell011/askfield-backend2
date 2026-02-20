import nodemailer from "nodemailer";

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false, // true for port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

export const sendVerificationEmail = async (user, verificationToken) => {
  const transporter = createTransporter();
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  await transporter.sendMail({
    from: `"askField" <${process.env.EMAIL_FROM}>`,
    to: user.email,
    subject: "Verify Your Email – askField",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f0; margin: 0; padding: 0; }
          .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 20px rgba(0,0,0,0.08); }
          .header { background: #1a1a1a; padding: 32px 40px; text-align: center; }
          .header h1 { color: #fff; margin: 0; font-size: 22px; letter-spacing: 0.5px; }
          .body { padding: 40px; color: #333; }
          .body h2 { font-size: 20px; margin: 0 0 12px; color: #1a1a1a; }
          .body p { font-size: 14px; line-height: 1.7; color: #555; margin: 0 0 20px; }
          .btn { display: inline-block; padding: 14px 36px; background: #1a1a1a; color: #fff; text-decoration: none; border-radius: 50px; font-size: 14px; font-weight: 600; }
          .btn-wrap { text-align: center; margin: 28px 0; }
          .url { word-break: break-all; font-size: 12px; color: #888; }
          .footer { text-align: center; padding: 20px 40px; font-size: 12px; color: #aaa; border-top: 1px solid #f0f0f0; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header"><h1>AskField</h1></div>
          <div class="body">
            <h2>Hi ${user.firstName},</h2>
            <p>Thanks for signing up as a <strong>${user.role}</strong> on AskField! Click the button below to verify your email address and activate your account.</p>
            <div class="btn-wrap">
              <a href="${verificationUrl}" class="btn">Join AskField</a>
            </div>
            <p>Or paste this link into your browser:</p>
            <p class="url">${verificationUrl}</p>
            <p><strong>This link expires in 24 hours.</strong></p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
          </div>
          <div class="footer">&copy; ${new Date().getFullYear()} AskField. All rights reserved.</div>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${user.firstName},\n\nVerify your email here:\n${verificationUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't sign up, ignore this email.`,
  });

  console.log(`Verification email sent to ${user.email}`);
};

export const sendWelcomeEmail = async (user) => {
  try {
    const transporter = createTransporter();
    const loginUrl = `${process.env.FRONTEND_URL}/login`;

    await transporter.sendMail({
      from: `"AskField" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: "Welcome to AskField – You're verified!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f0; margin: 0; padding: 0; }
            .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 20px rgba(0,0,0,0.08); }
            .header { background: #22c55e; padding: 32px 40px; text-align: center; }
            .header h1 { color: #fff; margin: 0; font-size: 22px; }
            .body { padding: 40px; color: #333; }
            .body h2 { font-size: 20px; margin: 0 0 12px; color: #1a1a1a; }
            .body p { font-size: 14px; line-height: 1.7; color: #555; margin: 0 0 20px; }
            .btn { display: inline-block; padding: 14px 36px; background: #1a1a1a; color: #fff; text-decoration: none; border-radius: 50px; font-size: 14px; font-weight: 600; }
            .btn-wrap { text-align: center; margin: 28px 0; }
            .footer { text-align: center; padding: 20px 40px; font-size: 12px; color: #aaa; border-top: 1px solid #f0f0f0; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="header"><h1>🎉 You're verified!</h1></div>
            <div class="body">
              <h2>Welcome aboard, ${user.firstName}!</h2>
              <p>Your email has been verified. Log in now to complete your profile and start using AskField.</p>
              <div class="btn-wrap">
                <a href="${loginUrl}" class="btn">Go to Login</a>
              </div>
            </div>
            <div class="footer">&copy; ${new Date().getFullYear()} AskField. All rights reserved.</div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`Welcome email sent to ${user.email}`);
  } catch (error) {
    // Welcome email failure is non-fatal
    console.error("Welcome email failed:", error);
  }
};