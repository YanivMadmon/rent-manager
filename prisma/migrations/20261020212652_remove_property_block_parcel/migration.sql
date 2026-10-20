/*
  Warnings:

  - You are about to drop the column `block` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `parcel` on the `Property` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Property" DROP COLUMN "block",
DROP COLUMN "parcel";
