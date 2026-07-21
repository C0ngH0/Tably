import { EmailService } from "./EmailService";
import type { EmailProvider } from "./providers/EmailProvider";
import { ResendProvider } from "./providers/ResendProvider";

type SupportedEmailProvider = "resend";
const SUPPORTED_EMAIL_PROVIDERS: SupportedEmailProvider[] = ["resend"];

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Email configuration error: ${name} is required.`);
  }

  return value;
}

function getEmailProviderName(): SupportedEmailProvider {
  const providerName = getRequiredEnv("EMAIL_PROVIDER").toLowerCase();

  if (providerName === "resend") {
    return providerName;
  }

  throw new Error(
    `Email configuration error: EMAIL_PROVIDER is unsupported. Supported values: ${SUPPORTED_EMAIL_PROVIDERS.join(", ")}.`,
  );
}

function createEmailProvider(): EmailProvider {
  const providerName = getEmailProviderName();
  const fromEmail = getRequiredEnv("EMAIL_FROM");

  switch (providerName) {
    case "resend":
      return new ResendProvider(getRequiredEnv("RESEND_API_KEY"), fromEmail);
  }
}

export const emailService = new EmailService(createEmailProvider);

export function initializeEmailService(): void {
  emailService.initialize();
}

export type {
  SendPasswordResetEmailInput,
  SendVerificationEmailInput,
  SendWelcomeEmailInput,
} from "./providers/EmailProvider";
