import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

type PasswordResetEmailInput = {
  toEmail: string;
  code: string;
  expiresAt: Date;
};

const sesClient = new SESClient({
  region: process.env.AWS_REGION,
});

function getSenderEmail(): string {
  const senderEmail = process.env.SES_FROM_EMAIL;

  if (!senderEmail) {
    throw new Error("SES_FROM_EMAIL is not configured.");
  }

  return senderEmail;
}

export async function sendPasswordResetEmail({
  toEmail,
  code,
  expiresAt,
}: PasswordResetEmailInput) {
  const expiresAtText = expiresAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });

  await sesClient.send(
    new SendEmailCommand({
      Source: getSenderEmail(),
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Charset: "UTF-8",
          Data: "Reset your SplitSnap password",
        },
        Body: {
          Text: {
            Charset: "UTF-8",
            Data: [
              "SplitSnap Password Reset",
              "",
              "Use this 6-digit reset code to choose a new password:",
              code,
              "",
              `This code expires at ${expiresAtText} UTC.`,
              "",
              "If you did not request this password reset, you can ignore this email.",
            ].join("\n"),
          },
          Html: {
            Charset: "UTF-8",
            Data: `
              <div style="font-family: Arial, sans-serif; color: #0f172a;">
                <h1 style="color: #2563eb;">SplitSnap</h1>
                <h2>Password reset</h2>
                <p>Use this 6-digit reset code to choose a new password:</p>
                <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
                <p>This code expires at ${expiresAtText} UTC.</p>
                <p>If you did not request this password reset, you can ignore this email.</p>
              </div>
            `,
          },
        },
      },
    }),
  );
}
