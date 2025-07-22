const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASS  // Use App Password here (not your normal Gmail password)
  }
});

exports.sendWelcomeEmail = async (email, name, userId) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify Your Email",
    html: `
      <h2>Hello ${name},</h2>
      <p>Thanks for registering. Please verify your email by clicking the link below:</p>
      <a href="http://localhost:5000/api/auth/verify/${userId}">Verify Email</a>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
  } catch (error) {
    console.error("❌ Email sending error:", error);
  }
};
