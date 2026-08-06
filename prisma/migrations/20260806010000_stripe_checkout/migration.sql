-- Replace SumUp provider metadata while preserving orders and their status/history.
ALTER TABLE "Order"
DROP COLUMN "sumupCheckoutId",
DROP COLUMN "sumupCheckoutUrl",
ADD COLUMN "stripeSessionId" TEXT,
ADD COLUMN "stripeCheckoutUrl" TEXT,
ADD COLUMN "stripePaymentIntentId" TEXT;

CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");
