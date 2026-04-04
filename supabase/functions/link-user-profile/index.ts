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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user's JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authId = claimsData.claims.sub as string;
    const authEmail = claimsData.claims.email as string | undefined;
    const normalizedAuthEmail = authEmail?.trim().toLowerCase();

    const body = await req.json();
    const name = body.name || normalizedAuthEmail?.split("@")[0] || "User";
    const phone = body.phone || "";

    // Use service role to bypass RLS
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if a user with this auth_id already exists
    const { data: existingByAuth } = await adminClient
      .from("users")
      .select("*")
      .eq("auth_id", authId)
      .maybeSingle();

    if (existingByAuth) {
      return new Response(JSON.stringify({ user: existingByAuth }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if a guest record exists with same email (merge)
    if (normalizedAuthEmail) {
      const { data: existingByEmail } = await adminClient
        .from("users")
        .select("*")
        .ilike("email", normalizedAuthEmail)
        .is("auth_id", null)
        .maybeSingle();

      if (existingByEmail) {
        const { data: merged, error: mergeErr } = await adminClient
          .from("users")
          .update({ auth_id: authId, name: existingByEmail.name || name, email: normalizedAuthEmail })
          .eq("id", existingByEmail.id)
          .select()
          .single();

        if (mergeErr) {
          return new Response(JSON.stringify({ error: mergeErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ user: merged, merged: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // No existing record — create new
    const { data: newUser, error: insertErr } = await adminClient
      .from("users")
      .insert({
        auth_id: authId,
        name,
        phone: phone || `no-phone-${authId}`,
        email: normalizedAuthEmail || null,
      })
      .select()
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ user: newUser, created: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
