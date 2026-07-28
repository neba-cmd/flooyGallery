-- Baseline for databases originally provisioned with `prisma db push`.
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'COMPLETED', 'CANCELLED');

CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "date" TIMESTAMP(3),
    "defaultPrice" INTEGER NOT NULL DEFAULT 1500,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "photoNumber" INTEGER,
    "photographer" TEXT,
    "previewKey" TEXT NOT NULL,
    "originalKey" TEXT NOT NULL,
    "previewUrl" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER,
    "price" INTEGER,
    "takenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "eventId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
CREATE INDEX "Event_slug_idx" ON "Event"("slug");
CREATE INDEX "Event_published_idx" ON "Event"("published");
CREATE INDEX "Photo_eventId_idx" ON "Photo"("eventId");
CREATE INDEX "Photo_eventId_photoNumber_idx" ON "Photo"("eventId", "photoNumber");
CREATE INDEX "Photo_filename_idx" ON "Photo"("filename");
CREATE INDEX "Photo_photographer_idx" ON "Photo"("photographer");
CREATE INDEX "Photo_createdAt_idx" ON "Photo"("createdAt");
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_customerEmail_idx" ON "Order"("customerEmail");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_photoId_idx" ON "OrderItem"("photoId");
CREATE UNIQUE INDEX "OrderItem_orderId_photoId_key" ON "OrderItem"("orderId", "photoId");
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

ALTER TABLE "Photo" ADD CONSTRAINT "Photo_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_photoId_fkey"
  FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
