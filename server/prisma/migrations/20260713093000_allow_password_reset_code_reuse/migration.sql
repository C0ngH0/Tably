DROP INDEX IF EXISTS "PasswordResetToken_tokenHash_key";

CREATE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_idx" ON "PasswordResetToken"("tokenHash");
