import { createSupabaseServerClient } from "@/lib/auth/server";
import { getOrCreateLocalUser } from "@/modules/users/service";

export async function getCurrentLocalUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || !data.user.email) return null;
  return getOrCreateLocalUser({
    supabaseAuthId: data.user.id,
    email: data.user.email,
    name: data.user.user_metadata?.name ?? data.user.user_metadata?.full_name ?? null,
  });
}
