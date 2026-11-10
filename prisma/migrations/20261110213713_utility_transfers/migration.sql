-- AlterTable
ALTER TABLE "UtilityTransfer" ADD COLUMN     "skipped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "uploadedAt" TIMESTAMP(3);

-- Private storage bucket for the tenant's bill-transfer confirmations,
-- reachable only through signed URLs created on the server. Guarded because
-- Prisma's shadow database has no storage schema.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('utility-proofs', 'utility-proofs', false, 10485760,
            ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;