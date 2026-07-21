import type {
  EmailMessage,
  SendVerificationEmailInput,
} from "../providers/EmailProvider";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildVerificationEmail({
  toEmail,
  verificationUrl,
}: SendVerificationEmailInput): EmailMessage {
  const escapedVerificationUrl = escapeHtml(verificationUrl);

  return {
    to: toEmail,
    subject: "Verify your Tably email",
    text: [
      "Verify your Tably email",
      "",
      "Confirm this email address by opening the link below:",
      verificationUrl,
      "",
      "If you did not create a Tably account, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a;">
        <h1 style="color: #2563eb;">Tably</h1>
        <h2>Verify your email</h2>
        <p>Confirm this email address by opening the link below:</p>
        <p><a href="${escapedVerificationUrl}" style="color: #2563eb;">Verify email</a></p>
        <p>If you did not create a Tably account, you can ignore this email.</p>
      </div>
    `,
  };
}
