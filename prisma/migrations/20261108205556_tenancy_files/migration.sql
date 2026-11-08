-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('CONTRACT', 'GUARANTEE', 'OTHER');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER';

-- Private storage bucket for tenancy files (contracts, guarantees and more),
-- reachable only through signed URLs created on the server. Guarded because
-- Prisma's shadow database has no storage schema.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('tenancy-files', 'tenancy-files', false, 20971520,
            ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;