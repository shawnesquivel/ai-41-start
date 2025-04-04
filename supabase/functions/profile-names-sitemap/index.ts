import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

console.log("Profile Names Sitemap: Ready to serve requests");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    // Parse query parameters
    const url = new URL(req.url);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "60");
    const pageToken = url.searchParams.get("pageToken");

    // Limit page size to reasonable bounds
    const limitedPageSize = Math.min(Math.max(pageSize, 10), 1000);

    console.log(`[profile-names-sitemap] Request received:
    - Page size: ${limitedPageSize} (requested: ${pageSize})
    - Page token: ${pageToken || "None (first page)"}`);

    // Build query with pagination - now including the slug field
    let query = supabaseClient
      .from("therapists")
      .select("id, first_name, last_name, slug, updated_at")
      .order("id", { ascending: true })
      .limit(limitedPageSize);

    // Apply pagination using 'id' as the cursor
    if (pageToken) {
      query = query.gt("id", pageToken);
    }

    const { data: therapists, error } = await query;

    if (error) throw error;

    // Format therapist names and include slugs when available
    const therapistData = therapists.map((t) => {
      // Validate slug format (should be name-part-xxxxxx)
      const slug = t.slug;
      const hasValidSlug = slug && /^[a-z0-9-]+-[a-z0-9]{6}$/.test(slug);

      if (!hasValidSlug) {
        console.warn(
          `[profile-names-sitemap] Warning: Invalid slug format for therapist ${t.id}: "${
            slug || "null"
          }"`,
        );
      }

      return {
        name: `${t.first_name || ""} ${t.last_name || ""}`.trim(),
        slug: t.slug || null,
        id: t.id, // Always include the ID for reliable slug generation
      };
    });

    // Determine the next page token
    const nextPageToken = therapists.length === limitedPageSize
      ? therapists[therapists.length - 1].id
      : null;

    // Get last modified timestamp from the most recent update
    const lastModified = Math.floor(Date.now() / 1000).toString();

    console.log(
      `[profile-names-sitemap] Fetched ${therapistData.length} therapists
    - Next page token: ${nextPageToken || "None (last page)"}
    - Sample slugs: ${
        JSON.stringify(therapistData.slice(0, 3).map((t) => t.slug))
      }`,
    );

    // Return paginated response with both names and slugs
    return new Response(
      JSON.stringify({
        data: {
          therapists: therapistData,
          therapistNames: therapistData.map((t) => t.name), // For backward compatibility
          lastModified,
        },
        debug: {
          count: therapistData.length,
          timestamp: Math.floor(Date.now() / 1000).toString(),
          hasMore: nextPageToken !== null,
          nextPageToken: nextPageToken || undefined,
          pageSize: limitedPageSize,
          currentPage: pageToken || "first",
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("[profile-names-sitemap] Error:", error);

    return new Response(
      JSON.stringify({
        error: error.message,
        debug: {
          type: error.name,
          stack: error.stack,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/profile-names-sitemap?pageSize=10' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

  3. To test with pagination:

  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/profile-names-sitemap?pageSize=10&pageToken=YOUR_PAGE_TOKEN' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

*/
