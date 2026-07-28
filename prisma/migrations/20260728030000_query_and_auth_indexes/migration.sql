CREATE INDEX "Order_status_paidAt_idx" ON "Order"("status", "paidAt");
CREATE INDEX "Order_eventId_idx" ON "Order"("eventId");
CREATE INDEX "session_userId_idx" ON "session"("userId");
CREATE INDEX "session_expiresAt_idx" ON "session"("expiresAt");
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");
CREATE INDEX "account_userId_idx" ON "account"("userId");
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");
CREATE INDEX "verification_expiresAt_idx" ON "verification"("expiresAt");
