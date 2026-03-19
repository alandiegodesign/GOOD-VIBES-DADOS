import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Delete events that have been in trash for more than 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("events")
    .delete()
    .not("deleted_at", "is", null)
    .lt("deleted_at", sevenDaysAgo)
    .select("id");

  if (error) {
    console.error("Error purging events:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  console.log(`Purged ${data?.length || 0} events from trash`);
  return new Response(JSON.stringify({ purged: data?.length || 0 }), {
    headers: { "Content-Type": "application/json" },
  });
});
