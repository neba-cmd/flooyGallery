-- Add Stripe provider metadata while preserving orders, history, and legacy
-- SumUp checkout identifiers for audit/support purposes.
ALTER TABLE "Order"
ADD COLUMN "stripeSessionId" TEXT,
ADD COLUMN "stripeCheckoutUrl" TEXT,
ADD COLUMN "stripePaymentIntentId" TEXT;

CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");
