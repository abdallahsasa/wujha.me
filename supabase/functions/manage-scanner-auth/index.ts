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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller is admin via RPC
    const { data: isAdmin, error: rpcErr } = await adminClient.rpc("is_admin", { _auth_id: caller.id });
    if (rpcErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden - Administrator access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { scanner_id, password } = body;

    if (!scanner_id || !password || password.length < 6) {
      return new Response(JSON.stringify({ error: "Scanner ID and password (min 6 chars) are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch scanner details
    const { data: scanner, error: fetchErr } = await adminClient
      .from("admin_users")
      .select("id, email, name, auth_id")
      .eq("id", scanner_id)
      .single();

    if (fetchErr || !scanner) {
      return new Response(JSON.stringify({ error: "Scanner profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let authUser;

    // Check if user already exists by email
    const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers();
    if (listErr) throw listErr;
    const existingUser = users?.find(u => u.email === scanner.email);

    if (existingUser) {
      // Update existing user password
      const { data: updated, error: updateErr } = await adminClient.auth.admin.updateUserById(
        existingUser.id,
        { password, email_confirm: true }
      );
      if (updateErr) throw updateErr;
      authUser = updated.user;
    } else {
      // Create new auth user
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: scanner.email,
        password,
        email_confirm: true,
        user_metadata: { name: scanner.name, role: "scanner" },
      });
      if (createErr) throw createErr;
      authUser = created.user;
    }

    // Link auth_id back to admin_users profile
    const { error: linkErr } = await adminClient
      .from("admin_users")
      .update({ auth_id: authUser.id })
      .eq("id", scanner_id);

    if (linkErr) throw linkErr;

    return new Response(JSON.stringify({ 
      success: true, 
      message: existingUser ? "Password updated successfully" : "Scanner account created with password",
      auth_id: authUser.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error in manage-scanner-auth:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
