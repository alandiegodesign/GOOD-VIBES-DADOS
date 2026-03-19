import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabaseClient.auth.getUser(token);
    const user = authData.user;
    if (!user) throw new Error("Usuário não autenticado");

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID obrigatório");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ success: false, status: session.payment_status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata = session.metadata!;
    const eventId = metadata.event_id;
    const userId = metadata.user_id;

    if (userId !== user.id) throw new Error("Sessão não pertence ao usuário");

    // Check if order already created for this session
    const { data: existingOrder } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (existingOrder) {
      return new Response(JSON.stringify({ success: true, orderId: existingOrder.id, alreadyProcessed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items = JSON.parse(metadata.items_json) as {
      ticket_location_id: string;
      quantity: number;
      unit_price: number;
    }[];

    // Decrease availability
    for (const item of items) {
      const { data: decreased } = await supabaseAdmin.rpc("decrease_availability", {
        loc_id: item.ticket_location_id,
        qty: item.quantity,
      });
      if (!decreased) {
        return new Response(JSON.stringify({ success: false, error: "Ingressos esgotados" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const totalAmount = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        event_id: eventId,
        user_id: userId,
        total_amount: totalAmount,
        status: "confirmed",
        stripe_session_id: sessionId,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Fetch locations for group logic
    const locationIds = items.map((i) => i.ticket_location_id);
    const { data: locations } = await supabaseAdmin
      .from("ticket_locations")
      .select("id, location_type, group_size")
      .in("id", locationIds);

    const locationMap = new Map(
      (locations || []).map((l: any) => [l.id, { location_type: l.location_type, group_size: l.group_size || 1 }])
    );

    const orderItems: any[] = [];
    for (const item of items) {
      const loc = locationMap.get(item.ticket_location_id);
      const isGroup = loc && (loc.location_type === "camarote_grupo" || loc.location_type === "bistro") && loc.group_size > 1;

      if (isGroup) {
        for (let i = 0; i < loc.group_size * item.quantity; i++) {
          orderItems.push({
            order_id: order.id,
            ticket_location_id: item.ticket_location_id,
            quantity: 1,
            unit_price: i === 0 ? item.unit_price * item.quantity : 0,
            subtotal: i === 0 ? item.quantity * item.unit_price : 0,
            validation_code: "",
          });
        }
      } else {
        orderItems.push({
          order_id: order.id,
          ticket_location_id: item.ticket_location_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.quantity * item.unit_price,
          validation_code: "",
        });
      }
    }

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(orderItems);
    if (itemsError) throw itemsError;

    return new Response(JSON.stringify({ success: true, orderId: order.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
