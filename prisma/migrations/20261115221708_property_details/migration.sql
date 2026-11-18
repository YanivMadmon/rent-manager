-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'GARDEN_APARTMENT', 'PENTHOUSE', 'DUPLEX', 'STUDIO', 'HOUSE', 'UNIT');

-- CreateEnum
CREATE TYPE "Furnishing" AS ENUM ('NONE', 'PARTIAL', 'FULL');

-- CreateEnum
CREATE TYPE "PropertyFeature" AS ENUM ('PARKING', 'ELEVATOR', 'BALCONY', 'SAFE_ROOM', 'STORAGE', 'AIR_CONDITIONING', 'BARS', 'ACCESSIBLE', 'PETS_ALLOWED');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "features" "PropertyFeature"[],
ADD COLUMN     "floor" INTEGER,
ADD COLUMN     "furnished" "Furnishing",
ADD COLUMN     "propertyType" "PropertyType",
ADD COLUMN     "rooms" DOUBLE PRECISION,
ADD COLUMN     "sizeSqm" INTEGER,
ADD COLUMN     "totalFloors" INTEGER;
