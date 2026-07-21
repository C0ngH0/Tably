import { Resend } from "resend";

import { buildPasswordResetEmail } from "../templates/passwordReset";
import { buildVerificationEmail } from "../templates/verifyEmail";
import { buildWelcomeEmail } from "../templates/welcome";
import type {
  EmailMessage,
  EmailProvider,
  SendPasswordResetEmailInput,
  SendVerificationEmailInput,
  SendWelcomeEmailInput,
} from "./EmailProvider";

export class ResendProvider implements EmailProvider {
  private readonly resend: Resend;

  constructor(
    apiKey: string,
    private readonly fromEmail: string,
  ) {
    this.resend = new Resend(apiKey);
  }

  async sendPasswordReset(input: SendPasswordResetEmailInput): Promise<void> {
    await this.sendEmail(buildPasswordResetEmail(input));
  }

  async sendVerification(input: SendVerificationEmailInput): Promise<void> {
    await this.sendEmail(buildVerificationEmail(input));
  }

  async sendWelcome(input: SendWelcomeEmailInput): Promise<void> {
    await this.sendEmail(buildWelcomeEmail(input));
  }

  private async sendEmail(message: EmailMessage): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    if (error) {
      throw new Error(`Resend failed to send email: ${error.message}`);
    }
  }
}
