-- Private storage bucket for scans of guarantees, reachable only through signed
-- URLs created on the server. Guarded because Prisma's shadow database has no
-- storage schema.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('guarantee-files', 'guarantee-files', false, 10485760,
            ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;