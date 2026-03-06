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
        const buyerLat: number | undefined = body.latitude;
        const buyerLon: number | undefined = body.longitude;

        const sb = createClient(url, serviceKey);

        console.log(`[smart-feed] Request: user=${userId || "anon"}, category=${categoryFilter || "All"}, limit=${limit}`);

        // 1. Compute user category scores from user_activity (if logged in)
        let topCategories: string[] = [];
        const categoryScores: Record<string, number> = {};

        if (userId) {
            // Get activity from last 30 days
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const { data: activities } = await sb
                .from("user_activity")
                .select("category, action_type")
                .eq("user_id", userId)
                .gte("created_at", thirtyDaysAgo);

            if (activities && activities.length > 0) {
                for (const a of activities) {
                    const weight =
                        a.action_type === "buy" ? 5 :
                            a.action_type === "add_to_cart" ? 3 : 1;
                    categoryScores[a.category] = (categoryScores[a.category] || 0) + weight;
                }

                // Get top 3 categories
                topCategories = Object.entries(categoryScores)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([cat]) => cat);

                console.log(`[smart-feed] User preferences: ${JSON.stringify(categoryScores)}, top3=${topCategories.join(", ")}`);
            } else {
                // Fall back to buyer_preferences if no activity yet
                const { data: prefs } = await sb
                    .from("buyer_preferences")
                    .select("category")
                    .eq("user_id", userId);

                if (prefs) {
                    topCategories = prefs.map((p) => p.category);
                }
                console.log(`[smart-feed] No activity yet, using preferences: ${topCategories.join(", ")}`);
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
            console.error(`[smart-feed] DB error: ${error.message}`);
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

        // 4. Fetch seller locations for proximity scoring
        const sellerIds = [...new Set(verifiedProducts.map((p) => p.seller_id))];
        let sellerLocationMap = new Map<string, { latitude: number | null; longitude: number | null }>();

        if (buyerLat && buyerLon && sellerIds.length > 0) {
            const { data: profiles } = await sb
                .from("profiles")
                .select("user_id, latitude, longitude")
                .in("user_id", sellerIds);

            if (profiles) {
                for (const p of profiles) {
                    sellerLocationMap.set(p.user_id, { latitude: p.latitude, longitude: p.longitude });
                }
            }
        }

        // Haversine distance helper
        function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) ** 2 +
                Math.cos(lat1 * Math.PI / 180) *
                Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        // 5. Compute ranking scores
        const maxViews = Math.max(1, ...verifiedProducts.map((p) => p.view_count || 0));
        const now = Date.now();
        const maxCatScore = Math.max(1, ...Object.values(categoryScores));

        const scored = verifiedProducts.map((product) => {
            // Category match score (0-1)
            const catScore = topCategories.includes(product.category)
                ? (categoryScores[product.category] || 0) / maxCatScore
                : 0;

            // Trending score (0-1)
            const trendingScore = (product.view_count || 0) / maxViews;

            // Recency score (0-1, decays over 90 days)
            const daysSinceCreated = (now - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24);
            const recencyScore = Math.max(0, 1 - daysSinceCreated / 90);

            // Rating score (0-1)
            const ratingScore = (product.rating || 0) / 5;

            // Proximity score (0-1)
            let proximityScore = 0;
            if (buyerLat && buyerLon) {
                const sellerLoc = sellerLocationMap.get(product.seller_id);
                if (sellerLoc?.latitude && sellerLoc?.longitude) {
                    const distKm = haversineKm(buyerLat, buyerLon, sellerLoc.latitude, sellerLoc.longitude);
                    proximityScore = Math.max(0, 1 - distKm / 50); // Decay over 50km
                }
            }

            // Weighted composite score
            const score =
                0.35 * catScore +
                0.25 * proximityScore +
                0.25 * trendingScore +
                0.10 * recencyScore +
                0.05 * ratingScore;

            return { ...product, _score: score };
        });

        // 6. Sort by score descending
        scored.sort((a, b) => b._score - a._score);

        // 7. Return top N (strip internal score)
        const result = scored.slice(0, limit).map(({ _score, ...product }) => product);

        console.log(`[smart-feed] Returning ${result.length} products (from ${verifiedProducts.length} verified)`);
        return json({ products: result, fallback: false });
    } catch (err) {
        console.error(`[smart-feed] Error: ${(err as Error).message}`);
        return json(
            { error: "Processing failed", details: (err as Error).message },
            500
        );
    }
});
