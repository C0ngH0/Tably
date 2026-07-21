import type {
  EmailProvider,
  SendPasswordResetEmailInput,
  SendVerificationEmailInput,
  SendWelcomeEmailInput,
} from "./EmailProvider";

export class SESProvider implements EmailProvider {
  constructor(private readonly _fromEmail: string) {}

  async sendPasswordReset(_input: SendPasswordResetEmailInput): Promise<void> {
    throw new Error("Not implemented");
  }

  async sendVerification(_input: SendVerificationEmailInput): Promise<void> {
    throw new Error("Not implemented");
  }

  async sendWelcome(_input: SendWelcomeEmailInput): Promise<void> {
    throw new Error("Not implemented");
  }
}
