-- AlterTable
ALTER TABLE "Property" ALTER COLUMN "features" SET DEFAULT ARRAY[]::"PropertyFeature"[];

-- Rows added before the column existed get an empty list rather than NULL.
UPDATE "Property" SET "features" = ARRAY[]::"PropertyFeature"[] WHERE "features" IS NULL;
