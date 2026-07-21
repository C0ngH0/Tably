import type {
  EmailMessage,
  SendPasswordResetEmailInput,
} from "../providers/EmailProvider";

function formatExpiration(expiresAt: Date): string {
  return expiresAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

export function buildPasswordResetEmail({
  toEmail,
  code,
  expiresAt,
}: SendPasswordResetEmailInput): EmailMessage {
  const expiresAtText = formatExpiration(expiresAt);

  return {
    to: toEmail,
    subject: "Reset your Tably password",
    text: [
      "Tably Password Reset",
      "",
      "Use this 6-digit reset code to choose a new password:",
      code,
      "",
      `This code expires at ${expiresAtText} UTC.`,
      "",
      "If you did not request this password reset, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a;">
        <h1 style="color: #2563eb;">Tably</h1>
        <h2>Password reset</h2>
        <p>Use this 6-digit reset code to choose a new password:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
        <p>This code expires at ${expiresAtText} UTC.</p>
        <p>If you did not request this password reset, you can ignore this email.</p>
      </div>
    `,
  };
}
