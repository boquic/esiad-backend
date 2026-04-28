-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'OPERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Specialty" AS ENUM ('LASER', 'PLOTTING', 'PRINTING_3D', 'MODEL');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('FIXED', 'PER_M2', 'PER_UNIT', 'PER_VOLUME');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('BUDGETED', 'PENDING_PAYMENT', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentCondition" AS ENUM ('ADVANCE_50', 'CASH_ON_DELIVERY');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('ADVANCE', 'FINAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('PLAN_DWG', 'PLAN_DXF', 'PLAN_PDF');

-- CreateEnum
CREATE TYPE "TriggerEvent" AS ENUM ('BUDGET_READY', 'PAYMENT_CONFIRMED', 'ORDER_READY', 'PICKUP_REMINDER_48H');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('SENT', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "completed_orders_count" INTEGER NOT NULL DEFAULT 0,
    "is_frequent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operators" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operator_specialties" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "specialty" "Specialty" NOT NULL,

    CONSTRAINT "operator_specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricing_model" "PricingModel" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "service_type_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "operator_id" TEXT,
    "service_type_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'BUDGETED',
    "payment_condition" "PaymentCondition" NOT NULL,
    "estimated_price" DECIMAL(10,2) NOT NULL,
    "advance_amount" DECIMAL(10,2),
    "budget_expires_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_files" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" "FileType" NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_type" "PaymentType" NOT NULL,
    "capture_url" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "admin_comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "trigger_event" "TriggerEvent" NOT NULL,
    "whatsapp_message_id" TEXT,
    "delivery_status" "DeliveryStatus" NOT NULL DEFAULT 'SENT',
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_dni_key" ON "users"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "operators_user_id_key" ON "operators"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "operator_specialties_operator_id_specialty_key" ON "operator_specialties"("operator_id", "specialty");

-- CreateIndex
CREATE UNIQUE INDEX "service_types_name_key" ON "service_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "materials_service_type_id_name_key" ON "materials"("service_type_id", "name");

-- AddForeignKey
ALTER TABLE "operators" ADD CONSTRAINT "operators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_specialties" ADD CONSTRAINT "operator_specialties_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_files" ADD CONSTRAINT "order_files_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
