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
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://wujha.me";

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

    // Check caller is admin
    const { data: isAdmin } = await adminClient.rpc("is_admin", { _auth_id: caller.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, name, organizer_id } = body;

    if (!email || !name || !organizer_id) {
      return new Response(JSON.stringify({ error: "email, name, and organizer_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if admin_users row already exists for this organizer
    const { data: existingAdmin } = await adminClient
      .from("admin_users")
      .select("id")
      .eq("organizer_id", organizer_id)
      .maybeSingle();

    if (existingAdmin) {
      return new Response(JSON.stringify({ error: "already_invited", message: "This organizer already has CMS access" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Helper: generate recovery link with redirect to reset-password page
    const generateRecoveryLink = async (userEmail: string) => {
      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: userEmail,
        options: {
          redirectTo: `${appBaseUrl}/admin/reset-password`,
        },
      });
      if (linkErr) {
        console.error("Failed to generate recovery link:", linkErr.message);
        return null;
      }
      return linkData?.properties?.action_link || null;
    };

    // Helper: send invitation email via send-transactional-email
    const sendInvitationEmail = async (recipientEmail: string, organizerName: string, resetLink: string) => {
      try {
        await adminClient.functions.invoke("send-transactional-email", {
          body: {
            templateName: "organizer-invitation",
            recipientEmail,
            idempotencyKey: `organizer-invite-${organizer_id}`,
            templateData: {
              organizerName,
              resetLink,
            },
          },
        });
        return true;
      } catch (err) {
        console.error("Failed to send invitation email:", err);
        return false;
      }
    };

    // Create auth user
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createErr) {
      // If user already exists, try to find them
      if (createErr.message?.includes("already been registered")) {
        const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers();
        if (listErr) {
          return new Response(JSON.stringify({ error: listErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const existingUser = users?.find(u => u.email === email);
        if (!existingUser) {
          return new Response(JSON.stringify({ error: "User exists but could not be found" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create admin_users row with existing auth user
        const { error: insertErr } = await adminClient.from("admin_users").insert({
          auth_id: existingUser.id,
          email,
          name,
          role: "organizer",
          organizer_id,
          is_active: true,
        });

        if (insertErr) {
          return new Response(JSON.stringify({ error: insertErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const recoveryLink = await generateRecoveryLink(email);
        if (recoveryLink) {
          await sendInvitationEmail(email, name, recoveryLink);
        }

        return new Response(JSON.stringify({
          success: true,
          email_sent: !!recoveryLink,
          recovery_link: recoveryLink,
          message: "Existing auth account linked. Invitation email sent.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: createErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin_users row
    const { error: insertErr } = await adminClient.from("admin_users").insert({
      auth_id: newUser.user.id,
      email,
      name,
      role: "organizer",
      organizer_id,
      is_active: true,
    });

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recoveryLink = await generateRecoveryLink(email);
    let emailSent = false;
    if (recoveryLink) {
      emailSent = await sendInvitationEmail(email, name, recoveryLink);
    }

    return new Response(JSON.stringify({
      success: true,
      email_sent: emailSent,
      recovery_link: recoveryLink,
      message: emailSent
        ? "Organizer invited. Invitation email sent with password setup link."
        : "Organizer invited. Could not send email — share the link manually.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
