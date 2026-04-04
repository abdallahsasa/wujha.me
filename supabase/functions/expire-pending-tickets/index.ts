import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find pending tickets older than 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: expiredTickets, error: fetchErr } = await supabase
      .from("tickets")
      .select("id, ticket_type_id, guest_email, guest_name, event_id")
      .eq("payment_status", "pending")
      .lt("created_at", cutoff);

    // Fetch event titles for email context
    const eventIds = [...new Set((expiredTickets || []).map(t => t.event_id))];
    const eventTitleMap = new Map<string, string>();
    if (eventIds.length > 0) {
      const { data: events } = await supabase
        .from("events")
        .select("id, title_ar")
        .in("id", eventIds);
      for (const e of events || []) eventTitleMap.set(e.id, e.title_ar);
    }

    if (fetchErr) {
      console.error("Fetch error:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expiredTickets || expiredTickets.length === 0) {
      return new Response(JSON.stringify({ expired: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ticketIds = expiredTickets.map((t) => t.id);

    // Update tickets to expired
    const { error: updateErr } = await supabase
      .from("tickets")
      .update({ payment_status: "expired", status: "expired" })
      .in("id", ticketIds);

    if (updateErr) {
      console.error("Update error:", updateErr);
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decrement quantity_sold per ticket_type
    const typeCountMap = new Map<string, number>();
    for (const t of expiredTickets) {
      typeCountMap.set(t.ticket_type_id, (typeCountMap.get(t.ticket_type_id) || 0) + 1);
    }

    for (const [typeId, count] of typeCountMap) {
      const { data: ttData } = await supabase
        .from("ticket_types")
        .select("quantity_sold")
        .eq("id", typeId)
        .single();

      if (ttData) {
        const newSold = Math.max(0, (ttData.quantity_sold || 0) - count);
        await supabase
          .from("ticket_types")
          .update({ quantity_sold: newSold })
          .eq("id", typeId);
      }
    }

    // Send expiry notification emails (deduplicated by email+event)
    const notified = new Set<string>();
    // Group tickets by email+event for count
    const emailEventMap = new Map<string, { email: string; name: string; eventId: string; count: number }>();
    for (const t of expiredTickets) {
      if (!t.guest_email) continue;
      const key = `${t.guest_email}-${t.event_id}`;
      const existing = emailEventMap.get(key);
      if (existing) { existing.count++; }
      else { emailEventMap.set(key, { email: t.guest_email, name: t.guest_name, eventId: t.event_id, count: 1 }); }
    }

    for (const [key, info] of emailEventMap) {
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "payment-expired",
            recipientEmail: info.email,
            idempotencyKey: `payment-expired-${key}`,
            templateData: {
              guestName: info.name,
              eventTitle: eventTitleMap.get(info.eventId) || '',
              ticketCount: info.count,
            },
          },
        });
      } catch (e) {
        console.error("Email send error for", info.email, e);
      }
    }

    console.log(`Expired ${ticketIds.length} tickets across ${typeCountMap.size} types`);

    return new Response(
      JSON.stringify({ expired: ticketIds.length, types_updated: typeCountMap.size }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
