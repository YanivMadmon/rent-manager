import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { safeNext } from "@/lib/safe-next";

// Google → Supabase → here with ?code=... (PKCE). Exchange it for a session
// and make sure the landlord has a row in our User table.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=exchange`);
  }

  const { id, email, user_metadata } = data.user;
  const name =
    (user_metadata?.full_name as string | undefined) ??
    (user_metadata?.name as string | undefined) ??
    null;

  await prisma.user.upsert({
    where: { id },
    create: { id, email: email ?? "", name },
    update: { email: email ?? "", name: name ?? undefined },
  });

  return NextResponse.redirect(`${origin}${next}`);
}
