-- Add online-payment states without altering or resetting existing order data.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TABLE "Order"
ADD COLUMN "sumupCheckoutId" TEXT,
ADD COLUMN "sumupCheckoutUrl" TEXT,
ADD COLUMN "checkoutReference" TEXT,
ADD COLUMN "paymentVerifiedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Order_sumupCheckoutId_key" ON "Order"("sumupCheckoutId");
CREATE UNIQUE INDEX "Order_checkoutReference_key" ON "Order"("checkoutReference");
