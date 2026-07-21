import type {
  EmailMessage,
  SendWelcomeEmailInput,
} from "../providers/EmailProvider";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildWelcomeEmail({
  toEmail,
  displayName,
}: SendWelcomeEmailInput): EmailMessage {
  const greeting = displayName ? `Hi ${displayName},` : "Hi,";
  const escapedGreeting = escapeHtml(greeting);

  return {
    to: toEmail,
    subject: "Welcome to Tably",
    text: [
      "Welcome to Tably",
      "",
      greeting,
      "",
      "Thanks for joining Tably. You can now save and manage your split sessions.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a;">
        <h1 style="color: #2563eb;">Tably</h1>
        <h2>Welcome</h2>
        <p>${escapedGreeting}</p>
        <p>Thanks for joining Tably. You can now save and manage your split sessions.</p>
      </div>
    `,
  };
}
