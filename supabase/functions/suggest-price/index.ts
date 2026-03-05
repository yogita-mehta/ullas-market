import "https://esm.sh/@supabase/supabase-js@2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types & Helpers
// ---------------------------------------------------------------------------

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) {
        return json({ error: "Missing Supabase configuration" }, 500);
    }

    try {
        const body = await req.json();
        const productName: string = body.product_name?.trim();
        const category: string | undefined = body.category?.trim();

        if (!productName || productName.length < 2) {
            return json({ error: "product_name is required (min 2 chars)" }, 400);
        }

        const sb = createClient(url, serviceKey);

        // Build query: search by name similarity (ILIKE) and optionally filter by category
        let query = sb
            .from("products")
            .select("price")
            .eq("is_active", true)
            .gt("price", 0);

        // Search for similar products using ILIKE pattern matching
        const searchPattern = `%${productName.toLowerCase()}%`;
        query = query.ilike("name", searchPattern);

        if (category) {
            query = query.eq("category", category);
        }

        const { data: products, error } = await query.limit(50);

        if (error) {
            return json({ error: "Database query failed", details: error.message }, 500);
        }

        if (!products || products.length < 2) {
            // Not enough data to make a suggestion
            return json({
                min_price: 0,
                max_price: 0,
                avg_price: 0,
                sample_count: products?.length || 0,
            });
        }

        const prices = products.map((p) => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);

        return json({
            min_price: minPrice,
            max_price: maxPrice,
            avg_price: avgPrice,
            sample_count: prices.length,
        });
    } catch (err) {
        return json(
            { error: "Processing failed", details: (err as Error).message },
            500
        );
    }
});
