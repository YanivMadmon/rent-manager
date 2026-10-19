-- Supabase exposes the public schema through its REST API (PostgREST) to anyone
-- holding the publishable key. All data access goes through Prisma (postgres role,
-- which bypasses RLS), so enable RLS with no policies to deny anon/authenticated.
-- New tables must be added here (or in a later migration) as well.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Property" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenancy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Party" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SignatureRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Guarantee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Check" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IndexUpdate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Issue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inspection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InspectionPhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UtilityTransfer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DepositSettlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimelineEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MagicLink" ENABLE ROW LEVEL SECURITY;
-- Prisma's shadow database has no _prisma_migrations table, so guard it.
DO $$
BEGIN
  IF to_regclass('"_prisma_migrations"') IS NOT NULL THEN
    ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
