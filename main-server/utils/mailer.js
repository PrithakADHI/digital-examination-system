import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const APP_NAME = "Digital Examination System";

function buildTemporaryPasswordEmail({ fullName, username, temporaryPassword }) {
  return `
  <div style="font-family: Arial, sans-serif; background: #f4f7fb; padding: 24px;">
    <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(90deg, #0f766e, #0369a1); color: #ffffff; padding: 18px 24px;">
        <h2 style="margin: 0; font-size: 20px;">${APP_NAME}</h2>
        <p style="margin: 6px 0 0; font-size: 13px;">Your account is ready</p>
      </div>
      <div style="padding: 24px; color: #1f2937;">
        <p style="margin-top: 0;">Hello ${fullName || "User"},</p>
        <p style="line-height: 1.55; margin: 0 0 16px;">
          Your account has been created by the administrator. Use the credentials below to sign in.
        </p>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px;"><strong>Username:</strong> ${username}</p>
          <p style="margin: 0;"><strong>Temporary Password:</strong> <span style="font-size: 18px; letter-spacing: 1px;">${temporaryPassword}</span></p>
        </div>
        <p style="line-height: 1.55; margin: 0; color: #475569;">
          For security, you must set a new password immediately after first login.
        </p>
      </div>
    </div>
  </div>
  `;
}

export async function sendTemporaryPasswordEmail({ to, fullName, username, temporaryPassword }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!to) {
    throw new Error("Recipient email is required.");
  }

  if (!from) {
    throw new Error("SMTP_FROM or SMTP_USER must be configured.");
  }

  await transporter.sendMail({
    from: `"No Reply" <${from}>`,
    to,
    subject: `${APP_NAME}: Temporary Password`,
    html: buildTemporaryPasswordEmail({ fullName, username, temporaryPassword }),
  });
}
