import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://nigpzhxdslqgooxcvabf.supabase.co";

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_pEIHEP-y2MH-frgRiXvGDg_9X4Ahh95";

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);