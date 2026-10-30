-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'READY', 'LISTED', 'RESERVED', 'SOLD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('MERCADO_LIVRE', 'OLX', 'ENJOEI', 'FACEBOOK_MARKETPLACE');

-- CreateEnum
CREATE TYPE "ConnectionMode" AS ENUM ('API', 'ASSISTED');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'ACTION_REQUIRED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHING', 'ACTIVE', 'PAUSED', 'SOLD', 'CLOSING', 'CLOSED', 'ERROR', 'ACTION_REQUIRED');

-- CreateEnum
CREATE TYPE "ListingOperation" AS ENUM ('PUBLISH', 'UPDATE', 'PAUSE', 'CLOSE', 'STATUS');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "AssistedTaskType" AS ENUM ('PUBLISH', 'UPDATE', 'CLOSE');

-- CreateEnum
CREATE TYPE "AssistedTaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SaleSourceType" AS ENUM ('LISTING', 'OFFLINE', 'OTHER');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('RESERVED', 'PAID', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "Owner" (
    "id" UUID NOT NULL,
    "singletonKey" TEXT NOT NULL DEFAULT 'OWNER',
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerSession" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" UUID NOT NULL,
    "identityHash" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "condition" "ProductCondition" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "categoryHint" TEXT,
    "brand" TEXT,
    "locationText" TEXT,
    "postalCode" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "soldAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPhoto" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "objectKey" TEXT NOT NULL,
    "processedObjectKey" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelConnection" (
    "id" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "mode" "ConnectionMode" NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "encryptedAccessToken" TEXT,
    "encryptedRefreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "mode" "ConnectionMode" NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "channelPriceCents" INTEGER,
    "externalId" TEXT,
    "externalUrl" TEXT,
    "platformCategoryId" TEXT,
    "platformData" JSONB,
    "publishedProductVersion" INTEGER,
    "publishedSnapshotHash" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingAttempt" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "operation" "ListingOperation" NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'STARTED',
    "idempotencyKey" TEXT NOT NULL,
    "requestSummary" JSONB,
    "responseSummary" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ListingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistedTask" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "type" "AssistedTaskType" NOT NULL,
    "status" "AssistedTaskStatus" NOT NULL DEFAULT 'PENDING',
    "preparedPayload" JSONB NOT NULL,
    "destinationUrl" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistedTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "sourceType" "SaleSourceType" NOT NULL,
    "sourceListingId" UUID,
    "status" "SaleStatus" NOT NULL,
    "externalOrderId" TEXT,
    "reservedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Owner_singletonKey_key" ON "Owner"("singletonKey");

-- CreateIndex
CREATE UNIQUE INDEX "Owner_email_key" ON "Owner"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerSession_tokenHash_key" ON "OwnerSession"("tokenHash");

-- CreateIndex
CREATE INDEX "OwnerSession_ownerId_expiresAt_idx" ON "OwnerSession"("ownerId", "expiresAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_blockedUntil_idx" ON "LoginAttempt"("blockedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "LoginAttempt_identityHash_ipHash_key" ON "LoginAttempt"("identityHash", "ipHash");

-- CreateIndex
CREATE INDEX "Product_status_updatedAt_idx" ON "Product"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Product_archivedAt_idx" ON "Product"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPhoto_objectKey_key" ON "ProductPhoto"("objectKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPhoto_processedObjectKey_key" ON "ProductPhoto"("processedObjectKey");

-- CreateIndex
CREATE INDEX "ProductPhoto_productId_deletedAt_sortOrder_idx" ON "ProductPhoto"("productId", "deletedAt", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPhoto_productId_sortOrder_key" ON "ProductPhoto"("productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelConnection_platform_key" ON "ChannelConnection"("platform");

-- CreateIndex
CREATE INDEX "Listing_status_updatedAt_idx" ON "Listing"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_productId_platform_key" ON "Listing"("productId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "ListingAttempt_idempotencyKey_key" ON "ListingAttempt"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ListingAttempt_listingId_startedAt_idx" ON "ListingAttempt"("listingId", "startedAt");

-- CreateIndex
CREATE INDEX "AssistedTask_status_createdAt_idx" ON "AssistedTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Sale_productId_status_idx" ON "Sale"("productId", "status");

-- CreateIndex
CREATE INDEX "Sale_externalOrderId_idx" ON "Sale"("externalOrderId");

-- AddForeignKey
ALTER TABLE "OwnerSession" ADD CONSTRAINT "OwnerSession_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPhoto" ADD CONSTRAINT "ProductPhoto_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingAttempt" ADD CONSTRAINT "ListingAttempt_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistedTask" ADD CONSTRAINT "AssistedTask_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_sourceListingId_fkey" FOREIGN KEY ("sourceListingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
