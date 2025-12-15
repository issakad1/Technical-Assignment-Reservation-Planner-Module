-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('QUOTE', 'CONFIRMED', 'CHECKED_OUT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'MODIFIED', 'VEHICLE_ASSIGNED', 'VEHICLE_UNASSIGNED', 'STATUS_CHANGED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'RENTED', 'MAINTENANCE', 'OUT_OF_SERVICE');

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_classes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dailyRate" DECIMAL(10,2) NOT NULL,
    "weeklyRate" DECIMAL(10,2),
    "monthlyRate" DECIMAL(10,2),
    "mileageRate" DECIMAL(10,2) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "features" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "operatingHours" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" SERIAL NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "mileage" INTEGER NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "vehicleClassId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_heads" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_heads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" SERIAL NOT NULL,
    "reservationNumber" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "vehicleClassId" INTEGER NOT NULL,
    "vehicleId" INTEGER,
    "reservationStatus" "ReservationStatus" NOT NULL DEFAULT 'QUOTE',
    "dateOut" TIMESTAMP(3) NOT NULL,
    "dateDue" TIMESTAMP(3) NOT NULL,
    "locationCodeOut" TEXT NOT NULL,
    "locationCodeDue" TEXT NOT NULL,
    "rateCode" TEXT NOT NULL,
    "estimatedTotal" DECIMAL(10,2) NOT NULL,
    "estimatedMiles" INTEGER,
    "estimatedDays" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "customerNotes" TEXT,
    "createdBy" TEXT NOT NULL,
    "modifiedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_audit_logs" (
    "id" SERIAL NOT NULL,
    "reservationId" INTEGER NOT NULL,
    "action" "AuditAction" NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_class_analytics" (
    "id" SERIAL NOT NULL,
    "vehicleClassId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalReservations" INTEGER NOT NULL,
    "totalRevenue" DECIMAL(10,2) NOT NULL,
    "utilizationRate" DECIMAL(5,2) NOT NULL,
    "averageRentalDays" DECIMAL(10,2) NOT NULL,
    "overbookingCount" INTEGER NOT NULL,
    "cancellationRate" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_class_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_classes_name_key" ON "vehicle_classes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "locations_code_key" ON "locations"("code");

-- CreateIndex
CREATE INDEX "locations_code_idx" ON "locations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_unitNumber_key" ON "vehicles"("unitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");

-- CreateIndex
CREATE INDEX "vehicles_vehicleClassId_idx" ON "vehicles"("vehicleClassId");

-- CreateIndex
CREATE INDEX "vehicles_locationId_idx" ON "vehicles"("locationId");

-- CreateIndex
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");

-- CreateIndex
CREATE INDEX "vehicles_unitNumber_idx" ON "vehicles"("unitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "rate_heads_code_key" ON "rate_heads"("code");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_reservationNumber_key" ON "reservations"("reservationNumber");

-- CreateIndex
CREATE INDEX "reservations_customerId_idx" ON "reservations"("customerId");

-- CreateIndex
CREATE INDEX "reservations_vehicleId_idx" ON "reservations"("vehicleId");

-- CreateIndex
CREATE INDEX "reservations_vehicleClassId_idx" ON "reservations"("vehicleClassId");

-- CreateIndex
CREATE INDEX "reservations_reservationStatus_idx" ON "reservations"("reservationStatus");

-- CreateIndex
CREATE INDEX "reservations_reservationNumber_idx" ON "reservations"("reservationNumber");

-- CreateIndex
CREATE INDEX "reservations_locationCodeOut_dateOut_dateDue_idx" ON "reservations"("locationCodeOut", "dateOut", "dateDue");

-- CreateIndex
CREATE INDEX "reservations_dateOut_dateDue_idx" ON "reservations"("dateOut", "dateDue");

-- CreateIndex
CREATE INDEX "reservation_audit_logs_reservationId_idx" ON "reservation_audit_logs"("reservationId");

-- CreateIndex
CREATE INDEX "reservation_audit_logs_changedAt_idx" ON "reservation_audit_logs"("changedAt");

-- CreateIndex
CREATE INDEX "vehicle_class_analytics_date_idx" ON "vehicle_class_analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_class_analytics_vehicleClassId_date_key" ON "vehicle_class_analytics"("vehicleClassId", "date");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "vehicle_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "vehicle_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_locationCodeOut_fkey" FOREIGN KEY ("locationCodeOut") REFERENCES "locations"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_locationCodeDue_fkey" FOREIGN KEY ("locationCodeDue") REFERENCES "locations"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_rateCode_fkey" FOREIGN KEY ("rateCode") REFERENCES "rate_heads"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_audit_logs" ADD CONSTRAINT "reservation_audit_logs_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
