import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Check admin or desenvolvedor role
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const userRoles = (roles || []).map((r: any) => r.role);
    if (!userRoles.includes("admin") && !userRoles.includes("desenvolvedor")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all env vars, filter system ones
    const allEnv = Deno.env.toObject();
    const systemVars = [
      "PATH", "HOME", "DENO_DIR", "HOSTNAME", "PORT", "TMPDIR",
      "USER", "LANG", "TERM", "DENO_REGION", "DENO_DEPLOYMENT_ID",
    ];
    const secrets: Record<string, string> = {};
    for (const [key, value] of Object.entries(allEnv)) {
      if (systemVars.includes(key) || key.startsWith("XDG")) continue;
      if (["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"].includes(key)) continue;
      secrets[key] = value;
    }

    // Discover edge functions via probe
    const knownFunctionNames = [
      "create-checkout", "get-events", "get-stripe-key",
      "purge-deleted-events", "verify-payment", "admin-credentials",
    ];
    const probeResults = await Promise.allSettled(
      knownFunctionNames.map(async (name) => {
        const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
          method: "OPTIONS",
        });
        return { name, status: res.status };
      })
    );
    const edgeFunctions: string[] = [];
    for (const result of probeResults) {
      if (result.status === "fulfilled" && result.value.status < 500) {
        edgeFunctions.push(result.value.name);
      }
    }

    // Discover database tables via exec_sql
    let databaseTables: any[] = [];
    try {
      const { data: tablesData, error: tablesError } = await adminClient.rpc("exec_sql", {
        sql_query: `SELECT t.tablename as name, COALESCE(s.n_live_tup, 0)::int as row_count,
          (SELECT count(*)::int FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=t.tablename) as column_count,
          (SELECT string_agg(c.column_name,',') FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=t.tablename AND c.column_name LIKE '%encrypted%') as encrypted_columns,
          EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=t.tablename AND c.column_name='user_id') as has_user_id
        FROM pg_tables t LEFT JOIN pg_stat_user_tables s ON s.relname=t.tablename
        WHERE t.schemaname='public' ORDER BY t.tablename`,
      });
      if (!tablesError && tablesData) {
        databaseTables = tablesData;
      }
    } catch (e) {
      console.error("Error fetching tables:", e);
    }

    const response = {
      project_url: supabaseUrl,
      anon_key: supabaseAnonKey,
      service_role_key: supabaseServiceRoleKey,
      secrets,
      edge_functions: edgeFunctions,
      edge_functions_count: edgeFunctions.length,
      database_tables: databaseTables,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
