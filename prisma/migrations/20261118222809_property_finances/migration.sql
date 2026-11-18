-- CreateEnum
CREATE TYPE "ExpenseFrequency" AS ENUM ('MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "equity" INTEGER,
ADD COLUMN     "mortgageMonthly" INTEGER,
ADD COLUMN     "purchaseCosts" INTEGER,
ADD COLUMN     "purchaseDate" DATE,
ADD COLUMN     "purchasePrice" INTEGER;

-- CreateTable
CREATE TABLE "PropertyExpense" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "frequency" "ExpenseFrequency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyExpense_propertyId_idx" ON "PropertyExpense"("propertyId");

-- AddForeignKey
ALTER TABLE "PropertyExpense" ADD CONSTRAINT "PropertyExpense_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Block access through Supabase's public REST API (see enable_rls).
ALTER TABLE "PropertyExpense" ENABLE ROW LEVEL SECURITY;
