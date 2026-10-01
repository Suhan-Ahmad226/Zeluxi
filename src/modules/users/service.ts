import { db } from "@/lib/db/client";

export async function getOrCreateLocalUser(input: { supabaseAuthId: string; email: string; name?: string | null }) {
  return db.user.upsert({
    where: { supabaseAuthId: input.supabaseAuthId },
    create: { supabaseAuthId: input.supabaseAuthId, email: input.email, name: input.name ?? null },
    update: { email: input.email, ...(input.name !== undefined ? { name: input.name } : {}) },
  });
}
