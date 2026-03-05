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
        const userId: string | undefined = body.user_id;
        const categoryFilter: string | undefined = body.category;
        const limit: number = body.limit || 50;

        const sb = createClient(url, serviceKey);

        // 1. Fetch buyer preferences (if logged in)
        let preferredCategories: string[] = [];
        if (userId) {
            const { data: prefs } = await sb
                .from("buyer_preferences")
                .select("category")
                .eq("user_id", userId);

            if (prefs) {
                preferredCategories = prefs.map((p) => p.category);
            }
        }

        // 2. Fetch verified seller IDs
        const { data: verifiedProfiles } = await sb
            .from("seller_profiles")
            .select("user_id")
            .eq("fssai_verified", true);

        const verifiedIds = new Set((verifiedProfiles || []).map((p) => p.user_id));

        // 3. Fetch active products
        let query = sb
            .from("products")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(200);

        if (categoryFilter && categoryFilter !== "All") {
            query = query.eq("category", categoryFilter);
        }

        const { data: products, error } = await query;

        if (error) {
            return json({ error: "Failed to fetch products", details: error.message }, 500);
        }

        if (!products || products.length === 0) {
            return json({ products: [], fallback: false });
        }

        // Filter to verified sellers only
        const verifiedProducts = products.filter((p) => verifiedIds.has(p.seller_id));

        if (verifiedProducts.length === 0) {
            return json({ products: [], fallback: false });
        }

        // 4. Compute ranking scores
        const maxViews = Math.max(1, ...verifiedProducts.map((p) => p.view_count || 0));
        const now = Date.now();

        const scored = verifiedProducts.map((product) => {
            const categoryMatch = preferredCategories.includes(product.category) ? 1 : 0;
            const trendingScore = (product.view_count || 0) / maxViews;
            const daysSinceCreated = (now - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24);
            const recencyScore = Math.max(0, 1 - daysSinceCreated / 90); // Decay over 90 days
            const ratingScore = (product.rating || 0) / 5;

            const score =
                0.4 * categoryMatch +
                0.3 * trendingScore +
                0.2 * recencyScore +
                0.1 * ratingScore;

            return { ...product, _score: score };
        });

        // 5. Sort by score descending
        scored.sort((a, b) => b._score - a._score);

        // 6. Return top N
        const result = scored.slice(0, limit).map(({ _score, ...product }) => product);

        return json({ products: result, fallback: false });
    } catch (err) {
        return json(
            { error: "Processing failed", details: (err as Error).message },
            500
        );
    }
});
