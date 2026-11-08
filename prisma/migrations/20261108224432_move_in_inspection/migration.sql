-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN     "tenantNote" TEXT;

-- Private storage bucket for handover photos, reachable only through signed
-- URLs created on the server. Guarded because Prisma's shadow database has no
-- storage schema.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('inspection-photos', 'inspection-photos', false, 10485760,
            ARRAY['image/jpeg', 'image/png', 'image/webp'])
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;