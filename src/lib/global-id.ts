import { supabase } from "@/integrations/supabase/client";

/** Reads settings.global_id_enabled. Missing row → enabled (default on). */
export async function isGlobalIdGenerationEnabled(): Promise<boolean> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "global_id_enabled")
    .maybeSingle();
  const value = data?.value as { enabled?: boolean } | null;
  if (value && typeof value === "object" && value.enabled === false) return false;
  return true;
}
