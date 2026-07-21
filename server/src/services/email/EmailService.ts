import type {
  EmailProvider,
  SendPasswordResetEmailInput,
  SendVerificationEmailInput,
  SendWelcomeEmailInput,
} from "./providers/EmailProvider";

export class EmailService implements EmailProvider {
  private provider: EmailProvider | null = null;

  constructor(private readonly providerFactory: () => EmailProvider) {}

  initialize(): void {
    this.getProvider();
  }

  async sendPasswordReset(input: SendPasswordResetEmailInput): Promise<void> {
    await this.getProvider().sendPasswordReset(input);
  }

  async sendVerification(input: SendVerificationEmailInput): Promise<void> {
    await this.getProvider().sendVerification(input);
  }

  async sendWelcome(input: SendWelcomeEmailInput): Promise<void> {
    await this.getProvider().sendWelcome(input);
  }

  private getProvider(): EmailProvider {
    if (!this.provider) {
      this.provider = this.providerFactory();
    }

    return this.provider;
  }
}
