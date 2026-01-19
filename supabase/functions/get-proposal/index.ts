import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
        JSON.stringify({ error: "Missing external Supabase configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client for external Supabase with service role key to bypass RLS
    const externalSupabase = createClient(externalUrl, externalServiceKey);

    const url = new URL(req.url);
    const proposalIdFromQuery = url.searchParams.get("id");

    // Support POST body (supabase.functions.invoke) as well as GET query params
    let proposalId = proposalIdFromQuery;
    if (!proposalId) {
      try {
        const body = await req.json().catch(() => null);
        if (body?.id != null) proposalId = String(body.id);
      } catch {
        // ignore
      }
    }

    if (!proposalId) {
      console.log("Fetching all proposals");
      const { data, error } = await externalSupabase
        .from("PROPOSAL")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching proposals:", error);
        throw error;
      }

      return new Response(
        JSON.stringify({ proposals: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching proposal with id:", proposalId);
    const { data, error } = await externalSupabase
      .from("PROPOSAL")
      .select("*")
      .eq("id", parseInt(proposalId))
      .maybeSingle();

    if (error) {
      console.error("Error fetching proposal:", error);
      throw error;
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: "Proposal not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ proposal: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in get-proposal function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
