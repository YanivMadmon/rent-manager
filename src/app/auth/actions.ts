"use server";

import { redirect } from "next/navigation";
import { appOrigin } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(formData.get("next")?.toString());
  const origin = await appOrigin();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
