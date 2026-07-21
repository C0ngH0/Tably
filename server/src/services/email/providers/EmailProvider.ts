export type SendPasswordResetEmailInput = {
  toEmail: string;
  code: string;
  expiresAt: Date;
};

export type SendVerificationEmailInput = {
  toEmail: string;
  verificationUrl: string;
};

export type SendWelcomeEmailInput = {
  toEmail: string;
  displayName?: string | null;
};

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export interface EmailProvider {
  sendPasswordReset(input: SendPasswordResetEmailInput): Promise<void>;
  sendVerification(input: SendVerificationEmailInput): Promise<void>;
  sendWelcome(input: SendWelcomeEmailInput): Promise<void>;
}
