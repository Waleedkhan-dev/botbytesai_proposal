import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: number;
    created_at: string;
    "PROPOSAL DATA": string | null;
    STATUS: string | null;
  };
  schema: string;
  old_record: null | Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const externalServiceKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");

    if (!externalUrl || !externalServiceKey) {
      console.error("Missing external Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Missing external Supabase credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: WebhookPayload = await req.json();
    console.log("Received webhook payload:", JSON.stringify(payload, null, 2));

    // Only process INSERT events for PROPOSAL table
    if (payload.type !== "INSERT" || payload.table !== "PROPOSAL") {
      console.log("Ignoring non-INSERT event or non-PROPOSAL table");
      return new Response(
        JSON.stringify({ message: "Ignored: not an INSERT on PROPOSAL" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newProposal = payload.record;
    console.log("New proposal created:", newProposal.id);

    // Generate the proposal link
    const appUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovableproject.com") 
      || "https://your-app-url.lovableproject.com";
    
    const proposalLink = `${appUrl}/proposal/${newProposal.id}`;
    console.log("Generated proposal link:", proposalLink);

    // Optionally update the external database with the generated link
    // (You could add a 'proposal_link' column to store this)
    
    return new Response(
      JSON.stringify({
        success: true,
        proposalId: newProposal.id,
        link: proposalLink,
        message: `Proposal #${newProposal.id} link generated successfully`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
