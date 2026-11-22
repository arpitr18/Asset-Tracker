-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'FIELD');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PREVIEW', 'APPLIED', 'FAILED');

-- CreateTable
CREATE TABLE "Employee" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'FIELD',
    "territoryId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Territory" (
    "id" UUID NOT NULL,
    "branchName" TEXT NOT NULL,
    "regionName" TEXT NOT NULL,
    "asmArea" TEXT NOT NULL,
    "soTerritory" TEXT NOT NULL,

    CONSTRAINT "Territory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Distributor" (
    "rdCode" TEXT NOT NULL,
    "rdName" TEXT NOT NULL,
    "rdTown" TEXT,
    "state" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "gpsVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Distributor_pkey" PRIMARY KEY ("rdCode")
);

-- CreateTable
CREATE TABLE "Outlet" (
    "outletUid" TEXT NOT NULL,
    "outletCodeRd" TEXT,
    "outletName" TEXT NOT NULL,
    "territoryId" UUID NOT NULL,
    "rdCode" TEXT,
    "state" TEXT,
    "beatName" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationVerified" BOOLEAN,
    "recordType" TEXT NOT NULL,
    "sourceFields" JSONB NOT NULL,

    CONSTRAINT "Outlet_pkey" PRIMARY KEY ("outletUid")
);

-- CreateTable
CREATE TABLE "CoolerAsset" (
    "assetCode" TEXT NOT NULL,
    "model" TEXT,
    "make" TEXT,
    "qrCode" TEXT,
    "modelVerified" TEXT,
    "visiDate" TIMESTAMP(3),
    "pmDate" TIMESTAMP(3),
    "firStatus" TEXT,
    "firDate" TIMESTAMP(3),
    "firRemark" TEXT,
    "finalSummary" TEXT,
    "masterFinalSummary" TEXT,
    "recordType" TEXT NOT NULL,
    "sourceFields" JSONB NOT NULL,

    CONSTRAINT "CoolerAsset_pkey" PRIMARY KEY ("assetCode")
);

-- CreateTable
CREATE TABLE "AssetAssignment" (
    "id" UUID NOT NULL,
    "assetCode" TEXT NOT NULL,
    "outletUid" TEXT NOT NULL,
    "visiNo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "AssetAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" UUID NOT NULL,
    "outletUid" TEXT NOT NULL,
    "employeeId" UUID NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Survey" (
    "id" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "outletUid" TEXT NOT NULL,
    "employeeId" UUID NOT NULL,
    "visitId" UUID NOT NULL,
    "condition" TEXT NOT NULL,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" UUID NOT NULL,
    "assetCode" TEXT NOT NULL,
    "surveyId" UUID NOT NULL,
    "condition" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photograph" (
    "id" UUID NOT NULL,
    "surveyId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photograph_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" UUID NOT NULL,
    "outletUid" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRecord" (
    "id" UUID NOT NULL,
    "outletUid" TEXT,
    "assetCode" TEXT,
    "kind" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Territory_branchName_regionName_asmArea_idx" ON "Territory"("branchName", "regionName", "asmArea");

-- CreateIndex
CREATE UNIQUE INDEX "Territory_branchName_regionName_asmArea_soTerritory_key" ON "Territory"("branchName", "regionName", "asmArea", "soTerritory");

-- CreateIndex
CREATE INDEX "Distributor_rdName_idx" ON "Distributor"("rdName");

-- CreateIndex
CREATE INDEX "Outlet_outletName_idx" ON "Outlet"("outletName");

-- CreateIndex
CREATE INDEX "Outlet_territoryId_outletUid_idx" ON "Outlet"("territoryId", "outletUid");

-- CreateIndex
CREATE INDEX "Outlet_rdCode_idx" ON "Outlet"("rdCode");

-- CreateIndex
CREATE INDEX "AssetAssignment_outletUid_endedAt_idx" ON "AssetAssignment"("outletUid", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssetAssignment_assetCode_outletUid_assignedAt_key" ON "AssetAssignment"("assetCode", "outletUid", "assignedAt");

-- CreateIndex
CREATE INDEX "Visit_outletUid_visitedAt_idx" ON "Visit"("outletUid", "visitedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Survey_idempotencyKey_key" ON "Survey"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Survey_visitId_key" ON "Survey"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "Photograph_storageKey_key" ON "Photograph"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_outletUid_period_key" ON "Sale"("outletUid", "period");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_rdCode_fkey" FOREIGN KEY ("rdCode") REFERENCES "Distributor"("rdCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_assetCode_fkey" FOREIGN KEY ("assetCode") REFERENCES "CoolerAsset"("assetCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_outletUid_fkey" FOREIGN KEY ("outletUid") REFERENCES "Outlet"("outletUid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_outletUid_fkey" FOREIGN KEY ("outletUid") REFERENCES "Outlet"("outletUid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_outletUid_fkey" FOREIGN KEY ("outletUid") REFERENCES "Outlet"("outletUid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_assetCode_fkey" FOREIGN KEY ("assetCode") REFERENCES "CoolerAsset"("assetCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photograph" ADD CONSTRAINT "Photograph_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_outletUid_fkey" FOREIGN KEY ("outletUid") REFERENCES "Outlet"("outletUid") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Outlet_lat_lon_idx" ON "Outlet" ("latitude", "longitude") WHERE "longitude" IS NOT NULL AND "latitude" IS NOT NULL;
