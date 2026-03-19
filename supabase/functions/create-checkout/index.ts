import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CartItem {
  ticket_location_id: string;
  quantity: number;
  unit_price: number;
  name: string;
  group_size: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabaseClient.auth.getUser(token);
    const user = authData.user;
    if (!user?.email) throw new Error("Usuário não autenticado");

    const { items, eventId, total } = await req.json() as {
      items: CartItem[];
      eventId: string;
      total: number;
    };

    if (!items?.length || !eventId) throw new Error("Dados inválidos");

    const { data: event } = await supabaseClient
      .from("events")
      .select("title")
      .eq("id", eventId)
      .single();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
      price_data: {
        currency: "brl",
        product_data: {
          name: `${item.name} — ${event?.title || "Evento"}`,
          description: item.group_size > 1
            ? `${item.group_size} ingressos por unidade`
            : undefined,
        },
        unit_amount: Math.round(item.unit_price * 100),
      },
      quantity: item.quantity,
    }));

    const origin = req.headers.get("origin") || "https://cozy-blossom-flow.lovable.app";

    const metadata: Record<string, string> = {
      event_id: eventId,
      user_id: user.id,
      items_json: JSON.stringify(items.map((i) => ({
        ticket_location_id: i.ticket_location_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }))),
    };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      payment_method_types: ["card"],
      invoice_creation: {
        enabled: true,
        invoice_data: {
          metadata,
          description: `Ingressos — ${event?.title || "Evento"}`,
        },
      },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/${eventId}`,
      metadata,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
